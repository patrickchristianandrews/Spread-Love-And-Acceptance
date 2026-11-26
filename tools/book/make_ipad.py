#!/usr/bin/env python3
"""make_ipad.py: every finished book in one folder that opens on an iPad or an Android phone or tablet,
plus a one-page how-to for that device.

    python3 tools/book/make_ipad.py <dest dir> [ipad|android|both]     (default: both)

Writes <dest>/Read-on-iPad/ and <dest>/Read-on-Android/ (the files, numbered so they sort in reading order)
and a zip of each: Spread-Love-and-Acceptance-Read-on-iPad.zip, Spread-Love-and-Acceptance-Read-on-Android.zip.
Story books go in as EPUB (the reading app reflows them and remembers your place); picture and coloring books
go in as PDF (every page exactly as printed).
"""
import os
import shutil
import subprocess
import sys
import zipfile

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
DEST = os.path.abspath(sys.argv[1] if len(sys.argv) > 1 else 'ipad')
WHICH = sys.argv[2] if len(sys.argv) > 2 else 'both'

FILES = [
    ('book/kids/epub/picture-book.epub', '01 Tidbit and Sugarfoot\'s Big Picnic (picture book).epub'),
    ('book/kids/picture-book-screen.pdf', '01 Tidbit and Sugarfoot\'s Big Picnic (picture book, every page as printed).pdf'),
    ('book/kids/epub/chapter-book.epub', '02 Turn Down the Static (chapter book).epub'),
    ('book/kids/coloring-younger-home.pdf', '03 Color with Tidbit and Sugarfoot (coloring book, ages 3 to 7).pdf'),
    ('book/kids/coloring-older-home.pdf', '04 Color and Calm with Tidbit and Sugarfoot (coloring book, ages 8 to 12).pdf'),
    ('book/adult/coloring-adult-home.pdf', '05 Color and Breathe (coloring book for grown-ups).pdf'),
    ('book/print/epub/book-1-know-yourself-kindly.epub', '06 Book 1 - Know Yourself Kindly.epub'),
    ('book/print/epub/book-2-heal-and-steady.epub', '07 Book 2 - Heal and Steady.epub'),
    ('book/print/epub/book-3-understanding-each-other.epub', '08 Book 3 - Understanding Each Other.epub'),
    ('book/print/epub/book-4-share-the-load.epub', '09 Book 4 - Share the Load.epub'),
    ('book/print/epub/pocket-the-logic-behind-it.epub', '10 The Logic Behind It (pocket guide).epub'),
    ('book/print/epub/boxset-complete-series.epub', '11 The Complete Series (Books 1 to 4 in one).epub'),
]

HOWTO_IPAD = """<!doctype html><html lang="en"><head><meta charset="utf-8"><title>How to Read These on Your iPad</title>
<style>
@page { size: Letter; margin: 0.7in; }
body { font: 12.5pt/1.5 Georgia, 'Times New Roman', serif; color: #222; }
h1 { font-size: 22pt; margin: 0 0 4pt; } h2 { font-size: 14pt; margin: 18pt 0 4pt; }
p, li { margin: 0 0 6pt; } ol, ul { padding-left: 20pt; margin: 0 0 6pt; }
.k { font-family: Helvetica, Arial, sans-serif; font-size: 10.5pt; color: #555; }
table { border-collapse: collapse; width: 100%%; font-size: 11pt; } td { border-top: 1px solid #ddd; padding: 4pt 6pt 4pt 0; vertical-align: top; }
</style></head><body>
<h1>How to Read These on Your iPad</h1>
<p class="k">Spread Love &amp; Acceptance, every book in one folder</p>

<h2>The quickest way</h2>
<ol>
<li>Put the zip on your iPad: download it there, or AirDrop it from your Mac. Open the <b>Files</b> app, find the zip (usually in Downloads) and tap it once. It opens into a folder.</li>
<li>In the folder, tap a book. When it opens, tap the Share button (the square with the arrow pointing up) and choose <b>Books</b>. Do this once for each book.</li>
<li>Every book now lives in the Apple Books app, under Library. It remembers your page, so you can stop and pick up any time, even with no internet.</li>
</ol>
<p>On a computer instead? Unzip the folder there, then send the books to your iPad. On a Mac, select them, then choose Share, then AirDrop, then your iPad. On any computer, you can also save them to iCloud Drive, Google Drive or Dropbox, or email them to yourself. Then do step 2 on the iPad.</p>

<h2>Which file to open</h2>
<table>
<tr><td><b>.epub</b></td><td>Story books. The words resize to fit the screen, and you can make the text bigger, change the font or turn on night mode with the <b>Aa</b> button.</td></tr>
<tr><td><b>.pdf</b></td><td>Picture and coloring books. Every page looks exactly like the printed book. Turn the iPad sideways to see the picture book in two-page spreads.</td></tr>
</table>
<p>The picture book comes both ways. The EPUB is the easiest to read. The PDF shows each page exactly as it is printed.</p>

<h2>Coloring on the iPad</h2>
<ol>
<li>Open a coloring book PDF in the Files app (not Books).</li>
<li>Tap the pen icon at the top to turn on Markup. Pick a marker and a color and color with your finger or an Apple Pencil.</li>
<li>Tap Done. Your coloring is saved right in the file.</li>
</ol>
<p>Want more brushes and an eraser that only erases your coloring? Free and paid drawing apps such as Procreate, GoodNotes or Notability can import a PDF page and let you color on its own layer.</p>
<p>Prefer paper? The coloring PDFs print on regular letter paper. Print one page at a time, as many times as you like.</p>

<h2>What is in the folder</h2>
<ul>%s</ul>
</body></html>"""

HOWTO_ANDROID = """<!doctype html><html lang="en"><head><meta charset="utf-8"><title>How to Read These on Your Android Phone or Tablet</title>
<style>
@page { size: Letter; margin: 0.7in; }
body { font: 12.5pt/1.5 Georgia, 'Times New Roman', serif; color: #222; }
h1 { font-size: 22pt; margin: 0 0 4pt; } h2 { font-size: 14pt; margin: 18pt 0 4pt; }
p, li { margin: 0 0 6pt; } ol, ul { padding-left: 20pt; margin: 0 0 6pt; }
.k { font-family: Helvetica, Arial, sans-serif; font-size: 10.5pt; color: #555; }
table { border-collapse: collapse; width: 100%%; font-size: 11pt; } td { border-top: 1px solid #ddd; padding: 4pt 6pt 4pt 0; vertical-align: top; }
</style></head><body>
<h1>How to Read These on Your Android Phone or Tablet</h1>
<p class="k">Spread Love &amp; Acceptance, every book in one folder</p>

<h2>The quickest way</h2>
<ol>
<li>Put the zip on your phone or tablet: download it there, or copy it over from your computer. Open the <b>Files</b> app (on Samsung, <b>My Files</b>), find the zip (usually in Downloads) and tap it. Tap <b>Extract</b>, and it opens into a folder.</li>
<li>Install <b>Google Play Books</b> from the Play Store if you don&rsquo;t have it. It&rsquo;s free.</li>
<li>In the folder, tap a book, then choose <b>Play Books</b> (or tap Share, then Play Books). Do this once for each book.</li>
<li>Every book now lives in Play Books, under Library. It remembers your page, so you can stop and pick up any time, even with no internet.</li>
</ol>
<p>On a computer instead? Unzip the folder, go to <b>play.google.com/books</b>, choose <b>Upload files</b> and pick the books. Sign in to the same Google account on your phone and they appear in Play Books there too.</p>
<p>Any other reading app that opens EPUB and PDF files works as well.</p>

<h2>Which file to open</h2>
<table>
<tr><td><b>.epub</b></td><td>Story books. The words resize to fit the screen, and you can make the text bigger, change the font or switch to a dark page with the <b>Aa</b> button.</td></tr>
<tr><td><b>.pdf</b></td><td>Picture and coloring books. Every page looks exactly like the printed book. Turn a tablet sideways to see the picture book in two-page spreads.</td></tr>
</table>
<p>The picture book comes both ways. The EPUB is the easiest to read. The PDF shows each page exactly as it is printed.</p>

<h2>Coloring on the phone or tablet</h2>
<ol>
<li>Open a coloring book PDF in a free PDF app with a pen tool, such as <b>Adobe Acrobat Reader</b> or <b>Xodo</b>. On a Samsung tablet, <b>Samsung Notes</b> can import a PDF too.</li>
<li>Choose the pen or highlighter, pick a color and color with your finger or a stylus.</li>
<li>Save. Your coloring is kept right in the file.</li>
</ol>
<p>Prefer paper? The coloring PDFs print on regular letter paper. Print one page at a time, as many times as you like.</p>

<h2>What is in the folder</h2>
<ul>%s</ul>
</body></html>"""


def build(device):
    NAME = 'Read-on-' + ('iPad' if device == 'ipad' else 'Android')
    DIR = os.path.join(DEST, NAME)
    if os.path.isdir(DIR):
        shutil.rmtree(DIR)
    os.makedirs(DIR)
    items = []
    for src, name in FILES:
        p = os.path.join(ROOT, src)
        if not os.path.isfile(p):
            sys.exit('missing: ' + src)
        shutil.copyfile(p, os.path.join(DIR, name))
        items.append('<li>%s</li>' % name.replace('&', '&amp;').replace("'", '&rsquo;'))
    howto = 'How to Read These on Your ' + ('iPad' if device == 'ipad' else 'Android Phone or Tablet')
    html = (HOWTO_IPAD if device == 'ipad' else HOWTO_ANDROID) % ''.join(items)
    hp = os.path.join(DEST, howto + '.html')
    open(hp, 'w').write(html)
    node = os.environ.get('NODE_PATH', '')
    js = ("const {chromium}=require('playwright');(async()=>{const b=await chromium.launch();const p=await b.newPage();"
          "await p.goto('file://'+process.argv[1]);await p.pdf({path:process.argv[2],format:'Letter',printBackground:true});await b.close();})();")
    subprocess.run(['node', '-e', js, hp, os.path.join(DIR, '00 ' + howto + '.pdf')], check=True,
                   env=dict(os.environ, NODE_PATH=node))
    os.remove(hp)
    z = os.path.join(DEST, 'Spread-Love-and-Acceptance-' + NAME + '.zip')
    if os.path.exists(z):
        os.remove(z)
    with zipfile.ZipFile(z, 'w', zipfile.ZIP_DEFLATED) as zf:
        for f in sorted(os.listdir(DIR)):
            zf.write(os.path.join(DIR, f), os.path.join(NAME, f))
    print(z, '%.1f MB' % (os.path.getsize(z) / 1e6), len(os.listdir(DIR)), 'files')


if __name__ == '__main__':
    for d in (('ipad', 'android') if WHICH == 'both' else (WHICH,)):
        build(d)
