import React from "react";

export default function CodeView({ name, phoneNumber, message }) {
  const purple = "#615FFF";
  const pink = "#C27AFF";
  const yellow = "#FFB86A";
  const gray = "#68768C";

  const todayDate = new Date();

  return (
    <div className="block md:hidden xl:block w-full h-40  shrink-0 md:mx-3 md:mb-3 rounded-md border border-[#314158] bg-[#0b1220] overflow-y-auto xl:shrink xl:h-[calc(100vh-116px)] xl:mx-0 xl:mb-0 rounded-none xl:border-0 xl:bg-transparent xl:py-6 xl:pr-16">
      <p className="px-3 mt-2 text-[9px] leading-5 xl:px-12 xl:mt-4 xl:text-[13px] xl:leading-7 xl:text-[13px]">
        <span className="mr-5" style={{ color: gray }}>
          01
        </span>{" "}
        <span style={{ color: pink }}>const</span>{" "}
        <span style={{ color: purple }}>button</span>{" "}
        <span style={{ color: pink }}>=</span>{" "}
        <span style={{ color: purple }}>document</span>
        <span style={{ color: gray }}>.</span>
        <span style={{ color: purple }}>querySelector</span>
        <span style={{ color: gray }}>(</span>
        <span style={{ color: yellow }}>'#sendBtn'</span>
        <span style={{ color: gray }}>);</span>
        <br />
        <span className="mr-8" style={{ color: gray }}>
          02
        </span>
        <br />
        <span className="mr-8" style={{ color: gray }}>
          03
        </span>{" "}
        <span style={{ color: pink }}>const</span>{" "}
        <span style={{ color: purple }}>message</span>{" "}
        <span style={{ color: pink }}>= {"{"}</span>
        <br />
        <span className="mr-8" style={{ color: gray }}>
          04
        </span>{" "}
        <span style={{ color: purple }}>name</span>
        <span style={{ color: gray }}>:</span>{" "}
        <span style={{ color: yellow }}>"{name}"</span>
        <span style={{ color: gray }}>,</span>
        <br />
        <span className="mr-8" style={{ color: gray }}>
          05
        </span>{" "}
        <span style={{ color: purple }}>phoneNumber</span>
        <span style={{ color: gray }}>:</span>{" "}
        <span style={{ color: yellow }}>"{phoneNumber}"</span>
        <span style={{ color: gray }}>,</span>
        <br />
        <span className="mr-8" style={{ color: gray }}>
          06
        </span>{" "}
        <span style={{ color: purple }}>message</span>
        <span style={{ color: gray }}>:</span>{" "}
        <span style={{ color: yellow }}>"{message}"</span>
        <span style={{ color: gray }}>,</span>
        <br />
        <span className="mr-8" style={{ color: gray }}>
          07
        </span>{" "}
        <span style={{ color: purple }}>date</span>
        <span style={{ color: gray }}>:</span>{" "}
        <span style={{ color: yellow }}>"{todayDate.toDateString()}"</span>
        <br />
        <span className="mr-8" style={{ color: gray }}>
          08
        </span>{" "}
        <span style={{ color: gray }}>{"}"}</span>
        <br />
        <span className="mr-8" style={{ color: gray }}>
          09
        </span>
        <br />
        <span className="mr-8" style={{ color: gray }}>
          10
        </span>{" "}
        <span style={{ color: purple }}>button</span>
        <span style={{ color: gray }}>.</span>
        <span style={{ color: purple }}>addEventListener</span>
        <span style={{ color: gray }}>(</span>
        <span style={{ color: yellow }}>'click'</span>
        <span style={{ color: gray }}>, () </span>
        <span style={{ color: pink }}>{"=>"}</span>{" "}
        <span style={{ color: gray }}>{"{"}</span>
        <br />
        <span className="mr-8" style={{ color: gray }}>
          11
        </span>{" "}
        <span style={{ color: purple }}>form</span>
        <span style={{ color: gray }}>.</span>
        <span style={{ color: purple }}>send</span>
        <span style={{ color: gray }}>(</span>
        <span style={{ color: purple }}>message</span>
        <span style={{ color: gray }}>);</span>
        <br />
        <span className="mr-5" style={{ color: gray }}>
          12
        </span>{" "}
        <span style={{ color: gray }}>{"})"}</span>
        <br />
      </p>
    </div>
  );
}
