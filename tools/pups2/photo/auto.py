import cv2, numpy as np, sys, json
import potrace
name = sys.argv[1]; cfg = json.loads(sys.argv[2])
src = open('/tmp/ph/poster.py').read(); POLY = eval(src[src.index("POLY = ") + 7: src.index("\nim = cv2.imread")])
im = cv2.imread('/tmp/ph/%s-img.png' % name); H, W = im.shape[:2]
# precise outline: grabCut started from the hand-drawn outline
poly = np.zeros((H, W), np.uint8); cv2.fillPoly(poly, [np.array(POLY[name], np.int32)], 1)
gm = np.where(cv2.erode(poly, np.ones((25, 25), np.uint8)) > 0, cv2.GC_FGD, np.where(poly > 0, cv2.GC_PR_FGD, np.where(cv2.dilate(poly, np.ones((25, 25), np.uint8)) > 0, cv2.GC_PR_BGD, cv2.GC_BGD))).astype(np.uint8)
bg = np.zeros((1, 65)); fg = np.zeros((1, 65)); cv2.grabCut(im, gm, None, bg, fg, 6, cv2.GC_INIT_WITH_MASK)
mask = np.where((gm == 1) | (gm == 3), 255, 0).astype(np.uint8)
mask = cv2.morphologyEx(mask, cv2.MORPH_OPEN, np.ones((7, 7), np.uint8)); mask = cv2.morphologyEx(mask, cv2.MORPH_CLOSE, np.ones((15, 15), np.uint8))
n, lab, st, _ = cv2.connectedComponentsWithStats(mask); mask = np.where(lab == 1 + np.argmax(st[1:, 4]), 255, 0).astype(np.uint8)
mask = (cv2.GaussianBlur(mask, (15, 15), 0) > 127).astype(np.uint8) * 255
# white balance: make the reference patch (known white fur) neutral
x0, y0, x1, y1 = cfg['white']; ref = im[y0:y1, x0:x1].reshape(-1, 3).astype(np.float32).mean(0)
wb = np.clip(im.astype(np.float32) * (ref.mean() / ref) * cfg.get('gain', 1.0), 0, 255).astype(np.uint8)
flat = cv2.medianBlur(cv2.bilateralFilter(wb, 11, 50, 11), 7)
Lab = cv2.cvtColor(flat, cv2.COLOR_BGR2LAB).astype(np.float32); Lc, A, B = Lab[..., 0] * 100 / 255, Lab[..., 1] - 128, Lab[..., 2] - 128
chroma = np.hypot(A, B)
cls = np.zeros((H, W), np.int32)                                  # 0 black
rule = cfg['rule']
if rule == 'sf':
    light = Lc > 52
    cls[light & (B > 5.5)] = 1                                     # tan
    cls[light & (B <= 5.5)] = 3                                    # white
    cls[(Lc > 26) & (Lc <= 52) & (B > 7)] = 2                      # rusty brown
else:
    cls[(chroma >= 13) & (Lc > 13)] = 1                            # tan
    cls[(Lc > 70) & (chroma < 8)] = 3
cls[(A > 16) & (B < 16) & (Lc > 35)] = 4                          # pink
cls[mask == 0] = -1
for r in (7, 11, 15):
    votes = np.stack([cv2.blur((cls == k).astype(np.float32), (r, r)) for k in range(5)]); cls = np.where(mask > 0, votes.argmax(0), -1)
PAL = cfg['pal']
vis = np.full((H, W, 3), 255, np.uint8)
for k in range(5): vis[cls == k] = [int(PAL[k][i:i + 2], 16) for i in (5, 3, 1)]
cv2.imwrite('/tmp/ph/%s-auto.png' % name, vis)
np.save('/tmp/ph/%s-cls.npy' % name, cls); cv2.imwrite('/tmp/ph/%s-mask2.png' % name, mask)
