#!/usr/bin/env python3
"""ac_mandala.py: procedural mandalas for "Color and Breathe" (adultcolor29).

A mandala is rings of repeated motifs around one centre. Every motif is a closed, white-filled Bezier shape drawn in local
coordinates (the radial direction is +x, the sideways direction is y) and turned into place n times, so the symmetry is exact.
Rings are drawn from the outside in or from the inside out as each design needs, and later shapes hide earlier lines."""
import math
from ac_core import *


# ---------------------------------------------------------------- motifs (local: base at the origin, pointing +x)
def m_petal(L, W, belly=1.0):
    """a pointed petal: widest about a third of the way up"""
    P = Path().M(0, 0)
    P.C(L * 0.12, -W * 1.05 * belly, L * 0.62, -W * 0.85 * belly, L, 0)
    P.C(L * 0.62, W * 0.85 * belly, L * 0.12, W * 1.05 * belly, 0, 0).Z()
    return P


def m_round(L, W):
    """a round-tipped petal (a U)"""
    P = Path().M(0, -W * 0.35)
    P.C(L * 0.5, -W * 0.65, L * 0.98, -W * 1.0, L, 0)
    P.C(L * 0.98, W * 1.0, L * 0.5, W * 0.65, 0, W * 0.35).Z()
    return P


def m_drop(L, W):
    """a teardrop with its round end away from the base and its point at the base"""
    P = Path().M(0, 0)
    P.C(L * 0.25, -W * 0.15, L * 0.55, -W * 1.1, L * 0.78, -W * 0.8)
    P.C(L * 1.02, -W * 0.5, L * 1.02, W * 0.5, L * 0.78, W * 0.8)
    P.C(L * 0.55, W * 1.1, L * 0.25, W * 0.15, 0, 0).Z()
    return P


def m_drop_out(L, W):
    """a teardrop with its round end at the base and its point away"""
    P = Path().M(L, 0)
    P.C(L * 0.78, -W * 0.2, L * 0.55, -W * 1.0, L * 0.22, -W * 0.85)
    P.C(-L * 0.04, -W * 0.7, -L * 0.04, W * 0.7, L * 0.22, W * 0.85)
    P.C(L * 0.55, W * 1.0, L * 0.78, W * 0.2, L, 0).Z()
    return P


def m_diamond(L, W):
    return rpoly([(0, 0), (L * 0.5, -W), (L, 0), (L * 0.5, W)], min(L, W) * 0.12)


def m_eye(L, W):
    return Path().M(0, 0).C(L * 0.3, -W * 1.25, L * 0.7, -W * 1.25, L, 0).C(L * 0.7, W * 1.25, L * 0.3, W * 1.25, 0, 0).Z()


def m_heart(L, W):
    """a heart pointing outward (point at the far end)"""
    P = heart_path(0, 0, 1.0)
    return at(P, L * 0.5, 0, -90, 1.0).xf(mat(0, 0, 1.0, False, 0, 1.0)) if False else at(heart_path(0, 0, 1.0).xf(mat(0, 0, 1, False, 0)), 0, 0, 0, 1.0) if False else _heart_local(L, W)


def _heart_local(L, W):
    h = heart_path(0, 0, 1.0)             # point down at (0, 0.95); lobes at the top
    # turn so the point faces +x, scale to length L and width W
    P = h.xf(mat(0, 0, 1, False, -90))
    P = P.xf(mat(0, 0, 1, False, 0))
    # now the point is at (0.95, 0) and the lobes at x about -1
    sx, sy = L / 2.0, W
    P = P.xf((sx, 0, 0, sy, L / 2.0 - 0.05 * sx, 0))
    return P


def m_leaf(L, W):
    return leaf_path(L, W)


def m_paisley(L, W, curl=1.0):
    """a paisley (a plump drop whose tail curls to one side)"""
    P = Path().M(0, 0)
    P.C(L * 0.05, -W * 1.4, L * 0.5, -W * 1.5, L * 0.82, -W * 0.7)
    P.C(L * 1.0, -W * 0.25 * curl - 0, L * 1.02, W * 0.9 * curl, L * 0.9, W * 1.1 * curl)
    P.C(L * 0.92, W * 0.5 * curl, L * 0.8, W * 0.1, L * 0.62, W * 0.35)
    P.C(L * 0.4, W * 0.8, L * 0.12, W * 0.9, 0, 0).Z()
    return P


def m_crescent(L, W):
    P = Path().M(0, -W)
    P.C(L * 0.9, -W * 1.0, L * 0.9, W * 1.0, 0, W)
    P.C(L * 0.5, W * 0.6, L * 0.5, -W * 0.6, 0, -W).Z()
    return P


def m_arch(L, W):
    """a tall arch with a flat base"""
    return Path().M(0, -W).C(L * 0.9, -W, L * 0.9, W, 0, W).Z()


def m_tri(L, W):
    return rpoly([(0, -W), (L, 0), (0, W)], min(L, W) * 0.1)


def m_floret(R, n=5, hole=0.28):
    """a small flower of n round petals around a centre circle of radius R*hole, local origin at its middle"""
    parts = []
    for i in range(n):
        a = i * TAU / n
        parts.append(at(m_round(R * 0.8, R * 0.34), 0, 0, math.degrees(a)).xf(mat(0, 0, 1)).xf((1, 0, 0, 1, 0, 0)) if False else at(m_round(R, R * 0.36), math.cos(a) * R * 0.18, math.sin(a) * R * 0.18, math.degrees(a)))
    return parts


# ---------------------------------------------------------------- placing
def put(pg, P, cx, cy, a, w=W2, fill='#fff'):
    pg.shape(at_rad(P, cx, cy, a), w, fill)


def ring_free(pg, motif, cx, cy, r, n, a0=0.0, w=W2, inner=None, inner_w=W3):
    """n copies of a motif (base at radius r), turned to point outward. inner is an optional second path drawn on top"""
    for k in range(n):
        a = a0 + k * TAU / n
        put(pg, motif, cx, cy, a, w)
        if inner is not None:
            pg.line(at_rad(inner, cx, cy, a), inner_w)


def ring_in(pg, motif, cx, cy, r, n, a0=0.0, w=W2, inner=None, inner_w=W3):
    """as ring_free, but the motif points to the centre; r is where its base is"""
    for k in range(n):
        a = a0 + k * TAU / n
        P = at(motif, r, 0, 180)  # flip: base at r, pointing inward
        pg.shape(at_rad(P, cx, cy, a), w)
        if inner is not None:
            pg.line(at_rad(at(inner, r, 0, 180), cx, cy, a), inner_w)


def ring_at(pg, motif, cx, cy, r, n, a0=0.0, w=W2, inner=None, rot=0.0, inner_w=W3):
    """n copies with the motif's base at radius r, pointing outward"""
    for k in range(n):
        a = a0 + k * TAU / n
        P = at(motif, r, 0, rot)
        pg.shape(at_rad(P, cx, cy, a), w)
        if inner is not None:
            pg.line(at_rad(at(inner, r, 0, rot), cx, cy, a), inner_w)


def circ_ring(pg, cx, cy, r, w=W2, dash=None):
    pg.line(circ(cx, cy, r), w, dash)


def disk(pg, cx, cy, r, w=W2):
    pg.shape(circ(cx, cy, r), w)


def dots(pg, cx, cy, r, n, a0=0.0, dr=2.0, solid=True, w=W3):
    for k in range(n):
        a = a0 + k * TAU / n
        x, y = polar(r, a, cx, cy)
        if solid:
            pg.dot(x, y, dr)
        else:
            pg.circle(x, y, dr, w)


def band_petals(pg, cx, cy, r0, r1, n, a0=0.0, bulge=1.0, w=W2, vein=False):
    """pointed petals sharing base points on the circle r0, tips on r1 (cells between them stay open)"""
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
        if vein:
            pg.line(at_rad(Path().M(r0 + t * 0.22, 0).L(r0 + t * 0.7, 0), cx, cy, a), W3)


def band_round(pg, cx, cy, r0, r1, n, a0=0.0, w=W2, inner=0.0):
    """round-topped petals sharing base points on r0"""
    h = PI / n
    B1, B2 = polar(r0, -h), polar(r0, h)
    t = r1 - r0
    P = Path().M(*B1)
    P.C(B1[0] + t * 0.75, B1[1] * 1.05, r1, B1[1] * 0.6, r1, 0)
    P.C(r1, -B1[1] * 0.6, B2[0] + t * 0.75, B2[1] * 1.05, B2[0], B2[1])
    arc_to(P, r0, h, -h)
    P.Z()
    for k in range(n):
        a = a0 + k * TAU / n
        pg.shape(at_rad(P, cx, cy, a), w)
        if inner:
            Q = Path().M(r0 + t * 0.22, 0).C(r0 + t * 0.4, -B1[1] * 0, r0 + t * 0.6, 0, r0 + t * inner, 0)
            pg.line(at_rad(Q, cx, cy, a), W3)


def band_scallop(pg, cx, cy, r0, r1, n, a0=0.0, w=W2, fill='#fff', dot=False):
    """arches that sit on the circle r0 and reach to r1; neighbours share their feet"""
    h = PI / n
    B1, B2 = polar(r0, -h), polar(r0, h)
    t = r1 - r0 * math.cos(h)
    P = Path().M(*B1)
    P.C(B1[0] + t * 1.32, B1[1] * 1.0, B2[0] + t * 1.32, B2[1] * 1.0, B2[0], B2[1])
    arc_to(P, r0, h, -h)
    P.Z()
    for k in range(n):
        a = a0 + k * TAU / n
        pg.shape(at_rad(P, cx, cy, a), w, fill)
        if dot:
            x, y = polar(r0 + t * 0.52, a, cx, cy)
            pg.circle(x, y, max(2.6, t * 0.16), W3)


def band_tri(pg, cx, cy, r0, r1, n, a0=0.0, w=W2, inner=False):
    """a ring of sharp teeth (triangles) on the circle r0"""
    h = PI / n
    B1, B2 = polar(r0, -h), polar(r0, h)
    P = Path().M(*B1).L(r1, 0).L(*B2)
    arc_to(P, r0, h, -h)
    P.Z()
    for k in range(n):
        a = a0 + k * TAU / n
        pg.shape(at_rad(P, cx, cy, a), w)


def spokes(pg, cx, cy, r0, r1, n, a0=0.0, w=W3):
    for k in range(n):
        a = a0 + k * TAU / n
        pg.line(Path().M(*polar(r0, a, cx, cy)).L(*polar(r1, a, cx, cy)), w)


def lace(pg, cx, cy, r, n, depth, a0=0.0, w=W2, r_dot=0):
    """a ring of linked arcs (a chain of scallops hanging inward) on radius r"""
    h = PI / n
    for k in range(n):
        a = a0 + k * TAU / n
        p0 = polar(r, a - h, cx, cy)
        p1 = polar(r, a + h, cx, cy)
        mid = polar(r - depth, a, cx, cy)
        P = Path().M(*p0).C(*lerp(p0, mid, 0.9), *lerp(p1, mid, 0.9), *p1)
        pg.line(P, w)
        if r_dot:
            pg.circle(*polar(r - depth * 0.45, a, cx, cy), r_dot, W3)


def star_poly(pg, cx, cy, R, r, n, a0=-PI / 2, w=W2, rnd=0.0):
    pts = []
    for i in range(2 * n):
        a = a0 + i * PI / n
        pts.append(polar(R if i % 2 == 0 else r, a, cx, cy))
    pg.shape(rpoly(pts, rnd) if rnd else Path().M(*pts[0]).__class__(Path().M(*pts[0]).s + [('L', p) for p in pts[1:]] + [('Z',)]), w)


def poly_pts(pts, rnd=0.0):
    if rnd:
        return rpoly(pts, rnd)
    P = Path().M(*pts[0])
    for p in pts[1:]:
        P.L(*p)
    return P.Z()


def rosette(pg, cx, cy, r, n, a0=0.0, layers=2, w=W2):
    """a flower middle: layers of petals getting smaller, then a disk"""
    for l in range(layers):
        rr = r * (1 - l * 0.34)
        nn = n
        off = a0 + (PI / nn if l % 2 else 0)
        ring_free(pg, m_petal(rr, rr * (PI / nn) * 0.95), cx, cy, 0, nn, off, w)
    disk(pg, cx, cy, r * (1 - layers * 0.34) * 0.55 + 4, w)


def mini_flower(pg, x, y, R, n=5, a0=0.0, w=W3, center=True):
    """five or six round petals around a small disk (a decoration, drawn small)"""
    for i in range(n):
        a = a0 + i * TAU / n
        e = ell(R * 0.62, 0, R * 0.46, R * 0.32)
        pg.shape(at_rad(e, x, y, a), w)
    if center:
        pg.circle(x, y, R * 0.28, w)


def corner_sprays(pg, kind, size):
    """quarter ornaments in the four corners, clipped by the frame"""
    for (x, y, rot) in ((FX + 9, FY + 9, 0), (FX + FW - 9, FY + 9, 90), (FX + FW - 9, FY + FH - 9, 180), (FX + 9, FY + FH - 9, 270)):
        pass


# ============================================================== the ten designs
def lotus(pg):
    cx, cy = CX, CY - 10
    R = 330
    circ_ring(pg, cx, cy, R + 4, W1)
    band_scallop(pg, cx, cy, R - 34, R, 36, 0, dot=False)
    # back petals, big to small
    ring_at(pg, m_petal(150, 40), cx, cy, 120, 18, 0, inner=Path().M(25, 0).L(110, 0))
    # second layer
    ring_at(pg, m_petal(130, 46), cx, cy, 70, 12, PI / 12, inner=Path().M(22, 0).L(100, 0))
    ring_at(pg, m_petal(88, 38), cx, cy, 36, 12, 0, inner=Path().M(20, 0).L(64, 0))
    disk(pg, cx, cy, 44)
    mini_flower(pg, cx, cy, 52, 8, 0.0)
    dots(pg, cx, cy, 20, 8, 0, 1.6)


# the designs are added to DESIGNS in designs.py once they look right
