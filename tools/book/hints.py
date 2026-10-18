#!/usr/bin/env python3
"""hints.py: the character hints in the book (bookpals11), and the book's workpaper and tool lists.

tools/book/build_book.py imports this. Nothing here writes a file.

The owner asked for workpapers and tools to be mentioned all through the book, with helpful little hints from the
site's characters, and for workpapers and tools to be kept separate. So:

  tools/book/hints.json   "workpapers": the numbered fill-in worksheets the book points to (WP-01 ... and the two
                          calculators), "tools": the interactive helpers on the site (as named in
                          /assets/js/tools-registry.js), and "hints": every hint, where it goes and who says it.
  A hint is a small box: a character badge and name, one or two short sentences, then one line for a workpaper
  ("Workpaper WP-03: One owner per job") and/or one line for a tool ("Tool: Chat analyzer"). The two kinds never
  share a line or a list, and they look different (a square, dashed "paper" tag against a round, solid "tool" tag).
  Online the name is a link; on paper the short address is printed after it.

Speakers: Professor Puddles (the site's raindrop professor, most of the thoughtful hints), and the two pups from
the Frequency Buddies, Tidbit (quick, curious, the big smile and the collar) and Sugarfoot (steady and soft, long
drop ears, the best hugger), who turn up now and then with a lighter tip. No character speaks in the book's heavy
passages (crisis, the hardest grief, hurt and harm): the hints there are Puddles only, gentle and placed away from
those sections.

A hint entry:
  {"chapter": "chapter-2" | "topic-calm" | "part-2", "version": "short" | "full" (chapters only),
   one of "idea": N (the Nth big idea on a short page), "after_id": "...", "after_heading": "...",
   "who": "puddles" | "tidbit" | "sugarfoot", "text": "...", "wp": "<workpaper key>", "tool": "<tool key>"}
Generated blocks sit between <!-- book-hint:start --> and <!-- book-hint:end --> and are rebuilt every run.
Styles: /assets/css/book-hints.css (screen and print).
"""
import html
import json
import os
import re

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
SITE_SHORT = 'spreadloveandacceptance.com'
CSS = '<link rel="stylesheet" href="/assets/css/book-hints.css">'
START, END = '<!-- book-hint:start -->', '<!-- book-hint:end -->'
BLOCK_RE = re.compile(r'\n*<!-- book-hint:start -->.*?<!-- book-hint:end -->\n*', re.S)


def esc(s):
    return html.escape(s, quote=True)


# ---------- the three characters, as small flat SVG badges (print well in colour and in black and white) ----------
# Professor Puddles: the raindrop professor with round glasses and a mortarboard, as drawn on /ask.html.
SVG_PUDDLES = (
    '<svg viewBox="-4 -14 88 92" focusable="false" aria-hidden="true">'
    '<path d="M40 8C33 22 14 36 14 50c0 14 12 22 26 22s26-8 26-22C66 36 47 22 40 8z" fill="#CFE6FA" stroke="#7FB2E0" stroke-width="2.6"/>'
    '<ellipse cx="30" cy="30" rx="5" ry="3" fill="#fff" opacity=".6" transform="rotate(-25 30 30)"/>'
    '<circle cx="31" cy="46" r="6.2" fill="#fff" fill-opacity=".35" stroke="#3A3350" stroke-width="1.8"/>'
    '<circle cx="49" cy="46" r="6.2" fill="#fff" fill-opacity=".35" stroke="#3A3350" stroke-width="1.8"/>'
    '<path d="M37.2 46h5.6" stroke="#3A3350" stroke-width="1.8"/>'
    '<circle cx="31" cy="46.5" r="2.4" fill="#2B2620"/><circle cx="49" cy="46.5" r="2.4" fill="#2B2620"/>'
    '<circle cx="31.9" cy="45.6" r=".8" fill="#fff"/><circle cx="49.9" cy="45.6" r=".8" fill="#fff"/>'
    '<path d="M35 56 Q40 60.5 45 56" fill="none" stroke="#2B2620" stroke-width="2.2" stroke-linecap="round"/>'
    '<ellipse cx="23" cy="55" rx="3.6" ry="2.2" fill="#F2A3B6" opacity=".85"/><ellipse cx="57" cy="55" rx="3.6" ry="2.2" fill="#F2A3B6" opacity=".85"/>'
    '<g transform="translate(-9 15) rotate(-20 40 10) scale(.82)"><path d="M18 10 L40 1 L62 10 L40 19 Z" fill="#3A3350"/><path d="M29 14.5v6c3 3 19 3 22 0v-6l-11 4.5z" fill="#4A4266"/>'
    '<path d="M60 10 v11" stroke="#F4D26B" stroke-width="1.6"/><circle cx="60" cy="22.5" r="2.3" fill="#F4D26B"/></g></svg>')
# Tidbit (pups.js "collar"): black, folded ears, round tan brow dots, tan cheeks, the big smile and a collar with a tag.
SVG_TIDBIT = (
    '<svg viewBox="0 0 64 64" focusable="false" aria-hidden="true">'
    '<path d="M13.5 22C11 11 18 7 24.5 10.5L28 19.5C23 24.5 17 25 13.5 22Z" fill="#262220"/>'
    '<path d="M50.5 22C53 11 46 7 39.5 10.5L36 19.5C41 24.5 47 25 50.5 22Z" fill="#262220"/>'
    '<ellipse cx="32" cy="31" rx="17" ry="16" fill="#2B2620"/>'
    '<ellipse cx="32" cy="40.5" rx="10.5" ry="7.5" fill="#C98A4F"/>'
    '<path d="M28.6 29.5Q32 27 35.4 29.5L34.6 36.5Q32 37.6 29.4 36.5Z" fill="#2B2620"/>'
    '<circle cx="24.5" cy="23.2" r="2.6" fill="#D69B5F"/><circle cx="39.5" cy="23.2" r="2.6" fill="#D69B5F"/>'
    '<circle cx="25" cy="29" r="2.7" fill="#3A2418"/><circle cx="39" cy="29" r="2.7" fill="#3A2418"/>'
    '<circle cx="25.9" cy="28" r=".95" fill="#fff"/><circle cx="39.9" cy="28" r=".95" fill="#fff"/>'
    '<ellipse cx="32" cy="37" rx="3.7" ry="2.7" fill="#121010"/><circle cx="31" cy="36.2" r=".8" fill="#fff" opacity=".55"/>'
    '<path d="M25.8 41.2Q32 48.6 38.2 41.2Q32 44.2 25.8 41.2Z" fill="#3A1E22"/>'
    '<ellipse cx="32" cy="45" rx="2.6" ry="2.2" fill="#EE8FA6"/>'
    '<ellipse cx="22.5" cy="38" rx="2.3" ry="1.3" fill="#F7A5B9" opacity=".6"/><ellipse cx="41.5" cy="38" rx="2.3" ry="1.3" fill="#F7A5B9" opacity=".6"/>'
    '<path d="M18.5 46.5Q32 55 45.5 46.5" fill="none" stroke="#141111" stroke-width="3.4" stroke-linecap="round"/>'
    '<circle cx="32" cy="54" r="3.1" fill="#D5D9E0" stroke="#141111" stroke-width="1"/></svg>')
# Sugarfoot (pups.js "drop"): stockier, long drop ears, tan brows running into tan cheeks, a cream muzzle, white chest.
SVG_SUGARFOOT = (
    '<svg viewBox="0 0 64 64" focusable="false" aria-hidden="true">'
    '<ellipse cx="14.5" cy="35" rx="6.6" ry="13.5" fill="#1B1817" transform="rotate(14 14.5 35)"/>'
    '<ellipse cx="49.5" cy="35" rx="6.6" ry="13.5" fill="#1B1817" transform="rotate(-14 49.5 35)"/>'
    '<path d="M25 50Q32 43 39 50Q36 59 32 60Q28 59 25 50Z" fill="#F4EFE6" stroke="#D9D0C2" stroke-width=".8"/>'
    '<ellipse cx="32" cy="30.5" rx="17.5" ry="16" fill="#252120"/>'
    '<ellipse cx="23.8" cy="23" rx="3.8" ry="2.2" fill="#C9965F" transform="rotate(-14 23.8 23)"/>'
    '<ellipse cx="40.2" cy="23" rx="3.8" ry="2.2" fill="#C9965F" transform="rotate(14 40.2 23)"/>'
    '<ellipse cx="22.8" cy="36.5" rx="4.6" ry="4.2" fill="#C9965F"/><ellipse cx="41.2" cy="36.5" rx="4.6" ry="4.2" fill="#C9965F"/>'
    '<ellipse cx="32" cy="39" rx="9.2" ry="7.2" fill="#EADCC2"/>'
    '<circle cx="25.2" cy="29.2" r="2.5" fill="#3A2418"/><circle cx="38.8" cy="29.2" r="2.5" fill="#3A2418"/>'
    '<circle cx="26" cy="28.3" r=".85" fill="#fff"/><circle cx="39.6" cy="28.3" r=".85" fill="#fff"/>'
    '<path d="M22.4 26.6Q25.2 25.4 28 26.6M36 26.6Q38.8 25.4 41.6 26.6" fill="none" stroke="#3A2418" stroke-width=".9" stroke-linecap="round"/>'
    '<ellipse cx="32" cy="35.6" rx="3.9" ry="2.9" fill="#121010"/><circle cx="31" cy="34.8" r=".8" fill="#fff" opacity=".55"/>'
    '<path d="M28 41.2Q32 44.6 36 41.2" fill="none" stroke="#3A1E22" stroke-width="1.5" stroke-linecap="round"/>'
    '<path d="M32 38.4V41.6" stroke="#3A1E22" stroke-width="1.2" stroke-linecap="round"/></svg>')

SPEAKERS = {
    'puddles': ('Professor Puddles', SVG_PUDDLES),
    'tidbit': ('Tidbit', SVG_TIDBIT),
    'sugarfoot': ('Sugarfoot', SVG_SUGARFOOT),
}


# ---------- the catalogue and the hints ----------
OVERRIDES = {}


def _load():
    global OVERRIDES
    p = os.path.join(HERE, 'hints.json')
    try:
        d = json.load(open(p, encoding='utf-8'))
    except Exception as ex:  # a half-written file must not break the book
        print('book: skipped hints.json (%s)' % ex)
        return [], [], []
    OVERRIDES = d.get('kinds') or {}
    return d.get('workpapers') or [], d.get('tools') or [], d.get('hints') or []


def _registry():
    """The site's tool list (/assets/js/tools-registry.js) as [{id, href, kind}], read with node. Its `kind`
    ('workpaper' or 'tool') is the single source of truth for which list an item belongs to."""
    import subprocess
    js = ("global.window={};require(process.argv[1]);process.stdout.write(JSON.stringify("
          "(window.TOLTools||[]).map(function(t){return {id:t.id,href:t.href,kind:t.kind};})))")
    try:
        out = subprocess.run(['node', '-e', js, os.path.join(ROOT, 'assets', 'js', 'tools-registry.js')],
                             capture_output=True, text=True, timeout=30)
        return json.loads(out.stdout or '[]')
    except Exception as ex:
        print('book: could not read tools-registry.js (%s); using the kinds in hints.json' % ex)
        return []


REGISTRY = _registry()
REG_MISSES = []


def _reg_kind(item):
    """The registry's kind for a catalogue item: by its id ("reg"), its exact address, or its page."""
    if not REGISTRY:
        return None
    by_id = {r['id']: r for r in REGISTRY}
    if item.get('reg') in by_id:
        return by_id[item['reg']]['kind']
    for r in REGISTRY:
        if r['href'] == item['href']:
            return r['kind']
    paths = [re.sub(r'[#?].*$', '', item['href'])] + list(item.get('match') or [])
    kinds = set(r['kind'] for r in REGISTRY if re.sub(r'[#?].*$', '', r['href']) in paths)
    return kinds.pop() if len(kinds) == 1 else None


def _sort(declared_wp, declared_tools):
    """Put every catalogue item in the list its registry kind says (items the registry doesn't list keep
    the list they are declared in)."""
    wps, tls = [], []
    for item, declared in [(w, 'workpaper') for w in declared_wp] + [(t, 'tool') for t in declared_tools]:
        kind = _reg_kind(item)
        if kind is None:
            REG_MISSES.append(item['key'])
            kind = declared
        item = dict(item, kind=kind)
        (wps if kind == 'workpaper' else tls).append(item)
    return wps, tls


_WP0, _TL0, HINTS = _load()
WORKPAPERS, TOOLS = _sort(_WP0, _TL0)
WP = {w['key']: w for w in WORKPAPERS}
TL = {t['key']: t for t in TOOLS}
ITEM = dict(list(WP.items()) + list(TL.items()))


def short_path(item):
    p = item.get('print') or re.sub(r'[#?].*$', '', item['href'])
    p = re.sub(r'(?:/index)?\.html$', '', p)
    return p


def short_address(item):
    return SITE_SHORT + short_path(item)


def addr_html(addr):
    """An address that may wrap only after a "/" or a "." (finalfix15: the same rule as build_book.addr_html)."""
    return '<wbr>'.join('<span class="pe-nb">%s</span>' % esc(x) for x in re.findall(r'[^/.?&=]+[/.?&=]?|[/.?&=]', addr))


def wp_label(w):
    return ('Workpaper ' + w['code']) if w.get('code') else 'Workpapers'


def ref_line(kind, item, cls='bh-ref'):
    """One line naming one workpaper or one tool: never both."""
    addr = short_address(item)
    if kind == 'wp':
        k = wp_label(item)
        c = 'bh-wp'
    else:
        k = 'Tool'
        c = 'bh-tool'
    return ('<p class="%s %s"><span class="bh-k">%s</span><span class="bh-c">: </span><a href="%s" data-u="%s">%s</a>'
            '<span class="bh-u"> %s</span></p>') % (cls, c, esc(k), esc(item['href']), esc(addr), esc(item['name']), addr_html(addr))


def hint_html(h, markers=True, extra_cls=''):
    who = h.get('who') if h.get('who') in SPEAKERS else 'puddles'
    name, svg = SPEAKERS[who]
    # each named item is shown as what the registry says it is: the workpaper line first, then the tool line
    named = [ITEM[k] for k in (h.get('wp'), h.get('tool')) if k in ITEM]
    refs = ''.join(ref_line('wp', i) for i in named if i['kind'] == 'workpaper')
    refs += ''.join(ref_line('tool', i) for i in named if i['kind'] != 'workpaper')
    s = ('<aside class="book-hint%s no-bubble no-cheer no-dive" data-no-bubble data-who="%s" aria-label="A hint from %s">'
         '<span class="bh-badge" aria-hidden="true">%s</span><div class="bh-body"><p class="bh-who">%s</p>'
         '<p class="bh-text">%s</p>%s</div></aside>') % (
        (' ' + extra_cls) if extra_cls else '', who, esc(name), svg, esc(name), h['text'], refs)
    return ('%s\n%s\n%s' % (START, s, END)) if markers else s


def strip(s):
    return BLOCK_RE.sub('\n\n', s)


def hints_for(chapter, deep=None):
    ver = None if deep is None else ('full' if deep else 'short')
    return [h for h in HINTS if h.get('chapter') == chapter and (ver is None or h.get('version', 'short') == ver)]


def insert(s, chapter, deep, place, place_idea, place_heading, warn):
    """Put this page's hints in (the old ones are taken out first). deep=None for a page with one version."""
    s = strip(s)
    tag = chapter + ('' if deep is None else ('-in-depth' if deep else ''))
    for h in hints_for(chapter, deep):
        block = hint_html(h)
        if h.get('idea'):
            s, ok = place_idea(s, h['idea'], block)
            where = 'idea %s' % h['idea']
        elif h.get('after_id'):
            s, ok = place(s, h['after_id'], block)
            where = '#' + h['after_id']
        elif h.get('after_heading'):
            s, ok = place_heading(s, h['after_heading'], block)
            where = '“%s”' % h['after_heading']
        else:
            ok, where = False, '(no place given)'
        if not ok:
            warn('hint (%s): %s not found in %s' % (h.get('who'), where, tag))
    # never two hints back to back
    ends = [m.end() for m in re.finditer(re.escape(END), s)]
    for m in re.finditer(re.escape(START), s):
        prev = [e for e in ends if e <= m.start()]
        if prev:
            between = re.sub(r'<[^>]+>|\s+', '', s[prev[-1]:m.start()])
            if len(between) < 160:
                warn('hints too close together in %s' % tag)
    if HINTS and CSS not in s:
        s = with_css(s)
    return s


def with_css(s):
    if CSS in s:
        return s
    for anchor in ('<link rel="stylesheet" href="/assets/css/book-examples.css">', '<link rel="stylesheet" href="/assets/css/reading.css">'):
        if anchor in s:
            return s.replace(anchor, anchor + '\n' + CSS, 1)
    return s.replace('</head>', CSS + '\n</head>', 1)


def check_links(warn):
    """Every workpaper and tool must point at a page (and #part) that exists."""
    for item in WORKPAPERS + TOOLS:
        u = item['href']
        path = re.sub(r'[#?].*$', '', u)
        f = os.path.join(ROOT, path.lstrip('/'))
        if path.endswith('/'):
            f = os.path.join(f, 'index.html')
        if not os.path.exists(f):
            warn('hints: %s points at a missing page %s' % (item['key'], u))
            continue
        frag = u.split('#', 1)[1] if '#' in u else ''
        if frag and ('id="%s"' % frag) not in open(f, encoding='utf-8').read():
            warn('hints: %s points at a missing part %s' % (item['key'], u))
        sp = short_path(item)
        if not (os.path.exists(os.path.join(ROOT, sp.lstrip('/') + '.html')) or os.path.exists(os.path.join(ROOT, sp.lstrip('/'), 'index.html'))):
            warn('hints: the printed address of %s (%s) has no page' % (item['key'], sp))
    for h in HINTS:
        for f in ('wp', 'tool'):
            if h.get(f) and h[f] not in ITEM:
                warn('hint in %s names an unknown item %s' % (h.get('chapter'), h[f]))
            elif h.get(f) and (ITEM[h[f]]['kind'] == 'workpaper') != (f == 'wp'):
                warn('hint in %s: %s is a %s in tools-registry.js; move it to "%s"' % (
                    h.get('chapter'), h[f], ITEM[h[f]]['kind'], 'wp' if ITEM[h[f]]['kind'] == 'workpaper' else 'tool'))
        if not h.get('wp') and not h.get('tool'):
            warn('hint in %s names no workpaper or tool' % h.get('chapter'))


# ---------- which chapters mention which workpaper or tool ----------
def _wp_re(w):
    m = re.match(r'WP-(\d+)$', w.get('code') or '')
    if not m:
        return None
    return re.compile(r'^/(?:workpapers/(?:fill/)?)?wp-?0*%d(?:[-.]|$)' % int(m.group(1)))


def _match(href):
    """(kind, key) for a link, or None."""
    h = html.unescape(href)
    if not h.startswith('/') or h.startswith('/book/'):
        return None
    path, frag = re.sub(r'[?#].*$', '', h), (h.split('#', 1)[1] if '#' in h else '')
    for w in WORKPAPERS:
        rx = _wp_re(w)
        if (rx and rx.match(path)) or path in (w.get('match') or []) or path == re.sub(r'[#?].*$', '', w['href']):
            return ('wp', w['key'])
    same = [t for t in TOOLS if re.sub(r'[#?].*$', '', t['href']) == path or path in (t.get('match') or [])]
    for t in same:
        if '#' in t['href'] and frag and t['href'].split('#', 1)[1] == frag:
            return ('tool', t['key'])
    plain = [t for t in same if '#' not in t['href']]
    if plain:
        return ('tool', plain[0]['key'])
    if len(same) == 1 and not frag:
        return ('tool', same[0]['key'])
    return None


def mentions(pages, slugs):
    """{('wp'|'tool', key): [slug, ...]} in reading order, from the chapter pages' links (hints included)."""
    out = {}
    for slug in slugs:
        body = pages.get(slug, '')
        m = re.search(r'<main[^>]*>(.*)</main>', body, re.S)
        body = m.group(1) if m else body
        for href in re.findall(r'<a\b[^>]*\bhref="([^"]+)"', body):
            k = _match(href)
            if k and slug not in out.setdefault(k, []):
                out[k].append(slug)
    return out


# ---------- the orientation ("Workpapers, tools and three friends") and the two lists at the back ----------
def tag(kind, item=None):
    if kind == 'wp':
        return '<span class="bh-tag bh-tag-wp">%s</span>' % esc(wp_label(item) if item else 'Workpaper')
    return '<span class="bh-tag bh-tag-tool">Tool</span>'


def meet_html(print_edition):
    """The two kinds of help and the three characters. print_edition: the wording for the printed book."""
    blank = (' The blank workpapers are also at the back of this book, one page each, to copy.' if print_edition
             else ' You can fill them in on screen or print them.')
    ex_wp, ex_tool = WP.get('wp03'), TL.get('chat')
    s = '<div class="bh-meet">'
    s += '<div class="bh-kinds">'
    s += ('<div class="bh-kind bh-kind-wp"><p class="bh-kind-h">%s Workpapers: pages you fill in</p>'
          '<p>A workpaper is a page you fill in, on your own or together: a one-week log, a list of who owns which job, a short check. '
          'Each one has a number, like <strong>WP-03</strong>, and it is always called a workpaper, for example %s.%s</p></div>') % (
        tag('wp', ex_wp), '“Workpaper WP-03: One owner per job”' if ex_wp else 'Workpaper WP-03', blank)
    s += ('<div class="bh-kind bh-kind-tool"><p class="bh-kind-h">%s Tools: helpers you use on the site</p>'
          '<p>A tool is an interactive helper on the website: a quiz, a calm-down timer, a card maker, or the Chat analyzer that reads a message with you. '
          'You use it and it gives you something back. It is always called a tool, for example %s.</p></div>') % (
        tag('tool'), '“Tool: Chat analyzer”' if ex_tool else 'Tool: Chat analyzer')
    s += '</div>'
    s += ('<p class="bh-meet-note">The book keeps the two apart: a workpaper and a tool never share a list. Both are free, need no account, '
          'and what you type stays on your device.</p>')
    s += '<p class="bh-meet-h">Three friends who give hints</p><ul class="bh-friends">'
    s += ('<li><span class="bh-badge" aria-hidden="true">%s</span><span><strong>Professor Puddles</strong>, the site’s cheerful raindrop '
          'professor, gives most of the hints: a thought to take with you, and the workpaper or tool that fits.</span></li>') % SVG_PUDDLES
    s += ('<li><span class="bh-badge" aria-hidden="true">%s</span><span><strong>Tidbit</strong>, the quick, curious pup with the big smile '
          'and the collar, bounds in now and then with a playful tip.</span></li>') % SVG_TIDBIT
    s += ('<li><span class="bh-badge" aria-hidden="true">%s</span><span><strong>Sugarfoot</strong>, the steady, gentle pup with the long soft '
          'ears and the best hugs, turns up with a calm, slow tip.</span></li>') % SVG_SUGARFOOT
    s += '</ul>'
    s += ('<p class="bh-meet-note">They keep to the lighter pages. Where a chapter talks about crisis, deep grief or being hurt, the pages stay '
          'quiet and plain.</p></div>')
    return s


def front_section(mark):
    return ('<section class="pe-fb pe-fb-front pe-only pe-fb-meet no-bubble no-cheer no-dive" data-no-bubble id="meet">%s'
            '<h1 class="pe-fb-title">Workpapers, tools and three friends</h1>\n%s\n</section>') % (mark('meet'), meet_html(True))


def _list_items(kind, items, found, chapter_ref):
    out = []
    for it in items:
        where = found.get((kind, it['key']))
        if not where:
            continue
        addr = short_address(it)
        k = wp_label(it) if kind == 'wp' else 'Tool'
        out.append('<li><p class="wt-name"><span class="bh-k">%s</span><span class="bh-c">: </span><a href="%s" data-u="%s">%s</a>'
                   '<span class="wt-u"> %s</span></p><p class="wt-in">In: %s</p></li>' % (
                       esc(k), esc(it['href']), esc(addr), esc(it['name']), addr_html(addr),
                       ', '.join(chapter_ref(s) for s in where)))
    return out


def lists_html(found, chapter_ref, h='h2'):
    wps = _list_items('wp', WORKPAPERS, found, chapter_ref)
    tls = _list_items('tool', TOOLS, found, chapter_ref)
    s = ''
    if wps:
        s += '<%s class="wt-h wt-h-wp">Workpapers mentioned in this book</%s><p class="wt-lede">Pages to fill in, on your own or together.</p><ul class="wt-list wt-list-wp">%s</ul>' % (h, h, ''.join(wps))
    if tls:
        s += '<%s class="wt-h wt-h-tool">Tools mentioned in this book</%s><p class="wt-lede">Interactive helpers to use on the site.</p><ul class="wt-list wt-list-tool">%s</ul>' % (h, h, ''.join(tls))
    return s


def back_section(mark, found, chapter_ref, pc):
    """For the packages: a back-matter section (on screen and on paper), placed with the other back sections."""
    body = ('<p class="pe-fb-lede">Every workpaper and tool this book points to, in two separate lists, with the chapters and '
            'pages that mention each one. All of them are free at %s, with no account, and what you type stays on your device.</p>') % SITE_SHORT
    body += lists_html(found, chapter_ref)
    return ('<section class="pe-fb pe-fb-back pe-back pe-fb-wt no-bubble no-cheer no-dive" data-no-bubble id="wp-tools" style="--pc:%s">%s'
            '<h1 class="pe-fb-title">Workpapers and tools in this book</h1>\n%s\n</section>') % (pc, mark('wp-tools'), body)


# ---------- keep the chapters' own lists of workpapers and tools apart ----------
# The owner: "Keep work papers and tools separate." Part Three's "Tools and reading on this site" lists and the
# topic pages' "Tools and workpapers for this" lists used to mix them. split_lists() sorts each item into
# Workpapers / Tools / Reading by its link, using tools-registry.js's kind, and rewrites the list in the page
# source between <!-- book-kinds:start --> and <!-- book-kinds:end --> (run again, it re-sorts the same items).
KIND_START, KIND_END = '<!-- book-kinds:start -->', '<!-- book-kinds:end -->'
SPLIT_HEADS = [
    # (heading pattern, new heading text)
    (r'<h2 id="tools">[^<]*</h2>', '<h2 id="tools">{kinds} on this site</h2>'),
    (r'<h2>(?:Tools and workpapers|Workpapers and tools) for this</h2>', '<h2>Workpapers and tools for this</h2>'),
]
KIND_HEADS = {
    'workpaper': ('Workpapers', 'pages you fill in, on your own or together'),
    'tool': ('Tools', 'helpers you use on the site'),
    'reading': ('Reading', 'pages to read on the site'),
}


def classify(href):
    """'workpaper', 'tool' or 'reading' for a site link. The registry's kind decides: the exact address, or the
    page itself when the registry lists the whole page, or a #part of a page whose tool sits at a #part."""
    h = html.unescape(href)
    over = (OVERRIDES or {}).get(h)
    if over:
        return over
    if not h.startswith('/') or h.startswith('/library/') or h.startswith('/book/'):
        return 'reading'
    path, frag = re.sub(r'[#?].*$', '', h), ('#' in h)
    for r in REGISTRY:
        if r['href'] == h:
            return r['kind']
    for r in REGISTRY:
        rp = re.sub(r'[#?].*$', '', r['href'])
        if rp == path and ('#' not in r['href'] or frag):
            return r['kind']
    if re.match(r'^/(?:workpapers/(?!calculators/)|wp-\d)', path):
        return 'workpaper'
    return 'reading'


def _li_kind(li):
    ks = [classify(h) for h in re.findall(r'<a\b[^>]*\bhref="([^"]+)"', li)]
    for k in ('workpaper', 'tool'):
        if ks and ks[0] == k:
            return k
    if 'workpaper' in ks:
        return 'workpaper'
    return 'tool' if 'tool' in ks else 'reading'


def _top_lis(ul_html, element_end):
    out, i = [], 0
    while True:
        j = ul_html.find('<li', i)
        if j < 0:
            return out
        k = element_end(ul_html, j)
        out.append(ul_html[j:k])
        i = k


ARROW_ROW = re.compile(r'<p>((?:\s*<a [^>]*>[^<]*(?:&rarr;|→)\s*</a>)+\s*)</p>')


def _split_arrow_rows(pre):
    """A row of "Name →" links before the list: one row per kind (workpapers, then tools, then reading)."""
    def sub(m):
        links = re.findall(r'<a [^>]*>[^<]*</a>', m.group(1))
        by = {'workpaper': [], 'tool': [], 'reading': []}
        for a in links:
            by[classify(re.search(r'href="([^"]+)"', a).group(1))].append(a)
        rows = [' '.join(by[k]) for k in ('workpaper', 'tool', 'reading') if by[k]]
        return '\n  '.join('<p>%s</p>' % r for r in rows)
    return ARROW_ROW.sub(sub, pre)


def split_lists(s, element_end, warn=None, tag=''):
    for pat, new_head in SPLIT_HEADS:
        m = re.search(pat, s)
        if not m:
            continue
        a = m.end()
        # the section runs to the next h2, the end of its <section>, or the end of the page's main text
        stops = [k for k in (s.find('<h2', a), s.find('</section>', a), s.find('</main>', a)) if k > 0]
        limit = min(stops) if stops else len(s)
        ks = s.find(KIND_START, a)
        if 0 <= ks < limit:
            st = ks
            en = s.index(KIND_END, st) + len(KIND_END)
            region = s[st:en]
            uls = [region[x.start():element_end(region, x.start())] for x in re.finditer(r'<ul\b', region)]
        else:
            u = re.search(r'<ul\b[^>]*>', s[a:limit])
            if not u:
                if warn:
                    warn('lists: no list after %s in %s' % (m.group(0), tag))
                continue
            st = a + u.start()
            en = element_end(s, st)
            uls = [s[st:en]]
        pre = _split_arrow_rows(s[a:st])
        ul_cls = ''
        cm = re.match(r'<ul\b[^>]*\bclass="([^"]*)"', uls[0]) if uls else None
        if cm:
            ul_cls = ' '.join(c for c in cm.group(1).split() if not c.startswith('kind-'))
        groups = {'workpaper': [], 'tool': [], 'reading': []}
        for ul in uls:
            inner = ul[ul.index('>') + 1:ul.rindex('</ul>')]
            for li in _top_lis(inner, element_end):
                groups[_li_kind(li)].append(li.strip())
        out = [KIND_START]
        for k in ('workpaper', 'tool', 'reading'):
            if not groups[k]:
                continue
            h, sub = KIND_HEADS[k]
            out.append('<h3 class="kind-h kind-h-%s">%s <span class="kind-sub">%s</span></h3>' % (k, h, sub))
            out.append('<ul class="%s">' % ' '.join(x for x in (ul_cls, 'kind-list', 'kind-' + k) if x))
            out.extend('  ' + li for li in groups[k])
            out.append('</ul>')
        out.append(KIND_END)
        if '{kinds}' in new_head:
            present = [k for k in ('workpaper', 'tool', 'reading') if groups[k] or any(
                classify(h) == k for h in re.findall(r'href="([^"]+)"', pre))]
            words = [{'workpaper': 'workpapers', 'tool': 'tools', 'reading': 'reading'}[k] for k in present] or ['reading']
            phrase = words[0] if len(words) == 1 else ', '.join(words[:-1]) + ' and ' + words[-1]
            new_head = new_head.replace('{kinds}', phrase[0].upper() + phrase[1:])
        s = s[:m.start()] + new_head + pre + '\n'.join(out) + s[en:]
    return s
