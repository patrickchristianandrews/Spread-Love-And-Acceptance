#!/usr/bin/env python3
"""inkfrom.py: coloring-book line art made from the site's own painted Tidbit and Sugarfoot (owner, Nov 17 2026: "the new
coloring books do not look like Tidbit and Sugarfoot's current version on the site ... make sure it is correct").

The painted render (render.js, the same drawing every page of the site shows) is flattened into its few real colors, the way
an inker reads a painting: the black coat, the tan markings, the cream markings, the pink tongue (and the outfit item). Each
color area is smoothed into calm shapes, small specks are merged away, and every border between two areas becomes a clean
traced line; the outline is bold. The eyes and nose are inked solid with a white shine, from their measured places.
Writes line/<name>.svg (render pixels; paws and head as in index.json).
    python3 tools/kids/painted/inkfrom.py [name filters...]"""
import glob, json, os, sys
import numpy as np, cv2, potrace
D = os.path.dirname(os.path.abspath(__file__)); OUT = os.path.join(D, 'line'); os.makedirs(OUT, exist_ok=True)
IDX = json.load(open(os.path.join(D, 'index.json')))
sys.path.insert(0, D)
from lineart_v import _E, outfit_svg   # the measured eyes, and the outfit items drawn exactly


def trace(mask, alpha=1.25, turd=60):
    bm = potrace.Bitmap(~mask.astype(bool))
    path = bm.trace(turdsize=turd, turnpolicy=potrace.POTRACE_TURNPOLICY_MINORITY, alphamax=alpha, opticurve=True, opttolerance=0.4)
    f = lambda p: '%.1f %.1f' % (p.x, p.y)
    out = []
    for c in path:
        out.append('M' + f(c.start_point))
        for s in c.segments:
            out.append(('L%s L%s' % (f(s.c), f(s.end_point))) if s.is_corner else ('C%s %s %s' % (f(s.c1), f(s.c2), f(s.end_point))))
        out.append('Z')
    return ''.join(out)


def soft(m, sigma):
    return (cv2.GaussianBlur(m.astype(np.float32), (0, 0), sigma) > 0.5).astype(np.uint8)


def ink(path):
    name = os.path.basename(path)[:-4]; who, pose, wear, eyes = name.split('-')
    info = IDX[name]; U = info['unit']
    bare = os.path.join(os.path.dirname(path), '%s-%s-none-%s.png' % (who, pose, eyes))
    im = cv2.imread(bare, cv2.IMREAD_UNCHANGED)
    a = im[:, :, 3]; bgr = im[:, :, :3]; H, W = a.shape
    sil = soft(a > 120, 0.25 * U)
    n, cc, st, _ = cv2.connectedComponentsWithStats(sil); big = 1 + int(np.argmax(st[1:, cv2.CC_STAT_AREA])); sil = (cc == big).astype(np.uint8)
    # the painting's colors, read the way an inker would
    sm = cv2.bilateralFilter(bgr, 0, 50, 0.5 * U)
    lab = cv2.cvtColor(sm, cv2.COLOR_BGR2LAB).astype(np.float32); L, A, B = lab[..., 0], lab[..., 1] - 128, lab[..., 2] - 128
    lbl = np.zeros((H, W), np.uint8)            # 0 coat (black)
    lbl[(L > 95) & (B > 22)] = 1                # tan
    lbl[(L > 165) & (B <= 40)] = 2              # cream / white
    lbl[(A > 22) & (L > 90)] = 3                # the pink tongue
    lbl[sil == 0] = 255
    # calm shapes: each color smoothed, the strongest wins
    R = 0.55 * U
    stack = np.stack([cv2.GaussianBlur((lbl == v).astype(np.float32), (0, 0), R if v != 3 else 0.2 * U) * (1.6 if v == 3 else 1) for v in range(4)])
    lab2 = stack.argmax(0).astype(np.uint8); lab2[sil == 0] = 255
    # small specks merge into what surrounds them
    minA = 0.004 * sil.sum()
    for _ in range(2):
        for v in range(4):
            n, cc, st, _ = cv2.connectedComponentsWithStats((lab2 == v).astype(np.uint8), connectivity=8)
            for i in range(1, n):
                if st[i, cv2.CC_STAT_AREA] < (minA * 0.25 if v == 3 else minA):
                    m = cc == i; ring = cv2.dilate(m.astype(np.uint8), np.ones((5, 5), np.uint8)) > 0
                    nb = lab2[ring & ~m]; nb = nb[nb != 255]; nb = nb[nb != v]
                    if len(nb): lab2[m] = np.bincount(nb).argmax()
    # lines: each light area's outline (inside the pup)
    lw_out, lw_in, lw_f = 0.85 * U, 0.42 * U, 0.42 * U
    inner = []
    for v in (1, 2, 3):
        m = (lab2 == v).astype(np.uint8)
        if m.any():
            inner.append('<path d="%s" fill="none" stroke="#111" stroke-width="%.1f" stroke-linejoin="round"/>' % (trace(m, 1.2, 80), lw_in if v != 3 else lw_f))
    # eyes and nose from the measured spots (the painting's eyes are dark on dark fur)
    dog, ang = (0 if who == 'tidbit' else 1), (2 if pose == 'lie' else 1)
    hx, hy = info['head']; k = 0.52 * U; P = lambda q: (hx + q[0] * k, hy + q[1] * k)
    feat = []
    for (ex, ey, er) in _E[(dog, ang)]:
        cx, cy = P((ex, ey)); r = er * k * 0.78
        if eyes == 'open':
            feat.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="#111"/>' % (cx, cy, r, r * 1.08))
            feat.append('<circle cx="%.1f" cy="%.1f" r="%.1f" fill="#fff"/>' % (cx - r * 0.32, cy - r * 0.38, r * 0.34))
        else:
            feat.append('<path d="M%.1f %.1f Q%.1f %.1f %.1f %.1f" fill="none" stroke="#111" stroke-width="%.1f" stroke-linecap="round"/>' % (cx - r, cy - r * 0.1, cx, cy + r * 0.75, cx + r, cy - r * 0.1, lw_f * 1.1))
    # the nose: the darkest blob near the tip of the muzzle in the painting
    g = cv2.cvtColor(bgr, cv2.COLOR_BGR2GRAY); dark = ((g < 55) & (sil > 0)).astype(np.uint8)
    nz = P((15, 3) if ang == 1 and dog == 0 else (12, 2) if ang == 1 else (25, 0))
    n, cc, st, cen = cv2.connectedComponentsWithStats(cv2.morphologyEx(dark, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)))
    best = None
    for i in range(1, n):
        d = (cen[i][0] - nz[0]) ** 2 + (cen[i][1] - nz[1]) ** 2
        if d < (7 * k) ** 2 and st[i, cv2.CC_STAT_AREA] < 0.01 * sil.sum() and (best is None or d < best[0]): best = (d, i)
    if best:
        nm = soft(cc == best[1], 0.12 * U)
        feat.append('<path d="%s" fill="#111"/>' % trace(nm, 1.2, 10))
        x, y, w, h = st[best[1], 0], st[best[1], 1], st[best[1], 2], st[best[1], 3]
        feat.append('<ellipse cx="%.1f" cy="%.1f" rx="%.1f" ry="%.1f" fill="#fff"/>' % (x + w * 0.35, y + h * 0.32, w * 0.16, h * 0.12))
    outline = trace(sil, 1.25, 150)
    cid = 'cl-' + name
    svg = ('<g class="pupline"><defs><clipPath id="%s"><path d="%s"/></clipPath></defs><path d="%s" fill="#fff"/>'
           '<g clip-path="url(#%s)">%s</g>%s<path d="%s" fill="none" stroke="#111" stroke-width="%.1f" stroke-linejoin="round"/>%s</g>') % (
        cid, outline, outline, cid, ''.join(inner), ''.join(feat), outline, lw_out, outfit_svg(wear, info, pose, lw_f))
    open(os.path.join(OUT, name + '.svg'), 'w').write('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d">%s</svg>' % (W, H, W, H, svg))


if __name__ == '__main__':
    files = sorted(glob.glob(os.path.join(D, 'png', '*.png')))
    if len(sys.argv) > 1: files = [f for f in files if any(k in f for k in sys.argv[1:])]
    for f in files: ink(f)
    print(len(files), 'drawings')
