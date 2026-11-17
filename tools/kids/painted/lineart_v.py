#!/usr/bin/env python3
"""lineart_v.py: coloring-book line art of the painted Tidbit and Sugarfoot as clean vector drawings (owner, Nov 17 2026:
"make sure the coloring books look as good as they can ... high quality, professionally developed").

From each painted render (render.js) it makes an SVG of smooth traced curves, the way a coloring-book artist inks a drawing:
  - one bold outline around the pup (traced with potrace from the pup's smoothed shape)
  - softer inner lines where the coat changes color (the tan markings, the cream chest, muzzle and paws, the tongue, the
    outfit item), each area smoothed and traced as one clean shape, small specks left out, kept clear of the outline
  - the features drawn, not traced: round eyes with two highlights (or a closed-eye curve), a solid nose with a highlight,
    the mouth and the ears' inner edges as smooth curves, all placed from the measured points on the painted sheets
Writes line/<name>.svg (viewBox in the render's pixels; paws and head points as in index.json).
    python3 tools/kids/painted/lineart_v.py [name filters...]"""
import glob, json, math, os, sys
import numpy as np, cv2, potrace

D = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(D, 'line'); os.makedirs(OUT, exist_ok=True)
IDX = json.load(open(os.path.join(D, 'index.json')))
_E = {(0, 1): [(-2.6, -3.0, 3.6), (11.8, -5.2, 3.0)], (0, 2): [(9.6, -4.6, 3.5)], (1, 1): [(-3.2, -5.4, 3.8), (12, -6.5, 3.1)], (1, 2): [(10.8, -6.2, 3.4)]}
_F = {
    (0, 1): dict(ears=[[(-13, -14), (-16, -2), (-17, 8), (-22, 13)]], nose=(15, 2, 3.4, 2.6), mouth=[(-1, 8), (8, 10.5), (16, 12), (20, 16), (18, 21), (8, 21), (1, 16)]),
    (0, 2): dict(ears=[[(-2, -12), (0, 0), (-1, 10), (-6, 18)]], nose=(26, 0, 3, 2.6), mouth=[(9, 6), (18, 7.5), (27, 9), (26, 14), (22, 18), (15, 16), (11, 11)]),
    (1, 1): dict(ears=[[(-14, -14), (-17, 0), (-18, 10), (-22, 14)]], nose=(12, 1, 3.8, 3), mouth=[(-1, 6), (9, 7), (18, 8), (18, 14), (14, 19), (5, 18), (1, 12)]),
    (1, 2): dict(ears=[[(-2, -14), (0, -2), (-2, 8), (-6, 16)]], nose=(28, 0, 3, 2.6), mouth=[(11, 2), (20, 3), (29, 4), (27, 10), (22, 16), (16, 14), (13, 8)]),
}


# where markings may be (sprite pixels from the head centre): ellipses (face, chest), everything below 'legs', behind 'tail'
ZONES = {1: dict(ell=[(6, 4, 22, 19), (2, 32, 15, 17)], legs=47, tail=-44), 2: dict(ell=[(14, 2, 22, 19), (6, 28, 15, 15)], legs=44, tail=-60)}
WEAR = {'tidbit': '#7B4FBF', 'sugarfoot': '#F07EA6'}
# the markings, drawn by hand on the painted sheets, the way a coloring-book artist would ink them
HAND = {
    (0, 1): dict(  # Tidbit, three-quarter
        spots=[(-2, -11.5, 2.3, 2.6), (14, -12, 1.8, 2.0)],
        open=[[(-7, 1), (-7, 8), (-3, 14), (4, 18), (12, 18), (19, 14)],                       # the tan muzzle and chin
              [(-10, 52), (-5, 50), (-1, 53)], [(4, 54), (9, 52), (14, 55)],                     # socks, front
              [(-48, 52), (-42, 49), (-36, 52)], [(-32, 56), (-27, 54), (-22, 56)],              # socks, back
              [(-55, 32), (-50, 28), (-47, 24)]],                                                # the tail's pale tip
        closed=[[(-3, 21), (5, 20), (9, 26), (8, 36), (4, 44), (-1, 46), (-5, 40), (-6, 30)]],  # the chest
        smile=[(-1, 8), (7, 13.5), (17, 11)], tongue=[(10, 12.5), (13.5, 19), (18, 12.5)], nose=(15, 3, 3.4, 2.6),
        toes=[(-5, 72), (10, 73), (-42, 70), (-27, 72)]),
    (0, 2): dict(  # Tidbit, side
        spots=[(9, -17, 2.4, 2.6)],
        open=[[(19, -2), (10, -2), (3, 0), (2, 7), (6, 13), (14, 16), (22, 13)],
              [(-2, 18), (4, 30), (-2, 42)],
              [(-8, 50), (-2, 48), (4, 50)], [(-58, 52), (-51, 49), (-44, 52)],
              [(-68, 34), (-65, 28), (-63, 22)]],
        closed=[], smile=[(8, 6), (15, 10.5), (22, 8)], tongue=[(15.5, 10), (18.5, 17), (21.5, 10)], nose=(22, 1, 3, 2.6),
        toes=[(-2, 72), (-50, 72)]),
    (1, 1): dict(  # Sugarfoot, three-quarter
        spots=[],
        open=[[(-7, 4), (-6, 10), (-2, 15), (6, 18), (14, 17), (19, 12), (20, 5)],
              [(-8, 56), (-3, 54), (2, 56)], [(5, 59), (10, 57), (15, 59)],
              [(-48, 52), (-43, 49), (-38, 52)], [(-28, 56), (-22, 54), (-16, 56)],
              [(-50, 24), (-46, 32), (-48, 42)]],
        closed=[[(0, -4), (-2, -10), (-4, -18), (0, -22), (5, -20), (6, -12), (5, -5)],         # the white blaze
                [(-4, 20), (8, 19), (14, 26), (14, 36), (10, 46), (2, 50), (-6, 46), (-8, 34), (-7, 26)]],
        smile=[(-2, 6), (6, 12), (14, 10)], tongue=[(8.5, 11.5), (12, 18), (15.5, 11)], nose=(12, 2, 3.8, 3),
        toes=[(-3, 72), (10, 74), (-43, 70), (-22, 72)]),
    (1, 2): dict(  # Sugarfoot, side
        spots=[],
        open=[[(10, -3), (18, -4), (24, -2)], [(2, -2), (4, 6), (10, 12), (18, 12), (26, 6)],
              [(2, 16), (-2, 32), (2, 48)],
              [(-6, 54), (0, 52), (6, 54)], [(-60, 52), (-53, 49), (-46, 52)],
              [(-66, 26), (-70, 36), (-66, 46)]],
        closed=[[(0, -8), (-1, -14), (2, -20), (6, -16), (5, -9)]],
        smile=[(10, 6), (17, 10.5), (24, 8)], tongue=[(17.5, 10), (20.5, 17), (23.5, 10)], nose=(25, 0, 3, 2.6),
        toes=[(0, 72), (-52, 72)]),
}


def outfit_svg(wear, info, pose, lw):
    """the outfit item exactly as assets/js/pups.js draws it (wearItem), in line: white, with an ink outline"""
    if wear == 'none':
        return ''
    U = info['unit']; hx, hy = info['head']
    head = wear in ('hat', 'cap', 'bow')
    def X(x, y):
        if head: x, y = 0.5 + 1.14 * x, 4.6 + 1.14 * y
        else: x, y = x - 1, y + (0 if pose == 'lie' else 3)
        return hx + 1.18 * U * x, hy + 1.18 * U * y
    s = 1.18 * U * (1.14 if head else 1.0)
    def ell(cx, cy, rx, ry, rot=0.0, a0=0, a1=360, fill='#fff'):
        x, y = X(cx, cy)
        if a1 - a0 >= 360:
            return '<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" transform="rotate(%.2f %.1f %.1f)" fill="%s" stroke="#111" stroke-width="%.1f"/>' % (x, y, rx * s, ry * s, math.degrees(rot), x, y, fill, lw)
        p0 = (x + rx * s * math.cos(math.radians(a0)), y + ry * s * math.sin(math.radians(a0))); p1 = (x + rx * s * math.cos(math.radians(a1)), y + ry * s * math.sin(math.radians(a1)))
        return '<path d="M%.1f %.1f A%.1f %.1f 0 0 1 %.1f %.1fZ" transform="rotate(%.2f %.1f %.1f)" fill="%s" stroke="#111" stroke-width="%.1f" stroke-linejoin="round"/>' % (p0[0], p0[1], rx * s, ry * s, p1[0], p1[1], math.degrees(rot), x, y, fill, lw)
    def poly(pts, close=True):
        return '<path d="M%s%s" fill="#fff" stroke="#111" stroke-width="%.1f" stroke-linejoin="round"/>' % (' L'.join('%.1f %.1f' % X(*q) for q in pts), 'Z' if close else '', lw)
    if wear == 'hat':      # a beanie with a pompom
        return ell(-1.5, -9.2, 8.6, 4.8, -0.12, 180, 360) + ell(-1.5, -9, 8.8, 1.7, -0.12) + ell(-2.5, -14.2, 2.4, 2.4)
    if wear == 'cap':
        return ell(-1, -8.8, 8.2, 5, -0.1, 180, 360) + ell(6.5, -8.6, 6.5, 1.6, -0.05) + ell(-1, -13.4, 1.1, 1.1)
    if wear == 'bow':
        return ell(-8.3, -8.6, 3.4, 2.1, -0.5) + ell(-2.5, -9.8, 3.4, 2.1, 0.5) + ell(-5.4, -9.3, 1.5, 1.5)
    if wear == 'bandana':
        return poly([(-6, 7.5), (2, 9.5), (10, 7.5), (3, 17.5)]) + ell(-4.5, 8.5, 1.4, 1.4)
    if wear == 'necklace':   # a cord, beads and a heart
        x0, y0 = X(-5, 7.5); xc, yc = X(2, 15); x1, y1 = X(9.5, 8)
        out = '<path d="M%.1f %.1f Q%.1f %.1f %.1f %.1f" fill="none" stroke="#111" stroke-width="%.1f"/>' % (x0, y0, xc, yc, x1, y1, lw * 0.7)
        out += ''.join(ell(bx, by, 1.2, 1.2) for bx, by in ((-3, 9.4), (0, 11), (5, 11), (8, 9.3)))
        hx0, hy0 = X(2.5, 15.2); a, b = X(-0.5, 12.6), X(0.4, 10.6); c, dd = X(2.5, 11.8), X(4.6, 10.6); e = X(5.5, 12.6)
        return out + '<path d="M%.1f %.1f C%.1f %.1f %.1f %.1f %.1f %.1f C%.1f %.1f %.1f %.1f %.1f %.1fZ" fill="#fff" stroke="#111" stroke-width="%.1f" stroke-linejoin="round"/>' % (hx0, hy0, a[0], a[1], b[0], b[1], c[0], c[1], dd[0], dd[1], e[0], e[1], hx0, hy0, lw)
    return ''


def trace(mask, scale=1.0, turd=40, alpha=1.15):
    """potrace a 0/1 mask into SVG path data (smooth Bezier curves), scaled back to render pixels"""
    bm = potrace.Bitmap(~mask.astype(bool))   # (potracer traces the empty pixels: hand it the shape inverted)
    path = bm.trace(turdsize=turd, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY, alphamax=alpha, opticurve=True, opttolerance=0.3)
    f = lambda p: '%.1f %.1f' % (p.x * scale, p.y * scale)
    out = []
    for c in path:
        out.append('M' + f(c.start_point))
        for s in c.segments:
            out.append(('L%s L%s' % (f(s.c), f(s.end_point))) if s.is_corner else ('C%s %s %s' % (f(s.c1), f(s.c2), f(s.end_point))))
        out.append('Z')
    return ''.join(out)


def smooth_mask(m, sigma):
    return (cv2.GaussianBlur(m.astype(np.float32), (0, 0), sigma) > 0.5).astype(np.uint8)


def drop_small(m, min_area):
    n, cc, st, _ = cv2.connectedComponentsWithStats(m.astype(np.uint8), connectivity=8)
    keep = np.zeros_like(m, np.uint8)
    for i in range(1, n):
        if st[i, cv2.CC_STAT_AREA] >= min_area:
            keep[cc == i] = 1
    return keep


def catmull(pts, closed=False, n=10):
    q = [pts[-1]] + pts + [pts[0], pts[1]] if closed else [pts[0]] + pts + [pts[-1]]
    out = []
    for i in range(1, len(q) - 2):
        p0, p1, p2, p3 = (np.array(v, float) for v in q[i - 1:i + 3])
        for t in np.linspace(0, 1, n, endpoint=False):
            out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
    if not closed:
        out.append(np.array(pts[-1], float))
    return out


def lineart(path):
    name = os.path.basename(path)[:-4]; who, pose, wear, eyes = name.split('-')
    info = IDX[name]
    # the pup's own shape, without its outfit item (the item is drawn on top, exactly): the same pose and eyes, no outfit
    bare = os.path.join(os.path.dirname(path), '%s-%s-none-%s.png' % (who, pose, eyes))
    im = cv2.imread(bare if os.path.exists(bare) else path, cv2.IMREAD_UNCHANGED); a = im[:, :, 3].astype(np.float32) / 255; bgr = im[:, :, :3]
    H, W = a.shape
    U = info['unit']                          # pixels per pup unit
    LW_OUT, LW_IN, LW_F = 0.78 * U, 0.36 * U, 0.42 * U   # line weights: a bold outline (as bold as the scenes' own lines), softer inner lines
    # the shape: smoothed so the outline is calm, with fur tufts kept as soft bumps
    raw = (a > 0.45).astype(np.uint8)
    # a calm outline: the fluffy edge smoothed into soft, deliberate curves...
    sil = smooth_mask(raw, 0.42 * U)
    sil = cv2.morphologyEx(sil, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (int(0.5 * U) | 1, int(0.5 * U) | 1)))
    # ...but the gaps between the legs stay open, as crisp as in the painting
    legs_y = int(info['head'][1] + (44 if pose == 'lie' else 47) * 0.52 * U)
    gap = smooth_mask(1 - raw, 0.12 * U)
    sil[legs_y:, :] &= (1 - gap[legs_y:, :])
    sil = smooth_mask(sil, 0.08 * U)
    sil = drop_small(sil, 0.02 * sil.sum())
    dog, ang = (0 if who == 'tidbit' else 1), (2 if pose == 'lie' else 1)
    hx, hy = info['head']
    # the features, from the measured points
    k = 0.52 * U
    P = lambda q: (hx + q[0] * k, hy + q[1] * k)
    F = _F[(dog, ang)]
    feat = []
    for e in F['ears']:
        pts = [P(q) for q in e]; c = catmull(pts)
        feat.append('<path d="M%s" fill="none" stroke="#111" stroke-width="%.1f" stroke-linecap="round"/>' % (' L'.join('%.1f %.1f' % (p[0], p[1]) for p in c), LW_F))
    Hd = HAND[(dog, ang)]
    def curve(pts, closed=False, w=LW_IN):
        c = catmull([P(q) for q in pts], closed=closed)
        return '<path d="M%s%s" fill="none" stroke="#111" stroke-width="%.1f" stroke-linecap="round" stroke-linejoin="round"/>' % (' L'.join('%.1f %.1f' % (p[0], p[1]) for p in c), 'Z' if closed else '', w)
    inner = [curve(o) for o in Hd['open']] + [curve(c, True) for c in Hd['closed']]
    for (tx, ty) in Hd['toes']:   # two little toe lines on each paw
        for dx in (-2.2, 2.2):
            inner.append(curve([(tx + dx, ty - 3.2), (tx + dx * 1.05, ty - 1.6), (tx + dx * 1.1, ty)], w=LW_IN * 0.85))
    for (sx_, sy_, rx, ry) in Hd['spots']:
        cx, cy = P((sx_, sy_)); inner.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="none" stroke="#111" stroke-width="%.1f"/>' % (cx, cy, rx * k, ry * k, LW_IN))
    # the mouth: a happy curve and the tongue
    feat.append(curve(Hd['smile'], w=LW_F))
    tg = [P(q) for q in Hd['tongue']]
    feat.append('<path d="M%.1f %.1f Q%.1f %.1f %.1f %.1f" fill="#fff" stroke="#111" stroke-width="%.1f" stroke-linejoin="round"/>' % (tg[0][0], tg[0][1], tg[1][0], tg[1][1] + (tg[1][1] - tg[0][1]) * 0.5, tg[2][0], tg[2][1], LW_F))
    feat.append(curve([((Hd['tongue'][0][0] + Hd['tongue'][2][0]) / 2, Hd['tongue'][0][1] + 0.8), ((Hd['tongue'][0][0] + Hd['tongue'][2][0]) / 2, Hd['tongue'][1][1] - 2.5)], w=LW_F * 0.6))
    nx, ny, nrx, nry = Hd['nose']; cx, cy = P((nx, ny))
    feat.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="#111"/>' % (cx, cy, nrx * k, nry * k))
    feat.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="#fff"/>' % (cx - nrx * k * 0.35, cy - nry * k * 0.4, nrx * k * 0.28, nry * k * 0.2))
    for (ex, ey, er) in _E[(dog, ang)]:
        cx, cy = P((ex, ey)); r = er * k * 0.8
        if eyes == 'open':
            feat.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="#111"/>' % (cx, cy, r, r * 1.08))
            feat.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#fff"/>' % (cx - r * 0.32, cy - r * 0.38, r * 0.32))
            feat.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#fff"/>' % (cx + r * 0.3, cy + r * 0.35, r * 0.14))
        else:
            feat.append('<path d="M%.1f %.1f Q%.1f %.1f %.1f %.1f" fill="none" stroke="#111" stroke-width="%.1f" stroke-linecap="round"/>' % (cx - r, cy - r * 0.1, cx, cy + r * 0.75, cx + r, cy - r * 0.1, LW_F * 1.1))
    outline = trace(sil, 1.0, turd=120, alpha=1.3)
    cid = 'cl-' + name
    svg = ('<g class="pupline">'
           '<defs><clipPath id="%s"><path d="%s"/></clipPath></defs>'
           '<path d="%s" fill="#fff"/>'
           '<g clip-path="url(#%s)">%s</g>'
           '%s'
           '<path d="%s" fill="none" stroke="#111" stroke-width="%.1f" stroke-linejoin="round"/>'
           '%s'
           '</g>') % (cid, outline, outline, cid, ''.join(inner), ''.join(feat), outline, LW_OUT, outfit_svg(wear, info, pose, LW_F))
    open(os.path.join(OUT, name + '.svg'), 'w').write('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d">%s</svg>' % (W, H, W, H, svg))


if __name__ == '__main__':
    files = sorted(glob.glob(os.path.join(D, 'png', '*.png')))
    if len(sys.argv) > 1: files = [f for f in files if any(k in f for k in sys.argv[1:])]
    for f in files: lineart(f)
    print(len(files), 'vector line drawings')
