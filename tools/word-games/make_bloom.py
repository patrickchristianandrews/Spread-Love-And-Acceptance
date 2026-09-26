"""Makes assets/js/word-bloom-levels.js, the levels for Word Bloom.

Every word comes from gentle-words.txt, so only kind, everyday words appear.
Each level: the letters of one word, the words to find laid out like a small
crossword, and extra words that also count (as bonus words).
Run from the repo root:  python3 tools/word-games/make_bloom.py
Optional: pip install wordfreq  (used to put the most familiar words in the grid first)
"""
import json
import os
import random
from collections import Counter

from layout import place

HERE = os.path.dirname(os.path.abspath(__file__))
try:
    from wordfreq import zipf_frequency
except ImportError:  # fall back to shorter-is-more-familiar
    def zipf_frequency(w, lang):
        return 7 - len(w)

VOCAB = sorted({w.lower() for line in open(os.path.join(HERE, 'gentle-words.txt'))
                if not line.startswith('#') for w in line.split() if w.isalpha() and len(w) >= 3})
FREQ = {w: zipf_frequency(w, 'en') for w in VOCAB}


def formable(base):
    have = Counter(base)
    return [w for w in VOCAB if len(w) <= len(base) and not (Counter(w) - have)]


# (how many levels, base word length(s), fewest and most words in the grid)
BANDS = [(8, (4,), 3, 4), (22, (5,), 4, 6), (50, (5, 6), 5, 8), (80, (6,), 6, 9), (80, (6, 7), 7, 10)]


def main():
    rng = random.Random(20260926)
    used, levels = set(), []
    for count, lens, lo, hi in BANDS:
        pool = []
        for base in VOCAB:
            if len(base) not in lens or base in used or FREQ[base] < 2.8:
                continue
            words = formable(base)
            if len(words) < lo:
                continue
            pool.append((base, words))
        rng.shuffle(pool)
        made = []
        for base, words in pool:
            if len(made) >= count:
                break
            # the grid: the whole word plus the most familiar others
            others = sorted([w for w in words if w != base], key=lambda w: (-FREQ[w], w))
            want = min(hi, len(words))
            pick = [base] + others[:want - 1]
            placed, W, H = place(pick, 8, 8, rng)
            got = [p[0] for p in placed]
            if len(got) < lo or base not in got:
                continue
            bonus = sorted(w for w in words if w not in got)
            letters = list(base.upper())
            rng.shuffle(letters)
            if ''.join(letters) == base.upper():
                letters = letters[1:] + letters[:1]
            made.append({'l': ''.join(letters), 'W': W, 'H': H,
                         'w': [[w.upper(), r, c, d] for (w, r, c, d) in placed],
                         'b': [w.upper() for w in bonus]})
            used.add(base)
        made.sort(key=lambda lv: (len(lv['w']), sum(len(x[0]) for x in lv['w'])))
        levels.extend(made)
    out = os.path.join(HERE, '..', '..', 'assets', 'js', 'word-bloom-levels.js')
    with open(out, 'w') as f:
        f.write('/* word-bloom-levels.js: made by tools/word-games/make_bloom.py from gentle-words.txt. Do not edit by hand. */\n')
        f.write('window.TOL_BLOOM_LEVELS = ' + json.dumps(levels, separators=(',', ':')) + ';\n')
    print(len(levels), 'levels', os.path.getsize(out), 'bytes')


if __name__ == '__main__':
    main()
