import { useEffect, useState, useCallback } from "react";
import { useAdminAuth } from "../../../Hooks/useAdminAuth";
import { BarChart, LineChart } from "../ui/Charts";
import AnimatedCounter from "../ui/AnimatedCounter";

const RANGES = [
  { key: "24h", label: "24h", color: "#4ADE80" },
  { key: "7d", label: "week", color: "#615FFF" },
  { key: "30d", label: "month", color: "#C27AFF" },
  { key: "90d", label: "3-months", color: "#FFB86A" },
  { key: "180d", label: "6-months", color: "#FF6B6B" },
  { key: "12m", label: "year", color: "#FFD166" },
  { key: "all", label: "all-time", color: "#90A1B9" },
];



const statIcons = {
  today: (
    <svg className="w-3.5 h-3.5 text-[#FFB86A]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M9 19v-6a2 2 0 00-2-2H5a2 2 0 00-2 2v6a2 2 0 002 2h2a2 2 0 002-2zm0 0V9a2 2 0 012-2h2a2 2 0 012 2v10m-6 0a2 2 0 002 2h2a2 2 0 002-2m0 0V5a2 2 0 012-2h2a2 2 0 012 2v14a2 2 0 01-2 2h-2a2 2 0 01-2-2z" />
    </svg>
  ),
  week: (
    <svg className="w-3.5 h-3.5 text-[#C27AFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M13 7h8m0 0v8m0-8l-8 8-4-4-6 6" />
    </svg>
  ),
  month: (
    <svg className="w-3.5 h-3.5 text-[#615FFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M8 7V3m8 4V3m-9 8h10M5 21h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v12a2 2 0 002 2z" />
    </svg>
  ),
  year: (
    <svg className="w-3.5 h-3.5 text-[#4ADE80]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <circle cx="12" cy="12" r="5" />
      <circle cx="12" cy="12" r="1" />
    </svg>
  ),
  total: (
    <svg className="w-3.5 h-3.5 text-[#90A1B9]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <path strokeLinecap="round" strokeLinejoin="round" d="M21 12a9 9 0 01-9 9m9-9a9 9 0 00-9-9m9 9H3m9 9a9 9 0 01-9-9m9 9c1.657 0 3-4.03 3-9s-1.343-9-3-9m0 18c-1.657 0-3-4.03-3-9s1.343-9 3-9m-9 9a9 9 0 019-9" />
    </svg>
  ),
  country: (
    <svg className="w-3.5 h-3.5 text-[#38BDF8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
      <circle cx="12" cy="12" r="9" />
      <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8M12 3a15.3 15.3 0 014 9 15.3 15.3 0 01-4 9 15.3 15.3 0 01-4-9 15.3 15.3 0 014-9z" />
    </svg>
  ),
};

function StatCard({ label, value, accent, icon, delta, small }) {
  const isPositive = delta && delta > 0;
  const isNegative = delta && delta < 0;

  return (
    <div
      className={`rounded-lg border border-[#1E293B] bg-[#0F172B] p-4 sm:p-5 flex flex-col gap-2 relative overflow-hidden group hover:border-[#314158] transition-all duration-300 ${
        small ? "" : ""
      }`}
    >
      {/* subtle glow on hover */}
      <div
        className="absolute inset-0 opacity-0 group-hover:opacity-100 transition-opacity duration-500 pointer-events-none"
        style={{
          background: `radial-gradient(ellipse at 50% 0%, ${accent || "#615FFF"}10 0%, transparent 70%)`,
        }}
      />
      <div className="flex items-center justify-between relative z-10">
        <p className="text-[10px] text-[#68768C] uppercase tracking-wider">
          // {label}
        </p>
        {icon && <span className="shrink-0">{icon}</span>}
      </div>
      <div className="flex items-end gap-2 relative z-10">
        <p
          className="text-[22px] sm:text-[26px] font-bold tabular-nums leading-none"
          style={{ color: accent || "#fff" }}
        >
          <AnimatedCounter value={value} />
        </p>
        {delta !== undefined && delta !== null && (
          <span
            className={`text-[9px] font-semibold px-1.5 py-0.5 rounded mb-0.5 ${
              isPositive
                ? "text-[#4ADE80] bg-[#4ADE8015]"
                : isNegative
                  ? "text-[#FF6B6B] bg-[#FF6B6B15]"
                  : "text-[#68768C] bg-[#68768C15]"
            }`}
          >
            {isPositive ? "↑" : isNegative ? "↓" : "—"}{" "}
            {Math.abs(delta)}%
          </span>
        )}
      </div>
    </div>
  );
}

function formatChartDate(d) {
  if (!d) return "";
  const [, m, day] = (d || "").split("-");
  return m && day ? `${m}/${day}` : d;
}

function formatChartMonth(m) {
  if (!m) return "";
  const [, mm] = (m || "").split("-");
  const names = [
    "Jan", "Feb", "Mar", "Apr", "May", "Jun",
    "Jul", "Aug", "Sep", "Oct", "Nov", "Dec",
  ];
  return names[parseInt(mm, 10) - 1] || m;
}

function formatChartHour(h) {
  const m = /\s(\d{2}:\d{2})$/.exec(h || "");
  return m ? m[1] : h;
}

export default function StatsPage() {
  const { authFetch } = useAdminAuth();
  const [data, setData] = useState(null);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [range, setRange] = useState("7d");
  const [customFrom, setCustomFrom] = useState("");
  const [customTo, setCustomTo] = useState("");
  const [lastUpdate, setLastUpdate] = useState(null);
  const [countryTab, setCountryTab] = useState("all");

  const load = useCallback(
    async (showLoading) => {
      if (showLoading) setLoading(true);
      setError("");
      try {
        const qs =
          customFrom && customTo && customFrom <= customTo
            ? `?from=${encodeURIComponent(customFrom)}&to=${encodeURIComponent(customTo)}`
            : "";
        const res = await authFetch(`/api/admin/stats${qs}`);
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
    [authFetch, customFrom, customTo],
  );

  useEffect(() => {
    load(true);
    const interval = setInterval(() => load(false), 15000);
    return () => clearInterval(interval);
  }, [load, customFrom, customTo]);

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
    <div className="flex flex-col gap-6">
      {/* Header */}
      <div className="flex items-start justify-between flex-wrap gap-3">
        <div>
          <p className="text-[#615FFF] text-[12px]">$ cat ./analytics/summary</p>
          <h1 className="text-white text-[20px] mt-1">Site Analytics</h1>
          <p className="text-[#68768C] text-[11px] mt-1">
            Real-time visitor analytics and performance metrics
          </p>
        </div>
        <div className="flex items-center gap-3">
          {lastUpdate && (
            <span className="text-[9px] text-[#4B576D] tabular-nums">
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
        <div className="flex flex-col gap-3">
          <div className="h-10 w-48 rounded bg-[#1E293B] animate-pulse" />
          <div className="grid grid-cols-2 lg:grid-cols-4 gap-3">
            {[1, 2, 3, 4].map((i) => (
              <div
                key={i}
                className="h-24 rounded-lg bg-[#1E293B] animate-pulse"
              />
            ))}
          </div>
        </div>
      )}

      {error && (
        <p className="text-[11px] text-[#FF6B6B] bg-[#FF6B6B14] border border-[#FF6B6B33] rounded-md px-3 py-2 w-fit">
          // {error}
        </p>
      )}

      {data && (
        <>
          {/* Online Now Banner */}
          <div className="rounded-lg border border-[#4ADE8055] bg-[#4ADE800d] p-4 flex items-center gap-3">
            <span className="relative flex h-2.5 w-2.5 shrink-0">
              <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#4ADE80] opacity-75" />
              <span className="relative inline-flex rounded-full h-2.5 w-2.5 bg-[#4ADE80]" />
            </span>
            <p className="text-[12px] text-[#90A1B9]">
              <span className="text-white text-[16px] font-bold">
                <AnimatedCounter value={data.onlineNow} duration={600} />
              </span>{" "}
              {data.onlineNow === 1 ? "person" : "people"} on the site right
              now
            </p>
          </div>

          {/* Stat Cards Grid */}
          <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-5 gap-3 sm:gap-4">
            <StatCard
              label="today"
              value={data.today}
              accent="#FFB86A"
              icon={statIcons.today}
              delta={data.todayDelta}
            />
            <StatCard
              label="this week"
              value={data.last7Total}
              accent="#C27AFF"
              icon={statIcons.week}
              delta={data.weekDelta}
            />
            <StatCard
              label="this month"
              value={data.thisMonth}
              accent="#615FFF"
              icon={statIcons.month}
              delta={data.monthDelta}
            />
            <StatCard
              label="this year"
              value={data.thisYear}
              accent="#4ADE80"
              icon={statIcons.year}
              delta={data.yearDelta}
            />
            <StatCard
              label="countries"
              value={data.totalCountriesCount || (data.topCountries?.length || 0)}
              accent="#38BDF8"
              icon={statIcons.country}
            />
          </div>

          {/* Main Chart */}
          <div>
            {/* Main Chart */}
            <div className="rounded-lg border border-[#1E293B] bg-[#0F172B] p-4 sm:p-6">
              <div className="flex items-center justify-between flex-wrap gap-3 mb-4">
                <p className="text-white text-[13px] font-medium">
                  visits-over-time
                </p>
                <div className="flex gap-1 rounded-md border border-[#1E293B] p-1 flex-wrap">
                  {RANGES.map((r) => (
                    <button
                      key={r.key}
                      onClick={() => setRange(r.key)}
                      className={`text-[10px] px-2.5 py-1 rounded duration-150 ${
                        range === r.key
                          ? "bg-[#615FFF33] text-white"
                          : "text-[#68768C] hover:text-white"
                      }`}
                    >
                      {r.label}
                    </button>
                  ))}
                  <button
                    onClick={() => setRange("custom")}
                    className={`text-[10px] px-2.5 py-1 rounded duration-150 ${
                      range === "custom"
                        ? "bg-[#615FFF33] text-white"
                        : "text-[#68768C] hover:text-white"
                    }`}
                  >
                    custom
                  </button>
                </div>
              </div>

              {range === "custom" && (
                <div className="flex items-center gap-2 flex-wrap mb-3">
                  <input
                    type="date"
                    value={customFrom}
                    onChange={(e) => setCustomFrom(e.target.value)}
                    className="bg-[#020618] py-1.5 px-2 outline-[#314158] outline-1 rounded-md text-[11px] text-[#90A1B9] [color-scheme:dark]"
                  />
                  <span className="text-[11px] text-[#4B576D]">→</span>
                  <input
                    type="date"
                    value={customTo}
                    onChange={(e) => setCustomTo(e.target.value)}
                    className="bg-[#020618] py-1.5 px-2 outline-[#314158] outline-1 rounded-md text-[11px] text-[#90A1B9] [color-scheme:dark]"
                  />
                  {data?.custom && (
                    <span className="text-[10px] text-[#4B576D] tabular-nums">
                      total: {data.custom.total}
                    </span>
                  )}
                </div>
              )}

              {range === "24h" && (
                <LineChart
                  data={(data.hourly24 || []).map((d) => ({
                    label: d.hour,
                    value: d.total,
                  }))}
                  formatLabel={formatChartHour}
                  color="#4ADE80"
                />
              )}
              {range === "7d" && (
                <LineChart
                  data={(data.last7Days || []).map((d) => ({
                    label: d.date,
                    value: d.total,
                  }))}
                  formatLabel={formatChartDate}
                  color="#615FFF"
                  showValues
                />
              )}
              {range === "30d" && (
                <LineChart
                  data={(data.last30Days || []).map((d) => ({
                    label: d.date,
                    value: d.total,
                  }))}
                  formatLabel={formatChartDate}
                  color="#C27AFF"
                />
              )}
              {range === "90d" && (
                <LineChart
                  data={(data.last90Days || []).map((d) => ({
                    label: d.date,
                    value: d.total,
                  }))}
                  formatLabel={formatChartDate}
                  color="#FFB86A"
                />
              )}
              {range === "180d" && (
                <LineChart
                  data={(data.last180Days || []).map((d) => ({
                    label: d.date,
                    value: d.total,
                  }))}
                  formatLabel={formatChartDate}
                  color="#FF6B6B"
                />
              )}
              {range === "12m" && (
                <BarChart
                  data={(data.monthly || []).map((d) => ({
                    label: d.month,
                    value: d.total,
                  }))}
                  formatLabel={formatChartMonth}
                  color="#FFB86A"
                />
              )}
              {range === "all" && (
                <BarChart
                  data={(data.yearly || []).map((d) => ({
                    label: d.year,
                    value: d.total,
                  }))}
                  formatLabel={(y) => y}
                  color="#90A1B9"
                />
              )}
              {range === "custom" && (
                data.custom && data.custom.days && data.custom.days.length ? (
                  <LineChart
                    data={data.custom.days.map((d) => ({
                      label: d.date,
                      value: d.total,
                    }))}
                    formatLabel={formatChartDate}
                    color="#615FFF"
                    showValues={data.custom.days.length <= 14}
                  />
                ) : (
                  <p className="text-[11px] text-[#68768C] py-8 text-center">
                    // pick a from/to date range
                  </p>
                )
              )}
            </div>
          </div>

          {/* Grid of Top Pages and Geographic Distribution */}
          <div className="grid grid-cols-1 lg:grid-cols-2 gap-4">
            {/* Top Pages */}
            <div className="rounded-lg border border-[#1E293B] bg-[#0F172B] p-4 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between mb-4">
                  <p className="text-white text-[13px] font-medium">top-pages</p>
                  <span className="text-[10px] text-[#4B576D]">
                    {data.topPaths?.length || 0} pages
                  </span>
                </div>
                {!data.topPaths || data.topPaths.length === 0 ? (
                  <p className="text-[11px] text-[#68768C] py-4">
                    // no visits recorded yet
                  </p>
                ) : (
                  <div className="flex flex-col gap-2.5">
                    {data.topPaths.map((p, i) => {
                      const max = data.topPaths[0].total || 1;
                      const pct = Math.max(4, (p.total / max) * 100);
                      return (
                        <div
                          key={p.path}
                          className="flex items-center gap-3 group"
                        >
                          <span className="text-[9px] text-[#4B576D] w-5 text-right tabular-nums shrink-0">
                            {String(i + 1).padStart(2, "0")}
                          </span>
                          <span className="text-[11px] text-[#90A1B9] w-28 sm:w-36 truncate shrink-0 group-hover:text-white transition-colors">
                            {p.path}
                          </span>
                          <div className="flex-1 h-2.5 rounded-full bg-[#020618] overflow-hidden">
                            <div
                              className="h-full rounded-full transition-all duration-700 ease-out"
                              style={{
                                width: `${pct}%`,
                                background: `linear-gradient(90deg, #615FFF, #615FFF${Math.round(128 + pct * 1.27).toString(16)})`,
                              }}
                            />
                          </div>
                          <span className="text-[11px] text-white w-10 text-right shrink-0 tabular-nums font-medium">
                            {p.total}
                          </span>
                        </div>
                      );
                    })}
                  </div>
                )}
              </div>
            </div>

            {/* Visitors by Country */}
            <div className="rounded-lg border border-[#1E293B] bg-[#0F172B] p-4 sm:p-6 flex flex-col justify-between">
              <div>
                <div className="flex items-center justify-between flex-wrap gap-2 mb-4">
                  <div className="flex items-center gap-2">
                    <svg className="w-4 h-4 text-[#38BDF8]" fill="none" viewBox="0 0 24 24" stroke="currentColor" strokeWidth="2">
                      <circle cx="12" cy="12" r="9" />
                      <path strokeLinecap="round" strokeLinejoin="round" d="M3.6 9h16.8M3.6 15h16.8M12 3a15.3 15.3 0 014 9 15.3 15.3 0 01-4 9 15.3 15.3 0 01-4-9 15.3 15.3 0 014-9z" />
                    </svg>
                    <p className="text-white text-[13px] font-medium">visitors-by-country</p>
                  </div>
                  <div className="flex gap-1 rounded-md border border-[#1E293B] p-0.5">
                    {[
                      { key: "all", label: "all-time" },
                      { key: "today", label: "today" },
                      { key: "online", label: "live" },
                    ].map((t) => (
                      <button
                        key={t.key}
                        onClick={() => setCountryTab(t.key)}
                        className={`text-[10px] px-2 py-0.5 rounded duration-150 ${
                          countryTab === t.key
                            ? "bg-[#38BDF822] text-[#38BDF8]"
                            : "text-[#68768C] hover:text-white"
                        }`}
                      >
                        {t.label}
                      </button>
                    ))}
                  </div>
                </div>

                {/* Country List */}
                {(() => {
                  const list =
                    countryTab === "today"
                      ? data.todayCountries || []
                      : countryTab === "online"
                        ? data.onlineCountries || []
                        : data.topCountries || [];

                  if (!list || list.length === 0) {
                    return (
                      <p className="text-[11px] text-[#68768C] py-6 text-center">
                        // no country data recorded for this view yet
                      </p>
                    );
                  }

                  const max = list[0]?.total || 1;

                  return (
                    <div className="flex flex-col gap-2.5">
                      {list.slice(0, 8).map((c, i) => {
                        const pct = Math.max(4, (c.total / max) * 100);
                        return (
                          <div
                            key={c.code}
                            className="flex items-center gap-3 group"
                          >
                            <span className="text-[9px] text-[#4B576D] w-5 text-right tabular-nums shrink-0">
                              {String(i + 1).padStart(2, "0")}
                            </span>
                            <span className="text-[10px] font-mono text-[#38BDF8] bg-[#38BDF815] border border-[#38BDF833] px-1.5 py-0.5 rounded shrink-0">
                              {c.code}
                            </span>
                            <div className="flex items-center gap-1.5 w-28 sm:w-36 truncate shrink-0">
                              <span className="text-[11px] text-[#90A1B9] truncate group-hover:text-white transition-colors">
                                {c.name}
                              </span>
                            </div>
                            <div className="flex-1 h-2.5 rounded-full bg-[#020618] overflow-hidden">
                              <div
                                className="h-full rounded-full transition-all duration-700 ease-out"
                                style={{
                                  width: `${pct}%`,
                                  background: `linear-gradient(90deg, #38BDF8, #818CF8)`,
                                }}
                              />
                            </div>
                            <div className="flex items-center justify-end gap-1.5 shrink-0 text-right">
                              <span className="text-[11px] text-white tabular-nums font-medium">
                                {c.total}
                              </span>
                              <span className="text-[9px] text-[#4B576D] tabular-nums">
                                ({c.percentage}%)
                              </span>
                            </div>
                          </div>
                        );
                      })}
                    </div>
                  );
                })()}
              </div>
            </div>
          </div>
        </>
      )}
    </div>
  );
}
