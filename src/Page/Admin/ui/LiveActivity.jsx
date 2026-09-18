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
    if (!path || typeof path !== "string") {
      return (
        <svg className="w-3.5 h-3.5 text-[#90A1B9]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
        </svg>
      );
    }
    if (path === "/") {
      return (
        <svg className="w-3.5 h-3.5 text-[#00D5BE]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 12l2-2m0 0l7-7 7 7M5 10v10a1 1 0 001 1h3m10-11l2 2m-2-2v10a1 1 0 01-1 1h-3m-6 0a1 1 0 001-1v-4a1 1 0 011-1h2a1 1 0 011 1v4a1 1 0 001 1m-6 0h6" />
        </svg>
      );
    }
    if (path.startsWith("/project")) {
      return (
        <svg className="w-3.5 h-3.5 text-[#615FFF]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 7v10a2 2 0 002 2h14a2 2 0 002-2V9a2 2 0 00-2-2h-6l-2-2H5a2 2 0 00-2 2z" />
        </svg>
      );
    }
    if (path.startsWith("/about")) {
      return (
        <svg className="w-3.5 h-3.5 text-[#FFB86A]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M16 7a4 4 0 11-8 0 4 4 0 018 0zM12 14a7 7 0 00-7 7h14a7 7 0 00-7-7z" />
        </svg>
      );
    }
    if (path.startsWith("/contact")) {
      return (
        <svg className="w-3.5 h-3.5 text-[#F472B6]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M3 8l7.89 5.26a2 2 0 002.22 0L21 8M5 19h14a2 2 0 002-2V7a2 2 0 00-2-2H5a2 2 0 00-2 2v10a2 2 0 002 2z" />
        </svg>
      );
    }
    if (path.startsWith("/admin")) {
      return (
        <svg className="w-3.5 h-3.5 text-[#F59E0B]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M10.325 4.317c.426-1.756 2.924-1.756 3.35 0a1.724 1.724 0 002.573 1.066c1.543-.94 3.31.826 2.37 2.37a1.724 1.724 0 001.065 2.572c1.756.426 1.756 2.924 0 3.35a1.724 1.724 0 00-1.066 2.573c.94 1.543-.826 3.31-2.37 2.37a1.724 1.724 0 00-2.572 1.065c-.426 1.756-2.924 1.756-3.35 0a1.724 1.724 0 00-2.573-1.066c-1.543.94-3.31-.826-2.37-2.37a1.724 1.724 0 00-1.065-2.572c-1.756-.426-1.756-2.924 0-3.35a1.724 1.724 0 001.066-2.573c-.94-1.543.826-3.31 2.37-2.37.996.608 2.296.07 2.572-1.065z" />
          <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M15 12a3 3 0 11-6 0 3 3 0 016 0z" />
        </svg>
      );
    }
    return (
      <svg className="w-3.5 h-3.5 text-[#90A1B9]" fill="none" viewBox="0 0 24 24" stroke="currentColor">
        <path strokeLinecap="round" strokeLinejoin="round" strokeWidth="2" d="M9 12h6m-6 4h6m2 5H7a2 2 0 01-2-2V5a2 2 0 012-2h5.586a1 1 0 01.707.293l5.414 5.414a1 1 0 01.293.707V19a2 2 0 01-2 2z" />
      </svg>
    );
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
            <span className="shrink-0">{getPathIcon(a.path)}</span>
            <div className="flex-1 min-w-0">
              <p className="text-[11px] text-[#90A1B9] truncate">
                <span className="text-white font-medium">{a.path}</span>
              </p>
              <p className="text-[9px] text-[#4B576D] truncate">
                {a.type === "heartbeat" ? "heartbeat" : "pageview"} · {a.sessionId?.slice(0, 8)}...
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
