import { useState } from "react";
import { useAdminAuth } from "../../../Hooks/useAdminAuth";

export default function SecurityPage() {
  const { authFetch, logout } = useAdminAuth();
  const [current, setCurrent] = useState("");
  const [next, setNext] = useState("");
  const [confirm, setConfirm] = useState("");
  const [busy, setBusy] = useState(false);
  const [msg, setMsg] = useState(null);
  const [envHint, setEnvHint] = useState(null);

  const submit = async (e) => {
    e.preventDefault();
    setMsg(null);
    setEnvHint(null);

    if (next.length < 6) {
      setMsg({ type: "err", text: "new password must be at least 6 characters" });
      return;
    }
    if (next !== confirm) {
      setMsg({ type: "err", text: "new passwords do not match" });
      return;
    }

    setBusy(true);
    try {
      const res = await authFetch("/api/admin/password", {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ currentPassword: current, newPassword: next }),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "change failed");
      setMsg({ type: "ok", text: "password changed — sign in again with the new one" });
      setEnvHint(json.env?.value || null);
      setCurrent("");
      setNext("");
      setConfirm("");
      setTimeout(() => logout(), 1600);
    } catch (err) {
      setMsg({ type: "err", text: err.message || "change failed" });
    } finally {
      setBusy(false);
    }
  };

  const field =
    "bg-[#020618] py-2.5 px-3 border-0 outline-[#314158] outline-1 hover:outline-[#90A1B9] focus:outline-[#615FFF] duration-150 rounded-md w-full text-[#90a1b9c7] text-[12px]";

  return (
    <div className="flex flex-col gap-6 max-w-xl">
      <div>
        <h1 className="text-white text-[16px]">security</h1>
        <p className="text-[#68768C] text-[11px] mt-1">
          change the admin password — hashed with SHA-256, never stored in plain text
        </p>
      </div>

      <form
        onSubmit={submit}
        className="rounded-lg border border-[#1E293B] bg-[#0F172B] p-4 sm:p-6 flex flex-col gap-5"
      >
        <label className="flex flex-col gap-1.5">
          <p className="text-[#90A1B9] text-[11px]">_current-password</p>
          <input
            type="password"
            autoComplete="current-password"
            className={field}
            value={current}
            onChange={(e) => setCurrent(e.target.value)}
            required
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <p className="text-[#90A1B9] text-[11px]">_new-password</p>
          <input
            type="password"
            autoComplete="new-password"
            className={field}
            value={next}
            onChange={(e) => setNext(e.target.value)}
            required
          />
        </label>

        <label className="flex flex-col gap-1.5">
          <p className="text-[#90A1B9] text-[11px]">_confirm-new-password</p>
          <input
            type="password"
            autoComplete="new-password"
            className={field}
            value={confirm}
            onChange={(e) => setConfirm(e.target.value)}
            required
          />
        </label>

        {msg && (
          <p
            className={`text-[11px] ${
              msg.type === "ok" ? "text-[#4ADE80]" : "text-[#FF6B6B]"
            }`}
          >
            {msg.type === "ok" ? "✓ " : "✕ "}
            {msg.text}
          </p>
        )}

        {envHint && (
          <div className="rounded-md border border-[#314158] bg-[#020618] p-3 flex flex-col gap-1.5">
            <p className="text-[10px] text-[#68768C]">
              to make this permanent, set this env var in Vercel → Settings → Environment Variables:
            </p>
            <code className="text-[10px] text-[#00D5BE] break-all">
              VERCEL_ADMIN_PASSWORD_SHA256={envHint}
            </code>
          </div>
        )}

        <button
          type="submit"
          disabled={busy}
          className="self-start text-[11px] px-4 py-2 rounded-md border border-[#615FFF] text-[#615FFF] hover:bg-[#615FFF] hover:text-white duration-150 disabled:opacity-50"
        >
          {busy ? "changing…" : "_change-password()"}
        </button>
      </form>
    </div>
  );
}
