#!/usr/bin/env python3
"""Build the site search index: assets/js/search-index.js

The menu's "Search the site" box (site.js) loads this file the first time someone types in it,
and searches page titles, headings and text entirely in the browser. Nothing typed is sent anywhere.

Run it from the repository root whenever pages are added or their words change:

    python3 tools/search/build_index.py

It reads every tracked or new .html page (skipping tools/, supabase/, redirects, noindex pages and
the background-only pages), and writes one small script: window.TOL_SEARCH = { v, pages: [...] }.
Each page keeps its address, title, main heading, section headings, a short summary and the first
part of its text, so the file stays small enough to load on a phone.
"""
import html
import json
import os
import re
import subprocess
import sys
from html.parser import HTMLParser

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'assets', 'js', 'search-index.js')
TEXT_CHARS = 2400   # how much body text is kept per page
SKIP = re.compile(r'^(tools|supabase|_|node_modules)/|(^|/)(garden-backdrop|offline|404|pal-cam-tv)\.html$')


class Page(HTMLParser):
    SKIP_TAGS = {'script', 'style', 'noscript', 'svg', 'template', 'nav', 'header-skip', 'button', 'select', 'textarea', 'form'}
    # the breadcrumb and the "simple / full" line aren't prose: leave them out of the text, so a result's
    # snippet reads as a sentence from the page, not a string of labels
    SKIP_CLASSES = {'read-code', 'depth-bar', 'breadcrumb', 'crumbs', 'no-index'}
    # headings are kept on their own (title, h1, section headings), not again inside the text
    HEAD_TAGS = {'h1', 'h2', 'h3'}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title = ''
        self.h1 = ''
        self.heads = []
        self.desc = ''
        self.text = []
        self.noindex = False
        self.refresh = False
        self._stack = []
        self._skip = 0
        self._cap = None
        self._buf = []
        self._in_main = 0
        self._saw_main = False
        self._body_text = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'meta':
            name = (a.get('name') or '').lower()
            if name == 'description':
                self.desc = a.get('content') or ''
            if name == 'robots' and 'noindex' in (a.get('content') or ''):
                self.noindex = True
            if (a.get('http-equiv') or '').lower() == 'refresh':
                self.refresh = True
            return
        if tag in ('br', 'img', 'input', 'link', 'hr', 'meta', 'source', 'wbr'):
            return
        classes = set((a.get('class') or '').split())
        skip = tag in self.SKIP_TAGS or (a.get('aria-hidden') == 'true') or bool(classes & self.SKIP_CLASSES) or tag in self.HEAD_TAGS
        self._stack.append((tag, skip))
        if skip:
            self._skip += 1
        if tag == 'main':
            self._in_main += 1
            self._saw_main = True
        if tag in ('title', 'h1', 'h2', 'h3'):
            self._cap = tag
            self._buf = []

    def handle_endtag(self, tag):
        if not any(t == tag for t, _ in self._stack):
            return
        while self._stack:
            t, skipped = self._stack.pop()
            if skipped:
                self._skip = max(0, self._skip - 1)
            if t == 'main':
                self._in_main = max(0, self._in_main - 1)
            if t == self._cap:
                words = clean(''.join(self._buf))
                if t == 'title':
                    self.title = words
                elif t == 'h1' and not self.h1:
                    self.h1 = words
                elif t in ('h2', 'h3') and words and len(self.heads) < 24:
                    self.heads.append(words)
                self._cap = None
            if t == tag:
                break

    def handle_data(self, data):
        if self._cap:
            self._buf.append(data)
        if self._skip or self._cap == 'title':
            return
        (self.text if self._in_main else self._body_text).append(data)


def clean(s):
    return re.sub(r'\s+', ' ', html.unescape(s or '')).strip()


def pages():
    try:
        out = subprocess.check_output(['git', 'ls-files', '-co', '--exclude-standard', '*.html'], cwd=ROOT).decode()
        files = [f for f in out.split('\n') if f]
    except Exception:
        files = []
        for d, _, fs in os.walk(ROOT):
            for f in fs:
                if f.endswith('.html'):
                    files.append(os.path.relpath(os.path.join(d, f), ROOT))
    return sorted(f for f in files if not SKIP.search(f))


def main():
    rows = []
    for f in pages():
        path = os.path.join(ROOT, f)
        if not os.path.exists(path):
            continue
        p = Page()
        try:
            p.feed(open(path, encoding='utf-8', errors='replace').read())
        except Exception as e:  # a broken page shouldn't stop the index
            print('skipped', f, e, file=sys.stderr)
            continue
        if p.noindex or p.refresh:
            continue
        body = clean(' '.join(p.text if p._saw_main else p._body_text))
        title = re.sub(r'\s+[—–|-]\s+The Objective Ledger.*$', '', p.title)
        title = re.sub(r'\s*[·|–—-]\s*Spread Love (&|and) Acceptance\s*$', '', title).strip() or p.h1 or f
        url = '/' + f
        rows.append({
            'u': url,
            't': title,
            'h': p.h1 if p.h1 and p.h1 != title else '',
            'd': clean(p.desc)[:240],
            's': p.heads,
            'x': body[:TEXT_CHARS],
            'f': 1 if url.endswith('-in-depth.html') else 0,
        })
    data = {'v': 1, 'pages': rows}
    js = ('/* search-index.js: built by tools/search/build_index.py. Do not edit by hand; run the script again.\n'
          '   Used only in the browser by the menu\'s "Search the site" box. */\n'
          'window.TOL_SEARCH = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    with open(OUT, 'w', encoding='utf-8') as fh:
        fh.write(js)
    print('indexed %d pages, %d KB -> %s' % (len(rows), len(js.encode('utf-8')) // 1024, os.path.relpath(OUT, ROOT)))


if __name__ == '__main__':
    main()
