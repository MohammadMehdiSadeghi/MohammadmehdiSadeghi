/* What is actually in the DOM on a phone-width /about and /project?
   These pages measured ~107 chars on mobile vs ~2000 on desktop, so dump the
   visible text and the display:none blocks to see what is being hidden. */
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

/* BOOT=node spawns server.js as a CHILD so the port stays up for the run
   (a detached server.js dies with the shell that started it). */
let BOOTED = null;
let base = (process.env.TARGET || "").replace(/\/$/, "");
if (!base) {
  const { createServer } = await import("node:net");
  const port = await new Promise((res) => {
    const s = createServer();
    s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); });
  });
  BOOTED = spawn(process.execPath, ["server.js"], {
    env: { ...process.env, PORT: String(port) }, stdio: ["ignore", "pipe", "pipe"],
  });
  BOOTED.stdout.on("data", () => {}); BOOTED.stderr.on("data", () => {});
  base = `http://127.0.0.1:${port}`;
  for (let i = 0; i < 80; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try { if ((await fetch(base + "/api/projects.json")).ok) break; } catch {}
  }
}
const BASE = base;
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PROF = path.join(os.tmpdir(), "hermes-dump-" + Date.now());
const cdpPort = 9900 + Math.floor(Math.random() * 90);
const ch = spawn(CHROME, ["--headless=new", `--remote-debugging-port=${cdpPort}`, `--user-data-dir=${PROF}`,
  "--no-first-run", "--window-size=390,844", "about:blank"], { stdio: ["ignore", "pipe", "pipe"] });
ch.stdout.on("data", () => {}); ch.stderr.on("data", () => {});

let target = null;
for (let i = 0; i < 60; i++) {
  await new Promise((r) => setTimeout(r, 500));
  try {
    const l = await (await fetch(`http://127.0.0.1:${cdpPort}/json/list`)).json();
    target = l.find((t) => t.type === "page");
    if (target?.webSocketDebuggerUrl) break;
  } catch {}
}
const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pend = new Map();
ws.onmessage = (e) => { const m = JSON.parse(e.data); if (m.id && pend.has(m.id)) { pend.get(m.id)(m); pend.delete(m.id); } };
const send = (m, p = {}) => new Promise((r) => { const i = ++id; pend.set(i, r); ws.send(JSON.stringify({ id: i, method: m, params: p })); });
const ev = async (x) => (await send("Runtime.evaluate", { expression: x, awaitPromise: true, returnByValue: true })).result?.result?.value;
await send("Runtime.enable"); await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", { width: 390, height: 844, deviceScaleFactor: 1, mobile: true });
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

for (const route of ["/about", "/project"]) {
  await send("Page.navigate", { url: BASE + route });
  await sleep(4000);
  const info = await ev(`(() => {
    const root = document.getElementById('root');
    const all = Array.from(root.querySelectorAll('*'));
    const hidden = all.filter(el => {
      const cs = getComputedStyle(el);
      return cs.display === 'none' && (el.innerText || '').trim().length > 40;
    }).map(el => ({
      tag: el.tagName.toLowerCase(),
      cls: (el.className || '').toString().slice(0, 90),
      len: (el.innerText || '').trim().length,
      head: (el.innerText || '').replace(/\\s+/g,' ').trim().slice(0, 70),
    })).slice(0, 12);
    return {
      visibleLen: (root.innerText || '').replace(/\\s+/g,' ').trim().length,
      visible: (root.innerText || '').replace(/\\s+/g,' ').trim().slice(0, 300),
      hiddenCount: hidden.length,
      hidden,
    };
  })()`);
  console.log(`\n════════ ${route} @ 390px ════════`);
  console.log("visible:", info.visibleLen, "chars");
  console.log("text   :", info.visible);
  console.log("hidden blocks with real text:", info.hiddenCount);
  for (const h of info.hidden) console.log(`   <${h.tag} class="${h.cls}"> ${h.len}ch  "${h.head}"`);
}

try { fs.rmSync(PROF, { recursive: true, force: true, maxRetries: 3 }); } catch {}
ch.kill();
process.exit(0);
