import {
  readStore,
  writeStore,
  withLock,
  rateCheck,
  dstr,
  getBearer,
  verifyToken,
} from "../_lib.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method not allowed" });
  }
  const token = getBearer(req) || req.body?.adminToken || "";
  if (token && verifyToken(token)) return res.json({ ok: true, ignored: "admin" });
  const allowed = await rateCheck(req, "track", true);
  if (!allowed) return res.json({ ok: true }); // silent drop
  const body = req.body || {};
  let p = String(body.path || "/").trim().slice(0, 200);
  if (!p) p = "/";
  const sessionId = String(body.sessionId || "").trim().slice(0, 100);
  const heartbeat = !!body.heartbeat;

  if (sessionId) {
    await withLock("online", async () => {
      const online = await readStore("online.json", {});
      const now = Math.floor(Date.now() / 1000);
      online[sessionId] = now;
      for (const [sid, seen] of Object.entries(online)) {
        if (now - seen > 60) delete online[sid];
      }
      await writeStore("online.json", online);
    });
  }
  if (heartbeat) return res.json({ ok: true });

  const today = dstr(new Date());
  await withLock("visits", async () => {
    const visits = await readStore("visits.json", { days: {} });
    if (!visits.days || typeof visits.days !== "object") visits.days = {};
    if (!visits.days[today]) visits.days[today] = { total: 0, paths: {}, visitors: [] };
    const day = visits.days[today];
    if (!Array.isArray(day.visitors)) day.visitors = [];
    day.total += 1;
    day.paths[p] = (day.paths[p] || 0) + 1;
    /* unique people: one session opening 4 pages = 4 views, 1 visitor */
    if (sessionId && !day.visitors.includes(sessionId)) {
      day.visitors.push(sessionId);
      if (day.visitors.length > 5000) day.visitors = day.visitors.slice(-5000);
    }
    await writeStore("visits.json", visits);
  });
  res.json({ ok: true });
}
