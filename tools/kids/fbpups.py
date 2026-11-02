#!/usr/bin/env python3
"""fbpups.py: Tidbit and Sugarfoot exactly as they are drawn in Frequency Buddies, for the coloring books (owner, Oct 31 2026).

This is assets/js/pups.js (drawPup, the drawing every Frequency Buddies episode, the pal cam and the launch screen use),
copied shape for shape, color for color: the same ellipses, ears, muzzles, legs, tails and collar. Instead of painting a
canvas it records every shape, and emit() hands them to a cute.Fig:
  - shapes of one color painted one after another become one region with one outline (so the art has no stray lines inside);
  - the eye, nose, mouth and nails are solid ink, the eye glint white;
  - soft overlays (blush, shading) appear only on the color covers, never in the line art.
If pups.js changes, copy the change here. Units are the cartoon's own: paws at (0, 0), facing right, about 50 tall.

Tidbit is the 'collar' look: lean, black mask, round tan brow dot, folded ear, tan lower legs, collar. Sugarfoot is the
'drop' look: stocky, long drop ears, tan face, white chest streak, big white toes with nails, plume tail, no collar.
"""
import math

from cute import Path

LOOKS = {
    'drop': dict(build='stocky', ear='drop', legUp='#A45C2E', legLow='#B97847', paw='#F1EADF', nails=True, tan='#C9965F', chest='white', muzzle='cream', collar=False, brow='patch', tail='plume'),
    'collar': dict(build='lean', ear='fold', legUp='#262220', legLow='#C98A4F', paw='#D99E62', nails=False, tan=None, chest='tan', muzzle='rottie', collar=True, brow='dot', tail='short'),
}
WHO = {'tidbit': 'collar', 'sugarfoot': 'drop'}
INKY = {'#3a2418', '#121010', '#3a1e22', '#2a2422'}   # the eye, the nose, the mouth, the nails: solid ink in the line art


def _alpha(c):
    if c.startswith('rgba'):
        return float(c[c.rindex(',') + 1:-1])
    return 1.0


class Rec:
    """just enough of a canvas 2D context to record pups.js"""

    def __init__(self):
        self.m = (1, 0, 0, 1, 0, 0)
        self.stack = []
        self.ops = []
        self.subs = []
        self.fillStyle = '#000'
        self.strokeStyle = '#000'
        self.lineWidth = 1.0
        self.lineCap = 'butt'
        self.marks = {}

    # transforms
    def save(self):
        self.stack.append((self.m, self.fillStyle, self.strokeStyle, self.lineWidth, self.lineCap))

    def restore(self):
        self.m, self.fillStyle, self.strokeStyle, self.lineWidth, self.lineCap = self.stack.pop()

    def translate(self, x, y):
        a, b, c, d, e, f = self.m
        self.m = (a, b, c, d, a * x + c * y + e, b * x + d * y + f)

    def rotate(self, t):
        a, b, c, d, e, f = self.m
        cs, sn = math.cos(t), math.sin(t)
        self.m = (a * cs + c * sn, b * cs + d * sn, -a * sn + c * cs, -b * sn + d * cs, e, f)

    def P(self, x, y):
        a, b, c, d, e, f = self.m
        return (a * x + c * y + e, b * x + d * y + f)

    def scale_now(self):
        a, b, c, d = self.m[:4]
        return math.sqrt(abs(a * d - b * c))

    # paths
    def beginPath(self):
        self.subs = []

    def moveTo(self, x, y):
        self.subs.append([self.P(x, y)])

    def lineTo(self, x, y):
        self.subs[-1].append(self.P(x, y))
        self._cur_local = (x, y)

    def quadraticCurveTo(self, cx, cy, x, y):
        # sample in local space: keep the local current point alongside
        p0 = self._cur_local
        for i in range(1, 13):
            t = i / 12
            u = 1 - t
            self.subs[-1].append(self.P(u * u * p0[0] + 2 * u * t * cx + t * t * x, u * u * p0[1] + 2 * u * t * cy + t * t * y))
        self._cur_local = (x, y)

    def ellipse(self, x, y, rx, ry, rot, a0, a1):
        n = max(8, int(abs(a1 - a0) / (math.pi * 2) * 48))
        cs, sn = math.cos(rot), math.sin(rot)
        pts = []
        for i in range(n + (0 if abs(a1 - a0) >= math.pi * 2 - 1e-6 else 1)):
            t = a0 + (a1 - a0) * i / n
            ex, ey = rx * math.cos(t), ry * math.sin(t)
            pts.append(self.P(x + ex * cs - ey * sn, y + ex * sn + ey * cs))
        self.subs.append(pts)

    def arc(self, x, y, r, a0, a1):
        self.ellipse(x, y, r, r, 0, a0, a1)

    def roundRect(self, x, y, w, h, r):
        r = min(r, w / 2, h / 2)
        pts = []
        for (cx, cy, s0) in ((x + w - r, y + r, -90), (x + w - r, y + h - r, 0), (x + r, y + h - r, 90), (x + r, y + r, 180)):
            for i in range(7):
                t = math.radians(s0 + 90 * i / 6)
                pts.append(self.P(cx + r * math.cos(t), cy + r * math.sin(t)))
        self.subs.append(pts)

    def rect(self, x, y, w, h):
        self.subs.append([self.P(x, y), self.P(x + w, y), self.P(x + w, y + h), self.P(x, y + h)])

    def closePath(self):
        pass

    def fill(self):
        self.ops.append(('fill', self.fillStyle, [list(s) for s in self.subs if len(s) > 2]))

    def fillRect(self, x, y, w, h):
        self.ops.append(('fill', self.fillStyle, [[self.P(x, y), self.P(x + w, y), self.P(x + w, y + h), self.P(x, y + h)]]))

    def stroke(self):
        self.ops.append(('stroke', self.strokeStyle, self.lineWidth * self.scale_now(), self.lineCap, [list(s) for s in self.subs]))

    def mark(self, name):
        self.marks[name] = self.m
        self.marks[name + '_at'] = len(self.ops)


def _q(c, x, y):
    """moveTo that also keeps the local current point (quadraticCurveTo needs it)"""
    c._cur_local = (x, y)
    c.moveTo(x, y)


def draw(L, pose, ph=0.0, wag=0.0, t=0.0, tilt=0.0, scarf=False, coat=False, rot=0.0, pivot=(0.0, 0.0), neck=False):
    """pups.js drawPup, line for line (blink off, reduced motion: no panting, no ear flap). Returns the recorder.
    rot turns the whole pup about pivot, the way the episodes rear up for a hug (buddies-player.js: pivot 'hind')"""
    c = Rec()
    if rot:
        c.translate(*pivot); c.rotate(rot); c.translate(-pivot[0], -pivot[1])
    BLACK, TAN, WHITE, PINK = '#252120', L['tan'] or '#C4834A', '#F4EFE6', '#EE8FA6'
    lean = L['build'] == 'lean'
    LL, BRX, BRY, BY = (15, 18.5, 8.8, -21) if lean else (12.5, 18, 10.2, -18.5)

    def leg(x0, y0, ang, ln, back=False):
        """pups.js leg(): one soft, tapered leg (thick at the top, slimmer at the ankle), a curved sock line and a round paw;
        the far legs a shade darker (owner, Nov 1 2026: smooth everywhere)"""
        c.save(); c.translate(x0, y0); c.rotate(ang)
        up, dk = ln * 0.5, 0.22 if back else 0.0

        def sh(col):
            if not dk or not col.startswith('#'):
                return col
            n = int(col[1:], 16); k = 1 - dk
            return '#%02x%02x%02x' % (round((n >> 16) * k), round((n >> 8 & 255) * k), round((n & 255) * k))
        c.fillStyle = sh(L['legLow']); c.beginPath(); _q(c, -3.1, -1); c.quadraticCurveTo(-3.4, ln * 0.5, -2.3, ln - 0.6); c.lineTo(2.3, ln - 0.6)
        c.quadraticCurveTo(3.4, ln * 0.5, 3.1, -1); c.quadraticCurveTo(0, -3.4, -3.1, -1); c.fill()
        c.fillStyle = sh(L['legUp']); c.beginPath(); _q(c, -3.1, -1); c.quadraticCurveTo(-3.3, up * 0.6, -2.9, up + 0.4); c.quadraticCurveTo(0, up + 1.8, 2.9, up + 0.4)
        c.quadraticCurveTo(3.3, up * 0.6, 3.1, -1); c.quadraticCurveTo(0, -3.4, -3.1, -1); c.fill()
        c.fillStyle = sh(L['paw']); c.beginPath(); c.ellipse(1, ln, 4.1, 2.6, 0, 0, math.pi * 2); c.fill()
        if L['nails']:
            c.strokeStyle = 'rgba(0,0,0,0.16)'; c.lineWidth = 0.6; c.beginPath()
            _q(c, 1.2, ln - 1.6); c.lineTo(1.2, ln + 1.2); _q(c, 3.2, ln - 1.3); c.lineTo(3.2, ln + 1.3); c.stroke()
            c.fillStyle = '#2A2422'
            for n in ((4.6, ln + 0.8), (3.3, ln + 2.1), (1.6, ln + 2.4)):
                c.beginPath(); c.ellipse(n[0], n[1], 0.9, 0.55, 0.5, 0, math.pi * 2); c.fill()
        c.restore()

    lie, bow, sit, wiggle = pose == 'lie', pose == 'bow', pose == 'sit', pose == 'wiggle'
    moving = pose == 'run' or wiggle
    bodyTilt = -0.42 if sit else 0.3 if bow else 0
    # tail
    tlen = 15 if L['tail'] == 'plume' else 10
    c.save(); c.translate(-18 if lie else -16, -9 if lie else -6 if sit else -27 if bow else BY - 2); c.rotate((-1.3 if bow else -0.9) + wag)
    c.strokeStyle = BLACK; c.lineWidth = 5.5 if L['tail'] == 'plume' else 4.2; c.lineCap = 'round'; c.beginPath()
    _q(c, 0, 0); c.quadraticCurveTo(-6, -tlen * 0.45, -5, -tlen); c.stroke()
    c.strokeStyle = TAN; c.lineWidth = 1.5; c.beginPath(); _q(c, 1, 1); c.quadraticCurveTo(-4, -tlen * 0.35, -3.6, -tlen * 0.75); c.stroke(); c.lineCap = 'butt'
    c.restore()
    a, b = math.sin(ph) * 0.7, math.sin(ph + math.pi) * 0.7
    if wiggle:
        a, b = math.sin(t / 60) * 0.6, math.sin(t / 60 + 2) * 0.6
    if moving:
        leg(-10, BY + 5, b * 0.8, LL, True); leg(10, BY + 5, a * 0.8, LL, True)
        leg(-12, BY + 4, a, LL); leg(12, BY + 4, b, LL)   # the near legs too, before the body: they come out from under it
    elif sit:
        leg(9, -16, 0.05, LL + 2, True)
    elif bow:
        leg(-11, -18, 0.05, LL + 4, True)
    if sit:   # pups.js: a neck from the shoulders up into the head, behind the chest markings
        c.fillStyle = BLACK; c.beginPath(); c.ellipse(14, -29, 7.5, 10, 0.25, 0, math.pi * 2); c.fill()
    # body
    c.save(); c.rotate(bodyTilt)
    if lie:
        c.fillStyle = BLACK; c.beginPath(); c.ellipse(-2, -9, 19, 8.5, 0, 0, math.pi * 2); c.fill()
        c.fillStyle = L['legLow']; c.beginPath(); c.ellipse(-12, -4, 7, 4, 0, 0, math.pi * 2); c.fill()
        c.fillStyle = L['legLow']; c.beginPath(); c.ellipse(18, -2.5, 8, 2.8, 0, 0, math.pi * 2); c.fill()
        c.fillStyle = L['paw']; c.beginPath(); c.ellipse(26, -2.5, 3.8, 2.7, 0, 0, math.pi * 2); c.fill(); c.beginPath(); c.ellipse(23, -0.3, 3.8, 2.5, 0, 0, math.pi * 2); c.fill()
        if L['chest'] == 'white':
            c.fillStyle = '#F2ECE3'; c.beginPath(); c.ellipse(12.5, -7, 1.4, 2.6, 0, 0, math.pi * 2); c.fill()
        else:
            c.fillStyle = TAN; c.beginPath(); c.ellipse(12, -7, 3.6, 3.4, 0, 0, math.pi * 2); c.fill()
        neck = (14, -11)
    else:
        c.fillStyle = BLACK; c.beginPath(); c.ellipse(0, BY, BRX, BRY, 0, 0, math.pi * 2); c.fill()
        if not sit:   # (sitting has its own neck; this one would tip up into a lump on the back)
            c.beginPath(); c.ellipse(12, BY - 5, 7, 8, -0.5, 0, math.pi * 2); c.fill()  # neck
        if L['chest'] == 'white':
            c.fillStyle = TAN; c.beginPath(); c.ellipse(16, BY - 4, 4, 6.5, -0.45, 0, math.pi * 2); c.fill()
            c.fillStyle = '#F2ECE3'
            c.beginPath(); c.ellipse(15.6, BY + 1.5, 1.5, 3.4, -0.3, 0, math.pi * 2); c.fill()
            c.fillStyle = TAN; c.beginPath(); c.ellipse(12, BY + 7.5, 4.5, 2.2, 0, 0, math.pi * 2); c.fill()
        else:
            c.fillStyle = TAN; c.beginPath(); c.ellipse(14, BY + 0.5, 4.2, 3.4, -0.3, 0, math.pi * 2); c.fill(); c.beginPath(); c.ellipse(15, BY + 5.5, 3.6, 2.8, -0.2, 0, math.pi * 2); c.fill()
            c.fillStyle = WHITE; c.beginPath(); c.arc(15.8, BY + 3, 1.1, 0, math.pi * 2); c.fill()
        if coat:  # coloring books only: a yellow raincoat over the body
            c.fillStyle = '#FFD84A'; c.beginPath(); c.ellipse(-1, BY + 0.5, BRX + 1.2, BRY + 1.4, 0, 0, math.pi * 2); c.fill()
            c.fillStyle = '#8FCBF0'
            for bx in (4, 10):
                c.beginPath(); c.arc(bx, BY - 1 + (bx - 4) * 0.4, 1.2, 0, math.pi * 2); c.fill()
        if scarf:  # coloring books only: a scarf where the collar goes, with one end hanging down
            c.strokeStyle = '#F2877E'; c.lineWidth = 4.2; c.lineCap = 'round'; c.beginPath(); _q(c, 9, BY - 11); c.quadraticCurveTo(14, BY - 3, 18, BY - 5); c.stroke()
            c.fillStyle = '#F2877E'; c.beginPath(); _q(c, 11.5, BY - 6); c.lineTo(15, BY - 5.5); c.lineTo(14.5, BY + 5); c.lineTo(10.5, BY + 5.5); c.closePath(); c.fill()
            c.lineCap = 'butt'
        elif L['collar'] and not coat and not sit:
            c.strokeStyle = '#141111'; c.lineWidth = 2.8; c.beginPath(); _q(c, 9, BY - 11); c.quadraticCurveTo(14, BY - 3, 18, BY - 5); c.stroke()
            c.fillStyle = '#D5D9E0'; c.fillRect(13.6, BY - 7.4, 2.8, 2.4); c.fillStyle = '#141111'; c.fillRect(14.4, BY - 6.8, 1.2, 1.2)
    c.restore()
    if sit and L['collar'] and not coat and not scarf:   # sitting, the collar goes round the sitting neck
        c.strokeStyle = '#141111'; c.lineWidth = 2.8; c.beginPath(); _q(c, 8.5, -33); c.quadraticCurveTo(13.5, -25, 20, -28); c.stroke()
        c.fillStyle = '#D5D9E0'; c.fillRect(14.2, -27.6, 2.8, 2.4); c.fillStyle = '#141111'; c.fillRect(15, -27, 1.2, 1.2)
    if moving:
        pass
    elif sit:
        leg(12, -17, -0.05, LL + 3)
        c.fillStyle = BLACK; c.beginPath(); c.ellipse(-9, -6, 8.5, 5.5, 0, 0, math.pi * 2); c.fill()
        c.fillStyle = L['legLow']; c.beginPath(); c.ellipse(-4, -2.5, 5, 2.5, 0, 0, math.pi * 2); c.fill()
        c.fillStyle = L['paw']; c.beginPath(); c.ellipse(-0.5, -1, 4, 2.4, 0, 0, math.pi * 2); c.fill()
    elif bow:
        c.fillStyle = L['legLow']; c.beginPath(); c.ellipse(20, -2.5, 8, 2.8, 0, 0, math.pi * 2); c.fill()
        c.fillStyle = L['paw']; c.beginPath(); c.ellipse(28, -2.5, 3.8, 2.6, 0, 0, math.pi * 2); c.fill()
        leg(-13, -16, 0, LL + 3)
    # head
    hx = 19 if lie else 18 if sit else 22 if bow else 21
    hy = -19 if lie else -38 if sit else -14 if bow else BY - 12
    c.save(); c.translate(hx, hy); c.rotate((-0.15 if bow else 0.05 if lie else 0) + (tilt or 0))
    c.mark('head')
    R = 11
    if L['ear'] == 'drop':
        c.fillStyle = '#1B1817'; c.beginPath(); c.ellipse(-4, 2, 4, 6.5, 0.35, 0, math.pi * 2); c.fill()
    c.fillStyle = BLACK; c.beginPath(); c.arc(0, 0, R, 0, math.pi * 2); c.fill()
    c.beginPath(); c.ellipse(8, 2.5, 8.5, 6.2, 0.08, 0, math.pi * 2); c.fill()  # snout
    if L['muzzle'] == 'cream':
        c.fillStyle = TAN; c.beginPath(); c.ellipse(5, 2.6, 9.4, 7.8, 0.12, 0, math.pi * 2); c.fill()
        c.fillStyle = TAN; c.beginPath(); c.ellipse(10.8, 2.6, 6.6, 3.9, 0.06, 0, math.pi * 2); c.fill()
        c.fillStyle = TAN; c.beginPath(); c.ellipse(7.5, 8.6, 7, 3.2, 0.12, 0, math.pi * 2); c.fill()
        c.beginPath(); c.ellipse(2.5, 9.5, 4.5, 3.5, 0, 0, math.pi * 2); c.fill()
        c.fillStyle = BLACK; c.beginPath(); c.ellipse(4.3, -1.8, 3, 2.5, -0.1, 0, math.pi * 2); c.fill()
        c.fillStyle = TAN; c.beginPath(); c.ellipse(3.4, -5.9, 3.6, 2.1, -0.25, 0, math.pi * 2); c.fill()
    else:
        c.fillStyle = TAN; c.beginPath(); c.ellipse(8.5, 4.5, 8, 4.8, 0.1, 0, math.pi * 2); c.fill()
        c.beginPath(); c.ellipse(4, 2.5, 3.8, 3.6, 0, 0, math.pi * 2); c.fill()
        c.fillStyle = BLACK; c.beginPath(); c.ellipse(10, 0.6, 7.5, 2.4, 0.08, 0, math.pi * 2); c.fill()
        c.fillStyle = 'rgba(210,200,186,0.85)'; c.beginPath(); c.ellipse(8.5, 8.4, 3.2, 1.5, 0.15, 0, math.pi * 2); c.fill()
        c.fillStyle = '#D69B5F'; c.beginPath(); c.arc(3.4, -5.6, 2.5, 0, math.pi * 2); c.fill()
    c.fillStyle = '#121010'; c.beginPath(); c.ellipse(16, 1.4, 2.9, 2.3, 0, 0, math.pi * 2); c.fill()
    c.fillStyle = 'rgba(255,255,255,0.55)'; c.beginPath(); c.arc(15.3, 0.6, 0.8, 0, math.pi * 2); c.fill()
    c.fillStyle = '#3A1E22'; c.beginPath(); _q(c, 15, 4.6); c.quadraticCurveTo(11, 10.5, 6, 6); c.quadraticCurveTo(11, 7.6, 15, 4.6); c.fill()
    c.fillStyle = PINK; c.beginPath(); c.ellipse(10.5, 8.6, 2.5, 3.2, 0.2, 0, math.pi * 2); c.fill()
    c.fillStyle = '#3A2418'; c.beginPath(); c.arc(4.2, -1.6, 2.1, 0, math.pi * 2); c.fill()
    c.fillStyle = '#fff'; c.beginPath(); c.arc(4.9, -2.4, 0.75, 0, math.pi * 2); c.fill()
    c.fillStyle = 'rgba(247,165,185,0.5)'; c.beginPath(); c.ellipse(7, 4.5, 2.2, 1.2, 0, 0, math.pi * 2); c.fill()
    if L['ear'] == 'drop':
        c.save(); c.translate(-3, -6.5); c.rotate(0.35)
        c.fillStyle = BLACK; c.beginPath(); c.ellipse(-1.5, 5.5, 4.8, 7.2, 0.15, 0, math.pi * 2); c.fill()
        c.fillStyle = 'rgba(214,160,150,0.5)'; c.beginPath(); c.ellipse(0.2, 1.8, 1.6, 3.2, 0.15, 0, math.pi * 2); c.fill()
        c.restore()
    else:
        c.save(); c.translate(-1.5, -8.5); c.rotate(0.35)
        c.fillStyle = BLACK; c.beginPath(); _q(c, -4, -1); c.quadraticCurveTo(1, -6, 6, 0); c.quadraticCurveTo(2, 4, -3, 3); c.closePath(); c.fill()
        c.strokeStyle = '#B97A43'; c.lineWidth = 0.9; c.beginPath(); _q(c, -3, 2.6); c.quadraticCurveTo(2, 3.6, 5.6, 0.4); c.stroke()
        c.restore()
    c.restore()
    return c


# ------------------------------------------------------------------ turning the recording into coloring-book art
def _area(p):
    return sum(p[i][0] * p[(i + 1) % len(p)][1] - p[(i + 1) % len(p)][0] * p[i][1] for i in range(len(p))) / 2


def _ccw(p):
    return p if _area(p) > 0 else p[::-1]


def _buffer(pts, w, cap):
    """a stroked polyline as a closed outline (round or butt ends)"""
    h = w / 2
    pts = [p for i, p in enumerate(pts) if i == 0 or math.hypot(p[0] - pts[i - 1][0], p[1] - pts[i - 1][1]) > 1e-6]
    n = len(pts)
    if n < 2:
        return None
    left, right = [], []
    for i, p in enumerate(pts):
        a, b = pts[max(0, i - 1)], pts[min(n - 1, i + 1)]
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy) or 1
        nx, ny = -dy / L, dx / L
        left.append((p[0] + nx * h, p[1] + ny * h))
        right.append((p[0] - nx * h, p[1] - ny * h))
    ring = list(left)
    if cap == 'round':
        e, q = pts[-1], pts[-2]
        a0 = math.atan2(left[-1][1] - e[1], left[-1][0] - e[0])
        d = math.atan2(e[1] - q[1], e[0] - q[0])
        s = 1 if math.sin(d - a0) > 0 else -1
        ring += [(e[0] + h * math.cos(a0 + s * math.pi * k / 8), e[1] + h * math.sin(a0 + s * math.pi * k / 8)) for k in range(1, 8)]
    ring += right[::-1]
    if cap == 'round':
        e, q = pts[0], pts[1]
        a0 = math.atan2(right[0][1] - e[1], right[0][0] - e[0])
        d = math.atan2(e[1] - q[1], e[0] - q[0])
        s = 1 if math.sin(d - a0) > 0 else -1
        ring += [(e[0] + h * math.cos(a0 + s * math.pi * k / 8), e[1] + h * math.sin(a0 + s * math.pi * k / 8)) for k in range(1, 8)]
    return ring


def _path(polys, dx=0.0):
    P = Path()
    for p in polys:
        P.M(p[0][0] + dx, p[0][1])
        for q in p[1:]:
            P.L(q[0] + dx, q[1])
        P.Z()
    return P


def regions(rec):
    """the recording as a list of ('grp', color, polys) / ('ink', polys) / ('glint', polys) / ('flat', color, polys) /
    ('line', polylines, rel_width), in paint order, with one-color runs merged"""
    out = []
    for op in rec.ops:
        if op[0] == 'fill':
            col, polys = op[1], [_ccw(p) for p in op[2]]
            if not polys:
                continue
            lc = col.lower()
            if lc in INKY:
                kind = ('ink',)
            elif lc in ('#fff', '#ffffff'):
                kind = ('glint',)
            elif _alpha(col) < 0.6:
                kind = ('flat', col)
            else:
                kind = ('grp', col)
        else:
            _, col, w, cap, lines = op
            if _alpha(col) < 0.3:
                if _alpha(col) > 0.1:  # the faint toe lines: a fine line in the art
                    out.append(('line', [l for l in lines if len(l) > 1], 0.55))
                continue
            if col.lower() == '#b97a43':  # the tan edge on Tidbit's folded ear: a fine line
                out.append(('line', [l for l in lines if len(l) > 1], 0.7))
                continue
            polys = [_ccw(b) for b in (_buffer(l, w, cap) for l in lines) if b]
            kind = ('grp', col)
        if kind[0] in ('grp', 'ink', 'flat') and out and out[-1][:len(kind)] == kind and out[-1][0] != 'line':
            out[-1] = out[-1][:-1] + (out[-1][-1] + polys,)
        else:
            out.append(kind + (polys,))
    return out


def bounds(regs):
    xs, ys = [], []
    for r in regs:
        if r[0] in ('grp', 'ink'):
            for p in r[-1]:
                for q in p:
                    xs.append(q[0])
                    ys.append(q[1])
    return min(xs), min(ys), max(xs), max(ys)


def emit(g, regs, dx=0.0, fine=1.0):
    """draw the regions into a cute.Fig (or View). fine scales the inner pen for small figures"""
    dw = g.ink.dw
    iw = g.ink.iw * fine
    for r in regs:
        k = r[0]
        if k == 'grp':
            g.grp(_path(r[2], dx), c=r[1], w=iw)
        elif k == 'ink':
            g.blk(_path(r[1], dx))
        elif k == 'glint':
            g.wh(_path(r[1], dx))
        elif k == 'flat':
            g.flat(_path(r[2], dx), r[1])
        elif k == 'line':
            for l in r[1]:
                P = Path()
                P.M(l[0][0] + dx, l[0][1])
                for q in l[1:]:
                    P.L(q[0] + dx, q[1])
                g.line(P, w=dw * r[2] * fine)


def _cut_poly(p, cut):
    """the part of a closed polygon above the line y = cut (Sutherland-Hodgman, one edge)"""
    out = []
    n = len(p)
    for i in range(n):
        a, b = p[i], p[(i + 1) % n]
        ia, ib = a[1] <= cut, b[1] <= cut
        if ia:
            out.append(a)
        if ia != ib:
            t = (cut - a[1]) / (b[1] - a[1])
            out.append((a[0] + (b[0] - a[0]) * t, cut))
    return out if len(out) > 2 else None


def cut_above(regs, cut):
    """only what is above y = cut (a pup peeking over a ledge)"""
    res = []
    for r in regs:
        if r[0] == 'line':
            ls = [[q for q in l if q[1] <= cut] for l in r[1]]
            ls = [l for l in ls if len(l) > 1]
            if ls:
                res.append(('line', ls, r[2]))
            continue
        polys = [q for q in (_cut_poly(p, cut) for p in r[-1]) if q]
        if polys:
            res.append(r[:-1] + (polys,))
    return res


def head_svg(who, size=64, pad=3.0, attrs='focusable="false" aria-hidden="true"'):
    """Tidbit's or Sugarfoot's head exactly as the cartoon draws it (facing right, the cartoon's own colors, no outline),
    as a small square SVG: the hint badges in the books (tools/book/hints.py)"""
    rec = draw(LOOKS[WHO[who]], 'sit')
    ops = rec.ops[rec.marks['head_at']:]
    xs = [p[0] for op in ops for sub in op[-1] for p in sub]
    ys = [p[1] for op in ops for sub in op[-1] for p in sub]
    x0, x1, y0, y1 = min(xs), max(xs), min(ys), max(ys)
    k = (size - 2 * pad) / max(x1 - x0, y1 - y0)
    ox, oy = (size - (x1 - x0) * k) / 2 - x0 * k, (size - (y1 - y0) * k) / 2 - y0 * k

    def d(subs, closed):
        return ''.join('M' + 'L'.join('%.1f %.1f' % (p[0] * k + ox, p[1] * k + oy) for p in s) + ('Z' if closed else '') for s in subs if len(s) > 1)

    out = []
    for op in ops:
        if op[0] == 'fill':
            out.append('<path d="%s" fill="%s"/>' % (d(op[2], True), op[1]))
        else:
            _, col, w, cap, lines = op
            out.append('<path d="%s" fill="none" stroke="%s" stroke-width="%.2f" stroke-linecap="%s"/>' % (d(lines, False), col, w * k, cap))
    return '<svg viewBox="0 0 %d %d" %s>%s</svg>' % (size, size, attrs, ''.join(out))


def svg_group(who, x, y, s, left=False, head_only=False, halo=False, pose='sit'):
    """the logo and the app icon: the organic version (smooth shapes, no joints), in the cartoon's own colors, no outline"""
    rec = draw(LOOKS[WHO[who]], pose, neck=True)
    if head_only:
        hm = rec.marks['head']
        cx, cy = hm[4], hm[5]
        rec.ops = rec.ops[rec.marks['head_at']:]
    org = organic(rec, res=20.0)
    if not head_only:
        xs = [q[0] for loop in org['outline'] for q in loop]
        cx, cy = (min(xs) + max(xs)) / 2, 0.0
    sx = -s if left else s

    def d(loops):
        return ''.join('M' + 'L'.join('%.2f %.2f' % ((p[0] - cx) * sx + x, (p[1] - cy) * s + y) for p in lp) + 'Z' for lp in loops if len(lp) > 2)
    if halo:
        return '<path d="%s"/>' % d(org['outline'])
    out = ['<path d="%s" fill="#252120"/>' % d(org['outline'])]
    for area, fam, col, pts in org['regions']:
        out.append('<path d="%s" fill="%s"/>' % (d([pts]), '#121010' if fam == 'ink' else col))
    for p in org['glints']:
        out.append('<path d="%s" fill="#fff"/>' % d([p]))
    for l in org['lines']:
        out.append('<path d="%s" fill="none" stroke="#B97A43" stroke-width="%.2f" stroke-linecap="round"/>' % (d([l])[:-1], 0.6 * s))
    return ''.join(out)


def svg_group_flat(who, x, y, s, left=False, head_only=False, halo=False, pose='sit'):
    """the pup as plain SVG in the cartoon's own colors (no outline), for the logo and the app icon (tools/brand/logo_pups.py).
    Body: paws at (x, y), centered across. head_only: the head's middle at (x, y). halo: shapes only, no colors, so the
    parent <g> paints them (the white sticker edge behind the dark logo)"""
    rec = draw(LOOKS[WHO[who]], pose)
    ops = rec.ops[rec.marks['head_at']:] if head_only else rec.ops
    ops = [op for op in ops if not (op[0] == 'fill' and op[1].startswith('rgba(10,8,8'))]   # no grey box behind the far legs
    if head_only:
        hm = rec.marks['head']
        cx, cy = hm[4], hm[5]
    else:
        xs = [p[0] for op in ops for sub in op[-1] for p in sub]
        cx, cy = (min(xs) + max(xs)) / 2, 0.0
    sx = -s if left else s

    def P(p):
        return ((p[0] - cx) * sx + x, (p[1] - cy) * s + y)

    def d(subs, closed):
        return ''.join('M' + 'L'.join('%.2f %.2f' % P(p) for p in sb) + ('Z' if closed else '') for sb in subs if len(sb) > 1)

    out = []
    for op in ops:
        if op[0] == 'fill':
            if halo:
                if _alpha(op[1]) >= 0.6:
                    out.append('<path d="%s"/>' % d(op[2], True))
            else:
                out.append('<path d="%s" fill="%s"/>' % (d(op[2], True), op[1]))
        else:
            _, col, w, cap, lines = op
            if halo:
                if _alpha(col) >= 0.6 and w > 2:
                    out.append('<path d="%s"/>' % d([b for b in (_buffer(l, w, cap) for l in lines) if b], True))
            elif _alpha(col) > 0.1:
                out.append('<path d="%s" fill="none" stroke="%s" stroke-width="%.2f" stroke-linecap="%s"/>' % (d(lines, False), col, w * s, cap))
    return ''.join(out)


# ------------------------------------------------------------------ the organic version (owner, Nov 1 2026: "Tidbit and Sugarfoot
# shouldn't look robotic. Like robot dogs.")
# Outlining every one of the cartoon's shapes made the line art look jointed: tube legs, a head bolted on. Here the same drawing
# is painted into a fine grid, the colors are gathered into a few families (all the black coat is one, all the tans one, ...),
# the edges are softened, and only the edges between different colors are traced, as smooth curves. So a pup is one soft
# outline with its markings inside it: the same pup, colors and markings as the cartoon, drawn like a puppy, not a robot.
# Needs numpy, scipy and contourpy.
FAMILY = [
    ('coat', '#252120', ('#252120', '#262220', '#1b1817', '#141111')),
    ('leg', '#A45C2E', ('#a45c2e', '#b97847')),
    ('tan', '#C9965F', ('#c4834a', '#c9965f', '#c98a4f', '#d99e62', '#d69b5f', '#b97a43', 'rgba(210,200,186,0.85)')),
    ('cream', '#F1EADF', ('#f1eadf', '#f2ece3', '#f4efe6')),
    ('tag', '#D5D9E0', ('#d5d9e0',)),
    ('tongue', '#EE8FA6', ('#ee8fa6',)),
    ('ink', '#121010', ('#121010', '#3a1e22', '#3a2418', '#2a2422')),
    ('scarf', '#F2877E', ('#f2877e',)),
    ('coat2', '#FFD84A', ('#ffd84a',)),
    ('button', '#8FCBF0', ('#8fcbf0',)),
]
_FAM = {c: i + 1 for i, (_, _, cs) in enumerate(FAMILY) for c in cs}


_ORG = {}


def _simplify(pts, tol=0.05):
    """Ramer-Douglas-Peucker on a closed loop (cartoon units): fewer points, the same curve"""
    def rdp(a, b, seg):
        if len(seg) < 3:
            return [seg[0]]
        (x1, y1), (x2, y2) = seg[0], seg[-1]
        dx, dy = x2 - x1, y2 - y1
        L = math.hypot(dx, dy) or 1e-9
        i, dmax = 0, -1.0
        for j in range(1, len(seg) - 1):
            d = abs(dy * seg[j][0] - dx * seg[j][1] + x2 * y1 - y2 * x1) / L
            if d > dmax:
                i, dmax = j, d
        if dmax <= tol:
            return [seg[0]]
        return rdp(a, b, seg[:i + 1]) + rdp(a, b, seg[i:])
    if len(pts) < 8:
        return pts
    h = len(pts) // 2
    out = rdp(0, 0, pts[:h + 1]) + rdp(0, 0, pts[h:] + [pts[0]])
    return out if len(out) >= 4 else pts


def organic(rec, res=14.0, soft=0.55, who=None, key=None):
    """the recording as smooth regions: [(family name, color, [loop points])] largest first, plus the glints and fine lines.
    res: grid cells per cartoon unit; soft: how much the edges are rounded (cartoon units); key: remember the result"""
    if key is not None and key in _ORG:
        return _ORG[key]
    import numpy as np
    from PIL import Image, ImageDraw
    from scipy import ndimage
    import contourpy
    polys = []   # (family, [points])
    glints, lines = [], []
    for op in rec.ops:
        if op[0] == 'fill':
            col = op[1].lower()
            if col in ('#fff', '#ffffff'):
                glints.extend(op[2])
                continue
            fam = _FAM.get(col)
            if fam is None:
                continue          # soft overlays: blush, shading, the ear's pink
            for p in op[2]:
                polys.append((fam, p))
        else:
            _, col, w, cap, ls = op
            col = col.lower()
            if col.startswith('rgba(0,0,0'):
                lines.extend(l for l in ls if len(l) > 1)      # toe lines
                continue
            if col == '#b97a43':
                lines.extend(l for l in ls if len(l) > 1)      # the tan edge of Tidbit's folded ear
                continue
            fam = _FAM.get(col)
            if fam is None:
                continue
            for l in ls:
                b = _buffer(l, w, cap)
                if b:
                    polys.append((fam, b))
    xs = [q[0] for _, p in polys for q in p]
    ys = [q[1] for _, p in polys for q in p]
    pad = 3.0
    x0, y0 = min(xs) - pad, min(ys) - pad
    W, H = int((max(xs) + pad - x0) * res) + 1, int((max(ys) + pad - y0) * res) + 1
    im = Image.new('L', (W, H), 0)
    dr = ImageDraw.Draw(im)
    for fam, p in polys:   # paint in the cartoon's own order: what is on top stays on top
        dr.polygon([((q[0] - x0) * res, (q[1] - y0) * res) for q in p], fill=fam)
    lab = np.asarray(im)
    n = len(FAMILY) + 1
    sig = soft * res
    # soften: blur each family's coverage and keep the strongest (small slivers and sharp joints melt away)
    present = [k for k in range(n) if k == 0 or (lab == k).any()]
    score = np.stack([ndimage.gaussian_filter((lab == k).astype(np.float32), sig if k else sig * 1.4) for k in present])
    smooth = np.asarray(present)[score.argmax(0)]
    regions = []
    for k in range(1, n):
        m = smooth == k
        if not m.any():
            continue
        comp, nc = ndimage.label(m)
        for c in range(1, nc + 1):
            cm = comp == c
            if cm.sum() < res * res * 0.35:    # specks
                continue
            cm = ndimage.binary_fill_holes(cm)
            f = ndimage.gaussian_filter(cm.astype(np.float32), 1.0)
            gen = contourpy.contour_generator(z=np.pad(f, 1))
            for loop in gen.lines(0.5):
                if len(loop) < 8:
                    continue
                pts = _simplify([((x - 1) / res + x0, (y - 1) / res + y0) for x, y in loop])
                area = abs(_area(pts))
                regions.append((area, FAMILY[k - 1][0], FAMILY[k - 1][1], pts))
    regions.sort(key=lambda r: -r[0])
    sil = (smooth > 0)
    sil = ndimage.binary_fill_holes(sil)
    f = ndimage.gaussian_filter(sil.astype(np.float32), 1.0)
    outline = [_simplify([((x - 1) / res + x0, (y - 1) / res + y0) for x, y in loop]) for loop in contourpy.contour_generator(z=np.pad(f, 1)).lines(0.5) if len(loop) > 8]
    out = {'regions': regions, 'outline': outline, 'glints': glints, 'lines': lines}
    if key is not None:
        _ORG[key] = out
    return out


def emit_organic(g, org, dx=0.0, fine=1.0):
    """draw organic() into a cute.Fig: one bold outline around the whole pup, the color areas inside with a finer line"""
    dw = g.ink.dw
    iw = g.ink.iw * fine

    def P(pts):
        p = Path()
        p.M(pts[0][0] + dx, pts[0][1])
        for q in pts[1:]:
            p.L(q[0] + dx, q[1])
        p.Z()
        return p
    sil = Path()
    for loop in org['outline']:
        sil = sil + P(_ccw(loop))
    g.grp(sil, c='#252120', w=iw, under=True)          # the silhouette: carries the bold outer outline
    for area, fam, col, pts in org['regions']:
        if fam == 'coat':
            g.part(P(pts), c=col, under=False, w=iw * 0.9)
        elif fam == 'ink':
            g.blk(P(pts))
        else:
            g.part(P(pts), c=col, under=False, w=iw * 0.85)
    for p in org['glints']:
        g.wh(P(p))
    for l in org['lines']:
        q = Path()
        q.M(l[0][0] + dx, l[0][1])
        for r in l[1:]:
            q.L(r[0] + dx, r[1])
        g.line(q, w=dw * 0.6 * fine)
