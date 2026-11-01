#!/usr/bin/env python3
"""prosody.py: Tidbit and Sugarfoot say their lines with real emphasis (owner, Nov 1 2026: "give more emphasis on their
words and emphasis based upon context or emotion").

Every recorded line of the two pups goes through this once. It keeps each pup's own voice (the same recording) and changes
only how the line is said:
  1. the words that carry the line get a pitch accent (a quick rise and fall), a touch more length and a touch more volume.
     Which words: the last content word of each phrase (where English puts its main stress), words that are shouted in
     capitals, "so / really / never / always / every..." style words that make a line bigger, "not" and "can't" when a pup
     is worried or grumpy, and a lone "Whoa!" or "Yay!" at the start of a line;
  2. the melody follows the feeling: excited and surprised lines move more and sit higher, sad and sleepy lines sit lower,
     move less and slow down a little, worried lines get a small tremble, grumpy lines sit low with hard stresses;
  3. each line ends the way it means: yes-or-no questions lift, "why / where / what" questions settle, exclamations peak
     then drop, trailing lines hang in the air, plain statements settle down.
The timing of every word (index.json, used to move the mouths) is updated to match.

Usage, from the repo root (needs ffmpeg and: pip install praat-parselmouth soundfile numpy):
    python3 tools/buddies/prosody.py export <origdir>          save the current pup clips once, as the untouched source
    python3 tools/buddies/prosody.py run <origdir> [ep ...]    rewrite assets/audio/buddies/<ep>/ from that source
    python3 tools/buddies/prosody.py explain [ep ...]          print the words each line will stress
Run it on the untouched source each time (never on its own output), then bump REC in assets/js/buddies-player.js."""
import json, os, re, shutil, subprocess, sys
import numpy as np

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
AUD = os.path.join(ROOT, 'assets', 'audio', 'buddies')
EPS = ['s1e1', 's1e2', 's1e3', 's1e4', 's1e5', 's2e1', 's2e2', 's2e3']
PUPS = ('tidbit', 'sugarfoot')
SR = 24000


# ---------------------------------------------------------------- the lines, read from the episode scripts
def ckey(who, text):
    """the player's clip key (assets/js/buddies-player.js ckey): FNV-1a over who|text, as 8 hex digits."""
    h = 0x811c9dc5
    for ch in who + '|' + text:
        o = ord(ch)
        units = [o] if o < 0x10000 else [0xD800 + ((o - 0x10000) >> 10), 0xDC00 + ((o - 0x10000) & 0x3FF)]
        for u in units:
            h ^= u
            h = (h * 0x01000193) & 0xFFFFFFFF
    return '%08x' % h


def lines(ep):
    js = os.path.join(ROOT, 'assets', 'js', 'buddies', ep + '.js')
    code = ("global.window=global;require(%s);const E=TOLBuddies.episodes[%s];const out=[];"
            "E.chapters.forEach(c=>c.beats.forEach(b=>{if(b.say&&b.text)out.push({who:b.say,text:b.text,mood:b.mood||'',energy:b.energy||1,to:b.to||''})}));"
            "process.stdout.write(JSON.stringify(out))") % (json.dumps(js), json.dumps(ep))
    out = json.loads(subprocess.run(['node', '-e', code], capture_output=True, text=True, check=True).stdout)
    seen, res = set(), []
    for l in out:
        if l['who'] not in PUPS:
            continue
        k = ckey(l['who'], l['text'])
        if k in seen:
            continue
        seen.add(k)
        l['k'] = k
        res.append(l)
    return res


# ---------------------------------------------------------------- which words carry the line
TOK = re.compile(r'\S+')
BREAK = re.compile(r'(…|\.\.\.|[,.!?:;—])$')
FUNC = set("""a an the and or but so to of on in into onto for with at by from up down out off over is am are was were be been
it it's its i i'm i'll i've i'd you you're you'll your we we're we'll our us me my he she they them their his her this that these
those there here do does did just than then as if when like can could would should will shall have has had let let's oh um uh
hmm okay ok well yeah yep huh ah hey""".split())
WEAK = set("""a an the and or but so to of on in into onto for with at by from i i'm i'll i've i'd you you're your we we're our us
me my he she they them it it's its this that um uh hmm oh ah er""".split())
BIGGER = set("""so really very super never always every everything everyone nothing nobody all whole only still totally actually
ever too most best worst biggest tiniest huge giant tiny exactly definitely absolutely completely""".split())
NEG = re.compile(r"^(not|no|never|can't|cannot|don't|won't|didn't|isn't|wasn't|aren't|doesn't|couldn't|shouldn't|nope|nothing)$")
WH = set('what why where when who how which'.split())
INTERJ = set("""whoa wow yay yes no oh uh-oh oops hooray wheee whee woo woohoo ta-da tada yikes eek hey hi aha ooh ow ouch
phew boo yum yummy bingo gotcha""".split())
MOODX = {'excited': 1.3, 'surprised': 1.3, 'silly': 1.2, 'happy': 1.1, 'proud': 1.15, 'worried': 1.0, 'grumpy': 1.05,
         'calm': 0.8, 'sad': 0.75, 'sleepy': 0.6, '': 1.0}


def tokens(text):
    """[(word, phrase-ending punctuation or '')] in spoken order: the same words the player times (s2voices word_onsets)."""
    out = []
    for w in text.replace('…', '… ').replace('—', '— ').split():
        core = w.strip('…—.,!?:;"“”‘’()')
        if not core.strip("'"):
            if out:
                out[-1] = (out[-1][0], w[-1])
            continue
        m = BREAK.search(w.rstrip('"”’)'))
        out.append((core, m.group(1) if m else ''))
    return out


def norm(w):
    return w.lower().replace('’', "'").strip("'")


def pick(text, mood, energy=1.0):
    """{token index: strength} (1 = the main stress of a phrase)."""
    toks = tokens(text)
    if not toks:
        return {}
    phrases, cur = [], []
    for i, (w, br) in enumerate(toks):
        cur.append(i)
        if br and br != "'" and i < len(toks) - 1:
            phrases.append(cur)
            cur = []
    if cur:
        phrases.append(cur)
    emph = {}
    for pi, ph in enumerate(phrases):
        last_phrase = pi == len(phrases) - 1
        words = [norm(toks[i][0]) for i in ph]
        # a lone interjection ("Whoa!", "Yay!") is all stress
        if len(ph) <= 2 and words[0] in INTERJ:
            emph[ph[0]] = 1.15
            continue
        content = [i for i, w in zip(ph, words) if w not in FUNC and len(w) > 1 or w.isdigit()]
        caps = [i for i in ph if len(toks[i][0]) > 1 and toks[i][0].isupper()]
        big = [i for i, w in zip(ph, words) if w in BIGGER]
        neg = [i for i, w in zip(ph, words) if NEG.match(w)]
        if content:
            nucleus = content[-1]
        else:   # "We did it!": no content word, so the last word that can carry a stress; "Um..." or "I..." get none
            strong = [i for i, w in zip(ph, words) if w not in WEAK]
            if not strong:
                continue
            nucleus = strong[-1]
        # the question word of a "why / where" question carries it when the question is a feeling
        if toks[ph[-1]][1] == '?' and words[0] in WH and mood in ('surprised', 'worried', 'grumpy', 'excited'):
            emph[ph[0]] = 0.7
        if caps:
            for i in caps:
                emph[i] = 1.3
            continue
        if big:
            emph[big[0]] = 1.05
            emph[nucleus] = max(emph.get(nucleus, 0), 0.55)
        elif neg and mood in ('worried', 'grumpy', 'sad', 'surprised'):
            emph[neg[0]] = 0.95
            emph[nucleus] = max(emph.get(nucleus, 0), 0.6)
        else:
            emph[nucleus] = max(emph.get(nucleus, 0), 1.0 if last_phrase else 0.8)
        # a long phrase also gets a lighter accent on its first content word, so it does not run flat
        if len(ph) >= 6 and content and content[0] != nucleus and content[0] not in emph:
            emph[content[0]] = 0.45
    k = MOODX.get(mood, 1.0) * max(0.8, min(1.3, energy))
    return {i: min(1.4, s * (0.75 + 0.25 * k)) for i, s in emph.items()}


# ---------------------------------------------------------------- how the feeling sounds
STYLE = {'tidbit': {'accent': 5.6, 'stretch': 0.2, 'widen': 1.35},
         'sugarfoot': {'accent': 4.8, 'stretch': 0.18, 'widen': 1.28}}
# per mood: pitch offset (semitones), melody widening, overall pace (>1 slower), tremble (semitones), drift over the line
FEEL = {'excited': (1.0, 1.25, 0.97, 0.0, 0.0), 'surprised': (1.3, 1.3, 1.0, 0.0, 0.0), 'silly': (0.6, 1.3, 1.0, 0.0, 0.0),
        'happy': (0.4, 1.15, 1.0, 0.0, 0.0), 'proud': (0.2, 1.1, 1.02, 0.0, -0.6), 'calm': (0.0, 1.0, 1.02, 0.0, -0.4),
        'worried': (0.3, 1.05, 1.02, 0.45, 0.0), 'grumpy': (-0.7, 0.95, 1.0, 0.0, -0.8), 'sad': (-0.9, 0.85, 1.06, 0.15, -1.2),
        'sleepy': (-1.0, 0.75, 1.08, 0.0, -1.0), '': (0.0, 1.0, 1.0, 0.0, 0.0)}


def decode(path):
    r = subprocess.run(['ffmpeg', '-loglevel', 'error', '-i', path, '-ac', '1', '-ar', str(SR), '-f', 'f32le', '-'], capture_output=True, check=True)
    return np.frombuffer(r.stdout, dtype=np.float32).astype(np.float64)


def encode(a, path):
    tmp = path + '.wav'
    import soundfile as sf
    sf.write(tmp, a.astype(np.float32), SR)
    # Season 1's own clips: mono 24 kHz MP3, about 50 kb/s
    subprocess.run(['ffmpeg', '-y', '-loglevel', 'error', '-i', tmp, '-ac', '1', '-ar', str(SR), '-c:a', 'libmp3lame', '-q:a', '6', path], check=True)
    os.remove(tmp)


def say(a, line, onsets, dur):
    """returns (new audio, new word onsets)"""
    import parselmouth
    from parselmouth.praat import call
    who, mood, text = line['who'], line.get('mood', ''), line['text']
    st = STYLE[who]
    off, widen, pace, trem, drift = FEEL.get(mood, FEEL[''])
    mx = MOODX.get(mood, 1.0) * max(0.8, min(1.3, line.get('energy', 1) or 1))
    toks = tokens(text)
    emph = pick(text, mood, line.get('energy', 1) or 1)
    snd = parselmouth.Sound(a, SR)
    T = snd.duration
    # where each word is: from its onset to the next one (the last runs to the end of the voice)
    pitch = snd.to_pitch_ac(time_step=0.005, pitch_floor=110, pitch_ceiling=1100)
    tt = pitch.xs()
    f0 = pitch.selected_array['frequency']
    v = f0 > 0
    if v.sum() < 6 or len(onsets) != len(toks):
        return a, onsets
    vend = tt[np.where(v)[0][-1]]
    vbeg = tt[np.where(v)[0][0]]
    spans = [(onsets[i], onsets[i + 1] if i + 1 < len(onsets) else max(vend, onsets[i] + 0.12)) for i in range(len(onsets))]
    # ---- the new melody, in semitones, as a change from the old one at each pitch frame
    lf = np.zeros_like(f0)
    lf[v] = 12 * np.log2(f0[v])
    med = np.median(lf[v])
    rel = np.zeros_like(f0)
    rel[v] = np.clip(lf[v] - med, -6, 6)
    trend = np.zeros_like(f0)
    for j in np.where(v)[0]:
        lo, hi = max(0, j - 30), j + 31
        trend[j] = rel[lo:hi][v[lo:hi]].mean()
    wid = st['widen'] * widen * (0.9 + 0.1 * mx)
    target = np.zeros_like(f0)
    target[v] = (rel[v] - trend[v]) * wid + trend[v] * 0.9
    add = np.zeros_like(f0)
    for i, s in emph.items():
        a0, b0 = spans[i]
        w = max(b0 - a0, 0.08)
        c = a0 + 0.4 * w
        bump = np.exp(-0.5 * ((tt - c) / (0.33 * w)) ** 2)
        dip = np.exp(-0.5 * ((tt - (a0 - 0.05 * w)) / (0.3 * w)) ** 2)
        acc = st['accent'] * mx * s * (1.25 if mood == 'grumpy' else 1.0)
        add += acc * (bump - 0.3 * dip)
    x = np.clip((tt - vbeg) / max(vend - vbeg, 0.05), 0, 1)
    la = spans[-1][0]
    xl = np.clip((tt - la) / max(vend - la, 0.08), 0, 1)
    end = text.rstrip().rstrip('"”’)')[-1:] or '.'
    words = [norm(w) for w, _ in toks]
    if end == '?' or text.rstrip().endswith('?!'):
        if words and words[0] in WH and ' or ' not in text:
            add += 0.6 * np.sin(np.pi * np.minimum(x * 1.2, 1)) - 1.2 * xl ** 1.4 + 1.2 * xl ** 3  # "why / where" questions settle, with a little curl
        else:
            add += -0.6 * x + 4.6 * mx * np.clip(xl * 1.25, 0, 1) ** 1.3  # yes-or-no questions lift
    elif end == '!':
        add += 1.6 * mx * np.sin(np.pi * np.minimum(x * 1.15, 1)) - 2.6 * xl ** 2
    elif end in '…—':
        add += 0.6 * np.sin(np.pi * x) - 0.4 * xl
    else:
        add += 0.7 * np.sin(np.pi * np.minimum(x * 1.3, 1)) - 1.3 * x - 1.6 * xl ** 1.4
    # inner phrase ends: a comma or a question inside the line lifts a little, ready for what comes next
    for i, (w, br) in enumerate(toks[:-1]):
        a0, b0 = spans[i]
        q = np.clip((tt - a0) / max(b0 - a0, 0.06), 0, 1) * (tt < b0 + 0.03)
        if br == '?':
            add += 3.0 * mx * q ** 1.6
        elif br in (',', '…', ':', ';', '—'):
            add += 0.9 * q
    add += drift * x
    if trem:
        add += trem * np.sin(2 * np.pi * 5.0 * tt) * np.clip((tt - vbeg) / 0.15, 0, 1)
    target[v] += add[v]
    target[v] -= np.median(target[v])
    target = np.clip(target, -8, 10) + off
    change = np.zeros_like(f0)
    change[v] = target[v] - rel[v]
    # ---- Praat: the same voice, new melody and timing (overlap-add, so the voice keeps its own sound)
    man = call(snd, 'To Manipulation', 0.005, 110, 1100)
    pt = call(man, 'Extract pitch tier')
    n = call(pt, 'Get number of points')
    pts = [(call(pt, 'Get time from index', k), call(pt, 'Get value at index', k)) for k in range(1, n + 1)]
    call(pt, 'Remove points between', 0, T)
    vi = np.where(v)[0]
    for (t0, f) in pts:
        j = vi[np.argmin(np.abs(tt[vi] - t0))]
        c = change[j]
        # smooth: a 5-frame average of the change around this point
        lo, hi = max(0, j - 2), j + 3
        mm = v[lo:hi]
        c = float(change[lo:hi][mm].mean()) if mm.any() else float(c)
        call(pt, 'Add point', t0, f * 2 ** (c / 12))
    call([man, pt], 'Replace pitch tier')
    # timing: stressed words a little longer, the rest a touch quicker, the whole line paced by the feeling
    grid = np.arange(0, T + 0.01, 0.01)
    rate = np.ones_like(grid)
    for i, s in emph.items():
        a0, b0 = spans[i]
        rate[(grid >= a0) & (grid < b0)] = 1 + st['stretch'] * min(s, 1.2)
    longer = rate > 1
    inside = (grid >= vbeg) & (grid <= vend)
    if longer.any() and (inside & ~longer).any():
        extra = (rate[longer] - 1).sum()
        rate[inside & ~longer] = max(0.86, 1 - extra / (inside & ~longer).sum())
    rate = np.convolve(rate, np.ones(5) / 5, 'same') * pace
    dt = call(man, 'Extract duration tier')
    call(dt, 'Remove points between', 0, T)
    for g, r in zip(grid, rate):
        call(dt, 'Add point', float(g), float(r))
    call([man, dt], 'Replace duration tier')
    out = call(man, 'Get resynthesis (overlap-add)')
    b = out.values[0].astype(np.float64)
    # volume: the stressed words a little louder (in the new time)
    newt = np.concatenate([[0], np.cumsum(rate[:-1] * 0.01)])
    tmap = lambda t: float(np.interp(t, grid, newt))
    gain = np.zeros(len(b))
    ts = np.arange(len(b)) / SR
    for i, s in emph.items():
        a0, b0 = tmap(spans[i][0]), tmap(spans[i][1])
        w = max(b0 - a0, 0.08)
        gain += 3.0 * min(s, 1.2) * np.exp(-0.5 * ((ts - (a0 + 0.45 * w)) / (0.4 * w)) ** 2)
    b = b * 10 ** (gain / 20)
    pk_a, pk_b = np.abs(a).max(), np.abs(b).max()
    if pk_b > 0:
        b = b * min(pk_a / pk_b * 1.02, 0.95 / pk_b)
    return b, [round(tmap(t), 2) for t in onsets]


# ---------------------------------------------------------------- commands
def cmd_export(dst):
    for ep in EPS:
        os.makedirs(os.path.join(dst, ep), exist_ok=True)
        shutil.copy(os.path.join(AUD, ep, 'index.json'), os.path.join(dst, ep, 'index.json'))
        for l in lines(ep):
            src = os.path.join(AUD, ep, l['k'] + '.mp3')
            if os.path.exists(src):
                shutil.copy(src, os.path.join(dst, ep, l['k'] + '.mp3'))
    print('saved to', dst)


def one(job):
    ep, l, src, idx = job
    a = decode(os.path.join(src, ep, l['k'] + '.mp3'))
    dur, on = idx[l['k']]
    try:
        b, on2 = say(a, l, on, dur)
    except Exception as ex:  # a line that cannot be reshaped keeps its recording
        return ep, l['k'], None, str(ex)
    encode(b, os.path.join(AUD, ep, l['k'] + '.mp3'))
    return ep, l['k'], [round(len(b) / SR, 2), on2], None


def cmd_run(src, eps):
    from multiprocessing import Pool
    jobs = []
    idxs = {}
    for ep in eps:
        idxs[ep] = json.load(open(os.path.join(src, ep, 'index.json')))
        for l in lines(ep):
            if l['k'] in idxs[ep] and os.path.exists(os.path.join(src, ep, l['k'] + '.mp3')):
                jobs.append((ep, l, src, idxs[ep]))
    print(len(jobs), 'lines', flush=True)
    new = {ep: dict(json.load(open(os.path.join(AUD, ep, 'index.json')))) for ep in eps}
    with Pool(max(1, (os.cpu_count() or 2) - 1)) as p:
        for n, (ep, k, rec, err) in enumerate(p.imap_unordered(one, jobs)):
            if err:
                print('kept as is:', ep, k, err, flush=True)
                continue
            new[ep][k] = rec
            if n % 50 == 0:
                print(n, flush=True)
    for ep in eps:
        json.dump({k: new[ep][k] for k in sorted(new[ep])}, open(os.path.join(AUD, ep, 'index.json'), 'w'), separators=(',', ':'))
    print('done')


def cmd_explain(eps):
    for ep in eps:
        for l in lines(ep):
            toks = tokens(l['text'])
            e = pick(l['text'], l['mood'], l['energy'])
            print('%-9s %-9s %s' % (l['who'], l['mood'], ' '.join(('*%s*' % w.upper()) if i in e else w for i, (w, _) in enumerate(toks))))


if __name__ == '__main__':
    c = sys.argv[1]
    if c == 'export':
        cmd_export(sys.argv[2])
    elif c == 'run':
        cmd_run(sys.argv[2], sys.argv[3:] or EPS)
    elif c == 'explain':
        cmd_explain(sys.argv[2:] or EPS)
