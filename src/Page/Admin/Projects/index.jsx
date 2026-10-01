import { useEffect, useState } from "react";
import { useAdminAuth } from "../../../Hooks/useAdminAuth";
import ProjectFormModal from "./ProjectFormModal";
import ConfirmDialog from "../ui/ConfirmDialog";

// Same monogram generator as the main-site ProjectCard (e.g. "Sabz Learn" → "SL")
const getMonogram = (title) => {
  const words = title?.trim().split(/\s+/);
  if (!words || words.length === 0) return "?";
  if (words.length === 1) {
    const t = words[0];
    return t.length >= 2 ? t.substring(0, 2).toUpperCase() : t[0].toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
};

const TYPES = [
  { key: "web", label: "web-projects", hint: "Web Project" },
  { key: "mini", label: "mini-projects", hint: "Mini Project" },
];

export default function ProjectsPage() {
  const { authFetch } = useAdminAuth();
  const [type, setType] = useState("web");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalState, setModalState] = useState(null); // null | { mode: "create"|"edit", project? }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);
  const [uploadingModal, setUploadingModal] = useState(false);

  const load = async (t = type) => {
    setLoading(true);
    setError("");
    try {
      const res = await authFetch(`/api/admin/projects-admin?type=${t}`);
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load projects");
      setProjects(json.projects || []);
    } catch (err) {
      setError(err.message || "Failed to load projects");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load(type);
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, [type]);

  const handleSave = async (payload, mode, id) => {
    setBusy(true);
    try {
      const res = await authFetch("/api/admin/projects-admin", {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, type, id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setModalState(null);
      setUploadingModal(false);
      await load(type);
    } catch (err) {
      setError(err.message || "Save failed");
      throw err;
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const res = await authFetch("/api/admin/projects-admin", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ type, id: deleteTarget.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      setDeleteTarget(null);
      await load(type);
    } catch (err) {
      setError(err.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[#615FFF] text-[12px]">$ ls ./projects</p>
          <h1 className="text-white text-[20px] mt-1">Projects</h1>
          <p className="text-[#68768C] text-[11px] mt-1">
            Add, edit and delete projects
          </p>
        </div>
        <button
          onClick={() => setModalState({ mode: "create" })}
          className="text-[12px] px-4 py-2 rounded-md cursor-pointer duration-150 bg-[#90A1B9] hover:bg-[#0E1528] outline-1 outline-[#90A1B9] text-[#0E1528] hover:text-[#90A1B9]"
        >
          + new-project
        </button>
      </div>

      <div className="flex gap-1 rounded-md border border-[#1E293B] p-1 w-fit">
        {TYPES.map((t) => (
          <button
            key={t.key}
            onClick={() => setType(t.key)}
            className={`text-[11px] px-3 py-1.5 rounded duration-150 ${
              type === t.key
                ? "bg-[#615FFF33] text-white"
                : "text-[#68768C] hover:text-white"
            }`}
          >
            {t.label}
          </button>
        ))}
      </div>

      {error && (
        <p className="text-[11px] text-[#FF6B6B] bg-[#FF6B6B14] border border-[#FF6B6B33] rounded-md px-3 py-2 w-fit">
          // {error}
        </p>
      )}

      {loading ? (
        <p className="text-[12px] text-[#68768C]">_loading-projects...</p>
      ) : projects.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#1E293B] p-10 text-center text-[12px] text-[#68768C]">
          // no projects yet — click "new-project" to add one
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {projects.map((p) => (
            <div
              key={p.id}
              className="rounded-lg border border-[#1E293B] bg-[#0F172B] overflow-hidden flex flex-col"
            >
              {/* Preview Area: Pure Logotype — mirrors the main-site ProjectCard template (no screenshots) */}
              <div className="w-full h-[130px] relative overflow-hidden bg-[#0a1628]">
                {/* Top accent line */}
                <div
                  className="absolute top-0 left-0 right-0 h-[2px]"
                  style={{
                    background:
                      "linear-gradient(90deg, transparent 0%, #615FFF 30%, #7C6CF6 70%, transparent 100%)",
                    opacity: 0.4,
                  }}
                />
                {/* Faint grid texture */}
                <div
                  className="absolute inset-0"
                  style={{
                    backgroundImage:
                      "linear-gradient(rgba(144,161,185,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(144,161,185,0.07) 1px, transparent 1px)",
                    backgroundSize: "22px 22px",
                  }}
                />
                {/* Giant watermark monogram */}
                <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
                  <span
                    className="text-[92px] font-bold select-none leading-none"
                    style={{ color: "#615FFF", opacity: 0.07 }}
                  >
                    {getMonogram(p.title)}
                  </span>
                </div>
                {/* Logotype content */}
                <div className="absolute inset-0 flex flex-col items-center justify-center gap-2 px-4">
                  <div
                    className="w-9 h-9 rounded-xl flex items-center justify-center shadow-lg"
                    style={{
                      background: "linear-gradient(135deg, #615FFF 0%, #7C6CF6 100%)",
                      boxShadow: "0 6px 24px rgba(97,95,255,0.4)",
                    }}
                  >
                    <span className="text-white font-bold text-[12px] leading-none tracking-tight">
                      {getMonogram(p.title)}
                    </span>
                  </div>
                  <h4
                    className="text-[#E8ECF4] text-[14px] font-bold tracking-[0.08em] uppercase text-center truncate max-w-full"
                  >
                    {p.title}
                  </h4>
                </div>
                {/* Corner brackets (techy frame) */}
                <div className="absolute top-2.5 left-2.5 w-3.5 h-3.5 border-t-2 border-l-2" style={{ borderColor: "#615FFF66", opacity: 0.6 }} />
                <div className="absolute top-2.5 right-2.5 w-3.5 h-3.5 border-t-2 border-r-2" style={{ borderColor: "#615FFF66", opacity: 0.6 }} />
                <div className="absolute bottom-2.5 left-2.5 w-3.5 h-3.5 border-b-2 border-l-2" style={{ borderColor: "#615FFF66", opacity: 0.6 }} />
                <div className="absolute bottom-2.5 right-2.5 w-3.5 h-3.5 border-b-2 border-r-2" style={{ borderColor: "#615FFF66", opacity: 0.6 }} />
              </div>
              <div className="p-4 flex flex-col gap-2 flex-1">
                <p className="text-white text-[13px]">{p.title}</p>
                <p className="text-[11px] text-[#68768C] line-clamp-2">
                  {p.description || "// no description"}
                </p>
                <div className="flex flex-wrap gap-1.5">
                  {(p.category || []).map((c) => (
                    <span
                      key={c}
                      className="text-[9px] px-2 py-0.5 rounded-full bg-[#615FFF22] border border-[#615FFF44] text-[#90A1B9]"
                    >
                      {c}
                    </span>
                  ))}
                </div>
                <div className="mt-auto pt-2 flex items-center gap-2">
                  <button
                    onClick={() => setModalState({ mode: "edit", project: p })}
                    className="flex-1 text-[11px] py-1.5 rounded-md border border-[#314158] text-[#90A1B9] hover:border-[#90A1B9] hover:text-white duration-150"
                  >
                    edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(p)}
                    className="flex-1 text-[11px] py-1.5 rounded-md border border-[#FF6B6B44] text-[#FF6B6B] hover:border-[#FF6B6B] duration-150"
                  >
                    delete
                  </button>
                </div>
              </div>
            </div>
          ))}
        </div>
      )}

      {modalState && (
        <ProjectFormModal
          mode={modalState.mode}
          project={modalState.project}
          busy={busy || uploadingModal}
          projectType={type}
          authFetch={authFetch}
          onClose={() => setModalState(null)}
          onSave={handleSave}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete project"
          message={`Are you sure you want to delete "${deleteTarget.title}"? This action cannot be undone.`}
          busy={busy}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
