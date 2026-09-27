"""Makes the levelled puzzle banks for Word Bloom and Quiet Crossword from the safe vocabulary
(vocab.py / lexicon.py), written as small chunk files by bank.py:

  assets/js/puzzles/bloom-<level>-<k>.js   Word Bloom, five difficulty levels
  assets/js/puzzles/xw-<level>-<k>.js      Quiet Crossword, five difficulty levels
  assets/js/puzzles/bloom-lex.js           the word list Word Bloom uses to grow new wheels in the
                                           browser once a player has seen every one in a bank

The puzzles from before the banks grew stay first in each bank (bank.legacy). After them:
  - Word Bloom: every wheel's letters are used once across all five levels, so no two wheels
    share the same answers. Wheels grow from 4 letters (Gentle) to 9 (Expert).
  - Quiet Crossword: no two puzzles in a level share more than a few answers, no answer is used
    too often, and the same answer is clued in different words from puzzle to puzzle (clue_variants.py).
    Gentle crosswords are themed, from the Quiet Words themes (themes_bank.py) and clues.py.
Run from the repo root:  python3 tools/word-games/make_levels.py [bloom] [xw] [gentle] [lex]
"""
import json
import os
import random
import sys
from collections import Counter
from multiprocessing import Pool

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from layout import place  # noqa: E402
from vocab import words, lex  # noqa: E402
from clues import THEMES, all_clues  # noqa: E402
from bank import legacy, write_bank, ClueRotor, OUT  # noqa: E402
from clue_variants import build as build_variants  # noqa: E402

# Word Bloom: level, [(wheel letters, base familiarity floor, grid-word familiarity floor)], fewest/most grid words, how many new
BLOOM = [
    ('gentle', 'Gentle', [(4, 3.0, 3.4), (5, 3.0, 3.6)], 3, 5, 1000),
    ('easy', 'Easy', [(5, 2.8, 3.4), (6, 3.0, 3.5)], 4, 7, 1500),
    ('medium', 'Medium', [(6, 2.8, 3.3), (7, 3.0, 3.4)], 5, 9, 1600),
    ('hard', 'Hard', [(7, 2.7, 3.1), (8, 3.0, 3.2)], 6, 10, 1600),
    ('expert', 'Expert', [(8, 2.6, 2.9), (9, 2.6, 2.9)], 7, 12, 2200),
]
# Quiet Crossword: id, name, grid size, fewest/most words, familiarity floor, clue kinds in order of preference, how many new
XW = [
    ('easy', 'Easy', 8, 6, 9, 3.9, ['h', 'd'], 1750),
    ('medium', 'Medium', 9, 9, 12, 3.5, ['h', 'd', 'x', 's'], 1750),
    ('hard', 'Hard', 10, 10, 14, 3.2, ['s', 'd', 'x', 'k', 'h'], 1750),
    ('expert', 'Expert', 10, 10, 16, 2.9, ['s', 'k', 'x', 'd', 'h'], 1750),
]
MAX_SHARED = 3        # two crosswords in a level share at most this many answers
MAX_USES = 12         # and no answer turns up in more than this many crosswords of a level


def mask(w):
    m = 0
    for ch in w:
        m |= 1 << (ord(ch) - 97)
    return m


def letters_key(w):
    return ''.join(sorted(w.lower()))


# ---------------------------------------------------------------- Word Bloom
_B = {}


def _bloom_one(args):
    base, L, gz, lo, hi, seed = args
    allw, masks, counts = _B['allw'], _B['masks'], _B['counts']
    rng = random.Random(seed)
    bm, bc = masks[base], counts[base]
    form = [w for w in allw if len(w) <= L and not (masks[w] & ~bm) and not (counts[w] - bc)]
    grid_pool = sorted([w for w in form if w != base and (allw[w][2] >= gz or allw[w][3])],
                       key=lambda w: (-allw[w][2] - (1 if allw[w][3] else 0), w))
    if len(grid_pool) + 1 < lo:
        return None
    pick = [base] + grid_pool[:hi - 1]
    side = 9 if L >= 9 else 8
    placed, W, H = place(pick, side, side, rng, tries=25)
    got = [p[0] for p in placed]
    if len(got) < lo or base not in got:
        return None
    letters = list(base.upper())
    rng.shuffle(letters)
    zs = [allw[w][2] for w in got]
    return {'l': ''.join(letters), 'W': W, 'H': H, 'w': [[w.upper(), r, c, d] for (w, r, c, d) in placed],
            'b': sorted(w.upper() for w in form if w not in got)}, sum(zs) / len(zs)


def bloom(rng):
    allw = words(min_z=2.6, plurals=True, lengths=range(3, 10))
    _B.update(allw=allw, masks={w: mask(w) for w in allw}, counts={w: Counter(w) for w in allw})
    used = set()
    old = {lid: legacy('bloom-' + lid) for lid, *_ in BLOOM}
    # the old banks had a few anagram pairs (the same letters twice): the second of each is swapped
    # for a new wheel at the same place in the bank
    swap = {}
    for lid, lst in old.items():
        for i, p in enumerate(lst):
            k = letters_key(p['l'])
            if k in used:
                swap.setdefault(lid, []).append(i)
            used.add(k)
    for lid, name, specs, lo, hi, count in BLOOM:
        made = []
        for (L, bz, gz) in specs:
            want = count - len(made)
            if want <= 0:
                break
            bases = [w for w, v in allw.items() if len(w) == L and (v[2] >= bz or v[3]) and len(set(w)) >= L - (1 if L < 7 else 2)]
            # the most familiar first, with a little shuffle so neighbouring wheels differ
            bases.sort(key=lambda w: -(allw[w][2] + (0.8 if allw[w][3] else 0) + rng.random() * 0.8))
            uniq = []
            for b in bases:
                k = letters_key(b)
                if k not in used:
                    used.add(k)
                    uniq.append(b)
            jobs = [(b, L, gz, lo, hi, rng.randrange(1 << 30)) for b in uniq]
            with Pool() as pool:
                res = pool.map(_bloom_one, jobs, chunksize=16)
            kept = 0
            for b, r in zip(uniq, res):
                if r is None:
                    used.discard(letters_key(b))  # free for a later level
                    continue
                if kept < want:
                    made.append(r)
                    kept += 1
                else:
                    used.discard(letters_key(b))
        # a gentle climb within each level: fewer letters, fewer words and familiar words first
        made.sort(key=lambda x: (len(x[0]['l']), len(x[0]['w']) + (4.5 - x[1]) * 2, sum(len(w[0]) for w in x[0]['w'])))
        new = [m[0] for m in made]
        for i in swap.get(lid, []):
            old[lid][i] = new.pop(0)  # the friendliest new wheel takes the repeated one's place
        bank = old[lid] + new
        write_bank('bloom-' + lid, bank, 'Word Bloom, %s' % name)
        print('bloom', lid, len(old[lid]), '->', len(bank), '(%d repeated old wheels replaced)' % len(swap.get(lid, [])), flush=True)


def bloom_lexicon():
    """The words Word Bloom's in-browser generator may use: by length, most familiar first, with a
    marker for where the everyday words end (so Gentle wheels stay friendly)."""
    allw = words(min_z=2.6, plurals=True, lengths=range(3, 10))
    out = {}
    for L in range(3, 10):
        ws = sorted((w for w in allw if len(w) == L), key=lambda w: -(allw[w][2] + (0.8 if allw[w][3] else 0)))
        tiers = [sum(1 for w in ws if allw[w][2] + (0.8 if allw[w][3] else 0) >= z) for z in (4.0, 3.4, 3.0)]
        out[str(L)] = {'w': ' '.join(ws), 't': tiers}
    path = os.path.join(OUT, 'bloom-lex.js')
    with open(path, 'w') as f:
        f.write('/* bloom-lex.js: the safe, gentle words Word Bloom uses to grow brand-new wheels in the browser once\n'
                '   a player has played every wheel in a level. By length, most familiar first; t = how many are\n'
                '   very familiar / familiar / known. Made by tools/word-games/make_levels.py. Do not edit by hand. */\n')
        f.write('window.TOL_BLOOM_LEX = ' + json.dumps(out, separators=(',', ':')) + ';\n')
    print('bloom-lex', sum(len(v['w'].split()) for v in out.values()), 'words,', os.path.getsize(path) // 1024, 'KB')


# ---------------------------------------------------------------- Quiet Crossword
class Spread:
    """Keeps a level varied: no two puzzles share more than max_shared of their longer answers (4+ letters;
    short "glue" words like ERA or ATE are part of every crossword), and no answer turns up too often."""
    def __init__(self, max_shared=MAX_SHARED, max_uses=MAX_USES, minlen=4):
        self.by_word, self.n, self.max_shared, self.max_uses, self.minlen = {}, 0, max_shared, max_uses, minlen
        self.keys = set()

    def ok(self, ws):
        key = tuple(sorted(ws))
        if key in self.keys:
            return False
        long_ = [w for w in ws if len(w) >= self.minlen]
        if any(len(self.by_word.get(w, ())) >= self.max_uses for w in long_):
            return False
        if any(len(self.by_word.get(w, ())) >= self.max_uses * 4 for w in ws if len(w) < self.minlen):
            return False
        shared = Counter(i for w in long_ for i in self.by_word.get(w, ()))
        return not shared or max(shared.values()) <= self.max_shared

    def add(self, ws):
        i = self.n
        self.n += 1
        self.keys.add(tuple(sorted(ws)))
        for w in ws:
            self.by_word.setdefault(w, []).append(i)


def reclue(puzzles, rotor, V, L):
    """Old puzzles keep their grids; a clue that no longer matches its answer's clue list is replaced."""
    from clue_variants import variants
    fixed = 0
    for p in puzzles:
        for w in p['w']:
            opts = variants(w[0].lower(), V, L)
            if opts and w[4] not in [o[0] for o in opts] and w[4] != (L.get(w[0].lower()) or {}).get('e'):
                w[4] = rotor.clue(w[0].lower(), w[4])
                fixed += 1
    return fixed


_X = {}


def _xw_one(args):
    n, lo, hi, seed = args
    rng = random.Random(seed)
    pool = _X['pool']
    pick = rng.sample(pool, 90 if lo >= 10 else 40)
    placed, W, H = place(pick, n, n, rng, tries=8)
    if len(placed) < lo:
        return None
    placed = placed[:hi]
    minr = min(r for _, r, _, _ in placed)
    minc = min(c for _, _, c, _ in placed)
    placed = [(w, r - minr, c - minc, d) for (w, r, c, d) in placed]
    W = max(c + (len(w) if d == 'a' else 1) for (w, r, c, d) in placed)
    H = max(r + (len(w) if d == 'd' else 1) for (w, r, c, d) in placed)
    return W, H, placed


def crosswords(rng):
    V = build_variants()
    L = lex()
    from clue_variants import variants
    for lid, name, n, lo, hi, minz, prefer, count in XW:
        vocab = words(min_z=minz, plurals=False, lengths=range(3, n + 1))
        # skip the very plainest words at harder levels, and any word we can't clue in its own right
        pool = [w for w in vocab if (vocab[w][2] < minz + 1.6 or vocab[w][3]) and variants(w, V, L)]
        _X['pool'] = pool
        rotor = ClueRotor(V, L, prefer, rng)
        old = legacy('xw-' + lid)
        spread = Spread()
        for p in old:
            spread.add([w[0].lower() for w in p['w']])
            for w in p['w']:
                rotor.uses[w[0].lower()] = rotor.uses.get(w[0].lower(), 0) + 1
        fixed = reclue(old, rotor, V, L)
        made = []
        seeds = iter(range(rng.randrange(1 << 20), 1 << 40))
        while len(made) < count:
            try:
                with Pool() as pl:  # a fresh pool per batch, with a timeout, so a lost worker can't stall the run
                    batch = pl.map_async(_xw_one, [(n, lo, hi, next(seeds)) for _ in range(400)], chunksize=10).get(timeout=1800)
            except Exception as e:  # noqa: BLE001
                print('  batch skipped:', e, flush=True)
                continue
            if True:
                for r in batch:
                    if r is None or len(made) >= count:
                        continue
                    W, H, placed = r
                    ws = [p[0] for p in placed]
                    if not spread.ok(ws):
                        continue
                    spread.add(ws)
                    out = [[w.upper(), r_, c, d, rotor.clue(w, vocab[w][0])] for (w, r_, c, d) in placed]
                    zs = [vocab[w][2] for w in ws]
                    made.append(({'t': name, 'W': W, 'H': H, 'w': out}, len(ws) - sum(zs) / len(zs)))
        made.sort(key=lambda x: x[1])  # a gentle climb: fewer, more familiar words first
        bank = old + [m[0] for m in made]
        write_bank('xw-' + lid, bank, 'Quiet Crossword, %s. Clues adapted from Open English WordNet (CC BY 4.0)' % name)
        print('xw', lid, len(old), '->', len(bank), '(%d old clues refreshed)' % fixed, flush=True)


def gentle_crosswords(rng, count=1250):
    """Themed crosswords with the friendliest clues: the hand-written themes in clues.py, then every
    Quiet Words theme (themes_bank.py) that has enough short, familiar words."""
    from themes_bank import all_themes
    V = build_variants()
    L = lex()
    from clue_variants import variants
    hand = all_clues()
    rotor = ClueRotor(V, L, ['h', 'd'], rng)
    old = legacy('xw-gentle')
    spread = Spread(max_shared=4, max_uses=40)
    for p in old:
        spread.add([w[0].lower() for w in p['w']])
    themes = []
    for t in all_themes():
        pool = []
        for w, _line in t['words']:
            w = w.lower()
            if 3 <= len(w) <= 8 and w.isalpha() and (w in hand or rotor.options(w)):
                pool.append(w)
        if len(pool) >= 7:
            themes.append((t['name'], pool))
    for tname, d in THEMES.items():
        themes.append((tname, [w for w in d if 3 <= len(w) <= 8]))
    print('gentle crossword themes:', len(themes))
    made = []
    rounds = 0
    while len(made) < count and rounds < 12:
        rounds += 1
        order = themes[:]
        rng.shuffle(order)
        for tname, pool in order:
            if len(made) >= count:
                break
            for _ in range(6):
                p = pool[:]
                rng.shuffle(p)
                placed, W, H = place(p[:11], 8, 8, rng, tries=25)
                if len(placed) < 6:
                    continue
                ws = [x[0] for x in placed]
                if not spread.ok(ws):
                    continue
                spread.add(ws)
                own = THEMES.get(tname, {})
                made.append({'t': tname, 'W': W, 'H': H,
                             'w': [[w.upper(), r, c, dd, own.get(w) or rotor.clue(w, hand.get(w))] for (w, r, c, dd) in placed]})
                break
    # spread the themes out so the same one never comes twice in a row
    made = spread_out(made, lambda p: p['t'])
    bank = old + made
    write_bank('xw-gentle', bank, 'Quiet Crossword, Gentle (themed, friendly clues)')
    print('xw gentle', len(old), '->', len(bank), flush=True)


def spread_out(items, key, gap=6):
    """Reorder so that no two items with the same key sit within `gap` of each other where possible."""
    out, waiting = [], list(items)
    while waiting:
        recent = {key(x) for x in out[-gap:]}
        for i, x in enumerate(waiting):
            if key(x) not in recent:
                out.append(waiting.pop(i))
                break
        else:
            out.append(waiting.pop(0))
    return out


if __name__ == '__main__':
    rng = random.Random(20260927)
    which = sys.argv[1:] or ['bloom', 'lex', 'xw', 'gentle']
    if 'bloom' in which:
        bloom(rng)
    if 'lex' in which:
        bloom_lexicon()
    if 'xw' in which:
        crosswords(rng)
    if 'gentle' in which:
        gentle_crosswords(rng)
