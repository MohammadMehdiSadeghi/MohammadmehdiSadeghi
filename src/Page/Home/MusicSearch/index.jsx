import React, { useState } from "react";
import Music from "../../../Components/Music";
import useClickTrack from "../../../Hooks/useClickTrack";
import { musicUrl } from "../../../lib/musicUrl";

const gray = "#90A1B9";

const API_BASE = "/api";

export default function MusicSearch() {
  const [isFocused, setIsFocused] = useState(false);
  const [searchTerm, setSearchTerm] = useState("");
  const [songData, setSongData] = useState(null);
  const [detectedMood, setDetectedMood] = useState(null);
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
    setSongData(null);
    setDetectedMood(null);

    const q = searchTerm.trim();
    if (!q) {
      setErrorMessage("Please enter search text");
      return;
    }
    if (q.length < 2) {
      setErrorMessage("Please write at least 2 characters");
      return;
    }

    setSearching(true);

    try {
      const res = await fetch(`${API_BASE}/mood-search?q=${encodeURIComponent(q)}`);
      const data = await res.json();

      if (data.error) {
        setErrorMessage(data.error);
        return;
      }

      const song = (data.results && data.results[0]) || data.song;
      if (song) {
        setSongData({ ...song, src: musicUrl(song.src) });
        if (data.mood && (data.mood.labelFa || data.mood.labelEn)) {
          setDetectedMood({
            fa: data.mood.labelFa,
            en: data.mood.labelEn,
            energy: data.mood.energy,
          });
        }
      } else {
        setErrorMessage("No matching song found. Please change the input");
      }
    } catch {
      setErrorMessage("Connection error. Please try again");
    } finally {
      setSearching(false);
    }
  };

  return (
    <div className="box-3d w-full max-w-full sm:max-w-md lg:max-w-[420px] bg-[#0F172B] p-5 sm:p-6 rounded-2xl border border-[#1E293B] shadow-xl">
      <form
        onSubmit={handleSubmit}
        className="w-full flex flex-col gap-3.5 items-center justify-center"
        style={{ color: gray }}
      >
        <label className="w-full flex flex-col gap-2 text-[12px] sm:text-[13px] text-[#90A1B9]">
          <span>Search a mood or feeling:</span>
          <input
            className="py-2.5 px-3.5 rounded-lg text-[13px] bg-[#020618] text-white focus:outline-0 duration-150 placeholder:text-[#4B576D]"
            style={{ border: `1px solid ${isFocused ? "#615FFF" : "#314158"}` }}
            type="text"
            maxLength={255}
            placeholder="Type something..."
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
          className="rounded-lg bg-[#1D293D] w-full text-[13px] font-medium text-white py-2.5 px-3 cursor-pointer ring-1 ring-[#314158] hover:bg-[#615FFF] hover:ring-[#615FFF] duration-150 disabled:opacity-50 transition-all flex items-center justify-center gap-2 shadow-sm"
          type="submit"
          disabled={searching}
        >
          {searching ? (
            <>
              <svg className="animate-spin h-3.5 w-3.5 text-white" fill="none" viewBox="0 0 24 24">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4"></circle>
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8v8H4z"></path>
              </svg>
              <span>Analyzing emotion...</span>
            </>
          ) : (
            "Search & Match Vibe"
          )}
        </button>
      </form>

      {errorMessage && (
        <div className="mt-3 text-center text-red-400 bg-red-500/10 py-2 px-3 rounded-lg flex items-center justify-center gap-2 text-[12px] border border-red-500/20">
          <svg className="w-3.5 h-3.5 text-red-400 shrink-0" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
            <path strokeLinecap="round" strokeLinejoin="round" d="M12 9v2m0 4h.01m-6.938 4h13.856c1.54 0 2.502-1.667 1.732-3L13.732 4c-.77-1.333-2.694-1.333-3.464 0L3.34 16c-.77 1.333.192 3 1.732 3z" />
          </svg>
          <span>{errorMessage}</span>
        </div>
      )}

      {songData && !searching && !errorMessage && (
        <div className="mt-3 flex flex-col gap-2">
          {detectedMood && (
            <div className="flex items-center justify-center gap-1.5 py-1 px-2.5 rounded-full bg-cyan-500/10 border border-cyan-500/20 text-cyan-300 text-[11px] text-center">
              <span className="inline-block w-1.5 h-1.5 rounded-full bg-cyan-400"></span>
              <span>Detected Vibe: <strong>{detectedMood.en || detectedMood.fa}</strong></span>
            </div>
          )}
          <Music songData={songData} autoPlay={false} />
        </div>
      )}
    </div>
  );
}

