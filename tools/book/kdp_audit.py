#!/usr/bin/env python3
"""kdp_audit.py: one check, before upload, of every print book on the site (owner, Nov 17 2026: "do an audit on all the books
... to make sure they're ready to publish to Amazon"). For each title it reads the built PDFs and checks:
  interior   trim size, page count in KDP's range and even, every font embedded, gray only for black-and-white interiors,
             picture resolution (KDP asks for 300 ppi; under 200 fails), the author's full name inside, no em dashes, no
             mention of AI, and US English (tools/book/us_english.py --check on the print source)
  cover      the full-wrap size from KDP's formula (2 x trim + spine + 2 x 0.125 in bleed; height + 0.25 in), the spine from
             the page count and the paper, fonts embedded, and no author name on the cover
Writes a table to the screen and book/kdp-audit.md; exit 1 if anything fails.
    python3 tools/book/kdp_audit.py"""
import json, os, re, subprocess, sys
ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
NAME = 'Patrick Christian Andrews'
PAPER = {'white': 0.002252, 'cream': 0.0025, 'color': 0.002347}   # inches per page (KDP)
ser = json.load(open(os.path.join(ROOT, 'book/print/series.json')))['books']
TITLES = []
for k, b in ser.items():
    if b.get('kind') == 'boxset':
        continue
    color = 'colour' in b.get('ink', '') or 'color' in b.get('ink', '')
    TITLES.append(dict(id=k, title=b['title'], pdf='book/print/' + b['pdf'], cover='book/print/' + b['cover_pdf'] if b.get('cover_pdf') else None,
                       trim=tuple(b['trim_in']), paper='white', gray=not color, src='book/print/src/%s.html' % k, csrc='book/print/src/cover-%s.html' % k))
for k, t, trim, color in (('picture-book', 'Tidbit and Sugarfoot’s Big Picnic', (8.5, 8.5), True), ('chapter-book', 'Turn Down the Static', (6, 9), False),
                          ('coloring-younger', 'Color with Tidbit and Sugarfoot', (8.5, 11), False), ('coloring-older', 'Color and Calm with Tidbit and Sugarfoot', (8.5, 11), False)):
    TITLES.append(dict(id=k, title=t, pdf='book/kids/%s.pdf' % k, cover='book/kids/cover-%s.pdf' % k, trim=trim, paper='color' if color else 'white', gray=not color,
                       bleed=k == 'picture-book', src='book/kids/src/%s.html' % k, csrc='book/kids/src/cover-%s.html' % k))
TITLES.append(dict(id='coloring-adult', title='Color and Breathe', pdf='book/adult/coloring-adult.pdf', cover='book/adult/cover-coloring-adult.pdf', trim=(8.5, 11),
                   paper='white', gray=True, src='book/adult/src/coloring-adult.html', csrc='book/adult/src/cover-coloring-adult.html'))


def run(*a):
    return subprocess.run(a, capture_output=True, text=True).stdout


def info(pdf):
    s = run('pdfinfo', pdf)
    pages = int(re.search(r'Pages:\s+(\d+)', s).group(1))
    w, h = map(float, re.search(r'Page size:\s+([\d.]+) x ([\d.]+)', s).groups())
    return pages, w / 72, h / 72


def fonts_ok(pdf):
    rows = run('pdffonts', pdf).splitlines()[2:]
    return all(r.split()[-5] == 'yes' for r in rows if len(r.split()) >= 5) if rows else True


def gray_only(pdf):
    # every page drawn in grays: render small and look for any colored pixel
    out = run('pdftoppm', '-r', '20', '-png', pdf, '/tmp/kdpaudit')
    from PIL import Image
    import glob
    ok = True
    for f in glob.glob('/tmp/kdpaudit*.png'):
        im = Image.open(f).convert('RGB'); px = list(im.tobytes()); px = list(zip(px[0::3], px[1::3], px[2::3]))
        if any(max(p) - min(p) > 24 for p in px):
            ok = False
        os.remove(f)
    return ok


def min_ppi(pdf):
    s = run('pdfimages', '-list', pdf).splitlines()[2:]
    vals = [min(int(r.split()[12]), int(r.split()[13])) for r in s if len(r.split()) > 13 and r.split()[12].isdigit() and r.split()[2] == 'image']
    return min(vals) if vals else None


rows, fails = [], 0
for T in TITLES:
    p = []
    pdf = os.path.join(ROOT, T['pdf'])
    pages, w, h = info(pdf)
    bleed = T.get('bleed')
    tw, th = (T['trim'][0] + 0.125, T['trim'][1] + 0.25) if bleed else T['trim']
    if abs(w - tw) > 0.02 or abs(h - th) > 0.02: p.append('interior is %.3f x %.3f in, expected %.3f x %.3f' % (w, h, tw, th))
    if not (24 <= pages <= 828): p.append('%d pages is outside KDP 24 to 828' % pages)
    if pages % 2: p.append('odd page count %d' % pages)
    if not fonts_ok(pdf): p.append('a font is not embedded (interior)')
    if T['gray'] and not gray_only(pdf): p.append('color on a black-and-white interior')
    ppi = min_ppi(pdf)
    if ppi is not None and ppi < 200: p.append('a picture at %d ppi (under 200)' % ppi)
    text = run('pdftotext', pdf, '-')
    if NAME not in text: p.append('the author\'s full name is not inside')
    if '—' in text: p.append('em dash in the interior (%d)' % text.count('—'))
    if re.search(r'\b(AI|artificial intelligence|ChatGPT|Claude)\b', text): p.append('mentions AI')
    us = run('python3', os.path.join(ROOT, 'tools/book/us_english.py'), '--check', os.path.join(ROOT, T['src'])).strip()
    if us and 'would change' in us: p.append('US English: ' + us.splitlines()[0][:90])
    cov = ''
    if T.get('cover'):
        cp = os.path.join(ROOT, T['cover'])
        cpages, cw, ch = info(cp)
        spine = pages * PAPER[T['paper']]
        ew, eh = 2 * T['trim'][0] + spine + 0.25, T['trim'][1] + 0.25
        if abs(cw - ew) > 0.03 or abs(ch - eh) > 0.03: p.append('cover is %.3f x %.3f in, expected %.3f x %.3f' % (cw, ch, ew, eh))
        if not fonts_ok(cp): p.append('a font is not embedded (cover)')
        ctext = run('pdftotext', cp, '-')
        if re.search(r'\bChristian\b|Andrews', ctext): p.append('an author name on the cover')
        if '—' in ctext: p.append('em dash on the cover')
        cov = '%.3f x %.3f in, spine %.4f in' % (cw, ch, spine)
    ok = not p
    fails += 0 if ok else 1
    rows.append((T['id'], T['title'], pages, '%.2f x %.2f' % (w, h), cov, ppi, 'OK' if ok else 'FIX: ' + '; '.join(p)))
md = ['# KDP audit', '', 'Made by tools/book/kdp_audit.py from the built files.', '', '| Book | Title | Pages | Interior (in) | Cover | Lowest picture ppi | Result |', '|---|---|---|---|---|---|---|']
for r in rows:
    print('%-28s %4d pp  %-12s  %-34s  ppi %-5s  %s' % (r[0], r[2], r[3], r[4], r[5], r[6]))
    md.append('| %s | %s | %d | %s | %s | %s | %s |' % (r[0], r[1], r[2], r[3], r[4], r[5], r[6]))
open(os.path.join(ROOT, 'book/kdp-audit.md'), 'w').write('\n'.join(md) + '\n')
print('%d of %d ready' % (len(rows) - fails, len(rows)))
sys.exit(1 if fails else 0)
