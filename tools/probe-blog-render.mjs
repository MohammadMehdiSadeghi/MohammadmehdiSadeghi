/* Front-end robustness probe: things that break the RENDERED page.

   1. Hand-edited blog.json shapes (tags as a string, missing fields, a title
      that is not a string) — the page must not white-screen.
   2. Layout: with 4 middle nav links, does the header overflow at tablet
      widths, and do the blog cards stay inside the viewport?
   3. The single-post deep link rendered in a fresh tab.

   All checks read the real DOM of the real app in the user's Chrome.
*/
import express from "express";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { spawn } from "node:child_process";
import { registerBlogRoutes, blogCoverGuard } from "../server-blog.js";

const BASE = process.cwd();
const DIST = path.join(BASE, "dist");
const BLOG_FILE = path.join(BASE, "public/api/blog.json");
const backup = fs.readFileSync(BLOG_FILE);

const readJSON = async (f, d) => { try { return JSON.parse(await fsp.readFile(f, "utf8")); } catch { return d; } };
const writeJSON = async (f, d) => { await fsp.mkdir(path.dirname(f), { recursive: true }); await fsp.writeFile(f, JSON.stringify(d, null, 2)); };
const TOKEN = "t";
const requireAuthAsync = async (req, res) => {
  if (String(req.headers.authorization || "") !== `Bearer ${TOKEN}`) { res.status(401).json({ error: "unauthorized" }); return null; }
  return { username: "t" };
};
const wrap = (fn) => (req, res) => Promise.resolve(fn(req, res)).catch((e) => res.status(500).json({ error: String(e.message) }));

const app = express();
app.use(express.json({ limit: "6mb" }));
registerBlogRoutes(app, {
  PUBLIC_JSON: { blog: BLOG_FILE }, readJSON, writeJSON, requireAuthAsync, wrap, ROOT: BASE,
});
app.use("/assets/Blog", blogCoverGuard);
app.use("/assets", express.static(path.join(BASE, "public/assets")));
/* ── serve the built SPA the way Vercel does ──

   The local build carries `base: "./"` (vite.config.js), so a DEEP LINK such
   as /blog/<slug> would resolve `./assets/index-*.js` relative to /blog/ →
   404 → the SPA fallback's HTML paints with no bundle → a blank page. That is
   an artifact of the local build only: on Vercel `base` is "/". Emulate the
   deploy by serving index.html with absolute asset paths, otherwise every
   deep-link check (nav active state, bare post) false-fails — and a real bug
   could hide behind the noise. */
const indexHtml = fs
  .readFileSync(path.join(DIST, "index.html"), "utf8")
  .replace(/(["'(])\.\//g, "$1/");
app.use(express.static(DIST, { index: false }));
app.get(/^(?!\/api\/).*/, (req, res) => res.type("html").send(indexHtml));

const PORT = 4837;
const server = app.listen(PORT);
await new Promise((r) => server.once("listening", r));
const SITE = `http://127.0.0.1:${PORT}`;

let pass = 0, fail = 0;
const check = (l, c, d = "") => { if (c) { pass++; console.log("  ok  ", l, d); } else { fail++; console.log("  FAIL", l, d); } };

/* ── chrome over CDP ── */
const CDP = 9342;
const chrome = spawn("C:/Program Files/Google/Chrome/Application/chrome.exe", [
  `--remote-debugging-port=${CDP}`,
  `--user-data-dir=${(process.env.LOCALAPPDATA || "/tmp")}/Temp/chrome-robust`,
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
let id = 0; const pend = new Map(); const netErr = [];
sock.addEventListener("message", (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) { pend.get(m.id)(m.result); pend.delete(m.id); }
  else if (m.method === "Network.responseReceived" && m.params.response.status >= 400) {
    netErr.push(`${m.params.response.status} ${m.params.response.url}`);
  } else if (m.method === "Runtime.exceptionThrown") {
    netErr.push("JS EXCEPTION: " + (m.params.exceptionDetails?.exception?.description || "").slice(0, 120));
  }
});
const send = (method, params = {}, sid) => new Promise((res) => {
  const mid = ++id; pend.set(mid, res);
  sock.send(JSON.stringify({ id: mid, method, params, sessionId: sid }));
});
const { targetId } = await send("Target.createTarget", { url: "about:blank" });
const { sessionId } = await send("Target.attachToTarget", { targetId, flatten: true });
await send("Page.enable", {}, sessionId);
await send("Runtime.enable", {}, sessionId);
await send("Network.enable", {}, sessionId);
const ev = async (expr) => {
  const r = await send("Runtime.evaluate", { expression: expr, returnByValue: true, awaitPromise: true }, sessionId);
  if (r.exceptionDetails) return { __err: r.exceptionDetails.text };
  return r.result?.value;
};
const setViewport = (w, h) => send("Emulation.setDeviceMetricsOverride",
  { width: w, height: h, deviceScaleFactor: 1, mobile: w < 768 }, sessionId);
const goto = async (url, ms = 2200) => {
  netErr.length = 0;
  await send("Page.navigate", { url }, sessionId);
  await sleep(ms);
};

try {
  console.log("=== 1. hand-edited blog.json shapes must not white-screen ===");
  {
    const posts = [
      { id: 1, slug: "string-tags", title: "String Tags Post", excerpt: "e", content: "body", tags: "React, Vite", date: "2026-09-17", published: true },
      { id: 2, slug: "no-fields", title: "Bare Minimum", published: true },
      { id: 3, slug: "numeric-title", title: 12345, content: "x", published: true },
      { id: 4, slug: "null-tags", title: "Null Tags", content: "x", tags: null, published: true },
      { id: 5, slug: "xss-payload", title: "XSS <script>window.__pwned=9<\/script>",
        excerpt: "\" onload=\"window.__pwned=8\" x=\"",
        content: "<script>window.__pwned=1<\/script>\n\n<img src=x onerror=\"window.__pwned=2\">\n\n- <b>bold</b>",
        coverAlt: "\" onerror=\"window.__pwned=3\"",
        tags: ["<img src=x onerror=window.__pwned=4>"], date: "2026-09-17", published: true },
    ];
    await writeJSON(BLOG_FILE, posts);

    await goto(`${SITE}/blog`);
    const text = await ev("document.body.innerText");
    check("list renders with odd shapes", typeof text === "string" && text.includes("_Blog"), String(text).slice(0, 50));
    check("no JS exception on the list", netErr.filter((e) => e.startsWith("JS")).length === 0,
      netErr.filter((e) => e.startsWith("JS")).join(" | ") || "clean");
    const cards = await ev("document.querySelectorAll('article').length");
    check("all 5 odd posts rendered", cards === 5, `${cards} cards`);

    /* the single view is where content blocks are parsed */
    await goto(`${SITE}/blog/no-fields`);
    const t2 = await ev("document.body.innerText");
    /* body-length alone is satisfied by the header nav — assert the actual
       article rendered: its heading plus the escape hatch back to the list */
    check("post with no content/excerpt still renders",
      typeof t2 === "string" && t2.includes("Bare Minimum") && t2.includes("all-posts"),
      JSON.stringify(String(t2).slice(0, 70)));
    check("no JS exception on the bare post", netErr.filter((e) => e.startsWith("JS")).length === 0,
      netErr.filter((e) => e.startsWith("JS")).join(" | ") || "clean");
    check("the word 'undefined' never renders",
      !/undefined/.test(String(t2)) && !/\bNaN\b/.test(String(t2)),
      (String(t2).match(/undefined|NaN/g) || []).join(",") || "clean");

    await goto(`${SITE}/blog/string-tags`);
    check("string tags don't crash the detail view", netErr.filter((e) => e.startsWith("JS")).length === 0,
      netErr.filter((e) => e.startsWith("JS")).join(" | ") || "clean");

    /* ── the assertion that actually matters for XSS: React must ESCAPE
       admin-authored markup in a real browser. Storing the payload raw is
       correct (the API is not the sanitiser) — rendering it as HTML is not. */
    await goto(`${SITE}/blog/xss-payload`);
    const xss = await ev(`(() => {
      const marks = ["__pwned","__pwned2","__pwned3","__pwned4","__pwned5","__pwned8","__pwned9"]
        .filter(k => window[k] !== undefined);
      const raw = document.querySelectorAll('article script').length
        + document.querySelectorAll('article img[src="x"]').length
        + document.querySelectorAll('article b').length;
      const handlers = Array.from(document.querySelectorAll('article [onerror],[onload]')).length;
      return { pwned: marks, injected: raw, handlers: handlers,
               articleText: (document.querySelector('article') || document.body).innerText.slice(0, 200) };
    })()`);
    if (!xss || xss.__err) { console.log("  raw xss read:", JSON.stringify(xss)); }
    check("no injected script/element from post fields executes",
      Array.isArray(xss?.pwned) && xss.pwned.length === 0, JSON.stringify(xss?.pwned));
    check("admin markup is escaped, not parsed", xss?.injected === 0,
      `${xss?.injected} raw elements`);
    check("no handler attribute survived into the DOM", xss?.handlers === 0);
  }

  console.log("\n=== 2. layout with 4 nav links (overflow check) ===");
  {
    await writeJSON(BLOG_FILE, backup.length ? JSON.parse(backup.toString()) : []);
    /* 820/900 are the band where the header actually overflowed before the
       md-band padding fix — keep them in the matrix or the regression returns
       unnoticed (the bug lived between the md and lg breakpoints). */
    for (const [w, h, label] of [[1440, 900, "desktop"], [1280, 800, "desktop-sm"], [1024, 800, "laptop"],
                                 [900, 800, "md-upper"], [820, 800, "md-lower"], [768, 900, "tablet"], [390, 844, "phone"]]) {
      await setViewport(w, h);
      await goto(`${SITE}/blog`, 1800);
      const m = await ev(`(() => {
        const de = document.documentElement;
        const header = document.querySelector('header > div');
        const nav = header ? header.getBoundingClientRect() : null;
        const cards = Array.from(document.querySelectorAll('article'));
        const overflow = cards.some(c => {
          const r = c.getBoundingClientRect();
          return r.right > window.innerWidth + 1 || r.left < -1;
        });
        return {
          docScrollW: de.scrollWidth,
          winW: window.innerWidth,
          hOverflow: de.scrollWidth > window.innerWidth + 1,
          headerRight: nav ? Math.round(nav.right) : null,
          cardsOut: overflow,
          cards: cards.length,
        };
      })()`);
      check(`${label} (${w}px): no horizontal overflow`, !m.hOverflow,
        `scrollW=${m.docScrollW} win=${m.winW} headerRight=${m.headerRight}`);
      check(`${label}: cards inside the viewport`, !m.cardsOut, `${m.cards} cards`);
    }
    /* the blog tab must be reachable on mobile via the hamburger panel */
    await setViewport(390, 844);
    await goto(`${SITE}/blog`, 1500);
    const mobileNav = await ev(`(() => {
      const links = Array.from(document.querySelectorAll('a')).filter(a => a.textContent.trim() === '_Blog');
      if (!links.length) return { count: 0 };
      return {
        count: links.length,
        visible: links.some(a => { const r = a.getBoundingClientRect(); return r.width > 0 && r.height > 0; }),
        href: links[0].getAttribute('href'),
      };
    })()`);
    check("a _Blog link exists on mobile (hamburger)", mobileNav.count >= 1,
      JSON.stringify(mobileNav));
    check("it points at /blog", mobileNav.href === "/blog", mobileNav.href);
  }

  console.log("\n=== 3. nav active-state edge cases ===");
  {
    await setViewport(1440, 900);
    const readActive = async () => ev(`(() => {
      /* only the VISIBLE desktop row: the mobile hamburger panel renders a
         second copy of every link with a DIFFERENT active style (left border,
         white text), so a naive 'header a' sweep matches both and reports
         links that are not actually lit. */
      const links = Array.from(document.querySelectorAll('header a')).filter(a => {
        const r = a.getBoundingClientRect();
        return r.width > 0 && r.height > 0 && !a.closest('.mobile-nav-panel');
      });
      return links.filter(a => {
        const bc = getComputedStyle(a).borderBottomColor;
        return a.textContent.trim().startsWith('_') && bc !== 'rgba(0, 0, 0, 0)' && bc !== 'transparent';
      }).map(a => a.textContent.trim());
    })()`);

    await goto(`${SITE}/blog`, 1600);
    check("/blog lights _Blog only", JSON.stringify(await readActive()) === JSON.stringify(["_Blog"]),
      JSON.stringify(await readActive()));

    await goto(`${SITE}/blog/welcome-to-my-blog`, 1600);
    check("/blog/<slug> keeps _Blog lit", JSON.stringify(await readActive()) === JSON.stringify(["_Blog"]),
      JSON.stringify(await readActive()));

    await goto(`${SITE}/project`, 1600);
    const projActive = await readActive();
    check("/project lights _Project only", JSON.stringify(projActive) === JSON.stringify(["_Project"]),
      JSON.stringify(projActive));
  }
} finally {
  fs.writeFileSync(BLOG_FILE, backup);
  sock.close();
  chrome.kill();
  server.close();
  await fsp.rm(`${(process.env.LOCALAPPDATA || "/tmp")}/Temp/chrome-robust`, { recursive: true, force: true }).catch(() => {});
}

console.log(`\n════════ ${pass} passed, ${fail} failed ════════`);
process.exit(fail ? 1 : 0);
