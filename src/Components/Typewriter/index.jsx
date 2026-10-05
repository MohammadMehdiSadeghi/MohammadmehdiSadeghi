import React, { useEffect, useRef } from "react";

export default function Typewriter({
  text,
  as: As = "span",
  speed = 50,
  lifeLike = true,
  cursor = true,
  onDone,
  ...rest
}) {
  const elRef = useRef(null);
  const doneRef = useRef(onDone);
  const hasCompletedRef = useRef(false);

  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    if (hasCompletedRef.current) {
      el.textContent = text;
      if (cursor) {
        const caret = document.createElement("span");
        caret.className = "ti-cursor";
        caret.setAttribute("aria-hidden", "true");
        el.appendChild(caret);
      }
      return;
    }

    let shown = 0;
    let timer = null;
    let cancelled = false;

    const paint = () => {
      el.textContent = text.slice(0, shown);
      if (cursor) {
        const caret = document.createElement("span");
        caret.className = "ti-cursor";
        caret.setAttribute("aria-hidden", "true");
        el.appendChild(caret);
      }
    };

    const next = () => (lifeLike ? speed * (0.6 + Math.random() * 0.8) : speed);

    const step = () => {
      if (cancelled) return;
      shown += 1;
      paint();
      if (shown >= text.length) {
        hasCompletedRef.current = true;
        doneRef.current?.();
        return;
      }
      timer = setTimeout(step, next());
    };

    paint();
    timer = setTimeout(step, next());

    return () => {
      cancelled = true;
      if (timer) clearTimeout(timer);
    };
  }, [text, speed, lifeLike, cursor]);

  return <As ref={elRef} {...rest} />;
}
