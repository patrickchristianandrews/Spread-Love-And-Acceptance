"""Vector art for the book's print edition and the book's home: the covers, part-opener marks and the
ledger ruling. Plain SVG strings in the site's palette, built from the same buddy, ledger, heart and sprout
shapes as the mascots in /assets/img/mascots/. No gradients, filters or shadows, so the PDFs stay small.

Used by tools/book/build_book.py.
"""

BODY = 'M40 8c17 0 30 11 32 27 2 17-8 34-30 36C19 73 7 60 8 43 9 23 22 8 40 8z'
HEART = 'M0 12C-10-2-30 4-26 20-23 32 0 44 0 44S23 32 26 20C30 4 10-2 0 12Z'
SPARK = 'M0-7C1.2-1.2 1.2-1.2 7 0 1.2 1.2 1.2 1.2 0 7-1.2 1.2-1.2 1.2-7 0-1.2-1.2-1.2-1.2 0-7Z'

TONES = {
    'peach': ('#F9C9B4', '#E39A80'),
    'lavender': ('#D9C8F0', '#AF95DA'),
    'mint': ('#C7EBD6', '#86C3A0'),
    'sky': ('#C6DFF4', '#88B6DF'),
    'butter': ('#F8E7AE', '#DDBB55'),
    'rose': ('#F7C9D4', '#E08FA5'),
}
INK = '#2B2620'
BRASS = '#A8792F'


def buddy(cx, cy, size, tone, rot=0, look=0):
    """One round buddy, centred on (cx, cy), `size` wide. look: -1 left, 0 ahead, 1 right."""
    fill, stroke = TONES[tone]
    k = size / 80.0
    fx = 40 + look * 4
    return (
        '<g transform="translate(%.2f %.2f) rotate(%.1f) scale(%.4f) translate(-40 -40)">'
        '<path d="%s" fill="%s" stroke="%s" stroke-width="2.6"/>'
        '<ellipse cx="29" cy="21" rx="7" ry="4" fill="#fff" opacity=".6" transform="rotate(-20 29 21)"/>'
        '<g transform="translate(%.1f 43) scale(1.15)">'
        '<circle cx="-7" cy="0" r="2.9" fill="%s"/><circle cx="7" cy="0" r="2.9" fill="%s"/>'
        '<circle cx="-6" cy="-1" r="1" fill="#fff"/><circle cx="8" cy="-1" r="1" fill="#fff"/>'
        '<path d="M-4 6c2.6 2.6 5.4 2.6 8 0" fill="none" stroke="%s" stroke-width="2.1" stroke-linecap="round"/>'
        '<ellipse cx="-12" cy="5" rx="3.6" ry="2.3" fill="#F2A3B6" opacity=".85"/>'
        '<ellipse cx="12" cy="5" rx="3.6" ry="2.3" fill="#F2A3B6" opacity=".85"/></g></g>'
    ) % (cx, cy, rot, k, BODY, fill, stroke, fx, INK, INK, INK)


def heart(cx, cy, size, fill='#EE8FA6', stroke='#D9728B'):
    k = size / 52.0
    return '<path transform="translate(%.2f %.2f) scale(%.4f) translate(0 -23)" d="%s" fill="%s" stroke="%s" stroke-width="3" stroke-linejoin="round"/>' % (
        cx, cy, k, HEART, fill, stroke)


def spark(cx, cy, size, fill=BRASS):
    return '<path transform="translate(%.2f %.2f) scale(%.3f)" d="%s" fill="%s"/>' % (cx, cy, size / 14.0, SPARK, fill)


def ledger(cx, top, width, check=True, accent='#3E6B4C'):
    """An open ledger: two cream pages with ruled lines, a brass edge and a small tick."""
    k = width / 84.0
    s = '<g transform="translate(%.2f %.2f) scale(%.4f) translate(-50 -55)">' % (cx, top, k)
    s += '<path d="M8 60Q29 53 50 60L50 92Q29 85 8 92Z" fill="#FFF8EC" stroke="%s" stroke-width="2.2" stroke-linejoin="round"/>' % BRASS
    s += '<path d="M92 60Q71 53 50 60L50 92Q71 85 92 92Z" fill="#FFF8EC" stroke="%s" stroke-width="2.2" stroke-linejoin="round"/>' % BRASS
    s += ('<g stroke="#D9CBA3" stroke-width="1.4" stroke-linecap="round" fill="none">'
          '<path d="M15 68Q30 64 44 68M15 75Q30 71 44 75M15 82Q30 78 44 82M56 68Q70 64 85 68M56 75Q70 71 85 75"/></g>')
    if check:
        s += '<path d="M60 82.5l4 3.5 8-8" fill="none" stroke="%s" stroke-width="2.4" stroke-linecap="round" stroke-linejoin="round"/>' % accent
    s += '</g>'
    return s


def hands(points, tone):
    fill, stroke = TONES[tone]
    return ''.join('<circle cx="%.2f" cy="%.2f" r="%.2f" fill="%s" stroke="%s" stroke-width="1.6"/>' % (x, y, r, fill, stroke) for x, y, r in points)


def sprout(x, y, size, stem='#3E6B4C', leaf='#A9DCC8'):
    k = size / 20.0
    return ('<g transform="translate(%.2f %.2f) scale(%.4f) translate(-50 -30)">'
            '<path d="M50 30C50 22 50 18 50 12" stroke="%s" stroke-width="2.4" stroke-linecap="round" fill="none"/>'
            '<path d="M50 20C44 12 36 12 34 16 38 22 46 22 50 20Z" fill="%s" stroke="%s" stroke-width="1.7"/>'
            '<path d="M50 16C56 8 64 8 66 12 62 18 54 18 50 16Z" fill="%s" stroke="%s" stroke-width="1.7"/></g>') % (
        x, y, k, stem, leaf, stem, leaf, stem)


def heart_book(cx, cy, width):
    k = width / 84.0
    return ('<g transform="translate(%.2f %.2f) scale(%.4f) translate(-50 -52)">'
            '<path d="M50 30C40 14 12 16 10 40 8 62 32 76 50 92Z" fill="#FFF8EC" stroke="%s" stroke-width="2.4" stroke-linejoin="round"/>'
            '<path d="M50 30C60 14 88 16 90 40 92 62 68 76 50 92Z" fill="#FFF8EC" stroke="%s" stroke-width="2.4" stroke-linejoin="round"/>'
            '<g stroke="#D9CBA3" stroke-width="1.4" stroke-linecap="round" fill="none"><path d="M18 42Q32 40 44 46M17 52Q31 50 44 56M22 62Q33 61 44 66M56 46Q68 40 82 42M56 56Q69 50 83 52M56 66Q67 61 78 62"/></g>'
            '<path d="M50 31V91" stroke="%s" stroke-width="1.8"/>'
            '<path d="M50 30C50 22 50 18 50 12" stroke="#3E6B4C" stroke-width="2.4" stroke-linecap="round" fill="none"/>'
            '<path d="M50 20C44 12 36 12 34 16 38 22 46 22 50 20Z" fill="#A9DCC8" stroke="#3E6B4C" stroke-width="1.7"/>'
            '<path d="M50 16C56 8 64 8 66 12 62 18 54 18 50 16Z" fill="#A9DCC8" stroke="#3E6B4C" stroke-width="1.7"/></g>') % (
        cx, cy, k, BRASS, BRASS, BRASS)


def illustration(kind):
    """The cover picture for each package, in a 200 x 150 box."""
    g = []
    if kind == 'whole':
        g.append(buddy(72, 64, 74, 'peach', -7, 1))
        g.append(buddy(128, 64, 74, 'lavender', 7, -1))
        g.append(heart(100, 22, 30))
        g.append(ledger(100, 92, 132))
        g.append(hands([(76, 96.5, 5), (124, 96.5, 5)], 'peach'))
        g.append(spark(30, 30, 12) + spark(172, 40, 10) + spark(160, 14, 6, '#EE8FA6'))
    elif kind == 'for-yourself':
        g.append(buddy(100, 60, 84, 'peach', 0, 0))
        g.append(ledger(100, 92, 128))
        g.append(hands([(80, 97, 5.2), (120, 97, 5.2)], 'peach'))
        g.append(sprout(160, 70, 34))
        g.append(heart(150, 26, 18) + spark(38, 28, 12) + spark(52, 58, 6, '#EE8FA6'))
    elif kind == 'together':
        g.append(buddy(52, 70, 60, 'peach', -9, 1))
        g.append(buddy(148, 70, 60, 'lavender', 9, -1))
        g.append(buddy(100, 58, 64, 'mint', 0, 0))
        g.append(heart(100, 16, 22))
        g.append(ledger(100, 94, 150))
        g.append(hands([(60, 99, 4.6), (84, 98, 4.6), (116, 98, 4.6), (140, 99, 4.6)], 'peach'))
        g.append(spark(22, 34, 10) + spark(180, 30, 12))
    elif kind == 'load':  # print12: Book 3 of the print series, sharing the load (two buddies, one ledger each side)
        g.append(buddy(60, 62, 66, 'butter', -6, 1))
        g.append(buddy(140, 62, 66, 'mint', 6, -1))
        g.append(ledger(100, 92, 156, True, '#96412B'))
        g.append(hands([(66, 97, 4.8), (90, 97, 4.8), (110, 97, 4.8), (134, 97, 4.8)], 'butter'))
        g.append(heart(100, 30, 22) + spark(24, 30, 11) + spark(178, 26, 9) + spark(100, 8, 6, '#EE8FA6'))
    elif kind == 'steady':  # print12: Book 2 of the print series, heal and steady (one buddy held by a big heart, a sprout)
        g.append(heart(100, 70, 120, '#F3E3F7', '#B9A3D9'))
        g.append(buddy(100, 70, 70, 'lavender', 0, 0))
        g.append(sprout(160, 104, 30) + sprout(42, 106, 24))
        g.append(spark(30, 30, 11) + spark(172, 26, 9) + spark(150, 8, 6, '#EE8FA6'))
    elif kind == 'workbook':  # print12: the workbook (a buddy with a big ledger page and a sprout)
        g.append(ledger(100, 70, 150, True, '#2E6E6A'))
        g.append(buddy(46, 52, 58, 'sky', -8, 1))
        g.append(hands([(58, 76, 4.6)], 'sky'))
        g.append(sprout(164, 70, 30))
        g.append(heart(150, 22, 18) + spark(30, 18, 10) + spark(116, 16, 8))
    else:  # understanding
        g.append(buddy(36, 82, 60, 'sky', -6, 1))
        g.append(buddy(164, 82, 60, 'butter', 6, -1))
        g.append(heart_book(100, 76, 92))
        g.append(heart(100, 10, 16) + spark(34, 26, 12) + spark(166, 24, 10) + spark(140, 8, 6, '#EE8FA6'))
    return '<svg class="pe-art" viewBox="0 0 200 150" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">%s</svg>' % ''.join(g)


def part_mark(part):
    """A small picture for each part opener: one buddy (yourself), two buddies (between us),
    the heart-shaped book (understanding people), the ledger (back matter)."""
    if part == 1:
        body = buddy(60, 52, 70, 'peach', 0, 0) + sprout(100, 66, 24) + spark(22, 20, 9)
    elif part == 2:
        body = buddy(40, 54, 56, 'peach', -7, 1) + buddy(80, 54, 56, 'lavender', 7, -1) + heart(60, 16, 18)
    elif part == 3:
        body = heart_book(60, 50, 78) + spark(18, 22, 9) + spark(104, 30, 7, '#EE8FA6')
    else:
        body = ledger(60, 62, 104) + heart(60, 22, 20)
    return '<svg class="pe-mark-art" viewBox="0 0 120 100" xmlns="http://www.w3.org/2000/svg" aria-hidden="true" focusable="false">%s</svg>' % body


def ledger_rules(w, h, color, margin_color, top=18, step=8, left=16):
    """Faint ledger-paper ruling for a full page of w x h (mm): horizontal lines and a double margin rule."""
    lines = ''.join('M0 %.1fH%.1f' % (y, w) for y in [top + i * step for i in range(int((h - top) / step) + 1)])
    return ('<svg class="pe-rules" viewBox="0 0 %d %d" preserveAspectRatio="none" xmlns="http://www.w3.org/2000/svg" aria-hidden="true">'
            '<path d="%s" stroke="%s" stroke-width=".25" fill="none"/>'
            '<path d="M%.1f 0V%dM%.1f 0V%d" stroke="%s" stroke-width=".35" fill="none"/></svg>') % (
        w, h, lines, color, left, h, left + 1.4, h, margin_color)
