/* ════════════════════════════════════════════════════════════════════
   Admin: mood QC page data — GET /api/admin/moods
   Lists every song with its LLM mood vector so moods can be hand-fixed.

   Writes are intentionally NOT persisted to music-database.json on
   Vercel: the deployment filesystem is read-only outside /tmp, and the
   bundled JSON is re-shipped on every build. Edits go to the ephemeral
   overlay store so they survive while the instance is warm.
   ════════════════════════════════════════════════════════════════════ */

import { requireAuth, readStore, writeStore, withLock } from "../_lib.js";
import { MUSIC_DB } from "../_music.js";

export const MOOD_DIMS = [
  "sadness", "longing", "nostalgia", "heartbreak", "loneliness",
  "joy", "playfulness", "romance", "sensuality", "warmth",
  "anger", "rebellion", "power", "defiance",
  "calm", "dreaminess", "melancholy", "hope",
  "darkness", "tension", "mystery",
  "energy", "euphoria", "reflection",
];

const OVERLAY = "music-db-overlay.json";

export default async function handler(req, res) {
  if (requireAuth(req, res) === null) return;

  const overlay = (await readStore(OVERLAY, null)) || {};
  const songs = (MUSIC_DB && MUSIC_DB.songs) || [];

  if (req.method === "GET") {
    const rows = songs.map((song) => {
      const patch = overlay[String(song.id)] || {};
      return {
        id: song.id,
        name: song.name,
        artist: song.artist,
        lyricsStatus: song.lyricsStatus || (song.lyrics ? "present" : "none"),
        summary: patch.summary ?? song.lyricsSummary ?? "",
        audioMoodTag: patch.audioMoodTag ?? song.audioMoodTag ?? "",
        moods: patch.moods ?? song.moods ?? {},
        hasAudio: !!(song.analysis && song.analysis.vibe),
      };
    });
    return res.json({ songs: rows, dims: MOOD_DIMS, ephemeral: true });
  }

  if (req.method === "POST") {
    const body = req.body || {};
    const { id, moods, summary, audioMoodTag } = body;
    if (id == null) return res.status(400).json({ error: "id is required" });
    if (!songs.some((x) => String(x.id) === String(id))) {
      return res.status(404).json({ error: "song not found" });
    }

    const entry = overlay[String(id)] ? { ...overlay[String(id)] } : {};

    if (moods && typeof moods === "object") {
      const clean = {};
      for (const [k, v] of Object.entries(moods)) {
        const key = String(k).trim().toLowerCase();
        if (!MOOD_DIMS.includes(key)) continue;
        const f = parseFloat(v);
        if (!isNaN(f) && f >= 0.05) clean[key] = Math.max(0, Math.min(1, f));
      }
      entry.moods = clean;
    }
    if (typeof summary === "string") entry.summary = summary.slice(0, 500);
    if (typeof audioMoodTag === "string") {
      entry.audioMoodTag = audioMoodTag.slice(0, 60);
    }

    await withLock("music-overlay", async () => {
      const store = (await readStore(OVERLAY, null)) || {};
      store[String(id)] = entry;
      await writeStore(OVERLAY, store);
    });
    return res.json({ ok: true, ephemeral: true });
  }

  return res.status(405).json({ error: "method not allowed" });
}
