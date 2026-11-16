#!/usr/bin/env python3
"""teaser_build.py: new recordings for the Season 2 teaser lines whose old recordings said the wrong thing (owner, Nov 16
2026: "there are script errors"). A speech recognizer heard "Hee hee!" as "Thank you", "Ah… ahh…" as "Nice. Aye.",
"CHOO!" as "Two", "Um… hello?" as "Done. Hello." and "I know pie-fu." as "I know Paisue."

Each line is built from sounds the same pup already says in the teaser's own recordings (tools/buddies/voice-src/s2teaser),
so it is the same voice: the "ee" of Sugarfoot's "see" for her giggle, the "ah" of Tidbit's "on" for the sneeze winding up,
the "ch" of his "beach" and the "oo" of his "Who's" for the CHOO, and so on. The pieces are joined with short crossfades and
given a melody and timing with Praat, the same engine as prosody.py. The built clips go to tools/buddies/voice-src/s2teaser-built/
and teaser_voices.py uses them in place of the old ones (as they are: their delivery is built in).

    python3 tools/buddies/teaser_build.py"""
import os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import prosody as P
import parselmouth
from parselmouth.praat import call

SRC = os.path.join(P.ROOT, 'tools', 'buddies', 'voice-src', 's2teaser')
OUT = os.path.join(P.ROOT, 'tools', 'buddies', 'voice-src', 's2teaser-built')
SR = P.SR


def clip(who, text):
    return P.decode(os.path.join(SRC, P.ckey(who, text) + '.mp3'))


def voiced(a, t0, t1):
    """the voiced stretch (start, end) between t0 and t1"""
    s = parselmouth.Sound(a, SR).extract_part(t0, t1, preserve_times=True)
    p = s.to_pitch_ac(time_step=0.004, pitch_floor=110, pitch_ceiling=1100)
    tt, f = p.xs(), p.selected_array['frequency']
    v = np.where(f > 0)[0]
    return (float(tt[v[0]]), float(tt[v[-1]])) if len(v) else (t0, t1)


def cut(a, t0, t1):
    return a[int(t0 * SR):int(t1 * SR)].copy()


def fade(x, ms=8):
    n = min(len(x) // 3, int(SR * ms / 1000))
    if n > 1:
        r = np.linspace(0, 1, n)
        x[:n] *= r; x[-n:] *= r[::-1]
    return x


def join(*parts, xf=0.012):
    """pieces joined with short crossfades; a number is a pause in seconds"""
    out = np.zeros(0)
    n = int(xf * SR)
    for p in parts:
        if isinstance(p, (int, float)):
            out = np.concatenate([out, np.zeros(int(p * SR))]); continue
        p = fade(p.copy())
        if len(out) > n and len(p) > n:
            r = np.linspace(0, 1, n)
            out[-n:] = out[-n:] * (1 - r) + p[:n] * r
            out = np.concatenate([out, p[n:]])
        else:
            out = np.concatenate([out, p])
    return out


def shape(x, semis=0.0, contour=None, length=None, gain=1.0):
    """the same sound with its pitch moved (semitones, plus a contour over the piece) and its length set"""
    snd = parselmouth.Sound(x, SR)
    T = snd.duration
    man = call(snd, 'To Manipulation', 0.005, 110, 1100)
    pt = call(man, 'Extract pitch tier')
    n = call(pt, 'Get number of points')
    pts = [(call(pt, 'Get time from index', k), call(pt, 'Get value at index', k)) for k in range(1, n + 1)]
    if pts:
        med = float(np.median([f for _, f in pts]))
        call(pt, 'Remove points between', 0, T)
        for t, f in pts:
            c = semis + (contour(t / T) if contour else 0.0)
            call(pt, 'Add point', t, med * 2 ** (c / 12) * (f / med) ** 0.6)  # a steadier note, so a piece sings as one
        call([man, pt], 'Replace pitch tier')
    if length:
        dt = call(man, 'Extract duration tier'); call(dt, 'Add point', 0, length / T); call([man, dt], 'Replace duration tier')
    y = call(man, 'Get resynthesis (overlap-add)').values[0].astype(np.float64)
    return y * gain


def shape_len(x, length):
    """an unvoiced sound (f, s) made longer or shorter by repeating or trimming its middle"""
    n = int(length * SR)
    if len(x) >= n:
        return x[:n]
    q = len(x) // 4
    mid, out = x[q:3 * q], x[:q]
    k = 0
    while len(out) < n - q:
        out = np.concatenate([out, mid if k % 2 == 0 else mid[::-1]]); k += 1
    return np.concatenate([out[:n - q], x[3 * q:]])


def lpc(x, order=18):
    x = x * np.hanning(len(x)); r = np.correlate(x, x, 'full')[len(x) - 1:len(x) + order]
    a = np.zeros(order + 1); a[0] = 1.0; e = r[0] + 1e-9
    for i in range(1, order + 1):
        k = -(r[i] + np.dot(a[1:i], r[i - 1:0:-1])) / e
        a[1:i + 1] = a[1:i + 1] + k * np.concatenate([a[i - 1:0:-1], [1.0]]); e *= (1 - k * k)
    return a


def whisper(vowel, dur, amp=0.08, rise=1.5):
    """an h made from the vowel that follows it: noise through the vowel's resonances, swelling in"""
    a = lpc(vowel[len(vowel) // 4: 3 * len(vowel) // 4])
    n = int(dur * SR); x = np.random.RandomState(3).randn(n + 400); y = np.zeros(len(x)); o = len(a) - 1
    hist = np.zeros(o)  # the last outputs, newest first
    for i in range(len(x)):
        v = x[i] - np.dot(a[1:], hist); y[i] = v
        hist = np.concatenate([[v], hist[:-1]])
    y = y[400:]; y = y / (np.abs(y).max() + 1e-9) * amp
    return y * np.linspace(0.15, 1, n) ** rise


def breath(dur, lo=900, hi=3200, amp=0.05):
    """a soft 'h': band-passed noise that swells into the vowel"""
    n = int(dur * SR); x = np.random.RandomState(7).randn(n)
    X = np.fft.rfft(x); f = np.fft.rfftfreq(n, 1 / SR); X[(f < lo) | (f > hi)] = 0
    y = np.fft.irfft(X, n); y = y / (np.abs(y).max() + 1e-9) * amp
    return y * np.linspace(0.2, 1, n) ** 1.5


def norm_to(y, ref, db=0.0):
    return y / (np.abs(y).max() + 1e-9) * np.abs(ref).max() * 10 ** (db / 20)


def build():
    os.makedirs(OUT, exist_ok=True)
    made = {}
    # ---- Sugarfoot: "Hee hee!" — the pure "ee" of her "least" (measured: low F1, F2 near 3000) with an h made from that
    #      same vowel (whispered, swelling in), twice, the second a little higher: a giggle. (A recognizer hears "HEE HEE".)
    s = clip('sugarfoot', 'At least it’s cherry.')
    v0, v1 = voiced(s, 0.15, 0.32)
    ee = cut(s, v0 + 0.45 * (v1 - v0), v0 + 0.95 * (v1 - v0))
    e1, e2 = shape(ee, 2.0, lambda u: 1.5 - 2.5 * u, 0.15), shape(ee, 4.0, lambda u: 2.0 - 4.0 * u, 0.2)
    hee1 = join(whisper(e1, 0.1, 0.10, 0.6), e1, xf=0.05)
    hee2 = join(whisper(e2, 0.09, 0.10, 0.6), e2, xf=0.05)
    made[('sugarfoot', 'Hee hee!')] = norm_to(join(0.02, hee1, 0.07, hee2, 0.05), s, -1)
    # ---- Tidbit: "Ah… ahh…" — the "ah" of his "on", the second longer and higher, climbing (a sneeze winding up)
    t = clip('tidbit', 'Wait… a beach ball?')
    v0, v1 = voiced(t, 0.86, 1.2)
    ah = cut(t, v0 + 0.2 * (v1 - v0), v0 + 0.62 * (v1 - v0))  # the open "a" in the middle of his "ball" (measured: high F1, low F2)
    s1, s2 = shape(ah, 1.0, lambda u: 2.0 * u, 0.32), shape(ah, 4.0, lambda u: 4.0 * u ** 1.3, 0.5)
    a1 = join(whisper(s1, 0.09, 0.07), s1, xf=0.02)
    a2 = join(whisper(s2, 0.11, 0.09), s2, xf=0.02)
    made[('tidbit', 'Ah… ahh…')] = norm_to(join(0.02, a1, 0.3, a2, 0.05), t, -2)
    # ---- Tidbit: "CHOO!" — the "ch" of his "beach" and the "oo" of his "Who's", short, high and loud
    b = clip('tidbit', 'Wait… a beach ball?')
    bv0, bv1 = voiced(b, 0.58, 0.84)
    ch = cut(b, bv1 + 0.005, bv1 + 0.1)
    w = clip('tidbit', 'Who’s that?')
    wv0, wv1 = voiced(w, 0.0, 0.34)
    oo = cut(w, wv0 + 0.4 * (wv1 - wv0), wv0 + 0.8 * (wv1 - wv0))  # the steady middle of his "Who's" (measured: F1 near 450, F2 near 1600)
    made[('tidbit', 'CHOO!')] = norm_to(join(0.02, ch * 1.6, shape(oo, 5.0, lambda u: 2.0 - 6.0 * u ** 1.4, 0.3), 0.04), w, 0)
    # ---- Tidbit: "Um… hello?" — a short hum ("uh" from his "a", "m" from his "me"), a beat, then his own "hello?"
    g = clip('tidbit', 'A golden bone? Easy!')
    gv0, gv1 = voiced(g, 0.0, 0.14)
    uh = cut(g, gv0, min(gv1, gv0 + 0.1))
    m = clip('tidbit', 'You owe me a bigger bone!')
    mv0, mv1 = voiced(m, 0.32, 0.5)
    mm = cut(m, mv0, mv0 + 0.4 * (mv1 - mv0))
    um = join(shape(uh, -1.0, None, 0.12), shape(mm, -1.5, lambda u: -1.5 * u, 0.24))
    h = clip('tidbit', 'Um… hello?')
    hv0, hv1 = voiced(h, 0.5, 1.2)
    hello = cut(h, max(0.0, hv0 - 0.07), len(h) / SR)
    made[('tidbit', 'Um… hello?')] = norm_to(join(0.02, um, 0.32, hello), h, -2)
    # ---- Tidbit: "I know pie-fu." — his own "I know", then "pie" (the p of "purpose", the "I" of "Did I") and
    #      "fu" (the f of "for", the "oo" of "Who's"), cool and even
    k = clip('tidbit', 'I know pie-fu.')
    kv0, kv1 = voiced(k, 0.0, 0.32)
    iknow = cut(k, 0.0, kv1 + 0.02)
    pu = clip('tidbit', 'That was on purpose!')
    pv0, _ = voiced(pu, 0.42, 0.7)
    p = cut(pu, pv0 - 0.035, pv0) * 1.8
    di = clip('tidbit', 'Did I do that?')
    iv0, iv1 = voiced(di, 0.12, 0.28)
    ai = cut(di, iv0, iv1)
    fo = clip('tidbit', 'Nice night for a swim.')
    fv0, _ = voiced(fo, 0.56, 0.84)
    f = shape_len(cut(fo, max(0.56, fv0 - 0.1), fv0), 0.16)
    aiv = shape(ai, -0.5, lambda u: 0.5 - 1.0 * u, 0.22)
    pie = join(p * 0.9, whisper(aiv, 0.07, 0.07, 0.5), shape(ai, -0.5, lambda u: 0.5 - 1.0 * u, 0.22), xf=0.006)
    tw = clip('tidbit', 'To infinity… and beyond!')
    tv0, tv1 = voiced(tw, 0.06, 0.2)
    uu = cut(tw, tv0 + 0.2 * (tv1 - tv0), tv0 + 0.85 * (tv1 - tv0))  # his rounder "oo" (the "to" of "To infinity")
    fu = join(f * 1.1, shape(uu, 1.5, lambda u: 2.5 - 4.5 * u, 0.36, 1.5), xf=0.006)  # the punchline syllable: longer, higher, louder
    made[('tidbit', 'I know pie-fu.')] = norm_to(join(0.02, iknow, 0.09, pie, 0.05, fu, 0.05, xf=0.004), k, -1)  # a short closure before the p
    # ---- Tidbit: "Ooh, it’s glowing!" — his recording's "Ooh" sounded like "Ew": a round, wondering "oooh" (the "oo" of
    #      his "to", rising then falling), then his own "it's glowing!"
    g2 = clip('tidbit', 'Ooh, it’s glowing!')
    gv0, gv1 = voiced(g2, 0.26, 0.9)
    tw2 = clip('tidbit', 'To infinity… and beyond!')
    t0_, t1_ = voiced(tw2, 0.06, 0.2)
    u2 = cut(tw2, t0_ + 0.2 * (t1_ - t0_), t0_ + 0.85 * (t1_ - t0_))
    ooh = shape(u2, 2.0, lambda u: 3.0 * np.sin(np.pi * u) - 1.0 * u, 0.4)
    made[('tidbit', 'Ooh, it’s glowing!')] = norm_to(join(0.02, join(whisper(ooh, 0.06, 0.05, 1.2), ooh, xf=0.03), 0.1, cut(g2, max(0.0, gv0 - 0.06), len(g2) / SR)), g2, 0)
    # ---- Tidbit: "…we go together." — his recording starts with an "and" the caption doesn't have: it starts at "we"
    wg = clip('tidbit', '…we go together.')
    wv0, wv1 = voiced(wg, 0.1, 0.3)
    made[('tidbit', '…we go together.')] = norm_to(join(0.02, cut(wg, max(0.0, wv0 - 0.03), len(wg) / SR)), wg, 0)
    for (who, text), y in made.items():
        P.encode(np.clip(y, -0.98, 0.98), os.path.join(OUT, P.ckey(who, text) + '.mp3'))
        print('%-10s %.2fs  %s' % (who, len(y) / SR, text))


if __name__ == '__main__':
    build()
