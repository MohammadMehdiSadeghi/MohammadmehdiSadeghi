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

// --- Minimal Modern SVG Icons ---
function DatabaseIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <ellipse cx="12" cy="5" rx="9" ry="3" />
      <path strokeLinecap="round" d="M21 12c0 1.66-4 3-9 3s-9-1.34-9-3" />
      <path strokeLinecap="round" d="M3 5v14c0 1.66 4 3 9 3s9-1.34 9-3V5" />
    </svg>
  );
}

function FolderIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
    </svg>
  );
}

function FileIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
    </svg>
  );
}

function TrashIcon({ className = "w-4 h-4" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M19 7l-.867 12.142A2 2 0 0116.138 21H7.862a2 2 0 01-1.995-1.858L5 7m5 4v6m4-6v6m1-10V4a1 1 0 00-1-1h-4a1 1 0 00-1 1v3M4 7h16" />
    </svg>
  );
}

function EyeIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M2.458 12C3.732 7.943 7.523 5 12 5c4.478 0 8.268 2.943 9.542 7-1.274 4.057-5.064 7-9.542 7-4.477 0-8.268-2.943-9.542-7z" />
    </svg>
  );
}

function DownloadIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
    </svg>
  );
}

function CopyIcon({ className = "w-3.5 h-3.5" }) {
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 16H6a2 2 0 01-2-2V6a2 2 0 012-2h8a2 2 0 012 2v2m-6 12h8a2 2 0 002-2v-8a2 2 0 00-2-2h-8a2 2 0 00-2 2v8a2 2 0 002 2z" />
    </svg>
  );
}

function CollectionTypeIcon({ id, className = "w-4 h-4" }) {
  if (id === "blog") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M11 5H6a2 2 0 00-2 2v11a2 2 0 002 2h11a2 2 0 002-2v-5m-1.414-9.414a2 2 0 112.828 2.828L11.828 15H9v-2.828l8.586-8.586z" />
      </svg>
    );
  }
  if (id.includes("project")) {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M10 20l4-16m4 4l4 4-4 4M6 16l-4-4 4-4" />
      </svg>
    );
  }
  if (id === "messages") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M8 12h.01M12 12h.01M16 12h.01M21 12c0 4.418-4.03 8-9 8a9.863 9.863 0 01-4.255-.949L3 20l1.395-3.72C3.512 15.042 3 13.574 3 12c0-4.418 4.03-8 9-8s9 3.582 9 8z" />
      </svg>
    );
  }
  if (id === "skills") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M13 10V3L4 14h7v7l9-11h-7z" />
      </svg>
    );
  }
  if (id === "visits") {
    return (
      <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
        <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
      </svg>
    );
  }
  return (
    <svg className={className} fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M20 7l-8-4-8 4m16 0l-8 4m8-4v10l-8 4m0-10L4 7m8 4v10M4 7v10l8 4" />
    </svg>
  );
}

const QUICK_SHORTCUTS = [
  { label: "root", path: "" },
  { label: "blog uploads", path: "public/assets/Blog" },
  { label: "project assets", path: "public/Projects" },
  { label: "database json", path: "public/api" },
];

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
  const [selectedFiles, setSelectedFiles] = useState(new Set());
  const [batchDeleteOpen, setBatchDeleteOpen] = useState(false);
  const [fileSearch, setFileSearch] = useState("");
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
      setSelectedFiles(new Set());
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
        `Cleared: ${json.cleared?.length ? json.cleared.join(", ") : "nothing stored yet"}`,
      );
      sizeCache.current.clear();
      await loadCollections();
      await loadFiles(path);
    } catch (err) {
      setNotice(`Error: ${err.message || "Reset failed"}`);
    } finally {
      setResetting(false);
    }
  };

  // Delete single file / folder
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
      setNotice(`Deleted: ${deleteTarget.name}`);
    } catch (err) {
      setFileError(err.message || "Delete failed");
      setDeleteTarget(null);
    } finally {
      setBusy(false);
    }
  };

  // Batch delete selected files / folders
  const handleBatchDelete = async () => {
    if (selectedFiles.size === 0) return;
    setBusy(true);
    let deletedCount = 0;
    const errors = [];
    for (const rel of Array.from(selectedFiles)) {
      try {
        const res = await authFetch("/api/admin/fs-delete", {
          method: "POST",
          headers: { "Content-Type": "application/json" },
          body: JSON.stringify({ path: rel }),
        });
        if (res.ok) {
          deletedCount++;
        } else {
          const j = await res.json().catch(() => ({}));
          errors.push(j.error || rel);
        }
      } catch (err) {
        errors.push(err.message || rel);
      }
    }
    sizeCache.current.clear();
    setSelectedFiles(new Set());
    setBatchDeleteOpen(false);
    setBusy(false);
    if (errors.length > 0) {
      setNotice(`Deleted ${deletedCount} item(s), ${errors.length} failed: ${errors.join(", ")}`);
    } else {
      setNotice(`Successfully deleted ${deletedCount} extra item(s).`);
    }
    await loadFiles(path);
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

  // Visible items filtered by search
  const visibleItems = items.filter((it) =>
    !fileSearch || it.name.toLowerCase().includes(fileSearch.toLowerCase())
  );

  const selectableItems = visibleItems.filter(
    (it) => !(it.type === "dir" && SKIP_DIRS.has(it.name))
  );

  const allSelected =
    selectableItems.length > 0 &&
    selectableItems.every((it) => {
      const rel = path ? `${path}/${it.name}` : it.name;
      return selectedFiles.has(rel);
    });

  const toggleSelectAll = () => {
    if (allSelected) {
      setSelectedFiles(new Set());
    } else {
      const next = new Set();
      selectableItems.forEach((it) => {
        const rel = path ? `${path}/${it.name}` : it.name;
        next.add(rel);
      });
      setSelectedFiles(next);
    }
  };

  const toggleSelect = (rel) => {
    setSelectedFiles((prev) => {
      const next = new Set(prev);
      if (next.has(rel)) next.delete(rel);
      else next.add(rel);
      return next;
    });
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
            Manage JSON database collections, view &amp; export backups, or inspect and delete storage files.
          </p>
        </div>

        <div className="flex items-center gap-2">
          <button
            onClick={handleReset}
            disabled={resetting}
            className="text-[12px] font-medium px-3.5 py-2 rounded-xl border border-[#FF6B6B44] text-[#FF6B6B] hover:bg-[#FF6B6B15] hover:border-[#FF6B6B] duration-150 disabled:opacity-50 flex items-center gap-2 cursor-pointer"
          >
            <TrashIcon className="w-3.5 h-3.5" />
            {resetting ? "Resetting…" : "Reset Demo Data"}
          </button>
        </div>
      </div>

      {notice && (
        <div className="p-3 rounded-xl bg-[#615FFF]/15 border border-[#615FFF]/30 text-[12px] text-[#A5B4FC] flex items-center justify-between">
          <span>{notice}</span>
          <button onClick={() => setNotice("")} className="text-[#90A1B9] hover:text-white cursor-pointer px-2">✕</button>
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
          <DatabaseIcon className="w-4 h-4 text-[#615FFF]" />
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
          <FolderIcon className="w-4 h-4 text-[#FFB86A]" />
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
                        <div className="w-9 h-9 rounded-xl bg-[#615FFF]/15 border border-[#615FFF]/30 flex items-center justify-center text-[#A5B4FC] shrink-0">
                          <CollectionTypeIcon id={col.id} className="w-4 h-4 text-[#A5B4FC]" />
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
                        className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg bg-[#615FFF]/15 hover:bg-[#615FFF] text-[#A5B4FC] hover:text-white transition-all duration-150 cursor-pointer flex items-center gap-1.5"
                        title="View JSON content"
                      >
                        <EyeIcon className="w-3.5 h-3.5" />
                        <span>View</span>
                      </button>

                      <button
                        onClick={() => handleDownloadBackup(col)}
                        className="text-[11px] font-medium px-2.5 py-1.5 rounded-lg border border-[#314158] hover:border-[#90A1B9] text-[#90A1B9] hover:text-white transition-all duration-150 cursor-pointer flex items-center gap-1.5"
                        title="Download .json backup"
                      >
                        <DownloadIcon className="w-3.5 h-3.5" />
                        <span>Backup</span>
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
          {/* Quick jump shortcuts */}
          <div className="flex items-center gap-2 flex-wrap text-[11px]">
            <span className="text-[#68768C] font-mono uppercase">// quick jump:</span>
            {QUICK_SHORTCUTS.map((sc) => {
              const isActive = path === sc.path;
              return (
                <button
                  key={sc.path}
                  onClick={() => loadFiles(sc.path)}
                  className={`px-2.5 py-1 rounded-lg border transition-all duration-150 cursor-pointer ${
                    isActive
                      ? "border-[#615FFF] bg-[#615FFF]/20 text-white font-medium"
                      : "border-[#1E293B] bg-[#091122] text-[#90A1B9] hover:text-white hover:border-[#314158]"
                  }`}
                >
                  {sc.label}
                </button>
              );
            })}
          </div>

          {/* Breadcrumbs & Controls */}
          <div className="flex items-center justify-between gap-3 flex-wrap bg-[#091122] p-3 rounded-xl border border-[#1E293B]">
            <div className="flex items-center gap-1.5 flex-wrap text-[12px]">
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
            </div>

            <div className="flex items-center gap-2 ml-auto">
              <input
                type="text"
                value={fileSearch}
                onChange={(e) => setFileSearch(e.target.value)}
                placeholder="Filter files..."
                className="bg-[#020618] border border-[#1E293B] focus:border-[#615FFF] text-white text-[12px] px-3 py-1 rounded-lg outline-none w-36 sm:w-48"
              />
              {path && (
                <button
                  onClick={() => {
                    const segs = path.split("/").filter(Boolean);
                    segs.pop();
                    loadFiles(segs.join("/"));
                  }}
                  className="text-[11px] px-3 py-1 rounded-lg border border-[#314158] text-[#90A1B9] hover:border-[#90A1B9] hover:text-white duration-150 cursor-pointer"
                >
                  ↑ Go Up
                </button>
              )}
            </div>
          </div>

          {/* Multi-selection Batch Bar */}
          {selectedFiles.size > 0 && (
            <div className="flex items-center justify-between gap-3 p-3 rounded-xl bg-[#FF6B6B]/10 border border-[#FF6B6B]/30 text-[12px]">
              <div className="flex items-center gap-2">
                <span className="font-semibold text-white">
                  {selectedFiles.size} item{selectedFiles.size > 1 ? "s" : ""} selected
                </span>
                <button
                  onClick={() => setSelectedFiles(new Set())}
                  className="text-[#90A1B9] hover:text-white underline cursor-pointer ml-2 text-[11px]"
                >
                  Clear Selection
                </button>
              </div>

              <button
                onClick={() => setBatchDeleteOpen(true)}
                disabled={busy}
                className="px-3 py-1.5 rounded-lg bg-[#FF6B6B] hover:bg-[#ff5252] text-white font-medium duration-150 cursor-pointer flex items-center gap-1.5 disabled:opacity-50"
              >
                <TrashIcon className="w-3.5 h-3.5" />
                <span>Delete Selected ({selectedFiles.size})</span>
              </button>
            </div>
          )}

          {fileError && (
            <p className="text-[12px] text-[#FF6B6B] bg-[#FF6B6B14] border border-[#FF6B6B33] rounded-xl px-4 py-3">
              // {fileError}
            </p>
          )}

          {/* Files Table */}
          <div className="rounded-xl border border-[#1E293B] bg-[#091122] overflow-hidden shadow-lg">
            <div className="grid grid-cols-[36px_1fr_110px_110px_90px] gap-2 px-5 py-3 text-[11px] font-semibold uppercase tracking-wider text-[#68768C] border-b border-[#1E293B] bg-[#060D1A] items-center">
              <div>
                <input
                  type="checkbox"
                  checked={allSelected}
                  onChange={toggleSelectAll}
                  disabled={selectableItems.length === 0}
                  className="rounded border-[#314158] bg-[#0F172B] text-[#615FFF] focus:ring-0 cursor-pointer accent-[#615FFF]"
                  title="Select all"
                />
              </div>
              <span>Name</span>
              <span className="text-right">Size</span>
              <span className="text-right hidden sm:block">Modified</span>
              <span className="text-right">Actions</span>
            </div>

            {loadingFiles ? (
              <p className="px-5 py-8 text-[13px] text-[#68768C] text-center">Reading directory…</p>
            ) : visibleItems.length === 0 ? (
              <p className="px-5 py-8 text-[13px] text-[#68768C] text-center">
                {fileSearch ? `No files matching "${fileSearch}"` : "// empty directory"}
              </p>
            ) : (
              visibleItems.map((it) => {
                const rel = path ? `${path}/${it.name}` : it.name;
                const isDir = it.type === "dir";
                const sz = isDir ? sizes[rel] : null;
                const skip = isDir && SKIP_DIRS.has(it.name);
                const isSelected = selectedFiles.has(rel);
                return (
                  <div
                    key={it.name}
                    className={`grid grid-cols-[36px_1fr_110px_110px_90px] gap-2 px-5 py-3 items-center text-[13px] border-b border-[#1E293B]/60 last:border-0 duration-150 ${
                      isSelected ? "bg-[#615FFF]/10" : "hover:bg-[#7888a00d]"
                    }`}
                  >
                    <div>
                      {!skip ? (
                        <input
                          type="checkbox"
                          checked={isSelected}
                          onChange={() => toggleSelect(rel)}
                          className="rounded border-[#314158] bg-[#0F172B] text-[#615FFF] focus:ring-0 cursor-pointer accent-[#615FFF]"
                        />
                      ) : (
                        <span className="w-3.5 h-3.5 block" />
                      )}
                    </div>
                    <span className="flex items-center gap-2.5 min-w-0">
                      <span className={isDir ? "text-[#FFB86A]" : "text-[#615FFF]"}>
                        {isDir ? (
                          <FolderIcon className="w-4 h-4 text-[#FFB86A]" />
                        ) : (
                          <FileIcon className="w-4 h-4 text-[#615FFF]" />
                        )}
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
                      {!skip && (
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
                      )}
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
                <div className="w-8 h-8 rounded-lg bg-[#615FFF]/20 border border-[#615FFF]/30 flex items-center justify-center text-[#A5B4FC]">
                  <DatabaseIcon className="w-4 h-4 text-[#A5B4FC]" />
                </div>
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
                  {copied ? (
                    <span>✓ Copied!</span>
                  ) : (
                    <>
                      <CopyIcon className="w-3.5 h-3.5" />
                      <span>Copy JSON</span>
                    </>
                  )}
                </button>

                <button
                  onClick={() => handleDownloadBackup(inspectTarget)}
                  className="text-[12px] px-3 py-1.5 rounded-lg border border-[#314158] text-[#90A1B9] hover:text-white duration-150 cursor-pointer flex items-center gap-1.5"
                >
                  <DownloadIcon className="w-3.5 h-3.5" />
                  <span>Download</span>
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
                <button onClick={() => setJsonSearch("")} className="text-[#90A1B9] text-[12px] px-2 cursor-pointer">
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

      {/* Delete single confirmation dialog */}
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

      {/* Delete batch confirmation dialog */}
      {batchDeleteOpen && (
        <ConfirmDialog
          title={`Delete ${selectedFiles.size} selected item(s)`}
          message={`Are you sure you want to permanently delete these ${selectedFiles.size} file(s)/folder(s) from the project storage? This action cannot be undone.`}
          confirmLabel={`Delete (${selectedFiles.size})`}
          busy={busy}
          onCancel={() => setBatchDeleteOpen(false)}
          onConfirm={handleBatchDelete}
        />
      )}
    </div>
  );
}
