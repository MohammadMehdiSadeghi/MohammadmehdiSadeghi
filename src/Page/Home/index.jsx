import React from "react";
import "./index.css";
import MusicSearch from "./MusicSearch";
import InformationText from "./InformationText";
import usePageSEO from "../../Hooks/usePageSEO";

export default function Home() {
  usePageSEO({
    title: "Mohammad Mehdi Sadeghi | Frontend Engineer & UI Specialist",
    description: "Welcome to the developer portfolio of Mohammad Mehdi Sadeghi, featuring interactive web projects, skills, audio DSP experiments, and technical articles.",
  });

  return (
    <>
      <section className="bg-[#0F172B] min-h-[calc(100vh-116px)] lg:h-[calc(100vh-116px)] flex items-center justify-center">
        <div className="home-page-div w-full flex flex-col lg:flex-row items-center justify-center gap-8 sm:gap-10 lg:gap-12 xl:gap-16 px-4 sm:px-8 py-8 sm:py-12 lg:py-0 min-h-[calc(100vh-116px)] lg:min-h-0 lg:h-full">
          <InformationText />
          <MusicSearch />
        </div>
      </section>
    </>
  );
}
