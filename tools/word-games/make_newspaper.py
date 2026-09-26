"""Makes the newspaper-style crosswords: assets/js/puzzles/np-<level>.js

Dense grids with rotationally symmetric black squares, every white square part of an
across and a down word of 3+ letters, numbered the usual way. Five levels, from a 5x5
mini with the friendliest words and clues to a 13x13 with trickier words and short,
newspaper-style clues.
Run from the repo root:  python3 tools/word-games/make_newspaper.py [count per level]
"""
import json
import os
import random
import sys
import time
from multiprocessing import Pool

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from vocab import words  # noqa: E402

OUT = os.path.join(HERE, '..', '..', 'assets', 'js', 'puzzles')
# id, name, size, black squares (min, max), familiarity floor, share of short "hard" clues
LEVELS = [
    ('mini', 'Mini', 5, (4, 8), 3.0, 0.0),
    ('small', 'Easy', 7, (6, 10), 3.6, 0.1),
    ('daily', 'Daily', 9, (12, 18), 3.3, 0.35),
    ('weekend', 'Weekend', 11, (18, 26), 3.0, 0.6),
    ('sunday', 'Big Sunday', 13, (24, 34), 2.8, 0.75),
]


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
    def __init__(self, vocab, rng):
        self.rng = rng
        self.lists, self.index, self.all = {}, {}, {}
        for L in range(3, 16):
            ws = [w for w in vocab if len(w) == L]
            ws.sort(key=lambda w: -(vocab[w][2] + (1.2 if vocab[w][3] else 0) + rng.random() * 1.4))
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
            self.rng.shuffle(picks[:4])
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
    lid, name, n, (lo, hi), minz, hard_share = level
    rng = random.Random(seed)
    vocab = VOCAB[lid]
    f = Filler(vocab, rng)
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
            words_out = []
            for (d, r, c, L), w in assigned.items():
                easy, hard, z, g = vocab[w]
                clue = hard if (rng.random() < hard_share and hard) else easy
                words_out.append([w.upper(), r, c, d, clue])
            return {'n': n, 'g': [''.join(ch if ch == '#' else '.' for ch in row) for row in grid], 'w': words_out}
    return None


VOCAB = {}


def main():
    per = int(sys.argv[1]) if len(sys.argv) > 1 else 120
    os.makedirs(OUT, exist_ok=True)
    for level in LEVELS:
        lid, name, n = level[0], level[1], level[2]
        VOCAB[lid] = words(min_z=level[4], plurals=True, lengths=range(3, n + 1))
    for level in LEVELS:
        lid, name, n = level[0], level[1], level[2]
        per_try = {5: 3, 7: 3, 9: 4, 11: 6, 13: 8}[n]
        seeds = [(level, 1000 * n + i, per_try) for i in range(int(per * (10 if n <= 5 else 1.6)))]
        t0 = time.time()
        with Pool() as pool:
            made = [p for p in pool.imap_unordered(one, seeds) if p]
        seen, uniq = set(), []
        for p in made:
            key = tuple(sorted(w[0] for w in p['w']))
            if key not in seen:
                seen.add(key)
                uniq.append(p)
        uniq = uniq[:per]
        with open(os.path.join(OUT, 'np-' + lid + '.js'), 'w') as fh:
            fh.write('/* np-%s.js: newspaper-style crosswords (%s, %dx%d), made by tools/word-games/make_newspaper.py.\n'
                     '   Clues adapted from Open English WordNet (CC BY 4.0). Do not edit by hand. */\n' % (lid, name, n, n))
            fh.write('(window.TOL_PUZZLES = window.TOL_PUZZLES || {})["np-%s"] = ' % lid + json.dumps(uniq, separators=(',', ':'), ensure_ascii=False) + ';\n')
        print(lid, len(uniq), 'puzzles in', round(time.time() - t0), 's', flush=True)


if __name__ == '__main__':
    main()
