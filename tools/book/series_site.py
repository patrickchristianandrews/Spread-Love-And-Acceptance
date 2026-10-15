#!/usr/bin/env python3
"""series_site.py: the print series on the book's home page (/book/) (print12).

Used by tools/book/build_series.py (which also patches book/index.html in place) and by
tools/book/build_book.py's build_home (so a full rebuild of the book keeps the block). Reads
tools/book/series.json (the books) and book/print/series.json (page counts, written by build_pdfs.js).

The shop buttons come from /assets/js/book-shop.js: { direct, amazon, ingram } per book. A button whose link is
empty stays hidden, and so does the whole "Get it in print" row while all three are empty. No store address is
ever written here.
"""
import html
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
START, END = '<!-- book-series:start -->', '<!-- book-series:end -->'
CSS = '<link rel="stylesheet" href="/assets/css/book-series.css">'
JS = '<script src="/assets/js/book-shop.js" defer></script>'
PDF_FOR = {(3,): 'understanding', (2,): 'together', (1, 3): 'for-yourself', (1,): 'for-yourself'}


def esc(s):
    return html.escape(s, quote=True)


def config():
    with open(os.path.join(HERE, 'series.json'), encoding='utf-8') as f:
        return json.load(f)


def built():
    try:
        with open(os.path.join(ROOT, 'book', 'print', 'series.json'), encoding='utf-8') as f:
            return json.load(f)
    except Exception:
        return {}


def art(kind):
    import book_art
    return book_art.illustration(kind)


def part_of(slug):
    if slug.startswith('self-'):
        return 1
    if slug == 'preface' or slug.startswith('chapter-'):
        return 2
    if slug.startswith('understanding-'):
        return 3
    return 0


def pdf_anchor(chapters):
    parts = tuple(sorted(set(part_of(s) for s in chapters) - {0}))
    for want, name in PDF_FOR.items():
        if set(parts) <= set(want):
            return name
    return 'whole'


def words(s):
    return len(re.findall(r"[A-Za-z0-9’']+", s or ''))


def check_blurbs():
    out = []
    c = config()
    for b in c['books'] + [c['workbook']]:
        n = words(b.get('blurb', ''))
        if not 120 <= n <= 160:
            out.append('back-cover words for %s: %d (want 120 to 160)' % (b['title'], n))
    return out


def cover_img(item_id, alt):
    small = 'book/print/cover-%s-front-small.jpg' % item_id
    if os.path.exists(os.path.join(ROOT, small)):
        return '<img class="bk-sb-cover" src="/%s" alt="%s" width="480" height="720" loading="lazy" decoding="async">' % (small, esc(alt))
    return '<span class="bk-sb-cover is-empty" aria-hidden="true"></span>'


def shop_row(item_id):
    return ('<p class="bk-sb-shop" data-shop-book="%s" hidden><span class="bk-sb-shop-k">Get it in print:</span> '
            '<a class="tol-btn is-quiet" data-shop="direct" hidden>From this site</a> '
            '<a class="tol-btn is-quiet" data-shop="amazon" hidden>Amazon</a> '
            '<a class="tol-btn is-quiet" data-shop="ingram" hidden>Bookshops and libraries</a></p>') % esc(item_id)


def home_html():
    c = config()
    made = built().get('books', {})
    rows = []
    for b in c['books']:
        m = made.get(b['id'], {})
        meta = '%d chapters' % len(b['chapters'])
        if m.get('pages'):
            meta += ' · %d pages in print' % m['pages']
        first = '/book/%s.html' % b['chapters'][0]
        rows.append(('<li class="bk-sb" style="--bc:%s">%s<div class="bk-sb-body"><p class="bk-sb-k">Book %d</p><h3>%s</h3><p class="bk-sb-line">%s</p>'
                     '<p class="bk-sb-meta">%s</p><p class="bk-sb-links"><a class="tol-btn" href="%s">Read free online</a> '
                     '<a class="tol-btn is-quiet" href="/book/download.html#%s">Free PDF</a></p>%s</div></li>') % (
            b['color'], cover_img(b['id'], 'Cover of Book %d, %s' % (b['n'], b['title'])), b['n'], esc(b['title']), esc(b['line']), meta, first,
            pdf_anchor(b['chapters']), shop_row(b['id'])))
    w = c['workbook']
    m = made.get(w['id'], {})
    meta = 'Every workpaper, to fill in by hand' + (' · %d large pages' % m['pages'] if m.get('pages') else '')
    rows.append(('<li class="bk-sb" style="--bc:%s">%s<div class="bk-sb-body"><p class="bk-sb-k">Workbook</p><h3>%s</h3><p class="bk-sb-line">%s</p>'
                 '<p class="bk-sb-meta">%s</p><p class="bk-sb-links"><a class="tol-btn" href="/workpapers/fill/index.html">Fill them in free online</a></p>%s</div></li>') % (
        w['color'], cover_img(w['id'], 'Cover of %s' % w['title']), esc(w['title']), esc(w['line']), meta, shop_row(w['id'])))
    return ('%s\n%s\n<section class="bk-series no-bubble" data-no-bubble id="print-series" aria-labelledby="series-h">'
            '<h2 id="series-h">The book in print</h2>'
            '<p>The same chapters, as a series of short colour books that each stand on their own, plus a workbook with every workpaper. '
            'In print, each chapter is the short version, with a code to scan for the full one.</p>'
            '<p class="bk-series-note">The print books are optional; everything stays free online.</p>'
            '<ol class="bk-series-list">%s</ol></section>\n%s\n%s') % (START, CSS, '\n'.join(rows), JS, END)


def patch_home(path):
    """Put the series block into book/index.html: in place of the old block, or after the contents."""
    with open(path, encoding='utf-8') as f:
        s = f.read()
    blk = home_html()
    if START in s:
        s2 = re.sub(re.escape(START) + r'.*?' + re.escape(END), lambda m: blk, s, flags=re.S)
    else:
        k = s.find('<section class="bk-wt')
        if k < 0:
            k = s.find('<h2 id="other-ways">')
        if k < 0:
            return False
        s2 = s[:k] + blk + '\n' + s[k:]
    if s2 != s:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(s2)
    return True
