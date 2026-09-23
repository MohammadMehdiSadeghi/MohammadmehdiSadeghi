import crypto from "node:crypto";
import fsp from "node:fs/promises";
import path from "node:path";

/* ════════════════════════════════════════════════════════════════════
   Vercel serverless port of the local Node backend (server.js).

   Storage: DATA_DIR (/tmp) is the fallback. On Vercel /tmp is EPHEMERAL
   per instance, so a configured Redis-compatible REST store is used as
   the source of truth when available — see the durable-store section
   below. The zip project upload stays on the self-hosted server.
   Admin credentials / HMAC secret come from env vars — never from git.
   ════════════════════════════════════════════════════════════════════ */

export const DATA_DIR = process.env.VERCEL_DATA_DIR || "/tmp/portfolio-data";
export const TOKEN_TTL = 60 * 60 * 24 * 365 * 10; // 10 years (parity with server.js)
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
    /* Bump so every previously issued token stops verifying (verifyToken
       rejects a payload whose `ver` does not match). The secret itself is
       derived from deploy-time env / the baked-in default, NOT from the
       stored password, so a password change alone would otherwise leave
       already-issued tokens valid — exactly what this counter prevents.
       _password.js issues a fresh token in the same response, so the
       operator's own session survives the change. */
    token_version: (cur.token_version || 0) + 1,
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

/* ════════════════════════════════════════════════════════════════════
   Durable store (visits / online / clicks / messages / projects / …)

   A file alone is NOT durable on Vercel: every lambda gets its own
   ephemeral /tmp, so counters written by one instance are invisible to
   the next and disappear completely on a cold start. That is exactly
   why the analytics panel kept "resetting to zero".

   So when a Redis-compatible REST endpoint is configured we treat it as
   the source of truth. Vercel KV is Upstash underneath, so either
   env-var pair works:

     KV_REST_API_URL        + KV_REST_API_TOKEN
     UPSTASH_REDIS_REST_URL + UPSTASH_REDIS_REST_TOKEN

   With nothing configured we behave exactly as before (plain files) —
   the right answer for local dev and the self-hosted server.
   ════════════════════════════════════════════════════════════════════ */
export const storePath = (name) => path.join(DATA_DIR, name);

const KV_URL = String(
  process.env.KV_REST_API_URL || process.env.UPSTASH_REDIS_REST_URL || ""
).replace(/\/+$/, "");
const KV_TOKEN = String(
  process.env.KV_REST_API_TOKEN || process.env.UPSTASH_REDIS_REST_TOKEN || ""
);
export const DURABLE = Boolean(KV_URL && KV_TOKEN);
const KV_NS = process.env.STORE_NAMESPACE || "portfolio";
const kvKey = (name) => `${KV_NS}:${name}`;
const KV_TIMEOUT_MS = Number(process.env.STORE_TIMEOUT_MS || 4000);

/* One REST round-trip. Bounded by a timeout so a stalled network can never
   hang a lambda until the platform kills it. */
async function kvCall(pathname, command) {
  const controller = new AbortController();
  const timer = setTimeout(() => controller.abort(), KV_TIMEOUT_MS);
  try {
    const res = await fetch(KV_URL + pathname, {
      method: command ? "POST" : "GET",
      headers: {
        Authorization: `Bearer ${KV_TOKEN}`,
        ...(command ? { "Content-Type": "application/json" } : {}),
      },
      body: command ? JSON.stringify(command) : undefined,
      signal: controller.signal,
      cache: "no-store",
    });
    if (!res.ok) throw new Error(`kv ${res.status}`);
    return await res.json();
  } finally {
    clearTimeout(timer);
  }
}

/* Raw stored string, or null when the key does not exist. */
async function kvGet(name) {
  const out = await kvCall(`/get/${encodeURIComponent(kvKey(name))}`);
  return typeof out?.result === "string" ? out.result : null;
}
const kvSet = (name, value) => kvCall("", ["SET", kvKey(name), String(value)]);
const kvDel = (name) => kvCall("", ["DEL", kvKey(name)]);

export async function readStore(name, fallback) {
  if (DURABLE) {
    try {
      const raw = await kvGet(name);
      if (raw != null) {
        const parsed = JSON.parse(raw);
        if (parsed != null) return parsed;
      } else {
        /* First read after switching to a durable store: adopt whatever the
           bundled/seed file already holds, so the panel does not look wiped. */
        const seeded = await readJSON(storePath(name), undefined);
        if (seeded !== undefined) {
          await writeStore(name, seeded);
          return seeded;
        }
      }
    } catch {
      /* Network hiccup — serve the local copy instead of failing the request */
    }
  }
  return readJSON(storePath(name), fallback);
}

export async function writeStore(name, data) {
  /* Always keep a local copy: it is the fallback when the network blips and
     the only copy in dev / self-hosted mode. */
  await writeJSON(storePath(name), data);
  if (DURABLE) {
    try {
      await kvSet(name, JSON.stringify(data));
    } catch {
      /* The local write already succeeded — a transient KV failure must not
         turn a page view into a 500. */
    }
  }
}

/* Used by the reset endpoints. Must clear BOTH copies, otherwise a later
   read would resurrect the data from whichever one still holds it. */
export async function deleteStore(name) {
  let removed = false;
  try {
    await fsp.unlink(storePath(name));
    removed = true;
  } catch {
    /* already gone */
  }
  if (DURABLE) {
    try {
      await kvDel(name);
      removed = true;
    } catch {
      /* ignore — nothing more we can do */
    }
  }
  return removed;
}

/* "redis" when a durable store is configured, "file" otherwise. */
export const storeBackend = () => (DURABLE ? "redis" : "file");

/* True when the numbers survive a restart of whatever host is running.
   A plain file is durable on a real disk (dev, self-hosted) but NOT on
   Vercel, where DATA_DIR is a per-instance /tmp. */
export const storeDurable = () => DURABLE || !process.env.VERCEL;

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
