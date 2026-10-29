#!/usr/bin/env python3
"""pat.py: zentangle-style pattern fills and ornamental borders for the older coloring book (kids29).

fill(ink, region, kind, ...) clips to a closed Path (in page units) and draws a fine, regular pattern in the detail pen,
leaving every cell open to color. border(ink, style) draws the decorative frame. Patterns never carry a color of their own."""
import math
from cute import *

FR = (62, 58, 726, 884)


def _bbox(path):
    xs, ys = [], []
    for pts, _c in path.flatten(12.0):
        for p in pts:
            xs.append(p[0])
            ys.append(p[1])
    return min(xs), min(ys), max(xs), max(ys)


def fill(ink, region, kind='dots', gap=18.0, w=None, ang=0.0, seed=0, box=None):
    """draw a pattern inside region (a closed Path in page coordinates); box limits where the pattern runs"""
    x0, y0, x1, y1 = _bbox(region)
    if box:
        x0, y0, x1, y1 = max(x0, box[0]), max(y0, box[1]), min(x1, box[2]), min(y1, box[3])
    if kind == 'dots' and w is None:
        w = ink.dw * 2.6
    P = Path()
    n = 0
    if kind == 'hatch':
        a = math.radians(ang)
        ca, sa = math.cos(a), math.sin(a)
        cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
        R = math.hypot(x1 - x0, y1 - y0) / 2 + 4
        k = -R
        while k <= R:
            P.M(cx + ca * (-R) - sa * k, cy + sa * (-R) + ca * k).L(cx + ca * R - sa * k, cy + sa * R + ca * k)
            k += gap
    elif kind == 'dots':
        row = 0
        y = y0 + gap / 2
        while y < y1:
            x = x0 + (gap / 2 if row % 2 else 0) + gap / 2
            while x < x1:
                P.M(x - 0.1, y).L(x + 0.1, y)
                x += gap
            y += gap * 0.9
            row += 1
    elif kind == 'rings':
        row = 0
        y = y0 + gap / 2
        while y < y1:
            x = x0 + (gap / 2 if row % 2 else 0) + gap / 2
            while x < x1:
                P = P + ell(x, y, gap * 0.28, gap * 0.28)
                x += gap
            y += gap * 0.9
            row += 1
    elif kind == 'scales':
        r = gap / 2
        row = 0
        y = y0
        while y < y1 + r:
            x = x0 - (r if row % 2 else 0)
            while x < x1 + r:
                P.M(x - r, y).C(x - r, y + r * 1.3, x + r, y + r * 1.3, x + r, y)
                x += gap
            y += r * 0.9
            row += 1
    elif kind == 'waves':
        y = y0
        while y < y1 + gap:
            P.M(x0 - gap, y)
            x = x0 - gap
            while x < x1 + gap:
                P.C(x + gap * 0.25, y - gap * 0.3, x + gap * 0.75, y - gap * 0.3, x + gap, y)
                x += gap
                if x < x1 + gap:
                    P.C(x + gap * 0.25, y + gap * 0.3, x + gap * 0.75, y + gap * 0.3, x + gap, y)
                    x += gap
            y += gap * 0.8
    elif kind == 'lattice':
        a = 45
        for sgn in (1, -1):
            R = max(x1 - x0, y1 - y0)
            k = -R
            while k <= R * 2:
                P.M(x0 + k, y0).L(x0 + k + sgn * R * 1.0, y0 + R) if sgn == 1 else P.M(x0 + k, y0).L(x0 + k - R, y0 + R)
                k += gap
    elif kind == 'bricks':
        row = 0
        y = y0
        while y < y1:
            P.M(x0, y).L(x1, y)
            x = x0 + (gap if row % 2 else gap / 2)
            while x < x1:
                P.M(x, y).L(x, y + gap * 0.55)
                x += gap
            y += gap * 0.55
            row += 1
    elif kind == 'zigzag':
        y = y0
        while y < y1 + gap:
            P.M(x0 - gap, y)
            x = x0 - gap
            up = True
            while x < x1 + gap:
                x += gap * 0.5
                P.L(x, y - gap * 0.3 if up else y + gap * 0.3)
                up = not up
            y += gap * 0.9
    elif kind == 'stars':
        row = 0
        y = y0 + gap / 2
        while y < y1:
            x = x0 + (gap / 2 if row % 2 else 0) + gap / 2
            while x < x1:
                r = gap * 0.22
                P.M(x - r, y).L(x + r, y).M(x, y - r).L(x, y + r)
                x += gap
            y += gap
            row += 1
    elif kind == 'leaves':
        row = 0
        y = y0
        while y < y1 + gap:
            x = x0 + (gap * 0.5 if row % 2 else 0)
            while x < x1 + gap:
                P.M(x, y + gap * 0.3).C(x - gap * 0.22, y, x - gap * 0.1, y - gap * 0.3, x, y - gap * 0.4).C(x + gap * 0.1, y - gap * 0.3, x + gap * 0.22, y, x, y + gap * 0.3)
                x += gap
            y += gap * 0.7
            row += 1
    elif kind == 'swirls':
        row = 0
        y = y0 + gap / 2
        while y < y1:
            x = x0 + (gap / 2 if row % 2 else 0) + gap / 2
            while x < x1:
                pts = spiral_pts(x, y, 0.5, gap * 0.36, 1.5, a0=0.4 * row, n=14)
                P = P + curve(pts)
                x += gap
            y += gap * 0.95
            row += 1
    elif kind == 'diamonds':
        row = 0
        y = y0
        while y < y1 + gap:
            x = x0 + (gap / 2 if row % 2 else 0)
            while x < x1 + gap:
                r = gap * 0.36
                P.M(x, y - r).L(x + r, y).L(x, y + r).L(x - r, y).Z()
                x += gap
            y += gap * 0.5
            row += 1
    elif kind == 'petals':
        row = 0
        y = y0
        while y < y1 + gap:
            x = x0 + (gap / 2 if row % 2 else 0)
            while x < x1 + gap:
                P.M(x - gap * 0.4, y).C(x - gap * 0.4, y - gap * 0.5, x + gap * 0.4, y - gap * 0.5, x + gap * 0.4, y)
                P.M(x, y - gap * 0.3).L(x, y - gap * 0.05)
                x += gap
            y += gap * 0.55
            row += 1
    else:
        raise ValueError(kind)
    ink.clip_begin(region)
    with ink.fig(0, 0, 1.0, outline=False) as g:
        g.line(P, w=w or ink.dw * 1.0)
    ink.clip_end()


def shape_fill(ink, path, kind, gap=18, c='#fff', ang=0, w=None, outline=True, box=None):
    """draw path as a white shape and fill it with a pattern (one call for the usual case)"""
    with ink.fig(0, 0, 1.0, outline=outline) as g:
        g.part(path, c=c)
    fill(ink, path, kind, gap, w, ang, box=box)
    with ink.fig(0, 0, 1.0, outline=False) as g:
        g.line(path, w=ink.iw)


# ------------------------------------------------------------------ borders
def _rr_points(x, y, w, h, r, step):
    """points along a rounded rectangle, clockwise from the top middle, with the direction angle"""
    pts = []
    per = []
    segs = [('L', (x + w / 2, y), (x + w - r, y)), ('A', (x + w - r, y + r), -90, 0), ('L', (x + w, y + r), (x + w, y + h - r)), ('A', (x + w - r, y + h - r), 0, 90),
            ('L', (x + w - r, y + h), (x + r, y + h)), ('A', (x + r, y + h - r), 90, 180), ('L', (x, y + h - r), (x, y + r)), ('A', (x + r, y + r), 180, 270),
            ('L', (x + r, y), (x + w / 2, y))]
    out = []
    for s in segs:
        if s[0] == 'L':
            (ax, ay), (bx, by) = s[1], s[2]
            L = math.hypot(bx - ax, by - ay)
            ang = math.degrees(math.atan2(by - ay, bx - ax))
            out.append(('L', ax, ay, bx, by, L, ang))
        else:
            (cx, cy), a0, a1 = s[1], s[2], s[3]
            out.append(('A', cx, cy, r, a0, a1, r * math.radians(a1 - a0)))
    total = sum(o[5] if o[0] == 'L' else o[6] for o in out)
    n = max(8, int(round(total / step)))
    d = total / n
    res = []
    for i in range(n):
        t = i * d
        acc = 0
        for o in out:
            ln = o[5] if o[0] == 'L' else o[6]
            if t <= acc + ln + 1e-6:
                u = (t - acc) / ln if ln else 0
                if o[0] == 'L':
                    res.append((o[1] + (o[3] - o[1]) * u, o[2] + (o[4] - o[2]) * u, o[6]))
                else:
                    a = math.radians(o[4] + (o[5 - 1 + 0] if False else (o[5] if False else 0)))
                    a = math.radians(o[4] + (o[5] - o[4]) * u)
                    res.append((o[1] + math.cos(a) * o[3], o[2] + math.sin(a) * o[3], math.degrees(a) + 90))
                break
            acc += ln
    return res


def _motif(kind, s):
    """a small motif centered at the origin, pointing along +x (returns a Path)"""
    if kind == 'leaf':
        return Path().M(-s, 0).C(-s * 0.4, -s * 0.8, s * 0.4, -s * 0.8, s, 0).C(s * 0.4, s * 0.8, -s * 0.4, s * 0.8, -s, 0).Z()
    if kind == 'dot':
        return circ(0, 0, s * 0.45)
    if kind == 'scallop':
        return Path().M(-s, s * 0.3).C(-s, -s * 0.9, s, -s * 0.9, s, s * 0.3)
    if kind == 'star':
        return sparkle4_path(s)
    if kind == 'diamond':
        return rpoly([(-s, 0), (0, -s * 0.7), (s, 0), (0, s * 0.7)], s * 0.12)
    if kind == 'heart':
        return heart_path(0, 0, s * 0.7)
    if kind == 'wave':
        return Path().M(-s, 0).C(-s * 0.5, -s * 0.9, 0, -s * 0.9, 0, 0).C(0, s * 0.9, s * 0.5, s * 0.9, s, 0)
    if kind == 'petal':
        return Path().M(-s * 0.6, 0).C(-s * 0.2, -s, s * 0.6, -s * 0.6, s * 0.9, 0).C(s * 0.6, s * 0.6, -s * 0.2, s, -s * 0.6, 0).Z()
    if kind == 'ring':
        return circ(0, 0, s * 0.6)
    raise ValueError(kind)


def sparkle4_path(r, w=0.3):
    k = r * w
    P = Path().M(0, -r)
    P.C(k * 0.3, -k, k, -k * 0.3, r, 0).C(k, k * 0.3, k * 0.3, k, 0, r).C(-k * 0.3, k, -k, k * 0.3, -r, 0).C(-k, -k * 0.3, -k * 0.3, -k, 0, -r).Z()
    return P


def border(ink, style='leaf', band=30, step=26, r=44, closed=True, rect=None):
    """an ornamental frame: an outer and an inner line with a band of repeated motifs between them. Returns the inner box."""
    x, y, w, h = rect or FR
    ow = ink.ow
    with ink.fig(0, 0, outline=False) as g:
        g.line(rrect(x, y, w, h, r), w=ink.ow * 1.0)
        g.line(rrect(x + band, y + band, w - 2 * band, h - 2 * band, max(r - band, 8)), w=ink.ow * 0.8)
    pts = _rr_points(x + band / 2, y + band / 2, w - band, h - band, max(r - band / 2, 10), step)
    kinds = style if isinstance(style, (list, tuple)) else (style,)
    for i, (px, py, ang) in enumerate(pts):
        k = kinds[i % len(kinds)]
        m = _motif(k, band * 0.30)
        with ink.fig(px, py, 1.0, False, ang, outline=False) as g:
            g.part(m, w=ink.dw * 0.8) if k in ('leaf', 'diamond', 'heart', 'petal', 'ring', 'star', 'dot') else g.line(m, w=ink.dw * 0.85)
    # corner rosettes
    for (cx, cy) in ((x + band / 2 + 10, y + band / 2 + 10), (x + w - band / 2 - 10, y + band / 2 + 10), (x + band / 2 + 10, y + h - band / 2 - 10), (x + w - band / 2 - 10, y + h - band / 2 - 10)):
        pass
    return (x + band, y + band, x + w - band, y + h - band)


def mandala(ink, cx, cy, r, rings=4, petals=12, seed=0, lvl=1):
    """a round mandala: concentric rings of petals, scallops, dots and a flower middle, all open cells"""
    with ink.fig(cx, cy, 1.0, outline=False) as g:
        g.line(circ(0, 0, r), w=ink.ow * 0.7)
        rad = r
        for k in range(rings):
            n = petals + k * 2
            ro = rad
            ri = rad - r * 0.2
            kind = k % 4
            for i in range(n):
                a = i * TAU / n
                ca, sa = math.cos(a), math.sin(a)
                da = TAU / n
                if kind == 0:   # pointed petals
                    P = Path().M(math.cos(a - da * 0.5) * ri, math.sin(a - da * 0.5) * ri)
                    P.C(math.cos(a - da * 0.55) * (ri + ro) / 2, math.sin(a - da * 0.55) * (ri + ro) / 2, ca * ro * 0.98, sa * ro * 0.98, ca * ro, sa * ro)
                    P.C(ca * ro * 0.98, sa * ro * 0.98, math.cos(a + da * 0.55) * (ri + ro) / 2, math.sin(a + da * 0.55) * (ri + ro) / 2, math.cos(a + da * 0.5) * ri, math.sin(a + da * 0.5) * ri)
                    g.line(P, w=ink.dw * 0.85)
                elif kind == 1:  # scallops
                    P = Path().M(math.cos(a - da * 0.5) * ro, math.sin(a - da * 0.5) * ro)
                    mid = (ro + ri) / 2
                    P.C(math.cos(a - da * 0.5) * ri, math.sin(a - da * 0.5) * ri, math.cos(a + da * 0.5) * ri, math.sin(a + da * 0.5) * ri, math.cos(a + da * 0.5) * ro, math.sin(a + da * 0.5) * ro)
                    g.line(P, w=ink.dw * 0.85)
                elif kind == 2:  # dots
                    g.part(circ(ca * (ro + ri) / 2, sa * (ro + ri) / 2, r * 0.025 + 1), w=ink.dw * 0.8)
                else:            # spokes
                    g.line(Path().M(ca * ri, sa * ri).L(ca * ro, sa * ro), w=ink.dw * 0.8)
            g.line(circ(0, 0, ri), w=ink.dw * 0.9)
            rad = ri
        # the flower in the middle
        for i in range(8):
            a = i * TAU / 8
            g.part(ell(math.cos(a) * rad * 0.5, math.sin(a) * rad * 0.5, rad * 0.35, rad * 0.16, math.degrees(a)), w=ink.dw * 0.9)
        g.part(circ(0, 0, rad * 0.22), w=ink.dw * 0.9)
