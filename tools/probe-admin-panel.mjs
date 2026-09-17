/* Walk EVERY tab of the admin panel in real Chrome at a given origin and
   assert each one renders content instead of an error / blank / spinner.
   Catches the class of bug where a tab's endpoint has no handler and the SPA
   fallback returns index.html (the page "loads" but shows a parse error).

     TARGET=http://127.0.0.1:5199 node tools/probe-admin-panel.mjs
     TARGET=https://... node tools/probe-admin-panel.mjs   (needs ADMIN_USER/PASS)

   The local origin is expected to answer POST /api/admin/auth with the
   credentials in data/config.json. */
import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs";
import crypto from "node:crypto";
import path from "node:path";

const TARGET = process.env.TARGET || "http://127.0.0.1:5199";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PROFILE = (process.env.LOCALAPPDATA || "/tmp") + "/Temp/chrome-cdp-panel";
const PORT = 9339;
/* a previous run's Chrome may still hold the profile — never let that abort */
try { fs.rmSync(PROFILE, { recursive: true, force: true, maxRetries: 3 }); } catch { /* in use */ }

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
if (!version) { console.log("CHROME DID NOT START"); process.exit(1); }

const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
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

const ev = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, S);
  if (r.exceptionDetails) throw new Error(r.exceptionDetails.text);
  return r.result.value;
};
const goto = async (url, ms = 7000) => { await send("Page.navigate", { url }, S); await new Promise((r) => setTimeout(r, ms)); };

let pass = 0, fail = 0;
const check = (l, c, d = "") => { c ? (pass++, console.log("  ok  ", l, d)) : (fail++, console.log("  FAIL", l, d)); };

/* ── log in. Locally: use the project's own config so no secret is typed. ── */
await goto(TARGET + "/admin/login");
const seen = await ev(`JSON.stringify([...document.querySelectorAll('input')].map(i => i.type))`);
console.log("  login inputs:", seen);

if (process.env.ADMIN_USER && process.env.ADMIN_PASS) {
  await ev(`(() => {
    const ins = [...document.querySelectorAll('input')];
    const set = (el, v) => { Object.getOwnPropertyDescriptor(HTMLInputElement.prototype,'value').set.call(el, v); el.dispatchEvent(new Event('input',{bubbles:true})); };
    set(ins.find(i => i.type !== 'password') || ins[0], ${JSON.stringify(process.env.ADMIN_USER)});
    const pw = ins.find(i => i.type === 'password');
    if (pw) set(pw, ${JSON.stringify(process.env.ADMIN_PASS)});
    return 'OK';
  })()`);
  await ev(`(() => { const b=[...document.querySelectorAll('button')].find(x=>/sign|log/i.test(x.textContent)); if(b) b.click(); return !!b; })()`);
  await new Promise((r) => setTimeout(r, 4500));
} else {
  /* mint a token the way the local mock/server does and plant it */
  const cfg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "public/api/admin/data/config.json"), "utf8"));
  const payload = Buffer.from(
    JSON.stringify({ u: cfg.username, exp: Date.now() + 7 * 86400000 }),
  ).toString("base64url");
  const sig = crypto.createHmac("sha256", cfg.secret).update(payload).digest("base64url");
  await ev(`localStorage.setItem('admin_token', ${JSON.stringify(payload + "." + sig)}), 'set'`);
  await goto(TARGET + "/admin/stats", 6000);
}
check("authenticated into the panel", !(await ev("location.pathname")).includes("login"), await ev("location.pathname"));

/* ── walk every tab ─────────────────────────────────────────────────── */
const TABS = [
  ["stats", /online|today|visits|analytics/i],
  ["projects", /project/i],
  ["blog", /post|blog|title/i],
  ["skills", /skill|html|css|javascript/i],
  ["messages", /message|inbox|contact|name/i],
  ["telegram", /telegram|bot|chat/i],
  ["moods", /mood|song|artist|vibe|dimension/i],
  ["database", /NAME|SIZE|MODIFIED|folder|B\/|KB|MB|GB|project-root/i],
  ["security", /password|current|new/i],
];

for (const [tabName, expect] of TABS) {
  await goto(`${TARGET}/admin/${tabName}`, 6500);

  /* the Database tab deserves a deeper look than "it rendered": the user's
     complaint was that the listing itself was broken. Give the folder-size
     calls time to land, then require real rows with a resolved size. */
  if (tabName === "database") {
    await new Promise((r) => setTimeout(r, 3500));
    const deep = await ev(`(() => {
      const main = document.querySelector('main') || document.body;
      const txt = main.innerText || '';
      const ellipsis = String.fromCharCode(8230);
      return {
        rows: txt.split('delete').length - 1,
        pending: txt.split(ellipsis).length - 1,
        dirs: txt.split('/').length - 1,
        onRoot: txt.indexOf('project-root') >= 0,
        sample: txt.replace(/[\\r\\n]+/g, ' | ').slice(0, 200),
      };
    })()`);
    check("database   lists rows", deep.rows >= 5, `${deep.rows} delete buttons`);
    check("database   sizes resolved (no stray '…')", deep.pending === 0, `${deep.pending} unresolved`);
    check("database   shows folder entries", deep.dirs >= 3, `${deep.dirs} slash marks`);
    check("database   breadcrumb at project root", deep.onRoot, String(deep.sample || "").slice(0, 120));
    continue;
  }
  const state = await ev(`(() => {
    const main = document.querySelector('main') || document.body;
    const text = main.innerText || '';
    const spinner = /_loading/i.test(text);
    const errs = [...main.querySelectorAll('p')].map(p => p.textContent.trim())
      .filter(t => /^\\/\\/\\s*(?!tip|test|explorer|admin-panel|after)/i.test(t) && /error|fail|invalid|unauthor|cannot|not found|unexpected/i.test(t));
    return { heading: (main.querySelector('h1')||{}).innerText || '', text: text.replace(/\\n+/g, ' | ').slice(0, 300), spinner, errs };
  })()`);
  const rendered = state.heading && !state.spinner && state.errs.length === 0 && expect.test(state.text);
  check(`${tabName.padEnd(10)} renders`, rendered, `${state.heading} ${state.spinner ? "[still loading]" : ""} ${state.errs.join("") || ""}`.slice(0, 150));
}

console.log(`\n════════ ${pass} passed, ${fail} failed ════════`);
ws.close();
try { process.kill(-chrome.pid); } catch { /* gone */ }
process.exit(fail ? 1 : 0);
