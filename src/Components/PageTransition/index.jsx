import React, { useEffect, useState } from "react";

/* ============================================================
   PageTransition — Simple, smooth & lightweight top progress bar
   ============================================================ */

export default function PageTransition({ active }) {
  const [visible, setVisible] = useState(false);
  const [progress, setProgress] = useState(0);

  useEffect(() => {
    if (active) {
      setVisible(true);
      setProgress(25);
      const t1 = setTimeout(() => setProgress(75), 100);
      const t2 = setTimeout(() => setProgress(100), 220);
      const t3 = setTimeout(() => {
        setVisible(false);
        setProgress(0);
      }, 400);

      return () => {
        clearTimeout(t1);
        clearTimeout(t2);
        clearTimeout(t3);
      };
    }
  }, [active]);

  if (!visible) return null;

  return (
    <div className="fixed top-0 left-0 right-0 z-[99999] pointer-events-none h-[2.5px] overflow-hidden">
      <div
        className="h-full transition-all duration-200 ease-out"
        style={{
          width: `${progress}%`,
          background: "linear-gradient(90deg, #615FFF 0%, #00D5BE 70%, #FFB86A 100%)",
          boxShadow: "0 0 10px rgba(97, 95, 255, 0.8), 0 0 5px rgba(0, 213, 190, 0.8)",
        }}
      />
    </div>
  );
}
