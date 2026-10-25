#!/usr/bin/env python3
"""kids_common.py: shared parts of the kids books builders (kids22).

Paths, fonts, the KDP numbers (paper thickness, bleed, costs), the full-wrap cover and the page counts file.
KDP numbers (looked up October 2026, see the listing file for sources):
  spine = pages x paper thickness: white paper (black ink or standard color) 0.002252 in, premium color 0.002347 in
  bleed 0.125 in (top, bottom and outside edge; the cover 0.125 in on all four sides)
  spine text only above 79 pages; the barcode box (2 x 1.2 in) sits 0.25 in from the trim at the bottom right of the back
"""
import html
import json
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
ROOT = os.path.abspath(os.path.join(HERE, '..', '..'))
OUT = os.path.join(ROOT, 'book', 'kids')
SRC = os.path.join(OUT, 'src')
MS = os.path.join(ROOT, '_manuscripts', 'kids')
PORT = 8673
sys.path.insert(0, HERE)

BLEED = 0.125
PAPER = {'white': 0.002252, 'premium': 0.002347}
# printing cost on Amazon.com (USD): fixed + per page. Premium color large trim: $1.00 + $0.08 a page (24 to 828 pages).
# Black ink: up to 108 pages $2.30 on regular trim (6 x 9), $2.84 on large trim (8.5 x 11 and 8.5 x 8.5), as in tools/book/build_series.py.
COSTS = {
    'premium_large': {'fixed': 1.00, 'per_page': 0.080, 'label': 'Premium color, large trim (8.5 x 8.5): $1.00 + $0.080 a page'},
    'bw_regular': {'flat': 2.30, 'label': 'Black ink, regular trim (6 x 9), up to 108 pages: $2.30 a book'},
    'bw_large': {'flat': 2.84, 'label': 'Black ink, large trim (8.5 x 11), up to 110 pages: $2.84 a book'},
}

AUTHOR = 'Christian'
SITE = 'spreadloveandacceptance.com'
SERIES = 'The Frequency Buddies Books'
UPDATED = 'October 2026'

FONT_CSS = '''
@font-face{font-family:"Andika";src:url("/tools/kids/fonts/Andika-Regular.ttf");font-weight:400;font-style:normal}
@font-face{font-family:"Andika";src:url("/tools/kids/fonts/Andika-Italic.ttf");font-weight:400;font-style:italic}
@font-face{font-family:"Andika";src:url("/tools/kids/fonts/Andika-Bold.ttf");font-weight:700;font-style:normal}
@font-face{font-family:"Fraunces";src:url("/tools/kids/fonts/Fraunces-SemiBold.ttf");font-weight:600;font-style:normal}
@font-face{font-family:"Fraunces";src:url("/tools/kids/fonts/Fraunces-Bold.ttf");font-weight:700;font-style:normal}
@font-face{font-family:"Fraunces";src:url("/tools/kids/fonts/Fraunces-ExtraBold.ttf");font-weight:800;font-style:normal}
@font-face{font-family:"Lora";src:url("/tools/kids/fonts/Lora-Regular.ttf");font-weight:400;font-style:normal}
@font-face{font-family:"Lora";src:url("/tools/kids/fonts/Lora-Italic.ttf");font-weight:400;font-style:italic}
@font-face{font-family:"Lora";src:url("/tools/kids/fonts/Lora-SemiBold.ttf");font-weight:600;font-style:normal}
@font-face{font-family:"Lora";src:url("/tools/kids/fonts/Lora-Bold.ttf");font-weight:700;font-style:normal}
'''


def esc(s):
    return html.escape(s, quote=True)


def para(s):
    """a text with \\n line breaks to HTML (the lines of a verse stay on their own line)"""
    return '<br>'.join(esc(x) for x in s.split('\n'))


def write(path, s):
    os.makedirs(os.path.dirname(path), exist_ok=True)
    with open(path, 'w', encoding='utf-8') as fh:
        fh.write(s)


def load_json(path, default=None):
    try:
        with open(path, encoding='utf-8') as fh:
            return json.load(fh)
    except Exception:
        return default


def counts():
    return load_json(os.path.join(OUT, 'kids.json'), {}) or {}


def spine_in(pages, paper):
    return round(pages * PAPER[paper], 4)


def money(x):
    return '$%.2f' % (round(x + 1e-9, 2))


def print_cost(kind, pages):
    c = COSTS[kind]
    if 'flat' in c:
        return c['flat']
    return round(c['fixed'] + c['per_page'] * pages + 1e-9, 2)


def royalty(price, cost):
    rate = 0.60 if price >= 9.99 else 0.50
    return round(round(rate * price + 1e-9, 2) - cost, 2), rate


def doc(title, css, body, lang='en-US'):
    return ('<!doctype html>\n<html lang="%s">\n<head>\n<meta charset="utf-8">\n<meta name="viewport" content="width=device-width, initial-scale=1">\n'
            '<meta name="robots" content="noindex">\n<title>%s</title>\n<style>\n%s\n%s\n</style>\n</head>\n<body>\n%s\n</body>\n</html>\n') % (
        lang, esc(title), FONT_CSS, css, body)


def cover_doc(title, trim, pages, paper, bg_svg, front_html, back_html, spine_html='', css_extra=''):
    """a full-wrap cover: bleed, back, spine, front, bleed. bg_svg is one SVG as wide as the whole wrap (units: 100 a inch).
    front_html and back_html are positioned inside each trim box (inches from the box's top left)."""
    w, h = trim
    sp = spine_in(pages, paper)
    W = round(2 * BLEED + 2 * w + sp, 4)
    H = round(h + 2 * BLEED, 4)
    css = '''
@page { size: %(W)sin %(H)sin; margin: 0; }
html, body { margin: 0; padding: 0; background: #fff; }
.cv { position: relative; width: %(W)sin; height: %(H)sin; overflow: hidden; font-family: "Andika", sans-serif; color: #2B2620; }
.cv > svg.bg { position: absolute; left: 0; top: 0; width: %(W)sin; height: %(H)sin; display: block; }
.cv-back { position: absolute; left: %(B)sin; top: %(B)sin; width: %(w)sin; height: %(h)sin; }
.cv-front { position: absolute; left: %(FX)sin; top: %(B)sin; width: %(w)sin; height: %(h)sin; }
.cv-spine { position: absolute; left: %(SX)sin; top: 0; width: %(sp)sin; height: %(H)sin; }
.cv-spine-t { position: absolute; left: 50%%; top: 50%%; transform: translate(-50%%, -50%%) rotate(90deg); white-space: nowrap; font-family: "Fraunces", serif; font-weight: 700; font-size: %(sf)spt; line-height: 1; margin: 0; color: #fff; letter-spacing: .02em; }
/* KDP prints the barcode here: 2 x 1.2 in, 0.25 in from the trim edges at the bottom right of the back cover. Nothing is drawn in it. */
.cv-barcode { position: absolute; right: 0.25in; bottom: 0.25in; width: 2in; height: 1.2in; }
%(extra)s
''' % {'W': W, 'H': H, 'B': BLEED, 'w': w, 'h': h, 'FX': round(BLEED + w + sp, 4), 'SX': round(BLEED + w, 4), 'sp': sp,
       'sf': max(6, min(14, round((sp - 0.125) * 72 * 0.8, 1))), 'extra': css_extra}
    body = ('<div class="cv">%s<div class="cv-back">%s<div class="cv-barcode" aria-hidden="true"></div></div>'
            '<div class="cv-spine">%s</div><div class="cv-front">%s</div></div>') % (bg_svg, back_html, spine_html, front_html)
    return doc(title + ' (cover)', css, body), {'width_in': W, 'height_in': H, 'spine_in': sp}


def svg_wrap(P, vw, vh, cls='', defs='', vx=0):
    return '<svg xmlns="http://www.w3.org/2000/svg" class="%s" viewBox="%s 0 %s %s" preserveAspectRatio="xMidYMid slice">%s%s</svg>' % (
        cls, vx, vw, vh, defs, P.svg())


def grad(P, kind, stops, vertical=True, x=None):
    """a linear gradient fill id (color mode only); returns the id"""
    gid = P.id('g')
    d = ''.join('<stop offset="%s" stop-color="%s"/>' % (o, c) for o, c in stops)
    P.raw('<defs><linearGradient id="%s" x1="0" y1="0" x2="%s" y2="%s">%s</linearGradient></defs>' % (gid, 0 if vertical else 1, 1 if vertical else 0, d))
    return gid
