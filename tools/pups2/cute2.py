"""cute2.py: the official cute cartoon Tidbit and Sugarfoot (owner, Nov 2 2026), every pose from one set of shapes.
pup(dog, pose, mono) -> SVG markup in local units: head centred near (300, 240), paws on y = 662.
Poses: sit, paw (sitting, giving a paw), lie (lying down, paws forward), stand, walk."""
import re
INK = '#2A1E1A'
def mir(d, cx=300):
    res, xy = [], 0
    for t in re.findall(r'[MCLQZ]|-?\d+\.?\d*', d):
        if t in 'MCLQZ': res.append(t); xy = 0; continue
        v = float(t)
        if xy % 2 == 0: v = 2 * cx - v
        res.append('%g' % v); xy += 1
    return ' '.join(res)
def P(d, fill, lw=3.5, extra=''):
    return '<path d="%s" fill="%s" stroke="%s" stroke-width="%s" stroke-linejoin="round" stroke-linecap="round" %s/>' % (d, fill, INK, lw, extra)
def L(d, lw=3.2, col=INK):
    return '<path d="%s" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round" stroke-linejoin="round"/>' % (d, col, lw)
def G(parts, tf): return '<g transform="%s">%s</g>' % (tf, ''.join(parts))
SIDES = (lambda d: d, mir)
COL = {
 'tidbit': dict(blk='#262020', ear='#1E1919', tan='#C8874F', tan2='#D99A5E', chin='#B99A80', leg='#262020', sock='#C8874F', paw='#D99A5E', chest='#C8874F'),
 'sugarfoot': dict(blk='#262021', ear='#262021', tan='#D9AE80', tan2='#E6C196', wht='#F6F1E9', leg='#262021', sock='#A6582E', paw='#F6F1E9', chest='#F6F1E9', pink='#E8A1A8'),
}
def eye(x, y, mono):
    s = '<ellipse cx="%s" cy="%s" rx="25" ry="28" fill="#FFFFFF" stroke="%s" stroke-width="3.2"/>' % (x, y, INK)
    s += '<ellipse cx="%s" cy="%s" rx="21" ry="24" fill="%s"/>' % (x, y + 2, '#2A1E1A' if mono else '#2A160D')
    if not mono:
        s += '<ellipse cx="%s" cy="%s" rx="17" ry="19" fill="#5B3420"/><ellipse cx="%s" cy="%s" rx="12" ry="9" fill="#8A5A38"/>' % (x, y + 4, x, y + 13)
    s += '<ellipse cx="%s" cy="%s" rx="10" ry="12" fill="#120B08"/>' % (x, y + 3)
    s += '<ellipse cx="%s" cy="%s" rx="8" ry="9" fill="#FFFFFF"/><circle cx="%s" cy="%s" r="4" fill="#FFFFFF"/>' % (x + 8, y - 8, x - 9, y + 11)
    return s
HEAD = 'M300 92 C392 92 462 152 464 242 C466 322 410 384 300 388 C190 384 134 322 136 242 C138 152 208 92 300 92 Z'
NOSE = 'M266 268 C278 256 322 256 334 268 C344 284 322 304 300 306 C278 304 256 284 266 268 Z'
def head(dog, mono):
    c = COL[dog]; f = (lambda k: '#FFFFFF') if mono else (lambda k: c[k])
    s, late = [], []
    if dog == 'tidbit':
        EAR = 'M184 128 C124 134 88 214 96 296 C100 344 140 360 166 336 C190 306 192 226 214 158 Z'
        for sd in SIDES: s.append(P(sd(EAR), f('ear'), 5))
    else:
        EAR = 'M170 178 C150 156 136 124 140 96 C144 74 168 68 196 82 C224 96 244 120 248 142 C228 148 208 160 194 176 Z'
        EARIN = 'M176 160 C162 140 156 118 160 102 C164 90 178 88 194 98 C212 108 226 126 230 140 C214 146 200 154 190 166 Z'
        FLAP = 'M140 96 C142 72 168 64 196 80 C186 92 168 104 150 128 C142 118 138 106 140 96 Z'
        for sd in SIDES: s.append(P(sd(EAR), f('blk'), 5)); s.append(P(sd(EARIN), f('pink'), 2.6)); late.append(P(sd(FLAP), f('ear'), 4))
    s.append(P(HEAD, f('blk'), 5.5))
    if not mono:
        s.append('<path d="M206 130 C240 106 290 100 330 104 C292 112 252 124 222 146 Z" fill="#FFFFFF" opacity="0.13"/>')
        s.append('<path d="M420 180 C450 240 446 320 400 360 C430 316 438 250 410 196 Z" fill="#000" opacity="0.22"/>')
    if dog == 'tidbit':
        for sd in SIDES:
            s.append(P(sd('M300 252 C262 236 214 240 196 278 C182 312 206 352 252 364 C276 370 296 366 300 360 Z'), f('tan'), 3.4))
            s.append(P(sd('M228 192 C232 176 252 170 266 180 C274 192 266 210 248 212 C234 212 226 204 228 192 Z'), f('tan2'), 3))
        s.append(P('M276 352 C284 344 316 344 324 352 C324 364 312 372 300 372 C288 372 276 364 276 352 Z', f('chin'), 2.6))
        s.append(P('M276 156 C290 150 310 150 324 156 C330 200 334 236 340 262 C326 274 274 274 260 262 C266 236 270 200 276 156 Z', f('blk'), 0))
    else:
        for sd in SIDES:
            s.append(P(sd('M156 278 C170 256 208 252 240 266 C264 278 280 300 282 324 L282 360 C240 372 196 360 172 336 C158 318 152 298 156 278 Z'), f('tan'), 3.4))
            s.append(P(sd('M190 196 C196 160 230 142 262 150 C280 156 284 176 272 190 C252 206 216 210 190 196 Z'), f('tan2'), 3.2))
        s.append(P('M278 140 C292 134 308 134 322 140 C326 190 330 226 334 252 L266 252 C270 226 274 190 278 140 Z', f('blk'), 0))
        s += late
        s.append(P('M262 262 C276 246 324 246 338 262 C360 286 362 336 340 360 C326 376 274 376 260 360 C238 336 240 286 262 262 Z', f('wht'), 3.4))
    for x in (244, 356): s.append(eye(x, 234, mono))
    s.append(P(NOSE, '#141010', 3.2)); s.append('<ellipse cx="288" cy="270" rx="12" ry="6" fill="%s"/>' % ('#FFFFFF' if mono else '#6E6562'))
    if dog == 'tidbit':
        s.append(L('M300 306 L300 320 M268 322 C280 340 296 338 300 320 C304 338 320 340 332 322', 3.4))
        dots = ((240, 300), (230, 312), (252, 314))
    else:
        s.append(L('M300 306 L300 318', 3.4))
        s.append(P('M262 318 C276 324 290 324 300 318 C310 324 324 324 338 318 C336 346 320 362 300 362 C280 362 264 346 262 318 Z', '#FFFFFF' if mono else '#5A2A2E', 3.4))
        s.append(P('M282 342 C288 334 312 334 318 342 C318 356 310 362 300 362 C290 362 282 356 282 342 Z', '#FFFFFF' if mono else '#F08C9C', 2.6))
        dots = ((250, 296), (242, 308), (262, 310))
    for x, y in dots: s.append('<circle cx="%s" cy="%s" r="2.4" fill="%s"/><circle cx="%s" cy="%s" r="2.4" fill="%s"/>' % (x, y, INK, 600 - x, y, INK))
    if not mono:
        for x in (200, 400): s.append('<ellipse cx="%s" cy="304" rx="20" ry="11" fill="#F08C9C" opacity="0.45"/>' % x)
    return s
# ---- one smooth silhouette: every coat part is stroked wide first, then filled, so only the outside edge shows
def U(ds, fill, lw=5.5):
    out = ['<path d="%s" fill="none" stroke="%s" stroke-width="%s" stroke-linejoin="round" stroke-linecap="round"/>' % (d, INK, lw * 2) for d in ds]
    out += ['<path d="%s" fill="%s"/>' % (d, fill) for d in ds]
    return out
def legshape(x, y0, y1, w=24, a=0):
    """a soft leg from y0 down to y1, centred on x (rotated by a degrees about its top)"""
    import math
    pts = [(-w, 0), (-w - 3, (y1 - y0) * 0.5), (-w + 1, y1 - y0), (w - 1, y1 - y0), (w + 3, (y1 - y0) * 0.5), (w, 0)]
    r = math.radians(a); ca, sa = math.cos(r), math.sin(r)
    q = [(x + px * ca - py * sa, y0 + px * sa + py * ca) for px, py in pts]
    return 'M%g %g C%g %g %g %g %g %g L%g %g C%g %g %g %g %g %g Z' % (q[0][0], q[0][1], q[1][0], q[1][1], q[1][0], q[2][1] - 30 * ca, q[2][0], q[2][1], q[3][0], q[3][1], q[4][0], q[3][1] - 30 * ca, q[4][0], q[4][1], q[5][0], q[5][1])
def foot(dog, mono, x, y, a=0, dark=False, sock=True, h=84):
    """sock and paw at the bottom of a leg ending at (x, y); a = leg angle in degrees"""
    c = COL[dog]; f = (lambda k: '#FFFFFF') if mono else ((lambda k: darker(c[k])) if dark else (lambda k: c[k]))
    s = []
    g = []
    if sock:
        g.append(P('M-25 2 C-27 %g -25 %g -15 %g C-8 %g -3 %g 0 %g C3 %g 8 %g 15 %g C25 %g 27 %g 25 2 Z' % (-h * 0.5, -h + 12, -h + 3, -h - 1, -h + 6, -h + 2, -h + 6, -h - 1, -h + 3, -h + 12, -h * 0.5), f('sock'), 3))
    g.append(P('M-38 4 C-40 -16 -18 -26 0 -26 C20 -26 38 -16 36 4 C36 20 18 26 0 26 C-20 26 -38 20 -38 4 Z', f('paw'), 3.4))
    g.append(L('M-10 -8 L-9 12 M10 -8 L9 12', 2.6))
    if dog == 'sugarfoot': g += ['<ellipse cx="%g" cy="22" rx="5" ry="3.4" fill="#2A2422"/>' % dx for dx in (-26, -9, 9, 26)]
    return [G(g, 'translate(%g %g) rotate(%g)' % (x, y, a))]
def darker(h, k=0.72):
    n = int(h[1:], 16); return '#%02x%02x%02x' % (int((n >> 16) * k), int((n >> 8 & 255) * k), int((n & 255) * k))
def backfoot(dog, mono, x, y):
    c = COL[dog]; f = (lambda k: '#FFFFFF') if mono else (lambda k: c[k])
    return [P('M%g %g C%g %g %g %g %g %g C%g %g %g %g %g %g C%g %g %g %g %g %g Z' % (x - 36, y, x - 38, y - 22, x - 10, y - 30, x + 6, y - 28, x + 26, y - 26, x + 38, y - 14, x + 36, y, x + 34, y + 14, x - 34, y + 16, x - 36, y), f('paw'), 3.4),
            L('M%g %g L%g %g M%g %g L%g %g' % (x - 8, y - 12, x - 7, y + 6, x + 10, y - 12, x + 11, y + 6), 2.4)]
def chest(dog, mono, y=372):
    c = COL[dog]; f = (lambda k: '#FFFFFF') if mono else (lambda k: c[k])
    if dog == 'tidbit':
        return [P('M232 %g C258 %g 342 %g 368 %g C374 %g 346 %g 300 %g C254 %g 226 %g 232 %g Z' % (y + 8, y - 4, y - 4, y + 8, y + 68, y + 122, y + 134, y + 122, y + 68, y + 8), f('tan'), 3.2)]
    return [P('M250 %g C270 %g 330 %g 350 %g C358 %g 336 %g 300 %g C264 %g 242 %g 250 %g Z' % (y + 8, y - 2, y - 2, y + 8, y + 58, y + 114, y + 136, y + 114, y + 58, y + 8), f('tan'), 3),
            P('M266 %g C280 %g 320 %g 334 %g C338 %g 322 %g 300 %g C278 %g 262 %g 266 %g Z' % (y + 10, y + 4, y + 4, y + 10, y + 54, y + 98, y + 118, y + 98, y + 54, y + 10), f('wht'), 2.8)]
def shade(mono, d):
    return [] if mono else ['<path d="%s" fill="#000" opacity="0.16"/>' % d]
BODY = 'M206 372 C176 430 162 520 170 598 C176 646 228 662 300 662 C372 662 424 646 430 598 C438 520 424 430 394 372 Z'
def pup(dog, pose='sit', mono=False):
    c = COL[dog]; f = (lambda k: '#FFFFFF') if mono else (lambda k: c[k])
    coat = f('blk'); soft = '#4A403C' if not mono else INK
    TAILD = 'M418 600 C462 590 492 552 486 512 C482 496 468 498 466 512 C466 540 446 566 414 572 Z' if dog == 'tidbit' else 'M418 596 C470 600 506 560 508 506 C510 482 494 476 488 496 C482 532 458 560 414 566 Z'
    s = []
    if pose in ('sit', 'paw'):
        s += U([TAILD, BODY], coat)
        s += shade(mono, 'M330 380 C380 420 410 500 410 590 C408 630 380 650 340 656 C390 640 420 600 420 560 C424 480 400 420 360 380 Z')
        s += chest(dog, mono)
        # the front legs: only soft contour lines down the inside of each leg, then socks and paws
        s.append(L('M276 500 C280 550 280 590 278 616 M324 500 C320 550 320 590 322 616', 3, soft))
        s.append(L('M226 560 C224 590 226 610 228 618', 2.6, soft))
        s += backfoot(dog, mono, 186, 646) + backfoot(dog, mono, 414, 646)
        s += foot(dog, mono, 252, 636)
        if pose == 'sit':
            s.append(L('M374 560 C376 590 374 610 372 618', 2.6, soft))
            s += foot(dog, mono, 348, 636)
        else:   # giving a paw: the leg lifts forward from the shoulder; its outline is part of the body's own edge
            s += U([legshape(372, 470, 552, 24, -52)], coat)
            s.append(L('M412 520 C430 540 444 560 448 572', 2.6, soft))
            s += foot(dog, mono, 436, 548, -52, sock=True, h=70)
        s += head(dog, mono)
    elif pose == 'lie':
        TL = 'M436 560 C480 560 520 540 530 510 C534 494 518 490 512 504 C502 524 478 534 440 536 Z'
        LOAF = 'M150 540 C140 470 190 420 300 418 C410 420 460 470 450 540 C446 586 400 606 300 606 C200 606 154 586 150 540 Z'
        s += U([TL, LOAF, legshape(248, 520, 602, 24), legshape(352, 520, 602, 24)], coat)
        s += shade(mono, 'M360 430 C420 450 444 500 440 550 C436 584 410 600 370 604 C420 584 432 540 428 506 C422 470 400 446 360 430 Z')
        s += chest(dog, mono, 420)
        s += backfoot(dog, mono, 166, 592) + backfoot(dog, mono, 434, 592)
        s.append(G(head(dog, mono), 'translate(0 40)'))
        s += foot(dog, mono, 248, 612, h=60) + foot(dog, mono, 352, 612, h=60)
        s.append(L('M300 560 L300 610', 3, soft))
    elif pose in ('stand', 'walk'):
        sw = 14 if pose == 'walk' else 0
        TS = 'M596 400 C636 380 660 340 652 296 C648 280 632 282 632 298 C634 332 620 360 590 372 Z'
        TORSO = 'M236 420 C232 360 300 330 420 330 C540 330 616 352 612 420 C608 480 560 500 470 502 L340 502 C270 500 240 470 236 420 Z'
        # far legs sit behind, a shade darker, with their own clean outline
        for x, a in ((326, -sw), (528, sw)):
            s += U([legshape(x, 440, 640, 22, a)], darker(coat) if not mono else '#FFFFFF', 3.6)
            s += foot(dog, mono, x - 200 * __import__('math').sin(__import__('math').radians(a)), 440 + 200 * __import__('math').cos(__import__('math').radians(a)), a, dark=True)
        s += U([TS, TORSO, legshape(278, 440, 640, 24, sw), legshape(478, 440, 640, 24, -sw)], coat)
        s += shade(mono, 'M300 470 C380 492 500 494 590 460 C580 486 550 498 470 500 L340 500 C320 498 306 490 300 470 Z')
        s += chest(dog, mono, 362)
        import math
        for x, a in ((278, sw), (478, -sw)): s += foot(dog, mono, x - 200 * math.sin(math.radians(a)), 440 + 200 * math.cos(math.radians(a)), a)
        s += head(dog, mono)
    return s
def svg(parts, w=700, h=700, x0=-20, y0=30):
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="%d %d %d %d" width="%d" height="%d"><rect x="%d" y="%d" width="%d" height="%d" fill="#fff"/>%s</svg>' % (x0, y0, w, h, w, h, x0, y0, w, h, ''.join(parts))
if __name__ == '__main__':
    for dog in ('tidbit', 'sugarfoot'):
        for pose in ('sit', 'paw', 'lie', 'stand', 'walk'):
            for mono in (False, True):
                open('/tmp/cute/%s-%s-%s.svg' % (dog, pose, 'l' if mono else 'c'), 'w').write(svg(pup(dog, pose, mono)))
