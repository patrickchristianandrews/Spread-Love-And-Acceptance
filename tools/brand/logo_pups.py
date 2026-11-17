#!/usr/bin/env python3
"""logo_pups.py: Tidbit and Sugarfoot in the logo and the app icon, drawn exactly as in Frequency Buddies (owner, Nov 1 2026:
"make sure they look themselves everywhere").

The logo files keep Peach and Lilac and the heart as they are; only the two pup groups are swapped for the cartoon's own
drawing (tools/kids/fbpups.py, a copy of assets/js/pups.js), seen from the side as in the episodes: Sugarfoot on the left
facing right, Tidbit on the right facing left, sitting face to face with clear space between them (they never overlap).
The app icon has just their two heads, face to face, a little apart.

    python3 tools/brand/logo_pups.py        rewrites the SVGs in place (run again any time; it finds the groups by position)
Then the PNG copies are made from the SVGs: tools/brand/logo_png.js.
"""
import os
import re
import sys

ROOT = os.path.abspath(os.path.join(os.path.dirname(__file__), '..', '..'))
sys.path.insert(0, os.path.join(ROOT, 'tools', 'kids'))
import fbpups as F  # noqa: E402

# owner, Nov 17 2026: the painted Tidbit and Sugarfoot everywhere (assets/js/pups.js), the logo and the icon too. Each
# pup is the painted render from tools/kids/painted (render.js), small and embedded as WebP, wearing its color
# (Tidbit purple, Sugarfoot pink). A halo group (the icon's white sticker edge) is the pup's own shape, grown and white.
import base64, io, json  # noqa: E402
from PIL import Image  # noqa: E402
PDIR = os.path.join(ROOT, 'tools', 'kids', 'painted')
PIDX = json.load(open(os.path.join(PDIR, 'index.json')))
WEAR = {'tidbit': 'bandana', 'sugarfoot': 'bow'}


def _webp(name, h):
    im = Image.open(os.path.join(PDIR, 'png', name + '.png')).convert('RGBA')
    k = h / im.height
    im = im.resize((max(1, round(im.width * k)), h), Image.LANCZOS)
    b = io.BytesIO(); im.save(b, 'WEBP', quality=88, method=6)
    return 'data:image/webp;base64,' + base64.b64encode(b.getvalue()).decode(), k


def painted_group(who, x, y, s, left=False, halo=False, head_only=False):
    name = '%s-sit-%s-open' % (who, WEAR[who])
    info = PIDX[name]
    u = s / info['unit'] * (0.84 if head_only else 1.0)   # SVG units per painted pixel (the icon's heads a little smaller)
    href, k = _webp(name, 220 if head_only else 160)
    w, h = info['w'] * u, info['h'] * u
    px, py = info['paw'][0] * u, info['paw'][1] * u
    hx, hy = info['head'][0] * u - px, info['head'][1] * u - py
    if head_only:   # the head centred on (x, y)
        ox, oy = -hx, -hy
    else:           # the paws on (x, y)
        ox, oy = 0.0, 0.0
    flip = ' transform="translate(%.2f %.2f) scale(-1 1)"' % (x, y) if left else ' transform="translate(%.2f %.2f)"' % (x, y)
    img = '<image href="%s" x="%.2f" y="%.2f" width="%.2f" height="%.2f" preserveAspectRatio="none"/>' % (href, ox - px, oy - py, w, h)
    clip = ''
    if head_only:
        cid = 'hc-%s' % who
        clip = '<defs><clipPath id="%s"><circle cx="0" cy="0" r="%.2f"/></clipPath></defs>' % (cid, 0.33 * w)
        img = '<g clip-path="url(#%s)">%s</g>' % (cid, img)
    if halo:
        fid = 'halo-%s%s' % (who, '-h' if head_only else '')
        return ('<defs><filter id="%s" x="-20%%" y="-20%%" width="140%%" height="140%%"><feMorphology in="SourceAlpha" operator="dilate" radius="%.2f" result="d"/>'
                '<feFlood flood-color="#fff"/><feComposite in2="d" operator="in"/></filter></defs><g%s filter="url(#%s)">%s</g>') % (fid, 2.2 * s, flip, fid, img)
    return '%s<g%s>%s</g>' % (clip, flip, img)


F.svg_group = painted_group

LOGOS = ['assets/img/logo-mark.svg', 'assets/img/logo-mark-wink.svg', 'assets/img/logo-mark-dark.svg', 'assets/img/logo.svg',
         'assets/img/logo-stacked.svg', 'brand.html']
ICONS = ['assets/icons/icon.svg']
# the logo: the pups' paws on y 117, Sugarfoot left, Tidbit right (the old front-facing pups sat at x 32 and 94)
BODY = {'32': ('sugarfoot', 25, False), '94': ('tidbit', 103, True)}
BS, BY = 0.8, 117   # facing each other with clear space between them: they never overlap (owner, Nov 1 2026)
# the icon: two heads nose to nose
HEAD = {'37': ('sugarfoot', 27, False), '94': ('tidbit', 101, True)}
HS, HY = 1.5, 62   # face to face with a clear gap


def swap(s, pat, table, build):
    def rep(m):
        key, attrs = m.group(1), m.group(3) or ''
        j = s.index('</g>', m.end())
        return None, j
    out, pos = [], 0
    for m in re.finditer(pat, s):
        if m.start() < pos:
            continue
        # the group's own closing tag (groups may hold groups)
        depth, j = 1, m.end()
        while depth:
            o, c = s.find('<g', j), s.find('</g>', j)
            if o != -1 and o < c and s[o + 2] in ' >':
                depth += 1; j = o + 2
            else:
                depth -= 1; j = c if depth == 0 else c + 4
        key, attrs = m.group(1), m.group(2) or ''
        who, x, left = table[key]
        halo = 'stroke-width' in attrs
        out.append(s[pos:m.start()])
        out.append('<g data-pup="%s"%s>%s</g>' % (who, attrs, build(who, x, left, halo)))
        pos = j + 4
    out.append(s[pos:])
    return ''.join(out)


def main():
    n = 0
    for f in LOGOS:
        p = os.path.join(ROOT, f)
        s = open(p).read()
        pat = r'<g (?:transform="translate\((32|94) 78\)"|data-pup="\w+")( [^>]*)?>'
        # a second run finds its own groups by data-pup: map them back to the table keys
        s = re.sub(r'<g data-pup="sugarfoot"', '<g transform="translate(32 78)"', s)
        s = re.sub(r'<g data-pup="tidbit"', '<g transform="translate(94 78)"', s)
        s2 = swap(s, r'<g transform="translate\((32|94) 78\)"( [^>]*)?>', BODY,
                  lambda who, x, left, halo: F.svg_group(who, x, BY, BS, left=left, halo=halo))
        open(p, 'w').write(s2)
        n += 1
    for f in ICONS:
        p = os.path.join(ROOT, f)
        s = open(p).read()
        s = re.sub(r'<g data-pup="sugarfoot"', '<g transform="translate(37 58) scale(1.45)"', s)
        s = re.sub(r'<g data-pup="tidbit"', '<g transform="translate(94 58) scale(1.45)"', s)
        halo_seen = {}

        def build(who, x, left, halo, _seen=halo_seen):
            # the icon's first pair of groups is the white sticker edge (its parent <g> sets fill and stroke)
            first = who not in _seen
            _seen[who] = True
            return F.svg_group(who, x, HY, HS, left=left, head_only=True, halo=first)
        s2 = swap(s, r'<g transform="translate\((37|94) 58\) scale\(1\.45\)"( [^>]*)?>', HEAD, build)
        open(p, 'w').write(s2)
        n += 1
    print('logo_pups: %d files' % n)


if __name__ == '__main__':
    main()
