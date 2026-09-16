import { useEffect, useState } from "react";
import { useAdminAuth } from "../../../Hooks/useAdminAuth";
import { formatDate } from "../../../lib/blog";
import ConfirmDialog from "../ui/ConfirmDialog";
import PostFormModal from "./PostFormModal";

export default function BlogPage() {
  const { authFetch } = useAdminAuth();
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [modalState, setModalState] = useState(null); // null | { mode, post? }
  const [deleteTarget, setDeleteTarget] = useState(null);
  const [busy, setBusy] = useState(false);

  const load = async () => {
    setLoading(true);
    setError("");
    try {
      const res = await authFetch("/api/admin/blog-admin");
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to load posts");
      setPosts(json.posts || []);
    } catch (err) {
      setError(err.message || "Failed to load posts");
    } finally {
      setLoading(false);
    }
  };

  useEffect(() => {
    load();
    // eslint-disable-next-line react-hooks/exhaustive-deps
  }, []);

  const handleSave = async (payload, mode, id) => {
    setBusy(true);
    try {
      const res = await authFetch("/api/admin/blog-admin", {
        method: mode === "edit" ? "PUT" : "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ ...payload, id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Save failed");
      setModalState(null);
      await load();
    } finally {
      setBusy(false);
    }
  };

  const handleTogglePublish = async (post) => {
    try {
      const res = await authFetch(`/api/admin/blog-admin?publish=${post.published ? 0 : 1}`, {
        method: "POST",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: post.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Failed to update");
      await load();
    } catch (err) {
      setError(err.message || "Failed to update");
    }
  };

  const handleDelete = async () => {
    if (!deleteTarget) return;
    setBusy(true);
    try {
      const res = await authFetch("/api/admin/blog-admin", {
        method: "DELETE",
        headers: { "Content-Type": "application/json" },
        body: JSON.stringify({ id: deleteTarget.id }),
      });
      const json = await res.json();
      if (!res.ok) throw new Error(json.error || "Delete failed");
      setDeleteTarget(null);
      await load();
    } catch (err) {
      setError(err.message || "Delete failed");
    } finally {
      setBusy(false);
    }
  };

  return (
    <div className="flex flex-col gap-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <p className="text-[#615FFF] text-[12px]">$ ls ./blog</p>
          <h1 className="text-white text-[20px] mt-1">Blog</h1>
          <p className="text-[#68768C] text-[11px] mt-1">
            Write posts, add a cover image and an alt text — they appear on{" "}
            <span className="text-[#90A1B9]">/blog</span> right away
          </p>
        </div>
        <button
          onClick={() => setModalState({ mode: "create" })}
          className="text-[12px] px-4 py-2 rounded-md cursor-pointer duration-150 bg-[#90A1B9] hover:bg-[#0E1528] outline-1 outline-[#90A1B9] text-[#0E1528] hover:text-[#90A1B9]"
        >
          + new-post
        </button>
      </div>

      {error && (
        <p className="text-[11px] text-[#FF6B6B] bg-[#FF6B6B14] border border-[#FF6B6B33] rounded-md px-3 py-2 w-fit">
          // {error}
        </p>
      )}

      {loading ? (
        <p className="text-[12px] text-[#68768C]">_loading-posts...</p>
      ) : posts.length === 0 ? (
        <div className="rounded-lg border border-dashed border-[#1E293B] p-10 text-center text-[12px] text-[#68768C]">
          // no posts yet — click &quot;new-post&quot; to write the first one
        </div>
      ) : (
        <div className="rounded-lg border border-[#1E293B] bg-[#0F172B] overflow-hidden">
          <div className="hidden sm:grid grid-cols-[80px_1fr_110px_110px_210px] gap-2 px-4 py-2.5 text-[10px] uppercase tracking-wider text-[#4B576D] border-b border-[#1E293B] bg-[#0b1220]">
            <span>cover</span>
            <span>title</span>
            <span>date</span>
            <span>status</span>
            <span className="text-right">actions</span>
          </div>

          {posts.map((p) => (
            <div
              key={p.id}
              className="grid grid-cols-1 sm:grid-cols-[80px_1fr_110px_110px_210px] gap-2 px-4 py-3 items-center border-b border-[#1E293B80] last:border-0 hover:bg-[#7888a00d] duration-150"
            >
              <div className="w-[80px] h-[48px] rounded border border-[#1E293B] overflow-hidden bg-[#020618] shrink-0">
                {p.cover ? (
                  <img
                    src={p.cover}
                    alt={p.coverAlt || p.title}
                    className="w-full h-full object-cover"
                  />
                ) : (
                  <span className="w-full h-full flex items-center justify-center text-[8px] text-[#4B576D]">
                    none
                  </span>
                )}
              </div>

              <div className="min-w-0">
                <p className="text-[13px] text-[#E8ECF8] truncate">{p.title}</p>
                <p className="text-[10px] text-[#4B576D] truncate">
                  /blog/{p.slug}
                  {!p.coverAlt && p.cover ? (
                    <span className="text-[#FFB86A]"> · no alt text</span>
                  ) : null}
                </p>
              </div>

              <span className="text-[11px] text-[#68768C]">{formatDate(p.date)}</span>

              <button
                onClick={() => handleTogglePublish(p)}
                className={`text-[10px] px-2 py-1 rounded border w-fit duration-150 ${
                  p.published
                    ? "border-[#3ECF8E55] text-[#3ECF8E] hover:border-[#3ECF8E]"
                    : "border-[#FFB86A55] text-[#FFB86A] hover:border-[#FFB86A]"
                }`}
              >
                {p.published ? "published" : "draft"}
              </button>

              <div className="flex items-center gap-2 sm:justify-end">
                <a
                  href={`/blog/${p.slug}`}
                  target="_blank"
                  rel="noreferrer"
                  className="text-[10px] px-2 py-1 rounded border border-[#314158] text-[#90A1B9] hover:border-[#90A1B9] hover:text-white duration-150"
                >
                  view
                </a>
                <button
                  onClick={() => setModalState({ mode: "edit", post: p })}
                  className="text-[10px] px-2 py-1 rounded border border-[#314158] text-[#90A1B9] hover:border-[#90A1B9] hover:text-white duration-150"
                >
                  edit
                </button>
                <button
                  onClick={() => setDeleteTarget(p)}
                  className="text-[10px] px-2 py-1 rounded border border-[#FF6B6B44] text-[#FF6B6B] hover:border-[#FF6B6B] duration-150"
                >
                  delete
                </button>
              </div>
            </div>
          ))}
        </div>
      )}

      <p className="text-[10px] text-[#4B576D]">
        // covers are resized and compressed in the browser before upload; unreferenced
        images are cleaned up automatically
      </p>

      {/* On the serverless deploy the store is PER-INSTANCE and temporary, so a
          post written here disappears on the next deploy unless it ships in
          public/api/blog.json. Say so instead of letting it look permanent. */}
      {import.meta.env.PROD && (
        <p className="text-[10px] text-[#FFB86A99]">
          // heads-up: on the serverless deployment this store is temporary — posts added
          here are live immediately but reset on the next deploy. Commit them to
          public/api/blog.json (or run the self-hosted server) to keep them for good.
        </p>
      )}

      {modalState && (
        <PostFormModal
          mode={modalState.mode}
          post={modalState.post}
          busy={busy}
          authFetch={authFetch}
          onClose={() => setModalState(null)}
          onSave={handleSave}
        />
      )}

      {deleteTarget && (
        <ConfirmDialog
          title="Delete post"
          message={`Delete "${deleteTarget.title}"? Its cover image is removed too. This cannot be undone.`}
          busy={busy}
          onCancel={() => setDeleteTarget(null)}
          onConfirm={handleDelete}
        />
      )}
    </div>
  );
}
