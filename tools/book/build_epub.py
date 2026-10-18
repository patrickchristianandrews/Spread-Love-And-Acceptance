#!/usr/bin/env python3
"""build_epub.py: the Kindle ebooks (EPUB 3) of the print series (epub13).

    python3 tools/book/build_epub.py                      all four books
    python3 tools/book/build_epub.py book-2-heal-and-steady        (or name some ids)
    python3 tools/book/build_epub.py --epubcheck path/to/epubcheck.jar      also run EPUBCheck (needs Java)

Writes book/print/epub/<book id>.epub and book/print/epub/epub.json (file sizes, chapters, identifiers; read by
listing_kdp.py). Nothing else is changed.

The ebooks follow the print books exactly: the same books, chapters and order (tools/book/series.json), and the
same chapter pages, made by build_series.py's own functions (s_chapter, the copyright page, the help page, the
back of the book). Then, for a reflowable ebook:
  - QR codes become live links to https://spreadloveandacceptance.com/... ("Go deeper (free online)", every
    "Workpaper WP-NN: name · free to print" line, "Put it to use", "Free on the site").
  - Page numbers, running heads, "(page N)" notes, printed web addresses after links, the blank pages and the
    lined notes pages are left out; "page N" references become links to the chapter.
  - The pictures become PNG files (tools/book/epub_images.js, with Playwright's Chromium): figures on a white card,
    the three friends on a small white disc, so they read on a black Kindle page too. If Node or Playwright is
    missing, the SVG files go in as they are (valid EPUB 3; check them in Kindle Previewer).
  - One XHTML file per chapter and per front or back page, nav.xhtml (contents and landmarks), the cover image
    (book/print/cover-<id>-front.jpg) marked properties="cover-image", simple CSS that suits Kindle (no fixed
    positions, no page sizes, no colours on text or backgrounds, relative sizes), no scripts.
The workbook has no ebook: its forms are made to be written in, and are free to print online (see listing_kdp.py).

Every build checks itself: each XHTML file parses as XML, every manifest item exists, every link inside the book
resolves, every link to the site points at a real page (and #id), the nav matches the chapters, and the mimetype
file comes first, uncompressed. Standard library only (plus Node + Playwright for the pictures, as the PDFs use).
"""
import html
import json
import os
import re
import shutil
import subprocess
import sys
import tempfile
import uuid
import zipfile
import xml.etree.ElementTree as ET
from datetime import datetime, timezone
from html.parser import HTMLParser

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_series as S  # noqa: E402  (imports build_book; neither writes anything on import)
import book_art  # noqa: E402
import hints  # noqa: E402

B = S.B
ROOT = B.ROOT
SITE = B.SITE
CFG = S.CFG
SERIES_TITLE = S.SERIES_TITLE
OUT = os.path.join(ROOT, 'book', 'print', 'epub')

# [OWNER] Publisher and imprint, as they go into each ebook's metadata (KDP's own form sets what the store shows).
# The print copyright page says "Published by Christian’s Lab" (publisher in tools/book/series.json); change both if that changes.
PUBLISHER = 'Christian’s Lab'
IMPRINT = 'Christian’s Lab'  # the imprint name you register with your ISBNs; empty leaves it out
# [OWNER] Store links for "The series" page in each ebook, once the books are live. Empty links are left out.
STORE_LINKS = {
    'book-1-know-yourself-kindly': {'kindle': '', 'paperback': ''},
    'book-2-heal-and-steady': {'kindle': '', 'paperback': ''},
    'book-3-understanding-each-other': {'kindle': '', 'paperback': ''},
    'book-4-share-the-load': {'kindle': '', 'paperback': ''},
    'workbook': {'kindle': '', 'paperback': ''},
}

# alt text for the drawings on the title pages (book_art.illustration kinds)
ART_ALT = {
    'for-yourself': 'A smiling round friend holds an open book, next to a small sprout and a heart.',
    'steady': 'A calm, smiling round friend rests inside a big heart, with two small sprouts beside it.',
    'together': 'Three smiling round friends read an open book together, with a heart above them.',
    'load': 'Two smiling round friends share an open book, with a heart above them.',
    'workbook': 'A small drawing of an open workbook.',
}
FRIENDS = [('puddles', hints.SVG_PUDDLES, 'Professor Puddles, a cheerful raindrop in round glasses'),
           ('tidbit', hints.SVG_TIDBIT, 'Tidbit, a small, curious pup'),
           ('sugarfoot', hints.SVG_SUGARFOOT, 'Sugarfoot, a calm, gentle pup')]

WARN = []


def warn(msg):
    WARN.append(msg)


# ---------- a small, forgiving HTML tree (html.parser), written back out as XHTML ----------
VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta', 'source', 'track', 'wbr'}
CLOSES_P = {'address', 'article', 'aside', 'blockquote', 'details', 'div', 'dl', 'fieldset', 'figcaption', 'figure', 'footer',
            'form', 'h1', 'h2', 'h3', 'h4', 'h5', 'h6', 'header', 'hr', 'main', 'nav', 'ol', 'p', 'pre', 'section', 'table', 'ul'}
INLINE = {'a', 'abbr', 'b', 'bdi', 'bdo', 'cite', 'code', 'data', 'dfn', 'em', 'i', 'kbd', 'mark', 'q', 's', 'samp', 'small',
          'span', 'strong', 'sub', 'sup', 'time', 'u', 'var'}


class El:
    __slots__ = ('tag', 'attrs', 'kids', 'parent')

    def __init__(self, tag, attrs=None, parent=None):
        self.tag, self.attrs, self.kids, self.parent = tag, dict(attrs or {}), [], parent

    def cls(self):
        return (self.attrs.get('class') or '').split()

    def has(self, c):
        return c in self.cls()

    def text(self):
        return ''.join(k if isinstance(k, str) else k.text() for k in self.kids)

    def walk(self):
        for k in list(self.kids):
            if isinstance(k, El):
                yield k
                yield from k.walk()

    def append(self, k):
        if isinstance(k, El):
            k.parent = self
        self.kids.append(k)


class Tree(HTMLParser):
    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.root = El('#root')
        self.stack = [self.root]

    def _close_to(self, tag, stop=()):
        for i in range(len(self.stack) - 1, 0, -1):
            t = self.stack[i].tag
            if t == tag:
                del self.stack[i:]
                return True
            if t in stop:
                return False
        return False

    def handle_starttag(self, tag, attrs):
        tag = tag.lower()
        if tag in CLOSES_P:
            # an open <p> ends where a block starts (as browsers do)
            for i in range(len(self.stack) - 1, 0, -1):
                t = self.stack[i].tag
                if t == 'p':
                    del self.stack[i:]
                    break
                if t not in INLINE:
                    break
        if tag == 'li':
            self._close_to('li', stop=('ul', 'ol'))
        elif tag in ('dt', 'dd'):
            if not self._close_to('dt', stop=('dl', 'div')):
                self._close_to('dd', stop=('dl', 'div'))
        elif tag == 'tr':
            self._close_to('tr', stop=('table', 'thead', 'tbody', 'tfoot'))
        elif tag in ('td', 'th'):
            if not self._close_to('td', stop=('tr', 'table')):
                self._close_to('th', stop=('tr', 'table'))
        el = El(tag, [(k.lower(), '' if v is None else v) for k, v in attrs])
        self.stack[-1].append(el)
        if tag not in VOID:
            self.stack.append(el)

    def handle_startendtag(self, tag, attrs):
        tag = tag.lower()
        el = El(tag, [(k.lower(), '' if v is None else v) for k, v in attrs])
        self.stack[-1].append(el)

    def handle_endtag(self, tag):
        tag = tag.lower()
        if tag in VOID:
            return
        self._close_to(tag)

    def handle_data(self, data):
        if data:
            self.stack[-1].append(data)


def parse(s):
    t = Tree()
    t.feed(s)
    t.close()
    return t.root


def xesc(s, attr=False):
    s = s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')
    return s.replace('"', '&quot;') if attr else s


def serialize(node):
    out = []

    def go(n):
        if isinstance(n, str):
            out.append(xesc(n))
            return
        if n.tag == '#root':
            for k in n.kids:
                go(k)
            return
        a = ''.join(' %s="%s"' % (k, xesc(v, True)) for k, v in n.attrs.items())
        if n.tag in VOID:
            out.append('<%s%s/>' % (n.tag, a))
            return
        out.append('<%s%s>' % (n.tag, a))
        for k in n.kids:
            go(k)
        out.append('</%s>' % n.tag)
    go(node)
    return ''.join(out)


def remove(el):
    el.parent.kids.remove(el)


def unwrap(el):
    p = el.parent
    i = p.kids.index(el)
    for k in el.kids:
        if isinstance(k, El):
            k.parent = p
    p.kids[i:i + 1] = el.kids


# ---------- what print shows and an ebook doesn't ----------
DROP_CLASSES = {'pe-qr', 'pe-mark', 'pe-recto-pad', 'no-print', 'dig', 'pillar-line', 'depth-bar', 'pe-noprint', 'nine-more', 'pe-th-opt',
                'gl-dive', 'bt-switch', 'book-end', 'book-open', 'ch-num', 'bh-u', 'wt-u', 'pe-use-u', 'pe-u', 'pe-xref', 'tsk-line', 'tsk-line-btn'}
DROP_TAGS = {'script', 'style', 'button', 'form', 'input', 'select', 'textarea', 'noscript', 'iframe', 'object', 'video', 'audio', 'canvas', 'template'}
KEEP_ATTRS = {'id', 'class', 'href', 'src', 'alt', 'title', 'lang', 'scope', 'colspan', 'rowspan', 'start', 'reversed', 'role', 'width', 'height',
              'aria-label', 'aria-labelledby', 'aria-describedby', 'aria-hidden', 'epub:type', 'datetime', 'type', 'value'}


def site_url(path):
    """an absolute address on the site for a site path"""
    return path if re.match(r'^[a-z]+:', path) else SITE + ('' if path.startswith('/') else '/') + path


def addr_to_url(text):
    """spreadloveandacceptance.com/research -> https://spreadloveandacceptance.com/research.html (a real file)"""
    t = re.sub(r'\s+', '', text)
    m = re.match(r'^(?:https?://)?spreadloveandacceptance\.com(/[^#?]*)?([#?].*)?$', t)
    if not m:
        return None
    path, rest = (m.group(1) or '/'), (m.group(2) or '')
    f = os.path.join(ROOT, path.lstrip('/'))
    if path.endswith('/') or path == '':
        return SITE + path + rest
    if os.path.isfile(f):
        return SITE + path + rest
    if os.path.isfile(f + '.html'):
        return SITE + path + '.html' + rest
    if os.path.isfile(os.path.join(f, 'index.html')):
        return SITE + path + '/' + rest
    return SITE + path + rest


class Images:
    """every picture the books use, made once for all four books"""

    def __init__(self, tmp):
        self.tmp = tmp
        self.jobs = {}  # name -> job

    def svg_string(self, name, svg, width, bg, scale=2):
        if name not in self.jobs:
            self.jobs[name] = {'name': name, 'svg': svg, 'width': width, 'bg': bg, 'scale': scale}
        return name

    def svg_file(self, path):
        name = 'fig-' + os.path.splitext(os.path.basename(path))[0]
        if name not in self.jobs:
            f = os.path.join(ROOT, path.lstrip('/'))
            if not os.path.isfile(f):
                warn('missing picture ' + path)
                return None
            svg = B.read(f)
            w = 540
            m = re.search(r'<svg\b[^>]*\bviewBox="([-\d.\s]+)"', svg)
            if m:
                vb = [float(x) for x in m.group(1).split()]
                w = min(640, max(320, vb[2]))
            self.jobs[name] = {'name': name, 'svg': svg, 'width': w, 'bg': 'white', 'scale': 2, 'src': f}
        return name

    def render(self):
        """PNG for each job (Chromium); returns {name: (local file, media type, extension)}"""
        out = {}
        jobs = []
        for n, j in self.jobs.items():
            jobs.append({'out': os.path.join(self.tmp, n + '.png'), 'svg': j['svg'], 'width': j['width'], 'bg': j['bg'], 'scale': j['scale']})
        spec = os.path.join(self.tmp, 'jobs.json')
        with open(spec, 'w', encoding='utf-8') as f:
            json.dump({'fontCss': S.font_faces(), 'jobs': jobs}, f)
        env = dict(os.environ)
        try:
            npm_root = subprocess.run(['npm', 'root', '-g'], capture_output=True, text=True, timeout=60).stdout.strip()
            env['NODE_PATH'] = (env.get('NODE_PATH', '') + os.pathsep + npm_root).strip(os.pathsep)
            r = subprocess.run(['node', os.path.join(HERE, 'epub_images.js'), spec], capture_output=True, text=True, env=env, timeout=900)
            ok = r.returncode == 0
            msg = (r.stdout + r.stderr).strip()
        except Exception as e:  # no node, no npm
            ok, msg = False, str(e)
        if msg:
            print(msg)
        for j in jobs:
            n = os.path.splitext(os.path.basename(j['out']))[0]
            if ok and os.path.isfile(j['out']):
                shrink_png(j['out'])
                out[n] = (j['out'], 'image/png', '.png')
            else:
                # fallback: the SVG itself (valid EPUB 3)
                p = os.path.join(self.tmp, n + '.svg')
                svg = self.jobs[n]['svg']
                if 'xmlns=' not in svg[:300]:
                    svg = svg.replace('<svg', '<svg xmlns="http://www.w3.org/2000/svg"', 1)
                with open(p, 'w', encoding='utf-8') as f:
                    f.write(svg)
                out[n] = (p, 'image/svg+xml', '.svg')
        if not ok:
            warn('pictures: PNG rendering failed (%s); the SVGs went in instead' % msg[:200])
        return out


def shrink_png(path):
    """256 colours, no dithering: the flat drawings look the same at about a third of the size (Kindle charges
    delivery by the megabyte). Uses Pillow when it is installed; without it the PNG stays as it is."""
    try:
        from PIL import Image
    except ImportError:
        return
    im = Image.open(path)
    im.load()
    method = Image.Quantize.FASTOCTREE if im.mode == 'RGBA' else Image.Quantize.MEDIANCUT
    im.quantize(colors=256, method=method, dither=Image.Dither.NONE).save(path, optimize=True)


# ---------- turning the print pages into ebook pages ----------
PG = r'<span class="pe-pg" data-pg="[^"]*">[^<]*</span>'


def pre(s):
    """string-level changes before the tree: page numbers, inline drawings"""
    # "This connects to": the page column becomes a plain link to the chapter
    s = re.sub(r'(<a href="#[^"]+">)page\s*' + PG + r'(</a>)', r'\1In this book\2', s)
    # ", page N" after a chapter name (How the numbers work)
    s = re.sub(r',\s*page\s*' + PG, '', s)
    # the three friends: small PNG badges with a name
    for key, svg, alt in FRIENDS:
        s = s.replace(svg, '<img class="bh-img" src="images/%s.png" alt="%s"/>' % (key, html.escape(alt, quote=True)))
    return s


def transform(root, images, used, heading_shift=0):
    for el in list(root.walk()):
        if el.parent is None or (el.parent is not root and not attached(el, root)):
            continue
        c = set(el.cls())
        if el.tag in DROP_TAGS or c & DROP_CLASSES or (el.tag == 'span' and 'pe-only' in c) \
                or any(x.startswith('tol-') and x != 'tol-try' for x in c):
            remove(el)
            continue
        if el.tag == 'a' and 'book-fig-zoom' in c:
            unwrap(el)
            continue
    for el in list(root.walk()):
        if not attached(el, root):
            continue
        # site addresses printed as text become links
        if el.has('ps-addr') and not inside(el, 'a'):
            url = addr_to_url(el.text())
            if url:
                a = El('a', {'href': url})
                p = el.parent
                i = p.kids.index(el)
                p.kids[i] = a
                a.parent = p
                a.append(el)
        if el.tag == 'img':
            src = el.attrs.get('src', '')
            if src.startswith('/') and src.endswith('.svg'):
                name = images.svg_file(src)
                if name:
                    el.attrs['src'] = 'images/%s.png' % name
                    used.add(name)
            elif src.startswith('images/') and src != 'images/cover.jpg':
                used.add(os.path.splitext(os.path.basename(src))[0])
            if 'alt' not in el.attrs:
                warn('picture without alt text: ' + src)
                el.attrs['alt'] = ''
            el.attrs.pop('decoding', None)
            el.attrs.pop('loading', None)
            if el.has('bh-img'):
                el.attrs.pop('width', None)
                el.attrs.pop('height', None)
        if el.tag == 'a' and 'href' in el.attrs:
            h = el.attrs['href']
            if h.startswith('/'):
                el.attrs['href'] = SITE + h
        # print kept the badge out of the reading order; here it carries the friend's name
        if el.has('bh-badge'):
            el.attrs.pop('aria-hidden', None)
        # a chosen answer on a filled-in example says so in words
        if el.has('bk-ex-sr'):
            el.attrs['class'] = 'bk-ex-chosen'
        if heading_shift and re.match(r'^h[2-6]$', el.tag):
            el.tag = 'h%d' % (int(el.tag[1]) - heading_shift)
        for k in list(el.attrs):
            if k not in KEEP_ATTRS:
                del el.attrs[k]
        if el.attrs.get('role') == 'img' and el.tag != 'img' and not el.kids:
            remove(el)
    # empty wrappers left behind (a list item that only held a QR code, etc.)
    for el in list(root.walk()):
        if attached(el, root) and el.tag in ('p', 'span', 'div') and not el.kids and not el.attrs:
            remove(el)
    return root


def attached(el, root):
    p = el
    while p is not None:
        if p is root:
            return True
        if p.parent is not None and p not in p.parent.kids:
            return False
        p = p.parent
    return False


def inside(el, tag):
    p = el.parent
    while p is not None:
        if p.tag == tag:
            return True
        p = p.parent
    return False


def swap(s, old, new, where):
    if old not in s:
        warn('%s: text to change not found: %s' % (where, old[:60]))
        return s
    return s.replace(old, new)


class Doc:
    def __init__(self, fname, title, html_, epub_type='', heading_shift=0, body_type=''):
        self.fname, self.title, self.html, self.epub_type, self.heading_shift, self.body_type = fname, title, html_, epub_type, heading_shift, body_type
        self.root = None


def book_docs(book, where):
    chs = book['chapters']
    here = set(chs)
    docs = []
    n = book['n']
    # cover and title page
    docs.append(Doc('cover.xhtml', 'Cover', '<section class="cv" epub:type="cover"><img class="cv-img" src="images/cover.jpg" alt="%s"/></section>' % html.escape(
        'Cover: %s, Book %d of %s, by %s' % (book['title'], n, SERIES_TITLE, B.AUTHOR), quote=True), body_type='cover'))
    docs.append(Doc('title.xhtml', book['title'], (
        '<section class="ps-title" epub:type="titlepage"><p class="ps-title-k">%s · Book %d</p><h1 class="ps-title-t">%s</h1>'
        '<p class="ps-title-s">%s</p><p class="ps-title-art"><img src="images/art-%s.png" alt="%s"/></p><p class="ps-title-a">by %s</p>'
        '<p class="ps-title-p">%s<br/><a href="%s/">spreadloveandacceptance.com</a></p></section>') % (
        B.esc(SERIES_TITLE), n, B.esc(book['title']), B.esc(book['sub']), book['art'], B.esc(ART_ALT.get(book['art'], 'A small drawing.')), B.AUTHOR,
        B.esc(PUBLISHER), SITE)))
    # copyright page: the print words, for an ebook
    cp = S.copyright_page(book)
    cp = swap(cp, 'First print edition, %s. Printed on demand.' % B.UPDATED, 'First ebook edition, %s.' % B.UPDATED, 'copyright')
    if book.get('isbn_ebook'):
        cp = swap(cp, 'First ebook edition, %s.</p>' % B.UPDATED, 'First ebook edition, %s.</p><p>ISBN %s (ebook)</p>' % (B.UPDATED, B.esc(book['isbn_ebook'])), 'copyright')
    cp = swap(cp, 'The print books are optional.', 'The print books and ebooks are optional.', 'copyright')
    cp = swap(cp, '<p>Set in Lora, Fraunces and IBM Plex Mono.</p>', '', 'copyright')
    cp = cp.replace('<section class="ps-copy pe-only">', '<section class="ps-copy" epub:type="copyright-page"><h1 class="ps-copy-h">Copyright and notes</h1>', 1)
    docs.append(Doc('copyright.xhtml', 'Copyright and notes', cp))
    # contents: nav.xhtml (added later, after the title and copyright pages)
    docs.append(None)
    # help now (kept word for word), then the three friends
    # printfix13: "About this book, and how to use it", as in print but with links in place of page numbers and codes
    namer = S.namer_for(book)
    ebook_ref = lambda s_: (namer.ref(s_)[0], None)
    about = S.about_page(book, namer).replace('<section class="ps-about pe-only"', '<section class="ps-about"', 1)
    about = re.sub(r'<span class="ps-addr ps-about-u" data-full="([^"]+)">[^<]*</span>', r'<span class="ps-addr">\1</span>', about)
    about = swap(about, 'The code at the end of each chapter opens the full version on your phone.', 'The link at the end of each chapter opens the full version.', 'about page')
    about, n_ = re.subn(r'it gives the book, the chapter and the page in that book, as in “(Book \d, Chapter 1)(?: \(page \d+\))?”', r'it gives the book and the chapter, as in “\1”', about)
    if not n_:
        warn('about page: text to change not found: it gives the book, the chapter and the page')
    docs.append(Doc('about.xhtml', 'About this book, and how to use it', about))
    hn_html, hn_toc = S.help_now(here, type('EbookNamer', (), {'ref': staticmethod(ebook_ref)}))
    if hn_html:
        docs.append(Doc('help-now.xhtml', hn_toc, hn_html))
    meet = swap(S.meet_page(book), 'and the book gives a code to scan for each one.', 'and the book links to each one.', 'meet page')
    docs.append(Doc('meet.xhtml', 'Workpapers, tools and three friends', meet))
    # the chapters, numbered (figures, filled-in examples) as in print
    parts = []
    for slug in chs:
        parts.append(S.s_chapter(B.entry(slug), book, here, where))
    sep = '\n<!--epub-split-->\n'
    both, figs, exs = B.finish_package(sep.join(parts))
    for slug, h in zip(chs, both.split(sep)):
        num, lab = S.chapter_label(slug, book)
        h = h.replace('<article class="whole-ch pe-ch"', '<article epub:type="chapter" class="whole-ch pe-ch"', 1)
        docs.append(Doc(slug + '.xhtml', '%s: %s' % (lab, B.TITLES[slug]), h, heading_shift=1, body_type='bodymatter'))
    # the back of the book (printfix13: Book 4's first month, job list and words, then questions people ask, as in print)
    for fname, title, h in [('month.xhtml', 'Your first month, week by week', S.month_page(book, namer, epub=True)),
                            ('jobs.xhtml', 'A list of jobs to start from', S.jobs_page(book, namer, epub=True)),
                            ('words.xhtml', 'Words for the talk', S.words_page(book, epub=True)),
                            ('faq.xhtml', 'Questions people ask', S.faq_page(book, namer, epub=True))]:
        if h:
            docs.append(Doc(fname, title, h))
    found = hints.mentions(dict((s_, B.PAGES[(s_, False)]) for s_ in chs), chs)
    wt_ref = lambda s_: '<a href="#%s">%s</a>' % (s_, B.esc(B.SHORT[s_]))
    docs.append(Doc('wp-tools.xhtml', 'Workpapers and tools in this book', hints.back_section(S.mark, found, wt_ref, book['color'])))
    if 'numbers' in book.get('extras', []):
        ctx = S.front_back.Ctx('series', False, (1, 2, 3), here, B.PAGES, S.pg, S.mark, lambda s_: B.chapter_name(B.entry(s_)), B.SHORT, SITE, B.XREFS.add,
                               series_ref=ebook_ref)
        for x in S.front_back.back_sections(ctx):
            if x['key'] == 'numbers':
                docs.append(Doc('numbers.xhtml', x['toc'], x['html']))
    docs.append(Doc('glossary.xhtml', 'Words used in this book', S.glossary_short(book, chs).replace('<section class="pe-back pe-gloss', '<section epub:type="glossary" class="pe-back pe-gloss', 1)))
    docs.append(Doc('notes.xhtml', 'Research notes', S.research_short(book, here).replace('<section class="pe-back ps-notes', '<section epub:type="bibliography" class="pe-back ps-notes', 1)))
    docs.append(Doc('series.xhtml', 'The series', series_page(book)))
    # printfix13: the "Free on the website" spread, with links in place of the codes
    docs.append(Doc('free.xhtml', 'Free on the website', S.showcase(book, epub=True)))
    return docs, figs, exs


def series_page(book):
    s = '<section class="pe-back ps-series" id="series"><h1 class="pe-back-h">The series</h1>'
    s += ('<p class="pe-back-lede">%s is a series of short books. Each one stands on its own; read them in any order. Every chapter is also free to read '
          'online, in a short and a full version.</p><ol class="ps-series-list">') % B.esc(SERIES_TITLE)
    for b in S.books() + [CFG['workbook']]:
        this = b is book
        k = ('Book %d' % b['n']) if b.get('n') else 'Workbook'
        online = ('%s/book/%s.html' % (SITE, b['chapters'][0])) if b.get('chapters') else SITE + '/workpapers/fill/index.html'
        links = ['<a href="%s">%s</a>' % (online, 'Read it free online' if b.get('chapters') else 'Print or fill in the forms free online')]
        st = STORE_LINKS.get(b['id'], {})
        if st.get('kindle'):
            links.append('<a href="%s">Kindle edition</a>' % B.esc(st['kindle']))
        if st.get('paperback'):
            links.append('<a href="%s">Paperback</a>' % B.esc(st['paperback']))
        s += ('<li class="%s"><p class="ps-series-k">%s</p><p class="ps-series-t"><strong>%s</strong>%s</p><p class="ps-series-l">%s</p>'
              '<p class="ps-series-a">%s</p></li>') % (
            'is-this' if this else '', k, B.esc(b['title']), ' <em>(this book)</em>' if this else '', B.esc(b['line']), ' · '.join(links))
    s += ('</ol><p class="ps-series-note">All the books, in print and as ebooks: <a href="%s/book/#print-series">spreadloveandacceptance.com/book</a>. '
          'The workbook is a print book only: its forms are made to be written in, and every one is free to print or fill in on the website.</p></section>') % SITE
    return s


def free_page(book):
    s = '<section class="pe-back ps-free" id="free"><h1 class="pe-back-h">Free on the site</h1>'
    s += ('<p class="pe-back-lede">Everything in this book, and more, is free at <a href="%s/">spreadloveandacceptance.com</a>, with no account and no '
          'paid version.</p><ul class="ps-free-list">') % SITE
    for u, t, d in S.FREE_LINKS:
        s += '<li><p><a href="%s"><strong>%s</strong></a></p><p class="ps-free-d">%s</p></li>' % (SITE + u, B.esc(t), B.esc(d))
    s += '</ul><p class="ps-free-note">Looking for a word? Every chapter can be searched online, and the research page lists every source.</p></section>'
    return s


# ---------- CSS: plain, relative, and kind to Kindle's own settings ----------
CSS = '''/* Spread Love & Acceptance ebooks. Kindle-friendly on purpose: no fixed
   positions, no page sizes, no text or background colours (so the reader's own light, sepia or dark page works),
   relative sizes, colour only in thin rules (the book's colour: %(acc)s). */
html, body { margin: 0; padding: 0; }
body { line-height: 1.45; widows: 2; orphans: 2; }
p { margin: 0 0 .7em; text-indent: 0; }
h1, h2, h3, h4, h5 { line-height: 1.2; font-weight: bold; page-break-after: avoid; break-after: avoid; }
h1 { font-size: 1.55em; margin: .4em 0 .5em; }
h2 { font-size: 1.25em; margin: 1.3em 0 .45em; }
h3 { font-size: 1.08em; margin: 1.1em 0 .4em; }
h4, h5 { font-size: 1em; margin: 1em 0 .35em; }
ul, ol { margin: 0 0 .8em; padding-left: 1.4em; }
li { margin: 0 0 .3em; }
img { max-width: 100%%; height: auto; }
table { border-collapse: collapse; width: 100%%; margin: .6em 0 1em; font-size: .88em; }
th, td { border: 1px solid #9A9283; padding: .25em .35em; text-align: left; vertical-align: top; }
dl { margin: 0 0 .8em; }
dt { font-weight: bold; }
dd { margin: 0 0 .5em; }
a { text-decoration: underline; }
pre { white-space: pre-wrap; word-wrap: break-word; font-family: inherit; font-size: .95em; margin: 0 0 .8em; }
strong { font-weight: bold; }
.small, .pe-fb-small { font-size: .88em; }

/* cover, title page, copyright */
.cv { text-align: center; margin: 0; padding: 0; }
.cv-img { max-width: 100%%; height: auto; }
.ps-title { text-align: center; padding-top: 1.5em; }
.ps-title-k { font-size: .78em; letter-spacing: .12em; text-transform: uppercase; margin: 0 0 1em; }
.ps-title-t { font-size: 2em; margin: 0 0 .4em; }
.ps-title-s { font-style: italic; margin: 0 0 1.2em; }
.ps-title-art img { width: 60%%; max-width: 16em; }
.ps-title-a { font-style: italic; font-size: 1.1em; margin: 1em 0 .4em; }
.ps-title-p { font-size: .9em; }
.ps-copy { font-size: .9em; }
.ps-copy-h { font-size: 1.3em; }

/* contents */
.toc ol { list-style: none; padding-left: 0; }
.toc li { margin: 0 0 .55em; }
.toc .toc-k { display: block; font-size: .78em; letter-spacing: .08em; text-transform: uppercase; margin: 1.2em 0 .4em; }

/* help now, and the three friends */
.pe-help-urgent { border-left: 4px solid %(acc)s; padding: .1em 0 .1em .8em; margin: 0 0 1em; }
.pe-help-num { font-weight: bold; white-space: nowrap; }
.pe-fb-title, .pe-back-h { font-size: 1.55em; }
.ps-meet-note { font-style: italic; }
.ps-meet-h { font-size: .8em; letter-spacing: .1em; text-transform: uppercase; margin: 1.4em 0 .5em; }
.ps-friends { list-style: none; padding-left: 0; }
.ps-friends li { margin: 0 0 .9em; overflow: hidden; }
.bh-badge { float: left; width: 2.6em; margin: 0 .7em .2em 0; }
.bh-img { width: 2.6em; height: auto; display: block; }
.bh-tag { font-weight: bold; }

/* chapter opener */
.ch-open { margin: 0 0 1.4em; }
.ch-kicker { font-size: .78em; letter-spacing: .08em; text-transform: uppercase; margin: 0 0 .5em; }
.ps-online { text-transform: none; letter-spacing: 0; font-style: italic; }
.ch-title { font-size: 1.6em; margin: 0 0 .5em; }
.ch-intro { font-style: italic; font-size: 1.05em; }
.ch-in { border: 1px solid %(acc)s; padding: .5em .8em .2em; margin: 1em 0; }
.ch-in-k { font-size: .78em; letter-spacing: .08em; text-transform: uppercase; font-weight: bold; margin: 0 0 .35em; }
.ch-in-list { font-size: .92em; }

/* chapter body */
.try-this { border-left: 4px solid %(acc)s; padding: .2em 0 .1em .8em; margin: 1em 0 1.2em; }
.scene { border-left: 2px solid #9A9283; padding: .1em 0 .1em .8em; margin: 1em 0; }
.scene-when { font-size: .8em; letter-spacing: .06em; text-transform: uppercase; margin-bottom: .3em; }
ol.ideas { list-style: none; padding-left: 0; }
ol.ideas > li { margin: 0 0 1.6em; }
.pe-ex, .pe-words, .pe-try { padding-left: .8em; border-left: 2px solid %(acc)s; }
.yp-note, .locked-section, .pe-safe { border-left: 3px solid #9A9283; padding-left: .8em; }
.kind-h { font-size: .8em; letter-spacing: .06em; text-transform: uppercase; margin-top: 1.2em; }
.table-wrap { margin: .6em 0 1em; }

/* hints from the three friends */
.book-hint { border: 1px solid %(acc)s; padding: .6em .8em .3em; margin: 1.2em 0; overflow: hidden; page-break-inside: avoid; break-inside: avoid; }
.bh-body { overflow: hidden; }
.bh-who { font-weight: bold; margin: 0 0 .2em; }
.bh-text { margin: 0 0 .4em; }
.bh-ref { font-size: .92em; margin: .3em 0; }
.bh-k { font-weight: bold; }
.ps-wp p { margin: .3em 0; }

/* figures and filled-in examples */
figure { margin: 1.3em 0; padding: 0; }
.book-fig { text-align: center; page-break-inside: avoid; break-inside: avoid; }
.book-fig img { width: 100%%; max-width: 30em; }
figcaption { text-align: left; font-size: .88em; margin-top: .5em; }
.book-fig-n { font-weight: bold; }
.bk-ex { border: 1px solid #9A9283; padding: .6em .7em; font-size: .92em; }
.bk-ex figcaption { margin: 0 0 .6em; font-size: 1em; }
.bk-ex-k { display: block; font-size: .78em; letter-spacing: .08em; text-transform: uppercase; }
.bk-ex-title { display: block; font-weight: bold; font-size: 1.05em; }
.bk-ex-who { display: block; font-style: italic; font-size: .92em; }
.bk-ex-h { font-weight: bold; margin-bottom: .2em; }
.bk-ex-hsub, .bk-ex-ql, .bk-ex-note, .bk-ex-intro { font-size: .9em; }
.bk-ex-part { font-weight: bold; margin-top: .8em; }
.bk-ex-f div { margin: 0 0 .4em; }
.bk-ex-f dt { font-weight: normal; font-size: .85em; }
.bk-ex-f dd { margin: 0 0 .3em; border-bottom: 1px dotted #9A9283; }
.bk-ex-v { font-style: italic; }
.bk-ex-printed { font-style: normal; font-size: .92em; }
.bk-ex-blank { display: inline-block; min-width: 2.5em; }
.bk-ex-chips { list-style: none; padding-left: 0; margin: .2em 0 .6em; }
.bk-ex-chips li { display: inline-block; margin: 0 .35em .35em 0; padding: .05em .45em; border: 1px solid transparent; font-size: .9em; }
.bk-ex-chips li.is-on { border: 1.5px solid %(acc)s; font-style: italic; font-weight: bold; }
.bk-ex-chosen { font-size: .8em; font-weight: normal; font-style: normal; }
.bk-ex-out { border-top: 1px dashed #9A9283; margin-top: .8em; padding-top: .5em; }
.bk-ex-ok { font-weight: bold; font-size: .85em; letter-spacing: .05em; text-transform: uppercase; }
.bk-ex-t { font-size: .84em; }
.bk-ex-box { display: inline-block; min-width: 1em; border: 1px solid #9A9283; text-align: center; line-height: 1; }
.bk-ex-link { font-size: .92em; }

/* end of chapter */
.pe-end { border-top: 2px solid %(acc)s; margin-top: 2em; padding-top: .6em; }
.pe-end-k { font-size: 1.1em; margin: 1em 0 .4em; }
.pe-end-conn, .pe-use { list-style: none; padding-left: 0; }
.pe-end-conn li, .pe-use li { margin: 0 0 .8em; }
.pe-conn-l { display: block; font-weight: bold; }
.pe-conn-w, .pe-conn-p, .pe-use-d { display: block; }
.pe-conn-p, .pe-use-d { font-size: .9em; }
.pe-use-t a { font-weight: bold; }
.ps-deeper { border-top: 1px dashed %(acc)s; margin-top: 1.2em; padding-top: .6em; }
.ps-deeper strong { margin-right: .3em; }

/* back of the book */
.pe-back-lede, .pe-fb-lede, .wt-lede { font-style: italic; }
.ps-online-box { border: 1px solid %(acc)s; padding: .5em .8em .1em; margin: 0 0 1em; }
.pe-notes-h { font-size: 1.05em; }
.ps-refs { list-style: none; padding-left: 0; font-size: .9em; }
.ps-refs li { margin: 0 0 .4em; }
.wt-list { list-style: none; padding-left: 0; }
.wt-list li { margin: 0 0 .8em; }
.wt-name, .wt-in { margin: 0 0 .2em; }
.wt-in { font-size: .9em; }
.pe-gl { margin: 0 0 .6em; }
.ps-series-list, .ps-free-list { list-style: none; padding-left: 0; }
.ps-series-list li { border-left: 3px solid %(acc)s; padding: .1em 0 .1em .8em; margin: 0 0 1em; }
.ps-series-list li p { margin: 0 0 .2em; }
.ps-series-k { font-size: .78em; letter-spacing: .08em; text-transform: uppercase; }
.ps-series-l, .ps-series-a { font-size: .92em; }
.ps-free-list li { margin: 0 0 .9em; }
.ps-free-list li p { margin: 0 0 .15em; }
.ps-free-d { font-size: .92em; }
'''


def xhtml(title, body, body_type='', lang='en-GB'):
    bt = ' epub:type="%s"' % body_type if body_type else ''
    return ('<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n'
            '<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" xml:lang="%s" lang="%s">\n'
            '<head>\n<meta charset="UTF-8"/>\n<title>%s</title>\n<link rel="stylesheet" type="text/css" href="css/book.css"/>\n</head>\n'
            '<body%s>\n%s\n</body>\n</html>\n') % (lang, lang, xesc(title), bt, body)


def nav_xhtml(book, docs):
    """the contents page (also Kindle's table of contents) and the landmarks"""
    rows = []
    front = [d for d in docs if d.fname in ('help-now.xhtml', 'meet.xhtml')]
    chs = [d for d in docs if d.body_type == 'bodymatter']
    back = [d for d in docs if d.fname in ('wp-tools.xhtml', 'numbers.xhtml', 'glossary.xhtml', 'notes.xhtml', 'series.xhtml', 'free.xhtml')]
    li = lambda d: '<li><a href="%s">%s</a></li>' % (d.fname, xesc(d.title))
    rows.append('<li><a href="title.xhtml">Title page</a></li><li><a href="copyright.xhtml">Copyright and notes</a></li>')
    rows += [li(d) for d in front]
    for d in chs:
        slug = d.fname[:-6]
        num, lab = S.chapter_label(slug, book)
        rows.append('<li><a href="%s">%s: %s</a></li>' % (d.fname, lab, xesc(B.TITLES[slug])))
    rows += [li(d) for d in back]
    first = chs[0].fname
    body = ('<nav epub:type="toc" id="toc" class="toc" role="doc-toc"><h1>Contents</h1><ol>%s</ol></nav>\n'
            '<nav epub:type="landmarks" id="landmarks" hidden=""><h2>Landmarks</h2><ol>'
            '<li><a epub:type="cover" href="cover.xhtml">Cover</a></li>'
            '<li><a epub:type="titlepage" href="title.xhtml">Title page</a></li>'
            '<li><a epub:type="copyright-page" href="copyright.xhtml">Copyright</a></li>'
            '<li><a epub:type="toc" href="nav.xhtml#toc">Contents</a></li>'
            '<li><a epub:type="bodymatter" href="%s">%s</a></li>'
            '<li><a epub:type="glossary" href="glossary.xhtml">Words used in this book</a></li>'
            '</ol></nav>') % (''.join(rows), first, xesc(chs[0].title))
    return xhtml('Contents', body)


def opf(book, items, spine, modified, ident):
    n = book['n']
    md = []
    md.append('<dc:identifier id="uid">%s</dc:identifier>' % ident)
    if book.get('isbn_ebook'):
        md.append('<dc:identifier id="isbn">urn:isbn:%s</dc:identifier>' % xesc(re.sub(r'[^0-9Xx]', '', book['isbn_ebook'])))
    md.append('<dc:title id="title">%s</dc:title>' % xesc(book['title']))
    md.append('<meta refines="#title" property="title-type">main</meta>')
    md.append('<dc:title id="subtitle">%s</dc:title>' % xesc(book['sub']))
    md.append('<meta refines="#subtitle" property="title-type">subtitle</meta>')
    md.append('<meta property="belongs-to-collection" id="series">%s</meta>' % xesc(SERIES_TITLE))
    md.append('<meta refines="#series" property="collection-type">series</meta>')
    md.append('<meta refines="#series" property="group-position">%d</meta>' % n)
    md.append('<dc:creator id="author">%s</dc:creator>' % xesc(B.AUTHOR))
    md.append('<meta refines="#author" property="role" scheme="marc:relators">aut</meta>')
    md.append('<meta refines="#author" property="file-as">%s</meta>' % xesc(B.AUTHOR))
    md.append('<dc:language>en-GB</dc:language>')
    md.append('<dc:publisher id="publisher">%s</dc:publisher>' % xesc(PUBLISHER))
    if IMPRINT:
        md.append('<meta refines="#publisher" property="display-seq">1</meta><dc:contributor id="imprint">%s</dc:contributor>' % xesc(IMPRINT))
        md.append('<meta refines="#imprint" property="role" scheme="marc:relators">pbl</meta>')
    md.append('<dc:rights>Text and pictures © 2026 %s. Every chapter is also free to read at spreadloveandacceptance.com.</dc:rights>' % xesc(B.AUTHOR))
    md.append('<dc:description>%s</dc:description>' % xesc(book.get('blurb', book['line'])))
    md.append('<dc:subject>Self-help</dc:subject><dc:subject>Relationships</dc:subject>')
    md.append('<dc:source>%s/book/</dc:source>' % SITE)
    md.append('<meta property="dcterms:modified">%s</meta>' % modified)
    md.append('<meta name="cover" content="cover-image"/>')
    # accessibility (schema.org), as EPUB Accessibility 1.1 asks
    for k, v in [('accessMode', 'textual'), ('accessMode', 'visual'), ('accessModeSufficient', 'textual'),
                 ('accessibilityFeature', 'alternativeText'), ('accessibilityFeature', 'tableOfContents'), ('accessibilityFeature', 'readingOrder'),
                 ('accessibilityFeature', 'structuralNavigation'), ('accessibilityHazard', 'none')]:
        md.append('<meta property="schema:%s">%s</meta>' % (k, v))
    md.append('<meta property="schema:accessibilitySummary">Reflowable text with headings, a table of contents and alternative text for every picture. '
              'The figures are also described in their captions. No sound, video or flashing content.</meta>')
    man = ''.join('<item id="%s" href="%s" media-type="%s"%s/>' % (i, h, t, (' properties="%s"' % p) if p else '') for i, h, t, p in items)
    sp = ''.join('<itemref idref="%s"%s/>' % (i, '' if lin else ' linear="no"') for i, lin in spine)
    guide = '<guide><reference type="cover" title="Cover" href="cover.xhtml"/><reference type="toc" title="Contents" href="nav.xhtml"/><reference type="text" title="Start" href="%s.xhtml"/></guide>' % book['chapters'][0]
    return ('<?xml version="1.0" encoding="UTF-8"?>\n<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="uid" xml:lang="en-GB" '
            'prefix="schema: http://schema.org/">\n<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n%s\n</metadata>\n<manifest>\n%s\n</manifest>\n'
            '<spine>\n%s\n</spine>\n%s\n</package>\n') % ('\n'.join(md), man.replace('/><', '/>\n<'), sp.replace('/><', '/>\n<'), guide)


CONTAINER = '''<?xml version="1.0" encoding="UTF-8"?>
<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container">
<rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles>
</container>
'''


def build(book, where, images, pics):
    docs, figs, exs = book_docs(book, where)
    nav_at = docs.index(None)
    docs = [d for d in docs if d is not None]
    used = set()
    # html -> tree -> ebook tree
    for d in docs:
        d.root = transform(parse(pre(d.html)), images, used, d.heading_shift)
    return docs, nav_at, used, figs, exs


def resolve_links(docs):
    """#id -> file.xhtml#id across the book's files; reports what doesn't resolve"""
    ids = {}
    for d in docs:
        for el in d.root.walk():
            i = el.attrs.get('id')
            if i:
                if i in ids and ids[i] == d.fname:
                    warn('%s: id used twice: %s' % (d.fname, i))
                ids.setdefault(i, d.fname)
    bad = []
    for d in docs:
        for el in d.root.walk():
            h = el.attrs.get('href') if el.tag == 'a' else None
            if h and h.startswith('#'):
                f = ids.get(h[1:])
                if not f:
                    bad.append('%s: %s' % (d.fname, h))
                    # the chapter's id without the section: the chapter itself
                    base = h[1:].split('--')[0]
                    if base in ids:
                        el.attrs['href'] = '%s#%s' % (ids[base], base)
                    continue
                el.attrs['href'] = h if f == d.fname else '%s%s' % (f, h)
    return bad


def site_link_ok(url, cache={}):
    """a link to the site: does the page (and its #id) exist in the repo?"""
    if url in cache:
        return cache[url]
    p = url[len(SITE):] or '/'
    path, _, frag = p.partition('#')
    path = path.split('?')[0]
    f = os.path.join(ROOT, path.lstrip('/'))
    if path.endswith('/'):
        f = os.path.join(f, 'index.html')
    elif not os.path.splitext(f)[1]:
        f = f + '.html' if os.path.isfile(f + '.html') else os.path.join(f, 'index.html')
    ok = os.path.isfile(f)
    if ok and frag and f.endswith('.html'):
        ok = bool(re.search(r'\bid=["\']%s["\']' % re.escape(frag), B.read(f)))
    cache[url] = ok
    return ok


def write_epub(book, docs, nav_at, used, pics, path):
    acc = book['color']
    ident = 'urn:uuid:%s' % uuid.uuid5(uuid.NAMESPACE_URL, '%s/book/%s#ebook' % (SITE, book['id']))
    epoch = os.environ.get('SOURCE_DATE_EPOCH')
    now = datetime.fromtimestamp(int(epoch), timezone.utc) if epoch else datetime.now(timezone.utc)
    modified = now.strftime('%Y-%m-%dT%H:%M:%SZ')
    files = {}  # name in OEBPS -> bytes
    items, spine = [], []
    for k, d in enumerate(docs):
        if k == nav_at:
            files['nav.xhtml'] = nav_xhtml(book, docs).encode('utf-8')
            items.append(('nav', 'nav.xhtml', 'application/xhtml+xml', 'nav'))
            spine.append(('nav', True))
        body = serialize(d.root)
        files[d.fname] = xhtml(d.title, body, d.body_type if d.body_type in ('bodymatter',) else '').encode('utf-8')
        iid = 'x-' + re.sub(r'[^A-Za-z0-9-]', '-', d.fname[:-6])
        items.append((iid, d.fname, 'application/xhtml+xml', ''))
        spine.append((iid, True))
    files['css/book.css'] = (CSS % {'acc': acc}).encode('utf-8')
    items.append(('css', 'css/book.css', 'text/css', ''))
    cover = os.path.join(ROOT, 'book', 'print', 'cover-%s-front.jpg' % book['id'])
    files['images/cover.jpg'] = open(cover, 'rb').read()
    items.append(('cover-image', 'images/cover.jpg', 'image/jpeg', 'cover-image'))
    for name in sorted(used | {'art-' + book['art']}):
        if name not in pics:
            warn('%s: picture not made: %s' % (book['id'], name))
            continue
        src, mt, ext = pics[name]
        files['images/' + name + ext] = open(src, 'rb').read()
        items.append(('img-' + name, 'images/' + name + ext, mt, ''))
        if ext == '.svg':
            # the pages still point at .png: point them at the .svg instead
            for f in list(files):
                if f.endswith('.xhtml'):
                    files[f] = files[f].replace(('images/%s.png' % name).encode(), ('images/%s.svg' % name).encode())
    files['content.opf'] = opf(book, items, spine, modified, ident).encode('utf-8')
    tmp = path + '.tmp'
    with zipfile.ZipFile(tmp, 'w') as z:
        zi = zipfile.ZipInfo('mimetype', date_time=(2026, 10, 18, 0, 0, 0))
        zi.compress_type = zipfile.ZIP_STORED
        z.writestr(zi, b'application/epub+zip')
        z.writestr(zipfile.ZipInfo('META-INF/container.xml', date_time=now.timetuple()[:6]), CONTAINER, compress_type=zipfile.ZIP_DEFLATED)
        for name in ['content.opf'] + sorted(f for f in files if f != 'content.opf'):
            zi = zipfile.ZipInfo('OEBPS/' + name, date_time=now.timetuple()[:6])
            zi.compress_type = zipfile.ZIP_STORED if name.endswith(('.jpg', '.png')) else zipfile.ZIP_DEFLATED
            z.writestr(zi, files[name])
    os.replace(tmp, path)
    return ident


# ---------- checks ----------
NS = {'opf': 'http://www.idpf.org/2007/opf', 'x': 'http://www.w3.org/1999/xhtml', 'c': 'urn:oasis:names:tc:opendocument:xmlns:container',
      'epub': 'http://www.idpf.org/2007/ops'}


def check_epub(path, book):
    """the checks run on every build; returns (problems, facts)"""
    bad, facts = [], {}
    with zipfile.ZipFile(path) as z:
        infos = z.infolist()
        if not infos or infos[0].filename != 'mimetype' or infos[0].compress_type != zipfile.ZIP_STORED or z.read('mimetype') != b'application/epub+zip':
            bad.append('mimetype is not the first, uncompressed entry')
        if infos and infos[0].extra:
            bad.append('mimetype entry has an extra field')
        names = set(z.namelist())
        cont = ET.fromstring(z.read('META-INF/container.xml'))
        opf_path = cont.find('.//c:rootfile', NS).get('full-path')
        base = os.path.dirname(opf_path)
        pkg = ET.fromstring(z.read(opf_path))
        man = {}
        for it in pkg.findall('.//opf:manifest/opf:item', NS):
            href = os.path.normpath(os.path.join(base, it.get('href'))).replace(os.sep, '/')
            man[it.get('id')] = (href, it.get('media-type'), it.get('properties') or '')
            if href not in names:
                bad.append('manifest item missing from the zip: ' + href)
        listed = {h for h, _t, _p in man.values()}
        for nm in names:
            if nm not in listed and nm not in ('mimetype', 'META-INF/container.xml', opf_path):
                bad.append('file in the zip but not in the manifest: ' + nm)
        if not any('cover-image' in p for _h, _t, p in man.values()):
            bad.append('no cover-image')
        if not any('nav' in p.split() for _h, _t, p in man.values()):
            bad.append('no nav document')
        spine = [man[r.get('idref')][0] for r in pkg.findall('.//opf:spine/opf:itemref', NS)]
        md = pkg.find('opf:metadata', NS)
        txt = ET.tostring(md, encoding='unicode')
        for need in ('belongs-to-collection', 'group-position', 'dcterms:modified', 'title-type', 'dc:language', 'dc:creator', 'dc:publisher', 'dc:identifier'):
            if need.split(':')[-1] not in txt:
                bad.append('metadata lacks ' + need)
        # every XHTML file parses as XML; collect ids and links
        ids, links, imgs = {}, [], 0
        for h, t, _p in man.values():
            if t != 'application/xhtml+xml':
                continue
            try:
                doc = ET.fromstring(z.read(h))
            except ET.ParseError as e:
                bad.append('not well-formed: %s (%s)' % (h, e))
                continue
            ids[h] = {el.get('id') for el in doc.iter() if el.get('id')}
            for el in doc.iter():
                tag = el.tag.split('}')[-1]
                if tag in ('a', 'link') and el.get('href'):
                    links.append((h, el.get('href')))
                if tag == 'img':
                    imgs += 1
                    if el.get('alt') is None:
                        bad.append('img without alt in %s: %s' % (h, el.get('src')))
                    links.append((h, el.get('src')))
                if tag == 'script':
                    bad.append('script in ' + h)
        ext, site_bad = 0, []
        for h, href in links:
            if re.match(r'^(https?|mailto|tel):', href):
                ext += 1
                if href.startswith(SITE) and not site_link_ok(href):
                    site_bad.append(href)
                continue
            f, _, frag = href.partition('#')
            tgt = os.path.normpath(os.path.join(os.path.dirname(h), f)).replace(os.sep, '/') if f else h
            if tgt not in names:
                bad.append('link to a missing file in %s: %s' % (h, href))
            elif frag and frag not in ids.get(tgt, set()):
                bad.append('link to a missing #id in %s: %s' % (h, href))
        for u in sorted(set(site_bad)):
            bad.append('link to a page the site does not have: ' + u)
        # the nav lists every chapter, in the spine's order
        navh = next(h for h, _t, p in man.values() if 'nav' in p.split())
        nav = ET.fromstring(z.read(navh))
        toc = [el for el in nav.iter('{%s}nav' % NS['x']) if el.get('{%s}type' % NS['epub']) == 'toc'][0]
        toc_files = [a.get('href').split('#')[0] for a in toc.iter('{%s}a' % NS['x'])]
        ch_files = [s_ + '.xhtml' for s_ in book['chapters']]
        if [f for f in toc_files if f in ch_files] != ch_files:
            bad.append('the contents do not list the chapters in order')
        if [os.path.basename(s_) for s_ in spine if os.path.basename(s_) in ch_files] != ch_files:
            bad.append('the spine does not hold the chapters in order')
        lm = [el for el in nav.iter('{%s}nav' % NS['x']) if el.get('{%s}type' % NS['epub']) == 'landmarks']
        if not lm:
            bad.append('no landmarks nav')
        facts = {'files': len(names), 'xhtml': len(ids), 'links_inside': len(links) - ext, 'links_out': ext, 'images': imgs,
                 'spine': len(spine), 'site_links_checked': len({u for _h, u in links if u.startswith(SITE)})}
        # nothing left from print
        for h in ids:
            s = z.read(h).decode('utf-8')
            plain = re.sub(r'<[^>]+>', ' ', s)
            for pat, what in [(r'pe-pg|pe-qr|zq[a-z0-9x]+qz', 'print-only markup'), (r'\b[Ss]can (?:a|the|this) code|QR code', 'QR wording'),
                              (r'\(page\s*\)|\bpage\s+\d+\b', 'a page number')]:
                m = re.search(pat, s if what == 'print-only markup' else plain)
                if m:
                    bad.append('%s left in %s: %s' % (what, h, plain[max(0, m.start() - 40):m.end() + 40].strip() if what != 'print-only markup' else m.group(0)))
    return bad, facts


def epubcheck(jar, path):
    try:
        r = subprocess.run(['java', '-jar', jar, path], capture_output=True, text=True, timeout=600)
    except Exception as e:
        return None, str(e)
    out = '\n'.join(l for l in (r.stdout + r.stderr).splitlines() if 'JAVA_TOOL_OPTIONS' not in l)
    return r.returncode == 0, out


def main():
    args = [a for a in sys.argv[1:]]
    jar = None
    if '--epubcheck' in args:
        i = args.index('--epubcheck')
        jar = args[i + 1]
        del args[i:i + 2]
    want = set(args)
    os.makedirs(OUT, exist_ok=True)
    where = S.where_map()
    books = [b for b in S.books() if not want or b['id'] in want]
    tmp = tempfile.mkdtemp(prefix='epub-pics-')
    images = Images(tmp)
    for key, svg, _alt in FRIENDS:
        images.svg_string(key, svg, 64, 'circle', scale=3)
    for b in books:
        images.svg_string('art-' + b['art'], book_art.illustration(b['art']), 400, 'white', scale=2)
    built = []
    for b in books:
        docs, nav_at, used, figs, exs = build(b, where, images, None)
        bad_links = resolve_links(docs)
        for x in bad_links:
            warn('%s: link inside the book has no target (sent to the chapter): %s' % (b['id'], x))
        built.append((b, docs, nav_at, used, figs, exs))
    pics = images.render()
    report = {}
    try:
        report = json.load(open(os.path.join(OUT, 'epub.json'), encoding='utf-8'))
    except Exception:
        report = {}
    report.setdefault('books', {})
    report['about'] = ('Made by tools/book/build_epub.py (epub13): the Kindle ebooks (EPUB 3) of the print series. Upload <id>.epub as the Kindle '
                       'manuscript and cover-<id>-front.jpg as the Kindle cover. The workbook has no ebook (print only).')
    fails = 0
    for b, docs, nav_at, used, figs, exs in built:
        path = os.path.join(OUT, b['id'] + '.epub')
        ident = write_epub(b, docs, nav_at, used, pics, path)
        bad, facts = check_epub(path, b)
        ec = None
        if jar:
            ok, out = epubcheck(jar, path)
            ec = {'ok': ok, 'summary': next((l for l in out.splitlines() if l.startswith('Messages:')), out.strip().splitlines()[-1] if out.strip() else '')}
            if not ok:
                print(out)
                fails += 1
        size = os.path.getsize(path)
        report['books'][b['id']] = {'file': 'book/print/epub/%s.epub' % b['id'], 'bytes': size, 'mb': round(size / 1048576, 2), 'identifier': ident,
                                    'chapters': len(b['chapters']), 'figures': len(figs), 'examples': len(exs), 'images': facts.get('images'),
                                    'links_out': facts.get('links_out'), 'links_inside': facts.get('links_inside'), 'checks': 'pass' if not bad else bad,
                                    'epubcheck': ec}
        for x in bad:
            print('epub: PROBLEM %s: %s' % (b['id'], x))
        fails += 1 if bad else 0
        print('epub: %s.epub  %.2f MB, %d chapters, %d figures, %d filled-in examples, %d pictures, %d links out (%d to the site, all real pages), %d inside%s' % (
            b['id'], size / 1048576, len(b['chapters']), len(figs), len(exs), facts.get('images', 0), facts.get('links_out', 0),
            facts.get('site_links_checked', 0), facts.get('links_inside', 0), ('; EPUBCheck: ' + ec['summary']) if ec else ''))
    report['workbook'] = 'No ebook: the workbook is print only. Its forms are made to be written in, and every one is free to print or fill in at spreadloveandacceptance.com/workpapers/fill/.'
    with open(os.path.join(OUT, 'epub.json'), 'w', encoding='utf-8') as f:
        json.dump(report, f, indent=1, ensure_ascii=False)
        f.write('\n')
    shutil.rmtree(tmp, ignore_errors=True)
    for w in WARN:
        print('epub: WARNING', w)
    if fails:
        sys.exit(1)


if __name__ == '__main__':
    main()
