import React, { useState } from "react";
import Music from "../../../Components/Music";
import useClickTrack from "../../../Hooks/useClickTrack";
import { musicUrl } from "../../../lib/musicUrl";

const gray = "#90A1B9";

const API_BASE = "/api";

export default function MusicSearch() {
  const [isFocused, setIsFocused] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [results, setResults] = useState(null); // top-3 list
  const [selected, setSelected] = useState(null); // currently playing result
  const [moodInfo, setMoodInfo] = useState(null);
  const [softMatch, setSoftMatch] = useState(false);
  const [searching, setSearching] = useState(false);
  const [errorMessage, setErrorMessage] = useState("");

  const { trackClick } = useClickTrack();

  const handleSubmit = async (e) => {
    e.preventDefault();
    trackClick({
      targetType: "button",
      targetId: "music-search",
      targetLabel: "Music Search",
    });
    setErrorMessage("");
    setResults(null);
    setSelected(null);
    setMoodInfo(null);

    const q = searchTerm.trim();
    if (!q) {
      setErrorMessage("Please enter search text");
      return;
    }

    setSearching(true);

    try {
      const res = await fetch(`${API_BASE}/mood-search?q=${encodeURIComponent(q)}`);
      const data = await res.json();

      if (data.error) {
        setErrorMessage(
          data.error.includes("short")
            ? "Please write a bit more (at least 3 characters)"
            : data.error.includes("long")
              ? "That's too long (max 120 words)"
              : data.error,
        );
        return;
      }

      setResults(data.results || []);
      setMoodInfo(data.mood || null);
      setSoftMatch(!!data.softMatch);
      if ((data.results || []).length) {
        setSelected({ ...data.results[0], src: musicUrl(data.results[0].src) });
      }
    } catch {
      setErrorMessage("Connection error. Please try again");
    } finally {
      setSearching(false);
    }
  };

  const moodChips = moodInfo
    ? Object.entries(moodInfo.moods || {})
        .sort(([, a], [, b]) => b - a)
        .slice(0, 4)
        .map(([dim]) => dim)
    : [];

  return (
    <div className="box-3d w-full max-w-[90vw] sm:max-w-md lg:w-lg bg-[#0F172B] py-8 px-6 sm:py-12 sm:px-12 rounded-3xl">
      <form
        onSubmit={handleSubmit}
        className="w-full flex flex-col gap-6 sm:gap-8 items-center justify-center"
        style={{ color: gray }}
      >
        <label className="w-full flex flex-col gap-4 text-[13px] sm:text-[14px]">
          Describe how you feel — we&apos;ll find the song
          <input
            className="py-3 px-4 rounded-lg text-[14px] sm:text-[14px] focus:outline-0 duration-100"
            style={{ border: `1px solid ${isFocused ? "#E2E8F0" : gray}` }}
            type="text"
            maxLength={400}
            value={searchTerm}
            onChange={(e) => {
              setSearchTerm(e.target.value);
              setErrorMessage("");
            }}
            onFocus={() => setIsFocused(true)}
            onBlur={() => setIsFocused(false)}
          />
        </label>
        <button
          className="rounded-lg bg-[#1D293D] w-full text-[14px] text-white py-3 px-3 cursor-pointer ring-2 ring-[#314158] hover:bg-[#0F172B] hover:ring-[#90A1B9] duration-200 disabled:opacity-50"
          type="submit"
          disabled={searching}
        >
          {searching ? "Reading your mood..." : "Find my song"}
        </button>
      </form>

      {errorMessage && (
        <div className="mt-4 text-center text-red-400 bg-red-500/10 py-3 px-4 rounded-lg">
          ⚠️ {errorMessage}
        </div>
      )}

      {moodChips.length > 0 && (
        <div className="mt-5 flex flex-wrap gap-2 justify-center">
          {moodChips.map((label) => (
            <span
              key={label}
              className="text-[11px] px-3 py-1 rounded-full bg-[#1D293D] text-[#90A1B9] border border-[#314158] capitalize"
            >
              {label}
            </span>
          ))}
        </div>
      )}

      {softMatch && selected && (
        <p className="mt-3 text-center text-[11px] text-[#90A1B9] opacity-80">
          Closest vibe we could find:
        </p>
      )}

      {selected && !searching && !errorMessage && (
        <div className="mt-6">
          <Music songData={selected} />
        </div>
      )}

      {results && results.length > 1 && (
        <div className="mt-6 flex flex-col gap-2">
          <p className="text-[11px] text-[#90A1B9] opacity-70 text-center">
            Other matches:
          </p>
          {results.slice(1).map((r) => (
            <button
              key={r.id}
              type="button"
              onClick={() => {
                trackClick({ targetType: "button", targetId: "music-alt", targetLabel: r.name });
                setSelected({ ...r, src: musicUrl(r.src) });
              }}
              className={`w-full text-right flex items-center justify-between gap-3 rounded-lg px-4 py-2.5 duration-150 border ${
                selected?.id === r.id
                  ? "bg-[#1D293D] border-[#90A1B9]"
                  : "bg-[#0F172B] border-[#314158] hover:border-[#90A1B9]"
              }`}
            >
              <span className="text-[12px] text-white truncate">
                {r.name}
                <span className="text-[#90A1B9] text-[11px]"> — {r.artist}</span>
              </span>
              <span className="text-[10px] text-[#90A1B9] tabular-nums shrink-0">
                {(r.score * 100).toFixed(0)}%
              </span>
            </button>
          ))}
        </div>
      )}
    </div>
  );
}
