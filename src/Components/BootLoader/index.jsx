import React, { useState, useEffect, useCallback, useRef } from "react";
import { ACCENT, LoadDots, LoaderFrame, Monogram } from "../Loader";

/* ════════════════════════════════════════════════════════════════════
   BootLoader — the first-paint loading screen.

   The terminal-typing intro was removed on request and what replaced it
   was down to three dots and the word "loading" — too plain. This keeps
   the intro gone (no typing sequence, no faked progress percentage) but
   gives the screen real presence again, using the same vocabulary as the
   project cards so it looks like part of the site.

   Timing is unchanged: fall away as soon as the document is ready, with
   a floor so it can't flicker and a ceiling so it can never trap the page.
   ════════════════════════════════════════════════════════════════════ */

const MIN_VISIBLE = 420; // short flash, but never a flicker
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
      style={{
        position: "fixed",
        inset: 0,
        zIndex: 9998,
        opacity: exiting ? 0 : 1,
        transition: `opacity ${EXIT_MS}ms ease`,
      }}
    >
      <LoaderFrame full>
        <Monogram text="MM" size={46} />

        <p
          className="mt-4 text-[15px] text-white tracking-[0.08em]"
          style={{ fontFamily: '"Fira", monospace' }}
        >
          Mohammad-Mehdi-Sadeghi
        </p>
        <p className="text-[10px] mt-1" style={{ color: "#4B576D" }}>
          frontend developer · portfolio
        </p>

        <div className="mt-6">
          <LoadDots id="boot" size="2.6em" />
        </div>

        {/* indeterminate — it reports that something is happening, and never
            claims to know how much is left */}
        <div
          className="relative mt-5 overflow-hidden"
          style={{ width: 190, height: 2, background: "#90a1b926", borderRadius: 99 }}
        >
          <span
            style={{
              position: "absolute",
              inset: 0,
              width: "55%",
              background: `linear-gradient(90deg, transparent, ${ACCENT}, transparent)`,
              animation: "loadBar 1.05s ease-in-out infinite",
            }}
          />
        </div>

        <p
          className="mt-4 text-[11px] tracking-wider"
          style={{ fontFamily: '"Fira", monospace', color: "#90A1B9" }}
        >
          loading
          <span className="loading-dots" />
        </p>
      </LoaderFrame>
    </div>
  );
}
