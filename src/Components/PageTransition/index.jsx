import React from "react";
import { LoadDots, Monogram } from "../Loader";

/* ============================================================
   PageTransition — the loading veil between routes.

   Shares its visuals with BootLoader (src/Components/Loader) so the two
   cannot drift apart. No terminal card, no faked progress.

   Timing, trimmed twice on request:
     veil fade-in      550 → 350   (-200ms)
     veil fade-out    1500 → 1300  (-200ms)
     fade-out start   1300 → 1200  (-100ms)  ← now
   NAVIGATE_AFTER in App.jsx moved with it (900 → 700, now 600) so the
   router still swaps under a fully covered screen.
   ============================================================ */

const HOLD_OUT = 1200; // veil fade-out (was 1300 → -100ms)
const FADE_IN = 350; // veil fade-in (was 550)

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
        animation: leaving ? `veilIn ${FADE_IN}ms ease both` : "veilOut 1.2s ease both",
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
        <Monogram text="MM" size={40} radius={11} />
        <LoadDots id="pt" size="2.6em" />
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
