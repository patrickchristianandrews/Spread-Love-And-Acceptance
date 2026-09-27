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
                'visually-hidden', 'announce-tag', 'tol-private', 'print-only', 'tol-index', 'tol-access',
                'lib-top', 'lib-note', 'lib-aka', 'lib-pillar-list'}
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
        self.library = False     # a Professor's Library page: every h3 is a part of its entry (h2)

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
                    if self.library and lv == 3 and parent:
                        shown = parent + ': ' + h[0].lower() + h[1:]  # "Attachment theory: in a nutshell"
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


# ---------------------------------------------------------------- library definitions
# Each entry in the Professor's Library (/library/*.html, built by tools/library/build_library.py) also becomes a
# definition entry, like the mini-dive glossary: its title and other names answer "what is X" directly, and the
# answer is the entry's nutshell plus the start of "Going deeper", with a link to the full entry.
LIB_GENERIC = set('''stress anger angry money grief kindness habits habit goals goal values trust boundaries feedback
emotions feelings feeling mood fun play rest breaks focus sleep tired forgive fairness fair love friends friendship
loneliness lonely gratitude listening family work change memory personality phones clutter'''.split())


def library_definitions():
    out = []
    lib_dir = os.path.join(ROOT, 'library')
    if not os.path.isdir(lib_dir):
        return out
    for fn in sorted(os.listdir(lib_dir)):
        if not fn.endswith('.html'):
            continue
        raw = open(os.path.join(lib_dir, fn), encoding='utf-8').read()
        for m in re.finditer(r'<article class="lib-entry" id="([^"]+)" data-k="([^"]*)">(.*?)</article>', raw, re.S):
            aid, k, body = m.group(1), unescape(m.group(2)), m.group(3)
            title = unescape(re.sub(r'<[^>]+>', '', re.search(r'<h2>(.*?)</h2>', body).group(1)))
            names = [x.strip() for x in k.split(',')[1:] if x.strip()]
            nut = re.search(r'<div class="lib-nut">(.*?)</div>', body, re.S).group(1)
            nut = norm_space(unescape(re.sub(r'<[^>]+>', ' ', re.sub(r'<h3>.*?</h3>', '', nut))))
            deep = re.search(r'<h3>Going deeper</h3>\s*<p>(.*?)</p>', body, re.S)
            deep = norm_space(unescape(re.sub(r'<[^>]+>', '', deep.group(1)))) if deep else ''
            deep2 = ' '.join(re.split(r'(?<=[.!?])\s+', deep)[:2])
            m_names = [title] + [n for n in names if (' ' in n or '-' in n or len(n) >= 9) and n.lower() not in LIB_GENERIC]
            out.append({
                'id': 'lib:' + aid, 't': title, 'h': title, 'u': '/library/%s#%s' % (fn, aid),
                'x': nut + ('\n' + deep2 if deep2 else ''),
                'k': norm_space(' '.join([title] + names)),
                'm': m_names, 'l': 'Read the full entry in the Professor’s Library', 'g': 1,
            })
    return out


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


# Everyday words mapped to the vocabulary of the Professor's Library (/library/*.html).
# Merged into SYN below (lists are combined, nothing above is replaced).
SYN_LIBRARY = {
    'attachment': ['bowlby', 'ainsworth', 'secure', 'anxious', 'avoidant', 'hazan'],
    'attached': ['attachment', 'secure', 'anxious', 'avoidant'],
    'clingy': ['attachment', 'anxious', 'reassurance', 'pursue'],
    'needy': ['attachment', 'anxious', 'reassurance', 'pursue'],
    'avoidant': ['attachment', 'avoidance', 'withdraw', 'pursue'],
    'secure': ['attachment', 'safe haven', 'secure base'],
    'insecure': ['attachment', 'anxious', 'reassurance', 'self-esteem'],
    'reassurance': ['attachment', 'anxious', 'jealousy'],
    'abandonment': ['attachment', 'anxious', 'rejection'],
    'withdraws': ['pursue', 'withdraw', 'demand-withdraw', 'stonewalling'],
    'withdraw': ['pursue', 'demand-withdraw', 'stonewalling'],
    'chase': ['pursue', 'withdraw', 'demand-withdraw'],
    'pursuer': ['pursue', 'withdraw', 'demand-withdraw'],
    'stonewall': ['four horsemen', 'flooding', 'self-soothing'],
    'stonewalling': ['four horsemen', 'flooding', 'self-soothing'],
    'horsemen': ['criticism', 'contempt', 'defensiveness', 'stonewalling', 'antidotes'],
    'gottman': ['bids', 'horsemen', 'repair', 'flooding', 'perpetual'],
    'gratitude': ['grateful', 'thankful', 'find remind bind', 'algoe', 'emmons'],
    'grateful': ['gratitude', 'thanks', 'appreciation'],
    'thankful': ['gratitude', 'thanks', 'appreciation'],
    'bias': ['attribution', 'confirmation', 'negativity', 'heuristic', 'thinking traps'],
    'biases': ['bias', 'attribution', 'confirmation', 'negativity', 'heuristic'],
    'biased': ['bias', 'naive realism', 'blind spot'],
    'assume': ['attribution', 'mind-reading', 'hostile', 'fundamental attribution error'],
    'assuming': ['attribution', 'mind-reading', 'hostile'],
    'worst': ['attribution', 'negativity', 'catastrophising', 'hostile'],
    'overthinking': ['rumination', 'catastrophising', 'worry'],
    'overthink': ['rumination', 'catastrophising', 'worry'],
    'mindset': ['growth mindset', 'dweck', 'fixed'],
    'habit': ['habits', 'lally', 'cues', 'automatic', 'implementation intentions'],
    'habits': ['habit', 'lally', 'cues', 'automatic', 'routine'],
    'routine': ['habits', 'rituals', 'cues'],
    'motivation': ['self-determination', 'intrinsic', 'autonomy', 'rewards'],
    'motivated': ['motivation', 'self-determination', 'intrinsic'],
    'unmotivated': ['motivation', 'procrastination', 'burnout'],
    'lazy': ['procrastination', 'inertia', 'executive function', 'attribution'],
    'procrastinate': ['procrastination', 'avoidance', 'inertia'],
    'procrastinating': ['procrastination', 'avoidance', 'inertia'],
    'perfectionist': ['perfectionism', 'standards', 'self-criticism'],
    'perfect': ['perfectionism', 'good enough', 'standards'],
    'willpower': ['self-control', 'ego depletion', 'habits'],
    'goals': ['goal setting', 'implementation intentions', 'woop'],
    'goal': ['goal setting', 'implementation intentions', 'woop'],
    'change': ['transitions', 'readiness', 'habits', 'stages of change'],
    'confidence': ['self-efficacy', 'self-esteem'],
    'confident': ['self-efficacy', 'self-esteem'],
    'worth': ['self-esteem', 'self-worth', 'self-compassion'],
    'values': ['values', 'meaning', 'acceptance and commitment'],
    'meaning': ['values', 'purpose'],
    'selfcompassion': ['self-compassion', 'neff'],
    'kind': ['kindness', 'self-compassion', 'compassion'],
    'kindness': ['kind', 'compassion', 'generosity'],
    'critic': ['self-compassion', 'self-criticism', 'shame'],
    'shame': ['guilt', 'self-compassion', 'tangney'],
    'guilt': ['shame', 'apology', 'repair'],
    'guilty': ['guilt', 'shame', 'apology'],
    'ashamed': ['shame', 'guilt', 'self-compassion'],
    'embarrassed': ['shame', 'spotlight effect'],
    'forgive': ['forgiveness', 'grudges', 'repair'],
    'forgiveness': ['forgive', 'grudges', 'reconciliation'],
    'grudge': ['forgiveness', 'resentment', 'letting go'],
    'grudges': ['forgiveness', 'resentment'],
    'jealousy': ['jealous', 'insecurity', 'reassurance', 'trust'],
    'envy': ['jealousy', 'social comparison'],
    'cheating': ['trust', 'jealousy', 'repair'],
    'lie': ['trust', 'honesty'],
    'lying': ['trust', 'honesty'],
    'honest': ['trust', 'honesty'],
    'reliable': ['trust', 'dependability', 'owner'],
    'negotiate': ['negotiation', 'interests', 'positions', 'batna', 'getting to yes'],
    'negotiation': ['interests', 'positions', 'batna', 'principled', 'win-win'],
    'compromise': ['negotiation', 'interests', 'conflict modes', 'win-win', 'compromising'],
    'compromising': ['compromise', 'conflict modes', 'thomas-kilmann'],
    'winwin': ['integrative', 'interests', 'win-win'],
    'mediation': ['mediator', 'third party', 'neutral'],
    'mediator': ['mediation', 'third party'],
    'escalate': ['escalation', 'spiral', 'de-escalate', 'flooding'],
    'escalating': ['escalation', 'spiral', 'de-escalate'],
    'deescalate': ['escalation', 'de-escalation', 'timeout', 'calm'],
    'timeout': ['time out', 'break', 'pause', 'flooding'],
    'break': ['timeout', 'pause', 'breaks', 'recovery'],
    'walk away': ['timeout', 'break', 'flooding'],
    'cool off': ['timeout', 'break', 'flooding'],
    'heated': ['escalation', 'flooding', 'timeout'],
    'resolve': ['conflict resolution', 'negotiation', 'repair', 'solvable'],
    'resolution': ['conflict', 'negotiation', 'repair'],
    'solve': ['solvable', 'problem solving', 'interests'],
    'unsolvable': ['perpetual', 'gridlock', 'acceptance'],
    'gridlock': ['perpetual', 'dreams within conflict'],
    'accept': ['acceptance', 'accepting influence', 'differences'],
    'acceptance': ['accept', 'differences', 'integrative behavioral'],
    'influence': ['accepting influence', 'persuaded'],
    'stubborn': ['accepting influence', 'positions', 'naive realism'],
    'win': ['positions', 'interests', 'motivated reasoning'],
    'blame': ['attribution', 'blameless', 'personalisation', 'contribution'],
    'blaming': ['blame', 'attribution', 'personalisation'],
    'fault': ['blame', 'contribution', 'blameless'],
    'mistake': ['mistakes', 'blameless', 'psychological safety', 'apology'],
    'mistakes': ['mistake', 'blameless', 'just culture'],
    'feedback': ['sbi', 'criticism', 'feedback sandwich'],
    'complain': ['complaint', 'criticism', 'soft startup'],
    'complaining': ['complaint', 'criticism', 'soft startup'],
    'startup': ['soft startup', 'harsh startup', 'first three minutes'],
    'bring up': ['soft startup', 'timing', 'complaint'],
    'raise': ['soft startup', 'complaint'],
    'kitchen sink': ['kitchen-sinking', 'one topic'],
    'past': ['kitchen-sinking', 'memory', 'bringing up the past'],
    'intent': ['intent', 'impact', 'meant'],
    'meant': ['intent', 'impact'],
    'difficult conversation': ['three conversations', 'difficult conversations', 'soft startup'],
    'hard conversation': ['difficult conversations', 'soft startup', 'battery'],
    'restorative': ['restorative', 'repair', 'making things right'],
    'culture': ['cultural', 'face', 'high context', 'family script'],
    'cultural': ['culture', 'face', 'high context'],
    'fair': ['equity', 'equality', 'procedural justice', 'fair process'],
    'fairness': ['equity', 'equality', 'need', 'procedural justice'],
    'equal': ['equality', 'equity', 'fifty'],
    'equity': ['equity theory', 'adams', 'fairness'],
    'mental load': ['cognitive labour', 'mental load', 'anticipate', 'monitor', 'invisible'],
    'mental': ['mental load', 'cognitive labour'],
    'emotional labor': ['emotional labour', 'hochschild', 'emotion work'],
    'emotional labour': ['hochschild', 'emotion work'],
    'second shift': ['hochschild', 'housework', 'second shift'],
    'default': ['default parent', 'default person', 'go-to'],
    'incompetence': ['weaponised incompetence', 'strategic incompetence', 'gatekeeping'],
    'weaponized': ['weaponised incompetence', 'incompetence'],
    'weaponised': ['weaponised incompetence', 'incompetence'],
    'micromanage': ['gatekeeping', 'standards', 'owner'],
    'standards': ['gatekeeping', 'good enough', 'perfectionism', 'noticing'],
    'mess': ['noticing', 'threshold', 'clutter', 'standards'],
    'messy': ['mess', 'clutter', 'noticing', 'threshold'],
    'clutter': ['mess', 'environment', 'clutter'],
    'tidy': ['mess', 'standards', 'clutter'],
    'notice': ['noticing', 'threshold', 'anticipate'],
    'appreciate': ['appreciation', 'recognition', 'gratitude'],
    'recognition': ['appreciation', 'recognised', 'thanks'],
    'stress': ['stress response', 'allostatic', 'appraisal', 'cortisol'],
    'cortisol': ['stress response', 'hpa', 'stress'],
    'adrenaline': ['stress response', 'fight or flight'],
    'fight or flight': ['stress response', 'cannon', 'sympathetic'],
    'hungry': ['hangry', 'hunger', 'halt'],
    'hangry': ['hunger', 'halt'],
    'halt': ['hungry angry lonely tired'],
    'sleep': ['sleep deprivation', 'tired', 'chronotype'],
    'insomnia': ['sleep', 'tired'],
    'body': ['interoception', 'body signals', 'stress response'],
    'window': ['window of tolerance', 'hyperarousal', 'hypoarousal'],
    'numb': ['hypoarousal', 'window of tolerance', 'shutdown'],
    'porges': ['polyvagal'],
    'polyvagal': ['porges', 'vagus', 'criticisms'],
    'vagal': ['polyvagal', 'vagus'],
    'caregiving': ['caregiver', 'ageing parents', 'sandwich generation'],
    'emotion': ['emotions', 'feelings', 'regulation'],
    'emotions': ['emotion', 'feelings', 'regulation', 'granularity'],
    'feelings': ['emotions', 'affect labelling', 'granularity', 'alexithymia'],
    'feeling': ['emotions', 'affect labelling'],
    'regulate': ['emotion regulation', 'reappraisal', 'calm'],
    'regulation': ['emotion regulation', 'reappraisal', 'gross'],
    'bottle': ['suppression', 'hiding feelings'],
    'bottling': ['suppression', 'hiding feelings'],
    'hide': ['suppression', 'masking'],
    'reframe': ['reappraisal', 'reframing'],
    'name': ['affect labelling', 'naming feelings'],
    'venting': ['anger', 'catharsis', 'co-rumination'],
    'vent': ['anger', 'venting', 'catharsis'],
    'rage': ['anger', 'flooding'],
    'irritable': ['hangry', 'sleep', 'mood', 'halt'],
    'grumpy': ['mood', 'hangry', 'sleep'],
    'rumination': ['overthinking', 'replaying', 'co-rumination'],
    'replaying': ['rumination', 'overthinking'],
    'journal': ['expressive writing', 'writing it down', 'diary'],
    'journaling': ['expressive writing', 'writing it down'],
    'diary': ['expressive writing', 'writing it down'],
    'grief': ['grieving', 'loss', 'bereavement', 'dual process'],
    'grieving': ['grief', 'loss', 'bereavement'],
    'loss': ['grief', 'ambiguous loss'],
    'died': ['grief', 'loss', 'bereavement'],
    'death': ['grief', 'loss', 'bereavement'],
    'resilience': ['resilient', 'coping', 'ordinary magic'],
    'resilient': ['resilience', 'coping'],
    'cope': ['coping', 'resilience', 'appraisal'],
    'coping': ['cope', 'resilience', 'appraisal'],
    'happy': ['happiness', 'positive emotions', 'wellbeing'],
    'happiness': ['positive emotions', 'wellbeing', 'savouring'],
    'safe': ['emotional safety', 'psychological safety', 'safe haven'],
    'safety': ['emotional safety', 'psychological safety'],
    'empathy': ['empathy', 'sympathy', 'compassion', 'double empathy'],
    'sympathy': ['empathy', 'compassion'],
    'compassion': ['self-compassion', 'empathy', 'compassion fatigue'],
    'validate': ['validation', 'validating'],
    'validating': ['validation', 'invalidation'],
    'invalidated': ['validation', 'invalidation'],
    'dismissed': ['validation', 'invalidation', 'responsiveness'],
    'dismissive': ['validation', 'invalidation', 'capitalization'],
    'faces': ['facial expressions', 'nonverbal', 'emotions'],
    'expression': ['facial expressions', 'nonverbal'],
    'body language': ['nonverbal', 'tone', 'facial expressions'],
    'eye contact': ['nonverbal', 'autistic'],
    'mind reading': ['mind-reading', 'jumping to conclusions', 'guess'],
    'mindreading': ['mind-reading', 'guess'],
    'read my mind': ['mind-reading', 'illusion of transparency'],
    'should have known': ['mind-reading', 'illusion of transparency'],
    'obvious': ['illusion of transparency', 'curse of knowledge'],
    'catastrophize': ['catastrophising', 'worst case'],
    'catastrophizing': ['catastrophising', 'worst case'],
    'always': ['all-or-nothing', 'overgeneralisation'],
    'never': ['all-or-nothing', 'overgeneralisation'],
    'should': ['should statements', 'expectations'],
    'shoulds': ['should statements'],
    'expectations': ['should statements', 'expectations', 'role ambiguity'],
    'personally': ['personalisation', 'taking things personally'],
    'distortions': ['cognitive distortions', 'thinking traps'],
    'distortion': ['cognitive distortions', 'thinking traps'],
    'cbt': ['cognitive distortions', 'beck', 'burns'],
    'remember': ['memory', 'availability', 'recall'],
    'memory': ['reconstructed', 'availability', 'recall', 'transactive'],
    'forgot': ['memory', 'reminders', 'cognitive offloading'],
    'forgetful': ['memory', 'adhd', 'cognitive offloading', 'reminders'],
    'late': ['planning fallacy', 'time', 'adhd'],
    'lateness': ['planning fallacy', 'time'],
    'objective': ['naive realism', 'bias blind spot'],
    'listening': ['active listening', 'reflective', 'rogers'],
    'listen': ['active listening', 'reflective listening', 'rogers'],
    'paraphrase': ['reflective listening', 'summarising'],
    'questions': ['asking questions', 'curiosity', 'follow-up'],
    'curious': ['curiosity', 'questions'],
    'nvc': ['nonviolent communication', 'rosenberg'],
    'nonviolent': ['nonviolent communication', 'rosenberg'],
    'statements': ['i-statements', 'you-statements'],
    'assertive': ['assertiveness', 'passive', 'aggressive'],
    'passive': ['assertiveness', 'passive-aggressive'],
    'aggressive': ['assertiveness', 'passive-aggressive'],
    'no': ['saying no', 'boundaries', 'refusal'],
    'humor': ['humour', 'laughter', 'play'],
    'humour': ['laughter', 'play', 'jokes'],
    'jokes': ['humour', 'laughter'],
    'sarcasm': ['humour', 'contempt'],
    'advice': ['support', 'fixing', 'listening'],
    'fix': ['advice', 'support', 'fixing'],
    'fixing': ['advice', 'support'],
    'support': ['social support', 'advice', 'invisible support'],
    'email': ['texting', 'tone', 'channel'],
    'emoji': ['texting', 'tone'],
    'meetings': ['workplace', 'retrospectives', 'communication at work'],
    'work': ['workplace', 'work-family', 'role ambiguity'],
    'colleague': ['coworkers', 'workplace'],
    'colleagues': ['coworkers', 'workplace'],
    'manager': ['workplace', 'feedback', 'psychological safety'],
    'team': ['teams', 'psychological safety', 'retrospective', 'raci'],
    'teams': ['team', 'psychological safety', 'raci'],
    'teamwork': ['team', 'teams', 'coparenting'],
    'responsible': ['raci', 'ownership', 'diffusion of responsibility'],
    'responsibility': ['raci', 'ownership', 'diffusion of responsibility'],
    'owner': ['ownership', 'raci', 'one owner per job'],
    'ownership': ['owner', 'raci'],
    'retro': ['retrospective', 'look-back'],
    'review': ['retrospective', 'look-back', 'blameless'],
    'checklist': ['checklists', 'gawande'],
    'list': ['checklists', 'cognitive offloading', 'lists'],
    'calendar': ['cognitive offloading', 'transactive memory'],
    'reminders': ['cognitive offloading', 'reminding'],
    'metrics': ["goodhart's law", 'measures'],
    'measure': ["goodhart's law", 'metrics'],
    'experiment': ['plan do study act', 'small experiments'],
    'autism': ['monotropism', 'masking', 'alexithymia', 'inertia', 'stimming'],
    'autistic': ['monotropism', 'masking', 'stimming', 'inertia'],
    'stim': ['stimming', 'fidgeting'],
    'stimming': ['stim', 'fidgeting', 'self-regulation'],
    'fidget': ['stimming', 'fidgeting'],
    'fidgeting': ['stimming', 'fidget'],
    'focus': ['monotropism', 'flow', 'attention', 'hyperfocus'],
    'hyperfocus': ['monotropism', 'flow', 'adhd'],
    'interrupt': ['interruptions', 'task switching', 'monotropism'],
    'interrupted': ['interruptions', 'task switching', 'monotropism'],
    'interruptions': ['task switching', 'multitasking'],
    'stuck': ['inertia', 'procrastination', 'gridlock'],
    'executive': ['executive function', 'adhd'],
    'rsd': ['rejection sensitivity', 'rejection sensitive dysphoria'],
    'hsp': ['highly sensitive person', 'sensory processing sensitivity'],
    'introvert': ['introversion', 'extraversion', 'alone time'],
    'introverted': ['introvert', 'introversion'],
    'extrovert': ['extraversion', 'introversion'],
    'extravert': ['extraversion', 'introversion'],
    'personality': ['big five', 'traits', 'temperament'],
    'mbti': ['myers-briggs', 'personality', 'big five'],
    'morning': ['chronotype', 'lark'],
    'night owl': ['chronotype', 'owl'],
    'uncertainty': ['intolerance of uncertainty', 'plans', 'change of plan'],
    'plans': ['uncertainty', 'planning fallacy', 'implementation intentions'],
    'spoons': ['spoon theory', 'energy'],
    'energy': ['spoon theory', 'battery', 'recovery'],
    'breathing': ['slow breathing', 'box breathing', 'cyclic sighing'],
    'sigh': ['physiological sigh', 'cyclic sighing'],
    'grounding': ['5 4 3 2 1', 'present moment'],
    'mindfulness': ['meditation', 'present', 'kabat-zinn'],
    'nature': ['attention restoration', 'outdoors', 'walk'],
    'outside': ['nature', 'attention restoration'],
    'walk': ['nature', 'timeout', 'attention restoration'],
    'phone': ['phubbing', 'technoference', 'phones'],
    'phones': ['phubbing', 'technoference'],
    'screen': ['phubbing', 'screen time'],
    'distracted': ['mind-wandering', 'phubbing', 'task switching'],
    'multitasking': ['task switching', 'interruptions'],
    'bored': ['boredom', 'novelty', 'self-expansion'],
    'boring': ['boredom', 'novelty', 'self-expansion'],
    'rest': ['recovery', 'breaks', 'downtime'],
    'fun': ['play', 'humour', 'novelty'],
    'play': ['fun', 'playfulness'],
    'friends': ['friendship', 'weak ties', 'dunbar'],
    'friendship': ['friends', 'hall', 'maintenance'],
    'lonely': ['loneliness', 'isolation', 'connection'],
    'loneliness': ['lonely', 'isolation', 'cacioppo'],
    'isolated': ['loneliness', 'isolation'],
    'good news': ['capitalization', 'active constructive'],
    'celebrate': ['capitalization', 'good news', 'savouring'],
    'generous': ['kindness', 'prosocial spending', 'generosity'],
    'giving': ['prosocial spending', 'kindness'],
    'ritual': ['rituals', 'rituals of connection', 'traditions'],
    'traditions': ['rituals', 'holidays'],
    'wonder': ['awe'],
    'in-laws': ['in-laws', 'extended family'],
    'inlaws': ['in-laws', 'extended family'],
    'in laws': ['in-laws', 'extended family', 'mother-in-law'],
    'mother in law': ['in-laws', 'extended family'],
    'baby': ['transition to parenthood', 'new parents', 'co-parenting'],
    'pregnant': ['transition to parenthood', 'baby'],
    'newborn': ['transition to parenthood', 'baby'],
    'stepfamily': ['stepfamilies', 'blended family', 'stepparent'],
    'stepkids': ['stepfamilies', 'stepchildren', 'stepparent'],
    'stepparent': ['stepfamilies', 'blended family'],
    'blended': ['stepfamilies', 'blended family'],
    'aging': ['ageing parents', 'older adults'],
    'ageing': ['ageing parents', 'older adults'],
    'elderly': ['ageing parents', 'caregiving'],
    'siblings': ['ageing parents', 'family systems'],
    'holiday': ['holidays', 'family gatherings'],
    'christmas': ['holidays', 'family gatherings'],
    'moving': ['transitions', 'moving house', 'four s'],
    'move': ['transitions', 'moving house'],
    'transition': ['transitions', 'schlossberg', 'change'],
    'retirement': ['transitions', 'lifespan'],
    'spending': ['money meanings', 'saver', 'spender'],
    'budget': ['money', 'money meanings'],
    'debt': ['money', 'financial stress'],
    'comparison': ['social comparison', 'social media'],
    'instagram': ['social comparison', 'social media'],
    'social media': ['social comparison', 'phubbing'],
    'decision': ['decisions', 'decision fatigue', 'joint decisions'],
    'decisions': ['decision fatigue', 'joint decisions', 'choice overload'],
    'decide': ['decisions', 'joint decisions'],
    'choices': ['choice overload', 'decision fatigue'],
    'dinner': ['decision fatigue', 'chores'],
    'balance': ['work-family', 'work life balance', 'fairness'],
    'overtime': ['work-family', 'spillover'],
    'research': ['evidence', 'study', 'studies'],
    'science': ['research', 'evidence', 'library'],
    'psychology': ['research', 'library', 'science'],
    'evidence': ['research', 'study', 'studies'],
    'true': ['evidence', 'research', 'criticisms'],
    'myth': ['evidence', 'criticisms', 'replication'],
    'library': ["professor's library", 'research'],
    'boss': ['workplace', 'manager', 'work disagreements', 'feedback', 'role ambiguity'],
    'deal with': ['coping', 'handle', 'conflict', 'disagreeing'],
    'handle': ['coping', 'conflict', 'disagreeing'],
    'workplace': ['work', 'coworkers', 'role ambiguity', 'psychological safety'],
}
# Everyday words from first-time visitors' questions: exes and handoffs, teenagers, a partner who needs
# care, roommates and bills, "how do I word it", three or more people, and teams at work.
# Merged into SYN the same way. (site-chat.js also has REWRITES for whole questions like these.)
SYN_GAPS = {
    'ex': ['co-parents', 'coparenting', 'handoffs', 'two homes'],
    'expartner': ['co-parents', 'coparenting', 'handoffs'],
    'exhusband': ['co-parents', 'coparenting', 'handoffs'],
    'exwife': ['co-parents', 'coparenting', 'handoffs'],
    'custody': ['co-parents', 'parenting plan', 'handoffs', 'two homes'],
    'handoff': ['handoffs', 'co-parents', 'exchange-day', 'owner'],
    'handoffs': ['handoff', 'co-parents', 'exchange-day', 'owner'],
    'dropoff': ['handoffs', 'co-parents', 'exchange-day'],
    'pickup': ['handoffs', 'co-parents', 'exchange-day'],
    'two homes': ['co-parents', 'handoffs', 'weekly check-in'],
    'parenting plan': ['co-parents', 'court order', 'handoffs'],
    'separated': ['co-parents', 'two homes'],
    'teen': ['teenagers', 'teens', 'parenting'],
    'teens': ['teenagers', 'parenting'],
    'teenager': ['teenagers', 'parenting'],
    'teenage': ['teenagers', 'parenting'],
    'adolescent': ['teenagers'],
    'kid': ['kids', 'children', 'parenting', 'teenagers'],
    'child': ['children', 'kids', 'parenting'],
    'son': ['children', 'parenting', 'teenagers'],
    'daughter': ['children', 'parenting', 'teenagers'],
    'surgery': ['caregivers', 'caregiving', 'partner', 'battery'],
    'illness': ['caregivers', 'caregiving', 'battery'],
    'ill': ['caregivers', 'caregiving'],
    'sick': ['caregivers', 'caregiving'],
    'carer': ['caregivers', 'caregiving', 'battery'],
    'looking after': ['caregivers', 'caregiving', 'battery'],
    'caring for': ['caregivers', 'caregiving', 'battery'],
    'doing everything': ['caregivers', 'invisible', 'unbilled', 'load'],
    'housemates': ['roommates', 'lemonade', 'house meeting'],
    'flatmates': ['roommates', 'housemates'],
    'rent': ['roommates', 'bills', 'shared-expenses', 'money'],
    'bills': ['bill', 'money', 'roommates', 'shared-expenses', 'split'],
    'bill': ['bills', 'money', 'roommates', 'shared-expenses'],
    'venmo': ['money', 'bills', 'shared-expenses', 'roommates'],
    'expenses': ['shared-expenses', 'bills', 'money'],
    'utilities': ['bills', 'money', 'roommates'],
    'wording': ['sentence', 'signal translator', 'tone filter'],
    'phrase': ['sentence', 'signal translator', 'tone filter'],
    'bring it up': ['soft startup', 'check-ins', 'signal translator', 'one topic'],
    'how do i say': ['signal translator', 'tone filter', 'sentence'],
    'group': ['more than two people', 'house meeting', 'team'],
    'staff': ['coworkers', 'teams', 'workplace'],
    'slack': ['coworkers', 'teams', 'message', 'tone'],
    'office': ['coworkers', 'workplace', 'teams'],
}
for _src in (SYN_LIBRARY, SYN_GAPS):
    for _k, _v in _src.items():
        _cur = SYN.setdefault(_k, [])
        _cur.extend(x for x in _v if x not in _cur)


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

    docs += library_definitions()

    for path in pages:
        fp = os.path.join(ROOT, path.lstrip('/'))
        raw = open(fp, encoding='utf-8', errors='replace').read()
        pp = PageParser()
        pp.has_main = bool(re.search(r"<main[\s>]", raw))
        pp.library = path.startswith('/library/')
        # library entries carry their title and other names in data-k: use them as keywords
        lib_k = {m.group(1): unescape(m.group(2)).replace(',', ' ')
                 for m in re.finditer(r'<article class="lib-entry" id="([^"]+)" data-k="([^"]*)"', raw)}
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
            if pp.library and s.get('raw') == 'To talk about' and secs and secs[-1]['a'] == s['a']:
                # discussion questions read better attached to the entry's links than as an answer of their own
                secs[-1] = dict(secs[-1], s=secs[-1]['s'] + ['Questions to talk about together:'] + s['s'])
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
                    'k': norm_space(page_k + ' ' + lib_k.get(anchor, '') + ' ' + ' '.join(keywords(c))),
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
    if size > 4 * 1024 * 1024:
        print('WARNING: file is over 4 MB', file=sys.stderr)


if __name__ == '__main__':
    main()
