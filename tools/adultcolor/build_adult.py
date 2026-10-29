#!/usr/bin/env python3
"""build_adult.py: "Color and Breathe", the adult coloring book (adultcolor29).

    python3 tools/adultcolor/build_adult.py [--svgs DIR]     writes book/adult/src/coloring-adult.html and cover-coloring-adult.html
Page plan (88 pages, 8.5 x 11 in, black ink, no bleed; every design is on a right-hand (odd) page with a blank page behind it, so the
binding side is the LEFT edge of every design and the art keeps at least 0.5 in from it):
    1 title    2 copyright    3 this book belongs to    4 how to use this book    5 color test    6 blank
    7, 9 ... 85  the 40 designs, each followed by its blank back        87 your pages (with a QR code)    88 blank"""
import json
import os
import subprocess
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import ac_core as A  # noqa: E402
import designs as DS  # noqa: E402
import adult_text as T  # noqa: E402
sys.path.insert(0, os.path.join(HERE, '..', 'kids'))
import kids_common as C  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'book', 'adult')
SRC = os.path.join(OUT, 'src')
PAGES_PLANNED = 88

CSS = '''
@page { size: 8.5in 11in; margin: 0; }
html, body { margin: 0; padding: 0; background: #fff; }
.pg { position: relative; width: 8.5in; height: 11in; overflow: hidden; page-break-after: always; break-after: page; background: #fff; font-family: "Andika", sans-serif; color: #141414; }
.pg:last-child { page-break-after: auto; break-after: auto; }
.pg > svg.art { position: absolute; left: 0; top: 0; width: 8.5in; height: 11in; display: block; }
.t { position: absolute; left: 1.0in; right: .75in; text-align: center; }
h1, h2 { font-family: "Fraunces", serif; font-weight: 800; margin: 0; color: #141414; }
.kicker { font: 700 9.5pt "Andika", sans-serif; letter-spacing: .16em; text-transform: uppercase; color: #333; }
.sub { font-family: "Lora", serif; font-style: italic; font-size: 14pt; line-height: 1.35; color: #222; }
.body { font-family: "Lora", serif; font-size: 14pt; line-height: 1.55; color: #1b1b1b; text-align: left; }
.body p { margin: 0 0 .2in; }
.line { display: inline-block; border-bottom: 1.2pt solid #141414; }
.copy { position: absolute; left: 1.15in; right: 1.0in; top: 1.5in; font-size: 10.5pt; line-height: 1.5; text-align: left; }
.copy p { margin: 0 0 .16in; }
.pr { font-family: "Andika", sans-serif; font-size: 12pt; margin-top: .3in; text-align: left; }
.pr .ln { display: block; border-bottom: 1.1pt solid #141414; height: .34in; margin-bottom: .05in; }
.qr { position: absolute; }
.qr svg { width: 100%; height: 100%; display: block; }
'''


def esc(s):
    return C.esc(s)


def qr_svg(url):
    """the QR code for url as one SVG path, from the site's own generator (assets/js/share-kit.js), made offline"""
    js = ("const K=require(%s);const m=K.qr.matrix(%s);let d='';"
          "for(let y=0;y<m.size;y++)for(let x=0;x<m.size;x++)if(m.modules[y][x])d+='M'+(x+4)+' '+(y+4)+'h1v1h-1z';"
          "process.stdout.write('<svg xmlns=\"http://www.w3.org/2000/svg\" viewBox=\"0 0 '+(m.size+8)+' '+(m.size+8)+'\" shape-rendering=\"crispEdges\" role=\"img\" aria-label=\"QR code\"><rect width=\"100%%\" height=\"100%%\" fill=\"#fff\"/><path d=\"'+d+'\" fill=\"#141414\"/></svg>');") % (
        json.dumps(os.path.join(ROOT, 'assets', 'js', 'share-kit.js')), json.dumps(url))
    return subprocess.run(['node', '-e', js], capture_output=True, text=True, check=True).stdout


def page(inner='', pg=None, alt=''):
    art = pg.svg(alt) if pg is not None else ''
    return '<section class="pg">%s%s</section>' % (art, inner)


def blank():
    return '<section class="pg"></section>'


def title_page():
    pg = A.Pg()
    import ac_words as W
    # a framed lotus mandala under the title
    pg.page(lambda p: (W.lotus_small(p, A.CX, 745, 262), W.sprig_arc(p, A.CX, 745, 290, A.PI * 0.0, A.PI * 2, 26, 40, 12)))
    h = ('<div class="t" style="top:.82in"><div class="kicker">%s &middot; a companion</div>'
         '<h1 style="font-size:54pt;line-height:1.02;margin:.14in 0 .14in">%s</h1>'
         '<div class="sub" style="width:5.8in;margin:0 auto">%s</div></div>'
         '<div class="t" style="top:10.12in"><div style="font:700 13pt Andika">by %s</div></div>') % (esc(T.SERIES.upper()), esc(T.TITLE), esc(T.SUBTITLE), esc(T.AUTHOR))
    return page(h, pg, T.TITLE + ': a mandala of leaves and petals')


def belongs_page():
    pg = A.Pg()
    import ac_mandala as M
    def art(p):
        M.circ_ring(p, A.CX, 300, 150, A.W1)
        M.band_scallop(p, A.CX, 300, 118, 150, 24, 0)
        M.band_petals(p, A.CX, 300, 74, 118, 16, 0)
        M.band_round(p, A.CX, 300, 24, 74, 12, A.PI / 12)
        p.circle(A.CX, 300, 24, A.W2)
    pg.page(art)
    h = ('<div class="t" style="top:4.55in"><h2 style="font-size:30pt">%s</h2></div>'
         '<div class="t" style="top:5.9in"><span class="line" style="width:4.4in"></span></div>'
         '<div class="t" style="top:6.7in;font:700 12pt Andika">Started <span class="line" style="width:1.6in"></span> &nbsp; Finished <span class="line" style="width:1.6in"></span></div>') % esc(T.BELONGS)
    return page(h, pg, 'A small mandala above a line for a name')


def howto_page():
    h = '<div class="t" style="top:1.5in;text-align:left;left:1.2in;right:1.2in"><h2 style="font-size:30pt;margin-bottom:.35in">%s</h2><div class="body">%s</div></div>' % (
        esc(T.HOWTO_HEAD), ''.join('<p>%s</p>' % esc(s) for s in T.HOWTO))
    return page(h)


def test_page():
    pg = A.Pg()
    def art(p):
        # a grid of swatches, then overlapping circles for blending
        x0, y0 = 150, 245
        cw, ch, gx, gy = 120, 58, 24, 18
        for r in range(7):
            for c in range(4):
                p.shape(A.rrect(x0 + c * (cw + gx), y0 + r * (ch + gy), cw, ch, 10), A.W2)
        cx = A.CX
        for k in range(5):
            p.shape(A.circ(cx - 160 + k * 80, 870, 52), A.W2)
    pg.page(art)
    h = ('<div class="t" style="top:.8in"><h2 style="font-size:30pt">%s</h2><div class="sub" style="width:5.4in;margin:.12in auto 0;font-size:13pt">%s</div></div>') % (esc(T.TEST_HEAD), esc(T.TEST_NOTE))
    return page(h, pg, 'Rows of empty swatches and overlapping circles to try your colors')


def copyright_page():
    s = '<div class="copy">%s</div>' % T.COPYRIGHT.format(series=esc(T.SERIES), name=esc(T.TITLE), author=esc(T.AUTHOR), updated=T.UPDATED, site=T.SITE)
    return page(s)


def thanks_page():
    pg = A.Pg()
    import ac_words as W
    pg.page(lambda p: W.sprig_arc(p, A.CX, 520, 150, A.PI * 0.0, A.PI * 2, 18, 40, 11))
    url = 'https://' + T.SITE + T.PAGE_TARGET
    h = ('<div class="t" style="top:1.0in"><h2 style="font-size:38pt">%s</h2></div>'
         '<div class="t body" style="top:1.95in;left:1.25in;right:1.15in;font-size:13pt">%s</div>'
         '<div class="t" style="top:5.55in;left:1.3in;right:1.2in;text-align:left">%s</div>'
         '<div class="qr" style="left:1.3in;top:8.25in;width:1.15in;height:1.15in">%s</div>'
         '<div style="position:absolute;left:2.7in;top:8.3in;width:4.6in;font-size:12pt;line-height:1.4"><b style="font-family:Fraunces,serif;font-size:14pt">%s</b><br>%s<br><span style="font-weight:700">%s%s</span></div>') % (
        esc(T.THANKS_HEAD), ''.join('<p>%s</p>' % esc(x) for x in T.THANKS),
        ''.join('<div class="pr">%s<span class="ln"></span></div>' % esc(x) for x in T.THANKS_PROMPTS),
        qr_svg(url), esc(T.THANKS_QR_LABEL), 'Free, with no account. Scan the code or type the address.', T.SITE, T.PAGE_TARGET)
    return page(h)


def design_pages(svg_dir=None):
    out = []
    for i, (fn, title, fam, alt, pups) in enumerate(DS.D):
        pg = A.Pg()
        pg.page(fn)
        out.append(page('', pg, alt))
        out.append(blank())
        if svg_dir:
            open(os.path.join(svg_dir, '%02d-%s.svg' % (i + 1, fn.__name__)), 'w').write(pg.svg(alt).replace('<svg ', '<svg width="8.5in" height="11in" ', 1))
    return out


def build(svg_dir=None):
    pages = [title_page(), copyright_page(), belongs_page(), howto_page(), test_page(), blank()]
    pages += design_pages(svg_dir)
    pages += [thanks_page(), blank()]
    assert len(pages) == PAGES_PLANNED, len(pages)
    C.write(os.path.join(SRC, 'coloring-adult.html'), C.doc(T.TITLE, CSS, '\n'.join(pages)))
    meta = {'title': T.TITLE, 'subtitle': T.SUBTITLE, 'trim_in': [8.5, 11], 'paper': 'white', 'designs': len(DS.D), 'pages_planned': len(pages),
            'odd_design_pages': [7 + 2 * i for i in range(len(DS.D))]}
    C.write(os.path.join(OUT, 'adult.json'), json.dumps(meta, indent=1) + '\n')
    print('coloring-adult: %d designs, %d pages' % (len(DS.D), len(pages)))
    return meta


if __name__ == '__main__':
    d = None
    if '--svgs' in sys.argv:
        d = sys.argv[sys.argv.index('--svgs') + 1]
        os.makedirs(d, exist_ok=True)
    build(d)
