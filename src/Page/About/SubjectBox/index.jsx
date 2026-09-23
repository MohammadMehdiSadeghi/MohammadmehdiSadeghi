import React, { useState } from "react";
import SnakeBar from "../../../Components/SnakeBar";
import useClickTrack from "../../../Hooks/useClickTrack";
import { useSiteInfo } from "../../../Hooks/useSiteInfo";

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
  const site = useSiteInfo();

  return (
    <section className="flex justify-start md:h-full  border-[#90a1b977]">
      <div className="hidden lg:block relative w-14 border-r-[1px] border-[#90a1b977] h-[calc(100vh-116px)]">
        <SnakeBar />
      </div>
      <nav
        className="w-full lg:w-[400px] xl:w-[457px] shrink-0 lg:border-r-[1px] border-[#90a1b977] lg:max-h-none lg:h-[calc(100vh-116px)] lg:overflow-y-auto"
        style={{ color: gray }}
      >
        <ul className="flex flex-col h-fit">
          <h2
            onClick={() => setPersonalInfoOpen((prev) => !prev)}
            className="px-4 sm:px-7 py-3.5 w-full flex items-center gap-2.5 border-b-[1px] text-white border-[#90a1b977] cursor-pointer select-none lg:cursor-default"
          >
            personal-info{" "}
            <img
              className={`w-3 duration-200 ${personalInfoOpen ? "max-lg:rotate-90" : "max-lg:rotate-0"}`}
              src="/assets/Images/Vector.svg"
              alt=""
            />
          </h2>
          <li
            onClick={() => {
              trackClick({ targetType: "button", targetId: "tab-bio", targetLabel: "Bio Tab" });
              setActiveTab("aboutMe");
            }}
            className={`px-4 sm:px-12 py-3 duration-100 cursor-pointer gap-3 ${
              activeTab === "aboutMe"
                ? "border-b-[1px] border-b-[#90A1B9] bg-[#7888a033] text-white"
                : ""
            } hover:bg-[#7888a033] ${personalInfoOpen ? "flex" : "hidden"} lg:flex`}
          >
            <img src="/assets/Images/icon folder.svg" alt="" />
            bio
          </li>
          <li
            onClick={() => {
              trackClick({ targetType: "button", targetId: "tab-education", targetLabel: "Education Tab" });
              setActiveTab("education");
            }}
            className={`px-4 sm:px-12 py-3 duration-100 cursor-pointer gap-3 ${
              activeTab === "education"
                ? "border-b-[1px] border-b-[#90A1B9] border-t-[1px] border-t-[#90A1B9] bg-[#7888a033] text-white"
                : ""
            } hover:bg-[#7888a033] ${personalInfoOpen ? "flex" : "hidden"} lg:flex`}
          >
            <img src="/assets/Images/icon folder2.svg" alt="" />
            education
          </li>
          <li
            onClick={() => {
              trackClick({ targetType: "button", targetId: "tab-skills", targetLabel: "Skills Tab" });
              setActiveTab("skills");
            }}
            className={`px-4 sm:px-12 py-3 duration-100 cursor-pointer gap-3 ${
              activeTab === "skills"
                ? "border-b-[1px] border-b-[#90A1B9] border-t-[1px] border-t-[#90A1B9] bg-[#7888a033] text-white"
                : "lg:border-b-[1px] lg:border-b-[#90a1b977]"
            } hover:bg-[#7888a033] ${personalInfoOpen ? "flex" : "hidden"} lg:flex`}
          >
            <img src="/assets/Images/icon folder3.svg" alt="" />
            skills
          </li>
        </ul>

        {mobileContent}

        <ul className="flex flex-col pb-3 gap-5 h-fit">
          <h2
            onClick={() => setContactsOpen((prev) => !prev)}
            className="px-4 sm:px-7 py-3.5 w-full flex items-center gap-2.5 border-b-[1px] text-white border-[#90a1b977] cursor-pointer select-none lg:cursor-default"
          >
            contacts{" "}
            <img
              className={`w-3 duration-200 ${contactsOpen ? "max-lg:rotate-90" : "max-lg:rotate-0"}`}
              src="/assets/Images/Vector.svg"
              alt=""
            />
          </h2>
          {site.email && (
            <li
              className={`px-4 sm:px-8 lg:px-10 items-center gap-3 ${contactsOpen ? "flex" : "hidden"} lg:flex`}
            >
              <a
                className="flex items-center gap-3 whitespace-nowrap text-[13px] sm:text-[14px] hover:text-white transition-colors"
                href={`mailto:${site.email}`}
                onClick={() => trackClick({ targetType: "button", targetId: "contact-email", targetLabel: "Email Contact" })}
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
            <li
              className={`px-4 sm:px-8 lg:px-10 items-center gap-3 ${contactsOpen ? "flex" : "hidden"} lg:flex`}
            >
              <a className="flex items-center gap-3 whitespace-nowrap text-[13px] sm:text-[14px] hover:text-white transition-colors" href={`tel:${site.phone}`} onClick={() => trackClick({ targetType: "button", targetId: "contact-phone", targetLabel: "Phone Contact" })}>
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
            <li
              className={`px-4 sm:px-8 lg:px-10 items-center gap-3 ${contactsOpen ? "flex" : "hidden"} lg:flex`}
            >
              <a className="flex items-center gap-3 whitespace-nowrap text-[13px] sm:text-[14px] hover:text-white transition-colors" href={site.telegram} onClick={() => trackClick({ targetType: "button", targetId: "contact-telegram", targetLabel: "Telegram Contact" })}>
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
            <li
              className={`px-4 pb-4 border-b lg:border-b-0 sm:px-8 lg:px-10 items-center gap-3 ${contactsOpen ? "flex" : "hidden"} lg:flex`}
            >
              <a className="flex items-center gap-3 whitespace-nowrap text-[13px] sm:text-[14px] hover:text-white transition-colors" href={site.instagram} onClick={() => trackClick({ targetType: "button", targetId: "contact-instagram", targetLabel: "Instagram Contact" })}>
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
