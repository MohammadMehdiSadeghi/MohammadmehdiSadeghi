import { useEffect, useState, useCallback } from "react";
import { useAdminAuth } from "../../../Hooks/useAdminAuth";
import AnimatedCounter from "../ui/AnimatedCounter";
import { BarChart } from "../ui/Charts";

const PAGE_COLORS = {
  "/": "#615FFF",
  "/about": "#4ADE80",
  "/project": "#FFB86A",
  "/contact": "#C27AFF",
  "/admin": "#FF6B6B",
  default: "#68768C",
};

function getPageColor(path) {
  if (!path || typeof path !== "string") return PAGE_COLORS.default;
  const exact = PAGE_COLORS[path];
  if (exact) return exact;
  for (const [key, color] of Object.entries(PAGE_COLORS)) {
    if (key === "default" || key === "/") continue;
    if (path.startsWith(key)) return color;
  }
  return PAGE_COLORS.default;
}

function StatCard({ label, value, accent, icon, delta }) {
  const isPositive = delta && delta > 0;
  const isNegative = delta && delta < 0;

  return (
    <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 flex flex-col gap-2 relative overflow-hidden group hover:border-white/[0.12] transition-all duration-500 hover:bg-white/[0.04]">
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-700 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${accent || "#615FFF"}12 0%, transparent 70%)`,
        }}
      />
      <div className="flex items-center justify-between relative z-10">
        <p
          className="text-[10px] uppercase tracking-widest"
          style={{ color: `${accent}99` }}
        >
          {label}
        </p>
        {icon && <span className="text-[14px]">{icon}</span>}
      </div>
      <div className="flex items-end gap-2 relative z-10">
        <p
          className="text-[26px] font-bold tabular-nums leading-none"
          style={{ fontFamily: "'Fira', monospace", color: accent || "#fff" }}
        >
          <AnimatedCounter value={value} />
        </p>
        {delta !== undefined && delta !== null && (
          <span
            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded mb-1 ${
              isPositive
                ? "text-[#4ADE80] bg-[#4ADE8015]"
                : isNegative
                  ? "text-[#FF6B6B] bg-[#FF6B6B15]"
                  : "text-[#68768C] bg-[#68768C15]"
            }`}
          >
            {isPositive ? "↑" : isNegative ? "↓" : "—"} {Math.abs(delta)}%
          </span>
        )}
      </div>
    </div>
  );
}

function shortDate(d) {
  const [, m, day] = d.split("-");
  return `${m}/${day}`;
}

function formatTime(iso) {
  try {
    const d = new Date(iso);
    return d.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  } catch {
    return "—";
  }
}

export default function ButtonsPage() {
  const { authFetch } = useAdminAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [filter, setFilter] = useState("all");

  const load = useCallback(
    async (showLoading) => {
      if (showLoading) setLoading(true);
      setError("");
      try {
        const res = await authFetch("/api/admin/stats");
        const json = await res.json();
        if (!res.ok) throw new Error(json.error || "Failed to load analytics");
        setData(json);
        setLastUpdate(new Date());
      } catch (err) {
        setError(err.message || "Failed to load analytics");
      } finally {
        setLoading(false);
      }
    },
    [authFetch],
  );

  useEffect(() => {
    load(true);
    const interval = setInterval(() => load(false), 15000);
    return () => clearInterval(interval);
  }, [load]);

  const buttonData = data && data.buttonAnalytics ? data.buttonAnalytics : {
    totalClicks: 0,
    todayClicks: 0,
    weekClicks: 0,
    topButtons: [],
    clicksByPage: [],
    clicksByType: [],
    recentClicks: [],
    clickTrend: [],
  };

  const topButtons = Array.isArray(buttonData.topButtons) ? buttonData.topButtons : [];

  const filteredButtons =
    filter === "all"
      ? topButtons
      : topButtons.filter((b) => b.page === filter);

  const pages = [
    "all",
    ...new Set(topButtons.map((b) => b.page || "/")),
  ];

  function formatLastUpdate() {
    if (!lastUpdate) return "";
    return lastUpdate.toLocaleTimeString("en-US", {
      hour: "2-digit",
      minute: "2-digit",
      second: "2-digit",
      hour12: false,
    });
  }

  return (
    <div className="flex flex-col gap-6" style={{ fontFamily: "'Fira', monospace" }}>
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-[#615FFF] text-[12px]" style={{ fontFamily: "'Fira', monospace" }}>
            $ cat ./analytics/buttons
          </p>
          <h1
            className="text-white text-[20px] mt-1 font-bold"
            style={{ fontFamily: "'Fira', monospace" }}
          >
            Button Analytics
          </h1>
          <p className="text-[#68768C] text-[11px] mt-1">
            Track every click across your entire site — buttons, links, forms & interactions
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-[9px] text-[#4B576D] tabular-nums" style={{ fontFamily: "'Fira', monospace" }}>
              updated {formatLastUpdate()}
            </span>
          )}
          <div className="flex items-center gap-2">
            <span className="relative flex h-2 w-2 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ADE80] opacity-75" />
              <span className="relative inline-flex rounded-full h-2 w-2 bg-[#4ADE80]" />
            </span>
            <span className="text-[10px] text-[#68768C]">live</span>
          </div>
        </div>
      </div>

      {loading && !data && (
        <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
          {[1, 2, 3, 4].map((i) => (
            <div key={i} className="h-24 rounded-xl bg-white/[0.03] animate-pulse" />
          ))}
        </div>
      )}

      {error && (
        <p className="text-[11px] text-[#FF6B6B] bg-[#FF6B6B14] border border-[#FF6B6B33] rounded-lg px-4 py-3 w-fit" style={{ fontFamily: "'Fira', monospace" }}>
          // {error}
        </p>
      )}

      {data && (
        <>
          {/* Stat Cards */}
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3 sm:gap-4">
            <StatCard label="total clicks" value={buttonData.totalClicks} accent="#615FFF" icon="👆" />
            <StatCard label="today" value={buttonData.todayClicks} accent="#FFB86A" icon="🔥" />
            <StatCard label="this week" value={buttonData.weekClicks} accent="#C27AFF" icon="📈" />
            <StatCard
              label="unique buttons"
              value={buttonData.topButtons?.length || 0}
              accent="#4ADE80"
              icon="🎯"
            />
          </div>

          {/* Click Trend */}
          {buttonData.clickTrend?.length > 0 && (
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-white text-[13px] font-medium" style={{ fontFamily: "'Fira', monospace" }}>
                  click-trend
                </p>
                <span className="text-[10px] text-[#4B576D]">last 7 days</span>
              </div>
              <BarChart
                data={buttonData.clickTrend.map((d) => ({
                  label: d.date,
                  value: d.total,
                }))}
                formatLabel={shortDate}
                color="#615FFF"
              />
            </div>
          )}

          {/* Page Filter + Top Buttons Table */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
            <div className="flex items-center justify-between mb-5 flex-wrap gap-3">
              <p className="text-white text-[13px] font-medium" style={{ fontFamily: "'Fira', monospace" }}>
                all-buttons
              </p>
              <div className="flex gap-1 rounded-lg border border-white/[0.06] p-1 bg-white/[0.02]">
                {pages.map((p) => (
                  <button
                    key={p}
                    onClick={() => setFilter(p)}
                    className={`text-[10px] px-2.5 py-1 rounded-md duration-200 ${
                      filter === p
                        ? "bg-[#615FFF33] text-white"
                        : "text-[#68768C] hover:text-white hover:bg-white/[0.04]"
                    }`}
                    style={{ fontFamily: "'Fira', monospace" }}
                  >
                    {p}
                  </button>
                ))}
              </div>
            </div>

            {filteredButtons.length === 0 ? (
              <div className="py-12 text-center">
                <span className="text-[30px]">🖱️</span>
                <p className="text-[11px] text-[#68768C] mt-3" style={{ fontFamily: "'Fira', monospace" }}>
                  // no button data yet — start clicking!
                </p>
              </div>
            ) : (
              <div className="overflow-x-auto">
                <table className="w-full">
                  <thead>
                    <tr className="border-b border-white/[0.06]">
                      <th className="text-left text-[9px] uppercase tracking-widest text-[#4B576D] pb-3 pr-4 font-medium" style={{ fontFamily: "'Fira', monospace" }}>
                        #
                      </th>
                      <th className="text-left text-[9px] uppercase tracking-widest text-[#4B576D] pb-3 pr-4 font-medium" style={{ fontFamily: "'Fira', monospace" }}>
                        button
                      </th>
                      <th className="text-left text-[9px] uppercase tracking-widest text-[#4B576D] pb-3 pr-4 font-medium" style={{ fontFamily: "'Fira', monospace" }}>
                        page
                      </th>
                      <th className="text-left text-[9px] uppercase tracking-widest text-[#4B576D] pb-3 pr-4 font-medium" style={{ fontFamily: "'Fira', monospace" }}>
                        type
                      </th>
                      <th className="text-right text-[9px] uppercase tracking-widest text-[#4B576D] pb-3 pr-4 font-medium" style={{ fontFamily: "'Fira', monospace" }}>
                        today
                      </th>
                      <th className="text-right text-[9px] uppercase tracking-widest text-[#4B576D] pb-3 pr-4 font-medium" style={{ fontFamily: "'Fira', monospace" }}>
                        week
                      </th>
                      <th className="text-right text-[9px] uppercase tracking-widest text-[#4B576D] pb-3 font-medium" style={{ fontFamily: "'Fira', monospace" }}>
                        total
                      </th>
                      <th className="text-left text-[9px] uppercase tracking-widest text-[#4B576D] pb-3 pl-4 font-medium" style={{ fontFamily: "'Fira', monospace" }}>
                        bar
                      </th>
                    </tr>
                  </thead>
                  <tbody>
                    {filteredButtons.map((btn, i) => {
                      const max = filteredButtons[0]?.total || 1;
                      const pct = Math.max(4, (btn.total / max) * 100);
                      const pageColor = getPageColor(btn.page);

                      return (
                        <tr
                          key={`${btn.buttonId}-${btn.page}`}
                          className="border-b border-white/[0.03] hover:bg-white/[0.02] transition-colors group"
                        >
                          <td className="py-3 pr-4 text-[9px] text-[#4B576D] tabular-nums font-medium" style={{ fontFamily: "'Fira', monospace" }}>
                            {String(i + 1).padStart(2, "0")}
                          </td>
                          <td className="py-3 pr-4">
                            <p className="text-[12px] text-white font-medium truncate max-w-[200px] group-hover:text-[#90A1B9] transition-colors">
                              {btn.label || btn.buttonId}
                            </p>
                          </td>
                          <td className="py-3 pr-4">
                            <span
                              className="text-[10px] px-2 py-0.5 rounded-full font-medium"
                              style={{
                                color: pageColor,
                                background: `${pageColor}18`,
                                border: `1px solid ${pageColor}33`,
                              }}
                            >
                              {btn.page || "/"}
                            </span>
                          </td>
                          <td className="py-3 pr-4">
                            <span className="text-[10px] text-[#68768C] capitalize" style={{ fontFamily: "'Fira', monospace" }}>
                              {btn.type || "button"}
                            </span>
                          </td>
                          <td className="py-3 pr-4 text-right text-[11px] text-[#90A1B9] tabular-nums font-medium">
                            {btn.today || 0}
                          </td>
                          <td className="py-3 pr-4 text-right text-[11px] text-[#90A1B9] tabular-nums font-medium">
                            {btn.week || 0}
                          </td>
                          <td className="py-3 text-right text-[12px] text-white tabular-nums font-bold">
                            {btn.total || 0}
                          </td>
                          <td className="py-3 pl-4">
                            <div className="w-24 h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700 ease-out"
                                style={{
                                  width: `${pct}%`,
                                  background: `linear-gradient(90deg, ${pageColor}, ${pageColor}cc)`,
                                }}
                              />
                            </div>
                          </td>
                        </tr>
                      );
                    })}
                  </tbody>
                </table>
              </div>
            )}
          </div>

          {/* Clicks by Page + Recent */}
          <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
            {/* By Page */}
            <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
              <p className="text-white text-[13px] font-medium mb-4" style={{ fontFamily: "'Fira', monospace" }}>
                clicks-by-page
              </p>
              {(Array.isArray(buttonData.clicksByPage) ? buttonData.clicksByPage : []).length === 0 ? (
                <p className="text-[11px] text-[#68768C]">// no data</p>
              ) : (
                <div className="flex flex-col gap-3">
                  {(Array.isArray(buttonData.clicksByPage) ? buttonData.clicksByPage : []).map((item) => {
                    const total = buttonData.totalClicks || 1;
                    const pct = ((item.total / total) * 100).toFixed(1);
                    const color = getPageColor(item.page);
                    return (
                      <div key={item.page} className="flex flex-col gap-1.5">
                        <div className="flex items-center justify-between">
                          <span className="flex items-center gap-2 text-[11px] text-[#90A1B9]">
                            <span
                              className="w-2 h-2 rounded-full shrink-0"
                              style={{ background: color }}
                            />
                            {item.page}
                          </span>
                          <div className="flex items-center gap-2">
                            <span className="text-[11px] text-white font-medium tabular-nums">
                              {item.total}
                            </span>
                            <span className="text-[9px] text-[#4B576D] tabular-nums w-10 text-right">
                              {pct}%
                            </span>
                          </div>
                        </div>
                        <div className="h-1.5 rounded-full bg-white/[0.04] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-500"
                            style={{ width: `${pct}%`, background: color }}
                          />
                        </div>
                      </div>
                    );
                  })}
                </div>
              )}
            </div>

            {/* Recent Clicks */}
            <div className="lg:col-span-2 rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
              <div className="flex items-center justify-between mb-4">
                <p className="text-white text-[13px] font-medium" style={{ fontFamily: "'Fira', monospace" }}>
                  recent-clicks
                </p>
                <span className="relative flex h-2 w-2 shrink-0">
                  <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#615FFF] opacity-75" />
                  <span className="relative inline-flex rounded-full h-2 w-2 bg-[#615FFF]" />
                </span>
              </div>
              <div className="max-h-[320px] overflow-y-auto flex flex-col gap-1">
                {(Array.isArray(buttonData.recentClicks) ? buttonData.recentClicks : []).length === 0 ? (
                  <p className="text-[11px] text-[#68768C] text-center py-8" style={{ fontFamily: "'Fira', monospace" }}>
                    // waiting for button clicks...
                  </p>
                ) : (
                  (Array.isArray(buttonData.recentClicks) ? buttonData.recentClicks : []).map((click, i) => {
                    const color = getPageColor(click.page);
                    return (
                      <div
                        key={`${click.buttonId}-${click.time}-${i}`}
                        className="flex items-center gap-3 px-3 py-2 rounded-lg hover:bg-white/[0.03] transition-colors"
                        style={{
                          animation: i === 0 ? "fadeIn 0.3s ease-out" : undefined,
                        }}
                      >
                        <span
                          className="w-1.5 h-1.5 rounded-full shrink-0"
                          style={{ background: color }}
                        />
                        <div className="flex-1 min-w-0">
                          <p className="text-[11px] text-[#90A1B9] truncate">
                            <span className="text-white font-medium">
                              {click.label || click.buttonId}
                            </span>
                            <span
                              className="ml-2 text-[8px] px-1.5 py-0.5 rounded-full"
                              style={{
                                color,
                                background: `${color}18`,
                              }}
                            >
                              {click.page}
                            </span>
                          </p>
                        </div>
                        <span className="text-[9px] text-[#4B576D] tabular-nums shrink-0" style={{ fontFamily: "'Fira', monospace" }}>
                          {formatTime(click.time)}
                        </span>
                      </div>
                    );
                  })
                )}
              </div>
            </div>
          </div>

          {/* Tracked Buttons Map */}
          <div className="rounded-xl border border-white/[0.06] bg-white/[0.02] p-5 sm:p-6">
            <p className="text-white text-[13px] font-medium mb-4" style={{ fontFamily: "'Fira', monospace" }}>
              tracked-buttons-map
            </p>
            <p className="text-[11px] text-[#68768C] mb-4">
              Every interactive element on your site that is being tracked
            </p>
            <div className="grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-3">
              {[
                { page: "/", buttons: ["_Home (nav)", "_About (nav)", "_Project (nav)", "_Contact-me (nav)"] },
                { page: "/about", buttons: ["Skill cards (click)"] },
                { page: "/project", buttons: ["view-project (link)", "Category filters (click)"] },
                { page: "/contact", buttons: ["Send Message (submit)"] },
                { page: "/admin", buttons: ["view-site", "_logout()", "+ new-project", "+ new-skill", "edit/delete buttons", "mark-seen/unseen", "archive/unarchive", "Filter tabs", "sign-in()"] },
              ].map((section) => {
                const color = getPageColor(section.page);
                return (
                  <div
                    key={section.page}
                    className="rounded-lg border border-white/[0.06] bg-white/[0.02] p-4 hover:bg-white/[0.04] transition-colors"
                  >
                    <div className="flex items-center gap-2 mb-3">
                      <span
                        className="w-2.5 h-2.5 rounded-full shrink-0"
                        style={{ background: color }}
                      />
                      <span className="text-[11px] font-semibold text-white" style={{ fontFamily: "'Fira', monospace" }}>
                        {section.page}
                      </span>
                    </div>
                    <div className="flex flex-col gap-1.5">
                      {section.buttons.map((btn) => (
                        <div
                          key={btn}
                          className="text-[10px] text-[#90A1B9] flex items-center gap-2"
                        >
                          <span className="text-[7px] text-[#4B576D]">→</span>
                          {btn}
                        </div>
                      ))}
                    </div>
                  </div>
                );
              })}
            </div>
          </div>
        </>
      )}

      <style>{`
        @keyframes fadeIn {
          from { opacity: 0; transform: translateY(-4px); }
          to { opacity: 1; transform: translateY(0); }
        }
      `}</style>
    </div>
  );
}
