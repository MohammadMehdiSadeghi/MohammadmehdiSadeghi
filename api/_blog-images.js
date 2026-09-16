/* ════════════════════════════════════════════════════════════════════
   Blog cover images.

   Covers are stored as FILES, not inside the post records: a post list that
   carried base64 covers would ship megabytes to every visitor. A post stores
   only a small URL —

     post.cover = "/api/blog-image?id=<imageId>"   (uploaded)
     post.cover = "https://…/photo.jpg"            (external, kept as-is)

   Files live under DATA_DIR/blog-images/ which is writable on both targets
   (/tmp on Vercel, the local data dir when self-hosted), so the same code
   path works on either deployment.
   ════════════════════════════════════════════════════════════════════ */

import fsp from "node:fs/promises";
import path from "node:path";
import { DATA_DIR } from "./_lib.js";

const DIR = path.join(DATA_DIR, "blog-images");

const EXT_MIME = {
  jpg: "image/jpeg",
  jpeg: "image/jpeg",
  png: "image/png",
  webp: "image/webp",
  gif: "image/gif",
  svg: "image/svg+xml",
  avif: "image/avif",
};

const extFor = (mime) => {
  const found = Object.entries(EXT_MIME).find(([, m]) => m === mime);
  return found ? found[0] : "jpg";
};

/* a cover field holding an uploaded image → the id we can resolve */
export function imageIdFrom(cover) {
  const m = /^\/api\/blog-image\?id=([\w.-]+)$/.exec(String(cover || ""));
  return m ? m[1] : null;
}

export function imageUrl(id) {
  return `/api/blog-image?id=${encodeURIComponent(id)}`;
}

/* "data:image/webp;base64,AAAA" → { mime, base64 }  (null when malformed) */
export function parseDataUrl(dataUrl) {
  const m = /^data:([\w/+.-]+);base64,([A-Za-z0-9+/=\s]+)$/.exec(String(dataUrl || "").trim());
  if (!m) return null;
  const mime = m[1].toLowerCase();
  if (!/^image\//.test(mime)) return null;
  if (!EXT_MIME[extFor(mime)]) return null;
  return { mime, base64: m[2].replace(/\s+/g, "") };
}

/* keep the encoded body under Vercel's ~4.5MB serverless request limit
   (base64 inflates raw bytes by 4/3, so 2.5MB of image ≈ 3.4MB of payload) */
export const MAX_IMAGE_BYTES = 2.5 * 1024 * 1024;

const safeId = (id) => /^[\w.-]{1,80}$/.test(String(id || ""));

export async function saveImage(dataUrl) {
  const parsed = parseDataUrl(dataUrl);
  if (!parsed) return { error: "expected a base64 image data URL (data:image/…;base64,…)" };

  const buf = Buffer.from(parsed.base64, "base64");
  if (!buf.length) return { error: "image decoded to zero bytes" };
  if (buf.length > MAX_IMAGE_BYTES) {
    return {
      error: `image is too large (${Math.round(buf.length / 1024)}KB, max ${Math.round(
        MAX_IMAGE_BYTES / 1024,
      )}KB)`,
    };
  }

  const id = `${Date.now().toString(36)}${Math.random().toString(36).slice(2, 8)}.${extFor(parsed.mime)}`;
  await fsp.mkdir(DIR, { recursive: true });
  await fsp.writeFile(path.join(DIR, id), buf);
  return { id, url: imageUrl(id) };
}

export async function getImage(id) {
  if (!safeId(id)) return null;
  try {
    const buf = await fsp.readFile(path.join(DIR, id));
    const mime = EXT_MIME[String(id).split(".").pop().toLowerCase()] || "application/octet-stream";
    return { buf, mime };
  } catch {
    return null;
  }
}

/* drop cover files no longer referenced by any post, so swapping a cover
   doesn't leak the old one forever */
export async function pruneImages(posts) {
  const keep = new Set((posts || []).map((p) => imageIdFrom(p && p.cover)).filter(Boolean));
  let names;
  try {
    names = await fsp.readdir(DIR);
  } catch {
    return 0;
  }
  let removed = 0;
  for (const n of names) {
    if (!keep.has(n)) {
      try {
        await fsp.unlink(path.join(DIR, n));
        removed++;
      } catch {
        /* raced */
      }
    }
  }
  return removed;
}
