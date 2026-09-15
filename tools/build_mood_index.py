# Mood-Matcher offline pipeline: lyrics fetch + LLM mood analysis for every song
# Usage: python tools/build_mood_index.py [--only-id N] [--no-llm]
import json, os, re, sys, time, urllib.request, urllib.parse

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE, "public", "api", "music-database.json")
LLM_KEY_FILE = os.path.join(os.environ["LOCALAPPDATA"], "Temp", ".moodkey")
LLM_URL = "http://localhost:20128/v1/chat/completions"
LLM_MODEL = "hermes"

# canonical mood dims (fa) — the semantic space songs & queries share
MOOD_DIMS = [
    "sadness", "longing", "nostalgia", "heartbreak", "loneliness",
    "joy", "playfulness", "romance", "sensuality", "warmth",
    "anger", "rebellion", "power", "defiance",
    "calm", "dreaminess", "melancholy", "hope",
    "darkness", "tension", "mystery",
    "energy", "euphoria", "reflection",
]


def http_json(url, payload=None, headers=None, timeout=30):
    req = urllib.request.Request(
        url,
        data=json.dumps(payload).encode() if payload else None,
        headers={"Content-Type": "application/json", **(headers or {})},
        method="POST" if payload else "GET",
    )
    raw = urllib.request.urlopen(req, timeout=timeout).read().decode("utf-8", "replace")
    return json.JSONDecoder().raw_decode(raw)[0]


# ---------- lyrics fetch (lrclib.net, free no-key API) ----------
def fetch_lyrics(artist, title):
    q = urllib.parse.urlencode({"artist_name": artist, "track_name": title})
    url = "https://lrclib.net/api/search?" + q
    try:
        arr = http_json(url, headers={"User-Agent": "portfolio-mood-matcher/1.0"})
    except Exception as e:
        return None, f"ERR {e}"
    for item in arr:
        text = item.get("parsed") or _strip_sync(item.get("syncedLyrics") or "")
        if text and len(text) > 80:
            return text.strip(), "ok"
    return None, "not-found"


def _strip_sync(synced):
    lines = []
    for ln in synced.splitlines():
        ln = re.sub(r"^\[\d+:\d+\.\d+\]\s*", "", ln.strip())
        if ln:
            lines.append(ln)
    return "\n".join(lines)


# ---------- LLM analysis ----------
SYSTEM = (
    "You are a music-mood analyst. Reply with STRICT JSON only, no markdown, no commentary."
)


def analyze_song(name, artist, lyrics, existing_tags):
    user = f"""Song: "{name}" by {artist}
Existing vibe tags (from a curator): {", ".join((existing_tags or [])[:14])}
Lyrics (may be truncated):
\"\"\"
{(lyrics or "(no lyrics available — analyze by title/artist/genre knowledge)")[:3000]}
\"\"\"

Return JSON exactly in this shape:
{{
  "summary": "2-3 sentence Persian summary of the song's emotional content",
  "moods": {{  // intensity 0.0-1.0 for ONLY the dims that apply (>=0.15); use keys from this list: {", ".join(MOOD_DIMS)} }},
  "audioMood": "one short Persian compound label like آرام-غمگین or پرانرژی-حماسی",
  "energy": "low|medium|high",
  "valence": "negative|neutral|positive",
  "lyricsTheme": "short fa phrase: main subject (e.g. جدایی، عشق اول، اعتراض اجتماعی)"
}}"""
    r = http_json(
        LLM_URL,
        {
            "model": LLM_MODEL,
            "messages": [
                {"role": "system", "content": SYSTEM},
                {"role": "user", "content": user},
            ],
            "temperature": 0,
            "max_tokens": 2500,
        },
        timeout=90,
    )
    content = r["choices"][0]["message"]["content"].strip()
    m = re.search(r"\{.*\}", content, re.S)
    if not m:
        raise ValueError("no JSON in LLM reply: " + content[:120])
    obj = json.loads(m.group(0))
    # sanitize moods: keep only allowed dims, clamp 0..1
    moods = {}
    for k, v in (obj.get("moods") or {}).items():
        k = str(k).strip().lower()
        if k in MOOD_DIMS:
            try:
                moods[k] = max(0.0, min(1.0, float(v)))
            except Exception:
                pass
    obj["moods"] = moods
    return obj


def main():
    only_id = None
    if "--only-id" in sys.argv:
        only_id = str(sys.argv[sys.argv.index("--only-id") + 1])
    no_llm = "--no-llm" in sys.argv

    key = None
    if not no_llm:
        if not os.path.isfile(LLM_KEY_FILE):
            print("missing", LLM_KEY_FILE)
            sys.exit(1)
        key = open(LLM_KEY_FILE, encoding="utf-8").read().strip()
        globals()["LLM_HDRS"] = {"Authorization": "Bearer " + key}
    db = json.load(open(DB_PATH, encoding="utf-8"))
    songs = db["songs"]
    done = skipped = 0

    for s in songs:
        if only_id and str(s["id"]) != str(only_id):
            continue
        # 1) lyrics
        if not s.get("lyrics"):
            text, status = fetch_lyrics(s["artist"], s["name"])
            if text:
                s["lyrics"] = text
                s["lyricsStatus"] = "fetched_by_agent"
                done += 1
            else:
                s["lyricsStatus"] = "missing"
                print(f"  [lyrics] id={s['id']} {s['artist']} - {s['name']} → {status}")
            time.sleep(0.4)

        # 2) mood analysis
        if not no_llm and not s.get("moods"):
            try:
                globals()["LLM_HDRS"] = {"Authorization": "Bearer " + key}
                obj = analyze_song(s["name"], s["artist"], s.get("lyrics"), s.get("tags"))
                s["lyricsSummary"] = obj.get("summary", "")
                s["moods"] = obj.get("moods", {})
                s["audioMoodTag"] = obj.get("audioMood", "")
                s["energy"] = obj.get("energy", "medium")
                s["valence"] = obj.get("valence", "neutral")
                print(f"  [mood] id={s['id']} {s['name'][:28]:28} top={sorted(obj['moods'].items(), key=lambda x: -x[1])[:3]}")
                time.sleep(0.6)
            except Exception as e:
                print(f"  !! id={s['id']} LLM failed: {str(e)[:120]}")

        if done >= 6:
            # incremental save to be crash-safe
            json.dump(db, open(DB_PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
            done = 0
            print("  (saved)")
    json.dump(db, open(DB_PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
    have_lyr = sum(1 for x in songs if x.get("lyrics"))
    have_mood = sum(1 for x in songs if x.get("moods"))
    print(f"\nDB saved: {have_lyr}/{len(songs)} lyrics, {have_mood}/{len(songs)} mood-analysed")


if __name__ == "__main__":
    # patch http_json to inject auth headers for LLM calls
    _orig = http_json
    def http_json(url, payload=None, headers=None, timeout=30):  # noqa: F811
        if "localhost:20128" in url:
            headers = {**(globals().get("LLM_HDRS") or {}), **(headers or {})}
        return _orig(url, payload, headers, timeout)
    main()
