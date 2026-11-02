def path(pts, close=True):
    n = len(pts); d = 'M%.1f %.1f' % pts[0]
    rng = range(n) if close else range(n - 1)
    for i in rng:
        p0 = pts[(i - 1) % n] if (close or i > 0) else pts[i]; p1 = pts[i]; p2 = pts[(i + 1) % n]; p3 = pts[(i + 2) % n] if (close or i + 2 < n) else p2
        k = 1 / 6
        d += 'C%.1f %.1f %.1f %.1f %.1f %.1f' % (p1[0] + (p2[0] - p0[0]) * k, p1[1] + (p2[1] - p0[1]) * k, p2[0] - (p3[0] - p1[0]) * k, p2[1] - (p3[1] - p1[1]) * k, p2[0], p2[1])
    return d + ('Z' if close else '')
def svg(W, H, items, bg=None):
    out = []
    for it in items:
        kind = it[0]
        if kind == 'shape':
            _, pts, fill, lw = it; out.append('<path d="%s" fill="%s" stroke="#2B211C" stroke-width="%s" stroke-linejoin="round"/>' % (path(pts), fill, lw))
        elif kind == 'line':
            _, pts, lw = it; out.append('<path d="%s" fill="none" stroke="#2B211C" stroke-width="%s" stroke-linecap="round"/>' % (path(pts, False), lw))
        elif kind == 'ell':
            _, cx, cy, rx, ry, rot, fill, lw = it; out.append('<ellipse cx="%s" cy="%s" rx="%s" ry="%s" transform="rotate(%s %s %s)" fill="%s" stroke="#2B211C" stroke-width="%s"/>' % (cx, cy, rx, ry, rot, cx, cy, fill, lw))
        elif kind == 'raw':
            out.append(it[1])
    return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 0 %d %d" width="%d" height="%d">%s%s</svg>' % (W, H, W, H, ('<rect width="100%%" height="100%%" fill="%s"/>' % bg) if bg else '', ''.join(out))
