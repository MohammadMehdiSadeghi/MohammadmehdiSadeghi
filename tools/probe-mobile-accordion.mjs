/* Mobile /about and /project render ~107 chars — just two collapsed headers.
   Is that a broken page or an accordion that needs a tap? Tap the headers and
   see whether the content actually appears. Never call it a bug before this. */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import net from "node:net";

let procs = [];
let base = (process.env.TARGET || "").replace(/\/$/, "");
if (!base) {
  const port = await new Promise((res) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); });
  });
  const srv = spawn(process.execPath, ["server.js"], { env: { ...process.env, PORT: String(port) }, stdio: ["ignore", "pipe", "pipe"] });
  srv.stdout.on("data", () => {}); srv.stderr.on("data", () => {});
  procs.push(srv);
  base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 80; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try { if ((await fetch(base + "/api/projects.json")).ok) break; } catch {}
  }
}
console.log("base:", base);

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PROF = path.join(os.tmpdir(), "hermes-tap-" + Date.now());
const cdpPort = 9700 + Math.floor(Math.random() * 90);
const ch = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${PROF}`,
  "--no-first-run", "--window-size=390,844", "about:blank"], { stdio: ["ignore", "pipe", "pipe"] });
ch.stdout.on("data", () => {}); ch.stderr.on("data", () => {});
procs.push(ch);

let target = null;
for (let i = 0; i < 60; i++) {
  await new Promise((r) => setTimeout(r, 500));
  try {
    const l = await (await fetch(`http://127.0.0.1:${cdpPort}/json/list`)).json();
    target = l.find((t) => t.type === "page");
    if (target?.webSocketDebuggerUrl) break;
  } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async (x) => (await send("Runtime.evaluate", { expression: x, awaitPromise: true, returnByValue: true })).result?.result?.value;
await send("Runtime.enable"); await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const LEN = `(() => {
  const r = document.getElementById('root');
  return { len: (r.innerText||'').replace(/\\s+/g,' ').trim().length, txt: (r.innerText||'').replace(/\\s+/g,' ').trim() };
})()`;

let fail = 0;
const check = (n, ok, d = "") => { if (!ok) fail++; console.log(`  ${ok ? "ok  " : "FAIL"} ${n} ${d}`); };

// ── /about: tap "personal-info"
await send("Page.navigate", { url: base + "/about" });
await sleep(3500);
let before = await ev(LEN);
console.log(`\n════════ /about @390px ════════\n  before tap: ${before.len} chars`);
const tapped = await ev(`(() => {
  const h = Array.from(document.querySelectorAll('h2')).find(e => /personal-info/i.test(e.innerText));
  if (!h) return 'no personal-info header';
  h.click();
  return 'clicked';
})()`);
console.log("  tap:", tapped);
await sleep(1200);
let after = await ev(LEN);
console.log(`  after tap : ${after.len} chars -> "${after.txt.slice(0, 120)}"`);
check("about: tapping personal-info reveals content", after.len > before.len + 200, `${before.len} -> ${after.len}`);

// ── /project: tap "projects"
await send("Page.navigate", { url: base + "/project" });
await sleep(3500);
before = await ev(LEN);
console.log(`\n════════ /project @390px ════════\n  before tap: ${before.len} chars`);
const tapped2 = await ev(`(() => {
  const h = Array.from(document.querySelectorAll('h2')).find(e => /^projects/i.test(e.innerText.trim()));
  if (!h) return 'no projects header';
  h.click();
  return 'clicked';
})()`);
console.log("  tap:", tapped2);
await sleep(1800);
after = await ev(LEN);
console.log(`  after tap : ${after.len} chars -> "${after.txt.slice(0, 140)}"`);
check("project: tapping projects reveals cards", after.len > before.len + 200, `${before.len} -> ${after.len}`);

console.log(`\n════════ ${fail} problem(s) ════════`);
try { fs.rmSync(PROF, { recursive: true, force: true, maxRetries: 3 }); } catch {}
for (const p of procs) { try { p.kill(); } catch {} }
process.exit(0);
