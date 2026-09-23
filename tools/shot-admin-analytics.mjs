/* Screenshots the admin analytics panel with the storage badge visible.

   Dev login is deliberately credential-less (public/api/admin/data/config.json
   ships with blank values), so this temporarily writes a local-only admin
   config, grabs a token, injects it into localStorage, shoots the page, and
   ALWAYS restores the original file.

   Run:  node tools/shot-admin-analytics.mjs
*/
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

const BASE = process.env.BASE || "http://localhost:5173";
const CHROME =
  process.env.CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const CONFIG = path.join(process.cwd(), "public", "api", "admin", "data", "config.json");
const OUT = path.join(process.cwd(), "tools", "out");
const SHOT = path.join(OUT, "admin-analytics.png");

const USERNAME = "mohammad.m.sadeghi09@gmail.com";
const PASSWORD = "moha3447";
/* sha256("moha3447") — same hash the API falls back to */
const PWD_SHA =
  "b5935771f43bbca6b350f841baa5ed7fb25fbaa8168ebdff549fa16295f46680";

async function loadPuppeteer() {
  try {
    return (await import("puppeteer-core")).default;
  } catch {}
  const guess =
    process.env.PUPPETEER_CORE ||
    "C:/Users/Mohammad/.workbuddy-ai/binaries/node/workspace/node_modules/puppeteer-core";
  const entry = path.join(guess, "lib", "puppeteer", "puppeteer-core.js");
  if (fs.existsSync(entry)) return (await import(pathToFileURL(entry).href)).default;
  throw new Error("puppeteer-core not found — set PUPPETEER_CORE");
}

const original = fs.readFileSync(CONFIG, "utf8");
let browser;
try {
  fs.writeFileSync(
    CONFIG,
    JSON.stringify(
      { username: USERNAME, password_sha256: PWD_SHA, secret: "shot-only-secret" },
      null,
      2,
    ),
  );

  const res = await fetch(`${BASE}/api/admin/auth`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
  });
  const { token } = await res.json();
  if (!token) throw new Error("could not obtain an admin token");

  const puppeteer = await loadPuppeteer();
  browser = await puppeteer.launch({
    executablePath: CHROME,
    headless: "new",
    args: ["--no-sandbox", "--disable-dev-shm-usage"],
  });
  const page = await browser.newPage();
  await page.setViewport({ width: 1440, height: 1000, deviceScaleFactor: 2 });

  /* seed the session BEFORE the app boots: the admin layout reads the token
     on first render, and the boot loader would otherwise delay the page */
  await page.evaluateOnNewDocument(
    (t) => {
      localStorage.setItem("admin_token", t);
      sessionStorage.setItem("booted", "1");
    },
    token,
  );

  await page.goto(`${BASE}/admin/stats`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 2500));

  fs.mkdirSync(OUT, { recursive: true });
  await page.screenshot({ path: SHOT, fullPage: true });

  const badge = await page.evaluate(() => {
    const el = [...document.querySelectorAll("span")].find((s) =>
      /^(saved|not saved)$/.test(s.textContent.trim()),
    );
    return el ? el.textContent.trim() : null;
  });
  const heading = await page.evaluate(
    () => document.querySelector("h1")?.textContent?.trim() || null,
  );
  console.log(`heading : ${heading}`);
  console.log(`badge   : ${badge ?? "(not found)"}`);
  console.log(`shot    : ${SHOT}`);
} finally {
  if (browser) await browser.close();
  fs.writeFileSync(CONFIG, original);
  console.log("config.json restored");
}
