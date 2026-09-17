/* What is actually on screen at a given URL, right now? Dump the DOM state
   over time so a stuck loader / empty root can be told apart from a slow one. */
import http from "node:http";
import { spawn } from "node:child_process";
import fs from "node:fs";

const TARGET = process.env.TARGET || "http://127.0.0.1:5199";
const URL_ = process.env.URL_ || "/";
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
const PROFILE = (process.env.LOCALAPPDATA || "/tmp") + "/Temp/chrome-dump";
const PORT = 9354;
try { fs.rmSync(PROFILE, { recursive: true, force: true, maxRetries: 3 }); } catch { /* in use */ }
const chrome = spawn(CHROME, [`--remote-debugging-port=${PORT}`, `--user-data-dir=${PROFILE}`,
  "--headless=new", "--disable-gpu", "--no-first-run", "--no-default-browser-check", "about:blank"], { detached: true, stdio: "ignore" });
chrome.unref();
const get = (u) => new Promise((res, rej) => { http.get(u, (r) => { let d = ""; r.on("data", (c) => (d += c)); r.on("end", () => res(JSON.parse(d))); }).on("error", rej); });
let version = null;
for (let i = 0; i < 40; i++) { try { version = await get(`http://127.0.0.1:${PORT}/json/version`); break; } catch { await new Promise((r) => setTimeout(r, 500)); } }
const ws = new WebSocket(version.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0; const pending = new Map(); const errs = [];
ws.onmessage = (m) => {
  const msg = JSON.parse(m.data);
  if (msg.id && pending.has(msg.id)) { const { resolve, reject } = pending.get(msg.id); pending.delete(msg.id); msg.error ? reject(new Error(JSON.stringify(msg.error))) : resolve(msg.result); }
  else if (msg.method === "Runtime.exceptionThrown") errs.push((msg.params.exceptionDetails.text || "") + " :: " + (msg.params.exceptionDetails.exception?.description || "").split("\n").slice(0, 3).join(" | "));
};
const send = (m, p = {}, s) => new Promise((resolve, reject) => { const i = ++id; pending.set(i, { resolve, reject }); ws.send(JSON.stringify({ id: i, method: m, params: p, sessionId: s })); });
const tab = await send("Target.createTarget", { url: "about:blank" });
const { sessionId: S } = await send("Target.attachToTarget", { targetId: tab.targetId, flatten: true });
await send("Page.enable", {}, S); await send("Runtime.enable", {}, S);
const ev = async (e) => { const r = await send("Runtime.evaluate", { expression: e, returnByValue: true, awaitPromise: true }, S); if (r.exceptionDetails) return { __err: r.exceptionDetails.text }; return r.result.value; };
await send("Page.navigate", { url: TARGET + URL_ }, S);

for (const t of [1000, 2500, 5000, 8000, 12000, 16000]) {
  await new Promise((r) => setTimeout(r, t === 1000 ? 1000 : 2500));
  const st = await ev(`JSON.stringify({
    rootChildren: document.getElementById('root') ? document.getElementById('root').children.length : -1,
    bodyLen: document.body.innerText.length,
    text: document.body.innerText.replace(/\\n+/g,' | ').slice(0, 180),
    loader: !!document.querySelector('[class*="loader" i], [class*="loading" i]'),
    forms: document.querySelectorAll('form').length,
    links: document.querySelectorAll('a').length,
    h1: (document.querySelector('h1')||{}).innerText || '',
  })`);
  console.log(`t≈${t}ms  ${st}`);
}
console.log("exceptions:", JSON.stringify(errs.slice(0, 4), null, 1));
ws.close();
try { process.kill(-chrome.pid); } catch { /* gone */ }
process.exit(0);
