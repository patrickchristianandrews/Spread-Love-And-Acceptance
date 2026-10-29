#!/usr/bin/env python3
"""ac_pups.py: the pages where Tidbit and Sugarfoot appear (adultcolor29): a hammock inside a mandala, and peeking from a flower field.
The pups are the exact kids-book drawings (tools/kids/cast.py) drawn at an elegant small scale with a finer pen."""
import math
from ac_core import *
from ac_props import cloud, sparkle, round_tree, pup_ink
from ac_botan import stem, bez_pt, bez_tan, daisy, poppy, cosmos, tulip, bellflower, grass, butterfly, draw_leaf, lavender, bee
from ac_mandala import band_petals, band_scallop, band_round, circ_ring, dots, ring_at, m_petal, m_drop_out, corner_set, disk, flower
from ac_scenes1 import draw_pup
import cast


def m_hammock(pg):
    """two pups asleep in a hammock between two trees, in the middle of a mandala"""
    cx, cy = CX, CY
    circ_ring(pg, cx, cy, 334, W1)
    dots(pg, cx, cy, 320, 84, 0, 1.6)
    circ_ring(pg, cx, cy, 306, W2)
    band_scallop(pg, cx, cy, 276, 306, 32, PI / 32, dot=True)
    from ac_mandala import band_tri
    band_tri(pg, cx, cy, 258, 276, 64, 0)
    R = 258
    disk_p = circ(cx, cy, R)
    pg.shape(disk_p, W2)
    pg.clip(disk_p)
    cloud(pg, cx - 60, cy - 190, 130, 50)
    cloud(pg, cx + 110, cy - 130, 90, 36)
    for sg in (-1, 1):
        x = cx + sg * 196
        pg.shape(ribbon([(x + sg * 6, cy + 270), (x, cy + 110), (x - sg * 4, cy), (x - sg * 10, cy - 100)], 38, 24, n=14), W2)
        pg.line(Path().M(x - 8, cy + 150).C(x - 3, cy + 100, x - 8, cy + 50, x - 3, cy + 8), W3)
        pg.line(Path().M(x + 10, cy + 190).C(x + 6, cy + 140, x + 10, cy + 100, x + 6, cy + 70), W3)
        cs = [(x - sg * 6, cy - 140, 58), (x - sg * 52, cy - 112, 42), (x + sg * 44, cy - 118, 44), (x - sg * 8, cy - 186, 42)]
        pg.union_circles(cs, W2)
        for (dx, dy) in ((-16, -118), (20, -136), (-36, -96), (10, -176), (34, -100), (-6, -150)):
            pg.line(curve([(x - sg * 6 + dx - 11, cy + dy + 6), (x - sg * 6 + dx, cy + dy - 4), (x - sg * 6 + dx + 11, cy + dy + 6)]), W3)
    lx, rx = cx - 190, cx + 190
    top_y = cy - 14
    sag = 118
    ytop = top_y + sag * 0.96
    draw_pup(pg, cast.pup_side, 'sugarfoot', cx - 86, ytop, 0.7, 'lie', 'sleep', False, 1)
    draw_pup(pg, cast.pup_side, 'tidbit', cx + 90, ytop - 2, 0.7, 'lie', 'sleep', True, 1)
    cloth = Path().M(lx + 8, top_y + 6).C(lx + 80, top_y + sag * 1.55, rx - 80, top_y + sag * 1.55, rx - 8, top_y + 6).C(rx - 80, top_y + sag * 1.27, lx + 80, top_y + sag * 1.27, lx + 8, top_y + 6).Z()
    pg.shape(cloth, W2)
    pg.line(Path().M(lx + 22, top_y + 12).C(lx + 92, top_y + sag * 1.42, rx - 92, top_y + sag * 1.42, rx - 22, top_y + 12), W3, dash='1 9')
    for k in range(15):
        t = (k + 0.5) / 15
        x = lx + 8 + (rx - lx - 16) * t
        y = top_y + 6 + sag * (1.55 * 0.75 * 4 * t * (1 - t)) * 0.99 - 3
        pg.line(Path().M(x, y + 2).L(x + (t - 0.5) * 3, y + 15), W3)
    for sg in (-1, 1):
        x0 = cx + sg * 196
        pg.line(Path().M(x0 - sg * 6, top_y - 8).L(x0 - sg * 16, top_y + 6), W2)
        pg.circle(x0 - sg * 6, top_y - 12, 6, W2)
    pg.endclip()
    corner_set(pg, 'dots', 150)


def b_peek(pg):
    """Tidbit and Sugarfoot peeking out of a flower field: tall flowers behind, short ones in front"""
    gy = 1030
    # the far row: tall stems with big heads, drawn first
    tall = [(110, 330, 'bell', 40), (250, 250, 'lav', 0), (610, 270, 'lav', 0), (750, 340, 'bell', 40), (180, 470, 'daisy', 52), (680, 480, 'daisy', 52), (430, 190, 'tulip', 0)]
    for (x, y, kind, R) in tall:
        ctrl = [(x, gy), (x + (x - 430) * 0.06, gy - 240), (x - 14, y + 200), (x, y + (50 if kind == 'lav' else 20))]
        stem(pg, ctrl, 9, 5)
    for (x, y, kind, R) in tall:
        if kind == 'bell':
            bellflower(pg, x, y, R, 0.2)
        elif kind == 'lav':
            lavender(pg, x, y + 120, 120, -90, 9, 12)
        elif kind == 'daisy':
            daisy(pg, x, y, R, 0.2, 14)
        else:
            tulip(pg, x, y + 70, 86, 110)
    for (x, y, a, L) in ((140, 760, -100, 120), (730, 760, -80, 120), (300, 700, -120, 100), (570, 700, -60, 100)):
        draw_leaf(pg, x, y + 120, a, L, 26, 0.2, 3)
    # the pups
    draw_pup(pg, cast.pup_peek, 'tidbit', 330, 700, 1.15, 'happy', lvl=1, paws=True)
    draw_pup(pg, cast.pup_peek, 'sugarfoot', 540, 706, 1.15, 'calm', lvl=1, paws=True)
    # the near row: shorter flowers hide the pups' shoulders
    near = [(130, 880, 'poppy', 58), (290, 850, 'cosmos', 52), (430, 900, 'daisy', 54), (570, 850, 'poppy', 54), (740, 880, 'cosmos', 56), (210, 960, 'daisy', 42), (660, 960, 'daisy', 42)]
    for (x, y, kind, R) in near:
        stem(pg, [(x, gy), (x + 6, gy - 50), (x - 6, y + 70), (x, y)], 9, 6)
    for (x, y, kind, R) in near:
        draw_leaf(pg, x, y + 90, -60 - (x - 430) * 0.1, 66, 18, 0.2, 2)
        draw_leaf(pg, x, y + 100, -120 - (x - 430) * 0.1, 66, 18, -0.2, 2)
    for (x, y, kind, R) in near:
        if kind == 'poppy':
            poppy(pg, x, y, R, 0.3)
        elif kind == 'cosmos':
            cosmos(pg, x, y, R, 0.2)
        else:
            daisy(pg, x, y, R, 0.2, 12)
    grass(pg, FX + 12, FX + FW - 12, gy + 6, 24, 70, 15, 2.0)
    butterfly(pg, 600, 120, 58, 14)
    bee(pg, 240, 130, 36, -12)
