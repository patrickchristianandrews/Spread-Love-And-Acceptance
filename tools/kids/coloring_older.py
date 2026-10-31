#!/usr/bin/env python3
"""older.py: the 32 detailed, calming scenes of the older coloring book, starring only Tidbit and Sugarfoot (kids29)."""
import math
import random
from cute import *
import cast
import pat
import props as pr
import props2 as p2
import props3 as p3
import props_o as po
from props_o import o_ink, begin, end, F, sh, FL, FT, FRt, FB

SCENES = []
META = []


def scene(prompt, alt=''):
    def deco(fn):
        SCENES.append(fn)
        META.append(dict(prompt=prompt, alt=alt or prompt, name=fn.__name__))
        return fn
    return deco


def tiny(ink, kind, pts, s=1.0):
    """tiny hidden things: hearts, paw prints, stars"""
    for (x, y) in pts:
        if kind == 'heart':
            with ink.fig(x, y, s, False, 12) as g:
                g.part(heart_path(0, 0, 8), w=ink.dw * 0.9)
        elif kind == 'paw':
            with ink.fig(x, y, s, False, -10) as g:
                g.part(ell(0, 4, 6, 5), w=ink.dw * 0.9)
                for (a, b) in ((-7, -4), (-2.5, -8), (2.5, -8), (7, -4)):
                    g.part(ell(a, b, 2.4, 3), w=ink.dw * 0.8)
        elif kind == 'star':
            pr.star5(ink, x, y, 8 * s, 8)


def birds(ink, pts):
    for (x, y) in pts:
        p3.bird_plain(ink, x, y, 0.8)



def extras(ink, seed, box, n=6, avoid=(), kinds=('bird', 'butterfly', 'star', 'cloud', 'flower')):
    """fill an empty zone with plain, charming decoration (clouds, birds, butterflies, stars, small flowers)"""
    rnd = random.Random(seed)
    placed = []
    tries = 0
    while len(placed) < n and tries < 300:
        tries += 1
        x, y = rnd.uniform(box[0], box[2]), rnd.uniform(box[1], box[3])
        if any(a[0] - 40 <= x <= a[2] + 40 and a[1] - 40 <= y <= a[3] + 40 for a in avoid):
            continue
        if any(math.hypot(x - p[0], y - p[1]) < 95 for p in placed):
            continue
        placed.append((x, y))
        k = kinds[len(placed) % len(kinds)]
        if k == 'bird':
            p3.bird_plain(ink, x, y, 0.9)
        elif k == 'butterfly':
            p3.butterfly_plain(ink, x, y, 0.6, rnd.uniform(-25, 25))
        elif k == 'star':
            pr.star5(ink, x, y, 11, 8)
        elif k == 'cloud':
            po.cloud_z(ink, x, y, 0.5, 240, 96, 3, rnd.choice(('scales', 'waves', 'dots')), 11)
        else:
            po.flower_z(ink, x, y, 0.55, 6, 30, 70, rnd.choice(('dots', 'rings')), False)
    return placed


# 1 -------------------------------------------------------------------------------------------
@scene('Breathe in while the light turns. Breathe out as it passes.', alt='Tidbit and Sugarfoot on the rocks below a lighthouse at dusk')
def s_lighthouse(ink):
    begin(ink, ['leaf', 'dot'])
    po.sun_z(ink, 330, 330, 52)
    po.cloud_z(ink, 200, 190, 0.9, 260, 100, 4, 'scales')
    po.cloud_z(ink, 560, 300, 0.9, 240, 90, 3, 'waves')
    po.cloud_z(ink, 640, 160, 0.7, 220, 90, 3, 'dots')
    birds(ink, [(380, 180), (440, 230), (330, 280)])
    # the sea
    po.water_z(ink, 560, 'waves', 18)
    for k, y in enumerate((620, 690, 760, 830)):
        po.swirl_wind(ink, 130 + (k % 2) * 300, y, 130) if False else None
    # the lighthouse
    with ink.fig(0, 0) as g:
        pass
    base = Path().M(590, 640).L(610, 330).L(690, 330).L(710, 640).Z()
    sh(ink, base, '#FFFFFF', None)
    band1 = Path().M(595, 600).L(600, 520).L(700, 520).L(705, 600).Z()
    band2 = Path().M(604, 470).L(608, 400).L(692, 400).L(696, 470).Z()
    for (b, k, gp) in ((band1, 'hatch', 9), (band2, 'hatch', 9)):
        sh(ink, b, '#F2877E', k, gp, 90, outline=False)
        with ink.fig(0, 0, outline=False) as g:
            g.line(b, w=ink.iw)
    with ink.fig(0, 0) as g:
        g.part(rrect(582, 318, 138, 18, 5))
        g.part(rrect(612, 250, 76, 70, 8))
        g.part(blob([(600, 250, 'c'), (650, 190), (700, 250, 'c')], k=0.6))
        g.part(circ(650, 180, 8))
        g.line(Path().M(582, 330).L(720, 330), w=ink.dw)
        for xx in range(590, 720, 18):
            g.line(Path().M(xx, 318).L(xx, 336), w=ink.dw * 0.8)
    with ink.fig(0, 0, outline=False) as g:
        g.part(rrect(624, 262, 52, 48, 6), w=ink.iw)
    # light rays
    with ink.fig(650, 286, outline=False) as g:
        for a in (-170, -150, -130, 130, 150, 170):
            g.line(Path().M(math.cos(math.radians(a)) * 50, math.sin(math.radians(a)) * 50).L(math.cos(math.radians(a)) * 110, math.sin(math.radians(a)) * 110), w=ink.dw)
    with ink.fig(0, 0) as g:
        g.part(blob([(626, 640, 'c'), (630, 560), (650, 520)], k=1.0)) if False else None
    # rocks
    rock = blob([(470, 700, 'c'), (480, 640), (560, 600), (680, 620), (780, 650), (790, 760, 'c')], k=0.9)
    rock2 = blob([(80, 700, 'c'), (100, 600), (200, 560), (330, 590), (440, 640), (520, 700), (540, 920, 'c'), (80, 920, 'c')], k=0.8)
    sh(ink, rock, '#D8D2C6', 'scales', 14)
    sh(ink, rock2, '#D8D2C6', 'hatch', 9, 50)
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'happy', lvl=1, arms='chest', tilt=-5), (170, 420, 400, 760), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'tidbit', x, y, s, 'happy', lvl=1, tilt=5, arms='down'), (330, 440, 560, 760), 'bottom')
    po.grass_row(ink, 800, FL, FRt, 24, 12, 3)
    pat.fill(ink, Path().M(FL, 800).L(FRt, 800).L(FRt, 912).L(FL, 912).Z(), 'waves', 16)
    tiny(ink, 'heart', [(250, 880), (560, 860), (420, 230)])
    extras(ink, 1, (120, 110, 560, 330), 5, avoid=[(120, 140, 400, 280), (560, 200, 740, 340)], kinds=('bird', 'star', 'butterfly', 'bird'))
    po.flower_z(ink, 130, 770, 0.8, 8, 36, 0, 'dots', False)
    po.flower_z(ink, 710, 790, 0.8, 8, 36, 0, 'rings', False)
    end(ink)



# 2 -------------------------------------------------------------------------------------------
@scene('Listen to the rain. Let your shoulders drop.', alt='Tidbit and Sugarfoot on a window seat watching the rain')
def s_rainwin(ink):
    begin(ink, ['wave'])
    # a big arched window with rain, clouds and drops
    win = blob([(150, 620, 'c'), (150, 330), (190, 190), (425, 130), (660, 190), (700, 330), (700, 620, 'c')], k=0.9)
    sh(ink, win, '#BFE0F7')
    ink.clip_begin(win)
    po.clouds(ink, [(300, 250, 1.0, 'waves'), (560, 200, 0.9, 'scales'), (430, 340, 0.8, 'dots')])
    rnd = random.Random(2)
    for k in range(34):
        x, y = rnd.uniform(150, 700), rnd.uniform(300, 620)
        pr.raindrop(ink, x, y, 0.55)
    ink.clip_end()
    with ink.fig(0, 0, outline=False) as g:
        g.line(Path().M(425, 130).L(425, 620).M(150, 330).L(700, 330).M(150, 470).L(700, 470), w=ink.ow * 0.9)
        g.line(win, w=ink.ow * 1.5)
    # curtains tied back
    for sgn in (-1, 1):
        cx = 425 + sgn * 305
        C = blob([(cx - sgn * 40, 130, 'c'), (cx + sgn * 50, 130, 'c'), (cx + sgn * 40, 340), (cx - sgn * 10, 450), (cx + sgn * 42, 620, 'c'), (cx - sgn * 48, 620, 'c'), (cx - sgn * 30, 400), (cx - sgn * 52, 260)], k=0.9)
        sh(ink, C, '#fff', 'stripes' if False else 'hatch', 12, 90)
    # the sill, seat and cushions
    sh(ink, rrect(110, 620, 630, 40, 12), '#fff', 'dots', 14)
    seat = blob([(100, 660, 'c'), (110, 640), (425, 630), (740, 640), (750, 660, 'c'), (750, 780, 'c'), (100, 780, 'c')], k=0.5)
    sh(ink, seat, '#fff', 'diamonds', 18, box=(100, 700, 750, 780))
    po.cushion(ink, 130, 600, 90, 90, 'stars', -8)
    po.cushion(ink, 720, 600, 90, 90, 'rings', 8)
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'calm', lvl=1, arms='chest', tilt=-4), (170, 420, 430, 740), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'tidbit', x, y, s, 'sleep', lvl=1, tilt=5, arms='down'), (420, 440, 680, 740), 'bottom')
    po.mug(ink, 130, 760, 0.8)
    po.potted(ink, 700, 770, 0.7)
    sh(ink, rrect(92, 800, 666, 112, 0), '#fff', 'bricks', 22, outline=False)
    tiny(ink, 'heart', [(250, 190), (610, 520), (410, 850)])
    tiny(ink, 'paw', [(560, 850)])
    end(ink)


# 3 -------------------------------------------------------------------------------------------
@scene('Climb slowly. Rest at every branch.', alt='Tidbit and Sugarfoot in a treehouse with lanterns')
def s_treehouse_o(ink):
    begin(ink, ['leaf'])
    po.clouds(ink, [(220, 170, 0.8, 'scales'), (620, 210, 0.7, 'waves')])
    po.ground_z(ink, 810, 'leaves', 20)
    # the huge trunk and canopy
    trunk = blob([(300, 912, 'c'), (330, 780), (340, 560), (330, 360), (520, 360), (510, 560), (520, 780), (550, 912, 'c')], k=0.8)
    sh(ink, trunk, '#B07C4D', 'hatch', 9, 80)
    can = blob([(110, 440, 'c'), (110, 300), (180, 200), (330, 150), (500, 140), (650, 190), (740, 290), (740, 440, 'c'), (680, 420), (560, 450), (425, 410), (280, 450), (160, 420)], k=1.0)
    sh(ink, can, '#8FCB7C', 'leaves', 22, box=(0, 100, 900, 450))
    with ink.fig(0, 0) as g:
        g.part(rrect(220, 640, 420, 22, 6))
        g.part(rrect(245, 470, 370, 170, 10))
        g.part(blob([(225, 468, 'c'), (430, 380), (635, 468, 'c'), (605, 484), (430, 440), (255, 484, 'c')], k=0.5))
    sh(ink, blob([(225, 468, 'c'), (430, 380), (635, 468, 'c'), (605, 484), (430, 440), (255, 484, 'c')], k=0.5), '#E8806F', 'scales', 14)
    for (wx, who, ex) in ((345, 'sugarfoot', 'happy'), (515, 'tidbit', 'joy')):
        ink.clip_begin(circ(wx, 555, 68))
        with ink.fig(wx, 575, 0.76, outline=False) as t:
            cast.pup_head(t, who, ex, 0, 1)
        ink.clip_end()
        with ink.fig(0, 0, outline=False) as g:
            g.line(circ(wx, 555, 68), w=ink.ow * 0.9)
            g.line(circ(wx, 555, 74), w=ink.dw)
    # rope ladder and lanterns
    with ink.fig(0, 0, outline=False) as g:
        g.line(Path().M(560, 662).L(575, 900).M(600, 662).L(610, 900), w=ink.dw * 1.1)
        for k in range(10):
            g.line(Path().M(562 + k * 1.2, 690 + k * 21).L(600 + k * 1.1, 690 + k * 21), w=ink.dw)
    p2.lantern_string(ink, [(130, 470), (230, 520), (330, 480)], 3) if False else None
    for (x, y) in ((140, 560), (700, 540), (180, 700), (680, 700)):
        with ink.fig(x, y, 1.0) as g:
            g.line(Path().M(0, -60).L(0, -20), w=ink.dw)
            g.part(blob([(-14, -20, 'c'), (14, -20, 'c'), (18, 6), (10, 26, 'c'), (-10, 26, 'c'), (-18, 6)], k=0.8))
            g.line(Path().M(-6, -14).L(-8, 20).M(6, -14).L(8, 20), w=ink.dw * 0.8)
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'tidbit', x, y, s, 'wow', lvl=1, arms='up'), (130, 700, 300, 905), 'bottom')
    po.grass_row(ink, 900, FL, FRt, 22, 12, 5)
    tiny(ink, 'heart', [(150, 250), (610, 280), (700, 840)])
    tiny(ink, 'star', [(400, 210)])
    end(ink)


# 4 -------------------------------------------------------------------------------------------
@scene('Breathe in the cool night air. Breathe out the day.', alt='Tidbit and Sugarfoot sitting among big flowers under a mandala moon')
def s_nightgarden(ink):
    begin(ink, ['star', 'dot'])
    po.stars_z(ink, 4, 16, (110, 110, 740, 520), avoid=[(250, 160, 600, 500)], size=(8, 15))
    pat.mandala(ink, 425, 300, 150, 4, 12)
    po.ground_z(ink, 760, 'dots', 15, amp=18)
    for (x, h, R) in ((130, 340, 46), (230, 250, 34), (700, 360, 46), (610, 270, 36)):
        po.flower_z(ink, x, 900 - h, 1.2, 8, R, h, 'rings')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'calm', lvl=1, arms='chest'), (210, 440, 440, 840), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'tidbit', x, y, s, 'wow', lvl=1, arms='down', look=(0, -3)), (420, 450, 650, 840), 'bottom')
    for (x, y, r) in ((200, 560, 1), (680, 560, 1), (300, 470, 1), (560, 440, 1), (150, 460, 1), (730, 430, 1)):
        p2.firefly(ink, x, y, 0.6, 10)
    po.grass_row(ink, 905, FL, FRt, 24, 11, 8)
    tiny(ink, 'heart', [(425, 120), (300, 870), (560, 860)])
    end(ink)


# 5 -------------------------------------------------------------------------------------------
@scene('Let the waves carry one worry away.', alt='Tidbit and Sugarfoot in a sailboat on patterned waves')
def s_sail(ink):
    begin(ink, ['wave', 'dot'])
    po.sun_z(ink, 600, 250, 64)
    po.clouds(ink, [(230, 200, 1.0, 'scales'), (520, 420, 0.7, 'dots')])
    birds(ink, [(330, 330), (400, 290), (300, 250)])
    po.water_z(ink, 560, 'waves', 22)
    # a sailboat with two patterned sails
    sail1 = blob([(430, 220, 'c'), (560, 450), (435, 560, 'c')], k=0.6)
    sail2 = blob([(415, 280, 'c'), (320, 460), (415, 560, 'c')], k=0.6)
    sh(ink, sail1, '#fff', 'stripes' if False else 'hatch', 12, 70)
    sh(ink, sail2, '#fff', 'diamonds', 16)
    with ink.fig(0, 0) as g:
        g.line(Path().M(424, 200).L(424, 700), w=ink.ow * 0.8)
        g.part(blob([(424, 200, 'c'), (470, 214, 'c'), (424, 230, 'c')], k=0.3))
    hull = blob([(200, 680, 'c'), (650, 680, 'c'), (590, 800, 'c'), (260, 800, 'c')], k=0.4)
    sh(ink, hull, '#fff', 'scales', 14, box=(200, 730, 650, 800))
    F(ink, lambda i, x, y, s: cast.pup_peek(i, 'sugarfoot', x, y, s, 'happy', lvl=1, paws=True), (250, 560, 420, 720), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_peek(i, 'tidbit', x, y, s, 'joy', lvl=1, paws=True, hat='sun'), (430, 540, 610, 720), 'bottom')
    sh(ink, blob([(FL - 20, 800), (200, 780), (400, 820), (600, 780), (FRt + 20, 810), (FRt + 20, FB + 20), (FL - 20, FB + 20)], k=0.7), '#fff', 'waves', 16, box=(0, 790, 900, 930))
    tiny(ink, 'heart', [(150, 640), (700, 640), (500, 870)])
    tiny(ink, 'paw', [(240, 860)])
    end(ink)


# 6 -------------------------------------------------------------------------------------------
@scene('Look up. The sky is bigger than any worry.', alt='Tidbit and Sugarfoot on a crescent moon among planets and stars')
def s_space(ink):
    begin(ink, ['star', 'diamond'])
    po.stars_z(ink, 6, 22, (110, 110, 740, 880), avoid=[(150, 300, 700, 800)], size=(8, 16))
    p2.planet(ink, 220, 230, 60)
    with ink.fig(0, 0) as g:
        pass
    pl = circ(620, 220, 70)
    sh(ink, pl, '#fff', 'waves', 16)
    pl2 = circ(660, 780, 44)
    sh(ink, pl2, '#fff', 'dots', 12)
    # the big crescent they sit on
    R = 300.0
    cres = Path().M(R * 0.3, -R).C(-R * 0.75, -R * 0.9, -R * 0.75, R * 0.9, R * 0.3, R).C(-R * 0.25, R * 0.5, -R * 0.25, -R * 0.5, R * 0.3, -R).Z().xf(mat(425, 690, 1.0, False, -90))
    sh(ink, cres, '#FBF3D5', 'stars', 22, box=(100, 640, 750, 900))
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'sparkle', lvl=1, arms='chest', tilt=-4), (190, 400, 430, 700), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'tidbit', x, y, s, 'wow', lvl=1, arms='up', tilt=5), (420, 420, 660, 720), 'bottom')
    # a dotted constellation
    with ink.fig(0, 0, outline=False) as g:
        g.line(curve([(150, 150), (260, 120), (330, 170), (420, 130)]), w=ink.dw, dash='1 8')
    tiny(ink, 'heart', [(700, 460), (180, 720), (560, 860)])
    p2.crescent(ink, 650, 470, 34, -20)
    p3.hot_air_balloon(ink, 160, 640, 0.35, 170) if False else None
    po.stars_z(ink, 66, 8, (120, 400, 740, 600), avoid=[(180, 380, 700, 700)], size=(7, 12))
    end(ink)


# 7 -------------------------------------------------------------------------------------------
@scene('The town is sleeping. You can slow down too.', alt='Tidbit and Sugarfoot walking through a sleepy town at night')
def s_town(ink):
    begin(ink, ['dot', 'leaf'])
    po.stars_z(ink, 7, 12, (110, 110, 740, 330), avoid=[], size=(8, 14))
    po.moon_z(ink, 640, 210, 56)
    # rows of little houses
    for (x, h, c) in ((170, 150, '#E8806F'), (330, 190, '#8FA4D8'), (520, 170, '#E8B97C'), (680, 140, '#B79CEB')):
        po.house_z(ink, x, 600, 1.0, 150, h, c, door=True, windows=2 if h > 160 else 1)
    po.ground_z(ink, 620, 'bricks', 22, c='#E8D5B0', amp=4)
    po.lamp_post(ink, 120, 700, 1.0, 330)
    po.lamp_post(ink, 740, 700, 1.0, 300)
    F(ink, lambda i, x, y, s: cast.pup_side(i, 'sugarfoot', x, y, s, 'walk', 'calm', lvl=1, ph=0.2), (130, 640, 450, 860), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_side(i, 'tidbit', x, y, s, 'walk', 'happy', lvl=1, ph=0.7, flip=True, turn=0.7), (420, 650, 740, 870), 'bottom')
    with ink.fig(0, 0, outline=False) as g:
        for k in range(8):
            g.line(Path().M(FL + 20 + k * 80, 884).L(FL + 60 + k * 80, 884), w=ink.dw)
    tiny(ink, 'heart', [(250, 440), (600, 460), (440, 890)])
    tiny(ink, 'paw', [(150, 570)])
    end(ink)


# 8 -------------------------------------------------------------------------------------------
@scene('Notice three bright colors. Color those first.', alt='Tidbit and Sugarfoot at a carnival with a Ferris wheel')
def s_carnival(ink):
    begin(ink, ['diamond', 'dot'])
    pr.bunting(ink, [(92, 150), (260, 215), (425, 170), (590, 215), (758, 150)], 9, 50)
    # the Ferris wheel
    cx, cy, R = 425, 400, 190
    # the stand: two legs and a crossbar, drawn first so the wheel sits in front of them
    with ink.fig(0, 0) as g:
        for sgn in (-1, 1):
            g.part(rpoly([(cx + sgn * 8, cy - 6), (cx + sgn * 26, cy + 10), (cx + sgn * 128, 712), (cx + sgn * 100, 712)], 4))
        g.part(rrect(cx - 92, 640, 184, 16, 4))
    pat.mandala(ink, cx, cy, R, 3, 14)
    for k in range(10):
        a = k * TAU / 10
        with ink.fig(cx + math.cos(a) * R, cy + math.sin(a) * R, 1.0) as g:
            g.part(blob([(-16, 0, 'c'), (16, 0, 'c'), (20, 26), (0, 38), (-20, 26)], k=0.6))
    po.ground_z(ink, 720, 'dots', 16, amp=8)
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'tidbit', x, y, s, 'joy', lvl=1, arms='both_up', hat='party'), (120, 560, 400, 880), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'happy', lvl=1, arms='chest'), (440, 560, 720, 880), 'bottom')
    for (x, y, c) in ((150, 640, 0), (700, 600, 1)):
        pr.balloon(ink, x, y, 0.9, '#fff', 120, 5 - c * 10)
    tiny(ink, 'heart', [(300, 600), (560, 270), (430, 880)])
    end(ink)


# 9 -------------------------------------------------------------------------------------------
@scene('Warm hands, warm tea, slow breath.', alt='Tidbit and Sugarfoot by a fireplace in a cozy cabin')
def s_cabin(ink):
    begin(ink, ['leaf', 'dot'])
    # the back wall with a window and shelf
    po.window_z(ink, 130, 150, 150, 200, arch=True)
    ink.clip_begin(rrect(130, 150, 150, 200, 20))
    pat.fill(ink, rrect(130, 150, 150, 200, 20), 'dots', 18)
    ink.clip_end()
    po.window_z(ink, 570, 150, 150, 200, arch=True)
    p2.crescent(ink, 650, 250, 36, -20)
    po.stars_z(ink, 9, 4, (590, 180, 700, 330), size=(6, 9))
    pr.star5(ink, 200, 250, 12)
    po.bookshelf(ink, 310, 190, 540, 330, 2, 3)
    # the fireplace
    fp = blob([(260, 640, 'c'), (270, 430), (300, 360, 'c'), (550, 360, 'c'), (580, 430), (590, 640, 'c')], k=0.4)
    sh(ink, fp, '#fff', 'bricks', 20)
    arch = blob([(330, 640, 'c'), (335, 520), (425, 460), (515, 520), (520, 640, 'c')], k=0.8)
    sh(ink, arch, '#fff')
    with ink.fig(425, 640) as g:
        g.part(blob([(0, -40, 'c'), (30, -110), (50, -60), (30, -10, 'c'), (-30, -10, 'c'), (-50, -60), (-30, -110)], k=0.9))
        g.part(blob([(0, -34, 'c'), (14, -72), (22, -40), (0, -14, 'c'), (-22, -40), (-14, -72)], k=0.9), w=ink.dw)
        g.part(capsule(-60, -10, 60, -16, 9, 9))
    sh(ink, rrect(240, 330, 370, 30, 6), '#fff', 'dots', 14)
    for (x, who) in ((270, 0), (580, 1)):
        pass
    # the floor and a round rug
    sh(ink, Path().M(FL, 640).L(FRt, 640).L(FRt, FB).L(FL, FB).Z(), '#fff', 'lattice', 36, box=(0, 640, 900, 930), outline=False)
    po.rug(ink, 425, 800, 300, 90, 'diamonds')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'calm', lvl=1, arms='chest', hat='beanie', scarf=True), (150, 480, 410, 830), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'tidbit', x, y, s, 'happy', lvl=1, arms='chest', scarf=True), (440, 480, 700, 830), 'bottom')
    po.mug(ink, 430, 840, 0.7)
    tiny(ink, 'heart', [(150, 450), (700, 450), (425, 900)])
    tiny(ink, 'paw', [(300, 890)])
    end(ink)


# 10 ------------------------------------------------------------------------------------------
@scene('Let the leaves fall. You can let go too.', alt='Tidbit and Sugarfoot walking through a wood full of falling leaves')
def s_autumn(ink):
    begin(ink, ['leaf'])
    rnd = random.Random(10)
    po.tree_z(ink, 170, 760, 1.3, '#F5A85C', 'leaves', 14)
    po.tree_z(ink, 700, 740, 1.2, '#F2877E', 'scales', 14)
    po.ground_z(ink, 760, 'leaves', 20, '#E8D5B0')
    for k in range(16):
        x, y = rnd.uniform(110, 740), rnd.uniform(110, 600)
        with ink.fig(0, 0) as g:
            lf = g.view(x, y, rnd.uniform(1.0, 1.7), False, rnd.uniform(0, 360))
            lf.part(blob([(0, 0, 'c'), (14, -12), (34, 0, 'c'), (14, 12)], k=1.0), w=ink.dw)
            lf.line(Path().M(2, 0).L(28, 0), w=ink.dw * 0.7)
    F(ink, lambda i, x, y, s: cast.pup_side(i, 'tidbit', x, y, s, 'walk', 'happy', lvl=1, ph=0.3, scarf=True), (110, 560, 450, 880), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_side(i, 'sugarfoot', x, y, s, 'walk', 'calm', lvl=1, ph=0.8, flip=True, scarf=True), (410, 580, 750, 890), 'bottom')
    pr.pumpkin(ink, 150, 900, 0.9)
    pr.mushroom(ink, 700, 900, 0.9)
    tiny(ink, 'heart', [(300, 300), (560, 180), (430, 910)])
    tiny(ink, 'paw', [(600, 500)])
    extras(ink, 110, (120, 120, 740, 330), 4, avoid=[], kinds=('bird', 'cloud', 'bird', 'butterfly'))
    for (x, y) in ((150, 880), (420, 900), (640, 880)):
        pr.tuft(ink, x, y, 1.0)
    end(ink)


# 11 ------------------------------------------------------------------------------------------
@scene('Cold nose, warm heart. Take a slow breath.', alt='Tidbit and Sugarfoot on a sled in a snowy village')
def s_winter(ink):
    begin(ink, ['star', 'dot'])
    for k, (x, y, r) in enumerate(((150, 180, 26), (320, 140, 20), (520, 190, 28), (680, 150, 22), (230, 300, 18), (610, 320, 22), (130, 440, 24), (720, 420, 20))):
        pr.snowflake(ink, x, y, r, 10 + k * 7)
    # a snowy village behind
    po.ground_z(ink, 520, 'dots', 20, '#fff', 14)
    for (x, h, c) in ((190, 130, '#E8806F'), (500, 150, '#8FA4D8'), (680, 120, '#B79CEB')):
        po.house_z(ink, x, 600, 0.9, 130, h, c, door=True, windows=1)
    po.pine_z(ink, 110, 640, 1.5, True)
    po.pine_z(ink, 360, 630, 1.2, True)
    po.pine_z(ink, 740, 650, 1.4, True)
    po.ground_z(ink, 700, 'waves', 22, '#fff', 20)
    p3.sled(ink, 425, 890, 1.0, 420)
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'joy', lvl=1, arms='both_up', scarf=True, hat='beanie'), (160, 560, 430, 880), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'tidbit', x, y, s, 'joy', lvl=1, arms='both_up', scarf=True, hat='beanie'), (420, 560, 690, 880), 'bottom')
    tiny(ink, 'heart', [(420, 440), (160, 800), (720, 780)])
    extras(ink, 111, (120, 330, 740, 430), 3, avoid=[], kinds=('bird', 'cloud', 'bird'))
    po.stars_z(ink, 112, 6, (120, 120, 740, 330), size=(7, 11))
    end(ink)


# 12 ------------------------------------------------------------------------------------------
@scene('Smell the flower. Breathe in for four. Breathe out for four.', alt='Tidbit and Sugarfoot sniffing big flowers in a spring meadow')
def s_meadow(ink):
    begin(ink, ['petal', 'dot'])
    po.sun_z(ink, 640, 230, 60)
    po.clouds(ink, [(220, 210, 1.0, 'scales'), (520, 400, 0.6, 'dots')])
    po.ground_z(ink, 640, 'dots', 18, amp=20)
    po.ground_z(ink, 780, 'leaves', 20, '#A9D98C', 12)
    for (x, h, R, p) in ((130, 300, 44, 'rings'), (330, 200, 34, 'dots'), (700, 330, 50, 'swirls'), (590, 220, 36, 'rings')):
        po.flower_z(ink, x, 900 - h, 1.15, 8, R, h, p)
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'calm', lvl=1, arms='down', tilt=-8), (210, 470, 470, 870), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'tidbit', x, y, s, 'wow', lvl=1, arms='down', tilt=6, look=(-4, -2)), (440, 500, 680, 870), 'bottom')
    for (x, y, r) in ((150, 520, 20), (690, 560, 15), (300, 380, -30)):
        p3.butterfly_plain(ink, x, y, 0.6, r)
    po.grass_row(ink, 905, FL, FRt, 24, 11, 12)
    tiny(ink, 'heart', [(500, 300), (190, 650), (730, 840)])
    extras(ink, 12, (120, 280, 740, 520), 6, avoid=[(130, 480, 740, 700)], kinds=('bird', 'butterfly', 'cloud', 'butterfly', 'bird'))
    end(ink)


# 13 ------------------------------------------------------------------------------------------
@scene('Mix slowly. Good things need time.', alt='Tidbit and Sugarfoot baking in chef hats')
def s_bakery(ink):
    begin(ink, ['scallop'])
    # shelves of jars and a window
    for yy in (220, 360):
        sh(ink, rrect(110, yy, 630, 16, 5), '#fff', 'dots', 12)
        for k in range(7):
            x = 150 + k * 85
            jar = blob([(x - 24, yy - 8, 'c'), (x - 30, yy - 50), (x - 22, yy - 84, 'c'), (x + 22, yy - 84, 'c'), (x + 30, yy - 50), (x + 24, yy - 8, 'c')], k=0.5)
            sh(ink, jar, '#fff', ('dots', 'stars', 'hatch', 'rings')[k % 4], 8, 90 if k % 3 == 0 else 0, box=(x - 30, yy - 50, x + 30, yy - 8))
            with ink.fig(0, 0) as g:
                g.part(rrect(x - 26, yy - 96, 52, 14, 4))
    # the counter with a patterned front
    sh(ink, rrect(92, 640, 666, 272, 0), '#fff', 'lattice', 30, outline=False, box=(0, 700, 900, 912))
    with ink.fig(0, 0) as g:
        g.part(rrect(92, 630, 666, 34, 6))
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'tidbit', x, y, s, 'happy', lvl=1, arms='chest', hat='chef'), (100, 330, 430, 660), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'happy', lvl=1, arms='chest', hat='chef'), (420, 330, 750, 660), 'bottom')
    for k in range(5):
        pr.cupcake(ink, 150 + k * 140, 780, 0.9, '#fff')
    for k in range(4):
        p3.cookie(ink, 200 + k * 150, 640 if False else 860, 1.2, k * 9)
    tiny(ink, 'heart', [(120, 600), (730, 600), (425, 890)])
    end(ink)


# 14 ------------------------------------------------------------------------------------------
@scene('One page at a time is plenty.', alt='Tidbit and Sugarfoot reading in a library nook')
def s_library(ink):
    begin(ink, ['diamond', 'dot'])
    po.bookshelf(ink, 110, 130, 740, 400, 4, 14)
    # a round window above
    sh(ink, rrect(92, 400, 666, 20, 0), '#fff', None, outline=False)
    with ink.fig(0, 0) as g:
        g.part(rrect(110, 400, 630, 18, 5))
    po.rug(ink, 425, 840, 300, 70, 'stars')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'happy', lvl=1, arms='chest', look=(0, 6)), (160, 440, 430, 780), 'bottom')
    p3.book(ink, 350, 800, 0.6, 320, 200)
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'tidbit', x, y, s, 'wow', lvl=1, arms='up'), (430, 470, 690, 780), 'bottom')
    p3.lamp(ink, 110, 880, 0.9)
    po.potted(ink, 700, 880, 0.8)
    with ink.fig(0, 0, outline=False) as g:
        pass
    tiny(ink, 'heart', [(250, 270), (560, 210), (425, 900)])
    tiny(ink, 'paw', [(620, 330)])
    end(ink)


# 15 ------------------------------------------------------------------------------------------
@scene('Rise slowly. Look at how far you can see.', alt='Tidbit and Sugarfoot in the basket of a hot-air balloon')
def s_balloon(ink):
    begin(ink, ['wave', 'dot'])
    po.clouds(ink, [(220, 200, 1.0, 'scales'), (600, 260, 0.9, 'waves'), (180, 640, 0.9, 'dots'), (660, 700, 1.0, 'scales')])
    # the balloon
    env = blob([(425, 140), (600, 200), (650, 360), (580, 500), (500, 570, 'c'), (350, 570, 'c'), (270, 500), (200, 360), (250, 200)], k=1.0)
    sh(ink, env, '#fff')
    for k, (xa, kind) in enumerate(((250, 'dots'), (340, 'hatch'), (425, 'stars'), (510, 'hatch'), (600, 'dots'))):
        pass
    ink.clip_begin(env)
    for k in range(6):
        x = 200 + k * 85
        band = Path().M(x, 130).C(x - 30, 300, x - 30, 450, x + 20, 580).L(x + 85, 580).C(x + 55, 450, x + 55, 300, x + 85, 130).Z()
        if k % 2 == 0:
            pat.fill(ink, band, ('dots', 'hatch', 'stars')[k // 2 % 3], 12, ang=90)
        with ink.fig(0, 0, outline=False) as g:
            g.line(band, w=ink.iw)
    ink.clip_end()
    with ink.fig(0, 0, outline=False) as g:
        g.line(env, w=ink.ow)
        g.line(Path().M(352, 570).L(302, 692).M(498, 570).L(548, 692), w=ink.ow * 0.8)
    F(ink, lambda i, x, y, s: cast.pup_peek(i, 'sugarfoot', x, y, s, 'happy', lvl=1, paws=False), (300, 530, 428, 702), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_peek(i, 'tidbit', x, y, s, 'joy', lvl=1, paws=False), (424, 530, 552, 702), 'bottom')
    with ink.fig(425, 690) as g:
        g.part(rrect(-135, 0, 270, 130, 16))
    sh(ink, rrect(290, 740, 270, 20, 0), '#fff', 'lattice', 14, outline=False)
    with ink.fig(0, 0, outline=False) as g:
        g.line(rrect(290, 690, 270, 130, 16), w=ink.iw)
    # hills far below
    po.ground_z(ink, 840, 'leaves', 20, amp=22)
    tiny(ink, 'heart', [(150, 400), (700, 460), (425, 880)])
    extras(ink, 15, (120, 600, 740, 780), 5, avoid=[(260, 560, 600, 760)], kinds=('bird', 'butterfly', 'bird', 'star'))
    po.tree_z(ink, 160, 850, 0.45, '#8FCB7C', 'leaves', 10)
    po.tree_z(ink, 690, 850, 0.4, '#F5A85C', 'scales', 10)
    end(ink)


# 16 ------------------------------------------------------------------------------------------
@scene('Breathe in with the wave. Breathe out as it leaves.', alt='Tidbit and Sugarfoot building a sandcastle at sunset')
def s_beach(ink):
    begin(ink, ['wave', 'dot'])
    po.sun_z(ink, 425, 340, 80)
    po.clouds(ink, [(200, 170, 0.9, 'scales'), (640, 200, 0.8, 'waves')])
    po.water_z(ink, 440, 'waves', 22)
    sand = blob([(FL - 20, 600), (250, 560), (500, 620), (FRt + 20, 570), (FRt + 20, FB + 20), (FL - 20, FB + 20)], k=0.6)
    sh(ink, sand, '#fff', 'dots', 18, box=(0, 640, 900, 930))
    p3.sandcastle(ink, 425, 790, 1.2, 280)
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'happy', lvl=1, arms='up', hat='sun'), (110, 600, 330, 900), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'tidbit', x, y, s, 'joy', lvl=1, arms='up'), (520, 600, 740, 900), 'bottom')
    for (x, y, r) in ((200, 720, 0), (700, 700, 20), (380, 880, 10), (560, 890, -10)):
        p3.shell(ink, x, y, 0.9, r)
    p3.bucket(ink, 340, 890, 0.7)
    tiny(ink, 'heart', [(120, 520), (730, 500), (425, 900)])
    end(ink)


# 17 ------------------------------------------------------------------------------------------
@scene('Watch the fire. Feel your feet on the ground.', alt='Tidbit and Sugarfoot by a campfire in the mountains')
def s_camp_o(ink):
    begin(ink, ['star', 'dot'])
    po.stars_z(ink, 17, 18, (110, 110, 740, 420), avoid=[], size=(8, 15))
    po.moon_z(ink, 640, 190, 50)
    po.mountains(ink, 560, 3, peaks=((200, 240), (440, 330), (660, 230)))
    po.pine_z(ink, 120, 660, 1.5)
    po.pine_z(ink, 740, 650, 1.6)
    po.ground_z(ink, 640, 'leaves', 20, '#A9D98C', 14)
    p2.tent(ink, 640, 790, 0.7, 420, 340, '#fff')
    po.ground_z(ink, 780, 'dots', 22, '#BFE3A0', 10)
    p3.campfire(ink, 425, 880, 1.5)
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'calm', lvl=1, arms='down'), (100, 560, 330, 890), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'tidbit', x, y, s, 'happy', lvl=1, arms='down'), (520, 600, 740, 890), 'bottom')
    p3.marshmallow_stick(ink, 330, 740, 380, 700)
    tiny(ink, 'heart', [(300, 300), (560, 420), (430, 900)])
    tiny(ink, 'paw', [(180, 520)])
    end(ink)


# 18 ------------------------------------------------------------------------------------------
@scene('Share something small. Notice how it feels.', alt='Tidbit and Sugarfoot at a lakeside picnic')
def s_picnic_o(ink):
    begin(ink, ['leaf', 'dot'])
    po.clouds(ink, [(230, 190, 0.9, 'scales'), (620, 230, 0.8, 'waves')])
    po.tree_z(ink, 140, 560, 1.2, '#8FCB7C', 'leaves', 14)
    po.water_z(ink, 440, 'waves', 20)
    pat.fill(ink, Path().M(FL, 440).L(FRt, 440).L(FRt, 520).L(FL, 520).Z(), 'waves', 18)
    shore = blob([(FL - 20, 540), (250, 520), (500, 560), (FRt + 20, 530), (FRt + 20, FB + 20), (FL - 20, FB + 20)], k=0.6)
    sh(ink, shore, '#BFE3A0', 'dots', 22, box=(0, 560, 900, 930))
    p2.blanket(ink, 425, 800, 640, 150, 9, '#fff')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'happy', lvl=1, arms='chest'), (190, 420, 440, 790), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'tidbit', x, y, s, 'happy', lvl=1, arms='chest'), (410, 440, 650, 790), 'bottom')
    p2.basket(ink, 650, 860, 0.8, 190)
    pr.apple(ink, 190, 850, 1.2)
    pr.apple(ink, 250, 870, 0.9)
    po.grass_row(ink, 905, FL, FRt, 22, 12, 18)
    tiny(ink, 'heart', [(500, 300), (130, 840), (720, 560)])
    extras(ink, 18, (300, 130, 740, 420), 6, avoid=[], kinds=('bird', 'butterfly', 'bird', 'cloud'))
    po.flower_z(ink, 120, 770, 0.7, 8, 34, 0, 'dots', False)
    po.flower_z(ink, 730, 700, 0.7, 8, 34, 0, 'rings', False)
    end(ink)


# 19 ------------------------------------------------------------------------------------------
@scene('Hold on gently. The wind will do its work.', alt='Tidbit and Sugarfoot flying a patterned kite on a hill')
def s_kite_o(ink):
    begin(ink, ['wave'])
    po.clouds(ink, [(180, 600, 0.8, 'scales'), (680, 560, 0.7, 'dots')])
    # a big diamond kite
    kx, ky = 430, 330
    kite = rpoly([(kx, ky - 190), (kx + 120, ky - 10), (kx, ky + 150), (kx - 120, ky - 10)], 12)
    sh(ink, kite, '#fff')
    ink.clip_begin(kite)
    for k, (pts, kind) in enumerate((([(kx, ky - 190), (kx + 120, ky - 10), (kx, ky - 10)], 'dots'), ([(kx, ky - 190), (kx - 120, ky - 10), (kx, ky - 10)], 'stars'),
                                     ([(kx - 120, ky - 10), (kx, ky - 10), (kx, ky + 150)], 'hatch'), ([(kx + 120, ky - 10), (kx, ky - 10), (kx, ky + 150)], 'diamonds'))):
        tri = line_pts(pts)
        tri.Z()
        pat.fill(ink, tri, kind, 13, ang=45)
    ink.clip_end()
    with ink.fig(0, 0, outline=False) as g:
        g.line(kite, w=ink.ow)
        g.line(Path().M(kx, ky - 190).L(kx, ky + 150).M(kx - 120, ky - 10).L(kx + 120, ky - 10), w=ink.iw)
    with ink.fig(0, 0, outline=False) as g:
        pts = [(kx, ky + 150), (kx - 30, ky + 210), (kx + 24, ky + 270), (kx - 26, ky + 330)]
        g.line(curve(pts), w=ink.iw)
    for k, (bx, by) in enumerate(((kx - 30, ky + 210), (kx + 24, ky + 270), (kx - 26, ky + 330))):
        with ink.fig(bx, by, 1.0, False, 20 * (k - 1)) as g:
            g.part(blob([(0, 0, 'c'), (-24, -14), (-24, 14), (0, 0, 'c'), (24, -14), (24, 14)], k=0.5), w=ink.dw)
    # hills
    po.ground_z(ink, 640, 'waves', 22, '#BFE3A0', 26)
    po.ground_z(ink, 780, 'leaves', 20, '#A9D98C', 18)
    with ink.fig(0, 0, outline=False) as g:
        g.line(curve([(500, ky + 100), (560, 520), (520, 640), (560, 740)]), w=ink.dw)
    for (x, y, w) in ((130, 450, 150), (580, 160, 130), (150, 190, 120)):
        po.swirl_wind(ink, x, y, w)
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'happy', lvl=1, arms='up'), (130, 560, 380, 890), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_side(i, 'tidbit', x, y, s, 'walk', 'wow', lvl=1, turn=0.2, tail_up=1.3), (400, 650, 740, 890), 'bottom')
    tiny(ink, 'heart', [(250, 360), (680, 440), (430, 890)])
    extras(ink, 19, (120, 130, 740, 560), 6, avoid=[(300, 120, 560, 520)], kinds=('bird', 'butterfly', 'bird', 'star', 'cloud'))
    p3.bird_plain(ink, 640, 300, 0.9)
    end(ink)


# 20 ------------------------------------------------------------------------------------------
@scene('Open the gate. Take a step when you are ready.', alt='Tidbit and Sugarfoot peeking through a garden gate')
def s_gate(ink):
    begin(ink, ['leaf', 'petal'])
    po.sun_z(ink, 600, 220, 54)
    po.clouds(ink, [(220, 190, 0.9, 'scales')])
    po.ground_z(ink, 700, 'leaves', 20)
    # an arched gate with vines
    arch = blob([(190, 880, 'c'), (190, 420), (240, 260), (425, 200), (610, 260), (660, 420), (660, 880, 'c'), (620, 880, 'c'), (620, 430), (580, 300), (425, 250), (270, 300), (230, 430), (230, 880, 'c')], k=0.6)
    sh(ink, arch, '#fff', 'diamonds', 14, box=(180, 200, 680, 700))
    for k in range(6):
        a = math.radians(200 + k * 28)
        with ink.fig(0, 0) as g:
            lf = g.view(425 + math.cos(a) * 215, 440 + math.sin(a) * 235, 1.2, False, math.degrees(a) + 90)
            lf.part(blob([(0, 0, 'c'), (14, -10), (32, 0, 'c'), (14, 10)], k=1.0), w=ink.dw)
    for (x, y) in ((250, 330), (600, 340), (425, 215), (330, 250), (520, 250)):
        po.flower_z(ink, x, y, 0.45, 6, 30, 0, 'dots', False)
    F(ink, lambda i, x, y, s: cast.pup_peek(i, 'tidbit', x, y, s, 'happy', lvl=1, paws=True), (250, 560, 430, 800), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_peek(i, 'sugarfoot', x, y, s, 'calm', lvl=1, paws=True), (420, 560, 600, 800), 'bottom')
    # the gate doors (open a little) and the path
    for sgn in (-1, 1):
        with ink.fig(425 + sgn * 160, 880) as g:
            g.part(blob([(-34 * sgn, 0, 'c'), (-34 * sgn, -170), (34 * sgn, -180), (34 * sgn, 0, 'c')], k=0.3))
            for yy in (-130, -85, -40):
                g.line(Path().M(-30 * sgn, yy).L(30 * sgn, yy), w=ink.dw * 0.9)
    path = blob([(300, 912, 'c'), (380, 800), (470, 800), (550, 912, 'c')], k=0.6)
    sh(ink, path, '#fff', 'bricks', 14)
    for (x, h, R) in ((130, 220, 36), (730, 250, 38)):
        po.flower_z(ink, x, 900 - h, 1.0, 8, R, h, 'rings')
    tiny(ink, 'heart', [(425, 150), (300, 840), (560, 700)])
    end(ink)


# 21 ------------------------------------------------------------------------------------------
@scene('Count three stars. Then count three breaths.', alt='Tidbit and Sugarfoot asleep on a hill under a huge starry sky')
def s_starry(ink):
    begin(ink, ['star', 'dot'])
    po.stars_z(ink, 21, 26, (110, 110, 740, 520), avoid=[(250, 140, 600, 360)], size=(8, 17))
    pat.mandala(ink, 425, 250, 110, 3, 12)
    # constellations
    with ink.fig(0, 0, outline=False) as g:
        g.line(Path().M(140, 200).L(210, 160).L(280, 240).L(210, 300), w=ink.dw, dash='1 7')
        g.line(Path().M(620, 170).L(690, 230).L(660, 320).L(720, 380), w=ink.dw, dash='1 7')
    for (x, y) in ((140, 200), (210, 160), (280, 240), (210, 300), (620, 170), (690, 230), (660, 320), (720, 380)):
        pr.star5(ink, x, y, 11, 8)
    po.ground_z(ink, 600, 'leaves', 22, '#A9D98C', 40)
    po.ground_z(ink, 760, 'dots', 20, '#BFE3A0', 16)
    p2.pillow(ink, 425, 770, 1.0, 520, 190, '#fff', 0)
    F(ink, lambda i, x, y, s: cast.pup_peek(i, 'sugarfoot', x, y, s, 'sleep', lvl=1, paws=False, tilt=-6), (110, 540, 440, 800), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_peek(i, 'tidbit', x, y, s, 'sleep', lvl=1, paws=False, tilt=6), (410, 540, 740, 800), 'bottom')
    sh(ink, blob([(FL - 20, 870), (300, 830), (520, 870), (FRt + 20, 840), (FRt + 20, FB + 20), (FL - 20, FB + 20)], k=0.6), '#fff', 'scales', 18, box=(0, 850, 900, 930))
    tiny(ink, 'heart', [(500, 440), (160, 700), (690, 690)])
    po.stars_z(ink, 210, 10, (120, 380, 740, 580), avoid=[], size=(7, 11))
    for (x, y) in ((140, 600), (700, 590)):
        pr.tuft(ink, x, y + 40, 1.0)
    p2.crescent(ink, 650, 360, 40, -20)
    for (x, y) in ((200, 880), (600, 885)):
        po.flower_z(ink, x, y - 30, 0.5, 6, 30, 30, 'dots', False)
    end(ink)


# 22 ------------------------------------------------------------------------------------------
@scene('Still water, still mind. Take your time.', alt='Tidbit and Sugarfoot by a lily pond')
def s_pond(ink):
    begin(ink, ['wave', 'dot'])
    po.clouds(ink, [(220, 180, 0.9, 'scales'), (630, 230, 0.8, 'dots')])
    po.sun_z(ink, 430, 360, 56)
    po.ground_z(ink, 480, 'leaves', 20, '#A9D98C', 12)
    pond = blob([(FL - 20, 640), (200, 560), (425, 600), (650, 560), (FRt + 20, 640), (FRt + 20, FB + 20), (FL - 20, FB + 20)], k=0.5)
    sh(ink, pond, '#BFE0F7', 'waves', 24, box=(0, 640, 900, 930))
    for (x, y, rx) in ((200, 700, 90), (640, 680, 80), (430, 830, 110), (160, 860, 70), (700, 850, 80)):
        p2.lily = None
        with ink.fig(x, y) as g:
            g.part(ell(0, 0, rx, rx * 0.3))
            g.line(Path().M(0, 0).L(rx * 0.9, -rx * 0.08), w=ink.dw * 0.8)
    for (x, y) in ((200, 690), (640, 670), (430, 820)):
        with ink.fig(x, y, 0.7) as g:
            for (ang, ln) in ((-62, 36), (62, 36), (-32, 44), (32, 44), (0, 50)):
                v = g.view(0, 0, 1, False, ang)
                v.part(blob([(0, 0, 'c'), (-10, -ln * 0.45), (0, -ln, 'c'), (10, -ln * 0.45)], k=1.0), w=ink.dw)
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'calm', lvl=1, arms='down', tilt=-5), (130, 450, 400, 760), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'tidbit', x, y, s, 'wow', lvl=1, arms='down', tilt=5, look=(0, 3)), (440, 460, 700, 760), 'bottom')
    for (x, y) in ((250, 330), (580, 440)):
        p3.butterfly_plain(ink, x, y, 0.55, 10)
    tiny(ink, 'heart', [(120, 600), (730, 620), (425, 900)])
    tiny(ink, 'paw', [(560, 880)])
    end(ink)


# 23 ------------------------------------------------------------------------------------------
@scene('Move your shoulders. Let the music in.', alt='Tidbit dancing on a stage with Sugarfoot clapping')
def s_stage(ink):
    begin(ink, ['diamond', 'dot'])
    # stage curtains
    for sgn in (-1, 1):
        cx = 425 + sgn * 300
        C = blob([(cx - sgn * 60, 100, 'c'), (cx + sgn * 60, 100, 'c'), (cx + sgn * 50, 400), (cx - sgn * 10, 560), (cx + sgn * 56, 800, 'c'), (cx - sgn * 70, 800, 'c'), (cx - sgn * 50, 500), (cx - sgn * 70, 300)], k=0.9)
        sh(ink, C, '#fff', 'hatch', 12, 90)
    valance = blob([(92, 100, 'c'), (758, 100, 'c'), (758, 160, 'c'), (640, 190), (520, 150), (425, 190), (330, 150), (210, 190), (92, 160, 'c')], k=0.4)
    sh(ink, valance, '#fff', 'scales', 12, box=(0, 100, 900, 190))
    p2.lights(ink, [(150, 230), (300, 280), (425, 240), (550, 280), (700, 230)], 7)
    for (x, y, r, d) in ((200, 380, 1.4, True), (650, 360, 1.5, False), (150, 560, 1.2, False), (710, 540, 1.3, True)):
        p3.music_note(ink, x, y, r, 10, d)
    # the stage boards
    stage = Path().M(FL, 760).L(FRt, 760).L(FRt, FB).L(FL, FB).Z()
    sh(ink, stage, '#fff', 'bricks', 40, outline=False, box=(0, 790, 900, 930))
    with ink.fig(0, 0) as g:
        g.part(rrect(92, 750, 666, 26, 4))
    F(ink, lambda i, x, y, s: cast.pup_dance(i, 'tidbit', x, y, s, 'joy', lvl=1, kick=1), (290, 280, 620, 760), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'happy', lvl=1, arms='up'), (110, 520, 330, 880), 'bottom')
    tiny(ink, 'heart', [(500, 220), (200, 690), (700, 830)])
    end(ink)


# 24 ------------------------------------------------------------------------------------------
@scene('Plants grow slowly. So do you.', alt='Tidbit and Sugarfoot in a greenhouse full of plants')
def s_greenhouse(ink):
    begin(ink, ['leaf'])
    glass = blob([(110, 620, 'c'), (110, 300), (190, 150), (425, 110), (660, 150), (740, 300), (740, 620, 'c')], k=0.7)
    sh(ink, glass, '#fff', 'lattice', 56, box=(0, 100, 900, 640), outline=True)
    for k, x in enumerate((180, 280, 380, 470, 570, 670)):
        po.potted(ink, x, 330 + (k % 2) * 6, 0.45) if False else None
    # hanging pots
    for (x, y) in ((220, 220), (425, 200), (630, 230)):
        with ink.fig(x, y) as g:
            g.line(Path().M(0, -60).L(0, 0).M(-30, 0).L(0, -60).M(30, 0).L(0, -60), w=ink.dw * 0.8)
            g.part(blob([(-34, 0, 'c'), (34, 0, 'c'), (24, 40, 'c'), (-24, 40, 'c')], k=0.2))
            for (a, b) in ((-30, 60), (-12, 80), (10, 74), (28, 56)):
                g.part(blob([(0, 36, 'c'), (a * 0.8, 36 + b * 0.5), (a, 36 + b, 'c'), (a * 0.5 + 6, 36 + b * 0.5)], k=1.0), w=ink.dw)
    # benches with pots
    sh(ink, rrect(92, 640, 666, 272, 0), '#fff', 'bricks', 26, outline=False)
    with ink.fig(0, 0) as g:
        g.part(rrect(92, 630, 666, 22, 4))
    for x, k in ((150, 0), (700, 1), (170, 800), (690, 800)):
        po.potted(ink, x, 628 if x in (150, 700) else 905, 0.8)
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'happy', lvl=1, arms='chest', hat='sun'), (220, 400, 440, 800), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'tidbit', x, y, s, 'happy', lvl=1, arms='up'), (420, 420, 640, 800), 'bottom')
    pr.watering_can(ink, 450, 900, 0.9)
    tiny(ink, 'heart', [(160, 420), (700, 440), (425, 870)])
    end(ink)


# 25 ------------------------------------------------------------------------------------------
@scene('From up here, small things look small.', alt='Tidbit and Sugarfoot on a rooftop above a sleepy city')
def s_roof(ink):
    begin(ink, ['star', 'dot'])
    po.stars_z(ink, 25, 18, (110, 110, 740, 420), avoid=[], size=(8, 15))
    po.moon_z(ink, 600, 220, 64)
    # the skyline
    for k, (x, w, h) in enumerate(((140, 100, 220), (250, 90, 300), (350, 110, 180), (480, 100, 260), (590, 120, 200), (700, 90, 280))):
        B = rrect(x - w / 2, 640 - h, w, h, 4)
        sh(ink, B, '#fff', 'lattice' if k % 2 else 'bricks', 14, box=(0, 640 - h * 0.7, 900, 640), outline=True)
        for r in range(int(h // 60)):
            for q in range(int(w // 36)):
                with ink.fig(x - w / 2 + 16 + q * 34, 640 - h + 20 + r * 56) as g:
                    g.part(rrect(0, 0, 16, 24, 2), w=ink.dw)
    # the roof tiles
    roof = Path().M(FL, 640).L(FRt, 640).L(FRt, FB).L(FL, FB).Z()
    sh(ink, roof, '#fff', 'scales', 22, outline=True, box=(0, 650, 900, 930))
    with ink.fig(560, 650) as g:
        g.part(rrect(-30, -120, 60, 130, 4))
        g.part(rrect(-38, -140, 76, 24, 4))
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'calm', lvl=1, arms='chest'), (150, 470, 400, 860), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'tidbit', x, y, s, 'wow', lvl=1, arms='down', look=(0, -3)), (400, 490, 640, 860), 'bottom')
    tiny(ink, 'heart', [(300, 250), (700, 460), (425, 900)])
    tiny(ink, 'paw', [(180, 870)])
    end(ink)


# 26 ------------------------------------------------------------------------------------------
@scene('Blow out slowly. Watch the bubble float.', alt='Tidbit and Sugarfoot blowing giant patterned bubbles')
def s_bubbles_o(ink):
    begin(ink, ['ring', 'dot'])
    po.ground_z(ink, 780, 'dots', 20, amp=20)
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'wow', lvl=1, mouth='o', arms='up', tilt=-5), (110, 560, 340, 900), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'tidbit', x, y, s, 'joy', lvl=1, arms='both_up', tilt=5), (500, 580, 730, 900), 'bottom')
    p3.wand(ink, 340, 650, 0.9, 30)
    for (x, y, r, kind) in ((300, 330, 120, 'mandala'), (560, 230, 80, 'rings'), (640, 470, 64, 'stars'), (180, 180, 60, 'dots'), (430, 560, 50, 'swirls'), (700, 220, 36, 'hatch'), (140, 440, 40, 'waves')):
        c = circ(x, y, r)
        sh(ink, c, '#EAF4FF', None if kind == 'mandala' else kind, 12)
        if kind == 'mandala':
            pat.mandala(ink, x, y, r * 0.85, 3, 12)
        with ink.fig(x, y, outline=False) as g:
            g.line(curve([(-r * 0.7, -r * 0.2), (-r * 0.62, -r * 0.55), (-r * 0.25, -r * 0.7)]), w=ink.dw * 1.4)
    tiny(ink, 'heart', [(450, 150), (120, 720), (720, 800)])
    end(ink)


# 27 ------------------------------------------------------------------------------------------
@scene('Shake it up, then watch it settle.', alt='Tidbit and Sugarfoot inside a snow globe')
def s_globe(ink):
    begin(ink, ['star', 'diamond'])
    # the globe and its base
    gl = circ(425, 440, 300)
    sh(ink, gl, '#EAF4FF')
    ink.clip_begin(gl)
    po.ground_z(ink, 640, 'dots', 18, '#fff', 20)
    rnd = random.Random(27)
    for k in range(18):
        pr.snowflake(ink, rnd.uniform(150, 700), rnd.uniform(180, 600), rnd.uniform(9, 16), rnd.uniform(0, 60))
    po.pine_z(ink, 220, 650, 1.2, True)
    po.pine_z(ink, 650, 650, 1.0, True)
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'happy', lvl=1, arms='chest', scarf=True), (270, 430, 440, 700), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'tidbit', x, y, s, 'joy', lvl=1, arms='up', scarf=True), (420, 430, 590, 700), 'bottom')
    ink.clip_end()
    with ink.fig(0, 0, outline=False) as g:
        g.line(circ(425, 440, 300), w=ink.ow * 1.3)
        g.line(curve([(240, 260), (290, 190), (380, 160)]), w=ink.dw * 1.8)
    base = blob([(200, 740, 'c'), (650, 740, 'c'), (700, 850, 'c'), (150, 850, 'c')], k=0.2)
    sh(ink, base, '#fff', 'diamonds', 18)
    with ink.fig(0, 0) as g:
        g.part(rrect(130, 846, 590, 30, 8))
    tiny(ink, 'heart', [(300, 600), (560, 560), (425, 810)])
    end(ink)


# 28 ------------------------------------------------------------------------------------------
@scene('Fold the day up. Tuck it in. Goodnight.', alt='Tidbit and Sugarfoot asleep in a bed under a patchwork quilt')
def s_bedtime_o(ink):
    begin(ink, ['star', 'dot'])
    win = blob([(280, 330, 'c'), (280, 200), (340, 130), (425, 110), (510, 130), (570, 200), (570, 330, 'c')], k=0.8)
    sh(ink, win, '#fff')
    p2.crescent(ink, 420, 230, 42, -20)
    po.stars_z(ink, 28, 4, (300, 140, 550, 320), size=(6, 10))
    with ink.fig(0, 0, outline=False) as g:
        g.line(Path().M(425, 110).L(425, 330).M(280, 250).L(570, 250), w=ink.ow * 0.8)
        g.line(win, w=ink.ow * 1.3)
    po.stars_z(ink, 29, 10, (110, 110, 740, 400), avoid=[(260, 100, 600, 340)], size=(7, 12))
    # headboard, pillows, quilt
    hb = blob([(130, 640, 'c'), (130, 440), (170, 380), (680, 380), (720, 440), (720, 640, 'c')], k=0.4)
    sh(ink, hb, '#fff', 'petals', 20, box=(130, 380, 720, 520))
    po.cushion(ink, 330, 560, 250, 120, 'dots', 0)
    po.cushion(ink, 520, 560, 250, 120, 'stars', 0)
    F(ink, lambda i, x, y, s: cast.pup_peek(i, 'sugarfoot', x, y, s, 'sleep', lvl=1, paws=False, tilt=-6), (200, 440, 430, 640), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_peek(i, 'tidbit', x, y, s, 'sleep', lvl=1, paws=False, tilt=6), (420, 440, 650, 640), 'bottom')
    quilt = blob([(110, 700, 'c'), (200, 650), (425, 640), (650, 650), (740, 700, 'c'), (750, 900, 'c'), (100, 900, 'c')], k=0.4)
    with ink.fig(0, 0) as g:
        g.part(quilt)
    ink.clip_begin(quilt)
    kinds = ['dots', 'hatch', 'stars', 'waves', 'diamonds', 'rings', 'lattice', 'scales']
    for r in range(3):
        for q in range(6):
            cell = rrect(100 + q * 110, 660 + r * 80, 110, 80, 0)
            pat.fill(ink, cell, kinds[(q + r * 3) % 8], 10, ang=45) if (q + r) % 2 == 0 else None
            with ink.fig(0, 0, outline=False) as g:
                g.line(cell, w=ink.iw)
    ink.clip_end()
    with ink.fig(0, 0, outline=False) as g:
        g.line(quilt, w=ink.ow)
    tiny(ink, 'heart', [(150, 300), (700, 300), (425, 880)])
    end(ink)


# 29 ------------------------------------------------------------------------------------------
@scene('Turn your face toward what feels warm.', alt='Tidbit and Sugarfoot among giant sunflowers')
def s_sunflowers(ink):
    begin(ink, ['petal', 'dot'])
    po.sun_z(ink, 425, 220, 70)
    po.clouds(ink, [(190, 150, 0.7, 'scales'), (660, 170, 0.7, 'waves')])
    po.ground_z(ink, 700, 'leaves', 20, amp=18)
    for (x, h, s_) in ((150, 520, 1.3), (330, 330, 0.9), (550, 360, 0.9), (700, 500, 1.2)):
        p3.sunflower(ink, x, 910, s_, h)
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'happy', lvl=1, arms='chest', hat='sun'), (230, 520, 440, 890), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'tidbit', x, y, s, 'joy', lvl=1, arms='up'), (420, 540, 640, 890), 'bottom')
    for (x, y, r) in ((240, 420, 10), (610, 480, -20)):
        p3.butterfly_plain(ink, x, y, 0.55, r)
    tiny(ink, 'heart', [(300, 380), (560, 330), (425, 900)])
    end(ink)


# 30 ------------------------------------------------------------------------------------------
@scene('Drift along. You do not have to paddle.', alt='Tidbit and Sugarfoot drifting in a small boat past trees and reeds')
def s_river(ink):
    begin(ink, ['wave', 'leaf'])
    po.clouds(ink, [(220, 180, 0.8, 'scales'), (640, 150, 0.7, 'dots')])
    po.ground_z(ink, 470, 'leaves', 20, '#A9D98C', 12)
    po.tree_z(ink, 190, 520, 1.15, '#8FCB7C', 'leaves', 14)
    po.tree_z(ink, 620, 500, 1.0, '#F5A85C', 'scales', 14)
    for (x, h) in ((380, 90), (410, 120), (480, 100), (730, 110), (760, 80)):
        with ink.fig(x, 560, 1.0) as g:
            g.line(curve([(0, 0), (3, -h * 0.5), (0, -h)]), w=ink.iw * 1.2)
            g.part(rrect(-6, -h - 34, 12, 38, 6))
    po.water_z(ink, 560, 'waves', 20)
    hull = blob([(200, 700, 'c'), (650, 700, 'c'), (590, 790, 'c'), (260, 790, 'c')], k=0.4)
    sh(ink, hull, '#fff', 'scales', 14, box=(200, 740, 650, 790))
    F(ink, lambda i, x, y, s: cast.pup_peek(i, 'sugarfoot', x, y, s, 'calm', lvl=1, paws=True), (230, 540, 430, 720), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_peek(i, 'tidbit', x, y, s, 'happy', lvl=1, paws=True), (430, 540, 630, 720), 'bottom')
    sh(ink, blob([(FL - 20, 820), (300, 800), (520, 840), (FRt + 20, 810), (FRt + 20, FB + 20), (FL - 20, FB + 20)], k=0.6), '#fff', 'waves', 18, box=(0, 820, 900, 930))
    tiny(ink, 'heart', [(150, 640), (700, 640), (425, 880)])
    extras(ink, 30, (120, 120, 740, 330), 5, avoid=[(130, 120, 330, 330), (480, 150, 740, 330)], kinds=('bird', 'butterfly', 'bird', 'star'))
    p3.bird_plain(ink, 400, 190, 0.9)
    for (x, y) in ((150, 880), (700, 880), (440, 900)):
        pr.tuft(ink, x, y, 1.0)
    end(ink)


# 31 ------------------------------------------------------------------------------------------
@scene('A hug is a good place to breathe.', alt='Tidbit and Sugarfoot hugging inside a big flower mandala')
def s_hug_o(ink):
    begin(ink, ['heart', 'dot'])
    pat.mandala(ink, 425, 500, 330, 6, 16)
    with ink.fig(425, 500, outline=False) as g:
        pass
    disk = circ(425, 500, 235)
    sh(ink, disk, '#fff')
    F(ink, lambda i, x, y, s: cast.pup_hug(i, x, y, s, 'happy', 'sleep', 1), (225, 320, 625, 700), 'bottom')
    for (x, y, r) in ((140, 180, 14), (710, 200, 12), (150, 840, 16), (700, 830, 14)):
        pr.heart(ink, x, y, r, 8)
    tiny(ink, 'heart', [(425, 150), (190, 600), (660, 580)])
    tiny(ink, 'paw', [(425, 880)])
    end(ink)


# 32 ------------------------------------------------------------------------------------------
@scene('You are home. Take a deep breath.', alt='Tidbit and Sugarfoot in front of their cottage and garden')
def s_home_o(ink):
    begin(ink, ['leaf', 'dot'])
    po.sun_z(ink, 640, 210, 54)
    po.clouds(ink, [(220, 190, 0.9, 'scales')])
    po.ground_z(ink, 560, 'leaves', 20, '#A9D98C', 14)
    po.house_z(ink, 425, 700, 1.7, 220, 160, '#E8806F', True, 2, True)
    po.tree_z(ink, 150, 690, 1.1, '#8FCB7C', 'leaves', 14)
    po.tree_z(ink, 720, 690, 1.0, '#8FCB7C', 'scales', 14)
    path = blob([(360, 912, 'c'), (400, 780), (425, 700), (450, 780), (490, 912, 'c')], k=0.6)
    sh(ink, path, '#fff', 'bricks', 14)
    po.ground_z(ink, 800, 'dots', 22, '#BFE3A0', 10)
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'tidbit', x, y, s, 'happy', lvl=1, arms='up'), (110, 600, 330, 900), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'happy', lvl=1, arms='down'), (520, 620, 740, 900), 'bottom')
    for (x, h, R) in ((350, 100, 28), (500, 90, 26)):
        po.flower_z(ink, x, 900 - h, 0.9, 8, R, h, 'dots')
    tiny(ink, 'heart', [(300, 330), (560, 400), (425, 900)])
    tiny(ink, 'paw', [(130, 540)])
    extras(ink, 132, (140, 120, 560, 330), 4, avoid=[(140, 120, 360, 280)], kinds=('bird', 'butterfly', 'bird', 'cloud'))
    end(ink)
