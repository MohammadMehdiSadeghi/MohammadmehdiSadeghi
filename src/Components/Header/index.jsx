import React from "react";
import { Link } from "react-router-dom";
import { useActiveNav } from "../../Hooks/useActiveNav";
import { useSiteInfo } from "../../Hooks/useSiteInfo";

export default function Header() {
  const { isActive } = useActiveNav();
  const site = useSiteInfo();

  const closeMobileMenu = () => {
    const toggle = document.getElementById("nav-toggle");
    if (toggle) toggle.checked = false;
  };

  const links = [
    { to: "/", key: "home", label: "_Home" },
    { to: "/about", key: "about", label: "_About" },
    { to: "/project", key: "project", label: "_Project" },
    { to: "/blog", key: "blog", label: "_Blog" },
    { to: "/contact", key: "contact", label: "_Contact-me" },
  ];

  const middleLinks = links.slice(0, links.length - 1);

  return (
    <header className="relative h-[58px] w-full bg-[#0F172B]">
      <div className="relative w-full h-[58px] flex items-center justify-between px-4 sm:px-6 lg:px-0 border-b-[1px] border-[#90a1b977]">
        <input
          type="checkbox"
          id="nav-toggle"
          className="nav-toggle"
          aria-label="Toggle navigation menu"
        />

        <div className="flex items-center h-full min-w-0">
          <Link
            to="/"
            className="text-[14px] lg:w-[456px] xl:w-[513px] shrink-0 sm:text-[16px] text-[#90A1B9] py-[16px] px-4 sm:px-6 lg:px-[24px] lg:border-r-[1px] lg:border-[#90a1b977] truncate max-w-[220px] sm:max-w-none"
          >
            {site.brand}
          </Link>

          <ul className="hidden lg:flex items-center h-full">
            {middleLinks.map((link, index) => (
              <li
                key={link.key}
                className={`flex justify-center items-center h-full ${
                  link.key === "home" ? "border-r border-[#90a1b977]" : ""
                } ${
                  index > 1 ? "border-l border-[#90a1b977]" : ""
                } ${
                  index === middleLinks.length - 1
                    ? "border-r border-[#90a1b977]"
                    : ""
                }`}
              >
                <Link
                  className={`py-[16px] px-2.5 lg:px-4 xl:px-6 text-center text-[#90A1B9] transition-all duration-500 border-b-4 ${
                    isActive(link.key)
                      ? "border-b-[#FFB86A] text-white"
                      : "border-b-transparent"
                  }`}
                  to={link.to}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>

        <ul className="hidden lg:flex items-center h-full shrink-0">
          <li className="border-l-[1px] border-[#90a1b977] flex justify-center items-center h-full">
            <Link
              className={`py-[16px] px-3 lg:px-5 xl:px-[30px] text-center text-[#90A1B9] transition-all duration-500 border-b-4 ${
                isActive("contact")
                  ? "border-b-[#FFB86A] text-white"
                  : "border-b-transparent"
              }`}
              to="/contact"
            >
              _Contact-me
            </Link>
          </li>
        </ul>

        <label
          htmlFor="nav-toggle"
          className="mobile-menu lg:hidden flex items-center justify-center w-10 h-10 cursor-pointer relative z-50"
        >
          <div className="hamburger-icon">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </label>

        <div className="mobile-nav-panel lg:hidden fixed inset-0 z-40 bg-[#0F172B] overflow-y-auto overscroll-contain">
          <div
            className="pointer-events-none absolute inset-0 overflow-hidden"
            aria-hidden="true"
          >
            <div
              className="absolute -top-28 -right-24 w-80 h-80 rounded-full blur-[100px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(97,95,255,0.38), transparent 70%)",
              }}
            />
            <div
              className="absolute -bottom-28 -left-24 w-80 h-80 rounded-full blur-[100px]"
              style={{
                background:
                  "radial-gradient(circle, rgba(0,213,190,0.20), transparent 70%)",
              }}
            />
          </div>

          <div className="relative flex min-h-full flex-col">
            <div className="flex h-[58px] shrink-0 items-center px-4 sm:px-6 border-b-[1px] border-[#90a1b977]">
              <span className="font-mono text-[14px] sm:text-[16px] text-[#90A1B9] truncate max-w-[220px] sm:max-w-none">
                {site.brand}
              </span>
            </div>

            <div className="flex flex-1 flex-col px-4 sm:px-6 pt-6 pb-8">
              <ul className="flex flex-col">
                {links.map((link, index) => {
                  const active = isActive(link.key);
                  return (
                    <li
                      key={link.key}
                      className="mobile-nav-item"
                      style={{ "--i": index + 1 }}
                    >
                      <Link
                        to={link.to}
                        onClick={closeMobileMenu}
                        className={`group relative flex items-center gap-4 py-4 pl-3 pr-1 border-b-[1px] border-[#90a1b933] transition-colors duration-200 ${
                          active
                            ? "text-white"
                            : "text-[#90A1B9] hover:text-white"
                        }`}
                      >
                        {active && (
                          <span className="absolute left-0 top-1/2 -translate-y-1/2 h-6 w-[3px] rounded-full bg-[#FFB86A]" />
                        )}
                        <span
                          className={`font-mono text-[11px] w-6 shrink-0 ${
                            active ? "text-[#FFB86A]" : "text-[#90A1B9]/50"
                          }`}
                        >
                          {String(index + 1).padStart(2, "0")}
                        </span>
                        <span className="font-mono text-[17px] sm:text-[18px]">
                          {link.label}
                        </span>
                        <span
                          className={`ml-auto font-mono text-[13px] transition-transform duration-200 group-hover:translate-x-1 ${
                            active ? "text-[#FFB86A]" : "text-[#90A1B9]/40"
                          }`}
                        >
                          →
                        </span>
                      </Link>
                    </li>
                  );
                })}
              </ul>

              <div
                className="mobile-nav-item mt-auto pt-10"
                style={{ "--i": links.length + 1 }}
              >
                <p className="font-mono text-[12px] text-[#615FFF]">
                  {"> Front-end developer"}
                </p>
                <div className="mt-4 flex flex-wrap gap-x-5 gap-y-2 font-mono text-[12px] text-[#90A1B9]">
                  {site.github && (
                    <a
                      href={site.github}
                      target="_blank"
                      rel="noreferrer"
                      className="transition-colors hover:text-white"
                    >
                      github
                    </a>
                  )}
                  {site.telegram && (
                    <a
                      href={site.telegram}
                      target="_blank"
                      rel="noreferrer"
                      className="transition-colors hover:text-white"
                    >
                      telegram
                    </a>
                  )}
                  {site.email && (
                    <a
                      href={`mailto:${site.email}`}
                      className="transition-colors hover:text-white"
                    >
                      email
                    </a>
                  )}
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}