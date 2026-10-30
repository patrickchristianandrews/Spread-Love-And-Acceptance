#!/usr/bin/env python3
"""make_package.py: the KDP listing, the preview pictures and the zip for "Color and Breathe" (adultcolor29).

    python3 tools/adultcolor/make_package.py <dest folder> [--changes CHANGES.md]

Reads the built files in book/adult/ (page count from the PDF, the cover size from adult.json) and writes into <dest>:
    adultcolor-listing-kdp.md and .pdf, CHANGES.md and Spread-Love-and-Acceptance-adult-coloring-KDP-package.zip (with a stage/ folder beside it)."""
import json
import os
import re
import shutil
import subprocess
import sys
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
sys.path.insert(0, os.path.join(HERE, '..', 'kids'))
import kids_common as C  # noqa: E402
import adult_text as T  # noqa: E402
import designs as DS  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'book', 'adult')
ZIPNAME = 'Spread-Love-and-Acceptance-adult-coloring-KDP-package.zip'
PRICE = 9.99
PFX = 'adultcolor-coloring-book'

KEYWORDS = [
    'stress relief coloring pages for relaxation',
    'single sided pages blank back no bleed through',
    'botanical flowers leaves nature coloring',
    'cozy cottage lighthouse tea table pictures',
    'zentangle pattern doodle art for beginners',
    'colored pencils gel pens fine markers',
    'gift for moms dads grandparents hobby',
]
TAGS = ['Forty designs, no timer, no wrong colors.', 'A blank page behind every design.', 'Mandalas, gardens and quiet scenes.']
CATS = [
    ('Crafts, Hobbies & Home > Crafts & Hobbies > Coloring Books for Grown-Ups', 'Arts & Photography > Drawing > Coloring Books for Grown-Ups'),
    ('Crafts, Hobbies & Home > Crafts & Hobbies > Mandalas', 'Crafts, Hobbies & Home > Crafts & Hobbies > Coloring Books for Grown-Ups'),
    ('Crafts, Hobbies & Home > Crafts & Hobbies > Flowers & Botanicals', 'Crafts, Hobbies & Home > Gardening & Landscape Design'),
]


def counts():
    from collections import Counter
    c = Counter(d[2] for d in DS.D)
    return c


def description(pages):
    c = counts()
    return (
        '<p><b>Forty original designs to color at your own pace, with no timer and no wrong colors.</b></p>'
        '<p>Color and Breathe is an adult coloring book for anyone who wants something pleasant to do with their hands. Pick a mandala built from exact, layered rings of petals and paisleys, a wreath of leaves, a rainy window with a mug of tea, a lighthouse at dusk, a night sky of constellations, or a few quiet words to fill in. Some pages are intricate and some are simple, so you can choose the one that matches your mood.</p>'
        '<p><b>What is inside</b></p>'
        '<ul>'
        '<li>%d mandalas, each built from layered rings</li>'
        '<li>%d botanical pages: wreaths, ferns, wildflowers, a garden gate, herbs, a bouquet and lavender</li>'
        '<li>%d quiet scenes: a reading nook, a tea table, a kitchen shelf, a porch at dusk, a greenhouse, a stone bridge and more</li>'
        '<li>%d pattern pages to fill with woven fields and tiles</li>'
        '<li>%d calm word pages: Breathe, Enough, Soft, Begin again and Room for everyone</li>'
        '<li>Two pups, Tidbit and Sugarfoot, hide in a few of the pictures</li>'
        '<li>A color test page, a short note on how to use the book and two lines to jot down your favorites</li>'
        '</ul>'
        '<p><b>Made for your pens</b></p>'
        '<p>Clean, fine lines with plenty of open areas, for colored pencils, gel pens and fine markers. Every design is printed on one side of the page only, with a blank page behind it, so markers will not bleed through to the next one.</p>'
        '<p>%d pages, 8.5 x 11 inches, black and white interior. This book is a pastime. It is not therapy and not a diagnosis.</p>'
        '<p>Part of Spread Love &amp; Acceptance, a free website of calm tools, games and books. Everything on it is free to read and use at spreadloveandacceptance.com.</p>'
    ) % (c['mandala'], c['botanical'], c['scene'], c['pattern'], c['word'], pages)


def listing(info):
    pages = info['pages']
    sp = C.spine_in(pages, 'white')
    cost = C.print_cost('bw_large', pages)
    roy, rate = C.royalty(PRICE, cost)
    W = round(2 * C.BLEED + 2 * 8.5 + sp, 4)
    desc = description(pages)
    ch = json.load(open(os.path.join(OUT, 'checks.json')))
    c = counts()
    md = []
    a = md.append
    a('# Amazon KDP listing: Color and Breathe (the adult coloring book)\n')
    a('Made by tools/adultcolor/make_package.py (adultcolor29) from the built files in book/adult/. Copy each field into KDP as it stands. Anything marked **[OWNER]** is yours to decide or confirm. The page count, spine width and cover size are the real ones from the built files; the printing cost is an **estimate** to confirm in KDP\'s own calculator.\n')
    a('## Read this first')
    a('- **One new paperback, print only.** *Color and Breathe* is a companion to the *Spread Love & Acceptance* series: it has no book number. It sits beside the pocket guide and the workbook, and beside the two kids\' coloring books.')
    a('- **Amazon only, free ISBN, free online.** The same decisions as the other titles: sold on Amazon (KDP) and nowhere else, expanded distribution off, KDP\'s free ISBN (it prints in the barcode; no ISBN line inside), and a free PDF on the website behind the same one-time email step as the other books.')
    a('- **Order a proof copy before you publish.** Check the line weight (fine pens, 0.65 to 1.0 pt), the blank backs, the gutter on the left edge of every design, the spine and the barcode corner.')
    a('- **The interior is black and white.** Plain grays and black only (checked), single-sided designs with a blank page behind each, no bleed. The cover is full color, matte.')
    a('- **Print only.** There is no Kindle edition and no EPUB: a coloring book is made to be colored on paper. A Kindle-shaped cover picture is in the package for ads and previews only.')
    a('- **The text is American English** and follows the site\'s language rules (no dashes as punctuation, no semicolons, no hotline or emergency wording, no medical advice lines). The how-to page says in one plain sentence that the book is a pastime and not therapy or a diagnosis.')
    a('\n---\n')
    a('## Launch steps (first-time publisher)\n')
    a('1. Sign in to KDP (kdp.amazon.com) and choose **Create**, then **Paperback**.')
    a('2. **Paperback Details:** language English; title and subtitle as in the table below; series: type **%s** only if you want it linked (no number: this title is a companion, not a numbered book); author **%s**; paste the description (the HTML block); the 7 keywords; the 3 categories; answer the audience questions as shown.' % (T.SERIES, T.AUTHOR))
    a('3. **Paperback Content:** choose **Get a free KDP ISBN**; print options exactly as in the Print details table (black and white, white paper, 8.5 x 11 in, no bleed, matte cover); upload `%s-interior.pdf`; choose "I have a print-ready PDF cover" and upload `%s-cover-wrap.pdf`; open the **Print Previewer** and fix anything it flags (it should flag nothing: margins, fonts and the barcode corner were checked).' % (PFX, PFX))
    a('4. **Paperback Rights & Pricing:** all territories; list price **$%.2f** for Amazon.com, then let KDP suggest the other marketplaces; leave **Expanded distribution** off. Check that KDP\'s printing cost matches the one below (if it differs, KDP\'s figure wins and the royalty changes).' % PRICE)
    a('5. **Order a proof copy.** Check the edges, the gutter, the blank backs, the spine and the barcode corner. Approve it, then **Publish**. Review takes up to a few days.')
    a('6. When it is live, send the Amazon link to the lead (the site\'s download page and the whole-site search can then point to it), and add the title to the series page if you want it listed there (**Add to series**).')
    a('\n---\n')
    a('## At a glance\n')
    a('| Field | Value |\n|---|---|')
    a('| Title | %s |' % T.TITLE)
    a('| Subtitle | %s |' % T.SUBTITLE)
    a('| Series | %s (a companion to the series: no number) |' % T.SERIES)
    a('| Author | %s (first name only, as on the cover) |' % T.AUTHOR)
    a('| Audience | Adults (an adult coloring book) |')
    a('| Trim | 8.5 x 11 in (21.59 x 27.94 cm) |')
    a('| Ink and paper | Black and white, white paper |')
    a('| Bleed | No bleed (every line is inside the margins) |')
    a('| Pages (from pdfinfo) | **%d** (even; 40 designs, each on a right-hand page with a blank back) |' % pages)
    a('| Spine width | **%.4f in** = %d pages x 0.002252 in |' % (sp, pages))
    a('| Cover | Matte, full wrap %.4f x 11.25 in |' % W)
    a('| List price | **$%.2f** |' % PRICE)
    a('| Printing cost (estimate) | $%.2f |' % cost)
    a('| Royalty (estimate) | **$%.2f** a copy |' % roy)
    a('\n---\n')
    a('## Upload file names (every file is in this package, in the folder `%s/`)\n' % PFX)
    a('- Paperback manuscript: `%s-interior.pdf` (%d pages, 612 x 792 pt, fonts embedded, gray only)' % (PFX, pages))
    a('- Paperback cover, full wrap: `%s-cover-wrap.pdf` (%.4f x 11.25 in)' % (PFX, W))
    a('- Front cover picture (ads, Author Central, social posts): `%s-cover-front.jpg` (1600 px wide) and `%s-cover-front-small.jpg` (480 px, for the site)' % (PFX, PFX))
    a('- Kindle edition: **none, this title is print only**')
    a('- Kindle-shaped cover picture (ads and previews only, not uploaded to KDP): `%s-cover-kindle.jpg` (1600 x 2560 px)' % PFX)
    a('\n---\n')
    a('## Basic details\n')
    a('| Field | Paperback |\n|---|---|')
    a('| Language | English |')
    a('| Book title | %s |' % T.TITLE)
    a('| Subtitle | %s |' % T.SUBTITLE)
    a('| Series | %s (companion, no number; optional) |' % T.SERIES)
    a('| Edition number | 1 |')
    a('| Author | %s (first name only, as on the cover) [OWNER] |' % T.AUTHOR)
    a('| Publisher / imprint | Nothing to type: with a free KDP ISBN, KDP shows "Independently published" |')
    a('| Contributors | None |')
    a('| Publishing rights | "I own the copyright and I hold the necessary publishing rights." |')
    a('| Primary audience | Sexually explicit images or title: **No**. Reading age: leave it blank (an adult book); if KDP asks for one, choose **18 and up**. |')
    a('| Primary marketplace | Amazon.com |')
    a('\n**Description** (paste into the description box; KDP allows b, i, u, br, p, ul, ol, li, h4 to h6; %d of 4,000 characters):\n' % len(desc))
    a('```html\n%s\n```\n' % desc)
    a('### Categories (pick 3)')
    a('KDP lets you pick three categories. Names are as KDP\'s category picker words them; check each path in the picker and take the nearest if one is not offered. [OWNER: confirm in the picker]\n')
    a('| | Best 3 | Alternates |\n|---|---|---|')
    for i, (c1, c2) in enumerate(CATS):
        a('| %d | %s | %s |' % (i + 1, c1, c2))
    a('\n### Keywords (the 7 boxes)\n')
    a('| Box | Keyword phrase | Characters |\n|---|---|---|')
    for i, k in enumerate(KEYWORDS):
        a('| %d | %s | %d |' % (i + 1, k, len(k)))
    a('\nNo other authors, brands or claims like "best" or "new". Words already in the title, subtitle and series are left out. [OWNER]\n')
    a('### Print details\n')
    a('| Field | Answer |\n|---|---|')
    a('| ISBN | Choose **"Get a free KDP ISBN"** (it prints in the barcode on the back cover; nothing inside the book needs one). KDP shows "Independently published" as the imprint. |')
    a('| Publication date | Leave blank |')
    a('| Print options | Ink and paper: **Black and white, white paper**. Trim: **8.5 x 11 in (21.59 x 27.94 cm)**. Bleed: **No bleed**. Cover finish: **Matte** (calmer, less glare). |')
    a('| Page count | **%d** (KDP reads it from the file; even, as KDP prints in sheets) |' % pages)
    a('| Spine width | **%.4f in** (%.2f mm) = %d pages x 0.002252 in. Spine text is allowed above 79 pages, so the title and the author are printed on the spine (6.5 pt, white on teal). |' % (sp, sp * 25.4, pages))
    a('| Manuscript file (upload this) | `%s-interior.pdf` (page size 8.5 x 11.0 in, no bleed) |' % PFX)
    a('| Cover file (upload this, "I have a print-ready PDF cover") | `%s-cover-wrap.pdf` (full wrap %.4f x 11.25 in: 0.125 in bleed on all four sides, back, %.4f in spine, front; the 2 x 1.2 in barcode area at the bottom right of the back is left clear) |' % (PFX, W, sp))
    a('| Front cover picture | `%s-cover-front.jpg` |' % PFX)
    a('| Margins | Designs are on right-hand pages, so the binding side is the **left** edge: the frame sits 0.61 in from it. Every other edge is 0.51 in from the trim. KDP asks for at least 0.375 in inside and 0.25 in outside, top and bottom for 24 to 150 pages. A table of the real margins of every page is in `adultcolor-margins.md`. |')
    a('| Line weight | 0.65 pt (fine detail) to 1.04 pt (outlines), round caps, no hairlines |')
    a('| Is this a low-content book? | **No.** Every design page is original artwork. Check KDP\'s current definition on the Paperback Content screen and answer as it defines the term. [OWNER] |')
    a('| Large-print book? | No |')
    a('| Fonts | All embedded (checked with pdffonts): %s |' % ', '.join(ch['interior']['fonts']))
    a('\n### Pricing and the printing cost math\n')
    a('Rule: under 100 pages is **$9.99**, 100 pages and up is **$14.99** (the series rule in tools/book/series.json). This book has %d pages, so the list price is **$%.2f**.\n' % (pages, PRICE))
    a('| Marketplace | List price | Printing cost | Your royalty a copy |\n|---|---|---|---|')
    a('| Amazon.com (primary) | $%.2f | $%.2f (estimate) | **$%.2f** (%d%% x $%.2f = $%.2f, minus printing $%.2f) |' % (PRICE, cost, roy, round(rate * 100), PRICE, round(rate * PRICE, 2), cost))
    a('| Other marketplaces | KDP\'s "based on Amazon.com" suggestion, rounded to .99 | KDP shows it | KDP shows it [OWNER] |')
    a('| Expanded distribution | **No** (Amazon only) | $%.2f | would pay $%.2f a copy (40%% x $%.2f - printing) |' % (cost, round(0.4 * PRICE - cost, 2), PRICE))
    a('\nThe printing cost uses the same assumption as the other listings: **black ink, large trim (8.5 x 11), up to 110 pages: $2.84 a copy** (the figure already used for the kids coloring books and the workbook in tools/book/build_series.py). **This is an estimate: confirm it in KDP\'s calculator before you publish** [OWNER]; if KDP\'s figure differs, KDP\'s wins and the royalty changes by the difference.\n')
    a('Spine and cover math: spine = pages x paper thickness. White paper (black ink) is 0.002252 in a page (KDP\'s paperback cover calculator), so %d x 0.002252 = %.4f in. Full-wrap width = 0.125 + 8.5 + spine + 8.5 + 0.125 = %.4f in; height = 11 + 0.25 = 11.25 in.\n' % (pages, sp, W))
    a('### Kindle\n')
    a('**This title is print only: there is no Kindle edition and no EPUB.** The free PDF on the website is the way to print it at home. A Kindle-shaped cover picture (`%s-cover-kindle.jpg`, 1600 x 2560 px) is in the package for ads and previews only; you do not upload it to KDP.\n' % PFX)
    a('### Taglines for ads (short and true)\n')
    for t in TAGS:
        a('- %s' % t)
    a('\n---\n')
    a('## The book, page by page\n')
    a('88 pages: 1 title, 2 copyright, 3 this book belongs to, 4 how to use this book, 5 color test, 6 blank back, then 40 designs on pages 7, 9 ... 85 (each followed by a blank back), 87 "Your pages" (with a QR code to the Calm games page), 88 blank.\n')
    a('| Page | Design | Family | Pups |\n|---|---|---|---|')
    for i, (fn, title, fam, alt, pups) in enumerate(DS.D):
        a('| %d | %s | %s | %s |' % (7 + 2 * i, title, {'mandala': 'Mandala', 'pattern': 'Pattern page', 'botanical': 'Botanical', 'scene': 'Quiet scene', 'word': 'Calm word'}[fam], 'yes' if pups else ''))
    a('\nFamilies: %d mandalas, %d pattern pages, %d botanicals, %d quiet scenes, %d calm words. Pups appear on %d of the 40.\n' % (c['mandala'], c['pattern'], c['botanical'], c['scene'], c['word'], sum(1 for d in DS.D if d[4])))
    a('---\n')
    a('## Free PDF on the site\n')
    a('The site offers the free PDF on /book/download.html (section "Color and Breathe (adult coloring book)") behind the same one-time email step as the other books. It is the same interior file. The paperback is optional and does not replace it.\n')
    return '\n'.join(md) + '\n', {'pages': pages, 'spine': sp, 'cost': cost, 'royalty': roy, 'price': PRICE, 'wrap_w': W, 'desc_len': len(desc)}


def listing_pdf(md_text, out_pdf):
    import markdown
    body = markdown.markdown(md_text, extensions=['tables', 'fenced_code', 'sane_lists'])
    fonts = os.path.join(HERE, '..', 'kids', 'fonts')
    fonts = os.path.abspath(fonts)
    css = """
@font-face{font-family:Andika;src:url('file://%(f)s/Andika-Regular.ttf');font-weight:400}
@font-face{font-family:Andika;src:url('file://%(f)s/Andika-Bold.ttf');font-weight:700}
@font-face{font-family:Andika;src:url('file://%(f)s/Andika-Italic.ttf');font-style:italic}
@font-face{font-family:Fraunces;src:url('file://%(f)s/Fraunces-Bold.ttf');font-weight:700}
body{font-family:Andika,sans-serif;font-size:9.4pt;line-height:1.45;color:#222}
h1,h2,h3{font-family:Fraunces,serif;color:#1d4a47;page-break-after:avoid}
h1{font-size:20pt} h2{font-size:15pt;border-bottom:1.5px solid #c9b98c;padding-bottom:2px;margin-top:20px} h3{font-size:11.5pt;margin-top:14px}
table{border-collapse:collapse;width:100%%;margin:6px 0 10px;font-size:7.8pt;page-break-inside:auto} tr{page-break-inside:avoid}
td,th{border:1px solid #b9b2a2;padding:3px 5px;vertical-align:top;overflow-wrap:anywhere} th{background:#efe8d6}
pre,code{font-family:ui-monospace,monospace;font-size:8pt} pre{background:#f6f3ea;border:1px solid #d9d1bd;border-radius:4px;padding:6px 8px;white-space:pre-wrap;overflow-wrap:anywhere}
hr{border:0;border-top:1px solid #d9d1bd;margin:14px 0} li{margin:2px 0}
""" % {'f': fonts}
    tmp = out_pdf + '.html'
    C.write(tmp, '<!doctype html><html lang="en-US"><head><meta charset="utf-8"><title>Color and Breathe: KDP listing</title><style>%s</style></head><body>%s</body></html>' % (css, body))
    subprocess.run(['node', os.path.join(HERE, 'md_to_pdf.js'), tmp, out_pdf], check=True, env=dict(os.environ))
    os.remove(tmp)
    subprocess.run(['python3', os.path.join(HERE, 'pdf_meta.py'), out_pdf, 'Color and Breathe: KDP listing', 'Christian'], check=True)


def readme(t):
    return '\n'.join([
        'Spread Love & Acceptance: Color and Breathe (the adult coloring book), KDP package', '=' * 72, '',
        'Read CHANGES.md first: it lists what this package contains.', '',
        'Start with the listing: adultcolor-listing-kdp.pdf (or the same text as adultcolor-listing-kdp.md). It has the launch steps for a first-time publisher, every KDP field, the price, the printing cost estimate and the upload file names.', '',
        'Folders:',
        '  %s/   %s-interior.pdf, %s-cover-wrap.pdf, %s-cover-front.jpg, %s-cover-front-small.jpg, %s-cover-kindle.jpg (ads only)' % ((PFX,) * 6),
        '  adultcolor-previews/   PNG pictures: contact sheets of all 40 designs, sample pages at full size, the full-wrap cover',
        '  adultcolor-site-files/book/adult/   the files the website uses (coloring-adult.pdf and the small cover picture)',
        '  adultcolor-sources/   the builders (tools/adultcolor) and the fonts they use (SIL Open Font License)',
        '  adultcolor-margins.md, adultcolor-pdf-checks.json   the real margins of every page and the readiness checks', '',
        'The numbers (the page count is read from the PDF with pdfinfo):',
        '  %d pages, spine %.4f in, full wrap %.4f x 11.25 in, list $%.2f, printing cost estimate $%.2f, royalty estimate $%.2f' % (t['pages'], t['spine'], t['wrap_w'], t['price'], t['cost'], t['royalty']), '',
        'This title is print only (no Kindle edition, no EPUB). Order a proof copy before you publish.', '',
        'To rebuild: start a local server on port 8731 from the repo root (python3 -m http.server 8731 --bind 127.0.0.1), then',
        '  python3 tools/adultcolor/build_adult.py && python3 tools/adultcolor/ac_cover.py 88',
        '  ADULT_PORT=8731 NODE_PATH=$(npm root -g) node tools/adultcolor/print_adult.js interior && ... cover',
        '  python3 tools/adultcolor/check_pdfs.py --cells && python3 tools/adultcolor/make_package.py <folder> --changes <CHANGES.md>', ''])


def main():
    args = sys.argv[1:]
    dest = os.path.abspath(args[0])
    changes = args[args.index('--changes') + 1] if '--changes' in args else None
    os.makedirs(dest, exist_ok=True)
    meta = json.load(open(os.path.join(OUT, 'adult.json')))
    info = {'pages': int(re.search(r'Pages:\s+(\d+)', subprocess.run(['pdfinfo', os.path.join(OUT, 'coloring-adult.pdf')], capture_output=True, text=True).stdout).group(1))}
    text, totals = listing(info)
    stage = os.path.join(dest, 'stage')
    if os.path.exists(stage):
        shutil.rmtree(stage)
    d = os.path.join(stage, PFX)
    os.makedirs(d)
    shutil.copy(os.path.join(OUT, 'coloring-adult.pdf'), os.path.join(d, PFX + '-interior.pdf'))
    shutil.copy(os.path.join(OUT, 'cover-coloring-adult.pdf'), os.path.join(d, PFX + '-cover-wrap.pdf'))
    shutil.copy(os.path.join(OUT, 'cover-coloring-adult-front.jpg'), os.path.join(d, PFX + '-cover-front.jpg'))
    shutil.copy(os.path.join(OUT, 'cover-coloring-adult-front-small.jpg'), os.path.join(d, PFX + '-cover-front-small.jpg'))
    shutil.copy(os.path.join(OUT, 'cover-coloring-adult-kindle.jpg'), os.path.join(d, PFX + '-cover-kindle.jpg'))
    C.write(os.path.join(dest, 'adultcolor-listing-kdp.md'), text)
    C.write(os.path.join(stage, 'adultcolor-listing-kdp.md'), text)
    listing_pdf(text, os.path.join(dest, 'adultcolor-listing-kdp.pdf'))
    shutil.copy(os.path.join(dest, 'adultcolor-listing-kdp.pdf'), os.path.join(stage, 'adultcolor-listing-kdp.pdf'))
    C.write(os.path.join(stage, 'adultcolor-README.txt'), readme(totals))
    for f, to in (('checks.json', 'adultcolor-pdf-checks.json'), ('adult.json', 'adultcolor-build-info.json')):
        shutil.copy(os.path.join(OUT, f), os.path.join(stage, to))
    mp = os.path.join(dest, 'adultcolor-margins.md')
    if os.path.exists(mp):
        shutil.copy(mp, os.path.join(stage, 'adultcolor-margins.md'))
    pv = os.path.join(dest, 'previews')
    if os.path.isdir(pv):
        shutil.copytree(pv, os.path.join(stage, 'adultcolor-previews'))
    site = os.path.join(stage, 'adultcolor-site-files', 'book', 'adult')
    os.makedirs(site)
    for f in ('coloring-adult.pdf', 'cover-coloring-adult-front-small.jpg'):
        shutil.copy(os.path.join(OUT, f), os.path.join(site, f))
    src = os.path.join(stage, 'adultcolor-sources', 'tools')
    shutil.copytree(os.path.join(ROOT, 'tools', 'adultcolor'), os.path.join(src, 'adultcolor'), ignore=shutil.ignore_patterns('__pycache__', '*.pyc'))
    shutil.copytree(os.path.join(ROOT, 'tools', 'kids', 'fonts'), os.path.join(src, 'kids', 'fonts'))
    for f in ('cute.py', 'cast.py', 'kids_common.py', 'pat.py'):
        os.makedirs(os.path.join(src, 'kids'), exist_ok=True)
        shutil.copy(os.path.join(ROOT, 'tools', 'kids', f), os.path.join(src, 'kids', f))
    if changes:
        shutil.copy(changes, os.path.join(stage, 'CHANGES.md'))
        if os.path.abspath(changes) != os.path.abspath(os.path.join(dest, 'CHANGES.md')):
            shutil.copy(changes, os.path.join(dest, 'CHANGES.md'))
    out = os.path.join(dest, ZIPNAME)
    if os.path.exists(out):
        os.remove(out)
    root = 'Spread-Love-and-Acceptance-adult-coloring-KDP-package'
    first = (['CHANGES.md'] if changes else []) + ['adultcolor-README.txt', 'adultcolor-listing-kdp.pdf', 'adultcolor-listing-kdp.md']
    with zipfile.ZipFile(out, 'w', zipfile.ZIP_DEFLATED) as z:
        for f in first:
            z.write(os.path.join(stage, f), os.path.join(root, f))
        for dp, dn, fn in os.walk(stage):
            dn.sort()
            for f in sorted(fn):
                full = os.path.join(dp, f)
                rel = os.path.relpath(full, stage)
                if rel in first:
                    continue
                z.write(full, os.path.join(root, rel))
    print('zip:', out, round(os.path.getsize(out) / 1048576, 1), 'MB')
    print(json.dumps(totals, indent=1))


if __name__ == '__main__':
    main()
