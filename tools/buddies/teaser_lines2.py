#!/usr/bin/env python3
"""teaser_lines2.py: new lines for the Season 2 teaser's Indiana Jones (boulder) and Snakes on a Plane bits (owner,
Nov 17 2026: "make the wording much better and flow better"). The voice service isn't reachable from here and the pups'
voices must stay theirs, so each new line is built from words the same pup already says in the episodes and the teaser:

  1. each word is cut from a recording of that pup saying it (picked where it sits in a sentence the same way: the end
     of a line for the last word, the middle for the rest), with its own small breath of room;
  2. the words are matched in loudness and moved to the same pitch, then joined with short crossfades and natural pauses;
  3. the whole line is given one melody and the feeling it needs by prosody.py's engine (as the other teaser lines).

The built clips go to tools/buddies/voice-src/s2teaser-built/ (teaser_voices.py uses them as they are).
    python3 tools/buddies/teaser_lines2.py"""
import json, os, sys
import numpy as np
sys.path.insert(0, os.path.dirname(__file__))
import prosody as P
import teaser_voices  # noqa: F401  (its extra deliveries: scared, timid, dry, annoyed, curious...)
import parselmouth
from parselmouth.praat import call

SR = P.SR
OUT = os.path.join(P.ROOT, 'tools', 'buddies', 'voice-src', 's2teaser-built')
TSRC = os.path.join(P.ROOT, 'tools', 'buddies', 'voice-src', 's2teaser')

# the new lines: who, text, mood, energy, and any word taken from a teaser recording (key, start, end) instead
LINES = [
    ('sugarfoot', 'Tidbit… what did you do?', 'worried', 1.1, {}),
    ('tidbit', 'Oh no.', 'worried', 1.0, {}),
    ('sugarfoot', 'RUN!', 'scared', 1.3, {'run': ('37a67a62', 0.44, 0.86)}),
    ('sugarfoot', 'This never happened.', 'dry', 1.0, {}),
    ('sugarfoot', '…lovely plane!', 'happy', 1.1, {'lovely': ('c9f33b3a', 0.78, 1.18), 'plane': ('c9f33b3a', 1.17, 1.5)}),
    ('tidbit', 'That is NOT what I was going to say.', 'annoyed', 1.2, {}),
    ('sugarfoot', 'I know.', 'dry', 0.9, {}),
    # Nov 17 (owner: "redo the Indiana Jones and Jaws script much better, funnier")
    ('tidbit', 'Everything is fine.', 'timid', 1.0, {}),
    ('tidbit', 'HELP!', 'scared', 1.3, {'raw': True}),
    ('tidbit', 'I was NOT scared.', 'proud', 1.1, {}),
    ('sugarfoot', 'Mm. Very brave.', 'dry', 1.0, {}),
    ('tidbit', 'Hey… music?', 'curious', 1.0, {}),
    ('tidbit', 'Was that YOU?', 'surprised', 1.1, {}),
    ('sugarfoot', '…Maybe.', 'silly', 0.9, {'raw': True}),
]
# Nov 17, later (owner: "the Jaws script is so corny... fix it good"; and Tidbit's plane line, stitched from many
# recordings, now one run of his own words)
LINES += [
    ('tidbit', 'Sugarfoot… did you see that?', 'worried', 1.0, {}),
    ('sugarfoot', 'I’m on the dock.', 'dry', 0.9, {}),
    ('tidbit', 'We need a bigger boat.', 'worried', 1.0, {'a': ('89a74561', 0.42, 0.77, 2)}),
    ('sugarfoot', 'It’s tiny.', 'dry', 0.9, {}),
    ('tidbit', 'That’s NOT what I meant!', 'annoyed', 1.2, {'noprefer': True}),
]
# Nov 17, later still (owner: "their voices sound robotic on the Indiana Jones one... is it natural"; "the Jaws thing
# is just stupid"): both bits are now written from whole sentences the pups really say in the episodes, each cut
# whole from one recording and left exactly as said (no stitching, no reshaping), so they sound like themselves
R = {'raw': True, 'noprefer': True}
LINES += [
    ('tidbit', 'Look what I found!', '', 1.0, dict(R)),
    ('tidbit', 'It’s a very nice bone.', '', 1.0, dict(R)),
    ('sugarfoot', 'Um, Tidbit?', '', 1.0, dict(R)),
    ('tidbit', 'Uh-oh.', '', 1.0, dict(R)),
    ('sugarfoot', 'Tidbit! Quick!', '', 1.0, dict(R)),
    ('tidbit', 'Go, go, go!', '', 1.0, dict(R)),
    ('tidbit', 'Fast, fast, fast!', '', 1.0, dict(R)),
    ('tidbit', 'Hurry, hurry, hurry!', '', 1.0, dict(R)),
    ('tidbit', 'Huh.', '', 1.0, dict(R)),
    ('tidbit', 'This is the best day ever!', '', 1.0, dict(R)),
    ('sugarfoot', 'That’s great, Tidbit.', '', 1.0, dict(R)),
    ('tidbit', 'Captain Tidbit, ready to cast off!', '', 1.0, dict(R)),
    ('sugarfoot', 'First Mate Sugarfoot, ready.', '', 1.0, dict(R)),
    ('sugarfoot', 'I don’t like this part.', '', 1.0, dict(R)),
    ('tidbit', 'Don’t worry! Boats float! That’s their whole job!', '', 1.0, dict(R)),
    ('tidbit', 'Ow! It pinched hello!', '', 1.0, dict(R)),
    ('sugarfoot', 'There’s room in the boat. Just about.', '', 1.0, dict(R)),
]
ONLY = None  # set by the command line: build just the lines whose text contains one of these


def vocab():
    V = {'tidbit': {}, 'sugarfoot': {}}
    for ep in P.EPS:
        idx = json.load(open(os.path.join(P.AUD, ep, 'index.json')))
        for l in P.lines(ep):
            k = l['k']
            if k not in idx or len(idx[k]) < 2:
                continue
            toks = P.tokens(l['text']); on = idx[k][1]; dur = idx[k][0]
            if len(on) != len(toks):
                continue
            for i, (w, br) in enumerate(toks):
                end = on[i + 1] if i + 1 < len(on) else dur
                V[l['who']].setdefault(P.norm(w), []).append(dict(ep=ep, k=k, i=i, n=len(toks), t0=on[i], t1=end, br=br))
    return V


_cache = {}
def audio(path):
    if path not in _cache:
        _cache[path] = P.decode(path)
    return _cache[path]


def trim(x, rel=0.06):
    """the word without the quiet before and after it"""
    e = np.abs(x); th = e.max() * rel
    on = np.where(e > th)[0]
    if not len(on):
        return x
    a, b = max(0, on[0] - int(0.035 * SR)), min(len(x), on[-1] + int(0.06 * SR))  # room for soft first and last sounds (the h and p of "help")
    return x[a:b]


def median_f0(x):
    p = parselmouth.Sound(x, SR).to_pitch_ac(time_step=0.01, pitch_floor=110, pitch_ceiling=1100).selected_array['frequency']
    v = p[p > 0]
    return float(np.median(v)) if len(v) else None


def shift(x, semis):
    if abs(semis) < 0.1:
        return x
    snd = parselmouth.Sound(x, SR)
    man = call(snd, 'To Manipulation', 0.005, 110, 1100)
    pt = call(man, 'Extract pitch tier'); call(pt, 'Multiply frequencies', 0, snd.duration, 2 ** (semis / 12)); call([man, pt], 'Replace pitch tier')
    return call(man, 'Get resynthesis (overlap-add)').values[0].astype(np.float64)


def sentences(who):
    """every recorded line of this pup in the episodes: its words and where its audio is"""
    out = []
    for ep in P.EPS:
        idx = json.load(open(os.path.join(P.AUD, ep, 'index.json')))
        for l in P.lines(ep):
            if l['who'] == who and l['k'] in idx:
                out.append(dict(ep=ep, k=l['k'], words=[P.norm(w) for w, _ in P.tokens(l['text'])], text=l['text']))
    return out


_asr = None
_wt = {}
def word_times(path):
    """where each word really is in a recording (a speech recognizer's word timings)"""
    global _asr
    if path in _wt:
        return _wt[path]
    if _asr is None:
        os.environ.setdefault('HF_HUB_DISABLE_XET', '1')
        from faster_whisper import WhisperModel
        _asr = WhisperModel('small.en', device='cpu', compute_type='int8')
    a = audio(path); x = np.interp(np.arange(0, len(a), SR / 16000), np.arange(len(a)), a).astype(np.float32)
    segs, _ = _asr.transcribe(x, beam_size=5, language='en', word_timestamps=True)
    _wt[path] = [(P.norm(w.word.strip().strip('.,!?…')), float(w.start), float(w.end)) for sg in segs for w in (sg.words or [])]
    return _wt[path]


# a word with one best recording (checked with the recognizer: "Oh no" read as "Oh, honey, no" from "Sunny! No!")
# (each tested on its own with the recognizer; a list is used in order when the word comes more than once in a line)
PREFER = {('tidbit', 'no'): 'No. Maybe it', ('tidbit', 'help'): 'I’m just trying to help',
          ('tidbit', 'music'): 'Music tomorrow', ('sugarfoot', 'help'): "No, don't go in after her", ('sugarfoot', 'maybe'): 'Maybe it\'s me',
          ('tidbit', 'not'): 'I did not!', ('tidbit', 'scared'): 'The truth is, I felt left out'}


def chunks(who, words, teaser):
    """the line as a few runs of words, each said together in one recording (longest runs first)"""
    S = sentences(who); res = []; i = 0
    while i < len(words):
        if words[i] in teaser and not isinstance(teaser[words[i]], bool):
            n = teaser[words[i]][3] if len(teaser[words[i]]) > 3 else 1  # a run of n words from one teaser recording
            res.append(('teaser', words[i], i, i + n)); i += n; continue
        best = None
        pref = None if teaser.get('noprefer') else PREFER.get((who, words[i]))
        if isinstance(pref, list):
            pref = pref[min(len(pref) - 1, words[:i].count(words[i]))]
        if pref:
            ps = [snt for snt in S if snt['text'].startswith(pref)]
            if ps:
                res.append(('ep', ps[0], ps[0]['words'].index(words[i]), ps[0]['words'].index(words[i]) + 1, i, i + 1)); i += 1; continue
        solo = [snt for snt in S if snt['words'] == [words[i]]]
        if solo and (i + 1 >= len(words) or not any(words[i:i + 2] == snt['words'][a:a + 2] for snt in S for a in range(len(snt['words']) - 1))):
            res.append(('ep', solo[0], 0, 1, i, i + 1)); i += 1; continue
        for snt in S:
            ws = snt['words']
            for a in range(len(ws)):
                n = 0
                while i + n < len(words) and a + n < len(ws) and ws[a + n] == words[i + n] and words[i + n] not in teaser and not (n and not teaser.get('noprefer') and (who, words[i + n]) in PREFER):
                    n += 1
                ends = (a + n == len(ws)) == (i + n == len(words)) and (a == 0) == (i == 0)
                if n and (best is None or n > best[0] or (n == best[0] and ends and not best[3])):
                    best = (n, snt, a, ends)
        if not best:
            raise SystemExit('no recording of %s saying "%s"' % (who, words[i]))
        n, snt, a, _ = best
        res.append(('ep', snt, a, a + n, i, i + n)); i += n
    return res


def quietest(x, t, before, after):
    """the quietest moment (10 ms windows) near t: where one word ends and the next begins"""
    w = int(0.01 * SR); a = max(0, int((t - before) * SR)); b = min(len(x) - w, int((t + after) * SR))
    if b <= a:
        return t
    e = [np.sqrt((x[k:k + w] ** 2).mean()) for k in range(a, b, w // 2)]
    return (a + int(np.argmin(e)) * (w // 2) + w // 2) / SR


def cut_run(snt, a, b):
    """the audio of words a..b-1 of a recorded line, cut where the recognizer hears them"""
    path = os.path.join(P.AUD, snt['ep'], snt['k'] + '.mp3'); x = audio(path); wt = word_times(path)
    want = snt['words'][a:b]
    # find the same words in the recognizer's timing (it may split or merge a little): first and last word
    hs = [w for w, _, _ in wt]
    def find(w, start=0):
        for j in range(start, len(hs)):
            if hs[j] == w or hs[j].startswith(w) or w.startswith(hs[j]):
                return j
        return None
    ja = find(want[0]); jb = find(want[-1], ja + len(want) - 1) if ja is not None else None   # (the last word may repeat the first: "go, go, go")
    if ja is None or jb is None:  # fall back to the stored timing
        idx = json.load(open(os.path.join(P.AUD, snt['ep'], 'index.json')))[snt['k']]
        on = idx[1]; t0 = on[a]; t1 = on[b] if b < len(on) else idx[0]
    else:
        t0, t1 = wt[ja][1], wt[jb][2]
        lo = wt[ja - 1][2] if ja > 0 else 0.0                     # never into the word before
        hi = wt[jb + 1][1] if jb + 1 < len(wt) else len(x) / SR   # or the word after
        t0, t1 = max(lo + 0.01, t0 - 0.03), min(hi - 0.01, t1 + 0.04)
        if ja > 0: t0 = quietest(x, t0, 0.1, 0.06)                 # start in the gap before the first word
        if jb + 1 < len(wt): t1 = quietest(x, t1, 0.06, 0.1)        # and end in the gap after the last
    return x[int(max(0, t0) * SR):int(min(len(x) / SR, t1) * SR)]


def build():
    V = vocab()
    os.makedirs(OUT, exist_ok=True)
    out = {}
    for who, text, mood, energy, teaser in LINES:
        if ONLY and not any(o in text for o in ONLY):
            continue
        toks = P.tokens(text); words = [P.norm(w) for w, _ in toks]
        pieces = []
        for c in chunks(who, words, teaser):
            if c[0] == 'teaser':
                k, a0, b0 = teaser[c[1]][:3]; xa = audio(os.path.join(TSRC, k + '.mp3')); w0 = 0.03 if c[3] - c[2] > 1 else 0.08
                if c[3] - c[2] == 1:  # one word: cut in the quiet around it (a run of words is given exactly, measured by ear)
                    a0 = quietest(xa, a0, w0, 0.06); b0 = quietest(xa, b0, 0.06, w0)
                x = xa[int(a0 * SR):int(b0 * SR)]; last = c[3] - 1
            else:
                _, snt, a0, b0, i0, i1 = c; x = cut_run(snt, a0, b0); last = i1 - 1
                print('   %-28s from: %s' % (' '.join(words[i0:i1]), snt['text'][:60]))
            pieces.append((trim(x, 0.03), toks[last][1]))
        # one loudness and one pitch for the words, before the line gets its melody
        rms = [np.sqrt((p ** 2).mean()) for p, _ in pieces]; tr = float(np.median(rms))
        f0s = [median_f0(p) for p, _ in pieces]; ref = float(np.median([f for f in f0s if f])) if any(f0s) else None
        y, onsets = np.zeros(int(0.02 * SR)), []
        xf = int(0.012 * SR)
        for (p, br), r, f in zip(pieces, rms, f0s):
            p = p * (tr / max(r, 1e-6)) ** 0.8
            if ref and f:
                p = shift(p, float(np.clip(12 * np.log2(ref / f), -4, 4)))
            onsets.append(len(y) / SR)
            # each word starts after a pause, so it goes in whole: only a 3 ms ramp against clicks (a longer crossfade
            # into the pause faded out soft first sounds: "help" came out as "go")
            r = min(len(p), int(0.003 * SR)); p = p.copy(); p[:r] *= np.linspace(0, 1, r); p[-r:] *= np.linspace(1, 0, r)
            y = np.concatenate([y, p])
            gap = {'…': 0.26, ',': 0.12, '.': 0.1, '!': teaser.get('gap', 0.1), '?': 0.1}.get(br, 0.02)
            y = np.concatenate([y, np.zeros(int(gap * SR))])
        y = y / (np.abs(y).max() + 1e-9) * 0.9
        # the whole line: one melody and its feeling (prosody.py)
        raw = teaser.pop('raw', False) if isinstance(teaser, dict) else False
        try:
            if raw:  # its own words already say it best: only joined, not reshaped
                raise RuntimeError('kept as said')
            z, _ = P.say(y, {'who': who, 'text': text, 'mood': mood, 'energy': energy}, [round(t, 3) for t in onsets], len(y) / SR)
        except Exception as ex:
            print('kept unshaped:', text, ex); z = y
        z = z / (np.abs(z).max() + 1e-9) * 0.9
        k = P.ckey(who, text)
        P.encode(z, os.path.join(OUT, k + '.mp3'))
        out[k] = round(len(z) / SR, 2)
        print('%-10s %.2fs  %s' % (who, len(z) / SR, text))
    return out


if __name__ == '__main__':
    ONLY = sys.argv[1:] or None
    build()
