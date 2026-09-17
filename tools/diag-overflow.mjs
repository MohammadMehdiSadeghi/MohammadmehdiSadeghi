/* Find WHICH element causes the horizontal overflow at a given width.
   Walks the DOM and reports every element whose right edge exceeds the
   viewport (or whose scrollWidth exceeds its clientWidth), deepest/largest
   first, with its selector path so it can be fixed.

     TARGET=... PAGE=/ WIDTH=1100 node tools/diag-overflow.mjs */
import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs";

const TARGET = (process.env.TARGET || "https://mohammad-mehdi-sadeghi.vercel.app").replace(/\/$/, "");
const PAGE = process.env.PAGE || "/";
const WIDTH = Number(process.env.WIDTH || 1100);
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PROFILE = (process.env.LOCALAPPDATA || "/tmp") + "/Temp/chrome-overflow";
const PORT = 9346;
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
await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: 900, deviceScaleFactor: 1, mobile: false }, S);
const ev = async (e) => {
  const r = await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }, S);
  if (r.exceptionDetails) return { __err: r.exceptionDetails.text };
  return r.result.value;
};

await send("Page.navigate", { url: TARGET + "/" }, S);

/* WAIT FOR THE TYPING TO FINISH. The h1 types its text in, so before it
   completes the element has no intrinsic width and the page measures clean;
   the overflow only exists once the name is on screen. Measuring early is how
   you get two contradictory answers from the same width. */
let settled = false;
for (let i = 0; i < 40; i++) {
  await new Promise((r) => setTimeout(r, 500));
  settled = await ev(`(() => {
    const h1 = document.querySelector('h1');
    return !!h1 && h1.getAttribute('data-typed') === 'done' && (h1.innerText || '').length > 5;
  })()`);
  if (settled === true) break;
}
if (settled !== true) console.log("  (warning: typing never reported done)");
await new Promise((r) => setTimeout(r, 800));

const report = await ev(`(() => {
  const W = window.innerWidth;
  const path = (el) => {
    const bits = [];
    let n = el;
    while (n && n.nodeType === 1 && bits.length < 6) {
      let s = n.tagName.toLowerCase();
      if (n.id) s += '#' + n.id;
      else if (n.className && typeof n.className === 'string') {
        s += '.' + n.className.trim().split(/\\s+/).slice(0, 3).join('.');
      }
      bits.unshift(s);
      n = n.parentElement;
    }
    return bits.join(' > ');
  };
  const out = [];
  for (const el of document.querySelectorAll('*')) {
    const st = getComputedStyle(el);
    if (st.display === 'none' || st.visibility === 'hidden') continue;
    const r = el.getBoundingClientRect();
    if (r.width === 0 && r.height === 0) continue;
    const overRight = Math.round(r.right - W);
    const scrollOver = el.scrollWidth - el.clientWidth;
    if (overRight > 1 || (scrollOver > 1 && st.overflowX !== 'hidden' && st.overflowX !== 'clip')) {
      out.push({
        path: path(el),
        right: Math.round(r.right),
        overRight,
        width: Math.round(r.width),
        scrollOver,
        pos: st.position,
        overflowX: st.overflowX,
        text: (el.innerText || '').replace(/\\s+/g, ' ').slice(0, 60),
        childCount: el.children.length,
      });
    }
  }
  // keep the outermost offenders: an overflowing parent explains its children
  out.sort((a, b) => (b.overRight + b.scrollOver) - (a.overRight + a.scrollOver));
  return {
    viewport: W,
    docScrollW: document.documentElement.scrollWidth,
    bodyScrollW: document.body.scrollWidth,
    offenders: out.slice(0, 14),
  };
})()`);

console.log(JSON.stringify(report, null, 1));
ws.close();
try { process.kill(-chrome.pid); } catch { /* gone */ }
process.exit(0);
