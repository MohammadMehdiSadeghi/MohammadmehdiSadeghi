import React from "react";
import AboutMe from "./AboutMe";
import Skills from "../Skills";
import Education from "../Education";

export default function Bio({ activeTab, personalInfoOpen, variant = "desktop" }) {
  if (variant === "mobile") {
    return (
      <div
        className={`w-full lg:hidden border-b-[1px] border-[#90a1b977] ${
          personalInfoOpen ? "block" : "hidden"
        }`}
      >
        {activeTab === "aboutMe" && <AboutMe />}
        {activeTab === "skills" && <Skills />}
        {activeTab === "education" && <Education />}
      </div>
    );
  }


  return (
    <section className="hidden lg:flex w-full min-w-0 flex-1 lg:min-h-0 lg:overflow-hidden">
      {activeTab === "aboutMe" && <AboutMe />}
      {activeTab === "skills" && <Skills />}
      {activeTab === "education" && <Education />}
    </section>
  );
}
