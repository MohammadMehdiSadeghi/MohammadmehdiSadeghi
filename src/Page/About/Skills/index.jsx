import React, { useEffect, useState } from "react";
import useClickTrack from "../../../Hooks/useClickTrack";

const gray = "#90A1B9";
const purple = "#615FFF";

// used only if the API request fails, so the section never renders empty
const fallbackSkills = [
  { name: "HTML", img: "/assets/Images/html_1051277.png" },
  { name: "CSS", img: "/assets/Images/css_919826.png" },
  { name: "JavaScript", img: "/assets/Images/js_5968292.png" },
  { name: "React", img: "/assets/Images/react.png" },
  { name: "Tailwind CSS", img: "/assets/Images/tailwind.png" },
    { name: "TypeScript", img: "/assets/Images/typescript.png" },
    { name: "WordPress", img: "/assets/Images/wordpress_174881.png" },
];

export default function Skills() {
  const [hovered, setHovered] = useState(null);
  const [skills, setSkills] = useState(fallbackSkills);
  const { withTracking } = useClickTrack();

  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/skills", { signal: controller.signal })
      .then((res) => res.json())
      .then((data) => {
        if (Array.isArray(data.skills) && data.skills.length > 0) {
          setSkills(data.skills);
        }
      })
      .catch(() => {});
    return () => controller.abort();
  }, []);

  return (
    <div className="w-full min-w-0 py-6 sm:py-8 px-3 sm:px-6 md:px-8 lg:px-12 md:h-[calc(100vh-116px)] md:overflow-y-auto">
      <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4 lg:gap-5">
        {skills.map((skill, i) => (
          <div
            key={skill.name}
            onMouseEnter={() => setHovered(skill.name)}
            onMouseLeave={() => setHovered(null)}
            className="relative flex items-center gap-5 p-5 rounded-lg cursor-pointer duration-300"
            style={{
              background: hovered === skill.name ? "#0F172B" : "#081224",
              border: `1px solid ${hovered === skill.name ? purple : "#90a1b933"}`,
              transform:
                hovered === skill.name ? "translateY(-3px)" : "translateY(0)",
            }}
            onClick={withTracking({
              targetType: "skill",
              targetId: skill.name?.toLowerCase().replace(/\s+/g, "-") || "unknown",
              targetLabel: skill.name || "Unknown Skill",
            })}
          >
            <span
              className="absolute top-3 right-3 text-[11px] select-none"
              style={{ color: "#3d4f6b", fontFamily: "monospace" }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>

            <img
              className="w-14 h-14 object-contain flex-shrink-0"
              src={skill.img}
              alt={skill.name}
            />

            <div className="flex flex-col gap-1">
              <h3
                className="text-[15px] font-semibold duration-300"
                style={{ color: hovered === skill.name ? "#ffffff" : gray }}
              >
                {skill.name}
              </h3>
            </div>

            <div
              className="absolute bottom-3 right-3 w-2 h-2 rounded-full duration-300"
              style={{
                background: hovered === skill.name ? "#00D5BE" : "transparent",
                boxShadow: hovered === skill.name ? "0 0 6px #00D5BE" : "none",
              }}
            />
          </div>
        ))}
      </div>
    </div>
  );
}
