import React from "react";

/* ============================================================
   PageTransition — soft veil + an elegant mini terminal card
   A dark veil fades in, a small glassy terminal card shows a
   braille spinner + the page command, a thin indeterminate
   shimmer line runs under it, then everything fades away.
   ============================================================ */

const PAGE_CMDS = {
  "/": "load home",
  "/about": "load about",
  "/project": "load projects",
  "/contact": "load contact",
};

const SPINNER = ["⠋", "⠙", "⠹", "⠸", "⠼", "⠴", "⠦", "⠧", "⠇", "⠏"];

export default function PageTransition({ path, leaving }) {
  const cmd = PAGE_CMDS[path] || "load …";
  const [visible, setVisible] = React.useState(leaving);
  const [frame, setFrame] = React.useState(0);

  React.useEffect(() => {
    if (leaving) {
      setVisible(true);
    } else if (visible) {
      // veil fades away after the page has swapped underneath
      const t = setTimeout(() => setVisible(false), 1500);
      return () => clearTimeout(t);
    }
  }, [leaving]); // eslint-disable-line react-hooks/exhaustive-deps

  // braille spinner while covering
  React.useEffect(() => {
    if (!visible) return;
    const spin = setInterval(() => setFrame((f) => (f + 1) % SPINNER.length), 80);
    return () => clearInterval(spin);
  }, [visible]);

  if (!visible) return null;

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center"
      style={{
        background: "#050B14",
        pointerEvents: leaving ? "auto" : "none",
        animation: leaving ? "veilIn .55s ease both" : "veilOut 1.4s ease both",
      }}
    >
      {/* subtle radial glow behind the card */}
      <div
        className="absolute w-[420px] h-[220px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(97,95,255,0.16) 0%, transparent 65%)",
        }}
      />

      {/* mini terminal card */}
      <div
        className="relative rounded-xl overflow-hidden"
        style={{
          fontFamily: '"Fira", monospace',
          width: "min(400px, 88vw)",
          background: "rgba(8,18,36,0.85)",
          backdropFilter: "blur(10px)",
          border: "1px solid rgba(97,95,255,0.35)",
          boxShadow:
            "0 0 70px rgba(97,95,255,0.22), 0 24px 60px rgba(0,0,0,0.55)",
          animation: "cardIn .5s cubic-bezier(.22,1,.36,1) .15s both",
        }}
      >
        {/* title bar */}
        <div
          className="flex items-center gap-2 px-4 h-9"
          style={{
            borderBottom: "1px solid rgba(97,95,255,0.18)",
            background: "rgba(97,95,255,0.06)",
          }}
        >
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#FF5F56" }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#FFBD2E" }} />
          <span className="w-2.5 h-2.5 rounded-full" style={{ background: "#27C93F" }} />
          <span className="ml-2 text-[10px]" style={{ color: "#90A1B9AA" }}>
            portfolio — dev
          </span>
        </div>

        {/* body: spinner + command */}
        <div className="px-5 py-4 text-[12px] leading-7">
          <div style={{ color: "#90A1B9" }}>
            <span style={{ color: "#FFB86A", marginRight: 8 }}>{SPINNER[frame]}</span>
            <span style={{ color: "#27C93F" }}>➜</span>{" "}
            <span style={{ color: "#FFB86A" }}>~/portfolio</span>{" "}
            <span style={{ color: "#615FFF" }}>{cmd}</span>
            <span className="loading-dots" />
            <span
              className="inline-block w-[7px] h-[14px] align-middle ml-2"
              style={{ background: "#615FFF", animation: "bootBlink .9s steps(1) infinite" }}
            />
          </div>

          {/* thin indeterminate shimmer line */}
          <div
            className="mt-3 h-[2px] rounded overflow-hidden relative"
            style={{ background: "rgba(144,161,185,0.15)" }}
          >
            <div
              className="absolute h-full w-1/3 rounded"
              style={{
                background: "linear-gradient(90deg, transparent, #615FFF, #00D5BE, transparent)",
                animation: "shimmer 1.3s ease-in-out infinite",
              }}
            />
          </div>
        </div>
      </div>
    </div>
  );
}
