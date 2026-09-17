import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SnakeBar from "../../Components/SnakeBar";
import Loading from "../../Components/Loading";
import useClickTrack from "../../Hooks/useClickTrack";
import { excerptFrom, formatDate, isRTL, readTime } from "../../lib/blog";

const PURPLE = "#615FFF";
const GRAY = "#90A1B9";

function CheckMark() {
  return (
    <svg
      width="10"
      height="8"
      viewBox="0 0 10 8"
      fill="none"
      xmlns="http://www.w3.org/2000/svg"
    >
      <path
        d="M1 4L3.5 6.5L9 1"
        stroke="white"
        strokeWidth="1.5"
        strokeLinecap="round"
        strokeLinejoin="round"
      />
    </svg>
  );
}

function PostCover({ post, height = 160 }) {
  const initials = String(post.title || "?")
    .trim()
    .split(/\s+/)
    .slice(0, 2)
    .map((w) => w[0])
    .join("")
    .toUpperCase();

  return (
    <div
      className="relative w-full overflow-hidden rounded-t-xl"
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
          className="absolute inset-0 w-full h-full object-cover transition-transform duration-300 group-hover:scale-105"
        />
      ) : (
        <>
          <div className="absolute inset-0 flex items-center justify-center pointer-events-none">
            <span
              className="text-[96px] font-bold select-none leading-none"
              style={{ color: PURPLE, opacity: 0.08 }}
            >
              {initials}
            </span>
          </div>
          <div className="absolute inset-0 flex items-center justify-center">
            <div
              className="w-10 h-10 rounded-xl flex items-center justify-center shadow-lg"
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

      {/* corner brackets */}
      <div className="absolute top-2 left-2 w-3 h-3 border-t-2 border-l-2" style={{ borderColor: "#615FFF66", opacity: 0.7 }} />
      <div className="absolute top-2 right-2 w-3 h-3 border-t-2 border-r-2" style={{ borderColor: "#615FFF66", opacity: 0.7 }} />
      <div className="absolute bottom-2 left-2 w-3 h-3 border-b-2 border-l-2" style={{ borderColor: "#615FFF66", opacity: 0.7 }} />
      <div className="absolute bottom-2 right-2 w-3 h-3 border-b-2 border-r-2" style={{ borderColor: "#615FFF66", opacity: 0.7 }} />
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
        <div className="flex items-center justify-between text-[11px]">
          <p style={{ color: PURPLE }}>
            Post {String(index + 1).padStart(2, "0")} //{" "}
            <span style={{ color: GRAY }}>{formatDate(post.date)}</span>
          </p>
          <span style={{ color: "#4B576D" }}>{readTime(post)}</span>
        </div>

        <h3
          dir={rtl ? "rtl" : "ltr"}
          className="text-white text-[16px] sm:text-[17px] font-semibold leading-7 group-hover:text-[#C7C6FF] transition-colors duration-200 line-clamp-2"
          style={rtl ? { textAlign: "right" } : undefined}
        >
          {post.title}
        </h3>

        <p
          dir={rtl ? "rtl" : "ltr"}
          className="text-[12px] sm:text-[13px] leading-6 line-clamp-3"
          style={{ color: GRAY, textAlign: rtl ? "right" : undefined }}
        >
          {excerptFrom(post)}
        </p>

        {Array.isArray(post.tags) && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {post.tags.slice(0, 3).map((t) => (
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

        <div className="mt-auto pt-3 border-t border-[#1E293B] flex items-center justify-between gap-3">
          <Link
            to={`/blog/${post.slug}`}
            className="text-[12px] inline-flex items-center gap-1.5 px-3.5 py-1.5 rounded-lg
              transition-all duration-150 border border-[#90a1b955] bg-[#0F172B]
              hover:border-[#615FFF] hover:text-white hover:bg-[#615FFF11]"
            style={{ color: GRAY }}
            onClick={withTracking({
              targetType: "button",
              targetId: `blog-${post.slug}`,
              targetLabel: post.title,
            })}
          >
            read-post
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
          <span className="text-[11px] text-[#4B576D]">
            Read Full Article →
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
  const [searchQuery, setSearchQuery] = useState("");
  const [categoriesOpen, setCategoriesOpen] = useState(true);
  const [recentOpen, setRecentOpen] = useState(true);

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
    for (const p of posts) {
      for (const t of p.tags || []) seen.add(t);
    }
    return ["all", ...Array.from(seen)];
  }, [posts]);

  const tagCounts = useMemo(() => {
    const counts = { all: posts.length };
    for (const p of posts) {
      for (const t of p.tags || []) {
        counts[t] = (counts[t] || 0) + 1;
      }
    }
    return counts;
  }, [posts]);

  const visible = useMemo(() => {
    return posts.filter((p) => {
      const matchTag =
        activeTag === "all" || (p.tags || []).includes(activeTag);
      const q = searchQuery.trim().toLowerCase();
      const matchSearch =
        !q ||
        (p.title || "").toLowerCase().includes(q) ||
        (p.excerpt || "").toLowerCase().includes(q) ||
        (p.tags || []).some((t) => t.toLowerCase().includes(q));
      return matchTag && matchSearch;
    });
  }, [posts, activeTag, searchQuery]);

  return (
    <section className="bg-[#0F172B] min-h-[calc(100vh-116px)] flex flex-col md:flex-row md:h-[calc(100vh-116px)] md:overflow-hidden">
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Left SnakeBar ── */}
      <div className="hidden md:block relative w-14 border-r border-[#90a1b977] h-[calc(100vh-116px)]">
        <SnakeBar />
      </div>

      {/* ── Sidebar: Categories & Recent Explorer ── */}
      <nav className="w-full md:w-[380px] lg:w-[420px] shrink-0 border-b md:border-b-0 md:border-r border-[#90a1b977] md:h-[calc(100vh-116px)] md:overflow-y-auto text-[#90A1B9]">
        {/* Search input */}
        <div className="p-4 border-b border-[#90a1b977]">
          <div className="relative">
            <input
              type="text"
              placeholder="Search posts or tags..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#020618] py-2 pl-8 pr-3 text-[12px] text-[#90a1b9c7] rounded-md border border-[#314158] outline-none hover:border-[#90A1B9] focus:border-[#615FFF] duration-150"
            />
            <svg
              className="w-3.5 h-3.5 absolute left-2.5 top-3 text-[#68768C]"
              fill="none"
              stroke="currentColor"
              viewBox="0 0 24 24"
            >
              <path
                strokeLinecap="round"
                strokeLinejoin="round"
                strokeWidth="2"
                d="M21 21l-6-6m2-5a7 7 0 11-14 0 7 7 0 0114 0z"
              />
            </svg>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="absolute right-2.5 top-2.5 text-[#68768C] hover:text-white text-[12px]"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Categories / Tags accordion */}
        <div className="border-b border-[#90a1b977]">
          <h2
            onClick={() => setCategoriesOpen((prev) => !prev)}
            className="px-4 sm:px-6 py-3.5 w-full flex items-center justify-between text-white cursor-pointer select-none hover:bg-[#7888a011] duration-150"
          >
            <span className="flex items-center gap-2 text-[13px]">
              <img
                src="/assets/Images/icon folder.svg"
                alt=""
                className="w-4 h-4"
              />
              categories
            </span>
            <img
              className={`w-3 duration-200 ${categoriesOpen ? "rotate-90" : "rotate-0"}`}
              src="/assets/Images/Vector.svg"
              alt=""
            />
          </h2>
          <ul className={`${categoriesOpen ? "flex" : "hidden"} flex-col pb-2`}>
            {tags.map((t) => {
              const isActive = activeTag === t;
              return (
                <li
                  key={t}
                  onClick={() => setActiveTag(t)}
                  className={`px-6 sm:px-10 py-2.5 cursor-pointer flex items-center justify-between duration-100 ${
                    isActive ? "bg-[#7888a033] text-white" : "text-[#90A1B9] hover:bg-[#7888a01a]"
                  }`}
                >
                  <div className="flex items-center gap-2.5">
                    <span
                      className={`w-3.5 h-3.5 rounded-sm border flex items-center justify-center shrink-0 duration-150 ${
                        isActive
                          ? "bg-[#615FFF] border-[#615FFF]"
                          : "border-[#90a1b966]"
                      }`}
                    >
                      {isActive && <CheckMark />}
                    </span>
                    <span className="text-[12px]">{t === "all" ? "all-posts" : t}</span>
                  </div>
                  <span className="text-[10px] px-1.5 py-0.5 rounded bg-[#0b1220] border border-[#314158] text-[#68768C]">
                    {tagCounts[t] || 0}
                  </span>
                </li>
              );
            })}
          </ul>
        </div>

        {/* Recent Posts file list */}
        <div className="border-b border-[#90a1b977]">
          <h2
            onClick={() => setRecentOpen((prev) => !prev)}
            className="px-4 sm:px-6 py-3.5 w-full flex items-center justify-between text-white cursor-pointer select-none hover:bg-[#7888a011] duration-150"
          >
            <span className="flex items-center gap-2 text-[13px]">
              <img
                src="/assets/Images/icon folder2.svg"
                alt=""
                className="w-4 h-4"
              />
              recent-posts
            </span>
            <img
              className={`w-3 duration-200 ${recentOpen ? "rotate-90" : "rotate-0"}`}
              src="/assets/Images/Vector.svg"
              alt=""
            />
          </h2>
          <ul className={`${recentOpen ? "flex" : "hidden"} flex-col pb-3`}>
            {posts.slice(0, 5).map((p) => (
              <li key={p.id ?? p.slug}>
                <Link
                  to={`/blog/${p.slug}`}
                  className="px-6 sm:px-10 py-2 flex items-center gap-2 text-[12px] text-[#90A1B9] hover:text-white hover:bg-[#7888a01a] duration-150 truncate"
                >
                  <span style={{ color: PURPLE }}>#</span>
                  <span className="truncate">{p.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Author info note */}
        <div className="p-5 text-[11px] text-[#68768C] leading-5">
          <p className="text-[#90A1B9] mb-1">// articles & notes</p>
          <p>Read about front-end experiments, architecture, and web development.</p>
        </div>
      </nav>

      {/* ── Main Content Pane ── */}
      <div className="flex-1 min-w-0 p-5 sm:p-8 md:p-10 md:h-[calc(100vh-116px)] md:overflow-y-auto">
        {/* Header prompt */}
          <div className="flex flex-col gap-2 mb-8">
            <p className="text-[12px] font-medium" style={{ color: PURPLE }}>
              // {activeTag === "all" ? "All Articles" : `Topic: ${activeTag}`}
            </p>
            <h1 className="text-white text-[22px] sm:text-[28px] font-bold">
              _Blog
              <span
                className="inline-block w-[8px] h-[16px] align-middle ml-2"
                style={{
                  background: "#FFB86A",
                  animation: "bootBlink 1s steps(1) infinite",
                }}
              />
            </h1>
            <p className="text-[13px]" style={{ color: GRAY }}>
              Thoughts on modern front-end, UI craftsmanship, and technical lessons.
              {posts.length > 0 && (
                <span className="text-[#4B576D]">
                  {"  "}// {visible.length} {visible.length === 1 ? "article" : "articles"} found
                </span>
              )}
            </p>
          </div>

          {/* Grid of articles */}
          {loading ? (
            <Loading variant="cards" count={4} />
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
              // no articles matching your filter
            </div>
          ) : (
            <div className="grid grid-cols-1 md:grid-cols-2 xl:grid-cols-3 gap-5 sm:gap-6">
              {visible.map((post, i) => (
                <PostCard key={post.id ?? post.slug} post={post} index={i} />
              ))}
            </div>
          )}
      </div>
    </section>
  );
}
