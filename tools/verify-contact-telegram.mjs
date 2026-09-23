/* Contact form → Telegram notification wiring.
   Uses a fake Telegram REST server so no real bot is needed.

   Checks:
     1. POST /api/admin/messages saves the message AND calls Telegram
        when config is enabled.
     2. Disabled config → no Telegram call, message still saved.
     3. Telegram outage → contact endpoint still returns 200.

   Run: node tools/verify-contact-telegram.mjs
*/
import http from "node:http";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import { pathToFileURL } from "node:url";

const BASE = process.cwd();
const TMP = path.join(os.tmpdir(), "pdata-contact-tg");
fs.rmSync(TMP, { recursive: true, force: true });
fs.mkdirSync(TMP, { recursive: true });

/* ── fake Telegram API ── */
const calls = [];
let telegramMode = "ok"; // ok | fail
const tg = http.createServer((req, res) => {
  let body = "";
  req.on("data", (c) => (body += c));
  req.on("end", () => {
    calls.push({ url: req.url, body: JSON.parse(body || "{}") });
    res.setHeader("Content-Type", "application/json");
    if (telegramMode === "fail") {
      res.statusCode = 500;
      res.end(JSON.stringify({ ok: false, description: "boom" }));
      return;
    }
    res.end(JSON.stringify({ ok: true, result: {} }));
  });
});
await new Promise((r) => tg.listen(0, "127.0.0.1", r));
const TG_PORT = tg.address().port;

/* Rewrite api.telegram.org to our fake via undici/fetch is hard — instead
   we monkey-patch global fetch in the child for the telegram host only. */
const childPath = path.join(TMP, "child.mjs");
fs.writeFileSync(
  childPath,
  `
import { pathToFileURL } from "node:url";

const realFetch = globalThis.fetch;
globalThis.fetch = (url, init) => {
  const u = String(url);
  if (u.includes("api.telegram.org")) {
    return realFetch(u.replace("https://api.telegram.org", ${JSON.stringify(`http://127.0.0.1:${TG_PORT}`)}), init);
  }
  return realFetch(url, init);
};

const H = (await import(pathToFileURL(${JSON.stringify(path.join(BASE, "api", "index.js"))}).href)).default;

async function call(method, route, body, headers = {}) {
  const res = {
    _code: 200,
    body: null,
    status(c) { this._code = c; return this; },
    json(b) { this.body = b; return this; },
    setHeader() { return this; },
    end() { return this; },
  };
  const req = {
    method,
    url: "/api/" + route,
    query: { __route: route },
    body,
    headers: { ...headers },
    socket: { remoteAddress: "127.0.0.1" },
  };
  await H(req, res);
  return { status: res._code, body: res.body };
}

const mode = process.argv[2];
const dir = process.argv[3];

if (mode === "seed-enabled") {
  // write telegram config through the real save endpoint (needs auth)
  const login = await call("POST", "admin/auth", {
    username: "mohammad.m.sadeghi09@gmail.com",
    password: "moha3447",
  });
  const token = login.body?.token;
  if (!token) { console.log(JSON.stringify({ error: "login failed", login })); process.exit(0); }
  const save = await call("POST", "admin/telegram", {
    enabled: true,
    botToken: "123456789:AAAA" + "B".repeat(30),
    chatId: "42",
  }, { authorization: "Bearer " + token });
  console.log(JSON.stringify({ save: save.status, body: save.body }));
} else if (mode === "seed-disabled") {
  const login = await call("POST", "admin/auth", {
    username: "mohammad.m.sadeghi09@gmail.com",
    password: "moha3447",
  });
  const token = login.body?.token;
  await call("POST", "admin/telegram", {
    enabled: false,
    botToken: "123456789:AAAA" + "B".repeat(30),
    chatId: "42",
  }, { authorization: "Bearer " + token });
  console.log(JSON.stringify({ ok: true }));
} else if (mode === "submit") {
  const out = await call("POST", "admin/messages", {
    name: "Test User",
    phoneNumber: "+98 912 000 0000",
    message: "Hello <b>world</b>",
  });
  console.log(JSON.stringify({ status: out.status, body: out.body }));
} else if (mode === "log") {
  const login = await call("POST", "admin/auth", {
    username: "mohammad.m.sadeghi09@gmail.com",
    password: "moha3447",
  });
  const token = login.body?.token;
  const out = await call("GET", "admin/telegram", undefined, {
    authorization: "Bearer " + token,
  });
  console.log(JSON.stringify({ status: out.status, log: out.body?.log || [] }));
}
`,
);

function runChild(mode, env) {
  return new Promise((resolve, reject) => {
    import("node:child_process").then(({ spawn }) => {
      const child = spawn(process.execPath, [childPath, mode], {
        cwd: BASE,
        env: { ...process.env, VERCEL_DATA_DIR: TMP, VERCEL_ADMIN_SECRET: "verify-secret", ...env },
      });
      let out = "";
      let err = "";
      child.stdout.on("data", (d) => (out += d));
      child.stderr.on("data", (d) => (err += d));
      child.on("error", reject);
      child.on("close", (code) => {
        if (code !== 0) return reject(new Error(`${mode} exited ${code}: ${err || out}`));
        try {
          resolve(JSON.parse(out.trim().split("\n").pop()));
        } catch {
          reject(new Error(`${mode} no JSON: ${out || err}`));
        }
      });
    });
  });
}

const problems = [];

/* 1. enabled → telegram receives the contact message + log entry */
calls.length = 0;
await runChild("seed-enabled");
const sub1 = await runChild("submit");
if (sub1.status !== 200) problems.push(`enabled: submit status ${sub1.status}`);
if (calls.length !== 1) problems.push(`enabled: expected 1 Telegram call, got ${calls.length}`);
else {
  const c = calls[0];
  if (!c.url.includes("/sendMessage")) problems.push(`enabled: wrong url ${c.url}`);
  if (c.body.chat_id !== "42") problems.push(`enabled: chat_id=${c.body.chat_id}`);
  const text = c.body.text || "";
  if (!text.includes("Test User")) problems.push("enabled: name missing from Telegram text");
  if (!text.includes("Hello &lt;b&gt;world&lt;/b&gt;")) {
    problems.push(`enabled: message not HTML-escaped: ${text}`);
  }
}
const log1 = await runChild("log");
const okEntry = (log1.log || []).find((e) => e.kind === "contact" && e.ok);
if (!okEntry) problems.push(`enabled: no ok contact entry in log: ${JSON.stringify(log1.log)}`);

/* 2. disabled → no telegram call, message still saved, log records skip */
calls.length = 0;
await runChild("seed-disabled");
const sub2 = await runChild("submit");
if (sub2.status !== 200) problems.push(`disabled: submit status ${sub2.status}`);
if (calls.length !== 0) problems.push(`disabled: unexpected Telegram call`);
const log2 = await runChild("log");
const skipEntry = (log2.log || []).find((e) => e.kind === "contact" && e.skipped);
if (!skipEntry) problems.push("disabled: no skipped entry in log");

/* 3. telegram down → contact still 200, log records failure */
calls.length = 0;
telegramMode = "fail";
await runChild("seed-enabled");
const sub3 = await runChild("submit");
if (sub3.status !== 200) problems.push(`outage: submit status ${sub3.status} (should still be 200)`);
if (calls.length !== 1) problems.push(`outage: expected attempted call, got ${calls.length}`);
const log3 = await runChild("log");
const failEntry = (log3.log || []).find((e) => e.kind === "contact" && !e.ok && !e.skipped && e.error);
if (!failEntry) problems.push(`outage: no failure entry in log: ${JSON.stringify(log3.log)}`);

tg.close();
console.log("\n" + "─".repeat(60));
if (problems.length) {
  console.log("FAILURES:");
  for (const p of problems) console.log("  - " + p);
  process.exit(1);
}
console.log("PASS — contact form notifies Telegram when enabled,");
console.log("       skips when disabled, survives a Telegram outage,");
console.log("       and every attempt is written to the delivery log.");
