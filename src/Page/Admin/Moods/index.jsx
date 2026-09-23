import { useEffect, useState } from "react";
import { useAdminAuth } from "../../../Hooks/useAdminAuth";


export default function MoodsPage() {
  const { authFetch } = useAdminAuth();
  const [songs, setSongs] = useState(null);
  const [dims, setDims] = useState([]);
  const [editing, setEditing] = useState(null);
  const [draft, setDraft] = useState(null);
  const [saving, setSaving] = useState(false);
  const [msg, setMsg] = useState(null);
  const [filter, setFilter] = useState("");

  const load = async () => {
    try {
      const res = await authFetch("/api/admin/moods");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "load failed");
      setSongs(json.songs);
      setDims(json.dims);
    } catch (err) {
      setMsg({ type: "err", text: err.message });
    }
  };

  useEffect(() => {
    load();
  }, []);

  const openEdit = (row) => {
    setEditing(row.id);
    setDraft({
      moods: { ...(row.moods || {}) },
      summary: row.summary || "",
      audioMoodTag: row.audioMoodTag || "",
    });
    setMsg(null);
  };

  const save = async () => {
    setSaving(true);
    setMsg(null);
    try {
      const res = await authFetch("/api/admin/moods", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: editing, ...draft }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "save failed");
      setMsg({ type: "ok", text: "saved ✓" });
      setEditing(null);
      await load();
    } catch (err) {
      setMsg({ type: "err", text: err.message });
    } finally {
      setSaving(false);
    }
  };

  if (!songs) {
    return <p className="text-[#68768C] text-[12px]">loading…</p>;
  }

  const filtered = songs.filter(
    (s) =>
      !filter ||
      `${s.name} ${s.artist}`.toLowerCase().includes(filter.toLowerCase()),
  );

  return (
    <div className="flex flex-col gap-5 max-w-3xl">
      <div>
        <p className="text-[#615FFF] text-[12px]">$ vim ./moods.json</p>
        <h1 className="text-white text-[20px] mt-1">mood review</h1>
        <p className="text-[#68768C] text-[11px] mt-1">
          manual quality control for the mood-search engine — {songs.length} songs
        </p>
      </div>

      <input
        value={filter}
        onChange={(e) => setFilter(e.target.value)}
        placeholder="search title/artist…"
        className="bg-[#020618] py-2 px-3 outline-[#314158] outline-1 focus:outline-[#90A1B9] rounded-md text-[12px] text-[#90A1B9] w-full sm:w-72"
      />

      {msg && (
        <p
          className={`text-[11px] rounded-md px-3 py-2 w-fit ${
            msg.type === "err"
              ? "text-[#FF6B6B] bg-[#FF6B6B14] border border-[#FF6B6B33]"
              : "text-[#4ADE80] bg-[#4ADE8015] border border-[#4ADE8033]"
          }`}
        >
          // {msg.text}
        </p>
      )}

      <div className="flex flex-col gap-2">
        {filtered.map((row) => (
          <div key={row.id} className="rounded-lg border border-[#1E293B] bg-[#0F172B]">
            <button
              type="button"
              onClick={() => (editing === row.id ? setEditing(null) : openEdit(row))}
              className="w-full text-left px-4 py-3 flex flex-col gap-1.5"
            >
              <div className="flex items-center justify-between gap-3">
                <span className="text-[12px] text-white truncate">
                  {row.name}
                  <span className="text-[#68768C] text-[11px]"> — {row.artist}</span>
                </span>
                <span className="flex items-center gap-2 shrink-0">
                  <span
                    className={`text-[9px] px-1.5 py-0.5 rounded ${
                      row.lyricsStatus === "missing" || row.lyricsStatus === "none"
                        ? "text-[#FFB86A] bg-[#FFB86A15]"
                        : row.lyricsStatus === "fetched_by_agent"
                          ? "text-[#4ADE80] bg-[#4ADE8015]"
                          : "text-[#90A1B9] bg-[#90A1B915]"
                    }`}
                  >
                    {row.lyricsStatus === "fetched_by_agent"
                      ? "lyrics ✓"
                      : row.lyricsStatus === "missing" || row.lyricsStatus === "none"
                        ? "audio-only"
                        : row.lyricsStatus}
                  </span>
                  <span className="text-[#4B576D] text-[11px]">{editing === row.id ? "▲" : "▼"}</span>
                </span>
              </div>
              <div className="flex flex-wrap gap-1">
                {Object.entries(row.moods || {})
                  .sort(([, a], [, b]) => b - a)
                  .slice(0, 6)
                  .map(([d, v]) => (
                    <span
                      key={d}
                      className="text-[10px] px-2 py-0.5 rounded-full bg-[#615FFF22] text-[#C7D2FE]"
                    >
                      {d} {Math.round(v * 100)}
                    </span>
                  ))}
              </div>
            </button>

            {editing === row.id && draft && (
              <div className="px-4 pb-4 flex flex-col gap-3 border-t border-[#1E293B] pt-3">
                {dims.map((d) => {
                  const v = draft.moods[d] || 0;
                  return (
                    <div key={d} className="flex items-center gap-3">
                      <span className="text-[11px] text-[#90A1B9] w-24 shrink-0 capitalize">
                        {d}
                      </span>
                      <input
                        type="range"
                        min="0"
                        max="1"
                        step="0.05"
                        value={v}
                        onChange={(e) =>
                          setDraft((s) => ({
                            ...s,
                            moods: { ...s.moods, [d]: parseFloat(e.target.value) },
                          }))
                        }
                        className="flex-1 accent-[#615FFF] h-1"
                      />
                      <span className="text-[10px] text-[#4B576D] w-8 text-right tabular-nums">
                        {Math.round(v * 100)}
                      </span>
                    </div>
                  );
                })}

                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] text-[#90A1B9]">audio-mood label</span>
                  <input
                    value={draft.audioMoodTag}
                    onChange={(e) => setDraft((s) => ({ ...s, audioMoodTag: e.target.value }))}
                    placeholder="calm-melancholic"
                    className="bg-[#020618] py-1.5 px-2.5 outline-[#314158] outline-1 rounded-md text-[11px] text-[#90A1B9]"
                  />
                </label>

                <label className="flex flex-col gap-1.5">
                  <span className="text-[11px] text-[#90A1B9]">summary</span>
                  <textarea
                    value={draft.summary}
                    onChange={(e) => setDraft((s) => ({ ...s, summary: e.target.value }))}
                    rows={2}
                    className="bg-[#020618] py-1.5 px-2.5 outline-[#314158] outline-1 rounded-md text-[11px] text-[#90A1B9] resize-y"
                  />
                </label>

                <div className="flex gap-3">
                  <button
                    onClick={save}
                    disabled={saving}
                    className="text-[11px] px-4 py-2 rounded-md bg-[#90A1B9] text-[#0E1528] hover:bg-[#0E1528] hover:text-[#90A1B9] outline outline-[#90A1B9] duration-150 disabled:opacity-50"
                  >
                    {saving ? "saving…" : "save()"}
                  </button>
                  <button
                    onClick={() => setEditing(null)}
                    className="text-[11px] px-4 py-2 rounded-md border border-[#314158] text-[#90A1B9] hover:border-[#90A1B9] hover:text-white duration-150"
                  >
                    cancel
                  </button>
                </div>
              </div>
            )}
          </div>
        ))}
      </div>
    </div>
  );
}
