#!/usr/bin/env python3
"""younger2.py: the 32 scenes of the younger coloring book, starring only Tidbit and Sugarfoot (kids29)."""
import math
import random
from cute import *
import cast
import props as pr
import props2 as p2
import props3 as p3
from cast import K

FR = (62, 58, 726, 884)   # the picture frame: x, y, w, h
FL, FT, FRt, FB = FR[0], FR[1], FR[0] + FR[2], FR[1] + FR[3]


def new_ink(seed=1):
    return Ink(ow=6.2, iw=3.7, dw=3.1, wob=0.5, wob_lo=0.8, step=5.0, seed=seed)


def frame_begin(ink, r=48, rect=None):
    ink._frame = rect or FR
    ink.clip_begin(rrect(*ink._frame, r))


def frame_end(ink, r=48, w=None):
    ink.clip_end()
    with ink.fig(0, 0, 1.0, outline=False) as g:
        g.line(rrect(*ink._frame, r), w=w or ink.ow * 1.25)


def F(ink, fn, box, anchor='bottom', maxs=None):
    return fit(ink, fn, box, anchor, maxs)


def hills(ink, y1=700, y2=790, c1='#BFE3A0', c2='#A9D98C', deco=True):
    x0, x1 = FL - 30, FRt + 30
    bot = FB + 30
    pr.hill(ink, [(x0, y1 + 20), (x0 + 220, y1 - 30), (x0 + 480, y1 + 30), (x0 + 700, y1 - 20), (x1, y1 + 16)], bottom=bot, c=c1)
    if y2:
        pr.hill(ink, [(x0, y2 + 14), (x0 + 260, y2 - 20), (x0 + 520, y2 + 22), (x1, y2 - 10)], bottom=bot, c=c2)


def ground_deco(ink, seed, ymin, ymax, avoid=(), n=8, kinds=('tuft', 'flower', 'tuft', 'pebble'), sc=(1.0, 1.4)):
    rnd = random.Random(seed)
    placed = []
    tries = 0
    while len(placed) < n and tries < 300:
        tries += 1
        x = rnd.uniform(FL + 40, FRt - 40)
        y = rnd.uniform(ymin, ymax)
        if any(a[0] <= x <= a[2] and a[1] <= y <= a[3] for a in avoid):
            continue
        if any(math.hypot(x - p[0], y - p[1]) < 90 for p in placed):
            continue
        placed.append((x, y))
        k = rnd.choice(kinds)
        s_ = rnd.uniform(*sc)
        if k == 'tuft':
            pr.tuft(ink, x, y, s_)
        elif k == 'flower':
            pr.flower(ink, x, y - 36 * s_, s_ * 0.9, petals=5 + int(x) % 2, stem=36 * s_ / 0.9 * 0.9, c=('#F7A8C2', '#FFE08A', '#B79CEB', '#F7A8C2')[int(x) % 4])
        else:
            pr.pebble(ink, x, y, s_ * 0.7)


def hide(ink, kind, pts, size=1.0):
    """the things to find: small, closed, colorable, tucked into the picture"""
    for (x, y) in pts:
        if kind == 'heart':
            pr.heart(ink, x, y, 15 * size, 10)
        elif kind == 'star':
            pr.star5(ink, x, y, 17 * size, 8)
        elif kind == 'bone':
            p3.bone(ink, x, y, 0.55 * size, -15)
        elif kind == 'ball':
            p3.ball(ink, x, y, 20 * size)
        elif kind == 'butterfly':
            p3.butterfly_plain(ink, x, y, 0.5 * size, -15)
        elif kind == 'shell':
            p3.shell(ink, x, y, 0.8 * size, 10)
        elif kind == 'apple':
            pr.apple(ink, x, y, 0.6 * size)
        elif kind == 'cupcake':
            pr.cupcake(ink, x, y, 0.5 * size)
        elif kind == 'balloon':
            pr.balloon(ink, x, y, 0.45 * size, '#FFFFFF', 30, 0)
        elif kind == 'sock':
            pass


SCENES = []
META = []


def scene(caption, game=None, banner='ribbon', alt='', badge='r'):
    def deco(fn):
        SCENES.append(fn)
        META.append(dict(caption=caption, game=game, banner=banner, alt=alt or caption, name=fn.__name__, badge=badge))
        return fn
    return deco


# 1 -------------------------------------------------------------------------------------------
@scene('Zoom! My ears have wings!', alt='Tidbit zooming across a hill under a rainbow')
def s_zoom(ink):
    frame_begin(ink)
    pr.rainbow(ink, 425, 720, 330, 4, 36)
    pr.puff(ink, 150, 250, 0.9, n=4)
    pr.puff(ink, 690, 210, 0.8, n=3)
    pr.sun(ink, 720, 420, 38)
    hills(ink, 690, 790)
    for (x, y) in ((560, 120), (260, 130), (330, 190)):
        p3.bird_plain(ink, x, y, 1.0)
    pr.speed_lines(ink, 150, 590, 3, 120, 44)
    pr.dust(ink, 200, 870, 1.5, 3)
    F(ink, lambda i, x, y, s: cast.pup_side(i, 'tidbit', x, y, s, 'run', 'happy'), (100, 400, 770, 880), 'bottom')
    ground_deco(ink, 1, 860, 925, [(80, 380, 780, 900)], 4)
    frame_end(ink)


# 2 -------------------------------------------------------------------------------------------
@scene('Free hugs! Line up, please.', game='Find 3 butterflies!', alt='Sugarfoot with her arms open wide for a hug, hearts and flowers around her')
def s_hugs(ink):
    frame_begin(ink)
    pr.puff(ink, 190, 190, 0.8, n=4)
    pr.puff(ink, 650, 140, 0.7, n=3)
    for (x, h, c) in ((120, 520, '#F7A8C2'), (730, 480, '#FFE08A')):
        pr.flower(ink, x, 930 - h, 1.8, petals=6, stem=h, c=c, cc='#FFD060')
    hills(ink, 750, 830)
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'happy', arms='wide', wag=1.0), (150, 260, 700, 890), 'bottom')
    for (x, y, r, rot) in ((200, 170, 28, -15), (690, 330, 26, 18), (340, 130, 20, 10), (600, 210, 22, -8), (430, 120, 30, 5), (110, 360, 20, 8)):
        pr.heart(ink, x, y, r, rot)
    hide(ink, 'butterfly', [(660, 560), (205, 640), (560, 130)], 1.0)
    ground_deco(ink, 2, 870, 930, [(140, 780, 700, 900)], 4)
    frame_end(ink)


# 3 -------------------------------------------------------------------------------------------
@scene('Best friends share the sky.', game='Find 3 hearts!', alt='Tidbit and Sugarfoot sitting together under a rainbow')
def s_friends(ink):
    frame_begin(ink)
    pr.rainbow(ink, 425, 760, 340, 4, 38)
    pr.puff(ink, 120, 640, 1.0, n=3)
    pr.puff(ink, 730, 640, 1.0, n=3)
    hills(ink, 750, 830)
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'happy', tilt=-6, arms='chest'), (330, 300, 790, 910), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'tidbit', x, y, s, 'happy', tilt=-6, arms='up', flip=True), (60, 300, 520, 910), 'bottom')
    pr.heart(ink, 425, 190, 50, 0)
    hide(ink, 'heart', [(150, 780), (700, 300), (110, 380)], 1.0)
    ground_deco(ink, 3, 890, 935, [(60, 780, 790, 900)], 3)
    frame_end(ink)

# 4 -------------------------------------------------------------------------------------------
@scene('Chapter one: nap. Chapter two: more nap.', alt='Sugarfoot in round glasses reading a big book under the stars')
def s_read(ink):
    frame_begin(ink)
    p2.crescent(ink, 150, 200, 70, -15)
    p2.sprinkles(ink, 4, 9, (100, 100, 760, 480), avoid=[(60, 120, 270, 300), (150, 330, 700, 900)], kinds=('star', 'sparkle', 'dot'), size=(12, 22), minsep=90)
    hills(ink, 800, 870, '#A9D98C', '#8FCB7C')
    p3.lamp(ink, 735, 900, 1.2)
    # a stack of books
    with ink.fig(110, 905) as g:
        g.part(rrect(-70, -36, 140, 36, 6), c='#F2877E')
        g.part(rrect(-60, -70, 120, 34, 6), c='#8FCBF0')
        g.part(rrect(-52, -100, 104, 30, 6), c='#F7D56A')
        for yy in (-18, -52, -84):
            g.line(Path().M(-50, yy).L(50, yy), w=ink.dw * 0.8)
    gg, sc = F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'happy', look=(0, 6), arms='chest', tilt=-3), (190, 250, 660, 800), 'bottom')
    p3.book(ink, 425, 915, 1.2, 440, 260)
    # her paws rest on the pages, and her glasses
    for sgn in (-1, 1):
        with ink.fig(425 + sgn * 170, 700) as g:
            g.part(ell(0, 0, 36, 28), c='#FFFFFF')
            paw_ = g.view(0, 0)
            paw_.line(Path().M(-8, -2).L(-8, 12), w=ink.dw * 0.8)
            paw_.line(Path().M(8, -2).L(8, 12), w=ink.dw * 0.8)
    hx = gg.m[4]
    with ink.fig(gg.m[4], gg.m[5], sc, outline=False) as g:
        p3.glasses(g, 2)
    frame_end(ink)

# 5 -------------------------------------------------------------------------------------------
@scene('My feet have the wiggles!', alt='Tidbit dancing on his back legs with music notes')
def s_dance(ink):
    frame_begin(ink)
    for (x, y, r) in ((140, 180, 1.0), (700, 150, 0.9)):
        p3.music_note(ink, x, y, 1.6, 10, double=True)
    p3.music_note(ink, 110, 520, 1.5, -10)
    p3.music_note(ink, 730, 460, 1.7, 12)
    p3.music_note(ink, 190, 330, 1.2, 6)
    p3.music_note(ink, 640, 300, 1.2, -8, True)
    hills(ink, 820, 890, '#F5EAD6', '#E8D5B0')
    F(ink, lambda i, x, y, s: cast.pup_dance(i, 'tidbit', x, y, s, 'joy', kick=1), (140, 220, 710, 900), 'bottom')
    p2.sprinkles(ink, 5, 8, (100, 200, 760, 800), avoid=[(150, 230, 700, 900)], kinds=('star', 'sparkle'), size=(12, 20), minsep=80)
    frame_end(ink)


# 6 -------------------------------------------------------------------------------------------
@scene('Digging for treasure. Found: me.', game='Find 3 bones!', alt='Tidbit digging a hole with dirt flying')
def s_dig(ink):
    frame_begin(ink)
    pr.puff(ink, 190, 190, 1.0, n=4)
    pr.puff(ink, 520, 150, 0.8, n=3)
    hills(ink, 600, 700, '#E8D5B0', '#D9BF8C')
    p3.hole(ink, 425, 870, 270, 62)
    F(ink, lambda i, x, y, s: cast.pup_peek(i, 'tidbit', x, y, s, 'joy', paws=True), (150, 290, 700, 830), 'bottom', maxs=2.45)
    for (x, y, r) in ((130, 520, 30), (230, 420, 22), (80, 380, 16), (720, 480, 28), (620, 390, 20), (770, 400, 14), (170, 650, 18), (700, 640, 18), (330, 300, 14), (520, 290, 12)):
        p3.dirt_clump(ink, x, y, r)
    with ink.fig(0, 0, outline=False) as g:
        g.line(curve([(200, 660), (170, 580), (140, 520)]), w=ink.dw * 0.9, dash='3 10')
        g.line(curve([(650, 660), (690, 580), (720, 520)]), w=ink.dw * 0.9, dash='3 10')
    p3.shovel(ink, 740, 930, 1.3, 14)
    hide(ink, 'bone', [(150, 780), (590, 780), (640, 690)], 1.3)
    ground_deco(ink, 6, 905, 935, [], 2, kinds=('tuft',))
    frame_end(ink)


# 7 -------------------------------------------------------------------------------------------
@scene('Next stop: the Moon! Pack snacks.', game='Find 4 stars!', alt='Tidbit and Sugarfoot looking out of the windows of a rocket')
def s_rocket(ink):
    frame_begin(ink)
    p2.sprinkles(ink, 7, 14, (90, 100, 760, 800), avoid=[(200, 100, 650, 800)], kinds=('star', 'sparkle', 'dot'), size=(12, 24), minsep=80)
    p2.planet(ink, 140, 300, 56)
    p2.planet(ink, 700, 600, 40, ring=False, c='#B79CEB')
    with ink.fig(0, 0) as g:
        g.part(blob([(30, 880), (200, 830), (425, 860), (640, 820), (840, 870), (840, 1000), (30, 1000)], k=0.8), c='#E8E4EC')
        for (x, y, r) in ((150, 910, 30), (700, 890, 36), (260, 880, 16), (760, 850, 14)):
            g.part(ell(x, y, r, r * 0.4), c='#D8D4DE', under=False, w=ink.dw * 0.9)
    with ink.fig(425, 480, 1.0) as g:
        g.part(blob([(-52, 330, 'c'), (-70, 400), (-20, 450), (0, 490, 'c'), (20, 450), (70, 400), (52, 330, 'c')], k=1.0), c='#F7A84C')
        g.part(blob([(-22, 330, 'c'), (-26, 390), (0, 430, 'c'), (26, 390), (22, 330, 'c')], k=1.0), c='#FFE08A', under=False, w=ink.dw)
        for sgn in (-1, 1):
            g.part(blob([(sgn * 120, 130, 'c'), (sgn * 215, 250), (sgn * 222, 350, 'c'), (sgn * 124, 320)], k=0.8), c='#F2877E')
        g.part(blob([(0, -300, 'c'), (110, -200), (160, 0), (156, 200), (120, 340, 'c'), (-120, 340, 'c'), (-156, 200), (-160, 0), (-110, -200)], k=1.0), c='#F4F0EA')
        g.part(blob([(0, -300, 'c'), (110, -200), (132, -150), (-132, -150), (-110, -200)], k=0.8), c='#F2877E', under=False, w=ink.dw)
        g.part(rrect(-130, 262, 260, 34, 10), c='#F2877E', under=False, w=ink.dw)
        for (a, b) in ((-80, 206), (0, 208), (80, 206)):
            g.part(circ(a, b, 12), c='#F7D56A', under=False, w=ink.dw * 0.9)
    for (wx, wy, who) in ((425 - 70, 480 - 70, 'sugarfoot'), (425 + 70, 480 - 70, 'tidbit')):
        ink.clip_begin(circ(wx, wy, 62))
        with ink.fig(wx, wy + 22, 0.9, outline=False) as t:
            cast.pup_head(t, who, 'wow', 0, 0, (0, -3))
        ink.clip_end()
        with ink.fig(0, 0, outline=False) as g:
            g.line(circ(wx, wy, 62), w=ink.ow * 1.0)
    hide(ink, 'star', [(120, 520), (730, 260), (140, 780), (640, 740)], 1.0)
    frame_end(ink)


# 8 -------------------------------------------------------------------------------------------
@scene('Left, right, left, wiggle!', alt='Tidbit and Sugarfoot marching in a parade with a drum')
def s_parade(ink):
    frame_begin(ink)
    pr.bunting(ink, [(62, 140), (250, 205), (425, 160), (610, 205), (788, 140)], 9, 52)
    pr.puff(ink, 140, 400, 0.9, n=3)
    pr.puff(ink, 720, 360, 0.8, n=3)
    hills(ink, 620, 690)
    p2.flag_pole(ink, 110, 690, 300, '#F2877E')
    p2.flag_pole(ink, 740, 680, 280, '#8FCBF0')
    F(ink, lambda i, x, y, s: cast.pup_side(i, 'sugarfoot', x, y, s, 'walk', 'happy', ph=0.2, hat='party', flip=True, turn=0.7), (300, 290, 790, 620), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_side(i, 'tidbit', x, y, s, 'walk', 'joy', ph=0.7, hat='crown'), (62, 640, 660, 930), 'bottom')
    p2.drum(ink, 710, 905, 1.3)
    p2.sprinkles(ink, 8, 6, (100, 220, 760, 310), avoid=[], kinds=('star', 'sparkle', 'heart'), size=(12, 20), minsep=90)
    frame_end(ink)


# 9 -------------------------------------------------------------------------------------------
@scene('Five more minutes. Okay, ten.', game='Find 3 stars!', alt='Sugarfoot tucked into a cozy bed under the moon')
def s_bed(ink):
    frame_begin(ink)
    with ink.fig(425, 330) as g:
        g.part(blob([(-150, 140, 'c'), (-150, -40), (-100, -150), (0, -190), (100, -150), (150, -40), (150, 140, 'c')], k=0.8), c='#B07C4D', w=ink.dw)
        g.part(blob([(-128, 140, 'c'), (-128, -36), (-88, -130), (0, -166), (88, -130), (128, -36), (128, 140, 'c')], k=0.8), c='#8FA4D8', under=False, w=ink.dw)
        g.line(Path().M(0, -166).L(0, 140).M(-128, 20).L(128, 20), w=ink.dw)
    p2.crescent(ink, 380, 290, 46, -20)
    pr.star5(ink, 480, 240, 16)
    hills(ink, 810, 0, '#E8D5B0')
    with ink.fig(425, 760) as g:
        g.part(blob([(-330, 130, 'c'), (-330, -100), (-300, -150), (-250, -160), (250, -160), (300, -150), (330, -100), (330, 130, 'c')], k=0.4), c='#B07C4D')
    p2.pillow(ink, 425, 640, 1.0, 420, 190, '#FFFFFF', 0)
    F(ink, lambda i, x, y, s: cast.pup_peek(i, 'sugarfoot', x, y, s, 'sleep', paws=False), (250, 420, 600, 700), 'center')
    with ink.fig(425, 800) as g:
        g.part(blob([(-350, 0, 'c'), (-340, -70), (-200, -110), (0, -118), (200, -110), (340, -70), (350, 0, 'c'), (350, 130, 'c'), (-350, 130, 'c')], k=0.7), c='#F2877E')
        p2.quilt_patch(g, -320, -70, 320, 90, 8, 3)
    p3.lamp(ink, 110, 810, 1.0)
    hide(ink, 'star', [(130, 330), (730, 380), (230, 920)], 1.0)
    p2.sprinkles(ink, 9, 4, (100, 130, 760, 300), avoid=[(250, 140, 600, 480)], kinds=('sparkle', 'dot'), size=(12, 18), minsep=80)
    frame_end(ink)


# 10 ------------------------------------------------------------------------------------------
@scene('Sniff slow. Smells like spring.', alt='Sugarfoot sniffing a giant flower')
def s_sniff(ink):
    frame_begin(ink)
    pr.sun(ink, 690, 170, 50)
    pr.puff(ink, 170, 170, 0.8, n=3)
    hills(ink, 760, 840)
    pr.flower(ink, 250, 540, 3.2, petals=7, stem=380, c='#F7A8C2', cc='#FFD060')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'calm', tilt=-9, arms='down'), (340, 360, 770, 900), 'bottom')
    with ink.fig(0, 0, outline=False) as g:
        g.line(curve([(520, 340), (480, 400), (530, 450), (490, 500)]), w=ink.dw * 0.7, dash='3 9')
    ground_deco(ink, 10, 880, 935, [(320, 800, 780, 900)], 3)
    frame_end(ink)


# 11 ------------------------------------------------------------------------------------------
@scene('I found a puddle! It found me back.', alt='Tidbit jumping into a big puddle')
def s_splash(ink):
    frame_begin(ink)
    pr.puff(ink, 200, 200, 1.1, n=4)
    pr.puff(ink, 620, 170, 1.0, n=4)
    for (x, y) in ((140, 330), (260, 400), (360, 330), (500, 390), (590, 340), (690, 410), (130, 480), (740, 520), (80, 620), (430, 280)):
        pr.raindrop(ink, x, y, 1.0)
    hills(ink, 800, 860, '#BFE3A0', '#A9D98C')
    pr.puddle(ink, 425, 890, 340, 52)
    F(ink, lambda i, x, y, s: cast.pup_side(i, 'tidbit', x, y, s, 'jump', 'joy', turn=0.2, ear_rot=30, tail_up=1.2), (110, 440, 740, 850), 'bottom', maxs=2.1)
    for (x, y, r) in ((140, 810, 14), (205, 770, 10), (690, 790, 14), (745, 840, 10), (620, 740, 8), (110, 740, 9)):
        pr.raindrop(ink, x, y, r / 12 * 0.9)
    frame_end(ink)


# 12 ------------------------------------------------------------------------------------------
@scene('I had it a second ago!', game='Find the ball!', alt='Tidbit looking for his ball in a backyard')
def s_ball(ink):
    frame_begin(ink)
    pr.sun(ink, 460, 160, 52)
    pr.tree(ink, 170, 640, 1.9)
    pr.puff(ink, 680, 330, 0.8, n=4)
    hills(ink, 720, 800)
    pr.fence(ink, 60, 790, 800, 90)
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'tidbit', x, y, s, 'wow', look=(5, -4), arms='up', tilt=6), (250, 360, 650, 900), 'bottom')
    p3.toy_blocks(ink, 700, 920, 0.9)
    pr.bush(ink, 110, 925, 1.1)
    hide(ink, 'ball', [(165, 395)], 1.0)
    frame_end(ink)


# 13 ------------------------------------------------------------------------------------------
@scene('I caught a tiny star. Now I will let it go.', alt='Tidbit holding a jar of fireflies at night')
def s_jar(ink):
    frame_begin(ink)
    p2.crescent(ink, 650, 200, 70, 10)
    p2.sprinkles(ink, 13, 9, (90, 100, 560, 420), avoid=[], kinds=('star', 'sparkle', 'dot'), size=(12, 22), minsep=80)
    hills(ink, 800, 860, '#A9D98C', '#8FCB7C')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'tidbit', x, y, s, 'wow', look=(0, 2), arms='chest'), (110, 330, 560, 900), 'bottom')
    gg, sc = F(ink, lambda i, x, y, s: p2.jar(i, x, y, s), (510, 540, 740, 900), 'bottom')
    for (x, y, rot) in ((620, 740, 20), (650, 800, -20), (585, 830, 10)):
        p2.firefly(ink, x, y, 0.55, rot)
    for (x, y, rot) in ((300, 280, 15), (200, 520, -10), (460, 430, 20), (700, 480, -20), (160, 300, 10)):
        p2.firefly(ink, x, y, 0.8, rot)
    ground_deco(ink, 13, 900, 935, [], 3, kinds=('tuft',))
    frame_end(ink)


# 14 ------------------------------------------------------------------------------------------
@scene('Wash, rinse, bubble beard!', alt='Tidbit in a bubble bath')
def s_bath(ink):
    frame_begin(ink)
    p2.tub(ink, 425, 900, 1.15, 600)
    F(ink, lambda i, x, y, s: cast.pup_peek(i, 'tidbit', x, y, s, 'joy', paws=True), (210, 330, 640, 700), 'center')
    pr.bubbles(ink, [(300, 330, 36), (370, 290, 28), (440, 300, 40), (510, 300, 30), (570, 340, 34), (350, 360, 24), (480, 350, 26)])
    pr.bubbles(ink, [(130, 640, 40), (190, 560, 22), (700, 600, 34), (620, 520, 20), (150, 420, 26), (720, 420, 24), (680, 760, 28)])
    p3.sailboat(ink, 620, 780, 0.32)
    pr.bubbles(ink, [(260, 760, 26), (320, 800, 20), (210, 810, 18)])
    frame_end(ink)


# 15 ------------------------------------------------------------------------------------------
@scene('Pinkies up! Paws up!', game='Find 4 cupcakes!', alt='Tidbit and Sugarfoot at a tea party')
def s_tea(ink):
    frame_begin(ink)
    pr.bunting(ink, [(62, 120), (250, 175), (425, 140), (610, 175), (788, 120)], 9, 46)
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'happy', arms='chest', hat='sun'), (80, 240, 440, 680), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'tidbit', x, y, s, 'happy', arms='chest', hat='party', tilt=4), (410, 240, 770, 680), 'bottom')
    with ink.fig(425, 760) as g:
        g.part(blob([(-380, 0, 'c'), (-360, -50), (0, -70), (360, -50), (380, 0, 'c'), (360, 150, 'c'), (-360, 150, 'c')], k=0.7), c='#FADADD')
        for k in range(8):
            xx = -330 + k * 94
            g.line(curve([(xx - 18, 142), (xx, 128), (xx + 18, 142)]), w=ink.dw * 0.8)
    p2.teapot(ink, 425, 830, 1.2)
    p2.teacup(ink, 260, 840, 1.0, '#8FCBF0', True)
    p2.teacup(ink, 590, 840, 1.0, '#F7D56A', True)
    hide(ink, 'cupcake', [(130, 800), (720, 800), (110, 330), (720, 400)], 1.2)
    frame_end(ink)


# 16 ------------------------------------------------------------------------------------------
@scene('No grown-ups. Snacks allowed.', alt='Tidbit and Sugarfoot peeking out of a pillow fort')
def s_fort(ink):
    frame_begin(ink)
    p2.lights(ink, [(62, 130), (250, 210), (425, 160), (610, 210), (788, 130)], 9)
    p2.sprinkles(ink, 16, 8, (90, 250, 760, 400), avoid=[], kinds=('star', 'sparkle'), size=(12, 20), minsep=80)
    for (x0, cols) in ((62, ('#F2877E', '#8FCBF0', '#F7D56A')), (578, ('#B79CEB', '#F7D56A', '#F2877E'))):
        for k, c in enumerate(cols):
            p2.pillow(ink, x0 + 105, 880 - k * 130, 1.0, 210, 140, c, -4 if k % 2 else 5)
    with ink.fig(425, 0) as g:
        sheet = blob([(-363, 380, 'c'), (-330, 350), (-170, 400), (0, 420), (170, 400), (330, 350), (363, 380, 'c'), (363, 510, 'c'), (300, 550), (225, 510), (150, 554), (75, 510), (0, 556), (-75, 510), (-150, 554), (-225, 510), (-300, 550), (-363, 510, 'c')], k=0.6)
        g.part(sheet, c='#F7D56A')
        for (a, b, r) in ((-290, 430, 18), (-190, 470, 16), (-60, 450, 18), (70, 460, 16), (190, 440, 18), (290, 470, 16)):
            g.part(circ(a, b, r), c='#FFFFFF', under=False, w=ink.dw * 0.9)
    p2.pillow(ink, 425, 930, 1.0, 420, 130, '#B79CEB', 0)
    F(ink, lambda i, x, y, s: cast.pup_peek(i, 'tidbit', x, y, s, 'happy', paws=True), (150, 540, 460, 900), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_peek(i, 'sugarfoot', x, y, s, 'happy', paws=True), (390, 540, 700, 900), 'bottom')
    frame_end(ink)

# 17 ------------------------------------------------------------------------------------------
@scene('Make a wish. Blow slowly.', alt='Tidbit in a party hat with a birthday cake')
def s_birthday(ink):
    frame_begin(ink)
    pr.bunting(ink, [(62, 130), (250, 190), (425, 150), (610, 190), (788, 130)], 9, 52)
    for (x, y, c, t) in ((120, 330, '#F2877E', -8), (230, 250, '#8FCBF0', 6), (620, 260, '#F7D56A', -5), (720, 340, '#B79CEB', 9)):
        pr.balloon(ink, x, y, 1.15, c, 160, t)
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'tidbit', x, y, s, 'calm', mouth='o', arms='down', hat='party', tilt=-4), (150, 290, 700, 810), 'bottom')
    pr.cake(ink, 425, 930, 1.3, 3, True, 330)
    pr.gift(ink, 120, 930, 1.1, '#8FCBF0', 100, 80)
    pr.gift(ink, 730, 930, 1.0, '#B79CEB', 90, 70)
    p2.sprinkles(ink, 17, 10, (90, 380, 760, 780), avoid=[(150, 290, 700, 830)], kinds=('sparkle', 'dot', 'star'), size=(10, 18), minsep=70)
    frame_end(ink)


# 18 ------------------------------------------------------------------------------------------
@scene('Picnic rule one: more snacks.', game='Find 4 apples!', alt='Sugarfoot on a picnic blanket with a basket')
def s_picnic(ink):
    frame_begin(ink)
    pr.sun(ink, 430, 150, 52)
    pr.tree(ink, 150, 650, 1.8)
    pr.puff(ink, 690, 330, 0.8, n=3)
    hills(ink, 700, 780)
    p2.blanket(ink, 425, 840, 700, 140, 8, '#F2877E')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'happy', arms='chest'), (260, 300, 600, 840), 'bottom')
    p2.basket(ink, 650, 860, 1.0, 190)
    pr.apple(ink, 190, 860, 1.4)
    hide(ink, 'apple', [(90, 440), (190, 360), (260, 440), (740, 520)], 1.4)
    pr.cupcake(ink, 140, 790, 0.7)
    ground_deco(ink, 18, 905, 935, [(40, 780, 790, 900)], 2, kinds=('tuft',))
    frame_end(ink)


# 19 ------------------------------------------------------------------------------------------
@scene('Hold tight! The wind has plans.', alt='Tidbit and Sugarfoot flying a kite')
def s_kite(ink):
    frame_begin(ink)
    pr.puff(ink, 140, 560, 0.9, n=4)
    pr.puff(ink, 700, 430, 0.8, n=3)
    hills(ink, 780, 850)
    p2.kite(ink, 400, 270, 1.25, rot=10)
    with ink.fig(0, 0, outline=False) as g:
        g.line(curve([(445, 372), (540, 560), (520, 700), (560, 770)]), w=ink.dw * 0.9)
    F(ink, lambda i, x, y, s: cast.pup_side(i, 'tidbit', x, y, s, 'walk', 'wow', turn=0.2, tail_up=1.3), (410, 560, 770, 900), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'happy', arms='up'), (90, 520, 380, 900), 'bottom')
    for (x, y) in ((620, 130), (300, 120)):
        p3.bird_plain(ink, x, y, 1.0)
    ground_deco(ink, 19, 905, 935, [], 3, kinds=('tuft',))
    frame_end(ink)


# 20 ------------------------------------------------------------------------------------------
@scene('Wheee! Again! Again!', alt='Tidbit and Sugarfoot sledding in scarves')
def s_sled(ink):
    frame_begin(ink)
    pr.puff(ink, 170, 180, 0.9, n=4)
    pr.puff(ink, 660, 140, 0.8, n=3)
    for (x, y, r) in ((140, 330, 22), (690, 360, 26), (260, 470, 18), (600, 520, 20), (110, 620, 24), (720, 650, 18), (420, 300, 16)):
        pr.snowflake(ink, x, y, r, 12)
    pr.hill(ink, [(FL - 20, 700), (300, 640), (560, 740), (FRt + 20, 700)], bottom=FB + 20, c='#FFFFFF')
    pr.pine(ink, 110, 690, 1.7, True)
    pr.pine(ink, 730, 700, 1.4, True)
    pr.hill(ink, [(FL - 20, 840), (300, 800), (560, 860), (FRt + 20, 820)], bottom=FB + 20, c='#EAF4FF')
    p3.sled(ink, 425, 900, 1.05, 400)
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'joy', arms='both_up', scarf=True, hat='beanie'), (150, 330, 430, 830), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'tidbit', x, y, s, 'joy', arms='both_up', scarf=True, hat='beanie'), (420, 330, 700, 830), 'bottom')
    frame_end(ink)


# 21 ------------------------------------------------------------------------------------------
@scene('Taxi! Next stop: snacks.', alt='Sugarfoot riding in a wagon pulled by Tidbit')
def s_wagon(ink):
    frame_begin(ink)
    pr.sun(ink, 150, 180, 54)
    pr.puff(ink, 400, 160, 1.0, n=4)
    p3.hot_air_balloon(ink, 650, 470, 1.4, 190)
    hills(ink, 680, 770)
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'happy', arms='up', hat='sun'), (60, 360, 470, 780), 'bottom')
    p3.wagon(ink, 270, 900, 1.35, 360, 110)
    F(ink, lambda i, x, y, s: cast.pup_side(i, 'tidbit', x, y, s, 'walk', 'happy', turn=0.4), (500, 640, 790, 910), 'bottom')
    ground_deco(ink, 21, 895, 935, [(60, 780, 790, 920)], 3, kinds=('tuft',))
    frame_end(ink)

# 22 ------------------------------------------------------------------------------------------
@scene('Rain, rain, stay and play.', alt='Tidbit and Sugarfoot in raincoats under a big umbrella')
def s_rain(ink):
    frame_begin(ink)
    pr.puff(ink, 200, 150, 1.0, n=4)
    pr.puff(ink, 620, 130, 1.0, n=4)
    for (x, y) in ((120, 280), (230, 340), (360, 260), (500, 310), (640, 270), (730, 360), (160, 450), (700, 500), (90, 620), (380, 420)):
        pr.raindrop(ink, x, y, 1.0)
    hills(ink, 800, 860, '#BFE3A0', '#A9D98C')
    pr.puddle(ink, 200, 910, 150, 20)
    pr.puddle(ink, 650, 915, 130, 18)
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'happy', coat=True, hat='rain', arms='down'), (80, 400, 440, 910), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'tidbit', x, y, s, 'joy', coat=True, hat='rain', arms='down'), (410, 400, 770, 910), 'bottom')
    p3.umbrella(ink, 425, 380, 1.05, 700)
    frame_end(ink)


# 23 ------------------------------------------------------------------------------------------
@scene('Blow slow. Pop fast!', alt='Sugarfoot blowing big bubbles')
def s_bubbles(ink):
    frame_begin(ink)
    pr.sun(ink, 700, 160, 46)
    hills(ink, 740, 820)
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'wow', mouth='o', arms='up', tilt=-5), (60, 380, 480, 900), 'bottom')
    p3.wand(ink, 470, 560, 1.0, 30)
    pr.bubbles(ink, [(520, 480, 70), (600, 330, 52), (680, 520, 40), (560, 220, 34), (700, 250, 28), (460, 360, 24), (660, 690, 34), (590, 640, 22), (740, 400, 20), (430, 200, 18)])
    ground_deco(ink, 23, 880, 935, [(60, 780, 480, 900)], 4)
    frame_end(ink)


# 24 ------------------------------------------------------------------------------------------
@scene('All aboard the Snack Boat!', alt='Tidbit and Sugarfoot sailing in a little boat')
def s_boat(ink):
    frame_begin(ink)
    pr.sun(ink, 690, 170, 60)
    pr.puff(ink, 190, 190, 1.0, n=4)
    for (x, y) in ((340, 130), (520, 110), (430, 200)):
        p3.bird_plain(ink, x, y, 1.0)
    p3.waves(ink, 560, 14, 1, 70, '#BFE0F7')
    p3.sailboat(ink, 425, 800, 1.2, 380, True, False)
    F(ink, lambda i, x, y, s: cast.pup_peek(i, 'sugarfoot', x, y, s, 'happy', paws=False, hat='sun'), (110, 480, 450, 800), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_peek(i, 'tidbit', x, y, s, 'joy', paws=False), (400, 520, 740, 800), 'bottom')
    p3.sailboat(ink, 425, 800, 1.2, 380, False, True)
    p3.waves(ink, 830, 14, 3, 50, '#BFE0F7')
    frame_end(ink)

# 25 ------------------------------------------------------------------------------------------
@scene('Welcome! The password is snacks.', alt='Tidbit and Sugarfoot waving from a treehouse')
def s_treehouse(ink):
    frame_begin(ink)
    pr.sun(ink, 140, 170, 52)
    pr.puff(ink, 650, 160, 1.0, n=4)
    hills(ink, 800, 870)
    pr.puff(ink, 425, 520, 2.4, w=330, h=170, n=5)
    p3.treehouse(ink, 425, 910, 1.0, 560)
    for (wx, wy, who) in ((425 - 100, 470, 'sugarfoot'), (425 + 100, 470, 'tidbit')):
        ink.clip_begin(circ(wx, wy, 78))
        with ink.fig(wx, wy + 24, 0.9, outline=False) as t:
            cast.pup_head(t, who, 'joy' if who == 'tidbit' else 'happy', 0, 0)
        ink.clip_end()
        with ink.fig(0, 0, outline=False) as g:
            g.line(circ(wx, wy, 78), w=ink.ow * 0.9)
    for (x, y, a) in ((110, 520, 30), (720, 540, -30), (150, 700, 10), (730, 690, -20), (100, 250, 20), (740, 280, -10)):
        with ink.fig(0, 0) as g:
            lf = g.view(x, y, 1.6, False, a)
            lf.part(blob([(0, 0, 'c'), (14, -12), (34, 0, 'c'), (14, 12)], k=1.0), c='#7DBB6E')
    p3.bird_plain(ink, 300, 120, 1.0)
    ground_deco(ink, 25, 880, 935, [(300, 800, 560, 900)], 4)
    frame_end(ink)

# 26 ------------------------------------------------------------------------------------------
@scene('Grow, flowers, grow! No pressure.', alt='Sugarfoot watering sunflowers')
def s_garden(ink):
    frame_begin(ink)
    pr.sun(ink, 150, 170, 50)
    pr.puff(ink, 640, 150, 0.8, n=3)
    hills(ink, 760, 840)
    p3.sunflower(ink, 120, 900, 1.0, 470)
    p3.sunflower(ink, 735, 900, 0.9, 420)
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'happy', arms='chest', hat='sun'), (230, 330, 600, 880), 'bottom')
    pr.watering_can(ink, 590, 840, 1.1)
    for k in range(5):
        pr.raindrop(ink, 655 + k * 14, 770 + k * 30, 0.5)
    ground_deco(ink, 26, 900, 935, [], 3, kinds=('tuft', 'flower'))
    frame_end(ink)


# 27 ------------------------------------------------------------------------------------------
@scene('We built a castle. A wave said hi.', game='Find 5 shells!', alt='Tidbit and Sugarfoot building a sandcastle at the beach')
def s_sand(ink):
    frame_begin(ink)
    pr.sun(ink, 420, 170, 56)
    pr.puff(ink, 170, 200, 0.9, n=4)
    p3.waves(ink, 380, 14, 2, 56, '#BFE0F7')
    with ink.fig(0, 0) as g:
        g.part(blob([(30, 600, 'c'), (200, 560), (425, 600), (640, 550), (840, 600, 'c'), (840, 1000, 'c'), (30, 1000, 'c')], k=0.8), c='#F7E8C4')
    p3.sandcastle(ink, 425, 870, 1.3, 300)
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'happy', arms='up', hat='sun'), (80, 520, 340, 900), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'tidbit', x, y, s, 'joy', arms='up'), (510, 520, 780, 900), 'bottom')
    p3.bucket(ink, 190, 935, 0.8)
    p3.shovel(ink, 670, 930, 0.9, 20)
    hide(ink, 'shell', [(260, 640), (600, 650), (130, 880), (740, 880), (440, 905)], 1.2)
    frame_end(ink)


# 28 ------------------------------------------------------------------------------------------
@scene('Abracadabra! Snacks, appear!', alt='Tidbit in a wizard hat and Sugarfoot in a crown')
def s_dress(ink):
    frame_begin(ink)
    p2.sprinkles(ink, 28, 18, (90, 100, 760, 840), avoid=[(110, 220, 730, 900)], kinds=('star', 'sparkle', 'dot', 'heart'), size=(14, 26), minsep=70)
    hills(ink, 820, 890, '#F5EAD6', '#E8D5B0')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'tidbit', x, y, s, 'wink', arms='up', hat='wizard', tilt=5), (80, 200, 440, 880), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'happy', arms='chest', hat='crown', tilt=-4), (410, 220, 780, 880), 'bottom')
    p3.sparkles_burst(ink, 130, 270, 50, 7)
    frame_end(ink)


# 29 ------------------------------------------------------------------------------------------
@scene('S\u2019mores are a team sport.', alt='Tidbit and Sugarfoot by a campfire under the stars')
def s_camp(ink):
    frame_begin(ink)
    p2.crescent(ink, 690, 200, 70, 10)
    p2.sprinkles(ink, 29, 12, (90, 100, 760, 480), avoid=[(620, 120, 770, 290)], kinds=('star', 'sparkle', 'dot'), size=(12, 24), minsep=80)
    p2.tent(ink, 425, 760, 0.85, 560, 440, '#B79CEB')
    pr.pine(ink, 110, 790, 2.0)
    pr.pine(ink, 740, 800, 1.8)
    hills(ink, 780, 850, '#A9D98C', '#8FCB7C')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'happy', arms='down'), (62, 460, 380, 910), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'tidbit', x, y, s, 'happy', arms='down'), (470, 460, 788, 910), 'bottom')
    p3.campfire(ink, 425, 910, 1.4)
    p3.marshmallow_stick(ink, 330, 780, 370, 740)
    p3.marshmallow_stick(ink, 520, 780, 480, 740)
    frame_end(ink)


# 30 ------------------------------------------------------------------------------------------
@scene('Cookies! Tested by me. Twice.', alt='Tidbit in a chef hat with a tray of cookies')
def s_bake(ink):
    frame_begin(ink)
    for k in range(7):
        x0 = 62 + k * 103.7
        with ink.fig(0, 0) as g:
            g.part(blob([(x0, 100, 'c'), (x0 + 103.7, 100, 'c'), (x0 + 103.7, 180, 'c'), (x0 + 52, 214), (x0, 180, 'c')], k=0.5), c='#F2877E' if k % 2 else '#FFFFFF')
    with ink.fig(0, 0) as g:
        g.part(rrect(110, 270, 190, 170, 14), c='#BFE0F7')
        g.line(Path().M(205, 270).L(205, 440).M(110, 355).L(300, 355), w=ink.dw)
        g.part(rrect(540, 330, 200, 18, 6), c='#B07C4D')
    pr.cupcake(ink, 590, 330, 0.8)
    pr.cupcake(ink, 680, 330, 0.8, '#E8D8F8')
    with ink.fig(0, 0) as g:
        g.part(rrect(40, 760, 770, 200, 4), c='#E8D5B0', w=ink.dw)
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'tidbit', x, y, s, 'happy', arms='chest', hat='chef'), (170, 260, 680, 800), 'bottom')
    with ink.fig(425, 830) as g:
        g.part(rrect(-330, -40, 660, 40, 10), c='#E8B97C')
    p3.tray(ink, 425, 800, 1.2, 440)
    for k in range(5):
        p3.cookie(ink, 235 + k * 90, 768, 1.1, k * 7)
    pr.heart(ink, 130, 560, 24, -10)
    pr.heart(ink, 730, 560, 20, 10)
    frame_end(ink)


# 31 ------------------------------------------------------------------------------------------
@scene('Goodnight, Moon. Goodnight, everyone.', alt='Tidbit and Sugarfoot asleep under the moon and stars')
def s_goodnight(ink):
    frame_begin(ink)
    p2.crescent(ink, 425, 230, 120, 0)
    p2.sprinkles(ink, 31, 14, (90, 100, 760, 480), avoid=[(300, 100, 560, 360)], kinds=('star', 'sparkle', 'dot'), size=(12, 24), minsep=80)
    with ink.fig(650, 400, outline=False) as g:
        g.line(Path().M(0, 0).L(34, 0).L(0, 36).L(36, 36), w=ink.ow * 0.8)
        g.line(Path().M(50, -34).L(72, -34).L(50, -12).L(72, -12), w=ink.ow * 0.7)
    hills(ink, 640, 0, '#A9D98C')
    p2.pillow(ink, 425, 760, 1.0, 640, 230, '#FFFFFF', 0)
    F(ink, lambda i, x, y, s: cast.pup_peek(i, 'sugarfoot', x, y, s, 'sleep', paws=False, tilt=-6), (90, 450, 440, 740), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_peek(i, 'tidbit', x, y, s, 'sleep', paws=False, tilt=6), (410, 450, 760, 740), 'bottom')
    with ink.fig(425, 900) as g:
        g.part(blob([(-380, 0, 'c'), (-360, -60), (-200, -110), (0, -118), (200, -110), (360, -60), (380, 0, 'c'), (380, 120, 'c'), (-380, 120, 'c')], k=0.7), c='#8FCBF0')
        p2.quilt_patch(g, -340, -64, 340, 100, 8, 3, c=('#8FCBF0', '#B79CEB', '#F7D56A', '#F2877E', '#8FCB7C'))
    frame_end(ink)

# 32 ------------------------------------------------------------------------------------------
@scene('Home is where the snacks are.', alt='Tidbit and Sugarfoot in front of their cottage')
def s_home(ink):
    frame_begin(ink)
    pr.sun(ink, 700, 140, 52)
    pr.puff(ink, 160, 170, 0.9, n=4)
    hills(ink, 600, 700, '#BFE3A0', '#A9D98C')
    pr.tree(ink, 780, 690, 1.3)
    pr.tree(ink, 70, 690, 1.1)
    p3.house(ink, 425, 770, 1.25, 340, 240)
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'tidbit', x, y, s, 'happy', arms='up', wag=1), (62, 580, 330, 930), 'bottom')
    F(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'happy', arms='down'), (520, 600, 788, 930), 'bottom')
    ground_deco(ink, 32, 905, 935, [(60, 780, 790, 920)], 2, kinds=('tuft', 'flower'))
    frame_end(ink)
