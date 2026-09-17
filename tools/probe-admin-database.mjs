/* Log into the LIVE admin panel and interrogate the Database tab properly:
   what does /api/admin/fs actually return, is fs-size reachable, and does the
   listing ever contain anything? Seeds a little data first so an empty store
   cannot be mistaken for a broken one. */
import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs";
import crypto from "node:crypto";

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PROFILE = (process.env.LOCALAPPDATA || "/tmp") + "/Temp/chrome-cdp-db2";
const PORT = 9336;
const H = "https://mohammad-mehdi-sadeghi.vercel.app";
fs.rmSync(PROFILE, { recursive: true, force: true });

const chrome = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
  "--headless=new", "--disable-gpu", "--no-first-run",
  "--no-default-browser-check", "about:blank",
], { detached: true, stdio: "ignore" });
chrome.unref();

const get = (u) => new Promise((res, rej) => {
  http.get(u, (r) => { let d = ""; r.on("data", (c) => (d += c)); r.on("end", () => res(JSON.parse(d))); }).on("error", rej);
});
let version = null;
for (let i = 0; i < 40; i++) {
  try { version = await get(`http://127.0.0.1:${PORT}/json/version`); break; }
  catch { await new Promise((r) => setTimeout(r, 500)); }
}
if (!version) { console.log("CHROME CDP DID NOT START"); process.exit(1); }

const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
const net = [];
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  } else if (msg.method === "Network.responseReceived" && /\/api\/admin\/(fs|reset)/.test(msg.params.response.url)) {
    net.push({ url: msg.params.response.url.replace(H, ""), status: msg.params.response.status, mime: msg.params.response.mimeType });
  }
};
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const myId = ++id;
  pending.set(myId, { resolve, reject });
  ws.send(JSON.stringify({ id: myId, method, params, sessionId }));
});
const tab = await send("Target.createTarget", { url: "about:blank" });
const { sessionId: S } = await send("Target.attachToTarget", { targetId: tab.targetId, flatten: true });
await send("Page.enable", {}, S);
await send("Runtime.enable", {}, S);
await send("Network.enable", {}, S);

const ev = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, S);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
  return r.result.value;
};
const goto = async (url, ms = 9000) => { await send("Page.navigate", { url }, S); await new Promise((r) => setTimeout(r, ms)); };

let pass = 0, fail = 0;
const check = (l, c, d = "") => { c ? (pass++, console.log("  ok  ", l, d)) : (fail++, console.log("  FAIL", l, d)); };

/* ── 1. log in ────────────────────────────────────────────────────── */
await goto(H + "/admin/login");
const u = await ev(`(document.querySelector('input')||{}).placeholder || ''`);
console.log("  first input placeholder:", JSON.stringify(u));

/* the CDP suites mint the token from the local config's HMAC, but the LIVE
   secret differs — so drive the real form. Username/password come from the
   environment of whoever runs this. */
const USER = process.env.ADMIN_USER, PASS = process.env.ADMIN_PASS;
if (!USER || !PASS) { console.log("set ADMIN_USER / ADMIN_PASS to run"); process.exit(1); }
await ev(`(() => {
  const ins = [...document.querySelectorAll('input')];
  const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el, v); el.dispatchEvent(new Event('input',{bubbles:true})); };
  const user = ins.find(i => /user|name|email/i.test(i.placeholder||i.name||'')) || ins[0];
  const pw = ins.find(i => i.type === 'password') || ins[1];
  set(user, ${JSON.stringify(USER)}); set(pw, ${JSON.stringify(PASS)});
  return 'OK';
})()`);
await new Promise((r) => setTimeout(r, 300));
await ev(`(() => { const b=[...document.querySelectorAll('button')].find(x=>/sign|log/i.test(x.textContent)); if(b) b.click(); return !!b; })()`);
await new Promise((r) => setTimeout(r, 4000));
const afterLogin = await ev(`location.pathname`);
check("logged in", afterLogin.startsWith("/admin/") && !afterLogin.includes("login"), afterLogin);

/* ── 2. make sure there IS data to list ───────────────────────────── */
const seed = await ev(`(async () => {
  const t = localStorage.getItem('admin_token');
  const r = await fetch('/api/admin/track', { method:'POST', headers:{'Content-Type':'application/json'}, body: JSON.stringify({ path:'/probe', sessionId:'probe-'+Date.now() }) });
  return r.status;
})()`);
console.log("  seeded a visit:", seed);

/* ── 3. hit the endpoints directly, from inside the page origin ───── */
const direct = await ev(`(async () => {
  const t = localStorage.getItem('admin_token');
  const H2 = { Authorization: 'Bearer ' + t };
  const out = {};
  for (const u of ['/api/admin/fs?path=', '/api/admin/fs-size?path=visits.json', '/api/admin/fs', '/api/admin/fs-size']) {
    try {
      const r = await fetch(u, { headers: H2 });
      const txt = await r.text();
      out[u] = { status: r.status, mime: r.headers.get('content-type'), body: txt.slice(0, 260) };
    } catch (e) { out[u] = { err: String(e) }; }
  }
  return out;
})()`);
for (const [k, v] of Object.entries(direct)) {
  console.log(`\n  ${k}  →  ${v.status} ${v.mime || ""}\n     ${(v.body || v.err || "").replace(/\s+/g, " ")}`);
}

const listOk = direct["/api/admin/fs?path="]?.status === 200 && /application\/json/.test(direct["/api/admin/fs?path="]?.mime || "");
check("GET /api/admin/fs?path= returns JSON", listOk, `${direct["/api/admin/fs?path="]?.status} ${direct["/api/admin/fs?path="]?.mime}`);
const jsonBody = (() => { try { return JSON.parse(direct["/api/admin/fs?path="]?.body + ""); } catch { return null; } })();
check("...and it actually lists something after seeding", (jsonBody?.items?.length || 0) > 0, `${jsonBody?.items?.length ?? "?"} items`);
const sizeOk = /application\/json/.test(direct["/api/admin/fs-size?path=visits.json"]?.mime || "");
check("fs-size returns JSON (not the SPA fallback)", sizeOk, `${direct["/api/admin/fs-size?path=visits.json"]?.status} ${direct["/api/admin/fs-size?path=visits.json"]?.mime}`);

/* ── 4. now the real UI ───────────────────────────────────────────── */
net.length = 0;
await goto(H + "/admin/database", 7000);
const ui = await ev(`(() => {
  const main = document.querySelector('main') || document.body;
  const rows = [...main.querySelectorAll('div')].filter(d => /delete/.test(d.textContent) && d.children.length <= 4).length;
  const err = [...main.querySelectorAll('p')].map(p => p.textContent).filter(t => /^\\/\\/\\s*(?!tip|test|empty)/.test(t.trim()));
  return { text: main.innerText.replace(/\\n+/g, ' | ').slice(0, 700), rows, errors: err };
})()`);
console.log("\n  UI:", ui.text);
console.log("\n  network:", JSON.stringify(net, null, 1));
check("no error banner in the Database UI", ui.errors.length === 0, JSON.stringify(ui.errors));
check("the listing shows the seeded store", /visits|admin-auth|config|messages/.test(ui.text), ui.text.slice(0, 120));
check("size column resolved (no permanent '…')", !/\u2026/.test(ui.text), "");

console.log(`\n════════ ${pass} passed, ${fail} failed ════════`);
ws.close();
try { process.kill(-chrome.pid); } catch { /* already gone */ }
process.exit(fail ? 1 : 0);
