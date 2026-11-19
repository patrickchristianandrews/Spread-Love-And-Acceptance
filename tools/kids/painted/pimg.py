"""pimg.py: the painted Tidbit and Sugarfoot as images for the books (owner, Nov 17 2026: the painted look everywhere,
"including the books and the coloring books"). render.js paints them large with the site's own painted pups (pups.js),
lineart.py turns each into coloring-book line art.

    img(who, pose, mode, eyes='open', key=None) -> dict(href, w, h, paw, head, unit)
      pose: 'sit' (the painted three-quarter view), 'run' (the same, standing), 'lie' (the side view)
      mode: 'color' (the painting), 'line' (coloring line art), 'ink' (the painting in grays, for a one-ink interior)
      key: anything that names the scene; it picks the outfit item, so each scene gets a different one (Tidbit always
      wears something purple and Sugarfoot something pink; owner, Nov 3 2026)."""
import base64, io, json, os, zlib
D = os.path.dirname(os.path.abspath(__file__))
IDX = json.load(open(os.path.join(D, 'index.json')))
OUTFITS = ['hat', 'cap', 'bow', 'bandana', 'necklace']
_cache = {}
PUB = os.path.join(D, '..', '..', '..', 'book', 'kids', 'src', 'pups')


def outfit(who, key):
    return OUTFITS[zlib.crc32(('%s|%s' % (key, who)).encode()) % len(OUTFITS)]


def img(who, pose, mode='color', eyes='open', key=None, wear=None):
    pose = {'stand': 'sit', 'walk': 'run', 'run': 'run', 'jump': 'run', 'sit': 'sit', 'lie': 'lie', 'sleep': 'lie', 'wiggle': 'run', 'front': 'front'}.get(pose, 'sit')
    wear = wear or outfit(who, key)
    name = '%s-%s-%s-%s' % (who, pose, wear, 'shut' if eyes == 'shut' else 'open')
    ck = (name, mode)
    if ck not in _cache:
        info = dict(IDX[name])
        if mode == 'line':   # vector line art (lineart_v.py): drawn into the page itself, crisp at any size
            import re
            svg = open(os.path.join(D, 'line', name + '.svg')).read()
            info['svg'] = svg[svg.index('<g class="pupline">'):svg.rindex('</svg>')]
            _cache[ck] = info
            return info
        else:
            data = open(os.path.join(D, 'png', name + '.png'), 'rb').read()
            if mode == 'ink':
                from PIL import Image
                im = Image.open(io.BytesIO(data)).convert('LA'); b = io.BytesIO(); im.save(b, 'PNG'); data = b.getvalue()
        # one shared file per picture, next to the book sources (the books are printed from the local site, so a site path
        # works for every book; a picture used on many pages is stored once)
        os.makedirs(PUB, exist_ok=True)
        fn = '%s-%s.png' % (name, mode)
        dst = os.path.join(PUB, fn)
        if not os.path.exists(dst) or open(dst, 'rb').read() != data:
            open(dst, 'wb').write(data)
        info['href'] = '/book/kids/src/pups/' + fn
        _cache[ck] = info
    return _cache[ck]


_USE = [0]


def svg_image(info, k, flip=False, clip=None):
    """the <image>, placed so the paws are at (0, 0) and k page units per pixel; facing right (flip: left).
    clip: (x0, y0, x1, y1) in the same units to show only part of it (a pup peeking over a ledge)"""
    x, y, w, h = -info['paw'][0] * k, -info['paw'][1] * k, info['w'] * k, info['h'] * k
    t = ' transform="scale(-1 1)"' if flip else ''
    if 'svg' in info:   # the line art: its own paths, scaled and moved so the paws are at (0, 0); its clip id made unique
        _USE[0] += 1
        g = info['svg'].replace('id="cl-', 'id="u%d-cl-' % _USE[0]).replace('url(#cl-', 'url(#u%d-cl-' % _USE[0])
        return '<g%s><g transform="translate(%.2f %.2f) scale(%.5f)">%s</g></g>' % (t, x, y, k, g)
    return '<g%s><image href="%s" x="%.2f" y="%.2f" width="%.2f" height="%.2f" preserveAspectRatio="none"/></g>' % (t, info['href'], x, y, w, h)
