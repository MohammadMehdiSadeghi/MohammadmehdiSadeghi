
const RTL_RE = /[\u0600-\u06FF\u0750-\u077F\uFB50-\uFDFF\uFE70-\uFEFF]/;

export const isRTL = (text) => RTL_RE.test(String(text || ""));

export function countWords(content) {
  let text = "";
  if (typeof content === "string") {
    text = content;
  } else if (Array.isArray(content)) {
    text = content.map((b) => b.text || (b.items || []).join(" ")).join(" ");
  }
  return String(text || "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/^#{1,4}\s+/gm, "")
    .trim()
    .split(/\s+/)
    .filter(Boolean).length;
}

export function readTime(post) {
  const listed = Number(post?.words);
  const words =
    Number.isFinite(listed) && listed > 0
      ? listed
      : countWords(post?.content || post?.excerpt || "");
  const sample =
    typeof post?.content === "string" ? post.content : post?.excerpt || "";
  return `${Math.max(1, Math.round(words / (isRTL(sample) ? 170 : 200)))} min read`;
}

export function excerptFrom(post, len = 150) {
  if (post && post.excerpt) return post.excerpt;
  let text = "";
  if (post && post.content) {
    if (typeof post.content === "string") {
      text = post.content;
    } else if (Array.isArray(post.content)) {
      const firstText = post.content.find((b) => b.type === "p" || b.type === "h");
      text = firstText ? firstText.text : "";
    }
  }
  const clean = String(text || "")
    .replace(/!\[.*?\]\(.*?\)/g, "")
    .replace(/^#+\s+/gm, "")
    .replace(/\s+/g, " ")
    .trim();
  return clean.length > len ? `${clean.slice(0, len).trimEnd()}…` : clean;
}

const MONTHS = ["Jan", "Feb", "Mar", "Apr", "May", "Jun", "Jul", "Aug", "Sep", "Oct", "Nov", "Dec"];
export function formatDate(value) {
  const m = /^(\d{4})-(\d{2})-(\d{2})/.exec(String(value || ""));
  if (!m) return String(value || "");
  const [, y, mo, d] = m;
  return `${Number(d)} ${MONTHS[Number(mo) - 1] || mo} ${y}`;
}

export function parseBlocks(content) {
  if (Array.isArray(content)) return content;
  if (!content) return [];

  if (typeof content === "string" && content.trim().startsWith("[") && content.trim().endsWith("]")) {
    try {
      const parsed = JSON.parse(content);
      if (Array.isArray(parsed)) return parsed;
    } catch {
    }
  }

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

      const imgMatch = /^!\[(.*?)\]\((.*?)(?:\s+"(.*?)")?\)$/.exec(line);
      if (imgMatch) {
        flushParagraph();
        blocks.push({
          type: "img",
          alt: imgMatch[1] || "",
          url: imgMatch[2] || "",
          caption: imgMatch[3] || "",
        });
        continue;
      }

      if (/^#{1,4}\s+/.test(line)) {
        flushParagraph();
        blocks.push({ type: "h", text: line.replace(/^#{1,4}\s+/, "") });
        continue;
      }

      if (/^>\s+/.test(line)) {
        flushParagraph();
        blocks.push({ type: "quote", text: line.replace(/^>\s+/, "") });
        continue;
      }

      currentParagraph.push(line);
    }
    flushParagraph();
  }
  return blocks;
}

export function blocksToMarkdown(blocks) {
  if (!Array.isArray(blocks)) return String(blocks || "");
  return blocks
    .map((b) => {
      if (b.type === "h") return `## ${b.text}`;
      if (b.type === "img") {
        return b.caption
          ? `![${b.alt || ""}](${b.url} "${b.caption}")`
          : `![${b.alt || ""}](${b.url})`;
      }
      if (b.type === "ul") {
        return (b.items || []).map((it) => `- ${it}`).join("\n");
      }
      if (b.type === "ol") {
        return (b.items || []).map((it, idx) => `${idx + 1}. ${it}`).join("\n");
      }
      if (b.type === "quote") {
        return `> ${b.text}`;
      }
      return b.text || "";
    })
    .filter(Boolean)
    .join("\n\n");
}
