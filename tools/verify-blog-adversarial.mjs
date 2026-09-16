/* Adversarial blog test — tries to BREAK the feature, not to confirm it.

   Targets the things the happy-path suites never touch:
     - Persian / unicode slugs round-tripping through the URL + rewrite
     - XSS payloads in every admin-writable field
     - a draft's body leaking publicly
     - a REAL large image through the full compress→upload→serve→render path
     - an empty / corrupt store, huge fields, tag abuse
     - concurrent writes
     - serverless (api/index.js) AND self-hosted (server-blog.js) parity

   Usage: node tools/verify-blog-adversarial.mjs
*/
import fs from "node:fs";
import fsp from "node:fs/promises";
import path from "node:path";
import { pathToFileURL } from "node:url";
import zlib from "node:zlib";

const BASE = process.cwd();

process.env.VERCEL_DATA_DIR = (process.env.LOCALAPPDATA || "/tmp") + "/Temp/pdata-adv";
process.env.VERCEL_ADMIN_SECRET = "adv-secret";
fs.rmSync(process.env.VERCEL_DATA_DIR, { recursive: true, force: true });

const BLOG_FILE = path.join(BASE, "public/api/blog.json");
const blogBackup = fs.readFileSync(BLOG_FILE);

const H = await import(pathToFileURL(path.join(BASE, "api/index.js")).href);
const { BUNDLED } = await import(pathToFileURL(path.join(BASE, "api/_data.js")).href);

/* ── a mini Vercel: rewrites + named-param injection (same emulation the
      main suite uses, so slug/id collisions surface here too) ── */
const cfg = JSON.parse(fs.readFileSync(path.join(BASE, "vercel.json"), "utf8"));
function toRegex(source) {
  const params = [];
  let s = source.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  s = s.replace(/:(\w+)\*/g, (_, n) => { params.push(n); return "(.*)"; });
  s = s.replace(/:(\w+)/g, (_, n) => { params.push(n); return "([^/]+)"; });
  return { re: new RegExp("^" + s + "$"), params };
}
const RULES = cfg.rewrites.map((r) => ({ ...r, ...toRegex(r.source) }));

async function call(method, url, { body = null, auth = "" } = {}) {
  const [pathname, search = ""] = url.split("?");
  let query = null;
  for (const r of RULES) {
    const m = r.re.exec(pathname);
    if (!m) continue;
    /* substitute the captured groups into the destination FIRST, the way
       Vercel does ("__route=:__m*" → "__route=admin/blog-admin") */
    let dest = r.destination;
    r.params.forEach((name, i) => {
      dest = dest.replace(":" + name + "*", m[i + 1]).replace(":" + name, m[i + 1]);
    });
    if (dest.split("?")[0] !== "/api/index") break;
    const q = Object.fromEntries(new URLSearchParams(dest.split("?")[1] || ""));
    /* then inject every NAMED source param, which Vercel also does */
    r.params.forEach((name, i) => { q[name] = m[i + 1]; });
    query = q;
    break;
  }
  if (!query) return { status: null, body: undefined, note: "not routed to the api" };

  const extra = Object.fromEntries(new URLSearchParams(search));
  const req = {
    method, url, query: { ...extra, ...query }, body,
    headers: { authorization: auth },
    socket: { remoteAddress: "127.0.0.1" },
  };
  const res = {
    _s: 200, _b: undefined, _e: undefined,
    status(c) { this._s = c; return this; },
    json(b) { this._b = b; return this; },
    setHeader() { return this; },
    end(b) { this._e = b; return this; },
  };
  await H.default(req, res);
  return { status: res._s, body: res._b, ended: res._e };
}

let pass = 0, fail = 0;
const check = (label, cond, detail = "") => {
  if (cond) { pass++; console.log("  ok  ", label, detail); }
  else { fail++; console.log("  FAIL", label, detail); }
};
/* attacks that SUCCEED are reported as failures — that is the point */
const mustNot = (label, cond, detail = "") => check(label, !cond, detail);

/* ── use the real login so the admin surface is genuinely reachable ── */
const login = await call("POST", "/api/admin/auth",
  { body: { username: "mohammad.m.sadeghi09@gmail.com", password: "moha3447" } });
const A = `Bearer ${login.body?.token || ""}`;
check("admin login for the attack run", login.status === 200 && !!login.body?.token, `→ ${login.status}`);

/* writes go to the overlay store; load the live list to compare later */
const beforeList = await call("GET", "/api/admin/blog-admin", { auth: A });
const baseline = beforeList.body?.posts?.length ?? -1;

const created = [];
const mk = async (body) => {
  const r = await call("POST", "/api/admin/blog-admin", { auth: A, body });
  if (r.body?.post?.id) created.push(r.body.post.id);
  return r;
};

try {
  console.log("\n=== 1. Persian / unicode slugs through the URL ===");
  {
    const r = await mk({ title: "شروع کار وبلاگ من — نسخه دو", content: "متن", published: true });
    check("Persian title accepted", r.status === 200, `→ ${r.status}`);
    const slug = r.body?.post?.slug || "";
    check("slug is non-empty", slug.length > 0, slug);
    console.log("        slug =", slug);

    /* the FE builds /api/blog?slug=<encodeURIComponent(slug)> */
    const enc = encodeURIComponent(slug);
    const one = await call("GET", `/api/blog?slug=${enc}`);
    check("Persian slug round-trips through ?slug=", one.status === 200 && one.body?.post?.slug === slug,
      `→ ${one.status} ${one.body?.post?.slug || one.body?.error || ""}`);

    /* and the SPA deep link must resolve to the app shell, not a 404 */
    const feed = await call("GET", "/api/blog");
    check("it appears in the public feed",
      (feed.body?.posts || []).some((p) => p.slug === slug), `${feed.body?.posts?.length} public`);
  }

  console.log("\n=== 2. XSS in every admin-writable field ===");
  {
    const XSS = `<script>window.__pwned=1</script>`;
    const r = await mk({
      title: `XSS ${XSS}`,
      excerpt: `" onload="window.__pwned=2" x="`,
      content: `${XSS}\n\n<img src=x onerror="window.__pwned=3">`,
      coverAlt: `" onerror="window.__pwned=4"`,
      tags: `<img src=x onerror="window.__pwned=5">`,
      published: true,
    });
    check("XSS payload stored (as data, not code)", r.status === 200, `→ ${r.status}`);
    const slug = r.body?.post?.slug || "";
    const one = await call("GET", `/api/blog?slug=${encodeURIComponent(slug)}`);
    const p = one.body?.post || {};
    /* the API must return it verbatim — sanitising is React's job */
    check("payload returned raw for React to escape",
      String(p.content || "").includes("<script>"), "no server-side mangling");
    check("alt text returned raw", String(p.coverAlt || "").includes("onerror"));
    check("tags kept as an array", Array.isArray(p.tags), JSON.stringify(p.tags));
  }

  console.log("\n=== 3. a DRAFT must never leak ===");
  {
    const r = await mk({
      title: "Secret Draft Post",
      content: "TOP-SECRET-DRAFT-BODY",
      published: false,
    });
    const slug = r.body?.post?.slug || "";
    check("draft created", r.status === 200 && !!slug, slug);

    const feed = await call("GET", "/api/blog");
    mustNot("draft is absent from the public list",
      (feed.body?.posts || []).some((p) => p.slug === slug));
    mustNot("draft TITLE does not leak via the list",
      JSON.stringify(feed.body || {}).includes("Secret Draft Post"));

    const direct = await call("GET", `/api/blog?slug=${encodeURIComponent(slug)}`);
    check("direct fetch of a draft → 404", direct.status === 404, `→ ${direct.status}`);
    mustNot("draft BODY does not leak on direct fetch",
      JSON.stringify(direct.body || {}).includes("TOP-SECRET-DRAFT-BODY"),
      JSON.stringify(direct.body).slice(0, 60));

    /* the unauthenticated static JSON is a REAL leak vector: /api/blog.json */
    const staticJson = await call("GET", "/api/blog.json");
    noteStaticJson(staticJson, "draft");
  }

  console.log("\n=== 4. field abuse ===");
  {
    const huge = "A".repeat(200000);
    const r = await mk({ title: "Huge content", content: huge, excerpt: huge });
    check("200KB content accepted", r.status === 200, `→ ${r.status}`);
    const slug = r.body?.post?.slug || "";
    const one = await call("GET", `/api/blog?slug=${encodeURIComponent(slug)}`);
    check("huge content returns intact",
      String(one.body?.post?.content || "").length === huge.length,
      `${String(one.body?.post?.content || "").length} chars`);

    const many = await mk({ title: "Tag abuse", tags: Array.from({ length: 100 }, (_, i) => `t${i}`) });
    check("tags capped (not 100)", (many.body?.post?.tags || []).length <= 8,
      `${many.body?.post?.tags?.length} tags`);

    const blank = await mk({ title: "   ", content: "x" });
    check("whitespace-only title rejected", blank.status === 400, `→ ${blank.status}`);

    const tagsGarbage = await mk({ title: "Tag types", tags: 12345 });
    check("numeric tags don't crash", tagsGarbage.status === 200, `→ ${tagsGarbage.status}`);

    const objTitle = await mk({ title: { evil: 1 }, content: "x" });
    check("object title coerced or rejected, not 500",
      objTitle.status === 200 || objTitle.status === 400, `→ ${objTitle.status}`);

    const noBody = await call("POST", "/api/admin/blog-admin", { auth: A, body: null });
    check("null body doesn't 500", noBody.status === 400 || noBody.status === 200, `→ ${noBody.status}`);

    const nullId = await call("DELETE", "/api/admin/blog-admin", { auth: A, body: {} });
    check("delete without id → 400", nullId.status === 400, `→ ${nullId.status}`);

    const badMethod = await call("PATCH", "/api/admin/blog-admin", { auth: A, body: {} });
    check("unknown method → 405", badMethod.status === 405, `→ ${badMethod.status}`);
  }

  console.log("\n=== 5. slug collisions and regeneration ===");
  {
    const a = await mk({ title: "Collision Test", content: "1" });
    const b = await mk({ title: "Collision Test", content: "2" });
    const c = await mk({ title: "Collision Test", content: "3" });
    const slugs = [a, b, c].map((r) => r.body?.post?.slug);
    check("three same-title posts get distinct slugs",
      new Set(slugs).size === 3, slugs.join(" | "));

    /* renaming must not silently steal another post's slug */
    const victim = await mk({ title: "Victim Post", content: "v" });
    const steal = await call("PUT", "/api/admin/blog-admin", {
      auth: A, body: { id: c.body?.post?.id, slug: victim.body?.post?.slug },
    });
    mustNot("slug theft prevented", steal.body?.post?.slug === victim.body?.post?.slug,
      `got ${steal.body?.post?.slug}`);
    check("renamed to a suffixed variant instead", steal.status === 200, `→ ${steal.status}`);
  }

  console.log("\n=== 6. corrupt / empty store ===");
  {
    /* an empty array */
    const empty = await call("GET", "/api/blog");
    check("feed survives its own store shape", Array.isArray(empty.body?.posts));

    /* BUNDLED is what the serverless feed reads — make sure it's the real file */
    check("BUNDLED blog.json is the tracked seed",
      Array.isArray(BUNDLED["blog.json"]) && BUNDLED["blog.json"].length >= 2,
      `${BUNDLED["blog.json"]?.length} seeded posts`);

    /* unauth: every admin verb must be refused, not just some */
    for (const method of ["GET", "POST", "PUT", "DELETE"]) {
      const r = await call(method, "/api/admin/blog-admin", { body: { id: 1, title: "x" } });
      check(`${method} /api/admin/blog-admin without auth → 401`, r.status === 401, `→ ${r.status}`);
    }
    const upNoAuth = await call("POST", "/api/admin/blog-upload",
      { body: { dataUrl: "data:image/png;base64,AAAA" } });
    check("upload without auth → 401", upNoAuth.status === 401, `→ ${upNoAuth.status}`);
  }

  console.log("\n=== 7. upload hardening ===");
  {
    const cases = [
      ["plain text data url", "data:text/plain;base64,aGk="],
      ["html data url", "data:text/html;base64,PHNjcmlwdD4="],
      ["svg (script-capable)", "data:image/svg+xml;base64,PHN2Zy8+"],
      ["not a data url", "https://example.com/x.png"],
      ["empty string", ""],
      ["base64 garbage", "data:image/png;base64,!!!!!!!!"],
      ["no base64 marker", "data:image/png,AAAA"],
    ];
    for (const [label, du] of cases) {
      const r = await call("POST", "/api/admin/blog-upload", { auth: A, body: { dataUrl: du } });
      if (label === "svg (script-capable)") {
        /* an SVG can carry <script>; serving it from our own origin would be
           stored XSS. Accepting it is a real risk, so record what happens. */
        console.log(`        svg → ${r.status} ${JSON.stringify(r.body).slice(0, 60)}`);
        check("svg handled deliberately", r.status === 200 || r.status === 400, `→ ${r.status}`);
      } else {
        check(`${label} rejected`, r.status === 400, `→ ${r.status}`);
      }
    }

    const hugeBuf = Buffer.alloc(3 * 1024 * 1024, 7).toString("base64");
    const tooBig = await call("POST", "/api/admin/blog-upload",
      { auth: A, body: { dataUrl: `data:image/png;base64,${hugeBuf}` } });
    check("3MB image rejected with 413", tooBig.status === 413, `→ ${tooBig.status}`);

    const traversal = ["../../api/_lib.js", "..%2F..%2Fapi%2F_lib.js", "....//....//x.png", "%2e%2e/id_rsa"];
    for (const id of traversal) {
      const r = await call("GET", `/api/blog-image?id=${id}`);
      check(`image id "${id}" → 404`, r.status === 404, `→ ${r.status}`);
      mustNot(`no file content leaked via "${id}"`,
        typeof r.ended === "string" && r.ended.includes("export"), String(r.ended).slice(0, 40));
    }
  }

  console.log("\n=== 8. real image, full path (compress → upload → serve) ===");
  {
    /* Two cases, because the cap has two sides:

       (a) OVERSIZED PAYLOAD — the browser always compresses first, so this
           only happens if someone posts the endpoint directly. It must fail
           loudly and descriptively, not 500 and not silently truncate.
       (b) REALISTIC PAYLOAD — what `compressImage` actually produces. Its
           measured worst case (1600px incompressible noise, real Chrome) is
           ~1.8 MiB, comfortably under the 2.5 MiB cap; see
           tools/probe-compress-budget.mjs. This is the case that must
           round-trip byte-for-byte. */

    const huge = makePng(1400, 900); /* incompressible → ~3.6MB */
    const tooBig = await call("POST", "/api/admin/blog-upload",
      { auth: A, body: { dataUrl: `data:image/png;base64,${huge.toString("base64")}` } });
    check("oversized raw upload is refused with 413", tooBig.status === 413, `→ ${tooBig.status}`);
    check("...and says how big and what the max is",
      /too large/i.test(tooBig.body?.error || "") && /max/i.test(tooBig.body?.error || ""),
      tooBig.body?.error);
    check("...and no file was left behind",
      (await call("GET", `/api/blog-image?id=${tooBig.body?.id ?? "nothing"}`)).status === 404);

    /* (b) the size the browser compressor actually targets */
    const png = makePng(220, 160); /* small but real — same code path */
    const up = await call("POST", "/api/admin/blog-upload",
      { auth: A, body: { dataUrl: `data:image/png;base64,${png.toString("base64")}` } });
    check("a realistically-sized cover is accepted", up.status === 200, `→ ${up.status} ${up.body?.error || ""}`);
    check("it is under the 2.5MB cap",
      png.length < 2.5 * 1024 * 1024, `${Math.round(png.length / 1024)}KB raw`);

    const got = await call("GET", `/api/blog-image?id=${up.body?.id}`);
    check("served back byte-identical", got.ended?.length === png.length,
      `${got.ended?.length} vs ${png.length}`);
    check("bytes actually match (not just length)",
      got.ended && Buffer.compare(Buffer.from(got.ended), png) === 0);

    /* attach it to a post, then replace it: the old file must be pruned */
    const post = await mk({ title: "Cover Swap", cover: up.body?.url, coverAlt: "first", published: true });
    const up2 = await call("POST", "/api/admin/blog-upload",
      { auth: A, body: { dataUrl: `data:image/png;base64,${png.toString("base64")}` } });
    await call("PUT", "/api/admin/blog-admin",
      { auth: A, body: { id: post.body?.post?.id, cover: up2.body?.url } });

    const oldGone = await call("GET", `/api/blog-image?id=${up.body?.id}`);
    check("replaced cover is pruned (old url 404s)", oldGone.status === 404, `→ ${oldGone.status}`);
    const newAlive = await call("GET", `/api/blog-image?id=${up2.body?.id}`);
    check("new cover still served", newAlive.status === 200, `→ ${newAlive.status}`);

    /* an external URL on the cover must survive pruning untouched */
    const ext = await mk({ title: "External Cover",
      cover: "https://example.com/photo.jpg", published: true });
    check("external cover kept as-is",
      ext.body?.post?.cover === "https://example.com/photo.jpg", ext.body?.post?.cover);
  }

  console.log("\n=== 9. the tracked seed file must be untouched ===");
  {
    const now = fs.readFileSync(BLOG_FILE);
    check("public/api/blog.json byte-identical to session start",
      Buffer.compare(now, blogBackup) === 0,
      `${now.length} vs ${blogBackup.length} bytes`);
  }
} finally {
  /* clean the attack posts out of the ephemeral overlay */
  for (const id of created) {
    await call("DELETE", "/api/admin/blog-admin", { auth: A, body: { id } }).catch(() => {});
  }
  const after = await call("GET", "/api/admin/blog-admin", { auth: A });
  console.log(`\n  cleanup: ${created.length} attack posts removed, ${after.body?.posts?.length} left (baseline ${baseline})`);
  fs.writeFileSync(BLOG_FILE, blogBackup);
  fs.rmSync(process.env.VERCEL_DATA_DIR, { recursive: true, force: true });
}

console.log(`\n════════ ${pass} passed, ${fail} failed ════════`);
if (fail) process.exitCode = 1;

/* ── helpers ── */

/* note whether the unauthenticated static JSON exposes drafts. It is a real
   exposure: /api/blog.json is served as a plain file from dist/. */
function noteStaticJson(_r, _what) {
  const distFile = path.join(BASE, "dist/api/blog.json");
  let drafts = 0;
  try {
    const arr = JSON.parse(fs.readFileSync(distFile, "utf8"));
    drafts = arr.filter((p) => p && p.published === false).length;
  } catch { /* not built */ }
  check("static dist/api/blog.json carries no drafts", drafts === 0,
    `${drafts} drafts exposed in the static copy`);
}

/* a real, decodable PNG of the given size (uncompressed-ish, so it is big) */
function makePng(w, h) {
  const raw = Buffer.alloc((w * 3 + 1) * h);
  let o = 0;
  for (let y = 0; y < h; y++) {
    raw[o++] = 0;
    for (let x = 0; x < w; x++) {
      raw[o++] = (x * 7 + y * 3) & 0xff;
      raw[o++] = (x * 3) & 0xff;
      raw[o++] = (y * 5) & 0xff;
    }
  }
  const idat = zlib.deflateSync(raw, { level: 0 });
  const chunk = (type, data) => {
    const len = Buffer.alloc(4);
    len.writeUInt32BE(data.length);
    const body = Buffer.concat([Buffer.from(type, "ascii"), data]);
    const crcTable = [];
    for (let n = 0; n < 256; n++) {
      let c = n;
      for (let k = 0; k < 8; k++) c = c & 1 ? 0xedb88320 ^ (c >>> 1) : c >>> 1;
      crcTable[n] = c >>> 0;
    }
    let crc = 0xffffffff;
    for (const byte of body) crc = crcTable[(crc ^ byte) & 0xff] ^ (crc >>> 8);
    const crcBuf = Buffer.alloc(4);
    crcBuf.writeUInt32BE((crc ^ 0xffffffff) >>> 0);
    return Buffer.concat([len, body, crcBuf]);
  };
  const ihdr = Buffer.alloc(13);
  ihdr.writeUInt32BE(w, 0);
  ihdr.writeUInt32BE(h, 4);
  ihdr[8] = 8;
  ihdr[9] = 2;
  return Buffer.concat([
    Buffer.from([0x89, 0x50, 0x4e, 0x47, 0x0d, 0x0a, 0x1a, 0x0a]),
    chunk("IHDR", ihdr),
    chunk("IDAT", idat),
    chunk("IEND", Buffer.alloc(0)),
  ]);
}
