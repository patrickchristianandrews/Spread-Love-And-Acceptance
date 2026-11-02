import cv2, numpy as np, sys
src, rect, out, maxw = sys.argv[1], tuple(int(v) for v in sys.argv[2].split(',')), sys.argv[3], int(sys.argv[4])
im = cv2.imread(src); H, W = im.shape[:2]; k = maxw / W
im = cv2.resize(im, (int(W * k), int(H * k)), interpolation=cv2.INTER_AREA)
r = tuple(int(v * k) for v in rect)
mask = np.zeros(im.shape[:2], np.uint8); bg = np.zeros((1, 65), np.float64); fg = np.zeros((1, 65), np.float64)
cv2.grabCut(im, mask, r, bg, fg, 8, cv2.GC_INIT_WITH_RECT)
m = np.where((mask == 1) | (mask == 3), 255, 0).astype(np.uint8)
# keep the biggest piece, fill holes, smooth the edge
n, lab, st, _ = cv2.connectedComponentsWithStats(m)
big = 1 + np.argmax(st[1:, cv2.CC_STAT_AREA]); m = np.where(lab == big, 255, 0).astype(np.uint8)
m = cv2.morphologyEx(m, cv2.MORPH_CLOSE, cv2.getStructuringElement(cv2.MORPH_ELLIPSE, (25, 25)))
m = cv2.GaussianBlur(m, (21, 21), 0); m = np.where(m > 127, 255, 0).astype(np.uint8)
cv2.imwrite(out + '-img.png', im); cv2.imwrite(out + '-mask.png', m)
vis = im.copy(); vis[m == 0] = (vis[m == 0] * 0.25 + 190).astype(np.uint8); cv2.imwrite(out + '-vis.png', vis)
print(im.shape)
