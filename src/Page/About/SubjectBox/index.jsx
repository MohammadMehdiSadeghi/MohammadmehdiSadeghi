import React, { useState } from "react";
import SnakeBar from "../../../Components/SnakeBar";
import useClickTrack from "../../../Hooks/useClickTrack";

const gray = "#90A1B9";

export default function SubjectBox({
  setActiveTab,
  activeTab,
  personalInfoOpen,
  setPersonalInfoOpen,
  mobileContent,
}) {
  const [contactsOpen, setContactsOpen] = useState(false);
  const { trackClick } = useClickTrack();

  return (
    <section className="flex justify-start md:h-full border-[#90a1b977]">
      <div className="hidden lg:block relative w-14 border-r-[1px] border-[#90a1b977] h-[calc(100vh-116px)]">
        <SnakeBar />
      </div>
      <nav
        className="w-full md:w-60 lg:w-72 xl:w-[360px] 2xl:w-[457px] shrink-0 md:border-r-[1px] border-[#90a1b977] md:max-h-none md:h-[calc(100vh-116px)] md:overflow-y-auto"
        style={{ color: gray }}
      >
        <ul className="flex flex-col h-fit">
          <h2
            onClick={() => setPersonalInfoOpen((prev) => !prev)}
            className="px-4 sm:px-7 py-3.5 w-full flex items-center gap-2.5 border-b-[1px] text-white border-[#90a1b977] cursor-pointer select-none md:cursor-default"
          >
            personal-info{" "}
            <img
              className={`w-3 duration-200 ${personalInfoOpen ? "max-md:rotate-90" : "max-md:rotate-0"}`}
              src="/assets/Images/Vector.svg"
              alt=""
            />
          </h2>
          <li
            onClick={() => {
              trackClick({ targetType: "button", targetId: "tab-bio", targetLabel: "Bio Tab" });
              setActiveTab("aboutMe");
            }}
            className={`px-4 sm:px-8 md:px-6 lg:px-10 py-3 duration-100 ${activeTab === "aboutMe" ? "border-b border-b-[1px] border-[#90A1B9]" : ""} ${activeTab === "aboutMe" ? "bg-[#7888a033]" : ""} ${activeTab === "aboutMe" ? "text-white" : ""} hover:bg-[#7888a033] cursor-pointer gap-3 ${personalInfoOpen ? "flex" : "hidden"} md:flex`}
          >
            <img src="/assets/Images/icon folder.svg" alt="" />
            bio
          </li>
          <li
            onClick={() => {
              trackClick({ targetType: "button", targetId: "tab-education", targetLabel: "Education Tab" });
              setActiveTab("education");
            }}
            className={`px-4 sm:px-8 md:px-6 lg:px-10 py-3 duration-100 ${activeTab === "education" ? "border-b border-b-[1px] border-[#90A1B9] border-t-[1px]" : ""} ${activeTab === "education" ? "bg-[#7888a033]" : ""} ${activeTab === "education" ? "text-white" : ""} hover:bg-[#7888a033] cursor-pointer gap-3 ${personalInfoOpen ? "flex" : "hidden"} md:flex`}
          >
            <img src="/assets/Images/icon folder2.svg" alt="" />
            education
          </li>
          <li
            onClick={() => {
              trackClick({ targetType: "button", targetId: "tab-skills", targetLabel: "Skills Tab" });
              setActiveTab("skills");
            }}
            className={`px-4 sm:px-8 md:px-6 lg:px-10 py-3 duration-100 ${activeTab === "skills" ? "border-b border-b-[1px] border-[#90A1B9] border-t-[1px]" : ""} ${activeTab === "skills" ? "bg-[#7888a033]" : ""} ${activeTab === "skills" ? "text-white" : ""} hover:bg-[#7888a033] cursor-pointer gap-3 ${personalInfoOpen ? "flex" : "hidden"} md:flex`}
          >
            <img src="/assets/Images/icon folder3.svg" alt="" />
            skills
          </li>
        </ul>

        {mobileContent}

        <ul className="flex flex-col pb-3 gap-1.5 h-fit">
          <h2
            onClick={() => setContactsOpen((prev) => !prev)}
            className="px-4 sm:px-7 py-3.5 w-full flex items-center gap-2.5 border-b-[1px] border-t-[1px] text-white border-[#90a1b977] cursor-pointer select-none md:cursor-default"
          >
            contacts{" "}
            <img
              className={`w-3 duration-200 ${contactsOpen ? "max-md:rotate-90" : "max-md:rotate-0"}`}
              src="/assets/Images/Vector.svg"
              alt=""
            />
          </h2>
          <li className={`${contactsOpen ? "flex" : "hidden"} md:flex`}>
            <a
              className="w-full flex items-center gap-2.5 sm:gap-3 px-4 sm:px-6 md:px-5 lg:px-8 py-2.5 text-[12px] sm:text-[14px] hover:text-white hover:bg-[#7888a01a] transition-all duration-150 cursor-pointer min-w-0"
              href="mailto:mohammad12345sadeghi@gmail.com"
              onClick={() => trackClick({ targetType: "button", targetId: "contact-email", targetLabel: "Email Contact" })}
            >
              <img
                className="w-5 shrink-0"
                src="/assets/Images/icon message.svg"
                alt=""
              />
              <span className="truncate">mohammad12345sadeghi@gmail.com</span>
            </a>
          </li>
          <li className={`${contactsOpen ? "flex" : "hidden"} md:flex`}>
            <a
              className="w-full flex items-center gap-2.5 sm:gap-3 px-4 sm:px-6 md:px-5 lg:px-8 py-2.5 text-[12px] sm:text-[14px] hover:text-white hover:bg-[#7888a01a] transition-all duration-150 cursor-pointer min-w-0"
              href="tel:+989150669620"
              onClick={() => trackClick({ targetType: "button", targetId: "contact-phone", targetLabel: "Phone Contact" })}
            >
              <img
                className="w-5 shrink-0"
                src="/assets/Images/icon phone.svg"
                alt=""
              />
              <span>+98 915 066 9620</span>
            </a>
          </li>
          <li className={`${contactsOpen ? "flex" : "hidden"} md:flex`}>
            <a
              className="w-full flex items-center gap-2.5 sm:gap-3 px-4 sm:px-6 md:px-5 lg:px-8 py-2.5 text-[12px] sm:text-[14px] hover:text-white hover:bg-[#7888a01a] transition-all duration-150 cursor-pointer min-w-0"
              href="https://t.me/Mohammad_sadeghi34"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackClick({ targetType: "button", targetId: "contact-telegram", targetLabel: "Telegram Contact" })}
            >
              <img
                className="w-5 shrink-0"
                src="/assets/Images/BasilTelegramSolid.png"
                alt=""
              />
              <span className="truncate">@Mohammad_sadeghi34</span>
            </a>
          </li>
          <li className={`border-b md:border-b-0 ${contactsOpen ? "flex" : "hidden"} md:flex`}>
            <a
              className="w-full flex items-center gap-2.5 sm:gap-3 px-4 sm:px-6 md:px-5 lg:px-8 py-2.5 text-[12px] sm:text-[14px] hover:text-white hover:bg-[#7888a01a] transition-all duration-150 cursor-pointer min-w-0"
              href="https://www.instagram.com/Mohammad_sadeghi3447"
              target="_blank"
              rel="noopener noreferrer"
              onClick={() => trackClick({ targetType: "button", targetId: "contact-instagram", targetLabel: "Instagram Contact" })}
            >
              <img
                className="w-5 shrink-0"
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
