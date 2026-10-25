#!/usr/bin/env python3
"""check_pdfs.py: KDP-readiness checks on the kids PDFs (kids22). Prints a table and writes book/kids/checks.json.

For each interior and cover: page count (even, within KDP's range), page size against the trim and bleed, every font embedded,
black-and-white books really gray (no color pixels), cover width against the spine formula, and the barcode box left clear."""
import json
import os
import re
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import kids_common as C  # noqa: E402
from PIL import Image  # noqa: E402

K = C.load_json(os.path.join(C.OUT, 'kids.json'), {})
SPEC = {
    # id: (interior file, trim w, h, bleed on interior, paper, ink, min pages, max pages)
    'picture-book': ('picture-book.pdf', 8.5, 8.5, True, 'premium', 'color', 24, 828),
    'chapter-book': ('chapter-book.pdf', 6.0, 9.0, False, 'white', 'black', 24, 828),
    'coloring-younger': ('coloring-younger.pdf', 8.5, 11.0, False, 'white', 'black', 24, 828),
    'coloring-older': ('coloring-older.pdf', 8.5, 11.0, False, 'white', 'black', 24, 828),
}


def sh(*a):
    return subprocess.run(a, capture_output=True, text=True).stdout


def fonts(path):
    rows = [l.split() for l in sh('pdffonts', path).splitlines()[2:] if l.strip()]
    emb = all(r[-5] == 'yes' for r in rows) if rows else True
    names = sorted({re.sub(r'^[A-Z]{6}\+', '', r[0]) for r in rows})
    return emb, names


def is_gray(path, pages=(1, 5, 9, 13, 21, 33)):
    import tempfile
    d = tempfile.mkdtemp()
    bad = 0
    n = int(re.search(r'Pages:\s+(\d+)', sh('pdfinfo', path)).group(1))
    for p in [x for x in pages if x <= n]:
        subprocess.run(['pdftoppm', '-r', '30', '-f', str(p), '-l', str(p), '-png', '-singlefile', path, os.path.join(d, 'x')], check=True)
        im = Image.open(os.path.join(d, 'x.png')).convert('RGB')
        raw = im.resize((120, 160)).tobytes()
        bad += sum(1 for i in range(0, len(raw), 3) if max(raw[i:i + 3]) - min(raw[i:i + 3]) > 6)
    return bad == 0, bad


def main():
    res = {}
    ok_all = True
    for bid, (fn, w, h, bleed, paper, ink, lo, hi) in SPEC.items():
        path = os.path.join(C.OUT, fn)
        info = sh('pdfinfo', path)
        pages = int(re.search(r'Pages:\s+(\d+)', info).group(1))
        m = re.search(r'Page size:\s+([\d.]+) x ([\d.]+) pts', info)
        pw, ph = float(m.group(1)) / 72, float(m.group(2)) / 72
        ew, eh = (w + C.BLEED, h + 2 * C.BLEED) if bleed else (w, h)
        size_ok = abs(pw - ew) < 0.01 and abs(ph - eh) < 0.01
        emb, names = fonts(path)
        r = {'pages': pages, 'even': pages % 2 == 0, 'in_range': lo <= pages <= hi, 'size_in': [round(pw, 3), round(ph, 3)], 'expected_in': [ew, eh], 'size_ok': size_ok,
             'fonts_embedded': emb, 'fonts': names, 'bytes': os.path.getsize(path)}
        if ink == 'black':
            g, bad = is_gray(path)
            r['gray_only'] = g
        # the cover
        cpath = os.path.join(C.OUT, 'cover-%s.pdf' % bid)
        ci = sh('pdfinfo', cpath)
        cm = re.search(r'Page size:\s+([\d.]+) x ([\d.]+) pts', ci)
        cw, ch = float(cm.group(1)) / 72, float(cm.group(2)) / 72
        sp = C.spine_in(pages, paper)
        exp_w, exp_h = round(2 * C.BLEED + 2 * w + sp, 3), round(h + 2 * C.BLEED, 3)
        cemb, _ = fonts(cpath)
        r['cover'] = {'size_in': [round(cw, 3), round(ch, 3)], 'expected_in': [exp_w, exp_h], 'size_ok': abs(cw - exp_w) < 0.01 and abs(ch - exp_h) < 0.01,
                      'spine_in': sp, 'spine_formula': '%d pages x %s in (%s paper)' % (pages, C.PAPER[paper], paper), 'fonts_embedded': cemb, 'pages': int(re.search(r'Pages:\s+(\d+)', ci).group(1))}
        res[bid] = r
        flag = all([r['even'], r['in_range'], r['size_ok'], r['fonts_embedded'], r.get('gray_only', True), r['cover']['size_ok'], r['cover']['fonts_embedded'], r['cover']['pages'] == 1])
        ok_all &= flag
        print('%-17s %3d pp  %s  fonts embedded %s  %s  cover %s x %s in, spine %s in  %s' % (bid, pages, r['size_in'], emb, ('gray only' if r.get('gray_only') else ('color' if ink == 'color' else 'NOT GRAY')), r['cover']['size_in'][0], r['cover']['size_in'][1], sp, 'OK' if flag else 'CHECK'))
    C.write(os.path.join(C.OUT, 'checks.json'), json.dumps(res, indent=1) + '\n')
    return 0 if ok_all else 1


if __name__ == '__main__':
    sys.exit(main())
