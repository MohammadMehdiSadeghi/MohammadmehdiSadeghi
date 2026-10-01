import { useEffect, useRef, useState } from "react";

/**
 * Animated number counter — smoothly counts from 0 to `value`.
 * Duration scales with magnitude (bigger numbers animate longer).
 */
export default function AnimatedCounter({ value, duration = 1200, className = "" }) {
  const [display, setDisplay] = useState(0);
  const prevRef = useRef(0);
  const rafRef = useRef(null);

  useEffect(() => {
    const from = prevRef.current;
    const to = value;
    if (from === to) return;

    const start = performance.now();
    const dur = Math.min(duration, 2000);

    function tick(now) {
      const elapsed = now - start;
      const progress = Math.min(elapsed / dur, 1);
      // ease-out cubic
      const eased = 1 - Math.pow(1 - progress, 3);
      const current = Math.round(from + (to - from) * eased);
      setDisplay(current);
      if (progress < 1) {
        rafRef.current = requestAnimationFrame(tick);
      } else {
        prevRef.current = to;
      }
    }

    rafRef.current = requestAnimationFrame(tick);
    return () => {
      if (rafRef.current) cancelAnimationFrame(rafRef.current);
    };
  }, [value, duration]);

  return <span className={className}>{display.toLocaleString()}</span>;
}
