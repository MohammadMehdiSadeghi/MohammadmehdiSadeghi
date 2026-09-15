# Add Persian phonetic transliteration (nameFa) for every song title (+ Persian genre word where apt)
import json, os, re, time, urllib.request

BASE = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
DB_PATH = os.path.join(BASE, "public", "api", "music-database.json")
KEY = open(os.path.join(os.environ["LOCALAPPDATA"], "Temp", ".moodkey"), encoding="utf-8").read().strip()
URL = "http://localhost:20128/v1/chat/completions"

def call(payload, timeout=90):
    req = urllib.request.Request(URL, data=json.dumps(payload).encode(),
        headers={"Content-Type": "application/json", "Authorization": "Bearer " + KEY}, method="POST")
    raw = urllib.request.urlopen(req, timeout=timeout).read().decode("utf-8", "replace")
    return json.JSONDecoder().raw_decode(raw)[0]

db = json.load(open(DB_PATH, encoding="utf-8"))
todo = [s for s in db["songs"] if not s.get("nameFa")]
print("to transliterate:", len(todo))

for s in todo:
    user = ('For each song below, write the PERSIAN phonetic spelling a Persian user would type '
            'for the TITLE, and a short Persian translation of the title in parentheses.\n'
            'Song: "' + s["name"] + '" by ' + s["artist"] + '\n'
            'Return STRICT JSON: {"nameFa": "تلفظ فارسی", "nameFaLiteral": "ترجمه فارسی عنوان"}')
    try:
        r = call({"model": "hermes",
                  "messages": [{"role": "system", "content": "Persian transliteration assistant. STRICT JSON only."},
                               {"role": "user", "content": user}],
                  "temperature": 0, "max_tokens": 800})
        content = r["choices"][0]["message"]["content"]
        m = re.search(r"\{.*\}", content, re.S)
        obj = json.loads(m.group(0))
        s["nameFa"] = str(obj.get("nameFa", "")).strip()[:80]
        s["nameFaLiteral"] = str(obj.get("nameFaLiteral", "")).strip()[:80]
        print(" ", s["name"], "→", s["nameFa"])
        time.sleep(0.3)
    except Exception as e:
        print("!!", s["name"], str(e)[:100])
    json.dump(db, open(DB_PATH, "w", encoding="utf-8"), ensure_ascii=False, indent=2)

have = sum(1 for x in db["songs"] if x.get("nameFa"))
print(f"\nnameFa: {have}/{len(db['songs'])}")
