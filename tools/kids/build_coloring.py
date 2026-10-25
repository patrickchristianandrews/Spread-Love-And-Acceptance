#!/usr/bin/env python3
"""build_coloring.py: the two coloring books (kids22).

    python3 tools/kids/build_coloring.py            writes book/kids/src/coloring-younger.html, coloring-older.html and their covers

Younger: 32 big, simple outlines (thick lines, one main friend and a little scenery). Older: 32 finer scenes with borders,
patterns and a short calming phrase in outline letters. Every picture is on a right-hand page; the page behind it is blank so
markers cannot bleed through. Pages are 8.5 x 11 in, black ink, no bleed (every line stays 0.5 in inside the edge).
The drawings come from tools/kids/kids_art.py in its 'line' mode (white shapes, one black stroke width, nothing filled).
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

PW, PHT = 850, 1100   # units: 100 a inch


def pen(sw):
    return A.Pen('line', sw=sw)


# ------------------------------------------------------------------ simple scenery
def ground(P, y=930, x0=70, x1=780, wiggle=18):
    P.raw('<path d="M%s %s Q%s %s %s %s T%s %s T%s %s" fill="none" stroke="#111" stroke-width="%s" stroke-linecap="round"/>' % (
        x0, y, x0 + 90, y - wiggle, x0 + 180, y, x0 + 360, y, x1, y, P.sw))


def base(P, sun=True, cloud=True, grass=True, flowers=True, y=930):
    if sun:
        A.sun(P, 705, 175, 62, face=True)
    if cloud:
        A.sky_cloud(P, 160, 170, 2.0)
    ground(P, y)
    if grass:
        for x in (110, 300, 560, 740):
            A.grass(P, x, y + 40, 2.2)
    if flowers:
        A.flower(P, 120, y + 28, 2.6, '#fff', '#fff', 6, stem=True)
        A.flower(P, 730, y + 28, 2.6, '#fff', '#fff', 5, stem=True)


def big(P, fn, x, y, s, *a, **k):
    fn(P, x, y, s, *a, **k)


# ------------------------------------------------------------------ the younger book: 32 pictures
def y_tidbit_zoom(P):
    base(P, flowers=False)
    A.speed_lines(P, 120, 700, 4, 150, 34, 2.4)
    A.pup_side(P, 'tidbit', 470, 880, 8.4, 'run', 'happy', ph=0.9, wag=0.3)


def y_sugarfoot(P):
    base(P)
    A.sugarfoot_front(P, 425, 900, 9.6, 'happy', 'smile', heart_=True)


def y_both(P):
    base(P, cloud=False)
    A.sugarfoot_front(P, 250, 900, 6.8, 'happy', 'smile')
    A.tidbit_front(P, 590, 900, 6.8, 'happy', 'w')
    A.heart(P, 425, 560, 3.0)


def y_puddles(P):
    base(P)
    A.puddles(P, 425, 900, 8.2, 'happy', mouth_='open')
    A.puddle(P, 650, 925, 90, 16)


def y_ollie(P):
    base(P, sun=False, flowers=False)
    P.raw('<path d="M60 760 Q420 720 790 770" fill="none" stroke="#111" stroke-width="%s" stroke-linecap="round"/>' % (P.sw * 2.4))
    A.ollie(P, 425, 770, 9.2, branch=False, expr='happy')
    A.star(P, 150, 300, 40, '#fff', 'shape'); A.star(P, 700, 380, 30, '#fff', 'shape')


def y_dot(P):
    base(P)
    A.dot_snail(P, 425, 880, 13.5, expr='happy')


def y_hopper(P):
    P.raw('<path d="M70 880 Q425 830 780 880" fill="none" stroke="#111" stroke-width="%s" stroke-linecap="round"/>' % P.sw)
    A.lily(P, 425, 860, 14, flower_=True)
    A.hopper(P, 380, 835, 13.5, expr='happy')
    A.sun(P, 700, 190, 62); A.sky_cloud(P, 160, 180, 2.0)


def y_nutmeg(P):
    base(P)
    A.nutmeg(P, 400, 900, 12.5)
    A.circ(P, 640, 880, 22, '#fff') if False else None
    P.at(660, 880, 1.0); P.ell(0, 0, 26, 32, '#fff'); P.path('M-26 -8 Q0 -40 26 -8Z', '#fff'); P.close()


def y_lumi(P):
    base(P, sun=False, flowers=False)
    A.star(P, 130, 240, 36, '#fff', 'shape'); A.star(P, 700, 300, 44, '#fff', 'shape'); A.star(P, 650, 150, 26, '#fff', 'shape')
    A.lumi(P, 425, 900, 7.4, lantern=True)


def y_beep(P):
    base(P)
    A.beep(P, 425, 900, 9.4, arm_up=True)


def y_ducklings(P):
    base(P, flowers=False)
    A.ducklings(P, 425, 880, 10.2)
    A.puddle(P, 425, 915, 280, 20)


def y_moon(P):
    P.raw('<rect x="0" y="0" width="1" height="1" fill="none"/>')
    for (x, y, r) in ((140, 190, 36), (720, 220, 30), (210, 800, 28), (690, 760, 40), (430, 130, 22)):
        A.star(P, x, y, r, '#fff', 'shape')
    A.moon(P, 425, 520, 9.5, 'calm', glow=False)


def _cloud(who, mood=None):
    def fn(P):
        base(P, sun=False, cloud=False, flowers=False)
        A.sky_cloud(P, 140, 160, 1.6); A.sky_cloud(P, 700, 240, 1.2)
        A.static_cloud(P, who, 425, 560, 24, mood, fizz=True)
    return fn


def y_peach(P):
    base(P, cloud=False)
    A.peach_lilac(P, 425, 900, 6.4)
    for (x, y, s) in ((130, 480, 3.4), (720, 420, 3.0), (660, 700, 2.4)):
        A.sparkle(P, x, y, s)


def y_bunny(P):
    base(P)
    A.bunny(P, 425, 900, 13.5, happy=True)


def y_hedgehog(P):
    base(P, sun=False)
    A.hedgehog(P, 425, 880, 14.5, expr='happy')
    A.mushroom(P, 150, 910, 4.0); A.mushroom(P, 700, 915, 3.2)


def y_butterfly(P):
    A.sun(P, 705, 175, 62)
    ground(P, 930)
    A.butterfly(P, 425, 560, 22)
    for (x, y, s) in ((130, 930, 4.6), (260, 940, 5.2), (590, 940, 5.0), (730, 930, 4.4)):
        A.flower(P, x, y - 60, s, '#fff', '#fff', 6, stem=True)


def y_basket(P):
    base(P, flowers=False)
    A.basket(P, 425, 880, 11.5, full=True)
    for (x, y) in ((150, 700), (700, 640)):
        A.apple(P, x, y, 5.0)


def y_cottage(P):
    base(P, flowers=False)
    A.house(P, 425, 900, 8.6)
    A.fence(P, 70, 780, 925, 90)
    A.tree(P, 700, 900, 3.0)


def y_walk(P):
    base(P, flowers=False)
    A.pup_side(P, 'tidbit', 235, 890, 6.4, 'walk', 'happy', ph=0.5)
    A.pup_side(P, 'sugarfoot', 640, 890, 6.4, 'walk', 'happy', ph=0.2, flip=True)
    A.basket(P, 440, 760, 4.2, full=True)


def y_sleep(P):
    for (x, y, r) in ((150, 200, 34), (700, 260, 30), (600, 130, 22)):
        A.star(P, x, y, r, '#fff', 'shape')
    A.moon(P, 640, 330, 3.4, 'calm', glow=False)
    ground(P, 900)
    A.pup_side(P, 'sugarfoot', 390, 880, 10.2, 'sleep', 'sleep')


def y_candle(P):
    base(P, flowers=False)
    A.tidbit_front(P, 330, 900, 8.2, 'calm', 'blow')
    A.candle(P, 690, 890, 8.0, lean=1.0)
    for (x, y, r) in ((545, 560, 26), (610, 480, 36), (690, 400, 46)):
        P.circ(x, y, r, '#fff')


def y_flower(P):
    base(P, flowers=False)
    A.tidbit_front(P, 330, 900, 8.4, 'sleep', 'smile')
    A.flower(P, 640, 560, 12, '#fff', '#fff', 6, stem=True)


def y_heart(P):
    base(P, sun=False)
    A.heart(P, 425, 420, 9.0)
    A.tidbit_front(P, 220, 920, 5.6, 'happy', 'w')
    A.sugarfoot_front(P, 640, 920, 5.6, 'happy', 'smile')


def y_rain(P):
    A.sky_cloud(P, 425, 190, 5.0)
    for x in range(260, 620, 60):
        P.line('M%s 280 l-10 44' % x, '#111', kind='fine')
    A.puddles(P, 425, 880, 7.4, 'happy')
    A.puddle(P, 425, 910, 300, 22)
    A.puddle(P, 700, 940, 90, 12)


def y_fireflies(P):
    for (x, y, r) in ((130, 210, 34), (710, 180, 26)):
        A.star(P, x, y, r, '#fff', 'shape')
    A.moon(P, 650, 330, 2.6, 'calm', glow=False)
    ground(P, 920)
    A.pup_side(P, 'tidbit', 380, 890, 7.4, 'sit', 'happy')
    for (x, y) in ((200, 560), (320, 420), (560, 560), (690, 650), (150, 740), (500, 340)):
        A.firefly(P, x, y, 4.2)


def y_pond(P):
    P.ell(425, 800, 360, 130, '#fff')
    A.lily(P, 250, 800, 5.6); A.lily(P, 590, 840, 5.2)
    A.hopper(P, 250, 780, 7.2, expr='happy')
    A.ducklings(P, 500, 700, 3.6)
    A.sun(P, 705, 170, 60); A.sky_cloud(P, 150, 180, 2.0)
    for x in (110, 740):
        A.grass(P, x, 930, 3.0)


def y_group(P):
    base(P, flowers=False)
    A.blanket(P, 425, 900, 700, 150, 1.0, '#111')
    A.sugarfoot_front(P, 215, 860, 5.0, 'happy', 'smile')
    A.tidbit_front(P, 425, 860, 5.0, 'happy', 'w')
    A.puddles(P, 630, 860, 4.2, 'happy')
    A.basket(P, 540, 960, 2.2, full=True) if False else None


def y_goodnight(P):
    for (x, y, r) in ((140, 190, 34), (720, 220, 30), (200, 540, 22), (680, 520, 24)):
        A.star(P, x, y, r, '#fff', 'shape')
    A.moon(P, 425, 330, 5.2, 'calm', glow=False)
    ground(P, 900)
    A.pup_side(P, 'tidbit', 250, 880, 5.6, 'sleep', 'sleep')
    A.pup_side(P, 'sugarfoot', 640, 885, 5.6, 'lie', 'sleep', flip=True, mouth_='smile')


def y_cast(P):
    ground(P, 960, 60, 790)
    A.pup_side(P, 'tidbit', 150, 480, 3.4, 'stand', 'happy')
    A.pup_side(P, 'sugarfoot', 420, 480, 3.4, 'stand', 'happy')
    A.puddles(P, 690, 480, 3.0, 'happy')
    A.ollie(P, 130, 760, 3.4, branch=False); A.dot_snail(P, 330, 760, 4.6); A.hopper(P, 500, 760, 4.8); A.nutmeg(P, 670, 780, 4.2)
    A.lumi(P, 150, 1010, 2.4); A.beep(P, 320, 1010, 3.0); A.ducklings(P, 520, 1010, 2.6)
    A.moon(P, 700, 900, 2.3, 'calm', glow=False)


YOUNGER = [
    ('Tidbit zooms', y_tidbit_zoom), ('Sugarfoot', y_sugarfoot), ('Best friends', y_both), ('Professor Puddles', y_puddles),
    ('Ollie the owl', y_ollie), ('Dot the snail', y_dot), ('Hopper the frog', y_hopper), ('Nutmeg the squirrel', y_nutmeg),
    ('Lumi and her lantern', y_lumi), ('Beep the robot', y_beep), ('The ducklings', y_ducklings), ('The Moon', y_moon),
    ('Grumble', _cloud('grumble', 'grumpy')), ('Fuzz', _cloud('fuzz')), ('Mumble', _cloud('mumble')), ('Drift', _cloud('drift')),
    ('Peach and Lilac', y_peach), ('The bunny', y_bunny), ('The hedgehog', y_hedgehog), ('Butterfly and flowers', y_butterfly),
    ('The picnic basket', y_basket), ('Puddle Hollow', y_cottage), ('A walk home', y_walk), ('Sugarfoot sleeps', y_sleep),
    ('Blow the candle', y_candle), ('Smell the flower', y_flower), ('Sharing a heart', y_heart), ('A rainy day', y_rain),
    ('Fireflies', y_fireflies), ('The lily pond', y_pond), ('Picnic time', y_group), ('Goodnight', y_goodnight),
]
# the cast page replaces nothing: it is the first page after the title (a sheet of everyone to color)
YOUNGER_PAGE_SW = 5.2


# ------------------------------------------------------------------ the older book: 32 scenes with a phrase each (in coloring_older.py)
from coloring_older import OLDER, OLDER_PAGE_SW  # noqa: E402

CSS = '''
@page { size: 8.5in 11in; margin: 0; }
html, body { margin: 0; padding: 0; background: #fff; }
.pg { position: relative; width: 8.5in; height: 11in; overflow: hidden; page-break-after: always; break-after: page; background: #fff; font-family: "Andika", sans-serif; color: #111; }
.pg:last-child { page-break-after: auto; break-after: auto; }
.pg > svg.art { position: absolute; left: 0; top: 0; width: 8.5in; height: 11in; display: block; }
.cap { position: absolute; left: .6in; right: .6in; text-align: center; font-family: "Fraunces", serif; font-weight: 800; color: #fff; -webkit-text-stroke: .8pt #111; paint-order: stroke fill; letter-spacing: .035em; }
.cap.small { font-size: 24pt; bottom: .5in; }
.cap.phrase { line-height: 1.1; top: 9.42in; height: .86in; display: flex; align-items: center; justify-content: center; left: 1.0in; right: 1.0in; }
.cap.top { top: .5in; bottom: auto; }
.pg .t { position: absolute; left: .9in; right: .9in; text-align: center; }
h1 { font-family: "Fraunces", serif; font-weight: 800; margin: 0; }
.copy { font-size: 10.5pt; line-height: 1.5; position: absolute; left: 1.1in; right: 1.1in; top: 2.2in; text-align: left; }
.copy p { margin: 0 0 .16in; }
.outline { color: #fff; -webkit-text-stroke: 1.4pt #111; paint-order: stroke fill; }
'''


def svg_page(P):
    return '<svg xmlns="http://www.w3.org/2000/svg" class="art" viewBox="0 0 %d %d" preserveAspectRatio="xMidYMid meet">%s</svg>' % (PW, PHT, P.svg())


def page(inner, art=''):
    return '<section class="pg">%s%s</section>' % (art, inner)


def blank():
    return '<section class="pg"></section>'


def title_page(kind):
    if kind == 'younger':
        h = 'Color with Tidbit and Sugarfoot'
        sub = 'A big coloring book of friends, for ages 3 to 7'
        P = pen(5.2)
        A.sugarfoot_front(P, 250, 880, 5.8, 'happy', 'smile', heart_=True)
        A.tidbit_front(P, 600, 880, 5.8, 'happy', 'w')
        A.sun(P, 705, 330, 50); A.sky_cloud(P, 140, 360, 1.8)
        ground(P, 905, 60, 790)
    else:
        h = 'Color and Calm with Tidbit and Sugarfoot'
        sub = 'Detailed scenes and short, calming phrases, for ages 8 to 12'
        P = pen(3.4)
        A.pup_side(P, 'tidbit', 250, 880, 5.0, 'walk', 'happy', ph=0.5)
        A.pup_side(P, 'sugarfoot', 600, 885, 5.0, 'walk', 'happy', ph=0.2, flip=True)
        A.mandala_flower(P, 425, 520, 130, 3, 10)
        for (x, y, r) in ((130, 330, 28), (720, 330, 28)):
            A.star(P, x, y, r, '#fff', 'shape')
    t = ('<div class="t" style="top:.7in"><h1 class="outline" style="font-size:%dpt;line-height:1.05">%s</h1>'
         '<p style="font-size:13pt;margin:.2in 0 0;font-weight:700">%s</p></div>'
         '<div class="t" style="bottom:.45in;font-size:12pt;font-weight:700">by %s</div>') % (40 if kind == 'younger' else 34, C.esc(h), C.esc(sub), C.AUTHOR)
    return page(t, svg_page(P))


def copyright_page(kind):
    younger = kind == 'younger'
    name = 'Color with Tidbit and Sugarfoot' if younger else 'Color and Calm with Tidbit and Sugarfoot'
    n = 3 if younger else 4
    s = ('<div class="copy"><p><em>%s</em>, Book %d: <em>%s</em>.<br>By %s. Independently published.</p>'
         '<p>Pictures © 2026 %s. First print edition, %s. Printed on demand, with a black-and-white interior.</p>'
         '<p><strong>The back of every picture is blank</strong>, so markers will not soak through to the next one. Slide a sheet of paper under the page you are coloring.</p>'
         '<p><strong>Free online, always.</strong> The characters live at %s, where everything is free to read and use, with no account and no paid version. This print book is optional. You may copy pages for personal use and for non-commercial teaching, with credit to “%s.”</p>'
         '<p><strong>How it was made.</strong> The pictures were drawn by code that was written with an AI tool, in the same style as the characters on the site. %s</p>'
         '<p>Set in Fraunces and Andika (SIL Open Font License).</p></div>') % (
        C.esc(C.SERIES), n, C.esc(name), C.esc(C.AUTHOR), C.esc(C.AUTHOR), C.UPDATED, C.SITE, C.SITE,
        '' if younger else 'The phrases were drafted with an AI writing tool.')
    return page(s)


def thanks_page(kind):
    P = pen(5.0 if kind == 'younger' else 3.2)
    A.peach_lilac(P, 425, 640, 5.2)
    for (x, y, s) in ((150, 380, 3.4), (700, 330, 3.0), (610, 820, 2.4), (200, 800, 2.6)):
        A.sparkle(P, x, y, s)
    t = ('<div class="t" style="top:1.1in"><h1 class="outline" style="font-size:36pt;line-height:1.1">Thank you for coloring!</h1>'
         '<p style="font-size:14pt;margin-top:.2in;font-weight:700">Draw your own friend on the back of this page, or on any blank back.</p></div>'
         '<div class="t" style="bottom:.55in;font-size:12pt;font-weight:700">More at %s</div>') % C.SITE
    return page(t, svg_page(P))


def build_book(kind):
    younger = kind == 'younger'
    pages = [title_page(kind), copyright_page(kind)]
    items = YOUNGER if younger else OLDER
    sw = YOUNGER_PAGE_SW if younger else OLDER_PAGE_SW
    alts = []
    for entry in items:
        if younger:
            cap, fn = entry
            P = pen(sw)
            fn(P)
            P.raw('<rect x="0" y="985" width="850" height="115" fill="#fff"/>')
            inner = '<div class="cap small">%s</div>' % C.esc(cap)
        else:
            cap, fn, phrase = entry
            P = pen(sw)
            fn(P)
            # the phrase sits on a white banner, so nothing from the picture runs through the letters
            P.raw('<rect x="0" y="928" width="850" height="172" fill="#fff"/>')
            P.raw('<rect x="78" y="942" width="694" height="86" rx="30" fill="#fff" stroke="#111" stroke-width="%s"/>' % (P.sw * 1.1))
            for (x, y) in ((76, 76), (774, 76), (76, 1024), (774, 1024)):
                P.circ(x, y, 15, '#fff')
            inner = '<div class="cap phrase" style="font-size:%dpt">%s</div>' % (27 if len(phrase) < 34 else 21, C.esc(phrase))
        pages.append(page(inner, svg_page(P)))
        pages.append(blank())
        alts.append(cap)
    pages.append(thanks_page(kind))
    pages.append(blank())
    ident = 'coloring-%s' % kind
    C.write(os.path.join(C.SRC, ident + '.html'), C.doc(ident, CSS, '\n'.join(pages)))
    meta = C.load_json(os.path.join(C.OUT, 'kids.json'), {}) or {}
    rec = meta.setdefault('books', {}).setdefault(ident, {})
    rec.update(title=('Color with Tidbit and Sugarfoot' if younger else 'Color and Calm with Tidbit and Sugarfoot'), trim_in=[8.5, 11], paper='white', pictures=len(items), pages_planned=len(pages))
    C.write(os.path.join(C.OUT, 'kids.json'), json.dumps(meta, indent=1) + '\n')
    print('%s: %d pictures, %d pages' % (ident, len(items), len(pages)))
    return rec


CB = {'younger': C.load_json(os.path.join(C.MS, 'coloring-younger.json')), 'older': C.load_json(os.path.join(C.MS, 'coloring-older.json'))}


def crayon(P, x, y, s, col, rot=0):
    P.at(x, y, s, rot=rot)
    P.rect(-5, -34, 10, 56, col, r=1)
    P.path('M-5 -34 L0 -48 L5 -34Z', col)
    P.rect(-5.4, -22, 10.8, 5, '#FFFDF5', r=0.5, kind='flat')
    P.close()


def make_cover(kind, pages):
    younger = kind == 'younger'
    book = CB[kind]
    w, h = 8.5, 11.0
    sp = C.spine_in(pages, 'white')
    B = C.BLEED
    Wt, Ht = 2 * B + 2 * w + sp, h + 2 * B
    P = A.Pen('color', sw=4.0 if younger else 3.2)
    U = 100
    wu, hu = Wt * U, Ht * U
    fx, bx = (B + w + sp) * U, B * U
    gid = C.grad(P, 'cv', [(0, '#8FD0F0'), (0.6, '#FFF1D2'), (1, '#BFE6A0')] if younger else [(0, '#6A52A0'), (0.55, '#C9A8E0'), (1, '#FFE4C4')])
    P.raw('<rect width="%s" height="%s" fill="url(#%s)"/>' % (f(wu), f(hu), gid))
    cols = ['#E25C4F', '#F2C14E', '#6FB36A', '#4B9CD3', '#9C83D0', '#F08DA8']
    if younger:
        A.sun(P, fx + 110, 600, 66); A.sky_cloud(P, fx + 690, 560, 2.2)
        P.raw('<path d="M0 %s C%s %s %s %s %s %s V%s H0Z" fill="#A9DB84"/>' % (f(hu * .78), f(wu * .3), f(hu * .7), f(wu * .7), f(hu * .84), f(wu), f(hu * .76), f(hu)))
        A.sugarfoot_front(P, fx + 250, 1040, 6.4, 'happy', 'smile', heart_=True)
        A.tidbit_front(P, fx + 600, 1040, 6.4, 'happy', 'w')
        for i, c in enumerate(cols):
            crayon(P, fx + 130 + i * 118, 1125, 1.5, c, rot=-12 + i * 5)
        A.puddles(P, bx + 150, 1000, 2.8, 'smile'); A.hopper(P, bx + 300, 1040, 2.8, expr='happy'); A.beep(P, bx + 450, 1040, 2.6)
    else:
        A.mandala_flower(P, fx + 425, 640, 280, 4, 12)
        for (x, y, r) in ((fx + 80, 360, 18), (fx + 780, 340, 20), (fx + 140, 900, 14), (bx + 120, 260, 16), (bx + 700, 300, 14)):
            A.star(P, x, y, r, '#FBE9A0', 'flat')
        A.pup_side(P, 'tidbit', fx + 250, 1035, 5.0, 'walk', 'happy', ph=0.5)
        A.pup_side(P, 'sugarfoot', fx + 620, 1040, 5.0, 'walk', 'happy', ph=0.2, flip=True)
        for i, c in enumerate(cols):
            crayon(P, bx + 100 + i * 100, 1110, 1.3, c, rot=-10 + i * 5)
    bg = C.svg_wrap(P, wu, hu, 'bg')
    nm = book['title'].replace('Color and Calm with ', 'Color and Calm with<br>').replace('Color with ', 'Color with<br>')
    front = ('<div style="position:absolute;left:.5in;right:.5in;top:.5in;text-align:center">'
             '<div style="font:700 12pt Andika;letter-spacing:.12em;color:#3A3350">%s &middot; BOOK %d</div>'
             '<div style="font:800 %dpt/0.98 Fraunces,serif;color:#FFFDF5;-webkit-text-stroke:2.6px #2F3566;paint-order:stroke fill;margin-top:.12in">%s</div>'
             '<div style="font:700 14pt/1.3 Andika;color:#2F3566;margin:.16in auto 0;width:6.6in;background:rgba(255,253,245,.85);border-radius:.22in;padding:.08in .2in">%s</div></div>'
             '<div style="position:absolute;left:0;right:0;bottom:.3in;text-align:center"><span style="display:inline-block;background:rgba(255,253,245,.92);border-radius:.2in;padding:.05in .3in;font:700 17pt Andika;color:#2F3566">%s</span></div>'
             ) % (C.esc(book['ages'].upper()), book['series_no'], 52 if younger else 46, nm, C.esc(book['subtitle']), C.esc(C.AUTHOR))
    back = ('<div style="position:absolute;left:.7in;right:.7in;top:.7in;font-size:14pt;line-height:1.45;background:rgba(255,253,245,.92);border-radius:.25in;padding:.28in .35in;border:2.5px solid #E8D5A2">'
            '<div style="font:800 20pt Fraunces,serif;margin-bottom:.12in;color:#3A3350">%s</div>%s'
            '<p style="margin:.14in 0 0;font-size:11.5pt;color:#4A4033">%s &middot; Free to read online at %s</p></div>') % (
        'Pick up a crayon.' if younger else 'Take a calm minute.', ''.join('<p style="margin:0 0 .1in">%s</p>' % C.esc(x) for x in book['back_cover']), C.esc(book['ages']), C.SITE)
    html, info = C.cover_doc(book['title'], (w, h), pages, 'white', bg, front, back, '')
    ident = 'coloring-' + kind
    C.write(os.path.join(C.SRC, 'cover-%s.html' % ident), html)
    meta = C.load_json(os.path.join(C.OUT, 'kids.json'), {}) or {}
    meta['books'][ident]['cover'] = info
    C.write(os.path.join(C.OUT, 'kids.json'), json.dumps(meta, indent=1) + '\n')
    print('%s cover: spine %s in, %s x %s in' % (ident, info['spine_in'], info['width_in'], info['height_in']))


def main():
    which = sys.argv[1:] or ['younger', 'older']
    for k in which:
        rec = build_book(k)
        pages = rec.get('pages_planned') or 68
        make_cover(k, pages)


if __name__ == '__main__':
    main()
