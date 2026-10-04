import { UB_MAP } from "./_data.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "method not allowed" });
  }
  const type = String(req.query.type || "first");
  const data = UB_MAP[type === "second" ? "second" : "first"];
  if (!data) return res.status(404).json({ error: "Data not found" });
  const out = JSON.parse(JSON.stringify(data));
  if (Array.isArray(out)) {
    for (const item of out) {
      if (
        item &&
        typeof item === "object" &&
        typeof item.image === "string" &&
        item.image.startsWith("/")
      ) {
        item.image = item.image.replace(/^\/+/, "");
      }
    }
  }
  res.json(out);
}
