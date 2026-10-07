import React, { useEffect, useState, useMemo } from "react";
import { Link, useParams } from "react-router-dom";
import SnakeBar from "../../../Components/SnakeBar";
import Loading from "../../../Components/Loading";
import { formatDate, isRTL, parseBlocks, readTime } from "../../../lib/blog";
import usePageSEO from "../../../Hooks/usePageSEO";

const PURPLE = "#615FFF";
const GRAY = "#90A1B9";

function Blocks({ content }) {
  const blocks = parseBlocks(content);

  return (
    <div className="flex flex-col gap-6 text-[#CBD5E1]">
      {blocks.map((b, i) => {
        const rtl = isRTL(b.text || b.alt || (b.items || []).join(" "));
        const dirProps = {
          dir: rtl ? "rtl" : "ltr",
          style: { textAlign: rtl ? "right" : "left" },
        };

        if (b.type === "h") {
          return (
            <h2
              key={i}
              id={`section-${i}`}
              {...dirProps}
              className="text-white text-[18px] sm:text-[22px] font-bold leading-8 mt-5 pb-2 border-b border-[#1E293B] flex items-center gap-2"
            >
              <span style={{ color: PURPLE }} className="select-none font-mono">
                ##
              </span>{" "}
              {b.text}
            </h2>
          );
        }

        if (b.type === "img") {
          return (
            <figure key={i} className="my-5 flex flex-col items-center">
              <div className="relative w-full rounded-xl overflow-hidden border border-[#1E293B] shadow-2xl bg-[#081224]">
                <img
                  src={b.url}
                  alt={b.alt || "Blog visual content"}
                  className="w-full max-h-[480px] object-cover"
                  loading="lazy"
                />
                {/* Tech corner accents */}
                <div className="absolute top-2.5 left-2.5 w-3.5 h-3.5 border-t-2 border-l-2" style={{ borderColor: "#615FFF" }} />
                <div className="absolute top-2.5 right-2.5 w-3.5 h-3.5 border-t-2 border-r-2" style={{ borderColor: "#615FFF" }} />
                <div className="absolute bottom-2.5 left-2.5 w-3.5 h-3.5 border-b-2 border-l-2" style={{ borderColor: "#615FFF" }} />
                <div className="absolute bottom-2.5 right-2.5 w-3.5 h-3.5 border-b-2 border-r-2" style={{ borderColor: "#615FFF" }} />
              </div>
              {(b.caption || b.alt) && (
                <figcaption className="text-[12px] text-[#90A1B9] mt-2.5 text-center italic">
                  {b.caption || b.alt}
                </figcaption>
              )}
            </figure>
          );
        }

        if (b.type === "quote") {
          return (
            <blockquote
              key={i}
              {...dirProps}
              className="border-l-4 border-[#615FFF] bg-[#615FFF12] p-4 sm:p-5 rounded-r-lg text-[14px] sm:text-[15px] italic text-[#C7C6FF] my-2 leading-relaxed"
            >
              "{b.text}"
            </blockquote>
          );
        }

        if (b.type === "ul" || b.type === "ol") {
          const Tag = b.type === "ul" ? "ul" : "ol";
          return (
            <Tag
              key={i}
              {...dirProps}
              className="flex flex-col gap-2.5 text-[14px] sm:text-[15px] leading-7 list-none my-2"
              style={{ ...dirProps.style, color: GRAY }}
            >
              {b.items.map((it, j) => (
                <li key={j} className="flex gap-3">
                  <span style={{ color: PURPLE }} className="select-none font-mono">
                    {b.type === "ul" ? "▸" : `${j + 1}.`}
                  </span>
                  <span className="flex-1">{it}</span>
                </li>
              ))}
            </Tag>
          );
        }

        return (
          <p
            key={i}
            {...dirProps}
            className="text-[14px] sm:text-[15px] leading-7 sm:leading-8"
            style={{ ...dirProps.style, color: GRAY }}
          >
            {b.text}
          </p>
        );
      })}
    </div>
  );
}

export default function BlogPost() {
  const { slug } = useParams();
  const [post, setPost] = useState(null);

  const articleSchema = useMemo(() => {
    if (!post) return null;
    return {
      "@context": "https://schema.org",
      "@type": "TechArticle",
      "headline": post.title,
      "description": post.excerpt || "",
      "image": post.cover
        ? (post.cover.startsWith("http") ? post.cover : `https://mohammad-mehdi-sadeghi.vercel.app${post.cover.startsWith("/") ? "" : "/"}${post.cover}`)
        : "https://mohammad-mehdi-sadeghi.vercel.app/og-preview.png",
      "datePublished": post.date || new Date().toISOString().slice(0, 10),
      "author": {
        "@type": "Person",
        "name": "Mohammad Mehdi Sadeghi",
        "url": "https://mohammad-mehdi-sadeghi.vercel.app"
      },
      "publisher": {
        "@type": "Person",
        "name": "Mohammad Mehdi Sadeghi",
        "url": "https://mohammad-mehdi-sadeghi.vercel.app"
      },
      "mainEntityOfPage": {
        "@type": "WebPage",
        "@id": `https://mohammad-mehdi-sadeghi.vercel.app/blog/${post.slug}`
      },
      "keywords": Array.isArray(post.tags) ? post.tags.join(", ") : "Frontend, React, Web Development"
    };
  }, [post]);

  usePageSEO({
    title: post?.title
      ? `${post.title} | Mohammad Mehdi Sadeghi`
      : "Article | Mohammad Mehdi Sadeghi Blog",
    description: post?.excerpt || "Technical article by Mohammad Mehdi Sadeghi exploring frontend architecture, JavaScript, and modern web development.",
    canonical: `https://mohammad-mehdi-sadeghi.vercel.app/blog/${slug}`,
    image: post?.cover || "/og-preview.png",
    type: "article",
    schema: articleSchema,
  });

  const [allPosts, setAllPosts] = useState([]);
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");
  const [outlineOpen, setOutlineOpen] = useState(true);
  const [otherPostsOpen, setOtherPostsOpen] = useState(true);

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const [postRes, allRes] = await Promise.all([
          fetch(`/api/blog?slug=${encodeURIComponent(slug)}`),
          fetch(`/api/blog`).catch(() => null),
        ]);
        const json = await postRes.json();
        if (!alive) return;
        if (!postRes.ok || !json.post) throw new Error(json.error || "Post not found");
        setPost(json.post);

        if (allRes && allRes.ok) {
          const allJson = await allRes.json().catch(() => ({}));
          if (alive && Array.isArray(allJson.posts)) {
            setAllPosts(allJson.posts);
          }
        }
      } catch (err) {
        if (alive) setError(err.message || "Post not found");
      } finally {
        if (alive) setLoading(false);
      }
    })();
    return () => {
      alive = false;
    };
  }, [slug]);

  const postContent = post?.content;
  const headings = useMemo(() => {
    if (!postContent) return [];
    const blocks = parseBlocks(postContent);
    return blocks
      .map((b, idx) => (b.type === "h" ? { text: b.text, id: `section-${idx}` } : null))
      .filter(Boolean);
  }, [postContent]);

  const titleRTL = isRTL(post?.title);

  return (
    <section className="bg-[#0F172B] min-h-[calc(100vh-116px)] flex flex-col md:flex-row md:h-[calc(100vh-116px)] md:overflow-hidden">
      {/* ── Left SnakeBar ── */}
      <div className="hidden lg:block relative w-14 border-r border-[#90a1b977] h-[calc(100vh-116px)]">
        <SnakeBar />
      </div>

      {/* ── Middle Sidebar (Navigation, Outline & Related Articles) ── */}
      <nav className="w-full md:w-60 lg:w-72 xl:w-[360px] 2xl:w-[457px] shrink-0 border-b md:border-b-0 md:border-r border-[#90a1b977] md:h-[calc(100vh-116px)] md:overflow-y-auto text-[#90A1B9]">
        {/* Simple User-Friendly Back button */}
        <div className="p-4 border-b border-[#90a1b977]">
          <Link
            to="/blog"
            className="inline-flex items-center justify-center gap-2 text-[13px] font-medium px-4 py-2.5 rounded-lg border border-[#314158] hover:border-[#615FFF] hover:text-white hover:bg-[#615FFF15] duration-150 text-[#90A1B9] w-full"
          >
            <svg
              className="w-4 h-4"
              viewBox="0 0 16 16"
              fill="none"
              stroke="currentColor"
              strokeWidth="2"
              strokeLinecap="round"
              strokeLinejoin="round"
            >
              <path d="M11 3L6 8l5 5" />
            </svg>
            ← Back to all articles
          </Link>
        </div>

        {/* Outline / Table of contents */}
        {headings.length > 0 && (
          <div className="border-b border-[#90a1b977]">
            <h2
              onClick={() => setOutlineOpen((prev) => !prev)}
              className="px-4 sm:px-6 py-3 w-full flex items-center justify-between text-white cursor-pointer select-none hover:bg-[#7888a011] duration-150"
            >
              <span className="flex items-center gap-2 text-[12px] font-semibold">
                <img
                  src="/assets/Images/icon folder.svg"
                  alt=""
                  className="w-3.5 h-3.5"
                />
                Table of Contents
              </span>
              <img
                className={`w-2.5 duration-200 ${outlineOpen ? "rotate-90" : "rotate-0"}`}
                src="/assets/Images/Vector.svg"
                alt=""
              />
            </h2>
            <ul className={`${outlineOpen ? "flex" : "hidden"} flex-col pb-3 gap-1 px-3`}>
              {headings.map((h, i) => (
                <li key={i}>
                  <a
                    href={`#${h.id}`}
                    className="px-3 py-1.5 rounded text-[12px] flex items-center gap-2 hover:text-white hover:bg-[#7888a01a] duration-150 truncate block"
                  >
                    <span style={{ color: PURPLE }}>#</span>
                    <span className="truncate">{h.text}</span>
                  </a>
                </li>
              ))}
            </ul>
          </div>
        )}

        {/* Other articles */}
        {allPosts.length > 1 && (
          <div className="border-b border-[#90a1b977]">
            <h2
              onClick={() => setOtherPostsOpen((prev) => !prev)}
              className="px-4 sm:px-6 py-3 w-full flex items-center justify-between text-white cursor-pointer select-none hover:bg-[#7888a011] duration-150"
            >
              <span className="flex items-center gap-2 text-[12px] font-semibold">
                <img
                  src="/assets/Images/icon folder2.svg"
                  alt=""
                  className="w-3.5 h-3.5"
                />
                More Articles
              </span>
              <img
                className={`w-2.5 duration-200 ${otherPostsOpen ? "rotate-90" : "rotate-0"}`}
                src="/assets/Images/Vector.svg"
                alt=""
              />
            </h2>
            <ul className={`${otherPostsOpen ? "flex" : "hidden"} flex-col pb-3 gap-1 px-3`}>
              {allPosts
                .filter((p) => p.slug !== slug)
                .slice(0, 6)
                .map((p) => (
                  <li key={p.id ?? p.slug}>
                    <Link
                      to={`/blog/${p.slug}`}
                      className="px-3 py-1.5 rounded text-[12px] flex items-center gap-2 hover:text-white hover:bg-[#7888a01a] duration-150 truncate"
                    >
                      <span style={{ color: PURPLE }}>•</span>
                      <span className="truncate">{p.title}</span>
                    </Link>
                  </li>
                ))}
            </ul>
          </div>
        )}

        {/* Metadata section */}
        {post && (
          <div className="p-5 text-[11px] text-[#68768C] flex flex-col gap-2">
            <p className="text-[#90A1B9] font-semibold">// Article Info</p>
            <p>Published: {formatDate(post.date)}</p>
            <p>Reading Time: {readTime(post)}</p>
            {post.tags && post.tags.length > 0 && (
              <p>Topics: {post.tags.join(", ")}</p>
            )}
          </div>
        )}
      </nav>

      {/* ── Right Content / Article Body ── */}
      <div className="flex-1 min-w-0 p-4 sm:p-6 md:p-8 lg:p-12 md:h-[calc(100vh-116px)] md:overflow-y-auto">
        {loading ? (
          <div className="max-w-3xl mx-auto">
            <Loading variant="article" />
          </div>
        ) : error ? (
          <div className="max-w-2xl mx-auto flex flex-col gap-4 py-12">
            <p className="text-[13px] rounded-md px-4 py-3 text-[#FF6B6B] bg-[#FF6B6B14] border border-[#FF6B6B33]">
              // {error}
            </p>
            <Link to="/blog" className="text-[13px] underline" style={{ color: PURPLE }}>
              ← Return to all articles
            </Link>
          </div>
        ) : (
          <article className="max-w-3xl mx-auto flex flex-col gap-6 sm:gap-8">
            {/* Header */}
            <header className="flex flex-col gap-4">
              <h1
                dir={titleRTL ? "rtl" : "ltr"}
                className="text-white text-[20px] sm:text-[26px] md:text-[30px] lg:text-[34px] font-bold leading-tight"
                style={{ textAlign: titleRTL ? "right" : "left" }}
              >
                {post.title}
              </h1>

              {/* Post meta pills */}
              <div className="flex items-center gap-3 flex-wrap text-[12px] text-[#68768C] pt-1 border-b border-[#1E293B] pb-4">
                <span className="text-[#90A1B9]">{formatDate(post.date)}</span>
                <span>·</span>
                <span>{readTime(post)}</span>
                {Array.isArray(post.tags) && post.tags.length > 0 && (
                  <>
                    <span>·</span>
                    <div className="flex gap-1.5 flex-wrap">
                      {post.tags.map((t) => (
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
                  </>
                )}
              </div>
            </header>

            {/* Main Cover Image with tech frame */}
            {post.cover && (
              <div className="relative rounded-xl overflow-hidden border border-[#1E293B] shadow-2xl">
                <img
                  src={post.cover}
                  alt={post.coverAlt || post.title}
                  className="w-full max-h-[420px] object-cover"
                />
                <div className="absolute top-2.5 left-2.5 w-4 h-4 border-t-2 border-l-2" style={{ borderColor: "#615FFF" }} />
                <div className="absolute top-2.5 right-2.5 w-4 h-4 border-t-2 border-r-2" style={{ borderColor: "#615FFF" }} />
                <div className="absolute bottom-2.5 left-2.5 w-4 h-4 border-b-2 border-l-2" style={{ borderColor: "#615FFF" }} />
                <div className="absolute bottom-2.5 right-2.5 w-4 h-4 border-b-2 border-r-2" style={{ borderColor: "#615FFF" }} />
              </div>
            )}

            {/* Post Content Blocks (Paragraphs, Headings, In-text Images, Quotes, Lists) */}
            <div className="pt-2">
              <Blocks content={post.content} />
            </div>

            {/* Bottom navigation */}
            <div className="mt-8 pt-6 border-t border-[#1E293B] flex items-center justify-between">
              <Link
                to="/blog"
                className="text-[13px] inline-flex items-center gap-2 px-4 py-2 rounded-lg
                  transition-all duration-150 border border-[#90a1b955] bg-[#0F172B]
                  hover:border-[#615FFF] hover:text-white hover:bg-[#615FFF11]"
                style={{ color: GRAY }}
              >
                ← Back to all articles
              </Link>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
