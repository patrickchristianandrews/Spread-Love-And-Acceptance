#!/usr/bin/env python3
"""make_package.py: the KDP listing, the preview pictures and the zip for the four kids titles (kids22).

    python3 tools/kids/make_package.py <scratchpad kids-final dir>

Reads book/kids/kids.json (pages, spine, cover sizes) and book/kids/checks.json, writes
  <dir>/listing-kids-kdp.md  and a copy in the package, <dir>/stage/... (the package tree)
  <dir>/Spread-Love-and-Acceptance-kids-KDP-package.zip
Every number in the listing (pages, spine, cost, royalty) is computed here from the built files, not typed.
"""
import json
import os
import shutil
import subprocess
import sys
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import kids_common as C  # noqa: E402
from PIL import Image  # noqa: E402

DEST = sys.argv[1] if len(sys.argv) > 1 and not sys.argv[1].startswith('--') else os.path.join(C.OUT, 'package')
STAGE = os.path.join(DEST, 'stage')
ZIPNAME = 'Spread-Love-and-Acceptance-kids-KDP-package.zip'
K = C.load_json(os.path.join(C.OUT, 'kids.json'), {})['books']
CHK = C.load_json(os.path.join(C.OUT, 'checks.json'), {})
PB = C.load_json(os.path.join(C.MS, 'picture-book.json'))
CB = C.load_json(os.path.join(C.MS, 'chapter-book', '00-book.json'))
CY = C.load_json(os.path.join(C.MS, 'coloring-younger.json'))
CO = C.load_json(os.path.join(C.MS, 'coloring-older.json'))

# the owner's price rule: $9.99 under 100 pages, $14.99 from 100 pages (unless printing cost needs more)
def price_for(pages, cost):
    p = 9.99 if pages < 100 else 14.99
    return p


def cost_line(kind, pages):
    c = C.COSTS[kind]
    if 'flat' in c:
        return '%s: $%.2f a copy' % (c['label'].split(':')[0], c['flat']) + ' (a flat charge for this page range)'
    return '$%.2f + %d pages x $%.3f = $%.2f' % (c['fixed'], pages, c['per_page'], C.print_cost(kind, pages))


TITLES = [
    dict(id='picture-book', name=PB['title'], sub=PB['subtitle'], n=1, ages=(4, 7), grades='Preschool to grade 2', kind='premium_large', paper='premium',
         trim='8.5 x 8.5 in (21.59 x 21.59 cm)', ink='Premium color, white paper', bleed='Bleed', interior='picture-book.pdf', cover='cover-picture-book.pdf', front='cover-picture-book-front.jpg',
         epub='picture-book.epub', desc=None, back=PB['back_cover']),
    dict(id='chapter-book', name=CB['title'], sub=CB['subtitle'], n=2, ages=(9, 12), grades='Grades 4 to 7', kind='bw_regular', paper='white',
         trim='6 x 9 in (15.24 x 22.86 cm)', ink='Black and white, white paper', bleed='No bleed', interior='chapter-book.pdf', cover='cover-chapter-book.pdf', front='cover-chapter-book-front.jpg',
         epub='chapter-book.epub', desc=None, back=CB['back_cover']),
    dict(id='coloring-younger', name=CY['title'], sub=CY['subtitle'], n=3, ages=(3, 7), grades='Preschool to grade 2', kind='bw_large', paper='white',
         trim='8.5 x 11 in (21.59 x 27.94 cm)', ink='Black and white, white paper', bleed='No bleed', interior='coloring-younger.pdf', cover='cover-coloring-younger.pdf', front='cover-coloring-younger-front.jpg',
         epub=None, desc=None, back=CY['back_cover']),
    dict(id='coloring-older', name=CO['title'], sub=CO['subtitle'], n=4, ages=(8, 12), grades='Grades 3 to 7', kind='bw_large', paper='white',
         trim='8.5 x 11 in (21.59 x 27.94 cm)', ink='Black and white, white paper', bleed='No bleed', interior='coloring-older.pdf', cover='cover-coloring-older.pdf', front='cover-coloring-older-front.jpg',
         epub=None, desc=None, back=CO['back_cover']),
]

DESC = {
    'picture-book': ('<p><b>Tidbit zooms. Sugarfoot floats. Today is picnic day, and Tidbit is sure she can carry the whole basket by herself.</b></p>'
                     '<p>Then her paws get buzzy, her ears get hot, and a little gray cloud of Static floats in the door. With help from Professor Puddles and a hill full of friends, Tidbit learns to listen to her body, ask for a hand, say sorry when she bumps the basket, and make it right.</p>'
                     '<p>A warm, funny read-aloud with rhymes, repeating lines and a calm-down trick children can copy: smell the flower, blow the candle.</p>'
                     '<p><b>Inside this book</b></p><ul><li>Noticing what your body is telling you (buzzy paws, heavy paws, calm)</li><li>Asking for what you need: \"room first, then a hug\"</li><li>One job each, so the basket gets light</li><li>Saying sorry in three steps and making it right</li><li>Gentle, funny clouds of Static that only want a friend</li><li>A \"Try it with Tidbit\" breathing page, a find-and-count page, and a page of questions and words for grown-ups</li></ul>'
                     '<p>40 full-color pages, 8.5 x 8.5 inches. For ages 4 to 7, and for anyone who reads aloud.</p>'
                     '<p><b>Part of The Frequency Buddies Books.</b> Tidbit, Sugarfoot and their friends also star in a chapter book for ages 9 to 12 and two coloring books.</p>'),
    'chapter-book': ('<p><b>Wren Alvarez has one rule about her bedroom, written in glitter pen on the door: KNOCK FIRST.</b></p>'
                     '<p>Then Grandpa Lou moves in, her room becomes his, and Wren ends up sharing with her little brother Theo, who wears headphones at dinner, counts ceiling tiles when things get loud, and takes everything exactly the way it is said.</p>'
                     '<p>At the same time, the group chat blows up. One word, \"fine\", lands like a slap. A group project turns into a shouting match. And the one person Wren needs to say sorry to may need some room first.</p>'
                     '<p>Funny, warm and honest, with two dogs named Tidbit and Sugarfoot, a grandfather who has opinions about weather, and a map for the days when your body is loud and your words come out wrong.</p>'
                     '<p><b>Inside this book</b></p><ul><li>Eleven short chapters, about 16,000 words, with a picture at the start of each</li><li>Misread messages, and how to ask \"did you mean it like that?\"</li><li>Fair shares at home, including the invisible work of remembering</li><li>Feelings and what to do with them: the ladder of calm, revved up and running on empty</li><li>Apology and repair, with three things to say and time to let it land</li><li>Two ways of being wired, and two people learning each other’s language</li><li>A short \"Try this\" box at the end of every chapter, and a page for grown-ups</li></ul>'
                     '<p>For ages 9 to 12, with no scary parts.</p><p><b>Part of The Frequency Buddies Books.</b></p>'),
    'coloring-younger': ('<p><b>Thirty-two big, simple pictures for little hands.</b></p>'
                         '<p>Tidbit and Sugarfoot, Professor Puddles, Ollie the owl, Dot the snail, Hopper the frog, Nutmeg, Lumi, Beep, the ducklings, the Moon, the four clouds of Static, Peach and Lilac, and more. Thick, clear lines leave plenty of room for crayons and chunky markers.</p>'
                         '<p>Every picture is on its own page, with a blank page behind it so markers do not soak through to the next one.</p>'
                         '<p>For ages 3 to 7. A good companion to the read-aloud story <i>Tidbit and Sugarfoot’s Big Picnic</i>.</p><p><b>Part of The Frequency Buddies Books.</b></p>'),
    'coloring-older': ('<p><b>Thirty-two detailed scenes with borders, patterns and a short, calming phrase in outline letters to color in.</b></p>'
                       '<p>Breathe in slowly. Take a minute. Say what you need. Say sorry and make it right. Tidbit, Sugarfoot, Professor Puddles, the Frequency Buddies and the clouds of Static are all here, in scenes with hills, skies, mandala flowers and patterns to fill.</p>'
                       '<p>Color a whole page, or just the part you like. Every picture has a blank page behind it, so markers do not soak through.</p>'
                       '<p>A calm, screen-free break for ages 8 to 12, and a good companion to the chapter book <i>Turn Down the Static</i>.</p><p><b>Part of The Frequency Buddies Books.</b></p>'),
}
KEYWORDS = {
    'picture-book': ['read aloud story about feelings for kids', 'social emotional learning picture book', 'calm down breathing for children', 'sharing and taking turns story',
                     'saying sorry and making it right', 'dog friends bedtime story ages 4 to 7', 'big feelings anger and worry kids book'],
    'chapter-book': ['middle grade novel about feelings and friends', 'group chat misunderstandings for kids', 'grandparent moves in family story', 'story about brothers and sisters getting along',
                     'coping with change realistic fiction kids', 'tween book kindness and apology', 'books for ages 9 to 12 about emotions'],
    'coloring-younger': ['coloring book for toddlers and preschoolers', 'big simple pictures coloring kids', 'dog and animal coloring pages', 'calming activity for little kids',
                         'crayon coloring book blank back pages', 'cute characters coloring book gift', 'coloring book ages 3 to 7'],
    'coloring-older': ['coloring book with calming phrases for kids', 'mindful coloring for tweens', 'detailed coloring pages ages 8 to 12', 'feelings and coping skills coloring',
                       'relaxation activity for kids screen free', 'patterns and mandalas for kids', 'positive phrases coloring tween'],
}
CATS = {
    'picture-book': [('Children\'s Books > Growing Up & Facts of Life > Emotions & Feelings', 'Children\'s Books > Literature & Fiction > Animal Fiction'),
                     ('Children\'s Books > Growing Up & Facts of Life > Friendship, Social Skills & School Life', 'Children\'s Books > Growing Up & Facts of Life > Manners & Etiquette'),
                     ('Children\'s Books > Animals > Dogs', 'Children\'s Books > Early Learning > Social Skills')],
    'chapter-book': [('Children\'s Books > Growing Up & Facts of Life > Friendship, Social Skills & School Life', 'Children\'s Books > Growing Up & Facts of Life > Emotions & Feelings'),
                     ('Children\'s Books > Growing Up & Facts of Life > Family Life', 'Children\'s Books > Literature & Fiction > Contemporary Fiction (if offered)'),
                     ('Children\'s Books > Growing Up & Facts of Life > Emotions & Feelings', 'Children\'s Books > Growing Up & Facts of Life > Siblings')],
    'coloring-younger': [('Children\'s Books > Activities, Crafts & Games > Coloring Books', 'Children\'s Books > Activities, Crafts & Games > Drawing'),
                         ('Children\'s Books > Animals > Dogs', 'Children\'s Books > Animals > Pets'),
                         ('Children\'s Books > Activities, Crafts & Games > Activity Books', 'Children\'s Books > Early Learning')],
    'coloring-older': [('Children\'s Books > Activities, Crafts & Games > Coloring Books', 'Children\'s Books > Activities, Crafts & Games > Drawing'),
                       ('Children\'s Books > Growing Up & Facts of Life > Emotions & Feelings', 'Children\'s Books > Activities, Crafts & Games > Activity Books'),
                       ('Children\'s Books > Activities, Crafts & Games > Activity Books', 'Children\'s Books > Animals > Dogs')],
}
TAGS = {
    'picture-book': ['Zoom. Slow. Together.', 'A calm-down trick kids can copy.', 'Big feelings, small clouds, one very big picnic.', 'Read it slowly. Stop where it helps.'],
    'chapter-book': ['One word can sound like a slap. Wren is about to find out.', 'Two kids, two dogs, one crowded house.', 'For the days when your body is loud and your words come out wrong.'],
    'coloring-younger': ['Thirty-two friends to color.', 'A blank page behind every picture.', 'Big lines for little hands.'],
    'coloring-older': ['Color a calm minute.', 'Detailed scenes and short phrases to keep.', 'A screen-free break for ages 8 to 12.'],
}
KINDLE = {'picture-book': 4.99, 'chapter-book': 4.99}


def md_title(t):
    pages = K[t['id']].get('pages_printed') or K[t['id']].get('pages_planned') or K[t['id']].get('pages')
    rec = K[t['id']]
    cover = rec['cover']
    cost = C.print_cost(t['kind'], pages)
    price = price_for(pages, cost)
    roy, rate = C.royalty(price, cost)
    sp = cover['spine_in']
    out = []
    A = out.append
    A('## Book %d: %s' % (t['n'], t['name']))
    A('')
    A('### Basic details')
    A('')
    A('| Field | Paperback%s |' % (' | Kindle' if t['epub'] else ''))
    A('|---|---|%s' % ('---|' if t['epub'] else ''))
    def row(a, b, c=None):
        A('| %s | %s |%s' % (a, b, (' %s |' % (c if c is not None else b)) if t['epub'] else ''))
    row('Language', 'English')
    row('Book title', t['name'])
    row('Subtitle', t['sub'])
    row('Series', 'The Frequency Buddies Books, number %d (use "Add to series" so all four show together)' % t['n'], 'the same series, the same number')
    row('Edition number', '1')
    row('Author', 'Christian (first name only, as on the cover) [OWNER]', 'Christian')
    row('Publisher / imprint', 'Nothing to type: with a free KDP ISBN, KDP shows "Independently published"', 'Leave blank')
    row('Contributors', 'None', 'None')
    row('Publishing rights', '"I own the copyright and I hold the necessary publishing rights."')
    row('Primary audience', 'Sexually explicit images or title: **No**. Reading age: **%d to %d**. Grade range (if asked): %s.' % (t['ages'][0], t['ages'][1], t['grades']))
    row('Primary marketplace', 'Amazon.com')
    A('')
    A('**Description** (paste into the description box; KDP allows b, i, u, br, p, ul, ol, li, h4 to h6; %d of 4,000 characters):' % len(DESC[t['id']]))
    A('')
    A('```html')
    A(DESC[t['id']])
    A('```')
    A('')
    A('### Categories (pick 3)')
    A('KDP lets you pick three categories. Names are as KDP\'s category picker words them; check each path in the picker and take the nearest if one is not offered. [OWNER: confirm in the picker]')
    A('')
    A('| | Best 3 | Alternates |')
    A('|---|---|---|')
    for i, (a, b) in enumerate(CATS[t['id']]):
        A('| %d | %s | %s |' % (i + 1, a, b))
    A('')
    A('### Keywords (the 7 boxes)')
    A('')
    A('| Box | Keyword phrase | Characters |')
    A('|---|---|---|')
    for i, k in enumerate(KEYWORDS[t['id']]):
        assert len(k) <= 50, k
        A('| %d | %s | %d |' % (i + 1, k, len(k)))
    A('')
    A('No other authors, brands or claims like "best" or "new". Words already in the title and series are left out. [OWNER]')
    A('')
    A('### PRIVATE UPLOAD NOTE: the KDP form question about AI use')
    A('')
    A('**Answer this in the KDP form. It is not printed in the book, on the cover or on the product page, and it is not shown on the site.** Keep this section out of anything readers see.')
    A('')
    A('KDP asks whether AI-based tools were used to create the **text**, the **images**, or **translations**. KDP\'s own definitions: content created by an AI-based tool counts as AI-generated even if you edited it afterward (it must be disclosed), and content you created yourself and only checked or improved with AI is AI-assisted (it does not need to be disclosed).')
    A('')
    A('Honest answers for this title, as it was made [OWNER: confirm; only you know how much you changed by hand]:')
    A('')
    A('| Question | Answer to choose | Why |')
    A('|---|---|---|')
    if t['id'] in ('picture-book', 'chapter-book'):
        A('| Text | **Yes, AI-generated.** Pick "with editing" only if you edited it yourself | The story was drafted by an AI writing tool (Claude) from your brief, then revised in rounds against the site\'s language rules and a simulated reader review. |')
    elif t['id'] == 'coloring-older':
        A('| Text | **Yes, AI-generated** (the 32 short phrases and the back cover) | The phrases were drafted by an AI writing tool from the site\'s ideas. |')
    else:
        A('| Text | **Yes, AI-generated** (the back cover and captions, a few words) | Almost no text: picture names and the back cover were drafted by an AI writing tool. |')
    A('| Images | **Yes, AI-generated** | Every picture is drawn by a program (SVG drawn by code in the style of the site\'s characters). The program was written with an AI tool and nobody drew the pictures by hand. Say so even though no image model was used: an AI-based tool created the work. |')
    A('| Translations | **No** | English only. |')
    A('')
    A('The answers are seen by Amazon only. The books themselves say nothing about how they were made, so the form is the one place this is stated. Answer it truthfully.')
    A('')
    A('### Print details')
    A('')
    A('| Field | Answer |')
    A('|---|---|')
    A('| ISBN | Choose **"Get a free KDP ISBN"** (it prints in the barcode on the back cover; nothing inside the book needs one). KDP shows "Independently published" as the imprint. |')
    A('| Publication date | Leave blank |')
    A('| Print options | Ink and paper: **%s**. Trim: **%s**. Bleed: **%s**. Cover finish: **Matte**%s. |' % (t['ink'], t['trim'], t['bleed'], ' (calmer, less glare; choose glossy only if the proof looks dull)' if t['id'] != 'picture-book' else ' (glossy is also fine for a picture book; order a proof of each if unsure)'))
    A('| Page count | **%d** (KDP reads it from the file; even, as KDP prints in sheets) |' % pages)
    A('| Spine width | **%s in** (%s) = %d pages x %s in. Spine text: %s |' % (sp, '%.2f mm' % (sp * 25.4), pages, C.PAPER[t['paper']], 'none (KDP prints spine text only above 79 pages%s)' % ('; this book is under, so the spine is plain color' if pages <= 79 else '; at %.3f in the spine is too thin for readable text, so none is printed' % sp)))
    A('| Manuscript file | `%s`%s |' % (t['interior'], ' (page size %.3f x %.3f in: the 8.5 in square plus 0.125 in bleed on the outside, top and bottom)' % (CHK[t['id']]['size_in'][0], CHK[t['id']]['size_in'][1]) if t['bleed'] == 'Bleed' else ' (page size %.1f x %.1f in, no bleed; every line is inside the 0.5 in safe margin)' % tuple(CHK[t['id']]['size_in'])))
    A('| Cover file | `%s` (full wrap %s x %s in: 0.125 in bleed on all four sides, back, %s in spine, front; the 2 x 1.2 in barcode area at the bottom right of the back is left clear) |' % (t['cover'], cover['width_in'], cover['height_in'], sp))
    LC = {'picture-book': 'Every page is original artwork, and the story has words on every spread.', 'chapter-book': 'It is a full story of about 16,000 words.', 'coloring-younger': 'Every picture page is original artwork, with a blank page behind it so markers do not soak through.', 'coloring-older': 'Every picture page is original artwork, with a blank page behind it so markers do not soak through.'}
    A('| Is this a low-content book? | **No.** ' + LC[t['id']] + ' Check KDP\'s current definition on the Paperback Content screen and answer as it defines the term. [OWNER] |')
    A('| Large-print book? | No |')
    A('| Fonts | All embedded (checked with pdffonts): %s |' % ', '.join(CHK[t['id']]['fonts']))
    A('')
    A('### Pricing (paperback) and the printing cost math')
    A('')
    A('Rule: under 100 pages is **$9.99**, 100 pages and up is **$14.99**, unless the printing cost needs more. This book has %d pages, so the list price is **$%.2f**.' % (pages, price))
    A('')
    A('| Marketplace | List price | Printing cost | Your royalty a copy |')
    A('|---|---|---|---|')
    A('| Amazon.com (primary) | $%.2f | $%.2f | **$%.2f** (%d%% x $%.2f = $%.2f, minus printing $%.2f) |' % (price, cost, roy, int(rate * 100), price, round(rate * price, 2), cost))
    A('| Other marketplaces | KDP\'s "based on Amazon.com" suggestion, rounded to .99 | KDP shows it | KDP shows it [OWNER] |')
    ex = round(0.4 * price - cost, 2)
    exnote = ('would pay $%.2f a copy (40%% x $%.2f - printing)' % (ex, price)) if ex > 0 else ('would pay nothing: 40%% x $%.2f = $%.2f is less than the $%.2f printing cost, so KDP would not allow it at this price' % (price, round(0.4 * price, 2), cost))
    A('| Expanded distribution | **No** (Amazon only) | $%.2f | %s |' % (cost, exnote))
    A('')
    A('Printing cost on Amazon.com: **%s**. %s' % (cost_line(t['kind'], pages), {
        'picture-book': 'Premium color is the only color option for a book under 72 pages (KDP\'s standard color needs 72 or more), and premium color is the better print for illustrations. The rate comes from KDP\'s printing-cost table as published by KDP and quoted by publishing guides in October 2026; KDP\'s own calculator was not reachable from this build, so **check the figure in KDP\'s calculator before you publish**. The lowest list price that still pays a royalty at 60%% is $%.2f ($%.2f / 0.6). At $12.99 the royalty would be $%.2f, and at $14.99 $%.2f. [OWNER]' % (round(cost / 0.6 + 0.005, 2), cost, C.royalty(12.99, cost)[0], C.royalty(14.99, cost)[0]),
        'chapter-book': 'The black-ink rate for a 6 x 9 paperback of up to 108 pages, as KDP\'s table is quoted in publishing guides (October 2026). It is the safe figure: if KDP charges $1.00 + $0.012 a page instead, the cost is lower and the royalty is higher. **Check KDP\'s calculator before you publish.** The book is kept under 100 pages on purpose, so it prices at $9.99. [OWNER]',
        'coloring-younger': 'The black-ink rate for a large trim (8.5 x 11) paperback of 24 to 110 pages, the figure already used for the workbook in tools/book/build_series.py (KDP help topic G201834340, looked up 18 October 2026). [OWNER: confirm in KDP\'s calculator]',
        'coloring-older': 'The same black-ink, large-trim rate as the younger coloring book. [OWNER: confirm in KDP\'s calculator]'}[t['id']]))
    A('')
    A('Spine and cover math: spine = pages x paper thickness. %s paper is %s in a page (KDP\'s paperback cover calculator), so %d x %s = %s in. Full-wrap width = 0.125 + trim width + spine + trim width + 0.125 = %s in; height = trim height + 0.25 = %s in.' % ('Premium color' if t['paper'] == 'premium' else 'White (black ink)', C.PAPER[t['paper']], pages, C.PAPER[t['paper']], sp, cover['width_in'], cover['height_in']))
    A('')
    if t['epub']:
        epub_mb = os.path.getsize(os.path.join(C.OUT, 'epub', t['epub'])) / 1048576.0
        kp = KINDLE[t['id']]
        deliv = round(epub_mb * 0.15, 2)
        A('### Kindle extras')
        A('')
        A('| Field | Answer |')
        A('|---|---|')
        if t['id'] == 'picture-book':
            A('| Manuscript (ebook) file | **epub/%s** (EPUB 3 **fixed layout**, 40 pages as 1600 x 1600 px images, %.2f MB, page-spread properties so tablets show two-page spreads; the words of each page are in the image\'s alt text; EPUBCheck: 0 fatals, 0 errors, 0 warnings, 0 infos). |' % (t['epub'], epub_mb))
            A('| Why an EPUB, and not Kindle Kids\' Book Creator | Amazon retired Kindle Kids\' Book Creator and Kindle Comic Creator in 2025 and now takes new fixed-layout children\'s books as KPF (made in Kindle Create) or as EPUB. This EPUB is the file to upload. Open it in Amazon\'s free **Kindle Previewer** (children\'s book / fixed layout view) before publishing. If Kindle Previewer shows a problem, import `picture-book-screen.pdf` into Kindle Create instead and export a KPF: the pictures and words are the same. [OWNER] |')
            A('| Kindle cover file | `cover-picture-book-front.jpg` (1600 x 1600 px, the square front cover; KDP accepts it) |')
        else:
            A('| Manuscript (ebook) file | **epub/%s** (EPUB 3, reflowable, %.2f MB, 11 chapters, spot pictures as PNG; EPUBCheck: 0 fatals, 0 errors, 0 warnings, 0 infos). |' % (t['epub'], epub_mb))
            A('| Kindle cover file | `cover-chapter-book-kindle.jpg` (1600 x 2560 px, the 1.6:1 shape KDP prefers; also inside the EPUB) |')
        A('| ISBN | Leave blank. Amazon gives the Kindle edition an ASIN. |')
        A('| Kindle price | **$%.2f**, 70%% royalty (the 70%% band is $2.99 to $12.99): 70%% x $%.2f = $%.2f, minus delivery (%.2f MB x $0.15 = $%.2f) = **$%.2f** a copy. [OWNER] |' % (kp, kp, round(0.7 * kp, 2), epub_mb, deliv, round(0.7 * kp - deliv, 2)))
        A('| KDP Select | **No.** Select needs the ebook to be exclusive to Amazon in digital form, and the story\'s characters and the books\' ideas are free on the website. |')
        A('| DRM | **No DRM.** |')
        A('| Categories and keywords | The same as the paperback |')
        A('')
    else:
        A('### Kindle')
        A('')
        A('**None.** A coloring book is made to be written in. Its pictures are art on a page, not text that can reflow, and KDP can turn away ebooks that are mostly images with nothing to read. The free PDF on the website is the way to print it at home.')
        A('')
    A('### Taglines for ads (short and true)')
    A('')
    for x in TAGS[t['id']]:
        A('- ' + x)
    A('')
    A('---')
    A('')
    return '\n'.join(out), dict(pages=pages, price=price, cost=cost, royalty=roy, spine=sp)


def listing():
    parts = ['# Amazon KDP listing: The Frequency Buddies Books (the kids titles)', '',
             'Made by tools/kids/make_package.py (kids22) from the built files in book/kids/. Copy each field into KDP as it stands. Anything marked **[OWNER]** is yours to decide or confirm. Page counts, spine widths, cover sizes and costs are the real ones from the built files.', '',
             '## Read this first',
             '- **Four titles, one series.** *The Frequency Buddies Books*: 1. the picture book (ages 4 to 7), 2. the chapter book (ages 9 to 12), 3. the younger coloring book (ages 3 to 7), 4. the older coloring book (ages 8 to 12). They sit beside the adult series (*Spread Love & Acceptance*, Books 1 to 4), and the kids\' pages say so.',
             '- **Amazon only, free ISBNs, free online.** Same decisions as the adult series: sold on Amazon (KDP) and nowhere else, expanded distribution off, KDP\'s free ISBN (it prints in the barcode; no ISBN line inside), and everything free to read and print on the website. Every PDF on the site asks for an email once, like the adult books. Do **not** enroll the Kindle editions in KDP Select.',
             '- **Order a proof copy of every paperback before you publish.** Check the color (picture book), the bleed edges, the margins, the blank backs and the spine.',
             '- **The picture book needs premium color.** It has 40 pages, and KDP\'s standard color starts at 72. The other three are black ink, so the interiors are plain grays and black.',
             '- **The coloring books are print only.** The picture book and the chapter book also have Kindle files (EPUB).',
             '- **The text is American English** (checked by tools/kids/lint_kids.py and tools/kids/us_audit.py against the site\'s language rules: no dashes as punctuation, no semicolons, no "not X but Y" frames, no British spellings or words, no hotline, emergency or call-for-help wording, no names of experts, no names in headings).',
             '- **One private note.** Each title has a section called "PRIVATE UPLOAD NOTE: the KDP form question about AI use". It tells you what to answer in Amazon\'s own form. Nothing in the books, the covers, the descriptions or the site mentions it.',
             '', '---', '']
    totals = {}
    for t in TITLES:
        s, info = md_title(t)
        parts.append(s)
        totals[t['id']] = info
    parts.append('## Printing cost summary')
    parts.append('')
    parts.append('| Title | Pages | Trim and ink | Printing cost | List price | Royalty a copy |')
    parts.append('|---|---|---|---|---|---|')
    for t in TITLES:
        i = totals[t['id']]
        parts.append('| %s | %d | %s, %s | $%.2f | $%.2f | $%.2f |' % (t['name'], i['pages'], t['trim'].split(' (')[0], t['ink'].lower(), i['cost'], i['price'], i['royalty']))
    parts.append('')
    parts.append('The Amazon.com printing-cost figures are the ones in this build: premium color large trim $1.00 + $0.080 a page; black ink up to 108 pages $2.30 (6 x 9); black ink up to 110 pages $2.84 (8.5 x 11). KDP revises these, and its calculator is the source of record, so check each before publishing.')
    parts.append('')
    parts.append('## Free PDFs on the site')
    parts.append('')
    parts.append('The website is free, so each title can be a free PDF on /book/download.html behind the same one-time email step as the adult books (the lead has the exact HTML). Recommended: **offer all four**. The picture book and the chapter book are stories families will read aloud together, the coloring books are made to be printed at home, and none of it takes sales from a paperback buyer who wants the bound, proofed book. If you would rather keep the picture book print-only, remove its list item; nothing else changes.')
    parts.append('')
    return '\n'.join(parts), totals


def previews():
    """PNG pictures of the books: spreads of the picture book, pages of the chapter book, pictures of the coloring books, the four covers"""
    pdir = os.path.join(STAGE, 'previews')
    os.makedirs(pdir, exist_ok=True)
    tmp = os.path.join(DEST, 'tmp-previews')
    os.makedirs(tmp, exist_ok=True)

    def render(pdf, dpi, prefix, first=None, last=None):
        cmd = ['pdftoppm', '-r', str(dpi), '-png']
        if first:
            cmd += ['-f', str(first), '-l', str(last or first)]
        subprocess.run(cmd + [os.path.join(C.OUT, pdf), os.path.join(tmp, prefix)], check=True)
    render('picture-book.pdf', 50, 'pb')
    def pair(a, b, name, folder='picture-book'):
        A = Image.open(os.path.join(tmp, 'pb-%02d.png' % a)); Bm = Image.open(os.path.join(tmp, 'pb-%02d.png' % b))
        S = Image.new('RGB', (A.width + Bm.width, A.height), '#fff'); S.paste(A, (0, 0)); S.paste(Bm, (A.width, 0)); S.save(os.path.join(pdir, name), optimize=True)
    for i in range(13):
        pair(6 + 2 * i, 7 + 2 * i, 'picture-book-spread-%02d.png' % (i + 1))
    pair(32, 33, 'picture-book-spread-calm.png')
    pair(34, 35, 'picture-book-grownups.png')
    pair(2, 3, 'picture-book-front-matter.png')
    # whole interior contact sheet
    pages = [Image.open(os.path.join(tmp, 'pb-%02d.png' % i)) for i in range(1, 41)]
    w, h = pages[0].size
    w2, h2 = w // 2, h // 2
    S = Image.new('RGB', (w2 * 8, h2 * 5), '#888')
    for i, im in enumerate(pages):
        S.paste(im.resize((w2, h2)), ((i % 8) * w2, (i // 8) * h2))
    S.save(os.path.join(pdir, 'picture-book-all-pages.png'), optimize=True)
    # chapter book
    render('chapter-book.pdf', 60, 'cb')
    ids = [3, 9, 15, 16, 31, 87]
    ims = [Image.open(os.path.join(tmp, 'cb-%02d.png' % i)) for i in ids]
    w, h = ims[0].size
    S = Image.new('RGB', (w * 6, h), '#888')
    for i, im in enumerate(ims):
        S.paste(im, (i * w, 0))
    S.save(os.path.join(pdir, 'chapter-book-sample-pages.png'), optimize=True)
    # coloring books
    for b in ('younger', 'older'):
        render('coloring-%s.pdf' % b, 40, 'co-' + b)
        ids = [1, 3, 9, 15, 25, 43, 61]
        ims = [Image.open(os.path.join(tmp, 'co-%s-%02d.png' % (b, i))) for i in ids]
        w, h = ims[0].size
        S = Image.new('RGB', (w * len(ims), h), '#888')
        for i, im in enumerate(ims):
            S.paste(im, (i * w, 0))
        S.save(os.path.join(pdir, 'coloring-%s-sample-pages.png' % b), optimize=True)
    # covers (the whole wrap)
    for bid in ('picture-book', 'chapter-book', 'coloring-younger', 'coloring-older'):
        subprocess.run(['pdftoppm', '-r', '60', '-png', '-singlefile', os.path.join(C.OUT, 'cover-%s.pdf' % bid), os.path.join(pdir, 'cover-%s-full-wrap' % bid)], check=True)
    shutil.rmtree(tmp)


def stage():
    if os.path.isdir(STAGE):
        shutil.rmtree(STAGE)
    root = os.path.join(STAGE)
    dirs = {'picture-book': 'picture-book', 'chapter-book': 'chapter-book', 'coloring-younger': 'coloring-book-younger', 'coloring-older': 'coloring-book-older'}
    for t in TITLES:
        d = os.path.join(root, dirs[t['id']])
        os.makedirs(d, exist_ok=True)
        shutil.copy(os.path.join(C.OUT, t['interior']), os.path.join(d, t['interior']))
        shutil.copy(os.path.join(C.OUT, t['cover']), os.path.join(d, t['cover']))
        shutil.copy(os.path.join(C.OUT, t['front']), os.path.join(d, t['front']))
        shutil.copy(os.path.join(C.OUT, t['front'].replace('-front.jpg', '-front-small.jpg')), os.path.join(d, t['front'].replace('-front.jpg', '-front-small.jpg')))
        if t['epub']:
            shutil.copy(os.path.join(C.OUT, 'epub', t['epub']), os.path.join(d, t['epub']))
        if t['id'] == 'chapter-book':
            shutil.copy(os.path.join(C.OUT, 'cover-chapter-book-kindle.jpg'), os.path.join(d, 'cover-chapter-book-kindle.jpg'))
        if t['id'] == 'picture-book':
            shutil.copy(os.path.join(C.OUT, 'picture-book-screen.pdf'), os.path.join(d, 'picture-book-screen.pdf'))
    previews()
    # sources
    src = os.path.join(root, 'sources')
    shutil.copytree(os.path.join(C.ROOT, '_manuscripts', 'kids'), os.path.join(src, '_manuscripts', 'kids'))
    shutil.copytree(os.path.join(C.ROOT, 'tools', 'kids'), os.path.join(src, 'tools', 'kids'), ignore=shutil.ignore_patterns('__pycache__', '*.pyc'))
    for name in ('kids.json', 'checks.json'):
        shutil.copy(os.path.join(C.OUT, name), os.path.join(root, name))


def readme(totals):
    lines = ['Spread Love & Acceptance: the kids titles, KDP package', '=' * 62, '', 'Read CHANGES.md first: it lists what changed in this version.', '',
             'What is in each folder:',
             '  picture-book/        interior PDF (print, with 0.125 in bleed), screen PDF (no bleed), full-wrap cover PDF, front cover JPG, fixed-layout EPUB',
             '  chapter-book/        interior PDF, full-wrap cover PDF, front cover JPG, Kindle cover JPG, reflowable EPUB',
             '  coloring-book-younger/, coloring-book-older/   interior PDF, full-wrap cover PDF, front cover JPG (print only)',
             '  previews/            PNG pictures: every picture-book spread, sample pages, all four full-wrap covers',
             '  listing-kids-kdp.md  every KDP field for all four titles, with the printing cost math',
             '  sources/             the manuscripts (JSON and Markdown) and the builders (tools/kids), with the fonts (SIL Open Font License)',
             '  kids.json, checks.json   page counts, spines and the readiness checks',
             '', 'Upload order for each paperback: Paperback Content (manuscript PDF, then the cover PDF "I have a print-ready PDF cover"), Paperback Details, Rights and Pricing.',
             'Order a proof copy of each book before you publish.', '', 'The numbers:']
    for t in TITLES:
        i = totals[t['id']]
        lines.append('  %-42s %3d pages, spine %.4f in, printing $%.2f, list $%.2f, royalty $%.2f' % (t['name'], i['pages'], i['spine'], i['cost'], i['price'], i['royalty']))
    lines += ['', 'To rebuild: start a local server on port 8673 from the repo root and run  bash tools/kids/run_all.sh  then  python3 tools/kids/make_package.py <folder>.']
    return '\n'.join(lines) + '\n'


def main():
    """usage: make_package.py <dest folder> [--changes CHANGES.md]   (a CHANGES file is put first in the package and beside it)"""
    args = sys.argv[1:]
    changes = None
    if '--changes' in args:
        i = args.index('--changes')
        changes = args[i + 1]
    os.makedirs(DEST, exist_ok=True)
    text, totals = listing()
    stage()
    C.write(os.path.join(DEST, 'listing-kids-kdp.md'), text)
    C.write(os.path.join(STAGE, 'listing-kids-kdp.md'), text)
    C.write(os.path.join(STAGE, 'README.txt'), readme(totals))
    if changes:
        shutil.copy(changes, os.path.join(STAGE, 'CHANGES.md'))
        shutil.copy(changes, os.path.join(DEST, 'CHANGES.md'))
    out = os.path.join(DEST, ZIPNAME)
    if os.path.exists(out):
        os.remove(out)
    root = 'Spread-Love-and-Acceptance-kids-KDP-package'
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        if changes:
            z.write(os.path.join(STAGE, 'CHANGES.md'), os.path.join(root, 'CHANGES.md'))   # first in the zip
        for dp, dn, fn in os.walk(STAGE):
            dn.sort()
            for f in sorted(fn):
                full = os.path.join(dp, f)
                if changes and os.path.relpath(full, STAGE) == 'CHANGES.md':
                    continue
                z.write(full, os.path.join(root, os.path.relpath(full, STAGE)))
    print('zip:', out, round(os.path.getsize(out) / 1048576, 1), 'MB')
    print(json.dumps(totals, indent=1))


if __name__ == '__main__':
    main()
