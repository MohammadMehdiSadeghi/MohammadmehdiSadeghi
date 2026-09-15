import { useState } from "react";
import { LineChart } from "./Charts";

const TYPE_COLORS = {
  project: "#615FFF",
  nav: "#FFB86A",
  skill: "#4ADE80",
  link: "#C27AFF",
  button: "#FF6B6B",
};

const TYPE_ICONS = {
  project: "📁",
  nav: "🧭",
  skill: "⚡",
  link: "🔗",
  button: "🔘",
};

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

function shortDate(d) {
  const [, m, day] = d.split("-");
  return `${m}/${day}`;
}

function getTypeColor(type) {
  return TYPE_COLORS[type] || "#68768C";
}

function getTypeIcon(type) {
  return TYPE_ICONS[type] || "📊";
}

/**
 * ClickAnalytics — Professional click analytics dashboard widget.
 *
 * Props:
 * - topClickItems: [{ targetType, targetId, targetLabel, total, today, week }]
 * - clicksByType: [{ type, total }]
 * - clickTrend: [{ date, total }]
 * - recentClicks: [{ time, targetType, targetId, targetLabel, path, sessionId }]
 * - totalClicks: number
 * - todayClicks: number
 * - weekClicks: number
 */
export default function ClickAnalytics({
  topClickItems = [],
  clicksByType = [],
  clickTrend = [],
  recentClicks = [],
  totalClicks = 0,
}) {
  const [tab, setTab] = useState("all");
  const maxClicks = topClickItems.length > 0 ? topClickItems[0].total || 1 : 1;

  const filtered =
    tab === "all"
      ? topClickItems
      : topClickItems.filter((item) => item.targetType === tab);

  const typeTabs = ["all", ...clicksByType.map((t) => t.type)];

  return (
    <div className="flex flex-col gap-6">
      {/* Click Trend Chart */}
      {clickTrend.length > 0 && (
        <div className="rounded-lg border border-[#1E293B] bg-[#0F172B] p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4">
            <p className="text-white text-[13px] font-medium">
              click-trend
            </p>
            <span className="text-[10px] text-[#4B576D]">
              last 7 days
            </span>
          </div>
          <LineChart
            data={clickTrend.map((d) => ({
              label: d.date,
              value: d.total,
            }))}
            formatLabel={shortDate}
            color="#615FFF"
            showValues
          />
        </div>
      )}

      <div className="grid grid-cols-1 lg:grid-cols-3 gap-4">
        {/* Top Clicked Items — Horizontal Bar Chart */}
        <div className="lg:col-span-2 rounded-lg border border-[#1E293B] bg-[#0F172B] p-4 sm:p-6">
          <div className="flex items-center justify-between mb-4 flex-wrap gap-3">
            <p className="text-white text-[13px] font-medium">
              top-clicked-items
            </p>
            <div className="flex gap-1 rounded-md border border-[#1E293B] p-1">
              {typeTabs.map((t) => (
                <button
                  key={t}
                  onClick={() => setTab(t)}
                  className={`text-[10px] px-2 py-1 rounded duration-150 capitalize flex items-center gap-1 ${
                    tab === t
                      ? "bg-[#615FFF33] text-white"
                      : "text-[#68768C] hover:text-white"
                  }`}
                >
                  {t !== "all" && (
                    <span className="text-[9px]">{getTypeIcon(t)}</span>
                  )}
                  {t}
                </button>
              ))}
            </div>
          </div>

          {filtered.length === 0 ? (
            <div className="py-8 text-center">
              <span className="text-[22px]">📊</span>
              <p className="text-[10px] text-[#68768C] mt-2">
                // no click data yet — start clicking things!
              </p>
            </div>
          ) : (
            <div className="flex flex-col gap-2.5">
              {filtered.map((item, i) => {
                const pct = Math.max(4, (item.total / maxClicks) * 100);
                const color = getTypeColor(item.targetType);
                return (
                  <div
                    key={`${item.targetType}-${item.targetId}`}
                    className="flex items-center gap-3 group"
                  >
                    <span className="text-[9px] text-[#4B576D] w-5 text-right tabular-nums shrink-0">
                      {String(i + 1).padStart(2, "0")}
                    </span>
                    <span className="text-[13px] shrink-0">
                      {getTypeIcon(item.targetType)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <div className="flex items-center gap-2 mb-1">
                        <span className="text-[11px] text-white truncate font-medium group-hover:text-[#90A1B9] transition-colors">
                          {item.targetLabel || item.targetId}
                        </span>
                        <span
                          className="text-[8px] px-1.5 py-0.5 rounded-full border shrink-0 capitalize"
                          style={{
                            color,
                            borderColor: `${color}55`,
                            background: `${color}15`,
                          }}
                        >
                          {item.targetType}
                        </span>
                      </div>
                      <div className="flex items-center gap-2">
                        <div className="flex-1 h-2 rounded-full bg-[#020618] overflow-hidden">
                          <div
                            className="h-full rounded-full transition-all duration-700 ease-out"
                            style={{
                              width: `${pct}%`,
                              background: `linear-gradient(90deg, ${color}, ${color}cc)`,
                            }}
                          />
                        </div>
                        <div className="flex items-center gap-3 shrink-0">
                          <span className="text-[9px] text-[#4B576D] tabular-nums">
                            today: {item.today}
                          </span>
                          <span className="text-[9px] text-[#4B576D] tabular-nums">
                            week: {item.week}
                          </span>
                          <span className="text-[11px] text-white w-10 text-right tabular-nums font-bold">
                            {item.total}
                          </span>
                        </div>
                      </div>
                    </div>
                  </div>
                );
              })}
            </div>
          )}
        </div>

        {/* Type Breakdown + Recent Clicks */}
        <div className="flex flex-col gap-4">
          {/* By Type */}
          <div className="rounded-lg border border-[#1E293B] bg-[#0F172B] p-4 sm:p-6">
            <p className="text-white text-[13px] font-medium mb-4">
              clicks-by-type
            </p>
            {clicksByType.length === 0 ? (
              <p className="text-[11px] text-[#68768C]">
                // no data yet
              </p>
            ) : (
              <div className="flex flex-col gap-3">
                {clicksByType.map((item) => {
                  const pct = totalClicks > 0
                    ? ((item.total / totalClicks) * 100).toFixed(1)
                    : "0";
                  const color = getTypeColor(item.type);
                  return (
                    <div key={item.type} className="flex flex-col gap-1.5">
                      <div className="flex items-center justify-between">
                        <span className="flex items-center gap-2 text-[11px] text-[#90A1B9]">
                          <span className="text-[11px]">
                            {getTypeIcon(item.type)}
                          </span>
                          {item.type}
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
                      <div className="h-1.5 rounded-full bg-[#020618] overflow-hidden">
                        <div
                          className="h-full rounded-full transition-all duration-500"
                          style={{
                            width: `${pct}%`,
                            background: color,
                          }}
                        />
                      </div>
                    </div>
                  );
                })}
              </div>
            )}
          </div>

          {/* Recent Clicks Feed */}
          <div className="rounded-lg border border-[#1E293B] bg-[#0F172B] p-4 sm:p-6 flex-1">
            <div className="flex items-center justify-between mb-3">
              <p className="text-white text-[13px] font-medium">
                recent-clicks
              </p>
              <span className="relative flex h-2 w-2 shrink-0">
                <span className="animate-ping absolute inline-flex h-full w-full rounded-full bg-[#615FFF] opacity-75" />
                <span className="relative inline-flex rounded-full h-2 w-2 bg-[#615FFF]" />
              </span>
            </div>
            <div className="max-h-[260px] overflow-y-auto flex flex-col gap-1">
              {recentClicks.length === 0 ? (
                <p className="text-[11px] text-[#68768C] text-center py-4">
                  // waiting for clicks...
                </p>
              ) : (
                recentClicks.map((click, i) => (
                  <div
                    key={`${click.sessionId}-${click.time}-${i}`}
                    className="flex items-center gap-2.5 px-2 py-1.5 rounded-md hover:bg-[#7888a00d] transition-colors"
                    style={{
                      animation:
                        i === 0 ? "fadeIn 0.3s ease-out" : undefined,
                    }}
                  >
                    <span className="text-[11px] shrink-0">
                      {getTypeIcon(click.targetType)}
                    </span>
                    <div className="flex-1 min-w-0">
                      <p className="text-[10px] text-[#90A1B9] truncate">
                        <span className="text-white font-medium">
                          {click.targetLabel || click.targetId}
                        </span>
                        <span
                          className="ml-1.5 text-[8px] px-1 py-0.5 rounded capitalize"
                          style={{
                            color: getTypeColor(click.targetType),
                            background: `${getTypeColor(click.targetType)}15`,
                          }}
                        >
                          {click.targetType}
                        </span>
                      </p>
                      <p className="text-[9px] text-[#4B576D] truncate">
                        {click.path} · {click.sessionId?.slice(0, 6)}...
                      </p>
                    </div>
                    <span className="text-[9px] text-[#4B576D] tabular-nums shrink-0">
                      {formatTime(click.time)}
                    </span>
                  </div>
                ))
              )}
            </div>
          </div>
        </div>
      </div>
    </div>
  );
}
