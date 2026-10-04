/* Comprehensive country ISO resolver, names, flags, and timezone mappings */

export const COUNTRY_NAMES = {
  IR: "Iran",
  US: "United States",
  GB: "United Kingdom",
  DE: "Germany",
  CA: "Canada",
  FR: "France",
  NL: "Netherlands",
  TR: "Turkey",
  AE: "United Arab Emirates",
  AU: "Australia",
  SE: "Sweden",
  NO: "Norway",
  FI: "Finland",
  DK: "Denmark",
  IT: "Italy",
  ES: "Spain",
  RU: "Russia",
  CN: "China",
  JP: "Japan",
  KR: "South Korea",
  IN: "India",
  BR: "Brazil",
  CH: "Switzerland",
  AT: "Austria",
  BE: "Belgium",
  PL: "Poland",
  CZ: "Czech Republic",
  SG: "Singapore",
  MY: "Malaysia",
  ID: "Indonesia",
  IQ: "Iraq",
  AF: "Afghanistan",
  SA: "Saudi Arabia",
  QA: "Qatar",
  KW: "Kuwait",
  OM: "Oman",
  AM: "Armenia",
  GE: "Georgia",
  AZ: "Azerbaijan",
  UA: "Ukraine",
  RO: "Romania",
  HU: "Hungary",
  GR: "Greece",
  PT: "Portugal",
  IE: "Ireland",
  NZ: "New Zealand",
  MX: "Mexico",
  AR: "Argentina",
  CL: "Chile",
  CO: "Colombia",
  ZA: "South Africa",
  EG: "Egypt",
  PK: "Pakistan",
  TH: "Thailand",
  VN: "Vietnam",
  PH: "Philippines",
  IL: "Israel",
  LB: "Lebanon",
  JO: "Jordan",
  SY: "Syria",
  CY: "Cyprus",
};

const TIMEZONE_TO_COUNTRY = {
  "Asia/Tehran": "IR",
  "America/New_York": "US",
  "America/Chicago": "US",
  "America/Denver": "US",
  "America/Los_Angeles": "US",
  "America/Phoenix": "US",
  "America/Anchorage": "US",
  "America/Toronto": "CA",
  "America/Vancouver": "CA",
  "America/Montreal": "CA",
  "America/Edmonton": "CA",
  "America/Winnipeg": "CA",
  "Europe/London": "GB",
  "Europe/Berlin": "DE",
  "Europe/Paris": "FR",
  "Europe/Amsterdam": "NL",
  "Europe/Brussels": "BE",
  "Europe/Rome": "IT",
  "Europe/Madrid": "ES",
  "Europe/Lisbon": "PT",
  "Europe/Stockholm": "SE",
  "Europe/Oslo": "NO",
  "Europe/Helsinki": "FI",
  "Europe/Copenhagen": "DK",
  "Europe/Zurich": "CH",
  "Europe/Vienna": "AT",
  "Europe/Warsaw": "PL",
  "Europe/Prague": "CZ",
  "Europe/Budapest": "HU",
  "Europe/Bucharest": "RO",
  "Europe/Athens": "GR",
  "Europe/Dublin": "IE",
  "Europe/Istanbul": "TR",
  "Europe/Moscow": "RU",
  "Europe/Kyiv": "UA",
  "Asia/Dubai": "AE",
  "Asia/Riyadh": "SA",
  "Asia/Qatar": "QA",
  "Asia/Kuwait": "KW",
  "Asia/Muscat": "OM",
  "Asia/Baghdad": "IQ",
  "Asia/Kabul": "AF",
  "Asia/Yerevan": "AM",
  "Asia/Tbilisi": "GE",
  "Asia/Baku": "AZ",
  "Asia/Singapore": "SG",
  "Asia/Kuala_Lumpur": "MY",
  "Asia/Jakarta": "ID",
  "Asia/Bangkok": "TH",
  "Asia/Ho_Chi_Minh": "VN",
  "Asia/Manila": "PH",
  "Asia/Tokyo": "JP",
  "Asia/Seoul": "KR",
  "Asia/Shanghai": "CN",
  "Asia/Hong_Kong": "HK",
  "Asia/Taipei": "TW",
  "Asia/Kolkata": "IN",
  "Asia/Karachi": "PK",
  "Australia/Sydney": "AU",
  "Australia/Melbourne": "AU",
  "Australia/Brisbane": "AU",
  "Australia/Perth": "AU",
  "Pacific/Auckland": "NZ",
  "America/Sao_Paulo": "BR",
  "America/Buenos_Aires": "AR",
  "America/Santiago": "CL",
  "America/Bogota": "CO",
  "America/Mexico_City": "MX",
  "Africa/Cairo": "EG",
  "Africa/Johannesburg": "ZA",
};

export function getCountryFlag(code) {
  if (!code || code === "UNKNOWN" || code === "LOCAL") return "";
  return String(code).toUpperCase().trim();
}

export function getCountryName(code) {
  if (!code || code === "UNKNOWN") return "Unknown";
  if (code === "LOCAL") return "Local / Dev";
  const upper = String(code).toUpperCase().trim();
  return COUNTRY_NAMES[upper] || upper;
}

export function resolveCountry(req, body = {}) {
  // 1. Cloudflare / Vercel / CloudFront reverse proxy headers
  const cfCountry = req.headers?.["cf-ipcountry"];
  if (cfCountry && cfCountry.length === 2 && cfCountry !== "XX" && cfCountry !== "T1") {
    return cfCountry.toUpperCase();
  }
  const vercelCountry = req.headers?.["x-vercel-ip-country"];
  if (vercelCountry && vercelCountry.length === 2) {
    return vercelCountry.toUpperCase();
  }
  const cfViewerCountry = req.headers?.["cloudfront-viewer-country"];
  if (cfViewerCountry && cfViewerCountry.length === 2) {
    return cfViewerCountry.toUpperCase();
  }
  const customCountryHeader = req.headers?.["x-country-code"];
  if (customCountryHeader && customCountryHeader.length === 2) {
    return customCountryHeader.toUpperCase();
  }

  // 2. Client sent detected country code
  if (body.country && typeof body.country === "string" && body.country.length === 2) {
    return body.country.toUpperCase();
  }

  // 3. Client timezone mapping
  if (body.timeZone && TIMEZONE_TO_COUNTRY[body.timeZone]) {
    return TIMEZONE_TO_COUNTRY[body.timeZone];
  }

  // 4. Client locale fallback (e.g. "fa-IR", "en-US", "de-DE")
  const locale = body.locale || req.headers?.["accept-language"] || "";
  const match = /[-_]([A-Za-z]{2})\b/.exec(locale);
  if (match && match[1]) {
    const candidate = match[1].toUpperCase();
    if (COUNTRY_NAMES[candidate]) return candidate;
  }

  // 5. Localhost detection
  const ip = req.ip || req.connection?.remoteAddress || "";
  if (ip === "127.0.0.1" || ip === "::1" || ip.includes("127.0.0.1") || ip.startsWith("::ffff:127.")) {
    return "LOCAL";
  }

  return "UNKNOWN";
}

export function formatCountryStats(countryMap = {}, totalVisits = 0) {
  if (!countryMap || typeof countryMap !== "object") return [];
  const entries = Object.entries(countryMap)
    .filter(([code, count]) => code && Number(count) > 0)
    .map(([code, count]) => {
      const num = Number(count);
      const name = getCountryName(code);
      const flag = getCountryFlag(code);
      const pct = totalVisits > 0 ? Math.round((num / totalVisits) * 1000) / 10 : 0;
      return {
        code,
        name,
        flag,
        total: num,
        percentage: pct,
      };
    });

  entries.sort((a, b) => b.total - a.total);
  return entries;
}
