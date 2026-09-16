import { MUSIC_DB } from "./_music.js";

const EN_MOOD_LEX = {
  // Sadness / Grief / Pain
  sad: { sadness: 0.95 }, sadness: { sadness: 0.95 }, unhappy: { sadness: 0.8 },
  sorrow: { sadness: 0.9 }, grief: { sadness: 0.95 }, pain: { sadness: 0.8, heartbreak: 0.5 },
  hurting: { sadness: 0.8, heartbreak: 0.6 }, hurt: { sadness: 0.75, heartbreak: 0.5 },
  tears: { sadness: 0.85 }, crying: { sadness: 0.9 }, cry: { sadness: 0.85 },
  depressed: { sadness: 0.9, melancholy: 0.7 }, depression: { sadness: 0.9, melancholy: 0.7 },
  down: { sadness: 0.6, melancholy: 0.5 }, gloomy: { melancholy: 0.85, sadness: 0.5 },

  // Longing / Missing / Distance
  longing: { longing: 0.95 }, miss: { longing: 0.9 }, missing: { longing: 0.9 },
  yearn: { longing: 0.85 }, yearning: { longing: 0.9 }, wish: { longing: 0.6, hope: 0.4 },
  distance: { longing: 0.7 },

  // Nostalgia / Memories / Retro
  nostalgia: { nostalgia: 0.95 }, nostalgic: { nostalgia: 0.95 }, memory: { nostalgia: 0.85 },
  memories: { nostalgia: 0.9 }, reminisce: { nostalgia: 0.85 }, past: { nostalgia: 0.8 },
  retro: { nostalgia: 0.8 }, vintage: { nostalgia: 0.75 }, childhood: { nostalgia: 0.85 },

  // Heartbreak / Breakup
  heartbreak: { heartbreak: 0.95, sadness: 0.7 }, heartbroken: { heartbreak: 0.95, sadness: 0.7 },
  breakup: { heartbreak: 0.95, sadness: 0.6 }, divorce: { heartbreak: 0.85, sadness: 0.7 },
  broken: { heartbreak: 0.8, sadness: 0.6 }, rejected: { heartbreak: 0.8, loneliness: 0.7 },
  betrayal: { heartbreak: 0.8, anger: 0.7 }, cheated: { heartbreak: 0.85, anger: 0.75 },
  ex: { heartbreak: 0.7, longing: 0.6 },

  // Loneliness / Solitude
  lonely: { loneliness: 0.95, sadness: 0.6 }, loneliness: { loneliness: 0.95, sadness: 0.6 },
  alone: { loneliness: 0.9 }, solitude: { loneliness: 0.7, calm: 0.5 },
  isolated: { loneliness: 0.85 }, empty: { loneliness: 0.8, sadness: 0.7 },

  // Joy / Happiness
  happy: { joy: 0.95 }, happiness: { joy: 0.95 }, joy: { joy: 0.95 }, joyful: { joy: 0.9 },
  cheerful: { joy: 0.85 }, glad: { joy: 0.75 }, smile: { joy: 0.7, warmth: 0.5 },
  delight: { joy: 0.85 }, sunshine: { joy: 0.8, warmth: 0.7 }, celebrate: { joy: 0.8, euphoria: 0.7 },

  // Playfulness / Fun
  playful: { playfulness: 0.9 }, fun: { playfulness: 0.8, joy: 0.6 }, silly: { playfulness: 0.8 },
  quirky: { playfulness: 0.75 }, cheeky: { playfulness: 0.75 },

  // Romance / Love
  love: { romance: 0.9 }, romance: { romance: 0.95 }, romantic: { romance: 0.95 },
  lover: { romance: 0.85 }, loving: { romance: 0.8, warmth: 0.6 }, crush: { romance: 0.8, longing: 0.5 },
  kiss: { romance: 0.85, sensuality: 0.6 }, kissing: { romance: 0.85, sensuality: 0.6 },
  sweetheart: { romance: 0.8, warmth: 0.6 },

  // Sensuality
  sensual: { sensuality: 0.9 }, sexy: { sensuality: 0.85 }, intimate: { sensuality: 0.8, romance: 0.6 },
  passion: { sensuality: 0.8, energy: 0.5 }, desire: { sensuality: 0.85 }, seductive: { sensuality: 0.85 },

  // Warmth / Comfort
  warm: { warmth: 0.9, calm: 0.5 }, warmth: { warmth: 0.9 }, cozy: { warmth: 0.85, calm: 0.7 },
  comfort: { warmth: 0.8, calm: 0.6 }, tender: { warmth: 0.8, romance: 0.6 }, gentle: { warmth: 0.75, calm: 0.75 },

  // Anger / Rage / Hate
  anger: { anger: 0.95 }, angry: { anger: 0.95 }, rage: { anger: 0.95, energy: 0.7 },
  furious: { anger: 0.9 }, mad: { anger: 0.8 }, hate: { anger: 0.85 },
  frustrated: { anger: 0.7, tension: 0.6 }, annoyed: { anger: 0.6 },

  // Rebellion / Fight
  rebel: { rebellion: 0.9 }, rebellion: { rebellion: 0.95 }, fight: { rebellion: 0.8, power: 0.7 },
  protest: { rebellion: 0.85 }, riot: { rebellion: 0.9, energy: 0.8 },

  // Power / Strength / Epic
  power: { power: 0.95 }, powerful: { power: 0.95 }, strong: { power: 0.85 },
  strength: { power: 0.85 }, epic: { power: 0.9, tension: 0.5 }, triumph: { power: 0.85, joy: 0.6 },
  victory: { power: 0.9, joy: 0.7 }, unstoppable: { power: 0.9, energy: 0.8 },

  // Defiance
  defiant: { defiance: 0.9 }, defiance: { defiance: 0.95 }, fearless: { defiance: 0.85, power: 0.7 },
  brave: { defiance: 0.8, power: 0.6 }, bold: { defiance: 0.8, energy: 0.6 },

  // Calm / Peace / Sleep / Relax
  calm: { calm: 0.95 }, peace: { calm: 0.9 }, peaceful: { calm: 0.95 }, quiet: { calm: 0.8 },
  relax: { calm: 0.9 }, relaxing: { calm: 0.95 }, relaxed: { calm: 0.9 }, chill: { calm: 0.85 },
  chilling: { calm: 0.85 }, sleep: { calm: 0.9 }, sleepy: { calm: 0.85 }, soothing: { calm: 0.9, warmth: 0.5 },
  serene: { calm: 0.9 },

  // Dreaminess
  dream: { dreaminess: 0.9 }, dreamy: { dreaminess: 0.95 }, dreaming: { dreaminess: 0.9 },
  ethereal: { dreaminess: 0.9 }, floating: { dreaminess: 0.85, calm: 0.5 }, stars: { dreaminess: 0.7 },
  night: { dreaminess: 0.6, calm: 0.4 },

  // Melancholy / Gloom / Rain
  melancholy: { melancholy: 0.95 }, melancholic: { melancholy: 0.95 }, somber: { melancholy: 0.85 },
  wistful: { melancholy: 0.8, nostalgia: 0.6 }, rain: { melancholy: 0.7, calm: 0.5 }, rainy: { melancholy: 0.7, calm: 0.5 },

  // Hope / Optimism
  hope: { hope: 0.95 }, hopeful: { hope: 0.95 }, optimism: { hope: 0.85, joy: 0.5 },
  bright: { hope: 0.7, joy: 0.6 }, light: { hope: 0.7, warmth: 0.5 }, believe: { hope: 0.75, power: 0.5 },

  // Darkness / Tension / Mystery
  dark: { darkness: 0.9 }, darkness: { darkness: 0.95 }, shadow: { darkness: 0.8 },
  tension: { tension: 0.9 }, tense: { tension: 0.9 }, dramatic: { tension: 0.85, power: 0.5 },
  anxious: { tension: 0.8, darkness: 0.5 }, anxiety: { tension: 0.8, darkness: 0.5 },
  stress: { tension: 0.75 }, stressed: { tension: 0.75 }, nervous: { tension: 0.7 },
  mystery: { mystery: 0.95 }, mysterious: { mystery: 0.95 }, secret: { mystery: 0.8 },

  // Energy / Workout / Hype
  energy: { energy: 0.95 }, energetic: { energy: 0.95 }, hype: { energy: 0.9, euphoria: 0.7 },
  hyped: { energy: 0.9, euphoria: 0.7 }, workout: { energy: 0.9 }, gym: { energy: 0.9 },
  running: { energy: 0.85 }, upbeat: { energy: 0.85, joy: 0.7 },

  // Euphoria / Party / Dance
  euphoria: { euphoria: 0.95, joy: 0.7 }, euphoric: { euphoria: 0.95, joy: 0.7 },
  party: { euphoria: 0.85, energy: 0.8 }, dance: { euphoria: 0.8, energy: 0.85 },
  dancing: { euphoria: 0.8, energy: 0.85 }, club: { euphoria: 0.8, energy: 0.8 },

  // Reflection / Focus / Study
  reflection: { reflection: 0.95 }, reflective: { reflection: 0.95 }, thinking: { reflection: 0.85 },
  thoughtful: { reflection: 0.85 }, focus: { reflection: 0.9, calm: 0.5 }, focusing: { reflection: 0.9, calm: 0.5 },
  study: { reflection: 0.9, calm: 0.5 }, studying: { reflection: 0.9, calm: 0.5 },
  reading: { reflection: 0.8, calm: 0.6 }, coding: { reflection: 0.85, focus: 0.9 },
};

const MOOD_DIM_EN = {
  sadness: ["sad", "sorrow", "grief", "pain", "tears", "depressed", "unhappy", "crying"],
  longing: ["longing", "miss", "missing", "yearning", "distance"],
  nostalgia: ["nostalgia", "nostalgic", "memory", "memories", "past", "retro", "vintage", "childhood"],
  heartbreak: ["heartbreak", "heartbroken", "breakup", "broken", "rejected", "betrayal"],
  loneliness: ["lonely", "alone", "isolation", "solitude", "empty"],
  joy: ["joy", "happy", "happiness", "cheerful", "glad", "delight", "smile"],
  playfulness: ["playful", "fun", "silly", "quirky", "cheeky"],
  romance: ["romance", "romantic", "love", "lover", "crush", "sweetheart", "kiss"],
  sensuality: ["sensual", "intimate", "sexy", "passion", "desire"],
  warmth: ["warm", "warmth", "cozy", "comfort", "gentle", "tender"],
  anger: ["anger", "angry", "rage", "furious", "mad", "hate"],
  rebellion: ["rebellion", "rebel", "fight", "protest", "riot"],
  power: ["power", "powerful", "strength", "strong", "epic", "victory", "triumph"],
  defiance: ["defiance", "defiant", "fearless", "brave", "bold"],
  calm: ["calm", "peace", "peaceful", "quiet", "relax", "relaxing", "chill", "sleep", "soothing"],
  dreaminess: ["dream", "dreamy", "dreaming", "ethereal", "floating", "stars"],
  melancholy: ["melancholy", "melancholic", "gloomy", "somber", "wistful", "rain"],
  hope: ["hope", "hopeful", "optimism", "bright", "future", "light", "believe"],
  darkness: ["dark", "darkness", "shadow", "gothic"],
  tension: ["tension", "tense", "drama", "dramatic", "suspense", "thrill", "anxiety", "stress"],
  mystery: ["mystery", "mysterious", "secret", "hidden"],
  energy: ["energy", "energetic", "hype", "fast", "workout", "gym", "pumped"],
  euphoria: ["euphoria", "euphoric", "party", "dance", "celebration", "club"],
  reflection: ["reflection", "reflective", "thinking", "thoughtful", "focus", "study", "reading"],
};

const DIM_TO_VIBE = {
  sadness: { sad: 1 }, melancholy: { sad: 0.7, calm: 0.3 }, longing: { sad: 0.6, romantic: 0.4 },
  heartbreak: { sad: 0.8, dark: 0.2 }, loneliness: { sad: 0.6, calm: 0.2 },
  nostalgia: { sad: 0.4, calm: 0.3 },
  joy: { happy: 1 }, playfulness: { happy: 0.7, energetic: 0.3 }, euphoria: { happy: 0.6, energetic: 0.4 },
  romance: { romantic: 1 }, sensuality: { romantic: 0.6, dark: 0.2 }, warmth: { happy: 0.4, calm: 0.4 },
  anger: { dark: 0.6, energetic: 0.4 }, rebellion: { energetic: 0.5, dark: 0.3 },
  power: { epic: 0.8, energetic: 0.2 }, defiance: { epic: 0.5, energetic: 0.3 },
  calm: { calm: 1 }, dreaminess: { calm: 0.5, romantic: 0.3 },
  hope: { happy: 0.5, calm: 0.3 },
  darkness: { dark: 1 }, tension: { dark: 0.5, epic: 0.3 }, mystery: { dark: 0.4, calm: 0.3 },
  energy: { energetic: 1 }, reflection: { focus: 1 },
};

export default async function handler(req, res) {
  if (req.method !== "GET") {
    return res.status(405).json({ error: "method not allowed" });
  }

  const query = String(req.query.q || "").trim();
  if (!query) {
    return res.json({ error: "Query is required" });
  }
  if (query.length < 3) {
    return res.json({ error: "Query is too short (min 3 chars)" });
  }
  if (query.length > 400) {
    return res.json({ error: "Query is too long (max 400 chars)" });
  }

  const songs = (MUSIC_DB && MUSIC_DB.songs) || [];
  if (!songs.length) {
    return res.json({ found: false, results: [] });
  }

  const qClean = query.toLowerCase().trim();
  const lex = {};
  for (const [w, dims] of Object.entries(EN_MOOD_LEX)) {
    if (new RegExp("\\b" + w + "\\b", "i").test(qClean) || (w.length >= 4 && qClean.includes(w))) {
      for (const [d, v] of Object.entries(dims)) lex[d] = Math.max(lex[d] || 0, v);
    }
  }

  const qm = { moods: lex, energy: "medium", valence: "neutral" };
  if (lex.energy || lex.joy || lex.euphoria) { qm.energy = "high"; qm.valence = "positive"; }
  if (lex.calm || lex.sadness || lex.melancholy) { qm.energy = "low"; }
  if (lex.sadness || lex.heartbreak || lex.anger || lex.loneliness) { qm.valence = "negative"; }

  const scored = songs.map((song) => {
    const sm = song.moods || {};
    let sem = 0;
    if (Object.keys(sm).length && Object.keys(qm.moods).length) {
      let dot = 0, na = 0, nb = 0;
      for (const [k, v] of Object.entries(qm.moods)) { na += v * v; if (sm[k]) dot += v * sm[k]; }
      for (const v of Object.values(sm)) nb += v * v;
      sem = (!na || !nb) ? 0 : dot / (Math.sqrt(na) * Math.sqrt(nb));
    }

    let aud = 0;
    const vibe = song.analysis && song.analysis.vibe;
    if (vibe && Object.keys(qm.moods).length) {
      let acc = 0, wsum = 0;
      for (const [dim, w] of Object.entries(qm.moods)) {
        const mix = DIM_TO_VIBE[dim] || { [dim]: 1 };
        let dv = 0;
        for (const [vk, vw] of Object.entries(mix)) dv += ((vibe[vk] ?? 0) / 100) * vw;
        acc += dv * w;
        wsum += w;
      }
      aud = wsum ? Math.min(1, acc / wsum) : 0;
    }

    const tags = (song.tagsEn || song.tags || []).map((t) => String(t).toLowerCase());
    let hit = 0, n = 0;
    for (const [dim, v] of Object.entries(qm.moods)) {
      n += v;
      const enWords = MOOD_DIM_EN[dim] || [];
      if (enWords.some((ew) => tags.some((tg) => tg.includes(ew)))) hit += v;
    }
    const tag = n ? hit / n : 0;

    let score = 0.5 * sem + 0.3 * tag + 0.2 * aud;

    // Title & Artist match bonus
    const sName = String(song.name || "").toLowerCase();
    const sArtist = String(song.artist || "").toLowerCase();
    if (sName === qClean || sArtist === qClean) score += 1.5;
    else if (sName.includes(qClean) || sArtist.includes(qClean)) score += 1.0;
    else if (qClean.includes(sName) || qClean.includes(sArtist)) score += 0.8;

    // Direct tag match bonus
    if (tags.some((t) => t.includes(qClean) || qClean.includes(t))) score += 0.5;

    return {
      song,
      finalScore: score,
      parts: { semantic: Math.round(sem * 100) / 100, tags: Math.round(tag * 100) / 100, audio: Math.round(aud * 100) / 100 },
    };
  });

  scored.sort((a, b) => b.finalScore - a.finalScore);
  const top = scored.slice(0, 3);
  const results = top.map(({ song, finalScore, parts }) => ({
    id: song.id,
    name: song.name,
    artist: song.artist,
    src: song.src,
    tags: (song.tagsEn || song.tags || []).slice(0, 8),
    analysis: song.analysis || null,
    score: Math.round(finalScore * 100) / 100,
    parts,
    audioMoodTag: song.audioMoodEn || null,
    summary: song.summaryEn || null,
  }));
  const best = results[0] ? results[0].score : 0;

  res.setHeader("Cache-Control", "no-store");
  res.json({
    found: results.length > 0,
    song: results[0] || null,
    mood: { moods: qm.moods, energy: qm.energy, valence: qm.valence },
    bestScore: best,
    softMatch: best < 0.15,
    results,
  });
}
