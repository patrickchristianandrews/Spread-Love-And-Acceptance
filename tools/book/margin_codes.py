"""margin_codes.py: the printed books' codes sit in the outside margin (book31, owner's "option 2", Oct 30 2026).

In a chapter there are no code boxes in the reading column any more. A tool, worksheet or guide is named in bold in the text,
and beside the line where it is first mentioned in that chapter a small code sits in the outside margin, with its short
address under it ("go/self"). Every code opens one of the permanent "From the books" pages, /go/<category>#<card>, read from
tools/go/map.json (tools/go/build_go.py), so the printed book never has to change when a page on the site moves.

How it is made:
  1. build_series.py builds a chapter as before, then margin_pass() takes out the in-column codes and the printed addresses,
     makes each mapped link bold, and puts an invisible marker (a .pe-mark, so it never moves the text) just before the
     first mention of each card in the chapter.
  2. build_pdfs.js prints the book, reads where each marker landed (page and height, pdftotext -bbox), draws the codes on a
     transparent overlay of the same pages (left margin on even pages, right margin on odd ones, stacked so none overlap)
     and pdf_finish.py lays the overlay over the interior.
A list or paragraph that names three or more new things gets one code per category page (/go/read and so on) instead of
one code per thing, so a page never holds more codes than its margin can take."""
import html
import json
import os
import re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
SITE = 'https://spreadloveandacceptance.com'
SHORT = 'spreadloveandacceptance.com'
GO = json.load(open(os.path.join(ROOT, 'tools', 'go', 'map.json'), encoding='utf-8'))['map']
NO_CODE_PATH = re.compile(r'^/(?:research\.html#|five-pillars\.html|glossary\.html|assets/|book/[a-z0-9-]+\.html(?:#|$)|safety\.html)')
TAG_RE = re.compile(r'<!--.*?-->|<(/?)([a-zA-Z][a-zA-Z0-9]*)\b([^>]*?)(/?)>', re.S)
VOID = {'br', 'img', 'hr', 'wbr', 'input', 'meta', 'link', 'source', 'col', 'path', 'circle', 'rect', 'line', 'polyline',
        'polygon', 'ellipse', 'use', 'stop'}
HIDDEN = re.compile(r'\b(?:no-print|pe-noprint|noprint|ps-scan)\b')
COUNTER = [0]


def cats():
    """[(id, title, lede)] of the seven category pages, in their order (tools/go/build_go.py CATS)"""
    src = open(os.path.join(ROOT, 'tools', 'go', 'build_go.py'), encoding='utf-8').read()
    m = re.search(r'^CATS = \[(.*?)^\]', src, re.S | re.M)
    return [tuple(x) for x in eval('[' + m.group(1) + ']')]


def site_path(h):
    h = html.unescape(h or '')
    if h.startswith(SITE):
        h = h[len(SITE):] or '/'
    return h if h.startswith('/') else None


def go_path(h, unstub=None, free_form=None):
    """the go-page card ("/go/self#weather") for a link to the site, or None"""
    p = site_path(h)
    if not p:
        return None
    cands = [p]
    if unstub:
        u = site_path(unstub(p))
        if u and u not in cands:
            cands.append(u)
    if free_form:
        for c in list(cands):
            f = free_form(c)
            if f and f not in cands:
                cands.append(f)
    for c in cands:
        if c in GO:
            return GO[c]
    if NO_CODE_PATH.match(p):
        return None
    for c in cands:
        base = c.split('#')[0]
        for b in (base, base.split('?')[0]):
            if b in GO:
                return GO[b]
    # a page the books link to only at one of its parts (#…): the first of its cards
    for c in cands:
        b = c.split('#')[0].split('?')[0]
        same = sorted(k for k in GO if k.split('#')[0].split('?')[0] == b)
        if same:
            return GO[same[0]]
    return None


def cat_of(g):
    return g.split('#')[0].rsplit('/', 1)[-1]


def caption(g):
    return 'go/' + cat_of(g)


def short(g):
    """the address to type for a go card: the category page (the card is found on it)"""
    return SHORT + '/go/' + cat_of(g)


def remove_elements(s, start_pat):
    """remove every element whose start tag matches start_pat, with its contents (balanced)"""
    out = []
    i = 0
    rx = re.compile(start_pat)
    while True:
        m = rx.search(s, i)
        if not m:
            out.append(s[i:])
            return ''.join(out)
        out.append(s[i:m.start()])
        i = element_end(s, m.start())


def element_end(s, i):
    m = TAG_RE.match(s, i)
    if not m or not m.group(2):
        return i + 1
    name = m.group(2).lower()
    if name in VOID or m.group(4):
        return m.end()
    depth = 0
    for t in TAG_RE.finditer(s, i):
        if not t.group(2) or t.group(2).lower() != name or t.group(4):
            continue
        depth += -1 if t.group(1) else 1
        if depth == 0:
            return t.end()
    return len(s)


def strip_codes(s):
    """take out the in-column codes and the printed addresses beside links (a safety link keeps its address)"""
    s = remove_elements(s, r'<div class="ps-scan pe-only">')
    s = remove_elements(s, r'<div class="lg-box-qr">')
    s = re.sub(r'<span class="pe-qr"[^>]*></span>', '', s)
    s = remove_elements(s, r'<span class="pe-use-u">')
    s = remove_elements(s, r'<span class="bh-u">')
    out, i = [], 0
    for m in re.finditer(r'<span class="pe-only pe-u">', s):
        if m.start() < i:
            continue
        j = element_end(s, m.start())
        if 'safety' in s[m.start():j]:
            continue
        out.append(s[i:m.start()])
        i = j
    out.append(s[i:])
    return ''.join(out)


def marker(g, url):
    COUNTER[0] += 1
    return ('<span class="pe-mark pe-mq" aria-hidden="true" data-mq="%d" data-mq-u="%s" data-mq-c="%s">zqmqx%dqz</span>' % (
        COUNTER[0], html.escape(url, quote=True), caption(g), COUNTER[0]))


def margin_pass(s, unstub=None, free_form=None, seen=None, crowd=3):
    """bold names and margin-code markers for one chapter (or one back-matter page). seen: cards already given a code
    in this chapter. Returns (html, [go targets coded])."""
    s = strip_codes(s)
    seen = set() if seen is None else seen
    stack, links = [], []
    for t in TAG_RE.finditer(s):
        if not t.group(2):
            continue
        close, name, attrs, selfc = t.group(1), t.group(2).lower(), t.group(3), t.group(4)
        if close:
            while stack and stack[-1][0] != name:
                stack.pop()
            if stack:
                stack.pop()
            continue
        if name == 'a':
            links.append((t.start(), t.end(), attrs, list(stack)))
        if name not in VOID and not selfc:
            cls = re.search(r'\bclass="([^"]*)"', attrs)
            stack.append((name, cls.group(1) if cls else '', t.start()))
    edits = []      # (pos, kind, payload)
    new = []        # (pos, go, container)
    for start, end, attrs, st in links:
        if re.search(r'class="(?:dig|book-fig-zoom)|data-u="series"', attrs):
            continue
        if any(HIDDEN.search(c) for _n, c, _s in st):
            continue
        hm = re.search(r'\bhref="([^"]+)"', attrs)
        if not hm:
            continue
        g = go_path(hm.group(1), unstub, free_form)
        if not g:
            continue
        edits.append((start, 'bold', end))
        if g in seen:
            continue
        seen.add(g)
        cont = next((x[2] for x in reversed(st) if x[0] in ('ul', 'ol', 'table') and 'ideas' not in x[1].split()), None)
        if cont is None:
            cont = next((x[2] for x in reversed(st) if x[0] in ('p', 'li', 'dd', 'td', 'th', 'h2', 'h3', 'h4', 'figcaption')), start)
        new.append((start, g, cont))
    # crowded: a list, table or paragraph naming three or more new things gets one code per category page
    by = {}
    for pos, g, cont in new:
        by.setdefault(cont, []).append((pos, g))
    codes = []
    for cont, items in by.items():
        if len(items) >= crowd:
            done = set()
            for pos, g in items:
                c = '/go/' + cat_of(g)
                if c in done or c in seen:
                    continue
                done.add(c)
                seen.add(c)
                codes.append((pos, c))
        else:
            codes.extend(items)
    for pos, g in codes:
        edits.append((pos, 'mark', g))
    coded = [g for _p, g in codes]
    # apply from the end, so earlier offsets stay right (at one place the link is made bold first, then the marker goes before it)
    for pos, kind, val in sorted(edits, key=lambda e: (e[0], 1 if e[1] == 'bold' else 0), reverse=True):
        if kind == 'bold':
            tag = s[pos:val]
            if re.search(r'\bclass="', tag):
                tag = re.sub(r'\bclass="', 'class="mq-n ', tag, count=1)
            else:
                tag = tag[:2] + ' class="mq-n"' + tag[2:]
            s = s[:pos] + tag + s[val:]
        else:
            s = s[:pos] + marker(val, SITE + val) + s[pos:]
    return s, coded
