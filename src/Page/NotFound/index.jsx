import React from "react";
import { Link } from "react-router-dom";
import useClickTrack from "../../Hooks/useClickTrack";

export default function NotFoundCode() {
  const { withTracking } = useClickTrack();
  const purple = "#615FFF";
  const gray = "#90A1B9";
  const red = "#FF637E";
  const green = "#00D5BE";

  return (
    <div className="w-full min-h-screen bg-[#0F172B] flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-62 px-6 sm:px-16 py-12 text-center lg:text-left">
      <img
        src="/assets/Images/404.png"
        alt="404"
        className="w-[160px] sm:w-[200px] lg:w-[260px]"
      />

      <p className="text-[12px] sm:text-[14px] lg:text-[16px] leading-7 sm:leading-9 text-left" style={{ color: gray }}>
        <span className="mr-8">01</span>{" "}
        <span style={{ color: purple }}>const</span> page ={" "}
        <span style={{ color: red }}>findPage</span>(
        <span style={{ color: green }}>'you-were-looking-for'</span>);
        <br />
        <span className="mr-8">02</span>
        <br />
        <span className="mr-8">03</span>{" "}
        <span style={{ color: purple }}>if</span> (!page) {"{"}
        <br />
        <span className="mr-8">04</span> &nbsp;&nbsp;
        <span style={{ color: red }}>console</span>.
        <span style={{ color: red }}>log</span>(
        <span style={{ color: green }}>
          "Oops! Looks like you took a wrong turn in the codebase."
        </span>
        );
        <br />
        <span className="mr-8">05</span> &nbsp;&nbsp;
        <span style={{ color: red }}>console</span>.
        <span style={{ color: red }}>log</span>(
        <span style={{ color: green }}>"But hey, since you're here ... "</span>
        );
        <br />
        <span className="mr-8">06</span> &nbsp;&nbsp;
        <span style={{ color: red }}>console</span>.
        <span style={{ color: red }}>log</span>(
        <span style={{ color: green }}>
          " Go back to the homepage and explore more cool stuff!"
        </span>
        );
        <br />
        <span className="mr-8">07</span> &nbsp;&nbsp;
        <span style={{ color: purple }}>throw</span>{" "}
        <span style={{ color: purple }}>new</span>{" "}
        <span style={{ color: red }}>Error</span>(
        <span style={{ color: green }}>"404: PageNotFoundError 😕"</span>);
        <br />
        <span className="mr-8">08</span> {"}"}
        <br />
        <span className="mr-8">09</span>
        <br />
        <span className="mr-8">10</span> /* Suggestions:
        <br />
        <span className="mr-8">11</span> * - Check the URL for typos
        <br />
        <span className="mr-8">12</span> * - Use the site navigation
        <br />
        <span className="mr-8">13</span> * - Or hit CMD+Z in real life 😄
        <br />
        <span className="mr-8">14</span> */
        <br />
        <span className="mr-8">15</span>
        <br />
        <span className="mr-8">16</span>{" "}
        <span style={{ color: red }}>redirect</span>(
        <Link className="underline" to="/" style={{ color: green }} onClick={withTracking({ targetType: "button", targetId: "404-home", targetLabel: "Go Home (404)" })}>
          home
        </Link>
        );
      </p>
    </div>
  );
}
