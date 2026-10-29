#!/usr/bin/env python3
"""props2.py: more props for the coloring books (kids29): kite, rocket, planets, drum, bed, tub, tea set, tent, bugs and more."""
import math
import random
from cute import *
from cast import K, eye_happy, eye_open, blush, sparkle4, paw_toes
import props as pr


def sprinkles(ink, seed, n, box, avoid=(), kinds=('sparkle', 'star', 'heart', 'dot'), size=(10, 20), minsep=46):
    """scatter little stars, hearts, sparkles and dots in box = (x0, y0, x1, y1), keeping out of the avoid rectangles"""
    rnd = random.Random(seed)
    placed = []
    tries = 0
    while len(placed) < n and tries < 400:
        tries += 1
        x = rnd.uniform(box[0], box[2])
        y = rnd.uniform(box[1], box[3])
        r = rnd.uniform(*size)
        if any(a[0] - r <= x <= a[2] + r and a[1] - r <= y <= a[3] + r for a in avoid):
            continue
        if any(math.hypot(x - p[0], y - p[1]) < minsep + (r + p[2]) * 0.5 for p in placed):
            continue
        placed.append((x, y, r))
        k = rnd.choice(kinds)
        if k == 'sparkle':
            pr.sparkle(ink, x, y, r * 1.1)
        elif k == 'star':
            pr.star5(ink, x, y, r, rnd.uniform(-20, 20))
        elif k == 'heart':
            pr.heart(ink, x, y, r * 0.9, rnd.uniform(-20, 20))
        else:
            with ink.fig(x, y) as g:
                g.part(circ(0, 0, r * 0.38), c='#FFFFFF', w=ink.dw)
    return placed


def kite(ink, x, y, s=1.0, rot=0.0, tail=5, face=False):
    """a diamond kite with a face and a tail of bows; (x, y) is its middle"""
    with ink.fig(x, y, s, False, rot) as g:
        # the tail first
        pts = [(0, 92), (-24, 140), (16, 186), (-18, 232), (14, 278), (-14, 322)]
        g.line(curve(pts), w=ink.dw * 1.0)
        for i in range(tail):
            bx, by = pts[i + 1]
            g.part(blob([(bx, by, 'c'), (bx - 20, by - 12), (bx - 20, by + 12), (bx, by, 'c'), (bx + 20, by - 12), (bx + 20, by + 12)], k=0.5), c=('#F2877E', '#F7D56A', '#8FCBF0', '#B79CEB', '#8FCB7C')[i % 5], w=ink.dw * 0.9)
        g.part(rpoly([(0, -100), (70, -8), (0, 92), (-70, -8)], 10), c='#8FCBF0')
        g.part(rpoly([(0, -100), (70, -8), (0, -6)], 6), c='#F7D56A', under=False, w=ink.dw * 0.9)
        g.part(rpoly([(0, -100), (-70, -8), (0, -6)], 6), c='#F2877E', under=False, w=ink.dw * 0.9)
        g.line(Path().M(0, -100).L(0, 92), w=ink.dw * 0.8)
        g.line(Path().M(-70, -8).L(70, -8), w=ink.dw * 0.8)
        if face:
            for sgn in (-1, 1):
                g.dot(sgn * 16, 22, 4.4, 5.6)
                g.wh(circ(sgn * 16 - 1.4, 20, 1.5))
                g.part(ell(sgn * 30, 38, 8, 4.5), c=K['pink'], under=False, w=ink.dw * 0.6)
            g.line(curve([(-8, 40), (0, 48), (8, 40)]), w=ink.dw * 0.95)
    return g


def rocket(ink, x, y, s=1.0, flame=True, window=True, tilt=0.0):
    """a rocket pointing up; (x, y) is the middle of the body; 120 wide and 300 tall at s = 1"""
    with ink.fig(x, y, s, False, tilt) as g:
        if flame:
            g.part(blob([(-26, 130, 'c'), (-34, 170), (-8, 200), (0, 230, 'c'), (8, 200), (34, 170), (26, 130, 'c')], k=1.0), c='#F7A84C')
            g.part(blob([(-12, 130, 'c'), (-14, 160), (0, 184, 'c'), (14, 160), (12, 130, 'c')], k=1.0), c='#FFE08A', under=False, w=ink.dw * 0.9)
        for sgn in (-1, 1):
            g.part(blob([(sgn * 40, 34, 'c'), (sgn * 82, 100), (sgn * 84, 150, 'c'), (sgn * 44, 128)], k=0.8), c='#F2877E')
        g.part(blob([(0, -150, 'c'), (36, -102), (52, -20), (50, 60), (40, 136, 'c'), (-40, 136, 'c'), (-50, 60), (-52, -20), (-36, -102)], k=1.0), c='#F4F0EA')
        g.part(blob([(0, -150, 'c'), (36, -102), (44, -70), (-44, -70), (-36, -102)], k=0.8), c='#F2877E', under=False, w=ink.dw * 0.9)
        g.part(rrect(-44, 96, 88, 18, 6), c='#F2877E', under=False, w=ink.dw * 0.9)
        if window:
            g.part(circ(0, -10, 32), c='#8FCBF0', under=False, w=ink.dw * 1.1)
            g.part(circ(0, -10, 24), c='#FFFFFF', under=False, w=ink.dw * 0.8)
        for (a, b) in ((-22, 60), (22, 60)):
            g.part(circ(a, b, 6), c='#F7D56A', under=False, w=ink.dw * 0.85)
    return g


def planet(ink, x, y, r=60, ring=True, c='#F7D56A', rot=-18, dots=True):
    with ink.fig(x, y, 1.0, False, rot) as g:
        if ring:
            g.part(ell(0, 0, r * 1.85, r * 0.5), c='#F2877E')
        g.part(circ(0, 0, r), c=c)
        if ring:
            # the front half of the ring
            P = Path().M(-r * 1.8, 0.0)
            P.C(-r * 1.8, r * 0.3, -r * 1.0, r * 0.5, 0, r * 0.5).C(r * 1.0, r * 0.5, r * 1.8, r * 0.3, r * 1.85, 0).L(r * 1.55, -2)
            P.C(r * 1.3, r * 0.3, r * 0.6, r * 0.4, 0, r * 0.4).C(-r * 0.6, r * 0.4, -r * 1.3, r * 0.3, -r * 1.55, -2).Z()
            g.part(P, c='#F2877E', under=False, w=ink.dw * 0.9)
        if dots:
            for (a, b, rr) in ((-r * 0.3, -r * 0.35, r * 0.15), (r * 0.35, -r * 0.1, r * 0.1), (-r * 0.05, r * 0.2, r * 0.08)):
                g.part(circ(a, b, rr), c='#FFFFFF', under=False, w=ink.dw * 0.8)
    return g


def crescent(ink, x, y, r=60, rot=0.0, face=False):
    with ink.fig(x, y, 1.0, False, rot) as g:
        P = Path().M(0, -r)
        P.C(-r * 0.9, -r * 0.8, -r * 0.9, r * 0.8, 0, r)
        P.C(-r * 0.45, r * 0.55, -r * 0.45, -r * 0.55, 0, -r).Z()
        P = Path().M(r * 0.3, -r).C(-r * 0.75, -r * 0.9, -r * 0.75, r * 0.9, r * 0.3, r).C(-r * 0.25, r * 0.5, -r * 0.25, -r * 0.5, r * 0.3, -r).Z()
        g.part(P, c='#FBF3D5')
        if face:
            eye_happy(g, -r * 0.42, 0, r * 0.1)
            g.line(curve([(-r * 0.46, r * 0.28), (-r * 0.36, r * 0.36), (-r * 0.26, r * 0.28)]), w=ink.dw * 0.8)
    return g


def drum(ink, x, y, s=1.0):
    with ink.fig(x, y, s) as g:
        g.part(rrect(-50, -50, 100, 70, 12), c='#F2877E')
        g.part(ell(0, -50, 50, 14), c='#FFFFFF', under=True)
        for i in range(5):
            xx = -40 + i * 20
            g.line(Path().M(xx, -42).L(xx + 10 * (1 if i % 2 else -1), 12), w=ink.dw * 0.8)
        for sgn in (-1, 1):
            g.line(Path().M(sgn * 30, -70).L(sgn * 52, -102), w=ink.dw * 1.3)
            g.part(circ(sgn * 54, -106, 7), c='#FFE08A', w=ink.dw * 0.9)
    return g


def flag_pole(ink, x, y, h=200, c='#F2877E'):
    with ink.fig(x, y) as g:
        g.line(Path().M(0, 0).L(0, -h), w=ink.iw * 1.1)
        g.part(blob([(0, -h, 'c'), (60, -h + 14), (0, -h + 44, 'c')], k=0.6), c=c)
    return g








def lantern_string(ink, pts, n=6):
    with ink.fig(0, 0, outline=False) as g:
        g.line(curve(pts), w=ink.dw * 0.9)
    poly = curve(pts).flatten(4.0)[0][0]
    for k in range(n):
        j = int((len(poly) - 1) * (k + 0.5) / n)
        x, y = poly[j]
        with ink.fig(x, y, 0.9) as g:
            g.part(blob([(-14, 0, 'c'), (14, 0, 'c'), (18, 22), (10, 40, 'c'), (-10, 40, 'c'), (-18, 22)], k=0.8), c='#FFE08A')
            g.line(Path().M(-6, 6).L(-8, 34), w=ink.dw * 0.7)
            g.line(Path().M(6, 6).L(8, 34), w=ink.dw * 0.7)


def bamboo(ink, x, y, h, w=36):
    with ink.fig(x, y) as g:
        n = max(2, int(h // 120))
        seg = h / n
        for i in range(n):
            g.part(rrect(-w / 2, -(i + 1) * seg, w, seg + 4, 10), c='#A9D98C')
        for i in range(1, n):
            g.line(Path().M(-w / 2, -i * seg).L(w / 2, -i * seg), w=ink.dw * 0.85)
        for i in range(n):
            g.line(Path().M(-6, -(i + 0.5) * seg).L(-6, -(i + 0.5) * seg - 18), w=ink.dw * 0.6)
    return g


def bamboo_leaf(g, x, y, ang, ln=60):
    v = g.view(x, y, 1, False, ang)
    v.part(blob([(0, 0, 'c'), (ln * 0.5, -ln * 0.15), (ln, 0, 'c'), (ln * 0.5, ln * 0.15)], k=1.0), c='#7DBB6E', w=g.ink.dw)


def jar(ink, x, y, s=1.0, glow=True):
    with ink.fig(x, y, s) as g:
        g.part(blob([(-40, -110, 'c'), (-48, -90), (-50, -40), (-40, 0, 'c'), (40, 0, 'c'), (50, -40), (48, -90), (40, -110, 'c')], k=0.6), c='#EAF4FF')
        g.part(rrect(-44, -128, 88, 22, 7), c='#F7D56A', under=True)
        g.line(curve([(-34, -90), (-38, -50), (-32, -20)]), w=ink.dw * 0.8)
    return g


def firefly(ink, x, y, s=1.0, rot=0.0):
    with ink.fig(x, y, s, False, rot) as g:
        for sgn in (-1, 1):
            g.part(ell(sgn * 10, -16, 14, 8, sgn * 30), c='#EAF4FF', w=ink.dw * 0.85)
        g.part(ell(0, 0, 10, 14), c='#FFE08A', w=ink.dw)
        g.part(circ(0, -18, 7), c='#4A413B', w=ink.dw)
        for k in (0, 1, 2, 3, 4, 5):
            a = math.radians(60 + k * 36)
            g.line(Path().M(math.cos(a) * 18, 12 + math.sin(a) * 12).L(math.cos(a) * 26, 12 + math.sin(a) * 19), w=ink.dw * 0.7)
    return g


def bed(ink, x, y, s=1.0, w=420):
    """a cozy bed seen from the front: headboard, pillow, quilt with a patchwork; y is the floor line"""
    with ink.fig(x, y, s) as g:
        for sgn in (-1, 1):
            g.part(rrect(sgn * (w / 2 - 8) - 12, -40, 24, 40, 6), c='#B07C4D')
        g.part(blob([(-w / 2, -40, 'c'), (-w / 2, -200), (-w / 2 + 60, -250), (w / 2 - 60, -250), (w / 2, -200), (w / 2, -40, 'c')], k=0.5), c='#B07C4D')
        g.part(rrect(-w / 2 + 14, -150, w - 28, 112, 20), c='#F5E9D6')
        g.part(blob([(-w / 2 + 40, -168), (-w / 2 + 70, -200), (0, -214), (w / 2 - 70, -200), (w / 2 - 40, -168), (0, -150)], k=1.0), c='#FFFFFF', under=False, w=ink.dw)
    return g


def quilt_patch(g, x0, y0, x1, y1, cols=6, rows=3, c=('#F2877E', '#F7D56A', '#8FCBF0', '#B79CEB', '#8FCB7C')):
    cw, rh = (x1 - x0) / cols, (y1 - y0) / rows
    for r in range(rows):
        for q in range(cols):
            g.part(rrect(x0 + q * cw + 2, y0 + r * rh + 2, cw - 4, rh - 4, 4), c=c[(q + r) % len(c)], under=False, w=g.ink.dw * 0.8)




def pillow(ink, x, y, s=1.0, w=150, h=100, c='#F7D56A', rot=0.0):
    with ink.fig(x, y, s, False, rot) as g:
        g.part(blob([(-w / 2, -h / 2 + 6, 'c'), (0, -h / 2 + 22), (w / 2, -h / 2 + 6, 'c'), (w / 2 - 10, 0), (w / 2, h / 2 - 6, 'c'), (0, h / 2 - 22), (-w / 2, h / 2 - 6, 'c'), (-w / 2 + 10, 0)], k=1.0), c=c)
        for sgn in (-1, 1):
            g.line(Path().M(sgn * (w / 2 - 6), -h / 2 + 10).L(sgn * (w / 2 - 22), -h / 2 + 18), w=ink.dw * 0.7)
        g.line(curve([(-20, -4), (0, 4), (20, -4)]), w=ink.dw * 0.7) if False else None
    return g


def tub(ink, x, y, s=1.0, w=560):
    """a clawfoot bathtub seen from the front; y is the floor"""
    with ink.fig(x, y, s) as g:
        for sgn in (-1, 1):
            g.part(blob([(sgn * (w / 2 - 70) - 24, -50, 'c'), (sgn * (w / 2 - 70) + 24, -50, 'c'), (sgn * (w / 2 - 70) + 20, -14), (sgn * (w / 2 - 70) + 30, 0, 'c'), (sgn * (w / 2 - 70) - 30, 0, 'c'), (sgn * (w / 2 - 70) - 20, -14)], k=0.7), c='#F2877E')
        g.part(blob([(-w / 2, -250, 'c'), (-w / 2 + 6, -150), (-w / 2 + 70, -66), (0, -46), (w / 2 - 70, -66), (w / 2 - 6, -150), (w / 2, -250, 'c')], k=0.9), c='#EAF4FF')
        g.part(rrect(-w / 2 - 14, -270, w + 28, 36, 18), c='#EAF4FF', under=True)
        g.line(curve([(-w / 2 + 40, -130), (-w / 2 + 70, -110)]), w=ink.dw * 0.8)
        g.line(curve([(w / 2 - 40, -130), (w / 2 - 70, -110)]), w=ink.dw * 0.8)
    return g




def teapot(ink, x, y, s=1.0, c='#F7A8C2'):
    with ink.fig(x, y, s) as g:
        g.part(blob([(40, -44, 'c'), (84, -66), (92, -56), (50, -14, 'c')], k=0.6), c=c)
        g.part(Path().M(-40, -50).C(-82, -76, -82, -8, -40, -22).L(-44, -30).C(-64, -22, -64, -56, -44, -64).Z(), c=c)
        g.part(blob([(-56, -34), (-44, -70), (0, -80), (44, -70), (56, -34), (46, -2, 'c'), (-46, -2, 'c')], k=1.0), c=c)
        g.part(ell(0, -80, 22, 7), c=c, under=True)
        g.part(circ(0, -92, 8), c='#FFE08A', under=True, w=ink.dw * 0.9)
        g.part(heart_path(0, -34, 14), c='#FFFFFF', under=False, w=ink.dw * 0.8)
    return g


def teacup(ink, x, y, s=1.0, c='#8FCBF0', steam=False):
    with ink.fig(x, y, s) as g:
        g.part(ell(0, 0, 50, 10), c='#FFFFFF', w=ink.dw)
        g.part(Path().M(30, -44).C(62, -48, 62, -14, 30, -18).C(40, -22, 40, -38, 30, -36).Z(), c=c)
        g.part(blob([(-40, -50, 'c'), (-34, -14), (0, -2), (34, -14), (40, -50, 'c')], k=1.0), c=c)
        g.part(ell(0, -50, 40, 8), c='#FFFFFF', under=True)
        if steam:
            for xx in (-12, 12):
                g.line(curve([(xx, -66), (xx + 8, -80), (xx - 8, -94), (xx, -108)]), w=ink.dw * 0.8)
    return g


def tent(ink, x, y, s=1.0, w=560, h=380, c='#F7D56A'):
    """a blanket tent seen from the front, opening in the middle; (x, y) is the middle of the floor line"""
    with ink.fig(x, y, s) as g:
        g.part(blob([(-w / 2, 0, 'c'), (-w * 0.42, -h * 0.6), (-w * 0.2, -h * 0.92), (0, -h, 'c'), (w * 0.2, -h * 0.92), (w * 0.42, -h * 0.6), (w / 2, 0, 'c')], k=0.9), c=c)
        g.part(blob([(-w * 0.26, 0, 'c'), (-w * 0.25, -h * 0.4), (-w * 0.12, -h * 0.66), (0, -h * 0.72, 'c'), (w * 0.12, -h * 0.66), (w * 0.25, -h * 0.4), (w * 0.26, 0, 'c')], k=0.9), c='#F5E9D6', under=False, w=ink.dw * 1.1)
        # flag on top and stripes
        g.line(Path().M(0, -h).L(0, -h - 60), w=ink.iw)
        g.part(blob([(0, -h - 60, 'c'), (46, -h - 50), (0, -h - 30, 'c')], k=0.6), c='#F2877E', w=ink.dw * 0.9)
    return g


def lights(ink, pts, n=8, c='#FFE08A'):
    with ink.fig(0, 0, outline=False) as g:
        g.line(curve(pts), w=ink.dw * 0.85)
    poly = curve(pts).flatten(4.0)[0][0]
    for k in range(n):
        j = int((len(poly) - 1) * (k + 0.5) / n)
        x, y = poly[j]
        with ink.fig(x, y, 1.0) as g:
            g.part(blob([(0, 0, 'c'), (10, 8), (8, 22), (0, 26), (-8, 22), (-10, 8)], k=0.8), c=c, w=ink.dw * 0.9)


def cottage(ink, x, y, s=1.0, w=360, smoke=True):
    """the cottage in the Hollow: round door, round window, curvy roof; (x, y) is the middle of the ground line"""
    with ink.fig(x, y, s) as g:
        if smoke:
            for (a, b, r) in ((w * 0.26, -w * 0.88, 14), (w * 0.3, -w * 0.97, 19), (w * 0.38, -w * 1.08, 24)):
                g.part(circ(a, b, r), c='#FFFFFF')
        g.part(rrect(w * 0.18, -w * 0.82, 44, 80, 6), c='#E8A987')
        g.part(rrect(-w / 2, -w * 0.52, w, w * 0.52, 16), c='#F6D9B8')
        g.part(blob([(-w * 0.58, -w * 0.5, 'c'), (-w * 0.32, -w * 0.72), (0, -w * 0.9), (w * 0.32, -w * 0.72), (w * 0.58, -w * 0.5, 'c'), (w * 0.3, -w * 0.46), (0, -w * 0.5), (-w * 0.3, -w * 0.46)], k=0.9), c='#E8806F')
        # roof scallops
        for i in range(5):
            xx = -w * 0.4 + i * w * 0.2
            g.line(curve([(xx - 14, -w * 0.62 + abs(i - 2) * 10 + 10), (xx, -w * 0.58 + abs(i - 2) * 10 + 10), (xx + 14, -w * 0.62 + abs(i - 2) * 10 + 10)]), w=ink.dw * 0.8)
        g.part(blob([(-w * 0.14, 0, 'c'), (-w * 0.14, -w * 0.26), (0, -w * 0.36), (w * 0.14, -w * 0.26), (w * 0.14, 0, 'c')], k=0.8), c='#9B6A3C')
        g.dot(w * 0.07, -w * 0.14, 4.4)
        g.part(circ(-w * 0.32, -w * 0.28, w * 0.09), c='#BFE0F7')
        g.line(Path().M(-w * 0.32, -w * 0.37).L(-w * 0.32, -w * 0.19).M(-w * 0.41, -w * 0.28).L(-w * 0.23, -w * 0.28), w=ink.dw * 0.8)
        g.part(circ(w * 0.32, -w * 0.28, w * 0.09), c='#BFE0F7')
        g.line(Path().M(w * 0.32, -w * 0.37).L(w * 0.32, -w * 0.19).M(w * 0.23, -w * 0.28).L(w * 0.41, -w * 0.28), w=ink.dw * 0.8)
    return g


def basket(ink, x, y, s=1.0, w=200, full=True):
    with ink.fig(x, y, s) as g:
        g.part(Path().M(-w * 0.32, -w * 0.4).C(-w * 0.32, -w * 0.9, w * 0.32, -w * 0.9, w * 0.32, -w * 0.4), c='#FFFFFF', w=ink.dw * 1.3) if False else None
        g.line(Path().M(-w * 0.34, -w * 0.46).C(-w * 0.34, -w * 0.95, w * 0.34, -w * 0.95, w * 0.34, -w * 0.46), w=ink.ow * 0.9)
        if full:
            g.part(circ(-w * 0.18, -w * 0.52, 20), c='#F2877E', under=True)
            g.part(circ(w * 0.14, -w * 0.58, 20), c='#F7D56A', under=True)
            g.part(blob([(-8, -w * 0.5), (26, -w * 0.66), (48, -w * 0.5), (26, -w * 0.4)], k=1.0), c='#8FCB7C', under=True)
        g.part(blob([(-w / 2, -w * 0.5, 'c'), (w / 2, -w * 0.5, 'c'), (w * 0.4, -w * 0.06, 'c'), (w * 0.3, 0, 'c'), (-w * 0.3, 0, 'c'), (-w * 0.4, -w * 0.06, 'c')], k=0.3), c='#E8B97C')
        for i in range(1, 4):
            yy = -w * 0.5 + i * w * 0.115
            g.line(Path().M(-w * 0.46 + i * 8, yy).L(w * 0.46 - i * 8, yy), w=ink.dw * 0.75)
        for i in range(-3, 4):
            g.line(Path().M(i * w * 0.12, -w * 0.5).L(i * w * 0.09, -w * 0.04), w=ink.dw * 0.75)
    return g


def blanket(ink, cx, cy, w=700, h=150, n=7, c='#F2877E'):
    """a checkered picnic blanket seen at an angle (a flat parallelogram)"""
    with ink.fig(cx, cy) as g:
        g.part(rpoly([(-w / 2 + 50, -h / 2), (w / 2 - 50, -h / 2), (w / 2, h / 2), (-w / 2, h / 2)], 10), c='#FFF3DF')
        # checks
        cols = n
        for i in range(cols):
            for j in range(2):
                if (i + j) % 2 == 0:
                    t0, t1 = i / cols, (i + 1) / cols
                    yt, yb = -h / 2 + j * h / 2, -h / 2 + (j + 1) * h / 2
                    def px(t, y):
                        f = (y + h / 2) / h
                        l = -w / 2 + 50 * (1 - f)
                        r = w / 2 - 50 * (1 - f)
                        return l + (r - l) * t
                    P = Path().M(px(t0, yt), yt).L(px(t1, yt), yt).L(px(t1, yb), yb).L(px(t0, yb), yb).Z()
                    g.part(P, c=c, under=False, w=ink.dw * 0.7)
    return g
