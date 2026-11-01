#!/usr/bin/env python3
"""cast.py: the model sheet. Tidbit and Sugarfoot, drawn once and reused on every page of both coloring books (kids29).

Each pose is a function  pup_*(ink, who, x, y, s=1.0, ...)  that draws one Fig at the page position (x, y):
x is the middle, y the ground under the feet (or the bottom of the figure). s scales the whole character.
lvl 0 is the younger book (bold, simple). lvl 1 is the older book: the same character, a touch more graceful, with fine fur
marks and a few extra details. Pen widths come from the Ink the page was made with, so every character is on-model at every size.
Every part also carries its real color (c=...), used when the Ink is in color mode (the covers); in line mode all parts are white.

The pups are drawn exactly as in Frequency Buddies: since Oct 31 2026 every pose below is replaced by the cartoon's own
drawing (fbpups.py, a copy of assets/js/pups.js; see the end of this file). Tidbit: lean, black mask, round tan brow dot,
folded ear, tan lower legs, a collar with a little silver tag, short tail. Sugarfoot: stocky, tan face, long drop ears,
a white streak on the chest, big white toes with nails, a thicker tail, no collar.
"""
import math
from cute import *
import cute as _cute

# owner, Oct 31 2026: in the coloring books both pups always have both eyes open (build_coloring.py and the adult book set this)
OPEN_EYES = False
CLOSED_EYES = ('joy', 'sleep', 'calm', 'wink', 'yawn', 'silly', 'love')

K = dict(coat='#4A413B', tan='#D9A066', tan2='#EBC08C', pink='#F6A9BB', tongue='#F08DA8', cream='#FFF3DF', green='#8CCB8A', gold='#F4C84E',
         nose='#2B2620', white='#FFFFFF', ink='#2B2620')


def mir(p):
    return p.xf(mat(0, 0, 1, True))


# ------------------------------------------------------------------ small shared bits
def eye_open(g, x, y, rx=12, ry=15, look=(0, 0), big=False):
    g.blk(ell(x, y, rx, ry))
    g.wh(circ(x - rx * 0.30 + look[0], y - ry * 0.34 + look[1], rx * 0.42))
    g.wh(circ(x + rx * 0.32 + look[0] * 0.5, y + ry * 0.36 + look[1] * 0.5, rx * 0.2))
    if big:
        g.wh(circ(x + rx * 0.42, y - ry * 0.45, rx * 0.14))


def eye_happy(g, x, y, r=10, w=1.25):
    g.line(curve([(x - r, y + r * 0.35), (x, y - r * 0.7), (x + r, y + r * 0.35)]), w=g.ink.dw * w)


def eye_sleep(g, x, y, r=10, lash=True, side=1):
    g.line(curve([(x - r, y - r * 0.2), (x, y + r * 0.55), (x + r, y - r * 0.2)]), w=g.ink.dw * 1.25)
    if lash:
        g.line(Path().M(x + side * r * 0.85, y + 1).L(x + side * (r + 5), y - 3), w=g.ink.dw * 0.9)


def blush(g, x, y, rx=9, ry=5.5, c=None):
    g.part(ell(x, y, rx, ry), c=c or K['pink'], under=False, w=g.ink.dw * 0.7)


def sparkle4(cx, cy, r, w=0.28):
    k = r * w
    P = Path().M(cx, cy - r)
    P.C(cx + k * 0.3, cy - k, cx + k, cy - k * 0.3, cx + r, cy)
    P.C(cx + k, cy + k * 0.3, cx + k * 0.3, cy + k, cx, cy + r)
    P.C(cx - k * 0.3, cy + k, cx - k, cy + k * 0.3, cx - r, cy)
    P.C(cx - k, cy - k * 0.3, cx - k * 0.3, cy - k, cx, cy - r).Z()
    return P


def paw_toes(g, x, y, ang=0, n=2, gap=7, ln=9, w=0.8):
    """little toe lines at a paw"""
    for t in range(n):
        o = (t - (n - 1) / 2) * gap
        a = math.radians(ang)
        px, py = x + math.cos(a) * o, y + math.sin(a) * o
        g.line(Path().M(px, py).L(px - math.sin(a) * ln, py + math.cos(a) * ln), w=g.ink.dw * w)


def toes(who):
    """Sugarfoot's big white feet have three toes; Tidbit's tan socks have two"""
    return 3 if who == 'sugarfoot' else 2


def chest(g, who, cx=0, y=70, w=19, sk=1.0):
    """the chest under the chin: Tidbit's tan shield, Sugarfoot's fluffy white blaze"""
    if who == 'sugarfoot':
        g.part(blob([(cx - w * 0.85, y - 10), (cx + w * 0.85, y - 10), (cx + w, y + 12 * sk), (cx + w * 0.5, y + 26 * sk), (cx + w * 0.3, y + 22 * sk),
                     (cx, y + 38 * sk), (cx - w * 0.3, y + 22 * sk), (cx - w * 0.5, y + 26 * sk), (cx - w, y + 12 * sk)], k=1.0),
               c=K['white'], under=False, w=g.ink.dw * 0.8)
    else:
        g.part(blob([(cx - w, y), (cx + w, y), (cx + w * 0.8, y + 28 * sk), (cx, y + 42 * sk), (cx - w * 0.8, y + 28 * sk)], k=1.0), c=K['tan'], under=False, w=g.ink.dw * 0.8)


def pup_tail(g, who, base, ang, s=1.0, wag=0.0):
    """Tidbit's short, happy stub; Sugarfoot's long, soft plume with a feathered edge. base is where it meets the body, ang the way it points (degrees, 0 = right, -90 = up)"""
    m = mat(base[0], base[1], s, False, ang + wag)
    if who == 'sugarfoot':
        P = blob([(0, -9), (22, -14), (46, -12), (66, -4), (78, 4), (70, 10), (74, 16), (60, 16), (62, 23), (46, 20), (44, 27), (30, 20), (26, 25), (12, 15), (0, 10)], k=1.0)
        g.part(P.xf(m), c=K['coat'])
        g.line(curve([(14, 2), (36, 2), (58, 6)]).xf(m), w=g.ink.dw * 0.8)
    else:
        P = blob([(0, -8), (14, -10), (26, -7), (32, 0), (26, 7), (14, 9), (0, 8)], k=1.0)
        g.part(P.xf(m), c=K['coat'])


# ------------------------------------------------------------------ the pups
def pup_ear(g, who, side, lvl=0, perk=False, rot=0.0):
    """one ear hanging from the top corner of the head; side -1 left, +1 right; rot swings it out (degrees).
    As in Frequency Buddies: Sugarfoot has long, soft drop ears with a wavy fringe; Tidbit has small ears that fold over at the top."""
    if who == 'sugarfoot':
        pts = [(-48, -50), (-70, -54), (-92, -40), (-106, -10), (-110, 30), (-106, 66), (-98, 86), (-88, 80), (-80, 92), (-70, 82), (-62, 62), (-58, 30), (-56, 0), (-52, -24)]
        crease = [(-72, -36), (-88, -8), (-92, 30), (-86, 66)]
    elif who == 'tidbit':
        # a folded ear: it stands up from the corner of the head, then the flap folds forward with its tip pointing down
        pts = [(-30, -56), (-48, -68), (-70, -68), (-86, -56, 'c'), (-82, -40), (-76, -24), (-70, -8, 'c'), (-60, -18), (-50, -32), (-40, -46)]
        P = blob(pts, k=1.0)
        C = curve([(-36, -58), (-58, -60), (-84, -55)])
        if perk:
            P, C = P.xf(mmul(mat(-44, -56, 1, False, 8), mat(44, 56))), C.xf(mmul(mat(-44, -56, 1, False, 8), mat(44, 56)))
        if rot:
            m = mmul(mat(-44, -56, 1, False, rot * 0.5 * (1 if side < 0 else -1)), mat(44, 56))
            P, C = P.xf(m), C.xf(m)
        if side > 0:
            P, C = mir(P), mir(C)
        g.part(P, c=K['coat'])
        g.line(C)
        if lvl:
            g.line(Path().M(side * 70, -40).L(side * 76, -32), w=g.ink.dw * 0.8)
        return
    else:
        pts = [(-48, -50), (-68, -52), (-86, -40), (-96, -14), (-96, 16), (-88, 40), (-74, 48), (-62, 38), (-58, 16), (-56, -8), (-52, -30)]
        crease = [(-70, -36), (-82, -12), (-82, 18), (-76, 36)]
    P = blob(pts, k=1.0)
    C = curve(crease)
    if perk:
        pts2 = [(-46, -52), (-66, -64), (-90, -62), (-106, -42), (-108, -16), (-96, -2), (-80, -8), (-68, -22), (-58, -32), (-52, -40)]
        P = blob(pts2, k=1.0)
        C = curve([(-70, -52), (-88, -48), (-98, -26)])
    if rot:
        m = mmul(mat(-48, -46, 1, False, rot * (1 if side < 0 else -1)), mat(48, 46))
        P, C = P.xf(m), C.xf(m)
    if side > 0:
        P, C = mir(P), mir(C)
    g.part(P, c=K['coat'])
    g.line(C)
    if lvl and not perk:
        for (a, b, c, d) in ((-80, 30, -90, 34), (-72, 46, -81, 52), (-90, 4, -99, 8)):
            g.line(Path().M(side * a, b).L(side * c, d), w=g.ink.dw * 0.85)


def pup_head(g, who, expr='happy', tilt=0.0, lvl=0, look=(0, 0), mouth=None, turn=0.0, ear_rot=0.0, ears=True, hat=None):
    """origin at the middle of the head. About 150 wide and 112 tall before the ears. tilt in degrees, turn -1..1 looks left or right"""
    if tilt:
        g = g.view(0, 0, 1, False, tilt)
    sugar = who == 'sugarfoot'
    _cute.PAIR['mark'] = True
    face = expr
    if OPEN_EYES and expr in CLOSED_EYES:
        face = 'happy'
    head = blob([(0, -52), (34, -50), (60, -36), (75, -8), (73, 18), (57, 40), (30, 53), (0, 57), (-30, 53), (-57, 40), (-73, 18), (-75, -8), (-60, -36), (-34, -50)])
    g.part(head, c=K['coat'])
    if who == 'tidbit':
        g.line(curve([(-4, -51), (-9, -64), (2, -72), (11, -65)]), w=g.ink.dw * 1.1)
        g.line(curve([(9, -51), (15, -60), (23, -59)]), w=g.ink.dw * 0.9)
    if lvl:
        for sgn in (-1, 1):
            for (a, b, c, d) in ((58, -22, 66, -28), (62, -6, 71, -8), (56, 36, 64, 40)):
                g.line(Path().M(sgn * a, b).L(sgn * c, d), w=g.ink.dw * 0.8)
    F = g.view(turn * 12, 0) if turn else g
    lift = {'wow': -5, 'surprised': -6, 'happy': 0, 'sleep': 3, 'sad': 2}.get(expr, 0)
    if sugar:
        # Sugarfoot: tan brows that run down into big tan cheeks, with a black stripe down the middle of her forehead
        F.part(blob([(0, -6), (8, -24), (24, -40 + lift), (44, -38 + lift), (58, -22), (64, 2), (60, 26), (46, 44), (24, 54), (0, 56),
                     (-24, 54), (-46, 44), (-60, 26), (-64, 2), (-58, -22), (-44, -38 + lift), (-24, -40 + lift), (-8, -24)], k=1.0),
               c=K['tan'], under=False, w=g.ink.dw * 0.85)
    else:
        # Tidbit: tan cheeks and lips, a black mask across both eyes, and a round tan dot over each eye
        F.part(blob([(0, 6), (24, 8), (50, 6), (64, 12), (66, 22), (57, 40), (30, 53), (0, 57), (-30, 53), (-57, 40), (-66, 22), (-64, 12), (-50, 6), (-24, 8)], k=1.0),
               c=K['tan'], under=False, w=g.ink.dw * 0.85)
        F.part(blob([(0, -6), (12, -14), (30, -19 + lift * 0.5), (48, -15), (60, -2), (58, 14), (44, 22), (28, 22), (14, 16), (0, 14),
                     (-14, 16), (-28, 22), (-44, 22), (-58, 14), (-60, -2), (-48, -15), (-30, -19 + lift * 0.5), (-12, -14)], k=1.0),
               c=K['coat'], under=False, w=g.ink.dw * 0.9)
        for sgn in (-1, 1):
            F.part(circ(sgn * 31, -31 + lift, 7.5), c=K['tan'], under=False, w=g.ink.dw * 0.8)
    ex, ey = 32, 2
    if face == 'joy':
        for sgn in (-1, 1):
            eye_happy(F, sgn * ex, ey + 3, 11)
    elif face in ('sleep', 'calm'):
        for sgn in (-1, 1):
            eye_sleep(F, sgn * ex, ey + 2, 11, lash=sugar, side=sgn)
    elif face == 'wink':
        eye_open(F, -ex, ey, 12, 15, look=look)
        eye_happy(F, ex, ey + 3, 10)
    elif face == 'silly':
        eye_open(F, -ex, ey, 13, 16, look=(2, -1), big=True)
        F.line(Path().M(ex - 10, ey - 4).L(ex + 8, ey + 4).M(ex - 10, ey + 12).L(ex + 8, ey + 4), w=g.ink.dw * 1.25)
    elif face == 'love':
        for sgn in (-1, 1):
            F.part(heart_path(sgn * ex, ey, 13), c='#F2877E', under=False, w=g.ink.dw * 0.9)
            F.wh(circ(sgn * ex - 5, ey - 6, 2.4))
    elif face == 'yawn':
        for sgn in (-1, 1):
            eye_sleep(F, sgn * ex, ey + 2, 11, lash=False)
    elif face in ('wow', 'surprised'):
        for sgn in (-1, 1):
            eye_open(F, sgn * ex, ey, 13, 16, look=look, big=True)
    elif face == 'sparkle':
        for sgn in (-1, 1):
            eye_open(F, sgn * ex, ey, 13, 16, look=look, big=True)
            F.wh(sparkle4(sgn * ex + 4, ey - 5, 5, 0.4))
    else:
        for sgn in (-1, 1):
            eye_open(F, sgn * ex, ey, 12, 15, look=look)
    if sugar and lvl and face not in ('sleep', 'calm', 'joy'):
        for sgn in (-1, 1):
            F.line(Path().M(sgn * (ex + 10), ey - 8).L(sgn * (ex + 17), ey - 14), w=g.ink.dw * 0.9)
    muz = blob([(0, 14), (18, 16), (27, 29), (20, 46), (0, 51), (-20, 46), (-27, 29), (-18, 16)])
    F.part(muz, c=K['cream'] if sugar else K['tan2'], under=False, w=g.ink.dw * 0.8)
    F.blk(blob([(-10, 17), (0, 15), (10, 17), (6, 25), (0, 28), (-6, 25)], k=1.0))
    F.wh(ell(-3.8, 18.2, 2.8, 1.5, -15))
    m = mouth or ({'happy': 'tongue', 'joy': 'open', 'wow': 'o', 'surprised': 'o', 'sleep': 'smile', 'calm': 'smile', 'sparkle': 'open', 'wink': 'tongue', 'sad': 'frown', 'silly': 'tongue_big', 'love': 'open', 'yawn': 'bigopen'}.get(expr, 'smile'))
    my = 31
    dw = g.ink.dw
    if m == 'smile':
        F.line(Path().M(0, 27).L(0, my), w=dw)
        F.line(curve([(-13, my - 3), (-8, my + 6), (0, my + 1)]), w=dw)
        F.line(curve([(0, my + 1), (8, my + 6), (13, my - 3)]), w=dw)
    elif m == 'tongue':
        F.line(Path().M(0, 27).L(0, my), w=dw)
        F.line(curve([(-15, my - 3), (-9, my + 7), (0, my + 2)]), w=dw)
        F.line(curve([(0, my + 2), (9, my + 7), (15, my - 3)]), w=dw)
        F.part(blob([(-8, my + 3), (8, my + 3), (10, my + 15), (0, my + 22), (-10, my + 15)]), c=K['tongue'], under=False, w=dw)
        F.line(Path().M(0, my + 6).L(0, my + 15), w=dw * 0.8)
    elif m == 'tongue_big':
        F.line(Path().M(0, 27).L(0, my), w=dw)
        F.line(curve([(-15, my - 3), (-9, my + 7), (0, my + 2)]), w=dw)
        F.line(curve([(0, my + 2), (9, my + 7), (15, my - 3)]), w=dw)
        F.part(blob([(-9, my + 3), (11, my + 3), (15, my + 22), (5, my + 34), (-8, my + 28), (-12, my + 14)]), c=K['tongue'], under=False, w=dw)
        F.line(Path().M(2, my + 8).L(3, my + 24), w=dw * 0.8)
    elif m == 'bigopen':
        F.line(Path().M(0, 27).L(0, my), w=dw)
        mo = blob([(-20, my - 2), (0, my + 3), (20, my - 2), (20, my + 16), (0, my + 30), (-20, my + 16)], k=1.0)
        F.part(mo, c='#8A3B45', under=False, w=dw)
        F.clip(mo)
        F.part(ell(0, my + 28, 13, 9), c=K['tongue'], under=False, w=dw * 0.9)
        F.unclip()
    elif m == 'open':
        F.line(Path().M(0, 27).L(0, my), w=dw)
        mo = blob([(-17, my - 2), (0, my + 3), (17, my - 2), (15, my + 12), (0, my + 22), (-15, my + 12)], k=1.0)
        F.part(mo, c='#8A3B45', under=False, w=dw)
        F.clip(mo)
        F.part(ell(0, my + 22, 11, 8), c=K['tongue'], under=False, w=dw * 0.9)
        F.unclip()
    elif m == 'o':
        F.line(Path().M(0, 27).L(0, my), w=dw)
        F.part(ell(0, my + 8, 5.5, 7), c='#8A3B45', under=False, w=dw)
    elif m == 'frown':
        F.line(Path().M(0, 27).L(0, my), w=dw)
        F.line(curve([(-12, my + 8), (-6, my + 1), (0, my + 3)]), w=dw)
        F.line(curve([(0, my + 3), (6, my + 1), (12, my + 8)]), w=dw)
    for sgn in (-1, 1):
        blush(F, sgn * 52, 25, 10, 6)
    if ears:
        if who == 'tidbit':
            pup_ear(g, who, -1, lvl, rot=ear_rot)
            pup_ear(g, who, 1, lvl, perk=True, rot=ear_rot)
        else:
            pup_ear(g, who, -1, lvl, rot=ear_rot)
            pup_ear(g, who, 1, lvl, rot=ear_rot)
    if hat:
        pup_hat(g, hat, who)


def pup_hat(g, hat, who='tidbit'):
    """hats sit on top of the head (head-local: the crown of the head is at y = -52)"""
    dw = g.ink.dw
    if hat == 'party':
        v = g.view(6, -50, 1, False, 10)
        v.part(blob([(-30, 4, 'c'), (0, -86, 'c'), (30, 4, 'c'), (0, 12)], k=0.6), c='#F7D56A')
        v.part(circ(0, -90, 10), c='#F2877E', under=True, w=dw * 0.9)
        for (a, b) in ((-10, -16), (8, -30), (-2, -48)):
            v.part(circ(a, b, 4), c='#FFFFFF', under=False, w=dw * 0.7)
    elif hat == 'crown':
        v = g.view(0, -48, 1, False, -6)
        v.part(blob([(-38, 4, 'c'), (-42, -44, 'c'), (-20, -20), (0, -58, 'c'), (20, -20), (42, -44, 'c'), (38, 4, 'c')], k=0.5), c='#F7D56A')
        for (a, b, c) in ((-42, -46, '#F2877E'), (0, -60, '#8FCBF0'), (42, -46, '#F2877E')):
            v.part(circ(a, b, 6), c=c, under=True, w=dw * 0.9)
        v.line(Path().M(-34, -6).L(34, -6), w=dw * 0.8)
    elif hat == 'wizard':
        v = g.view(0, -46, 1, False, -4)
        v.part(blob([(-34, 0, 'c'), (-26, -60), (-6, -110), (22, -134), (50, -128, 'c'), (34, -112), (22, -70), (34, 0, 'c'), (0, 8)], k=0.7), c='#7A6BC8')
        v.part(ell(0, 2, 62, 12), c='#7A6BC8', under=True)
        v.part(star_path(-4, -52, 12, 6, 5, -90, 2), c='#F7D56A', under=False, w=dw * 0.8)
        v.part(circ(16, -94, 4), c='#F7D56A', under=False, w=dw * 0.7)
    elif hat in ('sun', 'rain'):
        c1 = '#F7D56A' if hat == 'sun' else '#FFD84A'
        v = g.view(0, -42, 1, False, 0)
        v.part(ell(0, 0, 100, 18), c=c1)
        v.part(blob([(-52, 0, 'c'), (-46, -36), (-20, -54), (20, -54), (46, -36), (52, 0, 'c')], k=0.9), c=c1)
        v.part(rrect(-52, -14, 104, 14, 5), c='#F2877E' if hat == 'sun' else '#8FCBF0', under=False, w=dw * 0.85)
        if hat == 'sun':
            v.part(ell(34, -12, 14, 8, -20), c='#F7A8C2', under=False, w=dw * 0.8)
    elif hat == 'beanie':
        v = g.view(0, -44, 1, False, 4)
        v.part(blob([(-52, 0, 'c'), (-48, -34), (-24, -56), (24, -56), (48, -34), (52, 0, 'c')], k=0.9), c='#8FCBF0')
        v.part(rrect(-56, -12, 112, 22, 10), c='#F2877E')
        for i in range(-2, 3):
            v.line(Path().M(i * 20, -10).L(i * 20, 8), w=dw * 0.7)
        v.part(circ(0, -64, 14), c='#FFFFFF', under=True, w=dw)
    elif hat == 'chef':
        v = g.view(0, -46, 1, False, 0)
        v.part(blob([(-44, 0, 'c'), (-58, -34), (-36, -70), (0, -64), (36, -70), (58, -34), (44, 0, 'c')], k=1.0), c='#FFFFFF')
        v.part(rrect(-46, -8, 92, 18, 6), c='#FFFFFF', under=True)


def collar(g, who, y=56, w=44, hang=True):
    if who != 'tidbit':
        return  # Sugarfoot wears no collar, as in Frequency Buddies
    band = blob([(-w, y - 4, 'c'), (-w * 0.5, y + 7), (0, y + 11), (w * 0.5, y + 7), (w, y - 4, 'c'), (w + 2, y + 11, 'c'), (w * 0.5, y + 23), (0, y + 26), (-w * 0.5, y + 23), (-w - 2, y + 11, 'c')])
    g.part(band, c=K['green'])
    if hang:
        if who == 'tidbit':
            g.part(heart_path(0, y + 38, 11), c=K['gold'], under=False)
        else:
            g.part(ell(0, y + 36, 10, 10), c=K['cream'], under=False)
            g.line(Path().M(-4, y + 36).L(4, y + 36), w=g.ink.dw * 0.8)


def pup_front(ink, who, x, y, s=1.0, expr='happy', flip=False, tilt=0.0, lvl=0, mouth=None, look=(0, 0), tail=True, arms='down', wag=0.0, hs=None, hat=None, scarf=False, coat=False):
    """a sitting pup facing you. x middle, y the ground. About 225 tall at s = 1 (head included).
    arms: 'down' (paws on the ground), 'up' (one paw waving), 'wide' (open for a hug), 'chest' (paws together), 'both_up' (cheering)"""
    sugar = who == 'sugarfoot'
    hs = hs if hs is not None else (0.9 if lvl else 1.0)
    with ink.fig(x, y - 175 * s, s, flip) as g:
        bw = 1.08 if sugar else 0.95  # Sugarfoot stocky, Tidbit lean
        if tail:
            pup_tail(g, who, (-46, 132), -150 if sugar else -135, 1.0, wag * 20)
        body = blob([(-34 * bw, 44), (34 * bw, 44), (50 * bw, 72), (58 * bw, 112), (56 * bw, 146), (38 * bw, 164), (0, 169), (-38 * bw, 164), (-56 * bw, 146), (-58 * bw, 112), (-50 * bw, 72)], k=1.0)
        g.part(body, c=K['coat'])
        for sgn in (-1, 1):
            g.part(ell(sgn * 54 * bw, 162, 25 if sugar else 22, 14 if sugar else 13, sgn * -6), c=K['cream'] if sugar else K['tan'])
            for t in ((-1, 0, 1) if sugar else (-1, 1)):
                g.line(Path().M(sgn * (54 + t * 8) * bw, 158).L(sgn * (54 + t * 8) * bw + sgn * 1, 168), w=g.ink.dw * 0.8)
        chest(g, who, 0, 70)
        if lvl:
            for (a, b) in ((-42, 120), (-46, 134), (42, 118), (46, 134), (-30, 150), (30, 150)):
                g.line(Path().M(a, b).L(a + (3 if a < 0 else -3), b + 6), w=g.ink.dw * 0.8)
        collar(g, who, 46, 42) if not scarf else None
        if coat:
            g.part(blob([(-44, 48, 'c'), (44, 48, 'c'), (64, 100), (70, 160, 'c'), (0, 168), (-70, 160, 'c'), (-64, 100)], k=0.6), c='#FFD84A')
            g.part(blob([(-30, 48, 'c'), (0, 70), (30, 48, 'c'), (36, 62), (0, 84), (-36, 62)], k=0.8), c='#FFE88A', under=False, w=g.ink.dw * 0.85)
            for yy in (100, 126, 150):
                g.part(circ(0, yy, 6), c='#8FCBF0', under=False, w=g.ink.dw * 0.85)
            g.line(Path().M(0, 84).L(0, 164), w=g.ink.dw * 0.8)
        # front legs
        for sgn in (-1, 1):
            mode = arms
            if mode == 'up' and sgn == 1:
                # one paw waves beside the head
                leg = capsule(sgn * 36, 92, sgn * 78, 30, 14, 12)
                g.part(leg, c=K['coat'])
                g.part(ell(sgn * 78, 24, 16, 14), c=K['cream'] if sugar else K['tan'], under=True)
                paw_toes(g, sgn * 78, 22, 0, toes(who), 8, 8, 0.8)
            elif mode == 'both_up':
                leg = capsule(sgn * 38, 92, sgn * 82, 28, 14, 12)
                g.part(leg, c=K['coat'])
                g.part(ell(sgn * 82, 22, 16, 14), c=K['cream'] if sugar else K['tan'])
                paw_toes(g, sgn * 82, 20, 0, toes(who), 8, 8, 0.8)
            elif mode == 'wide':
                leg = capsule(sgn * 36, 94, sgn * 92, 70, 14, 12)
                g.part(leg, c=K['coat'])
                g.part(ell(sgn * 94, 70, 16, 14), c=K['cream'] if sugar else K['tan'])
                paw_toes(g, sgn * 94, 68, sgn * 90, toes(who), 8, 8, 0.8)
            elif mode == 'chest':
                leg = capsule(sgn * 34, 92, sgn * 8, 104, 14, 12)
                g.part(leg, c=K['coat'])
                g.part(ell(sgn * 6, 106, 14, 13), c=K['cream'] if sugar else K['tan'])
            else:
                leg = blob([(sgn * 40, 90), (sgn * 12, 90), (sgn * 10, 128), (sgn * 11, 152), (sgn * 24, 160), (sgn * 38, 152), (sgn * 41, 128)], k=1.0)
                g.part(leg, c=K['coat'])
                if sugar:
                    g.part(blob([(sgn * 8, 142), (sgn * 42, 142), (sgn * 44, 154), (sgn * 25, 162), (sgn * 6, 154)], k=1.0), c=K['cream'], under=False, w=g.ink.dw * 0.8)
                else:
                    g.part(blob([(sgn * 11, 124), (sgn * 39, 124), (sgn * 38, 152), (sgn * 24, 160), (sgn * 11, 152)], k=1.0), c=K['tan'], under=False, w=g.ink.dw * 0.8)
                for t in ((-1, 0, 1) if sugar else (-1, 1)):
                    g.line(Path().M(sgn * 25 + t * (7 if not sugar else 9), 150).L(sgn * 25 + t * (7 if not sugar else 9), 159), w=g.ink.dw * 0.8)
        if scarf:
            g.part(blob([(-52, 44, 'c'), (-26, 58), (0, 62), (26, 58), (52, 44, 'c'), (54, 66, 'c'), (26, 78), (0, 82), (-26, 78), (-54, 66, 'c')], k=1.0), c='#F2877E')
            g.part(blob([(14, 74, 'c'), (44, 70, 'c'), (50, 128, 'c'), (22, 134, 'c')], k=0.4), c='#F2877E')
            for yy in (88, 104, 120):
                g.line(Path().M(20, yy).L(46, yy - 3), w=g.ink.dw * 0.8)
            for xx in (-34, -14, 10, 32):
                g.line(Path().M(xx, 60).L(xx + 1, 76), w=g.ink.dw * 0.7)
        H = g.view(0, 0, hs, False, 0) if hs != 1 else g
        pup_head(H, who, expr, tilt, lvl, look, mouth=mouth, hat=hat)
    return g


def _leg(g, hx, hy, px, py, paw, r0=17, r1=15, toes=True, who='tidbit'):
    """a short chubby leg from the hip (hx, hy) to a paw whose lowest point is (px, py): a coat-colored upper leg and a sock-colored paw.
    Tidbit wears tan socks up to the knee; Sugarfoot has a tan lower leg and a big white foot."""
    ex, ey = px, py - r1
    dx, dy = ex - hx, ey - hy
    L = math.hypot(dx, dy) or 1
    ux, uy = dx / L, dy / L
    t = 0.5
    mx, my = hx + dx * t, hy + dy * t
    g.part(capsule(hx, hy, mx + ux * 4, my + uy * 4, r0, r0 * 0.95), c=K['coat'])
    g.part(capsule(mx, my, ex, ey, r0 * 0.9, r1 + 1), c=K['tan'] if who == 'sugarfoot' else paw)
    if who == 'sugarfoot':
        g.part(ell(ex + ux * r1 * 0.35, ey + uy * r1 * 0.35, r1 * 1.22, r1 * 0.92, math.degrees(math.atan2(uy, ux)) - 90), c=K['cream'], under=False, w=g.ink.dw * 0.85)
    if toes:
        nx, ny = -uy, ux
        for o in ((-7, 0, 7) if who == 'sugarfoot' else (-5.5, 5.5)):
            g.line(Path().M(ex + ux * r1 * 0.3 + nx * o, ey + uy * r1 * 0.3 + ny * o).L(ex + ux * (r1 + 0.4) + nx * o * 0.9, ey + uy * (r1 + 0.4) + ny * o * 0.9), w=g.ink.dw * 0.8)


def pup_side(ink, who, x, y, s=1.0, pose='walk', expr='happy', flip=False, lvl=0, tilt=None, mouth=None, look=(0, 0), ph=0.0, hs=None, ear_rot=None, tail_up=1.0, turn=0.7, hat=None, scarf=False, lower=0.0):
    """a pup in profile, head facing you a little. x middle of the body, y the ground. pose: walk, run, jump, sit, lie"""
    sugar = who == 'sugarfoot'
    hs = hs if hs is not None else ((1.0 if not lvl else 0.9) if OPEN_EYES else (0.92 if not lvl else 0.82))  # coloring books: the same head size as the front view
    paw = K['cream'] if sugar else K['tan']
    with ink.fig(x, y, s, flip) as g:
        if pose == 'lie':
            pup_tail(g, who, (-108, -40), -165 if sugar else -150)
            body = blob([(-116, -14), (-112, -52), (-78, -72), (-26, -74), (24, -60), (38, -26), (14, -4), (-56, -2)], k=1.0)
            g.part(body, c=K['coat'])
            g.part(ell(-70, -26, 32, 24, -10), c=K['coat'], under=True)
            g.line(curve([(-92, -36), (-76, -50), (-52, -48)]), w=g.ink.dw * 0.9)
            g.part(ell(-60, -5, 28, 9, 0), c=paw)
            paw_toes(g, -44, -6, 90, toes(who), 6, 6, 0.8)
            H = g.view(70, -64, hs, False, tilt if tilt is not None else -5)
            pup_head(H, who, expr, 0, lvl, look, mouth=mouth, turn=0.4, ear_rot=14 if ear_rot is None else ear_rot, hat=hat)
            for sgn in (-1, 1):
                g.part(ell(70 + sgn * 26, 2, 22, 13, 0), c=paw)
                paw_toes(g, 70 + sgn * 26, -2, 90, toes(who), 8, 6, 0.8)
            return g
        ph = ph % 1.0
        run = pose in ('run', 'jump')
        if run:
            legs = [(30, -46, 100, -14), (-78, -46, -140, -18), (20, -40, 80, 6), (-66, -40, -120, 8)]
        elif pose == 'sit':
            legs = []
        else:
            a = math.sin(ph * TAU) * 16
            legs = [(40, -50, 46 + a * 0.7, 0), (-56, -50, -50 + a * 0.7, 0), (22, -50, 14 - a * 0.7, 0), (-74, -50, -82 - a * 0.7, 0)]
        tu = tail_up
        body = blob([(-102, -64), (-88, -106), (-46, -126), (0, -122), (42, -116), (66, -92), (70, -60), (58, -34), (22, -20), (-30, -18), (-74, -26), (-100, -42)], k=1.0)
        pup_tail(g, who, (-94, -86), -175 + (60 if sugar else 72) * tu)
        for L_ in legs:
            _leg(g, *L_, paw, who=who)
        g.part(body, c=K['coat'])
        if sugar:
            g.part(blob([(22, -70), (58, -78), (66, -52), (54, -40), (50, -30), (42, -36), (34, -26), (28, -36), (16, -34)], k=1.0), c=K['white'], under=False, w=g.ink.dw * 0.8)
        else:
            g.part(blob([(20, -62), (56, -72), (64, -50), (44, -30), (14, -30)], k=1.0), c=K['tan'], under=False, w=g.ink.dw * 0.8)
        g.part(ell(-62, -62, 26, 28, -10), c=K['coat'], under=False, w=g.ink.dw * 0.9)
        if lvl:
            for (a_, b_) in ((-74, -84), (-44, -94), (-14, -94), (18, -88), (-26, -42), (-62, -44), (-88, -60)):
                g.line(Path().M(a_, b_).L(a_ - 6, b_ + 7), w=g.ink.dw * 0.8)
        if pose == 'sit':
            g.part(ell(-62, -12, 34, 14), c=paw)
            g.part(ell(28, -9, 26 if sugar else 24, 13 if sugar else 12), c=paw)
            if sugar:
                paw_toes(g, 40, -12, 90, 3, 6, 6, 0.8)
        if scarf:
            g.part(blob([(26, -96, 'c'), (60, -102), (72, -76, 'c'), (50, -58), (24, -70, 'c')], k=1.0), c='#F2877E')
            g.part(blob([(30, -72, 'c'), (52, -66, 'c'), (44, -30, 'c'), (26, -36, 'c')], k=0.4), c='#F2877E')
            g.line(Path().M(30, -52).L(46, -56), w=g.ink.dw * 0.8)
        elif not sugar:
            g.part(blob([(34, -92), (62, -96), (66, -72), (46, -62), (30, -72)], k=1.0), c=K['green'], under=True)
        H = g.view(66 + 14 * lower, -118 + 52 * lower, hs, False, tilt if tilt is not None else (8 if run else 4) + 26 * lower)
        er = ear_rot if ear_rot is not None else (26 if run else 6)
        pup_head(H, who, expr, 0, lvl, look, mouth=mouth, turn=turn, ear_rot=er, hat=hat)
        if who == 'tidbit' and not scarf:
            g.part(heart_path(52, -56, 7.5), c=K['gold'], under=False)
    return g


def pup_peek(ink, who, x, y, s=1.0, expr='happy', lvl=0, tilt=0.0, paws=True, look=(0, 0), mouth=None, hat=None, ears=True):
    """head and two paws over a ledge (y is the ledge line)"""
    sugar = who == 'sugarfoot'
    with ink.fig(x, y, s) as g:
        pup_head(g, who, expr, tilt, lvl, look, mouth=mouth, hat=hat, ears=ears)
        if paws == 'up':
            for sgn in (-1, 1):
                g.part(capsule(sgn * 70, 100, sgn * 100, 20, 16, 14), c=K['coat'])
                g.part(ell(sgn * 102, 10, 20, 17), c=K['cream'] if sugar else K['tan'])
                paw_toes(g, sgn * 102, 6, 0, toes(who), 9, 8, 0.8)
        elif paws:
            for sgn in (-1, 1):
                g.part(ell(sgn * 40, 76, 22, 17), c=K['cream'] if sugar else K['tan'])
                paw_toes(g, sgn * 40, 72, 0, toes(who), 9, 8, 0.8)
    return g


def pup_dance(ink, who, x, y, s=1.0, expr='joy', flip=False, tilt=6.0, lvl=0, kick=1, hat=None, scarf=False, mouth=None):
    """a pup standing on her hind legs with her arms up, one foot kicked out. y is the ground"""
    sugar = who == 'sugarfoot'
    paw = K['cream'] if sugar else K['tan']
    with ink.fig(x, y - 214 * s, s, flip) as g:
        pup_tail(g, who, (-30, 112), -150 if sugar else -140)
        # legs
        for sgn in (-1, 1):
            up = (sgn == kick)
            if up:
                g.part(capsule(sgn * 16, 150, sgn * 62, 176, 15, 13), c=K['coat'])
                g.part(ell(sgn * 74, 180, 22, 14, sgn * 20), c=paw)
                paw_toes(g, sgn * 80, 178, sgn * 80, toes(who), 7, 6, 0.8)
            else:
                g.part(capsule(sgn * 18, 150, sgn * 24, 196, 16, 14), c=K['coat'])
                g.part(ell(sgn * 32, 204, 24, 12, sgn * -4), c=paw)
                for t in (-1, 1):
                    g.line(Path().M(sgn * (36 + t * 8), 200).L(sgn * (38 + t * 8), 209), w=g.ink.dw * 0.8)
        body = blob([(-30, 44), (30, 44), (46, 80), (48, 124), (34, 158), (0, 164), (-34, 158), (-48, 124), (-46, 80)], k=1.0)
        g.part(body, c=K['coat'])
        chest(g, who, 0, 72, 17, 0.95)
        if scarf:
            g.part(blob([(-48, 44, 'c'), (-24, 58), (0, 62), (24, 58), (48, 44, 'c'), (50, 66, 'c'), (24, 78), (0, 82), (-24, 78), (-50, 66, 'c')], k=1.0), c='#F2877E')
        else:
            collar(g, who, 46, 40)
        for sgn in (-1, 1):
            g.part(capsule(sgn * 34, 92, sgn * 84, 36, 14, 12), c=K['coat'])
            g.part(ell(sgn * 86, 28, 17, 15), c=paw)
            paw_toes(g, sgn * 86, 26, 0, toes(who), 8, 8, 0.8)
        pup_head(g.view(0, 0, 0.92 if lvl else 1.0, False, tilt), who, expr, 0, lvl, mouth=mouth, hat=hat)
    return g


class _Group:
    """a few figures treated as one (for fitting): the union of their boxes"""

    def __init__(self, figs):
        self.figs = figs
        self.bb = (min(f.bb[0] for f in figs), min(f.bb[1] for f in figs), max(f.bb[2] for f in figs), max(f.bb[3] for f in figs))
        self.m = figs[0].m


def pup_hug(ink, x, y, s=1.0, expr_a='happy', expr_b='sleep', lvl=0, hat_a=None, hat_b=None):
    """Sugarfoot (left, eyes closed, happy) and Tidbit (right) sitting cheek to cheek; Tidbit's arm goes around Sugarfoot's shoulder. y is the ground"""
    f1 = pup_front(ink, 'sugarfoot', x - 70 * s, y, s, expr_b, tilt=9, lvl=lvl, arms='chest', hat=hat_a)
    f2 = pup_front(ink, 'tidbit', x + 70 * s, y, s, expr_a, tilt=-9, lvl=lvl, arms='down', hat=hat_b, tail=True)
    with ink.fig(x + 70 * s, y - 175 * s, s) as g:
        g.part(capsule(-34, 96, -118, 78, 14, 13), c=K['coat'])
        g.part(ell(-124, 76, 17, 15), c=K['tan'])
        paw_toes(g, -124, 74, -90, 2, 8, 8, 0.8)
    return _Group([f1, f2, g])


# ================================================================== Frequency Buddies drawings (owner, Oct 31 2026)
# "They need to look exactly like Frequency Buddies": every pose above is replaced by the cartoon's own drawing (fbpups.py, a
# copy of assets/js/pups.js), in the cartoon's own poses: sit, run, lie, wiggle. The pups are always seen from the side, as in
# the episodes. A front-facing pose becomes the cartoon's sit, facing the middle of the page (so two pups face each other).
# Hats, scarves and the raincoat keep working: hats sit on the cartoon head, the scarf goes where Tidbit's collar is.
import fbpups as _fb

FB = True
FBK = 4.4       # page units per cartoon unit at s = 1 (a sitting pup is then about as tall as the old front view)
PAGE_CX = 425   # pages are 850 wide


def _fb_draw(ink, who, x, y, s, pose, left, hat=None, scarf=False, coat=False, tilt=0.0, ph=0.0, t=0.0, cut=None, paws=False, k=FBK, rot=0.0, center=True):
    """one cartoon pup: paws on (x, y) (its horizontal middle at x), facing left if left. cut (cartoon units, e.g. -22) keeps
    only what is above that line, for a pup peeking over a ledge, with its two front paws on the ledge if paws"""
    _cute.PAIR['mark'] = True
    L = _fb.LOOKS[_fb.WHO[who]]
    rec = _fb.draw(L, pose, ph=ph, t=t, tilt=tilt, scarf=scarf, coat=coat, rot=rot, pivot=(-12.0, 0.0), neck=True)
    if cut is not None:  # peeking: only the head shows over the ledge (and two paws)
        rec.ops = rec.ops[rec.marks['head_at']:]
    org = _fb.organic(rec, key=(who, pose, round(ph, 3), round(t, 3), round(tilt, 3), scarf, coat, round(rot, 3), cut))   # smooth outlines, no robot joints (owner, Nov 1 2026)
    xs = [q[0] for loop in org['outline'] for q in loop]
    dx = -(min(xs) + max(xs)) / 2 if center else 0.0
    with ink.fig(x, y, s * k, left) as g:
        _fb.emit_organic(g, org, dx=dx)
        if hat:
            hm = rec.marks['head']
            pup_hat(View(g, mmul(mat(dx, 0), mmul(hm, mat(0, -2.4, 0.175)))), hat, who)
        if cut is not None:
            if paws:
                for px in (11 + dx, 22 + dx):
                    g.part(ell(px, cut - 1.2, 4.2, 2.6), c=L['paw'])
                    for o in (-1.3, 1.3):
                        g.line(Path().M(px + o, cut - 3).L(px + o, cut - 0.6), w=g.ink.dw * 0.6)
    # a little room on each side, so two pups placed side by side never run nose into nose (cute.fit then keeps a clear gap)
    b, p = g.bb, 8 * s * k
    g.bb_true = b
    g.bb = (b[0] - p, b[1], b[2] + p, b[3])
    return g


def _left(x, flip=False):
    return (x > PAGE_CX) != bool(flip)


def _deg(tilt):
    return math.radians(tilt or 0) * 0.6


def fb_front(ink, who, x, y, s=1.0, expr='happy', flip=False, tilt=0.0, lvl=0, mouth=None, look=(0, 0), tail=True, arms='down', wag=0.0, hs=None, hat=None, scarf=False, coat=False):
    return _fb_draw(ink, who, x, y, s, 'sit', _left(x, flip), hat, scarf, coat, _deg(tilt))


def fb_side(ink, who, x, y, s=1.0, pose='walk', expr='happy', flip=False, lvl=0, tilt=None, mouth=None, look=(0, 0), ph=0.0, hs=None, ear_rot=None, tail_up=1.0, turn=0.7, hat=None, scarf=False, lower=0.0):
    p = {'walk': 'run', 'run': 'run', 'jump': 'run', 'sit': 'sit', 'lie': 'lie'}.get(pose, 'run')
    a = 0.9 if pose in ('run', 'jump') else (ph % 1.0) * TAU * 0.5 + 0.35
    return _fb_draw(ink, who, x, y, s, p, bool(flip), hat, scarf, False, _deg(tilt), ph=a)


def fb_peek(ink, who, x, y, s=1.0, expr='happy', lvl=0, tilt=0.0, paws=True, look=(0, 0), mouth=None, hat=None, ears=True):
    return _fb_draw(ink, who, x, y, s, 'sit', _left(x), hat, False, False, _deg(tilt), cut=-25.5, paws=bool(paws), k=FBK * 1.3)


def fb_dance(ink, who, x, y, s=1.0, expr='joy', flip=False, tilt=6.0, lvl=0, kick=1, hat=None, scarf=False, mouth=None):
    return _fb_draw(ink, who, x, y, s, 'wiggle', _left(x, flip), hat, scarf, False, _deg(tilt) * 0.5, t=60 if kick >= 0 else 160)


def fb_hug(ink, x, y, s=1.0, expr_a='happy', expr_b='sleep', lvl=0, hat_a=None, hat_b=None):
    """Sugarfoot (left) and Tidbit (right) hugging the way they do in the episodes: face to face, close, both rearing up on
    their hind legs and leaning in (buddies-player.js, act 'hug': gap 38.5, rot -0.34, Sugarfoot a little more, tilt 0.15)"""
    g = 38.5 / 2 + 16   # air between them: the pups never overlap, not even in a hug (owner, Nov 1 2026)
    f1 = _fb_draw(ink, 'sugarfoot', x - g * FBK * s, y, s, 'run', False, hat_a, tilt=0.15, rot=-0.34 * 1.15, center=False)
    f2 = _fb_draw(ink, 'tidbit', x + g * FBK * s, y, s, 'run', True, hat_b, tilt=0.15, rot=-0.34, center=False)
    return _Group([f1, f2])


if FB:
    pup_front, pup_side, pup_peek, pup_dance, pup_hug = fb_front, fb_side, fb_peek, fb_dance, fb_hug
