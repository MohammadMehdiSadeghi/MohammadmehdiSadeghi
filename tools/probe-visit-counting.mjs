/* Measures the REAL visit-counting behaviour of the analytics pipeline.

   The complaint: "a user opens 4 pages -> it should register 4 views".
   So we drive a real browser, count every POST to /api/admin/track, and
   compare that against the delta written into visits.json.

   Two scenarios, because they exercise different code paths:
     A) 4 hard page loads   (like opening 4 pages in a fresh tab)
     B) 1 hard load + 3 SPA navigations (like clicking through the site)

   Run:  NODE_PATH=<workspace>/node_modules node tools/probe-visit-counting.mjs
*/
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

/* puppeteer-core lives OUTSIDE this repo (managed node workspace), and
   NODE_PATH does not apply to ESM imports — so resolve it explicitly. */
async function loadPuppeteer() {
  try {
    return (await import("puppeteer-core")).default;
  } catch {}
  const guesses = [
    process.env.PUPPETEER_CORE,
    "C:/Users/Mohammad/.workbuddy-ai/binaries/node/workspace/node_modules/puppeteer-core",
  ].filter(Boolean);
  for (const g of guesses) {
    const entry = path.join(g, "lib", "puppeteer", "puppeteer-core.js");
    if (fs.existsSync(entry)) {
      return (await import(pathToFileURL(entry).href)).default;
    }
  }
  throw new Error(
    "puppeteer-core not found — set PUPPETEER_CORE to its package directory",
  );
}
const puppeteer = await loadPuppeteer();

const BASE = process.env.BASE || "http://localhost:5173";
const CHROME =
  process.env.CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const VISITS = path.join(
  process.cwd(),
  "public",
  "api",
  "admin",
  "data",
  "visits.json",
);

const PAGES = ["/", "/about", "/project", "/blog"];

function readVisits() {
  try {
    return JSON.parse(fs.readFileSync(VISITS, "utf8"));
  } catch {
    return { days: {} };
  }
}
const todayKey = () => {
  const d = new Date();
  const p = (n) => String(n).padStart(2, "0");
  return `${d.getFullYear()}-${p(d.getMonth() + 1)}-${p(d.getDate())}`;
};
function snapshot() {
  const v = readVisits();
  const t = v.days?.[todayKey()] || { total: 0, paths: {} };
  return { total: t.total || 0, paths: { ...(t.paths || {}) } };
}
function diff(before, after) {
  const paths = {};
  for (const [k, v] of Object.entries(after.paths)) {
    const d = v - (before.paths[k] || 0);
    if (d) paths[k] = d;
  }
  return { total: after.total - before.total, paths };
}

async function withBrowser(fn) {
  const browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  try {
    return await fn(browser);
  } finally {
    await browser.close();
  }
}

/** Count non-heartbeat track POSTs by listening on the wire. */
function wireCounter(page) {
  const hits = [];
  page.on("request", (req) => {
    if (req.method() !== "POST") return;
    const url = req.url();
    if (!url.includes("/api/admin/track")) return;
    let body = {};
    try {
      body = JSON.parse(req.postData() || "{}");
    } catch {}
    if (body.heartbeat) return;
    hits.push(body.path || "?");
  });
  return hits;
}

async function scenarioHardLoads(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  const hits = wireCounter(page);
  for (const p of PAGES) {
    await page.goto(BASE + p, { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 400));
  }
  return hits;
}

async function scenarioSpaNav(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  const hits = wireCounter(page);
  await page.goto(BASE + "/", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 400));
  // navigate by clicking real in-app links (desktop header nav)
  for (const p of PAGES.slice(1)) {
    const ok = await page.evaluate((target) => {
      const links = [...document.querySelectorAll("a[href]")];
      const link = links.find((a) => a.getAttribute("href") === target);
      if (!link) return false;
      link.click();
      return true;
    }, p);
    if (!ok) console.log(`   (no anchor for ${p} — falling back to goto)`);
    if (!ok) await page.goto(BASE + p, { waitUntil: "networkidle2" });
    await new Promise((r) => setTimeout(r, 500));
  }
  return hits;
}

/** "/" -> "/about" -> "/" must be 3 views: a genuine revisit is NOT a duplicate. */
async function scenarioRevisit(browser) {
  const page = await browser.newPage();
  await page.setViewport({ width: 1280, height: 800 });
  const hits = wireCounter(page);
  const click = (target) =>
    page.evaluate((t) => {
      const link = [...document.querySelectorAll("a[href]")].find(
        (a) => a.getAttribute("href") === t,
      );
      if (!link) return false;
      link.click();
      return true;
    }, target);
  await page.goto(BASE + "/", { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 400));
  await click("/about");
  await new Promise((r) => setTimeout(r, 500));
  await click("/");
  await new Promise((r) => setTimeout(r, 500));
  return hits;
}

async function run(name, fn, expected) {
  const before = snapshot();
  const hits = await withBrowser(fn);
  await new Promise((r) => setTimeout(r, 600));
  const after = snapshot();
  const d = diff(before, after);
  const sumPaths = Object.values(d.paths).reduce((s, v) => s + v, 0);
  console.log(`\n=== ${name} ===`);
  console.log(`  track POSTs sent  : ${hits.length}  [${hits.join(", ")}]`);
  console.log(`  visits.json total : +${d.total}`);
  console.log(`  visits.json paths : ${JSON.stringify(d.paths)}`);
  const inSync = d.total === sumPaths;
  const ok = hits.length === expected && d.total === expected && inSync;
  console.log(
    `  => ${ok ? "OK" : "MISMATCH"}: expected ${expected}, wire=${hits.length}, stored=${d.total}${inSync ? "" : ` (total != sum(paths)=${sumPaths})`}`,
  );
  return { hits: hits.length, stored: d.total, ok, inSync };
}

console.log(`visits file: ${VISITS}`);
console.log(`today      : ${todayKey()}`);
const a = await run("A) 4 hard page loads", scenarioHardLoads, PAGES.length);
const b = await run(
  "B) 1 load + 3 SPA navigations",
  scenarioSpaNav,
  PAGES.length,
);
const c = await run('C) "/" -> "/about" -> "/" (revisit)', scenarioRevisit, 3);
const all = a.ok && b.ok && c.ok;
console.log(
  `\nSUMMARY: A ${a.hits}/${a.stored}, B ${b.hits}/${b.stored}, C ${c.hits}/${c.stored} (wire/stored)`,
);
console.log(all ? "ALL SCENARIOS OK" : "FAILURES PRESENT");
process.exit(all ? 0 : 1);
