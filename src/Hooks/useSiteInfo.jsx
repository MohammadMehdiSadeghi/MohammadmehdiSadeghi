import { createContext, useContext, useEffect, useMemo, useState } from "react";


export const SITE_DEFAULTS = {
  brand: "Mohammad-Mehdi-Sadeghi",
  email: "mohammad12345sadeghi@gmail.com",
  phone: "+989150669620",
  phoneLabel: "+98 915 066 9620",
  github: "https://github.com/MohammadMehdiSadeghi",
  githubHandle: "MohammadMehdiSadeghi",
  linkedin: "https://www.linkedin.com/in/mohammad-mehdi-sadeghi",
  telegram: "https://t.me/Mohammad_sadeghi34",
  telegramHandle: "Mohammad_sadeghi34",
  instagram: "https://www.instagram.com/Mohammad_sadeghi3447",
  instagramHandle: "Mohammad_sadeghi3447",
};

const SiteInfoContext = createContext(SITE_DEFAULTS);

function mergeOverDefaults(base, incoming) {
  const next = { ...base };
  for (const [key, value] of Object.entries(incoming)) {
    if (value == null) continue;
    if (typeof value === "string" && value.trim() === "") {
      next[key] = "";
      continue;
    }
    if (typeof value === "string") next[key] = value.trim();
  }
  return next;
}

export function SiteInfoProvider({ children }) {
  const [site, setSite] = useState(SITE_DEFAULTS);

  useEffect(() => {
    let alive = true;
    fetch("/api/site.json", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!alive || !json || typeof json !== "object" || Array.isArray(json)) return;
        setSite((prev) => mergeOverDefaults(prev, json));
      })
      .catch(() => {
      });
    return () => {
      alive = false;
    };
  }, []);

  const value = useMemo(() => site, [site]);
  return <SiteInfoContext.Provider value={value}>{children}</SiteInfoContext.Provider>;
}

export function useSiteInfo() {
  return useContext(SiteInfoContext);
}

export default useSiteInfo;
