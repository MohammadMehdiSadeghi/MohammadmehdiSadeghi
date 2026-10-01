import React, { useState, useEffect, useCallback, useRef } from "react";

/* ============================================================
   BootLoader — Epic Cyberpunk / Developer Boot Animation
   ============================================================ */

const BOOT_LOGS = [
  { text: "INITIALIZING KERNEL_ENV...", status: "OK", color: "#4ADE80" },
  { text: "LOADING DEV_STACK [REACT 19, TAILWIND, WEB_AUDIO]", status: "OK", color: "#4ADE80" },
  { text: "FETCHING PROFILE: Mohammad Mehdi Sadeghi", status: "DONE", color: "#615FFF" },
  { text: "MOUNTING MODULES: [BIO, PROJECTS, BLOG, SOUND_DSP]", status: "DONE", color: "#00D5BE" },
  { text: "SYSTEM STATUS: ALL SYSTEMS OPERATIONAL", status: "READY", color: "#FFB86A" },
];

export default function BootLoader({ onDone }) {
  const [progress, setProgress] = useState(0);
  const [logIndex, setLogIndex] = useState(0);
  const [exiting, setExiting] = useState(false);
  const doneRef = useRef(false);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setProgress(100);
    setExiting(true);
    setTimeout(() => {
      document.body.style.overflow = "";
      onDone?.();
    }, 450);
  }, [onDone]);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    // Progress animation increment
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(finish, 200);
          return 100;
        }
        const step = Math.floor(Math.random() * 8) + 4;
        const next = Math.min(100, prev + step);

        // Update logs based on progress thresholds
        if (next > 20 && next <= 40) setLogIndex(1);
        else if (next > 40 && next <= 65) setLogIndex(2);
        else if (next > 65 && next <= 88) setLogIndex(3);
        else if (next > 88) setLogIndex(4);

        return next;
      });
    }, 45);

    // Hard fallback timeout
    const fallback = setTimeout(finish, 2400);

    return () => {
      clearInterval(interval);
      clearTimeout(fallback);
    };
  }, [finish]);

  return (
    <div
      onClick={finish}
      className="fixed inset-0 z-[99999] flex items-center justify-center cursor-pointer select-none bg-[#030712] overflow-hidden"
      style={{
        opacity: exiting ? 0 : 1,
        transform: exiting ? "scale(1.04)" : "scale(1)",
        filter: exiting ? "blur(8px)" : "none",
        transition: "opacity 0.45s cubic-bezier(0.16, 1, 0.3, 1), transform 0.45s cubic-bezier(0.16, 1, 0.3, 1), filter 0.45s ease",
      }}
    >
      {/* ── Background Cyber Grid & Radiant Ambient Glows ── */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          backgroundImage:
            "linear-gradient(rgba(97,95,255,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(97,95,255,0.06) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />
      <div
        className="absolute w-[500px] h-[500px] rounded-full blur-[120px] pointer-events-none"
        style={{
          background: "radial-gradient(circle, rgba(97,95,255,0.22) 0%, rgba(0,213,190,0.12) 50%, transparent 70%)",
        }}
      />

      {/* ── Central Terminal HUD Card ── */}
      <div
        className="relative w-full max-w-[460px] mx-3 sm:mx-4 rounded-2xl border border-[#314158]/80 bg-[#0B1222]/90 backdrop-blur-xl p-4 sm:p-7 shadow-[0_0_60px_rgba(97,95,255,0.25)] flex flex-col gap-4 sm:gap-5"
        style={{
          animation: "cardIn 0.5s cubic-bezier(0.16, 1, 0.3, 1) both",
        }}
      >
        {/* Terminal Header Bar */}
        <div className="flex items-center justify-between border-b border-[#1E293B] pb-3">
          <div className="flex items-center gap-2">
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#FF5F56] shadow-[0_0_8px_rgba(255,95,86,0.6)]" />
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#FFBD2E] shadow-[0_0_8px_rgba(255,189,46,0.6)]" />
            <span className="w-2.5 h-2.5 sm:w-3 sm:h-3 rounded-full bg-[#27C93F] shadow-[0_0_8px_rgba(39,201,63,0.6)]" />
          </div>
          <p className="text-[10px] sm:text-[11px] font-mono text-[#90A1B9] tracking-wider">
            system_boot.sh // v2.4
          </p>
          <span className="text-[9px] sm:text-[10px] font-mono px-2 py-0.5 rounded bg-[#615FFF]/20 text-[#615FFF] border border-[#615FFF]/40 animate-pulse">
            BOOTING
          </span>
        </div>

        {/* Monogram Badge & Title */}
        <div className="flex items-center gap-3 sm:gap-3.5 pt-1">
          <div
            className="w-10 h-10 sm:w-12 sm:h-12 rounded-xl flex items-center justify-center font-bold text-[14px] sm:text-[16px] text-white shadow-lg shrink-0 relative overflow-hidden"
            style={{
              background: "linear-gradient(135deg, #615FFF 0%, #7C6CF6 50%, #00D5BE 100%)",
              boxShadow: "0 0 25px rgba(97,95,255,0.5)",
            }}
          >
            <span className="relative z-10 font-mono tracking-tight">MS</span>
            <div className="absolute inset-0 bg-white/20 animate-pulse" />
          </div>
          <div className="flex flex-col min-w-0">
            <h1 className="text-white text-[14px] sm:text-[17px] font-bold tracking-wide truncate">
              Mohammad Mehdi Sadeghi
            </h1>
            <p className="text-[11px] sm:text-[12px] text-[#00D5BE] font-mono truncate">
              &gt; Front-End Engineer &amp; UI Specialist
            </p>
          </div>
        </div>

        {/* Dynamic Terminal Boot Log Stream */}
        <div className="bg-[#030712]/90 rounded-xl p-3.5 border border-[#1E293B] font-mono text-[11px] sm:text-[12px] flex flex-col gap-1.5 min-h-[108px] overflow-hidden">
          {BOOT_LOGS.slice(0, logIndex + 1).map((log, idx) => (
            <div
              key={idx}
              className="flex items-center justify-between gap-2 leading-relaxed"
              style={{
                animation: "bootFadeIn 0.25s ease both",
              }}
            >
              <span className="text-[#90A1B9] truncate">
                <span className="text-[#615FFF] mr-1.5">&gt;</span>
                {log.text}
              </span>
              <span
                className="font-bold text-[10px] px-1.5 py-0.2 rounded shrink-0"
                style={{ color: log.color, backgroundColor: `${log.color}15` }}
              >
                [{log.status}]
              </span>
            </div>
          ))}
        </div>

        {/* High-Tech Progress Bar */}
        <div className="flex flex-col gap-2">
          <div className="flex justify-between items-center text-[11px] font-mono text-[#90A1B9]">
            <span className="flex items-center gap-1.5">
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D5BE] animate-ping" />
              SYSTEM_LOAD
            </span>
            <span className="text-white font-bold tabular-nums">
              {progress}%
            </span>
          </div>
          <div className="w-full h-2 rounded-full bg-[#1E293B] overflow-hidden p-[1px] relative">
            <div
              className="h-full rounded-full transition-all duration-75 relative"
              style={{
                width: `${progress}%`,
                background: "linear-gradient(90deg, #615FFF 0%, #7C6CF6 60%, #00D5BE 100%)",
                boxShadow: "0 0 14px rgba(0,213,190,0.8)",
              }}
            >
              <div
                className="absolute inset-0 bg-white/30"
                style={{ animation: "shimmer 1.2s infinite linear" }}
              />
            </div>
          </div>
        </div>

        {/* Click to skip tip */}
        <div className="text-center pt-1">
          <p className="text-[10px] font-mono text-[#68768C] hover:text-[#90A1B9] transition-colors">
            // click anywhere to launch immediately
          </p>
        </div>
      </div>
    </div>
  );
}
