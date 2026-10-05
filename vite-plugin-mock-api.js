import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync, statSync, rmSync } from "fs";
import { join } from "path";
import { createHmac, createHash } from "crypto";
import { executeMoodSearch } from "./src/lib/moodEngine.js";
import { resolveCountry, formatCountryStats } from "./api/_country.js";

const DATA_DIR = join(process.cwd(), "public", "api", "admin", "data");
const CONFIG_FILE = join(DATA_DIR, "config.json");
const VISITS_FILE = join(DATA_DIR, "visits.json");
const MESSAGES_FILE = join(DATA_DIR, "messages.json");
const ONLINE_FILE = join(DATA_DIR, "online.json");
const CLICKS_FILE = join(DATA_DIR, "clicks.json");
const JSON_DIR = join(process.cwd(), "public", "json");
const PUBLIC_JSON = {
  blog: join(JSON_DIR, "blog.json"),
  projects: join(JSON_DIR, "projects.json"),
  "mini-projects": join(JSON_DIR, "mini-projects.json"),
  skills: join(JSON_DIR, "skills.json"),
};
const F = {
  messages: MESSAGES_FILE,
  visits: VISITS_FILE,
  clicks: CLICKS_FILE,
  telegram: join(DATA_DIR, "telegram.json"),
};
const ADMIN_DATA = DATA_DIR;

// Mirrors the button-page attribution rules in PHP stats.php
function buttonPageFrom(targetId, eventPath) {
  if (typeof targetId === "string") {
    if (targetId.startsWith("tab-")) return "/about";
    if (targetId.startsWith("filter-")) return "/project";
    if (targetId.startsWith("contact-")) return "/about";
    if (targetId.startsWith("music-")) return "/";
    if (targetId.startsWith("skill-")) return "/about";
    if (targetId.startsWith("404-")) return "/404";
  }
  return eventPath || "/";
}

// Record a click into clicks.json with the same schema as PHP track-click.php
function trackClick(payload) {
  const targetType = String(payload.targetType || "").slice(0, 50);
  const targetId = String(payload.targetId || "").slice(0, 200);
  if (!targetType || !targetId) return;

  const clicks = readJSON(CLICKS_FILE, { events: [], summary: {} });
  if (!Array.isArray(clicks.events)) clicks.events = [];
  if (!clicks.summary || typeof clicks.summary !== "object") clicks.summary = {};

  const now = new Date();
  const today = now.toISOString().split("T")[0];
  const event = {
    time: now.toISOString(),
    targetType,
    targetId,
    targetLabel: String(payload.targetLabel || "").slice(0, 200),
    path: String(payload.path || "/").slice(0, 200),
    sessionId: String(payload.sessionId || "").slice(0, 100),
    referrer: String(payload.referrer || "").slice(0, 500),
  };
  clicks.events.push(event);
  if (clicks.events.length > 500) clicks.events = clicks.events.slice(-500);

  const summaryKey = `${targetType}::${targetId}`;
  if (!clicks.summary[summaryKey]) {
    clicks.summary[summaryKey] = {
      targetType,
      targetId,
      targetLabel: event.targetLabel,
      total: 0,
      today: 0,
      week: 0,
      lastSeen: "",
      firstSeen: event.time,
      daily: {},
    };
  }
  const entry = clicks.summary[summaryKey];
  entry.total += 1;
  entry.lastSeen = event.time;
  if (event.targetLabel) entry.targetLabel = event.targetLabel;
  if (!entry.daily || typeof entry.daily !== "object") entry.daily = {};
  entry.daily[today] = (entry.daily[today] || 0) + 1;

  let todayCount = 0;
  let weekCount = 0;
  for (let i = 0; i < 7; i++) {
    const d = new Date(now);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    const c = entry.daily[key] || 0;
    if (i === 0) todayCount = c;
    weekCount += c;
  }
  entry.today = todayCount;
  entry.week = weekCount;

  // Prune daily entries older than 30 days
  const cutoff = new Date(now.getTime() - 30 * 86400000).toISOString().split("T")[0];
  for (const dKey of Object.keys(entry.daily)) {
    if (dKey < cutoff) delete entry.daily[dKey];
  }

  writeJSON(CLICKS_FILE, clicks);
}

const DEFAULT_CONFIG = {
  username: "",
  password_sha256: "",
  secret: "",
};

function ensureDataDir() {
  if (!existsSync(DATA_DIR)) mkdirSync(DATA_DIR, { recursive: true });
}

function readJSON(path, fallback) {
  try {
    if (!existsSync(path)) return fallback;
    return JSON.parse(readFileSync(path, "utf-8"));
  } catch {
    return fallback;
  }
}

function writeJSON(path, data) {
  ensureDataDir();
  writeFileSync(path, JSON.stringify(data, null, 2));
}

function getConfig() {
  ensureDataDir();
  const config = readJSON(CONFIG_FILE, null);
  if (!config) {
    writeJSON(CONFIG_FILE, DEFAULT_CONFIG);
    return DEFAULT_CONFIG;
  }
  return config;
}

// Simple JWT-like token
function issueToken(username) {
  const payload = Buffer.from(
    JSON.stringify({ u: username, exp: Date.now() + 7 * 86400000 })
  ).toString("base64url");
  const sig = Buffer.from(
    createHmac("sha256", getConfig().secret).update(payload).digest()
  ).toString("base64url");
  return `${payload}.${sig}`;
}

function verifyToken(token) {
  if (!token || !token.includes(".")) return null;
  const [payload, sig] = token.split(".");
  const expected = Buffer.from(
    createHmac("sha256", getConfig().secret).update(payload).digest()
  ).toString("base64url");
  if (sig !== expected) return null;
  const data = JSON.parse(Buffer.from(payload, "base64url").toString());
  if (data.exp < Date.now()) return null;
  return data;
}

function getAuthToken(req) {
  const auth = req.headers.authorization || "";
  return auth.replace(/^Bearer\s+/i, "").trim() || null;
}

function requireAuth(req) {
  const token = getAuthToken(req);
  const payload = verifyToken(token);
  if (!payload) return null;
  return payload;
}

// Seed some demo data
function seedDemoData() {
  ensureDataDir();

  // Seed visits
  if (!existsSync(VISITS_FILE)) {
    const days = {};
    const today = new Date();
    for (let i = 30; i >= 0; i--) {
      const d = new Date(today);
      d.setDate(d.getDate() - i);
      const key = d.toISOString().split("T")[0];
      const base = Math.floor(Math.random() * 20) + 5;
      days[key] = {
        total: base,
        paths: {
          "/": Math.floor(base * 0.4),
          "/about": Math.floor(base * 0.2),
          "/project": Math.floor(base * 0.25),
          "/contact": Math.floor(base * 0.15),
        },
      };
    }
    writeJSON(VISITS_FILE, { days });
  }

  // Seed messages (same schema as PHP: { messages: [], nextId: N })
  if (!existsSync(MESSAGES_FILE)) {
    writeJSON(MESSAGES_FILE, {
      messages: [
        {
          id: "demo-1",
          name: "Ali Rezaei",
          phoneNumber: "09121234567",
          message: "Hi! I love your portfolio. The projects are really impressive.",
          status: "seen",
          date: new Date(Date.now() - 86400000).toISOString(),
        },
        {
          id: "demo-2",
          name: "Sara Mohammadi",
          phoneNumber: "09351112233",
          message: "Would you be available for a freelance project? I need a React developer.",
          status: "unseen",
          date: new Date(Date.now() - 3600000).toISOString(),
        },
        {
          id: "demo-3",
          name: "Mohammad Hosseini",
          phoneNumber: "",
          message: "Great work on the SabzLearn project! The UI is very clean.",
          status: "unseen",
          date: new Date().toISOString(),
        },
      ],
      nextId: 4,
    });
  }

  // Seed online
  if (!existsSync(ONLINE_FILE)) {
    writeJSON(ONLINE_FILE, {});
  }

  // Seed clicks
  if (!existsSync(CLICKS_FILE)) {
    writeJSON(CLICKS_FILE, { events: [], summary: {} });
  }
}

// Track a visit
function trackVisit(path, sessionId, req = {}, body = {}) {
  const visits = readJSON(VISITS_FILE, { days: {} });
  const today = new Date().toISOString().split("T")[0];
  const country = resolveCountry(req, body);
  if (!visits.days[today]) visits.days[today] = { total: 0, paths: {}, countries: {} };
  if (!visits.days[today].countries) visits.days[today].countries = {};
  visits.days[today].total++;
  visits.days[today].paths[path] = (visits.days[today].paths[path] || 0) + 1;
  if (country) {
    visits.days[today].countries[country] = (visits.days[today].countries[country] || 0) + 1;
  }
  writeJSON(VISITS_FILE, visits);

  // Update online
  const online = readJSON(ONLINE_FILE, {});
  online[sessionId] = { seen: Math.floor(Date.now() / 1000), country };
  writeJSON(ONLINE_FILE, online);
}

function computeStats(customFrom, customTo) {
  const visits = readJSON(VISITS_FILE, { days: {} });
  const days = visits.days || {};
  const online = readJSON(ONLINE_FILE, {});
  const now = Math.floor(Date.now() / 1000);

  // Online now
  let onlineNow = 0;
  const onlineCountriesMap = {};
  for (const [, val] of Object.entries(online)) {
    const seen = typeof val === "object" && val !== null ? val.seen : Number(val);
    if (now - Number(seen) <= 60) {
      onlineNow++;
      const c = typeof val === "object" && val !== null && val.country ? val.country : "UNKNOWN";
      onlineCountriesMap[c] = (onlineCountriesMap[c] || 0) + 1;
    }
  }

  // Day totals
  const dayTotals = {};
  const pathTotals = {};
  for (const [date, info] of Object.entries(days)) {
    const total = typeof info === "object" ? (info.total || 0) : Number(info);
    dayTotals[date] = total;
    if (info?.paths) {
      for (const [path, count] of Object.entries(info.paths)) {
        pathTotals[path] = (pathTotals[path] || 0) + count;
      }
    }
  }

  const today = new Date();
  const dstr = (d) => d.toISOString().split("T")[0];

  // Last 7 days
  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    last7.push({ date: dstr(d), total: dayTotals[dstr(d)] || 0 });
  }

  // Last 30 days
  const last30 = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    last30.push({ date: dstr(d), total: dayTotals[dstr(d)] || 0 });
  }

  // Last 90 days
  const last90 = [];
  for (let i = 89; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    last90.push({ date: dstr(d), total: dayTotals[dstr(d)] || 0 });
  }

  // Last 180 days
  const last180 = [];
  for (let i = 179; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    last180.push({ date: dstr(d), total: dayTotals[dstr(d)] || 0 });
  }

  // Hourly 24 hours
  const hourly24 = [];
  const pad = (n) => String(n).padStart(2, "0");
  for (let i = 23; i >= 0; i--) {
    const h = new Date(today.getTime() - i * 3600 * 1000);
    const dk = dstr(h);
    const hk = pad(h.getHours());
    const dayInfo = days[dk];
    const hv = dayInfo && dayInfo.hours && typeof dayInfo.hours === "object" ? dayInfo.hours[hk] || 0 : 0;
    hourly24.push({ hour: `${dk} ${hk}:00`, total: hv });
  }

  // Monthly
  const monthTotals = {};
  for (const [date, total] of Object.entries(dayTotals)) {
    const month = date.slice(0, 7);
    monthTotals[month] = (monthTotals[month] || 0) + total;
  }
  const last12 = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today);
    d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7);
    last12.push({ month: key, total: monthTotals[key] || 0 });
  }

  // Yearly
  const yearTotals = {};
  for (const [date, total] of Object.entries(dayTotals)) {
    const year = date.slice(0, 4);
    yearTotals[year] = (yearTotals[year] || 0) + total;
  }
  const yearly = Object.entries(yearTotals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, total]) => ({ year, total }));
  if (!yearly.length) yearly.push({ year: String(today.getFullYear()), total: 0 });

  // Top paths
  const topPaths = Object.entries(pathTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([path, total]) => ({ path, total }));

  // ── Click analytics (mirrors PHP stats.php) ──
  const clicks = readJSON(CLICKS_FILE, { events: [], summary: {} });
  const clickEvents = Array.isArray(clicks.events) ? clicks.events : [];
  const clickSummary = clicks.summary && typeof clicks.summary === "object" ? clicks.summary : {};
  const summaryEntries = Object.values(clickSummary);

  let totalClicks = 0;
  let todayClicks = 0;
  let weekClicks = 0;
  for (const entry of summaryEntries) {
    totalClicks += entry.total || 0;
    todayClicks += entry.today || 0;
    weekClicks += entry.week || 0;
  }

  const topClickItems = summaryEntries
    .slice()
    .sort((a, b) => (b.total || 0) - (a.total || 0))
    .slice(0, 15);

  const typeMap = {};
  for (const entry of summaryEntries) {
    const type = entry.targetType || "unknown";
    typeMap[type] = (typeMap[type] || 0) + (entry.total || 0);
  }
  const clicksByType = Object.entries(typeMap)
    .map(([type, total]) => ({ type, total }))
    .sort((a, b) => b.total - a.total);

  const clickTrend = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = dstr(d);
    let dayTotal = 0;
    for (const entry of summaryEntries) {
      dayTotal += (entry.daily && entry.daily[key]) || 0;
    }
    clickTrend.push({ date: key, total: dayTotal });
  }

  const recentClicks = clickEvents.slice(-25).reverse();

  // ── Button analytics (button / submit / filter types) ──
  const BUTTON_TYPES = ["button", "submit", "filter"];
  const buttonEvents = clickEvents.filter((e) => BUTTON_TYPES.includes(e.targetType));
  const buttonSummary = [];
  const buttonClicksByPage = {};
  let buttonTotalClicks = 0;
  let buttonTodayClicks = 0;
  let buttonWeekClicks = 0;

  for (const entry of summaryEntries) {
    if (!BUTTON_TYPES.includes(entry.targetType)) continue;
    const page = buttonPageFrom(entry.targetId, entry.path);
    const targetId = entry.targetId || "";
    buttonSummary.push({
      buttonId: targetId,
      label: entry.targetLabel || targetId,
      page,
      type: entry.targetType,
      total: entry.total || 0,
      today: entry.today || 0,
      week: entry.week || 0,
    });
    buttonTotalClicks += entry.total || 0;
    buttonTodayClicks += entry.today || 0;
    buttonWeekClicks += entry.week || 0;
    buttonClicksByPage[page] = (buttonClicksByPage[page] || 0) + (entry.total || 0);
  }

  buttonSummary.sort((a, b) => (b.total || 0) - (a.total || 0));
  const topButtons = buttonSummary.slice(0, 20);

  const clicksByPage = Object.entries(buttonClicksByPage)
    .map(([page, total]) => ({ page, total }))
    .sort((a, b) => b.total - a.total);

  const buttonTrend = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = dstr(d);
    let dayTotal = 0;
    for (const entry of summaryEntries) {
      if (!BUTTON_TYPES.includes(entry.targetType)) continue;
      dayTotal += (entry.daily && entry.daily[key]) || 0;
    }
    buttonTrend.push({ date: key, total: dayTotal });
  }

  const buttonRecentClicks = buttonEvents
    .slice(-20)
    .reverse()
    .map((e) => ({
      time: e.time,
      buttonId: e.targetId || "",
      label: e.targetLabel || e.targetId || "",
      page: e.path || "/",
      sessionId: e.sessionId || "",
    }));

  // ── Deltas (vs previous period) ──
  const pctDelta = (cur, prev) => {
    if (!prev || prev <= 0) return cur > 0 ? 100 : 0;
    return Math.round(((cur - prev) / prev) * 100);
  };
  const todayDelta = pctDelta(dayTotals[dstr(today)] || 0, dayTotals[dstr(new Date(today.getTime() - 86400000))] || 0);
  let prev7Total = 0;
  for (let i = 13; i >= 7; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    prev7Total += dayTotals[dstr(d)] || 0;
  }
  const last7Total = last7.reduce((s, d) => s + d.total, 0);
  const weekDelta = pctDelta(last7Total, prev7Total);
  const prevMonthKey = (() => {
    const d = new Date(today);
    d.setMonth(d.getMonth() - 1);
    return d.toISOString().slice(0, 7);
  })();
  const thisMonthTotal = monthTotals[dstr(today).slice(0, 7)] || 0;
  const monthDelta = pctDelta(thisMonthTotal, monthTotals[prevMonthKey] || 0);
  const thisYearTotal = yearTotals[String(today.getFullYear())] || 0;
  const yearDelta = pctDelta(thisYearTotal, yearTotals[String(today.getFullYear() - 1)] || 0);

  return {
    onlineNow,
    today: dayTotals[dstr(today)] || 0,
    yesterday: dayTotals[dstr(new Date(today.getTime() - 86400000))] || 0,
    todayDelta,
    weekDelta,
    monthDelta,
    yearDelta,
    last7Days: last7,
    last7Total,
    last30Days: last30,
    last30Total: last30.reduce((s, d) => s + d.total, 0),
    last90Days: last90,
    last180Days: last180,
    hourly24,
    custom: (() => {
      const qFrom = String(customFrom || "").slice(0, 10);
      const qTo = String(customTo || "").slice(0, 10);
      if (/^\d{4}-\d{2}-\d{2}$/.test(qFrom) && /^\d{4}-\d{2}-\d{2}$/.test(qTo) && qFrom <= qTo) {
        const out = [];
        const cur = new Date(qFrom + "T00:00:00");
        const end = new Date(qTo + "T00:00:00");
        let guard = 0;
        while (cur <= end && guard < 400) {
          const dk = dstr(cur);
          out.push({ date: dk, total: dayTotals[dk] || 0 });
          cur.setDate(cur.getDate() + 1);
          guard++;
        }
        return { from: qFrom, to: qTo, days: out, total: out.reduce((a, d) => a + d.total, 0) };
      }
      return null;
    })(),
    thisMonth: thisMonthTotal,
    thisYear: thisYearTotal,
    monthly: last12,
    yearly,
    totalAllTime: Object.values(dayTotals).reduce((s, v) => s + v, 0),
    topPaths,
    topCountries: (() => {
      const countryTotals = {};
      const totalAll = Object.values(dayTotals).reduce((s, v) => s + v, 0);
      for (const [, info] of Object.entries(days)) {
        if (typeof info === "object" && info.countries && typeof info.countries === "object") {
          for (const [c, count] of Object.entries(info.countries)) {
            countryTotals[c] = (countryTotals[c] || 0) + (Number(count) || 0);
          }
        }
      }
      return formatCountryStats(countryTotals, totalAll);
    })(),
    todayCountries: (() => {
      const countryTodayTotals = {};
      const todayKey = dstr(today);
      const todayInfo = days[todayKey];
      if (todayInfo && typeof todayInfo === "object" && todayInfo.countries) {
        for (const [c, count] of Object.entries(todayInfo.countries)) {
          countryTodayTotals[c] = (countryTodayTotals[c] || 0) + (Number(count) || 0);
        }
      }
      return formatCountryStats(countryTodayTotals, dayTotals[todayKey] || 0);
    })(),
    onlineCountries: formatCountryStats(onlineCountriesMap, onlineNow),
    totalCountriesCount: Object.keys(days).reduce((acc, d) => {
      const c = days[d]?.countries;
      if (c) Object.keys(c).forEach((k) => acc.add(k));
      return acc;
    }, new Set()).size,
    // Click analytics
    totalClicks,
    todayClicks,
    weekClicks,
    topClickItems,
    clicksByType,
    clickTrend,
    recentClicks,
    // Button analytics
    buttonAnalytics: {
      totalClicks: buttonTotalClicks,
      todayClicks: buttonTodayClicks,
      weekClicks: buttonWeekClicks,
      topButtons,
      clicksByPage,
      clickTrend: buttonTrend,
      recentClicks: buttonRecentClicks,
    },
  };
}

// ── Mock API handler ──
// Maps the demo projects' PHP endpoints (Ubisoft / Digikala backend/api.php)
// to their JSON data files, so they work in dev without a PHP server.
const PROJECT_API_FILES = {
  "Ubisoft::first": { file: "top-slider-games-data.json" },
  "Ubisoft::second": { file: "top slider games data img second.json" },
  "Digikala::best-products": { file: "best products.json" },
  "Digikala::offer-products": { file: "offer-products.json" },
  "Digikala::market-products-on-offer": { file: "market-products-on-offer.json" },
  "Digikala::part-products-1-4": { file: "part-products-1-4.json" },
  "Digikala::part-products-5-8": { file: "part-products-5-8.json" },
  "Digikala::offer-all-products": { file: "offer-all-products.json" },
  "Digikala::laptop-category": { file: "laptop-category.json" },
};

export function mockApiHandler(req, res, next) {
  const url = new URL(req.url, "http://localhost");
  const path = url.pathname;

  // ── Sub-project directory URLs (e.g. /Projects/.../Sabz-Learn/) ──
  // Vite's SPA fallback would serve the portfolio's index.html for these;
  // internally rewrite them to the project's own index.html instead.
  if (/^\/Projects\/[^?#]+$/.test(path) && !/\.[a-z0-9]+$/i.test(path)) {
    const candidate = path.replace(/\/+$/, "") + "/index.html";
    if (existsSync(join(process.cwd(), "public", candidate))) {
      req.url = candidate + (url.search || "");
    }
  }

  // ── Sub-project PHP APIs (Ubisoft / Digikala backend/api.php) ──
  // In dev there is no PHP engine, so serve the same JSON the PHP file would.
  const apiMatch = path.match(/^\/Projects\/Web-Project\/([^/]+)\/backend\/api\.php$/);
  if (apiMatch && req.method === "GET") {
    const project = apiMatch[1];
    const type = url.searchParams.get("type") || "";
    const mapping = PROJECT_API_FILES[`${project}::${type}`];
    if (mapping) {
      const file = join(process.cwd(), "public", "Projects", "Web-Project", project, "backend", mapping.file);
      try {
        const raw = readFileSync(file, "utf8");
        const data = JSON.parse(raw);
        // Mirror api.php: strip a leading "/" from image paths so they stay
        // relative when the projects are hosted under a sub-path.
        const stripLeadingSlash = (node) => {
          if (Array.isArray(node)) {
            for (const item of node) stripLeadingSlash(item);
          } else if (node && typeof node === "object") {
            for (const [key, value] of Object.entries(node)) {
              if ((key === "image" || key === "img") && typeof value === "string" && value.startsWith("/")) {
                node[key] = value.slice(1);
              } else if (value && typeof value === "object") {
                stripLeadingSlash(value);
              }
            }
          }
        };
        stripLeadingSlash(data);
        res.writeHead(200, { "Content-Type": "application/json; charset=utf-8" });
        res.end(JSON.stringify(data));
        return;
      } catch {
        res.writeHead(500, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "error reading JSON data" }));
        return;
      }
    }
    res.writeHead(404, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "داده‌ای پیدا نشد", valid_types: Object.keys(PROJECT_API_FILES).filter((k) => k.startsWith(project + "::")).map((k) => k.split("::")[1]) }));
    return;
  }

  // Only intercept /api/* requests
  if (!path.startsWith("/api/")) return next();

  seedDemoData();

  const isAdmin = path.startsWith("/api/admin/");
  const apiPath = isAdmin ? path.replace("/api/admin/", "") : path.replace("/api/", "");
  const endpoint = apiPath.replace(/\.php$/, "").split("?")[0];

  // ── Auth ──
  if (endpoint === "auth" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const { username, password } = JSON.parse(body);
        const config = getConfig();
        const hash = createHash("sha256").update(password || "").digest("hex");
        if (username === config.username && hash === config.password_sha256) {
          const token = issueToken(username);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ token, username, expires_in: 604800 }));
        } else {
          res.writeHead(401, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "invalid username or password" }));
        }
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "invalid request body" }));
      }
    });
    return;
  }

  if (endpoint === "auth-check" && req.method === "GET") {
    const user = requireAuth(req);
    if (user) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true, username: user.u }));
    } else {
      res.writeHead(401, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "unauthorized" }));
    }
    return;
  }

  // ── Public endpoints (no auth required) ──

  // Track visits (heartbeats refresh "online" but don't count as a visit)
  if (endpoint === "track" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const { path: trackPath, sessionId, heartbeat } = JSON.parse(body);
        const sid = sessionId || "unknown";
        if (heartbeat) {
          // only mark online, don't increment visit counters
          const online = readJSON(ONLINE_FILE, {});
          online[sid] = Math.floor(Date.now() / 1000);
          writeJSON(ONLINE_FILE, online);
        } else {
          trackVisit(trackPath || "/", sid);
        }
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      } catch {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true }));
      }
    });
    return;
  }

  // Track clicks (public, no auth required — mirrors PHP track-click.php)
  if (endpoint === "track-click" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        trackClick(JSON.parse(body));
      } catch {
        // ignore malformed payloads
      }
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ ok: true }));
    });
    return;
  }

  // Skills public
  if (endpoint === "skills" && !isAdmin && req.method === "GET") {
    const skillsFile = join(process.cwd(), "public", "api", "skills.json");
    const data = readJSON(skillsFile, []);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ skills: data }));
    return;
  }

  // ── Mood Search (for /api/mood-search?q=...) ──
  if (endpoint === "mood-search" && !isAdmin && req.method === "GET") {
    const query = String(url.searchParams.get("q") || "").trim();
    if (!query) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Query is required" }));
      return;
    }
    if (query.length < 2) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Query is too short (min 2 chars)" }));
      return;
    }
    if (query.length > 500) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Query is too long (max 500 chars)" }));
      return;
    }

    const dbFile = join(process.cwd(), "public", "api", "music-database.json");
    const db = readJSON(dbFile, { songs: [] });
    const allSongs = Array.isArray(db.songs) ? db.songs : [];

    const musicDir = join(process.cwd(), "public", "assets", "Music");
    const diskFiles = existsSync(musicDir) ? new Set(readdirSync(musicDir)) : new Set();
    const existingSongs = allSongs.filter((s) => {
      const fn = String(s.src || "").split("/").pop();
      return diskFiles.has(fn);
    });
    const songs = existingSongs.length ? existingSongs : allSongs;

    const result = executeMoodSearch(songs, query);

    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    res.end(JSON.stringify(result));
    return;
  }


  // Music search (dev mirror of PHP search.php)
  if (endpoint === "search" && !isAdmin && req.method === "GET") {
    const query = (url.searchParams.get("q") || "").trim();
    if (!query) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Query is required" }));
      return;
    }
    if (query.length > 75) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Query is too long" }));
      return;
    }

    // ── shared search engine (must stay in sync with public/api/search.php) ──
    const norm = (s) =>
      String(s || "")
        .toLowerCase()
        .trim()
        .replace(/ي/g, "ی")
        .replace(/ك/g, "ک")
        .replace(/[أإآٱ]/g, "ا")
        .replace(/[ةۀە]/g, "ه")
        .replace(/ؤ/g, "و")
        .replace(/[ئ]/g, "ی")
        .replace(/[\u064B-\u0652\u0640\u200C]/g, "")
        .replace(/[^\p{L}\p{N}\s]+/gu, " ")
        .replace(/\s+/g, " ")
        .trim();

    const STOPWORDS = [
      "من", "تو", "او", "ما", "شما", "آنها", "این", "آن", "که", "با", "به",
      "از", "در", "را", "رو", "برای", "و", "یا", "ولی", "اما", "اگر", "بعد",
      "پس", "بود", "است", "هست", "میخوام", "میکنم", "دارم", "یه", "یک", "فقط",
      "the", "a", "an", "to", "of", "for", "and", "or", "in", "on", "with",
      "is", "are", "be", "was", "i", "you", "me", "my", "we", "it",
    ];
    const tokenise = (s) =>
      norm(s)
        .split(/\s+/)
        .filter((t) => t && t.length >= 2 && !STOPWORDS.includes(t));

    const TRANSLIT = {
      shad: "شاد", happy: "شاد", khosh: "خوش", jashn: "جشن", party: "جشن",
      ghamgin: "غمگین", sad: "غمگین", gham: "غم", ashk: "اشک",
      ashegh: "عاشق", eshgh: "عشق", ghalb: "قلب", love: "عشق",
      aram: "آرام", calm: "آرام", sokut: "سکوت", peace: "آرامش",
      roya: "رویا", dream: "رویا", khial: "خیال",
      shab: "شب", night: "شب", mah: "مهتاب", moon: "مهتاب", setare: "ستاره", star: "ستاره",
      baran: "باران", rain: "باران", bahar: "بهار", tabestan: "تابستان", zemestan: "زمستان",
      music: "موسیقی", song: "آهنگ", moosighi: "موسیقی",
      wedding: "عروسی", aroosi: "عروسی",
      khane: "خانه", safar: "سفر", safari: "سفر", travel: "سفر",
      mader: "مادر", pedar: "پدر", doost: "دوست", friend: "دوست",
      zendegi: "زندگی", life: "زندگی", khaterat: "خاطره", memory: "خاطره",
      energy: "انرژی", power: "قدرت", darya: "دریا", sea: "دریا",
    };
    const expandTokens = (tokens) => {
      const out = [...tokens];
      for (const t of tokens) {
        const extra = TRANSLIT[t];
        if (extra && !out.includes(extra)) out.push(extra);
      }
      return out;
    };

    const containsSim = (hay, needle) => {
      if (hay === needle) return 1.0;
      if (hay.includes(needle)) return 0.8;
      if (needle.length >= 3 && hay.length >= 2 && needle.includes(hay)) return 0.6;
      return 0.0;
    };
    const lev = (a, b) => {
      if (a === b) return 0;
      const m = a.length, n = b.length;
      if (!m) return n;
      if (!n) return m;
      let prev = new Array(n + 1).fill(0).map((_, j) => j);
      for (let i = 1; i <= m; i++) {
        const cur = [i];
        for (let j = 1; j <= n; j++) {
          cur[j] = Math.min(
            prev[j] + 1,
            cur[j - 1] + 1,
            prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1),
          );
        }
        prev = cur;
      }
      return prev[n];
    };
    const levSim = (a, b) => {
      const len = Math.max(a.length, b.length);
      return len === 0 ? 1.0 : (len - lev(a, b)) / len;
    };
    const bestTagHit = (token, tagList) => {
      let best = 0.0, idx = -1;
      for (let i = 0; i < tagList.length; i++) {
        const tag = tagList[i];
        if (tag === token) { best = 1.0; idx = i; continue; }
        if (tag.includes(token) && token.length >= 2) { if (best < 0.8) { best = 0.8; idx = i; } continue; }
        if (token.includes(tag) && tag.length >= 2) { if (best < 0.7) { best = 0.7; idx = i; } continue; }
        if (tag.length <= 10 && token.length <= 10) {
          const sim = levSim(token, tag);
          if (sim >= 0.8 && best < 0.9 * sim) { best = 0.9 * sim; idx = i; }
          else if (sim > 0.6 && tag.length <= 8 && best < 0.5 * sim) { best = 0.5 * sim; idx = i; }
        }
      }
      return [best, idx];
    };

    const dbFile = join(process.cwd(), "public", "api", "music-database.json");
    const db = readJSON(dbFile, { songs: [] });
    const songs = Array.isArray(db.songs) ? db.songs : [];

    const qNorm = norm(query);
    const baseTokens = tokenise(qNorm); // words the user actually typed
    const qTokens = expandTokens(baseTokens); // + transliterated Persian equivalents
    const nTokens = Math.max(baseTokens.length, 1); // transliterations don't dilute the score

    const scored = songs.map((song) => {
      const nameNorm = norm(song.name || "");
      const artistNorm = norm(song.artist || "");
      let score = 0;
      const matched = [];

      if (nameNorm === qNorm) score += 10;
      if (qNorm.length >= 2) score += containsSim(nameNorm, qNorm) * 5;
      if (artistNorm === qNorm) score += 6;
      else if (qNorm.length >= 2) score += containsSim(artistNorm, qNorm) * 3;

      const nameArtistTokens = tokenise(`${nameNorm} ${artistNorm}`);
      if (nameArtistTokens.length) {
        let overlaps = 0;
        for (const qt of qTokens) {
          if (nameArtistTokens.some((nt) => nt === qt || (nt.includes(qt) && qt.length >= 2) || (qt.includes(nt) && nt.length >= 2))) overlaps++;
        }
        score += Math.min(overlaps / nTokens, 1) * 4;
      }

      const faTags = (song.tags || []).map(norm);
      const enTags = (song.tagsEn || []).map(norm);
      let tagScore = 0;
      for (const qt of qTokens) {
        const [faBest, faIdx] = bestTagHit(qt, faTags);
        const [enBest, enIdx] = bestTagHit(qt, enTags);
        if (faBest >= enBest) {
          tagScore += faBest;
          if (faBest >= 0.7 && faIdx >= 0 && !matched.includes(String(song.tags[faIdx] || ""))) matched.push(String(song.tags[faIdx] || ""));
        } else {
          tagScore += enBest;
          if (enBest >= 0.7 && enIdx >= 0 && !matched.includes(String(song.tags[enIdx] || song.tagsEn[enIdx] || ""))) matched.push(String(song.tags[enIdx] || song.tagsEn[enIdx] || ""));
        }
      }
      score += Math.min(tagScore / nTokens, 1) * 2;

      return { id: song.id, score, matched };
    }).sort((a, b) => b.score - a.score);

    const best = scored[0];
    if (best && best.score >= 1.5) {
      const song = songs.find((s) => s.id === best.id);
      if (song) {
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({
          found: true,
          score: Math.round(best.score * 100) / 100,
          song: {
            id: song.id,
            name: song.name,
            artist: song.artist,
            src: song.src,
            tags: (song.tags || []).slice(0, 8),
            tagsEn: (song.tagsEn || []).slice(0, 4),
            matched: best.matched.slice(0, 8),
          },
        }));
        return;
      }
    }
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ found: false }));
    return;
  }

  // Music song by id (dev mirror of PHP song.php)
  if (endpoint === "song" && !isAdmin && req.method === "GET") {
    const id = Number(url.searchParams.get("id") || 0);
    const dbFile = join(process.cwd(), "public", "api", "music-database.json");
    const db = readJSON(dbFile, { songs: [] });
    const songs = Array.isArray(db.songs) ? db.songs : [];
    const song = songs.find((s) => Number(s.id) === id);
    if (song) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ id: song.id, name: song.name, artist: song.artist, src: song.src }));
    } else {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Song not found" }));
    }
    return;
  }

  // Contact form message (POST without auth)
  if (endpoint === "messages" && req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const data = JSON.parse(body);
        const store = readJSON(MESSAGES_FILE, { messages: [], nextId: 1 });
        if (!Array.isArray(store.messages)) store.messages = [];
        const newMsg = {
          id: store.nextId || 1,
          name: data.name || "Anonymous",
          phoneNumber: data.phoneNumber || "",
          message: data.message || "",
          status: "unseen",
          date: new Date().toISOString(),
        };
        store.messages.unshift(newMsg);
        store.nextId = (store.nextId || 1) + 1;
        writeJSON(MESSAGES_FILE, store);
        res.writeHead(200, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ ok: true, id: newMsg.id }));
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "invalid request body" }));
      }
    });
    return;
  }

  // ── Blog (posts + covers) — same shape as api/_blog.js ──
  if (endpoint === "blog" && !isAdmin && req.method === "GET") {
    const blogFile = join(process.cwd(), "public", "api", "blog.json");
    const all = readJSON(blogFile, []);
    const posts = (Array.isArray(all) ? all : [])
      .filter((p) => p && p.published !== false)
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
    const slug = url.searchParams.get("slug");
    res.writeHead(200, { "Content-Type": "application/json", "Cache-Control": "no-store" });
    if (slug) {
      const post = posts.find((p) => p.slug === slug);
      if (!post) {
        res.writeHead(404, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ found: false, error: "post not found" }));
        return;
      }
      res.end(JSON.stringify({ found: true, post }));
      return;
    }
    res.end(
      JSON.stringify({
        found: true,
        total: posts.length,
        posts: posts.map((p) => ({
          id: p.id,
          slug: p.slug,
          title: p.title,
          excerpt: p.excerpt || "",
          cover: p.cover || "",
          coverAlt: p.coverAlt || "",
          tags: p.tags || [],
          date: p.date || "",
        })),
      })
    );
    return;
  }

  /* NOTE: this PUBLIC handler must stay ABOVE the `if (!isAdmin) return
     next()` barrier below. It used to sit under it, so on `npm run dev`
     every /api/blog request fell through to the SPA fallback and the blog
     received index.html (HTTP 200) instead of JSON — the whole blog looked
     broken with no error anywhere. Public handlers go up here; the barrier
     only separates the admin half. */
  // ── For non-admin paths, pass through to static file server ──
  if (!isAdmin) return next();

  // ── Admin endpoints (require auth) ──
  const user = requireAuth(req);
  if (!user) {
    res.writeHead(401, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ error: "unauthorized" }));
    return;
  }

  // ── Stats ──
  if (endpoint === "stats" && req.method === "GET") {
    const stats = computeStats(url.searchParams.get("from"), url.searchParams.get("to"));
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify(stats));
    return;
  }

  // ── Messages (admin GET) ──
  if (endpoint === "messages") {
    const store = readJSON(MESSAGES_FILE, { messages: [], nextId: 1 });
    const messages = Array.isArray(store.messages) ? store.messages : [];

    if (req.method === "GET") {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ messages }));
      return;
    }

    if (req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        try {
          const data = JSON.parse(body);
          const newMsg = {
            id: store.nextId || 1,
            name: data.name || "Anonymous",
            phoneNumber: data.phoneNumber || "",
            message: data.message || "",
            status: "unseen",
            date: new Date().toISOString(),
          };
          messages.unshift(newMsg);
          store.nextId = (store.nextId || 1) + 1;
          writeJSON(MESSAGES_FILE, store);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, id: newMsg.id }));
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "invalid request body" }));
        }
      });
      return;
    }

    if (req.method === "PATCH") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        try {
          const { id, status } = JSON.parse(body);
          const idx = messages.findIndex((m) => String(m.id) === String(id));
          if (idx >= 0) {
            messages[idx].status = status;
            writeJSON(MESSAGES_FILE, store);
          }
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "invalid request body" }));
        }
      });
      return;
    }

    if (req.method === "DELETE") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        try {
          const { id } = JSON.parse(body);
          store.messages = messages.filter((m) => String(m.id) !== String(id));
          writeJSON(MESSAGES_FILE, store);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "invalid request body" }));
        }
      });
      return;
    }
  }

  // ── Projects Admin ──
  if (endpoint === "projects-admin") {
    const projectsFile = join(process.cwd(), "public", "api", "projects.json");
    const miniFile = join(process.cwd(), "public", "api", "mini-projects.json");

    if (req.method === "GET") {
      const type = url.searchParams.get("type") || "web";
      const file = type === "mini" ? miniFile : projectsFile;
      const data = readJSON(file, []);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ projects: data }));
      return;
    }

    if (req.method === "POST" || req.method === "PUT") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        try {
          const payload = JSON.parse(body);
          const type = payload.type || "web";
          const file = type === "mini" ? miniFile : projectsFile;
          let data = readJSON(file, []);

          if (req.method === "PUT" && Array.isArray(payload.projects)) {
            data = payload.projects;
          } else if (req.method === "POST") {
            const nextId = () => data.reduce((m, p) => Math.max(m, p.id || 0), 0) + 1;
            const newProject = {
              id: nextId(),
              url: payload.url || "",
              title: payload.title || "Untitled",
              description: payload.description || "",
              category: payload.category || [],
              image: payload.image || "",
              githubUrl: payload.githubUrl || null,
            };
            data.push(newProject);
          } else {
            const idx = data.findIndex((p) => String(p.id) === String(payload.id));
            if (idx >= 0) Object.assign(data[idx], payload);
          }

          writeJSON(file, data);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, projects: data }));
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "invalid request body" }));
        }
      });
      return;
    }

    if (req.method === "DELETE") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        try {
          const { type, id } = JSON.parse(body);
          const file = type === "mini" ? miniFile : projectsFile;
          const data = readJSON(file, []);
          writeJSON(
            file,
            data.filter((p) => String(p.id) !== String(id))
          );
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "invalid request body" }));
        }
      });
      return;
    }
  }

  // ── Skills Admin ──
  if (endpoint === "skills-admin") {
    const skillsFile = join(process.cwd(), "public", "api", "skills.json");

    if (req.method === "GET") {
      const data = readJSON(skillsFile, []);
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ skills: data }));
      return;
    }

    if (req.method === "POST" || req.method === "PUT") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        try {
          const payload = JSON.parse(body);
          let data = readJSON(skillsFile, []);

          if (req.method === "PUT" && Array.isArray(payload.skills)) {
            data = payload.skills;
          } else if (req.method === "POST") {
            const nextId = () => data.reduce((m, s) => Math.max(m, s.id || 0), 0) + 1;
            data.push({
              id: nextId(),
              name: payload.name || "Untitled",
              img: payload.img || "",
            });
          } else {
            const idx = data.findIndex((s) => String(s.id) === String(payload.id));
            if (idx >= 0) Object.assign(data[idx], payload);
          }

          writeJSON(skillsFile, data);
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true, skills: data }));
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "invalid request body" }));
        }
      });
      return;
    }

    if (req.method === "DELETE") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        try {
          const { id } = JSON.parse(body);
          const data = readJSON(skillsFile, []);
          writeJSON(
            skillsFile,
            data.filter((s) => s.id !== id)
          );
          res.writeHead(200, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ ok: true }));
        } catch {
          res.writeHead(400, { "Content-Type": "application/json" });
          res.end(JSON.stringify({ error: "invalid request body" }));
        }
      });
      return;
    }
  }

  /* (a second public "skills" handler lived here, under the !isAdmin barrier
      above — unreachable dead code, since the one above the barrier already
      answers it. Removed so there is exactly one public skills handler.) */

  // ── Blog Admin — parity with api/admin/_blog-admin.js ──
  if (endpoint === "blog-admin") {
    const blogFile = join(process.cwd(), "public", "api", "blog.json");
    const posts = readJSON(blogFile, []);

    const slugify = (s) =>
      String(s || "")
        .trim()
        .toLowerCase()
        .replace(/[^\p{L}\p{N}]+/gu, "-")
        .replace(/^-+|-+$/g, "")
        .slice(0, 70) || `post-${Date.now()}`;
    const uniqueSlug = (wanted, ignoreId = null) => {
      let slug = slugify(wanted);
      let n = 2;
      while (posts.some((p) => p.slug === slug && String(p.id) !== String(ignoreId))) {
        slug = `${slugify(wanted)}-${n++}`;
      }
      return slug;
    };
    const asTags = (v) =>
      (Array.isArray(v) ? v : String(v || "").split(","))
        .map((t) => String(t).trim())
        .filter(Boolean)
        .slice(0, 8);

    if (req.method === "GET") {
      const sorted = [...posts].sort((a, b) =>
        String(b.date || "").localeCompare(String(a.date || "")),
      );
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ posts: sorted }));
      return;
    }

    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      try {
        const payload = JSON.parse(body || "{}");
        const json = (code, obj) => {
          res.writeHead(code, { "Content-Type": "application/json" });
          res.end(JSON.stringify(obj));
        };

        if (req.method === "POST" && url.searchParams.get("publish") != null) {
          const p = posts.find((x) => String(x.id) === String(payload.id));
          if (!p) return json(404, { error: "post not found" });
          p.published = url.searchParams.get("publish") === "1";
          writeJSON(blogFile, posts);
          return json(200, { ok: true, post: p });
        }

        if (req.method === "POST") {
          const title = String(payload.title || "").trim();
          if (!title) return json(400, { error: "title is required" });
          const entry = {
            id: posts.reduce((m, p) => Math.max(m, Number(p.id) || 0), 0) + 1,
            slug: uniqueSlug(payload.slug || title, null),
            title,
            excerpt: String(payload.excerpt || "").trim(),
            content: String(payload.content || "").trim(),
            cover: String(payload.cover || "").trim(),
            coverAlt: String(payload.coverAlt || "").trim(),
            tags: asTags(payload.tags),
            date: String(payload.date || "").trim() || new Date().toISOString().slice(0, 10),
            published: payload.published !== false,
          };
          posts.push(entry);
          writeJSON(blogFile, posts);
          return json(200, { ok: true, post: entry });
        }

        if (req.method === "PUT") {
          const p = posts.find((x) => String(x.id) === String(payload.id));
          if (!p) return json(404, { error: "post not found" });
          const map = {
            title: "title", excerpt: "excerpt", content: "content", cover: "cover",
            coverAlt: "coverAlt", date: "date",
          };
          for (const [k, field] of Object.entries(map)) {
            if (payload[k] != null) p[field] = String(payload[k]).trim();
          }
          if (payload.slug != null && String(payload.slug).trim() && payload.slug !== p.slug) {
            p.slug = uniqueSlug(payload.slug, p.id);
          }
          if (payload.tags != null) p.tags = asTags(payload.tags);
          if (payload.published != null) p.published = !!payload.published;
          writeJSON(blogFile, posts);
          return json(200, { ok: true, post: p });
        }

        if (req.method === "DELETE") {
          const filtered = posts.filter((x) => String(x.id) !== String(payload.id));
          if (filtered.length === posts.length) return json(404, { error: "post not found" });
          writeJSON(blogFile, filtered);
          return json(200, { ok: true });
        }

        json(405, { error: "method not allowed" });
      } catch {
        res.writeHead(400, { "Content-Type": "application/json" });
        res.end(JSON.stringify({ error: "invalid request body" }));
      }
    });
    return;
  }

  // ── File manager (parity with server.js /api/admin/fs*) ──
  // The dev server used to fall through to the SPA here, so the Database tab
  // received index.html and reported a broken database. Browse the project
  // root exactly like the Node backend does.
  if (endpoint === "fs" || endpoint === "fs-size" || endpoint === "fs-delete" || endpoint === "fs-collections") {
    const json = (code, obj) => {
      res.writeHead(code, { "Content-Type": "application/json" });
      res.end(JSON.stringify(obj));
    };

    if (endpoint === "fs-collections" || url.searchParams.get("action") === "collections") {
      const readOr = (file, fallback) => {
        try {
          if (!existsSync(file)) return fallback;
          const raw = readFileSync(file, "utf8");
          return raw ? JSON.parse(raw) : fallback;
        } catch { return fallback; }
      };
      const blog = readOr(PUBLIC_JSON.blog, { posts: [] });
      const projects = readOr(PUBLIC_JSON.projects, []);
      const mini = readOr(PUBLIC_JSON["mini-projects"], []);
      const skills = readOr(PUBLIC_JSON.skills, []);
      const messages = readOr(F.messages, []);
      const visits = readOr(F.visits, {});
      const clicks = readOr(F.clicks, []);
      const moods = readOr(join(ADMIN_DATA, "moods.json"), {});
      const telegram = readOr(F.telegram, {});
      const sabzUsers = readOr(join(ADMIN_DATA, "sabz-users.json"), []);
      const sabzComments = readOr(join(ADMIN_DATA, "sabz-comments.json"), []);

      const blogPosts = Array.isArray(blog?.posts) ? blog.posts : Array.isArray(blog) ? blog : [];
      const projArr = Array.isArray(projects) ? projects : [];
      const miniArr = Array.isArray(mini) ? mini : [];
      const skillsArr = Array.isArray(skills) ? skills : [];
      const msgArr = Array.isArray(messages) ? messages : [];
      const clicksArr = Array.isArray(clicks) ? clicks : [];
      const sUsersArr = Array.isArray(sabzUsers) ? sabzUsers : [];
      const sCommArr = Array.isArray(sabzComments) ? sabzComments : [];

      const collections = [
        { id: "blog", name: "Blog Articles & Posts", filename: "blog.json", count: blogPosts.length, unit: "posts", description: "Articles, drafts, tags, covers and reading metrics", data: blog, size: JSON.stringify(blog || {}).length },
        { id: "projects", name: "Main Web Projects", filename: "projects.json", count: projArr.length, unit: "projects", description: "Portfolio showcase projects, tech tags & links", data: projects, size: JSON.stringify(projects || []).length },
        { id: "mini-projects", name: "Mini Projects & Tools", filename: "mini-projects.json", count: miniArr.length, unit: "projects", description: "Mini apps, games, UI demos and widgets", data: mini, size: JSON.stringify(mini || []).length },
        { id: "messages", name: "Contact Messages", filename: "messages.json", count: msgArr.length, unit: "messages", description: "Inquiries submitted via contact form", data: messages, size: JSON.stringify(messages || []).length },
        { id: "skills", name: "Skills & Badges", filename: "skills.json", count: skillsArr.length, unit: "skills", description: "Developer skills, icons and proficiency", data: skills, size: JSON.stringify(skills || []).length },
        { id: "visits", name: "Traffic & Page Views", filename: "visits.json", count: Object.keys(visits || {}).length, unit: "days", description: "Daily unique visitor sessions and page hits", data: visits, size: JSON.stringify(visits || {}).length },
        { id: "clicks", name: "Click Tracking Logs", filename: "clicks.json", count: clicksArr.length, unit: "events", description: "Button clicks, navigation logs and CTA interactions", data: clicks, size: JSON.stringify(clicks || []).length },
        { id: "moods", name: "Visitor Moods / Reactions", filename: "moods.json", count: Object.keys(moods || {}).length, unit: "ratings", description: "Mood reaction scores and visitor feedback", data: moods, size: JSON.stringify(moods || {}).length },
        { id: "telegram", name: "Telegram Bot Config", filename: "telegram.json", count: telegram?.token ? 1 : 0, unit: "config", description: "Bot credentials and notification channel status", data: telegram, size: JSON.stringify(telegram || {}).length },
        { id: "sabz-users", name: "Sabz-Learn Demo Users", filename: "sabz-users.json", count: sUsersArr.length, unit: "accounts", description: "Demo user registrations (temporary)", data: sabzUsers, size: JSON.stringify(sabzUsers || []).length },
        { id: "sabz-comments", name: "Sabz-Learn Demo Reviews", filename: "sabz-comments.json", count: sCommArr.length, unit: "reviews", description: "Demo student reviews and comments (temporary)", data: sabzComments, size: JSON.stringify(sabzComments || []).length },
      ];
      return json(200, { collections });
    }

    const rootAbs = process.cwd();
    const resolveInRoot = (rel) => {
      const clean = String(rel || "").replace(/\\/g, "/").replace(/^\/+/, "");
      const abs = join(rootAbs, clean);
      if (abs !== rootAbs && !abs.startsWith(rootAbs + "/") && !abs.startsWith(rootAbs + "\\")) return null;
      return { abs, rel: clean };
    };
    const qs = url.searchParams;
    const requested = qs.get("path") || "";

    if (endpoint === "fs-delete" && req.method === "POST") {
      let body = "";
      req.on("data", (c) => (body += c));
      req.on("end", () => {
        let payload = {};
        try { payload = JSON.parse(body); } catch { /* empty */ }
        const r = resolveInRoot(payload.path);
        if (!r) return json(400, { error: "path escapes project root" });
        if (!r.rel) return json(400, { error: "refusing to delete the project root itself" });
        if (r.rel === ".git" || r.rel.startsWith(".git/")) {
          return json(400, { error: "refusing to delete .git (repo history)" });
        }
        if (!existsSync(r.abs)) return json(404, { error: "not found" });
        const wasDir = statSync(r.abs).isDirectory();
        rmSync(r.abs, { recursive: true, force: true });
        json(200, { ok: true, deleted: r.rel, wasDir });
      });
      return;
    }

    const r = resolveInRoot(requested);
    if (!r) return json(400, { error: "path escapes project root" });

    if (endpoint === "fs-size") {
      let total = 0, files = 0, capped = false;
      const walk = (dir, depth) => {
        if (capped || depth > 14) return;
        let entries;
        try { entries = readdirSync(dir, { withFileTypes: true }); } catch { return; }
        for (const d of entries) {
          if (capped) return;
          const full = join(dir, d.name);
          if (d.isDirectory()) {
            if (d.name === "node_modules" || d.name === ".git") continue;
            walk(full, depth + 1);
          } else {
            try { total += statSync(full).size; files++; } catch { /* gone */ }
          }
          if (files > 50000) { capped = true; return; }
        }
      };
      try {
        if (statSync(r.abs).isDirectory()) walk(r.abs, 0);
        else { total = statSync(r.abs).size; files = 1; }
      } catch {
        return json(404, { error: "not found" });
      }
      return json(200, { size: total, files, path: r.rel, capped });
    }

    // plain listing
    if (!existsSync(r.abs)) return json(404, { error: "not found" });
    const st = statSync(r.abs);
    if (!st.isDirectory()) return json(400, { error: "not a directory" });
    const items = [];
    for (const d of readdirSync(r.abs, { withFileTypes: true })) {
      let s = null;
      try { s = statSync(join(r.abs, d.name)); } catch { /* ignore */ }
      items.push({
        name: d.name,
        type: d.isDirectory() ? "dir" : "file",
        size: s ? s.size : 0,
        mtime: s ? Math.round(s.mtimeMs) : 0,
      });
    }
    items.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
    return json(200, { path: r.rel, root: "project-root", items });
  }

  // ── Reset the throwaway demo data (parity with api/admin/_reset.js) ──
  if (endpoint === "reset" && req.method === "POST") {
    const json = (code, obj) => {
      res.writeHead(code, { "Content-Type": "application/json" });
      res.end(JSON.stringify(obj));
    };
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      let target = "sabz";
      try { target = String(JSON.parse(body || "{}").target || "sabz").toLowerCase(); } catch { /* default */ }
      const cleared = [];
      const wipe = (file, label) => {
        if (existsSync(file)) { rmSync(file, { force: true }); cleared.push(label); }
      };
      if (target === "sabz" || target === "all") {
        for (const f of readdirSync(DATA_DIR).filter((n) => n.startsWith("sabz"))) {
          wipe(join(DATA_DIR, f), f);
        }
      }
      if (target === "visits" || target === "all") {
        wipe(VISITS_FILE, "visits.json");
        wipe(ONLINE_FILE, "online.json");
        wipe(CLICKS_FILE, "clicks.json");
      }
      json(200, { ok: true, target, cleared });
    });
    return;
  }

  // ── Telegram form → bot config (parity with api/admin/_telegram.js) ──
  if (endpoint === "telegram") {
    const json = (code, obj) => {
      res.writeHead(code, { "Content-Type": "application/json" });
      res.end(JSON.stringify(obj));
    };
    const FILE_TG = join(DATA_DIR, "telegram.json");
    if (req.method === "GET") {
      const cfg = readJSON(FILE_TG, { enabled: false, botToken: "", chatId: "" });
      return json(200, {
        enabled: !!cfg.enabled,
        chatId: cfg.chatId || "",
        botTokenSet: !!cfg.botToken,
        botTokenMasked: cfg.botToken
          ? cfg.botToken.slice(0, 6) + "\u2026" + cfg.botToken.slice(-4)
          : "",
      });
    }
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      let payload = {};
      try { payload = JSON.parse(body || "{}"); } catch { /* default */ }
      const botToken = String(payload.botToken ?? "").trim();
      const chatId = String(payload.chatId ?? "").trim();
      const enabled = !!payload.enabled;
      if (enabled && !chatId) return json(400, { error: "chatId is required to enable" });
      if (botToken && !/^\d{6,}:[A-Za-z0-9_-]{30,}$/.test(botToken)) {
        return json(400, { error: "botToken doesn't look valid (expected 123456:ABC\u2026)" });
      }
      const prev = readJSON(FILE_TG, { enabled: false, botToken: "", chatId: "" });
      const next = { enabled, botToken: botToken || prev.botToken, chatId: chatId || prev.chatId };
      if (enabled && !next.botToken) return json(400, { error: "botToken is required to enable" });
      writeJSON(FILE_TG, next);
      json(200, { ok: true });
    });
    return;
  }

  // ── Mood QC (parity with api/admin/_moods.js) ──
  // Same shape as the serverless handler: one row per song with its mood
  // vector, so the tab renders instead of receiving index.html.
  if (endpoint === "moods") {
    const json = (code, obj) => {
      res.writeHead(code, { "Content-Type": "application/json" });
      res.end(JSON.stringify(obj));
    };
    const MOOD_DIMS = [
      "sadness", "longing", "nostalgia", "heartbreak", "loneliness",
      "joy", "playfulness", "romance", "sensuality", "warmth",
      "anger", "rebellion", "power", "defiance",
      "calm", "dreaminess", "melancholy", "hope",
      "darkness", "tension", "mystery",
      "energy", "euphoria", "reflection",
    ];
    const dbFile = join(process.cwd(), "public", "api", "music-database.json");
    const db = readJSON(dbFile, { songs: [] });
    const songs = Array.isArray(db.songs) ? db.songs : [];
    const OVERLAY = join(DATA_DIR, "music-db-overlay.json");

    if (req.method === "GET") {
      const overlay = readJSON(OVERLAY, {});
      const rows = songs.map((song) => {
        const patch = overlay[String(song.id)] || {};
        return {
          id: song.id,
          name: song.name,
          artist: song.artist,
          lyricsStatus: song.lyricsStatus || (song.lyrics ? "present" : "none"),
          summary: patch.summary ?? song.lyricsSummary ?? "",
          audioMoodTag: patch.audioMoodTag ?? song.audioMoodTag ?? "",
          moods: patch.moods ?? song.moods ?? {},
          hasAudio: !!(song.analysis && song.analysis.vibe),
        };
      });
      return json(200, { songs: rows, dims: MOOD_DIMS, ephemeral: true });
    }

    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      let payload = {};
      try { payload = JSON.parse(body || "{}"); } catch { /* default */ }
      if (payload.id == null) return json(400, { error: "id is required" });
      if (!songs.some((x) => String(x.id) === String(payload.id))) {
        return json(404, { error: "song not found" });
      }
      const overlay = readJSON(OVERLAY, {});
      const entry = overlay[String(payload.id)] ? { ...overlay[String(payload.id)] } : {};
      if (payload.moods && typeof payload.moods === "object") entry.moods = payload.moods;
      if (payload.summary != null) entry.summary = String(payload.summary);
      if (payload.audioMoodTag != null) entry.audioMoodTag = String(payload.audioMoodTag);
      overlay[String(payload.id)] = entry;
      writeJSON(OVERLAY, overlay);
      json(200, { ok: true, ephemeral: true });
    });
    return;
  }

  // ── Change password (parity with api/admin/_password.js) ──
  if (endpoint === "password" && req.method === "POST") {
    const json = (code, obj) => {
      res.writeHead(code, { "Content-Type": "application/json" });
      res.end(JSON.stringify(obj));
    };
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      let payload = {};
      try { payload = JSON.parse(body || "{}"); } catch { /* default */ }
      const currentPassword = String(payload.currentPassword ?? "");
      const newPassword = String(payload.newPassword ?? "");
      if (!currentPassword || !newPassword) {
        return json(400, { error: "currentPassword and newPassword are required" });
      }
      if (newPassword.length < 6) {
        return json(400, { error: "new password must be at least 6 characters" });
      }
      const config = getConfig();
      if (createHash("sha256").update(currentPassword).digest("hex") !== config.password_sha256) {
        return json(401, { error: "current password is incorrect" });
      }
      const hashed = createHash("sha256").update(newPassword).digest("hex");
      writeJSON(CONFIG_FILE, { ...config, password_sha256: hashed });
      json(200, { ok: true, username: config.username, token: issueToken(config.username) });
    });
    return;
  }

  // Fallback
  next();
}
