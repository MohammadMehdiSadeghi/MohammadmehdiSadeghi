import React, { useState, useEffect } from "react";
import FilterBox from "./FilterBox";
import ProjectSection from "./ProjectSection";
import usePageSEO from "../../Hooks/usePageSEO";

export default function Project() {
  usePageSEO({
    title: "Projects & Portfolio | Mohammad Mehdi Sadeghi",
    description: "Explore web projects, frontend applications, and full-stack interactive demos developed by Mohammad Mehdi Sadeghi.",
  });

  const [activeCategory, setActiveCategory] = useState("All Web Project");
  const [projects, setProjects] = useState([]);
  const [loading, setLoading] = useState(true);

  useEffect(() => {
    const fetchProjects = async () => {
      setLoading(true);
      try {
        let data;
        if (activeCategory === "All Web Project") {
          const res = await fetch(`/api/projects.json`);
          const json = await res.json();
          data = Array.isArray(json) ? json : json.projects || [];
        } else if (activeCategory === "All Mini Project") {
          const res = await fetch(`/api/mini-projects.json`);
          const json = await res.json();
          data = Array.isArray(json) ? json : json.projects || [];
        } else {
          const res = await fetch(`/api/projects.json`);
          const json = await res.json();
          const all = Array.isArray(json) ? json : json.projects || [];
          data = all.filter(
            (p) =>
              Array.isArray(p.category) &&
              p.category.includes(activeCategory),
          );
        }
        setProjects(data);
      } catch (err) {
        console.error("Error fetching projects:", err);
      } finally {
        setLoading(false);
      }
    };

    fetchProjects();
  }, [activeCategory]);

  return (
    <section className="bg-[#0F172B] min-h-[calc(100vh-116px)] flex flex-col lg:flex-row lg:h-[calc(100vh-116px)] lg:overflow-hidden">
      <FilterBox
        activeCategory={activeCategory}
        setActiveCategory={setActiveCategory}
        projects={projects}
        loading={loading}
      />
      <ProjectSection
        projects={projects}
        loading={loading}
        className="hidden lg:block"
      />
    </section>
  );
}
