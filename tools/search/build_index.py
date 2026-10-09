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
ayuda ayudar pareja parejas esposa esposo marido mujer hombre hijos hijo hija hijas ninos nino nina ninas bebe bebes gemelos gemelas cuidador cuidadora cuidadores cuidar cuidado familia casa trabajo dinero tareas quehaceres pelea peleas pelean peleamos discutir discusion enojado enojada enojo miedo calma tranquilo tranquila cansado cansada divorcio separados separacion suegra suegro suegros abuela abuelo abuelos abuelita madre padre mama papa novio novia amor relacion matrimonio gritar grita gritos violencia seguridad necesito tengo tiene somos estoy esta como que por para con sin mas muy bien mal ayudame hablar hablamos escuchar tiempo noche dia semana escuela salud enfermedad enferma enfermo parkinson demencia hogar juntos solo sola soltero soltera mudanza boda dinero ahorro gasto deuda dios iglesia fe navidad pascua bautizo espanol castellano latino latina hispano gracias hola donde cuando porque quien puedo quiero siento triste feliz celoso celosa respeto confianza
'''

OUT = os.path.join(ROOT, 'assets', 'js', 'search-index.js')
TEXT_CHARS = 2400   # how much body text is kept per page
SKIP = re.compile(r'^(tools|supabase|_|node_modules)/|(^|/)(garden-backdrop|offline|404|pal-cam-tv)\.html$')


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


if __name__ == '__main__':
    main()
