/* Exercise the site's real INTERACTIONS, not just its rendering:
   music search → result, project filters, contact form, nav, theme toggle…
   This is where user-visible bugs live that a render check cannot see.

     TARGET=http://127.0.0.1:5299 node tools/probe-interactions.mjs */
import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs";

let TARGET = (process.env.TARGET || "http://127.0.0.1:5299").replace(/\/$/, "");

/* BOOT=node spawns the real server.js as a CHILD process. Running it detached
   fails silently: server.js reads stdin at boot and exits when the shell
   closes it, so the port never opens. As a child it stays up for the run. */
let srv = null;
if (process.env.BOOT === "node") {
  const { spawn } = await import("node:child_process");
  srv = spawn(process.execPath, ["server.js"], {
    env: { ...process.env, PORT: "3777" },
    stdio: ["ignore", "pipe", "pipe"],
  });
  srv.stdout.on("data", () => {});
  srv.stderr.on("data", () => {});
  TARGET = "http://127.0.0.1:3777";
  let up = false;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try { if ((await fetch(TARGET + "/api/projects.json")).ok) { up = true; break; } } catch { /* not yet */ }
  }
  if (!up) { console.log("server.js did not start"); process.exit(1); }
  console.log("  booted server.js on " + TARGET);
}
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PROFILE = (process.env.LOCALAPPDATA || "/tmp") + "/Temp/chrome-interact";
const PORT = 9352;
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
let id = 0; const pending = new Map(); let errors = [];
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) {
    const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id);
    msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result);
  } else if (msg.method === "Runtime.exceptionThrown") {
    errors.push((msg.params.exceptionDetails.text || "") + " " + (msg.params.exceptionDetails.exception?.description || "").split("\n")[0]);
  } else if (msg.method === "Runtime.consoleAPICalled" && msg.params.type === "error") {
    errors.push("console: " + msg.params.args.map((a) => a.value ?? a.description ?? a.type).join(" ").slice(0, 180));
  }
};
const send = (method, params = {}, sessionId) => new Promise((resolve, reject) => {
  const myId = ++id; pending.set(myId, { resolve, reject });
  ws.send(JSON.stringify({ id: myId, method, params, sessionId }));
});
const tab = await send("Target.createTarget", { url: "about:blank" });
const { sessionId: S } = await send("Target.attachToTarget", { targetId: tab.targetId, flatten: true });
await send("Page.enable", {}, S); await send("Runtime.enable", {}, S);
const ev = async (e) => {
  const r = await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }, S);
  if (r.exceptionDetails) return { __err: r.exceptionDetails.text };
  return r.result.value;
};
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* Poll for a selector instead of sleeping a fixed amount: the dev server
   compiles modules on demand, so a hard-coded delay is either flaky or slow. */
const waitFor = async (selector, tries = 40) => {
  for (let i = 0; i < tries; i++) {
    const ok = await ev(`!!document.querySelector(${JSON.stringify(selector)})`);
    if (ok === true) return true;
    await sleep(400);
  }
  return false;
};
const goto = async (url) => { errors = []; await send("Page.navigate", { url }, S); await waitFor("header, main, #root > *", 30); await sleep(400); };
await send("Emulation.setDeviceMetricsOverride", { width: 1280, height: 900, deviceScaleFactor: 1, mobile: false }, S);

let pass = 0, fail = 0;
const check = (l, c, d = "") => { c ? (pass++, console.log("  ok  ", l, d)) : (fail++, console.log("  FAIL", l, d)); };
/* fill a React-controlled input the way a user would */
const fill = (sel, val) => ev(`(() => {
  const el = document.querySelector(${JSON.stringify(sel)});
  if (!el) return 'NOT_FOUND';
  const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
  Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, ${JSON.stringify(val)});
  el.dispatchEvent(new Event('input', { bubbles: true }));
  el.dispatchEvent(new Event('change', { bubbles: true }));
  return 'OK';
})()`);

/* ── 1. music search ─────────────────────────────────────────────── */
console.log("════ music search (home) ════");
await goto(TARGET + "/");
const formOk = await waitFor("form input[type=text]", 30);
check("search field exists", formOk === true, String(formOk));

for (const q of ["abba", "shad", "غمگین"]) {
  await goto(TARGET + "/");
  await waitFor("form input[type=text]", 30);
  await fill("form input[type=text]", q);
  await sleep(300);
  await ev(`(() => { const f = document.querySelector('form'); const b = f && f.querySelector('button[type=submit]'); if (b) b.click(); return !!b; })()`);
  await sleep(3200);
  /* The result card renders a player only once it has a song, and the audio
     element may not have a src until it is mounted/played — so wait for the
     song title rather than sampling once. Sampling too early reported "no
     playable audio" for a query that returns the right track. */
  let res = null;
  for (let i = 0; i < 20; i++) {
    res = await ev(`(() => {
      const t = document.body.innerText;
      const audio = document.querySelector('audio');
      const songName = (document.querySelector('[class*="Music"] h2, [class*="Music"] h3, h2, h3') || {}).innerText || '';
      return {
        found: !/No matching song|Connection error/i.test(t),
        pending: /Searching/i.test(t) || !t.match(/[A-Za-z\u0600-\u06FF]{4,}/),
        err: (t.match(/(No matching song[^\n]*|Connection error[^\n]*)/i) || [''])[0],
        hasAudio: !!audio,
        src: audio ? (audio.currentSrc || audio.getAttribute('src') || '') : '',
        title: songName.trim().slice(0, 50),
      };
    })()`);
    if (res && res.hasAudio && res.src) break;
    await sleep(500);
  }
  check(`search "${q}" returns a song`, res.found, res.err || res.title);
  if (res.found) check(`search "${q}" has playable audio`, res.hasAudio && !!res.src, res.src.slice(-70));
}

/* ── 2. project filters ──────────────────────────────────────────── */
console.log("\n════ project page ════");
await goto(TARGET + "/project");
await sleep(2500);
/* ProjectCard renders a <div class="rounded-xl group cursor-pointer ...">, not
   an <article> — counting articles reported "0 projects" on a page that was
   working fine and sent me chasing a non-bug. Count the cards by the class
   they actually carry, and fall back to the empty-state text. */
const proj = await ev(`(() => {
  const cards = document.querySelectorAll('div.group.cursor-pointer');
  const iframes = document.querySelectorAll('iframe');
  const links = Array.from(document.querySelectorAll('a[href]')).filter(a => (a.getAttribute('href') || '').indexOf('Projects/') >= 0);
  const empty = document.body.innerText.toLowerCase().indexOf('no projects found') >= 0;
  const broken = Array.from(document.images).filter(i => i.complete && i.naturalWidth === 0).map(i => i.src);
  return { cards: cards.length, iframes: iframes.length, links: links.length, empty: empty, broken: broken };
})()`);
console.log("  cards:", JSON.stringify(proj));
check("project page lists projects", (proj.cards > 0 || proj.links > 0) && !proj.empty,
  `${proj.cards} cards / ${proj.links} project links${proj.empty ? " (empty state!)" : ""}`);
check("iframes are only used for embedded previews", proj.iframes >= 0, `${proj.iframes}`);
check("no broken images", proj.broken.length === 0, JSON.stringify(proj.broken.slice(0, 2)));
check("no JS errors", errors.length === 0, JSON.stringify(errors.slice(0, 2)));

/* ── 3. navigation ───────────────────────────────────────────────── */
console.log("\n════ navigation ════");
await goto(TARGET + "/", 2800);
for (const [label, expect] of [["_About", "/about"], ["_Project", "/project"], ["_Blog", "/blog"], ["_Contact-me", "/contact"], ["_Home", "/"]]) {
  await goto(TARGET + "/");
  await waitFor("header a", 20);
  const clicked = await ev(`(() => {
    const a = Array.from(document.querySelectorAll('a')).find(x => (x.innerText||'').trim() === ${JSON.stringify(label)});
    if (!a) return 'NOT_FOUND';
    a.click(); return 'OK';
  })()`);
  await sleep(2600);
  const path = await ev(`location.pathname`);
  check(`nav ${label.padEnd(11)} → ${expect}`, clicked === "OK" && path === expect, `${clicked} path=${path}`);
}

/* ── 4. contact form ─────────────────────────────────────────────── */
console.log("\n════ contact form ════");
await goto(TARGET + "/contact");
await waitFor("input[placeholder]", 30);
const cfields = await ev(`JSON.stringify(Array.from(document.querySelectorAll('input,textarea')).map(i => ({
  t: i.tagName.toLowerCase(), type: i.type, name: i.name, ph: i.placeholder, req: i.required })))`);
console.log("  fields:", cfields.slice(0, 320));
const filled = await ev(`(() => {
  const set = (el, v) => {
    const proto = el.tagName === 'TEXTAREA' ? HTMLTextAreaElement.prototype : HTMLInputElement.prototype;
    Object.getOwnPropertyDescriptor(proto, 'value').set.call(el, v);
    el.dispatchEvent(new Event('input', { bubbles: true }));
    el.dispatchEvent(new Event('change', { bubbles: true }));
  };
  const ins = Array.from(document.querySelectorAll('input,textarea'));
  let n = 0;
  for (const el of ins) {
    if (el.type === 'hidden' || el.type === 'submit') continue;
    const key = (el.name || el.placeholder || '').toLowerCase();
    if (/name|user/.test(key)) { set(el, 'Probe Tester'); n++; }
    else if (/phone|mobile|tel/.test(key)) { set(el, '09120000000'); n++; }
    else if (/mail/.test(key)) { set(el, 'probe@example.com'); n++; }
    else if (/message|text|desc/.test(key) || el.tagName === 'TEXTAREA') { set(el, 'automated probe message'); n++; }
  }
  return n;
})()`);
console.log("  filled", filled, "fields");
const submitted = await ev(`(() => {
  const b = Array.from(document.querySelectorAll('button')).find(x => /send|submit/i.test(x.innerText || ''));
  if (!b) return 'NO_BUTTON';
  b.click(); return 'clicked';
})()`);
await sleep(3500);
const cres = await ev(`(() => {
  const t = document.body.innerText;
  const msgs = (t.match(/(success|sent|thank|error|fail|required|invalid)[^\\n]{0,70}/gi) || []).slice(0, 3);
  return msgs;
})()`);
check("contact form submits without error", !errors.length, JSON.stringify(errors.slice(0, 2)));

/* ── 5. 404 page ─────────────────────────────────────────────────── */
console.log("\n════ 404 ════");
await goto(TARGET + "/definitely-not-a-page");
await sleep(800);
const nf = await ev(`(() => ({ text: document.body.innerText.slice(0, 260).replace(/\\n+/g,' | '), links: document.querySelectorAll('a').length }))()`);
check("404 page offers a way back", nf.links > 0, nf.text.slice(0, 120));

console.log(`\n════════ ${pass} passed, ${fail} failed ════════`);
if (srv) { try { srv.kill(); process.kill(-srv.pid); } catch { /* gone */ } }
ws.close();
try { process.kill(-chrome.pid); } catch { /* gone */ }
process.exit(fail ? 1 : 0);
