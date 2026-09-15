import React from "react";
import "./index.css";
import MusicSearch from "./MusicSearch";
import InformationText from "./InformationText";

export default function Home() {
  return (
    <>
      <section className="bg-[#0F172B] min-h-[calc(100vh-116px)] md:h-[calc(100vh-116px)]">
        <div className="home-page-div w-full flex flex-col lg:flex-row items-center justify-center gap-10 lg:gap-16 px-4 sm:px-8 py-10 lg:py-0 md:h-full">
          <InformationText />
          <MusicSearch />
        </div>
      </section>
    </>
  );
}
