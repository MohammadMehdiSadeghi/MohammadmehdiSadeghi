import { requireAuth } from "../_lib.js";
import { listData, saveData } from "../_data.js";

export default async function handler(req, res) {
  if (requireAuth(req, res) === null) return;
  const name = "skills.json";
  const body = req.body || {};

  if (req.method === "GET") {
    return res.json({ skills: (await listData(name)) || [] });
  }
  const skills = (await listData(name)) || [];
  const nextId = () => skills.reduce((m, s) => Math.max(m, s.id || 0), 0) + 1;

  if (req.method === "POST") {
    const nm = String(body.name || "").trim();
    if (!nm) return res.status(400).json({ error: "name is required" });
    const entry = { id: nextId(), name: nm, img: String(body.img || "").trim() };
    skills.push(entry);
    await saveData(name, skills);
    return res.json({ ok: true, skill: entry });
  }
  if (req.method === "PUT") {
    if (Array.isArray(body.skills)) {
      await saveData(name, body.skills);
      return res.json({ ok: true, skills: body.skills });
    }
    const id = body.id;
    if (id == null) return res.status(400).json({ error: "id is required" });
    const s = skills.find((x) => String(x.id) === String(id));
    if (!s) return res.status(404).json({ error: "skill not found" });
    if (body.name != null) s.name = String(body.name).trim();
    if (body.img != null) s.img = String(body.img).trim();
    await saveData(name, skills);
    return res.json({ ok: true });
  }
  if (req.method === "DELETE") {
    const id = body.id ?? req.query.id;
    if (id == null) return res.status(400).json({ error: "id is required" });
    const before = skills.length;
    const filtered = skills.filter((x) => String(x.id) !== String(id));
    if (filtered.length === before) {
      return res.status(404).json({ error: "skill not found" });
    }
    await saveData(name, filtered);
    return res.json({ ok: true });
  }
  res.status(405).json({ error: "method not allowed" });
}
