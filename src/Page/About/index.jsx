import React, { useState } from "react";
import SubjectBox from "./SubjectBox";
import Bio from "./Bio";
import usePageSEO from "../../Hooks/usePageSEO";

export default function About() {
  usePageSEO({
    title: "About Me | Mohammad Mehdi Sadeghi - Bio, Skills & Education",
    description: "Learn more about Mohammad Mehdi Sadeghi, his frontend development journey, technical skill set (HTML, CSS, JavaScript, React, Tailwind CSS, TypeScript, WordPress), and Rokad Startup School background.",
    canonical: "https://mohammad-mehdi-sadeghi.vercel.app/about",
    image: "/og-preview.png",
    schema: {
      "@context": "https://schema.org",
      "@type": "AboutPage",
      "name": "About Mohammad Mehdi Sadeghi",
      "url": "https://mohammad-mehdi-sadeghi.vercel.app/about",
      "mainEntity": {
        "@type": "Person",
        "name": "Mohammad Mehdi Sadeghi",
        "jobTitle": "Frontend Developer",
        "alumniOf": "Rokad Startup School",
        "url": "https://mohammad-mehdi-sadeghi.vercel.app",
        "knowsAbout": ["HTML", "CSS", "JavaScript", "React", "Tailwind CSS", "TypeScript", "WordPress"]
      }
    }
  });

  const [activeTab, setActiveTab] = useState("aboutMe");
  const [personalInfoOpen, setPersonalInfoOpen] = useState(true);
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
