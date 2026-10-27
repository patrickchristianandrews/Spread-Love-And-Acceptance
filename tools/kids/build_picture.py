#!/usr/bin/env python3
"""build_picture.py: the younger kids picture book (kids22).

    python3 tools/kids/build_picture.py            writes book/kids/src/picture-book.html (print pages, 8.5 x 8.5 in with bleed),
                                                   picture-book-screen.html (no bleed), the page art for the EPUB, and the cover
                                                   (the cover needs the page count, which is fixed at 40: KDP premium color, 24 to 828 pages)

The story is in _manuscripts/kids/picture-book.json. The pictures are drawn by tools/kids/kids_art.py.
A spread is one SVG 17.25 x 8.75 in (units: 100 a inch, the bleed included); the left and right pages are two windows on it.
"""
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import kids_art as A  # noqa: E402
import kids_common as C  # noqa: E402
from kids_art import f  # noqa: E402

TRIM = 8.5
B = C.BLEED
PW, PH = TRIM + B, TRIM + 2 * B          # a page with bleed on one side, top and bottom: 8.625 x 8.75
SW, SH = 2 * TRIM + 2 * B, TRIM + 2 * B  # a spread canvas, 17.25 x 8.75
U = 100                                  # units a inch
OX, OY = B * U, B * U                    # the trim box's top left in spread units
GX = OX + TRIM * U                       # the gutter
BOOK = json.load(open(os.path.join(C.MS, 'picture-book.json'), encoding='utf-8'))
PAGES = 40


def pen(sw=3.0):
    return A.Pen('color', sw=sw)


# ------------------------------------------------------------------ scenery
def sky(P, top, bottom, h=SH * U, w=SW * U, mid=None):
    stops = [(0, top)] + ([(0.55, mid)] if mid else []) + [(1, bottom)]
    gid = C.grad(P, 'sky', stops)
    P.raw('<rect x="0" y="0" width="%s" height="%s" fill="url(#%s)"/>' % (f(w), f(h), gid))


def ground(P, y, col='#A9DB84', y2=None, w=SW * U, h=SH * U):
    P.raw('<rect x="0" y="%s" width="%s" height="%s" fill="%s"/>' % (f(y), f(w), f(h - y), col))


def hill(P, x0, x1, ytop, ybase, col, bulge=0.5):
    cx = (x0 + x1) / 2
    P.raw('<path d="M%s %s Q%s %s %s %s L%s %s L%s %sZ" fill="%s"/>' % (f(x0), f(ybase), f(cx), f(ytop - (ybase - ytop) * bulge * 0.0 - (ybase - ytop) * 0.9), f(x1), f(ybase), f(x1), f(SH * U), f(x0), f(SH * U), col))


def rolling(P, y, cols, w=SW * U):
    """soft rolling hills across the whole spread"""
    for i, (col, dy, amp) in enumerate(cols):
        yy = y + dy
        d = 'M0 %s C%s %s %s %s %s %s S%s %s %s %s L%s %s L0 %sZ' % (
            f(yy), f(w * 0.15), f(yy - amp), f(w * 0.3), f(yy - amp * 0.2), f(w * 0.5), f(yy - amp * 0.5),
            f(w * 0.8), f(yy + amp * 0.2), f(w), f(yy - amp * 0.4), f(w), f(SH * U), f(SH * U))
        P.raw('<path d="%s" fill="%s"/>' % (d, col))


def clouds_bg(P, spots):
    for (x, y, s) in spots:
        A.sky_cloud(P, x, y, s, '#FFFFFF', 0.9)


def flowers_row(P, y, x0, x1, step=62, seed=1, scale=0.9):
    cols = ['#F7A8C2', '#FFFFFF', '#FAD27A', '#C7B2EE', '#F6B99F']
    x = x0
    i = seed
    while x < x1:
        A.flower(P, x, y + (i * 7) % 18, scale * (0.8 + (i % 3) * 0.15), cols[i % len(cols)], '#FAD27A' if cols[i % len(cols)] != '#FAD27A' else '#E0957B', petals=5 if i % 2 else 6, stem=True)
        x += step + (i * 13) % 40
        i += 1


def grass_tufts(P, y, x0, x1, step=90, seed=0):
    x = x0
    i = seed
    while x < x1:
        A.grass(P, x, y + (i * 11) % 30, 1.0 + (i % 3) * 0.15)
        x += step + (i * 17) % 50
        i += 1


def wagon(P, x, y, s=1.0):
    P.at(x, y, s)
    P.rect(-30, -14, 60, 18, '#E0554E', r=4)
    P.rect(-32, -22, 6, 10, '#C9423C', r=2)
    P.rect(26, -22, 6, 10, '#C9423C', r=2)
    P.circ(-18, 8, 7, '#4B4A55')
    P.circ(18, 8, 7, '#4B4A55')
    P.circ(-18, 8, 2.4, '#C9CED8')
    P.circ(18, 8, 2.4, '#C9CED8')
    P.thick('M30 -6 L58 4', '#4B4A55', 2.6)
    P.close()


def sweat(P, x, y, s=1.0):
    P.at(x, y, s)
    P.path('M0 -7 Q5 0 0 5 Q-5 0 0 -7Z', '#9ED3FF')
    P.close()


def label(P, x, y, text, size=26, anchor='middle', col='#3A3350', weight=700, bg=True, family='Andika'):
    if bg:
        wd = max(70, len(text) * size * 0.56 + 26)
        xx = x - wd / 2 if anchor == 'middle' else (x if anchor == 'start' else x - wd)
        P.raw('<rect x="%s" y="%s" width="%s" height="%s" rx="%s" fill="#FFFDF5" stroke="#E0C98C" stroke-width="2.5"/>' % (f(xx), f(y - size * 0.95), f(wd), f(size * 1.55), f(size * 0.6)))
    P.raw('<text x="%s" y="%s" text-anchor="%s" font-family="%s, sans-serif" font-weight="%s" font-size="%s" fill="%s">%s</text>' % (
        f(x), f(y + 2), anchor, family, weight, size, col, C.esc(text)))


# ------------------------------------------------------------------ the thirteen spreads (spread units: 1725 x 875, gutter at x = 862.5)
def s_zoom(P):
    sky(P, '#BFE4F7', '#FFEBC9')
    A.sun(P, 330, 300, 78)
    A.sky_cloud(P, 760, 190, 1.4); A.sky_cloud(P, 1100, 140, 1.0); A.sky_cloud(P, 1560, 230, 1.5)
    rolling(P, 560, [('#BFE6A0', -30, 40), ('#A9DB84', 60, 30)])
    A.fence(P, 1000, 1700, 650, 52)
    A.house(P, 1450, 690, 3.0)
    flowers_row(P, 690, 40, 1700, 70, 2)
    grass_tufts(P, 720, 20, 1700, 120)
    A.speed_lines(P, 235, 590, 4, 150, 22, 1.2)
    A.dust(P, 190, 700, 2.0); A.dust(P, 120, 715, 1.5)
    A.pup_side(P, 'tidbit', 430, 730, 5.4, 'run', 'happy', ph=0.9, wag=0.3)
    A.sugarfoot_front(P, 1120, 740, 4.6, 'happy-closed', 'o')
    A.zz(P, 1235, 520, 1.6)
    A.sparkle(P, 640, 470, 2.4); A.sparkle(P, 700, 410, 1.6)

def s_plan(P):
    sky(P, '#FFE9CF', '#FBD9B0')
    P.raw('<rect x="0" y="620" width="%s" height="%s" fill="#E3B98A"/>' % (SW * U, SH * U - 620))
    P.raw('<rect x="0" y="600" width="%s" height="26" fill="#C99A68"/>' % (SW * U))
    # shelves on the left, with jars and pies
    for yy in (330, 470):
        P.raw('<rect x="60" y="%s" width="650" height="16" rx="6" fill="#B98A57"/>' % yy)
        P.raw('<rect x="90" y="%s" width="12" height="48" fill="#B98A57"/><rect x="670" y="%s" width="12" height="48" fill="#B98A57"/>' % (yy + 16, yy + 16))
    for i, x in enumerate((130, 215, 300, 385, 470, 555, 635)):
        A.jar(P, x, 330, 3.0, ['#8CC66B', '#E25C4F', '#F5C84C'][i % 3])
    A.pie(P, 150, 470, 3.2); A.cheese(P, 300, 470, 3.2); A.cupcake(P, 420, 470, 3.4); A.apple(P, 520, 470, 3.2); A.apple(P, 580, 470, 3.2); A.cup(P, 650, 470, 3.2)
    # a window on the right with the Hollow beyond
    P.raw('<rect x="1380" y="300" width="260" height="190" rx="20" fill="#CFE9F8" stroke="#B98A57" stroke-width="12"/>')
    P.raw('<path d="M1392 450 Q1510 400 1628 440 L1628 484 L1392 484Z" fill="#A9DB84"/>')
    A.sun(P, 1580, 360, 24, face=False)
    P.raw('<path d="M1510 300 V490 M1380 395 H1640" stroke="#B98A57" stroke-width="8"/>')
    A.basket(P, 960, 735, 2.6, full=False)
    A.pup_side(P, 'tidbit', 420, 740, 5.4, 'run', 'happy', ph=0.6, wag=0.4)
    A.speed_lines(P, 200, 600, 3, 120, 22, 1.2)
    A.sugarfoot_front(P, 1210, 745, 4.6, 'happy', 'smile', heart_=False)
    A.sparkle(P, 1030, 560, 2)


def s_pack(P):
    sky(P, '#FFE9CF', '#FBD9B0')
    P.raw('<rect x="0" y="620" width="%s" height="%s" fill="#E3B98A"/>' % (SW * U, SH * U - 620))
    P.raw('<rect x="0" y="600" width="%s" height="26" fill="#C99A68"/>' % (SW * U))
    # the heap of food on the left
    heap = [('apple', 130, 700, 3.0), ('apple', 200, 720, 3.2), ('pie', 320, 700, 3.4), ('jar', 430, 690, 3.4), ('cheese', 540, 710, 3.4),
            ('cupcake', 640, 700, 3.4), ('cup', 740, 715, 3.2), ('apple', 260, 650, 3.0), ('jar', 380, 620, 3.2), ('cupcake', 500, 635, 3.2), ('pie', 610, 640, 3.0),
            ('apple', 330, 580, 2.8), ('cheese', 460, 570, 3.0), ('jar', 560, 560, 2.8)]
    for kind, x, y, s in heap:
        getattr(A, kind)(P, x, y, s)
    A.basket(P, 1060, 735, 4.4, full=True)
    for (x, y, s) in ((1010, 480, 2.4), (1090, 470, 2.2)):
        A.apple(P, x, y, s)
    A.pup_side(P, 'tidbit', 1430, 735, 5.2, 'stand', 'cross', flip=True, mouth_='frown', tilt=0)
    sweat(P, 1325, 520, 2.2); sweat(P, 1370, 480, 1.8)
    A.dust(P, 1130, 735, 1.4)


def s_static(P):
    sky(P, '#DDE3F2', '#F2E9E1')
    P.raw('<rect x="0" y="650" width="%s" height="%s" fill="#E3B98A"/>' % (SW * U, SH * U - 650))
    A.tidbit_front(P, 420, 745, 5.6, 'cross', 'yell')
    A.fizz_marks(P, 420, 480, 150, 12, 1.0)
    A.static_cloud(P, 'grumble', 1280, 440, 9.0)
    for (x, y, s) in ((1060, 520, 1.5), (1520, 560, 1.8)):
        A.static_cloud(P, 'grumble', x, y, s * 1.0, fizz=False)


def s_puddles(P):
    sky(P, '#CFE6FA', '#F4EFD9')
    ground(P, 650, '#A9DB84')
    clouds_bg(P, [(300, 200, 1.4), (1400, 220, 1.5)])
    A.puddle(P, 700, 700, 120, 22)
    A.puddles(P, 400, 735, 5.2, 'smile', pointer=False)
    A.tidbit_front(P, 1300, 745, 5.2, 'surprised', 'o')
    # callouts
    P.raw('<g stroke="#3A3350" stroke-width="3.5" stroke-linecap="round" fill="none"><path d="M1130 690 Q1200 690 1235 700"/><path d="M1080 480 Q1170 470 1220 500"/><path d="M1500 580 Q1450 580 1410 600"/></g>')
    label(P, 1040, 705, 'buzzy paws', 26, 'middle')
    label(P, 1000, 500, 'hot ears', 26, 'middle')
    label(P, 1560, 575, 'tight tummy', 26, 'middle')
    A.sparkle(P, 640, 420, 2.0)


def s_room(P):
    sky(P, '#D8E4F4', '#EFE8DA')
    rolling(P, 600, [('#B7D9A0', -10, 30), ('#A5CF8C', 50, 24)])
    A.tree(P, 250, 700, 3.2, '#8FBF86', '#6C9E66')
    A.bush(P, 120, 720, 3.2, '#6FA36A')
    A.static_cloud(P, 'mumble', 150, 600, 3.0, 'shy', fizz=False)
    # a gentle ring of room around Sugarfoot
    P.raw('<ellipse cx="560" cy="690" rx="250" ry="62" fill="none" stroke="#9AA7C9" stroke-width="5" stroke-dasharray="4 14" stroke-linecap="round"/>')
    A.pup_side(P, 'sugarfoot', 520, 735, 5.2, 'lie', 'sad', mouth_='flat')
    label(P, 570, 520, 'room', 28)
    A.tidbit_front(P, 1330, 745, 4.8, 'calm', 'smile')
    A.heart(P, 1010, 520, 1.4, '#F08DA8', '#D2668A')
    A.sparkle(P, 1470, 420, 1.8)


def s_calm(P):
    sky(P, '#CDEBFA', '#FFF0D6')
    ground(P, 650, '#A9DB84')
    A.tidbit_front(P, 420, 750, 5.2, 'sleep', 'smile')
    A.flower(P, 600, 540, 4.4, '#F7A8C2', '#FAD27A', 6, stem=True, rot=-10)
    P.raw('<path d="M520 470 q60 -40 110 -10" fill="none" stroke="#7FB2E0" stroke-width="5" stroke-dasharray="3 13" stroke-linecap="round"/>')
    A.static_cloud(P, 'grumble', 200, 380, 4.4, fizz=True)
    A.tidbit_front(P, 1290, 750, 5.2, 'calm', 'blow')
    A.candle(P, 1470, 640, 4.2, lean=1.0)
    for i, (x, y, r) in enumerate(((1440, 560, 10), (1470, 520, 14), (1520, 480, 18))):
        P.raw('<circle cx="%s" cy="%s" r="%s" fill="none" stroke="#8EC5EE" stroke-width="3.5"/>' % (x, y, r))
    A.static_cloud(P, 'grumble', 1600, 400, 2.2, 'happy', fizz=False)
    label(P, 640, 410, 'in', 28); label(P, 1370, 520, 'out', 28)


def s_ask(P):
    sky(P, '#CFE6FA', '#FFF1D8')
    rolling(P, 600, [('#BFE6A0', -10, 30), ('#A9DB84', 55, 26)])
    A.basket(P, 230, 745, 4.4, full=True)
    A.tidbit_front(P, 560, 750, 5.2, 'happy', 'smile')
    A.sparkle(P, 700, 430, 1.8)
    # the friends, all facing the basket
    A.sugarfoot_front(P, 990, 750, 3.6, 'happy', 'smile', heart_=True)
    A.hopper(P, 1110, 748, 3.1, flip=True, expr='happy')
    A.nutmeg(P, 1215, 748, 3.0, flip=True, expr='happy')
    A.beep(P, 1325, 748, 2.8, flip=True, arm_up=True)
    A.lumi(P, 1440, 748, 2.1, flip=True, lantern=False)
    A.dot_snail(P, 1545, 748, 2.2, flip=True, expr='happy')
    A.ducklings(P, 1655, 748, 1.0, flip=True)
    A.ollie(P, 1240, 560, 2.4, flip=True, branch=True, expr='happy')

def s_jobs(P):
    sky(P, '#BFE4F7', '#FFEBC9')
    rolling(P, 560, [('#BFE6A0', -40, 40), ('#A9DB84', 80, 30)])
    P.raw('<path d="M0 745 Q600 700 1200 750 T1725 725 V830 H0Z" fill="#E8D1A4"/>')
    A.sun(P, 1560, 440, 56)
    A.sky_cloud(P, 600, 340, 1.2)
    # left: the jobs
    A.beep(P, 130, 760, 3.2)
    A.hopper(P, 300, 760, 3.4, expr='happy')
    A.apple(P, 355, 715, 2.6); A.apple(P, 250, 722, 2.4)
    A.nutmeg(P, 450, 760, 3.2)
    A.ducklings(P, 590, 760, 1.5)
    A.napkin(P, 555, 718, 2.0); A.napkin(P, 600, 710, 2.0); A.napkin(P, 645, 718, 2.0)
    A.lumi(P, 760, 760, 2.4, glow=False)
    # right: the light basket and the slowest job
    A.dot_snail(P, 1010, 760, 3.2, expr='happy')
    wagon(P, 1330, 735, 3.4)
    A.basket(P, 1330, 635, 2.0, full=True)
    A.pup_side(P, 'tidbit', 1170, 750, 3.6, 'walk', 'happy', ph=0.5)
    A.pup_side(P, 'sugarfoot', 1590, 750, 3.6, 'walk', 'happy', ph=0.2, flip=True)
    for (x, y) in ((1250, 500), (1400, 470), (1500, 540)):
        A.sparkle(P, x, y, 1.4)
    for (dx, dy) in ((-34, 0), (0, -26), (34, 4)):
        P.raw('<circle cx="%s" cy="%s" r="17" fill="#fff" fill-opacity=".9" stroke="#D8D2C4" stroke-width="2"/>' % (1330 + dx * 1.2, 520 + dy))

def s_oops(P):
    sky(P, '#BFE4F7', '#FFEBC9')
    rolling(P, 540, [('#BFE6A0', -30, 40), ('#A9DB84', 90, 30)])
    A.blanket(P, 1250, 735, 520, 120, 1.0, '#E0554E')
    A.butterfly(P, 700, 360, 3.6, 1.0, rot=-10)
    A.basket(P, 270, 745, 3.6, full=False)
    A.pup_side(P, 'tidbit', 560, 740, 5.4, 'run', 'surprised', ph=1.4, mouth_='yell', tilt=-10)
    A.speed_lines(P, 320, 600, 4, 120, 20, 1.1)
    for (x, y, s, r) in ((330, 540, 2.6, 20), (450, 440, 2.4, -30), (590, 560, 2.2, 0), (400, 650, 2.4, 10)):
        A.apple(P, x, y, s)
    A.pie(P, 1010, 400, 3.2, rot=25)
    for (x, y) in ((1130, 700), (1250, 725), (1370, 705)):
        A.sandwich(P, x, y, 2.4)
    A.apple(P, 1560, 735, 2.4); A.apple(P, 1650, 700, 2.4)
    A.beep(P, 1010, 745, 2.9); A.hopper(P, 1160, 745, 3.0, flip=False); A.dot_snail(P, 1340, 745, 2.4)
    A.static_cloud(P, 'fuzz', 1530, 420, 5.0, 'happy', fizz=False)
    label(P, 480, 340, 'CRASH!', 40, 'middle', '#C0392B', 800, bg=False, family='Fraunces')


def s_sorry(P):
    sky(P, '#CFE6FA', '#FFF1D8')
    rolling(P, 590, [('#BFE6A0', -10, 30), ('#A9DB84', 55, 26)])
    A.tidbit_front(P, 400, 750, 5.2, 'sad', 'frown')
    A.pup_side(P, 'sugarfoot', 720, 745, 4.6, 'stand', 'happy', flip=True, mouth_='smile')
    A.heart(P, 600, 410, 1.5, '#F08DA8', '#D2668A')
    A.blanket(P, 1250, 745, 520, 110, 1.0, '#E0554E')
    A.hopper(P, 1040, 745, 3.4, expr='happy')
    A.nutmeg(P, 1160, 745, 3.4, expr='happy')
    A.basket(P, 1330, 740, 2.8, full=False)
    for (x, y, s) in ((1250, 650, 2.4), (1390, 610, 2.4), (1500, 700, 2.6), (1590, 735, 2.4), (1480, 480, 2.6)):
        A.apple(P, x, y, s)
    A.beep(P, 1560, 745, 2.9, arm_up=True)
    A.sparkle(P, 1100, 480, 1.6)


def s_clouds(P):
    sky(P, '#CFE6FA', '#FFF1D8')
    rolling(P, 600, [('#BFE6A0', -10, 30), ('#A9DB84', 55, 26)])
    A.blanket(P, 1250, 745, 560, 110, 1.0, '#E0554E')
    A.static_cloud(P, 'grumble', 260, 420, 5.6, 'happy', fizz=False)
    A.static_cloud(P, 'fuzz', 560, 520, 4.4, 'happy', fizz=False)
    A.cracker(P, 600, 590, 2.4, rot=15)
    A.speed_lines(P, 470, 520, 3, 100, 18, 1.0)
    A.static_cloud(P, 'drift', 1560, 430, 5.4, 'drifty', fizz=False)
    A.static_cloud(P, 'mumble', 1060, 560, 3.4, 'shy', fizz=False)
    A.beep(P, 1000, 745, 3.4)
    A.puddles(P, 1330, 745, 3.4, 'smile')
    A.cracker(P, 1270, 700, 2.6, rot=-10)
    A.tidbit_front(P, 740, 750, 4.4, 'happy', 'w')
    A.sparkle(P, 1470, 600, 1.5)


def s_night(P):
    sky(P, '#2F3566', '#F2A9B4', mid='#8F6FB5')
    for (x, y, r) in ((140, 80, 9), (330, 150, 12), (500, 60, 8), (700, 180, 10), (1000, 70, 12), (1200, 150, 8), (1600, 80, 10), (1330, 40, 8)):
        A.star(P, x, y, r, '#FBE9A0', 'flat')
    A.moon(P, 1480, 420, 2.2, 'calm')
    P.raw('<path d="M0 640 Q400 560 800 640 T1725 620 V875 H0Z" fill="#5C5A94"/><path d="M0 720 Q500 660 1000 720 T1725 700 V875 H0Z" fill="#4A4A7E"/>')
    A.house(P, 1500, 735, 2.8, '#E8C9A8', '#8E4A4A')
    P.raw('<rect x="1426" y="650" width="42" height="42" rx="4" fill="#FFE49A"/>')
    for (x, y) in ((1100, 520), (1230, 600), (1320, 520), (990, 600)):
        A.firefly(P, x, y, 2.2)
    A.pup_side(P, 'tidbit', 330, 770, 4.8, 'walk', 'calm', ph=0.4, mouth_='smile')
    A.pup_side(P, 'sugarfoot', 700, 775, 4.8, 'walk', 'calm', ph=0.9, mouth_='smile')


SPREADS = [s_zoom, s_plan, s_pack, s_static, s_puddles, s_room, s_calm, s_ask, s_jobs, s_oops, s_sorry, s_clouds, s_night]
# where each page's words go ('top' or 'bottom'): the art leaves that part of the page open
TEXT_POS = {
    'zoom': ('top', 'top'), 'plan': ('top', 'top'), 'pack': ('top', 'top'), 'static': ('top', 'bottom'), 'puddles': ('top', 'top'),
    'room': ('top', 'top'), 'calm': ('top', 'top'), 'ask': ('top', 'top'), 'jobs': ('top', 'top'), 'oops': ('top', 'top'),
    'sorry': ('top', 'top'), 'clouds': ('top', 'top'), 'night': ('top', 'top'),
}


# foreground drawing functions and the positions of (x, y, size) in their arguments (P is argument 0)
FG = {'pup_side': (2, 3, 4), 'sugarfoot_front': (1, 2, 3), 'tidbit_front': (1, 2, 3), 'puddles': (1, 2, 3), 'static_cloud': (2, 3, 4),
      'ollie': (1, 2, 3), 'dot_snail': (1, 2, 3), 'hopper': (1, 2, 3), 'nutmeg': (1, 2, 3), 'lumi': (1, 2, 3), 'beep': (1, 2, 3),
      'ducklings': (1, 2, 3), 'butterfly': (1, 2, 3), 'basket': (1, 2, 3), 'apple': (1, 2, 3), 'pie': (1, 2, 3), 'jar': (1, 2, 3),
      'cheese': (1, 2, 3), 'cupcake': (1, 2, 3), 'cup': (1, 2, 3), 'sandwich': (1, 2, 3), 'napkin': (1, 2, 3), 'cracker': (1, 2, 3),
      'candle': (1, 2, 3), 'moon': (1, 2, 3)}
# how much bigger each scene's characters are drawn (the crowded scenes stay as they are)
SCALE = {'s_zoom': 1.25, 's_plan': 1.0, 's_pack': 1.2, 's_static': 1.2, 's_puddles': 1.25, 's_room': 1.2, 's_calm': 1.25, 's_ask': 1.1,
         's_jobs': 1.0, 's_oops': 1.1, 's_sorry': 1.25, 's_clouds': 1.1, 's_night': 1.2}


def spread_svg(fn):
    P = pen()
    k = SCALE.get(fn.__name__, 1.0)
    orig = {}
    if k != 1.0:
        for name, (xi, yi, si) in FG.items():
            o = getattr(A, name)
            orig[name] = o

            def make(o, yi, si):
                def w(*a, **kw):
                    a = list(a)
                    a[yi] = a[yi] + (k - 1) * 90
                    a[si] = a[si] * k
                    return o(*a, **kw)
                return w
            setattr(A, name, make(o, yi, si))
    try:
        fn(P)
    finally:
        for name, o in orig.items():
            setattr(A, name, o)
    return P


def page_svg(P, side, cls='art'):
    """one page's window on a spread: side 'L' or 'R'"""
    vx = 0 if side == 'L' else (GX)
    return '<svg xmlns="http://www.w3.org/2000/svg" class="%s" viewBox="%s 0 %s %s" preserveAspectRatio="none">%s</svg>' % (cls, f(vx), f(PW * U), f(PH * U), P.svg())


# ------------------------------------------------------------------ pages
CSS = '''
@page { size: %(PW)sin %(PH)sin; margin: 0; }
html, body { margin: 0; padding: 0; background: #fff; }
* { box-sizing: border-box; }
.pg { position: relative; width: %(PW)sin; height: %(PH)sin; overflow: hidden; page-break-after: always; break-after: page; font-family: "Andika", sans-serif; color: #2B2620; background: #FFFDF5; }
.pg:last-child { page-break-after: auto; break-after: auto; }
.pg > svg.art { position: absolute; left: 0; top: 0; width: %(PW)sin; height: %(PH)sin; display: block; }
.trim { position: absolute; top: %(B)sin; width: %(T)sin; height: %(T)sin; }
.pg.v .trim { left: %(B)sin; }
.pg.r .trim { left: 0; }
.tx { position: absolute; background: rgba(255,252,243,.93); border: 2.5px solid #E8D5A2; border-radius: .32in; padding: .2in .3in; font-size: 19pt; line-height: 1.38; text-align: center; box-shadow: 0 2px 0 rgba(160,130,60,.15); }
.pg.r .tx { left: .62in; right: .6in; }
.pg.v .tx { left: .6in; right: .62in; }
.tx.top { top: .42in; }
.tx.bottom { bottom: .5in; }
.tx p { margin: 0; }
.pn { position: absolute; bottom: .3in; font-size: 9pt; color: #8B7A55; }
.pg.r .pn { right: .6in; }
.pg.v .pn { left: .6in; }
.plain { background: #FFFDF5; }
.center { position: absolute; left: .8in; right: .8in; text-align: center; }
h1, h2 { font-family: "Fraunces", serif; margin: 0; color: #2B2620; }
.small { font-size: 8.5pt; line-height: 1.45; color: #4A4033; }
.gu { position: absolute; left: .75in; right: .75in; top: .7in; font-size: 15.5pt; line-height: 1.46; }
.gu h2 { font-size: 28pt; margin: 0 0 .16in; color: #6A52A0; }
.gu p { margin: 0 0 .13in; }
.gu ol, .gu ul { margin: 0; padding-left: .3in; }
.gu li { margin: 0 0 .1in; }
.card { background: rgba(255,255,255,.96); border: 2.5px solid #E8D5A2; border-radius: .2in; padding: .12in .22in; margin-bottom: .14in; }
.card h3 { font-family: "Fraunces", serif; font-size: 19pt; margin: 0 0 .05in; color: #3A3350; }
.card p { margin: 0; font-size: 16pt; line-height: 1.4; }
''' % {'PW': PW, 'PH': PH, 'B': B, 'T': TRIM}


def pagebox(num, inner, art='', extra_cls=''):
    side = 'r' if num % 2 == 1 else 'v'
    return '<section class="pg %s %s" data-page="%d">%s<div class="trim">%s</div></section>' % (side, extra_cls, num, art, inner)


def tx(text, pos):
    return '<div class="tx %s"><p>%s</p></div>' % (pos, C.para(text))


def simple_art(build, side):
    P = pen()
    build(P)
    vx = 0 if side == 'v' else 0
    # a single page: art drawn in a PW x PH window. For a verso the trim box starts at x = B; for a recto at x = 0.
    return '<svg xmlns="http://www.w3.org/2000/svg" class="art" viewBox="0 0 %s %s" preserveAspectRatio="none">%s</svg>' % (f(PW * U), f(PH * U), P.svg())


def ox(num):
    """trim box left edge in page units for a page number"""
    return (B * U) if num % 2 == 0 else 0


def pg_half_title():
    def art(P):
        o = ox(1)
        sky(P, '#FFF4DC', '#FFF4DC', PH * U, PW * U)
        A.peach_lilac(P, o + 425, 640, 1.9)
        for (x, y, s) in ((o + 180, 300, 1.6), (o + 680, 260, 1.3), (o + 560, 120, 1.0)):
            A.sparkle(P, x, y, s)
    inner = '<div class="center" style="top:2.1in"><h1 style="font-size:34pt;line-height:1.1">%s</h1></div>' % C.esc(BOOK['title'])
    return pagebox(1, inner, simple_art(art, 'r'))


def pg_belongs():
    def art(P):
        o = ox(2)
        sky(P, '#CFE6FA', '#FFF1D8', PH * U, PW * U)
        ground(P, 640, '#A9DB84', w=PW * U, h=PH * U)
        flowers_row(P, 640, o + 30, o + 840, 80, 3)
        A.puddles(P, o + 300, 730, 3.8, 'happy')
        A.tidbit_front(P, o + 690, 735, 3.4, 'happy', 'w')
    inner = ('<div class="center" style="top:.9in"><h2 style="font-size:30pt">This book belongs to</h2>'
             '<div style="margin:.5in auto 0;width:5.4in;border-bottom:3px dotted #8B7A55;height:.7in"></div>'
             '<p style="font-size:14pt;margin-top:.25in;color:#5A4E3A">(Write your name, or draw your face.)</p></div>')
    return pagebox(2, inner, simple_art(art, 'v'))


def pg_title():
    def art(P):
        o = ox(3)
        sky(P, '#BFE4F7', '#FFEBC9', PH * U, PW * U)
        A.sun(P, o + 730, 440, 52)
        A.sky_cloud(P, o + 150, 420, 1.3); A.sky_cloud(P, o + 470, 380, 0.9)
        rolling_p(P, 640, o)
        A.pup_side(P, 'tidbit', o + 250, 760, 4.4, 'run', 'happy', ph=0.9)
        A.pup_side(P, 'sugarfoot', o + 640, 765, 4.2, 'stand', 'happy', flip=True)
        A.basket(P, o + 440, 760, 2.4, full=True)
    inner = ('<div class="center" style="top:.5in"><h1 style="font-size:36pt;line-height:1.08">Tidbit and Sugarfoot&rsquo;s<br>Big Picnic</h1>'
             '<p style="font-size:13.5pt;margin-top:.15in;line-height:1.35;color:#4A4033">%s</p>'
             '<p style="font-size:14pt;margin-top:.28in;font-weight:700">by %s</p></div>'
             '<div class="center small" style="bottom:.45in;color:#4A4033">Independently published<br>%s</div>') % (C.esc(BOOK['subtitle']), C.esc(C.AUTHOR), C.SITE)
    return pagebox(3, inner, simple_art(art, 'r'))


def rolling_p(P, y, o, w=None):
    w = w or PW * U
    P.raw('<path d="M0 %s C%s %s %s %s %s %s S%s %s %s %s V%s H0Z" fill="#BFE6A0"/>' % (f(y - 40), f(w * .2), f(y - 90), f(w * .4), f(y - 30), f(w * .6), f(y - 50), f(w * .85), f(y), f(w), f(y - 40), f(PH * U)))
    P.raw('<path d="M0 %s C%s %s %s %s %s %s V%s H0Z" fill="#A9DB84"/>' % (f(y + 40), f(w * .3), f(y - 10), f(w * .7), f(y + 70), f(w), f(y + 20), f(PH * U)))


def pg_copyright():
    p = [
        '<em>%s</em>, Book %d: <em>%s</em>.<br>By %s. Independently published.' % (C.esc(BOOK['series']), BOOK['series_no'], C.esc(BOOK['title']), C.esc(C.AUTHOR)),
        'Text and pictures © 2026 %s. First print edition, %s. Printed on demand.' % (C.esc(C.AUTHOR), C.UPDATED),
        '<strong>Free online, always.</strong> Tidbit, Sugarfoot and their friends live at %s, where everything is free to read and use, with no account and no paid version. The print book is optional. You may copy pages of this book for personal use and for non-commercial teaching, with credit to “%s.”' % (C.SITE, C.SITE),
        'The characters and the story are original to this site.',
        'This is a story for sharing. It is general education about feelings and getting along, not a diagnosis or treatment, and it cannot know your child.',
        'Set in Andika, Fraunces and Lora (SIL Open Font License).',
    ]
    inner = '<div class="center small" style="top:1.6in;text-align:left;font-size:10.5pt">%s</div>' % ''.join('<p style="margin:0 0 .14in">%s</p>' % x for x in p)
    return pagebox(4, inner, '')


def pg_cast():
    def art(P):
        o = ox(5)
        sky(P, '#FFF4DC', '#FFEFD1', PH * U, PW * U)
        cells = [
            ('Tidbit', lambda x, y: A.pup_side(P, 'tidbit', x, y, 2.0, 'stand', 'happy')),
            ('Sugarfoot', lambda x, y: A.pup_side(P, 'sugarfoot', x, y, 2.0, 'stand', 'happy')),
            ('Professor Puddles', lambda x, y: A.puddles(P, x, y, 1.5)),
            ('Ollie', lambda x, y: A.ollie(P, x, y, 1.5)),
            ('Dot', lambda x, y: A.dot_snail(P, x, y, 1.9)),
            ('Hopper', lambda x, y: A.hopper(P, x, y, 2.1)),
            ('Nutmeg', lambda x, y: A.nutmeg(P, x, y, 1.6)),
            ('Lumi', lambda x, y: A.lumi(P, x, y, 1.2)),
            ('Beep', lambda x, y: A.beep(P, x, y, 1.5)),
            ('The ducklings', lambda x, y: A.ducklings(P, x, y, 1.0)),
            ('The Moon', lambda x, y: A.moon(P, x, y - 45, 1.0)),
            ('The Static clouds', None),
        ]
        cw, ch = 235, 152
        x0, y0 = o + 75, 150
        for i, (name, fn) in enumerate(cells):
            cx = x0 + (i % 3) * cw + cw / 2
            cy = y0 + (i // 3) * ch + 118
            if fn is not None:
                fn(cx, cy)
            else:
                for j, w in enumerate(('grumble', 'fuzz', 'mumble', 'drift')):
                    A.static_cloud(P, w, cx - 54 + (j % 2) * 108, cy - 50 + (j // 2) * 48, 1.7, 'happy', fizz=False)
            label(P, cx, cy + 36, name, 19, 'middle', bg=False, col='#3A3350')
    inner = '<div class="center" style="top:.55in"><h2 style="font-size:28pt">Who is in this story</h2></div>'
    return pagebox(5, inner, simple_art(art, 'r'))


def pg_calm(spread_first):
    """pages 32 and 33: a spread with the four breathing steps"""
    P = pen()
    sky(P, '#CDEBFA', '#FFF0D6')
    ground(P, 690, '#A9DB84')
    A.tidbit_front(P, 430, 810, 4.4, 'sleep', 'smile')
    A.flower(P, 580, 560, 4.0, '#F7A8C2', '#FAD27A', 6, stem=True, rot=-10)
    A.tidbit_front(P, 1290, 810, 4.4, 'calm', 'blow')
    A.candle(P, 1470, 790, 3.6, lean=1.0)
    for (x, y, r) in ((1430, 690, 9), (1470, 650, 12), (1520, 610, 15)):
        P.raw('<circle cx="%s" cy="%s" r="%s" fill="none" stroke="#8EC5EE" stroke-width="3"/>' % (x, y, r))
    steps = BOOK['calm_steps']

    def card(i):
        t, d = steps[i]
        return '<div class="card"><h3>%d. %s</h3><p>%s</p></div>' % (i + 1, C.esc(t), C.esc(d))
    left = '<div class="gu" style="top:.55in"><h2 style="text-align:center;color:#3A3350">%s</h2>%s%s</div>' % (C.esc(BOOK['calm_title']), card(0), card(1))
    right = '<div class="gu" style="top:.55in;padding-top:.75in">%s%s</div>' % (card(2), card(3))
    return (pagebox(32, left, page_svg(P, 'L')), pagebox(33, right, page_svg(P, 'R')))


def pg_text(num, body, bg='#FFFDF5', art=None):
    return pagebox(num, body, art or '')


def deco(num, items, sky_col='#FFFDF5'):
    """a strip of ground with a few friends at the bottom of a text page; items are (function, x offset, size, extra kwargs)"""
    def art(P):
        o = ox(num)
        sky(P, sky_col, sky_col, PH * U, PW * U)
        P.raw('<path d="M0 %s Q%s %s %s %s T%s %s V%s H0Z" fill="#CBE8B0"/>' % (f(PH * U - 120), f(PW * 25), f(PH * U - 160), f(PW * 50), f(PH * U - 120), f(PW * 100), f(PH * U - 130), f(PH * U)))
        for fn, dx, sc, kw in items:
            fn(P, o + dx, PH * U - 45, sc, **kw)
    return simple_art(art, 'r' if num % 2 else 'v')


def pg_grownups():
    G = BOOK['grownups']
    body = '<div class="gu"><h2>%s</h2>%s</div>' % (C.esc(G['title']), ''.join('<p>%s</p>' % C.esc(p) for p in G['paras']))
    return pagebox(34, body, deco(34, [(A.puddles, 220, 2.3, {}), (A.hopper, 520, 2.2, {'expr': 'happy'}), (A.dot_snail, 680, 2.0, {'expr': 'happy'})]))


def pg_talk():
    body = '<div class="gu"><h2>%s</h2><ol>%s</ol></div>' % (C.esc(BOOK['talk_title']), ''.join('<li>%s</li>' % C.esc(q) for q in BOOK['talk']))
    return pagebox(35, body, deco(35, [(A.nutmeg, 180, 2.0, {}), (A.ollie, 420, 2.0, {}), (A.beep, 640, 2.0, {})]))


def pg_words():
    cards = ''.join('<div class="card"><h3>%s</h3><p>%s</p></div>' % (C.esc(t), C.para(b)) for t, b in BOOK['words'])
    body = '<div class="gu"><h2>%s</h2>%s</div>' % (C.esc(BOOK['words_title']), cards)
    return pagebox(36, body, deco(36, [(A.lumi, 200, 1.7, {'glow': False}), (A.ducklings, 500, 1.4, {}), (A.hopper, 700, 1.8, {'expr': 'happy'})]))


def pg_find():
    def art(P):
        o = ox(37)
        sky(P, '#CFE6FA', '#FFF1D8', PH * U, PW * U)
        ground(P, 520, '#A9DB84', w=PW * U, h=PH * U)
        A.sky_cloud(P, o + 180, 300, 1.2)
        A.butterfly(P, o + 640, 330, 2.4)
        A.blanket(P, o + 420, 700, 560, 160, 1.0, '#E0554E')
        A.pie(P, o + 260, 690, 3.0)
        for (x, y) in ((o + 360, 690), (o + 420, 700), (o + 480, 685), (o + 540, 700), (o + 600, 690)):
            A.apple(P, x, y, 2.4)
        A.ducklings(P, o + 200, 590, 1.6)
        A.static_cloud(P, 'grumble', o + 120, 440, 2.6, fizz=False)
        A.static_cloud(P, 'fuzz', o + 320, 400, 2.6, fizz=False)
        A.static_cloud(P, 'mumble', o + 520, 430, 2.6, fizz=False)
        A.static_cloud(P, 'drift', o + 700, 410, 2.6, fizz=False)
        A.pup_side(P, 'tidbit', o + 700, 790, 2.4, 'sit', 'happy', flip=True)
        A.pup_side(P, 'sugarfoot', o + 140, 790, 2.4, 'sit', 'happy')
    inner = ('<div class="center" style="top:.5in"><h2 style="font-size:28pt">%s</h2>'
             '<p style="font-size:14pt;margin-top:.1in;line-height:1.5">%s</p></div>') % (C.esc(BOOK['find_title']), ' &middot; '.join(C.esc(x) for x in BOOK['find_items']))
    return pagebox(37, inner, simple_art(art, 'r'))


def pg_about():
    body = '<div class="gu"><h2>About this book</h2>%s</div>' % ''.join('<p>%s</p>' % C.esc(p) for p in BOOK['about_paras'])
    return pagebox(38, body, deco(38, [(A.sugarfoot_front, 250, 3.4, {'expr': 'happy', 'mouth_': 'smile'}), (A.tidbit_front, 580, 3.4, {'expr': 'happy', 'mouth_': 'w'})]))


def pg_end():
    def art(P):
        o = ox(39)
        sky(P, '#2F3566', '#F2A9B4', PH * U, PW * U, mid='#8F6FB5')
        for (x, y, r) in ((o + 90, 120, 9), (o + 300, 200, 12), (o + 600, 90, 9), (o + 760, 240, 10)):
            A.star(P, x, y, r, '#FBE9A0', 'flat')
        A.moon(P, o + 430, 300, 2.4, 'calm')
        P.raw('<path d="M0 650 Q%s 570 %s 650 T%s 630 V%s H0Z" fill="#5C5A94"/>' % (f(PW * 50), f(PW * 100 / 2), f(PW * 100), f(PH * U)))
        A.pup_side(P, 'tidbit', o + 250, 790, 3.6, 'sleep', 'sleep')
        A.pup_side(P, 'sugarfoot', o + 600, 795, 3.6, 'lie', 'sleep', flip=True, mouth_='smile')
        A.firefly(P, o + 120, 560, 1.8); A.firefly(P, o + 740, 520, 1.8)
    inner = '<div class="center" style="top:.6in"><h1 style="font-size:40pt;color:#FFF4DC">The End</h1><p style="color:#FFF4DC;font-size:15pt;margin-top:.15in">Goodnight, everyone.</p></div>'
    return pagebox(39, inner, simple_art(art, 'r'))


def pg_back():
    def art(P):
        o = ox(40)
        sky(P, '#FFF4DC', '#FFF4DC', PH * U, PW * U)
        A.peach_lilac(P, o + 425, 600, 1.9)
        A.sparkle(P, o + 190, 300, 1.6); A.sparkle(P, o + 690, 260, 1.3)
    inner = '<div class="center" style="top:1.3in"><h2 style="font-size:26pt">Thank you for reading.</h2><p style="font-size:14pt;margin-top:.12in">More at %s</p></div>' % C.SITE
    return pagebox(40, inner, simple_art(art, 'v'))


def build_pages():
    pages = [pg_half_title(), pg_belongs(), pg_title(), pg_copyright(), pg_cast()]
    for i, (fn, sp) in enumerate(zip(SPREADS, BOOK['spreads'])):
        P = spread_svg(fn)
        lp, rp = TEXT_POS[sp['id']]
        n = 6 + 2 * i
        pages.append(pagebox(n, tx(sp['left'], lp), page_svg(P, 'L')))
        pages.append(pagebox(n + 1, tx(sp['right'], rp), page_svg(P, 'R')))
    pages.extend(pg_calm(True))
    pages += [pg_grownups(), pg_talk(), pg_words(), pg_find(), pg_about(), pg_end(), pg_back()]
    assert len(pages) == PAGES, len(pages)
    return pages


# ------------------------------------------------------------------ the cover
def cover(pages=PAGES):
    sp = C.spine_in(pages, 'premium')
    W = 2 * B + 2 * TRIM + sp
    Hh = TRIM + 2 * B
    P = pen(3.4)
    wu, hu = W * U, Hh * U
    fx = (B + TRIM + sp) * U       # the front's left edge incl. nothing: trim box starts at fx
    bx = B * U                     # the back trim box's left edge
    sky(P, '#8FD0F0', '#FFF1D2', hu, wu, mid='#D6EEF8')
    A.sun(P, fx + 120, 360, 58)
    A.sky_cloud(P, fx + 700, 400, 1.3); A.sky_cloud(P, fx + 330, 330, 0.9)
    A.sky_cloud(P, bx + 200, 200, 1.3); A.sky_cloud(P, bx + 640, 300, 1.0)
    P.raw('<path d="M0 %s C%s %s %s %s %s %s S%s %s %s %s V%s H0Z" fill="#BFE6A0"/>' % (f(hu * 0.64), f(wu * .15), f(hu * .55), f(wu * .3), f(hu * .66), f(wu * .5), f(hu * .6), f(wu * .8), f(hu * .66), f(wu), f(hu * .6), f(hu)))
    P.raw('<path d="M0 %s C%s %s %s %s %s %s V%s H0Z" fill="#A9DB84"/>' % (f(hu * 0.8), f(wu * .3), f(hu * .72), f(wu * .7), f(hu * .86), f(wu), f(hu * .78), f(hu)))
    flowers_row(P, hu - 50, 20, wu - 20, 90, 4, 0.8)
    # front: the two pups, the basket and the friends
    A.pup_side(P, 'tidbit', fx + 215, 760, 4.5, 'run', 'happy', ph=0.9, wag=0.3)
    A.pup_side(P, 'sugarfoot', fx + 690, 765, 4.4, 'stand', 'happy', flip=True)
    A.basket(P, fx + 450, 770, 2.6, full=True)
    A.static_cloud(P, 'fuzz', fx + 200, 520, 2.4, 'happy', fizz=False)
    A.static_cloud(P, 'grumble', fx + 760, 560, 2.2, 'happy', fizz=False)
    A.butterfly(P, fx + 480, 520, 2.4)
    # back: the friends in a row
    A.puddles(P, bx + 120, 800, 2.2, 'smile')
    A.hopper(P, bx + 250, 805, 2.0, expr='happy')
    A.nutmeg(P, bx + 360, 805, 2.0, expr='happy')
    A.ducklings(P, bx + 470, 805, 1.0)
    A.beep(P, bx + 565, 805, 1.7)
    bg = C.svg_wrap(P, wu, hu, 'bg')
    front = ('<div style="position:absolute;left:.45in;right:.45in;top:.4in;text-align:center">'
             '<div style="font:700 11.5pt Andika;letter-spacing:.08em;color:#3A3350">%s &middot; BOOK %d</div>'
             '<div style="font:800 49pt/0.98 Fraunces,serif;color:#FFFDF5;-webkit-text-stroke:2.4px #2F3566;paint-order:stroke fill;margin-top:.1in;text-shadow:0 3px 0 rgba(47,53,102,.25)">%s</div>'
             '<div style="font:700 13pt/1.3 Andika;color:#2F3566;margin:.12in auto 0;width:6.4in;background:rgba(255,253,245,.82);border-radius:.2in;padding:.07in .15in">%s</div></div>'
             '<div style="position:absolute;left:0;right:0;bottom:.28in;text-align:center"><span style="display:inline-block;background:rgba(255,253,245,.9);border-radius:.2in;padding:.05in .3in;font:700 17pt Andika;color:#2F3566">%s</span></div>'
             ) % (C.esc(BOOK['ages'].upper()), BOOK['series_no'], "Tidbit and Sugarfoot&rsquo;s Big Picnic", C.esc(BOOK['subtitle']), C.esc(C.AUTHOR))
    back = ('<div style="position:absolute;left:.7in;right:.7in;top:.55in;font-size:13.5pt;line-height:1.45;background:rgba(255,253,245,.9);border-radius:.25in;padding:.22in .3in;border:2.5px solid #E8D5A2">'
            '<div style="font:800 17pt Fraunces,serif;margin-bottom:.1in;color:#3A3350">Zoom. Slow. Together.</div>%s'
            '<p style="margin:.12in 0 0;font-size:11pt;color:#4A4033">%s &middot; Free to read online at %s</p></div>') % (
        ''.join('<p style="margin:0 0 .09in">%s</p>' % C.esc(x) for x in BOOK['back_cover']), C.esc(BOOK['ages']), C.SITE)
    html, info = C.cover_doc(BOOK['title'], (TRIM, TRIM), pages, 'premium', bg, front, back, '')
    return html, info


def main():
    pages = build_pages()
    C.write(os.path.join(C.SRC, 'picture-book.html'), C.doc(BOOK['title'], CSS, '\n'.join(pages)))
    # the screen edition: the same pages with no bleed (8.5 x 8.5), for the free PDF
    screen_css = CSS.replace('size: %sin %sin' % (PW, PH), 'size: %sin %sin' % (TRIM, TRIM))
    C.write(os.path.join(C.SRC, 'picture-book-screen.html'), C.doc(BOOK['title'], screen_css + SCREEN_CSS, '\n'.join(pages)))
    html, info = cover(PAGES)
    C.write(os.path.join(C.SRC, 'cover-picture-book.html'), html)
    meta = C.load_json(os.path.join(C.OUT, 'kids.json'), {}) or {}
    meta.setdefault('books', {})['picture-book'] = dict(meta.get('books', {}).get('picture-book', {}), pages=PAGES, paper='premium', trim_in=[TRIM, TRIM], cover=info)
    C.write(os.path.join(C.OUT, 'kids.json'), json.dumps(meta, indent=1) + '\n')
    print('picture book: %d pages, spine %s in, cover %s x %s in' % (PAGES, info['spine_in'], info['width_in'], info['height_in']))


SCREEN_CSS = '''
/* the screen edition has no bleed: each page is the 8.5 in trim box. A verso page's trim box starts B in in, so shift it back. */
.pg { width: %(T)sin !important; height: %(T)sin !important; }
.pg > svg.art { width: %(PW)sin !important; height: %(PH)sin !important; top: -%(B)sin; }
.pg.v > svg.art { left: -%(B)sin; }
.pg.r > svg.art { left: 0; }
.pg .trim { top: 0 !important; }
.pg.v .trim, .pg.r .trim { left: 0 !important; }
''' % {'T': TRIM, 'PW': PW, 'PH': PH, 'B': B}

if __name__ == '__main__':
    main()
