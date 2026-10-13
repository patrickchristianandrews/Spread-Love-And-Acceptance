#!/usr/bin/env python3
"""Build the book so it can be read on its own, like a regular book.

Run from the repo root:  python3 tools/book/build_book.py

It writes:
  book/index.html             the book's own home: title, how to read it, contents in order, Start reading
  book/whole.html             every chapter (short versions) on one page, ready to read straight through or print
  book/whole-in-depth.html    the same with the full versions
and, inside every chapter page (short and full), the block between
  <!-- book-end:start --> ... <!-- book-end:end -->
with the next chapter, the contents, and "Use this in the program" (the book stays tied to the program).
It also rewrites the reading-order list on book/topic-start-here.html.

Change the book's order or a chapter's program link in ORDER below, then run it again.
Afterwards run tools/seo/build_seo.py (new pages need their SEO lines there).
"""
import html
import os
import re

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
BOOK = os.path.join(ROOT, 'book')

PARTS = {
    1: ('Part One', 'Yourself', 'Where you came from, who you are now and who you are becoming. You can read all of it on your own.'),
    2: ('Part Two', 'Between us', 'One idea per chapter about sharing a life, a home or work with someone, each with a worksheet that puts it to use.'),
    3: ('Part Three', 'Understanding people', 'How feelings, stress, trust, change, grief and love work, for anyone, in any kind of relationship.'),
}

# (slug, part, short label, note, program links [(text, href)])
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
     [('Six-week program, week 3: notice how full each battery is', '/prog-01.html#week-3'), ('How much are you carrying?', '/workpapers/wp-02-how-much-are-you-carrying.html')]),
    ('chapter-4', 2, 'Chapter IV', 'Agreeing on what fair means to you both, and letting words land before you react',
     [('Six-week program, weeks 3 and 4: talk about it kindly', '/prog-01.html#week-4'), ('Say it so it lands', '/workpapers/wp-09-say-it-so-it-lands.html')]),
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
    ]
]


def read(p):
    with open(p, encoding='utf-8') as f:
        return f.read()


def write(p, s):
    with open(p, 'w', encoding='utf-8') as f:
        f.write(s)


def strip_tags(s):
    return html.unescape(re.sub(r'<[^>]+>', '', s))


def title_of(page):
    m = re.search(r'<h1[^>]*>(.*?)</h1>', page, re.S)
    return strip_tags(m.group(1)).strip() if m else ''


def main_inner(page):
    m = re.search(r'<main[^>]*>(.*)</main>', page, re.S)
    return m.group(1) if m else ''


def drop_element(s, start_pat, tag):
    """Remove every element whose opening tag matches start_pat, with its balanced contents."""
    out = s
    while True:
        m = re.search(start_pat, out)
        if not m:
            return out
        i = m.start()
        depth, j = 0, i
        tok = re.compile(r'<(/?)%s\b[^>]*>' % tag)
        for t in tok.finditer(out, i):
            depth += -1 if t.group(1) else 1
            if depth == 0:
                j = t.end()
                break
        else:
            return out
        out = out[:i] + out[j:]


def words(s):
    return len(re.findall(r"[A-Za-z’']+", strip_tags(s)))


def chapter_name(e):
    slug, part, label = e[0], e[1], e[2]
    if part == 1:
        return 'Part One · ' + label
    if slug == 'preface':
        return 'Preface to Part Two'
    return ('Part Two · ' if part == 2 else 'Part Three · ') + label


def href(slug, deep=False):
    return '/book/%s%s.html' % (slug, '-in-depth' if deep else '')


# ---------- 1. the end-of-chapter block in every chapter ----------
def end_block(i, deep):
    e = ORDER[i]
    prev = ORDER[i - 1] if i > 0 else None
    nxt = ORDER[i + 1] if i + 1 < len(ORDER) else None
    links = list(e[4])
    if e[1] == 3:
        links = [('The tools that go with this chapter', href(e[0]) + '#tools'), ('The six-week program', '/prog-01.html')]
    prog = ''.join('<li><a href="%s">%s</a></li>' % (h, html.escape(t)) for t, h in links)
    why = {1: 'Part One is the reading for the self path, a few short steps you do on your own.',
           2: 'Each Part Two chapter goes with a week of the six-week program and a worksheet.',
           3: 'Part Three is background for every part of the program.'}[e[1]]
    s = '<!-- book-end:start -->\n<aside class="book-end no-bubble" data-no-bubble aria-label="The book">\n'
    s += '<div class="book-end-use"><p class="book-end-k">Use this in the program</p><p>%s</p><ul>%s</ul></div>\n' % (why, prog)
    s += '<nav class="book-end-nav" aria-label="Book pages">'
    if nxt:
        s += '<a class="book-end-next" href="%s" rel="next"><span>Next in the book</span>%s: %s</a>' % (
            href(nxt[0], deep), html.escape(chapter_name(nxt)), html.escape(TITLES[nxt[0]]))
    else:
        s += '<a class="book-end-next" href="/book/"><span>You’ve reached the end of the book</span>Back to the book’s contents</a>'
    s += '<span class="book-end-row">'
    if prev:
        s += '<a href="%s" rel="prev">&larr; Back: %s</a>' % (href(prev[0], deep), html.escape(chapter_name(prev)))
    s += '<a href="/book/">The book: contents</a>'
    s += '<a href="/book/whole%s.html#%s">Read on one page</a>' % ('-in-depth' if deep else '', e[0])
    s += '</span></nav>\n</aside>\n<!-- book-end:end -->'
    return s


GROWING_ASIDE = re.compile(r'\s*<aside class="growing-note"[^>]*>.*?</aside>', re.S)
GROWING_CHIP = re.compile(r'\s*<a class="growing-chip"[^>]*>.*?</a>', re.S)


def patch_chapter(i, deep):
    p = os.path.join(BOOK, ORDER[i][0] + ('-in-depth' if deep else '') + '.html')
    s = read(p)
    s = re.sub(r'\n?<!-- book-end:start -->.*?<!-- book-end:end -->', '', s, flags=re.S)
    # the chapters are written; the "still growing" notes made a finished book look unfinished
    s = GROWING_ASIDE.sub('', s)
    s = GROWING_CHIP.sub('', s)
    # Part Three's own previous/next line is replaced by the shared block
    s = re.sub(r'<nav class="p3-nav"[^>]*>.*?</nav>\n?', '', s, flags=re.S)
    if 'class="last-updated' not in s:
        s = s.replace('</main>', '<p class="last-updated no-bubble">Last updated: October 2026</p>\n</main>', 1)
    blk = end_block(i, deep)
    anchor = '<p class="last-updated'
    k = s.rfind(anchor)
    if k < 0:
        k = s.rfind('</main>')
    s = s[:k] + blk + '\n' + s[k:]
    write(p, s)


# ---------- 2. the whole book on one page ----------
def clean_for_whole(inner, slug, deep, here=None):
    s = inner
    s = drop_element(s, r'<div class="tol-listen-top', 'div')
    s = drop_element(s, r'<div class="tol-book-audio', 'div')
    s = drop_element(s, r'<div class="bt-switch', 'div')
    s = drop_element(s, r'<aside class="book-end', 'aside')
    s = re.sub(r'<!-- book-end:(start|end) -->', '', s)
    s = drop_element(s, r'<nav class="p3-nav', 'nav')
    s = re.sub(r'<p class="depth-bar">.*?</p>', '', s, flags=re.S)
    s = re.sub(r'<div data-research-box></div>', '', s)
    s = re.sub(r'<p class="last-updated[^"]*">.*?</p>', '', s, flags=re.S)
    s = re.sub(r'<script\b.*?</script>', '', s, flags=re.S)
    s = GROWING_ASIDE.sub('', s)
    s = GROWING_CHIP.sub('', s)
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
    # the chapter heading becomes an h2 inside the book page
    s = re.sub(r'<header class="read-head">', '<header class="read-head whole-head">', s, count=1)
    return s


# The packages: the whole book, and smaller books for one person or for people together.
# name -> (parts, title, who it's for). Each is built in the short and the full versions.
PACKAGES = [
    ('whole', (1, 2, 3), 'The Whole Book', 'Every chapter, all three parts.'),
    ('for-yourself', (1, 3), 'The Book for One Person', 'Part One (yourself) and Part Three (understanding people): everything you can read and use on your own.'),
    ('together', (2,), 'The Book for Two or More', 'Part Two (between us): sharing a home, work or care with partners, family, housemates, co-parents or coworkers.'),
    ('understanding', (3,), 'Understanding People', 'Part Three on its own: how feelings, stress, trust, change, grief and love work.'),
]


def build_whole(deep, name='whole', parts=(1, 2, 3), title=None, who=''):
    here = set(e[0] for e in ORDER if e[1] in parts)
    parts_html, toc = [], []
    for part in parts:
        pname, sub, _ = PARTS[part]
        toc.append('<li><strong>%s: %s</strong><ol>' % (pname, sub))
        parts_html.append('<h2 class="whole-part" id="part-%d">%s: %s</h2>' % (part, pname, sub))
        for e in [x for x in ORDER if x[1] == part]:
            src = read(os.path.join(BOOK, e[0] + ('-in-depth' if deep else '') + '.html'))
            body = clean_for_whole(main_inner(src), e[0], deep, here)
            toc.append('<li><a href="#%s">%s: %s</a></li>' % (e[0], html.escape(chapter_name(e)), html.escape(TITLES[e[0]])))
            parts_html.append('<article class="whole-ch" id="%s">%s<p class="whole-top no-print"><a href="#contents">Contents</a> · <a href="%s">Open this chapter on its own page</a></p></article>' % (
                e[0], body, href(e[0], deep)))
        toc.append('</ol></li>')
    fname = name + ('-in-depth' if deep else '')
    other = '/book/%s.html' % (name if deep else name + '-in-depth')
    base = title or 'The Whole Book'
    title = base + (' on One Page' if name == 'whole' else '') + (' (Full Version)' if deep else '')
    lede = ('%s<em>The Objective Ledger</em>, in order, on one page%s. Read straight through, use your browser’s find, or print it.'
            % ((html.escape(who) + ' From ') if who else 'Every chapter of ', ', in the full versions' if deep else ', in the short versions'))
    page = HEAD_TMPL.replace('{TITLE}', title).replace('{DESC}', 'The book on one page.')
    page += '''<body data-no-offer data-no-learnplay data-no-pillars data-no-cheer data-no-buddies data-no-pupvisits data-no-brain-break data-no-clip data-no-pudcards data-no-dives data-no-reading class="whole-book">
<main class="read whole" id="main">
<header class="read-head"><p class="read-code">The book</p><h1>%s</h1></header>
<p class="simple-lede">%s</p>
<p class="whole-actions no-print no-bubble"><a class="tol-btn" href="/book/download.html#%s">Download the PDF</a> <button type="button" class="tol-btn is-quiet" onclick="window.print()">Print</button> <a class="tol-btn is-quiet" href="%s">%s</a> <a class="tol-btn is-quiet" href="/book/">The book’s home</a></p>
<p class="whole-note no-print">About %d minutes of reading in all. Your browser keeps your place if you come back to this page.</p>
<nav class="whole-toc no-bubble" id="contents" aria-label="Contents"><h2>Contents</h2><ol>%s</ol></nav>
%s
<p class="last-updated no-bubble">Last updated: October 2026. From spreadloveandacceptance.com. Free to read and share for personal and non-commercial teaching use, with credit.</p>
</main>
<script>
// /book/whole.html?print=1 opens the print dialog once the page has loaded
if (/[?&]print=1\\b/.test(location.search)) window.addEventListener('load', function () { setTimeout(function () { window.print(); }, 400); });
</script>
</body>
</html>
''' % (title.replace(' (Full Version)', ': the full version'), lede, fname, other,
       'Switch to the short versions' if deep else 'Switch to the full versions',
       round(sum(WORDS[(e[0], deep)] for e in ORDER if e[0] in here) / 220 / 5) * 5,
       ''.join(toc), '\n'.join(parts_html))
    write(os.path.join(BOOK, fname + '.html'), page)


# ---------- 2b. the PDF downloads (made by tools/book/build_pdfs.js, which writes book/pdf/manifest.json) ----------
def build_download():
    try:
        import json
        man = json.load(open(os.path.join(BOOK, 'pdf', 'manifest.json'), encoding='utf-8'))
    except Exception:
        man = {}
    cards = []
    for name, parts, title, who in PACKAGES:
        rows = []
        for deep in (False, True):
            fname = name + ('-in-depth' if deep else '')
            m = man.get(fname, {})
            meta = ''
            if m:
                meta = '%d pages · %.1f MB' % (m.get('pages', 0), m.get('bytes', 0) / 1048576.0)
            rows.append('<li><a class="bk-dl-file" href="/book/pdf/%s.pdf" data-dl="%s" download><span class="bk-dl-v">%s</span><span class="bk-dl-m">%s</span></a> <a class="bk-dl-read" href="/book/%s.html">read it here</a></li>' % (
                fname, fname, 'Full version' if deep else 'Short version', meta, fname))
        chs = sum(1 for e in ORDER if e[1] in parts)
        cards.append('<section class="bk-dl-card" id="%s"><h2>%s</h2><p>%s %d chapters.</p><ul class="bk-dl-list">%s</ul></section>' % (
            name, html.escape(title), html.escape(who), chs, ''.join(rows)))
    page = HEAD_TMPL.replace('{TITLE}', 'Download the Book as a PDF').replace('{DESC}', 'Download the book as a PDF.')
    page += '''<body data-no-offer data-no-learnplay data-no-pillars data-no-cheer data-no-pupvisits data-no-brain-break data-no-clip>
<main class="read bk-home bk-dl" id="main">
<header class="read-head"><p class="read-code">The book</p><h1>Download the book as a PDF</h1></header>
<p class="simple-lede">Keep the book on your phone, tablet or computer, or print it. Pick the whole book or a smaller book that fits you, in the short or the full version.</p>
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
<p class="last-updated no-bubble">Last updated: October 2026</p>
</main>
<script src="/assets/js/book-download.js" defer></script>
</body>
</html>
''' % '\n'.join(cards)
    write(os.path.join(BOOK, 'download.html'), page)


# ---------- 3. the book's home ----------
def build_home():
    rows = []
    for part in (1, 2, 3):
        name, sub, blurb = PARTS[part]
        rows.append('<section class="bk-part" id="part-%d"><h2><span>%s</span> %s</h2><p class="bk-part-note">%s</p><ol class="bk-list">' % (part, name, sub, blurb))
        for e in [x for x in ORDER if x[1] == part]:
            mins = max(5, round(WORDS[(e[0], False)] / 220))
            fmins = max(10, round(WORDS[(e[0], True)] / 220))
            rows.append('<li><a class="bk-ch" href="%s"><span class="bk-ch-n">%s</span><span class="bk-ch-t">%s</span><span class="bk-ch-d">%s</span></a><span class="bk-ch-m">%d min · <a href="%s">full version, %d min</a></span></li>' % (
                href(e[0]), html.escape(e[2]), html.escape(TITLES[e[0]]), html.escape(e[3]), mins, href(e[0], True), fmins))
        rows.append('</ol></section>')
    page = HEAD_TMPL.replace('{TITLE}', 'The Book: The Objective Ledger').replace('{DESC}', 'The book.')
    page += '''<body data-no-offer data-no-learnplay data-no-pillars data-no-cheer data-no-pupvisits data-no-brain-break data-no-clip>
<main class="read bk-home" id="main">
<header class="read-head"><p class="read-code">The book</p><h1>The Objective Ledger</h1><p class="bk-sub">A book about understanding yourself and the people you share a life with</p></header>
<p class="simple-lede">A ledger is just a notebook where you write down what happened, so you can look at it calmly later. That’s the whole idea of this book: see what is really going on, in yourself and between people, without blaming anyone, and then change one small thing.</p>
<div class="bk-start no-bubble" data-no-bubble>
<a class="tol-btn bk-go" href="/book/self-1-then.html">Start reading: Part One, Then</a>
<a class="tol-btn is-quiet" href="/book/whole.html">The whole book on one page</a>
<a class="tol-btn is-quiet" href="/book/download.html">Download as PDF</a>
</div>
<ul class="bk-how no-bubble" data-no-bubble>
<li><strong>Read it in order, like any book.</strong> %d chapters in three parts. Every chapter ends with a link to the next one.</li>
<li><strong>Two sizes of every chapter.</strong> The short version takes about 10 to 15 minutes. The full version adds the research, more examples and more to try.</li>
<li><strong>Free, with nothing to sign up for.</strong> No account and no paid version. Read on a phone, a computer or on paper.</li>
<li><strong>Or use it with the program.</strong> Each chapter ends with the steps and worksheets that go with it, if you want to put it to work.</li>
</ul>
<nav class="bk-toc no-bubble" data-no-bubble aria-label="Contents">
<h2 class="bk-toc-h" id="contents">Contents</h2>
%s
</nav>
<h2 id="other-ways">Other ways in</h2>
<ul>
<li><a href="/book/topic-start-here.html">The book at a glance</a>: the whole book in short paragraphs, for one person or for people together.</li>
<li>The book by topic: <a href="/book/topic-share-the-load.html">sharing the load</a>, <a href="/book/topic-talk-it-through.html">talking it through</a>, <a href="/book/topic-know-yourself.html">knowing yourself</a>, <a href="/book/topic-calm.html">staying calm</a> and <a href="/book/topic-by-relationship.html">by relationship</a>.</li>
<li><a href="/self-path.html">The self path</a> and <a href="/prog-01.html">the six-week program</a>: the book put to work, a step at a time.</li>
<li><a href="/research.html">Research and references</a>: the studies the chapters mention, with links to read more.</li>
</ul>
<p class="last-updated no-bubble">Last updated: October 2026</p>
</main>
</body>
</html>
''' % (len(ORDER), '\n'.join(rows))
    write(os.path.join(BOOK, 'index.html'), page)


# ---------- 4. the reading-order list on "The book at a glance" ----------
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
            out.append('<li><a href="%s">%s: %s</a> · <a href="%s">in depth</a></li>' % (href(e[0]), lab, html.escape(TITLES[e[0]]).replace('&#x27;', '’'), href(e[0], True)))
        out.append('</ol></li>')
    out.append('</ol>')
    out.append('<p class="no-bubble"><a href="/book/">The book’s home</a> · <a href="/book/whole.html">The whole book on one page</a> (to read straight through or print)</p>')
    out.append('<!-- book-order:end -->')
    s = re.sub(r'<!-- book-order:start -->.*?<!-- book-order:end -->', '\n'.join(out), s, flags=re.S)
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


SLUGS = set(e[0] for e in ORDER)
TITLES, WORDS = {}, {}
for e in ORDER:
    for deep in (False, True):
        pg = read(os.path.join(BOOK, e[0] + ('-in-depth' if deep else '') + '.html'))
        WORDS[(e[0], deep)] = words(main_inner(pg))
        if not deep:
            TITLES[e[0]] = title_of(pg)
HEAD_TMPL = head_template()

if __name__ == '__main__':
    for i in range(len(ORDER)):
        patch_chapter(i, False)
        patch_chapter(i, True)
    for name, parts, title, who in PACKAGES:
        for deep in (False, True):
            build_whole(deep, name, parts, title, who if name != 'whole' else '')
    build_download()
    build_home()
    patch_glance()
    print('book: %d chapters, home, whole book (short %d words, full %d words)' % (
        len(ORDER), sum(WORDS[(e[0], False)] for e in ORDER), sum(WORDS[(e[0], True)] for e in ORDER)))
