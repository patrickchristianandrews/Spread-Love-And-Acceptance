"""The clues a crossword may use for each answer, every one checked by clue_check.py.

For each safe word (lexicon.py) this gathers, best first:
  h  hand-written clues (clue_bank.py, then clues.py), always preferred
  d  a plain definition, from the word's main meaning only
  s  a one-word synonym, only when each word is the other's main meaning (so no "Tugboat" for TOWER)
  x  a fill-in-the-blank from the main meaning's example sentence
Only a word's everyday meanings count: those Princeton WordNet 3.0's sense counts show are common
(BAY the shoreline, not BAY the horse color; TOWER the building, not the tugboat). A word too rare
to have counts is clued from the dictionary only when it has a single meaning. A word that is mostly
an inflected form of another (WAS, WON, WAITS)
gets no dictionary clue at all and is used only when it has a hand-written clue.
Plurals of everyday nouns get their singular's one-word synonyms, made plural ("Autos").
Every candidate then goes through clue_check.clue_problem, and answers through answer_problem.

Cached in tools/word-games/build/good-clues.json. Run:  python3 tools/word-games/good_clues.py
Needs, beyond lexicon.py's:  pip install nltk  and  python -c "import nltk; nltk.download('wordnet')"
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from clue_check import clue_problem, answer_problem, americanize, set_american_words, HAND_ONLY  # noqa: E402

CACHE = os.path.join(HERE, 'build', 'good-clues.json')
POS_ORDER = {'n': 0, 'v': 1, 'a': 2, 's': 2, 'r': 3}


def hand_clues():
    from clue_bank import HAND
    from clues import THEMES
    out = {}
    for w, cs in HAND.items():
        for c in ([cs] if isinstance(cs, str) else cs):
            out.setdefault(w.lower(), [])
            if c not in out[w.lower()]:
                out[w.lower()].append(c)
    for d in THEMES.values():
        for w, c in d.items():
            c = americanize(c)
            out.setdefault(w, [])
            if c not in out[w]:
                out[w].append(c)
    return out


def _plural(w):
    from vocab import plural
    return plural(w)


def build(force=False):
    if os.path.exists(CACHE) and not force:
        return json.load(open(CACHE))
    import wn
    from english_words import get_english_words_set
    from wordfreq import zipf_frequency
    from vocab import lex as get_lex, words as get_words
    from clue_variants import tidy, ok_text, safe_phrase
    en = wn.Wordnet('oewn:2023')
    from nltk.corpus import wordnet as pwn
    L = get_lex()
    us = {w for w in get_english_words_set(['web2'], lower=True, alpha=True)}
    set_american_words(us | set(L))
    known = L
    hand = hand_clues()

    def entries(w):
        own = [e for e in en.words(w) if e.lemma() == w]
        other = [e for e in en.words(w) if e.lemma() != w]
        return own, other

    def primary(w):
        own, other = entries(w)
        if not own:
            return None, True
        n_own = sum(len(e.senses()) for e in own)
        n_other = sum(len(e.senses()) for e in other)
        inflected = n_other > n_own
        best = max(own, key=lambda e: (len(e.senses()), -POS_ORDER.get(e.pos, 4)))
        return best, inflected

    def norm(t):
        return re.sub(r'[^a-z ]', '', re.sub(r'\(.*?\)', '', (t or '').lower())).strip()[:32]

    def common_defs(w):
        """The definitions of w's everyday meanings, from Princeton WordNet's sense counts (how
        often each meaning turned up in tagged text): a meaning counts if it's at least a
        third as common as the word's most common one. A word too rare to have counts counts
        only when it has just one meaning."""
        ss = pwn.synsets(w)
        counts = [(s, sum(l.count() for l in s.lemmas() if l.name().lower() == w)) for s in ss]
        top = max([c for _, c in counts] or [0])
        if top >= 3:
            return {norm(s.definition()) for s, c in counts if c >= max(2, top / 3)}
        return {norm(ss[0].definition())} if len(ss) == 1 else set()

    def main_synsets(w):
        e, infl = primary(w)
        if not e or infl:
            return []
        ok = common_defs(w)
        own, _ = entries(w)
        return [se.synset() for x in own for se in x.senses() if norm(se.synset().definition()) in ok][:3]

    main_cache = {}

    def main_ids(w):
        if w not in main_cache:
            main_cache[w] = {s.id for s in main_synsets(w)}
        return main_cache[w]

    def candidates(w):
        out = []
        for c in hand.get(w, []):
            out.append([americanize(c), 'h'])
        if w in HAND_ONLY:
            return out
        ss = main_synsets(w)
        for s in ss:
            d = tidy(s.definition() or '', w)
            if d:
                out.append([americanize(d), 'd'])
            for l in s.lemmas():
                if l == w or not re.fullmatch(r'[a-z]{3,14}', l) or w[:4] in l or l[:4] in w:
                    continue
                if zipf_frequency(l, 'en') < 3.0 or not safe_phrase(l, L) or not ok_text(l, w):
                    continue
                if s.id in main_ids(l):
                    out.append([l[:1].upper() + l[1:], 's'])
            for ex in (s.examples() or [])[:2]:
                ex = ex.strip().strip('"').strip()
                toks = re.findall(r"[A-Za-z']+", ex)
                if sum(1 for t in toks if t.lower() == w) != 1 or len(ex) > 70 or len(toks) < 4:
                    continue
                blank = re.sub(r'\b' + re.escape(w) + r'\b', '___', ex, count=1, flags=re.I)
                rest = [t.lower() for t in toks if t.lower() != w]
                from clue_variants import STOP
                if all(t in L or t in STOP or len(t) <= 3 for t in rest) and ok_text(blank.replace('___', 'x'), w):
                    out.append([americanize(blank[:1].upper() + blank[1:]), 'x'])
        # a plural of an everyday noun: its singular's one-word synonyms, made plural
        if not ss:
            for base in {w[:-1], w[:-2], w[:-3] + 'y'}:
                if base in L and _plural(base) == w:
                    e, infl = primary(base)
                    if not e or infl or e.pos != 'n':
                        continue
                    for s in main_synsets(base):
                        for l in s.lemmas():
                            if l == base or not re.fullmatch(r'[a-z]{3,12}', l) or base[:4] in l or l[:4] in base:
                                continue
                            if zipf_frequency(l, 'en') >= 3.2 and s.id in main_ids(l) and ok_text(l, w) and safe_phrase(l, L):
                                pl = _plural(l)
                                out.append([pl[:1].upper() + pl[1:], 's'])
        return out

    allw = get_words(min_z=2.4, plurals=True, lengths=range(3, 16))
    result = {}
    stats = {'words': 0, 'kept': 0, 'no clue': 0, 'answer': 0}
    reasons = {}
    for w in sorted(set(allw) | set(hand)):
        stats['words'] += 1
        if not re.fullmatch(r'[a-z]{3,15}', w):
            continue
        if answer_problem(w):
            stats['answer'] += 1
            continue
        good, seen = [], set()
        for c, k in candidates(w):
            c = c.strip().rstrip('.') if k != 'x' else c.strip()
            key = c.lower().rstrip('.')
            if key in seen:
                continue
            seen.add(key)
            p = clue_problem(w, c, known, hand=(k == 'h'))
            if p:
                reasons[p.split(':')[0]] = reasons.get(p.split(':')[0], 0) + 1
                continue
            good.append([c, k])
        if good:
            result[w] = good[:8]
            stats['kept'] += 1
        else:
            stats['no clue'] += 1
    os.makedirs(os.path.dirname(CACHE), exist_ok=True)
    json.dump(result, open(CACHE, 'w'))
    print(stats, reasons)
    return result


if __name__ == '__main__':
    G = build(force=True)
    kinds = {}
    for v in G.values():
        for _, k in v:
            kinds[k] = kinds.get(k, 0) + 1
    print(len(G), 'words with good clues', kinds)
