#!/usr/bin/env python3
"""make_walk16.py: smooth walking for the painted pups.

The painted walk has four drawings a stride (assets/img/pups-sprites/walk.webp). Shown one at a time they step; blended
they look doubled. This makes three true in-between drawings for each pair (16 a stride) by moving the paint along the
measured motion between the two drawings (optical flow), so a leg is drawn once, part way along its swing.

    python3 tools/pups3/make_walk16.py [preview.png]

Writes assets/img/pups-sprites/walk12.webp (12 columns x 2 rows of 128 px) and walk12.json (each drawing's box and head).
"""
import json
import os
import sys
import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'assets', 'img', 'pups-sprites', 'walk.webp')
OUT = os.path.join(ROOT, 'assets', 'img', 'pups-sprites', 'walk12.webp')
FW = 128
N = 3          # drawings per gap, counting the painted one: 3 x 4 = 12 a stride (each in-between moves the nearer drawing a third of the way)

sheet = cv2.imread(SRC, cv2.IMREAD_UNCHANGED)   # BGRA


def cell(dog, q):
    return sheet[dog * FW:(dog + 1) * FW, q * FW:(q + 1) * FW].astype(np.float32)


def premul(a):
    out = a.copy()
    out[..., :3] *= a[..., 3:4] / 255.0
    return out


def unpremul(a):
    out = a.copy()
    al = np.maximum(a[..., 3:4], 1e-3)
    out[..., :3] = np.where(a[..., 3:4] > 0.5, a[..., :3] * 255.0 / al, 0)
    return out


def gray(a):
    # paint on a mid-gray ground, so the outline counts as much as the inside
    p = premul(a)
    g = p[..., :3] + (1 - a[..., 3:4] / 255.0) * 128
    return cv2.cvtColor(np.clip(g, 0, 255).astype(np.uint8), cv2.COLOR_BGR2GRAY)


def flow(a, b):
    big = 4   # measure on a 4x copy: the legs are thin
    ga = cv2.resize(gray(a), None, fx=big, fy=big, interpolation=cv2.INTER_CUBIC)
    gb = cv2.resize(gray(b), None, fx=big, fy=big, interpolation=cv2.INTER_CUBIC)
    dis = cv2.DISOpticalFlow_create(cv2.DISOPTICAL_FLOW_PRESET_ULTRAFAST + 2)
    dis.setFinestScale(0)
    f = dis.calc(ga, gb, None)
    f = cv2.resize(f, (FW, FW), interpolation=cv2.INTER_AREA) / big
    return cv2.GaussianBlur(f, (0, 0), 1.0)


def warp(img, fl, t):
    h, w = img.shape[:2]
    gx, gy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    return cv2.remap(img, gx - fl[..., 0] * t, gy - fl[..., 1] * t, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=0)


def trusted(f1, f2):
    """f1 kept only where going there and coming back agree (the body, the head, the tail); where they don't (a leg
    that swings past another) the paint is not moved at all, so it can never smear"""
    h, w = f1.shape[:2]
    gx, gy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    back = cv2.remap(f2, gx + f1[..., 0], gy + f1[..., 1], cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
    err = np.hypot(f1[..., 0] + back[..., 0], f1[..., 1] + back[..., 1])
    m = np.clip(1.6 - err / 1.2, 0, 1).astype(np.float32)
    m = cv2.GaussianBlur(cv2.erode(m, np.ones((3, 3), np.uint8)), (0, 0), 1.5)
    return f1 * m[..., None]


def between(a, b, t):
    fab, fba = flow(a, b), flow(b, a)
    fab, fba = trusted(fab, fba), trusted(fba, fab)
    pa, pb = premul(a), premul(b)
    # one drawing only, never two mixed: the nearer drawing, carried part of the way along the motion
    out = warp(pa, fba, t) if t <= 0.5 else warp(pb, fab, 1 - t)
    return unpremul(out)


frames = {}
for dog in (0, 1):
    for q in range(4):
        a, b = cell(dog, q), cell(dog, (q + 1) % 4)
        for k in range(N):
            t = k / N
            frames[(dog, q * N + k)] = a if k == 0 else between(a, b, t)

out = np.zeros((2 * FW, 4 * N * FW, 4), np.uint8)
boxes = []
for (dog, i), im in frames.items():
    im = np.clip(im, 0, 255).astype(np.uint8)
    im[..., 3] = np.where(im[..., 3] < 8, 0, im[..., 3])
    out[dog * FW:(dog + 1) * FW, i * FW:(i + 1) * FW] = im
cv2.imwrite(OUT, out, [cv2.IMWRITE_WEBP_QUALITY, 92])
# each drawing's box (from its paint) and head centre (moved the same share of the way as the drawing)
meta = json.load(open(os.path.join(ROOT, 'tools', 'pups3', 'meta.json')))
W4 = {(m['dog'], m['c']): m for m in meta['walk']}
info = []
for dog in (0, 1):
    for i in range(4 * N):
        q, k = divmod(i, N)
        a, b = W4[(dog, q)], W4[(dog, (q + 1) % 4)]
        t = k / N
        near, far, u = (a, b, t) if t <= 0.5 else (b, a, 1 - t)
        al = out[dog * FW:(dog + 1) * FW, i * FW:(i + 1) * FW, 3]
        ys, xs = np.nonzero(al > 20)
        info.append({'r': dog, 'c': i, 'x0': int(xs.min()), 'x1': int(xs.max()) + 1, 'y0': int(ys.min()), 'y1': int(ys.max()) + 1,
                     'hx': near['hx'] + (far['hx'] - near['hx']) * u, 'hy': near['hy'] + (far['hy'] - near['hy']) * u, 'dog': dog})
json.dump(info, open(OUT.replace('.webp', '.json'), 'w'))
print('frames', len(info))
print(OUT, out.shape)
if len(sys.argv) > 1:
    prev = cv2.resize(out, None, fx=3, fy=3, interpolation=cv2.INTER_NEAREST)
    bg = np.full(prev.shape[:2] + (3,), 235, np.uint8)
    al = prev[..., 3:4] / 255.0
    cv2.imwrite(sys.argv[1], (prev[..., :3] * al + bg * (1 - al)).astype(np.uint8))
