import React from "react";
import ProjectCard from "./ProjectCard";
import Loading from "../../../Components/Loading";

const gray = "#90A1B9";

export default function ProjectSection({
  projects,
  loading,
  className = "",
}) {
  return (
    <div
      className={`flex-1 min-w-0 py-6 sm:py-8 px-4 sm:px-6 md:px-10 md:min-h-0 md:overflow-y-auto ${className}`}
    >
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {loading ? (
        <Loading variant="cards" count={3} />
      ) : projects.length === 0 ? (
        <div className="flex items-center justify-center h-40">
          <span className="text-[13px]" style={{ color: gray }}>
            // no projects found
          </span>
        </div>
      ) : (
        <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6">
          {projects.map((project, i) => (
            <ProjectCard key={project.id} project={project} index={i} />
          ))}
        </div>
      )}
    </div>
  );
}
