import React, { useEffect, useRef } from "react";


const MIN_VISIBLE_MS = 600;

export default function BootLoader({ onDone }) {
  const doneRef = useRef(false);

  useEffect(() => {
    document.body.style.overflow = "hidden";

    const done = () => {
      if (doneRef.current) return;
      doneRef.current = true;
      document.body.style.overflow = "";
      onDone?.();
    };

    const timer = setTimeout(done, MIN_VISIBLE_MS);

    return () => {
      clearTimeout(timer);
      document.body.style.overflow = "";
    };
  }, [onDone]);

  return (
    <div
      onClick={() => onDone?.()}
      className="fixed inset-0 z-[99999] flex items-center justify-center bg-[#030712] cursor-pointer select-none"
    >
      <div className="flex flex-col items-center gap-4">
        <span className="loader-spinner" aria-hidden="true" />
        <p className="text-[12px] font-mono text-[#90A1B9]">Loading...</p>
      </div>
    </div>
  );
}
