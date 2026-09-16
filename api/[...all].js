/* ════════════════════════════════════════════════════════════════════
   SINGLE serverless entry point for the whole API.

   Vercel Hobby caps a Deployment at 12 Serverless Functions. Each file
   under api/ used to be its own function (14 of them). Now ONLY this
   catch-all counts as a function — every other module lives in files
   prefixed with "_" (which Vercel ignores) or inside helpers.

   Route is derived from the catch-all segments (req.query.all), e.g.
     GET  /api/skills            → all = ["skills"]
     POST /api/admin/messages    → all = ["admin","messages"]
   Query params (q, type, id …) are still available on req.query.
   ════════════════════════════════════════════════════════════════════ */

import auth from "./admin/_auth.js";
import authCheck from "./admin/_auth-check.js";
import messages from "./admin/_messages.js";
import projectsAdmin from "./admin/_projects-admin.js";
import skillsAdmin from "./admin/_skills-admin.js";
import stats from "./admin/_stats.js";
import track from "./admin/_track.js";
import trackClick from "./admin/_track-click.js";
import search from "./_search.js";
import skills from "./_skills.js";
import digikala from "./_digikala.js";
import ubisoft from "./_ubisoft.js";
import moodSearch from "./_mood-search.js";
import { BUNDLED } from "./_data.js";
import musicAnalysisJson from "../public/api/music-analysis.json" with { type: "json" };

/* path → handler (handler already speaks (req,res) like before) */
const ROUTES = {
  "admin/auth": auth,
  "admin/auth-check": authCheck,
  "admin/messages": messages,
  "admin/projects-admin": projectsAdmin,
  "admin/skills-admin": skillsAdmin,
  "admin/stats": stats,
  "admin/track": track,
  "admin/track-click": trackClick,
  "search": search,
  "skills": skills,
  "digikala": digikala,
  "ubisoft": ubisoft,
  "mood-search": moodSearch,
};

/* raw public/api/*.json that used to be served as static files; the
   catch-all shadows them, so mirror them here to avoid breaking calls */
const STATIC_JSON = {
  "projects.json": () => BUNDLED["projects.json"],
  "mini-projects.json": () => BUNDLED["mini-projects.json"],
  "skills.json": () => BUNDLED["skills.json"],
  "music-analysis.json": () => musicAnalysisJson,
};

const notFound = (res) => res.status(404).json({ error: "not found" });

export default async function handler(req, res) {
  const segs = req.query?.all;
  const path = (Array.isArray(segs) ? segs.join("/") : String(segs || "")).replace(
    /^\/+|\/+$/g,
    ""
  );

  const fn = ROUTES[path];
  if (fn) return fn(req, res);

  if (Object.prototype.hasOwnProperty.call(STATIC_JSON, path)) {
    res.setHeader("Cache-Control", "no-store");
    return res.json(STATIC_JSON[path]());
  }

  return notFound(res);
}
