/* Broad bug hunt across the PUBLIC site (not the admin panel): every route,
   every public endpoint, three viewports. Flags console errors, failed
   requests, blank/error renders, overflow, and broken assets.

     TARGET=https://... node tools/probe-site.mjs        (default: live)
     TARGET=http://127.0.0.1:5199 node tools/probe-site.mjs

   Deliberately adversarial: it records EVERY console error / network failure
   rather than asserting a few expected strings, so unexpected breakage shows
   up instead of being filtered out. */
import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs";

const TARGET = (process.env.TARGET || "https://mohammad-mehdi-sadeghi.vercel.app").replace(/\/$/, "");
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PROFILE = (process.env.LOCALAPPDATA || "/tmp") + "/Temp/chrome-site-probe";
const PORT = 9344;
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
if (!version) { console.log("CHROME DID NOT START"); process.exit(1); }

const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pending = new Map();
let errors = [];
let fails = [];
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id);
    pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  } else if (msg.method === "Runtime.exceptionThrown") {
    errors.push((msg.params.exceptionDetails.text || "") + " " + (msg.params.exceptionDetails.exception?.description || "").split("\n")[0]);
  } else if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
    errors.push("console: " + msg.params.args.map((a) => a.value ?? a.description ?? a.type).join(" ").slice(0, 200));
  } else if (msg.method === "Network.loadingFailed" && !/Load is cancelled|net::ERR_ABORTED/.test(msg.params.errorText || "")) {
    fails.push(msg.params.errorText + " [" + (msg.params.type || "?") + "]");
  }
};
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const myId = ++id;
  pending.set(myId, { resolve, reject });
  ws.send(JSON.stringify({ id: myId, method, params, sessionId }));
});
const tab = await send("Target.createTarget", { url: "about:blank" });
const { sessionId: S } = await send("Target.attachToTarget", { targetId: tab.targetId, flatten: true });
await send("Page.enable", {}, S);
await send("Runtime.enable", {}, S);
await send("Network.enable", {}, S);

const ev = async (expression) => {
  const r = await send("Runtime.evaluate", { expression, returnByValue: true, awaitPromise: true }, S);
  if (r.exceptionDetails) return { __err: r.exceptionDetails.text };
  return r.result.value;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
const goto = async (url, ms = 4000) => {
  errors = []; fails = [];
  await send("Page.navigate", { url }, S);
  await sleep(ms);
};
const setViewport = (width, height, dpr = 1) =>
  send("Emulation.setDeviceMetricsOverride", { width, height, deviceScaleFactor: dpr, mobile: width < 500 }, S);

let pass = 0, fail = 0;
const check = (l, c, d = "") => { c ? (pass++, console.log("  ok  ", l, d)) : (fail++, console.log("  FAIL", l, d)); };

/* ── every public route ─────────────────────────────────────────────── */
const ROUTES = [
  ["/", /home|about|project|skill|contact|hi|i'm|hello/i],
  ["/about", /about|skill|html|css|javascript|react|experience|resume/i],
  ["/project", /project|mini|web|ubisoft|digikala|rokad/i],
  ["/blog", /post|blog/i],
  ["/blog/welcome-to-my-blog", /blog|post|react|javascript/i],
  ["/contact", /contact|name|message|email|phone/i],
  ["/this-route-does-not-exist", /404|not found|page/i],
];

console.log("════ routes (1280px) ════");
await setViewport(1280, 900);
for (const [route, expect] of ROUTES) {
  await goto(TARGET + route, 4200);
  const st = await ev(`(() => {
    const b = document.body;
    const txt = (b.innerText || '');
    return {
      len: txt.length,
      text: txt.replace(/\\n+/g,' | ').slice(0, 260),
      overflow: document.documentElement.scrollWidth > window.innerWidth + 1,
      imgs: Array.from(document.images).map(i => ({ src: i.currentSrc || i.src, w: i.naturalWidth })),
      title: document.title,
    };
  })()`);
  const brokenImgs = (st.imgs || []).filter((i) => i.w > 0 === false);
  const ok = st.len > 150 && expect.test(st.text) && !st.overflow && brokenImgs.length === 0 && errors.length === 0 && fails.length === 0;
  check(`${route.padEnd(28)} renders`, ok,
    `len=${st.len} overflow=${st.overflow} brokenImg=${brokenImgs.length} jsErr=${errors.length} netFail=${fails.length}`.slice(0, 170));
  if (!ok) {
    if (errors.length) console.log("        errors:", JSON.stringify(errors.slice(0, 3)));
    if (fails.length) console.log("        netfail:", JSON.stringify(fails.slice(0, 3)));
    if (brokenImgs.length) console.log("        broken imgs:", JSON.stringify(brokenImgs.map((i) => i.src).slice(0, 3)));
    if (st.overflow) console.log("        text:", st.text.slice(0, 140));
  }
}

/* ── overflow at the awkward widths ────────────────────────────────── */
console.log("\n════ responsive (no horizontal overflow) ════");
for (const w of [1920, 1440, 1100, 900, 820, 768, 600, 480, 390, 360, 320]) {
  await setViewport(w, 900);
  await goto(TARGET + "/", 2600);
  const over = await ev(`JSON.stringify({ sw: document.documentElement.scrollWidth, iw: window.innerWidth })`);
  const { sw, iw } = JSON.parse(over);
  check(`home ${String(w).padStart(4)}px`, sw <= iw + 1, `scrollW=${sw} win=${iw}`);
}

/* ── every public endpoint ─────────────────────────────────────────── */
console.log("\n════ public endpoints ════");
const EPS = [
  "/api/blog",
  "/api/blog?slug=welcome-to-my-blog",
  "/api/projects.json",
  "/api/mini-projects.json",
  "/api/skills",
  "/api/skills.json",
  "/api/search?q=abba",
  "/api/search?q=%D8%B4%D8%A7%D8%AF",
  "/api/mood-search?q=happy",
  "/api/download.json",
  "/api/digikala?type=offer-products",
  "/Projects/Web-Project/Sabz-Learn/server/users",
  "/Projects/Web-Project/Sabz-Learn/server/comments",
];
for (const ep of EPS) {
  const r = await ev(`(async () => {
    try {
      const r = await fetch(${JSON.stringify(ep)});
      const ct = r.headers.get('content-type') || '';
      const t = await r.text();
      return JSON.stringify({ status: r.status, ct, len: t.length, head: t.slice(0, 100) });
    } catch (e) { return JSON.stringify({ err: String(e) }); }
  })()`);
  const o = JSON.parse(r);
  const isJson = /json/.test(o.ct || "");
  const ok = o.status === 200 && isJson && o.len > 2 && !/"error"/.test(o.head);
  check(`${ep.padEnd(52)} ${o.status} ${isJson ? "json" : o.ct || o.err || "?"}`, ok, ok ? "" : (o.head || "").replace(/\s+/g, " ").slice(0, 110));
}

console.log(`\n════════ ${pass} passed, ${fail} failed ════════`);
ws.close();
try { process.kill(-chrome.pid); } catch { /* gone */ }
process.exit(fail ? 1 : 0);
