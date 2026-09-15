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

    const q = searchTerm.trim();
    if (!q) {
      setErrorMessage("Please enter search text");
      return;
    }
    if (q.length < 3) {
      setErrorMessage("Please write at least 3 characters");
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
    <div className="box-3d w-full max-w-[90vw] sm:max-w-md lg:w-lg bg-[#0F172B] py-8 px-6 sm:py-12 sm:px-12 rounded-3xl">
      <form
        onSubmit={handleSubmit}
        className="w-full flex flex-col gap-6 sm:gap-8 items-center justify-center"
        style={{ color: gray }}
      >
        <label className="w-full flex flex-col gap-4 text-[13px] sm:text-[14px]">
          Write something so you can feel the processing power.
          <input
            className="py-3 px-4 rounded-lg text-[14px] sm:text-[14px] focus:outline-0 duration-100"
            style={{ border: `1px solid ${isFocused ? "#E2E8F0" : gray}` }}
            type="text"
            maxLength={255}
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
          {searching ? "Searching..." : "Search"}
        </button>
      </form>

      {errorMessage && (
        <div className="mt-4 text-center text-red-400 bg-red-500/10 py-3 px-4 rounded-lg">
          ⚠️ {errorMessage}
        </div>
      )}

      {songData && !searching && !errorMessage && (
        <div className="mt-6">
          <Music songData={songData} />
        </div>
      )}
    </div>
  );
}
