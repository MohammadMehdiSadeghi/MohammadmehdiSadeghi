/* ════════════════════════════════════════════════════════════════════
   Admin: Telegram config + test message.
     GET  /api/admin/telegram               → masked config
     POST /api/admin/telegram               → save config
     POST /api/admin/telegram/test          → send a test message
     POST /api/admin/telegram/detect-chat   → list chats from getUpdates

   Config lives in the ephemeral store (telegram.json); the bot token is
   never echoed back to the client — only a masked form.
   ════════════════════════════════════════════════════════════════════ */

import { requireAuth, readStore, writeStore, withLock } from "../_lib.js";

const FILE = "telegram.json";
const TELEGRAM_API = "https://api.telegram.org";

const readCfg = async () => {
  const cfg = await readStore(FILE, {});
  return {
    enabled: !!cfg.enabled,
    botToken: String(cfg.botToken || ""),
    chatId: String(cfg.chatId || ""),
  };
};

const escHtml = (s) =>
  String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

async function sendMessage(cfg, html) {
  const ctrl = new AbortController();
  const timer = setTimeout(() => ctrl.abort(), 10000);
  try {
    const r = await fetch(`${TELEGRAM_API}/bot${cfg.botToken}/sendMessage`, {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({
        chat_id: cfg.chatId,
        text: html,
        parse_mode: "HTML",
        disable_web_page_preview: true,
      }),
      signal: ctrl.signal,
    });
    const j = await r.json().catch(() => ({}));
    if (!r.ok || !j.ok) throw new Error(j.description || `Telegram HTTP ${r.status}`);
    return { ok: true };
  } finally {
    clearTimeout(timer);
  }
}

export default async function handler(req, res, resource) {
  if (requireAuth(req, res) === null) return;

  const action = resource || "";

  /* ── detect-chat ── */
  if (action === "detect-chat" && req.method === "POST") {
    const cfg = await readCfg();
    const token = String((req.body || {}).botToken || "").trim() || cfg.botToken;
    if (!token) return res.status(400).json({ error: "botToken required" });
    try {
      const ctrl = new AbortController();
      const t = setTimeout(() => ctrl.abort(), 10000);
      const r = await fetch(`${TELEGRAM_API}/bot${token}/getUpdates?limit=10`, {
        signal: ctrl.signal,
      });
      clearTimeout(t);
      const j = await r.json().catch(() => ({}));
      if (!r.ok || !j.ok) throw new Error(j.description || `Telegram HTTP ${r.status}`);
      const chats = [];
      for (const u of j.result || []) {
        const m = u.message || u.edited_message || u.channel_post;
        const chat = m && m.chat;
        if (chat && !chats.some((c) => String(c.id) === String(chat.id))) {
          chats.push({
            id: String(chat.id),
            title: chat.first_name
              ? `${chat.first_name} ${chat.last_name || ""}`.trim()
              : chat.title || chat.username || "",
          });
        }
      }
      return res.json({ ok: true, chats });
    } catch (err) {
      return res.status(502).json({ error: err.message || "Telegram request failed" });
    }
  }

  /* ── test ── */
  if (action === "test" && req.method === "POST") {
    const cfg = await readCfg();
    if (!cfg.botToken || !cfg.chatId) {
      return res.status(400).json({ error: "Save bot token and chat id first" });
    }
    try {
      const dt = new Date().toLocaleString("en-GB", { hour12: false });
      await sendMessage(
        cfg,
        [
          "🔔 <b>Test message</b>",
          "",
          "Your portfolio admin panel is connected to this chat.",
          "",
          `🕐 <i>${escHtml(dt)}</i>`,
        ].join("\n")
      );
      return res.json({ ok: true });
    } catch (err) {
      return res.status(502).json({ error: err.message || "Telegram request failed" });
    }
  }

  /* ── GET config ── */
  if (req.method === "GET") {
    const cfg = await readCfg();
    return res.json({
      enabled: cfg.enabled,
      chatId: cfg.chatId,
      botTokenSet: !!cfg.botToken,
      botTokenMasked: cfg.botToken
        ? cfg.botToken.slice(0, 6) + "…" + cfg.botToken.slice(-4)
        : "",
    });
  }

  /* ── POST save config ── */
  if (req.method === "POST") {
    const body = req.body || {};
    const botToken = String(body.botToken ?? "").trim();
    const chatId = String(body.chatId ?? "").trim();
    const enabled = !!body.enabled;
    if (enabled && !chatId) {
      return res.status(400).json({ error: "chatId is required to enable" });
    }
    if (botToken && !/^\d{6,}:[A-Za-z0-9_-]{30,}$/.test(botToken)) {
      return res.status(400).json({ error: "botToken doesn't look valid (expected 123456:ABC…)" });
    }
    const prev = await readCfg();
    const next = {
      enabled,
      botToken: botToken || prev.botToken,
      chatId: chatId || prev.chatId,
    };
    if (enabled && !next.botToken) {
      return res.status(400).json({ error: "botToken is required to enable" });
    }
    await withLock("telegram", async () => {
      await writeStore(FILE, next);
    });
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "method not allowed" });
}
