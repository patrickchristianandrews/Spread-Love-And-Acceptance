#!/usr/bin/env python3
"""series_text.py: how the print series talks about itself (printfix13).

Each print book is a slice of the online book, so the chapter pages name other chapters the online way ("Part Two,
Chapter IV", "Chapter 13", "the Preface"). In print, that is wrong: the reader holds Book 2, not the online book.
tools/book/build_series.py runs every chapter through this module, which

  * renames every link to another chapter in series terms: "Chapter 3 (page 41)" for one in the same book,
    "Book 2, Chapter 1 (page 7)" for one in another book of the series. The page numbers in this book are filled by
    build_pdfs.js; the ones in other books come from the last print run (book/print/series.json), so a full rebuild
    runs build_series.py and build_pdfs.js twice when page counts move;
  * drops the online back/next rows ("← Chapter 10 · Chapter 12 →");
  * applies the print-only wording in tools/book/series-text.json ("swaps": exact find/replace pairs per chapter;
    each one must match exactly once, or the build stops);
  * checks the printed text (check_printed) for any reference that can't be right in a book of the series: the online
    Part names, Roman chapter numbers, "the Preface", "earlier in the book", a "Chapter M" this book doesn't have,
    a "Book N, Chapter M" the series doesn't have. build_series.py stops when it finds one, and
    tools/book/check_series_refs.py runs the same checks on the printed PDFs.
"""
import html
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
TEXT = json.load(open(os.path.join(HERE, 'series-text.json'), encoding='utf-8'))


def printed_pagemaps():
    """{book id: {key: page}} from the last print run (book/print/series.json)."""
    try:
        made = json.load(open(os.path.join(ROOT, 'book', 'print', 'series.json'), encoding='utf-8'))
    except (OSError, ValueError):
        return {}
    return dict((k, v.get('pagemap', {})) for k, v in (made.get('books') or {}).items())


PAGEMAPS = printed_pagemaps()
MISSING_PAGES = []


class Namer(object):
    """Names chapters for one book of the series."""

    def __init__(self, book, books, pg):
        self.book, self.books, self.pg = book, books, pg
        self.where = {}
        for b in books:
            for s in b['chapters']:
                self.where[s] = b
        self.here = set(book['chapters'])

    @staticmethod
    def num(slug, book):
        if slug == 'afterword':
            return 0
        return [s for s in book['chapters'] if s != 'afterword'].index(slug) + 1

    def label(self, slug, short=False):
        """'Chapter 3' (this book) or 'Book 2, Chapter 3' (another book); the afterword is 'the Afterword'."""
        b = self.where.get(slug)
        if not b:
            return None
        n = self.num(slug, b)
        lab = ('Chapter %d' % n) if n else 'the Afterword'
        if b is self.book:
            return lab
        return 'Book %d, %s' % (b['n'], lab)

    def other_page(self, slug):
        b = self.where.get(slug)
        if not b or b is self.book:
            return ''
        p = PAGEMAPS.get(b['id'], {}).get(slug)
        if not p:
            MISSING_PAGES.append('%s in %s' % (slug, b['id']))
            return ''
        return str(p)

    def page_html(self, slug, key=None):
        """the page: a slot in this book (filled by build_pdfs.js), a number in another"""
        if slug in self.here:
            return self.pg(key or slug)
        return self.other_page(slug)

    def ref(self, slug):
        """for front_back.Ctx(series_ref=...): (label, page or '')"""
        lab = self.label(slug)
        lab = lab[0].upper() + lab[1:] if lab else slug
        return lab, self.other_page(slug)


# a reference to a chapter, the online way, inside a link's text
_PART = r'Part (?:One|Two|Three)(?:’s|\'s)?'
_CH = r'(?:Chapter\s+(?:[IVX]+|\d+)\b|(?:the\s+)?[Pp]reface(?:\s+to\s+Part\s+Two)?|(?:the\s+)?[Aa]fterword)'
REF_RE = re.compile(r'(?:\b%s(?:\s*[,·:]\s*|\s+)(?:%s|Then|Now|Next)\b|\b%s|\b%s)' % (_PART, _CH, _CH, _PART))
REF_ONLY_START = re.compile(r'^(?:Then|Now|Next)$')
LINK_RE = re.compile(r'<a\b([^>]*)>(.*?)</a>', re.S)
BOOK_HREF = re.compile(r'^(?:https://spreadloveandacceptance\.com)?/book/([a-z0-9-]+?)(-in-depth)?\.html(?:#([^"]*))?$')


def series_links(body, slug, namer, xref_add):
    """Every link to another chapter, named the series way, with its page."""
    def sub(m):
        attrs, text = m.group(1), m.group(2)
        hm = re.search(r'\bhref="([^"]+)"', attrs)
        if not hm or 'class="dig' in attrs:
            return m.group(0)
        h = html.unescape(hm.group(1))
        tgt, deep, frag = None, False, ''
        if h.startswith('#'):
            t = h[1:]
            ch = t.split('--')[0]
            if ch not in namer.where or ch == slug:
                return m.group(0)
            tgt, frag = ch, (t if '--' in t else '')
        else:
            bm = BOOK_HREF.match(h)
            if not bm or bm.group(1) not in namer.where:
                return m.group(0)
            tgt, deep, frag = bm.group(1), bool(bm.group(2)), bm.group(3) or ''
        if tgt == slug and (deep or not frag):
            return m.group(0)
        plain = re.sub(r'<[^>]+>', '', text).strip()
        rm = REF_RE.search(text)
        if not rm and REF_ONLY_START.match(plain):
            rm = re.search(re.escape(plain), text)
        lab = namer.label(tgt)
        if deep and not rm:
            # a topic in the full online chapter ("masking"): build_book.print_links adds its short address
            return m.group(0)
        # the page: this book's slot (the place itself when the link names a section), or the other book's number
        key = tgt
        if tgt in namer.here and frag and not deep and '--' in frag:
            xref_add(frag)
            key = 'a-' + frag
        page = namer.page_html(tgt, key)
        in_here = tgt in namer.here
        new_attrs = attrs
        if deep or not in_here:
            # in print this goes to the chapter in this book or in another book of the series
            new_attrs = re.sub(r'\bhref="[^"]*"', 'href="#%s"' % tgt if in_here else 'href="https://spreadloveandacceptance.com/book/%s.html"' % tgt, attrs)
        new_attrs += ' data-u="series"'
        if rm:
            start, end = rm.start(), rm.end()
            new_text = text[:start] + (lab if start else lab[0].upper() + lab[1:]) + text[end:]
            note = ''
            if in_here:
                note = '<span class="pe-only pe-xref"> (page %s)</span>' % page
            elif page:
                note = ' (page %s)' % page
            return '<a%s>%s</a>%s' % (new_attrs, new_text, note)
        # a link that names the chapter by its title: add where it is
        if in_here:
            note = '<span class="pe-only pe-xref"> (%s, page %s)</span>' % (lab, page)
        else:
            note = ' (%s%s)' % (lab, (', page %s' % page) if page else '')
        return '<a%s>%s</a>%s' % (new_attrs, text, note)
    return LINK_RE.sub(sub, body)


NAV_ROW = re.compile(r'<(p|li)\b[^>]*>((?:(?!</?(?:p|li)\b).)*?)</\1>', re.S)


def drop_nav_rows(body):
    """The online book's back/next rows mean nothing in print."""
    def sub(m):
        inner = m.group(2)
        txt = html.unescape(re.sub(r'<[^>]+>', '', inner)).strip()
        links = re.findall(r'<a\b[^>]*>(.*?)</a>', inner, re.S)
        if not links:
            return m.group(0)
        rest = re.sub(r'<a\b[^>]*>.*?</a>', '', inner, flags=re.S)
        rest = html.unescape(re.sub(r'<[^>]+>', '', rest)).strip(' ·|.\n\t')
        navish = any(re.search(r'(←|→|^\s*(?:Back|Next)(?: in [^:]+)?:)', html.unescape(re.sub(r'<[^>]+>', '', l))) for l in links)
        if navish and not rest:
            return ''
        return m.group(0)
    return NAV_ROW.sub(sub, body)


def apply_swaps(s, slug, pgfn, where_label):
    """The print-only wording for one chapter (series-text.json "swaps"). {page:KEY} is a page slot in this book;
    {ref:SLUG} the series name of a chapter with its page."""
    errors = []
    for sw in TEXT.get('swaps', []):
        if sw['slug'] != slug:
            continue
        n = s.count(sw['find'])
        if n != 1:
            errors.append('swap for %s matched %d times: %r' % (slug, n, sw['find'][:70]))
            continue
        rep = re.sub(r'\{page:([^}]+)\}', lambda m: pgfn(m.group(1)), sw['replace'])
        rep = re.sub(r'\{ref:([^}]+)\}', lambda m: where_label(m.group(1)), rep)
        s = s.replace(sw['find'], rep)
    return s, errors


# ---------- the checks ----------
BAD = [
    (re.compile(r'\bPart (?:One|Two|Three)\b'), 'names a Part of the online book'),
    (re.compile(r'\bChapter [IVX]+\b'), 'uses a Roman chapter number'),
    (re.compile(r'\b[Tt]he Preface\b|\bPreface to Part\b|\bthis preface\b'), 'names the online Preface'),
    (re.compile(r'\b(?:earlier|later) in the book\b'), 'says "earlier/later in the book"'),
    (re.compile(r'\b[Tt]he (?:last|previous|next) chapter\b'), 'points to the last/next chapter'),
    (re.compile(r'\bfirst two chapters of\b'), 'points to the online order'),
    (re.compile(r'\bonline: (?:Part|Preface|Afterword)'), 'online numbering in a chapter opener'),
]
HIDDEN_CLASSES = ('no-print', 'pe-noprint', 'dig', 'depth-bar', 'pillar-line', 'whole-top', 'book-end', 'book-open', 'read-head')


def printed_text(s):
    """the text of a print page as it prints: no hidden elements, scripts or tags"""
    s = re.sub(r'<(script|style)\b.*?</\1>', ' ', s, flags=re.S)
    for c in HIDDEN_CLASSES:
        while True:
            m = re.search(r'<([a-z0-9]+)\b[^>]*\bclass="(?:[^"]*\s)?%s(?:\s[^"]*)?"[^>]*>' % re.escape(c), s)
            if not m:
                break
            tag = m.group(1)
            depth, i = 0, m.start()
            for t in re.finditer(r'<(/?)%s\b[^>]*?(/?)>' % tag, s[m.start():]):
                if t.group(2):
                    continue
                depth += -1 if t.group(1) else 1
                if depth == 0:
                    i = m.start() + t.end()
                    break
            else:
                i = m.end()
            s = s[:m.start()] + ' ' + s[i:]
    s = re.sub(r'<span class="pe-mark"[^>]*>.*?</span>', '', s)
    s = re.sub(r'<[^>]+>', ' ', s)
    return re.sub(r'\s+', ' ', html.unescape(s))


def check_text(text, book, books, label):
    """Errors in one printed book's text."""
    out = []
    n_here = len([s for s in book['chapters'] if s != 'afterword'])
    for rx, why in BAD:
        for m in rx.finditer(text):
            out.append('%s: %s: …%s…' % (label, why, text[max(0, m.start() - 50):m.end() + 30]))
    for m in re.finditer(r'(?<!Book \d, )(?<!Book \d )\bChapter (\d+)\b', text):
        k = int(m.group(1))
        if k < 1 or k > n_here:
            out.append('%s: no Chapter %d in this book: …%s…' % (label, k, text[max(0, m.start() - 50):m.end() + 30]))
    nb = dict((b['n'], b) for b in books)
    for m in re.finditer(r'\bBook (\d), Chapter (\d+)\b', text):
        b = nb.get(int(m.group(1)))
        k = int(m.group(2))
        if not b or k < 1 or k > len([s for s in b['chapters'] if s != 'afterword']):
            out.append('%s: no %s in the series: …%s…' % (label, m.group(0), text[max(0, m.start() - 50):m.end() + 30]))
    return out
