import { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import Loading from "../../Components/Loading";
import useClickTrack from "../../Hooks/useClickTrack";
import { excerptFrom, formatDate, isRTL, readTime } from "../../lib/blog";

const PURPLE = "#615FFF";
const GRAY = "#90A1B9";

/* A poster-style cover: the post's real image when it has one, otherwise a
   generated typographic card matching the site's logotype language. */
function PostCover({ post, height = 170 }) {
  const initials = String(post.title || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className="relative w-full overflow-hidden rounded-xl"
      style={{ height, background: "#0a1628" }}
    >
      <div
        className="absolute top-0 left-0 right-0 h-[2px]"
        style={{
          background:
            "linear-gradient(90deg, transparent 0%, #615FFF 30%, #7C6CF6 70%, transparent 100%)",
          opacity: 0.5,
        }}
      />
      <div
        className="absolute inset-0"
        style={{
          backgroundImage:
            "linear-gradient(rgba(144,161,185,0.07) 1px, transparent 1px), linear-gradient(90deg, rgba(144,161,185,0.07) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      />

      {post.cover ? (
        <img
          src={post.cover}
          alt={post.coverAlt || post.title || ""}
          loading="lazy"
          className="absolute inset-0 w-full h-full object-cover"
        />
      ) : (
        <>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span
              className="text-[110px] font-bold select-none leading-none"
              style={{ color: PURPLE, opacity: 0.07 }}
            >
              {initials}
            </span>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-11 h-11 rounded-xl flex items-center justify-center shadow-lg"
              style={{
                background: "linear-gradient(135deg, #615FFF 0%, #7C6CF6 100%)",
                boxShadow: "0 6px 24px rgba(97,95,255,0.4)",
              }}
            >
              <span className="text-white font-bold text-[13px] leading-none tracking-tight">
                {initials}
              </span>
            </div>
          </div>
        </>
      )}

      {/* corner brackets — same framing as the project cards */}
      <div className="absolute top-2.5 left-2.5 w-3.5 h-3.5 border-t-2 border-l-2" style={{ borderColor: "#615FFF66", opacity: 0.7 }} />
      <div className="absolute top-2.5 right-2.5 w-3.5 h-3.5 border-t-2 border-r-2" style={{ borderColor: "#615FFF66", opacity: 0.7 }} />
      <div className="absolute bottom-2.5 left-2.5 w-3.5 h-3.5 border-b-2 border-l-2" style={{ borderColor: "#615FFF66", opacity: 0.7 }} />
      <div className="absolute bottom-2.5 right-2.5 w-3.5 h-3.5 border-b-2 border-r-2" style={{ borderColor: "#615FFF66", opacity: 0.7 }} />
    </div>
  );
}

function PostCard({ post, index }) {
  const { withTracking } = useClickTrack();
  const rtl = isRTL(post.title) || isRTL(post.excerpt);

  return (
    <article
      className="rounded-xl group overflow-hidden flex flex-col transition-all duration-300
        border border-[#90a1b933] hover:border-[#615FFF] hover:-translate-y-1
        hover:shadow-[0_0_35px_-5px_rgba(97,95,255,0.25)]"
      style={{
        background: "#081224",
        opacity: 0,
        animation: `fadeSlideUp 0.4s ease ${Math.min(index, 8) * 60}ms forwards`,
      }}
    >
      <PostCover post={post} />
      <div className="p-5 flex flex-col gap-3 flex-1">
        <p className="text-[11px]" style={{ color: PURPLE }}>
          Post {String(index + 1).padStart(2, "0")} //{" "}
          <span style={{ color: GRAY }}>{formatDate(post.date)}</span>
        </p>

        <h3
          dir={rtl ? "rtl" : "ltr"}
          className="text-white text-[17px] leading-7 group-hover:text-[#C7C6FF] transition-colors duration-200"
          style={rtl ? { textAlign: "right" } : undefined}
        >
          {post.title}
        </h3>

        <p
          dir={rtl ? "rtl" : "ltr"}
          className="text-[13px] leading-6 line-clamp-3"
          style={{ color: GRAY, textAlign: rtl ? "right" : undefined }}
        >
          {excerptFrom(post)}
        </p>

        {Array.isArray(post.tags) && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5">
            {post.tags.slice(0, 4).map((t) => (
              <span
                key={t}
                className="text-[9px] px-2 py-0.5 rounded-full uppercase tracking-wide"
                style={{
                  color: GRAY,
                  background: "rgba(97,95,255,0.12)",
                  border: "1px solid rgba(97,95,255,0.3)",
                }}
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-2 flex items-center justify-between gap-3">
          <Link
            to={`/blog/${post.slug}`}
            className="text-[13px] inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg
              transition-all duration-150 border border-[#90a1b955] bg-[#0F172B]
              hover:border-[#615FFF] hover:text-white hover:bg-[#615FFF11]"
            style={{ color: GRAY }}
            onClick={withTracking({
              targetType: "button",
              targetId: `blog-${post.slug}`,
              targetLabel: post.title,
            })}
          >
            read-more
            <svg
              className="w-3 h-3"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M5 3l5 5-5 5" />
            </svg>
          </Link>
          <span className="text-[11px]" style={{ color: "#4B576D" }}>
            {readTime(post)}
          </span>
        </div>
      </div>
    </article>
  );
}

export default function Blog() {
  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [activeTag, setActiveTag] = useState("all");

  useEffect(() => {
    let alive = true;
    (async () => {
      try {
        const res = await fetch("/api/blog");
        const json = await res.json();
        if (!alive) return;
        if (!res.ok) throw new Error(json.error || "Failed to load posts");
        setPosts(json.posts || []);
      } catch (err) {
        if (alive) setError(err.message || "Failed to load posts");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, []);

  const tags = useMemo(() => {
    const seen = new Set();
    for (const p of posts) for (const t of p.tags || []) seen.add(t);
    return ["all", ...seen];
  }, [posts]);

  const visible = useMemo(
    () => (activeTag === "all" ? posts : posts.filter((p) => (p.tags || []).includes(activeTag))),
    [posts, activeTag],
  );

  return (
    <section
      className="bg-[#0F172B] min-h-[calc(100vh-116px)]"
      style={{ minHeight: "calc(100vh - 116px)" }}
    >
      {/* cards animate from opacity:0 — the keyframe must exist on THIS page too
          (ProjectSection declares its own copy; <style> tags are page-local) */}
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>
      <div className="max-w-[1200px] mx-auto px-5 sm:px-8 py-10 sm:py-14">
        {/* ── header ── */}
        <div className="flex flex-col gap-3 mb-8">
          <p className="text-[12px]" style={{ color: PURPLE }}>
            $ ls ./blog
          </p>
          <h1 className="text-white text-[24px] sm:text-[30px] leading-9">
            _Blog
            <span className="inline-block w-[9px] h-[18px] align-middle ml-2" style={{ background: "#FFB86A", animation: "bootBlink 1s steps(1) infinite" }} />
          </h1>
          <p className="text-[13px]" style={{ color: GRAY }}>
            Notes on what I build, what I break, and what I learn along the way.
            {posts.length > 0 && (
              <span style={{ color: "#4B576D" }}>
                {"  "}// {posts.length} {posts.length === 1 ? "post" : "posts"}
              </span>
            )}
          </p>
        </div>

        {/* ── tag filter ── */}
        {tags.length > 1 && (
          <div className="flex flex-wrap gap-1.5 mb-8">
            {tags.map((t) => (
              <button
                key={t}
                type="button"
                onClick={() => setActiveTag(t)}
                className={`text-[11px] px-3 py-1.5 rounded-md border duration-150 ${
                  activeTag === t
                    ? "border-[#615FFF] bg-[#615FFF22] text-white"
                    : "border-[#1E293B] text-[#68768C] hover:text-white hover:border-[#314158]"
                }`}
              >
                {t === "all" ? "all-posts" : t}
              </button>
            ))}
          </div>
        )}

        {/* ── body ── */}
        {loading ? (
          <Loading />
        ) : error ? (
          <p
            className="text-[12px] rounded-md px-4 py-3 w-fit"
            style={{
              color: "#FF6B6B",
              background: "#FF6B6B14",
              border: "1px solid #FF6B6B33",
            }}
          >
            // {error}
          </p>
        ) : visible.length === 0 ? (
          <div
            className="rounded-xl border border-dashed px-6 py-16 text-center text-[13px]"
            style={{ borderColor: "#1E293B", color: "#68768C" }}
          >
            // no posts yet — the first one is being written
          </div>
        ) : (
          <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5">
            {visible.map((post, i) => (
              <PostCard key={post.id ?? post.slug} post={post} index={i} />
            ))}
          </div>
        )}
      </div>
    </section>
  );
}
