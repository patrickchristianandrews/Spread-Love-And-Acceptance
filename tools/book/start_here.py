#!/usr/bin/env python3
"""start_here.py: one page that ties the three KDP packages together (all twelve paperbacks).

    NODE_PATH=$(npm root -g) python3 tools/book/start_here.py <packages dir>

Reads the built files' numbers (book/kids/kids.json, book/print/series.json, book/adult/adult.json) and writes
<packages dir>/START-HERE-Amazon-listing-guide.html and .pdf. The full listing words for each title (description,
keywords, categories, ages) stay in each package's own listing file; this page says what to do, in what order, and
where each answer is.
"""
import html
import json
import os
import subprocess
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEST = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
J = lambda p: json.load(open(os.path.join(ROOT, p)))
K = J('book/kids/kids.json')['books']
S = J('book/print/series.json')['books']
AD = J('book/adult/adult.json')
sys.path.insert(0, os.path.join(ROOT, 'tools', 'kids'))
import coloring_text as CT  # noqa: E402


def pages(pdf):
    out = subprocess.run(['pdfinfo', pdf], capture_output=True, text=True).stdout
    return int([l for l in out.splitlines() if l.startswith('Pages:')][0].split()[1])


def price(p):
    return '$9.99' if p < 100 else '$14.99'


PB = json.load(open(os.path.join(ROOT, '_manuscripts', 'kids', 'picture-book.json')))
CB = json.load(open(os.path.join(ROOT, '_manuscripts', 'kids', 'chapter-book', '00-book.json')))
rows = []
kp = lambda f: pages(os.path.join(ROOT, 'book', 'kids', f))
rows.append(('Kids package', '1', PB['title'], PB['subtitle'], 'The Frequency Buddies Books', '8.5 x 8.5 in, bleed', 'Premium color, white paper', kp('picture-book.pdf'), 'Paperback + Kindle (EPUB)'))
rows.append(('Kids package', '2', CB['title'], CB['subtitle'], 'The Frequency Buddies Books', '6 x 9 in, no bleed', 'Black ink, white paper', kp('chapter-book.pdf'), 'Paperback + Kindle (EPUB)'))
rows.append(('Kids package', '3', CT.YOUNGER['title'], CT.YOUNGER['subtitle'], 'The Frequency Buddies Books', '8.5 x 11 in, no bleed', 'Black ink, white paper', kp('coloring-younger.pdf'), 'Paperback only'))
rows.append(('Kids package', '4', CT.OLDER['title'], CT.OLDER['subtitle'], 'The Frequency Buddies Books', '8.5 x 11 in, no bleed', 'Black ink, white paper', kp('coloring-older.pdf'), 'Paperback only'))
rows.append(('Grown-up coloring package', '', AD['title'], AD['subtitle'], 'Spread Love & Acceptance (companion)', '8.5 x 11 in, no bleed', 'Black ink, white paper', pages(os.path.join(ROOT, 'book', 'adult', 'coloring-adult.pdf')), 'Paperback only'))
SER = json.load(open(os.path.join(ROOT, 'tools', 'book', 'series.json')))
subs = {b['id']: b.get('sub', '') for b in SER.get('books', [])}
subs[SER['workbook']['id']] = SER['workbook'].get('sub', '')
PK = json.load(open(os.path.join(ROOT, 'tools', 'book', 'series-extras.json')))['pocket']
subs[PK['id']] = PK.get('sub', '')
for bid, b in S.items():
    if b.get('kind') == 'front':
        continue
    ink = 'Black ink, white paper' if b.get('edition') == 'bw' else 'Standard color, white paper'
    trim = '%s x %s in, no bleed' % tuple(('%g' % x) for x in b['trim_in'])
    title = b['title']
    sub = subs.get(bid, subs.get(bid.replace('-bw', ''), ''))
    rows.append(('Series package', str(b.get('n') or ''), title, sub, 'Spread Love & Acceptance', trim, ink, b['pages'],
                 'Paperback + Kindle (EPUB)' if b.get('kind') in ('book', 'pocket') else 'Paperback only'))

e = html.escape
trs = ''.join('<tr><td>%s</td><td>%s</td><td><b>%s</b><br><span class="s">%s</span></td><td>%s</td><td>%s<br>%s</td><td>%d</td><td>%s</td><td>%s</td></tr>' % (
    e(r[0]), e(r[1]), e(r[2]), e(r[3]), e(r[4]), e(r[5]), e(r[6]), r[7], price(r[7]), e(r[8])) for r in rows)

page = '''<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Start Here: Listing the Books on Amazon</title>
<style>
@page { size: Letter landscape; margin: 0.5in; }
body { font: 10.5pt/1.45 Georgia, serif; color: #222; }
h1 { font-size: 21pt; margin: 0 0 2pt; } h2 { font-size: 13.5pt; margin: 14pt 0 4pt; }
p, li { margin: 0 0 5pt; } ol, ul { padding-left: 18pt; margin: 0 0 6pt; }
table { border-collapse: collapse; width: 100%%; font: 8.6pt/1.3 Helvetica, Arial, sans-serif; }
th { text-align: left; background: #F2EBDD; } td, th { border: 1px solid #DDD3BF; padding: 3pt 5pt; vertical-align: top; }
.s { color: #555; } .k { font: 9pt Helvetica, Arial, sans-serif; color: #666; }
.box { border: 1.5px solid #C9B98F; border-radius: 6pt; padding: 6pt 10pt; margin: 6pt 0; background: #FFFCF4; }
</style></head><body>
<h1>Start Here: Listing the Books on Amazon</h1>
<p class="k">Twelve paperbacks (and five Kindle editions) in three packages. Print on demand through Amazon KDP.</p>

<div class="box"><b>What only you can do.</b> Amazon publishing needs your own KDP account, so the clicks are yours. Every answer you will type is ready in the packages. Plan about 20 to 30 minutes a title, plus a few days for each proof copy to arrive.</div>

<h2>1. Before the first book (one time)</h2>
<ol>
<li>Go to <b>kdp.amazon.com</b> and sign in with an Amazon account (or create one). Use your legal name.</li>
<li>Finish the <b>Account</b> page: your author/publisher name, your address, your <b>bank account</b> for royalties and the <b>tax interview</b> (W-9 for US persons). KDP will not publish until these are done.</li>
<li>Unzip the three packages. Each has a listing file (<b>kids-listing-kdp.pdf</b>, <b>adultcolor-listing-kdp.pdf</b>, <b>listing-kdp.md</b> with <b>Amazon-KDP-step-by-step</b> for the series) with every field for every title.</li>
</ol>

<h2>2. For each title (the same every time)</h2>
<ol>
<li>Bookshelf, <b>+ Create</b>, <b>Paperback</b>.</li>
<li><b>Details:</b> language English; title and subtitle <b>exactly as in the table below</b> (KDP checks them against the cover); series name and number; author <b>Patrick Christian Andrews</b>; description (paste the HTML block from the listing file); the 7 keywords; the categories; the reading ages for the kids titles; &ldquo;No&rdquo; to sexually explicit content.</li>
<li><b>Content:</b> choose <b>Get a free KDP ISBN</b>; set ink and paper, trim and bleed exactly as in the table; matte cover; upload the <b>interior PDF</b> and the <b>cover PDF</b> from that title&rsquo;s folder; open the <b>Print Previewer</b> and check every page. Answer the <b>AI questions</b> truthfully (see the box below).</li>
<li><b>Rights &amp; Pricing:</b> all territories; the list price in the table for Amazon.com, then let KDP fill in the other marketplaces; <b>Expanded Distribution off</b>. Check the printing cost KDP shows against the listing file.</li>
<li><b>Order a proof copy.</b> When it arrives, check the color, the edges, the spine and the barcode corner. Then <b>Publish</b>. Review usually takes up to 72 hours.</li>
<li><b>Kindle</b> (picture book, chapter book, Books 1 to 4 and the pocket guide): from the published paperback choose <b>Create Kindle eBook</b>, reuse the same details, upload the <b>.epub</b> and the <b>Kindle cover JPG</b>, preview, price as in the listing file, publish.</li>
</ol>

<div class="box"><b>KDP&rsquo;s AI questions.</b> On the Content page, KDP asks whether AI-based tools were used to create the texts, the images and any translations, one at a time. &ldquo;AI-generated&rdquo; (AI made the actual words or pictures, even if you edited them) must be disclosed; &ldquo;AI-assisted&rdquo; (you made it and used AI to brainstorm, edit or check) need not be. Only you know how each book was made, so answer truthfully for each one. The answer is for Amazon only and is not shown on the store page.</div>
<div class="box"><b>Free on your website.</b> These books are also free on spreadloveandacceptance.com. KDP sometimes asks a publisher to prove they own content that is freely available online. If it does, reply from an email address at your website&rsquo;s domain and point to the copyright page (your name and the year) and to the site itself.</div>

<h2>3. The twelve paperbacks</h2>
<table><tr><th>Package</th><th>No.</th><th>Title and subtitle (type exactly)</th><th>Series</th><th>Trim and ink</th><th>Pages</th><th>List price</th><th>Formats</th></tr>%s</table>
<p class="k">Prices follow your rule: $9.99 under 100 pages, $14.99 from 100 pages. The listing files show the printing cost and royalty for each. Kindle prices are in the listing files.</p>

<h2>4. After they are live</h2>
<ul>
<li>On each book&rsquo;s page in KDP, use <b>Add to series</b> (or the series section in Details) so the books show as a series on Amazon.</li>
<li>Claim your author page at <b>author.amazon.com</b> and add all twelve books.</li>
<li>Kindle and paperback editions link on one page by themselves when the title and author match. If they don&rsquo;t within a few days, ask KDP support to link them.</li>
</ul>
</body></html>''' % trs

out_html = os.path.join(DEST, 'START-HERE-Amazon-listing-guide.html')
open(out_html, 'w').write(page)
js = ("const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();"
      "await p.goto('file://'+process.argv[1]);await p.pdf({path:process.argv[2],format:'Letter',landscape:true,printBackground:true});await b.close();})();")
subprocess.run(['node', '-e', js, out_html, out_html[:-5] + '.pdf'], check=True)
print(out_html[:-5] + '.pdf', len(rows), 'titles')
