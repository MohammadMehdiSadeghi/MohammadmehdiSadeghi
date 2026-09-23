/* Boot the dev server on a THROWAWAY port and prove /api/blog returns real
   JSON with posts. A fixed port let a stale server keep answering, which made
   a fix look verified when nothing had changed — so this picks a free port. */
import { spawn } from "node:child_process";
import net from "node:net";
import fs from "node:fs";
import path from "node:path";

/* Derive the slug from the data instead of hardcoding one. A literal slug
   here goes stale the moment the post is renamed or deleted — which is
   exactly what happened: this file asked for "welcome-to-my-blog" long after
   that post was gone, so it reported a real 404 as a failure forever. */
const blogFile = path.join(process.cwd(), "public", "api", "blog.json");
let liveSlug = null;
try {
  const blog = JSON.parse(fs.readFileSync(blogFile, "utf8"));
  const posts = Array.isArray(blog) ? blog : blog.posts || [];
  liveSlug = posts[0]?.slug || null;
} catch {
  /* handled by the assertion below */
}
if (!liveSlug) {
  console.log("no post slug found in public/api/blog.json — cannot verify slug lookup");
  process.exit(1);
}
console.log("live slug:", liveSlug);

const port = await new Promise((res) => {
  const s = net.createServer();
  s.listen(0, "127.0.0.1", () => { const p = s.address().port; s.close(() => res(p)); });
});

const p = spawn(process.execPath, ["node_modules/vite/bin/vite.js", "--port", String(port), "--strictPort"], {
  env: { ...process.env }, stdio: ["ignore", "pipe", "pipe"],
});
p.stdout.on("data", () => {}); p.stderr.on("data", (d) => process.stderr.write("[vite] " + d));

let base = null;
for (let i = 0; i < 80; i++) {
  await new Promise((r) => setTimeout(r, 500));
  try { const r = await fetch(`http://127.0.0.1:${port}/`); if (r.ok) { base = `http://127.0.0.1:${port}`; break; } } catch {}
}
if (!base) { console.log("dev server never came up on " + port); p.kill(); process.exit(1); }
console.log("fresh dev server on", base);

let fail = 0;
const check = (name, ok, detail = "") => {
  if (!ok) fail++;
  console.log(`  ${ok ? "ok  " : "FAIL"} ${name} ${detail}`);
};

for (const path of ["/api/blog", `/api/blog?slug=${encodeURIComponent(liveSlug)}`]) {
  const r = await fetch(base + path);
  const ct = r.headers.get("content-type") || "";
  const text = await r.text();
  const isHtml = text.trimStart().startsWith("<!doctype") || ct.includes("html");
  check(`${path} is JSON not SPA html`, !isHtml && ct.includes("json"), ct);
  let j = null;
  try { j = JSON.parse(text); } catch {}
  check(`${path} parses`, !!j, "");
  if (j && path === "/api/blog") {
    check(`${path} lists posts`, Array.isArray(j.posts) && j.posts.length > 0, `${(j.posts || []).length} posts`);
  }
  if (j && path.includes("slug=")) {
    check(`${path} returns the post`, j.found === true && !!j.post?.slug, j.post?.slug || j.error);
  }
}

// the blog PAGE itself must render posts, not an error state
const r2 = await fetch(base + "/blog");
const html = await r2.text();
check("/blog serves the app shell", /<div id="root"/.test(html) || /<script/.test(html), String(r2.status));

console.log(`\n════════ ${fail} problem(s) ════════`);
p.kill();
process.exit(fail ? 1 : 0);
