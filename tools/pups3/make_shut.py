#!/usr/bin/env python3
"""make_shut.py: poses-shut.webp, the painted pose sheet with every eye closed, for blinking and sleeping (assets/js/pups.js).
Each eye is filled in from the fur around it (OpenCV inpainting, at 4x, so it blends) and given a soft, dark closed-eye curve.
    python3 tools/pups3/make_shut.py"""
import json, os
import numpy as np, cv2
from PIL import Image, ImageDraw
D = os.path.dirname(__file__)
M = json.load(open(os.path.join(D, 'meta.json')))
EYES = {(0, 1): [(-2.6, -3.0, 3.6), (11.8, -5.2, 3.0)], (0, 2): [(9.6, -4.6, 3.5)], (1, 1): [(-3.2, -5.4, 3.8), (12, -6.5, 3.1)], (1, 2): [(10.8, -6.2, 3.4)]}   # measured on the sheet, eye by eye
Z = 4
im = Image.open(os.path.join(D, 'poses.webp')).convert('RGBA')
big = im.resize((im.width * Z, im.height * Z), Image.LANCZOS)
rgb = np.array(big)[:, :, :3][:, :, ::-1].copy(); a = np.array(big)[:, :, 3]
mask = np.zeros(rgb.shape[:2], np.uint8); arcs = []
for p in M['poses']:
    for (x, y, r) in EYES.get((p['dog'], p['ang']), []):
        cx, cy = (p['c'] * M['fw'] + p['hx'] + x) * Z, (p['r'] * M['fh'] + p['hy'] + y) * Z
        cv2.ellipse(mask, (int(cx), int(cy)), (int((r + 0.6) * Z), int((r + 0.6) * Z)), 0, 0, 360, 255, -1)
        arcs.append((cx, cy, r))
out = cv2.inpaint(rgb, mask, 6, cv2.INPAINT_TELEA)
o = Image.fromarray(np.dstack([out[:, :, ::-1], a]), 'RGBA'); d = ImageDraw.Draw(o)
for cx, cy, r in arcs:   # the closed eye: a soft curve, a little below the middle of where the eye was
    w, h = r * 0.85 * Z, 1.5 * Z
    y0 = cy - 0.2 * Z
    d.arc([cx - w, y0 - h + 0.9 * Z, cx + w, y0 + h + 0.9 * Z], 20, 160, fill=(214, 168, 120, 150), width=int(0.8 * Z))   # a faint warm edge under it, so it reads on black fur
    d.arc([cx - w, y0 - h, cx + w, y0 + h], 12, 168, fill=(10, 6, 5, 255), width=int(1.6 * Z))
o = o.resize(im.size, Image.LANCZOS)
o.save(os.path.join(D, 'poses-shut.webp'), lossless=False, quality=92)
print('wrote poses-shut.webp')
