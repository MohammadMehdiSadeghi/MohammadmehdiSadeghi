import React from "react";
import { Link } from "react-router-dom";
import useClickTrack from "../../Hooks/useClickTrack";
import usePageSEO from "../../Hooks/usePageSEO";

export default function NotFoundCode() {
  usePageSEO({
    title: "404 - Page Not Found | Mohammad Mehdi Sadeghi",
    description: "The page you are looking for does not exist on Mohammad Mehdi Sadeghi's portfolio.",
  });

  const { withTracking } = useClickTrack();
  const purple = "#615FFF";
  const gray = "#90A1B9";
  const red = "#FF637E";
  const green = "#00D5BE";

  return (
    <div className="w-full min-h-[calc(100vh-116px)] bg-[#0F172B] flex flex-col lg:flex-row items-center justify-center gap-8 lg:gap-14 xl:gap-20 px-4 sm:px-10 py-10 text-center lg:text-left">
      <img
        src="/assets/Images/404.png"
        alt="404"
        className="w-[140px] sm:w-[180px] lg:w-[240px] shrink-0"
      />

      <div className="text-[11px] sm:text-[13px] lg:text-[15px] leading-6 sm:leading-8 text-left font-mono max-w-full overflow-x-auto p-4 sm:p-6 rounded-xl bg-[#081224] lg:bg-transparent border border-[#314158]/60 lg:border-0" style={{ color: gray }}>
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
        <span style={{ color: green }}>"404: PageNotFoundError"</span>);
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
        <span className="mr-8">13</span> * - Return to the main page
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
      </div>
    </div>
  );
}
