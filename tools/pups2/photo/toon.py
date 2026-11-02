import cv2, numpy as np, sys, importlib.util
from sklearn.cluster import KMeans
name = sys.argv[1]; K = int(sys.argv[2])
spec = importlib.util.spec_from_file_location('art', '/tmp/il/%s_art.py' % name)
src = open('/tmp/il/%s_art.py' % name).read()
ns = {}; exec(src.split("def build")[0].replace("sys.path.insert(0, '/tmp/ph'); from smooth import path", ""), {'sys': sys}, ns)
S = ns['S']
im = cv2.imread('/tmp/il/%s.png' % name); H, W = im.shape[:2]
poly = np.zeros((H, W), np.uint8)
keys = ['body', 'head', 'legL', 'legR', 'hind', 'earL', 'earR'] if name == 'tb' else ['body', 'earL', 'earR', 'pawL', 'pawR']
for k in keys: cv2.fillPoly(poly, [np.array(S[k], np.int32)], 1)
gm = np.where(cv2.erode(poly, np.ones((21, 21), np.uint8)) > 0, 1, np.where(poly > 0, 3, np.where(cv2.dilate(poly, np.ones((31, 31), np.uint8)) > 0, 2, 0))).astype(np.uint8)
bg = np.zeros((1, 65)); fg = np.zeros((1, 65)); cv2.grabCut(im, gm, None, bg, fg, 6, cv2.GC_INIT_WITH_MASK)
mask = np.where((gm == 1) | (gm == 3), 255, 0).astype(np.uint8)
n, lab, st, _ = cv2.connectedComponentsWithStats(mask); mask = np.where(lab == 1 + np.argmax(st[1:, 4]), 255, 0).astype(np.uint8)
mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (21, 21)))
mask = (cv2.GaussianBlur(mask, (0, 0), 3) > 127).astype(np.uint8) * 255
# drop stray background (the lamp) from the cut-out
hsv0 = cv2.cvtColor(im, cv2.COLOR_BGR2HSV); mask[(hsv0[..., 1] > 120) & (hsv0[..., 2] > 170) & (hsv0[..., 0] > 18) & (hsv0[..., 0] < 40)] = 0
mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (9, 9)))
# lift shadows so the black fur shows its form, then smooth flat like paint
lab_ = cv2.cvtColor(im, cv2.COLOR_BGR2LAB); lab_[..., 0] = cv2.createCLAHE(2.0, (8, 8)).apply(lab_[..., 0]); br = cv2.cvtColor(lab_, cv2.COLOR_LAB2BGR)
sm = br
for _ in range(4): sm = cv2.bilateralFilter(sm, 9, 40, 7)
sm = cv2.edgePreservingFilter(sm, flags=1, sigma_s=60, sigma_r=0.4)

L = cv2.cvtColor(sm, cv2.COLOR_BGR2LAB).reshape(-1, 3).astype(np.float32)
inside = mask.reshape(-1) > 0
km = KMeans(n_clusters=K, n_init=4, random_state=2).fit(L[inside][::5])
q = np.zeros_like(L); q[inside] = km.cluster_centers_[km.predict(L[inside])]
cc = km.cluster_centers_.copy()
TAN, RUST = ((222, 182, 140), (170, 96, 56)) if name == 'sf' else ((200, 138, 85), (163, 90, 50))
L8, A8, B8 = cc[:, 0] * 100 / 255, cc[:, 1] - 128, cc[:, 2] - 128
warm = B8 - A8 * 0.2 + float(sys.argv[3]) if len(sys.argv) > 3 else B8      # per-photo warmth correction
newc = []
for l, a_, b_, w_ in zip(L8, A8, B8, warm):
    ch = np.hypot(a_, b_ + (w_ - b_))
    if l < 30: base = (31, 26, 25); t = l / 30.0; col = tuple(int(c * (0.85 + 0.6 * t)) for c in base)          # black coat, shaded
    elif ch > 10 and w_ > 6: col = (TAN if l > 52 else RUST); col = tuple(int(c * (0.8 + 0.4 * (l - 30) / 70)) for c in col)   # tan / rust
    elif l > 62: col = (243, 238, 230) if l > 74 else (210, 202, 194)                                                # white / grizzle
    else: col = (70, 62, 60)                                                                                          # dark grey sheen on black
    newc.append(col[::-1])
newc = np.array(newc, np.uint8)
lab_idx = np.full(H * W, -1); lab_idx[inside] = km.predict(L[inside])
qi = np.zeros((H * W, 3), np.uint8); qi[inside] = newc[lab_idx[inside]]; qi = qi.reshape(H, W, 3)
qi = cv2.medianBlur(qi, 7)
qi[mask == 0] = 255
# ink lines: difference of gaussians on the smoothed photo, plus the silhouette
g = cv2.cvtColor(sm, cv2.COLOR_BGR2GRAY).astype(np.float32)
d = cv2.GaussianBlur(g, (0, 0), 1.6) - 0.985 * cv2.GaussianBlur(g, (0, 0), 3.2)
edge = (d < -4.0).astype(np.uint8) * 255
edge = cv2.morphologyEx(edge, cv2.MORPH_OPEN, np.ones((2, 2), np.uint8)); edge[mask == 0] = 0
n2, l2, st2, _ = cv2.connectedComponentsWithStats(edge)
keep = np.zeros_like(edge)
for i in range(1, n2):
    if st2[i, 4] > 140: keep[l2 == i] = 255
sil = cv2.morphologyEx(mask, cv2.MORPH_GRADIENT, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (7, 7)))
lines = cv2.bitwise_or(keep, sil)
lines = (cv2.GaussianBlur(lines, (0, 0), 0.9) > 90).astype(np.uint8) * 255
col = qi.copy(); col[lines > 0] = (28, 24, 22)
# coloring page: region borders of the quantized colors + the ink lines
reg = cv2.Canny(cv2.medianBlur(qi, 15), 60, 140); reg = cv2.dilate(reg, np.ones((2, 2), np.uint8))
n3, l3, st3, _ = cv2.connectedComponentsWithStats(reg); reg2 = np.zeros_like(reg)
for i in range(1, n3):
    if st3[i, 4] > 220: reg2[l3 == i] = 255
page = np.full((H, W), 255, np.uint8); page[(reg2 > 0) | (lines > 0)] = 30
eyesnose = (cv2.cvtColor(qi, cv2.COLOR_BGR2GRAY) < 35) & (mask > 0)
cv2.imwrite('/tmp/il/%s-toon.png' % name, col); cv2.imwrite('/tmp/il/%s-page.png' % name, page)
