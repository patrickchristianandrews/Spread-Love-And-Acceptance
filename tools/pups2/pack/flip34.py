"""The turnaround sheet's 3/4 front view faces left; the engine assumes every drawing faces right and mirrors it to face
left. Run this after any export of assets/img/pups to mirror the 3/4 front layers (images, boxes, pivots, eyes, mouth).
It is safe to run once per export: it records that the flip was done in meta.json."""
import cv2, json, os
OUT = os.path.join(os.path.dirname(os.path.abspath(__file__)), '..', '..', '..', 'assets', 'img', 'pups') + os.sep
meta = json.load(open(OUT + 'meta.json'))
for name in ('tb-34front', 'sf-34front'):
    m = meta[name]
    if m.get('faces') == 'right': continue
    W = m['w']
    for p, lay in m['layers'].items():
        im = cv2.imread(OUT + name + '-' + p + '.png', cv2.IMREAD_UNCHANGED); cv2.imwrite(OUT + name + '-' + p + '.png', cv2.flip(im, 1))
        lay['x'] = W - (lay['x'] + lay['w'])
        if 'px' in lay: lay['px'] = W - lay['px']
    m['eyes'] = [[W - x, y, r] for x, y, r in m['eyes']][::-1]
    m['mouth']['x'] = W - m['mouth']['x']; m['mouth']['side'] = -m['mouth']['side'] if m['mouth']['side'] else 0
    m['faces'] = 'right'
json.dump(meta, open(OUT + 'meta.json', 'w')); print('3/4 front views face right')
