import React, { useEffect, useRef, useState } from "react";

/**
 * Single-line typing animation rendered entirely through React's normal
 * render path: the text is a slice of `text` derived from a small `shown`
 * counter, and the caret is a stable sibling <span>. Nothing here mutates
 * the DOM directly, so:
 *   - the caret's blink animation runs uninterrupted (the previous version
 *     called appendChild on a fresh <span> on every keystroke, so the
 *     `tiBlink` keyframe restarted every character and the cursor looked
 *     jittery, especially on the long name),
 *   - React 18 StrictMode's deliberate double-invocation of effects
 *     doesn't leave a stray glyph on screen (state is owned by React,
 *     not by a ref, so when the dev-mode "unmount + remount" cycle
 *     happens, the state is reset cleanly and no character from the
 *     cancelled run lingers),
 *   - HMR / fast-refresh swaps don't desync the caret from the text.
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
  const [shown, setShown] = useState(0);
  const doneRef = useRef(onDone);

  // Keep the latest onDone without retriggering the typing effect.
  useEffect(() => {
    doneRef.current = onDone;
  }, [onDone]);

  // If `text` changes mid-flight (or HMR swaps the prop), restart from 0.
  useEffect(() => {
    setShown(0);
  }, [text]);

  // Schedule the next character; cleanup always cancels the pending timer
  // so StrictMode's dev-mode double-effect doesn't schedule two timers.
  useEffect(() => {
    if (shown >= text.length) {
      doneRef.current?.();
      return;
    }
    const delay = lifeLike ? speed * (0.6 + Math.random() * 0.8) : speed;
    const t = setTimeout(() => setShown((s) => s + 1), delay);
    return () => clearTimeout(t);
  }, [shown, text, speed, lifeLike]);

  return (
    <As {...rest}>
      {text.slice(0, shown)}
      {cursor && <span className="ti-cursor" aria-hidden="true" />}
    </As>
  );
}