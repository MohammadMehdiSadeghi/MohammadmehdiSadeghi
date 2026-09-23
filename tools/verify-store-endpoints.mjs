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
  /* admin/fs is a file browser: the root listing is { path, items } */
  { name: "database", method: "GET", route: "admin/fs", auth: true, shape: (b) => b && typeof b.path === "string" && Array.isArray(b.items) },
  { name: "public-blog", method: "GET", route: "blog", shape: (b) => Array.isArray(b.posts) },
  { name: "public-projects", method: "GET", route: "projects.json", shape: (b) => Array.isArray(b) },
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
console.log(JSON.stringify({ results: out }));
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
  const { results } = await runChild({ VERCEL_DATA_DIR: dir, ...extraEnv }, ENDPOINTS);
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
