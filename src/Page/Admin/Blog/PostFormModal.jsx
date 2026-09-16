import { useRef, useState } from "react";
import { compressImage, fmtBytes } from "../../../lib/imageCompress";

const inputClass =
  "bg-[#020618] py-2.5 px-3 border-0 outline-[#314158] outline-1 hover:outline-[#90A1B9] focus:text-[#90A1B9] duration-150 rounded-md w-full text-[#90a1b9c7]";

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function PostFormModal({ mode, post, busy, onClose, onSave, authFetch }) {
  const [title, setTitle] = useState(post?.title || "");
  const [excerpt, setExcerpt] = useState(post?.excerpt || "");
  const [content, setContent] = useState(post?.content || "");
  const [tagsText, setTagsText] = useState((post?.tags || []).join(", "));
  const [date, setDate] = useState(post?.date || todayISO());
  const [slug, setSlug] = useState(post?.slug || "");
  const [published, setPublished] = useState(post?.published !== false);

  const [cover, setCover] = useState(post?.cover || "");
  const [coverAlt, setCoverAlt] = useState(post?.coverAlt || "");
  const [coverUrlInput, setCoverUrlInput] = useState(
    post?.cover && !String(post.cover).startsWith("/api/blog-image") ? post.cover : "",
  );
  const [compressing, setCompressing] = useState(false);
  const [imgNote, setImgNote] = useState("");

  const [error, setError] = useState("");
  const [uploading, setUploading] = useState(false);
  const fileRef = useRef(null);

  const previewSrc = coverUrlInput.trim() || cover;

  const handlePickImage = async (file) => {
    if (!file) return;
    setError("");
    setImgNote("");
    setCompressing(true);
    try {
      const { dataUrl, bytes, width, height } = await compressImage(file);
      setUploading(true);
      const res = await authFetch("/api/admin/blog-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "upload failed");
      setCover(json.url);
      setCoverUrlInput("");
      setImgNote(
        `✓ uploaded${width ? ` · ${width}×${height}` : ""} · ${fmtBytes(bytes)} (compressed in the browser)`,
      );
    } catch (err) {
      setError(err.message || "image upload failed");
    } finally {
      setCompressing(false);
      setUploading(false);
    }
  };

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!title.trim()) {
      setError("Title is required");
      return;
    }
    const tags = tagsText
      .split(",")
      .map((t) => t.trim())
      .filter(Boolean);
    /* an alt text is what makes the cover accessible — warn, don't block */
    const finalCover = coverUrlInput.trim() || cover;

    try {
      await onSave(
        {
          title,
          slug,
          excerpt,
          content,
          cover: finalCover,
          coverAlt,
          tags,
          date,
          published,
        },
        mode,
        post?.id,
      );
    } catch (err) {
      setError(err.message || "Save failed");
    }
  };

  const busyNow = busy || uploading || compressing;

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-2xl rounded-lg border border-[#1E293B] bg-[#0F172B] overflow-hidden max-h-[92vh] flex flex-col">
        <div className="h-10 shrink-0 flex items-center justify-between px-4 bg-[#0b1220] border-b border-[#1E293B]">
          <p className="text-[11px] text-[#68768C]">
            {mode === "edit" ? "edit-post.md" : "new-post.md"}
          </p>
          <button
            onClick={onClose}
            className="text-[#68768C] hover:text-white text-[13px] w-6 h-6 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 flex flex-col gap-4 overflow-y-auto">
          {/* ── cover image ── */}
          <div className="flex flex-col gap-2 rounded-md border border-[#1E293B] bg-[#0b1220] p-3">
            <p className="text-[#90A1B9] text-[12px]">_cover-image</p>

            {previewSrc ? (
              <div className="relative w-full h-[150px] rounded-md overflow-hidden border border-[#1E293B] bg-[#020618]">
                <img
                  src={previewSrc}
                  alt={coverAlt || "cover preview"}
                  className="w-full h-full object-cover"
                />
                <button
                  type="button"
                  onClick={() => {
                    if (coverUrlInput.trim()) setCoverUrlInput("");
                    else setCover("");
                    setImgNote("");
                  }}
                  className="absolute top-2 right-2 text-[10px] px-2 py-1 rounded border border-[#FF6B6B44] text-[#FF6B6B] bg-[#0F172Bcc] hover:border-[#FF6B6B] duration-150"
                >
                  remove
                </button>
              </div>
            ) : (
              <div className="w-full h-[90px] rounded-md border border-dashed border-[#1E293B] flex items-center justify-center text-[11px] text-[#4B576D]">
                // no cover — a typographic card is generated from the title
              </div>
            )}

            <input
              ref={fileRef}
              type="file"
              accept="image/png,image/jpeg,image/webp,image/gif,image/avif"
              onChange={(e) => handlePickImage(e.target.files?.[0])}
              className="bg-[#020618] py-2 px-3 outline-[#314158] outline-1 hover:outline-[#90A1B9] duration-150 rounded-md w-full text-[#90a1b9c7] text-[11px] file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:bg-[#615FFF33] file:text-[#90A1B9] file:text-[11px] file:cursor-pointer"
            />
            <p className="text-[10px] text-[#4B576D]">
              // resized to max 1600px and compressed in your browser before upload — a 5MB
              photo lands around 200–500KB
            </p>
            <label className="flex flex-col gap-1.5">
              <p className="text-[#90A1B9] text-[11px]">_alt-text (for accessibility &amp; SEO)</p>
              <input
                className={`${inputClass} text-[12px]`}
                value={coverAlt}
                onChange={(e) => setCoverAlt(e.target.value)}
                placeholder="Describe the image, e.g. “a laptop showing the dashboard”"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <p className="text-[#90A1B9] text-[11px]">_or-image-url (external)</p>
              <input
                className={`${inputClass} text-[12px]`}
                value={coverUrlInput}
                onChange={(e) => setCoverUrlInput(e.target.value)}
                placeholder="https://images.example.com/photo.jpg"
              />
            </label>

            {compressing && <p className="text-[11px] text-[#FFB86A]">_compressing…</p>}
            {imgNote && <p className="text-[11px] text-[#3ECF8E]">{imgNote}</p>}
          </div>

          <label className="flex flex-col gap-1.5">
            <p className="text-[#90A1B9] text-[12px]">_title</p>
            <input
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="How I fixed the routing bug"
              required
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <p className="text-[#90A1B9] text-[12px]">_slug (optional — auto from the title)</p>
            <input
              className={inputClass}
              value={slug}
              onChange={(e) => setSlug(e.target.value)}
              placeholder="how-i-fixed-the-routing-bug"
            />
            <p className="text-[10px] text-[#4B576D]">// the post URL: /blog/&lt;slug&gt;</p>
          </label>

          <label className="flex flex-col gap-1.5">
            <p className="text-[#90A1B9] text-[12px]">_excerpt (shown on the card)</p>
            <textarea
              className={`${inputClass} h-16 resize-none`}
              value={excerpt}
              onChange={(e) => setExcerpt(e.target.value)}
              placeholder="One or two lines summarising the post"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <p className="text-[#90A1B9] text-[12px]">_content (markdown-ish)</p>
            <textarea
              className={`${inputClass} h-56 resize-y font-mono text-[12px] leading-6`}
              value={content}
              onChange={(e) => setContent(e.target.value)}
              placeholder={"## a heading\n\nA paragraph.\n\n- a bullet\n- another bullet\n\nSecond paragraph."}
            />
            <p className="text-[10px] text-[#4B576D]">
              // blank line = new paragraph · «- » = bullet · «1. » = numbered · «## » =
              heading · right-to-left text is aligned automatically
            </p>
          </label>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <p className="text-[#90A1B9] text-[12px]">_tags (comma separated)</p>
              <input
                className={inputClass}
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                placeholder="React, Vercel"
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <p className="text-[#90A1B9] text-[12px]">_date</p>
              <input
                type="date"
                className={inputClass}
                value={date}
                onChange={(e) => setDate(e.target.value)}
              />
            </label>
          </div>

          <label className="flex items-center gap-3 cursor-pointer w-fit">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="w-4 h-4 accent-[#615FFF]"
            />
            <span className="text-[12px] text-[#90A1B9]">
              publish it {published ? "" : "(saved as a draft — hidden from the site)"}
            </span>
          </label>

          {error && (
            <p className="text-[11px] text-[#FF6B6B] bg-[#FF6B6B14] border border-[#FF6B6B33] rounded-md px-3 py-2">
              // {error}
            </p>
          )}

          <div className="flex gap-3 pt-1">
            <button
              type="button"
              onClick={onClose}
              className="flex-1 text-[12px] py-2.5 rounded-md border border-[#314158] text-[#90A1B9] hover:border-[#90A1B9] hover:text-white duration-150"
            >
              cancel
            </button>
            <button
              type="submit"
              disabled={busyNow}
              className="flex-1 text-[12px] py-2.5 rounded-md cursor-pointer duration-150 bg-[#90A1B9] hover:bg-[#0E1528] outline-1 outline-[#90A1B9] text-[#0E1528] hover:text-[#90A1B9] disabled:opacity-50"
            >
              {compressing ? "compressing…" : uploading ? "uploading…" : busy ? "saving…" : "save()"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
