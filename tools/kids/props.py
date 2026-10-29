#!/usr/bin/env python3
"""props.py: scenery and props for the coloring books (kids29). Same conventions as cast.py: x, y is where it stands, s scales it.
Every prop is a few closed, colorable shapes in the bold outline: no loose hairlines."""
import math
from cute import *
from cast import K, eye_happy, eye_open, blush, sparkle4, paw_toes


def cloud_path(w=200, h=90, n=4, seed=0):
    """a puffy flat-bottomed cloud, w wide, h tall, centered at the bottom middle (0, 0)"""
    # bumps along the top: n bumps of varying height
    hs = [0.62, 1.0, 0.82, 0.55, 0.7, 0.5][:n]
    if n == 3:
        hs = [0.6, 1.0, 0.65]
    xs = [-w / 2 + (i + 0.5) * w / n for i in range(n)]
    P = Path().M(-w / 2 + h * 0.18, 0)
    P.C(-w / 2 - h * 0.1, 0, -w / 2 - h * 0.1, -h * 0.5, -w / 2 + h * 0.18, -h * 0.5)
    for i in range(n):
        x0 = (-w / 2 + h * 0.18) if i == 0 else xs[i] - w / (2 * n)
        x1 = xs[i] + w / (2 * n) if i < n - 1 else w / 2 - h * 0.18
        r = h * hs[i]
        P.C(x0, -h * 0.5 - r * 0.45, x1 - 0, -h * 0.5 - r * 0.6, x1, -h * 0.5 - r * 0.1 if i < n - 1 else -h * 0.5)
    P.C(w / 2 + h * 0.1, -h * 0.5, w / 2 + h * 0.1, 0, w / 2 - h * 0.18, 0)
    P.Z()
    return P


def puff(ink, x, y, s=1.0, w=200, h=84, n=4, face=None, flip=False):
    """a friendly sky cloud. face: None, 'happy' or 'sleep'"""
    bl = '#EAF4FF'
    with ink.fig(x, y, s, flip) as g:
        g.part(cloud_path(w, h, n), c=bl)
        if face:
            cx, cy = 0, -h * 0.34
            for sgn in (-1, 1):
                if face == 'sleep':
                    eye_happy(g, cx + sgn * 20, cy, 7, 1.0)
                else:
                    g.blk(ell(cx + sgn * 20, cy, 5, 6.5))
                    g.wh(circ(cx + sgn * 20 - 1.6, cy - 2, 1.8))
                g.part(ell(cx + sgn * 36, cy + 12, 8, 5), c=K['pink'], under=False, w=ink.dw * 0.6)
            g.line(curve([(cx - 7, cy + 11), (cx, cy + 17), (cx + 7, cy + 11)]), w=ink.dw)
    return g


def sun(ink, x, y, r=60, face=False, rays=12, lvl=0, flip=False):
    with ink.fig(x, y, 1.0, flip) as g:
        pts = []
        for i in range(rays * 2):
            a = i * math.pi / rays
            rad = r * (1.55 if i % 2 == 0 else 1.18)
            pts.append((math.cos(a) * rad, math.sin(a) * rad))
        # soft rounded ray tips
        P = rpoly(pts, r * 0.16)
        g.part(P, c='#FFE08A')
        g.part(circ(0, 0, r), c='#FFD060', under=False)
        if face:
            for sgn in (-1, 1):
                eye_happy(g, sgn * r * 0.36, -r * 0.08, r * 0.17)
                g.part(ell(sgn * r * 0.6, r * 0.3, r * 0.15, r * 0.09), c=K['pink'], under=False, w=ink.dw * 0.6)
            g.line(curve([(-r * 0.2, r * 0.3), (0, r * 0.52), (r * 0.2, r * 0.3)]), w=ink.dw)
    return g


def star5(ink, x, y, r=30, rot=0.0, face=False, lvl=0):
    with ink.fig(x, y, 1.0, False, rot) as g:
        g.part(star_path(0, 0, r, r * 0.52, 5, -90, r * 0.16), c='#FFE08A')
        if face:
            for sgn in (-1, 1):
                g.dot(sgn * r * 0.22, -r * 0.05, r * 0.07, r * 0.09)
            g.line(curve([(-r * 0.1, r * 0.14), (0, r * 0.24), (r * 0.1, r * 0.14)]), w=ink.dw * 0.8)
    return g


def sparkle(ink, x, y, r=18, c='#FFE08A'):
    with ink.fig(x, y, 1.0) as g:
        g.part(sparkle4(0, 0, r, 0.3), c=c)
    return g


def heart(ink, x, y, r=30, rot=0.0, c='#F59AB2', face=False):
    with ink.fig(x, y, 1.0, False, rot) as g:
        g.part(heart_path(0, 0, r), c=c)
        g.part(ell(-r * 0.45, -r * 0.35, r * 0.18, r * 0.1, -30), c='#FFFFFF', under=False, w=ink.dw * 0.5) if r > 28 else None
    return g


def tuft(ink, x, y, s=1.0, c='#7DBB6E'):
    """a little tuft of grass: three soft blades"""
    with ink.fig(x, y, s) as g:
        for (lean, h) in ((-16, 28), (0, 40), (16, 30)):
            g.part(blob([(lean * 0.4 - 7, 0, 'c'), (lean * 0.8 - 6, -h * 0.5), (lean, -h, 'c'), (lean * 0.8 + 7, -h * 0.5), (lean * 0.4 + 7, 0, 'c')], k=1.0), c=c)
    return g


def flower(ink, x, y, s=1.0, petals=5, stem=36, c='#F7A8C2', cc='#FFD060', rot=0.0, leaf_=True, lvl=0, face=False):
    """a flower whose head is at (x, y) with a stem down; petals are closed ovals around a middle"""
    with ink.fig(x, y, s, False, rot) as g:
        if stem:
            g.line(curve([(0, 14), (3, stem * 0.5), (0, stem)]), w=ink.ow * 0.85)
            if leaf_:
                lf = g.view(1, stem * 0.55, 1, False, -35)
                lf.part(blob([(0, 0, 'c'), (10, -8), (24, 0, 'c'), (10, 8)], k=1.0), c='#7DBB6E', w=ink.dw * 0.9)
        R = 17
        for i in range(petals):
            a = i * TAU / petals - math.pi / 2
            g.part(ell(math.cos(a) * R, math.sin(a) * R, 11.5, 9, math.degrees(a)), c=c, w=ink.dw * 0.95)
        g.part(circ(0, 0, 11), c=cc, under=True, w=ink.dw * 0.95)
        if face:
            for sgn in (-1, 1):
                g.dot(sgn * 4, -1, 1.6, 2)
            g.line(curve([(-3, 4), (0, 7), (3, 4)]), w=ink.dw * 0.7)
    return g


def hill(ink, pts, bottom=1000, c='#BFE3A0', x0=-40, x1=890, lvl=0):
    """a rolling hill band: the top edge goes through pts (list of (x, y)), the shape closes along the bottom"""
    with ink.fig(0, 0, 1.0) as g:
        P = curve(pts)
        P = Path(P.s + [('L', (pts[-1][0], bottom)), ('L', (pts[0][0], bottom)), ('Z',)])
        g.part(P, c=c)
    return g


def dust(ink, x, y, s=1.0, n=3):
    with ink.fig(x, y, s) as g:
        for i in range(n):
            r = 22 - i * 3.5
            g.part(circ(-i * 38, -i * 4 - r * 0.4, r), c='#F5EEE0')
    return g


def speed_lines(ink, x, y, n=3, length=140, gap=34, wv=0.0):
    with ink.fig(x, y, 1.0, outline=False) as g:
        for i in range(n):
            ly = i * gap
            ln = length - (i % 2) * 36
            g.line(curve([(0, ly), (-ln * 0.5, ly + 3), (-ln, ly)]) if wv else Path().M(0, ly).L(-ln, ly), w=ink.ow * 0.8)
    return g


def raindrop(ink, x, y, s=1.0, c='#BFE0F7'):
    with ink.fig(x, y, s) as g:
        g.part(Path.parse('M0 -22C-3 -12 -12 -6 -12 4c0 8 5 12 12 12s12-4 12-12C12 -6 3 -12 0 -22z'), c=c, w=ink.dw * 0.9)
    return g


def puddle(ink, x, y, rx=120, ry=26, ripples=True, lvl=0):
    with ink.fig(x, y, 1.0) as g:
        g.part(blob([(-rx, 0), (-rx * 0.7, -ry * 0.9), (-rx * 0.2, -ry), (rx * 0.5, -ry * 0.9), (rx, -ry * 0.1), (rx * 0.8, ry * 0.8), (rx * 0.1, ry), (-rx * 0.6, ry * 0.85)]), c='#CFE6FA')
        if ripples:
            g.line(curve([(-rx * 0.5, ry * 0.1), (-rx * 0.3, ry * 0.4), (-rx * 0.1, ry * 0.1)]), w=ink.dw * 0.85)
            g.line(curve([(rx * 0.2, -ry * 0.2), (rx * 0.4, ry * 0.1), (rx * 0.6, -ry * 0.2)]), w=ink.dw * 0.85)
    return g


def pebble(ink, x, y, s=1.0):
    with ink.fig(x, y, s) as g:
        g.part(blob([(-20, 0), (-14, -14), (6, -18), (20, -8), (22, 2), (0, 6)]), c='#D8D2C6', w=ink.dw)
    return g


def zigzag_line(ink, x, y, w, amp=6, n=8, wd=None):
    with ink.fig(x, y, 1.0, outline=False) as g:
        pts = [(i * w / n, (amp if i % 2 else -amp)) for i in range(n + 1)]
        g.line(line_pts(pts), w=wd)
    return g


# ---------------------------------------------------------------- bigger scenery
def rainbow(ink, cx, cy, r=300, bands=3, bw=34, c=('#F2877E', '#F7D56A', '#8FCBF0', '#B79CEB')):
    """a rainbow arch (half rings) whose outer radius is r; centered at (cx, cy) on the ground line"""
    with ink.fig(cx, cy, 1.0) as g:
        for i in range(bands):
            ro = r - i * bw
            ri = ro - bw
            P = Path().M(-ro, 0)
            P.C(-ro, -ro * 0.5523, -ro * 0.5523, -ro, 0, -ro).C(ro * 0.5523, -ro, ro, -ro * 0.5523, ro, 0)
            if i == bands - 1:
                ri = max(ro - bw, 4)
            P.L(ri, 0).C(ri, -ri * 0.5523, ri * 0.5523, -ri, 0, -ri).C(-ri * 0.5523, -ri, -ri, -ri * 0.5523, -ri, 0).Z()
            g.part(P, c=c[i % len(c)])
    return g


def pine(ink, x, y, s=1.0, snow=False):
    with ink.fig(x, y, s) as g:
        g.part(rrect(-10, -34, 20, 36, 4), c='#9B6A3C')
        for (w, ty, by) in ((70, -62, -26), (56, -100, -56), (40, -134, -92)):
            g.part(rpoly([(-w / 2, by), (w / 2, by), (0, ty - 22)], 8), c='#4F9A66')
        if snow:
            g.line(curve([(-20, -70), (-8, -64), (4, -72), (16, -64)]), w=ink.dw * 0.9)
    return g


def tree(ink, x, y, s=1.0, c='#8FCB7C', lobes=9, face=False, apples=0, trunk_w=34):
    """a round cute tree; (x, y) is the base of the trunk"""
    with ink.fig(x, y, s) as g:
        g.part(blob([(-trunk_w / 2, 0, 'c'), (-trunk_w * 0.4, -60), (-trunk_w * 0.5, -120), (trunk_w * 0.5, -120), (trunk_w * 0.4, -60), (trunk_w / 2, 0, 'c')], k=0.8), c='#B07C4D')
        g.line(curve([(-4, -10), (-2, -40), (-6, -70)]), w=ink.dw * 0.8)
        pts = []
        for i in range(lobes * 2):
            a = i * math.pi / lobes - math.pi * 0.5
            r = 84 if i % 2 == 0 else 74
            pts.append((math.cos(a) * r * 1.12, -176 + math.sin(a) * r))
        g.part(blob(pts, k=1.0), c=c)
        if face:
            for sgn in (-1, 1):
                g.dot(sgn * 20, -170, 4.5, 6)
                g.part(ell(sgn * 38, -154, 9, 5.5), c=K['pink'], under=False, w=ink.dw * 0.6)
            g.line(curve([(-8, -152), (0, -144), (8, -152)]), w=ink.dw)
        for i in range(apples):
            ax = (-34 + i * 36) % 80 - 34
            g.part(circ(ax, -150 - (i % 2) * 22, 9), c='#F2877E', under=False, w=ink.dw * 0.9)
    return g


def bush(ink, x, y, s=1.0, c='#8FCB7C', n=3):
    with ink.fig(x, y, s) as g:
        pts = [(-60, 0, 'c')]
        for i in range(n):
            cx = -40 + i * 80 / max(n - 1, 1)
            pts.append((cx - 10, -44 - (i % 2) * 14))
        pts += [(60, 0, 'c')]
        g.part(blob(pts, k=1.0), c=c)
        g.line(curve([(-20, -20), (-10, -28)]), w=ink.dw * 0.8)
        g.line(curve([(14, -24), (24, -16)]), w=ink.dw * 0.8)
    return g


def mushroom(ink, x, y, s=1.0, c='#F2877E', dots=True):
    with ink.fig(x, y, s) as g:
        g.part(blob([(-12, 0, 'c'), (-10, -22), (-12, -36), (12, -36), (10, -22), (12, 0, 'c')], k=0.8), c='#FFF3DF')
        g.part(blob([(-44, -34, 'c'), (-36, -62), (0, -76), (36, -62), (44, -34, 'c'), (0, -26)], k=1.0), c=c)
        if dots:
            for (a, b, r) in ((-18, -52, 6), (10, -62, 7), (22, -44, 5)):
                g.part(circ(a, b, r), c='#FFFFFF', under=False, w=ink.dw * 0.85)
    return g


def rock(ink, x, y, s=1.0):
    with ink.fig(x, y, s) as g:
        g.part(blob([(-40, 0, 'c'), (-36, -24), (-12, -38), (20, -34), (40, -12), (44, 0, 'c')], k=1.0), c='#D8D2C6')
        g.line(curve([(-14, -22), (-4, -26)]), w=ink.dw * 0.8)
    return g


def fence(ink, x0, x1, y, h=70, c='#F3E3C3'):
    with ink.fig(0, 0) as g:
        n = int((x1 - x0) // 52)
        for i in range(n + 1):
            xx = x0 + i * (x1 - x0) / n
            g.part(blob([(xx - 18, y, 'c'), (xx - 18, y - h + 10), (xx, y - h - 8, 'c'), (xx + 18, y - h + 10), (xx + 18, y, 'c')], k=0.5), c=c)
        g.part(rrect(x0 - 12, y - h * 0.68, x1 - x0 + 24, 14, 6), c=c, under=True)
        g.part(rrect(x0 - 12, y - h * 0.26, x1 - x0 + 24, 14, 6), c=c, under=True)
    return g


def bubbles(ink, pts, c='#EAF4FF'):
    """soap bubbles: (x, y, r) each with a shine"""
    for (x, y, r) in pts:
        with ink.fig(x, y, 1.0) as g:
            g.part(circ(0, 0, r), c=c, w=ink.dw)
            g.line(curve([(-r * 0.55, -r * 0.2), (-r * 0.5, -r * 0.5), (-r * 0.2, -r * 0.62)]), w=ink.dw * 0.75)


def balloon(ink, x, y, s=1.0, c='#F2877E', string=120, tilt=0.0, heart_=False):
    with ink.fig(x, y, s, False, tilt) as g:
        g.line(curve([(0, 56), (6, 56 + string * 0.4), (-6, 56 + string * 0.7), (0, 56 + string)]), w=ink.dw * 0.9)
        g.part(blob([(0, -58), (34, -44), (42, -8), (24, 34), (0, 52), (-24, 34), (-42, -8), (-34, -44)], k=1.0), c=c)
        g.part(rpoly([(-7, 56), (7, 56), (0, 48)], 2.5), c=c, under=True, w=ink.dw * 0.9)
        g.line(curve([(-24, -30), (-30, -14), (-26, -2)]), w=ink.dw * 0.75)
    return g


def bunting(ink, pts, n=7, drop=44, c=('#F2877E', '#F7D56A', '#8FCBF0', '#B79CEB', '#8FCB7C')):
    """a string of triangle flags along a curve through pts"""
    path = curve(pts)
    poly = path.flatten(4.0)[0][0]
    # sample n positions along the polyline
    L = [0.0]
    for i in range(1, len(poly)):
        L.append(L[-1] + math.hypot(poly[i][0] - poly[i - 1][0], poly[i][1] - poly[i - 1][1]))
    tot = L[-1]
    with ink.fig(0, 0, 1.0, outline=False) as g:
        g.line(path, w=ink.dw * 0.9)
    for k in range(n):
        t = tot * (k + 0.5) / n
        j = max(1, next((i for i, v in enumerate(L) if v >= t), len(L) - 1))
        (x0, y0), (x1, y1) = poly[j - 1], poly[j]
        w = 22
        ang = math.atan2(y1 - y0, x1 - x0)
        nx, ny = -math.sin(ang), math.cos(ang)
        tx, ty = math.cos(ang), math.sin(ang)
        a = (x1 - tx * w, y1 - ty * w)
        b = (x1 + tx * w, y1 + ty * w)
        tip = (x1 + nx * drop * 0.9 * -1 * -1, y1 + ny * drop)
        with ink.fig(0, 0, 1.0) as g:
            g.part(rpoly([a, b, tip], 5), c=c[k % len(c)])


def gift(ink, x, y, s=1.0, c='#F2877E', w=90, h=70):
    with ink.fig(x, y, s) as g:
        g.part(rrect(-w / 2, -h, w, h, 8), c=c)
        g.part(rrect(-w / 2 - 5, -h - 18, w + 10, 22, 7), c=c, under=True)
        g.part(rrect(-8, -h - 18, 16, h + 18, 3), c='#FFE08A', under=False, w=ink.dw * 0.9)
        g.part(blob([(0, -h - 18, 'c'), (-28, -h - 44), (-30, -h - 22), (0, -h - 18, 'c'), (28, -h - 44), (30, -h - 22)], k=0.8), c='#FFE08A', w=ink.dw * 0.9)
    return g


def party_hat(g, x, y, s=1.0, rot=0.0, c='#F7D56A'):
    v = g.view(x, y, s, False, rot)
    v.part(blob([(-24, 0, 'c'), (0, -62, 'c'), (24, 0, 'c'), (0, 8)], k=0.6), c=c)
    v.part(circ(0, -64, 8), c='#F2877E', under=True, w=g.ink.dw * 0.9)
    for (a, b) in ((-8, -14), (6, -24), (-2, -36)):
        v.part(circ(a, b, 3.2), c='#FFFFFF', under=False, w=g.ink.dw * 0.7)
    return v


def cake(ink, x, y, s=1.0, candles=1, lit=True, w=190):
    with ink.fig(x, y, s) as g:
        g.part(rrect(-w / 2, -64, w, 64, 14), c='#F5C6A0')
        g.part(rrect(-w / 2 + 14, -118, w - 28, 58, 14), c='#FADADD')
        # icing drips
        P = Path().M(-w / 2 + 10, -64)
        n = 6
        for i in range(n):
            xa = -w / 2 + 10 + i * (w - 20) / n
            P.C(xa + 4, -64 + 24 * (1 if i % 2 == 0 else 0.55), xa + (w - 20) / n - 4, -64 + 24 * (1 if i % 2 == 0 else 0.55), xa + (w - 20) / n, -64)
        P.L(w / 2 - 10, -72).L(-w / 2 + 10, -72).Z()
        g.part(P, c='#FFFFFF', under=False, w=ink.dw * 0.9)
        for i in range(3):
            g.part(circ(-w * 0.3 + i * w * 0.3, -34, 7), c='#F2877E', under=False, w=ink.dw * 0.85)
        for i in range(candles):
            cx = (i - (candles - 1) / 2) * 34
            g.part(rrect(cx - 6, -158, 12, 42, 3), c='#8FCBF0')
            if lit:
                g.part(blob([(cx, -194), (cx + 12, -172), (cx, -160), (cx - 12, -172)], k=1.0), c='#FFB347', w=ink.dw * 0.9)
        g.part(ell(0, 4, w * 0.62, 10), c='#FFFFFF', under=True, w=ink.dw * 0.9)
    return g


def cupcake(ink, x, y, s=1.0, c='#FADADD'):
    with ink.fig(x, y, s) as g:
        g.part(blob([(-26, -30, 'c'), (-20, 0, 'c'), (20, 0, 'c'), (26, -30, 'c')], k=0.4), c='#F5C6A0')
        for i in (-12, 0, 12):
            g.line(Path().M(i, -26).L(i * 0.8, -4), w=ink.dw * 0.7)
        g.part(blob([(-32, -30, 'c'), (-30, -52), (-12, -70), (0, -84), (12, -70), (30, -52), (32, -30, 'c')], k=1.0), c=c)
        g.part(circ(0, -88, 7), c='#F2877E', under=True, w=ink.dw * 0.9)
    return g


def apple(ink, x, y, s=1.0, c='#F2877E', bite=False):
    with ink.fig(x, y, s) as g:
        g.part(blob([(0, -22), (18, -26), (30, -10), (26, 14), (10, 28), (0, 24), (-10, 28), (-26, 14), (-30, -10), (-18, -26)], k=1.0), c=c)
        g.line(curve([(0, -22), (2, -34), (8, -40)]), w=ink.dw * 1.1)
        leaf(g, 4, -30, 24, -30)
        g.line(curve([(-18, -8), (-20, 4)]), w=ink.dw * 0.7)
    return g


def leaf(g, x, y, ln=34, ang=-40, c='#7DBB6E'):
    v = g.view(x, y, 1, False, ang)
    v.part(blob([(0, 0, 'c'), (ln * 0.35, -ln * 0.28), (ln, 0, 'c'), (ln * 0.35, ln * 0.28)], k=1.0), c=c, w=g.ink.dw * 0.9)
    v.line(Path().M(2, 0).L(ln * 0.8, 0), w=g.ink.dw * 0.7)
    return v


def carrot(ink, x, y, s=1.0, rot=0.0):
    with ink.fig(x, y, s, False, rot) as g:
        g.part(blob([(-16, -50, 'c'), (16, -50, 'c'), (10, -10), (0, 28, 'c'), (-10, -10)], k=0.9), c='#F5A85C')
        for yy in (-38, -22, -8):
            g.line(Path().M(-8, yy).L(-1, yy + 2), w=ink.dw * 0.7)
        for (a, ang) in ((-22, -20), (0, 0), (22, 20)):
            lf = g.view(a * 0.4, -50, 1, False, ang)
            lf.part(blob([(0, 0, 'c'), (-8, -18), (0, -40, 'c'), (8, -18)], k=1.0), c='#7DBB6E', w=ink.dw * 0.9)
    return g


def watering_can(ink, x, y, s=1.0):
    with ink.fig(x, y, s) as g:
        g.part(capsule(36, -40, 72, -74, 6, 5), c='#8FCBF0')
        g.part(rrect(-40, -64, 80, 64, 14), c='#8FCBF0')
        g.part(blob([(40, -50, 'c'), (84, -66), (84, -56), (40, -26, 'c')], k=0.6), c='#8FCBF0') if False else None
        g.part(Path().M(-40, -50).C(-76, -60, -76, -20, -40, -22), c='#8FCBF0', w=ink.dw)
        g.line(Path().M(-40, -50).C(-76, -60, -76, -20, -40, -22), w=ink.iw)
        g.part(ell(72, -76, 14, 5, -35), c='#8FCBF0', under=True)
        g.line(Path().M(-20, -40).L(20, -40), w=ink.dw * 0.8)
    return g


def pumpkin(ink, x, y, s=1.0):
    with ink.fig(x, y, s) as g:
        for sgn, w in ((-1, 26), (1, 26), (-1, 14), (1, 14)):
            pass
        g.part(blob([(0, -44), (34, -40), (52, -16), (46, 14), (20, 30), (0, 32), (-20, 30), (-46, 14), (-52, -16), (-34, -40)], k=1.0), c='#F5A85C')
        g.line(curve([(-16, -42), (-30, -14), (-16, 28)]), w=ink.dw * 0.85)
        g.line(curve([(16, -42), (30, -14), (16, 28)]), w=ink.dw * 0.85)
        g.part(rrect(-5, -60, 10, 20, 3), c='#7DBB6E', under=True)
    return g


def snowflake(ink, x, y, r=20, rot=0.0):
    with ink.fig(x, y, 1.0, False, rot, outline=False) as g:
        for i in range(6):
            a = i * math.pi / 3
            ca, sa = math.cos(a), math.sin(a)
            g.line(Path().M(0, 0).L(ca * r, sa * r), w=ink.dw * 0.9)
            bx, by = ca * r * 0.6, sa * r * 0.6
            for sg in (-1, 1):
                a2 = a + sg * 0.7
                g.line(Path().M(bx, by).L(bx + math.cos(a2) * r * 0.35, by + math.sin(a2) * r * 0.35), w=ink.dw * 0.8)
    return g


def snowman(ink, x, y, s=1.0, hat=True, scarf=True):
    with ink.fig(x, y, s) as g:
        g.part(circ(0, -52, 56), c='#FFFFFF')
        g.part(circ(0, -134, 42), c='#FFFFFF')
        for sgn in (-1, 1):
            g.line(curve([(sgn * 44, -76), (sgn * 84, -100), (sgn * 100, -124)]), w=ink.ow * 0.8)
        if scarf:
            g.part(blob([(-38, -108, 'c'), (0, -96), (38, -108, 'c'), (40, -92, 'c'), (0, -80), (-40, -92, 'c')], k=1.0), c='#F2877E')
            g.part(rrect(14, -96, 22, 48, 8), c='#F2877E')
            g.line(Path().M(20, -80).L(30, -80), w=ink.dw * 0.7)
        for sgn in (-1, 1):
            g.dot(sgn * 14, -142, 4.2)
        g.part(rpoly([(0, -132), (30, -126), (0, -120)], 3), c='#F5A85C', w=ink.dw * 0.9)
        for i in range(5):
            a = math.radians(30 + i * 30)
            g.dot(math.cos(a) * 18, -126 + math.sin(a) * 12 + 6 - 6, 2.2) if False else None
        g.line(curve([(-12, -124), (-6, -118), (0, -118)]), w=ink.dw * 0.01) if False else None
        for (a, b) in ((0, -62), (0, -42), (0, -22)):
            g.dot(a, b, 4.4)
        if hat:
            g.part(rrect(-30, -190, 60, 52, 6), c='#4A4266')
            g.part(ell(0, -140, 48, 10), c='#4A4266')
            g.line(Path().M(-30, -156).L(30, -156), w=ink.dw)
    return g
