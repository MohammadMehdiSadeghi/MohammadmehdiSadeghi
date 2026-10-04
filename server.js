#!/usr/bin/env node
/* ============================================================
   portfolio server.js — Node.js backend (replaces Apache/PHP)

   Serves:
     - The built React SPA (dist/) at /
     - The API formerly implemented in public/api/*.php
     - Embedded showcase projects under /Projects (static)

   Storage: JSON files (same shapes the PHP version wrote).

   Run:  node server.js          (PORT env or 3000)
   ============================================================ */

import express from "express";
import fs from "fs";
import fsp from "fs/promises";
import path from "path";
import crypto from "crypto";
import { fileURLToPath } from "url";
import { executeMoodSearch, MOOD_DIMS } from "./src/lib/moodEngine.js";
import { resolveCountry, formatCountryStats, getCountryFlag, getCountryName } from "./api/_country.js";

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);

const PORT = process.env.PORT || 3000;
const ROOT = __dirname;
const DIST = path.join(ROOT, "dist");
const PUBLIC_DIR = path.join(ROOT, "public");
const ADMIN_DATA = path.join(ROOT, "data");

/* ── JSON file store (atomic write + per-key serialization) ── */
const locks = new Map();
function withLock(key, fn) {
  if (!locks.has(key)) locks.set(key, Promise.resolve());
  const run = locks.get(key).then(fn);
  locks.set(key, run.catch(() => {}));
  return run;
}

async function readJSON(file, fallback) {
  try {
    const raw = await fsp.readFile(file, "utf8");
    if (!raw) return fallback;
    const data = JSON.parse(raw);
    return data == null ? fallback : data;
  } catch {
    return fallback;
  }
}

async function writeJSON(file, data) {
  await fsp.mkdir(path.dirname(file), { recursive: true });
  const tmp = file + ".tmp";
  await fsp.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fsp.rename(tmp, file);
}

/* ── dates ── */
const pad = (n) => String(n).padStart(2, "0");
const dstr = (d) => `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
const daysAgo = (n) => { const d = new Date(); d.setDate(d.getDate() - n); return d; };

/* ── same-origin CORS (mirror of the PHP Origin reflection) ── */
function sameOriginCORS(req, res, next) {
  const origin = req.headers.origin || "";
  const host = req.headers.host || "";
  if (origin) {
    try {
      if (new URL(origin).host === host) {
        res.setHeader("Access-Control-Allow-Origin", origin);
        res.setHeader("Vary", "Origin");
      }
    } catch { /* ignore */ }
  }
  next();
}

/* ══════════════════ ADMIN AUTH (HMAC token, PHP wire format) ══════════════════ */

const F = {
  config: path.join(ADMIN_DATA, "config.json"),
  visits: path.join(ADMIN_DATA, "visits.json"),
  messages: path.join(ADMIN_DATA, "messages.json"),
  online: path.join(ADMIN_DATA, "online.json"),
  clicks: path.join(ADMIN_DATA, "clicks.json"),
  rate: path.join(ADMIN_DATA, "rate.json"),
  telegram: path.join(ADMIN_DATA, "telegram.json"),
  telegramLog: path.join(ADMIN_DATA, "telegram-log.json"),
};
const PUBLIC_JSON = {
  projects: path.join(PUBLIC_DIR, "api", "projects.json"),
  "mini-projects": path.join(PUBLIC_DIR, "api", "mini-projects.json"),
  skills: path.join(PUBLIC_DIR, "api", "skills.json"),
  blog: path.join(PUBLIC_DIR, "api", "blog.json"),
  site: path.join(PUBLIC_DIR, "api", "site.json"),
};

const TOKEN_TTL = 60 * 60 * 24 * 7; // 7 days (reduced from 10y for security)
let CONFIG = { username: "", password_sha256: "", secret: "changeme", token_version: 0 };

let configReady = null;
function ensureConfig() {
  if (!configReady) {
    configReady = (async () => {
      CONFIG = await readJSON(F.config, CONFIG);
      if (!CONFIG.secret || CONFIG.secret === "changeme") {
        CONFIG.secret = crypto.randomBytes(32).toString("hex");
        await writeJSON(F.config, CONFIG);
      }
    })();
  }
  return configReady;
}
ensureConfig();

function b64url(buf) {
  return Buffer.from(buf).toString("base64").replace(/\+/g, "-").replace(/\//g, "_").replace(/=+$/, "");
}
function issueToken(username) {
  const payloadB64 = b64url(JSON.stringify({
    u: username, ver: CONFIG.token_version || 0, exp: Math.floor(Date.now() / 1000) + TOKEN_TTL,
  }));
  const sig = b64url(crypto.createHmac("sha256", String(CONFIG.secret)).update(payloadB64).digest());
  return `${payloadB64}.${sig}`;
}
function timingSafeEq(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}
function verifyToken(token) {
  if (!token || !token.includes(".")) return null;
  const [payloadB64, sig] = token.split(".");
  const expected = b64url(crypto.createHmac("sha256", String(CONFIG.secret)).update(payloadB64).digest());
  if (!timingSafeEq(expected, sig)) return null;
  try {
    const payload = JSON.parse(Buffer.from(payloadB64, "base64").toString("utf8"));
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000)) return null;
    if ((payload.ver ?? 0) !== (CONFIG.token_version || 0)) return null;
    return payload;
  } catch { return null; }
}
function getBearer(req) {
  const m = /^Bearer\s+(.*)$/i.exec(req.headers.authorization || "");
  return m ? m[1].trim() : null;
}
function requireAuth(req, res) {
  const payload = verifyToken(getBearer(req));
  if (!payload) { res.status(401).json({ error: "unauthorized" }); return null; }
  return payload;
}
function requireAuthAsync(req, res) {
  return ensureConfig().then(() => requireAuth(req, res));
}

/* ══════════════════ RATE LIMITING (parity with PHP rate.json) ══════════════════ */

const RATE_MAX = 5, RATE_WINDOW = 900;     // hard: 5 / 15min → 429
const SOFT_BUDGET = 120, SOFT_WINDOW = 60; // soft: 120/min → silent drop

const clientIP = (req) => {
  return req.ip || req.socket?.remoteAddress || req.connection?.remoteAddress || "127.0.0.1";
};

async function rateCheck(req, key, soft) {
  const k = `${clientIP(req)}::${key}`;
  return withLock("rate", async () => {
    const data = await readJSON(F.rate, {});
    const now = Math.floor(Date.now() / 1000);
    const window = soft ? SOFT_WINDOW : RATE_WINDOW;
    for (const [kk, info] of Object.entries(data)) {
      if (now - (info.first || 0) > window) delete data[kk];
    }
    const entry = data[k] || { count: 0, first: now };
    const budget = soft ? SOFT_BUDGET : RATE_MAX;
    if (entry.count >= budget) {
      data[k] = entry;
      await writeJSON(F.rate, data);
      return false;
    }
    entry.count += 1;
    data[k] = entry;
    await writeJSON(F.rate, data);
    return true;
  });
}
async function rateFail(k) {
  await withLock("rate", async () => {
    const data = await readJSON(F.rate, {});
    const e = data[k] || { count: 0, first: Math.floor(Date.now() / 1000) };
    e.count += 1;
    data[k] = e;
    await writeJSON(F.rate, data);
  });
}
async function rateSuccess(k) {
  await withLock("rate", async () => {
    const data = await readJSON(F.rate, {});
    delete data[k];
    await writeJSON(F.rate, data);
  });
}

/* ── Security Headers ── */
function securityHeaders(req, res, next) {
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("X-Frame-Options", "SAMEORIGIN");
  res.setHeader("Referrer-Policy", "strict-origin-when-cross-origin");
  res.setHeader("X-XSS-Protection", "1; mode=block");
  if (req.secure || req.headers["x-forwarded-proto"] === "https") {
    res.setHeader("Strict-Transport-Security", "max-age=31536000; includeSubDomains");
  }
  next();
}

/* ══════════════════ APP ══════════════════ */

const app = express();
app.set("trust proxy", 1);
app.disable("x-powered-by");
app.use(securityHeaders);
app.use(express.json({ limit: "6mb" })); // blog cover uploads arrive as base64
app.use(sameOriginCORS);

const wrap = (fn) => (req, res) =>
  Promise.resolve(fn(req, res)).catch((e) => {
    console.error(e);
    if (!res.headersSent) res.status(500).json({ error: "server error" });
  });

/* ── public data APIs (was projects.php / mini-projects.php / skills.php) ── */

function listEndpoint(jsonFile, key) {
  return wrap(async (req, res) => {
    const data = await readJSON(jsonFile, []);
    let items = Array.isArray(data) ? data : [];
    const cat = req.query.category;
    if (cat) items = items.filter((p) => Array.isArray(p.category) && p.category.includes(cat));
    res.json({ [key]: items });
  });
}
app.get("/api/projects", listEndpoint(PUBLIC_JSON.projects, "projects"));
app.get("/api/mini-projects", listEndpoint(PUBLIC_JSON["mini-projects"], "projects"));
app.get("/api/skills", wrap(async (req, res) => {
  const skills = await readJSON(PUBLIC_JSON.skills, []);
  res.json({ skills: Array.isArray(skills) ? skills : [] });
}));

/* site-wide identity / contact / social links, edited in the admin panel.
   Explicit route (not just the /api static mount further down) so the shape
   is guaranteed to be an object even if the file was removed by a reset. */
app.get("/api/site.json", wrap(async (req, res) => {
  const site = await readJSON(PUBLIC_JSON.site, {});
  res.setHeader("Cache-Control", "no-store");
  res.json(site && typeof site === "object" && !Array.isArray(site) ? site : {});
}));

/* was project.php — slug/id lookup */
app.get("/api/project", wrap(async (req, res) => {
  const { slug, id } = req.query;
  if (!slug && id === undefined) return res.status(400).json({ error: "slug or id is required" });
  const projects = await readJSON(PUBLIC_JSON.projects, []);
  const found = projects.filter((p) => (slug != null ? p.slug === slug : String(p.id) === String(id)));
  if (!found.length) return res.status(404).json({ error: "project not found" });
  res.json({ project: found[0] });
}));

/* ════════════ MUSIC SEARCH (faithful port of search.php) ════════════ */

let MUSIC_DB = null;
async function loadMusicDB() {
  if (MUSIC_DB) return MUSIC_DB;
  MUSIC_DB = await readJSON(path.join(PUBLIC_DIR, "api", "music-database.json"), { songs: [] });
  return MUSIC_DB;
}
loadMusicDB();

function norm(s) {
  return String(s || "")
    .trim().toLowerCase()
    .replace(/[يكأإآةۀؤئەٱ]/g, (ch) => ({
      "ي": "ی", "ك": "ک", "أ": "ا", "إ": "ا", "آ": "ا",
      "ة": "ه", "ۀ": "ه", "ؤ": "و", "ئ": "ی", "ە": "ه", "ٱ": "ا",
    }[ch]))
    .replace(/[\u064B-\u0652\u0640\u200C]/g, "")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set([
  "من","تو","او","ما","شما","آنها","این","آن","که","با","به","از","در","را","رو","برای","و","یا","ولی","اما","اگر","بعد",
  "پس","بود","است","هست","میخوام","میکنم","دارم","یه","یک","فقط","خیلی","اهنگ","موزیک","موسیقی","اغنیه","ترانه","بذار","بزار","بزن","بگو","بخون","بخوان","پخش","کن","بکن","چیزی","میخواد","دلم","اسم","احساس",
  "song","music","feel","feels","feeling","want","wanna","put","some",
  "the","a","an","to","of","for","and","or","in","on","with","is","are","be","was","i","you","me","my","we","it",
]);

const PHRASES = ["بی حال", "بی حال", "خیلی خوب", "حال خوب"];
function tokenise(s) {
  let toks = s.split(/\s+/).filter(Boolean);
  // merge known 2-word phrases into single tokens BEFORE stopword filtering
  const merged = [];
  for (let i = 0; i < toks.length; i++) {
    const two = toks[i] + " " + (toks[i + 1] || "");
    if (PHRASES.includes(two)) { merged.push(two); i++; }
    else merged.push(toks[i]);
  }
  return merged.filter((t) => t && t.length >= 2 && !STOPWORDS.has(t));
}

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
  romantic: "عاشقانه", heartbreak: "جدایی", angry: "خشم", dance: "رقص",
  lonely: "تنهایی", lonly: "تنهایی", alone: "تنهایی", lonelyness: "تنهایی",
  heartbroken: "دلشکستگی", breakup: "دلشکستگی", tears: "اشک", cry: "اشک",
  tired: "خستگی", hope: "امید", miss: "دلتنگی", missing: "دلتنگی",
  dancing: "رقص", danceable: "رقص",
  unhappy: "غم", upset: "غم", depressed: "غم", heartache: "دلشکستگی",
  sleepy: "خواب", asleep: "خواب", cozy: "ارامش", soothing: "ارامش",
  motivated: "انگیزه", motivation: "انگیزه", grind: "انگیزه",
  nostalgic: "نوستالژی", memories: "خاطره",
  epic: "حماسه", cinematic: "سینمایی", vibing: "شادی",
  eminem: "امینم", billie: "بیلی ایلیش", eilish: "بیلی ایلیش", zaz: "زاز",
  abba: "ابی", zimmer: "زیمر", eminemm: "امینم", dragons: "ایمجین دراگونز",
};
// فارسی↔فارسی — کلیدها/مقادیر باید post-norm باشند (آ→ا، ؤ→و) چون norm قبل از مقایسه فولد می‌کند؛
// مقادیر فقط به تگ‌های واقعی موجود ختم می‌شوند
const SYNON = {
  "عاشقانه": ["عشق"], "عشق": ["عاشقانه"],
  "هیجان": ["پرانرژی"],
  "غمگین": ["اندوه", "غم"], "غم": ["اندوه"], "اندوه": ["غم"],
  "حزن": ["اندوه", "غم"], "اندوهناک": ["اندوه", "غم"],
  "دلتنگی": ["حسرت"], "حسرت": ["دلتنگی"],
  "شاد": ["شادی"], "شادی": ["شاد"],
  "انگیزشی": ["انگیزه", "الهام"], "انگیزه": ["الهام"],
  "ارامش": ["ارام", "سکوت"], "ارام": ["ارامش", "سکوت"], "اروم": ["ارام", "ارامش"],
  "رویایی": ["رویا"], "رویا": ["رویایی"],
  "حماسی": ["حماسه"], "حماسه": ["حماسی"],
  "پرانرژی": ["انرژی"], "انرژی": ["پرانرژی"],
  "درد": ["دردناک", "الم"], "دردناک": ["درد"], "الم": ["درد"],
  "تنهایی": ["انزوا"], "انزوا": ["تنهایی"],
  "خاطره": ["نوستالژی"],
  "جدایی": ["دلشکستگی", "شکست عشقی"], "دلشکستگی": ["جدایی", "شکست عشقی"],
  "استقلال": ["خودکفایی"], "خودپذیری": ["خودشناسی"],
  "تاریک": ["تاریکی"], "تاریکی": ["تاریک"],
  "لطیف": ["نرم", "ملایم"], "ملایم": ["لطیف", "نرم"], "نرم": ["لطیف", "ملایم"],
  "قوی": ["قدرتمند"], "قدرت": ["قدرتمند"], "قدرتمند": ["قوی"],
  "شب": ["شبانه"], "پاییز": ["اکتبر"], "زمستان": ["سردی"],
  "مبارزه": ["سختکوشی"], "سختکوشی": ["مبارزه"],
  "بارونی": ["اندوه", "ارامش", "سکوت"], "باران": ["ارامش", "اندوه"],
  "درس": ["تمرکز", "مطالعه"], "خوندن": ["مطالعه"],
  "ناراحت": ["غم", "اندوه"], "دلسرد": ["غم", "اندوه"], "بی حال": ["غم"], "بیحال": ["غم"],
  "غصه": ["غم", "اندوه"], "داغون": ["غم", "دلشکستگی"], "خشمگین": ["خشم", "تاریک"], "عصبانی": ["خشم"],
  "شادمان": ["شاد"], "خوشحال": ["شاد", "خوشبختی"], "مهمونی": ["رقص سبک", "شادی"], "پارتی": ["رقص سبک", "شادی"],
  "پرواز": ["ازادی"], "رهایی": ["ازادی"],
  "زیما": ["زیمر"], "ایماژین": ["ایمجین دراگونز"], "ایمی": ["امینم"], "ایلش": ["بیلی ایلیش"],
  "ابا": ["ابی"], "ابba": ["ابی"], "ابیئی": ["ابی"], "اشتیاق": ["عشق"], "دلتنگ": ["دلتنگی"], "خسته": ["خستگی"],
  "خواب": ["ارامش", "سکوت"], "آروم": ["ارام"], "آرامش": ["ارامش"], "ملوس": ["لطیف", "دلنشین"],
  "نوستالژی": ["خاطره", "گذشته"], "یادگاری": ["خاطره"], "جذاب": ["جذابیت"], "گیرا": ["گیرا"],
  "مطالعه": ["تمرکز"], "تمرکز": ["مطالعه"],
};
// بسط دو سطحی: sad→غمگین→غم (مترادفِ مترادف هم جستجو می‌شود)
function expandTokens(tokens) {
  const out = [...tokens];
  let frontier = [...tokens];
  for (let depth = 0; depth < 2; depth++) {
    const next = [];
    for (const t of frontier) {
      if (TRANSLIT[t] && !out.includes(TRANSLIT[t])) { out.push(TRANSLIT[t]); next.push(TRANSLIT[t]); }
      const syns = SYNON[t];
      if (syns) for (const s of syns) if (!out.includes(s)) { out.push(s); next.push(s); }
    }
    frontier = next;
  }
  return out;
}

function containsSim(hay, needle) {
  if (hay === needle) return 1.0;
  if (hay.includes(needle)) return 0.8;
  if (needle.length >= 3 && hay.length >= 2 && needle.includes(hay)) return 0.6;
  return 0.0;
}

function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}
function levSim(a, b) {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  const len = longer.length;
  if (!len) return 1.0;
  return (len - lev(longer, shorter)) / len;
}

function variantsOf(t) {
  const out = [t];
  if (TRANSLIT[t] && !out.includes(TRANSLIT[t])) out.push(TRANSLIT[t]);
  const syns = SYNON[t];
  if (syns) for (const s of syns) if (!out.includes(s)) out.push(s);
  for (const v of [...out]) {
    if (TRANSLIT[v] && !out.includes(TRANSLIT[v])) out.push(TRANSLIT[v]);
    const sy2 = SYNON[v];
    if (sy2) for (const s of sy2) if (!out.includes(s)) out.push(s);
  }
  return out;
}

// امتیاز یک توکن نسبت به لیست تگ: دقیق > کلمهٔ مشخص داخل تگ چندکلمه‌ای > فازی تک‌کلمه‌ای
function hitTag(token, normTags, rawTags) {
  let best = 0.0, idx = -1, phrase = false;
  for (let i = 0; i < normTags.length; i++) {
    const tag = normTags[i];
    if (!tag) continue;
    let s = 0.0, ph = false;
    if (token === tag) s = 1.0;
    else if (token.length >= 4 && tag.includes(" ") && tag.split(" ").some((w) => w.length >= 4 && w === token)) { s = 0.9; ph = true; }
    else if (s === 0.0 && token.length >= 5 && tag.includes(" ")) {
      const wThr = (x) => (x.length >= 6 ? 0.8 : 0.85);
      const w = tag.split(" ").find((x) => x.length >= 5 && levSim(token, x) >= wThr(x));
      if (w) { s = 0.85 * levSim(token, w); ph = true; }
    }
    // phonetic-vowel key: Persian transliteration typos swap vowels (ابا→ابی، بیل→بیلی، زیز→زاز) —
    // fold ONLY vowels for the key, require consonant skeleton ≥2, word-level only, modest score.
    else if (s === 0.0 && token.length >= 3) {
      const kq = token.replace(/[ایواویو]/g, "");
      if (kq.length >= 2) {
        const w = tag.split(" ").find((x) => {
          const kx = x.replace(/[ایواویو]/g, "");
          return kx.length >= 2 && kx === kq;
        });
        if (w) { s = 0.7; ph = true; }
      }
    }
    if (s === 0.0 && tag.length <= 10 && token.length <= 10) {
      const sim = levSim(token, tag);
      const minSim = token.length <= 3 ? 0.85 : token.length <= 5 ? 0.8 : 0.75;
      if (sim >= minSim) s = 0.9 * sim;
    }
    if (s > best) { best = s; idx = i; phrase = ph; }
  }
  return { score: best, label: idx >= 0 ? String(rawTags[idx] ?? "") : null, phrase };
}

/* ---- mood ranking: «شادترین اهنگ ممکن» / «i feel lonely» → rank by analysis.vibe ----
   stems are POST-norm (ارامش not آرامش). A token containing a stem votes for that dim;
   first token weighs 1.35 (carries the intent). */
const MOOD_STEMS = [
  ["sad",      ["غم", "اندوه", "حزن", "دلتنگ", "تنها", "اشک", "گریه", "دلشکست", "حسرت", "sad", "lonely", "lonly", "alone", "cry", "tears", "heartbr", "miss"]],
  ["happy",    ["شاد", "خوشحال", "خوشبخت", "حال خوب", "happy", "joy", "good vibes"]],
  ["energetic",["انرژ", "هیجان", "قدرت", "جنگی", "مبارزه", "gym", "workout", "hype", "energet", "پرانرژی"]],
  ["calm",     ["ارام", "اروم", "ملایم", "لطیف", "خواب", "sleep", "chill", "relax", "calm", "اهسته", "برای خواب"]],
  ["focus",    ["تمرکز", "مطالعه", "درس", "concentr", "study", "focus", "reading", "کار"]],
  ["epic",     ["حماس", "اپیک", "سینمایی", "سنگین", "epic", "cinematic"]],
  ["romantic", ["عاشقان", "عشق", "رمانتیک", "romantic", "love", "عاشق"]],
  ["dark",     ["تاریک", "تلخ", "نوآر", "dark", "گوتیک"]],
];
function detectMood(qTokens) {
  const hits = [];
  for (const [dim, stems] of MOOD_STEMS) {
    let w = 0;
    for (let i = 0; i < qTokens.length; i++) {
      const tk = qTokens[i];
      if (stems.some((st) => tk.includes(st))) w += i === 0 ? 1.35 : 0.75;
    }
    if (w > 0) hits.push([dim, w]);
  }
  return hits;
}

/* ══════════════════ MOOD SEARCH (semantic + audio vibe matching) ══════════════════ */

app.get("/api/mood-search", wrap(async (req, res) => {
  const query = String(req.query.q || "").trim();
  if (!query) return res.json({ error: "Query is required" });
  if (query.length < 2) return res.json({ error: "Query is too short (min 2 chars)" });
  if (query.length > 500) return res.json({ error: "Query is too long (max 500 chars)" });

  const db = await loadMusicDB();
  const songs = db.songs || [];
  if (!songs.length) return res.json({ found: false, results: [] });

  const result = executeMoodSearch(songs, query);

  /* search_logs (spec §4): keep last 500 for future weight tuning / feedback loop */
  try {
    await withLock("mood-searches", async () => {
      const FLOG = path.join(ADMIN_DATA, "mood-searches.json");
      const log = await readJSON(FLOG, { entries: [] });
      if (!Array.isArray(log.entries)) log.entries = [];
      log.entries.unshift({
        at: new Date().toISOString(),
        query: query.slice(0, 400),
        extractedMood: result.mood,
        topResultId: result.song ? result.song.id : null,
        topScore: result.bestScore,
      });
      log.entries = log.entries.slice(0, 500);
      await writeJSON(FLOG, log);
    });
  } catch { /* best-effort log write */ }

  res.setHeader("Cache-Control", "no-store");
  res.json(result);
}));

/* fa words per mood dim, used for tag overlap scoring */
const MOOD_DIM_FA = {
  sadness: ["غم", "اندوه", "حزن", "درد", "اشک"],
  longing: ["دلتنگ", "حسرت", "دوری"],
  nostalgia: ["نوستالژی", "خاطره", "گذشته", "رترو"],
  heartbreak: ["دلشکست", "شکست", "جدایی", "طرد"],
  loneliness: ["تنها", "تنهایی"],
  joy: ["شاد", "خوشحال", "نشاط"],
  playfulness: ["شوخ", "بامزه", "پرنش"],
  romance: ["عاشقان", "رمانتیک", "عشق", "عاشق"],
  sensuality: ["احساسی", "داغ"],
  warmth: ["گرم", "لطیف", "دلنشین"],
  anger: ["عصبانیت", "خشم", "انتقام"],
  rebellion: ["اعتراض", "شورش", "جنگ"],
  power: ["قدرت", "حماسه", "حماسی", "پیروزی"],
  defiance: ["سرسخت", "مقاومت"],
  calm: ["آرام", "ارام", "آروم", "ملایم", "خواب"],
  dreaminess: ["رویایی", "رؤیایی", "خواب آلود", "رؤیا"],
  melancholy: ["مالیخولیا", "دلتنگی", "غمگین"],
  hope: ["امید", "روشنایی", "آینده"],
  darkness: ["تاریک", "تلخ", "گوتیک"],
  tension: ["تنش", "دراماتیک", "تعقیب"],
  mystery: ["راز", "مرموز"],
  energy: ["پرانرژی", "انرژی", "هیجان"],
  euphoria: ["شادی و هیجان", "نشئه", "جشن"],
  reflection: ["تأمل", "تفکر", "عمیق", "فلسفی"],
};

app.get("/api/search", wrap(async (req, res) => {
  const query = String(req.query.q || "").trim();
  if (!query) return res.json({ error: "Query is required" });
  if (query.length > 75) return res.json({ error: "Query is too long" });
  const db = await loadMusicDB();
  const songs = db.songs || [];
  const qNorm = norm(query);

  const baseTokens = tokenise(qNorm);
  const qTokens = expandTokens(baseTokens);
  const nTokens = Math.max(baseTokens.length, 1);
  const moodHits = detectMood(baseTokens);

  const scores = songs.map((song) => {
    const nameNorm = norm(song.name);
    const artistNorm = norm(song.artist);
    let score = 0.0;
    const matched = [];

    if (nameNorm === qNorm) score += 10.0;
    if (qNorm.length >= 2) score += containsSim(nameNorm, qNorm) * 5.0;

    if (artistNorm === qNorm) score += 6.0;
    else if (qNorm.length >= 2) score += containsSim(artistNorm, qNorm) * 3.0;
    // تایپوی اسم/آرتیست با فازی بلند (فقط وقتی مچ زیررشته نداریم)
    if (qNorm.length >= 5) {
      if (!nameNorm.includes(qNorm) && !qNorm.includes(nameNorm)) {
        const simN = levSim(qNorm, nameNorm);
        if (simN >= 0.75) score += simN * 5.0;
      }
      if (!artistNorm.includes(qNorm) && !qNorm.includes(artistNorm)) {
        const simA = levSim(qNorm, artistNorm);
        if (simA >= 0.78) score += simA * 3.0;
      }
    }

    const nameArtistTokens = tokenise(`${nameNorm} ${artistNorm}`);
    if (nameArtistTokens.length) {
      let overlaps = 0;
      for (const qt of qTokens) {
        if (nameArtistTokens.some((nt) =>
          nt === qt || (nt.includes(qt) && qt.length >= 2) || (qt.includes(nt) && nt.length >= 4))) overlaps++;
      }
      score += Math.min(overlaps / nTokens, 1.0) * 4.0;
    }

        const faTags = song.tags || [];
    const enTags = song.tagsEn || [];
    const faNorm = faTags.map(norm);
    const enNorm = enTags.map(norm);
    let tagScore = 0.0;
    let covered = 0;
    // عبارت چندکلمه‌ای: کل کوئری داخل یک تگ → پاداش مستقیم
    const joined = qTokens.join("");
    if (baseTokens.length >= 2 && joined.length >= 5 && faNorm.some((tg) => tg.replace(/\s+/g, "").includes(joined))) tagScore += 0.85;
    // هر توکن پایه فقط بهترین برخورد بین خودش و بسط‌هایش را می‌گیرد (بدون شمارش مضاعف)
    for (let bi = 0; bi < baseTokens.length; bi++) {
      const variants = variantsOf(baseTokens[bi]);
      let bestHit = 0.0, bestLabel = null, bestPhrase = false;
      for (const v of variants) {
        const vt = norm(v);
        const hFa = hitTag(vt, faNorm, faTags);
        const hEn = hitTag(vt, enNorm, enTags);
        const h = hFa.score >= hEn.score ? hFa : hEn;
        if (h.score > bestHit) { bestHit = h.score; bestLabel = h.label; bestPhrase = h.phrase; }
      }
      if (bestHit >= 0.7) {
        covered += bestPhrase ? 2 : 1;
        tagScore += bestHit * (bi === 0 ? 1.0 : 0.75) + (bestPhrase ? 0.3 : 0);
        if (bestLabel && !matched.includes(bestLabel)) matched.push(bestLabel);
      }
    }
    // single-word query: a tag hit IS the intent — weigh it like a name hit
    score += Math.min(tagScore / nTokens, 1.0) * (nTokens === 1 ? 3.2 : 2.0);
    // پذیرش وایب: پوشش کافیِ توکن‌های کوئری حتی بدون برخورد اسم/آرتیست
    if (covered / nTokens >= (nTokens === 1 ? 0.5 : nTokens >= 3 ? 0.34 : 0.5)) score += nTokens === 1 ? 2.4 : 1.6;

    /* mood mode: rank by analysis.vibe of the requested dims; keep 25% of the
       textual score as tie-break so «اهنگ شاد زاز» still prefers Zaz */
    if (moodHits.length) {
      const an = song.analysis;
      if (an && an.vibe) {
        let vibePart = 0;
        for (const [dim, w] of moodHits) vibePart += (an.vibe[dim] || 0) * w;
        score = vibePart + score * 0.25;
      }
    }
    return { id: song.id, score, matched };
  });

  scores.sort((a, b) => b.score - a.score);
  const best = scores[0] || null;
  if (best && best.score >= 1.5) {
    const matchedSong = songs.find((s) => s.id === best.id);
    return res.json({
      found: true,
      score: Math.round(best.score * 100) / 100,
      song: {
        id: matchedSong.id, name: matchedSong.name, artist: matchedSong.artist, src: matchedSong.src,
        tags: (matchedSong.tagsEn || matchedSong.tags || []).slice(0, 8),
        tagsEn: (matchedSong.tagsEn || []).slice(0, 4),
        matched: best.matched.slice(0, 8),
      },
    });
  }
  res.json({ found: false });
}));

/* was song.php */
app.get("/api/song", wrap(async (req, res) => {
  const id = parseInt(req.query.id, 10) || 0;
  if (!id) return res.json({ error: "ID is required" });
  const db = await loadMusicDB();
  const song = (db.songs || []).find((s) => s.id === id);
  if (!song) return res.json({ error: "Song not found" });
  res.json({ id: song.id, name: song.name, artist: song.artist, src: song.src });
}));

/* ══════════════════ TRACKING (public) ══════════════════ */

/* was track.php */
app.post("/api/admin/track", wrap(async (req, res) => {
  const token = getBearer(req) || req.body?.adminToken || "";
  if (token && verifyToken(token)) return res.json({ ok: true, ignored: "admin" });
  const allowed = await rateCheck(req, "track", true);
  if (!allowed) return res.json({ ok: true }); // silent drop like PHP
  const body = req.body || {};
  let p = String(body.path || "/").trim().slice(0, 200);
  if (!p) p = "/";
  const sessionId = String(body.sessionId || "").trim().slice(0, 100);
  const heartbeat = !!body.heartbeat;
  const country = resolveCountry(req, body);

  if (sessionId) {
    await withLock("online", async () => {
      const online = await readJSON(F.online, {});
      const nowSec = Math.floor(Date.now() / 1000);
      online[sessionId] = { seen: nowSec, country };
      for (const [sid, val] of Object.entries(online)) {
        const seen = typeof val === "object" && val !== null ? val.seen : Number(val);
        if (nowSec - seen > 60) delete online[sid];
      }
      await writeJSON(F.online, online);
    });
  }
  if (heartbeat) return res.json({ ok: true, country });

  const now = new Date();
  const today = dstr(now);
  const hour = pad(now.getHours());
  await withLock("visits", async () => {
    const visits = await readJSON(F.visits, { days: {} });
    if (!visits.days || typeof visits.days !== "object") visits.days = {};
    if (!visits.days[today]) visits.days[today] = { total: 0, paths: {}, hours: {}, countries: {}, visitors: [] };
    if (!visits.days[today].hours || typeof visits.days[today].hours !== "object") visits.days[today].hours = {};
    if (!visits.days[today].countries || typeof visits.days[today].countries !== "object") visits.days[today].countries = {};
    if (!Array.isArray(visits.days[today].visitors)) visits.days[today].visitors = [];
    visits.days[today].total += 1;
    visits.days[today].paths[p] = (visits.days[today].paths[p] || 0) + 1;
    visits.days[today].hours[hour] = (visits.days[today].hours[hour] || 0) + 1;
    if (country) {
      visits.days[today].countries[country] = (visits.days[today].countries[country] || 0) + 1;
    }
    if (sessionId && !visits.days[today].visitors.includes(sessionId)) {
      visits.days[today].visitors.push(sessionId);
      if (visits.days[today].visitors.length > 5000) {
        visits.days[today].visitors = visits.days[today].visitors.slice(-5000);
      }
    }
    await writeJSON(F.visits, visits);
  });
  res.json({ ok: true, country });
}));

/* was track-click.php */
app.post("/api/admin/track-click", wrap(async (req, res) => {
  const token = getBearer(req) || req.body?.adminToken || "";
  if (token && verifyToken(token)) return res.json({ ok: true, ignored: "admin" });
  const allowed = await rateCheck(req, "click", true);
  if (!allowed) return res.json({ ok: true });
  const body = req.body || {};
  const targetType = String(body.targetType || "").trim().slice(0, 50);
  const targetId = String(body.targetId || "").trim().slice(0, 200);
  const targetLabel = String(body.targetLabel || "").trim().slice(0, 200);
  const path = String(body.path || "/").trim().slice(0, 200);
  const sessionId = String(body.sessionId || "").trim().slice(0, 100);
  const referrer = String(body.referrer || "").trim().slice(0, 500);
  if (!targetType || !targetId) return res.status(400).json({ error: "targetType and targetId are required" });

  const now = new Date();
  const today = dstr(now);
  const event = { time: now.toISOString(), targetType, targetId, targetLabel, path, sessionId, referrer };

  await withLock("clicks", async () => {
    const clicks = await readJSON(F.clicks, { events: [], summary: {} });
    clicks.events = Array.isArray(clicks.events) ? clicks.events : [];
    clicks.summary = clicks.summary && typeof clicks.summary === "object" ? clicks.summary : {};

    clicks.events.push(event);
    if (clicks.events.length > 500) clicks.events = clicks.events.slice(-500);

    const key = `${targetType}::${targetId}`;
    if (!clicks.summary[key]) {
      clicks.summary[key] = {
        targetType, targetId, targetLabel,
        total: 0, today: 0, week: 0, lastSeen: "", firstSeen: event.time, daily: {},
      };
    }
    const s = clicks.summary[key];
    s.total += 1;
    s.lastSeen = event.time;
    if (targetLabel) s.targetLabel = targetLabel;
    s.daily = s.daily || {};
    s.daily[today] = (s.daily[today] || 0) + 1;

    let todayCount = 0, weekCount = 0;
    for (let i = 0; i < 7; i++) {
      const c = s.daily[dstr(daysAgo(i))] || 0;
      if (i === 0) todayCount = c;
      weekCount += c;
    }
    s.today = todayCount;
    s.week = weekCount;

    const cutoff = daysAgo(30).setHours(0, 0, 0, 0);
    for (const dk of Object.keys(s.daily)) {
      if (new Date(dk + "T00:00:00").getTime() < cutoff) delete s.daily[dk];
    }
    await writeJSON(F.clicks, clicks);
  });
  res.json({ ok: true });
}));

/* ══════════════════ TELEGRAM NOTIFICATIONS (contact form → Telegram) ══════════════════ */

const TELEGRAM_API = "https://api.telegram.org";

async function readTelegramCfg() {
  const cfg = await readJSON(F.telegram, {});
  return {
    enabled: !!cfg.enabled,
    botToken: String(cfg.botToken || ""),
    chatId: String(cfg.chatId || ""),
  };
}

/* Escape user content for HTML parse_mode */
const escHtml = (s) =>
  String(s || "").replace(/&/g, "&amp;").replace(/</g, "&lt;").replace(/>/g, "&gt;");

async function sendTelegramMessage(cfg, html) {
  const ctrl = new AbortController();
  const t = setTimeout(() => ctrl.abort(), 10000);
  try {
    const r = await fetch(`${TELEGRAM_API}/bot${cfg.botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: cfg.chatId,
        text: html,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: ctrl.signal,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) throw new Error(j.description || `Telegram HTTP ${r.status}`);
    return { ok: true };
  } finally {
    clearTimeout(t);
  }
}

/* Fire-and-forget notification when a new contact message arrives */
async function appendTelegramLog(entry) {
  try {
    await withLock("telegram-log", async () => {
      const store = await readJSON(F.telegramLog, { entries: [] });
      if (!Array.isArray(store.entries)) store.entries = [];
      store.entries.unshift({ time: new Date().toISOString(), ...entry });
      if (store.entries.length > 50) store.entries = store.entries.slice(0, 50);
      await writeJSON(F.telegramLog, store);
    });
  } catch (err) {
    console.error("[telegram] log write failed:", err.message);
  }
}

async function notifyNewContactMessage(msg) {
  try {
    const cfg = await readTelegramCfg();
    if (!cfg.enabled || !cfg.botToken || !cfg.chatId) {
      await appendTelegramLog({
        kind: "contact",
        ok: false,
        skipped: true,
        messageId: msg?.id ?? null,
        name: msg?.name || "",
        error: "telegram disabled or not configured",
      });
      return;
    }
    const dt = new Date().toLocaleString("en-GB", { hour12: false });
    const html = [
      `🔔 <b>New Contact Message</b>`,
      ``,
      `👤 <b>Name:</b> ${escHtml(msg.name)}`,
      msg.phoneNumber ? `📱 <b>Phone:</b> ${escHtml(msg.phoneNumber)}` : null,
      `💬 <b>Message:</b>`,
      `<blockquote expandable>${escHtml(msg.message)}</blockquote>`,
      ``,
      `🕐 <i>${dt}</i>`,
    ]
      .filter(Boolean)
      .join("\n");
    await sendTelegramMessage(cfg, html);
    await appendTelegramLog({
      kind: "contact",
      ok: true,
      messageId: msg?.id ?? null,
      name: msg?.name || "",
    });
  } catch (err) {
    console.error("[telegram] notify failed:", err.message);
    await appendTelegramLog({
      kind: "contact",
      ok: false,
      messageId: msg?.id ?? null,
      name: msg?.name || "",
      error: err.message || "send failed",
    });
  }
}

/* admin: read/save config + send test message */
app.get("/api/admin/telegram", wrap(async (req, res) => {
  if ((await requireAuthAsync(req, res)) === null) return;
  const cfg = await readTelegramCfg();
  const logStore = await readJSON(F.telegramLog, { entries: [] });
  res.json({
    enabled: cfg.enabled,
    chatId: cfg.chatId,
    botTokenSet: !!cfg.botToken,
    botTokenMasked: cfg.botToken ? cfg.botToken.slice(0, 6) + "…" + cfg.botToken.slice(-4) : "",
    log: Array.isArray(logStore.entries) ? logStore.entries : [],
  });
}));

app.get("/api/admin/telegram/log", wrap(async (req, res) => {
  if ((await requireAuthAsync(req, res)) === null) return;
  const logStore = await readJSON(F.telegramLog, { entries: [] });
  res.json({ entries: Array.isArray(logStore.entries) ? logStore.entries : [] });
}));

app.post("/api/admin/telegram", wrap(async (req, res) => {
  if ((await requireAuthAsync(req, res)) === null) return;
  const body = req.body || {};
  const botToken = String(body.botToken ?? "").trim();
  const chatId = String(body.chatId ?? "").trim();
  const enabled = !!body.enabled;
  if (enabled && (!botToken || !chatId)) {
    return res.status(400).json({ error: "botToken and chatId are required to enable" });
  }
  if (botToken && !/^\d{6,}:[A-Za-z0-9_-]{30,}$/.test(botToken)) {
    return res.status(400).json({ error: "botToken doesn't look valid (expected 123456:ABC…)" });
  }
  const prev = await readTelegramCfg();
  const next = {
    enabled,
    botToken: botToken || prev.botToken,
    chatId: chatId || prev.chatId,
  };
  await withLock("telegram", async () => {
    await writeJSON(F.telegram, next);
  });
  res.json({ ok: true });
}));

app.post("/api/admin/telegram/send", wrap(async (req, res) => {
  if ((await requireAuthAsync(req, res)) === null) return;
  const cfg = await readTelegramCfg();
  if (!cfg.botToken || !cfg.chatId) {
    return res.status(400).json({ error: "Save bot token and chat id first" });
  }
  const body = req.body || {};
  const name = String(body.name || "").trim();
  const phoneNumber = String(body.phoneNumber || "").trim();
  const message = String(body.message || "").trim();
  if (!name || !message) {
    return res.status(400).json({ error: "name and message are required" });
  }
  if (name.length > 100 || message.length > 5000) {
    return res.status(400).json({ error: "name or message too long" });
  }
  try {
    const dt = new Date().toLocaleString("en-GB", { hour12: false });
    const html = [
      "✏️ <b>Manual Message</b>",
      "",
      `👤 <b>Name:</b> ${escHtml(name)}`,
      phoneNumber ? `📱 <b>Phone:</b> ${escHtml(phoneNumber)}` : null,
      `💬 <b>Message:</b>`,
      `<blockquote expandable>${escHtml(message)}</blockquote>`,
      "",
      `🕐 <i>${escHtml(dt)}</i>`,
    ]
      .filter(Boolean)
      .join("\n");
    await sendTelegramMessage(cfg, html);
    await appendTelegramLog({ kind: "manual", ok: true, name });
    res.json({ ok: true });
  } catch (err) {
    await appendTelegramLog({
      kind: "manual",
      ok: false,
      name,
      error: err.message || "send failed",
    });
    res.status(502).json({ error: err.message || "Telegram request failed" });
  }
}));

app.post("/api/admin/telegram/test", wrap(async (req, res) => {
  if ((await requireAuthAsync(req, res)) === null) return;
  const cfg = await readTelegramCfg();
  if (!cfg.botToken || !cfg.chatId) {
    return res.status(400).json({ error: "Save bot token and chat id first" });
  }
  try {
    const dt = new Date().toLocaleString("en-GB", { hour12: false });
    await sendTelegramMessage(
      cfg,
      `✅ <b>Test message</b> — portfolio contact notifications are wired up.\n🕐 <i>${dt}</i>`,
    );
    await appendTelegramLog({ kind: "test", ok: true });
    res.json({ ok: true });
  } catch (err) {
    await appendTelegramLog({ kind: "test", ok: false, error: err.message || "send failed" });
    res.status(502).json({ error: err.message || "Telegram request failed" });
  }
}));

/* ── Telegram me endpoint used by the admin UI to verify the chat id (getUpdates → chat ids) */
app.post("/api/admin/telegram/detect-chat", wrap(async (req, res) => {
  if ((await requireAuthAsync(req, res)) === null) return;
  const cfg = await readTelegramCfg();
  const token = String((req.body || {}).botToken || "").trim() || cfg.botToken;
  if (!token) return res.status(400).json({ error: "botToken required" });
  try {
    const ctrl = new AbortController();
    const t = setTimeout(() => ctrl.abort(), 10000);
    const r = await fetch(`${TELEGRAM_API}/bot${token}/getUpdates?limit=10`, { signal: ctrl.signal });
    clearTimeout(t);
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) throw new Error(j.description || `Telegram HTTP ${r.status}`);
    const chats = [];
    for (const u of j.result || []) {
      const m = u.message || u.edited_message || u.channel_post;
      const chat = m && m.chat;
      if (chat && !chats.some((c) => String(c.id) === String(chat.id))) {
        chats.push({ id: String(chat.id), title: chat.first_name ? `${chat.first_name} ${chat.last_name || ""}`.trim() : chat.title || chat.username || "" });
      }
    }
    res.json({ ok: true, chats });
  } catch (err) {
    res.status(502).json({ error: err.message || "Telegram request failed" });
  }
}));

/* ══════════════════ CONTACT MESSAGES ══════════════════ */

const MESSAGE_STATUSES = new Set(["unseen", "seen", "archived"]);

/* was admin/messages.php */
app.all("/api/admin/messages", wrap(async (req, res) => {
  if (req.method === "POST") {
    const allowed = await rateCheck(req, "contact", false);
    if (!allowed) return res.status(429).json({ error: "too many attempts, try again later" });
    const body = req.body || {};
    const name = String(body.name || "").trim();
    const phoneNumber = String(body.phoneNumber || "").trim();
    const message = String(body.message || "").trim();
    if (!name || !message) return res.status(400).json({ error: "name and message are required" });
    if (name.length > 100 || message.length > 5000) return res.status(400).json({ error: "name or message too long" });

    const newMsg = {
      id: 0, name, phoneNumber, message,
      date: new Date().toISOString(), status: "unseen",
    };
    await withLock("messages", async () => {
      const store = await readJSON(F.messages, { messages: [], nextId: 1 });
      if (!store.nextId) store.nextId = 1;
      if (!Array.isArray(store.messages)) store.messages = [];
      newMsg.id = store.nextId++;
      store.messages.unshift(newMsg);
      await writeJSON(F.messages, store);
    });
    notifyNewContactMessage(newMsg); // fire-and-forget
    return res.json({ ok: true });
  }

  if (requireAuth(req, res) === null) return;

  if (req.method === "GET") {
    const store = await readJSON(F.messages, { messages: [] });
    return res.json({ messages: store.messages || [] });
  }
  if (req.method === "PATCH") {
    const body = req.body || {};
    const { id, status } = body;
    if (id == null || !MESSAGE_STATUSES.has(status)) {
      return res.status(400).json({ error: "id and a valid status are required" });
    }
    const store = await readJSON(F.messages, { messages: [] });
    const m = (store.messages || []).find((x) => String(x.id) === String(id));
    if (!m) return res.status(404).json({ error: "message not found" });
    m.status = status;
    await writeJSON(F.messages, store);
    return res.json({ ok: true });
  }
  if (req.method === "DELETE") {
    const body = req.body || {};
    const id = body.id ?? req.query.id;
    if (id == null) return res.status(400).json({ error: "id is required" });
    const store = await readJSON(F.messages, { messages: [] });
    const before = (store.messages || []).length;
    store.messages = (store.messages || []).filter((x) => String(x.id) !== String(id));
    if (store.messages.length === before) return res.status(404).json({ error: "message not found" });
    await writeJSON(F.messages, store);
    return res.json({ ok: true });
  }
  res.status(405).json({ error: "method not allowed" });
}));

/* ══════════════════ ADMIN: projects / skills CRUD ══════════════════ */

/* was admin/projects-admin.php */
app.all("/api/admin/projects-admin", wrap(async (req, res) => {
  if ((await requireAuthAsync(req, res)) === null) return;
  const type = req.query.type || (req.body || {}).type || "web";
  const file = type === "mini" ? PUBLIC_JSON["mini-projects"] : PUBLIC_JSON.projects;

  if (req.method === "GET") {
    const projects = await readJSON(file, []);
    return res.json({ projects });
  }
  const body = req.body || {};
  const projects = await readJSON(file, []);
  const nextId = () => projects.reduce((m, p) => Math.max(m, p.id || 0), 0) + 1;

  if (req.method === "POST") {
    const title = String(body.title || "").trim();
    if (!title) return res.status(400).json({ error: "title is required" });
    const entry = {
      id: nextId(),
      url: String(body.url || "").trim(),
      title,
      description: String(body.description || "").trim(),
      category: Array.isArray(body.category) ? body.category : [],
      image: String(body.image || "").trim(),
      githubUrl: String(body.githubUrl || "").trim() || null,
    };
    projects.push(entry);
    await writeJSON(file, projects);
    return res.json({ ok: true, project: entry });
  }
  if (req.method === "PUT") {
    if (Array.isArray(body.projects)) {
      await writeJSON(file, body.projects);
      return res.json({ ok: true, projects: body.projects });
    }
    const id = body.id;
    if (id == null) return res.status(400).json({ error: "id is required" });
    const p = projects.find((x) => String(x.id) === String(id));
    if (!p) return res.status(404).json({ error: "project not found" });
    if (body.title != null) p.title = String(body.title).trim();
    if (body.url != null) p.url = String(body.url).trim();
    if (body.description != null) p.description = String(body.description).trim();
    if (body.image != null) p.image = String(body.image).trim();
    if (body.githubUrl != null) p.githubUrl = String(body.githubUrl).trim() || null;
    if (Array.isArray(body.category)) p.category = body.category;
    await writeJSON(file, projects);
    return res.json({ ok: true });
  }
  if (req.method === "DELETE") {
    const id = body.id ?? req.query.id;
    if (id == null) return res.status(400).json({ error: "id is required" });
    const before = projects.length;
    const filtered = projects.filter((x) => String(x.id) !== String(id));
    if (filtered.length === before) return res.status(404).json({ error: "project not found" });
    await writeJSON(file, filtered);
    return res.json({ ok: true });
  }
  res.status(405).json({ error: "method not allowed" });
}));

/* was admin/skills-admin.php */
app.all("/api/admin/skills-admin", wrap(async (req, res) => {
  if ((await requireAuthAsync(req, res)) === null) return;
  const file = PUBLIC_JSON.skills;

  if (req.method === "GET") {
    return res.json({ skills: await readJSON(file, []) });
  }
  const body = req.body || {};
  const skills = await readJSON(file, []);
  const nextId = () => skills.reduce((m, s) => Math.max(m, s.id || 0), 0) + 1;

  if (req.method === "POST") {
    const name = String(body.name || "").trim();
    if (!name) return res.status(400).json({ error: "name is required" });
    const entry = { id: nextId(), name, img: String(body.img || "").trim() };
    skills.push(entry);
    await writeJSON(file, skills);
    return res.json({ ok: true, skill: entry });
  }
  if (req.method === "PUT") {
    const id = body.id;
    if (id == null) return res.status(400).json({ error: "id is required" });
    const s = skills.find((x) => String(x.id) === String(id));
    if (!s) return res.status(404).json({ error: "skill not found" });
    if (body.name != null) s.name = String(body.name).trim();
    if (body.img != null) s.img = String(body.img).trim();
    await writeJSON(file, skills);
    return res.json({ ok: true });
  }
  if (req.method === "DELETE") {
    const id = body.id ?? req.query.id;
    if (id == null) return res.status(400).json({ error: "id is required" });
    const before = skills.length;
    const filtered = skills.filter((x) => String(x.id) !== String(id));
    if (filtered.length === before) return res.status(404).json({ error: "skill not found" });
    await writeJSON(file, filtered);
    return res.json({ ok: true });
  }
  res.status(405).json({ error: "method not allowed" });
}));

/* was admin/site-admin.php — site identity / contact / social links.
   Mirrors api/admin/_site-admin.js: same allow-list, same validation, same
   read-modify-write under a lock. */
const SITE_FIELDS = [
  "brand", "email", "phone", "phoneLabel",
  "github", "githubHandle", "linkedin",
  "telegram", "telegramHandle", "instagram", "instagramHandle",
];
const SITE_URL_FIELDS = ["github", "linkedin", "telegram", "instagram"];

function validateSite(next) {
  if (next.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email)) {
    return "email is not a valid address";
  }
  const digits = String(next.phone || "").replace(/[^\d+]/g, "");
  if (digits && !/^\+?\d{7,15}$/.test(digits)) {
    return "phone must be 7-15 digits, optionally starting with +";
  }
  for (const key of SITE_URL_FIELDS) {
    const url = String(next[key] || "");
    if (!url) continue;
    if (!/^https?:\/\//i.test(url)) return `${key} must start with http:// or https://`;
    try { new URL(url); } catch { return `${key} is not a valid URL`; }
  }
  return null;
}

app.all("/api/admin/site-admin", wrap(async (req, res) => {
  if ((await requireAuthAsync(req, res)) === null) return;
  const file = PUBLIC_JSON.site;

  if (req.method === "GET") {
    const site = await readJSON(file, {});
    /* self-hosted: writes land on a real disk, so they always survive */
    return res.json({
      site: site && typeof site === "object" ? site : {},
      storage: "file",
      durable: true,
    });
  }
  if (req.method !== "PUT" && req.method !== "POST") {
    return res.status(405).json({ error: "method not allowed" });
  }

  const body = req.body || {};
  const outcome = await withLock("site", async () => {
    const current = await readJSON(file, {});
    const next = { ...(current && typeof current === "object" ? current : {}) };
    for (const key of SITE_FIELDS) {
      if (body[key] != null) next[key] = String(body[key]).trim();
    }
    const problem = validateSite(next);
    if (problem) return { code: 400, payload: { error: problem } };
    next.updatedAt = new Date().toISOString();
    await writeJSON(file, next);
    return { code: 200, payload: { ok: true, site: next } };
  });
  res.status(outcome.code).json(outcome.payload);
}));

/* ══════════════════ ADMIN: auth + stats ══════════════════ */
/* was admin/auth.php */
app.post("/api/admin/auth", wrap(async (req, res) => {
  await ensureConfig(); // token secret must exist before any login/verify
  const body = req.body || {};
  const username = String(body.username || "").trim();
  const password = String(body.password || "");
  if (!username || !password) return res.status(400).json({ error: "username and password are required" });

  const allowed = await rateCheck(req, "login", false);
  if (!allowed) return res.status(429).json({ error: "too many attempts, try again later" });

  const validUser = timingSafeEq(CONFIG.username || "", username);
  const validPass = timingSafeEq(CONFIG.password_sha256 || "", crypto.createHash("sha256").update(password).digest("hex"));
  if (!validUser || !validPass) {
    const k = `${clientIP(req)}::login`;
    await rateFail(k);
    await new Promise((r) => setTimeout(r, 250)); // brute-force slowdown like PHP usleep
    return res.status(401).json({ error: "invalid username or password" });
  }
  const k = `${clientIP(req)}::login`;
  await rateSuccess(k);
  res.json({ token: issueToken(username), username, expires_in: TOKEN_TTL });
}));

/* was admin/auth-check.php */
app.get("/api/admin/auth-check", wrap(async (req, res) => {
  const payload = await requireAuthAsync(req, res);
  if (payload === null) return;
  res.json({ valid: true, username: payload.u ?? null });
}));

/* was admin/stats.php (full port: visits + clicks + button analytics + deltas) */
app.get("/api/admin/stats", wrap(async (req, res) => {
  if ((await requireAuthAsync(req, res)) === null) return;

  const visits = await readJSON(F.visits, { days: {} });
  const days = visits.days && typeof visits.days === "object" ? visits.days : {};

  const dayTotals = {};
  const pathTotals = {};
  for (const [date, info] of Object.entries(days)) {
    const total = typeof info === "object" ? (info.total || 0) : Number(info) || 0;
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
  const last90 = range(90, dstr);
  const last180 = range(180, dstr);

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

  const online = await readJSON(F.online, {});
  const nowSec = Math.floor(Date.now() / 1000);
  let onlineNow = 0;
  const onlineCountriesMap = {};
  for (const val of Object.values(online)) {
    const seen = typeof val === "object" && val !== null ? val.seen : Number(val);
    if (nowSec - Number(seen) <= 60) {
      onlineNow++;
      const c = typeof val === "object" && val !== null && val.country ? val.country : "UNKNOWN";
      onlineCountriesMap[c] = (onlineCountriesMap[c] || 0) + 1;
    }
  }

  const totalAllTime = Object.values(dayTotals).reduce((s, v) => s + v, 0);
  const todayKey = dstr(today);
  const todayTotal = dayTotals[todayKey] || 0;
  const last7Total = last7.reduce((s, d) => s + d.total, 0);
  const last30Total = last30.reduce((s, d) => s + d.total, 0);
  const thisMonthKey = `${today.getFullYear()}-${pad(today.getMonth() + 1)}`;
  const thisMonthTotal = monthTotals[thisMonthKey] || 0;
  const thisYearTotal = yearTotals[String(today.getFullYear())] || 0;

  /* unique people (sessionIds) vs raw page views */
  const dayVisitorSets = {};
  for (const [date, info] of Object.entries(days)) {
    if (info && typeof info === "object" && Array.isArray(info.visitors)) {
      dayVisitorSets[date] = new Set(info.visitors.map(String));
    }
  }
  const uniqueOn = (dates) => {
    const s = new Set();
    for (const d of dates) {
      const set = dayVisitorSets[d];
      if (set) for (const id of set) s.add(id);
    }
    return s.size;
  };
  const datesBetween = (n) => {
    const out = [];
    for (let i = n - 1; i >= 0; i--) out.push(dstr(daysAgo(i)));
    return out;
  };
  const todayUnique = uniqueOn([todayKey]);
  const yesterdayUnique = uniqueOn([dstr(daysAgo(1))]);
  const last7Unique = uniqueOn(datesBetween(7));
  const last30Unique = uniqueOn(datesBetween(30));
  const allTimeUnique = uniqueOn(Object.keys(dayVisitorSets));
  const thisMonthUnique = uniqueOn(
    Object.keys(dayVisitorSets).filter((d) => d.startsWith(thisMonthKey))
  );
  const thisYearUnique = uniqueOn(
    Object.keys(dayVisitorSets).filter((d) =>
      d.startsWith(String(today.getFullYear()))
    )
  );

  /* hourly visits for the last 24 hours (visits.days[d].hours) */
  const hourly24 = [];
  const now = new Date();
  for (let i = 23; i >= 0; i--) {
    const h = new Date(now.getTime() - i * 3600 * 1000);
    const dk = dstr(h);
    const hk = pad(h.getHours());
    const dayInfo = days[dk];
    const hv = dayInfo && dayInfo.hours && typeof dayInfo.hours === "object" ? dayInfo.hours[hk] || 0 : 0;
    hourly24.push({ hour: `${dk} ${hk}:00`, total: hv });
  }
  /* yesterday total for the range cards */
  const yesterdayTotal = dayTotals[dstr(new Date(today.getTime() - 86400000))] || 0;

  const topPaths = Object.entries(pathTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([path, total]) => ({ path, total }));

  /* clicks */
  const clicks = await readJSON(F.clicks, { events: [], summary: {} });
  const clickEvents = Array.isArray(clicks.events) ? clicks.events : [];
  const clickSummary = clicks.summary && typeof clicks.summary === "object" ? Object.values(clicks.summary) : [];

  let totalClicks = 0, todayClicks = 0, weekClicks = 0;
  for (const e of clickSummary) {
    totalClicks += e.total || 0;
    todayClicks += e.today || 0;
    weekClicks += e.week || 0;
  }
  const topClickItems = [...clickSummary].sort((a, b) => (b.total || 0) - (a.total || 0)).slice(0, 15);

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

  const buttonEvents = clickEvents.filter((e) => BUTTON_TYPES.has(e.targetType || ""));
  const buttonSummary = [];
  let buttonTotalClicks = 0, buttonTodayClicks = 0, buttonWeekClicks = 0;
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
  const buttonRecentClicks = buttonEvents.slice(-20).reverse().map((e) => ({
    time: e.time || "",
    buttonId: e.targetId || "",
    label: e.targetLabel || e.targetId || "",
    page: e.path || "/",
    sessionId: e.sessionId || "",
  }));

  /* deltas */
  const pctDelta = (cur, prev) => (prev <= 0 ? (cur > 0 ? 100 : 0) : Math.round(((cur - prev) / prev) * 100));
  const todayDelta = pctDelta(todayTotal, yesterdayTotal);
  let prev7Total = 0;
  for (let i = 13; i >= 7; i--) prev7Total += dayTotals[dstr(daysAgo(i))] || 0;
  const weekDelta = pctDelta(last7Total, prev7Total);
  const prevMonthD = new Date(today.getFullYear(), today.getMonth() - 1, 1);
  const prevMonthKey = `${prevMonthD.getFullYear()}-${pad(prevMonthD.getMonth() + 1)}`;
  const monthDelta = pctDelta(thisMonthTotal, monthTotals[prevMonthKey] || 0);
  const prevYearKey = String(today.getFullYear() - 1);
  const yearDelta = pctDelta(thisYearTotal, yearTotals[prevYearKey] || 0);

  /* custom date range (?from=YYYY-MM-DD&to=YYYY-MM-DD) */
  const qFrom = String(req.query.from || "").slice(0, 10);
  const qTo = String(req.query.to || "").slice(0, 10);
  let custom = null;
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
    custom = { from: qFrom, to: qTo, days: out, total: out.reduce((a, d) => a + d.total, 0) };
  }

  /* country distribution */
  const countryTotals = {};
  const countryTodayTotals = {};
  for (const [date, info] of Object.entries(days)) {
    if (typeof info === "object" && info.countries && typeof info.countries === "object") {
      for (const [c, count] of Object.entries(info.countries)) {
        countryTotals[c] = (countryTotals[c] || 0) + (Number(count) || 0);
        if (date === todayKey) {
          countryTodayTotals[c] = (countryTodayTotals[c] || 0) + (Number(count) || 0);
        }
      }
    }
  }
  const topCountries = formatCountryStats(countryTotals, totalAllTime);
  const todayCountries = formatCountryStats(countryTodayTotals, todayTotal);
  const onlineCountries = formatCountryStats(onlineCountriesMap, onlineNow);

  res.json({
    onlineNow,
    onlineCountries,
    today: todayTotal,
    yesterday: yesterdayTotal,
    todayUnique,
    yesterdayUnique,
    last7Unique,
    last30Unique,
    thisMonthUnique,
    thisYearUnique,
    totalUnique: allTimeUnique,
    todayDelta, weekDelta, monthDelta, yearDelta,
    last7Days: last7,
    last7Total,
    last30Days: last30,
    last30Total,
    last90Days: last90,
    last180Days: last180,
    hourly24,
    thisMonth: thisMonthTotal,
    thisYear: thisYearTotal,
    monthly: last12Months,
    yearly,
    totalAllTime,
    topPaths,
    topCountries,
    todayCountries,
    totalCountriesCount: topCountries.length,
    totalClicks, todayClicks, weekClicks,
    topClickItems,
    clicksByType,
    clickTrend,
    recentClicks,
    custom,
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
}));

/* ══════════════════ ADMIN: MOOD REVIEW (quality control for mood-search) ══════════════════ */

/* was part of the offline pipeline UI — lists every song with its LLM mood vector,
   lyrics status and lets the admin hand-fix moods/summary. Writes music-database.json. */
app.get("/api/admin/moods", wrap(async (req, res) => {
  if ((await requireAuthAsync(req, res)) === null) return;
  const db = await loadMusicDB();
  const rows = (db.songs || []).map((s) => ({
    id: s.id, name: s.name, artist: s.artist,
    lyricsStatus: s.lyricsStatus || (s.lyrics ? "present" : "none"),
    summary: s.lyricsSummary || "",
    audioMoodTag: s.audioMoodTag || "",
    moods: s.moods || {},
    hasAudio: !!(s.analysis && s.analysis.vibe),
  }));
  res.json({ songs: rows, dims: MOOD_DIMS });
}));

app.post("/api/admin/moods", wrap(async (req, res) => {
  if ((await requireAuthAsync(req, res)) === null) return;
  const { id, moods, summary, audioMoodTag } = req.body || {};
  if (id == null) return res.status(400).json({ error: "id is required" });
  const file = path.join(PUBLIC_DIR, "api", "music-database.json");
  const db = await readJSON(file, { songs: [] });
  const song = (db.songs || []).find((x) => String(x.id) === String(id));
  if (!song) return res.status(404).json({ error: "song not found" });
  if (moods && typeof moods === "object") {
    const clean = {};
    for (const [k, v] of Object.entries(moods)) {
      const key = String(k).trim().toLowerCase();
      if (!MOOD_DIMS.includes(key)) continue;
      const f = parseFloat(v);
      if (!isNaN(f) && f >= 0.05) clean[key] = Math.max(0, Math.min(1, f));
    }
    song.moods = clean;
  }
  if (typeof summary === "string") song.lyricsSummary = summary.slice(0, 500);
  if (typeof audioMoodTag === "string") song.audioMoodTag = audioMoodTag.slice(0, 60);
  await withLock("music-db", async () => {
    await writeJSON(file, db);
  });
  res.json({ ok: true });
}));

/* ══════════════════ EMBEDDED PROJECT BACKENDS (was Digikala/Ubisoft api.php) ══════════════════ */

/* Digikala: serves its product JSONs (fixes absolute /backend/... image paths) */
const DK_DIR = path.join(PUBLIC_DIR, "Projects", "Web-Project", "Digikala", "backend");
const DK_MAP = {
  "best-products": "best products.json",
  "offer-products": "offer-products.json",
  "market-products-on-offer": "market-products-on-offer.json",
  "part-products-1-4": "part-products-1-4.json",
  "part-products-5-8": "part-products-5-8.json",
  "offer-all-products": "offer-all-products.json",
  "laptop-category": "laptop-category.json",
};
function fixImagePaths(node) {
  if (Array.isArray(node)) { node.forEach(fixImagePaths); return; }
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if ((key === "image" || key === "img") && typeof value === "string" && value.startsWith("/")) {
        node[key] = value.replace(/^\/+/, "");
      } else if (value && typeof value === "object") {
        fixImagePaths(value);
      }
    }
  }
}
app.get("/api/digikala", wrap(async (req, res) => {
  const type = String(req.query.type || "");
  const file = DK_MAP[type];
  if (!file) return res.status(400).json({ error: "Invalid data type", valid_types: Object.keys(DK_MAP) });
  const data = await readJSON(path.join(DK_DIR, file), null);
  if (data === null) return res.status(404).json({ error: "Data file not found", file });
  fixImagePaths(data);
  res.json(data);
}));

/* Ubisoft: top-slider games data */
const UB_DIR = path.join(PUBLIC_DIR, "Projects", "Web-Project", "Ubisoft", "backend");
app.get("/api/ubisoft", wrap(async (req, res) => {
  const type = String(req.query.type || "first");
  const file = type === "second" ? "top slider games data img second.json" : "top-slider-games-data.json";
  const data = await readJSON(path.join(UB_DIR, file), null);
  if (data === null) return res.status(404).json({ error: "Data not found", file });
  if (Array.isArray(data)) {
    for (const item of data) {
      if (item && typeof item === "object" && typeof item.image === "string" && item.image.startsWith("/")) {
        item.image = item.image.replace(/^\/+/, "");
      }
    }
  }
  res.json(data);
}));

/* ══════════════════ PROJECT DIST UPLOAD (zip) ══════════════════ */
import { registerUploadRoutes } from "./server-upload.js";
registerUploadRoutes(app, { PUBLIC_DIR, requireAuthAsync, wrap });

/* ══════════════════ BLOG (posts + cover images) ══════════════════ */
import { registerBlogRoutes, blogCoverGuard } from "./server-blog.js";
registerBlogRoutes(app, { PUBLIC_JSON, readJSON, writeJSON, requireAuthAsync, wrap, ROOT });

/* ══════════════════ ADMIN FILE MANAGER (Database tab) ══════════════════ */

function resolveInRoot(rel) {
  const rootAbs = path.resolve(ROOT);
  const clean = String(rel || "").replace(/\\/g, "/").replace(/^\/+/, "");
  const abs = path.resolve(rootAbs, "." + (clean ? "/" + clean : ""));
  if (abs === rootAbs) return { abs, rel: "" };
  if (!abs.startsWith(rootAbs + path.sep)) return null;
  return { abs, rel: clean };
}

app.get("/api/admin/fs-collections", wrap(async (req, res) => {
  if ((await requireAuthAsync(req, res)) === null) return;
  const blog = await readJSON(PUBLIC_JSON.blog, { posts: [] });
  const projects = await readJSON(PUBLIC_JSON.projects, []);
  const mini = await readJSON(PUBLIC_JSON["mini-projects"], []);
  const skills = await readJSON(PUBLIC_JSON.skills, []);
  const messages = await readJSON(F.messages, []);
  const visits = await readJSON(F.visits, {});
  const clicks = await readJSON(F.clicks, []);
  const moods = await readJSON(path.join(ADMIN_DATA, "moods.json"), {});
  const telegram = await readJSON(F.telegram, {});
  const sabzUsers = await readJSON(path.join(ADMIN_DATA, "sabz-users.json"), []);
  const sabzComments = await readJSON(path.join(ADMIN_DATA, "sabz-comments.json"), []);

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
  res.json({ collections });
}));

app.get("/api/admin/fs", wrap(async (req, res) => {
  if ((await requireAuthAsync(req, res)) === null) return;
  const r = resolveInRoot(req.query.path);
  if (!r) return res.status(400).json({ error: "path escapes project root" });
  let st;
  try { st = await fsp.stat(r.abs); } catch { return res.status(404).json({ error: "not found" }); }
  if (!st.isDirectory()) return res.status(400).json({ error: "not a directory" });
  const dirents = await fsp.readdir(r.abs, { withFileTypes: true }).catch(() => []);
  const items = [];
  for (const d of dirents) {
    let s = null;
    try { s = await fsp.stat(path.join(r.abs, d.name)); } catch { /* ignore */ }
    items.push({
      name: d.name,
      type: d.isDirectory() ? "dir" : "file",
      size: s ? s.size : 0,
      mtime: s ? Math.round(s.mtimeMs) : 0,
    });
  }
  items.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
  res.json({ path: r.rel, root: "project-root", items });
}));

app.get("/api/admin/fs-size", wrap(async (req, res) => {
  if ((await requireAuthAsync(req, res)) === null) return;
  const r = resolveInRoot(req.query.path);
  if (!r) return res.status(400).json({ error: "path escapes project root" });
  let total = 0, files = 0, capped = false;
  const walk = async (dir, depth) => {
    if (capped || depth > 14) return;
    const dirents = await fsp.readdir(dir, { withFileTypes: true }).catch(() => []);
    for (const d of dirents) {
      if (capped) return;
      const full = path.join(dir, d.name);
      if (d.isDirectory()) { if (d.name !== ".git") await walk(full, depth + 1); }
      else { try { total += (await fsp.stat(full)).size; files++; } catch { /* ignore */ } }
      if (files > 50000) { capped = true; return; }
    }
  };
  if ((await fsp.stat(r.abs)).isDirectory()) await walk(r.abs, 0);
  else { try { total = (await fsp.stat(r.abs)).size; files = 1; } catch { /* ignore */ } }
  res.json({ path: r.rel, size: total, files, capped });
}));

app.post("/api/admin/fs-delete", wrap(async (req, res) => {
  if ((await requireAuthAsync(req, res)) === null) return;
  const body = req.body || {};
  const r = resolveInRoot(body.path);
  if (!r) return res.status(400).json({ error: "path escapes project root" });
  if (!r.rel) return res.status(400).json({ error: "refusing to delete the project root itself" });

  const PROTECTED_SYSTEM_PATHS = [
    ".git", "src", "api", "node_modules", "dist", "tools",
    "server.js", "server-blog.js", "server-upload.js", "package.json",
    "package-lock.json", "vite.config.js", "vite-plugin-mock-api.js",
    "eslint.config.js", "index.html", "vercel.json"
  ];
  const isProtected = PROTECTED_SYSTEM_PATHS.some(
    (p) => r.rel === p || r.rel.startsWith(p + "/") || r.rel.startsWith(".env")
  );
  if (isProtected) {
    return res.status(403).json({ error: "refusing to delete protected system file/directory" });
  }

  let st;
  try { st = await fsp.stat(r.abs); } catch { return res.status(404).json({ error: "not found" }); }
  await fsp.rm(r.abs, { recursive: true, force: true });
  res.json({ ok: true, deleted: r.rel, wasDir: st.isDirectory() });
}));

/* ══════════════════ CHANGE PASSWORD (Security tab) ══════════════════ */

/* Parity with api/admin/_password.js. The tab POSTs here; without a route the
   SPA fallback answered with index.html and the form reported a parse error. */
app.post("/api/admin/password", wrap(async (req, res) => {
  if ((await requireAuthAsync(req, res)) === null) return;
  const body = req.body || {};
  const currentPassword = String(body.currentPassword ?? "");
  const newPassword = String(body.newPassword ?? "");

  if (!currentPassword || !newPassword) {
    return res.status(400).json({ error: "currentPassword and newPassword are required" });
  }
  if (newPassword.length < 6) {
    return res.status(400).json({ error: "new password must be at least 6 characters" });
  }
  const allowed = await rateCheck(req, "password", false);
  if (!allowed) return res.status(429).json({ error: "too many attempts, try again later" });

  const currentHash = crypto.createHash("sha256").update(currentPassword).digest("hex");
  if (!timingSafeEq(CONFIG.password_sha256 || "", currentHash)) {
    await rateFail(`${clientIP(req)}::password`);
    await new Promise((r) => setTimeout(r, 250));
    return res.status(401).json({ error: "current password is incorrect" });
  }

  const hashed = crypto.createHash("sha256").update(newPassword).digest("hex");
  CONFIG.password_sha256 = hashed;
  CONFIG.token_version = (CONFIG.token_version || 0) + 1; // invalidate old tokens
  await writeJSON(F.config, CONFIG);

  res.json({
    ok: true,
    username: CONFIG.username,
    env: { name: "VERCEL_ADMIN_PASSWORD_SHA256", value: hashed },
    token: issueToken(CONFIG.username),
    expires_in: TOKEN_TTL,
    ephemeral: false,
  });
}));

/* ══════════════════ RESET THROWAWAY DATA (Database tab) ══════════════════ */

/* Parity with api/admin/_reset.js. Unknown to the Node backend before, so the
   panel's "reset demo database" button 404'd. Sabz-Learn's stores are not
   routed on this backend, so only the visit/click stores exist to wipe. */
app.post("/api/admin/reset", wrap(async (req, res) => {
  if ((await requireAuthAsync(req, res)) === null) return;
  const target = String((req.body || {}).target || "sabz").toLowerCase();
  const cleared = [];
  const wipe = async (file, label) => {
    try {
      await fsp.unlink(file);
      cleared.push(label);
    } catch {
      /* already gone */
    }
  };
  if (target === "sabz" || target === "all") {
    for (const f of ["sabz-users.json", "sabz-comments.json"]) {
      await wipe(path.join(ADMIN_DATA, f), f);
    }
  }
  if (target === "visits" || target === "all") {
    await wipe(F.visits, "visits.json");
    await wipe(F.online, "online.json");
    await wipe(F.clicks, "clicks.json");
  }
  res.json({ ok: true, target, cleared });
}));

/* ══════════════════ STATIC ══════════════════ */

/* Uploaded covers are user-supplied files served from our own origin, so the
   shared guard refuses anything scriptable in that directory (an uploaded SVG
   can carry <script>; it ran on this origin in a Chrome probe). Other SVGs
   elsewhere in /assets are hand-authored and untouched. */
app.use("/assets/Blog", blogCoverGuard);

/* embedded showcase projects (static) */
app.use("/Projects", express.static(path.join(PUBLIC_DIR, "Projects"), { maxAge: "1h" }));
/* misc public assets still referenced at runtime (previews, fonts, api JSON) */
app.use("/assets", express.static(path.join(PUBLIC_DIR, "assets"), { maxAge: "1h" }));
app.use("/api", express.static(path.join(PUBLIC_DIR, "api"), { maxAge: 0 })); // raw .json files

/* built SPA */
app.use(express.static(DIST, { maxAge: "1h", index: "index.html" }));

/* SPA fallback (express 5: named wildcard) — deep links like /admin/projects must
   still resolve asset paths (base './') by serving index.html ONLY for non-asset paths */
app.get(/^(?!\/api\/).*/, (req, res) => {
  if (/\.[a-z0-9]+$/i.test(req.path) && !fs.existsSync(path.join(DIST, req.path))) {
    // deep-linked relative asset (base './' + SPA route like /admin/projects)
    // → progressively strip leading segments until the file exists in dist
    const segs = req.path.split("/").filter(Boolean);
    for (let i = 1; i < segs.length; i++) {
      const cand = segs.slice(i).join("/");
      if (fs.existsSync(path.join(DIST, cand)) && fs.statSync(path.join(DIST, cand)).isFile()) {
        return res.redirect(301, "/" + cand);
      }
    }
    return res.redirect(301, "/");
  }
  const index = path.join(DIST, "index.html");
  if (fs.existsSync(index)) return res.sendFile(index);
  res.status(503).send("dist/ not built yet — run: npm run build");
});

app.listen(PORT, () => {
  console.log(`portfolio server → http://localhost:${PORT}`);
});
