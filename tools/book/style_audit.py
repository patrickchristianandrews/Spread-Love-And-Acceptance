#!/usr/bin/env python3
"""style_audit.py: count the habits that make prose read as machine-made (voice17).

It reads the books three ways and reports per book and per chapter:
  print   the built print pages (book/print/src/<id>.html): each chapter (article.pe-ch) as the reader sees it in
          print, with the boxes and hints, without forms, QR slots, addresses and page-number slots
  pdf     the built PDFs (book/print/<id>.pdf, via pdftotext): every printed word, front and back matter included.
          Only the phrase and density counts are taken from this text (its line breaks make sentence counts noisy)
  src     the chapter sources (book/<slug>.html and book/<slug>-in-depth.html): the text inside <main>, without the
          generated blocks (figures, filled-in examples, hints, the chapter end)

The measures
  words, sentences      mean, SD and variance of sentence length; share of sentences of 12 to 22 words (the
                        "safe middle" a model drifts to), of 6 or fewer and of 30 or more
  triads/1k             "a, b and c" lists of exactly three (in running text) per 1,000 words, plus bullet lists
                        of exactly three items
  notbut/1k             "not X, but Y", "X, not Y", "it's not ... it's ...", "isn't about ... it's about ...",
                        "isn't X. It's Y." per 1,000 words
  colons/1k             every colon except times and web addresses; colon_heads = headings or bold leads ending ":"
  dashes/1k             em dashes and spaced en dashes
  stock                 Here's, Let's, In short, The key is, This matters because, Remember:, It's worth,
                        The good news, simply, gently
  hedges/1k             may, might, can often, for many people (the brief's list); hedges_wide/1k adds often,
                        perhaps, usually, tend(s) to, many people, some people
  moral_end%            paragraphs of 2+ sentences whose last sentence is a short (10 words or fewer) general line:
                        no digits, no quotation, no names
  skeleton_same%        sections (big ideas / h2 sections) that share the chapter's most common block pattern;
                        claim_list_line = sections built as text -> bullet list -> one short closing line
  bullets/1k            list items in running text per 1,000 words; bullets_per_page (print, per book)
  opener_top3%          share of sentences that start with the chapter's three commonest first words;
                        para_opener_repeats = two-word paragraph openings used 3+ times in a chapter

Usage (from the repo root):
  python3 tools/book/style_audit.py                    all three, every book, as JSON on stdout
  python3 tools/book/style_audit.py --md               the same as Markdown tables
  python3 tools/book/style_audit.py --out f.json       also save the JSON
  ... --print-dir DIR --book-dir DIR                     measure saved copies (DIR like book/print, book)
"""
import glob
import html
import json
import os
import re
import statistics
import subprocess
import sys
from collections import Counter
from html.parser import HTMLParser

ROOT = os.path.abspath(os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..'))
PRINT = os.path.join(ROOT, 'book', 'print')
BOOKDIR = os.path.join(ROOT, 'book')
# --print-dir / --book-dir: measure a saved copy (for example the "before" state) instead of the live files
if '--print-dir' in sys.argv:
    PRINT = sys.argv[sys.argv.index('--print-dir') + 1]
if '--book-dir' in sys.argv:
    BOOKDIR = sys.argv[sys.argv.index('--book-dir') + 1]
SERIES = os.path.join(ROOT, 'tools', 'book', 'series.json')

SKIP_CLASSES = {'bk-ex-sheet', 'pe-qr', 'pe-mark', 'pe-u', 'pe-xref', 'pe-pg', 'ps-addr', 'bh-u', 'pe-use-u', 'bh-badge',
                'pe-noprint', 'ch-num', 'dig', 'book-fig-zoom', 'bk-ex-link', 'pe-conn-p', 'pk-addr', 'pk-online',
                'pe-toc-dots', 'depth-bar', 'tol-listen-top', 'tol-book-audio', 'read-code', 'last-updated', 'ps-scan',
                'ps-panel', 'bk-ex-note', 'book-start', 'pk-card-lines', 'pe-only'}
SRC_DROP = [r'<!-- book-(fig|ex|hint|end|open):start -->.*?<!-- book-\1:end -->', r'<script\b.*?</script>',
            r'<style\b.*?</style>', r'<svg\b.*?</svg>', r'<nav\b.*?</nav>']
HEAD_TAGS = {'h1', 'h2', 'h3', 'h4', 'h5', 'h6'}
BLOCK_TAGS = {'p', 'li', 'div', 'dd', 'dt', 'figcaption', 'blockquote', 'td', 'th', 'section', 'aside', 'header', 'ul',
              'ol', 'article', 'figure', 'table'} | HEAD_TAGS
VOID = {'br', 'img', 'hr', 'input', 'meta', 'link', 'source', 'wbr', 'col'}
LIST_TAGS = {'ul', 'ol'}


class Blocks(HTMLParser):
    """Turns HTML into a flat list of blocks: {'kind': p|li|h|box|other, 'text', 'lead', 'list_id', 'sec'}"""

    def __init__(self):
        super().__init__(convert_charrefs=True)
        self.stack = []
        self.blocks = []
        self.cur = []
        self.lead = ''
        self.kind = 'p'
        self.list_stack = []   # (list id, item count)
        self.lists = []        # item counts of finished lists (running text only)
        self.sec = 0
        self.box_depth = 0
        self.n_list = 0

    def flush(self):
        t = re.sub(r'\s+', ' ', ''.join(self.cur)).strip()
        if t:
            kind = self.kind
            if kind == 'li' and self.list_stack and not self.list_stack[-1][2]:
                kind = 'p'
            self.blocks.append({'kind': kind, 'text': t, 'lead': self.lead.strip(), 'sec': self.sec,
                                'box': self.box_depth > 0, 'list': self.list_stack[-1][0] if self.list_stack else None})
        self.cur, self.lead = [], ''

    def skipping(self):
        return any(s for _t, s, _c in self.stack)

    def handle_starttag(self, tag, attrs):
        if tag in VOID:
            return
        a = dict(attrs)
        cls = set((a.get('class') or '').split())
        skip = bool(cls & SKIP_CLASSES) or tag in ('svg', 'script', 'style', 'nav') or 'hidden' in a
        is_box = tag == 'aside' or bool(cls & {'try-this', 'book-hint', 'pe-box', 'logic-box', 'scene', 'callout', 'note'})
        if tag in BLOCK_TAGS:
            self.flush()
        if not self.skipping() and not skip:
            if tag in HEAD_TAGS:
                self.kind = 'h'
                if tag in ('h2', 'h3') and not (cls & {'ch-title', 'pe-end-k', 'pk-h', 'book-end-k'}):
                    self.sec += 1
            elif tag == 'li':
                self.kind = 'li'
                if self.list_stack:
                    self.list_stack[-1][1] += 1
            elif tag in BLOCK_TAGS:
                self.kind = 'p'
            if tag in LIST_TAGS:
                self.n_list += 1
                self.list_stack.append([self.n_list, 0, not (cls & {'ideas', 'pe-toc', 'ps-toc', 'pk-chain', 'book-end-list'})])
        self.stack.append((tag, skip, is_box))
        if is_box and not skip:
            self.box_depth += 1

    def handle_endtag(self, tag):
        if tag in VOID:
            return
        if tag in BLOCK_TAGS:
            self.flush()
        while self.stack:
            t, skip, is_box = self.stack.pop()
            if is_box and not skip:
                self.box_depth -= 1
            if t in LIST_TAGS and not skip and not self.skipping() and self.list_stack:
                lid, n, real = self.list_stack.pop()
                if real:
                    self.lists.append(n)
            if t == tag:
                break
        self.kind = 'p'

    def handle_data(self, d):
        if self.skipping():
            return
        top = self.stack[-1][0] if self.stack else ''
        if top in ('strong', 'b') and not ''.join(self.cur).strip():
            self.lead += d
        self.cur.append(d)


def parse(h):
    p = Blocks()
    p.feed(h)
    p.flush()
    return p


TIME_URL = re.compile(r'\b\d{1,2}[:.]\d\d\b|https?://\S+|\b[a-z0-9.-]+\.(?:com|org|uk|html|ie|nz|au|ca)\S*', re.I)
WORD = re.compile(r"[A-Za-z0-9][A-Za-z0-9’'\-]*")
Q = '’\''


def words(t):
    return WORD.findall(t)


def sentences(t):
    t = re.sub(r'\s+', ' ', TIME_URL.sub(' x ', t)).strip()
    if not t:
        return []
    parts = re.split(r'(?<=[.?!])[”"’)]?\s+(?=[“"‘(]?[A-Z0-9])', t)
    return [x for x in parts if words(x)]


TRIAD = re.compile(r'(?<![,\w] )(?<!, )\b([\w’\'-]+(?: [\w’\'-]+){0,3}), ([\w’\'-]+(?: [\w’\'-]+){0,3}),? (?:and|or) ([\w’\'-]+)')
NOT_ITEM = re.compile(r'^(?:which|who|whose|so|but|because|when|while|if|and|or|then|though|although|as|where|that|even|until|before|after|since|for example|such as|perhaps|maybe|say|I|you|he|she|we|they|it|there|this|his|her|their|my|your|our|“|")\b', re.I)
NOT_LAST = re.compile(r'^(?:I|you|he|she|we|they|it|there|this|that|not|then|so|both|never|always|also)\b|^[“"]', re.I)


def triads(text):
    """lists of exactly three items, "A, B and C" or "A, B, or C": the item before "and/or" and the one after are short
    (four words or fewer), and exactly one short item sits between the first comma and the "and/or"."""
    out = []
    for sent in re.split(r'(?<=[.!?;:])\s+|\n', text):
        for m in re.finditer(r',? (and|or) ', sent):
            before = sent[:m.start()]
            after = re.split(r'[,.;:!?()]', sent[m.end():])[0].strip()
            segs = [x.strip() for x in before.split(',')]
            if len(segs) < 2 or not after or len(after.split()) > 4 or NOT_LAST.match(after):
                continue
            k = 0
            for seg in reversed(segs[1:]):
                if seg and len(seg.split()) <= 4 and not NOT_ITEM.match(seg):
                    k += 1
                else:
                    break
            if k == 1 and len(segs) >= 2 and segs[-1] and segs[-2]:
                first_items = segs[-2].split()
                out.append(' '.join(first_items[-4:]) + ', ' + segs[-1] + ' ' + m.group(1) + ' ' + after)
    return out
NOTBUT = [
    re.compile(r'\bnot\b[^.;:!?]{1,60}?,?\s+but\s', re.I),
    re.compile(r',\s+not\s+(?!only\b|just\b|even\b|yet\b|always\b|to\b|at all\b)[a-z]'),
    re.compile(r'\b(?:it|this|that)[’\']s not\b[^.!?]{0,70}?[.;,—–-]\s*(?:it|this|that)[’\']s\b', re.I),
    re.compile(r'\bisn[’\']t (?:about|just|really)\b[^.!?]{0,80}?\b(?:it[’\']s|it is)\b', re.I),
    re.compile(r'\b(?:isn[’\']t|is not|wasn[’\']t|aren[’\']t)\b[^.!?]{0,60}[.!?]\s+(?:It[’\']s|It is|It was|That[’\']s|They[’\']re)\b'),
]
STOCK = {
    "Here's": re.compile(r'\bHere[’\']s\b|\bHere is\b'),
    "Let's": re.compile(r'\bLet[’\']s\b'),
    'In short': re.compile(r'\bIn short\b'),
    'The key is': re.compile(r'\bThe key (?:is|here)\b', re.I),
    'This matters because': re.compile(r'\b(?:This|It|That) matters because\b', re.I),
    'Remember:': re.compile(r'\bRemember:'),
    "It's worth": re.compile(r'\bit[’\']s worth\b|\bit is worth\b', re.I),
    'The good news': re.compile(r'\bthe good news\b', re.I),
    'simply': re.compile(r'\bsimply\b', re.I),
    'gently': re.compile(r'\bgently\b', re.I),
}
HEDGE = re.compile(r'\b(?:may|might|can often|for many people)\b', re.I)
HEDGE_WIDE = re.compile(r'\b(?:may|might|can often|for many people|often|perhaps|usually|tends? to|many people|some people)\b', re.I)
DASH = re.compile(r'—| – ')
NAMEISH = re.compile(r'(?<!^)(?<![.!?] )\b[A-Z][a-z]+')


def is_moral(sent):
    w = words(sent)
    if not (2 <= len(w) <= 10):
        return False
    if re.search(r'[0-9“”"]', sent) or sent.rstrip().endswith('?'):
        return False
    body = sent.strip()
    rest = body.split(' ', 1)[1] if ' ' in body else ''
    if re.search(r'\b[A-Z][a-z]+', rest.replace(' I ', ' i ')):
        return False
    return True


# voice17: "editable prose" = the chapter text minus the parts that must stay word for word or are lists of links:
# the "When to get more help" sections, the tool and reading lists, "More for your situation", safety and crisis
# sentences, and sentences that cite a study (author lists such as "Kashdan, Barrett and McKnight (2015)").
FIXED_SECTIONS = re.compile(r'<h2 id="(?:more-help|tools|more|your-situation|in-this-part|limits)".*?(?=<h2 id="(?!more-help|tools|more\b|your-situation|in-this-part|limits)|<!-- book-end|<div data-research-box|$)', re.S)
FIXED_SENT = re.compile(r'/safety|Not safe at home|crisis|emergency|988|116 123|Samaritans|helpline|harming yourself|hurting yourself|ending your life|afraid of|\(\d{4}\)|\d{4}\)|general education|In short', re.I)


def prose_counts(h):
    """triads and not-but frames in the editable prose of one chapter source"""
    h = FIXED_SECTIONS.sub('', h)
    h = re.sub(r'<div class="try-this" data-in-short>.*?</div>', '', h, flags=re.S)
    p = parse(h)
    tri = nb = words_n = 0
    for b in p.blocks:
        if b['kind'] == 'h':
            continue
        for sent in re.split(r'(?<=[.!?])\s+(?=[“A-Z(])', b['text']):
            if FIXED_SENT.search(sent):
                continue
            words_n += len(words(sent))
            tri += len(triads(sent))
            nb += sum(len(r.findall(sent)) for r in NOTBUT)
    return {'prose_words': words_n, 'prose_triads': tri, 'prose_notbut': nb}


def text_metrics(t):
    """phrase and density counts for any text"""
    t2 = TIME_URL.sub(' ', t)
    nw = max(len(words(t)), 1)
    k = 1000.0 / nw
    nb = sum(len(r.findall(t)) for r in NOTBUT)
    tri = len(triads(t))
    out = {
        'words': len(words(t)),
        'triads_per_1k': round(tri * k, 2),
        'notbut_per_1k': round(nb * k, 2),
        'notbut': nb,
        'colons_per_1k': round(t2.count(':') * k, 2),
        'dashes_per_1k': round(len(DASH.findall(t)) * k, 2),
        'hedges_per_1k': round(len(HEDGE.findall(t)) * k, 2),
        'hedges_wide_per_1k': round(len(HEDGE_WIDE.findall(t)) * k, 2),
        'stock': {n: len(r.findall(t)) for n, r in STOCK.items()},
    }
    out['stock_total'] = sum(out['stock'].values())
    return out


def block_metrics(blocks, lists):
    prose = [b for b in blocks if b['kind'] in ('p', 'li')]
    text = '\n'.join(b['text'] for b in blocks)
    m = text_metrics(text)
    sl = []
    firsts = []
    for b in prose:
        ss = sentences(b['text'])
        if len(words(b['text'])) >= 3:
            sl += [len(words(x)) for x in ss]
            firsts += [words(x)[0].lower() for x in ss if words(x)]
    n = max(len(sl), 1)
    m.update({
        'sentences': len(sl),
        'mean_sentence': round(statistics.mean(sl), 1) if sl else 0,
        'sd_sentence': round(statistics.pstdev(sl), 1) if sl else 0,
        'var_sentence': round(statistics.pvariance(sl), 1) if sl else 0,
        'pct_12_22': round(100.0 * sum(1 for x in sl if 12 <= x <= 22) / n, 1),
        'pct_le6': round(100.0 * sum(1 for x in sl if x <= 6) / n, 1),
        'pct_ge30': round(100.0 * sum(1 for x in sl if x >= 30) / n, 1),
    })
    # moral endings
    paras = [b for b in blocks if b['kind'] == 'p' and len(sentences(b['text'])) >= 2]
    morals = [b for b in paras if is_moral(sentences(b['text'])[-1])]
    m['moral_end_pct'] = round(100.0 * len(morals) / max(len(paras), 1), 1)
    m['moral_examples'] = [sentences(b['text'])[-1] for b in morals[:6]]
    # bullets, lists of three
    lis = [b for b in blocks if b['kind'] == 'li' and not b['box']]
    m['bullets'] = len(lis)
    m['bullets_per_1k'] = round(len(lis) * 1000.0 / max(m['words'], 1), 2)
    m['lists_of_three'] = sum(1 for x in lists if x == 3)
    m['lists'] = len(lists)
    # colon-led headers and bold leads
    m['colon_heads'] = sum(1 for b in blocks if (b['kind'] == 'h' and b['text'].rstrip().endswith(':'))
                           or (b['lead'] and b['lead'].rstrip().endswith(':')))
    # openers
    c = Counter(firsts)
    top3 = sum(v for _k, v in c.most_common(3))
    m['opener_top3_pct'] = round(100.0 * top3 / max(len(firsts), 1), 1)
    m['opener_top3'] = [k for k, _v in c.most_common(3)]
    p2 = Counter(' '.join(words(b['text'])[:2]).lower() for b in prose if len(words(b['text'])) > 3)
    m['para_opener_repeats'] = sum(1 for _k, v in p2.items() if v >= 3)
    # section skeletons
    secs = {}
    for b in blocks:
        if b['sec']:
            kind = 'box' if b['box'] else ('list' if b['kind'] == 'li' else b['kind'])
            if kind == 'p' and b['lead']:
                kind = 'p:' + ' '.join(b['lead'].split()[:3]).rstrip('.:').lower()
            seq = secs.setdefault(b['sec'], [])
            if not seq or seq[-1] != kind or kind == 'p':
                seq.append(kind)
    sigs = [tuple(v) for v in secs.values() if len(v) > 1]
    if sigs:
        common = Counter(sigs).most_common(1)[0][1]
        m['skeleton_same_pct'] = round(100.0 * common / len(sigs), 1)
    else:
        m['skeleton_same_pct'] = 0
    m['sections'] = len(sigs)
    # the full kit: a section with a "say it" box AND a labelled "try" step
    SAY = re.compile(r'^(?:you could|words you could|thoughts you could|things to tell|ways to say|words to try)', re.I)
    TRY = re.compile(r'^(?:try this|this week|one small step|something to try|practice|practise|your next step)', re.I)
    kit = 0
    for v in secs.values():
        leads = [k[2:] for k in v if k.startswith('p:')]
        if any(SAY.match(x) for x in leads) and any(TRY.match(x) for x in leads):
            kit += 1
    m['full_kit_pct'] = round(100.0 * kit / max(len(secs), 1), 1)
    cll = 0
    for sec in set(b['sec'] for b in blocks if b['sec']):
        bs = [b for b in blocks if b['sec'] == sec and not b['box'] and b['kind'] != 'h']
        kinds = [b['kind'] for b in bs]
        if 'li' in kinds and len(kinds) > 1 and kinds[-1] == 'p' and kinds[0] == 'p':
            last = bs[-1]
            if len(sentences(last['text'])) <= 1 and len(words(last['text'])) <= 20 and kinds[-2] == 'li':
                cll += 1
    m['claim_list_line'] = cll
    return m


def chapters_from_print(h):
    arts = re.findall(r'(<article class="[^"]*\bpe-ch\b[^"]*"[^>]*>.*?</article>)', h, re.S)
    out = []
    for a in arts:
        idm = re.search(r'\bid="([^"]+)"', a[:300])
        out.append((idm.group(1) if idm else '?', a))
    return out


def audit_print():
    res = {}
    pages = {}
    try:
        sj = json.load(open(os.path.join(PRINT, 'series.json'), encoding='utf-8'))
        for k, v in (sj.get('books') or {}).items():
            if isinstance(v, dict) and v.get('pages'):
                pages[k] = v['pages']
    except Exception:
        pass
    for f in sorted(glob.glob(os.path.join(PRINT, 'src', '*.html'))):
        bid = os.path.basename(f)[:-5]
        if bid.startswith('cover-'):
            continue
        h = open(f, encoding='utf-8').read()
        chs = chapters_from_print(h)
        if not chs:
            body = re.search(r'<body.*?</body>', h, re.S)
            chs = [('all', body.group(0) if body else h)]
        per = {}
        allb, alll = [], []
        for cid, a in chs:
            p = parse(a)
            per[cid] = block_metrics(p.blocks, p.lists)
            allb += [dict(b, sec=(hash(cid), b['sec']) if b['sec'] else 0) for b in p.blocks]
            alll += p.lists
        tot = block_metrics(allb, alll)
        tot['chapters'] = len(chs)
        tot['sd_by_chapter'] = {k: v['sd_sentence'] for k, v in per.items()}
        tot['skeleton_same_pct_mean'] = round(statistics.mean([v['skeleton_same_pct'] for v in per.values()]), 1) if per else 0
        tot['pages'] = pages.get(bid)
        if tot['pages']:
            tot['bullets_per_page'] = round(tot['bullets'] / tot['pages'], 2)
        res[bid] = {'book': tot, 'chapters': per}
    return res


def audit_pdf():
    res = {}
    for f in sorted(glob.glob(os.path.join(PRINT, '*.pdf'))):
        bid = os.path.basename(f)[:-4]
        if bid.startswith('cover-'):
            continue
        try:
            t = subprocess.run(['pdftotext', '-enc', 'UTF-8', f, '-'], capture_output=True, text=True, check=True).stdout
        except Exception as e:  # noqa
            res[bid] = {'error': str(e)}
            continue
        npages = t.count('\f')
        t = re.sub(r'-\n(?=[a-z])', '', t)
        t = re.sub(r'\s*\n\s*', ' ', t)
        m = text_metrics(t)
        m['pages'] = npages
        res[bid] = m
    return res


SRC_BOOKS = None


def src_books():
    sj = json.load(open(SERIES, encoding='utf-8'))
    out = []
    for i, b in enumerate(sj['books'], 1):
        out.append(('book-%d' % i, b['chapters']))
    return out


def src_text(slug, deep):
    p = os.path.join(BOOKDIR, slug + ('-in-depth' if deep else '') + '.html')
    if not os.path.exists(p):
        return None
    h = open(p, encoding='utf-8').read()
    m = re.search(r'<main\b.*?</main>', h, re.S)
    h = m.group(0) if m else h
    for r in SRC_DROP:
        h = re.sub(r, '', h, flags=re.S)
    h = re.sub(r'<aside class="book-hint.*?</aside>', '', h, flags=re.S)
    h = re.sub(r'<header class="read-head">.*?</header>', '', h, flags=re.S)
    return h


def audit_src():
    res = {}
    for bid, slugs in src_books():
        for deep in (False, True):
            key = bid + ('-in-depth' if deep else '')
            per, allb, alll = {}, [], []
            for s in slugs:
                h = src_text(s, deep)
                if h is None:
                    continue
                p = parse(h)
                per[s] = block_metrics(p.blocks, p.lists)
                per[s].update(prose_counts(h))
                allb += [dict(b, sec=(s, b['sec']) if b['sec'] else 0) for b in p.blocks]
                alll += p.lists
            tot = block_metrics(allb, alll)
            tot['sd_by_chapter'] = {k: v['sd_sentence'] for k, v in per.items()}
            tot['skeleton_same_pct_mean'] = round(statistics.mean([v['skeleton_same_pct'] for v in per.values()]), 1) if per else 0
            for k in ('prose_words', 'prose_triads', 'prose_notbut'):
                tot[k] = sum(v.get(k, 0) for v in per.values())
            tot['prose_triads_per_1k'] = round(tot['prose_triads'] * 1000.0 / max(tot['prose_words'], 1), 2)
            tot['prose_notbut_per_1k'] = round(tot['prose_notbut'] * 1000.0 / max(tot['prose_words'], 1), 2)
            res[key] = {'book': tot, 'chapters': per}
    return res


KEYS = [('words', 'Words'), ('mean_sentence', 'Mean sentence'), ('sd_sentence', 'Sentence SD'),
        ('var_sentence', 'Sentence variance'), ('pct_12_22', '% sentences 12-22 words'), ('pct_le6', '% of 6 or fewer'),
        ('pct_ge30', '% of 30+'), ('triads_per_1k', 'Lists of three /1k'), ('lists_of_three', 'Bullet lists of 3'),
        ('notbut_per_1k', '"not X but Y" family /1k'), ('colons_per_1k', 'Colons /1k'), ('colon_heads', 'Colon-led heads/leads'),
        ('dashes_per_1k', 'Dashes /1k'), ('stock_total', 'Stock phrases'), ('hedges_per_1k', 'Hedges /1k'),
        ('hedges_wide_per_1k', 'Hedges, wide /1k'), ('moral_end_pct', '% paragraphs ending on a moral'),
        ('skeleton_same_pct_mean', '% sections with the same skeleton'), ('full_kit_pct', '% sections with say-box + try-step'), ('claim_list_line', 'Claim-list-line sections'),
        ('bullets_per_1k', 'Bullets /1k'), ('bullets_per_page', 'Bullets a page'), ('opener_top3_pct', '% sentences opening with top-3 words'),
        ('para_opener_repeats', 'Repeated paragraph openers'), ('prose_triads', 'Lists of three in editable prose'),
        ('prose_triads_per_1k', 'Lists of three in editable prose /1k'), ('prose_notbut', '"not X but Y" in editable prose'),
        ('prose_notbut_per_1k', '"not X but Y" in editable prose /1k')]


def md(res):
    out = []
    pr = res.get('print', {})
    if pr:
        ids = list(pr)
        out.append('### Print pages (chapters as printed)\n')
        out.append('| Measure | ' + ' | '.join(ids) + ' |')
        out.append('|---|' + '---|' * len(ids))
        for k, lab in KEYS:
            out.append('| %s | %s |' % (lab, ' | '.join(str(pr[i]['book'].get(k, '')) for i in ids)))
        out.append('')
    pdf = res.get('pdf', {})
    if pdf:
        ids = list(pdf)
        out.append('### PDF text (every printed word)\n')
        out.append('| Measure | ' + ' | '.join(ids) + ' |')
        out.append('|---|' + '---|' * len(ids))
        for k in ('words', 'pages', 'triads_per_1k', 'notbut_per_1k', 'colons_per_1k', 'dashes_per_1k', 'stock_total', 'hedges_per_1k', 'hedges_wide_per_1k'):
            out.append('| %s | %s |' % (k, ' | '.join(str(pdf[i].get(k, '')) for i in ids)))
        out.append('')
    src = res.get('src', {})
    if src:
        ids = list(src)
        out.append('### Chapter sources\n')
        out.append('| Measure | ' + ' | '.join(ids) + ' |')
        out.append('|---|' + '---|' * len(ids))
        for k, lab in KEYS:
            if k == 'bullets_per_page':
                continue
            out.append('| %s | %s |' % (lab, ' | '.join(str(src[i]['book'].get(k, '')) for i in ids)))
        out.append('')
    return '\n'.join(out)


def main():
    res = {'print': audit_print(), 'pdf': audit_pdf(), 'src': audit_src()}
    if '--out' in sys.argv:
        with open(sys.argv[sys.argv.index('--out') + 1], 'w', encoding='utf-8') as f:
            json.dump(res, f, indent=1, ensure_ascii=False)
    if '--md' in sys.argv:
        print(md(res))
    else:
        print(json.dumps(res, indent=1, ensure_ascii=False))


if __name__ == '__main__':
    main()
