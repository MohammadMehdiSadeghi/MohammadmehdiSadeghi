/* Shared helpers for the blog pages. */

/* Persian/Arabic script → render RTL. The site itself is LTR (English UI),
   but posts may be written in Persian, so each block decides its own
   direction instead of flipping the whole page. */
const RTL_RE = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;

export const isRTL = (text) => RTL_RE.test(String(text || ""));

/* ~200 wpm; Persian text is read a little slower */
export function readTime(post) {
  const words = String((post && (post.content || post.excerpt)) || "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
  const mins = Math.max(1, Math.round(words / (words && isRTL(post.content) ? 170 : 200)));
  return `${mins} min`;
}

export function excerptFrom(post, len = 150) {
  if (post && post.excerpt) return post.excerpt;
  const text = String((post && post.content) || "")
    .replace(/\s+/g, " ")
    .trim();
  return text.length > len ? `${text.slice(0, len).trimEnd()}…` : text;
}

/* "2026-09-17" → "17 Sep 2026" (no locale surprises across browsers) */
const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function formatDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""));
  if (!m) return String(value || "");
  const [, y, mo, d] = m;
  return `${Number(d)} ${MONTHS[Number(mo) - 1] || mo} ${y}`;
}

/* Split post content into blocks so we can render real markup instead of
   dumping one wall of text. Supports: paragraphs, "- " bullets, "1." ordered
   items, and "## " headings. */
export function parseBlocks(content) {
  const blocks = [];
  const rawChunks = String(content || "").split(/\n{2,}/);

  for (const rawChunk of rawChunks) {
    const chunk = rawChunk.trim();
    if (!chunk) continue;
    const lines = chunk.split("\n").map((l) => l.trim()).filter(Boolean);
    if (!lines.length) continue;

    let currentParagraph = [];

    const flushParagraph = () => {
      if (currentParagraph.length) {
        blocks.push({ type: "p", text: currentParagraph.join(" ") });
        currentParagraph = [];
      }
    };

    if (lines.every((l) => /^[-*•]\s+/.test(l))) {
      blocks.push({ type: "ul", items: lines.map((l) => l.replace(/^[-*•]\s+/, "")) });
      continue;
    }
    if (lines.every((l) => /^\d+[.)]\s+/.test(l))) {
      blocks.push({ type: "ol", items: lines.map((l) => l.replace(/^\d+[.)]\s+/, "")) });
      continue;
    }

    for (let i = 0; i < lines.length; i++) {
      const line = lines[i];
      if (/^#{1,4}\s+/.test(line)) {
        flushParagraph();
        blocks.push({ type: "h", text: line.replace(/^#{1,4}\s+/, "") });
      } else {
        currentParagraph.push(line);
      }
    }
    flushParagraph();
  }
  return blocks;
}
