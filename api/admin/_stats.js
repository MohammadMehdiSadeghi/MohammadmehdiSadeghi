import { requireAuth, storeBackend, storeDurable } from "../_lib.js";
import {
  readStore,
  dstr,
  daysAgo,
  pad,
} from "../_lib.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "method not allowed" });
  }
  if (requireAuth(req, res) === null) return;

  const visits = await readStore("visits.json", { days: {} });
  const days =
    visits.days && typeof visits.days === "object" ? visits.days : {};

  const dayTotals = {};
  const pathTotals = {};
  for (const [date, info] of Object.entries(days)) {
    const total = typeof info === "object" ? info.total || 0 : Number(info) || 0;
    dayTotals[date] = total;
    if (typeof info === "object" && info.paths && typeof info.paths === "object") {
      for (const [p, c] of Object.entries(info.paths)) {
        pathTotals[p] = (pathTotals[p] || 0) + c;
      }
    }
  }

  const today = new Date();
  today.setHours(0, 0, 0, 0);

  const range = (n, keyFn) => {
    const out = [];
    for (let i = n - 1; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = keyFn(d);
      out.push({ date: key, total: dayTotals[key] || 0 });
    }
    return out;
  };

  const last7 = range(7, dstr);
  const last30 = range(30, dstr);

  const monthTotals = {};
  for (const [date, total] of Object.entries(dayTotals)) {
    const m = date.slice(0, 7);
    monthTotals[m] = (monthTotals[m] || 0) + total;
  }
  const last12Months = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today.getFullYear(), today.getMonth() - i, 1);
    const key = `${d.getFullYear()}-${pad(d.getMonth() + 1)}`;
    last12Months.push({ month: key, total: monthTotals[key] || 0 });
  }

  const yearTotals = {};
  for (const [date, total] of Object.entries(dayTotals)) {
    const y = date.slice(0, 4);
    yearTotals[y] = (yearTotals[y] || 0) + total;
  }
  const yearly = Object.entries(yearTotals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, total]) => ({ year, total }));
  if (!yearly.length) yearly.push({ year: String(today.getFullYear()), total: 0 });

  const online = await readStore("online.json", {});
  const nowSec = Math.floor(Date.now() / 1000);
  let onlineNow = 0;
  for (const seen of Object.values(online)) {
    if (nowSec - Number(seen) <= 60) onlineNow++;
  }

  const totalAllTime = Object.values(dayTotals).reduce((s, v) => s + v, 0);
  const todayKey = dstr(today);
  const todayTotal = dayTotals[todayKey] || 0;
  const yestKey = dstr(daysAgo(1));
  const yesterdayTotal = dayTotals[yestKey] || 0;
  const last7Total = last7.reduce((s, d) => s + d.total, 0);
  const last30Total = last30.reduce((s, d) => s + d.total, 0);
  const thisMonthKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
  const thisMonthTotal = monthTotals[thisMonthKey] || 0;
  const thisYearTotal = yearTotals[String(today.getFullYear())] || 0;

  const topPaths = Object.entries(pathTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([path, total]) => ({ path, total }));

  /* clicks */
  const clicks = await readStore("clicks.json", { events: [], summary: {} });
  const clickEvents = Array.isArray(clicks.events) ? clicks.events : [];
  const clickSummary =
    clicks.summary && typeof clicks.summary === "object"
      ? Object.values(clicks.summary)
      : [];

  let totalClicks = 0,
    todayClicks = 0,
    weekClicks = 0;
  for (const e of clickSummary) {
    totalClicks += e.total || 0;
    todayClicks += e.today || 0;
    weekClicks += e.week || 0;
  }
  const topClickItems = [...clickSummary]
    .sort((a, b) => (b.total || 0) - (a.total || 0))
    .slice(0, 15);

  const typeMap = {};
  for (const e of clickSummary) {
    const t = e.targetType || "unknown";
    typeMap[t] = (typeMap[t] || 0) + (e.total || 0);
  }
  const clicksByType = Object.entries(typeMap)
    .map(([type, total]) => ({ type, total }))
    .sort((a, b) => b.total - a.total);

  const clickTrend = [];
  for (let i = 6; i >= 0; i--) {
    const dk = dstr(daysAgo(i));
    let dayTotal = 0;
    for (const e of clickSummary) dayTotal += (e.daily || {})[dk] || 0;
    clickTrend.push({ date: dk, total: dayTotal });
  }
  const recentClicks = clickEvents.slice(-25).reverse();

  /* button analytics */
  const BUTTON_TYPES = new Set(["button", "submit", "filter"]);
  const buttonPageFrom = (entry, targetId) => {
    if (targetId.startsWith("tab-")) return "/about";
    if (targetId.startsWith("filter-")) return "/project";
    if (targetId.startsWith("contact-")) return "/about";
    if (targetId.startsWith("music-")) return "/";
    if (targetId.startsWith("skill-")) return "/about";
    if (targetId.startsWith("404-")) return "/404";
    return entry.path || "/";
  };

  const buttonEvents = clickEvents.filter((e) =>
    BUTTON_TYPES.has(e.targetType || "")
  );
  const buttonSummary = [];
  let buttonTotalClicks = 0,
    buttonTodayClicks = 0,
    buttonWeekClicks = 0;
  const buttonClicksByPage = {};

  for (const e of clickSummary) {
    if (!BUTTON_TYPES.has(e.targetType || "")) continue;
    const page = buttonPageFrom(e, e.targetId || "");
    buttonSummary.push({
      buttonId: e.targetId,
      label: e.targetLabel || e.targetId,
      page,
      type: e.targetType,
      total: e.total || 0,
      today: e.today || 0,
      week: e.week || 0,
    });
    buttonTotalClicks += e.total || 0;
    buttonTodayClicks += e.today || 0;
    buttonWeekClicks += e.week || 0;
    buttonClicksByPage[page] = (buttonClicksByPage[page] || 0) + (e.total || 0);
  }
  buttonSummary.sort((a, b) => (b.total || 0) - (a.total || 0));
  const topButtons = buttonSummary.slice(0, 20);

  const clicksByPage = Object.entries(buttonClicksByPage)
    .map(([page, total]) => ({ page, total }))
    .sort((a, b) => b.total - a.total);

  const buttonTrend = [];
  for (let i = 6; i >= 0; i--) {
    const dk = dstr(daysAgo(i));
    let dayTotal = 0;
    for (const e of clickSummary) {
      if (!BUTTON_TYPES.has(e.targetType || "")) continue;
      dayTotal += (e.daily || {})[dk] || 0;
    }
    buttonTrend.push({ date: dk, total: dayTotal });
  }
  const buttonRecentClicks = buttonEvents
    .slice(-20)
    .reverse()
    .map((e) => ({
      time: e.time || "",
      buttonId: e.targetId || "",
      label: e.targetLabel || e.targetId || "",
      page: e.path || "/",
      sessionId: e.sessionId || "",
    }));

  /* deltas */
  const pctDelta = (cur, prev) =>
    prev <= 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100);
  const todayDelta = pctDelta(todayTotal, yesterdayTotal);
  let prev7Total = 0;
  for (let i = 13; i >= 7; i--) prev7Total += dayTotals[dstr(daysAgo(i))] || 0;
  const weekDelta = pctDelta(last7Total, prev7Total);
  const prevMonthD = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevMonthKey = `${prevMonthD.getFullYear()}-${pad(prevMonthD.getMonth() + 1)}`;
  const monthDelta = pctDelta(thisMonthTotal, monthTotals[prevMonthKey] || 0);
  const prevYearKey = String(today.getFullYear() - 1);
  const yearDelta = pctDelta(thisYearTotal, yearTotals[prevYearKey] || 0);

  res.json({
    /* "redis" means the numbers survive cold starts; "file" on Vercel means
       ephemeral /tmp and they will reset. Surfaced in the panel so this is
       never a silent surprise again. */
    storage: storeBackend(),
    durable: storeDurable(),
    onlineNow,
    today: todayTotal,
    yesterday: yesterdayTotal,
    todayDelta,
    weekDelta,
    monthDelta,
    yearDelta,
    last7Days: last7,
    last7Total,
    last30Days: last30,
    last30Total,
    thisMonth: thisMonthTotal,
    thisYear: thisYearTotal,
    monthly: last12Months,
    yearly,
    totalAllTime,
    topPaths,
    totalClicks,
    todayClicks,
    weekClicks,
    topClickItems,
    clicksByType,
    clickTrend,
    recentClicks,
    buttonAnalytics: {
      totalClicks: buttonTotalClicks,
      todayClicks: buttonTodayClicks,
      weekClicks: buttonWeekClicks,
      topButtons,
      clicksByPage,
      clickTrend: buttonTrend,
      recentClicks: buttonRecentClicks,
    },
  });
}
