import React from "react";

/* ════════════════════════════════════════════════════════════════════
   In-page loading placeholders.

   The old version was three cream dots (#FFB86A) centred in a fixed 160px
   box — the same generic glyph as everywhere else on the internet, and a
   colour that matches nothing in the palette. It also reserved a constant
   height regardless of what it was standing in for, so the layout jumped
   when the real content arrived.

   These are skeletons instead: each one mimics the SHAPE of the thing that
   is loading, in the card language the site already uses (card surface,
   `#90a1b9` border, 22px grid, purple accent). Because the silhouette
   matches the final content, the swap doesn't move the page.

   All three are the same component with a variant, so a change here lands
   everywhere at once — the project grid, the blog list, and a single post.
   ════════════════════════════════════════════════════════════════════ */

const CARD_BG = "#081224";
const BORDER = "#90a1b933";
const PURPLE = "#615FFF";

/* one shimmer block; `w`/`h` are CSS sizes so callers can shape anything */
function Bar({ w = "100%", h = 10, r = 4, delay = 0, style }) {
  return (
    <span
      className="skeleton-bar block shrink-0"
      style={{
        width: w,
        height: h,
        borderRadius: r,
        animationDelay: `${delay}ms`,
        ...style,
      }}
    />
  );
}

/* the poster-card silhouette used by both the project grid and the blog list */
function PosterSkeleton({ delay = 0, lines = 2 }) {
  return (
    <div
      className="flex flex-col overflow-hidden"
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
        borderRadius: 12,
      }}
    >
      {/* the "preview" area, matching ProjectCard/blog card proportions */}
      <div
        className="relative flex items-center justify-center"
        style={{
          height: 132,
          borderBottom: `1px solid ${BORDER}`,
          backgroundImage:
            "linear-gradient(to right, rgba(144,161,185,0.05) 1px, transparent 1px), linear-gradient(to bottom, rgba(144,161,185,0.05) 1px, transparent 1px)",
          backgroundSize: "22px 22px",
        }}
      >
        {/* the 2px accent line the real cards carry on top */}
        <span
          style={{
            position: "absolute",
            top: 0,
            left: 0,
            right: 0,
            height: 2,
            background: `linear-gradient(90deg, transparent, ${PURPLE}66, transparent)`,
          }}
        />
        <Bar w={38} h={38} r={10} delay={delay} style={{ opacity: 0.5 }} />
      </div>

      {/* body: a title line, then thinner description lines */}
      <div className="flex flex-col gap-2 p-4">
        <Bar w="70%" h={12} delay={delay + 60} />
        {Array.from({ length: lines }).map((_, i) => (
          <Bar key={i} w={i === lines - 1 ? "45%" : "100%"} h={9} delay={delay + 120 + i * 60} />
        ))}
      </div>
    </div>
  );
}

/* a paragraph-by-paragraph silhouette for reading a single post */
function ArticleSkeleton() {
  const widths = ["92%", "100%", "86%", "97%", "64%"];
  return (
    <div className="flex flex-col gap-4" style={{ maxWidth: 720 }}>
      <Bar w="58%" h={20} r={6} />
      <Bar w="34%" h={10} />
      <div className="h-[1px] w-full my-1" style={{ background: BORDER }} />
      {widths.map((w, i) => (
        <Bar key={i} w={w} h={11} delay={i * 70} />
      ))}
      <div className="flex flex-col gap-3 mt-2">
        {["88%", "70%"].map((w, i) => (
          <Bar key={i} w={w} h={11} delay={300 + i * 70} />
        ))}
      </div>
    </div>
  );
}

function SkillCardSkeleton({ delay = 0 }) {
  return (
    <div
      className="flex items-center gap-5 p-5 rounded-lg overflow-hidden"
      style={{
        background: CARD_BG,
        border: `1px solid ${BORDER}`,
      }}
    >
      <Bar w={44} h={44} r={8} delay={delay} />
      <div className="flex flex-col gap-2 flex-1">
        <Bar w="60%" h={14} r={4} delay={delay + 40} />
        <Bar w="35%" h={9} r={3} delay={delay + 80} />
      </div>
    </div>
  );
}

export function Loading({ variant = "cards", count = 4, className = "", ...props }) {
  if (variant === "article") {
    return (
      <div className={`w-full ${className}`} role="status" aria-live="polite" {...props}>
        <span className="sr-only">loading</span>
        <ArticleSkeleton />
      </div>
    );
  }

  if (variant === "skills") {
    return (
      <div
        className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-2 xl:grid-cols-3 gap-3.5 sm:gap-4 lg:gap-5 ${className}`}
        role="status"
        aria-live="polite"
        {...props}
      >
        <span className="sr-only">loading</span>
        {Array.from({ length: count || 6 }).map((_, i) => (
          <SkillCardSkeleton key={i} delay={i * 80} />
        ))}
      </div>
    );
  }

  if (variant === "lines") {
    return (
      <div className={`flex flex-col gap-3 ${className}`} role="status" aria-live="polite" {...props}>
        <span className="sr-only">loading</span>
        {["100%", "82%", "93%", "60%"].map((w, i) => (
          <Bar key={i} w={w} h={11} delay={i * 70} />
        ))}
      </div>
    );
  }

  /* default: a grid of poster cards, sized like the real one it replaces */
  return (
    <div
      className={`grid grid-cols-1 sm:grid-cols-2 lg:grid-cols-3 gap-4 sm:gap-6 ${className}`}
      role="status"
      aria-live="polite"
      {...props}
    >
      <span className="sr-only">loading</span>
      {Array.from({ length: count }).map((_, i) => (
        <PosterSkeleton key={i} delay={i * 90} />
      ))}
    </div>
  );
}

export default Loading;
