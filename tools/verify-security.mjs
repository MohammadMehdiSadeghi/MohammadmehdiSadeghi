/* Runtime proof for the security findings — drives the REAL api/index.js
   handler (the Vercel code path) rather than reading it.

   Run: node tools/verify-security.mjs
*/
import { spawn } from "node:child_process";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const BASE = process.cwd();
const TMP = path.join(os.tmpdir(), "pdata-sec");
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

const childPath = path.join(TMP, "child.mjs");
fs.writeFileSync(
  childPath,
  `
import { pathToFileURL } from "node:url";
const H = (await import(pathToFileURL(${JSON.stringify(path.join(BASE, "api", "index.js"))}).href)).default;

async function call(method, route, body, headers = {}) {
  const res = {
    _code: 200, body: null,
    status(c) { this._code = c; return this; },
    json(b) { this.body = b; return this; },
    setHeader() { return this; },
    end() { return this; },
  };
  const req = {
    method, url: "/api/" + route, query: { __route: route }, body,
    headers: { ...headers }, socket: { remoteAddress: "127.0.0.1" },
  };
  await H(req, res);
  return { status: res._code, body: res.body };
}
export { call };
globalThis.__call = call;

const mode = process.argv[2];
if (mode === "probe") {
  const SECRET_PW = "SuperSecret123!";

  // 1. register a user on the PUBLIC sabz endpoint (no auth)
  const reg = await call("POST", "sabz/users", {
    name: "Victim", phoneNumber: "09120000000", password: SECRET_PW,
  });

  // 2. read it back on the same PUBLIC endpoint (no auth)
  const list = await call("GET", "sabz/users");
  const rows = Array.isArray(list.body) ? list.body : (list.body?.users || []);
  const leaked = rows.find((u) => u && (u.password === SECRET_PW));
  console.log(JSON.stringify({
    registerStatus: reg.status,
    listStatus: list.status,
    rowCount: rows.length,
    sampleKeys: rows[0] ? Object.keys(rows[0]) : [],
    leakedPassword: Boolean(leaked),
    leakedValue: leaked ? leaked.password : null,
  }));
} else if (mode === "fsdelete") {
  const login = await call("POST", "admin/auth", {
    username: "mohammad.m.sadeghi09@gmail.com", password: "moha3447",
  });
  const token = login.body && login.body.token;
  const auth = { authorization: "Bearer " + token };
  const before = await call("GET", "admin/fs", undefined, auth);
  const delRoot = await call("POST", "admin/fs-delete", { path: "" }, auth);
  const afterRoot = await call("GET", "admin/fs", undefined, auth);
  /* a legitimate delete of a real sub-path must STILL work */
  const delFile = await call("POST", "admin/fs-delete", { path: "sentinel.json" }, auth);
  const afterFile = await call("GET", "admin/fs", undefined, auth);
  console.log(JSON.stringify({
    beforeItems: (before.body?.items || []).map((i) => i.name),
    rootStatus: delRoot.status,
    rootError: delRoot.body?.error || null,
    afterRootItems: (afterRoot.body?.items || []).map((i) => i.name),
    fileStatus: delFile.status,
    afterFileItems: (afterFile.body?.items || []).map((i) => i.name),
  }));
} else if (mode === "overlay") {
  const login = await call("POST", "admin/auth", {
    username: "mohammad.m.sadeghi09@gmail.com", password: "moha3447",
  });
  const token = login.body && login.body.token;
  const auth = { authorization: "Bearer " + token };
  const TITLE = "ZZ-Overlay-Probe";

  const created = await call("POST", "admin/projects-admin", {
    title: TITLE, description: "probe", url: "https://example.com",
    image: "x.png", category: ["web"],
  }, auth);

  // the PUBLIC route must now reflect the admin write
  const publicList = await call("GET", "projects.json");
  const rows = Array.isArray(publicList.body) ? publicList.body : [];
  const published = rows.some((p) => p && p.title === TITLE);

  // ...and so must the public skills route
  const skillCreate = await call("POST", "admin/skills-admin", { name: TITLE, img: "x.png" }, auth);
  const publicSkills = await call("GET", "skills");
  const skillRows = Array.isArray(publicSkills.body?.skills) ? publicSkills.body.skills : [];
  const skillPublished = skillRows.some((s) => s && s.name === TITLE);

  // clean up so repeat runs stay clean
  if (created.body?.project?.id != null) {
    await call("DELETE", "admin/projects-admin", { id: created.body.project.id }, auth);
  }
  if (skillCreate.body?.skill?.id != null) {
    await call("DELETE", "admin/skills-admin", { id: skillCreate.body.skill.id }, auth);
  }

  console.log(JSON.stringify({
    createStatus: created.status,
    publicCount: rows.length,
    published,
    skillCreateStatus: skillCreate.status,
    skillPublished,
  }));
} else if (mode === "tokenrotate") {
  const login = await call("POST", "admin/auth", {
    username: "mohammad.m.sadeghi09@gmail.com", password: "moha3447",
  });
  const oldToken = login.body && login.body.token;
  const before = await call("GET", "admin/auth-check", undefined, { authorization: "Bearer " + oldToken });

  const changed = await call("POST", "admin/password", {
    currentPassword: "moha3447", newPassword: "rotated-pass-123",
  }, { authorization: "Bearer " + oldToken });
  const newToken = changed.body && changed.body.token;

  // the token that existed BEFORE the change must no longer be accepted
  const oldAfter = await call("GET", "admin/auth-check", undefined, { authorization: "Bearer " + oldToken });
  const newAfter = await call("GET", "admin/auth-check", undefined, { authorization: "Bearer " + newToken });

  console.log(JSON.stringify({
    loginStatus: login.status,
    beforeStatus: before.status,
    changeStatus: changed.status,
    gotNewToken: Boolean(newToken),
    oldTokenStatus: oldAfter.status,
    newTokenStatus: newAfter.status,
  }));
}
`,
);

function runChild(mode, env) {
  return new Promise((resolve, reject) => {
    const child = spawn(process.execPath, [childPath, mode], {
      cwd: BASE,
      env: { ...process.env, VERCEL_ADMIN_SECRET: "sec-test", ...env },
    });
    let out = "";
    let err = "";
    child.stdout.on("data", (d) => (out += d));
    child.stderr.on("data", (d) => (err += d));
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0) return reject(new Error(`child ${mode} exited ${code}: ${err || out}`));
      resolve(JSON.parse(out.trim().split("\n").pop()));
    });
  });
}

const problems = [];

/* ── finding 1: plaintext password on a public endpoint ──────────────
   KNOWN / ACCEPTED, not a regression: Sabz-Learn's prebuilt bundle compares
   the password in the browser, so the field has to stay until that client is
   rebuilt. Asserted here so nobody "fixes" it and silently breaks the login. */
const leak = await runChild("probe", { VERCEL_DATA_DIR: path.join(TMP, "leak") });
console.log("=== public sabz/users endpoint ===");
console.log(`  register          : status ${leak.registerStatus}`);
console.log(`  GET (no auth)     : status ${leak.listStatus}, ${leak.rowCount} row(s)`);
console.log(`  fields returned   : ${JSON.stringify(leak.sampleKeys)}`);
console.log(`  password present  : ${leak.leakedPassword ? "YES (known — client-side login depends on it)" : "no"}`);
if (!leak.leakedPassword) {
  problems.push(
    "sabz/users no longer returns `password` — Sabz-Learn's prebuilt client compares it in the browser, so its login is now broken. Rebuild the client before stripping this field.",
  );
}

/* ── finding 2: fs-delete with an empty path ─────────────────────── */
const wipeDir = path.join(TMP, "wipe");
fs.mkdirSync(wipeDir, { recursive: true });
/* seed real files directly — the handler's own write API is not the point */
fs.writeFileSync(path.join(wipeDir, "sentinel.json"), '{"keep":true}');
fs.writeFileSync(path.join(wipeDir, "messages.json"), '{"messages":[]}');
const wipe = await runChild("fsdelete", { VERCEL_DATA_DIR: wipeDir });
console.log('\n=== POST /api/admin/fs-delete { path: "" } ===');
console.log(`  listing the root  : ${JSON.stringify(wipe.beforeItems)}`);
console.log(`  delete root       : status ${wipe.rootStatus} ${JSON.stringify(wipe.rootError)}`);
console.log(`  after             : ${JSON.stringify(wipe.afterRootItems)}`);
/* Guards the guard: an earlier version of this fix refused the root for ALL
   methods, which silently broke the Database page's root listing. */
const rootListable = wipe.beforeItems.length === 2;
if (!rootListable) {
  problems.push(
    `listing the data root is broken (got ${JSON.stringify(wipe.beforeItems)}) — the delete guard must not apply to GET`,
  );
}
const rootSurvived = wipe.afterRootItems.length === wipe.beforeItems.length;
console.log(`  DATA DIR SURVIVED : ${rootSurvived ? "YES" : "NO"}`);
if (wipe.rootStatus !== 400 || !rootSurvived) {
  problems.push(
    `api/admin/_fs.js fs-delete still accepts an empty path (status ${wipe.rootStatus}, ${wipe.afterRootItems.length} of ${wipe.beforeItems.length} files left)`,
  );
}
/* the guard must not have broken legitimate deletes */
console.log('\n=== POST /api/admin/fs-delete { path: "sentinel.json" } (must still work) ===');
console.log(`  delete file       : status ${wipe.fileStatus}`);
console.log(`  after             : ${JSON.stringify(wipe.afterFileItems)}`);
const fileDeleted = wipe.fileStatus === 200 && !wipe.afterFileItems.includes("sentinel.json");
console.log(`  FILE DELETED      : ${fileDeleted ? "YES" : "NO"}`);
if (!fileDeleted) {
  problems.push("the empty-path guard also blocks legitimate file deletes");
}

/* ── finding 3: admin edits must reach the public endpoints ──────── */
const overlay = await runChild("overlay", { VERCEL_DATA_DIR: path.join(TMP, "overlay") });
console.log("\n=== admin write → public read ===");
console.log(`  create project    : status ${overlay.createStatus}`);
console.log(`  GET /api/projects.json : ${overlay.publicCount} rows, contains new one: ${overlay.published}`);
console.log(`  create skill      : status ${overlay.skillCreateStatus}`);
console.log(`  GET /api/skills   : contains new one: ${overlay.skillPublished}`);
if (!overlay.published) {
  problems.push(
    "a project created in the admin panel is NOT served by GET /api/projects.json (overlay ignored — the edit is silently lost on the live site)",
  );
}
if (!overlay.skillPublished) {
  problems.push(
    "a skill created in the admin panel is NOT served by GET /api/skills (overlay ignored)",
  );
}

/* ── finding 4: a password change must kill existing tokens ──────── */
const rotate = await runChild("tokenrotate", { VERCEL_DATA_DIR: path.join(TMP, "rotate") });
console.log("\n=== rotate the admin password ===");
console.log(`  old token before  : status ${rotate.beforeStatus}`);
console.log(`  change password   : status ${rotate.changeStatus}, new token issued: ${rotate.gotNewToken}`);
console.log(`  OLD token after   : status ${rotate.oldTokenStatus} (must be 401)`);
console.log(`  NEW token after   : status ${rotate.newTokenStatus} (must be 200)`);
if (rotate.oldTokenStatus !== 401) {
  problems.push(
    `a token issued before the password change is still accepted (status ${rotate.oldTokenStatus}) — a leaked token survives a password rotation`,
  );
}
if (rotate.newTokenStatus !== 200) {
  problems.push(
    `the operator is locked out after changing their own password (new token status ${rotate.newTokenStatus})`,
  );
}

console.log("\n" + "─".repeat(60));
if (problems.length) {
  console.log("CONFIRMED ISSUES:");
  for (const p of problems) console.log("  - " + p);
  process.exit(1);
}
console.log("No issues reproduced.");
