"""Makes assets/js/crossword-puzzles.js, the puzzles for Quiet Crossword.

Each puzzle is a small themed crossword (8 x 8 at most, so it fits a phone)
built from the gentle clues in clues.py.
Run from the repo root:  python3 tools/word-games/make_crossword.py
"""
import json
import os
import random

from clues import THEMES, all_clues
from layout import place

HERE = os.path.dirname(os.path.abspath(__file__))
PER_THEME = 12


def main():
    rng = random.Random(7)
    clues = all_clues()
    puzzles, seen = [], set()
    for theme, words in THEMES.items():
        pool = [w for w in words if 3 <= len(w) <= 8]
        made = 0
        for attempt in range(400):
            if made >= PER_THEME:
                break
            rng.shuffle(pool)
            pick = pool[:11]
            placed, W, H = place(pick, 8, 8, rng, tries=30)
            if len(placed) < 6:
                continue
            placed = placed[:9]
            key = tuple(sorted(p[0] for p in placed))
            if key in seen:
                continue
            # re-normalise after trimming
            minr = min(r for _, r, _, _ in placed)
            minc = min(c for _, _, c, _ in placed)
            placed = [(w, r - minr, c - minc, d) for (w, r, c, d) in placed]
            W = max(c + (len(w) if d == 'a' else 1) for (w, r, c, d) in placed)
            H = max(r + (len(w) if d == 'd' else 1) for (w, r, c, d) in placed)
            seen.add(key)
            puzzles.append({'t': theme, 'W': W, 'H': H,
                            'w': [[w.upper(), r, c, d, words.get(w) or clues[w]] for (w, r, c, d) in placed]})
            made += 1
    # mix the themes so each day brings something different
    order = []
    by = {}
    for p in puzzles:
        by.setdefault(p['t'], []).append(p)
    while any(by.values()):
        for t in list(by):
            if by[t]:
                order.append(by[t].pop(0))
    out = os.path.join(HERE, '..', '..', 'assets', 'js', 'crossword-puzzles.js')
    with open(out, 'w') as f:
        f.write('/* crossword-puzzles.js: made by tools/word-games/make_crossword.py from clues.py. Do not edit by hand. */\n')
        f.write('window.TOL_CROSSWORDS = ' + json.dumps(order, separators=(',', ':'), ensure_ascii=False) + ';\n')
    print(len(order), 'puzzles', os.path.getsize(out), 'bytes')


if __name__ == '__main__':
    main()
