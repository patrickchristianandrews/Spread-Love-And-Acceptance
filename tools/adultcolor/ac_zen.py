#!/usr/bin/env python3
"""ac_zen.py: zentangle-style pattern pages for "Color and Breathe" (adultcolor29).

A page is cut into regions (tiles, ribbons, rings, leaves); each region is filled with its own pattern of closed cells, clipped to the
region, and the region's outline is drawn on top. Patterns are built from Bezier arcs and straight lines at the fine pen (W3)."""
import math
from ac_core import *

BIG = 900


def _rot(P, cx, cy, ang):
    return P.xf(mmul(mat(cx, cy, 1, False, ang), mat(-cx, -cy, 1))) if ang else P


# ---------------------------------------------------------------- patterns: each returns one Path, drawn with W3, covering the box
def _grid(x0, y0, x1, y1, gx, gy=None):
    gy = gy or gx
    xs = [x0 + i * gx for i in range(int((x1 - x0) / gx) + 2)]
    ys = [y0 + j * gy for j in range(int((y1 - y0) / gy) + 2)]
    return xs, ys


def p_scales(x0, y0, x1, y1, g):
    """fish scales: rows of arches, each row offset by half"""
    P = Path()
    r = g / 2
    row = 0
    y = y0
    while y < y1 + g:
        x = x0 - (r if row % 2 else 0) - g
        while x < x1 + g:
            P.M(x - r, y).C(x - r, y + r * 1.33, x + r, y + r * 1.33, x + r, y)
            x += g
        y += r
        row += 1
    return P


def p_bricks(x0, y0, x1, y1, g):
    P = Path()
    h = g * 0.62
    row = 0
    y = y0
    while y < y1 + h:
        P.M(x0 - g, y).L(x1 + g, y)
        x = x0 - g + (g / 2 if row % 2 else 0)
        while x < x1 + g:
            P.M(x, y).L(x, y + h)
            x += g
        y += h
        row += 1
    return P


def p_lattice(x0, y0, x1, y1, g):
    P = Path()
    n = int((x1 - x0 + y1 - y0) / g) + 3
    for i in range(-n, n):
        P.M(x0 + i * g, y0 - 10).L(x0 + i * g + (y1 - y0 + 20), y1 + 10)
        P.M(x0 + i * g, y1 + 10).L(x0 + i * g + (y1 - y0 + 20), y0 - 10)
    return P


def p_circles(x0, y0, x1, y1, g):
    """touching circles in a grid"""
    P = Path()
    xs, ys = _grid(x0, y0, x1, y1, g)
    for j, y in enumerate(ys):
        for x in xs:
            P = P + circ(x + g / 2, y + g / 2, g * 0.45)
    return P


def p_rings(x0, y0, x1, y1, g):
    """a circle with a smaller circle inside it, on a staggered grid"""
    P = Path()
    xs, ys = _grid(x0, y0, x1, y1, g)
    for j, y in enumerate(ys):
        for x in xs:
            cx, cy = x + (g / 2 if j % 2 else 0), y * 0.92
            P = P + circ(cx, cy, g * 0.46) + circ(cx, cy, g * 0.2)
    return P


def p_hex(x0, y0, x1, y1, g):
    P = Path()
    r = g * 0.55
    dx, dy = r * 1.5, r * math.sqrt(3) / 2
    i = 0
    x = x0 - r
    while x < x1 + r * 2:
        j = 0
        y = y0 - dy * 2 + (dy if i % 2 else 0)
        while y < y1 + dy * 2:
            pts = [polar(r, k * PI / 3, x, y) for k in range(6)]
            P.M(*pts[0])
            for p in pts[1:]:
                P.L(*p)
            P.Z()
            y += dy * 2
            j += 1
        x += dx
        i += 1
    return P


def p_tri(x0, y0, x1, y1, g):
    P = Path()
    h = g * math.sqrt(3) / 2
    y = y0 - h
    while y < y1 + h:
        P.M(x0 - g, y).L(x1 + g, y)
        y += h
    n = int((x1 - x0 + y1 - y0) / g) + 6
    for sg in (1, -1):
        for i in range(-n, n):
            xa = x0 + i * g
            if sg == 1:
                P.M(xa, y0 - h).L(xa + (y1 - y0 + 2 * h) / math.sqrt(3), y1 + h)
            else:
                P.M(xa, y1 + h).L(xa + (y1 - y0 + 2 * h) / math.sqrt(3), y0 - h)
    return P


def p_waves(x0, y0, x1, y1, g):
    """stacked wavy lines (each band between two waves is a long cell)"""
    P = Path()
    y = y0 - g
    while y < y1 + g:
        P.M(x0 - g, y)
        x = x0 - g
        up = True
        while x < x1 + g:
            P.C(x + g * 0.35, y + (-g * 0.42 if up else g * 0.42), x + g * 0.65, y + (-g * 0.42 if up else g * 0.42), x + g, y)
            x += g
            up = not up
        y += g * 0.62
    return P


def p_petals(x0, y0, x1, y1, g):
    """overlapping circles (a quatrefoil net)"""
    P = Path()
    xs, ys = _grid(x0, y0, x1, y1, g)
    for y in ys:
        for x in xs:
            P = P + circ(x, y, g * 0.71)
    return P


def p_leaves(x0, y0, x1, y1, g):
    P = Path()
    row = 0
    y = y0
    while y < y1 + g:
        x = x0 - g + (g / 2 if row % 2 else 0)
        while x < x1 + g:
            P = P + at(leaf_path(g * 0.9, g * 0.28), x, y + g * 0.2, -60 if row % 2 else -120)
            P.M(*(x, y + g * 0.2)).L(x + 0.1, y + g * 0.2) if False else None
            x += g
        y += g * 0.62
        row += 1
    return P


def p_chevron(x0, y0, x1, y1, g):
    P = Path()
    y = y0 - g
    while y < y1 + g:
        P.M(x0 - g, y + g * 0.45)
        x = x0 - g
        while x < x1 + g:
            P.L(x + g * 0.5, y).L(x + g, y + g * 0.45)
            x += g
        y += g * 0.45
    return P


def p_squares(x0, y0, x1, y1, g):
    """squares with a small circle in each"""
    P = Path()
    xs, ys = _grid(x0, y0, x1, y1, g)
    for x in xs:
        P.M(x, y0 - g).L(x, y1 + g)
    for y in ys:
        P.M(x0 - g, y).L(x1 + g, y)
    for y in ys:
        for x in xs:
            P = P + circ(x + g / 2, y + g / 2, g * 0.22)
    return P


def p_diamonds(x0, y0, x1, y1, g):
    """a net of diamonds, each with a small diamond inside"""
    P = Path()
    xs, ys = _grid(x0, y0, x1, y1, g, g * 1.4)
    for j, y in enumerate(ys):
        for x in xs:
            cx, cy = x + (g / 2 if j % 2 else 0), y
            a, b = g / 2, g * 0.7
            P.M(cx, cy - b).L(cx + a, cy).L(cx, cy + b).L(cx - a, cy).Z()
            a, b = g * 0.2, g * 0.28
            P.M(cx, cy - b).L(cx + a, cy).L(cx, cy + b).L(cx - a, cy).Z()
    return P


def p_weave(x0, y0, x1, y1, g):
    """a basket weave: pairs of bars, alternately across and down"""
    P = Path()
    s = g * 1.5
    xs, ys = _grid(x0, y0, x1, y1, s)
    for j, y in enumerate(ys):
        for i, x in enumerate(xs):
            if (i + j) % 2 == 0:
                for k in range(3):
                    yy = y + k * s / 3
                    P.M(x, yy).L(x + s, yy)
            else:
                for k in range(3):
                    xx = x + k * s / 3
                    P.M(xx, y).L(xx, y + s)
    return P


def p_crescents(x0, y0, x1, y1, g):
    """rows of small half moons"""
    P = Path()
    xs, ys = _grid(x0, y0, x1, y1, g, g * 0.8)
    for j, y in enumerate(ys):
        for x in xs:
            cx, cy = x + (g / 2 if j % 2 else 0), y
            P.M(cx - g * 0.4, cy).C(cx - g * 0.4, cy + g * 0.6, cx + g * 0.4, cy + g * 0.6, cx + g * 0.4, cy)
            P.C(cx + g * 0.2, cy + g * 0.18, cx - g * 0.2, cy + g * 0.18, cx - g * 0.4, cy).Z()
    return P


def p_stars(x0, y0, x1, y1, g):
    P = Path()
    xs, ys = _grid(x0, y0, x1, y1, g)
    for j, y in enumerate(ys):
        for x in xs:
            cx, cy = x + g / 2 + (g / 2 if j % 2 else 0), y + g / 2
            pts = [polar(g * 0.36 if i % 2 == 0 else g * 0.15, -PI / 2 + i * PI / 4, cx, cy) for i in range(8)]
            P.M(*pts[0])
            for p in pts[1:]:
                P.L(*p)
            P.Z()
    return P


def p_spiral(x0, y0, x1, y1, g):
    """little spirals: a curl in every cell"""
    P = Path()
    xs, ys = _grid(x0, y0, x1, y1, g)
    for j, y in enumerate(ys):
        for x in xs:
            cx, cy = x + g / 2 + (g / 2 if j % 2 else 0), y + g / 2
            P = P + curve(spiral_pts(cx, cy, 2.5, g * 0.38, 1.5, a0=0.5 * j, n=14))
    return P


def p_bubbles(x0, y0, x1, y1, g):
    """circles of three sizes, packed loosely (a fixed pattern, not random)"""
    P = Path()
    xs, ys = _grid(x0, y0, x1, y1, g * 1.2, g * 1.2)
    for j, y in enumerate(ys):
        for i, x in enumerate(xs):
            k = (i * 3 + j * 5) % 7
            r = (0.52, 0.34, 0.22, 0.44, 0.3, 0.5, 0.26)[k] * g
            P = P + circ(x + g * 0.6 + ((k * 7) % 5 - 2) * g * 0.08, y + g * 0.6 + ((k * 3) % 5 - 2) * g * 0.08, r)
    return P


def p_dotsrows(x0, y0, x1, y1, g):
    """rows of beads on lines"""
    P = Path()
    y = y0
    while y < y1 + g:
        P.M(x0 - g, y).L(x1 + g, y)
        for xx in range(int((x1 - x0) / g) + 3):
            x = x0 + xx * g + (g / 2 if int(y / g) % 2 else 0)
            P = P + circ(x, y + g * 0.5, g * 0.22)
        y += g
    return P


PATTERNS = {
    'scales': p_scales, 'bricks': p_bricks, 'lattice': p_lattice, 'circles': p_circles, 'rings': p_rings, 'hex': p_hex, 'tri': p_tri,
    'waves': p_waves, 'petals': p_petals, 'leaves': p_leaves, 'chevron': p_chevron, 'squares': p_squares, 'diamonds': p_diamonds,
    'weave': p_weave, 'crescents': p_crescents, 'stars': p_stars, 'spiral': p_spiral, 'bubbles': p_bubbles, 'beads': p_dotsrows,
}


# patterns that leave slivers or tiny cells (the overlapping-circle net, leaf rows, crescents, the triangle grid) are drawn as safer ones,
# and no pattern is drawn tighter than 24 units (0.24 in) between repeats, so every cell stays easy to color
_ALIAS = {'petals': 'circles', 'leaves': 'bubbles', 'tri': 'hex', 'crescents': 'stars'}


def _clamped(fn, lo):
    return lambda x0, y0, x1, y1, g: fn(x0, y0, x1, y1, max(g, lo))


for _k, _v in _ALIAS.items():
    PATTERNS[_k] = PATTERNS[_v]
for _k in list(PATTERNS):
    PATTERNS[_k] = _clamped(PATTERNS[_k], 22 if _k in ('beads', 'stars', 'waves', 'weave', 'chevron', 'chevron') else 26)


def bbox_of(P):
    xs, ys = [], []
    for pts, _c in P.flatten(8.0):
        for p in pts:
            xs.append(p[0])
            ys.append(p[1])
    return min(xs), min(ys), max(xs), max(ys)


def fill_region(pg, region, kind, g=26, ang=0.0, w=W2, pw=W3, shift=(0, 0)):
    """a white region with a pattern clipped inside it and its outline on top. The pattern is made only where the region is
    (in the pattern's own turned frame), so the file stays small."""
    x0, y0, x1, y1 = bbox_of(region)
    cx, cy = (x0 + x1) / 2, (y0 + y1) / 2
    pg.shape(region, w)
    if ang:
        back = region.xf(mmul(mat(cx, cy, 1, False, -ang), mat(-cx, -cy, 1)))
        bx0, by0, bx1, by1 = bbox_of(back)
    else:
        bx0, by0, bx1, by1 = x0, y0, x1, y1
    P = PATTERNS[kind](bx0 - g + shift[0], by0 - g + shift[1], bx1 + g + shift[0], by1 + g + shift[1], g)
    if ang:
        P = _rot(P, cx, cy, ang)
    pg.clip(region)
    pg.line(P, pw)
    pg.endclip()
    pg.line(region, w)


def smooth_wave(x0, x1, y_fn, n=40):
    return [(x0 + (x1 - x0) * i / n, y_fn(x0 + (x1 - x0) * i / n)) for i in range(n + 1)]


# ============================================================== the designs
def z_tiles(pg):
    """twelve little fields: a grid of rounded tiles, each with its own pattern"""
    x0, y0, x1, y1 = FX + 26, FY + 26, FX + FW - 26, FY + FH - 26
    cols, rows = 3, 4
    gap = 14
    tw = (x1 - x0 - gap * (cols - 1)) / cols
    th = (y1 - y0 - gap * (rows - 1)) / rows
    kinds = ['scales', 'diamonds', 'circles', 'hex', 'waves', 'petals', 'weave', 'rings', 'leaves', 'squares', 'tri', 'beads']
    angs = [0, 0, 0, 0, 90, 0, 0, 0, 0, 0, 0, 0]
    gs = [28, 26, 28, 28, 30, 28, 26, 30, 30, 30, 36, 24]
    for r in range(rows):
        for c in range(cols):
            i = r * cols + c
            reg = rrect(x0 + c * (tw + gap), y0 + r * (th + gap), tw, th, 26 if (r + c) % 2 == 0 else 6)
            fill_region(pg, reg, kinds[i], gs[i], angs[i])


def z_ribbon(pg):
    """flowing bands: parallel S-curves cut the page into ribbons, each with its own pattern"""
    x0, x1 = FX + 9, FX + FW - 9
    top, bot = FY + 9, FY + FH - 9
    n = 6
    def curve_y(k):
        base = top + (bot - top) * k / n
        return lambda x: base + 90 * math.sin((x - x0) / (x1 - x0) * TAU * 0.78 + k * 0.28 - 0.5) * (0.5 + 0.5 * math.sin(k * 1.1 + 0.4)) + (k - n / 2) * 12
    cvs = [smooth_wave(x0 - 20, x1 + 20, curve_y(k), 36) for k in range(n + 1)]
    cvs[0] = [(x0 - 20, top - 30), (x1 + 20, top - 30)]
    cvs[n] = [(x0 - 20, bot + 30), (x1 + 20, bot + 30)]
    kinds = ['scales', 'lattice', 'waves', 'petals', 'chevron', 'rings']
    gs = [30, 30, 30, 32, 30, 34]
    for k in range(n):
        a, b = cvs[k], cvs[k + 1]
        if k == 0:
            P = Path().M(*a[0]).L(*a[-1])
        else:
            P = curve(a)
        top_path = P
        # the region: along the upper curve, down the right edge, back along the lower curve
        reg = (curve(a) if k else Path().M(*a[0]).L(*a[-1]))
        lower = curve(b[::-1]) if k < n - 1 else Path().M(*b[-1]).L(*b[0])
        pts_b = lower.s
        reg = reg + Path([('L', pts_b[0][1])] + pts_b[1:]) + Path([('Z',)])
        fill_region(pg, reg, kinds[k], gs[k], [20, -30, 0, 15, 0, 25][k])


def z_orbit(pg):
    """a ring of rings: one big disk cut into rings, each with its own pattern, floating in a field of bubbles"""
    cx, cy = CX, CY
    pg.shape(rrect(FX + 9, FY + 9, FW - 18, FH - 18, 13), W2)
    pg.clip(rrect(FX + 9, FY + 9, FW - 18, FH - 18, 13))
    pg.line(p_bubbles(FX, FY, FX + FW, FY + FH, 34), W3)
    pg.endclip()
    pg.shape(circ(cx, cy, 316), W1)
    radii = [316, 262, 208, 154, 100, 52, 0]
    kinds = ['scales', 'diamonds', 'circles', 'waves', 'petals', 'hex']
    for k in range(6):
        ro, ri = radii[k], radii[k + 1]
        P = Path()
        arc_to(P, ro, 0, TAU, cx, cy, move=True)
        P.Z()
        if ri > 0:
            arc_to(P, ri, TAU, 0, cx, cy, move=True)
            P.Z()
        # even-odd: draw ring as a path with a hole
        pg.o.append('<path d="%s" fill="#fff" fill-rule="evenodd" stroke="%s" stroke-width="%s"/>' % (pd(P), INK, f(W2)))
        pg.clip(P)
        pg.line(PATTERNS[kinds[k]](cx - ro, cy - ro, cx + ro, cy + ro, [30, 26, 26, 30, 28, 22][k]), W3)
        pg.endclip()
        pg.line(P, W2)


def z_quilt(pg):
    """a quilt of diamonds: a tilted grid, each diamond with its own pattern, in a plain border"""
    x0, y0 = FX + 30, FY + 40
    cols, rows = 3, 5
    dw, dh = (FW - 60) / cols, (FH - 80) / rows * 1.0
    kinds = ['scales', 'circles', 'hex', 'lattice', 'petals', 'waves', 'diamonds', 'rings', 'tri', 'squares', 'beads', 'leaves',
             'crescents', 'stars', 'chevron', 'spiral', 'weave', 'bubbles', 'scales', 'hex', 'circles', 'rings', 'waves', 'petals']
    # a rotated square grid: diamonds of width dw, height dh
    cx0 = CX
    k = 0
    pts_all = []
    for r in range(rows * 2 + 1):
        for c in range(cols + 1):
            cxx = FX + 30 + c * dw + (dw / 2 if r % 2 else 0) - (dw / 2 if False else 0)
            cyy = y0 + r * dh / 2
            pts_all.append((cxx, cyy, r, c))
    pg.clip(rrect(FX + 22, FY + 26, FW - 44, FH - 52, 22))
    used = 0
    for (cxx, cyy, r, c) in pts_all:
        if cxx - dw / 2 < FX + 18 or cxx + dw / 2 > FX + FW - 18 + 2:
            pass
        reg = Path().M(cxx, cyy - dh / 2).L(cxx + dw / 2, cyy).L(cxx, cyy + dh / 2).L(cxx - dw / 2, cyy).Z()
        fill_region(pg, reg, kinds[used % len(kinds)], 26, [0, 90, 45, -45][used % 4], w=W2)
        used += 1
    pg.endclip()
    pg.line(rrect(FX + 22, FY + 26, FW - 44, FH - 52, 22), W2)


def z_leaf(pg):
    """one big leaf: its veins split it into fields, each patterned, with a ring of bubbles around it"""
    cx, cy = CX, CY
    L = 860
    top, bot = cy - L / 2, cy + L / 2
    outline = Path().M(cx, bot).C(cx - 330, bot - 200, cx - 330, top + 250, cx, top).C(cx + 330, top + 250, cx + 330, bot - 200, cx, bot).Z()
    pg.clip(rrect(FX + 9, FY + 9, FW - 18, FH - 18, 13))
    pg.line(p_stars(FX, FY, FX + FW, FY + FH, 58), W3)
    pg.endclip()
    pg.shape(outline, W1)
    kinds = ['scales', 'diamonds', 'hex', 'petals', 'waves', 'circles', 'rings', 'chevron']
    # side regions between veins: cut the leaf with curves from the midrib
    ys = [bot - 40 - i * (L - 140) / 8 for i in range(9)]
    pg.clip(outline)
    k = 0
    for i in range(8):
        for sg in (-1, 1):
            ya, yb = ys[i], ys[i + 1]
            xa = cx
            P = Path().M(cx, ya).C(cx + sg * 160, ya - 20, cx + sg * 300, yb + 70, cx + sg * 340, yb + 10 - 0)
            P.L(cx + sg * 340, yb - 60 if i < 7 else yb - 400).L(cx, yb)
            P.C(cx, yb, cx, yb, cx, yb)
            P.Z()
            fill_region(pg, P, kinds[(i * 2 + (0 if sg < 0 else 1)) % len(kinds)], 20, [0, 90, 45][i % 3], w=W2)
    pg.endclip()
    pg.line(Path().M(cx, bot + 14).L(cx, top + 40), W1)


def z_rainbow(pg):
    """a rainbow of patterns: seven arches, each with its own pattern, over a field of small stars"""
    cx, cy = CX, CY + 250
    pg.clip(rrect(FX + 9, FY + 9, FW - 18, FH - 18, 13))
    pg.line(p_stars(FX, FY, FX + FW, FY + FH, 46), W3)
    pg.endclip()
    radii = [350, 308, 266, 224, 182, 140, 98, 56]
    kinds = ['scales', 'waves', 'diamonds', 'beads', 'petals', 'chevron', 'circles']
    for k in range(7):
        ro, ri = radii[k], radii[k + 1]
        P = Path()
        arc_to(P, ro, PI, TAU, cx, cy, move=True)
        P.L(*polar(ri, TAU, cx, cy))
        arc_to(P, ri, TAU, PI, cx, cy)
        P.Z()
        fill_region(pg, P, kinds[k], 18, 0 if k not in (1,) else 0)
    # the middle: a little half disk, and clouds at the two feet of the rainbow
    P = Path()
    arc_to(P, 56, PI, TAU, cx, cy, move=True)
    P.Z()
    pg.shape(P, W2)
    from ac_props import cloud
    cloud(pg, cx - 330 + 40, cy + 10, 130, 60)
    cloud(pg, cx + 330 - 40, cy + 10, 130, 60)
    # clouds at the feet
    for sg in (-1, 1):
        for (dx, dy, r) in ((0, 0, 40), (44, 6, 30), (-44, 6, 30)):
            pass
