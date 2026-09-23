/* Screenshots the new admin "Site info" editor, plus the public contact page
   it drives.

   Runs tools/emulate-vercel.mjs (dist/ + the real api/index.js handler) with
   a throwaway VERCEL_DATA_DIR, so it needs no dev server and no credentials
   in a config file: with the data dir empty the API falls back to
   DEFAULT_ADMIN, which is the account the other suites log in with.

   Run: node tools/shot-admin-site.mjs   (needs `npm run build` first)
*/
import { spawn } from "node:child_process";
import fs from "node:fs";
import net from "node:net";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const BASE_DIR = process.cwd();
const CHROME =
  process.env.CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";
const OUT = path.join(BASE_DIR, "tools", "out");
const USERNAME = "mohammad.m.sadeghi09@gmail.com";
const PASSWORD = "moha3447";

async function loadPuppeteer() {
  try {
    return (await import("puppeteer-core")).default;
  } catch {
    /* fall through to the managed workspace copy */
  }
  const guess =
    process.env.PUPPETEER_CORE ||
    "C:/Users/Mohammad/.workbuddy-ai/binaries/node/workspace/node_modules/puppeteer-core";
  const entry = path.join(guess, "lib", "puppeteer", "puppeteer-core.js");
  if (fs.existsSync(entry)) return (await import(pathToFileURL(entry).href)).default;
  throw new Error("puppeteer-core not found — set PUPPETEER_CORE");
}

const freePort = () =>
  new Promise((res) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => {
      const p = s.address().port;
      s.close(() => res(p));
    });
  });

const procs = [];
const cleanup = () => {
  for (const p of procs) {
    try {
      p.kill();
    } catch {
      /* already gone */
    }
  }
};
process.on("exit", cleanup);

fs.rmSync((process.env.LOCALAPPDATA || "/tmp") + "/Temp/pdata-emul", {
  recursive: true,
  force: true,
});

const port = await freePort();
const server = spawn(process.execPath, [path.join("tools", "emulate-vercel.mjs")], {
  cwd: BASE_DIR,
  env: { ...process.env, EMUL_PORT: String(port) },
  stdio: ["ignore", "pipe", "pipe"],
});
server.stdout.on("data", () => {});
server.stderr.on("data", () => {});
procs.push(server);

let base = null;
for (let i = 0; i < 60; i++) {
  await new Promise((r) => setTimeout(r, 400));
  try {
    if ((await fetch(`http://127.0.0.1:${port}/api/site.json`)).ok) {
      base = `http://127.0.0.1:${port}`;
      break;
    }
  } catch {
    /* not up yet */
  }
}
if (!base) {
  console.log("server never came up");
  process.exit(1);
}
console.log("base:", base);

const authRes = await fetch(`${base}/api/admin/auth`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({ username: USERNAME, password: PASSWORD }),
});
const { token } = await authRes.json();
if (!token) throw new Error("could not obtain an admin token");

let browser;
try {
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

  fs.mkdirSync(OUT, { recursive: true });

  await page.goto(`${base}/admin/site`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 2500));
  const adminShot = path.join(OUT, "admin-site.png");
  await page.screenshot({ path: adminShot, fullPage: true });

  await page.goto(`${base}/contact`, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 2000));
  const contactShot = path.join(OUT, "site-info-contact.png");
  await page.screenshot({ path: contactShot });

  const heading = await page.evaluate(
    () => document.querySelector("h1")?.textContent?.trim() || null,
  );
  console.log(`contact h1 : ${heading}`);
  console.log(`shots      : ${adminShot}`);
  console.log(`             ${contactShot}`);
} finally {
  if (browser) await browser.close();
  cleanup();
}
