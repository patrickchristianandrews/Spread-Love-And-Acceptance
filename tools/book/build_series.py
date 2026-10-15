#!/usr/bin/env python3
"""build_series.py: the print series of "The Objective Ledger" (print12).

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

ROOT = B.ROOT
OUT = os.path.join(ROOT, 'book', 'print')
SRC = os.path.join(OUT, 'src')
CFG = series_site.config()
SITE = B.SITE
esc = B.esc
mark = B.mark
pg = B.pg

# KDP's paper thickness for standard colour (white paper): 0.002252 in a page (KDP help, "Paperback cover
# calculator / spine width": kdp.amazon.com/help/topic/G201953020). The same factor for the 8.5 x 11 workbook.
PAPER_IN = 0.002252
# column widths in CSS pixels (96 a inch), for build_pdfs.js's "wider than the text column" check
COL_PX = {'book': round((6 - 0.75 - 0.5) * 96), 'workbook': round((8.5 - 0.75 - 0.5) * 96)}

# printing cost and channel terms (US, looked up October 2026; see $SP/print-publishing-guide.md for the sources)
COSTS = {
    'kdp': {'fixed': 1.00, 'per_page': 0.0255, 'royalty': 0.60, 'expanded': 0.40,
            'note': 'KDP Amazon.com, standard colour, regular trim (72-600 pages): $1.00 + $0.0255 a page; 60% royalty at $9.99 and up, 40% expanded distribution'},
    'kdp_large': {'fixed': 1.00, 'per_page': 0.0402, 'royalty': 0.60, 'expanded': 0.40,
                  'note': 'KDP Amazon.com, standard colour, large trim (8.5 x 11): $1.00 + $0.0402 a page'},
    'ingram': {'fixed': 1.16, 'per_page': 0.0249, 'discount': 0.40, 'market_fee': 0.01875,
               'note': 'IngramSpark rate card from 1 Feb 2026, standard colour 50lb, small trim: $1.16 + $0.0249 a page; 1.875% market access fee; 40% wholesale discount assumed'},
    'ingram_large': {'fixed': 1.23, 'per_page': 0.0392, 'discount': 0.40, 'market_fee': 0.01875,
                     'note': 'IngramSpark, standard colour 50lb, large trim: $1.23 + $0.0392 a page'},
    'direct': {'card_pct': 0.029, 'card_fixed': 0.30, 'fulfil_fee': 1.75,
               'note': 'Direct sale through a print-on-demand fulfilment service (Lulu Direct or BookVault): print cost estimated at the IngramSpark rate (Lulu and BookVault quote per title only); card fee 2.9% + $0.30 (Shopify Payments basic); Lulu Direct example fulfilment fee $1.75 an order; the buyer pays shipping'},
}

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


def qr(url):
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


def s_open(e, book):
    hs = B.headings(e[0], False)
    lis = ''.join('<li>%s</li>' % ('<a href="#%s--%s">%s</a>' % (e[0], i, esc(t)) if i else esc(t)) for i, t in hs)
    num, lab = chapter_label(e[0], book)
    kicker = 'Book %d · %s' % (book['n'], lab)
    return ('<header class="ch-open no-bubble no-cheer no-dive" data-no-bubble>%s<p class="ch-num" aria-hidden="true">%s</p>'
            '<p class="ch-kicker">%s<span class="ps-online"> · online: %s</span></p>'
            '<h2 class="ch-title">%s</h2><p class="ch-intro">%s</p>'
            '<div class="ch-in"><p class="ch-in-k">In this chapter</p><ol class="ch-in-list">%s</ol></div></header>') % (
        mark(e[0]), esc(num), esc(kicker), esc(online_name(e[0])), esc(B.TITLES[e[0]]), B.LEDES[e[0]], lis)


def s_end(e, book, here, where):
    s = '<aside class="pe-end no-bubble no-cheer no-dive" data-no-bubble aria-label="End of chapter">'
    s += '<div class="pe-end-rem"><h3 class="pe-end-k">What to remember</h3>%s</div>' % B.remember_html(e[0], 'pe-end-list')
    links = B.CONNECT.get(e[0], [])
    if links:
        s += '<div class="pe-end-links"><h3 class="pe-end-k">This connects to</h3><ul class="pe-end-conn">'
        for tgt, w in links:
            online = B.absolute(B.href(tgt))
            if tgt in here:
                lab = '<a href="#%s">%s</a>' % (tgt, chapter_label(tgt, book)[1])
                at = '<a href="#%s">page %s</a>' % (tgt, pg(tgt))
            elif tgt in where:
                lab = '<a href="%s">Book %d</a>' % (online, where[tgt]['n'])
                at = '<a href="%s">%s</a>' % (online, esc(where[tgt]['title']))
            else:
                lab = '<a href="%s">Online</a>' % online
                at = '<a href="%s">read online</a>' % online
            s += '<li><span class="pe-conn-l">%s · %s</span><span class="pe-conn-w">%s</span><span class="pe-conn-p">%s</span></li>' % (
                lab, esc(B.SHORT[tgt]), esc(w[0].upper() + w[1:]), at)
        s += '</ul></div>'
    s += '<div class="pe-end-use"><h3 class="pe-end-k">Put it to use</h3><ul class="pe-use">'
    for t, u, d in B.uses(e[0]):
        s += '<li>%s<span class="pe-use-t"><a href="%s">%s</a>%s<span class="pe-use-u">%s</span></span></li>' % (
            qr(u), B.absolute(u), esc(t), ('<span class="pe-use-d">%s</span>' % esc(d)) if d else '', B.addr_html(B.short_address(u)))
    s += '</ul></div>'
    deep = B.href(e[0], True)
    s += ('<div class="ps-deeper">%s<p><strong>Go deeper (free online)</strong> The full chapter, with the research, more examples and more '
          'to try: <a href="%s"><span class="ps-addr">%s</span></a></p></div>') % (qr(deep), B.absolute(deep), B.addr_html(B.short_address(deep)))
    s += '</aside>'
    return s


def s_chapter(e, book, here, where):
    src = B.PAGES[(e[0], False)]
    body = B.clean_for_whole(B.main_inner(src), e[0], False, here)
    body = B.drop_element(body, r'<header class="read-head', 'header')
    body = re.sub(r'<p class="simple-lede">.*?</p>', '', body, count=1, flags=re.S)
    body = B.print_links(body, e[0], here)
    body = B.tag_boxes(B.demote(body))
    return '<article class="whole-ch pe-ch" id="%s" data-part="%d" style="--pc:%s;--pt:%s">%s\n<div class="pe-body">%s</div>\n%s</article>' % (
        e[0], e[1], book['color'], book['tint'], s_open(e, book), body, s_end(e, book, here, where))


# ---------- front and back of each book ----------
def title_page(book):
    return ('<section class="ps-title pe-only" style="--acc:%s">%s<div class="ps-title-top"><p class="ps-title-k">%s · Book %s</p>'
            '<p class="ps-title-t">%s</p><p class="ps-title-s">%s</p></div><div class="ps-title-art">%s</div>'
            '<div class="ps-title-by"><p class="ps-title-a">by %s</p><p class="ps-title-p">Spread Love &amp; Acceptance<br>spreadloveandacceptance.com</p></div></section>') % (
        book['color'], mark('titlep'), esc(CFG['series']), book['n'], esc(book['title']), esc(book['sub']),
        series_site.art(book['art']), B.AUTHOR)


def copyright_page(book, workbook=False):
    isbn = ('<p>ISBN %s (paperback)</p>' % esc(book['isbn'])) if book.get('isbn') else ''
    what = 'this workbook' if workbook else 'this book'
    s = '<section class="ps-copy pe-only"><div class="ps-copy-in">'
    s += '<p><em>%s</em>%s. %s.<br>By %s. Spread Love &amp; Acceptance, spreadloveandacceptance.com.</p>' % (
        esc(CFG['series']), (', Book %d' % book['n']) if not workbook else '', esc(book['title']), B.AUTHOR)
    s += '<p>Text and pictures © 2026 %s. First print edition, %s. Printed on demand.</p>%s' % (B.AUTHOR, B.UPDATED, isbn)
    s += ('<p><strong>Free online, always.</strong> Every chapter of the series is free to read at spreadloveandacceptance.com/book, in a short and a '
          'full version, with no account and no paid version. The print books are optional. You may copy pages of %s for personal use and '
          'for non-commercial teaching, with credit to “The Objective Ledger, spreadloveandacceptance.com”.</p>') % what
    s += ('<p><strong>Not therapy.</strong> This book is general education about people and relationships. It is not a diagnosis, treatment or a '
          'replacement for help from a doctor, counsellor or other trained professional, and it can’t know your situation.</p>')
    s += ('<p><strong>If you are not safe.</strong> If you feel afraid of someone you live with, or someone controls your money, phone or movements, '
          'that is not a problem to fix with a worksheet. <a href="%s/safety.html">spreadloveandacceptance.com/safety</a> lists free, private help. '
          'If you are in danger now, call your local emergency number.</p>') % SITE
    s += ('<p><strong>The examples are made up.</strong> The people in the scenes and examples are invented, built from common patterns. None of them '
          'is a real person or a testimonial.</p>')
    if not workbook:
        s += ('<p>The research the chapters mention is listed in short at the back. The full list, with what each study found and links, is at '
              '<a href="%s/research.html">spreadloveandacceptance.com/research</a>.</p>') % SITE
    s += '<p>Set in Lora, Fraunces and IBM Plex Mono.</p></div></section>'
    return s


def meet_page(book_or_none):
    """"Workpapers, tools and three friends", on one page"""
    wb = CFG['workbook']['title']
    s = '<section class="ps-meet pe-only" id="meet">%s<h1>Workpapers, tools and three friends</h1>' % mark('meet')
    s += ('<div class="ps-meet-kinds"><p>%s <strong>A workpaper</strong> is a page you fill in, on your own or together, such as “Workpaper WP-03: '
          'One owner per job”. Blank copies, with room to write, are in <em>%s</em>; you can also fill them in free on the website.</p>'
          '<p>%s <strong>A tool</strong> is a helper you use on the website, such as “Tool: Chat analyzer”. You use it and it gives you something back.</p>'
          '<p class="ps-meet-note">The book keeps the two apart: a workpaper and a tool never share a list. Both are free, need no account, and what you '
          'type stays on your device.</p></div>') % (hints.tag('wp', hints.WP.get('wp03')), esc(wb), hints.tag('tool'))
    s += '<p class="ps-meet-h">Three friends who give hints</p><ul class="bh-friends ps-friends">'
    s += '<li><span class="bh-badge" aria-hidden="true">%s</span><span><strong>Professor Puddles</strong>, the cheerful raindrop professor, gives most of the hints.</span></li>' % hints.SVG_PUDDLES
    s += '<li><span class="bh-badge" aria-hidden="true">%s</span><span><strong>Tidbit</strong>, the quick, curious pup, bounds in with a playful tip.</span></li>' % hints.SVG_TIDBIT
    s += '<li><span class="bh-badge" aria-hidden="true">%s</span><span><strong>Sugarfoot</strong>, the steady, gentle pup, turns up with a calm, slow tip.</span></li>' % hints.SVG_SUGARFOOT
    s += '</ul><p class="ps-meet-note">They keep to the lighter pages. Where a chapter talks about crisis, deep grief or being hurt, the pages stay quiet and plain.</p></section>'
    return s


def help_now(here):
    ctx = front_back.Ctx('series', False, (1, 2, 3), here, B.PAGES, pg, mark, lambda s_: B.chapter_name(B.entry(s_)), B.SHORT, SITE, B.XREFS.add)
    for x in front_back.front_sections(ctx):
        if x['key'] == 'help-now':
            return x['html'], x['toc']
    return '', ''


def research_short(book, here):
    notes = B.research_notes(here)
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


def series_page(book):
    s = '<section class="pe-back ps-series no-bubble" data-no-bubble id="series" style="--pc:%s">%s<h1 class="pe-back-h">The series</h1>' % (book['color'], mark('series'))
    s += '<p class="pe-back-lede">%s is a series of short books. Each one stands on its own; read them in any order.</p><ol class="ps-series-list">' % esc(CFG['series'])
    for b in books() + [CFG['workbook']]:
        this = b is book
        k = ('Book %d' % b['n']) if b.get('n') else 'Workbook'
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


def free_page(book):
    s = '<section class="pe-back ps-free no-bubble" data-no-bubble id="free" style="--pc:%s">%s<h1 class="pe-back-h">Free on the site</h1>' % (book['color'], mark('free'))
    s += ('<p class="pe-back-lede">Everything in this book, and more, is free at spreadloveandacceptance.com, with no account and no paid version. '
          'Scan a code with your phone’s camera.</p><ul class="ps-free-list">')
    for u, t, d in FREE_LINKS:
        s += '<li>%s<span><strong>%s</strong><span class="ps-free-d">%s</span><span class="ps-addr">%s</span></span></li>' % (
            qr(u), esc(t), esc(d), B.addr_html(B.short_address(u)))
    s += ('</ul><p class="ps-free-note">Looking for a word? The online book has the long index’s job: every chapter can be searched there, and the '
          'research page lists every source.</p></section>')
    return s


def page_rules(book, here_order, back_keys):
    head = 'font-family:"Lora",Georgia,serif;font-style:italic;font-size:7.6pt;color:#6E6556;vertical-align:top;padding-top:2.6mm;border-top:.4pt solid #CDBF98;white-space:nowrap;'
    num = 'content:counter(page);font-family:"Fraunces",Georgia,serif;font-weight:500;font-size:8.8pt;color:#2B2620;vertical-align:top;padding-top:2.6mm;border-top:.4pt solid #CDBF98;'
    edge = 'vertical-align:top;border-top:.4pt solid #CDBF98;'
    q = lambda t: '"%s"' % t.replace('\\', '').replace('"', '\\"')
    verso = '%s · Book %d: %s' % (CFG['series'], book['n'], book['title'])

    def rules(nm, recto):
        return ('@page %s:right{@bottom-left{content:%s;%s}@bottom-center{content:"";%s}@bottom-right{%stext-align:right}}'
                '@page %s:left{@bottom-left{%stext-align:left}@bottom-center{content:"";%s}@bottom-right{content:%s;%stext-align:right}}') % (
            nm, q(recto), head, edge, num, nm, num, edge, q(verso), head)
    r = []
    for slug in here_order:
        r.append('#%s{page:sc-%s}' % (slug, slug))
        r.append(rules('sc-' + slug, B.SHORT[slug]))
    for k, label in back_keys:
        r.append('#%s{page:sb-%s}' % (k, k))
        r.append(rules('sb-' + k, label))
    return '<style media="print">%s</style>' % '\n'.join(r)


def head(title, css):
    return ('<!doctype html>\n<html lang="en-GB">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
            '<meta name="robots" content="noindex">\n<title>%s</title>\n'
            '<link rel="stylesheet" href="/assets/css/book-print.css">\n%s\n%s\n%s\n<link rel="stylesheet" href="%s">\n</head>\n') % (
        esc(title), B.EX_CSS, front_back.STYLE, hints.CSS, css)


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
    hn_html, hn_toc = help_now(here)
    toc = []
    if hn_html:
        toc.append(B.toc_row('help-now', '', esc(hn_toc), 'is-front'))
    toc.append(B.toc_row('meet', '', 'Workpapers, tools and three friends', 'is-front'))
    body = []
    for i, slug in enumerate(chs):
        e = B.entry(slug)
        num, lab = chapter_label(slug, book)
        toc.append(B.toc_row(slug, esc(num or 'After'), esc(B.TITLES[slug]), 'is-ch'))
        body.append(s_chapter(e, book, here, where))
    back = [('notes', 'Research notes'), ('series', 'The series'), ('free', 'Free on the site')]
    for k, t in back:
        toc.append(B.toc_row(k, '', t, 'is-back'))
    front = title_page(book) + copyright_page(book)
    front += '\n<nav class="pe-toc ps-toc pe-only" aria-label="Contents">%s<h1>Contents</h1><ol class="pe-toc-list">%s</ol></nav>' % (mark('contents'), ''.join(toc))
    front += '\n' + meet_page(book) + '\n' + hn_html
    front += '\n<div class="pe-recto-pad pe-only" data-for="%s"></div>' % chs[0]
    both, figs, exs = B.finish_package(front + '\n<!--pe-split-->\n' + '\n'.join(body))
    front, body_html = both.split('\n<!--pe-split-->\n', 1)
    backm = research_short(book, here) + series_page(book) + free_page(book)
    ol = ([[hn_toc, 'help-now', 0]] if hn_html else []) + [['Contents', 'contents', 0], ['Workpapers, tools and three friends', 'meet', 0]]
    ol += [['%s: %s' % (chapter_label(s_, book)[1], B.TITLES[s_]), s_, 0] for s_ in chs]
    ol += [[t, k, 0] for k, t in back]
    title = '%s, Book %d: %s' % (CFG['series'], book['n'], book['title'])
    outline = '<script type="application/json" id="pe-outline">%s</script>' % json.dumps(
        {'outline': ol, 'title': title, 'author': B.AUTHOR, 'subject': book['line']}, ensure_ascii=False).replace('</', '<\\/')
    rules = page_rules(book, [s_ for s_ in order if s_ in here], back)
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
    ('wp02', 8, 'Before any hard talk, and on ordinary days too, so you can see your own pattern.', 'About 2 minutes', 'On your own, about yourself only'),
    ('wp11', 2, 'On a calm day, before you need it. Look at it again after a heated moment.', 'About 10 minutes', 'On your own; the pause plan is made to share'),
    ('wp09', 6, 'Before you answer something that stung.', 'About 5 minutes', 'On your own, about your own side'),
    ('wp13', 6, 'Once a day, for a week at a time: one sheet a week.', 'About 90 seconds a day', 'Together; each person fills in only their own rows'),
    ('wp12', 2, 'Once, then again every few months or after a big change.', 'About 20 minutes', 'Together; each person fills in their own rows first'),
    ('wp14', 3, 'For one week in a hard stretch, a line each evening.', 'A minute a day, then 15 minutes', 'Together'),
    ('wp01', 4, 'For one ordinary week: one sheet a week.', 'A few minutes a day', 'Together; write only what you did or saw yourself'),
    ('wp03', 2, 'When jobs only get done after someone asks. Redo it when life changes.', 'About 10 minutes', 'Together'),
    ('wp04', 3, 'Once a month, looking back over four weeks.', 'About 20 minutes', 'Together'),
    ('wp15', 4, 'About every three months.', 'About 15 minutes', 'Together'),
]


def worksheets():
    """the blank worksheets (tools/book/back-worksheets.html), by their title"""
    s = B.read(os.path.join(HERE, 'back-worksheets.html'))
    out = {}
    for m in re.finditer(r'<section class="pe-ws-sheet[^"]*"[^>]*>.*?</section>', s, re.S):
        t = re.search(r'<h2>(.*?)</h2>', m.group(0)).group(1)
        out[B.strip_tags(t).strip()] = re.sub(r'\s+data-(parts|pkg)="[^"]*"', '', m.group(0))
    return out


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
        w = hints.WP[key]
        sheet = sheets.get(w['name'])
        if not sheet:
            print('series: WARNING no blank sheet for', w['name'])
            continue
        sid = 'wb-' + key
        toc.append(B.toc_row(sid, esc(w['code']), esc(w['name']), 'is-ch'))
        ol.append(['%s: %s' % (w['code'], w['name']), sid, 0])
        # which books explain it
        ins = []
        for s_ in found.get(('wp', key), []):
            b = where.get(s_)
            if b:
                lab = 'Book %d, %s (%s)' % (b['n'], chapter_label(s_, b)[1].lower().replace('afterword', 'the afterword'), B.SHORT[s_])
                if lab not in ins:
                    ins.append(lab)
        fill = '/workpapers/fill/%s.html' % w['code'].lower()
        s = '<section class="wb-open pe-only" id="%s" style="--pc:%s">%s<p class="wb-code">Workpaper %s</p><h1>%s</h1>' % (sid, wb['color'], mark(sid), esc(w['code']), esc(w['name']))
        s += '<dl class="wb-facts"><div><dt>When</dt><dd>%s</dd></div><div><dt>How long</dt><dd>%s</dd></div><div><dt>Who</dt><dd>%s</dd></div>' % (esc(when), esc(how_long), esc(who))
        if ins:
            s += '<div><dt>Explained in</dt><dd>%s</dd></div>' % esc('; '.join(ins[:4]))
        s += '<div><dt>Copies here</dt><dd>%d, one after the other. Need more? Print the free page, or fill it in on screen.</dd></div></dl>' % copies
        s += ('<div class="ps-online-box">%s<p><strong>Fill it in on screen, free.</strong> The online version does the sums for you and keeps what you type on your '
              'own device: <span class="ps-addr">%s</span></p></div>') % (qr(fill), B.addr_html(B.short_address(fill)))
        s += '</section>'
        for c in range(1, copies + 1):
            sh = sheet.replace('<section class="pe-ws-sheet', '<section class="pe-ws-sheet wb-sheet', 1)
            sh = re.sub(r'(<div class="pe-ws-head"><h2>.*?</h2>)<span>.*?</span>', lambda m: m.group(1) + '<span>%s · copy %d of %d</span>' % (esc(w['code']), c, copies), sh, count=1, flags=re.S)
            s += sh
        secs.append(s)
    toc.append(B.toc_row('wb-notes', '', 'Notes', 'is-back'))
    toc.append(B.toc_row('series', '', 'The series', 'is-back'))
    ol += [['Notes', 'wb-notes', 0], ['The series', 'series', 0]]
    book = dict(wb, n=0)
    front = ('<section class="ps-title pe-only" style="--acc:%s">%s<div class="ps-title-top"><p class="ps-title-k">%s</p><p class="ps-title-t">%s</p>'
             '<p class="ps-title-s">%s</p></div><div class="ps-title-art">%s</div><div class="ps-title-by"><p class="ps-title-a">by %s</p>'
             '<p class="ps-title-p">Spread Love &amp; Acceptance<br>spreadloveandacceptance.com</p></div></section>') % (
        wb['color'], mark('titlep'), esc(CFG['series']), esc(wb['title']), esc(wb['sub']), series_site.art(wb['art']), B.AUTHOR)
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
    title = '%s: %s' % (CFG['series'], wb['title'])
    outline = '<script type="application/json" id="pe-outline">%s</script>' % json.dumps(
        {'outline': ol, 'title': title, 'author': B.AUTHOR, 'subject': wb['line']}, ensure_ascii=False).replace('</', '<\\/')
    page = head(title, WB_CSS).replace('<link rel="stylesheet" href="%s">' % WB_CSS, '<link rel="stylesheet" href="%s">\n<link rel="stylesheet" href="%s">' % (SERIES_CSS, WB_CSS))
    page += '<body class="whole-book pe-book pe-series pe-workbook" data-pe="workbook">\n<main class="read whole" id="main">\n%s\n%s\n%s\n%s\n</main>\n%s\n%s\n</body>\n</html>\n' % (
        front, '\n'.join(secs), notes, sp, outline, QR_SCRIPT)
    B.write(os.path.join(SRC, 'workbook.html'), page)


# ---------- covers ----------
def font_faces():
    css = B.read(os.path.join(ROOT, 'assets', 'css', 'book-print.css'))
    return '\n'.join(re.findall(r'@font-face\s*\{[^}]*\}', css))


def cover_html(item, trim, pages_hint=0, workbook=False):
    """A full-wrap cover: bleed, back, spine, front, bleed. build_pdfs.js sets --spine (inches) from the final page
    count, the @page size, and turns the spine text on above 79 pages."""
    w, h = trim
    kicker = CFG['series'] + (' · Book %d' % item['n'] if not workbook else '')
    others = ''.join('<li style="--bc:%s"><span>%s</span> %s</li>' % (b['color'], ('Book %d' % b['n']) if b.get('n') else 'Workbook', esc(b['title']))
                     for b in books() + [CFG['workbook']])
    spine_t = '%s · %s' % (CFG['series'], ('Book %d: %s' % (item['n'], item['title'])) if not workbook else item['title'])
    return '''<!doctype html>
<html lang="en-GB"><head><meta charset="utf-8"><meta name="robots" content="noindex"><title>Cover: %(title)s</title>
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
.cv-free .pe-qr { flex: 0 0 0.72in; width: 0.72in; height: 0.72in; background: #fff; padding: 0.05in; border-radius: 0.04in; }
.cv-free .pe-qr svg { width: 100%%; height: 100%%; display: block; }
.cv-free strong { display: block; font-weight: 600; }
.cv-by-back { font-family: "IBM Plex Mono", monospace; font-size: 7pt; letter-spacing: .06em; margin: 0.08in 0 0; opacity: .88; }
/* KDP prints the barcode here: 2 x 1.2 in at the bottom right of the back cover. Nothing is drawn in it. */
.cv-barcode { position: absolute; right: 0.25in; bottom: 0.25in; width: 2in; height: 1.2in; }
.cv-spine-t { position: absolute; left: 50%%; top: 50%%; transform: translate(-50%%, -50%%) rotate(90deg); white-space: nowrap; font-family: "Fraunces", serif; font-weight: 600; font-size: 8.6pt; letter-spacing: .02em; display: none; }
.cv-spine-t em { font-family: "Lora", serif; font-weight: 400; font-style: italic; margin-left: 0.18in; }
.has-spine-text .cv-spine-t { display: block; }
</style></head>
<body><div class="cv" id="cover">
<div class="cv-back"><div class="cv-back-trim">%(rules_b)s<div class="cv-back-in">
<p class="cv-bk">%(kicker)s</p>
<p class="cv-blurb">%(blurb)s</p>
<p class="cv-q">“See it fairly. Say it kindly.”</p>
<ul class="cv-series">%(others)s</ul>
<div class="cv-free"><span class="pe-qr" data-qr="%(site)s/book/"></span><span><strong>Free to read online</strong>Every chapter, short and full, at spreadloveandacceptance.com/book<span class="cv-by-back" style="display:block">by %(author)s · Spread Love &amp; Acceptance</span></span></div>
</div><div class="cv-barcode" aria-hidden="true"></div></div></div>
<div class="cv-spine"><p class="cv-spine-t">%(spine_t)s<em>%(author)s</em></p></div>
<div class="cv-front"><div class="cv-front-trim" id="front">%(rules_f)s
<div class="cv-band"><span>Spread Love &amp; Acceptance</span><span>See it fairly. Say it kindly.</span></div>
<div class="cv-text"><p class="cv-k">%(kicker)s</p><p class="cv-title">%(title)s</p><p class="cv-sub">%(sub)s</p></div>
<div class="cv-art">%(art)s</div>
<div class="cv-foot"><p class="cv-line">%(line)s</p><p class="cv-by">by %(author)s</p></div>
</div></div>
</div>
%(qrscript)s
</body></html>
''' % {
        'title': esc(item['title']), 'fonts': font_faces(), 'acc': item['color'], 'tint': item['tint'], 'w': w, 'h': h,
        'tsize': 44 if not workbook else 54, 'bsize': 11.6 if not workbook else 13.5,
        'arttop': 3.35 if not workbook else 4.1, 'arth': 3.7 if not workbook else 4.6, 'circ': 3.5 if not workbook else 4.4,
        'artw': 4.1 if not workbook else 5.2,
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
    B.write(os.path.join(SRC, 'series-src.json'), json.dumps({'jobs': jobs(), 'costs': COSTS, 'paper_in': PAPER_IN,
                                                               'paper_note': 'KDP standard colour (white paper): 0.002252 in a page (kdp.amazon.com/help/topic/G201953020)'}, indent=1) + '\n')
    # the series on /book/ (also made by build_book.py's build_home, so a full rebuild keeps it)
    series_site.patch_home(os.path.join(ROOT, 'book', 'index.html'))
    warn += check_qrs() + series_site.check_blurbs()
    warn += [m for m in B.MISSING]
    for w in warn:
        print('series: WARNING', w)
    for b in books():
        print('series: Book %d %s: %d chapters, %d figures, %d filled-in examples' % (b['n'], b['title'], len(b['chapters']), stats[b['id']]['figures'], stats[b['id']]['examples']))
    print('series: %d QR codes, all checked against a page' % len(set(QRS)))


if __name__ == '__main__':
    main()
