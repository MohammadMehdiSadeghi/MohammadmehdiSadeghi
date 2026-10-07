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
const LOG_FILE = "telegram-log.json";
const TELEGRAM_API = "https://api.telegram.org";

export const readCfg = async () => {
  const cfg = await readStore(FILE, {});
  return {
    enabled: !!cfg.enabled,
    botToken: String(cfg.botToken || ""),
    chatId: String(cfg.chatId || ""),
  };
};

export const escHtml = (s) =>
  String(s || "")
    .replace(/&/g, "&amp;")
    .replace(/</g, "&lt;")
    .replace(/>/g, "&gt;");

export async function sendMessage(cfg, html) {
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

export async function recordTelegramLog(entry) {
  await withLock("telegram-log", async () => {
    const logStore = await readStore(LOG_FILE, { entries: [] });
    if (!Array.isArray(logStore.entries)) logStore.entries = [];
    logStore.entries.unshift(entry);
    if (logStore.entries.length > 100) logStore.entries = logStore.entries.slice(0, 100);
    await writeStore(LOG_FILE, logStore);
  });
}

export async function notifyNewContactMessage(msg) {
  const cfg = await readCfg();
  const time = new Date().toISOString();
  if (!cfg.enabled || !cfg.botToken || !cfg.chatId) {
    await recordTelegramLog({ kind: "contact", skipped: true, time });
    return;
  }
  const dt = new Date().toLocaleString("en-GB", { hour12: false });
  const html = [
    "📬 <b>New Contact Form Submission</b>",
    "",
    `<b>Name:</b> ${escHtml(msg.name)}`,
    msg.phoneNumber ? `<b>Phone:</b> ${escHtml(msg.phoneNumber)}` : null,
    `<b>Time:</b> <i>${escHtml(dt)}</i>`,
    "",
    `<b>Message:</b>`,
    `<blockquote expandable>${escHtml(msg.message)}</blockquote>`,
  ].filter(Boolean).join("\n");

  try {
    await sendMessage(cfg, html);
    await recordTelegramLog({ kind: "contact", ok: true, time });
  } catch (err) {
    console.error("[telegram] notify failed:", err?.message || err);
    await recordTelegramLog({
      kind: "contact",
      ok: false,
      error: err?.message || "Telegram request failed",
      time,
    });
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
    const logStore = await readStore(LOG_FILE, { entries: [] });
    return res.json({
      enabled: cfg.enabled,
      chatId: cfg.chatId,
      botTokenSet: !!cfg.botToken,
      botTokenMasked: cfg.botToken
        ? cfg.botToken.slice(0, 6) + "…" + cfg.botToken.slice(-4)
        : "",
      log: Array.isArray(logStore.entries) ? logStore.entries : [],
    });
  }

  /* ── POST save config ── */
  if (req.method === "POST") {
    const body = req.body || {};
    const botToken = String(body.botToken ?? "").trim();
    const chatId = String(body.chatId ?? "").trim();
    const enabled = !!body.enabled;
    const prev = await readCfg();
    const effectiveToken = botToken || prev.botToken;
    const effectiveChatId = chatId || prev.chatId;

    if (enabled && (!effectiveToken || !effectiveChatId)) {
      return res.status(400).json({ error: "botToken and chatId are required to enable" });
    }
    if (botToken && !/^\d{6,}:[A-Za-z0-9_-]{30,}$/.test(botToken)) {
      return res.status(400).json({ error: "botToken doesn't look valid (expected 123456:ABC…)" });
    }

    const next = {
      enabled,
      botToken: effectiveToken,
      chatId: effectiveChatId,
    };
    await withLock("telegram", async () => {
      await writeStore(FILE, next);
    });
    return res.json({ ok: true });
  }

  return res.status(405).json({ error: "method not allowed" });
}
