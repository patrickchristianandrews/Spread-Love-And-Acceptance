import os, math
os.chdir(os.path.dirname(os.path.abspath(__file__)))
INK = '#231A16'
def inner(path):
    s = open(path).read(); s = s[s.index('>', s.index('<svg')) + 1: s.rindex('</svg>')]
    return s.replace('<rect width="100%" height="100%" fill="#fff"/>', '', 1)
def flake(x, y, r):
    o = '<g stroke="%s" stroke-width="3" stroke-linecap="round" transform="translate(%s %s)">' % (INK, x, y)
    for a in range(0, 180, 60):
        c, s_ = math.cos(math.radians(a)), math.sin(math.radians(a))
        o += '<line x1="%s" y1="%s" x2="%s" y2="%s"/>' % (-r * c, -r * s_, r * c, r * s_)
        for t in (-.55, .55):
            px, py = r * t * c, r * t * s_
            for b in (a + 45, a - 45):
                o += '<line x1="%s" y1="%s" x2="%s" y2="%s"/>' % (px, py, px + r * .3 * math.cos(math.radians(b)) * (1 if t > 0 else -1), py + r * .3 * math.sin(math.radians(b)) * (1 if t > 0 else -1))
    return o + '</g>'
def drift(x, y, w, h, fill):
    return '<path d="M%s %sC%s %s %s %s %s %sC%s %s %s %s %s %sZ" fill="%s" stroke="%s" stroke-width="4.5" stroke-linejoin="round"/>' % (
        x - w / 2, y, x - w / 2 + w * .1, y - h, x - w * .12, y - h * 1.1, x, y - h * .8, x + w * .12, y - h * 1.2, x + w / 2 - w * .1, y - h, x + w / 2, y, fill, INK)
def page(src, color, caption):
    S = .72; ox, oy = 50 - 312 * S, 52
    o = ['<rect width="850" height="1100" fill="#fff"/><defs><clipPath id="fr"><rect x="30" y="30" width="790" height="1040" rx="46"/></clipPath></defs><g clip-path="url(#fr)">']
    if color:
        o.append('<rect x="30" y="30" width="790" height="1040" rx="46" fill="#DCEBF7"/><path d="M30 700C200 684 400 712 600 690C700 680 760 690 820 700L820 1024Q820 1070 774 1070L76 1070Q30 1070 30 1024Z" fill="#FFFFFF"/>')
    o.append('<path d="M30 700C200 684 400 712 600 690C700 680 760 690 820 700" fill="none" stroke="%s" stroke-width="4" stroke-linecap="round"/>' % INK)
    for fx, fy, fr in ((110, 120, 22), (180, 210, 14), (720, 110, 20), (770, 230, 13), (640, 70, 12), (90, 330, 15)):
        o.append(flake(fx, fy, fr))
    o.append('<g transform="translate(%s %s) scale(%s)">%s</g>' % (ox, oy, S, inner(src)))
    f = '#fff'
    o.append(drift(300, 848, 300, 60, f)); o.append(drift(560, 836, 260, 50, f)); o.append(drift(110, 880, 200, 44, f)); o.append(drift(760, 870, 200, 46, f))
    o.append('<path d="M30 846C200 832 420 860 620 838C720 828 770 840 820 846L820 1024Q820 1070 774 1070L76 1070Q30 1070 30 1024Z" fill="%s" stroke="none"/>' % f)
    o.append('<path d="M30 846C200 832 420 860 620 838C720 828 770 840 820 846" fill="none" stroke="%s" stroke-width="5" stroke-linecap="round"/>' % INK)
    o.append('</g><rect x="30" y="30" width="790" height="1040" rx="46" fill="none" stroke="%s" stroke-width="7"/>' % INK)
    o.append('<text x="425" y="1036" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-weight="700" font-size="34" fill="%s">%s</text>' % (INK, caption))
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 850 1100" width="850" height="1100">%s</svg>' % ''.join(o)
cap = 'Tidbit on a snow day'
open('tb-page-line.svg', 'w').write(page('tb-line.svg', False, cap))
open('tb-page-col.svg', 'w').write(page('tb-col.svg', True, cap))
