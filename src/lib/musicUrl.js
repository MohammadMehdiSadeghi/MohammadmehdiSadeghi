
const RAW_BASE = (typeof import.meta !== "undefined" && import.meta.env?.VITE_MUSIC_BASE) || "";

export function musicUrl(src) {
  if (!src) return src;
  if (String(src).startsWith("http://") || String(src).startsWith("https://")) {
    return src;
  }
  if (RAW_BASE) {
    const file = String(src).split("/").pop() || "";
    return `${RAW_BASE.replace(/\/+$/, "")}/${encodeURIComponent(file)}`;
  }
  return String(src).replace(/^\.\.\//, "/");
}
