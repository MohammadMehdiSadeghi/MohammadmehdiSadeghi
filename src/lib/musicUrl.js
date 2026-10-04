/* Resolve a song src to /assets/Music/<filename> with proper URI encoding */
const RAW_BASE = (typeof import.meta !== "undefined" && import.meta.env?.VITE_MUSIC_BASE) || "";

export function musicUrl(src) {
  if (!src) return src;
  const filename = decodeURIComponent(String(src).split("/").pop() || "");
  if (RAW_BASE) {
    return `${RAW_BASE.replace(/\/+$/, "")}/${encodeURIComponent(filename)}`;
  }
  return `/assets/Music/${encodeURIComponent(filename)}`;
}
