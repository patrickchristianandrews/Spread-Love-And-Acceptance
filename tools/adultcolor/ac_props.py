#!/usr/bin/env python3
"""ac_props.py: shared props for the quiet scenes of "Color and Breathe" (adultcolor29): clouds, trees, stars, mugs, books,
cushions, windows. All closed Bezier shapes with white fill, drawn in painter's order."""
import math
from ac_core import *
from ac_botan import pot, bez_pt, bez_tan, stem, grass, m_diamond_s
from ac_mandala import m_petal, m_drop


def cloud(pg, x, y, w, h=None, w1=W2):
    """a cloud centred on (x, y): a flat bottom with round bumps of different sizes on top (w wide, h high)"""
    h = h or w * 0.4
    base = y + h / 2
    bumps = [(0.16, 0.5), (0.36, 0.86), (0.62, 1.0), (0.84, 0.62)]
    cs = []
    for (fx, fh) in bumps:
        r = h * fh * 0.5 + w * 0.04
        cs.append((x - w / 2 + fx * w, base - r * 0.55, r))
    pg.union_circles(cs, w1, below=base)


def sparkle(pg, x, y, R, w=W2, fillc='#fff'):
    """a four-point star with concave sides"""
    k = R * 0.22
    P = Path().M(x, y - R).C(x + k * 0.4, y - k, x + k, y - k * 0.4, x + R, y).C(x + k, y + k * 0.4, x + k * 0.4, y + k, x, y + R).C(x - k * 0.4, y + k, x - k, y + k * 0.4, x - R, y).C(x - k, y - k * 0.4, x - k * 0.4, y - k, x, y - R).Z()
    pg.shape(P, w, fillc)


def star5(pg, x, y, R, w=W2, rot=0.0):
    pts = [polar(R if i % 2 == 0 else R * 0.46, -PI / 2 + rot + i * PI / 5, x, y) for i in range(10)]
    pg.shape(rpoly(pts, R * 0.1), w)


def pine(pg, x, base, h, w, tiers=4, w1=W2):
    """a pine tree standing on base (x = centre): rounded tiers over a short trunk"""
    tw = max(8, w * 0.1)
    pg.shape(rrect(x - tw / 2, base - h * 0.14, tw, h * 0.16, 2), w1)
    th = h * 0.86 / tiers * 1.5
    for i in range(tiers):
        yb = base - h * 0.1 - i * (h * 0.86 - th) / max(1, tiers - 1) * 0.98
        ww = w * (1 - 0.62 * i / max(1, tiers - 1)) * 0.5
        yt = yb - th
        P = Path().M(x - ww, yb).C(x - ww * 0.8, yb + th * 0.06, x + ww * 0.8, yb + th * 0.06, x + ww, yb).C(x + ww * 0.5, yb - th * 0.3, x + ww * 0.2, yt + th * 0.3, x, yt).C(x - ww * 0.2, yt + th * 0.3, x - ww * 0.5, yb - th * 0.3, x - ww, yb).Z()
        pg.shape(P, w1)
        pg.line(Path().M(x - ww * 0.4, yb - th * 0.22).C(x - ww * 0.1, yb - th * 0.1, x + ww * 0.1, yb - th * 0.1, x + ww * 0.4, yb - th * 0.22), W3)


def round_tree(pg, x, base, h, w, w1=W2, leaf=True):
    """a round-crowned tree: a trunk and a crown of overlapping lobes (outline of the union)"""
    tw = w * 0.14
    pg.shape(Path().M(x - tw * 0.6, base).C(x - tw * 0.4, base - h * 0.3, x - tw * 0.3, base - h * 0.4, x - tw * 0.8, base - h * 0.55).L(x + tw * 0.8, base - h * 0.55).C(x + tw * 0.3, base - h * 0.4, x + tw * 0.4, base - h * 0.3, x + tw * 0.6, base).Z(), w1)
    cy = base - h * 0.68
    lobes = [(0, 0, 0.5), (-0.34, 0.12, 0.34), (0.34, 0.12, 0.34), (-0.22, -0.22, 0.34), (0.22, -0.22, 0.34), (0, 0.16, 0.36)]
    pg.union_circles([(x + dx * w, cy + dy * h * 0.5, r * w * 0.55) for (dx, dy, r) in lobes], w1)
    if leaf:
        for (dx, dy) in ((-0.12, -0.06), (0.14, 0.04), (0.0, 0.22)):
            pg.line(curve([(x + dx * w - 10, cy + dy * h * 0.5 + 6), (x + dx * w, cy + dy * h * 0.5 - 4), (x + dx * w + 10, cy + dy * h * 0.5 + 6)]), W3)


def mountain(pg, pts, base, w1=W2):
    """a mountain range: a smooth ridge through pts, filled down to base"""
    cur = curve(pts)
    Q = Path().M(pts[0][0], base).L(*pts[0]) + Path(cur.s[1:])
    Q.L(pts[-1][0], base).Z()
    pg.shape(Q, w1)
    return Q


def book_stack(pg, x, y, n=3, w=130, h=22, seed=0):
    """a stack of books standing on y (x = centre of the bottom book)"""
    for i in range(n):
        ww = w * (1 - 0.12 * (i % 2) - 0.05 * i)
        off = ((i * 7 + seed) % 5 - 2) * 5
        yy = y - (i + 1) * h
        pg.shape(rrect(x - ww / 2 + off, yy, ww, h, 3), W2)
        pg.line(Path().M(x - ww / 2 + off + 12, yy + 1).L(x - ww / 2 + off + 12, yy + h - 1), W3)
        pg.line(Path().M(x - ww / 2 + off + 18, yy + 1).L(x - ww / 2 + off + 18, yy + h - 1), W3)
        pg.line(Path().M(x + ww / 2 + off - 20, yy + h * 0.35).L(x + ww / 2 + off - 6, yy + h * 0.35), W3)


def mug(pg, x, y, w=62, h=62, steam=True):
    """a mug standing on y (x = centre), with a handle and curls of steam"""
    hp = Path().M(x + w / 2 - 2, y - h * 0.8).C(x + w / 2 + 34, y - h * 0.86, x + w / 2 + 34, y - h * 0.2, x + w / 2 - 4, y - h * 0.22)
    pg.line(hp, 9.5)
    pg.line(hp, 6.5, color='#fff')
    pg.shape(Path().M(x - w / 2, y - h).L(x + w / 2, y - h).L(x + w / 2 - 6, y - 5).C(x + w / 2 - 8, y, x + w / 2 - 14, y, x + w / 2 - 16, y).L(x - w / 2 + 16, y).C(x - w / 2 + 14, y, x - w / 2 + 8, y, x - w / 2 + 6, y - 5).Z(), W2)
    pg.shape(ell(x, y - h, w / 2, 7), W2)
    pg.line(Path().M(x - w / 2 + 8, y - h * 0.55).C(x - w / 4, y - h * 0.46, x + w / 4, y - h * 0.46, x + w / 2 - 8, y - h * 0.55), W3)
    if steam:
        for dx in (-14, 8):
            pg.line(curve([(x + dx, y - h - 14), (x + dx + 8, y - h - 30), (x + dx - 6, y - h - 46), (x + dx + 6, y - h - 62)]), W2)


def cushion(pg, x, y, w, h, kind='stripes'):
    """a plump rectangular cushion (x, y = top left)"""
    P = Path().M(x + 8, y + 2).C(x + w * 0.3, y - 6, x + w * 0.7, y - 6, x + w - 8, y + 2).C(x + w + 4, y + h * 0.3, x + w + 4, y + h * 0.7, x + w - 8, y + h - 2).C(x + w * 0.7, y + h + 6, x + w * 0.3, y + h + 6, x + 8, y + h - 2).C(x - 4, y + h * 0.7, x - 4, y + h * 0.3, x + 8, y + 2).Z()
    pg.shape(P, W2)
    if kind == 'stripes':
        pg.clip(P)
        for i in range(1, 6):
            pg.line(Path().M(x + w * i / 6, y - 10).L(x + w * i / 6, y + h + 10), W3)
        pg.endclip()
    elif kind == 'dots':
        pg.clip(P)
        for i in range(5):
            for j in range(3):
                pg.circle(x + w * (i + 0.5 + (0.5 if j % 2 else 0)) / 5.5, y + h * (j + 0.5) / 3, 4.2, W3)
        pg.endclip()
    elif kind == 'diamond':
        for k in range(3):
            pg.shape(m_diamond_s(x + w / 2, y + h / 2, w * (0.34 - k * 0.1), h * (0.42 - k * 0.12)), W3)
    pg.circle(x + w / 2, y + h / 2, 3.4, W3)


def window_arch(x0, x1, ytop, ybot):
    """outline of a window: straight sides, round top (ytop is the top of the arch)"""
    w = x1 - x0
    r = w / 2
    P = Path().M(x0, ybot).L(x0, ytop + r)
    arc_to(P, r, PI, TAU, x0 + r, ytop + r)
    P.L(x1, ybot).Z()
    return P


def lamp_bulb(pg, x, y, r=11):
    pg.shape(Path().M(x - r * 0.5, y - r * 1.2).L(x + r * 0.5, y - r * 1.2).L(x + r * 0.42, y - r * 0.8).C(x + r * 1.3, y - r * 0.4, x + r * 0.8, y + r * 1.4, x, y + r * 1.4).C(x - r * 0.8, y + r * 1.4, x - r * 1.3, y - r * 0.4, x - r * 0.42, y - r * 0.8).Z(), W2)


def string_lights(pg, x0, x1, y, sag, n):
    """a sagging string with bulbs hanging from it"""
    mid = (x0 + x1) / 2
    ctrl = [(x0, y), (x0 + (x1 - x0) * 0.3, y + sag * 1.2), (x0 + (x1 - x0) * 0.7, y + sag * 1.2), (x1, y)]
    pg.line(Path().M(*ctrl[0]).C(*ctrl[1], *ctrl[2], *ctrl[3]), W2)
    for i in range(1, n):
        t = i / n
        px, py = bez_pt(ctrl, t)
        pg.line(Path().M(px, py).L(px, py + 10), W3)
        lamp_bulb(pg, px, py + 22, 9)


def pup_ink():
    return Ink(ow=1.7, iw=1.15, dw=0.95, wob=0.1, wob_lo=0.2, step=1.6, color=False, inkc=INK)
