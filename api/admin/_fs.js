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

import { requireAuth, DATA_DIR, readStore } from "../_lib.js";
import { BUNDLED } from "../_data.js";
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
      /* raced */
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

async function getCollections() {
  const blog = await readStore("blog.json", BUNDLED["blog.json"] || { posts: [] });
  const projects = await readStore("projects.json", BUNDLED["projects.json"] || []);
  const mini = await readStore("mini-projects.json", BUNDLED["mini-projects.json"] || []);
  const skills = await readStore("skills.json", BUNDLED["skills.json"] || []);
  const messages = await readStore("messages.json", []);
  const visits = await readStore("visits.json", {});
  const clicks = await readStore("clicks.json", []);
  const moods = await readStore("moods.json", {});
  const telegram = await readStore("telegram.json", {});
  const sabzUsers = await readStore("sabz-users.json", []);
  const sabzComments = await readStore("sabz-comments.json", []);

  const blogPosts = Array.isArray(blog?.posts) ? blog.posts : Array.isArray(blog) ? blog : [];
  const projArr = Array.isArray(projects) ? projects : [];
  const miniArr = Array.isArray(mini) ? mini : [];
  const skillsArr = Array.isArray(skills) ? skills : [];
  const msgArr = Array.isArray(messages) ? messages : [];
  const clicksArr = Array.isArray(clicks) ? clicks : [];
  const sUsersArr = Array.isArray(sabzUsers) ? sabzUsers : [];
  const sCommArr = Array.isArray(sabzComments) ? sabzComments : [];

  return [
    {
      id: "blog",
      name: "Blog Articles & Posts",
      filename: "blog.json",
      count: blogPosts.length,
      unit: "posts",
      description: "Articles, drafts, tags, covers and reading metrics",
      data: blog,
      size: JSON.stringify(blog || {}).length,
    },
    {
      id: "projects",
      name: "Main Web Projects",
      filename: "projects.json",
      count: projArr.length,
      unit: "projects",
      description: "Portfolio showcase projects, tech tags & links",
      data: projects,
      size: JSON.stringify(projects || []).length,
    },
    {
      id: "mini-projects",
      name: "Mini Projects & Tools",
      filename: "mini-projects.json",
      count: miniArr.length,
      unit: "projects",
      description: "Mini apps, games, UI demos and widgets",
      data: mini,
      size: JSON.stringify(mini || []).length,
    },
    {
      id: "messages",
      name: "Contact Messages",
      filename: "messages.json",
      count: msgArr.length,
      unit: "messages",
      description: "Inquiries submitted via contact form",
      data: messages,
      size: JSON.stringify(messages || []).length,
    },
    {
      id: "skills",
      name: "Skills & Badges",
      filename: "skills.json",
      count: skillsArr.length,
      unit: "skills",
      description: "Developer skills, icons and proficiency",
      data: skills,
      size: JSON.stringify(skills || []).length,
    },
    {
      id: "visits",
      name: "Traffic & Page Views",
      filename: "visits.json",
      count: Object.keys(visits || {}).length,
      unit: "days",
      description: "Daily unique visitor sessions and page hits",
      data: visits,
      size: JSON.stringify(visits || {}).length,
    },
    {
      id: "clicks",
      name: "Click Tracking Logs",
      filename: "clicks.json",
      count: clicksArr.length,
      unit: "events",
      description: "Button clicks, navigation logs and CTA interactions",
      data: clicks,
      size: JSON.stringify(clicks || []).length,
    },
    {
      id: "moods",
      name: "Visitor Moods / Reactions",
      filename: "moods.json",
      count: Object.keys(moods || {}).length,
      unit: "ratings",
      description: "Mood reaction scores and visitor feedback",
      data: moods,
      size: JSON.stringify(moods || {}).length,
    },
    {
      id: "telegram",
      name: "Telegram Bot Config",
      filename: "telegram.json",
      count: telegram?.token ? 1 : 0,
      unit: "config",
      description: "Bot credentials and notification channel status",
      data: telegram,
      size: JSON.stringify(telegram || {}).length,
    },
    {
      id: "sabz-users",
      name: "Sabz-Learn Demo Users",
      filename: "sabz-users.json",
      count: sUsersArr.length,
      unit: "accounts",
      description: "Demo user registrations (temporary)",
      data: sabzUsers,
      size: JSON.stringify(sabzUsers || []).length,
    },
    {
      id: "sabz-comments",
      name: "Sabz-Learn Demo Reviews",
      filename: "sabz-comments.json",
      count: sCommArr.length,
      unit: "reviews",
      description: "Demo student reviews and comments (temporary)",
      data: sabzComments,
      size: JSON.stringify(sabzComments || []).length,
    },
  ];
}

export default async function handler(req, res, resource) {
  if (requireAuth(req, res) === null) return;

  const action = String(resource || "").replace(/^-/, "");

  /* /api/admin/fs-collections or /api/admin/fs?action=collections */
  if (action === "collections" || req.query?.action === "collections") {
    try {
      const collections = await getCollections();
      return res.json({ collections });
    } catch (e) {
      return res.status(500).json({ error: e.message || "Failed to load database collections" });
    }
  }

  const target = req.query?.path ?? req.body?.path ?? "";
  const dir = safeJoin(target);
  if (!dir) return res.status(400).json({ error: "invalid path" });

  /* /api/admin/fs-size?path= */
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

  /* GET → listing */
  try {
    await fsp.mkdir(dir, { recursive: true });
    const items = await listDir(dir);
    return res.json({ path: String(target || ""), items });
  } catch {
    return res.json({ path: String(target || ""), items: [] });
  }
}
