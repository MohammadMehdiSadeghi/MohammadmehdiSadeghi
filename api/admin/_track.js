import {
  readStore,
  writeStore,
  withLock,
  rateCheck,
  dstr,
  getBearer,
  verifyToken,
} from "../_lib.js";
import { pgInsertVisit, dbConfigured } from "../_pg.js";
import { resolveCountry } from "../_country.js";

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
  const country = resolveCountry(req, body);

  if (sessionId) {
    await withLock("online", async () => {
      const online = await readStore("online.json", {});
      const now = Math.floor(Date.now() / 1000);
      online[sessionId] = { seen: now, country };
      for (const [sid, val] of Object.entries(online)) {
        const seen = typeof val === "object" && val !== null ? val.seen : Number(val);
        if (now - seen > 60) delete online[sid];
      }
      await writeStore("online.json", online);
    });
  }
  if (heartbeat) return res.json({ ok: true, country });

  const today = dstr(new Date());
  if (dbConfigured()) {
    pgInsertVisit({
      visitDate: today,
      visitHour: new Date().getHours(),
      pagePath: p,
      countryCode: country || "UNKNOWN",
      sessionId: sessionId || "anon",
      ipHash: null,
      userAgent: req.headers["user-agent"] || null,
    }).catch(() => {});
  }

  await withLock("visits", async () => {
    const visits = await readStore("visits.json", { days: {} });
    if (!visits.days || typeof visits.days !== "object") visits.days = {};
    if (!visits.days[today]) visits.days[today] = { total: 0, paths: {}, countries: {} };
    if (!visits.days[today].countries || typeof visits.days[today].countries !== "object") visits.days[today].countries = {};
    visits.days[today].total += 1;
    visits.days[today].paths[p] = (visits.days[today].paths[p] || 0) + 1;
    if (country) {
      visits.days[today].countries[country] = (visits.days[today].countries[country] || 0) + 1;
    }
    await writeStore("visits.json", visits);
  });
  res.json({ ok: true, country });
}
