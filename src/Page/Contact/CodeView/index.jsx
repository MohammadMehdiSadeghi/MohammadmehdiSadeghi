import React from "react";

const PURPLE = "#615FFF";
const PINK = "#C27AFF";
const YELLOW = "#FFB86A";
const GRAY = "#68768C";

export default function CodeView({ name, phoneNumber, message }) {
  const today = new Date();

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
