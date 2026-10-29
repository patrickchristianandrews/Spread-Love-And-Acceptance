#!/usr/bin/env python3
"""cute.py: the hand-inked line-art engine for the two coloring books (kids29).

Everything is drawn in code as smooth vector paths (cubic Beziers and splines), never from circles glued together:

  Ink      one page of line art (units: 100 to the inch, 850 x 1100). Knows three pen widths:
             ow  the bold outer outline of a figure (a "sticker" outline around the union of its parts)
             iw  the interior outline of each part
             dw  the detail pen (faces, creases, fur, patterns)
  Fig      a group of parts drawn in painter's order, placed with a move / scale / flip / rotate.
           All geometry is transformed to the page BEFORE it is stroked, so a pen width is the same on the page
           whatever the scale of the figure (no hairlines on small figures, no fat lines on big ones).
           part()   a closed shape: white fill, interior outline; joins the figure's bold outer outline
           line()   an open stroke in the detail pen, round caps and joins
           ink()    a tapered, brush-like stroke (thick in the middle, thin at the ends)
           dot()    a solid black blob (pupils, noses)
  every point gets a small deterministic wobble, a function of where it is on the page, so two strokes that share
  an edge (the underlay and the overlay of a part) always agree and the drawing looks inked by hand.

The paths are flattened to short straight steps with round joins: smooth to the eye, small in the PDF.
"""
import math
import re

KAPPA = 0.5522847498
TAU = math.pi * 2


def n1(x):
    s = '%.1f' % x
    if s.endswith('.0'):
        s = s[:-2]
    return '0' if s == '-0' else s


# ------------------------------------------------------------------ matrices
def mmul(a, b):
    """a after b (apply b first)"""
    return (a[0] * b[0] + a[2] * b[1], a[1] * b[0] + a[3] * b[1],
            a[0] * b[2] + a[2] * b[3], a[1] * b[2] + a[3] * b[3],
            a[0] * b[4] + a[2] * b[5] + a[4], a[1] * b[4] + a[3] * b[5] + a[5])


def mat(x=0, y=0, s=1.0, flip=False, rot=0.0, sy=None):
    sx = -s if flip else s
    sy = s if sy is None else sy
    c, sn = math.cos(math.radians(rot)), math.sin(math.radians(rot))
    # translate * rotate * scale
    return (c * sx, sn * sx, -sn * sy, c * sy, x, y)


IDENT = (1, 0, 0, 1, 0, 0)


def apply(m, p):
    return (m[0] * p[0] + m[2] * p[1] + m[4], m[1] * p[0] + m[3] * p[1] + m[5])


# ------------------------------------------------------------------ paths
class Path:
    """segments: ('M', p) ('L', p) ('C', p1, p2, p3) ('Z',)"""

    def __init__(self, segs=None):
        self.s = segs if segs is not None else []

    def M(self, x, y):
        self.s.append(('M', (x, y)))
        return self

    def L(self, x, y):
        self.s.append(('L', (x, y)))
        return self

    def C(self, x1, y1, x2, y2, x, y):
        self.s.append(('C', (x1, y1), (x2, y2), (x, y)))
        return self

    def Q(self, x1, y1, x, y):
        p0 = self.cur()
        self.s.append(('C', (p0[0] + 2 / 3 * (x1 - p0[0]), p0[1] + 2 / 3 * (y1 - p0[1])),
                       (x + 2 / 3 * (x1 - x), y + 2 / 3 * (y1 - y)), (x, y)))
        return self

    def Z(self):
        self.s.append(('Z',))
        return self

    def cur(self):
        for seg in reversed(self.s):
            if seg[0] != 'Z':
                return seg[-1]
        return (0, 0)

    def xf(self, m):
        out = []
        for seg in self.s:
            out.append((seg[0],) + tuple(apply(m, p) for p in seg[1:]))
        return Path(out)

    def __add__(self, o):
        return Path(self.s + o.s)

    @staticmethod
    def parse(d):
        """an SVG path string (M L H V C S Q T Z, absolute or relative; no arcs)"""
        toks = re.findall(r'[MmLlHhVvCcSsQqTtZzAa]|-?\d*\.?\d+(?:e-?\d+)?', d)
        P = Path()
        i = 0
        cx = cy = sx = sy = 0.0
        lastc = None
        cmd = None
        pcmd = None

        def num():
            nonlocal i
            v = float(toks[i])
            i += 1
            return v
        while i < len(toks):
            if re.match(r'[A-Za-z]', toks[i]):
                cmd = toks[i]
                i += 1
                if cmd in 'Zz':
                    P.Z()
                    cx, cy = sx, sy
                    pcmd = 'Z'
                    continue
            rel = cmd.islower()
            c = cmd.upper()
            if c == 'M':
                x, y = num(), num()
                if rel:
                    x += cx
                    y += cy
                P.M(x, y)
                cx, cy = x, y
                sx, sy = x, y
                cmd = 'l' if rel else 'L'
                pcmd = 'M'
            elif c == 'L':
                x, y = num(), num()
                if rel:
                    x += cx
                    y += cy
                P.L(x, y)
                cx, cy = x, y
                pcmd = 'L'
            elif c == 'H':
                x = num()
                x = x + cx if rel else x
                P.L(x, cy)
                cx = x
                pcmd = 'L'
            elif c == 'V':
                y = num()
                y = y + cy if rel else y
                P.L(cx, y)
                cy = y
                pcmd = 'L'
            elif c == 'C':
                v = [num() for _ in range(6)]
                if rel:
                    v = [v[0] + cx, v[1] + cy, v[2] + cx, v[3] + cy, v[4] + cx, v[5] + cy]
                P.C(*v)
                lastc = (v[2], v[3])
                cx, cy = v[4], v[5]
                pcmd = 'C'
            elif c == 'S':
                v = [num() for _ in range(4)]
                if rel:
                    v = [v[0] + cx, v[1] + cy, v[2] + cx, v[3] + cy]
                if pcmd == 'C' and lastc:
                    x1, y1 = 2 * cx - lastc[0], 2 * cy - lastc[1]
                else:
                    x1, y1 = cx, cy
                P.C(x1, y1, v[0], v[1], v[2], v[3])
                lastc = (v[0], v[1])
                cx, cy = v[2], v[3]
                pcmd = 'C'
            elif c == 'Q':
                v = [num() for _ in range(4)]
                if rel:
                    v = [v[0] + cx, v[1] + cy, v[2] + cx, v[3] + cy]
                P.Q(*v)
                cx, cy = v[2], v[3]
                pcmd = 'Q'
            else:
                raise ValueError('unsupported path command ' + cmd)
        return P

    def flatten(self, step=5.0):
        """list of (points, closed)"""
        subs = []
        cur = None
        start = None
        closed = False
        for seg in self.s:
            k = seg[0]
            if k == 'M':
                if cur:
                    subs.append((cur, closed))
                cur = [seg[1]]
                start = seg[1]
                closed = False
            elif k == 'L':
                p0 = cur[-1]
                p1 = seg[1]
                d = math.hypot(p1[0] - p0[0], p1[1] - p0[1])
                n = max(1, int(math.ceil(d / step)))
                for j in range(1, n + 1):
                    t = j / n
                    cur.append((p0[0] + (p1[0] - p0[0]) * t, p0[1] + (p1[1] - p0[1]) * t))
            elif k == 'C':
                p0 = cur[-1]
                p1, p2, p3 = seg[1], seg[2], seg[3]
                d = (math.hypot(p1[0] - p0[0], p1[1] - p0[1]) + math.hypot(p2[0] - p1[0], p2[1] - p1[1]) + math.hypot(p3[0] - p2[0], p3[1] - p2[1]))
                n = max(3, int(math.ceil(d / step)))
                for j in range(1, n + 1):
                    t = j / n
                    u = 1 - t
                    cur.append((u * u * u * p0[0] + 3 * u * u * t * p1[0] + 3 * u * t * t * p2[0] + t * t * t * p3[0],
                                u * u * u * p0[1] + 3 * u * u * t * p1[1] + 3 * u * t * t * p2[1] + t * t * t * p3[1]))
            elif k == 'Z':
                closed = True
                if cur and len(cur) > 1 and math.hypot(cur[0][0] - cur[-1][0], cur[0][1] - cur[-1][1]) < 0.01:
                    cur.pop()
        if cur:
            subs.append((cur, closed))
        return subs


# ------------------------------------------------------------------ shape makers (all return Path, local units)
def ell(cx, cy, rx, ry, rot=0.0):
    k = KAPPA
    P = Path()
    P.M(cx + rx, cy)
    P.C(cx + rx, cy + ry * k, cx + rx * k, cy + ry, cx, cy + ry)
    P.C(cx - rx * k, cy + ry, cx - rx, cy + ry * k, cx - rx, cy)
    P.C(cx - rx, cy - ry * k, cx - rx * k, cy - ry, cx, cy - ry)
    P.C(cx + rx * k, cy - ry, cx + rx, cy - ry * k, cx + rx, cy)
    P.Z()
    if rot:
        P = P.xf(mat(0, 0, 1, False, rot)) if (cx == 0 and cy == 0) else P.xf(mmul(mat(cx, cy, 1, False, rot), mat(-cx, -cy)))
    return P


def circ(cx, cy, r):
    return ell(cx, cy, r, r)


def blob(pts, closed=True, k=1.0):
    """a smooth Catmull-Rom curve through the points. A point may be (x, y) or (x, y, 'c') for a sharp corner"""
    n = len(pts)
    P = Path()
    xy = [(p[0], p[1]) for p in pts]
    corner = [len(p) > 2 and p[2] == 'c' for p in pts]
    if closed:
        P.M(*xy[0])
        for i in range(n):
            p0, p1, p2, p3 = xy[(i - 1) % n], xy[i], xy[(i + 1) % n], xy[(i + 2) % n]
            c1 = p1 if corner[i] else (p1[0] + (p2[0] - p0[0]) * k / 6, p1[1] + (p2[1] - p0[1]) * k / 6)
            c2 = p2 if corner[(i + 1) % n] else (p2[0] - (p3[0] - p1[0]) * k / 6, p2[1] - (p3[1] - p1[1]) * k / 6)
            P.C(c1[0], c1[1], c2[0], c2[1], p2[0], p2[1])
        P.Z()
    else:
        P.M(*xy[0])
        for i in range(n - 1):
            p0 = xy[i - 1] if i > 0 else xy[0]
            p1, p2 = xy[i], xy[i + 1]
            p3 = xy[i + 2] if i + 2 < n else xy[-1]
            c1 = p1 if corner[i] else (p1[0] + (p2[0] - p0[0]) * k / 6, p1[1] + (p2[1] - p0[1]) * k / 6)
            c2 = p2 if corner[i + 1] else (p2[0] - (p3[0] - p1[0]) * k / 6, p2[1] - (p3[1] - p1[1]) * k / 6)
            P.C(c1[0], c1[1], c2[0], c2[1], p2[0], p2[1])
    return P


def curve(pts, k=1.0):
    return blob(pts, closed=False, k=k)


def rrect(x, y, w, h, r):
    r = min(r, w / 2, h / 2)
    k = r * (1 - KAPPA)
    P = Path()
    P.M(x + r, y)
    P.L(x + w - r, y)
    P.C(x + w - k, y, x + w, y + k, x + w, y + r)
    P.L(x + w, y + h - r)
    P.C(x + w, y + h - k, x + w - k, y + h, x + w - r, y + h)
    P.L(x + r, y + h)
    P.C(x + k, y + h, x, y + h - k, x, y + h - r)
    P.L(x, y + r)
    P.C(x, y + k, x + k, y, x + r, y)
    P.Z()
    return P


def rpoly(pts, r=6.0):
    """a polygon with rounded corners"""
    n = len(pts)
    P = Path()
    for i in range(n):
        p0, p1, p2 = pts[(i - 1) % n], pts[i], pts[(i + 1) % n]
        d1 = math.hypot(p1[0] - p0[0], p1[1] - p0[1])
        d2 = math.hypot(p2[0] - p1[0], p2[1] - p1[1])
        rr = min(r, d1 / 2.2, d2 / 2.2)
        a = (p1[0] + (p0[0] - p1[0]) * rr / d1, p1[1] + (p0[1] - p1[1]) * rr / d1)
        b = (p1[0] + (p2[0] - p1[0]) * rr / d2, p1[1] + (p2[1] - p1[1]) * rr / d2)
        if i == 0:
            P.M(*a)
        else:
            P.L(*a)
        P.C(a[0] + (p1[0] - a[0]) * 0.55, a[1] + (p1[1] - a[1]) * 0.55, b[0] + (p1[0] - b[0]) * 0.55, b[1] + (p1[1] - b[1]) * 0.55, b[0], b[1])
    P.Z()
    return P


def line_pts(pts):
    P = Path()
    P.M(*pts[0])
    for p in pts[1:]:
        P.L(*p)
    return P


def heart_path(cx, cy, s):
    """a plump heart, s = half width"""
    P = Path()
    P.M(cx, cy + s * 0.95)
    P.C(cx - s * 0.35, cy + s * 0.62, cx - s * 1.05, cy + s * 0.12, cx - s * 1.0, cy - s * 0.38)
    P.C(cx - s * 0.97, cy - s * 0.95, cx - s * 0.2, cy - s * 1.1, cx, cy - s * 0.5)
    P.C(cx + s * 0.2, cy - s * 1.1, cx + s * 0.97, cy - s * 0.95, cx + s * 1.0, cy - s * 0.38)
    P.C(cx + s * 1.05, cy + s * 0.12, cx + s * 0.35, cy + s * 0.62, cx, cy + s * 0.95)
    P.Z()
    return P


def star_path(cx, cy, R, r=None, n=5, rot=-90, round_=0.0):
    r = r if r is not None else R * 0.5
    pts = []
    for i in range(n * 2):
        a = math.radians(rot + i * 180 / n)
        rad = R if i % 2 == 0 else r
        pts.append((cx + math.cos(a) * rad, cy + math.sin(a) * rad))
    return rpoly(pts, round_ if round_ else R * 0.14)


def spiral_pts(cx, cy, r0, r1, turns, a0=0.0, n=60):
    pts = []
    for i in range(n + 1):
        t = i / n
        a = a0 + t * turns * TAU
        r = r0 + (r1 - r0) * t
        pts.append((cx + math.cos(a) * r, cy + math.sin(a) * r))
    return pts


def scallop(x0, x1, y, r, up=True, n=None):
    """a row of bumps from x0 to x1 (returns an open Path)"""
    w = x1 - x0
    n = n or max(1, int(round(w / (2 * r))))
    d = w / n
    P = Path()
    P.M(x0, y)
    for i in range(n):
        xa = x0 + i * d
        h = (d * 0.62) * (-1 if up else 1)
        P.C(xa + d * 0.04, y + h, xa + d * 0.96, y + h, xa + d, y)
    return P


def wavy(x0, y0, x1, y1, amp, n):
    """a gentle wave between two points (open Path)"""
    pts = []
    L = math.hypot(x1 - x0, y1 - y0)
    nx, ny = -(y1 - y0) / L, (x1 - x0) / L
    for i in range(n * 2 + 1):
        t = i / (n * 2)
        a = amp * (1 if i % 4 == 1 else -1 if i % 4 == 3 else 0)
        pts.append((x0 + (x1 - x0) * t + nx * a, y0 + (y1 - y0) * t + ny * a))
    return curve(pts)


# ------------------------------------------------------------------ the page
_UID = 0


def hnoise(i, seed=0):
    x = math.sin(i * 127.1 + seed * 311.7) * 43758.5453
    return x - math.floor(x)


class Ink:
    def __init__(self, ow=6.0, iw=3.6, dw=3.0, wob=0.55, wob_lo=0.8, step=5.0, seed=1, color=False, inkc='#111'):
        self.color = color
        self.inkc = inkc
        self.ow, self.iw, self.dw = ow, iw, dw
        self.wob, self.wob_lo = wob, wob_lo
        self.step = step
        self.out = []
        self.defs = []
        self.uid = 0
        self.ph = [hnoise(i, seed) * 6.283 for i in range(8)]
        self.clip_stack = []

    # wobble: a slow drift plus a quick hand tremble, a function of the page position only
    def warp(self, x, y):
        p = self.ph
        a, b = self.wob_lo, self.wob
        dx = a * (math.sin(x * 0.011 + y * 0.007 + p[0]) + 0.5 * math.sin(y * 0.027 - x * 0.013 + p[1])) + b * math.sin(x * 0.21 + y * 0.13 + p[2]) * 0.9
        dy = a * (math.sin(y * 0.010 - x * 0.006 + p[3]) + 0.5 * math.sin(x * 0.025 + y * 0.015 + p[4])) + b * math.sin(y * 0.19 - x * 0.11 + p[5]) * 0.9
        return x + dx, y + dy

    def d(self, path, m=IDENT, warp=True, step=None):
        """SVG path data for a local Path placed by matrix m"""
        subs = path.xf(m).flatten(step or self.step)
        out = []
        for pts, closed in subs:
            if warp and (self.wob or self.wob_lo):
                pts = [self.warp(*p) for p in pts]
            out.append('M' + 'L'.join('%s %s' % (n1(p[0]), n1(p[1])) for p in pts) + ('Z' if closed else ''))
        return ''.join(out)

    def raw(self, s):
        self.out.append(s)

    def clip_begin(self, path, m=IDENT):
        """everything drawn until clip_end() is cut to this shape (a page frame, say)"""
        if isinstance(path, str):
            path = Path.parse(path)
        cid = self.newid('pc')
        self.defs.append('<clipPath id="%s"><path d="%s"/></clipPath>' % (cid, self.d(path, m, warp=False, step=4)))
        self.out.append('<g clip-path="url(#%s)">' % cid)

    def clip_end(self):
        self.out.append('</g>')

    def newid(self, p='c'):
        # ids are unique across the whole program: all pages share one HTML document
        global _UID
        _UID += 1
        return '%s%d' % (p, _UID)

    def fig(self, x=0, y=0, s=1.0, flip=False, rot=0.0, outline=True, ow=None, sy=None):
        return Fig(self, mat(x, y, s, flip, rot, sy), outline, ow)

    def svg(self):
        return ('<defs>%s</defs>' % ''.join(self.defs) if self.defs else '') + ''.join(self.out)


class Fig:
    def __init__(self, ink, m, outline=True, ow=None):
        self.ink = ink
        self.m = m
        self.items = []
        self.outline = outline
        self.ow = ow if ow is not None else ink.ow
        self.scale = math.sqrt(abs(m[0] * m[3] - m[1] * m[2]))

    def __enter__(self):
        return self

    def __exit__(self, *a):
        self.done()

    # --- drawing (local coordinates)
    def part(self, path, fill='#fff', under=True, w=None, c=None):
        """fill is the color in color mode (c is an alias); in line mode every part is white"""
        if isinstance(path, str):
            path = Path.parse(path)
        self.items.append(('part', path, c or (fill if fill != '#fff' else '#fff'), under, w))
        return self

    def line(self, path, w=None, cap='round', dash=None, fill='none'):
        if isinstance(path, str):
            path = Path.parse(path)
        self.items.append(('line', path, w, cap, dash, fill))
        return self

    def dot(self, x, y, r, ry=None):
        self.items.append(('black', ell(x, y, r, ry if ry is not None else r)))
        return self

    def blk(self, path):
        if isinstance(path, str):
            path = Path.parse(path)
        self.items.append(('black', path))
        return self

    def wh(self, path):
        """a plain white shape, no outline (eye glints, tooth, cut-outs)"""
        if isinstance(path, str):
            path = Path.parse(path)
        self.items.append(('white', path))
        return self

    def ink_(self, pts, w0=0.4, w1=1.0, w2=0.2, w=None):
        """a tapered stroke through points (local); widths are fractions of the detail pen"""
        self.items.append(('brush', pts, w0, w1, w2, w))
        return self

    def sub(self, fn):
        """run fn(self) and return self (readability)"""
        fn(self)
        return self

    def clip(self, path):
        """start drawing inside a clip region (end with unclip())"""
        if isinstance(path, str):
            path = Path.parse(path)
        self.items.append(('clip', path))
        return self

    def unclip(self):
        self.items.append(('unclip',))
        return self

    def view(self, x=0, y=0, s=1.0, flip=False, rot=0.0, sy=None):
        """a sub-drawing placed inside this figure: same pens, geometry moved before it is stroked"""
        return View(self, mat(x, y, s, flip, rot, sy))

    # --- output
    def done(self):
        ink = self.ink
        m = self.m
        sc = self.scale
        ow, iw = self.ow, ink.iw
        U = max(iw, 2 * ow - iw)
        out = ink.out
        IC = ink.inkc
        col = ink.color
        parts = [it for it in self.items if it[0] == 'part' and it[3]]
        if self.outline and parts:
            # the bold outer outline: every part (that is under) in black, stroked wide; the parts then go on top
            ds = ''.join(ink.d(it[1], m) for it in parts)
            out.append('<path d="%s" fill="%s" stroke="%s" stroke-width="%s" stroke-linejoin="round" stroke-linecap="round"/>' % (ds, IC, IC, n1(U)))
        clips = 0
        xs, ys = [], []
        for it in self.items:
            if it[0] in ('part', 'line', 'black'):
                for pts, _c in it[1].xf(m).flatten(9.0):
                    for p in pts:
                        xs.append(p[0])
                        ys.append(p[1])
        pad = ow / 2
        self.bb = (min(xs) - pad, min(ys) - pad, max(xs) + pad, max(ys) + pad) if xs else (0, 0, 0, 0)
        for it in self.items:
            k = it[0]
            if k == 'part':
                w = it[4] if it[4] else iw
                fill = it[2] if col else '#fff'
                out.append('<path d="%s" fill="%s" stroke="%s" stroke-width="%s" stroke-linejoin="round" stroke-linecap="round"/>' % (ink.d(it[1], m), fill, IC, n1(w)))
            elif k == 'line':
                w = it[2] if it[2] else ink.dw
                da = ' stroke-dasharray="%s"' % it[4] if it[4] else ''
                out.append('<path d="%s" fill="%s" stroke="%s" stroke-width="%s" stroke-linecap="%s" stroke-linejoin="round"%s/>' % (ink.d(it[1], m), it[5], IC, n1(w), it[3], da))
            elif k == 'black':
                out.append('<path d="%s" fill="%s" stroke="%s" stroke-width="0.6" stroke-linejoin="round"/>' % (ink.d(it[1], m), IC, IC))
            elif k == 'white':
                out.append('<path d="%s" fill="#fff"/>' % ink.d(it[1], m))
            elif k == 'brush':
                out.append(self._brush(it))
            elif k == 'clip':
                cid = ink.newid('cp')
                ink.defs.append('<clipPath id="%s"><path d="%s"/></clipPath>' % (cid, ink.d(it[1], m)))
                out.append('<g clip-path="url(#%s)">' % cid)
                clips += 1
            elif k == 'unclip':
                out.append('</g>')
                clips -= 1
        out.extend('</g>' for _ in range(clips))
        self.items = []

    def _brush(self, it):
        ink = self.ink
        _, pts, w0, w1, w2, wabs = it
        base = wabs if wabs else ink.dw
        path = curve(pts)
        poly = path.xf(self.m).flatten(3.0)[0][0]
        poly = [ink.warp(*p) for p in poly] if (ink.wob or ink.wob_lo) else poly
        n = len(poly)
        if n < 2:
            return ''
        left, right = [], []
        for i, p in enumerate(poly):
            a = poly[max(0, i - 1)]
            b = poly[min(n - 1, i + 1)]
            dx, dy = b[0] - a[0], b[1] - a[1]
            L = math.hypot(dx, dy) or 1
            nx, ny = -dy / L, dx / L
            t = i / (n - 1)
            if t < 0.5:
                wf = w0 + (w1 - w0) * math.sin(t * math.pi)
            else:
                wf = w2 + (w1 - w2) * math.sin(t * math.pi)
            hw = max(0.25, base * wf / 2)
            left.append((p[0] + nx * hw, p[1] + ny * hw))
            right.append((p[0] - nx * hw, p[1] - ny * hw))
        ring = left + right[::-1]
        return '<path d="M%sZ" fill="%s" stroke="%s" stroke-width="0.5" stroke-linejoin="round"/>' % ('L'.join('%s %s' % (n1(p[0]), n1(p[1])) for p in ring), ink.inkc, ink.inkc)


class View:
    """draws into a Fig through an extra local matrix"""

    def __init__(self, parent, m):
        self.parent = parent
        self.m = m
        self.ink = parent.ink

    def _p(self, path):
        if isinstance(path, str):
            path = Path.parse(path)
        return path.xf(self.m)

    def part(self, path, fill='#fff', under=True, w=None, c=None):
        self.parent.part(self._p(path), fill, under, w, c)
        return self

    def line(self, path, w=None, cap='round', dash=None, fill='none'):
        self.parent.line(self._p(path), w, cap, dash, fill)
        return self

    def dot(self, x, y, r, ry=None):
        self.parent.blk(self._p(ell(x, y, r, ry if ry is not None else r)))
        return self

    def blk(self, path):
        self.parent.blk(self._p(path))
        return self

    def wh(self, path):
        self.parent.wh(self._p(path))
        return self

    def ink_(self, pts, w0=0.4, w1=1.0, w2=0.2, w=None):
        self.parent.ink_([apply(self.m, p) for p in pts], w0, w1, w2, w)
        return self

    def clip(self, path):
        self.parent.clip(self._p(path))
        return self

    def unclip(self):
        self.parent.unclip()
        return self

    def view(self, x=0, y=0, s=1.0, flip=False, rot=0.0, sy=None):
        return View(self.parent, mmul(self.m, mat(x, y, s, flip, rot, sy)))


def capsule(x0, y0, x1, y1, r0, r1=None):
    """a sausage between two points, with round ends (radii r0 at the start, r1 at the end)"""
    r1 = r0 if r1 is None else r1
    dx, dy = x1 - x0, y1 - y0
    L = math.hypot(dx, dy) or 1
    ux, uy = dx / L, dy / L
    nx, ny = -uy, ux
    k = KAPPA
    P = Path()
    a = (x0 + nx * r0, y0 + ny * r0)
    b = (x1 + nx * r1, y1 + ny * r1)
    c = (x1 - nx * r1, y1 - ny * r1)
    d = (x0 - nx * r0, y0 - ny * r0)
    P.M(*a)
    P.L(*b)
    # end cap at p1: from b around the front to c
    P.C(b[0] + ux * r1 * k, b[1] + uy * r1 * k, x1 + ux * r1 + nx * r1 * k, y1 + uy * r1 + ny * r1 * k, x1 + ux * r1, y1 + uy * r1)
    P.C(x1 + ux * r1 - nx * r1 * k, y1 + uy * r1 - ny * r1 * k, c[0] + ux * r1 * k, c[1] + uy * r1 * k, c[0], c[1])
    P.L(*d)
    P.C(d[0] - ux * r0 * k, d[1] - uy * r0 * k, x0 - ux * r0 - nx * r0 * k, y0 - uy * r0 - ny * r0 * k, x0 - ux * r0, y0 - uy * r0)
    P.C(x0 - ux * r0 + nx * r0 * k, y0 - uy * r0 + ny * r0 * k, a[0] - ux * r0 * k, a[1] - uy * r0 * k, a[0], a[1])
    P.Z()
    return P


def fit(ink, fn, box, anchor='bottom', maxs=None, minpad=0):
    """draw fn(ink, x, y, s) so that its drawing fills box = (x0, y0, x1, y1) as much as it can (aspect kept).
    anchor: 'bottom' (sits on the bottom edge), 'center', 'top'. Returns (figure, scale)"""
    probe = Ink(ow=ink.ow, iw=ink.iw, dw=ink.dw, wob=0, wob_lo=0, step=ink.step, color=ink.color)
    g0 = fn(probe, 0, 0, 1.0)
    bx0, by0, bx1, by1 = g0.bb
    w, h = bx1 - bx0, by1 - by0
    x0, y0, x1, y1 = box
    s = min((x1 - x0) / w, (y1 - y0) / h)
    if maxs:
        s = min(s, maxs)
    # scale changes pen-independent geometry only, so the bbox pad (outline) is nearly constant; ignore it
    cx = (x0 + x1) / 2
    if anchor == 'bottom':
        ty = y1 - by1 * s
    elif anchor == 'top':
        ty = y0 - by0 * s
    else:
        ty = (y0 + y1) / 2 - (by0 + by1) / 2 * s
    tx = cx - (bx0 + bx1) / 2 * s
    return fn(ink, tx, ty, s), s
