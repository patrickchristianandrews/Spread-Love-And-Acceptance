#!/usr/bin/env python3
"""build_pages.py: one printable picture per design in the three coloring books, for /coloring-page.html (owner, Oct 29 2026:
"randomly generate a coloring page that they can print out that comes from the coloring books").

Reads the print sources (book/kids/src/coloring-younger.html, coloring-older.html, book/adult/src/coloring-adult.html) to find
the design pages (a page with a picture and a blank page behind it, not the front matter) and their words, renders each design
page from the paperback PDF at 200 dpi in four shades of gray (crisp lines, small files), and writes
  assets/coloring/<book>-<nn>.png        one letter-size page each (8.5 x 11 in)
  assets/js/coloring-pages-data.js       window.TOL_COLORING = { books: [...], pages: [...] }
Run it again after rebuilding a coloring book:  python3 tools/coloring/build_pages.py"""
import glob, html, json, os, re, shutil, subprocess, tempfile
from PIL import Image

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OUT = os.path.join(ROOT, 'assets', 'coloring')
DPI = 200
BOOKS = [
    {'id': 'little', 'src': 'book/kids/src/coloring-younger.html', 'pdf': 'book/kids/coloring-younger.pdf',
     'title': 'Color with Tidbit and Sugarfoot', 'who': 'Ages 3 to 7', 'short': 'Little kids',
     'line': 'Big, simple pictures of Tidbit and Sugarfoot.', 'book': '/book/download.html#kids-coloring-younger'},
    {'id': 'big', 'src': 'book/kids/src/coloring-older.html', 'pdf': 'book/kids/coloring-older.pdf',
     'title': 'Color and Calm with Tidbit and Sugarfoot', 'who': 'Ages 8 to 12', 'short': 'Big kids',
     'line': 'Detailed scenes with patterns and a calm line on each page.', 'book': '/book/download.html#kids-coloring-older'},
    {'id': 'grown', 'src': 'book/adult/src/coloring-adult.html', 'pdf': 'book/adult/coloring-adult.pdf',
     'title': 'Color and Breathe', 'who': 'Grown-ups', 'short': 'Grown-ups',
     'line': 'Mandalas, gardens, patterns and quiet scenes.', 'book': '/book/download.html#adult-coloring'},
]
NOT_DESIGN = re.compile(r'color test|belongs to|meet tidbit|how to use|well done|certificate|your pages', re.I)


def text_of(body):
    t = re.sub(r'<svg.*?</svg>', ' ', body, flags=re.S)
    t = re.sub(r'<[^>]+>', ' ', t)
    return re.sub(r'\s+', ' ', html.unescape(t)).strip()


def designs(src):
    s = open(os.path.join(ROOT, src), encoding='utf-8').read()
    secs = re.findall(r'<section class="pg"[^>]*>(.*?)</section>', s, re.S)
    out = []
    for i, body in enumerate(secs):
        nxt = secs[i + 1] if i + 1 < len(secs) else None
        has_pic = '<svg' in body or '<img' in body
        blank_next = nxt is not None and not text_of(nxt) and '<svg' not in nxt and '<img' not in nxt
        words = text_of(body)
        m = re.search(r'aria-label="([^"]*)"', body)
        alt = html.unescape(m.group(1)) if m else ''
        if has_pic and blank_next and not NOT_DESIGN.search(words):
            out.append((i + 1, words, alt))
    return out


def main():
    if os.path.isdir(OUT):
        shutil.rmtree(OUT)
    os.makedirs(OUT)
    pages, books = [], []
    for b in BOOKS:
        found = designs(b['src'])
        tmp = tempfile.mkdtemp()
        for n, (pno, words, alt) in enumerate(found, 1):
            base = os.path.join(tmp, 'p')
            subprocess.run(['pdftoppm', '-r', str(DPI), '-gray', '-png', '-f', str(pno), '-l', str(pno), '-singlefile',
                            os.path.join(ROOT, b['pdf']), base], check=True)
            im = Image.open(base + '.png').convert('L')
            q = im.quantize(4)
            name = '%s-%02d.png' % (b['id'], n)
            q.save(os.path.join(OUT, name), optimize=True)
            pages.append({'id': '%s-%02d' % (b['id'], n), 'book': b['id'], 'n': n, 'src': '/assets/coloring/' + name,
                          'words': words, 'alt': alt, 'w': im.width, 'h': im.height})
        shutil.rmtree(tmp)
        books.append({k: b[k] for k in ('id', 'title', 'who', 'short', 'line', 'book')} | {'count': len(found)})
        print('%s: %d designs' % (b['id'], len(found)))
    data = {'books': books, 'pages': pages}
    js = ('/* coloring-pages-data.js: every design in the three coloring books, as printable pictures (built by '
          'tools/coloring/build_pages.py; do not edit by hand). */\nwindow.TOL_COLORING = ' + json.dumps(data, ensure_ascii=False) + ';\n')
    open(os.path.join(ROOT, 'assets', 'js', 'coloring-pages-data.js'), 'w', encoding='utf-8').write(js)
    size = sum(os.path.getsize(f) for f in glob.glob(os.path.join(OUT, '*.png')))
    print('%d pictures, %.1f MB' % (len(pages), size / 1048576))


if __name__ == '__main__':
    main()
