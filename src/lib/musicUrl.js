/* Resolve a song src from music-database.json ("../assets/Music/X.mp3").
   When VITE_MUSIC_BASE is set at build time (songs hosted outside this
   deployment — they are never committed to git), the filename is resolved
   against that host. Otherwise the relative path is kept, which works on
   dev and on the self-hosted server that serves /assets/Music directly. */

const RAW_BASE = import.meta.env.VITE_MUSIC_BASE || "";

export function musicUrl(src) {
  if (!src) return src;
  if (RAW_BASE) {
    const file = String(src).split("/").pop() || "";
    return `${RAW_BASE.replace(/\/+$/, "")}/${encodeURIComponent(file)}`;
  }
  return String(src).replace(/^\.\.\//, "/");
}
