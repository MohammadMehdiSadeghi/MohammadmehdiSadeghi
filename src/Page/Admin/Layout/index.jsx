import { useState } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../../Hooks/useAdminAuth";

const navItems = [
  { to: "/admin/stats", label: "stats.tsx", hint: "site analytics" },
  { to: "/admin/projects", label: "projects.json", hint: "manage projects" },
  { to: "/admin/blog", label: "blog", hint: "write posts" },
  { to: "/admin/skills", label: "skills.json", hint: "manage skills" },
  { to: "/admin/messages", label: "messages.log", hint: "contact inbox" },
  { to: "/admin/telegram", label: "telegram.bot", hint: "form → telegram" },
  { to: "/admin/moods", label: "moods.json", hint: "vibe QC" },
  { to: "/admin/database", label: "database", hint: "file manager" },
  { to: "/admin/security", label: "security.key", hint: "change password" },
];

export default function AdminLayout() {
  const { logout } = useAdminAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);

  const handleLogout = () => {
    logout();
    navigate("/admin/login", { replace: true });
  };

  return (
    <div className="min-h-screen w-full bg-[#0B0F1A] text-[#90A1B9] flex flex-col">
      {/* title bar */}
      <header className="h-11 shrink-0 flex items-center justify-between px-3 sm:px-4 bg-[#0F172B] border-b border-[#1E293B] relative z-20">
        <div className="flex items-center gap-3 sm:gap-4 min-w-0">
          <button
            type="button"
            aria-label="toggle menu"
            className="md:hidden text-[#90A1B9] w-7 h-7 flex items-center justify-center shrink-0"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <span className="text-[16px] leading-none">☰</span>
          </button>
          <div className="flex items-center gap-2 shrink-0">
            <span className="w-2.5 h-2.5 rounded-full bg-[#FF5F56]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#FFBD2E]" />
            <span className="w-2.5 h-2.5 rounded-full bg-[#27C93F]" />
          </div>
          <p className="text-[11px] text-[#68768C] truncate hidden sm:block">
            admin@portfolio:<span className="text-[#615FFF]">~/dashboard</span>
          </p>
        </div>
        <div className="flex items-center gap-2 sm:gap-3 shrink-0">
          <Link
            to="/"
            className="text-[10px] sm:text-[11px] px-2.5 sm:px-3 py-1.5 rounded-md border border-[#314158] text-[#90A1B9] hover:border-[#90A1B9] hover:text-white duration-150"
          >
            view-site
          </Link>
          <button
            onClick={handleLogout}
            className="text-[10px] sm:text-[11px] px-2.5 sm:px-3 py-1.5 rounded-md border border-[#314158] text-[#90A1B9] hover:border-[#C27AFF] hover:text-[#C27AFF] duration-150"
          >
            _logout()
          </button>
        </div>
      </header>

      <div className="flex flex-1 min-h-0 relative">
        {/* mobile overlay */}
        {menuOpen && (
          <div
            className="md:hidden fixed inset-0 top-11 bg-black/50 z-10"
            onClick={() => setMenuOpen(false)}
          />
        )}

        {/* sidebar */}
        <aside
          className={`${
            menuOpen ? "translate-x-0" : "-translate-x-full"
          } md:translate-x-0 transition-transform duration-200 flex flex-col w-64 shrink-0 bg-[#0F172B] border-r border-[#1E293B] fixed md:static top-11 md:top-auto bottom-0 md:bottom-auto left-0 z-20 overflow-y-auto`}
        >
          <p className="px-4 pt-4 pb-2 text-[10px] tracking-wider text-[#4B576D] uppercase">
            // explorer
          </p>
          <nav className="flex flex-col px-2 gap-0.5">
            {navItems.map((item) => (
              <NavLink
                key={item.to}
                to={item.to}
                onClick={() => setMenuOpen(false)}
                className={({ isActive }) =>
                  `flex flex-col gap-0.5 rounded-md px-3 py-2.5 text-[12px] duration-150 border-l-2 ${
                    isActive
                      ? "bg-[#7888a01a] border-l-[#FFB86A] text-white"
                      : "border-l-transparent text-[#90A1B9] hover:bg-[#7888a00d] hover:text-white"
                  }`
                }
              >
                <span className="flex items-center gap-2">
                  <span className="text-[#615FFF]">#</span>
                  {item.label}
                </span>
                <span className="text-[10px] text-[#68768C] pr-4">
                  {item.hint}
                </span>
              </NavLink>
            ))}
          </nav>
          <div className="mt-auto p-4 text-[10px] text-[#4B576D] border-t border-[#1E293B]">
            admin-panel v1.0.0
          </div>
        </aside>

        {/* main content */}
        <main className="flex-1 min-w-0 overflow-y-auto">
          <div className="p-4 sm:p-6 lg:p-8 max-w-[1400px] mx-auto">
            <Outlet />
          </div>
        </main>
      </div>
    </div>
  );
}
