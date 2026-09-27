"""Checks every puzzle bank in assets/js/puzzles/ and prints a report. Exit code 1 if anything fails.

  Word Bloom       every grid word and bonus word can be spelled from the wheel, the wheel's full word
                   is in the grid, the grid's crossings agree, every word is a safe lexicon word, each
                   level's wheels have at least its minimum number of words, and no two wheels in the
                   whole game use the same letters.
  Quiet Crossword  the fill is consistent (crossings agree), every run of 2+ letters in the grid is a
  Daily Ledger     listed answer (so there are no stray words), every newspaper grid's slots are each
                   filled exactly once, every clue is one we made for that answer (clue_variants.py,
                   the lexicon or clues.py) and never contains the answer itself.
  Quiet Words      every theme has 12+ words (the 72 older themes: 8+), each word is safe and has a
                   line, and a grid can be built for every theme at every level (same rules as
                   quiet-words.js).
It also reports sizes (no chunk over 400 KB), near-duplicates (answers shared between puzzles), how
often the same answer gets a different clue, and how difficulty rises from level to level.
Run from the repo root:  python3 tools/word-games/validate.py
"""
import glob
import json
import os
import random
import re
import sys
from collections import Counter, defaultdict

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from bank import OUT, read_index  # noqa: E402

FAIL = []
MAX_CHUNK = 400 * 1024


def fail(msg):
    FAIL.append(msg)


def load_bank(name, info):
    items = []
    for k in range(info['c']):
        path = os.path.join(OUT, '%s-%d.js' % (name, k))
        txt = open(path, encoding='utf-8').read()
        size = os.path.getsize(path)
        if size > MAX_CHUNK:
            fail('%s-%d.js is %d KB' % (name, k, size // 1024))
        m = re.search(r'\]\s*=\s*(\[.*\]);\s*$', txt, re.S)
        part = json.loads(m.group(1))
        if k < info['c'] - 1 and len(part) != info['per']:
            fail('%s-%d holds %d, not %d' % (name, k, len(part), info['per']))
        items.extend(part)
    if len(items) != info['n']:
        fail('%s holds %d puzzles, index says %d' % (name, len(items), info['n']))
    return items


def grid_of(words, W=None, H=None, where=''):
    """cells {(r, c): letter} from [[WORD, r, c, d, ...]]; flags clashes and overflow."""
    cells = {}
    for w in words:
        word, r, c, d = w[0], w[1], w[2], w[3]
        for i, ch in enumerate(word):
            rr, cc = (r, c + i) if d == 'a' else (r + i, c)
            if W is not None and not (0 <= rr < H and 0 <= cc < W):
                fail('%s: %s runs off the grid' % (where, word))
            if cells.get((rr, cc), ch) != ch:
                fail('%s: crossing clash at %s (%s)' % (where, (rr, cc), word))
            cells[(rr, cc)] = ch
    return cells


def runs(cells):
    """every maximal across/down run of 2+ letters, as (word, r, c, d)."""
    out = []
    for (r, c) in cells:
        if (r, c - 1) not in cells and (r, c + 1) in cells:
            s, cc = '', c
            while (r, cc) in cells:
                s += cells[(r, cc)]
                cc += 1
            out.append((s, r, c, 'a'))
        if (r - 1, c) not in cells and (r + 1, c) in cells:
            s, rr = '', r
            while (rr, c) in cells:
                s += cells[(rr, c)]
                rr += 1
            out.append((s, r, c, 'd'))
    return out


def near_dups(puzzles, minlen=4):
    """(most long answers shared by any two puzzles, identical answer sets)."""
    by_word = defaultdict(list)
    keys = Counter()
    best = 0
    for i, p in enumerate(puzzles):
        ws = [w[0] for w in p['w']]
        keys[tuple(sorted(ws))] += 1
        shared = Counter(j for w in ws if len(w) >= minlen for j in by_word[w])
        if shared:
            best = max(best, max(shared.values()))
        for w in ws:
            if len(w) >= minlen:
                by_word[w].append(i)
    return best, sum(v - 1 for v in keys.values() if v > 1)


def clue_ok_factory():
    from vocab import lex, plural_phrase, plural
    from clue_variants import build as build_variants, variants
    from clues import THEMES
    L, V = lex(), build_variants()
    hand = defaultdict(set)
    for d in THEMES.values():
        for w, c in d.items():
            hand[w].add(c)
    cache = {}

    def allowed(word):
        if word in cache:
            return cache[word]
        s = {c[0] for c in variants(word, V, L)} | hand.get(word, set())
        if L.get(word, {}).get('e'):
            s.add(L[word]['e'])
        for base in (word[:-1], word[:-2], word[:-3] + 'y'):
            if base in L and plural(base) == word:
                s.add(plural_phrase(L[base]['e']))
                s.add(plural_phrase(L[base]['h']))
                s |= {plural_phrase(c) for c in hand.get(base, set())}
        cache[word] = s
        return s

    def check(word, clue, where):
        w = word.lower()
        if not clue or not clue.strip():
            fail('%s: %s has no clue' % (where, word))
            return 'bad'
        if re.search(r'\b' + re.escape(w) + r'\b', clue.lower()):
            fail('%s: the clue for %s gives it away: %s' % (where, word, clue))
            return 'bad'
        return 'ok' if clue in allowed(w) else 'unmatched'
    return check


# ------------------------------------------------------------------ Word Bloom
BLOOM_MIN = {'gentle': 3, 'easy': 4, 'medium': 5, 'hard': 6, 'expert': 7}


def check_bloom(idx):
    from vocab import words
    safe = set(words(min_z=2.4, plurals=True, lengths=range(3, 10)))
    seen_keys = Counter()
    print('\nWord Bloom')
    for lid in ['gentle', 'easy', 'medium', 'hard', 'expert']:
        name = 'bloom-' + lid
        ps = load_bank(name, idx[name])
        short = 0
        for i, p in enumerate(ps):
            where = '%s #%d' % (name, i)
            lc = Counter(p['l'])
            grid = [w[0] for w in p['w']]
            grid_of(p['w'], p['W'], p['H'], where)
            if len(grid) < BLOOM_MIN[lid]:
                short += 1
            if not any(len(w) == len(p['l']) for w in grid):
                fail('%s: no word uses every letter' % where)
            for w in grid + p['b']:
                if Counter(w) - lc:
                    fail('%s: %s cannot be spelled from %s' % (where, w, p['l']))
                if w.lower() not in safe:
                    fail('%s: %s is not in the safe word list' % (where, w))
            seen_keys[''.join(sorted(p['l']))] += 1
        if short:
            fail('%s: %d wheels have fewer than %d words' % (name, short, BLOOM_MIN[lid]))
        L = [len(p['l']) for p in ps]
        n = [len(p['w']) for p in ps]
        print('  %-7s %5d wheels  letters %d-%d (avg %.1f)  grid words %d-%d (avg %.1f)  bonus avg %.1f' % (
            lid, len(ps), min(L), max(L), sum(L) / len(L), min(n), max(n), sum(n) / len(n), sum(len(p['b']) for p in ps) / len(ps)))
    dup = sum(v - 1 for v in seen_keys.values() if v > 1)
    print('  wheels sharing the same letters with another wheel: %d' % dup)
    if dup:
        fail('bloom: %d wheels repeat another wheel\'s letters' % dup)


# ------------------------------------------------------------------ crosswords
def check_crosswords(idx, prefix, levels, check_clue):
    from vocab import lex
    L = lex()
    print('\n' + ('Quiet Crossword' if prefix == 'xw' else 'The Daily Ledger Crossword'))
    for lid in levels:
        name = prefix + '-' + lid
        ps = load_bank(name, idx[name])
        stats = Counter()
        clues_by = defaultdict(set)
        uses = Counter()
        zs = []
        for i, p in enumerate(ps):
            where = '%s #%d' % (name, i)
            if 'g' in p:
                n = p['n']
                cells = grid_of(p['w'], n, n, where)
                g = p['g']
                from make_newspaper import slots_of
                slots = {(d, r, c, Lh) for (d, r, c, Lh) in slots_of([list(row) for row in g], n)}
                have = {(w[3], w[1], w[2], len(w[0])) for w in p['w']}
                if slots != have:
                    fail('%s: the answers do not fill the grid\'s slots exactly' % where)
                for (r, c) in cells:
                    if g[r][c] == '#':
                        fail('%s: a letter sits on a black square' % where)
                whites = sum(1 for r in range(n) for c in range(n) if g[r][c] != '#')
                if whites != len(cells):
                    fail('%s: %d white squares but %d letters' % (where, whites, len(cells)))
            else:
                cells = grid_of(p['w'], p['W'], p['H'], where)
                listed = {(w[0], w[1], w[2], w[3]) for w in p['w']}
                for run in runs(cells):
                    if run not in listed:
                        fail('%s: stray word %s in the grid' % (where, run[0]))
            for w in p['w']:
                stats[check_clue(w[0], w[4], where)] += 1
                clues_by[w[0]].add(w[4])
                uses[w[0]] += 1
                z = L.get(w[0].lower(), {}).get('z')
                if z:
                    zs.append(z)
        shared, same = near_dups(ps)
        multi = [w for w, k in uses.items() if k > 1]
        varied = sum(1 for w in multi if len(clues_by[w]) > 1)
        nw = [len(p['w']) for p in ps]
        size = [p.get('n') or max(p['W'], p['H']) for p in ps]
        print('  %-8s %5d puzzles  grid %d-%d  answers avg %.1f  familiarity %.2f  clues: %d matched, %d older-style%s' % (
            lid, len(ps), min(size), max(size), sum(nw) / len(nw), sum(zs) / max(1, len(zs)), stats['ok'], stats['unmatched'],
            ', %d bad' % stats['bad'] if stats['bad'] else ''))
        print('           near-duplicates: at most %d longer answers shared by two puzzles; %d identical answer sets; '
              'answers that recur get a different clue %d%% of the time' % (shared, same, 100 * varied // max(1, len(multi))))


# ------------------------------------------------------------------ Quiet Words
QW_TIERS = {'gentle': (7, 2, 5), 'easy': (9, 3, 7), 'medium': (10, 4, 8), 'hard': (11, 8, 10), 'expert': (12, 8, 12)}
DIRS = [(0, 1), (1, 0), (1, 1), (-1, 1), (0, -1), (-1, 0), (-1, -1), (1, -1)]


def build_search(words, N, ndirs, rng):
    """The same placement quiet-words.js uses (80 tries, 300 spots per word)."""
    dirs = DIRS[:ndirs]
    for _ in range(80):
        g = [[''] * N for _ in range(N)]
        ok = True
        for word in sorted(words, key=len, reverse=True):
            done = False
            for _k in range(300):
                dr, dc = rng.choice(dirs)
                r0, c0 = rng.randrange(N), rng.randrange(N)
                re_, ce = r0 + dr * (len(word) - 1), c0 + dc * (len(word) - 1)
                if not (0 <= re_ < N and 0 <= ce < N):
                    continue
                if any(g[r0 + dr * i][c0 + dc * i] not in ('', word[i]) for i in range(len(word))):
                    continue
                for i in range(len(word)):
                    g[r0 + dr * i][c0 + dc * i] = word[i]
                done = True
                break
            if not done:
                ok = False
                break
        if ok:
            return True
    return False


def check_words(idx):
    from make_themes import theme_safe, NEVER
    from vocab import lex
    from lexicon import _gentle
    L, gentle = lex(), _gentle()
    ps = load_bank('qw-themes', idx['qw-themes'])
    names = Counter(t['name'] for t in ps)
    print('\nQuiet Words')
    rng = random.Random(1)
    thin = 0
    fits = Counter()
    fewer = Counter()
    for i, t in enumerate(ps):
        where = 'qw-themes #%d (%s)' % (i, t['name'])
        ws = [w[0] for w in t['words']]
        if len(ws) < (8 if i < 72 else 12):
            fail('%s: only %d words' % (where, len(ws)))
        if i >= 72 and len(ws) < 12:
            thin += 1
        for w, line in t['words']:
            if not re.fullmatch(r'[A-Z]{3,12}', w):
                fail('%s: odd word %s' % (where, w))
            if not line or not line.strip():
                fail('%s: %s has no line' % (where, w))
            if i >= 72:
                lw = w.lower()
                if lw in NEVER or not (lw in L or theme_safe(lw, L, gentle)[0] or any(theme_safe(x, L, gentle)[0] for x in _splits(lw))):
                    fail('%s: %s did not pass the safety checks' % (where, w))
        for tier, (N, nd, want) in QW_TIERS.items():
            pool = [w for w in ws if len(w) <= N]
            rng.shuffle(pool)
            pick = pool[:want]
            if len(pick) < want:
                fewer[tier] += 1
            if build_search(pick, N, nd, rng):
                fits[tier] += 1
            else:
                fail('%s: no %s grid could be built' % (where, tier))
    dup = [n for n, k in names.items() if k > 1]
    if dup:
        fail('Quiet Words: repeated theme names %s' % dup)
    sets = [set(w[0] for w in t['words']) for t in ps]
    worst = 0
    for i in range(len(sets)):
        for j in range(i):
            worst = max(worst, len(sets[i] & sets[j]) / min(len(sets[i]), len(sets[j])))
    new = ps[72:]
    print('  %d themes (%d older + %d new; every new one has 12+ words: %s), %d words in all, %d different words' % (
        len(ps), 72, len(new), 'yes' if not thin else 'no', sum(len(t['words']) for t in ps), len({w[0] for t in ps for w in t['words']})))
    print('  new themes: %d-%d words (avg %.1f)' % (min(len(t['words']) for t in new), max(len(t['words']) for t in new), sum(len(t['words']) for t in new) / len(new)))
    print('  grids built: ' + ', '.join('%s %d/%d' % (k, fits[k], len(ps)) for k in QW_TIERS))
    print('  themes with fewer words than a level hides (older 8-word themes at the top levels): ' + ', '.join('%s %d' % (k, fewer[k]) for k in QW_TIERS))
    print('  most words any two themes share: %d%% of the smaller theme' % round(worst * 100))


def _splits(w):
    """joined words ("icecream") are checked as the phrase they came from."""
    return [w[:i] + '_' + w[i:] for i in range(3, len(w) - 2)]


def main():
    idx = read_index()
    total = sum(os.path.getsize(p) for p in glob.glob(os.path.join(OUT, '*.js')))
    biggest = max(glob.glob(os.path.join(OUT, '*.js')), key=os.path.getsize)
    print('Banks in assets/js/puzzles: %d files, %.1f MB in all; largest file %s (%d KB); index.js %d bytes' % (
        len(glob.glob(os.path.join(OUT, '*.js'))), total / 1e6, os.path.basename(biggest), os.path.getsize(biggest) // 1024, os.path.getsize(os.path.join(OUT, 'index.js'))))
    check_bloom(idx)
    check_clue = clue_ok_factory()
    check_crosswords(idx, 'xw', ['gentle', 'easy', 'medium', 'hard', 'expert'], check_clue)
    check_crosswords(idx, 'np', ['mini', 'small', 'daily', 'weekend', 'sunday'], check_clue)
    check_words(idx)
    print('\n%d problems' % len(FAIL))
    for f in FAIL[:60]:
        print('  -', f)
    if len(FAIL) > 60:
        print('  ... and %d more' % (len(FAIL) - 60))
    sys.exit(1 if FAIL else 0)


if __name__ == '__main__':
    main()
