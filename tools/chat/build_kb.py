#!/usr/bin/env python3
"""Build the on-device chat knowledge base: assets/js/chat-kb.js.

Walks the site's public pages, splits their main content into short passages
by heading, adds the glossary behind the mini dives (assets/js/dives-glossary.js)
and the little tips library (assets/js/tips.js), removes near-duplicates, and
writes everything as one static script: window.TOL_CHAT_KB = {...}.

Python 3 standard library only. Run from anywhere:
    python3 tools/chat/build_kb.py
"""
import json
import os
import re
import sys
from html import unescape
from html.parser import HTMLParser

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'assets', 'js', 'chat-kb.js')

# Pages that are not reading content, or not public.
SKIP_FILES = {'garden-backdrop.html', 'offline.html', '404.html', 'dashboard.html', 'ask.html'}
SKIP_DIRS = {'tools', 'supabase', '.git', 'node_modules', '_site', 'assets', 'data',
             'manuscript', 'notes', 'samples', 'store', 'telemetry', 'infrastructure'}

MIN_WORDS, TARGET_WORDS, MAX_WORDS = 40, 110, 160

VOID = {'area', 'base', 'br', 'col', 'embed', 'hr', 'img', 'input', 'link', 'meta',
        'param', 'source', 'track', 'wbr'}
SKIP_TAGS = {'script', 'style', 'noscript', 'template', 'svg', 'nav', 'button', 'select',
             'textarea', 'option', 'canvas', 'audio', 'video', 'iframe', 'pre', 'dialog', 'head'}
SKIP_CLASSES = {'depth-bar', 'dig', 'read-code', 'tol-bar', 'tol-panel', 'skip', 'sr-only',
                'visually-hidden', 'announce-tag', 'tol-private', 'print-only', 'tol-index', 'tol-access'}
INLINE = {'span', 'a', 'small', 'strong', 'em', 'b', 'i', 'code', 'abbr', 'sup', 'sub', 'mark', 'time', 'label', 'kbd', 'q', 'cite'}


def join_inline(s):
    """Inline tag boundaries are marked with \\x00: add a space only where two words were glued
    together by markup (e.g. <span>WP-02</span><span>The Battery</span>)."""
    return re.sub(r'(?<=(.))\x00+(?=(.))', lambda m: ' ' if (m.group(1).isalnum() and m.group(2).isupper()
                  and (m.group(1).islower() or m.group(1).isdigit())) else '', s).replace('\x00', '')


BLOCK = {'p', 'li', 'dd', 'dt', 'div', 'section', 'article', 'blockquote', 'figcaption', 'tr',
         'summary', 'caption', 'h5', 'h6', 'table', 'ul', 'ol', 'dl', 'details', 'figure',
         'aside', 'header', 'footer', 'main', 'label', 'fieldset', 'legend', 'form', 'br', 'hr'}
HEADINGS = {'h1', 'h2', 'h3', 'h4'}
CELL = {'td', 'th'}


def norm_space(s):
    return re.sub(r'\s+', ' ', s).strip()


class PageParser(HTMLParser):
    """Collects (heading, anchor, [sentences]) sections from a page's <main>."""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.title = ''
        self.in_title = False
        self.has_main = False
        self.stack = []          # [tag, id, skipping, is_main]
        self.skip = 0
        self.main_depth = 0
        self.body_depth = 0
        self.buf = []
        self.head_buf = None     # collecting heading text
        self.head_level = 0
        self.last_id = ''
        self.sections = []       # dicts: h, level, a, s (sentences)
        self.cur = {'h': '', 'level': 1, 'a': '', 's': []}
        self.redirect = False

    # ---- helpers
    def active(self):
        # use <main> when the page has one; otherwise the whole body
        return self.skip == 0 and (self.main_depth > 0 or (not self.has_main and self.body_depth > 0))

    def flush(self):
        if self.head_buf is not None:
            return
        t = norm_space(join_inline(''.join(self.buf)))
        self.buf = []
        if not t or len(t) < 2:
            return
        t = t.strip(' —–-·|')
        if not t:
            return
        if (re.search(r'[=÷×]', t) and len(t.split()) < 7) or re.fullmatch(r'\w*_\w*\.?', t):
            return  # worksheet formulas and field names, not prose
        if not re.search(r'[.!?:;…”"’)]$', t):
            t += '.'
        self.cur['s'].append(t)

    def ancestor_id(self):
        for fr in reversed(self.stack):
            if fr[1] and fr[0] not in ('main', 'body', 'html'):
                return fr[1]
        return ''

    # ---- parser hooks
    def handle_starttag(self, tag, attrs):
        a = dict(attrs)
        if tag == 'meta' and (a.get('http-equiv') or '').lower() == 'refresh':
            self.redirect = True
        if tag == 'title':
            self.in_title = True
        if tag in VOID:
            if tag in ('br', 'hr') and self.active():
                self.flush()
            return
        cls = set((a.get('class') or '').split())
        skipping = (tag in SKIP_TAGS or bool(cls & SKIP_CLASSES) or a.get('aria-hidden') == 'true'
                    or 'hidden' in a or (a.get('role') == 'dialog'))
        is_main = tag == 'main'
        if tag == 'body':
            self.body_depth += 1
        if is_main:
            self.main_depth += 1
        if self.active() and (tag in BLOCK or tag in HEADINGS):
            self.flush()
        if a.get('id'):
            self.last_id = a['id'] if self.skip == 0 else self.last_id
        self.stack.append([tag, a.get('id', ''), skipping, is_main])
        if skipping:
            self.skip += 1
            return
        if self.active():
            if tag in INLINE:
                (self.head_buf if self.head_buf is not None else self.buf).append('\x00')
            if tag in HEADINGS:
                self.head_buf = []
                self.head_level = int(tag[1])
                self.head_id = a.get('id') or self.ancestor_id() or self.last_id
            elif tag in CELL:
                self.buf.append(' — ')

    def handle_endtag(self, tag):
        if tag == 'title':
            self.in_title = False
        if tag in VOID:
            return
        # pop to the matching tag (tolerate sloppy HTML)
        idx = None
        for i in range(len(self.stack) - 1, -1, -1):
            if self.stack[i][0] == tag:
                idx = i
                break
        if idx is None:
            return
        while len(self.stack) > idx:
            fr = self.stack.pop()
            if fr[0] in INLINE and self.active():
                (self.head_buf if self.head_buf is not None else self.buf).append('\x00')
            if fr[2]:
                self.skip -= 1
            if self.skip == 0 and fr[0] in HEADINGS and self.head_buf is not None:
                h = norm_space(join_inline(''.join(self.head_buf)))
                self.head_buf = None
                if h:
                    self.sections.append(self.cur)
                    lv = self.head_level
                    self.levels = {k: v for k, v in getattr(self, 'levels', {}).items() if k < lv}
                    parent = self.levels[max(self.levels)] if self.levels and max(self.levels) > 1 else ''
                    self.levels[lv] = h
                    # a bare heading like "Start with" or "Partner B" reads better with its parent's name
                    shown = parent + ': ' + h if parent and lv > 1 and len(h.split()) <= 2 and parent != h else h
                    self.cur = {'h': shown, 'level': lv, 'a': self.head_id, 's': [], 'raw': h}
            elif self.skip == 0 and (fr[0] in BLOCK) and self.active():
                self.flush()
            if fr[3]:
                if self.skip == 0:
                    self.flush()
                self.main_depth -= 1
            if fr[0] == 'body':
                self.body_depth -= 1

    def handle_data(self, data):
        if self.in_title:
            self.title += data
            return
        if not self.active():
            return
        if self.head_buf is not None:
            self.head_buf.append(data)
        else:
            self.buf.append(data)

    def close(self):
        super().close()
        self.flush()
        self.sections.append(self.cur)

    def handle_startendtag(self, tag, attrs):
        self.handle_starttag(tag, attrs)


def clean_title(t):
    t = norm_space(unescape(t))
    t = re.sub(r'\s*[—|–·-]\s*The Objective Ledger.*$', '', t)
    t = re.sub(r'\s+—\s+.*$', '', t) if len(t) > 48 else t
    return t or 'The Objective Ledger'


def words(s):
    return s.split()


def chunk_section(sentences):
    """Greedy chunks of whole sentences, ~TARGET words, never over MAX."""
    out, cur, n = [], [], 0
    for s in sentences:
        w = len(words(s))
        if w > MAX_WORDS:  # a very long "sentence": split on sentence marks, then on words
            parts = re.split(r'(?<=[.!?])\s+', s)
            if len(parts) == 1:
                ws = words(s)
                parts = [' '.join(ws[i:i + TARGET_WORDS]) for i in range(0, len(ws), TARGET_WORDS)]
            for p in parts:
                out, cur, n = _add(out, cur, n, p)
            continue
        out, cur, n = _add(out, cur, n, s)
    if cur:
        if out and n < MIN_WORDS and len(words(out[-1])) + n <= MAX_WORDS + 40:
            out[-1] = out[-1] + ' ' + ' '.join(cur)
        else:
            out.append(' '.join(cur))
    return out


def _add(out, cur, n, s):
    w = len(words(s))
    if cur and n + w > MAX_WORDS:
        out.append(' '.join(cur))
        cur, n = [], 0
    cur.append(s)
    n += w
    if n >= TARGET_WORDS:
        out.append(' '.join(cur))
        cur, n = [], 0
    return out, cur, n


def site_sections():
    """Page codes, titles and "Also called" names from the site menu in site.js."""
    src = open(os.path.join(ROOT, 'assets', 'js', 'site.js'), encoding='utf-8').read()
    meta = {}
    for m in re.finditer(r"\{ href: '([^']+)',(?: deep: true,)? code: '([^']*)', title: '([^']*)', note: '([^']*)'", src):
        href, code, title, note = m.groups()
        path = href.split('#')[0]
        aka = re.findall(r'Also called (?:the )?([^.]+)', note)
        for p in {path, path.replace('.html', '-in-depth.html')}:
            e = meta.setdefault(p, {'codes': set(), 'names': set(), 'order': len(meta)})
            if code and code not in ('New', 'Tool', 'Guide', 'Game', 'All', 'You', 'Map', 'Daily', 'Audio', 'Album', 'Podcast', 'Stories', 'Suite', 'Fill-in'):
                e['codes'].add(code)
            e['names'].add(title)
            for x in aka:
                e['names'].add(x.strip())
    return meta


def find_pages():
    pages = []
    for dp, dns, fns in os.walk(ROOT):
        rel = os.path.relpath(dp, ROOT)
        top = rel.split(os.sep)[0]
        if top in SKIP_DIRS:
            dns[:] = []
            continue
        dns[:] = [d for d in dns if not d.startswith('.')]
        for fn in fns:
            if not fn.endswith('.html') or fn in SKIP_FILES:
                continue
            p = os.path.join(dp, fn)
            pages.append('/' + os.path.relpath(p, ROOT).replace(os.sep, '/'))
    return pages


# ---------------------------------------------------------------- glossary
def parse_js_string(src, i):
    """Parse a JS single/double-quoted string starting at src[i]; return (value, next index)."""
    q = src[i]
    j, out = i + 1, []
    while src[j] != q:
        if src[j] == '\\':
            nx = src[j + 1]
            out.append({'n': '\n', 't': '\t'}.get(nx, nx))
            j += 2
        else:
            out.append(src[j])
            j += 1
    return ''.join(out), j + 1


def load_glossary():
    src = open(os.path.join(ROOT, 'assets', 'js', 'dives-glossary.js'), encoding='utf-8').read()
    src = re.sub(r'/\*.*?\*/', '', src, flags=re.S)
    entries = {}
    for m in re.finditer(r'^\s{2}([a-z0-9_]+): \{', src, flags=re.M):
        key, i = m.group(1), m.end()
        e, depth = {}, 1
        # read "field: value" pairs until the entry's closing brace
        while depth:
            c = src[i]
            if c in ' \n\t,':
                i += 1
                continue
            if c == '}':
                depth -= 1
                i += 1
                continue
            fm = re.match(r'([a-z]+):\s*', src[i:])
            if not fm:
                i += 1
                continue
            field = fm.group(1)
            i += fm.end()
            if src[i] in '\'"':
                val, i = parse_js_string(src, i)
            elif src[i] == '[':
                val, i = [], i + 1
                while src[i] != ']':
                    if src[i] in '\'"':
                        s, i = parse_js_string(src, i)
                        val.append(s)
                    else:
                        i += 1
                i += 1
            else:
                vm = re.match(r'[^,}\n]+', src[i:])
                val = vm.group(0).strip()
                i += vm.end()
            e[field] = val
        entries[key] = e
    return entries


def load_tips():
    src = open(os.path.join(ROOT, 'assets', 'js', 'tips.js'), encoding='utf-8').read()
    cats = dict(re.findall(r"(\w+): '([^']+)'", src.split('tips:')[0]))
    tips = []
    for m in re.finditer(r"\['(\w+)', '((?:[^'\\]|\\.)*)', '((?:[^'\\]|\\.)*)'\]", src):
        tips.append((m.group(1), m.group(2).replace("\\'", "'"), m.group(3).replace("\\'", "'")))
    return cats, tips


# ---------------------------------------------------------------- keywords
STOP = set('''a about above after again against all am an and any are as at be because been before
being below between both but by can could did do does doing down during each few for from further
had has have having he her here hers herself him himself his how i if in into is it its itself just
me more most my myself no nor not now of off on once only or other our ours ourselves out over own
same she should so some such than that the their theirs them themselves then there these they this
those through to too under until up very was we were what when where which while who whom why will
with you your yours yourself yourselves also one two it’s that’s you’re don’t isn’t can’t'''.split())


def keywords(text, n=8):
    counts = {}
    for w in re.findall(r"[a-z][a-z0-9’'-]{3,}", text.lower()):
        if w in STOP:
            continue
        counts[w] = counts.get(w, 0) + 1
    return [w for w, c in sorted(counts.items(), key=lambda x: (-x[1], x[0]))[:n] if c > 1]


# ---------------------------------------------------------------- dedupe
def shingles(text):
    ws = re.findall(r'[a-z0-9]+', text.lower())
    return {' '.join(ws[i:i + 3]) for i in range(max(1, len(ws) - 2))}


def dedupe(docs):
    index, kept, sets = {}, [], []
    dropped = 0
    for d in docs:
        sh = shingles(d['x'])
        counts = {}
        for s in sh:
            for j in index.get(s, ()):
                counts[j] = counts.get(j, 0) + 1
        dup = False
        for j, c in counts.items():
            if c / max(1, min(len(sh), len(sets[j]))) > 0.8:
                dup = True
                break
        if dup:
            dropped += 1
            continue
        k = len(kept)
        kept.append(d)
        sets.append(sh)
        for s in sh:
            index.setdefault(s, []).append(k)
    return kept, dropped


# ---------------------------------------------------------------- synonyms
# Everyday words people type, mapped to the words the site itself uses.
SYN = {
    'fight': ['argument', 'conflict', 'squeal', 'friction', 'repair'],
    'fighting': ['argument', 'conflict', 'squeal', 'friction'],
    'argue': ['argument', 'conflict', 'squeal', 'friction'],
    'arguing': ['argument', 'conflict', 'squeal', 'friction'],
    'disagree': ['conflict', 'argument', 'friction'],
    'yelling': ['squeal', 'flooded', 'tone', 'escalation'],
    'shouting': ['squeal', 'flooded', 'tone'],
    'angry': ['anger', 'flooded', 'sympathetic', 'arousal', 'tone'],
    'mad': ['anger', 'flooded', 'tone'],
    'upset': ['flooded', 'hurt', 'tone', 'dysregulation'],
    'chores': ['housework', 'load', 'unbilled', 'tasks', 'owner', 'raci', 'lemonade', 'household'],
    'chore': ['housework', 'load', 'unbilled', 'task', 'owner', 'raci'],
    'housework': ['chores', 'unbilled', 'load', 'household', 'lemonade'],
    'cleaning': ['chores', 'housework', 'household', 'tasks'],
    'dishes': ['chores', 'housework', 'tasks', 'owner'],
    'laundry': ['chores', 'housework', 'tasks', 'owner'],
    'mental': ['invisible', 'unbilled', 'load'],
    'unfair': ['fair', 'parity', 'balance', 'split', 'unbilled'],
    'fair': ['parity', 'balance', 'split', 'fairness'],
    'fairness': ['fair', 'parity', 'balance'],
    'split': ['balance', 'load', 'fair', 'share'],
    'nagging': ['asking', 'owner', 'raci', 'reminding', 'complaint'],
    'nag': ['asking', 'owner', 'raci', 'reminding'],
    'reminding': ['owner', 'raci', 'invisible', 'unbilled'],
    'tired': ['battery', 'stress', 'saturation', 'exhausted', 'capacity', 'rest'],
    'exhausted': ['battery', 'saturation', 'stress', 'capacity', 'rest', 'burnout'],
    'burnout': ['battery', 'saturation', 'capacity', 'exhausted', 'extraction'],
    'burnt': ['battery', 'saturation', 'burnout'],
    'stressed': ['stress', 'battery', 'saturation', 'baseline', 'load'],
    'overwhelmed': ['overload', 'flooded', 'saturation', 'battery', 'stress'],
    'overwhelm': ['overload', 'flooded', 'saturation', 'battery'],
    'anxious': ['anxiety', 'hypervigilance', 'sympathetic', 'calm'],
    'worried': ['anxiety', 'worry', 'calm'],
    'panic': ['calm', 'breathing', 'sympathetic', 'flooded', 'anxiety'],
    'calm': ['regulate', 'breathing', 'kit', 'settle', 'garden'],
    'relax': ['calm', 'breathing', 'settle', 'regulate', 'garden'],
    'breathe': ['breathing', 'box', 'asymmetric', 'calm'],
    'breath': ['breathing', 'box', 'asymmetric'],
    'sleep': ['rest', 'tired', 'night'],
    'shutdown': ['dorsal', 'shut', 'stonewalling', 'flooded'],
    'silent': ['silence', 'stonewalling', 'shut', 'withdraw'],
    'silence': ['stonewalling', 'dorsal', 'wiring', 'card'],
    'ignore': ['stonewalling', 'bids', 'turning'],
    'ignored': ['bids', 'turning', 'unseen', 'invisible'],
    'ignores': ['bids', 'turning', 'stonewalling'],
    'unappreciated': ['appreciation', 'invisible', 'unbilled', 'unseen', 'thanks'],
    'appreciated': ['appreciation', 'fondness', 'thanks'],
    'thank': ['appreciation', 'gratitude'],
    'gratitude': ['appreciation', 'fondness'],
    'closer': ['connection', 'turning', 'bids', 'rituals', 'fondness'],
    'connect': ['connection', 'turning', 'bids', 'rituals'],
    'connection': ['turning', 'bids', 'rituals', 'lovemap', 'fondness'],
    'distant': ['connection', 'turning', 'drift', 'bids'],
    'drifting': ['drift', 'connection', 'resync'],
    'romance': ['connection', 'fondness', 'rituals', 'turning'],
    'love': ['connection', 'fondness', 'turning', 'appreciation'],
    'talk': ['check-in', 'conversation', 'tone', 'talking'],
    'communicate': ['communication', 'tone', 'conversation', 'check-in', 'wiring'],
    'communication': ['tone', 'conversation', 'wiring', 'carrier'],
    'conversation': ['check-in', 'talk', 'tone', 'reader'],
    'text': ['message', 'reader', 'thread', 'tone'],
    'texts': ['message', 'reader', 'thread'],
    'message': ['text', 'tone', 'reader', 'translator'],
    'tone': ['carrier', 'register', 'filter', 'transducer'],
    'criticism': ['complaint', 'softstart', 'softened', 'contempt'],
    'criticize': ['criticism', 'complaint', 'softened'],
    'defensive': ['defensiveness', 'rebuttal', 'acknowledgement'],
    'sorry': ['repair', 'apology', 'acknowledgement'],
    'apologise': ['sorry', 'repair', 'apology', 'acknowledgement'],
    'apologize': ['sorry', 'repair', 'apology', 'acknowledgement'],
    'apology': ['sorry', 'repair', 'acknowledgement'],
    'makeup': ['repair', 'regroup'],
    'say no': ['refusal', 'boundary', 'capacity'],
    'boundaries': ['boundary', 'refusal', 'capacity'],
    'boundary': ['refusal', 'capacity', 'bandwidth'],
    'refuse': ['refusal', 'boundary'],
    'decline': ['refusal', 'boundary'],
    'autism': ['autistic', 'neurodivergent', 'wired', 'masking', 'double empathy'],
    'autistic': ['autism', 'neurodivergent', 'wired', 'masking', 'double empathy'],
    'asd': ['autistic', 'autism', 'neurodivergent'],
    'aspergers': ['autistic', 'autism', 'neurodivergent'],
    'asperger': ['autistic', 'autism'],
    'adhd': ['attention', 'neurodivergent', 'wired', 'rejection', 'audhd'],
    'audhd': ['autistic', 'adhd', 'neurodivergent'],
    'neurodivergent': ['wired', 'neurotype', 'autistic', 'adhd', 'neurodiversity'],
    'nd': ['neurodivergent', 'wired'],
    'nt': ['neurotypical'],
    'neurotypical': ['wired', 'neurotype', 'double empathy'],
    'neurodiversity': ['neurodivergent', 'wired'],
    'wiring': ['wired', 'neurotype', 'card'],
    'dyslexia': ['dyslexic'],
    'dyspraxia': ['dyspraxic'],
    'sensory': ['overload', 'gating', 'senses', 'sensitive'],
    'noise': ['sensory', 'overload', 'sound', 'soundscapes'],
    'loud': ['sensory', 'overload', 'noise'],
    'sensitive': ['hsp', 'sensory', 'rejection'],
    'rejection': ['rsd', 'rejection sensitivity'],
    'mask': ['masking'],
    'ocd': ['certainty', 'obsessive'],
    'hints': ['subtext'],
    'hint': ['subtext'],
    'literal': ['subtext', 'autistic', 'direct'],
    'direct': ['directness', 'literal', 'subtext'],
    'money': ['finances', 'budget', 'spending', 'frequency'],
    'finances': ['money', 'budget'],
    'kids': ['children', 'co-parents', 'family', 'parenting'],
    'children': ['kids', 'co-parents', 'family'],
    'parenting': ['co-parents', 'children', 'family'],
    'coparent': ['co-parents', 'co-parenting'],
    'divorce': ['co-parents', 'separated'],
    'roommate': ['roommates', 'housemates'],
    'roommates': ['housemates', 'lemonade', 'raci'],
    'flatmate': ['roommates'],
    'housemate': ['roommates'],
    'coworker': ['coworkers', 'teams', 'work'],
    'boss': ['coworkers', 'work', 'teams'],
    'job': ['work', 'coworkers', 'owner'],
    'friend': ['friends', 'friendship'],
    'parents': ['family', 'caregivers'],
    'mom': ['family', 'parents'],
    'dad': ['family', 'parents'],
    'family': ['parents', 'siblings', 'family script'],
    'caring': ['caregivers', 'caregiving'],
    'caregiver': ['caregivers', 'caregiving', 'battery'],
    'partner': ['partners', 'spouse', 'couple'],
    'husband': ['partner', 'partners', 'spouse'],
    'wife': ['partner', 'partners', 'spouse'],
    'boyfriend': ['partner', 'partners'],
    'girlfriend': ['partner', 'partners'],
    'spouse': ['partner', 'partners'],
    'marriage': ['partners', 'couple', 'relationship'],
    'couple': ['partners', 'relationship'],
    'score': ['keeping score', 'scorekeeping', 'ledger'],
    'scorekeeping': ['keeping score', 'score'],
    'daily': ['check-in', 'pll', 'ninety'],
    'checkin': ['check-in', 'check-ins', 'pll'],
    'weekly': ['resync', 'closing', 'rhythms'],
    'monthly': ['look-back', 'deficit', 'audit'],
    'start': ['start here', 'begin', 'first'],
    'begin': ['start', 'first'],
    'free': ['preview', 'ways in', 'membership'],
    'cost': ['price', 'membership', 'free', 'paid'],
    'price': ['membership', 'cost', 'paid'],
    'pay': ['membership', 'paid', 'price'],
    'privacy': ['private', 'device', 'data', 'privacy policy'],
    'data': ['privacy', 'device'],
    'refund': ['refund policy', 'cancellation'],
    'author': ['christian', 'creator', 'about'],
    'creator': ['christian', 'about'],
    'games': ['play', 'pause', 'crossword', 'word bloom', 'garden', 'petals'],
    'game': ['play', 'games', 'crossword', 'garden'],
    'puzzle': ['crossword', 'games', 'play'],
    'music': ['soundscapes', 'album', 'echoes', 'audio'],
    'podcast': ['episodes', 'kane'],
    'meditate': ['breathing', 'calm', 'garden'],
    'meditation': ['breathing', 'calm', 'garden'],
    'mood': ['mood arbitrage', 'weather', 'battery'],
    'sad': ['mood', 'low', 'dorsal', 'battery'],
    'lonely': ['connection', 'bids', 'turning'],
    'jealous': ['jealousy'],
    'trust': ['safety', 'repair', 'bond'],
    'contempt': ['eye-rolling', 'fondness', 'criticism'],
    'stonewall': ['stonewalling', 'flooded', 'shut'],
    'listen': ['listening', 'speaker-listener', 'acknowledgement', 'validation', 'heard'],
    'listens': ['listening', 'speaker-listener', 'acknowledgement', 'validation', 'heard'],
    'listening': ['speaker-listener', 'acknowledgement', 'validation'],
    'heard': ['acknowledgement', 'validation', 'listening'],
    'understood': ['validation', 'acknowledgement', 'double empathy'],
    'misunderstood': ['double empathy', 'wiring', 'carrier', 'intent', 'impact'],
    'misunderstand': ['double empathy', 'wiring', 'carrier', 'intent'],
    'harsh': ['tone', 'directness', 'carrier', 'softened'],
    'rude': ['tone', 'directness', 'carrier'],
    'nervous': ['nervous system', 'ladder', 'vagal'],
    'vagus': ['vagal', 'ventral', 'dorsal', 'ladder'],
    'polyvagal': ['ladder', 'ventral', 'dorsal', 'sympathetic'],
    'freeze': ['dorsal', 'shut', 'flooded'],
    'workpaper': ['worksheet', 'workpapers', 'wp'],
    'worksheet': ['workpaper', 'workpapers'],
    'program': ['prog-01', 'six', 'weeks', 'curriculum'],
    'course': ['program', 'prog-01', 'weeks'],
    'invisible': ['unbilled', 'unseen', 'mental', 'load'],
    'unseen': ['invisible', 'unbilled'],
    'resentment': ['unbilled', 'invisible', 'deficit', 'contempt'],
    'resent': ['resentment', 'unbilled', 'invisible'],
    'same': ['recurring', 'keeps', 'recurrence'],
    'again': ['recurring', 'keeps', 'recurrence', 'deficit'],
    'recurring': ['recurrence', 'deficit', 'keeps coming back'],
}


def main():
    meta = site_sections()
    pages = [p for p in find_pages()]
    # Menu pages first (in menu order), so their passages win over older copies when deduping.
    pages.sort(key=lambda p: (0, meta[p]['order']) if p in meta else (1, p))

    docs, n_pages, skipped = [], 0, []
    glossary = load_glossary()
    # Glossary first: the cleanest, plainest definitions.
    for key, e in glossary.items():
        parts = [e.get('s', ''), e.get('f', ''), e.get('w', '')]
        if e.get('x'):
            parts.append(e['x'])
        docs.append({
            'id': 'g:' + key, 't': e.get('t', key), 'h': e.get('t', key), 'u': e.get('u', ''),
            'x': '\n'.join(p for p in parts if p),
            'k': ' '.join([key] + list(e.get('m', []))),
            'm': list(e.get('m', [])), 'l': e.get('l', ''), 'g': 1,
        })

    for path in pages:
        fp = os.path.join(ROOT, path.lstrip('/'))
        raw = open(fp, encoding='utf-8', errors='replace').read()
        pp = PageParser()
        pp.has_main = bool(re.search(r"<main[\s>]", raw))
        try:
            pp.feed(raw)
            pp.close()
        except Exception as ex:  # pragma: no cover
            skipped.append((path, str(ex)))
            continue
        if pp.redirect:
            skipped.append((path, 'redirect'))
            continue
        n_pages += 1
        title = clean_title(pp.title)
        info = meta.get(path, {'codes': set(), 'names': set()})
        page_k = ' '.join(sorted(info['codes'])) + ' ' + ' '.join(sorted(info['names']))
        page_k += ' ' + ' '.join(re.findall(r'\b(?:WP|CALC|PROG|REPORT)-\d+\b', title))
        depth = 'in-depth' in path
        # Merge tiny sections (a heading with a line or two) into the following one.
        secs, carry = [], None
        for s in pp.sections:
            if re.search(r'sign-?off|prepared (&|and) reviewed|signatures?$', s.get('raw', s['h']), re.I):
                continue
            if carry:
                s = {'h': s['h'] or carry['h'], 'level': s['level'], 'a': s['a'] or carry['a'],
                     's': carry['s'] + s['s']}
                carry = None
            n = sum(len(words(x)) for x in s['s'])
            if n < 18:
                if s['s']:
                    carry = s
                continue
            secs.append(s)
        if carry and sum(len(words(x)) for x in carry['s']) >= 8:
            secs.append(carry)
        for si, s in enumerate(secs):
            chunks = chunk_section(s['s'])
            for ci, c in enumerate(chunks):
                if len(words(c)) < 12:
                    continue
                sents = [x for x in re.split(r'(?<=[.!?:;])\s+', c) if x]
                if len(words(c)) / max(1, len(sents)) < 4.5:
                    continue  # form labels and sign-off lines, not prose
                anchor = s['a']
                u = path + ('#' + anchor if anchor else '')
                h = s['h'] or title
                docs.append({
                    'id': '%s#%d.%d' % (path, si, ci), 't': title, 'h': h, 'u': u, 'x': c,
                    'k': norm_space(page_k + ' ' + ' '.join(keywords(c))),
                    'd': 1 if depth else 0,
                })

    cats, tips = load_tips()
    for i, (cat, t, b) in enumerate(tips):
        docs.append({'id': 't:%d' % i, 't': 'Little tip for today', 'h': t, 'u': '', 'x': t + ' ' + b,
                     'k': cat + ' ' + cats.get(cat, ''), 'tip': cats.get(cat, cat)})

    docs, dropped = dedupe(docs)
    for i, d in enumerate(docs):
        d['id'] = i  # compact ids
        if not d.get('d'):
            d.pop('d', None)

    kb = {'v': 1, 'docs': docs, 'syn': SYN}
    js = ('/* chat-kb.js — generated by tools/chat/build_kb.py. Do not edit by hand.\n'
          '   The on-device chat answers only from these passages of the site. */\n'
          'window.TOL_CHAT_KB = ' + json.dumps(kb, ensure_ascii=False, separators=(',', ':')) + ';\n')
    with open(OUT, 'w', encoding='utf-8') as f:
        f.write(js)
    size = os.path.getsize(OUT)
    kinds = {'glossary': sum(1 for d in docs if d.get('g')), 'tips': sum(1 for d in docs if d.get('tip')),
             'passages': sum(1 for d in docs if not d.get('g') and not d.get('tip'))}
    print('pages read: %d  docs: %d  %s  near-duplicates dropped: %d' % (n_pages, len(docs), kinds, dropped))
    print('wrote %s (%.1f KB)' % (os.path.relpath(OUT, ROOT), size / 1024))
    for p, why in skipped:
        print('  skipped %s (%s)' % (p, why))
    if size > 1.5 * 1024 * 1024:
        print('WARNING: file is over 1.5 MB', file=sys.stderr)


if __name__ == '__main__':
    main()
