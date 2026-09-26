"""Word lists by difficulty for the generators, built on lexicon.py (safe words with clues).

Each entry: word -> (easy clue, hard clue, familiarity). Plurals of everyday nouns are added
(with their clues turned plural), because crosswords and letter games need them.
"""
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from lexicon import build  # noqa: E402

_LEX = None


def lex():
    global _LEX
    if _LEX is None:
        _LEX = build()
    return _LEX


def plural(w):
    if re.search(r'(s|x|z|ch|sh)$', w):
        return w + 'es'
    if re.search(r'[^aeiou]y$', w):
        return w[:-1] + 'ies'
    return w + 's'


def plural_phrase(clue):
    """'Kind of lamp' -> 'Kinds of lamp'; 'Seaport' -> 'Seaports'; a definition -> '... (plural)'."""
    if clue.startswith('Kind of '):
        return 'Kinds of ' + clue[8:]
    if re.fullmatch(r'[A-Z][a-z]+', clue):
        return plural(clue.lower()).capitalize()
    return clue + ' (plural)'


def words(min_z=3.0, plurals=True, lengths=range(3, 16)):
    """{word: (easy, hard, zipf, gentle)} for words at least this familiar."""
    try:
        from wordfreq import zipf_frequency
    except ImportError:
        zipf_frequency = None
    out = {}
    for w, i in lex().items():
        if (i['z'] >= min_z or i['g']) and len(w) in lengths:
            out[w] = (i['e'], i['h'], i['z'], i['g'])
    if plurals and zipf_frequency:
        for w, i in list(lex().items()):
            if i.get('p') != 'n' or not (i['z'] >= min_z or i['g']):
                continue
            pw = plural(w)
            if pw in out or len(pw) not in lengths:
                continue
            z = zipf_frequency(pw, 'en')
            if z >= max(2.6, min_z - 0.6):
                out[pw] = (plural_phrase(i['e']), plural_phrase(i['h']), z, i['g'])
    return out
