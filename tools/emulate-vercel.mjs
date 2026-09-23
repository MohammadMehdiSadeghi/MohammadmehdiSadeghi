/* Emulate the Vercel deployment locally, with NO dependencies:
   reads vercel.json, applies rewrites in order, serves dist/ static
   files, and runs the real api/index.js handler for routed /api calls.
   Run from the project root so the handler's relative imports resolve. */
import http from "node:http";
import fs from "node:fs";
import path from "node:path";
import { pathToFileURL } from "node:url";

process.env.VERCEL_DATA_DIR =
  (process.env.LOCALAPPDATA || "/tmp") + "/Temp/pdata-emul";
process.env.VERCEL_ADMIN_SECRET = "emul-secret";

const BASE = process.cwd();
const DIST = path.join(BASE, "dist");
const cfg = JSON.parse(fs.readFileSync(path.join(BASE, "vercel.json"), "utf8"));

function toRegex(source) {
  if (source === "/((?!api/).*)") return { re: /^\/(?!api\/).*$/, params: [] };
  const params = [];
  let s = source.replace(/[.+^${}()|[\]\\]/g, "\\$&");
  s = s.replace(/:(\w+)\*/g, (_, n) => { params.push(n); return "(.*)"; });
  s = s.replace(/:(\w+)/g, (_, n) => { params.push(n); return "([^/]+)"; });
  return { re: new RegExp("^" + s + "$"), params };
}
const RULES = cfg.rewrites.map((r) => ({ ...r, ...toRegex(r.source) }));

function applyRewrites(url) {
  const [pathname, search = ""] = url.split("?");
  for (const r of RULES) {
    const m = r.re.exec(pathname);
    if (!m) continue;
    let dest = r.destination;
    r.params.forEach((name, i) => {
      // ":path*" is greedy — strip the trailing "*" from the placeholder
      dest = dest.replace(":" + name + "*", m[i + 1]).replace(":" + name, m[i + 1]);
    });
    if (dest.split("?")[0] === pathname) continue;
    return dest + (search ? "?" + search : "");
  }
  return null;
}

const H = await import(pathToFileURL(path.join(BASE, "api/index.js")).href);
const handler = H.default;

const MIME = {
  ".html": "text/html; charset=utf-8",
  ".js": "application/javascript; charset=utf-8",
  ".css": "text/css; charset=utf-8",
  ".json": "application/json; charset=utf-8",
  ".svg": "image/svg+xml",
  ".png": "image/png",
  ".jpg": "image/jpeg",
  ".jpeg": "image/jpeg",
  ".gif": "image/gif",
  ".ttf": "font/ttf",
  ".woff2": "font/woff2",
};

function sendFile(res, file) {
  const ext = path.extname(file).toLowerCase();
  res.writeHead(200, { "Content-Type": MIME[ext] || "application/octet-stream" });
  fs.createReadStream(file).pipe(res);
}

function nodeReqToVercel(req, queryObj) {
  const r = req;
  r.query = queryObj;
  r.body = undefined;
  r.status = (c) => { res.statusCode = c; return res; };
  return r;
}

const server = http.createServer(async (req, res) => {
  const orig = req.url;
  const dest = applyRewrites(orig);
  let pathname = orig.split("?")[0];

  res.status = (c) => { res.statusCode = c; return res; };
  res.json = (b) => {
    res.setHeader("Content-Type", "application/json; charset=utf-8");
    res.end(JSON.stringify(b));
    return res;
  };
  res.setHeader = res.setHeader.bind(res);

  if (dest) {
    const destPath = dest.split("?")[0];

    /* The API always goes to the handler, and it must be checked BEFORE the
       "real file on disk" test below: Vite copies public/ into dist/, so
       dist/api/projects.json (a build-time snapshot) exists on disk and would
       otherwise be served instead of the handler — which is what applies the
       admin overlay. */
    if (destPath === "/api/index") {
      const qs = new URLSearchParams(dest.split("?")[1] || "");
      const q = Object.fromEntries(qs.entries());
      // collect the JSON body for POSTs
      if (req.method !== "GET" && req.method !== "HEAD") {
        const chunks = [];
        for await (const c of req) chunks.push(c);
        const raw = Buffer.concat(chunks).toString("utf8");
        try { req.body = raw ? JSON.parse(raw) : {}; } catch { req.body = {}; }
      }
      try {
        return await handler(req, res);
      } catch (e) {
        res.statusCode = 500;
        return res.json({ error: String(e && e.message) });
      }
    }

    /* A real file wins over the rewrite — tested against the ORIGINAL path,
       not the destination. The SPA fallback `/((?!api/).*)` → `/index.html`
       also matches /assets/*.js and every other real file, and its
       destination always exists, so checking the destination meant every
       asset request was answered with index.html. The browser got HTML where
       it expected JavaScript and the app never booted at all. */
    const origFile = path.join(DIST, decodeURIComponent(pathname));
    if (fs.existsSync(origFile) && fs.statSync(origFile).isFile()) {
      return sendFile(res, origFile);
    }

    /* Deep-linked relative assets. The build uses base './', so from a route
       like /admin/site the browser asks for /admin/assets/index-*.js, while
       the file really lives at /assets/index-*.js. Strip leading segments
       until it resolves — the same fallback server.js implements. Without
       this, the SPA fallback below answers with index.html and a deep link
       boots to a blank page. */
    if (/\.[a-z0-9]+$/i.test(pathname)) {
      const segs = pathname.split("/").filter(Boolean);
      for (let i = 1; i < segs.length; i++) {
        const cand = path.join(DIST, decodeURIComponent(segs.slice(i).join("/")));
        if (fs.existsSync(cand) && fs.statSync(cand).isFile()) {
          return sendFile(res, cand);
        }
      }
    }

    const onDisk = path.join(DIST, decodeURIComponent(destPath));
    if (fs.existsSync(onDisk) && fs.statSync(onDisk).isFile()) {
      return sendFile(res, onDisk);
    }
    pathname = destPath;
  }

  const target = path.join(DIST, decodeURIComponent(pathname));
  if (fs.existsSync(target) && fs.statSync(target).isFile()) {
    return sendFile(res, target);
  }
  res.statusCode = 404;
  res.end("NOT_FOUND");
});

const PORT = Number(process.env.EMUL_PORT || 4599);
server.listen(PORT, () => console.log("emulator listening on " + PORT));
