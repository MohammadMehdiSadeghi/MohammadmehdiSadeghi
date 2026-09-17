import { useEffect, useState } from "react";
import { Link, useParams } from "react-router-dom";
import Loading from "../../../Components/Loading";
import { formatDate, isRTL, parseBlocks, readTime } from "../../../lib/blog";

const PURPLE = "#615FFF";
const GRAY = "#90A1B9";

/* Post body: each block decides its own direction, so an English heading
   above a Persian paragraph renders correctly in both. */
function Blocks({ content }) {
  const blocks = parseBlocks(content);

  return (
    <div className="flex flex-col gap-5">
      {blocks.map((b, i) => {
        const rtl = isRTL(b.text || (b.items || []).join(" "));
        const dirProps = {
          dir: rtl ? "rtl" : "ltr",
          style: { textAlign: rtl ? "right" : "left" },
        };

        if (b.type === "h") {
          return (
            <h2
              key={i}
              {...dirProps}
              className="text-white text-[18px] sm:text-[20px] leading-8 mt-2 pb-2 border-b"
              style={{ ...dirProps.style, borderColor: "#1E293B" }}
            >
              <span style={{ color: PURPLE }}>##</span> {b.text}
            </h2>
          );
        }

        if (b.type === "ul" || b.type === "ol") {
          const Tag = b.type === "ul" ? "ul" : "ol";
          return (
            <Tag
              key={i}
              {...dirProps}
              className={`flex flex-col gap-2 text-[14px] leading-7 ${b.type === "ul" ? "list-none" : "list-none"}`}
              style={{ ...dirProps.style, color: GRAY }}
            >
              {b.items.map((it, j) => (
                <li key={j} className="flex gap-2.5">
                  <span style={{ color: PURPLE }} className="select-none">
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
            className="text-[14px] leading-7"
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
  const [loading, setLoading] = useState(true);
  const [error, setError] = useState("");

  useEffect(() => {
    let alive = true;
    setLoading(true);
    setError("");
    (async () => {
      try {
        const res = await fetch(`/api/blog?slug=${encodeURIComponent(slug)}`);
        const json = await res.json();
        if (!alive) return;
        if (!res.ok || !json.post) throw new Error(json.error || "Post not found");
        setPost(json.post);
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

  const titleRTL = isRTL(post?.title);

  return (
    <section className="bg-[#0F172B]" style={{ minHeight: "calc(100vh - 116px)" }}>
      <div className="max-w-[760px] mx-auto px-5 sm:px-8 py-10 sm:py-14">
        <Link
          to="/blog"
          className="inline-flex items-center gap-1.5 text-[12px] mb-8 duration-150 hover:text-white"
          style={{ color: GRAY }}
        >
          <svg
            className="w-3 h-3"
            viewBox="0 0 16 16"
            fill="none"
            stroke="currentColor"
            strokeWidth="2"
            strokeLinecap="round"
            strokeLinejoin="round"
          >
            <path d="M11 3L6 8l5 5" />
          </svg>
          back-to-blog
        </Link>

        {loading ? (
          <Loading variant="article" />
        ) : error ? (
          <div className="flex flex-col gap-4">
            <p
              className="text-[13px] rounded-md px-4 py-3"
              style={{
                color: "#FF6B6B",
                background: "#FF6B6B14",
                border: "1px solid #FF6B6B33",
              }}
            >
              // {error}
            </p>
            <Link to="/blog" className="text-[13px] underline" style={{ color: PURPLE }}>
              see all posts
            </Link>
          </div>
        ) : (
          <article className="flex flex-col gap-6">
            <header className="flex flex-col gap-3">
              <p className="text-[11px]" style={{ color: PURPLE }}>
                $ cat post.md
              </p>
              <h1
                dir={titleRTL ? "rtl" : "ltr"}
                className="text-white text-[24px] sm:text-[32px] leading-[1.5]"
                style={{ textAlign: titleRTL ? "right" : "left" }}
              >
                {post.title}
              </h1>
              <p className="text-[12px] flex items-center gap-3 flex-wrap" style={{ color: "#4B576D" }}>
                <span>{formatDate(post.date)}</span>
                <span>·</span>
                <span>{readTime(post)}</span>
                {Array.isArray(post.tags) && post.tags.length > 0 && (
                  <>
                    <span>·</span>
                    <span className="flex gap-1.5 flex-wrap">
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
                    </span>
                  </>
                )}
              </p>
            </header>

            {post.cover && (
              <img
                src={post.cover}
                alt={post.coverAlt || post.title}
                className="w-full rounded-xl border"
                style={{ borderColor: "#1E293B" }}
              />
            )}

            <div className="h-[1px] w-full" style={{ background: "#1E293B" }} />

            <Blocks content={post.content} />

            <div className="mt-6 pt-6 border-t" style={{ borderColor: "#1E293B" }}>
              <Link
                to="/blog"
                className="text-[13px] inline-flex items-center gap-1.5 px-4 py-2 rounded-lg
                  transition-all duration-150 border border-[#90a1b955] bg-[#0F172B]
                  hover:border-[#615FFF] hover:text-white hover:bg-[#615FFF11]"
                style={{ color: GRAY }}
              >
                ← all-posts
              </Link>
            </div>
          </article>
        )}
      </div>
    </section>
  );
}
