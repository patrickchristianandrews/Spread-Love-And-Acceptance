#!/usr/bin/env python3
"""chapter_pages.py: read the chapter start pages from the printed chapter book and save them for its contents page.

    python3 tools/kids/chapter_pages.py      (then rebuild and reprint the chapter book once)

Writes book/kids/src/chapter-pages.json: the PDF page number where each "CHAPTER n" opener falls.
"""
import json
import os
import re
import subprocess

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
PDF = os.path.join(ROOT, 'book', 'kids', 'chapter-book.pdf')
OUT = os.path.join(ROOT, 'book', 'kids', 'src', 'chapter-pages.json')

n = int(re.search(r'Pages:\s+(\d+)', subprocess.run(['pdfinfo', PDF], capture_output=True, text=True).stdout).group(1))
found = {}
for p in range(1, n + 1):
    t = subprocess.run(['pdftotext', '-f', str(p), '-l', str(p), PDF, '-'], capture_output=True, text=True).stdout
    m = re.match(r'\s*CHAPTER (\d+)\b', t)
    if m and int(m.group(1)) not in found:
        found[int(m.group(1))] = p
pages = [found[k] for k in sorted(found)]
json.dump(pages, open(OUT, 'w'))
print(OUT, pages)
