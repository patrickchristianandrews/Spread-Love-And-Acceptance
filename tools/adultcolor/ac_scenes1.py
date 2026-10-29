#!/usr/bin/env python3
"""ac_scenes1.py: quiet scenes, part one (adultcolor29): the reading nook, the lighthouse, the tea table, the mountain lake, the balloon."""
import math
from ac_core import *
import ac_props as pr
from ac_props import cloud, sparkle, star5, pine, round_tree, book_stack, mug, cushion, window_arch, string_lights, pup_ink
from ac_botan import pot, grass, stem, bez_pt, bez_tan, m_diamond_s, butterfly
from ac_mandala import m_petal, m_drop
import cast


def draw_pup(pg, fn, *a, **k):
    ink = pup_ink()
    fn(ink, *a, **k)
    pg.raw(ink.svg())


def raindrop(pg, x, y, s=1.0):
    P = Path().M(0, -9 * s).C(5 * s, -2 * s, 6 * s, 3 * s, 0, 8 * s).C(-6 * s, 3 * s, -5 * s, -2 * s, 0, -9 * s).Z()
    pg.shape(at(P, x, y), W3)


def curtain(pg, side, x_edge, x_in, top, bottom, tie):
    """a curtain hung from a rod, gathered by a tieback. side=-1 is the left one"""
    s = side
    w_top = abs(x_in - x_edge)
    P = Path().M(x_edge, top).L(x_in, top)
    P.C(x_in + s * -2, top + (tie - top) * 0.4, x_in + s * 12, tie - 70, x_in + s * 10, tie)
    P.C(x_in + s * 6, tie + 60, x_in + s * -52, bottom - 100, x_in + s * -58, bottom)
    P.L(x_edge, bottom)
    P.C(x_edge - s * 4, bottom - 140, x_edge + s * 14, tie + 90, x_edge + s * 8, tie)
    P.C(x_edge + s * 2, tie - 80, x_edge, top + 70, x_edge, top).Z()
    pg.shape(P, W2)
    pg.clip(P)
    for i in range(1, 5):
        t = i / 5
        xa = x_edge + (x_in - x_edge) * t
        pg.line(Path().M(xa, top + 8).C(xa + s * 4, tie - 60, xa + s * 12 * (1 - t) - 10 * s * t, tie + 60, xa - s * 40 * t, bottom), W3)
    pg.endclip()
    # the tieback: a band with a button
    xt = x_in + s * 4
    pg.shape(rrect(xt - 24, tie - 9, 48, 18, 8), W2)
    pg.circle(xt, tie, 4, W3)


def s_nook(pg):
    """a reading nook by a rainy window: a window seat, Sugarfoot, books, a mug and rain on the glass"""
    cx = CX
    pg.line(Path().M(104, 112).L(756, 112), W1)
    pg.circle(100, 112, 9, W2)
    pg.circle(760, 112, 9, W2)
    # the window
    outer = window_arch(212, 648, 150, 660)
    pg.shape(outer, W1)
    glass = window_arch(228, 632, 166, 646)
    pg.shape(glass, W2)
    pg.clip(glass)
    # outside: far hills, a tree, clouds, rain
    pg.shape(Path().M(210, 520).C(260, 450, 330, 440, 400, 500).C(470, 430, 560, 430, 650, 520).L(650, 660).L(210, 660).Z(), W2)
    for (x, b, h, w) in ((300, 540, 120, 80), (520, 548, 140, 96)):
        round_tree(pg, x, b, h, w, W2, leaf=False)
    cloud(pg, 330, 250, 170, 70)
    cloud(pg, 520, 330, 150, 60)
    for i in range(7):
        for j in range(6):
            x = 250 + i * 58 + (j % 2) * 28
            y = 200 + j * 80
            pg.line(Path().M(x, y).L(x - 9, y + 26), W3)
    pg.endclip()
    # mullions
    pg.shape(rrect(424, 160, 12, 492, 4), W2)
    pg.shape(rrect(224, 372, 412, 12, 4), W2)
    pg.shape(rrect(224, 512, 412, 12, 4), W2)
    pg.shape(rrect(214, 640, 432, 36, 6), W2)   # the sill
    for (x, y, s) in ((300, 430, 1.1), (360, 470, 1.0), (500, 440, 1.2), (560, 580, 1.0), (270, 580, 1.0), (470, 600, 0.9)):
        raindrop(pg, x, y, s * 1.2)
    # curtains
    curtain(pg, -1, 112, 212, 118, 800, 470)
    curtain(pg, 1, 748, 648, 118, 800, 470)
    # the window seat
    pg.shape(rrect(150, 730, 560, 150, 8), W2)
    for i in range(3):
        pg.shape(rrect(176 + i * 176, 752, 150, 104, 12), W3)
    pg.shape(rrect(138, 880, 584, 16, 6), W2)
    # the seat cushion and what is on it
    cushion(pg, 150, 672, 560, 62, 'dots')
    cushion(pg, 160, 592, 100, 86, 'stripes')
    cushion(pg, 600, 596, 100, 82, 'diamond')
    draw_pup(pg, cast.pup_front, 'sugarfoot', cx + 6, 690, 1.12, 'calm', tilt=4, lvl=1, arms='chest')
    book_stack(pg, 296, 688, 3, 110, 20, 1)
    mug(pg, 560, 688, 54, 54)
    # a rug
    pg.shape(rrect(130, 930, 600, 92, 14), W2)
    pg.shape(rrect(148, 944, 564, 64, 8), W3)
    for i in range(11):
        pg.shape(m_diamond_s(190 + i * 48, 976, 14, 15), W3)
    for sg in (0, 1):
        for i in range(16):
            x = 140 + i * 38
            pg.line(Path().M(x, 1022 if sg else 930).L(x, 1032 if sg else 920), W3)
    pot(pg, 120, 668 + 0, 0, 0) if False else None


# ================================================================ the lighthouse
def house(pg, x, base, w, h, roof_h, door=True, chimney=True, windows=1):
    """a cottage seen from the front (x = left edge)"""
    top = base - h
    if chimney:
        pg.shape(rrect(x + w * 0.68, top - roof_h * 0.9, w * 0.12, roof_h * 0.9 + 6, 2), W2)
    pg.shape(rrect(x, top, w, h, 2), W2)
    roof = rpoly([(x - 10, top + 3), (x + w / 2, top - roof_h), (x + w + 10, top + 3)], 4)
    pg.shape(roof, W2)
    for i in range(1, 4):
        t = i / 4
        pg.line(Path().M(x - 10 + (w / 2 + 10) * t, top + 3 - (roof_h + 3) * t).L(x + w + 10 - (w / 2 + 10) * t, top + 3 - (roof_h + 3) * t), W3)
    if door:
        dw = w * 0.22
        pg.shape(Path().M(x + w * 0.2, base).L(x + w * 0.2, base - h * 0.5).C(x + w * 0.2, base - h * 0.64, x + w * 0.2 + dw, base - h * 0.64, x + w * 0.2 + dw, base - h * 0.5).L(x + w * 0.2 + dw, base).Z(), W2)
        pg.circle(x + w * 0.2 + dw * 0.8, base - h * 0.28, 2.6, W3)
    for k in range(windows):
        wx = x + w * (0.58 if windows == 1 else 0.58 + k * 0.2) - 6
        ws = min(w * 0.2, h * 0.34)
        pg.shape(rrect(wx, top + h * 0.28, ws, ws, 2), W2)
        pg.line(Path().M(wx + ws / 2, top + h * 0.28).L(wx + ws / 2, top + h * 0.28 + ws), W3)
        pg.line(Path().M(wx, top + h * 0.28 + ws / 2).L(wx + ws, top + h * 0.28 + ws / 2), W3)


def rock(pg, x, y, w, h, seed=0):
    pts = [(x - w / 2, y), (x - w * 0.46, y - h * 0.55), (x - w * 0.15, y - h), (x + w * 0.3, y - h * 0.9), (x + w / 2, y - h * 0.3), (x + w * 0.4, y)]
    pg.shape(blob(pts, closed=True, k=0.8), W2)
    pg.line(curve([(x - w * 0.2, y - h * 0.25), (x - w * 0.05, y - h * 0.5), (x + w * 0.1, y - h * 0.45)]), W3)


def s_lighthouse(pg):
    """a lighthouse at dusk on a rocky point: beams, a cottage, a fence, the sea and a small sailboat"""
    from ac_mandala import crescent
    cx = 570
    # sky
    pg.shape(crescent(48, 40, 22).xf(mat(190, 190, 1, False, -20)), W2)
    for (x, y, r) in ((300, 120, 12), (120, 320, 10), (700, 140, 14), (110, 110, 9), (350, 330, 9)):
        sparkle(pg, x, y, r)
    cloud(pg, 220, 420, 190, 70)
    cloud(pg, 690, 470, 150, 60)
    # sea
    sea = Path().M(FX, 800).L(FX + FW, 800).L(FX + FW, FY + FH).L(FX, FY + FH).Z()
    pg.shape(sea, W2)
    pg.clip(sea)
    y = 836
    row = 0
    while y < 1060:
        x = FX - 30 + (22 if row % 2 else 0)
        P = Path()
        while x < FX + FW + 40:
            P.M(x, y).C(x + 11, y - 13, x + 33, y - 13, x + 44, y)
            x += 66
        pg.line(P, W3)
        y += 26
        row += 1
    pg.endclip()
    # the sailboat
    bx, by = 160, 868
    pg.shape(Path().M(bx - 44, by).C(bx - 30, by + 22, bx + 30, by + 22, bx + 44, by).Z(), W2)
    pg.line(Path().M(bx, by).L(bx, by - 92), W2)
    pg.shape(Path().M(bx + 4, by - 90).C(bx + 40, by - 60, bx + 46, by - 28, bx + 40, by - 6).L(bx + 4, by - 6).Z(), W2)
    pg.shape(Path().M(bx - 4, by - 80).L(bx - 4, by - 6).L(bx - 36, by - 6).C(bx - 30, by - 30, bx - 18, by - 56, bx - 4, by - 80).Z(), W2)
    # the beams
    for sg in (-1, 1):
        far = 40 if sg < 0 else FX + FW
        P = Path().M(cx + sg * 22, 266).L(far, 150 if sg < 0 else 160).L(far, 400 if sg < 0 else 380).L(cx + sg * 22, 286).Z()
        pg.shape(P, W2)
        pg.clip(P)
        for k in range(1, 4):
            pg.line(Path().M(cx + sg * 22, 276).L(far, (150 + (250 * k / 4)) if sg < 0 else (160 + 220 * k / 4)), W3)
        pg.endclip()
    # the cliff
    cliff = Path().M(180, 960).C(190, 880, 230, 830, 300, 812).C(380, 790, 460, 786, 540, 784).C(640, 778, 740, 790, FX + FW, 822).L(FX + FW, 940).C(700, 980, 620, 940, 540, 972).C(460, 1000, 380, 960, 300, 985).C(240, 1000, 190, 990, 180, 960).Z()
    pg.shape(cliff, W2)
    pg.clip(cliff)
    for (x, y, w, h) in ((240, 930, 90, 60), (330, 960, 100, 70), (440, 940, 110, 60), (560, 960, 120, 80), (680, 930, 100, 70), (760, 900, 90, 60), (400, 880, 80, 50), (610, 880, 100, 50)):
        rock(pg, x, y, w, h)
    pg.endclip()
    pg.line(Path().M(300, 812).C(380, 790, 460, 786, 540, 784), W2)
    grass(pg, 250, 760, 800, 14, 30, 16, 1.0, 5)
    # the cottage and the fence
    house(pg, 250, 806, 150, 80, 56)
    for i in range(6):
        x = 420 + i * 22
        pg.shape(rrect(x - 4, 760, 8, 46, 3), W3)
    pg.line(Path().M(414, 772).L(536, 772), W2)
    pg.line(Path().M(414, 792).L(536, 792), W2)
    # the tower
    base, top = 790, 330
    hw0, hw1 = 82, 48

    def xl(y):
        return cx - (hw1 + (hw0 - hw1) * (y - top) / (base - top))

    def xr(y):
        return cx + (hw1 + (hw0 - hw1) * (y - top) / (base - top))
    tower = Path().M(xl(base), base).L(xl(top), top).L(xr(top), top).L(xr(base), base).Z()
    pg.shape(tower, W2)
    ys = [base, 680, 572, 462, top]
    for k in range(1, 4):
        yy = ys[k]
        pg.line(Path().M(xl(yy), yy).L(xr(yy), yy), W2)
    for k, yy in enumerate((628, 520, 410)):
        pg.shape(Path().M(cx - 10, yy + 18).L(cx - 10, yy - 4).C(cx - 10, yy - 20, cx + 10, yy - 20, cx + 10, yy - 4).L(cx + 10, yy + 18).Z(), W2)
    pg.shape(Path().M(cx - 18, base).L(cx - 18, base - 38).C(cx - 18, base - 62, cx + 18, base - 62, cx + 18, base - 38).L(cx + 18, base).Z(), W2)
    for k, (ya, yb) in enumerate(((base, 680), (572, 462))):
        for t in (0.25, 0.5, 0.75):
            pass
    # the gallery and lantern room
    pg.shape(rrect(xl(top) - 22, top - 6, (xr(top) - xl(top)) + 44, 14, 3), W2)
    for i in range(9):
        x = xl(top) - 16 + i * ((xr(top) - xl(top)) + 32) / 8
        pg.line(Path().M(x, top - 6).L(x, top - 40), W3)
    pg.line(Path().M(xl(top) - 16, top - 40).L(xr(top) + 16, top - 40), W2)
    room = rrect(cx - 40, top - 82, 80, 76, 3)
    pg.shape(room, W2)
    pg.shape(rrect(cx - 40, top - 82, 80, 76, 3), W2)
    pg.line(Path().M(cx - 14, top - 82).L(cx - 14, top - 6), W2)
    pg.line(Path().M(cx + 14, top - 82).L(cx + 14, top - 6), W2)
    pg.circle(cx, top - 44, 12, W3)
    pg.shape(Path().M(cx - 48, top - 82).C(cx - 48, top - 126, cx + 48, top - 126, cx + 48, top - 82).Z(), W2)
    pg.shape(rrect(cx - 7, top - 142, 14, 22, 5), W2)
    pg.circle(cx, top - 150, 8, W2)


# ================================================================ the tea table
def teapot(pg, x, y, s=1.0):
    """a round teapot standing on y (x = centre of the body)"""
    k = s
    # spout, handle, then the body, lid and knob
    pg.shape(Path().M(x + 62 * k, y - 38 * k).C(x + 92 * k, y - 50 * k, x + 96 * k, y - 84 * k, x + 118 * k, y - 94 * k).L(x + 128 * k, y - 84 * k).C(x + 116 * k, y - 76 * k, x + 112 * k, y - 46 * k, x + 70 * k, y - 20 * k).Z(), W2)
    hp = Path().M(x - 58 * k, y - 78 * k).C(x - 108 * k, y - 92 * k, x - 112 * k, y - 22 * k, x - 62 * k, y - 28 * k)
    pg.line(hp, 11 * k)
    pg.line(hp, 8 * k, color='#fff')
    pg.shape(Path().M(x - 66 * k, y - 48 * k).C(x - 66 * k, y - 112 * k, x + 66 * k, y - 112 * k, x + 66 * k, y - 48 * k).C(x + 66 * k, y - 6 * k, x + 40 * k, y, x + 28 * k, y).L(x - 28 * k, y).C(x - 40 * k, y, x - 66 * k, y - 6 * k, x - 66 * k, y - 48 * k).Z(), W2)
    pg.shape(Path().M(x - 40 * k, y - 100 * k).C(x - 30 * k, y - 124 * k, x + 30 * k, y - 124 * k, x + 40 * k, y - 100 * k).Z(), W2)
    pg.circle(x, y - 130 * k, 8 * k, W2)
    # a painted band: a row of small flowers
    pg.line(Path().M(x - 56 * k, y - 62 * k).C(x - 20 * k, y - 50 * k, x + 20 * k, y - 50 * k, x + 56 * k, y - 62 * k), W3)
    for dx in (-30, 0, 30):
        pg.circle(x + dx * k, y - 40 * k + (0 if dx else 3 * k), 6 * k, W3)


def cup(pg, x, y, s=1.0):
    """a cup on a saucer (x = centre, y = the bottom of the saucer)"""
    k = s
    pg.shape(ell(x, y - 6 * k, 56 * k, 11 * k), W2)
    hp = Path().M(x + 36 * k, y - 46 * k).C(x + 62 * k, y - 50 * k, x + 62 * k, y - 22 * k, x + 34 * k, y - 22 * k)
    pg.line(hp, 8.5 * k)
    pg.line(hp, 5.5 * k, color='#fff')
    pg.shape(Path().M(x - 40 * k, y - 56 * k).L(x + 40 * k, y - 56 * k).C(x + 38 * k, y - 20 * k, x + 20 * k, y - 10 * k, x, y - 10 * k).C(x - 20 * k, y - 10 * k, x - 38 * k, y - 20 * k, x - 40 * k, y - 56 * k).Z(), W2)
    pg.shape(ell(x, y - 56 * k, 40 * k, 8 * k), W2)
    pg.line(Path().M(x - 34 * k, y - 38 * k).C(x - 12 * k, y - 30 * k, x + 12 * k, y - 30 * k, x + 34 * k, y - 38 * k), W3)


def cupcake(pg, x, y, w=54, h=64):
    """a cupcake standing on y (x = centre): a pleated paper, swirled icing and a cherry"""
    pg.shape(Path().M(x - w / 2, y - h * 0.5).L(x + w / 2, y - h * 0.5).L(x + w * 0.38, y).L(x - w * 0.38, y).Z(), W2)
    for i in range(1, 5):
        t = i / 5
        pg.line(Path().M(x - w / 2 + w * t, y - h * 0.5).L(x - w * 0.38 + w * 0.76 * t, y), W3)
    pg.shape(Path().M(x - w * 0.56, y - h * 0.48).C(x - w * 0.6, y - h * 0.7, x - w * 0.4, y - h * 0.72, x - w * 0.3, y - h * 0.82).C(x - w * 0.34, y - h * 1.0, x + w * 0.34, y - h * 1.0, x + w * 0.3, y - h * 0.82).C(x + w * 0.4, y - h * 0.72, x + w * 0.6, y - h * 0.7, x + w * 0.56, y - h * 0.48).Z(), W2)
    pg.line(Path().M(x - w * 0.42, y - h * 0.62).C(x - w * 0.1, y - h * 0.56, x + w * 0.1, y - h * 0.56, x + w * 0.42, y - h * 0.62), W3)
    pg.circle(x, y - h * 1.06, w * 0.12, W2)


def tart(pg, x, y, w=64, h=34):
    """a fruit tart: a fluted shell with berries"""
    pg.shape(Path().M(x - w / 2, y - h * 0.7).L(x + w / 2, y - h * 0.7).L(x + w * 0.4, y).L(x - w * 0.4, y).Z(), W2)
    pg.shape(ell(x, y - h * 0.7, w / 2, h * 0.28), W2)
    for dx in (-0.22, 0, 0.22):
        pg.circle(x + dx * w, y - h * 0.72 + (3 if dx else -3), w * 0.1, W3)


def macaron(pg, x, y, w=50):
    pg.shape(Path().M(x - w / 2, y - 10).C(x - w / 2, y - 24, x + w / 2, y - 24, x + w / 2, y - 10).Z(), W2)
    pg.shape(rrect(x - w * 0.44, y - 10, w * 0.88, 8, 4), W3)
    pg.shape(Path().M(x - w / 2, y + 0).C(x - w / 2, y + 14, x + w / 2, y + 14, x + w / 2, y + 0).Z(), W2)


def s_tea(pg):
    """a tea table with a lace cloth, a teapot, cups, and a three-tier stand of cakes, in front of a window"""
    cx = CX
    # the window behind
    w = window_arch(250, 610, 120, 560)
    pg.shape(w, W1)
    g = window_arch(264, 596, 134, 548)
    pg.shape(g, W2)
    pg.clip(g)
    cloud(pg, 360, 250, 150, 60)
    cloud(pg, 500, 380, 130, 54)
    round_tree(pg, 300, 548, 150, 100, W2, leaf=False)
    round_tree(pg, 560, 548, 180, 120, W2, leaf=False)
    pg.endclip()
    pg.shape(rrect(424, 140, 12, 410, 4), W2)
    pg.shape(rrect(262, 330, 336, 12, 4), W2)
    from ac_scenes1 import curtain
    curtain(pg, -1, 112, 250, 100, 600, 420)
    curtain(pg, 1, 748, 610, 100, 600, 420)
    pg.line(Path().M(100, 100).L(760, 100), W1)
    for x in (96, 764):
        pg.circle(x, 100, 9, W2)
    # the table
    cloth_top = 724
    cloth = Path().M(100, cloth_top).C(120, cloth_top - 46, 740, cloth_top - 46, 760, cloth_top)
    cloth.L(780, 990)
    n = 9
    for i in range(n):
        xa = 780 - i * (700 / n)
        cloth.C(xa - 12, 1020, xa - 700 / n + 12, 1020, xa - 700 / n, 990)
    cloth.L(100, cloth_top).Z()
    pg.shape(ell(cx, cloth_top - 8, 330, 56).xf((1, 0, 0, 1, 0, 0)), W2)
    pg.shape(cloth, W2) if False else None
    body = Path().M(100, cloth_top - 8).C(100, cloth_top + 40, 760 - 330 + 330, cloth_top + 40, 760, cloth_top - 8)
    # a plain skirt under the top
    skirt = Path().M(100, cloth_top - 8).C(130, cloth_top + 60, 730, cloth_top + 60, 760, cloth_top - 8).L(770, 1010)
    for i in range(10):
        xa = 770 - i * 68
        skirt.C(xa - 8, 1036, xa - 60, 1036, xa - 68, 1010)
    skirt.L(90, 1010).Z()
    pg.shape(skirt, W2)
    pg.clip(skirt)
    for i in range(1, 10):
        x = 90 + i * 68
        pg.line(Path().M(x, cloth_top + 30).C(x + 8, cloth_top + 150, x - 8, 900, x + 2, 1030), W3)
    for i in range(24):
        x = 108 + i * 28
        pg.circle(x, 960, 4.5, W3)
    pg.line(Path().M(90, 940).L(770, 940), W3)
    pg.line(Path().M(90, 980).L(770, 980), W3)
    pg.endclip()
    pg.shape(ell(cx, cloth_top - 8, 330, 54), W2)
    pg.line(ell(cx, cloth_top - 8, 304, 46), W3)
    for k in range(32):
        a = k * TAU / 32
        x, y = cx + 317 * math.cos(a), cloth_top - 8 + 50 * math.sin(a)
        pg.circle(x, y, 3.4, W3)
    # the cake stand
    yb = cloth_top - 22
    pg.shape(ell(cx, yb - 12, 100, 20), W2)
    pg.shape(rrect(cx - 8, yb - 190, 16, 180, 4), W2)
    for (yy, ww) in ((yb - 12, 120), (yb - 100, 100), (yb - 180, 74)):
        pg.shape(ell(cx, yy, ww, 17), W2)
        pg.shape(Path().M(cx - ww, yy).C(cx - ww + 4, yy + 18, cx + ww - 4, yy + 18, cx + ww, yy).C(cx + ww - 4, yy + 12, cx - ww + 4, yy + 12, cx - ww, yy).Z(), W3)
    cupcake(pg, cx - 56, yb - 16, 46, 54)
    cupcake(pg, cx + 54, yb - 16, 46, 54)
    tart(pg, cx - 4, yb - 8, 56, 30)
    macaron(pg, cx - 34, yb - 104, 38)
    macaron(pg, cx + 34, yb - 104, 38)
    tart(pg, cx, yb - 114, 46, 26)
    cupcake(pg, cx, yb - 188, 40, 46)
    # teapot, cups, sugar bowl, flowers
    teapot(pg, 210, cloth_top - 10, 1.15)
    cup(pg, 590, cloth_top - 6, 1.1)
    cup(pg, 400, cloth_top + 20, 0.95)
    pg.shape(Path().M(660, cloth_top - 14).L(740, cloth_top - 14).C(742, cloth_top + 6, 730, cloth_top + 10, 720, cloth_top + 10).L(680, cloth_top + 10).C(670, cloth_top + 10, 658, cloth_top + 6, 660, cloth_top - 14).Z(), W2)
    pg.shape(ell(700, cloth_top - 14, 40, 7), W2)
    pg.shape(Path().M(670, cloth_top - 18).C(670, cloth_top - 52, 730, cloth_top - 52, 730, cloth_top - 18).Z(), W2)
    pg.circle(700, cloth_top - 56, 6, W2)
    from ac_botan import daisy
    pot_x = 520
    pg.shape(Path().M(pot_x - 20, cloth_top + 6).L(pot_x + 20, cloth_top + 6).L(pot_x + 14, cloth_top - 44).L(pot_x - 14, cloth_top - 44).Z(), W2)
    for (dx, dy, a) in ((-24, -110, 20), (0, -130, 0), (24, -106, -20)):
        stem(pg, [(pot_x, cloth_top - 44), (pot_x + dx * 0.3, cloth_top - 70), (pot_x + dx * 0.8, cloth_top - 90), (pot_x + dx, cloth_top + dy + 20)], 5, 4)
    for (dx, dy) in ((-24, -110), (0, -130), (24, -106)):
        daisy(pg, pot_x + dx, cloth_top + dy, 24, 0.2, 10)


# ================================================================ the mountain lake
def peak(pg, apex, left, right, base, snow=64, w1=W2):
    """a mountain with a snow cap: straight-ish slopes, a rounded top, a zigzag snow line"""
    ax, ay = apex
    body = Path().M(left, base).C(left + (ax - left) * 0.5, base - (base - ay) * 0.35, ax - 40, ay + 40, ax, ay).C(ax + 40, ay + 40, right - (right - ax) * 0.5, base - (base - ay) * 0.35, right, base).Z()
    pg.shape(body, w1)
    pg.clip(body)
    # the snow cap
    zig = [(ax - 160, ay + snow + 18), (ax - 100, ay + snow - 6), (ax - 62, ay + snow + 22), (ax - 22, ay + snow - 8), (ax + 14, ay + snow + 26), (ax + 52, ay + snow - 4), (ax + 96, ay + snow + 22), (ax + 160, ay + snow - 10)]
    cap = Path().M(ax - 200, ay - 30)
    for p in zig[:1]:
        cap.L(*p)
    for i in range(1, len(zig)):
        cap.L(*zig[i])
    cap.L(ax + 200, ay - 30).Z()
    pg.shape(cap, W2)
    # a ridge line down the face
    pg.line(curve([(ax + 6, ay + snow + 20), (ax + 30, ay + (base - ay) * 0.45), (ax + 24, ay + (base - ay) * 0.8)]), W3)
    pg.line(curve([(ax - 30, ay + snow + 30), (ax - 70, ay + (base - ay) * 0.4), (ax - 90, ay + (base - ay) * 0.7)]), W3)
    pg.endclip()


def s_lake(pg):
    """a mountain lake: snow-capped peaks, pines on the shore, a rowboat and reeds"""
    cx = CX
    pg.circle(580, 200, 44, W2)
    for k in range(16):
        a = k * TAU / 16
        pg.line(Path().M(*polar(56, a, 580, 200)).L(*polar(74 if k % 2 == 0 else 66, a, 580, 200)), W2)
    cloud(pg, 220, 190, 190, 72)
    cloud(pg, 640, 330, 140, 56)
    horizon = 560
    peak(pg, (260, 300), 60, 500, horizon)
    peak(pg, (560, 250), 330, 800, horizon)
    peak(pg, (430, 400), 260, 640, horizon + 4, snow=50)
    # the lake and its ripples
    lake = Path().M(FX, horizon + 4).L(FX + FW, horizon + 4).L(FX + FW, FY + FH).L(FX, FY + FH).Z()
    pg.shape(lake, W2)
    pg.clip(lake)
    for row in range(14):
        y = horizon + 40 + row * 30
        x = FX + ((row * 53) % 90)
        P = Path()
        while x < FX + FW:
            ln = 40 + ((row * 17 + int(x)) % 50)
            P.M(x, y).C(x + ln * 0.3, y - 6, x + ln * 0.7, y + 6, x + ln, y)
            x += ln + 40 + ((row * 31 + int(x)) % 70)
        pg.line(P, W3)
    pg.endclip()
    # the pines along the shore
    for (x, h, w) in ((100, 250, 110), (190, 190, 90), (40, 190, 80), (700, 230, 100), (780, 190, 86), (620, 170, 76)):
        pine(pg, x, horizon + 24, h, w, 4)
    # the boat
    bx, by = 430, 760
    pg.shape(Path().M(bx - 110, by - 24).C(bx - 70, by + 28, bx + 70, by + 28, bx + 110, by - 24).C(bx + 60, by - 14, bx - 60, by - 14, bx - 110, by - 24).Z(), W1)
    pg.line(Path().M(bx - 96, by - 8).C(bx - 50, by + 10, bx + 50, by + 10, bx + 96, by - 8), W3)
    pg.line(Path().M(bx - 30, by - 20).L(bx - 120, by - 84), W2)
    pg.line(Path().M(bx + 30, by - 20).L(bx + 120, by - 84), W2)
    pg.shape(ell(bx - 124, by - 88, 16, 7, -50), W2)
    pg.shape(ell(bx + 124, by - 88, 16, 7, 50), W2)
    pg.shape(rrect(bx - 18, by - 38, 36, 12, 4), W2)
    # ripples round the boat
    pg.line(Path().M(bx - 150, by + 20).C(bx - 130, by + 30, bx - 110, by + 30, bx - 94, by + 24), W3)
    pg.line(Path().M(bx + 150, by + 20).C(bx + 130, by + 30, bx + 110, by + 30, bx + 94, by + 24), W3)
    # reeds and rocks in front
    for (x, y, w, h) in ((110, 1010, 190, 110), (740, 1020, 220, 120), (300, 1040, 120, 60)):
        rock(pg, x, y, w, h)
    for (x0, k) in ((70, 0), (700, 1)):
        for i in range(6):
            x = x0 + i * 16 + (k * 7)
            hh = 190 + ((i * 37 + k * 11) % 90)
            ctrl = [(x, 1030), (x + 4 * (i % 3 - 1), 1030 - hh * 0.4), (x + 10 * (1 if i % 2 else -1), 1030 - hh * 0.8), (x + 8 * (1 if i % 2 else -1), 1030 - hh)]
            stem(pg, ctrl, 6, 3)
            if i % 2 == 0:
                pg.shape(ell(0, 0, 8, 26).xf(mat(ctrl[3][0], ctrl[3][1] + 4, 1, False, 0)), W2)


# ================================================================ the hot air balloon
def balloon_env(cx, top, mid_y, neck_y, half_w, neck_w):
    """the envelope outline: a round top narrowing to the neck"""
    P = Path().M(cx, top).C(cx + half_w * 0.75, top, cx + half_w, mid_y - 120, cx + half_w, mid_y)
    P.C(cx + half_w, mid_y + 90, cx + neck_w * 1.5, neck_y - 70, cx + neck_w, neck_y)
    P.L(cx - neck_w, neck_y)
    P.C(cx - neck_w * 1.5, neck_y - 70, cx - half_w, mid_y + 90, cx - half_w, mid_y)
    P.C(cx - half_w, mid_y - 120, cx - half_w * 0.75, top, cx, top).Z()
    return P


def balloon(pg, cx, top, size=1.0, rows=2):
    """a hot air balloon: gores, patterned bands, ropes, a basket and a little flame"""
    k = size
    mid_y = top + 210 * k
    neck_y = top + 470 * k
    hw = 205 * k
    nw = 46 * k
    env = balloon_env(cx, top, mid_y, neck_y, hw, nw)
    pg.shape(env, W1)
    pg.clip(env)
    n = 7
    for i in range(1, n):
        u = -1 + 2 * i / n
        pts = [(cx, top), (cx + u * hw * 0.62, top + (mid_y - top) * 0.45), (cx + u * hw, mid_y), (cx + u * hw * 0.62, mid_y + (neck_y - mid_y) * 0.55), (cx + u * nw, neck_y)]
        pg.line(curve(pts), W2)
    # two horizontal bands with a row of diamonds and a row of dots
    for (ya, yb) in ((top + 120 * k, top + 160 * k), (top + 290 * k, top + 330 * k)):
        for (yy) in (ya, yb):
            pg.line(Path().M(cx - hw * 1.1, yy + 14 * k).C(cx - hw * 0.4, yy - 12 * k, cx + hw * 0.4, yy - 12 * k, cx + hw * 1.1, yy + 14 * k), W2)
    for j in range(n):
        u = -1 + (2 * j + 1) / n
        # diamonds in the upper band, small circles in the lower band
        for (yy, kind) in ((top + 142 * k, 'd'), (top + 310 * k, 'c')):
            ww = hw * (1 - ((yy - mid_y) / (neck_y - mid_y)) ** 2 * 0.0) / n * 0.5
            xx = cx + u * hw * (0.98 if yy < mid_y + 50 * k else 0.82)
            if kind == 'd':
                pg.shape(m_diamond_s(xx, yy, 11 * k, 14 * k), W3)
            else:
                pg.circle(xx, yy, 7 * k, W3)
    pg.endclip()
    pg.line(env, W1)
    # the throat, ropes and basket
    by = neck_y + 120 * k
    pg.shape(rrect(cx - 42 * k, neck_y - 6, 84 * k, 18 * k, 4), W2)
    for (x0, x1) in ((-nw, -44 * k), (nw, 44 * k), (-nw * 0.4, -16 * k), (nw * 0.4, 16 * k)):
        pg.line(Path().M(cx + x0, neck_y + 10 * k).L(cx + x1, by), W2)
    pg.shape(Path().M(cx - 8 * k, neck_y + 14 * k).C(cx - 30 * k, neck_y + 54 * k, cx - 6 * k, neck_y + 72 * k, cx, neck_y + 86 * k).C(cx + 6 * k, neck_y + 72 * k, cx + 30 * k, neck_y + 54 * k, cx + 8 * k, neck_y + 14 * k).Z(), W2)
    bask = Path().M(cx - 50 * k, by).L(cx + 50 * k, by).L(cx + 42 * k, by + 62 * k).C(cx + 40 * k, by + 70 * k, cx + 34 * k, by + 70 * k, cx + 30 * k, by + 70 * k).L(cx - 30 * k, by + 70 * k).C(cx - 34 * k, by + 70 * k, cx - 40 * k, by + 70 * k, cx - 42 * k, by + 62 * k).Z()
    pg.shape(bask, W2)
    pg.clip(bask)
    for i in range(1, 5):
        pg.line(Path().M(cx - 52 * k + i * 20 * k, by).L(cx - 52 * k + i * 20 * k, by + 72 * k), W3)
    for j in range(1, 3):
        pg.line(Path().M(cx - 52 * k, by + j * 23 * k).L(cx + 52 * k, by + j * 23 * k), W3)
    pg.endclip()
    pg.shape(rrect(cx - 54 * k, by - 6 * k, 108 * k, 12 * k, 5), W2)


def s_balloon(pg):
    """a big hot air balloon over a patchwork of fields, with two small balloons and clouds"""
    cx = 410
    cloud(pg, 170, 190, 190, 74)
    cloud(pg, 690, 560, 170, 66)
    cloud(pg, 150, 640, 160, 62)
    balloon(pg, 690, 120, 0.34)
    balloon(pg, 150, 330, 0.26)
    balloon(pg, cx, 100, 1.0)
    # the land below: three rolling hills with furrows, a road and a few trees
    land = Path().M(FX, 900).C(200, 860, 360, 900, 520, 868).C(640, 846, 720, 860, FX + FW, 872).L(FX + FW, FY + FH).L(FX, FY + FH).Z()
    pg.shape(land, W2)
    pg.clip(land)
    for k in range(5):
        y0 = 890 + k * 30
        pg.line(Path().M(FX - 10, y0 + 20).C(240, y0 - 20 + k * 6, 480, y0 + 30, FX + FW + 10, y0 - 10 + k * 8), W3)
    for x in (130, 300, 480, 650, 740):
        pass
    pg.endclip()
    pg.line(Path().M(FX, 900).C(200, 860, 360, 900, 520, 868).C(640, 846, 720, 860, FX + FW, 872), W2)
    # the road
    pg.shape(Path().M(380, FY + FH).C(400, 1000, 470, 980, 520, 940).C(560, 905, 600, 885, 610, 872).L(620, 872).C(612, 892, 590, 910, 560, 940).C(520, 990, 500, 1020, 520, FY + FH).Z(), W2)
    for (x, y, h, w) in ((160, 960, 120, 76), (260, 996, 90, 60), (690, 940, 100, 66), (110, 1010, 80, 50)):
        round_tree(pg, x, y, h, w, W2, leaf=False)
    house(pg, 590, 1000, 100, 54, 34, door=True, chimney=False, windows=1)
