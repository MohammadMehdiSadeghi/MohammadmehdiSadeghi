/**
 * SVG Donut chart — renders colored segments with labels.
 * data: [{ label: string, value: number, color: string }]
 */
export default function DonutChart({ data, size = 180, thickness = 24 }) {
  const total = data.reduce((s, d) => s + d.value, 0) || 1;
  const radius = (size - thickness) / 2;
  const circumference = 2 * Math.PI * radius;
  const center = size / 2;

  return (
    <div className="flex items-center gap-6 flex-wrap">
      <svg width={size} height={size} viewBox={`0 0 ${size} ${size}`}>
        {/* background ring */}
        <circle
          cx={center}
          cy={center}
          r={radius}
          fill="none"
          stroke="#1E293B"
          strokeWidth={thickness}
        />
        {data.map((d, i) => {
          const pct = d.value / total;
          const dashLength = pct * circumference;
          const dashOffset =
            -data.slice(0, i).reduce((s, x) => s + x.value / total, 0) *
            circumference;
          return (
            <circle
              key={i}
              cx={center}
              cy={center}
              r={radius}
              fill="none"
              stroke={d.color}
              strokeWidth={thickness}
              strokeDasharray={`${dashLength} ${circumference - dashLength}`}
              strokeDashoffset={dashOffset}
              strokeLinecap="butt"
              className="transition-all duration-700 ease-out"
              style={{ transform: "rotate(-90deg)", transformOrigin: "center" }}
            />
          );
        })}
        {/* center text */}
        <text
          x={center}
          y={center - 6}
          textAnchor="middle"
          className="fill-white text-[16px] font-bold"
          style={{ fontFamily: "inherit" }}
        >
          {total.toLocaleString()}
        </text>
        <text
          x={center}
          y={center + 12}
          textAnchor="middle"
          className="fill-[#68768C] text-[9px]"
          style={{ fontFamily: "inherit" }}
        >
          total
        </text>
      </svg>
      {/* Legend */}
      <div className="flex flex-col gap-2">
        {data.map((d, i) => (
          <div key={i} className="flex items-center gap-2.5">
            <span
              className="w-2.5 h-2.5 rounded-sm shrink-0"
              style={{ background: d.color }}
            />
            <span className="text-[11px] text-[#90A1B9]">{d.label}</span>
            <span className="text-[11px] text-white font-medium ml-auto tabular-nums">
              {d.value}
            </span>
            <span className="text-[9px] text-[#68768C] w-10 text-right tabular-nums">
              {((d.value / total) * 100).toFixed(0)}%
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
