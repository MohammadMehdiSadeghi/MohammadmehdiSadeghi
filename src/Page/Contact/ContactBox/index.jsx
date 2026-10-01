import React from "react";
import SnakeBar from "../../../Components/SnakeBar";

const gray = "#90A1B9";

export default function ContactBox() {
  return (
    <section className="flex justify-start md:h-full border-b md:border-b-0 border-[#90a1b977]">
      <div className="hidden lg:block relative w-14 border-r-[1px] border-[#90a1b977] h-[calc(100vh-116px)]">
        <SnakeBar />
      </div>
      <nav
        className="w-full md:w-60 lg:w-72 xl:w-[360px] 2xl:w-[457px] shrink-0 md:border-r-[1px] border-[#90a1b977] md:max-h-none md:h-[calc(100vh-116px)] md:overflow-y-auto"
        style={{ color: gray }}
      >
        <ul className="flex flex-col pb-3 gap-5 h-fit">
          <h2 className="px-4 sm:px-7 py-3.5 w-full flex items-center gap-2.5 border-b-[1px] text-white border-[#90a1b977]">
            contacts{" "}
            <img className="w-3" src="/assets/Images/Vector.svg" alt="" />
          </h2>
          <li className="px-4 sm:px-6 md:px-5 lg:px-8 flex items-center gap-3">
            <a
              className="flex items-center gap-2.5 sm:gap-3 text-[12px] sm:text-[14px] hover:text-white transition-colors min-w-0 break-all"
              href="mailto:mohammad12345sadeghi@gmail.com"
            >
              <img
                className="w-5 shrink-0"
                src="/assets/Images/icon message.svg"
                alt=""
              />
              <span className="truncate">mohammad12345sadeghi@gmail.com</span>
            </a>
          </li>
          <li className="px-4 sm:px-6 md:px-5 lg:px-8 flex items-center gap-3">
            <a className="flex items-center gap-2.5 sm:gap-3 text-[12px] sm:text-[14px] hover:text-white transition-colors min-w-0" href="tel:+989150669620">
              <img
                className="w-5 shrink-0"
                src="/assets/Images/icon phone.svg"
                alt=""
              />
              <span>+98 915 066 9620</span>
            </a>
          </li>
          <li className="px-4 sm:px-6 md:px-5 lg:px-8 flex items-center gap-3">
            <a className="flex items-center gap-2.5 sm:gap-3 text-[12px] sm:text-[14px] hover:text-white transition-colors min-w-0" href="https://t.me/Mohammad_sadeghi34">
              <img
                className="w-6 shrink-0"
                src="/assets/Images/BasilTelegramSolid.png"
                alt=""
              />
              <span className="truncate">@Mohammad_sadeghi34</span>
            </a>
          </li>
          <li className="px-4 pb-4 border-b md:border-b-0 sm:px-6 md:px-5 lg:px-8 flex items-center gap-3">
            <a className="flex items-center gap-2.5 sm:gap-3 text-[12px] sm:text-[14px] hover:text-white transition-colors min-w-0" href="https://www.instagram.com/Mohammad_sadeghi3447">
              <img
                className="w-6 shrink-0"
                src="/assets/Images/TablerBrandInstagram.png"
                alt=""
              />
              <span className="truncate">@Mohammad_sadeghi3447</span>
            </a>
          </li>
        </ul>
      </nav>
    </section>
  );
}
