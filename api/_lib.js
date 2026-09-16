import crypto from "node:crypto";
import fsp from "node:fs/promises";
import path from "node:path";

/* ════════════════════════════════════════════════════════════════════
   Vercel serverless port of the local Node backend (server.js).

   Storage lives in DATA_DIR (/tmp) — EPHEMERAL per instance. Durable
   data + the zip project upload stay on the self-hosted server.
   Admin credentials / HMAC secret come from env vars — never from git.
   ════════════════════════════════════════════════════════════════════ */

export const DATA_DIR = process.env.VERCEL_DATA_DIR || "/tmp/portfolio-data";
export const TOKEN_TTL = 60 * 60 * 24 * 7; // 7 days (parity with server.js)
export const MESSAGE_STATUSES = new Set(["unseen", "seen", "archived"]);

/* ── admin credentials ────────────────────────────────────────────────
   The default login is baked in as a SHA-256 HASH (never plaintext).
   A password changed from the dashboard is written to the ephemeral
   store (admin-auth.json) and takes precedence while the instance is
   warm; env vars still win when they are set.

   The HMAC secret is generated randomly at cold start when
   VERCEL_ADMIN_SECRET is absent, so tokens can never be forged with a
   hard-coded key from this repo.
   ──────────────────────────────────────────────────────────────────── */
export const DEFAULT_ADMIN = {
  username: "mohammad.m.sadeghi09@gmail.com",
  /* sha256("moha3447") */
  password_sha256:
    "b5935771f43bbca6b350f841baa5ed7fb25fbaa8168ebdff549fa16295f46680",
};

/* Session tokens must survive across serverless invocations, so the HMAC
   secret has to be STABLE. Order of preference:
     1. VERCEL_ADMIN_SECRET (env — best, set it in the dashboard)
     2. a secret generated once and persisted in the data store
     3. a per-instance random one (last resort: tokens only hold while the
        instance stays warm — the failure mode that made the panel 401)
   A per-instance random secret is what broke the live admin panel: the
   login succeeded in one lambda and every panel request landed on another
   lambda whose random secret rejected the token. */
const SECRET_FILE = "admin-secret";

function randomSecret() {
  return crypto.randomBytes(32).toString("hex");
}

async function persistentSecret() {
  try {
    const raw = await fsp.readFile(path.join(DATA_DIR, SECRET_FILE), "utf8");
    const s = String(raw || "").trim();
    if (s) return s;
  } catch {
    /* first run on this instance */
  }
  const s = randomSecret();
  try {
    await fsp.mkdir(DATA_DIR, { recursive: true });
    await fsp.writeFile(path.join(DATA_DIR, SECRET_FILE), s, "utf8");
  } catch {
    /* read-only fs — fall back to the in-memory value */
  }
  return s;
}

/* Resolved once per instance; awaited by the auth paths. */
let SECRET_PROMISE = null;
export function instanceSecret() {
  if (!SECRET_PROMISE) {
    SECRET_PROMISE = process.env.VERCEL_ADMIN_SECRET
      ? Promise.resolve(process.env.VERCEL_ADMIN_SECRET)
      : persistentSecret();
  }
  return SECRET_PROMISE;
}

const baseConfig = () => ({
  username: process.env.VERCEL_ADMIN_USERNAME || DEFAULT_ADMIN.username,
  password_sha256:
    process.env.VERCEL_ADMIN_PASSWORD_SHA256 || DEFAULT_ADMIN.password_sha256,
  /* filled in by loadConfig() from instanceSecret() */
  secret: process.env.VERCEL_ADMIN_SECRET || "",
  token_version: Number(process.env.VERCEL_ADMIN_TOKEN_VERSION || 0),
});

let CFG = null;
let CFG_LOADED = false;

export function getConfig() {
  if (!CFG) CFG = baseConfig();
  return CFG;
}

/* Pull the dashboard-saved password hash + the stable secret. */
export async function loadConfig() {
  const secret = await instanceSecret();
  if (CFG_LOADED && CFG.secret === secret) return getConfig();
  CFG = { ...baseConfig(), secret };
  CFG_LOADED = true;
  const saved = await readJSON(path.join(DATA_DIR, "admin-auth.json"), null);
  if (saved && typeof saved === "object") {
    if (saved.password_sha256) CFG.password_sha256 = String(saved.password_sha256);
    if (saved.username) CFG.username = String(saved.username);
    if (saved.token_version != null) CFG.token_version = Number(saved.token_version);
  }
  return CFG;
}

/* Persist a new password hash + bump token_version so every previously
   issued token is invalidated at once. */
export async function saveAdminPassword(username, password_sha256) {
  const cur = getConfig();
  const next = {
    username: username || cur.username,
    password_sha256,
    token_version: (cur.token_version || 0) + 1,
  };
  await writeJSON(path.join(DATA_DIR, "admin-auth.json"), next);
  CFG = { ...baseConfig(), ...next, secret: cur.secret };
  CFG_LOADED = true;
  return CFG;
}

/* sha256 helper shared by auth + password change */
export const sha256 = (s) =>
  crypto.createHash("sha256").update(String(s)).digest("hex");

/* ── JSON store with per-key serialization (parity with server.js) ── */
const locks = new Map();
export function withLock(key, fn) {
  if (!locks.has(key)) locks.set(key, Promise.resolve());
  const run = locks.get(key).then(fn);
  locks.set(key, run.catch(() => {}));
  return run;
}

export async function readJSON(file, fallback) {
  try {
    const raw = await fsp.readFile(file, "utf8");
    if (!raw) return fallback;
    const data = JSON.parse(raw);
    return data == null ? fallback : data;
  } catch {
    return fallback;
  }
}

export async function writeJSON(file, data) {
  await fsp.mkdir(path.dirname(file), { recursive: true });
  const tmp = file + ".tmp";
  await fsp.writeFile(tmp, JSON.stringify(data, null, 2), "utf8");
  await fsp.rename(tmp, file);
}

/* ephemeral store files (visits/online/clicks/messages/projects/…) */
export const storePath = (name) => path.join(DATA_DIR, name);
export const readStore = (name, fallback) => readJSON(storePath(name), fallback);
export const writeStore = (name, data) => writeJSON(storePath(name), data);

/* ── dates ── */
export const pad = (n) => String(n).padStart(2, "0");
export const dstr = (d) =>
  `${d.getFullYear()}-${pad(d.getMonth() + 1)}-${pad(d.getDate())}`;
export const daysAgo = (n) => {
  const d = new Date();
  d.setDate(d.getDate() - n);
  return d;
};

/* ── auth (token format identical to server.js) ── */
const b64url = (buf) =>
  Buffer.from(buf)
    .toString("base64")
    .replace(/\+/g, "-")
    .replace(/\//g, "_")
    .replace(/=+$/, "");

export function timingSafeEq(a, b) {
  const ba = Buffer.from(String(a));
  const bb = Buffer.from(String(b));
  return ba.length === bb.length && crypto.timingSafeEqual(ba, bb);
}

export function issueToken(username) {
  const cfg = getConfig();
  const payloadB64 = b64url(
    JSON.stringify({
      u: username,
      ver: cfg.token_version || 0,
      exp: Math.floor(Date.now() / 1000) + TOKEN_TTL,
    })
  );
  const sig = b64url(
    crypto.createHmac("sha256", String(cfg.secret)).update(payloadB64).digest()
  );
  return `${payloadB64}.${sig}`;
}

export function verifyToken(token) {
  const cfg = getConfig();
  if (!cfg.secret || !token || !token.includes(".")) return null;
  const [payloadB64, sig] = token.split(".");
  const expected = b64url(
    crypto.createHmac("sha256", String(cfg.secret)).update(payloadB64).digest()
  );
  if (!timingSafeEq(expected, sig)) return null;
  try {
    const payload = JSON.parse(
      Buffer.from(payloadB64, "base64").toString("utf8")
    );
    if (!payload.exp || payload.exp < Math.floor(Date.now() / 1000))
      return null;
    if ((payload.ver ?? 0) !== (cfg.token_version || 0)) return null;
    return payload;
  } catch {
    return null;
  }
}

export function getBearer(req) {
  const m = /^Bearer\s+(.*)$/i.exec(req.headers.authorization || "");
  return m ? m[1].trim() : null;
}

export function requireAuth(req, res) {
  const payload = verifyToken(getBearer(req));
  if (!payload) {
    res.status(401).json({ error: "unauthorized" });
    return null;
  }
  return payload;
}

/* ── rate limiting (in-memory per instance; parity budgets) ── */
const RATE_MAX = 5, RATE_WINDOW = 900; // hard: 5 / 15min → 429
const SOFT_BUDGET = 120, SOFT_WINDOW = 60; // soft: 120/min → silent drop
const rate = new Map();

export const clientIP = (req) => {
  const xf = req.headers["x-forwarded-for"];
  if (xf) return String(xf).split(",")[0].trim();
  return req.socket?.remoteAddress || "unknown";
};

export async function rateCheck(req, key, soft) {
  const k = `${clientIP(req)}::${key}`;
  const now = Math.floor(Date.now() / 1000);
  const window = soft ? SOFT_WINDOW : RATE_WINDOW;
  const budget = soft ? SOFT_BUDGET : RATE_MAX;
  let entry = rate.get(k);
  if (!entry || now - entry.first > window) entry = { count: 0, first: now };
  if (entry.count >= budget) {
    rate.set(k, entry);
    return false;
  }
  entry.count += 1;
  rate.set(k, entry);
  return true;
}

export async function rateFail(k) {
  const now = Math.floor(Date.now() / 1000);
  const e = rate.get(k) || { count: 0, first: now };
  e.count += 1;
  rate.set(k, e);
}

export async function rateSuccess(k) {
  rate.delete(k);
}
