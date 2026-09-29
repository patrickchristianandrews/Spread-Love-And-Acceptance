"""Makes every crossword bank from checked answers and checked clues:

  assets/js/puzzles/np-<level>-<k>.js   The Daily Ledger Crossword (Mini, Easy, Daily, Weekend, Big Sunday)
  assets/js/puzzles/xw-<level>-<k>.js   Quiet Crossword (Gentle, Easy, Medium, Hard, Expert)

Answers and clues come only from good_clues.py, so every answer is an everyday American word that
passed clue_check.answer_problem, and every clue passed clue_check.clue_problem (hand-written clues
from clue_bank.py and clues.py first). The newspaper grids lean hard on the hand-clued words.
Within a puzzle no clue is used twice, and the same answer is clued differently from puzzle to
puzzle. Before a bank is written, every puzzle is checked again with clue_check.puzzle_problems;
one that fails is left out. Existing Quiet Crossword puzzles that pass are kept (re-clued).

Run from the repo root:  python3 tools/word-games/make_crosswords.py [np] [xw] [gentle] [check] [fix]
  check  only checks the banks on disk and lists any problem (exit status 1 if there is one)
  fix    re-clues any puzzle on disk that no longer passes (after clue lists change), then checks
"""
import os
import random
import sys
import time
from multiprocessing import Pool

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from bank import write_bank  # noqa: E402
from banks_io import load_bank  # noqa: E402
from clue_check import puzzle_problems, answer_problem, set_american_words  # noqa: E402

# id, name, size, black squares (min, max), familiarity floor, clue kinds in order of preference, how many
NP = [
    ('mini', 'Mini', 5, (4, 8), 3.0, ['h', 's', 'd', 'x'], 420),
    ('small', 'Easy', 7, (6, 10), 3.4, ['h', 'd', 's', 'x'], 400),
    ('daily', 'Daily', 9, (12, 18), 3.2, ['h', 's', 'd', 'x'], 380),
    ('weekend', 'Weekend', 11, (18, 26), 3.0, ['s', 'h', 'x', 'd'], 330),
    ('sunday', 'Big Sunday', 13, (24, 34), 2.9, ['s', 'h', 'x', 'd'], 330),
]
# id, name, grid size, fewest/most words, familiarity floor, clue kinds, how many in all
XW = [
    ('easy', 'Easy', 8, 6, 9, 3.8, ['h', 'd', 's', 'x'], 1200),
    ('medium', 'Medium', 9, 9, 12, 3.4, ['h', 'd', 's', 'x'], 1200),
    ('hard', 'Hard', 10, 10, 14, 3.1, ['s', 'd', 'h', 'x'], 1200),
    ('expert', 'Expert', 10, 10, 16, 2.8, ['s', 'x', 'd', 'h'], 1200),
]
HAND_BONUS = 1.6   # how strongly the newspaper filler prefers answers with hand-written clues

_G = None


def G():
    global _G
    if _G is None:
        from good_clues import build
        from english_words import get_english_words_set
        from vocab import lex
        set_american_words(get_english_words_set(['web2'], lower=True, alpha=True) | set(lex()))
        _G = build()
    return _G


def zipf(w):
    from wordfreq import zipf_frequency
    return zipf_frequency(w, 'en')


class Clues:
    """Hands out clues for answers: kinds in the level's order of preference, taking turns through
    each answer's clues so it reads differently from puzzle to puzzle, never a clue already used in
    the same puzzle."""
    def __init__(self, prefer, rng):
        self.prefer, self.rng, self.uses = prefer, rng, {}

    def options(self, w):
        opts = G().get(w, [])
        return sorted(opts, key=lambda c: self.prefer.index(c[1]) if c[1] in self.prefer else 9)

    def clue(self, w, avoid):
        opts = [c for c in self.options(w) if c[0].lower() not in avoid]
        if not opts:
            return None
        # hand-written clues first, then the others, in turn
        best = [c for c in opts if c[1] == opts[0][1]]
        n = self.uses.get(w, 0)
        self.uses[w] = n + 1
        pick = best[n % len(best)] if n < len(best) * 2 else opts[n % len(opts)]
        return pick[0]

    def fill(self, words):
        """words: [[ANSWER, r, c, d], ...] -> the same with a clue each, or None."""
        avoid, out = set(), []
        for w in words:
            c = self.clue(w[0].lower(), avoid)
            if not c:
                return None
            avoid.add(c.lower())
            out.append(list(w[:4]) + [c])
        return out


_CTX = {}


def problems(words):
    """clue_check.puzzle_problems with the lexicon (for parts of speech) and the hand-written clues."""
    if not _CTX:
        from vocab import lex
        _CTX['known'] = lex()
        _CTX['hand'] = {w: {c for c, k in cs if k == 'h'} for w, cs in G().items()}
    return puzzle_problems(words, _CTX['known'], _CTX['hand'])


def ok(p):
    return not problems(p['w'])


# ---------------------------------------------------------------- the newspaper grids
def np_vocab(n, minz):
    hand = {w for w, cs in G().items() if any(k == 'h' for _, k in cs)}
    out = {}
    for w in G():
        if 3 <= len(w) <= n and not answer_problem(w):
            z = zipf(w)
            if z >= minz or w in hand:
                out[w] = (None, None, z + (HAND_BONUS if w in hand else 0), w in hand)
    return out


def newspaper(which):
    import make_newspaper as mn
    from make_levels import Spread
    for lid, name, n, blacks, minz, prefer, count in NP:
        if which and lid not in which:
            continue
        vocab = np_vocab(n, minz)
        mn.VOCAB[lid] = vocab
        level = (lid, name, n, blacks, minz, prefer)
        rng = random.Random(9000 + n)
        rotor = Clues(prefer, rng)
        spread = Spread(max_shared={5: 3, 7: 3, 9: 4, 11: 5, 13: 6}[n], max_uses={5: 30, 7: 20, 9: 20, 11: 22, 13: 26}[n])
        per_try = {5: 3, 7: 3, 9: 4, 11: 6, 13: 8}[n]
        made, seed, t0, stall, last = [], 700000 + 1000 * n, time.time(), 0, 0
        print('np', lid, len(vocab), 'answers', flush=True)
        while len(made) < count and time.time() - t0 < 2400:
            seeds = [(level, seed + i, per_try) for i in range(96)]
            seed += 96
            try:
                with Pool() as pool:
                    batch = pool.map_async(mn.one, seeds, chunksize=2).get(timeout=per_try * 40 * 30)
            except Exception as e:  # noqa: BLE001
                print('  batch skipped:', e, flush=True)
                continue
            for p in batch:
                if not p or len(made) >= count:
                    continue
                ws = [w[0].lower() for w in p['w']]
                if not spread.ok(ws):
                    continue
                clued = rotor.fill(p['w'])
                if not clued:
                    continue
                p['w'] = clued
                if not ok(p):
                    continue
                spread.add(ws)
                zs = [zipf(x) for x in ws]
                p['_z'] = sum(zs) / len(zs)
                made.append(p)
            print('  %s: %d / %d (%ds)' % (lid, len(made), count, time.time() - t0), flush=True)
            stall = stall + 1 if len(made) - last < 2 else 0
            last = len(made)
            if stall >= 10:
                break  # the filler keeps finding grids too like the ones made already
        made.sort(key=lambda p: -p.pop('_z'))   # the friendliest first
        write_bank('np-' + lid, made, 'The Daily Ledger Crossword, %s (%dx%d). Some clues adapted from Open English WordNet (CC BY 4.0)' % (name, n, n))


# ---------------------------------------------------------------- Quiet Crossword
_X = {}


def _xw_one(args):
    from layout import place
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


def crosswords(which):
    from make_levels import Spread
    for lid, name, n, lo, hi, minz, prefer, count in XW:
        if which and lid not in which:
            continue
        rng = random.Random(4400 + n + lo)
        rotor = Clues(prefer, rng)
        spread = Spread()
        kept = []
        old, _ = load_bank('xw-' + lid)
        for p in old:
            ws = [w[0].lower() for w in p['w']]
            if not all(w in G() and not answer_problem(w) for w in ws) or not spread.ok(ws):
                continue
            clued = rotor.fill(p['w'])
            if not clued:
                continue
            q = dict(p, w=clued)
            if ok(q):
                spread.add(ws)
                kept.append(q)
        pool = [w for w in G() if 3 <= len(w) <= n and not answer_problem(w) and (minz <= zipf(w) < minz + 1.6)]
        _X['pool'] = pool
        made = []
        seeds = iter(range(rng.randrange(1 << 20), 1 << 40))
        t0 = time.time()
        while len(kept) + len(made) < count and time.time() - t0 < 1200:
            with Pool() as pl:
                batch = pl.map_async(_xw_one, [(n, lo, hi, next(seeds)) for _ in range(400)], chunksize=10).get(timeout=1800)
            for r in batch:
                if r is None or len(kept) + len(made) >= count:
                    continue
                W, H, placed = r
                ws = [p[0] for p in placed]
                if not spread.ok(ws):
                    continue
                clued = rotor.fill([[w.upper(), r_, c, d] for (w, r_, c, d) in placed])
                if not clued:
                    continue
                q = {'t': name, 'W': W, 'H': H, 'w': clued}
                if not ok(q):
                    continue
                spread.add(ws)
                zs = [zipf(w) for w in ws]
                made.append((q, len(ws) - sum(zs) / len(zs)))
        made.sort(key=lambda x: x[1])
        bank = kept + [m[0] for m in made]
        write_bank('xw-' + lid, bank, 'Quiet Crossword, %s. Some clues adapted from Open English WordNet (CC BY 4.0)' % name)
        print('xw', lid, len(old), 'old,', len(kept), 'kept,', len(made), 'new', flush=True)


def gentle(count=1400):
    """Themed crosswords with the friendliest clues: the hand-written themes in clues.py first, then
    every Quiet Words theme with enough short, familiar, well-clued words."""
    from clues import THEMES
    from layout import place
    from make_levels import Spread, spread_out
    from themes_bank import all_themes
    from clue_check import americanize
    rng = random.Random(20260929)
    rotor = Clues(['h', 'd', 's', 'x'], rng)
    spread = Spread(max_shared=4, max_uses=40)
    themes = []
    for tname, d in THEMES.items():
        themes.append((tname, [w for w in d if 3 <= len(w) <= 8 and w in G() and not answer_problem(w)], True))
    for t in all_themes():
        pool = []
        for w, _line in t['words']:
            w = w.lower()
            if 3 <= len(w) <= 8 and w.isalpha() and w in G() and not answer_problem(w):
                pool.append(w)
        if len(pool) >= 8:
            themes.append((americanize(t['name']), pool, False))
    print('gentle crossword themes:', len(themes))
    made, rounds = [], 0
    while len(made) < count and rounds < 14:
        rounds += 1
        order = themes[:]
        rng.shuffle(order)
        # the hand-written themes come round twice as often
        order += [t for t in themes if t[2]]
        for tname, pool, _h in order:
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
                own = {w: americanize(c) for w, c in THEMES.get(tname, {}).items()}
                words, avoid = [], set()
                for (w, r, c, dd) in placed:
                    cl = own.get(w) if own.get(w) and own[w].lower() not in avoid else rotor.clue(w, avoid)
                    if not cl:
                        break
                    avoid.add(cl.lower())
                    words.append([w.upper(), r, c, dd, cl])
                q = {'t': tname, 'W': W, 'H': H, 'w': words}
                if len(words) != len(placed) or not ok(q):
                    continue
                spread.add(ws)
                made.append(q)
                break
    made = spread_out(made, lambda p: p['t'])
    write_bank('xw-gentle', made, 'Quiet Crossword, Gentle (themed, friendly clues)')
    print('xw gentle', len(made), flush=True)


def fix():
    """Re-clue any served puzzle that no longer passes (after the clue lists changed), and leave out
    one that still can't pass. Quicker than making a bank again."""
    for b, prefer in [('np-mini', NP[0][5]), ('np-small', NP[1][5]), ('np-daily', NP[2][5]), ('np-weekend', NP[3][5]), ('np-sunday', NP[4][5]),
                      ('xw-gentle', ['h', 'd', 's', 'x']), ('xw-easy', XW[0][6]), ('xw-medium', XW[1][6]), ('xw-hard', XW[2][6]), ('xw-expert', XW[3][6])]:
        items, note = load_bank(b)
        rotor, out, changed = Clues(prefer, random.Random(len(items))), [], 0
        for p in items:
            if problems(p['w']):
                changed += 1
                clued = rotor.fill([w[:4] for w in p['w']])
                if not clued:
                    continue
                p = dict(p, w=clued)
                if problems(p['w']):
                    continue
            out.append(p)
        if changed:
            write_bank(b, out, note)
            print(b, changed, 're-clued,', len(items) - len(out), 'left out')


def check():
    bad = 0
    for b in ['np-mini', 'np-small', 'np-daily', 'np-weekend', 'np-sunday', 'xw-gentle', 'xw-easy', 'xw-medium', 'xw-hard', 'xw-expert']:
        items, _ = load_bank(b)
        n = 0
        for i, p in enumerate(items):
            probs = problems(p['w'])
            if probs:
                n += 1
                if n <= 5:
                    print(b, i, probs[:3])
        print(b, len(items), 'puzzles,', n, 'with problems')
        bad += n
    return bad


if __name__ == '__main__':
    args = sys.argv[1:] or ['np', 'xw', 'gentle']
    G()
    if 'check' in args:
        sys.exit(1 if check() else 0)
    if 'fix' in args:
        fix()
        sys.exit(1 if check() else 0)
    levels = [a for a in args if a not in ('np', 'xw', 'gentle')]
    if 'np' in args:
        newspaper(levels)
    if 'xw' in args:
        crosswords(levels)
    if 'gentle' in args:
        gentle()
    print('problems left:', check())
