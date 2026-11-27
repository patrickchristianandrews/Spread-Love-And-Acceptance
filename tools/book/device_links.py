#!/usr/bin/env python3
"""device_links.py: "Read it on iPad, Android or Kindle" under each book on the download page (listing26).

    python3 tools/book/device_links.py        adds the rows to book/download.html (safe to run again)

build_book.py calls add() on the page it writes, so a rebuild keeps them. Each book gets its own file for each device:
the story books as EPUB (it fits any screen and remembers your page), the picture and coloring books as PDF (page for
page). The picture book is a fixed-layout EPUB, which Apple Books and Google Play Books show well, so iPad and Android
get the EPUB and Kindle gets the PDF. Tapping a button downloads the file (behind the same one-time email step as the
books) and shows a few lines on how to open it on that device (assets/js/book-download.js).
"""
import os
import re
import sys

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))

E = lambda f: '/book/print/epub/%s.epub' % f
# li id on the page: (name for the email step, file base name, iPad file, Android file, Kindle file)
BOOKS = {
    'book-1': ('Book 1, Know Yourself Kindly', 'Know-Yourself-Kindly', E('book-1-know-yourself-kindly'), None, None),
    'book-2': ('Book 2, Heal and Steady', 'Heal-and-Steady', E('book-2-heal-and-steady'), None, None),
    'book-3': ('Book 3, Understanding Each Other', 'Understanding-Each-Other', E('book-3-understanding-each-other'), None, None),
    'book-4': ('Book 4, Share the Load', 'Share-the-Load', E('book-4-share-the-load'), None, None),
    'workbook': ('The Workpapers', 'The-Workpapers', '/book/print/workbook.pdf', None, None),
    'pocket': ('The Logic Behind It', 'The-Logic-Behind-It', E('pocket-the-logic-behind-it'), None, None),
    'kids-picture-book': ('Tidbit and Sugarfoot’s Big Picnic', 'Tidbit-and-Sugarfoots-Big-Picnic', '/book/kids/epub/picture-book.epub', None, '/book/kids/picture-book-screen.pdf'),
    'kids-chapter-book': ('Turn Down the Static', 'Turn-Down-the-Static', '/book/kids/epub/chapter-book.epub', None, None),
    'kids-coloring-younger': ('Color with Tidbit and Sugarfoot', 'Color-with-Tidbit-and-Sugarfoot', '/book/kids/coloring-younger-home.pdf', None, None),
    'kids-coloring-older': ('Color and Calm with Tidbit and Sugarfoot', 'Color-and-Calm-with-Tidbit-and-Sugarfoot', '/book/kids/coloring-older-home.pdf', None, None),
    'adult-coloring-book': ('Color and Breathe', 'Color-and-Breathe', '/book/adult/coloring-adult-home.pdf', None, None),
}
DEV = (('ipad', 'iPad'), ('android', 'Android'), ('kindle', 'Kindle'))
START, END = '<!-- devices:start -->', '<!-- devices:end -->'


def row(lid, b):
    name, base, ipad, android, kindle = b
    files = {'ipad': ipad, 'android': android or ipad, 'kindle': kindle or ipad}
    links = []
    for key, label in DEV:
        f = files[key]
        ext = f.rsplit('.', 1)[1]
        links.append('<a class="bk-dl-file bk-dl-devlink" href="%s" data-dl="%s-%s" data-dev="%s" data-kind="%s" data-name="%s for %s" '
                     'download="Spread-Love-and-Acceptance-%s.%s">%s</a>' % (f, lid, key, key, ext, name, label, base, ext, label))
    return ('%s<p class="bk-dl-dev"><span class="bk-dl-dev-k">Read it on</span> %s</p><p class="bk-dl-dev-how" aria-live="polite" hidden></p>%s'
            % (START, ' '.join(links), END))


def add(page):
    """put the device row under each book's download buttons (and take out any old one first)"""
    page = re.sub(re.escape(START) + '.*?' + re.escape(END), '', page, flags=re.S)
    for lid, b in BOOKS.items():
        m = re.search(r'<li class="bk-dl-book" id="%s"' % re.escape(lid), page)
        if not m:
            continue
        i = page.find('<p class="bk-dl-book-links">', m.end())
        j = page.find('</p>', i)
        if i < 0 or j < 0:
            continue
        page = page[:j + 4] + row(lid, b) + page[j + 4:]
    return page


if __name__ == '__main__':
    p = os.path.join(ROOT, 'book', 'download.html')
    s = open(p, encoding='utf-8').read()
    out = add(s)
    open(p, 'w', encoding='utf-8').write(out)
    print('device rows:', out.count('class="bk-dl-dev"'))
    sys.exit(0)
