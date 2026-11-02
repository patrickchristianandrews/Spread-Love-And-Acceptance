import cv2, numpy as np
R = '/home/user/Spread-Love-And-Acceptance/tools/pups2/ref/'
SPR = {'sf': cv2.imread(R + 'sugarfoot-cutout.png', cv2.IMREAD_UNCHANGED), 'tb': cv2.imread(R + 'tidbit-cutout.png', cv2.IMREAD_UNCHANGED)}
HEADH = {'sf': 590.0, 'tb': 470.0}
def spr_of(who, headh, flip=False, rot=0):
    spr = SPR[who].astype(np.float32); a = spr[..., 3:4] / 255.0
    pm = np.dstack([spr[..., :3] * a, spr[..., 3:4]])            # premultiplied, so resizing never bleeds the edge
    s = headh / HEADH[who]
    pm = cv2.resize(pm, None, fx=s, fy=s, interpolation=cv2.INTER_AREA if s < 1 else cv2.INTER_CUBIC)
    if flip: pm = cv2.flip(pm, 1)
    if rot:
        h, w = pm.shape[:2]; M = cv2.getRotationMatrix2D((w / 2, h), rot, 1); cos, sin = abs(M[0, 0]), abs(M[0, 1])
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
def paste(c, who, cx, by, headh, flip=False, rot=0): blit(c, spr_of(who, headh, flip, rot), cx, by)
def shadow(c, cx, by, w, h):
    ov = c.copy(); cv2.ellipse(ov, (int(cx), int(by) - 3), (int(w), int(h)), 0, 0, 360, (40, 30, 20), -1); cv2.addWeighted(ov, .18, c, .82, 0, c)
def clear(c, box):
    x, y, w, h = box; px, py = int(w * .18), int(h * .22)
    X0, Y0, X1, Y1 = max(0, x - px), max(0, y - py), min(c.shape[1], x + w + px), min(c.shape[0], y + h + 8)
    sub = c[Y0:Y1, X0:X1].astype(np.float32)
    ring = np.concatenate([sub[:4].reshape(-1, 3), sub[-4:].reshape(-1, 3), sub[:, :4].reshape(-1, 3), sub[:, -4:].reshape(-1, 3)])
    _, _, cen = cv2.kmeans(ring, 6, None, (cv2.TERM_CRITERIA_EPS + cv2.TERM_CRITERIA_MAX_ITER, 20, 1), 3, cv2.KMEANS_PP_CENTERS)
    d = np.min(np.linalg.norm(sub[:, :, None, :] - cen[None, None], axis=3), axis=2)
    m = cv2.dilate((d > 26).astype(np.uint8), np.ones((7, 7), np.uint8))
    full = np.zeros(c.shape[:2], np.uint8); full[Y0:Y1, X0:X1] = m
    return cv2.inpaint(c, full, 9, cv2.INPAINT_TELEA)
def board(items, cols=2, w=620, h=440, fname='board.png', wide_last=False):
    tiles = []
    for name, img in items:
        s = min(w / img.shape[1], h / img.shape[0]); im2 = cv2.resize(img, None, fx=s, fy=s, interpolation=cv2.INTER_AREA)
        pad = np.full((h, w, 3), 255, np.uint8); x0 = (w - im2.shape[1]) // 2; pad[:im2.shape[0], x0:x0 + im2.shape[1]] = im2
        lab = np.full((34, w, 3), 255, np.uint8); cv2.putText(lab, name, (6, 24), cv2.FONT_HERSHEY_DUPLEX, .62, (50, 50, 50), 1, cv2.LINE_AA)
        tiles.append(np.vstack([pad, lab]))
    main = tiles[:-1] if wide_last else tiles
    rows = []
    for i in range(0, len(main), cols):
        r = main[i:i + cols]
        while len(r) < cols: r.append(np.full_like(main[0], 255))
        rows.append(cv2.hconcat(r))
    if wide_last:
        name, img = items[-1]; s = (w * cols) / img.shape[1]; st = cv2.resize(img, None, fx=s, fy=s)
        lab = np.full((34, w * cols, 3), 255, np.uint8); cv2.putText(lab, name, (6, 24), cv2.FONT_HERSHEY_DUPLEX, .62, (50, 50, 50), 1, cv2.LINE_AA)
        rows.append(np.vstack([st, lab]))
    cv2.imwrite(fname, cv2.vconcat(rows))
