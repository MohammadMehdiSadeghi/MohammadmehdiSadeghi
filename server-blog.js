/* Blog routes for the self-hosted server (parity with the Vercel handlers).

   On the self-hosted deployment there is no /tmp store indirection: posts live
   in public/api/blog.json and covers are real files under
   public/assets/Blog/ , so they are served by the normal static middleware and
   survive restarts. Same API shape as api/_blog.js + api/admin/_blog-admin.js,
   so the frontend and admin panel work unchanged.
*/

import fs from "fs";
import fsp from "fs/promises";
import path from "path";

/* Buffer is a Node.js global (no-undef) */
/* global Buffer */

const MAX_IMAGE_BYTES = 2.5 * 1024 * 1024;

/* raster only — an uploaded SVG is served from this origin and can carry
   <script>, which ran on our domain in a Chrome probe. See api/_blog-images.js */
const EXT_MIME = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  avif: "image/avif",
};

const extFor = (mime) => {
  const hit = Object.entries(EXT_MIME).find(([, m]) => m === mime);
  return hit ? hit[0] : "jpg";
};

/* Blocks scriptable files in the cover directory. Uploaded covers live under
   /assets/Blog/ and are served by the static middleware, so an uploaded .svg
   would be handed back as a same-origin document that can run <script> —
   verified in Chrome (window flag set, document.title rewritten). Rejecting
   SVG at upload is the primary fix; this is the second layer, so a file that
   somehow lands on disk still can't execute. */
export function blogCoverGuard(req, res, next) {
  if (/\.(svg|svgz|html?|xhtml|xml|js|mjs)$/i.test(req.path)) {
    return res.status(404).type("text/plain").send("not found");
  }
  res.setHeader("X-Content-Type-Options", "nosniff");
  res.setHeader("Content-Disposition", "inline");
  return next();
}

export function slugify(s) {
  const base = String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[^\p{L}\p{N}]+/gu, "-")
    .replace(/^-+|-+$/g, "")
    .slice(0, 70);
  return base || `post-${Date.now()}`;
}

const asTags = (v) => {
  const arr = Array.isArray(v) ? v : String(v || "").split(",");
  return arr.map((t) => String(t).trim()).filter(Boolean).slice(0, 8);
};

const today = () => new Date().toISOString().slice(0, 10);

/* "data:image/webp;base64,AAAA" → { base64, ext } | null */
function parseDataUrl(dataUrl) {
  const m = /^data:([\w/+.-]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(String(dataUrl || "").trim());
  if (!m) return null;
  const mime = m[1].toLowerCase();
  if (!/^image\//.test(mime)) return null;
  /* SVG is scriptable and would be served same-origin → refuse it outright */
  if (mime === "image/svg+xml") return null;
  return { mime, base64: m[2].replace(/\s+/g, ""), ext: extFor(mime) };
}

export function registerBlogRoutes(app, { PUBLIC_JSON, readJSON, writeJSON, requireAuthAsync, wrap, ROOT }) {
  const BLOG_FILE = PUBLIC_JSON.blog;
  const IMG_DIR = path.join(ROOT, "public", "assets", "Blog");
  /* covers are stored as files and referenced by their public path */
  const URL_PREFIX = "/assets/Blog/";

  const loadPosts = async () => {
    const data = await readJSON(BLOG_FILE, []);
    return Array.isArray(data) ? data : [];
  };

  const idFromCover = (cover) => {
    const m = /^\/assets\/Blog\/([\w.-]+)$/.exec(String(cover || ""));
    return m ? m[1] : null;
  };

  const pruneImages = async (posts) => {
    const keep = new Set((posts || []).map((p) => idFromCover(p && p.cover)).filter(Boolean));
    let names;
    try {
      names = await fsp.readdir(IMG_DIR);
    } catch {
      return 0;
    }
    let removed = 0;
    for (const n of names) {
      if (!keep.has(n)) {
        try {
          await fsp.unlink(path.join(IMG_DIR, n));
          removed++;
        } catch {
          /* raced */
        }
      }
    }
    return removed;
  };

  /* ── public feed ── */
  app.get("/api/blog", wrap(async (req, res) => {
    const posts = (await loadPosts())
      .filter((p) => p && p.published !== false)
      .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

    const slug = String(req.query.slug || "").trim();
    res.setHeader("Cache-Control", "no-store");

    if (slug) {
      const post = posts.find((p) => p.slug === slug);
      if (!post) return res.status(404).json({ found: false, error: "post not found" });
      return res.json({ found: true, post });
    }
    return res.json({
      found: true,
      total: posts.length,
      posts: posts.map((p) => ({
        id: p.id,
        slug: p.slug,
        title: p.title,
        excerpt: p.excerpt || "",
        cover: p.cover || "",
        coverAlt: p.coverAlt || "",
        tags: p.tags || [],
        date: p.date || "",
      })),
    });
  }));

  /* ── cover upload ── */
  app.post("/api/admin/blog-upload", wrap(async (req, res) => {
    if ((await requireAuthAsync(req, res)) === null) return;
    const parsed = parseDataUrl((req.body || {}).dataUrl);
    if (!parsed) {
      return res.status(400).json({ error: "expected an image data URL (data:image/…;base64,…)" });
    }
    const buf = Buffer.from(parsed.base64, "base64");
    if (!buf.length) return res.status(400).json({ error: "image decoded to zero bytes" });
    if (buf.length > MAX_IMAGE_BYTES) {
      return res.status(413).json({
        error: `image is too large (${Math.round(buf.length / 1024)}KB, max ${Math.round(MAX_IMAGE_BYTES / 1024)}KB)`,
      });
    }
    await fsp.mkdir(IMG_DIR, { recursive: true });
    const name = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.${parsed.ext}`;
    await fsp.writeFile(path.join(IMG_DIR, name), buf);
    res.setHeader("Cache-Control", "no-store");
    return res.json({ ok: true, url: URL_PREFIX + name, id: name });
  }));

  /* ── admin CRUD ── */
  app.all("/api/admin/blog-admin", wrap(async (req, res) => {
    if ((await requireAuthAsync(req, res)) === null) return;
    const body = req.body || {};
    const posts = await loadPosts();

    const uniqueSlug = (wanted, ignoreId = null) => {
      let slug = slugify(wanted);
      let n = 2;
      while (posts.some((p) => p.slug === slug && String(p.id) !== String(ignoreId))) {
        slug = `${slugify(wanted)}-${n++}`;
      }
      return slug;
    };

    if (req.method === "GET") {
      const sorted = [...posts].sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));
      return res.json({ posts: sorted });
    }

    if (req.method === "POST" && req.query.publish != null) {
      const p = posts.find((x) => String(x.id) === String(body.id));
      if (!p) return res.status(404).json({ error: "post not found" });
      p.published = String(req.query.publish) === "1" || req.query.publish === "true";
      await writeJSON(BLOG_FILE, posts);
      return res.json({ ok: true, post: p });
    }

    if (req.method === "POST") {
      const title = String(body.title || "").trim();
      if (!title) return res.status(400).json({ error: "title is required" });
      const entry = {
        id: posts.reduce((m, p) => Math.max(m, Number(p.id) || 0), 0) + 1,
        slug: uniqueSlug(body.slug || title),
        title,
        excerpt: String(body.excerpt || "").trim(),
        content: String(body.content || "").trim(),
        cover: String(body.cover || "").trim(),
        coverAlt: String(body.coverAlt || "").trim(),
        tags: asTags(body.tags),
        date: String(body.date || "").trim() || today(),
        published: body.published !== false,
      };
      posts.push(entry);
      await writeJSON(BLOG_FILE, posts);
      return res.json({ ok: true, post: entry });
    }

    if (req.method === "PUT") {
      const id = body.id;
      if (id == null) return res.status(400).json({ error: "id is required" });
      const p = posts.find((x) => String(x.id) === String(id));
      if (!p) return res.status(404).json({ error: "post not found" });

      if (body.title != null) {
        const t = String(body.title).trim();
        if (!t) return res.status(400).json({ error: "title cannot be empty" });
        p.title = t;
      }
      if (body.slug != null) {
        const s = String(body.slug).trim();
        if (s && s !== p.slug) p.slug = uniqueSlug(s, id);
      } else if (body.title != null && (!p.slug || p.slug.startsWith("post-"))) {
        p.slug = uniqueSlug(p.title, id);
      }
      if (body.excerpt != null) p.excerpt = String(body.excerpt).trim();
      if (body.content != null) p.content = String(body.content).trim();
      if (body.cover != null) p.cover = String(body.cover).trim();
      if (body.coverAlt != null) p.coverAlt = String(body.coverAlt).trim();
      if (body.tags != null) p.tags = asTags(body.tags);
      if (body.date != null) p.date = String(body.date).trim() || p.date;
      if (body.published != null) p.published = !!body.published;

      await writeJSON(BLOG_FILE, posts);
      await pruneImages(posts);
      return res.json({ ok: true, post: p });
    }

    if (req.method === "DELETE") {
      const id = body.id ?? req.query.id;
      if (id == null) return res.status(400).json({ error: "id is required" });
      const filtered = posts.filter((x) => String(x.id) !== String(id));
      if (filtered.length === posts.length) {
        return res.status(404).json({ error: "post not found" });
      }
      await writeJSON(BLOG_FILE, filtered);
      await pruneImages(filtered);
      return res.json({ ok: true });
    }

    return res.status(405).json({ error: "method not allowed" });
  }));

  fs.mkdirSync(IMG_DIR, { recursive: true });
}
