import React from "react";
import SnakeBar from "../../../Components/SnakeBar";
import { useSiteInfo } from "../../../Hooks/useSiteInfo";

const gray = "#90A1B9";

export default function ContactBox() {
  const site = useSiteInfo();

  return (
    <section className="flex justify-start lg:h-full border-b lg:border-b-0 border-[#90a1b977]">
      <div className="hidden lg:block relative w-14 border-r-[1px] border-[#90a1b977] h-[calc(100vh-112px)]">
        <SnakeBar />
      </div>
      <nav
        className="w-full lg:w-[400px] xl:w-[457px] shrink-0 lg:border-r-[1px] border-[#90a1b977] max-h-[45vh] overflow-y-auto lg:max-h-none lg:h-[calc(100vh-116px)]"
        style={{ color: gray }}
      >
        <ul className="flex flex-col pb-3 gap-5 h-fit">
          <h2 className="px-4 sm:px-7 py-3.5 w-full flex items-center gap-2.5 border-b-[1px]  text-white border-[#90a1b977]">
            contacts{" "}
            <img className="w-3" src="/assets/Images/Vector.svg" alt="" />
          </h2>
          {site.email && (
            <li className="px-4 sm:px-8 lg:px-10 flex items-center gap-3">
              <a
                className="flex items-center gap-3 whitespace-nowrap text-[13px] sm:text-[14px] hover:text-white transition-colors"
                href={`mailto:${site.email}`}
              >
                <img
                  className="w-5 shrink-0"
                  src="/assets/Images/icon message.svg"
                  alt=""
                />
                <span>{site.email}</span>
              </a>
            </li>
          )}
          {site.phone && (
            <li className="px-4 sm:px-8 lg:px-10 flex items-center gap-3">
              <a className="flex items-center gap-3 whitespace-nowrap text-[13px] sm:text-[14px] hover:text-white transition-colors" href={`tel:${site.phone}`}>
                <img
                  className="w-5 shrink-0"
                  src="/assets/Images/icon phone.svg"
                  alt=""
                />
                <span>{site.phoneLabel || site.phone}</span>
              </a>
            </li>
          )}
          {site.telegram && (
            <li className="px-4 sm:px-8 lg:px-10 flex items-center gap-3">
              <a className="flex items-center gap-3 whitespace-nowrap text-[13px] sm:text-[14px] hover:text-white transition-colors" href={site.telegram}>
                <img
                  className="w-6 shrink-0"
                  src="/assets/Images/BasilTelegramSolid.png"
                  alt=""
                />
                <span>{site.telegramHandle ? `@${site.telegramHandle}` : "telegram"}</span>
              </a>
            </li>
          )}
          {site.instagram && (
            <li className="px-4 sm:px-8 lg:px-10 flex items-center gap-3">
              <a className="flex items-center gap-3 whitespace-nowrap text-[13px] sm:text-[14px] hover:text-white transition-colors" href={site.instagram}>
                <img
                  className="w-6 shrink-0"
                  src="/assets/Images/TablerBrandInstagram.png"
                  alt=""
                />
                <span>{site.instagramHandle ? `@${site.instagramHandle}` : "instagram"}</span>
              </a>
            </li>
          )}
        </ul>
      </nav>
    </section>
  );
}
