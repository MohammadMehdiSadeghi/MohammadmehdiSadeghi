/* Verify the new loading screen renders and that the between-pages
   transition is measurably 100ms shorter than before.

   Before: NAVIGATE_AFTER 700 + HOLD_OUT 1300 (veil visible ~700 to 700+1300)
   After:  NAVIGATE_AFTER 600 + HOLD_OUT 1200

   Measures the real thing in Chrome: click an internal link, time from click
   until the veil is gone, and confirm the loader's new elements are present.
*/
import express from "express";
import path from "node:path";
import fs from "node:fs";
import { spawn } from "node:child_process";
import fsp from "node:fs/promises";

const BASE = process.cwd();
const DIST = path.join(BASE, "dist");
const app = express();
/* serve index.html with absolute asset paths, the way Vercel does — the
   local build's base is "./" and deep links would otherwise load no bundle */
const indexHtml = fs.readFileSync(path.join(DIST, "index.html"), "utf8").replace(/(["'(])\.\//g, "$1/");
app.use(express.static(DIST, { index: false }));
app.use("/assets", express.static(path.join(BASE, "public/assets")));
app.get(/^(?!\/api\/).*/, (req, res) => res.type("html").send(indexHtml));
const PORT = 4851;
const server = app.listen(PORT);
await new Promise((r) => server.once("listening", r));
const SITE = `http://127.0.0.1:${PORT}`;

const CDP = 9365;
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", [
  `--remote-debugging-port=${CDP}`,
  `--user-data-dir=${(process.env.LOCALAPPDATA || "/tmp")}/Temp/chrome-loader`,
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
await send("Emulation.setDeviceMetricsOverride", { width: 1440, height: 900, deviceScaleFactor: 1, mobile: false }, sessionId);
const ev = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }, sessionId);
  return r.result?.value;
};

const VEIL_FN = `(() => {
  const els = Array.from(document.querySelectorAll('div'));
  return els.find((el) => {
    const cs = getComputedStyle(el);
    const r = el.getBoundingClientRect();
    return cs.position === 'fixed' && Number(cs.zIndex) >= 9998 &&
           r.width >= window.innerWidth - 2 && r.height >= window.innerHeight - 2;
  }) || null;
})()`;

const evVeil = () => ev(`(() => { const el = ${VEIL_FN}; return !!el; })()`);

let pass = 0, fail = 0;
const check = (l, c, d = "") => { if (c) { pass++; console.log("  ok  ", l, d); } else { fail++; console.log("  FAIL", l, d); } };

try {
  console.log("=== 1. first-paint loader ===");
  /* clear the once-per-session flag so the boot loader actually runs */
  await send("Page.navigate", { url: SITE }, sessionId);
  await sleep(1200);
  await ev("sessionStorage.removeItem('booted')");
  await send("Page.navigate", { url: `${SITE}/about` }, sessionId);
  await sleep(320); /* inside the 420ms floor: still up */

  const boot = await ev(`(() => {
    const panel = ${VEIL_FN};
    const t = panel ? panel.innerText : "";
    return {
      present: !!panel,
      hasWordmark: t.includes("Mohammad-Mehdi-Sadeghi"),
      hasRole: /frontend developer/i.test(t),
      hasLoading: /loading/i.test(t),
      monogram: !!panel && !!Array.from(panel.querySelectorAll("span")).find(s => s.textContent.trim() === "MM"),
      dots: !!panel?.querySelector('svg circle'),
      bar: !!panel?.querySelector('span[style*="loadBar"]'),
      corners: panel ? Array.from(panel.querySelectorAll("span")).filter(s => /solid/.test(s.getAttribute("style") || "")).length : 0,
    };
  })()`);
  check("boot loader is on screen at first paint", boot.present);
  check("shows the wordmark", boot.hasWordmark);
  check("shows a role line", boot.hasRole, "frontend developer · portfolio");
  check("keeps the 'loading' label", boot.hasLoading);
  check("has the monogram badge", boot.monogram, "MM");
  check("has the dot spinner", boot.dots);
  check("has the indeterminate bar", boot.bar);
  check("has the 4 corner brackets", boot.corners >= 4, `${boot.corners} bracket edges`);

  await sleep(2000);
  const gone = await evVeil();
  check("loader clears itself (never traps the page)", gone === false);

  console.log("\n=== 2. between-pages transition timing ===");
  await send("Page.navigate", { url: `${SITE}/` }, sessionId);
  await sleep(2200);

  /* click a real nav link and time the veil from click to gone */
  const timing = await ev(`(async () => {
    const link = Array.from(document.querySelectorAll('header a'))
      .find(a => a.textContent.trim() === '_Project' && !a.closest('.mobile-nav-panel'));
    if (!link) return { error: "no _Project link" };
    const t0 = performance.now();
    let veilSeen = false, veilGoneAt = null, navAt = null;
    const start = location.pathname;
    const findVeil = () => Array.from(document.querySelectorAll('div')).find((el) => {
      const cs = getComputedStyle(el);
      const r = el.getBoundingClientRect();
      return cs.position === 'fixed' && Number(cs.zIndex) >= 9998 &&
             r.width >= window.innerWidth - 2 && r.height >= window.innerHeight - 2;
    });
    link.click();
    await new Promise((resolve) => {
      const iv = setInterval(() => {
        const veil = findVeil();
        if (veil) veilSeen = true;
        if (location.pathname !== start && navAt === null) navAt = performance.now() - t0;
        if (veilSeen && !veil) { veilGoneAt = performance.now() - t0; clearInterval(iv); resolve(); }
      }, 16);
      setTimeout(() => { clearInterval(iv); resolve(); }, 4000);
    });
    return { veilSeen, navAt: navAt && Math.round(navAt), veilGoneAt: veilGoneAt && Math.round(veilGoneAt),
             landed: location.pathname };
  })()`);
  console.log("  measured:", JSON.stringify(timing));
  check("the veil appeared on click", timing.veilSeen === true);
  check("navigation happened under the veil", timing.navAt !== null && timing.navAt >= 550 && timing.navAt <= 800,
    `router swapped at ${timing.navAt}ms (target ~600)`);
  check("landed on /project", timing.landed === "/project", String(timing.landed));
  /* before this change the veil ran 700 + 1300 = ~2000ms */
  check("total veil time is ~100ms shorter than before",
    timing.veilGoneAt !== null && timing.veilGoneAt >= 1750 && timing.veilGoneAt <= 1950,
    `${timing.veilGoneAt}ms (was ~1900-2000)`);

  console.log("\n=== 3. the shared loader did not leak into content ===");
  const stray = await ev(`(() => ({
    onPage: !!document.querySelector('.loading-dots'),
    articlesFine: document.querySelectorAll('article').length,
  }))()`);
  check("no loader left behind after settling", stray.onPage === false);
} finally {
  sock.close(); chrome.kill(); server.close();
  await fsp.rm(`${(process.env.LOCALAPPDATA || "/tmp")}/Temp/chrome-loader`, { recursive: true, force: true }).catch(() => {});
}

console.log(`\n════════ ${pass} passed, ${fail} failed ════════`);
process.exit(fail ? 1 : 0);
