/* Proves that analytics SURVIVE a serverless cold start once a durable
   store is configured — and, as a control, that they do NOT without one.

   How it works:
     1. A fake Upstash / Vercel-KV REST server runs in-process (the same
        wire protocol: GET /get/:key, POST ["SET"|"DEL", key, value]).
     2. "Instance A" records 4 page views through the real api/index.js.
     3. The instance's /tmp directory is DELETED — a cold start.
     4. "Instance B" (a brand-new data dir) reads /api/admin/stats.

   With KV configured instance B must still report 4 views.
   Without KV it must report 0 — that is the bug being fixed.

   Run: node tools/verify-durable-analytics.mjs
*/
import { spawn } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const BASE = process.cwd();
const TMP = path.join(os.tmpdir(), "pdata-durable");
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

const PAGES = ["/", "/about", "/project", "/blog"];

/* ── 1. fake Redis REST endpoint ─────────────────────────────────── */
const redis = new Map();
const kvServer = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  const url = new URL(req.url, "http://localhost");
  if (req.method === "GET" && url.pathname.startsWith("/get/")) {
    const key = decodeURIComponent(url.pathname.slice("/get/".length));
    res.end(JSON.stringify({ result: redis.has(key) ? redis.get(key) : null }));
    return;
  }
  if (req.method === "POST") {
    let body = "";
    req.on("data", (c) => (body += c));
    req.on("end", () => {
      let cmd = [];
      try {
        cmd = JSON.parse(body);
      } catch {}
      const [op, key, value] = cmd;
      if (op === "SET") {
        redis.set(key, value);
        res.end(JSON.stringify({ result: "OK" }));
      } else if (op === "DEL") {
        res.end(JSON.stringify({ result: redis.delete(key) ? 1 : 0 }));
      } else {
        res.end(JSON.stringify({ result: null }));
      }
    });
    return;
  }
  res.statusCode = 404;
  res.end("{}");
});
await new Promise((r) => kvServer.listen(0, "127.0.0.1", r));
const KV_URL = `http://127.0.0.1:${kvServer.address().port}`;
const KV_TOKEN = "test-token";

/* ── 2. child driver: talks to the real api/index.js handler ─────── */
const childPath = path.join(TMP, "child.mjs");
fs.writeFileSync(
  childPath,
  `
import { pathToFileURL } from "node:url";
const H = (await import(pathToFileURL(${JSON.stringify(path.join(BASE, "api", "index.js"))}).href)).default;

async function call(method, route, body, headers = {}) {
  const res = {
    _code: 200,
    body: null,
    status(c) { this._code = c; return this; },
    json(b) { this.body = b; return this; },
    setHeader() { return this; },
    end() { return this; },
  };
  const req = {
    method,
    url: "/api/" + route,
    query: { __route: route },
    body,
    headers: { ...headers },
    socket: { remoteAddress: "127.0.0.1" },
  };
  await H(req, res);
  return { status: res._code, body: res.body };
}

const mode = process.argv[2];
if (mode === "track") {
  const paths = JSON.parse(process.argv[3]);
  for (const p of paths) {
    await call("POST", "admin/track", { path: p, sessionId: "session-a" });
  }
  console.log(JSON.stringify({ ok: true, sent: paths.length }));
} else if (mode === "stats") {
  const login = await call("POST", "admin/auth", {
    username: "mohammad.m.sadeghi09@gmail.com",
    password: "moha3447",
  });
  const token = login.body && login.body.token;
  if (!token) { console.log(JSON.stringify({ error: "login failed", login })); process.exit(0); }
  const stats = await call("GET", "admin/stats", undefined, { authorization: "Bearer " + token });
  console.log(JSON.stringify({
    today: stats.body?.today,
    totalAllTime: stats.body?.totalAllTime,
    topPaths: (stats.body?.topPaths || []).map((p) => [p.path, p.total]),
  }));
} else if (mode === "reset") {
  const login = await call("POST", "admin/auth", {
    username: "mohammad.m.sadeghi09@gmail.com",
    password: "moha3447",
  });
  const token = login.body && login.body.token;
  const out = await call("POST", "admin/reset", { target: "visits" }, { authorization: "Bearer " + token });
  console.log(JSON.stringify({ status: out.status, cleared: out.body?.cleared || [] }));
}
`,
);

function runChild(mode, arg, env) {
  /* NOTE: must be async. spawnSync would block this process's event loop, and
     the fake KV server lives HERE — so the child's HTTP call could never be
     answered and every durable write would silently time out. */
  return new Promise((resolve, reject) => {
    const child = spawn(
      process.execPath,
      [childPath, mode, arg].filter((x) => x !== undefined),
      {
        cwd: BASE,
        env: {
          ...process.env,
          VERCEL_ADMIN_SECRET: "verify-secret",
          ...env,
        },
      },
    );
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) {
        reject(new Error(`child ${mode} exited ${code}: ${err || out}`));
        return;
      }
      const line = out.trim().split("\n").pop();
      try {
        resolve(JSON.parse(line));
      } catch {
        reject(new Error(`child ${mode} produced no JSON: ${out || err}`));
      }
    });
  });
}

/* ── 3. the two experiments ──────────────────────────────────────── */
async function experiment(label, useKv) {
  const dirA = path.join(TMP, useKv ? "kv-a" : "nokv-a");
  const dirB = path.join(TMP, useKv ? "kv-b" : "nokv-b");
  const env = useKv
    ? { VERCEL_DATA_DIR: dirA, KV_REST_API_URL: KV_URL, KV_REST_API_TOKEN: KV_TOKEN }
    : { VERCEL_DATA_DIR: dirA };

  const sent = await runChild("track", JSON.stringify(PAGES), env);
  const afterWrite = await runChild("stats", undefined, env);

  /* cold start: the instance's /tmp is gone, a new instance serves the read */
  fs.rmSync(dirA, { recursive: true, force: true });
  fs.mkdirSync(dirB, { recursive: true });
  const afterCold = await runChild("stats", undefined, {
    ...env,
    VERCEL_DATA_DIR: dirB,
  });

  console.log(`\n=== ${label} ===`);
  console.log(`  recorded          : ${sent.sent} views`);
  console.log(`  same instance     : today=${afterWrite.today} total=${afterWrite.totalAllTime}`);
  console.log(`  AFTER COLD START  : today=${afterCold.today} total=${afterCold.totalAllTime}`);
  console.log(`  top-pages         : ${JSON.stringify(afterCold.topPaths)}`);
  return afterCold;
}

const withKv = await experiment("A) durable store configured", true);
/* capture before experiment C wipes the keys */
const kvKeysWritten = redis.size;
const withoutKv = await experiment("B) control — no durable store", false);

/* The reset button must wipe the DURABLE copy too, otherwise a fresh
   instance would resurrect the data the admin just cleared.
   A separate namespace keeps this experiment from inheriting A's counters. */
const resetDir = path.join(TMP, "reset-a");
const resetEnv = {
  VERCEL_DATA_DIR: resetDir,
  KV_REST_API_URL: KV_URL,
  KV_REST_API_TOKEN: KV_TOKEN,
  STORE_NAMESPACE: "verify-reset",
};
await runChild("track", JSON.stringify(PAGES), resetEnv);
const beforeReset = await runChild("stats", undefined, resetEnv);
const resetOut = await runChild("reset", undefined, resetEnv);
fs.rmSync(resetDir, { recursive: true, force: true });
fs.mkdirSync(path.join(TMP, "reset-b"), { recursive: true });
const afterReset = await runChild("stats", undefined, {
  ...resetEnv,
  VERCEL_DATA_DIR: path.join(TMP, "reset-b"),
});
console.log("\n=== C) reset clears the durable copy ===");
console.log(`  before reset      : total=${beforeReset.totalAllTime}`);
console.log(`  cleared           : ${JSON.stringify(resetOut.cleared)}`);
console.log(`  after reset       : total=${afterReset.totalAllTime}`);

/* ── 4. assertions ───────────────────────────────────────────────── */
const problems = [];
const expect = PAGES.length;

if (withKv.today !== expect) problems.push(`durable: today=${withKv.today}, expected ${expect}`);
if (withKv.totalAllTime !== expect) problems.push(`durable: total=${withKv.totalAllTime}, expected ${expect}`);
if (withKv.topPaths.length !== expect)
  problems.push(`durable: ${withKv.topPaths.length} pages listed, expected ${expect}`);
for (const [p, n] of withKv.topPaths) {
  if (n !== 1) problems.push(`durable: page ${p} = ${n}, expected 1`);
}
if (withoutKv.today !== 0)
  problems.push(`control: expected a reset to 0 without KV, got ${withoutKv.today}`);
if (kvKeysWritten === 0)
  problems.push("nothing was ever written to the durable store");
if (beforeReset.totalAllTime !== expect)
  problems.push(`reset: before=${beforeReset.totalAllTime}, expected ${expect}`);
if (afterReset.totalAllTime !== 0)
  problems.push(
    `reset: data came back after the wipe (${afterReset.totalAllTime}) — the durable copy was not cleared`,
  );

kvServer.close();

console.log("\n" + "─".repeat(60));
if (problems.length) {
  console.log("FAILURES:");
  for (const p of problems) console.log("  - " + p);
  process.exit(1);
}
console.log(`PASS — ${expect} page opens recorded ${expect} views, each page +1,`);
console.log("       and the numbers SURVIVE a cold start (control resets to 0).");
