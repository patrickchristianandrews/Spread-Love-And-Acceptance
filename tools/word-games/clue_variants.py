"""Several clues for each safe word, so the same answer can be clued differently from puzzle to puzzle.

For every word in the safe lexicon (lexicon.py) this collects, from its first few meanings in
Open English WordNet 2023 (CC BY 4.0):
  h  the hand-written clue from clues.py (always first when there is one)
  d  a plain definition
  s  a short, newspaper-style synonym
  k  "Kind of ..." (the wider family it belongs to)
  x  a fill-in-the-blank from WordNet's own example sentence
Every candidate goes through the same filters as lexicon.py: no kept-out words (CLUE_AVOID), no
strongly negative words (VADER), no names, and never the answer (or its stem) inside its own clue.
Synonyms and families must themselves be safe lexicon words.

Cached in tools/word-games/build/clue-variants.json. Run:  python3 tools/word-games/clue_variants.py
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from lexicon import CLUE_AVOID  # noqa: E402

CACHE = os.path.join(HERE, 'build', 'clue-variants.json')
STOP = {'a', 'an', 'the', 'of', 'to', 'and', 'or', 'in', 'on', 'for', 'with', 'by', 'at', 'as', 'from', 'that', 'is', 'be', 'its', 'it',
        'into', 'out', 'up', 'one', 'who', 'which', 'something', 'someone', 'are', 'has', 'have', 'not', 'no', 'more', 'than', 'very',
        'used', 'any', 'this', 'your', 'you', 'their', 'there', 'e.g.', 'etc', 'usually', 'especially', 'often', 'such'}

_VAL = None


def valence(t):
    global _VAL
    if _VAL is None:
        try:
            from vaderSentiment.vaderSentiment import SentimentIntensityAnalyzer
            _VAL = SentimentIntensityAnalyzer().lexicon
        except ImportError:
            _VAL = {}
    for form in (t, t[:-1] if t.endswith('s') else t, t[:-2] if t.endswith(('ed', 'ly')) else t, t[:-3] if t.endswith('ing') else t):
        if form in _VAL:
            return _VAL[form]
    return 0


def tidy(text, word, maxlen=90):
    """The same clean-up lexicon.py gives a definition, or None if it can't be used."""
    text = text.split(';')[0].strip()
    text = re.sub(r'\s*\(.*?\)', '', text).strip()
    text = re.sub(r'\s+', ' ', text)
    if len(text) > maxlen:
        cut = text[:maxlen].rsplit(',', 1)[0] if ',' in text[:maxlen] else ''
        text = cut if len(cut) > 30 else text[:maxlen - 2].rsplit(' ', 1)[0]
        text = re.sub(r'\s+(and|or|of|a|an|the|to|with|in|for|by|that|as|from|on|at)$', '', text)
    if not ok_text(text, word):
        return None
    return text[:1].upper() + text[1:]


def ok_text(text, word):
    if not text or len(text) < 3:
        return False
    low = text.lower()
    toks = set(re.findall(r'[a-z]+', low))
    stem = word[:max(4, len(word) - 2)]
    if word in toks or stem in low:
        return False
    if toks & CLUE_AVOID or any(valence(t) <= -2.0 for t in toks):
        return False
    if re.search(r'(^|\s)[A-Z][a-z]+', text[1:]):  # names read oddly in a calm game
        return False
    if '"' in text or '`' in text or "''" in text:
        return False
    return True


def safe_phrase(p, lex):
    toks = p.split()
    return all(t in lex or t in STOP for t in toks) and any(t in lex for t in toks)


def build(force=False):
    if os.path.exists(CACHE) and not force:
        return json.load(open(CACHE))
    import wn
    from vocab import lex as get_lex
    from clues import THEMES
    lex = get_lex()
    en = wn.Wordnet('oewn:2023')
    hand = {}
    for d in THEMES.values():
        for w, c in d.items():
            hand.setdefault(w, [])
            if c not in hand[w]:
                hand[w].append(c)
    out = {}
    for word in lex:
        cands = [[c, 'h', ''] for c in hand.get(word, [])]
        # only meanings of this very word (WordNet also answers "was" with the meanings of "be")
        senses = [se for w_ in en.words(word) if w_.lemma() == word for se in w_.senses()][:4]
        for se in senses:
            s = se.synset()
            pos = 'n' if s.pos == 'n' else s.pos
            d = tidy(s.definition() or '', word)
            if d:
                cands.append([d, 'd', pos])
            for l in s.lemmas():
                if l == word or not re.fullmatch(r'[a-z][a-z ]{2,18}', l) or word[:4] in l or l[:4] in word:
                    continue
                if safe_phrase(l, lex) and ok_text(l, word):
                    cands.append([l[:1].upper() + l[1:], 's', pos])
            if s.pos == 'n':
                for h in s.hypernyms()[:1]:
                    for l in h.lemmas()[:2]:
                        if re.fullmatch(r'[a-z][a-z ]{2,18}', l) and word[:4] not in l and safe_phrase(l, lex) and ok_text(l, word):
                            cands.append(['Kind of ' + l, 'k', pos])
            for ex in (s.examples() or [])[:2]:
                ex = ex.strip().strip('"').strip()
                toks = re.findall(r"[A-Za-z']+", ex)
                if sum(1 for t in toks if t.lower() == word) != 1 or len(ex) > 70 or len(toks) < 4:
                    continue
                blank = re.sub(r'\b' + re.escape(word) + r'\b', '___', ex, count=1, flags=re.I)
                rest = [t.lower() for t in toks if t.lower() != word]
                if all(t in lex or t in STOP or len(t) <= 3 for t in rest) and ok_text(blank.replace('___', 'x'), word):
                    blank = blank[:1].upper() + blank[1:]
                    cands.append([blank, 'x', pos])
        seen, uniq = set(), []
        for c, k, pos in cands:
            key = c.lower().rstrip('.')
            if key not in seen:
                seen.add(key)
                uniq.append([c.rstrip('.') if k != 'x' else c, k, pos])
        out[word] = uniq[:8]   # may be empty: then new puzzles leave the word out
    os.makedirs(os.path.dirname(CACHE), exist_ok=True)
    json.dump(out, open(CACHE, 'w'))
    return out


def variants(word, V, lexicon):
    """Every clue we may use for word (plurals get their singular's clues, made plural)."""
    from vocab import plural, plural_phrase
    if word in V:
        return V[word]
    for base in {word[:-1], word[:-2], word[:-3] + 'y'}:
        if base in V and plural(base) == word:
            out = []
            for c, k, pos in V[base]:
                if k == 'x' or pos not in ('n', ''):
                    continue  # only a thing has a plural
                if k == 's' and re.fullmatch(r'[A-Z][a-z]+', c):
                    out.append([plural(c.lower()).capitalize(), 's'])
                elif k in ('k', 'd', 'h'):
                    out.append([plural_phrase(c), k])
            return out
    return []


if __name__ == '__main__':
    V = build(force=True)
    n = sum(len(v) for v in V.values())
    print(len(V), 'words,', n, 'clues,', round(n / len(V), 2), 'per word')
    kinds = {}
    print(sum(1 for v in V.values() if not v), 'words with no clue of their own')
    for v in V.values():
        for _, k, _p in v:
            kinds[k] = kinds.get(k, 0) + 1
    print(kinds)
