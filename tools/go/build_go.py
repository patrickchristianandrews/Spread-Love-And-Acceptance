#!/usr/bin/env python3
"""build_go.py: the permanent "go" pages the printed books point to (owner, Oct 30 2026: fewer, steadier QR codes).

Every QR code in the books opens one of a few permanent category pages (/go/self, /go/talk, /go/share, /go/calm, /go/ask,
/go/worksheets, /go/read), scrolled to the card for the exact thing the book mentions. Each card links to the real page, so a
tool's own page can move or be renamed later and only this list changes, never the printed book.

Reads every code target the books use (data-qr in book/print/src/*.html), sorts each into a category, takes its name from the
tools registry or the page's own heading, and writes:
  go/<category>.html     one page per category, a card per target (id = the card's anchor)
  tools/go/map.json      { "<old target>": "/go/<category>#<card id>" } for the book builders
Targets on the free "Logic Behind It" library (the pocket guide's examples) keep their own single page and are not listed here.
Run: python3 tools/go/build_go.py   (fails if a book target has no category)"""
import glob, html, json, os, re, subprocess, sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
DOM = 'https://spreadloveandacceptance.com'
CATS = [
    ('self', 'Know yourself', 'Tools for noticing your feelings, your day, your wiring and the rules you grew up with.'),
    ('talk', 'Talk and stay close', 'Tools for hard talks, kinder words and feeling close again.'),
    ('share', 'Fair share and plans', 'Tools for who does what at home and at work, and plans you both keep.'),
    ('calm', 'Calm down and play', 'For when you need to settle first: calm pages, sounds and games with no way to lose.'),
    ('ask', 'Ask and practice', 'Ask Professor Puddles, practice on an example, or find the quickest way in.'),
    ('worksheets', 'Worksheets and the six-week program', 'Every worksheet the books mention, ready to fill in on your phone or print, and the six-week program.'),
    ('read', 'Guides and reading', 'The guides the books point to, the free online chapters and the research behind them.'),
]
RULES = [
    ('worksheets', r'^/(workpapers/(?!calculators)|wp-\d|prog-01)'),
    ('share', r'^/(lemonade-stand|workpapers/calculators/|make-a-plan|work\.html|chore-chart|is-the-setup-working|money-together|sharing-a-room)'),
    ('self', r'^/(what-am-i-feeling|quick-checks|wavelength|growing-up|how-you-take-things-in|tools/frequency-calibration|brain-map|self-path|know-yourself|wired-differently|small-wins|wiring-card)'),
    ('talk', r'^/(signal-translator|write-it-through|carrier-wave-decoder|check-ins|bonding|how-to-stop-fighting|pursue-withdraw|refusals|turning-toward|love-languages|apology-languages|complacency|tools/soften-a-tense-moment)'),
    ('calm', r'^/(upset-right-now|pause-and-play|night-garden|soundscapes|calm-visualizer|coin-pusher|recheck-drive|frequency-journey)'),
    ('ask', r'^/(ask\.html|do/|start-in-10-minutes|journeys|tools\.html|install|contents|$)'),
    ('read', r'^/(book/|research|learn/|library/|by-relationship|adhd-kids|caregivers|coming-home|coming-out|different-hours|empty-nest|family-rifts|for-counselors|for-teachers|foster-and-kinship|friends|gaming-and-time-together|grandparents|grief|groups|grown-up-children|long-distance|more-than-two|neurodivergent-relationships|new-parent|on-my-own|parents|retired-together|teens|two-faiths|when-one-is-ill|co-parenting|the-logic-behind-it\.html$)'),
]
NAMES = {
    '/pursue-withdraw.html#plan': 'Our pause plan: one of you wants to talk now, the other needs space',
    '/gaming-and-time-together.html#deal': 'Gaming, phones and time together: make a deal',
    '/is-the-setup-working.html': 'Fair split calculator (the full version)',
    '/small-wins.html#flip-it': 'Small wins: Flip it',
    '/small-wins.html#done': 'Small wins: your done list',
    '/growing-up.html#home': 'Where your lens came from: the rulebook from home',
    '/wired-differently.html#double-empathy': 'Wired Differently: a mix-up usually runs both ways',
    '/turning-toward.html#thanks': 'Turning Toward: say thank you, specifically',
    '/quick-checks.html#ladder': 'My weather today: the four-step check',
    '/check-ins.html?for=family#card': 'Kitchen-table check-in (for a family)',
    '/carrier-wave-decoder.html?tab=their-side': 'Rewind the talk (their side)',
    '/write-it-through.html#send': 'Write it through: write it, wait, then send',
}
VARIANT = {'for=family': 'for a family', 'tab=their-side': 'their side', 'for=care': 'for caring for someone', 'for=coparents': 'for co-parents',
           'for=foster': 'for foster and kinship families', 'for=house-rules': 'house rules'}


def targets():
    """The book link targets, frozen in tools/go/targets.json (the original addresses the books pointed to before they were
    moved onto the /go/ pages). Add a line there to give the books something new to point to."""
    return sorted(json.load(open(os.path.join(ROOT, 'tools/go/targets.json'), encoding='utf-8'))['targets'])


def scan_book_sources():
    out = []
    for f in sorted(glob.glob(os.path.join(ROOT, 'book/print/src/*.html'))):
        for u in re.findall(r'data-qr="([^"]+)"', open(f, encoding='utf-8').read()):
            u = html.unescape(u).replace(DOM, '') or '/'
            if 'the-logic-behind-it.html?item=' in u or u.startswith('/go/'): continue
            if u not in out: out.append(u)
    return sorted(out)


def cat_of(u):
    for c, rx in RULES:
        if re.search(rx, u): return c
    return None


def page_file(path):
    p = path.lstrip('/')
    for c in ([p] if p.endswith('.html') else []) + [p + '.html', (p.rstrip('/') + '/index.html') if p else 'index.html']:
        if c and os.path.isfile(os.path.join(ROOT, c)): return os.path.join(ROOT, c)
    return None


def text(s): return re.sub(r'\s+', ' ', html.unescape(re.sub(r'<[^>]+>', ' ', s))).strip()


def registry():
    js = ("global.window={};require(process.argv[1]);require(process.argv[2]);const T=window.TOLTools,A=window.TOLToolArt;"
          "process.stdout.write(JSON.stringify(T.map(t=>({id:t.id,name:t.name,href:t.href,line:t.benefit||t.does,kind:t.kind,wp:t.wp||'',"
          "art:A&&A.svg(t.id,{size:48})||''}))))")
    r = subprocess.run(['node', '-e', js, os.path.join(ROOT, 'assets/js/tools-registry.js'), os.path.join(ROOT, 'assets/js/tool-art.js')],
                       capture_output=True, text=True, check=True)
    return json.loads(r.stdout)


def split(u):
    path, _, frag = u.partition('#')
    path, _, query = path.partition('?')
    if frag.endswith('-h'): frag = frag[:-2]
    return path, query, frag


def group_key(u, reg):
    path, query, frag = split(u)
    m = re.search(r'(?:^/wp-|/workpapers/(?:fill/)?wp-)(\d\d)', path)
    if m: return 'wp-' + m.group(1) + ('-' + query.split('=')[-1] if query else '')
    for t in reg:
        if t['kind'] != 'tool': continue
        tp, tq, tf = split(t['href'])
        if tp == path and not query and (not frag or frag == tf): return 'tool:' + t['id']
    return path + ('?' + query if query else '') + ('#' + frag if frag else '')


def page_title(path):
    f = page_file(path)
    s = open(f, encoding='utf-8').read() if f else ''
    h1 = re.search(r'<h1[^>]*>(.*?)</h1>', s, re.S)
    t = text(h1.group(1)) if h1 else text((re.search(r'<title>(.*?)</title>', s, re.S) or [None, path])[1])
    return re.sub(r'\s*[·|]\s*Spread Love.*$', '', t), s


def describe(key, urls, reg):
    """name, line, art, kind, main href, extra links for one card"""
    if key.startswith('tool:'):
        t = next(x for x in reg if x['id'] == key[5:])
        return t['name'], t['line'], t['art'], 'tool', t['href'], []
    if key.startswith('wp-'):
        code = 'WP-' + key[3:5]
        t = next((x for x in reg if x.get('wp') == code), None)
        variant = key[6:]
        fill = '/workpapers/fill/wp-%s.html' % key[3:5] + ('?for=' + variant if variant else '')
        if not page_file(fill.split('?')[0]): fill = urls[0]
        name = (t['name'] if t else code) + (' (' + VARIANT.get('for=' + variant, variant) + ')' if variant else '')
        extra = [('What it is', t['href'])] if t and t['href'] != fill else []
        return name, (t['line'] if t else ''), '', 'workpaper', fill, extra
    u = sorted(urls, key=len)[0]
    path, query, frag = split(u)
    if key in NAMES:
        title, s = page_title(path)
        desc = re.search(r'<meta name="description" content="([^"]*)"', s)
        return NAMES[key], (html.unescape(desc.group(1)) if desc else ''), '', 'page', u, []
    if path == '/book/': return 'The book, free online', 'Every chapter of the series, free to read, with an expanded version.', '', 'page', u, []
    title, s = page_title(path)
    short = title.split(':')[0].strip() if frag else title
    desc = re.search(r'<meta name="description" content="([^"]*)"', s)
    line = html.unescape(desc.group(1)) if desc else ''
    if frag:
        el = re.search(r'id="%s(?:-h)?"[^>]*>(.*?)</(h[1-6]|summary|p|div|section|span|a)>' % re.escape(frag), s, re.S)
        sub = text(el.group(1))[:70] if el else ''
        if not sub:
            el = re.search(r'<(section|div)[^>]*id="%s"[^>]*>.*?<h[2-4][^>]*>(.*?)</h[2-4]>' % re.escape(frag), s, re.S)
            sub = text(el.group(2))[:70] if el else ''
        sub = re.sub(r'^\d+\s*', '', sub)
        if sub and sub.lower() != short.lower(): short = short + ': ' + sub
    if query: short += ' (' + VARIANT.get(query, query) + ')'
    return short, line, '', 'page', u, []


def card_id(key):
    k = key[5:] if key.startswith('tool:') else key
    k = re.sub(r'\.html', '', k).strip('/').replace('/', '-').replace('?', '-').replace('#', '--').replace('=', '-')
    return re.sub(r'[^a-z0-9-]+', '-', (k or 'home').lower()).strip('-') or 'home'


def read_group(href):
    if href.startswith('/book/'): return 'The book, free online'
    if re.match(r'^/(research|learn/|library/|the-logic)', href): return 'Research and more'
    return 'Guides by relationship and topic'


HEAD = '''<!DOCTYPE html>
<html lang="en">
<head>
<meta charset="UTF-8">
<meta name="viewport" content="width=device-width, initial-scale=1">
<title>{title} · From the Books</title>
<meta name="description" content="{desc}">
<link rel="preconnect" href="https://fonts.googleapis.com">
<link rel="preconnect" href="https://fonts.gstatic.com" crossorigin>
<link href="https://fonts.googleapis.com/css2?family=Fraunces:ital,opsz,wght@0,9..144,400;0,9..144,500;0,9..144,600;1,9..144,500&family=Lora:ital,wght@0,400;0,500;0,600;1,400&display=swap" rel="stylesheet">
<link rel="stylesheet" href="/assets/css/site.css">
<link rel="stylesheet" href="/assets/css/go.css">
<script src="/assets/js/site.js" defer></script>
<script src="/assets/js/go.js" defer></script>
<link rel="canonical" href="https://spreadloveandacceptance.com/go/{cat}.html">
</head>
<body class="go-page" data-no-garden data-no-offer data-no-share data-no-reading data-no-listen data-no-where data-no-related data-no-fullpath data-no-tip data-no-learnplay data-no-cheer data-no-pillars data-no-buddies data-no-pupvisits data-no-brain-break data-no-clip data-no-dives data-no-weather data-no-private-note data-no-line-share data-no-wash data-no-pudcards>
<main class="read is-wide gop" id="main">
'''


def main():
    reg = registry()
    groups, missing = {}, []
    for u in targets():
        c = cat_of(u)
        if not c: missing.append(u); continue
        k = group_key(u, reg)
        groups.setdefault((c, k), []).append(u)
    if missing:
        sys.exit('no category for: ' + ', '.join(missing))
    items = {c: [] for c, _, _ in CATS}
    mapping = {}
    for (c, k), urls in groups.items():
        name, line, art, kind, href, extra = describe(k, urls, reg)
        cid = card_id(k)
        dup = next((i for i in items[c] if i['name'] == name), None)
        if dup:
            for u in urls: mapping[u] = '/go/%s#%s' % (c, dup['id'])
            continue
        items[c].append({'id': cid, 'href': href, 'name': name, 'line': line, 'art': art, 'kind': kind, 'extra': extra, 'key': k})
        for u in urls: mapping[u] = '/go/%s#%s' % (c, cid)
    nav = ''.join('<a href="/go/%s.html">%s</a>' % (c, html.escape(n)) for c, n, _ in CATS)
    os.makedirs(os.path.join(ROOT, 'go'), exist_ok=True)
    for c, n, lede in CATS:
        its = items[c]
        if c == 'worksheets': its.sort(key=lambda i: (0 if i['key'].startswith('wp-') else 1, i['key'] if i['key'].startswith('wp-') else i['name']))
        else: its.sort(key=lambda i: i['name'].lower())
        sections = [('', its)] if c != 'read' else [(g, [i for i in its if read_group(i['href']) == g]) for g in
                    ('Guides by relationship and topic', 'The book, free online', 'Research and more')]
        out = []
        for g, lst in sections:
            if g: out.append('<h2 class="go-h2">%s</h2>' % html.escape(g))
            out.append('<ul class="go-list no-bubble no-cheer">')
            for it in lst:
                pic = it['art'] or '<span class="go-mono">%s</span>' % html.escape(re.sub(r'[^A-Z0-9]', '', it['key'][:5].upper()) if it['kind'] == 'workpaper' else it['name'][:1])
                label = {'tool': 'Tool', 'workpaper': 'Worksheet'}.get(it['kind'], 'Page')
                more = ''.join(' <a class="go-more" href="%s">%s</a>' % (html.escape(h), html.escape(t)) for t, h in it['extra'])
                out.append('<li class="go-card" id="%s"><span class="go-pic" aria-hidden="true">%s</span><span class="go-tx"><span class="go-name">%s</span>'
                           '<span class="go-line">%s</span><span class="go-kind">%s%s</span></span><a class="go-open" href="%s">Open<span class="sr-only"> %s</span></a></li>'
                           % (it['id'], pic, html.escape(it['name']), html.escape(it['line']), label, more, html.escape(it['href']), html.escape(it['name'])))
            out.append('</ul>')
        body = HEAD.format(title=html.escape(n), desc=html.escape('From the Spread Love & Acceptance books: ' + lede), cat=c)
        body += ('<p class="go-k no-bubble">From the books</p>\n<h1 class="go-h1">%s</h1>\n<p class="go-lede no-bubble">%s Everything here is free, needs no sign-up, '
                 'and what you type stays on your device.</p>\n%s\n'
                 '<nav class="go-nav no-bubble" aria-label="Other lists from the books"><p>More from the books</p>%s</nav>\n</main>\n</body>\n</html>\n'
                 % (html.escape(n), html.escape(lede), '\n'.join(out), nav))
        open(os.path.join(ROOT, 'go', c + '.html'), 'w', encoding='utf-8').write(body)
    json.dump({'about': 'Old book code target -> permanent go-page card (tools/go/build_go.py).', 'map': mapping},
              open(os.path.join(ROOT, 'tools/go/map.json'), 'w', encoding='utf-8'), indent=1, ensure_ascii=False)
    for c, n, _ in CATS: print('%-11s %3d cards' % (c, len(items[c])))
    print('mapped', len(mapping), 'targets')


if __name__ == '__main__':
    main()
