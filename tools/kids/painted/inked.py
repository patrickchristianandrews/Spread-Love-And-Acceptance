#!/usr/bin/env python3
"""inked.py: Tidbit and Sugarfoot inked by hand over the site's own painted pups (owner, Nov 17 2026: the coloring books must
look like "Tidbit and Sugarfoot's current version on the site"). Each view of each pup (the three-quarter view and the side
view, from tools/pups3/poses.webp) is drawn as clean curves on top of the painting: the outline, the ears, the face, the
markings (Tidbit: tan brow dots, tan muzzle, cream chest star, tan socks, pale tail tip; Sugarfoot: white blaze, tan cheeks
and brows, cream muzzle, big fluffy cream bib, cream paws, fluffy pale tail tip). Points are in sprite pixels from the head
centre (the painting's own coordinates), so the drawing sits exactly on the painted pup.
    python3 tools/kids/painted/inked.py overlay <out.svg>   the inking over the painting, to check it
    python3 tools/kids/painted/inked.py lines               writes line/<name>.svg for every render (outfits drawn on)"""
import json, os, sys, base64, io
D = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, D)

# ------------------------------------------------------------------ the inking (sprite pixels, head centre at 0, 0)
# 'out' closed outline; 'lines' open curves; 'shapes' closed inner shapes; 'dots' (x, y, rx, ry) small ovals to color
INK = {
    (0, 1): dict(  # Tidbit, three-quarter view
        out=[(0, -20.5), (10, -20), (17.5, -16.5), (22.5, -9), (24, 0), (22.5, 7), (20, 10.5), (17, 13), (16, 18.5), (12.5, 18.5), (9, 16), (5.5, 16.5),
             (10, 20), (12.5, 28), (11, 38), (10, 47), (10.5, 60), (10, 69), (8.5, 73), (-1.5, 73), (-3.5, 66), (-4, 55), (-6.5, 51),
             (-8.5, 58), (-8.5, 69), (-9, 75.5), (-20.5, 75.5), (-22, 67), (-22.5, 56), (-26, 51), (-30, 50), (-32, 57), (-32.5, 68), (-34, 71.5),
             (-44, 72), (-45.5, 66), (-46, 55), (-47, 44), (-46.5, 37), (-50, 35.5), (-54.5, 31), (-54, 25), (-51.5, 21), (-48, 24), (-44, 27.5),
             (-38, 25), (-30, 21), (-21, 16), (-24.5, 13.5), (-30, 8), (-34, 0), (-34, -7), (-30, -13), (-24, -17), (-12, -20.5)],
        lines=[[(-15, -16.5), (-13, -6), (-13, 4), (-15, 11), (-21, 15)],          # left ear's front edge
               [(17, -15), (16.5, -5), (17, 3), (19.5, 9)],                         # right ear's front edge
               [(-10, 1), (-9, 8), (-4, 13.5), (3, 16.5), (9, 17.5)],              # the tan muzzle, round the cheek and chin
               [(-10, 1), (-4, 2.5), (3, 2.5), (11, 1)],                            # the muzzle's top edge, under the eyes
               [(-1, 8), (5, 11.3), (10.5, 12)],                                    # the mouth
               [(-46, 53), (-39.5, 51.5), (-33, 53)], [(-24, 55), (-16.5, 53.5), (-9, 55)], [(-5, 50), (2.5, 48.5), (10, 50)],   # tan socks
               [(-45.5, 66.5), (-39.5, 65.5), (-33.5, 66.5)], [(-23, 68.5), (-16, 67.5), (-9, 68.5)], [(-3.5, 67), (3, 66), (10, 67)],  # cream paws
               [(-48.5, 24.5), (-49.8, 31), (-49, 37.5)]],                          # the tail's pale tip
        shapes=[[(-3, 23.3), (4.2, 24.4), (5.9, 31), (10.3, 35.6), (7, 42), (0.9, 47.5), (-5.2, 43.3), (-9.7, 37.8), (-6.3, 33.3), (-4.1, 27.8)],   # the cream chest star
                [(10, 11.5), (15.5, 12), (16, 17), (13, 19), (10.5, 16)]],           # the tongue
        dots=[(-1.9, -11.3, 2.5, 2.0), (9.2, -12.2, 2.3, 1.9)],                    # tan brow dots
        nose=(16.5, 2, 3.2, 2.6)),
    (0, 2): dict(  # Tidbit, side view
        out=[(10.4, -18.8), (4.2, -21.3), (-2.8, -21.4), (-15.9, -14.9), (-24.7, -3.8), (-24.2, 0.8), (-19.6, 9.8), (-26.8, 16.8), (-42.9, 18.1), (-59.6, 26.5), (-64.1, 25.6), (-66.7, 20.2), (-73.2, 24.7), (-74.9, 31.8), (-72.7, 38.0), (-65.9, 42.8), (-58.4, 44.1), (-58.3, 50.1), (-60.6, 56.0), (-59.2, 68.7), (-56.7, 73.2), (-47.9, 74.2), (-43.4, 70.8), (-36.1, 69.5), (-35.4, 65.7), (-40.1, 62.0), (-40.2, 57.6), (-30.3, 47.5), (-20.2, 51.6), (-16.1, 69.2), (-13.4, 73.5), (-4.4, 74.3), (1.7, 70.1), (1.9, 66.1), (-2.9, 62.7), (-3.6, 57.8), (-0.8, 46.6), (5.1, 38.8), (6.9, 30.7), (6.1, 19.3), (9.4, 16.2), (22.2, 17.7), (23.1, 15.3), (21.7, 10.8), (25.9, 7.3), (28.4, 1.3), (26.8, -2.3), (17.4, -5.3), (15.3, -13.7)],
        lines=[[(5, -16), (3, -6), (2, 4), (0, 11), (-6, 15), (-14, 15), (-19.5, 11)],   # the ear, hanging over the cheek
               [(3, 1.5), (2.5, 8), (4, 14), (8, 17)], [(3, 1.5), (12, 2), (22, 1)],   # the tan muzzle
               [(9.8, 6.7), (17.6, 11), (21.4, 12.2)],                              # the mouth
               [(-61, 56), (-53.5, 54), (-46, 56)], [(-46, 54), (-41, 52.5), (-37, 54)], [(-18, 54), (-8, 52), (2, 54)],   # tan socks
               [(-60, 69), (-53, 68), (-46, 69)], [(-44, 66), (-39.5, 65), (-35, 66)], [(-16, 68), (-7, 66.5), (1, 68)],   # cream paws
               [(-46, 52), (-45, 60), (-44, 69)], [(-7, 50), (-6, 59), (-5, 68)],   # between the legs
               [(-64, 23), (-65, 31), (-66, 38)]],                                  # the tail's pale tip
        shapes=[[(1, 19), (5.5, 20), (6.5, 27), (5, 34), (4, 41), (1.5, 45), (-2, 40), (-3.5, 33), (-1, 26)],   # the cream chest
                [(17, 11.5), (22, 12), (23, 17), (20, 18.5), (17.5, 15)]],           # the tongue
        dots=[(11, -12.5, 2.8, 2.5)],                                               # her tan brow dot
        nose=(26, 0.5, 2.8, 2.4)),
    (1, 1): dict(  # Sugarfoot, three-quarter view
        out=[(12.4, -20.0), (-4.7, -21.6), (-12.6, -18.8), (-17.3, -19.5), (-19.5, -17.0), (-25.6, -15.0), (-36.2, -1.2), (-34.2, 6.2), (-28.7, 11.7), (-27.8, 15.0), (-39.2, 20.7), (-47.6, 22.3), (-57.1, 29.3), (-59.6, 36.2), (-57.5, 44.3), (-55.8, 45.7), (-48.8, 46.2), (-46.6, 49.5), (-47.1, 70.4), (-45.5, 73.3), (-38.6, 74.5), (-33.3, 72.5), (-34.5, 61.5), (-33.0, 58.5), (-27.8, 54.4), (-26.1, 68.3), (-19.6, 77.8), (-12.1, 78.9), (-7.0, 76.4), (-6.6, 72.9), (-9.6, 67.4), (-8.5, 59.5), (-2.0, 75.2), (5.4, 76.8), (12.0, 74.4), (11.7, 69.4), (6.0, 64.3), (6.5, 56.3), (8.4, 48.9), (13.2, 43.3), (17.4, 33.4), (18.9, 24.9), (16.8, 21.9), (16.2, 15.4), (19.4, 11.3), (23.5, 9.3), (26.7, -2.3), (25.9, -5.3), (18.9, -14.6)],
        lines=[[(-14, -15), (-11.5, -6), (-11, 3), (-13, 11), (-18, 16)],         # left ear's front edge
               [(17, -12), (17.5, -3), (18, 4), (19.5, 10)],                        # right ear's front edge
               [(-11, 1), (-12, 8), (-9, 13), (-4, 16)],                            # her tan cheek
               [(-5, 0), (-6, 6), (-4, 12), (1, 17), (7, 19.5)],                    # the cream muzzle
               [(1, -19.5), (1.5, -12), (1.5, -6), (-5, 0)], [(5.5, -19.5), (7, -12), (8, -5), (16, -2)],   # the white blaze, down into the muzzle
               [(-2.2, 6.9), (6, 11.3), (13.5, 10.8)],                              # the mouth
               [(-47, 52), (-40.5, 51), (-34, 52)], [(-26, 59), (-17, 58), (-8, 59)], [(-6, 55), (3, 54), (12, 55)],      # tan socks
               [(-47, 63), (-40.5, 62), (-34, 63)], [(-26, 67), (-17, 66), (-8, 67)], [(-6, 64), (3, 63), (12, 64)],      # cream paws
               [(-49, 27), (-50, 36), (-50, 45)]],                                  # the tail's pale plume
        shapes=[[(-3.9, 19), (2, 18.5), (8.3, 20), (11, 23), (12.8, 27), (12.5, 32), (11.7, 37), (10.8, 41.5), (9.4, 45.8), (7, 50), (3.9, 53.6), (0, 54.8), (-3.9, 54.7), (-6.5, 51.5), (-8.3, 48), (-9.2, 42.5), (-9.4, 37), (-9, 33.5), (-8.3, 30.2), (-7.4, 27.5), (-6.1, 24.7), (-5.2, 21.5)],   # the big fluffy cream bib
                [(7.5, 11), (14, 10.5), (14, 16), (11, 18), (8, 15)]],               # the tongue
        dots=[(-2, -13, 2.6, 1.8), (13, -13, 2, 1.6)],                             # tan brows
        nose=(12, 1.5, 3.6, 2.8)),
    (1, 2): dict(  # Sugarfoot, side view
        out=[(12.8, -18.9), (3.0, -22.8), (-13.5, -18.8), (-22.2, -10.3), (-22.2, -7.6), (-26.0, -2.6), (-24.8, 5.6), (-20.8, 9.9), (-25.2, 15.7), (-36.1, 15.0), (-47.3, 17.6), (-54.8, 23.1), (-63.0, 23.0), (-70.8, 24.9), (-76.1, 30.5), (-78.3, 39.9), (-75.1, 47.9), (-68.5, 49.4), (-66.1, 48.2), (-63.8, 50.0), (-58.5, 50.7), (-59.3, 57.7), (-58.3, 69.9), (-56.0, 75.0), (-46.2, 76.4), (-40.7, 72.5), (-34.7, 71.0), (-33.5, 67.4), (-37.8, 63.0), (-38.1, 59.7), (-29.5, 51.2), (-20.0, 56.2), (-14.6, 69.2), (-9.8, 76.1), (0.7, 77.0), (7.3, 71.9), (7.7, 67.7), (2.2, 63.4), (1.8, 57.7), (3.5, 51.4), (11.0, 44.7), (16.8, 32.1), (17.0, 24.1), (13.4, 17.6), (14.9, 16.2), (24.2, 15.6), (23.0, 9.1), (27.9, 5.4), (30.2, -0.5), (28.9, -4.0), (19.0, -7.1), (16.4, -14.4)],
        lines=[[(2, -16), (0.5, -6), (0.5, 4), (-1, 12), (-8, 16), (-16, 15), (-20.5, 10)],   # the ear, hanging over the cheek
               [(2, -1), (1.5, 6), (3, 12), (7, 16)], [(10, -3), (9, 4), (11, 10)],  # the tan cheek, the cream muzzle
               [(11.8, 5), (19.6, 10), (23.4, 11.1)],                               # the mouth
               [(6, 17), (3, 28), (1.5, 36), (-1.5, 40), (1.5, 47), (5, 51)],      # the big fluffy cream bib
               [(-36, 44), (-40, 52), (-45, 57)],                                   # the back leg's thigh
               [(-59, 58), (-51, 56.5), (-43, 58)], [(-45, 56), (-39, 54.5), (-34, 56)], [(-16, 55), (-5, 53.5), (5, 55)],   # tan socks
               [(-58, 67), (-50, 66), (-42, 67)], [(-43, 65), (-38.5, 64), (-34, 65)], [(-14, 66), (-3, 64.5), (8, 66)],      # cream paws
               [(-44, 56), (-43, 62), (-42, 68)], [(-2, 54), (-1, 61), (0, 68)],   # between the legs
               [(-63, 24), (-64.5, 36), (-64, 48)]],                                # the tail's pale plume
        shapes=[[(8.5, -17), (13, -18), (16, -14), (14, -11.5), (10, -12)],         # the white blaze on her brow
                [(-3, -13), (-1, -14), (0, -8), (-0.5, -3), (-2.5, -4), (-3.2, -9)],   # the tan mark by her eye
                [(19.5, 10.5), (24, 10.5), (25, 15.5), (22.5, 16.5), (20, 14)]],     # the tongue
        dots=[],
        nose=(28, 0, 2.8, 2.4)),
}


def smooth(pts, closed=True, k=1.0):
    n = len(pts); P = (lambda i: pts[i % n]) if closed else (lambda i: pts[max(0, min(n - 1, i))])
    d = 'M%.2f %.2f' % (pts[0][0] * k, pts[0][1] * k)
    for i in range(n if closed else n - 1):
        p0, p1, p2, p3 = P(i - 1), P(i), P(i + 1), P(i + 2)
        c1 = (p1[0] + (p2[0] - p0[0]) / 6, p1[1] + (p2[1] - p0[1]) / 6); c2 = (p2[0] - (p3[0] - p1[0]) / 6, p2[1] - (p3[1] - p1[1]) / 6)
        d += ' C%.2f %.2f %.2f %.2f %.2f %.2f' % (c1[0] * k, c1[1] * k, c2[0] * k, c2[1] * k, p2[0] * k, p2[1] * k)
    return d + ('Z' if closed else '')


def drawing(key, eyes='open', lw=0.9, k=1.0, color='#111', fill='#fff'):
    """the inking as SVG in sprite pixels (times k); lw: the outline width in sprite pixels"""
    from lineart_v import _E
    I = INK[key]; o = []
    global _CID
    _CID = globals().get('_CID', 0) + 1; cid = 'ik%d' % _CID
    o.append('<defs><clipPath id="%s"><path d="%s"/></clipPath></defs>' % (cid, smooth(I['out'], True, k)))
    o.append('<path d="%s" fill="%s" stroke="none"/>' % (smooth(I['out'], True, k), fill))
    o.append('<g clip-path="url(#%s)">' % cid)
    for s in I['shapes']:
        o.append('<path d="%s" fill="%s" stroke="%s" stroke-width="%.2f" stroke-linejoin="round"/>' % (smooth(s, True, k), fill, color, lw * 0.5 * k))
    for (x, y, rx, ry) in I['dots']:
        # a brow mark: a small, flat, slightly tilted oval, so it reads as an eyebrow and never as another eye
        o.append('<ellipse cx="%.2f" cy="%.2f" rx="%.2f" ry="%.2f" transform="rotate(%d %.2f %.2f)" fill="%s" stroke="%s" stroke-width="%.2f"/>' % (x * k, (y - 0.6) * k, rx * 0.95 * k, ry * 0.5 * k, -12 if x < 4 else 12, x * k, (y - 0.6) * k, fill, color, lw * 0.4 * k))
    for l in I['lines']:
        o.append('<path d="%s" fill="none" stroke="%s" stroke-width="%.2f" stroke-linecap="round" stroke-linejoin="round"/>' % (smooth(l, False, k), color, lw * 0.5 * k))
    o.append('</g>')
    for (ex, ey, er) in _E[key]:
        r = er * 0.8 * k
        if eyes == 'open':
            o.append('<ellipse cx="%.2f" cy="%.2f" rx="%.2f" ry="%.2f" fill="%s"/>' % (ex * k, ey * k, r, r * 1.08, color))
            o.append('<circle cx="%.2f" cy="%.2f" r="%.2f" fill="#fff"/>' % (ex * k - r * 0.32, ey * k - r * 0.38, r * 0.34))
        else:
            o.append('<path d="M%.2f %.2f Q%.2f %.2f %.2f %.2f" fill="none" stroke="%s" stroke-width="%.2f" stroke-linecap="round"/>' % (ex * k - r, ey * k, ex * k, ey * k + r * 0.8, ex * k + r, ey * k, color, lw * 0.5 * k))
    nx, ny, nrx, nry = I['nose']
    o.append('<path d="M%.2f %.2f C%.2f %.2f %.2f %.2f %.2f %.2f C%.2f %.2f %.2f %.2f %.2f %.2fZ" fill="%s"/>' % (
        (nx - nrx) * k, (ny - nry * 0.3) * k, (nx - nrx) * k, (ny - nry * 1.3) * k, (nx + nrx) * k, (ny - nry * 1.3) * k, (nx + nrx) * k, (ny - nry * 0.3) * k,
        (nx + nrx * 0.9) * k, (ny + nry) * k, (nx - nrx * 0.9) * k, (ny + nry) * k, (nx - nrx) * k, (ny - nry * 0.3) * k, color))
    o.append('<ellipse cx="%.2f" cy="%.2f" rx="%.2f" ry="%.2f" fill="#fff"/>' % ((nx - nrx * 0.35) * k, (ny - nry * 0.55) * k, nrx * 0.3 * k, nry * 0.22 * k))
    o.append('<path d="%s" fill="none" stroke="%s" stroke-width="%.2f" stroke-linejoin="round"/>' % (smooth(I['out'], True, k), color, lw * k))
    return ''.join(o)


def overlay(out, only=None):
    from PIL import Image
    M = json.load(open(os.path.join(D, '..', '..', 'pups3', 'meta.json')))
    sheet = Image.open(os.path.join(D, '..', '..', 'pups3', 'poses.webp')).convert('RGBA')
    Z = 9; parts = []; x = 0
    for key in INK:
        if only and key != only:
            continue
        f = [p for p in M['poses'] if p['dog'] == key[0] and p['ang'] == key[1]][0]
        X0, Y0 = f['c'] * 128 + f['x0'] - 4, f['r'] * 128 + f['y0'] - 4; X1, Y1 = f['c'] * 128 + f['x1'] + 4, f['r'] * 128 + f['y1'] + 4
        crop = sheet.crop((X0, Y0, X1, Y1)); b = io.BytesIO(); crop.save(b, 'PNG')
        hx, hy = f['c'] * 128 + f['hx'] - X0, f['r'] * 128 + f['hy'] - Y0
        img = '<image href="data:image/png;base64,%s" x="0" y="0" width="%d" height="%d" opacity="1" style="image-rendering:pixelated"/>' % (base64.b64encode(b.getvalue()).decode(), crop.width * Z, crop.height * Z)
        grid = ''.join('<line x1="%.1f" x2="%.1f" y1="0" y2="%d" stroke="#9cf" stroke-width="0.6"/>' % ((hx + g) * Z, (hx + g) * Z, crop.height * Z) for g in range(-80, 60, 4) if 0 <= hx + g <= crop.width)
        grid += ''.join('<line y1="%.1f" y2="%.1f" x1="0" x2="%d" stroke="#9cf" stroke-width="0.6"/>' % ((hy + g) * Z, (hy + g) * Z, crop.width * Z) for g in range(-40, 90, 4) if 0 <= hy + g <= crop.height)
        lab = ''.join('<text x="%.1f" y="12" font-size="11" fill="#c00">%d</text>' % ((hx + g) * Z + 2, g) for g in range(-80, 60, 8) if 0 <= hx + g <= crop.width)
        lab += ''.join('<text x="2" y="%.1f" font-size="11" fill="#c00">%d</text>' % ((hy + g) * Z - 2, g) for g in range(-40, 90, 8) if 0 <= hy + g <= crop.height)
        parts.append('<g transform="translate(%d %d)">%s%s%s<g transform="translate(%.1f %.1f) scale(%d)" opacity="0.9">%s</g></g>' % (0, 0, img, grid, lab, hx * Z, hy * Z, Z, drawing(key, lw=0.5, color='#e00', fill='none')))
        x = crop.width * Z
    open(out, 'w').write('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="%d"><rect width="100%%" height="100%%" fill="#fff"/>%s</svg>' % (x, 1000, ''.join(parts)))


def clean(out):
    parts = []; x = 70
    for key in INK:
        parts.append('<g transform="translate(%d 100) scale(3.2)">%s</g>' % (x + (220 if key[1] == 1 else 270), drawing(key, lw=1.6)))
        x += 400
    open(out, 'w').write('<svg xmlns="http://www.w3.org/2000/svg" width="%d" height="360"><rect width="100%%" height="100%%" fill="#fff"/>%s</svg>' % (x, ''.join(parts)))


def lines():
    """line/<name>.svg for every render (render.js): the inking placed on the render's head point, the outfit drawn on"""
    from lineart_v import outfit_svg
    idx = json.load(open(os.path.join(D, 'index.json'))); os.makedirs(os.path.join(D, 'line'), exist_ok=True)
    for name, info in idx.items():
        who, pose, wear, eyes = name.split('-')
        key = (0 if who == 'tidbit' else 1, 1 if pose == 'sit' else 2)
        U = info['unit']; k = 0.52 * U; hx, hy = info['head']
        if pose == 'run':   # the walk frames' head sits elsewhere: put the side view's paws on the render's paws
            M = json.load(open(os.path.join(D, '..', '..', 'pups3', 'meta.json')))
            f = [p for p in M['poses'] if p['dog'] == key[0] and p['ang'] == 2][0]
            hx = info['paw'][0] + (f['hx'] - (f['x0'] + f['x1']) / 2) * k; hy = info['paw'][1] + (f['hy'] - f['y1']) * k
        body = drawing(key, eyes, lw=1.7)
        cid = 'cl-' + name
        g = '<g class="pupline"><defs><clipPath id="%s"><rect x="0" y="0" width="1" height="1"/></clipPath></defs><g transform="translate(%.1f %.1f) scale(%.4f)">%s</g>%s</g>' % (
            cid, hx, hy, k, body, outfit_svg(wear, dict(info, head=[hx, hy]), 'lie' if pose != 'sit' else 'sit', 0.42 * U))
        open(os.path.join(D, 'line', name + '.svg'), 'w').write('<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d">%s</svg>' % (info['w'], info['h'], info['w'], info['h'], g))
    print(len(idx), 'inked drawings')


if __name__ == '__main__':
    if sys.argv[1] == 'lines':
        lines()
    if sys.argv[1] == 'overlay':
        overlay(sys.argv[2], tuple(map(int, sys.argv[3].split(','))) if len(sys.argv) > 3 else None)
    elif sys.argv[1] == 'clean':
        clean(sys.argv[2])
