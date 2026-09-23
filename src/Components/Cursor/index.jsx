import { useEffect, useRef } from "react";
import "./index.css";


const HOVERABLE =
  "a,button,select,label,summary,[role=button],[role=link],input[type=submit],input[type=button]";

export default function Cursor() {
  const dotRef = useRef(null);
  const ringRef = useRef(null);

  useEffect(() => {
    if (!window.matchMedia("(pointer: fine)").matches) return;

    const dot = dotRef.current;
    const ring = ringRef.current;
    const root = document.documentElement;
    root.classList.add("has-cursor");

    let x = window.innerWidth / 2;
    let y = window.innerHeight / 2;
    let dx = x;
    let dy = y;
    let tx = x;
    let ty = y;
    let scale = 1;
    let targetScale = 1;
    let angle = 0;
    let raf = 0;

    const show = () => {
      dot.style.opacity = "1";
      ring.style.opacity = "1";
    };
    const hide = () => {
      dot.style.opacity = "0";
      ring.style.opacity = "0";
    };

    const onMove = (e) => {
      tx = e.clientX;
      ty = e.clientY;
      show();
    };
    const onOver = (e) => {
      targetScale = e.target.closest?.(HOVERABLE) ? 1.25 : 1;
    };
    const onDown = () => (targetScale = 0.85);
    const onUp = (e) => {
      targetScale = e.target.closest?.(HOVERABLE) ? 1.25 : 1;
    };
    const onLeave = hide;
    const onEnter = show;

    window.addEventListener("pointermove", onMove, { passive: true });
    window.addEventListener("pointerdown", onDown, { passive: true });
    window.addEventListener("pointerup", onUp, { passive: true });
    document.addEventListener("pointerover", onOver, { passive: true });
    document.addEventListener("mouseleave", onLeave);
    document.addEventListener("mouseenter", onEnter);

    const frame = () => {
      raf = requestAnimationFrame(frame);
      const px = x;
      const py = y;
      x += (tx - x) * 0.24;
      y += (ty - y) * 0.24;
      dx += (tx - dx) * 0.65;
      dy += (ty - dy) * 0.65;
      scale += (targetScale - scale) * 0.2;

      const vx = x - px;
      const vy = y - py;
      const speed = Math.hypot(vx, vy);
      const stretch = 1 + Math.min(speed * 0.09, 0.9);
      if (speed > 0.3) {
        angle = (Math.atan2(vy, vx) * 180) / Math.PI;
      }

      const odx = dx - x;
      const ody = dy - y;
      const od = Math.hypot(odx, ody);
      const maxOd = Math.max(6, 19 * scale - 6);
      if (od > maxOd) {
        dx = x + (odx / od) * maxOd;
        dy = y + (ody / od) * maxOd;
      }

      dot.style.transform = `translate3d(${dx}px, ${dy}px, 0) translate(-50%, -50%)`;
      ring.style.transform =
        `translate3d(${x}px, ${y}px, 0) translate(-50%, -50%) ` +
        `rotate(${angle.toFixed(1)}deg) scale(${(scale * stretch).toFixed(3)}, ${(scale / Math.sqrt(stretch)).toFixed(3)})`;
    };

    hide();
    raf = requestAnimationFrame(frame);

    return () => {
      cancelAnimationFrame(raf);
      root.classList.remove("has-cursor");
      window.removeEventListener("pointermove", onMove);
      window.removeEventListener("pointerdown", onDown);
      window.removeEventListener("pointerup", onUp);
      document.removeEventListener("pointerover", onOver);
      document.removeEventListener("mouseleave", onLeave);
      document.removeEventListener("mouseenter", onEnter);
    };
  }, []);

  return (
    <>
      <div className="cursor-ring" ref={ringRef} aria-hidden="true" />
      <div className="cursor-dot" ref={dotRef} aria-hidden="true" />
    </>
  );
}
