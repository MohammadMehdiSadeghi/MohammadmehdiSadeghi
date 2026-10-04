import { useEffect, useState, useCallback } from "react";
import { Link, NavLink, Outlet, useNavigate } from "react-router-dom";
import { useAdminAuth } from "../../../Hooks/useAdminAuth";

const navItems = [
  { to: "/admin/stats", label: "stats.tsx", hint: "site analytics" },
  { to: "/admin/projects", label: "projects.json", hint: "manage projects" },
  { to: "/admin/blog", label: "blog", hint: "write posts" },
  { to: "/admin/skills", label: "skills.json", hint: "manage skills" },
  { to: "/admin/site", label: "site.json", hint: "email & social links" },
  { to: "/admin/messages", label: "messages.log", hint: "contact inbox", isInbox: true },
  { to: "/admin/telegram", label: "telegram.bot", hint: "form → telegram" },
  { to: "/admin/moods", label: "moods.json", hint: "vibe QC" },
  { to: "/admin/security", label: "security.key", hint: "change password" },
];

export default function AdminLayout() {
  const { logout, authFetch } = useAdminAuth();
  const navigate = useNavigate();
  const [menuOpen, setMenuOpen] = useState(false);
  const [unseenMessagesCount, setUnseenMessagesCount] = useState(0);

  const fetchUnseenCount = useCallback(async () => {
    try {
      const res = await authFetch("/api/admin/messages");
      if (res.ok) {
        const data = await res.json();
        const msgs = data.messages || [];
        const count = msgs.filter((m) => m.status === "unseen").length;
        setUnseenMessagesCount(count);
      }
    } catch {
      // ignore network errors in polling
    }
  }, [authFetch]);

  useEffect(() => {
    fetchUnseenCount();
    const interval = setInterval(fetchUnseenCount, 15000);

    const handleMessagesUpdated = (e) => {
      if (e?.detail && Array.isArray(e.detail)) {
        const count = e.detail.filter((m) => m.status === "unseen").length;
        setUnseenMessagesCount(count);
      } else {
        fetchUnseenCount();
      }
    };

    window.addEventListener("messages-updated", handleMessagesUpdated);
    return () => {
      clearInterval(interval);
      window.removeEventListener("messages-updated", handleMessagesUpdated);
    };
  }, [fetchUnseenCount]);

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
            className="md:hidden text-[#90A1B9] w-7 h-7 flex items-center justify-center shrink-0 relative"
            onClick={() => setMenuOpen((v) => !v)}
          >
            <svg className="w-4 h-4" fill="none" stroke="currentColor" viewBox="0 0 24 24" strokeWidth="2">
              <path strokeLinecap="round" strokeLinejoin="round" d="M4 6h16M4 12h16M4 18h16" />
            </svg>
            {unseenMessagesCount > 0 && (
              <span className="absolute top-1 right-1 w-2 h-2 rounded-full bg-[#FF5F56] ring-2 ring-[#0F172B]" />
            )}
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
                  `flex flex-col gap-0.5 rounded-md px-3 py-2.5 text-[12px] duration-150 border-l-2 relative ${
                    isActive
                      ? "bg-[#7888a01a] border-l-[#FFB86A] text-white"
                      : "border-l-transparent text-[#90A1B9] hover:bg-[#7888a00d] hover:text-white"
                  }`
                }
              >
                <div className="flex items-center justify-between w-full">
                  <span className="flex items-center gap-2">
                    <span className="text-[#615FFF]">#</span>
                    <span>{item.label}</span>
                  </span>

                  {/* Shopping cart style counter badge */}
                  {item.isInbox && unseenMessagesCount > 0 && (
                    <span
                      className="inline-flex items-center justify-center min-w-[18px] h-[18px] px-1.5 text-[10px] font-bold rounded-full bg-[#FF5F56] text-white shadow-[0_0_8px_rgba(255,95,86,0.6)] animate-pulse shrink-0"
                      title={`${unseenMessagesCount} unread incoming entries`}
                    >
                      {unseenMessagesCount > 99 ? "99+" : unseenMessagesCount}
                    </span>
                  )}
                </div>
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

