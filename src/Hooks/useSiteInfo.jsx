import { createContext, useContext, useEffect, useMemo, useState } from "react";

/* ════════════════════════════════════════════════════════════════════
   Site-wide identity / contact / social links.

   Before this existed every one of these values was a literal duplicated
   across Header, Footer, ContactBox, SubjectBox and InformationText — so
   changing an email address meant a code change and a redeploy. They now
   come from /api/site.json, which the admin panel writes.

   The defaults below are those original literals. They are NOT dead code:
   they are what renders on the very first paint, before the fetch resolves,
   and what renders if the request fails. Without them the header, footer and
   contact rows would flash empty and then pop in, and an offline visitor
   would see a site with no way to get in touch at all.
   ════════════════════════════════════════════════════════════════════ */

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

/* Merge semantics, on purpose: a key the admin has never touched is simply
   absent from the stored object, and a blind replace would blank it out.
   An explicitly-cleared key ("" or null) is dropped too, so the consumer's
   truthiness check — `{site.instagram && …}` — means "the owner removed
   this row" and the default never resurrects it. */
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
    /* no-store: this endpoint is admin-editable, so a cached copy would keep
       showing the old email after a change until a hard refresh. */
    fetch("/api/site.json", { cache: "no-store" })
      .then((res) => (res.ok ? res.json() : null))
      .then((json) => {
        if (!alive || !json || typeof json !== "object" || Array.isArray(json)) return;
        setSite((prev) => mergeOverDefaults(prev, json));
      })
      .catch(() => {
        /* keep the defaults — a failed fetch must not blank the site */
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
