/**
 * Deep Multi-Dimensional Emotion & Mood Intelligence Engine
 * Supports nuanced Persian & English NLP, sentiment negation, compound phrases,
 * artist/song aliases, and acoustic DSP vibe matching.
 */

export const MOOD_DIMS = [
  "sadness", "longing", "nostalgia", "heartbreak", "loneliness",
  "joy", "playfulness", "romance", "sensuality", "warmth",
  "anger", "rebellion", "power", "defiance",
  "calm", "dreaminess", "melancholy", "hope",
  "darkness", "tension", "mystery",
  "energy", "euphoria", "reflection"
];

export const ARTIST_ALIASES = {
  "امینم": "eminem",
  "امينم": "eminem",
  "ادل": "adele",
  "ابی": "abba",
  "ابا": "abba",
  "بیلی": "billie eilish",
  "بیلی ایلیش": "billie eilish",
  "بیلی آیلیش": "billie eilish",
  "هری": "harry styles",
  "هری استایلز": "harry styles",
  "لانا": "lana del rey",
  "لانا دل ری": "lana del rey",
  "شکیرا": "shakira",
  "مایکل": "michael jackson",
  "مایکل جکسون": "michael jackson",
  "ویکند": "the weeknd",
  "د ویکند": "the weeknd",
  "ایمجین دراگونز": "imagine dragons",
  "دراگون": "imagine dragons",
  "تیلور": "taylor swift",
  "تیلور سویفت": "taylor swift",
  "تایلور": "taylor swift",
  "زاز": "zaz",
  "جبران": "gibran alcocer",
  "جبران الکوثر": "gibran alcocer",
  "اد شیرن": "ed sheeran",
  "اد شیران": "ed sheeran",
  "دوآ لیپا": "dua lipa",
  "دوا لیپا": "dua lipa",
  "کیس": "kiss",
  "آئورا": "aurora",
  "اورورا": "aurora",
  "کولدپلی": "coldplay",
  "کلدپلی": "coldplay",
  "لینکین پارک": "scott d. davis",
  "بک استریت": "backstreet boys",
  "تیم ایمپالا": "tame impala",
  "د فور وی دی": "d4vd",
  "هارملس": "harmless",
  "ماریاس": "the marías",
  "وایت استریپس": "the white stripes",
  "جاستین بیبر": "justin bieber",
};

// Highest precedence compound phrases
export const COMPOUND_PHRASES = [
  { pattern: /(?:شکست عشقی|دلشکسته|دل شکسته|قلب شکسته|پایان عشق|جدایی تلخ|کات کردیم|ترکم کرد|ولم کرد|خیانت دیدم|بی وفایی)/i, dims: { heartbreak: 1.0, sadness: 0.9, melancholy: 0.65 }, energy: "low", valence: "negative", labelFa: "شکست عشقی و دلشکستگی", labelEn: "Heartbreak & Sorrow" },
  { pattern: /(?:دلم تنگ شده|دلم براش تنگ شده|تنگ غروب|خیلی دلتنگم|حس دلتنگی|جای خالیش|بدون اون|بی تو بودن)/i, dims: { longing: 1.0, nostalgia: 0.75, sadness: 0.55 }, energy: "low", valence: "negative", labelFa: "دلتنگی و حسرت", labelEn: "Longing & Nostalgia" },
  { pattern: /(?:حالم بده|حالم خراب|حال خراب|دلم گرفته|بغض دارم|اشکم در اومده|گریه ام گرفته|گریم گرفته|داغونم|داغون شدم|خیلی ناراحتم|افسرده شدم|پوکیدم از غم)/i, dims: { sadness: 1.0, melancholy: 0.85, heartbreak: 0.5 }, energy: "low", valence: "negative", labelFa: "غم و اندوه عمیق", labelEn: "Deep Sadness & Grief" },
  { pattern: /(?:خیلی خستم|خیلی خسته ام|خسته از همه چی|از کار خسته|طاقتم تموم|بریدم از همه|نا ندارم|جون ندارم|بی رمق|کوفته و خسته|خوابم میاد|برای خواب|خواب آور|خستگی در کردن)/i, dims: { calm: 0.95, melancholy: 0.7, reflection: 0.65, sadness: 0.4 }, energy: "low", valence: "neutral", labelFa: "خستگی و نیاز به آرامش", labelEn: "Exhaustion & Soothing Calm" },
  { pattern: /(?:حال خوب|حالم خوبه|خیلی خوشحالم|خیلی شادم|سرشار از شادی|بزن و بکوب|شاد و رقص|پارتی و رقص|مهمونی و دورهمی)/i, dims: { joy: 1.0, euphoria: 0.95, energy: 0.85 }, energy: "high", valence: "positive", labelFa: "شادی و سرخوشی", labelEn: "Joy & Euphoria" },
  { pattern: /(?:درس و مطالعه|تمرکز برای کار|کدنویسی و تمرکز|آرامش ذهن و تمرکز|موزیک ملایم برای کار|درون نگری)/i, dims: { reflection: 1.0, calm: 0.8, focus: 0.9 }, energy: "medium", valence: "neutral", labelFa: "تمرکز و مطالعه", labelEn: "Deep Focus & Reflection" },
  { pattern: /(?:ورزش و باشگاه|تمرین بدنسازی|انرژی بالا و بمب|موزیک تمرین|دویدن و ورزش|قدرت و اراده|انگیزشی و حماسی)/i, dims: { energy: 1.0, power: 0.95, defiance: 0.85 }, energy: "high", valence: "positive", labelFa: "انرژی بالا و انگیزه", labelEn: "High Energy & Motivation" },
  { pattern: /(?:عاشقانه و رویایی|حس ناب عاشقی|دوستت دارم|عشق واقعی|آغوش و بوسه|عاشقانه های دونفره)/i, dims: { romance: 1.0, warmth: 0.85, dreaminess: 0.6 }, energy: "medium", valence: "positive", labelFa: "عاشقانه و احساسی", labelEn: "Romantic & Warm" },
  { pattern: /(?:یاد قدیما|خاطرات گذشته|نوستالژی قدیمی|روزهای رفته|یادش بخیر گذشته)/i, dims: { nostalgia: 1.0, longing: 0.75, reflection: 0.6 }, energy: "low", valence: "neutral", labelFa: "نوستالژی و خاطرات", labelEn: "Nostalgic Memories" },
];

export const MOOD_LEXICON = [
  // Sadness / Grief / Pain / Tears
  { pattern: /(?:غمگین|غمناک|غم ناک|ناراحت|غم|غصه|بغض|اشک|گریه|گریستن|گریه دار|گریه‌دار|افسرده|افسردگی|دپرس|ماتم|سوگ|عذاب|زجر|بدبخت|مصیبت|ناامید|پوچ)/i, dims: { sadness: 0.95, melancholy: 0.7 }, energy: "low", valence: "negative", labelFa: "غمگین و ناراحت", labelEn: "Sadness" },
  { pattern: /\b(?:sad|sadness|unhappy|sorrow|grief|pain|hurting|hurt|tears|crying|cry|depressed|depression|down|gloomy|weeping|miserable|devastated|mourning|sorrowful|hopeless)\b/i, dims: { sadness: 0.95, melancholy: 0.7 }, energy: "low", valence: "negative", labelFa: "غمگین و ناراحت", labelEn: "Sadness" },

  // Longing / Missing / Distance
  { pattern: /(?:دلتنگ|دلتنگی|دوری|فاصله|چشم به راه|منتظر|انتظار|حسرت|بی تو|بدون تو|جای خالی|نبودن)/i, dims: { longing: 0.95, sadness: 0.5 }, energy: "low", valence: "negative", labelFa: "دلتنگی و دوری", labelEn: "Longing" },
  { pattern: /\b(?:longing|miss|missing|yearn|yearning|wish|distance|away|craving|long for|miss you|distant)\b/i, dims: { longing: 0.95, sadness: 0.5 }, energy: "low", valence: "negative", labelFa: "دلتنگی و دوری", labelEn: "Longing" },

  // Nostalgia / Memories / Retro / Past
  { pattern: /(?:نوستالژی|نوستالژیک|خاطره|خاطرات|خاطره انگیز|یادش بخیر|گذشته|قدیما|قدیمی|بچگی|کودکی|دوران قدیم|روزهای رفته|یادگاری|دهه شصت|دهه ۶۰|گذشته ها)/i, dims: { nostalgia: 0.95, reflection: 0.6 }, labelFa: "نوستالژی و خاطره", labelEn: "Nostalgia" },
  { pattern: /\b(?:nostalgia|nostalgic|memory|memories|reminisce|past|retro|vintage|childhood|old days|flashback|yesterday|remember)\b/i, dims: { nostalgia: 0.95, reflection: 0.6 }, labelFa: "نوستالژی و خاطره", labelEn: "Nostalgia" },

  // Heartbreak / Breakup
  { pattern: /(?:شکست|دلشکسته|دل شکسته|قلب شکسته|کات|ترکم|ولم|جدایی|نامرد|نامردی|خیانت|بی وفا|بی وفایی|باختم|طلاق|تموم)/i, dims: { heartbreak: 0.95, sadness: 0.8 }, energy: "low", valence: "negative", labelFa: "شکست عشقی", labelEn: "Heartbreak" },
  { pattern: /\b(?:heartbreak|heartbroken|breakup|divorce|broken|rejected|betrayal|cheated|ex|dumped|shattered|left me|lost love|split up)\b/i, dims: { heartbreak: 0.95, sadness: 0.8 }, energy: "low", valence: "negative", labelFa: "شکست عشقی", labelEn: "Heartbreak" },

  // Loneliness / Solitude
  { pattern: /(?:تنها|تنهایی|بی کس|بی کسی|هیچکس|غریب|غربت|انزوا|منو خودم|خلوت|گوشه گیر|بی همدم)/i, dims: { loneliness: 0.95, sadness: 0.6 }, energy: "low", valence: "negative", labelFa: "تنهایی و انزوا", labelEn: "Loneliness" },
  { pattern: /\b(?:lonely|loneliness|alone|solitude|isolated|isolation|empty|abandoned|outcast|by myself)\b/i, dims: { loneliness: 0.95, sadness: 0.6 }, energy: "low", valence: "negative", labelFa: "تنهایی و انزوا", labelEn: "Loneliness" },

  // Joy / Happiness / Smile
  { pattern: /(?:شاد|شادی|شادمان|شادمانی|خوشحال|خوشحالی|خنده|لبخند|ذوق|عالی|خوشبخت|خوشبختی|کیف|سرور|پرنشاط|حس خوب|بشکن)/i, dims: { joy: 0.95, euphoria: 0.6 }, energy: "high", valence: "positive", labelFa: "شاد و خوشحال", labelEn: "Joyful" },
  { pattern: /\b(?:happy|happiness|joy|joyful|cheerful|glad|smile|delight|sunshine|celebrate|pleased|blessed|good vibes|feel good|great)\b/i, dims: { joy: 0.95, euphoria: 0.6 }, energy: "high", valence: "positive", labelFa: "شاد و خوشحال", labelEn: "Joyful" },

  // Playfulness / Fun / Silly
  { pattern: /(?:شوخ|شوخی|شیطنت|بامزه|سرگرمی|فان|تفریح|باحال|خنده دار|لودگی|مسخره بازی)/i, dims: { playfulness: 0.9, joy: 0.7 }, energy: "high", valence: "positive", labelFa: "شوخ و شاد", labelEn: "Playful" },
  { pattern: /\b(?:playful|fun|silly|quirky|cheeky|amusing|funny|playfulness)\b/i, dims: { playfulness: 0.9, joy: 0.7 }, energy: "high", valence: "positive", labelFa: "شوخ و شاد", labelEn: "Playful" },

  // Romance / Love
  { pattern: /(?:عاشق|عاشقی|عاشقانه|عشق|رمانتیک|دوست داشتن|دوست دارم|لاو|معشوق|عشقولانه|یار|دلبر|جانان|بوس|بوسه|بغل|آغوش|ولنتاین|عشقم|عاشقتم|مهر)/i, dims: { romance: 0.95, warmth: 0.7 }, energy: "medium", valence: "positive", labelFa: "عاشقانه و رمانتیک", labelEn: "Romance" },
  { pattern: /\b(?:romance|romantic|love|lover|loving|crush|sweetheart|kiss|kissing|cuddle|beloved|in love|adore|affection)\b/i, dims: { romance: 0.95, warmth: 0.7 }, energy: "medium", valence: "positive", labelFa: "عاشقانه و رمانتیک", labelEn: "Romance" },

  // Sensuality
  { pattern: /(?:جذاب|سکسی|هوس|شهوت|داغ|پرشور|فریبنده|صمیمیت شدید|طناز|افسونگر)/i, dims: { sensuality: 0.9, romance: 0.6 }, labelFa: "پرشور و جذاب", labelEn: "Sensual" },
  { pattern: /\b(?:sensual|sexy|intimate|passion|desire|seductive|sultry|hot|lust|attraction)\b/i, dims: { sensuality: 0.9, romance: 0.6 }, labelFa: "پرشور و جذاب", labelEn: "Sensual" },

  // Warmth / Comfort / Cozy
  { pattern: /(?:گرما|گرم|صمیمی|صمیمیت|مهربانی|دلنشین|لطیف|دلگرم|دلگرمی|دنج|باصفا|آرامش بخش|نوازش|دلپذیر)/i, dims: { warmth: 0.9, calm: 0.6 }, energy: "low", valence: "positive", labelFa: "گرم و دلنشین", labelEn: "Warm & Cozy" },
  { pattern: /\b(?:warm|warmth|cozy|comfort|tender|gentle|kindness|snug|soothing|safe)\b/i, dims: { warmth: 0.9, calm: 0.6 }, energy: "low", valence: "positive", labelFa: "گرم و دلنشین", labelEn: "Warm & Cozy" },

  // Anger / Rage / Hate
  { pattern: /(?:عصبانی|عصبانیت|خشم|خشمگین|کلافه|حرص|داد|فریاد|متنفرم|تنفر|غیظ|اعصاب خوردی|شاکی|کفری|پرخاش|کینه|انتقام)/i, dims: { anger: 0.95, tension: 0.7 }, energy: "high", valence: "negative", labelFa: "عصبانی و خشمگین", labelEn: "Angry & Intense" },
  { pattern: /\b(?:anger|angry|rage|furious|mad|hate|frustrated|annoyed|pissed|wrath|irritated|bitter)\b/i, dims: { anger: 0.95, tension: 0.7 }, energy: "high", valence: "negative", labelFa: "عصبانی و خشمگین", labelEn: "Angry & Intense" },

  // Rebellion / Protest / Riot
  { pattern: /(?:یاغی|سرکشی|طغیان|شورش|مبارزه|اعتراض|زیر بار نرفتن|عصیان|ضد جریان|سرکش|قانون شکن)/i, dims: { rebellion: 0.95, defiance: 0.8 }, energy: "high", labelFa: "سرکش و معترض", labelEn: "Rebellious" },
  { pattern: /\b(?:rebel|rebellion|fight|protest|riot|resist|anarchist|revolution|stand up)\b/i, dims: { rebellion: 0.95, defiance: 0.8 }, energy: "high", labelFa: "سرکش و معترض", labelEn: "Rebellious" },

  // Power / Strength / Epic / Victory
  { pattern: /(?:قدرت|قدرتمند|قوی|باصلابت|قهرمان|اراده|شکست ناپذیر|پیروزی|برد|شاه|بمب|انفجاری|سنگین|حماسی|اپیک|شاهکار|باشکوه|حماسه)/i, dims: { power: 0.95, energy: 0.8 }, energy: "high", valence: "positive", labelFa: "حماسی و قدرتمند", labelEn: "Epic & Powerful" },
  { pattern: /\b(?:power|powerful|strong|strength|epic|triumph|victory|unstoppable|champion|king|invincible|mighty|conquer)\b/i, dims: { power: 0.95, energy: 0.8 }, energy: "high", valence: "positive", labelFa: "حماسی و قدرتمند", labelEn: "Epic & Powerful" },

  // Defiance / Bravery / Bold
  { pattern: /(?:شجاعت|جسارت|ایستادگی|باج ندادن|سرسخت|نترس|بی‌باک|جسور|پررو|کم نیار|کوتاه نیا|مقاومت|با اراده)/i, dims: { defiance: 0.95, power: 0.7 }, energy: "high", labelFa: "جسور و نترس", labelEn: "Defiant & Bold" },
  { pattern: /\b(?:defiant|defiance|fearless|brave|bold|undefeated|courage|dare|unbowed)\b/i, dims: { defiance: 0.95, power: 0.7 }, energy: "high", labelFa: "جسور و نترس", labelEn: "Defiant & Bold" },

  // Calm / Peace / Sleep / Relax
  { pattern: /(?:آرام|آرامش|آروم|ریلکس|ملایم|سکوت|صلح|بی استرس|استراحت|خواب|خواب آور|برای خواب|خوابم میاد|بی کلام|پیانو|ریلکسیشن|یوگا|مدیتیشن|لایت|بی صدا|آسوده|آسایش)/i, dims: { calm: 0.95, reflection: 0.5 }, energy: "low", valence: "positive", labelFa: "آرامش بخش و ملایم", labelEn: "Calm & Peaceful" },
  { pattern: /\b(?:calm|peace|peaceful|quiet|relax|relaxing|relaxed|chill|chilling|sleep|sleepy|soothing|serene|tranquil|meditative|rest|gentle|soft)\b/i, dims: { calm: 0.95, reflection: 0.5 }, energy: "low", valence: "positive", labelFa: "آرامش بخش و ملایم", labelEn: "Calm & Peaceful" },

  // Tiredness / Exhaustion / Burnout
  { pattern: /(?:خسته|خستگی|خستم|خیلی خستم|بریدن|بریدم|بی حال|بیحال|بی رمق|کوفته|فرسوده|نا ندارم|جون ندارم|پوکیدم)/i, dims: { calm: 0.85, melancholy: 0.65, reflection: 0.6, sadness: 0.4 }, energy: "low", valence: "neutral", labelFa: "خسته و نیازمند استراحت", labelEn: "Tired & Weary" },
  { pattern: /\b(?:tired|exhausted|fatigued|burnout|weary|worn out|drained|tiredness|exhaustion|sleepy|need rest)\b/i, dims: { calm: 0.85, melancholy: 0.65, reflection: 0.6, sadness: 0.4 }, energy: "low", valence: "neutral", labelFa: "خسته و نیازمند استراحت", labelEn: "Tired & Weary" },

  // Dreaminess / Fantasy / Night
  { pattern: /(?:رویایی|رویا|خیال|فانتزی|ابر|ابرها|آسمان|ستاره|شب|مهتاب|وهم آلود|فضا|کیهانی|ماه|در خیال|افسون)/i, dims: { dreaminess: 0.95, calm: 0.5 }, labelFa: "رویایی و خیال انگیز", labelEn: "Dreamy & Ethereal" },
  { pattern: /\b(?:dream|dreamy|dreaming|ethereal|floating|stars|night|starlight|mystical|fantasy|cloud|universe|sky)\b/i, dims: { dreaminess: 0.95, calm: 0.5 }, labelFa: "رویایی و خیال انگیز", labelEn: "Dreamy & Ethereal" },

  // Melancholy / Gloom / Rain / Autumn
  { pattern: /(?:ملانکولی|دلگیر|ابری|باران|بارونی|باران پاییزی|پاییز|غروب|حال سنگین|سکوت غمگین|خستگی روحی|هوای گرفته|پاییزی)/i, dims: { melancholy: 0.95, sadness: 0.6, calm: 0.4 }, energy: "low", labelFa: "ملانکولیک و بارانی", labelEn: "Melancholy & Rainy" },
  { pattern: /\b(?:melancholy|melancholic|somber|wistful|rain|rainy|autumn|dreary|gloomy|moody)\b/i, dims: { melancholy: 0.95, sadness: 0.6, calm: 0.4 }, energy: "low", labelFa: "ملانکولیک و بارانی", labelEn: "Melancholy & Rainy" },

  // Hope / Optimism
  { pattern: /(?:امید|امیدواری|پرامید|نور|روشنایی|آینده|ایمان|توکل|معجزه|طلوع|صبح|روز روشن|ساختن|موفقیت|به امید)/i, dims: { hope: 0.95, joy: 0.5 }, energy: "medium", valence: "positive", labelFa: "امیدبخش و روشن", labelEn: "Hopeful & Bright" },
  { pattern: /\b(?:hope|hopeful|optimism|bright|light|believe|tomorrow|sunrise|future|faith|miracle)\b/i, dims: { hope: 0.95, joy: 0.5 }, energy: "medium", valence: "positive", labelFa: "امیدبخش و روشن", labelEn: "Hopeful & Bright" },

  // Darkness / Shadow / Gothic
  { pattern: /(?:تاریک|دارک|سیاه|ظلمت|سایه|گوتیک|مخوف|سنگین|بی رحم|شب تاریک|وحشت|شیطانی)/i, dims: { darkness: 0.95, tension: 0.6 }, energy: "medium", valence: "negative", labelFa: "دارک و سنگین", labelEn: "Dark & Sinister" },
  { pattern: /\b(?:dark|darkness|shadow|gothic|sinister|black|evil|obscure|creepy)\b/i, dims: { darkness: 0.95, tension: 0.6 }, energy: "medium", valence: "negative", labelFa: "دارک و سنگین", labelEn: "Dark & Sinister" },

  // Tension / Stress / Anxiety
  { pattern: /(?:اضطراب|استرس|تنش|دلهره|هیجان منفی|تپش قلب|نگرانی|سراسیمه|درام|دلشوره|ترس|هول)/i, dims: { tension: 0.95, darkness: 0.5 }, energy: "high", valence: "negative", labelFa: "پرتنش و دراماتیک", labelEn: "Tense & Dramatic" },
  { pattern: /\b(?:tension|tense|dramatic|anxious|anxiety|stress|stressed|nervous|panic|suspense|thriller|thrill)\b/i, dims: { tension: 0.95, darkness: 0.5 }, energy: "high", valence: "negative", labelFa: "پرتنش و دراماتیک", labelEn: "Tense & Dramatic" },

  // Mystery / Secret
  { pattern: /(?:مرموز|رمزآلود|معما|پنهان|راز|مبهم|ناشناخته|رازآلود|اسرار|رازآمیز)/i, dims: { mystery: 0.95, dreaminess: 0.5 }, labelFa: "مرموز و رازآلود", labelEn: "Mysterious" },
  { pattern: /\b(?:mystery|mysterious|secret|enigmatic|occult|hidden|puzzle|riddle)\b/i, dims: { mystery: 0.95, dreaminess: 0.5 }, labelFa: "مرموز و رازآلود", labelEn: "Mysterious" },

  // Energy / Workout / Gym / Hype
  { pattern: /(?:انرژی|پرانرژی|اکتیو|هیجان|ورزش|باشگاه|بدنسازی|دویدن|تمرین|تند|بیس دار|رپ|پمپ|بترکون|هایپ|بوکس|مسابقه|انرژی بالا|قدرتی)/i, dims: { energy: 0.95, power: 0.7 }, energy: "high", valence: "positive", labelFa: "پرانرژی و اکتیو", labelEn: "Energetic & Pumped" },
  { pattern: /\b(?:energy|energetic|hype|hyped|workout|gym|running|upbeat|pumped|training|fitness|fast|sport|exercise|hardcore|power workout)\b/i, dims: { energy: 0.95, power: 0.7 }, energy: "high", valence: "positive", labelFa: "پرانرژی و اکتیو", labelEn: "Energetic & Pumped" },

  // Euphoria / Dance / Party / Club
  { pattern: /(?:سرخوشی|اکستازی|پرواز|حس پرواز|رقص|پارتی|جشن|دنس|کلاب|شاد و رقص|دی جی|بترکونیم|پایکوبی|عروسی|مهمونی|قر)/i, dims: { euphoria: 0.95, energy: 0.85, joy: 0.8 }, energy: "high", valence: "positive", labelFa: "سرخوش و رقصی", labelEn: "Euphoric & Dance" },
  { pattern: /\b(?:euphoria|euphoric|party|dance|dancing|club|rave|celebration|disco|dancefloor|ecstasy)\b/i, dims: { euphoria: 0.95, energy: 0.85, joy: 0.8 }, energy: "high", valence: "positive", labelFa: "سرخوش و رقصی", labelEn: "Euphoric & Dance" },

  // Reflection / Focus / Study / Coding / Work
  { pattern: /(?:تمرکز|فکر|تفکر|تأمل|درس|مطالعه|کار|کتاب|کد|کدنویسی|برنامه‌نویسی|درون نگری|عمیق|فلسفی|ذهن|هوش|موزیک کار)/i, dims: { reflection: 0.95, calm: 0.6 }, energy: "medium", labelFa: "تمرکز و تعمق", labelEn: "Reflective & Focused" },
  { pattern: /\b(?:reflection|reflective|thinking|thoughtful|focus|focusing|study|studying|reading|coding|programming|contemplation|deep thought|work|working)\b/i, dims: { reflection: 0.95, calm: 0.6 }, energy: "medium", labelFa: "تمرکز و تعمق", labelEn: "Reflective & Focused" },
];

export const DIM_TO_VIBE = {
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

export function normalizeText(s) {
  return String(s || "")
    .toLowerCase()
    .replace(/[يكأإآةۀؤئەٱ]/g, (ch) => ({
      "ي": "ی", "ك": "ک", "أ": "ا", "إ": "ا", "آ": "ا",
      "ة": "ه", "ۀ": "ه", "ؤ": "و", "ئ": "ی", "ە": "ه", "ٱ": "ا",
    }[ch]))
    .replace(/[\u064B-\u0652\u0640\u200C]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

export function extractMoodFromQuery(query) {
  const normQ = normalizeText(query);
  const moods = {};
  let detectedEnergy = "medium";
  let detectedValence = "neutral";
  let labelFa = "";
  let labelEn = "";

  // 1. Check Compound Phrases first (highest priority)
  let compoundMatched = false;
  for (const entry of COMPOUND_PHRASES) {
    if (entry.pattern.test(query) || entry.pattern.test(normQ)) {
      for (const [dim, weight] of Object.entries(entry.dims)) {
        moods[dim] = Math.max(moods[dim] || 0, weight);
      }
      if (entry.energy) detectedEnergy = entry.energy;
      if (entry.valence) detectedValence = entry.valence;
      if (entry.labelFa && !labelFa) labelFa = entry.labelFa;
      if (entry.labelEn && !labelEn) labelEn = entry.labelEn;
      compoundMatched = true;
    }
  }

  // 2. Check negations
  const isNegatedJoy = /(?:شاد نیست|خوشحال نیست|حالم خوب نیست|خوب نیستم|اصلا شاد|شادی نیست|شاد نباش)/.test(normQ);
  const isNegatedSad = /(?:غمگین نباش|ناراحت نباش|غم نباش|غمگین نیست|نمیخوام غمگین)/.test(normQ);
  const isNegatedCalm = /(?:خسته نیست|آروم نباش|خواب آور نباش)/.test(normQ);

  if (isNegatedJoy) {
    moods.sadness = 0.9;
    moods.melancholy = 0.8;
    moods.joy = 0;
    detectedEnergy = "low";
    detectedValence = "negative";
    labelFa = "غمگین و ناراحت";
    labelEn = "Sad & Down";
  } else if (isNegatedSad) {
    moods.joy = 0.85;
    moods.energy = 0.8;
    moods.sadness = 0;
    detectedEnergy = "high";
    detectedValence = "positive";
    labelFa = "شاد و پرانرژی";
    labelEn = "Joyful & Upbeat";
  } else if (isNegatedCalm) {
    moods.energy = 0.9;
    moods.power = 0.75;
    moods.calm = 0;
    detectedEnergy = "high";
  }

  // 3. Regular lexical match
  for (const entry of MOOD_LEXICON) {
    if (entry.pattern.test(query) || entry.pattern.test(normQ)) {
      if (compoundMatched && detectedValence === "negative" && entry.valence === "positive") {
        continue;
      }
      for (const [dim, weight] of Object.entries(entry.dims)) {
        moods[dim] = Math.max(moods[dim] || 0, weight);
      }
      if (!compoundMatched && entry.energy) detectedEnergy = entry.energy;
      if (!compoundMatched && entry.valence) detectedValence = entry.valence;
      if (!labelFa && entry.labelFa) labelFa = entry.labelFa;
      if (!labelEn && entry.labelEn) labelEn = entry.labelEn;
    }
  }

  // Energy / Valence defaults
  if (detectedEnergy === "high") moods.energy = Math.max(moods.energy || 0, 0.4);
  if (detectedEnergy === "low") moods.calm = Math.max(moods.calm || 0, 0.4);
  if (detectedValence === "positive") moods.joy = Math.max(moods.joy || 0, 0.35);
  if (detectedValence === "negative") moods.sadness = Math.max(moods.sadness || 0, 0.35);

  if (!labelFa) {
    const sortedDims = Object.entries(moods).sort((a, b) => b[1] - a[1]);
    if (sortedDims[0]) {
      const topDim = sortedDims[0][0];
      const entry = MOOD_LEXICON.find((e) => e.dims[topDim]);
      if (entry) {
        labelFa = entry.labelFa;
        labelEn = entry.labelEn;
      }
    }
  }

  return {
    moods,
    energy: detectedEnergy,
    valence: detectedValence,
    labelFa: labelFa || "احساس شناسایی شده",
    labelEn: labelEn || "Detected Mood",
  };
}

export function executeMoodSearch(songs, queryRaw) {
  const query = String(queryRaw || "").trim();
  const normQ = normalizeText(query);
  const qm = extractMoodFromQuery(query);

  const scored = (songs || []).map((song) => {
    const sm = song.moods || {};
    let sem = 0;
    if (Object.keys(sm).length && Object.keys(qm.moods).length) {
      let dot = 0, na = 0, nb = 0;
      for (const [k, v] of Object.entries(qm.moods)) {
        na += v * v;
        if (sm[k]) dot += v * sm[k];
      }
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

    if (song.analysis) {
      if (qm.energy === "high" && song.analysis.energy >= 60) aud += 0.15;
      if (qm.energy === "low" && song.analysis.energy <= 45) aud += 0.15;
    }

    const faTags = (song.tags || []).map(normalizeText);
    const enTags = (song.tagsEn || []).map((t) => String(t).toLowerCase());
    let tagHit = 0;
    const qWords = normQ.split(/\s+/).filter((w) => w.length >= 2);
    for (const qw of qWords) {
      if (faTags.some((t) => t === qw)) tagHit += 0.35;
      else if (faTags.some((t) => t.includes(qw) || qw.includes(t))) tagHit += 0.15;
      if (enTags.some((t) => t === qw)) tagHit += 0.35;
      else if (enTags.some((t) => t.includes(qw) || qw.includes(t))) tagHit += 0.15;
    }
    const tag = Math.min(1, tagHit);

    let score = 0.55 * sem + 0.20 * tag + 0.25 * aud;

    // Direct name / artist match bonus
    const sNameNorm = normalizeText(song.name);
    const sArtistNorm = normalizeText(song.artist);
    if (sNameNorm === normQ || sArtistNorm === normQ) score += 3.0;
    else if (sNameNorm.includes(normQ) || sArtistNorm.includes(normQ)) score += 2.0;
    else if (normQ.length >= 4 && (normQ.includes(sNameNorm) || normQ.includes(sArtistNorm))) score += 1.5;

    // Check artist aliases (e.g. searching "امینم" or "ادل")
    for (const [faName, enName] of Object.entries(ARTIST_ALIASES)) {
      if (normQ.includes(faName)) {
        if (sArtistNorm.includes(enName)) {
          score += 2.5;
        }
      }
    }

    return {
      song,
      finalScore: score,
      parts: {
        semantic: Math.round(sem * 100) / 100,
        tags: Math.round(tag * 100) / 100,
        audio: Math.round(aud * 100) / 100,
      },
    };
  });

  scored.sort((a, b) => b.finalScore - a.finalScore);
  const top = scored.slice(0, 5);
  const results = top.map(({ song, finalScore, parts }) => ({
    id: song.id,
    name: song.name,
    artist: song.artist,
    src: song.src,
    tags: (song.tagsEn || song.tags || []).slice(0, 8),
    tagsFa: (song.tags || []).slice(0, 8),
    analysis: song.analysis || null,
    score: Math.round(finalScore * 100) / 100,
    parts,
    audioMoodTag: song.audioMoodTag || song.audioMoodEn || null,
    audioMoodEn: song.audioMoodEn || null,
    summary: song.lyricsSummary || song.summaryEn || null,
    summaryEn: song.summaryEn || null,
  }));
  const best = results[0] ? results[0].score : 0;

  return {
    found: results.length > 0,
    song: results[0] || null,
    mood: {
      moods: qm.moods,
      energy: qm.energy,
      valence: qm.valence,
      labelFa: qm.labelFa,
      labelEn: qm.labelEn,
    },
    bestScore: best,
    softMatch: best < 0.15,
    results,
  };
}
