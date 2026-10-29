#!/usr/bin/env python3
"""ac_mandala.py: procedural mandalas for "Color and Breathe" (adultcolor29).

A mandala is rings of repeated motifs around one centre. Every motif is a closed, white-filled Bezier shape drawn in local
coordinates (the radial direction is +x, the sideways direction is y) and turned into place n times, so the symmetry is exact.
Neighbouring shapes share their feet exactly, so every cell between them is closed. Later shapes hide earlier lines."""
import math
from ac_core import *


# ---------------------------------------------------------------- motifs (local: base at the origin, pointing +x)
def m_petal(L, W, belly=1.0):
    """a pointed petal, widest about a third of the way up (W is the half width)"""
    P = Path().M(0, 0)
    P.C(L * 0.12, -W * 1.05 * belly, L * 0.62, -W * 0.85 * belly, L, 0)
    P.C(L * 0.62, W * 0.85 * belly, L * 0.12, W * 1.05 * belly, 0, 0).Z()
    return P


def m_round(L, W):
    """a round-tipped petal (a U with a narrow foot)"""
    P = Path().M(0, -W * 0.35)
    P.C(L * 0.5, -W * 0.65, L * 0.98, -W * 1.0, L, 0)
    P.C(L * 0.98, W * 1.0, L * 0.5, W * 0.65, 0, W * 0.35).Z()
    return P


def m_drop(L, W):
    """a teardrop: its point at the base, its round end away"""
    P = Path().M(0, 0)
    P.C(L * 0.25, -W * 0.15, L * 0.5, -W * 1.0, L * 0.76, -W * 0.8)
    P.C(L * 1.02, -W * 0.55, L * 1.02, W * 0.55, L * 0.76, W * 0.8)
    P.C(L * 0.5, W * 1.0, L * 0.25, W * 0.15, 0, 0).Z()
    return P


def m_drop_out(L, W):
    """a teardrop: its round end at the base, its point away"""
    P = Path().M(L, 0)
    P.C(L * 0.78, -W * 0.2, L * 0.55, -W * 1.0, L * 0.24, -W * 0.85)
    P.C(-L * 0.04, -W * 0.7, -L * 0.04, W * 0.7, L * 0.24, W * 0.85)
    P.C(L * 0.55, W * 1.0, L * 0.78, W * 0.2, L, 0).Z()
    return P


def m_diamond(L, W):
    return rpoly([(0, 0), (L * 0.5, -W), (L, 0), (L * 0.5, W)], min(L, W) * 0.12)


def m_eye(L, W):
    return Path().M(0, 0).C(L * 0.3, -W * 1.25, L * 0.7, -W * 1.25, L, 0).C(L * 0.7, W * 1.25, L * 0.3, W * 1.25, 0, 0).Z()


def m_paisley(L, W, curl=1.0):
    """a paisley: a plump drop whose tail curls to one side"""
    s = curl
    P = Path().M(0, 0)
    P.C(L * 0.04, -W * 1.5 * s, L * 0.5, -W * 1.7 * s, L * 0.8, -W * 0.9 * s)
    P.C(L * 1.02, -W * 0.3 * s, L * 1.04, W * 0.9 * s, L * 0.9, W * 1.15 * s)
    P.C(L * 0.92, W * 0.55 * s, L * 0.8, W * 0.12 * s, L * 0.6, W * 0.3 * s)
    P.C(L * 0.4, W * 0.75 * s, L * 0.12, W * 0.8 * s, 0, 0).Z()
    return P


def m_star(R, r=None, n=5, rnd=None):
    r = R * 0.45 if r is None else r
    pts = [polar(R if i % 2 == 0 else r, -PI / 2 + i * PI / n) for i in range(2 * n)]
    return rpoly(pts, R * 0.1 if rnd is None else rnd)


def _bb(P):
    xs, ys = [], []
    for pts, _c in P.flatten(6.0):
        for p in pts:
            xs.append(p[0])
            ys.append(p[1])
    return min(xs), min(ys), max(xs), max(ys)


def about(P, cx, cy, k):
    """P scaled by k about the point (cx, cy)"""
    return P.xf(mmul(mat(cx, cy, k), mat(-cx, -cy, 1)))


# ---------------------------------------------------------------- ring builders
def put(pg, P, cx, cy, a, w=W2, fill='#fff'):
    pg.shape(at_rad(P, cx, cy, a), w, fill)


def ring_at(pg, motif, cx, cy, r, n, a0=0.0, w=W2, inner=None, rot=0.0, inner_w=W3, nest=0.0, nest_at=0.45):
    """n copies of a motif with its base at radius r, pointing outward (rot turns it 180 to point inward)"""
    pg.ring()
    for k in range(n):
        a = a0 + k * TAU / n
        pg.shape(at_rad(at(motif, r, 0, rot), cx, cy, a), w)
        if nest:
            bx0, by0, bx1, by1 = _bb(motif)
            pg.line(at_rad(at(about(motif, bx0 + (bx1 - bx0) * nest_at, 0, nest), r, 0, rot), cx, cy, a), inner_w)
        if inner is not None:
            pg.line(at_rad(at(inner, r, 0, rot), cx, cy, a), inner_w)


def circ_ring(pg, cx, cy, r, w=W2):
    pg.line(circ(cx, cy, r), w)


def disk(pg, cx, cy, r, w=W2):
    pg.ring()
    pg.shape(circ(cx, cy, r), w)


def dots(pg, cx, cy, r, n, a0=0.0, dr=1.7, solid=True, w=W3):
    for k in range(n):
        x, y = polar(r, a0 + k * TAU / n, cx, cy)
        pg.dot(x, y, dr) if solid else pg.circle(x, y, dr, w)


def band_petals(pg, cx, cy, r0, r1, n, a0=0.0, bulge=1.0, w=W2, vein=False, nest=0.0):
    """pointed petals that share their feet on the circle r0 and reach r1; the cells between them stay open"""
    pg.ring()
    h = PI / n
    B1, B2 = polar(r0, -h), polar(r0, h)
    t = r1 - r0 * math.cos(h)
    P = Path().M(*B1)
    P.C(B1[0] + t * 0.30, B1[1] * 1.12 * bulge, r1 - t * 0.30, B1[1] * 0.32, r1, 0)
    P.C(r1 - t * 0.30, -B1[1] * 0.32, B2[0] + t * 0.30, B2[1] * 1.12 * bulge, B2[0], B2[1])
    arc_to(P, r0, h, -h)
    P.Z()
    for k in range(n):
        a = a0 + k * TAU / n
        pg.shape(at_rad(P, cx, cy, a), w)
        if nest:
            pg.line(at_rad(about(P, r0 + t * 0.42, 0, nest), cx, cy, a), W3)
        elif vein:
            pg.line(at_rad(Path().M(r0 + t * 0.25, 0).L(r0 + t * 0.72, 0), cx, cy, a), W3)


def band_round(pg, cx, cy, r0, r1, n, a0=0.0, w=W2, vein=False, spread=1.0, nest=0.0):
    """round-topped petals that share their feet on r0. spread 1.0 lets neighbours just touch; more makes them overlap"""
    pg.ring()
    h = PI / n
    B1, B2 = polar(r0, -h), polar(r0, h)
    t = r1 - r0
    lat = max(abs(B1[1]), PI * (r0 + r1) / 2 / n * spread * 0.98)
    P = Path().M(*B1)
    P.C(B1[0] + t * 0.30, -lat * 1.05, r1 - t * 0.02, -lat * 0.9, r1, 0)
    P.C(r1 - t * 0.02, lat * 0.9, B2[0] + t * 0.30, lat * 1.05, B2[0], B2[1])
    arc_to(P, r0, h, -h)
    P.Z()
    for k in range(n):
        a = a0 + k * TAU / n
        pg.shape(at_rad(P, cx, cy, a), w)
        if nest:
            pg.line(at_rad(about(P, r0 + t * 0.5, 0, nest), cx, cy, a), W3)
        elif vein:
            pg.line(at_rad(Path().M(r0 + t * 0.25, 0).L(r0 + t * 0.7, 0), cx, cy, a), W3)


def band_scallop(pg, cx, cy, r0, r1, n, a0=0.0, w=W2, dot=False, inward=False):
    """arches that stand on the circle r0 and reach r1; neighbours share their feet. inward=True hangs them toward the centre"""
    pg.ring()
    h = PI / n
    B1, B2 = polar(r0, -h), polar(r0, h)
    t = (r1 - r0 * math.cos(h)) if not inward else (r1 - r0 * math.cos(h))
    P = Path().M(*B1)
    P.C(B1[0] + t * 1.32, B1[1], B2[0] + t * 1.32, B2[1], B2[0], B2[1])
    arc_to(P, r0, h, -h)
    P.Z()
    for k in range(n):
        a = a0 + k * TAU / n
        pg.shape(at_rad(P, cx, cy, a), w)
        if dot:
            x, y = polar(r0 + t * 0.5, a, cx, cy)
            pg.circle(x, y, max(2.8, min(abs(t), r0 * h) * 0.2), W3)


def band_tri(pg, cx, cy, r0, r1, n, a0=0.0, w=W2):
    """a ring of pointed teeth standing on the circle r0"""
    pg.ring()
    h = PI / n
    B1, B2 = polar(r0, -h), polar(r0, h)
    P = Path().M(*B1).L(r1, 0).L(*B2)
    arc_to(P, r0, h, -h)
    P.Z()
    for k in range(n):
        pg.shape(at_rad(P, cx, cy, a0 + k * TAU / n), w)


def spokes(pg, cx, cy, r0, r1, n, a0=0.0, w=W3):
    for k in range(n):
        a = a0 + k * TAU / n
        pg.line(Path().M(*polar(r0, a, cx, cy)).L(*polar(r1, a, cx, cy)), w)


def polar_cells(pg, cx, cy, r0, r1, n, a0=0.0, w=W2, motif=None, mscale=0.5):
    """one ring of a polar grid: n cells between circles r0 and r1, with an optional small motif in each"""
    pg.ring()
    h = TAU / n
    for k in range(n):
        a = a0 + k * h
        P = Path()
        arc_to(P, r1, a, a + h, cx, cy, move=True)
        P.L(*polar(r0, a + h, cx, cy))
        arc_to(P, r0, a + h, a, cx, cy)
        P.Z()
        pg.shape(P, w)
        if motif:
            mx, my = polar((r0 + r1) / 2, a + h / 2, cx, cy)
            wd = (r0 + r1) / 2 * h
            s = min(wd, r1 - r0) * mscale
            if motif == 'circle':
                pg.circle(mx, my, s * 0.5, W3)
            elif motif == 'eye':
                pg.shape(at_rad(m_eye(s * 1.6, s * 0.55).xf(mat(-s * 0.8, 0, 1)), mx, my, a + h / 2), W3)
            elif motif == 'diamond':
                pg.shape(at_rad(m_diamond(s * 1.7, s * 0.7).xf(mat(-s * 0.85, 0, 1)), mx, my, a + h / 2), W3)


def lace(pg, cx, cy, r, n, depth, a0=0.0, w=W2, dr=0.0):
    """a chain of arcs, each hanging toward the centre from two feet on the circle r"""
    h = PI / n
    for k in range(n):
        a = a0 + k * TAU / n
        p0, p1 = polar(r, a - h, cx, cy), polar(r, a + h, cx, cy)
        m = polar(r - depth, a, cx, cy)
        pg.line(Path().M(*p0).C(*lerp(p0, m, 1.2), *lerp(p1, m, 1.2), *p1), w)
        if dr:
            pg.circle(*polar(r - depth * 0.42, a, cx, cy), dr, W3)


def flower(pg, x, y, R, n=8, a0=0.0, w=W2, core=0.3, ring=True):
    """a flower head: n round petals around a disk"""
    band_round(pg, x, y, R * core, R, n, a0, w, vein=R > 40)
    if ring and R * core > 11:
        pg.circle(x, y, R * core * 0.5, W3)


def mini_flower(pg, x, y, R, n=5, a0=0.0, w=W3):
    """a small flower: n round petals around a disk"""
    band_round(pg, x, y, R * 0.3, R, n, a0, w)
    pg.circle(x, y, R * 0.16, w)


def crescent(R, rb, d):
    """a crescent moon: the circle of radius R minus the circle rb centred d to the right"""
    x = (d * d + R * R - rb * rb) / (2 * d)
    y = math.sqrt(max(0.0, R * R - x * x))
    th = math.atan2(y, x)
    ph = math.atan2(y, x - d)
    P = Path()
    arc_to(P, R, -th, th - TAU, 0, 0, move=True)
    arc_to(P, rb, ph, TAU - ph, d, 0)
    return P.Z()


def corner_set(pg, kind, r, w=W2):
    """a quarter ornament in each corner of the frame (the frame clip trims it)"""
    for (x, y) in ((FX, FY), (FX + FW, FY), (FX, FY + FH), (FX + FW, FY + FH)):
        if kind == 'scallop':
            band_scallop(pg, x, y, r * 0.66, r, 8 * round(TAU * r * 0.66 / 36 / 8), 0)
            circ_ring(pg, x, y, r * 0.66, W2)
            band_round(pg, x, y, r * 0.22, r * 0.6, 8 * round(TAU * r * 0.4 / 40 / 8), 0, W3)
        elif kind == 'petal':
            band_petals(pg, x, y, r * 0.5, r, 16, 0)
            band_petals(pg, x, y, r * 0.2, r * 0.5, 8, PI / 8, w=W3)
        elif kind == 'dots':
            circ_ring(pg, x, y, r, W2)
            circ_ring(pg, x, y, r * 0.72, W3)
            dots(pg, x, y, r * 0.86, 8 * round(TAU * r * 0.86 / 30 / 8), 0, 1.6)
            band_petals(pg, x, y, r * 0.2, r * 0.72, 8, 0, w=W3)
        elif kind == 'star':
            circ_ring(pg, x, y, r, W2)
            band_tri(pg, x, y, r * 0.55, r * 0.97, 16, 0, W3)
            circ_ring(pg, x, y, r * 0.55, W2)
            band_round(pg, x, y, r * 0.12, r * 0.4, 8, 0, W3)
        elif kind == 'lace':
            circ_ring(pg, x, y, r, W2)
            lace(pg, x, y, r, 8 * round(TAU * r / 56 / 8), r * 0.22, 0, W2, dr=3.2)
            band_petals(pg, x, y, r * 0.35, r * 0.74, 16, 0, w=W3)


# ============================================================== the designs
def rim(pg, cx, cy, R=334, dot_r=None, n=0):
    """the outer edge every round mandala shares: a bold circle and a ring of dots just inside it"""
    circ_ring(pg, cx, cy, R, W1)
    if n:
        dots(pg, cx, cy, R - 14, n, 0, 1.6)
        circ_ring(pg, cx, cy, R - 28, W3)


def m_lotus(pg, corners=True):
    """layers of petals, back to front, inside a ring of arches"""
    cx, cy = CX, CY
    rim(pg, cx, cy, 334, n=84)
    band_scallop(pg, cx, cy, 268, 304, 36, 0, dot=True)
    band_petals(pg, cx, cy, 216, 268, 36, PI / 36, nest=0.5)
    ring_at(pg, m_petal(124, 40), cx, cy, 96, 18, 0, nest=0.55, nest_at=0.4)
    ring_at(pg, m_petal(112, 42), cx, cy, 64, 18, PI / 18, nest=0.55, nest_at=0.4)
    ring_at(pg, m_petal(96, 36), cx, cy, 32, 12, 0, inner=Path().M(18, 0).L(70, 0))
    ring_at(pg, m_petal(52, 22), cx, cy, 10, 8, PI / 8)
    disk(pg, cx, cy, 20)
    dots(pg, cx, cy, 11, 8, 0, 1.5)
    if corners:
        corner_set(pg, 'scallop', 160)


def m_sun(pg):
    """a sun: rays, round petals, arches with dots and a ring of teeth"""
    cx, cy = CX, CY
    rim(pg, cx, cy, 334, n=96)
    band_tri(pg, cx, cy, 270, 304, 48, 0)
    band_scallop(pg, cx, cy, 218, 270, 32, 0, dot=True)
    band_round(pg, cx, cy, 170, 218, 32, PI / 32, nest=0.55)
    band_tri(pg, cx, cy, 82, 170, 16, 0)
    for k in range(16):
        a = k * TAU / 16
        pg.line(at_rad(Path().M(104, 0).L(150, 0), cx, cy, a), W3)
    ring_at(pg, m_drop(40, 11), cx, cy, 90, 16, PI / 16, w=W3)
    band_round(pg, cx, cy, 36, 82, 16, PI / 16, w=W2, nest=0.55)
    pg.circle(cx, cy, 36, W2)
    pg.circle(cx, cy, 20, W3)
    pg.circle(cx, cy, 8, W3)
    corner_set(pg, 'star', 150)


def m_paisley_ring(pg):
    """twelve paisleys swirling round a flower, with drops and arches outside"""
    cx, cy = CX, CY
    rim(pg, cx, cy, 334, n=84)
    band_scallop(pg, cx, cy, 262, 304, 24, PI / 24, dot=True)
    ring_at(pg, m_drop_out(46, 15), cx, cy, 210, 24, 0, w=W2, nest=0.5, nest_at=0.4)
    circ_ring(pg, cx, cy, 206, W3)
    pais = m_paisley(124, 30)
    ring_at(pg, pais, cx, cy, 76, 12, 0, inner=m_paisley(124, 30).xf(mat(18, 0, 0.66)), inner_w=W3)
    for k in range(12):
        a = k * TAU / 12
        pg.circle(*polar(78 + 42, a + 0.18, cx, cy), 4.2, W3)
    band_petals(pg, cx, cy, 30, 78, 12, PI / 12, w=W2, nest=0.5)
    disk(pg, cx, cy, 30)
    band_round(pg, cx, cy, 11, 22, 6, 0, W3)
    corner_set(pg, 'lace', 160)


def m_compass(pg):
    """an eight-point star with smaller points between, ringed by diamonds and scallops"""
    cx, cy = CX, CY
    rim(pg, cx, cy, 334, n=84)
    band_scallop(pg, cx, cy, 296, 306, 48, 0) if False else None
    band_scallop(pg, cx, cy, 276, 306, 48, 0)
    band_tri(pg, cx, cy, 246, 276, 48, PI / 48)
    circ_ring(pg, cx, cy, 246, W2)
    ring_at(pg, m_diamond(30, 13), cx, cy, 210, 32, PI / 32, w=W2)
    circ_ring(pg, cx, cy, 208, W2)
    ring_at(pg, m_petal(120, 22), cx, cy, 20, 16, PI / 16, w=W2)
    ring_at(pg, m_petal(150, 30), cx, cy, 20, 8, PI / 8, nest=0.5, nest_at=0.5)
    ring_at(pg, m_petal(188, 36), cx, cy, 20, 8, 0, nest=0.55, nest_at=0.5)
    for k in range(8):
        a = k * TAU / 8 + PI / 16
        pg.circle(*polar(176, a, cx, cy), 6, W3)
    band_round(pg, cx, cy, 22, 56, 8, PI / 8)
    pg.circle(cx, cy, 22, W2)
    pg.circle(cx, cy, 10, W3)
    corner_set(pg, 'dots', 150)


def m_wheel(pg):
    """a polar grid, each ring cut into more cells than the one inside, a small shape in every cell"""
    cx, cy = CX, CY
    rim(pg, cx, cy, 334, n=0)
    rings = [(40, 90, 8, 'diamond'), (90, 138, 12, 'circle'), (138, 188, 16, 'eye'), (188, 238, 20, 'circle'), (238, 286, 24, 'diamond'), (286, 328, 28, 'circle')]
    for i, (r0, r1, n, mo) in enumerate(rings):
        polar_cells(pg, cx, cy, r0, r1, n, 0 if i % 2 == 0 else TAU / n / 2, W2, mo, 0.5)
    pg.circle(cx, cy, 40, W2)
    flower(pg, cx, cy, 38, 8, 0)
    corner_set(pg, 'petal', 150)


def m_sunflower(pg):
    """a sunflower: seeds in a golden-angle spiral, two rows of petals, leaves, scallops"""
    cx, cy = CX, CY
    rim(pg, cx, cy, 334, n=0)
    band_scallop(pg, cx, cy, 300, 332, 44, 0)
    for k in range(8):
        a = k * TAU / 8 + PI / 8
        draw_leaf(pg, *polar(176, a, cx, cy), math.degrees(a), 112, 30, curl=0.35 * (1 if k % 2 else -1), veins=3)
    ring_at(pg, m_petal(116, 26), cx, cy, 116, 28, 0, nest=0.5, nest_at=0.5)
    ring_at(pg, m_petal(100, 28), cx, cy, 110, 28, PI / 28, inner=Path().M(26, 0).L(76, 0))
    pg.shape(circ(cx, cy, 116), W2)
    ga = PI * (3 - math.sqrt(5))
    c = 13.2
    N = int((106 / c) ** 2)
    for i in range(N, 0, -1):
        r = c * math.sqrt(i)
        x, y = polar(r, i * ga, cx, cy)
        pg.circle(x, y, 4.2 + 0.035 * r, W3)
    pg.circle(cx, cy, 5.0, W3)
    corner_set(pg, 'scallop', 150)


def m_frost(pg):
    """a six-fold snowflake: arms with branches, eyes between them, scallops and a flower in the middle"""
    cx, cy = CX, CY
    rim(pg, cx, cy, 334, n=84)
    band_scallop(pg, cx, cy, 262, 304, 36, 0)
    band_tri(pg, cx, cy, 232, 262, 36, PI / 36)
    circ_ring(pg, cx, cy, 232, W2)
    for k in range(6):
        am = k * TAU / 6 + PI / 6
        pg.shape(at_rad(m_eye(120, 34).xf(mat(88, 0, 1)), cx, cy, am), W2)
        pg.line(at_rad(about(m_eye(120, 34).xf(mat(88, 0, 1)), 148, 0, 0.58), cx, cy, am), W3)
        pg.circle(*polar(148, am, cx, cy), 6, W3)
        mini_flower(pg, *polar(88, am, cx, cy), 14, 5, am, W3)
    for k in range(6):
        a = k * TAU / 6
        for t, L, W in ((104, 72, 17), (154, 56, 13)):
            for sg in (-1, 1):
                x, y = polar(t, a, cx, cy)
                draw_leaf(pg, x, y, math.degrees(a) + sg * 48, L, W, veins=0, mid=True)
        pg.shape(at_rad(m_petal(206, 22).xf(mat(46, 0, 1)), cx, cy, a), W2)
        pg.line(at_rad(Path().M(70, 0).L(184, 0), cx, cy, a), W3)
        pg.shape(at_rad(m_diamond(34, 15).xf(mat(244, 0, 1)), cx, cy, a), W2)
    hx = [polar(54, i * TAU / 6 + PI / 6, cx, cy) for i in range(6)]
    pg.shape(rpoly(hx, 7), W2)
    flower(pg, cx, cy, 40, 6, PI / 6, core=0.34)
    corner_set(pg, 'star', 150)


def m_garland(pg):
    """eight flowers on a ring, with leaves between them and a small flower in the middle"""
    cx, cy = CX, CY
    rim(pg, cx, cy, 334, n=84)
    circ_ring(pg, cx, cy, 296, W2)
    for k in range(8):
        a = k * TAU / 8 + PI / 8
        draw_leaf(pg, *polar(150, a, cx, cy), math.degrees(a), 140, 30, curl=0.2, veins=4)
    for k in range(8):
        a = k * TAU / 8
        draw_leaf(pg, *polar(182, a, cx, cy), math.degrees(a), 40, 11, veins=0, mid=False)
    for k in range(8):
        a = k * TAU / 8
        flower(pg, *polar(228, a, cx, cy), 74, 8, a, core=0.34)
    for k in range(8):
        a = k * TAU / 8 + PI / 8
        flower(pg, *polar(104, a, cx, cy), 38, 6, a, core=0.34, ring=False)
    band_petals(pg, cx, cy, 20, 62, 16, 0, nest=0.5)
    disk(pg, cx, cy, 20)
    corner_set(pg, 'dots', 150)


def m_moon(pg):
    """a moon and stars: a crescent in the middle, a ring of stars, rays and arches"""
    cx, cy = CX, CY
    rim(pg, cx, cy, 334, n=0)
    band_tri(pg, cx, cy, 276, 332, 24, 0)
    for k in range(24):
        a = k * TAU / 24
        pg.line(at_rad(Path().M(292, 0).L(316, 0), cx, cy, a), W3)
    band_scallop(pg, cx, cy, 232, 276, 24, PI / 24, dot=True)
    circ_ring(pg, cx, cy, 228, W2)
    for k in range(12):
        a = k * TAU / 12
        x, y = polar(188, a, cx, cy)
        pg.shape(m_star(31, 13).xf(mat(x, y, 1, False, math.degrees(a) + 90)), W2)
    dots(pg, cx, cy, 188, 12, PI / 12, 2.4, solid=False)
    band_petals(pg, cx, cy, 120, 150, 24, 0, w=W2)
    circ_ring(pg, cx, cy, 150, W2)
    pg.shape(circ(cx, cy, 120), W2)
    pg.shape(crescent(86, 74, 40).xf(mat(cx - 22, cy, 1, False, -25)), W2)
    for (x, y, r) in ((60, -40, 18), (78, 20, 11), (40, 62, 9)):
        pg.shape(m_star(r, r * 0.44).xf(mat(cx + x - 6, cy + y - 4, 1)), W3)
    corner_set(pg, 'petal', 150)
