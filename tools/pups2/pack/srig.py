"""Warp rig for the turnaround-sheet sprites: head, tail and legs get weight maps; a pose rotates each by its weight,
so joints bend smoothly. Also a head swap for the expression faces."""
import cv2, numpy as np, math
S = '/home/user/Spread-Love-And-Acceptance/tools/pups2/ref/sheet/'
PAD = 60

def poly_w(shape, pts, feather):
    m = np.zeros(shape[:2], np.uint8); cv2.fillPoly(m, [np.array(pts, np.int32)], 255)
    return cv2.GaussianBlur(m.astype(np.float32) / 255, (0, 0), feather)

class Sprite:
    def __init__(self, name, parts, face=None, cutlegs=None):
        im = cv2.imread(S + name + '.png', cv2.IMREAD_UNCHANGED)
        self.img = cv2.copyMakeBorder(im, PAD, PAD, PAD, PAD, cv2.BORDER_CONSTANT, value=(0, 0, 0, 0)).astype(np.float32)
        self.H, self.W = self.img.shape[:2]; self.base_h = im.shape[0]
        self.w = {}; self.pv = {}
        for p, (pts, pivot, feather) in parts.items():
            self.w[p] = poly_w(self.img.shape, [(x + PAD, y + PAD) for x, y in pts], feather)
            self.pv[p] = (pivot[0] + PAD, pivot[1] + PAD)
        self.face = face   # (cx, cy, width) of the head on this body, for expression swaps
        self.cutlegs = cutlegs   # (belly_y, {leg: (x0, x1, pivot_y)}) for side views: legs swing as cut layers
        yy, xx = np.mgrid[0:self.H, 0:self.W].astype(np.float32); self.yy, self.xx = yy, xx
    def pose(self, rot=None, shift=None):
        rot = rot or {}; shift = shift or {}
        sx, sy = self.xx.copy(), self.yy.copy()
        for p in set(rot) | set(shift):
            if p not in self.w: continue
            w = self.w[p]; px, py = self.pv[p]; th = math.radians(rot.get(p, 0)) * w; dx, dy = shift.get(p, (0, 0))
            cx, cy = sx - px - dx * w, sy - py - dy * w; c, s_ = np.cos(th), np.sin(th)
            sx, sy = px + c * cx - s_ * cy, py + s_ * cx + c * cy
        im = cv2.remap(self.img, sx, sy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
        if not self.cutlegs: return im
        belly, legs = self.cutlegs; belly += PAD
        yy, xx = self.yy, self.xx
        torso = im.copy(); span = (xx > 25 + PAD) & (xx < self.W - 25 - PAD)
        torso[..., 3] *= np.where(span, np.clip((belly + 6 - yy) / 6, 0, 1), 1)
        out = np.zeros_like(im)
        def over(dst, src):
            a = src[..., 3:4] / 255; dst[..., :3] = src[..., :3] * a + dst[..., :3] * (1 - a); dst[..., 3:4] = src[..., 3:4] + dst[..., 3:4] * (1 - a)
        order = ['bl2', 'fl2', 'torso', 'bl1', 'fl1']
        for p in order:
            if p == 'torso': over(out, torso); continue
            pts, (px, py) = legs[p]; px += PAD; py += PAD
            m = poly_w(im.shape, [(x + PAD, y + PAD) for x, y in pts], 1.2) * np.clip((yy - (belly - 22)) / 16, 0, 1)
            leg = im.copy(); leg[..., 3] *= m
            ang = rot.get(p, 0)
            if ang:
                M = cv2.getRotationMatrix2D((px, py), ang, 1)
                leg = cv2.warpAffine(leg, M, (self.W, self.H), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))
            over(out, leg)
        return out

FACES = {}
def face(name):
    if name not in FACES:
        im = cv2.imread(S + name + '.png', cv2.IMREAD_UNCHANGED).astype(np.float32)
        dark = ((im[..., :3].max(axis=2) < 90) & (im[..., 3] > 0)).astype(np.uint8)
        for y in range(im.shape[0] - 1, im.shape[0] - 30, -1):          # a long straight dark run near the bottom is the phone's bar
            runs = np.diff(np.concatenate([[0], dark[y], [0]])); starts = np.where(runs == 1)[0]; ends = np.where(runs == -1)[0]
            if len(starts) and (ends - starts).max() > im.shape[1] * .5: im[y - 2:, :, 3] = 0; break
        FACES[name] = im
    return FACES[name]

LEGS4 = lambda f1, f2, b1, b2, ytop, ybot, py: {
    'fl1': ([(f1[0], ytop), (f1[1], ytop), (f1[1], ybot), (f1[0], ybot)], ((f1[0] + f1[1]) / 2, py), 9),
    'fl2': ([(f2[0], ytop), (f2[1], ytop), (f2[1], ybot), (f2[0], ybot)], ((f2[0] + f2[1]) / 2, py), 9),
    'bl1': ([(b1[0], ytop), (b1[1], ytop), (b1[1], ybot), (b1[0], ybot)], ((b1[0] + b1[1]) / 2, py), 9),
    'bl2': ([(b2[0], ytop), (b2[1], ytop), (b2[1], ybot), (b2[0], ybot)], ((b2[0] + b2[1]) / 2, py), 9)}

RIGS = {
    'tb-right': dict(parts={'head': ([(190, -60), (400, -60), (400, 160), (250, 175), (205, 165), (185, 120)], (215, 130), 18),
                            'tail': ([(-60, -60), (122, -60), (122, 98), (108, 124), (-60, 110)], (104, 122), 10)},
                     cutlegs=(166, {'fl1': ([(194, 140), (250, 140), (272, 260), (180, 260)], (222, 152)), 'fl2': ([(248, 140), (308, 140), (278, 226), (250, 226)], (276, 152)),
                                    'bl1': ([(62, 140), (120, 140), (98, 260), (45, 260)], (90, 155)), 'bl2': ([(16, 140), (68, 140), (45, 260), (-6, 260)], (42, 155))})),
    'sf-right': dict(parts={'head': ([(185, -60), (400, -60), (400, 205), (255, 215), (205, 190), (180, 130)], (215, 150), 20),
                            'tail': ([(-60, -60), (130, -60), (130, 100), (118, 128), (100, 140), (-60, 122)], (110, 132), 10)},
                     cutlegs=(192, {'fl1': ([(196, 170), (252, 170), (262, 260), (176, 260)], (224, 180)), 'fl2': ([(250, 170), (312, 170), (282, 228), (254, 228)], (280, 180)),
                                    'bl1': ([(70, 170), (132, 170), (116, 260), (70, 260)], (100, 182)), 'bl2': ([(30, 170), (82, 170), (72, 260), (26, 260)], (56, 182))})),
    'tb-34front': dict(parts={'head': ([(-60, -60), (190, -60), (190, 140), (140, 200), (60, 200), (-60, 150)], (105, 160), 18),
                              'tail': ([(150, -60), (300, -60), (300, 120), (150, 130)], (160, 120), 12),
                              **LEGS4((85, 132), (132, 180), (8, 85), (180, 260), 195, 340, 202)}, face=(104, 96, 178)),
    'sf-34front': dict(parts={'head': ([(-60, -60), (200, -60), (200, 150), (150, 210), (60, 215), (-60, 160)], (110, 170), 20),
                              'tail': ([(175, -60), (320, -60), (320, 130), (175, 150)], (185, 120), 12),
                              **LEGS4((70, 130), (130, 190), (10, 70), (190, 300), 200, 340, 206)}, face=(112, 104, 205)),
    'tb-front': dict(parts={'head': ([(-60, -60), (210, -60), (210, 120), (120, 150), (30, 150), (-60, 120)], (75, 130), 16),
                            'fl1': ([(10, 190), (75, 190), (75, 320), (10, 320)], (45, 196), 9), 'fl2': ([(75, 190), (140, 190), (140, 320), (75, 320)], (105, 196), 9)}, face=(75, 74, 160)),
    'sf-front': dict(parts={'head': ([(-60, -60), (240, -60), (240, 130), (140, 170), (35, 170), (-60, 130)], (86, 150), 18),
                            'fl1': ([(20, 200), (86, 200), (86, 320), (20, 320)], (55, 205), 9), 'fl2': ([(86, 200), (155, 200), (155, 320), (86, 320)], (118, 205), 9)}, face=(86, 90, 190)),
}
SP = {}
def sprite(name):
    if name not in SP: SP[name] = Sprite(name, **RIGS[name])
    return SP[name]

def render(name, height, rot=None, shift=None, flip=False, lean=0, expr=None, squash=(1, 1)):
    """returns premultiplied RGBA float; expr = face sprite name to swap onto the head"""
    sp = sprite(name); im = sp.pose(rot, shift)
    if expr and sp.face:
        fx, fy, fw = sp.face; f = face(expr); s = fw / f.shape[1]
        f = cv2.resize(f, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
        # the head also turned by the head rotation / shift: follow it
        hr = math.radians((rot or {}).get('head', 0)); dx, dy = (shift or {}).get('head', (0, 0))
        px, py = sp.pv['head']; cx, cy = fx + PAD, fy + PAD
        rx = px + (cx - px) * math.cos(hr) - (cy - py) * math.sin(hr) + dx; ry = py + (cx - px) * math.sin(hr) + (cy - py) * math.cos(hr) + dy
        if hr:
            h, w = f.shape[:2]; M = cv2.getRotationMatrix2D((w / 2, h / 2), -math.degrees(hr), 1)
            f = cv2.warpAffine(f, M, (w, h), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))
        h, w = f.shape[:2]; x0, y0 = int(rx - w / 2), int(ry - h / 2)
        erase = np.clip((sp.w['head'] - .45) / .15, 0, 1) * np.clip((y0 + h - 34 - sp.yy) / 12, 0, 1)   # painted head off, fading in above the face's chin
        im[..., 3] *= (1 - erase)
        f = f.copy(); f[..., 3] *= np.clip((h - 1 - np.arange(h)) / 28.0, 0, 1)[:, None]                  # the face's flat bottom fades into the chest
        X0, Y0, X1, Y1 = max(0, x0), max(0, y0), min(sp.W, x0 + w), min(sp.H, y0 + h)
        ff = f[Y0 - y0:Y1 - y0, X0 - x0:X1 - x0]; a = ff[..., 3:4] / 255
        im[Y0:Y1, X0:X1, :3] = ff[..., :3] * a + im[Y0:Y1, X0:X1, :3] * (1 - a)
        im[Y0:Y1, X0:X1, 3:4] = ff[..., 3:4] + im[Y0:Y1, X0:X1, 3:4] * (1 - a)
    a = im[..., 3:4] / 255; pm = np.dstack([im[..., :3] * a, im[..., 3:4]])
    s = height / sp.base_h
    pm = cv2.resize(pm, None, fx=s * squash[0], fy=s * squash[1], interpolation=cv2.INTER_AREA if s < 1 else cv2.INTER_CUBIC)
    if flip: pm = cv2.flip(pm, 1)
    if lean:
        h, w = pm.shape[:2]; M = cv2.getRotationMatrix2D((w / 2, h - PAD * s), lean, 1)
        pm = cv2.warpAffine(pm, M, (w, h), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))
    return pm, PAD * s * squash[1]      # the bottom padding, so callers can place feet on the ground

def blit(c, pm, cx, by, pad=0):
    h, w = pm.shape[:2]; x, y = int(round(cx - w / 2)), int(round(by - h + pad)); H, W = c.shape[:2]
    x0, y0, x1, y1 = max(0, x), max(0, y), min(W, x + w), min(H, y + h)
    if x1 <= x0 or y1 <= y0: return
    sp = pm[y0 - y:y1 - y, x0 - x:x1 - x]; a = sp[..., 3:4] / 255
    c[y0:y1, x0:x1] = np.clip(sp[..., :3] + c[y0:y1, x0:x1] * (1 - a), 0, 255).astype(np.uint8)

def shadow(c, cx, by, w, k=1.0):
    ov = c.copy(); cv2.ellipse(ov, (int(cx), int(by) - 3), (int(w * k), 9), 0, 0, 360, (40, 30, 20), -1); cv2.addWeighted(ov, .18 * k, c, 1 - .18 * k, 0, c)

if __name__ == '__main__':
    tests = [('tb-right', dict(rot={'fl1': 22, 'fl2': -22, 'bl1': -22, 'bl2': 22, 'tail': 15, 'head': -5})),
             ('sf-right', dict(rot={'fl1': 22, 'fl2': -22, 'bl1': -22, 'bl2': 22, 'tail': -15, 'head': 5})),
             ('tb-34front', dict(expr='tb-happy', rot={'head': 6})), ('sf-34front', dict(expr='sf-surprised')),
             ('tb-front', dict(expr='tb-surprised', rot={'head': -8})), ('sf-front', dict(expr='sf-happy', rot={'head': 8}))]
    tiles = []
    for n, kw in tests:
        pm, pad = render(n, 300, **kw); bg = np.full((pm.shape[0], pm.shape[1], 3), (235, 240, 245), np.float32)
        a = pm[..., 3:4] / 255; im = (pm[..., :3] + bg * (1 - a)).astype(np.uint8)
        tiles.append(cv2.copyMakeBorder(im, 0, max(0, 460 - im.shape[0]), 0, 10, cv2.BORDER_CONSTANT, value=(255, 255, 255))[:460])
    cv2.imwrite('srig-test.png', cv2.hconcat(tiles)); print('ok')
