import React, { useEffect, useMemo, useState } from "react";
import { Link } from "react-router-dom";
import SnakeBar from "../../Components/SnakeBar";
import Loading from "../../Components/Loading";
import useClickTrack from "../../Hooks/useClickTrack";
import usePageSEO from "../../Hooks/usePageSEO";
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

/* Modern Editorial / Magazine Thumbnail (Distinct from Project Cards) */
function PostCover({ post, height = 180 }) {
  const rtl = isRTL(post.title);

  return (
    <div
      className="relative w-full overflow-hidden rounded-t-xl"
      style={{ height, background: "linear-gradient(180deg, #0d192e 0%, #08101e 100%)" }}
    >
      {post.cover ? (
        <>
          <img
            src={post.cover}
            alt={post.coverAlt || post.title || "Article cover"}
            loading="lazy"
            className="absolute inset-0 w-full h-full object-cover transition-transform duration-500 group-hover:scale-105"
          />
          {/* Subtle dark gradient overlay for legibility */}
          <div className="absolute inset-0 bg-gradient-to-t from-[#081224] via-transparent to-transparent opacity-80" />
        </>
      ) : (
        /* Editorial Typography Pattern Cover */
        <div className="absolute inset-0 p-5 flex flex-col justify-between overflow-hidden">
          {/* Background ambient lighting */}
          <div
            className="absolute -top-10 -right-10 w-44 h-44 rounded-full blur-2xl pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(97,95,255,0.25) 0%, transparent 70%)" }}
          />
          <div
            className="absolute -bottom-10 -left-10 w-44 h-44 rounded-full blur-2xl pointer-events-none"
            style={{ background: "radial-gradient(circle, rgba(0,213,190,0.18) 0%, transparent 70%)" }}
          />

          {/* Top header badge */}
          <div className="relative z-10 flex items-center justify-between">
            <span className="text-[10px] font-mono uppercase tracking-widest px-2.5 py-0.5 rounded-full bg-[#615FFF]/20 text-[#A5B4FC] border border-[#615FFF]/30 backdrop-blur-sm">
              Article
            </span>
            <div className="flex items-center gap-1.5 opacity-60">
              <span className="w-1.5 h-1.5 rounded-full bg-[#615FFF]" />
              <span className="w-1.5 h-1.5 rounded-full bg-[#00D5BE]" />
            </div>
          </div>

          {/* Center Graphic Symbol */}
          <div className="relative z-10 flex items-center gap-3 self-center my-auto">
            <div className="w-12 h-12 rounded-2xl bg-[#0F172B]/80 border border-[#314158] flex items-center justify-center text-white shadow-xl group-hover:border-[#615FFF] duration-300">
              <svg
                className="w-6 h-6 text-[#615FFF] group-hover:text-[#00D5BE] transition-colors duration-300"
                fill="none"
                stroke="currentColor"
                strokeWidth="1.75"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  d="M12 6.042A8.967 8.967 0 006 3.75c-1.052 0-2.062.18-3 .512v14.25A8.987 8.987 0 016 18c2.305 0 4.408.867 6 2.292m0-14.25a8.966 8.966 0 016-2.292c1.052 0 2.062.18 3 .512v14.25A8.987 8.987 0 0018 18a8.967 8.967 0 00-6 2.292m0-14.25v14.25"
                />
              </svg>
            </div>
          </div>

          {/* Bottom reading info */}
          <div className="relative z-10 flex items-center justify-between text-[11px] text-[#90A1B9]">
            <span className="font-medium text-[#E2E8F0] truncate max-w-[180px]">
              {post.tags?.[0] ? `#${post.tags[0]}` : "Mohammad Mehdi Sadeghi"}
            </span>
            <span className="text-[10px] text-[#68768C]">{readTime(post)}</span>
          </div>
        </div>
      )}

      {/* Top neon indicator line */}
      <div
        className="absolute top-0 inset-x-0 h-[2px] transition-opacity duration-300 group-hover:opacity-100 opacity-40"
        style={{
          background: "linear-gradient(90deg, #615FFF 0%, #00D5BE 100%)",
        }}
      />
    </div>
  );
}

function PostCard({ post, index }) {
  const { withTracking } = useClickTrack();
  const rtl = isRTL(post.title) || isRTL(post.excerpt);

  return (
    <article
      className="rounded-xl group overflow-hidden flex flex-col transition-all duration-300
        border border-[#1E293B] hover:border-[#615FFF] hover:-translate-y-1.5
        hover:shadow-[0_12px_30px_-5px_rgba(97,95,255,0.2)] bg-[#081224]"
      style={{
        opacity: 0,
        animation: `fadeSlideUp 0.4s ease ${Math.min(index, 8) * 60}ms forwards`,
      }}
    >
      <PostCover post={post} />
      <div className="p-5 flex flex-col gap-3 flex-1">
        <div className="flex items-center justify-between text-[11px] text-[#68768C]">
          <span className="text-[#90A1B9]">{formatDate(post.date)}</span>
          <span className="text-[#615FFF] font-medium">{readTime(post)}</span>
        </div>

        <h3
          dir={rtl ? "rtl" : "ltr"}
          className="text-white text-[16px] leading-6 group-hover:text-[#C7C6FF] transition-colors duration-200 line-clamp-2"
          style={rtl ? { textAlign: "right" } : undefined}
        >
          {post.title}
        </h3>

        <p
          dir={rtl ? "rtl" : "ltr"}
          className="text-[13px] leading-6 line-clamp-3 text-[#90A1B9]"
          style={rtl ? { textAlign: "right" } : undefined}
        >
          {excerptFrom(post)}
        </p>

        {Array.isArray(post.tags) && post.tags.length > 0 && (
          <div className="flex flex-wrap gap-1.5 mt-1">
            {post.tags.slice(0, 3).map((t) => (
              <span
                key={t}
                className="text-[10px] px-2.5 py-0.5 rounded-full uppercase tracking-wide text-[#90A1B9] bg-[#0F172B] border border-[#314158]"
              >
                {t}
              </span>
            ))}
          </div>
        )}

        <div className="mt-auto pt-4 border-t border-[#1E293B] flex items-center justify-between gap-3">
          <Link
            to={`/blog/${post.slug}`}
            className="text-[13px] inline-flex items-center gap-1.5 px-4 py-1.5 rounded-lg
              transition-all duration-150 border border-[#90a1b955] bg-[#0F172B] text-[#90A1B9]
              hover:border-[#615FFF] hover:text-white hover:bg-[#615FFF11]"
            onClick={withTracking({
              targetType: "button",
              targetId: `blog-${post.slug}`,
              targetLabel: post.title,
            })}
          >
            view-article
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
            {post.views ? `${post.views} views` : ""}
          </span>
        </div>
      </div>
    </article>
  );
}

export default function Blog() {
  usePageSEO({
    title: "Blog & Engineering Insights | Mohammad Mehdi Sadeghi",
    description: "Read frontend development insights, React architectural patterns, developer tips, and case studies by Mohammad Mehdi Sadeghi.",
  });

  const [posts, setPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [filterMode, setFilterMode] = useState("latest"); // "latest" | "popular"
  const [searchQuery, setSearchQuery] = useState("");
  const [filterOpen, setFilterOpen] = useState(true);
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

  const visible = useMemo(() => {
    let list = [...posts];

    // Search query filter
    const q = searchQuery.trim().toLowerCase();
    if (q) {
      list = list.filter(
        (p) =>
          (p.title || "").toLowerCase().includes(q) ||
          (p.excerpt || "").toLowerCase().includes(q) ||
          (p.tags || []).some((t) => t.toLowerCase().includes(q)),
      );
    }

    // Sort by Latest vs Popular
    if (filterMode === "latest") {
      list.sort((a, b) => new Date(b.date || 0) - new Date(a.date || 0));
    } else if (filterMode === "popular") {
      list.sort((a, b) => (b.views || b.id || 0) - (a.views || a.id || 0));
    }

    return list;
  }, [posts, filterMode, searchQuery]);

  return (
    <section className="bg-[#0F172B] min-h-[calc(100vh-116px)] flex flex-col lg:flex-row lg:h-[calc(100vh-116px)] lg:overflow-hidden">
      <style>{`
        @keyframes fadeSlideUp {
          from { opacity: 0; transform: translateY(12px); }
          to   { opacity: 1; transform: translateY(0); }
        }
      `}</style>

      {/* ── Left SnakeBar ── */}
      <div className="hidden lg:block relative w-14 border-r border-[#90a1b977] h-[calc(100vh-116px)]">
        <SnakeBar />
      </div>

      {/* ── Sidebar: Filters (Latest / Popular) & Recent Explorer ── */}
      <nav className="w-full lg:w-[400px] xl:w-[457px] shrink-0 border-b lg:border-b-0 lg:border-r border-[#90a1b977] lg:h-[calc(100vh-116px)] lg:overflow-y-auto text-[#90A1B9]">
        {/* Search input */}
        <div className="p-4 border-b border-[#90a1b977]">
          <div className="relative">
            <input
              type="text"
              placeholder="Search articles..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
              className="w-full bg-[#020618] py-2.5 pl-8 pr-3 text-[12px] text-[#90a1b9c7] rounded-md border border-[#314158] outline-none hover:border-[#90A1B9] focus:border-[#615FFF] duration-150"
            />
            <svg
              className="w-3.5 h-3.5 absolute left-2.5 top-3.5 text-[#68768C]"
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
                className="absolute right-2.5 top-3 text-[#68768C] hover:text-white text-[12px]"
              >
                ×
              </button>
            )}
          </div>
        </div>

        {/* Filters Accordion: Only Latest & Most Popular */}
        <div className="border-b border-[#90a1b977]">
          <h2
            onClick={() => setFilterOpen((prev) => !prev)}
            className="px-4 sm:px-7 py-3.5 w-full flex items-center justify-between text-white cursor-pointer select-none hover:bg-[#7888a011] duration-150"
          >
            <span className="flex items-center gap-2.5 text-[14px]">
              <img
                src="/assets/Images/icon folder.svg"
                alt=""
                className="w-4 h-4"
              />
              filters
            </span>
            <img
              className={`w-3 duration-200 ${filterOpen ? "rotate-90" : "rotate-0"}`}
              src="/assets/Images/Vector.svg"
              alt=""
            />
          </h2>
          <ul className={`${filterOpen ? "flex" : "hidden"} flex-col pb-2`}>
            {/* Option 1: Latest */}
            <li
              onClick={() => setFilterMode("latest")}
              className={`px-4 sm:px-12 py-3 cursor-pointer flex items-center justify-between duration-100 ${
                filterMode === "latest"
                  ? "bg-[#7888a033] text-white"
                  : "text-[#90A1B9] hover:bg-[#7888a01a]"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 duration-150 ${
                    filterMode === "latest"
                      ? "bg-[#615FFF] border-[#615FFF]"
                      : "border-[#90a1b966]"
                  }`}
                >
                  {filterMode === "latest" && <CheckMark />}
                </span>
                <span className="text-[13px]">latest-articles</span>
              </div>
            </li>

            {/* Option 2: Most Popular */}
            <li
              onClick={() => setFilterMode("popular")}
              className={`px-4 sm:px-12 py-3 cursor-pointer flex items-center justify-between duration-100 ${
                filterMode === "popular"
                  ? "bg-[#7888a033] text-white"
                  : "text-[#90A1B9] hover:bg-[#7888a01a]"
              }`}
            >
              <div className="flex items-center gap-3">
                <span
                  className={`w-4 h-4 rounded-sm border flex items-center justify-center shrink-0 duration-150 ${
                    filterMode === "popular"
                      ? "bg-[#615FFF] border-[#615FFF]"
                      : "border-[#90a1b966]"
                  }`}
                >
                  {filterMode === "popular" && <CheckMark />}
                </span>
                <span className="text-[13px]">popular-articles</span>
              </div>
            </li>
          </ul>
        </div>

        {/* Recent Posts file list */}
        <div className="border-b border-[#90a1b977]">
          <h2
            onClick={() => setRecentOpen((prev) => !prev)}
            className="px-4 sm:px-7 py-3.5 w-full flex items-center justify-between text-white cursor-pointer select-none hover:bg-[#7888a011] duration-150"
          >
            <span className="flex items-center gap-2.5 text-[14px]">
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
            {posts.slice(0, 8).map((p) => (
              <li key={p.id ?? p.slug}>
                <Link
                  to={`/blog/${p.slug}`}
                  className="px-4 sm:px-12 py-2.5 flex items-center gap-2.5 text-[13px] text-[#90A1B9] hover:text-white hover:bg-[#7888a01a] duration-150 truncate"
                >
                  <span style={{ color: PURPLE }}>•</span>
                  <span className="truncate">{p.title}</span>
                </Link>
              </li>
            ))}
          </ul>
        </div>

        {/* Information note */}
        <div className="p-6 text-[12px] text-[#68768C] leading-5">
          <p className="text-[#90A1B9] mb-1">// articles &amp; insights</p>
          <p>Technical writing on web development, UI engineering, and modern frontend tools.</p>
        </div>
      </nav>

      {/* ── Main Content Pane ── */}
      <div className="flex-1 min-w-0 py-6 sm:py-8 px-4 sm:px-6 lg:px-10 lg:h-[calc(100vh-116px)] lg:overflow-y-auto">
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
            className="rounded-xl border border-dashed px-6 py-16 text-center text-[13px] flex flex-col items-center gap-3"
            style={{ borderColor: "#1E293B", color: "#68768C" }}
          >
            <p className="text-[15px] text-white">No articles matching "{searchQuery}"</p>
            <p className="text-[12px] text-[#90A1B9]">
              Try searching for different keywords, topics, or clear the search.
            </p>
            {searchQuery && (
              <button
                onClick={() => setSearchQuery("")}
                className="mt-2 text-[12px] px-4 py-2 rounded-lg bg-[#615FFF] text-white hover:bg-[#4F46E5] duration-150 font-medium"
              >
                Clear Search
              </button>
            )}
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
