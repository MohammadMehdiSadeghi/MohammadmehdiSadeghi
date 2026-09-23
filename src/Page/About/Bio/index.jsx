import React from "react";
import AboutMe from "./AboutMe";
import Skills from "../Skills";
import Education from "../Education";

export default function Bio({ activeTab, personalInfoOpen, variant = "desktop" }) {
  // "mobile": rendered inline inside SubjectBox, right between the
  // personal-info box and the contacts box, and only shown on small screens.
  // The bottom border is the content/contacts separator — the contacts box
  // itself carries no top border (that would double up with this one).
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

  // "desktop": the original side-by-side content pane, hidden on small
  // screens since the mobile variant above takes its place there.
  return (
    <section className="hidden lg:flex w-full min-w-0 flex-1 lg:min-h-0 lg:overflow-hidden">
      {activeTab === "aboutMe" && <AboutMe />}
      {activeTab === "skills" && <Skills />}
      {activeTab === "education" && <Education />}
    </section>
  );
}
