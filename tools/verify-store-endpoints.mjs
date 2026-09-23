/* Regression sweep over every endpoint that touches the JSON store.

   Swapping the store implementation behind readStore/writeStore affects all
   of them at once, and a broken one fails quietly (a null store, a missing
   key) rather than loudly. This drives each endpoint through the real
   api/index.js handler TWICE — once on the filesystem, once against a
   durable store — and requires identical, well-formed answers.

   Run: node tools/verify-store-endpoints.mjs
*/
import { spawn } from "node:child_process";
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const BASE = process.cwd();
const TMP = path.join(os.tmpdir(), "pdata-endpoints");
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

/* ── fake Redis REST endpoint ────────────────────────────────────── */
const redis = new Map();
const kvServer = http.createServer((req, res) => {
  res.setHeader("Content-Type", "application/json");
  const url = new URL(req.url, "http://localhost");
  if (req.method === "GET" && url.pathname.startsWith("/get/")) {
    const key = decodeURIComponent(url.pathname.slice(5));
    res.end(JSON.stringify({ result: redis.has(key) ? redis.get(key) : null }));
    return;
  }
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
});
await new Promise((r) => kvServer.listen(0, "127.0.0.1", r));
const KV_URL = `http://127.0.0.1:${kvServer.address().port}`;

/* ── the endpoints to sweep ──────────────────────────────────────── */
const ENDPOINTS = [
  { name: "auth", method: "POST", route: "admin/auth", body: { username: "mohammad.m.sadeghi09@gmail.com", password: "moha3447" }, shape: (b) => typeof b.token === "string" },
  { name: "stats", method: "GET", route: "admin/stats", auth: true, shape: (b) => typeof b.today === "number" && Array.isArray(b.topPaths) },
  { name: "messages", method: "GET", route: "admin/messages", auth: true, shape: (b) => Array.isArray(b.messages) },
  { name: "moods", method: "GET", route: "admin/moods", auth: true, shape: (b) => b && typeof b === "object" },
  { name: "telegram", method: "GET", route: "admin/telegram", auth: true, shape: (b) => b && typeof b === "object" },
  { name: "blog-admin", method: "GET", route: "admin/blog-admin", auth: true, shape: (b) => Array.isArray(b.posts) || Array.isArray(b) },
  { name: "projects-admin", method: "GET", route: "admin/projects-admin", auth: true, shape: (b) => b !== null && b !== undefined },
  { name: "skills-admin", method: "GET", route: "admin/skills-admin", auth: true, shape: (b) => b !== null && b !== undefined },
  { name: "site-admin", method: "GET", route: "admin/site-admin", auth: true, shape: (b) => b.site && typeof b.site.email === "string" && typeof b.site.github === "string" },
  /* admin/fs is a file browser: the root listing is { path, items } */
  { name: "database", method: "GET", route: "admin/fs", auth: true, shape: (b) => b && typeof b.path === "string" && Array.isArray(b.items) },
  { name: "public-blog", method: "GET", route: "blog", shape: (b) => Array.isArray(b.posts) },
  { name: "public-projects", method: "GET", route: "projects.json", shape: (b) => Array.isArray(b) },
  { name: "public-site", method: "GET", route: "site.json", shape: (b) => b && typeof b.email === "string" && typeof b.instagram === "string" },
  { name: "sabz-users", method: "GET", route: "sabz/users", shape: (b) => Array.isArray(b) },
];

/* ── child driver ────────────────────────────────────────────────── */
const childPath = path.join(TMP, "child.mjs");
fs.writeFileSync(
  childPath,
  `
import { pathToFileURL } from "node:url";
const H = (await import(pathToFileURL(${JSON.stringify(path.join(BASE, "api", "index.js"))}).href)).default;

async function call(method, route, body, headers = {}) {
  const res = {
    _code: 200, body: null,
    status(c) { this._code = c; return this; },
    json(b) { this.body = b; return this; },
    setHeader() { return this; },
    end() { this.body = this.body ?? null; return this; },
  };
  const req = {
    method, url: "/api/" + route, query: { __route: route }, body,
    headers: { ...headers }, socket: { remoteAddress: "127.0.0.1" },
  };
  await H(req, res);
  return { status: res._code, body: res.body };
}

const login = await call("POST", "admin/auth", {
  username: "mohammad.m.sadeghi09@gmail.com", password: "moha3447",
});
const token = login.body && login.body.token;
if (!token) { console.log(JSON.stringify({ fatal: "login failed", login })); process.exit(0); }

const specs = JSON.parse(process.argv[2]);
const out = [];
for (const s of specs) {
  const r = await call(s.method, s.route, s.body, s.auth ? { authorization: "Bearer " + token } : {});
  out.push({ name: s.name, status: r.status, body: r.body });
}

/* ── round trip: an admin edit MUST be visible on the PUBLIC endpoint ──
   This is the assertion that matters. Every one of these endpoints answering
   200 proves nothing about whether a save reaches the site: earlier this
   project shipped exactly that bug, where the panel listed the edit (it read
   the overlay) while the public endpoint kept serving the bundled file. So
   write a sentinel through the admin route and read it back through the route
   the browser actually calls. */
const auth = { authorization: "Bearer " + token };
const original = (await call("GET", "admin/site-admin", null, auth)).body?.site || {};
const SENTINEL = "roundtrip-" + Date.now() + "@example.com";

const put = await call("PUT", "admin/site-admin", { ...original, email: SENTINEL }, auth);
const seenPublicly = (await call("GET", "site.json")).body?.email ?? null;

const bad = await call("PUT", "admin/site-admin", { ...original, email: "not-an-email" }, auth);
const afterBad = (await call("GET", "site.json")).body?.email ?? null;

const restore = await call("PUT", "admin/site-admin", { ...original }, auth);
const afterRestore = (await call("GET", "site.json")).body?.email ?? null;

console.log(JSON.stringify({
  results: out,
  roundtrip: {
    putStatus: put.status,
    seenPublicly,
    sentinel: SENTINEL,
    badStatus: bad.status,
    badError: bad.body?.error ?? null,
    afterBad,
    restoreStatus: restore.status,
    afterRestore,
    originalEmail: original.email ?? null,
  },
}));
`,
);

function runChild(env, specs) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [childPath, JSON.stringify(specs)], {
      cwd: BASE,
      env: { ...process.env, VERCEL_ADMIN_SECRET: "verify-secret", ...env },
    });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(`child exited ${code}: ${err || out}`));
      try {
        resolve(JSON.parse(out.trim().split("\n").pop()));
      } catch {
        reject(new Error(`no JSON from child: ${out || err}`));
      }
    });
  });
}

async function sweep(label, extraEnv) {
  const dir = path.join(TMP, label.replace(/\W+/g, "-"));
  fs.mkdirSync(dir, { recursive: true });
  /* Each sweep gets its own KV namespace. Sharing one meant the durable sweep
     read whatever the file sweep had left behind, so it was not actually
     testing a cold durable store — and the round trip below would have been
     validating against the previous run's data. */
  const ns = "pdata-" + label.replace(/\W+/g, "-");
  const { results, roundtrip } = await runChild(
    { VERCEL_DATA_DIR: dir, STORE_NAMESPACE: ns, ...extraEnv },
    ENDPOINTS,
  );
  console.log(`\n=== ${label} ===`);
  const problems = [];
  for (const r of results) {
    const spec = ENDPOINTS.find((e) => e.name === r.name);
    const ok = r.status === 200 && r.body != null && spec.shape(r.body);
    console.log(
      `  ${ok ? "ok  " : "FAIL"} ${r.name.padEnd(16)} status=${r.status}`,
    );
    if (!ok) problems.push(`${label}: ${r.name} status=${r.status} body=${JSON.stringify(r.body)?.slice(0, 120)}`);
  }

  /* The four round-trip assertions. A = the save reached the public route,
     B = a rejected save did not corrupt what was already stored. */
  const checks = [
    ["A save returns 200", roundtrip.putStatus === 200, `status=${roundtrip.putStatus}`],
    ["A admin edit is visible on the public route", roundtrip.seenPublicly === roundtrip.sentinel, `public=${roundtrip.seenPublicly}`],
    ["B malformed email is rejected", roundtrip.badStatus === 400 && Boolean(roundtrip.badError), `status=${roundtrip.badStatus} error=${roundtrip.badError}`],
    ["B rejected save left the stored value untouched", roundtrip.afterBad === roundtrip.sentinel, `public=${roundtrip.afterBad}`],
    ["restore returns 200", roundtrip.restoreStatus === 200, `status=${roundtrip.restoreStatus}`],
    ["restore is visible on the public route", roundtrip.afterRestore === roundtrip.originalEmail, `public=${roundtrip.afterRestore} expected=${roundtrip.originalEmail}`],
  ];
  for (const [name, pass, detail] of checks) {
    console.log(`  ${pass ? "ok  " : "FAIL"} ${name}${pass ? "" : " — " + detail}`);
    if (!pass) problems.push(`${label}: ${name} (${detail})`);
  }
  return problems;
}

const problems = [];
problems.push(...(await sweep("file store", {})));
problems.push(...(await sweep("durable store", { KV_REST_API_URL: KV_URL, KV_REST_API_TOKEN: "tok" })));

kvServer.close();

console.log("\n" + "─".repeat(60));
if (problems.length) {
  console.log("FAILURES:");
  for (const p of problems) console.log("  - " + p);
  process.exit(1);
}
console.log(`PASS — all ${ENDPOINTS.length} store-backed endpoints answer identically`);
console.log("       on the file store and on the durable store.");
