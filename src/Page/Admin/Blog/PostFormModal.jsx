import React, { useRef, useState } from "react";
import { compressImage, fmtBytes } from "../../../lib/imageCompress";
import { parseBlocks, blocksToMarkdown } from "../../../lib/blog";

const inputClass =
  "bg-[#020618] py-2.5 px-3 border-0 outline-[#314158] outline-1 hover:outline-[#90A1B9] focus:outline-[#615FFF] duration-150 rounded-md w-full text-[#90a1b9c7] text-[12px]";

const todayISO = () => new Date().toISOString().slice(0, 10);

export default function PostFormModal({ mode, post, busy, onClose, onSave, authFetch }) {
  const [title, setTitle] = useState(post?.title || "");
  const excerpt = post?.excerpt || "";
  const [tagsText, setTagsText] = useState((post?.tags || []).join(", "));
  const [date, setDate] = useState(post?.date || todayISO());
  const slug = post?.slug || "";
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

  // ── Visual Block Builder State ──
  const [editorTab, setEditorTab] = useState("builder"); // "builder" | "markdown"
  const [blocks, setBlocks] = useState(() => {
    const initial = parseBlocks(post?.content || "");
    if (initial.length === 0) {
      return [{ id: "b-1", type: "p", text: "" }];
    }
    return initial.map((b, idx) => ({ ...b, id: b.id || `b-${Date.now()}-${idx}` }));
  });
  const [rawMarkdown, setRawMarkdown] = useState(() => post?.content || "");

  // Sync builder to markdown
  const syncToMarkdown = (newBlocks) => {
    setBlocks(newBlocks);
    setRawMarkdown(blocksToMarkdown(newBlocks));
  };

  // Switch between visual builder & raw markdown
  const handleTabSwitch = (newTab) => {
    if (newTab === "builder" && editorTab === "markdown") {
      const parsed = parseBlocks(rawMarkdown);
      setBlocks(parsed.map((b, idx) => ({ ...b, id: `b-${Date.now()}-${idx}` })));
    } else if (newTab === "markdown" && editorTab === "builder") {
      setRawMarkdown(blocksToMarkdown(blocks));
    }
    setEditorTab(newTab);
  };

  const previewSrc = coverUrlInput.trim() || cover;

  // Cover image upload
  const handlePickCoverImage = async (file) => {
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
        `uploaded${width ? ` · ${width}×${height}` : ""} · ${fmtBytes(bytes)}`,
      );
    } catch (err) {
      setError(err.message || "image upload failed");
    } finally {
      setCompressing(false);
      setUploading(false);
    }
  };

  // Inline block image upload
  const handlePickBlockImage = async (file, blockIndex) => {
    if (!file) return;
    setError("");
    setUploading(true);
    try {
      const { dataUrl } = await compressImage(file);
      const res = await authFetch("/api/admin/blog-upload", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ dataUrl }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "upload failed");
      updateBlock(blockIndex, { url: json.url });
    } catch (err) {
      setError(err.message || "Block image upload failed");
    } finally {
      setUploading(false);
    }
  };

  // Block Manipulation Functions
  const addBlock = (type) => {
    let newBlock = { id: `b-${Date.now()}`, type, text: "" };
    if (type === "img") {
      newBlock = { id: `b-${Date.now()}`, type: "img", url: "", alt: "", caption: "" };
    } else if (type === "ul") {
      newBlock = { id: `b-${Date.now()}`, type: "ul", items: [""] };
    }
    syncToMarkdown([...blocks, newBlock]);
  };

  const updateBlock = (index, updates) => {
    const updated = [...blocks];
    updated[index] = { ...updated[index], ...updates };
    syncToMarkdown(updated);
  };

  const removeBlock = (index) => {
    const updated = blocks.filter((_, i) => i !== index);
    syncToMarkdown(updated.length ? updated : [{ id: `b-${Date.now()}`, type: "p", text: "" }]);
  };

  const moveBlock = (index, dir) => {
    const targetIdx = index + dir;
    if (targetIdx < 0 || targetIdx >= blocks.length) return;
    const updated = [...blocks];
    const temp = updated[index];
    updated[index] = updated[targetIdx];
    updated[targetIdx] = temp;
    syncToMarkdown(updated);
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
    const finalCover = coverUrlInput.trim() || cover;
    const finalContent = editorTab === "builder" ? blocksToMarkdown(blocks) : rawMarkdown;

    try {
      await onSave(
        {
          title,
          slug,
          excerpt,
          content: finalContent,
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
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/70 backdrop-blur-sm p-3 sm:p-6">
      <div className="w-full max-w-5xl xl:max-w-6xl rounded-xl border border-[#1E293B] bg-[#0F172B] overflow-hidden max-h-[95vh] flex flex-col shadow-2xl">
        {/* Header */}
        <div className="h-11 shrink-0 flex items-center justify-between px-5 bg-[#0b1220] border-b border-[#1E293B]">
          <p className="text-[12px] font-mono text-white flex items-center gap-2">
            <span className="text-[#615FFF]">●</span>
            {mode === "edit" ? "Edit Post" : "Create New Post"}
          </p>
          <button
            onClick={onClose}
            className="text-[#68768C] hover:text-white text-[16px] w-7 h-7 flex items-center justify-center rounded hover:bg-[#1E293B] duration-150"
          >
            ×
          </button>
        </div>

        <form onSubmit={handleSubmit} className="p-5 sm:p-6 flex flex-col gap-5 overflow-y-auto">
          {/* Title */}
          <label className="flex flex-col gap-1.5">
            <p className="text-[#90A1B9] text-[12px] font-semibold">_Post Title *</p>
            <input
              type="text"
              required
              placeholder="e.g. Master React 19 Architecture"
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              className={inputClass}
            />
          </label>

          {/* ── Main Cover Image ── */}
          <div className="flex flex-col gap-2 rounded-lg border border-[#1E293B] bg-[#0b1220] p-4">
            <p className="text-[#90A1B9] text-[12px] font-semibold">_Main Cover Image</p>

            {previewSrc ? (
              <div className="relative w-full h-[150px] rounded-lg overflow-hidden border border-[#1E293B] bg-[#020618]">
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
                  className="absolute top-2 right-2 text-[11px] px-2.5 py-1 rounded border border-[#FF6B6B44] text-[#FF6B6B] bg-[#0F172Bcc] hover:border-[#FF6B6B] duration-150"
                >
                  Remove Cover
                </button>
              </div>
            ) : (
              <div className="w-full h-[80px] rounded-lg border border-dashed border-[#1E293B] flex items-center justify-center text-[12px] text-[#4B576D]">
                // No cover image uploaded
              </div>
            )}

            <div className="flex gap-2 flex-col sm:flex-row items-center">
              <input
                ref={fileRef}
                type="file"
                accept="image/png,image/jpeg,image/webp,image/gif"
                onChange={(e) => handlePickCoverImage(e.target.files?.[0])}
                className="bg-[#020618] py-2 px-3 border border-[#1E293B] rounded-md w-full sm:w-1/2 text-[#90a1b9c7] text-[11px] file:mr-2 file:py-1 file:px-2 file:rounded file:border-0 file:bg-[#615FFF33] file:text-white file:text-[11px] file:cursor-pointer"
              />
              <input
                type="text"
                placeholder="Or paste image URL (https://...)"
                value={coverUrlInput}
                onChange={(e) => setCoverUrlInput(e.target.value)}
                className="bg-[#020618] py-2 px-3 border border-[#1E293B] rounded-md w-full sm:w-1/2 text-[#90a1b9c7] text-[11px] outline-none focus:border-[#615FFF]"
              />
            </div>

            <input
              type="text"
              placeholder="Cover Alt Text (e.g. Illustration of React components)"
              value={coverAlt}
              onChange={(e) => setCoverAlt(e.target.value)}
              className="bg-[#020618] py-2 px-3 border border-[#1E293B] rounded-md w-full text-[#90a1b9c7] text-[11px] outline-none focus:border-[#615FFF]"
            />
            {imgNote && (
              <p className="text-[11px] font-mono text-[#00D5BE] mt-0.5">{imgNote}</p>
            )}
          </div>

          {/* ── Visual Block Content Builder ── */}
          <div className="flex flex-col gap-3 rounded-lg border border-[#1E293B] bg-[#0b1220] p-4">
            <div className="flex items-center justify-between flex-wrap gap-2 border-b border-[#1E293B] pb-3">
              <div>
                <p className="text-white text-[13px] font-semibold flex items-center gap-2">
                  Post Content &amp; In-Text Media
                </p>
                <p className="text-[11px] text-[#68768C]">
                  Insert text, headings, and images anywhere in the article
                </p>
              </div>

              {/* Mode switch */}
              <div className="flex items-center gap-1 bg-[#020618] p-1 rounded-md border border-[#1E293B]">
                <button
                  type="button"
                  onClick={() => handleTabSwitch("builder")}
                  className={`text-[11px] px-2.5 py-1 rounded duration-150 ${
                    editorTab === "builder"
                      ? "bg-[#615FFF] text-white"
                      : "text-[#90A1B9] hover:text-white"
                  }`}
                >
                  Visual Builder
                </button>
                <button
                  type="button"
                  onClick={() => handleTabSwitch("markdown")}
                  className={`text-[11px] px-2.5 py-1 rounded duration-150 ${
                    editorTab === "markdown"
                      ? "bg-[#615FFF] text-white"
                      : "text-[#90A1B9] hover:text-white"
                  }`}
                >
                  Raw Markdown
                </button>
              </div>
            </div>

            {editorTab === "builder" ? (
              <div className="flex flex-col gap-3">
                {/* Block List */}
                {blocks.map((block, idx) => (
                  <div
                    key={block.id || idx}
                    className="p-3.5 rounded-lg border border-[#314158] bg-[#020618] flex flex-col gap-2.5 relative group"
                  >
                    {/* Block Toolbar */}
                    <div className="flex items-center justify-between border-b border-[#1E293B] pb-2">
                      <span className="text-[10px] font-mono uppercase tracking-wider px-2 py-0.5 rounded bg-[#1E293B] text-[#90A1B9]">
                        {block.type === "h"
                          ? "Heading (##)"
                          : block.type === "img"
                          ? "In-Text Image"
                          : block.type === "quote"
                          ? "Quote / Callout"
                          : block.type === "ul"
                          ? "Bullet List"
                          : "Paragraph"}
                      </span>
                      <div className="flex items-center gap-1">
                        <button
                          type="button"
                          disabled={idx === 0}
                          onClick={() => moveBlock(idx, -1)}
                          className="p-1 text-[11px] text-[#90A1B9] hover:text-white disabled:opacity-30"
                          title="Move Up"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M5 15l7-7 7 7" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          disabled={idx === blocks.length - 1}
                          onClick={() => moveBlock(idx, 1)}
                          className="p-1 text-[11px] text-[#90A1B9] hover:text-white disabled:opacity-30"
                          title="Move Down"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M19 9l-7 7-7-7" />
                          </svg>
                        </button>
                        <button
                          type="button"
                          onClick={() => removeBlock(idx)}
                          className="p-1 text-[12px] text-[#FF6B6B] hover:text-red-400 ml-1"
                          title="Delete Block"
                        >
                          <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                            <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                          </svg>
                        </button>
                      </div>
                    </div>

                    {/* Block Input based on Type */}
                    {block.type === "h" ? (
                      <input
                        type="text"
                        placeholder="Section Heading..."
                        value={block.text || ""}
                        onChange={(e) => updateBlock(idx, { text: e.target.value })}
                        className="bg-[#0B1222] py-2 px-3 border border-[#314158] rounded text-white text-[13px] font-bold outline-none focus:border-[#615FFF]"
                      />
                    ) : block.type === "img" ? (
                      <div className="flex flex-col gap-2 p-2 rounded bg-[#0B1222] border border-[#1E293B]">
                        {block.url ? (
                          <div className="relative w-full h-36 rounded overflow-hidden bg-[#030712] border border-[#314158]">
                            <img
                              src={block.url}
                              alt={block.alt || "preview"}
                              className="w-full h-full object-cover"
                            />
                            <button
                              type="button"
                              onClick={() => updateBlock(idx, { url: "" })}
                              className="absolute top-2 right-2 text-[10px] px-2 py-0.5 rounded bg-red-900/80 text-white"
                            >
                              Change Image
                            </button>
                          </div>
                        ) : (
                          <div className="flex gap-2 flex-col sm:flex-row items-center">
                            <input
                              type="file"
                              accept="image/*"
                              onChange={(e) =>
                                handlePickBlockImage(e.target.files?.[0], idx)
                              }
                              className="bg-[#020618] py-1.5 px-2 border border-[#314158] rounded text-[11px] text-[#90A1B9] w-full sm:w-1/2 file:mr-2 file:py-0.5 file:px-2 file:rounded file:border-0 file:bg-[#615FFF] file:text-white file:text-[10px] file:cursor-pointer"
                            />
                            <input
                              type="text"
                              placeholder="Or Image URL (https://...)"
                              value={block.url || ""}
                              onChange={(e) =>
                                updateBlock(idx, { url: e.target.value })
                              }
                              className="bg-[#020618] py-1.5 px-2 border border-[#314158] rounded text-[11px] text-white w-full sm:w-1/2 outline-none focus:border-[#615FFF]"
                            />
                          </div>
                        )}

                        <div className="flex gap-2 flex-col sm:flex-row">
                          <input
                            type="text"
                            placeholder="Image Alt Text (SEO & Accessibility) *"
                            value={block.alt || ""}
                            onChange={(e) =>
                              updateBlock(idx, { alt: e.target.value })
                            }
                            className="bg-[#020618] py-1.5 px-2.5 border border-[#314158] rounded text-[11px] text-white flex-1 outline-none focus:border-[#615FFF]"
                          />
                          <input
                            type="text"
                            placeholder="Optional Caption / Description"
                            value={block.caption || ""}
                            onChange={(e) =>
                              updateBlock(idx, { caption: e.target.value })
                            }
                            className="bg-[#020618] py-1.5 px-2.5 border border-[#314158] rounded text-[11px] text-white flex-1 outline-none focus:border-[#615FFF]"
                          />
                        </div>
                      </div>
                    ) : block.type === "quote" ? (
                      <textarea
                        rows={2}
                        placeholder="Quote text..."
                        value={block.text || ""}
                        onChange={(e) => updateBlock(idx, { text: e.target.value })}
                        className="bg-[#0B1222] py-2 px-3 border border-[#314158] rounded text-[#00D5BE] text-[12px] italic outline-none focus:border-[#615FFF] resize-none"
                      />
                    ) : block.type === "ul" ? (
                      <div className="flex flex-col gap-1.5">
                        {(block.items || []).map((it, itemIdx) => (
                          <div key={itemIdx} className="flex items-center gap-2">
                            <span className="text-[#615FFF] text-[12px]">▸</span>
                            <input
                              type="text"
                              placeholder={`List item ${itemIdx + 1}`}
                              value={it}
                              onChange={(e) => {
                                const newItems = [...(block.items || [])];
                                newItems[itemIdx] = e.target.value;
                                updateBlock(idx, { items: newItems });
                              }}
                              className="bg-[#0B1222] py-1 px-2 border border-[#314158] rounded text-white text-[12px] flex-1 outline-none focus:border-[#615FFF]"
                            />
                            <button
                              type="button"
                              onClick={() => {
                                const newItems = block.items.filter((_, i) => i !== itemIdx);
                                updateBlock(idx, { items: newItems.length ? newItems : [""] });
                              }}
                              className="text-[11px] text-[#68768C] hover:text-[#FF6B6B] p-0.5"
                            >
                              <svg className="w-3 h-3" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                                <path strokeLinecap="round" strokeLinejoin="round" d="M6 18L18 6M6 6l12 12" />
                              </svg>
                            </button>
                          </div>
                        ))}
                        <button
                          type="button"
                          onClick={() =>
                            updateBlock(idx, { items: [...(block.items || []), ""] })
                          }
                          className="text-[11px] text-[#615FFF] hover:underline self-start mt-1"
                        >
                          + Add Item
                        </button>
                      </div>
                    ) : (
                      <textarea
                        rows={3}
                        placeholder="Write paragraph text here..."
                        value={block.text || ""}
                        onChange={(e) => updateBlock(idx, { text: e.target.value })}
                        className="bg-[#0B1222] py-2 px-3 border border-[#314158] rounded text-[#CBD5E1] text-[12px] leading-relaxed outline-none focus:border-[#615FFF]"
                      />
                    )}
                  </div>
                ))}

                {/* Add Block Toolbar */}
                <div className="flex items-center gap-2 flex-wrap pt-2 border-t border-[#1E293B]">
                  <span className="text-[11px] text-[#68768C] mr-1">+ Insert:</span>
                  <button
                    type="button"
                    onClick={() => addBlock("p")}
                    className="text-[11px] px-2.5 py-1.5 rounded bg-[#1E293B] text-[#90A1B9] hover:text-white hover:bg-[#314158] duration-150"
                  >
                    + Paragraph
                  </button>
                  <button
                    type="button"
                    onClick={() => addBlock("h")}
                    className="text-[11px] px-2.5 py-1.5 rounded bg-[#1E293B] text-[#90A1B9] hover:text-white hover:bg-[#314158] duration-150"
                  >
                    + Heading
                  </button>
                  <button
                    type="button"
                    onClick={() => addBlock("img")}
                    className="text-[11px] px-2.5 py-1.5 rounded bg-[#615FFF]/20 border border-[#615FFF]/50 text-white hover:bg-[#615FFF] duration-150 font-semibold"
                  >
                    + Image (with Alt)
                  </button>
                  <button
                    type="button"
                    onClick={() => addBlock("ul")}
                    className="text-[11px] px-2.5 py-1.5 rounded bg-[#1E293B] text-[#90A1B9] hover:text-white hover:bg-[#314158] duration-150"
                  >
                    + Bullet List
                  </button>
                  <button
                    type="button"
                    onClick={() => addBlock("quote")}
                    className="text-[11px] px-2.5 py-1.5 rounded bg-[#1E293B] text-[#90A1B9] hover:text-white hover:bg-[#314158] duration-150"
                  >
                    + Quote
                  </button>
                </div>
              </div>
            ) : (
              <textarea
                rows={18}
                value={rawMarkdown}
                onChange={(e) => setRawMarkdown(e.target.value)}
                placeholder="Write markdown here..."
                className="bg-[#020618] py-3 px-4 border border-[#314158] rounded-md font-mono text-[13px] text-white leading-relaxed outline-none focus:border-[#615FFF] min-h-[380px] resize-y"
              />
            )}
          </div>

          {/* Meta & Tags */}
          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            <label className="flex flex-col gap-1.5">
              <p className="text-[#90A1B9] text-[12px]">_Tags (comma-separated)</p>
              <input
                type="text"
                placeholder="React, Frontend, Web"
                value={tagsText}
                onChange={(e) => setTagsText(e.target.value)}
                className={inputClass}
              />
            </label>

            <label className="flex flex-col gap-1.5">
              <p className="text-[#90A1B9] text-[12px]">_Publish Date</p>
              <input
                type="date"
                value={date}
                onChange={(e) => setDate(e.target.value)}
                className={inputClass}
              />
            </label>
          </div>

          {/* Published Checkbox */}
          <label className="flex items-center gap-2.5 cursor-pointer select-none">
            <input
              type="checkbox"
              checked={published}
              onChange={(e) => setPublished(e.target.checked)}
              className="w-4 h-4 rounded accent-[#615FFF]"
            />
            <span className="text-[12px] text-white">Publish this article immediately</span>
          </label>

          {error && (
            <p className="text-[12px] text-[#FF6B6B] bg-[#FF6B6B14] border border-[#FF6B6B33] rounded px-3 py-2">
              // {error}
            </p>
          )}

          {/* Submit Buttons */}
          <div className="flex items-center justify-end gap-3 pt-3 border-t border-[#1E293B]">
            <button
              type="button"
              onClick={onClose}
              className="px-4 py-2 rounded-md text-[12px] text-[#90A1B9] hover:text-white duration-150"
            >
              Cancel
            </button>
            <button
              type="submit"
              disabled={busyNow}
              className="px-6 py-2 rounded-md text-[12px] font-semibold bg-[#615FFF] hover:bg-[#4F46E5] text-white duration-150 disabled:opacity-50"
            >
              {busyNow ? "Saving..." : mode === "edit" ? "Save Changes" : "Create Post"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
