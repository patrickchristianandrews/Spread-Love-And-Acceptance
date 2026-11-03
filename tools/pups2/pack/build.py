"""Builds assets/img/pups from the turnaround sheet cut-outs (tools/pups2/ref/sheet) in one consistent pass:
clean muzzles, layers (legs, tail, head, body) for the right, left and 3/4 front views, eyes and mouth anchors, 2x upscale,
then the 3/4 front mirror. Run: python3 tools/pups2/pack/build.py"""
import cv2, numpy as np, os, json, sys, shutil, subprocess
HERE = os.path.dirname(os.path.abspath(__file__)); ROOT = os.path.abspath(os.path.join(HERE, '..', '..', '..'))
sys.path.insert(0, HERE); import srig
SHEET = os.path.join(ROOT, 'tools', 'pups2', 'ref', 'sheet') + os.sep; WORK = os.path.join(HERE, 'work') + os.sep; OUT = os.path.join(ROOT, 'assets', 'img', 'pups') + os.sep
os.makedirs(WORK, exist_ok=True); os.makedirs(OUT, exist_ok=True); srig.S = SHEET; PAD = srig.PAD

def clean_mouth(name, zone, only_dark=True):
    im = cv2.imread(SHEET + name + '.png', cv2.IMREAD_UNCHANGED); bgr = im[..., :3].copy(); a = im[..., 3]
    hsv = cv2.cvtColor(bgr, cv2.COLOR_BGR2HSV); V = hsv[..., 2].astype(int); Sx = hsv[..., 1].astype(int); H = hsv[..., 0].astype(int)
    z = np.zeros(a.shape, np.uint8); cv2.ellipse(z, zone[:2], zone[2:], 0, 0, 360, 1, -1)
    if only_dark:
        m = (((V < 95) | (((H < 14) | (H > 158)) & (Sx > 50) & (V > 110))) & (z > 0) & (a > 10)).astype(np.uint8)
        m = cv2.dilate(cv2.morphologyEx(m, cv2.MORPH_CLOSE, np.ones((5, 5), np.uint8)), np.ones((3, 3), np.uint8)); out = cv2.inpaint(bgr, m * 255, 9, cv2.INPAINT_NS)
        mk = cv2.GaussianBlur(cv2.dilate(m, np.ones((5, 5), np.uint8)).astype(np.float32), (0, 0), 2.5)[..., None]; out = (out * (1 - mk) + cv2.GaussianBlur(out, (0, 0), 1.6) * mk).astype(np.uint8)
    else:
        m = (z & (a > 10)).astype(np.uint8); ring = (cv2.dilate(m, np.ones((9, 9), np.uint8)) - m) > 0; cream = np.median(bgr[ring & (V > 150)], axis=0)
        fill = bgr.copy(); fill[m > 0] = cream; fill = cv2.GaussianBlur(fill, (0, 0), 1.2).astype(np.float32) + (np.random.RandomState(1).randn(*a.shape, 1) * 4).astype(np.float32)
        mk = cv2.GaussianBlur(m.astype(np.float32), (0, 0), 2.5)[..., None]; out = np.clip(bgr * (1 - mk) + fill * mk, 0, 255).astype(np.uint8)
    cv2.imwrite(WORK + name + '.png', np.dstack([out, a]))
# the painted open mouths come off (the engine draws the mouth); Tidbit's side views keep their closed smile
clean_mouth('sf-right', (284, 84, 29, 21), only_dark=False)
for n, z in (('tb-34front', (88, 100, 26, 10)), ('sf-34front', (96, 92, 34, 20)), ('tb-front', (75, 87, 20, 9)), ('sf-front', (86, 84, 34, 19))): clean_mouth(n, z)
for n in ('tb-right', 'tb-left', 'sf-left', 'sf-back', 'sf-34back', 'tb-back', 'tb-34back'): shutil.copy(SHEET + n + '.png', WORK + n + '.png')
# Sugarfoot less fluffy (owner, Nov 3 2026): tighten her outline by a few pixels and smooth the fur fringe; markings unchanged
def slim(name, px=3):
    im = cv2.imread(WORK + name + '.png', cv2.IMREAD_UNCHANGED); a = im[..., 3].astype(np.float32) / 255
    a = cv2.erode(a, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (2 * px + 1, 2 * px + 1)))
    a = cv2.GaussianBlur(a, (0, 0), 2.2); a = np.clip((a - 0.5) * 3 + 0.5, 0, 1)
    im[..., 3] = (a * 255).astype(np.uint8); cv2.imwrite(WORK + name + '.png', im)
for n in ('sf-right', 'sf-left', 'sf-34front', 'sf-front', 'sf-back', 'sf-34back'): slim(n)
# left views get the right views' rig, mirrored and scaled to their own size
def mirror_rig(src, dst):
    ws = cv2.imread(SHEET + src + '.png', cv2.IMREAD_UNCHANGED).shape; wd = cv2.imread(SHEET + dst + '.png', cv2.IMREAD_UNCHANGED).shape
    sx, sy = wd[1] / ws[1], wd[0] / ws[0]; X = lambda x: (ws[1] - x) * sx; Y = lambda y: y * sy; r = srig.RIGS[src]
    parts = {p: ([(X(x), Y(y)) for x, y in pts], (X(pv[0]), Y(pv[1])), fe) for p, (pts, pv, fe) in r['parts'].items()}
    belly, legs = r['cutlegs']; srig.RIGS[dst] = dict(parts=parts, cutlegs=(Y(belly), {p: ([(X(x), Y(y)) for x, y in pts], (X(pv[0]), Y(pv[1]))) for p, (pts, pv) in legs.items()})); return sx, sy
# the tail, found from the drawing itself: everything above the back line in the tail's columns (the hand polygons
# took a slab of back with them). BACK = (x0, x1, y_back): the tail's columns and the height of the back there.
BACK = {'tb-right': (0, 126, 100), 'sf-right': (0, 134, 118), 'tb-left': None, 'sf-left': None, 'tb-34front': (150, 240, 122), 'sf-34front': (170, 262, 136)}
def tail_mask(a, spec):
    x0, x1, yb = spec; m = np.zeros(a.shape, np.float32)
    # the back line, measured: the top of the drawing in the columns just past the tail (the plain back)
    side = x0 + 40 if x1 < a.shape[1] // 2 else x0 - 60; cols = range(x1, x1 + 40) if x1 < a.shape[1] // 2 else range(x0 - 40, x0)
    tops = [np.where(a[:, x] > 40)[0][0] for x in cols if (a[:, x] > 40).any()]; yb = int(np.median(tops)) + 4
    for x in range(x0, x1):
        col = a[:, x] > 40; ys = np.where(col)[0]
        if not len(ys): continue
        runs = np.split(ys, np.where(np.diff(ys) > 1)[0] + 1); top = runs[0]
        if top[-1] < yb - 2: m[top, x] = 1                      # a clear gap under the tail: the top run is the tail
        else: m[:yb - 2, x] = col[:yb - 2]                      # merged at the root: the tail is what sits above the back
    for r in range(max(0, yb - 10), yb - 2): m[r] *= (yb - 2 - r) / 8.0     # the root fades into the back, no hard line
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)); m = cv2.GaussianBlur(m, (0, 0), 1.6)
    ys, xs = np.where(m > .5); near = np.abs(ys - (yb - 6)) < 8
    pv = (float(xs[near].mean()), float(yb - 4)) if near.any() else (float(xs.mean()), float(ys.max()))
    return m, pv
SC = {'tb-left': mirror_rig('tb-right', 'tb-left'), 'sf-left': mirror_rig('sf-right', 'sf-left')}
for L, Rr in (('tb-left', 'tb-right'), ('sf-left', 'sf-right')):
    x0, x1, yb = BACK[Rr]; ws = cv2.imread(SHEET + Rr + '.png').shape[1]; wd = cv2.imread(SHEET + L + '.png').shape; sx, sy = wd[1] / ws, wd[0] / cv2.imread(SHEET + Rr + '.png').shape[0]
    BACK[L] = (int((ws - x1) * sx), int((ws - x0) * sx), int(yb * sy))

srig.S = WORK; srig.SP.clear()
def up2(im):
    im = im.astype(np.float32); a = im[..., 3:4] / 255.0; solid = (a[..., 0] > 0.6).astype(np.uint8); col = im[..., :3].copy()
    for _ in range(3):
        d = cv2.dilate(solid, np.ones((3, 3), np.uint8)); rg = (d > 0) & (solid == 0)
        blur = cv2.blur(col * solid[..., None], (3, 3)) / np.maximum(cv2.blur(solid.astype(np.float32), (3, 3)), 1e-3)[..., None]; col[rg] = blur[rg]; solid = d
    colu = cv2.resize(col, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC); au = cv2.GaussianBlur(cv2.resize(im[..., 3], None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC), (0, 0), 0.7)
    return np.dstack([np.clip(colu, 0, 255), np.clip(au, 0, 255)]).astype(np.uint8)
for f in os.listdir(OUT): os.remove(OUT + f)
meta = {}
def save(name, im):
    a = im[..., 3]; ys, xs = np.where(a > 1); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
    cv2.imwrite(OUT + name + '.png', up2(np.clip(im[y0:y1, x0:x1], 0, 255))); return dict(x=int(x0 - PAD), y=int(y0 - PAD), w=int(x1 - x0), h=int(y1 - y0))
MOUTH = {'tb-right': (288, 76, 15, 1, True), 'sf-right': (276, 85, 20, 1, False), 'tb-34front': (88, 99, 20, .3, False), 'sf-34front': (96, 93, 26, .2, False), 'tb-front': (75, 87, 14, 0, False), 'sf-front': (86, 84, 26, 0, False)}
EYES = {'tb-right': [(277, 43, 8)], 'sf-right': [(268, 41, 9)], 'tb-34front': [(62, 62, 9), (104, 58, 9)], 'sf-34front': [(62, 66, 11), (104, 56, 11)], 'tb-front': [(55, 48, 9), (95, 48, 9)], 'sf-front': [(62, 52, 11), (110, 52, 11)]}
for name in list(MOUTH) + ['tb-left', 'sf-left']:
    sp = srig.sprite(name); im = sp.img; yy, xx = sp.yy, sp.xx; rest = im.copy(); W = sp.W
    m = dict(w=int(W - 2 * PAD), h=int(sp.base_h), scale=2, layers={}, order=[])
    if sp.cutlegs:
        belly, legs = sp.cutlegs; belly += PAD; span = (xx > 25 + PAD) & (xx < W - 25 - PAD)
        for p in ('bl2', 'fl2', 'bl1', 'fl1'):
            pts, (px, py) = legs[p]; mk = srig.poly_w(im.shape, [(x + PAD, y + PAD) for x, y in pts], 1.2) * np.clip((yy - (belly - 22)) / 16, 0, 1)
            L = im.copy(); L[..., 3] *= mk; r = save(name + '-' + p, L); r.update(px=int(px), py=int(py)); m['layers'][p] = r
        rest[..., 3] *= np.where(span, np.clip((belly + 6 - yy) / 6, 0, 1), 1)
    tw = None
    if BACK.get(name):
        bx0, bx1, byb = BACK[name]; tw, tpv = tail_mask(im[..., 3], (bx0 + PAD, bx1 + PAD, byb + PAD))
        L = im.copy(); L[..., 3] *= tw; r = save(name + '-tail', L); r.update(px=int(tpv[0] - PAD), py=int(tpv[1] - PAD)); m['layers']['tail'] = r
        rest[..., 3] *= (1 - np.clip((tw - .4) / .3, 0, 1))
    for p in ('head',):
        if p not in sp.w: continue
        w = np.clip((sp.w[p] - .35) / .3, 0, 1); L = im.copy(); L[..., 3] *= w; r = save(name + '-' + p, L); r.update(px=int(sp.pv[p][0] - PAD), py=int(sp.pv[p][1] - PAD)); m['layers'][p] = r
        pvx, pvy = sp.pv[p]; dist = np.hypot(xx - pvx, yy - pvy)
        rest[..., 3] *= (1 - np.clip((sp.w[p] - .55) / .12, 0, 1) * np.clip((dist - 40) / 14, 0, 1))
    m['layers']['body'] = save(name + '-body', rest); m['order'] = [p for p in ('bl2', 'fl2', 'tail', 'body', 'bl1', 'fl1', 'head') if p in m['layers']]
    whole = im.copy()   # the painting in one piece for standing still, minus the tail, which moves on top from its root
    if tw is not None: whole[..., 3] *= (1 - np.clip((tw - .4) / .3, 0, 1))
    m['layers']['whole'] = save(name + '-whole', whole)
    if name in MOUTH:
        mx, my, hw, side, painted = MOUTH[name]; m['mouth'] = dict(x=mx, y=my, hw=hw, side=side, painted=painted); m['eyes'] = [list(e) for e in EYES[name]]
    else:
        src = name.replace('left', 'right'); sx, sy = SC[name]; wsrc = meta[src]['w']; mo = meta[src]['mouth']
        m['mouth'] = dict(x=int((wsrc - mo['x']) * sx), y=int(mo['y'] * sy), hw=int(mo['hw'] * sx), side=-1, painted=True); m['eyes'] = [[int((wsrc - x) * sx), int(y * sy), int(r * sx)] for x, y, r in meta[src]['eyes']]; m['faces'] = 'left'
    meta[name] = m
for name in ('tb-back', 'sf-back', 'tb-34back', 'sf-34back'):
    im = cv2.imread(WORK + name + '.png', cv2.IMREAD_UNCHANGED); cv2.imwrite(OUT + name + '-body.png', up2(im))
    meta[name] = dict(w=int(im.shape[1]), h=int(im.shape[0]), scale=2, layers={'body': dict(x=0, y=0, w=int(im.shape[1]), h=int(im.shape[0]))}, order=['body'])
json.dump(meta, open(OUT + 'meta.json', 'w'))
subprocess.check_call([sys.executable, os.path.join(HERE, 'flip34.py')]); print('pack built:', len(os.listdir(OUT)), 'files')
