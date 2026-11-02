"""Puppet rig for the two painted pups: head, tail and a front leg as separate layers cut along the painting,
with feathered joints and an inpainted stump under each part, so small rotations give new poses without seams."""
import cv2, numpy as np, math
R = '/home/user/Spread-Love-And-Acceptance/tools/pups2/ref/'

def poly_mask(shape, pts, feather):
    m = np.zeros(shape[:2], np.uint8); cv2.fillPoly(m, [np.array(pts, np.int32)], 255)
    return cv2.GaussianBlur(m.astype(np.float32) / 255, (0, 0), feather) if feather else m.astype(np.float32) / 255

class Pup:
    """smooth puppet warp: each part has a weight map (1 in the part, fading to 0 across the joint); a pose rotates and
    shifts every pixel by its weight, so the joint stretches instead of showing a cut"""
    def __init__(self, name, ref, mask, parts, headh):
        self.name = name
        img = cv2.imread(R + ref); a = cv2.imread(R + mask, 0)
        rgba = cv2.cvtColor(img, cv2.COLOR_BGR2BGRA); rgba[..., 3] = a
        ys, xs = np.where(a > 0); self.oy, self.ox = ys.min(), xs.min()
        PAD = 160; self.oy -= PAD; self.ox -= PAD
        self.img = cv2.copyMakeBorder(rgba[ys.min():ys.max() + 1, xs.min():xs.max() + 1], PAD, PAD, PAD, PAD, cv2.BORDER_CONSTANT, value=(0, 0, 0, 0)).astype(np.float32)
        self.H, self.W = self.img.shape[:2]; self.headh = headh
        self.weights = {}; self.pivots = {}
        for pname, (pts, pivot, feather, keep) in parts.items():
            pts = [(x - self.ox, y - self.oy) for x, y in pts]
            self.pivots[pname] = (float(pivot[0] - self.ox), float(pivot[1] - self.oy))
            self.weights[pname] = poly_mask(self.img.shape, pts, feather)
    def pose(self, rot=None, shift=None, order=None):
        rot = rot or {}; shift = shift or {}
        yy, xx = np.mgrid[0:self.H, 0:self.W].astype(np.float32)
        sx, sy = xx.copy(), yy.copy()
        for pname in rot.keys() | shift.keys():
            w = self.weights[pname]; px, py = self.pivots[pname]; th = math.radians(rot.get(pname, 0)) * w
            dx, dy = shift.get(pname, (0, 0))
            # inverse map: where does this output pixel come from
            cx, cy = sx - px - dx * w, sy - py - dy * w
            c, s_ = np.cos(th), np.sin(th)
            sx, sy = px + c * cx - s_ * cy, py + s_ * cx + c * cy
        out = cv2.remap(self.img, sx, sy, cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
        ys, xs = np.where(out[..., 3] > 2); out = out[ys.min():ys.max() + 1, xs.min():xs.max() + 1]
        pm = out.copy(); pm[..., :3] *= pm[..., 3:4] / 255
        return pm

TB = Pup('tb', 'tidbit-ref.png', 'tb-mask.png', {
    'head': ([(300, 40), (870, 40), (870, 340), (900, 470), (980, 470), (980, 660), (740, 665), (600, 612), (470, 572), (300, 530)], (640, 612), 34, 0),
    'tail': ([(1085, 40), (1420, 40), (1420, 300), (1300, 430), (1180, 452), (1095, 430)], (1150, 400), 22, 0),
    'leg':  ([(540, 820), (720, 800), (740, 1086), (520, 1086)], (630, 830), 22, 0),
}, 470.0)
SF = Pup('sf', 'sugarfoot-ref.png', 'sf-mask.png', {
    'head': ([(360, 40), (1130, 40), (1130, 470), (1050, 560), (970, 700), (830, 722), (700, 722), (600, 692), (500, 622), (420, 522), (360, 440)], (760, 640), 36, 0),
    'paw':  ([(470, 792), (770, 788), (785, 1081), (460, 1081)], (620, 800), 22, 0),
}, 590.0)
PUPS = {'tb': TB, 'sf': SF}

POSES = {
    'tb': {
        'standing':     dict(),
        'looking up':   dict(rot={'head': 11, 'tail': 10}),
        'sniffing':     dict(rot={'head': -17, 'tail': -22}, shift={'head': (0, 14)}),
        'paw up':       dict(rot={'leg': 36, 'head': 7, 'tail': 6}, shift={'leg': (0, -20)}),
        'tail wag':     dict(rot={'tail': -12, 'head': 4}),
        'alert':        dict(rot={'head': 6, 'tail': 18}, shift={'head': (0, -8)}),
    },
    'sf': {
        'lying':        dict(),
        'head tilt left':  dict(rot={'head': 10}),
        'head tilt right': dict(rot={'head': -10}),
        'paw up':       dict(rot={'paw': 48, 'head': 5}, shift={'paw': (-10, -55)}),
        'resting':      dict(rot={'head': -4}, shift={'head': (0, 26)}),
        'perked up':    dict(shift={'head': (0, -22)}, rot={'head': 3}),
    },
}

def sprite(who, pose_name, headh, flip=False, lean=0):
    pup = PUPS[who]; pm = pup.pose(**POSES[who][pose_name])
    s = headh / pup.headh
    pm = cv2.resize(pm, None, fx=s, fy=s, interpolation=cv2.INTER_AREA if s < 1 else cv2.INTER_CUBIC)
    if flip: pm = cv2.flip(pm, 1)
    if lean:
        h, w = pm.shape[:2]; M = cv2.getRotationMatrix2D((w / 2, h), lean, 1); cos, sin = abs(M[0, 0]), abs(M[0, 1])
        nw, nh = int(w * cos + h * sin), int(h * cos + w * sin); M[0, 2] += nw / 2 - w / 2; M[1, 2] += nh - h
        pm = cv2.warpAffine(pm, M, (nw, nh), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))
    return pm

def blit(c, pm, cx, by):
    h, w = pm.shape[:2]; x, y = int(round(cx - w / 2)), int(round(by - h)); H, W = c.shape[:2]
    x0, y0, x1, y1 = max(0, x), max(0, y), min(W, x + w), min(H, y + h)
    if x1 <= x0 or y1 <= y0: return
    sp = pm[y0 - y:y1 - y, x0 - x:x1 - x]; a = sp[..., 3:4] / 255.0
    if c.shape[2] == 4:
        c[y0:y1, x0:x1, :3] = np.clip(sp[..., :3] + c[y0:y1, x0:x1, :3] * (1 - a), 0, 255).astype(np.uint8)
        c[y0:y1, x0:x1, 3] = np.clip(sp[..., 3] + c[y0:y1, x0:x1, 3] * (1 - a[..., 0]), 0, 255).astype(np.uint8)
    else: c[y0:y1, x0:x1] = np.clip(sp[..., :3] + c[y0:y1, x0:x1] * (1 - a), 0, 255).astype(np.uint8)

def shadow(c, cx, by, w, h):
    ov = c.copy(); cv2.ellipse(ov, (int(cx), int(by) - 3), (int(w), int(h)), 0, 0, 360, (40, 30, 20), -1); cv2.addWeighted(ov, .18, c, .82, 0, c)

if __name__ == '__main__':
    for who in ('tb', 'sf'):
        tiles = []
        for name in POSES[who]:
            pm = sprite(who, name, 300); bg = np.full((pm.shape[0], pm.shape[1], 3), (235, 240, 245), np.float32)
            a = pm[..., 3:4] / 255; im = (pm[..., :3] + bg * (1 - a)).astype(np.uint8)
            im = cv2.copyMakeBorder(im, 0, 0, 10, 10, cv2.BORDER_CONSTANT, value=(235, 240, 245))
            lab = np.full((30, im.shape[1], 3), 255, np.uint8); cv2.putText(lab, name, (6, 22), cv2.FONT_HERSHEY_DUPLEX, .6, (50, 50, 50), 1, cv2.LINE_AA)
            tiles.append(np.vstack([im, lab]))
        h = max(t.shape[0] for t in tiles)
        tiles = [cv2.copyMakeBorder(t, 0, h - t.shape[0], 0, 0, cv2.BORDER_CONSTANT, value=(255, 255, 255)) for t in tiles]
        cv2.imwrite('poses-%s.png' % who, cv2.hconcat(tiles))
    print('ok')
