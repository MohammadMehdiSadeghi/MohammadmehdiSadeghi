import { requireAuth, withLock, storeBackend, storeDurable } from "../_lib.js";
import { listData, saveData } from "../_data.js";

/* ════════════════════════════════════════════════════════════════════
   Admin → site identity / contact / social links.

   One flat object, because every consumer reads a single field at a time
   (Footer wants `github`, ContactBox wants `telegram`, …) and a nested
   shape would only add paths to keep in sync across three backends.

   `handle` fields are stored WITHOUT the leading "@" — the renderers add
   it. Storing "@x" and rendering "@" + value is how you end up with "@@x".
   ════════════════════════════════════════════════════════════════════ */

/* Allow-list, not a blind Object.assign: a stray key in the request body
   must never leak into the public /api/site.json payload. */
const FIELDS = [
  "brand",
  "email",
  "phone",
  "phoneLabel",
  "github",
  "githubHandle",
  "linkedin",
  "telegram",
  "telegramHandle",
  "instagram",
  "instagramHandle",
];

const URL_FIELDS = [
  ["github", "github"],
  ["linkedin", "linkedin"],
  ["telegram", "telegram"],
  ["instagram", "instagram"],
];

/* Validate the values that get interpolated into an href. A malformed one
   is not a cosmetic problem: `mailto:not an email` opens a broken mail
   client, and a javascript: URL in the GitHub slot is an XSS vector. */
function validate(next) {
  if (next.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(next.email)) {
    return "email is not a valid address";
  }
  const digits = String(next.phone || "").replace(/[^\d+]/g, "");
  if (digits && !/^\+?\d{7,15}$/.test(digits)) {
    return "phone must be 7-15 digits, optionally starting with +";
  }
  for (const [key, label] of URL_FIELDS) {
    const url = String(next[key] || "");
    if (!url) continue;
    if (!/^https?:\/\//i.test(url)) {
      return `${label} must start with http:// or https://`;
    }
    try {
      new URL(url);
    } catch {
      return `${label} is not a valid URL`;
    }
  }
  return null;
}

export default async function handler(req, res) {
  if (requireAuth(req, res) === null) return;
  const name = "site.json";

  if (req.method === "GET") {
    return res.json({
      site: (await listData(name)) || {},
      /* Same signal the stats page shows: on Vercel without a Redis-compatible
         store, an edit lands in a per-instance /tmp and is gone after a cold
         start. The editor warns about that instead of letting the save look
         permanent. */
      storage: storeBackend(),
      durable: storeDurable(),
    });
  }

  if (req.method !== "PUT" && req.method !== "POST") {
    return res.status(405).json({ error: "method not allowed" });
  }

  const body = req.body || {};

  /* Locked: the panel submits the whole form at once, so this is a
     read-modify-write of one object and two concurrent saves would
     otherwise clobber each other's fields. */
  const outcome = await withLock(name, async () => {
    const current = (await listData(name)) || {};
    const next = { ...current };

    for (const key of FIELDS) {
      if (body[key] != null) next[key] = String(body[key]).trim();
    }

    const problem = validate(next);
    if (problem) return { code: 400, payload: { error: problem } };

    next.updatedAt = new Date().toISOString();
    await saveData(name, next);
    return { code: 200, payload: { ok: true, site: next } };
  });

  return res.status(outcome.code).json(outcome.payload);
}
