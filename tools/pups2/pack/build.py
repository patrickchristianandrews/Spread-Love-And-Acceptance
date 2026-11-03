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
    """the tail: the columns where a run sits clear above the body (the plume), plus the root, the next few columns
    toward the body where something still rises above the back line, which is measured just past the root"""
    x0, x1, yb = spec; x0 = max(0, x0); x1 = min(a.shape[1], x1); m = np.zeros(a.shape, np.float32); sep = []
    for x in range(x0, x1):
        ys = np.where(a[:, x] > 40)[0]
        if len(ys) < 2: continue
        runs = np.split(ys, np.where(np.diff(ys) > 1)[0] + 1); top = runs[0]
        if len(runs) > 1 and top[-1] < yb + 25 and runs[1][0] - top[-1] > 3: m[top, x] = 1; sep.append(x)
    plume = m.copy()
    if not sep: return m, (float(x0 + x1) / 2, float(yb)), plume
    cx = a.shape[1] / 2; toward = 1 if cx > max(sep) else -1; edge = max(sep) if toward > 0 else min(sep)
    tops = [np.where(a[:, x] > 40)[0][0] for x in range(edge + toward * 26, edge + toward * 44, toward) if 0 <= x < a.shape[1] and (a[:, x] > 40).any()]
    yb2 = int(np.median(tops)) if tops else yb
    for k in range(1, 60):
        x = edge + toward * k
        if x < 0 or x >= a.shape[1]: break
        ys = np.where(a[:, x] > 40)[0]
        if not len(ys) or ys[0] >= yb2 - 5: break
        m[:yb2 - 2, x] = (a[:yb2 - 2, x] > 40)
    # the plume's own columns, tip to root: anything above the back line there is tail (a curled plume has two lobes)
    for x in (range(x0, edge + 1) if toward > 0 else range(edge, x1)):
        m[:yb2 - 2, x] = np.maximum(m[:yb2 - 2, x], (a[:yb2 - 2, x] > 40).astype(np.float32))
    for r in range(max(0, yb2 - 10), yb2 - 2): m[r] *= (yb2 - 2 - r) / 8.0
    m = cv2.morphologyEx(m, cv2.MORPH_OPEN, np.ones((3, 3), np.uint8)); m = cv2.GaussianBlur(m, (0, 0), 1.6)
    ys, xs = np.where(m > .5)
    if not len(ys): return m, (float(x0 + x1) / 2, float(yb2)), plume
    near = np.abs(ys - (yb2 - 6)) < 8
    pv = (float(xs[near].mean()), float(yb2 - 4)) if near.any() else (float(xs.mean()), float(ys.max()))
    plume = cv2.GaussianBlur(plume, (0, 0), 0.8)
    return m, pv, plume

# younger (owner, Nov 3 2026: "same look, just younger"): a bigger head on the same neck and a slightly squatter body,
# baked into the drawing before it is cut into layers, so every view and every layer agrees. Everything that is
# measured in sheet pixels (the rig, the tail columns, the mouth, the eyes) is moved by the same transform.
HEAD_UP, SQUAT, PADX, PADY = 1.18, 0.94, 30, 44
def poly_feather(shape, pts, feather):
    m = np.zeros(shape[:2], np.uint8); cv2.fillPoly(m, [np.array(pts, np.int32)], 255); return cv2.GaussianBlur(m.astype(np.float32) / 255, (0, 0), feather)
SC = {'tb-left': mirror_rig('tb-right', 'tb-left'), 'sf-left': mirror_rig('sf-right', 'sf-left')}
for L, Rr in (('tb-left', 'tb-right'), ('sf-left', 'sf-right')):
    x0, x1, yb = BACK[Rr]; ws = cv2.imread(SHEET + Rr + '.png').shape[1]; wd = cv2.imread(SHEET + L + '.png').shape; sx, sy = wd[1] / ws, wd[0] / cv2.imread(SHEET + Rr + '.png').shape[0]
    BACK[L] = (int((ws - x1) * sx), int((ws - x0) * sx), int(yb * sy))
# mouth anchors and eyes, in sheet pixels: (x, y, half width, side, painted smile kept)
# mouth anchors and eyes, in sheet pixels: (x, y, half width, side, painted smile kept)
MOUTH = {'tb-right': (288, 76, 15, 1, True), 'sf-right': (276, 85, 20, 1, False), 'tb-34front': (88, 99, 20, .3, False), 'sf-34front': (96, 93, 26, .2, False), 'tb-front': (75, 87, 14, 0, False), 'sf-front': (86, 84, 26, 0, False)}
EYES = {'tb-right': [(277, 43, 8)], 'sf-right': [(268, 41, 9)], 'tb-34front': [(62, 62, 9), (104, 58, 9)], 'sf-34front': [(62, 66, 11), (104, 56, 11)], 'tb-front': [(55, 48, 9), (95, 48, 9)], 'sf-front': [(62, 52, 11), (110, 52, 11)]}
for L, Rr in (('tb-left', 'tb-right'), ('sf-left', 'sf-right')):
    sx, sy = SC[L]; ws = cv2.imread(SHEET + Rr + '.png').shape[1]; mx, my, hw, side, painted = MOUTH[Rr]
    MOUTH[L] = ((ws - mx) * sx, my * sy, hw * sx, -1, True); EYES[L] = [((ws - x) * sx, y * sy, r * sx) for x, y, r in EYES[Rr]]
def youngify(name):
    im = cv2.imread(WORK + name + '.png', cv2.IMREAD_UNCHANGED).astype(np.float32); H, W = im.shape[:2]
    tm, _, tp = tail_mask(im[..., 3], BACK[name]) if BACK.get(name) else (None, None, None)
    rig = srig.RIGS[name]; pts, (px, py), fe = rig['parts']['head']
    w = poly_feather(im.shape, pts, fe); head = im.copy(); head[..., 3] *= w
    big = cv2.warpAffine(head, cv2.getRotationMatrix2D((px, py), 0, HEAD_UP), (W + 2 * PADX, H + PADY), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))
    base = cv2.copyMakeBorder(im, PADY, 0, PADX, PADX, cv2.BORDER_CONSTANT, value=(0, 0, 0, 0))
    big = cv2.warpAffine(head, np.float32([[HEAD_UP, 0, px - HEAD_UP * px + PADX], [0, HEAD_UP, py - HEAD_UP * py + PADY]]), (W + 2 * PADX, H + PADY), flags=cv2.INTER_LINEAR, borderValue=(0, 0, 0, 0))
    a = big[..., 3:4] / 255; base[..., :3] = big[..., :3] * a + base[..., :3] * (1 - a); base[..., 3:4] = big[..., 3:4] + base[..., 3:4] * (1 - a)
    H2, W2 = base.shape[:2]; base = cv2.resize(base, (W2, int(round(H2 * SQUAT))), interpolation=cv2.INTER_AREA)
    cv2.imwrite(WORK + name + '.png', np.clip(base, 0, 255).astype(np.uint8))
    if tm is not None:
        tm = cv2.copyMakeBorder(tm, PADY, 0, PADX, PADX, cv2.BORDER_CONSTANT, value=0); tm = cv2.resize(tm, (W2, int(round(H2 * SQUAT))), interpolation=cv2.INTER_AREA)
        cv2.imwrite(WORK + name + '-tm.png', (np.clip(tm, 0, 1) * 255).astype(np.uint8))
        tp = cv2.copyMakeBorder(tp, PADY, 0, PADX, PADX, cv2.BORDER_CONSTANT, value=0); tp = cv2.resize(tp, (W2, int(round(H2 * SQUAT))), interpolation=cv2.INTER_AREA)
        cv2.imwrite(WORK + name + '-tp.png', (np.clip(tp, 0, 1) * 255).astype(np.uint8))
    # the same move for everything measured on the drawing; head points also follow the head's enlargement
    X = lambda x: x + PADX; Y = lambda y: (y + PADY) * SQUAT
    HX = lambda x: px + (x - px) * HEAD_UP + PADX; HY = lambda y: (py + (y - py) * HEAD_UP + PADY) * SQUAT
    parts = {}
    for pn, (pp, pv, f) in rig['parts'].items():
        if pn == 'head': parts[pn] = ([(HX(x), HY(y)) for x, y in pp], (X(pv[0]), Y(pv[1])), f)
        else: parts[pn] = ([(X(x), Y(y)) for x, y in pp], (X(pv[0]), Y(pv[1])), f)
    cl = rig.get('cutlegs'); rig2 = dict(parts=parts)
    if cl: rig2['cutlegs'] = (Y(cl[0]), {pn: ([(X(x), Y(y)) for x, y in pp], (X(pv[0]), Y(pv[1]))) for pn, (pp, pv) in cl[1].items()})
    srig.RIGS[name] = rig2
    mx, my, hw, side, painted = MOUTH[name]; MOUTH[name] = (HX(mx), HY(my), hw * HEAD_UP, side, painted)
    EYES[name] = [(HX(x), HY(y), r * HEAD_UP) for x, y, r in EYES[name]]
for n in list(MOUTH): youngify(n)
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
    cv2.imwrite(OUT + name + '.png', up2(np.clip(im[y0:y1, x0:x1], 0, 255)), [cv2.IMWRITE_PNG_COMPRESSION, 9]); return dict(x=int(x0 - PAD), y=int(y0 - PAD), w=int(x1 - x0), h=int(y1 - y0))

# the wag, with no cut at all: whole-pup frames with the tail bent by a smooth weighted warp about its root
WAG_N, WAG_MAX = 5, 16.0
def wag_frames(im, tm, pv, name, suffix):
    H, W = im.shape[:2]; yy, xx = np.mgrid[0:H, 0:W].astype(np.float32)
    w = cv2.GaussianBlur(np.clip(tm, 0, 1), (0, 0), 5.0); w = np.clip(w * 1.3, 0, 1)
    px, py = pv; out = []
    for k in range(WAG_N):
        th = np.radians(-WAG_MAX + 2 * WAG_MAX * k / (WAG_N - 1)) * w
        cx, cy = xx - px, yy - py; c, s_ = np.cos(th), np.sin(th)
        sx, sy = px + c * cx - s_ * cy, py + s_ * cx + c * cy
        fr = cv2.remap(im.astype(np.float32), sx.astype(np.float32), sy.astype(np.float32), cv2.INTER_LINEAR, borderMode=cv2.BORDER_CONSTANT, borderValue=(0, 0, 0, 0))
        a = fr[..., 3]; ys, xs = np.where(a > 1); y0, y1, x0, x1 = ys.min(), ys.max() + 1, xs.min(), xs.max() + 1
        crop = np.clip(fr[y0:y1, x0:x1], 0, 255); al = crop[..., 3:4] / 255.0; solid = (al[..., 0] > .6).astype(np.uint8); col = crop[..., :3].copy()
        for _ in range(2):
            d = cv2.dilate(solid, np.ones((3, 3), np.uint8)); rg = (d > 0) & (solid == 0)
            blur = cv2.blur(col * solid[..., None], (3, 3)) / np.maximum(cv2.blur(solid.astype(np.float32), (3, 3)), 1e-3)[..., None]; col[rg] = blur[rg]; solid = d
        cv2.imwrite(OUT + name + '-' + suffix + str(k) + '.png', np.dstack([col, crop[..., 3:4]]).astype(np.uint8), [cv2.IMWRITE_PNG_COMPRESSION, 9])
        out.append(dict(x=int(x0 - PAD), y=int(y0 - PAD), w=int(x1 - x0), h=int(y1 - y0)))
    return out
for name in list(MOUTH):
    sp = srig.sprite(name); im = sp.img; yy, xx = sp.yy, sp.xx; rest = im.copy(); W = sp.W
    m = dict(w=int(W - 2 * PAD), h=int(sp.base_h), scale=2, layers={}, order=[])
    if sp.cutlegs:
        belly, legs = sp.cutlegs; belly += PAD; span = (xx > 25 + PAD) & (xx < W - 25 - PAD)
        for p in ('bl2', 'fl2', 'bl1', 'fl1'):
            pts, (px, py) = legs[p]; mk = srig.poly_w(im.shape, [(x + PAD, y + PAD) for x, y in pts], 1.2) * np.clip((yy - (belly - 22)) / 16, 0, 1)
            L = im.copy(); L[..., 3] *= mk; r = save(name + '-' + p, L); r.update(px=int(px), py=int(py)); m['layers'][p] = r
        rest[..., 3] *= np.where(span, np.clip((belly + 6 - yy) / 6, 0, 1), 1)
    tw = None; rest_full = None
    if os.path.exists(WORK + name + '-tp.png'):
        tp = cv2.copyMakeBorder(cv2.imread(WORK + name + '-tp.png', 0), PAD, PAD, PAD, PAD, cv2.BORDER_CONSTANT, value=0).astype(np.float32) / 255
        tw = cv2.GaussianBlur(np.clip((tp - .2) / .3, 0, 1), (0, 0), 1.0)      # the moving tail is the plume only; the rump stays on the body
        ys, xs = np.where(tw > .5); yb = int(ys.max()) if len(ys) else PAD; near = ys > yb - 8
        tpv = (float(xs[near].mean()) if near.any() else float(xs.mean()), float(yb - 2))
        L = im.copy(); L[..., 3] *= tw; r = save(name + '-tail', L); r.update(px=int(tpv[0] - PAD), py=int(tpv[1] - PAD)); m['layers']['tail'] = r
        tp = cv2.copyMakeBorder(cv2.imread(WORK + name + '-tp.png', 0), PAD, PAD, PAD, PAD, cv2.BORDER_CONSTANT, value=0).astype(np.float32) / 255
        rest_full = rest.copy()
        rest[..., 3] *= (1 - np.clip((tp - .3) / .4, 0, 1))
    for p in ('head',):
        if p not in sp.w: continue
        w = np.clip((sp.w[p] - .35) / .3, 0, 1); L = im.copy(); L[..., 3] *= w; r = save(name + '-' + p, L); r.update(px=int(sp.pv[p][0] - PAD), py=int(sp.pv[p][1] - PAD)); m['layers'][p] = r
        pvx, pvy = sp.pv[p]; dist = np.hypot(xx - pvx, yy - pvy)
        hk = (1 - np.clip((sp.w[p] - .55) / .12, 0, 1) * np.clip((dist - 52) / 18, 0, 1)); rest[..., 3] *= hk
        if rest_full is not None: rest_full[..., 3] *= hk
    m['layers']['body'] = save(name + '-body', rest); m['order'] = [p for p in ('bl2', 'fl2', 'tail', 'body', 'bl1', 'fl1', 'head') if p in m['layers']]
    whole = im.copy()   # the painting in one piece for standing still, minus the tail, which moves on top from its root
    if tw is not None: whole[..., 3] *= (1 - np.clip((tp - .3) / .4, 0, 1))
    m['layers']['whole'] = save(name + '-whole', whole)
    if tw is not None:
        tmf = cv2.copyMakeBorder(cv2.imread(WORK + name + '-tm.png', 0), PAD, PAD, PAD, PAD, cv2.BORDER_CONSTANT, value=0).astype(np.float32) / 255
        pvw = (float(tpv[0]), float(tpv[1]))
        m['wag'] = dict(n=WAG_N, max=WAG_MAX, whole=wag_frames(im, tmf, pvw, name, 'wag'), body=wag_frames(rest_full, tmf, pvw, name, 'wagb'))
    mx, my, hw, side, painted = MOUTH[name]; m['mouth'] = dict(x=int(mx), y=int(my), hw=int(hw), side=side, painted=painted); m['eyes'] = [[int(x), int(y), int(r)] for x, y, r in EYES[name]]
    if 'left' in name: m['faces'] = 'left'
    meta[name] = m
for name in ('tb-back', 'sf-back', 'tb-34back', 'sf-34back'):
    im = cv2.imread(WORK + name + '.png', cv2.IMREAD_UNCHANGED); cv2.imwrite(OUT + name + '-body.png', up2(im))
    meta[name] = dict(w=int(im.shape[1]), h=int(im.shape[0]), scale=2, layers={'body': dict(x=0, y=0, w=int(im.shape[1]), h=int(im.shape[0]))}, order=['body'])
json.dump(meta, open(OUT + 'meta.json', 'w'))
subprocess.check_call([sys.executable, os.path.join(HERE, 'flip34.py')]); print('pack built:', len(os.listdir(OUT)), 'files')
