import { useRef, useState } from "react";

const SOURCES = [
  { key: "none", label: "showcase only" },
  { key: "link", label: "live link" },
  { key: "upload", label: "upload dist.zip" },
];

export default function ProjectFormModal({ mode, project, busy, onClose, onSave, authFetch, projectType }) {
  const [title, setTitle] = useState(project?.title || "");
  const [description, setDescription] = useState(project?.description || "");
  const [url, setUrl] = useState(project?.url || "");
  const [githubUrl, setGithubUrl] = useState(project?.githubUrl || "");
  const [categoryText, setCategoryText] = useState(
    (project?.category || []).join(", "),
  );
  const [error, setError] = useState("");
  const [source, setSource] = useState(() => {
    if (project?.url && String(project.url).startsWith("/Projects/")) return "upload";
    if (project?.url && String(project.url).startsWith("http")) return "link";
    return "none";
  });
  const [archive, setArchive] = useState(null);
  const [uploading, setUploading] = useState(false);
  const [uploadNote, setUploadNote] = useState("");
  const fileRef = useRef(null);

  const inputClass =
    "bg-[#020618] py-2.5 px-3 border-0 outline-[#314158] outline-1 hover:outline-[#90A1B9] focus:text-[#90A1B9] duration-150 rounded-md w-full text-[#90a1b9c7]";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    setUploadNote("");
    if (!title.trim()) {
      setError("Project title is required");
      return;
    }
    if (source === "link" && !url.trim()) {
      setError("Enter the project URL (or switch source)");
      return;
    }
    // create with upload → zip required; edit with upload → optional redeploy
    if (source === "upload" && mode === "create" && !archive) {
      setError("Choose a .zip of your built dist folder");
      return;
    }
    const category = categoryText
      .split(",")
      .map((c) => c.trim())
      .filter(Boolean);

    try {
      let finalUrl = url.trim();
      if (source === "upload" && archive) {
        setUploading(true);
        const fd = new FormData();
        fd.append("archive", archive);
        fd.append("title", title);
        fd.append("type", projectType || "web");
        if (githubUrl.trim()) fd.append("githubUrl", githubUrl);
        const up = await authFetch("/api/admin/upload-project", {
          method: "POST",
          body: fd,
        });
        const upJson = await up.json().catch(() => ({}));
        if (!up.ok) throw new Error(upJson.error || "upload failed");
        finalUrl = upJson.url;
        setUrl(finalUrl);
        setUploadNote(
          `deployed → ${finalUrl} (${upJson.files} files) · archive auto-deleted`,
        );
      }
      if (source === "none") finalUrl = "";
      await onSave(
        { title, description, url: finalUrl, image: "", githubUrl, category },
        mode,
        project?.id,
      );
    } catch (err) {
      setError(err.message || "Save failed");
    } finally {
      setUploading(false);
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 p-4">
      <div className="w-full max-w-2xl rounded-lg border border-[#1E293B] bg-[#0F172B] overflow-hidden max-h-[92vh] flex flex-col shadow-2xl">
        <div className="h-10 shrink-0 flex items-center justify-between px-4 bg-[#0b1220] border-b border-[#1E293B]">
          <p className="text-[11px] text-[#68768C]">
            {mode === "edit" ? "edit-project.json" : "new-project.json"}
          </p>
          <button
            onClick={onClose}
            className="text-[#68768C] hover:text-white text-[13px] w-6 h-6 flex items-center justify-center"
          >
            ×
          </button>
        </div>

        <form
          onSubmit={handleSubmit}
          className="p-5 sm:p-6 flex flex-col gap-4 overflow-y-auto"
        >
          <label className="flex flex-col gap-1.5">
            <p className="text-[#90A1B9] text-[12px]">_title</p>
            <input
              className={inputClass}
              value={title}
              onChange={(e) => setTitle(e.target.value)}
              placeholder="My Cool Project"
              required
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <p className="text-[#90A1B9] text-[12px]">_description</p>
            <textarea
              className={`${inputClass} h-20 resize-none`}
              value={description}
              onChange={(e) => setDescription(e.target.value)}
              placeholder="A short description of the project"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <p className="text-[#90A1B9] text-[12px]">_source</p>
            <div className="flex gap-1 rounded-md border border-[#1E293B] p-1 w-fit flex-wrap">
              {SOURCES.map((s) => (
                <button
                  type="button"
                  key={s.key}
                  onClick={() => setSource(s.key)}
                  className={`text-[11px] px-3 py-1.5 rounded duration-150 ${
                    source === s.key
                      ? "bg-[#615FFF33] text-white"
                      : "text-[#68768C] hover:text-white"
                  }`}
                >
                  {s.label}
                </button>
              ))}
            </div>
          </label>

          {source === "upload" && (
            <label className="flex flex-col gap-1.5">
              <p className="text-[#90A1B9] text-[12px]">
                _dist-archive (.zip){mode === "edit" ? " — optional, redeploys" : ""}
              </p>
              <input
                ref={fileRef}
                type="file"
                accept=".zip"
                onChange={(e) => setArchive(e.target.files?.[0] || null)}
                className="bg-[#020618] py-2 px-3 outline-[#314158] outline-1 hover:outline-[#90A1B9] duration-150 rounded-md w-full text-[#90a1b9c7] text-[11px] file:mr-3 file:py-1 file:px-2 file:rounded file:border-0 file:bg-[#615FFF33] file:text-[#90A1B9] file:text-[11px] file:cursor-pointer"
              />
              <p className="text-[10px] text-[#4B576D]">
                // auto-deployed to /Projects/…/&lt;slug&gt;/ — the zip is extracted and
                deleted automatically so it never takes up space
              </p>
            </label>
          )}

          {source === "link" && (
            <label className="flex flex-col gap-1.5">
              <p className="text-[#90A1B9] text-[12px]">_project-url</p>
              <input
                className={inputClass}
                value={url}
                onChange={(e) => setUrl(e.target.value)}
                placeholder="https://yourhost.com/projects/my-project/"
              />
            </label>
          )}

          {source === "none" && (
            <p className="text-[11px] text-[#4B576D] bg-[#020618] border border-[#1E293B] rounded-md px-3 py-2">
              // no link needed — the card preview (logotype) is generated automatically
              from the title
            </p>
          )}

          {uploadNote && (
            <p className="text-[11px] text-[#3ECF8E]">{uploadNote}</p>
          )}

          <label className="flex flex-col gap-1.5">
            <p className="text-[#90A1B9] text-[12px]">_categories (comma separated)</p>
            <input
              className={inputClass}
              value={categoryText}
              onChange={(e) => setCategoryText(e.target.value)}
              placeholder="React, Tailwind"
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <p className="text-[#90A1B9] text-[12px]">_github-url (optional)</p>
            <input
              className={inputClass}
              value={githubUrl}
              onChange={(e) => setGithubUrl(e.target.value)}
              placeholder="https://github.com/you/repo"
            />
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
              disabled={busy}
              className="flex-1 text-[12px] py-2.5 rounded-md cursor-pointer duration-150 bg-[#90A1B9] hover:bg-[#0E1528] outline-1 outline-[#90A1B9] text-[#0E1528] hover:text-[#90A1B9] disabled:opacity-50"
            >
              {uploading ? "deploying..." : busy ? "saving..." : "save()"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
