import React, { useState, useEffect, useCallback, useRef } from "react";

/* ============================================================
   BootLoader — dev-server boot intro
   Types out a real `npm run dev` session, char by char,
   like an actual terminal. No progress bar — pure typing.
   ============================================================ */

// each line: text + optional color roles
const SCRIPT = [
  { parts: [{ t: "➜  ", c: "#27C93F" }, { t: "~/portfolio ", c: "#FFB86A" }, { t: "npm run dev", c: "#E8ECF4", bold: true }] },
  { parts: [{ t: "" }] },
  { parts: [{ t: "> portfolio@dev", c: "#90A1B9" }] },
  { parts: [{ t: "> vite", c: "#90A1B9" }] },
  { parts: [{ t: "" }] },
  { parts: [{ t: "  VITE v6.3.5  ", c: "#615FFF", bold: true }, { t: "ready in ", c: "#90A1B9" }, { t: "487 ms", c: "#27C93F" }] },
  { parts: [{ t: "" }] },
  { parts: [{ t: "  ➜  ", c: "#27C93F" }, { t: "Local:   ", c: "#90A1B9" }, { t: "http://localhost:5173/", c: "#00D5BE" }] },
  { parts: [{ t: "  ➜  ", c: "#27C93F" }, { t: "press ", c: "#90A1B9" }, { t: "h + enter", c: "#E8ECF4" }, { t: " to show help", c: "#90A1B9" }] },
  { parts: [{ t: "" }] },
  { parts: [{ t: "✓ dev server running", c: "#27C93F" }] },
];

const CHAR_MS = 26; // typing speed
const LINE_PAUSE = 140; // pause after each line
const HOLD_AFTER = 1100; // hold once finished
const EXIT_MS = 650;

export default function BootLoader({ onDone }) {
  const [lineIdx, setLineIdx] = useState(0); // which line we're typing
  const [charIdx, setCharIdx] = useState(0); // chars revealed in current line
  const [exiting, setExiting] = useState(false);
  const doneRef = useRef(false);
  const timers = useRef([]);
  const bodyRef = useRef(null);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setExiting(true);
    timers.current.push(
      setTimeout(() => {
        document.body.style.overflow = "";
        onDone?.();
      }, EXIT_MS)
    );
  }, [onDone]);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    let li = 0;
    let ci = 0;
    const tick = () => {
      if (doneRef.current) return;
      if (li >= SCRIPT.length) {
        // finished typing → hold → exit
        timers.current.push(setTimeout(finish, HOLD_AFTER));
        return;
      }
      const line = SCRIPT[li];
      const plain = line.parts.map((p) => p.t).join("");
      if (ci < plain.length) {
        ci += 1;
        setCharIdx(ci);
        if (bodyRef.current) bodyRef.current.scrollTop = bodyRef.current.scrollHeight;
        timers.current.push(setTimeout(tick, CHAR_MS));
      } else {
        // line complete
        li += 1;
        ci = 0;
        setLineIdx(li);
        setCharIdx(0);
        timers.current.push(setTimeout(tick, LINE_PAUSE));
      }
    };
    timers.current.push(setTimeout(tick, 500));

    return () => {
      timers.current.forEach(clearTimeout);
      timers.current = [];
      document.body.style.overflow = "";
    };
  }, [finish]);

  const skip = useCallback(() => finish(), [finish]);

  useEffect(() => {
    window.addEventListener("keydown", skip);
    return () => window.removeEventListener("keydown", skip);
  }, [skip]);

  // how many chars of line `i` to show
  const revealFor = (i) => {
    if (i < lineIdx) return Infinity; // fully typed
    if (i === lineIdx) return charIdx;
    return 0;
  };

  const renderLine = (line, reveal) => {
    let used = 0;
    return line.parts.map((p, j) => {
      const plain = p.t;
      if (used >= reveal) return null;
      const take = Math.min(plain.length, reveal - used);
      used += plain.length;
      return (
        <span key={j} style={{ color: p.c, fontWeight: p.bold ? 600 : 400 }}>
          {plain.slice(0, take)}
        </span>
      );
    });
  };

  const typingDone = lineIdx >= SCRIPT.length;

  return (
    <div
      onClick={skip}
      className="fixed inset-0 z-[9999] bg-[#050B14] flex items-center justify-center select-none"
      style={{
        fontFamily: '"Fira", monospace',
        transform: exiting ? "translateY(-100%)" : "translateY(0)",
        opacity: exiting ? 0.4 : 1,
        transition: `transform ${EXIT_MS}ms cubic-bezier(.7,0,.3,1), opacity ${EXIT_MS}ms ease`,
        cursor: "pointer",
      }}
    >
      {/* scanline overlay */}
      <div
        className="absolute inset-0 pointer-events-none"
        style={{
          background:
            "repeating-linear-gradient(0deg, rgba(255,255,255,0.025) 0 1px, transparent 1px 3px)",
        }}
      />

      {/* terminal window */}
      <div
        className="relative w-[min(680px,92vw)] rounded-xl overflow-hidden"
        style={{
          background: "rgba(8,18,36,0.92)",
          border: "1px solid rgba(97,95,255,0.35)",
          boxShadow: "0 0 80px rgba(97,95,255,0.18), 0 24px 60px rgba(0,0,0,0.6)",
          transform: exiting ? "scale(0.97)" : "scale(1)",
          transition: `transform ${EXIT_MS}ms cubic-bezier(.7,0,.3,1)`,
        }}
      >
        {/* title bar */}
        <div
          className="flex items-center gap-2 px-4 h-10"
          style={{ borderBottom: "1px solid rgba(97,95,255,0.2)", background: "rgba(97,95,255,0.07)" }}
        >
          <span className="w-3 h-3 rounded-full" style={{ background: "#FF5F56" }} />
          <span className="w-3 h-3 rounded-full" style={{ background: "#FFBD2E" }} />
          <span className="w-3 h-3 rounded-full" style={{ background: "#27C93F" }} />
          <span className="ml-3 text-[11px] text-[#90A1B9]">
            zsh — portfolio
          </span>
          <span className="ml-auto text-[10px] text-[#90A1B966]">click to skip</span>
        </div>

        {/* terminal body */}
        <div
          ref={bodyRef}
          className="px-6 py-5 h-[min(400px,56vh)] overflow-hidden text-[12px] leading-7"
        >
          {SCRIPT.map((line, i) => {
            const reveal = revealFor(i);
            if (reveal <= 0 && i > lineIdx) return null;
            return (
              <div key={i} style={{ minHeight: "1.75rem" }}>
                {renderLine(line, reveal)}
                {i === lineIdx && !typingDone && (
                  <span
                    className="inline-block w-2 h-4 align-middle"
                    style={{ background: "#615FFF", animation: "bootBlink .8s steps(1) infinite" }}
                  />
                )}
              </div>
            );
          })}
        </div>
      </div>

      {/* hint */}
      <div
        className="absolute bottom-8 text-[11px]"
        style={{ color: "#90A1B966", fontFamily: '"Fira", monospace' }}
      >
        // press any key to skip
      </div>
    </div>
  );
}
