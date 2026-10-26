#!/usr/bin/env python3
"""kdp_steps.py: "Amazon KDP, step by step" for the owner (voice17).

A plain walk-through of every KDP screen, in the order KDP shows them, for each paperback (the books, the pocket guide,
the recommended black-and-white workbook, with a note for the color workbook) and each Kindle ebook (the books, the
pocket guide; the Kindle box set is held back for the second wave). Every value is copied from the same data as book/print/listing-kdp.md (tools/book/listing_kdp.py)
and from the built files (book/print/series.json), so page counts, spine widths and prices are the real ones.

Run from the repo root, after the builds and listing_kdp.py:
    python3 tools/book/kdp_steps.py [out_dir]
It writes Amazon-KDP-step-by-step.md and Amazon-KDP-step-by-step.html (default out_dir: book/print). Print the HTML to PDF
with Chromium (A5 pages, readable on a phone and printable), for example:
    NODE_PATH=$(npm root -g) node -e "...page.pdf(...)"      (the voice17 bundle step does this)

Field names were checked in October 2026 against KDP help pages, through web search (kdp.amazon.com itself could not be
opened from the build machine). Where a field could not be confirmed, the text says so instead of guessing.
"""
import html
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import listing_kdp as LK  # noqa: E402

OUT = sys.argv[1] if len(sys.argv) > 1 else LK.OUT
MADE = LK.MADE
CFG = LK.CFG
SERIES = LK.SERIES

HELP = [
    ('Paperback submission guidelines', 'https://kdp.amazon.com/en_US/help/topic/G201857950'),
    ('Paperback content: print options and cover finish', 'https://kdp.amazon.com/en_US/help/topic/G201834180'),
    ('Create a paperback cover (spine, bleed, barcode)', 'https://kdp.amazon.com/en_US/help/topic/G201953020'),
    ('Fix paperback formatting issues (previewer)', 'https://kdp.amazon.com/en_US/help/topic/G201834260'),
    ('ISBNs for paperbacks, and imprints', 'https://kdp.amazon.com/en_US/help/topic/G201834170'),
    ('Primary audience and the sexually explicit question', 'https://kdp.amazon.com/en_US/help/topic/G201276790'),
    ('Categories', 'https://kdp.amazon.com/en_US/help/topic/G200652170'),
    ('Which book details can change after publishing', 'https://kdp.amazon.com/en_US/help/topic/G200634470'),
    ('Digital Rights Management (DRM)', 'https://kdp.amazon.com/en_US/help/topic/GDDXGH9VR22ACM8U'),
    ('Order proof and author copies', 'https://kdp.amazon.com/en_US/help/topic/GVEG4YA9G2T7N6DR'),
    ('Paperback printing cost (black ink, large trim)', 'https://kdp.amazon.com/help/topic/G201834340'),
]

UNVERIFIED = ('Not confirmed: KDP’s own screens could not be opened from the build machine, and the help pages found by search did not mention this box. '
              'If KDP shows it, the answer here is the safe one.')


def money(x):
    return '$%.2f' % x


def items():
    """the products, in publishing order"""
    books = CFG['books']
    wb, wbbw, pocket, box = CFG['workbook'], LK.WB_BW, LK.POCKET, LK.BOXSET
    out = []
    for b in books:
        out.append(dict(b, kind='book'))
    out.append(dict(pocket, kind='pocket'))
    out.append(dict(wbbw, kind='workbook', bw=True))
    out.append(dict(wb, kind='workbook', bw=False))
    # books-final9: the Kindle box set is held back for the second wave, with Book 5
    return out


def label(it):
    if it['kind'] == 'book':
        return 'Book %d: %s' % (it['n'], it['title'])
    # voice18: the paperbacks under 100 pages are grouped as the short editions, each keeping its own name
    if it['kind'] == 'pocket':
        return 'Short edition, pocket guide: %s' % it['title']
    if it['kind'] == 'workbook':
        return 'Short edition, workbook (%s): %s' % ('black-and-white, recommended' if it.get('bw') else 'color, the alternative', it['title'])
    return 'Box set (Kindle only): %s' % it['title']


def series_line(it, fmt):
    if it['kind'] == 'book':
        return '%s, number %d' % (SERIES, it['n'])
    if it['kind'] in ('pocket', 'workbook'):
        # books-final9: the companions carry no series number, the same in print and on Kindle
        return '%s, as a companion with no number: add it as related (unnumbered) content if KDP offers that; otherwise leave the series box empty [OWNER: check the series page in KDP]' % SERIES
    return 'Leave it out of the numbered series [OWNER: KDP may not offer a box set a number]'


def details_rows(it, fmt):
    d = LK.L[it['id']]
    kind = it['kind']
    desc = LK.description(it, d, 'book' if kind == 'book' else kind)
    if fmt == 'kindle' and kind != 'boxset':
        desc = desc.replace('The print and Kindle editions are for readers who prefer a book in hand.', 'The paperback has the same %s.' % ('pages' if kind == 'pocket' else 'chapters'))
    rows = [
        ('Language', 'English'),
        ('Book Title', it['title']),
        ('Subtitle', it['sub']),
        ('Series', series_line(it, fmt) + '. Use the series button (“Add series details” in the guides; the name was not confirmed), type the series name exactly as here, and give the number. The other books join the same series.'),
        ('Edition Number', '1'),
        ('Author (Primary Author or Contributor)', 'First name: Christian. Last name: leave empty if KDP allows it, or add yours [OWNER]. It must match the cover and be the same on every edition, so Amazon links the paperback and the Kindle edition.'),
        ('Contributors', 'None. (How the words and pictures were made is answered on the Content screen, not here.)'),
        ('Description', 'Paste the text in the box under this table (%d characters; KDP allows 4,000).' % len(desc)),
        ('Publishing Rights', '“I own the copyright and I hold the necessary publishing rights.”'),
        ('Primary Audience: Sexually Explicit Images or Title', 'No'),
        ('Primary Audience: Reading age', 'Leave both boxes empty (the books are for adults).'),
        ('Primary marketplace', 'Amazon.com'),
        ('Categories', 'Click “Choose categories” and pick these three: ' + '; '.join('%d. %s' % (i + 1, c) for i, c in enumerate(d['cats'])) +
         '. If one is missing in the picker, use the alternate in the same position: ' + '; '.join(d['alt']) + '. [OWNER: confirm in the picker]'),
        ('Keywords (7 boxes)', ' | '.join('%d. %s' % (i + 1, k) for i, k in enumerate(d['kw']))),
    ]
    if fmt == 'kindle':
        rows.append(('Pre-order', '“I am ready to release my book now.” (A pre-order is possible but not needed.)'))
    else:
        rows.append(('Large-print book / Low-content book (if shown)', 'Leave both unticked. ' + UNVERIFIED))
    return rows, desc


def paperback_content_rows(it):
    m = MADE.get(it['id'], {})
    kind = it['kind']
    bw = it.get('bw')
    trim = {'workbook': '8.5 x 11 in (21.59 x 27.94 cm)', 'pocket': '5 x 8 in (12.7 x 20.32 cm)'}.get(kind, '6 x 9 in (15.24 x 22.86 cm)')
    return [
        ('Print ISBN', 'Choose “Get a free KDP ISBN” (decided). KDP assigns the number and prints it in the barcode on the back cover. A free KDP ISBN can’t be moved to another publisher, and KDP shows “Independently published” as the imprint. Nothing to paste and nothing to rebuild: no ISBN prints inside the book.'),
        ('Imprint', 'Nothing to type: KDP sets it to “Independently published,” which is what the title and copyright pages already say.'),
        ('Publication Date', 'Leave empty. KDP fills it in when the book goes live.'),
        ('Print Options: Ink and Paper Type', '%s, white paper' % ('Black & white interior' if bw else 'Standard color interior')),
        ('Print Options: Trim Size', trim),
        ('Print Options: Bleed Settings', 'No Bleed'),
        ('Print Options: Paperback cover finish', 'Matte [OWNER: choose Glossy only if the proof looks dull]'),
        ('Reading direction (if shown)', 'Left to right. ' + UNVERIFIED),
        ('Manuscript', 'Upload %s from the package (%d pages; KDP reads the count from the file).' % (m.get('pdf', it['id'] + '.pdf'), m.get('pages', 0))),
        ('Book Cover', '“Upload a cover you already have (print-ready PDF only),” then upload %s (full wrap %.4f x %.2f in, spine %.4f in = %d pages x 0.002252 in, 0.125 in bleed, barcode area left clear). Do not use Cover Creator.' % (
            m.get('cover_pdf', 'cover-' + it['id'] + '.pdf'), m.get('cover_in', [0, 0])[0], m.get('cover_in', [0, 0])[1], m.get('spine_in', 0), m.get('pages', 0))),
        ('AI-Generated Content', 'See “The AI questions” near the start of this guide. Answer truthfully about how this book was made.'),
        ('Book Preview', 'Click “Launch Previewer.” Wait for it to load, then page through every spread: nothing important near the edges, the spine text centered, no red warnings, the QR codes sharp. Click “Approve” when it looks right. If it reports a problem, stop and see “If the previewer complains.”'),
        ('Summary', 'KDP shows the printing cost. It should be %s on Amazon.com. If it is different, check that the page count and ink choice above are right.' % money(m.get('costs', {}).get('kdp_amazon', {}).get('print', 0))),
    ]


def paperback_pricing_rows(it):
    m = MADE.get(it['id'], {})
    c = m.get('costs', {})
    kdp = c.get('kdp_amazon', {})
    kind = it['kind']
    bw = it.get('bw')
    price = LK.list_price(it['id'], kind)
    cheap = price < LK.RULE['regular_usd']
    uk, eu, ca, au = (LK.PK_UK, LK.PK_EU, LK.PK_CA, LK.PK_AU) if cheap else (LK.UK_PRICE, LK.EU_PRICE, LK.CA_PRICE, LK.AU_PRICE)
    rec = (' (the owner’s rule: under %d pages is a short edition at %s)' % (LK.RULE['short_under_pages'], money(LK.RULE['short_usd']))) if cheap else (
        ' (the owner’s rule: %d pages or more is %s)' % (LK.RULE['short_under_pages'], money(LK.RULE['regular_usd'])))
    ex = c.get('kdp_expanded', {})
    if ex.get('net', 0) <= 0:
        exp = ('Leave it unticked: this edition is Amazon only. At %s KDP can’t offer expanded distribution at all (40%% of %s is less than the %s printing cost; '
               'it would need a list price of about %s or more).' % (money(price), money(price), money(ex.get('print', 0)), money(ex.get('min_price') or 0)))
    else:
        exp = 'Leave it unticked. The books are sold on Amazon only (and at %s it would pay only %s a copy).' % (money(price), money(ex.get('net', 0)))
    return [
        ('Territories', '“All territories (worldwide rights)”'),
        ('Primary marketplace', 'Amazon.com'),
        ('Royalty', '60% (KDP pays 60% of the list price minus printing at $9.99 and above on Amazon.com, 50% below that).'),
        ('Amazon.com list price', '%s%s. Printing %s, so you keep about %s a copy (%s).' % (money(price), rec, money(kdp.get('print', 0)), money(kdp.get('net', 0)), kdp.get('how', ''))),
        ('Amazon.co.uk', uk + ' [OWNER: KDP shows the exact royalty]'),
        ('Amazon.de, .fr, .es, .it, .nl, .ie, .be', eu),
        ('Amazon.ca', ca),
        ('Amazon.com.au', au),
        ('Other marketplaces (.co.jp, .pl, .se and so on)', 'Leave them “based on Amazon.com.” KDP converts the price.'),
        ('Expanded Distribution', exp),
        ('Request a proof copy', 'Do this before you publish. On your Bookshelf, click the “…” button next to the book and choose “Request Printed Proofs.” Up to 5 copies an order; they carry a “Not for Resale” mark; shipping is not free.'),
        ('Terms & Conditions', 'Read, then “Publish Your Paperback Book” only after the proof has been checked.'),
    ]


def kindle_content_rows(it):
    ep = LK.EPUB.get(it['id'], {})
    front = 'cover-%s-kindle.jpg' % it['id']
    return [
        ('Manuscript', 'Upload %s.epub from the package (EPUB 3, %.2f MB). Do not upload the PDF.' % (it['id'], LK.kindle_mb(it['id']))),
        ('Digital Rights Management (DRM)', 'Choose No (do not apply DRM). The same chapters are free online, so DRM protects nothing. KDP’s help page now says this setting can be changed later, and that without DRM verified buyers can download an EPUB and PDF copy (from January 20, 2026). [OWNER]'),
        ('Kindle eBook Cover', '“Upload a cover you already have,” then upload %s (1,600 × 2,560 px, JPG, the 1.6:1 shape KDP prefers). Do not use Cover Creator.' % front),
        ('AI-Generated Content', 'See “The AI questions.” Same honest answers as the paperback.'),
        ('Kindle eBook Preview', 'Click “Launch Previewer.” Check on the phone, tablet and Kindle views: the contents page works, the links open, the pictures show, nothing is cut off. Then “Approve.” You can also open the EPUB in the free Kindle Previewer app on your computer first.'),
        ('Kindle eBook ISBN (optional)', 'Leave blank. Amazon gives the ebook an ASIN.'),
        ('Publisher (optional)', 'Leave blank (decided).'),
        ('EPUBCheck result (for you, not KDP)', (ep.get('epubcheck') or {}).get('summary', 'see the README')),
    ]


def kindle_pricing_rows(it):
    kind = it['kind']
    k_price = it.get('kindle_price_usd') or LK.KINDLE_PRICE
    mb = LK.kindle_mb(it['id'])
    net, pct = LK.kindle_net(k_price, mb)
    rec = ' [OWNER: recommended]' if kind in ('boxset', 'pocket') else ' [OWNER]'
    return [
        ('KDP Select Enrollment', 'Leave it unticked. Select needs the ebook to be exclusive to Amazon in digital form, and every chapter is free on your website and in free PDFs. You give up Kindle Unlimited reads and the free-promotion days; you avoid a 90-day exclusivity that renews by itself.'),
        ('Territories', '“All territories (worldwide rights)”'),
        ('Primary marketplace', 'Amazon.com'),
        ('Royalty Plan', '70% (the 70% band on Amazon.com is $2.99 to $12.99 since July 7, 2026, according to several guides; KDP’s screen shows the band). With 70%, KDP also takes a delivery fee of about $0.15 a megabyte.'),
        ('Amazon.com list price', '%s%s: about %s a copy at %d%% (%.2f MB file).' % (money(k_price), rec, money(net), pct, mb)),
        ('Other marketplaces', 'Let KDP set them “based on Amazon.com,” then around to .99 if you like. Keep each at least 20% below that marketplace’s paperback price (a 70% rule).'),
        ('Book Lending (if shown)', 'Leave lending on. ' + UNVERIFIED),
        ('Terms & Conditions', 'Read, then “Publish Your Kindle eBook.”'),
    ]


def ai_section():
    return [
        'KDP asks, on the Content screen of every book, whether you used AI-based tools to create the book’s **texts**, **images** or **translations**. You answer each one separately. The answer is for Amazon and is not shown on the product page.',
        '**What the words mean (KDP’s definitions, as reported in October 2026):** “AI-generated” means an AI tool created the actual words or pictures, even if you then edited them heavily. That must be disclosed. “AI-assisted” means you created the work yourself and used AI only to brainstorm, edit, check or improve it. That does not need to be disclosed.',
        '**The choices for each question** (as reported, so check the screen) are “None,” “Some sections, with minimal or no editing,” “Some sections, with extensive editing,” “Entire work, with minimal or no editing” and “Entire work, with extensive editing.”',
        '**[OWNER] Only you can answer, because only you know how each book was made.** Answer truthfully. For your own reference, the build notes (listing-kdp.md) record that these chapters were drafted with AI writing tools and then reviewed and edited many times, and that the covers, characters and figures are drawn by code written with an AI tool. Each book’s copyright page (“How it was made”) says the same, in the same words. That matches “Entire work, with extensive editing” for texts and for images, and “None” for translations. Never pick “None” (or answer “No”) to make a book look more human-made than it is.',
    ]


def previewer_section():
    return [
        'Most problems the previewer reports for these files come from choosing the wrong trim size or ink on the Content screen, so check those first.',
        'If it says the cover is the wrong size, check that the page count KDP shows matches the page count in the table for that book; the spine is calculated from it.',
        'If it flags text near the edge on a page with a QR code or a picture, look at that page in the PDF yourself. The files were built with safe margins, and the previewer sometimes warns about pictures that are meant to sit there. If unsure, ask KDP support before publishing.',
    ]


def esc(s):
    return html.escape(s, quote=False).replace('**', '')


def md_table(rows):
    out = ['| Box on the screen | What to type or choose |', '|---|---|']
    for k, v in rows:
        out.append('| %s | %s |' % (k, v.replace('|', '/')))
    return '\n'.join(out)


def html_rows(rows):
    return ''.join('<div class="row"><p class="k">%s</p><p class="v">%s</p></div>' % (esc(k), bold(esc(v)).replace(' | ', '<br>').replace('; 2. ', '<br>2. ').replace('; 3. ', '<br>3. ').replace('pick these three: 1. ', 'pick these three:<br>1. ')) for k, v in rows)


def bold(s):
    s = s.replace('[OWNER', '<span class="owner">[OWNER').replace(']', ']</span>') if '[OWNER' in s else s
    return s


def build():
    its = items()
    md, h = [], []
    title = 'Amazon KDP, step by step'
    intro = [
        'This guide walks through every KDP screen, in the order KDP shows them, for each book in the package. Every value is copied from the built files and from listing-kdp.md, so the titles, page counts, spine widths and prices are the real ones from this build.',
        'Anything marked **[OWNER]** is your decision. The recommendation is given next to it.',
        'Field names were checked in October 2026 against KDP’s help pages, through web search, because kdp.amazon.com could not be opened from the build machine. Where a box could not be confirmed, the guide says so. KDP changes its screens from time to time, so if a box is named differently, look for the one that means the same thing.',
    ]
    order = [
        'Before you start: nothing to buy. Each paperback gets a free KDP ISBN on its Paperback Content screen, and the Kindle editions need no ISBN.',
        'Publish the paperbacks first, one at a time, and order a proof of each. Publish only after the proof is right.',
        'Prices follow the owner’s rule: a paperback under 100 pages is a short edition at $9.99, anything longer is $14.99. The short editions (the pocket guide and the workbook) come after the books here, each under its own name. At $9.99 the color workbook can’t use Expanded Distribution, so it is Amazon only; every other book is Amazon only by choice.',
        'Then the Kindle editions. Use exactly the same title, subtitle and author, so Amazon links each Kindle edition to its paperback.',
    ]
    md += ['# ' + title, '', '\n\n'.join(intro), '', '## The order to do things in', ''] + ['%d. %s' % (i + 1, x) for i, x in enumerate(order)]
    md += ['', '## The AI questions (every book asks them)', '', '\n\n'.join(ai_section())]
    md += ['', '## If the previewer complains', ''] + ['- ' + x for x in previewer_section()]
    toc = []
    body_md, body_h = [], []
    for it in its:
        has_print = it['kind'] != 'boxset'
        has_kindle = it['kind'] != 'workbook'
        m = MADE.get(it['id'], {})
        sec = label(it)
        toc.append(sec)
        body_md += ['', '---', '', '## ' + sec, '']
        facts = []
        if has_print:
            facts.append('Paperback: %d pages, %s, spine %.4f in (%.2f mm), list price %s.' % (
                m.get('pages', 0), {'workbook': '8.5 x 11 in', 'pocket': '5 x 8 in'}.get(it['kind'], '6 x 9 in'), m.get('spine_in', 0), m.get('spine_mm', 0),
                money(m.get('costs', {}).get('list_price', 0))))
        if has_kindle:
            facts.append('Kindle: %s.epub with %s as the cover, %s.' % (it['id'], 'cover-%s-kindle.jpg' % it['id'], money(it.get('kindle_price_usd') or LK.KINDLE_PRICE)))
        if it['kind'] == 'workbook' and not it.get('bw'):
            ck = m.get('costs', {}).get('kdp_amazon', {})
            facts.append('Publish this color edition ONLY if you chose it instead of the black-and-white one. The screens are the same as the black-and-white workbook above, except: Ink and Paper Type “Standard color interior, white paper”; manuscript workbook.pdf; cover cover-workbook.pdf; list price %s, the same short-edition price (printing %s, you keep %s); and Expanded Distribution is not available at that price, so it is Amazon only (KDP would need about %s). It gets its own free KDP ISBN. [OWNER: the recommendation is the black-and-white edition, which earns more per copy at the same price]' % (
                money(LK.list_price(it['id'], 'workbook')), money(ck.get('print', 0)), money(ck.get('net', 0)), money(m.get('costs', {}).get('kdp_expanded', {}).get('min_price') or 0)))
        body_md += ['\n\n'.join(facts)]
        body_h.append('<section class="item"><h2 id="i%d">%s</h2>%s' % (len(toc), esc(sec), ''.join('<p class="fact">%s</p>' % bold(esc(f)) for f in facts)))
        if it['kind'] == 'workbook' and not it.get('bw'):
            body_h.append('</section>')
            continue
        steps = []
        if has_print:
            rows, desc = details_rows(it, 'paperback')
            steps += [('Paperback, screen 1 of 3: Paperback Details', 'From your Bookshelf click “+ Create,” then “Paperback.”', rows, desc),
                      ('Paperback, screen 2 of 3: Paperback Content', 'Click “Save and Continue” at the bottom of screen 1 to get here.', paperback_content_rows(it), None),
                      ('Paperback, screen 3 of 3: Paperback Rights & Pricing', 'Click “Save and Continue” to get here.', paperback_pricing_rows(it), None)]
        if has_kindle:
            rows, desc = details_rows(it, 'kindle')
            first = ('On your Bookshelf, next to this book’s paperback, use the link to create the Kindle eBook (KDP copies the details across; the exact link name was not confirmed), or “+ Create” then “Kindle eBook.” Check every box against this table.'
                     if has_print else 'From your Bookshelf click “+ Create,” then “Kindle eBook.”')
            steps += [('Kindle, screen 1 of 3: Kindle eBook Details', first, rows, desc),
                      ('Kindle, screen 2 of 3: Kindle eBook Content', 'Click “Save and Continue” to get here.', kindle_content_rows(it), None),
                      ('Kindle, screen 3 of 3: Kindle eBook Pricing', 'Click “Save and Continue” to get here.', kindle_pricing_rows(it), None)]
        for head, lead, rows, desc in steps:
            body_md += ['', '### ' + head, '', lead, '', md_table(rows)]
            body_h.append('<h3>%s</h3><p class="lead">%s</p>%s' % (esc(head), esc(lead), html_rows(rows)))
            if desc:
                body_md += ['', 'Description to paste (KDP accepts these tags):', '', '```html', desc, '```']
                body_h.append('<p class="k">Description to paste (copy everything in the box)</p><pre>%s</pre>' % html.escape(desc))
        body_h.append('</section>')
    md += ['', '## Contents', ''] + ['- ' + t for t in toc] + body_md
    after = [
        'Order and check the proofs: color, margins, the spine text, and scan a few QR codes on each with your phone.',
        'When a book is live, check that the paperback and Kindle edition show on one product page. If not, ask KDP support to link them (same title and author are needed).',
        'Set up Author Central (author.amazon.com) with the short bio in listing-kdp.md, and add each book.',
        'Every book can be updated later by uploading new files; the title, subtitle, edition number and primary author are locked once a paperback is published.',
    ]
    md += ['', '---', '', '## After publishing', ''] + ['- ' + x for x in after]
    md += ['', '## KDP help pages used (checked October 2026 through web search)', ''] + ['- %s: %s' % (t, u) for t, u in HELP]
    md += ['', 'Not found on a KDP help page through search, so taken from third-party guides and marked as such: the five AI answer choices, the 70% Kindle band of $2.99 to $12.99 (since July 7, 2026), and the 50% paperback royalty below $9.99. Not confirmed at all: the Reading direction, Large-print and Low-content boxes, and Book Lending. KDP’s own screens are the final word.']
    # HTML
    css = '''@page { size: A5; margin: 13mm 12mm 14mm; }
:root { --ink: #1f1d1a; --soft: #5b564f; --brand: #3E6B4C; --tint: #eef5f0; --rule: #d9d2c3; --owner: #96412B; }
body { font: 11pt/1.5 Georgia, "Times New Roman", serif; color: var(--ink); background: #fff; margin: 0; }
h1 { font-size: 21pt; margin: 0 0 4mm; color: var(--brand); }
h2 { font-size: 15pt; margin: 0 0 2mm; color: var(--brand); break-before: page; }
h2.first { break-before: auto; }
h3 { font-size: 12pt; margin: 6mm 0 1mm; padding: 1.5mm 2.5mm; background: var(--tint); border-left: 3pt solid var(--brand); break-after: avoid; }
p { margin: 0 0 2mm; }
.lead { font-style: italic; color: var(--soft); }
.fact { font-weight: bold; }
.row { border-bottom: .5pt solid var(--rule); padding: 1.6mm 0; break-inside: avoid; }
.row .k { font: bold 9.5pt/1.3 Arial, Helvetica, sans-serif; color: var(--brand); margin: 0 0 .6mm; }
.row .v { margin: 0; }
.owner { color: var(--owner); font-weight: bold; }
pre { white-space: pre-wrap; word-break: break-word; font: 8.5pt/1.4 "Courier New", monospace; background: #f6f4ef; padding: 2.5mm; border: .5pt solid var(--rule); }
ol, ul { padding-left: 5mm; margin: 0 0 3mm; }
li { margin: 0 0 1.4mm; }
.help li { word-break: break-all; font-size: 9.5pt; }
@media screen { body { max-width: 40em; margin: 0 auto; padding: 16px; } }'''
    def para(x):
        return '<p>%s</p>' % bold(esc(x))
    h.append('<!doctype html><html lang="en-US"><head><meta charset="utf-8"><meta name="viewport" content="width=device-width, initial-scale=1"><title>%s</title><style>%s</style></head><body>' % (title, css))
    h.append('<h1>%s</h1>%s' % (title, ''.join(para(x) for x in intro)))
    h.append('<h3>The order to do things in</h3><ol>%s</ol>' % ''.join('<li>%s</li>' % esc(x) for x in order))
    h.append('<h3>The AI questions (every book asks them)</h3>%s' % ''.join(para(x) for x in ai_section()))
    h.append('<h3>If the previewer complains</h3><ul>%s</ul>' % ''.join('<li>%s</li>' % esc(x) for x in previewer_section()))
    h.append('<h3>Contents</h3><ol>%s</ol>' % ''.join('<li><a href="#i%d">%s</a></li>' % (i + 1, esc(t)) for i, t in enumerate(toc)))
    h += body_h
    h.append('<section><h2>After publishing</h2><ul>%s</ul><h3>KDP help pages used</h3><p>Checked in October 2026 through web search.</p><ul class="help">%s</ul></section>' % (
        ''.join('<li>%s</li>' % esc(x) for x in after), ''.join('<li>%s: %s</li>' % (esc(t), esc(u)) for t, u in HELP)))
    h.append('</body></html>')
    os.makedirs(OUT, exist_ok=True)
    with open(os.path.join(OUT, 'Amazon-KDP-step-by-step.md'), 'w', encoding='utf-8') as f:
        f.write('\n'.join(md) + '\n')
    with open(os.path.join(OUT, 'Amazon-KDP-step-by-step.html'), 'w', encoding='utf-8') as f:
        f.write(''.join(h))
    print('kdp_steps: wrote Amazon-KDP-step-by-step.md and .html in %s (%d products)' % (OUT, len(its)))


if __name__ == '__main__':
    build()
