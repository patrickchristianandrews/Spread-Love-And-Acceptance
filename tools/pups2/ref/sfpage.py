import re, sys, os
os.chdir(os.path.dirname(os.path.abspath(__file__)))
INK = '#231A16'
def inner(path):
    s = open(path).read()
    s = s[s.index('>', s.index('<svg')) + 1: s.rindex('</svg>')]
    return s.replace('<rect width="100%" height="100%" fill="#fff"/>', '', 1)

def heart(x, y, r, fill):
    return ('<path d="M%s %sC%s %s %s %s %s %sC%s %s %s %s %s %sC%s %s %s %s %s %sC%s %s %s %s %s %sZ" fill="%s" stroke="%s" stroke-width="3.4" stroke-linejoin="round"/>' %
            (x, y + r, x - r * 1.3, y + r * .1, x - r * 1.1, y - r * 1.1, x - r * .5, y - r * 1.05,
             x - r * .15, y - r * 1.02, x, y - r * .7, x, y - r * .55,
             x, y - r * .7, x + r * .15, y - r * 1.02, x + r * .5, y - r * 1.05,
             x + r * 1.1, y - r * 1.1, x + r * 1.3, y + r * .1, x, y + r, fill, INK))

def paw(x, y, s, fill):
    o = '<g transform="translate(%s %s) scale(%s)" fill="%s" stroke="%s" stroke-width="%s">' % (x, y, s, fill, INK, 3.2 / s)
    o += '<ellipse cx="0" cy="8" rx="14" ry="11"/>'
    for cx, cy in ((-15, -8), (-5, -16), (6, -16), (16, -8)):
        o += '<ellipse cx="%s" cy="%s" rx="5.5" ry="7"/>' % (cx, cy)
    return o + '</g>'

def ball(x, y, r, color):
    g = '#58B36A' if color else '#fff'
    o = '<circle cx="%s" cy="%s" r="%s" fill="%s" stroke="%s" stroke-width="5"/>' % (x, y, r, '#F6F3EA' if color else '#fff', INK)
    o += '<path d="M%s %sA%s %s 0 0 1 %s %sC%s %s %s %s %s %sZ" fill="%s" stroke="%s" stroke-width="4"/>' % (
        x - r * .98, y + r * .2, r, r, x + r * .35, y - r * .94, x - r * .05, y - r * .3, x - r * .25, y + r * .4, x - r * .98, y + r * .2, g, INK)
    o += paw(x + r * .45, y + r * .25, .9, g) + paw(x - r * .5, y - r * .2, .7, '#fff' if not color else '#F6F3EA')
    return o

def page(src, color, caption):
    S = 0.76; ox, oy = 425 - 850 * S / 2 - (380 + 470 - 850 / 2) * S + 0, 70
    ox = 425 - (850) * S  # dog art spans x 380..1320 in the source: centre it
    ox = 425 - 850 * S
    o = ['<rect width="850" height="1100" fill="#fff"/>']
    # floor and a soft rug edge behind her
    o.append('<path d="M40 640C220 628 630 628 810 640" fill="none" stroke="%s" stroke-width="4" stroke-linecap="round"/>' % INK)
    if color:
        o.insert(1, '<rect x="30" y="30" width="790" height="1040" rx="46" fill="#FBEFD9"/><path d="M30 640C220 628 630 628 820 640L820 1024Q820 1070 774 1070L76 1070Q30 1070 30 1024Z" fill="#EAD2A8"/>')
    for (hx, hy, hr) in ((100, 110, 24), (160, 180, 15), (750, 105, 22), (700, 170, 14)):
        o.append(heart(hx, hy, hr, '#F08DA0' if color else '#fff'))
    o.append(paw(74, 590, 1.1, '#fff' if not color else '#F3C9A6'))
    o.append(paw(782, 575, 1.0, '#fff' if not color else '#F3C9A6'))
    o.append('<g transform="translate(%s %s) scale(%s)">%s</g>' % (425 - 850 * S, 112, S, inner(src)))
    o.append(ball(100, 938, 56, color))
    o.append('<rect x="30" y="30" width="790" height="1040" rx="46" fill="none" stroke="%s" stroke-width="7"/>' % INK)
    o.append('<text x="425" y="1036" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-weight="700" font-size="34" fill="%s">%s</text>' % (INK, caption))
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 1100" width="850" height="1100">%s</svg>' % ''.join(o)

cap = 'Sugarfoot and her favorite ball'
open('sf-page-line.svg', 'w').write(page('sf-line.svg', False, cap))
open('sf-page-col.svg', 'w').write(page('sf-col.svg', True, cap))
