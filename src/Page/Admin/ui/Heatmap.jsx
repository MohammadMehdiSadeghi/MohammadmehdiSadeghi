export default function Heatmap({ data, maxVal }) {
  const days = ["Mon", "Tue", "Wed", "Thu", "Fri", "Sat", "Sun"];
  const hours = Array.from({ length: 24 }, (_, i) => i);

  let grid = [];
  if (Array.isArray(data)) {
    grid = data;
  } else if (data && typeof data === "object") {
    grid = Object.entries(data).map(([date, hoursObj]) => ({
      date,
      hours: hoursObj,
    }));
  }

  const max = maxVal || Math.max(1, ...grid.flatMap((d) => Object.values(d.hours || {}).map(Number)));

  function getColor(value) {
    if (value === 0) return "#0B0F1A";
    const intensity = value / max;
    if (intensity < 0.25) return "#1e3a5f";
    if (intensity < 0.5) return "#1e5a8f";
    if (intensity < 0.75) return "#3b82f6";
    return "#60a5fa";
  }

  if (grid.length === 0) {
    return (
      <p className="text-[11px] text-[#68768C] text-center py-4">
        // no heatmap data available
      </p>
    );
  }

  return (
    <div className="w-full overflow-x-auto">
      <div className="min-w-[600px]">
        <div className="flex mb-1.5">
          <div className="w-10 shrink-0" />
          {hours.map((h) => (
            <div
              key={h}
              className="flex-1 text-center text-[7px] text-[#4B576D] tabular-nums"
            >
              {h % 3 === 0 ? `${h}` : ""}
            </div>
          ))}
        </div>
        {grid.map((day, di) => (
          <div key={di} className="flex items-center gap-0.5 mb-0.5">
            <span className="w-10 text-[9px] text-[#68768C] shrink-0 pr-1 text-right">
              {days[di % 7]}
            </span>
            {hours.map((h) => {
              const val = Number(day.hours?.[h]) || 0;
              return (
                <div
                  key={h}
                  className="flex-1 aspect-square rounded-[2px] cursor-default group relative"
                  style={{ background: getColor(val) }}
                  title={`${days[di % 7]} ${h}:00 — ${val} visits`}
                >
                  {val > 0 && (
                    <div className="absolute -top-8 left-1/2 -translate-x-1/2 hidden group-hover:block z-50">
                      <div className="bg-[#0E1528] border border-[#314158] rounded px-2 py-1 text-[9px] text-white whitespace-nowrap">
                        {val} visits
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
          </div>
        ))}
        <div className="flex items-center gap-2 mt-3 justify-end">
          <span className="text-[8px] text-[#4B576D]">less</span>
          {[0, 0.25, 0.5, 0.75, 1].map((pct, i) => (
            <div
              key={i}
              className="w-3 h-3 rounded-[2px]"
              style={{ background: getColor(max * pct) }}
            />
          ))}
          <span className="text-[8px] text-[#4B576D]">more</span>
        </div>
      </div>
    </div>
  );
}
