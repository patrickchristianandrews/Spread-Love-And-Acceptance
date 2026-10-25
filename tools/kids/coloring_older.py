#!/usr/bin/env python3
"""coloring_older.py: the 32 scenes of the older coloring book (kids22). Used by build_coloring.py.

Each scene is (title, drawing function, phrase). The canvas is 850 x 1100 units (100 a inch); the art stays between x 90 and 760
and y 100 and 930; the border sits at 40 units from the edge and the phrase is set below the art by build_coloring.py.
"""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import kids_art as A  # noqa: E402
from kids_art import f  # noqa: E402

OLDER_PAGE_SW = 3.0


# ------------------------------------------------------------------ helpers: border, patterns, hills
def frame(P, kind='flowers'):
    sw = P.sw
    P.raw('<rect x="40" y="40" width="770" height="1020" rx="34" fill="none" stroke="#111" stroke-width="%s"/>' % (sw * 1.3))
    P.raw('<rect x="56" y="56" width="738" height="988" rx="26" fill="none" stroke="#111" stroke-width="%s"/>' % (sw * 0.6))
    pts = []
    for x in range(110, 760, 70):
        pts += [(x, 76), (x, 1024)]
    for y in range(146, 1000, 70):
        pts += [(76, y), (774, y)]
    for i, (x, y) in enumerate(pts):
        if kind == 'flowers':
            A.flower(P, x, y, 1.1, '#fff', '#fff', 5, stem=False)
        elif kind == 'stars':
            A.star(P, x, y, 11, '#fff', 'shape', rot=(i * 7) % 72)
        elif kind == 'hearts':
            A.heart(P, x, y - 8, 0.34)
        elif kind == 'dots':
            P.circ(x, y, 5.5, '#fff')
        elif kind == 'leaves':
            P.ell(x, y, 5.5, 11, '#fff', rot=(i * 40) % 180)
        elif kind == 'waves':
            P.line('M%s %s q6 -8 12 0 q6 8 12 0' % (x - 12, y), '#111', kind='fine')
        elif kind == 'clouds':
            A.sky_cloud(P, x, y + 4, 0.34)
    for (x, y) in ((76, 76), (774, 76), (76, 1024), (774, 1024)):
        P.circ(x, y, 15, '#fff')


def clip_open(P, d):
    cid = P.id('c')
    P.raw('<clipPath id="%s"><path d="%s"/></clipPath><g clip-path="url(#%s)">' % (cid, d, cid))


def clip_close(P):
    P.raw('</g>')


def pattern(P, d, kind, x0, y0, x1, y1, step=26, sw=None):
    """a pattern clipped to the path d: the bounding box is x0..x1, y0..y1"""
    clip_open(P, d)
    sw = sw or P.sw * 0.7
    if kind == 'stripes':
        y = y0 - (x1 - x0)
        while y < y1:
            P.raw('<path d="M%s %s L%s %s" stroke="#111" stroke-width="%s"/>' % (x0, y + (x1 - x0), x1, y, sw))
            y += step
    elif kind == 'dots':
        r = 0
        y = y0
        while y < y1:
            x = x0 + (step / 2 if r % 2 else 0)
            while x < x1:
                P.raw('<circle cx="%s" cy="%s" r="%s" fill="none" stroke="#111" stroke-width="%s"/>' % (f(x), f(y), f(step * 0.2), sw))
                x += step
            y += step * 0.9
            r += 1
    elif kind == 'waves':
        y = y0
        while y < y1:
            P.raw('<path d="M%s %s %s" fill="none" stroke="#111" stroke-width="%s"/>' % (x0 - 20, y, ' '.join('q%s %s %s 0 q%s %s %s 0' % (step / 4, -step / 4, step / 2, step / 4, step / 4, step / 2) for _ in range(int((x1 - x0) / step) + 3)), sw))
            y += step * 0.7
    elif kind == 'scales':
        r = 0
        y = y0
        while y < y1 + step:
            x = x0 - step + (step / 2 if r % 2 else 0)
            while x < x1 + step:
                P.raw('<path d="M%s %s a%s %s 0 0 0 %s 0" fill="none" stroke="#111" stroke-width="%s"/>' % (f(x - step / 2), f(y), f(step / 2), f(step / 2), f(step), sw))
                x += step
            y += step * 0.5
            r += 1
    elif kind == 'diamonds':
        for k in range(-int((y1 - y0) / step) - 2, int((x1 - x0) / step) + 3):
            P.raw('<path d="M%s %s L%s %s M%s %s L%s %s" stroke="#111" stroke-width="%s"/>' % (x0 + k * step, y0, x0 + k * step + (y1 - y0), y1, x0 + k * step + (y1 - y0), y0, x0 + k * step, y1, sw))
    elif kind == 'checks':
        n = int((x1 - x0) / step) + 1
        for i in range(n):
            P.raw('<path d="M%s %s V%s" stroke="#111" stroke-width="%s"/>' % (x0 + i * step, y0, y1, sw))
        for j in range(int((y1 - y0) / step) + 1):
            P.raw('<path d="M%s %s H%s" stroke="#111" stroke-width="%s"/>' % (x0, y0 + j * step, x1, sw))
    elif kind == 'stars':
        y = y0
        r = 0
        while y < y1:
            x = x0 + (step / 2 if r % 2 else 0)
            while x < x1:
                A.star(P, x, y, step * 0.28, '#fff', 'shape')
                x += step
            y += step
            r += 1
    clip_close(P)


def hills(P, y, bands=(('stripes', 0), ('waves', 70), ('dots', 140)), x0=60, x1=790, step=24):
    """rolling hills with a different pattern on each band, from y downward to about y + 220"""
    for i, (kind, dy) in enumerate(bands):
        yy = y + dy
        d = 'M%s %s C%s %s %s %s %s %s S%s %s %s %s L%s %s L%s %s Z' % (
            x0, yy, x0 + 170, yy - 55, x0 + 340, yy + 35, x0 + 450, yy - 10, x0 + 650, yy - 50, x1, yy + 5, x1, yy + 200, x0, yy + 200)
        P.raw('<path d="%s" fill="#fff" stroke="#111" stroke-width="%s" stroke-linejoin="round"/>' % (d, P.sw))
        pattern(P, d, kind, x0, yy - 55, x1, yy + 200, step)


def fancy_cloud(P, x, y, s, kind):
    d = 'M-30 6 Q-34 -6 -22 -8 Q-20 -22 -4 -18 Q4 -28 18 -18 Q32 -18 30 -4 Q38 2 30 6Z'
    P.at(x, y, s)
    P.raw('<path d="%s" fill="#fff" stroke="#111" stroke-width="%s" stroke-linejoin="round"/>' % (d, f(P.sw / s)))
    pattern(P, d, kind, -36, -30, 40, 8, 6.2, sw=P.sw * 0.55 / s)
    P.close()


def birds(P, spots):
    for (x, y, s) in spots:
        P.line('M%s %s q%s %s %s %s q%s %s %s %s' % (f(x - 16 * s), f(y), f(8 * s), f(-12 * s), f(16 * s), f(2 * s), f(8 * s), f(-14 * s), f(16 * s), f(-2 * s)), '#111')


def sky(P, sun=True, clouds=True, birds_=True, stars=False):
    if sun:
        A.sun(P, 690, 200, 56)
    if clouds:
        A.sky_cloud(P, 200, 190, 2.2); A.sky_cloud(P, 480, 280, 1.5)
        fancy_cloud(P, 190, 430, 3.6, 'dots'); fancy_cloud(P, 610, 500, 2.8, 'waves')
    if birds_ and not stars:
        birds(P, ((330, 150, 1.0), (390, 190, 0.8), (560, 170, 0.9)))
    if stars:
        for (x, y, r) in ((140, 200, 22), (700, 180, 20), (330, 130, 14), (600, 330, 16), (200, 360, 14)):
            A.star(P, x, y, r, '#fff', 'shape')


def leafy_tree(P, x, y, s):
    A.tree(P, x, y, s)


def swirl(P, cx, cy, r0, r1, turns=2.5, w=1.0):
    pts = []
    n = 120
    for i in range(n + 1):
        t = i / n
        a = t * turns * 2 * math.pi
        r = r0 + (r1 - r0) * t
        pts.append('%s %s' % (f(cx + math.cos(a) * r), f(cy + math.sin(a) * r)))
    P_line(P, 'M' + ' L'.join(pts))


def P_line(P, d, kind='line'):
    P.line(d, '#111', kind=kind)


def bubble_speech(P, x, y, w, h, tail=(0, 0)):
    d = 'M%s %s h%s a24 24 0 0 1 24 24 v%s a24 24 0 0 1 -24 24 h%s l%s %s l%s -%s h-%s a24 24 0 0 1 -24 -24 v-%s a24 24 0 0 1 24 -24Z' % (
        x + 24, y, w - 48, h - 48, -(w - 48 - 40), -10, tail[1] if tail else 30, 14, tail[1] if tail else 30, 40, h - 48)
    P.raw('<path d="%s" fill="#fff" stroke="#111" stroke-width="%s" stroke-linejoin="round"/>' % (d, P.sw))


def label(P, x, y, text, size=24):
    wd = max(80, len(text) * size * 0.58 + 28)
    P.raw('<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="#fff" stroke="#111" stroke-width="%s"/>' % (f(x - wd / 2), f(y - size * 0.95), f(wd), f(size * 1.55), f(size * 0.6), P.sw * 0.8))
    P.raw('<text x="%s" y="%s" text-anchor="middle" font-family="Andika, sans-serif" font-weight="700" font-size="%s" fill="#111">%s</text>' % (f(x), f(y + 3), size, text))


# ------------------------------------------------------------------ the 32 scenes
def s01(P):
    frame(P, 'stars'); sky(P, sun=False, stars=True)
    hills(P, 720, (('waves', 0), ('stripes', 70)))
    A.moon(P, 425, 300, 3.2, 'calm', glow=False)
    for i, r in enumerate((150, 190, 230)):
        P.raw('<path d="M%s 330 A%s %s 0 0 1 %s 330" fill="none" stroke="#111" stroke-width="%s" stroke-dasharray="3 12" stroke-linecap="round"/>' % (425 - r, r, r * 0.8, 425 + r, P.sw))
    A.sugarfoot_front(P, 425, 820, 6.2, 'calm', 'smile')
    label(P, 190, 440, 'in', 28); label(P, 660, 440, 'out', 28)


def s02(P):
    frame(P, 'flowers')
    hills(P, 760, (('dots', 0), ('stripes', 70)))
    A.mandala_flower(P, 425, 400, 190, 3, 10)
    A.tidbit_front(P, 300, 880, 5.4, 'calm', 'blow')
    A.candle(P, 600, 860, 5.6, lean=1.0)
    A.flower(P, 700, 760, 5.0, '#fff', '#fff', 6, stem=True)
    for (x, y, r) in ((500, 640, 14), (540, 590, 20), (600, 540, 26)):
        P.circ(x, y, r, '#fff')


def s03(P):
    frame(P, 'leaves'); sky(P, clouds=True)
    hills(P, 900, (('stripes', 0),), step=20)
    A.tree(P, 190, 880, 3.4)
    pattern(P, 'M90 560 A110 110 0 0 1 310 560 Z', 'scales', 90, 440, 310, 560, 22) if False else None
    A.tidbit_front(P, 520, 880, 5.8, 'sleep', 'smile')
    # a big clock with the minute hand
    P.circ(640, 330, 90, '#fff'); P.circ(640, 330, 6, '#111', kind='dark')
    for i in range(12):
        a = math.radians(i * 30)
        P.line('M%s %s L%s %s' % (f(640 + math.cos(a) * 72), f(330 + math.sin(a) * 72), f(640 + math.cos(a) * 82), f(330 + math.sin(a) * 82)), '#111')
    P.line('M640 330 L640 270', '#111'); P.line('M640 330 L690 345', '#111')


def s04(P):
    frame(P, 'clouds'); sky(P)
    hills(P, 620, (('waves', 0), ('dots', 110), ('stripes', 220)))
    A.speed_lines(P, 215, 770, 3, 70, 24, 1.6)
    A.pup_side(P, 'tidbit', 330, 800, 4.4, 'run', 'happy', ph=0.9, wag=0.3)
    A.pup_side(P, 'sugarfoot', 640, 915, 4.4, 'walk', 'happy', ph=0.3, flip=True)
    for (x, y) in ((150, 900), (740, 790)):
        A.flower(P, x, y, 2.4, '#fff', '#fff', 6, stem=True)


def s05(P):
    frame(P, 'hearts'); sky(P, sun=False, clouds=False)
    hills(P, 920, (('dots', 0),), step=20)
    A.puddles(P, 330, 880, 7.8, 'happy', mouth_='open')
    bubble_speech(P, 440, 250, 290, 190, (0, 40))
    A.heart(P, 585, 300, 2.4);
    label(P, 585, 420, 'I need...', 24) if False else None
    for (x, y, s) in ((200, 330, 2.0), (700, 560, 1.8), (110, 560, 1.6)):
        A.heart(P, x, y, s * 1.0)


def s06(P):
    frame(P, 'waves')
    hills(P, 760, (('waves', 0),), step=22)
    A.sun(P, 190, 230, 70)
    for i, r in enumerate((230, 260, 290)):
        P.raw('<path d="M%s 560 A%s %s 0 0 1 %s 560" fill="none" stroke="#111" stroke-width="%s"/>' % (425 + 90 - r, r, r, 425 + 90 + r, P.sw))
    A.sky_cloud(P, 560, 330, 3.4)
    for x in range(480, 680, 38):
        P.line('M%s 400 l-8 36' % x, '#111', kind='fine')
    A.puddles(P, 250, 880, 5.2, 'happy')
    A.puddle(P, 250, 900, 200, 16); A.puddle(P, 640, 905, 130, 14)


def s07(P):
    frame(P, 'flowers'); sky(P)
    hills(P, 600, (('stripes', 0),), step=22)
    A.blanket(P, 425, 900, 640, 160, 1.0, '#111')
    A.basket(P, 425, 820, 6.2, full=True)
    A.beep(P, 160, 880, 4.4); A.hopper(P, 270, 880, 5.0, expr='happy'); A.nutmeg(P, 590, 880, 4.4); A.ducklings(P, 700, 880, 2.0)
    A.lumi(P, 160, 560, 2.6) if False else None


def s08(P):
    frame(P, 'leaves'); sky(P, clouds=True)
    hills(P, 760, (('dots', 0),), step=22)
    A.tree(P, 200, 860, 3.6)
    A.pup_side(P, 'sugarfoot', 330, 880, 5.0, 'lie', 'sad', mouth_='flat')
    P.raw('<ellipse cx="400" cy="860" rx="260" ry="60" fill="none" stroke="#111" stroke-width="%s" stroke-dasharray="3 14" stroke-linecap="round"/>' % P.sw)
    A.tidbit_front(P, 700, 900, 3.8, 'calm', 'smile')
    A.heart(P, 640, 640, 1.5)


def s09(P):
    frame(P, 'hearts'); sky(P, clouds=True)
    hills(P, 920, (('stripes', 0),), step=22)
    A.tidbit_front(P, 300, 900, 6.0, 'sad', 'frown')
    A.blanket(P, 590, 900, 380, 110, 1.0, '#111')
    A.basket(P, 590, 830, 3.6, full=False)
    for (x, y, s) in ((470, 700, 3.4), (560, 640, 3.4), (690, 700, 3.4), (210, 650, 3.0), (400, 560, 3.0)):
        A.apple(P, x, y, s)
    A.pie(P, 700, 560, 4.0, rot=20)


def s10(P):
    frame(P, 'stars'); sky(P, sun=False, stars=True)
    hills(P, 800, (('waves', 0),), step=22)
    A.moon(P, 640, 290, 2.4, 'calm', glow=False)
    A.sun(P, 210, 290, 70)
    P.circ(425, 600, 130, '#fff'); P.circ(425, 600, 8, '#111', kind='dark')
    for i in range(12):
        a = math.radians(i * 30)
        P.line('M%s %s L%s %s' % (f(425 + math.cos(a) * 106), f(600 + math.sin(a) * 106), f(425 + math.cos(a) * 122), f(600 + math.sin(a) * 122)), '#111')
    P.line('M425 600 L425 510', '#111'); P.line('M425 600 L490 640', '#111')
    A.ollie(P, 640, 870, 4.8, branch=True)


def s11(P):
    frame(P, 'dots'); sky(P, sun=False, clouds=False)
    A.tidbit_front(P, 425, 900, 8.4, 'surprised', 'o')
    P.raw('<g stroke="#111" stroke-width="%s" stroke-linecap="round" fill="none"><path d="M280 520 Q220 520 180 560"/><path d="M570 700 Q640 700 670 650"/><path d="M360 800 Q260 820 200 860"/></g>' % P.sw)
    label(P, 140, 600, 'hot ears', 24); label(P, 710, 660, 'tight tummy', 24); label(P, 150, 890, 'buzzy paws', 24)
    A.fizz_marks(P, 425, 460, 190, 14, 1.0, '#111')


def s12(P):
    frame(P, 'clouds'); sky(P, clouds=False, sun=False)
    A.static_cloud(P, 'grumble', 425, 520, 24, 'grumpy', fizz=True)
    clip = 'M220 380 Q420 280 640 380 L640 460 L220 460Z'
    for (x, y, s) in ((130, 250, 1.8), (720, 220, 1.5), (700, 880, 2.2), (160, 860, 2.0)):
        A.sky_cloud(P, x, y, s)


def s13(P):
    frame(P, 'stars'); sky(P, sun=False, clouds=False)
    A.static_cloud(P, 'grumble', 250, 400, 9, 'grumpy', fizz=True)
    A.static_cloud(P, 'fuzz', 600, 380, 8, None, fizz=True)
    A.static_cloud(P, 'mumble', 270, 760, 8, 'shy', fizz=False)
    A.static_cloud(P, 'drift', 600, 760, 8, 'drifty', fizz=False)
    A.heart(P, 425, 560, 2.8)
    for (x, y, s) in ((425, 400, 1.8), (425, 760, 1.8), (110, 580, 1.4), (740, 580, 1.4)):
        A.sparkle(P, x, y, s)


def s14(P):
    frame(P, 'leaves'); sky(P, clouds=True)
    hills(P, 700, (('stripes', 0), ('dots', 100)))
    A.hopper(P, 300, 880, 9.0, expr='happy')
    A.dot_snail(P, 640, 880, 6.0, expr='happy')
    P.at(640, 760, 1.0); P.ell(0, -40, 60, 26, '#fff'); P.line('M-60 -40 q60 -50 120 0', '#111'); P.close()
    A.grass(P, 110, 920, 3.0); A.grass(P, 740, 920, 3.0)


def s15(P):
    frame(P, 'hearts'); sky(P)
    hills(P, 560, (('waves', 0),), step=22)
    P.path('M120 800 L730 740 L735 765 L125 825Z', '#fff')
    P.path('M425 780 L360 920 L490 920Z', '#fff')
    A.pup_side(P, 'tidbit', 190, 765, 4.0, 'sit', 'happy')
    A.pup_side(P, 'sugarfoot', 660, 735, 4.0, 'sit', 'happy', flip=True)
    A.heart(P, 425, 450, 2.6)


def s16(P):
    frame(P, 'dots'); sky(P, clouds=True)
    A.peach_lilac(P, 425, 700, 6.2)
    pattern(P, 'M120 940 Q425 800 730 940 L730 960 L120 960Z', 'dots', 120, 800, 730, 960, 24)
    for (x, y, s) in ((160, 330, 2.8), (700, 310, 2.4), (430, 250, 2.0)):
        A.sparkle(P, x, y, s)
    A.mandala_flower(P, 160, 880, 60, 2, 8); A.mandala_flower(P, 690, 880, 60, 2, 8)


def s17(P):
    frame(P, 'waves')
    hills(P, 600, (('stripes', 0), ('dots', 80), ('waves', 160)))
    A.sun(P, 425, 560, 120)
    for i in range(14):
        a = math.radians(i * 360 / 14)
        P.line('M%s %s L%s %s' % (f(425 + math.cos(a) * 150), f(560 + math.sin(a) * 150), f(425 + math.cos(a) * 200), f(560 + math.sin(a) * 200)), '#111')
    A.tidbit_front(P, 250, 900, 4.6, 'happy', 'w')
    A.sugarfoot_front(P, 600, 900, 4.6, 'happy', 'smile')


def s18(P):
    frame(P, 'flowers'); sky(P)
    hills(P, 900, (('dots', 0),), step=20)
    A.nutmeg(P, 230, 880, 8.2); A.lumi(P, 600, 880, 5.2, lantern=False)
    bubble_speech(P, 130, 210, 220, 130, (0, 30)); A.heart(P, 240, 275, 1.3)
    bubble_speech(P, 520, 250, 220, 130, (0, 30)); A.sparkle(P, 630, 315, 2.4)


def s19(P):
    frame(P, 'leaves'); sky(P, clouds=True)
    P.path('M70 860 Q425 640 780 860 L780 940 L70 940Z', '#fff')
    pattern(P, 'M70 860 Q425 640 780 860 L780 940 L70 940Z', 'stripes', 70, 700, 780, 940, 24)
    A.dot_snail(P, 425, 800, 12.0, expr='happy')
    A.mandala_flower(P, 560, 590, 40, 2, 8) if False else None
    A.flower(P, 120, 900, 3.4, '#fff', '#fff', 6, stem=True); A.flower(P, 730, 900, 3.4, '#fff', '#fff', 6, stem=True)


def s20(P):
    frame(P, 'stars'); sky(P, sun=False, stars=True)
    hills(P, 900, (('waves', 0),), step=22)
    A.moon(P, 640, 290, 2.6, 'calm', glow=False)
    A.sugarfoot_front(P, 300, 900, 5.4, 'calm', 'smile')
    A.static_cloud(P, 'mumble', 620, 820, 8.0, 'shy', fizz=False)
    A.heart(P, 460, 640, 1.8)


def s21(P):
    frame(P, 'clouds'); sky(P)
    hills(P, 800, (('dots', 0), ('stripes', 70)), step=22)
    A.ollie(P, 270, 700, 7.0, branch=False, expr='happy')
    P.path('M450 340 L720 250 L560 420 L540 360 L450 340Z', '#fff')
    P.line('M540 360 L720 250', '#111', kind='fine')
    P.line('M300 400 q40 -60 100 -40 M360 470 q60 -40 120 -10', '#111', kind='fine')


def s22(P):
    frame(P, 'flowers'); sky(P, clouds=True)
    A.blanket(P, 425, 860, 660, 220, 1.0, '#111')
    A.pie(P, 250, 840, 5.0); A.cheese(P, 360, 860, 5.0); A.cupcake(P, 470, 840, 5.0); A.jar(P, 560, 830, 5.0); A.cup(P, 640, 860, 5.0)
    A.apple(P, 200, 920, 4.0); A.apple(P, 690, 920, 4.0)
    A.tidbit_front(P, 425, 700, 4.0, 'happy', 'w') if False else None
    A.sugarfoot_front(P, 425, 720, 4.6, 'happy', 'smile')


def s23(P):
    frame(P, 'dots'); sky(P, sun=False, clouds=False)
    P.raw('<g stroke="#111" stroke-width="%s" fill="#fff" stroke-linecap="round"><rect x="230" y="130" width="22" height="800" rx="8"/><rect x="598" y="130" width="22" height="800" rx="8"/></g>' % (P.sw * 1.2))
    for y in (250, 520, 790):
        P.raw('<rect x="230" y="%s" width="390" height="18" rx="8" fill="#fff" stroke="#111" stroke-width="%s"/>' % (y, P.sw * 1.2))
    A.sugarfoot_front(P, 425, 250, 2.4, 'calm', 'smile'); A.tidbit_front(P, 425, 520, 2.4, 'cross', 'yell'); A.pup_side(P, 'sugarfoot', 425, 790, 2.2, 'lie', 'sad', mouth_='flat')
    label(P, 130, 220, 'calm', 24); label(P, 130, 490, 'revved up', 24); label(P, 130, 760, 'running on empty', 22) if False else label(P, 140, 760, 'empty', 24)


def s24(P):
    frame(P, 'waves')
    hills(P, 900, (('waves', 0),), step=22)
    A.sky_cloud(P, 425, 300, 6.0)
    P.path('M455 380 L395 480 L430 480 L385 570 L480 450 L445 450 L490 380Z', '#fff')
    A.static_cloud(P, 'grumble', 190, 440, 3.6, 'happy', fizz=False); A.static_cloud(P, 'fuzz', 660, 440, 3.6, 'happy', fizz=False)
    A.puddles(P, 425, 880, 5.0, 'happy')
    P.raw('<path d="M340 640 Q425 560 510 640Z" fill="#fff" stroke="#111" stroke-width="%s"/><path d="M425 640 V760" stroke="#111" stroke-width="%s"/>' % (P.sw, P.sw))


def s25(P):
    frame(P, 'hearts')
    A.sugarfoot_front(P, 425, 900, 9.0, 'happy', 'smile')
    for r in (60, 100, 140):
        P.raw('<path d="M100 %s a%s %s 0 0 0 0 %s" fill="none" stroke="#111" stroke-width="%s" stroke-linecap="round"/>' % (500 - r * 0.5, r, r, r, P.sw))
        P.raw('<path d="M750 %s a%s %s 0 0 1 0 %s" fill="none" stroke="#111" stroke-width="%s" stroke-linecap="round"/>' % (500 - r * 0.5, r, r, r, P.sw))


def s26(P):
    frame(P, 'hearts')
    A.mandala_flower(P, 425, 500, 250, 3, 12) if False else None
    A.peach_lilac(P, 425, 760, 6.6)
    A.heart(P, 425, 250, 4.2)
    for (x, y, s) in ((140, 430, 2.4), (710, 430, 2.4), (200, 850, 2.0), (650, 850, 2.0)):
        A.sparkle(P, x, y, s)
    A.mandala_flower(P, 150, 640, 70, 2, 8); A.mandala_flower(P, 700, 640, 70, 2, 8)


def s27(P):
    frame(P, 'leaves'); sky(P, clouds=True)
    hills(P, 640, (('dots', 0), ('stripes', 90)))
    A.static_cloud(P, 'drift', 425, 520, 7.0, 'drifty', fizz=False)
    P.raw('<g stroke="#111" stroke-width="%s" fill="#fff" stroke-linejoin="round"><rect x="418" y="650" width="14" height="260" rx="4"/><path d="M200 700 H400 L430 735 L400 770 H200Z"/><path d="M650 790 H450 L420 825 L450 860 H650Z"/></g>' % P.sw)
    A.sparkle(P, 130, 300, 2.0)


def s28(P):
    frame(P, 'flowers'); sky(P)
    hills(P, 900, (('dots', 0),), step=20)
    A.tidbit_front(P, 260, 900, 6.2, 'happy', 'w')
    A.beep(P, 610, 900, 5.8, arm_up=True)
    A.flower(P, 450, 700, 4.4, '#fff', '#fff', 6, stem=True)
    A.heart(P, 425, 300, 2.2)


def s29(P):
    frame(P, 'stars'); sky(P, sun=False, stars=True)
    hills(P, 900, (('waves', 0),), step=22)
    A.moon(P, 425, 300, 3.6, 'calm', glow=False)
    A.pup_side(P, 'tidbit', 250, 890, 4.6, 'sleep', 'sleep')
    A.pup_side(P, 'sugarfoot', 610, 890, 4.4, 'lie', 'sleep', flip=True, mouth_='smile')
    for (x, y, s, w) in ((150, 560, 2.2, 'drift'), (330, 520, 1.6, 'mumble'), (560, 540, 1.8, 'fuzz'), (700, 470, 1.4, 'grumble')):
        A.static_cloud(P, w, x, y, s, 'happy', fizz=False)


def s30(P):
    frame(P, 'stars')
    hills(P, 760, (('waves', 0), ('stripes', 70)))
    pts = [(160, 300), (300, 220), (440, 300), (330, 400), (480, 470), (620, 380), (700, 260)]
    P.raw('<path d="M%s" fill="none" stroke="#111" stroke-width="%s" stroke-dasharray="2 12" stroke-linecap="round"/>' % (' L'.join('%s %s' % p for p in pts), P.sw))
    for (x, y) in pts:
        A.star(P, x, y, 26, '#fff', 'shape')
    for (x, y) in ((200, 560), (560, 600), (400, 640), (700, 560)):
        A.firefly(P, x, y, 3.4)
    A.moon(P, 150, 560, 1.6, 'calm', glow=False)
    A.pup_side(P, 'tidbit', 300, 860, 4.2, 'sit', 'happy')
    A.pup_side(P, 'sugarfoot', 560, 870, 4.2, 'sit', 'happy', flip=True)


def s31(P):
    frame(P, 'hearts')
    A.heart(P, 425, 480, 4.2)
    cast = [(lambda x, y: A.tidbit_front(P, x, y, 2.4, 'happy', 'w')), (lambda x, y: A.sugarfoot_front(P, x, y, 2.4, 'happy', 'smile')),
            (lambda x, y: A.puddles(P, x, y, 2.0, 'happy')), (lambda x, y: A.hopper(P, x, y, 3.0, expr='happy')),
            (lambda x, y: A.nutmeg(P, x, y, 2.6)), (lambda x, y: A.beep(P, x, y, 2.2)), (lambda x, y: A.lumi(P, x, y, 1.6)),
            (lambda x, y: A.ollie(P, x, y, 2.2, branch=False)), (lambda x, y: A.dot_snail(P, x, y, 3.2, expr='happy'))]
    for i, fn in enumerate(cast):
        a = -math.pi / 2 + i * 2 * math.pi / len(cast)
        fn(425 + math.cos(a) * 300, 560 + math.sin(a) * 330 + 70)


def s32(P):
    frame(P, 'flowers')
    A.mandala_flower(P, 425, 470, 270, 4, 12)
    A.tidbit_front(P, 270, 940, 4.2, 'happy', 'w'); A.sugarfoot_front(P, 580, 940, 4.2, 'happy', 'smile')
    A.heart(P, 425, 900, 1.6)


OLDER = [
    ('Breathe', s01, 'Breathe in slowly. Breathe out longer.'),
    ('The flower and the candle', s02, 'Smell the flower. Blow the candle.'),
    ('A minute', s03, 'It is okay to need a minute.'),
    ('Fast and slow', s04, 'Fast and slow can still walk together.'),
    ('Ask plainly', s05, 'Say what you need, kindly and plainly.'),
    ('Weather', s06, 'Feelings are weather. They pass.'),
    ('The basket', s07, 'One job each makes the basket light.'),
    ('Room, then a hug', s08, 'Room first, then a hug.'),
    ('Sorry', s09, 'You can say sorry and make it right.'),
    ('A time to come back', s10, 'A pause is better with a time to come back.'),
    ('Notice your body', s11, 'Notice your body. What is it telling you?'),
    ('Big feelings', s12, 'Big feelings are allowed.'),
    ('Static', s13, 'Static is just loud feelings looking for a friend.'),
    ('Ask first', s14, 'Ask first. Then help.'),
    ('Turns', s15, 'Take turns. Then take another.'),
    ('Different', s16, 'Different is okay.'),
    ('Again', s17, 'You can start again.'),
    ('Kind words', s18, 'Kind words are free.'),
    ('Slow', s19, 'Slow is a speed too.'),
    ('Company', s20, 'Your calm can keep someone company.'),
    ('Landing', s21, 'Say it so it lands.'),
    ('Snack', s22, 'Hungry, tired and loud? Snack and rest first.'),
    ('The ladder', s23, 'Everyone has a rung on the ladder today.'),
    ('The storm', s24, 'Let the storm pass.'),
    ('Listen', s25, 'Listen with your whole face.'),
    ('One heart', s26, 'Two hearts can share one.'),
    ('Two paths', s27, 'It is okay to change your mind.'),
    ('Thank you', s28, 'Thank someone today.'),
    ('Goodnight, worries', s29, 'Goodnight, worries.'),
    ('Look up', s30, 'Look up. The sky is big.'),
    ('You belong', s31, 'You belong here.'),
    ('Spread love and acceptance', s32, 'Spread love and acceptance.'),
]
