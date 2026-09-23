import React, { useState } from "react";
import SubjectBox from "./SubjectBox";
import Bio from "./Bio";
import usePageSEO from "../../Hooks/usePageSEO";

export default function About() {
  usePageSEO({
    title: "About Me | Mohammad Mehdi Sadeghi - Bio, Skills & Experience",
    description: "Learn more about Mohammad Mehdi Sadeghi, his frontend engineering journey, technical skill set, education, and development background.",
  });

  const [activeTab, setActiveTab] = useState("aboutMe");
  /* Both accordions start collapsed on small screens. With one of them open on
     entry the second section is pushed below the fold, so the user never sees
     it — collapsing both keeps the page short and lets each section be
     revealed on demand. On lg+ the accordions are ignored entirely (the tabs
     and contacts are always rendered). */
  const [personalInfoOpen, setPersonalInfoOpen] = useState(false);
  return (
    <section className="bg-[#0F172B] min-h-[calc(100vh-116px)] flex flex-col lg:flex-row lg:h-[calc(100vh-116px)] lg:overflow-hidden">
      <SubjectBox
        setActiveTab={setActiveTab}
        activeTab={activeTab}
        personalInfoOpen={personalInfoOpen}
        setPersonalInfoOpen={setPersonalInfoOpen}
        mobileContent={
          <Bio
            activeTab={activeTab}
            personalInfoOpen={personalInfoOpen}
            variant="mobile"
          />
        }
      />
      <Bio
        activeTab={activeTab}
        personalInfoOpen={personalInfoOpen}
        variant="desktop"
      />
    </section>
  );
}
