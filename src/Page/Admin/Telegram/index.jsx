import { useEffect, useState } from "react";
import { useAdminAuth } from "../../../Hooks/useAdminAuth";

export default function TelegramPage() {
  const { authFetch } = useAdminAuth();
  const [cfg, setCfg] = useState(null);
  const [botToken, setBotToken] = useState("");
  const [chatId, setChatId] = useState("");
  const [enabled, setEnabled] = useState(false);
  const [msg, setMsg] = useState(null);
  const [busy, setBusy] = useState(false);
  const [detected, setDetected] = useState([]);

  const load = async () => {
    try {
      const res = await authFetch("/api/admin/telegram");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load config");
      setCfg(json);
      setChatId(json.chatId || "");
      setEnabled(!!json.enabled);
    } catch (err) {
      setMsg({ type: "err", text: err.message });
    }
  };

  useEffect(() => {
    load();
  }, []);

  const save = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const body = { enabled, chatId: chatId.trim() };
      if (botToken.trim()) body.botToken = botToken.trim();
      const res = await authFetch("/api/admin/telegram", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(body),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setMsg({ type: "ok", text: "saved ✓" });
      setBotToken("");
      await load();
    } catch (err) {
      setMsg({ type: "err", text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const sendTest = async () => {
    setBusy(true);
    setMsg(null);
    try {
      const res = await authFetch("/api/admin/telegram/test", { method: "POST" });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Test failed");
      setMsg({ type: "ok", text: "test message sent — check Telegram ✓" });
    } catch (err) {
      setMsg({ type: "err", text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const detectChats = async () => {
    if (!botToken.trim() && !cfg?.tokenSet) {
      setMsg({ type: "err", text: "Please enter your Bot Token first" });
      return;
    }
    setBusy(true);
    setMsg(null);
    setDetected([]);
    try {
      const payload = botToken.trim() ? { botToken: botToken.trim() } : {};
      const res = await authFetch("/api/admin/telegram/detect-chat", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(payload),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Detection failed");
      setDetected(json.chats || []);
      if (!(json.chats || []).length) {
        setMsg({
          type: "err",
          text: "no chats found — send ANY message to your bot first, then retry",
        });
      }
    } catch (err) {
      setMsg({ type: "err", text: err.message });
    } finally {
      setBusy(false);
    }
  };

  const inputClass =
    "bg-[#020618] py-2.5 px-3 border-0 outline-[#314158] outline-1 hover:outline-[#90A1B9] focus:text-[#90A1B9] duration-150 rounded-md w-full text-[#90a1b9c7]";

  return (
    <div className="flex flex-col gap-6 max-w-2xl">
      <div>
        <p className="text-[#615FFF] text-[12px]">$ nano ./telegram/bot.json</p>
        <h1 className="text-white text-[20px] mt-1">Telegram Notifications</h1>
        <p className="text-[#68768C] text-[11px] mt-1">
          Get every contact-form submission delivered to your Telegram
        </p>
      </div>

      <div className="rounded-lg border border-[#1E293B] bg-[#0F172B] p-4 sm:p-5 text-[11px] text-[#90A1B9] leading-6">
        <p className="text-white text-[12px] mb-2">// setup in 4 steps</p>
        <ol className="list-decimal list-inside flex flex-col gap-1">
          <li>
            open{" "}
            <a
              href="https://t.me/BotFather"
              target="_blank"
              rel="noopener noreferrer"
              className="text-[#615FFF] hover:underline"
            >
              @BotFather
            </a>{" "}
            → <span className="text-[#C27AFF]">/newbot</span> → copy the{" "}
            <b className="text-white">bot token</b>
          </li>
          <li>open your own chat with the new bot and press START (send any message)</li>
          <li>paste the token below → click «detect chat-id» → pick your chat</li>
          <li>enable + save → send a test message to verify</li>
        </ol>
      </div>

      {cfg && (
        <div className="rounded-lg border border-[#1E293B] bg-[#0F172B] px-4 py-3 flex items-center gap-3 text-[11px]">
          <span
            className={`w-2 h-2 rounded-full ${
              cfg.enabled && cfg.botTokenSet ? "bg-[#4ADE80]" : "bg-[#68768C]"
            }`}
          />
          <span className="text-[#90A1B9]">
            status:{" "}
            <b className={cfg.enabled && cfg.botTokenSet ? "text-[#4ADE80]" : "text-[#68768C]"}>
              {cfg.enabled && cfg.botTokenSet ? "connected" : "not configured"}
            </b>
          </span>
          {cfg.botTokenSet && (
            <span className="text-[#4B576D] tabular-nums">token {cfg.botTokenMasked}</span>
          )}
        </div>
      )}

      <div className="rounded-lg border border-[#1E293B] bg-[#0F172B] p-4 sm:p-5 flex flex-col gap-4">
        <label className="flex flex-col gap-1.5">
          <p className="text-[#90A1B9] text-[12px]">_bot-token</p>
          <input
            className={`${inputClass} font-mono`}
            value={botToken}
            onChange={(e) => setBotToken(e.target.value)}
            placeholder={cfg?.botTokenSet ? cfg.botTokenMasked : "123456789:AAF…"}
            spellCheck={false}
          />
          {cfg?.botTokenSet && (
            <p className="text-[10px] text-[#4B576D]">
              // leave empty to keep the saved token
            </p>
          )}
        </label>

        <label className="flex flex-col gap-1.5">
          <p className="text-[#90A1B9] text-[12px]">_chat-id</p>
          <div className="flex gap-2">
            <input
              className={`${inputClass} font-mono flex-1`}
              value={chatId}
              onChange={(e) => setChatId(e.target.value)}
              placeholder="8834580318 (your numeric chat id)"
              spellCheck={false}
            />
            <button
              type="button"
              onClick={detectChats}
              disabled={busy || (!botToken.trim() && !cfg?.botTokenSet)}
              className="text-[11px] px-3 rounded-md border border-[#314158] text-[#90A1B9] hover:border-[#90A1B9] hover:text-white duration-150 disabled:opacity-40 whitespace-nowrap"
            >
              detect chat-id
            </button>
          </div>
        </label>

        {detected.length > 0 && (
          <div className="rounded-md border border-[#314158] overflow-hidden">
            {detected.map((c) => (
              <button
                key={c.id}
                type="button"
                onClick={() => setChatId(c.id)}
                className={`w-full text-left px-3 py-2 text-[11px] flex items-center justify-between duration-150 ${
                  chatId === c.id
                    ? "bg-[#615FFF33] text-white"
                    : "text-[#90A1B9] hover:bg-[#7888a01a]"
                }`}
              >
                <span>{c.title || "chat"}</span>
                <span className="font-mono text-[#68768C]">{c.id}</span>
              </button>
            ))}
          </div>
        )}

        <label className="flex items-center gap-2.5 cursor-pointer select-none w-fit">
          <input
            type="checkbox"
            checked={enabled}
            onChange={(e) => setEnabled(e.target.checked)}
            className="w-3.5 h-3.5 accent-[#615FFF]"
          />
          <span className="text-[12px] text-[#90A1B9]">
            send contact-form submissions to Telegram
          </span>
        </label>

        {msg && (
          <p
            className={`text-[11px] rounded-md px-3 py-2 w-fit ${
              msg.type === "err"
                ? "text-[#FF6B6B] bg-[#FF6B6B14] border border-[#FF6B6B33]"
                : "text-[#4ADE80] bg-[#4ADE8015] border border-[#4ADE8033]"
            }`}
          >
            // {msg.text}
          </p>
        )}

        <div className="flex gap-3 pt-1 flex-wrap">
          <button
            onClick={save}
            disabled={busy}
            className="flex-1 min-w-[120px] text-[12px] py-2.5 rounded-md cursor-pointer duration-150 bg-[#90A1B9] hover:bg-[#0E1528] outline-1 outline-[#90A1B9] text-[#0E1528] hover:text-[#90A1B9] disabled:opacity-50"
          >
            {busy ? "..." : "save()"}
          </button>
          <button
            onClick={sendTest}
            disabled={busy || !cfg?.botTokenSet}
            className="flex-1 min-w-[120px] text-[12px] py-2.5 rounded-md border border-[#314158] text-[#90A1B9] hover:border-[#90A1B9] hover:text-white duration-150 disabled:opacity-40"
          >
            send-test-message
          </button>
        </div>
      </div>
    </div>
  );
}
