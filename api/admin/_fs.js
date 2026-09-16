/* ════════════════════════════════════════════════════════════════════
   Admin file manager, serverless edition.

   The Node backend walks the whole project tree. On Vercel the filesystem
   is read-only EXCEPT /tmp, so this handler browses the one directory
   that is both writable and meaningful there: the ephemeral data store
   (visits, messages, sabz accounts/comments…).

     GET  /api/admin/fs?path=        → { path, items:[{name,type,size,mtime}] }
     GET  /api/admin/fs-size?path=   → { size, files }
     POST /api/admin/fs-delete       → { path }  (cannot escape the store)

   Deleting the sabz stores is exactly the "wipe the test database" the
   user asked for, so the panel exposes it rather than 501-ing.
   ════════════════════════════════════════════════════════════════════ */

import { requireAuth, DATA_DIR } from "../_lib.js";
import fsp from "node:fs/promises";
import path from "node:path";

/* resolve a client path inside DATA_DIR; reject anything that escapes */
function safeJoin(p) {
  const root = path.resolve(DATA_DIR);
  const target = path.resolve(root, String(p || "").replace(/^\/+/, ""));
  if (target !== root && !target.startsWith(root + path.sep)) return null;
  return target;
}

async function listDir(dir) {
  let entries;
  try {
    entries = await fsp.readdir(dir, { withFileTypes: true });
  } catch (e) {
    /* a cold instance has no store yet — an empty listing, not a 404 */
    if (e?.code === "ENOENT") return [];
    throw e;
  }
  const items = [];
  for (const e of entries) {
    const full = path.join(dir, e.name);
    let size = 0;
    let mtime = 0;
    try {
      const st = await fsp.stat(full);
      size = st.size;
      mtime = st.mtimeMs;
    } catch {
      /* raced with a delete */
    }
    items.push({
      name: e.name,
      type: e.isDirectory() ? "dir" : "file",
      size,
      mtime,
    });
  }
  items.sort((a, b) => (a.type === b.type ? a.name.localeCompare(b.name) : a.type === "dir" ? -1 : 1));
  return items;
}

async function dirSize(dir) {
  let size = 0;
  let files = 0;
  const walk = async (d) => {
    let entries;
    try {
      entries = await fsp.readdir(d, { withFileTypes: true });
    } catch {
      return;
    }
    for (const e of entries) {
      const full = path.join(d, e.name);
      if (e.isDirectory()) await walk(full);
      else {
        files++;
        try {
          size += (await fsp.stat(full)).size;
        } catch {
          /* gone */
        }
      }
    }
  };
  await walk(dir);
  return { size, files };
}

export default async function handler(req, res, resource) {
  if (requireAuth(req, res) === null) return;

  const target = req.query?.path ?? req.body?.path ?? "";
  const dir = safeJoin(target);
  if (!dir) return res.status(400).json({ error: "invalid path" });

  /* /api/admin/fs-size?path= → folder size.
     NOTE: index.js derives the sub-resource by stripping the "admin/fs"
     prefix, so "admin/fs-size" arrives as "-size", not "fs-size". Accept
     every shape or the tab silently falls back to a plain listing and the
     size column stays as "…" forever. */
  const action = String(resource || "").replace(/^-/, "");
  if (action === "size") {
    const s = await dirSize(dir);
    return res.json({ ...s, path: String(target || "") });
  }

  if (req.method === "POST") {
    /* /api/admin/fs-delete → { path } */
    try {
      const st = await fsp.stat(dir);
      if (st.isDirectory()) await fsp.rm(dir, { recursive: true, force: true });
      else await fsp.unlink(dir);
    } catch (e) {
      return res.status(404).json({ error: String(e?.message || "not found") });
    }
    return res.json({ ok: true, deleted: String(target || "") });
  }

  /* GET → listing (create the store dir so a cold instance shows an empty
     tree instead of an error, and the reset button still works) */
  try {
    let items;
    try {
      items = await listDir(dir);
    } catch (e) {
      if (e?.code !== "ENOENT") throw e;
      await fsp.mkdir(dir, { recursive: true });
      items = [];
    }
    return res.json({ path: String(target || ""), items });
  } catch (e) {
    return res.status(404).json({
      error: `cannot list "${target}": ${String(e?.code || e?.message)}`,
      note: "on the serverless deployment only the temp data store is browsable",
    });
  }
}
