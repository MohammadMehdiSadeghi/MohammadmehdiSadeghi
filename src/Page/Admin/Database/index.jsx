import { useCallback, useEffect, useRef, useState } from "react";
import { useAdminAuth } from "../../../Hooks/useAdminAuth";
import ConfirmDialog from "../ui/ConfirmDialog";

const SKIP_DIRS = new Set(["node_modules", ".git"]);

const fmtSize = (n) => {
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
  const [path, setPath] = useState("");
  const [items, setItems] = useState([]);
  const [sizes, setSizes] = useState({}); // relDirPath -> {size, files}
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const sizeCache = useRef(new Map());

  const load = useCallback(
    async (p) => {
      setLoading(true);
      setError("");
      try {
        const res = await authFetch(`/api/admin/fs?path=${encodeURIComponent(p)}`);
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to list files");
        setPath(json.path || "");
        setItems(json.items || []);
      } catch (err) {
        setError(err.message || "Failed to list files");
      } finally {
        setLoading(false);
      }
    },
    [authFetch],
  );

  useEffect(() => {
    load("");
  }, [load]);

  // folder sizes are computed lazily (server walks the tree) — fetch one-by-one
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
          /* size is decorative — ignore failures */
        }
      }
    })();
    return () => {
      alive = false;
    };
  }, [items, path, authFetch]);

  const navigate = useCallback((p) => load(p), [load]);

  const openDir = (name) => {
    const rel = path ? `${path}/${name}` : name;
    load(rel);
  };

  const goUp = () => {
    if (!path) return;
    const segs = path.split("/").filter(Boolean);
    segs.pop();
    load(segs.join("/"));
  };

  const crumbs = ["PROJECT-ROOT", ...path.split("/").filter(Boolean)];

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
      await load(path);
    } catch (err) {
      setError(err.message || "Delete failed");
      setDeleteTarget(null);
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[#615FFF] text-[12px]">$ tree ./</p>
        <h1 className="text-white text-[20px] mt-1">Database — file manager</h1>
        <p className="text-[#68768C] text-[11px] mt-1">
          Browse every file &amp; folder of the project · delete anything you don't need
        </p>
      </div>

      {/* breadcrumb */}
      <div className="flex items-center gap-1.5 flex-wrap text-[11px]">
        <button
          onClick={() => load("")}
          disabled={!path}
          className={`px-2 py-1 rounded ${
            path
              ? "text-[#90A1B9] hover:text-white hover:bg-[#7888a01a]"
              : "text-[#615FFF] bg-[#615FFF22]"
          }`}
        >
          project-root
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
                  onClick={() => navigate(target)}
                  disabled={isLast}
                  className={`px-2 py-1 rounded ${
                    isLast
                      ? "text-[#615FFF] bg-[#615FFF22]"
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
            onClick={goUp}
            className="ml-2 px-2.5 py-1 rounded border border-[#314158] text-[#90A1B9] hover:border-[#90A1B9] hover:text-white duration-150"
          >
            ↑ up
          </button>
        )}
      </div>

      {error && (
        <p className="text-[11px] text-[#FF6B6B] bg-[#FF6B6B14] border border-[#FF6B6B33] rounded-md px-3 py-2 w-fit">
          // {error}
        </p>
      )}

      <div className="rounded-lg border border-[#1E293B] bg-[#0F172B] overflow-hidden">
        <div className="grid grid-cols-[1fr_110px_110px_90px] gap-2 px-4 py-2.5 text-[10px] uppercase tracking-wider text-[#4B576D] border-b border-[#1E293B] bg-[#0b1220]">
          <span>name</span>
          <span className="text-right">size</span>
          <span className="text-right hidden sm:block">modified</span>
          <span className="text-right">actions</span>
        </div>

        {loading ? (
          <p className="px-4 py-6 text-[12px] text-[#68768C]">_loading...</p>
        ) : items.length === 0 ? (
          <p className="px-4 py-6 text-[12px] text-[#68768C]">// empty folder</p>
        ) : (
          items.map((it) => {
            const rel = path ? `${path}/${it.name}` : it.name;
            const isDir = it.type === "dir";
            const sz = isDir ? sizes[rel] : null;
            const skip = isDir && SKIP_DIRS.has(it.name);
            return (
              <div
                key={it.name}
                className="grid grid-cols-[1fr_110px_110px_90px] gap-2 px-4 py-2.5 items-center text-[12px] border-b border-[#1E293B80] last:border-0 hover:bg-[#7888a00d] duration-150"
              >
                <span className="flex items-center gap-2 min-w-0">
                  <span className={isDir ? "text-[#FFB86A]" : "text-[#615FFF]"}>
                    {isDir ? "▸" : "·"}
                  </span>
                  {isDir && !skip ? (
                    <button
                      onClick={() => openDir(it.name)}
                      className="text-[#E8ECF8] hover:text-[#615FFF] truncate text-left duration-150"
                    >
                      {it.name}/
                    </button>
                  ) : (
                    <span
                      className={`${skip ? "text-[#4B576D]" : "text-[#90A1B9]"} truncate`}
                      title={skip ? "managed by tooling — not deletable here" : it.name}
                    >
                      {it.name}
                    </span>
                  )}
                </span>
                <span className="text-right text-[11px] text-[#68768C]">
                  {isDir
                    ? skip
                      ? "—"
                      : sz
                        ? fmtSize(sz.size)
                        : "…"
                    : fmtSize(it.size)}
                </span>
                <span className="text-right text-[11px] text-[#68768C] hidden sm:block">
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
                    className="text-[10px] px-2 py-1 rounded border border-[#FF6B6B44] text-[#FF6B6B] hover:border-[#FF6B6B] duration-150"
                  >
                    delete
                  </button>
                </span>
              </div>
            );
          })
        )}
      </div>

      <p className="text-[10px] text-[#4B576D]">
        // tip: after deploying a project zip you can delete the leftover .zip here to free space
      </p>

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
