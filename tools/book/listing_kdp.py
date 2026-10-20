#!/usr/bin/env python3
"""listing_kdp.py: the Amazon KDP listing for every print book and Kindle edition of the series (print12).

    python3 tools/book/listing_kdp.py      writes book/print/listing-kdp.md and book/print/listing-kdp.csv

Reads tools/book/series.json (titles, back-cover words) and book/print/series.json (page counts, spine widths and
costs, written by build_pdfs.js with BOOK_SERIES=1), so run it after the print books are built. Everything the owner
must decide or confirm is marked [OWNER]. Facts about KDP were looked up in October 2026; the sources are listed at
the end of the .md file. The Kindle rows name the EPUB files made by tools/book/build_epub.py (epub13) and read their real
sizes from book/print/epub/epub.json, so run it after build_epub.py too.

logicbook14: the owner sells on Amazon only, so the listing has no other shops, no bookshop distributor and no discount
codes. It also lists the pocket guide (The Logic Behind It: paperback $9.99 recommended, $8.99 the alternative; Kindle $2.99,
from tools/book/series-extras.json). books-final9: the Kindle box set is held back for the second wave, with Book 5; its
listing words stay here (L[BOXSET]) but it is left out of this wave's listing.

finalfix15: the workbook comes in two editions, built from the same pages: the colour edition (workbook.pdf) and a
black-and-white interior with the same colour cover (workbook-bw.pdf, recommended). Both are listed, side by side,
and the owner publishes one. Every paperback uses a free KDP ISBN.

voice18: the owner's pricing rule (series.json "price_rule"): a paperback under 100 pages is a short edition at $9.99,
anything longer is $14.99. build_pdfs.js applies it to the final page count and writes list_price into book/print/series.json;
this file reads that, recomputes every royalty line from it, and groups the short editions (the pocket guide and the workbook)
together after the books. A short edition whose printing cost is too high for KDP's expanded distribution at $9.99 (the colour
workbook) is marked Amazon only, with the lowest price that would allow it.
"""
import csv
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'book', 'print')
import sys  # noqa: E402
sys.path.insert(0, HERE)
import series_site  # noqa: E402
CFG = series_site.config()  # finalfix15: with each item's ISBNs from the one "isbn" block
MADE = json.load(open(os.path.join(OUT, 'series.json'), encoding='utf-8')).get('books', {})
SERIES = CFG['series_title']
# printfix13: the publisher and imprint, as on every copyright page (tools/book/series.json)
PUBLISHER = CFG.get('publisher', "Christian's Lab").replace("'", '’')
IMPRINT = CFG.get('imprint', PUBLISHER).replace("'", '’')
import sys  # noqa: E402
sys.path.insert(0, HERE)
from build_series import WB, POCKET, BOXSET, COSTS  # noqa: E402  (the workbook's sheets, the pocket guide and the box set)

# Kindle: the 70% band on Amazon.com is $2.99 to $12.99 since 7 July 2026; delivery is $0.15 a megabyte
KINDLE_PRICE = 5.99
KINDLE_MB = 3.0  # used only when an EPUB has not been built yet; KDP shows the real file size [OWNER]
try:
    EPUB = json.load(open(os.path.join(OUT, 'epub', 'epub.json'), encoding='utf-8')).get('books', {})
except Exception:
    EPUB = {}


def kindle_mb(bid):
    """the EPUB's own size in MB (KDP charges delivery on its converted file, which can differ a little)"""
    return EPUB.get(bid, {}).get('mb') or KINDLE_MB
UK_PRICE, EU_PRICE, CA_PRICE, AU_PRICE = '£11.99', '€13.99', 'CA$19.99', 'AU$23.99'
# the pocket guide's local prices: rounded local equivalents of $9.99, at or above the 60% thresholds (£7.99, €9.99) [OWNER]
PK_UK, PK_EU, PK_CA, PK_AU = '£7.99', '€9.99', 'CA$13.99', 'AU$15.99'
# finalfix15: the workbook's black-and-white edition at $9.99: the same local equivalents
BW_UK, BW_EU, BW_CA, BW_AU = PK_UK, PK_EU, PK_CA, PK_AU
RULE = CFG.get('price_rule') or {'short_under_pages': 100, 'short_usd': 9.99, 'regular_usd': 14.99}
UK_FIXED, UK_PER_PAGE = 0.85, 0.020  # standard colour, regular trim, Amazon.co.uk (third-party figure, not confirmed)

# Each book: the listing words. Categories are KDP browse paths (pick 3); keywords fill the 7 boxes (50 characters each).
L = {
    'book-1-know-yourself-kindly': {
        'hook': 'Before you can share a life well, it helps to understand your own.',
        'body': [
            'This short, warm book starts with you. Where did your way of seeing things come from: the home you grew up in, the old rules, the things life taught you? How are you wired today: your energy, your weather, the words that land and the ones that sting? And who are you becoming, one small step at a time?',
            'Along the way it explains, in plain words, how feelings work, why your worth is not a score, why personality is more like a set of dials than a box, and how minds work differently, from ADHD and autism to sensory and learning differences.',
        ],
        'inside': ['Where your lens came from, and the rulebook from home', 'Your wiring, your weather and your words', 'Who you are becoming: one small goal and a kind monthly look at yourself',
                   'How feelings work, and naming what you feel', 'Self-worth, shame and a kinder inner voice', 'Personality and temperament: dials, not boxes', 'Minds that work differently, and meeting in the middle'],
        'cats': ['Books › Self-Help › Personal Transformation', 'Books › Self-Help › Emotions', 'Books › Health, Fitness & Dieting › Psychology & Counseling › Personality'],
        'alt': ['Books › Self-Help › Self-Esteem', 'Books › Health, Fitness & Dieting › Mental Health › Neuropsychology', 'Books › Politics & Social Sciences › Philosophy › Ethics & Morality'],
        'kw': ['self discovery book for adults', 'self worth and self compassion', 'understanding emotions and feelings', 'adult adhd and autism self understanding',
               'childhood patterns and family rules', 'personality traits and temperament', 'gentle personal growth for beginners'],
    },
    'book-2-heal-and-steady': {
        'hook': 'Some days are heavy. This book helps you find your footing again, gently and without blame.',
        'body': [
            'Stress piles up, anger flares, worry keeps you awake, or a loss changes everything. This book explains what is going on inside you, in plain words, and gives you small, practical things to try.',
            'It explains what stress does to the body and why it adds up, what anger is for and what helps in the hot minutes, and how worry, low mood and trauma work. It walks with you through grief in its many forms, through repair and apologies that land, and through the slow work of change. It ends with what matters to you, and what a good life can mean.',
        ],
        'inside': ['Stress, the ladder, flooding and rest that helps', 'Anger: what it is for, and the hot minutes', 'Worry, low mood and trauma, and what helps', 'Grief in waves, and losses nobody sees',
                   'Repair, apologies that land and forgiveness', 'Habits and change, one small step at a time', 'Values, meaning and a good life'],
        'cats': ['Books › Self-Help › Stress Management', 'Books › Self-Help › Anger Management', 'Books › Self-Help › Death & Grief › Grief & Bereavement'],
        'alt': ['Books › Self-Help › Anxieties & Phobias', 'Books › Self-Help › Emotions', 'Books › Health, Fitness & Dieting › Mental Health › Post-traumatic Stress Disorder'],
        'kw': ['coping with burnout and feeling overwhelmed', 'managing temper and irritability', 'anxiety and low mood self help', 'grief after a death breakup or divorce',
               'how to apologize and forgive', 'trauma informed self care', 'small habits for lasting change'],
    },
    'book-3-understanding-each-other': {
        'hook': 'Two people can care about each other and still fall out of tune.',
        'body': [
            'One wants to talk now; the other needs an hour. A comment meant lightly lands hard. This book is about understanding the people around you: at home, in families, with friends, at work and in every group you belong to.',
            'It explains how pace and tone pull people apart, how communication really works, and why two people can see the same moment so differently. It looks at why we need to belong, how trust grows and is rebuilt, how love takes many forms, and the quiet pull of groups. It ends with helping others well, with kind limits and without burning out.',
        ],
        'inside': ['Why we get out of tune, and how to get back', 'How communication works: meaning, listening and repair', 'How we see each other: perception, bias and the stories we tell',
                   'Attachment, trust and belonging', 'Closeness and love in many forms', 'Groups, influence and disagreeing kindly', 'Helping others well, without burning out'],
        'cats': ['Books › Self-Help › Communication & Social Skills', 'Books › Parenting & Relationships › Marriage & Adult Relationships', 'Books › Self-Help › Relationships › Interpersonal Relations'],
        'alt': ['Books › Parenting & Relationships › Family Relationships', 'Books › Health, Fitness & Dieting › Psychology & Counseling › Social Psychology & Interactions', 'Books › Self-Help › Relationships › Love & Romance'],
        'kw': ['communication skills for couples', 'how to stop arguing and listen better', 'neurodivergent relationships', 'attachment styles and rebuilding trust',
               'relationship book for couples and families', 'peer pressure conformity and team dynamics', 'support someone without burning out'],
    },
    'book-4-share-the-load': {
        'hook': 'Every shared home runs on work that nobody sees.',
        'body': [
            'Noticing the shoes are too small, booking the appointment, remembering bin day: when that work is not counted, someone ends up carrying more than anyone realises, and resentment grows quietly.',
            'This book helps you see the whole load, kindly and without keeping score. It shows a simple way to check whether the way you share the work can last, how much of a reaction is leftover stress, how to agree what fair means to each of you, and a gentle monthly look-back that catches what weekly chats miss. It works for couples, families, housemates, co-parents and teams. It looks at the setup, never at the person.',
        ],
        'inside': ['The work nobody sees: the mental load, made visible', 'Is the split working? A simple check you can both trust', 'Full stress tanks and seven angles on the same moment',
                   'Two kinds of fair, and letting words land', 'The monthly look-back', 'How the numbers work, in plain arithmetic', 'An afterword that draws the series together'],
        'cats': ['Books › Parenting & Relationships › Marriage & Adult Relationships', 'Books › Self-Help › Relationships', 'Books › Crafts, Hobbies & Home › Home Improvement & Design › Household Hints'],
        'alt': ['Books › Parenting & Relationships › Family Relationships › Family Activities', 'Books › Business & Money › Management & Leadership › Teams', 'Books › Parenting & Relationships › Parenting › Parenting Skills'],
        'kw': ['mental labor in marriage and relationships', 'dividing household chores equally', 'chore chart for couples and families', 'invisible labor at home',
               'household management for working parents', 'roommates and co-parenting chores', 'resentment in relationships over housework'],
    },
    'workbook': {
        'hook': 'Every workpaper from the series, bound together on big pages with room to write.',
        'body': [
            'Inside are blank copies of all ten workpapers: a quick check of how much you are carrying, a calm-down kit you make on a calm day, a self-check before you reply to something that stung, a 90-second daily check-in, a one-week log of who did what, a list that gives every job one owner, a monthly look-back, and more, plus a paper version of the setup score with the sums laid out.',
            'Each one starts with a short page that says when to use it, how long it takes, who fills it in and which book explains it. Then come spare copies for the weeks ahead, a planner for the six-week program, “How the numbers work” and pages for your own notes.',
        ],
        'inside': ['10 workpapers and a paper setup score, %d blank copies in all' % sum(w[1] for w in WB), 'A short guide page before each one', 'Single sheets on one page; longer sheets run over two pages', 'A six-week planner and lined pages for notes', 'Large 8.5 × 11 in pages'],
        'cats': ['Books › Self-Help › Relationships', 'Books › Parenting & Relationships › Marriage & Adult Relationships', 'Books › Self-Help › Communication & Social Skills'],
        'alt': ['Books › Self-Help › Stress Management', 'Books › Parenting & Relationships › Family Relationships', 'Books › Self-Help › Personal Transformation'],
        'kw': ['communication workbook for couples', 'relationship worksheets for couples', 'chore chart for couples and families', 'self help workbook for adults',
               'family meeting planner', 'calm down plan for adults', 'couples check in journal'],
    },
}


# finalfix15: the workbook's black-and-white edition: the same words, the same pages, a black-ink interior
WB_BW = dict(CFG['workbook'], id=CFG['workbook']['id'] + '-bw', isbn=CFG['workbook'].get('isbn_bw', ''), price_usd=CFG['workbook_bw_price_usd'])
L[WB_BW['id']] = dict(L['workbook'], inside=[x for x in L['workbook']['inside'] if not x.startswith('Large')] + ['Large 8.5 × 11 in pages, printed in black and white, under a colour cover'])

# logicbook14: the pocket guide and the box set's listing words
L[POCKET['id']] = {
    'hook': 'Why did they react like that? Most reactions that look odd, rude or over the top from outside make sense once you can see the logic.',
    'body': [
        'A friend leaves the party without a goodbye. A colleague’s feedback lands like a slap. Someone says “I’m fine” when they plainly aren’t. This pocket guide takes thirty-eight everyday reactions like these and lays out the reasoning behind each one, step by step, on a single page.',
        'It runs both ways. Some pages explain neurodivergent logic for people who don’t share it, such as headphones at dinner or a long talk about one interest. Some explain common social habits in plain logic for anyone who finds them baffling, such as small talk, white lies, hints and “Let’s get coffee sometime”. Many cover things anyone does, like snapping when hungry or going quiet in a row. A short section on “different rulebooks” looks at habits learned in a particular family, place or generation.',
    ],
    'inside': ['38 situations, one to a page, in nine short sections', 'On every page: what it looks like, the logic in steps, an everyday picture, why it fits, the other side, one sentence and one small step',
               '“With care” notes where a reaction can land hard on someone else', 'A short introduction to the six-part lens, and why logic explains but never excuses',
               'Blank cards to work out a reaction of your own', 'A code on every page to the same situation online'],
    'cats': ['Books › Self-Help › Communication & Social Skills', 'Books › Health, Fitness & Dieting › Psychology & Counseling › Social Psychology & Interactions',
             'Books › Self-Help › Relationships › Interpersonal Relations'],
    'alt': ['Books › Health, Fitness & Dieting › Mental Health › Neuropsychology', 'Books › Parenting & Relationships › Family Relationships', 'Books › Self-Help › Emotions'],
    'kw': ['understanding autistic adults and neurodiversity', 'unwritten social rules explained', 'adhd and autism in relationships',
           'small talk white lies and hints', 'cross cultural communication differences', 'empathy and seeing the other side', 'why my partner goes quiet in arguments'],
}
L[BOXSET['id']] = {
    'hook': 'The whole series in one Kindle edition: four short books and a pocket guide.',
    'body': [
        'Book 1, Know Yourself Kindly, starts with you: where your way of seeing things came from, your wiring, your feelings, your worth and how minds work differently. Book 2, Heal and Steady, is for the heavy days of stress, anger, worry, grief and repair. Book 3, Understanding Each Other, looks at how we hear, see and belong to each other, at home and in every group.',
        'Book 4, Share the Load, makes the unseen work at home visible and offers a fair, kind way to share it. The Logic Behind It, a pocket guide, lays out the reasoning behind thirty-eight everyday reactions that can look odd or rude from outside, with the other person’s side and one small step.',
    ],
    'inside': ['Book 1: Know Yourself Kindly (7 chapters)', 'Book 2: Heal and Steady (7 chapters)', 'Book 3: Understanding Each Other (7 chapters)',
               'Book 4: Share the Load (5 chapters and an afterword)', 'The Logic Behind It: a pocket guide to 38 everyday reactions', 'One contents page for all five, and every book’s own contents, notes and research list'],
    'cats': ['Kindle Store › Kindle eBooks › Self-Help › Personal Transformation', 'Kindle Store › Kindle eBooks › Parenting & Relationships › Marriage & Adult Relationships',
             'Kindle Store › Kindle eBooks › Self-Help › Communication & Social Skills'],
    'alt': ['Kindle Store › Kindle eBooks › Self-Help › Emotions', 'Kindle Store › Kindle eBooks › Self-Help › Stress Management', 'Kindle Store › Kindle eBooks › Parenting & Relationships › Family Relationships'],
    'kw': ['self help box set for adults', 'relationship guides for couples and families', 'emotional intelligence and self compassion',
           'mental load and household chores', 'communication skills and listening', 'neurodiversity adhd and autism at home', 'stress anger worry and grief'],
}


def esc(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def description(item, d, kind='book'):
    h = '<p><b>%s</b></p>' % esc(d['hook'])
    h += ''.join('<p>%s</p>' % esc(p) for p in d['body'])
    h += '<p><b>%s</b></p><ul>%s</ul>' % ('Inside this book' if kind == 'book' else 'Inside', ''.join('<li>%s</li>' % esc(x) for x in d['inside']))
    if kind == 'workbook':
        h += '<p>The sheets describe what happened, never who someone is. Fill them in on your own or together; on shared sheets each person writes only their own rows.</p>'
    elif kind == 'pocket':
        h += ('<p>No page labels or diagnoses anyone, and the situations are made up from common patterns. Logic explains a reaction; it never excuses harm, '
              'and the pages say so where it matters.</p>')
        h += '<p><b>Part of a series.</b> %s is a series of short books that each stand on their own. This pocket guide goes with them, or on its own.</p>' % esc(SERIES)
    elif kind == 'boxset':
        h += ('<p>Each chapter has everyday scenes (all made up), words you could use and one small thing to try. Three friendly characters, Professor Puddles, '
              'Tidbit and Sugarfoot, drop in with hints on the lighter pages.</p>')
    else:
        h += ('<p>Each chapter has everyday scenes (all made up), words you could use and one small thing to try this week. Three friendly characters, Professor Puddles, '
              'Tidbit and Sugarfoot, drop in with hints, and keep to the lighter pages.</p>')
        h += '<p><b>Part of a series.</b> %s is a series of short books that each stand on their own, plus a workbook with every form and a pocket guide. Read them in any order.</p>' % esc(SERIES)
    if kind == 'pocket':
        h += '<p><i>This guide is general education, not therapy or a diagnosis.</i></p>'
    elif kind == 'boxset':
        h += '<p><i>These books are general education, not therapy or a diagnosis.</i></p>'
    else:
        h += '<p><i>This book is general education, not therapy or a diagnosis.</i></p>'
    return h


def kw_ok(item, d):
    title = (item['title'] + ' ' + item.get('sub', '') + ' ' + SERIES).lower()
    tw = set(w.strip('.,:;!?’()–') for w in title.split() if len(w) > 3)
    out = []
    for k in d['kw']:
        bad = [w for w in k.split() if w in tw]
        out.append((k, len(k), bad))
    return out


def money(x):
    return '$%.2f' % x


def list_price(bid, kind):
    """voice18: the list price the build set from the final page count (the owner's rule); the rule itself if the book isn't built yet"""
    m = MADE.get(bid, {})
    lp = (m.get('costs') or {}).get('list_price')
    if lp:
        return lp
    if m.get('pages'):
        return RULE['short_usd'] if m['pages'] < RULE['short_under_pages'] else RULE['regular_usd']
    return RULE['regular_usd'] if kind == 'book' else RULE['short_usd']


def is_short(bid, kind):
    return list_price(bid, kind) < RULE['regular_usd']


def expanded_text(c, price):
    """the expanded distribution cell: what it would pay, or that KDP doesn't allow it at this price"""
    e = c.get('kdp_expanded', {})
    if e.get('net', 0) <= 0:
        return ('**No** (Amazon only) | %s | **not available at %s**: 40%% × %s is less than the printing cost, so KDP won\'t offer expanded distribution '
                'below about %s for this book |' % (money(e.get('print', 0)), money(price), money(price), money(e.get('min_price') or e.get('print', 0) / 0.4)))
    return '**No** (Amazon only) | %s | would pay %s a copy (40%% × %s − printing) |' % (money(e.get('print', 0)), money(e.get('net', 0)), money(price))


def kindle_net(price, mb):
    """70% band ($2.99 to $12.99 on Amazon.com since 7 July 2026): 70% x price - delivery ($0.15 a MB); 35% outside it, with no delivery fee"""
    if 2.99 <= price <= 12.99:
        return 0.70 * price - 0.15 * mb, 70
    return 0.35 * price, 35


AI_TEXT = '''KDP asks three separate questions: did you use AI-based tools to create the **text**, the **images**, or **translations**? KDP's own definitions:
- **AI-generated** means an AI-based tool created the actual content, *even if you edited it a lot afterwards*. This must be disclosed.
- **AI-assisted** means you created the content yourself and used AI to edit, check, brainstorm or improve it. This does not need to be disclosed.

Honest answers for this book, as it was made [OWNER: confirm; only you know your own process]:

| Question | Answer to choose | Why |
|---|---|---|
| Text | **Yes**: "Entire work, with extensive editing" | The chapters were drafted with AI writing tools and then reviewed and edited many times. If you wrote any book entirely yourself and only used AI to edit it, choose "No" for that book instead. |
| Images | **Yes**: "Entire work, with extensive editing" | The covers, characters and figures are drawn by code that was written with an AI tool. |
| Translations | **No** | The book is in English only. |

The answers are seen by Amazon, not printed on the product page.
'''

SELECT_NO = ('**No.** Select needs the ebook to be exclusive to Amazon in digital form, and every chapter is free on your website and in free PDFs. Pros you give up: '
             'Kindle Unlimited page reads, 5 free-promotion days or Countdown Deals per 90 days. Cons you avoid: 90-day auto-renewing exclusivity, and having to take '
             'the free online book down.')
DRM_NO = ('**No DRM.** The same chapters are free online, so DRM protects nothing and only gets in readers\' way. KDP\'s help page on DRM (kdp.amazon.com/help/topic/GDDXGH9VR22ACM8U, '
          'checked October 2026 via search) now says you can change the setting at any time, and that a book without DRM lets verified buyers download an EPUB and PDF copy (from 20 January 2026). [OWNER]')


def workbook_choice():
    """finalfix15: the two workbook editions side by side, and the recommendation"""
    c, b = MADE.get('workbook', {}), MADE.get(WB_BW['id'], {})
    cc, bc = (c.get('costs') or {}).get('kdp_amazon', {}), (b.get('costs') or {}).get('kdp_amazon', {})
    cp, bp = list_price('workbook', 'workbook'), list_price(WB_BW['id'], 'workbook')
    ce = (c.get('costs') or {}).get('kdp_expanded', {})
    return '\n'.join([
        '\n---\n\n## Which workbook edition? [OWNER: decide; (b) is recommended]\n',
        'Both editions are built from the same pages, with no blank pages, and both have the same colour cover. Publish one of them (each gets its own free KDP ISBN).\n',
        '| | (a) Colour edition | (b) Black-and-white interior (recommended) |', '|---|---|---|',
        '| Files | workbook.pdf, cover-workbook.pdf | workbook-bw.pdf, cover-workbook-bw.pdf |',
        '| Pages | %d | %d |' % (c.get('pages', 0), b.get('pages', 0)),
        '| KDP ink | Standard color | Black & white |',
        '| List price | %s | %s |' % (money(cp), money(bp)),
        '| Printing (Amazon.com) | %s | %s |' % (money(cc.get('print', 0)), money(bc.get('print', 0))),
        '| Royalty | 60% | 60% |',
        '| **You keep a copy** | **%s** | **%s** |' % (money(cc.get('net', 0)), money(bc.get('net', 0))),
        '| Expanded distribution | Not available at %s (KDP would need about %s): **Amazon only** | Off (Amazon only, as every book) |' % (money(cp), money(ce.get('min_price') or 0)),
        '',
        '**Both at %s.** The owner\'s rule puts every paperback under 100 pages in the short line at %s, so both editions cost the reader the same. '
        '**Why (b).** At the same price, black ink keeps **%s** a copy against colour\'s **%s**: colour printing at this size costs %s, black ink a flat %s. '
        'The sheets are forms to write on, so colour adds little, and the cover stays in colour either way. The simulated reader panel put the workbook\'s value at about $8.50, '
        'so %s is close to what readers expect. Below $9.99 KDP pays 50%% instead of 60%%, so $9.99 is also the lowest price that keeps the higher royalty.\n' % (
            money(bp), money(bp), money(bc.get('net', 0)), money(cc.get('net', 0)), money(cc.get('print', 0)), money(bc.get('print', 0)), money(bp)),
        'The sources for the printing costs are at the end of this file. KDP\'s own calculator gives the exact figure for each file; check it before you set the price.\n'])


def main():
    items = CFG['books'] + [POCKET, CFG['workbook'], WB_BW]  # books-final9: the box set waits for Book 5 (second wave)
    md, rows = [], []
    md.append('# Amazon KDP listing: %s print series and Kindle editions\n' % SERIES)
    md.append('Made by tools/book/listing_kdp.py (print12, logicbook14) from tools/book/series.json, tools/book/series-extras.json and the built books in book/print/. '
              'Copy each field into KDP as it stands. Anything marked **[OWNER]** is yours to decide or confirm. Page counts, spine widths and costs are the real ones from the built files.\n')
    pk = MADE.get(POCKET['id'], {})
    md.append('''## Read this first
- **Amazon only.** The books are sold on Amazon (KDP) and nowhere else: no shop on the website, no other print service, no discount codes. Expanded distribution stays off. Everything stays free to read online.
- **Free KDP ISBNs (decided).** Every paperback uses a free KDP ISBN: on the Paperback Content screen choose **"Get a free KDP ISBN"**. KDP prints it in the barcode on the back cover, so the copyright pages carry no ISBN line. A free KDP ISBN can only be used for that book in that format on KDP and can't be moved to another publisher, and KDP shows the imprint as **"Independently published"** (the title and copyright pages already say so). The Kindle editions and the box set need no ISBN: leave the Kindle ISBN blank, and Amazon gives each one an ASIN.
- **Prices (the owner's rule).** Every paperback under 100 pages is a short edition at **$9.99**; every longer one is **$14.99**. The build applies the rule to the final page count, so the prices below follow it: the books at $14.99, and the short editions (the pocket guide and both workbook editions) at $9.99.
- **The short editions are listed together**, after the books: the pocket guide, then the two workbook editions. Each keeps its own name.
- **The workbook: publish one of two editions.** The colour edition and a black-and-white interior with the same colour cover are both built, both at $9.99, and listed side by side; the black-and-white one is **recommended** because it keeps more a copy. At $9.99 the colour edition can't use expanded distribution, so it is Amazon only. See "Which workbook edition?". [OWNER]
- **Order a proof copy of every paperback before you publish.** Check the colour, the margins, the QR codes (scan each one) and the spine.
- **Free online and on Amazon.** KDP accepts content that is free on the web when the copyright owner publishes it, and may ask you to show that you own it. Keep an email from your site's domain ready. Because every chapter is free online, **do not enrol any Kindle edition in KDP Select**, the pocket guide and the box set included (see "Kindle extras").
- **The Kindle editions have their own files.** KDP takes EPUB, DOCX or KPF for ebooks; the PDFs here are for print. Upload **book/print/epub/<book>.epub** as the Kindle manuscript (EPUB 3, reflowable: the same chapters as the paperback, no page numbers, live links instead of QR codes; checked with EPUBCheck) and **book/print/cover-<book>-front.jpg** as the Kindle cover. Open each EPUB in Amazon's free Kindle Previewer before you publish. [OWNER]
- **The workbook is print only.** Its forms are made to be written in, and every one is already free to print or fill in on the website, so a Kindle edition would only repeat links (and KDP can turn away ebooks that are mostly links or freely available content). Each Kindle book already links every workpaper to its free form. The workbook has no Kindle row to fill in.
- **The pocket guide** (*%s*, %d pages, 5 × 8 in) is a paperback and a Kindle ebook.
- **No box set in this wave.** The Kindle box set is held back and comes with Book 5, in the second wave, so it is published once with every book in it.
- **Series numbers.** The books are numbered in the series in order. The pocket guide and the workbook are companions and carry **no number**, the same in print and on Kindle.
- **The same answers every time:** British English text on the Amazon.com store is fine; mark the language as English.
''' % (POCKET['title'], pk.get('pages', 0)))
    for item in items:
        bid = item['id']
        kind = 'workbook' if bid in ('workbook', WB_BW['id']) else ('pocket' if bid == POCKET['id'] else ('boxset' if bid == BOXSET['id'] else 'book'))
        d = L[bid]
        m = MADE.get(bid, {})
        c = m.get('costs', {})
        pages = m.get('pages', 0)
        title = item['title']
        num = item.get('n')
        sub = item['sub']
        desc = description(item, d, kind)
        kdp = c.get('kdp_amazon', {})
        price = list_price(bid, kind)
        short = kind != 'boxset' and is_short(bid, kind)
        k_price = item.get('kindle_price_usd') or KINDLE_PRICE
        k_mb = kindle_mb(bid)
        k_net, k_pct = kindle_net(k_price, k_mb)
        has_print = kind != 'boxset'
        has_kindle = kind != 'workbook'
        head = ('Book %d: ' % num) if num else ('Pocket guide: ' if kind == 'pocket' else ('Kindle box set: ' if kind == 'boxset' else ''))
        bw = bid == WB_BW['id']
        if bid == POCKET['id']:
            md.append('\n---\n\n# The short editions (under 100 pages, %s each)\n\nThe pocket guide and the workbook are the series\' short editions. They keep their own names and their own listings; the owner\'s rule simply prices every paperback under 100 pages at %s.\n' % (money(RULE['short_usd']), money(RULE['short_usd'])))
        if bid == 'workbook':
            md.append(workbook_choice())
        if kind == 'workbook':
            head = 'Workbook, %s: ' % ('black-and-white edition (recommended)' if bw else 'colour edition')
        md.append('\n---\n\n## %s%s\n' % (head, title))
        if kind == 'boxset':
            md.append('A Kindle ebook only. There is no print box set: each paperback is listed on its own. The file is **book/print/epub/%s.epub** and the cover **book/print/cover-%s-front.jpg**.\n' % (bid, bid))
        md.append('### Basic details (%s)\n' % ('paperback and Kindle' if has_print and has_kindle else ('paperback' if has_print else 'Kindle')))
        if has_print and has_kindle:
            md.append('| Field | Paperback | Kindle |\n|---|---|---|')
            row = lambda f, a, b: md.append('| %s | %s | %s |' % (f, a, b))
        elif has_print:
            md.append('| Field | Paperback | Kindle |\n|---|---|---|')
            row = lambda f, a, b: md.append('| %s | %s | %s |' % (f, a, b))
        else:
            md.append('| Field | Kindle |\n|---|---|')
            row = lambda f, a, b: md.append('| %s | %s |' % (f, b))
        row('Language', 'English', 'English')
        row('Book title', title, title)
        row('Subtitle', sub, sub)
        if kind == 'book':
            row('Series', '%s, number %s (use "Add to series" so all books show together)' % (SERIES, num), 'the same series, the same number')
        elif kind == 'workbook':
            row('Series', '%s, as a companion with **no number**: add it to the series as related (unnumbered) content if KDP offers that; otherwise leave the series box empty [OWNER: check the series page in KDP]' % SERIES, 'no Kindle edition (print only)')
        elif kind == 'pocket':
            row('Series', '%s, as a companion with **no number**: add it as related (unnumbered) content if KDP offers that; otherwise leave the series box empty [OWNER: check the series page in KDP]' % SERIES, 'the same: the same series, no number')
        else:
            row('Series', '', 'Leave it out of the numbered series, or add it unnumbered if KDP offers that for a box set [OWNER: check the series page in KDP]')
        row('Edition number', '1', '1')
        row('Author', 'Christian (first name only, as on the cover; Author Central lets you add a surname later) [OWNER]', 'Christian')
        row('Publisher', 'Nothing to type: with a free KDP ISBN, KDP shows "Independently published"', 'Leave blank (decided)')
        row('Imprint', '"Independently published" (set by KDP with the free KDP ISBN; the title and copyright pages say the same)', 'Leave blank')
        row('Contributors', 'None. (How the text and pictures were made goes in "AI disclosure", not here.) [OWNER]', 'None')
        row('Publishing rights', '"I own the copyright and I hold the necessary publishing rights."', 'the same')
        row('Primary audience', 'Sexually explicit images or title: **No**. Reading age: leave blank (adults).', 'the same')
        row('Primary marketplace', 'Amazon.com', 'Amazon.com')
        if has_print:
            row('Description', 'below (%d characters of 4,000)' % len(desc), 'no Kindle edition' if not has_kindle else 'the same, word for word' )
        else:
            row('Description', '', 'below (%d characters of 4,000)' % len(desc))
        md.append('\n**Description** (paste into the description box; KDP allows these tags: b, i, u, br, p, ul, ol, li, h4 to h6):\n')
        md.append('```html\n%s\n```\n' % desc)
        md.append('### Categories (pick 3)\nKDP lets you choose three categories for each format. Check that each path is offered in the category picker for **Books** (paperback) and **Kindle eBooks**; the Kindle picker has the same names under "Kindle Store › Kindle eBooks". [OWNER: confirm in the picker]\n')
        md.append('| | Best 3 | Alternates |\n|---|---|---|')
        for i in range(3):
            md.append('| %d | %s | %s |' % (i + 1, d['cats'][i], d['alt'][i]))
        md.append('\n### Keywords (the 7 boxes)\n')
        md.append('| Box | Keyword phrase | Characters |\n|---|---|---|')
        for i, (k, n, bad) in enumerate(kw_ok(item, d), 1):
            md.append('| %d | %s | %d%s |' % (i, k, n, (' (repeats: %s)' % ', '.join(bad)) if bad else ''))
        md.append('\nNo other authors, brands, program names or claims like "best" or "new". Words already in the title, subtitle and series are left out, because Amazon indexes those already. Keywords are never shown to readers, so they use the spellings US shoppers type (apologize, labor); the book itself stays in British English. [OWNER]\n')
        md.append('### Content details: AI disclosure (KDP requires an answer)\n')
        md.append(AI_TEXT)
        if has_print:
            md.append('### Print details%s\n' % (' (the workbook is large trim)' if kind == 'workbook' else (' (the pocket guide is 5 × 8 in)' if kind == 'pocket' else '')))
            trim = {'workbook': '8.5 × 11 in (21.59 × 27.94 cm)', 'pocket': '5 × 8 in (12.7 × 20.32 cm)'}.get(kind, '6 × 9 in (15.24 × 22.86 cm)')
            md.append('| Field | Answer |\n|---|---|')
            md.append('| ISBN | Choose **"Get a free KDP ISBN"**. It can\'t be moved to another publisher, and KDP shows "Independently published" as the imprint. Nothing to paste or rebuild: no ISBN prints inside the book. |')
            md.append('| Publication date | Leave blank (KDP fills in the date it goes live) |')
            md.append('| Print options | Ink and paper: **%s, white paper**. Trim: **%s**. Bleed: **No bleed**. Cover finish: **Matte** (calmer, less glare, hides fingerprints; choose glossy only if the proof looks dull). |' % ('Black & white interior' if bw else 'Standard color', trim))
            md.append('| Page count | %d (KDP reads it from the file)%s |' % (pages, ' — 72 is KDP\'s minimum for standard colour, so the guide is built to 72 to 80 pages' if kind == 'pocket' else ''))
            md.append('| Spine width | %.4f in (%.2f mm): %d pages × 0.002252 in (white paper; the same for black ink and standard colour). Spine text: %s |' % (m.get('spine_in', 0), m.get('spine_mm', 0), pages, 'yes (over 79 pages)' if m.get('spine_text') else 'no (KDP allows it only above 79 pages)'))
            md.append('| Manuscript file | book/print/%s.pdf |' % bid)
            md.append('| Cover file | book/print/cover-%s.pdf (full wrap %.3f × %.2f in, with 0.125 in bleed; the barcode area at the bottom right of the back is left clear for KDP) |' % (bid, m.get('cover_in', [0, 0])[0], m.get('cover_in', [0, 0])[1]))
            md.append('| Is this a low-content book? | **No** |')
            md.append('| Large-print book? | No |')
            md.append('\n### Pricing (paperback)\n')
            md.append('| Marketplace | List price | Printing cost | Your royalty a copy |\n|---|---|---|---|')
            pct = int(round(kdp.get('royalty_rate', 0.6) * 100))
            md.append('| Amazon.com (primary) | %s | %s | **%s** (%d%% × %s − printing) |' % (money(price), money(kdp.get('print', 0)), money(kdp.get('net', 0)), pct, money(price)))
            if short:
                md.append('| Amazon.co.uk | %s | KDP shows it | 60%% (at £7.99 and up) minus printing [OWNER: KDP shows the exact figure] |' % PK_UK)
                md.append('| Amazon.de, .fr, .es, .it, .nl, .ie, .be | %s | KDP shows it | 60%% (at €9.99 and up) minus printing [OWNER] |' % PK_EU)
                md.append('| Amazon.ca | %s | KDP shows it | KDP shows it [OWNER] |' % PK_CA)
                md.append('| Amazon.com.au | %s | KDP shows it | KDP shows it [OWNER] |' % PK_AU)
            else:
                uk_print = UK_FIXED + UK_PER_PAGE * pages
                md.append(('| Amazon.co.uk | %s | about £%.2f (estimate) | about £%.2f (60%% at £7.99 and up) [OWNER: KDP shows the exact figure] |' % (UK_PRICE, uk_print, 0.6 * 11.99 - uk_print))
                          if kind == 'book' else '| Amazon.co.uk | %s | KDP shows it | KDP shows it [OWNER] |' % UK_PRICE)
                md.append('| Amazon.de, .fr, .es, .it, .nl, .ie, .be | %s | KDP shows it | KDP shows it (60%% at €9.99 and up) [OWNER] |' % EU_PRICE)
                md.append('| Amazon.ca | %s | KDP shows it | KDP shows it [OWNER] |' % CA_PRICE)
                md.append('| Amazon.com.au | %s | KDP shows it | KDP shows it [OWNER] |' % AU_PRICE)
            md.append('| Expanded distribution | ' + expanded_text(c, price))
            if kind == 'pocket':
                cost = COSTS['kdp']
                pr = kdp.get('print', 0)
                md.append('\n**Price: $%.2f (the short-edition rule: under 100 pages).** KDP\'s printing cost for a standard-colour paperback at regular trim (5 × 8 in counts as regular) '
                          'is $%.2f a book plus $%.4f a page: $%.2f + %d × $%.4f = **%s**. KDP pays 60%% of the list price from $9.99 up, so 60%% × $%.2f = %s, minus printing, '
                          'leaves **%s a copy**. Below $9.99 it would pay only 50%%, so $9.99 is the lowest price that keeps the higher royalty. The simulated reader panel put its value at about $8.40.\n' % (
                              price, cost['fixed'], cost['per_page'], cost['fixed'], pages, cost['per_page'], money(pr), price, money(round(0.6 * price, 2)), money(kdp.get('net', 0))))
            elif kind == 'workbook':
                cost = COSTS['kdp_bw_large'] if bw else COSTS['kdp_large']
                how = ('black ink, large trim (8.5 × 11 in), 24 to 110 pages: a flat $%.2f a book' % cost['fixed']) if bw else (
                    'standard colour, large trim (8.5 × 11 in): $%.2f + %d × $%.4f' % (cost['fixed'], pages, cost['per_page']))
                md.append('\nPrice: **%s** (the short-edition rule: under 100 pages). Printing: %s = **%s**. Royalty: %d%% × %s − printing = **%s a copy**. %s [OWNER]\n' % (
                    money(price), how, money(kdp.get('print', 0)), int(round(kdp.get('royalty_rate', 0.6) * 100)), money(price), money(kdp.get('net', 0)),
                    'The colour cover costs nothing extra: KDP prints every cover in colour.' if bw else (
                        'At this price the colour edition is **Amazon only**: expanded distribution would need a list price of at least about %s. Compare the black-and-white edition below.'
                        % money(c.get('kdp_expanded', {}).get('min_price') or 0))))
            else:
                md.append('\nThe non-US prices are rounded local equivalents a little above $14.99, so the 60% band applies everywhere. Let KDP\'s "based on Amazon.com" fill them, then round to .99. [OWNER]\n')
        if has_kindle:
            md.append('### Kindle extras\n')
            md.append('| Field | Answer |\n|---|---|')
            ep = EPUB.get(bid, {})
            what = {'pocket': '%d sections, %d situations' % (ep.get('chapters') or 0, len(POCKET['items'])), 'boxset': '5 books, %d chapters and sections' % (ep.get('chapters') or 0)}.get(kind, '%d chapters' % len(item.get('chapters', [])))
            md.append('| Manuscript (ebook) file | **book/print/epub/%s.epub** (EPUB 3, reflowable, %.2f MB, %s%s). Made by tools/book/build_epub.py. |' % (
                bid, k_mb, what, ('; EPUBCheck: ' + ep['epubcheck']['summary']) if (ep.get('epubcheck') or {}).get('summary') else ''))
            md.append('| Kindle cover file | book/print/cover-%s-kindle.jpg (%s, the %s; also inside the EPUB) |' % (
                bid, '1600 × 2560 px, the 1.6:1 shape KDP prefers', 'front of the box set, made for Kindle only' if kind == 'boxset' else 'the paperback front, trimmed slightly at the sides'))
            md.append('| ISBN | Leave blank. Amazon gives the Kindle edition an ASIN. |')
            md.append('| Publisher | Leave blank (decided). |')
            if kind == 'boxset':
                low = 0.35 * 14.99
                md.append('| Kindle price | **$%.2f** with the **70%%** royalty [OWNER: recommended]. About **%s a copy** after delivery (%.2f MB × $0.15 = %s). |' % (k_price, money(k_net), k_mb, money(0.15 * k_mb)))
                md.append('| Why not $14.99 | Amazon.com pays 70%% only from $2.99 to $12.99 (the top of the band rose from $9.99 to $12.99 on 7 July 2026). At $14.99 the royalty drops to 35%%: %s a copy, '
                          'about %s less than at $12.99. $12.99 is also about half the price of the four Kindle books and the pocket guide bought one by one (%s). If you prefer a round "$14.99" '
                          'box set, it pays less. [OWNER] |' % (money(low), money(k_net - low), money(4 * KINDLE_PRICE + POCKET['kindle_price_usd'])))
            elif kind == 'pocket':
                md.append('| Kindle price | **$%.2f** with the **70%%** royalty: 70%% × $%.2f − delivery (%.2f MB × $0.15 = %s) = about **%s a copy**. The owner\'s range is $0.99 to $2.99; '
                          'below $2.99 KDP pays only 35%% (at $0.99, about $0.35 a copy), so $2.99 is the one price in that range that earns 70%%. It is also at least 20%% below the paperback (%s), '
                          'as the 70%% band requires. [OWNER] |' % (k_price, k_price, k_mb, money(0.15 * k_mb), money(k_net), money(price)))
            else:
                md.append('| Kindle price | **$%.2f** with the **70%%** royalty (the 70%% band is $2.99 to $12.99 since 7 July 2026). About %s a copy after delivery (%.2f MB × $0.15 = %s). [OWNER] |' % (k_price, money(k_net), k_mb, money(0.15 * k_mb)))
            md.append('| KDP Select | %s |' % SELECT_NO)
            md.append('| DRM | %s |' % DRM_NO)
            md.append('| Kindle categories and keywords | %s |' % ('as above' if kind == 'boxset' else 'the same as the paperback'))
        else:
            md.append('### Kindle\n**No Kindle edition: the workbook is print only.** It is made to be written in, and every form is already free to print or fill in at spreadloveandacceptance.com/workpapers/fill. A companion ebook would only repeat those links, so there is no file to upload. On the paperback\'s page, leave the Kindle edition empty. Each Kindle book in the series links every workpaper to its free form instead.\n')
        md.append('### Taglines for ads (short and true)\n')
        md.append('\n'.join('- %s' % t for t in TAGLINES[bid]))
        base = {
            'id': bid, 'format': 'paperback', 'title': title, 'subtitle': sub, 'series': SERIES, 'series_number': num or '',
            'edition': 1, 'author': 'Christian', 'publisher': PUBLISHER, 'imprint': IMPRINT,
            'description_html': desc, 'category_1': d['cats'][0], 'category_2': d['cats'][1], 'category_3': d['cats'][2],
            'alt_category_1': d['alt'][0], 'alt_category_2': d['alt'][1], 'alt_category_3': d['alt'][2],
            **{'keyword_%d' % (i + 1): k for i, k in enumerate(d['kw'])},
            'ai_text': 'Yes: entire work, extensive editing [OWNER]', 'ai_images': 'Yes: entire work, extensive editing [OWNER]', 'ai_translations': 'No',
            'isbn': 'Get a free KDP ISBN', 'ink_paper': 'Black & white, white' if bw else 'Standard color, white', 'trim': {'workbook': '8.5 x 11 in', 'pocket': '5 x 8 in'}.get(kind, '6 x 9 in'),
            'bleed': 'No bleed', 'cover_finish': 'Matte', 'pages': pages, 'interior_file': 'book/print/%s.pdf' % bid, 'cover_file': 'book/print/cover-%s.pdf' % bid, 'low_content': 'No',
            'price_usd': '%.2f' % price,
            'price_gbp': PK_UK if short else UK_PRICE, 'price_eur': PK_EU if short else EU_PRICE,
            'price_cad': PK_CA if short else CA_PRICE, 'price_aud': PK_AU if short else AU_PRICE,
            'expanded_distribution': 'No (Amazon only)' + ('; not available at this price' if (c.get('kdp_expanded', {}).get('net', 1) <= 0) else ''), 'printing_cost_usd': kdp.get('print', ''), 'royalty_rate': '%d%%' % int(round(kdp.get('royalty_rate', 0.6) * 100)) if has_print else '',
            'royalty_usd': kdp.get('net', ''), 'kdp_select': '', 'drm': '',
        }
        if has_print:
            rows.append(base)
        if has_kindle:
            rows.append(dict(base, format='kindle', series_number=(num or ''), isbn='Leave blank (ASIN)', publisher='', imprint='', ink_paper='', trim='', bleed='', cover_finish='', pages='',
                             interior_file='book/print/epub/%s.epub' % bid, cover_file='book/print/cover-%s-kindle.jpg' % bid, low_content='', price_usd='%.2f' % k_price,
                             price_gbp='', price_eur='', price_cad='', price_aud='', expanded_distribution='', printing_cost_usd='', royalty_rate='%d%%' % k_pct,
                             royalty_usd='%.2f' % k_net, kdp_select='No', drm='No'))
        else:
            rows.append(dict({k: '' for k in base}, id=bid, format='kindle', title=title, subtitle=sub, series=SERIES,
                             interior_file='None: print only (the forms are free to print online)', cover_file='', isbn='', price_usd=''))
    md.append('\n---\n\n## A+ content ideas (for each book\'s product page)\n')
    md.append('''- **Module 1, the series banner:** the six front covers side by side, with one line under each ("Start with yourself", "For the heavy days", "Between people", "The work nobody sees", "Every form, all in one", "The logic behind a reaction").
- **Module 2, what a chapter looks like:** three panels: a short made-up scene, "Words you could use", and a "Two ways to read this" box, each as a cropped page image.
- **Module 3, meet the three friends:** Professor Puddles, Tidbit and Sugarfoot, with one gentle hint each.
- **Module 4, free online:** "Every chapter is also free online, in a short and a full version, with no account." (Words only; KDP doesn't allow web addresses in A+ content.)
- **Module 5, the workbook and the pocket guide:** a filled-in example sheet beside a blank one, and one page of the pocket guide.
Keep every image free of prices, review quotes and claims like "bestseller". [OWNER]
''')
    pm = MADE.get(POCKET['id'], {}).get('pagemap', {})
    POCKET_FIRST = min([v for k, v in pm.items() if k.startswith('sit-')] or [12])
    md.append('## "Look inside" tips\n')
    md.append('''- Amazon builds "Look inside" from the uploaded files. The front matter is kept short on purpose (title, copyright, contents, one page about the book and how to use it, a one-page “Find it fast”, one page on the workpapers, tools and characters), so a browser reaches Chapter 1 early.
- Chapter 1 of each book opens with a scene, "Words you could use" and a "Try this" box early on, which shows the book's feel at a glance.
- The pocket guide reaches its first situation on page %d, after a short introduction to the six parts.
- For Kindle, KDP shows about the first 10%%. The EPUBs keep the same short front matter: title, copyright, contents, About this book, Find it fast, then the three friends, so Chapter 1 comes early.
''' % POCKET_FIRST)
    md.append('## Author Central bio (short, warm and true)\n')
    md.append('''> Christian spent a career as a government auditor and audit manager, walking into complicated situations and finding out calmly what had really happened, without looking for someone to blame. They brought the same habit home, to the quiet, everyday work of sharing a life, and built Spread Love & Acceptance: a free website and a series of short books about understanding yourself and the people you share a home, work or care with. Everything on the site is free, needs no account, and stays on your own device.

[OWNER: confirm every detail (the About page uses they/them for Christian), and whether you want a photo. Keep it to things that are true and that you're happy to share.]
''')
    md.append('## Sources (looked up October 2026)\n')
    md.append('''- KDP printing cost, standard colour regular trim $1.00 + $0.0255 a page (72 to 600 pages; 72 is the minimum for standard colour), large trim $1.00 + $0.0402: [KDP help, printing costs](https://kdp.amazon.com/en_US/help/topic/G201834340); [Cambric KDP printing cost guide](https://cambric.pub/guides/kdp-printing-cost-guide/).
- KDP printing cost, black ink on Amazon.com: a flat $2.30 a book at regular trim and **$2.84 a book at large trim** (8.5 × 11 in) for 24 to 110 pages, with a per-page charge only above that: [KDP help, printing costs](https://kdp.amazon.com/en_US/help/topic/G201834340) (looked up 18 October 2026).
- Paperback royalty 60% at $9.99 and up, 50% below (since 10 June 2025), 40% expanded distribution: [KDP help](https://kdp.amazon.com/help/topic/G201834330); [Writem on the 2025 change](https://writem.substack.com/p/what-the-new-amazon-print-royalty); UK £7.99 and EU €9.99 thresholds: [Cartmango](https://cartmango.com/kdp-royalties/).
- Spine: standard colour 0.002252 in a page: [KDP help, cover calculator](https://kdp.amazon.com/help/topic/G201953020).
- 70% Kindle band $2.99 to $12.99 from 7 July 2026 (35% outside it), delivery fee: [KDP eBook list price requirements](https://kdp.amazon.com/en_US/help/topic/G200634560); [Authors Guild statement](https://authorsguild.org/news/statement-on-amazon-kdp-raising-70-percent-royalty-ceiling/); [Publishers Lunch](https://lunch.publishersmarketplace.com/2026/07/kdp-raises-price-ceiling-for-70-percent-royalty-rate-for-the-first-time/).
- KDP Select exclusivity and benefits: [Reedsy](https://reedsy.com/blog/guide/kdp/kdp-select); [Scribe Media](https://scribemedia.com/kdp-select/).
- Content free on the web is accepted from the copyright owner: [KDP content guidelines](https://kdp.amazon.com/en_US/help/topic/G200672390).
- AI disclosure definitions (AI-generated vs AI-assisted; text, images, translations): [KDP content guidelines, reposted](https://www.lesswrong.com/posts/4csaBfAgiyzrFXvEj/amazon-kdp-ai-content-guidelines).
- Three categories per format: [KDP help, categories](https://kdp.amazon.com/en_US/help/topic/G200652170); category paths: [Smart KDP category finder](https://smartkdp.com/tools/kdp-category-finder), [PublishRank KDP category list](https://publishrank.io/learn/categories/kdp-category-list). The picker changes; confirm each path there.
- Keyword rules (7 boxes, 50 characters, no author or brand names, no repeats of the title): [publishing.co.uk](https://publishing.co.uk/guides/how-to-choose-kdp-keywords/); [Book Bolt](https://bookbolt.io/navigating-amazons-updated-keyword-policies-for-kdp-a-friendly-guide-for-authors/).
''')
    with open(os.path.join(OUT, 'listing-kdp.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(md) + '\n')
    with open(os.path.join(OUT, 'listing-kdp.csv'), 'w', encoding='utf-8', newline='') as f:
        w = csv.DictWriter(f, fieldnames=list(rows[0].keys()))
        w.writeheader()
        w.writerows(rows)
    for bid, d in L.items():
        for k, n, bad in kw_ok(next(i for i in items if i['id'] == bid), d):
            if n > 50 or bad:
                print('listing: WARNING keyword', bid, k, n, bad)
    for bid in (POCKET['id'],):
        pg = MADE.get(bid, {}).get('pages', 0)
        if not 72 <= pg <= 80:
            print('listing: WARNING %s has %d pages (want 72 to 80)' % (bid, pg))
    print('listing: wrote book/print/listing-kdp.md and .csv (%d rows)' % len(rows))


TAGLINES = {
    'book-1-know-yourself-kindly': ['Get to know yourself, kindly.', 'Where your lens came from, and who you are becoming.', 'Feelings, worth and wiring, in plain words.', 'Short chapters. One small thing to try each week.'],
    'book-2-heal-and-steady': ['For the heavy days.', 'Stress, anger, worry and grief, explained gently.', 'Find your footing again, one small step at a time.', 'No blame. Just steadier days.'],
    'book-3-understanding-each-other': ['Care about each other and still out of tune? Start here.', 'How words land, and how to get back in step.', 'Belonging, love and kinder disagreements.', 'For couples, families, friends and teams.'],
    'book-4-share-the-load': ['See the work nobody sees.', 'Fix the setup, not the person.', 'A fair, kind way to share the chores.', 'For couples, families, housemates and teams.'],
    'workbook': ['Every form, all in one place.', 'Room to write, and spare copies for the weeks ahead.', 'Fill it in on your own or together.', 'The same forms are free online; this one is for your shelf.'],
    POCKET['id']: ['Why did they react like that?', 'Thirty-eight everyday reactions, and the logic behind each one.', 'Both sides of the story, on a single page.', 'Small enough for a pocket. Kind enough to hand over.'],
    'workbook-bw': ['Every form, all in one place.', 'Room to write, and spare copies for the weeks ahead.', 'Fill it in on your own or together.', 'The same forms are free online; this one is for your shelf.'],
    BOXSET['id']: ['The whole series in one Kindle edition.', 'Four short books and a pocket guide.', 'Know yourself, steady yourself, understand each other, share the load.', 'Every chapter is also free to read online.'],
}

if __name__ == '__main__':
    main()
