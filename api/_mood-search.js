import { MUSIC_DB } from "./_music.js";
import { executeMoodSearch } from "./_mood-engine.js";

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "method not allowed" });
  }

  const query = String(req.query.q || "").trim();
  if (!query) {
    return res.json({ error: "Query is required" });
  }
  if (query.length < 2) {
    return res.json({ error: "Query is too short (min 2 chars)" });
  }
  if (query.length > 500) {
    return res.json({ error: "Query is too long (max 500 chars)" });
  }

  const songs = (MUSIC_DB && MUSIC_DB.songs) || [];
  if (!songs.length) {
    return res.json({ found: false, results: [] });
  }

  const result = executeMoodSearch(songs, query);

  res.setHeader("Cache-Control", "no-store");
  return res.json(result);
}
