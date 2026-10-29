#!/usr/bin/env python3
"""ac_cover.py: the full-wrap cover of "Color and Breathe" (adultcolor29), in full color, in the family of the adult books
(cream paper, a teal band, Fraunces and Lora), with a colored lotus mandala. Sizes come from kids_common.cover_doc (KDP's formula)."""
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import ac_core as A  # noqa: E402
import ac_mandala as M  # noqa: E402
import adult_text as T  # noqa: E402
sys.path.insert(0, os.path.join(HERE, '..', 'kids'))
import kids_common as C  # noqa: E402

ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'book', 'adult')
SRC = os.path.join(OUT, 'src')
CREAM, TEAL, INK = '#FBF6E8', '#2D6E6A', '#23201B'
PAL = ['#F4C7A5', '#E9907A', '#F2C45E', '#8DB596', '#8EC3D8', '#B7A3D6', '#F29FB5', '#9ED0C4']


def front_art():
    """the colored mandala, centred low on the front"""
    pg = A.Pg(palette=PAL)
    pg.raw('<g transform="translate(425 690) scale(0.98) translate(-430 -550)">')
    pg.pi = 0
    M.m_lotus(pg, corners=False)
    pg.raw('</g>')
    # a few small sparkles around the mandala
    from ac_props import sparkle
    pg.pal = None
    for (x, y, r) in ((90, 420, 14), (770, 440, 16), (70, 960, 12), (790, 980, 14), (140, 330, 10), (720, 330, 11)):
        sparkle(pg, x, y, r, A.W2, '#F2C45E')
    return pg.svg('A colored mandala of lotus petals').replace(' class="art"', ' class="fart"')


def make_cover(pages):
    w, h = 8.5, 11.0
    sp = C.spine_in(pages, 'white')
    B = C.BLEED
    Wt, Ht = 2 * B + 2 * w + sp, h + 2 * B
    U = 100
    wu, hu = Wt * U, Ht * U
    band = (B + 0.62) * U
    bg = ('<svg xmlns="http://www.w3.org/2000/svg" class="bg" viewBox="0 0 %s %s" preserveAspectRatio="none">'
          '<rect width="%s" height="%s" fill="%s"/><rect width="%s" height="%s" fill="%s"/><rect x="%s" y="0" width="%s" height="%s" fill="%s"/>'
          '</svg>') % (wu, hu, wu, hu, CREAM, wu, band, TEAL, (B + w) * U, sp * U, hu, TEAL)
    css = ('.cv-front .fart { position:absolute; left:0; top:0; width:8.5in; height:11in; }'
           '.cv-spine-t { color:#fff; }')
    front = ('<div style="position:absolute;left:0;right:0;top:0;height:.62in;display:flex;justify-content:space-between;align-items:center;padding:0 .5in 0 .62in;color:#FBF6E8;font:700 8pt Andika;letter-spacing:.16em">'
             '<span>%s</span><span style="font:italic 10pt Lora;letter-spacing:0">See it fairly. Say it kindly.</span></div>'
             '%s'
             '<div style="position:absolute;left:.62in;right:.5in;top:.95in">'
             '<div style="font:700 9.5pt Andika;letter-spacing:.16em;color:%s">%s &middot; ADULT COLORING BOOK</div>'
             '<div style="font:800 70pt/0.98 Fraunces,serif;color:%s;margin:.12in 0 .18in;letter-spacing:-.005em">Color and<br>Breathe</div>'
             '<div style="font:italic 15.5pt/1.32 Lora,serif;color:#3A342C;width:6.4in">%s</div></div>'
             '<div style="position:absolute;left:.62in;right:.5in;bottom:.5in;display:flex;justify-content:space-between;align-items:baseline;font:700 12pt Andika;color:%s"><span>by %s</span><span style="font:700 9pt Andika;letter-spacing:.12em">40 DESIGNS</span></div>'
             ) % ('SPREADLOVEANDACCEPTANCE.COM', front_art(), TEAL, T.SERIES.upper(), INK, C.esc(T.SUBTITLE), INK, C.esc(T.AUTHOR))
    back = ('<div style="position:absolute;left:0;right:0;top:0;height:.62in"></div>'
            '<div style="position:absolute;left:.75in;right:.62in;top:1.1in;color:%s">'
            '<div style="font:800 25pt Fraunces,serif;margin-bottom:.14in">%s</div>%s'
            '<ul style="margin:.1in 0 .18in;padding-left:.22in;font:12pt/1.5 Lora,serif">%s</ul>'
            '<p style="margin:.1in 0 0;font:700 10.5pt Andika;color:%s">%s</p></div>'
            '<div style="position:absolute;left:.75in;bottom:.5in;font:700 11pt Andika;color:%s">by %s &middot; %s</div>') % (
        INK, C.esc(T.BACK_HEAD), ''.join('<p style="margin:0 0 .12in;font:12.5pt/1.5 Lora,serif">%s</p>' % C.esc(x) for x in T.BACK),
        ''.join('<li>%s</li>' % C.esc(x) for x in T.BACK_BULLETS), TEAL, 'Free to read and print online at ' + T.SITE, INK, C.esc(T.AUTHOR), T.SITE)
    spine = '<div class="cv-spine-t" style="font:700 6.5pt Fraunces,serif">Color and Breathe &nbsp;&middot;&nbsp; Christian</div>' if pages > 79 else ''
    html, info = C.cover_doc(T.TITLE, (w, h), pages, 'white', bg, front, back, spine, css)
    C.write(os.path.join(SRC, 'cover-coloring-adult.html'), html)
    meta = json.load(open(os.path.join(OUT, 'adult.json')))
    meta['cover'] = info
    C.write(os.path.join(OUT, 'adult.json'), json.dumps(meta, indent=1) + '\n')
    print('cover: spine %s in, %s x %s in' % (info['spine_in'], info['width_in'], info['height_in']))
    return info


if __name__ == '__main__':
    make_cover(int(sys.argv[1]) if len(sys.argv) > 1 else 88)
