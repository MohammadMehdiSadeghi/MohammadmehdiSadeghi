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
    { to: "/contact", key: "contact", label: "_Contact-me" },
  ];

  return (
    <header className="relative h-[58px] w-full bg-[#0F172B]">
      <div className="relative w-full h-[58px] flex items-center justify-between px-4 sm:px-6 md:px-0 border-b-[1px] border-[#90a1b977]">
        <input
          type="checkbox"
          id="nav-toggle"
          className="nav-toggle"
          aria-label="Toggle navigation menu"
        />

        <div className="flex items-center h-full">
          <Link
            to="/"
            className="text-[14px] md:w-[379px] sm:text-[16px] text-[#90A1B9] py-[16px] md:px-[24px] md:border-r-[1px] md:border-[#90a1b977] truncate max-w-[220px] sm:max-w-none"
          >
            Mohammad-Mehdi-Sadeghi
          </Link>

          <ul className="hidden md:flex items-center h-full">
            {links.slice(0, 3).map((link, index) => (
              <li
                key={link.key}
                className={`border-l border-[#90a1b977] flex justify-center items-center h-full ${
                  index === links.slice(0, 3).length - 1
                    ? "border-r border-[#90a1b977]"
                    : ""
                }`}
              >
                <Link
                  className={`py-[16px] px-[42px] text-center text-[#90A1B9] transition-all duration-500 border-b-4 ${
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

        <ul className="hidden md:flex items-center h-full">
          <li className="border-l-[1px] border-[#90a1b977] flex justify-center items-center h-full">
            <Link
              className={`py-[16px] px-[42px] text-center text-[#90A1B9] transition-all duration-500 border-b-4 ${
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
          className="mobile-menu md:hidden flex items-center justify-center w-10 h-10 cursor-pointer relative z-50"
        >
          <div className="hamburger-icon">
            <span></span>
            <span></span>
            <span></span>
          </div>
        </label>

        <div className="mobile-nav-panel md:hidden absolute top-[55px] left-0 w-full bg-[#0F172B] border-t-[1px] border-b-[1px] border-[#90a1b977] z-40 shadow-2xl">
          <ul className="flex flex-col">
            {links.map((link) => (
              <li key={link.key} className="border-b-[1px] border-[#90a1b977]">
                <Link
                  className={`block w-full py-4 px-6 text-[14px] text-[#90A1B9] transition-all duration-300 ${
                    isActive(link.key)
                      ? "text-white bg-[#7888a033] border-l-4 border-l-[#FFB86A]"
                      : ""
                  }`}
                  to={link.to}
                  onClick={closeMobileMenu}
                >
                  {link.label}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      </div>
    </header>
  );
}