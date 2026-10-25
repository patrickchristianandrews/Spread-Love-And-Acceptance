#!/usr/bin/env python3
"""kids_art.py: the site's characters and scenery as SVG, for the kids books and coloring books (kids22).

Every character is drawn from the shapes the site already uses, so the books match the site:
  Tidbit and Sugarfoot    assets/img/logo-mark.svg (front, sitting) and assets/js/pups.js (side, standing or running)
  Professor Puddles       tools/book/hints.py SVG_PUDDLES
  Grumble, Fuzz, Mumble, Drift (the clouds of Static)   assets/js/arcade.js drawStatic and GHOSTS colors
  Ollie, Dot, Hopper, Nutmeg, Lumi, Beep, the ducklings, the Moon, the butterfly   assets/js/buddies-player.js GDRAW
  the Night Garden bunny, hedgehog and fireflies   assets/js/night-garden.js
  Peach and Lilac          assets/img/logo-mark.svg (and their colors on brand.html)

One drawing, three modes (Pen.mode):
  'color'  the full-color picture book and covers
  'ink'    grays with black lines, for the black-and-white chapter book
  'line'   clean outlines for coloring: every shape white with one black stroke, highlights and blush left out,
           pupils and noses filled. The stroke width is the same on the page whatever the scale (Pen.sw is in page
           units and is divided by the current scale).
"""
import math
import re

INK = '#2B2620'
TAU = math.pi * 2
_UID = 0


def _hex(c):
    c = c.lstrip('#')
    if len(c) == 3:
        c = ''.join(x * 2 for x in c)
    return tuple(int(c[i:i + 2], 16) for i in (0, 2, 4))


def gray_of(c, lo=0.2, hi=0.98):
    """the ink-mode gray for a color: its luminance, stretched so the pups' black and tan stay far apart"""
    if not c or c in ('none', 'transparent') or c.startswith('url('):
        return c
    if c.startswith('rgba'):
        m = re.match(r'rgba\(([\d.]+),\s*([\d.]+),\s*([\d.]+)', c)
        r, g, b = (float(m.group(i)) for i in (1, 2, 3))
    else:
        r, g, b = _hex(c)
    lum = (0.2126 * r + 0.7152 * g + 0.0722 * b) / 255.0
    v = min(hi, max(lo, 0.2 + 1.18 * (lum - 0.13)))
    n = int(round(v * 255))
    return '#%02x%02x%02x' % (n, n, n)


def f(x):
    """a short number for SVG"""
    if isinstance(x, str):
        return x
    s = ('%.2f' % x).rstrip('0').rstrip('.')
    return '0' if s in ('-0', '') else s


class Pen:
    """collects SVG markup; knows the mode, the page stroke width and the current scale"""

    def __init__(self, mode='color', sw=2.0, outline=True):
        self.mode = mode
        self.sw = sw              # stroke width in page units (line and ink modes; the color outline too)
        self.outline = outline    # color mode: a soft ink outline around character shapes
        self.out = []
        self.scale = [1.0]
        self.uid = 0

    # ---- groups
    def open(self, transform='', s=1.0, extra=''):
        self.scale.append(self.scale[-1] * s)
        self.out.append('<g%s%s>' % ((' transform="%s"' % transform) if transform else '', extra))

    def close(self):
        self.scale.pop()
        self.out.append('</g>')

    def at(self, x, y, s=1.0, flip=False, rot=0):
        t = 'translate(%s %s)' % (f(x), f(y))
        if rot:
            t += ' rotate(%s)' % f(rot)
        if s != 1 or flip:
            t += ' scale(%s %s)' % (f(-s if flip else s), f(s))
        self.open(t, s)

    def raw(self, s):
        self.out.append(s)

    def svg(self):
        return ''.join(self.out)

    def id(self, p='k'):
        # ids are unique across the whole program: pages share one HTML document, and a repeated id would pick the first gradient
        global _UID
        _UID += 1
        return '%s%d' % (p, _UID)

    # ---- paint for a shape
    def _w(self, k=1.0):
        return self.sw * k / self.scale[-1]

    def paint(self, fill, stroke=None, kind='shape', k=1.0, op=None):
        """kind: 'shape' (outlined in line/ink mode), 'detail' (left out in line mode: glints, blush, shading),
        'dark' (small dark parts: pupils, noses; filled black in line mode), 'flat' (scenery fill; outlined in line mode
        only when stroke is asked), 'bg' (background: left out in line mode)"""
        m = self.mode
        if m == 'line':
            if kind in ('detail', 'bg'):
                return None
            if kind == 'dark':
                return 'fill="#111" stroke="#111" stroke-width="%s"' % f(self._w(0.5 * k))
            return 'fill="#fff" stroke="#111" stroke-width="%s" stroke-linejoin="round" stroke-linecap="round"' % f(self._w(k))
        if m == 'ink':
            fl = gray_of(fill) if fill else 'none'
            a = 'fill="%s"' % fl
            if op is not None:
                a += ' opacity="%s"' % f(op)
            if kind == 'shape':
                a += ' stroke="#1a1a1a" stroke-width="%s" stroke-linejoin="round"' % f(self._w(0.8 * k))
            return a
        a = 'fill="%s"' % (fill or 'none')
        if op is not None:
            a += ' opacity="%s"' % f(op)
        if stroke:
            a += ' stroke="%s" stroke-width="%s" stroke-linejoin="round"' % (stroke, f(self._w(k)))
        elif kind == 'shape' and self.outline:
            a += ' stroke="%s" stroke-opacity=".55" stroke-width="%s" stroke-linejoin="round"' % (INK, f(self._w(0.55 * k)))
        return a

    # ---- shapes (all in the current group's units)
    def ell(self, cx, cy, rx, ry, fill, rot=0, kind='shape', stroke=None, k=1.0, op=None):
        p = self.paint(fill, stroke, kind, k, op)
        if p is None:
            return
        t = ' transform="rotate(%s %s %s)"' % (f(rot), f(cx), f(cy)) if rot else ''
        self.out.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s"%s %s/>' % (f(cx), f(cy), f(rx), f(ry), t, p))

    def circ(self, cx, cy, r, fill, kind='shape', stroke=None, k=1.0, op=None):
        p = self.paint(fill, stroke, kind, k, op)
        if p is None:
            return
        self.out.append('<circle cx="%s" cy="%s" r="%s" %s/>' % (f(cx), f(cy), f(r), p))

    def rect(self, x, y, w, h, fill, r=0, kind='shape', stroke=None, rot=0, k=1.0, op=None):
        p = self.paint(fill, stroke, kind, k, op)
        if p is None:
            return
        t = ' transform="rotate(%s %s %s)"' % (f(rot), f(x + w / 2), f(y + h / 2)) if rot else ''
        self.out.append('<rect x="%s" y="%s" width="%s" height="%s" rx="%s"%s %s/>' % (f(x), f(y), f(w), f(h), f(r), t, p))

    def path(self, d, fill, kind='shape', stroke=None, k=1.0, op=None, extra=''):
        p = self.paint(fill, stroke, kind, k, op)
        if p is None:
            return
        self.out.append('<path d="%s" %s%s/>' % (d, p, extra))

    def line(self, d, color, w=1.0, kind='line', cap='round', op=None):
        """a stroked line (mouths, whiskers, stalks): its width w is in local units in color mode; in line and ink
        mode it is the page stroke width (thinner for 'fine' lines)"""
        m = self.mode
        if kind == 'detail' and m == 'line':
            return
        if m == 'line':
            col, ww = '#111', self._w(0.75 if kind == 'fine' else 1.0)
            if kind == 'thick':
                col, ww = '#111', max(self._w(1.0), w)
        elif m == 'ink':
            col, ww = ('#1a1a1a' if kind != 'detail' else gray_of(color)), (w if kind == 'thick' else max(w, self._w(0.7)))
        else:
            col, ww = color, w
        o = ' opacity="%s"' % f(op) if op is not None and m != 'line' else ''
        self.out.append('<path d="%s" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="%s" stroke-linejoin="round"%s/>' % (d, col, f(ww), cap, o))

    def thick(self, d, color, w):
        """a thick stroked band that is a colorable shape (a tail, a handle): in line mode, drawn as a black band with
        a white core so it stays an outline"""
        if self.mode == 'line':
            sw = self._w(1.0)
            self.out.append('<path d="%s" fill="none" stroke="#111" stroke-width="%s" stroke-linecap="round" stroke-linejoin="round"/>' % (d, f(w + 2 * sw)))
            self.out.append('<path d="%s" fill="none" stroke="#fff" stroke-width="%s" stroke-linecap="round" stroke-linejoin="round"/>' % (d, f(max(w, 0.1))))
            return
        col = gray_of(color) if self.mode == 'ink' else color
        if self.mode == 'ink':
            sw = self._w(0.8)
            self.out.append('<path d="%s" fill="none" stroke="#1a1a1a" stroke-width="%s" stroke-linecap="round"/>' % (d, f(w + 2 * sw)))
        self.out.append('<path d="%s" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round" stroke-linejoin="round"/>' % (d, col, f(w)))


# ---------------------------------------------------------------- small shared shapes
HEART = 'M0 12C-10-2-30 4-26 20-23 32 0 44 0 44S23 32 26 20C30 4 10-2 0 12Z'   # the logo's heart, 52 wide, 0..44 tall


def heart(P, x, y, s, fill='#F08DA8', stroke='#D2668A', kind='shape'):
    P.at(x, y, s)
    if P.mode == 'color':
        P.path(HEART, fill, stroke=stroke, k=1.2)
        P.ell(-12, 12, 4.5, 2.8, '#fff', rot=-30, kind='detail', op=0.55)
    else:
        P.path(HEART, fill, kind=kind)
    P.close()


def sparkle(P, x, y, s=1.0, fill='#FAD27A', stroke='#DDA23A'):
    P.at(x, y, s)
    d = 'M0 -7Q1.2 -1.2 7 0Q1.2 1.2 0 7Q-1.2 1.2 -7 0Q-1.2 -1.2 0 -7Z'
    if P.mode == 'color':
        P.path(d, fill, stroke=stroke, k=0.6)
    else:
        P.path(d, fill)
    P.close()


def bubble(P, x, y, r):
    if P.mode == 'color':
        P.circ(x, y, r, 'rgba(200,230,255,0.35)', stroke='#8EC5EE', k=0.9, kind='flat')
        P.ell(x - r * 0.38, y - r * 0.38, r * 0.25, r * 0.14, '#fff', rot=-40, kind='detail', op=0.9)
    elif P.mode == 'ink':
        P.circ(x, y, r, '#ffffff', kind='shape')
        P.ell(x - r * 0.38, y - r * 0.38, r * 0.25, r * 0.14, '#ffffff', rot=-40, kind='detail')
    else:
        P.circ(x, y, r, '#fff')
        P.line('M%s %s A%s %s 0 0 1 %s %s' % (f(x - r * 0.6), f(y - r * 0.15), f(r * 0.62), f(r * 0.62), f(x - r * 0.15), f(y - r * 0.6)), '#111', kind='fine')


def eye(P, x, y, r, style='open', look=(0.25, 0.0)):
    """an eye: 'open' (white, pupil, glint), 'dot' (just a dark pupil and glint), 'happy' (a closed smile-arc),
    'closed' (a calm downward arc), 'wide' (bigger)"""
    if style in ('happy',):
        P.line('M%s %s Q%s %s %s %s' % (f(x - r), f(y + r * 0.3), f(x), f(y - r * 0.9), f(x + r), f(y + r * 0.3)), '#221c1c', r * 0.55)
        return
    if style == 'closed':
        P.line('M%s %s Q%s %s %s %s' % (f(x - r), f(y - r * 0.1), f(x), f(y + r * 0.8), f(x + r), f(y - r * 0.1)), '#221c1c', r * 0.5)
        return
    if style == 'dot':
        P.circ(x, y, r, '#3A2418', kind='dark')
        P.circ(x + r * 0.35, y - r * 0.38, r * 0.34, '#fff', kind='detail')
        return
    if style == 'wide':
        r *= 1.25
    P.circ(x, y, r, '#fff', kind='shape', k=0.8)
    P.circ(x + r * look[0], y + r * look[1], r * 0.6, '#221c1c', kind='dark')
    P.circ(x + r * (look[0] + 0.2), y + r * (look[1] - 0.3), r * 0.22, '#fff', kind='detail')


def mouth(P, x, y, w, style='smile', col='#6B2A33'):
    if style == 'smile':
        P.line('M%s %s Q%s %s %s %s' % (f(x - w / 2), f(y), f(x), f(y + w * 0.45), f(x + w / 2), f(y)), col, max(w * 0.12, 0.8))
    elif style == 'frown':
        P.line('M%s %s Q%s %s %s %s' % (f(x - w / 2), f(y + w * 0.2), f(x), f(y - w * 0.25), f(x + w / 2), f(y + w * 0.2)), col, max(w * 0.12, 0.8))
    elif style == 'flat':
        P.line('M%s %s L%s %s' % (f(x - w * 0.35), f(y), f(x + w * 0.35), f(y)), col, max(w * 0.12, 0.8))
    elif style == 'o':
        P.ell(x, y + w * 0.1, w * 0.22, w * 0.28, col, kind='dark')
    elif style == 'open':
        P.path('M%s %s Q%s %s %s %sZ' % (f(x - w / 2), f(y), f(x), f(y + w * 0.75), f(x + w / 2), f(y)), col, kind='dark')
    elif style == 'wavy':
        P.line('M%s %s q%s %s %s 0 q%s %s %s 0' % (f(x - w / 2), f(y), f(w / 4), f(-w * 0.18), f(w / 2), f(w / 4), f(w * 0.18), f(w / 2)), col, max(w * 0.11, 0.8))


# ---------------------------------------------------------------- Tidbit and Sugarfoot, front (sitting)
# from assets/img/logo-mark.svg: Sugarfoot is the stocky one with long drop ears, tan brows, a fawn muzzle and white toes;
# Tidbit is the leaner one with folded ears, round tan brow dots, tan cheeks, tan legs and a collar with a gold heart tag.
BLACK = '#252120'


def sugarfoot_front(P, x, y, s, expr='happy', mouth_='grin', flip=False, tail=True, heart_=False, look=(0, 0)):
    """origin at the paws (bottom center); about 70 units tall (ear top -15, paws 40)"""
    P.at(x, y - 40 * s, s, flip)
    if tail:
        P.thick('M-14 30Q-27 27-26 13', BLACK, 6)
        P.line('M-15 28Q-24 24-23.5 15', '#C9965F', 1.5, kind='detail')
    P.path('M-18 38C-19 26-12 17 0 17S19 26 18 38Z', BLACK)
    P.rect(-12, 27, 8, 9, '#B97847', r=4)
    P.rect(4, 27, 8, 9, '#B97847', r=4)
    P.ell(-8, 36, 6, 3.8, '#F1EADF')
    P.ell(8, 36, 6, 3.8, '#F1EADF')
    for nx in (-10.5, -8, -5.5, 5.5, 8, 10.5):
        P.line('M%s 36.6 l0 2' % f(nx), '#2A2422', 0.7, kind='fine' if P.mode != 'color' else 'line')
    P.ell(0, 24, 1.8, 3.5, '#F2ECE3', kind='shape' if P.mode == 'color' else 'shape')
    P.ell(-17, 5, 7, 14, '#1B1817', rot=18)
    P.ell(17, 5, 7, 14, '#1B1817', rot=-18)
    P.ell(0, 0, 17, 15.5, BLACK)
    P.ell(0, 7, 13, 9, '#C9965F')
    _brows_drop(P, expr)
    for ex in (-6.5, 6.5):
        P.ell(ex, -2, 3.7, 3.3, BLACK, kind='detail' if P.mode == 'line' else 'flat')
        _pup_eye(P, ex, -2, 2.4, expr, look)
    P.ell(0, 3.6, 4.2, 3, '#121010', kind='dark')
    P.ell(-1, 2.6, 1.2, .8, '#fff', kind='detail', op=0.5)
    P.ell(-10.5, 8, 2.6, 1.5, '#F4A2B8', kind='detail', op=0.8)
    P.ell(10.5, 8, 2.6, 1.5, '#F4A2B8', kind='detail', op=0.8)
    _pup_mouth(P, mouth_, 0, 8, 'drop')
    if heart_:
        heart(P, 0, 18.5, 0.16, '#FAD27A', '#DDA23A')
    P.close()


def tidbit_front(P, x, y, s, expr='happy', mouth_='w', flip=False, tail=True, look=(0, 0)):
    """origin at the paws; leaner and a little taller than Sugarfoot (about 72 units)"""
    P.at(x, y - 40 * s, s, flip)
    if tail:
        P.thick('M13 30Q21 26 22 18', BLACK, 5)
    P.path('M-14 38C-15 28-9 19 0 19S15 28 14 38Z', BLACK)
    P.ell(-4.5, 25.5, 3, 2.4, '#C4834A')
    P.ell(4.5, 25.5, 3, 2.4, '#C4834A')
    P.rect(-10, 28, 7, 8, '#C98A4F', r=3.5)
    P.rect(3, 28, 7, 8, '#C98A4F', r=3.5)
    P.ell(-6.5, 36, 5, 3.3, '#D99E62')
    P.ell(6.5, 36, 5, 3.3, '#D99E62')
    P.thick('M-11 16Q0 24 11 16', '#141111' if P.mode == 'color' else '#9a2d3b', 3.6)
    P.line('M-11 14.6Q0 22.6 11 14.6', '#6B625E', 0.8, kind='detail')
    heart(P, 0, 19.5, 0.13, '#FAD27A', '#DDA23A')
    P.ell(0, 0, 15.5, 15, BLACK)
    P.ell(0, 8, 10, 6.5, '#C4834A')
    P.ell(0, 2.5, 3.2, 6, BLACK, kind='flat' if P.mode == 'color' else 'detail')
    P.path('M-15.5 -5Q-14 -16 -5 -13.5Q-8 -7 -13.5 -3Z', BLACK)
    P.path('M15.5 -5Q14 -16 5 -13.5Q8 -7 13.5 -3Z', BLACK)
    P.line('M-13.5 -3.5Q-8.5 -7 -5.5 -12.5M13.5 -3.5Q8.5 -7 5.5 -12.5', '#B97A43', 1.2, kind='detail')
    _brows_dot(P, expr)
    for ex in (-6, 6):
        _pup_eye(P, ex, -2.3, 2.4, expr, look, col='#5A3A26')
    P.ell(0, 5.5, 3.8, 2.7, '#121010', kind='dark')
    P.ell(-6, 8, 2.2, 1.3, '#F7A5B9', kind='detail', op=0.6)
    P.ell(6, 8, 2.2, 1.3, '#F7A5B9', kind='detail', op=0.6)
    _pup_mouth(P, mouth_, 0, 10, 'collar')
    P.close()


def _brows_drop(P, expr):
    tilt = {'worried': 22, 'sad': 20, 'cross': -24}.get(expr, 15)
    dy = {'surprised': -2.5, 'worried': -1}.get(expr, 0)
    P.ell(-7, -8.5 + dy, 3.8, 2.3, '#C9965F', rot=-tilt if expr not in ('worried', 'sad') else tilt - 30)
    P.ell(7, -8.5 + dy, 3.8, 2.3, '#C9965F', rot=tilt if expr not in ('worried', 'sad') else 30 - tilt)


def _brows_dot(P, expr):
    dy = {'surprised': -2.2, 'worried': -0.8}.get(expr, 0)
    if expr == 'cross':
        P.ell(-6, -7.6, 3, 1.7, '#D69B5F', rot=24)
        P.ell(6, -7.6, 3, 1.7, '#D69B5F', rot=-24)
    elif expr in ('worried', 'sad'):
        P.ell(-6, -7.6 + dy, 3, 1.8, '#D69B5F', rot=-22)
        P.ell(6, -7.6 + dy, 3, 1.8, '#D69B5F', rot=22)
    else:
        P.circ(-6, -7.2 + dy, 2.7, '#D69B5F')
        P.circ(6, -7.2 + dy, 2.7, '#D69B5F')


def _pup_eye(P, x, y, r, expr, look=(0, 0), col='#3A2418'):
    if expr == 'happy-closed':
        P.line('M%s %s Q%s %s %s %s' % (f(x - r), f(y + 0.6), f(x), f(y - r * 1.1), f(x + r), f(y + 0.6)), '#F2E6D8' if P.mode == 'color' else '#111', 1.2)
        return
    if expr in ('calm', 'sleep'):
        P.line('M%s %s Q%s %s %s %s' % (f(x - r), f(y - 0.3), f(x), f(y + r * 0.9), f(x + r), f(y - 0.3)), '#F2E6D8' if P.mode == 'color' else '#111', 1.1)
        return
    rr = r * (1.22 if expr == 'surprised' else 1.0)
    lx, ly = look
    if expr == 'sad':
        ly = max(ly, 0.35)
    P.circ(x + lx, y + ly, rr, col, kind='dark')
    P.circ(x + lx + rr * 0.38, y + ly - rr * 0.38, rr * 0.38, '#fff', kind='detail' if P.mode == 'line' else 'flat')
    if expr == 'sad':
        P.path('M%s %s q-1.2 2.4 0 3.4 q1.2 -1 0 -3.4Z' % (f(x + 2.2), f(y + 2.4)), '#9ED3FF', kind='flat' if P.mode == 'color' else 'shape')


def _pup_mouth(P, style, x, y, who):
    if style == 'grin':
        P.path('M-8.5 8Q0 20 8.5 8Q0 11 -8.5 8Z', '#3A1E22', kind='dark')
        P.ell(0, 13.6, 3.3, 3, '#EE8FA6', kind='shape')
    elif style == 'w':
        P.ell(2.6, 12.8, 2, 2.5, '#EE8FA6')
        P.line('M-6 10q3 3 6 0q3 3 6 0', '#3A1E22', 1.8)
    elif style == 'smile':
        P.line('M%s %s q4 %s 8 0' % (f(-4), f(y + 1.2), f(3.4)), '#3A1E22', 1.6)
    elif style == 'frown':
        P.line('M-4 %s q4 -3 8 0' % f(y + 3.6), '#3A1E22', 1.6)
    elif style == 'o':
        P.ell(0, y + 2.6, 2.4, 3, '#3A1E22', kind='dark')
    elif style == 'blow':
        P.ell(0, y + 2.4, 1.8, 1.8, '#3A1E22', kind='dark')
    elif style == 'flat':
        P.line('M-3.5 %s l7 0' % f(y + 2.2), '#3A1E22', 1.6)
    elif style == 'yell':
        P.path('M-6.5 %sQ0 %s 6.5 %sQ0 %s -6.5 %sZ' % (f(y), f(y + 12), f(y), f(y + 2), f(y)), '#3A1E22', kind='dark')
        P.ell(0, y + 7.5, 3, 2.2, '#EE8FA6')


# ---------------------------------------------------------------- Tidbit and Sugarfoot, side (from pups.js)
LOOKS = {
    'sugarfoot': dict(build='stocky', ear='drop', legUp='#A45C2E', legLow='#B97847', paw='#F1EADF', nails=True, tan='#C9965F', chest='white', muzzle='cream', collar=False, tail='plume'),
    'tidbit': dict(build='lean', ear='fold', legUp='#262220', legLow='#C98A4F', paw='#D99E62', nails=False, tan='#C4834A', chest='tan', muzzle='rottie', collar=True, tail='short'),
}


def _darken(c, k):
    r, g, b = _hex(c)
    return '#%02x%02x%02x' % tuple(int(v * (1 - k)) for v in (r, g, b))


def pup_side(P, who, x, y, s, pose='stand', expr='happy', ph=0.0, wag=0.0, flip=False, tilt=0, carry=None, mouth_=None):
    """pups.js drawPup as SVG. Origin at the paws, facing right (flip faces left). pose: 'stand', 'run', 'walk',
    'sit', 'lie', 'sleep'. About 55 units tall standing. carry: a function(P) drawn at the mouth."""
    L = LOOKS[who]
    TAN = L['tan']
    if mouth_ is None:
        mouth_ = 'smile' if pose == 'sleep' or expr in ('calm', 'sleep') else 'grin'
    lean = L['build'] == 'lean'
    LL, BRX, BRY, BY = (15, 18.5, 8.8, -21) if lean else (12.5, 18, 10.2, -18.5)
    lie = pose in ('lie', 'sleep')
    sit = pose == 'sit'
    moving = pose in ('run', 'walk')
    P.at(x, y, s, flip)

    def leg(x0, y0, ang, ln, back=False):
        P.open('translate(%s %s) rotate(%s)' % (f(x0), f(y0), f(math.degrees(ang))))
        up = ln * 0.5
        dk = (lambda c: _darken(c, 0.2)) if back and P.mode == 'color' else (lambda c: c)
        P.rect(-2.8, -2, 5.6, up + 3, dk(L['legUp']), r=2.8)
        P.rect(-2.5, up, 5, ln - up, dk(L['legLow']), r=2.5)
        P.ell(1, ln, 3.9, 2.5, dk(L['paw']))
        P.close()

    # tail
    tlen = 15 if L['tail'] == 'plume' else 10
    tx, ty = (-18, -9) if lie else (-16, -6) if sit else (-16, BY - 2)
    P.open('translate(%s %s) rotate(%s)' % (f(tx), f(ty), f(math.degrees(-0.9 + wag))))
    P.thick('M0 0Q-6 %s -5 %s' % (f(-tlen * 0.45), f(-tlen)), BLACK, 5.5 if L['tail'] == 'plume' else 4.2)
    P.line('M1 1Q-4 %s -3.6 %s' % (f(-tlen * 0.35), f(-tlen * 0.75)), TAN, 1.5, kind='detail')
    P.close()
    a, b = math.sin(ph) * 0.7, math.sin(ph + math.pi) * 0.7
    if pose == 'walk':
        a, b = a * 0.6, b * 0.6
    if moving:
        leg(-10, BY + 5, b * 0.8, LL, True)
        leg(10, BY + 5, a * 0.8, LL, True)
    elif pose == 'stand':
        leg(-10, BY + 5, 0.08, LL, True)
        leg(10, BY + 5, -0.06, LL, True)
    elif sit:
        leg(9, -16, 0.05, LL + 2, True)
    body_rot = -0.42 if sit else 0
    P.open('rotate(%s)' % f(math.degrees(body_rot)))
    if lie:
        P.ell(-2, -9, 19, 8.5, BLACK)
        P.ell(-12, -4, 7, 4, L['legLow'])
        P.ell(18, -2.5, 8, 2.8, L['legLow'])
        P.ell(26, -2.5, 3.8, 2.7, L['paw'])
        P.ell(23, -0.3, 3.8, 2.5, L['paw'])
        if L['chest'] == 'white':
            P.ell(12.5, -7, 1.4, 2.6, '#F2ECE3')
        else:
            P.ell(12, -7, 3.6, 3.4, TAN)
    else:
        P.ell(0, BY, BRX, BRY, BLACK)
        P.ell(12, BY - 5, 7, 8, BLACK, rot=math.degrees(-0.5), kind='flat' if P.mode == 'color' else 'detail')
        if L['chest'] == 'white':
            P.ell(16, BY - 4, 4, 6.5, TAN, rot=math.degrees(-0.45))
            P.ell(15.6, BY + 1.5, 1.5, 3.4, '#F2ECE3', rot=math.degrees(-0.3))
            P.ell(12, BY + 7.5, 4.5, 2.2, TAN)
        else:
            P.ell(14, BY + 0.5, 4.2, 3.4, TAN, rot=math.degrees(-0.3))
            P.ell(15, BY + 5.5, 3.6, 2.8, TAN, rot=math.degrees(-0.2))
        if L['collar']:
            P.thick('M9 %sQ14 %s 18 %s' % (f(BY - 11), f(BY - 3), f(BY - 5)), '#141111' if P.mode == 'color' else '#9a2d3b', 2.8)
            heart(P, 14.6, BY - 6.4, 0.085, '#FAD27A', '#DDA23A')
    P.close()
    if moving:
        leg(-12, BY + 4, a, LL)
        leg(12, BY + 4, b, LL)
    elif pose == 'stand':
        leg(-12, BY + 4, -0.05, LL)
        leg(12, BY + 4, 0.04, LL)
    elif sit:
        leg(12, -17, -0.05, LL + 3)
        P.ell(-9, -6, 8.5, 5.5, BLACK)
        P.ell(-4, -2.5, 5, 2.5, L['legLow'])
        P.ell(-0.5, -1, 4, 2.4, L['paw'])
    # head
    hx, hy = (19, -19) if lie else (18, -38) if sit else (21, BY - 12)
    hr = 0.05 if lie else 0
    if pose == 'sleep':
        hx, hy, hr = 17, -14, 0.25
    P.open('translate(%s %s) rotate(%s)' % (f(hx), f(hy), f(math.degrees(hr) + tilt)))
    R = 11
    if L['ear'] == 'drop':
        P.ell(-4, 2, 4, 6.5, '#1B1817', rot=20)
    P.circ(0, 0, R, BLACK)
    P.ell(8, 2.5, 8.5, 6.2, BLACK, rot=4.6)
    if L['muzzle'] == 'cream':
        P.ell(5, 2.6, 9.4, 7.8, TAN, rot=7)
        P.ell(10.8, 2.6, 6.6, 3.9, TAN, rot=3.4, kind='flat' if P.mode == 'color' else 'detail')
        P.ell(7.5, 8.6, 7, 3.2, TAN, rot=7, kind='flat' if P.mode == 'color' else 'detail')
        if P.mode == 'color':
            P.ell(4.3, -1.8, 3, 2.5, BLACK, rot=-6, kind='flat')
        P.ell(3.4, -5.9, 3.6, 2.1, TAN, rot=-14 if expr not in ('worried', 'sad') else 14)
    else:
        P.ell(8.5, 4.5, 8, 4.8, TAN, rot=5.7)
        P.ell(4, 2.5, 3.8, 3.6, TAN, kind='flat' if P.mode == 'color' else 'detail')
        P.ell(10, 0.6, 7.5, 2.4, BLACK, rot=4.6, kind='flat' if P.mode == 'color' else 'detail')
        P.circ(3.4, -5.6, 2.5, '#D69B5F')
    P.ell(16, 1.4, 2.9, 2.3, '#121010', kind='dark')
    if mouth_ == 'grin':
        P.path('M15 4.6Q11 10.5 6 6Q11 7.6 15 4.6Z', '#3A1E22', kind='dark')
        P.ell(10.5, 8.6, 2.5, 3.2, '#EE8FA6', rot=11)
    elif mouth_ == 'smile':
        P.line('M14.5 5.2Q11 8.6 7 6.4', '#3A1E22', 1.3)
    elif mouth_ == 'frown':
        P.line('M14.5 7.4Q11 4.8 7.5 7.6', '#3A1E22', 1.3)
    elif mouth_ == 'yell':
        P.path('M15.5 4.2Q11 13 5.5 6Q11 8 15.5 4.2Z', '#3A1E22', kind='dark')
    elif mouth_ == 'o':
        P.ell(12.5, 7, 1.8, 2.2, '#3A1E22', kind='dark')
    if carry:
        carry(P)
    if expr in ('calm', 'sleep', 'happy-closed'):
        up = expr == 'happy-closed'
        P.line('M2.2 -1.6Q4.2 %s 6.2 -1.6' % ('-4' if up else '0.6'), '#F2E6D8' if P.mode == 'color' else '#111', 1.2)
    else:
        P.circ(4.2, -1.6, 2.1 * (1.2 if expr == 'surprised' else 1), '#3A2418', kind='dark')
        P.circ(4.9, -2.4, 0.75, '#fff', kind='detail' if P.mode == 'line' else 'flat')
    P.ell(7, 4.5, 2.2, 1.2, '#F7A5B9', kind='detail', op=0.5)
    if L['ear'] == 'drop':
        P.open('translate(-3 -6.5) rotate(%s)' % f(math.degrees(0.35)))
        P.ell(-1.5, 5.5, 4.8, 7.2, BLACK, rot=8.6)
        P.ell(0.2, 1.8, 1.6, 3.2, 'rgba(214,160,150,0.5)', rot=8.6, kind='detail')
        P.close()
    else:
        P.open('translate(-1.5 -8.5) rotate(%s)' % f(math.degrees(0.35)))
        P.path('M-4 -1Q1 -6 6 0Q2 4 -3 3Z', BLACK)
        P.line('M-3 2.6Q2 3.6 5.6 0.4', '#B97A43', 0.9, kind='detail')
        P.close()
    P.close()
    if pose == 'sleep':
        for i, (zx, zy, zs) in enumerate(((30, -32, 4), (36, -40, 5), (43, -50, 6))):
            P.line('M%s %s l%s 0 l%s %s l%s 0' % (f(zx), f(zy), f(zs), f(-zs), f(zs), f(zs)), '#7C86B8', 1.1, kind='fine')
    P.close()


# ---------------------------------------------------------------- Professor Puddles (tools/book/hints.py)
def puddles(P, x, y, s, expr='smile', mouth_=None, pointer=False, flip=False):
    """origin at the bottom of the drop; 64 units tall plus the hat"""
    P.at(x, y, s, flip)
    P.open('translate(-40 -72)')
    if P.mode == 'color':
        P.path('M40 8C33 22 14 36 14 50c0 14 12 22 26 22s26-8 26-22C66 36 47 22 40 8z', '#CFE6FA', stroke='#7FB2E0', k=1.3)
    else:
        P.path('M40 8C33 22 14 36 14 50c0 14 12 22 26 22s26-8 26-22C66 36 47 22 40 8z', '#CFE6FA')
    P.ell(30, 30, 5, 3, '#fff', rot=-25, kind='detail', op=0.6)
    if pointer:
        P.line('M62 52 Q74 46 84 34', '#7FB2E0', 2.6)
        P.line('M84 34 L96 22', '#8A6A4E', 2.2)
    if P.mode == 'line':
        P.circ(31, 46, 6.2, '#fff', k=0.8)
        P.circ(49, 46, 6.2, '#fff', k=0.8)
        P.line('M37.2 46h5.6', '#111')
    else:
        P.circ(31, 46, 6.2, '#fff', stroke='#3A3350', k=0.9, op=None, kind='flat')
        P.circ(49, 46, 6.2, '#fff', stroke='#3A3350', k=0.9, kind='flat')
        P.line('M37.2 46h5.6', '#3A3350', 1.8)
    if expr in ('closed', 'calm'):
        P.line('M28.5 46.5Q31 49 33.5 46.5M46.5 46.5Q49 49 51.5 46.5', '#2B2620', 1.4)
    elif expr == 'happy':
        P.line('M28.5 47.5Q31 44.5 33.5 47.5M46.5 47.5Q49 44.5 51.5 47.5', '#2B2620', 1.4)
    else:
        P.circ(31, 46.5, 2.4, '#2B2620', kind='dark')
        P.circ(49, 46.5, 2.4, '#2B2620', kind='dark')
        P.circ(31.9, 45.6, .8, '#fff', kind='detail')
        P.circ(49.9, 45.6, .8, '#fff', kind='detail')
    m = mouth_ or ('o' if expr == 'o' else 'smile')
    if m == 'o':
        P.ell(40, 58, 3, 3.6, '#2B2620', kind='dark')
    elif m == 'open':
        P.path('M34.5 55.5Q40 64 45.5 55.5Z', '#2B2620', kind='dark')
    else:
        P.line('M35 56 Q40 60.5 45 56', '#2B2620', 2.2)
    P.ell(23, 55, 3.6, 2.2, '#F2A3B6', kind='detail', op=0.85)
    P.ell(57, 55, 3.6, 2.2, '#F2A3B6', kind='detail', op=0.85)
    P.open('translate(-9 15) rotate(-20 40 10) scale(.82)')
    P.path('M18 10 L40 1 L62 10 L40 19 Z', '#3A3350')
    P.path('M29 14.5v6c3 3 19 3 22 0v-6l-11 4.5z', '#4A4266')
    P.line('M60 10 v11', '#F4D26B', 1.6)
    P.circ(60, 22.5, 2.3, '#F4D26B')
    P.close()
    P.close()
    P.close()


# ---------------------------------------------------------------- the four clouds of Static (arcade.js)
CLOUDS = {
    'grumble': dict(col='#9FA8C9', name='Grumble'),
    'fuzz': dict(col='#C9A8E0', name='Fuzz'),
    'mumble': dict(col='#F2B6A0', name='Mumble'),
    'drift': dict(col='#A8D8C8', name='Drift'),
}
CLOUD_D = 'M-10 8L-11.5 -2A6.5 6.5 0 0 1 -7.78 -7.88A8 8 0 0 1 7.78 -7.88A6.5 6.5 0 0 1 11.5 -2L10 8Q6.7 12 3.4 8Q0.1 12 -3.2 8Q-6.5 12 -9.8 8Z'


def static_cloud(P, who, x, y, s, mood=None, fizz=True, friendly=False, flip=False, small=False):
    """origin at the cloud's middle; 24 units wide. mood: 'grumpy' (Grumble), 'prickly' (Fuzz), 'shy' (Mumble),
    'drifty' (Drift), 'happy' (after), 'surprised'"""
    c = CLOUDS[who]
    mood = mood or ('happy' if friendly else {'grumble': 'grumpy', 'fuzz': 'prickly', 'mumble': 'shy', 'drift': 'drifty'}[who])
    P.at(x, y, s, flip)
    if fizz and not friendly and P.mode != 'line':
        for (zx, zy, zr) in ((-15, -9, 0), (15, -10, 1), (-14, 7, 2), (15, 6, 3)):
            P.line('M%s %s l2 -2.4 l1 2.6 l2 -2.4' % (f(zx - 2.5), f(zy)), '#C9A23A' if P.mode == 'color' else '#555', 0.9, kind='detail')
    elif fizz and not friendly and P.mode == 'line':
        for (zx, zy) in ((-16, -9), (16, -10)):
            P.line('M%s %s l2 -2.4 l1 2.6 l2 -2.4' % (f(zx - 2.5), f(zy)), '#111', kind='fine')
    if who == 'fuzz' and not friendly and P.mode != 'line':
        P.path(CLOUD_D, c['col'], kind='shape', stroke=('#9C7BC2' if P.mode == 'color' else None), k=1.6, extra=' stroke-dasharray="1.2 1.1"')
    else:
        P.path(CLOUD_D, c['col'])
    P.ell(-3, -7, 3, 1.8, '#fff', kind='detail', op=0.35)
    if mood == 'grumpy':
        P.line('M-6 -6.2 L-1.6 -4.4 M6 -6.2 L1.6 -4.4', '#2A2540', 1.1)
        P.circ(-3.4, -2.6, 1.6, '#2A2540', kind='dark')
        P.circ(3.4, -2.6, 1.6, '#2A2540', kind='dark')
        P.line('M-3 4.4 Q0 1.8 3 4.4', '#2A2540', 1.2)
    elif mood == 'prickly':
        P.circ(-3.4, -2.8, 1.7, '#2A2540', kind='dark')
        P.circ(3.4, -2.8, 1.7, '#2A2540', kind='dark')
        P.line('M-4 3.6 l1.6 -1.4 l1.6 1.4 l1.6 -1.4 l1.6 1.4 l1.6 -1.4', '#2A2540', 1.0)
    elif mood == 'shy':
        P.circ(-3.2, -2, 1.5, '#2A2540', kind='dark')
        P.circ(3.6, -2, 1.5, '#2A2540', kind='dark')
        P.line('M-1.4 3.4 q1.4 1 2.8 0', '#2A2540', 1.0)
        P.ell(-6.6, 1.5, 2.2, 1.2, '#E77C8E', kind='detail', op=0.55)
        P.ell(7.2, 1.5, 2.2, 1.2, '#E77C8E', kind='detail', op=0.55)
    elif mood == 'drifty':
        P.line('M-5 -2.4 q1.6 1.2 3.2 0 M1.8 -2.4 q1.6 1.2 3.2 0', '#2A2540', 1.0)
        P.line('M-2 3.6 q2 -1 4 0', '#2A2540', 1.0)
        if P.mode != 'line':
            P.line('M14 -2 q4 -2 8 0 M14 3 q5 -2 9 0', '#7FBFAE', 0.9, kind='detail')
    elif mood == 'surprised':
        P.circ(-3.4, -2.8, 1.9, '#2A2540', kind='dark')
        P.circ(3.4, -2.8, 1.9, '#2A2540', kind='dark')
        P.ell(0, 3.4, 1.5, 1.9, '#2A2540', kind='dark')
    else:  # happy
        P.line('M-5 -2 q1.6 -2 3.2 0 M1.8 -2 q1.6 -2 3.2 0', '#2A2540', 1.0)
        P.line('M-3 2.4 Q0 5.6 3 2.4', '#2A2540', 1.1)
        P.ell(-6.6, 1.5, 2, 1.1, '#E77C8E', kind='detail', op=0.5)
        P.ell(6.6, 1.5, 2, 1.1, '#E77C8E', kind='detail', op=0.5)
    P.close()


# ---------------------------------------------------------------- the Frequency Buddies (buddies-player.js GDRAW)
def ollie(P, x, y, s, flip=False, branch=True, expr='open', droop=False, wing_up=False):
    P.at(x, y, s, flip)
    if branch:
        P.thick('M-30 2 L30 4', '#7A5638', 4)
    P.ell(0, -20, 16, 20, '#8A6A4E')
    P.ell(0, -14, 10, 13, '#D9C3A2')
    if P.mode != 'line':
        for (fx, fy) in ((-4, -18), (4, -18), (0, -12), (-4, -8), (4, -8)):
            P.line('M%s %s q2 2 4 0' % (f(fx - 2), f(fy)), '#B79E7C', 0.7, kind='detail')
    P.path('M-14 -34L-10 -46L-4 -36Z', '#8A6A4E')
    P.path('M14 -34L10 -46L4 -36Z', '#8A6A4E')
    P.circ(-6.5, -30, 7, '#F2E6CF')
    P.circ(6.5, -30, 7, '#F2E6CF')
    st = 'happy' if expr == 'happy' else 'closed' if expr == 'closed' else 'open'
    eye(P, -6.5, -30, 4.5, st)
    eye(P, 6.5, -30, 4.5, st)
    if expr == 'sad':
        P.line('M-10 -37 L-4 -35.5 M10 -37 L4 -35.5', '#5A4030', 1.0)
    P.path('M-2.5 -25L2.5 -25L0 -20Z', '#E8A93F')
    rw = -40 if wing_up else 0
    P.ell(-15, -16 + (4 if droop else 0), 5, 12, '#735538', rot=12 + (20 if droop else 0))
    P.ell(15, -16 + (4 if droop else 0), 5, 12, '#735538', rot=-12 - (20 if droop else 0) + rw)
    P.line('M-4 0L-4 4M4 0L4 4', '#E8A93F', 2)
    P.close()


def dot_snail(P, x, y, s, flip=False, expr='open'):
    P.at(x, y, s, flip)
    P.ell(2, -5, 22, 5.5, '#B9C79A')
    P.line('M16 -9L19 -22M20 -8L25 -20', '#9DAE7C', 2)
    eye(P, 19, -23, 2.6, 'open' if expr != 'happy' else 'happy')
    eye(P, 25, -21, 2.6, 'open' if expr != 'happy' else 'happy')
    P.circ(-4, -17, 13, '#E7A76B')
    pts = []
    a = 0.0
    while a < 12:
        r = 11 - a * 0.85
        if r < 0.5:
            break
        pts.append('%s %s' % (f(-4 + math.cos(a) * r), f(-17 + math.sin(a) * r)))
        a += 0.3
    P.line('M' + ' L'.join(pts), '#B86B3B', 2)
    mouth(P, 21, -7, 4, 'smile')
    P.close()


def hopper(P, x, y, s, flip=False, expr='open', apple_hat=False):
    P.at(x, y, s, flip)
    P.ell(0, -9, 14, 10, '#6FB36A')
    P.ell(2, -6, 9, 6, '#CDE7A8')
    P.circ(-6, -19, 5.5, '#6FB36A')
    P.circ(7, -19, 5.5, '#6FB36A')
    eye(P, -6, -20, 3.4, 'happy' if expr == 'happy' else 'open')
    eye(P, 7, -20, 3.4, 'happy' if expr == 'happy' else 'open')
    mouth(P, 1, -12, 12, 'smile', '#2E5A2E')
    P.ell(-12, -1, 6, 2.5, '#5CA058')
    P.ell(12, -1, 6, 2.5, '#5CA058')
    if apple_hat:
        apple(P, 0, -27, 0.9)
    P.close()


def nutmeg(P, x, y, s, flip=False, holding=None, expr='open'):
    P.at(x, y, s, flip)
    P.path('M-6 -4C-30 -2 -30 -44 -12 -44C-2 -44 -8 -30 -14 -26C-18 -18 -12 -8 -6 -4Z', '#B5652F')
    if P.mode != 'line':
        P.line('M-12 -40C-20 -38 -24 -22 -12 -10', '#9A5226', 0.9, kind='detail')
    P.ell(0, -12, 9, 12, '#C8733A')
    P.ell(2, -10, 5, 8, '#F0D2A8')
    P.circ(4, -27, 8, '#C8733A')
    P.path('M-1 -33L1 -41L4 -34Z', '#C8733A')
    eye(P, 7, -29, 2.4, 'happy' if expr == 'happy' else 'open')
    P.circ(12, -25, 1.4, '#3A2418', kind='dark')
    mouth(P, 9.5, -22, 4, 'smile')
    if holding:
        holding(P, 9, -14)
    P.ell(6, -14, 3, 2, '#B5652F')
    P.ell(-3, 0, 5, 2.2, '#B5652F')
    P.ell(6, 0, 5, 2.2, '#B5652F')
    P.close()


def lumi(P, x, y, s, flip=False, lantern=True, glow=False, holding=None):
    P.at(x, y, s, flip)
    P.open('scale(1.35)', 1.35)
    P.open('translate(-12 -14) rotate(-29)')
    P.ell(-10, -10, 9, 20, '#C8613A', rot=17)
    for kk in range(3):
        P.ell(-10 + kk * 1.6, -22 + kk * 9, 8.6, 2.4, '#8E3F26', rot=17, kind='flat' if P.mode != 'line' else 'shape')
    P.close()
    P.ell(-6, -2, 4.5, 2.4, '#4A2A22')
    P.ell(6, -2, 4.5, 2.4, '#4A2A22')
    P.ell(0, -15, 13, 14, '#D9773F')
    P.ell(2, -12, 7, 8, '#4A2A22' if P.mode != 'line' else '#fff')
    P.ell(1, -26, 12, 3.6, '#D65A6E')
    P.path('M-6 -25Q-10 -18 -8 -12L-3 -13Q-4 -19 -1 -24Z', '#D65A6E')
    for ex in (-9, 9):
        P.circ(ex, -45, 6, '#D9773F')
        P.circ(ex, -45, 3.4, '#FFF1DE')
    P.circ(0, -36, 12.5, '#D9773F')
    P.line('M-1 -48Q3 -55 6 -51Q7 -48 4 -48', '#C8613A', 2.2)
    P.ell(3, -31, 7.5, 5.5, '#FFF1DE')
    P.ell(-6, -42, 3, 1.6, '#FFF1DE', rot=-17)
    P.ell(8, -42, 3, 1.6, '#FFF1DE', rot=17)
    eye(P, -3.5, -37, 2.6)
    eye(P, 7, -37, 2.6)
    P.circ(7.5, -32.5, 1.7, '#3A2418', kind='dark')
    mouth(P, 5, -28.5, 4, 'smile')
    P.ell(-6, -31, 2.6, 1.5, 'rgba(242,140,150,.7)', kind='detail')
    P.ell(12, -31, 2.2, 1.4, 'rgba(242,140,150,.7)', kind='detail')
    if holding:
        holding(P, 14, -20)
    elif lantern:
        P.open('translate(14 -22)')
        P.line('M-4 2L2 -2', '#4A2A22', 3)
        P.line('M2 -2L2 4', '#5A4A3A', 1)
        if glow and P.mode == 'color':
            gid = P.id('lg')
            P.raw('<defs><radialGradient id="%s"><stop offset="0" stop-color="#FFD68C" stop-opacity=".75"/><stop offset="1" stop-color="#FFD68C" stop-opacity="0"/></radialGradient></defs>' % gid)
            P.raw('<circle cx="2" cy="12" r="26" fill="url(#%s)"/>' % gid)
        P.rect(-3, 4, 10, 13, '#FFD98A', r=3)
        P.rect(-4, 3, 12, 2.4, '#5A4A3A', r=1)
        P.rect(-4, 16, 12, 2.4, '#5A4A3A', r=1)
        P.rect(-0.5, 7, 5, 7, 'rgba(255,248,220,.9)', r=2, kind='detail')
        P.close()
    P.close()
    P.close()


def beep(P, x, y, s, flip=False, arm_up=False):
    P.at(x, y, s, flip)
    P.line('M-14 -24L-20 -14', '#7F97AA', 3, kind='thick' if P.mode != 'line' else 'line')
    if arm_up:
        P.line('M14 -24L22 -36', '#7F97AA', 3, kind='thick' if P.mode != 'line' else 'line')
    else:
        P.line('M14 -24L20 -14', '#7F97AA', 3, kind='thick' if P.mode != 'line' else 'line')
    P.circ(-8, -4, 5, '#4B4A55')
    P.circ(8, -4, 5, '#4B4A55')
    P.circ(-8, -4, 1.6, '#9FB6C9')
    P.circ(8, -4, 1.6, '#9FB6C9')
    P.rect(-14, -30, 28, 24, '#9FB6C9', r=5)
    P.rect(-11, -26, 22, 10, '#E9F2F8', r=3)
    P.circ(-6, -21, 2, '#E4566E')
    P.circ(0, -21, 2, '#F7DC6F')
    P.circ(6, -21, 2, '#7FE3C4')
    P.rect(-12, -52, 24, 20, '#B8CAD8', r=5)
    P.rect(-9, -48, 18, 12, '#23303B' if P.mode != 'line' else '#fff', r=3)
    if P.mode == 'line':
        P.circ(-4, -43, 2.2, '#111', kind='dark')
        P.circ(4, -43, 2.2, '#111', kind='dark')
        P.line('M-3 -39.5 q3 2 6 0', '#111', kind='fine')
    else:
        P.circ(-4, -43, 2.2, '#7FE3C4', kind='flat')
        P.circ(4, -43, 2.2, '#7FE3C4', kind='flat')
        P.line('M-3 -39.5 q3 2 6 0', '#7FE3C4', 1.4)
    P.line('M0 -52L0 -60', '#4B4A55', 1.5)
    P.circ(0, -61, 2.4, '#F7DC6F')
    P.close()


def duckling(P, x, y, s, flip=False, carry=None, expr='open'):
    P.at(x, y, s, flip)
    P.ell(0, -8, 9, 7, '#F7D54A')
    P.circ(6, -17, 6, '#F9DC5E')
    eye(P, 8, -18.5, 1.5, 'dot' if expr != 'happy' else 'happy')
    P.path('M11 -17L16 -16L11 -14Z', '#F29A3A')
    P.ell(-3, -8, 5, 3, '#EEC53C', rot=-17)
    P.line('M-2 -1 l0 2.5 M2 -1 l0 2.5', '#F29A3A', 1.4)
    if carry:
        carry(P)
    P.close()


def ducklings(P, x, y, s, flip=False, carry=None):
    P.at(x, y, s, flip)
    for i in range(3):
        duckling(P, -26 + i * 22, 0, 1.1 if i == 1 else 0.9, carry=carry)
    P.close()


def moon(P, x, y, s, expr='calm', glow=True):
    P.at(x, y, s)
    if glow and P.mode == 'color':
        gid = P.id('mg')
        P.raw('<defs><radialGradient id="%s"><stop offset=".35" stop-color="#FFF8D2" stop-opacity=".4"/><stop offset="1" stop-color="#FFF8D2" stop-opacity="0"/></radialGradient></defs>' % gid)
        P.raw('<circle r="70" fill="url(#%s)"/>' % gid)
    P.circ(0, 0, 30, '#FBF3D5')
    P.circ(-12, -10, 5, 'rgba(210,200,160,.35)', kind='detail' if P.mode == 'line' else 'flat')
    P.circ(12, 12, 4, 'rgba(210,200,160,.35)', kind='detail' if P.mode == 'line' else 'flat')
    P.circ(14, -14, 3, 'rgba(210,200,160,.3)', kind='detail' if P.mode == 'line' else 'flat')
    if P.mode == 'line':
        P.circ(-12, -10, 5, '#fff', k=0.7)
        P.circ(14, -14, 3, '#fff', k=0.7)
    if expr == 'open':
        eye(P, -9, -2, 3, 'dot')
        eye(P, 9, -2, 3, 'dot')
    else:
        P.line('M-13 -2Q-9 -6 -5 -2M5 -2Q9 -6 13 -2', '#6B5A48', 1.5)
    P.ell(-16, 6, 4, 2.2, 'rgba(242,163,182,.6)', kind='detail')
    P.ell(16, 6, 4, 2.2, 'rgba(242,163,182,.6)', kind='detail')
    mouth(P, 0, 10, 8, 'smile', '#8A5A48')
    P.close()


def butterfly(P, x, y, s, open_=1.0, flip=False, rot=0):
    P.at(x, y, s, flip, rot)
    fl = open_
    P.ell(-6 * fl, -10, 9 * fl, 7, '#B79CEB', rot=-29)
    P.ell(-5 * fl, -2, 6 * fl, 5, '#B79CEB', rot=23)
    P.ell(6 * fl, -10, 9 * fl, 7, '#F7A8C2', rot=29)
    P.ell(5 * fl, -2, 6 * fl, 5, '#F7A8C2', rot=-23)
    P.ell(0, -6, 1.8, 7, '#4A3F63')
    P.circ(0, -14, 2.4, '#4A3F63')
    P.line('M0 -15L-3 -21M0 -15L3 -21', '#4A3F63', 0.8)
    P.close()


def bunny(P, x, y, s, flip=False, happy=False, ear_flop=0.0):
    P.at(x, y, s, flip)
    P.ell(-4, -30, 3.2, 10, '#F4F1FA', rot=-9)
    P.ell(-4, -30, 1.4, 7, '#F7C9D4', rot=-9, kind='detail' if P.mode == 'line' else 'flat')
    P.open('translate(4 -21) rotate(%s)' % f(9 + math.degrees(ear_flop)))
    P.ell(0, -9, 3.2, 10, '#F4F1FA')
    P.ell(0, -9, 1.4, 7, '#F7C9D4', kind='detail' if P.mode == 'line' else 'flat')
    P.close()
    P.circ(-10, -8, 3.4, '#F4F1FA')
    P.ell(0, -7, 11, 8, '#F4F1FA')
    P.circ(0, -17, 8, '#F4F1FA')
    if happy:
        P.line('M-4.6 -17.5Q-3 -19.5 -1.4 -17.5M1.4 -17.5Q3 -19.5 4.6 -17.5', '#2B2620', 1.2)
    else:
        eye(P, -3, -18, 1.5, 'dot')
        eye(P, 3, -18, 1.5, 'dot')
    P.circ(0, -15, 1.2, '#EE8FA6', kind='dark')
    P.line('M-1.6 -13 q1.6 1.2 3.2 0', '#2B2620', 0.8)
    P.ell(-5.5, -14.5, 1.8, 1, '#F4A2B8', kind='detail')
    P.ell(5.5, -14.5, 1.8, 1, '#F4A2B8', kind='detail')
    P.ell(-5, 0, 3.6, 1.8, '#E8E3F2')
    P.ell(5, 0, 3.6, 1.8, '#E8E3F2')
    P.close()


def hedgehog(P, x, y, s, flip=False, burrow=False, expr='open'):
    """a round little hedgehog, looking right (night-garden.js has it peeking from a burrow)"""
    P.at(x, y, s, flip)
    if burrow:
        P.path('M-26 1A26 9 0 0 1 26 1Z', '#7A6A55')
    spikes = []
    n = 13
    for i in range(n + 1):
        a = math.pi + i * math.pi / n
        r = 17 if i % 2 == 0 else 22
        spikes.append('%s %s' % (f(-3 + math.cos(a) * r * 1.05), f(-4 + math.sin(a) * r * 0.95)))
    P.path('M-21 -2 L' + ' L'.join(spikes) + ' L12 -2Z', '#8A6A4E')
    if P.mode != 'line':
        for i in range(6):
            a = math.pi + (i + 0.5) * math.pi / 6
            P.line('M%s %s l%s %s' % (f(-3 + math.cos(a) * 9), f(-4 + math.sin(a) * 9), f(math.cos(a) * 5), f(math.sin(a) * 5)), '#6E523A', 0.8, kind='detail')
    P.path('M4 -16C12 -18 20 -10 22 -4C23 -1 20 1 16 1L2 1C0 -6 0 -13 4 -16Z', '#F0DCC0')
    P.circ(22.5, -3.6, 1.8, '#2B2620', kind='dark')
    eye(P, 12, -9, 1.7, 'happy' if expr == 'happy' else 'dot')
    P.ell(14, -4.6, 1.8, 1, '#F4A2B8', kind='detail')
    P.ell(-8, 1, 3.6, 1.6, '#6E523A')
    P.ell(6, 1, 3.6, 1.6, '#6E523A')
    P.close()


def firefly(P, x, y, s=1.0):
    P.at(x, y, s)
    if P.mode == 'color':
        gid = 'ffglow'
        P.raw('<circle r="9" fill="#FFF3A0" opacity=".28"/><circle r="5" fill="#FFF3A0" opacity=".45"/>')
        P.circ(0, 0, 2.6, '#FFE873', kind='flat')
    else:
        P.ell(-2.4, -2.2, 2.2, 1.3, '#fff', rot=-30, k=0.7)
        P.ell(2.4, -2.2, 2.2, 1.3, '#fff', rot=30, k=0.7)
        P.circ(0, 0, 2.4, '#fff', k=0.8)
        if P.mode == 'line':
            for a in range(0, 360, 60):
                rr = math.radians(a)
                P.line('M%s %s L%s %s' % (f(math.cos(rr) * 4.5), f(math.sin(rr) * 4.5), f(math.cos(rr) * 7), f(math.sin(rr) * 7)), '#111', kind='fine')
    P.close()


# ---------------------------------------------------------------- Peach and Lilac (logo-mark.svg)
def peach_lilac(P, x, y, s, wink=False, heart_=True, only=None):
    """the two friends side by side sharing one heart; origin at the bottom middle; about 110 units wide, 85 tall"""
    P.at(x, y, s)
    P.open('translate(-65 -110)')
    if only in (None, 'peach'):
        P.line('M46 32c-1-7 5-12 10-7', '#E0957B', 3.2)
        if P.mode == 'color':
            P.path('M46 31C67 30 82 47 82 70C82 94 67 109 45 109C22 109 7 95 8 71C9 48 25 32 46 31Z', '#FCD5C2', stroke='#E0957B', k=1.6)
        else:
            P.path('M46 31C67 30 82 47 82 70C82 94 67 109 45 109C22 109 7 95 8 71C9 48 25 32 46 31Z', '#FCD5C2')
        P.ell(30, 47, 8, 4.5, '#fff', rot=-35, kind='detail', op=0.75)
        if wink:
            P.line('M28 66q5-6 10 0M45 64l10 3', INK, 3)
        else:
            P.line('M28 66q5-6 10 0M45 66q5-6 10 0', INK, 3)
        P.line('M37 73q4.5 5 9 0', INK, 3)
        P.ell(25, 74, 4.8, 3.1, '#F4A2B8', kind='detail')
        P.ell(58, 74, 4.8, 3.1, '#F4A2B8', kind='detail')
    if only in (None, 'lilac'):
        if P.mode == 'color':
            P.path('M77 50C89 45 110 45 117 53C123 61 123 90 118 100C112 110 81 111 73 103C65 95 65 56 77 50Z', '#DCCEF4', stroke='#9C83D0', k=1.6)
        else:
            P.path('M77 50C89 45 110 45 117 53C123 61 123 90 118 100C112 110 81 111 73 103C65 95 65 56 77 50Z', '#DCCEF4')
        P.ell(85, 56, 6.5, 3.6, '#fff', rot=-20, kind='detail', op=0.75)
        P.line('M85 71q5-6 10 0M101 71q5-6 10 0M94 78q4.5 5 9 0', INK, 3)
        P.ell(83, 80, 4.8, 3.1, '#F4A2B8', kind='detail')
        P.ell(114, 80, 4.4, 3.1, '#F4A2B8', kind='detail')
    if heart_ and only is None:
        if P.mode == 'color':
            P.path('M66 91C60 82 46 86 49 97C51 105 66 113 66 113S81 105 83 97C86 86 72 82 66 91Z', '#F08DA8', stroke='#D2668A', k=1.5)
        else:
            P.path('M66 91C60 82 46 86 49 97C51 105 66 113 66 113S81 105 83 97C86 86 72 82 66 91Z', '#F08DA8')
        P.ell(57, 92, 3.2, 2, '#fff', rot=-30, kind='detail', op=0.7)
        if P.mode == 'color':
            P.ell(51, 100, 6.2, 4.6, '#F6B99F', rot=-30, stroke='#E0957B', k=1.2)
            P.ell(81, 100, 6.2, 4.6, '#C7B2EE', rot=30, stroke='#9C83D0', k=1.2)
        else:
            P.ell(51, 100, 6.2, 4.6, '#F6B99F', rot=-30)
            P.ell(81, 100, 6.2, 4.6, '#C7B2EE', rot=30)
    P.close()
    P.close()


# ---------------------------------------------------------------- props
def apple(P, x, y, s=1.0, bite=False):
    P.at(x, y, s)
    P.path('M0 -6C-3 -9 -10 -8 -10 -1C-10 6 -5 10 0 9C5 10 10 6 10 -1C10 -8 3 -9 0 -6Z', '#E25C4F')
    P.line('M0 -6 Q0.5 -9 2 -11', '#6B4A2E', 1.3)
    P.path('M2 -9 Q7 -13 10 -9 Q6 -6 2 -9Z', '#6FB36A')
    P.ell(-5, -2, 2, 3, '#fff', rot=20, kind='detail', op=0.45)
    P.close()


def basket(P, x, y, s=1.0, full=True, lid=False):
    """a wicker picnic basket, origin at the bottom middle, 50 wide"""
    P.at(x, y, s)
    if full:
        P.circ(-10, -26, 7, '#E25C4F')
        P.circ(0, -28, 7, '#F2C14E')
        P.path('M4 -24 L18 -34 L20 -22Z', '#F5E6C8')
        P.ell(12, -24, 9, 4, '#F08DA8', rot=-15)
    P.thick('M-18 -24 Q0 -52 18 -24', '#A9744A', 3.4)
    P.path('M-25 -24 L25 -24 L20 0 L-20 0Z', '#D9A066')
    if P.mode != 'line':
        for i in range(-3, 4):
            P.line('M%s -24 L%s 0' % (f(i * 6.8), f(i * 5.6)), '#A9744A', 0.9, kind='detail')
        for yy in (-17, -10, -4):
            P.line('M%s %s L%s %s' % (f(-23.5 + (yy + 24) * 0.2), f(yy), f(23.5 - (yy + 24) * 0.2), f(yy)), '#A9744A', 0.9, kind='detail')
    else:
        for yy in (-16, -8):
            P.line('M%s %s L%s %s' % (f(-23 + (yy + 24) * 0.2), f(yy), f(23 - (yy + 24) * 0.2), f(yy)), '#111', kind='fine')
    P.rect(-27, -27, 54, 5, '#C08A55', r=2.5)
    P.close()


def blanket(P, x, y, w, h, s=1.0, col='#F08DA8'):
    """a checked picnic blanket as a flat parallelogram on the ground, origin at its center"""
    P.at(x, y, s)
    k = h * 0.35
    d = 'M%s %s L%s %s L%s %s L%s %sZ' % (f(-w / 2 + k), f(-h / 2), f(w / 2 + k), f(-h / 2), f(w / 2 - k), f(h / 2), f(-w / 2 - k), f(h / 2))
    P.path(d, '#FFF6EE' if P.mode != 'line' else '#fff')
    n = 6
    for i in range(1, n):
        t = i / n
        P.line('M%s %s L%s %s' % (f(-w / 2 + k + t * w), f(-h / 2), f(-w / 2 - k + t * w), f(h / 2)), col, 3.2 if P.mode == 'color' else 1, kind='fine' if P.mode == 'line' else 'line', op=0.6)
    for i in range(1, 4):
        t = i / 4
        yy = -h / 2 + t * h
        P.line('M%s %s L%s %s' % (f(-w / 2 + k - 2 * k * t), f(yy), f(w / 2 + k - 2 * k * t), f(yy)), col, 3.2 if P.mode == 'color' else 1, kind='fine' if P.mode == 'line' else 'line', op=0.6)
    P.close()


def sandwich(P, x, y, s=1.0, rot=0):
    P.at(x, y, s, rot=rot)
    P.path('M-10 6 L10 6 L0 -10Z', '#F5E6C8')
    P.path('M-8 4.5 L8 4.5 L7 6 L-7 6Z', '#8CC66B')
    P.close()


def note_card(P, x, y, s=1.0, rot=-6, text_lines=3):
    P.at(x, y, s, rot=rot)
    P.rect(-16, -11, 32, 22, '#FFFDF5', r=2)
    for i in range(text_lines):
        P.line('M-11 %s l%s 0' % (f(-5 + i * 5), f(22 - i * 4)), '#B7A98F', 1.1, kind='fine')
    heart(P, 11, -9, 0.11)
    P.close()


def sock(P, x, y, s=1.0, rot=0):
    P.at(x, y, s, rot=rot)
    P.path('M-4 -12 L4 -12 L4 2 Q4 7 9 8 Q12 9 11 12 L-1 12 Q-4 12 -4 8Z', '#9FC3E8')
    P.line('M-4 -6 L4 -6 M-4 -1 L4 -1', '#F08DA8', 1.6, kind='fine')
    P.ell(8.5, 10, 3, 2.2, '#F08DA8')
    P.rect(-4.6, -13.5, 9.2, 4, '#F08DA8', r=1.5)
    P.close()


def ball(P, x, y, r=7):
    P.circ(x, y, r, '#F2C14E')
    P.line('M%s %s Q%s %s %s %s' % (f(x - r), f(y), f(x), f(y - r * 0.7), f(x + r), f(y)), '#E0957B', max(r * 0.2, 1))


def cracker(P, x, y, s=1.0, rot=0):
    P.at(x, y, s, rot=rot)
    P.rect(-6, -6, 12, 12, '#E8C07A', r=1.5)
    for (dx, dy) in ((-3, -3), (3, -3), (0, 0), (-3, 3), (3, 3)):
        P.circ(dx, dy, 0.8, '#B98A44', kind='detail' if P.mode == 'line' else 'flat')
    P.close()


def napkin(P, x, y, s=1.0, rot=0):
    P.at(x, y, s, rot=rot)
    P.path('M-6 -5 L6 -5 L7 5 L-7 5Z', '#FFFFFF' if P.mode != 'line' else '#fff')
    P.line('M-6 -2 L6 -2 M-6.4 1.5 L6.4 1.5', '#F08DA8', 1, kind='fine')
    P.close()


# ---------------------------------------------------------------- scenery
def flower(P, x, y, s=1.0, col='#F7A8C2', center='#FAD27A', petals=5, stem=True, rot=0):
    P.at(x, y, s, rot=rot)
    if stem:
        P.line('M0 0 Q2 10 0 22', '#5E9E58', 1.6, kind='line')
        P.path('M0 14 Q6 9 10 12 Q6 16 0 14Z', '#6FB36A', kind='shape')
    for i in range(petals):
        a = i * 360.0 / petals
        P.ell(0, -5.2, 3.6, 5.4, col, rot=a)
    P.circ(0, 0, 3, center)
    P.close()


def daisy(P, x, y, s=1.0, rot=0):
    flower(P, x, y, s, '#FFFFFF', '#FAD27A', 8, rot=rot)


def tulip(P, x, y, s=1.0, col='#E86A7E'):
    P.at(x, y, s)
    P.line('M0 0 Q-1 12 0 24', '#5E9E58', 1.6)
    P.path('M0 10 Q-8 6 -10 0 Q-4 2 0 10Z', '#6FB36A')
    P.path('M-7 -12 L-4 -6 L0 -13 L4 -6 L7 -12 L7 -3 Q0 4 -7 -3Z', col)
    P.close()


def grass(P, x, y, s=1.0, col='#5E9E58'):
    P.at(x, y, s)
    P.line('M-6 0 Q-6 -6 -9 -10 M-2 0 Q-1 -8 -3 -13 M2 0 Q3 -7 6 -11 M6 0 Q7 -4 10 -7', col, 1.4, kind='fine')
    P.close()


def tree(P, x, y, s=1.0, col='#7FBF6A', dark='#5E9E58', fruit=False):
    """a round, bumpy tree, origin at the trunk base, about 125 tall"""
    P.at(x, y, s)
    P.path('M-7 0 L-5 -50 L5 -50 L7 0Z', '#8A6A4E')
    P.line('M0 -46 L-12 -60 M2 -50 L12 -62', '#8A6A4E', 3.2, kind='thick' if P.mode != 'line' else 'line')
    P.path('M-40 -52 A16 16 0 0 1 -44 -80 A20 20 0 0 1 -22 -108 A26 26 0 0 1 22 -110 A20 20 0 0 1 44 -82 '
           'A16 16 0 0 1 40 -52 A22 22 0 0 1 0 -44 A22 22 0 0 1 -40 -52Z', col)
    if P.mode != 'line':
        P.circ(-14, -96, 9, '#ffffff', kind='detail', op=0.16)
        P.path('M-38 -56 A22 22 0 0 0 0 -48 A22 22 0 0 0 38 -56 A30 20 0 0 1 0 -44 A30 20 0 0 1 -38 -56Z', dark, kind='detail', op=0.45)
    else:
        P.line('M-30 -82 q6 -6 12 -2 M10 -98 q6 -6 12 -2 M16 -66 q6 -6 12 -2 M-14 -62 q6 -6 12 -2', '#111', kind='fine')
    if fruit:
        for (fx, fy) in ((-24, -76), (18, -88), (6, -62), (-6, -100), (28, -66)):
            P.circ(fx, fy, 4, '#E25C4F')
    P.close()


def bush(P, x, y, s=1.0, col='#6FB36A'):
    P.at(x, y, s)
    P.path('M-30 0 Q-34 -16 -20 -20 Q-16 -34 0 -30 Q14 -36 20 -22 Q34 -18 30 0Z', col)
    P.close()


def pine(P, x, y, s=1.0, col='#4F8E5A'):
    P.at(x, y, s)
    P.rect(-4, -14, 8, 14, '#7A5638', r=2)
    P.path('M0 -90 L22 -50 L12 -50 L30 -14 L-30 -14 L-12 -50 L-22 -50Z', col)
    P.close()


def sky_cloud(P, x, y, s=1.0, col='#FFFFFF', op=0.95):
    P.at(x, y, s)
    if P.mode == 'line':
        P.path('M-30 6 Q-34 -6 -22 -8 Q-20 -22 -4 -18 Q4 -28 18 -18 Q32 -18 30 -4 Q38 2 30 6Z', '#fff')
    else:
        P.path('M-30 6 Q-34 -6 -22 -8 Q-20 -22 -4 -18 Q4 -28 18 -18 Q32 -18 30 -4 Q38 2 30 6Z', col, kind='bg', op=op)
    P.close()


def star(P, x, y, r, fill='#FBE9A0', kind='flat', rot=0):
    pts = []
    for i in range(10):
        a = math.radians(rot - 90 + i * 36)
        rr = r if i % 2 == 0 else r * 0.45
        pts.append('%s %s' % (f(x + math.cos(a) * rr), f(y + math.sin(a) * rr)))
    P.path('M' + ' L'.join(pts) + 'Z', fill, kind=kind)


def sun(P, x, y, r, face=True):
    if P.mode == 'color':
        P.circ(x, y, r * 1.45, '#FFE9A8', kind='bg', op=0.45)
    P.circ(x, y, r, '#FAD27A', stroke='#F2B84B' if P.mode == 'color' else None, k=1.0, kind='flat' if P.mode == 'color' else 'shape')
    if face:
        P.line('M%s %s q%s %s %s 0 M%s %s q%s %s %s 0' % (f(x - r * 0.45), f(y - r * 0.1), f(r * 0.15), f(-r * 0.2), f(r * 0.3), f(x + r * 0.15), f(y - r * 0.1), f(r * 0.15), f(-r * 0.2), f(r * 0.3)), '#B9782A', r * 0.07)
        P.line('M%s %s Q%s %s %s %s' % (f(x - r * 0.3), f(y + r * 0.25), f(x), f(y + r * 0.5), f(x + r * 0.3), f(y + r * 0.25)), '#B9782A', r * 0.07)
    if P.mode == 'line':
        for i in range(12):
            a = math.radians(i * 30)
            P.line('M%s %s L%s %s' % (f(x + math.cos(a) * r * 1.2), f(y + math.sin(a) * r * 1.2), f(x + math.cos(a) * r * 1.5), f(y + math.sin(a) * r * 1.5)), '#111')


def puddle(P, x, y, rx, ry):
    P.ell(x, y, rx, ry, '#A9D4F0', kind='flat' if P.mode != 'line' else 'shape')
    P.ell(x - rx * 0.3, y - ry * 0.2, rx * 0.3, ry * 0.25, '#fff', kind='detail', op=0.6)


def lily(P, x, y, s=1.0, flower_=True):
    P.at(x, y, s)
    P.path('M0 0 L19.3 -2.1 A20 8 0 1 0 19.3 2.1Z', '#6FB36A')
    if flower_:
        P.open('translate(-2 -3)')
        for a in (-55, 55, -28, 28, 0):
            P.ell(0, -6, 2.8, 6.5, '#F7C9D4', rot=a)
        P.circ(0, -2, 2.4, '#FAD27A')
        P.close()
    P.close()


def stone(P, x, y, rx, ry, col='#B9B2A6'):
    P.ell(x, y, rx, ry, col)
    P.ell(x - rx * 0.3, y - ry * 0.3, rx * 0.35, ry * 0.25, '#fff', kind='detail', op=0.3)


def mushroom(P, x, y, s=1.0, col='#E25C4F'):
    P.at(x, y, s)
    P.rect(-4, -10, 8, 10, '#F5E6C8', r=3)
    P.path('M-12 -9 Q-12 -22 0 -22 Q12 -22 12 -9Z', col)
    for (dx, dy, r) in ((-6, -15, 1.8), (2, -18, 1.5), (6, -12, 1.4)):
        P.circ(dx, dy, r, '#fff')
    P.close()


def fence(P, x0, x1, y, h=30, col='#E9DCC4'):
    n = int((x1 - x0) / 18)
    P.rect(x0, y - h * 0.7, x1 - x0, 4, col, r=2)
    P.rect(x0, y - h * 0.35, x1 - x0, 4, col, r=2)
    for i in range(n + 1):
        xx = x0 + i * (x1 - x0) / max(n, 1)
        P.path('M%s %s L%s %s L%s %s L%s %s L%s %sZ' % (f(xx - 4), f(y), f(xx - 4), f(y - h + 4), f(xx), f(y - h), f(xx + 4), f(y - h + 4), f(xx + 4), f(y)), col)


def house(P, x, y, s=1.0, col='#F6C9A8', roof='#C9615A'):
    """a little round-doored cottage (Puddle Hollow), origin at the bottom middle"""
    P.at(x, y, s)
    P.rect(-40, -50, 80, 50, col, r=3)
    P.path('M-48 -48 L0 -88 L48 -48Z', roof)
    P.path('M-10 0 L-10 -24 A10 10 0 0 1 10 -24 L10 0Z', '#8A6A4E')
    P.circ(6, -12, 1.5, '#FAD27A')
    P.rect(-32, -40, 14, 14, '#CFE6FA', r=2)
    P.rect(18, -40, 14, 14, '#CFE6FA', r=2)
    P.line('M-25 -40 v14 M-32 -33 h14 M25 -40 v14 M18 -33 h14', '#8A6A4E', 1.2, kind='fine')
    P.rect(18, -82, 10, 18, '#B9534D', r=1)
    P.close()


def heart_tag(P, x, y, s):
    heart(P, x, y, s, '#FAD27A', '#DDA23A')


def mandala_flower(P, x, y, r, rings=3, petals=10, seed=0):
    """a big round flower with rings of petals, for the older coloring book"""
    P.at(x, y, 1)
    for k in range(rings, 0, -1):
        rr = r * k / rings
        n = petals + (k - 1) * 4
        pr = rr * 0.5 / (1 + 0.15 * k)
        for i in range(n):
            a = (i + (0.5 if k % 2 else 0)) * 360.0 / n
            P.open('rotate(%s)' % f(a))
            P.path('M0 %s Q%s %s 0 %s Q%s %s 0 %sZ' % (f(-rr + pr * 1.7), f(pr * 0.9), f(-rr + pr), f(-rr), f(-pr * 0.9), f(-rr + pr), f(-rr + pr * 1.7)), '#fff')
            P.close()
    P.circ(0, 0, r * 0.18, '#fff')
    for i in range(8):
        a = math.radians(i * 45)
        P.circ(math.cos(a) * r * 0.09, math.sin(a) * r * 0.09, r * 0.025, '#111', kind='dark')
    P.close()


# ---------------------------------------------------------------- more props (picnic food, candle, signs)
def pie(P, x, y, s=1.0, rot=0, slice_=False):
    P.at(x, y, s, rot=rot)
    P.path('M-14 2 Q-14 -8 0 -8 Q14 -8 14 2 L11 8 L-11 8Z', '#E5B26A')
    P.line('M-8 -2 L-5 4 M0 -4 L0 4 M8 -2 L5 4', '#B97F36', 1.2, kind='fine')
    P.ell(0, -8, 14, 3, '#D9984A')
    P.circ(0, -9, 3, '#C0392B')
    P.close()


def jar(P, x, y, s=1.0, col='#8CC66B', rot=0):
    P.at(x, y, s, rot=rot)
    P.rect(-6, -12, 12, 18, 'rgba(190,225,170,.9)' if P.mode == 'color' else '#fff', r=3)
    P.rect(-6.5, -15, 13, 4, '#F2C14E', r=1.5)
    for (dx, dy) in ((-2, -5), (2, 0), (-1, 2)):
        P.ell(dx, dy, 1.6, 3.2, col, rot=20)
    P.close()


def cheese(P, x, y, s=1.0, rot=0):
    P.at(x, y, s, rot=rot)
    P.path('M-12 6 L12 6 L12 -4 L-12 0Z', '#F5C84C')
    P.path('M-12 0 L12 -4 L8 -8 L-8 -5Z', '#FAE08A')
    for (dx, dy, r) in ((-4, 3, 1.5), (4, 1, 1.2), (7, 4, 1)):
        P.circ(dx, dy, r, '#D9A62E', kind='detail' if P.mode == 'line' else 'flat')
    P.close()


def cupcake(P, x, y, s=1.0, rot=0):
    P.at(x, y, s, rot=rot)
    P.path('M-7 2 L7 2 L5 10 L-5 10Z', '#F2A3B6')
    P.path('M-8 2 Q-9 -6 0 -7 Q9 -6 8 2Z', '#FFF6E8')
    P.circ(0, -9, 2.4, '#C0392B')
    P.close()


def cup(P, x, y, s=1.0, col='#9FC3E8', rot=0):
    P.at(x, y, s, rot=rot)
    P.path('M-5 -6 L5 -6 L4 5 L-4 5Z', col)
    P.line('M5 -3 Q9 -3 8 1 Q7 3 4.5 2', col, 1.4, kind='fine')
    P.close()


def candle(P, x, y, s=1.0, lean=0.0, flame=True):
    """an imaginary birthday candle: a small stick with a flame that leans when you blow"""
    P.at(x, y, s)
    P.rect(-4, -26, 8, 26, '#FFF3C4', r=2)
    P.line('M-4 -18 L4 -14 M-4 -9 L4 -5', '#F08DA8', 1.6, kind='fine')
    P.line('M0 -26 L0 -29', '#6B4A2E', 1.2)
    if flame:
        P.path('M0 -30 Q%s -38 %s -46 Q%s -36 %s -30Z' % (f(5 + lean * 6), f(lean * 12), f(-5 + lean * 3), f(0)), '#F7A53B')
        P.path('M0 -31 Q%s -36 %s -41 Q%s -35 0 -31Z' % (f(2 + lean * 3), f(lean * 6), f(-2)), '#FFE873', kind='flat')
    P.close()


def sign(P, x, y, s=1.0, w=60, h=34):
    P.at(x, y, s)
    P.rect(-2.5, -4, 5, 30, '#8A6A4E', r=1.5)
    P.rect(-w / 2, -h - 4, w, h, '#F7E3B5', r=4)
    P.close()


def speed_lines(P, x, y, n=3, length=60, gap=12, s=1.0):
    P.at(x, y, s)
    for i in range(n):
        yy = (i - (n - 1) / 2.0) * gap
        P.line('M0 %s L%s %s' % (f(yy), f(-length + i * 6), f(yy)), '#B9B2A6' if P.mode == 'color' else '#111', 1.6, kind='fine', cap='round')
    P.close()


def dust(P, x, y, s=1.0):
    P.at(x, y, s)
    for (dx, dy, r) in ((0, 0, 6), (-8, 3, 4.5), (-14, -1, 3.5)):
        P.circ(dx, dy, r, '#EFE6D6' if P.mode == 'color' else '#fff', kind='flat' if P.mode == 'color' else 'shape')
    P.close()


def fizz_marks(P, x, y, r=40, n=8, s=1.0, col='#E9A93A'):
    """little zigzag sparks around something that is revved up"""
    P.at(x, y, s)
    for i in range(n):
        a = math.radians(i * 360.0 / n + 10)
        x0, y0 = math.cos(a) * r, math.sin(a) * r
        x1, y1 = math.cos(a) * (r + 14), math.sin(a) * (r + 14)
        P.line('M%s %s L%s %s' % (f(x0), f(y0), f(x1), f(y1)), col, 2.0, kind='fine', cap='round')
    P.close()


def zz(P, x, y, s=1.0):
    P.at(x, y, s)
    for i, (dx, dy, k) in enumerate(((0, 0, 6), (10, -10, 8), (22, -22, 10))):
        P.line('M%s %s l%s 0 l%s %s l%s 0' % (f(dx), f(dy), f(k), f(-k), f(k), f(k)), '#7C86B8', 1.6, kind='fine')
    P.close()
