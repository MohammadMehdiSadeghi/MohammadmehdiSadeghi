import React, { useState, useRef, useEffect } from "react";
import useClickTrack from "../../Hooks/useClickTrack";

/**
 * One shared Web-Audio graph for the whole player lifetime. Each <audio>
 * element may be attached to it only once (a second createMediaElementSource
 * on the same element throws) — React StrictMode double-invokes effects, and
 * the element itself persists across song changes, so we track attachments in
 * a WeakSet and never close the context while the page is alive.
 */
const sharedGraph = {
  ctx: null,
  analyser: null,
  attached: new WeakSet(),
};

function ensureGraph(audio) {
  const AudioCtx = window.AudioContext || window.webkitAudioContext;
  if (!AudioCtx) return null;

  if (!sharedGraph.ctx) {
    sharedGraph.ctx = new AudioCtx();
    sharedGraph.analyser = sharedGraph.ctx.createAnalyser();
    sharedGraph.analyser.fftSize = 2048;
    sharedGraph.analyser.smoothingTimeConstant = 0.82;
  }

  if (!sharedGraph.attached.has(audio)) {
    try {
      const source = sharedGraph.ctx.createMediaElementSource(audio);
      source.connect(sharedGraph.analyser);
      sharedGraph.analyser.connect(sharedGraph.ctx.destination);
      sharedGraph.attached.add(audio);
    } catch {
      // element already wired elsewhere — analyser just stays silent
    }
  }
  return sharedGraph.analyser;
}

function fillRoundedRect(g, x, y, w, h, r) {
  if (typeof g.roundRect === "function") {
    g.beginPath();
    g.roundRect(x, y, w, h, r);
    g.fill();
    return;
  }
  g.fillRect(x, y, w, h);
}

const BARS = 44;

export default function Music({ songData, autoPlay = false }) {
  const [isPlaying, setIsPlaying] = useState(Boolean(autoPlay));
  const { trackClick } = useClickTrack();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [isDownloading, setIsDownloading] = useState(false);

  const audioRef = useRef(null);
  const canvasRef = useRef(null);
  const analyserRef = useRef(null);
  const rafRef = useRef(null);
  const runIdRef = useRef(0);
  const isPlayingRef = useRef(false);

  // ── reset state whenever a new song arrives ──
  useEffect(() => {
    setIsPlaying(Boolean(autoPlay));
    setCurrentTime(0);
    setDuration(0);
    runIdRef.current++;
  }, [songData?.id, autoPlay]);

  // ── audio element listeners ──
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;

    const updateTime = () => setCurrentTime(audio.currentTime);
    const updateDuration = () => setDuration(audio.duration);
    const handleEnd = () => setIsPlaying(false);

    audio.addEventListener("timeupdate", updateTime);
    audio.addEventListener("loadedmetadata", updateDuration);
    audio.addEventListener("ended", handleEnd);
    return () => {
      audio.removeEventListener("timeupdate", updateTime);
      audio.removeEventListener("loadedmetadata", updateDuration);
      audio.removeEventListener("ended", handleEnd);
    };
  }, [songData]);

  // ── play / pause the element whenever isPlaying changes ──
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    if (isPlaying) {
      if (sharedGraph.ctx && sharedGraph.ctx.state === "suspended") {
        sharedGraph.ctx.resume().catch(() => {});
      }
      audio.play().catch(() => {});
    } else {
      audio.pause();
    }
  }, [isPlaying, songData?.src]);

  // ── keep isPlaying readable inside the draw loop without re-subscribing ──
  useEffect(() => {
    isPlayingRef.current = isPlaying;
  }, [isPlaying]);

  // ── wire the shared Web-Audio graph (element → analyser → speakers) ──
  useEffect(() => {
    const audio = audioRef.current;
    if (!audio) return;
    const analyser = ensureGraph(audio);
    if (!analyser) return;
    analyserRef.current = analyser;
    const token = runIdRef.current;

    return () => {
      runIdRef.current = token + 1;
    };
  }, [songData?.id]);

  // ── real-time spectrum visualizer: the bars ARE the beat. Loud/energetic
  //    passages push them up, quiet ones settle down — no fake labels. ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const prev = new Array(BARS).fill(0);
    const barCtx = canvas.getContext("2d");

    // idle motion + response follow the track's REAL analysis (DSP), not just tags
    const an = songData?.analysis || null;
    const energetic = /dance|party|energetic|upbeat/i.test(
      (songData?.tags || []).join(" ")
    );
    const energyPct = an ? an.energy : energetic ? 70 : 40;
    const hypeVibe = an?.vibe ? an.vibe.energetic : energetic ? 70 : 35;
    const bpm = an?.bpm || (energetic ? 122 : 92);
    const idleAmp = 0.03 + (energyPct / 100) * 0.10;       // calm piano breathes, loud tracks swell
    const idleSpeed = 60000 / Math.max(60, Math.min(176, bpm)) / 2; // pulse at the song's real half-beat
    const snappy = Math.min(1, Math.max(0, (hypeVibe - 20) / 60));  // 0 = floaty, 1 = punchy
    const attack = 0.30 + snappy * 0.30;                    // energetic → bars jump fast
    const release = 0.24 + (1 - snappy) * 0.14;             // calm → bars settle slowly
    const gain = 1 + (1 - energyPct / 100) * 0.85;          // quiet masters still show their beat

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);
      const analyser = analyserRef.current;
      if (!analyser) return;

      const width = canvas.clientWidth || 300;
      const height = canvas.clientHeight || 60;
      if (canvas.width !== Math.floor(width * dpr)) canvas.width = Math.floor(width * dpr);
      if (canvas.height !== Math.floor(height * dpr)) canvas.height = Math.floor(height * dpr);
      barCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      barCtx.clearRect(0, 0, width, height);

      const binCount = analyser.frequencyBinCount;
      const data = new Uint8Array(binCount);
      analyser.getByteFrequencyData(data);

      const usable = Math.min(binCount, 512);
      const active = isPlayingRef.current;
      const slot = width / BARS;

      for (let b = 0; b < BARS; b++) {
        const start = Math.max(Math.floor(Math.pow(b / BARS, 1.5) * usable), 0);
        const end = Math.max(Math.floor(Math.pow((b + 1) / BARS, 1.5) * usable), start + 1);
        let sum = 0;
        for (let i = start; i < end; i++) sum += data[i];
        const level = sum / (end - start) / 255;
        const target = active
          ? Math.min(1, level * gain)
          : idleAmp * (0.5 + 0.5 * Math.sin(Date.now() / idleSpeed + b * 0.7));
        // attack/release from the vibe: hype = jump fast, calm = glide slow
        const smoothed = prev[b] * (1 - (target > prev[b] ? attack : release)) + target * (target > prev[b] ? attack : release);
        prev[b] = smoothed;

        const barH = Math.max(3, smoothed * height * 0.92);
        const x = b * slot + slot * 0.18;
        const w = slot * 0.64;
        // palette: accent #615FFF → teal #00D5BE
        const hue = 240 - (b / BARS) * 66;
        const light = 66 - (b / BARS) * 24;
        barCtx.fillStyle = active
          ? `hsla(${hue}, 95%, ${light}%, 0.95)`
          : "hsla(240, 30%, 60%, 0.30)";
        const y = height - barH;
        const r = Math.min(w / 2, 2.5);
        fillRoundedRect(barCtx, x, y, w, barH, r);
      }
    };

    rafRef.current = requestAnimationFrame(draw);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [songData?.id, songData?.analysis, songData?.tags]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.volume = volume;
  }, [volume]);

  if (!songData) return null;

  const togglePlayPause = () => {
    trackClick({
      targetType: "button",
      targetId: isPlaying ? "music-pause" : "music-play",
      targetLabel: isPlaying ? "Pause Music" : "Play Music",
    });
    const next = !isPlaying;
    const ctx = sharedGraph.ctx;
    if (next && ctx && ctx.state === "suspended") {
      ctx.resume().catch(() => {});
    }
    setIsPlaying(next);
  };

  const handleTimeChange = (e) => {
    const newTime = parseFloat(e.target.value);
    setCurrentTime(newTime);
    if (audioRef.current) audioRef.current.currentTime = newTime;
  };

  const handleVolumeChange = (e) => setVolume(parseFloat(e.target.value));

  const formatTime = (time) => {
    if (isNaN(time)) return "0:00";
    const minutes = Math.floor(time / 60);
    const seconds = Math.floor(time % 60);
    return `${minutes}:${seconds.toString().padStart(2, "0")}`;
  };

  const handleDownload = async () => {
    trackClick({
      targetType: "button",
      targetId: "music-download",
      targetLabel: `Download ${songData.name || "Song"}`,
    });
    if (!songData?.src) return;
    setIsDownloading(true);
    try {
      const response = await fetch(songData.src);
      const blob = await response.blob();
      const url = window.URL.createObjectURL(blob);
      const a = document.createElement("a");
      a.style.display = "none";
      a.href = url;
      const fileName = `${songData.artist ? `${songData.artist} - ` : ""}${songData.name || "song"}.mp3`;
      a.download = fileName;
      document.body.appendChild(a);
      a.click();
      window.URL.revokeObjectURL(url);
      document.body.removeChild(a);
    } catch {
      window.open(songData.src, "_blank");
    } finally {
      setIsDownloading(false);
    }
  };

  const handleAudioError = () => {
    const audio = audioRef.current;
    if (audio && audio.getAttribute("crossorigin")) {
      audio.removeAttribute("crossorigin");
      audio.load();
      if (isPlaying) {
        audio.play().catch(() => {});
      }
    }
  };

  return (
    <div className="w-full mt-3 bg-[#0B1222]/90 rounded-xl p-3 sm:p-3.5 border border-[#1E293B] shadow-lg flex flex-col gap-2.5">
      <audio
        ref={audioRef}
        src={songData.src}
        preload="metadata"
        crossOrigin="anonymous"
        onError={handleAudioError}
      />

      {/* Track header */}
      <div className="flex items-center justify-between gap-2">
        <div className="min-w-0 flex-1">
          <h4 className="text-[13px] sm:text-[14px] font-semibold text-[#E2E8F0] truncate">
            {songData.name || "Track"}
          </h4>
          {songData.artist && (
            <p className="text-[11px] text-[#90A1B9] truncate">{songData.artist}</p>
          )}
        </div>

        {/* Visualizer canvas */}
        <div className="w-24 sm:w-28 h-6 shrink-0 bg-[#020618] rounded border border-[#1E293B] overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full h-full block"
          />
        </div>
      </div>

      {/* Progress slider */}
      <div className="flex flex-col gap-1">
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={handleTimeChange}
          className="w-full h-1.5 rounded-lg appearance-none cursor-pointer accent-[#615FFF]"
          style={{
            background: `linear-gradient(to right, #615FFF 0%, #615FFF ${
              (currentTime / duration) * 100 || 0
            }%, #1E293B ${(currentTime / duration) * 100 || 0}%, #1E293B 100%)`,
          }}
        />
        <div className="flex justify-between text-[#68768C] font-mono text-[10px]">
          <span>{formatTime(currentTime)}</span>
          <span>{formatTime(duration)}</span>
        </div>
      </div>

      {/* Action Controls */}
      <div className="flex items-center justify-between gap-2 pt-0.5 border-t border-[#1E293B]/60">
        <div className="flex items-center gap-2">
          <button
            onClick={togglePlayPause}
            className="bg-[#615FFF] hover:bg-[#7573FF] text-white rounded-lg p-2 transition-all duration-150 cursor-pointer shrink-0 flex items-center justify-center shadow-md active:scale-95"
            aria-label={isPlaying ? "Pause" : "Play"}
          >
            {isPlaying ? (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <rect x="6" y="4" width="4" height="16" rx="1" />
                <rect x="14" y="4" width="4" height="16" rx="1" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="currentColor" viewBox="0 0 24 24">
                <path d="M8 5v14l11-7z" />
              </svg>
            )}
          </button>

          <button
            onClick={handleDownload}
            disabled={isDownloading}
            className="text-[#90A1B9] hover:text-white p-2 rounded-lg hover:bg-[#1E293B] transition-all duration-150 cursor-pointer disabled:opacity-50 shrink-0"
            title="Download MP3"
            aria-label="Download MP3"
          >
            {isDownloading ? (
              <svg className="w-3.5 h-3.5 animate-spin text-[#615FFF]" viewBox="0 0 24 24" fill="none">
                <circle className="opacity-25" cx="12" cy="12" r="10" stroke="currentColor" strokeWidth="4" />
                <path className="opacity-75" fill="currentColor" d="M4 12a8 8 0 018-8V0C5.373 0 0 5.373 0 12h4z" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" strokeWidth="2" viewBox="0 0 24 24">
                <path strokeLinecap="round" strokeLinejoin="round" d="M4 16v1a3 3 0 003 3h10a3 3 0 003-3v-1m-4-4l-4 4m0 0l-4-4m4 4V4" />
              </svg>
            )}
          </button>
        </div>

        {/* Volume Slider */}
        <div className="flex items-center gap-1.5 w-20 sm:w-24 shrink-0">
          <svg
            className="w-3.5 h-3.5 text-[#68768C] shrink-0"
            fill="currentColor"
            viewBox="0 0 24 24"
          >
            <path d="M3 10v4h4l5 5V5L7 10H3z" />
          </svg>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="flex-1 h-1 bg-[#1E293B] rounded-lg appearance-none cursor-pointer accent-[#615FFF]"
            aria-label="Volume"
          />
        </div>
      </div>
    </div>
  );
}
