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

/* ── config from environment (parity with data/config.json on self-host) ── */
export function getConfig() {
  return {
    username: process.env.VERCEL_ADMIN_USERNAME || "",
    password_sha256: process.env.VERCEL_ADMIN_PASSWORD_SHA256 || "",
    secret: process.env.VERCEL_ADMIN_SECRET || "",
    token_version: Number(process.env.VERCEL_ADMIN_TOKEN_VERSION || 0),
  };
}

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
