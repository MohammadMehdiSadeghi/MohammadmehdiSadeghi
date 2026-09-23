import React, { useState, useRef, useEffect, useCallback } from "react";
import Typewriter from "../../../Components/Typewriter";
import useClickTrack from "../../../Hooks/useClickTrack";
import { useSiteInfo } from "../../../Hooks/useSiteInfo";

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
  const site = useSiteInfo();
  const onTyped = useCallback((next) => () => {
    if (mountedRef.current) setStep(next);
  }, []);
  return (
    <div className="w-full lg:w-auto min-w-0 flex flex-col gap-10 sm:gap-16 lg:gap-28 text-center lg:text-left items-center lg:items-start">
      <div>
        <ul className="flex min-h-[180px] flex-col gap-3 sm:gap-4 items-center lg:items-start">
          <li>
            <p
              style={{ color: gray }}
              className="text-[14px] sm:text-[16px]"
              data-typed={step >= 2 ? "done" : "typing"}
            >
              {step >= 1 && (
                <Typewriter
                  text="Hi all. I am"
                  speed={50}
                  lifeLike
                  cursor
                  onDone={onTyped(2)}
                />
              )}
            </p>
          </li>
          <li>
            <h1
              className="text-white xl:min-w-[800px] text-[30px] sm:text-[42px] lg:text-[58px] leading-tight"
              data-typed={step >= 3 ? "done" : "typing"}
            >
              {step >= 2 && (
                <Typewriter
                  text="Mohammad Mehdi Sadeghi"
                  speed={75}
                  lifeLike
                  cursor
                  onDone={onTyped(3)}
                />
              )}
            </h1>
          </li>
          <li>
            <p
              style={{ color: purple }}
              className="text-[18px] sm:text-[22px] lg:text-[28px]"
            >
              {step >= 3 && (
                <Typewriter text="> Front-end developer" speed={50} lifeLike />
              )}
            </p>
          </li>
        </ul>
      </div>
      <div>
        <ul className="flex flex-col gap-3 sm:gap-4 items-center lg:items-start">
          <li>
            <p style={{ color: gray }} className="text-[13px] sm:text-[14px]">
              // You can view my resume and projects in different sections of
              the site
            </p>
          </li>
          <li>
            <p style={{ color: gray }} className="text-[13px] sm:text-[14px]">
              // and find my profile on Github:
            </p>
          </li>
          {site.github && (
            <li className="flex flex-wrap gap-2 sm:gap-5 items-center justify-center lg:justify-start">
              <p style={{ color: purple }} className="text-[13px] sm:text-[14px]">
                const
              </p>
              <p
                style={{ color: turquoise }}
                className="text-[13px] sm:text-[14px]"
              >
                githubLink
              </p>
              <p className="text-white text-[13px] sm:text-[14px]">=</p>
              <a
                style={{ color: pink }}
                className="text-[12px] sm:text-[14px] underline break-all"
                href={site.github}
                onClick={withTracking({
                  targetType: "button",
                  targetId: "github-link",
                  targetLabel: "GitHub Profile",
                })}
              >
                {site.github}
              </a>
            </li>
          )}
        </ul>
      </div>
    </div>
  );
}
