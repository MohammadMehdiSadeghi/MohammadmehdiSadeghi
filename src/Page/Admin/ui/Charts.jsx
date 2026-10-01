import { useId } from "react";

// data: [{ label: string, value: number }]
export function LineChart({
  data,
  color = "#615FFF",
  height = 180,
  formatLabel,
  showValues = false,
}) {
  const gradientId = useId();
  const width = 600;
  const padding = 24;
  const max = Math.max(1, ...data.map((d) => d.value));

  const points = data.map((d, i) => {
    const x =
      data.length > 1
        ? padding + (i / (data.length - 1)) * (width - padding * 2)
        : width / 2;
    const y = height - padding - (d.value / max) * (height - padding * 2);
    return { x, y, ...d };
  });

  const linePath = points
    .map((p, i) => `${i === 0 ? "M" : "L"} ${p.x.toFixed(2)} ${p.y.toFixed(2)}`)
    .join(" ");

  const areaPath =
    points.length > 0
      ? `${linePath} L ${points[points.length - 1].x.toFixed(2)} ${height - padding} L ${points[0].x.toFixed(2)} ${height - padding} Z`
      : "";

  const step = Math.max(1, Math.ceil(data.length / 7));

  return (
    <div className="w-full">
      <svg
        viewBox={`0 0 ${width} ${height}`}
        className="w-full h-auto"
        preserveAspectRatio="none"
      >
        <defs>
          <linearGradient id={gradientId} x1="0" y1="0" x2="0" y2="1">
            <stop offset="0%" stopColor={color} stopOpacity="0.35" />
            <stop offset="100%" stopColor={color} stopOpacity="0" />
          </linearGradient>
        </defs>

        {[0.25, 0.5, 0.75, 1].map((f) => (
          <line
            key={f}
            x1={padding}
            x2={width - padding}
            y1={padding + f * (height - padding * 2)}
            y2={padding + f * (height - padding * 2)}
            stroke="#1E293B"
            strokeWidth="1"
          />
        ))}

        {areaPath && <path d={areaPath} fill={`url(#${gradientId})`} />}
        {linePath && (
          <path d={linePath} fill="none" stroke={color} strokeWidth="2" />
        )}

        {points.map((p, i) => (
          <circle key={i} cx={p.x} cy={p.y} r="2.5" fill={color} />
        ))}

        {showValues &&
          points.map((p, i) => (
            <text
              key={`v-${i}`}
              x={p.x}
              y={Math.max(10, p.y - 8)}
              textAnchor="middle"
              fontSize="9"
              fill="#90A1B9"
            >
              {p.value}
            </text>
          ))}
      </svg>
      <div className="flex justify-between mt-1 text-[9px] text-[#68768C]">
        {points
          .filter((_, i) => i % step === 0 || i === points.length - 1)
          .map((p, i) => (
            <span key={i}>{formatLabel ? formatLabel(p.label) : p.label}</span>
          ))}
      </div>
    </div>
  );
}

// data: [{ label: string, value: number }]
export function BarChart({
  data,
  color = "#FFB86A",
  height = 180,
  formatLabel,
}) {
  const max = Math.max(1, ...data.map((d) => d.value));

  return (
    <div className="w-full">
      <div
        className="w-full flex items-end gap-1.5"
        style={{ height: `${height}px` }}
      >
        {data.map((d, i) => (
          <div
            key={i}
            className="flex-1 min-w-[3px] group relative flex flex-col items-center justify-end h-full"
          >
            <span className="mb-1 text-[9px] text-[#90A1B9] opacity-0 group-hover:opacity-100 duration-150 whitespace-nowrap">
              {d.value}
            </span>
            <div
              className="w-full rounded-sm duration-150 group-hover:opacity-80"
              style={{
                height: `${Math.max(2, (d.value / max) * (height - 20))}px`,
                background: color,
              }}
            />
          </div>
        ))}
      </div>
      <div className="flex justify-between mt-1 text-[9px] text-[#68768C]">
        {data
          .filter(
            (_, i) =>
              i % Math.max(1, Math.ceil(data.length / 7)) === 0 ||
              i === data.length - 1,
          )
          .map((d, i) => (
            <span key={i}>{formatLabel ? formatLabel(d.label) : d.label}</span>
          ))}
      </div>
    </div>
  );
}
