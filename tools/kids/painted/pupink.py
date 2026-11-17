#!/usr/bin/env python3
"""pupink.py: Tidbit and Sugarfoot drawn by hand for the coloring books, in the look of the painted pups (owner, Nov 17 2026:
"make sure the coloring books look as good as they can ... high quality professionally developed coloring books").

Clean vector line art, the way a coloring-book illustrator draws a character: a big, round, front-facing puppy head with large
shiny eyes, floppy ears, a soft muzzle, a nose with a highlight and a happy open mouth; a chubby body; fur shown with a few
deliberate tufts, not traced noise. Their markings are drawn as shapes to color:
  Tidbit     black and tan: tan eyebrow dots, a tan muzzle and cheeks, a tan chest, tan socks; a short, neat coat
  Sugarfoot  black, tan and white, fluffy: a white blaze from her forehead down her muzzle, a white fluffy chest, white paws,
             tan cheeks and eyebrows, a plumed tail, fluffier ears and cheeks
Each always wears her item (Tidbit purple, Sugarfoot pink): a beanie, a cap, a bow, a bandana or a necklace.

Units: paws on y = 0, the pup about 230 units tall sitting. draw(who, pose, eyes, wear, lw) returns (svg, bbox), where lw is the
outline width in these units (the caller sets it from the page scale so every pup is inked like the page around it).
Poses: 'sit' (sitting, facing us), 'stand' (standing, side on, face turned to us), 'lie' (lying down, head up, facing us),
'peek' (head and front paws, for over a ledge: the ledge is y = 0), 'head' (the head alone, centred on 0, 0)."""
import math

INK = '#111'


class Pen:
    def __init__(self, lw):
        self.lw = lw
        self.out = []

    def shape(self, d, w=1.0, fill='#fff'):
        self.out.append('<path d="%s" fill="%s" stroke="%s" stroke-width="%.2f" stroke-linejoin="round" stroke-linecap="round"/>' % (d, fill, INK, self.lw * w))

    def line(self, d, w=0.55):
        self.out.append('<path d="%s" fill="none" stroke="%s" stroke-width="%.2f" stroke-linejoin="round" stroke-linecap="round"/>' % (d, INK, self.lw * w))

    def solid(self, d):
        self.out.append('<path d="%s" fill="%s"/>' % (d, INK))

    def white(self, d):
        self.out.append('<path d="%s" fill="#fff"/>' % d)

    def g(self, transform):
        self.out.append('<g transform="%s">' % transform)

    def end(self):
        self.out.append('</g>')

    def svg(self):
        return ''.join(self.out)


def f(v):
    return ('%.1f' % v).rstrip('0').rstrip('.')


def ellipse(cx, cy, rx, ry):
    return 'M%s %s A%s %s 0 1 0 %s %s A%s %s 0 1 0 %s %sZ' % (f(cx - rx), f(cy), f(rx), f(ry), f(cx + rx), f(cy), f(rx), f(ry), f(cx - rx), f(cy))


def smooth(pts, closed=True):
    """a smooth closed (or open) curve through the points (Catmull-Rom as cubic Beziers)"""
    n = len(pts)
    P = (lambda i: pts[i % n]) if closed else (lambda i: pts[max(0, min(n - 1, i))])
    d = 'M%s %s' % (f(pts[0][0]), f(pts[0][1]))
    m = n if closed else n - 1
    for i in range(m):
        p0, p1, p2, p3 = P(i - 1), P(i), P(i + 1), P(i + 2)
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6)
        c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += ' C%s %s %s %s %s %s' % (f(c1[0]), f(c1[1]), f(c2[0]), f(c2[1]), f(p2[0]), f(p2[1]))
    return d + ('Z' if closed else '')


def tufts(pts, depth, every=1, closed=True):
    """an outline with soft fur tufts: between each pair of points the edge bows out a little, then tucks in"""
    out = []
    n = len(pts)
    for i in range(n if closed else n - 1):
        a, b = pts[i], pts[(i + 1) % n]
        mx, my = (a[0] + b[0]) / 2, (a[1] + b[1]) / 2
        dx, dy = b[0] - a[0], b[1] - a[1]
        L = math.hypot(dx, dy) or 1
        nx, ny = dy / L, -dx / L        # outward for a clockwise outline
        out.append(a)
        if i % every == 0:
            out.append((mx + nx * depth, my + ny * depth))
    if not closed:
        out.append(pts[-1])
    return out


# ------------------------------------------------------------------ the head (centred on 0, 0, facing us; about 150 wide)
def head(p, who, eyes='open', wear=None):
    sug = who == 'sugarfoot'
    # ears first (they hang behind the head): long, soft, floppy; Sugarfoot's fluffier
    for s in (-1, 1):
        if sug:
            ear = [(s * 46, -40), (s * 74, -34), (s * 86, -6), (s * 84, 28), (s * 76, 52), (s * 62, 58), (s * 50, 44), (s * 44, 14)]
            p.shape(smooth(ear))
            for t in (0, 1):   # feathery fur at the ear's tip
                yy = 40 + t * 10
                p.line(smooth([(s * (60 + t * 8), yy), (s * (64 + t * 8), yy + 8)], False), 0.38)
        else:
            ear = [(s * 44, -42), (s * 72, -36), (s * 82, -8), (s * 78, 26), (s * 66, 44), (s * 54, 38), (s * 46, 12)]
            p.shape(smooth(ear))
        p.line(smooth([(s * 56, -26), (s * 66, 0), (s * 64, 26)], False), 0.45)   # the fold of the ear
    # the head: wide and round, with cheek fluff
    if sug:
        hd = [(-50, -44), (-24, -60), (0, -63), (24, -60), (50, -44), (60, -18), (62, 8), (56, 26), (40, 42), (20, 50), (0, 52), (-20, 50), (-40, 42), (-56, 26), (-62, 8), (-60, -18)]
        p.shape(smooth(hd))
        for s in (-1, 1):   # cheek tufts
            p.line(smooth([(s * 58, 18), (s * 64, 26), (s * 56, 32)], False), 0.5)
        for s in (-1, 1):   # a little fluff at the crown
            p.line(smooth([(s * 14, -60), (s * 20, -66), (s * 26, -60)], False), 0.45)
    else:
        hd = [(-48, -46), (-24, -60), (0, -62), (24, -60), (48, -46), (58, -20), (60, 6), (54, 26), (38, 42), (18, 49), (0, 51), (-18, 49), (-38, 42), (-54, 26), (-60, 6), (-58, -20)]
        p.shape(smooth(hd))
    # markings: the blaze (Sugarfoot) and the muzzle patch
    if sug:   # a soft white stripe from her forehead down to her muzzle
        p.line(smooth([(-14, -2), (-11, -18), (-9, -32), (-6, -42), (0, -46), (6, -42), (9, -32), (11, -18), (14, -2)], False), 0.55)
    # eyebrow spots (both have them; Tidbit's are her trademark)
    for s in (-1, 1):
        p.shape(ellipse(s * 26, -36, 7.5 if not sug else 8.5, 5.5 if not sug else 6), 0.5)
    # the muzzle: a soft rounded patch, wider at the cheeks
    mz = [(-30, 4), (-16, -5), (0, -7), (16, -5), (30, 4), (33, 20), (22, 34), (0, 40), (-22, 34), (-33, 20)]
    p.shape(smooth(mz), 0.55)
    # eyes: big and shiny, or closed
    for s in (-1, 1):
        ex, ey = s * 24, -14
        if eyes == 'open':
            p.solid(ellipse(ex, ey, 11, 12.5))
            p.white(ellipse(ex - 3.5, ey - 4.5, 4.2, 4.6))
            p.white(ellipse(ex + 4, ey + 4.5, 1.8, 1.8))
        else:
            p.line(smooth([(ex - 11, ey - 1), (ex, ey + 6), (ex + 11, ey - 1)], False), 0.7)
    # the nose: a rounded triangle with a shine
    p.solid('M-11 6 C-11 0 11 0 11 6 C11 12 4 17 0 18 C-4 17 -11 12 -11 6Z')
    p.white(ellipse(-4, 5, 3.4, 2.2))
    # the mouth: a little line down from the nose, a happy smile, the tongue
    p.shape('M-9 25 C-11 45 11 45 9 25 Z', 0.5)       # the tongue, hanging happily
    p.line('M0 27 L0 33', 0.32)
    p.line('M0 18 L0 24', 0.55)
    p.line(smooth([(-20, 19), (-10, 27), (0, 24)], False), 0.6)
    p.line(smooth([(20, 19), (10, 27), (0, 24)], False), 0.6)
    if wear in ('hat', 'cap', 'bow'):
        head_item(p, wear)


def head_item(p, wear):
    if wear == 'hat':     # a beanie with a pompom and a ribbed band
        p.shape('M-50 -40 C-48 -86 48 -86 50 -40 Z')
        p.shape('M-54 -44 C-54 -36 54 -36 54 -44 C54 -52 -54 -52 -54 -44Z', 0.8)
        for x in range(-44, 50, 11):
            p.line('M%d -50 L%d -38' % (x, x), 0.35)
        p.shape(ellipse(0, -88, 12, 11))
    elif wear == 'cap':   # a ball cap with the brim to one side
        p.shape('M-50 -42 C-50 -88 44 -88 48 -42 Z')
        p.shape('M28 -46 C50 -52 86 -48 90 -40 C86 -34 52 -36 26 -40Z', 0.8)
        p.line('M0 -84 L0 -44', 0.35)
        p.shape(ellipse(0, -84, 5, 4), 0.6)
    elif wear == 'bow':   # a bow on one side of her head
        p.shape('M28 -54 C14 -74 8 -50 18 -42 C22 -40 28 -48 28 -54Z')
        p.shape('M28 -54 C40 -76 54 -58 44 -44 C40 -40 32 -46 28 -54Z')
        p.shape(ellipse(28, -52, 6, 6), 0.8)


def neck_item(p, wear, y=58):
    if wear == 'bandana':
        p.shape('M-42 %s C-14 %s 14 %s 42 %s L4 %s C2 %s -2 %s -4 %s Z' % (y - 4, y + 4, y + 4, y - 4, y + 40, y + 43, y + 43, y + 40))
        p.line('M-36 %s C-12 %s 12 %s 36 %s' % (y + 2, y + 9, y + 9, y + 2), 0.4)
        p.shape(ellipse(-40, y - 2, 6, 6), 0.7)
    elif wear == 'necklace':
        p.line('M-36 %s C-20 %s 20 %s 36 %s' % (y - 4, y + 12, y + 12, y - 4), 0.5)
        for bx in (-28, -14, 14, 28):
            by = y - 4 + 16 * (1 - (bx / 36) ** 2) * 0.75
            p.shape(ellipse(bx, by, 4.5, 4.5), 0.6)
        p.shape('M0 %s C-12 %s -10 %s 0 %s C10 %s 12 %s 0 %s Z' % (y + 28, y + 16, y + 6, y + 12, y + 6, y + 16, y + 28), 0.8)


# ------------------------------------------------------------------ bodies
HEAD_K = 1.12   # the head a little big for the body: puppy proportions


def put_head(p, who, eyes, wear, x, y, k=HEAD_K):
    p.g('translate(%s %s) scale(%s)' % (f(x), f(y), k))
    head(p, who, eyes, wear)
    if wear in ('bandana', 'necklace'):
        neck_item(p, wear)
    p.end()


def paw(p, x, y, rx=17, ry=10, toes=3):
    p.shape(ellipse(x, y, rx, ry))
    for i in range(toes):
        t = (i - (toes - 1) / 2) * rx * 0.36
        p.line('M%s %s L%s %s' % (f(x + t), f(y + ry * 0.75), f(x + t), f(y - ry * 0.05)), 0.33)


def sit(p, who, eyes, wear):
    sug = who == 'sugarfoot'
    # the tail, behind one hip
    if sug:   # a fluffy plume
        p.shape(smooth([(46, -26), (70, -42), (88, -66), (98, -94), (90, -100), (80, -80), (66, -60), (48, -42)]))
        p.line(smooth([(76, -64), (86, -82)], False), 0.32)
    else:
        p.shape(smooth([(46, -26), (70, -42), (82, -62), (75, -66), (62, -50), (46, -40)]))
    # the haunches, tucked behind, and the hind paws
    for s_ in (-1, 1):
        p.shape(smooth([(s_ * 36, -92), (s_ * 62, -70), (s_ * 72, -38), (s_ * 66, -12), (s_ * 44, -6), (s_ * 34, -40)]))
        paw(p, s_ * 62, -9, 19, 10, 2)
    # the body: a soft, full pear
    body = [(-34, -122), (-46, -96), (-54, -60), (-54, -28), (-44, -8), (0, -3), (44, -8), (54, -28), (54, -60), (46, -96), (34, -122)]
    p.shape(smooth(body))
    # the chest: Tidbit's tan patch, Sugarfoot's fluffy white bib
    if sug:
        bib = [(-28, -118), (-31, -92), (-24, -70), (-12, -58), (0, -55), (12, -58), (24, -70), (31, -92), (28, -118)]
        p.line(smooth(tufts(bib, 3.5, 1, False), False), 0.55)
    else:
        p.line(smooth([(-22, -116), (-18, -92), (-8, -76), (0, -72), (8, -76), (18, -92), (22, -116)], False), 0.55)
    # the front legs: soft and round, with sock lines, and the front paws
    for s_ in (-1, 1):
        x = s_ * 21
        p.shape(smooth([(x - 12, -86), (x - 15, -60), (x - 14, -32), (x - 10, -16), (x + 10, -16), (x + 14, -32), (x + 15, -60), (x + 12, -86)]))
        p.line(smooth([(x - 14, -38), (x, -42), (x + 14, -38)], False), 0.45)
        paw(p, x, -10, 17, 10, 3)
    put_head(p, who, eyes, wear, 0, -176)
    return (-100, -290, 104, 2)


def leg(p, x, top, bottom=-14, w=11, sock=True, toes=3, paw_dx=3):
    """a soft leg coming down from under the body (draw it before the body, which covers its top)"""
    p.shape(smooth([(x - w - 1, top), (x - w - 2, top + (bottom - top) * 0.45), (x - w + 1, bottom - 4), (x - 2, bottom), (x + 2, bottom), (x + w - 1, bottom - 4), (x + w + 2, top + (bottom - top) * 0.45), (x + w + 1, top)]))
    if sock:
        p.line(smooth([(x - w - 1, -32), (x, -36), (x + w + 1, -32)], False), 0.45)
    paw(p, x + paw_dx, -9, w + 5, 9.5, toes)


def stand(p, who, eyes, wear):
    """standing side on, facing right, with the face turned to us"""
    sug = who == 'sugarfoot'
    if sug:   # a soft, fluffy plume
        p.shape(smooth([(-76, -92), (-98, -106), (-114, -128), (-120, -152), (-108, -150), (-98, -130), (-84, -112), (-70, -100)]))
        for t in (0, 1):
            p.line(smooth([(-96 - t * 9, -114 - t * 14), (-104 - t * 9, -124 - t * 14)], False), 0.35)
    else:
        p.shape(smooth([(-76, -94), (-94, -112), (-104, -134), (-96, -137), (-86, -120), (-72, -104)]))
    # the far legs, a little behind and higher; then the near legs; then the body over their tops
    leg(p, -46, -80, -16, 10, toes=2)
    leg(p, 32, -80, -16, 10, toes=2)
    leg(p, -62, -76)
    leg(p, 46, -76)
    body = [(-82, -86), (-64, -108), (-12, -114), (34, -112), (60, -98), (68, -74), (58, -52), (24, -42), (-28, -40), (-64, -48), (-86, -66)]
    p.shape(smooth(body))
    if sug:   # the fluffy white chest, at the front, and a tuft at the hip
        p.line(smooth(tufts([(42, -110), (36, -92), (38, -70), (48, -54)], 3, 1, False), False), 0.55)
        p.line(smooth([(-72, -60), (-62, -70), (-48, -68)], False), 0.4)
    else:
        p.line(smooth([(46, -108), (40, -90), (44, -72), (54, -58)], False), 0.55)
    put_head(p, who, eyes, wear, 52, -152, 0.9)
    return (-124, -250, 134, 2)


def lie(p, who, eyes, wear):
    """lying down, facing us: the body low behind, the back legs tucked at the sides, the front paws out in front"""
    sug = who == 'sugarfoot'
    if sug:
        p.shape(smooth([(70, -20), (96, -28), (114, -20), (110, -8), (90, -6), (70, -10)]))
        p.line(smooth([(92, -22), (104, -16)], False), 0.35)
    else:
        p.shape(smooth([(70, -18), (94, -24), (104, -14), (94, -8), (72, -10)]))
    body = [(-84, -6), (-88, -32), (-72, -60), (-36, -78), (0, -82), (36, -78), (72, -60), (88, -32), (84, -6)]
    p.shape(smooth(body))
    for s_ in (-1, 1):   # the back legs, tucked along the sides
        p.shape(smooth([(s_ * 52, -46), (s_ * 74, -36), (s_ * 82, -18), (s_ * 74, -6), (s_ * 54, -6), (s_ * 46, -24)]))
        paw(p, s_ * 70, -8, 15, 8, 2)
    for s_ in (-1, 1):   # the front legs and paws, out in front
        x = s_ * 26
        p.shape(smooth([(x - 13, -44), (x - 15, -20), (x - 11, -6), (x + 11, -6), (x + 15, -20), (x + 13, -44)]))
        paw(p, x, -9, 19, 10, 3)
    put_head(p, who, eyes, wear, 0, -104, 0.95)
    return (-110, -205, 118, 2)


def peek(p, who, eyes, wear):
    """the head and two front paws over a ledge (the ledge is y = 0)"""
    put_head(p, who, eyes, wear, 0, -62, 1.0)
    for s_ in (-1, 1):
        paw(p, s_ * 42, -7, 18, 10, 3)
    return (-92, -165, 92, 4)


def draw(who, pose='sit', eyes='open', wear=None, lw=6.0):
    p = Pen(lw)
    if pose == 'head':
        head(p, who, eyes, wear)
        if wear in ('bandana', 'necklace'):
            neck_item(p, wear)
        return p.svg(), (-90, -100, 90, 70)
    bb = {'sit': sit, 'stand': stand, 'lie': lie, 'peek': peek}[pose](p, who, eyes, wear)
    return p.svg(), bb


if __name__ == '__main__':
    import sys
    out = []
    x = 140
    for who, wear in (('tidbit', 'hat'), ('sugarfoot', 'bow')):
        for pose, eyes in (('sit', 'open'), ('stand', 'open'), ('lie', 'shut'), ('peek', 'open')):
            s_, bb = draw(who, pose, eyes, wear)
            out.append('<g transform="translate(%d 290)">%s</g>' % (x, s_))
            out.append('<line x1="%d" x2="%d" y1="290" y2="290" stroke="#999"/>' % (x - 110, x + 110)) if pose == 'peek' else None
            x += 260
    open(sys.argv[1], 'w').write('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d 320" width="%d" height="320"><rect width="100%%" height="100%%" fill="#fff"/>%s</svg>' % (x, x, ''.join(out)))
