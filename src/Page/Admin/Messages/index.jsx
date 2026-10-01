import { useEffect, useMemo, useState } from "react";
import { useAdminAuth } from "../../../Hooks/useAdminAuth";
import ConfirmDialog from "../ui/ConfirmDialog";

const TABS = [
  { key: "inbox", label: "inbox" },
  { key: "archived", label: "archived" },
];

function formatDate(iso) {
  try {
    return new Date(iso).toLocaleString("en-US", {
      year: "numeric",
      month: "short",
      day: "2-digit",
      hour: "2-digit",
      minute: "2-digit",
    });
  } catch {
    return iso;
  }
}

export default function MessagesPage() {
  const { authFetch } = useAdminAuth();
  const [messages, setMessages] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [tab, setTab] = useState("inbox");
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busyId, setBusyId] = useState(null);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await authFetch("/api/admin/messages");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load messages");
      setMessages(json.messages || []);
    } catch (err) {
      setError(err.message || "Failed to load messages");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const updateStatus = async (id, status) => {
    setBusyId(id);
    try {
      const res = await authFetch("/api/admin/messages", {
        method: "PATCH",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id, status }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Update failed");
      setMessages((prev) =>
        prev.map((m) => (m.id === id ? { ...m, status } : m)),
      );
    } catch (err) {
      setError(err.message || "Update failed");
    } finally {
      setBusyId(null);
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusyId(deleteTarget.id);
    try {
      const res = await authFetch("/api/admin/messages", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      setMessages((prev) => prev.filter((m) => m.id !== deleteTarget.id));
      setDeleteTarget(null);
    } catch (err) {
      setError(err.message || "Delete failed");
    } finally {
      setBusyId(null);
    }
  };

  useEffect(() => {
    window.dispatchEvent(new CustomEvent("messages-updated", { detail: messages }));
  }, [messages]);

  const filtered = useMemo(() => {
    if (tab === "archived") return messages.filter((m) => m.status === "archived");
    return messages.filter((m) => m.status !== "archived");
  }, [messages, tab]);

  const unseenCount = useMemo(
    () => messages.filter((m) => m.status === "unseen").length,
    [messages],
  );

  return (
    <div className="flex flex-col gap-6">
      <div>
        <p className="text-[#615FFF] text-[12px]">$ tail -f ./contact/inbox.log</p>
        <h1 className="text-white text-[20px] mt-1">Messages</h1>
        <p className="text-[#68768C] text-[11px] mt-1">
          Messages submitted through the contact form
        </p>
      </div>

      <div className="flex items-center justify-between flex-wrap gap-3">
        <div className="flex gap-1 rounded-md border border-[#1E293B] p-1 w-fit">
          {TABS.map((t) => (
            <button
              key={t.key}
              onClick={() => setTab(t.key)}
              className={`text-[11px] px-3 py-1.5 rounded duration-150 flex items-center gap-2 ${
                tab === t.key
                  ? "bg-[#615FFF33] text-white"
                  : "text-[#68768C] hover:text-white"
              }`}
            >
              <span>{t.label}</span>
              {t.key === "inbox" && unseenCount > 0 && (
                <span className="text-[10px] font-bold px-1.5 py-0.5 rounded-full bg-[#FF5F56] text-white shadow-[0_0_6px_rgba(255,95,86,0.6)] animate-pulse">
                  {unseenCount}
                </span>
              )}
            </button>
          ))}
        </div>
      </div>

      {error && (
        <p className="text-[11px] text-[#FF6B6B] bg-[#FF6B6B14] border border-[#FF6B6B33] rounded-md px-3 py-2 w-fit">
          // {error}
        </p>
      )}

      {loading ? (
        <p className="text-[12px] text-[#68768C]">_loading-messages...</p>
      ) : filtered.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#1E293B] p-10 text-center text-[12px] text-[#68768C]">
          // {tab === "archived" ? "no archived messages" : "inbox is empty"}
        </div>
      ) : (
        <div className="flex flex-col gap-3">
          {filtered.map((m) => (
            <div
              key={m.id}
              className={`rounded-lg border bg-[#0F172B] p-4 sm:p-5 flex flex-col gap-3 ${
                m.status === "unseen" ? "border-[#FFB86A66]" : "border-[#1E293B]"
              }`}
            >
              <div className="flex items-start justify-between gap-3 flex-wrap">
                <div>
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-white text-[13px]">{m.name}</p>
                    {m.status === "unseen" && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#FFB86A22] border border-[#FFB86A55] text-[#FFB86A]">
                        unseen
                      </span>
                    )}
                    {m.status === "archived" && (
                      <span className="text-[9px] px-2 py-0.5 rounded-full bg-[#7888a022] border border-[#7888a055] text-[#90A1B9]">
                        archived
                      </span>
                    )}
                  </div>
                  {m.phoneNumber && (
                    <p className="text-[11px] text-[#68768C] mt-0.5">{m.phoneNumber}</p>
                  )}
                </div>
                <p className="text-[10px] text-[#4B576D] shrink-0">
                  {formatDate(m.date)}
                </p>
              </div>

              <p className="text-[12px] text-[#90A1B9] leading-6 whitespace-pre-wrap">
                {m.message}
              </p>

              <div className="flex flex-wrap gap-2 pt-1">
                {m.status !== "unseen" ? (
                  <button
                    disabled={busyId === m.id}
                    onClick={() => updateStatus(m.id, "unseen")}
                    className="text-[11px] px-3 py-1.5 rounded-md border border-[#314158] text-[#90A1B9] hover:border-[#90A1B9] hover:text-white duration-150 disabled:opacity-50"
                  >
                    mark-unseen
                  </button>
                ) : (
                  <button
                    disabled={busyId === m.id}
                    onClick={() => updateStatus(m.id, "seen")}
                    className="text-[11px] px-3 py-1.5 rounded-md border border-[#314158] text-[#90A1B9] hover:border-[#90A1B9] hover:text-white duration-150 disabled:opacity-50"
                  >
                    mark-seen
                  </button>
                )}

                {m.status !== "archived" ? (
                  <button
                    disabled={busyId === m.id}
                    onClick={() => updateStatus(m.id, "archived")}
                    className="text-[11px] px-3 py-1.5 rounded-md border border-[#314158] text-[#90A1B9] hover:border-[#90A1B9] hover:text-white duration-150 disabled:opacity-50"
                  >
                    archive
                  </button>
                ) : (
                  <button
                    disabled={busyId === m.id}
                    onClick={() => updateStatus(m.id, "seen")}
                    className="text-[11px] px-3 py-1.5 rounded-md border border-[#314158] text-[#90A1B9] hover:border-[#90A1B9] hover:text-white duration-150 disabled:opacity-50"
                  >
                    unarchive
                  </button>
                )}

                <button
                  disabled={busyId === m.id}
                  onClick={() => setDeleteTarget(m)}
                  className="text-[11px] px-3 py-1.5 rounded-md border border-[#FF6B6B44] text-[#FF6B6B] hover:border-[#FF6B6B] duration-150 disabled:opacity-50 ml-auto"
                >
                  delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete message"
          message={`The message from "${deleteTarget.name}" will be permanently deleted.`}
          busy={busyId === deleteTarget.id}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
