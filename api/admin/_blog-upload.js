/* Blog covers — upload + serve.

     POST /api/admin/blog-upload  { dataUrl, alt? }  (admin)  → { url }
     GET  /api/blog-image?id=img-…                            → the binary

   The binary endpoint is deliberately PUBLIC: the cover has to render for
   anonymous visitors, so the id itself is the (unguessable) handle — the
   same model as an unlisted image host.
   ════════════════════════════════════════════════════════════════════ */

import { requireAuth } from "../_lib.js";
import { saveImage, getImage, parseDataUrl } from "../_blog-images.js";

export default async function handler(req, res) {
  if (req.method === "POST") {
    if (requireAuth(req, res) === null) return;
    const body = req.body || {};
    const dataUrl = body.dataUrl || req.query.dataUrl;
    if (!parseDataUrl(dataUrl)) {
      return res.status(400).json({ error: "expected an image data URL (data:image/…;base64,…)" });
    }
    const out = await saveImage(dataUrl);
    if (out.error) return res.status(413).json({ error: out.error });
    res.setHeader("Cache-Control", "no-store");
    return res.json({ ok: true, url: out.url, id: out.id });
  }

  if (req.method === "GET") {
    const id = String(req.query.id || "").trim();
    const img = await getImage(id);
    if (!img) return res.status(404).json({ error: "image not found" });

    /* Defence in depth: even if a scriptable file ever landed here, these two
       headers stop the browser from treating it as a document. `nosniff` is
       what makes the declared Content-Type binding. */
    res.setHeader("Content-Type", img.mime);
    res.setHeader("X-Content-Type-Options", "nosniff");
    res.setHeader("Content-Disposition", "inline");
    res.setHeader("Content-Length", String(img.buf.length));
    /* the id is unique per upload, so it is safe to cache hard */
    res.setHeader("Cache-Control", "public, max-age=31536000, immutable");
    return res.end(img.buf);
  }

  return res.status(405).json({ error: "method not allowed" });
}
