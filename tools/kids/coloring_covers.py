#!/usr/bin/env python3
"""coloring_covers.py: the full-wrap covers of the two coloring books (kids29), in full color, drawn with the same engine and the
same two pups as the pages inside. Sizes and the spine come from kids_common.cover_doc, so the dimensions never change."""
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import kids_common as C  # noqa: E402
import coloring_text as T  # noqa: E402
from cute import Ink, Path, blob, curve, circ, ell, rrect, capsule, fit, heart_path, star_path, rpoly, mat, TAU  # noqa: E402
import cast  # noqa: E402
import props as pr  # noqa: E402
import props2 as p2  # noqa: E402
import props3 as p3  # noqa: E402
import pat  # noqa: E402

INKC = '#2B2620'
CRAYONS = ['#E25C4F', '#F2C14E', '#6FB36A', '#4B9CD3', '#9C83D0', '#F08DA8']


def cink(sw=1.0):
    return Ink(ow=5.2 * sw, iw=3.2 * sw, dw=2.8 * sw, wob=0.45, wob_lo=0.7, step=4.0, color=True, inkc=INKC)


def gradient(ink, stops, x1=0, y1=0, x2=0, y2=1):
    gid = ink.newid('g')
    ink.defs.append('<linearGradient id="%s" x1="%s" y1="%s" x2="%s" y2="%s">%s</linearGradient>' % (gid, x1, y1, x2, y2, ''.join('<stop offset="%s" stop-color="%s"/>' % (o, c) for o, c in stops)))
    return gid


def crayon(ink, x, y, s, col, rot=0):
    with ink.fig(x, y, s, False, rot) as g:
        g.part(rrect(-8, -52, 16, 82, 3), c=col)
        g.part(rpoly([(-8, -52), (0, -76), (8, -52)], 2), c=col)
        g.part(rrect(-8.5, -34, 17, 14, 1), c='#FFFDF5', under=False, w=ink.dw * 0.7)


def color_mandala(ink, cx, cy, r, pal, rings=5, petals=14):
    """a full-color mandala: rings of petals, scallops and dots in the given palette"""
    with ink.fig(cx, cy, 1.0) as g:
        g.part(circ(0, 0, r), c=pal[0])
    rad = r
    for k in range(rings):
        n = petals + 2 * k
        ro, ri = rad, rad - r * 0.17
        col = pal[(k + 1) % len(pal)]
        with ink.fig(cx, cy, 1.0, outline=False) as g:
            for i in range(n):
                a = i * TAU / n
                da = TAU / n
                if k % 2 == 0:
                    P = Path().M(math.cos(a - da * 0.5) * ri, math.sin(a - da * 0.5) * ri)
                    P.C(math.cos(a - da * 0.6) * (ri + ro) / 2, math.sin(a - da * 0.6) * (ri + ro) / 2, math.cos(a) * ro, math.sin(a) * ro, math.cos(a) * ro, math.sin(a) * ro)
                    P.C(math.cos(a) * ro, math.sin(a) * ro, math.cos(a + da * 0.6) * (ri + ro) / 2, math.sin(a + da * 0.6) * (ri + ro) / 2, math.cos(a + da * 0.5) * ri, math.sin(a + da * 0.5) * ri).Z()
                    g.part(P, c=col, w=ink.dw * 0.9)
                else:
                    g.part(circ(math.cos(a) * (ro + ri) / 2, math.sin(a) * (ro + ri) / 2, r * 0.035), c=col, w=ink.dw * 0.9)
        rad = ri
    with ink.fig(cx, cy, 1.0) as g:
        g.part(circ(0, 0, rad), c=pal[2])
        for i in range(8):
            a = i * TAU / 8
            g.part(ell(math.cos(a) * rad * 0.5, math.sin(a) * rad * 0.5, rad * 0.36, rad * 0.16, math.degrees(a)), c=pal[(i % 3) + 1], under=False, w=ink.dw)
        g.part(circ(0, 0, rad * 0.2), c='#FFE08A', under=False, w=ink.dw)


def make_cover(kind, pages):
    younger = kind == 'younger'
    X = T.YOUNGER if younger else T.OLDER
    w, h = 8.5, 11.0
    sp = C.spine_in(pages, 'white')
    B = C.BLEED
    Wt, Ht = 2 * B + 2 * w + sp, h + 2 * B
    U = 100
    wu, hu = Wt * U, Ht * U
    fx, bx = (B + w + sp) * U, B * U
    P = cink()
    if younger:
        gid = gradient(P, [(0, '#8FD0F0'), (0.55, '#FFF1D2'), (1, '#BFE6A0')])
    else:
        gid = gradient(P, [(0, '#5A4690'), (0.5, '#B79CE0'), (1, '#FFE0C0')])
    P.raw('<rect width="%s" height="%s" fill="url(#%s)"/>' % (wu, hu, gid))
    fr = (fx + 62, 330, 726, 760)   # not used as a frame; art area on the front
    if younger:
        # the front: a big rainbow, clouds, hills, the two pups close together, hearts and crayons
        pr.rainbow(P, fx + 425, 800, 360, 5, 40, c=('#F2877E', '#F7D56A', '#8FCB7C', '#8FCBF0', '#B79CEB'))
        pr.puff(P, fx + 110, 620, 1.0, n=4)
        pr.puff(P, fx + 745, 580, 1.0, n=4)
        P.raw('<path d="M%s %s C%s %s %s %s %s %s V%s H%s Z" fill="#A9DB84" stroke="%s" stroke-width="5.2" stroke-linejoin="round"/>' % (fx - 20, 900, fx + 200, 840, fx + 560, 940, fx + 870, 870, hu, fx - 20, INKC))
        fit(P, lambda i, x, y, s: cast.pup_hug(i, x, y, s, 'happy', 'happy'), (fx + 90, 420, fx + 760, 1020), 'bottom')
        for (x, y, r, rot) in ((70, 420, 26, -12), (780, 400, 28, 14), (200, 360, 18, 8), (650, 350, 20, -6)):
            pr.heart(P, fx + x, y, r, rot)
        for i, c in enumerate(CRAYONS):
            crayon(P, fx + 150 + i * 110, 1090, 1.3, c, rot=-12 + i * 5)
        # the back: clouds, a few hearts, and the two pups peeking up at the bottom left
        pr.puff(P, bx + 150, 880, 0.9, n=4)
        pr.puff(P, bx + 640, 840, 0.8, n=3)
        for (x, y, r, rot) in ((90, 760, 18, -10), (730, 720, 20, 12), (420, 800, 16, 6)):
            pr.heart(P, bx + x, y, r, rot)
        p2.sprinkles(P, 3, 0, (0, 0, 1, 1)) if False else None
        fit(P, lambda i, x, y, s: cast.pup_peek(i, 'sugarfoot', x, y, s, 'happy'), (bx + 60, 940, bx + 260, 1080), 'bottom')
        fit(P, lambda i, x, y, s: cast.pup_peek(i, 'tidbit', x, y, s, 'joy'), (bx + 280, 940, bx + 480, 1080), 'bottom')
    else:
        color_mandala(P, fx + 425, 760, 380, ['#F5E6FF', '#F2877E', '#F7D56A', '#8FCBF0', '#B79CEB', '#8FCB7C'], 5, 14)
        with P.fig(fx + 425, 760) as g:
            g.part(circ(0, 0, 195), c='#FFF6E4')
        fit(P, lambda i, x, y, s: cast.pup_hug(i, x, y, s, 'happy', 'happy', 1), (fx + 235, 600, fx + 615, 910), 'bottom')
        for (x, y, r) in ((90, 360, 16), (770, 380, 18), (140, 1060, 14), (720, 1050, 14), (425, 1090, 12)):
            pr.star5(P, fx + x, y, r, 8)
        for (x, y, r) in ((110, 520, 14), (760, 540, 14), (425, 380, 16)):
            pr.heart(P, fx + x, y, r, 8)
        for (x, y) in ((200, 340), (640, 330), (60, 700), (790, 720), (320, 1070), (540, 1075)):
            pr.sparkle(P, fx + x, y, 12)
        for (x, y, r) in ((90, 360, 16), (760, 340, 14), (180, 760, 12), (700, 820, 12)):
            pr.sparkle(P, bx + x, y, r)
        fit(P, lambda i, x, y, s: cast.pup_peek(i, 'sugarfoot', x, y, s, 'calm', lvl=0), (bx + 60, 940, bx + 260, 1080), 'bottom')
        fit(P, lambda i, x, y, s: cast.pup_peek(i, 'tidbit', x, y, s, 'happy', lvl=0), (bx + 280, 940, bx + 480, 1080), 'bottom')
    bg = C.svg_wrap(P, wu, hu, 'bg')
    t1, t2 = X['title_lines']
    ts = 46 if younger else 40
    front = ('<div style="position:absolute;left:.4in;right:.4in;top:.45in;text-align:center">'
             '<div style="font:700 12pt Andika;letter-spacing:.12em;color:#3A3350">%s &middot; BOOK %d</div>'
             '<div style="font:800 %dpt/1.0 Fraunces,serif;color:#FFFDF5;-webkit-text-stroke:2.8px #2F3566;paint-order:stroke fill;margin-top:.1in">%s<br>%s</div>'
             '<div style="font:700 14pt/1.3 Andika;color:#2F3566;margin:.16in auto 0;width:6.9in;background:rgba(255,253,245,.9);border-radius:.22in;padding:.07in .2in">%s</div></div>'
             '<div style="position:absolute;left:0;right:0;bottom:.3in;text-align:center"><span style="display:inline-block;background:rgba(255,253,245,.94);border-radius:.2in;padding:.05in .3in;font:700 17pt Andika;color:#2F3566">%s</span></div>'
             ) % (C.esc(X['ages'].upper()), X['series_no'], ts, C.esc(t1), C.esc(t2), C.esc(X['cover_subtitle']), C.esc(C.AUTHOR))
    back = ('<div style="position:absolute;left:.7in;right:.7in;top:.7in;font-size:13.5pt;line-height:1.42;background:rgba(255,253,245,.93);border-radius:.25in;padding:.26in .34in;border:2.5px solid #E8D5A2">'
            '<div style="font:800 20pt Fraunces,serif;margin-bottom:.1in;color:#3A3350">%s</div>%s'
            '<p style="margin:.12in 0 0;font-size:11.5pt;color:#4A4033">%s &middot; Free to read online at %s</p></div>') % (
        C.esc(X['back_heading']), ''.join('<p style="margin:0 0 .1in">%s</p>' % C.esc(x) for x in X['back_cover']), C.esc(X['ages']), C.SITE)
    html, info = C.cover_doc(X['title'], (w, h), pages, 'white', bg, front, back, '')
    ident = 'coloring-' + kind
    C.write(os.path.join(C.SRC, 'cover-%s.html' % ident), html)
    meta = C.load_json(os.path.join(C.OUT, 'kids.json'), {}) or {}
    meta.setdefault('books', {}).setdefault(ident, {})['cover'] = info
    C.write(os.path.join(C.OUT, 'kids.json'), json.dumps(meta, indent=1) + '\n')
    print('%s cover: spine %s in, %s x %s in' % (ident, info['spine_in'], info['width_in'], info['height_in']))
