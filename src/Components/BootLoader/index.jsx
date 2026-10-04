import React, { useState, useEffect, useCallback, useRef } from "react";

/* ============================================================
   BootLoader — Minimalist & Fast Developer Entry Loader
   ============================================================ */

export default function BootLoader({ onDone }) {
  const [progress, setProgress] = useState(0);
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
    }, 350);
  }, [onDone]);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    // Smooth, fast progression
    const interval = setInterval(() => {
      setProgress((prev) => {
        if (prev >= 100) {
          clearInterval(interval);
          setTimeout(finish, 100);
          return 100;
        }
        const step = Math.floor(Math.random() * 12) + 8;
        return Math.min(100, prev + step);
      });
    }, 35);

    const fallback = setTimeout(finish, 1200);

    return () => {
      clearInterval(interval);
      clearTimeout(fallback);
    };
  }, [finish]);

  return (
    <div
      onClick={finish}
      className="fixed inset-0 z-[99999] flex flex-col items-center justify-center cursor-pointer select-none bg-[#030712] overflow-hidden"
      style={{
        opacity: exiting ? 0 : 1,
        transition: "opacity 0.35s ease-out",
      }}
    >
      {/* Subtle center ambient glow */}
      <div
        className="absolute w-[320px] h-[320px] rounded-full blur-[90px] pointer-events-none opacity-20"
        style={{
          background: "radial-gradient(circle, #615FFF 0%, #38BDF8 60%, transparent 70%)",
        }}
      />

      <div className="relative flex flex-col items-center gap-6 z-10">
        {/* Minimalist Spinner & Monogram */}
        <div className="relative flex items-center justify-center w-16 h-16">
          <svg className="animate-spin w-16 h-16 text-[#615FFF]" viewBox="0 0 50 50">
            <circle
              className="opacity-20"
              cx="25"
              cy="25"
              r="20"
              fill="none"
              stroke="currentColor"
              strokeWidth="3"
            />
            <circle
              className="opacity-90"
              cx="25"
              cy="25"
              r="20"
              fill="none"
              stroke="url(#spinnerGrad)"
              strokeWidth="3"
              strokeDasharray="80"
              strokeDashoffset="60"
              strokeLinecap="round"
            />
            <defs>
              <linearGradient id="spinnerGrad" x1="0%" y1="0%" x2="100%" y2="100%">
                <stop offset="0%" stopColor="#615FFF" />
                <stop offset="100%" stopColor="#38BDF8" />
              </linearGradient>
            </defs>
          </svg>

          {/* Center Monogram */}
          <span className="absolute text-[13px] font-bold text-white tracking-wider">
            MMS
          </span>
        </div>

        {/* Minimal Progress Bar */}
        <div className="w-48 flex flex-col items-center gap-2">
          <div className="w-full h-1 bg-[#1E293B] rounded-full overflow-hidden">
            <div
              className="h-full bg-gradient-to-r from-[#615FFF] to-[#38BDF8] rounded-full transition-all duration-150 ease-out"
              style={{ width: `${progress}%` }}
            />
          </div>
          <div className="flex items-center justify-between w-full text-[10px] font-mono text-[#68768C]">
            <span>loading...</span>
            <span className="tabular-nums">{progress}%</span>
          </div>
        </div>
      </div>
    </div>
  );
}
