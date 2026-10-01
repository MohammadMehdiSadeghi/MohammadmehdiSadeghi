import React from "react";

export default function Footer() {
  return (
    <footer className="w-full min-h-[58px] bg-[#0F172B] flex items-center justify-center">
      <nav
        className="w-full h-full flex flex-row justify-between items-center text-[#90A1B9] border-t-[1px] border-[#90a1b977] px-2 sm:px-4 md:px-0 py-1.5 sm:py-0"
      >
        <ul className="flex items-center gap-1 sm:gap-2 lg:gap-0">
          <li className="py-2 sm:py-[15px] px-2 sm:px-4 lg:px-[24px] text-[12px] sm:text-[14px] lg:text-[16px] text-center border-r-0 lg:border-r-[1px] border-[#90a1b977]">
            <p>find-me-in :</p>
          </li>
          <li className="py-1.5 sm:py-[8px] px-2 sm:px-[14px] border-r-0 lg:border-r-[1px] border-[#90a1b977] lg:rounded-none bg-[#1D293D] rounded-md lg:bg-transparent flex items-center justify-center">
            <a
              href="https://www.linkedin.com/in/mohammad-mehdi-sadeghi"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="LinkedIn Profile"
            >
              <img
                className="w-6 sm:w-[32px] lg:w-[38px]"
                src="/assets/Images/RiLinkedinFill.png"
                alt="LinkedIn"
              />
            </a>
          </li>
          <li className="py-1.5 sm:py-[10px] px-2 sm:px-[14px] border-r-0 lg:border-r-[1px] border-[#90a1b977] bg-[#1D293D] lg:rounded-none rounded-md lg:bg-transparent flex items-center justify-center">
            <a
              href="https://t.me/Mohammad_sadeghi34"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="Telegram Profile"
            >
              <img
                className="w-6 sm:w-[30px] lg:w-[34px]"
                src="/assets/Images/BasilTelegramSolid.png"
                alt="Telegram"
              />
            </a>
          </li>
        </ul>
        <ul className="shrink-0">
          <li
            className="py-2 sm:py-[11px] px-2.5 sm:px-4 lg:px-[24px] sm:border-l-[1px] text-[12px] sm:text-[14px] border-[#90a1b977] flex items-center justify-center gap-2 sm:gap-4"
          >
            <p className="hidden lg:block">
              <span className="m-1">@</span>MohammadMehdiSadeghi
            </p>
            <p className="lg:hidden block text-[12px] sm:text-[13px]">Github :</p>
            <a
              href="https://github.com/MohammadMehdiSadeghi"
              target="_blank"
              rel="noopener noreferrer"
              aria-label="GitHub Profile"
            >
              <img className="w-6 sm:w-7" src="/assets/Images/MdiGithub.png" alt="GitHub" />
            </a>
          </li>
        </ul>
      </nav>
    </footer>
  );
}
