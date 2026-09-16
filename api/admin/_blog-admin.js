/* ════════════════════════════════════════════════════════════════════
   Admin blog CRUD.

     GET    /api/admin/blog-admin        → { posts: [...] }  (drafts included)
     POST   /api/admin/blog-admin        → create
     PUT    /api/admin/blog-admin        → update by id
     DELETE /api/admin/blog-admin        → delete by id
     POST   /api/admin/blog-admin?publish=1  → toggle published

   Storage follows the project pattern: `listData`/`saveData` give an
   ephemeral per-instance overlay on Vercel and a real file on the
   self-hosted server, with `public/api/blog.json` as the durable baseline.
   ════════════════════════════════════════════════════════════════════ */

import { requireAuth } from "../_lib.js";
import { listData, saveData } from "../_data.js";
import { pruneImages } from "../_blog-images.js";

const FILE = "blog.json";

/* "شروع کار وبلاگ من" / "Why I rebuilt" → url-safe ascii slug */
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
  if (Array.isArray(v)) return v.map((t) => String(t).trim()).filter(Boolean).slice(0, 8);
  return String(v || "")
    .split(",")
    .map((t) => t.trim())
    .filter(Boolean)
    .slice(0, 8);
};

const today = () => new Date().toISOString().slice(0, 10);

export default async function handler(req, res) {
  if (requireAuth(req, res) === null) return;
  const body = req.body || {};
  const posts = (await listData(FILE)) || [];
  if (!Array.isArray(posts)) return res.status(500).json({ error: "blog store is corrupt" });

  /* every post needs a unique slug; keep the first, suffix later duplicates */
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

  /* publish / unpublish without a full update round-trip */
  if (req.method === "POST" && req.query.publish != null) {
    const p = posts.find((x) => String(x.id) === String(body.id));
    if (!p) return res.status(404).json({ error: "post not found" });
    p.published = String(req.query.publish) === "1" || req.query.publish === "true";
    await saveData(FILE, posts);
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
    await saveData(FILE, posts);
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
      /* a title-only change on an auto-slug post keeps the URL meaningful */
      p.slug = uniqueSlug(p.title, id);
    }
    if (body.excerpt != null) p.excerpt = String(body.excerpt).trim();
    if (body.content != null) p.content = String(body.content).trim();
    if (body.cover != null) p.cover = String(body.cover).trim();
    if (body.coverAlt != null) p.coverAlt = String(body.coverAlt).trim();
    if (body.tags != null) p.tags = asTags(body.tags);
    if (body.date != null) p.date = String(body.date).trim() || p.date;
    if (body.published != null) p.published = !!body.published;

    await saveData(FILE, posts);
    /* a swapped cover leaves its old file behind — drop unreferenced ones */
    await pruneImages(posts).catch(() => 0);
    return res.json({ ok: true, post: p });
  }

  if (req.method === "DELETE") {
    const id = body.id ?? req.query.id;
    if (id == null) return res.status(400).json({ error: "id is required" });
    const filtered = posts.filter((x) => String(x.id) !== String(id));
    if (filtered.length === posts.length) {
      return res.status(404).json({ error: "post not found" });
    }
    await saveData(FILE, filtered);
    await pruneImages(filtered).catch(() => 0);
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "method not allowed" });
}
