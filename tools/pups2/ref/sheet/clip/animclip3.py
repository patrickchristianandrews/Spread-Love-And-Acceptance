import cv2, numpy as np, math, os
S = '/home/user/Spread-Love-And-Acceptance/tools/pups2/ref/sheet/'
FPS = 24; N = 240; H = 300
_cache = {}
def spr(n, height, flip=False):
    k = (n, height, flip)
    if k in _cache: return _cache[k]
    im = cv2.imread(S + n + '.png', cv2.IMREAD_UNCHANGED).astype(np.float32); a = im[..., 3:4] / 255
    pm = np.dstack([im[..., :3] * a, im[..., 3:4]]); s = height / im.shape[0]
    pm = cv2.resize(pm, None, fx=s, fy=s, interpolation=cv2.INTER_AREA if s < 1 else cv2.INTER_CUBIC)
    if flip: pm = cv2.flip(pm, 1)
    _cache[k] = pm; return pm
def lean(pm, deg):
    if not deg: return pm
    h, w = pm.shape[:2]; M = cv2.getRotationMatrix2D((w / 2, h), deg, 1); cos, sin = abs(M[0, 0]), abs(M[0, 1])
    nw, nh = int(w * cos + h * sin), int(h * cos + w * sin); M[0, 2] += nw / 2 - w / 2; M[1, 2] += nh - h
    return cv2.warpAffine(pm, M, (nw, nh), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))
def squash(pm, sx, sy):
    h, w = pm.shape[:2]; return cv2.resize(pm, (max(1, int(w * sx)), max(1, int(h * sy))), interpolation=cv2.INTER_LINEAR)
def blit(c, pm, cx, by, alpha=1.0):
    h, w = pm.shape[:2]; x, y = int(round(cx - w / 2)), int(round(by - h)); Hh, Ww = c.shape[:2]
    x0, y0, x1, y1 = max(0, x), max(0, y), min(Ww, x + w), min(Hh, y + h)
    if x1 <= x0 or y1 <= y0: return
    sp = pm[y0 - y:y1 - y, x0 - x:x1 - x] * alpha; a = sp[..., 3:4] / 255
    c[y0:y1, x0:x1] = np.clip(sp[..., :3] + c[y0:y1, x0:x1] * (1 - a), 0, 255).astype(np.uint8)
def shadow(c, cx, by, w, k=1.0):
    ov = c.copy(); cv2.ellipse(ov, (int(cx), int(by) - 3), (int(w * k), 9), 0, 0, 360, (40, 30, 20), -1); cv2.addWeighted(ov, .18 * k, c, 1 - .18 * k, 0, c)
def ease(t): return t * t * (3 - 2 * t)
def cl(x): return min(1, max(0, x))
def walk(c, who, view, x, by, t, speed=3.2, flip=False):
    """trot: body bob, slight lean, squash on each step"""
    ph = math.sin(t * 2 * math.pi * speed); bob = abs(ph) * 9
    pm = squash(lean(spr(who + '-' + view, H, flip), ph * 2.5 * (-1 if flip else 1)), 1 + .02 * abs(ph), 1 - .02 * abs(ph))
    shadow(c, x, by, pm.shape[1] * .42, 1 - bob / 50); blit(c, pm, x, by - bob)
def stand(c, who, view, x, by, t, flip=False, hop=0, breathe=True, sh=True):
    pm = spr(who + '-' + view, H, flip)
    if hop: pm = squash(pm, 1 - .06 * hop, 1 + .06 * hop)
    b = math.sin(t * 2 * math.pi * .7) * 1.5 if breathe else 0
    if sh: shadow(c, x, by, pm.shape[1] * .42, 1 - hop * .5)
    blit(c, pm, x, by - hop * 44 + b)
def turn(c, who, a, b_, x, by, t, u, flip_a=False, flip_b=False):
    """a quick turn between two views: squash through the middle with a crossfade"""
    pa, pb = spr(who + '-' + a, H, flip_a), spr(who + '-' + b_, H, flip_b)
    k = ease(u); sq = 1 - .25 * math.sin(u * math.pi)
    shadow(c, x, by, max(pa.shape[1], pb.shape[1]) * .4)
    blit(c, squash(pa, sq, 1 + .04 * math.sin(u * math.pi)), x, by, 1 - k); blit(c, squash(pb, sq, 1 + .04 * math.sin(u * math.pi)), x, by, k)
def pup_at(c, who, t, X0, X1, t0, t1, view, by=600, flip=False):
    u = ease(cl((t - t0) / (t1 - t0))); x = X0 + (X1 - X0) * u; walk(c, who, view, x, by, t, flip=flip); return x
os.makedirs('clip/out3', exist_ok=True)
for i in range(N):
    t = i / FPS; c = cv2.imread('clip/bg%04d.png' % i)
    # ---------- Sugarfoot (right side, by the doghouse) ----------
    SX = 830
    # ---------- Tidbit ----------
    TX = 440
    if t < 4.3:                                       # 0 to 2.6: Tidbit trots in from the left; Sugarfoot waits, facing him
        if t < 2.6:
            stand(c, 'sf', 'left', SX, 600, t)
            pup_at(c, 'tb', t, -160, TX, 0, 2.6, 'right')
        elif t < 3.1:                                 # 2.6 to 3.1: Tidbit turns to 3/4 front at the bone
            stand(c, 'sf', 'left', SX, 600, t); turn(c, 'tb', 'right', '34front', TX, 600, t, (t - 2.6) / .5)
        elif t < 3.6:                                 # Sugarfoot turns to 3/4 front too
            stand(c, 'tb', '34front', TX, 600, t); turn(c, 'sf', 'left', '34front', SX, 600, t, (t - 3.1) / .5, flip_b=True)
        else:                                         # 3.6 to 4.3: both bounce
            hop_t = (t - 3.6) % .7; hop = math.sin(hop_t / .35 * math.pi) if hop_t < .35 else 0
            stand(c, 'tb', '34front', TX, 600, t, hop=hop); stand(c, 'sf', '34front', SX, 600, t, flip=True, hop=max(0, math.sin((hop_t - .1) / .35 * math.pi)) if .1 <= hop_t < .45 else 0)
    elif t < 5.6:                                     # 4.3 to 5.6: reaction cut, surprised faces pop in
        k = ease(cl((t - 4.3) / .25)); pop = 1 + .08 * math.sin(cl((t - 4.3) / .35) * math.pi)
        fa, fb = spr('tb-surprised', 270), spr('sf-surprised', 270)
        blit(c, squash(fa, k * pop, k * pop), 430, 560, k); blit(c, squash(fb, k * pop, k * pop), 850, 560, k)
    elif t < 7.6:                                     # 5.6 to 7.6: both turn to face us and sway to the music
        if t < 6.1:
            turn(c, 'tb', '34front', 'front', TX, 600, t, (t - 5.6) / .5); turn(c, 'sf', '34front', 'front', SX, 600, t, (t - 5.6) / .5, flip_a=True)
        else:
            sw = math.sin((t - 6.1) * 2 * math.pi * 1.1)
            pa = lean(spr('tb-front', H), sw * 5); pb = lean(spr('sf-front', H), -sw * 5)
            shadow(c, TX, 600, pa.shape[1] * .42); shadow(c, SX, 600, pb.shape[1] * .42)
            blit(c, pa, TX + sw * 10, 600 - abs(sw) * 6); blit(c, pb, SX - sw * 10, 600 - abs(sw) * 6)
    else:                                             # 7.6 to 10: turn right and trot off together
        if t < 8.1:
            turn(c, 'tb', 'front', 'right', TX, 600, t, (t - 7.6) / .5); turn(c, 'sf', 'front', 'right', SX, 600, t, (t - 7.6) / .5)
        else:
            pup_at(c, 'tb', t, TX, 1500, 8.1, 10.4, 'right'); pup_at(c, 'sf', t, SX, 1750, 8.1, 10.4, 'right')
    cv2.imwrite('clip/out3/f%04d.png' % i, c)
print('frames done')
