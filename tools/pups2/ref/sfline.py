"""Sugarfoot coloring line art from the reference painting.
Auto: dog outline + black/tan/cream fur borders (smoothed), clipped inside the dog
and kept away from the face features and paws. Hand: eyes, nose, mouth, ears, paws."""
import cv2, numpy as np, potrace, sys
import os; os.chdir(os.path.dirname(os.path.abspath(__file__)))
im = cv2.imread('sugarfoot-ref.png'); H, W = im.shape[:2]
dog = cv2.imread('sf-mask.png', 0) > 127
INK = '#231A16'

def smooth(m, s):
    return cv2.GaussianBlur(m.astype(np.float32), (0, 0), s) > .5

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
dog = dog & ~((xx > 1212) & (yy > 372))
ADD = (((xx - 1118) / 130.0) ** 2 + ((yy - 625) / 285.0) ** 2 < 1) & (yy > 330) & (yy < 905) & ~dog
dog |= ADD
CH = np.zeros((H, W), np.uint8)
cv2.fillPoly(CH, [np.array([(735, 760), (995, 760), (985, 912), (745, 912)], np.int32)], 1)
cv2.ellipse(CH, (637, 953), (120, 80), 0, 0, 360, 1, -1)
cv2.ellipse(CH, (1083, 948), (122, 80), 0, 0, 360, 1, -1)
dog |= CH.astype(bool)
sm = im.copy()
for _ in range(3): sm = cv2.bilateralFilter(sm, 9, 30, 7)
lab = cv2.cvtColor(sm, cv2.COLOR_BGR2LAB).astype(np.float32)
Lc, Bc = lab[..., 0], lab[..., 2]
cls = np.where(Lc < 80, 0, np.where(Bc > 154, 1, 2))  # 0 black, 1 tan, 2 cream
v = np.stack([cv2.GaussianBlur((cls == k).astype(np.float32), (0, 0), 3.2) for k in range(3)])
cls = v.argmax(0)
cls[ADD] = 0
dog = cv2.morphologyEx(dog.astype(np.uint8), cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (21, 21))).astype(bool)
dogs = islands(smooth(dog, 4.5), 3000)
_ff = np.pad((~dogs).astype(np.uint8), 1, constant_values=1); _m = np.zeros((H + 4, W + 4), np.uint8)
cv2.floodFill(_ff, _m, (0, 0), 2); dogs = (_ff[1:-1, 1:-1] != 2)
regs = []
for k in range(3):
    m = cv2.morphologyEx(((cls == k) & dogs).astype(np.uint8), cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7) if k == 1 else (5, 5))).astype(bool)
    m = islands(m, 900)
    if k:
        m = islands(smooth(m, 6.5), 2600)
    regs.append(m)

S = []  # svg parts
# ---------- hand-drawn features ----------
def P(d, w=4.2, fill='none', extra=''):
    return '<path d="%s" fill="%s" stroke="%s" stroke-width="%s" stroke-linecap="round" stroke-linejoin="round"%s/>' % (d, fill, INK, w, extra)

def eye(cx, cy, rx, ry, cl, color):
    o = []
    o.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="#fff" stroke="%s" stroke-width="4.4"/>' % (cx, cy, rx, ry, INK))
    # big iris that fills the eye, nudged up and right so a white crescent shows low left
    o.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s" stroke="%s" stroke-width="3"/>' % (cx + 4, cy - 3, rx - 7, ry - 7, '#7A4A26' if color else '#fff', INK))
    o.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s"/>' % (cx + 5, cy - 2, rx * .48, ry * .48, INK))
    o.append(P('M%s %s A%s %s 0 0 1 %s %s' % (cx - rx + 2, cy - 2, rx, ry, cx + rx - 2, cy - 2), 9))
    o.append('<circle cx="%s" cy="%s" r="%s" fill="#fff"/>' % cl)
    o.append('<circle cx="%s" cy="%s" r="%s" fill="#fff"/>' % (cx - rx * .3, cy + ry * .4, cl[2] * .4))
    return ''.join(o)

NOSE = 'M676 487C676 462 705 448 740 448C775 448 805 461 806 488C807 516 785 540 760 551C748 557 735 557 722 551C697 540 676 515 676 487Z'
MOUTH_OUT = 'M730 592C736 615 760 645 795 652C838 659 874 628 895 580C910 545 920 500 932 458'
MOUTH_TOP = 'M730 592C752 586 778 586 804 584C840 581 870 568 890 544C906 524 918 494 932 458'
MOUTH = MOUTH_OUT + 'C918 494 906 524 890 544C870 568 840 581 804 584C778 586 752 586 730 592Z'
TONGUE = 'M748 606C768 596 798 596 826 600C852 602 872 594 888 574C880 612 856 640 818 648C786 652 762 634 748 606Z'


def cr(pts, closed=True):
    n = len(pts); d = 'M%.1f %.1f' % pts[0]
    rng = range(n) if closed else range(n - 1)
    for i in rng:
        p0 = pts[(i - 1) % n] if closed or i else pts[0]; p1 = pts[i]; p2 = pts[(i + 1) % n]
        p3 = pts[(i + 2) % n] if closed or i + 2 < n else p2
        d += 'C%.1f %.1f %.1f %.1f %.1f %.1f' % (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6, p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6, p2[0], p2[1])
    return d + ('Z' if closed else '')
import math
def stripe():
    A, B = (1162, 662), (988, 808)
    dx, dy = B[0] - A[0], B[1] - A[1]; L = math.hypot(dx, dy); ux, uy = dx / L, dy / L; nx, ny = -uy, ux
    up, lo = [], []
    for i in range(9):
        t = i / 8; w = 56 * (1 - t) + 16
        cx, cy = A[0] + dx * t, A[1] + dy * t
        j = (4 if i % 2 else -2) if 0 < i < 8 else 0
        up.append((cx - nx * (w / 2 + j), cy - ny * (w / 2 + j)))
        lo.append((cx + nx * (w / 2 - j * .6), cy + ny * (w / 2 - j * .6)))
    return cr(up + [B] + lo[::-1][:-1] + [A])
STRIPE = stripe()

def feats(color):
    F = []
    F.append(P(STRIPE, 3.6, '#F6EEE2' if color else '#fff'))
    F.append(eye(643, 357, 42, 46, (655, 334, 10.5), color))
    F.append(eye(858, 292, 45, 48, (850, 277, 11.5), color))
    F.append(P(NOSE, 4, INK))
    F.append('<ellipse cx="744" cy="472" rx="22" ry="7.5" fill="#fff" transform="rotate(-4 744 472)"/>')
    F.append('<ellipse cx="712" cy="524" rx="9" ry="6" fill="#5a4c47" transform="rotate(25 712 524)"/>')
    F.append('<ellipse cx="774" cy="514" rx="9" ry="6" fill="#5a4c47" transform="rotate(-25 774 514)"/>')
    F.append(P('M741 556C741 568 738 580 730 592', 4))
    F.append(P(MOUTH, 4.4, INK))
    F.append(P(TONGUE, 3.2, '#EE8E98' if color else '#fff'))
    F.append(P('M814 604C814 616 816 628 819 640', 2.6))
    F.append(P('M846 579C848 590 852 600 858 604C862 595 862 584 859 574Z', 2.4, '#fff'))
    F.append(P('M746 598C747 607 751 615 757 618C760 611 759 603 755 596Z', 2.2, '#fff'))
    F.append(P('M923 444C929 451 935 456 947 451', 4.2))
    for x, y in ((667, 533), (680, 550), (692, 567), (833, 500), (848, 508), (858, 524), (834, 528)):
        F.append('<circle cx="%s" cy="%s" r="2.8" fill="%s"/>' % (x, y, INK))
    # ears: inner edges where the black flap meets the head
    F.append(P('M562 236C552 290 540 340 532 392C524 446 528 500 522 534C519 552 510 566 498 574', 4.4))
    F.append(P('M1062 176C1070 220 1074 270 1078 318C1083 362 1100 396 1132 412C1158 422 1186 404 1204 370', 4.4))
    # paws: toe splits and nails (outline comes from the silhouette)
    for tx, bot, lean in ((590, 1026, -6), (672, 1026, 6), (1042, 1022, -6), (1124, 1022, 6)):
        F.append(P('M%s %sC%s %s %s %s %s %s' % (tx, bot - 4, tx + lean * .2, bot - 34, tx + lean * .6, bot - 62, tx + lean, bot - 86), 3.6))
    for nx, ny, tilt in ((551, 1036, 6), (629, 1040, 0), (716, 1034, -6), (1002, 1028, 6), (1082, 1036, 0), (1164, 1028, -6)):
        t = ny - 58
        F.append(P('M%s %sC%s %s %s %s %s %sC%s %s %s %s %s %sC%s %s %s %s %s %sZ' % (
            nx - 9 + tilt, t + 6, nx - 13 + tilt * .5, t + 30, nx - 5, ny - 10, nx, ny,
            nx + 5, ny - 10, nx + 13 + tilt * .5, t + 30, nx + 9 + tilt, t + 6,
            nx + 5 + tilt, t - 1, nx - 5 + tilt, t - 1, nx - 9 + tilt, t + 6), 2.4, INK))
    return ''.join(F)

# ---------- auto layer ----------
dd = trace(dogs, 3000, 1.15, .8)
inner = cv2.erode(dogs.astype(np.uint8), cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (17, 17))).astype(bool)
fur = ''.join(trace(regs[k], 2600, 1.3, 1.2) for k in (1, 2))
ZONES = ''.join([
    '<ellipse cx="643" cy="357" rx="45" ry="49"/>', '<ellipse cx="858" cy="292" rx="48" ry="51"/>',
    '<path d="%s" stroke="#000" stroke-width="30"/>' % NOSE,
    '<path d="%s" stroke="#000" stroke-width="22"/>' % MOUTH])

def page(color):
    o = ['<defs><clipPath id="in"><path d="%s"/></clipPath><clipPath id="dg"><path d="%s"/></clipPath>' % (trace(inner, 3000, 1.15, .8), dd),
         '<mask id="z"><rect width="%d" height="%d" fill="#fff"/><g fill="#000">%s</g></mask></defs>' % (W, H, ZONES)]
    o.append('<path d="%s" fill="%s"/>' % (dd, '#2B2426' if color else '#fff'))
    if color:
        o.append('<g clip-path="url(#dg)"><path d="%s" fill="#D9A46A" fill-rule="evenodd"/></g>' % trace(regs[1], 2600, 1.3, 1.2))
        o.append('<g clip-path="url(#dg)"><path d="%s" fill="#F6EEE2" fill-rule="evenodd"/></g>' % trace(regs[2], 2600, 1.3, 1.2))
    o.append('<g clip-path="url(#in)" mask="url(#z)"><path d="%s" fill="none" stroke="%s" stroke-width="3.6" stroke-linejoin="round"/></g>' % (fur, INK))
    o.append('<path d="%s" fill="none" stroke="%s" stroke-width="6.5" stroke-linejoin="round"/>' % (dd, INK))
    o.append(feats(color))
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d"><rect width="100%%" height="100%%" fill="#fff"/>%s</svg>' % (W, H, W, H, ''.join(o))

open('sf-line.svg', 'w').write(page(False))
open('sf-col.svg', 'w').write(page(True))
