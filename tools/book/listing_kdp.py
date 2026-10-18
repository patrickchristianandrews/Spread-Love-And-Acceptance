#!/usr/bin/env python3
"""listing_kdp.py: the Amazon KDP listing for every print book and Kindle edition of the series (print12).

    python3 tools/book/listing_kdp.py      writes book/print/listing-kdp.md and book/print/listing-kdp.csv

Reads tools/book/series.json (titles, back-cover words) and book/print/series.json (page counts, spine widths and
costs, written by build_pdfs.js with BOOK_SERIES=1), so run it after the print books are built. Everything the owner
must decide or confirm is marked [OWNER]. Facts about KDP were looked up in October 2026; the sources are listed at
the end of the .md file.
"""
import csv
import json
import os

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'book', 'print')
CFG = json.load(open(os.path.join(HERE, 'series.json'), encoding='utf-8'))
MADE = json.load(open(os.path.join(OUT, 'series.json'), encoding='utf-8')).get('books', {})
SERIES = CFG['series_title']
import sys  # noqa: E402
sys.path.insert(0, HERE)
from build_series import WB  # noqa: E402  (the workbook's sheets and how many copies of each)

# Kindle: the 70% band on Amazon.com is $2.99 to $12.99 since 7 July 2026; delivery is $0.15 a megabyte
KINDLE_PRICE = 5.99
KINDLE_MB = 3.0  # an estimate for a chapter book with colour figures; KDP shows the real file size [OWNER]
UK_PRICE, EU_PRICE, CA_PRICE, AU_PRICE = '£11.99', '€13.99', 'CA$19.99', 'AU$23.99'
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
            'It explains what stress does to the body and why it adds up, what anger is for and what helps in the hot minutes, how worry, low mood and trauma work, and when and where to get help. It walks with you through grief in its many forms, through repair and apologies that land, and through the slow work of change. It ends with what matters to you, and what a good life can mean.',
        ],
        'inside': ['Stress, the ladder, flooding and rest that helps', 'Anger: what it is for, and the hot minutes', 'Worry, low mood and trauma, and where to get help', 'Grief in waves, and losses nobody sees',
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
        'hook': 'Every workpaper from the series, on big pages with room to write.',
        'body': [
            'Inside are blank copies of all ten: a quick check of how much you are carrying, a calm-down kit you make on a calm day, a self-check before you reply to something that stung, a 90-second daily check-in, a one-week log of who did what, a list that gives every job one owner, a monthly look-back, and more.',
            'Each one starts with a short page that says when to use it, how long it takes, who fills it in and which book explains it. Then come spare copies for the weeks ahead, a planner for the six-week program and pages for your own notes. The same forms are free to print or fill in online; this book simply puts them all in one place.',
        ],
        'inside': ['10 workpapers, %d blank copies in all' % sum(w[1] for w in WB), 'A short guide page before each one', 'Single sheets on one page; longer sheets open across two facing pages', 'A six-week planner and lined pages for notes', 'Large 8.5 × 11 in pages'],
        'cats': ['Books › Self-Help › Relationships', 'Books › Parenting & Relationships › Marriage & Adult Relationships', 'Books › Self-Help › Communication & Social Skills'],
        'alt': ['Books › Self-Help › Stress Management', 'Books › Parenting & Relationships › Family Relationships', 'Books › Self-Help › Personal Transformation'],
        'kw': ['communication workbook for couples', 'relationship worksheets for couples', 'chore chart for couples and families', 'self help workbook for adults',
               'family meeting planner', 'calm down plan for adults', 'couples check in journal'],
    },
}


def esc(s):
    return s.replace('&', '&amp;').replace('<', '&lt;').replace('>', '&gt;')


def description(item, d, workbook=False):
    h = '<p><b>%s</b></p>' % esc(d['hook'])
    h += ''.join('<p>%s</p>' % esc(p) for p in d['body'])
    h += '<p><b>%s</b></p><ul>%s</ul>' % ('Inside' if workbook else 'Inside this book', ''.join('<li>%s</li>' % esc(x) for x in d['inside']))
    if workbook:
        h += '<p>The sheets describe what happened, never who someone is. Fill them in on your own or together; on shared sheets each person writes only their own rows.</p>'
    else:
        h += ('<p>Each chapter has everyday scenes (all made up), words you could use and one small thing to try this week. Three friendly characters, Professor Puddles, '
              'Tidbit and Sugarfoot, drop in with hints, and keep to the lighter pages. Where a chapter touches hard things, it says where to find help.</p>')
        h += '<p><b>Part of a series.</b> %s is a series of short books that each stand on their own, plus a workbook with every form. Read them in any order.</p>' % esc(SERIES)
    h += ('<p><i>Every chapter is also free to read online, in a short and a full version, with no account. The print and Kindle editions are for readers who '
          'prefer a book in hand. This book is general education, not therapy or a diagnosis.</i></p>')
    return h


def kw_ok(item, d):
    title = (item['title'] + ' ' + item.get('sub', '') + ' ' + SERIES).lower()
    tw = set(w.strip('.,:;!?’') for w in title.split() if len(w) > 3)
    out = []
    for k in d['kw']:
        bad = [w for w in k.split() if w in tw]
        out.append((k, len(k), bad))
    return out


def money(x):
    return '$%.2f' % x


def main():
    items = CFG['books'] + [CFG['workbook']]
    md, rows = [], []
    md.append('# Amazon KDP listing: %s print series and Kindle editions\n' % SERIES)
    md.append('Made by tools/book/listing_kdp.py (print12) from tools/book/series.json and the built books in book/print/. '
              'Copy each field into KDP as it stands. Anything marked **[OWNER]** is yours to decide or confirm. Page counts, spine widths and costs are the real ones from the built files.\n')
    md.append('''## Read this first
- **One account, your own ISBNs.** Use your own Bowker ISBN for each paperback (one per book and format). The Kindle edition needs no ISBN; Amazon gives it an ASIN. [OWNER]
- **Order a proof copy of every paperback before you publish.** Check the colour, the margins, the QR codes (scan each one) and the spine.
- **Free online and on Amazon.** KDP accepts content that is free on the web when the copyright owner publishes it, and may ask you to show that you own it. Keep an email from your site's domain ready. Because every chapter is free online, **do not enrol the Kindle editions in KDP Select** (see "Kindle extras").
- **The Kindle editions need their own files.** KDP takes EPUB, DOCX or KPF for ebooks; the PDFs here are for print. A reflowable EPUB of each book still has to be made (the same chapters, without page numbers, with live links instead of QR codes). [OWNER: ask for it]
- **The same answers every time:** British English text on the Amazon.com store is fine; mark the language as English.
''')
    for item in items:
        bid = item['id']
        d = L[bid]
        m = MADE.get(bid, {})
        wb = bid == 'workbook'
        c = m.get('costs', {})
        pages = m.get('pages', 0)
        title = item['title']
        num = item.get('n')
        sub = item['sub']
        desc = description(item, d, wb)
        kdp = c.get('kdp_amazon', {})
        uk_print = UK_FIXED + UK_PER_PAGE * pages if not wb else None
        uk_net = (0.6 * 11.99 - uk_print) if uk_print else None
        k_del = 0.15 * KINDLE_MB
        k_net = 0.70 * KINDLE_PRICE - k_del
        md.append('\n---\n\n## %s%s\n' % (('Book %d: ' % num) if num else '', title))
        md.append('### Basic details (paperback and Kindle)\n')
        md.append('| Field | Paperback | Kindle |\n|---|---|---|')
        md.append('| Language | English | English |')
        md.append('| Book title | %s | %s |' % (title, title))
        md.append('| Subtitle | %s | %s |' % (sub, sub))
        md.append('| Series | %s, number %s (use "Add to series" so all books show together) | the same series, the same number |' % (SERIES, num if num else '5 [OWNER: or leave the workbook out of the numbered series]'))
        md.append('| Edition number | 1 | 1 |')
        md.append('| Author | Christian (first name only, as on the cover; Author Central lets you add a surname later) [OWNER] | Christian |')
        md.append('| Contributors | None. (How the text and pictures were made goes in "AI disclosure", not here.) [OWNER] | None |')
        md.append('| Publishing rights | "I own the copyright and I hold the necessary publishing rights." | the same |')
        md.append('| Primary audience | Sexually explicit images or title: **No**. Reading age: leave blank (adults). | the same |')
        md.append('| Primary marketplace | Amazon.com | Amazon.com |')
        md.append('| Description | below (%d characters of 4,000) | the same, but replace the last line about print with: "The paperback has the same chapters." |' % len(desc))
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
        md.append('''KDP asks three separate questions: did you use AI-based tools to create the **text**, the **images**, or **translations**? KDP's own definitions:
- **AI-generated** means an AI-based tool created the actual content, *even if you edited it a lot afterwards*. This must be disclosed.
- **AI-assisted** means you created the content yourself and used AI to edit, check, brainstorm or improve it. This does not need to be disclosed.

Honest answers for this book, as it was made [OWNER: confirm; only you know your own process]:

| Question | Answer to choose | Why |
|---|---|---|
| Text | **Yes**: "Entire work, with extensive editing" | The chapters were drafted with AI writing tools and then reviewed and edited many times. If you wrote any book entirely yourself and only used AI to edit it, choose "No" for that book instead. |
| Images | **Yes**: "Entire work, with extensive editing" | The covers, characters and figures are drawn by code that was written with an AI tool. |
| Translations | **No** | The book is in English only. |

The answers are seen by Amazon, not printed on the product page.
''')
        if not wb:
            md.append('### Print details\n')
        else:
            md.append('### Print details (the workbook is large trim)\n')
        md.append('| Field | Answer |\n|---|---|')
        md.append('| ISBN | Your own Bowker ISBN: `%s` [OWNER: buy and paste; also add it to tools/book/series.json so it prints on the copyright page] |' % (item.get('isbn') or 'ISBN-13 to come'))
        md.append('| Publication date | Leave blank (KDP fills in the date it goes live) |')
        md.append('| Print options | Ink and paper: **Standard color, white paper**. Trim: **%s**. Bleed: **No bleed**. Cover finish: **Matte** (calmer, less glare, hides fingerprints; choose glossy only if the proof looks dull). |' % ('8.5 × 11 in (21.59 × 27.94 cm)' if wb else '6 × 9 in (15.24 × 22.86 cm)'))
        md.append('| Page count | %d (KDP reads it from the file) |' % pages)
        md.append('| Spine width | %.4f in (%.2f mm): %d pages × 0.002252 in. Spine text: %s |' % (m.get('spine_in', 0), m.get('spine_mm', 0), pages, 'yes (over 79 pages)' if m.get('spine_text') else 'no'))
        md.append('| Manuscript file | book/print/%s.pdf |' % bid)
        md.append('| Cover file | book/print/cover-%s.pdf (full wrap %.3f × %.2f in, with 0.125 in bleed; the barcode area at the bottom right of the back is left clear for KDP) |' % (bid, m.get('cover_in', [0, 0])[0], m.get('cover_in', [0, 0])[1]))
        md.append('| Is this a low-content book? | **No** |')
        md.append('| Large-print book? | No |')
        md.append('\n### Pricing\n')
        md.append('| Marketplace | List price | Printing cost | Your royalty a copy |\n|---|---|---|---|')
        md.append('| Amazon.com (primary) | $14.99 | %s | %s (60%% × $14.99 − printing) |' % (money(kdp.get('print', 0)), money(kdp.get('net', 0))))
        md.append('| Amazon.co.uk | %s | about £%.2f (estimate) | about £%.2f (60%% at £7.99 and up) [OWNER: KDP shows the exact figure] |' % (UK_PRICE, uk_print or 0, uk_net or 0) if not wb else '| Amazon.co.uk | %s | KDP shows it | KDP shows it [OWNER] |' % UK_PRICE)
        md.append('| Amazon.de, .fr, .es, .it, .nl, .ie, .be | %s | KDP shows it | KDP shows it (60%% at €9.99 and up) [OWNER] |' % EU_PRICE)
        md.append('| Amazon.ca | %s | KDP shows it | KDP shows it [OWNER] |' % CA_PRICE)
        md.append('| Amazon.com.au | %s | KDP shows it | KDP shows it [OWNER] |' % AU_PRICE)
        md.append('| Expanded distribution | **No** | %s | would be %s (40%% × $14.99 − printing). Use IngramSpark for bookshops and libraries instead (about %s a copy at a 40%% discount), and with your own ISBN the two can\'t both be on. |' % (
            money(c.get('kdp_expanded', {}).get('print', 0)), money(c.get('kdp_expanded', {}).get('net', 0)), money(c.get('ingram_bookshops', {}).get('net', 0))))
        md.append('\nThe non-US prices are rounded local equivalents a little above $14.99, so the 60% band applies everywhere. Let KDP\'s "based on Amazon.com" fill them, then round to .99. [OWNER]\n')
        if not wb:
            md.append('### Kindle extras\n')
            md.append('| Field | Answer |\n|---|---|')
            md.append('| Kindle price | **$%.2f** with the **70%%** royalty (the 70%% band is $2.99 to $12.99 since 7 July 2026). About %s a copy after delivery (≈ %.0f MB × $0.15). [OWNER] |' % (KINDLE_PRICE, money(k_net), KINDLE_MB))
            md.append('| KDP Select | **No.** Select needs the ebook to be exclusive to Amazon in digital form, and every chapter is free on your website and in free PDFs. Pros you give up: Kindle Unlimited page reads, 5 free-promotion days or Countdown Deals per 90 days. Cons you avoid: 90-day auto-renewing exclusivity, and having to take the free online book down. |')
            md.append('| DRM | **No DRM.** The same chapters are free online, so DRM protects nothing and only gets in readers\' way. (KDP doesn\'t let you change this after publishing.) [OWNER] |')
            md.append('| Kindle categories and keywords | the same as the paperback |')
        else:
            md.append('### Kindle\nNo Kindle edition: the workbook is made to be written in. (Its forms are free to print online.)\n')
        md.append('### Taglines for ads (short and true)\n')
        md.append('\n'.join('- %s' % t for t in TAGLINES[bid]))
        rows.append({
            'id': bid, 'format': 'paperback', 'title': title, 'subtitle': sub, 'series': SERIES, 'series_number': num or '', 'edition': 1, 'author': 'Christian',
            'description_html': desc, 'category_1': d['cats'][0], 'category_2': d['cats'][1], 'category_3': d['cats'][2],
            'alt_category_1': d['alt'][0], 'alt_category_2': d['alt'][1], 'alt_category_3': d['alt'][2],
            **{'keyword_%d' % (i + 1): k for i, k in enumerate(d['kw'])},
            'ai_text': 'Yes: entire work, extensive editing [OWNER]', 'ai_images': 'Yes: entire work, extensive editing [OWNER]', 'ai_translations': 'No',
            'isbn': item.get('isbn') or '[OWNER]', 'ink_paper': 'Standard color, white', 'trim': '8.5 x 11 in' if wb else '6 x 9 in', 'bleed': 'No bleed', 'cover_finish': 'Matte',
            'pages': pages, 'interior_file': 'book/print/%s.pdf' % bid, 'cover_file': 'book/print/cover-%s.pdf' % bid, 'low_content': 'No',
            'price_usd': '14.99', 'price_gbp': UK_PRICE, 'price_eur': EU_PRICE, 'price_cad': CA_PRICE, 'price_aud': AU_PRICE,
            'expanded_distribution': 'No', 'printing_cost_usd': kdp.get('print', ''), 'royalty_usd': kdp.get('net', ''), 'kdp_select': '', 'drm': '',
        })
        if not wb:
            rows.append(dict(rows[-1], format='kindle', isbn='(none: ASIN)', ink_paper='', trim='', bleed='', cover_finish='', pages='', interior_file='EPUB to make [OWNER]',
                             cover_file='book/print/cover-%s-front.jpg' % bid, low_content='', price_usd='%.2f' % KINDLE_PRICE, price_gbp='', price_eur='', price_cad='', price_aud='',
                             expanded_distribution='', printing_cost_usd='', royalty_usd='%.2f' % k_net, kdp_select='No', drm='No'))
    md.append('\n---\n\n## A+ content ideas (for each book\'s product page)\n')
    md.append('''- **Module 1, the series banner:** the five front covers side by side, with one line under each ("Start with yourself", "For the heavy days", "Between people", "The work nobody sees", "Every form, all in one").
- **Module 2, what a chapter looks like:** three panels: a short made-up scene, "Words you could use", and "Try this", each as a cropped page image.
- **Module 3, meet the three friends:** Professor Puddles, Tidbit and Sugarfoot, with one gentle hint each.
- **Module 4, free online:** "Every chapter is also free online, in a short and a full version, with no account." (Words only; KDP doesn't allow web addresses in A+ content.)
- **Module 5, the workbook:** a two-page spread of a filled-in example sheet (made-up names) beside a blank one.
Keep every image free of prices, review quotes and claims like "bestseller". [OWNER]
''')
    md.append('## "Look inside" tips\n')
    md.append('''- Amazon builds "Look inside" from the uploaded files. The front matter is kept short on purpose (title, copyright, contents, one page on the characters, the help page), so a browser reaches Chapter 1 within 7 pages.
- Chapter 1 of each book opens with a scene, "Words you could use" and a "Try this" box early on, which shows the book's feel at a glance.
- For Kindle, KDP shows about the first 10%: keep the same short front matter in the EPUB, and put the help page right after the contents.
''')
    md.append('## Author Central bio (short, warm and true)\n')
    md.append('''> Christian spent a career as a government auditor and audit manager, walking into complicated situations and finding out calmly what had really happened, without looking for someone to blame. He brought the same habit home, to the quiet, everyday work of sharing a life, and built Spread Love & Acceptance: a free website and a series of short books about understanding yourself and the people you share a home, work or care with. Everything on the site is free, needs no account, and stays on your own device.

[OWNER: confirm every detail, the pronoun, and whether you want a photo. Keep it to things that are true and that you're happy to share.]
''')
    md.append('## Sources (looked up October 2026)\n')
    md.append('''- KDP printing cost, standard colour regular trim $1.00 + $0.0255 a page (72 to 600 pages), large trim $1.00 + $0.0402: [KDP help, printing costs](https://kdp.amazon.com/en_US/help/topic/G201834340); [Cambric KDP printing cost guide](https://cambric.pub/guides/kdp-printing-cost-guide/).
- Paperback royalty 60% at $9.99 and up (50% below, since 10 June 2025), 40% expanded distribution: [KDP help](https://kdp.amazon.com/help/topic/G201834330); UK £7.99 and EU €9.99 thresholds: [Cartmango](https://cartmango.com/kdp-royalties/).
- Spine: standard colour 0.002252 in a page: [KDP help, cover calculator](https://kdp.amazon.com/help/topic/G201953020).
- 70% Kindle band $2.99 to $12.99 from 7 July 2026, delivery fee: [KDP eBook list price requirements](https://kdp.amazon.com/en_US/help/topic/G200634560); [Publishers Lunch](https://lunch.publishersmarketplace.com/2026/07/kdp-raises-price-ceiling-for-70-percent-royalty-rate-for-the-first-time/).
- KDP Select exclusivity and benefits: [Reedsy](https://reedsy.com/blog/guide/kdp/kdp-select); [Scribe Media](https://scribemedia.com/kdp-select/).
- Content free on the web is accepted from the copyright owner: [KDP content guidelines](https://kdp.amazon.com/en_US/help/topic/G200672390).
- AI disclosure definitions (AI-generated vs AI-assisted; text, images, translations): [KDP content guidelines, reposted](https://www.lesswrong.com/posts/4csaBfAgiyzrFXvEj/amazon-kdp-ai-content-guidelines).
- Three categories per format: [KDP help, categories](https://kdp.amazon.com/en_US/help/topic/G200652170); category paths: [Smart KDP category finder](https://smartkdp.com/tools/kdp-category-finder), [PublishRank KDP category list](https://publishrank.io/learn/categories/kdp-category-list). The picker changes; confirm each path there.
- Keyword rules (7 boxes, 50 characters, no author or brand names, no repeats of the title): [publishing.co.uk](https://publishing.co.uk/guides/how-to-choose-kdp-keywords/); [Book Bolt](https://bookbolt.io/navigating-amazons-updated-keyword-policies-for-kdp-a-friendly-guide-for-authors/).
- IngramSpark standard colour 50lb, small trim $1.16 + $0.0249 a page (rate card from 1 Feb 2026), market access fee 1.875%: [IngramSpark rate card](https://www.ingramspark.com/hubfs/Rate%20Card_IngramSpark_2026.pdf); [ALLi](https://allianceindependentauthors.substack.com/p/what-ingramsparks-2026-pricing-changes).
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
    print('listing: wrote book/print/listing-kdp.md and .csv (%d rows)' % len(rows))


TAGLINES = {
    'book-1-know-yourself-kindly': ['Get to know yourself, kindly.', 'Where your lens came from, and who you are becoming.', 'Feelings, worth and wiring, in plain words.', 'Short chapters. One small thing to try each week.'],
    'book-2-heal-and-steady': ['For the heavy days.', 'Stress, anger, worry and grief, explained gently.', 'Find your footing again, one small step at a time.', 'No blame. Just steadier days.'],
    'book-3-understanding-each-other': ['Care about each other and still out of tune? Start here.', 'How words land, and how to get back in step.', 'Belonging, love and kinder disagreements.', 'For couples, families, friends and teams.'],
    'book-4-share-the-load': ['See the work nobody sees.', 'Fix the setup, not the person.', 'A fair, kind way to share the chores.', 'For couples, families, housemates and teams.'],
    'workbook': ['Every form, all in one place.', 'Room to write, and spare copies for the weeks ahead.', 'Fill it in on your own or together.', 'The same forms are free online; this one is for your shelf.'],
}

if __name__ == '__main__':
    main()
