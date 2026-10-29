#!/usr/bin/env python3
"""ac_words.py: the calm word pages of "Color and Breathe" (adultcolor29).

A word is drawn from the outlines of the Fraunces ExtraBold letters (SIL Open Font License), turned into Bezier paths; each letter is a
closed shape with a pattern inside it to color, framed by leaves, flowers, clouds or stars."""
import math
import os
from ac_core import *
from ac_zen import fill_region, PATTERNS
from ac_botan import daisy, cosmos, poppy, tulip, bellflower, draw_leaf, stem, bez_pt, butterfly, rose, grass, lavender, bee
from ac_mandala import band_petals, band_scallop, band_round, circ_ring, dots, flower, m_petal
from ac_props import cloud, sparkle, star5, m_diamond_s

from fontTools.ttLib import TTFont
from fontTools.pens.svgPathPen import SVGPathPen
from fontTools.pens.transformPen import TransformPen

FONT = os.path.join(KIDS, 'fonts', 'Fraunces-ExtraBold.ttf')
_F = TTFont(FONT)
_GS = _F.getGlyphSet()
_CMAP = _F.getBestCmap()
_UPM = _F['head'].unitsPerEm
_HMTX = _F['hmtx']


def glyph_path(ch, size, x, baseline):
    """one letter as a Path (y down), its origin at x on the baseline, em size in units"""
    name = _CMAP[ord(ch)]
    pen = SVGPathPen(_GS)
    s = size / _UPM
    tp = TransformPen(pen, (s, 0, 0, -s, x, baseline))
    _GS[name].draw(tp)
    return Path.parse(pen.getCommands())


def text_width(text, size, track=0.0):
    return sum(_HMTX[_CMAP[ord(c)]][0] for c in text) / _UPM * size + track * (len(text) - 1)


def letters(text, size, cx, baseline, track=6.0):
    """a list of (char, Path) for the letters of a line, centred on cx"""
    w = text_width(text, size, track)
    x = cx - w / 2
    out = []
    for c in text:
        if c != ' ':
            out.append((c, glyph_path(c, size, x, baseline)))
        x += _HMTX[_CMAP[ord(c)]][0] / _UPM * size + track
    return out


def fit_size(text, width, track=0.0):
    """the em size at which the text is `width` wide"""
    unit = text_width(text, 1.0, 0.0)
    return (width - track * (len(text) - 1)) / unit


def draw_letter(pg, P, kind=None, gap=14, ang=0.0, inline=6.5, w=W1):
    """one letter: an outer outline, an inner line a little inside it (a channel to color), and an optional pattern in the middle"""
    d = pd(P)
    pg.o.append('<path d="%s" fill="%s" stroke="%s" stroke-width="%s" stroke-linejoin="round"/>' % (d, INK, INK, f(2 * w)))
    pg.o.append('<path d="%s" fill="#fff"/>' % d)
    pg.clip(P)
    if kind:
        x0, y0, x1, y1 = __import__('ac_zen').bbox_of(P)
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        R = math.hypot(x1 - x0, y1 - y0) / 2 + gap
        Q = PATTERNS[kind](cx - R, cy - R, cx + R, cy + R, gap)
        if ang:
            Q = Q.xf(mmul(mat(cx, cy, 1, False, ang), mat(-cx, -cy, 1)))
        pg.line(Q, W3)
    if inline:
        pg.o.append('<path d="%s" fill="none" stroke="%s" stroke-width="%s" stroke-linejoin="round"/>' % (d, INK, f(2 * (inline + 0.9))))
        pg.o.append('<path d="%s" fill="none" stroke="#fff" stroke-width="%s" stroke-linejoin="round"/>' % (d, f(2 * inline)))
    pg.endclip()


def draw_word(pg, text, width, cx, baseline, kinds=None, gap=13, track=2.0, inline=6.5, angs=None):
    size = fit_size(text, width, track)
    for i, (c, P) in enumerate(letters(text, size, cx, baseline, track)):
        k = kinds[i % len(kinds)] if kinds else None
        draw_letter(pg, P, k, gap, (angs or [0])[i % len(angs or [0])], inline)
    return size


def draw_arc_word(pg, text, size, cx, cy, R, kinds=None, gap=13, track=4.0, inline=6.5):
    """a word set on the top of a circle of radius R (the baseline), centred at the top"""
    advs = [_HMTX[_CMAP[ord(c)]][0] / _UPM * size for c in text]
    total = sum(advs) + track * (len(text) - 1)
    pos = -total / 2
    for i, c in enumerate(text):
        mid = pos + advs[i] / 2
        th = mid / R
        P = glyph_path(c, size, -advs[i] / 2, 0)
        P = P.xf(mmul(mat(cx, cy, 1, False, math.degrees(th)), mat(0, -R, 1)))
        draw_letter(pg, P, kinds[i % len(kinds)] if kinds else None, gap, 0, inline)
        pos += advs[i] + track


def sprig_arc(pg, cx, cy, r, a0, a1, n, L, wd):
    """leaves along an arc of a circle (a laurel), pointing along the way"""
    for k in range(n):
        t = (k + 0.5) / n
        a = a0 + (a1 - a0) * t
        px, py = polar(r, a, cx, cy)
        d = a + (PI / 2 if a1 > a0 else -PI / 2)
        for sgn in (-1, 1):
            draw_leaf(pg, px, py, math.degrees(d) + sgn * 38, L, wd, 0.2 * sgn, 2)


def swash(pg, x0, x1, y, amp=16):
    """a calm underline: a long S-curve that ends in a leaf at each end"""
    P = Path().M(x0, y).C(x0 + (x1 - x0) * 0.25, y - amp, x0 + (x1 - x0) * 0.4, y + amp, (x0 + x1) / 2, y).C(x0 + (x1 - x0) * 0.6, y - amp, x0 + (x1 - x0) * 0.75, y + amp, x1, y)
    pg.line(P, W2)
    pg.line(P.xf(mat(0, 7, 1)), W3)
    draw_leaf(pg, x0 - 4, y, 190, 50, 13, 0.2, 2)
    draw_leaf(pg, x1 + 4, y, -10, 50, 13, -0.2, 2)


# ============================================================ the pages
def lotus_small(pg, cx, cy, R):
    """a small lotus mandala that sits under an arched word"""
    from ac_mandala import ring_at, disk
    circ_ring(pg, cx, cy, R, W1)
    band_scallop(pg, cx, cy, R * 0.86, R, 28, 0)
    band_petals(pg, cx, cy, R * 0.68, R * 0.86, 28, PI / 28, vein=True)
    ring_at(pg, m_petal(R * 0.42, R * 0.12), cx, cy, R * 0.3, 16, 0, inner=Path().M(R * 0.08, 0).L(R * 0.34, 0))
    ring_at(pg, m_petal(R * 0.34, R * 0.11), cx, cy, R * 0.18, 16, PI / 16)
    disk(pg, cx, cy, R * 0.1)


def w_breathe(pg):
    cx, cy = CX, 650
    draw_arc_word(pg, 'Breathe', 176, cx, cy, 252, ['circles', None, 'waves', None, 'petals', None, 'diamonds'], gap=13, track=2)
    lotus_small(pg, cx, cy + 20, 226)
    for (x, y, r) in ((140, 330, 24), (210, 250, 14), (720, 340, 26), (650, 250, 14), (110, 440, 12), (760, 450, 12)):
        pg.circle(x, y, r, W2)
        pg.line(Path().M(x - r * 0.5, y - r * 0.2).C(x - r * 0.45, y - r * 0.5, x - r * 0.2, y - r * 0.66, x, y - r * 0.66), W3)
    for k in range(3):
        y = 930 + k * 38
        P = Path()
        x = 120 + (k % 2) * 26
        while x < 740:
            P.M(x, y).C(x + 24, y - 24, x + 56, y - 24, x + 80, y)
            x += 108
        pg.line(P, W2)
    sprig_arc(pg, cx, cy + 20, 270, PI * 0.12, PI * 0.88, 13, 56, 16)


def w_enough(pg):
    cx, cy = CX, 520
    circ_ring(pg, cx, cy, 345, W1)
    band_scallop(pg, cx, cy, 305, 343, 36, 0)
    band_petals(pg, cx, cy, 256, 305, 36, PI / 36, vein=True)
    pg.shape(circ(cx, cy, 256), W2)
    dots(pg, cx, cy, 238, 64, 0, 1.7)
    draw_word(pg, 'Enough', 640, cx, cy + 66, ['leaves', None, 'waves', None, 'circles', None], gap=15, track=0)
    for (x, y, r) in ((cx, cy - 160, 20), (cx - 110, cy - 136, 11), (cx + 110, cy - 136, 11)):
        sparkle(pg, x, y, r)
    for k in range(7):
        pg.shape(m_diamond_s(cx - 90 + k * 30, cy + 150, 8, 12), W3)
    for (x, y, a) in ((130, 960, -50), (730, 960, -130)):
        draw_leaf(pg, x, y, a, 120, 30, 0.2, 3)
        draw_leaf(pg, x, y, a - 40, 100, 24, -0.2, 3)
    daisy(pg, 130, 960, 42, 0.2, 12)
    daisy(pg, 730, 960, 42, 0.5, 12)
    cosmos(pg, cx, 960, 50, 0.2)
    swash(pg, 250, 610, 880, 12)


def w_soft(pg):
    cx = CX
    cloud(pg, 190, 160, 230, 90)
    cloud(pg, 650, 140, 190, 76)
    for (x, y, r) in ((110, 300, 12), (340, 100, 12), (500, 250, 11), (740, 290, 12)):
        sparkle(pg, x, y, r)
    draw_word(pg, 'Soft', 600, cx, 600, ['circles', 'scales', 'waves', 'petals'], gap=22, track=4, inline=9)
    for k in range(5):
        x = 150 + k * 140
        draw_leaf(pg, x, 800, 90 + (k - 2) * 10, 150, 34, 0.2 * (k - 2) / 2, 5, mid=True)
    cloud(pg, 190, 940, 200, 80)
    cloud(pg, 640, 950, 240, 90)


def w_again(pg):
    cx = CX
    sx, sy = cx, 900
    pg.shape(Path().M(sx - 210, sy).C(sx - 210, sy - 280, sx + 210, sy - 280, sx + 210, sy).Z(), W2)
    for k in range(13):
        a = PI + (k + 0.5) * PI / 13
        pg.shape(Path().M(*polar(224, a - 0.07, sx, sy)).L(*polar(300, a, sx, sy)).L(*polar(224, a + 0.07, sx, sy)).Z(), W2)
    pg.shape(Path().M(sx - 130, sy).C(sx - 130, sy - 170, sx + 130, sy - 170, sx + 130, sy).Z(), W2)
    draw_word(pg, 'Begin', 600, cx, 330, ['petals', None, 'waves', None, 'scales'], gap=16, track=2, inline=8)
    draw_word(pg, 'again', 600, cx, 580, [None, 'leaves', None, 'circles', None], gap=16, track=2, inline=8)
    for (x, sg) in ((125, 1), (735, -1)):
        stem(pg, [(x, 1010), (x + 4 * sg, 960), (x - 4 * sg, 920), (x, 880)], 8, 6)
        draw_leaf(pg, x, 910, -90 + 50 * sg, 90, 28, 0.2 * sg, 3)
        draw_leaf(pg, x, 930, -90 - 50 * sg, 80, 24, -0.2 * sg, 3)
        draw_leaf(pg, x, 880, -90, 60, 18, 0, 2)
    grass(pg, FX + 20, FX + FW - 20, 1024, 20, 50, 16, 3.0)


def w_room(pg):
    cx = CX
    ctrl = [(90, 130), (260, 200), (600, 200), (770, 130)]
    pg.line(Path().M(*ctrl[0]).C(*ctrl[1], *ctrl[2], *ctrl[3]), W2)
    for i in range(1, 9):
        t = i / 9
        px, py = bez_pt(ctrl, t)
        pg.shape(rpoly([(px - 26, py), (px + 26, py), (px, py + 64)], 4), W2)
        pg.shape(m_diamond_s(px, py + 24, 7, 10), W3)
    draw_word(pg, 'Room', 560, cx, 470, ['petals', None, 'circles', None], gap=15, track=2, inline=8)
    draw_word(pg, 'for', 200, cx, 600, [None], track=2, inline=6)
    draw_word(pg, 'everyone', 640, cx, 760, [None], track=0, inline=5.5)
    gy = 1022
    xs = [120, 220, 320, 420, 520, 620, 720]
    for i, x in enumerate(xs):
        stem(pg, [(x, gy), (x + 4 * (i % 2 * 2 - 1), gy - 40), (x - 4, gy - 70), (x, gy - 100 - (i % 3) * 12)], 7, 5)
    for i, x in enumerate(xs):
        y = gy - 110 - (i % 3) * 12
        k = i % 7
        if k == 0:
            daisy(pg, x, y, 36, 0.2, 12)
        elif k == 1:
            poppy(pg, x, y, 38, 0.3)
        elif k == 2:
            cosmos(pg, x, y, 36, 0.1)
        elif k == 3:
            tulip(pg, x, y + 30, 50, 70)
        elif k == 4:
            bellflower(pg, x, y, 36, 0.3)
        elif k == 5:
            rose(pg, x, y, 38, 0.2)
        else:
            daisy(pg, x, y, 34, 0.5, 10)
    for x in (170, 370, 570, 670):
        draw_leaf(pg, x, gy - 20, -90 + (x - 430) * 0.1, 64, 16, 0.2, 2)
