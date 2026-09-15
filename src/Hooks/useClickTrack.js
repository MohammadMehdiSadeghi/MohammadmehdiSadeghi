import { useCallback, useRef } from "react";
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

// Throttle: at most one request per 500ms per unique key
const lastSent = new Map();

function throttleKey(targetType, targetId) {
  return `${targetType}::${targetId}`;
}

/**
 * useClickTrack — returns a trackClick function and a withTracking HOF.
 *
 * Usage:
 *   const { trackClick, withTracking } = useClickTrack();
 *
 *   // Manual tracking:
 *   trackClick({ targetType: "project", targetId: "sabz-learn", targetLabel: "Sabz Learn" });
 *
 *   // HOF for event handlers:
 *   <a onClick={withTracking({ targetType: "nav", targetId: "/about", targetLabel: "_About" }, originalHandler)}>
 */
export default function useClickTrack() {
  const location = useLocation();
  const abortRef = useRef(null);

  const trackClick = useCallback(
    ({ targetType, targetId, targetLabel = "", referrer = "" }) => {
      if (!targetType || !targetId) return;

      // Throttle: skip if same click was sent in last 500ms
      const key = throttleKey(targetType, targetId);
      const now = Date.now();
      const last = lastSent.get(key);
      if (last && now - last < 500) return;
      lastSent.set(key, now);

      // Abort any in-flight click request
      if (abortRef.current) {
        abortRef.current.abort();
      }
      const controller = new AbortController();
      abortRef.current = controller;

      const body = JSON.stringify({
        targetType,
        targetId: String(targetId).slice(0, 200),
        targetLabel: String(targetLabel).slice(0, 200),
        path: location.pathname,
        sessionId: getSessionId(),
        referrer: referrer || document.referrer?.slice(0, 500) || "",
      });

      // Fire and forget — don't block the UI
      fetch("/api/admin/track-click", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body,
        signal: controller.signal,
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
