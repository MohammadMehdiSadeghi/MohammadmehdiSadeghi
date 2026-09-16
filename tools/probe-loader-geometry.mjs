/* Judge the loader GEOMETRICALLY (I cannot see images): panel centred, inside
   the viewport at every size, children aligned, nothing clipped or overlapping. */
import express from "express";
import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import fsp from "node:fs/promises";

const BASE = process.cwd();
const DIST = path.join(BASE, "dist");
const app = express();
const indexHtml = fs.readFileSync(path.join(DIST, "index.html"), "utf8").replace(/(["'(])\.\//g, "$1/");
app.use(express.static(DIST, { index: false }));
app.use("/assets", express.static(path.join(BASE, "public/assets")));
app.get(/^(?!\/api\/).*/, (req, res) => res.type("html").send(indexHtml));
const PORT = 4855;
const server = app.listen(PORT);
await new Promise((r) => server.once("listening", r));
const SITE = `http://127.0.0.1:${PORT}`;

const CDP = 9369;
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", [
  `--remote-debugging-port=${CDP}`,
  `--user-data-dir=${(process.env.LOCALAPPDATA || "/tmp")}/Temp/chrome-geom`,
  "--headless=new", "--no-first-run", "--disable-gpu", "about:blank",
], { stdio: "ignore" });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
let wsUrl = null;
for (let i = 0; i < 40; i++) {
  try { wsUrl = (await (await fetch(`http://127.0.0.1:${CDP}/json/version`)).json()).webSocketDebuggerUrl; if (wsUrl) break; } catch {}
  await sleep(250);
}
const sock = new WebSocket(wsUrl);
await new Promise((r) => sock.addEventListener("open", r, { once: true }));
let id = 0; const pend = new Map();
sock.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
});
const send = (method, params = {}, sid) => new Promise((res) => {
  const mid = ++id; pend.set(mid, res);
  sock.send(JSON.stringify({ id: mid, method, params, sessionId: sid }));
});
const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
await send("Page.enable", {}, sessionId);
await send("Runtime.enable", {}, sessionId);
const ev = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }, sessionId)).result?.value;

let pass = 0, fail = 0;
const check = (l, c, d = "") => { if (c) { pass++; console.log("  ok  ", l, d); } else { fail++; console.log("  FAIL", l, d); } };

const PROBE = `(() => {
  const veil = Array.from(document.querySelectorAll('div')).find((el) => {
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    return cs.position === 'fixed' && Number(cs.zIndex) >= 9998 &&
           r.width >= window.innerWidth - 2 && r.height >= window.innerHeight - 2;
  });
  if (!veil) return { none: true };
  const panel = veil.querySelector('div[style*="border-radius"]') || veil.querySelector('div');
  const pr = panel.getBoundingClientRect();
  const kids = Array.from(panel.children).map(c => c.getBoundingClientRect());
  const inner = panel.querySelector('div.relative.w-full') || panel;
  const innerKids = Array.from(inner.children).map(c => ({ t: c.tagName, top: Math.round(c.getBoundingClientRect().top), h: Math.round(c.getBoundingClientRect().height) }));
  return {
    vw: window.innerWidth, vh: window.innerHeight,
    panel: { x: Math.round(pr.left), y: Math.round(pr.top), w: Math.round(pr.width), h: Math.round(pr.height) },
    centreDx: Math.round(Math.abs((pr.left + pr.width/2) - window.innerWidth/2)),
    centreDy: Math.round(Math.abs((pr.top + pr.height/2) - window.innerHeight/2)),
    insideViewport: pr.left >= 0 && pr.top >= 0 && pr.right <= window.innerWidth + 0.5 && pr.bottom <= window.innerHeight + 0.5,
    clippedChildren: kids.filter(r => r.left < pr.left - 1 || r.right > pr.right + 1 || r.top < pr.top - 1 || r.bottom > pr.bottom + 1).length,
    desc: innerKids,
  };
})()`;

try {
  for (const [w, h, tag] of [[1440, 900, "desktop 1440x900"], [1024, 800, "laptop 1024x800"],
                             [768, 900, "tablet 768x900"], [390, 844, "phone 390x844"],
                             [320, 568, "small phone 320x568"]]) {
    await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 }, sessionId);
    await send("Page.navigate", { url: SITE }, sessionId);
    await sleep(1200);
    await ev("sessionStorage.removeItem('booted')");
    await send("Page.navigate", { url: `${SITE}/project` }, sessionId);
    await sleep(300);
    const m = await ev(PROBE);
    if (m.none) { check(`${tag}: loader present`, false); continue; }
    console.log(`\n  ${tag}: panel ${m.panel.w}x${m.panel.h} at (${m.panel.x},${m.panel.y})`);
    check(`${tag}: panel horizontally centred`, m.centreDx <= 2, `off by ${m.centreDx}px`);
    check(`${tag}: panel vertically centred`, m.centreDy <= 2, `off by ${m.centreDy}px`);
    check(`${tag}: panel fits the viewport`, m.insideViewport); 
    check(`${tag}: no child clipped by the panel`, m.clippedChildren === 0, `${m.clippedChildren} clipped`);
    check(`${tag}: panel is not wider than the screen`, m.panel.w <= m.vw, `${m.panel.w} vs ${m.vw}`);
    await sleep(2200);
  }
} finally {
  sock.close(); chrome.kill(); server.close();
  await fsp.rm(`${(process.env.LOCALAPPDATA || "/tmp")}/Temp/chrome-geom`, { recursive: true, force: true }).catch(() => {});
}

console.log(`\n════════ ${pass} passed, ${fail} failed ════════`);
process.exit(fail ? 1 : 0);
