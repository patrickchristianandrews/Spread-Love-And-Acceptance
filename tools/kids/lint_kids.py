#!/usr/bin/env python3
"""lint_kids.py: check every word of the kids books against the site's language rules (kids22).

    python3 tools/kids/lint_kids.py            prints problems (exit 1 if any) and a reading-level table

Checks (the rules are in the wave notes and lang-style.md):
  - no em dashes, no en dashes used as dashes, no spaced hyphen dashes
  - semicolons: none in the kids text
  - "not X, but Y" / "It's not about X, it's about Y" frames, and the stock phrases (In short, The key is, Here's the thing,
    It's worth noting, Let's dive in, Remember:)
  - British spellings and words (tools/book/us_english.py converts them; any change it would make is a problem)
  - the owner's removals: hotlines and numbers, services, "talk to a doctor", read-aloud, Kip
  - labels on people: a short list of words that must not describe a person
  - sentence length and a Flesch-Kincaid grade estimate for each book
"""
import glob
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import kids_common as C  # noqa: E402

sys.path.insert(0, os.path.join(C.ROOT, 'tools', 'book'))
try:
    import us_english  # noqa: E402
except Exception:  # pragma: no cover
    us_english = None

PATTERNS = [
    ('em dash', r'—'), ('en dash', r'–'), ('spaced hyphen dash', r' - '), ('semicolon', r';'),
    ('not-but frame', r"\b(?:is|was|are|were|am|isn't|wasn't|aren't|weren't|it's|that's|this is|he's|she's)\s+not\s+(?:about\s+)?[^.!?]{1,60},?\s+(?:but|it's|it is)\b"),
    ('not-but frame 2', r"\bnot\s+[^.!?,]{1,40},\s+but\s+"),
    ('stock phrase', r"\b(?:In short|The key is|Here's the thing|Here's what|It's worth noting|Let's dive in|Remember:|At the end of the day|It's important to)\b"),
    ('hotline or service', r"\b(?:hotline|helpline|988|911|crisis line|call 1|text HOME|therapist|counselor|counsellor|psychologist|psychiatrist|call a doctor|see a doctor|talk to a doctor|emergency room|police)\b"),
    ('read-aloud or Kip', r"\b(?:read aloud|read-aloud button|text-to-speech|Kip the)\b"),
    ('label on a person', r"\b(?:narcissist|gaslight|toxic person|crazy|psycho|retard|spaz|stupid kid|autistic kid|ADHD kid|special needs)\b"),
]
# a few British words that us_english may miss in fiction
BRIT = r"\b(?:colour|favour|honour|neighbour|grey|mum|mummy|biscuit|jumper|trainers|rubbish|whilst|amongst|learnt|spelt|dreamt|programme|centre|theatre|realise|organise|apologise|cosy|torch|queue|pavement|lorry|petrol|sweets|fortnight|maths|colouring|favourite|metre)\b"


def strip_code(t):
    return re.sub(r'<[^>]+>', ' ', t)


def texts():
    out = []
    pb = C.load_json(os.path.join(C.MS, 'picture-book.json'))

    def walk(o, path):
        if isinstance(o, str):
            out.append(('picture-book:' + path, o))
        elif isinstance(o, list):
            for i, x in enumerate(o):
                walk(x, '%s[%d]' % (path, i))
        elif isinstance(o, dict):
            for k, v in o.items():
                walk(v, path + '.' + k)
    walk(pb, '')
    for fp in sorted(glob.glob(os.path.join(C.MS, 'chapter-book', '*.md'))):
        out.append(('chapter-book:' + os.path.basename(fp), open(fp, encoding='utf-8').read()))
    cb = C.load_json(os.path.join(C.MS, 'chapter-book', '00-book.json'))
    walk(cb, '')
    out = [(n.replace('picture-book:', 'picture-book:') if n.startswith('picture-book') else n, t) for n, t in out]
    for name in ('coloring-younger.json', 'coloring-older.json'):
        p = os.path.join(C.MS, name)
        if os.path.exists(p):
            walk(C.load_json(p), '')
            out[-1:] = out[-1:]
            # label the walk results by file
            out = [(n if ':' in n and not n.startswith(':') else name + ':' + n, t) for n, t in out]
    return out


def syllables(w):
    w = w.lower()
    w = re.sub(r'[^a-z]', '', w)
    if not w:
        return 0
    if len(w) <= 3:
        return 1
    w = re.sub(r'(?:[^laeiouy]es|ed|[^laeiouy]e)$', '', w)
    w = re.sub(r'^y', '', w)
    return max(1, len(re.findall(r'[aeiouy]{1,2}', w)))


def reading(text):
    t = re.sub(r'^(#|:::|ill:).*$', '', text, flags=re.M)
    sents = [s for s in re.split(r'(?<=[.!?])\s+', re.sub(r'\s+', ' ', t)) if len(s.split()) > 0]
    words = re.findall(r"[A-Za-z']+", t)
    if not sents or not words:
        return None
    syl = sum(syllables(w) for w in words)
    fk = 0.39 * len(words) / len(sents) + 11.8 * syl / len(words) - 15.59
    return {'words': len(words), 'sentences': len(sents), 'avg_sentence': round(len(words) / len(sents), 1), 'fk_grade': round(fk, 1)}


def main():
    bad = []
    items = texts()
    for name, t in items:
        plain = strip_code(t)
        for label, rx in PATTERNS:
            for m in re.finditer(rx, plain, re.I if label not in ('stock phrase',) else 0):
                bad.append((name, label, plain[max(0, m.start() - 40):m.end() + 40].replace('\n', ' ')))
        for m in re.finditer(BRIT, plain, re.I):
            # "flat" and "bin" and "holiday" are fine in some uses; list them for a look
            bad.append((name, 'british?', plain[max(0, m.start() - 30):m.end() + 30].replace('\n', ' ')))
        if us_english is not None:
            try:
                conv = us_english.us(plain)
                if conv != plain:
                    a, b = plain.split(), conv.split()
                    ok = {('nana', 'grandma'), ('rung', 'called'), ('rang', 'called')}
                    diffs = [(x, y) for x, y in zip(a, b) if x != y and (x.lower().strip('.,"\'?!'), y.lower().strip('.,"\'?!')) not in ok][:4]
                    if diffs:
                        bad.append((name, 'us_english would change', str(diffs)))
            except Exception:
                pass
    for b in bad:
        print('%-40s %-26s %s' % b)
    print('\n%d problem(s)' % len(bad))
    # reading level per book
    groups = {}
    for name, t in items:
        g = name.split(':')[0].split('.')[0]
        groups.setdefault(g, []).append(t)
    print('\nreading level (Flesch-Kincaid grade, a rough guide)')
    for g, ts in groups.items():
        r = reading('\n'.join(ts))
        if r:
            print('  %-22s %s' % (g, json.dumps(r)))
    return 1 if bad else 0


if __name__ == '__main__':
    sys.exit(main())
