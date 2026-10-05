import {
  requireAuth,
  readStore,
  writeStore,
  withLock,
  rateCheck,
  MESSAGE_STATUSES,
} from "../_lib.js";
import {
  dbConfigured,
  pgListMessages,
  pgInsertMessage,
  pgSetMessageStatus,
  pgDeleteMessage,
} from "../_pg.js";

/* Messages: when Postgres is configured they are real rows in
   contact_messages, so an inquiry submitted before a cold start is still
   there afterwards. Without a DB the JSON store is used as before. */

export default async function handler(req, res) {
  if (req.method === "POST") {
    const allowed = await rateCheck(req, "contact", false);
    if (!allowed) {
      return res.status(429).json({ error: "too many attempts, try again later" });
    }
    const body = req.body || {};
    const name = String(body.name || "").trim();
    const phoneNumber = String(body.phoneNumber || "").trim();
    const message = String(body.message || "").trim();
    if (!name || !message) {
      return res.status(400).json({ error: "name and message are required" });
    }
    if (name.length > 100 || message.length > 5000) {
      return res.status(400).json({ error: "name or message too long" });
    }

    if (dbConfigured()) {
      const saved = await pgInsertMessage({ name, phoneNumber, message });
      if (saved) return res.json({ ok: true, message: saved });
    }

    await withLock("messages", async () => {
      const store = await readStore("messages.json", { messages: [], nextId: 1 });
      if (!store.nextId) store.nextId = 1;
      if (!Array.isArray(store.messages)) store.messages = [];
      store.messages.unshift({
        id: store.nextId++,
        name,
        phoneNumber,
        message,
        date: new Date().toISOString(),
        status: "unseen",
      });
      await writeStore("messages.json", store);
    });
    return res.json({ ok: true });
  }

  if (requireAuth(req, res) === null) return;

  if (req.method === "GET") {
    if (dbConfigured()) {
      const rows = await pgListMessages();
      if (rows) return res.json({ messages: rows });
    }
    const store = await readStore("messages.json", { messages: [] });
    return res.json({ messages: store.messages || [] });
  }
  if (req.method === "PATCH") {
    const body = req.body || {};
    const { id, status } = body;
    if (id == null || !MESSAGE_STATUSES.has(status)) {
      return res.status(400).json({ error: "id and a valid status are required" });
    }
    if (dbConfigured()) {
      const ok = await pgSetMessageStatus(id, status);
      if (ok) return res.json({ ok: true });
    }
    const store = await readStore("messages.json", { messages: [] });
    const m = (store.messages || []).find((x) => String(x.id) === String(id));
    if (!m) return res.status(404).json({ error: "message not found" });
    m.status = status;
    await writeStore("messages.json", store);
    return res.json({ ok: true });
  }
  if (req.method === "DELETE") {
    const body = req.body || {};
    const id = body.id ?? req.query.id;
    if (id == null) return res.status(400).json({ error: "id is required" });
    if (dbConfigured()) {
      const ok = await pgDeleteMessage(id);
      if (ok) return res.json({ ok: true });
    }
    const store = await readStore("messages.json", { messages: [] });
    const before = (store.messages || []).length;
    store.messages = (store.messages || []).filter(
      (x) => String(x.id) !== String(id)
    );
    if (store.messages.length === before) {
      return res.status(404).json({ error: "message not found" });
    }
    await writeStore("messages.json", store);
    return res.json({ ok: true });
  }
  res.status(405).json({ error: "method not allowed" });
}
