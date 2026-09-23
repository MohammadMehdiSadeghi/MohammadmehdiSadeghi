/* End-to-end check of the admin "Site info" editor, in a real browser.

   verify-store-endpoints.mjs already proves the server half of the chain
   (an authenticated PUT to /api/admin/site-admin is visible on
   GET /api/site.json, on both stores). This proves the half it cannot:
   that the value which arrives on /api/site.json actually reaches the DOM —
   the header brand, the footer handle, the mailto:/tel: hrefs and the
   contacts rows.

   It runs tools/emulate-vercel.mjs, which serves dist/ and runs the REAL
   api/index.js handler, against a throwaway VERCEL_DATA_DIR. So the writes
   below land in a temp directory and never touch the git-tracked
   public/api/site.json.

   Run: node tools/verify-site-info.mjs   (needs `npm run build` first)
*/
import { spawn } from "node:child_process";
import net from "node:net";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";

const BASE = process.cwd();
const DIST_ENTRY = path.join(BASE, "dist", "index.html");
if (!fs.existsSync(DIST_ENTRY)) {
  console.log("dist/index.html missing — run `npm run build` first");
  process.exit(1);
}

/* The emulator resolves credentials from DEFAULT_ADMIN unless an
   admin-auth.json override sits in its data dir. Wipe it so the login below
   is the one the other suites use. */
const DATA_DIR = (process.env.LOCALAPPDATA || "/tmp") + "/Temp/pdata-emul";
fs.rmSync(DATA_DIR, { recursive: true, force: true });

const procs = [];
const freePort = () =>
  new Promise((res) => {
    const s = net.createServer();
    s.listen(0, "127.0.0.1", () => {
      const p = s.address().port;
      s.close(() => res(p));
    });
  });

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

/* ── server ──────────────────────────────────────────────────────── */
const port = await freePort();
const server = spawn(process.execPath, [path.join("tools", "emulate-vercel.mjs")], {
  cwd: BASE,
  /* the emulator reads EMUL_PORT, not PORT */
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

/* ── login ───────────────────────────────────────────────────────── */
const loginRes = await fetch(`${base}/api/admin/auth`, {
  method: "POST",
  headers: { "Content-Type": "application/json" },
  body: JSON.stringify({
    username: "mohammad.m.sadeghi09@gmail.com",
    password: "moha3447",
  }),
});
const login = await loginRes.json().catch(() => ({}));
if (!login.token) {
  console.log("login failed:", loginRes.status, JSON.stringify(login));
  process.exit(1);
}
const AUTH = { Authorization: `Bearer ${login.token}`, "Content-Type": "application/json" };

const apiGet = async () => {
  const r = await fetch(`${base}/api/site.json`, { cache: "no-store" });
  return r.json();
};
const apiPut = async (patch) => {
  const r = await fetch(`${base}/api/admin/site-admin`, {
    method: "PUT",
    headers: AUTH,
    body: JSON.stringify(patch),
  });
  return { status: r.status, body: await r.json().catch(() => ({})) };
};

/* ── chrome ──────────────────────────────────────────────────────── */
const CHROME = "C:/Program Files/Google/Chrome/Application/chrome.exe";
if (!fs.existsSync(CHROME)) {
  console.log("chrome not found at", CHROME);
  process.exit(1);
}
const PROF = path.join(os.tmpdir(), "hermes-siteinfo-" + Date.now());
const cdpPort = 9600 + Math.floor(Math.random() * 300);
const chrome = spawn(
  CHROME,
  [
    "--headless=new",
    `--remote-debugging-port=${cdpPort}`,
    `--user-data-dir=${PROF}`,
    "--no-first-run",
    "--no-default-browser-check",
    "--disable-extensions",
    "--window-size=1440,900",
    "about:blank",
  ],
  { stdio: ["ignore", "pipe", "pipe"] },
);
chrome.stdout.on("data", () => {});
chrome.stderr.on("data", () => {});
procs.push(chrome);

let target = null;
for (let i = 0; i < 60; i++) {
  await new Promise((r) => setTimeout(r, 500));
  try {
    const list = await (await fetch(`http://127.0.0.1:${cdpPort}/json/list`)).json();
    target = list.find((t) => t.type === "page");
    if (target?.webSocketDebuggerUrl) break;
  } catch {
    /* not up yet */
  }
}
if (!target) {
  console.log("chrome never came up");
  process.exit(1);
}

const ws = new WebSocket(target.webSocketDebuggerUrl);
await new Promise((r) => (ws.onopen = r));
let id = 0;
const pend = new Map();
let jsErrors = [];
ws.onmessage = (e) => {
  const m = JSON.parse(e.data);
  if (m.id && pend.has(m.id)) {
    pend.get(m.id)(m);
    pend.delete(m.id);
  }
  if (m.method === "Runtime.exceptionThrown") {
    jsErrors.push(
      (
        m.params?.exceptionDetails?.exception?.description ||
        m.params?.exceptionDetails?.text ||
        "?"
      )
        .split("\n")[0]
        .slice(0, 140),
    );
  }
  if (m.method === "Runtime.consoleAPICalled" && m.params.type === "error") {
    jsErrors.push(
      (m.params.args || []).map((a) => a.value ?? a.description ?? "").join(" ").slice(0, 140),
    );
  }
};
const send = (method, params = {}) =>
  new Promise((res) => {
    const i = ++id;
    pend.set(i, res);
    ws.send(JSON.stringify({ id: i, method, params }));
  });
const ev = async (expr) => {
  const r = await send("Runtime.evaluate", {
    expression: expr,
    awaitPromise: true,
    returnByValue: true,
  });
  if (r.result?.exceptionDetails) return { __err: r.result.exceptionDetails.text };
  return r.result?.result?.value;
};

await send("Runtime.enable");
await send("Page.enable");
await send("Emulation.setDeviceMetricsOverride", {
  width: 1440,
  height: 900,
  deviceScaleFactor: 1,
  mobile: false,
});
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

/* innerText of the parts of the page the site info feeds. */
const SNAP = `(() => {
  const t = (el) => (el ? el.innerText.replace(/\\s+/g, ' ').trim() : null);
  const header = document.querySelector('header');
  const footer = document.querySelector('footer');
  const navs = Array.from(document.querySelectorAll('nav'));
  const contactsNav = navs.find((n) => /^contacts/.test(n.innerText.replace(/\\s+/g,' ').trim()));
  return {
    headerBrand: t(header && header.querySelector('a')),
    footer: t(footer),
    contacts: contactsNav
      ? Array.from(contactsNav.querySelectorAll('li')).map((li) => ({
          text: t(li),
          href: li.querySelector('a') ? li.querySelector('a').getAttribute('href') : null,
        }))
      : [],
  };
})()`;

async function open(route) {
  jsErrors = [];
  await send("Page.navigate", { url: base + route });
  let snap = null;
  for (let i = 0; i < 40; i++) {
    await sleep(400);
    snap = await ev(SNAP);
    if (snap && !snap.__err && snap.headerBrand && snap.footer) break;
  }
  return snap;
}

const problems = [];
const check = (name, pass, detail = "") => {
  console.log(`  ${pass ? "ok  " : "FAIL"} ${name}${pass || !detail ? "" : " — " + detail}`);
  if (!pass) problems.push(`${name}${detail ? " (" + detail + ")" : ""}`);
};

/* ══════════ 1. baseline: the stored values render ══════════ */
const original = await apiGet();
console.log("\n=== 1. baseline (stored values reach the DOM) ===");
let snap = await open("/contact");
check("header shows the stored brand", snap.headerBrand === original.brand, `got "${snap.headerBrand}"`);
const rowText = snap.contacts.map((r) => r.text).join(" | ");
check("email row rendered", rowText.includes(original.email), rowText);
check("phone label rendered", rowText.includes(original.phoneLabel), rowText);
check("telegram handle rendered", rowText.includes("@" + original.telegramHandle), rowText);
check("instagram handle rendered", rowText.includes("@" + original.instagramHandle), rowText);
const mailHref = snap.contacts.find((r) => (r.href || "").startsWith("mailto:"));
check("mailto: built from the stored email", mailHref?.href === `mailto:${original.email}`, mailHref?.href);
const telHref = snap.contacts.find((r) => (r.href || "").startsWith("tel:"));
check("tel: built from the stored phone", telHref?.href === `tel:${original.phone}`, telHref?.href);

/* ══════════ 2. an admin edit reaches the page ══════════ */
console.log("\n=== 2. admin edit reaches the public page ===");
const EDITED = {
  brand: "Brand-From-Admin",
  email: "admin-edited@example.com",
  phone: "+15551234567",
  phoneLabel: "+1 555 123 4567",
  github: "https://github.com/edited-handle",
  githubHandle: "edited-handle",
  telegram: "https://t.me/edited_handle",
  telegramHandle: "edited_handle",
};
const put = await apiPut({ ...original, ...EDITED });
check("PUT accepted", put.status === 200, `status=${put.status} ${JSON.stringify(put.body).slice(0, 120)}`);

snap = await open("/contact");
check("header shows the NEW brand", snap.headerBrand === EDITED.brand, `got "${snap.headerBrand}"`);
const newRows = snap.contacts.map((r) => r.text).join(" | ");
check("NEW email rendered", newRows.includes(EDITED.email), newRows);
check("NEW phone label rendered", newRows.includes(EDITED.phoneLabel), newRows);
check("NEW telegram handle rendered", newRows.includes("@" + EDITED.telegramHandle), newRows);
check("OLD email is gone", !newRows.includes(original.email), newRows);
const newMail = snap.contacts.find((r) => (r.href || "").startsWith("mailto:"));
check("mailto: follows the edit", newMail?.href === `mailto:${EDITED.email}`, newMail?.href);
const newTel = snap.contacts.find((r) => (r.href || "").startsWith("tel:"));
check("tel: follows the edit", newTel?.href === `tel:${EDITED.phone}`, newTel?.href);
check("footer shows the NEW github handle", (snap.footer || "").includes(EDITED.githubHandle), snap.footer);
check("no uncaught JS on /contact", jsErrors.length === 0, jsErrors.join(" ; "));

snap = await open("/");
check("home page header shows the NEW brand", snap.headerBrand === EDITED.brand, `got "${snap.headerBrand}"`);
const homeGithub = await ev(`(() => {
  const a = Array.from(document.querySelectorAll('a')).find((x) => (x.getAttribute('href')||'').includes('github.com/edited-handle'));
  return a ? a.getAttribute('href') : null;
})()`);
check("home page github link follows the edit", homeGithub === EDITED.github, String(homeGithub));

/* ══════════ 3. clearing a field removes the row ══════════ */
console.log("\n=== 3. clearing a value removes it from the site ===");
const cleared = await apiPut({ ...original, ...EDITED, instagram: "" });
check("PUT accepted", cleared.status === 200, `status=${cleared.status}`);
snap = await open("/contact");
const hasInstagram = snap.contacts.some((r) => (r.href || "").includes("instagram"));
check("instagram row is gone", !hasInstagram, JSON.stringify(snap.contacts));
check(
  "the other rows survived",
  snap.contacts.length === 3 &&
    snap.contacts.map((r) => r.text).join(" | ").includes(EDITED.email) &&
    snap.contacts.map((r) => r.text).join(" | ").includes(EDITED.phoneLabel),
  JSON.stringify(snap.contacts),
);
check("no uncaught JS after clearing", jsErrors.length === 0, jsErrors.join(" ; "));

/* ══════════ 4. restore ══════════ */
console.log("\n=== 4. restore ===");
const back = await apiPut(original);
check("restore accepted", back.status === 200, `status=${back.status}`);
const after = await apiGet();
/* updatedAt is the server's stamp, not a field the form owns — compare the
   editable values only, which is exactly what "restored" means here. */
const strip = (o) => {
  const { updatedAt, ...rest } = o || {};
  return rest;
};
check(
  "stored object matches the original",
  JSON.stringify(strip(after)) === JSON.stringify(strip(original)),
  `${JSON.stringify(strip(after)).slice(0, 160)}`,
);
snap = await open("/contact");
check("page is back to the original brand", snap.headerBrand === original.brand, `got "${snap.headerBrand}"`);
check("original email rendered again", snap.contacts.map((r) => r.text).join(" | ").includes(original.email));

/* ══════════ report ══════════ */
console.log("\n" + "─".repeat(60));
if (problems.length) {
  console.log("FAILURES:");
  for (const p of problems) console.log("  - " + p);
  cleanup();
  process.exit(1);
}
console.log("PASS — the admin editor's values render on the live pages,");
console.log("       edits propagate to header/footer/contacts, cleared fields");
console.log("       disappear instead of leaving dead links, and restore works.");
cleanup();
process.exit(0);
