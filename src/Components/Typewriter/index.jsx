import React, { useEffect, useRef } from "react";

/**
 * Typewriter — self-contained typing animation for the hero lines.
 *
 * Deliberately NOT built on `typeit-react` (or the TypeIt core):
 *
 *  1. `typeit-react` ends its init effect with
 *     `instanceRef.current?.updateOptions(opts) || generateNewInstance()`.
 *     `updateOptions()` resolves to the instance (always truthy), so the
 *     rebuild branch only runs while the ref is still null. React StrictMode
 *     mounts, runs cleanup (which calls `destroy()` but leaves the ref on the
 *     dead instance) and re-runs the effects — so the dead instance is reused,
 *     nothing ever types, `afterComplete` never fires and the whole sequence
 *     stalls. That is the "name never appears / needs a refresh" bug.
 *  2. Even without the wrapper, the core drives its queue from
 *     `requestAnimationFrame` callbacks (see `beforePaint`) and `#fire()` has
 *     no `destroyed` guard — `destroy()` only clears setTimeout ids. So the
 *     StrictMode setup/cleanup/setup cycle leaves a second live loop writing
 *     into the same element, which comes out as doubled characters.
 *
 * Owning the timer here keeps it deterministic: one setTimeout chain per mount,
 * cancelled on cleanup, so there is only ever a single writer.
 */
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

  // latest callback without making it an effect dependency
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  useEffect(() => {
    const el = elRef.current;
    if (!el) return;

    let shown = 0;
    let timer = null;
    let cancelled = false;

    // Reuse the `ti-cursor` class so the existing
    // `[data-typed="done"] .ti-cursor` rule keeps hiding the caret.
    // The glyph itself is a CSS `::before` (see index.css), so the caret
    // contributes nothing to textContent.
    const paint = () => {
      el.textContent = text.slice(0, shown);
      if (cursor) {
        const caret = document.createElement("span");
        caret.className = "ti-cursor";
        caret.setAttribute("aria-hidden", "true");
        el.appendChild(caret);
      }
    };

    const next = () => (lifeLike ? speed * (0.5 + Math.random()) : speed);

    const step = () => {
      if (cancelled) return;
      shown += 1;
      paint();
      if (shown >= text.length) {
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
      el.textContent = "";
    };
  }, [text, speed, lifeLike, cursor]);

  return <As ref={elRef} {...rest} />;
}
