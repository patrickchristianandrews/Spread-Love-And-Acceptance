import cv2, numpy as np, math, os
from rig import PUPS, blit, shadow
FPS = 24; N = 240
def ease(t): return t * t * (3 - 2 * t)
def clamp01(x): return min(1, max(0, x))
def sp(who, headh, flip=False, lean=0, **pose):
    pup = PUPS[who]; pm = pup.pose(**pose); s = headh / pup.headh
    pm = cv2.resize(pm, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
    if flip: pm = cv2.flip(pm, 1)
    if lean:
        h, w = pm.shape[:2]; M = cv2.getRotationMatrix2D((w / 2, h), lean, 1); cos, sin = abs(M[0, 0]), abs(M[0, 1])
        nw, nh = int(w * cos + h * sin), int(h * cos + w * sin); M[0, 2] += nw / 2 - w / 2; M[1, 2] += nh - h
        pm = cv2.warpAffine(pm, M, (nw, nh), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))
    return pm
os.makedirs('clip/out2', exist_ok=True)
for i in range(N):
    t = i / FPS; c = cv2.imread('clip/bg%04d.png' % i)
    # Tidbit: trots in sniffing the ground (head down, tail swinging), stops at the bone, looks up at Sugarfoot, lifts a paw, hops, tail wags
    if t < 3.2:
        u = ease(t / 3.2); x = -140 + u * 610; step = math.sin(t * 2 * math.pi * 3.2); bob = abs(step) * 10
        head = -14 + 6 * math.sin(t * 2 * math.pi * 1.6); tail = -10 + 14 * math.sin(t * 2 * math.pi * 3.2); leg = 10 * step
        shadow(c, x, 600, 95 * (1 - bob / 60), 9); blit(c, sp('tb', 118, False, -6 + step * 3, rot={'head': head, 'tail': tail, 'leg': leg}), x, 600 - bob)
    else:
        x = 470; tt = t - 3.2
        up = ease(clamp01((tt - .3) / .6))                      # head comes up to look at Sugarfoot
        paw = ease(clamp01((tt - 1.2) / .4)) * (1 - ease(clamp01((tt - 2.3) / .4)))   # paw up for a second
        hop = 0
        for h0 in (3.0, 3.55):
            if h0 <= tt < h0 + .45: hop = max(hop, 46 * math.sin((tt - h0) / .45 * math.pi))
        wag = 22 * math.sin(tt * 2 * math.pi * 3.0) * ease(clamp01((tt - 2.6) / .4))
        head = -14 * (1 - up) + 9 * up + (hop / 46) * 6; idle = math.sin(tt * 2 * math.pi * .9)
        shadow(c, x, 600, 95 * (1 - hop / 90), 9)
        blit(c, sp('tb', 118, False, idle * .6 - (hop / 46) * 5, rot={'head': head + idle, 'tail': wag + 8 * up, 'leg': 36 * paw}, shift={'leg': (0, -20 * paw)}), x, 600 - hop)
    # Sugarfoot: resting, perks up when Tidbit arrives, tilts her head, lifts a paw to say hi, settles
    sx = 800
    perk = ease(clamp01((t - 3.4) / .5)); tilt = 10 * math.sin((t - 3.9) * 2 * math.pi * .5) * ease(clamp01((t - 3.9) / .6)) * (1 - .5 * ease(clamp01((t - 8) / 1)))
    paw = ease(clamp01((t - 5.0) / .5)) * (1 - ease(clamp01((t - 6.6) / .5)))
    breathe = math.sin(t * 2 * math.pi * .45) * 1.5
    shadow(c, sx, 600, 100, 9)
    blit(c, sp('sf', 118, True, 0, rot={'head': tilt + 3 * perk, 'paw': 48 * paw}, shift={'head': (0, 24 * (1 - perk) - 10 * perk + breathe), 'paw': (-10 * paw, -55 * paw)}), sx, 600 + breathe)
    cv2.imwrite('clip/out2/f%04d.png' % i, c)
print('frames done')
