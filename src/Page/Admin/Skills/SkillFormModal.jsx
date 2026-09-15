import { useState } from "react";

export default function SkillFormModal({ mode, skill, busy, onClose, onSave }) {
  const [name, setName] = useState(skill?.name || "");
  const [img, setImg] = useState(skill?.img || "");
  const [error, setError] = useState("");

  const inputClass =
    "bg-[#020618] py-2.5 px-3 border-0 outline-[#314158] outline-1 hover:outline-[#90A1B9] focus:text-[#90A1B9] duration-150 rounded-md w-full text-[#90a1b9c7]";

  const handleSubmit = async (e) => {
    e.preventDefault();
    setError("");
    if (!name.trim()) {
      setError("Skill name is required");
      return;
    }

    try {
      await onSave({ name, img }, mode, skill?.id);
    } catch (err) {
      setError(err.message || "Save failed");
    }
  };

  return (
    <div className="fixed inset-0 z-50 flex items-center justify-center bg-black/60 px-4">
      <div className="w-full max-w-lg rounded-lg border border-[#1E293B] bg-[#0F172B] overflow-hidden max-h-[90vh] flex flex-col">
        <div className="h-10 shrink-0 flex items-center justify-between px-4 bg-[#0b1220] border-b border-[#1E293B]">
          <p className="text-[11px] text-[#68768C]">
            {mode === "edit" ? "edit-skill.json" : "new-skill.json"}
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
            <p className="text-[#90A1B9] text-[12px]">_name</p>
            <input
              className={inputClass}
              value={name}
              onChange={(e) => setName(e.target.value)}
              placeholder="React"
              required
            />
          </label>

          <label className="flex flex-col gap-1.5">
            <p className="text-[#90A1B9] text-[12px]">_icon-url</p>
            <input
              className={inputClass}
              value={img}
              onChange={(e) => setImg(e.target.value)}
              placeholder="/assets/Images/react.png"
            />
            <p className="text-[10px] text-[#4B576D]">
              // upload the icon to your host yourself, just paste the link here
            </p>
          </label>

          {img && (
            <div className="flex items-center gap-3 rounded-md border border-[#1E293B] bg-[#020618] p-3">
              <img
                src={img}
                alt="preview"
                className="w-10 h-10 object-contain shrink-0"
                onError={(e) => {
                  e.currentTarget.style.display = "none";
                }}
              />
              <span className="text-[10px] text-[#4B576D]">// icon preview</span>
            </div>
          )}

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
              {busy ? "saving..." : "save()"}
            </button>
          </div>
        </form>
      </div>
    </div>
  );
}
