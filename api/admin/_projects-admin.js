import { requireAuth, withLock } from "../_lib.js";
import { listData, saveData } from "../_data.js";

export default async function handler(req, res) {
  if (requireAuth(req, res) === null) return;
  const body = req.body || {};
  const type = req.query.type || body.type || "web";
  const name = type === "mini" ? "mini-projects.json" : "projects.json";

  if (req.method === "GET") {
    return res.json({ projects: (await listData(name)) || [] });
  }

  /* Every mutation below is a read-modify-write of the whole list. Running it
     unlocked meant two overlapping requests (a double-clicked Save, the panel
     open in two tabs) both read the same array and the second write silently
     discarded the first. `withLock` is keyed on the store name, so it
     serialises writers of this file only. */
  const outcome = await withLock(name, async () => {
    const projects = (await listData(name)) || [];
    const nextId = () =>
      projects.reduce((m, p) => Math.max(m, p.id || 0), 0) + 1;

    if (req.method === "POST") {
      const title = String(body.title || "").trim();
      if (!title) {
        return { code: 400, payload: { error: "title is required" } };
      }
      const entry = {
        id: nextId(),
        url: String(body.url || "").trim(),
        title,
        description: String(body.description || "").trim(),
        category: Array.isArray(body.category) ? body.category : [],
        image: String(body.image || "").trim(),
        githubUrl: String(body.githubUrl || "").trim() || null,
      };
      projects.push(entry);
      await saveData(name, projects);
      return { code: 200, payload: { ok: true, project: entry } };
    }

    if (req.method === "PUT") {
      const id = body.id;
      if (id == null) {
        return { code: 400, payload: { error: "id is required" } };
      }
      const p = projects.find((x) => String(x.id) === String(id));
      if (!p) {
        return { code: 404, payload: { error: "project not found" } };
      }
      if (body.title != null) p.title = String(body.title).trim();
      if (body.url != null) p.url = String(body.url).trim();
      if (body.description != null) {
        p.description = String(body.description).trim();
      }
      if (body.image != null) p.image = String(body.image).trim();
      if (body.githubUrl != null) {
        p.githubUrl = String(body.githubUrl).trim() || null;
      }
      if (Array.isArray(body.category)) p.category = body.category;
      await saveData(name, projects);
      return { code: 200, payload: { ok: true } };
    }

    if (req.method === "DELETE") {
      const id = body.id ?? req.query.id;
      if (id == null) {
        return { code: 400, payload: { error: "id is required" } };
      }
      const filtered = projects.filter((x) => String(x.id) !== String(id));
      if (filtered.length === projects.length) {
        return { code: 404, payload: { error: "project not found" } };
      }
      await saveData(name, filtered);
      return { code: 200, payload: { ok: true } };
    }

    return { code: 405, payload: { error: "method not allowed" } };
  });

  return res.status(outcome.code).json(outcome.payload);
}
