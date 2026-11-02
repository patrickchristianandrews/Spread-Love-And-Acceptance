import cv2, numpy as np, math, subprocess, os
from pups import spr_of, blit, shadow
FPS = 24; N = 240
def ease(t): return t * t * (3 - 2 * t)
def body_head(who, headh, flip, rot=0, head_tilt=0):
    """one sprite, but the head region gets its own small tilt so the pup is not a rigid cardboard cut-out"""
    pm = spr_of(who, headh, flip, rot)
    if False:
        h, w = pm.shape[:2]
        hx0, hx1 = (0, int(w * .55)) if (who == 'tb') == (not flip) else (int(w * .45), w)
        if who == 'sf': hx0, hx1 = int(w * .12), int(w * .88)
        hy1 = int(h * (.62 if who == 'tb' else .78))
        head = pm[0:hy1, hx0:hx1].copy()
        cx, cy = (hx1 - hx0) / 2, hy1
        M = cv2.getRotationMatrix2D((cx, cy), head_tilt, 1)
        head = cv2.warpAffine(head, M, (hx1 - hx0, hy1), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))
        pm[0:hy1, hx0:hx1] = head
    return pm
os.makedirs('clip/out', exist_ok=True)
for i in range(N):
    t = i / FPS
    c = cv2.imread('clip/bg%04d.png' % i)
    # ---- Tidbit: trots in from the left (0-3 s), stops by the bone, looks at Sugarfoot, hops twice (6-8 s), settles
    if t < 3.2:
        u = ease(t / 3.2); x = -140 + u * (470 + 140); step = math.sin(t * 2 * math.pi * 3.2)
        bob = abs(step) * 10; lean = -6 + step * 3; tilt = step * 2.5
        tb = body_head('tb', 118, False, lean, tilt); blit(c, tb, x, 600 - bob); shadow(c, x, 600, 95 * (1 - bob / 60), 9)
    else:
        x = 470; tt = t - 3.2
        hop = 0
        for h0 in (3.0, 3.55):
            if h0 <= tt < h0 + .45: hop = max(hop, 46 * math.sin((tt - h0) / .45 * math.pi))
        idle = math.sin(tt * 2 * math.pi * 0.9) * 2
        look = 6 * ease(min(1, max(0, (tt - .4) / .5))) - 6 * ease(min(1, max(0, (tt - 5.2) / .6)))
        shadow(c, x, 600, 95 * (1 - hop / 90), 9)
        tb = body_head('tb', 118, False, idle * .6 - (hop / 46) * 5, look + idle); blit(c, tb, x, 600 - hop)
    # ---- Sugarfoot: lying by the doghouse, perks up when Tidbit arrives (3.4 s), wiggles, then settles
    sx = 800
    perk = ease(min(1, max(0, (t - 3.4) / .5))) * (1 - .35 * ease(min(1, max(0, (t - 7.5) / 1.2))))
    wig = math.sin(t * 2 * math.pi * 2.6) * 2.2 * perk * (1 if t < 7.5 else .4)
    breathe = math.sin(t * 2 * math.pi * .45) * 1.5
    sf = body_head('sf', 118, True, wig * .5, -8 * perk + wig + breathe * .5)
    shadow(c, sx, 600, 100, 9); blit(c, sf, sx, 600 + breathe - 10 * perk)
    cv2.imwrite('clip/out/f%04d.png' % i, c)
print('frames done')
