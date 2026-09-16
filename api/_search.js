import { runSearch } from "./_music.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "method not allowed" });
  }
  const q = String(req.query.q || "");
  res.setHeader("Cache-Control", "no-store");
  res.json(runSearch(q));
}
