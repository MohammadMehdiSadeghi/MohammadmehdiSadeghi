import React, { useEffect, useState, useMemo } from "react";

/* ============================================================
   PageTransition — Staggered Cyber Shutter Curtain & Route HUD
   ============================================================ */

const ROUTE_NAMES = {
  "/": "_Home.jsx",
  "/about": "_About.jsx",
  "/project": "_Project.jsx",
  "/blog": "_Blog.jsx",
  "/contact": "_Contact.jsx",
};

export default function PageTransition({ path = "/", leaving }) {
  const [visible, setVisible] = useState(leaving);

  useEffect(() => {
    if (leaving) {
      setVisible(true);
    } else if (visible) {
      const timer = setTimeout(() => setVisible(false), 550);
      return () => clearTimeout(timer);
    }
  }, [leaving, visible]);

  const targetLabel = useMemo(() => {
    if (ROUTE_NAMES[path]) return ROUTE_NAMES[path];
    if (path.startsWith("/blog/")) return `_Post[${path.split("/").pop()}].md`;
    return `_${path.replace("/", "") || "Page"}.jsx`;
  }, [path]);

  if (!visible) return null;

  // 5 Staggered vertical shutters
  const bars = [0, 1, 2, 3, 4];

  return (
    <div className="fixed inset-0 z-[99998] pointer-events-none flex flex-col justify-between overflow-hidden">
      {/* ── 5 Staggered Vertical Cyber Columns ── */}
      <div className="absolute inset-0 flex w-full h-full">
        {bars.map((i) => (
          <div
            key={i}
            className="flex-1 h-full relative"
            style={{
              background: i % 2 === 0 ? "#070D1A" : "#0A1326",
              borderRight: "1px solid rgba(97,95,255,0.15)",
              transform: leaving ? "translateY(0%)" : "translateY(100%)",
              animation: leaving
                ? `shutterDropIn 0.38s cubic-bezier(0.76, 0, 0.24, 1) ${i * 45}ms both`
                : `shutterDropOut 0.42s cubic-bezier(0.76, 0, 0.24, 1) ${i * 40}ms both`,
            }}
          >
            {/* Top/Bottom laser accent lines */}
            <div
              className="absolute top-0 inset-x-0 h-[2px]"
              style={{
                background: "linear-gradient(90deg, transparent 0%, #615FFF 50%, #00D5BE 100%)",
                opacity: 0.8,
              }}
            />
            <div
              className="absolute bottom-0 inset-x-0 h-[2px]"
              style={{
                background: "linear-gradient(90deg, #00D5BE 0%, #615FFF 50%, transparent 100%)",
                opacity: 0.8,
              }}
            />
          </div>
        ))}
      </div>

      {/* ── Center Futuristic Route HUD Badge ── */}
      <div
        className="relative z-10 m-auto flex flex-col items-center justify-center gap-3 p-6 rounded-2xl bg-[#030712]/80 backdrop-blur-md border border-[#314158]/60 shadow-[0_0_50px_rgba(97,95,255,0.35)]"
        style={{
          opacity: leaving ? 1 : 0,
          transform: leaving ? "scale(1)" : "scale(0.9)",
          transition: "all 0.3s cubic-bezier(0.16, 1, 0.3, 1)",
        }}
      >
        {/* Animated Cyber Ring / Spinner */}
        <div className="relative w-12 h-12 flex items-center justify-center">
          <div
            className="absolute inset-0 rounded-full border-2 border-transparent border-t-[#615FFF] border-r-[#00D5BE] animate-spin"
            style={{ animationDuration: "0.8s" }}
          />
          <div
            className="absolute inset-1.5 rounded-full border-2 border-transparent border-b-[#FFB86A] border-l-[#C27AFF] animate-spin"
            style={{ animationDuration: "1.2s", animationDirection: "reverse" }}
          />
          <span className="text-[#00D5BE] font-mono text-[11px] font-bold">&gt;_</span>
        </div>

        {/* Target Route Tag */}
        <div className="flex flex-col items-center gap-1 font-mono text-center">
          <div className="flex items-center gap-2 text-[13px] sm:text-[14px] font-bold text-white tracking-wider">
            <span className="text-[#615FFF]">$</span>
            <span>{targetLabel}</span>
          </div>
          <p className="text-[10px] text-[#90A1B9] tracking-widest uppercase">
            // routing component...
          </p>
        </div>
      </div>
    </div>
  );
}
