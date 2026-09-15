#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
label_music.py — turn raw DSP features (tools/analyze_music.py output)
into human-true, library-calibrated labels and merge them INTO
music-database.json so both search runtimes and the player see them.

Per song adds:
  bpm        int            beats/min (octave-folded 88-176)
  energy     0-100          perceived loudness/intensity percentile
  dance      0-100          danceability percentile (bounded bounce × perc × tempo)
  bright     0-100          timbral brightness percentile (spectral centroid)
  vocals     0-100          vocal presence (0 for known instrumentals)
  dyn        0-100          dynamic range percentile (cinematic feel)
  vibe       {sad,happy,energetic,calm,focus,epic,romantic,dark} 0-100
             curated tag buckets + DSP cross-checks
Run:  python tools/label_music.py
"""
import json, os, math

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB = os.path.join(REPO, "public", "api", "music-database.json")
RAW = os.path.join(REPO, "public", "api", "music-analysis.json")

# known instrumentals (piano/score/fingerstyle covers) — vocals must be 0
INSTRUMENTAL_IDS = {14, 24, 25, 39, 44, 46}

# curated fa tags → vibe buckets (post-norm forms will be matched loosely)
BUCKETS = {
    "sad": ["جدایی","شکست عشقی","پشیمانی","درد","از دست دادن","دلتنگی","تنهایی",
            "اندوه","اندوهناک","غم","غمگین","حسرت","دلشکستگی","سرخوردگی","تلخ",
            "اشک","گریه","عاشقانه تلخ","غم شیرین","تاریک","دلهره","خشم","ناپیدا","دیده نشدن","انزوا","اتموسفریک"],
    "happy": ["شادی","خوشبختی","بشاش","جشن","فان","شاد و پرتحرک","خوشبینی",
              "تابستان","جوانی","خاطره","خاطرات","پیروزی","شور","لذت"],
    "energetic": ["پرانرژی","انرژی","انرژی مثبت","قدرت","قدرتمند","ریتم قوی","سرود",
                  "مبارزه","مبارزه زندگی","جاه‌طلبی","موفقیت","الهام","تاب‌آوری",
                  "اعتماد به نفس","گروو","طغیان","پیروزی","انگیزه","بازگشت","حرکت"],
    "dance": ["رقص","دنس پاپ","پاپ رقصی","پیست رقص","کلاب","دیسکو","مهمانی",
              "رقص اهسته","سوئینگ","هیپنوتیزم‌کننده","هیپنوتیزم کننده","گیرا","وایرال"],
    "calm": ["آرامش","آرام","ملایم","لطیف","خونسرد","اهسته","نرم","بی خیالی",
             "رویایی","اتمسفریک","ساده","گرمی"],
    "focus": ["تمرکز","مطالعه","بی کلام","پیانو"],
    "epic": ["حماسی","حماسه","سینمایی","موسیقی متن","دراماتیک","درام","فضا","کهکشان",
             "اکتشاف","سرنوشت","داستانی"],
    "romantic": ["عشق","عاشقانه","صمیمیت","صمیمانه","وفاداری","برای همیشه","تعهد",
                 "میل","همراه روح","عشق به خود","عشق جوانی","جذابیت","اغواگری"],
    "dark": ["تاریک","نوآر","دلهره","وسواس","وسواس فکری","درام"],
}

def norm_fa(s):
    reps = {"آ":"ا","أ":"ا","إ":"ا","ؤ":"و","ي":"ی","ك":"ک","ة":"ه","\u200c":" "}
    for a,b in reps.items(): s = s.replace(a,b)
    return s.strip().lower()

def bucket_scores(tags):
    tagsN = [norm_fa(t) for t in tags]
    out = {}
    for dim, words in BUCKETS.items():
        wN = [norm_fa(w) for w in words]
        hits = 0
        for t in tagsN:
            for w in wN:
                if t == w or (len(w) > 4 and w in t) or (len(t) > 4 and t in w):
                    hits += 1; break
        out[dim] = hits
    return out

def pct_rank(values, v):
    import statistics
    below = sum(1 for x in values if x <= v)
    return round(100.0 * below / len(values))

def clamp(x, lo=0, hi=100):
    return max(lo, min(hi, x))

def main():
    db = json.load(open(DB, encoding="utf-8"))
    raw = json.load(open(RAW, encoding="utf-8"))
    songs = db["songs"]
    feats = {sid: raw[str(sid)] for sid in (str(s["id"]) for s in songs) if str(sid) in raw}
    # normalize: raw keys may be str ids
    feats = {}
    for k, v in raw.items():
        try: feats[int(k)] = v
        except ValueError: pass

    allE = [f["energy"] for f in feats.values()]
    allB = [f["brightness"] for f in feats.values()]
    allD = [f["dyn"] for f in feats.values()]
    noninstr = [f["vocals_mod"] for k, f in feats.items() if k not in INSTRUMENTAL_IDS]

    for s in songs:
        f = feats.get(s["id"])
        if not f:
            continue
        tags = s.get("tags", [])
        bs = bucket_scores(tags)
        energy_pct = pct_rank(allE, f["energy"])
        bright_pct = pct_rank(allB, f["brightness"])
        dyn_pct = pct_rank(allD, f["dyn"])
        # bounded dance: bounce ratio saturates, percussive ratio capped
        beat = f["beat"]; pr = min(f["perc"], 1.5) / 1.5
        dance_raw = (beat / (beat + 6.0)) * (0.5 + pr) * (1.0 if 88 <= f["bpm"] <= 152 else 0.75) * (0.6 + f["energy"] * 1.5)
        # minor/major as bounded difference (ratio was unstable)
        mode_diff = max(-0.5, min(0.5, f["maj"] - f["mnr"])) if "maj" in f else 0.0
        vocal_pct = 0 if s["id"] in INSTRUMENTAL_IDS else clamp(
            round(25 + 75 * pct_rank(noninstr, f["vocals_mod"]) / 100.0))
        instr = s["id"] in INSTRUMENTAL_IDS

        vibe = {}
        vibe["sad"]      = clamp(round(bs["sad"]*22 + (20 if mode_diff < -0.12 else 8 if mode_diff < 0 else 0) + (10 if bright_pct < 40 else 0) + (6 if energy_pct < 45 else 0)))
        vibe["happy"]    = clamp(round(bs["happy"]*20 + (14 if mode_diff > 0.08 else 0) + (8 if bright_pct > 60 else 0) + bs["dance"]*4))
        vibe["energetic"]= clamp(round(bs["energetic"]*15 + energy_pct*0.45 + (10 if f["bpm"] >= 122 else 0)))
        vibe["calm"]     = clamp(round(bs["calm"]*16 + (100-energy_pct)*0.35 + (8 if f["bpm"] <= 110 else 0) - (6 if bs["energetic"] > 2 else 0)))
        vibe["focus"]    = clamp(round(bs["focus"]*28 + (30 if instr else 0) + (100-vocal_pct)*0.25))
        vibe["epic"]     = clamp(round(bs["epic"]*26 + dyn_pct*0.30 + bright_pct*0.15))
        vibe["romantic"] = clamp(round(bs["romantic"]*17 + vibe["calm"]*0.15))
        vibe["dark"]     = clamp(round(bs["dark"]*22 + (16 if mode_diff < -0.10 else 0) + (8 if bright_pct < 45 else 0)))

        s["analysis"] = {
            "bpm": f["bpm"],
            "energy": energy_pct,
            "dance": pct_rank(list(), 0) if False else None,  # placeholder replaced below
            "bright": bright_pct,
            "vocals": vocal_pct,
            "dyn": dyn_pct,
            "vibe": vibe,
        }
    # second pass for dance percentile (needs all dance_raw)
    dance_raws = {}
    for s in songs:
        f = feats.get(s["id"])
        if not f: continue
        pr = min(f["perc"], 1.5) / 1.5
        dance_raws[s["id"]] = (f["beat"]/(f["beat"]+6.0)) * (0.5+pr) * (1.0 if 88 <= f["bpm"] <= 152 else 0.75) * (0.6 + f["energy"]*1.5)
    drs = list(dance_raws.values())
    for s in songs:
        if "analysis" not in s: continue
        s["analysis"]["dance"] = pct_rank(drs, dance_raws[s["id"]])

    json.dump(db, open(DB, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("merged analysis into", len(dance_raws), "songs")
    # preview: top of each vibe dim
    for dim in ["sad","happy","energetic","calm","focus","epic","romantic","dark"]:
        top = sorted((s for s in songs if "analysis" in s), key=lambda s: -s["analysis"]["vibe"][dim])[:3]
        names = ", ".join(f'{s["name"][:20]}({s["analysis"]["vibe"][dim]})' for s in top)
        print(f"  {dim:9s} → {names}")
    top_e = sorted((s for s in songs if "analysis" in s), key=lambda s: -s["analysis"]["energy"])[:3]
    print("  energy%  →", ", ".join(f'{s["name"][:18]}({s["analysis"]["energy"]})' for s in top_e))

if __name__ == "__main__":
    main()
