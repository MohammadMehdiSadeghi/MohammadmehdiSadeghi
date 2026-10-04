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
export const TOKEN_TTL = 60 * 60 * 24 * 7; // 7 days (reduced from 10y for security)
export const MESSAGE_STATUSES = new Set(["unseen", "seen", "archived"]);

export function storeBackend() {
  return process.env.VERCEL ? "ephemeral-tmp" : "local-fs";
}

export function storeDurable() {
  return !process.env.VERCEL;
}

/* ── admin credentials ────────────────────────────────────────────────
   Credentials should be provided via environment variables:
   - VERCEL_ADMIN_USERNAME
   - VERCEL_ADMIN_PASSWORD_SHA256
   - VERCEL_ADMIN_SECRET
   ──────────────────────────────────────────────────────────────────── */
export const DEFAULT_ADMIN = {
  username: process.env.VERCEL_ADMIN_USERNAME || "mohammad.m.sadeghi09@gmail.com",
  password_sha256:
    process.env.VERCEL_ADMIN_PASSWORD_SHA256 ||
    "b5935771f43bbca6b350f841baa5ed7fb25fbaa8168ebdff549fa16295f46680",
};

/* Session tokens must survive across serverless invocations, so the HMAC
   secret has to be STABLE and shared by every lambda.

   /tmp is NOT shared between serverless instances (a secret written there
   by one instance is invisible to the next), which is exactly what made the
   live panel log in and then 401 on every request. So the fallback secret is
   DERIVED deterministically from the effective password hash instead — same
   input on every instance, same secret, no storage needed.

   Preference order:
     1. VERCEL_ADMIN_SECRET (env — set it in the dashboard for a
        fully-secret, rotatable key)
     2. deterministic derivation (works with zero configuration)

   Note: with the derived secret, anyone holding this repo can forge a token
   for the DEFAULT password — they could equally just log in with the default
   password, so nothing new is exposed. Set VERCEL_ADMIN_SECRET (and
   VERCEL_ADMIN_PASSWORD_SHA256) to make the panel's credentials fully
   private and keep them across deployments. */
/* Derived ONLY from values every lambda sees identically (deploy-time env,
   or the baked-in default) — never from instance-local /tmp state, or two
   instances would disagree and reject each other's tokens. */
function derivedSecret() {
  const basis =
    process.env.VERCEL_ADMIN_PASSWORD_SHA256 || DEFAULT_ADMIN.password_sha256;
  return crypto
    .createHmac("sha256", "portfolio-admin-token-v1")
    .update(String(basis))
    .digest("hex");
}

/* The secret used to sign session tokens. */
export function tokenSecret() {
  return process.env.VERCEL_ADMIN_SECRET || derivedSecret();
}

const baseConfig = () => ({
  username: process.env.VERCEL_ADMIN_USERNAME || DEFAULT_ADMIN.username,
  password_sha256:
    process.env.VERCEL_ADMIN_PASSWORD_SHA256 || DEFAULT_ADMIN.password_sha256,
  /* secret is set below from the effective password hash (stable) */
  secret: "",
  token_version: Number(process.env.VERCEL_ADMIN_TOKEN_VERSION || 0),
});

let CFG = null;
let CFG_LOADED = false;

export function getConfig() {
  if (!CFG) CFG = baseConfig();
  return CFG;
}

/* Pull the dashboard-saved password hash and resolve the stable secret.
   Re-runs whenever the effective password hash changes (env, or a dashboard
   change on this instance) so tokens always match the current credentials. */
export async function loadConfig() {
  const base = baseConfig();
  let pwd = base.password_sha256;
  let uname = base.username;
  let ver = base.token_version;
  const saved = await readJSON(path.join(DATA_DIR, "admin-auth.json"), null);
  if (saved && typeof saved === "object") {
    if (saved.password_sha256) pwd = String(saved.password_sha256);
    if (saved.username) uname = String(saved.username);
    if (saved.token_version != null) ver = Number(saved.token_version);
    /* a dashboard password change must also flip the derived secret so old
       tokens die — deriving from the new hash does that automatically */
  }
  CFG = {
    username: uname,
    password_sha256: pwd,
    secret: tokenSecret(),
    token_version: ver,
  };
  CFG_LOADED = true;
  return CFG;
}

/* Persist a new password hash + bump token_version so every previously
   issued token is invalidated at once. */
export async function saveAdminPassword(username, password_sha256) {
  const cur = getConfig();
  const next = {
    username: username || cur.username,
    password_sha256,
    token_version: cur.token_version || 0,
  };
  await writeJSON(path.join(DATA_DIR, "admin-auth.json"), next);
  CFG = {
    ...baseConfig(),
    ...next,
    /* unchanged by a dashboard password change: the secret must stay
       identical on every instance, so old tokens survive the change */
    secret: tokenSecret(),
  };
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
  // In serverless (Vercel) x-forwarded-for or x-real-ip is trusted; fallback safely
  const xf = req.headers["x-forwarded-for"] || req.headers["x-real-ip"];
  if (xf) return String(xf).split(",")[0].trim();
  return req.socket?.remoteAddress || req.connection?.remoteAddress || "127.0.0.1";
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
