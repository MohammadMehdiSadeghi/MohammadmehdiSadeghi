import { useEffect } from "react";
import { useLocation } from "react-router-dom";

const SESSION_KEY = "visitor_session_id";
const HEARTBEAT_MS = 25000; // matches ONLINE_WINDOW_SECONDS on the backend with room to spare

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

export default function VisitTracker() {
  const location = useLocation();

  // record a page view (and mark the visitor online) whenever the route changes
  useEffect(() => {
    const controller = new AbortController();
    fetch("/api/admin/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path: location.pathname,
        sessionId: getSessionId(),
      }),
      signal: controller.signal,
    }).catch(() => {});
    return () => controller.abort();
  }, [location.pathname]);

  // keep sending lightweight heartbeats so "online now" stays accurate
  // while the visitor stays on the same page
  useEffect(() => {
    const interval = setInterval(() => {
      fetch("/api/admin/track", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({
          path: location.pathname,
          sessionId: getSessionId(),
          heartbeat: true,
        }),
      }).catch(() => {});
    }, HEARTBEAT_MS);
    return () => clearInterval(interval);
  }, [location.pathname]);

  return null;
}
