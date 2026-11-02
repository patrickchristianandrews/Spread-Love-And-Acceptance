import cv2, numpy as np, sys, json
import potrace
name = sys.argv[1]; cfg = json.loads(sys.argv[2])
cls = np.load('/tmp/ph/%s-cls.npy' % name); mask = cv2.imread('/tmp/ph/%s-mask2.png' % name, 0); H, W = cls.shape
UP = 3   # trace at 3x for smoother curves
def curves(m, turd):
    m = cv2.resize(m.astype(np.uint8) * 255, (W * UP, H * UP), interpolation=cv2.INTER_LINEAR); m = cv2.GaussianBlur(m, (0, 0), 4) > 127
    pl = potrace.Bitmap(~m).trace(turdsize=turd * UP * UP, alphamax=1.25, opticurve=True, opttolerance=0.8)
    d = ''
    for cv in pl:
        sp = cv.start_point; d += 'M%.1f %.1f' % (sp.x / UP, sp.y / UP)
        for sg in cv.segments:
            d += ('L%.1f %.1fL%.1f %.1f' % (sg.c.x / UP, sg.c.y / UP, sg.end_point.x / UP, sg.end_point.y / UP)) if sg.is_corner else ('C%.1f %.1f %.1f %.1f %.1f %.1f' % (sg.c1.x / UP, sg.c1.y / UP, sg.c2.x / UP, sg.c2.y / UP, sg.end_point.x / UP, sg.end_point.y / UP))
        d += 'Z'
    return d
PAL = cfg['pal']; INK = '#2B211C'
sil = curves(mask > 0, 300)
regs = [(k, curves(cls == k, 90)) for k in (1, 2, 3, 4) if (cls == k).sum() > 200]
def eye(x, y, r, mono):
    return ('<ellipse cx="{x}" cy="{y}" rx="{a}" ry="{b}" fill="#FFFFFF" stroke="%s" stroke-width="2.4"/>' % INK +
            '<circle cx="{x}" cy="{y}" r="{c}" fill="%s"/>' % ('#FFFFFF' if mono else '#4A2C1A') +
            '<circle cx="{x}" cy="{y}" r="{c}" fill="none" stroke="%s" stroke-width="1.6"/>' % INK +
            '<circle cx="{x}" cy="{y}" r="{d}" fill="%s"/>' % INK +
            '<circle cx="{e}" cy="{f}" r="{g}" fill="#FFFFFF"/>').format(x=x, y=y, a=r * 1.35, b=r * 1.05, c=r * 0.85, d=r * 0.45, e=x + r * 0.3, f=y - r * 0.32, g=r * 0.25)
def svg(mono):
    p = ['<path d="%s" fill="%s"/>' % (sil, '#FFFFFF' if mono else PAL[0])]
    for k, d in regs:
        p.append('<path d="%s" fill="%s" fill-rule="evenodd" stroke="%s" stroke-width="2.4" stroke-linejoin="round"/>' % (d, '#FFFFFF' if mono else PAL[k], INK))
    for (x, y, rx, ry, rot) in cfg['nose']:
        p.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" transform="rotate(%s %s %s)" fill="#141111" stroke="%s" stroke-width="2.4"/>' % (x, y, rx, ry, rot, x, y, INK))
        p.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" fill="%s"/>' % (x - rx * 0.3, y - ry * 0.45, rx * 0.35, ry * 0.18, '#FFFFFF' if mono else '#6A615D'))
    for (x, y, r) in cfg['eyes']: p.append(eye(x, y, r, mono))
    for pts in cfg.get('curves', []):
        import sys as _s; _s.path.insert(0, '/tmp/ph'); from smooth import path as _p
        p.append('<path d="%s" fill="none" stroke="%s" stroke-width="3.4" stroke-linecap="round"/>' % (_p([tuple(q) for q in pts], False), INK))
    for pts in cfg.get('lines', []):
        p.append('<polyline points="%s" fill="none" stroke="%s" stroke-width="2.6" stroke-linecap="round" stroke-linejoin="round"/>' % (' '.join('%s,%s' % tuple(q) for q in pts), INK))
    p.append('<path d="%s" fill="none" stroke="%s" stroke-width="5.5" stroke-linejoin="round"/>' % (sil, INK))
    x0, y0, x1, y1 = cfg['crop']
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="%d %d %d %d" width="%d" height="%d" style="background:#fff">%s</svg>' % (x0, y0, x1 - x0, y1 - y0, (x1 - x0) * 1.5, (y1 - y0) * 1.5, ''.join(p))
open('/tmp/ph/%s-final-c.svg' % name, 'w').write(svg(False)); open('/tmp/ph/%s-final-l.svg' % name, 'w').write(svg(True))
