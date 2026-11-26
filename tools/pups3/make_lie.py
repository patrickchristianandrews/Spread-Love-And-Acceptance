#!/usr/bin/env python3
"""make_lie.py: Tidbit and Sugarfoot lying down asleep, made from their own side-view paintings.

    python3 tools/pups3/make_lie.py [preview.png]

There is no painted lying-down drawing of the pups, and squashing the standing one only makes a short pup
standing up. So each sleeper is built from the side-view painting (tools/kids/painted/png/<pup>-lie-none-*.png):
the legs are taken away under the belly and the body is lowered to the floor, the front paws rest forward on the
floor under the chin, the near hind paw is tucked in under the haunch, and the head tips down onto the paws.
Writes assets/img/pups-sprites/lie.webp (eyes shut on top, eyes open below; Tidbit left, Sugarfoot right) and
prints the frame table for META.lie in assets/js/pups.js.
"""
import json
import os
import sys

import numpy as np
from PIL import Image, ImageFilter

ROOT = os.path.dirname(os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
SRC = os.path.join(ROOT, 'tools', 'kids', 'painted', 'png')
OUT = os.path.join(ROOT, 'assets', 'img', 'pups-sprites', 'lie.webp')
SCALE = 0.088            # source pixels to sprite pixels (about the size of the standing pups on the same page)
CW, CH = 176, 96         # one cell of the sheet

# measured on the paintings (source pixels): where the legs start, the floor, the front and hind paws, the head and
# the point the head turns about (the back of the neck)
P = {
    'tidbit': dict(cut=712, ground=962, front=(770, 850, 1080, 966), hind=(330, 860, 560, 966),
                   head=[(700, 0), (1435, 0), (1435, 450), (1060, 470), (860, 440), (700, 380)], pivot=(860, 420),
                   tilt=-17, sink=95, reach=150, hc=(1010, 200)),
    'sugarfoot': dict(cut=735, ground=1028, front=(830, 900, 1150, 1032), hind=(380, 905, 640, 1032),
                      head=[(740, 0), (1517, 0), (1517, 500), (1120, 520), (900, 480), (740, 420)], pivot=(900, 460),
                      tilt=-16, sink=100, reach=150, hc=(1060, 245)),
}


def soft_mask(size, poly=None, below=None, feather=18):
    """a 0..255 mask: inside a polygon, or above a line y=below; edges blurred so cuts never show."""
    from PIL import ImageDraw
    m = Image.new('L', size, 0)
    d = ImageDraw.Draw(m)
    if poly:
        d.polygon(poly, fill=255)
    if below is not None:
        d.rectangle([0, 0, size[0], below], fill=255)
    return m.filter(ImageFilter.GaussianBlur(feather))


def with_alpha(im, mask):
    a = np.asarray(im.getchannel('A'), dtype=np.float32) * (np.asarray(mask, dtype=np.float32) / 255.0)
    out = im.copy()
    out.putalpha(Image.fromarray(a.clip(0, 255).astype(np.uint8)))
    return out


def fade_top(im, frac=0.45):
    """a paw cut from a leg: its top fades out softly, so no straight edge shows where it was cut."""
    w, h = im.size
    ramp = np.clip(np.arange(h, dtype=np.float32) / max(1.0, h * frac), 0, 1)
    ramp = ramp * ramp * (3 - 2 * ramp)
    a = np.asarray(im.getchannel('A'), dtype=np.float32) * ramp[:, None]
    out = im.copy()
    out.putalpha(Image.fromarray(a.clip(0, 255).astype(np.uint8)))
    return out


def sleeper(pup, eyes):
    q = P[pup]
    src = Image.open(os.path.join(SRC, '%s-lie-none-%s.png' % (pup, eyes))).convert('RGBA')
    if eyes == 'open':   # the open-eyed painting is a few pixels smaller: line it up with the shut one
        ref = Image.open(os.path.join(SRC, '%s-lie-none-shut.png' % pup))
        src = src.resize(ref.size, Image.LANCZOS)
    W, H = src.size
    drop = q['ground'] - q['cut'] - 12
    canvas = Image.new('RGBA', (W + 260, H), (0, 0, 0, 0))

    # the far front paw (a little behind and darker), then the body without legs or head, lowered to the floor
    fx0, fy0, fx1, fy1 = q['front']
    paws = fade_top(src.crop((fx0, fy0, fx1, fy1)))
    far = paws.copy()
    far = Image.blend(Image.new('RGBA', far.size, (0, 0, 0, 0)), far, 1.0)
    farc = np.asarray(far, dtype=np.float32); farc[..., :3] *= 0.72
    far = Image.fromarray(farc.clip(0, 255).astype(np.uint8))
    gx = fx0 + q['reach']
    canvas.alpha_composite(far, (gx - 40, q['ground'] - (fy1 - fy0) - 10))

    body = with_alpha(src, soft_mask(src.size, below=q['cut'], feather=14))
    nohead = with_alpha(body, Image.eval(soft_mask(src.size, poly=q['head'], feather=10), lambda v: 255 - v))
    canvas.alpha_composite(nohead, (0, drop))

    # the near hind paw, tucked forward under the haunch
    hx0, hy0, hx1, hy1 = q['hind']
    hp = fade_top(src.crop((hx0, hy0, hx1, hy1)), 0.6)
    canvas.alpha_composite(hp, (hx0 + 90, q['ground'] - (hy1 - hy0)))

    # the near front paw, forward on the floor
    canvas.alpha_composite(paws, (gx, q['ground'] - (fy1 - fy0)))

    # the head, tipped down onto the paws
    head = with_alpha(src, soft_mask(src.size, poly=q['head'], feather=10))
    px, py = q['pivot']
    big = Image.new('RGBA', canvas.size, (0, 0, 0, 0))
    big.alpha_composite(head, (0, drop))
    big = big.rotate(q['tilt'], resample=Image.BICUBIC, center=(px, py + drop))
    canvas.alpha_composite(big, (q['reach'] // 3, q['sink']))
    bb = canvas.getbbox()
    # where the middle of her head ends up (the same point the standing drawings' head centres mark), so a bow, hat or
    # collar sits where it does when she stands: turned with the head about the neck, then moved with it
    import math
    t = math.radians(q['tilt']); cx, cy = px, py + drop; x, y = q['hc'][0], q['hc'][1] + drop
    hx = cx + (x - cx) * math.cos(t) + (y - cy) * math.sin(t) + q['reach'] // 3
    hy = cy - (x - cx) * math.sin(t) + (y - cy) * math.cos(t) + q['sink']
    return canvas.crop(bb), (hx - bb[0], hy - bb[1])


def main():
    sheet = Image.new('RGBA', (CW * 2, CH * 2), (0, 0, 0, 0))
    frames = []
    for row, eyes in enumerate(('shut', 'open')):
        for dog, pup in enumerate(('tidbit', 'sugarfoot')):
            im, (nx, ny) = sleeper(pup, eyes)
            w, h = max(1, round(im.width * SCALE)), max(1, round(im.height * SCALE))
            if w > CW - 4:   # never wider than a cell
                k = (CW - 4) / w
                w, h = CW - 4, round(h * k)
            small = im.resize((w, h), Image.LANCZOS)
            x0, y0 = (CW - w) // 2, CH - 4 - h
            sheet.alpha_composite(small, (dog * CW + x0, row * CH + y0))
            s = w / im.width
            hx, hy = x0 + nx * s, y0 + ny * s
            frames.append(dict(r=row, c=dog, x0=x0, x1=x0 + w, y0=y0, y1=y0 + h, hx=round(hx, 2), hy=round(hy, 2),
                               dog=dog, eyes=eyes))
    sheet.save(OUT, 'WEBP', quality=92, method=6)
    print(json.dumps({'lie': frames, 'lw': CW, 'lh': CH}, separators=(',', ':')))
    if len(sys.argv) > 1:
        prev = Image.new('RGBA', (sheet.width * 3, sheet.height * 3), (38, 32, 58, 255))
        prev.alpha_composite(sheet.resize((sheet.width * 3, sheet.height * 3), Image.LANCZOS))
        prev.convert('RGB').save(sys.argv[1])


if __name__ == '__main__':
    main()
