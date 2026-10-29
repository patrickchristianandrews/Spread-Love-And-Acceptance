#!/usr/bin/env python3
"""props_o.py: scenery for the older coloring book (kids29): pattern-filled clouds, hills, trees, houses, water, flowers.
Everything is built from closed shapes with zentangle-style fills so every cell can be colored."""
import math
import random
from cute import *
import pat
import props as pr
import props2 as p2
import props3 as p3

FL, FT, FRt, FB = 92, 88, 758, 912          # the inner art area (inside the ornamental border)


def o_ink(seed=1):
    return Ink(ow=1.9, iw=1.2, dw=1.0, wob=0.22, wob_lo=0.55, step=3.2, seed=seed)


def begin(ink, style='leaf', rr=14, rect=None):
    """draw the ornamental border and start clipping to the inner picture area"""
    ink.border_style = style
    x, y, w, h = rect or (62, 58, 726, 884)
    pat.border(ink, style, rect=(x, y, w, h))
    ink._inner = (x + 30, y + 30, x + w - 30, y + h - 30)
    ink.clip_begin(rrect(x + 30, y + 30, w - 60, h - 60, rr))


def end(ink):
    ink.clip_end()
    x0, y0, x1, y1 = ink._inner
    with ink.fig(0, 0, outline=False) as g:
        g.line(rrect(x0, y0, x1 - x0, y1 - y0, 14), w=ink.ow * 0.9)


def F(ink, fn, box, anchor='bottom', maxs=None):
    return fit(ink, fn, box, anchor, maxs)


def sh(ink, path, c='#fff', pattern=None, gap=12, ang=0, box=None, outline=True):
    """a closed shape (outlined) with an optional pattern inside"""
    if pattern:
        pat.shape_fill(ink, path, pattern, gap, c, ang, box=box, outline=outline)
    else:
        with ink.fig(0, 0, 1.0, outline=outline) as g:
            g.part(path, c=c)


def cloud_z(ink, x, y, s=1.0, w=240, h=100, n=4, pattern='scales', gap=11):
    path = cloud_path_page(x, y, s, w, h, n)
    sh(ink, path, '#EAF4FF', pattern, gap * s ** 0.5, box=(x - w * s / 2, y - h * s * 0.5, x + w * s / 2, y))
    return path


def cloud_path_page(x, y, s, w, h, n):
    return pr.cloud_path(w, h, n).xf(mat(x, y, s))


def hills_z(ink, pts, kind='dots', gap=14, bottom=FB + 30, ang=0, c='#BFE3A0'):
    x0 = FL - 30
    P = curve(pts)
    P = Path(P.s + [('L', (pts[-1][0], bottom)), ('L', (pts[0][0], bottom)), ('Z',)])
    sh(ink, P, c, kind, gap, ang, box=(0, min(p[1] for p in pts) - 30, 900, bottom))
    return P


def sun_z(ink, x, y, r=60, rays=16):
    pts = []
    for i in range(rays * 2):
        a = i * math.pi / rays
        rad = r * (1.6 if i % 2 == 0 else 1.2)
        pts.append((x + math.cos(a) * rad, y + math.sin(a) * rad))
    with ink.fig(0, 0) as g:
        g.part(rpoly(pts, r * 0.1), c='#FFE08A')
    pat.mandala(ink, x, y, r, 3, 10)


def moon_z(ink, x, y, r=60, rot=0):
    P = Path().M(x + r * 0.3, y - r).C(x - r * 0.75, y - r * 0.9, x - r * 0.75, y + r * 0.9, x + r * 0.3, y + r).C(x - r * 0.25, y + r * 0.5, x - r * 0.25, y - r * 0.5, x + r * 0.3, y - r).Z()
    sh(ink, P, '#FBF3D5', 'stars', r * 0.28, box=(x - r, y - r, x + r * 0.2, y + r))


def stars_z(ink, seed, n, box, avoid=(), size=(8, 15)):
    return p2.sprinkles(ink, seed, n, box, avoid, kinds=('star', 'sparkle', 'dot', 'sparkle'), size=size, minsep=60)


def tree_z(ink, x, y, s=1.0, c='#8FCB7C', pattern='leaves', gap=14, trunk=None):
    """a big round tree: patterned trunk and canopy"""
    tw = 40
    trunk = blob([(-tw / 2, 0, 'c'), (-tw * 0.4, -80), (-tw * 0.55, -170), (tw * 0.55, -170), (tw * 0.4, -80), (tw / 2, 0, 'c')], k=0.8).xf(mat(x, y, s))
    sh(ink, trunk, '#B07C4D', 'hatch', 7 * s, 80)
    pts = []
    for i in range(18):
        a = i * math.pi / 9 - math.pi / 2
        r = 96 if i % 2 == 0 else 84
        pts.append((math.cos(a) * r * 1.15, -240 + math.sin(a) * r))
    can = blob(pts, k=1.0).xf(mat(x, y, s))
    sh(ink, can, c, pattern, gap * s ** 0.5)
    return can


def pine_z(ink, x, y, s=1.0, snow=False):
    with ink.fig(x, y, s) as g:
        g.part(rrect(-10, -30, 20, 34, 3))
    for k, (w, by, ty) in enumerate(((84, -28, -90), (68, -76, -136), (50, -120, -176))):
        P = rpoly([(x - w * s / 2, y + by * s), (x + w * s / 2, y + by * s), (x, y + (ty - 8) * s)], 6 * s)
        sh(ink, P, '#4F9A66', 'hatch', 6 * s, 60 if k % 2 else 120)


def house_z(ink, x, y, s=1.0, w=200, h=150, roof_c='#E8806F', door=True, windows=2, chimney=True):
    """a small patterned house; (x, y) the middle of the ground line"""
    with ink.fig(x, y, s) as g:
        pass
    body = rrect(-w / 2, -h, w, h, 6).xf(mat(x, y, s))
    sh(ink, body, '#F6D9B8', 'bricks', 16 * s)
    roof = Path().M(-w * 0.62, -h + 6).L(0, -h - h * 0.62).L(w * 0.62, -h + 6).L(w * 0.5, -h + 20).L(-w * 0.5, -h + 20).Z().xf(mat(x, y, s))
    sh(ink, roof, roof_c, 'scales', 12 * s)
    if chimney:
        with ink.fig(x, y, s) as g:
            g.part(rrect(w * 0.18, -h - h * 0.58, 26, 48, 3))
    if door:
        with ink.fig(x, y, s) as g:
            g.part(blob([(-20, 0, 'c'), (-20, -56), (0, -74), (20, -56), (20, 0, 'c')], k=0.8))
            g.dot(10, -34, 2.6)
    for i in range(windows):
        wx = (-w * 0.32 if i == 0 else w * 0.32) if windows == 2 else 0
        with ink.fig(x, y, s) as g:
            g.part(rrect(wx - 20, -h * 0.72, 40, 44, 4))
            g.line(Path().M(wx, -h * 0.72).L(wx, -h * 0.72 + 44).M(wx - 20, -h * 0.72 + 22).L(wx + 20, -h * 0.72 + 22), w=ink.dw)


def flower_z(ink, x, y, s=1.0, petals=8, R=40, stem=140, pattern='dots', leaf=True):
    """a big flower with a patterned middle and ribbed petals (the head at x, y)"""
    with ink.fig(x, y, s) as g:
        if stem:
            g.line(curve([(0, 30), (8, stem * 0.5), (0, stem)]), w=ink.iw * 1.2)
            if leaf:
                for sgn in (-1, 1):
                    lf = g.view(0, stem * 0.55, 1, sgn < 0, -35 if sgn > 0 else -35)
                    lf.part(blob([(0, 0, 'c'), (20, -16), (50, 0, 'c'), (20, 16)], k=1.0))
                    lf.line(Path().M(2, 0).L(42, 0), w=ink.dw * 0.8)
        for i in range(petals):
            a = i * TAU / petals - math.pi / 2
            v = g.view(math.cos(a) * R * 0.72, math.sin(a) * R * 0.72, 1, False, math.degrees(a))
            v.part(blob([(-R * 0.3, 0, 'c'), (0, -R * 0.42), (R * 0.9, 0, 'c'), (0, R * 0.42)], k=1.0))
            v.line(Path().M(R * 0.1, 0).L(R * 0.68, 0), w=ink.dw * 0.8)
        g.part(circ(0, 0, R * 0.46))
    pr_c = circ(0, 0, R * 0.46 * s).xf(mat(x, y))
    pat.fill(ink, pr_c, pattern, 7 * s)
    with ink.fig(x, y, outline=False) as g:
        g.line(circ(0, 0, R * 0.46 * s), w=ink.iw)


def grass_row(ink, y, x0=FL - 10, x1=FRt + 10, h=26, gap=14, seed=0):
    """a row of grass blades (open shapes drawn as a ragged line)"""
    rnd = random.Random(seed)
    P = Path()
    x = x0
    while x < x1:
        hh = h * rnd.uniform(0.6, 1.2)
        lean = rnd.uniform(-6, 6)
        P.M(x, y).C(x + lean * 0.3, y - hh * 0.5, x + lean, y - hh * 0.8, x + lean + 2, y - hh)
        x += gap * rnd.uniform(0.6, 1.3)
    with ink.fig(0, 0, outline=False) as g:
        g.line(P, w=ink.dw * 1.0)


def swirl_wind(ink, x, y, w=160, s=1.0):
    """a wind swirl line with a curl at the end"""
    with ink.fig(x, y, s, outline=False) as g:
        g.line(Path().M(0, 0).C(w * 0.3, -14, w * 0.6, -14, w * 0.8, 0).C(w * 0.95, 12, w * 0.9, 30, w * 0.74, 26).C(w * 0.64, 22, w * 0.66, 10, w * 0.76, 10), w=ink.dw * 1.2)


def water_z(ink, y, pattern='waves', gap=18, c='#BFE0F7'):
    P = Path().M(FL - 20, y).L(FRt + 20, y).L(FRt + 20, FB + 20).L(FL - 20, FB + 20).Z()
    sh(ink, P, c, pattern, gap, box=(0, y, 900, FB + 20))


def lamp_post(ink, x, y, s=1.0, h=260):
    with ink.fig(x, y, s) as g:
        g.part(rrect(-14, -12, 28, 12, 3))
        g.part(rrect(-5, -h, 10, h - 8, 3))
        g.part(blob([(-20, -h + 4, 'c'), (20, -h + 4, 'c'), (26, -h - 34), (0, -h - 54, 'c'), (-26, -h - 34)], k=0.6))
        g.line(Path().M(0, -h + 4).L(0, -h - 52), w=ink.dw * 0.8)
        g.part(circ(0, -h - 62, 6))


def ribbon_banner(ink, x, y, w=260):
    pass


def clouds(ink, specs):
    """specs: (x, y, scale, pattern) ..."""
    for (x, y, s, k) in specs:
        cloud_z(ink, x, y, s, 240, 96, 4, k, 11)


def ground_z(ink, y, kind='dots', gap=16, c='#BFE3A0', amp=14, seed=0):
    """a gentle ground band to the bottom of the picture with a pattern in its lower part only"""
    pts = [(FL - 20, y + amp * 0.5), (FL + 180, y - amp), (FL + 420, y + amp), (FL + 640, y - amp * 0.6), (FRt + 20, y + amp * 0.4)]
    return hills_z(ink, pts, kind, gap, FB + 30, 0, c)


def mountains(ink, y, seed=1, kinds=('hatch', 'dots', 'lattice'), peaks=((180, 220), (400, 300), (620, 200))):
    for k, (px, ph) in enumerate(peaks):
        P = rpoly([(px - 240, y), (px, y - ph), (px + 240, y)], 16)
        sh(ink, P, '#E8E4EC', kinds[k % len(kinds)], 14, 60 if k % 2 else 120, box=(px - 240, y - ph * 0.55, px + 240, y))
        # snow cap line
        with ink.fig(0, 0, outline=False) as g:
            g.line(curve([(px - ph * 0.18, y - ph * 0.7), (px - ph * 0.06, y - ph * 0.62), (px, y - ph * 0.7), (px + ph * 0.08, y - ph * 0.6), (px + ph * 0.18, y - ph * 0.7)]), w=ink.dw)


def window_z(ink, x, y, w, h, panes=(2, 2), arch=False, curtains=True):
    """a window with a frame and cross bars; (x, y) its top left"""
    with ink.fig(0, 0) as g:
        if arch:
            fr = blob([(x, y + h, 'c'), (x, y + w * 0.5), (x + w * 0.1, y + w * 0.14), (x + w / 2, y), (x + w * 0.9, y + w * 0.14), (x + w, y + w * 0.5), (x + w, y + h, 'c')], k=0.9)
        else:
            fr = rrect(x, y, w, h, 10)
        g.part(fr)
    return fr


def bookshelf(ink, x0, y0, x1, y1, rows=3, seed=0):
    """a shelf of books: leaning spines with simple patterns"""
    rnd = random.Random(seed)
    rh = (y1 - y0) / rows
    with ink.fig(0, 0) as g:
        g.part(rrect(x0, y0, x1 - x0, y1 - y0, 6))
    pats = ['hatch', 'dots', 'stars', 'diamonds']
    for r in range(rows):
        yb = y0 + (r + 1) * rh - 8
        x = x0 + 12
        while x < x1 - 30:
            bw = rnd.uniform(16, 28)
            bh = rh * rnd.uniform(0.55, 0.8)
            B = rrect(x, yb - bh, bw, bh, 3)
            if rnd.random() < 0.55:
                sh(ink, B, '#fff', rnd.choice(pats), 7, rnd.choice((0, 90)))
            else:
                sh(ink, B, '#fff')
            x += bw + 3
        with ink.fig(0, 0, outline=False) as g:
            g.line(Path().M(x0 + 6, yb + 2).L(x1 - 6, yb + 2), w=ink.iw * 1.1)


def mug(ink, x, y, s=1.0, steam=True):
    with ink.fig(x, y, s) as g:
        g.part(Path().M(30, -44).C(62, -48, 62, -14, 30, -18).C(40, -22, 40, -38, 30, -36).Z())
        g.part(blob([(-36, -50, 'c'), (-32, -8), (0, 0), (32, -8), (36, -50, 'c')], k=0.9))
        g.part(ell(0, -50, 36, 8), under=True)
        g.line(curve([(-14, -26), (0, -20), (14, -26)]), w=ink.dw * 0.8)
        if steam:
            for xx in (-10, 10):
                g.line(curve([(xx, -64), (xx + 8, -78), (xx - 8, -92), (xx, -106)]), w=ink.dw * 0.9)


def potted(ink, x, y, s=1.0, kind=0):
    """a pot with a leafy plant"""
    with ink.fig(x, y, s) as g:
        for (a, ang, ln) in ((-30, -28, 80), (-10, -10, 100), (10, 8, 96), (30, 26, 76), (0, 0, 120)):
            lf = g.view(a * 0.3, -60, 1, False, -90 + ang)
            lf.part(blob([(0, 0, 'c'), (ln * 0.4, -16), (ln, 0, 'c'), (ln * 0.4, 16)], k=1.0))
            lf.line(Path().M(2, 0).L(ln * 0.85, 0), w=ink.dw * 0.8)
        g.part(blob([(-38, -66, 'c'), (38, -66, 'c'), (28, 0, 'c'), (-28, 0, 'c')], k=0.2))
        g.part(rrect(-44, -80, 88, 20, 6), under=True)
        for i in (-18, 0, 18):
            g.line(Path().M(i, -56).L(i * 0.8, -6), w=ink.dw * 0.7)


def rug(ink, cx, cy, rx, ry, kind='diamonds'):
    P = ell(cx, cy, rx, ry)
    sh(ink, P, '#fff', kind, 16)
    with ink.fig(0, 0, outline=False) as g:
        g.line(ell(cx, cy, rx * 0.82, ry * 0.8), w=ink.iw)


def cushion(ink, x, y, w, h, kind='stars', rot=0.0):
    with ink.fig(x, y, 1.0, False, rot) as g:
        P = blob([(-w / 2, -h / 2 + 6, 'c'), (0, -h / 2 + 18), (w / 2, -h / 2 + 6, 'c'), (w / 2 - 8, 0), (w / 2, h / 2 - 6, 'c'), (0, h / 2 - 18), (-w / 2, h / 2 - 6, 'c'), (-w / 2 + 8, 0)], k=1.0)
        g.part(P)
    P2 = blob([(-w / 2, -h / 2 + 6, 'c'), (0, -h / 2 + 18), (w / 2, -h / 2 + 6, 'c'), (w / 2 - 8, 0), (w / 2, h / 2 - 6, 'c'), (0, h / 2 - 18), (-w / 2, h / 2 - 6, 'c'), (-w / 2 + 8, 0)], k=1.0).xf(mat(x, y, 1.0, False, rot))
    pat.fill(ink, P2, kind, 12)
    with ink.fig(0, 0, outline=False) as g:
        g.line(P2, w=ink.iw)
