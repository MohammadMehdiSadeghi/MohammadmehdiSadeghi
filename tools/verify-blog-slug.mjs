/* Regression check for the unknown-blog-slug path.

   Before the fix, an unknown slug produced a RAW parse error in the UI
   ("Failed to execute 'json' on 'Response': Unexpected token '<'") because
   the dev mock wrote a 200 header and then a 404 header on the same
   response, so Vite answered with its own HTML error page.

   Asserts: a live slug renders the article, an unknown slug renders the
   clean "post not found" panel, and no raw JSON/parse error ever surfaces.
   Run: node tools/verify-blog-slug.mjs   (needs the dev server on 5173)
*/
import { pathToFileURL } from "node:url";

const P =
  process.env.PUPPETEER_CORE ||
  "C:/Users/Mohammad/.workbuddy-ai/binaries/node/workspace/node_modules/puppeteer-core";
const puppeteer = (
  await import(pathToFileURL(`${P}/lib/puppeteer/puppeteer-core.js`).href)
).default;

const BASE = process.env.BASE || "http://localhost:5173";
const CHROME =
  process.env.CHROME || "C:\\Program Files\\Google\\Chrome\\Application\\chrome.exe";

const LIVE = "/blog/stop-guessing-at-responsive-bugs";
const DEAD = ["/blog/welcome-to-my-blog", "/blog/totally-made-up-slug"];
/* strings that must NEVER reach the user */
const RAW_ERRORS =
  /Unexpected token|Failed to execute 'json'|is not valid JSON|Cannot write headers/i;

/* the page route is "/blog/<slug>" — the API wants the bare slug */
const slugOf = (route) => route.replace(/^\/blog\//, "");

const problems = [];

const api = async (route) => {
  const res = await fetch(
    `${BASE}/api/blog?slug=${encodeURIComponent(slugOf(route))}`,
  );
  const type = res.headers.get("content-type") || "";
  let body = null;
  try {
    body = await res.clone().json();
  } catch {
    body = null;
  }
  return { status: res.status, type, body };
};

console.log("=== API layer ===");
for (const slug of [LIVE, ...DEAD]) {
  const r = await api(slug);
  const json = r.type.includes("json") && r.body !== null;
  const expectStatus = slug === LIVE ? 200 : 404;
  console.log(
    `  ${json && r.status === expectStatus ? "ok  " : "FAIL"} ${slug.padEnd(38)} status=${r.status} type=${r.type.split(";")[0]}`,
  );
  if (!json) {
    problems.push(`${slug}: API did not answer with JSON (type=${r.type})`);
  }
  if (r.status !== expectStatus) {
    problems.push(`${slug}: expected ${expectStatus}, got ${r.status}`);
  }
}

const browser = await puppeteer.launch({
  executablePath: CHROME,
  headless: "new",
  args: ["--no-sandbox", "--disable-dev-shm-usage"],
});

console.log("\n=== rendered page ===");
for (const slug of [LIVE, ...DEAD]) {
  const page = await browser.newPage();
  await page.setViewport({ width: 390, height: 844 });
  await page.evaluateOnNewDocument(() =>
    sessionStorage.setItem("booted", "1"),
  );
  await page.goto(BASE + slug, { waitUntil: "networkidle2" });
  await new Promise((r) => setTimeout(r, 1200));

  const info = await page.evaluate(() => {
    const main =
      document.querySelector("article") ||
      document.querySelector("main") ||
      document.body;
    return {
      text: (main.innerText || "").replace(/\s+/g, " ").trim(),
      h1: document.querySelector("h1")?.innerText?.trim() || null,
      loader: Boolean(document.querySelector(".loader-spinner")),
    };
  });
  await page.close();

  const raw = RAW_ERRORS.test(info.text);
  const expectArticle = slug === LIVE;
  const ok = expectArticle
    ? Boolean(info.h1) && info.text.length > 500
    : info.text.includes("not found") || info.text.includes("Could not load");

  console.log(`  ${ok && !raw ? "ok  " : "FAIL"} ${slug.padEnd(38)}`);
  console.log(
    `       h1=${JSON.stringify(info.h1)} loader=${info.loader} chars=${info.text.length}`,
  );
  console.log(`       text=${JSON.stringify(info.text.slice(0, 110))}`);
  if (raw) problems.push(`${slug}: a raw JSON/parse error is shown to the user`);
  if (!ok) problems.push(`${slug}: unexpected render (no article / no not-found panel)`);
}

await browser.close();

console.log("\n" + "─".repeat(60));
if (problems.length) {
  console.log("FAILURES:");
  for (const p of problems) console.log("  - " + p);
  process.exit(1);
}
console.log("PASS — unknown blog slugs render a clean 'not found' panel and");
console.log("       no raw JSON/parse error ever reaches the user.");
