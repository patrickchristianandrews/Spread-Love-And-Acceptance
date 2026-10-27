#!/usr/bin/env python3
"""build_epubs.py: the two Kindle files (kids22). The coloring books are print only.

    python3 tools/kids/build_epubs.py art        writes book/kids/src/chapter-art-sheet.html (the spot pictures to shoot as PNG)
    (then) NODE_PATH=$(npm root -g) node tools/kids/print_kids.js shots chapter-art-sheet ".art-item" epub-cb 920 png
           NODE_PATH=$(npm root -g) node tools/kids/print_kids.js shots picture-book-screen ".pg" epub-pb 1600 jpg
    python3 tools/kids/build_epubs.py epub       writes book/kids/epub/picture-book.epub (fixed layout) and chapter-book.epub (reflowable)

Picture book: EPUB 3 fixed layout (rendition:layout pre-paginated), one 1600 x 1600 page image per page. Amazon's own tool for
fixed-layout children's books, Kindle Kids' Book Creator, was retired in 2025, and Amazon now takes fixed-layout children's books
as KPF (from Kindle Create) or as EPUB, so this EPUB is the file to upload. The words of each page are in its image's alt text,
so a screen reader and a search both find them.
Chapter book: EPUB 3 reflowable, the same chapters as the paperback, with the pictures as PNG and no page numbers.
Both are checked with EPUBCheck (see the fixnotes).
"""
import json
import os
import re
import sys
import uuid
import zipfile

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import build_chapter as BC  # noqa: E402
import build_picture as BP  # noqa: E402
import kids_common as C  # noqa: E402

EPUB = os.path.join(C.OUT, 'epub')
MODIFIED = '2026-10-25T00:00:00Z'


def xesc(s):
    return C.esc(s).replace('&#x27;', '&#39;')


# ------------------------------------------------------------------ the sheet of spot pictures (shot as PNG)
def art_sheet():
    items = []
    for k in BC.ILLS:
        items.append('<div class="art-item" data-name="%s" style="width:920px;height:460px">%s</div>' % (k, BC.spot(k).replace('class="spot"', 'style="width:920px;height:460px"')))
    items.append('<div class="art-item" data-name="badge" style="width:160px;height:168px">%s</div>' % BC.puddles_badge().replace('class="badge"', 'style="width:160px;height:168px"'))
    names = list(BC.ILLS) + ['badge']
    # the PNG file names are img-<data-name>.png
    C.write(os.path.join(C.SRC, 'chapter-art-sheet.html'), C.doc('chapter art', 'body{margin:0;background:#fff}.art-item{display:block;margin:0;background:#fff}', '\n'.join(items)))
    print('art sheet:', len(items), 'items')


# ------------------------------------------------------------------ picture book (fixed layout)
ART_ALT = {
    'zoom': 'Tidbit runs across the yard while Sugarfoot yawns beside the cottage.',
    'plan': 'Tidbit zooms through a pantry full of jars and pies while Sugarfoot sits calmly by an empty basket.',
    'pack': 'A heap of food on the floor, and Tidbit straining to pull a basket stuffed full.',
    'static': 'Tidbit with buzzing paws, and the gray cloud Grumble floating in with a frown.',
    'puddles': 'Professor Puddles, a raindrop in glasses and a graduation cap, and Tidbit pointing out her buzzy paws, hot ears and tight tummy.',
    'room': 'Sugarfoot lies under a tree inside a ring of room, with shy Mumble behind a bush and Tidbit waiting at a distance.',
    'calm': 'Tidbit smells a flower, then blows out a candle, while Grumble shrinks.',
    'ask': 'Tidbit asks for help, and Sugarfoot, Hopper, Nutmeg, Beep, Lumi, Dot, the ducklings and Ollie gather around.',
    'jobs': 'The friends walk to the hill, each carrying one thing, with the basket riding light in a wagon.',
    'oops': 'Tidbit leaps after a butterfly and the basket tips, apples and a pie flying.',
    'sorry': 'Tidbit says sorry to Sugarfoot, and the friends catch the apples.',
    'clouds': 'The four clouds of Static, Grumble, Fuzz, Mumble and Drift, join the picnic, and Fuzz brings back a cracker.',
    'night': 'Tidbit and Sugarfoot walk home under the Moon, past the cottage, with fireflies.',
}


def pb_pages():
    """(page number, text for the alt) for the 40 pages"""
    B = BP.BOOK
    t = {}
    t[1] = '%s. Half title, with Peach and Lilac sharing a heart.' % B['title']
    t[2] = 'This book belongs to. A line to write your name. Professor Puddles and Tidbit wave from a green hill.'
    t[3] = '%s. %s. By %s. Tidbit and Sugarfoot with a picnic basket.' % (B['title'], B['subtitle'], B['author'])
    t[4] = 'Copyright. Independently published. Text and pictures 2026 Christian. The characters and the story are original to this site.'
    t[5] = 'Who is in this story: Tidbit, Sugarfoot, Professor Puddles, Ollie, Dot, Hopper, Nutmeg, Lumi, Beep, the ducklings, the Moon and the Static clouds.'
    for i, sp in enumerate(B['spreads']):
        n = 6 + 2 * i
        t[n] = '%s %s' % (sp['left'].replace('\n', ' '), ART_ALT[sp['id']])
        t[n + 1] = sp['right'].replace('\n', ' ')
    t[32] = '%s. %s' % (B['calm_title'], ' '.join('%d. %s: %s' % (i + 1, a, b) for i, (a, b) in enumerate(B['calm_steps'][:2])))
    t[33] = ' '.join('%d. %s: %s' % (i + 3, a, b) for i, (a, b) in enumerate(B['calm_steps'][2:]))
    t[34] = B['grownups']['title'] + '. ' + ' '.join(B['grownups']['paras'])
    t[35] = B['talk_title'] + '. ' + ' '.join('%d. %s' % (i + 1, q) for i, q in enumerate(B['talk']))
    t[36] = B['words_title'] + '. ' + ' '.join('%s. %s' % (a, b.replace('\n', ' ')) for a, b in B['words'])
    t[37] = B['find_title'] + ': ' + ', '.join(B['find_items']) + '. A picnic blanket with apples, a pie, ducklings, the four Static clouds and the two pups.'
    t[38] = 'About this book. ' + ' '.join(B['about_paras'])
    t[39] = 'The End. Goodnight, everyone. Tidbit and Sugarfoot asleep under the Moon.'
    t[40] = 'Thank you for reading. More at %s.' % C.SITE
    return [(n, C.curly(t[n])) for n in range(1, 41)]


def write_zip(path, files, mimetype_first=True):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with zipfile.ZipFile(path, 'w') as z:
        zi = zipfile.ZipInfo('mimetype', date_time=(2026, 10, 25, 0, 0, 0))
        zi.compress_type = zipfile.ZIP_STORED
        z.writestr(zi, 'application/epub+zip')
        for name, data in files:
            zi = zipfile.ZipInfo(name, date_time=(2026, 10, 25, 0, 0, 0))
            zi.compress_type = zipfile.ZIP_STORED if name.endswith(('.jpg', '.png')) else zipfile.ZIP_DEFLATED
            z.writestr(zi, data)


CONTAINER = '<?xml version="1.0" encoding="UTF-8"?>\n<container version="1.0" xmlns="urn:oasis:names:tc:opendocument:xmlns:container"><rootfiles><rootfile full-path="OEBPS/content.opf" media-type="application/oebps-package+xml"/></rootfiles></container>\n'


def build_picture_epub():
    B = BP.BOOK
    pages = pb_pages()
    files = [('META-INF/container.xml', CONTAINER)]
    manifest, spine = [], []
    cover_img = open(os.path.join(C.OUT, 'cover-picture-book-front.jpg'), 'rb').read()
    files.append(('OEBPS/images/cover.jpg', cover_img))
    manifest.append('<item id="cover-img" href="images/cover.jpg" media-type="image/jpeg" properties="cover-image"/>')
    for n, alt in pages:
        img = open(os.path.join(C.SRC, 'epub-pb', 'page-%02d.jpg' % n), 'rb').read()
        files.append(('OEBPS/images/page-%02d.jpg' % n, img))
        xh = ('<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en-US" xml:lang="en-US">\n'
              '<head><meta charset="utf-8"/><title>Page %d</title><meta name="viewport" content="width=1600, height=1600"/>'
              '<style>html,body{margin:0;padding:0;width:1600px;height:1600px;overflow:hidden;background:#FFFDF5}img{display:block;width:1600px;height:1600px}</style></head>\n'
              '<body><img src="images/page-%02d.jpg" width="1600" height="1600" alt="%s"/></body>\n</html>\n') % (n, n, xesc(alt))
        files.append(('OEBPS/page-%02d.xhtml' % n, xh))
        manifest.append('<item id="p%02d" href="page-%02d.xhtml" media-type="application/xhtml+xml"/>' % (n, n))
        manifest.append('<item id="i%02d" href="images/page-%02d.jpg" media-type="image/jpeg"/>' % (n, n))
        side = 'right' if n % 2 == 1 else 'left'
        spine.append('<itemref idref="p%02d" properties="rendition:page-spread-%s"/>' % (n, side))
    toc = [(1, 'Half title'), (3, 'Title page'), (5, 'Who is in this story'), (6, 'The story'), (32, 'Smell the flower, blow the candle'), (34, 'For grown-ups'), (35, 'Talk about it'), (36, 'Words to try'), (37, 'Find and count'), (38, 'About this book'), (39, 'The End')]
    nav = ('<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en-US" xml:lang="en-US"><head><meta charset="utf-8"/><title>Contents</title></head>\n'
           '<body><nav epub:type="toc" id="toc"><h1>Contents</h1><ol>%s</ol></nav><nav epub:type="landmarks" hidden="hidden"><ol><li><a epub:type="cover" href="page-03.xhtml">Cover and title</a></li><li><a epub:type="bodymatter" href="page-06.xhtml">Start of the story</a></li></ol></nav></body></html>\n') % ''.join(
        '<li><a href="page-%02d.xhtml">%s</a></li>' % (n, xesc(t)) for n, t in toc)
    files.append(('OEBPS/nav.xhtml', nav))
    manifest.insert(0, '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>')
    opf = ('<?xml version="1.0" encoding="UTF-8"?>\n<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="en-US">\n'
           '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n<dc:identifier id="bookid">urn:uuid:%s</dc:identifier>\n<dc:title>%s</dc:title>\n<dc:creator>%s</dc:creator>\n<dc:language>en-US</dc:language>\n'
           '<dc:description>%s</dc:description>\n<meta property="dcterms:modified">%s</meta>\n'
           '<meta property="rendition:layout">pre-paginated</meta>\n<meta property="rendition:orientation">auto</meta>\n<meta property="rendition:spread">landscape</meta>\n'
           '<meta property="schema:accessMode">visual</meta><meta property="schema:accessibilityFeature">alternativeText</meta><meta property="schema:accessibilityHazard">none</meta>\n'
           '<meta name="cover" content="cover-img"/>\n<meta name="original-resolution" content="1600x1600"/>\n</metadata>\n<manifest>\n%s\n</manifest>\n<spine page-progression-direction="ltr">\n%s\n</spine>\n</package>\n') % (
        uuid.uuid5(uuid.NAMESPACE_URL, 'https://spreadloveandacceptance.com/kids/picture-book'), xesc(B['title']), xesc(B['author']), xesc(B['subtitle']), MODIFIED, '\n'.join(manifest), '\n'.join(spine))
    files.append(('OEBPS/content.opf', opf))
    out = os.path.join(EPUB, 'picture-book.epub')
    write_zip(out, files)
    print('picture-book.epub', round(os.path.getsize(out) / 1048576, 2), 'MB')


# ------------------------------------------------------------------ chapter book (reflowable)
CSS_EPUB = '''
body { font-family: serif; line-height: 1.5; margin: 0 4%; }
h1, h2 { font-family: sans-serif; text-align: center; line-height: 1.2; }
h2 { margin: 1.4em 0 .2em; }
.n { text-align: center; text-transform: uppercase; letter-spacing: .15em; font-size: .8em; margin-top: 2em; }
p { margin: 0 0 .7em; }
img.spot { display: block; margin: .5em auto 1.2em; max-width: 100%; height: auto; }
.brk { text-align: center; margin: .8em 0; }
.chat { border: 1px solid #777; border-radius: .6em; padding: .5em .7em; margin: 1em 0; font-family: sans-serif; font-size: .9em; background: #f3f3f3; }
.chat p { margin: .25em 0; text-indent: 0; }
.chat b { display: inline-block; min-width: 4.5em; }
.rules { border: 2px solid #444; border-radius: .6em; padding: .6em .9em; margin: 1em 0; font-family: sans-serif; }
.rules p.h { font-weight: bold; margin-top: 0; }
.try { border: 2px dashed #444; border-radius: .6em; padding: .6em .9em; margin: 1.4em 0 0; font-family: sans-serif; font-size: .92em; }
.try p.h { font-weight: bold; margin: 0 0 .3em; }
.try img { height: 2.6em; width: auto; vertical-align: middle; margin-right: .4em; }
.box { border: 1px solid #444; border-radius: .6em; padding: .5em .8em; margin: .8em 0; }
.cover { text-align: center; }
.small { font-size: .85em; }
'''


def xhtml(title, body, cls=''):
    return ('<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en-US" xml:lang="en-US">\n'
            '<head><meta charset="utf-8"/><title>%s</title><link rel="stylesheet" type="text/css" href="style.css"/></head>\n<body%s>%s</body>\n</html>\n') % (xesc(title), (' class="%s"' % cls) if cls else '', body)


def ep_inline(s):
    return BC.inline(s).replace('&nbsp;', '&#160;')


def chapter_xhtml(n, ch):
    out = ['<section epub:type="chapter" id="ch%d"><p class="n">Chapter %d</p><h2>%s</h2>' % (n, n, ep_inline(ch['title']))]
    if ch['ill']:
        out.append('<img class="spot" src="images/chapter-%s.png" width="920" height="460" alt="%s"/>' % (ch['ill'], xesc(BC.ALT[ch['ill']])))
    for kind, body in ch['blocks']:
        if kind == 'p':
            out.append('<p>%s</p>' % ep_inline(body))
        elif kind == 'break':
            out.append('<p class="brk">&#8226; &#8226; &#8226;</p>')
        elif kind == 'chat':
            rows = []
            for ln in body:
                m = re.match(r'^([A-Za-z][A-Za-z ]{0,20}):\s*(.*)$', ln)
                who, msg = (m.group(1), m.group(2)) if m else ('', ln)
                rows.append('<p><b>%s</b> %s</p>' % (xesc(who), ep_inline(msg)))
            out.append('<div class="chat">%s</div>' % ''.join(rows))
        elif kind == 'rules':
            out.append('<div class="rules"><p class="h">The seven rules</p><ol>%s</ol></div>' % ''.join('<li>%s</li>' % ep_inline(x) for x in body))
        elif kind == 'try':
            out.append('<div class="try"><p class="h"><img src="images/badge.png" width="160" height="168" alt="Professor Puddles"/>%s</p><ul>%s</ul></div>' % (xesc(BC.BOOK['try_label']), ''.join('<li>%s</li>' % ep_inline(x) for x in body)))
    out.append('</section>')
    return xhtml(ch['title'], '\n'.join(out))


def build_chapter_epub():
    B = BC.BOOK
    chs = BC.chapters()
    files = [('META-INF/container.xml', CONTAINER), ('OEBPS/style.css', CSS_EPUB)]
    manifest = ['<item id="css" href="style.css" media-type="text/css"/>']
    spine = []
    # pictures
    for k in list(BC.ILLS) + ['badge']:
        data = open(os.path.join(C.SRC, 'epub-cb', 'img-%s.png' % k), 'rb').read()
        name = 'badge.png' if k == 'badge' else 'chapter-%s.png' % k
        files.append(('OEBPS/images/' + name, data))
        manifest.append('<item id="img-%s" href="images/%s" media-type="image/png"/>' % (k, name))
    cov = open(os.path.join(C.OUT, 'cover-chapter-book-kindle.jpg'), 'rb').read()
    files.append(('OEBPS/images/cover.jpg', cov))
    manifest.append('<item id="cover-img" href="images/cover.jpg" media-type="image/jpeg" properties="cover-image"/>')
    docs = []
    cover = xhtml('Cover', '<div class="cover"><img src="images/cover.jpg" alt="Cover of Turn Down the Static" style="max-width:100%%;height:auto"/></div>', 'cover')
    docs.append(('cover', 'cover.xhtml', 'Cover', cover))
    title = xhtml(B['title'], '<h1>%s</h1><p style="text-align:center"><em>%s</em></p><p style="text-align:center"><b>by %s</b></p><p class="small" style="text-align:center">%s, Book %d<br/>Independently published<br/>%s</p>' % (
        xesc(B['title']), xesc(B['subtitle']), xesc(C.AUTHOR), xesc(B['series']), B['series_no'], C.SITE))
    docs.append(('title', 'title.xhtml', 'Title page', title))
    copy = xhtml('Copyright', '<div class="small"><p><em>%s</em>, Book %d: <em>%s</em>. By %s. Independently published.</p>'
                 '<p>Text and pictures &#169; 2026 %s. First edition, %s.</p>'
                 '<p><strong>Free online, always.</strong> The characters in this book live at %s, where everything is free to read and use, with no account and no paid version. You may copy pages for personal use and for non-commercial teaching, with credit to &#8220;%s.&#8221;</p>'
                 '<p><strong>Made up.</strong> Wren, Theo and their family and friends are made up. Nobody in this book is a real person, and none of it is a testimonial. The story and characters are original to this site.</p>'
                 '<p>This is a story. It is general education about feelings and getting along, not a diagnosis or treatment, and it cannot know your family.</p></div>' % (
                     xesc(B['series']), B['series_no'], xesc(B['title']), xesc(C.AUTHOR), xesc(C.AUTHOR), C.UPDATED, C.SITE, C.SITE))
    docs.append(('copyright', 'copyright.xhtml', 'Copyright', copy))
    for i, ch in enumerate(chs):
        docs.append(('ch%d' % (i + 1), 'chapter-%02d.xhtml' % (i + 1), '%d. %s' % (i + 1, re.sub('<[^>]+>', '', ch['title'])), chapter_xhtml(i + 1, ch)))
    words = xhtml('Words to keep', '<h2>Words to keep</h2>'
                  '<div class="box"><p><b>Three things for an apology</b></p><ol><li>Say sorry.</li><li>Say exactly what you did, in plain words.</li><li>Ask what would help. Then give it room.</li></ol></div>'
                  '<div class="box"><p><b>A pause with a name and a time</b></p><p>&#8220;I need twenty minutes. I&#8217;ll come back at eight.&#8221; Without the time, a pause can feel like a door slamming.</p></div>'
                  '<div class="box"><p><b>Sentences from this book</b></p><ul><li>&#8220;I need a minute.&#8221;</li><li>&#8220;Fine, or need a minute?&#8221;</li><li>&#8220;I&#8217;m mad, and it&#8217;s not about you.&#8221;</li><li>&#8220;Did you mean it like that?&#8221;</li><li>&#8220;Do you want room, or do you want me close?&#8221;</li><li>&#8220;Can I be the model person?&#8221;</li></ul></div>')
    docs.append(('words', 'words.xhtml', 'Words to keep', words))
    gu = xhtml('For grown-ups', '<h2>For grown-ups</h2>'
               '<p>This story follows one eleven-year-old through a crowded few months: a room that stops being hers, a group chat that goes wrong, a project that goes sideways, and a sentence she wishes she could take back. Each chapter ends with a short box of things to try.</p>'
               '<p>The ideas underneath come from the free site at %s. The ladder (calm and connected, revved up, running on empty) is a simple way to notice where the body is. A message has only half its meaning in the words. A job has the doing and the noticing. A pause needs a time to come back. An apology is three things, and the other person sets the pace. Theo and Wren are wired differently, and each one has to learn the other&#8217;s language. Neither is wrong.</p>'
               '<p>Some questions to talk about together: Where was each character on the ladder in the group chat chapter? What did &#8220;k&#8221; mean to Imani, and what did it mean to Wren? Which job on your own list is invisible?</p>' % C.SITE)
    docs.append(('grownups', 'grownups.xhtml', 'For grown-ups', gu))
    about = xhtml('About this book', '<h2>About this book</h2>%s' % ''.join('<p>%s</p>' % xesc(p) for p in B['about_paras']))
    docs.append(('about', 'about.xhtml', 'About this book', about))
    for did, href, t, body in docs:
        files.append(('OEBPS/' + href, body))
        manifest.append('<item id="%s" href="%s" media-type="application/xhtml+xml"/>' % (did, href))
        spine.append('<itemref idref="%s"/>' % did)
    nav = ('<?xml version="1.0" encoding="UTF-8"?>\n<!DOCTYPE html>\n<html xmlns="http://www.w3.org/1999/xhtml" xmlns:epub="http://www.idpf.org/2007/ops" lang="en-US" xml:lang="en-US"><head><meta charset="utf-8"/><title>Contents</title></head>\n'
           '<body><nav epub:type="toc" id="toc"><h1>Contents</h1><ol>%s</ol></nav><nav epub:type="landmarks" hidden="hidden"><ol><li><a epub:type="cover" href="cover.xhtml">Cover</a></li><li><a epub:type="bodymatter" href="chapter-01.xhtml">Start of the story</a></li></ol></nav></body></html>\n') % ''.join(
        '<li><a href="%s">%s</a></li>' % (h, xesc(t)) for _, h, t, _ in docs if _ != 'title' and _ != 'copyright' and _ != 'cover')
    files.append(('OEBPS/nav.xhtml', nav))
    manifest.insert(0, '<item id="nav" href="nav.xhtml" media-type="application/xhtml+xml" properties="nav"/>')
    opf = ('<?xml version="1.0" encoding="UTF-8"?>\n<package xmlns="http://www.idpf.org/2007/opf" version="3.0" unique-identifier="bookid" xml:lang="en-US">\n'
           '<metadata xmlns:dc="http://purl.org/dc/elements/1.1/">\n<dc:identifier id="bookid">urn:uuid:%s</dc:identifier>\n<dc:title>%s</dc:title>\n<dc:creator>%s</dc:creator>\n<dc:language>en-US</dc:language>\n'
           '<dc:description>%s</dc:description>\n<meta property="dcterms:modified">%s</meta>\n<meta name="cover" content="cover-img"/>\n'
           '<meta property="schema:accessMode">textual</meta><meta property="schema:accessMode">visual</meta><meta property="schema:accessibilityFeature">alternativeText</meta><meta property="schema:accessibilityHazard">none</meta>\n'
           '</metadata>\n<manifest>\n%s\n</manifest>\n<spine>\n%s\n</spine>\n</package>\n') % (
        uuid.uuid5(uuid.NAMESPACE_URL, 'https://spreadloveandacceptance.com/kids/chapter-book'), xesc(B['title']), xesc(B['author']), xesc(B['subtitle']), MODIFIED, '\n'.join(manifest), '\n'.join(spine))
    files.append(('OEBPS/content.opf', opf))
    out = os.path.join(EPUB, 'chapter-book.epub')
    write_zip(out, files)
    print('chapter-book.epub', round(os.path.getsize(out) / 1048576, 2), 'MB')


if __name__ == '__main__':
    what = sys.argv[1] if len(sys.argv) > 1 else 'epub'
    if what == 'art':
        art_sheet()
    else:
        build_picture_epub()
        build_chapter_epub()
