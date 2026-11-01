#!/usr/bin/env python3
"""pupline.py: Tidbit and Sugarfoot drawn by hand for coloring (owner, Nov 1 2026: "redraw them new").

Clean side-view line art made for coloring, with the Frequency Buddies look: one smooth outline per pup, and the markings
inside it as their own areas. Tidbit: lean, black mask with a round tan dot over the eye, tan cheek and muzzle, a small ear
that folds forward, tan socks, a collar with a little tag, a short tail. Sugarfoot: stockier, tan face and brow, long soft
drop ear, white chest streak, white toes, a longer, fuller tail, no collar.
Every pose: draw(g, who, pose, expr) into a cute Fig, facing right, paws on y = 0, about 200 units tall.
"""
import math
from cute import blob, curve, ell, circ, Path

K = dict(coat='#2B2523', tan='#C98F55', tan2='#D9A56B', cream='#F3ECE0', pink='#F08DA8', tag='#D5D9E0', collar='#3B3634', nose='#1A1614')


def P(pts, k=1.0):
    return blob(pts, k=k)


# ------------------------------------------------------------------ sitting, facing right
def sit(g, who, expr='happy', paw_up=False, hat=None, scarf=False, coat=False):
    dw = g.ink.dw
    sug = who == 'sugarfoot'
    w = 1.08 if sug else 1.0          # Sugarfoot is the stockier one
    # tail first (behind)
    if sug:
        g.part(P([(-60, -20), (-86, -26), (-108, -44), (-116, -66), (-104, -70), (-92, -52), (-74, -38), (-58, -34)]), c=K['coat'])
        g.line(curve([(-104, -60), (-94, -48), (-80, -40)]), w=dw * 0.7)
    else:
        g.part(P([(-56, -26), (-72, -36), (-82, -54), (-74, -60), (-64, -46), (-52, -38)]), c=K['coat'])
    # far front leg, peeking out behind the near one
    g.part(P([(34, -70), (48, -70), (50, -36), (50, -8), (56, -2), (36, -2), (36, -36)]), c=K['coat'])
    # body: back, haunch, belly and chest in one soft shape
    body = [(-4, -128), (-30, -114), (-52, -88), (-66, -56), (-68, -26), (-58, -6), (-30, 0), (0, 0), (12, -14), (20, -40),
            (32, -70), (44, -96), (46, -116), (28, -132)]
    g.part(P([(x * w, y) for x, y in body]), c=K['coat'])
    # the haunch and the back paw
    g.line(curve([(-16 * w, -80), (-46 * w, -72), (-60 * w, -48), (-54 * w, -22), (-32 * w, -12)]), w=dw * 0.9)
    g.part(P([(-36 * w, -13), (-6, -15), (14, -10), (16, 0), (-38 * w, 0)]), c=K['cream'] if sug else K['tan'], under=False, w=dw)
    if sug:
        g.line(Path().M(2, -9).L(2, 0), w=dw * 0.7)
        g.line(Path().M(9, -9).L(9, 0), w=dw * 0.7)
    # chest marking
    if sug:
        g.part(P([(34, -108), (44, -90), (40, -66), (34, -56), (28, -72), (28, -94)]), c=K['cream'], under=False, w=dw)
    else:
        g.part(P([(24, -110), (44, -104), (44, -82), (34, -68), (24, -84)]), c=K['tan'], under=False, w=dw)
    if coat:   # a little yellow raincoat over the back
        g.part(P([(-4, -128), (-30, -114), (-52, -88), (-66, -56), (-64, -30), (-40, -26), (0, -40), (24, -70), (40, -100), (30, -124)]), c='#FFD84A', under=False, w=dw)
        for yy in (-96, -72):
            g.part(circ(18, yy, 4), c='#8FCBF0', under=False, w=dw * 0.8)
    if paw_up:   # the near front paw lifted, waving
        g.part(P([(14, -84), (36, -88), (62, -94), (80, -96), (84, -84), (64, -76), (40, -62), (18, -60)]), c=K['coat'], under=False, w=dw)
        g.part(P([(74, -98), (90, -100), (98, -90), (92, -78), (76, -80)]), c=K['cream'] if sug else K['tan'], under=False, w=dw)
        head(g, who, 40, -156, expr, s=1.22, hat=hat, scarf=scarf)
        return
    # near front leg: a little wider at the top, a soft paw at the bottom
    g.part(P([(14, -78), (38, -78), (40, -50), (38, -16), (46, -8), (46, 0), (14, 0), (16, -40)]), c=K['coat'], under=False, w=dw)
    if sug:
        g.part(P([(15, -16), (38, -16), (46, -7), (46, 0), (14, 0)]), c=K['cream'], under=False, w=dw)
        for x in (26, 35):
            g.line(Path().M(x, -6).L(x, 0), w=dw * 0.7)
    else:
        g.part(P([(16, -42), (39, -42), (38, -16), (46, -8), (46, 0), (14, 0)]), c=K['tan'], under=False, w=dw)
    head(g, who, 40, -156, expr, s=1.22, hat=hat, scarf=scarf)


# ------------------------------------------------------------------ the head, facing right, centred at (hx, hy)
HAT = None   # set by cast.py: pup_hat(view, hat, who)


def head(g, who, hx, hy, expr='happy', s=1.0, hat=None, scarf=False):
    dw = g.ink.dw
    sug = who == 'sugarfoot'
    if scarf:   # a scarf round the neck, one end hanging down
        g.part(P([(hx - 36, hy + 24), (hx - 8, hy + 38), (hx + 20, hy + 36), (hx + 24, hy + 50), (hx - 8, hy + 54), (hx - 38, hy + 40)]), c='#F2877E')
        g.part(P([(hx - 8, hy + 44), (hx + 6, hy + 46), (hx + 4, hy + 84), (hx - 10, hy + 82)]), c='#F2877E', under=False, w=dw)
        for yy in (56, 68):
            g.line(Path().M(hx - 9, hy + yy).L(hx + 5, hy + yy + 1), w=dw * 0.7)
    elif not sug:   # the collar sits round the neck, under the head
        g.part(P([(hx - 34, hy + 26), (hx - 8, hy + 40), (hx + 18, hy + 38), (hx + 22, hy + 48), (hx - 8, hy + 52), (hx - 36, hy + 38)]), c=K['collar'])
        g.part(P([(hx + 6, hy + 50), (hx + 14, hy + 50), (hx + 14, hy + 60), (hx + 6, hy + 60)]), c=K['tag'], under=False, w=dw * 0.8)
    V = g.view(hx, hy, s)
    # skull and snout as one shape: a big round head, a gently pointed snout
    skull = [(-40, -4), (-36, -30), (-16, -46), (10, -46), (30, -34), (40, -18), (54, -12), (66, -4), (70, 8), (62, 22),
             (42, 28), (18, 32), (-10, 30), (-32, 18)]
    V.part(P(skull), c=K['coat'])
    if sug:
        V.part(P([(-2, -20), (16, -28), (32, -20), (42, -8), (56, -4), (66, 6), (60, 20), (40, 26), (16, 28), (-4, 20), (-8, 2)]), c=K['tan'], under=False, w=dw)
        V.part(P([(-24, -36), (-4, -42), (6, -28), (4, 2), (-2, 28), (-14, 44), (-30, 40), (-36, 18), (-36, -12)]), c=K['coat'], under=False, w=dw)
        V.line(curve([(-12, -26), (-18, 2), (-22, 30)]), w=dw * 0.7)
    else:
        V.part(P([(20, 6), (40, -2), (58, 0), (68, 9), (60, 22), (40, 26), (18, 22)]), c=K['tan'], under=False, w=dw)
        V.part(circ(16, -24, 6), c=K['tan2'], under=False, w=dw * 0.9)
        V.part(P([(-24, -34), (-10, -50), (8, -52), (16, -44, 'c'), (4, -36), (-8, -26)]), c=K['coat'], under=False, w=dw)
        V.line(curve([(-10, -38), (2, -44), (14, -44)]), w=dw * 0.7)
    V.blk(ell(68, 6, 7, 6))
    V.wh(circ(66, 3, 1.8))
    if expr in ('sleep', 'calm'):
        V.line(curve([(18, -6), (24, 0), (32, -6)]), w=dw)
    else:
        V.blk(ell(26, -6, 6.5, 7.5))
        V.wh(circ(28, -9, 2.2))
    V.line(curve([(62, 16), (52, 22), (42, 18)]), w=dw)
    if expr not in ('sleep', 'calm'):
        V.part(P([(47, 20), (55, 20), (55, 32), (49, 36), (45, 28)]), c=K['pink'], under=False, w=dw * 0.9)
    if hat and HAT:
        HAT(V.view(14, -10, 0.74), hat, who)


# ------------------------------------------------------------------ standing / walking, facing right (ph 0..1 swings the legs)
def _leg(g, who, x, top, dx, dw):
    """a far-side leg, behind the body: soft and tapered, slimmer at the ankle"""
    pts = [(x - 13, top), (x + 13, top), (x + 11 + dx * 0.4, -38), (x + 9 + dx, -12), (x - 9 + dx, -12), (x - 11 + dx * 0.4, -38)]
    g.part(P(pts), c=K['coat'])


def _paw(g, who, x, dx, dw, tall=False):
    """a round paw; Tidbit's is tan and reaches a little up the leg like a sock"""
    sug = who == 'sugarfoot'
    t = -24 if (tall and not sug) else -15
    g.part(P([(x - 11 + dx, t), (x + 6 + dx, t - 1), (x + 18 + dx, -8), (x + 19 + dx, 0), (x - 12 + dx, 0)]), c=K['cream'] if sug else K['tan'], under=False, w=dw)
    for tt in ((0, 7) if sug else (3,)):
        g.line(Path().M(x + tt + dx + 3, -6).L(x + tt + dx + 3, 0), w=dw * 0.7)


def stand(g, who, expr='happy', ph=None, run=False, hat=None, scarf=False):
    dw = g.ink.dw
    sug = who == 'sugarfoot'
    w = 1.06 if sug else 1.0
    a = 0.0 if ph is None else math.sin(ph * math.tau) * (16 if run else 9)
    fd, bd = a, -a          # near front and near back feet swing opposite ways
    if sug:
        g.part(P([(-80, -96), (-106, -110), (-124, -132), (-122, -146), (-110, -140), (-98, -122), (-78, -110)]), c=K['coat'])
        g.line(curve([(-116, -136), (-106, -124), (-92, -114)]), w=dw * 0.7)
    else:
        g.part(P([(-78, -100), (-92, -114), (-98, -132), (-90, -136), (-82, -120), (-74, -110)]), c=K['coat'])
    # far legs peek out behind, swinging the other way
    far = [(42 * w, -76, -fd), (-46 * w, -70, -bd)]
    for (x, top, dx) in far:
        _leg(g, who, x, top, dx, dw)
    # one smooth outline: back, chest, near front leg, belly, near back leg, rump
    sil = [(-84, -106), (-60, -126), (-20, -132), (24, -128), (52, -116), (64, -96), (56, -76),
           (44 + fd * 0.3, -50), (40 + fd, -12), (18 + fd, -12), (18 + fd * 0.4, -46), (12, -64),
           (-10, -62), (-30, -64), (-38 + bd * 0.3, -46), (-44 + bd, -12), (-66 + bd, -12),
           (-70 + bd * 0.5, -36), (-80, -56), (-90, -80)]
    g.part(P([(x * w, y) for x, y in sil]), c=K['coat'])
    if sug:
        g.part(P([(46, -116), (60, -104), (58, -84), (50, -74), (42, -90)]), c=K['cream'], under=False, w=dw)
    else:
        g.part(P([(40, -118), (60, -110), (58, -88), (48, -76), (38, -94)]), c=K['tan'], under=False, w=dw)
    # the haunch
    g.line(curve([(-26 * w, -110), (-52 * w, -100), (-60 * w, -82), (-52 * w, -66)]), w=dw * 0.8)
    for (x, top, dx) in far:
        _paw(g, who, x, dx, dw)
    _paw(g, who, 29 * w, fd, dw, tall=True)
    _paw(g, who, -55 * w, bd, dw, tall=True)
    head(g, who, 58 * w, -148, expr, s=1.12, hat=hat, scarf=scarf)


# ------------------------------------------------------------------ lying down, facing right
def lie(g, who, expr='happy', hat=None):
    dw = g.ink.dw
    sug = who == 'sugarfoot'
    w = 1.06 if sug else 1.0
    if sug:
        g.part(P([(-96, -16), (-122, -20), (-144, -34), (-146, -48), (-134, -44), (-118, -32), (-96, -28)]), c=K['coat'])
    else:
        g.part(P([(-92, -18), (-108, -26), (-118, -40), (-110, -44), (-100, -32), (-90, -28)]), c=K['coat'])
    body = [(-100, -14), (-96, -46), (-66, -68), (-20, -72), (24, -64), (44, -42), (40, -12), (10, 0), (-60, 0), (-94, -4)]
    g.part(P([(x * w, y) for x, y in body]), c=K['coat'])
    g.line(curve([(-40 * w, -60), (-72 * w, -50), (-76 * w, -22), (-58 * w, -8)]), w=dw * 0.9)
    paw = K['cream'] if sug else K['tan']
    g.part(P([(-60 * w, -10), (-28 * w, -10), (-22 * w, 0), (-62 * w, 0)]), c=paw, under=False, w=dw)
    for dx in (0, 22):
        g.part(P([(18 + dx, -14), (64 + dx, -14), (72 + dx, -7), (68 + dx, 0), (16 + dx, 0)]), c=K['coat'], under=False, w=dw)
        g.part(P([(46 + dx, -14), (64 + dx, -14), (72 + dx, -7), (68 + dx, 0), (46 + dx, 0)]), c=paw, under=False, w=dw)
    head(g, who, 52 * w, -66, expr, s=1.12, hat=hat)


# ------------------------------------------------------------------ peeking over a ledge (y = 0 is the ledge), facing right
def peek(g, who, expr='happy', paws=True, hat=None):
    dw = g.ink.dw
    paw = K['cream'] if who == 'sugarfoot' else K['tan']
    g.part(P([(-46, 0), (-40, -40), (-10, -58), (30, -56), (52, -36), (54, 0)]), c=K['coat'])
    head(g, who, 0, -84, expr, s=1.25, hat=hat)
    if paws:
        for x in (-30, 22):
            g.part(P([(x - 18, 0), (x - 16, -14), (x, -20), (x + 16, -14), (x + 18, 0)]), c=paw, under=False, w=dw)
            for t in (-6, 6):
                g.line(Path().M(x + t, -10).L(x + t, 0), w=dw * 0.7)
