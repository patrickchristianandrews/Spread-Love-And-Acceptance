#!/usr/bin/env python3
"""lineart.py: coloring-book line art of the painted Tidbit and Sugarfoot, made from the painted renders (render.js).
A bold outline around the pup, softer lines where the fur changes color (the black coat, the tan markings, the white chest
and paws, the outfit item), the eyes and nose in solid ink, everything else white to color in.
    python3 tools/kids/painted/lineart.py      (png/*.png -> line/*.png, black ink on clear)"""
import glob, os, sys
import numpy as np, cv2
D = os.path.dirname(os.path.abspath(__file__)); os.makedirs(os.path.join(D, 'line'), exist_ok=True)
import json
IDX = json.load(open(os.path.join(D, 'index.json')))
# the eyes and the nose on the painted sheets (sprite pixels from the head centre; tools/pups3/make_shut.py measured the eyes)
_E = {(0, 1): [(-2.6, -3.0, 3.6), (11.8, -5.2, 3.0)], (0, 2): [(9.6, -4.6, 3.5)], (1, 1): [(-3.2, -5.4, 3.8), (12, -6.5, 3.1)], (1, 2): [(10.8, -6.2, 3.4)]}
EYES = {(w, p): _E[(d, 2 if p == 'lie' else 1)] for w, d in (('tidbit', 0), ('sugarfoot', 1)) for p in ('sit', 'run', 'lie')}
# traced on the sheets (sprite pixels from the head centre): the ears' inner edges, the nose, the mouth (pups.js JAW)
_F = {
    (0, 1): dict(ears=[[(-13, -14), (-16, -2), (-17, 8), (-22, 13)], [(16, -12), (19, 0), (20, 8)]], nose=(15, 2, 3.4, 2.6), mouth=[(-1, 8), (8, 10.5), (16, 12), (20, 16), (18, 21), (8, 21), (1, 16)]),
    (0, 2): dict(ears=[[(-2, -12), (0, 0), (-1, 10), (-6, 18)]], nose=(26, 0, 3, 2.6), mouth=[(9, 6), (18, 7.5), (27, 9), (26, 14), (22, 18), (15, 16), (11, 11)]),
    (1, 1): dict(ears=[[(-14, -14), (-17, 0), (-18, 10), (-22, 14)], [(21, -12), (23, 0), (22, 8)]], nose=(12, 1, 3.8, 3), mouth=[(-1, 6), (9, 7), (18, 8), (18, 14), (14, 19), (5, 18), (1, 12)]),
    (1, 2): dict(ears=[[(-2, -14), (0, -2), (-2, 8), (-6, 16)]], nose=(28, 0, 3, 2.6), mouth=[(11, 2), (20, 3), (29, 4), (27, 10), (22, 16), (16, 14), (13, 8)]),
}
FEAT = {(w, p): _F[(d, 2 if p == 'lie' else 1)] for w, d in (('tidbit', 0), ('sugarfoot', 1)) for p in ('sit', 'run', 'lie')}


def lineart(path, out):
    im = cv2.imread(path, cv2.IMREAD_UNCHANGED); a = im[:, :, 3].astype(np.float32) / 255; bgr = im[:, :, :3]
    Z = 2   # work at twice the size for smooth lines
    a = cv2.resize(a, None, fx=Z, fy=Z, interpolation=cv2.INTER_CUBIC); bgr = cv2.resize(bgr, None, fx=Z, fy=Z, interpolation=cv2.INTER_CUBIC)
    H, W = a.shape
    sil = (cv2.GaussianBlur(a, (0, 0), 3) > 0.5).astype(np.uint8)
    # the color regions: smooth the painting a lot (keeps edges), then sort every pixel into a few fur families
    sm = cv2.bilateralFilter(bgr, 0, 40, 9); sm = cv2.medianBlur(sm, 9)
    lab = cv2.cvtColor(sm, cv2.COLOR_BGR2LAB).astype(np.float32)
    L, A, B = lab[:, :, 0], lab[:, :, 1] - 128, lab[:, :, 2] - 128
    lab_ = np.zeros((H, W), np.uint8)
    lab_[(L < 85)] = 1                                    # the dark coat
    lab_[(L >= 85) & (B > 18) & (A < 30)] = 2              # tan / orange markings
    lab_[(L >= 170) & (B <= 18)] = 3                       # cream / white
    lab_[(A >= 30)] = 4                                    # pink tongue, pink or purple outfit
    lab_[(A < 30) & (B < -12)] = 5                         # purple
    lab_[(lab_ == 0)] = 2
    lab_[sil == 0] = 0
    # tidy: each family opened and closed so no speckles, small islands merged into their surroundings
    k = cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9))
    clean = np.zeros_like(lab_)
    for v in (1, 2, 3, 4, 5):
        m = cv2.morphologyEx(cv2.morphologyEx((lab_ == v).astype(np.uint8), cv2.MORPH_OPEN, k), cv2.MORPH_CLOSE, k)
        clean[(m > 0) & (clean == 0)] = v
    # smooth borders: every family as a soft mask, blurred a lot, and each pixel goes to the strongest
    soft = np.stack([cv2.GaussianBlur((clean == v).astype(np.float32), (0, 0), 7) for v in range(6)], 0)
    soft[0] = np.where(sil > 0, -1, 2)
    clean = soft.argmax(0).astype(np.uint8)
    hole = (clean == 0) & (sil > 0)
    if hole.any():
        dist, lab2 = cv2.distanceTransformWithLabels((clean == 0).astype(np.uint8), cv2.DIST_L2, 5, labelType=cv2.DIST_LABEL_PIXEL)
        ys, xs = np.nonzero(clean > 0); vals = clean[ys, xs]; lut = np.zeros(lab2.max() + 1, np.uint8)
        idx = lab2[ys, xs]; lut[idx] = vals; clean[hole] = lut[lab2[hole]]
    minA = 0.006 * sil.sum()
    for v in (1, 2, 3, 4, 5):
        n, cc, st, _ = cv2.connectedComponentsWithStats((clean == v).astype(np.uint8))
        for i in range(1, n):
            if st[i, cv2.CC_STAT_AREA] < minA:
                ring = cv2.dilate((cc == i).astype(np.uint8), k) & (cc != i) & (sil > 0)
                vs = clean[ring > 0]; vs = vs[vs != v]
                if len(vs): clean[cc == i] = np.bincount(vs).argmax()
    ink = np.zeros((H, W), np.uint8)
    # inner lines: where two families meet
    edge = np.zeros((H, W), np.uint8)
    edge[:, 1:] |= (clean[:, 1:] != clean[:, :-1]).astype(np.uint8); edge[1:, :] |= (clean[1:, :] != clean[:-1, :]).astype(np.uint8)
    edge &= cv2.erode(sil, np.ones((7, 7), np.uint8))
    ink |= cv2.dilate(edge, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (5, 5)))
    # the outline, bold
    cnt, _ = cv2.findContours(sil, cv2.RETR_EXTERNAL, cv2.CHAIN_APPROX_NONE)
    cv2.drawContours(ink, cnt, -1, 1, thickness=11, lineType=cv2.LINE_AA)
    # strong shading edges (the ears against the head, the legs against the body): long ones only
    g = cv2.cvtColor(cv2.bilateralFilter(bgr, 0, 30, 12), cv2.COLOR_BGR2GRAY)
    ed = cv2.Canny(cv2.GaussianBlur(g, (0, 0), 3), 18, 40) & cv2.erode(sil, np.ones((15, 15), np.uint8)) * 255
    n, cc, st, _ = cv2.connectedComponentsWithStats((ed > 0).astype(np.uint8), connectivity=8)
    for i in range(1, n):
        if max(st[i, cv2.CC_STAT_WIDTH], st[i, cv2.CC_STAT_HEIGHT]) > 0.12 * max(H, W) ** 1 * 0.5: ink[cc == i] = 1
    ink = cv2.dilate(ink, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (3, 3)))
    # the eyes, at their measured places: solid, with a white glint (open), or a closed-eye curve (shut)
    name = os.path.basename(path)[:-4]; who, pose, _, eyes = name.split('-')
    info = IDX[name]; hx, hy = info['head'][0] * Z, info['head'][1] * Z; k = 0.52 * info['unit'] * Z
    for (ex, ey, er) in EYES.get((who, pose), []):
        cx, cy, r = int(hx + ex * k), int(hy + ey * k), er * k * 0.78
        cv2.ellipse(ink, (cx, cy), (int(r * 1.12), int(r * 1.12)), 0, 0, 360, 0, -1)
        if eyes == 'open':
            cv2.ellipse(ink, (cx, cy), (int(r), int(r * 1.05)), 0, 0, 360, 1, -1)
            gl = np.zeros_like(ink); cv2.circle(gl, (int(cx - r * 0.35), int(cy - r * 0.4)), max(2, int(r * 0.28)), 1, -1); ink[gl > 0] = 0
        else:
            cv2.ellipse(ink, (cx, cy), (int(r), int(r * 0.45)), 0, 15, 165, 1, max(3, int(r * 0.22)))
    # the ears, the nose and the mouth, traced
    F = FEAT[(who, pose)]
    P = lambda q: (int(hx + q[0] * k), int(hy + q[1] * k))

    def smooth(pts, closed=False, n=12):   # a Catmull-Rom curve through the traced points
        q = [pts[-1]] + pts + [pts[0], pts[1]] if closed else [pts[0]] + pts + [pts[-1]]
        out = []
        for i in range(1, len(q) - 2):
            p0, p1, p2, p3 = (np.array(v, float) for v in q[i - 1:i + 3])
            for t in np.linspace(0, 1, n, endpoint=False):
                out.append(0.5 * ((2 * p1) + (-p0 + p2) * t + (2 * p0 - 5 * p1 + 4 * p2 - p3) * t * t + (-p0 + 3 * p1 - 3 * p2 + p3) * t ** 3))
        if not closed: out.append(np.array(pts[-1], float))
        return np.array([P(v) for v in out], np.int32)
    for e in F['ears']:
        cv2.polylines(ink, [smooth(e)], False, 1, max(4, int(0.55 * k)), cv2.LINE_AA)
    nx, ny, nrx, nry = F['nose']; cv2.ellipse(ink, P((nx, ny)), (int(nrx * k), int(nry * k)), 0, 0, 360, 1, -1)
    cv2.polylines(ink, [smooth(F['mouth'], True)], True, 1, max(3, int(0.45 * k)), cv2.LINE_AA)
    ink = cv2.GaussianBlur(ink.astype(np.float32), (0, 0), 1.2)
    out_a = np.clip(ink * 1.6, 0, 1)
    rgba = np.zeros((H, W, 4), np.uint8); rgba[:, :, 3] = (out_a * 255).astype(np.uint8)
    # white inside the pup, so a pup in front of something covers it
    white = np.zeros((H, W, 4), np.uint8); white[:, :, :3] = 255; white[:, :, 3] = sil * 255
    comp = white.astype(np.float32); al = out_a[:, :, None]
    comp[:, :, :3] = comp[:, :, :3] * (1 - al); comp[:, :, 3] = np.maximum(comp[:, :, 3], out_a * 255)
    cv2.imwrite(out, comp.astype(np.uint8))   # kept at twice the size, for crisp printed lines (placed at the same size)


if __name__ == '__main__':
    files = sorted(glob.glob(os.path.join(D, 'png', '*.png')))
    if len(sys.argv) > 1: files = [f for f in files if any(k in f for k in sys.argv[1:])]
    for f in files: lineart(f, os.path.join(D, 'line', os.path.basename(f)))
    print(len(files), 'line drawings')
