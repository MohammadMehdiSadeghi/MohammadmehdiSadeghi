import { useCallback, useEffect, useMemo, useState } from "react";
import { useAdminAuth } from "../../../Hooks/useAdminAuth";
import { SITE_DEFAULTS } from "../../../Hooks/useSiteInfo";


const GROUPS = [
  {
    id: "identity",
    title: "identity",
    hint: "the name shown in the header bar and the mobile menu",
    fields: [
      {
        key: "brand",
        label: "brand name",
        placeholder: "Mohammad-Mehdi-Sadeghi",
        wide: true,
      },
    ],
  },
  {
    id: "contact",
    title: "contact",
    hint: "used by the contacts block on /contact and /about, and the mailto: links",
    fields: [
      {
        key: "email",
        label: "email",
        placeholder: "you@example.com",
        wide: true,
      },
      {
        key: "phone",
        label: "phone (dial)",
        placeholder: "+989150669620",
        hint: "goes into the tel: link — digits only, may start with +",
      },
      {
        key: "phoneLabel",
        label: "phone (displayed)",
        placeholder: "+98 915 066 9620",
        hint: "how the number is written on screen",
      },
    ],
  },
  {
    id: "github",
    title: "github",
    hint: "footer icon, the mobile menu link, and the link on the home page",
    fields: [
      {
        key: "github",
        label: "profile url",
        placeholder: "https://github.com/username",
        wide: true,
      },
      {
        key: "githubHandle",
        label: "handle (no @)",
        placeholder: "username",
        hint: "shown as @handle in the footer",
      },
    ],
  },
  {
    id: "linkedin",
    title: "linkedin",
    hint: "footer icon",
    fields: [
      {
        key: "linkedin",
        label: "profile url",
        placeholder: "https://www.linkedin.com/in/username",
        wide: true,
      },
    ],
  },
  {
    id: "telegram",
    title: "telegram",
    hint: "footer icon, contacts block, mobile menu link",
    fields: [
      {
        key: "telegram",
        label: "link",
        placeholder: "https://t.me/username",
        wide: true,
      },
      {
        key: "telegramHandle",
        label: "handle (no @)",
        placeholder: "username",
        hint: "shown as @handle in the contacts block",
      },
    ],
  },
  {
    id: "instagram",
    title: "instagram",
    hint: "contacts block",
    fields: [
      {
        key: "instagram",
        label: "profile url",
        placeholder: "https://www.instagram.com/username",
        wide: true,
      },
      {
        key: "instagramHandle",
        label: "handle (no @)",
        placeholder: "username",
        hint: "shown as @handle in the contacts block",
      },
    ],
  },
];

const ALL_KEYS = GROUPS.flatMap((g) => g.fields.map((f) => f.key));

const fieldCls =
  "bg-[#020618] py-2.5 px-3 border-0 outline-[#314158] outline-1 hover:outline-[#90A1B9] focus:outline-[#615FFF] duration-150 rounded-md w-full text-[#90a1b9c7] text-[12px]";

function validate(draft) {
  const errors = {};
  if (draft.email && !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(draft.email)) {
    errors.email = "not a valid email address";
  }
  const digits = String(draft.phone || "").replace(/[^\d+]/g, "");
  if (draft.phone && !/^\+?\d{7,15}$/.test(digits)) {
    errors.phone = "7-15 digits, optionally starting with +";
  }
  for (const key of ["github", "linkedin", "telegram", "instagram"]) {
    const url = String(draft[key] || "");
    if (!url) continue;
    if (!/^https?:\/\//i.test(url)) {
      errors[key] = "must start with http:// or https://";
      continue;
    }
    try {
      new URL(url);
    } catch {
      errors[key] = "not a valid URL";
    }
  }
  return errors;
}

function hydrate(saved) {
  const draft = {};
  for (const key of ALL_KEYS) {
    const v = saved?.[key];
    draft[key] = typeof v === "string" ? v : (SITE_DEFAULTS[key] ?? "");
  }
  return draft;
}

export default function SitePage() {
  const { authFetch } = useAdminAuth();
  const [saved, setSaved] = useState(null);
  const [draft, setDraft] = useState(() => hydrate(null));
  const [loading, setLoading] = useState(true);
  const [busy, setBusy] = useState(false);
  const [error, setError] = useState("");
  const [msg, setMsg] = useState(null);
  const [meta, setMeta] = useState({ storage: "", durable: true });

  const load = useCallback(async () => {
    setLoading(true);
    setError("");
    try {
      const res = await authFetch("/api/admin/site-admin");
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Failed to load site info");
      setSaved(json.site || {});
      setDraft(hydrate(json.site));
      setMeta({
        storage: json.storage || "",
        durable: json.durable !== false,
      });
    } catch (err) {
      setError(err.message || "Failed to load site info");
    } finally {
      setLoading(false);
    }
  }, [authFetch]);

  useEffect(() => {
    load();
  }, [load]);

  const errors = useMemo(() => validate(draft), [draft]);
  const dirty = useMemo(
    () => JSON.stringify(draft) !== JSON.stringify(hydrate(saved)),
    [draft, saved]
  );
  const blocked = Object.keys(errors).length > 0;

  const set = (key) => (e) => {
    setMsg(null);
    setDraft((prev) => ({ ...prev, [key]: e.target.value }));
  };

  const save = async () => {
    if (blocked || busy) return;
    setBusy(true);
    setMsg(null);
    try {
      const res = await authFetch("/api/admin/site-admin", {
        method: "PUT",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify(draft),
      });
      const json = await res.json().catch(() => ({}));
      if (!res.ok) throw new Error(json.error || "Save failed");
      setSaved(json.site || draft);
      setDraft(hydrate(json.site || draft));
      setMsg({ type: "ok", text: "saved — the site now shows these values" });
    } catch (err) {
      setMsg({ type: "err", text: err.message || "Save failed" });
    } finally {
      setBusy(false);
    }
  };

  const reset = () => {
    setMsg(null);
    setDraft(hydrate(saved));
  };

  if (loading) {
    return <p className="text-[12px] text-[#68768C]">_loading-site-info...</p>;
  }

  return (
    <div className="flex flex-col gap-6 max-w-3xl">
      <div>
        <p className="text-[#615FFF] text-[12px]">$ cat ./site.json</p>
        <h1 className="text-white text-[20px] mt-1">Site info</h1>
        <p className="text-[#68768C] text-[11px] mt-1">
          Email, phone and social links used across the whole site. One save
          updates the header, footer, contacts block and home page together.
        </p>
      </div>

      {error && (
        <p className="text-[11px] text-[#FF6B6B] bg-[#FF6B6B14] border border-[#FF6B6B33] rounded-md px-3 py-2 w-fit">
          // {error}
        </p>
      )}

      {!meta.durable && (
        <div className="rounded-md border border-[#FFB86A55] bg-[#FFB86A0F] px-3 py-2.5 flex flex-col gap-1">
          <p className="text-[11px] text-[#FFB86A]">
            Notice: these edits are not stored permanently on this host
          </p>
          <p className="text-[10px] text-[#90A1B9]">
            storage: <span className="text-[#00D5BE]">{meta.storage || "file"}</span> —
            connect a Redis-compatible store (KV_REST_API_URL / KV_REST_API_TOKEN)
            or run the self-hosted server, then edits survive restarts.
          </p>
        </div>
      )}

      {GROUPS.map((group) => (
        <section
          key={group.id}
          className="rounded-lg border border-[#1E293B] bg-[#0F172B] p-4 sm:p-5 flex flex-col gap-4"
        >
          <div>
            <p className="text-white text-[13px]">
              <span className="text-[#615FFF]">#</span> {group.title}
            </p>
            <p className="text-[10px] text-[#68768C] mt-0.5">{group.hint}</p>
          </div>

          <div className="grid grid-cols-1 sm:grid-cols-2 gap-4">
            {group.fields.map((f) => (
              <label
                key={f.key}
                className={`flex flex-col gap-1.5 ${f.wide ? "sm:col-span-2" : ""}`}
              >
                <span className="text-[#90A1B9] text-[11px]">_{f.label}</span>
                <input
                  type="text"
                  className={fieldCls}
                  value={draft[f.key] ?? ""}
                  onChange={set(f.key)}
                  placeholder={f.placeholder}
                  spellCheck={false}
                  autoComplete="off"
                />
                {errors[f.key] ? (
                  <span className="text-[10px] text-[#FF6B6B]">
                    {errors[f.key]}
                  </span>
                ) : f.hint ? (
                  <span className="text-[10px] text-[#4B576D]">{f.hint}</span>
                ) : null}
              </label>
            ))}
          </div>
        </section>
      ))}

      <section className="rounded-lg border border-[#1E293B] bg-[#0F172B] p-4 sm:p-5 flex flex-col gap-3">
        <p className="text-white text-[13px]">
          <span className="text-[#615FFF]">#</span> preview
        </p>
        <p className="text-[10px] text-[#68768C]">
          empty fields disappear from the site instead of rendering a dead link
        </p>
        <div className="flex flex-col gap-2 font-mono text-[11px]">
          {[
            ["header", draft.brand],
            ["mailto", draft.email ? `mailto:${draft.email}` : ""],
            ["tel", draft.phone ? `tel:${draft.phone}` : ""],
            ["phone label", draft.phoneLabel || draft.phone],
            ["github", draft.github],
            ["github label", draft.githubHandle ? `@${draft.githubHandle}` : ""],
            ["linkedin", draft.linkedin],
            ["telegram", draft.telegram],
            ["telegram label", draft.telegramHandle ? `@${draft.telegramHandle}` : ""],
            ["instagram", draft.instagram],
            ["instagram label", draft.instagramHandle ? `@${draft.instagramHandle}` : ""],
          ].map(([label, value]) => (
            <div key={label} className="flex items-baseline gap-3">
              <span className="w-28 shrink-0 text-[#4B576D]">{label}</span>
              {value ? (
                <span className="text-[#00D5BE] break-all">{value}</span>
              ) : (
                <span className="text-[#4B576D] line-through">hidden</span>
              )}
            </div>
          ))}
        </div>
      </section>

      {msg && (
        <p
          className={`text-[11px] ${
            msg.type === "ok" ? "text-[#4ADE80]" : "text-[#FF6B6B]"
          }`}
        >
          {msg.text}
        </p>
      )}

      <div className="flex items-center gap-3 flex-wrap">
        <button
          onClick={save}
          disabled={busy || blocked || !dirty}
          className="text-[11px] px-4 py-2 rounded-md border border-[#615FFF] text-[#615FFF] hover:bg-[#615FFF] hover:text-white duration-150 disabled:opacity-40"
        >
          {busy ? "saving…" : dirty ? "_save-site-info()" : "saved"}
        </button>
        <button
          onClick={reset}
          disabled={busy || !dirty}
          className="text-[11px] px-4 py-2 rounded-md border border-[#314158] text-[#90A1B9] hover:border-[#90A1B9] hover:text-white duration-150 disabled:opacity-40"
        >
          discard-changes
        </button>
        {saved?.updatedAt && (
          <span className="text-[10px] text-[#4B576D]">
            last saved {new Date(saved.updatedAt).toLocaleString()}
          </span>
        )}
      </div>
    </div>
  );
}
