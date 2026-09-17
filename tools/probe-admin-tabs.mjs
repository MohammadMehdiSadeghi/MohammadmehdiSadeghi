/* Boot the real Node backend (npm start / server.js) as a child process and
   exercise every admin endpoint the panel's tabs need. Uses the project's own
   data/config.json to mint a token (HMAC), so no credentials are handled here.

   Why: `npm run dev` (vite + mock) and `npm start` (server.js) are DIFFERENT
   backends. A tab can be green on the live deploy and broken on one of them. */
import { spawn } from "node:child_process";
import crypto from "node:crypto";
import fs from "node:fs";
import path from "node:path";

const BASE = "http://127.0.0.1:3111";
/* server.js's verifyToken: standard base64 payload, exp in SECONDS, and the
   token_version must match as `ver`. Getting any of these wrong yields a
   blanket 401 that looks like "the tab is broken". */
const cfg = JSON.parse(fs.readFileSync(path.join(process.cwd(), "data", "config.json"), "utf8"));
const payload = Buffer.from(
  JSON.stringify({
    u: cfg.username,
    exp: Math.floor(Date.now() / 1000) + 7 * 86400,
    ver: cfg.token_version || 0,
  }),
).toString("base64");
const sig = crypto.createHmac("sha256", cfg.secret).update(payload).digest("base64url");
const TOKEN = `${payload}.${sig}`;

const srv = spawn(process.execPath, ["server.js"], {
  env: { ...process.env, PORT: "3111" },
  stdio: ["ignore", "pipe", "pipe"],
});
let boot = "";
srv.stdout.on("data", (c) => (boot += c));
srv.stderr.on("data", (c) => (boot += c));

let pass = 0, fail = 0;
const check = (l, c, d = "") => { c ? (pass++, console.log("  ok  ", l, d)) : (fail++, console.log("  FAIL", l, d)); };

try {
  let up = false;
  for (let i = 0; i < 60; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try {
      const r = await fetch(BASE + "/api/projects.json");
      if (r.ok) { up = true; break; }
    } catch { /* not yet */ }
  }
  if (!up) { console.log("SERVER DID NOT START\n" + boot.slice(-800)); process.exit(1); }
  console.log("  server up on " + BASE);

  const H = { Authorization: "Bearer " + TOKEN, "Content-Type": "application/json" };
  const call = async (method, url, body) =>
    fetch(BASE + url, { method, headers: H, body: body ? JSON.stringify(body) : undefined })
      .then(async (r) => ({ status: r.status, ct: r.headers.get("content-type") || "", text: await r.text() }))
      .catch((e) => ({ status: 0, ct: "", text: String(e.message) }));

  /* ── the Database tab ───────────────────────────────────────────── */
  console.log("\n════ Database tab (server.js) ════");
  const list = await call("GET", "/api/admin/fs?path=");
  console.log(`  GET /api/admin/fs?path= → ${list.status} ${list.ct}\n     ${list.text.slice(0, 200).replace(/\s+/g, " ")}`);
  check("fs listing returns JSON", list.status === 200 && /json/.test(list.ct), `${list.status} ${list.ct}`);
  let items = [];
  try { items = JSON.parse(list.text).items || []; } catch { /* reported below */ }
  check("fs listing has entries", items.length > 0, `${items.length} items`);
  /* the file manager browses the WHOLE project root, node_modules included —
     it is the size column that skips it, not the listing */
  const names = items.map((i) => i.name);
  check("listing sorted dirs-first", items.every((it, i) => i === 0 || !(it.type === "dir" && items[i - 1].type === "file")), names.slice(0, 5).join(","));
  check("lists the real project root", names.includes("src") && names.includes("package.json"), names.slice(0, 6).join(","));

  const size = await call("GET", "/api/admin/fs-size?path=src");
  console.log(`  GET /api/admin/fs-size?path=src → ${size.status} ${size.ct}\n     ${size.text.slice(0, 140)}`);
  const sz = (() => { try { return JSON.parse(size.text); } catch { return {}; } })();
  check("fs-size returns a real size", size.status === 200 && sz.size > 0, JSON.stringify(sz));

  const bad = await call("GET", "/api/admin/fs?path=../../../../Windows");
  check("traversal is refused", bad.status === 400 || bad.status === 404, `${bad.status} ${bad.text.slice(0, 80)}`);

  const rootDel = await call("POST", "/api/admin/fs-delete", { path: "" });
  check("deleting the project root is refused", rootDel.status === 400, `${rootDel.status} ${rootDel.text.slice(0, 80)}`);
  const gitDel = await call("POST", "/api/admin/fs-delete", { path: ".git" });
  check("deleting .git is refused", gitDel.status === 400, `${gitDel.status} ${gitDel.text.slice(0, 80)}`);

  /* ── every other tab's data source ──────────────────────────────── */
  console.log("\n════ the other tabs ════");
  for (const [name, method, url, body] of [
    ["stats", "GET", "/api/admin/stats"],
    ["messages", "GET", "/api/admin/messages"],
    ["projects", "GET", "/api/admin/projects-admin"],
    ["skills", "GET", "/api/admin/skills-admin"],
    ["blog", "GET", "/api/admin/blog-admin"],
    ["moods", "GET", "/api/admin/moods"],
    ["telegram", "GET", "/api/admin/telegram"],
    ["reset(sabz)", "POST", "/api/admin/reset", { target: "sabz" }],
  ]) {
    const r = await call(method, url, body);
    const ok = r.status === 200 && /json/.test(r.ct);
    check(`${name} answers JSON`, ok, `${r.status} ${r.ct} ${r.text.slice(0, 70).replace(/\s+/g, " ")}`);
  }
} finally {
  srv.kill();
  try { process.kill(-srv.pid); } catch { /* ignore */ }
}
console.log(`\n════════ ${pass} passed, ${fail} failed ════════`);
process.exit(fail ? 1 : 0);
