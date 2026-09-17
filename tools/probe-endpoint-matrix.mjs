/* PUBLIC endpoint matrix across the backends.
   The admin panel broke because vite dev silently answered an API path with the
   SPA's index.html (200, HTML) instead of JSON — a failure that looks like a
   rendering bug. This checks every public endpoint on every backend at once.

     BOOT=node  node tools/probe-endpoint-matrix.mjs     # +server.js on 3777
     BOOT=vite  node tools/probe-endpoint-matrix.mjs     # +vite dev on 5199
     TARGET=https://... node tools/probe-endpoint-matrix.mjs   # live
*/
import { spawn } from "node:child_process";

const EP = [
  "/api/projects.json",
  "/api/skills.json",
  "/api/mini-projects.json",
  "/api/blog.json",
  "/api/blog",
  "/api/blog?slug=welcome-to-my-blog",
  "/api/music-database.json",
  "/api/music-analysis.json",
  "/api/search?q=abba",
  "/api/mood-search?q=happy",
  "/assets/Music/ABBA%20-%20The%20Winner%20Takes%20It%20All%20(SPOTISAVER).mp3",
];

let procs = [];
async function boot(kind, port) {
  const cmd = kind === "node" ? ["server.js"] : ["node_modules/vite/bin/vite.js", "--port", String(port), "--strictPort"];
  const p = spawn(process.execPath, cmd, {
    env: { ...process.env, PORT: String(port) },
    stdio: ["ignore", "pipe", "pipe"],
  });
  p.stdout.on("data", () => {}); p.stderr.on("data", () => {});
  procs.push(p);
  for (let i = 0; i < 80; i++) {
    await new Promise((r) => setTimeout(r, 500));
    try { const r = await fetch(`http://127.0.0.1:${port}/`); if (r.ok || r.status === 404) return `http://127.0.0.1:${port}`; } catch {}
  }
  throw new Error(kind + " never came up");
}

const targets = [];
if (process.env.BOOT === "node") targets.push({ name: "node server.js", base: await boot("node", 3777) });
if (process.env.BOOT === "dev") targets.push({ name: "dev server (5199)", base: await boot("dev", 5199) });
if (process.env.TARGET) targets.push({ name: "target", base: process.env.TARGET.replace(/\/$/, "") });

let bad = 0;
for (const t of targets) {
  console.log(`\n══════ ${t.name} — ${t.base} ══════`);
  for (const ep of EP) {
    let line = `  ${ep}`;
    try {
      const r = await fetch(t.base + ep, { redirect: "follow" });
      const ct = r.headers.get("content-type") || "";
      const isJson = ct.includes("json");
      const isHtml = ct.includes("html");
      const text = await r.text();
      // a JSON expectation answered with HTML == the SPA fallback bug
      const wantsJson = ep.includes("/api/") && !ep.includes("/assets/");
      let verdict = "ok";
      if (wantsJson && isHtml) verdict = "SPA-FALLBACK(HTML!)";
      else if (wantsJson && !isJson) verdict = "not-json:" + ct.slice(0, 30);
      else if (!r.ok) verdict = "HTTP " + r.status;
      else if (text.length < 30) verdict = "EMPTY(" + text.length + ")";
      if (verdict !== "ok") bad++;
      console.log(`${line.padEnd(78)} ${String(r.status).padEnd(4)} ${verdict} ${verdict === "ok" ? "" : text.slice(0, 60).replace(/\s+/g, " ")}`);
    } catch (e) {
      bad++;
      console.log(`${line.padEnd(78)} ERR  ${String(e.message).slice(0, 60)}`);
    }
  }
}
console.log(`\n════════ ${bad} problem(s) ════════`);
for (const p of procs) { try { p.kill(); } catch {} }
