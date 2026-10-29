#!/usr/bin/env python3
"""ac_scenes1.py: quiet scenes, part one (adultcolor29): the reading nook, the lighthouse, the tea table, the mountain lake, the balloon."""
import math
from ac_core import *
import ac_props as pr
from ac_props import cloud, sparkle, star5, pine, round_tree, book_stack, mug, cushion, window_arch, string_lights, pup_ink
from ac_botan import pot, grass, stem, bez_pt, bez_tan, m_diamond_s, butterfly
from ac_mandala import m_petal, m_drop
import cast


def draw_pup(pg, fn, *a, **k):
    ink = pup_ink()
    fn(ink, *a, **k)
    pg.raw(ink.svg())


def raindrop(pg, x, y, s=1.0):
    P = Path().M(0, -9 * s).C(5 * s, -2 * s, 6 * s, 3 * s, 0, 8 * s).C(-6 * s, 3 * s, -5 * s, -2 * s, 0, -9 * s).Z()
    pg.shape(at(P, x, y), W3)


def curtain(pg, side, x_edge, x_in, top, bottom, tie):
    """a curtain hung from a rod, gathered by a tieback. side=-1 is the left one"""
    s = side
    w_top = abs(x_in - x_edge)
    P = Path().M(x_edge, top).L(x_in, top)
    P.C(x_in + s * -2, top + (tie - top) * 0.4, x_in + s * 12, tie - 70, x_in + s * 10, tie)
    P.C(x_in + s * 6, tie + 60, x_in + s * -52, bottom - 100, x_in + s * -58, bottom)
    P.L(x_edge, bottom)
    P.C(x_edge - s * 4, bottom - 140, x_edge + s * 14, tie + 90, x_edge + s * 8, tie)
    P.C(x_edge + s * 2, tie - 80, x_edge, top + 70, x_edge, top).Z()
    pg.shape(P, W2)
    pg.clip(P)
    for i in range(1, 5):
        t = i / 5
        xa = x_edge + (x_in - x_edge) * t
        pg.line(Path().M(xa, top + 8).C(xa + s * 4, tie - 60, xa + s * 12 * (1 - t) - 10 * s * t, tie + 60, xa - s * 40 * t, bottom), W3)
    pg.endclip()
    # the tieback: a band with a button
    xt = x_in + s * 4
    pg.shape(rrect(xt - 24, tie - 9, 48, 18, 8), W2)
    pg.circle(xt, tie, 4, W3)


def s_nook(pg):
    """a reading nook by a rainy window: a window seat, Sugarfoot, books, a mug and rain on the glass"""
    cx = CX
    pg.line(Path().M(104, 112).L(756, 112), W1)
    pg.circle(100, 112, 9, W2)
    pg.circle(760, 112, 9, W2)
    # the window
    outer = window_arch(212, 648, 150, 660)
    pg.shape(outer, W1)
    glass = window_arch(228, 632, 166, 646)
    pg.shape(glass, W2)
    pg.clip(glass)
    # outside: far hills, a tree, clouds, rain
    pg.shape(Path().M(210, 520).C(260, 450, 330, 440, 400, 500).C(470, 430, 560, 430, 650, 520).L(650, 660).L(210, 660).Z(), W2)
    for (x, b, h, w) in ((300, 540, 120, 80), (520, 548, 140, 96)):
        round_tree(pg, x, b, h, w, W2, leaf=False)
    cloud(pg, 330, 250, 170, 70)
    cloud(pg, 520, 330, 150, 60)
    for i in range(7):
        for j in range(6):
            x = 250 + i * 58 + (j % 2) * 28
            y = 200 + j * 80
            pg.line(Path().M(x, y).L(x - 9, y + 26), W3)
    pg.endclip()
    # mullions
    pg.shape(rrect(424, 160, 12, 492, 4), W2)
    pg.shape(rrect(224, 372, 412, 12, 4), W2)
    pg.shape(rrect(224, 512, 412, 12, 4), W2)
    pg.shape(rrect(214, 640, 432, 36, 6), W2)   # the sill
    for (x, y, s) in ((300, 430, 1.1), (360, 470, 1.0), (500, 440, 1.2), (560, 580, 1.0), (270, 580, 1.0), (470, 600, 0.9)):
        raindrop(pg, x, y, s * 1.2)
    # curtains
    curtain(pg, -1, 112, 212, 118, 800, 470)
    curtain(pg, 1, 748, 648, 118, 800, 470)
    # the window seat
    pg.shape(rrect(150, 730, 560, 150, 8), W2)
    for i in range(3):
        pg.shape(rrect(176 + i * 176, 752, 150, 104, 12), W3)
    pg.shape(rrect(138, 880, 584, 16, 6), W2)
    # the seat cushion and what is on it
    cushion(pg, 150, 672, 560, 62, 'dots')
    cushion(pg, 160, 592, 100, 86, 'stripes')
    cushion(pg, 600, 596, 100, 82, 'diamond')
    draw_pup(pg, cast.pup_front, 'sugarfoot', cx + 6, 690, 1.12, 'calm', tilt=4, lvl=1, arms='chest')
    book_stack(pg, 296, 688, 3, 110, 20, 1)
    mug(pg, 560, 688, 54, 54)
    # a rug
    pg.shape(rrect(130, 930, 600, 92, 14), W2)
    pg.shape(rrect(148, 944, 564, 64, 8), W3)
    for i in range(11):
        pg.shape(m_diamond_s(190 + i * 48, 976, 14, 15), W3)
    for sg in (0, 1):
        for i in range(16):
            x = 140 + i * 38
            pg.line(Path().M(x, 1022 if sg else 930).L(x, 1032 if sg else 920), W3)
    pot(pg, 120, 668 + 0, 0, 0) if False else None
