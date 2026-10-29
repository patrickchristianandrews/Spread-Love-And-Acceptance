#!/usr/bin/env python3
"""build_coloring.py: the two coloring books (kids29), both starring only Tidbit and Sugarfoot.

    python3 tools/kids/build_coloring.py            writes book/kids/src/coloring-younger.html, coloring-older.html and their covers

Younger (ages 3 to 7): 32 big, bright pictures, each in a rounded frame with a short joke from the pups on a banner, and a find-it
game on some pages. Older (ages 8 to 12): 32 detailed, calming scenes in ornamental borders with patterns, tiny hidden hearts and
paw prints, and a short calm prompt in the margin.
Page plan (68 pages, every picture on a right-hand page with a blank page behind it so markers cannot bleed through):
    1 title (with "This book belongs to")      2 Meet Tidbit and Sugarfoot, a note for grown-ups, a color test
    3, 5 ... 65  the 32 pictures, each followed by its blank back
    67 the certificate                        68 the copyright page
Pages are 8.5 x 11 in, black ink, no bleed (every line stays 0.5 in inside the edge). The drawings come from cute.py (the engine),
cast.py (the two pups), props*.py (scenery) and pat.py (patterns and borders): all hand-built vector art.
"""
import json
import math
import os
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import kids_common as C  # noqa: E402
import coloring_text as T  # noqa: E402
import cute as Q  # noqa: E402
from cute import Ink, rrect, blob, curve, Path, circ, ell, fit, heart_path, star_path, rpoly, capsule  # noqa: E402
import cast  # noqa: E402
import pat  # noqa: E402
import props as pr  # noqa: E402
import props2 as p2  # noqa: E402
import props3 as p3  # noqa: E402
import props_o as po  # noqa: E402
import coloring_younger as CY  # noqa: E402
import coloring_older as CO  # noqa: E402

PW, PHT = 850, 1100   # units: 100 a inch

try:
    from fontTools.ttLib import TTFont
    _FONT = TTFont(os.path.join(HERE, 'fonts', 'Fraunces-ExtraBold.ttf'))
    _CMAP = _FONT.getBestCmap()
    _HMTX = _FONT['hmtx']
    _UPM = _FONT['head'].unitsPerEm
except Exception:  # pragma: no cover
    _FONT = None


def em_width(text):
    """the width of a text in ems, in Fraunces ExtraBold (an estimate of 0.56 em a letter when the font cannot be read)"""
    if _FONT is None:
        return 0.56 * len(text)
    return sum(_HMTX[_CMAP.get(ord(c), _CMAP[ord('n')])][0] for c in text) / _UPM


def caption_font(text, width_pt=395.0, big=27.0, small=19.0):
    """(size in pt, lines): one line when it fits at 'small' or more, else two lines"""
    w = em_width(text)
    one = width_pt / w
    if one >= small:
        return min(big, one), [text]
    words = text.split(' ')
    best = None
    for i in range(1, len(words)):
        a, b = ' '.join(words[:i]), ' '.join(words[i:])
        m = max(em_width(a), em_width(b))
        if best is None or m < best[0]:
            best = (m, [a, b])
    return min(21.0, width_pt / best[0]), best[1]


# ---------------------------------------------------------------- page chrome
CSS = '''
@page { size: 8.5in 11in; margin: 0; }
html, body { margin: 0; padding: 0; background: #fff; }
.pg { position: relative; width: 8.5in; height: 11in; overflow: hidden; page-break-after: always; break-after: page; background: #fff; font-family: "Andika", sans-serif; color: #111; }
.pg:last-child { page-break-after: auto; break-after: auto; }
.pg > svg.art { position: absolute; left: 0; top: 0; width: 8.5in; height: 11in; display: block; }
.cap { position: absolute; left: 1.35in; right: 1.35in; top: 9.62in; height: .76in; display: flex; flex-direction: column; align-items: center; justify-content: center; text-align: center;
  font-family: "Fraunces", serif; font-weight: 800; color: #151515; line-height: 1.05; letter-spacing: .005em; }
.cap span.l { display: block; white-space: nowrap; }
.cap .b { display: inline-block; }
.badge { position: absolute; display: flex; align-items: center; justify-content: center; text-align: center; font-family: "Andika", sans-serif; font-weight: 700; font-size: 14.5pt; line-height: 1.08; color: #111; }
.prompt { position: absolute; left: 1.1in; right: 1.1in; top: 9.66in; height: .7in; display: flex; align-items: center; justify-content: center; text-align: center; font-family: "Lora", serif; font-style: italic; font-size: 13pt; line-height: 1.25; color: #1b1b1b; }
.t { position: absolute; left: .7in; right: .7in; text-align: center; }
h1 { font-family: "Fraunces", serif; font-weight: 800; margin: 0; }
.outline { color: #fff; -webkit-text-stroke: 2.2pt #111; paint-order: stroke fill; }
.ttl { font-family: "Fraunces", serif; font-weight: 800; }
.bl { font-family: "Fraunces", serif; font-weight: 800; }
.lbl { font-family: "Fraunces", serif; font-weight: 800; font-size: 22pt; text-align: center; }
.sm { font-family: "Andika", sans-serif; font-weight: 700; font-size: 14pt; line-height: 1.25; text-align: center; }
.gu { font-family: "Andika", sans-serif; font-size: 12.5pt; line-height: 1.4; text-align: center; }
.gu b { font-family: "Fraunces", serif; font-weight: 800; font-size: 15pt; display: block; margin-bottom: .04in; }
.copy { font-size: 10.5pt; line-height: 1.5; position: absolute; left: 1.1in; right: 1.1in; top: 1.4in; text-align: left; }
.copy p { margin: 0 0 .16in; }
'''


def esc(s):
    return C.esc(s)


def svg_page(ink):
    return '<svg xmlns="http://www.w3.org/2000/svg" class="art" viewBox="0 0 %d %d" preserveAspectRatio="xMidYMid meet" role="img" aria-label="%s">%s</svg>' % (PW, PHT, '%s', ink.svg())


def page(inner, ink=None, alt=''):
    art = ''
    if ink is not None:
        art = '<svg xmlns="http://www.w3.org/2000/svg" class="art" viewBox="0 0 %d %d" preserveAspectRatio="xMidYMid meet" role="img" aria-label="%s">%s</svg>' % (PW, PHT, esc(alt), ink.svg())
    return '<section class="pg">%s%s</section>' % (art, inner)


def blank():
    return '<section class="pg"></section>'


def bounce(text, amp=2.5):
    """words with a little bounce, for titles and captions (each word nudged up or down and tilted a hair).
    Whole words are kept in one piece, so the text stays easy to read, search and check."""
    out = []
    for i, w in enumerate(text.split(' ')):
        dy = [0, -amp, 0, amp * 0.6][i % 4]
        rot = [-1.6, 1.0, 1.6, -1.0][i % 4]
        out.append('<span style="display:inline-block;transform:translateY(%.1fpt) rotate(%.1fdeg)">%s</span>' % (dy, rot, esc(w)))
    return ' '.join(out)


# ---------------------------------------------------------------- the younger caption banners
def banner(ink, style, cx=425, y0=960, h=78, w=620):
    x0 = cx - w / 2
    with ink.fig(0, 0) as g:
        if style == 'ribbon':
            for sgn in (-1, 1):
                ex = cx + sgn * (w / 2 + 38)
                g.part(blob([(cx + sgn * (w / 2 - 20), y0 + 14, 'c'), (ex + sgn * 6, y0 + 14, 'c'), (ex - sgn * 18, y0 + h / 2 + 14, 'c'), (ex + sgn * 6, y0 + h + 14, 'c'), (cx + sgn * (w / 2 - 20), y0 + h + 14, 'c')], k=0.3))
            g.part(rrect(x0, y0, w, h, 12))
            for sgn in (-1, 1):
                g.line(Path().M(cx + sgn * (w / 2 - 26), y0 + 6).L(cx + sgn * (w / 2 - 26), y0 + h - 6), w=ink.dw * 0.8, dash='1 9')
        elif style == 'bubble':
            g.part(rrect(x0 - 10, y0, w + 20, h, 38))
            g.part(rpoly([(cx - 22, y0 + 4), (cx + 22, y0 + 4), (cx + 4, y0 - 24)], 5), under=True)
        elif style == 'scallop':
            P = Path().M(x0, y0 + 10)
            n = 14
            d = w / n
            for i in range(n):
                P.C(x0 + i * d + d * 0.2, y0 - 8, x0 + i * d + d * 0.8, y0 - 8, x0 + (i + 1) * d, y0 + 10)
            P.L(x0 + w, y0 + h - 10)
            for i in range(n):
                P.C(x0 + w - i * d - d * 0.2, y0 + h + 8, x0 + w - i * d - d * 0.8, y0 + h + 8, x0 + w - (i + 1) * d, y0 + h - 10)
            P.Z()
            g.part(P)
        else:  # plaque
            g.part(rrect(x0, y0, w, h, 16))
            g.part(rrect(x0 + 10, y0 + 8, w - 20, h - 16, 10), under=False, w=ink.dw * 0.9)
            for sgn in (-1, 1):
                g.part(circ(cx + sgn * (w / 2 + 14), y0 + h / 2, 12), under=True)


def younger_scene_page(i, fn, meta):
    ink = CY.new_ink(i + 1)
    fn(ink)
    banner(ink, ('ribbon', 'bubble', 'scallop', 'plaque')[i % 4])
    html = ''
    cap = meta['caption']
    size, lines = caption_font(cap)
    html += '<div class="cap" style="font-size:%.1fpt">%s</div>' % (size, ''.join('<span class="l">%s</span>' % bounce(l, 1.4) for l in lines))
    if meta.get('game'):
        bx, by = (700, 128) if meta.get('badge', 'r') == 'r' else (150, 128)
        rx, ry = 82, 52
        with ink.fig(0, 0) as g:
            P = Path()
            n = 20
            for k in range(n):
                a0 = k * math.tau / n
                a1 = (k + 1) * math.tau / n
                am = (a0 + a1) / 2
                if k == 0:
                    P.M(bx + rx * math.cos(a0), by + ry * math.sin(a0))
                P.C(bx + (rx + 9) * math.cos(am - 0.06), by + (ry + 8) * math.sin(am - 0.06), bx + (rx + 9) * math.cos(am + 0.06), by + (ry + 8) * math.sin(am + 0.06), bx + rx * math.cos(a1), by + ry * math.sin(a1))
            P.Z()
            g.part(P)
        words = meta['game'].replace('Find ', 'Find<br>', 1)
        html += '<div class="badge" style="left:%.2fin;top:%.2fin;width:%.2fin;height:%.2fin">%s</div>' % ((bx - rx) / 100, (by - ry) / 100, 2 * rx / 100, 2 * ry / 100, words)
    return page(html, ink, meta['alt'])


def older_scene_page(i, fn, meta):
    ink = CO.o_ink(i + 1)
    fn(ink)
    # a small flourish each side of the prompt
    with ink.fig(0, 0, outline=False) as g:
        for sgn in (-1, 1):
            g.part(Q.Path().M(0, 0).L(0, 0), w=0.1) if False else None
            g.line(curve([(425 + sgn * 305, 1000), (425 + sgn * 320, 992), (425 + sgn * 335, 1000), (425 + sgn * 350, 1008)]), w=ink.dw * 1.1)
    with ink.fig(112, 1000, 1.0) as g:
        g.part(cast.sparkle4(0, 0, 10, 0.3), w=ink.dw * 0.9)
    with ink.fig(738, 1000, 1.0) as g:
        g.part(cast.sparkle4(0, 0, 10, 0.3), w=ink.dw * 0.9)
    html = '<div class="prompt">%s</div>' % esc(meta['prompt'])
    return page(html, ink, meta['alt'])


# ---------------------------------------------------------------- the front and back pages
def title_page(kind):
    younger = kind == 'younger'
    X = T.YOUNGER if younger else T.OLDER
    rect = (62, 300, 726, 636)
    if younger:
        ink = CY.new_ink(90)
        CY.frame_begin(ink, rect=rect)
        pr.rainbow(ink, 425, 690, 310, 4, 36)
        pr.puff(ink, 150, 450, 0.9, n=4)
        pr.puff(ink, 700, 430, 0.9, n=4)
        CY.hills(ink, 770, 850)
        Q.fit(ink, lambda i, x, y, s: cast.pup_hug(i, x, y, s, 'happy', 'happy'), (110, 440, 740, 900), 'bottom')
        for (x, y, r, rot) in ((150, 380, 22, -12), (700, 360, 24, 14), (300, 345, 16, 8), (560, 340, 18, -6)):
            pr.heart(ink, x, y, r, rot)
        CY.frame_end(ink)
        tstyle = 'font-size:44pt;line-height:1.02'
        top = '.5in'
    else:
        ink = CO.o_ink(90)
        CO.begin(ink, ['leaf', 'dot'], rect=rect)
        pat.mandala(ink, 425, 640, 250, 5, 14)
        CO.sh(ink, circ(425, 640, 150), '#fff')
        Q.fit(ink, lambda i, x, y, s: cast.pup_hug(i, x, y, s, 'happy', 'happy', 1), (300, 520, 550, 740), 'bottom')
        for (x, y, r) in ((150, 840, 12), (700, 840, 12), (425, 360, 14)):
            pr.heart(ink, x, y, r, 8)
        po.stars_z(ink, 91, 8, (110, 360, 740, 440), size=(7, 12))
        CO.end(ink)
        tstyle = 'font-size:38pt;line-height:1.02'
        top = '.55in'
    t1, t2 = X['title_lines']
    h = ('<div class="t" style="top:%s"><h1 class="outline" style="%s">%s<br>%s</h1>'
         '<p style="font-size:13.5pt;margin:.14in 0 0;font-weight:700">%s</p></div>'
         '<div class="t" style="top:9.55in;font-size:13pt;font-weight:700">%s<span style="display:inline-block;width:3.1in;border-bottom:1.6pt solid #111;margin-left:.1in"></span></div>'
         '<div class="t" style="top:10.1in;font-size:12pt;font-weight:700">by %s</div>') % (
        top, tstyle, bounce(t1, 3), bounce(t2, 3), esc(X['subtitle']), esc(X['belongs']), C.AUTHOR)
    return page(h, ink, X['title'] + ': Tidbit and Sugarfoot together')


def meet_page(kind):
    younger = kind == 'younger'
    X = T.YOUNGER if younger else T.OLDER
    M = X['meet']
    ink = CY.new_ink(91) if younger else CO.o_ink(91)
    lvl = 0 if younger else 1
    Q.fit(ink, lambda i, x, y, s: cast.pup_front(i, 'tidbit', x, y, s, 'happy', lvl=lvl, arms='up', wag=1), (70, 190, 420, 560), 'bottom')
    Q.fit(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'happy', lvl=lvl, arms='chest'), (430, 200, 780, 560), 'bottom')
    for cx in (245, 605):
        with ink.fig(0, 0) as g:
            g.part(rrect(cx - 130, 572, 260, 52, 22))
    for (x, y, r) in ((100, 150, 18), (760, 160, 20), (425, 125, 24), (330, 230, 12), (520, 230, 12)):
        pr.heart(ink, x, y, r, 8) if younger else pr.star5(ink, x, y, r * 0.8, 8)
    for k in range(8):
        cx = 120 + k * 87.1
        with ink.fig(0, 0) as g:
            g.part(circ(cx, 1010, 30) if younger else rrect(cx - 30, 982, 60, 56, 10))
    h = ('<div class="t ttl" style="top:.5in;font-size:%dpt;line-height:1.05">%s</div>'
         '<div class="lbl" style="position:absolute;left:1.15in;width:2.6in;top:5.76in">Tidbit</div>'
         '<div class="lbl" style="position:absolute;left:4.75in;width:2.6in;top:5.76in">Sugarfoot</div>'
         '<div class="sm" style="position:absolute;left:.7in;width:3.6in;top:6.4in">%s</div>'
         '<div class="sm" style="position:absolute;left:4.3in;width:3.5in;top:6.4in">%s</div>'
         '<div class="gu" style="position:absolute;left:1.0in;right:1.0in;top:7.55in"><b>%s</b>%s</div>'
         '<div class="gu" style="position:absolute;left:1in;right:1in;top:8.95in"><b style="font-size:14pt;margin-bottom:0">%s</b>%s</div>') % (
        36 if younger else 34, esc(M['head']), esc(M['tidbit']), esc(M['sugarfoot']),
        esc(M['grownups_head']), esc(M['grownups']), esc(M['test_head']), esc(M['test_note']))
    return page(h, ink, 'Tidbit and Sugarfoot, with a row of circles to test your colors')


def cert_page(kind):
    younger = kind == 'younger'
    X = T.YOUNGER if younger else T.OLDER
    c = X['cert']
    if younger:
        ink = CY.new_ink(92)
        CY.frame_begin(ink)
        pr.rainbow(ink, 425, 860, 300, 4, 34)
        CY.hills(ink, 800, 870)
        Q.fit(ink, lambda i, x, y, s: cast.pup_front(i, 'tidbit', x, y, s, 'joy', arms='both_up'), (80, 560, 380, 910), 'bottom')
        Q.fit(ink, lambda i, x, y, s: cast.pup_front(i, 'sugarfoot', x, y, s, 'joy', arms='both_up'), (470, 560, 770, 910), 'bottom')
        pr.star5(ink, 425, 720, 56, 0)
        for (x, y, r) in ((130, 520, 16), (720, 500, 18), (425, 600, 12)):
            pr.star5(ink, x, y, r, 8)
        CY.frame_end(ink)
    else:
        ink = CO.o_ink(92)
        CO.begin(ink, ['star', 'dot'])
        pat.mandala(ink, 425, 730, 210, 4, 14)
        CO.sh(ink, circ(425, 730, 120), '#fff')
        Q.fit(ink, lambda i, x, y, s: cast.pup_hug(i, x, y, s, 'happy', 'happy', 1), (325, 640, 525, 800), 'bottom')
        CO.end(ink)
    with ink.fig(0, 0, outline=False) as g:
        g.line(Path().M(150, 335).L(700, 335), w=ink.ow * 0.8)
        g.line(Path().M(150, 480).L(470, 480).M(520, 480).L(700, 480), w=ink.ow * 0.8)
    h = ('<div class="t" style="top:.95in"><h1 class="outline" style="font-size:56pt">%s</h1></div>'
         '<div class="t" style="top:2.55in;font-size:15pt;font-weight:700">%s</div>'
         '<div class="t" style="top:3.5in;font-size:15pt;font-weight:700">%s</div>'
         '<div class="t" style="left:1.5in;width:3.4in;text-align:left;top:4.9in;font-size:12pt;font-weight:700">%s</div>'
         '<div class="t" style="left:5.2in;width:1.8in;text-align:left;top:4.9in;font-size:12pt;font-weight:700">%s</div>') % (
        bounce(c['head'], 4), esc(c['line1']), esc(c['line2']), esc(c['sign']), esc(c['date']))
    return page(h, ink, 'A certificate for coloring with Tidbit and Sugarfoot')


def copyright_page(kind):
    X = T.YOUNGER if kind == 'younger' else T.OLDER
    s = '<div class="copy">%s</div>' % T.COPYRIGHT.format(series=esc(C.SERIES), n=X['series_no'], name=esc(X['title']), author=esc(C.AUTHOR), updated=C.UPDATED, site=C.SITE)
    return page(s)


# ---------------------------------------------------------------- the books
def build_book(kind):
    younger = kind == 'younger'
    pages = [title_page(kind), meet_page(kind)]
    scenes = CY if younger else CO
    for i, (fn, meta) in enumerate(zip(scenes.SCENES, scenes.META)):
        pages.append((younger_scene_page if younger else older_scene_page)(i, fn, meta))
        pages.append(blank())
    pages += [cert_page(kind), copyright_page(kind)]
    ident = 'coloring-%s' % kind
    X = T.YOUNGER if younger else T.OLDER
    C.write(os.path.join(C.SRC, ident + '.html'), C.doc(ident, CSS, '\n'.join(pages)))
    meta = C.load_json(os.path.join(C.OUT, 'kids.json'), {}) or {}
    rec = meta.setdefault('books', {}).setdefault(ident, {})
    rec.update(title=X['title'], trim_in=[8.5, 11], paper='white', pictures=len(scenes.SCENES), pages_planned=len(pages))
    C.write(os.path.join(C.OUT, 'kids.json'), json.dumps(meta, indent=1) + '\n')
    print('%s: %d pictures, %d pages' % (ident, len(scenes.SCENES), len(pages)))
    return rec


def main():
    which = sys.argv[1:] or ['younger', 'older']
    import coloring_covers as CV
    for k in which:
        rec = build_book(k)
        pages = rec.get('pages_planned') or 68
        CV.make_cover(k, pages)


if __name__ == '__main__':
    main()
