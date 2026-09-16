import React from "react";

/* ════════════════════════════════════════════════════════════════════
   Shared loading visuals.

   When the terminal intro was removed the loading screen was reduced to
   three dots and the word "loading" — plain enough that the user asked for
   it to look like something again. This restores a real presence while
   keeping the intro GONE: no typing, no terminal card, no faked progress.
   It is built from the same language as the project cards, so it reads as
   part of the site: faint grid texture, two radial purple glows, four
   corner brackets, the monogram badge and the wordmark.

   Both the first-paint loader (BootLoader) and the between-pages veil
   (PageTransition) render these pieces, so the two can never drift apart.
   ════════════════════════════════════════════════════════════════════ */

export const ACCENT = "#615FFF";
export const ACCENT_2 = "#7C6CF6";
export const SURFACE = "#050B14";

/* The three-dot spinner the rest of the app uses. `id` must be unique per
   mounted instance — the SVG <animate> elements reference each other by id,
   so two loaders on screen at once would otherwise cross-wire. */
export function LoadDots({ id = "ld", size = "3em", color = ACCENT }) {
  return (
    <svg xmlns="http://www.w3.org/2000/svg" width={size} height={size} viewBox="0 0 24 24" color={color}>
      <circle cx="4" cy="12" r="3" fill="currentColor">
        <animate id={`${id}-a`} fill="freeze" attributeName="opacity" begin={`0;${id}-c.end-0.25s`} dur="0.75s" values="1;.2" />
      </circle>
      <circle cx="12" cy="12" r="3" fill="currentColor" opacity=".4">
        <animate fill="freeze" attributeName="opacity" begin={`${id}-a.begin+0.15s`} dur="0.75s" values="1;.2" />
      </circle>
      <circle cx="20" cy="12" r="3" fill="currentColor" opacity=".3">
        <animate id={`${id}-c`} fill="freeze" attributeName="opacity" begin={`${id}-a.begin+0.3s`} dur="0.75s" values="1;.2" />
      </circle>
    </svg>
  );
}

/* four corner brackets, the same "techy frame" ticks the cards carry */
function Corners({ size = 18, inset = 0, color = "rgba(97,95,255,0.45)" }) {
  const common = { position: "absolute", width: size, height: size, pointerEvents: "none" };
  const w = `2px solid ${color}`;
  return (
    <>
      <span style={{ ...common, top: inset, left: inset, borderTop: w, borderLeft: w }} />
      <span style={{ ...common, top: inset, right: inset, borderTop: w, borderRight: w }} />
      <span style={{ ...common, bottom: inset, left: inset, borderBottom: w, borderLeft: w }} />
      <span style={{ ...common, bottom: inset, right: inset, borderBottom: w, borderRight: w }} />
    </>
  );
}

/* the app-icon monogram: first letters of the name, on the one brand
   gradient (never indexed per-card — a rotating palette was rejected) */
export function Monogram({ text = "MM", size = 46, radius = 12 }) {
  return (
    <span
      className="inline-flex items-center justify-center shrink-0 select-none"
      style={{
        width: size,
        height: size,
        borderRadius: radius,
        background: `linear-gradient(135deg, ${ACCENT} 0%, ${ACCENT_2} 100%)`,
        color: "#fff",
        fontWeight: 700,
        fontSize: size * 0.4,
        letterSpacing: "0.02em",
        boxShadow: "0 8px 26px -8px rgba(97,95,255,0.75)",
        animation: "loadMark 2.6s ease-in-out infinite",
      }}
    >
      {text}
    </span>
  );
}

/* Wraps loader content in the site's visual frame. `full` fills the viewport
   (first paint); otherwise it is the compact centred panel used by the
   between-pages veil. */
export function LoaderFrame({ children, full = false }) {
  const panel = (
    <div
      className="relative flex flex-col items-center"
      style={{
        width: "min(430px, calc(100vw - 40px))",
        padding: "30px 34px 26px",
        background: "rgba(8,18,36,0.72)",
        border: "1px solid #90a1b933",
        borderRadius: 14,
        overflow: "hidden",
        animation: "loadPanel 380ms cubic-bezier(.22,.9,.28,1) both",
      }}
    >
      {/* 2px brand accent line along the top, like the cards */}
      <span
        style={{
          position: "absolute",
          top: 0,
          left: 0,
          right: 0,
          height: 2,
          background: `linear-gradient(90deg, transparent, ${ACCENT}, ${ACCENT_2}, transparent)`,
        }}
      />
      {/* faint grid texture + inner glow */}
      <span
        style={{
          position: "absolute",
          inset: 0,
          backgroundImage:
            "linear-gradient(to right, rgba(144,161,185,0.06) 1px, transparent 1px), linear-gradient(to bottom, rgba(144,161,185,0.06) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
          maskImage: "radial-gradient(ellipse at 50% 40%, #000 40%, transparent 78%)",
          WebkitMaskImage: "radial-gradient(ellipse at 50% 40%, #000 40%, transparent 78%)",
          pointerEvents: "none",
        }}
      />
      <span
        style={{
          position: "absolute",
          width: "88%",
          height: 200,
          top: "50%",
          left: "50%",
          transform: "translate(-50%,-50%)",
          background:
            "radial-gradient(ellipse at center, rgba(97,95,255,0.20) 0%, transparent 68%)",
          pointerEvents: "none",
        }}
      />
      <Corners inset={9} />
      <div className="relative w-full flex flex-col items-center">{children}</div>
    </div>
  );

  if (!full) return panel;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center"
      style={{ background: SURFACE }}
    >
      {/* ambient glows behind the panel */}
      <span
        style={{
          position: "absolute",
          width: "min(620px, 90vw)",
          height: 380,
          maxHeight: "70vh",
          background: "radial-gradient(ellipse at center, rgba(97,95,255,0.13) 0%, transparent 66%)",
          pointerEvents: "none",
        }}
      />
      {panel}
    </div>
  );
}
