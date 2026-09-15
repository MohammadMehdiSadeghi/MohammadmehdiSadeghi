import React, { useEffect, useRef } from "react";

export default function SnakeBar() {
  const canvasRef = useRef(null);

  useEffect(() => {
    const canvas = canvasRef.current;
    const ctx = canvas.getContext("2d");
    const height =
      canvas.parentElement?.clientHeight || window.innerHeight - 116;
    canvas.height = height;

    let hue = 0,
      pos = 0,
      dir = 1;
    const TAIL = 180;
    let trail = [];

    const step = () => {
      hue = (hue + 1.5) % 360;
      pos += dir * 2;
      if (pos >= height) {
        pos = height;
        dir = -1;
      }
      if (pos <= 0) {
        pos = 0;
        dir = 1;
      }

      trail.unshift(pos);
      if (trail.length > TAIL) trail.pop();

      ctx.clearRect(0, 0, 4, height);

      for (let i = trail.length - 1; i >= 0; i--) {
        const alpha = 1 - i / TAIL;
        const trailHue = (hue - i * 0.3 + 360) % 360;

        ctx.shadowBlur = 18;
        ctx.shadowColor = `hsla(${trailHue}, 100%, 60%, ${alpha})`;
        ctx.fillStyle = `hsla(${trailHue}, 100%, 65%, ${alpha})`;
        ctx.fillRect(0, trail[i], 4, 3);
      }

      ctx.shadowBlur = 0;
    };

    const interval = setInterval(step, 16);
    return () => clearInterval(interval);
  }, []);

  return (
    <canvas
      ref={canvasRef}
      width={4}
      height={600}
      style={{ display: "block", position: "absolute", left: 0, top: 0 }}
    />
  );
}
