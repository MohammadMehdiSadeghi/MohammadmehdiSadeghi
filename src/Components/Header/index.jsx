import React from "react";
import { Link } from "react-router-dom";
import { useActiveNav } from "../../Hooks/useActiveNav";

export default function Header() {
  const { isActive } = useActiveNav();

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

  /* the last entry (_Contact-me) is rendered on the right edge; the rest sit
     in the middle group */
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
            Mohammad-Mehdi-Sadeghi
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

        {/* Full-screen menu. It is `fixed inset-0`, so it covers the header
            too — the brand row is re-drawn inside it so the top of the panel
            reads as the header expanded, and the hamburger label stays
            clickable above the panel via its own z-50 (it becomes the ✕).

            Closed state is `visibility: hidden` + `opacity: 0`, so nothing
            paints and nothing is hit-testable — see the note in index.css for
            why a collapsed panel must never carry borders. */}
        <div className="mobile-nav-panel lg:hidden fixed inset-0 z-40 bg-[#0F172B] overflow-y-auto overscroll-contain">
          {/* Ambient glows, matching the decorative blobs used on the pages. */}
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
            {/* Mirrors the header bar so the panel looks like the header
                unfolding rather than a separate sheet sliding over it. */}
            <div className="flex h-[58px] shrink-0 items-center px-4 sm:px-6 border-b-[1px] border-[#90a1b977]">
              <span className="font-mono text-[14px] sm:text-[16px] text-[#90A1B9] truncate max-w-[220px] sm:max-w-none">
                Mohammad-Mehdi-Sadeghi
              </span>
            </div>

            <div className="flex flex-1 flex-col px-4 sm:px-6 pt-6 pb-8">
              <p
                className="mobile-nav-item font-mono text-[11px] text-[#90A1B9]/70"
                style={{ "--i": 0 }}
              >
                {"// navigation"}
              </p>

              <ul className="mt-3 flex flex-col">
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
                  <a
                    href="https://github.com/MohammadMehdiSadeghi"
                    target="_blank"
                    rel="noreferrer"
                    className="transition-colors hover:text-white"
                  >
                    github
                  </a>
                  <a
                    href="https://t.me/Mohammad_sadeghi34"
                    target="_blank"
                    rel="noreferrer"
                    className="transition-colors hover:text-white"
                  >
                    telegram
                  </a>
                  <a
                    href="mailto:mohammad12345sadeghi@gmail.com"
                    className="transition-colors hover:text-white"
                  >
                    email
                  </a>
                </div>
              </div>
            </div>
          </div>
        </div>
      </div>
    </header>
  );
}