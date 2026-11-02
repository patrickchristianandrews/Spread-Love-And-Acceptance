import cv2, numpy as np, sys, json
import potrace
from sklearn.cluster import KMeans
name, K = sys.argv[1], int(sys.argv[2])
POLY = {
 'sf': [(470,115),(540,105),(600,110),(650,118),(690,125),(730,140),(755,165),(760,200),(790,240),(820,280),(845,330),(850,380),(840,430),(830,480),(815,520),(800,570),(790,600),(770,612),(790,640),(800,662),(790,682),(760,692),(720,692),(690,682),(670,662),(662,632),(640,622),(560,626),(520,640),(505,662),(500,700),(472,722),(430,727),(400,717),(393,690),(403,660),(418,640),(420,600),(410,560),(405,520),(410,480),(395,430),(385,380),(380,330),(385,280),(395,230),(410,190),(430,158),(450,130)],
 'tb': [(560,75),(610,60),(680,62),(730,80),(770,105),(800,130),(815,160),(805,200),(785,222),(830,245),(900,250),(1000,256),(1000,276),(960,285),(925,296),(915,320),(900,332),(862,330),(830,322),(800,332),(785,345),(800,372),(830,400),(860,430),(885,460),(890,490),(872,497),(845,482),(820,457),(805,422),(780,392),(760,382),(700,386),(600,386),(530,386),(500,392),(462,422),(442,462),(422,522),(402,582),(392,632),(372,690),(347,706),(315,702),(305,672),(320,632),(340,582),(365,522),(390,462),(410,412),(432,372),(472,346),(500,330),(492,300),(484,268),(520,272),(514,240),(528,214),(514,188),(510,142),(530,108),(545,88)],
}
im = cv2.imread('/tmp/ph/%s-img.png' % name); H, W = im.shape[:2]
mask = np.zeros((H, W), np.uint8); cv2.fillPoly(mask, [np.array(POLY[name], np.int32)], 255)
mask = cv2.GaussianBlur(mask, (9, 9), 0); mask = (mask > 127).astype(np.uint8) * 255
sm = cv2.bilateralFilter(im, 9, 60, 9); sm = cv2.bilateralFilter(sm, 9, 50, 9)
lab = cv2.cvtColor(sm, cv2.COLOR_BGR2LAB).astype(np.float32)
pix = lab[mask > 0]
km = KMeans(n_clusters=K, n_init=6, random_state=1).fit(pix[::7])
L = np.full((H, W), -1, np.int32); L[mask > 0] = km.predict(pix)
# tidy the areas: majority filter, so small specks join their neighbor
for _ in range(3):
    votes = np.stack([cv2.blur((L == k).astype(np.float32), (13, 13)) for k in range(K)])
    L2 = votes.argmax(0); L = np.where(mask > 0, L2, -1)
cent = cv2.cvtColor(km.cluster_centers_.reshape(1, K, 3).astype(np.uint8), cv2.COLOR_LAB2BGR).reshape(K, 3)
order = np.argsort(km.cluster_centers_[:, 0])   # dark to light
def curves(m, turd):
    pl = potrace.Bitmap(~np.asarray(m, bool)).trace(turdsize=turd, alphamax=1.2, opticurve=True, opttolerance=0.5)
    d = ''
    for cv in pl:
        sp = cv.start_point; d += 'M%.1f %.1f' % (sp.x, sp.y)
        for sg in cv.segments:
            d += ('L%.1f %.1fL%.1f %.1f' % (sg.c.x, sg.c.y, sg.end_point.x, sg.end_point.y)) if sg.is_corner else ('C%.1f %.1f %.1f %.1f %.1f %.1f' % (sg.c1.x, sg.c1.y, sg.c2.x, sg.c2.y, sg.end_point.x, sg.end_point.y))
        d += 'Z'
    return d
regs = []
for k in order:
    b, g_, r = [int(v) for v in cent[k]]
    regs.append(('#%02x%02x%02x' % (r, g_, b), curves(L == k, 40), int(km.cluster_centers_[k, 0])))
sil = curves(mask > 0, 80)
json.dump({'W': W, 'H': H, 'regs': regs, 'sil': sil}, open('/tmp/ph/%s-vec.json' % name, 'w'))
def svg(mono):
    p = []
    for col, d, l in regs:
        dark = l < 40
        fill = ('#1d1a19' if dark else '#FFFFFF') if mono else col
        p.append('<path d="%s" fill="%s" fill-rule="evenodd" stroke="#2B211C" stroke-width="%s" stroke-linejoin="round"/>' % (d, fill, 0 if (dark and not mono) else 2.2))
    p.append('<path d="%s" fill="none" stroke="#2B211C" stroke-width="5" stroke-linejoin="round"/>' % sil)
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d" style="background:#fff">%s</svg>' % (W, H, W, H, ''.join(p))
open('/tmp/ph/%s-c.svg' % name, 'w').write(svg(False)); open('/tmp/ph/%s-l.svg' % name, 'w').write(svg(True))
print(name, [r[0] for r in regs])
