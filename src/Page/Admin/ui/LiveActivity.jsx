import { useEffect, useState, useRef } from "react";

/**
 * Live Activity Feed — shows a scrolling list of recent visitor activities.
 * activities: [{ time: string, path: string, sessionId: string, type: "pageview"|"heartbeat" }]
 */
export default function LiveActivity({ activities = [], maxItems = 12 }) {
  const listRef = useRef(null);
  const [visible, setVisible] = useState([]);

  useEffect(() => {
    setVisible(activities.slice(-maxItems).reverse());
  }, [activities, maxItems]);

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

  function getPathIcon(path) {
    if (!path || typeof path !== "string") return "📄";
    if (path === "/") return "🏠";
    if (path.startsWith("/project")) return "📁";
    if (path.startsWith("/about")) return "👤";
    if (path.startsWith("/contact")) return "✉️";
    if (path.startsWith("/admin")) return "⚙️";
    return "📄";
  }

  return (
    <div
      ref={listRef}
      className="max-h-[300px] overflow-y-auto flex flex-col gap-1"
    >
      {visible.length === 0 ? (
        <p className="text-[11px] text-[#68768C] text-center py-4">
          // waiting for activity...
        </p>
      ) : (
        visible.map((a, i) => (
          <div
            key={`${a.sessionId}-${a.time}-${i}`}
            className="flex items-center gap-2.5 px-3 py-2 rounded-md hover:bg-[#7888a00d] transition-colors"
            style={{
              animation: i === 0 ? "fadeIn 0.3s ease-out" : undefined,
            }}
          >
            <span className="text-[13px] shrink-0">{getPathIcon(a.path)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-[#90A1B9] truncate">
                <span className="text-white font-medium">{a.path}</span>
              </p>
              <p className="text-[9px] text-[#4B576D] truncate">
                {a.type === "heartbeat" ? "♥ heartbeat" : "👁 pageview"} · {a.sessionId?.slice(0, 8)}...
              </p>
            </div>
            <span className="text-[9px] text-[#4B576D] tabular-nums shrink-0">
              {formatTime(a.time)}
            </span>
          </div>
        ))
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
