#!/usr/bin/env python
# -*- coding: utf-8 -*-
"""
analyze_music.py — real DSP analysis of the music library (46 mp3s).
Features per track (ffmpeg decode → numpy/scipy):
  bpm, energy, dance, brightness, valence, vocals + fa labels calibrated
  by library quantiles so every axis spreads across the collection.
Writes: public/api/music-analysis.json  (id → analysis block)
Run:  python tools/analyze_music.py
"""
import json, os, subprocess, sys, tempfile
import numpy as np
from scipy import signal
from scipy.io import wavfile

REPO = os.path.dirname(os.path.dirname(os.path.abspath(__file__)))
MUSIC = os.path.join(REPO, "public", "assets", "Music")
DB = os.path.join(REPO, "public", "api", "music-database.json")
OUT = os.path.join(REPO, "public", "api", "music-analysis.json")
FFMPEG = "ffmpeg"
SR = 22050

def decode(path):
    """decode mp3 → mono float32 @SR (full track)"""
    with tempfile.NamedTemporaryFile(suffix=".wav", delete=False) as tf:
        tmp = tf.name
    try:
        r = subprocess.run([FFMPEG, "-y", "-loglevel", "error", "-i", path,
                            "-ac", "1", "-ar", str(SR), "-f", "wav", tmp],
                           capture_output=True, timeout=120)
        if r.returncode != 0:
            raise RuntimeError(r.stderr.decode(errors="replace")[:200])
        sr, y = wavfile.read(tmp)
        y = y.astype(np.float32)
        if y.ndim > 1:
            y = y.mean(axis=1)
        y /= (np.abs(y).max() + 1e-9)
        return y
    finally:
        try: os.remove(tmp)
        except OSError: pass

def features(y):
    f, t, Z = signal.stft(y, SR, nperseg=2048, noverlap=1536)
    S = np.abs(Z) + 1e-10
    # --- energy: RMS of frames
    rms = np.sqrt((S ** 2).sum(axis=0))
    energy = float(np.mean(rms))
    dyn = float(np.percentile(rms, 90) / (np.percentile(rms, 10) + 1e-9))
    # --- brightness: spectral centroid (magnitude-weighted mean)
    centroid = (f[:, None] * S).sum(axis=0) / S.sum(axis=0)
    brightness = float(np.mean(centroid))
    # --- spectral flux onset envelope
    logS = np.log1p(S)
    flux = np.maximum(0, np.diff(logS, axis=1)).sum(axis=0)
    flux -= flux.mean()
    # --- tempo: autocorrelation of onset envelope (70–190 BPM)
    hop = (t[1] - t[0])
    ac = np.correlate(flux, flux, "full")[len(flux) - 1:]
    lags = np.arange(len(ac)) * hop
    lo, hi = int(60 / 190 / hop), int(60 / 70 / hop)
    seg = ac[lo:hi]
    bpm = 60.0 / (lags[lo + int(np.argmax(seg))] )
    # fold octave ambiguities toward 90–150
    while bpm < 88: bpm *= 2
    while bpm > 176: bpm /= 2
    beat_strength = float(seg.max() / (ac[1:hi].mean() + 1e-9))
    # --- percussive/harmonic split (HPSS-lite, median filters on log-mag)
    harm = signal.medfilt2d(logS, kernel_size=(1, 31))
    perc = signal.medfilt2d(logS, kernel_size=(17, 1))
    pr = float(np.exp(perc).sum() / (np.exp(harm).sum() + 1e-9))
    # --- danceability: beat periodicity × percussive ratio × tempo window
    dance = beat_strength * (0.5 + pr) * (1.0 if 85 <= bpm <= 150 else 0.7)
    # --- chroma → major/minor (Krumhansl profiles)
    pitch_bins = np.clip(np.round(12 * (np.log2(f / 55.0 + 1e-9))).astype(int), 0, None)
    chroma = np.zeros((12, S.shape[1]))
    for pc in range(12):
        mask = (pitch_bins % 12) == pc
        chroma[pc] = S[mask].sum(axis=0)
    chroma = chroma / (chroma.sum(axis=0, keepdims=True) + 1e-9)
    cmaj = np.array([6.35,2.23,3.48,2.33,4.38,4.09,2.52,5.19,2.39,3.66,2.29,2.88])
    cmin = np.array([6.33,2.68,3.52,5.38,2.60,3.53,2.54,4.75,3.98,2.69,3.34,3.17])
    cc = chroma.mean(axis=1); cc = (cc - cc.mean()) / (cc.std() + 1e-9)
    maj = float(np.corrcoef(cc, cmaj)[0, 1]); mnr = float(np.corrcoef(cc, cmin)[0, 1])
    mode = maj / (mnr + 1e-9)  # >1 → major-ish
    # --- vocals proxy: 300–3400 Hz band modulation energy (syllabic 2–7 Hz)
    band = (f >= 300) & (f <= 3400)
    bflux = flux.copy()
    # modulation of band flux
    bf = np.maximum(0, np.diff(logS[band], axis=1)).sum(axis=0)
    bf -= bf.mean()
    m = np.correlate(bf, bf, "full")[len(bf) - 1:]
    lags2 = np.arange(len(m)) * hop
    mask = (lags2 > 1/7.0) & (lags2 < 0.5)   # 2–7 Hz
    mod_strength = float(m[mask].max() / (m[1:mask.sum() + 1].mean() + 1e-9)) if mask.any() else 0
    return dict(bpm=round(float(bpm)), energy=energy, dyn=dyn, brightness=brightness,
                perc=pr, beat=beat_strength, dance=dance, mode=mode,
                vocals_mod=mod_strength)

def main():
    db = json.load(open(DB, encoding="utf-8"))
    songs = db["songs"]
    res = {}
    for s in songs:
        src = os.path.join(REPO, "public", s["src"].lstrip("/")) if not s["src"].startswith("/") else None
        # src like "assets/Music/x.mp3" relative to public? handle both
        cand = [os.path.join(REPO, "public", s["src"]),
                os.path.join(REPO, s["src"]),
                os.path.join(MUSIC, os.path.basename(s["src"]))]
        path = next((c for c in cand if os.path.isfile(c)), None)
        if not path:
            print("MISSING FILE:", s["name"], s["src"]); continue
        y = decode(path)
        res[s["id"]] = features(y)
        print(f'{s["id"]:>2} {s["name"][:30]:30} bpm={res[s["id"]]["bpm"]:>3} '
              f'en={res[s["id"]]["energy"]:.4f} br={res[s["id"]]["brightness"]:.0f} '
              f'dn={res[s["id"]]["dance"]:.2f} md={res[s["id"]]["mode"]:.2f} vc={res[s["id"]]["vocals_mod"]:.2f}')
    json.dump(res, open(OUT, "w", encoding="utf-8"), ensure_ascii=False, indent=1)
    print("saved", OUT, len(res))

if __name__ == "__main__":
    main()
