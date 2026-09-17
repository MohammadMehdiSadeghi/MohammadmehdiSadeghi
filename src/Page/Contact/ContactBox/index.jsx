import React from "react";
import SnakeBar from "../../../Components/SnakeBar";

const gray = "#90A1B9";

export default function ContactBox() {
  return (
    <section className="flex justify-start md:h-full border-b md:border-b-0 border-[#90a1b977]">
      <div className="hidden md:block relative w-14 border-r-[1px] border-[#90a1b977] h-[calc(100vh-112px)]">
        <SnakeBar />
      </div>
      <nav
        className="w-full md:w-[323px] shrink-0 md:border-r-[1px] border-[#90a1b977] max-h-[45vh] overflow-y-auto md:max-h-none md:h-[calc(100vh-116px)]"
        style={{ color: gray }}
      >
        <ul className="flex flex-col pb-3 gap-5 h-fit">
          <h2 className="px-4 sm:px-7 py-3.5 w-full flex items-center gap-2.5 border-b-[1px]  text-white border-[#90a1b977]">
            contacts{" "}
            <img className="w-3" src="/assets/Images/Vector.svg" alt="" />
          </h2>
          <li className="px-4 sm:px-12 flex gap-3 break-all">
            <a
              className="flex gap-3"
              href="mailto:mohammad12345sadeghi@gmail.com"
            >
              <img
                className="w-5 shrink-0"
                src="/assets/Images/icon message.svg"
                alt=""
              />
              mohammad12345sadeghi@gmail.com
            </a>
          </li>
          <li className="px-4 sm:px-12 flex gap-3">
            <a className="flex gap-3" href="tel:+989150669620">
              <img
                className="w-5 shrink-0"
                src="/assets/Images/icon phone.svg"
                alt=""
              />
              +98 915 066 9620
            </a>
          </li>
          <li className="px-4 sm:px-12 flex gap-3">
            <a className="flex gap-3" href="https://t.me/Mohammad_sadeghi34">
              <img
                className="w-6 shrink-0"
                src="/assets/Images/BasilTelegramSolid.png"
                alt=""
              />
              <span className="mr-[-8px]">@</span>Mohammad_sadeghi34
            </a>
          </li>
          <li className={`px-4 sm:px-12 gap-3 flex`}>
            <a className="flex gap-3" href="https://www.instagram.com/Mohammad_sadeghi3447">
              <img
                className="w-6 shrink-0"
                src="/assets/Images/TablerBrandInstagram.png"
                alt=""
              />
              <span className="mr-[-8px]">@</span>Mohammad_sadeghi3447
            </a>
          </li>
        </ul>
      </nav>
    </section>
  );
}
