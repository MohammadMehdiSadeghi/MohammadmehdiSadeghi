import React from "react";

export function Loading(props) {
  return (
    <div className="w-full h-40 flex items-center justify-center">
      <svg
        xmlns="http://www.w3.org/2000/svg"
        width="4em"
        height="4em"
        viewBox="0 0 24 24"
        color="#FFB86A"
        {...props}
      >
        <circle cx="4" cy="12" r="3" fill="currentColor">
          <animate
            id="SVG7x14Dcom"
            fill="freeze"
            attributeName="opacity"
            begin="0;SVGqSjG0dUp.end-0.25s"
            dur="0.75s"
            values="1;.2"
          />
        </circle>
        <circle cx="12" cy="12" r="3" fill="currentColor" opacity=".4">
          <animate
            fill="freeze"
            attributeName="opacity"
            begin="SVG7x14Dcom.begin+0.15s"
            dur="0.75s"
            values="1;.2"
          />
        </circle>
        <circle cx="20" cy="12" r="3" fill="currentColor" opacity=".3">
          <animate
            id="SVGqSjG0dUp"
            fill="freeze"
            attributeName="opacity"
            begin="SVG7x14Dcom.begin+0.3s"
            dur="0.75s"
            values="1;.2"
          />
        </circle>
      </svg>
    </div>
  );
}

export default Loading;
