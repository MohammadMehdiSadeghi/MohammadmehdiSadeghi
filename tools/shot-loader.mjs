/* Screenshot the new loading screen so a human can judge it, plus a
   transition caught mid-flight. */
import express from "express";
import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import fsp from "node:fs/promises";

const BASE = process.cwd();
const DIST = path.join(BASE, "dist");
const OUT = path.join(process.env.LOCALAPPDATA || "/tmp", "Temp", "loader-shots");
await fsp.mkdir(OUT, { recursive: true });

const app = express();
const indexHtml = fs.readFileSync(path.join(DIST, "index.html"), "utf8").replace(/(["'(])\.\//g, "$1/");
app.use(express.static(DIST, { index: false }));
app.use("/assets", express.static(path.join(BASE, "public/assets")));
app.get(/^(?!\/api\/).*/, (req, res) => res.type("html").send(indexHtml));
const PORT = 4853;
const server = app.listen(PORT);
await new Promise((r) => server.once("listening", r));
const SITE = `http://127.0.0.1:${PORT}`;

const CDP = 9367;
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", [
  `--remote-debugging-port=${CDP}`,
  `--user-data-dir=${(process.env.LOCALAPPDATA || "/tmp")}/Temp/chrome-shot`,
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
const shot = async (name) => {
  const r = await send("Page.captureScreenshot", { format: "png" }, sessionId);
  const p = path.join(OUT, name);
  await fsp.writeFile(p, Buffer.from(r.data, "base64"));
  console.log("saved", p);
};
const ev = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }, sessionId)).result?.value;

try {
  for (const [w, h, tag] of [[1440, 900, "desktop"], [390, 844, "phone"]]) {
    await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 }, sessionId);
    await send("Page.navigate", { url: SITE }, sessionId);
    await sleep(1300);
    await ev("sessionStorage.removeItem('booted')");
    await send("Page.navigate", { url: `${SITE}/project` }, sessionId);
    await sleep(260);
    await shot(`boot-${tag}.png`);

    /* and catch the between-pages veil mid-flight */
    await sleep(2400);
    await ev(`(() => { const l = Array.from(document.querySelectorAll('header a')).find(a => a.textContent.trim() === '_Blog' && !a.closest('.mobile-nav-panel')); l && l.click(); return true; })()`);
    await sleep(500);
    await shot(`transition-${tag}.png`);
    await sleep(2500);
  }
} finally {
  sock.close(); chrome.kill(); server.close();
  await fsp.rm(`${(process.env.LOCALAPPDATA || "/tmp")}/Temp/chrome-shot`, { recursive: true, force: true }).catch(() => {});
}
