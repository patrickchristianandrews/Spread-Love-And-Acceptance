#!/usr/bin/env python3
"""props3.py: props for the two pups' scenes (kids29): book, bone, ball, wagon, sled, umbrella, boat, treehouse, campfire,
sandcastle, bubbles wand, sunflower, hole, music notes and more. Only things, never faces."""
import math
from cute import *
from cast import K, paw_toes
import props as pr
import props2 as p2


def book(ink, x, y, s=1.0, w=360, h=230, lines=True):
    """a big open book seen from the front; (x, y) the middle of the bottom edge"""
    with ink.fig(x, y, s) as g:
        g.part(blob([(0, -h * 0.9, 'c'), (-w * 0.3, -h * 1.0), (-w / 2, -h * 0.92, 'c'), (-w / 2, -8, 'c'), (-w * 0.3, 4), (0, -h * 0.06, 'c')], k=0.8), c='#FFFFFF')
        g.part(blob([(0, -h * 0.9, 'c'), (w * 0.3, -h * 1.0), (w / 2, -h * 0.92, 'c'), (w / 2, -8, 'c'), (w * 0.3, 4), (0, -h * 0.06, 'c')], k=0.8), c='#FFFFFF')
        g.part(blob([(-w / 2 - 14, -4, 'c'), (-w / 2 - 14, -h * 0.9, 'c'), (-w / 2, -h * 0.9, 'c'), (-w / 2, -8, 'c')], k=0.1), c='#8FCBF0', under=True)
        g.part(blob([(w / 2 + 14, -4, 'c'), (w / 2 + 14, -h * 0.9, 'c'), (w / 2, -h * 0.9, 'c'), (w / 2, -8, 'c')], k=0.1), c='#8FCBF0', under=True)
        if lines:
            for sgn in (-1, 1):
                for i in range(4):
                    yy = -h * 0.78 + i * h * 0.17
                    g.line(curve([(sgn * w * 0.08, yy + 2), (sgn * w * 0.28, yy + 6), (sgn * w * 0.44, yy + 2)]), w=ink.dw * 0.75)
        g.line(Path().M(0, -h * 0.9).L(0, -h * 0.06), w=ink.dw)
    return g


def bone(ink, x, y, s=1.0, rot=0.0, c='#FFF3DF'):
    with ink.fig(x, y, s, False, rot) as g:
        P = blob([(-32, -9, 'c'), (-44, -22), (-56, -12), (-48, 0), (-56, 12), (-44, 22), (-32, 9, 'c'), (32, 9, 'c'), (44, 22), (56, 12), (48, 0), (56, -12), (44, -22), (32, -9, 'c')], k=0.9)
        g.part(P, c=c)
    return g


def ball(ink, x, y, r=36, c='#F2877E'):
    with ink.fig(x, y, 1.0) as g:
        g.part(circ(0, 0, r), c=c)
        g.line(curve([(-r * 0.9, -r * 0.2), (-r * 0.2, r * 0.1), (r * 0.5, -r * 0.1), (r * 0.9, r * 0.3)]), w=ink.dw * 0.9)
        g.part(star_path(r * 0.1, -r * 0.45, r * 0.22, r * 0.11, 5, -90, 1.5), c='#FFFFFF', under=False, w=ink.dw * 0.7) if r > 24 else None
    return g


def wagon(ink, x, y, s=1.0, w=300, h=100):
    """a little red wagon seen from the side; y is the ground; handle to the right"""
    with ink.fig(x, y, s) as g:
        g.line(Path().M(w / 2 - 20, -h * 0.4).L(w / 2 + 120, -h * 0.4 - 50), w=ink.ow * 0.8)
        g.part(circ(w / 2 + 126, -h * 0.4 - 54, 10), c='#8FCBF0', w=ink.dw)
        g.part(blob([(-w / 2, -h - 40, 'c'), (w / 2, -h - 40, 'c'), (w / 2 - 20, -22, 'c'), (-w / 2 + 20, -22, 'c')], k=0.2), c='#F2877E')
        g.part(rrect(-w / 2 - 6, -h - 52, w + 12, 20, 8), c='#F2877E', under=True)
        g.line(Path().M(-w / 2 + 14, -h * 0.55).L(w / 2 - 14, -h * 0.55), w=ink.dw * 0.8)
        for sx in (-w * 0.3, w * 0.3):
            g.part(circ(sx, -24, 26), c='#8FCBF0')
            g.part(circ(sx, -24, 9), c='#FFFFFF', under=False, w=ink.dw * 0.9)
    return g


def sled(ink, x, y, s=1.0, w=330):
    with ink.fig(x, y, s) as g:
        g.line(curve([(-w / 2 - 24, -50), (-w / 2 - 6, -4), (0, 0), (w / 2, 0)]), w=ink.ow * 0.9)
        g.line(curve([(-w / 2 + 40, -18), (-w / 2 + 40, -40)]), w=ink.dw)
        g.line(curve([(w / 2 - 40, -4), (w / 2 - 40, -40)]), w=ink.dw)
        g.part(rrect(-w / 2 + 10, -80, w - 20, 44, 14), c='#F2877E')
        for i in range(5):
            xx = -w / 2 + 40 + i * (w - 80) / 4
            g.line(Path().M(xx, -78).L(xx, -38), w=ink.dw * 0.8)
        g.line(curve([(w / 2 - 14, -64), (w / 2 + 60, -84)]), w=ink.dw * 1.0, dash='2 10')
    return g


def umbrella(ink, x, y, s=1.0, w=460, c=('#F2877E', '#F7D56A')):
    """an open umbrella with a handle; (x, y) the middle of the rim"""
    with ink.fig(x, y, s) as g:
        g.line(Path().M(0, 0).L(0, 220), w=ink.ow * 0.85)
        g.line(curve([(0, 220), (0, 244), (-24, 252), (-34, 232)]), w=ink.ow * 0.85)
        g.part(blob([(-w / 2, 0, 'c'), (-w * 0.46, -100), (-w * 0.2, -170), (0, -186, 'c'), (w * 0.2, -170), (w * 0.46, -100), (w / 2, 0, 'c'), (w * 0.34, 20), (w * 0.17, 0), (0, 20), (-w * 0.17, 0), (-w * 0.34, 20)], k=0.9), c=c[0])
        for xx in (-w * 0.34, -w * 0.17, w * 0.17, w * 0.34):
            g.line(curve([(xx * 0.28, -184 + abs(xx) * 0.08), (xx * 0.8, -90), (xx, 6)]), w=ink.dw * 0.8)
        g.line(Path().M(0, -186).L(0, -206), w=ink.ow * 0.7)
    return g


def sailboat(ink, x, y, s=1.0, w=420, rig=True, hull=True):
    """a little boat with two sails; y is the waterline. rig and hull can be drawn apart so pups can sit between them"""
    if rig:
        sailboat_rig(ink, x, y, s, w)
    if hull:
        sailboat_hull(ink, x, y, s, w)


def sailboat_rig(ink, x, y, s=1.0, w=420):
    with ink.fig(x, y, s) as g:
        g.line(Path().M(0, 10).L(0, -w * 0.8), w=ink.ow * 0.7)
        g.part(blob([(10, -w * 0.78, 'c'), (w * 0.3, -w * 0.3), (10, -w * 0.16, 'c')], k=0.5), c='#FFFFFF')
        g.part(blob([(-10, -w * 0.7, 'c'), (-w * 0.2, -w * 0.3), (-10, -w * 0.16, 'c')], k=0.5), c='#8FCBF0')
        g.part(blob([(0, -w * 0.82, 'c'), (34, -w * 0.78, 'c'), (0, -w * 0.74, 'c')], k=0.3), c='#F2877E', w=ink.dw)


def sailboat_hull(ink, x, y, s=1.0, w=420):
    with ink.fig(x, y, s) as g:
        g.part(blob([(-w / 2, -w * 0.12, 'c'), (w / 2, -w * 0.12, 'c'), (w * 0.38, 20, 'c'), (-w * 0.38, 20, 'c')], k=0.4), c='#F2877E')
        for i in range(3):
            xx = -w * 0.25 + i * w * 0.25
            g.part(circ(xx, -w * 0.02, 12), c='#FFFFFF', under=False, w=ink.dw * 0.95)
    return g


def waves(ink, y0, amp=18, rows=3, gap=70, c='#BFE0F7', x0=None, x1=None):
    """rows of rolling waves across the frame (filled bands, closed along the bottom)"""
    x0 = 20 if x0 is None else x0
    x1 = 830 if x1 is None else x1
    for r in range(rows):
        yy = y0 + r * gap
        n = 6
        pts = [(x0 + i * (x1 - x0) / n, yy + (amp if (i + r) % 2 else -amp)) for i in range(n + 1)]
        with ink.fig(0, 0) as g:
            P = curve(pts)
            P = Path(P.s + [('L', (x1, 1000)), ('L', (x0, 1000)), ('Z',)])
            g.part(P, c=c)
            if r == 0:
                pass


def music_note(ink, x, y, s=1.0, rot=0.0, double=False):
    with ink.fig(x, y, s, False, rot) as g:
        if double:
            g.part(ell(-6, 28, 15, 11, -20), c='#B79CEB')
            g.part(ell(40, 20, 15, 11, -20), c='#B79CEB')
            g.line(Path().M(8, 26).L(8, -34).L(54, -42).L(54, 16), w=ink.ow * 0.7)
            g.line(Path().M(8, -34).L(54, -42), w=ink.ow * 1.2)
        else:
            g.part(ell(0, 30, 15, 11, -20), c='#B79CEB')
            g.line(Path().M(13, 28).L(13, -40).C(13, -22, 38, -26, 34, -8), w=ink.ow * 0.7)
    return g


def campfire(ink, x, y, s=1.0):
    with ink.fig(x, y, s) as g:
        g.part(capsule(-62, -12, 54, -34, 12, 12), c='#B07C4D')
        g.part(capsule(62, -12, -54, -34, 12, 12), c='#9B6A3C')
        g.part(blob([(0, -170, 'c'), (34, -112), (56, -64), (40, -26), (0, -18), (-40, -26), (-56, -64), (-34, -112)], k=1.0), c='#F7A84C')
        g.part(blob([(0, -118, 'c'), (18, -80), (26, -48), (0, -30), (-26, -48), (-18, -80)], k=1.0), c='#FFE08A', under=False, w=ink.dw)
        g.part(capsule(-30, -22, 38, -22, 12, 12), c='#B07C4D')
        for xx in (-46, -22, 6, 30, 52):
            g.part(circ(xx + 4, 8, 11), c='#D8D2C6', w=ink.dw * 0.9)
    return g


def marshmallow_stick(ink, x0, y0, x1, y1):
    with ink.fig(0, 0, outline=False) as g:
        g.line(Path().M(x0, y0).L(x1, y1), w=ink.ow * 0.7)
    with ink.fig(x1, y1, 1.0) as g:
        g.part(rrect(-17, -17, 34, 34, 10), c='#FFFFFF')


def sandcastle(ink, x, y, s=1.0, w=300):
    with ink.fig(x, y, s) as g:
        g.part(rrect(-w / 2, -w * 0.3, w, w * 0.3, 8), c='#F3D9A4')
        for i in range(4):
            xx = -w / 2 + 10 + i * (w - 20) / 3
            g.part(rrect(xx - 14, -w * 0.3 - 22, 28, 26, 4), c='#F3D9A4', under=True)
        for sgn in (-1, 1):
            g.part(rrect(sgn * w * 0.34 - 30, -w * 0.62, 60, w * 0.34, 6), c='#F3D9A4')
            g.part(rpoly([(sgn * w * 0.34 - 38, -w * 0.62), (sgn * w * 0.34 + 38, -w * 0.62), (sgn * w * 0.34, -w * 0.82)], 5), c='#F2877E')
        g.part(rrect(-34, -w * 0.82, 68, w * 0.52, 8), c='#F3D9A4')
        g.part(rpoly([(-44, -w * 0.82), (44, -w * 0.82), (0, -w * 1.1)], 6), c='#8FCBF0')
        g.line(Path().M(0, -w * 1.1).L(0, -w * 1.24), w=ink.dw)
        g.part(blob([(0, -w * 1.24, 'c'), (26, -w * 1.2, 'c'), (0, -w * 1.15, 'c')], k=0.3), c='#F7D56A', w=ink.dw * 0.9)
        g.part(blob([(-20, -w * 0.3, 'c'), (-20, -w * 0.46), (0, -w * 0.54), (20, -w * 0.46), (20, -w * 0.3, 'c')], k=0.8), c='#C9A66B', under=False, w=ink.dw)
    return g


def bucket(ink, x, y, s=1.0, c='#F2877E'):
    with ink.fig(x, y, s) as g:
        g.line(curve([(-34, -60), (0, -108), (34, -60)]), w=ink.ow * 0.7)
        g.part(blob([(-40, -64, 'c'), (40, -64, 'c'), (30, 0, 'c'), (-30, 0, 'c')], k=0.2), c=c)
        g.part(ell(0, -64, 40, 9), c='#FFFFFF', under=True)
        g.line(Path().M(-34, -30).L(34, -30), w=ink.dw * 0.8)
    return g


def shovel(ink, x, y, s=1.0, rot=0.0):
    with ink.fig(x, y, s, False, rot) as g:
        g.line(Path().M(0, 0).L(0, -110), w=ink.ow * 0.8)
        g.part(rrect(-12, -122, 24, 14, 5), c='#8FCBF0')
        g.part(blob([(-22, 0, 'c'), (22, 0, 'c'), (26, 40), (0, 58, 'c'), (-26, 40)], k=0.7), c='#8FCBF0')
    return g


def wand(ink, x, y, s=1.0, rot=0.0):
    """a bubble wand: a ring on a stick"""
    with ink.fig(x, y, s, False, rot) as g:
        g.line(Path().M(0, 0).L(0, 110), w=ink.ow * 0.8)
        g.part(circ(0, -22, 24), c='#FFFFFF', w=ink.ow * 0.8)
    return g


def sunflower(ink, x, y, s=1.0, stem=300):
    with ink.fig(x, y, s) as g:
        g.line(curve([(0, 0), (6, -stem * 0.5), (0, -stem)]), w=ink.ow * 0.8)
        lf = g.view(2, -stem * 0.3, 1, False, -30)
        lf.part(blob([(0, 0, 'c'), (26, -22), (60, 0, 'c'), (26, 22)], k=1.0), c='#7DBB6E', w=ink.dw)
        lf2 = g.view(2, -stem * 0.5, 1, True, -30)
        lf2.part(blob([(0, 0, 'c'), (26, -22), (60, 0, 'c'), (26, 22)], k=1.0), c='#7DBB6E', w=ink.dw)
        h = g.view(0, -stem, 1.0)
        for i in range(12):
            a = i * TAU / 12
            h.part(ell(math.cos(a) * 52, math.sin(a) * 52, 28, 12, math.degrees(a)), c='#FFD060', w=ink.dw * 0.9)
        h.part(circ(0, 0, 40), c='#9B6A3C')
        for i in range(8):
            a = i * TAU / 8
            h.part(circ(math.cos(a) * 20, math.sin(a) * 20, 5), c='#FFFFFF', under=False, w=ink.dw * 0.7)
        h.part(circ(0, 0, 6), c='#FFFFFF', under=False, w=ink.dw * 0.7)
    return g


def hole(ink, x, y, rx=150, ry=42):
    """a hole in the ground with a mound of dirt each side"""
    with ink.fig(x, y) as g:
        g.part(blob([(-rx - 90, 20, 'c'), (-rx - 40, -30), (-rx, -10), (rx, -10), (rx + 40, -30), (rx + 90, 20, 'c')], k=0.9), c='#C9A66B')
        g.part(ell(0, 0, rx, ry), c='#7A5A44')
        for (a, b) in ((-rx - 30, -4), (rx + 30, -2)):
            g.line(curve([(a - 20, b + 8), (a, b), (a + 20, b + 8)]), w=ink.dw * 0.8)
    return g


def dirt_clump(ink, x, y, r=14):
    with ink.fig(x, y) as g:
        g.part(blob([(-r, 0), (-r * 0.6, -r * 0.8), (r * 0.5, -r * 0.9), (r, 0), (0, r * 0.6)], k=1.0), c='#C9A66B', w=ink.dw * 0.95)


def treehouse(ink, x, y, s=1.0, w=420):
    """a treehouse high in a big trunk; (x, y) the base of the trunk; the house sits about 520 up"""
    with ink.fig(x, y, s) as g:
        g.part(blob([(-60, 0, 'c'), (-48, -300), (-44, -560), (44, -560), (48, -300), (60, 0, 'c')], k=0.7), c='#B07C4D')
        g.line(curve([(-12, -20), (-6, -180), (-14, -300)]), w=ink.dw * 0.8)
        g.line(curve([(18, -60), (22, -200)]), w=ink.dw * 0.8)
        for i in range(7):
            pass
        # a rope ladder
        g.line(Path().M(70, -20).L(76, -300), w=ink.dw)
        g.line(Path().M(112, -20).L(110, -300), w=ink.dw)
        for k in range(8):
            g.line(Path().M(70 + k * 0.2, -40 - k * 36).L(112, -40 - k * 36), w=ink.dw * 0.9)
        # the platform and house
        g.part(rrect(-w / 2, -330, w, 24, 6), c='#D0A36B')
        g.part(rrect(-w * 0.4, -540, w * 0.8, 214, 12), c='#F6D9B8')
        g.part(blob([(-w * 0.5, -530, 'c'), (0, -640), (w * 0.5, -530, 'c'), (w * 0.4, -516, 'c'), (0, -540), (-w * 0.4, -516, 'c')], k=0.5), c='#E8806F')
        g.part(circ(-w * 0.16, -430, 56), c='#BFE0F7')
        g.part(circ(w * 0.16, -430, 56), c='#BFE0F7')
        for sx in (-w * 0.16, w * 0.16):
            g.line(Path().M(sx, -486).L(sx, -374).M(sx - 56, -430).L(sx + 56, -430), w=ink.dw * 0.8)
        g.line(Path().M(-w * 0.4, -330).L(-w * 0.4, -300).M(w * 0.4, -330).L(w * 0.4, -300), w=ink.dw)
    return g


def butterfly_plain(ink, x, y, s=1.0, rot=0.0):
    with ink.fig(x, y, s, False, rot) as g:
        for sgn in (-1, 1):
            g.part(blob([(sgn * 4, -6, 'c'), (sgn * 30, -42), (sgn * 52, -38), (sgn * 54, -14), (sgn * 30, 0)], k=1.0), c='#F4A6C0')
            g.part(blob([(sgn * 4, 4, 'c'), (sgn * 32, 8), (sgn * 38, 28), (sgn * 20, 36), (sgn * 6, 16)], k=1.0), c='#C9A8E0')
        g.part(capsule(0, -14, 0, 20, 4, 3), c='#4A413B', w=ink.dw * 0.9)
        g.line(curve([(-2, -16), (-8, -30), (-16, -32)]), w=ink.dw * 0.7)
        g.line(curve([(2, -16), (8, -30), (16, -32)]), w=ink.dw * 0.7)
    return g


def bird_plain(ink, x, y, s=1.0, flip=False):
    """a tiny bird in flight (just a bold v, plain decoration)"""
    with ink.fig(x, y, s, flip, outline=False) as g:
        g.line(curve([(-26, -6), (-12, -16), (0, 0), (12, -16), (26, -6)]), w=ink.ow * 0.7)
    return g


def shell(ink, x, y, s=1.0, rot=0.0):
    with ink.fig(x, y, s, False, rot) as g:
        g.part(blob([(0, 8, 'c'), (-22, -6), (-18, -26), (0, -34), (18, -26), (22, -6)], k=1.0), c='#F7C9B6')
        for a in (-12, 0, 12):
            g.line(Path().M(a * 0.2, 6).L(a * 1.3, -26 + abs(a) * 0.3), w=ink.dw * 0.7)
        g.part(rrect(-8, 6, 16, 8, 3), c='#F7C9B6', under=True, w=ink.dw * 0.9)
    return g


def toy_blocks(ink, x, y, s=1.0):
    with ink.fig(x, y, s) as g:
        for (a, b, c, l) in ((-50, 0, '#F2877E', 'A'), (10, 0, '#8FCBF0', 'B'), (-20, -58, '#F7D56A', 'C')):
            g.part(rrect(a - 28, b - 56, 56, 56, 6), c=c)
        g.part(circ(-20, -86, 12), c='#FFFFFF', under=False, w=ink.dw * 0.8)
        g.part(star_path(-50, -28, 14, 7, 5, -90, 1.5), c='#FFFFFF', under=False, w=ink.dw * 0.8)
        g.part(heart_path(10, -28, 12), c='#FFFFFF', under=False, w=ink.dw * 0.8)
    return g


def cookie(ink, x, y, s=1.0, rot=0.0):
    with ink.fig(x, y, s, False, rot) as g:
        g.part(circ(0, 0, 28), c='#E8B97C')
        for (a, b) in ((-10, -8), (10, -12), (4, 10), (-12, 8), (14, 6)):
            g.part(circ(a, b, 4.4), c='#8A5A3C', under=False, w=ink.dw * 0.8)
    return g


def tray(ink, x, y, s=1.0, w=360):
    with ink.fig(x, y, s) as g:
        g.part(rrect(-w / 2, -14, w, 18, 8), c='#D8D2C6')
    return g


def sparkles_burst(ink, x, y, r=60, n=6):
    with ink.fig(x, y, 1.0, outline=False) as g:
        for i in range(n):
            a = i * TAU / n
            g.line(Path().M(math.cos(a) * r * 0.55, math.sin(a) * r * 0.55).L(math.cos(a) * r, math.sin(a) * r), w=ink.ow * 0.7)


def pot(ink, x, y, s=1.0, c='#E8806F'):
    with ink.fig(x, y, s) as g:
        g.part(blob([(-34, -56, 'c'), (34, -56, 'c'), (26, 0, 'c'), (-26, 0, 'c')], k=0.2), c=c)
        g.part(rrect(-40, -72, 80, 20, 7), c=c, under=True)
    return g


def logo_stripes(ink, x0, y0, x1, y1, n=5):
    pass


def hot_air_balloon(ink, x, y, s=1.0, w=240):
    """a striped hot air balloon; (x, y) the middle of the basket's bottom"""
    with ink.fig(x, y, s) as g:
        g.line(Path().M(-w * 0.2, -w * 0.62).L(-w * 0.12, -w * 0.18).M(w * 0.2, -w * 0.62).L(w * 0.12, -w * 0.18), w=ink.dw)
        g.part(rrect(-w * 0.14, -w * 0.2, w * 0.28, w * 0.2, 6), c='#E8B97C')
        env = blob([(0, -w * 1.55), (w * 0.4, -w * 1.42), (w * 0.52, -w * 1.0), (w * 0.38, -w * 0.7), (w * 0.2, -w * 0.58, 'c'), (-w * 0.2, -w * 0.58, 'c'), (-w * 0.38, -w * 0.7), (-w * 0.52, -w * 1.0), (-w * 0.4, -w * 1.42)], k=1.0)
        g.part(env, c='#F2877E')
        g.part(blob([(0, -w * 1.55), (w * 0.16, -w * 1.5), (w * 0.2, -w * 1.0), (w * 0.12, -w * 0.62), (-w * 0.12, -w * 0.62), (-w * 0.2, -w * 1.0), (-w * 0.16, -w * 1.5)], k=1.0), c='#F7D56A', under=False, w=ink.dw * 0.9)
        g.line(curve([(-w * 0.5, -w * 0.98), (0, -w * 0.9), (w * 0.5, -w * 0.98)]), w=ink.dw * 0.8)
        g.line(curve([(-w * 0.42, -w * 0.78), (0, -w * 0.72), (w * 0.42, -w * 0.78)]), w=ink.dw * 0.8)
    return g


def lamp(ink, x, y, s=1.0):
    with ink.fig(x, y, s) as g:
        g.part(ell(0, -8, 40, 12), c='#B07C4D')
        g.part(rrect(-6, -150, 12, 144, 4), c='#B07C4D')
        g.part(blob([(-50, -150, 'c'), (50, -150, 'c'), (34, -220, 'c'), (-34, -220, 'c')], k=0.3), c='#FFE08A')
        g.line(Path().M(-30, -160).L(-20, -214).M(0, -160).L(0, -214).M(30, -160).L(20, -214), w=ink.dw * 0.7)
    return g


def glasses(g, y=2, r=22, ex=32):
    """round glasses on a pup's face (head-local): open rings, so the eyes stay visible"""
    dw = g.ink.dw
    for sgn in (-1, 1):
        g.line(circ(sgn * ex, y, r), w=dw * 1.2)
    g.line(curve([(-ex + r, y - 2), (0, y - 9), (ex - r, y - 2)]), w=dw * 1.2)
    for sgn in (-1, 1):
        g.line(Path().M(sgn * (ex + r), y - 2).L(sgn * (ex + r + 14), y - 8), w=dw)


def house(ink, x, y, s=1.0, w=360, h=250, roof_c='#E8806F', smoke=True):
    """a cozy cottage: round-topped door, two windows with shutters, a chimney with smoke, a flower box; (x, y) the middle of the ground line"""
    with ink.fig(x, y, s) as g:
        if smoke:
            for (a, b, r) in ((w * 0.30, -h * 1.62, 14), (w * 0.34, -h * 1.78, 19), (w * 0.42, -h * 1.96, 25)):
                g.part(circ(a, b, r), c='#FFFFFF')
        g.part(rrect(w * 0.18, -h * 1.5, 44, 100, 5), c='#C98D6B')
        g.part(rrect(-w / 2, -h, w, h, 10), c='#F6D9B8')
        for k in range(1, 4):
            g.line(Path().M(-w / 2 + 6, -h + k * h / 4).L(w / 2 - 6, -h + k * h / 4), w=ink.dw * 0.6)
        g.part(rpoly([(-w * 0.62, -h + 12), (0, -h * 1.62), (w * 0.62, -h + 12)], 10), c=roof_c)
        for r_ in range(3):
            yy = -h * 1.38 + r_ * h * 0.12
            n = 3 + r_ * 2
            for q in range(n):
                xx = (q - (n - 1) / 2) * w * 0.11
                g.line(curve([(xx - 14, yy + 10), (xx, yy + 18), (xx + 14, yy + 10)]), w=ink.dw * 0.8)
        g.part(blob([(-w * 0.12, 0, 'c'), (-w * 0.12, -h * 0.44), (0, -h * 0.58), (w * 0.12, -h * 0.44), (w * 0.12, 0, 'c')], k=0.8), c='#9B6A3C')
        g.dot(w * 0.06, -h * 0.22, 4.4)
        for sgn in (-1, 1):
            wx = sgn * w * 0.32
            g.part(rrect(wx - 30, -h * 0.74, 60, 70, 6), c='#BFE0F7')
            g.line(Path().M(wx, -h * 0.74).L(wx, -h * 0.74 + 70).M(wx - 30, -h * 0.74 + 35).L(wx + 30, -h * 0.74 + 35), w=ink.dw * 0.85)
            for ssg in (-1, 1):
                g.part(rrect(wx + ssg * 40 - (8 if ssg > 0 else 0), -h * 0.74, 8, 70, 3), c='#8FCB7C', under=True, w=ink.dw * 0.9)
            g.part(rrect(wx - 36, -h * 0.74 + 70, 72, 14, 4), c='#B07C4D')
            for k in (-1, 0, 1):
                g.part(circ(wx + k * 18, -h * 0.74 + 66, 6), c='#F7A8C2', under=False, w=ink.dw * 0.8)
    return g
