#!/usr/bin/env python3
"""Build the site search index: assets/js/search-index.js

The menu's "Search the site" box (site.js) loads this file the first time someone types in it,
and searches page titles, headings and text entirely in the browser. Nothing typed is sent anywhere.

Run it from the repository root whenever pages are added or their words change:

    python3 tools/search/build_index.py

It reads every tracked or new .html page (skipping tools/, supabase/, redirects, noindex pages and
the background-only pages), and writes one small script: window.TOL_SEARCH = { v, pages: [...] }.
Each page keeps its address, title, main heading, section headings, a short summary and the first
part of its text, so the file stays small enough to load on a phone.
"""
import html
import json
import os
import re
import subprocess
import sys
import unicodedata
from html.parser import HTMLParser

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
COMMON = os.path.join(ROOT, 'tools', 'chat', 'common-words.txt')
# Everyday words the search must take as typed, never "correct" into a site word. common-words.txt
# (shared with the chat) has English words of 4 to 12 letters; these add short words, names of faiths,
# holidays, games and places, family words, and everyday Spanish.
REAL_EXTRA = '''
act add age ago aid aim air all and ant any ape app arm art ash ask ate awe axe baa bad bag ban bar bat bay bed bee beg bet bib bid big bin bit bob bog boo bow box boy bra bud bug bum bun bus but buy bye cab cad cam can cap car cat cop cot cow coy cry cub cue cup cut dab dad dam day den dew did die dig dim din dip doe dog don dot dry dub due dug dye ear eat ebb egg ego elf elk elm emu end era eve ewe eye fab fad fan far fat fax fed fee fen few fib fig fin fir fit fix flu fly foe fog for fox fry fun fur gag gal gap gas gay gel gem get gig gin gnu god got gum gun gut guy gym had hag ham has hat hay hem hen her hid him hip his hit hob hog hop hot how hub hue hug hum hut ice icy ill imp ink inn ion its ivy jab jam jar jaw jet jig job jog jot joy jug kid kin kit lab lad lag lap law lay led leg let lid lie lip lit log lot low mad man map mat may men met mid mix mob mod mom mop mud mug mum nag nan nap nay net new nil nip nit nod nor not now nun nut oak oar oat odd off oil old one opt orb ore our out owe owl own pad pal pan pap par pat paw pay pea peg pen pep per pet pew pie pig pin pit ply pod pop pot pro pry pub pug pun pup put rag ram ran rap rat raw ray red rib rid rig rim rip rob rod roe rot row rub rug rum run rut rye sad sag sat saw say sea see set sew sex she shy sin sip sir sis sit six ski sky sly sob sod son sow soy spa spy sty sub sum sun tab tag tan tap tar tax tea ten the tie tin tip toe ton too top tow toy try tub tug two urn use van vat vet vow wag war was wax way web wed wet who why wig win wit woe wok won woo wow yak yam yap yes yet yew you zap zen zip zoo
eid ramadan diwali hanukkah chanukah passover easter christmas xmas baptism christening muslim muslims islam islamic christian catholic jewish judaism hindu hinduism sikh sikhism buddhist buddhism atheist agnostic mosque synagogue church halal kosher interfaith
xbox playstation nintendo fortnite minecraft roblox twitch tiktok instagram facebook whatsapp snapchat youtube netflix gamer gamers gaming esports ps4 ps5
throuple throuples triad triads polyamory polyamorous polycule metamour metamours monogamous nonmonogamous queer lgbt lgbtq bisexual lesbian nonbinary transgender
fiance fiancee fiancé fiancée prenup prenuptial spender spenders saver savers dorm dorms roommate roommates housemate flatmate cofounder cofounders coparent coparenting
nan nana nanna gran granny grandad granddad grandpa grandma gramps grandson granddaughter grandkids stepmum stepmom stepdad stepkids toddler toddlers twins triplets newborn
deployment deployed veteran veterans homecoming reintegration fifo offshore nightshift wfh adhd autistic dyslexic dyspraxia fidgeting fidgety parkinson parkinsons dementia alzheimers fibromyalgia covid carer carers caregiver respite rehab kinship
christen christened christening christenings baptise baptised baptize baptized aqiqah naming-ceremony bris godparent godparents godmother godfather
boyfriend boyfriends girlfriend girlfriends befriend gf bf bff hubby wifey fiances fiancees inhaler inhalers handover handovers mediator mediators inheritance probate executor
wont dont cant didnt doesnt isnt wasnt arent werent wouldnt couldnt shouldnt havent hasnt hadnt youre theyre thats whats
construccion construcción obra horas trabaja trabajamos cansadas turnos turno noches
ayuda ayudar pareja parejas esposa esposo marido mujer hombre hijos hijo hija hijas ninos nino nina ninas bebe bebes gemelos gemelas cuidador cuidadora cuidadores cuidar cuidado familia casa trabajo dinero tareas quehaceres pelea peleas pelean peleamos discutir discusion enojado enojada enojo miedo calma tranquilo tranquila cansado cansada divorcio separados separacion suegra suegro suegros abuela abuelo abuelos abuelita madre padre mama papa novio novia amor relacion matrimonio gritar grita gritos violencia seguridad necesito tengo tiene somos estoy esta como que por para con sin mas muy bien mal ayudame hablar hablamos escuchar tiempo noche dia semana escuela salud enfermedad enferma enfermo parkinson demencia hogar juntos solo sola soltero soltera mudanza boda dinero ahorro gasto deuda dios iglesia fe navidad pascua bautizo espanol castellano latino latina hispano gracias hola donde cuando porque quien puedo quiero siento triste feliz celoso celosa respeto confianza
'''

OUT = os.path.join(ROOT, 'assets', 'js', 'search-index.js')
TEXT_CHARS = 2400   # how much body text is kept per page
# the site's own working pages (rollout status, roadmap, how it's built) are for the people who make it, not for search
SKIP = re.compile(r'^(tools|supabase|_|node_modules|architecture|infrastructure|notes|manuscript|samples|telemetry)/|(^|/)(garden-backdrop|offline|404|pal-cam-tv)\.html$|^(telemetry|roadmap|suite-index|suite-index-in-depth|dashboard)\.html$')


class Page(HTMLParser):
    SKIP_TAGS = {'script', 'style', 'noscript', 'svg', 'template', 'nav', 'header-skip', 'button', 'select', 'textarea', 'form'}
    # the breadcrumb and the "simple / full" line aren't prose: leave them out of the text, so a result's
    # snippet reads as a sentence from the page, not a string of labels
    SKIP_CLASSES = {'read-code', 'depth-bar', 'breadcrumb', 'crumbs', 'no-index'}
    # headings are kept on their own (title, h1, section headings), not again inside the text
    HEAD_TAGS = {'h1', 'h2', 'h3'}

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title = ''
        self.h1 = ''
        self.heads = []
        self.desc = ''
        self.text = []
        self.noindex = False
        self.refresh = False
        self._stack = []
        self._skip = 0
        self._cap = None
        self._buf = []
        self._in_main = 0
        self._saw_main = False
        self._body_text = []

    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'meta':
            name = (a.get('name') or '').lower()
            if name == 'description':
                self.desc = a.get('content') or ''
            if name == 'robots' and 'noindex' in (a.get('content') or ''):
                self.noindex = True
            if (a.get('http-equiv') or '').lower() == 'refresh':
                self.refresh = True
            return
        if tag in ('br', 'img', 'input', 'link', 'hr', 'meta', 'source', 'wbr'):
            return
        classes = set((a.get('class') or '').split())
        skip = tag in self.SKIP_TAGS or (a.get('aria-hidden') == 'true') or bool(classes & self.SKIP_CLASSES) or tag in self.HEAD_TAGS
        self._stack.append((tag, skip))
        if skip:
            self._skip += 1
        if tag == 'main':
            self._in_main += 1
            self._saw_main = True
        # an SVG picture's <title> is its alt text, never the page's name: only the first <title> outside
        # a skipped block (svg, script) is the page title
        if tag == 'title' and (self.title or self._skip):
            return
        if tag in ('title', 'h1', 'h2', 'h3'):
            self._cap = tag
            self._buf = []

    def handle_endtag(self, tag):
        if not any(t == tag for t, _ in self._stack):
            return
        while self._stack:
            t, skipped = self._stack.pop()
            if skipped:
                self._skip = max(0, self._skip - 1)
            if t == 'main':
                self._in_main = max(0, self._in_main - 1)
            if t == self._cap:
                words = clean(''.join(self._buf))
                if t == 'title':
                    self.title = words
                elif t == 'h1' and not self.h1:
                    self.h1 = words
                elif t in ('h2', 'h3') and words and len(self.heads) < 24:
                    self.heads.append(words)
                self._cap = None
            if t == tag:
                break

    def handle_data(self, data):
        if self._cap:
            self._buf.append(data)
        if self._skip or self._cap == 'title':
            return
        (self.text if self._in_main else self._body_text).append(data)


def fold(s):
    s = unicodedata.normalize('NFD', (s or '').lower())
    return ''.join(c for c in s if not unicodedata.combining(c)).replace('\u2019', "'").replace('\u2018', "'")


def deletes(w, n):
    """w with up to n letters taken out (symmetric-delete spelling index)."""
    out, edge = {w}, {w}
    for _ in range(n):
        edge = {x[:i] + x[i + 1:] for x in edge for i in range(len(x))}
        out |= edge
    return out


def forms(w):
    """w and the plain forms the search also accepts as real (twin -> twins, game -> gaming)."""
    f = {w, w + 's', w + 'es', w + 'ed', w + 'd', w + 'ing', w + 'er', w + 'ers'}
    if w.endswith('e'):
        f |= {w[:-1] + 'ing', w + 'r', w + 'rs'}
    if w.endswith('y'):
        f |= {w[:-1] + 'ies', w[:-1] + 'ied'}
    if len(w) > 2 and w[-1] not in 'aeiouwxy' and w[-2] in 'aeiou':
        f |= {w + w[-1] + 'ing', w + w[-1] + 'ed', w + w[-1] + 'er'}
    return f


def clean(s):
    return re.sub(r'\s+', ' ', html.unescape(s or '')).strip()


def pages():
    try:
        out = subprocess.check_output(['git', 'ls-files', '-co', '--exclude-standard', '*.html'], cwd=ROOT).decode()
        files = [f for f in out.split('\n') if f]
    except Exception:
        files = []
        for d, _, fs in os.walk(ROOT):
            for f in fs:
                if f.endswith('.html'):
                    files.append(os.path.relpath(os.path.join(d, f), ROOT))
    return sorted(f for f in files if not SKIP.search(f))


def main():
    rows = []
    for f in pages():
        path = os.path.join(ROOT, f)
        if not os.path.exists(path):
            continue
        p = Page()
        try:
            p.feed(open(path, encoding='utf-8', errors='replace').read())
        except Exception as e:  # a broken page shouldn't stop the index
            print('skipped', f, e, file=sys.stderr)
            continue
        if p.noindex or p.refresh:
            continue
        body = clean(' '.join(p.text if p._saw_main else p._body_text))
        title = re.sub(r'\s+[—–|-]\s+The Objective Ledger.*$', '', p.title)
        title = re.sub(r'\s*[·|–—-]\s*Spread Love (&|and) Acceptance\s*$', '', title).strip() or p.h1 or f
        url = '/' + f
        rows.append({
            'u': url,
            't': title,
            'h': p.h1 if p.h1 and p.h1 != title else '',
            'd': clean(p.desc)[:240],
            's': p.heads,
            'x': body[:TEXT_CHARS],
            'f': 1 if url.endswith('-in-depth.html') else 0,
        })
    # the site's own words (the browser builds this list again from the pages) don't need repeating
    site_words = set()
    for r in rows:
        blob = ' '.join([r['t'], r['h'], ' '.join(r['s']), r['d'], r['x']])
        site_words.update(w for w in re.split(r"[^a-z0-9'-]+", fold(blob)) if len(w) > 2)
    real = set()
    try:
        for line in open(COMMON, encoding='utf-8'):
            w = line.strip().lower()
            if w and not w.startswith('#') and ' ' not in w:
                real.add(fold(w))
    except OSError:
        print('note: tools/chat/common-words.txt not found; only the built-in word list is used', file=sys.stderr)
    real.update(fold(w) for w in REAL_EXTRA.split())
    real = [w for w in real if len(w) > 2 and re.fullmatch(r"[a-z0-9'-]+", w) and w not in site_words]
    # keep only the words a typo fix could wrongly reach: a word (or its -s/-ed/-ing/-er form) within one or two
    # letters of a site word. The rest can't be "corrected" anyway, and leaving them out keeps the file small.
    near = set()
    for w in site_words:
        near.update(deletes(w, 1 if len(w) <= 4 else 2))
    def at_risk(w):
        for f in forms(w):
            if f not in site_words and deletes(f, 1 if len(f) <= 4 else 2) & near:
                return True
        return False
    real = sorted(w for w in real if at_risk(w))
    data = {'v': 1, 'pages': rows, 'w': ' '.join(real)}
    js = ('/* search-index.js: built by tools/search/build_index.py. Do not edit by hand; run the script again.\n'
          '   Used only in the browser by the menu\'s "Search the site" box. */\n'
          'window.TOL_SEARCH = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    with open(OUT, 'w', encoding='utf-8') as fh:
        fh.write(js)
    print('indexed %d pages, %d KB -> %s' % (len(rows), len(js.encode('utf-8')) // 1024, os.path.relpath(OUT, ROOT)))
    build_needs(rows)


# ---------- the "needs" layer: everyday words for a problem -> the best 1-3 pages ----------
# tools/search/needs.json is written by hand. This checks it and writes assets/js/search-needs.js, a small
# file the search loads first (before the big index), so "Best match for what you described" shows at once.
NEEDS_IN = os.path.join(ROOT, 'tools', 'search', 'needs.json')
NEEDS_OUT = os.path.join(ROOT, 'assets', 'js', 'search-needs.js')
REGISTRY = os.path.join(ROOT, 'assets', 'js', 'tools-registry.js')


def registry():
    """The tools list (tools-registry.js), read with node; [] if node isn't there."""
    code = ("global.window={};require(process.argv[1]);process.stdout.write(JSON.stringify("
            "(window.TOLTools||[]).map(function(t){return {id:t.id,name:t.name,href:t.href,who:t.who||[],modes:t.modes||[]};})))")
    try:
        return json.loads(subprocess.check_output(['node', '-e', code, REGISTRY], cwd=ROOT).decode())
    except Exception as e:
        print('note: could not read tools-registry.js with node (%s); titles come from the pages' % e, file=sys.stderr)
        return []


def stub_target(path):
    """Where a redirect stub sends people (its meta refresh), or None for a real page."""
    try:
        src = open(path, encoding='utf-8', errors='replace').read(6000)
    except OSError:
        return None
    m = re.search(r'http-equiv=["\']refresh["\'][^>]*content=["\'][^"\']*url=([^"\'>\s]+)', src, re.I)
    return html.unescape(m.group(1)) if m else None


def split_url(u):
    path, rest = re.match(r'^([^?#]*)(.*)$', u).groups()
    return path, rest


def resolve(u, seen=0):
    """Follow redirect stubs (a merged tool's old address) to the page it moved to. Keeps the #part asked for
    when the new address has none."""
    path, rest = split_url(u)
    f = os.path.join(ROOT, path.lstrip('/'))
    if path.endswith('/'):
        f = os.path.join(f, 'index.html')
    if not os.path.isfile(f):
        return None
    t = stub_target(f)
    if not t or seen > 4:
        return u
    tp, trest = split_url(t)
    if not tp.startswith('/'):
        tp = '/' + os.path.normpath(os.path.join(os.path.dirname(path.lstrip('/')), tp)).lstrip('./')
    if '#' not in trest and '#' in rest:
        trest += rest[rest.index('#'):]
    return resolve(tp + trest, seen + 1)


def section_title(u, page_title):
    """A link to a part of a guide reads as 'Guide name: section heading'."""
    path, rest = split_url(u)
    if '#' not in rest:
        return page_title
    frag = rest[rest.index('#') + 1:]
    try:
        src = open(os.path.join(ROOT, path.lstrip('/')), encoding='utf-8', errors='replace').read()
    except OSError:
        return page_title
    m = re.search(r'<h[23][^>]*\bid=["\']' + re.escape(frag) + r'["\'][^>]*>(.*?)</h[23]>', src, re.S)
    if not m:
        return page_title
    head = clean(re.sub(r'<[^>]+>', ' ', m.group(1)))
    short = re.split(r'[:?]\s', page_title)[0].strip()
    return (short + ': ' + head) if head and short and short.lower() not in head.lower() else (head or page_title)


# the same tests the site uses (site.js kindOf): a workpaper is a numbered worksheet or a printable plan to fill in
WORKPAPER = re.compile(r'^/workpapers/(?!calculators/)|^/wp-\d|^/(prog-01|week-0|full-path|chore-chart-for-couples)\.html$')
TOOLISH = re.compile(r'^/(signal-translator|carrier-wave-decoder|lemonade-stand|wiring-card|wavelength|quick-checks|ladder|upset-right-now|night-garden|calm-visualizer|soundscapes|pause-and-play|word-bloom|quiet-words|quiet-crossword|daily-ledger-crossword|frequency-journey|recheck-drive|bears-dojo|surprise|ask|start-in-10-minutes|write-it-through|how-you-take-things-in|is-the-setup-working|look-back-30-days|quest|communication-style-quiz)\.html$|^/tools/|^/workpapers/calculators/|^/snapshot/|^/do/')


def build_needs(rows):
    try:
        src = json.load(open(NEEDS_IN, encoding='utf-8'))
    except (OSError, ValueError) as e:
        print('note: tools/search/needs.json not read (%s); search-needs.js not written' % e, file=sys.stderr)
        return
    tools = registry()
    by_href, by_path = {}, {}
    for t in tools:
        solo = 1 if 'solo' in t['who'] else 0
        # a place's ways in first (consol12): a mode reads "Place: mode", so a need that points at one of them says which
        for mode in t['modes']:   # [label, href, group, short label, icon]
            label, href = mode[0], mode[1]
            if href != t['href']:
                by_href.setdefault(href, (t['name'].split(':')[0].strip() + ': ' + label, solo))
        by_href.setdefault(t['href'], (t['name'], solo))
        if '#' not in t['href'] and '?' not in t['href']:
            by_path.setdefault(t['href'], (t['name'], solo))
    titles = {r['u']: r['t'] for r in rows}
    problems, needs, moved = [], [], 0
    seen_ids = set()
    for n in src.get('needs', []):
        if n['id'] in seen_ids:
            problems.append('duplicate id ' + n['id'])
        seen_ids.add(n['id'])
        go = []
        for g in n.get('go', []):
            u = resolve(g[0])
            if not u:
                problems.append('%s: %s does not exist' % (n['id'], g[0]))
                continue
            if u != g[0]:
                moved += 1
            path = split_url(u)[0]
            hit = by_href.get(u) or by_href.get(g[0]) or by_path.get(path)
            title = g[2] if len(g) > 2 and g[2] else (hit[0] if hit else section_title(u, titles.get(path) or path))
            # a guide or a page to read works for one person; a tool says who it's for
            solo = hit[1] if hit else 1
            if any(x[0] == u for x in go):
                continue
            # workpapers and tools are kept apart everywhere: 'w' a workpaper (a worksheet to fill in), 't' a tool, '' a page to read
            kind = 'w' if WORKPAPER.search(path) else ('t' if hit or TOOLISH.search(path) else '')
            go.append([u, title, g[1], solo, kind])
        if not go or not n.get('say'):
            problems.append('%s: nothing to show' % n['id'])
            continue
        needs.append({'id': n['id'], 'l': n['l'], 's': n['say'], 'g': go})
    # what usually comes next: for each page, the pages named beside it in the same needs (most often first)
    pair = {}
    for n in needs:
        us = [split_url(g[0])[0] for g in n['g']]
        for a in us:
            for b in n['g']:
                bp = split_url(b[0])[0]
                if bp == a:
                    continue
                d = pair.setdefault(a, {})
                d[b[0]] = d.get(b[0], 0) + 1
    nxt = {a: [u for u, _ in sorted(d.items(), key=lambda kv: -kv[1])[:5]] for a, d in pair.items()}
    data = {'v': 1, 'chips': src.get('chips', []), 'syn': src.get('syn', {}), 'needs': needs, 'next': nxt}
    js = ('/* search-needs.js: built by tools/search/build_index.py from tools/search/needs.json. Do not edit by hand.\n'
          '   Everyday ways to describe a problem, and the pages that help. Used only in the browser by the search. */\n'
          'window.TOL_NEEDS = ' + json.dumps(data, ensure_ascii=False, separators=(',', ':')) + ';\n')
    with open(NEEDS_OUT, 'w', encoding='utf-8') as fh:
        fh.write(js)
    for p in problems:
        print('needs.json: ' + p, file=sys.stderr)
    print('needs: %d needs, %d phrasings, %d addresses moved to a merged page, %d KB -> %s' % (
        len(needs), sum(len(n['s']) for n in needs), moved, len(js.encode('utf-8')) // 1024, os.path.relpath(NEEDS_OUT, ROOT)))


if __name__ == '__main__':
    main()
