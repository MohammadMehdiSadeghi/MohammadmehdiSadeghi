import dbJson from "../public/api/music-database.json" with { type: "json" };

/* ════════════════════════════════════════════════════════════════════
   Music search — faithful port of the /api/search handler in server.js
   (norm / tokenise / transliteration / levenshtein tag matching).
   ════════════════════════════════════════════════════════════════════ */

export const MUSIC_DB = dbJson;

function norm(s) {
  return String(s || "")
    .trim()
    .toLowerCase()
    .replace(/[يكأإآةۀؤئەٱ]/g, (ch) => ({
      "ي": "ی", "ك": "ک", "أ": "ا", "إ": "ا", "آ": "ا",
      "ة": "ه", "ۀ": "ه", "ؤ": "و", "ئ": "ی", "ە": "ه", "ٱ": "ا",
    }[ch]))
    .replace(/[\u064B-\u0652\u0640\u200C]/g, "")
    .replace(/[^\p{L}\p{N}\s]+/gu, " ")
    .replace(/\s+/g, " ")
    .trim();
}

const STOPWORDS = new Set([
  "من","تو","او","ما","شما","آنها","این","آن","که","با","به","از","در","را","رو","برای","و","یا","ولی","اما","اگر","بعد",
  "پس","بود","است","هست","میخوام","میکنم","دارم","یه","یک","فقط","خیلی","اهنگ","موزیک","موسیقی","اغنیه","ترانه","بذار","بزار","بزن","بگو","بخون","بخوان","پخش","کن","بکن","چیزی","میخواد","دلم","اسم","احساس",
  "song","music","feel","feels","feeling","want","wanna","put","some",
  "the","a","an","to","of","for","and","or","in","on","with","is","are","be","was","i","you","me","my","we","it",
]);

const PHRASES = ["بی حال", "بی حال", "خیلی خوب", "حال خوب"];
function tokenise(s) {
  let toks = s.split(/\s+/).filter(Boolean);
  // merge known 2-word phrases into single tokens BEFORE stopword filtering
  const merged = [];
  for (let i = 0; i < toks.length; i++) {
    const two = toks[i] + " " + (toks[i + 1] || "");
    if (PHRASES.includes(two)) { merged.push(two); i++; }
    else merged.push(toks[i]);
  }
  return merged.filter((t) => t && t.length >= 2 && !STOPWORDS.has(t));
}

const TRANSLIT = {
  shad: "شاد", happy: "شاد", khosh: "خوش", jashn: "جشن", party: "جشن",
  ghamgin: "غمگین", sad: "غمگین", gham: "غم", ashk: "اشک",
  ashegh: "عاشق", eshgh: "عشق", ghalb: "قلب", love: "عشق",
  aram: "آرام", calm: "آرام", sokut: "سکوت", peace: "آرامش",
  roya: "رویا", dream: "رویا", khial: "خیال",
  shab: "شب", night: "شب", mah: "مهتاب", moon: "مهتاب", setare: "ستاره", star: "ستاره",
  baran: "باران", rain: "باران", bahar: "بهار", tabestan: "تابستان", zemestan: "زمستان",
  music: "موسیقی", song: "آهنگ", moosighi: "موسیقی",
  wedding: "عروسی", aroosi: "عروسی",
  khane: "خانه", safar: "سفر", safari: "سفر", travel: "سفر",
  mader: "مادر", pedar: "پدر", doost: "دوست", friend: "دوست",
  zendegi: "زندگی", life: "زندگی", khaterat: "خاطره", memory: "خاطره",
  energy: "انرژی", power: "قدرت", darya: "دریا", sea: "دریا",
  romantic: "عاشقانه", heartbreak: "جدایی", angry: "خشم", dance: "رقص",
  lonely: "تنهایی", lonly: "تنهایی", alone: "تنهایی", lonelyness: "تنهایی",
  heartbroken: "دلشکستگی", breakup: "دلشکستگی", tears: "اشک", cry: "اشک",
  tired: "خستگی", hope: "امید", miss: "دلتنگی", missing: "دلتنگی",
  wedding: "عروسی", aroosi: "عروسی",
  party: "رقص سبک", dancing: "رقص", danceable: "رقص",
  unhappy: "غم", upset: "غم", depressed: "غم", heartache: "دلشکستگی",
  sleepy: "خواب", asleep: "خواب", cozy: "ارامش", soothing: "ارامش",
  motivated: "انگیزه", motivation: "انگیزه", grind: "انگیزه",
  nostalgic: "نوستالژی", memory: "خاطره", memories: "خاطره",
  epic: "حماسه", cinematic: "سینمایی", vibing: "شادی",
  eminem: "امینم", billie: "بیلی ایلیش", eilish: "بیلی ایلیش", zaz: "زاز",
  abba: "ابی", zimmer: "زیمر", eminemm: "امینم", dragons: "ایمجین دراگونز",
};

// فارسی↔فارسی — کلیدها/مقادیر باید post-norm باشند (آ→ا، ؤ→و) چون norm قبل از مقایسه فولد می‌کند؛
// مقادیر فقط به تگ‌های واقعی موجود ختم می‌شوند
const SYNON = {
  "عاشقانه": ["عشق"], "عشق": ["عاشقانه"],
  "هیجان": ["پرانرژی"],
  "غمگین": ["اندوه", "غم"], "غم": ["اندوه"], "اندوه": ["غم"],
  "حزن": ["اندوه", "غم"], "اندوهناک": ["اندوه", "غم"],
  "دلتنگی": ["حسرت"], "حسرت": ["دلتنگی"],
  "شاد": ["شادی"], "شادی": ["شاد"],
  "انگیزشی": ["انگیزه", "الهام"], "انگیزه": ["الهام"],
  "ارامش": ["ارام", "سکوت"], "ارام": ["ارامش", "سکوت"], "اروم": ["ارام", "ارامش"],
  "رویایی": ["رویا"], "رویا": ["رویایی"],
  "حماسی": ["حماسه"], "حماسه": ["حماسی"],
  "پرانرژی": ["انرژی"], "انرژی": ["پرانرژی"],
  "درد": ["دردناک", "الم"], "دردناک": ["درد"], "الم": ["درد"],
  "تنهایی": ["انزوا"], "انزوا": ["تنهایی"],
  "خاطره": ["نوستالژی"], "نوستالژی": ["خاطره"],
  "جدایی": ["دلشکستگی", "شکست عشقی"], "دلشکستگی": ["جدایی", "شکست عشقی"],
  "استقلال": ["خودکفایی"], "خودپذیری": ["خودشناسی"],
  "تاریک": ["تاریکی"], "تاریکی": ["تاریک"],
  "لطیف": ["نرم", "ملایم"], "ملایم": ["لطیف", "نرم"], "نرم": ["لطیف", "ملایم"],
  "قوی": ["قدرتمند"], "قدرت": ["قدرتمند"], "قدرتمند": ["قوی"],
  "شب": ["شبانه"], "پاییز": ["اکتبر"], "زمستان": ["سردی"],
  "مبارزه": ["سختکوشی"], "سختکوشی": ["مبارزه"],
  "بارونی": ["اندوه", "ارامش", "سکوت"], "باران": ["ارامش", "اندوه"],
  "درس": ["تمرکز", "مطالعه"], "خوندن": ["مطالعه"],
  "ناراحت": ["غم", "اندوه"], "دلسرد": ["غم", "اندوه"], "بی حال": ["غم"], "بیحال": ["غم"],
  "غصه": ["غم", "اندوه"], "داغون": ["غم", "دلشکستگی"], "خشمگین": ["خشم", "تاریک"], "عصبانی": ["خشم"],
  "شادمان": ["شاد"], "خوشحال": ["شاد", "خوشبختی"], "مهمونی": ["رقص سبک", "شادی"], "پارتی": ["رقص سبک", "شادی"],
  "پرواز": ["ازادی"], "رهایی": ["ازادی"],
  "زیما": ["زیمر"], "ایماژین": ["ایمجین دراگونز"], "ایمی": ["امینم"], "ایلش": ["بیلی ایلیش"],
  "بی حال": ["غم", "اندوه"], "حال بد": ["غم", "اندوه"],
  "ابا": ["ابی"], "ابba": ["ابی"], "ابیئی": ["ابی"], "اشتیاق": ["عشق"], "دلتنگ": ["دلتنگی"], "خسته": ["خستگی"],
  "خواب": ["ارامش", "سکوت"], "آروم": ["ارام"], "ارام": ["ارامش"], "آرامش": ["ارامش"], "ملوس": ["لطیف", "دلنشین"],
  "نوستالژی": ["خاطره", "گذشته"], "یادگاری": ["خاطره"], "جذاب": ["جذابیت"], "گیرا": ["گیرا"],
  "مطالعه": ["تمرکز"], "تمرکز": ["مطالعه"],
};

// بسط دو سطحی: sad→غمگین→غم (مترادفِ مترادف هم جستجو می‌شود)
function expandTokens(tokens) {
  const out = [...tokens];
  let frontier = [...tokens];
  for (let depth = 0; depth < 2; depth++) {
    const next = [];
    for (const t of frontier) {
      if (TRANSLIT[t] && !out.includes(TRANSLIT[t])) { out.push(TRANSLIT[t]); next.push(TRANSLIT[t]); }
      const syns = SYNON[t];
      if (syns) for (const s of syns) if (!out.includes(s)) { out.push(s); next.push(s); }
    }
    frontier = next;
  }
  return out;
}

function containsSim(hay, needle) {
  if (hay === needle) return 1.0;
  if (hay.includes(needle)) return 0.8;
  if (needle.length >= 3 && hay.length >= 2 && needle.includes(hay)) return 0.6;
  return 0.0;
}

function lev(a, b) {
  const m = a.length, n = b.length;
  if (!m) return n;
  if (!n) return m;
  let prev = Array.from({ length: n + 1 }, (_, i) => i);
  for (let i = 1; i <= m; i++) {
    const cur = [i];
    for (let j = 1; j <= n; j++) {
      cur[j] = Math.min(prev[j] + 1, cur[j - 1] + 1, prev[j - 1] + (a[i - 1] === b[j - 1] ? 0 : 1));
    }
    prev = cur;
  }
  return prev[n];
}

function levSim(a, b) {
  const longer = a.length > b.length ? a : b;
  const shorter = a.length > b.length ? b : a;
  const len = longer.length;
  if (!len) return 1.0;
  return (len - lev(longer, shorter)) / len;
}

function variantsOf(t) {
  const out = [t];
  if (TRANSLIT[t] && !out.includes(TRANSLIT[t])) out.push(TRANSLIT[t]);
  const syns = SYNON[t];
  if (syns) for (const s of syns) if (!out.includes(s)) out.push(s);
  for (const v of [...out]) {
    if (TRANSLIT[v] && !out.includes(TRANSLIT[v])) out.push(TRANSLIT[v]);
    const sy2 = SYNON[v];
    if (sy2) for (const s of sy2) if (!out.includes(s)) out.push(s);
  }
  return out;
}

// امتیاز یک توکن نسبت به لیست تگ: دقیق > کلمهٔ مشخص داخل تگ چندکلمه‌ای > فازی تک‌کلمه‌ای
function hitTag(token, normTags, rawTags) {
  let best = 0.0, idx = -1, phrase = false;
  for (let i = 0; i < normTags.length; i++) {
    const tag = normTags[i];
    if (!tag) continue;
    let s = 0.0, ph = false;
    if (token === tag) s = 1.0;
    else if (token.length >= 4 && tag.includes(" ") && tag.split(" ").some((w) => w.length >= 4 && w === token)) { s = 0.9; ph = true; }
    else if (s === 0.0 && token.length >= 5 && tag.includes(" ")) {
      const wThr = (x) => (x.length >= 6 ? 0.8 : 0.85);
      const w = tag.split(" ").find((x) => x.length >= 5 && levSim(token, x) >= wThr(x));
      if (w) { s = 0.85 * levSim(token, w); ph = true; }
    }
    // phonetic-vowel key: Persian transliteration typos swap vowels (ابا→ابی، بیل→بیلی، زیز→زاز) —
    // fold ONLY vowels for the key, require consonant skeleton ≥2, word-level only, modest score.
    else if (s === 0.0 && token.length >= 3) {
      const kq = token.replace(/[ایواویو]/g, "");
      if (kq.length >= 2) {
        const w = tag.split(" ").find((x) => {
          const kx = x.replace(/[ایواویو]/g, "");
          return kx.length >= 2 && kx === kq;
        });
        if (w) { s = 0.7; ph = true; }
      }
    }
    if (s === 0.0 && tag.length <= 10 && token.length <= 10) {
      const sim = levSim(token, tag);
      const minSim = token.length <= 3 ? 0.85 : token.length <= 5 ? 0.8 : 0.75;
      if (sim >= minSim) s = 0.9 * sim;
    }
    if (s > best) { best = s; idx = i; phrase = ph; }
  }
  return { score: best, label: idx >= 0 ? String(rawTags[idx] ?? "") : null, phrase };
}

/* ---- mood ranking: «شادترین اهنگ ممکن» / «i feel lonely» → rank by analysis.vibe ----
   stems are POST-norm (ارامش not آرامش). A token containing a stem votes for that dim;
   first token weighs 1.35 (carries the intent). */
const MOOD_STEMS = [
  ["sad",      ["غم", "اندوه", "حزن", "دلتنگ", "تنها", "اشک", "گریه", "دلشکست", "حسرت", "sad", "lonely", "lonly", "alone", "cry", "tears", "heartbr", "miss"]],
  ["happy",    ["شاد", "خوشحال", "خوشبخت", "حال خوب", "happy", "joy", "good vibes"]],
  ["energetic",["انرژ", "هیجان", "قدرت", "جنگی", "مبارزه", "gym", "workout", "hype", "energet", "پرانرژی"]],
  ["calm",     ["ارام", "اروم", "ملایم", "لطیف", "خواب", "sleep", "chill", "relax", "calm", "اهسته", "برای خواب"]],
  ["focus",    ["تمرکز", "مطالعه", "درس", "concentr", "study", "focus", "reading", "کار"]],
  ["epic",     ["حماس", "اپیک", "سینمایی", "سنگین", "epic", "cinematic"]],
  ["romantic", ["عاشقان", "عشق", "رمانتیک", "romantic", "love", "عاشق"]],
  ["dark",     ["تاریک", "تلخ", "نوآر", "dark", "گوتیک"]],
];
function detectMood(qTokens) {
  const hits = [];
  for (const [dim, stems] of MOOD_STEMS) {
    let w = 0;
    for (let i = 0; i < qTokens.length; i++) {
      const tk = qTokens[i];
      if (stems.some((st) => tk.includes(st))) w += i === 0 ? 1.35 : 0.75;
    }
    if (w > 0) hits.push([dim, w]);
  }
  return hits;
}

export function runSearch(queryRaw) {
  const query = String(queryRaw || "").trim();
  const songs = MUSIC_DB.songs || [];
  const qNorm = norm(query);

  const baseTokens = tokenise(qNorm);
  const qTokens = expandTokens(baseTokens);
  const nTokens = Math.max(baseTokens.length, 1);
  const moodHits = detectMood(baseTokens);

  const scores = songs.map((song) => {
    const nameNorm = norm(song.name);
    const artistNorm = norm(song.artist);
    let score = 0.0;
    const matched = [];

    if (nameNorm === qNorm) score += 10.0;
    if (qNorm.length >= 2) score += containsSim(nameNorm, qNorm) * 5.0;

    if (artistNorm === qNorm) score += 6.0;
    else if (qNorm.length >= 2) score += containsSim(artistNorm, qNorm) * 3.0;
    // تایپوی اسم/آرتیست با فازی بلند (فقط وقتی مچ زیررشته نداریم)
    if (qNorm.length >= 5) {
      if (!nameNorm.includes(qNorm) && !qNorm.includes(nameNorm)) {
        const simN = levSim(qNorm, nameNorm);
        if (simN >= 0.75) score += simN * 5.0;
      }
      if (!artistNorm.includes(qNorm) && !qNorm.includes(artistNorm)) {
        const simA = levSim(qNorm, artistNorm);
        if (simA >= 0.78) score += simA * 3.0;
      }
    }

    const nameArtistTokens = tokenise(`${nameNorm} ${artistNorm}`);
    if (nameArtistTokens.length) {
      let overlaps = 0;
      for (const qt of qTokens) {
        if (nameArtistTokens.some((nt) =>
          nt === qt || (nt.includes(qt) && qt.length >= 2) || (qt.includes(nt) && nt.length >= 4))) overlaps++;
      }
      score += Math.min(overlaps / nTokens, 1.0) * 4.0;
    }

        const faTags = song.tags || [];
    const enTags = song.tagsEn || [];
    const faNorm = faTags.map(norm);
    const enNorm = enTags.map(norm);
    let tagScore = 0.0;
    let covered = 0;
    // عبارت چندکلمه‌ای: کل کوئری داخل یک تگ → پاداش مستقیم
    const joined = qTokens.join("");
    if (baseTokens.length >= 2 && joined.length >= 5 && faNorm.some((tg) => tg.replace(/\s+/g, "").includes(joined))) tagScore += 0.85;
    // هر توکن پایه فقط بهترین برخورد بین خودش و بسط‌هایش را می‌گیرد (بدون شمارش مضاعف)
    for (let bi = 0; bi < baseTokens.length; bi++) {
      const variants = variantsOf(baseTokens[bi]);
      let bestHit = 0.0, bestLabel = null, bestPhrase = false;
      for (const v of variants) {
        const vt = norm(v);
        const hFa = hitTag(vt, faNorm, faTags);
        const hEn = hitTag(vt, enNorm, enTags);
        const h = hFa.score >= hEn.score ? hFa : hEn;
        if (h.score > bestHit) { bestHit = h.score; bestLabel = h.label; bestPhrase = h.phrase; }
      }
      if (bestHit >= 0.7) {
        covered += bestPhrase ? 2 : 1;
        tagScore += bestHit * (bi === 0 ? 1.0 : 0.75) + (bestPhrase ? 0.3 : 0);
        if (bestLabel && !matched.includes(bestLabel)) matched.push(bestLabel);
      }
    }
    // single-word query: a tag hit IS the intent — weigh it like a name hit
    score += Math.min(tagScore / nTokens, 1.0) * (nTokens === 1 ? 3.2 : 2.0);
    // پذیرش وایب: پوشش کافیِ توکن‌های کوئری حتی بدون برخورد اسم/آرتیست
    if (covered / nTokens >= (nTokens === 1 ? 0.5 : nTokens >= 3 ? 0.34 : 0.5)) score += nTokens === 1 ? 2.4 : 1.6;

    /* mood mode: rank by analysis.vibe of the requested dims; keep 25% of the
       textual score as tie-break so «اهنگ شاد زاز» still prefers Zaz */
    if (moodHits.length) {
      const an = song.analysis;
      let vibePart = 0;
      if (an && an.vibe) for (const [dim, w] of moodHits) vibePart += (an.vibe[dim] || 0) * w;
      score = vibePart + score * 0.25;
    }
    return { id: song.id, score, matched };
  });

  scores.sort((a, b) => b.score - a.score);
  const best = scores[0] || null;
  if (best && best.score >= 1.5) {
    const matchedSong = songs.find((s) => s.id === best.id);
    return {
      found: true,
      score: Math.round(best.score * 100) / 100,
      song: {
        id: matchedSong.id,
        name: matchedSong.name,
        artist: matchedSong.artist,
        src: matchedSong.src,
        tags: (matchedSong.tags || []).slice(0, 8),
        tagsEn: (matchedSong.tagsEn || []).slice(0, 4),
        matched: best.matched.slice(0, 8),
      },
    };
  }
  return { found: false };
}
