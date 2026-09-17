/* Screenshot the in-page skeletons (stalling /api so they're visible) and the
   reverted transition veil, at desktop + phone. For human review. */
import express from "express";
import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import fsp from "node:fs/promises";

const BASE = process.cwd();
const DIST = path.join(BASE, "dist");
const OUT = path.join(process.env.LOCALAPPDATA || "/tmp", "Temp", "loader-shots2");
await fsp.mkdir(OUT, { recursive: true });

const app = express();
const indexHtml = fs.readFileSync(path.join(DIST, "index.html"), "utf8").replace(/(["'(])\.\//g, "$1/");
app.use(express.static(DIST, { index: false }));
app.use("/assets", express.static(path.join(BASE, "public/assets")));
app.use("/api", express.static(path.join(BASE, "public/api")));
app.get("/api/blog", (req, res) => {
  const all = JSON.parse(fs.readFileSync(path.join(BASE, "public/api/blog.json"), "utf8"));
  const posts = all.filter((p) => p.published);
  if (req.query.slug) { const one = posts.find((p) => p.slug === req.query.slug); return one ? res.json({ post: one }) : res.status(404).json({}); }
  res.json({ posts: posts.map(({ content, ...r }) => r) });
});
app.get(/^(?!\/api\/).*/, (req, res) => res.type("html").send(indexHtml));
const PORT = 4861;
const server = app.listen(PORT);
await new Promise((r) => server.once("listening", r));
const SITE = `http://127.0.0.1:${PORT}`;

const CDP = 9377;
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", [
  `--remote-debugging-port=${CDP}`,
  `--user-data-dir=${(process.env.LOCALAPPDATA || "/tmp")}/Temp/chrome-shot2`,
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
let id = 0; const pend = new Map(); const stalled = [];
sock.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
  else if (m.method === "Fetch.requestPaused") stalled.push(m.params.requestId);
});
const send = (method, params = {}, sid) => new Promise((res) => { const mid = ++id; pend.set(mid, res); sock.send(JSON.stringify({ id: mid, method, params, sessionId: sid })); });
const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
await send("Page.enable", {}, sessionId);
await send("Runtime.enable", {}, sessionId);
const shot = async (n) => {
  const r = await send("Page.captureScreenshot", { format: "png" }, sessionId);
  await fsp.writeFile(path.join(OUT, n), Buffer.from(r.data, "base64"));
  console.log("saved", path.join(OUT, n));
};
const release = async () => { for (const rid of stalled.splice(0)) await send("Fetch.continueRequest", { requestId: rid }, sessionId).catch(() => {}); };

try {
  for (const [w, h, tag] of [[1440, 900, "desktop"], [390, 844, "phone"]]) {
    await send("Emulation.setDeviceMetricsOverride", { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 }, sessionId);

    /* project grid skeleton */
    await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/*" }] }, sessionId);
    await send("Page.navigate", { url: `${SITE}/project` }, sessionId);
    await sleep(900);
    await shot(`skeleton-projects-${tag}.png`);
    await release();
    await sleep(900);

    /* blog list skeleton */
    await send("Page.navigate", { url: `${SITE}/blog` }, sessionId);
    await sleep(900);
    await shot(`skeleton-blog-${tag}.png`);
    await release();
    await sleep(1400);

    /* the transition veil (reverted look) */
    await send("Fetch.disable", {}, sessionId);
    await send("Page.navigate", { url: SITE }, sessionId);
    await sleep(2400);
    const clicked = await eval?.("1");
    await send("Runtime.evaluate", { expression: `(() => { const l = Array.from(document.querySelectorAll('header a')).find(a => a.textContent.trim() === '_Project' && !a.closest('.mobile-nav-panel')); l && l.click(); return !!l; })()`, returnByValue: true }, sessionId);
    await sleep(420);
    await shot(`transition-${tag}.png`);
    await sleep(2200);
  }
} finally {
  sock.close(); chrome.kill(); server.close();
  await fsp.rm(`${(process.env.LOCALAPPDATA || "/tmp")}/Temp/chrome-shot2`, { recursive: true, force: true }).catch(() => {});
}
