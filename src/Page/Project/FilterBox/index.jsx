import React, { useState } from "react";
import SnakeBar from "../../../Components/SnakeBar";
import ProjectSection from "../ProjectSection";
import useClickTrack from "../../../Hooks/useClickTrack";

const categories = [
  { name: "All Web Project", img: null },
  {
    name: "React",
    img: "/assets/Images/reavt filter (5).png",
  },
  {
    name: "JavaScript",
    img: "/assets/Images/js filter (2).png",
  },
  {
    name: "Tailwind",
    img: "/assets/Images/tailwind filter (1).png",
  },
  { name: "HTML", img: "/assets/Images/html filter (3).png" },
  { name: "CSS", img: "/assets/Images/css filter (4).png" },
];

const miniCategory = { name: "All Mini Project", img: null };

function CheckMark() {
  return (
    <svg
      width="10"
      height="8"
      viewBox="0 0 10 8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1 4L3.5 6.5L9 1"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

export default function FilterBox({
  activeCategory,
  setActiveCategory,
  projects,
  loading,
}) {
  const [projectsOpen, setProjectsOpen] = useState(true);
  const [miniOpen, setMiniOpen] = useState(false);
  const { trackClick } = useClickTrack();

  const trackFilter = (name) => {
    trackClick({
      targetType: "filter",
      targetId: name?.toLowerCase().replace(/\s+/g, "-") || "all",
      targetLabel: name || "All",
    });
  };

  return (
    <section className="flex justify-start md:h-full border-b md:border-b-0 border-[#90a1b977]">
      <div className="hidden md:block relative w-14 border-r border-[#90a1b977] h-[calc(100vh-116px)]">
        <SnakeBar />
      </div>

      <nav className="w-full md:hidden text-[#90A1B9]">
        <h2
          onClick={() => {
            trackFilter("All Web Project");
            setProjectsOpen((prev) => {
              const next = !prev;
              if (next) {
                setMiniOpen(false);
                setActiveCategory("All Web Project");
              }
              return next;
            });
          }}
          className="px-4 py-3 w-full flex items-center gap-2.5 border-b-[1px] border-[#90a1b977] text-white cursor-pointer select-none"
        >
          projects
          <img
            className={`w-3 duration-200 ${projectsOpen ? "rotate-90" : "rotate-0"}`}
            src="/assets/Images/Vector.svg"
            alt=""
          />
        </h2>
        <ul
          className={`${projectsOpen ? "flex" : "hidden"} flex-col border-b-[1px] border-[#90a1b977]`}
        >
          {categories.map((cat) => {
            const isActive = activeCategory === cat.name;
            return (
              <li
                key={cat.name}
                onClick={() => { trackFilter(cat.name); setActiveCategory(cat.name); }}
                className={`px-6 py-3 cursor-pointer flex gap-3 items-center duration-100 ${
                  isActive ? "bg-[#7888a033] text-white" : "text-[#90A1B9]"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 duration-150 ${
                    isActive
                      ? "bg-[#615FFF] border-[#615FFF]"
                      : "border-[#90a1b966]"
                  }`}
                >
                  {isActive && <CheckMark />}
                </span>
                {cat.img && (
                  <img
                    src={cat.img}
                    className="w-5 h-5 object-contain"
                    alt={cat.name}
                  />
                )}
                <span className="text-[12px]">{cat.name}</span>
              </li>
            );
          })}
        </ul>

        {projectsOpen && (
          <ProjectSection projects={projects} loading={loading} />
        )}

        <h2 onClick={() => {
            trackFilter(miniCategory.name);
            setMiniOpen((prev) => {
              const next = !prev;
              if (next) {
                setProjectsOpen(false);
                setActiveCategory(miniCategory.name);
              }
              return next;
            });
          }}
          className="px-4 py-3 w-full flex items-center gap-2.5 border-b-[1px] border-[#90a1b977] text-white cursor-pointer select-none"
        >
          mini-project
          <img
            className={`w-3 duration-200 ${miniOpen ? "rotate-90" : "rotate-0"}`}
            src="/assets/Images/Vector.svg"
            alt=""
          />
        </h2>
        <ul
          className={`${miniOpen ? "flex" : "hidden"} flex-col border-b-[1px] border-[#90a1b977]`}
        >
          {(() => {
            const isActive = activeCategory === miniCategory.name;
            return (
              <li
                onClick={() => { trackFilter(miniCategory.name); setActiveCategory(miniCategory.name); }}
                className={`px-6 py-3 cursor-pointer flex gap-3 items-center duration-100 ${
                  isActive ? "bg-[#7888a033] text-white" : "text-[#90A1B9]"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 duration-150 ${
                    isActive
                      ? "bg-[#615FFF] border-[#615FFF]"
                      : "border-[#90a1b966]"
                  }`}
                >
                  {isActive && <CheckMark />}
                </span>
                <span className="text-[12px]">{miniCategory.name}</span>
              </li>
            );
          })()}
        </ul>

        {miniOpen && <ProjectSection projects={projects} loading={loading} />}
      </nav>

      <nav className="hidden md:block w-[323px] shrink-0 border-r-[1px] border-[#90a1b977] h-[calc(100vh-116px)] text-[#90A1B9]">
        <ul className="flex flex-col ">
          <h2 className="px-7 py-3.5 w-full flex items-center gap-2.5 border-b-[1px] border-[#90a1b977] text-white">
            projects
            <img className="w-3" src="/assets/Images/Vector.svg" alt="" />
          </h2>
          {categories.map((cat) => {
            const isActive = activeCategory === cat.name;
            return (
              <li
                key={cat.name}
                onClick={() => { trackFilter(cat.name); setActiveCategory(cat.name); }}
                className={`px-12 py-3 cursor-pointer flex gap-3 items-center  duration-100 ${
                  isActive ? "bg-[#7888a033] text-white" : "text-[#90A1B9]"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-sm border flex items-center justify-center  duration-150 ${
                    isActive
                      ? "bg-[#615FFF] border-[#615FFF]"
                      : "border-[#90a1b966]"
                  }`}
                >
                  {isActive && <CheckMark />}
                </span>
                {cat.img && (
                  <img
                    src={cat.img}
                    className="w-6 h-6 object-contain"
                    alt={cat.name}
                  />
                )}
                <span className="text-[13px]">{cat.name}</span>
              </li>
            );
          })}
        </ul>
        <ul className="flex flex-col border-t-[1px] border-[#90a1b977]">
          <h2 className="px-7 py-3.5 w-full flex items-center gap-2.5 border-b-[1px] border-[#90a1b977] text-white">
            mini-projects
            <img className="w-3" src="/assets/Images/Vector.svg" alt="" />
          </h2>
          {(() => {
            const isActive = activeCategory === miniCategory.name;
            return (
              <li
                onClick={() => { trackFilter(miniCategory.name); setActiveCategory(miniCategory.name); }}
                className={`px-12 py-3 cursor-pointer flex gap-3 items-center  duration-100 ${
                  isActive ? "bg-[#7888a033] text-white" : "text-[#90A1B9]"
                }`}
              >
                <span
                  className={`w-4 h-4 rounded-sm border flex items-center justify-center  duration-150 ${
                    isActive
                      ? "bg-[#615FFF] border-[#615FFF]"
                      : "border-[#90a1b966]"
                  }`}
                >
                  {isActive && <CheckMark />}
                </span>
                <span className="text-[13px]">{miniCategory.name}</span>
              </li>
            );
          })()}
        </ul>
      </nav>
    </section>
  );
}
