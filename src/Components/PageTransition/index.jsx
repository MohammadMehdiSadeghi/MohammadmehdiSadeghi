import React from "react";

/* ============================================================
   PageTransition — plain loading overlay between routes.
   Uses the same dots loader as the rest of the app (no terminal
   card, no shimmer, no typing). Timing is trimmed 200ms vs the
   old version.
   ============================================================ */

const HOLD_OUT = 1300; // veil fade-out (was 1500)
const FADE_IN = 300; // veil fade-in (was 550)

export default function PageTransition({ leaving }) {
  const [visible, setVisible] = React.useState(leaving);

  React.useEffect(() => {
    if (leaving) {
      setVisible(true);
    } else if (visible) {
      const t = setTimeout(() => setVisible(false), HOLD_OUT);
      return () => clearTimeout(t);
    }
  }, [leaving]); // eslint-disable-line react-hooks/exhaustive-deps

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center"
      style={{
        background: "#050B14",
        pointerEvents: leaving ? "auto" : "none",
        animation: leaving
          ? `veilIn ${FADE_IN}ms ease both`
          : "veilOut 1.2s ease both",
      }}
    >
      <div
        className="absolute w-[420px] h-[220px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(97,95,255,0.16) 0%, transparent 65%)",
        }}
      />
      <div className="relative flex flex-col items-center gap-4">
        <svg
          xmlns="http://www.w3.org/2000/svg"
          width="3em"
          height="3em"
          viewBox="0 0 24 24"
          color="#615FFF"
        >
          <circle cx="4" cy="12" r="3" fill="currentColor">
            <animate
              id="pt-a"
              fill="freeze"
              attributeName="opacity"
              begin="0;pt-c.end-0.25s"
              dur="0.75s"
              values="1;.2"
            />
          </circle>
          <circle cx="12" cy="12" r="3" fill="currentColor" opacity=".4">
            <animate
              fill="freeze"
              attributeName="opacity"
              begin="pt-a.begin+0.15s"
              dur="0.75s"
              values="1;.2"
            />
          </circle>
          <circle cx="20" cy="12" r="3" fill="currentColor" opacity=".3">
            <animate
              id="pt-c"
              fill="freeze"
              attributeName="opacity"
              begin="pt-a.begin+0.3s"
              dur="0.75s"
              values="1;.2"
            />
          </circle>
        </svg>
        <p
          className="text-[11px] tracking-wider"
          style={{ fontFamily: '"Fira", monospace', color: "#90A1B9" }}
        >
          loading
          <span className="loading-dots" />
        </p>
      </div>
    </div>
  );
}
