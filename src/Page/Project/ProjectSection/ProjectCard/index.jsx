import React, { useState } from "react";
import useClickTrack from "../../../../Hooks/useClickTrack";

const getMonogram = (title) => {
  const words = title?.trim().split(/\s+/);
  if (!words || words.length === 0) return "?";
  if (words.length === 1) {
    const t = words[0];
    return t.length >= 2 ? t.substring(0, 2).toUpperCase() : t[0].toUpperCase();
  }
  return (words[0][0] + words[1][0]).toUpperCase();
};

const monogramGradient =
  "linear-gradient(135deg, #615FFF 0%, #7C6CF6 100%)";

export default function ProjectCard({ project, index }) {
  const gray = "#90A1B9";
  const [hovered, setHovered] = useState(false);
  const { withTracking } = useClickTrack();

  const monogram = getMonogram(project.title);

  return (
    <div
      className="rounded-xl group cursor-pointer overflow-hidden flex flex-col transition-all duration-300
        hover:border-[#615FFF] hover:-translate-y-1 border-[#90a1b933] border
        hover:shadow-[0_0_35px_-5px_rgba(97,95,255,0.25)]"
      style={{
        background: "#081224",
        opacity: 0,
        animation: "fadeSlideUp 0.4s ease forwards",
      }}
    >
      <div
        className="w-full h-[180px] relative overflow-hidden"
        style={{ background: "#0a1628" }}
        onMouseEnter={() => setHovered(true)}
        onMouseLeave={() => setHovered(false)}
      >
        <div
          className="absolute top-0 left-0 right-0 h-[2px]"
          style={{
            background:
              "linear-gradient(90deg, transparent 0%, #615FFF 30%, #7C6CF6 70%, transparent 100%)",
            opacity: hovered ? 1 : 0.4,
            transition: "opacity 0.3s",
          }}
        />

        <div
          className="absolute -top-12 -right-12 w-44 h-44 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(97,95,255,0.35) 0%, transparent 70%)",
            transition: "opacity 0.4s",
            opacity: hovered ? 0.9 : 0.4,
          }}
        />
        <div
          className="absolute -bottom-14 -left-10 w-40 h-40 rounded-full blur-3xl"
          style={{
            background:
              "radial-gradient(circle, rgba(124,108,246,0.2) 0%, transparent 70%)",
            transition: "opacity 0.4s",
            opacity: hovered ? 0.8 : 0.3,
          }}
        />

        <div
          className="absolute inset-0"
          style={{
            backgroundImage:
              "linear-gradient(rgba(144,161,185,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(144,161,185,0.07) 1px, transparent 1px)",
            backgroundSize: "22px 22px",
          }}
        />

        <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
          <span
            className="text-[128px] font-bold select-none leading-none"
            style={{ color: "#615FFF", opacity: 0.07 }}
          >
            {monogram}
          </span>
        </div>

        <div className="absolute inset-0 flex flex-col items-center justify-center gap-2.5 px-4">
          <div
            className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg transition-transform duration-300"
            style={{
              background: monogramGradient,
              boxShadow: "0 6px 24px rgba(97,95,255,0.4)",
              transform: hovered
                ? "scale(1.1) rotate(-6deg)"
                : "scale(1) rotate(0deg)",
            }}
          >
            <span className="text-white font-bold text-[13px] leading-none tracking-tight">
              {monogram}
            </span>
          </div>

          <h4
            className="text-white text-[18px] sm:text-[20px] font-bold tracking-[0.08em] uppercase text-center truncate max-w-full transition-colors duration-300"
            style={{ color: hovered ? "#fff" : "#E8ECF4" }}
          >
            {project.title}
          </h4>
        </div>

        <div className="absolute top-2.5 inset-x-0 z-20 flex items-center justify-center gap-1.5 flex-wrap px-6">
          {Array.isArray(project.category) &&
            project.category.map((cat) => (
              <span
                key={cat}
                className="text-[8px] sm:text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wide
                  transition-all duration-200"
                style={{
                  color: gray,
                  background: "rgba(97,95,255,0.12)",
                  border: "1px solid rgba(97,95,255,0.3)",
                }}
              >
                {cat}
              </span>
            ))}
        </div>

        <div
          className="absolute top-2.5 left-2.5 w-4 h-4 border-t-2 border-l-2 transition-all duration-300"
          style={{ borderColor: "#615FFF66", opacity: hovered ? 1 : 0.6 }}
        />
        <div
          className="absolute top-2.5 right-2.5 w-4 h-4 border-t-2 border-r-2 transition-all duration-300"
          style={{ borderColor: "#615FFF66", opacity: hovered ? 1 : 0.6 }}
        />
        <div
          className="absolute bottom-2.5 left-2.5 w-4 h-4 border-b-2 border-l-2 transition-all duration-300"
          style={{ borderColor: "#615FFF66", opacity: hovered ? 1 : 0.6 }}
        />
        <div
          className="absolute bottom-2.5 right-2.5 w-4 h-4 border-b-2 border-r-2 transition-all duration-300"
          style={{ borderColor: "#615FFF66", opacity: hovered ? 1 : 0.6 }}
        />
      </div>

      <div className="p-5 flex flex-col gap-4 flex-1">
        <div>
          <p className="text-[11px] mb-2 text-[#615FFF]">
            Project {String(index + 1).padStart(2, "0")} //{" "}
            <span className="text-[#90A1B9]">_{project.title}</span>
          </p>
          <h3 className="text-white text-[16px]">{project.title}</h3>
        </div>
        <p className="text-[13px] leading-6 text-[#90A1B9]">
          {project.description}
        </p>
        <div className="mt-auto">
          {project.url && String(project.url).trim() ? (
            <a
              href={project.url}
              target="_blank"
              rel="noopener noreferrer"
              className="text-[13px] inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg
              text-[#90A1B9] border border-[#90a1b955] bg-[#0F172B]
              transition-all duration-150 hover:border-[#615FFF] hover:text-white hover:bg-[#615FFF11]"
              onClick={withTracking({
                targetType: "project",
                targetId:
                  project.title
                    ?.toLowerCase()
                    .replace(/\s+/g, "-") || "unknown",
                targetLabel: project.title || "Unknown Project",
              })}
            >
              view-project
              <svg
                className="w-3 h-3"
                viewBox="0 0 16 16"
                fill="none"
                stroke="currentColor"
                strokeWidth="2"
                strokeLinecap="round"
                strokeLinejoin="round"
              >
                <path d="M5 3l5 5-5 5" />
              </svg>
            </a>
          ) : (
            <span className="text-[13px] inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg text-[#68768C] border border-dashed border-[#90a1b933] bg-[#0F172B]">
              showcase
            </span>
          )}
        </div>
      </div>
    </div>
  );
}