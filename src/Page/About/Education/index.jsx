import React, { useState } from "react";

const gray = "#90A1B9";
const purple = "#615FFF";
const turquoise = "#00D5BE";

const timeline = [
  {
    id: "01",
    type: "school",
    title: "Rekad Startup School",
    field: "Web Design & Development",
    status: "In Progress",
    grade: "Grade 11",
    color: purple,
  },
  {
    id: "02",
    type: "course",
    title: "ICDL Certificate",
    field: "Computer Skills",
    status: "Completed",
    grade: null,
    color: turquoise,
  },
  {
    id: "03",
    type: "course",
    title: "Front-End Development",
    field: "HTML · CSS · JavaScript · React",
    status: "Completed",
    grade: null,
    color: turquoise,
  },
  {
    id: "04",
    type: "upcoming",
    title: "Back-End Development",
    field: "Coming Soon",
    status: "Upcoming",
    grade: null,
    color: "#3d4f6b",
  },
];

export default function Education() {
  const [hovered, setHovered] = useState(null);

  return (
    <div className="w-full min-w-0 py-6 sm:py-8 px-4 sm:pr-16 md:h-[calc(100vh-116px)] md:overflow-y-auto">
      <div className="sm:px-12 flex flex-col gap-4 sm:gap-5 mt-4">
        {timeline.map((item) => (
          <div
            key={item.id}
            onMouseEnter={() => setHovered(item.id)}
            onMouseLeave={() => setHovered(null)}
            className="relative flex items-start gap-3 sm:gap-6 p-4 sm:p-6 rounded-lg cursor-default duration-300"
            style={{
              background: hovered === item.id ? "#0F172B" : "#081224",
              border: `1px solid ${hovered === item.id ? item.color : "#90a1b933"}`,
              transform:
                hovered === item.id ? "translateY(-3px)" : "translateY(0)",
            }}
          >
            <span
              className="text-[13px] font-mono select-none mt-1 flex-shrink-0"
              style={{ color: "#3d4f6b" }}
            >
              {item.id}
            </span>

            <div
              className="hidden sm:block absolute left-[52px] top-0 bottom-0 w-px"
              style={{ background: "#90a1b922" }}
            />

            <div
              className="hidden sm:block absolute left-[46px] top-[26px] w-3 h-3 rounded-full duration-300 flex-shrink-0"
              style={{
                background: hovered === item.id ? item.color : "#1D293D",
                border: `2px solid ${item.color}`,
                boxShadow:
                  hovered === item.id ? `0 0 8px ${item.color}` : "none",
              }}
            />

            <div className="flex flex-col gap-2 ml-4">
              <div className="flex items-center gap-3 flex-wrap">
                <h3
                  className="text-[14px] font-semibold duration-300"
                  style={{ color: hovered === item.id ? "#ffffff" : gray }}
                >
                  {item.title}
                </h3>

                <span
                  className="text-[10px] font-mono px-2 py-0.5 rounded-full"
                  style={{
                    color: item.color,
                    background: `${item.color}18`,
                    border: `1px solid ${item.color}44`,
                  }}
                >
                  {item.status}
                </span>
              </div>

              <p
                className="text-[13px] font-mono"
                style={{ color: hovered === item.id ? item.color : "#3d4f6b" }}
              >
                {item.field}
              </p>

              {item.grade && (
                <p className="text-[11px]" style={{ color: "#3d4f6b" }}>
                  {item.grade}
                </p>
              )}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
