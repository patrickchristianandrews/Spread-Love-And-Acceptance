#!/usr/bin/env python3
"""Build the book so it can be read on its own, like a regular book, on screen and on paper.

Run from the repo root:  python3 tools/book/build_book.py

It writes:
  book/index.html             the book's home: the cover, how to read it, contents in order, Start reading
  book/download.html          the PDF downloads (sizes come from book/pdf/manifest.json)
  book/{whole,for-yourself,together,understanding}(-in-depth).html
                              the packages: each one is a book on one page AND the source of its PDF. The
                              print edition (cover, front matter, part openers, chapter openers and ends, back
                              matter, index) is in the page as print-only blocks, styled by
                              /assets/css/book-print.css. tools/book/build_pdfs.js prints them.
and, inside every chapter page (short and full), the generated blocks
  <!-- book-open:start --> ... <!-- book-open:end -->   the chapter-opener band above the title
  <!-- book-fig:start --> ... <!-- book-fig:end -->     each figure from tools/book/figures.json
  <!-- book-ex:start --> ... <!-- book-ex:end -->       each filled-in example from tools/book/examples.json
  <!-- book-end:start --> ... <!-- book-end:end -->     What to remember, This connects to, Use this in the
                                                        program, and the next chapter
It also rewrites the reading-order list on book/topic-start-here.html.

Page numbers: build_pdfs.js measures where every chapter and index term lands and saves them in
book/pdf/manifest.json; the next run of this script writes them into the packages' print contents and index,
so printing from the browser shows the same numbers as the PDF.

Change the order, a chapter's program links or the connection map below, then run it again.
Afterwards run tools/seo/build_seo.py (new pages need their SEO lines there).
"""
import glob
import html
import json
import os
import re
import sys

sys.path.insert(0, os.path.dirname(os.path.abspath(__file__)))
import book_art  # noqa: E402

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BOOK = os.path.join(ROOT, 'book')
SITE = 'https://spreadloveandacceptance.com'
UPDATED = 'October 2026'
AUTHOR = 'Christian'

PARTS = {
    1: ('Part One', 'Yourself', 'Where you came from, who you are now and who you are becoming. You can read all of it on your own.'),
    2: ('Part Two', 'Between us', 'One idea per chapter about sharing a life, a home or work with someone, each with a worksheet that puts it to use.'),
    3: ('Part Three', 'Understanding people', 'How feelings, stress, trust, change, grief, groups and love work, for anyone, in any kind of relationship.'),
}
# part colours: (strong, tint, word) — the same family as the site's palette
PCOL = {1: ('#3E6B4C', '#E2F0E6'), 2: ('#94671F', '#F6ECD2'), 3: ('#2B5B8C', '#E1ECF7'), 4: ('#96412B', '#F6E2D9')}

# (slug, part, short label, note, program links [(text, href)]). Part 4 is the afterword (back matter).
ORDER = [
    ('self-1-then', 1, 'Then', 'Where your lens came from: growing up, old rules and what life taught you',
     [('The self path: see where your lens came from', '/self-path.html#lens')]),
    ('self-2-now', 1, 'Now', 'Your wiring, your weather and your words, and what is fair to you',
     [('The self path: get to know your wiring', '/self-path.html#wiring'), ('How much are you carrying? A quick stress check', '/workpapers/wp-02-how-much-are-you-carrying.html')]),
    ('self-3-next', 1, 'Next', 'What matters to you, one small goal, tiny steps and a kind monthly look at yourself',
     [('The self path, step by step', '/self-path.html#steps'), ('The Calm-Down Kit: a plan for heated moments', '/wp-11.html')]),
    ('preface', 2, 'Preface', 'The quiet, unseen work of running a shared life, and why it deserves to be noticed',
     [('Six-week program, week 1: see the work that’s already happening', '/prog-01.html#week-1'), ('Who did what', '/workpapers/wp-01.html')]),
    ('chapter-1', 2, 'Chapter I', 'How pace, tone and urgency nudge two people out of sync, and how to get back in tune',
     [('Six-week program, week 1', '/prog-01.html#week-1'), ('The 90-second daily check-in', '/workpapers/wp-13-daily-check-in.html')]),
    ('chapter-2', 2, 'Chapter II', 'A simple way to see whether the way you share the work can last',
     [('Six-week program, week 2: give every job one owner', '/prog-01.html#week-2'), ('One owner per job', '/workpapers/wp-03-one-owner-per-job.html')]),
    ('chapter-3', 2, 'Chapter III', 'How much of a reaction is leftover stress, and the seven angles people see things from',
     [('Six-week program, week 3: notice how much each of you is carrying', '/prog-01.html#week-3'), ('How much are you carrying?', '/workpapers/wp-02-how-much-are-you-carrying.html')]),
    ('chapter-4', 2, 'Chapter IV', 'Agreeing on what fair means to you both, and letting words land before you react',
     [('Six-week program, week 4: talk about it kindly', '/prog-01.html#week-4'), ('Say it so it lands', '/workpapers/wp-09-say-it-so-it-lands.html')]),
    ('chapter-5', 2, 'Chapter V', 'A gentle monthly look back that catches what weekly check-ins miss',
     [('Six-week program, week 6: make it last', '/prog-01.html#week-6'), ('What keeps coming back? A monthly look-back', '/workpapers/wp-04-what-keeps-coming-back.html')]),
] + [
    ('understanding-%d-%s' % (n, s), 3, 'Chapter %d' % n, note, [])
    for n, s, note in [
        (1, 'feelings', 'Signals from the body, naming what you feel, and feelings about feelings'),
        (2, 'stress', 'The ladder, flooding, why stress adds up, and rest that helps'),
        (3, 'seeing', 'Perception, bias, and the stories we tell about each other'),
        (4, 'communication', 'Meaning, listening, repair, and messages that land'),
        (5, 'belonging', 'Why we need each other, and how trust grows and is rebuilt'),
        (6, 'change', 'Why change is hard, and how small steps and a kind setup help'),
        (7, 'worth', 'Worth is not a score: guilt, shame and a kinder inner voice'),
        (8, 'loss', 'Grief in waves, losses nobody sees, and staying connected'),
        (9, 'minds', 'Autism, ADHD, sensory and learning differences, and meeting in the middle'),
        (10, 'values', 'What matters to you, and what philosophy offers everyday life'),
        (11, 'healing', 'Repair, apologies that land, forgiveness, and when to get help'),
        (12, 'helping', 'Support without fixing, kind limits, and not burning out'),
        (13, 'anger', 'What anger is for, the hot minutes, repair, and when it becomes harm'),
        (14, 'personality', 'Dials, not boxes: the Big Five, temperament, and how people change'),
        (15, 'love', 'Love in many forms, being known, and love across ages and relationship types'),
        (16, 'worry', 'How anxiety works, low mood vs depression, trauma, what helps and where to get help'),
        (17, 'groups', 'Conformity, obedience, us and them, culture, and disagreeing kindly'),
    ]
] + [
    ('afterword', 4, 'Afterword', 'Six threads through the book, and where to go from here',
     [('The self path', '/self-path.html'), ('The six-week program', '/prog-01.html')]),
]

# short names for running footers, the connection lists and the index of the print edition
SHORT = {
    'self-1-then': 'Where your lens came from',
    'self-2-now': 'Your wiring, weather and words',
    'self-3-next': 'Who you are becoming',
    'preface': 'The work nobody sees',
    'chapter-1': 'Why we get out of tune',
    'chapter-2': 'Is the split working?',
    'chapter-3': 'Full tanks and different angles',
    'chapter-4': 'Two kinds of fair',
    'chapter-5': 'The monthly look-back',
    'understanding-1-feelings': 'How feelings work',
    'understanding-2-stress': 'Stress and the nervous system',
    'understanding-3-seeing': 'How we see each other',
    'understanding-4-communication': 'How communication works',
    'understanding-5-belonging': 'Attachment, trust and belonging',
    'understanding-6-change': 'Habits and change',
    'understanding-7-worth': 'Self-worth, shame and self-compassion',
    'understanding-8-loss': 'Loss, grief and big life changes',
    'understanding-9-minds': 'Minds that work differently',
    'understanding-10-values': 'Values, meaning and a good life',
    'understanding-11-healing': 'Healing after hurt',
    'understanding-12-helping': 'Helping others well',
    'understanding-13-anger': 'Anger',
    'understanding-14-personality': 'Personality, temperament and change',
    'understanding-15-love': 'Closeness and love',
    'understanding-16-worry': 'Worry, low mood and trauma',
    'understanding-17-groups': 'Groups, influence and culture',
    'afterword': 'What the book adds up to',
}

# The connection map: each chapter points to the chapters, in other parts too, that explain it or put it to
# use. (target, why). Part Two points back to the Part One and Three chapters behind it, and they point forward.
CONNECT = {
    'self-1-then': [('understanding-3-seeing', 'how a lens shapes what you notice in other people'),
                    ('understanding-5-belonging', 'how early trust and attachment carry into adult life'),
                    ('understanding-14-personality', 'which parts are temperament, and which can change'),
                    ('understanding-11-healing', 'making peace with what happened, and when to get help')],
    'self-2-now': [('understanding-9-minds', 'wiring differences: autism, ADHD and the senses'),
                   ('understanding-2-stress', 'why your weather changes how you hear things'),
                   ('chapter-3', 'the stress tank, used between two people'),
                   ('chapter-4', 'what fair means when you share the work')],
    'self-3-next': [('understanding-10-values', 'finding out what matters to you'),
                    ('understanding-6-change', 'why tiny steps and if-then plans work'),
                    ('chapter-5', 'the same monthly look, done together'),
                    ('understanding-7-worth', 'a kinder inner voice when a step slips')],
    'preface': [('chapter-2', 'putting the unseen work into numbers you both trust'),
                ('understanding-3-seeing', 'why each person sees their own work first'),
                ('understanding-12-helping', 'care work and how not to burn out'),
                ('self-2-now', 'what fair means to you before you talk')],
    'chapter-1': [('understanding-4-communication', 'how meaning, tone and listening work'),
                  ('understanding-2-stress', 'why stress speeds people up or shuts them down'),
                  ('self-2-now', 'how you like to be spoken to'),
                  ('understanding-9-minds', 'when pace and tone are a wiring difference')],
    'chapter-2': [('preface', 'the unseen work the check counts'),
                  ('chapter-3', 'the stress input, explained'),
                  ('understanding-6-change', 'fixing the setup with small, kind changes'),
                  ('understanding-12-helping', 'when one person carries the care')],
    'chapter-3': [('understanding-2-stress', 'the ladder, flooding and rest'),
                  ('understanding-3-seeing', 'the angles and stories behind a reaction'),
                  ('understanding-13-anger', 'what to do in the hot minutes'),
                  ('self-2-now', 'checking your own weather first')],
    'chapter-4': [('understanding-11-healing', 'repair and apologies that land'),
                  ('understanding-4-communication', 'letting words land before you reply'),
                  ('understanding-10-values', 'fairness as a value you choose together'),
                  ('understanding-17-groups', 'how a group’s norms decide what feels fair')],
    'chapter-5': [('self-3-next', 'the same kind look, on your own'),
                  ('understanding-6-change', 'why problems come back, and how habits stick'),
                  ('chapter-2', 'the setup score the look-back feeds'),
                  ('understanding-11-healing', 'repairing what the look-back finds')],
    'understanding-1-feelings': [('self-2-now', 'reading your own weather day to day'),
                                 ('chapter-3', 'feelings when a stress tank is full'),
                                 ('understanding-2-stress', 'what the body does under pressure'),
                                 ('understanding-13-anger', 'one feeling up close')],
    'understanding-2-stress': [('chapter-3', 'the stress tank in a shared home'),
                               ('self-2-now', 'your weather before you speak'),
                               ('chapter-1', 'how stress knocks two people out of tune'),
                               ('understanding-16-worry', 'when stress turns into worry or low mood')],
    'understanding-3-seeing': [('self-1-then', 'where your lens came from'),
                               ('preface', 'why the other person doesn’t see the work'),
                               ('chapter-3', 'seven angles on the same moment'),
                               ('understanding-17-groups', 'us and them, and the stories groups tell')],
    'understanding-4-communication': [('chapter-1', 'pace, tone and getting back in tune'),
                                      ('chapter-4', 'letting a comment land'),
                                      ('understanding-11-healing', 'repair after it goes wrong'),
                                      ('self-2-now', 'how you like to be spoken to')],
    'understanding-5-belonging': [('self-1-then', 'early trust and the rules from home'),
                                  ('understanding-15-love', 'being known, at every age'),
                                  ('understanding-17-groups', 'belonging to groups, and their pull'),
                                  ('understanding-8-loss', 'when a bond is lost')],
    'understanding-6-change': [('self-3-next', 'one small goal and tiny steps'),
                               ('chapter-5', 'the monthly look-back'),
                               ('chapter-2', 'changing the setup, not the person'),
                               ('understanding-14-personality', 'how much people really change')],
    'understanding-7-worth': [('self-1-then', 'old rules that taught you your worth'),
                              ('self-3-next', 'kindness when a goal slips'),
                              ('understanding-11-healing', 'guilt, apology and forgiveness'),
                              ('understanding-16-worry', 'when the inner critic gets loud')],
    'understanding-8-loss': [('understanding-5-belonging', 'why losing a bond hurts so much'),
                             ('understanding-12-helping', 'supporting someone who is grieving'),
                             ('understanding-16-worry', 'when grief turns into low mood'),
                             ('self-1-then', 'losses that shaped your lens')],
    'understanding-9-minds': [('self-2-now', 'getting to know your own wiring'),
                              ('chapter-1', 'pace, tone and meeting in the middle'),
                              ('understanding-14-personality', 'dials, not boxes'),
                              ('understanding-4-communication', 'saying it so it lands for different minds')],
    'understanding-10-values': [('self-3-next', 'turning values into one small goal'),
                                ('chapter-4', 'two kinds of fair'),
                                ('understanding-17-groups', 'whose values a group rewards'),
                                ('understanding-7-worth', 'worth that is not a score')],
    'understanding-11-healing': [('chapter-4', 'covering kindly and saying it out loud'),
                                 ('understanding-4-communication', 'repair in everyday talk'),
                                 ('understanding-13-anger', 'when anger did the damage'),
                                 ('understanding-7-worth', 'guilt without shame')],
    'understanding-12-helping': [('preface', 'the care work nobody sees'),
                                 ('chapter-2', 'sharing the load so it lasts'),
                                 ('understanding-8-loss', 'helping someone through grief'),
                                 ('understanding-2-stress', 'noticing your own stress first')],
    'understanding-13-anger': [('chapter-3', 'leftover stress behind a reaction'),
                               ('understanding-1-feelings', 'feelings as signals'),
                               ('understanding-11-healing', 'repair after the hot minutes'),
                               ('self-3-next', 'a Calm-Down Kit made on a calm day')],
    'understanding-14-personality': [('self-2-now', 'your wiring today'),
                                     ('self-1-then', 'temperament and how you grew up'),
                                     ('understanding-9-minds', 'minds that work differently'),
                                     ('understanding-6-change', 'how change really happens')],
    'understanding-15-love': [('understanding-5-belonging', 'attachment and trust'),
                              ('chapter-1', 'staying in tune day to day'),
                              ('preface', 'noticing the work love does'),
                              ('self-3-next', 'growing as a person inside a relationship')],
    'understanding-16-worry': [('understanding-2-stress', 'the stress ladder and rest'),
                               ('understanding-7-worth', 'a kinder inner voice'),
                               ('understanding-12-helping', 'supporting someone who is struggling'),
                               ('self-2-now', 'checking your weather each day')],
    'understanding-17-groups': [('understanding-3-seeing', 'bias and the stories we tell'),
                                ('understanding-5-belonging', 'why belonging matters so much'),
                                ('understanding-10-values', 'holding on to your own values'),
                                ('chapter-4', 'agreeing what fair means in your group')],
    'afterword': [('self-1-then', 'start again at the beginning, on your own'),
                  ('preface', 'start the shared part, with someone'),
                  ('understanding-1-feelings', 'start the background chapters')],
}

# key terms for the index (label, regular expression). Glossary words used in the book are added to these.
INDEX_TERMS = [
    ('ADHD', r'ADHD'), ('anger', r'anger|angry'), ('anxiety', r'anxiety|anxious'), ('apology', r'apolog(?:y|ies|ise|ize)'),
    ('attachment', r'attachment'), ('autism', r'autis(?:m|tic)'), ('belonging', r'belonging'), ('bias', r'bias(?:es)?'),
    ('Big Five', r'Big Five'), ('boundaries', r'boundar(?:y|ies)'), ('burnout', r'burn(?:out|ing out|ed out)'),
    ('carer, caregiving', r'carers?|caregiv(?:er|ers|ing)'), ('change', r'\bchange\b'), ('check-in', r'check-ins?'),
    ('conformity', r'conform(?:ity|ing)?'), ('culture', r'cultur(?:e|es|al)'), ('depression', r'depress(?:ion|ed)'),
    ('empathy', r'empath(?:y|ise|ize)'), ('fairness', r'\bfair(?:ness)?\b'), ('flooding', r'flood(?:ed|ing)'),
    ('forgiveness', r'forgiv(?:e|eness|ing)'), ('grief', r'grie(?:f|ve|ving)'), ('guilt', r'guilt'), ('habits', r'habits?'),
    ('if-then plans', r'if-then'), ('listening', r'listen(?:ing)?'), ('loneliness', r'lonel(?:y|iness)'),
    ('masking', r'mask(?:ing)?\b'), ('mental load', r'mental load'), ('owner, one owner per job', r'owners?\b'),
    ('perception', r'percep(?:tion|tions)'), ('personality', r'personalit(?:y|ies)'), ('repair', r'repair'),
    ('rest', r'\brest\b'), ('safety', r'safety|safe at home'), ('self-compassion', r'self-compassion'),
    ('shame', r'shame'), ('sleep', r'sleep'), ('stress', r'stress'), ('temperament', r'temperament'),
    ('trauma', r'trauma'), ('trust', r'\btrust'), ('values', r'values'), ('worry', r'worr(?:y|ies|ied|ying)'),
    ('unseen work', r'unseen work|invisible work|unbilled'),
]
# glossary words that only describe the website, not the book's ideas
GLOSS_SKIP = {'levels', 'petals', 'mini-dive', 'pal-cam', 'quiet-mode', 'easy-reading', 'simple-full', 'wiring-card', 'almanac',
              'signal-translator', 'conversation-reader', 'lemonade-stand', 'can-the-load-last'}


def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def write(p, s):
    with open(p, 'w', encoding='utf-8') as f:
        f.write(s)


def esc(s):
    return html.escape(s, quote=True)


def strip_tags(s):
    return html.unescape(re.sub(r'<[^>]+>', '', s))


def title_of(page):
    m = re.search(r'<h1[^>]*>(.*?)</h1>', page, re.S)
    return strip_tags(m.group(1)).strip() if m else ''


def main_inner(page):
    m = re.search(r'<main[^>]*>(.*)</main>', page, re.S)
    return m.group(1) if m else ''


TAG_RE = re.compile(r'<(/?)([a-zA-Z][a-zA-Z0-9]*)\b[^>]*?(/?)>')
VOID = {'br', 'img', 'hr', 'input', 'meta', 'link', 'source', 'wbr', 'col', 'area', 'base', 'embed', 'param', 'track'}


def element_end(s, i):
    """The index just after the element whose start tag begins at s[i]."""
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


def drop_element(s, start_pat, tag=None):
    """Remove every element whose opening tag matches start_pat, with its balanced contents."""
    out = s
    while True:
        m = re.search(start_pat, out)
        if not m:
            return out
        j = element_end(out, m.start())
        if j <= m.start():
            return out
        out = out[:m.start()] + out[j:]


def section_end(s, i):
    """For a heading starting at s[i], where its section ends: the next heading of the same or a higher
    level at the same depth, the end of its parent, or the generated end block."""
    m = TAG_RE.match(s, i)
    level = int(m.group(2)[1])
    depth = 0
    stops = [k for k in (s.find('<!-- book-end:start', i), s.find('<div data-research-box', i)) if k > 0]
    limit = min(stops) if stops else len(s)
    for t in TAG_RE.finditer(s, element_end(s, i)):
        if t.start() >= limit:
            return limit
        name = t.group(2).lower()
        if name in VOID or t.group(3):
            continue
        if t.group(1):
            depth -= 1
            if depth < 0:
                return t.start()
        else:
            if depth == 0 and re.match(r'h[1-6]$', name) and int(name[1]) <= level:
                return t.start()
            depth += 1
    return limit


def words(s):
    return len(re.findall(r"[A-Za-z’']+", strip_tags(s)))


def chapter_name(e):
    slug, part, label = e[0], e[1], e[2]
    if part == 1:
        return 'Part One · ' + label
    if slug == 'preface':
        return 'Preface to Part Two'
    if slug == 'afterword':
        return 'Afterword'
    return ('Part Two · ' if part == 2 else 'Part Three · ') + label


def big_label(e):
    """The large mark on a chapter opener: Then / Now / Next, Preface, I to V, 1 to 17."""
    lab = e[2]
    if lab.startswith('Chapter '):
        return lab[8:]
    return lab


def href(slug, deep=False):
    return '/book/%s%s.html' % (slug, '-in-depth' if deep else '')


def entry(slug):
    return next(e for e in ORDER if e[0] == slug)


def absolute(url):
    return url if url.startswith('http') else SITE + url


def pretty_url(url):
    return absolute(url).replace('https://', '')


# ---------- 0. what each chapter says, gathered once ----------
SLUGS = set(e[0] for e in ORDER)
TITLES, WORDS, LEDES, PAGES = {}, {}, {}, {}
for _e in ORDER:
    for _deep in (False, True):
        _pg = read(os.path.join(BOOK, _e[0] + ('-in-depth' if _deep else '') + '.html'))
        PAGES[(_e[0], _deep)] = _pg
        WORDS[(_e[0], _deep)] = words(main_inner(_pg))
        if not _deep:
            TITLES[_e[0]] = title_of(_pg)
            _m = re.search(r'<p class="simple-lede">(.*?)</p>', _pg, re.S)
            LEDES[_e[0]] = _m.group(1).strip() if _m else ''


def remember(slug):
    """3 to 5 points for "What to remember": the chapter's own In short list, or its big ideas."""
    pg = PAGES[(slug, False)]
    m = re.search(r'<div class="try-this" data-in-short>(.*?)</div>', pg, re.S)
    if m:
        items = re.findall(r'<li>(.*?)</li>', m.group(1), re.S)
        return [re.sub(r'</?a\b[^>]*>', '', x).strip() for x in items][:5]
    m = re.search(r'<ol class="ideas">(.*?)</ol>', pg, re.S)
    heads = [strip_tags(h).strip() for h in re.findall(r'<h2[^>]*>(.*?)</h2>', m.group(1), re.S)] if m else []
    if len(heads) > 5:
        heads = [heads[round(k * (len(heads) - 1) / 4)] for k in range(5)]
    return [esc(h) for h in heads]


def uses(slug):
    """The tools and worksheets that put a chapter to use: (text, url, what it is)."""
    e = entry(slug)
    if e[4]:
        return [(t, h, '') for t, h in e[4]][:2]
    pg = PAGES[(slug, False)]
    m = re.search(r'<h2 id="tools">.*?<ul>(.*?)</ul>', pg, re.S)
    out = []
    if m:
        for li in re.findall(r'<li>(.*?)</li>', m.group(1), re.S):
            a = re.match(r'\s*<a href="([^"]+)">(.*?)</a>:?\s*(.*)', li, re.S)
            if a and not a.group(1).startswith('/library/'):
                out.append((strip_tags(a.group(2)).strip(), a.group(1), strip_tags(a.group(3)).strip().rstrip('.')))
    return out[:2] or [('The six-week program', '/prog-01.html', '')]


def headings(slug, deep):
    """The h2 headings of a chapter (for "In this chapter"), with their ids."""
    inner = main_inner(PAGES[(slug, deep)])
    inner = drop_element(inner, r'<aside class="book-end', 'aside')
    out = []
    for m in re.finditer(r'<h2([^>]*)>(.*?)</h2>', inner, re.S):
        idm = re.search(r'\bid="([^"]+)"', m.group(1))
        if not idm:
            # the big ideas on the short pages carry their id on the list item
            k = inner.rfind('<li', 0, m.start())
            seg = inner[k:m.start()] if k >= 0 else ''
            idm = re.search(r'\bid="([^"]+)"', seg) if seg.count('>') <= 1 else None
        t = strip_tags(m.group(2)).strip().rstrip('.')
        if t:
            out.append((idm.group(1) if idm else None, t))
    return out


# ---------- 1. figures and filled-in examples (from the other helpers' manifests) ----------
def _load(name):
    p = os.path.join(ROOT, 'tools', 'book', name)
    if not os.path.exists(p):
        return []
    try:
        d = json.load(open(p, encoding='utf-8'))
    except Exception as ex:  # a half-written manifest must not break the book
        print('book: skipped %s (%s)' % (name, ex))
        return []
    return d if isinstance(d, list) else d.get('figures') or d.get('examples') or []


def norm_ch(c):
    c = (c or '').split('#')[0]
    c = re.sub(r'^/?book/', '', c)
    c = re.sub(r'\.html$', '', c)
    return re.sub(r'-in-depth$', '', c)


def svg_size(src):
    p = os.path.join(ROOT, src.lstrip('/'))
    try:
        head = read(p)[:2000]
    except Exception:
        return None
    m = re.search(r'viewBox="\s*[-\d.]+[\s,]+[-\d.]+[\s,]+([\d.]+)[\s,]+([\d.]+)', head)
    if m:
        return int(float(m.group(1))), int(float(m.group(2)))
    w, h = re.search(r'\bwidth="([\d.]+)', head), re.search(r'\bheight="([\d.]+)', head)
    return (int(float(w.group(1))), int(float(h.group(1)))) if w and h else None


def figures():
    out = []
    for f in _load('figures.json'):
        ch = norm_ch(f.get('chapter'))
        src = f.get('src') or ''
        if (ch not in SLUGS and ch != 'front') or not src or not os.path.exists(os.path.join(ROOT, src.lstrip('/'))):
            continue
        f = dict(f, chapter=ch, src='/' + src.lstrip('/'))
        out.append(f)
    order = {e[0]: i for i, e in enumerate(ORDER)}
    order['front'] = -1
    out.sort(key=lambda f: order[f['chapter']])
    for n, f in enumerate(out, 1):
        f['n'] = n
        f['id'] = f.get('id') or 'fig-%d' % n
    return out


def examples():
    out = []
    for x in _load('examples.json'):
        ch = norm_ch(x.get('chapter'))
        fp = os.path.join(ROOT, 'tools', 'book', 'examples', os.path.basename(x.get('file') or ''))
        if ch not in SLUGS or not x.get('file') or not os.path.exists(fp):
            continue
        out.append(dict(x, chapter=ch, path=fp))
    order = {e[0]: i for i, e in enumerate(ORDER)}
    out.sort(key=lambda x: order[x['chapter']])
    for n, x in enumerate(out, 1):
        x['n'] = n
        x['id'] = re.sub(r'[^a-z0-9-]+', '-', str(x.get('id') or 'ex-%d' % n).lower()).strip('-')
    return out


FIGS = figures()
EXS = examples()


def fig_html(f, markers=True):
    wh = (f.get('width'), f.get('height')) if f.get('width') and f.get('height') else (svg_size(f['src']) if f['src'].endswith('.svg') else None)
    dims = ' width="%d" height="%d"' % tuple(wh) if wh else ''
    s = ('<figure class="book-fig no-bubble" id="%s" data-kind="%s"><a class="book-fig-zoom" href="%s" title="Open the picture on its own, to zoom in">'
         '<img src="%s" alt="%s"%s loading="lazy" decoding="async"></a>'
         '<figcaption><span class="book-fig-n">Figure %d</span> %s</figcaption></figure>') % (
        esc(f['id']), esc(f.get('kind', '')), esc(f['src']), esc(f['src']), esc(f.get('alt', '')), dims, f['n'], f.get('caption', ''))
    return ('<!-- book-fig:start -->\n%s\n<!-- book-fig:end -->' % s) if markers else s.replace(' loading="lazy"', '')


def ex_html(x):
    body = read(x['path'])
    body = re.sub(r'<script\b.*?</script>', '', body, flags=re.S)
    # printed copies show where the "Fill in your own" link goes, as a short address
    body = re.sub(r'(<p class="bk-ex-link"[^>]*>.*?)</p>', lambda m: re.sub(
        r'<a href="(/[^"]*)"([^>]*)>(.*?)</a>', lambda a: '<a href="%s" data-u="%s"%s>%s</a><span class="pe-only pe-u"> (%s)</span>' % (
            a.group(1), esc(short_address(a.group(1))), a.group(2), a.group(3), addr_html(short_address(a.group(1)))), m.group(0), flags=re.S), body, flags=re.S)
    # long optional notes in table headings ("(hours each time, optional)") are left off the printed page
    body = re.sub(r'(<th\b[^>]*>[^<]*?)\s*(\([^()<]{8,}\))(</th>)', r'\1<span class="pe-th-opt"> \2</span>\3', body)
    title = x.get('title') or 'A filled-in example'
    # the snippet carries its own id (x['id']) on its <figure>; the wrapper only carries the number
    return ('<!-- book-ex:start -->\n<div class="book-ex-wrap no-bubble" data-ex-n="%d" data-ex-title="%s">%s</div>\n<!-- book-ex:end -->') % (
        x['n'], esc(title), body.strip())


def place_idea(s, n, block):
    """At the end of the nth <li> of the page's <ol class="ideas"> (the big ideas on the short pages have no ids)."""
    m = re.search(r'<ol class="ideas"[^>]*>', s)
    if not m or not n:
        return s, False
    k = m.end()
    for _ in range(int(n)):
        j = s.find('<li', k)
        if j < 0:
            return s, False
        k = element_end(s, j)
    e = k - len('</li>')
    return s[:e] + '\n' + block + '\n' + s[e:], True


def place_heading(s, text, block):
    """After the heading whose text is `text`: at the end of its idea card, or of its section."""
    want = re.sub(r'\s+', ' ', text).strip().rstrip('.').lower()
    for m in re.finditer(r'<h([2-4])\b[^>]*>(.*?)</h\1>', s, re.S):
        if re.sub(r'\s+', ' ', strip_tags(m.group(2))).strip().rstrip('.').lower() == want:
            i = m.start()
            li = s.rfind('<li', 0, i)
            if li >= 0 and re.fullmatch(r'<li[^>]*>\s*', s[li:i]):
                k = element_end(s, li) - len('</li>')
            else:
                k = section_end(s, i)
            return s[:k] + '\n' + block + '\n' + s[k:], True
    return s, False


def place(s, after_id, block):
    """Put a generated block after the element with id=after_id (after a heading: at the end of its section;
    after a list item: inside it, at its end). Returns s unchanged when the id is missing."""
    m = re.search(r'\bid="%s"' % re.escape(after_id), s) if after_id else None
    if not m:
        return s, False
    i = s.rfind('<', 0, m.start())
    t = TAG_RE.match(s, i)
    if not t:
        return s, False
    name = t.group(2).lower()
    if re.match(r'h[1-6]$', name):
        k = section_end(s, i)
    elif name == 'li':
        k = element_end(s, i) - len('</li>')
    else:
        k = element_end(s, i)
    return s[:k] + '\n' + block + '\n' + s[k:], True


MISSING = []
# Figures are numbered in the order they appear: on the chapter pages through the whole book (the short and the
# full pages each count their own), and in each package from 1, in page order (see finish_package).
FIG_N_RE = re.compile(r'(<span class="book-fig-n">Figure )([^<]*)(</span>)')
FIGCOUNT = {}


def renumber_figs(s, start):
    n = [start]

    def sub(m):
        n[0] += 1
        return '%s%d%s' % (m.group(1), n[0], m.group(3))
    return FIG_N_RE.sub(sub, s), n[0]


def insert_generated(s, slug, deep):
    # Take out the old blocks with all the line breaks around them, leaving one blank line, so a rebuild
    # doesn't add a blank line at each spot every time it runs.
    s = re.sub(r'\n*<!-- book-(fig|ex):start -->.*?<!-- book-\1:end -->\n*', '\n\n', s, flags=re.S)
    ver = 'full' if deep else 'short'
    for f in FIGS:
        if f['chapter'] != slug or ver not in (f.get('versions') or ['short', 'full']):
            continue
        aid = (f.get('after_id_full') if deep else None) or f.get('after_id')
        if not deep and not f.get('after_id') and f.get('idea'):
            s, ok = place_idea(s, f['idea'], fig_html(f))
            aid = 'idea %s' % f['idea']
        else:
            s, ok = place(s, aid, fig_html(f))
        if not ok:
            MISSING.append('figure %s: #%s not found in %s%s' % (f['src'], aid, slug, '-in-depth' if deep else ''))
    for x in EXS:
        if x['chapter'] != slug or ver not in (x.get('versions') or ['short', 'full']):
            continue
        aid = x.get('after_id_full') if deep else x.get('after_id')
        head = x.get('after_heading_full') if deep else x.get('after_heading')
        if aid:
            s, ok = place(s, aid, ex_html(x))
        elif head:
            s, ok = place_heading(s, head, ex_html(x))
            aid = '“%s”' % head
        else:
            continue
        if not ok:
            MISSING.append('example %s: %s not found in %s%s' % (x['id'], aid, slug, '-in-depth' if deep else ''))
    return s


def ex_where(x, deep):
    return (x.get('after_id_full') or x.get('after_heading_full')) if deep else (x.get('after_id') or x.get('after_heading'))


EX_CSS = '<link rel="stylesheet" href="/assets/css/book-examples.css">'


def with_example_css(s):
    if EXS and EX_CSS not in s:
        s = s.replace('<link rel="stylesheet" href="/assets/css/reading.css">', '<link rel="stylesheet" href="/assets/css/reading.css">\n' + EX_CSS, 1)
    return s


# ---------- 2. the generated blocks in every chapter ----------
def remember_html(slug, cls):
    return '<ul class="%s">%s</ul>' % (cls, ''.join('<li>%s</li>' % x for x in remember(slug)))


def end_block(i, deep):
    e = ORDER[i]
    prev = ORDER[i - 1] if i > 0 else None
    nxt = ORDER[i + 1] if i + 1 < len(ORDER) else None
    links = list(e[4])
    if e[1] == 3:
        links = [('The tools that go with this chapter', href(e[0]) + '#tools'), ('The six-week program', '/prog-01.html')]
    prog = ''.join('<li><a href="%s">%s</a></li>' % (h, esc(t)) for t, h in links)
    why = {1: 'Part One is the reading for the self path, a few short steps you do on your own.',
           2: 'Each Part Two chapter goes with a week of the six-week program and a worksheet.',
           3: 'Part Three is background for every part of the program.',
           4: 'Pick a path: on your own, or with someone.'}[e[1]]
    s = '<!-- book-end:start -->\n<aside class="book-end no-bubble" data-no-bubble data-part="%d" aria-label="The book">\n' % e[1]
    s += '<div class="book-end-grid">'
    s += '<section class="book-end-rem"><h2 class="book-end-k">What to remember</h2>%s</section>' % remember_html(e[0], 'book-end-list')
    s += '<section class="book-end-links"><h2 class="book-end-k">This connects to</h2><ul class="book-end-list">'
    for tgt, w in CONNECT.get(e[0], []):
        te = entry(tgt)
        s += '<li><a href="%s">%s: %s</a><span>%s</span></li>' % (href(tgt, deep), esc(chapter_name(te)), esc(SHORT[tgt]), esc(w[0].upper() + w[1:]))
    s += '</ul></section></div>\n'
    s += '<div class="book-end-use"><p class="book-end-k">Use this in the program</p><p>%s</p><ul>%s</ul></div>\n' % (why, prog)
    s += '<nav class="book-end-nav" aria-label="Book pages">'
    if nxt:
        s += '<a class="book-end-next" href="%s" rel="next"><span>Next in the book</span>%s: %s</a>' % (
            href(nxt[0], deep), esc(chapter_name(nxt)), esc(TITLES[nxt[0]]))
    else:
        s += '<a class="book-end-next" href="/book/"><span>You’ve reached the end of the book</span>Back to the book’s contents</a>'
    s += '<span class="book-end-row">'
    if prev:
        s += '<a href="%s" rel="prev">&larr; Back: %s</a>' % (href(prev[0], deep), esc(chapter_name(prev)))
    s += '<a href="/book/">The book: contents</a>'
    s += '<a href="/book/whole%s.html#%s">Read on one page</a>' % ('-in-depth' if deep else '', e[0])
    s += '</span></nav>\n</aside>\n<!-- book-end:end -->'
    return s


def open_block(e):
    pname = PARTS[e[1]][0] + ': ' + PARTS[e[1]][1] if e[1] in PARTS else 'The end of the book'
    return ('<!-- book-open:start -->\n<div class="book-open no-bubble" data-part="%d" aria-hidden="true"><span class="book-open-n">%s</span>'
            '<span class="book-open-p">%s</span></div>\n<!-- book-open:end -->\n') % (e[1], esc(big_label(e)), esc(pname))


GROWING_ASIDE = re.compile(r'\s*<aside class="growing-note"[^>]*>.*?</aside>', re.S)
GROWING_CHIP = re.compile(r'\s*<a class="growing-chip"[^>]*>.*?</a>', re.S)


def patch_chapter(i, deep):
    e = ORDER[i]
    p = os.path.join(BOOK, e[0] + ('-in-depth' if deep else '') + '.html')
    s = read(p)
    s = re.sub(r'\n?<!-- book-end:start -->.*?<!-- book-end:end -->', '', s, flags=re.S)
    s = re.sub(r'<!-- book-open:start -->.*?<!-- book-open:end -->\n?', '', s, flags=re.S)
    # the chapters are written; the "still growing" notes made a finished book look unfinished
    s = GROWING_ASIDE.sub('', s)
    s = GROWING_CHIP.sub('', s)
    # Part Three's own previous/next line is replaced by the shared block
    s = re.sub(r'<nav class="p3-nav"[^>]*>.*?</nav>\n?', '', s, flags=re.S)
    if 'class="last-updated' not in s:
        s = s.replace('</main>', '<p class="last-updated no-bubble">Last updated: %s</p>\n</main>' % UPDATED, 1)
    s = s.replace('<header class="read-head">', open_block(e) + '<header class="read-head">', 1)
    s = insert_generated(s, e[0], deep)
    ver = 'full' if deep else 'short'
    if ver not in FIGCOUNT:
        FIGCOUNT[ver] = sum(1 for f in FIGS if f['chapter'] == 'front' and ver in (f.get('versions') or ['short', 'full']))
    s, FIGCOUNT[ver] = renumber_figs(s, FIGCOUNT[ver])
    s = with_example_css(s)
    blk = end_block(i, deep)
    anchor = '<p class="last-updated'
    k = s.rfind(anchor)
    if k < 0:
        k = s.rfind('</main>')
    s = s[:k] + blk + '\n' + s[k:]
    PAGES[(e[0], deep)] = s
    write(p, s)


# ---------- 3. the packages: one page each, and the print edition inside it ----------
LEAD_CLASSES = [
    (r'Words you could use[^<]*|Thoughts you could try[^<]*', 'pe-words'),
    (r'Try this[:.]|Practice:|Your next step:', 'pe-try'),
    (r'For example:', 'pe-ex'),
    (r'A note on safety:|A note on care:', 'pe-safe'),
    (r'Research note[:.]|The reasoning\.', 'pe-note'),
    (r'A common mix-up:|Common mix-up:|Mix-ups, and how to fix them:', 'pe-mix'),
    (r'If only one of you is on board:|If you’re the only one doing this:', 'pe-solo'),
]


def tag_boxes(s):
    """Give the recurring paragraph types a class, so the print edition can box them consistently."""
    def sub(m):
        attrs, label = m.group(1) or '', m.group(2)
        for pat, cls in LEAD_CLASSES:
            if re.match(pat, label):
                if 'class="' in attrs:
                    attrs = attrs.replace('class="', 'class="%s ' % cls, 1)
                else:
                    attrs += ' class="%s"' % cls
                break
        return '<p%s><strong>%s' % (attrs, label)
    return re.sub(r'<p((?:\s+[a-z-]+(?:="[^"]*")?)*)><strong>([^<]{1,60})', sub, s)


def demote(s):
    """Inside a package the chapter title is an h2, so the chapter's own headings move down one level."""
    for n in (5, 4, 3, 2):
        s = re.sub(r'<(/?)h%d\b' % n, r'<\1h%d' % (n + 1), s)
    return s


def clean_for_whole(inner, slug, deep, here=None):
    s = inner
    s = re.sub(r'<!-- book-open:start -->.*?<!-- book-open:end -->\n?', '', s, flags=re.S)
    s = drop_element(s, r'<div class="tol-listen-top')
    s = drop_element(s, r'<div class="tol-book-audio')
    s = drop_element(s, r'<div class="bt-switch')
    s = drop_element(s, r'<aside class="book-end')
    s = re.sub(r'<!-- book-(end|fig|ex):(start|end) -->', '', s)
    s = drop_element(s, r'<nav class="p3-nav')
    s = re.sub(r'<p class="depth-bar">.*?</p>', '', s, flags=re.S)
    s = re.sub(r'<div data-research-box></div>', '', s)
    s = re.sub(r'<p class="last-updated[^"]*">.*?</p>', '', s, flags=re.S)
    s = re.sub(r'<script\b.*?</script>', '', s, flags=re.S)
    s = GROWING_ASIDE.sub('', s)
    s = GROWING_CHIP.sub('', s)
    s = s.replace(' loading="lazy"', '')
    # ids must stay unique on one long page: prefix them with the chapter
    s = re.sub(r'\bid="([^"]+)"', lambda m: 'id="%s--%s"' % (slug, m.group(1)), s)
    s = re.sub(r'\bfor="([^"]+)"', lambda m: 'for="%s--%s"' % (slug, m.group(1)), s)
    s = re.sub(r'\baria-(labelledby|controls|describedby)="([^"]+)"',
               lambda m: 'aria-%s="%s"' % (m.group(1), ' '.join(slug + '--' + x for x in m.group(2).split())), s)
    s = re.sub(r'href="#([^"]+)"', lambda m: 'href="#%s--%s"' % (slug, m.group(1)), s)

    # links to other chapters stay on this page
    def inbook(m):
        target, dp, frag = m.group(1), m.group(2), m.group(3)
        if target not in (here or SLUGS) or bool(dp) != deep:
            return m.group(0)
        return 'href="#%s"' % ((target + '--' + frag[1:]) if frag else target)
    s = re.sub(r'href="/book/([a-z0-9-]+?)(-in-depth)?\.html(#[^"]*)?"', inbook, s)
    return s


PACKAGES = [
    ('whole', (1, 2, 3), 'The Whole Book', 'Every chapter, all three parts.'),
    ('for-yourself', (1, 3), 'The Book for One Person', 'Part One (yourself) and Part Three (understanding people): everything you can read and use on your own.'),
    ('together', (2,), 'The Book for Two or More', 'Part Two (between us): sharing a home, work or care with partners, family, housemates, co-parents or coworkers.'),
    ('understanding', (3,), 'Understanding People', 'Part Three on its own: how feelings, stress, trust, change, grief and love work.'),
]
COVER = {
    'whole': ('#96412B', '#F3DCD2', 'The whole book', 'All three parts: yourself, between us, and understanding people.'),
    'for-yourself': ('#3E6B4C', '#DDEEE2', 'For one person', 'Part One and Part Three: everything you can read and use on your own.'),
    'together': ('#94671F', '#F3E6C4', 'For two or more', 'Part Two: sharing a home, work or care with the people around you.'),
    'understanding': ('#2B5B8C', '#DCE8F5', 'Understanding people', 'Part Three: how feelings, stress, trust, change, grief and love work.'),
}
BLURB = {
    'whole': 'A calm, practical book about the quiet work of sharing a life. It starts with you: where your lens came from, how you work today and who you are becoming. Then it looks at what happens between people who share a home, work or care. And it ends with how people work: feelings, stress, trust, change, loss, anger, love and the groups we belong to.',
    'for-yourself': 'A book you can read on your own. Part One helps you see where your lens came from, how you work today and who you are becoming. Part Three explains how people work: feelings, stress, trust, change, loss, anger, love and the groups we belong to, so the people around you make a little more sense.',
    'together': 'A book for people who share a home, work or care: partners, family, housemates, co-parents and coworkers. Each chapter takes one idea, from the work nobody sees to a fair way to share it and a kind way to talk about it, and comes with a worksheet that puts it to use.',
    'understanding': 'How people work, in plain words: feelings, stress, how we see each other, communication, trust, change, worth, loss, minds that work differently, values, repair, helping, anger, personality, love, worry and groups. Each chapter has everyday examples, words you could use and something small to try.',
}


def pg(key):
    """A page-number slot in the print edition, filled from the last measurement (or by build_pdfs.js)."""
    v = PAGEMAP.get(key, '')
    return '<span class="pe-pg" data-pg="%s">%s</span>' % (esc(key), v)


def mark(key):
    """An invisible marker so build_pdfs.js can find which page a place lands on."""
    return '<span class="pe-mark" aria-hidden="true">zq%sqz</span>' % re.sub(r'[^a-z0-9]', 'x', key.lower())


def cover(name, deep):
    acc, tint, label, line = COVER[name]
    ver = 'Full version' if deep else 'Short version'
    return '''<section class="pe-cover pe-only" style="--acc:%s;--tint:%s">%s
<div class="pe-cover-band"><span>Spread Love &amp; Acceptance</span><span>%s</span></div>
<div class="pe-cover-text"><p class="pe-cover-title">The Objective Ledger</p>
<p class="pe-cover-sub">Understanding yourself and the people you share a life with</p></div>
<div class="pe-cover-art">%s</div>
<div class="pe-cover-foot"><p class="pe-cover-pkg">%s <span>· %s</span></p><p class="pe-cover-line">%s</p><p class="pe-cover-by">%s</p></div>
</section>''' % (acc, tint, book_art.ledger_rules(170, 240, '#E4D7B2', acc, top=22, step=7.5, left=17), 'See it fairly. Say it kindly.',
                 book_art.illustration(name), label, ver, line, AUTHOR)


def front_matter(name, deep, parts, title, who, toc_rows):
    acc = COVER[name][0]
    ver = 'the full version' if deep else 'the short version'
    other = 'full' if not deep else 'short'
    n_ch = sum(1 for e in ORDER if e[1] in parts)
    s = cover(name, deep)
    s += '''
<section class="pe-half pe-only">%s<p class="pe-half-t">The Objective Ledger</p><p class="pe-half-s">%s · %s</p></section>
<div class="pe-recto-pad pe-only" data-for="titlep"></div>
<section class="pe-titlep pe-only" style="--acc:%s">%s<div class="pe-titlep-top"><p class="pe-titlep-t">The Objective Ledger</p>
<p class="pe-titlep-s">Understanding yourself and the people you share a life with</p>
<p class="pe-titlep-v">%s · %s</p></div>
<div class="pe-titlep-art">%s</div>
<div class="pe-titlep-by"><p class="pe-titlep-a">%s</p><p class="pe-titlep-p">Spread Love &amp; Acceptance<br>spreadloveandacceptance.com</p></div></section>
<section class="pe-copy pe-only"><div class="pe-copy-in">
<p><em>The Objective Ledger</em>: %s, %s.<br>By %s. Spread Love &amp; Acceptance.</p>
<p>This edition: %s. Made from the chapters at <a href="%s/book/">spreadloveandacceptance.com/book</a>, where they are kept up to date.</p>
<p><strong>Free to read and share.</strong> You may print, copy and share this book for personal use and for non-commercial teaching, as long as you credit “The Objective Ledger, spreadloveandacceptance.com” and don’t change it or sell it.</p>
<p><strong>Not therapy.</strong> This book is general education about people and relationships. It is not a diagnosis, treatment or a replacement for help from a doctor, counsellor or other trained professional, and it can’t know your situation.</p>
<p><strong>If you are not safe.</strong> If you feel afraid of someone you live with, or someone controls your money, phone or movements, that is not a problem to fix with a worksheet. <a href="%s/safety.html">spreadloveandacceptance.com/safety</a> lists free, private help. If you are in danger now, call your local emergency number.</p>
<p><strong>The examples are made up.</strong> The people in the scenes and examples are invented, built from common patterns. None of them is a real person or a testimonial.</p>
<p>Research mentioned in the chapters is listed, with links, in the research notes at the back and at <a href="%s/research.html">spreadloveandacceptance.com/research</a>.</p>
<p>Set in Lora, Fraunces and IBM Plex Mono.</p>
</div></section>''' % (mark('half'), esc(COVER[name][2][0].upper() + COVER[name][2][1:]), 'Full version' if deep else 'Short version', acc, mark('titlep'), esc(COVER[name][2][0].upper() + COVER[name][2][1:]), 'Full version' if deep else 'Short version',
                       book_art.illustration(name), AUTHOR, esc(COVER[name][2]), ver, AUTHOR, UPDATED, SITE, SITE, SITE)
    # how to use this book
    parts_li = ''.join('<li style="--pc:%s"><strong>%s: %s.</strong> %s</li>' % (PCOL[p][0], PARTS[p][0], PARTS[p][1], esc(PARTS[p][2])) for p in parts)
    s += '''
<section class="pe-how pe-only" id="how">%s<h1>How to use this book</h1>
<p class="pe-how-lede">%s This copy holds %d chapters in %s, in %s. There is no wrong way in.</p>
<div class="pe-how-grid">
<div><p class="pe-how-h">The parts</p><ul class="pe-how-parts">%s</ul></div>
<div><p class="pe-how-h">Two sizes of every chapter</p><p>Every chapter comes in a short version (about 10 to 15 minutes) and a full version with the research, more examples and more to try. This is %s. The %s version is free at spreadloveandacceptance.com/book.</p></div>
<div><p class="pe-how-h">Read in order, or by need</p><p>Read it front to back like any book, or start with the chapter that fits what is going on. Each chapter ends with <em>What to remember</em>, <em>This connects to</em> (the chapters that explain it or put it to use, with page numbers) and <em>Put it to use</em>, with codes you can scan for the matching tool.</p></div>
<div><p class="pe-how-h">In every chapter</p><ul class="pe-how-keys"><li><span class="pe-key pe-key-scene"></span><span>A short scene: a made-up moment from everyday life.</span></li><li><span class="pe-key pe-key-words"></span><span><strong>Words you could use</strong>: sentences to say out loud.</span></li><li><span class="pe-key pe-key-try"></span><span><strong>Try this</strong>: one small thing to do this week.</span></li><li><span class="pe-key pe-key-mix"></span><span><strong>Common mix-ups</strong>: easy mistakes, and what is closer to true.</span></li></ul></div>
<div><p class="pe-how-h">The site, the program and Professor Puddles</p><p>The book has a free website with the tools and worksheets the chapters mention. Nothing you type there leaves your device, and there is no account. The <strong>six-week program</strong> (spreadloveandacceptance.com/prog-01) puts Part Two to work a week at a time, and the <strong>self path</strong> does the same for Part One. <strong>Professor Puddles</strong>, the site’s friendly guide, answers questions about the book’s ideas.</p></div>
<div><p class="pe-how-h">Go gently</p><p>Some chapters touch hard things: grief, shame, anger, worry, trauma. Skip anything that isn’t right for today. Nothing here is a test, and nothing needs to be done all at once.</p></div>
</div></section>''' % (mark('how'), 'This is a book about seeing what is really going on, in yourself and between people, without blaming anyone, and then changing one small thing.',
                       n_ch, 'one part' if len(parts) == 1 else '%s parts' % ('two' if len(parts) == 2 else 'three'), ver, parts_li, ver, other)
    front = [f for f in FIGS if f['chapter'] == 'front']
    if front:
        s += '\n<section class="pe-glance pe-only" id="glance">%s<h1>The book in two pictures</h1><div class="pe-glance-figs">%s</div></section>' % (
            mark('glance'), ''.join(fig_html(f, False) for f in front))
    s += '\n<nav class="pe-toc pe-only" aria-label="Contents">%s<h1>Contents</h1><ol class="pe-toc-list">%s</ol></nav>' % (mark('contents'), ''.join(toc_rows))
    return s


def toc_row(key, label, title, cls='', sub=''):
    return '<li class="pe-toc-row %s"><a href="#%s"><span class="pe-toc-l">%s</span><span class="pe-toc-t">%s%s</span><span class="pe-toc-dots"></span>%s</a></li>' % (
        cls, key, label, title, ('<span class="pe-toc-s">%s</span>' % sub) if sub else '', pg(key))


def part_opener(part, deep, here):
    name, sub, blurb = PARTS[part]
    col, tint = PCOL[part]
    rows = ''.join('<li><a href="#%s"><span>%s</span> <b class="pe-only">%s</b><b class="no-print">%s</b></a>%s</li>' % (e[0], esc(e[2]), esc(SHORT[e[0]]), esc(TITLES[e[0]]), pg(e[0]))
                   for e in ORDER if e[1] == part and e[0] in here)
    return '''<div class="pe-recto-pad pe-only" data-for="part-%d"></div>
<section class="pe-part no-bubble no-cheer no-dive" data-no-bubble id="part-%d" data-part="%d" style="--pc:%s;--pt:%s">%s%s
<div class="pe-part-in"><p class="pe-part-k">%s</p><h1 class="pe-part-h">%s</h1><p class="pe-part-b">%s</p>
<div class="pe-part-art">%s</div>
<p class="pe-part-l">In this part</p><ol class="pe-part-list">%s</ol></div></section>''' % (
        part, part, part, col, tint, mark('part-%d' % part), book_art.ledger_rules(170, 240, '#E9DFC4', col, top=20, step=7.5, left=24),
        name, sub, esc(blurb), book_art.part_mark(part), rows)


def chapter_open(e, deep):
    hs = headings(e[0], deep)
    lis = ''.join('<li>%s</li>' % ('<a href="#%s--%s">%s</a>' % (e[0], i, esc(t)) if i else esc(t)) for i, t in hs)
    part = e[1]
    kicker = chapter_name(e) if part != 4 else 'Afterword'
    return '''<header class="ch-open no-bubble no-cheer no-dive" data-no-bubble data-part="%d">%s<p class="ch-num" aria-hidden="true">%s</p><p class="ch-kicker">%s</p>
<h2 class="ch-title">%s</h2><p class="ch-intro">%s</p>
<div class="ch-in"><p class="ch-in-k">In this chapter</p><ol class="ch-in-list">%s</ol></div></header>''' % (
        part, mark(e[0]), esc(big_label(e)), esc(kicker), esc(TITLES[e[0]]), LEDES[e[0]], lis)


def qr_slot(url):
    return '<span class="pe-qr" data-qr="%s" role="img" aria-label="QR code for %s"></span>' % (esc(absolute(url)), esc(pretty_url(url)))


def chapter_end(e, deep, here):
    s = '<aside class="pe-end no-bubble no-cheer no-dive" data-no-bubble data-part="%d" aria-label="End of chapter">' % e[1]
    s += '<div class="pe-end-rem"><h3 class="pe-end-k">What to remember</h3>%s</div>' % remember_html(e[0], 'pe-end-list')
    links = CONNECT.get(e[0], [])
    if links:
        s += '<div class="pe-end-links"><h3 class="pe-end-k">This connects to</h3><ul class="pe-end-conn">'
        for tgt, w in links:
            te = entry(tgt)
            if tgt in here:
                where = '<a href="#%s">page %s</a>' % (tgt, pg(tgt))
                lab = '<a href="#%s">%s</a>' % (tgt, esc(chapter_name(te)))
            else:
                where = '<a href="%s">read online</a>' % absolute(href(tgt, deep))
                lab = '<a href="%s">%s</a>' % (absolute(href(tgt, deep)), esc(chapter_name(te)))
            s += '<li><span class="pe-conn-l">%s · %s</span><span class="pe-conn-w">%s</span><span class="pe-conn-p">%s</span></li>' % (
                lab, esc(SHORT[tgt]), esc(w[0].upper() + w[1:]), where)
        s += '</ul></div>'
    s += '<div class="pe-end-use"><h3 class="pe-end-k">Put it to use</h3><ul class="pe-use">'
    for t, u, d in uses(e[0]):
        s += '<li>%s<span class="pe-use-t"><a href="%s">%s</a>%s<span class="pe-use-u">%s</span></span></li>' % (
            qr_slot(u), absolute(u), esc(t), ('<span class="pe-use-d">%s</span>' % esc(d)) if d else '', addr_html(short_address(u)))
    s += '</ul></div></aside>'
    return s


# Words that only make sense on the website, as the book says them (the packages, on screen and on paper).
PRINT_SWAPS = [
    ('Tools and reading on this site', 'Tools and reading on the website'),
    ('This site’s idea', 'This book’s idea'), ('this site’s idea', 'this book’s idea'),
    ('this site’s own', 'this book’s own'), ('This site uses', 'This book uses'), ('this site uses', 'this book uses'),
    ('runs through this site', 'runs through this book'),
    ('Research notes on this page', 'Research notes in this chapter'),
    ('The cards above say', 'The sections above say'), ('read one card and stop', 'read one section and stop'),
    ('more than anything on this page', 'more than anything in this book'),
    ('You close the book, or the tab.', 'You close the book.'),
    ('The research behind this site', 'The research behind this book'),
    ('Help beyond this site', 'Help beyond this book'),
    ('All chapters in the book’s contents', 'All chapters in the contents'),
]
# site pages that the book itself covers in print, so they need no address
NO_ADDRESS = re.compile(r'^/(?:research\.html|five-pillars\.html|glossary\.html)(?:[#?]|$)')
XREFS = set()


def short_address(url):
    """spreadloveandacceptance.com/friends for /friends.html#gone-quiet; the bare domain for other sites."""
    if url.startswith('/'):
        path = re.sub(r'[#?].*$', '', url)
        path = re.sub(r'(?:/index)?\.html$', '', path)
        return 'spreadloveandacceptance.com' + (path if path != '/' else '')
    m = re.match(r'https?://(?:www\.)?([^/#?]+)', url)
    return m.group(1) if m else ''


def addr_html(addr):
    """An address that may wrap after a slash but never at its own hyphens."""
    return '/<wbr>'.join('<span class="pe-nb">%s</span>' % esc(x) for x in addr.split('/'))


def print_links(body, slug, here):
    """On paper a link goes nowhere. Links to another chapter in this book get a page number; links to a site
    page get a short address the first time they appear in a chapter; rows that are only links (the arrow
    rows, "From the library") and web-only notes are left off the printed page."""
    for a, b in PRINT_SWAPS:
        body = body.replace(a, b)
    # rows of arrow links and library link rows: screen only
    body = re.sub(r'<p>((?:\s*<a [^>]*>[^<]*(?:&rarr;|→)\s*</a>)+\s*)</p>', r'<p class="pe-noprint">\1</p>', body)
    body = re.sub(r'<li>(\s*From the library:)', r'<li class="pe-noprint">\1', body)
    body = re.sub(r'(\s*<a href="[^"]*/library/[^"]*">More in the Library</a>\.)', r'<span class="pe-noprint">\1</span>', body)
    seen = set()

    def sub(m):
        attrs, text = m.group(1), m.group(2)
        hm = re.search(r'\bhref="([^"]+)"', attrs)
        if not hm or 'data-u=' in attrs or 'class="dig' in attrs or 'book-fig-zoom' in attrs:
            return m.group(0)
        h = html.unescape(hm.group(1))
        if h.startswith('#'):
            tgt = h[1:]
            ch = tgt.split('--')[0]
            if ch == slug or ch not in here:
                return m.group(0)
            if '--' in tgt:
                key = 'a-' + tgt
                XREFS.add(tgt)
            else:
                key = tgt
            return m.group(0) + '<span class="pe-only pe-xref"> (page %s)</span>' % pg(key)
        if h.startswith('/') and (NO_ADDRESS.match(h) or h.startswith('/assets/')):
            return m.group(0)
        if not (h.startswith('/') or h.startswith('http')):
            return m.group(0)
        addr = short_address(h)
        plain = strip_tags(text).strip().lower()
        if not addr or addr in seen or addr.lower() in plain or plain.startswith('spreadloveandacceptance.com'):
            return m.group(0)
        seen.add(addr)
        return m.group(0) + '<span class="pe-only pe-u"> (%s)</span>' % addr_html(addr)
    return re.sub(r'<a\b([^>]*)>(.*?)</a>', sub, body, flags=re.S)


def package_chapter(e, deep, here):
    src = PAGES[(e[0], deep)]
    body = clean_for_whole(main_inner(src), e[0], deep, here)
    body = drop_element(body, r'<header class="read-head', 'header')
    body = re.sub(r'<p class="simple-lede">.*?</p>', '', body, count=1, flags=re.S)
    body = print_links(body, e[0], here)
    body = tag_boxes(demote(body))
    col, tint = PCOL[e[1]]
    return '<article class="whole-ch pe-ch" id="%s" data-part="%d" style="--pc:%s;--pt:%s">%s\n<div class="pe-body">%s</div>\n%s<p class="whole-top no-print"><a href="#contents">Contents</a> · <a href="%s">Open this chapter on its own page</a></p></article>' % (
        e[0], e[1], col, tint, chapter_open(e, deep), body, chapter_end(e, deep, here), href(e[0], deep))


# ---- back matter ----
def glossary_terms(text):
    s = read(os.path.join(ROOT, 'glossary.html'))
    out = []
    for gid, also, body in re.findall(r'<article class="gl-term" id="([^"]+)"(?: data-also="([^"]*)")?>(.*?)</article>', s, re.S):
        if gid in GLOSS_SKIP:
            continue
        name = re.sub(r'^[^\w(“]+', '', strip_tags(re.search(r'<h3>(.*?)</h3>', body, re.S).group(1)).strip()).strip()
        d = re.search(r'<p class="gl-def">(.*?)</p>', body, re.S)
        ex = re.search(r'<p class="gl-ex">(.*?)</p>', body, re.S)
        words_ = [name.split(' (')[0]] + [a.strip() for a in (also or '').split(',') if len(a.strip()) > 3]
        hits = sum(len(re.findall(r'\b%s\b' % re.escape(w), text, re.I)) for w in words_[:4])
        if hits >= 2:
            out.append((gid, name, gloss_plain(d.group(1)) if d else '',
                        gloss_plain(re.sub(r'</?a\b[^>]*>', '', ex.group(1))) if ex else '', words_[0]))
    out.sort(key=lambda x: x[1].lower())
    return out


# The book uses the worksheets' plain names, never their WP-NN codes (the site glossary keeps the codes).
GLOSS_PLAIN = [
    ('WP-01 is a week’s log of who did what.', 'Who did what is a one-week log of the jobs each person did.'),
    ('a higher WP-02 score', 'a higher score there'),
]


def gloss_plain(s):
    for a, b in GLOSS_PLAIN:
        s = s.replace(a, b)
    return re.sub(r' \(WP-\d+\)', '', s)


def research_notes(here):
    refs = []
    for f in sorted(glob.glob(os.path.join(ROOT, 'tools', 'research', 'refs-*.json'))):
        try:
            refs += json.load(open(f, encoding='utf-8'))
        except Exception:
            pass
    by = {}
    for r in refs:
        if not r.get('verified'):
            continue
        chs = []
        for m in r.get('mentioned_on', []):
            mm = re.match(r'/book/([a-z0-9-]+?)(?:-in-depth)?\.html', m)
            if mm and mm.group(1) in here and mm.group(1) not in chs:
                chs.append(mm.group(1))
        for c in chs:
            by.setdefault(c, {})[r['id']] = r
    return by


def ref_html(r):
    au = esc(r.get('authors', ''))
    yr = r.get('year', '')
    t = esc(r.get('title', ''))
    url = r.get('url') or (('https://doi.org/' + r['doi']) if r.get('doi') else '')
    link = (' <a class="pe-ref-u" href="%s">%s</a>' % (esc(url), esc(re.sub(r'^https?://(www\.)?', '', url).rstrip('/')))) if url else ''
    return '<li><span class="pe-ref-a">%s (%s).</span> <span class="pe-ref-t">%s.</span> <span class="pe-ref-f">%s</span>%s</li>' % (
        au, yr, t, esc(r.get('finding', '')), link)


EX_WRAP_RE = re.compile(r'(<div class="book-ex-wrap[^"]*" data-ex-n=")\d+(" data-ex-title="[^"]*">\s*<figure class="bk-ex[^"]*"[^>]*\bid="([^"]+)".*?<span class="bk-ex-k">)Filled-in example[^<]*(</span>)', re.S)
FIG_RE = re.compile(r'(<figure class="book-fig[^"]*" id="([^"]+)".*?<span class="book-fig-n">Figure )[^<]*(</span>)', re.S)


def finish_package(body):
    """Number the figures and the filled-in examples of one book from 1, in page order, print the example's
    number on its tab, and put a page marker at every place a cross-reference points to."""
    figs, exs = [], []
    byid = {f['id']: f for f in FIGS}
    exid = {x['id']: x for x in EXS}

    def fsub(m):
        fid = m.group(2)
        figs.append((fid, len(figs) + 1, byid.get(fid.split('--', 1)[-1])))
        return '%s%d%s' % (m.group(1), len(figs), m.group(3))
    body = FIG_RE.sub(fsub, body)

    def xsub(m):
        xid = m.group(3)
        x = exid.get(xid.split('--', 1)[-1])
        exs.append((xid, len(exs) + 1, x))
        return '%s%d%sFilled-in example %d%s' % (m.group(1), len(exs), m.group(2), len(exs), m.group(4))
    body = EX_WRAP_RE.sub(xsub, body)
    for t in XREFS:
        body = re.sub(r'(<[a-zA-Z][^>]*\bid="%s"[^>]*>)' % re.escape(t), lambda m: m.group(1) + mark('a-' + t), body, count=1)
    return body, figs, exs


def back_matter(name, deep, here, gloss, notes, figs, exs):
    col = PCOL[4][0]
    s = ''
    # glossary
    s += '<section class="pe-back pe-gloss no-bubble no-cheer no-dive" data-no-bubble id="glossary" style="--pc:%s;--pt:%s">%s<h1 class="pe-back-h">Words used in this book</h1>' % (col, PCOL[4][1], mark('glossary'))
    s += '<p class="pe-back-lede">The book’s own words, each in one plain sentence. More at spreadloveandacceptance.com/glossary.</p><dl class="pe-gloss-list">'
    for gid, nm, d, ex, _w in gloss:
        s += '<div class="pe-gl"><dt id="gl-%s">%s</dt><dd>%s%s</dd></div>' % (gid, esc(nm), d, (' <span class="pe-gl-ex">%s</span>' % ex) if ex else '')
    s += '</dl></section>'
    # list of figures and filled-in examples
    # figs and exs are (anchor id, number, manifest entry), in page order (from finish_package)
    if figs:
        s += '<section class="pe-back pe-lof no-bubble no-cheer no-dive" data-no-bubble id="figures" style="--pc:%s">%s<h1 class="pe-back-h">List of figures</h1><ol class="pe-lof-list">' % (col, mark('figures'))
        for aid, n, f in figs:
            f = f or {}
            cap = strip_tags(f.get('caption', '')).strip()
            cap = cap.split(': ')[0] if ': ' in cap[:70] else re.split(r'(?<=[.!?])\s', cap)[0]
            ch = f.get('chapter') or aid.split('--')[0]
            s += '<li><a href="#%s"><span class="pe-lof-n">Figure %d</span><span class="pe-lof-t">%s <em>· %s</em></span><span class="pe-toc-dots"></span>%s</a></li>' % (
                aid, n, esc(cap.rstrip('.')), 'Front of the book' if ch == 'front' else esc(SHORT.get(ch, '')), pg('fig-%d' % n))
        s += '</ol></section>'
    if exs:
        s += '<section class="pe-back pe-lof no-bubble no-cheer no-dive" data-no-bubble id="examples" style="--pc:%s">%s<h1 class="pe-back-h">List of filled-in examples</h1><ol class="pe-lof-list">' % (col, mark('examples'))
        for aid, n, x in exs:
            x = x or {}
            ch = x.get('chapter') or aid.split('--')[0]
            s += '<li><a href="#%s"><span class="pe-lof-n">Example %d</span><span class="pe-lof-t">%s <em>· %s</em></span><span class="pe-toc-dots"></span>%s</a></li>' % (
                aid, n, esc(x.get('title', '')), esc(' · '.join(v for v in (x.get('who'), SHORT.get(ch)) if v)), pg('ex-%d' % n))
        s += '</ol></section>'
    # research notes
    n_refs = sum(len(v) for v in notes.values())
    s += '<section class="pe-back pe-notes no-bubble no-cheer no-dive" data-no-bubble id="notes" style="--pc:%s">%s<h1 class="pe-back-h">Research notes</h1>' % (col, mark('notes'))
    s += '<p class="pe-back-lede">The %d studies and books the chapters mention, chapter by chapter, each with what it found in plain words and where to read it. Every entry was checked against the original source. The full list, with notes on how strong each finding is, is at spreadloveandacceptance.com/research.</p>' % n_refs
    for e in ORDER:
        if e[0] not in notes:
            continue
        rs = sorted(notes[e[0]].values(), key=lambda r: (r.get('authors', '').lower(), str(r.get('year', ''))))
        s += '<h2 class="pe-notes-h"><span>%s</span> %s</h2><ul class="pe-refs">%s</ul>' % (esc(chapter_name(e)), esc(SHORT[e[0]]), ''.join(ref_html(r) for r in rs))
    s += '</section>'
    # index (print only: it is all page numbers)
    s += '<section class="pe-back pe-index pe-only" id="index" style="--pc:%s">%s<h1 class="pe-back-h">Index</h1><p class="pe-back-lede">Key ideas and the pages where the book talks about them. Chapter names are in the contents.</p><ul class="pe-ix">' % (col, mark('index'))
    terms = {}
    for lab, rx in INDEX_TERMS:
        terms[lab.lower()] = (lab, rx)
    for gid, nm, d, ex, w in gloss:
        k = nm.lower()
        lab = nm if re.search(r'[A-Z]', nm[1:]) else nm[0].lower() + nm[1:]
        if k not in terms and not any(k.startswith(t.split(',')[0]) for t in terms):
            terms[k] = (lab, re.escape(w))
    for k in sorted(terms, key=lambda x: x.lstrip('“').lower()):
        lab, rx = terms[k]
        key = 'ix-' + re.sub(r'[^a-z0-9]+', '-', lab.lower()).strip('-')
        s += '<li data-ix="%s" data-ix-re="%s"><span class="pe-ix-t">%s</span> %s</li>' % (key, esc(rx), esc(lab), '<span class="pe-ixp" data-ixp="%s">%s</span>' % (key, PAGEMAP.get(key, '')))
    s += '</ul></section>'
    # back cover
    acc, tint = COVER[name][0], COVER[name][1]
    s += '''<section class="pe-backcover pe-only" style="--acc:%s;--tint:%s">%s<div class="pe-bc-in">
<p class="pe-bc-k">The Objective Ledger · %s</p><p class="pe-bc-blurb">%s</p>
<p class="pe-bc-q">“See it fairly. Say it kindly.”</p>
<ul class="pe-bc-list"><li>Two sizes of every chapter: short and full</li><li>Everyday scenes, words you could use and one small thing to try</li><li>Free tools and worksheets that stay on your device</li><li>For every kind of relationship, and for people on their own</li></ul>
<div class="pe-bc-art">%s</div>
<p class="pe-bc-site">Free to read at <strong>spreadloveandacceptance.com/book</strong></p>
<p class="pe-bc-by">%s · Spread Love &amp; Acceptance</p></div></section>''' % (
        acc, tint, book_art.ledger_rules(170, 240, '#E4D7B2', acc, top=22, step=7.5, left=17), esc(COVER[name][2]), esc(BLURB[name]),
        book_art.part_mark(4), AUTHOR)
    return s


def page_rules(here, deep):
    """Named pages for the print edition, set for a bound book: on a right-hand page (odd numbers) the page
    number and the part's thumb tab sit on the right edge and the running head names the chapter; on a
    left-hand page (even numbers) they sit on the left edge and the running head names the part and chapter.
    The inner margin is the wider one (the gutter)."""
    pos = {1: 'top', 2: 'middle', 3: 'bottom', 4: 'bottom'}
    q = lambda t: '"%s"' % t.replace('\\', '').replace('"', '\\"')
    edge = 'vertical-align:top;padding-top:3mm;border-top:.4pt solid #CDBF98;white-space:nowrap;'
    head = 'font-family:"Lora",Georgia,serif;font-style:italic;font-size:7.4pt;color:#6E6556;' + edge
    num = 'content:counter(page);font-family:"Fraunces",Georgia,serif;font-weight:500;font-size:8.6pt;color:#2B2620;' + edge

    def rules(nm, recto, verso, part):
        col = PCOL[part][0]
        tab_r = ''.join('@right-%s{content:"";%s}' % (b, ('border-right:3mm solid %s;height:52mm' % col) if b == pos[part] else '') for b in ('top', 'middle', 'bottom'))
        tab_l = ''.join('@left-%s{content:"";%s}' % (b, ('border-left:3mm solid %s;height:52mm' % col) if b == pos[part] else '') for b in ('top', 'middle', 'bottom'))
        return ('@page %s:right{@bottom-left{content:%s;%s}@bottom-center{content:"";%s}@bottom-right{%stext-align:right}%s}'
                '@page %s:left{@bottom-left{%stext-align:left}@bottom-center{content:"";%s}@bottom-right{content:%s;%stext-align:right}%s}') % (
            nm, q(recto), head, edge, num, tab_r, nm, num, edge, q(verso), head, tab_l)
    r = []
    for e in ORDER:
        if e[0] not in here:
            continue
        nm = 'pc-' + e[0]
        r.append('#%s{page:%s}' % (e[0], nm))
        r.append(rules(nm, SHORT[e[0]], 'The Objective Ledger · ' + chapter_name(e), e[1]))
    for sec, label in (('glossary', 'Words used in this book'), ('figures', 'List of figures'), ('examples', 'List of filled-in examples'),
                       ('notes', 'Research notes'), ('index', 'Index')):
        nm = 'pb-' + sec
        r.append('#%s{page:%s}' % (sec, nm))
        r.append(rules(nm, label, 'The Objective Ledger · At the back of the book', 4))
    return '<style media="print">%s</style>' % '\n'.join(r)


def build_whole(deep, name='whole', parts=(1, 2, 3), title=None, who=''):
    here = set(e[0] for e in ORDER if e[1] in parts)
    if name == 'whole':
        here.add('afterword')
    figs = [f for f in FIGS if (f['chapter'] in here or f['chapter'] == 'front') and ('full' if deep else 'short') in (f.get('versions') or ['short', 'full'])]
    exs = [x for x in EXS if x['chapter'] in here and ex_where(x, deep) and ('full' if deep else 'short') in (x.get('versions') or ['short', 'full'])]
    parts_html, toc, ptoc = [], [], []
    ptoc.append(toc_row('how', '', 'How to use this book', 'is-front'))
    if any(f['chapter'] == 'front' for f in FIGS):
        ptoc.append(toc_row('glance', '', 'The book in two pictures', 'is-front'))
    for part in parts:
        pname, sub, _ = PARTS[part]
        toc.append('<li><strong>%s: %s</strong><ol>' % (pname, sub))
        ptoc.append(toc_row('part-%d' % part, pname, sub, 'is-part', '') .replace('class="pe-toc-row is-part', 'style="--pc:%s" class="pe-toc-row is-part' % PCOL[part][0]))
        parts_html.append(part_opener(part, deep, here))
        for e in [x for x in ORDER if x[1] == part]:
            toc.append('<li><a href="#%s">%s: %s</a></li>' % (e[0], esc(chapter_name(e)), esc(TITLES[e[0]])))
            ptoc.append(toc_row(e[0], esc(big_label(e)), esc(TITLES[e[0]]), 'is-ch'))
            parts_html.append(package_chapter(e, deep, here))
        toc.append('</ol></li>')
    if 'afterword' in here:
        e = entry('afterword')
        toc.append('<li><a href="#afterword"><strong>Afterword</strong>: %s</a></li>' % esc(TITLES['afterword']))
        ptoc.append(toc_row('afterword', 'Afterword', esc(TITLES['afterword']), 'is-back'))
        parts_html.append(package_chapter(e, deep, here))
    text = ' '.join(strip_tags(main_inner(PAGES[(s_, deep)])) for s_ in here)
    gloss = glossary_terms(text)
    notes = research_notes(here)
    toc.append('<li><a href="#glossary">Words used in this book</a></li>')
    ptoc.append(toc_row('glossary', '', 'Words used in this book', 'is-back'))
    if figs:
        toc.append('<li><a href="#figures">List of figures</a></li>')
        ptoc.append(toc_row('figures', '', 'List of figures', 'is-back'))
    if exs:
        toc.append('<li><a href="#examples">List of filled-in examples</a></li>')
        ptoc.append(toc_row('examples', '', 'List of filled-in examples', 'is-back'))
    toc.append('<li><a href="#notes">Research notes</a></li>')
    ptoc.append(toc_row('notes', '', 'Research notes', 'is-back'))
    ptoc.append(toc_row('index', '', 'Index', 'is-back'))
    front_html = front_matter(name, deep, parts, title or 'The Whole Book', who, ptoc)
    both, figs, exs = finish_package(front_html + '\n<!--pe-split-->\n' + '\n'.join(parts_html))
    front_html, body_html = both.split('\n<!--pe-split-->\n', 1)
    # the PDF's bookmarks: [title, page key, level]
    ol = [['How to use this book', 'how', 0]]
    if any(f['chapter'] == 'front' for f in FIGS):
        ol.append(['The book in two pictures', 'glance', 0])
    ol.append(['Contents', 'contents', 0])
    for part in parts:
        ol.append(['%s: %s' % PARTS[part][:2], 'part-%d' % part, 0])
        for e in [x for x in ORDER if x[1] == part]:
            ol.append(['%s · %s' % (e[2], TITLES[e[0]]), e[0], 1])
    if 'afterword' in here:
        ol.append(['Afterword: %s' % TITLES['afterword'], 'afterword', 0])
    ol.append(['Words used in this book', 'glossary', 0])
    if figs:
        ol.append(['List of figures', 'figures', 0])
    if exs:
        ol.append(['List of filled-in examples', 'examples', 0])
    ol += [['Research notes', 'notes', 0], ['Index', 'index', 0]]
    outline_json = '<script type="application/json" id="pe-outline">%s</script>' % json.dumps(
        {'outline': ol, 'title': 'The Objective Ledger: %s (%s)' % (COVER[name][2][0].upper() + COVER[name][2][1:], 'full version' if deep else 'short version'),
         'author': AUTHOR, 'subject': COVER[name][3]}, ensure_ascii=False).replace('</', '<\\/')
    fname = name + ('-in-depth' if deep else '')
    other = '/book/%s.html' % (name if deep else name + '-in-depth')
    base = title or 'The Whole Book'
    title = base + (' on One Page' if name == 'whole' else '') + (' (Full Version)' if deep else '')
    lede = ('%s<em>The Objective Ledger</em>, in order, on one page%s. Read straight through, use your browser’s find, or print it.'
            % ((esc(who) + ' From ') if who else 'Every chapter of ', ', in the full versions' if deep else ', in the short versions'))
    head = HEAD_TMPL.replace('{TITLE}', title).replace('{DESC}', 'The book on one page.')
    # on screen the site's styles; on paper only the book's print stylesheet
    head = head.replace('<link rel="stylesheet" href="/assets/css/site.css">', '<link rel="stylesheet" href="/assets/css/site.css" media="screen">')
    head = head.replace('<link rel="stylesheet" href="/assets/css/reading.css">', '<link rel="stylesheet" href="/assets/css/reading.css" media="screen">\n<link rel="stylesheet" href="/assets/css/book-print.css" media="print">')
    if EXS:
        head = head.replace('</head>', EX_CSS + '\n</head>')
    page = head
    page += '''<body data-no-offer data-no-learnplay data-no-pillars data-no-cheer data-no-buddies data-no-pupvisits data-no-brain-break data-no-clip data-no-pudcards data-no-dives data-no-reading data-no-line-share class="whole-book pe-book" data-pe="%s">
<main class="read whole" id="main">
%s
<header class="read-head no-print"><p class="read-code">The book</p><h1>%s</h1></header>
<p class="simple-lede no-print">%s</p>
<p class="whole-actions no-print no-bubble"><a class="tol-btn" href="/book/download.html#%s">Download the PDF</a> <button type="button" class="tol-btn is-quiet" onclick="window.print()">Print</button> <a class="tol-btn is-quiet" href="%s">%s</a> <a class="tol-btn is-quiet" href="/book/">The book’s home</a></p>
<p class="whole-note no-print">About %d minutes of reading in all. Your browser keeps your place if you come back to this page.</p>
<nav class="whole-toc no-bubble no-print" id="contents" aria-label="Contents"><h2>Contents</h2><ol>%s</ol></nav>
%s
%s
<p class="last-updated no-bubble no-print">Last updated: %s. From spreadloveandacceptance.com. Free to read and share for personal and non-commercial teaching use, with credit.</p>
</main>
%s
%s
<script>
// the print edition's QR codes ("Put it to use"), drawn on this device by the site's own encoder
function peQR(){ if (!window.TOLShareKit || !TOLShareKit.qr) return false; document.querySelectorAll('.pe-qr[data-qr]').forEach(function (el) { if (el.firstChild) return; var s = TOLShareKit.qr.svg(el.getAttribute('data-qr')); if (s) { s.removeAttribute('class'); s.setAttribute('aria-hidden', 'true'); el.appendChild(s); } }); return true; }
window.addEventListener('beforeprint', peQR);
window.addEventListener('load', function () { var n = 0; (function t() { if (!peQR() && ++n < 20) setTimeout(t, 300); })(); });
// /book/whole.html?print=1 opens the print dialog once the page has loaded
if (/[?&]print=1\\b/.test(location.search)) window.addEventListener('load', function () { setTimeout(function () { peQR(); window.print(); }, 600); });
</script>
</body>
</html>
''' % (fname, front_html, title.replace(' (Full Version)', ': the full version'), lede, name, other,
       'Switch to the short versions' if deep else 'Switch to the full versions',
       round(sum(WORDS[(s_, deep)] for s_ in here) / 220 / 5) * 5,
       ''.join(toc), body_html, back_matter(name, deep, here, gloss, notes, figs, exs), UPDATED, page_rules(here, deep), outline_json)
    write(os.path.join(BOOK, fname + '.html'), page)


# ---------- 3b. the PDF downloads (made by tools/book/build_pdfs.js, which writes book/pdf/manifest.json) ----------
def build_download():
    cards = []
    for name, parts, title, who in PACKAGES:
        rows = []
        for deep in (False, True):
            fname = name + ('-in-depth' if deep else '')
            m = MANIFEST.get(fname, {})
            meta = ''
            if m:
                meta = '%d pages · %.1f MB' % (m.get('pages', 0), m.get('bytes', 0) / 1048576.0)
            rows.append('<li><a class="bk-dl-file" href="/book/pdf/%s.pdf" data-dl="%s" download><span class="bk-dl-v">%s</span><span class="bk-dl-m">%s</span></a> <a class="bk-dl-read" href="/book/%s.html">read it here</a></li>' % (
                fname, fname, 'Full version' if deep else 'Short version', meta, fname))
        # the whole book also has the afterword, which is not a chapter (the book's home says "26 chapters ... and an afterword")
        chs = '%d chapters%s' % (sum(1 for e in ORDER if e[1] in parts), ' and an afterword' if name == 'whole' else '')
        acc, tint = COVER[name][0], COVER[name][1]
        cards.append('<section class="bk-dl-card" id="%s" style="--acc:%s;--tint:%s"><div class="bk-dl-cover" aria-hidden="true"><span class="bk-dl-cover-t">The Objective Ledger</span>%s<span class="bk-dl-cover-p">%s</span></div><div class="bk-dl-body"><h2>%s</h2><p>%s %s.</p><ul class="bk-dl-list">%s</ul></div></section>' % (
            name, acc, tint, book_art.illustration(name), esc(COVER[name][2]), esc(title), esc(who), chs, ''.join(rows)))
    page = HEAD_TMPL.replace('{TITLE}', 'Download the Book as a PDF').replace('{DESC}', 'Download the book as a PDF.')
    page += '''<body data-no-offer data-no-learnplay data-no-pillars data-no-cheer data-no-pupvisits data-no-brain-break data-no-clip>
<main class="read bk-home bk-dl" id="main">
<header class="read-head"><p class="read-code">The book</p><h1>Download the book as a PDF</h1></header>
<p class="simple-lede">Keep the book on your phone, tablet or computer, or print it. Pick the whole book or a smaller book that fits you, in the short or the full version. Each one is a designed book: a cover, contents with page numbers, part and chapter openers, “What to remember” and “This connects to” at the end of every chapter, a glossary, research notes and an index.</p>
<div class="bk-dl-gate no-bubble" data-no-bubble id="get">
<h2>Your email, then your download</h2>
<p>To download a PDF, enter your email address. It goes to Buttondown, our email service, so we can send you a short note when something new is added to the book or the site. You can unsubscribe from any email in one tap. Reading the book here on the site never needs an email.</p>
<form class="bk-dl-form" novalidate>
<label for="bk-dl-email">Email address</label>
<div class="bk-dl-row"><input type="email" id="bk-dl-email" name="email" autocomplete="email" placeholder="name@example.com" required><button type="submit" class="tol-btn">Unlock the downloads</button></div>
<p class="bk-dl-msg" role="status" aria-live="polite"></p>
</form>
<p class="bk-dl-small">This device remembers that you unlocked the downloads (not your address), so you won’t be asked again here. <a href="/legal/privacy-policy.html">Privacy policy</a>.</p>
</div>
<div class="bk-dl-cards no-bubble" data-no-bubble>
%s
</div>
<p>Prefer to read online? <a href="/book/">The book’s home</a> has every chapter, free, with no email.</p>
<p class="last-updated no-bubble">Last updated: %s</p>
</main>
<script src="/assets/js/book-download.js" defer></script>
</body>
</html>
''' % ('\n'.join(cards), UPDATED)
    write(os.path.join(BOOK, 'download.html'), page)


# ---------- 4. the book's home ----------
def build_home():
    rows = []
    for part in (1, 2, 3):
        name, sub, blurb = PARTS[part]
        rows.append('<section class="bk-part" id="part-%d" data-part="%d"><h2><span>%s</span> %s</h2><p class="bk-part-note">%s</p><ol class="bk-list">' % (part, part, name, sub, blurb))
        for e in [x for x in ORDER if x[1] == part]:
            rows.append(home_row(e))
        rows.append('</ol></section>')
    e = entry('afterword')
    rows.append('<section class="bk-part" id="afterword" data-part="4"><h2><span>To finish</span> Afterword</h2><ol class="bk-list">%s</ol></section>' % home_row(e))
    page = HEAD_TMPL.replace('{TITLE}', 'The Book: The Objective Ledger').replace('{DESC}', 'The book.')
    page += '''<body data-no-offer data-no-learnplay data-no-pillars data-no-cheer data-no-pupvisits data-no-brain-break data-no-clip>
<main class="read bk-home" id="main">
<div class="bk-cover no-bubble" data-no-bubble><div class="bk-cover-text"><p class="bk-cover-brand">Spread Love &amp; Acceptance</p>
<p class="bk-cover-k">The book</p>
<h1>The Objective Ledger</h1><p class="bk-sub">Understanding yourself and the people you share a life with</p><p class="bk-cover-by">By %s</p></div>
<div class="bk-cover-art">%s</div></div>
<p class="simple-lede">A ledger is just a notebook where you write down what happened, so you can look at it calmly later. That’s the whole idea of this book: see what is really going on, in yourself and between people, without blaming anyone, and then change one small thing.</p>
<div class="bk-start no-bubble" data-no-bubble>
<a class="tol-btn bk-go" href="/book/self-1-then.html">Start reading: Part One, Then</a>
<a class="tol-btn is-quiet" href="/book/whole.html">The whole book on one page</a>
<a class="tol-btn is-quiet" href="/book/download.html">Download as PDF</a>
</div>
<ul class="bk-how no-bubble" data-no-bubble>
<li><strong>Read it in order, like any book.</strong> %d chapters in three parts, and an afterword. Every chapter ends with what to remember, the chapters it connects to, and the next one.</li>
<li><strong>Two sizes of every chapter.</strong> The short version takes about 10 to 15 minutes. The full version adds the research, more examples and more to try.</li>
<li><strong>Free, with nothing to sign up for.</strong> No account and no paid version. Read on a phone, a computer or on paper.</li>
<li><strong>Or use it with the program.</strong> Each chapter ends with the steps and worksheets that go with it, if you want to put it to work.</li>
</ul>
<nav class="bk-toc no-bubble" data-no-bubble aria-label="Contents">
<h2 class="bk-toc-h" id="contents">Contents</h2>
%s
%s
</nav>
<h2 id="other-ways">Other ways in</h2>
<ul>
<li><a href="/book/topic-start-here.html">The book at a glance</a>: the whole book in short paragraphs, for one person or for people together.</li>
<li>The book by topic: <a href="/book/topic-share-the-load.html">sharing the load</a>, <a href="/book/topic-talk-it-through.html">talking it through</a>, <a href="/book/topic-know-yourself.html">knowing yourself</a>, <a href="/book/topic-calm.html">staying calm</a> and <a href="/book/topic-by-relationship.html">by relationship</a>.</li>
<li><a href="/self-path.html">The self path</a> and <a href="/prog-01.html">the six-week program</a>: the book put to work, a step at a time.</li>
<li><a href="/research.html">Research and references</a>: the studies the chapters mention, with links to read more.</li>
</ul>
<p class="last-updated no-bubble">Last updated: %s</p>
</main>
</body>
</html>
''' % (AUTHOR, book_art.illustration('whole'), sum(1 for e in ORDER if e[1] in (1, 2, 3)),
       ''.join(fig_html(f, False).replace(' id="fig-front-parts"', ' id="how-the-parts-fit"') for f in FIGS if f['id'] == 'fig-front-parts'), '\n'.join(rows), UPDATED)
    write(os.path.join(BOOK, 'index.html'), page)


def home_row(e):
    mins = max(5, round(WORDS[(e[0], False)] / 220))
    fmins = max(10, round(WORDS[(e[0], True)] / 220))
    return '<li><a class="bk-ch" href="%s"><span class="bk-ch-n">%s</span><span class="bk-ch-t">%s</span><span class="bk-ch-d">%s</span></a><span class="bk-ch-m">%d min · <a href="%s">full version, %d min</a></span></li>' % (
        href(e[0]), esc(e[2]), esc(TITLES[e[0]]), esc(e[3]), mins, href(e[0], True), fmins)


# ---------- 5. the reading-order list on "The book at a glance" ----------
def patch_glance():
    p = os.path.join(BOOK, 'topic-start-here.html')
    s = read(p)
    out = ['<!-- book-order:start -->', '<ol class="book-order no-bubble" data-no-bubble>']
    ids = {1: 'part-one', 2: 'part-two', 3: 'part-three'}
    for part in (1, 2, 3):
        name, sub, _ = PARTS[part]
        out.append('<li id="%s"><strong>%s: %s</strong><ol class="no-bubble">' % (ids[part], name, sub))
        for e in [x for x in ORDER if x[1] == part]:
            lab = 'Preface to Part Two' if e[0] == 'preface' else e[2]
            out.append('<li><a href="%s">%s: %s</a> · <a href="%s">in depth</a></li>' % (href(e[0]), lab, esc(TITLES[e[0]]).replace('&#x27;', '’'), href(e[0], True)))
        out.append('</ol></li>')
    out.append('<li id="afterword"><strong>Afterword</strong><ol class="no-bubble"><li><a href="%s">%s</a> · <a href="%s">in depth</a></li></ol></li>' % (
        href('afterword'), esc(TITLES['afterword']), href('afterword', True)))
    out.append('</ol>')
    out.append('<p class="no-bubble"><a href="/book/">The book’s home</a> · <a href="/book/whole.html">The whole book on one page</a> (to read straight through or print)</p>')
    out.append('<!-- book-order:end -->')
    s = re.sub(r'<!-- book-order:start -->.*?<!-- book-order:end -->', lambda m: '\n'.join(out), s, flags=re.S)
    write(p, s)


def head_template():
    src = read(os.path.join(BOOK, 'topic-start-here.html'))
    head = src[:src.index('<body')]
    head = re.sub(r'<!-- seo:start -->.*?<!-- seo:end -->\n?', '', head, flags=re.S)
    head = re.sub(r'<title>.*?</title>', '<title>{TITLE}</title>', head)
    head = re.sub(r'<meta name="description" content="[^"]*">', '<meta name="description" content="{DESC}">', head)
    head = head.replace('<html lang="en">', '<html lang="en" class="tol-bookview">')
    head = head.replace('<link rel="stylesheet" href="/assets/css/mini-player.css">\n', '').replace('<script src="/assets/js/mini-player.js" defer></script>\n', '')
    return head


HEAD_TMPL = head_template()
try:
    MANIFEST = json.load(open(os.path.join(BOOK, 'pdf', 'manifest.json'), encoding='utf-8'))
except Exception:
    MANIFEST = {}
PAGEMAP = {}

if __name__ == '__main__':
    for i in range(len(ORDER)):
        patch_chapter(i, False)
        patch_chapter(i, True)
    for name, parts, title, who in PACKAGES:
        for deep in (False, True):
            fname = name + ('-in-depth' if deep else '')
            PAGEMAP = (MANIFEST.get(fname) or {}).get('pagemap') or {}
            build_whole(deep, name, parts, title, who if name != 'whole' else '')
    PAGEMAP = {}
    build_download()
    build_home()
    patch_glance()
    for m in MISSING:
        print('book: WARNING', m)
    print('book: %d chapters, %d figures, %d filled-in examples, home, packages (short %d words, full %d words)' % (
        len(ORDER), len(FIGS), len(EXS), sum(WORDS[(e[0], False)] for e in ORDER), sum(WORDS[(e[0], True)] for e in ORDER)))
