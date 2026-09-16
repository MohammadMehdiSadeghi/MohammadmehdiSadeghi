import { readFileSync, writeFileSync, existsSync, mkdirSync, readdirSync } from "fs";
import { join } from "path";
import { createHmac, createHash } from "crypto";

const DATA_DIR = join(process.cwd(), "public", "api", "admin", "data");
const CONFIG_FILE = join(DATA_DIR, "config.json");
const VISITS_FILE = join(DATA_DIR, "visits.json");
const MESSAGES_FILE = join(DATA_DIR, "messages.json");
const ONLINE_FILE = join(DATA_DIR, "online.json");
const CLICKS_FILE = join(DATA_DIR, "clicks.json");

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
function trackVisit(path, sessionId) {
  const visits = readJSON(VISITS_FILE, { days: {} });
  const today = new Date().toISOString().split("T")[0];
  if (!visits.days[today]) visits.days[today] = { total: 0, paths: {} };
  visits.days[today].total++;
  visits.days[today].paths[path] = (visits.days[today].paths[path] || 0) + 1;
  writeJSON(VISITS_FILE, visits);

  // Update online
  const online = readJSON(ONLINE_FILE, {});
  online[sessionId] = Math.floor(Date.now() / 1000);
  writeJSON(ONLINE_FILE, online);
}

function computeStats(customFrom, customTo) {
  const visits = readJSON(VISITS_FILE, { days: {} });
  const days = visits.days || {};
  const online = readJSON(ONLINE_FILE, {});
  const now = Math.floor(Date.now() / 1000);

  // Online now
  let onlineNow = 0;
  for (const [, ts] of Object.entries(online)) {
    if (now - Number(ts) <= 60) onlineNow++;
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
    if (query.length < 3) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Query is too short (min 3 chars)" }));
      return;
    }
    if (query.length > 400) {
      res.writeHead(200, { "Content-Type": "application/json" });
      res.end(JSON.stringify({ error: "Query is too long (max 400 chars)" }));
      return;
    }

    const EN_MOOD_LEX = {
      // Sadness / Grief / Pain
      sad: { sadness: 0.95 }, sadness: { sadness: 0.95 }, unhappy: { sadness: 0.8 },
      sorrow: { sadness: 0.9 }, grief: { sadness: 0.95 }, pain: { sadness: 0.8, heartbreak: 0.5 },
      hurting: { sadness: 0.8, heartbreak: 0.6 }, hurt: { sadness: 0.75, heartbreak: 0.5 },
      tears: { sadness: 0.85 }, crying: { sadness: 0.9 }, cry: { sadness: 0.85 },
      depressed: { sadness: 0.9, melancholy: 0.7 }, depression: { sadness: 0.9, melancholy: 0.7 },
      down: { sadness: 0.6, melancholy: 0.5 }, gloomy: { melancholy: 0.85, sadness: 0.5 },

      // Longing / Missing / Distance
      longing: { longing: 0.95 }, miss: { longing: 0.9 }, missing: { longing: 0.9 },
      yearn: { longing: 0.85 }, yearning: { longing: 0.9 }, wish: { longing: 0.6, hope: 0.4 },
      distance: { longing: 0.7 },

      // Nostalgia / Memories / Retro
      nostalgia: { nostalgia: 0.95 }, nostalgic: { nostalgia: 0.95 }, memory: { nostalgia: 0.85 },
      memories: { nostalgia: 0.9 }, reminisce: { nostalgia: 0.85 }, past: { nostalgia: 0.8 },
      retro: { nostalgia: 0.8 }, vintage: { nostalgia: 0.75 }, childhood: { nostalgia: 0.85 },

      // Heartbreak / Breakup
      heartbreak: { heartbreak: 0.95, sadness: 0.7 }, heartbroken: { heartbreak: 0.95, sadness: 0.7 },
      breakup: { heartbreak: 0.95, sadness: 0.6 }, divorce: { heartbreak: 0.85, sadness: 0.7 },
      broken: { heartbreak: 0.8, sadness: 0.6 }, rejected: { heartbreak: 0.8, loneliness: 0.7 },
      betrayal: { heartbreak: 0.8, anger: 0.7 }, cheated: { heartbreak: 0.85, anger: 0.75 },
      ex: { heartbreak: 0.7, longing: 0.6 },

      // Loneliness / Solitude
      lonely: { loneliness: 0.95, sadness: 0.6 }, loneliness: { loneliness: 0.95, sadness: 0.6 },
      alone: { loneliness: 0.9 }, solitude: { loneliness: 0.7, calm: 0.5 },
      isolated: { loneliness: 0.85 }, empty: { loneliness: 0.8, sadness: 0.7 },

      // Joy / Happiness
      happy: { joy: 0.95 }, happiness: { joy: 0.95 }, joy: { joy: 0.95 }, joyful: { joy: 0.9 },
      cheerful: { joy: 0.85 }, glad: { joy: 0.75 }, smile: { joy: 0.7, warmth: 0.5 },
      delight: { joy: 0.85 }, sunshine: { joy: 0.8, warmth: 0.7 }, celebrate: { joy: 0.8, euphoria: 0.7 },

      // Playfulness / Fun
      playful: { playfulness: 0.9 }, fun: { playfulness: 0.8, joy: 0.6 }, silly: { playfulness: 0.8 },
      quirky: { playfulness: 0.75 }, cheeky: { playfulness: 0.75 },

      // Romance / Love
      love: { romance: 0.9 }, romance: { romance: 0.95 }, romantic: { romance: 0.95 },
      lover: { romance: 0.85 }, loving: { romance: 0.8, warmth: 0.6 }, crush: { romance: 0.8, longing: 0.5 },
      kiss: { romance: 0.85, sensuality: 0.6 }, kissing: { romance: 0.85, sensuality: 0.6 },
      sweetheart: { romance: 0.8, warmth: 0.6 },

      // Sensuality
      sensual: { sensuality: 0.9 }, sexy: { sensuality: 0.85 }, intimate: { sensuality: 0.8, romance: 0.6 },
      passion: { sensuality: 0.8, energy: 0.5 }, desire: { sensuality: 0.85 }, seductive: { sensuality: 0.85 },

      // Warmth / Comfort
      warm: { warmth: 0.9, calm: 0.5 }, warmth: { warmth: 0.9 }, cozy: { warmth: 0.85, calm: 0.7 },
      comfort: { warmth: 0.8, calm: 0.6 }, tender: { warmth: 0.8, romance: 0.6 }, gentle: { warmth: 0.75, calm: 0.75 },

      // Anger / Rage / Hate
      anger: { anger: 0.95 }, angry: { anger: 0.95 }, rage: { anger: 0.95, energy: 0.7 },
      furious: { anger: 0.9 }, mad: { anger: 0.8 }, hate: { anger: 0.85 },
      frustrated: { anger: 0.7, tension: 0.6 }, annoyed: { anger: 0.6 },

      // Rebellion / Fight
      rebel: { rebellion: 0.9 }, rebellion: { rebellion: 0.95 }, fight: { rebellion: 0.8, power: 0.7 },
      protest: { rebellion: 0.85 }, riot: { rebellion: 0.9, energy: 0.8 },

      // Power / Strength / Epic
      power: { power: 0.95 }, powerful: { power: 0.95 }, strong: { power: 0.85 },
      strength: { power: 0.85 }, epic: { power: 0.9, tension: 0.5 }, triumph: { power: 0.85, joy: 0.6 },
      victory: { power: 0.9, joy: 0.7 }, unstoppable: { power: 0.9, energy: 0.8 },

      // Defiance
      defiant: { defiance: 0.9 }, defiance: { defiance: 0.95 }, fearless: { defiance: 0.85, power: 0.7 },
      brave: { defiance: 0.8, power: 0.6 }, bold: { defiance: 0.8, energy: 0.6 },

      // Calm / Peace / Sleep / Relax
      calm: { calm: 0.95 }, peace: { calm: 0.9 }, peaceful: { calm: 0.95 }, quiet: { calm: 0.8 },
      relax: { calm: 0.9 }, relaxing: { calm: 0.95 }, relaxed: { calm: 0.9 }, chill: { calm: 0.85 },
      chilling: { calm: 0.85 }, sleep: { calm: 0.9 }, sleepy: { calm: 0.85 }, soothing: { calm: 0.9, warmth: 0.5 },
      serene: { calm: 0.9 },

      // Dreaminess
      dream: { dreaminess: 0.9 }, dreamy: { dreaminess: 0.95 }, dreaming: { dreaminess: 0.9 },
      ethereal: { dreaminess: 0.9 }, floating: { dreaminess: 0.85, calm: 0.5 }, stars: { dreaminess: 0.7 },
      night: { dreaminess: 0.6, calm: 0.4 },

      // Melancholy / Gloom / Rain
      melancholy: { melancholy: 0.95 }, melancholic: { melancholy: 0.95 }, somber: { melancholy: 0.85 },
      wistful: { melancholy: 0.8, nostalgia: 0.6 }, rain: { melancholy: 0.7, calm: 0.5 }, rainy: { melancholy: 0.7, calm: 0.5 },

      // Hope / Optimism
      hope: { hope: 0.95 }, hopeful: { hope: 0.95 }, optimism: { hope: 0.85, joy: 0.5 },
      bright: { hope: 0.7, joy: 0.6 }, light: { hope: 0.7, warmth: 0.5 }, believe: { hope: 0.75, power: 0.5 },

      // Darkness / Tension / Mystery
      dark: { darkness: 0.9 }, darkness: { darkness: 0.95 }, shadow: { darkness: 0.8 },
      tension: { tension: 0.9 }, tense: { tension: 0.9 }, dramatic: { tension: 0.85, power: 0.5 },
      anxious: { tension: 0.8, darkness: 0.5 }, anxiety: { tension: 0.8, darkness: 0.5 },
      stress: { tension: 0.75 }, stressed: { tension: 0.75 }, nervous: { tension: 0.7 },
      mystery: { mystery: 0.95 }, mysterious: { mystery: 0.95 }, secret: { mystery: 0.8 },

      // Energy / Workout / Hype
      energy: { energy: 0.95 }, energetic: { energy: 0.95 }, hype: { energy: 0.9, euphoria: 0.7 },
      hyped: { energy: 0.9, euphoria: 0.7 }, workout: { energy: 0.9 }, gym: { energy: 0.9 },
      running: { energy: 0.85 }, upbeat: { energy: 0.85, joy: 0.7 },

      // Euphoria / Party / Dance
      euphoria: { euphoria: 0.95, joy: 0.7 }, euphoric: { euphoria: 0.95, joy: 0.7 },
      party: { euphoria: 0.85, energy: 0.8 }, dance: { euphoria: 0.8, energy: 0.85 },
      dancing: { euphoria: 0.8, energy: 0.85 }, club: { euphoria: 0.8, energy: 0.8 },

      // Reflection / Focus / Study
      reflection: { reflection: 0.95 }, reflective: { reflection: 0.95 }, thinking: { reflection: 0.85 },
      thoughtful: { reflection: 0.85 }, focus: { reflection: 0.9, calm: 0.5 }, focusing: { reflection: 0.9, calm: 0.5 },
      study: { reflection: 0.9, calm: 0.5 }, studying: { reflection: 0.9, calm: 0.5 },
      reading: { reflection: 0.8, calm: 0.6 }, coding: { reflection: 0.85, focus: 0.9 },
    };

    const MOOD_DIM_EN = {
      sadness: ["sad", "sorrow", "grief", "pain", "tears", "depressed", "unhappy", "crying"],
      longing: ["longing", "miss", "missing", "yearning", "distance"],
      nostalgia: ["nostalgia", "nostalgic", "memory", "memories", "past", "retro", "vintage", "childhood"],
      heartbreak: ["heartbreak", "heartbroken", "breakup", "broken", "rejected", "betrayal"],
      loneliness: ["lonely", "alone", "isolation", "solitude", "empty"],
      joy: ["joy", "happy", "happiness", "cheerful", "glad", "delight", "smile"],
      playfulness: ["playful", "fun", "silly", "quirky", "cheeky"],
      romance: ["romance", "romantic", "love", "lover", "crush", "sweetheart", "kiss"],
      sensuality: ["sensual", "intimate", "sexy", "passion", "desire"],
      warmth: ["warm", "warmth", "cozy", "comfort", "gentle", "tender"],
      anger: ["anger", "angry", "rage", "furious", "mad", "hate"],
      rebellion: ["rebellion", "rebel", "fight", "protest", "riot"],
      power: ["power", "powerful", "strength", "strong", "epic", "victory", "triumph"],
      defiance: ["defiance", "defiant", "fearless", "brave", "bold"],
      calm: ["calm", "peace", "peaceful", "quiet", "relax", "relaxing", "chill", "sleep", "soothing"],
      dreaminess: ["dream", "dreamy", "dreaming", "ethereal", "floating", "stars"],
      melancholy: ["melancholy", "melancholic", "gloomy", "somber", "wistful", "rain"],
      hope: ["hope", "hopeful", "optimism", "bright", "future", "light", "believe"],
      darkness: ["dark", "darkness", "shadow", "gothic"],
      tension: ["tension", "tense", "drama", "dramatic", "suspense", "thrill", "anxiety", "stress"],
      mystery: ["mystery", "mysterious", "secret", "hidden"],
      energy: ["energy", "energetic", "hype", "fast", "workout", "gym", "pumped"],
      euphoria: ["euphoria", "euphoric", "party", "dance", "celebration", "club"],
      reflection: ["reflection", "reflective", "thinking", "thoughtful", "focus", "study", "reading"],
    };

    const DIM_TO_VIBE = {
      sadness: { sad: 1 }, melancholy: { sad: 0.7, calm: 0.3 }, longing: { sad: 0.6, romantic: 0.4 },
      heartbreak: { sad: 0.8, dark: 0.2 }, loneliness: { sad: 0.6, calm: 0.2 },
      nostalgia: { sad: 0.4, calm: 0.3 },
      joy: { happy: 1 }, playfulness: { happy: 0.7, energetic: 0.3 }, euphoria: { happy: 0.6, energetic: 0.4 },
      romance: { romantic: 1 }, sensuality: { romantic: 0.6, dark: 0.2 }, warmth: { happy: 0.4, calm: 0.4 },
      anger: { dark: 0.6, energetic: 0.4 }, rebellion: { energetic: 0.5, dark: 0.3 },
      power: { epic: 0.8, energetic: 0.2 }, defiance: { epic: 0.5, energetic: 0.3 },
      calm: { calm: 1 }, dreaminess: { calm: 0.5, romantic: 0.3 },
      hope: { happy: 0.5, calm: 0.3 },
      darkness: { dark: 1 }, tension: { dark: 0.5, epic: 0.3 }, mystery: { dark: 0.4, calm: 0.3 },
      energy: { energetic: 1 }, reflection: { focus: 1 },
    };

    const qClean = query.toLowerCase().trim();
    const lex = {};
    for (const [w, dims] of Object.entries(EN_MOOD_LEX)) {
      if (new RegExp("\\b" + w + "\\b", "i").test(qClean) || (w.length >= 4 && qClean.includes(w))) {
        for (const [d, v] of Object.entries(dims)) lex[d] = Math.max(lex[d] || 0, v);
      }
    }

    const qm = { moods: lex, energy: "medium", valence: "neutral" };
    if (lex.energy || lex.joy || lex.euphoria) { qm.energy = "high"; qm.valence = "positive"; }
    if (lex.calm || lex.sadness || lex.melancholy) { qm.energy = "low"; }
    if (lex.sadness || lex.heartbreak || lex.anger || lex.loneliness) { qm.valence = "negative"; }

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

    const scored = songs.map((song) => {
      const sm = song.moods || {};
      let sem = 0;
      if (Object.keys(sm).length && Object.keys(qm.moods).length) {
        let dot = 0, na = 0, nb = 0;
        for (const [k, v] of Object.entries(qm.moods)) { na += v * v; if (sm[k]) dot += v * sm[k]; }
        for (const v of Object.values(sm)) nb += v * v;
        sem = (!na || !nb) ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
      }

      let aud = 0;
      const vibe = song.analysis && song.analysis.vibe;
      if (vibe && Object.keys(qm.moods).length) {
        let acc = 0, wsum = 0;
        for (const [dim, w] of Object.entries(qm.moods)) {
          const mix = DIM_TO_VIBE[dim] || { [dim]: 1 };
          let dv = 0;
          for (const [vk, vw] of Object.entries(mix)) dv += ((vibe[vk] ?? 0) / 100) * vw;
          acc += dv * w;
          wsum += w;
        }
        aud = wsum ? Math.min(1, acc / wsum) : 0;
      }

      const tags = (song.tagsEn || song.tags || []).map((t) => String(t).toLowerCase());
      let hit = 0, n = 0;
      for (const [dim, v] of Object.entries(qm.moods)) {
        n += v;
        const enWords = MOOD_DIM_EN[dim] || [];
        if (enWords.some((ew) => tags.some((tg) => tg.includes(ew)))) hit += v;
      }
      const tag = n ? hit / n : 0;

      let score = 0.5 * sem + 0.3 * tag + 0.2 * aud;

      // Title & Artist match bonus
      const sName = String(song.name || "").toLowerCase();
      const sArtist = String(song.artist || "").toLowerCase();
      if (sName === qClean || sArtist === qClean) score += 1.5;
      else if (sName.includes(qClean) || sArtist.includes(qClean)) score += 1.0;
      else if (qClean.includes(sName) || qClean.includes(sArtist)) score += 0.8;

      // Direct tag match bonus
      if (tags.some((t) => t.includes(qClean) || qClean.includes(t))) score += 0.5;

      return {
        song,
        finalScore: score,
        parts: { semantic: Math.round(sem * 100) / 100, tags: Math.round(tag * 100) / 100, audio: Math.round(aud * 100) / 100 },
      };
    });

    scored.sort((a, b) => b.finalScore - a.finalScore);
    const top = scored.slice(0, 3);
    const results = top.map(({ song, finalScore, parts }) => ({
      id: song.id,
      name: song.name,
      artist: song.artist,
      src: song.src,
      tags: (song.tagsEn || song.tags || []).slice(0, 8),
      analysis: song.analysis || null,
      score: Math.round(finalScore * 100) / 100,
      parts,
      audioMoodTag: song.audioMoodEn || null,
      summary: song.summaryEn || null,
    }));
    const best = results[0] ? results[0].score : 0;

    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({
      found: results.length > 0,
      song: results[0] || null,
      mood: { moods: qm.moods, energy: qm.energy, valence: qm.valence },
      bestScore: best,
      softMatch: best < 0.15,
      results,
    }));
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
          const data = readJSON(file, []);

          if (req.method === "POST") {
            const newProject = {
              id: Date.now(),
              url: payload.url || "",
              title: payload.title || "Untitled",
              description: payload.description || "",
              category: payload.category || [],
              image: payload.image || "",
              githubUrl: payload.githubUrl || null,
            };
            data.push(newProject);
          } else {
            const idx = data.findIndex((p) => p.id === payload.id);
            if (idx >= 0) Object.assign(data[idx], payload);
          }

          writeJSON(file, data);
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
          const { type, id } = JSON.parse(body);
          const file = type === "mini" ? miniFile : projectsFile;
          const data = readJSON(file, []);
          writeJSON(
            file,
            data.filter((p) => p.id !== id)
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
          const data = readJSON(skillsFile, []);

          if (req.method === "POST") {
            data.push({
              id: Date.now(),
              name: payload.name || "Untitled",
              img: payload.img || "",
            });
          } else {
            const idx = data.findIndex((s) => s.id === payload.id);
            if (idx >= 0) Object.assign(data[idx], payload);
          }

          writeJSON(skillsFile, data);
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

  // ── Skills public ──
  if (endpoint === "skills" && req.method === "GET") {
    const skillsFile = join(process.cwd(), "public", "api", "skills.json");
    const data = readJSON(skillsFile, []);
    res.writeHead(200, { "Content-Type": "application/json" });
    res.end(JSON.stringify({ skills: data }));
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

  // Fallback
  next();
}
