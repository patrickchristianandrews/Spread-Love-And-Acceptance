#!/usr/bin/env python3
"""front_back.py: the extra front and back matter of the print edition (bookfixB1).

tools/book/build_book.py imports this and places what it returns. Nothing here writes a file.

Front of the book (print only, like the rest of the front matter):
  help-now      "If you need help now": crisis lines for several countries     (front-help-now.html)
  find-it-fast  "Find it fast": everyday problems mapped to chapter, page, tool (front-find-it-fast.json)
  handed        "If someone handed you this book"                             (front-handed-this-book.html)
Back of the book:
  numbers       "How the numbers work": every score in plain arithmetic       (back-numbers.html)
  worksheets    "Blank worksheets": one printable page each (print only)      (back-worksheets.html)
  and a "Reading research" box for the top of the research notes            (back-reading-research.html)

How build_book.py uses it (see the bookfixB1 fixnote for the exact patch):
    import front_back
    ctx = front_back.Ctx(name, deep, parts, here, PAGES, pg, mark, lambda s: chapter_name(entry(s)), SHORT, SITE)
    front_back.front_sections(ctx)   -> [{'key', 'toc', 'html'}], in reading order
    front_back.back_sections(ctx)    -> [{'key', 'toc', 'html'}], placed before the glossary
    front_back.reading_research(ctx) -> html, placed right after the research notes' first paragraph
    front_back.STYLE                 -> a <style> block for the package's <head>
    Section page numbers: pass xref=XREFS.add to Ctx (and build the sections before finish_package runs);
    the keys are then 'a-slug--id', marked by finish_package like print_links' cross-references. Without
    xref, the keys are 'slug--id' and front_back.add_section_marks(page, mark) puts the markers in.

Template words inside the .html fragments:
    {{ref:KEY|Label}}   a link to a place in the book with its page number, or "(online)" when that chapter
                        isn't in this copy. KEY is a chapter slug, "slug#id" for a section (the id as it is on
                        the chapter page), or a front/back section key (help-now, find-it-fast, handed,
                        numbers, worksheets).
    {{pg:KEY}}          just the page number slot for KEY (same KEY forms).
    {{site}}            spreadloveandacceptance.com
  Any element with data-parts="2" (or "1 3", ...) is kept only in a copy that holds one of those parts.
  Any element with data-pkg="whole together" is kept only in those packages.
"""
import html
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
FRONT_KEYS = ('help-now', 'find-it-fast', 'handed')
BACK_KEYS = ('numbers', 'worksheets')


class Ctx(object):
    def __init__(self, name, deep, parts, here, pages, pg, mark, chapter_name, short, site, xref=None, series_ref=None):
        # xref: build_book's way of asking for a page marker at a section (add the target to XREFS); the page
        # key is then 'a-' + target, as print_links uses. Without it, add_section_marks() places the markers.
        # series_ref (printfix13): the print series' way of naming a chapter, slug -> (label, page html or ''):
        # "Chapter 3" and its page slot in this book, or "Book 2, Chapter 3" and that book's page number. It replaces
        # the template's own label (which uses the online book's Part/Chapter numbering).
        self.xref = xref
        self.series_ref = series_ref
        self.name, self.deep, self.parts, self.here = name, deep, tuple(parts), set(here)
        self.pages, self.pg, self.mark, self.chapter_name, self.short = pages, pg, mark, chapter_name, short
        self.site = site.rstrip('/')
        self.sections = set(k for k, _t, _f, pk, _p in SECTIONS if self.wants(pk, _p))
        self.warnings = []

    def wants(self, pkgs, parts):
        return (not pkgs or self.name in pkgs) and (not parts or any(p in self.parts for p in parts))


# (key, contents label, file, packages that get it (None = all), parts it needs (None = any))
SECTIONS = [
    ('help-now', 'If you need help now', 'front-help-now.html', None, None),
    ('find-it-fast', 'Find it fast', 'front-find-it-fast.json', None, None),
    ('handed', 'If someone handed you this book', 'front-handed-this-book.html', ('whole', 'together'), None),
    ('numbers', 'How the numbers work', 'back-numbers.html', None, None),
    ('worksheets', 'Blank worksheets', 'back-worksheets.html', None, None),
]


def esc(s):
    return html.escape(s, quote=True)


def read(name):
    with open(os.path.join(HERE, name), encoding='utf-8') as f:
        return f.read()


# ---------- small HTML helpers ----------
TAG_RE = re.compile(r'<(/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(/?)>')
VOID = {'br', 'img', 'hr', 'input', 'meta', 'link', 'source', 'wbr', 'col', 'area', 'base', 'embed', 'param', 'track'}


def element_end(s, i):
    m = TAG_RE.match(s, i)
    if not m:
        return i
    name = m.group(2).lower()
    if name in VOID or m.group(3):
        return m.end()
    depth = 0
    for t in TAG_RE.finditer(s, i):
        if t.group(2).lower() != name or t.group(3):
            continue
        depth += -1 if t.group(1) else 1
        if depth == 0:
            return t.end()
    return len(s)


def filter_parts(ctx, s):
    """Drop the elements whose data-parts / data-pkg say they don't belong in this copy; strip the attributes."""
    pos = 0
    while True:
        m = re.compile(r'<[a-zA-Z][^>]*\bdata-(parts|pkg)="([^"]*)"[^>]*>').search(s, pos)
        if not m:
            break
        vals = m.group(2).split()
        keep = any(int(v) in ctx.parts for v in vals if v.isdigit()) if m.group(1) == 'parts' else ctx.name in vals
        if keep:
            tag = re.sub(r'\s+data-(parts|pkg)="[^"]*"', '', m.group(0))
            s = s[:m.start()] + tag + s[m.end():]
            pos = m.start() + len(tag)
        else:
            j = element_end(s, m.start())
            s = s[:m.start()] + s[j:]
            pos = m.start()
    return s


def ids_in(ctx, slug):
    page = ctx.pages.get((slug, ctx.deep)) or ''
    return set(re.findall(r'\bid="([^"]+)"', page))


def resolve(ctx, key):
    """KEY -> (href, page key or None, in this copy?). KEY: slug, slug#id, or a front/back section key."""
    if key in FRONT_KEYS or key in BACK_KEYS:
        if key in ctx.sections:
            return '#' + key, key, True
        return None, None, False
    slug, _, sec = key.partition('#')
    if slug not in ctx.short:
        ctx.warnings.append('front_back: unknown chapter %r' % slug)
        return None, None, False
    if slug in ctx.here:
        if sec and sec in ids_in(ctx, slug):
            tgt = '%s--%s' % (slug, sec)
            if ctx.xref:
                ctx.xref(tgt)
                return '#' + tgt, 'a-' + tgt, True
            return '#' + tgt, tgt, True
        if sec and sec not in set(re.findall(r'\bid="([^"]+)"', ctx.pages.get((slug, not ctx.deep)) or '')):
            # an id that only the other version has is expected (the short pages have fewer sections)
            ctx.warnings.append('front_back: #%s not found in %s%s, using the chapter start' % (sec, slug, '-in-depth' if ctx.deep else ''))
        return '#' + slug, slug, True
    url = '%s/book/%s%s.html%s' % (ctx.site, slug, '-in-depth' if ctx.deep else '', ('#' + sec) if sec and sec in ids_in(ctx, slug) else '')
    return url, None, False


def ref(ctx, key, label):
    href, pkey, inside = resolve(ctx, key)
    slug = key.partition('#')[0]
    if ctx.series_ref and slug in ctx.short:
        lab, page = ctx.series_ref(slug)
        if inside:
            return '<a href="%s">%s</a>, page %s' % (href, esc(lab), ctx.pg(pkey))
        if page is None:
            # an ebook: no page numbers for the other books
            return esc(lab)
        return '%s, page %s' % (esc(lab), page) if page else '%s (online)' % esc(lab)
    if inside:
        return '<a href="%s">%s</a>, page %s' % (href, label, ctx.pg(pkey))
    if href:
        return '<a href="%s">%s</a> (online)' % (href, label)
    return label


def fill(ctx, s):
    s = filter_parts(ctx, s)
    s = s.replace('{{site}}', 'spreadloveandacceptance.com')
    s = re.sub(r'\{\{ref:([^|}]+)\|([^}]+)\}\}', lambda m: ref(ctx, m.group(1).strip(), m.group(2)), s)

    def pgs(m):
        _h, pkey, inside = resolve(ctx, m.group(1).strip())
        return ctx.pg(pkey) if inside else 'online'
    s = re.sub(r'\{\{pg:([^}]+)\}\}', pgs, s)
    return s


def fragment(ctx, key, fname):
    s = read(fname)
    s = re.sub(r'<!--.*?-->\s*', '', s, flags=re.S)
    return fill(ctx, s).strip()


# ---------- Find it fast ----------
def find_it_fast(ctx):
    data = json.loads(read('front-find-it-fast.json'))
    skipped = 0
    out = ['<p class="pe-fb-lede">Start with what is going on, not with chapter one. Each line points to the place in the book that helps most, and one tool to try. You can read that part on its own and stop.</p>']
    for g in data['groups']:
        rows = []
        for r in g['rows']:
            cells = []
            for rf in r['refs']:
                if 'front' in rf:
                    k = rf['front']
                    if k not in ctx.sections:
                        continue
                    cells.append(('<a href="#%s">%s</a>' % (k, esc(rf['label'])), ctx.pg(k), True))
                    continue
                slug = rf['ch']
                ids = rf.get('full' if ctx.deep else 'short') or []
                have = ids_in(ctx, slug)
                sec = next((i for i in ids if i in have), None)
                key = slug + ('#' + sec if sec else '')
                href, pkey, inside = resolve(ctx, key)
                where = '%s · %s' % (esc(ctx.chapter_name(slug)), esc(rf['label']))
                if inside:
                    cells.append(('<a href="%s">%s</a>' % (href, where), ctx.pg(pkey), True))
                else:
                    cells.append(('<a href="%s">%s</a>' % (href, where), '', False))
            # one place per line, so the map stays at about two pages: the first place that is in this copy,
            # or, when none is, the first place online
            cells.sort(key=lambda c: not c[2])
            cells = cells[:1]
            if not cells:
                continue
            if not cells[0][2]:
                # covered only in a part this copy doesn't hold: left out here, listed in the whole book's map
                skipped += 1
                continue
            where = ''.join('<span class="pe-ff-w">%s</span>' % c[0] for c in cells)
            pages = ''.join('<span class="pe-ff-n">%s</span>' % (c[1] if c[2] else '<span class="pe-ff-on">online</span>') for c in cells)
            tool = r.get('tool')
            tool_html = '<a href="%s%s">%s</a>' % (ctx.site, esc(tool[1]), esc(tool[0])) if tool else '<span class="pe-ff-none">The page itself</span>'
            if tool:
                # bookpals11: say which kind it is, so workpapers and tools are never mixed up in this column
                tool_html = _kind_label(tool[1]) + tool_html
            rows.append('<tr><th scope="row">%s</th><td class="pe-ff-where">%s</td><td class="pe-ff-pg">%s</td><td class="pe-ff-tool">%s</td></tr>' % (
                esc(r['problem']), where, pages, tool_html))
        if rows:
            out.append('<h2 class="pe-ff-h">%s</h2><table class="pe-ff"><thead><tr><th scope="col">If this is going on</th><th scope="col">Read</th><th scope="col">Page</th><th scope="col">Try</th></tr></thead><tbody>%s</tbody></table>' % (
                esc(g['title']), ''.join(rows)))
    tail = ['Each thing to try is marked as a workpaper (a page you fill in) or a tool (a helper you use on the site). All are free on the website, with nothing to sign up for; each chapter’s end has a code you can scan for them.']
    if skipped:
        tail.insert(0, 'This copy holds only part of the book, so this map lists the problems it covers. The whole book’s map has %d more, and every chapter is free to read at spreadloveandacceptance.com/book.' % skipped)
    tail.append('Looking for a word rather than a problem? The index at the back lists the main ideas.')
    out.append('<p class="pe-fb-small">%s</p>' % ' '.join(tail))
    return ''.join(out)


def _kind_label(href):
    """A small "Workpaper WP-03" or "Tool" label for a thing to try (the kinds as in tools/book/hints.json)."""
    try:
        import hints
    except Exception:
        return ''
    k = hints._match(href)
    if not k:
        return ''
    if k[0] == 'wp':
        return '<span class="pe-ff-k pe-ff-k-wp">%s</span>' % esc(hints.wp_label(hints.WP[k[1]]))
    return '<span class="pe-ff-k pe-ff-k-tool">Tool</span>'


# ---------- sections ----------
def section(ctx, key, title, body, cls, front):
    return ('<section class="pe-fb %s%s no-bubble no-cheer no-dive" data-no-bubble id="%s">%s<h1 class="pe-fb-title">%s</h1>\n%s\n</section>' % (
        'pe-fb-front pe-only ' if front else 'pe-fb-back ', cls, key, ctx.mark(key), esc(title), body))


def front_sections(ctx):
    out = []
    for key, title, fname, pkgs, parts in SECTIONS:
        if key not in FRONT_KEYS or key not in ctx.sections:
            continue
        body = find_it_fast(ctx) if key == 'find-it-fast' else fragment(ctx, key, fname)
        out.append({'key': key, 'toc': title, 'html': section(ctx, key, title, body, 'pe-fb-' + key, True)})
    return out


def back_sections(ctx):
    out = []
    for key, title, fname, pkgs, parts in SECTIONS:
        if key not in BACK_KEYS or key not in ctx.sections:
            continue
        body = fragment(ctx, key, fname)
        cls = 'pe-fb-' + key + ' pe-back'
        out.append({'key': key, 'toc': title, 'html': section(ctx, key, title, body, cls, False)})
    return out


def reading_research(ctx):
    return '<aside class="pe-fb-research no-bubble" data-no-bubble id="reading-research" aria-label="Reading research">%s</aside>' % fragment(ctx, 'reading-research', 'back-reading-research.html')


def add_section_marks(page, mark):
    """Put a page marker inside every element whose id is a "slug--id" page key, so build_pdfs.js can find it."""
    keys = set(k for k in re.findall(r'<span class="pe-pg" data-pg="([^"]+)"', page) if '--' in k)
    for k in sorted(keys):
        m = re.search(r'<[a-zA-Z][a-zA-Z0-9]*\b[^>]*\bid="%s"[^>]*>' % re.escape(k), page)
        if not m or ('zq%sqz' % re.sub(r'[^a-z0-9]', 'x', k.lower())) in page:
            continue
        page = page[:m.end()] + mark(k) + page[m.end():]
    return page


STYLE = '''<style>
/* bookfixB1: the extra front and back matter (tools/book/front_back.py) */
@media screen {
.read.whole .pe-fb-research{ margin:1rem 0 1.6rem; padding:1rem 1.1rem; border:1px solid var(--line, #D9CBA3); border-radius:12px; }
.read.whole .pe-fb-research h2{ margin-top:0; }
.read.whole .pe-fb-research dt{ font-weight:600; margin-top:.6rem; }
.read.whole .pe-fb-research dd{ margin:0 0 .3rem; }
.read.whole .pe-fb-numbers .pe-fb-sum, .read.whole .pe-fb-numbers .pe-fb-formula{ font-family:"IBM Plex Mono", ui-monospace, monospace; font-size:.92em; overflow-wrap:anywhere; }
.read.whole .pe-fb-numbers .pe-fb-formula{ display:block; padding:.5rem .7rem; border-left:3px solid var(--line, #D9CBA3); margin:.4rem 0 .8rem; }
.read.whole .pe-fb-numbers table{ width:100%; border-collapse:collapse; }
.read.whole .pe-fb-numbers td, .read.whole .pe-fb-numbers th{ padding:.25rem .4rem; text-align:left; vertical-align:top; border-bottom:1px solid var(--line, #E2D6B6); }
.read.whole .pe-fb-numbers .table-wrap{ overflow-x:auto; }
.read.whole .pe-fb-worksheets .pe-ws-sheet{ display:none; }
}
@media print {
  .pe-fb { break-before: page; }
  .pe-fb-front { --pc: #A8792F; --pt: #F6ECD2; }
  .pe-fb-title { font-size: 21pt; padding-bottom: 2.6mm; border-bottom: .6pt solid var(--brass); margin: 0 0 4mm; }
  .pe-fb p, .pe-fb li { font-size: 9.6pt; line-height: 1.46; }
  .pe-fb h2 { font-family: "Fraunces", serif; font-weight: 600; font-size: 11.6pt; margin: 4.6mm 0 1.8mm; break-after: avoid; }
  .pe-fb h3 { font-family: "Fraunces", serif; font-weight: 600; font-size: 10.4pt; margin: 3.6mm 0 1.4mm; break-after: avoid; }
  .pe-fb-lede { font-style: italic; color: var(--soft); font-size: 10pt !important; }
  .pe-fb-small { font-size: 8.6pt !important; color: var(--soft); margin-top: 3mm; }
  .pe-fb .pe-pg { font-size: inherit; min-width: 0; }
  .pe-fb a { text-decoration: none; }
  /* If you need help now */
  .pe-fb-help-now .pe-help-urgent { border: 1.2pt solid #96412B; background: #FBEDE7; border-radius: 1.6mm; padding: 3mm 4mm; margin: 0 0 4mm; break-inside: avoid; }
  .pe-fb-help-now .pe-help-urgent p { font-size: 10.4pt; margin: 0; }
  .pe-fb-help-now table, .pe-fb-numbers table, .pe-fb-help-now .pe-help-young { width: 100%; border-collapse: collapse; }
  .pe-fb-help-now th, .pe-fb-help-now td { text-align: left; vertical-align: top; padding: 1.5mm 2mm; border-bottom: .5pt solid #DCCFAE; font-size: 9.8pt; line-height: 1.38; }
  .pe-fb-help-now thead th { font-family: "IBM Plex Mono", monospace; font-weight: 500; font-size: 7pt; letter-spacing: .1em; text-transform: uppercase; color: #96412B; border-bottom: .8pt solid #96412B; }
  .pe-fb-help-now tbody th { font-family: "Fraunces", serif; font-weight: 600; width: 27mm; }
  .pe-fb-help-now .pe-help-num { font-family: "Fraunces", serif; font-weight: 600; font-size: 11pt; white-space: nowrap; }
  /* Find it fast */
  .pe-fb-find-it-fast .pe-ff-h { font-family: "IBM Plex Mono", monospace; font-weight: 500; font-size: 7.4pt; letter-spacing: .16em; text-transform: uppercase; color: var(--pc); margin: 3.6mm 0 1mm; }
  .pe-ff { width: 100%; border-collapse: collapse; table-layout: fixed; }
  .pe-ff thead th { font-family: "IBM Plex Mono", monospace; font-weight: 500; font-size: 6.6pt; letter-spacing: .1em; text-transform: uppercase; color: var(--soft); text-align: left; padding: 0 1.4mm 1mm; border-bottom: .6pt solid var(--pc); }
  .pe-ff thead th:nth-child(1) { width: 38%; } .pe-ff thead th:nth-child(2) { width: 34%; } .pe-ff thead th:nth-child(3) { width: 7%; text-align: right; } .pe-ff thead th:nth-child(4) { width: 21%; }
  .pe-ff tr { break-inside: avoid; }
  .pe-ff tbody th, .pe-ff td { text-align: left; vertical-align: top; padding: .9mm 1.4mm; border-bottom: .4pt solid #E2D6B6; font-size: 8.4pt; line-height: 1.3; }
  .pe-ff tbody th { font-weight: 600; font-family: "Lora", serif; }
  .pe-ff-w, .pe-ff-n { display: block; }
  .pe-ff-w + .pe-ff-w, .pe-ff-n + .pe-ff-n { margin-top: .8mm; }
  .pe-ff-pg { text-align: right !important; font-family: "Fraunces", serif; font-weight: 600; }
  .pe-ff-on { font-family: "IBM Plex Mono", monospace; font-weight: 400; font-size: 6.8pt; color: var(--soft); }
  .pe-ff-tool { color: #4A4338; }
  /* If someone handed you this book */
  .pe-fb-handed .pe-handed-cols { columns: 2; column-gap: 6mm; }
  .pe-fb-handed .pe-handed-cols > div { break-inside: avoid; margin-bottom: 3mm; }
  .pe-fb-handed .pe-words { padding: 2mm 3.2mm; background: #FFF6DE; border-left: 2.2pt solid #C99A3E; border-radius: 0 1.2mm 1.2mm 0; break-inside: avoid; }
  .pe-fb-handed .pe-ex-box { padding: 2.4mm 3.4mm; background: #F5F1FA; border-left: 2.4pt solid #8A6FC0; border-radius: 0 1.4mm 1.4mm 0; break-inside: avoid; }
  .pe-fb-handed ol li, .pe-fb-handed ul li { margin-bottom: .9mm; }
  /* How the numbers work */
  .pe-fb-numbers .pe-fb-formula { display: block; font-family: "IBM Plex Mono", monospace; font-size: 8.6pt; line-height: 1.5; background: #F3F0E8; border-radius: 1.2mm; padding: 2mm 3mm; margin: 1.6mm 0 2.6mm; break-inside: avoid; white-space: pre-wrap; }
  .pe-fb-numbers .pe-fb-sum { font-family: "IBM Plex Mono", monospace; font-size: 8.4pt; }
  .pe-fb-numbers .pe-fb-ex { padding: 2.2mm 3.4mm; border: .7pt solid #D3C49C; border-radius: 1.4mm; margin: 0 0 3mm; break-inside: avoid; }
  .pe-fb-numbers .pe-fb-ex > p:first-child strong:first-child { font-family: "IBM Plex Mono", monospace; font-weight: 500; font-size: 7pt; letter-spacing: .12em; text-transform: uppercase; color: var(--pc); }
  .pe-fb-numbers th, .pe-fb-numbers td { text-align: left; vertical-align: top; padding: 1.2mm 1.8mm; border-bottom: .4pt solid #DCCFAE; font-size: 8.6pt; line-height: 1.36; }
  .pe-fb-numbers thead th { font-family: "IBM Plex Mono", monospace; font-weight: 500; font-size: 6.8pt; letter-spacing: .08em; text-transform: uppercase; color: var(--pc); background: var(--pt); }
  .pe-fb-numbers h2 { padding-top: 2mm; border-top: .5pt solid #E0D3B0; }
  /* Reading research */
  .pe-fb-research { margin: 0 0 6mm; padding: 3.4mm 4.4mm 2mm; border: .8pt solid var(--pc); border-radius: 1.6mm; break-inside: auto; columns: 1; }
  .pe-fb-research h2 { font-family: "Fraunces", serif; font-weight: 600; font-size: 12pt; margin: 0 0 1.6mm; }
  .pe-fb-research p, .pe-fb-research dd { font-size: 8.8pt; line-height: 1.42; }
  .pe-fb-research dl { columns: 2; column-gap: 6mm; margin: 0 0 2mm; }
  .pe-fb-research dl > div { break-inside: avoid; margin: 0 0 2mm; }
  .pe-fb-research dt { font-family: "Fraunces", serif; font-weight: 600; font-size: 9.6pt; }
  .pe-fb-research dd { margin: 0; }
  /* Blank worksheets: one page each */
  .pe-fb-worksheets .pe-ws-screen { display: none; }
  .pe-ws-sheet { break-before: page; break-inside: avoid; zoom: .94; }
  .pe-ws-sheet.is-long { zoom: .8; }
  .pe-ws-sheet:first-of-type { break-before: auto; }
  .pe-ws-head { display: flex; justify-content: space-between; align-items: baseline; border-bottom: 1.2pt solid var(--pc); padding-bottom: 1.4mm; margin: 0 0 2mm; }
  .pe-ws-head h2 { margin: 0; font-size: 15pt; border: 0; padding: 0; }
  .pe-ws-head span { font-family: "IBM Plex Mono", monospace; font-size: 6.6pt; letter-spacing: .02em; color: var(--soft); text-align: right; max-width: 58mm; overflow-wrap: anywhere; min-width: 0; }
  .pe-ws-sheet p { font-size: 8.4pt !important; line-height: 1.36; margin: 0 0 1.6mm; }
  .pe-ws-sheet h3 { font-size: 9.6pt !important; margin: 2.6mm 0 1mm !important; }
  .pe-ws-meta { display: flex; flex-wrap: wrap; gap: 1mm 5mm; margin: 0 0 2mm; }
  .pe-ws-meta span { font-size: 8.4pt; flex: 1 1 40%; border-bottom: .5pt solid #8C8270; padding: 3.4mm 0 .4mm; }
  .pe-ws-t { width: 100%; border-collapse: collapse; table-layout: fixed; margin: 0 0 2mm; }
  .pe-ws-t th { font-family: "IBM Plex Mono", monospace; font-weight: 500; font-size: 6.2pt; letter-spacing: .04em; line-height: 1.25; text-transform: none; color: var(--ink); background: var(--pt); text-align: left; vertical-align: bottom; padding: 1mm 1.2mm; border: .5pt solid #8C8270; }
  .pe-ws-t td { height: 6.5mm; border: .5pt solid #8C8270; padding: 0 1.2mm; font-size: 7.6pt; color: var(--soft); vertical-align: middle; }
  .pe-ws-t.is-tall td { height: 10mm; }
  .pe-ws-t.is-short td { height: 5.6mm; }
  .pe-ws-line { border-bottom: .5pt solid #8C8270; height: 7mm; margin: 0 0 1mm; }
  .pe-ws-box { border: .5pt solid #8C8270; border-radius: 1mm; min-height: 14mm; padding: 1.2mm 2mm; margin: 0 0 2mm; font-size: 8pt; }
  .pe-ws-box b { font-weight: 600; font-size: 8.2pt; display: block; }
  .pe-ws-opts { font-size: 7.8pt !important; color: var(--soft); }
  .pe-ws-tick { display: inline-block; width: 3mm; height: 3mm; border: .6pt solid #5A5346; border-radius: .6mm; vertical-align: -0.5mm; margin-right: 1mm; }
  .pe-ws-scale td { text-align: center; }
  .pe-ws-scale td:first-child { text-align: left; color: var(--ink); }
  .pe-ws-foot { font-size: 7.6pt !important; color: var(--soft); border-top: .4pt solid #D3C49C; padding-top: 1.2mm; margin-top: 2mm !important; }
}
</style>'''
