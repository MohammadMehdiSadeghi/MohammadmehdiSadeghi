import { useCallback } from "react";
import { useLocation } from "react-router-dom";

const SESSION_KEY = "visitor_session_id";

function getSessionId() {
  try {
    let id = sessionStorage.getItem(SESSION_KEY);
    if (!id) {
      id =
        typeof crypto !== "undefined" && crypto.randomUUID
          ? crypto.randomUUID()
          : `${Date.now()}-${Math.random().toString(36).slice(2)}`;
      sessionStorage.setItem(SESSION_KEY, id);
    }
    return id;
  } catch {
    return `${Date.now()}-${Math.random().toString(36).slice(2)}`;
  }
}

const lastSent = new Map();

function throttleKey(targetType, targetId) {
  return `${targetType}::${targetId}`;
}

export default function useClickTrack() {
  const location = useLocation();

  const trackClick = useCallback(
    ({ targetType, targetId, targetLabel = "", referrer = "" }) => {
      if (!targetType || !targetId) return;

      try {
        if (localStorage.getItem("admin_token")) return;
      } catch {
        /* storage blocked — still track clicks */
      }

      const key = throttleKey(targetType, targetId);
      const now = Date.now();
      const last = lastSent.get(key);
      if (last && now - last < 500) return;
      lastSent.set(key, now);

      const body = JSON.stringify({
        targetType,
        targetId: String(targetId).slice(0, 200),
        targetLabel: String(targetLabel).slice(0, 200),
        path: location.pathname,
        sessionId: getSessionId(),
        referrer: referrer || document.referrer?.slice(0, 500) || "",
      });

      fetch("/api/admin/track-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        keepalive: true,
      }).catch(() => {});
    },
    [location.pathname],
  );

  const withTracking = useCallback(
    (clickData, handler) => {
      return (e) => {
        trackClick(clickData);
        if (handler) handler(e);
      };
    },
    [trackClick],
  );

  return { trackClick, withTracking };
}
