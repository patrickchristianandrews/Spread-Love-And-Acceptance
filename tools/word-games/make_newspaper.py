"""Makes the newspaper-style crosswords: assets/js/puzzles/np-<level>-<k>.js (chunks, see bank.py)

Dense grids with rotationally symmetric black squares, every white square part of an
across and a down word of 3+ letters, numbered the usual way. Five levels, from a 5x5
mini with the friendliest words and clues to a 13x13 with trickier words and short,
newspaper-style clues.
The puzzles from before the banks grew stay first (bank.legacy). New ones must not share more than a
few answers with any other puzzle in the level, no answer is used too often, and the same answer is
clued in different words from puzzle to puzzle (clue_variants.py).
The banks are now made by make_crosswords.py, which uses the pattern makers and the filler here with
checked answers and clues only (clue_check.py, good_clues.py). Running this file hands over to it.
Run from the repo root:  python3 tools/word-games/make_crosswords.py np [level ...]
"""
import json
import os
import random
import sys
import time
from multiprocessing import Pool

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from vocab import words, lex  # noqa: E402
from bank import legacy, write_bank, ClueRotor  # noqa: E402
from clue_variants import build as build_variants, variants  # noqa: E402
from make_levels import Spread, reclue  # noqa: E402

OUT = os.path.join(HERE, '..', '..', 'assets', 'js', 'puzzles')
# id, name, size, black squares (min, max), familiarity floor, clue kinds in order of preference
LEVELS = [
    ('mini', 'Mini', 5, (4, 8), 3.0, ['h', 'd']),
    ('small', 'Easy', 7, (6, 10), 3.6, ['h', 'd', 'x']),
    ('daily', 'Daily', 9, (12, 18), 3.3, ['d', 's', 'x', 'h', 'k']),
    ('weekend', 'Weekend', 11, (18, 26), 3.0, ['s', 'd', 'x', 'k', 'h']),
    ('sunday', 'Big Sunday', 13, (24, 34), 2.8, ['s', 'k', 'x', 'd', 'h']),
]
# how many new puzzles, how many answers two puzzles may share, how often one answer may appear
COUNTS = {'mini': (800, 2, 16), 'small': (1200, 3, 16), 'daily': (1100, 4, 20), 'weekend': (1000, 5, 24), 'sunday': (900, 6, 28)}
NOISE = {5: 6.0, 7: 3.0, 9: 1.8, 11: 1.4, 13: 1.4}   # how freely the filler strays from the most familiar words


def slots_of(grid, n):
    slots = []
    for r in range(n):
        c = 0
        while c < n:
            if grid[r][c] == '#':
                c += 1
                continue
            s = c
            while c < n and grid[r][c] != '#':
                c += 1
            if c - s > 1:
                slots.append(('a', r, s, c - s))
    for c in range(n):
        r = 0
        while r < n:
            if grid[r][c] == '#':
                r += 1
                continue
            s = r
            while r < n and grid[r][c] != '#':
                r += 1
            if r - s > 1:
                slots.append(('d', s, c, r - s))
    return slots


def valid_pattern(grid, n):
    sl = slots_of(grid, n)
    if any(L < 3 for (_, _, _, L) in sl):
        return False
    # a dense (American-style) mini: every white square is in an across and a down word
    inword = {}
    for (d, r, c, L) in sl:
        for i in range(L):
            cell = (r, c + i) if d == 'a' else (r + i, c)
            inword[cell] = inword.get(cell, 0) + 1
    if any(inword.get((r, c), 0) < 2 for r in range(n) for c in range(n) if grid[r][c] != '#'):
        return False
    # every white square connected
    whites = [(r, c) for r in range(n) for c in range(n) if grid[r][c] != '#']
    if not whites:
        return False
    seen, stack = set(), [whites[0]]
    while stack:
        r, c = stack.pop()
        if (r, c) in seen:
            continue
        seen.add((r, c))
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            rr, cc = r + dr, c + dc
            if 0 <= rr < n and 0 <= cc < n and grid[rr][cc] != '#' and (rr, cc) not in seen:
                stack.append((rr, cc))
    return len(seen) == len(whites)


def make_pattern(n, lo, hi, rng):
    for _ in range(4000):
        grid = [['.'] * n for _ in range(n)]
        target = rng.randint(lo, hi)
        placed = 0
        tries = 0
        while placed < target and tries < 400:
            tries += 1
            r, c = rng.randrange(n), rng.randrange(n)
            if grid[r][c] == '#':
                continue
            grid[r][c] = '#'
            grid[n - 1 - r][n - 1 - c] = '#'
            placed += 1 if (r, c) == (n - 1 - r, n - 1 - c) else 2
        if valid_pattern(grid, n) and all(L <= 11 for (_, _, _, L) in slots_of(grid, n)):
            return grid
    return None


class Filler:
    """Fills a grid fast: each (length, position, letter) keeps a bitmask of the words that fit,
    so finding what fits a slot is a few AND operations. Most familiar words get the lowest
    bits, with a little shuffling so every puzzle comes out different."""
    def __init__(self, vocab, rng, n=9):
        self.rng, self.n = rng, n
        self.lists, self.index, self.all = {}, {}, {}
        for L in range(3, 16):
            ws = [w for w in vocab if len(w) == L]
            noise = NOISE.get(max(5, min(13, getattr(self, 'n', 9))), 1.4)
            ws.sort(key=lambda w: -(vocab[w][2] + (1.2 if vocab[w][3] else 0) + rng.random() * noise))
            self.lists[L] = ws
            self.all[L] = (1 << len(ws)) - 1
            for k, w in enumerate(ws):
                bit = 1 << k
                for i, ch in enumerate(w):
                    self.index[(L, i, ch)] = self.index.get((L, i, ch), 0) | bit

    def mask(self, slot, grid, used):
        d, r, c, L = slot
        m = self.all.get(L, 0) & ~used.get(L, 0)
        for i in range(L):
            ch = grid[r][c + i] if d == 'a' else grid[r + i][c]
            if ch not in '.#':
                m &= self.index.get((L, i, ch), 0)
                if not m:
                    return 0
        return m

    def fill(self, pattern, deadline, slots=None):
        n = len(pattern)
        grid = [row[:] for row in pattern]
        slots = slots or slots_of(grid, n)
        used, assigned = {}, {}
        cells = {s: [(s[1], s[2] + i) if s[0] == 'a' else (s[1] + i, s[2]) for i in range(s[3])] for s in slots}
        # which slots cross which
        at = {}
        for s in slots:
            for cell in cells[s]:
                at.setdefault(cell, []).append(s)
        cross = {s: [t for cell in cells[s] for t in at[cell] if t != s] for s in slots}

        def rec():
            if time.time() > deadline:
                return False
            best, best_m, best_n = None, 0, None
            for s in slots:
                if s in assigned:
                    continue
                m = self.mask(s, grid, used)
                k = m.bit_count()
                if k == 0:
                    return False
                if best_n is None or k < best_n:
                    best, best_m, best_n = s, m, k
                    if k == 1:
                        break
            if best is None:
                return True
            L = best[3]
            picks, m = [], best_m
            while m and len(picks) < 12:
                low = m & -m
                picks.append(low.bit_length() - 1)
                m ^= low
            head = picks[:4]
            self.rng.shuffle(head)
            picks[:4] = head
            for k in picks:
                w = self.lists[L][k]
                saved = [grid[r][c] for (r, c) in cells[best]]
                for (r, c), ch in zip(cells[best], w):
                    grid[r][c] = ch
                assigned[best] = w
                used[L] = used.get(L, 0) | (1 << k)
                if all(self.mask(t, grid, used) for t in cross[best] if t not in assigned) and rec():
                    return True
                used[L] ^= (1 << k)
                del assigned[best]
                for (r, c), ch in zip(cells[best], saved):
                    grid[r][c] = ch
            return False

        if rec():
            return grid, assigned
        return None


def british_pattern(n, rng):
    """A newspaper lattice: black squares where both row and column are odd; words run along the
    even rows and columns, broken by a few more symmetric black squares."""
    for _ in range(3000):
        grid = [['#' if (r % 2 and c % 2) else '.' for c in range(n)] for r in range(n)]
        for _k in range(rng.randint(n // 3, n // 2 + 1)):
            r = rng.randrange(0, n, 2)
            c = rng.randrange(n)
            if c % 2 == 0 and rng.random() < 0.7:
                c = rng.randrange(1, n, 2)
            for rr, cc in ((r, c), (c, r)) if rng.random() < 0.5 else ((r, c),):
                grid[rr][cc] = '#'
                grid[n - 1 - rr][n - 1 - cc] = '#'
        sl = slots_of(grid, n)
        # a British grid allows unchecked squares, so check only word lengths and connection
        if sl and all(L >= 3 for (_, _, _, L) in sl) and all(L <= min(n, 11) for (_, _, _, L) in sl) and connected(grid, n) and covered(grid, n, sl):
            return grid, sl
    return None, None


def connected(grid, n):
    whites = [(r, c) for r in range(n) for c in range(n) if grid[r][c] != '#']
    seen, stack = set(), whites[:1]
    while stack:
        r, c = stack.pop()
        if (r, c) in seen:
            continue
        seen.add((r, c))
        for dr, dc in ((1, 0), (-1, 0), (0, 1), (0, -1)):
            rr, cc = r + dr, c + dc
            if 0 <= rr < n and 0 <= cc < n and grid[rr][cc] != '#':
                stack.append((rr, cc))
    return len(seen) == len(whites)


def covered(grid, n, sl):
    """Every white square belongs to at least one word, and no white square stands alone."""
    inword = set()
    for (d, r, c, L) in sl:
        for i in range(L):
            inword.add((r, c + i) if d == 'a' else (r + i, c))
    return all((r, c) in inword for r in range(n) for c in range(n) if grid[r][c] != '#')


def slots_min(grid, n, minlen=3):
    return [s for s in slots_of_all(grid, n) if s[3] >= minlen]


def slots_of_all(grid, n):
    return slots_of(grid, n)


def one(args):
    level, seed, per_try = args
    lid, name, n, (lo, hi), minz, prefer = level
    rng = random.Random(seed)
    vocab = VOCAB[lid]
    f = Filler(vocab, rng, n)
    for _ in range(40):
        if n <= 5:
            pat, sl = make_pattern(n, lo, hi, rng), None
        else:
            pat, sl = british_pattern(n, rng)
        if not pat:
            continue
        got = f.fill(pat, time.time() + per_try, sl)
        if got:
            grid, assigned = got
            words_out = [[w.upper(), r, c, d] for (d, r, c, L), w in assigned.items()]
            return {'n': n, 'g': [''.join(ch if ch == '#' else '.' for ch in row) for row in grid], 'w': words_out}
    return None


VOCAB = {}


def main():
    which = sys.argv[1:] or [lv[0] for lv in LEVELS]
    V = build_variants()
    Lx = lex()
    for level in LEVELS:
        lid, n = level[0], level[2]
        # only words we can clue in their own right
        VOCAB[lid] = {w: v for w, v in words(min_z=level[4], plurals=True, lengths=range(3, n + 1)).items() if variants(w, V, Lx)}
    for level in LEVELS:
        lid, name, n = level[0], level[1], level[2]
        if lid not in which:
            continue
        count, shared, uses = COUNTS[lid]
        per_try = {5: 3, 7: 3, 9: 4, 11: 6, 13: 8}[n]
        rng = random.Random(4242 + n)
        rotor = ClueRotor(V, Lx, level[5], rng)
        old = legacy('np-' + lid)
        spread = Spread(max_shared=shared, max_uses=uses)
        for p in old:
            spread.add([w[0].lower() for w in p['w']])
            for w in p['w']:
                rotor.uses[w[0].lower()] = rotor.uses.get(w[0].lower(), 0) + 1
        fixed = reclue(old, rotor, V, Lx)
        t0 = time.time()
        made, seed = [], 500000 + 1000 * n
        while len(made) < count and time.time() - t0 < 3600:
            seeds = [(level, seed + i, per_try) for i in range(240)]
            seed += 240
            try:
                with Pool() as pool:  # a fresh pool per batch, with a timeout, so a lost worker can't stall the run
                    batch = pool.map_async(one, seeds, chunksize=4).get(timeout=per_try * 40 * 60)
            except Exception as e:  # noqa: BLE001
                print('  batch skipped:', e, flush=True)
                continue
            for p in batch:
                if not p or len(made) >= count:
                    continue
                ws = [w[0].lower() for w in p['w']]
                if not spread.ok(ws):
                    continue
                spread.add(ws)
                for w in p['w']:
                    w.append(rotor.clue(w[0].lower(), VOCAB[lid][w[0].lower()][0]))
                zs = [VOCAB[lid][x][2] for x in ws]
                p['_z'] = sum(zs) / len(zs)
                made.append(p)
            print('  %s: %d / %d' % (lid, len(made), count), flush=True)
        # a gentle climb within the level: the most familiar fills first
        made.sort(key=lambda p: -p.pop('_z'))
        bank = old + made
        write_bank('np-' + lid, bank, 'The Daily Ledger Crossword, %s (%dx%d). Clues adapted from Open English WordNet (CC BY 4.0)' % (name, n, n))
        print(lid, len(old), '->', len(bank), 'in', round(time.time() - t0), 's (%d old clues refreshed)' % fixed, flush=True)


if __name__ == '__main__':
    # the checked build: answers and clues from good_clues.py only
    import subprocess
    sys.exit(subprocess.call([sys.executable, os.path.join(HERE, 'make_crosswords.py'), 'np'] + sys.argv[1:]))
