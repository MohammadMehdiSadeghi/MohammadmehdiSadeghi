import projectsJson from "../public/api/projects.json" with { type: "json" };
import miniProjectsJson from "../public/api/mini-projects.json" with { type: "json" };
import skillsJson from "../public/api/skills.json" with { type: "json" };
import musicAnalysisJson from "../public/api/music-analysis.json" with { type: "json" };
import blogJson from "../public/api/blog.json" with { type: "json" };
import siteJson from "../public/api/site.json" with { type: "json" };

import dkBest from "../public/Projects/Web-Project/Digikala/backend/best products.json" with { type: "json" };
import dkOffer from "../public/Projects/Web-Project/Digikala/backend/offer-products.json" with { type: "json" };
import dkMarket from "../public/Projects/Web-Project/Digikala/backend/market-products-on-offer.json" with { type: "json" };
import dkP14 from "../public/Projects/Web-Project/Digikala/backend/part-products-1-4.json" with { type: "json" };
import dkP58 from "../public/Projects/Web-Project/Digikala/backend/part-products-5-8.json" with { type: "json" };
import dkOfferAll from "../public/Projects/Web-Project/Digikala/backend/offer-all-products.json" with { type: "json" };
import dkLaptop from "../public/Projects/Web-Project/Digikala/backend/laptop-category.json" with { type: "json" };

import ubFirst from "../public/Projects/Web-Project/Ubisoft/backend/top-slider-games-data.json" with { type: "json" };
import ubSecond from "../public/Projects/Web-Project/Ubisoft/backend/top slider games data img second.json" with { type: "json" };

import { readStore, writeStore } from "./_lib.js";

/* ════════════════════════════════════════════════════════════════════
   Bundled (git-tracked) data — statically imported so Vercel's file
   tracing always includes them; no runtime fs path guessing.
   ════════════════════════════════════════════════════════════════════ */

export const BUNDLED = {
  "projects.json": projectsJson,
  "mini-projects.json": miniProjectsJson,
  "skills.json": skillsJson,
  "music-analysis.json": musicAnalysisJson,
  "blog.json": blogJson,
  "site.json": siteJson,
};

export const DK_MAP = {
  "best-products": dkBest,
  "offer-products": dkOffer,
  "market-products-on-offer": dkMarket,
  "part-products-1-4": dkP14,
  "part-products-5-8": dkP58,
  "offer-all-products": dkOfferAll,
  "laptop-category": dkLaptop,
};

export const UB_MAP = { first: ubFirst, second: ubSecond };

/* strip leading "/" from image paths (parity with server.js) */
export function fixImagePaths(node) {
  if (Array.isArray(node)) {
    node.forEach(fixImagePaths);
    return;
  }
  if (node && typeof node === "object") {
    for (const [key, value] of Object.entries(node)) {
      if ((key === "image" || key === "img") && typeof value === "string" && value.startsWith("/")) {
        node[key] = value.replace(/^\/+/, "");
      } else if (value && typeof value === "object") {
        fixImagePaths(value);
      }
    }
  }
}

/* Durable admin edits live in Postgres (admin_settings, keyed by filename)
   when SUPABASE_DB_URL is configured; the bundled JSON is the baseline and
   the /tmp overlay is the fallback. Read order in readStore():
   Postgres → /tmp file → caller fallback. */
export async function listData(name) {
  const saved = await readStore(name, null);
  if (saved != null) return saved;
  return BUNDLED[name];
}

export async function saveData(name, data) {
  await writeStore(name, data);
}
