/* Measure homepage horizontal overflow at many widths, in ONE browser
   session, waiting for the TypeIt animation to finish before each sample.

   Why one session: the animation is the whole problem. Before the h1 finishes
   typing, the text has no intrinsic width and every width looks clean; the
   overflow only exists afterwards. Sampling early produced two contradictory
   answers for the same viewport, so this waits on the text length.

     TARGET=http://127.0.0.1:5299 node tools/probe-home-widths.mjs */
import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs";

const TARGET = (process.env.TARGET || "http://127.0.0.1:5299").replace(/\/$/, "");
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PROFILE = (process.env.LOCALAPPDATA || "/tmp") + "/Temp/chrome-widths";
const PORT = 9350;
try { fs.rmSync(PROFILE, { recursive: true, force: true, maxRetries: 3 }); } catch { /* in use */ }

const chrome = spawn(CHROME, [
  `--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "about:blank",
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
const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  }
};
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const myId = ++id; pending.set(myId, { resolve, reject });
  ws.send(JSON.stringify({ id: myId, method, params, sessionId }));
});
const tab = await send("Target.createTarget", { url: "about:blank" });
const { sessionId: S } = await send("Target.attachToTarget", { targetId: tab.targetId, flatten: true });
await send("Page.enable", {}, S); await send("Runtime.enable", {}, S);
const ev = async (e) => {
  const r = await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }, S);
  if (r.exceptionDetails) return { __err: r.exceptionDetails.text };
  return r.result.value;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const WIDTHS = [1920, 1600, 1440, 1366, 1280, 1200, 1152, 1100, 1050, 1024, 992, 900, 820, 768, 700, 600, 480, 414, 390, 360, 320];
const PAGES = ["/", "/about", "/project", "/blog", "/contact"];

let pass = 0, fail = 0;
const check = (l, c, d = "") => { c ? (pass++, console.log("  ok  ", l, d)) : (fail++, console.log("  FAIL", l, d)); };

for (const page of PAGES) {
  console.log(`\n════ ${page} ════`);
  for (const w of WIDTHS) {
    await send("Emulation.setDeviceMetricsOverride", { width: w, height: 900, deviceScaleFactor: 1, mobile: w < 500 }, S);
    await send("Page.navigate", { url: TARGET + page }, S);
    await sleep(w < 500 ? 2200 : 2600);

    /* wait for the home page's typing to settle (other pages are instant) */
    if (page === "/") {
      for (let i = 0; i < 40; i++) {
        const len = await ev(`(() => { const h = document.querySelector('h1'); return h ? (h.innerText||'').trim().length : -1; })()`);
        if (len >= 22 || len === -1) break;
        await sleep(400);
      }
      await sleep(500);
    }
    const m = await ev(`JSON.stringify({ doc: document.documentElement.scrollWidth, vp: window.innerWidth })`);
    const { doc, vp } = JSON.parse(m);
    check(`${page} @ ${String(w).padStart(4)}px`, doc <= vp + 1, `scrollW=${doc} win=${vp}`);
  }
}

console.log(`\n════════ ${pass} passed, ${fail} failed ════════`);
ws.close();
try { process.kill(-chrome.pid); } catch { /* gone */ }
process.exit(fail ? 1 : 0);
