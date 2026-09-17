import React from "react";

export default function Footer() {
  return (
    <footer className="w-full min-h-[58px] sm:h-[58px] bg-[#0F172B] flex items-center justify-center">
      <nav
        className="w-full h-full flex flex-row gap-2 sm:gap-0 justify-between items-center text-[#90A1B9]
       border-t-[1px] border-[#90a1b977] py-2 sm:py-0"
      >
        <ul className="flex items-center justify-center gap-1 lg:gap-0">
          <li className="py-2 sm:py-[15px] px-3 sm:px-[24px] pr-2 sm:pr-10 text-[13px] sm:text-[16px] text-center border-r-0 lg:border-r-[1px] border-[#90a1b977]">
            <p>find-me-in :</p>
          </li>
          <li className="py-2 sm:py-[8px] px-2.5 sm:px-[16px] border-r-0 md:border-r-0
           lg:border-r-[1px] border-[#90a1b977] lg:rounded-none bg-[#1D293D] rounded-md lg:bg-transparent">
            <a
              href="https://www.linkedin.com/in/mohammad-mehdi-sadeghi"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                className="w-[27px] sm:w-[39px]"
                src="/assets/Images/RiLinkedinFill.png"
                alt="LinkedIn"
              />
            </a>
          </li>
          <li className="py-2 sm:py-[11px] px-2.5 sm:px-[16px] border-r-0 lg:border-r-[1px] border-[#90a1b977]
           bg-[#1D293D] lg:rounded-none rounded-md lg:bg-transparent">
            <a
              href="https://t.me/Mohammad_sadeghi34"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img
                className="w-7 sm:w-[35px]"
                src="/assets/Images/BasilTelegramSolid.png"
                alt="Telegram"
              />
            </a>
          </li>
        </ul>
        <ul>
          <li
            className="py-2 sm:py-[11px] px-3 sm:px-[16px] sm:border-l-[1px] text-[13px] sm:text-[14px] border-[#90a1b977] 
          flex items-center justify-center gap-3 sm:gap-4"
          >
            <p className=" hidden lg:block">
              <span className="m-1">@</span>MohammadMehdiSadeghi
            </p>
            <p className=" lg:hidden block">Github :</p>
            <a
              href="https://github.com/MohammadMehdiSadeghi"
              target="_blank"
              rel="noopener noreferrer"
            >
              <img className="w-7" src="/assets/Images/MdiGithub.png" alt="GitHub" />
            </a>
          </li>
        </ul>
      </nav>
    </footer>
  );
}
