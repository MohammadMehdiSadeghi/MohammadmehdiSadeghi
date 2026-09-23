import React from "react";

const PURPLE = "#615FFF";
const PINK = "#C27AFF";
const YELLOW = "#FFB86A";
const GRAY = "#68768C";

/**
 * Decorative "code preview" of the message payload.
 *
 * Rendered as one flex row per line — a fixed-width gutter for the line number
 * plus a `min-w-0` code cell — rather than a single `<p>` full of `<br>`s.
 * Two reasons:
 *
 *  1. In a flat `<p>` the code had to be `white-space: nowrap` to keep its
 *     shape, so the longest line (`01 const button = document.querySelector(
 *     '#sendBtn');`) needed 458px of content while the pane only offers ~372px
 *     at 1280 — it spilled 94px past the pane's content box and scrolled
 *     sideways behind a scrollbar.
 *  2. When such a line did wrap, the continuation restarted at the `<p>`'s
 *     left padding — i.e. underneath the line number rather than under the
 *     code, which reads as a stray new statement.
 *
 * Giving the code its own box fixes both: the line wraps inside that box and
 * stays aligned under the code, so nothing can escape the pane at any width
 * and the nowrap hack is no longer needed.
 */
export default function CodeView({ name, phoneNumber, message }) {
  const today = new Date();

  // Tokens are [text, color]; `color: null` inherits the pane's default.
  const lines = [
    [
      ["const", PINK],
      [" "],
      ["button", PURPLE],
      [" "],
      ["=", PINK],
      [" "],
      ["document", PURPLE],
      [".", GRAY],
      ["querySelector", PURPLE],
      ["(", GRAY],
      ["'#sendBtn'", YELLOW],
      [");", GRAY],
    ],
    [],
    [
      ["const", PINK],
      [" "],
      ["message", PURPLE],
      [" "],
      ["= {", PINK],
    ],
    [
      ["name", PURPLE],
      [":", GRAY],
      [" "],
      [`"${name}"`, YELLOW],
      [",", GRAY],
    ],
    [
      ["phoneNumber", PURPLE],
      [":", GRAY],
      [" "],
      [`"${phoneNumber}"`, YELLOW],
      [",", GRAY],
    ],
    [
      ["message", PURPLE],
      [":", GRAY],
      [" "],
      [`"${message}"`, YELLOW],
      [",", GRAY],
    ],
    [
      ["date", PURPLE],
      [":", GRAY],
      [" "],
      [`"${today.toDateString()}"`, YELLOW],
    ],
    [["}", GRAY]],
    [],
    [
      ["button", PURPLE],
      [".", GRAY],
      ["addEventListener", PURPLE],
      ["(", GRAY],
      ["'click'", YELLOW],
      [", () ", GRAY],
      ["=>", PINK],
      [" "],
      ["{", GRAY],
    ],
    [
      ["form", PURPLE],
      [".", GRAY],
      ["send", PURPLE],
      ["(", GRAY],
      ["message", PURPLE],
      [");", GRAY],
    ],
    [[ "})", GRAY ]],
  ];

  return (
    <div className="code-preview block lg:hidden xl:block w-full h-40 shrink-0 lg:mx-3 lg:mb-3 rounded-md border border-[#314158] bg-[#0b1220] overflow-y-auto xl:shrink xl:min-w-[420px] xl:h-[calc(100vh-116px)] xl:mx-0 xl:mb-0 rounded-none xl:border-0 xl:bg-transparent xl:py-6 xl:pr-6">
      <div className="px-3 mt-2 text-[9px] leading-5 xl:px-6 xl:mt-4 xl:text-[13px] xl:leading-7">
        {lines.map((tokens, i) => (
          <div key={i} className="flex">
            <span
              className="shrink-0 w-6 mr-3 text-right xl:w-7 xl:mr-4"
              style={{ color: GRAY }}
            >
              {String(i + 1).padStart(2, "0")}
            </span>
            {/* min-w-0 lets the cell shrink so the line wraps here instead of
                pushing the row (and the pane) wider. */}
            <span className="min-w-0 whitespace-pre-wrap break-words">
              {tokens.map(([text, color], j) => (
                <span key={j} style={color ? { color } : undefined}>
                  {text}
                </span>
              ))}
            </span>
          </div>
        ))}
      </div>
    </div>
  );
}
