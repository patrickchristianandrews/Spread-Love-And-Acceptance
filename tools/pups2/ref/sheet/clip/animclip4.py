import cv2, numpy as np, math, os
from srig import render, blit, shadow
FPS = 24; N = 240; H = 272; GROUND = 600
def ease(t): return t * t * (3 - 2 * t)
def cl(x): return min(1, max(0, x))
def draw(c, name, x, by, t, flip=False, rot=None, shift=None, lean=0, expr=None, squash=(1, 1), rise=0, sh=1.0):
    pm, pad = render(name, H, rot, shift, flip, lean, expr, squash)
    if sh: shadow(c, x, by, pm.shape[1] * .36, sh)
    blit(c, pm, x, by - rise, pad)
def trot(c, name, x, by, t, flip=False, speed=3.0, expr=None, extra=None):
    ph = t * 2 * math.pi * speed; s, s2 = math.sin(ph), math.sin(ph + .35); A = 26
    rot = {'fl1': A * s, 'fl2': -A * s, 'bl1': -A * s2, 'bl2': A * s2, 'tail': 10 + 12 * math.sin(ph * .5), 'head': -3 * math.sin(2 * ph)}
    if extra: rot.update(extra)
    bob = 7 * abs(math.sin(ph)); lean = (-4 if not flip else 4)
    draw(c, name, x, by, t, flip, rot, {'head': (0, -2 * math.sin(2 * ph))}, lean, expr, rise=bob, sh=1 - bob / 40)
def idle(c, name, x, by, t, flip=False, expr=None, wag=1.0, nod=0, hop=0):
    tail = 10 * math.sin(t * 2 * math.pi * 1.6) * wag + 4; breathe = 2 * math.sin(t * 2 * math.pi * .6)
    rot = {'tail': tail, 'head': 2 * math.sin(t * 2 * math.pi * .8) + nod}
    sq = (1 - .07 * hop, 1 + .07 * hop)
    draw(c, name, x, by, t, flip, rot, {'head': (0, breathe)}, 0, expr, squash=sq, rise=hop * 48, sh=1 - hop * .45)
def turn(c, seq, x, by, t, u, expr=None):
    """seq: list of (view, flip); u in 0..1 runs through them with a squash at each swap"""
    n = len(seq); pos = u * (n - 1); i = min(n - 2, int(pos)); f = pos - i
    name, flip = seq[i] if f < .5 else seq[i + 1]
    sq = 1 - .55 * math.sin(f * math.pi); draw(c, name, x, by, t, flip, {'tail': 8}, None, 0, expr, squash=(sq, 1 + .05 * math.sin(f * math.pi)))
def zoom(c, z, cx, cy):
    if abs(z - 1) < 1e-3: return c
    M = cv2.getRotationMatrix2D((cx, cy), 0, z); return cv2.warpAffine(c, M, (c.shape[1], c.shape[0]), flags=cv2.INTER_LINEAR, borderMode=cv2.BORDER_REPLICATE)
os.makedirs('clip/out4', exist_ok=True)
TX, SX = 450, 830
for i in range(N):
    t = i / FPS; c = cv2.imread('clip/bg%04d.png' % i); z = 1.0
    if t < 2.4:                                                   # Tidbit trots in; Sugarfoot waits, tail going
        idle(c, 'sf-right', SX, GROUND, t, flip=True, wag=.6 + .4 * ease(cl((t - 1.4) / .6)))
        u = ease(cl(t / 2.4)); trot(c, 'tb-right', -170 + (TX + 170) * u, GROUND, t)
    elif t < 2.8:                                                 # Tidbit stops with a little skid and turns to Sugarfoot
        idle(c, 'sf-right', SX, GROUND, t, flip=True)
        k = (t - 2.4) / .4; draw(c, 'tb-right', TX + 6 * (1 - k), GROUND, t, squash=(1 + .12 * math.sin(k * math.pi), 1 - .08 * math.sin(k * math.pi)), rot={'tail': 14})
    elif t < 3.2:
        idle(c, 'sf-right', SX, GROUND, t, flip=True); turn(c, [('tb-right', False), ('tb-34front', False)], TX, GROUND, t, (t - 2.8) / .4)
    elif t < 3.6:                                                 # Sugarfoot turns to him
        idle(c, 'tb-34front', TX, GROUND, t, expr='tb-happy', wag=1.4); turn(c, [('sf-right', True), ('sf-34front', True)], SX, GROUND, t, (t - 3.2) / .4)
    elif t < 4.8:                                                 # hello bounces, tails going
        tt = t - 3.6; h1 = math.sin(cl(tt / .4) * math.pi) if tt < .4 else 0; h2 = math.sin(cl((tt - .25) / .4) * math.pi) if .25 <= tt < .65 else 0
        h1 = max(h1, math.sin(cl((tt - .8) / .4) * math.pi) if .8 <= tt < 1.2 else 0)
        idle(c, 'tb-34front', TX, GROUND, t, expr='tb-happy', wag=1.6, hop=h1); idle(c, 'sf-34front', SX, GROUND, t, flip=True, expr='sf-happy', wag=1.6, hop=h2)
    elif t < 6.0:                                                 # something rustles: both surprised, camera pushes in
        tt = t - 4.8; k = ease(cl(tt / .3)); pop = -14 * math.sin(cl(tt / .4) * math.pi)
        idle(c, 'tb-34front', TX, GROUND, t, expr='tb-surprised', wag=0, nod=pop * .4); idle(c, 'sf-34front', SX, GROUND, t, flip=True, expr='sf-surprised', wag=0, nod=-pop * .4)
        z = 1 + .16 * k * (1 - ease(cl((tt - .9) / .3)))
    elif t < 6.5:                                                 # relief: turn to face us, happy
        u = (t - 6.0) / .5; turn(c, [('tb-34front', False), ('tb-front', False)], TX, GROUND, t, u, expr='tb-happy'); turn(c, [('sf-34front', True), ('sf-front', False)], SX, GROUND, t, u, expr='sf-happy')
    elif t < 8.0:                                                 # sway to the music
        tt = t - 6.5; sw = math.sin(tt * 2 * math.pi * 1.1); sw2 = math.sin(tt * 2 * math.pi * 1.1 + 1.2)
        draw(c, 'tb-front', TX + 12 * sw, GROUND, t, rot={'head': 7 * sw, 'fl1': 6 * sw, 'fl2': -6 * sw}, lean=5 * sw, expr='tb-happy', rise=5 * abs(sw))
        draw(c, 'sf-front', SX - 12 * sw2, GROUND, t, rot={'head': -7 * sw2, 'fl1': -6 * sw2, 'fl2': 6 * sw2}, lean=-5 * sw2, expr='sf-happy', rise=5 * abs(sw2))
    elif t < 8.5:                                                 # turn and go
        u = (t - 8.0) / .5; turn(c, [('tb-front', False), ('tb-34front', True), ('tb-right', False)], TX, GROUND, t, u); turn(c, [('sf-front', False), ('sf-34front', False), ('sf-right', False)], SX, GROUND, t, u)
    else:                                                         # trot off together
        u = ease(cl((t - 8.5) / 2.4)); trot(c, 'tb-right', TX + (1500 - TX) * u, GROUND, t); trot(c, 'sf-right', SX + (1750 - SX) * u, GROUND, t + .17)
    c = zoom(c, z, 640, 540)
    cv2.imwrite('clip/out4/f%04d.png' % i, c)
print('frames done')
