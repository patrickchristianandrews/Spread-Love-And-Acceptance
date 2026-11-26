#!/usr/bin/env python3
"""kdp_screens.py: Amazon KDP, screen by screen, for every title (listing26).

    NODE_PATH=$(npm root -g) python3 tools/book/kdp_screens.py <dest dir>

Writes <dest>/Amazon-KDP-screen-by-screen.html and .pdf: for each title, in publishing order (the four main books,
then the pocket guide and the workbook, then the Frequency Buddies books, then Color and Breathe), exactly what to
choose and type on each KDP screen, with the description, the 7 keywords, the 3 categories, the files to upload,
the price and the Kindle steps. The words come from tools/book/listing_copy.py through the package builders, and the
pages, costs and prices from the built books, so this guide matches the packages.
"""
import html
import importlib.util
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
DEST = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
sys.argv = sys.argv[:1]
sys.path.insert(0, HERE)
import listing_kdp as S  # noqa: E402
sys.path.insert(0, os.path.join(ROOT, 'tools', 'kids'))
import make_package as K  # noqa: E402
_spec = importlib.util.spec_from_file_location('adult_pkg', os.path.join(ROOT, 'tools', 'adultcolor', 'make_package.py'))
A = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(A)

e = html.escape
B = lambda s: '<b>%s</b>' % e(s)


def pdfpages(p):
    out = subprocess.run(['pdfinfo', p], capture_output=True, text=True).stdout
    m = re.search(r'Pages:\s+(\d+)', out)
    return int(m.group(1)) if m else 0


def money(x):
    return '$%.2f' % x


T = []   # every title, in publishing order

# ------------------------------------------------------------------ the series (main books, then the short editions)
SER_ORDER = S.CFG['books'] + [S.POCKET, S.WB_BW]
for item in SER_ORDER:
    bid = item['id']
    kind = 'workbook' if bid == S.WB_BW['id'] else ('pocket' if bid == S.POCKET['id'] else 'book')
    d, m = S.L[bid], S.MADE.get(bid, {})
    c = (m.get('costs') or {}).get('kdp_amazon', {})
    price = S.list_price(bid, kind)
    trim = '%g x %g in' % tuple(m.get('trim_in') or (6, 9))
    ink = 'Black and white, white paper' if m.get('edition') == 'bw' else 'Standard color, white paper'
    folder = bid
    kprice = item.get('kindle_price_usd') or S.KINDLE_PRICE
    T.append(dict(
        group='Spread Love & Acceptance: the main books' if kind == 'book' else 'Spread Love & Acceptance: the pocket guide and the workbook',
        head=('Book %d: ' % item['n'] if item.get('n') else '') + item['title'] + (' (black-and-white edition)' if kind == 'workbook' else ''),
        title=item['title'], sub=item['sub'],
        series=('Create (the first time) or pick the series <b>Spread Love &amp; Acceptance</b>, number <b>%d</b>.' % item['n']) if item.get('n') else
               'Pick the series <b>Spread Love &amp; Acceptance</b> and add this book as a companion with <b>no number</b> (or leave Series blank).',
        audience='Sexually explicit: <b>No</b>. Reading age: leave blank (adults).',
        desc=S.description(item, d, kind), kw=d['kw'], cats=d['cats'], alt=d.get('alt', []),
        ink=ink, trim=trim, bleed='No bleed', finish='Matte', pages=m.get('pages', 0),
        interior='%s/%s-interior.pdf' % (folder, folder), cover='%s/%s-cover-wrap.pdf' % (folder, folder), pkg='series package',
        price=price, print=c.get('print'), net=c.get('net'),
        kindle=None if kind == 'workbook' else dict(price=kprice, epub='%s/%s.epub' % (folder, folder), jpg='%s/%s-cover-kindle.jpg' % (folder, folder)),
        note=('The workbook comes in two editions. Publish this black-and-white one (it costs less to print and pays more). '
              'The color edition is in the package folder <b>workbook/</b> if you ever want it instead, with the same words.') if kind == 'workbook' else '',
    ))

# ------------------------------------------------------------------ the Frequency Buddies books
KF = {'picture-book': 'kids-picture-book', 'chapter-book': 'kids-chapter-book', 'coloring-younger': 'kids-coloring-book-younger', 'coloring-older': 'kids-coloring-book-older'}
for t in K.TITLES:
    folder = KF[t['id']]
    pages = pdfpages(os.path.join(ROOT, 'book', 'kids', t['interior']))
    cost = K.C.print_cost(t['kind'], pages)
    price = 9.99 if pages < 100 else 14.99
    net = round(0.6 * price - cost, 2)
    T.append(dict(
        group='The Frequency Buddies Books (children)', head='Kids %d: %s' % (t['n'], t['name']), title=t['name'], sub=t['sub'],
        series='Create (the first time) or pick the series <b>The Frequency Buddies Books</b>, number <b>%d</b>.' % t['n'],
        audience='Sexually explicit: <b>No</b>. Reading age: <b>%d</b> to <b>%d</b>. Grade range, if asked: %s.' % (t['ages'][0], t['ages'][1], e(t['grades'])),
        desc=K.DESC[t['id']], kw=K.KEYWORDS[t['id']], cats=[a for a, b in K.CATS[t['id']]], alt=[b for a, b in K.CATS[t['id']]],
        ink=t['ink'], trim=t['trim'].split(' (')[0], bleed=t['bleed'], finish='Matte', pages=pages,
        interior='%s/%s-interior.pdf' % (folder, folder), cover='%s/%s-cover-wrap.pdf' % (folder, folder), pkg='kids package',
        price=price, print=cost, net=net,
        kindle=dict(price=K.KINDLE[t['id']], epub='%s/%s.epub' % (folder, folder), jpg='%s/%s-cover-kindle.jpg' % (folder, folder)) if t.get('epub') else None,
        note='This one needs <b>Premium color</b>: KDP&rsquo;s standard color starts at 72 pages.' if t['id'] == 'picture-book' else '',
    ))

# ------------------------------------------------------------------ Color and Breathe
AD = json.load(open(os.path.join(ROOT, 'book', 'adult', 'adult.json')))
ap = pdfpages(os.path.join(ROOT, 'book', 'adult', 'coloring-adult.pdf'))
acost = K.C.print_cost('bw_large', ap)
T.append(dict(
    group='For grown-ups', head=AD['title'], title=AD['title'], sub=AD['subtitle'],
    series='Pick the series <b>Spread Love &amp; Acceptance</b> and add it as a companion with <b>no number</b> (or leave Series blank).',
    audience='Sexually explicit: <b>No</b>. Reading age: leave blank (if KDP asks, choose 18 and up).',
    desc=A.description(ap), kw=A.KEYWORDS, cats=[a for a, b in A.CATS], alt=[b for a, b in A.CATS],
    ink='Black and white, white paper', trim='8.5 x 11 in', bleed='No bleed', finish='Matte', pages=ap,
    interior='adultcolor-coloring-book/adultcolor-coloring-book-interior.pdf', cover='adultcolor-coloring-book/adultcolor-coloring-book-cover-wrap.pdf', pkg='grown-up coloring package',
    price=9.99, print=acost, net=round(0.6 * 9.99 - acost, 2), kindle=None, note=''))


def block(n, x):
    kw = ''.join('<li>%s</li>' % e(k) for k in x['kw'])
    cats = ''.join('<li>%s%s</li>' % (e(c.replace('Books › ', '').replace(' › ', ' › ')), (' <span class="s">(or: %s)</span>' % e(x['alt'][i].replace('Books › ', ''))) if i < len(x['alt']) else '')
                   for i, c in enumerate(x['cats']))
    k = x['kindle']
    kin = ('''<h4>Then the Kindle edition</h4><ul>
<li>On your Bookshelf, choose <b>Create Kindle eBook</b> next to this paperback. KDP copies over the title, subtitle, series and description. Check the keywords and categories came across too.</li>
<li><b>Manuscript:</b> upload <code>%s</code>.</li>
<li><b>Cover:</b> choose to upload a cover you already have, and upload <code>%s</code>.</li>
<li><b>AI questions:</b> answer them yourself, the same way as for the paperback.</li>
<li><b>Kindle Previewer:</b> open it and page through.</li>
<li><b>ISBN:</b> leave blank. Amazon gives the Kindle edition its own number.</li>
<li><b>Price:</b> <b>%s</b> with the <b>70%%</b> royalty, all territories.</li>
<li><b>KDP Select:</b> off (the book is free on your website, and Select needs the ebook to be on Amazon only). <b>DRM:</b> off.</li>
</ul>''' % (e(k['epub']), e(k['jpg']), money(k['price']))) if k else '<p class="s">No Kindle edition for this title: it is a paperback only.</p>'
    return '''<section class="t"><p class="n">Title %d of %d</p><h3>%s</h3>%s
<p class="go">On the Create screen choose <b>Paperback</b>.</p>
<h4>Screen 1: Paperback Details</h4><ul>
<li><b>Language:</b> English</li>
<li><b>Book title:</b> %s</li>
<li><b>Subtitle:</b> %s</li>
<li><b>Series:</b> choose <b>Add series details</b>. %s</li>
<li><b>Edition number:</b> 1</li>
<li><b>Author:</b> Patrick Christian Andrews. Leave Contributors empty.</li>
<li><b>Description:</b> copy the box below and paste it into KDP&rsquo;s description box. The bold lines and bullet points come across.</li>
<li><b>Publishing rights:</b> &ldquo;I own the copyright and I hold the necessary publishing rights.&rdquo;</li>
<li><b>Primary audience:</b> %s</li>
<li><b>Primary marketplace:</b> Amazon.com</li>
<li><b>Categories</b> (choose these 3):<ol>%s</ol></li>
<li><b>Keywords</b> (one phrase per box):<ol>%s</ol></li>
</ul>
<div class="desc"><p class="dl">Description</p>%s</div>
<h4>Screen 2: Paperback Content</h4><ul>
<li><b>ISBN:</b> choose <b>Get a free KDP ISBN</b>.</li>
<li><b>Print options:</b> %s. Trim %s. %s. %s cover.</li>
<li><b>Manuscript:</b> upload <code>%s</code>.</li>
<li><b>Cover:</b> choose &ldquo;Upload a cover you already have (print-ready PDF only)&rdquo; and upload <code>%s</code>. (Both files are in the %s.)</li>
<li><b>Low-content book:</b> No. <b>Large print:</b> No.</li>
<li><b>AI questions:</b> answer them yourself, truthfully, for the text and the images. The box in the Start Here guide explains what KDP means by each choice.</li>
<li><b>Print Previewer:</b> open it and page through. It should show <b>%d pages</b> and flag nothing.</li>
</ul>
<h4>Screen 3: Paperback Rights &amp; Pricing</h4><ul>
<li><b>Territories:</b> All territories.</li>
<li><b>Price:</b> <b>%s</b> on Amazon.com, then let KDP fill in the other marketplaces. KDP should show a printing cost of about %s, leaving you about %s a copy.</li>
<li><b>Expanded distribution:</b> off.</li>
<li><b>Proof:</b> choose <b>Request printed proof</b> before you publish. When it arrives, check the colors, the margins and the spine, then press <b>Publish</b>.</li>
</ul>
%s</section>''' % (n, len(T), e(x['head']), ('<p class="note">%s</p>' % x['note']) if x['note'] else '', e(x['title']), e(x['sub']), x['series'], x['audience'], cats, kw, x['desc'],
                   e(x['ink']), e(x['trim']), e(x['bleed']), e(x['finish']), e(x['interior']), e(x['cover']), e(x['pkg']), x['pages'],
                   money(x['price']), money(x['print'] or 0), money(x['net'] or 0), kin)


parts, last = [], None
for i, x in enumerate(T):
    if x['group'] != last:
        parts.append('<h2 class="grp">%s</h2>' % e(x['group']))
        last = x['group']
    parts.append(block(i + 1, x))

intro = '''<h1>Amazon KDP, Screen by Screen</h1>
<p class="k">Every title, in the order to publish them. Patrick Christian Andrews. %d paperbacks, %d with a Kindle edition.</p>
<div class="box"><b>Before the first book:</b> sign in at kdp.amazon.com and finish the <b>Account</b> page (your name and address, your bank account for royalties, and the tax interview). KDP won&rsquo;t publish until those are done.</div>
<div class="box"><b>The series:</b> you create each series only once, inside the first book&rsquo;s Screen 1 (<b>Add series details</b>, then <b>Create a new series</b>). After that, pick it from the list. Type the names exactly: <b>Spread Love &amp; Acceptance</b> and <b>The Frequency Buddies Books</b>.</div>
<div class="box"><b>Files:</b> every file named below is inside the package named in that title&rsquo;s Screen 2, in the folder shown before the slash.</div>
''' % (len(T), sum(1 for x in T if x['kindle']))

page = '''<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Amazon KDP, Screen by Screen</title>
<style>
@page { size: Letter; margin: 0.6in; }
body { font: 10.5pt/1.5 Georgia, serif; color: #222; }
h1 { font-size: 22pt; margin: 0 0 2pt; } h2.grp { font-size: 17pt; margin: 0 0 8pt; padding-top: 6pt; border-top: 2px solid #C9B98F; page-break-before: always; }
h3 { font-size: 15pt; margin: 4pt 0 6pt; } h4 { font: 700 10.5pt Helvetica, Arial, sans-serif; margin: 12pt 0 4pt; color: #5B4A22; }
p { margin: 0 0 6pt; } .k { font: 9.5pt Helvetica, Arial, sans-serif; color: #666; } .n { font: 9pt Helvetica, Arial, sans-serif; color: #8A7A50; margin: 8pt 0 0; }
.box { border: 1.5px solid #C9B98F; border-radius: 6pt; padding: 6pt 10pt; margin: 6pt 0; background: #FFFCF4; }
.go { font-size: 11pt; } .note { border-left: 3px solid #C9B98F; padding-left: 8pt; }
ul, ol { margin: 0 0 4pt; padding-left: 18pt; } li { margin: 0 0 3pt; } li ol { margin-top: 3pt; }
code { font: 9pt Menlo, Consolas, monospace; background: #F4EFE3; padding: 0 2pt; border-radius: 2pt; word-break: break-all; }
.s { color: #777; font-size: 9.5pt; }
.desc { border: 1px solid #DDD3BF; border-radius: 4pt; padding: 6pt 10pt; margin: 6pt 0 4pt; font: 10pt/1.45 Arial, sans-serif; background: #fff; }
.desc .dl { font: 700 8.5pt Helvetica, Arial, sans-serif; color: #8A7A50; text-transform: uppercase; letter-spacing: .05em; margin: 0 0 4pt; }
.desc ul { margin: 2pt 0 6pt; } section.t + section.t { page-break-before: always; }
</style></head><body>''' + intro + ''.join(parts) + '</body></html>'

os.makedirs(DEST, exist_ok=True)
out = os.path.join(DEST, 'Amazon-KDP-screen-by-screen.html')
open(out, 'w').write(page)
js = ("const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();"
      "await p.goto('file://'+process.argv[1]);await p.pdf({path:process.argv[2],format:'Letter',printBackground:true});await b.close();})();")
subprocess.run(['node', '-e', js, out, out[:-5] + '.pdf'], check=True)
print(out[:-5] + '.pdf', len(T), 'titles')
