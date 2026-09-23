import { useEffect, useRef } from "react";
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

/* localStorage can throw in some privacy modes — treat that as "not an admin"
   so the visitor is still tracked rather than silently dropped. */
function isAdmin() {
  try {
    return Boolean(localStorage.getItem("admin_token"));
  } catch {
    return false;
  }
}

export default function VisitTracker() {
  const location = useLocation();
  // Remembers the last path we already recorded a view for, so one page open
  // can never be counted twice. See the note in the effect below.
  const lastCountedRef = useRef(null);

  // record a page view (and mark the visitor online) whenever the route changes
  useEffect(() => {
    // Admin traffic is excluded so the owner never inflates their own numbers
    if (isAdmin()) return;

    /* React StrictMode (dev) runs every effect twice — setup → cleanup → setup —
       which used to fire TWO track requests for the SAME page open. Opening 4
       pages therefore recorded 8 views. The ref survives that teardown (it is
       the same component instance), so the second setup becomes a no-op and the
       view is counted exactly once.

       A real reload remounts the whole app with a fresh ref, and moving to a
       different route changes the pathname — both still count as new views. */
    const path = location.pathname;
    if (lastCountedRef.current === path) return;
    lastCountedRef.current = path;

    /* keepalive lets the beacon finish even if the visitor navigates away or
       closes the tab immediately — and unlike an AbortController it can never
       cancel a request that has already been handed to the server. */
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

  // keep sending lightweight heartbeats so "online now" stays accurate
  // while the visitor stays on the same page
  useEffect(() => {
    // Admin traffic is excluded from online presence too
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
