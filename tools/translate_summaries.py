# Rewrite Persian DB fields (lyricsSummary, audioMoodTag) into English; drop nameFa/nameFaLiteral
import json, os, re, time, urllib.request

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE, "public", "api", "music-database.json")
KEY = open(os.path.join(os.environ["LOCALAPPDATA"], "Temp", ".moodkey"), encoding="utf-8").read().strip()
URL = "http://localhost:20128/v1/chat/completions"

def call(payload, timeout=60):
    req = urllib.request.Request(URL, data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + KEY}, method="POST")
    raw = urllib.request.urlopen(req, timeout=timeout).read().decode("utf-8", "replace")
    return json.JSONDecoder().raw_decode(raw)[0]

db = json.load(open(DB_PATH, encoding="utf-8"))
todo = [s for s in db["songs"] if (s.get("lyricsSummary") and not s.get("summaryEn")) or (s.get("audioMoodTag") and not s.get("audioMoodEn"))]
print("to translate:", len(todo))

for s in todo:
    user = (f"Translate this Persian description of a song into natural English (keep it 2-3 sentences). "
            f"Also translate the short mood label. Return STRICT JSON: "
            f'{{"summaryEn": "...", "moodEn": "..."}}\n\n'
            f'Label: {s.get("audioMoodTag","")}\nDescription: {s.get("lyricsSummary","")}')
    try:
        r = call({"model": "hermes",
                  "messages": [{"role": "system", "content": "Persian->English translator for music descriptions. STRICT JSON only."},
                               {"role": "user", "content": user}],
                  "temperature": 0, "max_tokens": 900})
        m = re.search(r"\{.*\}", r["choices"][0]["message"]["content"], re.S)
        obj = json.loads(m.group(0))
        if obj.get("summaryEn"): s["summaryEn"] = str(obj["summaryEn"]).strip()[:400]
        if obj.get("moodEn"): s["audioMoodEn"] = str(obj["moodEn"]).strip()[:60]
        print(" ok:", s["name"][:30])
        time.sleep(0.25)
    except Exception as e:
        print(" !!", s["name"], str(e)[:90])
    json.dump(db, open(DB_PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

# final: drop Persian-only UI fields
for s in db["songs"]:
    s.pop("nameFa", None)
    s.pop("nameFaLiteral", None)
json.dump(db, open(DB_PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=2)
en = sum(1 for s in db["songs"] if s.get("summaryEn"))
print(f"\nsummaryEn: {en}/46 | nameFa removed")
