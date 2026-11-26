#!/usr/bin/env python3
"""listing_guide.py: every Amazon listing in one guide, ready to paste (listing26).

    NODE_PATH=$(npm root -g) python3 tools/book/listing_guide.py <dest dir>

Writes <dest>/Amazon-listings-all-titles.html and .pdf: for each title, the title and subtitle to type, the series,
the 3 categories (with alternates), the 7 keywords, and the description twice, once as it will look on Amazon and
once as the HTML to paste into KDP. The words come from tools/book/listing_copy.py through the three package builders,
so this guide and the packages always say the same thing.
"""
import html
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.dirname(os.path.dirname(HERE))
DEST = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else '.')
sys.path.insert(0, HERE)
sys.argv = sys.argv[:1]
import listing_kdp as S  # noqa: E402  (the series: titles, categories and the description builder)
sys.path.insert(0, os.path.join(ROOT, 'tools', 'kids'))
import make_package as K  # noqa: E402
sys.path.insert(0, os.path.join(ROOT, 'tools', 'adultcolor'))
import importlib.util  # noqa: E402
_spec = importlib.util.spec_from_file_location('adult_pkg', os.path.join(ROOT, 'tools', 'adultcolor', 'make_package.py'))
A = importlib.util.module_from_spec(_spec)
_spec.loader.exec_module(A)
import json  # noqa: E402

e = html.escape
ENTRIES = []

# the Frequency Buddies books
for t in K.TITLES:
    ENTRIES.append(dict(group='The Frequency Buddies Books (children)', title=t['name'], sub=t['sub'], series='The Frequency Buddies Books, number %d' % t['n'],
                        who='Reading age %d to %d (%s)' % (t['ages'][0], t['ages'][1], t['grades']), formats='Paperback and Kindle' if t.get('epub') else 'Paperback only',
                        desc=K.DESC[t['id']], kw=K.KEYWORDS[t['id']], cats=[a for a, b in K.CATS[t['id']]], alt=[b for a, b in K.CATS[t['id']]]))
# the grown-up coloring book
AD = json.load(open(os.path.join(ROOT, 'book', 'adult', 'adult.json')))
ENTRIES.append(dict(group='For grown-ups', title=AD['title'], sub=AD['subtitle'], series='Spread Love & Acceptance (a companion, no number)', who='Adults',
                    formats='Paperback only', desc=A.description(AD.get('pages') or 88), kw=A.KEYWORDS, cats=[a for a, b in A.CATS], alt=[b for a, b in A.CATS]))
# the series
for item in S.CFG['books'] + [S.POCKET, S.CFG['workbook'], S.WB_BW]:
    bid = item['id']
    kind = 'workbook' if bid in ('workbook', S.WB_BW['id']) else ('pocket' if bid == S.POCKET['id'] else 'book')
    d = S.L[bid]
    name = item['title'] + (' (black-and-white edition)' if bid == S.WB_BW['id'] else ' (color edition)' if bid == 'workbook' else '')
    ENTRIES.append(dict(group='Spread Love & Acceptance (the series)', title=name, sub=item['sub'],
                        series='Spread Love & Acceptance' + (', number %d' % item['n'] if item.get('n') else ' (a companion, no number)'), who='Adults',
                        formats='Paperback only' if kind == 'workbook' else 'Paperback and Kindle', desc=S.description(item, d, kind), kw=d['kw'], cats=d['cats'], alt=d.get('alt', [])))

intro = '''<h1>Amazon Listings: Every Title</h1>
<p class="k">Spread Love &amp; Acceptance and The Frequency Buddies Books. %d titles. Copy each field into KDP as it stands.</p>
<div class="box"><b>How people will find these books.</b> Amazon&rsquo;s search reads the title, the subtitle, the 7 keyword boxes and the categories most. So the keywords here are the phrases shoppers type when they look for books like these (for example &ldquo;mental load,&rdquo; &ldquo;social emotional learning picture book&rdquo; or &ldquo;mindfulness coloring book for tweens&rdquo;). They never repeat a word that is already in the title, subtitle or series name, because Amazon counts those already, and they never name another author, a brand or a trademark, which Amazon does not allow. The categories put each book on the same shelves as the books it is most like, which is how it shows up under &ldquo;Customers also bought&rdquo; and in category best-seller lists.</div>
<div class="box"><b>What the descriptions do.</b> Each one opens with the everyday moment the book is about, says plainly what is inside, then says what makes it different from other books on the same shelf. They use no reviews, prices, web addresses or claims like &ldquo;best,&rdquo; which Amazon removes.</div>
<div class="box"><b>Already published a title?</b> On your KDP Bookshelf choose the three dots next to it, then <b>Edit paperback details</b> (and the same for the Kindle edition). Paste the new description, keywords and categories and press <b>Publish</b>. The book stays on sale, keeps its reviews and its ranking, and the new words go live after Amazon&rsquo;s review, usually within 72 hours.</div>
<p><b>Categories:</b> pick the three under &ldquo;Use these.&rdquo; If KDP&rsquo;s category picker words a path a little differently, choose the nearest one, or use the alternate.</p>
''' % len(ENTRIES)

parts, last = [], None
for x in ENTRIES:
    if x['group'] != last:
        parts.append('<h2 class="grp">%s</h2>' % e(x['group']))
        last = x['group']
    kw = ''.join('<tr><td>%d</td><td>%s</td><td>%d</td></tr>' % (i + 1, e(k), len(k)) for i, k in enumerate(x['kw']))
    cats = ''.join('<tr><td>%d</td><td>%s</td><td class="s">%s</td></tr>' % (i + 1, e(c), e(x['alt'][i]) if i < len(x['alt']) else '') for i, c in enumerate(x['cats']))
    parts.append('''<section class="t">
<h3>%s</h3>
<table class="f"><tr><th>Title</th><td>%s</td></tr><tr><th>Subtitle</th><td>%s</td></tr><tr><th>Series</th><td>%s</td></tr><tr><th>Author</th><td>Patrick Christian Andrews</td></tr><tr><th>Audience</th><td>%s</td></tr><tr><th>Formats</th><td>%s</td></tr></table>
<h4>Keywords (the 7 boxes)</h4><table class="kw"><tr><th>Box</th><th>Phrase</th><th>Letters</th></tr>%s</table>
<h4>Categories</h4><table class="kw"><tr><th></th><th>Use these</th><th>Alternate</th></tr>%s</table>
<h4>Description, as shoppers will see it</h4><div class="desc">%s</div>
<h4>Description to paste into KDP (%d of 4,000 characters)</h4><pre>%s</pre>
</section>''' % (e(x['title']), e(x['title']), e(x['sub']), e(x['series']), e(x['who']), e(x['formats']), kw, cats, x['desc'], len(x['desc']), e(x['desc'])))

page = '''<!doctype html><html lang="en"><head><meta charset="utf-8"><title>Amazon Listings: Every Title</title>
<style>
@page { size: Letter; margin: 0.6in; }
body { font: 10.5pt/1.5 Georgia, serif; color: #222; }
h1 { font-size: 22pt; margin: 0 0 2pt; } h2.grp { font-size: 16pt; margin: 22pt 0 6pt; padding-top: 6pt; border-top: 2px solid #C9B98F; page-break-before: always; }
h3 { font-size: 14pt; margin: 14pt 0 6pt; } h4 { font: 600 10pt Helvetica, Arial, sans-serif; margin: 10pt 0 4pt; color: #6A5A30; text-transform: uppercase; letter-spacing: .04em; }
p { margin: 0 0 6pt; } .k { font: 9.5pt Helvetica, Arial, sans-serif; color: #666; }
.box { border: 1.5px solid #C9B98F; border-radius: 6pt; padding: 6pt 10pt; margin: 6pt 0; background: #FFFCF4; }
table { border-collapse: collapse; width: 100%; font: 9pt/1.35 Helvetica, Arial, sans-serif; } td, th { border: 1px solid #DDD3BF; padding: 3pt 5pt; vertical-align: top; text-align: left; }
th { background: #F2EBDD; } table.f th { width: 18%; } .s { color: #666; }
.desc { border: 1px solid #DDD3BF; border-radius: 4pt; padding: 6pt 10pt; font: 10pt/1.45 Arial, sans-serif; }
.desc ul { margin: 2pt 0 6pt; padding-left: 16pt; } .desc li { margin: 0 0 2pt; }
pre { white-space: pre-wrap; word-break: break-word; font: 7.6pt/1.35 Menlo, Consolas, monospace; background: #F7F4EC; border: 1px solid #E4DCC8; padding: 6pt; border-radius: 4pt; }
section.t { page-break-inside: auto; } section.t + section.t { page-break-before: always; }
</style></head><body>''' + intro + ''.join(parts) + '</body></html>'

os.makedirs(DEST, exist_ok=True)
out = os.path.join(DEST, 'Amazon-listings-all-titles.html')
open(out, 'w').write(page)
js = ("const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();"
      "await p.goto('file://'+process.argv[1]);await p.pdf({path:process.argv[2],format:'Letter',printBackground:true});await b.close();})();")
subprocess.run(['node', '-e', js, out, out[:-5] + '.pdf'], check=True)
print(out[:-5] + '.pdf', len(ENTRIES), 'titles')
