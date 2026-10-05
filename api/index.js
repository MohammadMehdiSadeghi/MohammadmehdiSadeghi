/* ════════════════════════════════════════════════════════════════════
   SINGLE serverless entry point for the whole API.

   WHY: Vercel Hobby allows only 12 Serverless Functions per Deployment.
   This repo used to have 14 files under api/ (one function each). Now the
   ONLY function is this file — every other module is prefixed with "_",
   which Vercel ignores when counting/building functions.

   ROUTING: vercel.json rewrites every /api/<anything> to
     /api/index?__route=<anything>
   because a bare [...all].js catch-all does NOT receive multi-segment
   paths on this project (Vercel serves its own NOT_FOUND for
   /api/admin/auth). Passing the path as a QUERY PARAM is bullet-proof:
   req.query.__route is always the real request path.

   Unknown /api/* paths fall through to the local `notFound` handler, and
   every route keeps the exact same handler module it had before.
   ════════════════════════════════════════════════════════════════════ */

import auth from "./admin/_auth.js";
import authCheck from "./admin/_auth-check.js";
import password from "./admin/_password.js";
import messages from "./admin/_messages.js";
import projectsAdmin from "./admin/_projects-admin.js";
import skillsAdmin from "./admin/_skills-admin.js";
import stats from "./admin/_stats.js";
import track from "./admin/_track.js";
import trackClick from "./admin/_track-click.js";
import moods from "./admin/_moods.js";
import telegram from "./admin/_telegram.js";
import fsAdmin from "./admin/_fs.js";
import reset from "./admin/_reset.js";
import blogAdmin from "./admin/_blog-admin.js";
import blogUpload from "./admin/_blog-upload.js";
import siteAdmin from "./admin/_site-admin.js";
import search from "./_search.js";
import skills from "./_skills.js";
import digikala from "./_digikala.js";
import ubisoft from "./_ubisoft.js";
import moodSearch from "./_mood-search.js";
import sabz from "./_sabz.js";
import blog from "./_blog.js";
import { BUNDLED, listData } from "./_data.js";
import { loadConfig } from "./_lib.js";

/* route path → handler(req, res) */
const ROUTES = {
  "admin/auth": auth,
  "admin/auth-check": authCheck,
  "admin/password": password,
  "admin/messages": messages,
  "admin/projects-admin": projectsAdmin,
  "admin/skills-admin": skillsAdmin,
  "admin/stats": stats,
  "admin/track": track,
  "admin/track-click": trackClick,
  "admin/moods": moods,
  "admin/telegram": telegram,
  "admin/fs": fsAdmin,
  "admin/reset": reset,
  "admin/blog-admin": blogAdmin,
  "admin/blog-upload": blogUpload,
  "admin/site-admin": siteAdmin,
  "blog-image": blogUpload,
  "search": search,
  "skills": skills,
  "digikala": digikala,
  "ubisoft": ubisoft,
  "mood-search": moodSearch,
  "blog": blog,
  /* Sabz-Learn sub-app backend (was a PHP/Node server that never shipped) */
  "sabz/users": sabz,
  "sabz/comments": sabz,
};

/* raw public/api/*.json — serve dynamically from listData so admin edits & reorders take effect */
const STATIC_JSON = {
  "projects.json": () => listData("projects.json"),
  "mini-projects.json": () => listData("mini-projects.json"),
  "skills.json": () => listData("skills.json"),
  "music-analysis.json": () => listData("music-analysis.json"),
  "blog.json": () => listData("blog.json"),
};

function notFound(res) {
  return res.status(404).json({ error: "not found" });
}

/* Normalise every possible way the path can reach us:
   ?__route=a/b  ·  ?all=a&all=b  ·  req.url  */
function resolveRoute(req) {
  const q = req.query || {};
  let raw = q.__route;
  if (Array.isArray(raw)) raw = raw.join("/");
  if (!raw) {
    const segs = q.all;
    if (Array.isArray(segs)) raw = segs.join("/");
    else if (typeof segs === "string") raw = segs;
  }
  if (!raw && typeof req.url === "string") {
    const path = req.url.split("?")[0].replace(/^\/api\//, "");
    if (path && path !== "api") raw = path;
  }
  return String(raw || "")
    .replace(/^\/+|\/+$/g, "")
    .replace(/^api\//, "");
}

/* multi-segment sub-resources: "admin/telegram/test" → telegram handler
   with resource="test"; "admin/fs-size" → fs handler with resource set. */
const SUBROUTES = [
  { prefix: "admin/telegram/", handler: telegram },
  { prefix: "admin/fs", handler: fsAdmin },
  { prefix: "admin/moods", handler: moods },
];

/* Re-attach any query params from the ORIGINAL url that the rewrite may
   not have carried over (e.g. /api/digikala?type=offer-products). Rewrites
   normally preserve the query string, but the handlers depend on it, so we
   merge defensively instead of silently returning empty data. */
function mergeQuery(req) {
  const url = typeof req.url === "string" ? req.url : "";
  const qs = url.split("?")[1];
  if (!qs) return;
  const extra = Object.fromEntries(new URLSearchParams(qs).entries());
  req.query = { ...extra, ...(req.query || {}) };
  if (req.query.__route == null && extra.__route == null) {
    const path = url.split("?")[0].replace(/^\/api\//, "");
    /* "index" is the rewrite DESTINATION, not the original route */
    if (path && path !== "api" && path !== "index") req.query.__route = path;
  }
}

export default async function handler(req, res) {
  /* Resolve the admin config (and the STABLE token secret) once, before any
     handler runs. Handlers call requireAuth() synchronously, so the secret
     must already be in place or every panel request 401s. */
  await loadConfig();

  mergeQuery(req);
  const route = resolveRoute(req);

  /* sub-router: sabz/<resource> */
  if (route === "sabz/users" || route === "sabz/comments") {
    return sabz(req, res, route.split("/")[1]);
  }

  /* exact routes first */
  const fn = ROUTES[route];
  if (fn) return fn(req, res);

  /* then prefix-based sub-resources */
  for (const { prefix, handler: h } of SUBROUTES) {
    if (route === prefix || route.startsWith(prefix)) {
      const resource = route.slice(prefix.length).replace(/^\/+/, "");
      return h(req, res, resource);
    }
  }

  if (Object.prototype.hasOwnProperty.call(STATIC_JSON, route)) {
    res.setHeader("Cache-Control", "no-store");
    const data = await STATIC_JSON[route]();
    return res.json(data);
  }

  return notFound(res);
}
