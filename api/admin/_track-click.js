import {
  readStore,
  writeStore,
  withLock,
  rateCheck,
  dstr,
  daysAgo,
  getBearer,
  verifyToken,
} from "../_lib.js";
import { pgInsertClick, dbConfigured } from "../_pg.js";

export default async function handler(req, res) {
  if (req.method !== "POST") {
    return res.status(405).json({ error: "method not allowed" });
  }
  const token = getBearer(req) || req.body?.adminToken || "";
  if (token && verifyToken(token)) return res.json({ ok: true, ignored: "admin" });
  const allowed = await rateCheck(req, "click", true);
  if (!allowed) return res.json({ ok: true });
  const body = req.body || {};
  const targetType = String(body.targetType || "").trim().slice(0, 50);
  const targetId = String(body.targetId || "").trim().slice(0, 200);
  const targetLabel = String(body.targetLabel || "").trim().slice(0, 200);
  const path = String(body.path || "/").trim().slice(0, 200);
  const sessionId = String(body.sessionId || "").trim().slice(0, 100);
  const referrer = String(body.referrer || "").trim().slice(0, 500);
  if (!targetType || !targetId) {
    return res.status(400).json({ error: "targetType and targetId are required" });
  }

  if (dbConfigured()) {
    pgInsertClick({
      targetId,
      targetType,
      targetLabel,
      pagePath: path,
      sessionId,
    }).catch(() => {});
  }

  const now = new Date();
  const today = dstr(now);
  const event = {
    time: now.toISOString(),
    targetType,
    targetId,
    targetLabel,
    path,
    sessionId,
    referrer,
  };

  await withLock("clicks", async () => {
    const clicks = await readStore("clicks.json", { events: [], summary: {} });
    clicks.events = Array.isArray(clicks.events) ? clicks.events : [];
    clicks.summary =
      clicks.summary && typeof clicks.summary === "object" ? clicks.summary : {};

    clicks.events.push(event);
    if (clicks.events.length > 500) clicks.events = clicks.events.slice(-500);

    const key = `${targetType}::${targetId}`;
    if (!clicks.summary[key]) {
      clicks.summary[key] = {
        targetType,
        targetId,
        targetLabel,
        total: 0,
        today: 0,
        week: 0,
        lastSeen: "",
        firstSeen: event.time,
        daily: {},
      };
    }
    const s = clicks.summary[key];
    s.total += 1;
    s.lastSeen = event.time;
    if (targetLabel) s.targetLabel = targetLabel;
    s.daily = s.daily || {};
    s.daily[today] = (s.daily[today] || 0) + 1;

    let todayCount = 0,
      weekCount = 0;
    for (let i = 0; i < 7; i++) {
      const c = s.daily[dstr(daysAgo(i))] || 0;
      if (i === 0) todayCount = c;
      weekCount += c;
    }
    s.today = todayCount;
    s.week = weekCount;

    const cutoff = daysAgo(30).setHours(0, 0, 0, 0);
    for (const dk of Object.keys(s.daily)) {
      if (new Date(dk + "T00:00:00").getTime() < cutoff) delete s.daily[dk];
    }
    await writeStore("clicks.json", clicks);
  });
  res.json({ ok: true });
}
