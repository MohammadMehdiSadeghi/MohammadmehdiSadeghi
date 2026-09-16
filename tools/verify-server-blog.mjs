/* Self-hosted blog routes — real HTTP test.

   Boots the actual server-blog.js routes on a scratch express app (the same
   module server.js registers), then drives them over real HTTP with fetch:
   public feed, auth gate, create/update/delete, cover upload + serving, and
   pruning. Runs in one foreground process so a background-killed server
   can't produce a false green.

   Usage: node tools/verify-server-blog.mjs
*/
import express from "express";
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { registerBlogRoutes } from "../server-blog.js";

const BASE = process.cwd();
const PUBLIC_JSON = {
  projects: path.join(BASE, "public/api/projects.json"),
  "mini-projects": path.join(BASE, "public/api/mini-projects.json"),
  skills: path.join(BASE, "public/api/skills.json"),
  blog: path.join(BASE, "public/api/blog.json"),
};
const IMG_DIR = path.join(BASE, "public/assets/Blog");
const BLOG_FILE = PUBLIC_JSON.blog;

/* the real blog.json is git-tracked seed data — back it up and restore it */
const backup = fs.readFileSync(BLOG_FILE);
const preImages = fs.existsSync(IMG_DIR) ? fs.readdirSync(IMG_DIR) : [];

const readJSON = async (file, fallback) => {
  try {
    return JSON.parse(await fsp.readFile(file, "utf8"));
  } catch {
    return fallback;
  }
};
const writeJSON = async (file, data) => {
  await fsp.mkdir(path.dirname(file), { recursive: true });
  await fsp.writeFile(file, JSON.stringify(data, null, 2) + "\n");
};

/* a single shared token, like the real server's admin session */
const TOKEN = "test-token";
const requireAuthAsync = async (req, res) => {
  const h = String(req.headers.authorization || "");
  if (h !== `Bearer ${TOKEN}`) {
    res.status(401).json({ error: "unauthorized" });
    return null;
  }
  return { username: "tester" };
};
const wrap = (fn) => (req, res, next) =>
  Promise.resolve(fn(req, res, next)).catch((e) => {
    res.status(500).json({ error: String(e && e.message) });
  });

const app = express();
app.use(express.json({ limit: "6mb" }));
registerBlogRoutes(app, {
  PUBLIC_JSON,
  readJSON,
  writeJSON,
  requireAuthAsync,
  wrap,
  ROOT: BASE,
});
/* the real server.js mounts this AFTER the routes — covers under
   public/assets/Blog/ are served by the static middleware, not by a handler */
app.use("/assets", express.static(path.join(BASE, "public/assets"), { maxAge: "1h" }));

let pass = 0;
let fail = 0;
const check = (label, cond, detail = "") => {
  if (cond) {
    pass++;
    console.log("  ok  ", label, detail);
  } else {
    fail++;
    console.log("  FAIL", label, detail);
  }
};

const PORT = 4823;
const server = app.listen(PORT);
await new Promise((r) => server.once("listening", r));
const URL = `http://127.0.0.1:${PORT}`;
const AUTH = { Authorization: `Bearer ${TOKEN}` };
const jpost = (p, body, headers = {}) =>
  fetch(URL + p, {
    method: "POST",
    headers: { "Content-Type": "application/json", ...headers },
    body: JSON.stringify(body),
  });

try {
  console.log("=== public feed (self-hosted) ===");
  const feed = await fetch(`${URL}/api/blog`);
  const feedJson = await feed.json();
  check("GET /api/blog 200", feed.status === 200, `→ ${feed.status}`);
  check("posts returned", Array.isArray(feedJson.posts) && feedJson.posts.length >= 2,
    `${feedJson.posts?.length} posts`);
  check("drafts filtered out", (feedJson.posts || []).every((p) => p.published !== false));

  const slug = feedJson.posts[0].slug;
  const one = await fetch(`${URL}/api/blog?slug=${encodeURIComponent(slug)}`);
  const oneJson = await one.json();
  check("single post 200", one.status === 200 && oneJson.post?.slug === slug, `→ ${one.status}`);
  check("content present", (oneJson.post?.content || "").length > 0);
  check("unknown slug → 404", (await fetch(`${URL}/api/blog?slug=nope-nope`)).status === 404);

  console.log("\n=== admin gate + CRUD ===");
  check("no token → 401", (await fetch(`${URL}/api/admin/blog-admin`)).status === 401);

  const list = await (await fetch(`${URL}/api/admin/blog-admin`, { headers: AUTH })).json();
  const before = list.posts.length;

  const noTitle = await jpost("/api/admin/blog-admin", { content: "x" }, AUTH);
  check("missing title → 400", noTitle.status === 400, `→ ${noTitle.status}`);

  const created = await jpost("/api/admin/blog-admin", {
    title: "Server Blog Test",
    content: "hello",
    tags: "a, b",
    published: false,
  }, AUTH);
  const cj = await created.json();
  check("create 200", created.status === 200 && cj.post?.id, `→ ${created.status}`);
  check("slug from title", cj.post?.slug === "server-blog-test", cj.post?.slug);
  check("tags parsed", cj.post?.tags?.length === 2, JSON.stringify(cj.post?.tags));

  const feed2 = await (await fetch(`${URL}/api/blog`)).json();
  check("draft hidden publicly", !feed2.posts.some((p) => p.id === cj.post.id));

  /* cover upload → served from /assets/Blog/ → pruned when unreferenced */
  const png = "iVBORw0KGgoAAAANSUhEUgAAAAEAAAABCAYAAAAfFcSJAAAADUlEQVR42mP8z8DwHwAFAAH/q842iQAAAABJRU5ErkJggg==";
  const up = await jpost("/api/admin/blog-upload", { dataUrl: `data:image/png;base64,${png}` }, AUTH);
  const uj = await up.json();
  check("cover upload 200", up.status === 200 && !!uj.url, `→ ${up.status} ${uj.url || ""}`);
  check("url points at /assets/Blog/", String(uj.url || "").startsWith("/assets/Blog/"), uj.url);

  const imgRes = await fetch(URL + uj.url);
  const bytes = Buffer.from(await imgRes.arrayBuffer());
  check("cover served 200", imgRes.status === 200, `→ ${imgRes.status}`);
  check("bytes round-trip", bytes.length === Buffer.from(png, "base64").length, `${bytes.length} bytes`);
  check("content-type is an image", String(imgRes.headers.get("content-type")).startsWith("image/"),
    imgRes.headers.get("content-type"));

  check("non-image upload rejected",
    (await jpost("/api/admin/blog-upload", { dataUrl: "data:text/html;base64,PGI+" }, AUTH)).status === 400);
  check("upload needs auth",
    (await jpost("/api/admin/blog-upload", { dataUrl: `data:image/png;base64,${png}` })).status === 401);

  const upd = await fetch(`${URL}/api/admin/blog-admin`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...AUTH },
    body: JSON.stringify({ id: cj.post.id, cover: uj.url, coverAlt: "alt text", title: "Server Blog Test 2" }),
  });
  const updated = await upd.json();
  check("update 200", upd.status === 200, `→ ${upd.status}`);
  check("alt + cover saved", updated.post?.coverAlt === "alt text" && updated.post?.cover === uj.url);

  const pub = await jpost("/api/admin/blog-admin?publish=1", { id: cj.post.id }, AUTH);
  check("publish toggle 200", pub.status === 200 && (await pub.json()).post?.published === true);
  const feed3 = await (await fetch(`${URL}/api/blog`)).json();
  check("published post appears publicly", feed3.posts.some((p) => p.id === cj.post.id));

  check("unknown id update → 404", (await fetch(`${URL}/api/admin/blog-admin`, {
    method: "PUT",
    headers: { "Content-Type": "application/json", ...AUTH },
    body: JSON.stringify({ id: 999999, title: "x" }),
  })).status === 404);

  const del = await fetch(`${URL}/api/admin/blog-admin`, {
    method: "DELETE",
    headers: { "Content-Type": "application/json", ...AUTH },
    body: JSON.stringify({ id: cj.post.id }),
  });
  check("delete 200", del.status === 200, `→ ${del.status}`);

  const after = await (await fetch(`${URL}/api/admin/blog-admin`, { headers: AUTH })).json();
  check("back to the seed count", after.posts.length === before, `${after.posts.length} vs ${before}`);

  /* the deleted post's cover must have been pruned */
  const files = fs.existsSync(IMG_DIR) ? fs.readdirSync(IMG_DIR) : [];
  const orphan = String(uj.url || "").replace("/assets/Blog/", "");
  check("deleted post's cover pruned", !files.includes(orphan), files.join(",") || "(none)");
} finally {
  /* leave the repo exactly as found */
  fs.writeFileSync(BLOG_FILE, backup);
  if (fs.existsSync(IMG_DIR)) {
    for (const f of fs.readdirSync(IMG_DIR)) {
      if (!preImages.includes(f)) await fsp.unlink(path.join(IMG_DIR, f)).catch(() => {});
    }
    if (!preImages.length && fs.readdirSync(IMG_DIR).length === 0) {
      await fsp.rmdir(IMG_DIR).catch(() => {});
    }
  }
  server.close();
}

console.log(`\n════════ ${pass} passed, ${fail} failed ════════`);
if (fail) process.exitCode = 1;
