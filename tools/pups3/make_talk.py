#!/usr/bin/env python3
"""make_talk.py: the painted pups' talking mouths, made once, ahead of time.

For every drawing that shows a mouth (the side and three-quarter poses, and all twelve walk drawings), three more
copies with the jaw dropped a little, more and most: the part of the face between the mouth line and the chin is
stretched down smoothly (most at the chin, fading into the neck and to each side), so the drawing's own lips, mouth and
tongue open up. pups.js shows one of the four (shut, a little, more, most) at a time while a pup talks, so nothing is
ever drawn on top of a face. The jaw shapes are the ones measured on the sheets (JAW in assets/js/pups.js).

    python3 tools/pups3/make_talk.py [preview.png]

Writes assets/img/pups-sprites/poses-talk.webp and walk12-talk.webp: the three open levels stacked under each other.
"""
import json
import os
import sys
import cv2
import numpy as np

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
D = os.path.join(ROOT, 'assets', 'img', 'pups-sprites')
FW = 128
LEVELS = (2.0, 3.8, 5.6)    # sprite pixels the chin drops
JAW = {
    0: {'a1': [[-1, 8], [16, 12], [20, 16], [18, 22], [8, 22], [1, 16]], 'a2': [[9, 6], [27, 9], [26, 14], [22, 19], [15, 17], [11, 11]], 'w': [[-1, 8], [17, 13], [18, 18], [15, 22], [6, 20], [1, 14]]},
    1: {'a1': [[-1, 6], [18, 8], [18, 14], [14, 19], [5, 18], [1, 12]], 'a2': [[11, 2], [29, 4], [27, 10], [22, 16], [16, 14], [13, 8]], 'w': [[-3, 9], [17, 9], [17, 15], [13, 19], [4, 19], [-1, 14]]},
}


def ss(v):
    v = np.clip(v, 0, 1)
    return v * v * (3 - 2 * v)


def open_mouth(cellimg, hx, hy, J, d):
    h, w = cellimg.shape[:2]
    gx, gy = np.meshgrid(np.arange(w, dtype=np.float32), np.arange(h, dtype=np.float32))
    x, y = gx - hx, gy - hy
    xs, ys = [p[0] for p in J], [p[1] for p in J]
    x0, x1, chin = min(xs) - 4, max(xs) + 3, max(ys)
    y1 = chin + 10
    (ax, ay), (bx, by) = J[0], J[1]
    u = np.clip((x - ax) / ((bx - ax) or 1), 0, 1)
    top = ay + (by - ay) * u
    wy = np.where(y <= top, 0, np.where(y <= chin, ss((y - top) / np.maximum(2, chin - top)), 1 - ss((y - chin) / (y1 - chin))))
    wx = ss((x - x0) / 5) * ss((x1 - x) / 5)
    dy = (d * wy * wx).astype(np.float32)
    # output pixel y shows the drawing from a little higher up: the jaw moves down; sample premultiplied, so edges stay clean
    pm = cellimg.astype(np.float32)
    pm[..., :3] *= pm[..., 3:4] / 255.0
    o = cv2.remap(pm, gx, gy - dy, cv2.INTER_CUBIC, borderMode=cv2.BORDER_CONSTANT, borderValue=0)
    o = np.clip(o, 0, 255)
    al = np.maximum(o[..., 3:4], 1e-3)
    o[..., :3] = np.where(o[..., 3:4] > 0.5, o[..., :3] * 255.0 / al, 0)
    return np.clip(o, 0, 255).astype(np.uint8)


def build(sheet_name, cells, out_name):
    sheet = cv2.imread(os.path.join(D, sheet_name), cv2.IMREAD_UNCHANGED)
    H, W = sheet.shape[:2]
    out = np.zeros((H * len(LEVELS), W, 4), np.uint8)
    for li, d in enumerate(LEVELS):
        out[li * H:(li + 1) * H] = sheet
        for (r, c, hx, hy, J) in cells:
            cell = sheet[r * FW:(r + 1) * FW, c * FW:(c + 1) * FW]
            out[li * H + r * FW:li * H + (r + 1) * FW, c * FW:(c + 1) * FW] = open_mouth(cell, hx, hy, J, d)
    cv2.imwrite(os.path.join(D, out_name), out, [cv2.IMWRITE_WEBP_QUALITY, 92])
    print(out_name, out.shape)
    return out


meta = json.load(open(os.path.join(ROOT, 'tools', 'pups3', 'meta.json')))
pc = [(m['r'], m['c'], m['hx'], m['hy'], JAW[m['dog']]['a1' if m['ang'] == 1 else 'a2']) for m in meta['poses'] if m['ang'] in (1, 2)]
w12 = json.load(open(os.path.join(D, 'walk12.json')))
wc = [(m['r'], m['c'], m['hx'], m['hy'], JAW[m['dog']]['w']) for m in w12]
p_out = build('poses.webp', pc, 'poses-talk.webp')
w_out = build('walk12.webp', wc, 'walk12-talk.webp')
if len(sys.argv) > 1:   # a preview: each mouth drawing, shut and at the three open levels, big
    base_p = cv2.imread(os.path.join(D, 'poses.webp'), cv2.IMREAD_UNCHANGED)
    base_w = cv2.imread(os.path.join(D, 'walk12.webp'), cv2.IMREAD_UNCHANGED)
    rows = []
    for (src, out, cells) in ((base_p, p_out, pc), (base_w, w_out, wc[:3] + wc[12:15])):
        H = src.shape[0]
        for (r, c, hx, hy, J) in cells:
            tiles = [src[r * FW:(r + 1) * FW, c * FW:(c + 1) * FW]] + [out[li * H + r * FW:li * H + (r + 1) * FW, c * FW:(c + 1) * FW] for li in range(len(LEVELS))]
            pad = [np.pad(t, ((48, 48), (48, 48), (0, 0))) for t in tiles]
            crop = [t[int(hy) + 48 - 30:int(hy) + 48 + 40, int(hx) + 48 - 40:int(hx) + 48 + 45] for t in pad]
            rows.append(np.hstack(crop))
    img = np.vstack(rows)
    img = cv2.resize(img, None, fx=3, fy=3, interpolation=cv2.INTER_CUBIC)
    al = img[..., 3:4] / 255.0
    cv2.imwrite(sys.argv[1], (img[..., :3] * al + 235 * (1 - al)).astype(np.uint8))
