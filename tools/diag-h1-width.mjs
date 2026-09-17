/* Why is the left column still 800px wide? Dump the h1 itself plus every
   ancestor, with the property that decides each width. */
import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs";

const TARGET = process.env.TARGET || "http://127.0.0.1:5299";
const WIDTH = Number(process.env.WIDTH || 1100);
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PROFILE = (process.env.LOCALAPPDATA || "/tmp") + "/Temp/chrome-h1";
const PORT = 9348;
try { fs.rmSync(PROFILE, { recursive: true, force: true, maxRetries: 3 }); } catch { /* in use */ }
const chrome = spawn(CHROME, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "about:blank"], { detached: true, stdio: "ignore" });
chrome.unref();
const get = (u) => new Promise((res, rej) => { http.get(u, (r) => { let d = ""; r.on("data", (c) => (d += c)); r.on("end", () => res(JSON.parse(d))); }).on("error", rej); });
let version = null;
for (let i = 0; i < 40; i++) { try { version = await get(`http://127.0.0.1:${PORT}/json/version`); break; } catch { await new Promise((r) => setTimeout(r, 500)); } }
const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map();
ws.onmessage = (m) => { const msg = JSON.parse(m.data); if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result); } };
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => { const myId = ++id; pending.set(myId, { resolve, reject }); ws.send(JSON.stringify({ id: myId, method, params, sessionId })); });
const tab = await send("Target.createTarget", { url: "about:blank" });
const { sessionId: S } = await send("Target.attachToTarget", { targetId: tab.targetId, flatten: true });
await send("Page.enable", {}, S); await send("Runtime.enable", {}, S);
await send("Emulation.setDeviceMetricsOverride", { width: WIDTH, height: 900, deviceScaleFactor: 1, mobile: false }, S);
const ev = async (e) => { const r = await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }, S); if (r.exceptionDetails) return { __err: r.exceptionDetails.text }; return r.result.value; };
await send("Page.navigate", { url: TARGET + "/" }, S);

/* WAIT FOR THE TYPING TO FINISH. The h1 types its text in, so before it
   completes the element has no intrinsic width and the page measures clean;
   the overflow only exists once the name is on screen. Measuring early is how
   you get two contradictory answers from the same width. */
/* Wait for the h1 to actually contain the full name — data-typed is not a
   reliable signal, the text length is. */
let len = 0;
for (let i = 0; i < 60; i++) {
  await new Promise((r) => setTimeout(r, 500));
  len = await ev(`(() => { const h = document.querySelector('h1'); return h ? (h.innerText || '').trim().length : 0; })()`);
  if (typeof len === "number" && len >= 22) break;   // "Mohammad Mehdi Sadeghi"
}
await new Promise((r) => setTimeout(r, 600));

const out = await ev(`(() => {
  const h1 = document.querySelector('h1');
  if (!h1) return { err: 'no h1' };
  const chain = [];
  let n = h1;
  while (n && n.nodeType === 1) {
    const r = n.getBoundingClientRect();
    const st = getComputedStyle(n);
    chain.push({
      tag: n.tagName.toLowerCase(),
      cls: (n.className || '').toString().slice(0, 70),
      w: Math.round(r.width), right: Math.round(r.right),
      cssW: st.width, minW: st.minWidth, maxW: st.maxWidth,
      flex: st.flex, flexBasis: st.flexBasis, display: st.display,
      ws: st.whiteSpace, text: (n.innerText || '').replace(/\\s+/g, ' ').slice(0, 30),
    });
    n = n.parentElement;
  }
  /* what width does the text WANT if nothing constrains it? */
  const probe = document.createElement('span');
  probe.textContent = 'Mohammad Mehdi Sadeghi';
  probe.style.cssText = 'position:absolute;visibility:hidden;white-space:nowrap;font:' + getComputedStyle(h1).font;
  document.body.appendChild(probe);
  const intrinsic = Math.round(probe.getBoundingClientRect().width);
  probe.remove();
  return { viewport: window.innerWidth, doc: document.documentElement.scrollWidth, intrinsic, chain };
})()`);
console.log(JSON.stringify(out, null, 1));
ws.close();
try { process.kill(-chrome.pid); } catch { /* gone */ }
process.exit(0);
