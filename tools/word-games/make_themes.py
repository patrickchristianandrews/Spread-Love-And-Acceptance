"""Makes the Quiet Words theme bank: assets/js/puzzles/qw-themes-<k>.js (chunks, see bank.py) and
assets/js/puzzles/qw-names.js (just the theme names, for the "Choose a theme" list).

The 72 themes from before (legacy/qw-themes.json.gz, with their hand-written kind lines) stay first,
in the same order. Then every theme in themes_bank.py that still has at least MIN_WORDS safe words once
each word is checked against the safe lexicon. Each word's line is its hand-written clue (clues.py) or
a plain definition (Open English WordNet, CC BY 4.0). A theme that shares more than half its words with
an earlier one is left out, and the themes are dealt out category by category so neighbours differ.
Run from the repo root:  python3 tools/word-games/make_themes.py
"""
import json
import os
import random
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
from bank import legacy, write_bank, OUT  # noqa: E402

MIN_WORDS, MAX_WORDS = 12, 18
MAX_OVERLAP = 0.5
# A word search shows each word inside its theme, so an everyday word whose only trouble is a rare
# second meaning ("snow", "dog", "moon") can join a theme even though the crossword lexicon leaves it
# out. It must still pass every check below, and it gets the line of its main (first) meaning.
NEVER = {'tit', 'bang', 'screw', 'hoe', 'booty', 'blow', 'fat', 'brat', 'nappy', 'ass', 'pussy', 'beaver', 'balls', 'nuts', 'jugs',
         'knockers', 'cock', 'shag', 'bust', 'strip', 'hooker', 'joint', 'pot', 'weed', 'crack', 'smack', 'trip', 'high',
         'stoned', 'dope', 'fag', 'queer', 'fairy', 'queen', 'pansy', 'dyke', 'coon', 'chink', 'gook', 'wop', 'nip', 'kike',
         'mick', 'paddy', 'jap', 'yank', 'gyp', 'pikey', 'retard', 'spastic', 'lame', 'dumb', 'idiot', 'moron', 'tart', 'buns',
         'melons', 'kill', 'gun', 'sword', 'shield', 'bomb', 'shot', 'shoot', 'blood', 'dead', 'grave', 'coffin', 'cross', 'hunt',
         'booze', 'wine', 'beer', 'pub', 'bar', 'cider', 'spade', 'slope', 'bitter', 'crash', 'storm', 'lightning', 'claw', 'mummy',
         'pirate', 'test', 'miss', 'blind', 'low', 'that', 'tease', 'bait', 'hook', 'catch', 'hotpot', 'ward', 'guard', 'drill', 'boom'}


_SAFE = {}
RUDE = {'obscenity', 'vulgarism', 'smut', 'dirty word', 'ethnic slur', 'vulgar'}


def gentle_line(text, maxlen=100):
    """A definition tidied into a short line. Unlike a clue it may name the word itself or a place,
    but it must pass the same checks for kept-out and strongly negative words."""
    from clue_variants import valence
    from lexicon import CLUE_AVOID
    t = re.sub(r'\s*\(.*?\)', '', text.split(';')[0]).strip()
    t = re.sub(r'\s+', ' ', t)
    if len(t) > maxlen:
        cut = t[:maxlen].rsplit(',', 1)[0] if ',' in t[:maxlen] else ''
        t = cut if len(cut) > 30 else t[:maxlen].rsplit(' ', 1)[0]
    while True:
        t2 = re.sub(r'[\s,]+(and|or|of|a|an|the|to|with|in|for|by|that|as|from|on|at|having|especially|often|usually)$', '', t)
        if t2 == t:
            break
        t = t2
    toks = set(re.findall(r'[a-z]+', t.lower()))
    if len(t) < 4 or toks & CLUE_AVOID or any(valence(x) <= -2.0 for x in toks) or '"' in t:
        return None
    return t[:1].upper() + t[1:]


def theme_safe(w, L, gentle):
    """(ok, line) for a word outside the safe lexicon, judged by its main meaning."""
    if w in _SAFE:
        return _SAFE[w]
    import wn
    from lexicon import KEEP_OUT
    from clue_variants import tidy, valence
    if 'en' not in _SAFE:
        en = wn.Wordnet('oewn:2023')
        blocked, stack = set(), []
        for lemma, pos, i in KEEP_OUT:
            ss = en.synsets(lemma, pos=pos)
            if len(ss) > i:
                stack.append(ss[i])
        while stack:
            s = stack.pop()
            if s.id in blocked:
                continue
            blocked.add(s.id)
            stack.extend(s.hyponyms())
            stack.extend(s.relations().get('instance_hyponym', []))
        _SAFE['en'], _SAFE['blocked'] = en, blocked
    en, blocked = _SAFE['en'], _SAFE['blocked']
    lemma = w.replace('_', ' ')
    senses = [se for x in en.words(lemma) if x.lemma() == lemma for se in x.senses()]
    if not senses:
        for base in (lemma[:-1], lemma[:-2]):   # a plural: judge it by its singular
            if lemma.endswith('s') and base:
                senses = [se for x in en.words(base) if x.lemma() == base for se in x.senses() if se.synset().pos == 'n']
                if senses:
                    break
    res = (False, None)
    if w not in NEVER and senses and valence(w) > -1.0:
        # a vulgar meaning among the first few rules a word out ("water" keeps its place: that one is far down)
        rude = any(set(d.lemmas()) & RUDE for se in senses[:3] for d in se.synset().relations().get('exemplifies', []))
        # the main meaning: the first that isn't the name of one particular thing (the Sun, the Moon)
        common = [se.synset() for se in senses if not se.synset().relations().get('instance_hypernym')]
        first = common[0] if common else None
        if not rude and first is not None and first.id not in blocked and first.lexfile() != 'noun.body':
            line = None
            # the line: an everyday meaning, before one about a particular party, team or place
            usable = [s for s in common[:5] if s.id not in blocked and s.lexfile() != 'noun.body']
            usable.sort(key=lambda s: (s.pos != 'n', bool(re.search(r'(^|\s)[A-Z][a-z]+', (s.definition() or '')[1:]))))
            for s in usable:
                line = gentle_line(s.definition() or '')
                if line:
                    break
            if line:
                res = (True, line)
    _SAFE[w] = res
    return res


def hand_lines():
    """theme-lines.txt: the short line written by hand for each word."""
    out = {}
    for raw in open(os.path.join(HERE, 'theme-lines.txt'), encoding='utf-8'):
        if raw.startswith('#') or ':' not in raw:
            continue
        w, t = raw.split(':', 1)
        out[w.strip().lower()] = t.strip()
    return out


def line_for(w, L, V, hand, lines=None):
    if lines and w in lines:
        t = lines[w]
    elif w in hand:
        t = hand[w]
    elif w in L and L[w].get('e'):
        t = L[w]['e']
    else:
        opts = [c for c in V.get(w, []) if c[1] == 'd']
        if not opts:
            return None
        t = opts[0][0]
    t = t.strip()
    return t[:1].upper() + t[1:] + ('' if t.endswith(('.', '!', '?')) else '.')


def categories(text):
    cat, out = 'misc', {}
    for raw in text.splitlines():
        s = raw.strip()
        if s.startswith('# ----'):
            cat = s[6:].strip()
        elif ':' in s and not s.startswith('#'):
            out[s.split(':', 1)[0].strip()] = cat
    return out


def build(write=True, report=True):
    from vocab import lex
    from clue_variants import build as build_variants
    from clues import all_clues
    from themes_bank import TEXT, parse
    from clue_check import americanize, answer_problem, set_american_words
    from english_words import get_english_words_set
    set_american_words(get_english_words_set(['web2'], lower=True, alpha=True))
    L, V, hand = lex(), build_variants(), all_clues()
    lines = hand_lines()
    old = legacy('qw-themes')
    # American English throughout: the older themes' names and lines too, and no British-only words
    for t in old:
        t['name'] = americanize(t['name'])
        t['words'] = [[w, americanize(line)] for w, line in t['words'] if answer_problem(w.lower()) != 'british']
    # the older themes with fewer than 12 words get a few more (legacy-extra.txt), kept at the end
    extra = {}
    for raw in open(os.path.join(HERE, 'legacy-extra.txt'), encoding='utf-8'):
        if raw.startswith('#') or raw.count('|') != 2:
            continue
        name, w, line = [x.strip() for x in raw.split('|')]
        extra.setdefault(name, []).append([w.upper(), line])
    from lexicon import _gentle as _g
    L0, g0 = lex(), _g()
    for t in old:
        have = {w[0] for w in t['words']}
        for w, line in extra.get(t['name'], []):
            lw = w.lower()
            if w not in have and lw not in NEVER and answer_problem(lw) != 'british' and (lw in L0 or theme_safe(lw, L0, g0)[0]):
                t['words'].append([w, americanize(line)])
                have.add(w)
        if len(t['words']) < MIN_WORDS:
            print('  older theme still short:', t['name'], len(t['words']))
    accepted = [(t['name'], {w[0].lower() for w in t['words']}) for t in old]
    names = {t['name'].lower() for t in old}
    cat = categories(TEXT)
    from lexicon import _gentle
    gentle = _gentle()
    new, dropped, thin, similar, outside = [], {}, [], [], set()
    for name, ws in parse(TEXT):
        if name.lower() in names:
            similar.append((name, 'same name'))
            continue
        keep = []
        for w in ws:
            flat = w.replace('_', '')
            ln = None
            if 3 <= len(flat) <= 12 and w not in NEVER and answer_problem(flat) != 'british':
                if flat in L:
                    ln = line_for(flat, L, V, hand, lines)
                else:
                    ok, ln = theme_safe(w, L, gentle)
                    if ok:
                        ln = line_for(flat, L, V, hand, lines) or ln
                    if ok and ln:
                        ln = ln[:1].upper() + ln[1:] + ('' if ln.endswith(('.', '!', '?')) else '.')
                        outside.add(flat)
            if not ln:
                dropped[w] = dropped.get(w, 0) + 1
                continue
            keep.append([flat.upper(), americanize(ln)])
        keep = keep[:MAX_WORDS]
        if len(keep) < MIN_WORDS:
            thin.append((name, len(keep)))
            continue
        s = {w[0].lower() for w in keep}
        clash = [n for n, o in accepted if len(s & o) > MAX_OVERLAP * min(len(s), len(o))]
        if clash:
            similar.append((name, clash[0]))
            continue
        accepted.append((name, s))
        names.add(name.lower())
        new.append({'name': americanize(name), 'words': keep, '_c': cat.get(name, 'misc')})
    # deal the new themes out one category at a time, so neighbours differ
    rng = random.Random(7)
    by = {}
    for t in new:
        by.setdefault(t['_c'], []).append(t)
    for v in by.values():
        rng.shuffle(v)
    dealt = []
    while any(by.values()):
        for c in sorted(by, key=lambda c: -len(by[c])):
            if by[c]:
                dealt.append(by[c].pop())
    for t in dealt:
        del t['_c']
    themes = old + dealt
    if report:
        print('themes: %d old + %d new = %d (%d new with %d+ words)' % (len(old), len(dealt), len(themes), len(dealt), MIN_WORDS))
        print('  too few safe words:', thin)
        print('  too like another theme:', similar)
        print('  words left out:', ' '.join(sorted(dropped)))
        print('  words from outside the crossword lexicon (%d):' % len(outside), ' '.join(sorted(outside)))
        used = {w[0].lower() for t in dealt for w in t['words']}
        print('  words with a hand-written line: %d of %d' % (sum(1 for w in used if w in lines or w in hand), len(used)))
    if write:
        os.makedirs(os.path.join(HERE, 'build'), exist_ok=True)
        json.dump(themes, open(os.path.join(HERE, 'build', 'themes.json'), 'w'))
        write_bank('qw-themes', themes, 'Quiet Words themes. Lines adapted from Open English WordNet (CC BY 4.0) or written by hand')
        with open(os.path.join(OUT, 'qw-names.js'), 'w') as f:
            f.write('/* qw-names.js: the name of every Quiet Words theme, in bank order (for "Choose a theme").\n'
                    '   Made by tools/word-games/make_themes.py. Do not edit by hand. */\n')
            f.write('window.TOL_QW_NAMES = ' + json.dumps([t['name'] for t in themes], ensure_ascii=False, separators=(',', ':')) + ';\n')
    return themes


if __name__ == '__main__':
    build()
