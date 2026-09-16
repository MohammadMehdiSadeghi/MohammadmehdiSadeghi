/* Does an uploaded SVG actually execute script from OUR origin?
   Boots the real server-blog routes, uploads a script-carrying SVG, then
   navigates the user's Chrome straight to the served image URL and checks
   whether the script ran (window flag) — the only honest way to call it a bug.
*/
import express from "express";
import path from "node:path";
import { spawn } from "node:child_process";
import { registerBlogRoutes, blogCoverGuard } from "../server-blog.js";
import fs from "node:fs";
import fsp from "node:fs/promises";

const BASE = process.cwd();
const PUBLIC_JSON = { blog: path.join(BASE, "public/api/blog.json") };
const BLOG_FILE = PUBLIC_JSON.blog;
const backup = fs.readFileSync(BLOG_FILE);
const IMG_DIR = path.join(BASE, "public/assets/Blog");

const readJSON = async (f, d) => { try { return JSON.parse(await fsp.readFile(f, "utf8")); } catch { return d; } };
const writeJSON = async (f, d) => { await fsp.mkdir(path.dirname(f), { recursive: true }); await fsp.writeFile(f, JSON.stringify(d, null, 2)); };
const TOKEN = "svg-test-token";
const requireAuthAsync = async (req, res) => {
  if (String(req.headers.authorization || "") !== `Bearer ${TOKEN}`) {
    res.status(401).json({ error: "unauthorized" });
    return null;
  }
  return { username: "t" };
};
const wrap = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => res.status(500).json({ error: String(e.message) }));

const app = express();
app.use(express.json({ limit: "6mb" }));
registerBlogRoutes(app, { PUBLIC_JSON, readJSON, writeJSON, requireAuthAsync, wrap, ROOT: BASE });
/* the same guard server.js mounts, so this probe tests the shipped code */
app.use("/assets/Blog", blogCoverGuard);
app.use("/assets", express.static(path.join(BASE, "public/assets")));

const PORT = 4831;
const server = app.listen(PORT);
await new Promise((r) => server.once("listening", r));
const URL_ = `http://127.0.0.1:${PORT}`;

/* an SVG that phones home / runs script if it is ever rendered as a document */
const SVG = `<svg xmlns="http://www.w3.org/2000/svg" width="40" height="40">
<script>window.__SVG_XSS__=true;document.title="XSSED";</script>
<circle cx="20" cy="20" r="18" fill="red"/></svg>`;

let pass = 0, fail = 0;
const check = (l, c, d = "") => { if (c) { pass++; console.log("  ok  ", l, d); } else { fail++; console.log("  FAIL", l, d); } };

try {
  const up = await fetch(`${URL_}/api/admin/blog-upload`, {
    method: "POST",
    headers: { "Content-Type": "application/json", Authorization: `Bearer ${TOKEN}` },
    body: JSON.stringify({ dataUrl: `data:image/svg+xml;base64,${Buffer.from(SVG).toString("base64")}` }),
  });
  const uj = await up.json();
  console.log("upload status:", up.status, JSON.stringify(uj));
  check("SVG upload rejected at the API", up.status === 400,
    `→ ${up.status} ${JSON.stringify(uj).slice(0, 70)}`);
  const imgUrl = uj.url ? URL_ + uj.url : null;
  if (imgUrl) {
    const res = await fetch(imgUrl);
    console.log("served content-type:", res.headers.get("content-type"));
    console.log("served x-content-type-options:", res.headers.get("x-content-type-options"));
    console.log("served content-disposition:", res.headers.get("content-disposition"));
  }

  check("no SVG url was handed out", !imgUrl, imgUrl || "none issued");

  if (imgUrl) {
    const PORT_CDP = 9340;
    const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", [
      `--remote-debugging-port=${PORT_CDP}`,
      `--user-data-dir=${(process.env.LOCALAPPDATA || "/tmp")}/Temp/chrome-svgtest`,
      "--headless=new", "--no-first-run", "--disable-gpu", "about:blank",
    ], { stdio: "ignore" });
    const sleep = (ms) => new Promise((r) => setTimeout(r, ms));
    let ws = null;
    for (let i = 0; i < 40; i++) {
      try {
        const r = await fetch(`http://127.0.0.1:${PORT_CDP}/json/version`);
        ws = (await r.json()).webSocketDebuggerUrl;
        if (ws) break;
      } catch { /* booting */ }
      await sleep(250);
    }
    const sock = new WebSocket(ws);
    await new Promise((r) => sock.addEventListener("open", r, { once: true }));
    let id = 0;
    const pend = new Map();
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
    await send("Page.navigate", { url: imgUrl }, sessionId);
    await sleep(2000);
    const ev = async (expr) => {
      const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true }, sessionId);
      return r.result?.value;
    };
    const ran = await ev("window.__SVG_XSS__ === true");
    const docTitle = await ev("document.title");
    console.log(`\n  navigating straight to the uploaded SVG → script ran? ${ran} (title="${docTitle}")`);
    check("SVG script does NOT execute from our origin", ran !== true,
      ran === true ? "STORED XSS: direct navigation executes the SVG script" : "safe");
    sock.close();
    chrome.kill();
  } else {
    /* the reject at upload is the fix — the browser half is moot now, but
       HEAD requests must also refuse scriptable extensions in this directory */
    const headSvg = await fetch(`${URL_}/assets/Blog/legacy.svg`, { method: "HEAD" });
    check("a legacy .svg in the uploads dir is refused", headSvg.status === 404,
      `→ ${headSvg.status}`);
    /* and a real raster file in the same directory must still be served */
    await fsp.mkdir(IMG_DIR, { recursive: true });
    const png = Buffer.from(
      "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==",
      "base64");
    await fsp.writeFile(path.join(IMG_DIR, "ok.png"), png);
    const good = await fetch(`${URL_}/assets/Blog/ok.png`);
    check("real raster cover still served (guard is not over-broad)", good.status === 200,
      `→ ${good.status}`);
    check("nosniff present on covers",
      good.headers.get("x-content-type-options") === "nosniff",
      good.headers.get("x-content-type-options"));
    await fsp.unlink(path.join(IMG_DIR, "ok.png")).catch(() => {});
  }
} finally {
  fs.writeFileSync(BLOG_FILE, backup);
  if (fs.existsSync(IMG_DIR)) {
    for (const f of fs.readdirSync(IMG_DIR)) await fsp.unlink(path.join(IMG_DIR, f)).catch(() => {});
  }
  server.close();
}

console.log(`\n════════ ${pass} passed, ${fail} failed ════════`);
