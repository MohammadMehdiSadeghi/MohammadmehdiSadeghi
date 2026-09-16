/* Cross-instance token test — the bug that broke the live admin panel.

   Vercel runs each request in a fresh lambda, so a token issued by one
   invocation must still verify in another. That only holds if the HMAC
   secret is stable. This runs the handler in TWO SEPARATE Node processes
   (simulating two lambdas) and checks a token from the first is accepted
   by the second. */
import { spawnSync } from "node:child_process";
import fs from "node:fs";
import path from "node:path";

const BASE = process.cwd();
const DATA = (process.env.LOCALAPPDATA || "/tmp") + "/Temp/pdata-cross";
fs.rmSync(DATA, { recursive: true, force: true });

const CHILD = `
import { pathToFileURL } from "node:url";
const H = (await import(pathToFileURL(${JSON.stringify(path.join(BASE, "api/index.js"))}).href)).default;
const mode = process.argv[2];
const token = process.argv[3] || "";
const res = { status: 200, body: null };
const r = {
  method: mode === "login" ? "POST" : "GET",
  url: mode === "login" ? "/api/admin/auth" : "/api/admin/auth-check",
  query: { __route: mode === "login" ? "admin/auth" : "admin/auth-check" },
  body: mode === "login"
    ? { username: "mohammad.m.sadeghi09@gmail.com", password: "moha3447" }
    : undefined,
  headers: { authorization: token ? "Bearer " + token : "" },
  socket: { remoteAddress: "127.0.0.1" },
};
const out = {
  _code: 200,
  body: null,
  status(c) { this._code = c; return this; },
  json(b) { this.body = b; return this; },
  setHeader() { return this; },
  end() { return this; },
};
await H(r, out);
console.log(JSON.stringify({ status: out._code, body: out.body }));
`;

const script = path.join(DATA, "child.mjs");
fs.mkdirSync(DATA, { recursive: true });
fs.writeFileSync(script, CHILD, "utf8");

const env = { ...process.env, VERCEL_DATA_DIR: DATA };
delete env.VERCEL_ADMIN_SECRET; // force the persisted-secret path

const run = (mode, token = "") =>
  JSON.parse(
    spawnSync(process.execPath, [script, mode, token], {
      cwd: BASE,
      env,
      encoding: "utf8",
    }).stdout.trim() || "{}"
  );

let pass = 0, fail = 0;
const check = (label, cond, detail = "") => {
  if (cond) { pass++; console.log("  ok  ", label, detail); }
  else { fail++; console.log("  FAIL", label, detail); }
};

console.log("=== two separate processes (two lambdas) ===");
const login = run("login");
check("lambda A: login 200", login.status === 200, `→ ${login.status}`);
const token = login.body?.token || "";
check("lambda A: token issued", !!token);

const verify = run("auth-check", token);
check("lambda B accepts lambda A's token", verify.status === 200, `→ ${verify.status} ${JSON.stringify(verify.body)}`);

// the secret must be DERIVED (identical on every lambda), never read from
// instance-local storage: assert the two processes agreed with no shared file
check("no instance-local secret file needed",
  !fs.existsSync(path.join(DATA, "admin-secret")));

// and the env var still wins when set
const env2 = { ...env, VERCEL_ADMIN_SECRET: "explicit-env-secret" };
const run2 = (mode, t = "") =>
  JSON.parse(spawnSync(process.execPath, [script, mode, t], { cwd: BASE, env: env2, encoding: "utf8" }).stdout.trim() || "{}");
const l2 = run2("login");
const v2 = run2("auth-check", l2.body?.token || "");
check("env secret path also cross-verifies", v2.status === 200, `→ ${v2.status}`);

fs.rmSync(DATA, { recursive: true, force: true });
console.log(`\n════════ ${pass} passed, ${fail} failed ════════`);
if (fail) process.exitCode = 1;
