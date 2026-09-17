/* Dump the geometry + key computed styles of the home page's layout tree at
   one width, so an overflow can be explained rather than guessed at.

     WIDTH=1100 node tools/diag-home-layout.mjs */
import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs";

const TARGET = (process.env.TARGET || "https://mohammad-mehdi-sadeghi.vercel.app").replace(/\/$/, "");
const WIDTH = Number(process.env.WIDTH || 1100);
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PROFILE = (process.env.LOCALAPPDATA || "/tmp") + "/Temp/chrome-home-layout";
const PORT = 9347;
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

const dump = await ev(`(() => {
  const d = (el) => {
    if (!el) return null;
    const r = el.getBoundingClientRect();
    const st = getComputedStyle(el);
    return {
      tag: el.tagName.toLowerCase(),
      cls: (el.className || '').toString().slice(0, 90),
      x: Math.round(r.x), right: Math.round(r.right), w: Math.round(r.width),
      cssW: st.width, maxW: st.maxWidth, minW: st.minWidth,
      flex: st.flex, display: st.display, gap: st.gap, padding: st.padding,
      marginLeft: st.marginLeft, marginRight: st.marginRight,
    };
  };
  const row = document.querySelector('.home-page-div');
  const out = { viewport: window.innerWidth, doc: document.documentElement.scrollWidth };
  out.row = d(row);
  if (row) {
    out.children = Array.from(row.children).map(d);
    /* go one level deeper into the overflowing child */
    const deep = [];
    for (const c of row.children) {
      for (const g of c.children) deep.push(d(g));
      for (const g of c.querySelectorAll(':scope > * > *')) deep.push(d(g));
    }
    out.grandchildren = deep.slice(0, 14);
  }
  out.header = d(document.querySelector('header'));
  out.navLinks = Array.from(document.querySelectorAll('header a, header nav a')).map(el => {
    const r = el.getBoundingClientRect();
    return { t: (el.innerText||'').trim().slice(0, 14), x: Math.round(r.x), right: Math.round(r.right), w: Math.round(r.width), display: getComputedStyle(el).display };
  }).filter(l => l.w > 0);
  return out;
})()`);
console.log(JSON.stringify(dump, null, 1));
ws.close();
try { process.kill(-chrome.pid); } catch { /* gone */ }
process.exit(0);
