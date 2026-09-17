import React, { useState, useEffect, useCallback, useRef } from "react";

/* ============================================================
   BootLoader — simple site loading screen.
   (The old terminal-typing intro was removed on request: just a
   plain loader that stays until the app is actually ready.)
   ============================================================ */

const MIN_VISIBLE = 420; // keep the flash short but never flicker
const EXIT_MS = 260;

export default function BootLoader({ onDone }) {
  const [exiting, setExiting] = useState(false);
  const doneRef = useRef(false);
  const startedAt = useRef(0);

  const finish = useCallback(() => {
    if (doneRef.current) return;
    doneRef.current = true;
    setExiting(true);
    setTimeout(() => {
      document.body.style.overflow = "";
      onDone?.();
    }, EXIT_MS);
  }, [onDone]);

  useEffect(() => {
    document.body.style.overflow = "hidden";
    startedAt.current = Date.now();
    let timer;

    const ready = () => {
      const waited = Date.now() - startedAt.current;
      timer = setTimeout(finish, Math.max(0, MIN_VISIBLE - waited));
    };

    // resolve as soon as the document has loaded (or immediately if it has)
    if (document.readyState === "complete") ready();
    else window.addEventListener("load", ready, { once: true });

    // hard safety net so the loader can never trap the page
    const maxWait = setTimeout(finish, 2500);

    return () => {
      window.removeEventListener("load", ready);
      clearTimeout(timer);
      clearTimeout(maxWait);
    };
  }, [finish]);

  return (
    <div
      className="fixed inset-0 z-[9998] flex items-center justify-center"
      style={{
        background: "#050B14",
        opacity: exiting ? 0 : 1,
        transition: `opacity ${EXIT_MS}ms ease`,
      }}
    >
      <div
        className="absolute w-[380px] h-[200px] pointer-events-none"
        style={{
          background:
            "radial-gradient(ellipse at center, rgba(97,95,255,0.14) 0%, transparent 65%)",
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
              id="bl-a"
              fill="freeze"
              attributeName="opacity"
              begin="0;bl-c.end-0.25s"
              dur="0.75s"
              values="1;.2"
            />
          </circle>
          <circle cx="12" cy="12" r="3" fill="currentColor" opacity=".4">
            <animate
              fill="freeze"
              attributeName="opacity"
              begin="bl-a.begin+0.15s"
              dur="0.75s"
              values="1;.2"
            />
          </circle>
          <circle cx="20" cy="12" r="3" fill="currentColor" opacity=".3">
            <animate
              id="bl-c"
              fill="freeze"
              attributeName="opacity"
              begin="bl-a.begin+0.3s"
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
