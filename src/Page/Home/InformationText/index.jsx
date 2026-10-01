import React, { useState, useRef, useEffect } from "react";
import TypeIt from "typeit-react";
import useClickTrack from "../../../Hooks/useClickTrack";

const gray = "#90A1B9";
const purple = "#615FFF";
const turquoise = "#00D5BE";
const pink = "#FFA1AD";

export default function InformationText() {
  const [step, setStep] = useState(1);
  const mountedRef = useRef(true);
  useEffect(() => {
    mountedRef.current = true;
    return () => { mountedRef.current = false; };
  }, []);
  const { withTracking } = useClickTrack();
  // TypeIt instances must NOT be destroyed manually here — typeit-react cleans up
  // on unmount; destroying inside afterComplete crashed React on fast navigation.
  const onTyped = (next) => (_instance) => {
    if (mountedRef.current) setStep(next);
  };
  return (
    /* min-w-0: a flex item defaults to min-width:auto, so its intrinsic
       (max-content) width — the name at 58px, ~800px — pushed the row past
       the viewport and gave the whole page a horizontal scrollbar. Allowing
       it to shrink lets the name wrap instead; xl:min-w-[800px] below still
       keeps it on one line once there is room for it. */
    <div className="w-full lg:w-auto min-w-0 flex flex-col gap-8 sm:gap-12 lg:gap-20 xl:gap-28 text-center lg:text-left items-center lg:items-start">
      <div>
        <ul className="flex min-h-[160px] sm:min-h-[180px] flex-col gap-2.5 sm:gap-4 items-center lg:items-start">
          <li>
            <p
              style={{ color: gray }}
              className="text-[13px] sm:text-[16px]"
              data-typed={step >= 2 ? "done" : "typing"}
            >
              {step >= 1 && (
                <TypeIt
                  options={{
                    speed: 50,
                    lifeLike: true,
                    cursor: true,
                    afterComplete: onTyped(2),
                  }}
                >
                  Hi all. I am
                </TypeIt>
              )}
            </p>
          </li>
          <li>
            <h1
              className="text-white xl:min-w-[800px] text-[26px] sm:text-[38px] md:text-[46px] lg:text-[54px] xl:text-[58px] leading-tight"
              data-typed={step >= 3 ? "done" : "typing"}
            >
              {step >= 2 && (
                <TypeIt
                  options={{
                    speed: 75,
                    lifeLike: true,
                    cursor: true,
                    afterComplete: onTyped(3),
                  }}
                >
                  Mohammad Mehdi Sadeghi
                </TypeIt>
              )}
            </h1>
          </li>
          <li>
            <p
              style={{ color: purple }}
              className="text-[16px] sm:text-[20px] md:text-[24px] lg:text-[28px]"
            >
              {step >= 3 && (
                <TypeIt
                  options={{
                    speed: 50,
                    lifeLike: true,
                  }}
                >
                  {"> Front-end developer"}
                </TypeIt>
              )}
            </p>
          </li>
        </ul>
      </div>
      <div>
        <ul className="flex flex-col gap-2.5 sm:gap-4 items-center lg:items-start max-w-full">
          <li>
            <p style={{ color: gray }} className="text-[12px] sm:text-[14px]">
              // You can view my resume and projects in different sections of the site
            </p>
          </li>
          <li>
            <p style={{ color: gray }} className="text-[12px] sm:text-[14px]">
              // and find my profile on Github:
            </p>
          </li>
          <li className="flex flex-wrap gap-1.5 sm:gap-3 lg:gap-4 items-center justify-center lg:justify-start max-w-full">
            <span style={{ color: purple }} className="text-[12px] sm:text-[14px]">
              const
            </span>
            <span
              style={{ color: turquoise }}
              className="text-[12px] sm:text-[14px]"
            >
              githubLink
            </span>
            <span className="text-white text-[12px] sm:text-[14px]">=</span>
            <a
              style={{ color: pink }}
              className="text-[11px] sm:text-[14px] underline break-all"
              href="https://github.com/MohammadMehdiSadeghi"
              onClick={withTracking({
                targetType: "button",
                targetId: "github-link",
                targetLabel: "GitHub Profile",
              })}
            >
              https://github.com/MohammadMehdiSadeghi
            </a>
          </li>
        </ul>
      </div>
    </div>
  );
}
