/* Public blog feed.

     GET /api/blog           → { posts: [...] }  published only, newest first
     GET /api/blog?slug=...  → { post: {...} }   single published post

   Drafts never leave here — the admin list at /api/admin/blog-admin is the
   only place unpublished posts are visible.
   ════════════════════════════════════════════════════════════════════ */

import { listData } from "./_data.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "method not allowed" });
  }

  const all = (await listData("blog.json")) || [];
  const posts = (Array.isArray(all) ? all : [])
    .filter((p) => p && p.published !== false)
    .sort((a, b) => String(b.date || "").localeCompare(String(a.date || "")));

  const slug = String(req.query.slug || "").trim();
  res.setHeader("Cache-Control", "no-store");

  if (slug) {
    const post = posts.find((p) => p.slug === slug);
    if (!post) return res.status(404).json({ found: false, error: "post not found" });
    return res.json({ found: true, post });
  }

  /* the list view only needs the card fields — keep the payload small */
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
}
