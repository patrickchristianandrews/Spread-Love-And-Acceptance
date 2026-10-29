#!/usr/bin/env python3
"""ac_scenes2.py: quiet scenes, part two (adultcolor29): night sky, porch at dusk, kitchen shelf, bridge, greenhouse."""
import math
from ac_core import *
from ac_props import cloud, sparkle, star5, pine, round_tree, book_stack, mug, cushion, window_arch, string_lights, lamp_bulb, mountain
from ac_botan import pot, grass, stem, bez_pt, bez_tan, m_diamond_s, butterfly, daisy, draw_serr, tulip, watering_can
from ac_mandala import m_petal, m_drop, crescent
from ac_zen import fill_region
from ac_scenes1 import draw_pup, house, rock, teapot, cup, cloud
import cast


# ================================================================ night sky
def s_night(pg):
    """a night sky: a big moon, three constellations joined by dotted lines, a ringed planet, a shooting star, hills and a cabin"""
    # the moon
    mx, my = 250, 250
    pg.circle(mx, my, 104, W1)
    pg.circle(mx, my, 94, W3)
    for (dx, dy, r) in ((-30, -26, 20), (34, 18, 28), (-10, 46, 14), (40, -50, 12), (-52, 24, 10)):
        pg.circle(mx + dx, my + dy, r, W2)
    # the planet with a ring
    px, py = 650, 190
    ring = ell(px, py, 100, 26, -18)
    pg.line(ring, W2)
    pg.circle(px, py, 54, W2)
    pg.line(Path().M(px - 50, py - 16).C(px - 20, py - 26, px + 20, py - 8, px + 52, py - 18), W3)
    pg.line(Path().M(px - 52, py + 16).C(px - 20, py + 6, px + 20, py + 24, px + 48, py + 18), W3)
    # re-draw the front half of the ring over the planet
    P = Path()
    arc = [(px - 100, py), (px - 70, py + 24), (px, py + 30), (px + 70, py + 24), (px + 100, py)]
    pg.clip(Path().M(px - 130, py + 4).L(px + 130, py - 40).L(px + 130, py + 80).L(px - 130, py + 80).Z())
    pg.line(ring, W2)
    pg.endclip()
    # constellations
    groups = [
        [(110, 470), (190, 440), (270, 470), (330, 520), (450, 520), (470, 440), (360, 440)],
        [(560, 420), (620, 360), (690, 420), (650, 500), (580, 520)],
        [(450, 150), (500, 230), (560, 130), (610, 250), (670, 330)],
    ]
    sizes = [[15, 12, 14, 16, 18, 14, 13], [18, 13, 14, 12, 16], [14, 16, 13, 15, 12]]
    for g, sz in zip(groups, sizes):
        for i in range(len(g) - 1):
            a, b = g[i], g[i + 1]
            d = dist(a, b)
            ux, uy = (b[0] - a[0]) / d, (b[1] - a[1]) / d
            pg.line(Path().M(a[0] + ux * sz[i] * 1.4, a[1] + uy * sz[i] * 1.4).L(b[0] - ux * sz[i + 1] * 1.4, b[1] - uy * sz[i + 1] * 1.4), W3, dash='1 8')
        for p, r in zip(g, sz):
            sparkle(pg, p[0], p[1], r)
    # small stars
    for (x, y, r) in ((120, 110, 10), (380, 100, 9), (740, 90, 10), (120, 640, 9), (760, 600, 11), (330, 640, 8), (490, 660, 10), (690, 700, 9), (210, 390, 8)):
        star5(pg, x, y, r, W3)
    for (x, y) in ((90, 200), (360, 330), (770, 330), (520, 80), (110, 540), (700, 580), (260, 700), (610, 640), (430, 620)):
        pg.dot(x, y, 2.2)
    # a shooting star
    sx, sy = 520, 760
    star5(pg, sx, sy, 20, W2, 0.3)
    for k, (dx, dy) in enumerate(((-60, -40), (-90, -14), (-80, -64))):
        pass
    pg.shape(Path().M(sx - 12, sy - 8).C(sx - 70, sy - 40, sx - 130, sy - 80, sx - 190, sy - 100).C(sx - 130, sy - 62, sx - 74, sy - 14, sx - 10, sy + 10).Z(), W2)
    # hills, pines and a cabin
    far = Path().M(FX, 820).C(180, 750, 300, 760, 430, 810).C(560, 760, 690, 740, FX + FW, 800).L(FX + FW, 1040).L(FX, 1040).Z()
    pg.shape(far, W2)
    for (x, h, w) in ((120, 130, 70), (190, 100, 56), (640, 120, 66), (720, 150, 78), (580, 90, 50)):
        pine(pg, x, 836, h, w, 3)
    near = Path().M(FX, 940).C(200, 880, 330, 880, 450, 920).C(570, 880, 700, 870, FX + FW, 920).L(FX + FW, 1040).L(FX, 1040).Z()
    pg.shape(near, W2)
    house(pg, 300, 940, 230, 110, 78, door=True, chimney=True, windows=2)
    pg.line(curve([(474, 750), (486, 728), (468, 706), (482, 684)]), W2)
    pg.line(Path().M(FX, 940).C(200, 880, 330, 880, 450, 920).C(570, 880, 700, 870, FX + FW, 920), W2)
    grass(pg, FX + 12, 300, 1030, 18, 44, 15, 2.0)
    grass(pg, 540, FX + FW - 12, 1030, 18, 44, 15, 4.0)
    for (x, h, r) in ((110, 86, 20), (170, 62, 16), (230, 100, 22), (280, 70, 16)):
        stem(pg, [(x, 1030), (x + 3, 1030 - h * 0.4), (x - 3, 1030 - h * 0.8), (x, 1030 - h)], 5, 4)
        daisy(pg, x, 1030 - h - r * 0.5, r, 0.2, 10)
    pg.line(Path().M(552, 974).L(766, 974), W2)
    pg.line(Path().M(552, 994).L(766, 994), W2)
    for k in range(8):
        x = 560 + k * 26
        pg.shape(rrect(x - 4, 960, 8, 46, 3), W3)


# ================================================================ porch at dusk
def rocking_chair(pg, x, y, s=1.0):
    """a rocking chair standing on y (x = centre)"""
    k = s
    # back slats
    pg.shape(Path().M(x - 40 * k, y - 100 * k).C(x - 40 * k, y - 190 * k, x + 36 * k, y - 190 * k, x + 36 * k, y - 100 * k).L(x + 36 * k, y - 60 * k).L(x - 40 * k, y - 60 * k).Z(), W2)
    for i in range(1, 4):
        pg.line(Path().M(x - 40 * k + i * 19 * k, y - 60 * k).L(x - 40 * k + i * 19 * k, y - 160 * k + abs(i - 2) * 22 * k), W3)
    pg.shape(rrect(x - 58 * k, y - 66 * k, 120 * k, 16 * k, 6), W2)
    pg.shape(rrect(x - 52 * k, y - 50 * k, 12 * k, 38 * k, 4), W2)
    pg.shape(rrect(x + 38 * k, y - 50 * k, 12 * k, 38 * k, 4), W2)
    pg.shape(rrect(x - 30 * k, y - 100 * k, 76 * k, 14 * k, 6), W2)
    rk = Path().M(x - 92 * k, y - 4 * k).C(x - 40 * k, y + 22 * k, x + 40 * k, y + 22 * k, x + 100 * k, y - 4 * k)
    pg.line(rk, 9 * k)
    pg.line(rk, 6.2 * k, color='#fff')


def lantern(pg, x, y, s=1.0):
    """a hanging lantern (x, y = the top of its hook)"""
    k = s
    pg.line(Path().M(x, y).L(x, y + 26 * k), W2)
    pg.shape(Path().M(x - 22 * k, y + 52 * k).L(x, y + 26 * k).L(x + 22 * k, y + 52 * k).Z(), W2)
    pg.shape(rrect(x - 24 * k, y + 52 * k, 48 * k, 70 * k, 4), W2)
    pg.shape(rrect(x - 14 * k, y + 62 * k, 28 * k, 50 * k, 8), W3)
    pg.shape(rrect(x - 28 * k, y + 120 * k, 56 * k, 12 * k, 4), W2)
    pg.shape(Path().M(x, y + 70 * k).C(x - 9 * k, y + 84 * k, x - 7 * k, y + 100 * k, x, y + 106 * k).C(x + 7 * k, y + 100 * k, x + 9 * k, y + 84 * k, x, y + 70 * k).Z(), W3)


def s_porch(pg):
    """a porch at dusk: Tidbit and Sugarfoot on the step, a rocking chair, a lantern, string lights and a lit window"""
    cx = CX
    # sky above the roof
    pg.shape(crescent(46, 38, 20).xf(mat(610, 140, 1, False, -25)), W2)
    for (x, y, r) in ((180, 120, 13), (330, 90, 10), (470, 150, 12), (730, 220, 9), (120, 230, 10)):
        sparkle(pg, x, y, r)
    cloud(pg, 330, 210, 200, 70)
    # the house: roof, wall
    roof = Path().M(100, 360).L(cx, 190).L(760, 360).Z()
    pg.shape(roof, W2)
    pg.clip(roof)
    for r in range(8):
        y = 200 + r * 24
        pg.line(Path().M(60, y).L(800, y), W3)
        for c in range(30):
            x = 70 + c * 30 + (15 if r % 2 else 0)
            pg.line(Path().M(x, y).L(x, y + 24), W3)
    pg.endclip()
    pg.shape(roof, W2) if False else None
    pg.line(roof, W2)
    pg.circle(cx, 306, 28, W2)
    pg.line(Path().M(cx - 28, 306).L(cx + 28, 306), W3)
    pg.line(Path().M(cx, 278).L(cx, 334), W3)
    pg.shape(rrect(130, 360, 600, 440, 0), W2)
    pg.clip(rrect(130, 360, 600, 440, 0))
    for i in range(10):
        y = 440 + i * 36
        pg.line(Path().M(130, y).L(730, y), W3)
    pg.endclip()
    # the porch roof beam
    pg.shape(rrect(84, 470, 692, 30, 6), W1)
    pg.shape(Path().M(84, 470).L(110, 424).L(750, 424).L(776, 470).Z(), W2)
    for i in range(14):
        pg.line(Path().M(108 + i * 46, 470).C(112 + i * 46, 490, 126 + i * 46, 490, 130 + i * 46, 470), W3) if False else None
    string_lights(pg, 120, 740, 508, 50, 9)
    # window with a warm light
    wx = 250
    pg.shape(rrect(wx - 54, 560, 108, 160, 6), W1)
    pg.shape(rrect(wx - 44, 570, 88, 140, 3), W2)
    pg.line(Path().M(wx, 570).L(wx, 710), W2)
    pg.line(Path().M(wx - 44, 640).L(wx + 44, 640), W2)
    for sg in (-1, 1):
        pg.shape(Path().M(wx + sg * 44, 570).C(wx + sg * 40, 620, wx + sg * 30, 660, wx + sg * 40, 710).L(wx + sg * 20, 710).C(wx + sg * 14, 660, wx + sg * 24, 620, wx + sg * 20, 570).Z(), W3)
    pg.shape(rrect(wx - 62, 718, 124, 14, 4), W2)
    # the door
    dx = 590
    pg.shape(rrect(dx - 62, 540, 124, 260, 6), W1)
    pg.shape(Path().M(dx - 48, 800).L(dx - 48, 620).C(dx - 48, 560, dx + 48, 560, dx + 48, 620).L(dx + 48, 800).Z(), W2)
    pg.shape(Path().M(dx - 30, 640).L(dx - 30, 616).C(dx - 30, 586, dx + 30, 586, dx + 30, 616).L(dx + 30, 640).Z(), W3)
    pg.shape(rrect(dx - 30, 666, 60, 104, 4), W3)
    pg.circle(dx + 34, 730, 5, W2)
    # lantern and plants
    lantern(pg, 400, 512, 0.9) if False else None
    lantern(pg, 700, 508, 0.8)
    # columns
    for x in (100, 760):
        pg.shape(rrect(x - 18, 500, 36, 330, 4), W1)
        pg.shape(rrect(x - 26, 484, 52, 22, 4), W2)
        pg.shape(rrect(x - 26, 822, 52, 22, 4), W2)
        pg.line(Path().M(x - 6, 510).L(x - 6, 818), W3)
        pg.line(Path().M(x + 6, 510).L(x + 6, 818), W3)
    # the porch floor and steps
    pg.shape(rrect(90, 840, 680, 36, 4), W2)
    for i in range(1, 16):
        pg.line(Path().M(90 + i * 680 / 16, 840).L(90 + i * 680 / 16, 876), W3)
    pg.shape(rrect(130, 876, 600, 50, 4), W2)
    pg.shape(rrect(160, 926, 540, 50, 4), W2)
    pg.shape(rrect(190, 976, 480, 50, 4), W2)
    pg.line(Path().M(130, 900).L(730, 900), W3)
    pg.line(Path().M(160, 950).L(700, 950), W3)
    # the pups on the top step, the rocking chair, pots
    draw_pup(pg, cast.pup_front, 'sugarfoot', 400, 858, 1.0, 'calm', tilt=5, lvl=1, arms='down')
    draw_pup(pg, cast.pup_front, 'tidbit', 500, 858, 1.0, 'happy', tilt=-5, lvl=1, arms='down')
    rocking_chair(pg, 165, 842, 0.95)
    pot(pg, 710, 862, 80, 66)
    for ang, L in ((-100, 66), (-60, 58), (-135, 58)):
        from ac_core import draw_leaf
        draw_leaf(pg, 710, 790, ang, L, 18, 0.2, 2)


# ================================================================ kitchen shelf
def jar(pg, x, y, w, h, kind='dots', lid=True):
    """a jar standing on y (x = centre) with a label and something inside"""
    top = y - h
    body = Path().M(x - w * 0.36, top + 10).C(x - w * 0.5, top + 20, x - w * 0.5, top + 30, x - w * 0.5, top + 46).L(x - w * 0.5, y - 12).C(x - w * 0.5, y - 2, x - w * 0.46, y, x - w * 0.4, y).L(x + w * 0.4, y).C(x + w * 0.46, y, x + w * 0.5, y - 2, x + w * 0.5, y - 12).L(x + w * 0.5, top + 46).C(x + w * 0.5, top + 30, x + w * 0.5, top + 20, x + w * 0.36, top + 10).Z()
    pg.shape(body, W2)
    pg.clip(body)
    lab = rrect(x - w * 0.32, top + h * 0.45, w * 0.64, h * 0.24, 4)
    if kind == 'dots':
        for i in range(6):
            for j in range(3):
                pg.circle(x - w * 0.36 + i * w * 0.145, y - 12 - j * 16 - (i % 2) * 8, 5, W3)
    elif kind == 'beans':
        for i in range(4):
            for j in range(3):
                pg.shape(ell(x - w * 0.3 + i * w * 0.2, y - 16 - j * 18, 8, 5.5, 20 * (1 if (i + j) % 2 else -1)), W3)
    elif kind == 'pasta':
        for j in range(4):
            pg.line(Path().M(x - w * 0.4, y - 10 - j * 15).C(x - w * 0.2, y - 22 - j * 15, x - w * 0.05, y + 2 - j * 15, x + w * 0.1, y - 12 - j * 15).C(x + w * 0.2, y - 22 - j * 15, x + w * 0.3, y - 4 - j * 15, x + w * 0.4, y - 12 - j * 15), W3)
    pg.endclip()
    pg.shape(lab, W2)
    pg.line(Path().M(x - w * 0.2, top + h * 0.57).L(x + w * 0.2, top + h * 0.57), W3)
    if lid:
        pg.shape(rrect(x - w * 0.4, top - 8, w * 0.8, 20, 6), W2)
        pg.circle(x, top - 14, 6, W2)


def basket(pg, x, y, w, h):
    top = y - h
    body = Path().M(x - w * 0.5, top).L(x + w * 0.5, top).L(x + w * 0.38, y).L(x - w * 0.38, y).Z()
    pg.shape(body, W2)
    pg.clip(body)
    for j in range(1, 4):
        pg.line(Path().M(x - w, top + j * h / 4).L(x + w, top + j * h / 4), W3)
    for i in range(-6, 7):
        pg.line(Path().M(x + i * w / 6, top).L(x + i * w / 6 * 0.78, y), W3)
    pg.endclip()
    pg.line(Path().M(x - w * 0.5, top).C(x - w * 0.46, top - h * 0.9, x + w * 0.46, top - h * 0.9, x + w * 0.5, top), 7)
    pg.line(Path().M(x - w * 0.5, top).C(x - w * 0.46, top - h * 0.9, x + w * 0.46, top - h * 0.9, x + w * 0.5, top), 4, color='#fff')


def lemons(pg, x, y, w=150):
    """a bowl of lemons"""
    for (dx, dy, a) in ((-34, -42, 20), (0, -50, -10), (34, -40, -25), (-12, -68, 0)):
        pg.shape(ell(x + dx, y + dy, 24, 17, a), W2)
        pg.shape(ell(x + dx + 24 * math.cos(math.radians(a)), y + dy + 24 * math.sin(math.radians(a)), 4, 3, a), W3)
    pg.shape(Path().M(x - w / 2, y - 40).C(x - w / 2, y + 2, x - w * 0.3, y + 4, x - w * 0.2, y).L(x + w * 0.2, y).C(x + w * 0.3, y + 4, x + w / 2, y + 2, x + w / 2, y - 40).Z(), W2)
    pg.shape(ell(x, y - 40, w / 2, 9), W2)
    pg.line(Path().M(x - w * 0.38, y - 22).C(x - w * 0.1, y - 12, x + w * 0.1, y - 12, x + w * 0.38, y - 22), W3)


def plate_stack(pg, x, y, w=140, n=5):
    for i in range(n):
        yy = y - i * 11
        pg.shape(ell(x, yy, w / 2, 14), W2)
        pg.line(ell(x, yy, w * 0.4, 9), W3)


def hook_mug(pg, x, y, kind=0):
    pg.line(Path().M(x, y - 22).C(x + 12, y - 20, x + 12, y - 4, x, y), W2)
    pg.circle(x, y - 28, 6, W2)
    mug(pg, x, y + 74, 66, 64, steam=False)
    pg.shape(rrect(x - 24, y + 36, 48, 14, 3), W3)


def s_kitchen(pg):
    """a kitchen: a rail of hanging mugs and tools, then three shelves of jars, lemons, plates and baskets"""
    # the rail
    pg.shape(rrect(100, 120, 660, 14, 6), W1)
    for x in (116, 744):
        pg.circle(x, 127, 10, W2)
    for i, x in enumerate((180, 300, 420, 540)):
        hook_mug(pg, x, 150, i)
    # a ladle and a whisk hanging at the right
    for (x, kind) in ((640, 'ladle'), (700, 'whisk')):
        pg.line(Path().M(x, 134).L(x, 164), W2)
        if kind == 'ladle':
            pg.shape(rrect(x - 4, 164, 8, 150, 4), W2)
            pg.shape(Path().M(x - 6, 314).C(x - 40, 330, x - 40, 384, x, 384).C(x + 40, 384, x + 40, 330, x + 6, 314).Z(), W2)
        else:
            pg.shape(rrect(x - 5, 164, 10, 90, 5), W2)
            for sg in (-1, 1):
                pg.shape(Path().M(x - 4 * sg, 252).C(x - 38 * sg, 290, x - 36 * sg, 350, x, 372).C(x + 36 * sg, 350, x + 38 * sg, 290, x + 4 * sg, 252).Z(), W3) if sg < 0 else None
            pg.shape(Path().M(x, 252).C(x - 22, 290, x - 20, 340, x, 372).C(x + 20, 340, x + 22, 290, x, 252).Z(), W3)
    # shelves
    ys = [560, 770, 980]
    for y in ys:
        pg.shape(rrect(96, y, 668, 22, 5), W2)
        for sg in (-1, 1):
            bx = 430 + sg * 270
            pg.shape(Path().M(bx - 8, y + 22).L(bx + 8, y + 22).L(bx + 8, y + 56).C(bx + 8, y + 72, bx + sg * 34, y + 80, bx + sg * 44, y + 80).C(bx + sg * 8, y + 56, bx - 8, y + 56, bx - 8, y + 56).Z(), W3) if False else None
    # shelf 1: jars and a plant
    jar(pg, 180, 560, 110, 150, 'dots')
    jar(pg, 310, 560, 100, 190, 'beans')
    jar(pg, 430, 560, 96, 130, 'pasta')
    jar(pg, 548, 560, 108, 170, 'dots')
    pot(pg, 690, 560, 100, 84)
    for ang, L in ((-100, 76), (-60, 64), (-140, 64), (-80, 54)):
        draw_leaf(pg, 690, 484, ang, L, 20, 0.15, 2)
    # shelf 2: plates, lemons, a teapot, books
    plate_stack(pg, 170, 770, 150)
    lemons(pg, 330, 770, 150)
    teapot(pg, 530, 770, 0.8)
    book_stack(pg, 690, 770, 3, 120, 22, 2)
    # shelf 3: baskets, a board, a loaf, a cactus
    basket(pg, 170, 980, 150, 90)
    basket(pg, 340, 980, 120, 70)
    pg.shape(rrect(430, 860, 60, 120, 14), W2)
    pg.circle(460, 880, 6, W3)
    pg.shape(ell(590, 940, 66, 38), W2)
    for i in range(3):
        pg.line(Path().M(560 + i * 26, 916).L(554 + i * 26 + 22, 960), W3)
    pot(pg, 700, 980, 80, 70)
    pg.shape(rrect(684, 850, 32, 70, 14), W2)
    pg.shape(Path().M(684, 890).C(660, 888, 660, 860, 676, 860).C(676, 874, 684, 876, 684, 876).Z(), W2) if False else None
    pg.shape(ell(667, 880, 11, 22, 10), W2)
    pg.shape(ell(733, 872, 11, 24, -10), W2)


from ac_core import draw_leaf


# ================================================================ the bridge
def s_bridge(pg):
    """a stone bridge over a stream, with lamp posts, round trees, water lilies and reeds"""
    cx = CX
    cloud(pg, 220, 170, 190, 70)
    cloud(pg, 640, 250, 150, 58)
    pg.circle(600, 130, 36, W2)
    # far hills and trees
    pg.shape(Path().M(FX, 560).C(160, 440, 280, 430, 380, 500).C(480, 420, 620, 430, FX + FW, 540).L(FX + FW, 640).L(FX, 640).Z(), W2)
    for (x, b, h, w) in ((150, 560, 220, 150), (310, 540, 160, 110), (570, 540, 190, 130), (700, 570, 230, 160)):
        round_tree(pg, x, b, h, w, W2, leaf=True)
    # water
    water = Path().M(FX, 700).L(FX + FW, 700).L(FX + FW, FY + FH).L(FX, FY + FH).Z()
    pg.shape(water, W2)
    pg.clip(water)
    for row in range(10):
        y = 740 + row * 30
        P = Path()
        x = FX + ((row * 47) % 80)
        while x < FX + FW:
            ln = 50 + ((row * 13 + int(x)) % 40)
            P.M(x, y).C(x + ln * 0.3, y - 6, x + ln * 0.7, y + 6, x + ln, y)
            x += ln + 50
        pg.line(P, W3)
    pg.endclip()
    # the bridge: a deck, a parapet and three round arches with stone blocks
    body = Path().M(40, 600).L(820, 600).L(820, 790)
    arcs = [(cx + 290, 84), (cx, 150), (cx - 290, 84)]
    for (ax, ar) in arcs:
        body.L(ax + ar, 790)
        arc_to(body, ar, 0, -PI, ax, 790)
        body.L(ax - ar, 790)
    body.L(40, 790).Z()
    fill_region(pg, body, 'bricks', 44, 0, W1)
    pg.shape(rrect(40, 560, 780, 40, 8), W1)
    for i in range(18):
        x = 60 + i * 44
        pg.line(Path().M(x, 560).L(x, 600), W3)
    # lamp posts
    for x in (96, 764):
        pg.shape(rrect(x - 7, 440, 14, 122, 3), W2)
        pg.shape(rrect(x - 18, 546, 36, 14, 4), W2)
        pg.shape(Path().M(x - 22, 440).L(x + 22, 440).L(x + 16, 380).L(x - 16, 380).Z(), W2)
        pg.shape(Path().M(x - 26, 380).L(x, 346).L(x + 26, 380).Z(), W2)
        pg.circle(x, 340, 6, W2)
        pg.shape(rrect(x - 8, 392, 16, 36, 6), W3)
    # reeds and lilies
    for (x0, k) in ((70, 0), (690, 1)):
        for i in range(7):
            x = x0 + i * 18
            hh = 130 + ((i * 41 + k * 13) % 100)
            ctrl = [(x, 1030), (x + 5 * (i % 3 - 1), 1030 - hh * 0.4), (x + 12 * (1 if i % 2 else -1), 1030 - hh * 0.8), (x + 8 * (1 if i % 2 else -1), 1030 - hh)]
            stem(pg, ctrl, 6, 3)
            if i % 2 == 0:
                pg.shape(ell(0, 0, 8, 26).xf(mat(ctrl[3][0], ctrl[3][1] + 4, 1, False, 0)), W2)
    for (x, y, s) in ((340, 880, 1.0), (500, 920, 1.2), (400, 990, 1.1), (590, 850, 0.8)):
        pg.shape(ell(x, y, 50 * s, 18 * s), W2)
        pg.line(Path().M(x, y).L(x + 50 * s, y - 4 * s), W3)
        for a in (-0.6, 0, 0.6):
            pass
        pg.shape(ell(x - 14 * s, y - 10 * s, 14 * s, 8 * s, -10), W3)
        pg.shape(m_petal(20 * s, 7 * s).xf(mat(x - 26 * s, y - 24 * s, 1, False, -60)), W3) if False else None


# ================================================================ the greenhouse
def palm(pg, x, y, n=9, L=210):
    """a big potted palm: long drooping leaves fanning out from one point (x, y)"""
    for k in range(n):
        a = -170 + k * 160 / (n - 1)
        ll = L * (0.78 + 0.22 * math.sin(k * 1.9))
        draw_leaf(pg, x, y, a, ll, 22, curl=(-1 if a < -90 else 1) * 0.55, veins=0, mid=True)


def fig_leaf_plant(pg, x, base, h):
    """a tall plant with a trunk and big paddle leaves up its stem"""
    stem(pg, [(x, base), (x - 10, base - h * 0.4), (x + 12, base - h * 0.7), (x, base - h)], 12, 7)
    for k, (t, sg) in enumerate(((0.35, 1), (0.45, -1), (0.6, 1), (0.7, -1), (0.85, 1))):
        px = x + (-10 if t < 0.5 else 8)
        py = base - h * t
        draw_leaf(pg, px, py, -90 + sg * 62, 120 - 8 * k, 46, curl=-sg * 0.25, veins=4)
    draw_leaf(pg, x, base - h, -90, 90, 34, 0, 3)


def s_greenhouse(pg):
    """a greenhouse: glass panes with plants inside, hanging baskets, shelves of pots, a brick base and a path"""
    from ac_props import cloud
    cx = CX
    left, right, wall_top, ridge, floor = 110, 750, 480, 210, 880
    cloud(pg, 190, 140, 170, 64)
    cloud(pg, 690, 170, 140, 54)
    frame = Path().M(left, floor).L(left, wall_top).L(cx, ridge).L(right, wall_top).L(right, floor).Z()
    pg.shape(frame, W1)
    pg.clip(frame)
    # the back table with small pots
    pg.shape(rrect(left + 20, 770, right - left - 40, 16, 4), W2)
    for i, x in enumerate((190, 290, 400, 520, 630)):
        pot(pg, x, 770, 62, 52)
        for ang, L in ((-100, 46), (-60, 40), (-140, 40)):
            draw_leaf(pg, x, 720, ang + (i - 2) * 6, L, 13, 0.2, 2)
    for x in (230, 640):
        pg.line(Path().M(x - 20, 786).L(x - 20, floor), W2)
        pg.line(Path().M(x + 20, 786).L(x + 20, floor), W2)
    # two big plants
    pot(pg, 250, floor, 124, 104)
    palm(pg, 250, 790, 9, 230)
    pot(pg, 600, floor, 124, 104)
    fig_leaf_plant(pg, 600, 790, 280)
    # hanging baskets from the roof
    for (x, yb, top) in ((200, 470, 330), (430, 380, 215), (650, 470, 330)):
        pg.line(Path().M(x, top).L(x - 30, yb), W2)
        pg.line(Path().M(x, top).L(x + 30, yb), W2)
        pg.shape(Path().M(x - 36, yb).L(x + 36, yb).C(x + 34, yb + 36, x + 14, yb + 44, x, yb + 44).C(x - 14, yb + 44, x - 34, yb + 36, x - 36, yb).Z(), W2)
        for k in range(5):
            draw_leaf(pg, x - 24 + k * 12, yb + 2, 90 + (k - 2) * 24, 60 + (k % 2) * 16, 12, 0.1, 0)
    pg.endclip()
    # the glazing bars over everything
    for i in range(1, 10):
        x = left + i * (right - left) / 10
        ytop = ridge + (wall_top - ridge) * abs(x - cx) / (cx - left)
        pg.shape(rrect(x - 3.5, ytop, 7, floor - ytop, 2), W2)
    for y in (580, 690):
        pg.shape(rrect(left, y - 3.5, right - left, 7, 2), W2)
    pg.line(frame, W1)
    pg.shape(Path().M(left - 18, wall_top + 8).L(cx, ridge - 18).L(right + 18, wall_top + 8).L(right + 18, wall_top - 10).L(cx, ridge - 38).L(left - 18, wall_top - 10).Z(), W2)
    pg.circle(cx, ridge - 46, 8, W2)
    base = rrect(left - 14, floor, right - left + 28, 70, 4)
    fill_region(pg, base, 'bricks', 40, 0, W2)
    path = Path().M(cx - 80, floor + 70).L(cx + 80, floor + 70).L(cx + 170, FY + FH - 9).L(cx - 170, FY + FH - 9).Z()
    fill_region(pg, path, 'bricks', 48, 0, W2)
    for (x, y, R) in ((150, 1000, 32), (260, 1020, 28), (610, 1020, 28), (720, 1000, 32)):
        draw_leaf(pg, x, y + 30, -120, 56, 15, 0.2, 2)
        draw_leaf(pg, x, y + 30, -60, 56, 15, -0.2, 2)
        daisy(pg, x, y, R, 0.2, 11)
