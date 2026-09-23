import { useEffect, useRef } from "react";
import { useLocation } from "react-router-dom";

const SESSION_KEY = "visitor_session_id";
const HEARTBEAT_MS = 25000;

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

function isAdmin() {
  try {
    return Boolean(localStorage.getItem("admin_token"));
  } catch {
    return false;
  }
}

export default function VisitTracker() {
  const location = useLocation();
  const lastCountedRef = useRef(null);

  useEffect(() => {
    if (isAdmin()) return;

    const path = location.pathname;
    if (lastCountedRef.current === path) return;
    lastCountedRef.current = path;

    fetch("/api/admin/track", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        path,
        sessionId: getSessionId(),
      }),
      keepalive: true,
    }).catch(() => {});
  }, [location.pathname]);

  useEffect(() => {
    if (isAdmin()) return;

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
