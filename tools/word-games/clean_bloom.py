"""Tidies the Word Bloom banks (assets/js/puzzles/bloom-<level>-<k>.js) so every word a player must
find is an everyday, family-friendly American word.

A word in a wheel's little crossword stays only if it is in bloom-dict.js (make_bloom_dict.py), is
familiar enough (wordfreq, or on gentle-words.txt), and passes clue_check.answer_problem (no British
spellings, abbreviations or odd forms like TOR, COL or TOBY). A word that fails is taken out of the
crossword when the rest still hang together and enough words remain; otherwise the wheel is left
out of the bank. Bonus lists keep only dictionary words. Run after make_bloom_dict.py:
    python3 tools/word-games/clean_bloom.py
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from bank import OUT, write_bank  # noqa: E402
from banks_io import load_bank  # noqa: E402
from clue_check import answer_problem, set_american_words  # noqa: E402

LEVELS = [('gentle', 'Gentle', 3, 3.2), ('easy', 'Easy', 4, 3.1), ('medium', 'Medium', 5, 3.0), ('hard', 'Hard', 6, 2.9), ('expert', 'Expert', 7, 2.8)]


def dictionary():
    txt = open(os.path.join(OUT, 'bloom-dict.js'), encoding='utf-8').read()
    d = json.loads(re.search(r'=\s*(\{.*\});', txt, re.S).group(1))
    return {w.upper() for v in d.values() for w in v.split()}


def gentle():
    out = set()
    for line in open(os.path.join(HERE, 'gentle-words.txt')):
        if not line.startswith('#'):
            out.update(w.upper() for w in line.split() if w.isalpha())
    return out


def cells(w):
    word, r, c, d = w[:4]
    return {(r + (i if d == 'd' else 0), c + (i if d == 'a' else 0)) for i in range(len(word))}


def connected(ws):
    if not ws:
        return False
    seen, todo = {0}, [0]
    cs = [cells(w) for w in ws]
    while todo:
        i = todo.pop()
        for j in range(len(ws)):
            if j not in seen and cs[i] & cs[j]:
                seen.add(j)
                todo.append(j)
    return len(seen) == len(ws)


def main():
    from english_words import get_english_words_set
    from wordfreq import zipf_frequency
    set_american_words(get_english_words_set(['web2'], lower=True, alpha=True))
    D, G = dictionary(), gentle()

    def fine(w, floor):
        if answer_problem(w.lower()):
            return False
        if w in G:
            return True
        if w not in D:
            return False
        if zipf_frequency(w.lower(), 'en') >= floor:
            return True
        # a plural or -ed / -ing form of a familiar word (RIMS, BUNS, HOPPED)
        low = w.lower()
        for base in (low[:-1], low[:-2], low[:-3] + 'y', low[:-2] if low.endswith('ed') else '', low[:-3] if low.endswith('ing') else ''):
            if len(base) >= 3 and base.upper() in D and zipf_frequency(base, 'en') >= floor + 0.3:
                return True
        return False

    for lid, name, lo, floor in LEVELS:
        items, note = load_bank('bloom-' + lid)
        kept, trimmed, dropped = [], 0, 0
        for p in items:
            bad = [w for w in p['w'] if not fine(w[0], floor)]
            ws = [w for w in p['w'] if fine(w[0], floor)]
            if bad:
                if len(ws) < lo or not connected(ws):
                    dropped += 1
                    continue
                trimmed += 1
                minr = min(r for _, r, _, _ in ws)
                minc = min(c for _, _, c, _ in ws)
                ws = [[w, r - minr, c - minc, d] for (w, r, c, d) in ws]
                p['W'] = max(c + (len(w) if d == 'a' else 1) for (w, r, c, d) in ws)
                p['H'] = max(r + (len(w) if d == 'd' else 1) for (w, r, c, d) in ws)
                p['w'] = ws
            p['b'] = [b for b in p.get('b', []) if b in D and not answer_problem(b.lower())]
            kept.append(p)
        write_bank('bloom-' + lid, kept, note or ('Word Bloom, ' + name))
        print(lid, len(items), '->', len(kept), '(%d trimmed, %d left out)' % (trimmed, dropped))

    # the word list Word Bloom grows new wheels from, once a player has seen a whole bank
    path = os.path.join(OUT, 'bloom-lex.js')
    txt = open(path, encoding='utf-8').read()
    m = re.search(r'window\.TOL_BLOOM_LEX\s*=\s*(\{.*\});', txt, re.S)
    lexi = json.loads(m.group(1))
    for L, v in lexi.items():
        ws = v['w'].split()
        keep = [fine(w.upper(), 2.8) for w in ws]
        v['t'] = [sum(keep[:t]) for t in v['t']]
        v['w'] = ' '.join(w for w, k in zip(ws, keep) if k)
    with open(path, 'w', encoding='utf-8') as f:
        f.write(txt[:m.start(1)] + json.dumps(lexi, separators=(',', ':')) + txt[m.end(1):])
    print('bloom-lex', sum(len(v['w'].split()) for v in lexi.values()), 'words')


if __name__ == '__main__':
    main()
