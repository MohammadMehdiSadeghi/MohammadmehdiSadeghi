/* End-to-end verification of the Vercel routing fixes, self-contained:
   reads vercel.json, resolves each request the way Vercel would (rewrite
   → static file on disk → else the api handler), and asserts the result.
   Runs inside the project so bare/relative imports resolve. */
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.VERCEL_DATA_DIR = (process.env.LOCALAPPDATA || "/tmp") + "/Temp/pdata-e2e";
process.env.VERCEL_ADMIN_SECRET = "e2e-secret";

const BASE = process.cwd();
const DIST = path.join(BASE, "dist");
const cfg = JSON.parse(fs.readFileSync(path.join(BASE, "vercel.json"), "utf8"));

function toRegex(source) {
  if (source === "/((?!api/).*)") return { re: /^\/(?!api\/).*$/, params: [] };
  const params = [];
  let s = source.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  s = s.replace(/:(\w+)\*/g, (_, n) => { params.push(n); return "(.*)"; });
  s = s.replace(/:(\w+)/g, (_, n) => { params.push(n); return "([^/]+)"; });
  return { re: new RegExp("^" + s + "$"), params };
}
const RULES = cfg.rewrites.map((r) => ({ ...r, ...toRegex(r.source) }));

function resolveRequest(url) {
  const [pathname, search = ""] = url.split("?");
  // 1. a real file on disk always wins (Vercel serves static first)
  const direct = path.join(DIST, decodeURIComponent(pathname));
  if (fs.existsSync(direct) && fs.statSync(direct).isFile()) {
    return { kind: "static", file: direct };
  }
  // 2. rewrites, in order
  for (const r of RULES) {
    const m = r.re.exec(pathname);
    if (!m) continue;
    let dest = r.destination;
    r.params.forEach((name, i) => {
      // ":path*" is greedy — strip the trailing "*" from the placeholder
      dest = dest.replace(":" + name + "*", m[i + 1]).replace(":" + name, m[i + 1]);
    });
    const dp = dest.split("?")[0];
    const onDisk = path.join(DIST, decodeURIComponent(dp));
    if (fs.existsSync(onDisk) && fs.statSync(onDisk).isFile()) {
      return { kind: "static", file: onDisk, via: r.source };
    }
    if (dp === "/api/index") {
      const q = Object.fromEntries(new URLSearchParams(dest.split("?")[1] || ""));
      /* Vercel ALSO injects every NAMED param of the source into the query
         string. That is how "source": "/api/:path*" silently overwrote the
         panel's own ?path= argument and broke the Database tab. Emulate it
         so a collision like that fails here instead of in production. */
      r.params.forEach((name, i) => {
        q[name] = m[i + 1];
      });
      return { kind: "api", query: q, via: r.source, params: r.params };
    }
    return { kind: "static", file: onDisk, via: r.source, missing: true };
  }
  return { kind: "none" };
}

const H = await import(pathToFileURL(path.join(BASE, "api/index.js")).href);
const handler = H.default;

async function invoke(method, url, { body = null, auth = "" } = {}) {
  const r = resolveRequest(url);
  if (r.kind !== "api") return { status: null, route: r };

  const [pathname, search = ""] = url.split("?");
  const extra = Object.fromEntries(new URLSearchParams(search));
  const req = {
    method,
    url,
    query: { ...extra, ...r.query },
    body,
    headers: { authorization: auth },
    socket: { remoteAddress: "127.0.0.1" },
  };
  const res = {
    _status: 200,
    _body: undefined,
    status(c) { this._status = c; return this; },
    json(b) { this._body = b; return this; },
    setHeader() { return this; },
    end() { return this; },
  };
  await handler(req, res);
  return { status: res._status, body: res._body, route: r };
}

const srcHas = (needle) => fs.readdirSync(path.join(BASE, "src/Page/Admin")).some((f) => {
  const fp = path.join(BASE, "src/Page/Admin", f);
  return fs.statSync(fp).isFile() && fs.readFileSync(fp, "utf8").includes(needle);
});

let pass = 0, fail = 0;
const check = (label, cond, detail = "") => {
  if (cond) { pass++; console.log("  ok  ", label, detail); }
  else { fail++; console.log("  FAIL", label, detail); }
};

console.log("=== ROUTING: rewrite resolution ===");
for (const [url, expectKind] of [
  ["/api/skills", "api"],
  ["/api/admin/auth-check", "api"],
  ["/api/admin/telegram/test", "api"],
  ["/api/digikala?type=offer-products", "api"],
  ["/Projects/Web-Project/Sabz-Learn/server/users", "api"],
  ["/Projects/Web-Project/Sabz-Learn/server/comments", "api"],
  ["/api/skills.json", "static"],
  ["/api/projects.json", "static"],
  ["/Projects/Web-Project/Sabz-Learn/assets/index-RQ3sHbfC.js", "static"],
  ["/Projects/Web-Project/Sabz-Learn/server/data", "static"],
  ["/admin", "static"],
  ["/assets", "static"],
]) {
  const r = resolveRequest(url);
  check(`${url} → ${expectKind}`, r.kind === expectKind, `got ${r.kind}${r.via ? " via " + r.via : ""}`);
}

console.log("\n=== ENDPOINTS through the resolved route ===");
for (const [url, q] of [
  ["/api/skills", {}],
  ["/api/digikala?type=offer-products", {}],
  ["/api/ubisoft?type=first", {}],
  ["/api/search?q=love", {}],
  ["/api/mood-search?q=sad", {}],
  ["/Projects/Web-Project/Sabz-Learn/server/comments", {}],
  ["/Projects/Web-Project/Sabz-Learn/server/users", {}],
]) {
  const r = await invoke("GET", url, { query: q });
  check(`GET ${url}`, r.status === 200, `→ ${r.status} ${String(JSON.stringify(r.body) ?? r.route.kind).slice(0, 55)}`);
}

console.log("\n=== SABZ-LEARN register → login flow (the user's test) ===");
{
  const phone = "09987654321";
  const reg = await invoke("POST", "/Projects/Web-Project/Sabz-Learn/server/users", {
    body: { name: "Mehdi", phoneNumber: phone, password: "Test123!" },
  });
  check("register 200", reg.status === 200, `→ ${reg.status}`);

  const list = await invoke("GET", "/Projects/Web-Project/Sabz-Learn/server/users");
  const u = (list.body || []).find((x) => x.phoneNumber === phone);
  check("user persisted in temp DB", !!u, u ? `name=${u.name}` : "missing");
  check("password available for the client compare", !!u?.password);

  const comments = await invoke("GET", "/Projects/Web-Project/Sabz-Learn/server/comments");
  check("comments render-ready", Array.isArray(comments.body) && comments.body.length >= 4,
    `${comments.body?.length} comments`);
}

console.log("\n=== ADMIN: login + panel tabs, all via rewrites ===");
{
  const bad = await invoke("POST", "/api/admin/auth", {
    body: { username: "mohammad.m.sadeghi09@gmail.com", password: "nope" },
  });
  check("bad password → 401", bad.status === 401, `→ ${bad.status}`);

  const ok = await invoke("POST", "/api/admin/auth", {
    body: { username: "mohammad.m.sadeghi09@gmail.com", password: "moha3447" },
  });
  check("hashed login works", ok.status === 200 && !!ok.body?.token, `→ ${ok.status}`);
  const A = "Bearer " + (ok.body?.token || "");
  global.__E2E_TOKEN = ok.body?.token || "";

  for (const url of [
    "/api/admin/auth-check", "/api/admin/stats", "/api/admin/messages",
    "/api/admin/projects-admin", "/api/admin/skills-admin",
    "/api/admin/moods", "/api/admin/telegram",
  ]) {
    const r = await invoke("GET", url, { auth: A });
    check(`panel: ${url}`, r.status === 200, `→ ${r.status}`);
  }

  console.log("\n=== every page path the panel uses is routable ===");
  for (const p of [
    "/admin/stats", "/admin/projects", "/admin/messages",
    "/admin/security", "/admin/moods", "/admin/database",
  ]) {
    // these are SPA routes → must resolve to the app shell, not 404
    const r = resolveRequest(p);
    check(`${p} → app shell`, r.kind === "static" && r.file.endsWith("index.html"), `got ${r.kind} ${r.file || ""}`);
  }
}

console.log("\n=== admin password change from the dashboard (user's ask) ===");
{
  const A = global.__E2E_TOKEN;
  const login = async (pw) => invoke("POST", "/api/admin/auth", {
    body: { username: "mohammad.m.sadeghi09@gmail.com", password: pw },
  });

  // wrong current password must be rejected
  const bad = await invoke("POST", "/api/admin/password", {
    auth: `Bearer ${A}`,
    body: { currentPassword: "wrong-one", newPassword: "NewPass123!" },
  });
  check("wrong current password → 401", bad.status === 401, `→ ${bad.status}`);

  // too-short new password must be rejected
  const short = await invoke("POST", "/api/admin/password", {
    auth: `Bearer ${A}`,
    body: { currentPassword: "moha3447", newPassword: "123" },
  });
  check("short new password → 400", short.status === 400, `→ ${short.status}`);

  // real change
  const ok = await invoke("POST", "/api/admin/password", {
    auth: `Bearer ${A}`,
    body: { currentPassword: "moha3447", newPassword: "NewPass123!" },
  });
  check("change password 200", ok.status === 200, `→ ${ok.status}`);

  const oldFails = await login("moha3447");
  check("old password no longer works", oldFails.status === 401, `→ ${oldFails.status}`);

  const newWorks = await login("NewPass123!");
  check("new password works", newWorks.status === 200 && !!newWorks.body?.token, `→ ${newWorks.status}`);

  // revert so the shipped default stays the documented one
  const NB = "Bearer " + newWorks.body.token;
  await invoke("POST", "/api/admin/password", {
    auth: NB,
    body: { currentPassword: "NewPass123!", newPassword: "moha3447" },
  });
  const back = await login("moha3447");
  check("reverted to the original password", back.status === 200, `→ ${back.status}`);
  // changing the password bumps token_version (old tokens die) — refresh ours
  global.__E2E_TOKEN = back.body?.token || "";
  const recheck = await invoke("GET", "/api/admin/auth-check", { auth: `Bearer ${global.__E2E_TOKEN}` });
  check("fresh token valid again", recheck.status === 200, `→ ${recheck.status}`);
}

console.log("\n=== no mock data leaks into production stats ===");
{
  const A = global.__E2E_TOKEN;
  const s = await invoke("GET", "/api/admin/stats", { auth: `Bearer ${A}` });
  check("stats come from the real store", s.status === 200 && s.body && "totalAllTime" in s.body,
    JSON.stringify(Object.keys(s.body || {})).slice(0, 70));
  const js = fs.readdirSync(path.join(DIST, "assets")).filter((f) => f.endsWith(".js"))[0];
  const bundle = fs.readFileSync(path.join(DIST, "assets", js), "utf8");
  check("ClickAnalytics UI no longer shipped", !bundle.includes("clicksByType"));
}

console.log("\n=== temp DB: reset + TTL expiry (the 'delete it after testing' ask) ===");
{
  const A = global.__E2E_TOKEN;
  const phone = "09120000009";

  await invoke("POST", "/Projects/Web-Project/Sabz-Learn/server/users", {
    body: { name: "Temp User", phoneNumber: phone, password: "Test123!" },
  });
  let list = await invoke("GET", "/Projects/Web-Project/Sabz-Learn/server/users");
  check("test account exists before reset",
    (list.body || []).some((u) => u.phoneNumber === phone),
    `${list.body?.length} users`);

  const r = await invoke("POST", "/api/admin/reset", {
    auth: `Bearer ${A}`,
    body: { target: "sabz" },
  });
  check("reset endpoint 200", r.status === 200, `→ ${r.status}`);
  check("reset reports cleared stores", Array.isArray(r.body?.cleared), JSON.stringify(r.body?.cleared));

  list = await invoke("GET", "/Projects/Web-Project/Sabz-Learn/server/users");
  check("test account wiped", !(list.body || []).some((u) => u.phoneNumber === phone),
    `${list.body?.length} users left`);

  const c = await invoke("GET", "/Projects/Web-Project/Sabz-Learn/server/comments");
  check("comments re-seed after wipe", Array.isArray(c.body) && c.body.length >= 4,
    `${c.body?.length} comments`);

  // reset requires auth
  const noauth = await invoke("POST", "/api/admin/reset", { body: { target: "sabz" } });
  check("reset needs auth → 401", noauth.status === 401, `→ ${noauth.status}`);
}

console.log("\n=== Database tab works on the serverless deployment (was 501) ===");
{
  const A = global.__E2E_TOKEN;
  const ls = await invoke("GET", "/api/admin/fs", { auth: `Bearer ${A}` });
  check("fs listing 200 (not 501)", ls.status === 200, `→ ${ls.status} ${JSON.stringify(ls.body).slice(0, 60)}`);
  check("fs returns items array", Array.isArray(ls.body?.items), `${ls.body?.items?.length} items`);
  const esc = await invoke("GET", "/api/admin/fs?path=../../../../etc", { auth: `Bearer ${A}` });
  check("path traversal rejected", esc.status === 400, `→ ${esc.status}`);

  /* REGRESSION: a named rewrite param (":path*") is injected into the query
     by Vercel and used to clobber the panel's own ?path=, so every request
     listed "admin/fs" and the tab could never leave the root. The wildcard is
     now ":__m*" — assert the client's argument survives. */
  const deep = await invoke("GET", "/api/admin/fs?path=sub%2Fdir", { auth: `Bearer ${A}` });
  check("client ?path= survives the rewrite", deep.body?.path === "sub/dir",
    `path=${JSON.stringify(deep.body?.path)}`);
  const back = await invoke("GET", "/api/admin/fs?path=", { auth: `Bearer ${A}` });
  check("empty ?path= still lists the root", back.body?.path === "" && Array.isArray(back.body?.items),
    `path=${JSON.stringify(back.body?.path)}`);
  const sz = await invoke("GET", "/api/admin/fs-size?path=sub%2Fdir", { auth: `Bearer ${A}` });
  check("fs-size keeps the client ?path= too", sz.body?.path === "sub/dir" && "size" in (sz.body || {}),
    `path=${JSON.stringify(sz.body?.path)}`);
  const dk = await invoke("GET", "/api/digikala?type=offer-products");
  check("client ?type= survives the rewrite", dk.status === 200 && Array.isArray(dk.body?.products),
    `${dk.body?.products?.length} products`);
}

console.log("\n=== removed buttons tab ===");
check("no buttons page source", !fs.existsSync(path.join(BASE, "src/Page/Admin/Buttons/index.jsx")));
{
  const js = fs.readdirSync(path.join(DIST, "assets")).filter((f) => f.endsWith(".js"))[0];
  const bundle = fs.readFileSync(path.join(DIST, "assets", js), "utf8");
  check("bundle has no buttons.data nav", !bundle.includes("buttons.data"));
  check("router: buttons route removed", !srcHas("buttons"));
  check("bundle has security nav", bundle.includes("security.key"));
  check("bundle has password endpoint", bundle.includes("/api/admin/password"));
}

console.log("\n=== frontend loader changes shipped in the bundle ===");
{
  const js = fs.readdirSync(path.join(DIST, "assets")).filter((f) => f.endsWith(".js"))[0];
  const bundle = fs.readFileSync(path.join(DIST, "assets", js), "utf8");
  check("old terminal intro text gone", !bundle.includes("npm run dev"));
  check("old transition cmd gone", !bundle.includes("load home"));
}

console.log(`\n════════ ${pass} passed, ${fail} failed ════════`);
if (fail) process.exitCode = 1;
