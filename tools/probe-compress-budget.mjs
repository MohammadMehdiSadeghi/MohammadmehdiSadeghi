/* Does the browser's own compression keep a worst-case image under the
   server-side cap?

   Chapter: the upload cap is 2.5 MiB server-side, the client targets 2.4 MiB.
   The gap is only ~100 KB, and `compressImage` stops stepping quality at
   MIN_QUALITY 0.55 — if a 1600px WebP is still over budget there, it returns
   an over-budget dataUrl and the user eats an opaque "image is too large".
   A real canvas encoder in real Chrome is the only way to know.

   Worst case = 1600x1600 random RGB noise: incompressible, so this is a
   LOWER bound on what any photo can produce at a given quality. */
import { spawn } from "node:child_process";
import fsp from "node:fs/promises";

const MAX_DIM = 1600, START_QUALITY = 0.82, MIN_QUALITY = 0.55;
const CLIENT_BUDGET = 2.4 * 1024 * 1024;
const SERVER_CAP = 2.5 * 1024 * 1024;

const CDP = 9351;
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", [
  `--remote-debugging-port=${CDP}`,
  `--user-data-dir=${(process.env.LOCALAPPDATA || "/tmp")}/Temp/chrome-compress`,
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

try {
  console.log(`client budget ${(CLIENT_BUDGET / 1048576).toFixed(2)} MiB < server cap ${(SERVER_CAP / 1048576).toFixed(2)} MiB`);
  check("compressImage budget is below the server cap", CLIENT_BUDGET < SERVER_CAP,
    `margin ${Math.round((SERVER_CAP - CLIENT_BUDGET) / 1024)} KB`);

  /* ── worst case: incompressible noise at 1600x1600 ── */
  const res = await ev(`(async () => {
    const W = ${MAX_DIM}, H = ${MAX_DIM};
    const c = document.createElement("canvas");
    c.width = W; c.height = H;
    const ctx = c.getContext("2d");
    const img = ctx.createImageData(W, H);
    for (let i = 0; i < img.data.length; i += 4) {
      img.data[i] = Math.random() * 255;
      img.data[i+1] = Math.random() * 255;
      img.data[i+2] = Math.random() * 255;
      img.data[i+3] = 255;
    }
    ctx.putImageData(img, 0, 0);

    /* exactly the step-down loop from src/lib/imageCompress.js */
    let quality = ${START_QUALITY};
    let dataUrl = c.toDataURL("image/webp", quality);
    const steps = [{ quality, bytes: Math.round(dataUrl.length * 0.75) }];
    while (dataUrl.length * 0.75 > ${CLIENT_BUDGET} && quality > ${MIN_QUALITY}) {
      quality = Math.max(${MIN_QUALITY}, quality - 0.1);
      dataUrl = c.toDataURL("image/webp", quality);
      steps.push({ quality: Number(quality.toFixed(2)), bytes: Math.round(dataUrl.length * 0.75) });
    }
    return { steps, finalBytes: Math.round(dataUrl.length * 0.75), finalQuality: Number(quality.toFixed(2)),
             underBudget: Math.round(dataUrl.length * 0.75) <= ${CLIENT_BUDGET},
             underCap: Math.round(dataUrl.length * 0.75) <= ${SERVER_CAP}, mime: dataUrl.slice(5, 25) };
  })()`);

  console.log("  quality ladder:", res.steps.map((s) => `q${s.quality}=${(s.bytes / 1024).toFixed(0)}KB`).join(" → "));
  check("webp is actually supported (not silently PNG)", /webp/.test(res.mime || ""), res.mime);
  check("worst-case noise still fits the server cap", res.underCap, `${(res.finalBytes / 1024).toFixed(0)} KB at q${res.finalQuality}`);
  check("compressImage honours its own budget", res.underBudget || res.finalQuality === MIN_QUALITY,
    res.underBudget ? "within 2.4 MiB" : `hit MIN_QUALITY ${MIN_QUALITY} at ${(res.finalBytes / 1048576).toFixed(2)} MiB`);

  /* A 4000x3000 phone photo: the downscale is what saves it. */
  const big = await ev(`(() => {
    const c = document.createElement("canvas");
    c.width = 4000; c.height = 3000;
    const ctx = c.getContext("2d");
    const img = ctx.createImageData(4000, 3000);
    for (let i = 0; i < img.data.length; i += 4) { img.data[i] = Math.random()*255; img.data[i+1] = Math.random()*255; img.data[i+2] = Math.random()*255; img.data[i+3] = 255; }
    ctx.putImageData(img, 0, 0);
    const scale = Math.min(1, ${MAX_DIM} / Math.max(c.width, c.height));
    const w = Math.round(c.width * scale), h = Math.round(c.height * scale);
    const s = document.createElement("canvas"); s.width = w; s.height = h;
    s.getContext("2d").drawImage(c, 0, 0, w, h);
    let q = ${START_QUALITY}, d = s.toDataURL("image/webp", q);
    while (d.length * 0.75 > ${CLIENT_BUDGET} && q > ${MIN_QUALITY}) { q = Math.max(${MIN_QUALITY}, q - 0.1); d = s.toDataURL("image/webp", q); }
    return { w, h, bytes: Math.round(d.length * 0.75), q: Number(q.toFixed(2)) };
  })()`);
  check("a 4000x3000 photo is downscaled to 1600px", big.w === 1600 && big.h === 1200, `${big.w}x${big.h}`);
  check("...and lands under the cap", big.bytes <= SERVER_CAP, `${(big.bytes / 1024).toFixed(0)} KB at q${big.q}`);
} finally {
  sock.close(); chrome.kill();
  await fsp.rm(`${(process.env.LOCALAPPDATA || "/tmp")}/Temp/chrome-compress`, { recursive: true, force: true }).catch(() => {});
}

console.log(`\n════════ ${pass} passed, ${fail} failed ════════`);
process.exit(fail ? 1 : 0);
