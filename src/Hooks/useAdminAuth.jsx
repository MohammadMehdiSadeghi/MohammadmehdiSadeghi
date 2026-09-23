import {
  createContext,
  useCallback,
  useContext,
  useEffect,
  useState,
} from "react";

const AdminAuthContext = createContext(null);
const TOKEN_KEY = "admin_token";
const MOCK_DB_KEY = "admin_mock_db";

function getDB() {
  try {
    const raw = localStorage.getItem(MOCK_DB_KEY);
    return raw ? JSON.parse(raw) : null;
  } catch {
    return null;
  }
}

function setDB(db) {
  localStorage.setItem(MOCK_DB_KEY, JSON.stringify(db));
}

function initDB() {
  if (getDB()) return getDB();

  const today = new Date();
  const days = {};
  for (let i = 30; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    const key = d.toISOString().split("T")[0];
    const base = Math.floor(Math.random() * 25) + 3;
    days[key] = {
      total: base,
      paths: {
        "/": Math.floor(base * 0.4),
        "/about": Math.floor(base * 0.2),
        "/project": Math.floor(base * 0.25),
        "/contact": Math.floor(base * 0.15),
      },
    };
  }

  const db = {
    config: {
      username: import.meta.env.VITE_DEV_ADMIN_USER || "admin",
      password: import.meta.env.VITE_DEV_ADMIN_PASS || "admin",
    },
    visits: { days },
    messages: [
      {
        id: "demo-1",
        name: "Ali Rezaei",
        phoneNumber: "09121234567",
        message: "Hi! I love your portfolio. The projects are really impressive.",
        status: "seen",
        date: new Date(Date.now() - 86400000).toISOString(),
      },
      {
        id: "demo-2",
        name: "Sara Mohammadi",
        phoneNumber: "09351112233",
        message:
          "Would you be available for a freelance project? I need a React developer.",
        status: "unseen",
        date: new Date(Date.now() - 3600000).toISOString(),
      },
      {
        id: "demo-3",
        name: "Mohammad Hosseini",
        phoneNumber: "",
        message: "Great work on the portfolio! The UI is very clean.",
        status: "unseen",
        date: new Date().toISOString(),
      },
    ],
    online: {},
  };
  setDB(db);
  return db;
}

function trackVisit(path, sessionId) {
  const db = initDB();
  const today = new Date().toISOString().split("T")[0];
  if (!db.visits.days[today])
    db.visits.days[today] = { total: 0, paths: {} };
  db.visits.days[today].total++;
  db.visits.days[today].paths[path] =
    (db.visits.days[today].paths[path] || 0) + 1;
  db.online[sessionId] = Math.floor(Date.now() / 1000);
  setDB(db);
}

function computeStats() {
  const db = initDB();
  const days = db.visits.days || {};
  const now = Math.floor(Date.now() / 1000);

  let onlineNow = 0;
  for (const [, ts] of Object.entries(db.online)) {
    if (now - Number(ts) <= 60) onlineNow++;
  }

  const dayTotals = {};
  const pathTotals = {};
  for (const [date, info] of Object.entries(days)) {
    const total = typeof info === "object" ? info.total || 0 : Number(info);
    dayTotals[date] = total;
    if (info?.paths) {
      for (const [path, count] of Object.entries(info.paths)) {
        pathTotals[path] = (pathTotals[path] || 0) + count;
      }
    }
  }

  const today = new Date();
  const dstr = (d) => d.toISOString().split("T")[0];

  const last7 = [];
  for (let i = 6; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    last7.push({ date: dstr(d), total: dayTotals[dstr(d)] || 0 });
  }

  const last30 = [];
  for (let i = 29; i >= 0; i--) {
    const d = new Date(today);
    d.setDate(d.getDate() - i);
    last30.push({ date: dstr(d), total: dayTotals[dstr(d)] || 0 });
  }

  const monthTotals = {};
  for (const [date, total] of Object.entries(dayTotals)) {
    const month = date.slice(0, 7);
    monthTotals[month] = (monthTotals[month] || 0) + total;
  }
  const last12 = [];
  for (let i = 11; i >= 0; i--) {
    const d = new Date(today);
    d.setMonth(d.getMonth() - i);
    const key = d.toISOString().slice(0, 7);
    last12.push({ month: key, total: monthTotals[key] || 0 });
  }

  const yearTotals = {};
  for (const [date, total] of Object.entries(dayTotals)) {
    const year = date.slice(0, 4);
    yearTotals[year] = (yearTotals[year] || 0) + total;
  }
  const yearly = Object.entries(yearTotals)
    .sort(([a], [b]) => a.localeCompare(b))
    .map(([year, total]) => ({ year, total }));
  if (!yearly.length)
    yearly.push({ year: String(today.getFullYear()), total: 0 });

  const topPaths = Object.entries(pathTotals)
    .sort(([, a], [, b]) => b - a)
    .slice(0, 8)
    .map(([path, total]) => ({ path, total }));


  return {
    onlineNow,
    today: dayTotals[dstr(today)] || 0,
    yesterday:
      dayTotals[dstr(new Date(today.getTime() - 86400000))] || 0,
    last7Days: last7,
    last7Total: last7.reduce((s, d) => s + d.total, 0),
    last30Days: last30,
    last30Total: last30.reduce((s, d) => s + d.total, 0),
    thisMonth: monthTotals[dstr(today).slice(0, 7)] || 0,
    thisYear: yearTotals[String(today.getFullYear())] || 0,
    monthly: last12,
    yearly,
    totalAllTime: Object.values(dayTotals).reduce((s, v) => s + v, 0),
    topPaths,
  };
}

function mockFetch(url, options = {}) {
  const path = new URL(url, window.location.origin).pathname;
  const method = options.method || "GET";
  let body = null;
  try {
    body = options.body ? JSON.parse(options.body) : null;
  } catch {
    /* non-JSON body stays null */
  }

  if (path === "/api/admin/auth" && method === "POST") {
    const db = initDB();
    if (
      body?.username === db.config.username &&
      body?.password === db.config.password
    ) {
      const token = btoa(JSON.stringify({ u: body.username, exp: Date.now() + 7 * 86400000 }));
      return ok({ token, username: body.username });
    }
    return err(401, "invalid username or password");
  }

  if (path === "/api/admin/auth-check") {
    return ok({ ok: true });
  }

  if (path === "/api/admin/stats" && method === "GET") {
    return ok(computeStats());
  }

  if (path === "/api/admin/track" && method === "POST") {
    try {
      if (localStorage.getItem("admin_token")) return ok({ ok: true, ignored: "admin" });
    } catch {
      /* storage blocked — track as a normal visitor */
    }
    trackVisit(body?.path || "/", body?.sessionId || "unknown");
    return ok({ ok: true });
  }

  if (path === "/api/admin/track-click" && method === "POST") {
    return ok({ ok: true });
  }

  if (path === "/api/admin/messages") {
    const db = initDB();
    if (method === "GET") return ok({ messages: db.messages });
    if (method === "POST") {
      const newMsg = {
        id: `msg-${Date.now()}`,
        name: body?.name || "Anonymous",
        phoneNumber: body?.phoneNumber || "",
        message: body?.message || "",
        status: "unseen",
        date: new Date().toISOString(),
      };
      db.messages.unshift(newMsg);
      setDB(db);
      return ok({ ok: true, id: newMsg.id });
    }
    if (method === "PATCH") {
      const idx = db.messages.findIndex((m) => m.id === body?.id);
      if (idx >= 0) {
        db.messages[idx].status = body.status;
        setDB(db);
      }
      return ok({ ok: true });
    }
    if (method === "DELETE") {
      db.messages = db.messages.filter((m) => m.id !== body?.id);
      setDB(db);
      return ok({ ok: true });
    }
  }

  if (path === "/api/admin/projects-admin") {
    const u = new URL(url, window.location.origin);
    const type = u.searchParams.get("type") || "web";
    const file = type === "mini" ? "mini-projects.json" : "projects.json";
    return fetch(`/api/${file}`)
      .then((r) => r.json())
      .then((data) => ok({ projects: Array.isArray(data) ? data : data.projects || [] }))
      .catch(() => ok({ projects: [] }));
  }

  if (path === "/api/admin/skills-admin" || path === "/api/skills") {
    return fetch("/api/skills.json")
      .then((r) => r.json())
      .then((data) => ok({ skills: data }))
      .catch(() => ok({ skills: [] }));
  }

  return fetch(url, options);
}

function ok(data) {
  return Promise.resolve(new Response(JSON.stringify(data), { status: 200, headers: { "Content-Type": "application/json" } }));
}

function err(status, message) {
  return Promise.resolve(new Response(JSON.stringify({ error: message }), { status, headers: { "Content-Type": "application/json" } }));
}

export function AdminAuthProvider({ children }) {
  const [token, setToken] = useState(
    () => localStorage.getItem(TOKEN_KEY) || "",
  );
  const [valid, setValid] = useState(false);
  const [checking, setChecking] = useState(true);

  const logout = useCallback(() => {
    localStorage.removeItem(TOKEN_KEY);
    setToken("");
    setValid(false);
  }, []);

  const login = useCallback(async (username, password) => {
    let res;
    try {
      res = await fetch("/api/admin/auth", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ username, password }),
      });
    } catch {
      if (!import.meta.env.DEV) throw new Error("Network error, please try again.");
      res = await mockFetch("/api/admin/auth", {
        method: "POST",
        body: JSON.stringify({ username, password }),
      });
    }
    const data = await res.json().catch(() => ({}));
    if (!res.ok || !data.token) {
      throw new Error(data.error || "Sign in failed, please try again.");
    }
    localStorage.setItem(TOKEN_KEY, data.token);
    setToken(data.token);
    setValid(true);
    return data;
  }, []);

  useEffect(() => {
    let cancelled = false;

    async function check() {
      if (!token) {
        setValid(false);
        setChecking(false);
        return;
      }
      setChecking(true);
      try {
        let res;
        try {
          res = await fetch("/api/admin/auth-check", {
            headers: { Authorization: `Bearer ${token}` },
          });
        } catch (e) {
          if (!import.meta.env.DEV) throw e;
          res = await mockFetch("/api/admin/auth-check", {
            headers: { Authorization: `Bearer ${token}` },
          });
        }
        if (!cancelled) setValid(res.ok);
      } catch {
        if (!cancelled) setValid(false);
      } finally {
        if (!cancelled) setChecking(false);
      }
    }

    check();
    return () => {
      cancelled = true;
    };
  }, [token]);

  const authFetch = useCallback(
    async (url, options = {}) => {
      let res;
      try {
        res = await fetch(url, {
          ...options,
          headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.status === 401) {
          logout();
          throw new Error("Authentication session expired. Please sign in again.");
        }
        const text = await res.text();
        return new Response(text, { status: res.status, headers: { "Content-Type": "application/json" } });
      } catch (err) {
        if (!import.meta.env.DEV) {
          if (res?.status === 401) {
            logout();
            throw new Error("Authentication session expired. Please sign in again.");
          }
          throw new Error(err.message || "Network connection error. Please try again.");
        }
        res = await mockFetch(url, {
          ...options,
          headers: {
            ...(options.headers || {}),
            Authorization: `Bearer ${token}`,
          },
        });
        if (res.status === 401) {
          logout();
        }
        return res;
      }
    },
    [token, logout],
  );

  return (
    <AdminAuthContext.Provider
      value={{ token, valid, checking, login, logout, authFetch }}
    >
      {children}
    </AdminAuthContext.Provider>
  );
}

export function useAdminAuth() {
  const ctx = useContext(AdminAuthContext);
  if (!ctx) {
    throw new Error("useAdminAuth must be used inside AdminAuthProvider");
  }
  return ctx;
}
