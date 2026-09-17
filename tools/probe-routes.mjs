/* Every PUBLIC route, three viewports, in one real browser.
   Flags: blank render, error text, stuck loader, horizontal overflow,
   broken images, uncaught JS, and requests that failed.

   Verified against the DEV server: `BOOT=dev` boots vite on a throwaway port
   (a stale server on a fixed port once made a broken build look fine). */
import { spawn } from "node:child_process";
import net from "node:net";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const ROUTES = ["/", "/about", "/project", "/blog", "/blog/welcome-to-my-blog", "/contact", "/a-page-that-does-not-exist"];
const SIZES = [
  { name: "desktop", w: 1440, h: 900 },
  { name: "phone", w: 390, h: 844 },
  { name: "tiny", w: 320, h: 640 },
];

let procs = [];
const port = await new Promise((res) => {
  const s = net.createServer();
  s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); });
});

let base;
if (process.env.BOOT === "dev" || process.env.BOOT === "node") {
  const argv = process.env.BOOT === "dev"
    ? ["node_modules/vite/bin/vite.js", "--port", String(port), "--strictPort"]
    : ["server.js"];
  const p = spawn(process.execPath, argv, {
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  p.stdout.on("data", () => {}); p.stderr.on("data", () => {});
  procs.push(p);
  for (let i = 0; i < 90; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try { if ((await fetch(`http://127.0.0.1:${port}/api/projects.json`)).ok) { base = `http://127.0.0.1:${port}`; break; } } catch {}
  }
} else {
  base = (process.env.TARGET || "").replace(/\/$/, "");
}
if (!base) { console.log("no server"); process.exit(1); }
console.log("base:", base);

const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PROF = path.join(os.tmpdir(), "hermes-routes-" + Date.now());
const cdpPort = 9600 + Math.floor(Math.random() * 300);
const ch = spawn(CHROME, [
  "--headless=new", `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${PROF}`,
  "--no-first-run", "--no-default-browser-check", "--disable-extensions",
  "--window-size=1440,900", "about:blank",
], { stdio: ["ignore", "pipe", "pipe"] });
ch.stdout.on("data", () => {}); ch.stderr.on("data", () => {});
procs.push(ch);

let target = null;
for (let i = 0; i < 60; i++) {
  await new Promise((r) => setTimeout(r, 500));
  try {
    const list = await (await fetch(`http://127.0.0.1:${cdpPort}/json/list`)).json();
    target = list.find((t) => t.type === "page");
    if (target?.webSocketDebuggerUrl) break;
  } catch {}
}
if (!target) { console.log("chrome never came up"); procs.forEach((p) => { try { p.kill(); } catch {} }); process.exit(1); }

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map();
let consoleErrs = [], failed = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); }
  if (m.method === "Runtime.exceptionThrown") {
    consoleErrs.push((m.params?.exceptionDetails?.exception?.description || m.params?.exceptionDetails?.text || "?").split("\n")[0].slice(0, 140));
  }
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
    consoleErrs.push((m.params.args || []).map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 140));
  }
  if (m.method === "Network.loadingFailed") failed.push((m.params?.errorText || "?") + " " + (m.params?.type || ""));
};
const send = (method, params = {}) => new Promise((res) => { const i = ++id; pend.set(i, res); ws.send(JSON.stringify({ id: i, method, params })); });
const ev = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, awaitPromise: true, returnByValue: true });
  if (r.result?.exceptionDetails) return { __err: r.result.exceptionDetails.text };
  return r.result?.result?.value;
};

await send("Runtime.enable"); await send("Page.enable"); await send("Network.enable");
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

const SNAP = `(() => {
  const root = document.getElementById('root');
  const txt = (root ? root.innerText : document.body.innerText) || '';
  const bodyLen = txt.replace(/\\s+/g,' ').trim().length;
  const de = document.documentElement;
  const overflow = de.scrollWidth - de.clientWidth;
  const loader = document.querySelector('.boot-loader, [class*="BootLoader"], [class*="skeleton"], [class*="Skeleton"]');
  const loaderVisible = !!(loader && loader.getBoundingClientRect().height > 0);
  const errText = (txt.match(/(Something went wrong|Unexpected error|Cannot read|is not a function|TypeError|Failed to fetch)/i) || [''])[0];
  const imgs = Array.from(document.images);
  const broken = imgs.filter(i => i.complete && i.naturalWidth === 0).map(i => (i.currentSrc||i.src).slice(-60));
  return { bodyLen, bodyTail: txt.replace(/\\s+/g,' ').trim().slice(0,110), overflow, loaderVisible, errText, broken, imgs: imgs.length };
})()`;

let bad = 0;
for (const size of SIZES) {
  await send("Emulation.setDeviceMetricsOverride", { width: size.w, height: size.h, deviceScaleFactor: 1, mobile: size.w < 700 });
  console.log(`\n════════ ${size.name} ${size.w}x${size.h} ════════`);
  for (const route of ROUTES) {
    consoleErrs = []; failed = [];
    await send("Page.navigate", { url: base + route });
    // wait for the app to mount and settle
    let s = null;
    for (let i = 0; i < 30; i++) {
      await sleep(500);
      s = await ev(SNAP);
      if (s && !s.__err && !s.loaderVisible && s.bodyLen > 200) break;
    }
    /* On a phone, /about and /project legitimately open as collapsed
       accordions (~107 chars of headers). Tapping the first header must
       reveal the content — that is the real assertion, not a length
       threshold, which would report a working page as blank forever. */
    if (size.w < 700 && (route === "/about" || route === "/project")) {
      const tapped = await ev(`(() => {
        const h = Array.from(document.querySelectorAll('h2'))
          .find(e => /personal-info|^projects/i.test((e.innerText||'').trim()));
        if (!h) return false;
        h.click();
        return true;
      })()`);
      await sleep(1500);
      const after = await ev(SNAP);
      if (!tapped) console.log(`  ..   ${route.padEnd(34)} no accordion header found`);
      else if (after?.bodyLen > 400) s = after;
    }

    const issues = [];
    if (!s || s.__err) issues.push("eval-error " + (s?.__err || ""));
    else {
      if (s.bodyLen <= 200) issues.push("BLANK(" + s.bodyLen + ")");
      if (s.loaderVisible) issues.push("STUCK LOADER");
      if (s.errText) issues.push("ERR TEXT: " + s.errText);
      if (s.overflow > 2) issues.push("OVERFLOW +" + s.overflow);
      if (s.broken.length) issues.push("BROKEN IMG " + s.broken.join(","));
    }
    if (consoleErrs.length) issues.push("JS: " + consoleErrs[0]);
    const hardFail = failed.filter((f) => !/favicon|ERR_ABORTED/.test(f));
    if (hardFail.length) issues.push("REQFAIL: " + hardFail[0].slice(0, 70));
    if (issues.length) bad++;
    console.log(`  ${issues.length ? "FAIL" : "ok  "} ${route.padEnd(34)} len=${String(s?.bodyLen ?? "?").padEnd(5)} ${issues.join(" | ").slice(0, 150)}`);
  }
}

console.log(`\n════════ ${bad} problem(s) ════════`);
try { fs.rmSync(PROF, { recursive: true, force: true, maxRetries: 3 }); } catch {}
for (const p of procs) { try { p.kill(); } catch {} }
process.exit(0);
