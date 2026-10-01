import React, { useState, useRef, useEffect } from "react";
import useClickTrack from "../../Hooks/useClickTrack";

/**
 * One shared Web-Audio graph for the whole player lifetime.
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
      // element already attached elsewhere
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

const BARS = 36;

export default function Music({ songData, autoPlay = false }) {
  const [isPlaying, setIsPlaying] = useState(Boolean(autoPlay));
  const { trackClick } = useClickTrack();
  const [currentTime, setCurrentTime] = useState(0);
  const [duration, setDuration] = useState(0);
  const [volume, setVolume] = useState(1);
  const [prevVolume, setPrevVolume] = useState(1);
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

  // ── wire the shared Web-Audio graph ──
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

  // ── real-time spectrum visualizer ──
  useEffect(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    const dpr = window.devicePixelRatio || 1;
    const prev = new Array(BARS).fill(0);
    const barCtx = canvas.getContext("2d");

    const an = songData?.analysis || null;
    const energetic = /dance|party|energetic|upbeat/i.test(
      (songData?.tags || []).join(" ")
    );
    const energyPct = an ? an.energy : energetic ? 70 : 40;
    const gain = 1 + (1 - energyPct / 100) * 0.85;

    const draw = () => {
      rafRef.current = requestAnimationFrame(draw);

      const width = canvas.clientWidth || 96;
      const height = canvas.clientHeight || 24;
      if (canvas.width !== Math.floor(width * dpr)) canvas.width = Math.floor(width * dpr);
      if (canvas.height !== Math.floor(height * dpr)) canvas.height = Math.floor(height * dpr);
      barCtx.setTransform(dpr, 0, 0, dpr, 0, 0);
      barCtx.clearRect(0, 0, width, height);

      const analyser = analyserRef.current;
      const active = isPlayingRef.current && analyser;
      let data = null;
      let binCount = 0;
      if (active) {
        binCount = analyser.frequencyBinCount;
        data = new Uint8Array(binCount);
        analyser.getByteFrequencyData(data);
      }

      const usable = binCount ? Math.min(binCount, 512) : 1;
      const slot = width / BARS;
      const now = Date.now();

      for (let b = 0; b < BARS; b++) {
        let level = 0;
        if (active && data) {
          const start = Math.max(Math.floor(Math.pow(b / BARS, 1.5) * usable), 0);
          const end = Math.max(Math.floor(Math.pow((b + 1) / BARS, 1.5) * usable), start + 1);
          let sum = 0;
          for (let i = start; i < end; i++) sum += data[i];
          level = sum / (end - start) / 255;
        }

        const target = active
          ? Math.min(1, level * gain)
          : 0.15 + 0.12 * Math.sin(now / 500 + b * 0.5);

        const attack = 0.40;
        const release = 0.25;
        const smoothed = prev[b] * (1 - (target > prev[b] ? attack : release)) + target * (target > prev[b] ? attack : release);
        prev[b] = smoothed;

        const barH = Math.max(2, smoothed * height * 0.88);
        const x = b * slot + slot * 0.15;
        const w = Math.max(1.5, slot * 0.70);
        const hue = 240 - (b / BARS) * 60;
        const light = 66 - (b / BARS) * 20;
        barCtx.fillStyle = active
          ? `hsla(${hue}, 95%, ${light}%, 0.95)`
          : `hsla(${hue}, 60%, 55%, 0.40)`;
        const y = height - barH;
        const r = Math.min(w / 2, 1.5);
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

  const toggleMute = () => {
    if (volume > 0) {
      setPrevVolume(volume);
      setVolume(0);
    } else {
      setVolume(prevVolume || 0.8);
    }
  };

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
    <div className="w-full mt-3 bg-[#0B1222]/95 rounded-xl p-3 sm:p-3.5 border border-[#1E293B] shadow-lg flex flex-col gap-2.5 overflow-hidden box-border">
      <style>{`
        .music-progress {
          -webkit-appearance: none;
          appearance: none;
          height: 6px;
          border-radius: 9999px;
          outline: none;
        }
        .music-progress::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #615FFF;
          cursor: pointer;
          box-shadow: 0 0 6px rgba(97,95,255,0.7);
          border: 2px solid #ffffff;
        }
        .music-progress::-moz-range-thumb {
          width: 12px;
          height: 12px;
          border-radius: 50%;
          background: #615FFF;
          cursor: pointer;
          box-shadow: 0 0 6px rgba(97,95,255,0.7);
          border: 2px solid #ffffff;
        }
        .music-vol {
          -webkit-appearance: none;
          appearance: none;
          height: 4px;
          border-radius: 9999px;
          outline: none;
        }
        .music-vol::-webkit-slider-thumb {
          -webkit-appearance: none;
          appearance: none;
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #A5B4FC;
          cursor: pointer;
          border: 1.5px solid #ffffff;
        }
        .music-vol::-moz-range-thumb {
          width: 10px;
          height: 10px;
          border-radius: 50%;
          background: #A5B4FC;
          cursor: pointer;
          border: 1.5px solid #ffffff;
        }
      `}</style>

      <audio
        ref={audioRef}
        src={songData.src}
        preload="metadata"
        crossOrigin="anonymous"
        onError={handleAudioError}
      />

      {/* Track header & visualizer */}
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
        <div className="w-20 sm:w-24 h-6 shrink-0 bg-[#020618] rounded border border-[#1E293B] overflow-hidden">
          <canvas
            ref={canvasRef}
            className="w-full h-full block"
          />
        </div>
      </div>

      {/* Progress slider */}
      <div className="flex flex-col gap-1 px-0.5">
        <input
          type="range"
          min="0"
          max={duration || 0}
          value={currentTime}
          onChange={handleTimeChange}
          className="music-progress w-full cursor-pointer bg-[#1E293B]"
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

      {/* Action Controls & Volume */}
      <div className="flex items-center justify-between gap-2 pt-1 border-t border-[#1E293B]/60">
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

        {/* Bounded Volume Slider with zero overflow */}
        <div className="flex items-center gap-1.5 px-1 shrink-0 max-w-[110px] sm:max-w-[130px]">
          <button
            type="button"
            onClick={toggleMute}
            className="text-[#68768C] hover:text-[#90A1B9] p-1 rounded transition-colors cursor-pointer shrink-0"
            title={volume === 0 ? "Unmute" : "Mute"}
          >
            {volume === 0 ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M17 14l2-2m0 0l2-2m-2 2l-2-2m2 2l2 2" />
              </svg>
            ) : volume < 0.5 ? (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072" />
              </svg>
            ) : (
              <svg className="w-3.5 h-3.5" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
                <path strokeLinecap="round" strokeLinejoin="round" d="M5.586 15H4a1 1 0 01-1-1v-4a1 1 0 011-1h1.586l4.707-4.707C10.923 3.663 12 4.109 12 5v14c0 .891-1.077 1.337-1.707.707L5.586 15z" />
                <path strokeLinecap="round" strokeLinejoin="round" d="M15.536 8.464a5 5 0 010 7.072m2.828-9.9a9 9 0 010 12.728" />
              </svg>
            )}
          </button>
          <input
            type="range"
            min="0"
            max="1"
            step="0.01"
            value={volume}
            onChange={handleVolumeChange}
            className="music-vol w-12 sm:w-16 cursor-pointer"
            style={{
              background: `linear-gradient(to right, #615FFF 0%, #615FFF ${volume * 100}%, #1E293B ${volume * 100}%, #1E293B 100%)`,
            }}
            aria-label="Volume"
          />
        </div>
      </div>
    </div>
  );
}
