"""Tidbit coloring line art from the reference painting (standing in the snow).
Auto: silhouette and the tan markings (smoothed). Hand: eyes, nose, mouth, ears, collar, claws."""
import cv2, numpy as np, potrace, sys, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
im = cv2.imread('tidbit-ref.png'); H, W = im.shape[:2]
dog = cv2.imread('tb-mask.png', 0) > 127 if os.path.exists('tb-mask.png') else np.load('tb-dog.npy')
INK = '#231A16'

def smooth(m, s): return cv2.GaussianBlur(m.astype(np.float32), (0, 0), s) > .5
def islands(m, mn):
    m = m.astype(np.uint8)
    for inv in (0, 1):
        t = (1 - m) if inv else m
        n, lb, st, _ = cv2.connectedComponentsWithStats(t.astype(np.uint8), connectivity=4)
        for i in range(1, n):
            if st[i, 4] < mn: t[lb == i] = 0
        m = (1 - t) if inv else t
    return m.astype(bool)
def trace(m, turd=200, amax=1.1, tol=.6):
    pl = potrace.Bitmap(~m).trace(turdsize=turd, alphamax=amax, opticurve=True, opttolerance=tol)
    d = ''
    for cv in pl:
        sp = cv.start_point; d += 'M%.1f %.1f' % (sp.x, sp.y)
        for sg in cv.segments:
            if sg.is_corner: d += 'L%.1f %.1fL%.1f %.1f' % (sg.c.x, sg.c.y, sg.end_point.x, sg.end_point.y)
            else: d += 'C%.1f %.1f %.1f %.1f %.1f %.1f' % (sg.c1.x, sg.c1.y, sg.c2.x, sg.c2.y, sg.end_point.x, sg.end_point.y)
        d += 'Z'
    return d

yy, xx = np.mgrid[0:H, 0:W]
_L = cv2.cvtColor(im, cv2.COLOR_BGR2LAB)[..., 0]
dog = dog & ~((xx > 1235) & (yy > 160) & (_L >= 75))
_tp = np.zeros((H, W), np.uint8)
cv2.fillPoly(_tp, [np.array([(1120, 300), (1180, 270), (1240, 196), (1300, 118), (1338, 76), (1374, 80), (1382, 112), (1362, 170), (1330, 236), (1290, 304), (1250, 366), (1200, 420), (1140, 440), (1100, 400)], np.int32)], 1)
dog = dog & ~((xx > 1130) & (yy < 440) & (_tp == 0))
_n, _lb, _st, _ = cv2.connectedComponentsWithStats(dog.astype(np.uint8)); dog = _lb == 1 + np.argmax(_st[1:, 4])
dog = cv2.morphologyEx(dog.astype(np.uint8), cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (21, 21))).astype(bool)
dogs = islands(smooth(dog, 4.5), 3000)
_ff = np.pad((~dogs).astype(np.uint8), 1, constant_values=1); _m = np.zeros((H + 4, W + 4), np.uint8)
cv2.floodFill(_ff, _m, (0, 0), 2); dogs = (_ff[1:-1, 1:-1] != 2)
dogs[H - 1, :] = dogs[H - 2, :]

sm = im.copy()
for _ in range(3): sm = cv2.bilateralFilter(sm, 9, 30, 7)
lab = cv2.cvtColor(sm, cv2.COLOR_BGR2LAB).astype(np.float32)
Lc, Bc = lab[..., 0], lab[..., 2]
tan = (Bc > 150) & (Lc >= 75) & dogs
tan = cv2.GaussianBlur(tan.astype(np.float32), (0, 0), 3.2) > .5
tan = cv2.morphologyEx(tan.astype(np.uint8), cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7))).astype(bool)
tan = islands(smooth(islands(tan, 900), 6.0), 1200)

def P(d, w=4.2, fill='none'):
    return '<path d="%s" fill="%s" stroke="%s" stroke-width="%s" stroke-linecap="round" stroke-linejoin="round"/>' % (d, fill, INK, w)

NOSE = 'M798 532C825 508 885 518 905 552C915 585 888 606 852 602C822 600 790 578 798 532Z'
MOUTH = 'M855 602C840 622 800 638 755 638C715 636 672 626 640 600'

def eye(cx, cy, rx, ry, rot, irx, iry, cl, color):
    o = ['<g transform="rotate(%s %s %s)">' % (rot, cx, cy)]
    o.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#fff" stroke="%s" stroke-width="4.4"/>' % (cx, cy, rx, ry, INK))
    o.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s" stroke="%s" stroke-width="3"/>' % (cx + 3, cy + 1, irx, iry, '#7A4A26' if color else '#fff', INK))
    o.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s"/>' % (cx + 4, cy + 2, irx * .52, iry * .52, INK))
    o.append(P('M%s %s A%s %s 0 0 1 %s %s' % (cx - rx + 2, cy - 2, rx, ry, cx + rx - 2, cy - 2), 9))
    o.append('</g>')
    o.append('<circle cx="%s" cy="%s" r="%s" fill="#fff"/>' % cl)
    o.append('<circle cx="%s" cy="%s" r="%s" fill="#fff"/>' % (cl[0] - cl[2] * 1.9, cl[1] + cl[2] * 1.4, cl[2] * .42))
    return ''.join(o)

def feats(color):
    F = []
    F.append(eye(637, 428, 50, 40, -8, 31, 31, (662, 404, 11), color))
    F.append(eye(797, 400, 24, 38, -4, 17, 28, (803, 382, 7), color))
    F.append(P(NOSE, 4, INK))
    F.append('<ellipse cx="842" cy="540" rx="20" ry="6" fill="#fff" transform="rotate(12 842 540)"/>')
    F.append('<ellipse cx="878" cy="575" rx="8" ry="6" fill="#5a4c47" transform="rotate(-20 878 575)"/>')
    F.append(P(MOUTH, 4.4))
    F.append(P('M640 600C650 616 666 623 686 619', 4))
    F.append(P('M692 646C740 660 800 656 836 634', 3.4))
    for x, y in ((742, 596), (766, 604), (790, 612), (738, 616), (762, 626), (788, 634)):
        F.append('<circle cx="%s" cy="%s" r="2.8" fill="%s"/>' % (x, y, INK))
    # ears
    F.append(P('M478 240C468 320 462 400 446 462C436 488 408 500 376 500', 4.4))
    F.append(P('M784 240C770 300 776 370 806 426C826 432 842 418 846 396', 4.4))
    # collar
    F.append(P('M462 616C520 640 600 664 696 688L696 724C600 704 520 684 460 660Z', 4, '#8C8F94' if color else '#fff'))
    F.append(P('M462 616C520 640 600 664 696 688', 4))
    F.append('<rect x="540" y="640" width="54" height="48" rx="9" fill="%s" stroke="%s" stroke-width="3.6" transform="rotate(16 567 664)"/>' % ('#B9BCC0' if color else '#fff', INK))
    F.append('<rect x="556" y="650" width="22" height="28" rx="5" fill="%s" stroke="%s" stroke-width="3" transform="rotate(16 567 664)"/>' % ('#8C8F94' if color else '#fff', INK))
    # toes and claws
    for tx, y0, y1 in ((612, 1002, 1046), (648, 1004, 1050), (878, 878, 908), (900, 880, 910), (1066, 984, 1026), (1096, 988, 1030)):
        F.append(P('M%s %sC%s %s %s %s %s %s' % (tx, y1, tx - 2, y1 - 14, tx - 1, y0 + 14, tx + 1, y0), 3.4))
    for nx, ny, sc in ((596, 1046, 1), (630, 1056, 1), (664, 1052, 1), (866, 908, .7), (890, 914, .7), (912, 908, .7), (1052, 1018, 1), (1082, 1032, 1), (1112, 1024, 1)):
        F.append(P('M%s %sC%s %s %s %s %s %sC%s %s %s %s %s %sZ' % (nx - 7 * sc, ny - 10 * sc, nx - 6 * sc, ny, nx - 2 * sc, ny + 9 * sc, nx, ny + 12 * sc,
                                                                 nx + 2 * sc, ny + 9 * sc, nx + 6 * sc, ny, nx + 7 * sc, ny - 10 * sc), 2.2, INK))
    return ''.join(F)

dd = trace(dogs, 3000, 1.15, .8)
inner = cv2.erode(dogs.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (17, 17))).astype(bool)
fur = trace(tan, 1200, 1.3, 1.2)
ZONES = ''.join(['<ellipse cx="637" cy="428" rx="54" ry="44" transform="rotate(-8 637 428)"/>', '<ellipse cx="797" cy="400" rx="28" ry="42"/>',
                 '<path d="%s" stroke="#000" stroke-width="22"/>' % NOSE, '<path d="%s" fill="none" stroke="#000" stroke-width="22"/>' % MOUTH,
                 '<path d="M462 616C520 640 600 664 696 688L696 724C600 704 520 684 460 660Z" stroke="#000" stroke-width="10"/>'])

def page(color):
    o = ['<defs><clipPath id="in"><path d="%s"/></clipPath><clipPath id="dg"><path d="%s"/></clipPath>' % (trace(inner, 3000, 1.15, .8), dd),
         '<mask id="z"><rect width="%d" height="%d" fill="#fff"/><g fill="#000">%s</g></mask></defs>' % (W, H, ZONES)]
    o.append('<path d="%s" fill="%s"/>' % (dd, '#2B2426' if color else '#fff'))
    if color:
        o.append('<g clip-path="url(#dg)"><path d="%s" fill="#D9934A" fill-rule="evenodd"/></g>' % fur)
    o.append('<g clip-path="url(#in)" mask="url(#z)"><path d="%s" fill="none" stroke="%s" stroke-width="3.6" stroke-linejoin="round"/></g>' % (fur, INK))
    o.append('<path d="%s" fill="none" stroke="%s" stroke-width="6.5" stroke-linejoin="round"/>' % (dd, INK))
    o.append(feats(color))
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d"><rect width="100%%" height="100%%" fill="#fff"/>%s</svg>' % (W, H, W, H, ''.join(o))

open('tb-line.svg', 'w').write(page(False))
open('tb-col.svg', 'w').write(page(True))
