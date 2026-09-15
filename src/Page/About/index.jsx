import React, { useState } from "react";
import SubjectBox from "./SubjectBox";
import Bio from "./Bio";

export default function About() {
  const [activeTab, setActiveTab] = useState("aboutMe");
  const [personalInfoOpen, setPersonalInfoOpen] = useState(false);
  return (
    <section className="bg-[#0F172B] min-h-[calc(100vh-116px)] flex flex-col md:flex-row md:h-[calc(100vh-116px)] md:overflow-hidden">
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
