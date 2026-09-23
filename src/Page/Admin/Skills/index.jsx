import { useEffect, useState } from "react";
import { useAdminAuth } from "../../../Hooks/useAdminAuth";
import SkillFormModal from "./SkillFormModal";
import ConfirmDialog from "../ui/ConfirmDialog";

export default function SkillsPage() {
  const { authFetch } = useAdminAuth();
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalState, setModalState] = useState(null);
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await authFetch("/api/admin/skills-admin");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load skills");
      setSkills(json.skills || []);
    } catch (err) {
      setError(err.message || "Failed to load skills");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
  }, []);

  const handleSave = async (payload, mode, id) => {
    setBusy(true);
    try {
      const res = await authFetch("/api/admin/skills-admin", {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setModalState(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const res = await authFetch("/api/admin/skills-admin", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      setDeleteTarget(null);
      await load();
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
          <p className="text-[#615FFF] text-[12px]">$ ls ./skills</p>
          <h1 className="text-white text-[20px] mt-1">Skills</h1>
          <p className="text-[#68768C] text-[11px] mt-1">
            Add, edit and delete the skills shown on your About page
          </p>
        </div>
        <button
          onClick={() => setModalState({ mode: "create" })}
          className="text-[12px] px-4 py-2 rounded-md cursor-pointer duration-150 bg-[#90A1B9] hover:bg-[#0E1528] outline-1 outline-[#90A1B9] text-[#0E1528] hover:text-[#90A1B9]"
        >
          + new-skill
        </button>
      </div>

      {error && (
        <p className="text-[11px] text-[#FF6B6B] bg-[#FF6B6B14] border border-[#FF6B6B33] rounded-md px-3 py-2 w-fit">
          // {error}
        </p>
      )}

      {loading ? (
        <p className="text-[12px] text-[#68768C]">_loading-skills...</p>
      ) : skills.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#1E293B] p-10 text-center text-[12px] text-[#68768C]">
          // no skills yet — click "new-skill" to add one
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 xl:grid-cols-3 gap-4">
          {skills.map((s) => (
            <div
              key={s.id}
              className="rounded-lg border border-[#1E293B] bg-[#0F172B] p-4 flex items-center gap-4"
            >
              <div className="w-14 h-14 shrink-0 rounded-md bg-[#0a1628] flex items-center justify-center overflow-hidden">
                {s.img ? (
                  <img
                    src={s.img}
                    alt={s.name}
                    className="w-full h-full object-contain"
                    onError={(e) => {
                      e.currentTarget.style.display = "none";
                    }}
                  />
                ) : (
                  <span className="text-[9px] text-[#4B576D]">// no icon</span>
                )}
              </div>
              <div className="flex-1 min-w-0">
                <p className="text-white text-[13px] truncate">{s.name}</p>
                <div className="mt-2 flex items-center gap-2">
                  <button
                    onClick={() => setModalState({ mode: "edit", skill: s })}
                    className="flex-1 text-[11px] py-1.5 px-3 rounded-md border border-[#314158] text-[#90A1B9] hover:border-[#90A1B9] hover:text-white duration-150"
                  >
                    edit
                  </button>
                  <button
                    onClick={() => setDeleteTarget(s)}
                    className="flex-1 text-[11px] py-1.5 px-3 rounded-md border border-[#FF6B6B44] text-[#FF6B6B] hover:border-[#FF6B6B] duration-150"
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
        <SkillFormModal
          mode={modalState.mode}
          skill={modalState.skill}
          busy={busy}
          onClose={() => setModalState(null)}
          onSave={handleSave}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete skill"
          message={`Are you sure you want to delete "${deleteTarget.name}"? This action cannot be undone.`}
          busy={busy}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
