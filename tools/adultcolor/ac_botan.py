#!/usr/bin/env python3
"""ac_botan.py: plants, flowers and small decorative insects for "Color and Breathe" (adultcolor29), plus the botanical pages.

Every part is a closed, white-filled Bezier shape drawn back to front. Stems are narrow closed ribbons (not single lines) so they
can be colored too. Butterflies and bees are small decorative touches only."""
import math
from ac_core import *
from ac_mandala import band_round, band_petals, circ_ring, m_petal, m_round, m_drop, m_eye, flower as ring_flower, dots


# ---------------------------------------------------------------- parts
def bez_pt(p, t):
    return bez(p[0], p[1], p[2], p[3], t)


def bez_tan(p, t):
    u = 1 - t
    dx = 3 * u * u * (p[1][0] - p[0][0]) + 6 * u * t * (p[2][0] - p[1][0]) + 3 * t * t * (p[3][0] - p[2][0])
    dy = 3 * u * u * (p[1][1] - p[0][1]) + 6 * u * t * (p[2][1] - p[1][1]) + 3 * t * t * (p[3][1] - p[2][1])
    return math.atan2(dy, dx)


def bez_path(p):
    return Path().M(*p[0]).C(*p[1], *p[2], *p[3])


def stem(pg, ctrl, w0=8, w1=6, w=W2):
    """a stem as a closed ribbon along a Bezier (4 points) or through points"""
    if len(ctrl) == 4:
        pts = [bez_pt(ctrl, i / 12) for i in range(13)]
    else:
        pts = ctrl
    pg.shape(ribbon(pts, w0, w1, n=18), w)


def daisy(pg, x, y, R, a0=0.0, n=14, core=0.3):
    """a daisy: long petals around a centre with an inner ring"""
    band_round(pg, x, y, R * core, R, n, a0, W2, vein=False, spread=1.05)
    pg.circle(x, y, R * core * 0.62, W3)
    pg.circle(x, y, R * core * 0.2, W3)


def cosmos(pg, x, y, R, a0=0.0):
    band_round(pg, x, y, R * 0.24, R, 8, a0, W2, spread=1.12)
    for k in range(8):
        a = a0 + k * TAU / 8
        pg.line(Path().M(*polar(R * 0.45, a, x, y)).L(*polar(R * 0.72, a, x, y)), W3)
    pg.circle(x, y, R * 0.16, W3)


def poppy(pg, x, y, R, a0=0.0):
    """a poppy: four broad crinkled petals, a seed pod and a ring of stamens"""
    for k, a in enumerate((0.0, PI / 2, PI, PI * 1.5)):
        e = Path().M(0, 0).C(R * 0.25, -R * 0.75, R * 1.05, -R * 0.78, R * 1.0, -R * 0.1).C(R * 1.06, R * 0.5, R * 0.3, R * 0.82, 0, 0).Z()
        pg.shape(at(e, x, y, math.degrees(a + a0) + 20), W2)
        pg.line(at(Path().M(R * 0.34, 0).C(R * 0.5, -R * 0.12, R * 0.62, -R * 0.1, R * 0.74, -R * 0.02), x, y, math.degrees(a + a0) + 20), W3)
    pg.circle(x, y, R * 0.2, W2)
    for k in range(10):
        a = a0 + k * TAU / 10
        pg.line(Path().M(*polar(R * 0.27, a, x, y)).L(*polar(R * 0.4, a, x, y)), W3)
        pg.dot(*polar(R * 0.43, a, x, y), 1.6)


def rose(pg, x, y, R, a0=0.0):
    """a rose seen from above: five outer petals, then rings of smaller ones and a curl in the middle"""
    for k in range(5):
        a = a0 + k * TAU / 5
        pg.shape(ell(0, 0, R * 0.5, R * 0.42).xf(mat(*polar(R * 0.55, a, x, y), 1, False, math.degrees(a))), W2)
    for k in range(5):
        a = a0 + PI / 5 + k * TAU / 5
        pg.shape(ell(0, 0, R * 0.36, R * 0.3).xf(mat(*polar(R * 0.34, a, x, y), 1, False, math.degrees(a))), W2)
    pg.shape(circ(x, y, R * 0.3), W2)
    pg.line(curve(spiral_pts(x, y, 2, R * 0.2, 1.6, a0, 16)), W3)


def tulip(pg, x, y, w, h, ang=0.0):
    """a tulip head (base at x, y, tip up before rotation)"""
    side = Path().M(0, 0).C(-w * 0.62, -h * 0.05, -w * 0.62, -h * 0.75, -w * 0.12, -h * 0.98).C(-w * 0.1, -h * 0.55, -w * 0.18, -h * 0.25, 0, 0).Z()
    pg.shape(at(side, x, y, ang), W2)
    pg.shape(at(mirror_x(side), x, y, ang), W2)
    mid = Path().M(0, 0).C(-w * 0.5, -h * 0.12, -w * 0.38, -h * 0.9, 0, -h * 1.08).C(w * 0.38, -h * 0.9, w * 0.5, -h * 0.12, 0, 0).Z()
    pg.shape(at(mid, x, y, ang), W2)
    pg.line(at(Path().M(0, -h * 0.12).L(0, -h * 0.82), x, y, ang), W3)


def bellflower(pg, x, y, R, a0=0.0):
    pts = []
    n = 5
    P = Path()
    for k in range(n):
        a = a0 + k * TAU / n
        tip = polar(R, a, x, y)
        va = polar(R * 0.42, a + TAU / (2 * n), x, y)
        if k == 0:
            P.M(*polar(R * 0.42, a - TAU / (2 * n), x, y))
        P.C(*polar(R * 0.7, a - TAU / (2 * n) * 0.9, x, y), *polar(R * 1.02, a - TAU / (n * 5), x, y), *tip)
        P.C(*polar(R * 1.02, a + TAU / (n * 5), x, y), *polar(R * 0.7, a + TAU / (2 * n) * 0.9, x, y), *va)
    P.Z()
    pg.shape(P, W2)
    for k in range(n):
        a = a0 + k * TAU / n
        pg.line(Path().M(*polar(R * 0.2, a, x, y)).L(*polar(R * 0.62, a, x, y)), W3)
    pg.circle(x, y, R * 0.14, W3)


def lavender(pg, x, y, L, ang=-90.0, n=9, w=10):
    """a lavender spike: pairs of small drops up a stem, bottom to top getting smaller (drawn pointing along ang from x, y)"""
    for k in range(n):
        t = (k + 0.5) / n
        s = 1 - 0.5 * t
        px = L * (0.32 + 0.68 * t)
        for sg in (-1, 1):
            e = m_drop(w * 1.9 * s, w * 0.42 * s)
            pg.shape(at(e, 0, 0, sg * 38 - 0).xf(mat(0, 0, 1)).xf(mat(px, 0, 1)).xf(mat(x, y, 1, False, ang)) if False else at(at(e, px, 0, sg * 38), x, y, ang), W2)
    pg.shape(at(m_drop(w * 1.5, w * 0.34), L * 1.0, 0, 0).xf(mat(0, 0, 1)).xf(mat(x, y, 1, False, ang)) if False else at(at(m_drop(w * 1.5, w * 0.34), L * 1.0, 0, 0), x, y, ang), W2)


def berry_sprig(pg, x, y, L, ang, n=3):
    """a thin stem with round berries on short stalks"""
    P = Path().M(0, 0).C(L * 0.3, L * 0.06, L * 0.7, -L * 0.04, L, 0)
    pg.line(at(P, x, y, ang), W2)
    for k in range(n):
        t = 0.45 + 0.55 * k / max(1, n - 1)
        bx, by = L * t, 0
        sg = 1 if k % 2 == 0 else -1
        ex, ey = bx + L * 0.08, sg * L * 0.2
        q = at(Path().M(bx, by).L(ex, ey), x, y, ang)
        pg.line(q, W3)
        px, py = apply(mat(x, y, 1, False, ang), (ex + L * 0.04, ey + sg * L * 0.04))
        pg.circle(px, py, L * 0.09, W2)


def butterfly(pg, x, y, s=1.0, ang=0.0):
    """a butterfly seen from above: big upper wings, small lower wings, a body and two feelers (s = half wingspan in units)"""
    def wing(sg):
        up = Path().M(0, 0).C(s * 0.15 * sg, -s * 0.5, s * 0.75 * sg, -s * 1.0, s * 1.0 * sg, -s * 0.62).C(s * 1.12 * sg, -s * 0.28, s * 0.7 * sg, s * 0.06, 0, s * 0.06).Z()
        lo = Path().M(0, s * 0.05).C(s * 0.7 * sg, s * 0.0, s * 0.85 * sg, s * 0.52, s * 0.5 * sg, s * 0.74).C(s * 0.25 * sg, s * 0.88, s * 0.06 * sg, s * 0.5, 0, s * 0.05).Z()
        return lo, up
    for sg in (-1, 1):
        lo, up = wing(sg)
        pg.shape(at(lo, x, y, ang), W2)
        pg.shape(at(up, x, y, ang), W2)
        # an inner wing shape and spots
        pg.line(at(Path().M(s * 0.12 * sg, -s * 0.08).C(s * 0.3 * sg, -s * 0.5, s * 0.62 * sg, -s * 0.74, s * 0.82 * sg, -s * 0.55).C(s * 0.9 * sg, -s * 0.34, s * 0.55 * sg, -s * 0.06, s * 0.12 * sg, -s * 0.08), x, y, ang), W3)
        pg.circle(*apply(mat(x, y, 1, False, ang), (s * 0.5 * sg, -s * 0.38)), max(3.0, s * 0.09), W3)
        pg.circle(*apply(mat(x, y, 1, False, ang), (s * 0.36 * sg, s * 0.4)), max(2.6, s * 0.07), W3)
    pg.line(at(Path().M(0, -s * 0.1).C(-s * 0.14, -s * 0.5, -s * 0.28, -s * 0.66, -s * 0.34, -s * 0.74), x, y, ang), W3)
    pg.line(at(Path().M(0, -s * 0.1).C(s * 0.14, -s * 0.5, s * 0.28, -s * 0.66, s * 0.34, -s * 0.74), x, y, ang), W3)
    pg.shape(at(ell(0, s * 0.3, s * 0.09, s * 0.52), x, y, ang), W2)
    pg.shape(at(circ(0, -s * 0.22, s * 0.1), x, y, ang), W2)


def bee(pg, x, y, s=1.0, ang=0.0):
    """a small bee (s = body length)"""
    for sg in (-1, 1):
        pg.shape(at(ell(-s * 0.05, -s * 0.34 * sg, s * 0.3, s * 0.17, 20 * sg), x, y, ang), W3)
    pg.shape(at(ell(0, 0, s * 0.5, s * 0.3), x, y, ang), W2)
    for k in (-0.16, 0.12):
        pg.line(at(Path().M(s * k, -s * 0.28).C(s * k + s * 0.06, -s * 0.1, s * k + s * 0.06, s * 0.1, s * k, s * 0.28), x, y, ang), W3)
    pg.shape(at(circ(s * 0.52, 0, s * 0.2), x, y, ang), W2)
    pg.line(at(Path().M(s * 0.62, -s * 0.1).C(s * 0.74, -s * 0.28, s * 0.82, -s * 0.3, s * 0.88, -s * 0.3), x, y, ang), W3)


def pot(pg, x, y, w, h, band=True, w2=W2):
    """a terracotta pot (x, y = bottom centre)"""
    top = y - h
    body = Path().M(x - w * 0.5, top + h * 0.22).L(x + w * 0.5, top + h * 0.22).L(x + w * 0.36, y - h * 0.02).C(x + w * 0.35, y, x + w * 0.3, y, x + w * 0.28, y).L(x - w * 0.28, y).C(x - w * 0.3, y, x - w * 0.35, y, x - w * 0.36, y - h * 0.02).Z()
    pg.shape(body, w2)
    pg.shape(rrect(x - w * 0.56, top, w * 1.12, h * 0.26, 5), w2)
    if band:
        pg.line(Path().M(x - w * 0.44, top + h * 0.5).L(x + w * 0.44, top + h * 0.5), W3)
        n = 6
        for i in range(n):
            cx = x - w * 0.36 + (i + 0.5) * w * 0.72 / n
            pg.shape(m_diamond_s(cx, top + h * 0.7, w * 0.07, h * 0.1), W3)


def m_diamond_s(x, y, a, b):
    return Path().M(x, y - b).L(x + a, y).L(x, y + b).L(x - a, y).Z()


def grass(pg, x0, x1, y, h0=40, h1=90, step=14, seed=0, w=7):
    """blades of grass standing on y: narrow closed leaves leaning a little"""
    x = x0
    i = 0
    while x < x1:
        hh = h0 + (h1 - h0) * (0.5 + 0.5 * math.sin(i * 2.399 + seed))
        lean = math.sin(i * 1.7 + seed) * 12
        P = Path().M(x - w / 2, y).C(x - w / 2 + lean * 0.3, y - hh * 0.5, x + lean * 0.8, y - hh * 0.85, x + lean, y - hh).C(x + w / 2 + lean * 0.5, y - hh * 0.6, x + w / 2, y - hh * 0.3, x + w / 2, y).Z()
        pg.shape(P, W3)
        x += step
        i += 1


def fern(pg, ctrl, n=16, L0=70, wd=15, tipk=0.22, w=W2, flip=1):
    """a fern frond: a curved spine with pairs of leaflets getting smaller toward the tip"""
    for k in range(n, 0, -1):
        t = k / (n + 1)
        px, py = bez_pt(ctrl, t)
        ang = bez_tan(ctrl, t)
        s = max(tipk, (1 - t) ** 0.85)
        L = L0 * s
        for sg in (-1, 1):
            a = math.degrees(ang) + sg * (68 - 28 * t)
            draw_leaf(pg, px, py, a, L, wd * s * 0.62, curl=-sg * 0.35, veins=0, mid=True, w=w)
    stem(pg, ctrl, 8, 3, W2)
    tx, ty = ctrl[3]
    ang = bez_tan(ctrl, 1.0)
    draw_leaf(pg, tx - math.cos(ang) * 6, ty - math.sin(ang) * 6, math.degrees(ang), L0 * tipk * 1.5, wd * tipk * 0.7, 0, 0, mid=True)


def fiddlehead(pg, x, y, R, a0=0.0, w=8):
    """an unfurling fern tip: a spiral ribbon"""
    pts = spiral_pts(x, y, R * 0.15, R, 1.6, a0, 24)
    pg.shape(ribbon(pts[::-1], 3.5, w, n=30), W2)


# ============================================================== the pages
def b_wreath(pg):
    """a laurel wreath: two branches of leaves climbing from the bottom, flowers at the top, berries and a butterfly"""
    cx, cy = CX, CY - 6
    R = 252
    for sg in (-1, 1):
        n = 11
        for k in range(n):
            th = PI / 2 - sg * (k + 0.5) * (PI * 0.93) / n
            px, py = polar(R, th, cx, cy)
            d = th - sg * PI / 2
            for out in (1, -1):
                a = math.degrees(d) + out * 38
                L = 100 - k * 1.6
                draw_leaf(pg, px, py, a, L, 28, curl=-out * 0.25 * sg, veins=3)
    for sg in (-1, 1):
        Q = Path()
        arc_to(Q, R, PI / 2, PI / 2 - sg * PI * 0.97, cx, cy, move=True)
        pts = sample_path(Q)
        pg.shape(ribbon(pts[::4] + [pts[-1]], 8, 4, n=30), W2)
    # berry sprigs on the outside of the branches
    for (th, a) in ((PI / 2 - 0.9, -52), (PI / 2 + 0.9, -128), (0.35, -56), (PI - 0.35, -124), (-0.55, -40), (PI + 0.55, -140)):
        px, py = polar(R + 8, th, cx, cy)
        berry_sprig(pg, px, py, 70, math.degrees(th) + (28 if th < PI / 2 else -28) * 0, 3)
    fx, fy = cx, cy - R - 4
    daisy(pg, fx - 80, fy + 22, 48, 0.2, 12)
    daisy(pg, fx + 82, fy + 22, 48, 0.5, 12)
    poppy(pg, fx, fy - 8, 68, 0.3)
    draw_leaf(pg, cx, cy + R + 10, 112, 74, 20, 0.3, 3)
    draw_leaf(pg, cx, cy + R + 10, 68, 74, 20, -0.3, 3)
    butterfly(pg, cx, cy - 6, 118, 0)
    for (x, y) in ((cx - 150, cy + 130), (cx + 150, cy + 130), (cx - 160, cy - 130), (cx + 160, cy - 130)):
        cosmos(pg, x, y, 34, 0.3)


# ---------------------------------------------------------------- more parts
def serrated_leaf(L, wd, teeth=5):
    """a leaf with a toothed edge (mint, nettle): from (0,0) to (L,0)"""
    top, bot = [], []
    for i in range(teeth * 2 + 1):
        t = i / (teeth * 2)
        w = wd * math.sin(PI * t ** 0.9) * (1.0 if i % 2 == 0 else 0.82)
        top.append((L * t, -w))
        bot.append((L * t, w))
    pts = [(0, 0, 'c')] + top[1:-1] + [(L, 0, 'c')] + bot[-2:0:-1]
    return blob(pts, closed=True, k=0.7)


def draw_serr(pg, x, y, ang, L, wd, teeth=4):
    pg.shape(at(serrated_leaf(L, wd, teeth), x, y, ang), W2)
    pg.line(at(Path().M(L * 0.05, 0).L(L * 0.86, 0), x, y, ang), W3)
    for t in (0.3, 0.55, 0.75):
        for sg in (-1, 1):
            pg.line(at(Path().M(L * t, 0).L(L * (t + 0.12), sg * wd * 0.55), x, y, ang), W3)


def sprig(pg, ctrl, kind='round', n=7, L=40, wd=11):
    """a leafy stem: leaves in pairs or singly along a Bezier"""
    stem(pg, ctrl, 6, 3)
    for k in range(n):
        t = 0.25 + 0.75 * k / max(1, n - 1)
        px, py = bez_pt(ctrl, t)
        ang = math.degrees(bez_tan(ctrl, t))
        s = 1 - 0.35 * t
        for sg in (-1, 1) if kind != 'alt' else ((-1,) if k % 2 else (1,)):
            if kind == 'serr':
                draw_serr(pg, px, py, ang + sg * 58, L * s, wd * s, 3)
            else:
                draw_leaf(pg, px, py, ang + sg * 58, L * s, wd * s, curl=-sg * 0.2, veins=0, mid=True)


def watering_can(pg, x, y, s=1.0):
    """a small watering can standing on y (x = centre)"""
    k = s
    body = rrect(x - 70 * k, y - 100 * k, 120 * k, 100 * k, 16 * k)
    # handle
    hp = Path().M(x - 60 * k, y - 92 * k).C(x - 126 * k, y - 104 * k, x - 126 * k, y - 20 * k, x - 66 * k, y - 18 * k)
    pg.line(hp, 12 * k)
    pg.line(hp, 9 * k, color='#fff')
    # spout
    sp = Path().M(x + 44 * k, y - 28 * k).L(x + 128 * k, y - 104 * k).L(x + 140 * k, y - 94 * k).L(x + 50 * k, y - 66 * k).Z()
    pg.shape(sp, W2)
    pg.shape(ellipse_rot(x + 134 * k, y - 100 * k, 22 * k, 9 * k, 42), W2)
    pg.shape(body, W2)
    pg.line(Path().M(x - 58 * k, y - 78 * k).L(x + 38 * k, y - 78 * k), W3)
    pg.line(Path().M(x - 58 * k, y - 22 * k).L(x + 38 * k, y - 22 * k), W3)
    pg.shape(ell(x - 10 * k, y - 100 * k, 40 * k, 7 * k), W2)


def ellipse_rot(cx, cy, rx, ry, deg):
    return ell(0, 0, rx, ry).xf(mat(cx, cy, 1, False, deg))


def bow(pg, x, y, s=1.0, ang=0.0):
    """a ribbon bow: two loops, a knot and two tails"""
    for sg in (-1, 1):
        loop = Path().M(0, 0).C(s * 20 * sg, -s * 52, s * 78 * sg, -s * 60, s * 76 * sg, -s * 10).C(s * 74 * sg, s * 26, s * 30 * sg, s * 22, 0, 0).Z()
        pg.shape(at(loop, x, y, ang), W2)
        pg.line(at(Path().M(s * 18 * sg, -s * 6).C(s * 34 * sg, -s * 26, s * 54 * sg, -s * 28, s * 62 * sg, -s * 12), x, y, ang), W3)
        tail = Path().M(0, 0).C(s * 14 * sg, s * 30, s * 32 * sg, s * 62, s * 44 * sg, s * 96).L(s * 18 * sg, s * 84).L(s * 4 * sg, s * 104).C(s * 2 * sg, s * 60, 0, s * 30, 0, 0).Z()
        pg.shape(at(tail, x, y, ang), W2)
    pg.shape(at(rrect(-s * 14, -s * 14, s * 28, s * 28, s * 8), x, y, ang), W2)


def vase(pg, x, y, w, h, kind='round'):
    """a vase standing on y (x = centre), with a patterned band"""
    top = y - h
    body = Path().M(x - w * 0.16, top).C(x - w * 0.12, top + h * 0.2, x - w * 0.5, top + h * 0.32, x - w * 0.5, top + h * 0.62)
    body.C(x - w * 0.5, y - h * 0.04, x - w * 0.3, y, x - w * 0.2, y).L(x + w * 0.2, y).C(x + w * 0.3, y, x + w * 0.5, y - h * 0.04, x + w * 0.5, top + h * 0.62)
    body.C(x + w * 0.5, top + h * 0.32, x + w * 0.12, top + h * 0.2, x + w * 0.16, top).Z()
    pg.shape(body, W2)
    pg.shape(ell(x, top, w * 0.2, h * 0.035), W2)
    # a band with diamonds and a line of dots
    yb = top + h * 0.6
    pg.line(Path().M(x - w * 0.49, yb - h * 0.1).C(x - w * 0.2, yb - h * 0.04, x + w * 0.2, yb - h * 0.04, x + w * 0.49, yb - h * 0.1), W3)
    pg.line(Path().M(x - w * 0.49, yb + h * 0.1).C(x - w * 0.2, yb + h * 0.16, x + w * 0.2, yb + h * 0.16, x + w * 0.49, yb + h * 0.1), W3)
    for i in range(7):
        t = (i + 0.5) / 7
        px = x - w * 0.42 + t * w * 0.84
        py = yb + h * 0.03 + (0.03 - (t - 0.5) ** 2 * 0.12) * h * 0
        pg.shape(m_diamond_s(px, py, w * 0.045, h * 0.065), W3)


def stem_leafed(pg, base, head, bend=0.0, leaves=1, leaf=(60, 18), w0=8, w1=5, side=1):
    """a stem from base to head (a gentle S), with leaves on it; returns the stem control points"""
    bx, by = base
    hx, hy = head
    dx, dy = hx - bx, hy - by
    nx, ny = -dy, dx
    nl = math.hypot(nx, ny) or 1
    nx, ny = nx / nl * bend, ny / nl * bend
    ctrl = [(bx, by), (bx + dx * 0.3 + nx, by + dy * 0.3 + ny), (bx + dx * 0.7 - nx * 0.5, by + dy * 0.7 - ny * 0.5), (hx, hy)]
    # leaves first (behind), then the stem
    for k in range(leaves):
        t = 0.28 + 0.3 * k
        px, py = bez_pt(ctrl, t)
        ang = math.degrees(bez_tan(ctrl, t))
        sg = side if k % 2 == 0 else -side
        draw_leaf(pg, px, py, ang + sg * 52, leaf[0] * (1 - 0.12 * k), leaf[1], curl=-sg * 0.3, veins=2)
    stem(pg, ctrl, w0, w1)
    return ctrl


# ============================================================== botanical pages
def b_fern(pg):
    """three fern ffronds growing up from the bottom, with an unfurling fiddlehead"""
    fern(pg, [(280, 1090), (190, 900), (110, 700), (150, 400)], n=15, L0=150, wd=44)
    fern(pg, [(580, 1090), (660, 920), (740, 720), (700, 470)], n=14, L0=140, wd=40)
    fern(pg, [(430, 1090), (380, 820), (520, 520), (390, 160)], n=19, L0=190, wd=52)
    fiddlehead(pg, 520, 960, 40, 0.5)
    stem(pg, [(520, 1090), (506, 1040), (498, 990), (498, 962)], 9, 6)
    fiddlehead(pg, 340, 930, 34, 2.4)
    stem(pg, [(340, 1090), (335, 1030), (338, 975), (342, 944)], 8, 5)


def b_meadow(pg):
    """a meadow: stems of different heights with daisies, poppies, tulips, bellflowers and lavender, a butterfly and a bee"""
    gy = 1020
    back = [(120, 470, 'bell', 36), (250, 380, 'lav', 0), (350, 520, 'bell', 32), (560, 400, 'lav', 0), (690, 480, 'bell', 36), (440, 330, 'tulip', 0), (160, 280, 'lav', 0), (730, 300, 'lav', 0)]
    for (x, y, kind, R) in back:
        stem_leafed(pg, (x, gy), (x, y + (30 if kind == 'lav' else 18)), bend=18 * (1 if x < 430 else -1), leaves=1, leaf=(60, 14), w0=8, w1=5)
        if kind == 'bell':
            bellflower(pg, x, y, R * 1.5, 0.2)
        elif kind == 'lav':
            lavender(pg, x, y + 96, 100, -90, 9, 12)
        else:
            tulip(pg, x, y + 46, 84, 110, 0)
    front = [(118, 780, 'daisy', 58), (270, 700, 'poppy', 70), (420, 800, 'cosmos', 62), (560, 690, 'daisy', 62), (700, 790, 'poppy', 66), (340, 600, 'daisy', 44), (640, 590, 'cosmos', 44), (200, 900, 'cosmos', 44), (520, 910, 'daisy', 44)]
    for (x, y, kind, R) in front:
        stem_leafed(pg, (x + (x - 430) * 0.1, gy), (x, y), bend=22 * (1 if x % 2 else -1), leaves=2, leaf=(96, 28), w0=10, w1=6)
    for (x, y, kind, R) in front:
        if kind == 'daisy':
            daisy(pg, x, y, R, 0.1)
        elif kind == 'poppy':
            poppy(pg, x, y, R, 0.3)
        else:
            cosmos(pg, x, y, R, 0.2)
    grass(pg, FX + 12, FX + FW - 12, gy, 36, 90, 15, 1.0)
    butterfly(pg, 560, 200, 80, -12)
    bee(pg, 230, 170, 46, -20)
    pg.line(Path().M(250, 182).C(300, 220, 320, 130, 370, 170), W3, dash='1 7')


def b_gate(pg):
    """a garden gate in an arched opening of a brick wall, roses over the arch, a path and a garden beyond"""
    from ac_zen import fill_region
    cx = CX
    gy = 1000
    # sky and trees behind the wall
    pg.circle(660, 170, 40, W2)
    for k in range(16):
        a = k * TAU / 16
        pg.line(Path().M(*polar(52, a, 660, 170)).L(*polar(70 if k % 2 == 0 else 62, a, 660, 170)), W2)
    from ac_props import cloud, round_tree
    cloud(pg, 220, 180, 220, 84)
    for (x, h, w) in ((150, 250, 170), (330, 200, 140), (560, 230, 160), (730, 280, 180)):
        round_tree(pg, x, 600, h, w, W2, leaf=True)
    # the wall
    wall = rrect(FX + 9, 590, FW - 18, gy - 590 + 40, 0)
    fill_region(pg, wall, 'bricks', 44, 0, W2)
    pg.shape(rrect(FX + 9, 574, FW - 18, 24, 3), W2)
    # the arched opening, with the garden beyond
    ox0, ox1, oy = 262, 598, 720
    r = (ox1 - ox0) / 2
    opening = Path().M(ox0, gy + 10).L(ox0, oy)
    arc_to(opening, r, PI, TAU, cx, oy)
    opening.L(ox1, gy + 10).Z()
    pg.shape(opening, W1)
    pg.clip(opening)
    pg.shape(Path().M(ox0, 800).C(ox0 + 60, 740, ox0 + 160, 730, cx, 770).C(cx + 90, 730, ox1 - 40, 740, ox1, 800).L(ox1, gy).L(ox0, gy).Z(), W2)
    round_tree(pg, 340, 800, 110, 80, W2, leaf=False)
    round_tree(pg, 520, 800, 130, 90, W2, leaf=False)
    path = Path().M(cx - 14, 800).C(cx - 40, 850, cx + 40, 880, cx - 30, 930).L(cx - 90, gy).L(cx + 110, gy).C(cx + 30, 930, cx + 90, 880, cx + 20, 840).C(cx + 12, 826, cx + 12, 812, cx + 14, 800).Z()
    pg.shape(path, W2)
    pg.endclip()
    # the gate: bars, two rails and scrolls at the top
    for i in range(-3, 4):
        x = cx + i * 40
        top = oy - math.sqrt(max(0.0, (r - 12) ** 2 - (x - cx) ** 2)) + 6
        pg.shape(Path().M(x - 5, gy + 6).L(x - 5, top + 14).L(x, top - 8).L(x + 5, top + 14).L(x + 5, gy + 6).Z(), W2)
    for yy in (760, 900):
        pg.shape(rrect(ox0 + 6, yy, ox1 - ox0 - 12, 14, 5), W2)
    for sg in (-1, 1):
        pg.circle(cx + sg * 80, 830, 26, W2)
        pg.circle(cx + sg * 80, 830, 11, W3)
    pg.circle(cx, 830, 26, W2)
    pg.circle(cx, 830, 11, W3)
    ring = Path()
    arc_to(ring, r - 6, PI, TAU, cx, oy, move=True)
    pg.line(ring, W1)
    # roses over the arch and up the wall
    for k in range(9):
        a = PI + (k + 0.5) * PI / 9
        x, y = polar(r + 22, a, cx, oy)
        draw_leaf(pg, x, y, math.degrees(a) + 90 - 40, 60, 17, 0.2, 2)
        draw_leaf(pg, x, y, math.degrees(a) + 90 + 150, 60, 17, -0.2, 2)
    for k in range(9):
        a = PI + (k + 0.5) * PI / 9
        x, y = polar(r + 22, a, cx, oy)
        rose(pg, x, y, 30 if k in (0, 4, 8) else 24, k)
    for (x, y, R) in ((ox0 - 40, 840, 28), (ox0 - 90, 930, 26), (ox1 + 40, 830, 28), (ox1 + 90, 920, 26)):
        draw_leaf(pg, x, y, -70, 62, 18, 0.2, 2)
        draw_leaf(pg, x, y, -110, 62, 18, -0.2, 2)
        rose(pg, x, y, R, x)
    for (x, y, R) in ((140, 980, 32), (230, 1000, 26), (630, 1000, 26), (720, 980, 32)):
        draw_leaf(pg, x, y + 20, -120, 60, 15, 0.2, 2)
        draw_leaf(pg, x, y + 20, -60, 60, 15, -0.2, 2)
        daisy(pg, x, y, R, 0.2, 11)
    grass(pg, FX + 12, FX + FW - 12, FY + FH - 6, 20, 52, 15, 3.0)


def b_herbs(pg):
    """four herbs in terracotta pots on a shelf, a watering can and small plants on the shelf below"""
    shelf1, shelf2 = 560, 880
    xs = [150, 330, 510, 690]
    # basil
    for (x, plant) in zip(xs, ('basil', 'rosemary', 'mint', 'thyme')):
        tops = []
        if plant == 'basil':
            for (dx, ty, bend) in ((-34, 270, 14), (0, 220, 0), (34, 280, -14)):
                ctrl = [(x + dx * 0.5, shelf1 - 100), (x + dx * 0.7, shelf1 - 180), (x + dx * 1.2, ty + 90), (x + dx * 1.4, ty + 30)]
                stem(pg, ctrl, 6, 4)
                for k in range(3):
                    t = 0.45 + 0.28 * k
                    px, py = bez_pt(ctrl, t)
                    for sg in (-1, 1):
                        pg.shape(at(m_drop(52, 22), px, py, math.degrees(bez_tan(ctrl, t)) + sg * 60), W2) if False else draw_leaf(pg, px, py, math.degrees(bez_tan(ctrl, t)) + sg * 62, 54 - 6 * k, 21, 0.2 * sg, 2)
                draw_leaf(pg, x + dx * 1.4, ty + 30, -90 + dx * 0.4, 56, 22, 0, 2)
        elif plant == 'rosemary':
            for (dx, ty) in ((-40, 300), (0, 230), (40, 310), (-14, 380), (22, 400)):
                ctrl = [(x + dx * 0.3, shelf1 - 100), (x + dx * 0.6, shelf1 - 160), (x + dx * 1.0, ty + 120), (x + dx * 1.1, ty)]
                for k in range(11):
                    t = 0.3 + 0.7 * k / 10
                    px, py = bez_pt(ctrl, t)
                    a = math.degrees(bez_tan(ctrl, t))
                    for sg in (-1, 1):
                        draw_leaf(pg, px, py, a + sg * 62, 38 - 8 * t, 5.5, 0, 0, mid=False)
                stem(pg, ctrl, 5, 3)
        elif plant == 'mint':
            for (dx, ty) in ((-34, 300), (6, 240), (40, 330)):
                ctrl = [(x + dx * 0.4, shelf1 - 100), (x + dx * 0.7, shelf1 - 170), (x + dx * 1.0, ty + 100), (x + dx * 1.1, ty)]
                stem(pg, ctrl, 5, 3)
                for k in range(3):
                    t = 0.5 + 0.22 * k
                    px, py = bez_pt(ctrl, t)
                    a = math.degrees(bez_tan(ctrl, t))
                    for sg in (-1, 1):
                        draw_serr(pg, px, py, a + sg * 55, 46 - 6 * k, 17, 3)
                draw_serr(pg, x + dx * 1.1, ty, -90, 48, 18, 3)
        else:
            for (dx, ty) in ((-46, 410), (-8, 340), (34, 390), (-26, 450)):
                ctrl = [(x + dx * 0.3, shelf1 - 100), (x + dx * 0.6, shelf1 - 140), (x + dx * 1.0, ty + 60), (x + dx * 1.1, ty)]
                stem(pg, ctrl, 4, 2.6)
                for k in range(7):
                    t = 0.3 + 0.7 * k / 6
                    px, py = bez_pt(ctrl, t)
                    for sg in (-1, 1):
                        a = math.radians(math.degrees(bez_tan(ctrl, t)) + sg * 70)
                        pg.shape(ell(0, 0, 10, 6).xf(mat(px + math.cos(a) * 10, py + math.sin(a) * 10, 1, False, math.degrees(a))), W2)
    # pots, tags and the shelf
    for (x, name) in zip(xs, ('basil', 'rosemary', 'mint', 'thyme')):
        pot(pg, x, shelf1, 128, 108)
        pg.shape(rrect(x - 30, shelf1 - 64, 60, 26, 4), W3) if False else None
    pg.shape(rrect(FX + 22, shelf1, FW - 44, 26, 6), W2)
    pg.line(Path().M(FX + 22, shelf1 + 10).L(FX + FW - 22, shelf1 + 10), W3)
    for sg in (-1, 1):
        bx = CX + sg * 250
        pg.shape(Path().M(bx - 40, shelf1 + 26).L(bx + 40, shelf1 + 26).L(bx + 40, shelf1 + 36).L(bx - 40, shelf1 + 86).Z(), W2) if False else None
        pg.shape(Path().M(bx - 36, shelf1 + 26).L(bx + 36, shelf1 + 26).L(bx + 36, shelf1 + 110).Z(), W2) if sg > 0 else pg.shape(Path().M(bx - 36, shelf1 + 26).L(bx + 36, shelf1 + 26).L(bx - 36, shelf1 + 110).Z(), W2)
        pg.line(Path().M(bx - 22 * sg, shelf1 + 36).L(bx + 22 * sg, shelf1 + 36 + 0), W3) if False else None
    # lower shelf
    pot(pg, 170, shelf2 - 0, 150, 110)
    pg.shape(ell(170, shelf2 - 122, 70, 26), W2)   # a low plant: a rounded succulent
    for k in range(7):
        a = -PI + k * PI / 6
        pg.shape(at(m_petal(46, 12), 170 + math.cos(a) * 6, shelf2 - 112 + math.sin(a) * 4, math.degrees(a)), W2)
    watering_can(pg, 420, shelf2, 1.2)
    pot(pg, 650, shelf2, 118, 90)
    for k, ang in enumerate((-120, -90, -60)):
        draw_leaf(pg, 650, shelf2 - 86, ang, 66, 20, 0.1 * (k - 1), 3)
    pg.shape(rrect(FX + 22, shelf2, FW - 44, 26, 6), W2)
    pg.line(Path().M(FX + 22, shelf2 + 10).L(FX + FW - 22, shelf2 + 10), W3)
    bee(pg, 250, 170, 44, -15)
    butterfly(pg, 560, 150, 58, 10)


def b_bouquet(pg):
    """a vase of mixed flowers: roses, daisies, tulips, cosmos and sprigs of small blooms"""
    vx, vy = CX, 1000
    neck = (vx, 700)
    heads = [
        ('rose', 430, 250, 66), ('rose', 280, 340, 58), ('rose', 590, 330, 58), ('daisy', 170, 470, 52), ('daisy', 690, 480, 52),
        ('tulip', 360, 190, 0), ('tulip', 520, 200, 0), ('cosmos', 410, 400, 48), ('cosmos', 250, 220, 44), ('cosmos', 620, 200, 44),
        ('poppy', 530, 470, 46), ('poppy', 300, 490, 44),
    ]
    # leaves behind
    for (a, L, dx) in ((-150, 170, -30), (-30, 170, 30), (-120, 150, 40), (-60, 150, -40), (-175, 150, -70), (-5, 150, 70)):
        draw_leaf(pg, neck[0] + dx, neck[1] - 10, a, L, 36, 0.3 if a < -90 else -0.3, 4)
    for (kind, x, y, R) in heads:
        ctrl = [neck, (neck[0] + (x - neck[0]) * 0.1, neck[1] - 120), (x - (x - neck[0]) * 0.1, y + 160), (x, y + (30 if kind != 'tulip' else 60))]
        stem(pg, ctrl, 8, 5)
    # baby's breath
    for (x, y, a) in ((150, 330, -150), (710, 330, -30), (370, 120, -100), (560, 110, -80), (90, 540, -160), (770, 540, -20)):
        P = [neck, (neck[0] + (x - neck[0]) * 0.2, neck[1] - 130), (x - (x - neck[0]) * 0.2, y + 160), (x, y)]
        stem(pg, P, 5, 3)
        for k in range(6):
            t = 0.4 + 0.6 * k / 5
            px, py = bez_pt(P, t)
            pg.line(Path().M(px, py).L(px + 16 * (1 if k % 2 else -1), py - 14), W3)
            pg.circle(px + 20 * (1 if k % 2 else -1), py - 18, 7, W3)
        pg.circle(x, y, 8, W3)
    for (kind, x, y, R) in heads:
        if kind == 'rose':
            rose(pg, x, y, R, x * 0.01)
        elif kind == 'daisy':
            daisy(pg, x, y, R, x * 0.01, 14)
        elif kind == 'tulip':
            tulip(pg, x, y + 60, 64, 80, (x - 430) * 0.12)
        elif kind == 'cosmos':
            cosmos(pg, x, y, R, 0.2)
        else:
            poppy(pg, x, y, R, 0.2)
    vase(pg, vx, vy, 260, 330)
    bow(pg, vx, 706, 0.9)
    butterfly(pg, 700, 760, 54, 16)


def b_butterflies(pg):
    """three butterflies visiting poppies, bellflowers and daisies"""
    gy = 1020
    stems = [(150, 700, 'poppy', 58), (330, 760, 'bell', 36), (560, 720, 'poppy', 62), (700, 800, 'daisy', 44), (440, 860, 'daisy', 44), (230, 880, 'bell', 30)]
    for (x, y, kind, R) in stems:
        stem_leafed(pg, (x + (x - 430) * 0.12, gy), (x, y), bend=18 * (-1 if x % 2 else 1), leaves=2, leaf=(86, 26))
    for (x, y, kind, R) in stems:
        if kind == 'poppy':
            poppy(pg, x, y, R, 0.2)
        elif kind == 'bell':
            bellflower(pg, x, y, R, 0.3)
        else:
            daisy(pg, x, y, R, 0.2, 12)
    grass(pg, FX + 12, FX + FW - 12, gy, 30, 70, 15, 2.0)
    butterfly(pg, 430, 360, 150, -5)
    butterfly(pg, 190, 560, 78, 18)
    butterfly(pg, 680, 520, 86, -14)
    pg.line(Path().M(252, 520).C(310, 470, 330, 560, 380, 480), W3, dash='1 7')
    pg.line(Path().M(612, 500).C(560, 450, 540, 540, 500, 440), W3, dash='1 7')
    bee(pg, 360, 640, 36, 12)


def b_lavender(pg):
    """a bundle of lavender tied with a bow, with a bee and loose sprigs"""
    tie = (CX, 740)
    angs = [-128, -108, -92, -76, -62, -118, -86]
    Ls = [520, 600, 640, 620, 540, 560, 590]
    for a, L in zip(angs, Ls):
        # the stem
        end = polar(L, math.radians(a), tie[0], tie[1])
        ctrl = [tie, polar(L * 0.35, math.radians(a), *tie), polar(L * 0.7, math.radians(a + (4 if a < -90 else -4)), *tie), end]
        stem(pg, ctrl, 8, 5)
        sx, sy = bez_pt(ctrl, 0.6)
        ang = math.degrees(bez_tan(ctrl, 0.6))
        lavender(pg, sx, sy, L * 0.4 + 10, ang, 10, 12)
        for t, sg in ((0.2, 1), (0.34, -1)):
            px, py = bez_pt(ctrl, t)
            draw_leaf(pg, px, py, math.degrees(bez_tan(ctrl, t)) + sg * 24, 100, 12, 0.1 * sg, 0, mid=True)
    # the bundle below the tie
    for k, dx in enumerate((-30, -10, 14, 34)):
        pg.shape(ribbon([(tie[0] + dx * 0.4, tie[1]), (tie[0] + dx * 0.9, tie[1] + 100), (tie[0] + dx * 1.2, tie[1] + 180), (tie[0] + dx * 1.3, tie[1] + 240 + k * 8)], 9, 8, n=10), W2)
    bow(pg, tie[0], tie[1] + 8, 0.95)
    bee(pg, 220, 420, 44, -18)
    pg.line(Path().M(236, 432).C(260, 470, 300, 430, 330, 470), W3, dash='1 7')
    butterfly(pg, 650, 300, 58, 20)
    for (x, y, a) in ((150, 900, -20), (700, 920, 200), (230, 1000, 8)):
        lavender(pg, x, y, 120, a, 8, 10)
        pg.line(Path().M(x, y).L(*polar(-10, math.radians(a), x, y)), W2)
