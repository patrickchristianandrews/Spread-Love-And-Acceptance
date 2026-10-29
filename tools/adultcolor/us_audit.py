#!/usr/bin/env python3
"""us_audit.py: the American-English and house-rules audit for everything a reader of "Color and Breathe" can see (adultcolor29).

    python3 tools/adultcolor/us_audit.py

The same rules as tools/kids/us_audit.py (its patterns are imported): no AI wording, no 911, hotline or "call someone" wording, no doctor or
medical referral wording, no British spelling or wording; plus the house style: no dashes used as punctuation (em dash, en dash), no semicolons,
none of the stock words (gentle, journey, space, hold, nurture, unlock, empower, thrive, navigate, tapestry), no headings that are a person's name.
It reads: the words printed in both PDFs and their document information, the visible text, alt text and aria labels of the built pages, and
the reader-facing parts of the listing (title, subtitle, description, keywords, taglines, back cover). The private AI note in the listing
is the one place AI wording may appear, so the listing file is only read through those reader-facing parts.
Exit 1 on any failure."""
import html
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
import importlib.util  # noqa: E402

sys.path.insert(0, os.path.join(HERE, '..', 'kids'))   # the kids audit imports its own helpers from here
_spec = importlib.util.spec_from_file_location('kids_us_audit', os.path.join(HERE, '..', 'kids', 'us_audit.py'))
U = importlib.util.module_from_spec(_spec)           # the kids audit: its rules and its HTML reader
_spec.loader.exec_module(U)
sys.path.remove(os.path.join(HERE, '..', 'kids'))
sys.path.insert(0, HERE)
import adult_text as T  # noqa: E402
import make_package as M  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'book', 'adult')
STOCK = re.compile(r'\b(gentle|gently|journey|journeys|space|spaces|hold|holds|holding|nurture|nurturing|unlock|empower|thrive|thriving|navigate|navigating|tapestry)\b', re.I)
DASH = re.compile(r'[—–]|;')
NAMES = ['Tidbit', 'Sugarfoot', 'Christian']
# the one sentence the owner allowed: the book is a pastime, not therapy and not a diagnosis
ALLOWED = re.compile(r'It is not therapy and not a diagnosis\.?')


def pdf_text(path):
    return subprocess.run(['pdftotext', '-layout', path, '-'], capture_output=True, text=True).stdout


def pdf_info(path):
    return subprocess.run(['pdfinfo', path], capture_output=True, text=True).stdout


def main():
    corp = []
    for f in ('coloring-adult.pdf', 'cover-coloring-adult.pdf'):
        corp.append(('pdf', f, pdf_text(os.path.join(OUT, f))))
        corp.append(('pdfinfo', f, pdf_info(os.path.join(OUT, f))))
    for f in ('coloring-adult.html', 'cover-coloring-adult.html'):
        h = open(os.path.join(OUT, 'src', f), encoding='utf-8').read()
        text, attrs, heads = U.visible(h)
        corp.append(('built', f, text + ' ' + ' '.join(attrs)))
        for hd in heads:
            corp.append(('heading', f, hd))
    desc = html.unescape(re.sub(r'<[^>]+>', ' ', M.description(88)))
    listing = ' '.join([T.TITLE, T.SUBTITLE, T.SERIES, desc, ' '.join(M.KEYWORDS), ' '.join(M.TAGS), ' '.join(T.BACK), ' '.join(T.BACK_BULLETS)])
    corp.append(('listing', 'reader-facing parts', listing))
    problems = []
    for kind, name, t in corp:
        t = ALLOWED.sub(' ', t)
        if kind == 'heading':
            for c in NAMES:
                if c != 'Christian' and re.search(r'\b' + c + r'\b', t):
                    problems.append((kind, name, 'name in a heading', t))
            continue
        for label, rx, flags in U.FAIL:
            for m in re.finditer(rx, t, flags):
                problems.append((kind, name, label, t[max(0, m.start() - 40):m.end() + 40].replace('\n', ' ')))
        if kind != 'pdfinfo':
            for m in STOCK.finditer(t):
                problems.append((kind, name, 'stock word', t[max(0, m.start() - 40):m.end() + 40].replace('\n', ' ')))
            for m in DASH.finditer(t):
                problems.append((kind, name, 'dash or semicolon', t[max(0, m.start() - 40):m.end() + 40].replace('\n', ' ')))
    for p in problems:
        print('FAIL   %-9s %-22s %-20s %s' % p)
    print('\n%d failure(s) in %d texts' % (len(problems), len(corp)))
    return 1 if problems else 0


if __name__ == '__main__':
    sys.exit(main())
