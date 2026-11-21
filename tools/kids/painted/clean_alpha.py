#!/usr/bin/env python3
"""clean_alpha.py: clears the near-invisible haze around the painted pups (alpha 1 to 8 left over from the sprite
sheets), which shows as a faint pale box on a colored page. Run after render.js:  python3 tools/kids/painted/clean_alpha.py"""
import glob
import os
import numpy as np
from PIL import Image

D = os.path.join(os.path.dirname(os.path.abspath(__file__)), 'png')
n = 0
for f in sorted(glob.glob(os.path.join(D, '*.png'))):
    im = Image.open(f).convert('RGBA')
    a = np.array(im)
    al = a[:, :, 3].astype(np.float32)
    new = np.clip((al - 8.0) * 255.0 / 247.0, 0, 255).astype(np.uint8)
    if (new != a[:, :, 3]).any():
        a[:, :, 3] = new
        Image.fromarray(a, 'RGBA').save(f, optimize=True)
        n += 1
print('cleaned', n, 'images')
