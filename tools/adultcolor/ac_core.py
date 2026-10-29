#!/usr/bin/env python3
"""ac_core.py: the drawing kit for "Color and Breathe" (adultcolor29), the adult coloring book.

Everything is vector, written as SVG paths with true cubic Beziers. One page is 850 x 1100 units (100 to the inch).
Pens (units; 1 unit = 0.72 pt):  W1 bold 1.45 (1.04 pt)   W2 main 1.15 (0.83 pt)   W3 fine 0.90 (0.65 pt)
Every shape is drawn in painter's order with a white fill, so a line is hidden where something sits in front of it: no messy overlaps.
Shape makers (Path, ell, circ, blob, curve, rrect, rpoly ...) come from tools/kids/cute.py, the same engine as the kids books."""
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
KIDS = os.path.join(HERE, '..', 'kids')
sys.path.insert(0, os.path.abspath(KIDS))
from cute import Path, ell, circ, blob, curve, rrect, rpoly, star_path, heart_path, mat, mmul, apply, TAU, Ink, spiral_pts  # noqa: E402,F401

INK = '#141414'
W1, W2, W3 = 1.45, 1.15, 0.90
PW, PH = 850, 1100
# the frame: left margin 0.62 in (the binding side of a right-hand page), the others 0.52 in
FX, FY, FW, FH = 62, 52, 736, 996
CX, CY = FX + FW / 2, FY + FH / 2          # the middle of the frame: (430, 550)
PI = math.pi


def f(x):
    s = '%.2f' % x
    s = s.rstrip('0').rstrip('.') if '.' in s else s
    return '0' if s in ('-0', '') else s


def pd(P):
    """SVG path data of a cute.Path, curves kept as curves"""
    o = []
    for sg in P.s:
        k = sg[0]
        if k == 'M':
            o.append('M%s %s' % (f(sg[1][0]), f(sg[1][1])))
        elif k == 'L':
            o.append('L%s %s' % (f(sg[1][0]), f(sg[1][1])))
        elif k == 'C':
            o.append('C%s %s %s %s %s %s' % (f(sg[1][0]), f(sg[1][1]), f(sg[2][0]), f(sg[2][1]), f(sg[3][0]), f(sg[3][1])))
        else:
            o.append('Z')
    return ''.join(o)


def polar(r, a, cx=0.0, cy=0.0):
    return (cx + r * math.cos(a), cy + r * math.sin(a))


def arc_to(P, r, a0, a1, cx=0.0, cy=0.0, move=False):
    """append a circular arc (radius r, angle a0 to a1 in radians, around cx, cy) as cubic Beziers"""
    n = max(1, int(math.ceil(abs(a1 - a0) / (PI / 3) - 1e-9)))
    for i in range(n):
        s = a0 + (a1 - a0) * i / n
        e = a0 + (a1 - a0) * (i + 1) / n
        k = 4 / 3 * math.tan((e - s) / 4)
        p0 = polar(r, s, cx, cy)
        p3 = polar(r, e, cx, cy)
        c1 = (p0[0] - k * r * math.sin(s), p0[1] + k * r * math.cos(s))
        c2 = (p3[0] + k * r * math.sin(e), p3[1] - k * r * math.cos(e))
        if move and i == 0:
            P.M(*p0)
        P.C(c1[0], c1[1], c2[0], c2[1], p3[0], p3[1])
    return P


def at(P, x=0.0, y=0.0, rot=0.0, s=1.0, flip=False, sy=None):
    """place a local Path: scale, rotate (degrees), then move"""
    return P.xf(mat(x, y, s, flip, rot, sy))


def at_rad(P, cx, cy, a, s=1.0):
    return P.xf(mat(cx, cy, s, False, math.degrees(a)))


def mirror_y(P):
    return P.xf(mat(0, 0, 1, False, 0, -1))


def mirror_x(P):
    return P.xf(mat(0, 0, -1, False, 0, 1))


def sym(P):
    """a path and its mirror image across the x axis, as one Path"""
    return P + mirror_y(P)


def dist(a, b):
    return math.hypot(a[0] - b[0], a[1] - b[1])


def lerp(a, b, t):
    return (a[0] + (b[0] - a[0]) * t, a[1] + (b[1] - a[1]) * t)


def bez(p0, p1, p2, p3, t):
    u = 1 - t
    return (u ** 3 * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t ** 3 * p3[0],
            u ** 3 * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t ** 3 * p3[1])


def polyline_len(pts):
    return sum(dist(pts[i], pts[i + 1]) for i in range(len(pts) - 1))


def sample_path(P, n=60):
    """points along the first sub-path of a Path, by flattening"""
    subs = P.flatten(2.0)
    return subs[0][0] if subs else []


class Pg:
    """one page of line art"""

    def __init__(self, palette=None):
        self.o = []
        self.defs = []
        self.n = 0
        self.pal = palette       # a list of colors: only the cover uses it (the interior is gray only)
        self.pi = 0

    def ring(self):
        """the next ring of a mandala takes the next color of the palette (cover only)"""
        self.pi += 1

    def nid(self, p='c'):
        Pg._U = getattr(Pg, '_U', 0) + 1
        return '%s%d' % (p, Pg._U)

    # ---- drawing
    def line(self, P, w=W2, dash=None, cap='round', color=None):
        d = P if isinstance(P, str) else pd(P)
        self.o.append('<path d="%s" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="%s" stroke-linejoin="round"%s/>' % (d, color or INK, f(w), cap, (' stroke-dasharray="%s"' % dash) if dash else ''))

    def union_circles(self, cs, w=W2, below=None, inner=True):
        """the outline of the union of circles (x, y, r): drawn black then white so only the outer boundary shows.
        below: a y value; everything under it is cut off (a flat bottom)."""
        if below is not None:
            self.clip(Path().M(-50, -50).L(PW + 50, -50).L(PW + 50, below).L(-50, below).Z())
        for (x, y, r) in cs:
            self.o.append('<circle cx="%s" cy="%s" r="%s" fill="%s"/>' % (f(x), f(y), f(r + W2 / 2), INK))
        for (x, y, r) in cs:
            self.o.append('<circle cx="%s" cy="%s" r="%s" fill="#fff"/>' % (f(x), f(y), f(max(0.5, r - W2 / 2))))
        if below is not None:
            self.endclip()
            xs0 = min(x - r for (x, y, r) in cs)
            xs1 = max(x + r for (x, y, r) in cs)
            self.line(Path().M(xs0, below).L(xs1, below), W2)

    def shape(self, P, w=W2, fill='#fff'):
        if self.pal and fill == '#fff':
            fill = self.pal[self.pi % len(self.pal)]
        d = P if isinstance(P, str) else pd(P)
        self.o.append('<path d="%s" fill="%s" stroke="%s" stroke-width="%s" stroke-linejoin="round" stroke-linecap="round"/>' % (d, fill, INK, f(w)))

    def fill(self, P, color=INK):
        """a solid ink shape with no outline (tiny accents only)"""
        d = P if isinstance(P, str) else pd(P)
        self.o.append('<path d="%s" fill="%s"/>' % (d, color))

    def white(self, P):
        d = P if isinstance(P, str) else pd(P)
        self.o.append('<path d="%s" fill="#fff"/>' % d)

    def circle(self, x, y, r, w=W2, fill='#fff'):
        self.o.append('<circle cx="%s" cy="%s" r="%s" fill="%s" stroke="%s" stroke-width="%s"/>' % (f(x), f(y), f(r), fill, INK, f(w)))

    def dot(self, x, y, r=1.7):
        self.o.append('<circle cx="%s" cy="%s" r="%s" fill="%s"/>' % (f(x), f(y), f(r), INK))

    def raw(self, s):
        self.o.append(s)

    def clip(self, P):
        cid = self.nid('k')
        d = P if isinstance(P, str) else pd(P)
        self.defs.append('<clipPath id="%s"><path d="%s"/></clipPath>' % (cid, d))
        self.o.append('<g clip-path="url(#%s)">' % cid)

    def endclip(self):
        self.o.append('</g>')

    def frame(self):
        """the one frame every design shares: a rounded rectangle and a finer line just inside it"""
        self.line(rrect(FX, FY, FW, FH, 20), W1)
        self.line(rrect(FX + 9, FY + 9, FW - 18, FH - 18, 13), W3)

    def page(self, fn, *a, **k):
        """one finished page: the design clipped to the frame, then the frame on top"""
        self.inner_clip()
        fn(self, *a, **k)
        self.endclip()
        self.frame()

    def inner_clip(self):
        self.clip(rrect(FX + 9, FY + 9, FW - 18, FH - 18, 13))

    def svg(self, label=''):
        return '<svg xmlns="http://www.w3.org/2000/svg" class="art" viewBox="0 0 %d %d" role="img" aria-label="%s">%s%s</svg>' % (
            PW, PH, label.replace('"', '&quot;'), ('<defs>%s</defs>' % ''.join(self.defs)) if self.defs else '', ''.join(self.o))


# ------------------------------------------------------------------ ribbons and strokes
def offset_pts(pts, w0, w1=None):
    """left and right edge points of a ribbon of changing width along a point list"""
    w1 = w0 if w1 is None else w1
    n = len(pts)
    L, R = [], []
    for i, p in enumerate(pts):
        a = pts[max(0, i - 1)]
        b = pts[min(n - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        d = math.hypot(dx, dy) or 1
        nx, ny = -dy / d, dx / d
        t = i / (n - 1) if n > 1 else 0
        hw = (w0 + (w1 - w0) * t) / 2
        L.append((p[0] + nx * hw, p[1] + ny * hw))
        R.append((p[0] - nx * hw, p[1] - ny * hw))
    return L, R


def ribbon(ctrl, w0, w1=None, n=24):
    """a closed, smooth stem shape along a curve through ctrl points, from width w0 to w1"""
    pts = sample_path(curve(ctrl))
    tot = polyline_len(pts)
    res = []
    acc = 0.0
    j = 0
    for k in range(n + 1):
        target = tot * k / n
        while j < len(pts) - 2 and acc + dist(pts[j], pts[j + 1]) < target:
            acc += dist(pts[j], pts[j + 1])
            j += 1
        seg = dist(pts[j], pts[j + 1]) or 1
        t = max(0.0, min(1.0, (target - acc) / seg))
        res.append(lerp(pts[j], pts[j + 1], t))
    L, R = offset_pts(res, w0, w1)
    P = curve(L)
    back = curve(R[::-1])
    return P + Path([('L', back.s[0][1])] + back.s[1:]) + Path([('Z',)])


def stem_line(ctrl, w=W2):
    return curve(ctrl)


def ngon_pts(n, r, a0=-PI / 2, cx=0, cy=0):
    return [polar(r, a0 + i * TAU / n, cx, cy) for i in range(n)]


def smooth_closed(pts, k=1.0):
    return blob(pts, closed=True, k=k)


def lens(x0, y0, x1, y1, bulge):
    """a pointed almond between two points; bulge is the half width in the middle"""
    dx, dy = x1 - x0, y1 - y0
    L = math.hypot(dx, dy) or 1
    nx, ny = -dy / L, dx / L
    P = Path().M(x0, y0)
    P.C(x0 + dx * 0.25 + nx * bulge * 1.3, y0 + dy * 0.25 + ny * bulge * 1.3, x0 + dx * 0.75 + nx * bulge * 1.0, y0 + dy * 0.75 + ny * bulge * 1.0, x1, y1)
    P.C(x0 + dx * 0.75 - nx * bulge * 1.0, y0 + dy * 0.75 - ny * bulge * 1.0, x0 + dx * 0.25 - nx * bulge * 1.3, y0 + dy * 0.25 - ny * bulge * 1.3, x0, y0)
    P.Z()
    return P


def leaf_path(L, wd, curl=0.0, tip=0.5):
    """a leaf from (0,0) to (L,0), half width wd; curl bends the tip sideways (-1..1)"""
    c = curl * L * 0.18
    P = Path().M(0, 0)
    P.C(L * 0.18, -wd * 1.25, L * 0.62, -wd * 1.05 + c, L, c * 1.6)
    P.C(L * 0.66, wd * 1.05 + c, L * 0.22, wd * 1.25, 0, 0)
    P.Z()
    return P


def leaf_midrib(L, curl=0.0, frac=0.9):
    c = curl * L * 0.18
    return Path().M(L * 0.04, 0).C(L * 0.3, 0.0 + c * 0.1, L * 0.62, c * 0.5, L * frac, c * 1.45)


def leaf_veins(L, wd, curl=0.0, n=4, start=0.22, end=0.78):
    """curved side veins that stop short of the edge (open strokes)"""
    c = curl * L * 0.18
    P = Path()
    for i in range(n):
        t = start + (end - start) * i / max(1, n - 1)
        x = L * t
        yy = c * (t ** 2) * 1.2
        for sgn in (-1, 1):
            P.M(x, yy).C(x + L * 0.07, yy + sgn * wd * 0.3, x + L * 0.13, yy + sgn * wd * 0.55, x + L * 0.17, yy + sgn * wd * 0.62 * (1 - t * 0.5))
    return P


def draw_leaf(pg, x, y, ang, L, wd, curl=0.0, veins=4, w=W2, mid=True):
    """a leaf with a midrib and curved veins, placed at (x, y) pointing along ang (degrees)"""
    pg.shape(at(leaf_path(L, wd, curl), x, y, ang), w)
    if mid:
        pg.line(at(leaf_midrib(L, curl), x, y, ang), W3)
    if veins:
        pg.line(at(leaf_veins(L, wd, curl, veins), x, y, ang), W3)
