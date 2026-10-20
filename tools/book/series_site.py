#!/usr/bin/env python3
"""series_site.py: the print series on the book's home page (/book/) (print12).

Used by tools/book/build_series.py (which also patches book/index.html in place) and by
tools/book/build_book.py's build_home (so a full rebuild of the book keeps the block). Reads
tools/book/series.json (the books) and book/print/series.json (page counts, written by build_pdfs.js).

The shop button comes from /assets/js/book-shop.js: { amazon } per book (logicbook14: the owner sells on Amazon only, so
there is no "from this site" or bookshop button). A button whose link is empty stays hidden, and so does the whole
"Get it in print" row while it is empty. No store address is ever written here. The pocket guide (tools/book/series-extras.json)
has its own row, with the free situations online.
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
# panel16: no PDF is made for each print book on its own, so the button says which free PDF holds that book's chapters
PDF_NAME = {'understanding': 'Understanding People', 'together': 'The Book for Two or More', 'for-yourself': 'The Book for One Person', 'whole': 'the whole book'}


def esc(s):
    return html.escape(s, quote=True)


def config():
    with open(os.path.join(HERE, 'series.json'), encoding='utf-8') as f:
        cfg = json.load(f)
    for b in cfg['books']:
        put_isbns(cfg, b)
    put_isbns(cfg, cfg['workbook'])
    return cfg


def isbn(cfg, item_id, fmt):
    """finalfix15: the ISBN for one book and format, from the one "isbn" block in tools/book/series.json ('' until bought)"""
    return ((cfg.get('isbn') or {}).get(item_id) or {}).get(fmt, '').strip()


def put_isbns(cfg, item):
    """copies an item's ISBNs from the "isbn" block onto it, as the builders read them: isbn (the paperback; the workbook's
    colour edition), isbn_bw (the workbook's black-and-white edition) and isbn_ebook"""
    i = item['id']
    item['isbn'] = isbn(cfg, i, 'paperback') or isbn(cfg, i, 'paperback-colour')
    item['isbn_bw'] = isbn(cfg, i, 'paperback-bw')
    item['isbn_ebook'] = isbn(cfg, i, 'kindle')
    return item


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


def cover_img(item_id, alt, h=720):
    small = 'book/print/cover-%s-front-small.jpg' % item_id
    if os.path.exists(os.path.join(ROOT, small)):
        return '<img class="bk-sb-cover" src="/%s" alt="%s" width="480" height="%d" loading="lazy" decoding="async">' % (small, esc(alt), h)
    return '<span class="bk-sb-cover is-empty" aria-hidden="true"></span>'


def shop_row(item_id):
    return ('<p class="bk-sb-shop" data-shop-book="%s" hidden><span class="bk-sb-shop-k">Get it in print:</span> '
            '<a class="tol-btn is-quiet" data-shop="amazon" hidden>Amazon</a></p>') % esc(item_id)


def pdf_label(m):
    """owner17: a print book's PDF button on /book/: its real page count, from the built file"""
    return 'Free PDF' + (' · %d pages' % m['pages'] if m.get('pages') else '')


def free_pdf(item_id, m):
    """owner17: the workbook and the pocket guide download straight away, with no email (the owner's exceptions)"""
    f = m.get('pdf') or (item_id + '.pdf')
    if not os.path.exists(os.path.join(ROOT, 'book', 'print', f)):
        return ''
    return ' <a class="tol-btn is-quiet" href="/book/print/%s" download>%s</a>' % (esc(f), pdf_label(m) + ', no email')


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
                     '<a class="tol-btn is-quiet" href="/book/download.html#%s">%s</a></p>%s</div></li>') % (
            b['color'], cover_img(b['id'], 'Cover of Book %d, %s' % (b['n'], b['title'])), b['n'], esc(b['title']), esc(b['line']), meta, first,
            book_anchor(b), pdf_label(m), shop_row(b['id'])))
    # voice18: the paperbacks under 100 pages (the pocket guide and the workbook) are grouped as the short editions,
    # after the books, each under its own name
    short = []
    w = c['workbook']
    m = made.get(w['id'], {})
    meta = 'Every workpaper, to fill in by hand' + (' · %d large pages' % m['pages'] if m.get('pages') else '')
    short.append(('<li class="bk-sb" style="--bc:%s">%s<div class="bk-sb-body"><p class="bk-sb-k">Short edition · Workbook</p><h3>%s</h3><p class="bk-sb-line">%s</p>'
                 '<p class="bk-sb-meta">%s</p><p class="bk-sb-links"><a class="tol-btn" href="/workpapers/fill/index.html">Fill them in free online</a>%s</p>%s</div></li>') % (
        w['color'], cover_img(w['id'], 'Cover of %s' % w['title']), esc(w['title']), esc(w['line']), meta, free_pdf(w['id'], m), shop_row(w['id'])))
    try:
        with open(os.path.join(HERE, 'series-extras.json'), encoding='utf-8') as f:
            pk = json.load(f)['pocket']
    except (OSError, ValueError, KeyError):
        pk = None
    if pk:
        m = made.get(pk['id'], {})
        meta = '%d everyday reactions, one to a page' % len(pk['items']) + (' · %d small pages' % m['pages'] if m.get('pages') else '')
        short.insert(0, ('<li class="bk-sb" style="--bc:%s">%s<div class="bk-sb-body"><p class="bk-sb-k">Short edition · Pocket guide</p><h3>%s</h3><p class="bk-sb-line">%s</p>'
                     '<p class="bk-sb-meta">%s</p><p class="bk-sb-links"><a class="tol-btn" href="/the-logic-behind-it.html">Every situation, free online</a>%s</p>%s</div></li>') % (
            pk['color'], cover_img(pk['id'], 'Cover of %s' % pk['title'], 768), esc(pk['title']), esc(pk['line']), meta, free_pdf(pk['id'], m), shop_row(pk['id'])))
    return ('%s\n%s\n<section class="bk-series no-bubble no-dive no-cheer" data-no-bubble id="print-series" aria-labelledby="series-h">'
            '<h2 id="series-h">The book in print</h2>'
            '<p>The same chapters, as a series of short colour books that each stand on their own, plus a workbook with every workpaper and a pocket guide. '
            'In print, each chapter is the short version, with a code to scan for the full one.</p>'
            '<p class="bk-series-note" data-shop-soon>Paperbacks: coming to Amazon soon. Everything here stays free to read online.</p>'
            '<p class="bk-series-note">' + EMAIL_LINE + ' ' + FREE_LINE + '</p>'
            '<ol class="bk-series-list">%s</ol>'
            '<h3 class="bk-series-h3" id="short-editions">The short editions</h3>'
            '<p class="bk-series-note">Two smaller companions to the books, each under a hundred pages: the pocket guide and the workbook.</p>'
            '<ol class="bk-series-list bk-series-short">%s</ol></section>\n%s\n%s') % (START, CSS, '\n'.join(rows), '\n'.join(short), JS, END)


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


# ---------- owner17: the four books (and the workbook and pocket guide) on the download page (/book/download.html) ----------
# The download page's main PDFs are the four print books themselves (book/print/<id>.pdf: 6 x 9 in pages with no bleed or crop
# marks, so they read well on a screen), linked by file name, so a rebuild of the print series slots straight in. Page counts and
# sizes come from book/print/series.json (written by build_pdfs.js); /assets/js/book-download.js reads the same file again on the
# page, so the numbers always match the files. The four books ask for an email (the owner's choice); the workbook (the
# workpapers) and the pocket guide (The Logic Behind It) do not. build_book.py's build_download() puts this block on the page,
# and patch_download() refreshes it in place (tools/book/build_series.py calls it after a series build).
DL_START, DL_END = '<!-- book-dl-books:start -->', '<!-- book-dl-books:end -->'
# the one sentence about email, the same everywhere it is said (download page, book page, Professor Puddles)
EMAIL_LINE = 'Read every chapter free online. To download a book as a PDF, we’ll ask for your email.'
FREE_LINE = 'The workbook and the pocket guide download without an email.'
DL_CSS = '''<style>
.bk-dl .bk-dl-books{ list-style:none; padding:0 !important; margin:.6rem 0 1.4rem; display:grid; gap:1rem; }
@media (min-width:760px){ .bk-dl .bk-dl-books{ grid-template-columns:1fr 1fr; } }
.bk-dl .bk-dl-book{ display:grid; grid-template-columns:6.4rem minmax(0,1fr); gap:1rem; align-items:start; margin:0; max-width:none; padding:.9rem 1rem; border:1px solid var(--line); border-left:5px solid var(--bc, var(--brass)); border-radius:16px; background:var(--paper); }
.bk-dl .bk-dl-book::before{ content:none !important; }
.bk-dl .bk-dl-book-cover{ display:block; width:100%; height:auto; border-radius:4px; box-shadow:0 2px 8px rgba(40,30,20,.18); }
.bk-dl .bk-dl-book-k{ margin:0; font:600 .78rem/1.3 "IBM Plex Mono", monospace; letter-spacing:.06em; text-transform:uppercase; color:var(--bc, var(--ink-soft)); }
.bk-dl .bk-dl-book h3{ margin:.1rem 0 .3rem; font-size:1.2rem; }
.bk-dl .bk-dl-book-line{ margin:0 0 .6rem; font-size:.95rem; }
.bk-dl .bk-dl-book-links{ display:flex; flex-wrap:wrap; align-items:center; gap:.4rem .8rem; margin:0; }
.bk-dl .bk-dl-book a.bk-dl-read{ margin-left:0; }
.bk-dl .bk-dl-free-note{ font-size:.95rem; }
.bk-dl .bk-dl-row button{ min-height:44px; }
.bk-dl a.bk-dl-nomail{ display:inline-flex; flex-direction:column; min-height:44px; padding:.45rem .9rem; border:2px solid var(--line); border-radius:12px; text-decoration:none; color:var(--ink); font-weight:600; }
.bk-dl a.bk-dl-nomail .bk-dl-m{ font-weight:400; font-size:.85rem; color:var(--ink-soft); }
.bk-dl details.bk-dl-long{ margin:1.6rem 0 1rem; padding:.2rem 0; border-top:1px solid var(--line); }
.bk-dl details.bk-dl-long > summary{ cursor:pointer; min-height:44px; display:flex; align-items:center; gap:.5rem; list-style:none; padding:.5rem 0; }
.bk-dl details.bk-dl-long > summary::-webkit-details-marker{ display:none; }
.bk-dl details.bk-dl-long > summary::before{ content:""; flex:none; width:.55em; height:.55em; border-right:2.5px solid currentColor; border-bottom:2.5px solid currentColor; transform:rotate(-45deg); transition:transform .2s; }
.bk-dl details.bk-dl-long[open] > summary::before{ transform:rotate(45deg); }
.bk-dl details.bk-dl-long > summary h2{ margin:0; font-size:1.3rem; }
.bk-dl details.bk-dl-long > p{ margin:.2rem 0 .8rem; }
@media (max-width:420px){ .bk-dl .bk-dl-book{ grid-template-columns:4.6rem minmax(0,1fr); gap:.8rem; padding:.8rem; } }
</style>'''


def _mb(n):
    return '%.1f MB' % (n / 1048576.0) if n else ''


def _meta(m):
    bits = []
    if m.get('pages'):
        bits.append('%d pages' % m['pages'])
    if m.get('bytes'):
        bits.append(_mb(m['bytes']))
    return ' · '.join(bits)


def _file(item_id, m):
    return m.get('pdf') or (item_id + '.pdf')


def _save_name(title, n=None):
    t = re.sub(r'[^A-Za-z0-9]+', '-', title).strip('-')
    return 'Spread-Love-and-Acceptance-' + ('Book-%d-' % n if n else '') + t + '.pdf'


def book_anchor(b):
    """the download page's anchor for one print book: #book-1 ... #book-4"""
    return 'book-%d' % b['n']


def download_html():
    c = config()
    made = built().get('books', {})
    rows = []
    for b in c['books']:
        m = made.get(b['id'], {})
        f = _file(b['id'], m)
        if not os.path.exists(os.path.join(ROOT, 'book', 'print', f)):
            continue
        rows.append(('<li class="bk-dl-book" id="%s" style="--bc:%s">%s<div class="bk-dl-book-body"><p class="bk-dl-book-k">Book %d · %d chapters</p>'
                     '<h3>%s</h3><p class="bk-dl-book-line">%s</p><p class="bk-dl-book-links">'
                     '<a class="bk-dl-file" href="/book/print/%s" data-dl="%s" data-series="%s" data-name="Book %d, %s" download="%s">'
                     '<span class="bk-dl-v">Download Book %d (PDF)</span><span class="bk-dl-m" data-series-meta>%s</span></a> '
                     '<a class="bk-dl-read" href="/book/%s.html">Read it free online</a></p></div></li>') % (
            book_anchor(b), b['color'], cover_img(b['id'], '').replace('class="bk-sb-cover"', 'class="bk-dl-book-cover"'), b['n'], len(b['chapters']),
            esc(b['title']), esc(b['line']), esc(f), esc(b['id']), esc(b['id']), b['n'], esc(b['title']), _save_name(b['title'], b['n']),
            b['n'], _meta(m), b['chapters'][0]))
    free = []
    w = c['workbook']
    m = made.get(w['id'], {})
    if os.path.exists(os.path.join(ROOT, 'book', 'print', _file(w['id'], m))):
        bw = made.get('workbook-bw', {})
        bw_link = ''
        if os.path.exists(os.path.join(ROOT, 'book', 'print', _file('workbook-bw', bw))):
            bw_link = (' <a class="bk-dl-nomail" href="/book/print/%s" data-series="workbook-bw" download="%s"><span class="bk-dl-v">Black and white</span>'
                       '<span class="bk-dl-m" data-series-meta>%s</span></a>') % (esc(_file('workbook-bw', bw)), _save_name(w['title'] + ' Black and White'), _meta(bw))
        free.append(('<li class="bk-dl-book" id="workbook" style="--bc:%s">%s<div class="bk-dl-book-body"><p class="bk-dl-book-k">Workbook · no email needed</p>'
                     '<h3>%s</h3><p class="bk-dl-book-line">Every workpaper in one PDF, on large pages, to print and fill in by hand. Each one is also free to fill in on screen.</p>'
                     '<p class="bk-dl-book-links"><a class="bk-dl-nomail" href="/book/print/%s" data-series="%s" download="%s"><span class="bk-dl-v">Download the workbook (PDF)</span>'
                     '<span class="bk-dl-m" data-series-meta>%s</span></a>%s <a class="bk-dl-read" href="/workpapers/fill/index.html">Fill them in online</a></p></div></li>') % (
            w['color'], cover_img(w['id'], '').replace('class="bk-sb-cover"', 'class="bk-dl-book-cover"'), esc(w['title']), esc(_file(w['id'], m)), esc(w['id']),
            _save_name(w['title']), _meta(m), bw_link))
    try:
        with open(os.path.join(HERE, 'series-extras.json'), encoding='utf-8') as fh:
            pk = json.load(fh)['pocket']
    except (OSError, ValueError, KeyError):
        pk = None
    if pk:
        m = made.get(pk['id'], {})
        if os.path.exists(os.path.join(ROOT, 'book', 'print', _file(pk['id'], m))):
            free.append(('<li class="bk-dl-book" id="pocket" style="--bc:%s">%s<div class="bk-dl-book-body"><p class="bk-dl-book-k">Pocket guide · no email needed</p>'
                         '<h3>%s</h3><p class="bk-dl-book-line">%s</p><p class="bk-dl-book-links"><a class="bk-dl-nomail" href="/book/print/%s" data-series="%s" download="%s">'
                         '<span class="bk-dl-v">Download the pocket guide (PDF)</span><span class="bk-dl-m" data-series-meta>%s</span></a> '
                         '<a class="bk-dl-read" href="/the-logic-behind-it.html">Every situation, free online</a></p></div></li>') % (
                pk['color'], cover_img(pk['id'], '', 768).replace('class="bk-sb-cover"', 'class="bk-dl-book-cover"'), esc(pk['title']), esc(pk['line']),
                esc(_file(pk['id'], m)), esc(pk['id']), _save_name(pk['title']), _meta(m)))
    out = ['%s\n%s' % (DL_START, DL_CSS),
           '<section class="bk-dl-four" aria-labelledby="bk-dl-four-h"><h2 id="bk-dl-four-h">The four books</h2>'
           '<p>The same four short books as the paperbacks, page for page, as PDFs to read on a phone, tablet or computer, or to print. '
           'Each chapter is the short version, with a code to scan for the full one.</p>'
           '<ul class="bk-dl-books no-bubble" data-no-bubble>%s</ul></section>' % '\n'.join(rows)]
    if free:
        out.append('<section class="bk-dl-free" aria-labelledby="bk-dl-free-h"><h2 id="bk-dl-free-h">Free to download, no email needed</h2>'
                   '<p class="bk-dl-free-note">%s</p><ul class="bk-dl-books no-bubble" data-no-bubble>%s</ul></section>' % (FREE_LINE, '\n'.join(free)))
    out.append(DL_END)
    return '\n'.join(out)


def patch_download(path):
    """Refresh the four books block in book/download.html (between the book-dl-books markers)."""
    try:
        with open(path, encoding='utf-8') as f:
            s = f.read()
    except OSError:
        return False
    if DL_START not in s:
        return False
    s2 = re.sub(re.escape(DL_START) + r'.*?' + re.escape(DL_END), lambda m: download_html(), s, flags=re.S)
    if s2 != s:
        with open(path, 'w', encoding='utf-8') as f:
            f.write(s2)
    return True
