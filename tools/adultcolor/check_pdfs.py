#!/usr/bin/env python3
"""check_pdfs.py: KDP-readiness checks on "Color and Breathe" (adultcolor29). Run after print_adult.js.

    python3 tools/adultcolor/check_pdfs.py [--margins-md FILE] [--cells]

Checks the interior (page count even and within KDP's range, page size 612 x 792 pt, fonts embedded, gray only, every blank back truly blank,
the ink bounding box of every page measured in inches from each edge against the margin rules: the binding side (the left edge of a
right-hand page) at least 0.5 in, the other sides at least 0.375 in) and the cover (size against KDP's spine formula, fonts embedded,
one page, the barcode area clear). --cells also counts tiny enclosed cells on each design page (cells under about 0.035 in across).
Writes book/adult/checks.json."""
import json
import os
import re
import subprocess
import sys
import tempfile

import numpy as np
from PIL import Image

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, os.path.join(HERE, '..', 'kids'))
import kids_common as C  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'book', 'adult')
DPI = 100
GUTTER_MIN, OTHER_MIN = 0.5, 0.375


def sh(*a):
    return subprocess.run(a, capture_output=True, text=True).stdout


def render(pdf, dpi, first=None, last=None):
    d = tempfile.mkdtemp()
    args = ['pdftoppm', '-r', str(dpi), '-gray', '-png']
    if first:
        args += ['-f', str(first), '-l', str(last or first)]
    subprocess.run(args + [pdf, os.path.join(d, 'p')], check=True)
    files = sorted(os.listdir(d))
    return d, files


def page_margins(arr):
    """ink bounding box in inches from each edge (None for a blank page)"""
    ink = arr < 200
    if not ink.any():
        return None
    ys, xs = np.where(ink)
    h, w = arr.shape
    return {'left': round(xs.min() / DPI, 3), 'right': round((w - 1 - xs.max()) / DPI, 3), 'top': round(ys.min() / DPI, 3), 'bottom': round((h - 1 - ys.max()) / DPI, 3)}


def color_pixels(pdf, pages, dpi=40):
    bad = 0
    for p in pages:
        d, files = render(pdf, dpi, p)
        # rendered gray already; use a color render to test
        subprocess.run(['pdftoppm', '-r', str(dpi), '-f', str(p), '-l', str(p), '-png', '-singlefile', pdf, os.path.join(d, 'c')], check=True)
        im = np.asarray(Image.open(os.path.join(d, 'c.png')).convert('RGB')).astype(int)
        bad += int(((im.max(axis=2) - im.min(axis=2)) > 6).sum())
    return bad


def cell_count(arr):
    """white regions (not touching the page edge band) smaller than about 0.035 in across, at 100 dpi"""
    from scipy import ndimage
    white = arr >= 160
    lab, n = ndimage.label(white)
    if n == 0:
        return 0, 0
    sizes = ndimage.sum(white, lab, range(1, n + 1))
    return int((sizes < 12).sum()), int(n)


def main():
    res = {}
    ok_all = True
    pdf = os.path.join(OUT, 'coloring-adult.pdf')
    info = sh('pdfinfo', pdf)
    pages = int(re.search(r'Pages:\s+(\d+)', info).group(1))
    m = re.search(r'Page size:\s+([\d.]+) x ([\d.]+) pts', info)
    pw, ph = float(m.group(1)), float(m.group(2))
    rows = sh('pdffonts', pdf).splitlines()[2:]
    emb = all(r.split()[-5] == 'yes' for r in rows if r.strip())
    names = sorted({re.sub(r'^[A-Z]{6}\+', '', r.split()[0]) for r in rows if r.strip()})
    meta = json.load(open(os.path.join(OUT, 'adult.json')))
    design_pages = meta['odd_design_pages']
    d, files = render(pdf, DPI)
    margins = {}
    blank_bad = []
    viol = []
    cells = {}
    for i, f in enumerate(files):
        pno = i + 1
        arr = np.asarray(Image.open(os.path.join(d, f)).convert('L'))
        mg = page_margins(arr)
        margins[pno] = mg
        is_design = pno in design_pages
        is_back = (pno - 1) in design_pages or pno == 6
        if is_back or pno == pages:
            if mg is not None:
                blank_bad.append(pno)
            continue
        if mg is None:
            continue
        recto = pno % 2 == 1
        lo = GUTTER_MIN if recto else OTHER_MIN
        for side, v in mg.items():
            need = (GUTTER_MIN if (side == 'left' and recto) or (side == 'right' and not recto) else OTHER_MIN)
            if v + 1e-9 < need:
                viol.append((pno, side, v, need))
        if '--cells' in sys.argv and is_design:
            cells[pno] = cell_count(arr[int(0.55 * DPI):-int(0.55 * DPI), int(0.7 * DPI):-int(0.55 * DPI)])
    gray_bad = color_pixels(pdf, [1, 5, 7, 9, 21, 33, 45, 57, 69, 85, 87])
    res['interior'] = {'pages': pages, 'even': pages % 2 == 0, 'in_range': 24 <= pages <= 828, 'size_pt': [pw, ph], 'size_ok': abs(pw - 612) < 0.5 and abs(ph - 792) < 0.5,
                       'fonts_embedded': emb, 'fonts': names, 'gray_only': gray_bad == 0, 'blank_backs_ok': not blank_bad, 'blank_backs_with_ink': blank_bad,
                       'margin_violations': viol, 'bytes': os.path.getsize(pdf), 'design_pages': design_pages}
    res['margins_in'] = margins
    if cells:
        res['tiny_cells'] = cells
    ok_all &= all([res['interior']['even'], res['interior']['in_range'], res['interior']['size_ok'], emb, gray_bad == 0, not blank_bad, not viol])
    # the cover
    cpdf = os.path.join(OUT, 'cover-coloring-adult.pdf')
    ci = sh('pdfinfo', cpdf)
    cm = re.search(r'Page size:\s+([\d.]+) x ([\d.]+) pts', ci)
    cw, ch = float(cm.group(1)) / 72, float(cm.group(2)) / 72
    sp = C.spine_in(pages, 'white')
    exp_w, exp_h = round(2 * C.BLEED + 2 * 8.5 + sp, 3), round(11 + 2 * C.BLEED, 3)
    crow = sh('pdffonts', cpdf).splitlines()[2:]
    cemb = all(r.split()[-5] == 'yes' for r in crow if r.strip())
    cd, cf = render(cpdf, 100)
    carr = np.asarray(Image.open(os.path.join(cd, cf[0])).convert('RGB')).astype(int)
    # the barcode area: 2 x 1.2 in, 0.25 in from the trim at the bottom right of the BACK cover (the back's trim right edge is at BLEED + 8.5)
    back_right = int((C.BLEED + 8.5) * 100)
    bottom = int((C.BLEED + 11) * 100)
    x1, x0 = back_right - 25, back_right - 25 - 200
    y1, y0 = bottom - 25, bottom - 25 - 120
    zone = carr[y0:y1, x0:x1]
    bg = carr[y0 - 2, x0 - 2]
    clear = bool((np.abs(zone - bg).max(axis=2) < 12).all())
    res['cover'] = {'size_in': [round(cw, 3), round(ch, 3)], 'expected_in': [exp_w, exp_h], 'size_ok': abs(cw - exp_w) < 0.01 and abs(ch - exp_h) < 0.01, 'spine_in': sp,
                    'spine_formula': '%d pages x %s in (white paper)' % (pages, C.PAPER['white']), 'fonts_embedded': cemb, 'pages': int(re.search(r'Pages:\s+(\d+)', ci).group(1)),
                    'barcode_area_clear': clear}
    ok_all &= res['cover']['size_ok'] and cemb and res['cover']['pages'] == 1 and clear
    json.dump(res, open(os.path.join(OUT, 'checks.json'), 'w'), indent=1)
    r = res['interior']
    print('interior  %d pp  %s pt  even %s  fonts embedded %s %s  gray only %s  blank backs %s  margin violations %d' % (pages, r['size_pt'], r['even'], emb, names, r['gray_only'], r['blank_backs_ok'], len(viol)))
    for v in viol[:20]:
        print('   margin: page %d %s %.3f in (needs %.3f)' % v)
    print('cover     %s x %s in (expected %s x %s), spine %s in, fonts embedded %s, barcode area clear %s' % (res['cover']['size_in'][0], res['cover']['size_in'][1], exp_w, exp_h, sp, cemb, clear))
    if '--margins-md' in sys.argv:
        path = sys.argv[sys.argv.index('--margins-md') + 1]
        with open(path, 'w') as fh:
            fh.write('| Page | Left (in) | Right (in) | Top (in) | Bottom (in) |\n|---|---|---|---|---|\n')
            for p in sorted(margins):
                mg = margins[p]
                fh.write('| %d | %s |\n' % (p, ' | '.join(str(mg[k]) for k in ('left', 'right', 'top', 'bottom')) if mg else 'blank | blank | blank | blank'))
    if cells:
        worst = sorted(cells.items(), key=lambda kv: -kv[1][0])[:8]
        print('tiny cells (under 0.035 in) per design page, worst:', worst)
    print('ALL OK' if ok_all else 'CHECK')
    return 0 if ok_all else 1


if __name__ == '__main__':
    sys.exit(main())
