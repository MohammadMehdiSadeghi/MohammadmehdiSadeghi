/* Verify the APPROVED loading screens still behave, and the new in-page
   skeletons do their job.

   The between-pages veil is deliberately plain (three dots + "loading") —
   that look was approved and a restyled version was rejected, so this test
   asserts the plain version stays, and only that its timing got shorter.

   The in-page placeholders (project grid, blog list, single post) are now
   skeletons shaped like the content they replace.
*/
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
/* the app fetches its data from /api/<name>.json — without these the pages
   render their shell and then sit there with no content, which looks exactly
   like a broken skeleton (it isn't) */
app.use("/api", express.static(path.join(BASE, "public/api")));
/* /api/blog is a real endpoint (published posts, list view), not a file */
app.get("/api/blog", (req, res) => {
  const all = JSON.parse(fs.readFileSync(path.join(BASE, "public/api/blog.json"), "utf8"));
  const posts = all.filter((p) => p.published).sort((a, b) => String(b.date).localeCompare(String(a.date)));
  if (req.query.slug) {
    const one = posts.find((p) => p.slug === req.query.slug);
    if (!one) return res.status(404).json({ error: "not found" });
    return res.json({ post: one });
  }
  res.json({ posts: posts.map(({ content, ...rest }) => rest) });
});
app.get(/^(?!\/api\/).*/, (req, res) => res.type("html").send(indexHtml));
const PORT = 4859;
const server = app.listen(PORT);
await new Promise((r) => server.once("listening", r));
const SITE = `http://127.0.0.1:${PORT}`;

const CDP = 9375;
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", [
  `--remote-debugging-port=${CDP}`,
  `--user-data-dir=${(process.env.LOCALAPPDATA || "/tmp")}/Temp/chrome-loaders2`,
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
sock.addEventListener("message", (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); } });
const send = (method, params = {}, sid) => new Promise((res) => { const mid = ++id; pend.set(mid, res); sock.send(JSON.stringify({ id: mid, method, params, sessionId: sid })); });
const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
await send("Page.enable", {}, sessionId);
await send("Runtime.enable", {}, sessionId);
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
const ev = async (expr) => (await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }, sessionId)).result?.value;

let pass = 0, fail = 0;
const check = (l, c, d = "") => { if (c) { pass++; console.log("  ok  ", l, d); } else { fail++; console.log("  FAIL", l, d); } };

const VEIL = `(() => {
  const els = Array.from(document.querySelectorAll('div'));
  return els.find((el) => {
    const cs = getComputedStyle(el); const r = el.getBoundingClientRect();
    return cs.position === 'fixed' && Number(cs.zIndex) >= 9998 &&
           r.width >= window.innerWidth - 2 && r.height >= window.innerHeight - 2;
  }) || null;
})()`;

try {
  console.log("=== 1. the approved transition veil is unchanged (plain dots) ===");
  await send("Page.navigate", { url: SITE }, sessionId);
  await sleep(2200);
  const t = await ev(`(async () => {
    const link = Array.from(document.querySelectorAll('header a')).find(a => a.textContent.trim() === '_Project' && !a.closest('.mobile-nav-panel'));
    const t0 = performance.now(); let seen = false, gone = null, nav = null; const start = location.pathname;
    link.click();
    await new Promise((res) => { const iv = setInterval(() => {
      const v = ${VEIL}; if (v) seen = true;
      if (location.pathname !== start && nav === null) nav = performance.now() - t0;
      if (seen && !v) { gone = performance.now() - t0; clearInterval(iv); res(); }
    }, 16); setTimeout(() => { clearInterval(iv); res(); }, 4000); });
    return { seen, nav: nav && Math.round(nav), gone: gone && Math.round(gone), at: location.pathname };
  })()`);
  console.log("  measured:", JSON.stringify(t));
  check("veil appears on click", t.seen === true);
  check("navigation under the veil", t.at === "/project", String(t.at));
  check("~100ms faster than the previous build", t.gone !== null && t.gone < 1900, `${t.gone}ms`);

  const veilMarkup = await ev(`(async () => {
    const link = Array.from(document.querySelectorAll('header a')).find(a => a.textContent.trim() === '_About' && !a.closest('.mobile-nav-panel'));
    link.click();
    await new Promise(r => setTimeout(r, 350));
    const v = ${VEIL};
    if (!v) return { none: true };
    const svg = v.querySelector('svg');
    return {
      circles: svg ? svg.querySelectorAll('circle').length : 0,
      color: svg ? getComputedStyle(svg).color : "",
      text: v.innerText.trim(),
      hasMonogram: !!Array.from(v.querySelectorAll('span')).find(s => s.textContent.trim() === 'MM'),
    };
  })()`);
  console.log("  veil markup:", JSON.stringify(veilMarkup));
  check("still exactly 3 dots", veilMarkup.circles === 3, `${veilMarkup.circles}`);
  check("keeps the indigo accent", /97,\s*95,\s*255/.test(veilMarkup.color || ""), veilMarkup.color);
  check("still just says 'loading'", /^loading/.test(veilMarkup.text || ""), JSON.stringify(veilMarkup.text));
  check("no monogram injected into the veil", veilMarkup.hasMonogram === false);
  await sleep(2600);

  console.log("\n=== 2. in-page skeletons replace the cream dots ===");

  /* The data is a static JSON file, so it resolves in a few ms and the
     skeleton would never be on screen to inspect. Stall the API for a moment
     so the loading state is actually observable — this is the only honest way
     to test a placeholder whose whole job is to exist briefly. */
  await send("Fetch.enable", { patterns: [{ urlPattern: "*/api/*" }] }, sessionId);
  const stalled = [];
  const onPaused = async (m) => { stalled.push(m.params.requestId); };
  const listener = (e) => {
    const m = JSON.parse(e.data);
    if (m.method === "Fetch.requestPaused") onPaused(m);
  };
  sock.addEventListener("message", listener);
  const releaseStalls = async () => {
    for (const rid of stalled.splice(0)) {
      await send("Fetch.continueRequest", { requestId: rid }, sessionId).catch(() => {});
    }
  };
  const stallFor = async (ms) => {
    const t0 = Date.now();
    while (Date.now() - t0 < ms) { await sleep(120); }
    await releaseStalls();
  };

  await send("Page.navigate", { url: `${SITE}/project` }, sessionId);
  await stallFor(700); /* keep the skeleton up long enough to inspect */
  await releaseStalls();

  const grab = `(() => {
    const bars = document.querySelectorAll('.skeleton-bar');
    const card = document.querySelector('[role="status"]');
    const cream = Array.from(document.querySelectorAll('svg[color]')).filter(s => /255,\s*184,\s*106/.test(getComputedStyle(s).color));
    return {
      bars: bars.length,
      status: !!card,
      srText: card ? card.querySelector('.sr-only')?.textContent || "" : "",
      creamDots: cream.length,
      cardShape: card ? getComputedStyle(card).display : "none",
    };
  })()`;

  const proj = await ev(grab);
  console.log("  /project:", JSON.stringify(proj));
  check("project grid shows skeleton bars", proj.bars > 0, `${proj.bars} bars`);
  check("skeleton is a grid, matching the real layout", proj.cardShape === "grid", proj.cardShape);
  check("no cream dots anywhere", proj.creamDots === 0, `${proj.creamDots} found`);
  check("screen readers are told it is loading", /loading/i.test(proj.srText), JSON.stringify(proj.srText));

  await send("Page.navigate", { url: `${SITE}/blog` }, sessionId);
  await stallFor(700);
  const blog = await ev(grab);
  await releaseStalls();
  console.log("  /blog:", JSON.stringify(blog));
  check("blog list shows skeleton cards", blog.bars > 0, `${blog.bars} bars`);
  check("blog: no cream dots", blog.creamDots === 0);

  console.log("\n=== 3. skeletons settle into real content ===");
  await releaseStalls();
  await sleep(2600);
  const settled = await ev(`(() => ({
    bars: document.querySelectorAll('.skeleton-bar').length,
    status: document.querySelectorAll('[role="status"]').length,
    articles: document.querySelectorAll('article').length,
  }))()`);
  console.log("  settled:", JSON.stringify(settled));
  check("skeletons are gone once loaded", settled.bars === 0, `${settled.bars} left`);
  check("real content is present", settled.articles > 0, `${settled.articles} articles`);
} finally {
  sock.close(); chrome.kill(); server.close();
  await fsp.rm(`${(process.env.LOCALAPPDATA || "/tmp")}/Temp/chrome-loaders2`, { recursive: true, force: true }).catch(() => {});
}

console.log(`\n════════ ${pass} passed, ${fail} failed ════════`);
process.exit(fail ? 1 : 0);
