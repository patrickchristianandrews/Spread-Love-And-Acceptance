#!/usr/bin/env python3
"""logo_png.py: the picture copies of the logo and app icon, redrawn after the logo SVGs change (tools/brand/logo_pups.py).

    python3 tools/brand/logo_png.py OLD_LOGO_MARK_SVG

Plain copies (transparent): logo-mark.png, logo-mark-wink.png, logo.png, logo-stacked.png, favicon-16/32.png, favicon.ico.
Copies on a background (the app icons, apple-touch icons, assets/img/og-image.png): the old logo is found in the picture
(OLD_LOGO_MARK_SVG is the logo-mark.svg they were made from), painted out, the soft background filled back in, and the new
logo-mark.svg drawn in exactly the same place and size, so everything else in the picture stays as it was.
"""
import io
import json
import os
import subprocess
import sys

import numpy as np
from PIL import Image
from scipy import ndimage

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
OLD = os.path.abspath(sys.argv[1])
NODE = r'''
const fs = require('fs'); const { chromium } = require('playwright');
(async () => {
  const jobs = JSON.parse(fs.readFileSync(process.argv[1], 'utf8'));
  const b = await chromium.launch({ executablePath: fs.existsSync('/opt/pw-browsers/chromium') ? '/opt/pw-browsers/chromium' : undefined });
  for (const j of jobs) {
    const p = await b.newPage({ viewport: { width: j.w, height: j.h } });
    const html = require('path').join(require('os').tmpdir(), 'logo_png_' + require('path').basename(j.out) + '.html');   // a file page (so the file:// picture may load), kept out of the site
    fs.writeFileSync(html, '<html><body style="margin:0;background:transparent"><img src="file://' + j.svg + '" style="display:block;width:' + j.w + 'px;height:' + j.h + 'px"></body></html>');
    await p.goto('file://' + html);
    const ok = await p.evaluate(() => { const im = document.querySelector('img'); return im.complete && im.naturalWidth > 0; });
    if (!ok) { console.error('picture did not load: ' + j.svg); process.exit(1); }
    await p.waitForTimeout(100);
    await p.screenshot({ path: j.out, omitBackground: true });
    await p.close();
  }
  await b.close();
})();
'''
TMP = os.environ.get('LOGO_TMP', '/tmp/logo_png')   # a short path: the browser will not start from a very long temporary folder
os.makedirs(TMP, exist_ok=True)


def render(jobs):
    jf = os.path.join(TMP, 'jobs.json')
    json.dump(jobs, open(jf, 'w'))
    env = dict(os.environ)
    env['NODE_PATH'] = subprocess.run(['npm', 'root', '-g'], capture_output=True, text=True).stdout.strip()
    subprocess.run(['node', '-e', NODE, jf], check=True, env=env)


def A(*p):
    return os.path.join(ROOT, *p)


def logo_bbox_units(svg):
    """the logo's drawn part, in its own 128-unit box"""
    out = os.path.join(TMP, 'probe.png')
    render([{'svg': svg, 'w': 1280, 'h': 1280, 'out': out}])
    a = np.array(Image.open(out))[..., 3]
    ys, xs = np.where(a > 8)
    return xs.min() / 10, ys.min() / 10, (xs.max() + 1) / 10, (ys.max() + 1) / 10


def found_bbox(im, xmax=None):
    """where the logo is in a picture on a soft background: the pixels far from a smooth background guess"""
    a = np.asarray(im.convert('RGB')).astype(float)
    h, w, _ = a.shape
    c = [a[2, 2], a[2, w - 3], a[h - 3, 2], a[h - 3, w - 3]]
    yy, xx = np.mgrid[0:h, 0:w]
    u, v = (xx / (w - 1))[..., None], (yy / (h - 1))[..., None]
    bg = c[0] * (1 - u) * (1 - v) + c[1] * u * (1 - v) + c[2] * (1 - u) * v + c[3] * u * v
    d = np.abs(a - bg).sum(2) > 40
    if xmax:
        d[:, xmax:] = False
    ys, xs = np.where(d)
    return xs.min(), ys.min(), xs.max() + 1, ys.max() + 1


def redo_on_background(path, xmax=None, box=None):
    """box: (x0, y0, x1, y1) of the area to search, for a small logo beside other things (the start pages' footer)"""
    im = Image.open(path).convert('RGB')
    W, H = im.size
    ux0, uy0, ux1, uy1 = U_OLD
    if box:
        bx0, by0, bx1, by1 = found_bbox(im.crop(box))
        bx0, by0, by1 = bx0 + box[0], by0 + box[1], by1 + box[1]
        k = (by1 - by0) / (uy1 - uy0)        # beside text the width is unsure: go by the height
    else:
        bx0, by0, bx1, by1 = found_bbox(im, xmax)
        k = (bx1 - bx0) / (ux1 - ux0)        # pixels per logo unit
    size = int(round(128 * k))
    left, top = int(round(bx0 - ux0 * k)), int(round(by0 - uy0 * k))
    po, pn = os.path.join(TMP, 'o.png'), os.path.join(TMP, 'n.png')
    render([{'svg': OLD, 'w': size, 'h': size, 'out': po}, {'svg': A('assets/img/logo-mark.svg'), 'w': size, 'h': size, 'out': pn}])
    old, new = Image.open(po), Image.open(pn)
    # the old logo's footprint (with its soft glow), grown a little, painted out with the surrounding background
    m = np.zeros((H, W), bool)
    oa = np.asarray(old)[..., 3] > 3
    ys, xs = np.where(oa)
    ys2, xs2 = ys + top, xs + left
    ok = (ys2 >= 0) & (ys2 < H) & (xs2 >= 0) & (xs2 < W)
    m[ys2[ok], xs2[ok]] = True
    m = ndimage.binary_dilation(m, iterations=max(2, int(k * 1.5)))
    a = np.asarray(im).astype(float)
    known = (~m).astype(float)
    filled = a.copy()
    for sig in (W / 6, W / 12, W / 30):
        num = np.stack([ndimage.gaussian_filter(a[..., i] * known, sig) for i in range(3)], -1)
        den = ndimage.gaussian_filter(known, sig)[..., None]
        est = num / np.maximum(den, 1e-6)
        filled[m] = est[m]
    out = Image.fromarray(np.clip(filled, 0, 255).astype(np.uint8)).convert('RGBA')
    out.alpha_composite(new, (left, top)) if left >= 0 and top >= 0 else out.paste(new, (left, top), new)
    out.convert('RGB').save(path, optimize=True)
    print('%s: logo %dpx at %d,%d' % (os.path.relpath(path, ROOT), size, left, top))


U_OLD = None


def main():
    global U_OLD
    U_OLD = logo_bbox_units(OLD)
    # plain copies
    jobs = [{'svg': A('assets/img/logo-mark.svg'), 'w': 512, 'h': 512, 'out': A('assets/img/logo-mark.png')},
            {'svg': A('assets/img/logo-mark-wink.svg'), 'w': 512, 'h': 512, 'out': A('assets/img/logo-mark-wink.png')},
            {'svg': A('assets/img/logo.svg'), 'w': 1440, 'h': 312, 'out': A('assets/img/logo.png')},
            {'svg': A('assets/img/logo-stacked.svg'), 'w': 720, 'h': 800, 'out': A('assets/img/logo-stacked.png')},
            {'svg': A('assets/icons/icon.svg'), 'w': 16, 'h': 16, 'out': A('assets/icons/favicon-16.png')},
            {'svg': A('assets/icons/icon.svg'), 'w': 32, 'h': 32, 'out': A('assets/icons/favicon-32.png')},
            {'svg': A('assets/icons/icon.svg'), 'w': 48, 'h': 48, 'out': os.path.join(TMP, 'fav48.png')}]
    render(jobs)
    for j in jobs[:6]:
        Image.open(j['out']).save(j['out'], optimize=True)
    Image.open(A('assets/icons/favicon-32.png')).save(A('favicon.ico'), sizes=[(16, 16), (32, 32), (48, 48)])
    print('plain copies done')
    for f in ('assets/icons/icon-512.png', 'assets/icons/icon-192.png', 'assets/icons/icon-maskable-512.png', 'assets/icons/icon-maskable-192.png',
              'assets/icons/apple-touch-icon-152.png', 'assets/icons/apple-touch-icon-167.png', 'assets/icons/apple-touch-icon-180.png'):
        redo_on_background(A(f))
    for f in ('assets/icons/apple-touch-icon.png', 'apple-touch-icon.png'):
        Image.open(A('assets/icons/apple-touch-icon-180.png')).save(A(f), optimize=True)
    redo_on_background(A('assets/img/og-image.png'), xmax=440)
    for f in ('start-chores', 'start-breakup', 'start-text-check'):
        p = A('assets/img/og/%s.png' % f)
        H = Image.open(p).size[1]
        redo_on_background(p, box=(0, H - 130, 140, H))


if __name__ == '__main__':
    main()
