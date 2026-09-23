import React, { useEffect, useState } from "react";
import { useLocation } from "react-router-dom";


function getRouteMeta(pathname) {
  if (pathname === "/") {
    return {
      cmd: "npm run dev:home",
      label: "RUNNING _HOME",
      desc: "Loading home module...",
      color: "#00D5BE",
      file: "Home.jsx",
    };
  }
  if (pathname.startsWith("/project")) {
    return {
      cmd: "npm run dev:projects",
      label: "RUNNING _PROJECTS",
      desc: "Compiling projects...",
      color: "#615FFF",
      file: "Projects.jsx",
    };
  }
  if (pathname.startsWith("/blog")) {
    const isPost = pathname.length > 6;
    return {
      cmd: isPost ? "npm run dev:post" : "npm run dev:blog",
      label: isPost ? "RUNNING _BLOG_POST" : "RUNNING _BLOG",
      desc: isPost ? "Loading post data..." : "Compiling blog feed...",
      color: "#4ADE80",
      file: isPost ? "Post.jsx" : "Blog.jsx",
    };
  }
  if (pathname.startsWith("/about")) {
    return {
      cmd: "npm run dev:about",
      label: "RUNNING _ABOUT",
      desc: "Loading bio data...",
      color: "#FFB86A",
      file: "About.jsx",
    };
  }
  if (pathname.startsWith("/contact")) {
    return {
      cmd: "npm run dev:contact",
      label: "RUNNING _CONTACT",
      desc: "Opening contact channel...",
      color: "#F472B6",
      file: "Contact.jsx",
    };
  }
  if (pathname.startsWith("/admin")) {
    return {
      cmd: "npm run dev:admin",
      label: "RUNNING _ADMIN",
      desc: "Authorizing session...",
      color: "#F59E0B",
      file: "Admin.jsx",
    };
  }
  const cleanPath = pathname.replace(/^\//, "").toUpperCase() || "PAGE";
  return {
    cmd: `npm run dev:${cleanPath.toLowerCase()}`,
    label: `RUNNING _${cleanPath}`,
    desc: "Mounting page view...",
    color: "#615FFF",
    file: `${cleanPath}.jsx`,
  };
}

export default function PageTransition({ active, path }) {
  const location = useLocation();
  const currentPath = path || location.pathname;
  const [visible, setVisible] = useState(false);
  const [fadingOut, setFadingOut] = useState(false);
  const [progress, setProgress] = useState(0);
  const meta = getRouteMeta(currentPath);

  useEffect(() => {
    if (active) {
      setVisible(true);
      setFadingOut(false);
      setProgress(15);

      const p1 = setTimeout(() => setProgress(45), 180);
      const p2 = setTimeout(() => setProgress(78), 450);
      const p3 = setTimeout(() => setProgress(100), 750);
      const p4 = setTimeout(() => setFadingOut(true), 900);
      const p5 = setTimeout(() => {
        setVisible(false);
        setFadingOut(false);
        setProgress(0);
      }, 1100);

      return () => {
        clearTimeout(p1);
        clearTimeout(p2);
        clearTimeout(p3);
        clearTimeout(p4);
        clearTimeout(p5);
      };
    } else {
      setVisible(false);
      setFadingOut(false);
      setProgress(0);
    }
  }, [active, currentPath]);

  if (!visible) return null;

  return (
    <aside
      role="status"
      aria-live="polite"
      aria-label={meta.desc}
      className={`fixed inset-0 z-[99999] pointer-events-none flex items-center justify-center p-4 transition-all duration-200 bg-[#030712] ${
        fadingOut ? "opacity-0 scale-95" : "opacity-100 scale-100"
      }`}
      style={{
        backgroundColor: "#030712",
      }}
    >
      <div
        className="w-full max-w-[410px] rounded-xl overflow-hidden border shadow-2xl transition-transform duration-200"
        style={{
          background: "#091224",
          borderColor: "rgba(144, 161, 185, 0.25)",
          boxShadow: `0 0 35px rgba(0, 0, 0, 0.8), 0 0 20px ${meta.color}25`,
        }}
      >
        <div className="bg-[#050B16] px-3.5 py-2.5 flex items-center justify-between border-b border-[#90a1b920]">
          <div className="flex items-center gap-1.5">
            <span className="w-2.5 h-2.5 rounded-full bg-[#EF4444]/90 inline-block shadow-[0_0_6px_#EF4444]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#F59E0B]/90 inline-block shadow-[0_0_6px_#F59E0B]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#10B981]/90 inline-block shadow-[0_0_6px_#10B981]" />
            <span className="text-[11px] text-[#90A1B9]/80 font-mono ml-2 tracking-wide">
              nav://process
            </span>
          </div>
          <span className="text-[10px] text-[#90A1B9]/50 font-mono tracking-wider">
            {meta.file}
          </span>
        </div>

        <div className="p-4 space-y-3 font-mono">
          <div className="flex items-center gap-2 text-[12px] text-[#90A1B9]">
            <span style={{ color: meta.color }} className="font-bold">
              $&gt;
            </span>
            <span className="text-white font-medium tracking-wide">
              {meta.cmd}
            </span>
          </div>

          <div className="flex items-center justify-between pt-1">
            <div className="flex items-center gap-2.5">
              <span
                className="w-2 h-2 rounded-full animate-ping"
                style={{ backgroundColor: meta.color }}
              />
              <span
                className="text-[13px] font-bold tracking-wider"
                style={{ color: meta.color }}
              >
                {meta.label}
              </span>
            </div>
            <span
              className="text-[11px] text-[#90A1B9]/80 font-mono"
            >
              {meta.desc}
            </span>
          </div>

          <div className="w-full bg-[#030712] h-2 rounded-full overflow-hidden border border-[#90a1b920] p-[1px]">
            <div
              className="h-full rounded-full transition-all duration-200 ease-out"
              style={{
                width: `${progress}%`,
                background: `linear-gradient(90deg, ${meta.color}99 0%, ${meta.color} 100%)`,
                boxShadow: `0 0 10px ${meta.color}`,
              }}
            />
          </div>

          <div className="flex items-center justify-between text-[10px] text-[#90A1B9]/60 pt-0.5">
            <span className="tracking-wider">
              {progress === 100 ? "STATUS: READY" : "STATUS: COMPILING..."}
            </span>
            <span className="font-bold tracking-widest">{progress}%</span>
          </div>
        </div>
      </div>
    </aside>
  );
}
