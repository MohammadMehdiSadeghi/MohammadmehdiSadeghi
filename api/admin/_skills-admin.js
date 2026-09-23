import { requireAuth, withLock } from "../_lib.js";
import { listData, saveData } from "../_data.js";

export default async function handler(req, res) {
  if (requireAuth(req, res) === null) return;
  const name = "skills.json";
  const body = req.body || {};

  if (req.method === "GET") {
    return res.json({ skills: (await listData(name)) || [] });
  }

  /* Locked for the same reason as _projects-admin: each mutation is a
     read-modify-write of the whole list, so concurrent writers lose updates. */
  const outcome = await withLock(name, async () => {
    const skills = (await listData(name)) || [];
    const nextId = () => skills.reduce((m, s) => Math.max(m, s.id || 0), 0) + 1;

    if (req.method === "POST") {
      const nm = String(body.name || "").trim();
      if (!nm) return { code: 400, payload: { error: "name is required" } };
      const entry = {
        id: nextId(),
        name: nm,
        img: String(body.img || "").trim(),
      };
      skills.push(entry);
      await saveData(name, skills);
      return { code: 200, payload: { ok: true, skill: entry } };
    }

    if (req.method === "PUT") {
      const id = body.id;
      if (id == null) {
        return { code: 400, payload: { error: "id is required" } };
      }
      const s = skills.find((x) => String(x.id) === String(id));
      if (!s) return { code: 404, payload: { error: "skill not found" } };
      if (body.name != null) s.name = String(body.name).trim();
      if (body.img != null) s.img = String(body.img).trim();
      await saveData(name, skills);
      return { code: 200, payload: { ok: true } };
    }

    if (req.method === "DELETE") {
      const id = body.id ?? req.query.id;
      if (id == null) {
        return { code: 400, payload: { error: "id is required" } };
      }
      const filtered = skills.filter((x) => String(x.id) !== String(id));
      if (filtered.length === skills.length) {
        return { code: 404, payload: { error: "skill not found" } };
      }
      await saveData(name, filtered);
      return { code: 200, payload: { ok: true } };
    }

    return { code: 405, payload: { error: "method not allowed" } };
  });

  return res.status(outcome.code).json(outcome.payload);
}
