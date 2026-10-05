import { useEffect, useState } from "react";
import { useAdminAuth } from "../../../Hooks/useAdminAuth";
import SkillFormModal from "./SkillFormModal";
import ConfirmDialog from "../ui/ConfirmDialog";

export default function SkillsPage() {
  const { authFetch } = useAdminAuth();
  const [skills, setSkills] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [successMsg, setSuccessMsg] = useState("");
  const [modalState, setModalState] = useState(null); // null | { mode: "create"|"edit", skill? }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  // Drag and Drop state
  const [draggedIndex, setDraggedIndex] = useState(null);
  const [dragOverIndex, setDragOverIndex] = useState(null);

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
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const saveOrder = async (newOrder) => {
    setBusy(true);
    setSuccessMsg("");
    try {
      const res = await authFetch("/api/admin/skills-admin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ skills: newOrder }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to save order");
      setSkills(newOrder);
      setSuccessMsg("✓ Display order saved successfully!");
      setTimeout(() => setSuccessMsg(""), 3000);
    } catch (err) {
      setError(err.message || "Failed to save display order");
    } finally {
      setBusy(false);
    }
  };

  const handleDragStart = (e, index) => {
    setDraggedIndex(index);
    e.dataTransfer.effectAllowed = "move";
    e.dataTransfer.setData("text/plain", index);
  };

  const handleDragOver = (e, index) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === index) return;
    setDragOverIndex(index);
  };

  const handleDrop = (e, targetIndex) => {
    e.preventDefault();
    if (draggedIndex === null || draggedIndex === targetIndex) {
      setDraggedIndex(null);
      setDragOverIndex(null);
      return;
    }

    const updated = [...skills];
    const [movedItem] = updated.splice(draggedIndex, 1);
    updated.splice(targetIndex, 0, movedItem);

    setDraggedIndex(null);
    setDragOverIndex(null);
    saveOrder(updated);
  };

  const handleDragEnd = () => {
    setDraggedIndex(null);
    setDragOverIndex(null);
  };

  const moveItem = (index, direction) => {
    const targetIndex = index + direction;
    if (targetIndex < 0 || targetIndex >= skills.length) return;

    const updated = [...skills];
    const [movedItem] = updated.splice(index, 1);
    updated.splice(targetIndex, 0, movedItem);

    saveOrder(updated);
  };

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
            Add, edit, delete and drag-and-drop to reorder skills shown on your About page
          </p>
        </div>
        <button
          onClick={() => setModalState({ mode: "create" })}
          className="text-[12px] px-4 py-2 rounded-md cursor-pointer duration-150 bg-[#90A1B9] hover:bg-[#0E1528] outline-1 outline-[#90A1B9] text-[#0E1528] hover:text-[#90A1B9]"
        >
          + new-skill
        </button>
      </div>

      {successMsg && (
        <p className="text-[11px] text-[#00D5BE] bg-[#00D5BE14] border border-[#00D5BE33] rounded-md px-3 py-2 w-fit transition-all duration-200">
          {successMsg}
        </p>
      )}

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
          {skills.map((s, index) => {
            const isDragging = draggedIndex === index;
            const isDragOver = dragOverIndex === index;

            return (
              <div
                key={s.id}
                draggable
                onDragStart={(e) => handleDragStart(e, index)}
                onDragOver={(e) => handleDragOver(e, index)}
                onDrop={(e) => handleDrop(e, index)}
                onDragEnd={handleDragEnd}
                className={`rounded-lg border bg-[#0F172B] p-4 flex items-center gap-4 transition-all duration-200 cursor-grab active:cursor-grabbing relative ${
                  isDragging
                    ? "opacity-40 scale-95 border-dashed border-[#615FFF]"
                    : isDragOver
                    ? "border-[#615FFF] ring-2 ring-[#615FFF]/50 scale-[1.02]"
                    : "border-[#1E293B] hover:border-[#314158]"
                }`}
              >
                {/* Ranking Position Badge & Drag Handle */}
                <div className="absolute top-2.5 right-2.5 z-10 flex items-center gap-1.5 bg-[#091122]/90 backdrop-blur-md px-2 py-0.5 rounded-md border border-[#314158] shadow-sm">
                  <span className="text-[10px] font-mono text-[#615FFF] font-bold">
                    #{index + 1}
                  </span>
                  <span className="text-[#90A1B9] text-[11px] select-none" title="Drag to reorder">
                    ⋮⋮
                  </span>
                </div>

                <div className="w-14 h-14 shrink-0 rounded-md bg-[#0a1628] flex items-center justify-center overflow-hidden border border-[#1E293B]">
                  {s.img ? (
                    <img
                      src={s.img}
                      alt={s.name}
                      className="w-full h-full object-contain p-1.5"
                      onError={(e) => {
                        e.currentTarget.style.display = "none";
                      }}
                    />
                  ) : (
                    <span className="text-[9px] text-[#4B576D]">// no icon</span>
                  )}
                </div>

                <div className="flex-1 min-w-0 pr-12">
                  <div className="flex items-center justify-between gap-1">
                    <p className="text-white text-[13px] font-semibold truncate">{s.name}</p>
                    {/* Quick Move Buttons */}
                    <div className="flex items-center gap-1 shrink-0">
                      <button
                        type="button"
                        disabled={index === 0 || busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveItem(index, -1);
                        }}
                        className="w-5 h-5 rounded bg-[#1E293B] hover:bg-[#314158] disabled:opacity-30 disabled:hover:bg-[#1E293B] text-[9px] text-white flex items-center justify-center transition-colors"
                        title="Move Up"
                      >
                        ▲
                      </button>
                      <button
                        type="button"
                        disabled={index === skills.length - 1 || busy}
                        onClick={(e) => {
                          e.stopPropagation();
                          moveItem(index, 1);
                        }}
                        className="w-5 h-5 rounded bg-[#1E293B] hover:bg-[#314158] disabled:opacity-30 disabled:hover:bg-[#1E293B] text-[9px] text-white flex items-center justify-center transition-colors"
                        title="Move Down"
                      >
                        ▼
                      </button>
                    </div>
                  </div>

                  <div className="mt-2.5 flex items-center gap-2">
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setModalState({ mode: "edit", skill: s });
                      }}
                      className="flex-1 text-[11px] py-1 px-2.5 rounded-md border border-[#314158] text-[#90A1B9] hover:border-[#90A1B9] hover:text-white duration-150"
                    >
                      edit
                    </button>
                    <button
                      onClick={(e) => {
                        e.stopPropagation();
                        setDeleteTarget(s);
                      }}
                      className="flex-1 text-[11px] py-1 px-2.5 rounded-md border border-[#FF6B6B44] text-[#FF6B6B] hover:border-[#FF6B6B] duration-150"
                    >
                      delete
                    </button>
                  </div>
                </div>
              </div>
            );
          })}
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
