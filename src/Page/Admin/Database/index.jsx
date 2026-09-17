import { useCallback, useEffect, useRef, useState } from "react";
import { useAdminAuth } from "../../../Hooks/useAdminAuth";
import ConfirmDialog from "../ui/ConfirmDialog";

const SKIP_DIRS = new Set(["node_modules", ".git"]);

const fmtSize = (n) => {
  if (!n && n !== 0) return "0 B";
  if (n < 1024) return `${n} B`;
  if (n < 1024 * 1024) return `${(n / 1024).toFixed(1)} KB`;
  if (n < 1024 * 1024 * 1024) return `${(n / 1048576).toFixed(1)} MB`;
  return `${(n / 1073741824).toFixed(2)} GB`;
};

const fmtTime = (ms) => {
  if (!ms) return "—";
  const d = new Date(ms);
  return `${d.getFullYear()}-${String(d.getMonth() + 1).padStart(2, "0")}-${String(
    d.getDate(),
  ).padStart(2, "0")}`;
};

export default function DatabasePage() {
  const { authFetch } = useAdminAuth();
  const [activeTab, setActiveTab] = useState("collections"); // "collections" | "files"
  
  // Collections state
  const [collections, setCollections] = useState([]);
  const [loadingCollections, setLoadingCollections] = useState(true);
  const [inspectTarget, setInspectTarget] = useState(null); // collection object to view
  const [copied, setCopied] = useState(false);
  const [jsonSearch, setJsonSearch] = useState("");

  // File explorer state
  const [path, setPath] = useState("");
  const [items, setItems] = useState([]);
  const [sizes, setSizes] = useState({});
  const [loadingFiles, setLoadingFiles] = useState(false);
  const [fileError, setFileError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [resetting, setResetting] = useState(false);
  const [notice, setNotice] = useState("");
  const sizeCache = useRef(new Map());

  // Load collections
  const loadCollections = useCallback(async () => {
    setLoadingCollections(true);
    try {
      const res = await authFetch("/api/admin/fs-collections");
      const json = await res.json();
      if (res.ok && Array.isArray(json.collections)) {
        setCollections(json.collections);
      }
    } catch {
      /* fallback */
    } finally {
      setLoadingCollections(false);
    }
  }, [authFetch]);

  // Load files
  const loadFiles = useCallback(
    async (p) => {
      setLoadingFiles(true);
      setFileError("");
      try {
        const res = await authFetch(`/api/admin/fs?path=${encodeURIComponent(p)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to list files");
        setPath(json.path || "");
        setItems(json.items || []);
      } catch (err) {
        setFileError(err.message || "Failed to list files");
      } finally {
        setLoadingFiles(false);
      }
    },
    [authFetch],
  );

  useEffect(() => {
    loadCollections();
    loadFiles("");
  }, [loadCollections, loadFiles]);

  // Folder sizes lazy loading
  useEffect(() => {
    let alive = true;
    (async () => {
      for (const it of items) {
        if (!alive) return;
        if (it.type !== "dir" || SKIP_DIRS.has(it.name)) continue;
        const rel = path ? `${path}/${it.name}` : it.name;
        const cached = sizeCache.current.get(rel);
        if (cached != null) {
          setSizes((s) => ({ ...s, [rel]: cached }));
          continue;
        }
        try {
          const res = await authFetch(`/api/admin/fs-size?path=${encodeURIComponent(rel)}`);
          const json = await res.json();
          if (!alive) return;
          if (res.ok) {
            sizeCache.current.set(rel, json);
            setSizes((s) => ({ ...s, [rel]: json }));
          }
        } catch {
          /* ignore */
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [items, path, authFetch]);

  // Wipe demo data
  const handleReset = async () => {
    setResetting(true);
    setNotice("");
    try {
      const res = await authFetch("/api/admin/reset", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ target: "sabz" }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Reset failed");
      setNotice(
        `✓ Cleared: ${json.cleared?.length ? json.cleared.join(", ") : "nothing stored yet"}`,
      );
      sizeCache.current.clear();
      await loadCollections();
      await loadFiles(path);
    } catch (err) {
      setNotice(`✕ ${err.message || "Reset failed"}`);
    } finally {
      setResetting(false);
    }
  };

  // Delete file / folder
  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const res = await authFetch("/api/admin/fs-delete", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ path: deleteTarget.rel }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      sizeCache.current.clear();
      setDeleteTarget(null);
      await loadFiles(path);
    } catch (err) {
      setFileError(err.message || "Delete failed");
      setDeleteTarget(null);
    } finally {
      setBusy(false);
    }
  };

  // Download collection JSON backup
  const handleDownloadBackup = (col) => {
    const dataStr = "data:text/json;charset=utf-8," + encodeURIComponent(JSON.stringify(col.data, null, 2));
    const downloadAnchor = document.createElement("a");
    downloadAnchor.setAttribute("href", dataStr);
    downloadAnchor.setAttribute("download", col.filename || `${col.id}.json`);
    document.body.appendChild(downloadAnchor);
    downloadAnchor.click();
    downloadAnchor.remove();
  };

  // Copy JSON to clipboard
  const handleCopyJson = (data) => {
    navigator.clipboard.writeText(JSON.stringify(data, null, 2));
    setCopied(true);
    setTimeout(() => setCopied(false), 2000);
  };

  const crumbs = ["PROJECT-ROOT", ...path.split("/").filter(Boolean)];

  return (
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex flex-col sm:flex-row sm:items-center justify-between gap-4 pb-4 border-b border-[#1E293B]">
        <div>
          <p className="text-[#615FFF] text-[12px] font-mono">// database &amp; storage manager</p>
          <h1 className="text-white text-[22px] font-bold mt-1">Database &amp; Collections</h1>
          <p className="text-[#90A1B9] text-[12px] mt-1">
            Manage JSON database collections, view &amp; export backups, or inspect file storage.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={resetting}
            className="text-[12px] font-medium px-3.5 py-2 rounded-xl border border-[#FF6B6B44] text-[#FF6B6B] hover:bg-[#FF6B6B15] hover:border-[#FF6B6B] duration-150 disabled:opacity-50 flex items-center gap-1.5 cursor-pointer"
          >
            <span>🗑️</span>
            {resetting ? "Resetting…" : "Reset Demo Data"}
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3 rounded-xl bg-[#615FFF]/15 border border-[#615FFF]/30 text-[12px] text-[#A5B4FC] flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice("")} className="text-[#90A1B9] hover:text-white">✕</button>
        </div>
      )}

      {/* Tabs Navigation */}
      <div className="flex items-center gap-2 border-b border-[#1E293B]">
        <button
          onClick={() => setActiveTab("collections")}
          className={`px-4 py-2.5 text-[13px] font-medium transition-all duration-150 border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === "collections"
              ? "border-[#615FFF] text-white bg-[#615FFF12]"
              : "border-transparent text-[#90A1B9] hover:text-white"
          }`}
        >
          <span>🗄️</span>
          Database Collections ({collections.length})
        </button>

        <button
          onClick={() => setActiveTab("files")}
          className={`px-4 py-2.5 text-[13px] font-medium transition-all duration-150 border-b-2 cursor-pointer flex items-center gap-2 ${
            activeTab === "files"
              ? "border-[#615FFF] text-white bg-[#615FFF12]"
              : "border-transparent text-[#90A1B9] hover:text-white"
          }`}
        >
          <span>📁</span>
          File &amp; Storage Explorer
        </button>
      </div>

      {/* TAB 1: Database Collections */}
      {activeTab === "collections" && (
        <div className="flex flex-col gap-4">
          {loadingCollections ? (
            <div className="p-12 text-center text-[#68768C] text-[13px]">
              Loading database collections…
            </div>
          ) : collections.length === 0 ? (
            <div className="p-12 text-center text-[#90A1B9] text-[13px] border border-dashed border-[#1E293B] rounded-xl">
              No database collections found.
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-4">
              {collections.map((col) => (
                <div
                  key={col.id}
                  className="rounded-xl border border-[#1E293B] bg-[#091122] hover:border-[#615FFF]/50 transition-all duration-200 p-5 flex flex-col justify-between group shadow-lg"
                >
                  <div>
                    {/* Card Top */}
                    <div className="flex items-start justify-between gap-3 mb-2">
                      <div className="flex items-center gap-2.5 min-w-0">
                        <div className="w-9 h-9 rounded-xl bg-[#615FFF]/15 border border-[#615FFF]/30 flex items-center justify-center text-[16px] text-[#A5B4FC] shrink-0">
                          {col.id === "blog" ? "📝" : col.id.includes("project") ? "🚀" : col.id === "messages" ? "💬" : col.id === "skills" ? "⚡" : col.id === "visits" ? "📊" : "📦"}
                        </div>
                        <div className="min-w-0">
                          <h3 className="text-white text-[14px] font-bold truncate group-hover:text-[#C7C6FF] duration-150">
                            {col.name}
                          </h3>
                          <span className="text-[11px] font-mono text-[#68768C] truncate block">
                            {col.filename}
                          </span>
                        </div>
                      </div>

                      <span className="text-[11px] font-semibold px-2.5 py-0.5 rounded-full bg-[#00D5BE]/15 text-[#00D5BE] border border-[#00D5BE]/30 shrink-0">
                        {col.count} {col.unit}
                      </span>
                    </div>

                    <p className="text-[12px] text-[#90A1B9] mt-3 mb-4 leading-5 line-clamp-2">
                      {col.description}
                    </p>
                  </div>

                  <div className="pt-3 border-t border-[#1E293B] flex items-center justify-between gap-2">
                    <span className="text-[11px] font-mono text-[#68768C]">
                      Size: {fmtSize(col.size)}
                    </span>

                    <div className="flex items-center gap-1.5">
                      <button
                        onClick={() => setInspectTarget(col)}
                        className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg bg-[#615FFF]/15 hover:bg-[#615FFF] text-[#A5B4FC] hover:text-white transition-all duration-150 cursor-pointer"
                        title="View JSON content"
                      >
                        👁️ View
                      </button>

                      <button
                        onClick={() => handleDownloadBackup(col)}
                        className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-[#314158] hover:border-[#90A1B9] text-[#90A1B9] hover:text-white transition-all duration-150 cursor-pointer"
                        title="Download .json backup"
                      >
                        ⬇️ Backup
                      </button>
                    </div>
                  </div>
                </div>
              ))}
            </div>
          )}
        </div>
      )}

      {/* TAB 2: File & Storage Explorer */}
      {activeTab === "files" && (
        <div className="flex flex-col gap-4">
          {/* Breadcrumbs */}
          <div className="flex items-center gap-1.5 flex-wrap text-[12px] bg-[#091122] p-3 rounded-xl border border-[#1E293B]">
            <button
              onClick={() => loadFiles("")}
              disabled={!path}
              className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                path
                  ? "text-[#90A1B9] hover:text-white hover:bg-[#7888a01a]"
                  : "text-[#615FFF] bg-[#615FFF22] font-semibold"
              }`}
            >
              root
            </button>
            {path &&
              crumbs.slice(1).map((c, i) => {
                const segs = path.split("/").filter(Boolean);
                const target = segs.slice(0, i + 1).join("/");
                const isLast = i === crumbs.length - 2;
                return (
                  <span key={target} className="flex items-center gap-1.5">
                    <span className="text-[#4B576D]">/</span>
                    <button
                      type="button"
                      onClick={() => loadFiles(target)}
                      disabled={isLast}
                      className={`px-2.5 py-1 rounded-lg cursor-pointer ${
                        isLast
                          ? "text-[#615FFF] bg-[#615FFF22] font-semibold"
                          : "text-[#90A1B9] hover:text-white hover:bg-[#7888a01a]"
                      }`}
                    >
                      {c}
                    </button>
                  </span>
                );
              })}
            {path && (
              <button
                onClick={() => {
                  const segs = path.split("/").filter(Boolean);
                  segs.pop();
                  loadFiles(segs.join("/"));
                }}
                className="ml-auto text-[11px] px-3 py-1 rounded-lg border border-[#314158] text-[#90A1B9] hover:border-[#90A1B9] hover:text-white duration-150 cursor-pointer"
              >
                ↑ Go Up
              </button>
            )}
          </div>

          {fileError && (
            <p className="text-[12px] text-[#FF6B6B] bg-[#FF6B6B14] border border-[#FF6B6B33] rounded-xl px-4 py-3">
              // {fileError}
            </p>
          )}

          {/* Files Table */}
          <div className="rounded-xl border border-[#1E293B] bg-[#091122] overflow-hidden shadow-lg">
            <div className="grid grid-cols-[1fr_110px_110px_90px] gap-2 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#68768C] border-b border-[#1E293B] bg-[#060D1A]">
              <span>Name</span>
              <span className="text-right">Size</span>
              <span className="text-right hidden sm:block">Modified</span>
              <span className="text-right">Actions</span>
            </div>

            {loadingFiles ? (
              <p className="px-5 py-8 text-[13px] text-[#68768C] text-center">Reading directory…</p>
            ) : items.length === 0 ? (
              <p className="px-5 py-8 text-[13px] text-[#68768C] text-center">// empty directory</p>
            ) : (
              items.map((it) => {
                const rel = path ? `${path}/${it.name}` : it.name;
                const isDir = it.type === "dir";
                const sz = isDir ? sizes[rel] : null;
                const skip = isDir && SKIP_DIRS.has(it.name);
                return (
                  <div
                    key={it.name}
                    className="grid grid-cols-[1fr_110px_110px_90px] gap-2 px-5 py-3 items-center text-[13px] border-b border-[#1E293B]/60 last:border-0 hover:bg-[#7888a00d] duration-150"
                  >
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span className={isDir ? "text-[#FFB86A]" : "text-[#615FFF]"}>
                        {isDir ? "📁" : "📄"}
                      </span>
                      {isDir && !skip ? (
                        <button
                          onClick={() => loadFiles(rel)}
                          className="text-[#E2E8F0] hover:text-[#615FFF] truncate text-left duration-150 cursor-pointer font-medium"
                        >
                          {it.name}/
                        </button>
                      ) : (
                        <span
                          className={`${skip ? "text-[#4B576D]" : "text-[#CBD5E1]"} truncate`}
                          title={skip ? "managed by system" : it.name}
                        >
                          {it.name}
                        </span>
                      )}
                    </span>
                    <span className="text-right text-[12px] font-mono text-[#90A1B9]">
                      {isDir
                        ? skip
                          ? "—"
                          : sz
                            ? fmtSize(sz.size)
                            : "…"
                        : fmtSize(it.size)}
                    </span>
                    <span className="text-right text-[12px] text-[#68768C] hidden sm:block">
                      {fmtTime(it.mtime)}
                    </span>
                    <span className="text-right">
                      <button
                        onClick={() =>
                          setDeleteTarget({
                            rel,
                            name: it.name,
                            isDir,
                            size: isDir ? sz?.size : it.size,
                          })
                        }
                        className="text-[11px] px-2.5 py-1 rounded-lg border border-[#FF6B6B44] text-[#FF6B6B] hover:bg-[#FF6B6B15] hover:border-[#FF6B6B] duration-150 cursor-pointer"
                      >
                        Delete
                      </button>
                    </span>
                  </div>
                );
              })
            )}
          </div>
        </div>
      )}

      {/* JSON Viewer / Inspector Modal */}
      {inspectTarget && (
        <div
          className="fixed inset-0 z-50 flex items-center justify-center p-4 bg-black/75 backdrop-blur-md animate-fadeIn"
          onClick={() => setInspectTarget(null)}
        >
          <div
            className="relative w-full max-w-4xl bg-[#091122] border border-[#314158] rounded-2xl shadow-2xl overflow-hidden max-h-[90vh] flex flex-col"
            onClick={(e) => e.stopPropagation()}
          >
            {/* Modal Header */}
            <div className="flex items-center justify-between px-6 py-4 border-b border-[#1E293B] bg-[#060D1A]">
              <div className="flex items-center gap-3">
                <span className="text-xl">🗄️</span>
                <div>
                  <h3 className="text-white text-[16px] font-bold flex items-center gap-2">
                    {inspectTarget.name}
                    <span className="text-[11px] font-mono font-normal px-2 py-0.5 rounded bg-[#615FFF]/20 text-[#A5B4FC]">
                      {inspectTarget.filename}
                    </span>
                  </h3>
                  <span className="text-[11px] text-[#68768C]">
                    {inspectTarget.count} {inspectTarget.unit} · {fmtSize(inspectTarget.size)}
                  </span>
                </div>
              </div>

              <div className="flex items-center gap-2">
                <button
                  onClick={() => handleCopyJson(inspectTarget.data)}
                  className="text-[12px] px-3 py-1.5 rounded-lg bg-[#615FFF]/20 text-[#A5B4FC] hover:bg-[#615FFF] hover:text-white duration-150 cursor-pointer flex items-center gap-1.5"
                >
                  {copied ? "✓ Copied!" : "📋 Copy JSON"}
                </button>

                <button
                  onClick={() => handleDownloadBackup(inspectTarget)}
                  className="text-[12px] px-3 py-1.5 rounded-lg border border-[#314158] text-[#90A1B9] hover:text-white duration-150 cursor-pointer"
                >
                  ⬇️ Download
                </button>

                <button
                  onClick={() => setInspectTarget(null)}
                  className="w-8 h-8 rounded-lg text-[#90A1B9] hover:text-white hover:bg-[#1E293B] flex items-center justify-center text-[15px] cursor-pointer"
                >
                  ✕
                </button>
              </div>
            </div>

            {/* Search filter */}
            <div className="p-3 border-b border-[#1E293B] bg-[#0B132B]/50 flex items-center gap-2">
              <input
                type="text"
                placeholder="Search inside JSON..."
                value={jsonSearch}
                onChange={(e) => setJsonSearch(e.target.value)}
                className="w-full bg-[#020618] py-2 px-3 text-[12px] text-white rounded-lg border border-[#314158] outline-none focus:border-[#615FFF]"
              />
              {jsonSearch && (
                <button onClick={() => setJsonSearch("")} className="text-[#90A1B9] text-[12px] px-2">
                  Clear
                </button>
              )}
            </div>

            {/* Modal Body: JSON formatted code */}
            <div className="p-6 overflow-y-auto flex-1 font-mono text-[12px] bg-[#020618] text-[#CBD5E1] leading-6">
              <pre className="whitespace-pre-wrap break-all">
                {JSON.stringify(inspectTarget.data, null, 2)}
              </pre>
            </div>
          </div>
        </div>
      )}

      {/* Delete confirmation dialog */}
      {deleteTarget && (
        <ConfirmDialog
          title={deleteTarget.isDir ? "Delete folder" : "Delete file"}
          message={
            deleteTarget.isDir
              ? `Delete folder "${deleteTarget.name}"${
                  deleteTarget.size != null
                    ? ` (${fmtSize(deleteTarget.size)})`
                    : ""
                } and EVERYTHING inside it? This action cannot be undone.`
              : `Delete file "${deleteTarget.name}"? This action cannot be undone.`
          }
          busy={busy}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
