#!/usr/bin/env python3
"""build_series.py: the print series of the book (print12). Its name is series_title in tools/book/series.json.

A series of short colour books for print on demand (6 x 9 in, KDP "regular" trim, standard colour, white
paper), plus a separate workbook (8.5 x 11 in) with every workpaper in fill-in form. The books are made from the
SHORT chapter versions; every chapter ends with a "Go deeper (free online)" line and a QR code to its full
version. The series is set in tools/book/series.json (which chapters go in which book, titles, colours, back-cover
words, ISBNs once bought).

Run from the repo root:
    python3 tools/book/build_series.py                 the books' print pages, covers and the series on /book/
    python3 -m http.server 8142 --bind 127.0.0.1 &
    BOOK_SERIES=1 NODE_PATH=$(npm root -g) node tools/book/build_pdfs.js 8142     (all of them; or name some ids)
    python3 tools/book/build_series.py                 again: puts the page counts on /book/
    python3 tools/book/build_series.py --measure       (optional) one long book of every short chapter, to see how
                                                       many 6 x 9 pages each chapter takes (then BOOK_SERIES=1
                                                       ... build_pdfs.js 8142 measure)

It writes (and nothing else; the online book and book/pdf/ are left as they are):
  book/print/src/<book id>.html, workbook.html   the print pages build_pdfs.js prints (noindex; print only)
  book/print/src/cover-<id>.html                 the full-wrap covers (back, spine, front)
  book/print/src/series-src.json                 the print jobs and the cost model for build_pdfs.js
  book/index.html                                the series block between <!-- book-series:start/end -->
build_pdfs.js (BOOK_SERIES=1) then writes book/print/<id>.pdf, workbook.pdf, cover-<id>.pdf,
cover-<id>-front.jpg (and -front-small.jpg) and book/print/series.json (pages, spine widths, costs).

It imports tools/book/build_book.py for the chapter pages, the cleaning, the page-number slots and the end-of-
chapter parts, so the print series always matches the online book. Importing build_book writes nothing.
"""
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_book as B  # noqa: E402
import book_art  # noqa: E402
import front_back  # noqa: E402
import hints  # noqa: E402
import series_site  # noqa: E402
import series_text as ST  # noqa: E402  (printfix13: series cross-references, print-only wording, checks)

# printfix13: in the series the afterword looks back over four books, and its short name (running heads, contents) says so
for _slug, _t in ST.TEXT.get('titles', {}).items():
    if _slug in B.SHORT:
        B.SHORT[_slug] = _t

ROOT = B.ROOT
OUT = os.path.join(ROOT, 'book', 'print')
SRC = os.path.join(OUT, 'src')
CFG = series_site.config()
SERIES_TITLE = CFG['series_title']  # the one name of the series (tools/book/series.json)
SITE = B.SITE
esc = B.esc
mark = B.mark
pg = B.pg

# KDP's paper thickness for standard colour (white paper): 0.002252 in a page (KDP help, "Paperback cover
# calculator / spine width": kdp.amazon.com/help/topic/G201953020). The same factor for the 8.5 x 11 workbook.
PAPER_IN = 0.002252
# column widths in CSS pixels (96 a inch), for build_pdfs.js's "wider than the text column" check
COL_PX = {'book': round((6 - 0.75 - 0.5) * 96), 'workbook': round((8.5 - 0.75 - 0.5) * 96), 'pocket': round((5 - 15 / 25.4 - 11 / 25.4) * 96)}

# printing cost and royalty on Amazon (US, looked up October 2026). logicbook14: the owner sells on Amazon only, so the
# cost model has Amazon's own channel and nothing else. KDP pays 60% at a list price of $9.99 and up and 50% below it
# (since 10 June 2025), minus printing.
COSTS = {
    'kdp': {'fixed': 1.00, 'per_page': 0.0255, 'royalty': 0.60, 'royalty_low': 0.50, 'threshold': 9.99, 'expanded': 0.40,
            'note': 'KDP Amazon.com, standard colour, regular trim (72-600 pages): $1.00 + $0.0255 a page; royalty 60% at $9.99 and up, 50% below, minus printing; 40% in expanded distribution (not used)'},
    'kdp_large': {'fixed': 1.00, 'per_page': 0.0402, 'royalty': 0.60, 'royalty_low': 0.50, 'threshold': 9.99, 'expanded': 0.40,
                  'note': 'KDP Amazon.com, standard colour, large trim (8.5 x 11): $1.00 + $0.0402 a page'},
}

# logicbook14: "Another way to see it" boxes (tools/book/logic-boxes.json), the pocket guide and the box set
# (tools/book/series-extras.json, tools/book/pocket.py)
LOGIC = json.load(open(os.path.join(HERE, 'logic-boxes.json'), encoding='utf-8'))
EXTRAS = json.load(open(os.path.join(HERE, 'series-extras.json'), encoding='utf-8'))
POCKET = EXTRAS['pocket']
BOXSET = EXTRAS['boxset']
LOGIC_PAGE = '/the-logic-behind-it.html'

SERIES_CSS = '/book/print/print.css'
WB_CSS = '/book/print/workbook.css'


def books():
    return CFG['books']


def where_map():
    """chapter slug -> the book it is in"""
    out = {}
    for b in books():
        for s in b['chapters']:
            out[s] = b
    return out


def check_config():
    seen, warn = {}, []
    for b in books():
        for s in b['chapters']:
            if s not in B.SLUGS:
                warn.append('series: %s is not a chapter' % s)
            if s in seen:
                warn.append('series: %s is in book %d and book %d' % (s, seen[s], b['n']))
            seen[s] = b['n']
    for e in B.ORDER:
        if e[0] not in seen:
            warn.append('series: %s is in no book' % e[0])
    return warn


# ---------- QR codes: every one is checked against a real page (and its #id) ----------
QRS = []


STUB_RE = re.compile(r'<meta http-equiv="refresh" content="\d+;\s*url=([^"]+)"', re.I)


def unstub(url):
    """printfix13: a code never opens a page that only forwards to another one: follow the forward"""
    p = re.sub(r'^https://spreadloveandacceptance\.com', '', url)
    if not p.startswith('/'):
        return url
    path = p.split('#')[0].split('?')[0]
    f = os.path.join(ROOT, path.lstrip('/'))
    if os.path.isfile(f) and f.endswith('.html'):
        m = STUB_RE.search(B.read(f)[:4000])
        if m:
            return (SITE if url.startswith('http') else '') + m.group(1)
    return url


def qr(url):
    url = unstub(url)
    QRS.append(url)
    return B.qr_slot(url)


def check_qrs():
    bad = []
    for u in sorted(set(QRS)):
        p = re.sub(r'^https://spreadloveandacceptance\.com', '', B.absolute(u))
        if p.startswith('http'):
            bad.append('QR to another site: ' + u)
            continue
        path, _, frag = p.partition('#')
        path = path.split('?')[0]
        f = os.path.join(ROOT, path.lstrip('/'))
        if path.endswith('/'):
            f = os.path.join(f, 'index.html')
        elif not os.path.splitext(f)[1]:
            f += '.html'
        if not os.path.exists(f):
            bad.append('QR to a missing page: ' + u)
        elif frag and not re.search(r'\bid="%s"' % re.escape(frag), B.read(f)):
            bad.append('QR to a missing #%s: %s' % (frag, u))
        elif STUB_RE.search(B.read(f)[:4000]):
            bad.append('QR to a page that only forwards: ' + u)
    return bad


# ---------- one chapter, as the print series sets it ----------
def chapter_label(slug, book):
    """('3', 'Chapter 3') for a chapter in a book of the series; ('', 'Afterword') for the afterword"""
    if slug == 'afterword':
        return '', 'Afterword'
    k = [s for s in book['chapters'] if s != 'afterword'].index(slug) + 1
    return str(k), 'Chapter %d' % k


def online_name(slug):
    return B.chapter_name(B.entry(slug))


def lede(slug):
    """the chapter's opening line; series-text.json "ledes" has the print wording where the online one names the online book"""
    return ST.TEXT.get('ledes', {}).get(slug) or B.LEDES[slug]


def ch_title(slug):
    return ST.TEXT.get('titles', {}).get(slug) or B.TITLES[slug]


def summary_at_end(slug):
    """printfix13: a chapter keeps either its "In short" box at the top or "What to remember" at the end, never both.
    series.json "summary_at_end" lists the chapters that keep the end version."""
    return slug in CFG.get('summary_at_end', [])


def override(slug):
    """a print-only version of a whole chapter body (series-<slug>.html, such as the series afterword), or None"""
    f = os.path.join(HERE, 'series-%s.html' % slug)
    return B.read(f) if os.path.exists(f) else None


def s_open(e, book):
    hs = B.headings(e[0], False)
    ov = override(e[0])
    if ov:
        hs = [(m.group(1), B.strip_tags(m.group(2)).strip().rstrip('.')) for m in re.finditer(r'<h2 id="([^"]+)">(.*?)</h2>', ov, re.S)]
    lis = ''.join('<li>%s</li>' % ('<a href="#%s--%s">%s</a>' % (e[0], i, esc(t)) if i else esc(t)) for i, t in hs)
    num, lab = chapter_label(e[0], book)
    kicker = 'Book %d · %s' % (book['n'], lab)
    return ('<header class="ch-open no-bubble no-cheer no-dive" data-no-bubble>%s<p class="ch-num" aria-hidden="true">%s</p>'
            '<p class="ch-kicker">%s</p>'
            '<h2 class="ch-title">%s</h2><p class="ch-intro">%s</p>'
            '<div class="ch-in"><p class="ch-in-k">In this chapter</p><ol class="ch-in-list">%s</ol></div></header>') % (
        mark(e[0]), esc(num), esc(kicker), esc(ch_title(e[0])), lede(e[0]), lis)


def s_end(e, book, here, where, remember=None):
    s = '<aside class="pe-end no-bubble no-cheer no-dive" data-no-bubble aria-label="End of chapter">'
    if remember:
        s += '<div class="pe-end-rem"><h3 class="pe-end-k">What to remember</h3>%s</div>' % remember
    links = B.CONNECT.get(e[0], [])
    if links:
        s += '<div class="pe-end-links"><h3 class="pe-end-k">This connects to</h3><ul class="pe-end-conn">'
        for tgt, w in links:
            online = B.absolute(B.href(tgt))
            if tgt in here:
                lab = '<a href="#%s">%s</a>' % (tgt, chapter_label(tgt, book)[1])
                at = '<a href="#%s">page %s</a>' % (tgt, pg(tgt))
            elif tgt in where:
                ob = where[tgt]
                lab = '<a href="%s">Book %d, %s</a>' % (online, ob['n'], chapter_label(tgt, ob)[1])
                op = ST.PAGEMAPS.get(ob['id'], {}).get(tgt)
                at = '<a href="%s">%s%s</a>' % (online, esc(ob['title']), ('<span class="pe-only">, page %d</span>' % op) if op else '')
            else:
                lab = '<a href="%s">Online</a>' % online
                at = '<a href="%s">read online</a>' % online
            s += '<li><span class="pe-conn-l">%s · %s</span><span class="pe-conn-w">%s</span><span class="pe-conn-p">%s</span></li>' % (
                lab, esc(B.SHORT[tgt]), esc(w[0].upper() + w[1:]), at)
        s += '</ul></div>'
    s += '<div class="pe-end-use"><h3 class="pe-end-k">Put it to use</h3><ul class="pe-use">'
    for t, u, d in B.uses(e[0]):
        if re.match(r'^/book/', u):
            continue  # a chapter of the series: the connections above name it with its book and page
        u = unstub(u)
        form = free_form(u)
        if form:
            u, d = form, 'Workpaper · free to print' + ((': ' + d) if d else '')
        s += '<li>%s<span class="pe-use-t"><a href="%s">%s</a>%s<span class="pe-use-u">%s</span></span></li>' % (
            qr(u), B.absolute(u), esc(t), ('<span class="pe-use-d">%s</span>' % esc(d)) if d else '', B.addr_html(B.short_address(u)))
    s += '</ul></div>'
    deep = B.href(e[0], True)
    s += ('<div class="ps-deeper">%s<p><strong>Go deeper (free online)</strong> The full chapter, with the research, more examples and more '
          'to try: <a href="%s"><span class="ps-addr">%s</span></a></p></div>') % (qr(deep), B.absolute(deep), B.addr_html(B.short_address(deep)))
    s += '</aside>'
    return s


FILL_RE = re.compile(r'(?:^|/)wp-(\d\d)(?=[-.#?]|$)')


def free_form(url):
    """the free printable form on the site for a workpaper link (/workpapers/fill/wp-NN.html), or None"""
    path = re.sub(r'^https://spreadloveandacceptance\.com', '', url).split('#')[0].split('?')[0]
    m = FILL_RE.search(path)
    if not m or '/fill/' in path:
        return None
    f = '/workpapers/fill/wp-%s.html' % m.group(1)
    return f if os.path.exists(os.path.join(ROOT, f.lstrip('/'))) else None


WP_LINE_RE = re.compile(r'<p class="bh-ref bh-wp"><span class="bh-k">([^<]*)</span><span class="bh-c">: </span><a href="([^"]+)"[^>]*>(.*?)</a><span class="bh-u">.*?</span></p>', re.S)


def wp_lines(body, with_qr=True):
    """Owner's rule: the books never reproduce a workpaper. Each one is named on one short line, "Workpaper: name ·
    free to print", with a QR code to its free printable form on the site."""
    def sub(m):
        form = free_form(m.group(2)) or m.group(2)
        return ('<div class="bh-ref bh-wp ps-wp">%s<p><span class="bh-k">%s</span><span class="bh-c">: </span><a href="%s">%s</a> · free to print'
                '<span class="bh-u"> %s</span></p></div>') % (qr(form) if with_qr else '', m.group(1), B.absolute(form), m.group(3), B.addr_html(B.short_address(form)))
    return WP_LINE_RE.sub(sub, body)


IN_SHORT_RE = re.compile(r'<div class="try-this" data-in-short>(.*?)</div>', re.S)
MADE_UP_RE = re.compile(r'\s*(?:A made-up example\. Names and details are invented\.|Made-up example\.)\s*')
ERRORS = []


def namer_for(book):
    return ST.Namer(book, books(), pg)


def classify(path, text):
    """(where the code goes, its label) for a link to the website: a workpaper's free printable form, a tool (its
    registry name), or a page"""
    k = hints._match(path)
    path = unstub(path)
    if k and k[0] == 'wp':
        w = hints.WP[k[1]]
        return free_form(path) or path, '<b>Workpaper %s</b> · free to print<br>%s' % (esc(w['code']), esc(w['name']))
    if k and k[0] == 'tool':
        return path, '<b>Tool</b><br>%s' % esc(hints.TL[k[1]]['name'])
    return path, '<b>Online</b><br>%s' % esc(text[:60])


SCAN_COUNT = {}


def logic_boxes(slug):
    return [b for b in LOGIC['boxes'] if b['slug'] == slug]


def logic_box(b):
    """logicbook14: one "Another way to see it" box: a situation from /the-logic-behind-it.html in the lens's six parts,
    ending with a code to it online (print) or a link (ebook: the code goes and the link stays)"""
    import pocket
    lab = LOGIC['labels']
    url = '%s?item=%s#find' % (LOGIC_PAGE, b['id'])
    row = lambda k, v, cls='': '<p class="lg-row%s"><span class="lg-l">%s</span> %s</p>' % (cls, esc(lab[k]), v)
    steps = '<span class="lg-arr" aria-hidden="true"> → </span>'.join('<span class="lg-step">%s</span>' % esc(x) for x in b['logic'])
    s = '<aside class="lg-box no-bubble no-cheer no-dive" data-no-bubble aria-label="%s" id="lg-%s">' % (esc(LOGIC['kicker']), b['id'])
    s += '<p class="lg-box-k">%s<span>%s</span></p><p class="lg-box-t">%s</p>' % (pocket.puzzle_svg(), esc(LOGIC['kicker']), esc(b['title']))
    s += row('looks', esc(b['looks'])) + row('logic', steps, ' lg-logic') + row('like', esc(b['like'])) + row('fits', esc(b['fits']))
    s += row('other', esc(b['other'])) + row('say', '<em>%s</em>' % esc(b['say']), ' lg-say') + row('step', esc(b['step']))
    s += ('<div class="lg-box-end">%s<p>More situations like this one, each in the same six parts, are free online. '
          '<a href="%s%s"><span class="ps-addr">%s</span></a></p></div></aside>') % (
        qr(url), SITE, esc(url), B.addr_html(pocket.item_addr(b['id'])).replace('?', '?<wbr>'))
    return s


LOGIC_BEFORE = re.compile(r'<h[234]\b[^>]*\bid="(?:[a-z0-9-]+--)?(?:everyday|all-relationships|mix-ups)"')


def add_logic_boxes(body, slug):
    """each box goes before the chapter's "In everyday life" (or "You, in all your relationships", or "Common mix-ups"),
    or at the end of the chapter when it has none of them"""
    boxes = logic_boxes(slug)
    if not boxes:
        return body
    h = ''.join(logic_box(b) for b in boxes)
    m = LOGIC_BEFORE.search(body)
    return (body[:m.start()] + h + body[m.start():]) if m else body + h


def s_chapter(e, book, here, where, namer=None, panels=False):
    """one chapter as the series prints it; panels=True adds the "Scan to open" codes (print only; the ebooks keep links)"""
    slug = e[0]
    namer = namer or namer_for(book)
    src = override(slug) or B.main_inner(B.PAGES[(slug, False)])
    body = B.clean_for_whole(src, slug, False, here)
    body = B.drop_element(body, r'<header class="read-head', 'header')
    body = re.sub(r'<p class="simple-lede">.*?</p>', '', body, count=1, flags=re.S)
    body, errs = ST.apply_swaps(body, slug, pg, lambda s_: namer.label(s_) or s_)
    ERRORS.extend(errs)
    body = ST.drop_sections(body, B)
    body = ST.drop_nav_rows(body)
    body = ST.series_links(body, slug, namer, B.XREFS.add)
    body = B.print_links(body, slug, here)
    body = B.tag_boxes(B.demote(body))
    body = wp_lines(body, with_qr=not panels)
    if panels:
        body = ST.strip_inline_addresses(body)
        body, n = ST.scan_panels(body, qr, classify, B.short_address, B.addr_html, esc)
        SCAN_COUNT[(book['id'], slug)] = n
    body = add_logic_boxes(body, slug)
    if not CFG.get('examples', True):
        body = re.sub(r'<div class="book-ex-wrap.*?</figure>\s*</div>', '', body, flags=re.S)
    # the made-up note is said once, at the front of the book (copyright page and "About this book")
    body = re.sub(r'<p class="bk-ex-note">(.*?)</p>', lambda m: (lambda t: ('<p class="bk-ex-note">%s</p>' % t) if t.strip() else '')(MADE_UP_RE.sub('', m.group(1))), body, flags=re.S)
    # "In short" at the top, or "What to remember" at the end: never both
    m = IN_SHORT_RE.search(body)
    remember = None
    if m and summary_at_end(slug):
        items = re.findall(r'<li>(.*?)</li>', m.group(1), re.S)
        remember = '<ul class="pe-end-list">%s</ul>' % ''.join('<li>%s</li>' % re.sub(r'</?a\b[^>]*>|<span class="pe-only[^"]*">.*?</span>', '', x).strip() for x in items[:5])
        body = body[:m.start()] + body[m.end():]
    elif not m:
        remember = B.remember_html(slug, 'pe-end-list')
    art = '<article class="whole-ch pe-ch" id="%s" data-part="%d" style="--pc:%s;--pt:%s">%s\n<div class="pe-body">%s</div>\n%s</article>' % (
        slug, e[1], book['color'], book['tint'], s_open(e, book), body, s_end(e, book, here, where, remember))
    # printfix13: the chapter's own contents list names only the parts this book prints
    return re.sub(r'<li><a href="#([^"]+)">[^<]*</a></li>', lambda m: m.group(0) if (not m.group(1).startswith(slug + '--') or ('id="%s"' % m.group(1)) in art) else '', art)


# ---------- front and back of each book ----------
def title_page(book):
    return ('<section class="ps-title pe-only" style="--acc:%s">%s<div class="ps-title-top"><p class="ps-title-k">%s · Book %s</p>'
            '<p class="ps-title-t">%s</p><p class="ps-title-s">%s</p></div><div class="ps-title-art">%s</div>'
            '<div class="ps-title-by"><p class="ps-title-a">by %s</p><p class="ps-title-p">Christian’s Lab<br>spreadloveandacceptance.com</p></div></section>') % (
        book['color'], mark('titlep'), esc(SERIES_TITLE), book['n'], esc(book['title']), esc(book['sub']),
        series_site.art(book['art']), B.AUTHOR)


def copyright_page(book, workbook=False):
    # printfix13: the ISBN line is always there; until the owner buys ISBNs it carries the placeholder from series.json
    isbn = '<p>ISBN: %s (paperback)</p>' % esc(book.get('isbn') or CFG.get('isbn_placeholder', '[to be added]'))
    what = 'this workbook' if workbook else 'this book'
    s = '<section class="ps-copy pe-only"><div class="ps-copy-in">'
    s += '<p><em>%s</em>%s: <em>%s</em>.<br>By %s. Published by %s, spreadloveandacceptance.com.</p>' % (
        esc(SERIES_TITLE), (', Book %d' % book['n']) if not workbook else '', esc(book['title']), B.AUTHOR, esc(CFG.get('publisher', "Christian's Lab").replace("'", '’')))
    s += '<p>Text and pictures © 2026 %s. First print edition, %s. Printed on demand.</p>%s' % (B.AUTHOR, B.UPDATED, isbn)
    s += ('<p><strong>Free online, always.</strong> Every chapter of the series is free to read at spreadloveandacceptance.com/book, in a short and a '
          'full version, with no account and no paid version. The print books are optional. You may copy pages of %s for personal use and '
          'for non-commercial teaching, with credit to “%s, spreadloveandacceptance.com”.</p>') % (what, esc(SERIES_TITLE))
    s += ('<p><strong>Not therapy.</strong> This book is general education about people and relationships. It is not a diagnosis, treatment or a '
          'replacement for help from a doctor, counsellor or other trained professional, and it can’t know your situation.</p>')
    s += ('<p><strong>If you are not safe.</strong> If you feel afraid of someone you live with, or someone controls your money, phone or movements, '
          'that is not a problem to fix with a worksheet. <a href="%s/safety.html">spreadloveandacceptance.com/safety</a> lists free, private help. '
          'If you are in danger now, call your local emergency number.</p>') % SITE
    s += '<p><strong>The examples are made up.</strong> %s None of them is a testimonial.</p>' % esc(MADE_UP)
    if not workbook:
        s += ('<p>The research the chapters mention is listed in short at the back. The full list, with what each study found and links, is at '
              '<a href="%s/research.html">spreadloveandacceptance.com/research</a>.</p>') % SITE
    s += '<p>Set in Lora, Fraunces and IBM Plex Mono.</p></div></section>'
    return s


MADE_UP = 'The people in this book’s examples are made up; any likeness to real people is coincidence.'


def meet_page(book, found=()):
    """"Workpapers, tools and three friends", on one page. Its two samples are a workpaper and a tool this book uses."""
    wb = CFG['workbook']['title']
    wp = next((hints.WP[k] for (kind, k) in found if kind == 'wp' and k in hints.WP), hints.WP.get('wp03'))
    tl = next((hints.TL[k] for (kind, k) in found if kind == 'tool' and k in hints.TL), None)
    s = '<section class="ps-meet pe-only" id="meet">%s<h1>Workpapers, tools and three friends</h1>' % mark('meet')
    s += ('<div class="ps-meet-kinds"><p>%s <strong>A workpaper</strong> is a page you fill in, on your own or together, such as “%s: %s”. '
          'Every workpaper is free to print or to fill in on the website, and the book gives a code to scan for each one. '
          '<em>%s</em> has them all in one place, on big pages.</p>'
          '<p>%s <strong>A tool</strong> is a helper you use on the website%s. You use it and it gives you something back.</p>'
          '<p class="ps-meet-note">Workpapers and tools are kept in separate lists. Both are free and need no account, and what you '
          'type stays on your own device.</p></div>') % (
        hints.tag('wp', wp), esc(hints.wp_label(wp)), esc(wp['name']), esc(wb), hints.tag('tool'),
        (', such as “Tool: %s”' % esc(tl['name'])) if tl else '')
    s += '<p class="ps-meet-h">Three friends who give hints</p><ul class="bh-friends ps-friends">'
    s += '<li><span class="bh-badge" aria-hidden="true">%s</span><span><strong>Professor Puddles</strong>, the cheerful raindrop professor, gives most of the hints.</span></li>' % hints.SVG_PUDDLES
    s += '<li><span class="bh-badge" aria-hidden="true">%s</span><span><strong>Tidbit</strong>, the quick, curious pup, bounds in with a playful tip.</span></li>' % hints.SVG_TIDBIT
    s += '<li><span class="bh-badge" aria-hidden="true">%s</span><span><strong>Sugarfoot</strong>, the steady, gentle pup, turns up with a calm, slow tip.</span></li>' % hints.SVG_SUGARFOOT
    s += '</ul><p class="ps-meet-note">They keep to the lighter pages. Where a chapter talks about crisis, deep grief or being hurt, the pages stay quiet and plain.</p></section>'
    return s


CALLOUT_RES = [
    re.compile(r'<(?:p|div) class="bh-ref[^"]*"[^>]*>.*?</(?:p|div)>', re.S),                 # hint callouts and "Workpaper WP-NN" lines
    re.compile(r'<ul class="kind-list kind-(?:workpaper|tool)">.*?</ul>', re.S),              # the chapter's own Workpapers / Tools lists
    re.compile(r'<ul class="pe-use">.*?</ul>', re.S),                                          # "Put it to use"
]


def printed_mentions(articles):
    """{('wp'|'tool', key): [slug, ...]} from the WORKPAPER and TOOL callouts each printed chapter really shows (printfix13:
    not from every link on the page, which credited chapters with tools they never name)."""
    out = {}
    for slug, art in articles:
        for rx in CALLOUT_RES:
            for blk in rx.findall(art):
                for h in re.findall(r'<a\b[^>]*\bhref="([^"]+)"', blk):
                    k = hints._match(re.sub(r'^https://spreadloveandacceptance\.com', '', h))
                    if k and slug not in out.setdefault(k, []):
                        out[k].append(slug)
    return out


def about_page(book, namer):
    """printfix13: "About this book, and how to use it", one page before Chapter 1: what the book is for and who it is for,
    how its chapters sit beside the other books and the free online versions, and the five big ideas."""
    ab = ST.TEXT['about']
    mine = ab['books'][str(book['n'])]
    s = '<section class="ps-about pe-only" id="about" style="--pc:%s">%s<h1>About this book, and how to use it</h1>' % (book['color'], mark('about'))
    s += '<p class="ps-about-lede">%s</p><p>%s</p>' % (mine['what'], mine['who'])
    s += '<p>%s</p>' % ab['how']
    rows = ''
    for slug in book['chapters']:
        num, lab = chapter_label(slug, book)
        tail = B.short_address(B.href(slug)).split('/book/', 1)[-1]
        rows += '<tr><td>%s</td><td>%s</td><td><span class="ps-addr ps-about-u" data-full="%s">…/book/%s</span></td></tr>' % (
            esc(lab), esc(B.SHORT[slug]), esc(B.short_address(B.href(slug))), esc(tail))
    s += ('<table class="ps-about-t"><thead><tr><th scope="col">Here</th><th scope="col">About</th><th scope="col">Free online at spreadloveandacceptance.com/book</th></tr></thead>'
          '<tbody>%s</tbody></table>') % rows
    others = '; '.join('%s, <em>%s</em>, %s' % ('Book %d' % b['n'], esc(b['title']), esc(ab['others'][str(b['n'])]))
                       for b in books() if b is not book)
    # a real example of a reference to another book: its first chapter and the page it starts on
    eb = next(b for b in books() if b['n'] == (2 if book['n'] != 2 else 1))
    epage = namer.other_page(eb['chapters'][0])
    example = 'Book %d, Chapter 1%s' % (eb['n'], (' (page %s)' % epage) if epage else '')
    s += '<p>%s %s. %s.</p>' % (ab['series_lead'], others, ab['refs'].replace('{example}', example))
    s += '<p class="ps-about-h">Five big ideas</p><p class="ps-about-small">%s</p><ul class="ps-about-ideas">%s</ul>' % (
        ab['ideas_lead'], ''.join('<li><strong>%s.</strong> %s</li>' % (esc(t), d) for t, d in ab['ideas']))
    s += '<p class="ps-about-small">%s %s</p></section>' % (ab['program'], esc(MADE_UP))
    return s


def help_now(here, namer=None):
    ctx = front_back.Ctx('series', False, (1, 2, 3), here, B.PAGES, pg, mark, lambda s_: B.chapter_name(B.entry(s_)), B.SHORT, SITE, B.XREFS.add,
                         series_ref=namer.ref if namer else None)
    for x in front_back.front_sections(ctx):
        if x['key'] == 'help-now':
            return x['html'], x['toc']
    return '', ''


def research_short(book, here):
    notes = B.research_notes(here)
    # logicbook14: the studies an "Another way to see it" box leans on join its chapter's notes
    import pocket
    R = pocket.refs_index()
    for slug in book['chapters']:
        for bx in logic_boxes(slug):
            for rid in bx.get('refs', []):
                have = notes.setdefault(slug, {})
                if rid in R and not any((r.get('title') or '').strip().lower() == (R[rid].get('title') or '').strip().lower() for r in have.values()):
                    have[rid] = R[rid]
    n = sum(len(v) for v in notes.values())
    s = '<section class="pe-back ps-notes no-bubble no-cheer no-dive" data-no-bubble id="notes" style="--pc:%s;--pt:%s">%s<h1 class="pe-back-h">Research notes</h1>' % (
        book['color'], book['tint'], mark('notes'))
    s += ('<div class="ps-online-box">%s<p>The %d studies and books these chapters mention, in short. Each one was looked up and checked. The full list, '
          'with what each study found, how strong the finding is and where to read it, is free online: '
          '<span class="ps-addr">spreadloveandacceptance.com/research</span>.</p></div>') % (qr('/research.html'), n)
    for slug in book['chapters']:
        if slug not in notes:
            continue
        rs = sorted(notes[slug].values(), key=lambda r: (r.get('authors', '').lower(), str(r.get('year', ''))))
        items = []
        for r in rs:
            t = (r.get('title', '') or '').strip()
            t = t if re.search(r'[.?!]$', t) else t + '.'
            items.append('<li><span class="pe-ref-a">%s (%s).</span> <span class="pe-ref-t">%s</span></li>' % (
                esc(r.get('authors', '')), esc(str(r.get('year_label') or r.get('year') or 'n.d.')), esc(t)))
        s += '<h2 class="pe-notes-h"><span>%s</span> %s</h2><ul class="pe-refs ps-refs">%s</ul>' % (
            esc(chapter_label(slug, book)[1]), esc(B.SHORT[slug]), ''.join(items))
    return s + '</section>'


def glossary_short(book, chs, printed=None):
    """the book's own words, from the glossary, for the words its chapters use (printfix13: as printed, so words that only
    appear online don't make the list)"""
    text = ST.printed_text(printed) if printed else ' '.join(B.strip_tags(B.main_inner(B.PAGES[(s_, False)])) for s_ in chs)
    s = ('<section class="pe-back pe-gloss ps-gloss no-bubble no-cheer no-dive" data-no-bubble id="glossary" style="--pc:%s;--pt:%s">%s'
         '<h1 class="pe-back-h">Words used in this book</h1><p class="pe-back-lede">The book’s own words, each in one plain sentence. All of them are at '
         'spreadloveandacceptance.com/glossary.</p><dl class="pe-gloss-list">') % (book['color'], book['tint'], mark('glossary'))
    for gid, nm, d, ex, _w in B.glossary_terms(text):
        s += '<div class="pe-gl"><dt id="gl-%s">%s</dt><dd>%s</dd></div>' % (gid, esc(nm), d)
    return s + '</dl></section>'


def notes_pages(book, n=2):
    """two lined pages for the reader's own notes"""
    s = ('<section class="pe-back ps-jot no-bubble" data-no-bubble id="jot" style="--pc:%s">%s<h1 class="pe-back-h">Your notes</h1>'
         '<p class="pe-back-lede">For what you want to remember, try or ask about.</p><div class="ps-lines">%s</div></section>') % (book['color'], mark('jot'), '<div></div>' * 19)
    s += ''.join('<section class="pe-back ps-jot ps-jot-more no-bubble" data-no-bubble><div class="ps-lines">%s</div></section>' % ('<div></div>' * 22) for _ in range(n - 1))
    return s


def series_items():
    """every book of the series in print, in order: the four books, the workbook, the pocket guide (logicbook14)"""
    return books() + [CFG['workbook'], POCKET]


def logic_free_page(book, epub=False):
    """logicbook14: one short page near the end of each book: the free situations online, and the pocket guide"""
    n = len(POCKET['items'])
    words = ('<p class="pe-back-lede">The “Another way to see it” boxes in this book come from a free page on the website. It has more than seventy everyday '
             'reactions that can look odd, rude or over the top from outside, each laid out in the same six parts, with the other person’s side and one small step.</p>'
             '<p>You can type what happened in your own words and see the closest situations, pick another picture when the first doesn’t click, and build a card of '
             'your own. It is free, with no account, and what you type stays on your device.</p>'
             '<p>The pocket guide in this series, <em>%s</em>, collects %d of them in print, one to a page.</p>') % (esc(POCKET['title']), n)
    if epub:
        return ('<section class="pe-back ps-logic" id="logic"><h1 class="pe-back-h">The Logic Behind It: more examples, free online</h1>%s'
                '<p><a href="%s%s">spreadloveandacceptance.com/the-logic-behind-it</a></p></section>') % (words, SITE, LOGIC_PAGE)
    return ('<section class="pe-back ps-logic no-bubble" data-no-bubble id="logic" style="--pc:%s;--pt:%s">%s<p class="lg-box-k">%s<span>Free online</span></p>'
            '<h1 class="pe-back-h">The Logic Behind It: more examples, free online</h1>%s'
            '<div class="ps-logic-code">%s<p><strong>Scan to open</strong>Or type the address.<span class="ps-addr">spreadloveandacceptance.com/the-logic-behind-it</span></p></div>'
            '</section>') % (book['color'], book['tint'], mark('logic'), __import__('pocket').puzzle_svg(), words, qr(LOGIC_PAGE))


def series_page(book):
    s = '<section class="pe-back ps-series no-bubble" data-no-bubble id="series" style="--pc:%s">%s<h1 class="pe-back-h">The series</h1>' % (book['color'], mark('series'))
    s += '<p class="pe-back-lede">%s is a series of short books. Each one stands on its own; read them in any order.</p><ol class="ps-series-list">' % esc(SERIES_TITLE)
    for b in series_items():
        this = b.get('id') == book.get('id')
        k = ('Book %d' % b['n']) if b.get('n') else ('Pocket guide' if b.get('id') == POCKET['id'] else 'Workbook')
        s += '<li class="%s" style="--bc:%s"><span class="ps-series-k">%s</span><span class="ps-series-t"><strong>%s</strong>%s<span class="ps-series-l">%s</span></span></li>' % (
            'is-this' if this else '', b['color'], k, esc(b['title']), ' <em>(this book)</em>' if this else '', esc(b['line']))
    s += '</ol><p class="ps-series-note">The print books are optional; everything stays free online at spreadloveandacceptance.com/book.</p></section>'
    return s


FREE_LINKS = [
    ('/book/', 'The whole book, free', 'Every chapter, in a short and a full version. Read it, search it, or download a free PDF.'),
    ('/research.html', 'All the research', 'Every study the book mentions, what it found, how strong it is, and links.'),
    ('/glossary.html', 'Words used in the book', 'Each of the book’s own words, in one plain sentence.'),
    ('/workpapers/fill/index.html', 'Fill in the workpapers', 'Every workpaper on screen. It does the sums, and what you type stays on your device.'),
]


# ---------- printfix13: questions people ask, and (Book 4) a first month and a job list ----------
def _series_html(h, book, namer, epub, key):
    """links in a back page named the series way; in print every website reference gets its code"""
    if epub:
        h = re.sub(r'\s*\(page \{page:[^}]+\}\)', '', h)
    h = re.sub(r'\{page:([^}]+)\}', lambda m: pg(m.group(1)), h)
    h = ST.series_links(h, key, namer, B.XREFS.add)
    if not epub:
        h, n = ST.scan_panels(h, qr, classify, B.short_address, B.addr_html, esc)
        SCAN_COUNT[(book['id'], key)] = n
    return h


def faq_page(book, namer, epub=False):
    items = ST.TEXT.get('faq', {}).get(str(book['n']))
    if not items:
        return ''
    h = ''.join('<h2 class="ps-faq-q">%s</h2>%s' % (esc(q), a) for q, a in items)
    return ('<section class="pe-back ps-faq no-bubble" data-no-bubble id="faq" style="--pc:%s;--pt:%s">%s<h1 class="pe-back-h">Questions people ask</h1>'
            '<p class="pe-back-lede">%s</p>%s</section>') % (book['color'], book['tint'], mark('faq'), esc(ST.TEXT['faq_lede']),
                                                           _series_html(h, book, namer, epub, 'faq'))


def month_page(book, namer, epub=False):
    m = ST.TEXT.get('first_month')
    if not m or book['n'] != 4:
        return ''
    rows = ''.join('<tr><th scope="row">%s</th><td>%s</td><td>%s</td><td><span class="pe-ws-tick"></span></td></tr>' % (esc(w), d, r) for w, d, r in m['weeks'])
    h = ('<p class="pe-back-lede">%s</p><table class="ps-month-t"><thead><tr><th scope="col">When</th><th scope="col">What to do</th>'
         '<th scope="col">Read more</th><th scope="col">Done</th></tr></thead><tbody>%s</tbody></table>') % (m['lede'], rows)
    return ('<section class="pe-back ps-month no-bubble" data-no-bubble id="month" style="--pc:%s;--pt:%s">%s<h1 class="pe-back-h">%s</h1>%s</section>') % (
        book['color'], book['tint'], mark('month'), esc(m['title']), _series_html(h, book, namer, epub, 'month'))


def jobs_page(book, namer, epub=False):
    j = ST.TEXT.get('jobs')
    if not j or book['n'] != 4:
        return ''
    tick = '' if epub else '<span class="pe-ws-tick"></span>'
    line = '' if epub else '<span class="ps-jobs-o"></span>'
    gs = ''
    for g, jobs in j['groups'] + ([['Your own', [''] * 6]] if not epub else []):
        gs += '<div class="ps-jobs-g"><p class="ps-jobs-h">%s</p><ul class="ps-jobs-l">%s</ul></div>' % (
            esc(g), ''.join('<li>%s<span class="ps-jobs-n">%s</span>%s</li>' % (tick, esc(x), line) for x in jobs))
    head = '' if epub else '<p class="ps-jobs-key"><span class="pe-ws-tick"></span> happens in our home <span class="ps-jobs-o"></span> owner</p>'
    h = '<p class="pe-back-lede">%s</p>' % j['lede']
    return ('<section class="pe-back ps-jobs no-bubble" data-no-bubble id="jobs" style="--pc:%s;--pt:%s">%s<h1 class="pe-back-h">%s</h1>%s%s'
            '<div class="ps-jobs-cols">%s</div></section>') % (
        book['color'], book['tint'], mark('jobs'), esc(j['title']), _series_html(h, book, namer, epub, 'jobs'), head, gs)


def find_page(book, namer, epub=False):
    """printfix13: "Find it fast", one page at the front: what is going on, and the chapter that helps most"""
    rows = ST.TEXT.get('find', {}).get(str(book['n']))
    if not rows:
        return ''
    li = ''
    for sit, slug in rows:
        where = '<a href="#%s">%s · %s</a>' % (slug, esc(namer.label(slug)), esc(B.SHORT[slug]))
        li += '<li><span class="ps-find-s">%s</span><span class="ps-find-w">%s</span>%s</li>' % (
            esc(sit), where, '' if epub else '<span class="ps-find-p">%s</span>' % pg(slug))
    return ('<section class="ps-find pe-only" id="find" style="--pc:%s">%s<h1>Find it fast</h1><p class="ps-find-lede">%s</p>'
            '<ul class="ps-find-l">%s</ul></section>') % (book['color'], mark('find'), esc(ST.TEXT['find_lede']), li)


def words_page(book, epub=False):
    w = ST.TEXT.get('words', {}).get(str(book['n']))
    if not w:
        return ''
    gs = ''.join('<div class="ps-words-g"><p class="ps-words-h">%s</p><ul class="ps-words-l">%s</ul></div>' % (esc(g), ''.join('<li>%s</li>' % esc(x) for x in xs))
                 for g, xs in w['groups'])
    return ('<section class="pe-back ps-words no-bubble" data-no-bubble id="words" style="--pc:%s;--pt:%s">%s<h1 class="pe-back-h">%s</h1>'
            '<p class="pe-back-lede">%s</p>%s</section>') % (book['color'], book['tint'], mark('words'), esc(w['title']), esc(w['lede']), gs)


# ---------- "Free on the website": a two-page showcase (printfix13) ----------
def _icon(kind, c):
    """small line drawings in the book's own style, one per panel"""
    st = 'fill="none" stroke="%s" stroke-width="2.2" stroke-linecap="round" stroke-linejoin="round"' % c
    d = {
        'chat': '<path d="M6 8h22a4 4 0 0 1 4 4v9a4 4 0 0 1-4 4H16l-6 5v-5H6a4 4 0 0 1-4-4v-9a4 4 0 0 1 4-4z" %s/><path d="M36 16h4a4 4 0 0 1 4 4v8a4 4 0 0 1-4 4h-2v4l-5-4h-7" %s/><path d="M9 15h16M9 19h10" %s/>' % (st, st, st),
        'journey': '<circle cx="7" cy="34" r="3" %s/><path d="M10 33c8-2 6-10 14-12s10 4 16-2" %s stroke-dasharray="2 4"/><path d="M40 6v14M40 6h-2M40 6l8 3-8 3" %s/>' % (st, st, st),
        'form': '<rect x="9" y="4" width="28" height="36" rx="3" %s/><path d="M15 13h16M15 19h16M15 25h10" %s/><path d="M15 31l3 3 6-6" %s/>' % (st, st, st),
        'tools': '<circle cx="17" cy="22" r="10" %s/><circle cx="31" cy="22" r="10" %s/>' % (st, st),
        'book': '<path d="M4 10c7-3 13-3 20 1 7-4 13-4 20-1v26c-7-3-13-3-20 1-7-4-13-4-20-1z" %s/><path d="M24 11v26" %s/>' % (st, st),
        'coin': '<circle cx="24" cy="22" r="15" %s/><path d="M24 30c-6-4-9-7-9-10a4 4 0 0 1 9-2 4 4 0 0 1 9 2c0 3-3 6-9 10z" %s/>' % (st, st),
        'garden': '<path d="M24 40V22" %s/><path d="M24 22c-6 0-9-4-9-9 5 0 9 3 9 9zM24 22c6 0 9-4 9-9-5 0-9 3-9 9z" %s/><path d="M38 5a6 6 0 1 0 5 9 5 5 0 0 1-5-9z" %s/><path d="M14 40h20" %s/>' % (st, st, st, st),
        'phone': '<rect x="14" y="3" width="20" height="38" rx="4" %s/><path d="M21 35h6" %s/><path d="M19 15l4 4 7-8" %s/>' % (st, st, st),
        'lock': '<rect x="11" y="19" width="26" height="20" rx="3" %s/><path d="M17 19v-6a7 7 0 0 1 14 0v6" %s/><circle cx="24" cy="29" r="2.5" %s/>' % (st, st, st),
    }[kind]
    return '<svg class="ps-sc-ico" viewBox="0 0 48 44" aria-hidden="true">%s</svg>' % d


SHOWCASE = [
    # (key, title, words, link, art)
    ('ask', 'Ask Professor Puddles', 'Tell a cheerful raindrop professor what’s going on and get kind next steps and words to say. His answers are written in advance, never made up on the spot.', '/ask.html', 'puddles'),
    ('chat', 'The Chat analyzer', 'Check how a text may land before you send it, read one you got, or look at a whole chat to see where it turned.', '/signal-translator.html', 'chat'),
    ('journeys', 'Guided journeys', 'Three to six small steps for what’s going on, from the same argument again to a new blended family.', '/journeys.html', 'journey'),
    ('forms', 'Every workpaper, free to print', 'All the forms in the series, to print or to fill in on screen and save as a PDF on your own device.', '/workpapers/fill/index.html', 'form'),
    ('tools', 'Tools for one person, or for two', 'Every free tool in one place, starting with the ones you can use on your own.', '/tools.html', 'tools'),
    ('deep', 'The full chapters', 'Each chapter in this book has a fuller version online, with more research, more examples and more to try.', '/book/', 'book'),
    ('arcade', 'Tidbit and Sugarfoot’s arcade', 'Six calm classic games, including the Home Run Derby. Play as either pup, and there’s no game over.', '/frequency-journey.html#derby', 'pups'),
    ('coins', 'Kindness Coin Pusher', 'A cosy 3D coin pusher. Every five coins that drop bring a short, useful tip.', '/coin-pusher.html', 'coin'),
    ('garden', 'The Night Garden', 'A calm breathing game. A flower blooms with every slow breath, and there are fireflies to guide and a lily pond to fill.', '/night-garden.html', 'garden'),
    ('app', 'The free app', 'Put it on your phone or computer in a couple of taps. Pages you have opened work offline.', '/install.html', 'phone'),
]


def _sc_art(kind, c):
    if kind == 'puddles':
        return '<span class="ps-sc-badge">%s</span>' % hints.SVG_PUDDLES
    if kind == 'pups':
        return '<span class="ps-sc-badge ps-sc-two">%s%s</span>' % (hints.SVG_TIDBIT, hints.SVG_SUGARFOOT)
    return _icon(kind, c)


def showcase(book, epub=False):
    """"Free on the website": a two-page spread at the back, left page then right page. Every item has its own code in
    print (and a link in the ebook)."""
    c = book['color']
    head = ('<p class="ps-sc-k">Free on the website</p><h1 class="ps-sc-h">Your book has a home online</h1>'
            '<p class="ps-sc-lede">Everything in this book is free at spreadloveandacceptance.com, along with tools that do the sums for you, '
            'guided journeys, a raindrop professor with kind answers and a few cosy games. There is no account and no paid version.</p>')
    home = ('<div class="ps-sc-home">%s<p><strong>Start here</strong>Scan with your phone’s camera to open the home page.'
            '<span class="ps-addr">spreadloveandacceptance.com</span></p></div>') % ('' if epub else qr('/'))

    def panel(item):
        key, t, words, link, artk = item
        q = '' if epub else qr(link)
        t_html = ('<a href="%s%s">%s</a>' % (SITE, link, esc(t))) if epub else esc(t)
        return ('<div class="ps-sc-card ps-sc-%s">%s<div class="ps-sc-txt">%s<p class="ps-sc-t">%s</p><p class="ps-sc-d">%s</p>'
                '</div><p class="ps-addr">%s</p></div>') % (key, q, _sc_art(artk, c) if not epub or artk in ('puddles', 'pups') else '', t_html, esc(words),
                                                            B.addr_html(B.short_address(link)))
    left = ''.join(panel(x) for x in SHOWCASE[:4])
    right = ''.join(panel(x) for x in SHOWCASE[4:])
    promise = ('<div class="ps-sc-promise">%s<p><strong>Everything stays on your device.</strong> No sign-up and no account. What you type in the tools, '
               'the workpapers and the games is kept in your own browser or app, and nothing is sent to us.</p></div>') % ('' if epub else _icon('lock', c))
    if epub:
        return ('<section class="pe-back ps-showcase" id="free">%s%s<p><a href="%s/">spreadloveandacceptance.com</a></p>%s%s%s</section>') % (
            head, '', SITE, left, right, promise)
    s = '<div class="pe-verso-pad pe-only" data-for="free"></div>'
    s += ('<section class="pe-back ps-showcase ps-sc-left no-bubble" data-no-bubble id="free" style="--pc:%s;--pt:%s">%s%s%s'
          '<div class="ps-sc-grid">%s</div></section>') % (c, book['tint'], mark('free'), head, home, left)
    s += ('<section class="pe-back ps-showcase ps-sc-right no-bubble" data-no-bubble style="--pc:%s;--pt:%s"><p class="ps-sc-k">Cosy, calm and free</p>'
          '<div class="ps-sc-grid">%s</div>%s</section>') % (c, book['tint'], right, promise)
    return s


def free_page(book):
    s = '<section class="pe-back ps-free no-bubble" data-no-bubble id="free" style="--pc:%s">%s<h1 class="pe-back-h">Free on the site</h1>' % (book['color'], mark('free'))
    s += ('<p class="pe-back-lede">Everything in this book, and more, is free at spreadloveandacceptance.com, with no account and no paid version. '
          'Scan a code with your phone’s camera.</p><ul class="ps-free-list">')
    for u, t, d in FREE_LINKS:
        s += '<li>%s<span><strong>%s</strong><span class="ps-free-d">%s</span><span class="ps-addr">%s</span></span></li>' % (
            qr(u), esc(t), esc(d), B.addr_html(B.short_address(u)))
    s += '</ul><p class="ps-free-note">Looking for a word? Every chapter can be searched online, and the research page lists every source.</p></section>'
    return s


def page_rules(book, here_order, back_keys):
    head = 'font-family:"Lora",Georgia,serif;font-style:italic;font-size:7.6pt;color:#6E6556;vertical-align:top;padding-top:2.6mm;border-top:.4pt solid #CDBF98;white-space:nowrap;'
    num = 'content:counter(page);font-family:"Fraunces",Georgia,serif;font-weight:500;font-size:8.8pt;color:#2B2620;vertical-align:top;padding-top:2.6mm;border-top:.4pt solid #CDBF98;'
    edge = 'vertical-align:top;border-top:.4pt solid #CDBF98;'
    q = lambda t: '"%s"' % t.replace('\\', '').replace('"', '\\"')
    verso = '%s · Book %d: %s' % (SERIES_TITLE, book['n'], book['title'])

    def rules(nm, recto):
        return ('@page %s:right{@bottom-left{content:%s;%s}@bottom-center{content:"";%s}@bottom-right{%stext-align:right}}'
                '@page %s:left{@bottom-left{%stext-align:left}@bottom-center{content:"";%s}@bottom-right{content:%s;%stext-align:right}}') % (
            nm, q(recto), head, edge, num, nm, num, edge, q(verso), head)
    # (then the pages without running heads again: these rules come after the stylesheet's own)
    r = ['@page :right{@bottom-left{content:%s}}@page :left{@bottom-right{content:%s}}' % (q(SERIES_TITLE), q(SERIES_TITLE)) + '@page pe-front{@bottom-left{content:none;border:0}@bottom-center{content:none;border:0}@bottom-right{content:none;border:0}}@page pe-blank{@bottom-left{content:none;border:0}@bottom-center{content:none;border:0}@bottom-right{content:none;border:0}}@page pe-full{@bottom-left{content:none;border:0}@bottom-center{content:none;border:0}@bottom-right{content:none;border:0}}']
    for slug in here_order:
        r.append('#%s{page:sc-%s}' % (slug, slug))
        r.append(rules('sc-' + slug, B.SHORT[slug]))
    for k, label in back_keys:
        r.append('#%s{page:sb-%s}' % (k, k))
        r.append(rules('sb-' + k, label))
    return '<style media="print">%s</style>' % '\n'.join(r)


def google_fonts():
    """the site's own Google Fonts link (IBM Plex Mono comes from it; Lora and Fraunces are replaced by book-print.css's static files)"""
    return '\n'.join(re.findall(r'<link[^>]*fonts\.(?:googleapis|gstatic)\.com[^>]*>', B.HEAD_TMPL))


def head(title, css):
    return ('<!doctype html>\n<html lang="en-GB">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
            '<meta name="robots" content="noindex">\n<title>%s</title>\n'
            '%s\n<link rel="stylesheet" href="/assets/css/book-print.css">\n%s\n%s\n%s\n<link rel="stylesheet" href="%s">\n</head>\n') % (
        esc(title), google_fonts(), B.EX_CSS, front_back.STYLE, hints.CSS, css)


QR_SCRIPT = '''<script>
function peQR(){ if (!window.TOLShareKit || !TOLShareKit.qr) return false; document.querySelectorAll('.pe-qr[data-qr]').forEach(function (el) { if (el.firstChild) return; var s = TOLShareKit.qr.svg(el.getAttribute('data-qr')); if (s) { s.removeAttribute('class'); s.setAttribute('aria-hidden', 'true'); el.appendChild(s); } }); return true; }
window.addEventListener('beforeprint', peQR);
window.addEventListener('load', function () { var n = 0; (function t() { if (!peQR() && ++n < 20) setTimeout(t, 300); })(); });
</script>
<script src="/assets/js/share-kit.js"></script>'''


def build_book(book, where):
    order = [e[0] for e in B.ORDER]
    here = set(book['chapters'])
    chs = book['chapters']
    namer = namer_for(book)
    hn_html, hn_toc = help_now(here, namer)
    toc = [B.toc_row('about', '', 'About this book, and how to use it', 'is-front'), B.toc_row('find', '', 'Find it fast', 'is-front'),
           B.toc_row('meet', '', 'Workpapers, tools and three friends', 'is-front')]
    if hn_html:
        toc.append(B.toc_row('help-now', '', esc(hn_toc), 'is-front'))
    body, arts = [], []
    for i, slug in enumerate(chs):
        e = B.entry(slug)
        num, lab = chapter_label(slug, book)
        toc.append(B.toc_row(slug, esc(num or 'After'), esc(ch_title(slug)), 'is-ch'))
        # every chapter opens on a right-hand page (build_pdfs.js switches the blank page before it on or off)
        body.append('<div class="pe-recto-pad pe-only" data-for="%s"></div>' % slug)
        art = s_chapter(e, book, here, where, namer, panels=True)
        arts.append((slug, art))
        body.append(art)
    # the back of the book: built before finish_package, so their page references get markers
    extra = []
    found = printed_mentions(arts)
    for k_, v_ in found.items():
        ALL_FOUND.setdefault(k_, [])
        ALL_FOUND[k_] += [x for x in v_ if x not in ALL_FOUND[k_]]
    wt_ref = lambda s_: '<a href="#%s">%s</a><span class="pe-only"> (page %s)</span>' % (s_, esc(B.SHORT[s_]), pg(s_))
    if book['n'] == 4:
        extra.append(('month', ST.TEXT['first_month']['title'], month_page(book, namer)))
        extra.append(('jobs', ST.TEXT['jobs']['title'], jobs_page(book, namer)))
    if words_page(book):
        extra.append(('words', ST.TEXT['words'][str(book['n'])]['title'], words_page(book)))
    if ST.TEXT.get('faq', {}).get(str(book['n'])):
        extra.append(('faq', 'Questions people ask', faq_page(book, namer)))
    extra.append(('wp-tools', 'Workpapers and tools in this book', hints.back_section(mark, found, wt_ref, book['color'])))
    if 'numbers' in book.get('extras', []):
        ctx = front_back.Ctx('series', False, (1, 2, 3), here, B.PAGES, pg, mark, lambda s_: B.chapter_name(B.entry(s_)), B.SHORT, SITE, B.XREFS.add,
                             series_ref=namer.ref)
        for x in front_back.back_sections(ctx):
            if x['key'] == 'numbers':
                extra.append(('numbers', x['toc'], x['html']))
    extra.append(('glossary', 'Words used in this book', glossary_short(book, chs, ''.join(a for _s, a in arts))))
    back = [(k, t) for k, t, _h in extra] + [('notes', 'Research notes'), ('logic', 'The Logic Behind It: more examples'), ('free', 'Free on the website'),
                                             ('series', 'The series'), ('jot', 'Your notes')]
    for k, t in back:
        toc.append(B.toc_row(k, '', esc(t), 'is-back'))
    front = title_page(book) + copyright_page(book)
    front += '\n<nav class="pe-toc ps-toc pe-only" aria-label="Contents">%s<h1>Contents</h1><ol class="pe-toc-list">%s</ol></nav>' % (mark('contents'), ''.join(toc))
    front += '\n' + about_page(book, namer) + '\n' + find_page(book, namer) + '\n' + meet_page(book, list(found)) + '\n' + hn_html
    both, figs, exs = B.finish_package(front + '\n<!--pe-split-->\n' + '\n'.join(body) + '\n<!--pe-split-->\n' + ''.join(h for _k, _t, h in extra))
    front, body_html, extra_html = both.split('\n<!--pe-split-->\n', 2)
    backm = extra_html + research_short(book, here) + logic_free_page(book) + showcase(book) + series_page(book) + notes_pages(book, book.get("notes_pages", 2))
    ol = [['Contents', 'contents', 0], ['About this book, and how to use it', 'about', 0], ['Find it fast', 'find', 0], ['Workpapers, tools and three friends', 'meet', 0]] + ([[hn_toc, 'help-now', 0]] if hn_html else [])
    ol += [['%s: %s' % (chapter_label(s_, book)[1], ch_title(s_)), s_, 0] for s_ in chs]
    ol += [[t, k, 0] for k, t in back]
    title = '%s, Book %d: %s' % (SERIES_TITLE, book['n'], book['title'])
    outline = '<script type="application/json" id="pe-outline">%s</script>' % json.dumps(
        {'outline': ol, 'title': title, 'author': B.AUTHOR, 'subject': book['line']}, ensure_ascii=False).replace('</', '<\\/')
    rules = page_rules(book, [s_ for s_ in order if s_ in here], back)
    # printfix13: no reference in this book may point to a chapter or a page that isn't there
    for err in ST.check_text(ST.printed_text(front + body_html + extra_html), book, books(), 'Book %d' % book['n']):
        ERRORS.append(err)
    page = head(title, SERIES_CSS)
    page += '<body class="whole-book pe-book pe-series" data-pe="%s">\n<main class="read whole" id="main">\n%s\n%s\n%s\n</main>\n%s\n%s\n%s\n</body>\n</html>\n' % (
        book['id'], front, body_html, backm, rules, outline, QR_SCRIPT)
    B.write(os.path.join(SRC, book['id'] + '.html'), page)
    return {'figures': len(figs), 'examples': len(exs)}


def build_measure():
    """one long book of every short chapter in the online order, each starting on a new page: build_pdfs.js
    prints it so each chapter's 6 x 9 length can be read off its page map"""
    fake = {'n': 0, 'id': 'measure', 'title': 'Measure', 'sub': '', 'line': '', 'color': '#2B2620', 'tint': '#F3EEE2', 'art': 'whole',
            'chapters': [e[0] for e in B.ORDER]}
    here = set(fake['chapters'])
    where = dict((s_, fake) for s_ in here)
    body = ''.join(s_chapter(B.entry(s_), fake, here, where) for s_ in fake['chapters'])
    both, _f, _x = B.finish_package(body)
    page = head('Measure', SERIES_CSS) + '<body class="whole-book pe-book pe-series"><main class="read whole" id="main">%s<section class="pe-back" id="notes">%s</section></main>%s\n%s</body></html>\n' % (
        both, mark('notes'), page_rules(fake, fake['chapters'], []), QR_SCRIPT)
    B.write(os.path.join(SRC, 'measure.html'), page)


# ---------- the workbook ----------
# (key in hints.json, copies, when to use it, how long, who) — the order follows the books: on your own first, then together
WB = [
    ('wp02', 4, 'Before any hard talk, and on ordinary days too, so you can see your own pattern.', 'About 2 minutes', 'On your own, about yourself only'),
    ('wp11', 2, 'On a calm day, before you need it. Look at it again after a heated moment.', 'About 10 minutes', 'On your own; the pause plan is made to share'),
    ('wp09', 3, 'Before you answer something that stung.', 'About 5 minutes', 'On your own, about your own side'),
    ('wp13', 4, 'Once a day, for a week at a time: one sheet a week.', 'About 90 seconds a day', 'Together; each person fills in only their own rows. Three or more of you: use two sheets'),
    ('wp12', 2, 'Once, then again every few months or after a big change.', 'About 20 minutes', 'Together; each person fills in their own rows first'),
    ('wp14', 2, 'For one week in a hard stretch, a line each evening.', 'A minute a day, then 15 minutes', 'Together'),
    ('wp01', 3, 'For one ordinary week: one sheet a week.', 'A few minutes a day', 'Together; write only what you did or saw yourself'),
    ('wp03', 2, 'When jobs only get done after someone asks. Redo it when life changes.', 'About 10 minutes', 'Together'),
    ('setup', 3, 'About once a month, with a week of Who did what, your job list and each person’s stress tank.', 'About 15 minutes', 'Together; each person scores only their own tank'),
    ('wp04', 3, 'Once a month, looking back over four weeks.', 'About 20 minutes', 'Together'),
    ('wp15', 2, 'About every three months.', 'About 15 minutes', 'Together'),
]


WB_ONE_PAGE = {'wp02', 'wp09'}
WB_SUMS = {'wp01', 'wp02', 'wp03', 'wp04', 'setup'}
# printfix13: what each sheet's opening page says where no book chapter teaches it, and how to read the answers
WB_EXPLAINED = {
    'wp12': ('Book 3, Chapter 1 (Why we get out of tune), and in full, free online at spreadloveandacceptance.com/workpapers/wp-12-same-moment-different-speeds',
             'Look at Part B first. A gap of two or more steps on the same moment is where most friction starts, so choose that moment for Part C. '
             'A gap in speed is about pace and says nothing about how much either of you cares. If your answers barely differ, the friction may come '
             'from somewhere else, such as tiredness or pressure from outside.'),
    'wp14': ('Book 4, Chapter 3 (Full tanks and different angles), and in full, free online at spreadloveandacceptance.com/workpapers/wp-14-is-it-us-or-everything-else',
             'In Part B, count the tense moments that fell on heavy days. If most of them did, outside pressure is doing much of the damage, and a plan for '
             'the pressure (Part D) will help more than talking about each other. If most came on light days, the friction really does start between you, '
             'and Say it so it lands or the monthly look-back is a good next step.'),
}
ALL_FOUND = {}


def worksheets():
    """the blank worksheets (tools/book/back-worksheets.html), by their title"""
    s = B.read(os.path.join(HERE, 'back-worksheets.html'))
    out = {}
    for m in re.finditer(r'<section class="pe-ws-sheet[^"]*"[^>]*>.*?</section>', s, re.S):
        t = re.search(r'<h2>(.*?)</h2>', m.group(0)).group(1)
        out[B.strip_tags(t).strip()] = re.sub(r'\s+data-(parts|pkg)="[^"]*"', '', m.group(0))
    return out


def wb_sheet_fix(key, sh):
    """printfix13: the workbook's own changes to the blank sheets"""
    if key == 'wp01':
        row = '<tr><td></td><td></td><td></td><td></td><td></td></tr>'
        sh = re.sub(r'(<table class="pe-ws-t">.*?<tbody>)(?:<tr><td></td><td></td><td></td><td></td><td></td></tr>)+(</tbody>)',
                    lambda m: m.group(1) + row * 25 + m.group(2), sh, count=1, flags=re.S)
        sh = sh.replace('<p class="pe-ws-opts">Part B (optional), Kind ways to say no: say why the request is fair, say honestly what you have left, and offer something instead.</p>',
                        '<h3>Part B (optional): Kind ways to say no</h3><p class="pe-ws-opts">For a request you can’t take on this week: say why the request is fair, '
                        'say honestly what you have left, and offer something instead.</p><div class="wb-lines">%s</div>' % ('<div></div>' * 6))
        sh = sh.replace('How the score works: “How the numbers work”, at the back.', 'How the score works: “How the numbers work”, page %s of this workbook.' % pg('numbers'))
    if key == 'wp15':
        sh = sh.replace('<h3>Part C: One to restart, or start</h3>',
                        '<h3>Part B: Count them</h3><div class="pe-ws-meta"><span>Alive ____</span><span>Fading ____</span><span>Stopped ____</span><span>New idea ____</span></div>'
                        '<h3>Part C: One to restart, or start</h3>')
    if key == 'wp12':
        sh = sh.replace('<p class="pe-ws-opts">For each moment, count how many steps apart your answers are on each list. Start with the biggest gap: a difference in pace, not in how much anyone cares.</p>',
                        '<p class="pe-ws-opts">For each moment, count how many steps apart your answers are on each list. Start with the biggest gap: a difference in pace, not in how much anyone cares.</p>'
                        '<table class="pe-ws-t is-short"><thead><tr><th scope="col">Moment</th><th scope="col">Speed gap</th><th scope="col">Talk gap</th><th scope="col">Urgency gap</th></tr></thead>'
                        '<tbody>%s</tbody></table>' % ('<tr><td></td><td></td><td></td><td></td></tr>' * 5))
    return sh


SETUP_SHEET = ('<section class="pe-ws-sheet"><div class="pe-ws-head"><h2>Is the setup working? On paper</h2><span>Online: spreadloveandacceptance.com/is-the-setup-working</span></div>'
               '<p>The setup score from Book 4, Chapter 2, worked out with a pencil. You need one week of Who did what, your job list from One owner per job, '
               'and each person’s How much are you carrying? score from the same day. Each person scores only their own tank.</p>'
               '<div class="pe-ws-meta"><span>Date</span><span>Who is filling this in</span></div>'
               '<h3>Part A: Balance (how the hours split)</h3>'
               '<div class="pe-ws-meta"><span>Hours, person A ____</span><span>Hours, person B ____</span><span>Total ____</span></div>'
               '<div class="pe-ws-meta"><span>A’s share: hours ÷ total × 100 = ____ %</span><span>B’s share = ____ %</span></div>'
               '<div class="pe-ws-meta"><span>Balance = 1 − (the gap between the two shares) ÷ 100 = ____</span></div>'
               '<p class="pe-ws-opts">Three or more of you, or an uneven split you agreed on purpose: see “How the numbers work”.</p>'
               '<h3>Part B: Ownership (does each job have a name?)</h3>'
               '<div class="pe-ws-meta"><span>Jobs with an owner ____</span><span>All jobs on the list ____</span><span>Ownership = owned ÷ all = ____</span></div>'
               '<h3>Part C: Stress tanks</h3>'
               '<div class="pe-ws-meta"><span>Person A’s tank ____</span><span>Person B’s tank ____</span><span>Average ____</span></div>'
               '<p class="pe-ws-opts">If anyone’s tank is 0.60 or more, talk about that first, whatever the score says.</p>'
               '<h3>Part D: The setup score</h3>'
               '<div class="pe-ws-meta"><span>Balance × 0.40 = ____</span><span>Ownership × 0.35 = ____</span><span>(1 − average tank) × 0.25 = ____</span></div>'
               '<div class="pe-ws-meta"><span>Add the three: setup score = ____</span></div>'
               '<p class="pe-ws-opts">0.70 or more: working well. 0.40 up to 0.70: needs a look. Below 0.40: needs a rethink, together.</p>'
               '<h3>Part E: The biggest shortfall</h3>'
               '<div class="pe-ws-meta"><span>Balance: 0.40 − ____ = ____</span><span>Ownership: 0.35 − ____ = ____</span><span>Tank: 0.25 − ____ = ____</span></div>'
               '<div class="pe-ws-meta"><span>The biggest one is ____________</span><span>One small change we’ll try ____________</span><span>Look again on ____</span></div>'
               '<p class="pe-ws-foot">It describes the setup, never a person. A worked example: “How the numbers work”, at the back of this workbook.</p></section>')


def build_workbook(where):
    wb = CFG['workbook']
    sheets = worksheets()
    slugs = [e[0] for e in B.ORDER]
    found = hints.mentions(dict((s_, B.PAGES[(s_, False)]) for s_ in slugs), slugs)
    toc, secs, ol = [], [], [['Contents', 'contents', 0], ['How to use this workbook', 'wb-how', 0]]
    toc.append(B.toc_row('wb-how', '', 'How to use this workbook', 'is-front'))
    toc.append(B.toc_row('wb-six', '', 'Your six weeks: a planner', 'is-front'))
    ol.append(['Your six weeks: a planner', 'wb-six', 0])
    for key, copies, when, how_long, who in WB:
        w = hints.WP[key] if key != 'setup' else {'code': 'Setup', 'name': 'Is the setup working? On paper'}
        sheet = sheets.get(w['name']) if key != 'setup' else SETUP_SHEET
        if sheet:
            sheet = wb_sheet_fix(key, sheet)
        if not sheet:
            print('series: WARNING no blank sheet for', w['name'])
            continue
        sid = 'wb-' + key
        toc.append(B.toc_row(sid, esc(w['code'] if key != 'setup' else ''), esc(w['name']), 'is-ch'))
        ol.append(['%s: %s' % (w['code'], w['name']) if key != 'setup' else w['name'], sid, 0])
        # which books explain it (from the callouts the books really print)
        ins = []
        for s_ in ALL_FOUND.get(('wp', key), []):
            b = where.get(s_)
            if b:
                lab = 'Book %d, %s (%s)' % (b['n'], chapter_label(s_, b)[1].lower().replace('afterword', 'the afterword'), B.SHORT[s_])
                if lab not in ins:
                    ins.append(lab)
        fill = ('/workpapers/fill/%s.html' % w['code'].lower()) if key != 'setup' else '/is-the-setup-working.html'
        # each workpaper opens on a right-hand page, so a two-page sheet lies open across two facing pages
        s = '<div class="pe-recto-pad pe-only" data-for="%s"></div>' % sid
        s += '<section class="wb-open pe-only" id="%s" style="--pc:%s">%s<p class="wb-code">%s</p><h1>%s</h1>' % (
            sid, wb['color'], mark(sid), esc(('Workpaper ' + w['code']) if key != 'setup' else 'A paper version of the setup score'), esc(w['name']))
        s += '<dl class="wb-facts"><div><dt>When</dt><dd>%s</dd></div><div><dt>How long</dt><dd>%s</dd></div><div><dt>Who</dt><dd>%s</dd></div>' % (esc(when), esc(how_long), esc(who))
        if key == 'setup':
            ins = ['Book 4, Chapter 2 (Is the split working?)']
        if key in WB_EXPLAINED:
            s += '<div><dt>Explained in</dt><dd>%s</dd></div>' % esc(WB_EXPLAINED[key][0])
        elif ins:
            s += '<div><dt>Explained in</dt><dd>%s</dd></div>' % esc('; '.join(ins[:4]))
        s += ('<div><dt>Copies here</dt><dd>%d, one after the other. Photocopy them for your own use, or print more free from the website, '
              'where you can also fill the form in on screen.</dd></div></dl>') % copies
        if key in WB_EXPLAINED:
            s += '<p class="wb-read"><strong>How to read your answers.</strong> %s</p>' % esc(WB_EXPLAINED[key][1])
        s += ('<div class="ps-online-box">%s<p><strong>Fill it in on screen, free.</strong> %s '
              '<span class="ps-addr">%s</span></p></div>') % (
            qr(fill), 'The online version does the sums for you and keeps what you type on your own device.' if key in WB_SUMS
            else 'The online version keeps a copy on your own device, and nothing is sent anywhere.', B.addr_html(B.short_address(fill)))
        s += '</section>'
        for c in range(1, copies + 1):
            # the short sheets fit one page; the long ones get more room and fill two facing pages
            sh = sheet.replace('<section class="pe-ws-sheet', '<section class="pe-ws-sheet wb-sheet wb-k-%s %s' % (key, 'wb-one' if key in WB_ONE_PAGE else 'wb-two'), 1)
            sh = re.sub(r'(<div class="pe-ws-head"><h2>.*?</h2>)<span>.*?</span>', lambda m: m.group(1) + '<span>%s · copy %d of %d</span>' % (esc(w['code']), c, copies), sh, count=1, flags=re.S)
            s += sh
        secs.append(s)
    # printfix13: the sums behind the scores, on paper (the same pages as at the back of Book 4)
    book = dict(wb, n=0, chapters=[])
    ctx = front_back.Ctx('series', False, (1, 2, 3), set(), B.PAGES, pg, mark, lambda s_: B.chapter_name(B.entry(s_)), B.SHORT, SITE, None,
                         series_ref=namer_for(book).ref)
    for x in front_back.back_sections(ctx):
        if x['key'] == 'numbers':
            secs.append('<div class="pe-recto-pad pe-only" data-for="numbers"></div>' + front_back.add_section_marks(x['html'], mark))
            toc.append(B.toc_row('numbers', '', esc(x['toc']), 'is-back'))
            ol.append([x['toc'], 'numbers', 0])
    toc.append(B.toc_row('wb-notes', '', 'Notes', 'is-back'))
    toc.append(B.toc_row('series', '', 'The series', 'is-back'))
    ol += [['Notes', 'wb-notes', 0], ['The series', 'series', 0]]
    front = ('<section class="ps-title pe-only" style="--acc:%s">%s<div class="ps-title-top"><p class="ps-title-k">%s</p><p class="ps-title-t">%s</p>'
             '<p class="ps-title-s">%s</p></div><div class="ps-title-art">%s</div><div class="ps-title-by"><p class="ps-title-a">by %s</p>'
             '<p class="ps-title-p">Christian’s Lab<br>spreadloveandacceptance.com</p></div></section>') % (
        wb['color'], mark('titlep'), esc(SERIES_TITLE), esc(wb['title']), esc(wb['sub']), series_site.art(wb['art']), B.AUTHOR)
    front += copyright_page(book, workbook=True)
    front += '<nav class="pe-toc ps-toc pe-only" aria-label="Contents">%s<h1>Contents</h1><ol class="pe-toc-list">%s</ol></nav>' % (mark('contents'), ''.join(toc))
    front += ('<section class="wb-how pe-only" id="wb-how">%s<h1>How to use this workbook</h1>'
              '<p class="wb-lede">Every workpaper from the books, on big pages with room to write. Write in pencil if you like. There are no right answers, '
              'and nothing here is a test.</p><ul class="wb-how-list">'
              '<li><strong>One sheet, one go.</strong> Each workpaper starts with a short page: when to use it, how long it takes, who fills it in, and which book '
              'explains it. Then come the blank copies, one after another.</li>'
              '<li><strong>On your own, or together.</strong> Some sheets are only about you; fill those in for yourself, never for someone else. On shared sheets, '
              'each person writes only their own rows.</li>'
              '<li><strong>Describe what happened, not who someone is.</strong> The sheets look at the setup and the week, not at anyone’s character.</li>'
              '<li><strong>Need more copies?</strong> Copy a page for your own use, or fill the sheet in free on the website, where it does the sums and keeps '
              'what you type on your own device.</li>'
              '<li><strong>Go gently.</strong> If a sheet stirs up something heavy, stop. A “not right now” is fine. If you feel afraid of someone you live with, '
              'a worksheet is not the answer: spreadloveandacceptance.com/safety lists free, private help.</li></ul>'
              '<p class="wb-how-h">Six gentle weeks</p><p>If you want an order to follow, the six-week program puts the workpapers to work one small step a week. '
              'The next page is a planner for it.</p></section>') % mark('wb-how')
    weeks = [('Week 0', 'Five minutes: read the planner, pick a start day.', '—'),
             ('Week 1', 'See the work that’s already happening.', 'WP-01 Who did what · WP-13 daily check-in'),
             ('Week 2', 'Give every job one owner.', 'WP-03 One owner per job'),
             ('Week 3', 'Notice how much each of you is carrying.', 'WP-02 How much are you carrying?'),
             ('Week 4', 'Talk about it kindly.', 'WP-09 Say it so it lands · WP-11 Calm-Down Kit'),
             ('Week 5', 'Look at the pace and the pressure.', 'WP-12 Same moment, different speeds · WP-14 Is it us?'),
             ('Week 6', 'Make it last.', 'WP-04 What keeps coming back? · WP-15 rituals')]
    front += ('<section class="wb-six pe-only" id="wb-six">%s<h1>Your six weeks: a planner</h1><p class="wb-lede">One small step a week. Missing a week is fine; '
              'pick it up again where you left off. The full program is free at spreadloveandacceptance.com/prog-01.</p>'
              '<table class="wb-six-t"><thead><tr><th>Week</th><th>The step</th><th>Workpapers</th><th>Start date</th><th>Done</th></tr></thead><tbody>%s</tbody></table>'
              '<p class="wb-how-h">At the end: what changed?</p><div class="pe-ws-box wb-tall"><b>One thing that is easier now</b></div>'
              '<div class="pe-ws-box wb-tall"><b>One thing to keep an eye on</b></div></section>') % (
        mark('wb-six'), ''.join('<tr><td>%s</td><td>%s</td><td>%s</td><td></td><td><span class="pe-ws-tick"></span></td></tr>' % (esc(a), esc(b_), esc(c)) for a, b_, c in weeks))
    notes = '<section class="wb-notes pe-only" id="wb-notes">%s<h1>Notes</h1><div class="wb-lines">%s</div></section>' % (mark('wb-notes'), '<div></div>' * 21)
    notes += ''.join('<section class="wb-notes pe-only"><div class="wb-lines">%s</div></section>' % ('<div></div>' * 24) for _ in range(3))
    sp = series_page(book).replace(' (this book)', '')
    title = '%s: %s' % (SERIES_TITLE, wb['title'])
    outline = '<script type="application/json" id="pe-outline">%s</script>' % json.dumps(
        {'outline': ol, 'title': title, 'author': B.AUTHOR, 'subject': wb['line']}, ensure_ascii=False).replace('</', '<\\/')
    page = head(title, WB_CSS).replace('<link rel="stylesheet" href="%s">' % WB_CSS, '<link rel="stylesheet" href="%s">\n<link rel="stylesheet" href="%s">' % (SERIES_CSS, WB_CSS))
    rh = ('%s · %s' % (SERIES_TITLE, wb['title'].split(':')[0])).replace('"', '\\"')
    rules = '<style media="print">@page :right{@bottom-left{content:"%s"}}@page :left{@bottom-right{content:"%s"}}@page pe-front{@bottom-left{content:none;border:0}@bottom-center{content:none;border:0}@bottom-right{content:none;border:0}}@page pe-blank{@bottom-left{content:none;border:0}@bottom-center{content:none;border:0}@bottom-right{content:none;border:0}}</style>' % (rh, rh)
    page += '<body class="whole-book pe-book pe-series pe-workbook" data-pe="workbook">\n<main class="read whole" id="main">\n%s\n%s\n%s\n%s\n</main>\n%s\n%s\n%s\n</body>\n</html>\n' % (
        front, '\n'.join(secs), notes, sp, rules, outline, QR_SCRIPT)
    B.write(os.path.join(SRC, 'workbook.html'), page)


# ---------- covers ----------
def font_faces():
    css = B.read(os.path.join(ROOT, 'assets', 'css', 'book-print.css'))
    return '\n'.join(re.findall(r'@font-face\s*\{[^}]*\}', css))


def cover_html(item, trim, pages_hint=0, workbook=False, pocket=False, boxset=False):
    """A full-wrap cover: bleed, back, spine, front, bleed. build_pdfs.js sets --spine (inches) from the final page
    count, the @page size, and turns the spine text on above 79 pages. logicbook14: pocket=True is the 5 x 8 in pocket
    guide (its back code opens the situations online); boxset=True is the Kindle box set, whose front alone is used."""
    w, h = trim
    kicker = SERIES_TITLE + (' · Book %d' % item['n'] if not (workbook or pocket or boxset) else (' · ' + item['kicker'] if pocket else ''))
    label = lambda b: ('Book %d' % b['n']) if b.get('n') else ('Pocket guide' if b.get('id') == POCKET['id'] else 'Workbook')
    others = ''.join('<li style="--bc:%s"><span>%s</span> %s</li>' % (b['color'], label(b), esc(b['title'])) for b in series_items())
    spine_t = '%s · %s' % (SERIES_TITLE, ('Book %d: %s' % (item['n'], item['title'])) if not (workbook or pocket or boxset) else item['title'])
    title = item.get('short_title') or item['title']
    free_url, free_t, free_l = ('%s%s' % (SITE, LOGIC_PAGE), 'Every situation, free online', 'More than seventy, at spreadloveandacceptance.com/the-logic-behind-it') if pocket else (
        '%s/book/' % SITE, 'Free to read online', 'Every chapter, short and full, at spreadloveandacceptance.com/book')
    extra_css = ('.cv-text { top: .92in; left: .5in; right: .4in; } .cv-sub { font-size: 10.6pt; max-width: 3.9in; } .cv-art { left: .5in; right: .4in; } '
                 '.cv-foot { left: .5in; right: .4in; bottom: .42in; } .cv-line { font-size: 8.6pt; } .cv-by { font-size: 11pt; } .cv-back-in { left: .42in; right: .45in; top: .5in; } '
                 '.cv-bk { margin-bottom: .14in; } .cv-q { font-size: 9.4pt; margin-bottom: .14in; } .cv-series { font-size: 7.6pt; line-height: 1.46; } '
                 '.cv-free { max-width: 2.6in; font-size: 7.8pt; } .cv-free .pe-qr { flex-basis: .82in; width: .82in; height: .82in; }') if pocket else ''
    return '''<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Cover: %(title)s</title>
%(gfonts)s
<style>
%(fonts)s
:root { --spine: 0.36in; --acc: %(acc)s; --tint: %(tint)s; --w: %(w)sin; --h: %(h)sin; --bleed: 0.125in; --ink: #2B2620; --soft: #5A5346; --paper: #FBF6EA; }
* { box-sizing: border-box; -webkit-print-color-adjust: exact; print-color-adjust: exact; }
html, body { margin: 0; padding: 0; background: #fff; }
.cv { position: relative; width: calc(2 * var(--bleed) + 2 * var(--w) + var(--spine)); height: calc(2 * var(--bleed) + var(--h)); overflow: hidden; font-family: "Lora", Georgia, serif; color: var(--ink); }
.cv-back { position: absolute; left: 0; top: 0; bottom: 0; width: calc(var(--bleed) + var(--w)); background: var(--acc); color: #FFFDF8; }
.cv-spine { position: absolute; top: 0; bottom: 0; left: calc(var(--bleed) + var(--w)); width: var(--spine); background: var(--acc); color: #FFFDF8; }
.cv-front { position: absolute; right: 0; top: 0; bottom: 0; width: calc(var(--bleed) + var(--w)); background: var(--paper); }
.cv-front-trim { position: absolute; left: 0; top: var(--bleed); width: var(--w); height: var(--h); }
.cv-back-trim { position: absolute; left: var(--bleed); top: var(--bleed); width: var(--w); height: var(--h); }
.cv-rules { position: absolute; inset: 0; width: 100%%; height: 100%%; }
.cv-band { position: absolute; left: 0; right: 0; top: 0; height: 0.62in; background: var(--acc); color: #FFFDF8; display: flex; justify-content: space-between; align-items: flex-end; padding: 0 0.42in 0.14in 0.6in; font-family: "IBM Plex Mono", monospace; font-size: 7pt; letter-spacing: .16em; text-transform: uppercase; }
.cv-front .cv-band { top: calc(-1 * var(--bleed)); height: calc(0.62in + var(--bleed)); }
.cv-band span:last-child { font-family: "Lora", serif; font-style: italic; text-transform: none; letter-spacing: 0; font-size: 8.5pt; }
.cv-text { position: absolute; left: 0.6in; right: 0.45in; top: 1.02in; }
.cv-k { font-family: "IBM Plex Mono", monospace; font-weight: 500; font-size: 8.4pt; letter-spacing: .2em; text-transform: uppercase; color: var(--acc); margin: 0 0 0.12in; }
.cv-title { font-family: "Fraunces", Georgia, serif; font-weight: 600; font-size: %(tsize)spt; line-height: 1.02; letter-spacing: -.012em; margin: 0; text-wrap: balance; }
.cv-sub { font-style: italic; font-size: 12.5pt; line-height: 1.38; margin: 0.16in 0 0; color: var(--soft); max-width: 4.6in; text-wrap: balance; }
.cv-art { position: absolute; left: 0.6in; right: 0.4in; top: %(arttop)sin; height: %(arth)sin; display: flex; align-items: center; justify-content: center; }
.cv-art::before { content: ""; position: absolute; width: %(circ)sin; height: %(circ)sin; border-radius: 50%%; background: var(--tint); left: 50%%; top: 50%%; transform: translate(-50%%, -50%%); }
.cv-art .pe-art { position: relative; width: %(artw)sin; height: auto; }
.cv-foot { position: absolute; left: 0.6in; right: 0.45in; bottom: 0.5in; border-top: .6pt solid var(--acc); padding-top: 0.12in; }
.cv-line { font-size: 9.6pt; color: var(--soft); margin: 0; }
.cv-by { font-family: "Lora", Georgia, serif; font-style: italic; font-weight: 500; font-size: 12pt; letter-spacing: .02em; margin: 0.16in 0 0; color: var(--ink); }
.cv-back-in { position: absolute; left: 0.5in; right: 0.55in; top: 0.6in; bottom: 0.45in; }
.cv-bk { font-family: "IBM Plex Mono", monospace; font-size: 7.4pt; letter-spacing: .2em; text-transform: uppercase; margin: 0 0 0.2in; opacity: .92; }
.cv-blurb { font-family: "Fraunces", serif; font-size: %(bsize)spt; line-height: 1.42; margin: 0 0 0.18in; }
.cv-q { font-style: italic; font-size: 10.5pt; margin: 0 0 0.2in; }
.cv-series { list-style: none; padding: 0; margin: 0; font-size: 8.6pt; line-height: 1.55; max-width: 3.2in; }
.cv-series li span { display: inline-block; min-width: 0.78in; font-family: "IBM Plex Mono", monospace; font-size: 7pt; letter-spacing: .06em; opacity: .9; }
.cv-free { position: absolute; left: 0; bottom: 0; display: flex; gap: 0.12in; align-items: center; max-width: 3.1in; font-size: 8.6pt; line-height: 1.4; }
.cv-free .pe-qr { flex: 0 0 0.88in; width: 0.88in; height: 0.88in; background: #fff; padding: 0.04in; border-radius: 0.04in; }
.cv-free .pe-qr svg { width: 100%%; height: 100%%; display: block; }
.cv-free strong { display: block; font-weight: 600; }
.cv-by-back { font-family: "IBM Plex Mono", monospace; font-size: 7pt; letter-spacing: .06em; margin: 0.08in 0 0; opacity: .88; }
/* KDP prints the barcode here: 2 x 1.2 in at the bottom right of the back cover. Nothing is drawn in it. */
.cv-barcode { position: absolute; right: 0.25in; bottom: 0.25in; width: 2in; height: 1.2in; }
.cv-spine-t { position: absolute; left: 50%%; top: 50%%; transform: translate(-50%%, -50%%) rotate(90deg); white-space: nowrap; font-family: "Fraunces", serif; font-weight: 600; font-size: min(9pt, calc((var(--spine) - 0.125in) * 0.9)); line-height: 1; margin: 0; letter-spacing: .02em; display: none; }
.cv-spine-t em { font-family: "Lora", serif; font-weight: 400; font-style: italic; margin-left: 0.18in; }
.has-spine-text .cv-spine-t { display: block; }
%(extra_css)s
</style></head>
<body><div class="cv" id="cover">
<div class="cv-back"><div class="cv-back-trim">%(rules_b)s<div class="cv-back-in">
<p class="cv-bk">%(kicker)s</p>
<p class="cv-blurb">%(blurb)s</p>
<p class="cv-q">“See it fairly. Say it kindly.”</p>
<ul class="cv-series">%(others)s</ul>
<div class="cv-free"><span class="pe-qr" data-qr="%(free_url)s"></span><span><strong>%(free_t)s</strong>%(free_l)s<span class="cv-by-back" style="display:block">by %(author)s</span></span></div>
</div><div class="cv-barcode" aria-hidden="true"></div></div></div>
<div class="cv-spine"><p class="cv-spine-t">%(spine_t)s<em>%(author)s</em></p></div>
<div class="cv-front"><div class="cv-front-trim" id="front">%(rules_f)s
<div class="cv-band"><span>spreadloveandacceptance.com</span><span>See it fairly. Say it kindly.</span></div>
<div class="cv-text"><p class="cv-k">%(kicker)s</p><p class="cv-title">%(title)s</p><p class="cv-sub">%(sub)s</p></div>
<div class="cv-art">%(art)s</div>
<div class="cv-foot"><p class="cv-line">%(line)s</p><p class="cv-by">by %(author)s</p></div>
</div></div>
</div>
%(qrscript)s
</body></html>
''' % {
        'title': esc(title), 'fonts': font_faces(), 'gfonts': google_fonts(), 'acc': item['color'], 'tint': item['tint'], 'w': w, 'h': h,
        'tsize': 54 if workbook else (36 if pocket else 44), 'bsize': 13.5 if workbook else (9.4 if pocket else 11.6),
        'arttop': 4.1 if workbook else (3.0 if pocket else 3.35), 'arth': 4.6 if workbook else (3.0 if pocket else 3.7),
        'circ': 4.4 if workbook else (2.8 if pocket else 3.5), 'artw': 5.2 if workbook else (3.25 if pocket else 4.1),
        'free_url': free_url, 'free_t': free_t, 'free_l': free_l, 'extra_css': extra_css,
        'rules_b': '', 'rules_f': book_art.ledger_rules(round(w * 25.4), round(h * 25.4), '#E8DDBE', item['color'], top=22, step=7.5, left=12).replace('class="pe-rules"', 'class="cv-rules"'),
        'kicker': esc(kicker), 'blurb': esc(item.get('blurb', '')), 'others': others, 'site': SITE, 'author': B.AUTHOR,
        'spine_t': esc(spine_t), 'sub': esc(item['sub']), 'art': series_site.art(item['art']), 'line': esc(item['line']), 'qrscript': QR_SCRIPT,
    }


def jobs():
    j = []
    for b in books():
        j.append({'id': b['id'], 'kind': 'book', 'trim': CFG['trim_in'], 'colPx': COL_PX['book'], 'paper_in': PAPER_IN, 'price': CFG['price_usd'],
                  'cover': 'cover-' + b['id'], 'title': b['title'], 'n': b['n'], 'chapters': len(b['chapters'])})
    wb = CFG['workbook']
    j.append({'id': wb['id'], 'kind': 'workbook', 'trim': CFG['workbook_trim_in'], 'colPx': COL_PX['workbook'], 'paper_in': PAPER_IN,
              'price': CFG['workbook_price_usd'], 'cover': 'cover-' + wb['id'], 'title': wb['title'], 'n': 0})
    # logicbook14: the pocket guide (5 x 8 in) and the box set's front cover (a Kindle cover only)
    j.append({'id': POCKET['id'], 'kind': 'pocket', 'trim': POCKET['trim_in'], 'colPx': COL_PX['pocket'], 'paper_in': PAPER_IN, 'price': POCKET['price_usd'],
              'cover': 'cover-' + POCKET['id'], 'title': POCKET['title'], 'n': 0, 'min_pages': 72, 'max_pages': 80})
    j.append({'id': BOXSET['id'], 'kind': 'front', 'trim': CFG['trim_in'], 'cover': 'cover-' + BOXSET['id'], 'title': BOXSET['title'], 'n': 0})
    j.append({'id': 'measure', 'kind': 'measure', 'trim': CFG['trim_in'], 'colPx': COL_PX['book'], 'only_when_named': True})
    return j


def main():
    os.makedirs(SRC, exist_ok=True)
    warn = check_config()
    if '--measure' in sys.argv:
        build_measure()
    where = where_map()
    stats = {}
    for b in books():
        stats[b['id']] = build_book(b, where)
        B.write(os.path.join(SRC, 'cover-%s.html' % b['id']), cover_html(b, CFG['trim_in']))
    build_workbook(where)
    B.write(os.path.join(SRC, 'cover-workbook.html'), cover_html(CFG['workbook'], CFG['workbook_trim_in'], workbook=True))
    # logicbook14: the pocket guide and the box set's cover
    import pocket
    pstats = pocket.build(sys.modules[__name__])
    B.write(os.path.join(SRC, 'cover-%s.html' % BOXSET['id']), cover_html(dict(BOXSET, n=0), CFG['trim_in'], boxset=True))
    nb = series_site.words(POCKET['blurb'])
    if not 120 <= nb <= 160:
        warn.append('back-cover words for %s: %d (want 120 to 160)' % (POCKET['title'], nb))
    boxes = [b['id'] for b in LOGIC['boxes']]
    for bx in LOGIC['boxes']:
        bk = next((b for b in books() if b['n'] == bx['book']), None)
        if not bk or bx['slug'] not in bk['chapters']:
            ERRORS.append('logic box %s: %s is not a chapter of Book %s' % (bx['id'], bx['slug'], bx['book']))
    if 'tailgating' in boxes:
        ERRORS.append('the road-rage tip is for the website only (logic-boxes.json)')
    B.write(os.path.join(SRC, 'series-src.json'), json.dumps({'jobs': jobs(), 'costs': COSTS, 'paper_in': PAPER_IN,
                                                               'paper_note': 'KDP standard colour (white paper): 0.002252 in a page (kdp.amazon.com/help/topic/G201953020)'}, indent=1) + '\n')
    # the series on /book/ (also made by build_book.py's build_home, so a full rebuild keeps it)
    series_site.patch_home(os.path.join(ROOT, 'book', 'index.html'))
    warn += check_qrs() + series_site.check_blurbs()
    warn += [m for m in B.MISSING]
    for w in warn:
        print('series: WARNING', w)
    if ST.MISSING_PAGES:
        print('series: NOTE no page yet from the last print run for %d references in other books (print the series, then run this again): %s' % (
            len(set(ST.MISSING_PAGES)), ', '.join(sorted(set(ST.MISSING_PAGES))[:6])))
    for b in books():
        print('series: Book %d %s: %d chapters, %d figures, %d filled-in examples' % (b['n'], b['title'], len(b['chapters']), stats[b['id']]['figures'], stats[b['id']]['examples']))
    print('series: %s, the pocket guide: %d situations in %d sections (neurodivergent logic %d, common social habits %d, anyone %d; different rulebooks %d)' % (
        POCKET['title'], pstats['situations'], pstats['sections'], pstats['sides']['nd'], pstats['sides']['nt'], pstats['sides']['all'], pstats['rulebooks']))
    print('series: %d "Another way to see it" boxes (%s)' % (len(LOGIC['boxes']), ', '.join('Book %d: %d' % (b['n'], len([x for x in LOGIC['boxes'] if x['book'] == b['n']])) for b in books())))
    print('series: %d QR codes, all checked against a page' % len(set(QRS)))
    if ERRORS:
        for err in ERRORS:
            print('series: ERROR', err)
        print('series: %d reference errors: fix them before printing' % len(ERRORS))
        sys.exit(1)


if __name__ == '__main__':
    main()
