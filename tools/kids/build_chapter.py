#!/usr/bin/env python3
"""build_chapter.py: the preteen chapter book, "Turn Down the Static" (kids22).

    python3 tools/kids/build_chapter.py            writes book/kids/src/chapter-book.html (6 x 9 in, black ink, no bleed),
                                                   the cover (spine from the page count in book/kids/kids.json), the spot
                                                   illustrations as SVG in book/kids/src/art/, and the EPUB source list

The text is in _manuscripts/kids/chapter-book/*.md (one file per chapter) and 00-book.json. Format of a chapter file:
    # Title
    ill: <picture id>
    paragraphs (blank line between; *italic*; a line of three dashes is a scene break)
    ::: chat   (Name: message lines)      ::: rules (one rule a line)      ::: try (one tip a line)
"""
import glob
import json
import os
import re
import sys

HERE = os.path.dirname(os.path.abspath(__file__))
sys.path.insert(0, HERE)
import kids_art as A  # noqa: E402
import kids_common as C  # noqa: E402
from kids_art import f  # noqa: E402

BOOK = C.load_json(os.path.join(C.MS, 'chapter-book', '00-book.json'))
TRIM = (6.0, 9.0)


# ------------------------------------------------------------------ text
def smart(s):
    """typographic quotes: straight quotes in the source become curly ones in print"""
    out = []
    parts = re.split(r'(<[^>]+>)', s)
    prev = ''
    for part in parts:
        if part.startswith('<'):
            out.append(part)
            if part not in ('</em>', '</strong>', '</span>', '</b>'):
                prev = ' '
            continue
        res = []
        for i, ch in enumerate(part):
            before = res[-1] if res else (prev[-1] if prev else ' ')
            if ch == '"':
                res.append('“' if (before.isspace() or before in '([{‘') else '”')
            elif ch == "'":
                res.append('‘' if (before.isspace() or before in '([{“') and part[i + 1:i + 2].isalpha() and not part[i + 1:i + 3].lower() in ('ti', 'tw') else '’')
            else:
                res.append(ch)
        out.append(''.join(res))
        prev = ''.join(res)[-1:] or prev
    return ''.join(out)


def inline(s):
    s = C.esc(s)
    s = s.replace('&quot;', '"').replace('&#x27;', "'")
    s = re.sub(r'\*([^*]+)\*', r'<em>\1</em>', s)
    return smart(s)


def parse_chapter(path):
    raw = open(path, encoding='utf-8').read().split('\n')
    title, ill = '', ''
    blocks = []
    i = 0
    para = []

    def flush():
        nonlocal para
        if para:
            blocks.append(('p', ' '.join(para)))
            para = []
    while i < len(raw):
        ln = raw[i]
        if ln.startswith('# '):
            title = ln[2:].strip()
        elif ln.startswith('ill:'):
            ill = ln[4:].strip()
        elif ln.strip() == '---':
            flush()
            blocks.append(('break', ''))
        elif ln.startswith('::: '):
            flush()
            kind = ln[4:].strip()
            lines = []
            i += 1
            while i < len(raw) and raw[i].strip() != ':::':
                if raw[i].strip():
                    lines.append(raw[i].strip())
                i += 1
            blocks.append((kind, lines))
        elif not ln.strip():
            flush()
        else:
            para.append(ln.strip())
        i += 1
    flush()
    return {'title': title, 'ill': ill, 'blocks': blocks}


def chapters():
    return [parse_chapter(p) for p in sorted(glob.glob(os.path.join(C.MS, 'chapter-book', '[0-9][0-9]-*.md')))]


# ------------------------------------------------------------------ spot illustrations (ink mode)
W, H = 460, 230


def pen():
    return A.Pen('ink', sw=2.3)


def svgdoc(P, w=W, h=H, label=''):
    return '<svg xmlns="http://www.w3.org/2000/svg" class="spot" viewBox="0 0 %d %d" role="img" aria-label="%s">%s</svg>' % (w, h, C.esc(label), P.svg())


def txt(P, x, y, s, size=18, anchor='middle', w=700, fam='Andika', col='#222'):
    P.raw('<text x="%s" y="%s" text-anchor="%s" font-family="%s, sans-serif" font-weight="%s" font-size="%s" fill="%s">%s</text>' % (f(x), f(y), anchor, fam, w, size, col, C.esc(s)))


def ground_line(P, y=205):
    P.raw('<path d="M20 %s Q230 %s 440 %s" fill="none" stroke="#999" stroke-width="2" stroke-dasharray="2 7" stroke-linecap="round"/>' % (y, y - 6, y))


def ill_door(P):
    P.rect(150, 22, 120, 184, '#d8d8d8', r=6)
    P.rect(162, 34, 96, 72, '#ececec', r=4)
    P.rect(162, 118, 96, 76, '#ececec', r=4)
    P.circ(256, 120, 5, '#777')
    P.rect(172, 52, 76, 34, '#ffffff', r=3)
    txt(P, 210, 66, 'KNOCK', 13, w=800)
    txt(P, 210, 80, 'FIRST', 13, w=800)
    A.sparkle(P, 128, 40, 1.1); A.sparkle(P, 292, 52, 0.9)
    A.pup_side(P, 'tidbit', 355, 205, 1.9, 'sit', 'happy')
    A.pup_side(P, 'sugarfoot', 90, 205, 1.9, 'stand', 'happy')
    ground_line(P)


def ill_phone(P):
    P.rect(165, 36, 100, 170, '#e0e0e0', r=14)
    P.rect(173, 50, 84, 140, '#ffffff', r=6)
    for (y, wd, x) in ((60, 56, 178), (82, 44, 202), (104, 60, 178), (126, 30, 218), (148, 52, 178)):
        P.rect(x, y, wd, 14, '#cfcfcf', r=7)
    txt(P, 215, 158, 'k', 13, w=800) if False else None
    A.static_cloud(P, 'grumble', 330, 80, 2.8)
    A.static_cloud(P, 'mumble', 95, 100, 1.6, 'shy', fizz=False)
    A.pup_side(P, 'sugarfoot', 330, 208, 1.4, 'lie', 'calm') if False else None
    txt(P, 215, 28, 'fine.', 22, w=800)


def ill_boxes(P):
    for (x, y, w, h) in ((60, 150, 80, 56), (60, 100, 70, 50), (140, 168, 70, 38), (330, 140, 90, 66)):
        P.rect(x, y, w, h, '#d9d9d9', r=3)
        P.rect(x + w / 2 - 8, y, 16, 8, '#bdbdbd', r=1)
    P.rect(160, 120, 80, 48, '#d0d0d0', r=3)
    P.circ(200, 144, 14, '#fafafa'); P.circ(200, 144, 3, '#444')
    P.line('M200 144 L222 128', '#333', 2.2)
    A.pup_side(P, 'tidbit', 250, 168, 1.5, 'sit', 'happy') if False else None
    A.pup_side(P, 'tidbit', 285, 205, 1.6, 'sit', 'happy')
    A.pup_side(P, 'sugarfoot', 395, 140, 1.3, 'stand', 'happy', flip=True) if False else None
    A.flower(P, 355, 120, 1.2, '#F7A8C2', '#FAD27A', 5, stem=True)
    ground_line(P)


def ill_slip(P):
    P.path('M130 70 Q125 40 160 36 L240 36 Q275 40 270 70 L285 205 L115 205Z', '#d6d6d6')
    txt(P, 200, 124, 'DOG', 26, w=800); txt(P, 200, 152, 'FOOD', 26, w=800)
    P.path('M250 196 L336 196 L330 214 L246 214Z', '#fff') if False else None
    P.rect(284, 186, 70, 40, '#fff', r=2, rot=-8)
    P.line('M290 200 L346 190', '#aaa', 1.6)
    A.pup_side(P, 'tidbit', 70, 206, 1.5, 'sit', 'happy')
    A.sparkle(P, 380, 70, 1.2)
    ground_line(P)


def ill_cloud(P):
    A.static_cloud(P, 'grumble', 230, 78, 5.2, 'grumpy', fizz=False)
    P.path('M250 118 L228 150 L244 150 L222 188 L262 142 L246 142 L262 118Z', '#e8e8e8')
    P.rect(170, 196, 120, 10, '#bbb', r=3)
    ground_line(P)


def ill_moon(P):
    A.moon(P, 345, 70, 1.05, 'calm', glow=False)
    P.rect(40, 150, 210, 40, '#e2e2e2', r=8)
    P.rect(40, 130, 70, 24, '#f4f4f4', r=8)
    A.pup_side(P, 'tidbit', 200, 207, 1.6, 'sleep', 'sleep')
    P.rect(300, 168, 50, 36, '#d9d9d9', r=8)
    txt(P, 325, 192, 'rain', 11, w=700)
    for i, r in enumerate((14, 22, 30)):
        P.raw('<path d="M%s %s a%s %s 0 0 1 0 -%s" fill="none" stroke="#999" stroke-width="2" stroke-linecap="round"/>' % (352 + i * 8, 190, r / 2.5, r / 2.5, r * 0.7))
    ground_line(P)


def ill_stairs(P):
    for i in range(4):
        P.rect(90 + i * 56, 60 + i * 36, 56 + (3 - i) * 0, 150 - i * 36 - 4, '#dcdcdc', r=2, kind='shape')
    P.rect(90, 196, 250, 12, '#cfcfcf', r=2)
    A.pup_side(P, 'sugarfoot', 230, 197, 1.45, 'lie', 'calm')
    P.rect(150, 138, 22, 18, '#fff', r=3)
    P.line('M172 142 q10 0 10 8 q0 8 -10 8', '#333', 2)
    for (x, y) in ((158, 128), (164, 118)):
        P.line('M%s %s q-4 -6 0 -10' % (x, y), '#aaa', 1.6, kind='fine')
    A.static_cloud(P, 'drift', 370, 90, 1.9, 'drifty', fizz=False)
    P.ell(120, 205, 20, 7, '#f0f0f0')


def ill_cards(P):
    xs = [(60, 118, -14), (120, 108, -9), (180, 102, -4), (240, 100, 2), (300, 106, 8), (360, 114, 13)]
    names = ['grumble', 'fuzz', 'mumble', 'drift']
    for i, (x, y, rot) in enumerate(xs):
        P.rect(x - 34, y - 52, 68, 96, '#ffffff', r=5, rot=rot)
        if i < 4:
            P.open('rotate(%s %s %s)' % (rot, x, y))
            A.static_cloud(P, names[i], x, y - 4, 1.9, 'happy' if i % 2 else None, fizz=False)
            P.close()
        elif i == 4:
            P.open('rotate(%s %s %s)' % (rot, x, y))
            A.heart(P, x, y - 22, 0.8)
            P.close()
        else:
            P.open('rotate(%s %s %s)' % (rot, x, y))
            txt(P, x, y + 4, 'NOT', 13, w=800); txt(P, x, y + 20, 'YOU', 13, w=800)
            P.close()
    A.pup_side(P, 'tidbit', 230, 224, 1.0, 'sit', 'happy') if False else None


def ill_call(P):
    P.rect(190, 150, 30, 56, '#e0e0e0', r=6)
    P.rect(195, 156, 20, 40, '#ffffff', r=3)
    P.raw('<path d="M240 166 q8 -8 12 -2 M248 150 q14 -14 22 -4" fill="none" stroke="#999" stroke-width="2" stroke-linecap="round"/>')
    P.rect(240, 44, 48, 40, '#fff', r=10); txt(P, 264, 72, 'k', 26, w=800)
    P.rect(300, 34, 82, 38, '#fff', r=10); txt(P, 341, 59, 'worried k', 15, w=700)
    P.rect(60, 70, 44, 36, '#fff', r=10); A.heart(P, 82, 80, 0.38)
    A.pup_side(P, 'sugarfoot', 140, 207, 1.6, 'sit', 'happy')
    P.rect(40, 200, 360, 10, '#ddd', r=3)


def ill_storm(P):
    P.path('M120 120 Q100 96 130 86 Q130 54 168 58 Q190 30 226 52 Q262 36 282 68 Q324 66 326 98 Q350 118 320 130 Z', '#dcdcdc')
    P.path('M232 134 L214 160 L228 160 L212 188 L246 152 L232 152 L246 134Z', '#e8e8e8')
    for (nm, x, y) in (('grumble', 150, 100), ('fuzz', 210, 86), ('mumble', 270, 96), ('drift', 310, 108)):
        A.static_cloud(P, nm, x, y, 1.5, 'happy', fizz=False)
    P.rect(190, 190, 40, 16, '#fff', r=2)
    P.path('M184 192 L210 174 L236 192Z', '#d0d0d0')
    A.sparkle(P, 90, 160, 1.0)
    ground_line(P)


def ill_star(P):
    A.star(P, 230, 52, 30, '#fff', 'shape', rot=-8)
    P.line('M215 52 q4 6 8 0 M236 52 q4 6 8 0', '#444', 1.6) if False else None
    P.rect(40, 160, 90, 46, '#d9d9d9', r=10)
    txt(P, 85, 188, 'rain', 12, w=700)
    P.circ(360, 160, 38, '#f4f4f4'); P.circ(360, 160, 3, '#444')
    for a in range(0, 360, 30):
        import math
        r = math.radians(a)
        P.line('M%s %s L%s %s' % (f(360 + math.cos(r) * 28), f(160 + math.sin(r) * 28), f(360 + math.cos(r) * 33), f(160 + math.sin(r) * 33)), '#333', 1.4, kind='fine')
    P.line('M360 160 L378 148', '#333', 2.2)
    A.pup_side(P, 'tidbit', 220, 207, 1.5, 'sleep', 'sleep')
    A.sparkle(P, 160, 70, 1.0); A.sparkle(P, 300, 80, 0.9)


def ill_ladder(P):
    P.rect(150, 18, 10, 204, '#cfcfcf', r=4)
    P.rect(262, 18, 10, 204, '#cfcfcf', r=4)
    ys = (46, 120, 194)
    for y in ys:
        P.rect(150, y - 4, 122, 9, '#bdbdbd', r=4)
    A.sugarfoot_front(P, 78, 80, 1.15, 'calm', 'smile')
    A.tidbit_front(P, 78, 152, 1.1, 'cross', 'yell')
    A.pup_side(P, 'sugarfoot', 60, 218, 1.0, 'lie', 'sad', mouth_='flat')
    for y, t in zip(ys, ('CALM AND', 'REVVED UP', 'RUNNING ON')):
        txt(P, 286, y - 2, t, 12.5, 'start', 700)
    txt(P, 286, 46 + 13, 'CONNECTED', 12.5, 'start', 700)
    txt(P, 286, 194 + 13, 'EMPTY', 12.5, 'start', 700)


ILLS = {'door': ill_door, 'phone': ill_phone, 'boxes': ill_boxes, 'slip': ill_slip, 'cloud': ill_cloud, 'moon': ill_moon, 'stairs': ill_stairs,
        'cards': ill_cards, 'call': ill_call, 'storm': ill_storm, 'star': ill_star, 'ladder': ill_ladder}
ALT = {
    'door': 'A bedroom door with a KNOCK FIRST sign, and the two dogs, Tidbit and Sugarfoot, on either side',
    'phone': 'A phone showing the word fine, with the gray cloud Grumble above it',
    'boxes': 'Moving boxes, a record player, a plant and Tidbit sitting by the pile',
    'slip': 'A bag of dog food with a permission slip stuck under it, and Tidbit grinning',
    'cloud': 'The gray cloud Grumble with a bolt of lightning under it',
    'moon': 'The Moon over a bed, with Tidbit asleep and a rain sound machine',
    'stairs': 'A staircase with Sugarfoot lying on the bottom step, a mug of tea and a pair of slippers',
    'cards': 'A fan of index cards with the four Static clouds drawn on them',
    'call': 'A phone on a step with a k, a worried k and a heart, and Sugarfoot sitting beside it',
    'storm': 'A thundercloud holding four friendly Static clouds, with a tiny paper house below',
    'star': 'A crooked star, a rain sound machine, a barometer and Tidbit asleep',
    'ladder': 'Three rungs of a ladder: calm and connected, revved up and running on empty, each with a pup',
}


def spot(id_):
    P = pen()
    ILLS[id_](P)
    return svgdoc(P, label=ALT[id_])


def puddles_badge():
    P = A.Pen('ink', sw=1.6)
    A.puddles(P, 40, 78, 0.78, 'smile')
    return '<svg xmlns="http://www.w3.org/2000/svg" class="badge" viewBox="0 0 80 84" role="img" aria-label="Professor Puddles">%s</svg>' % P.svg()


def chat_html(lines):
    rows = []
    for ln in lines:
        m = re.match(r'^([A-Za-z][A-Za-z ]{0,20}):\s*(.*)$', ln)
        who, msg = (m.group(1), m.group(2)) if m else ('', ln)
        me = ' me' if who == 'Wren' else ''
        rows.append('<div class="msg%s"><span class="who">%s</span><span class="bub">%s</span></div>' % (me, C.esc(who), inline(msg)))
    return '<div class="chat" role="group" aria-label="A group chat">%s</div>' % ''.join(rows)


def rules_html(lines):
    return '<div class="rules"><p class="rules-h">The seven rules</p><ol>%s</ol></div>' % ''.join('<li>%s</li>' % inline(x) for x in lines)


def try_html(lines):
    return ('<aside class="try"><div class="try-h">%s<span>%s</span></div><ul>%s</ul></aside>' % (
        puddles_badge(), C.esc(BOOK['try_label']), ''.join('<li>%s</li>' % inline(x) for x in lines)))


def chapter_html(n, ch, first=False):
    out = ['<section class="chap" id="ch%d"><header class="chap-head"><p class="chap-n">Chapter %d</p><h2>%s</h2>%s</header>' % (n, n, inline(ch['title']), spot(ch['ill']) if ch['ill'] else '')]
    firstp = True
    after = False
    for kind, body in ch['blocks']:
        if kind == 'p':
            cls = ' class="first"' if firstp else (' class="ab"' if after else '')
            out.append('<p%s>%s</p>' % (cls, inline(body)))
            firstp = False
            after = False
        elif kind == 'break':
            out.append('<p class="brk" aria-hidden="true">&#8226; &#8226; &#8226;</p>')
            after = True
        elif kind == 'chat':
            out.append(chat_html(body))
        elif kind == 'rules':
            out.append(rules_html(body))
        elif kind == 'try':
            out.append(try_html(body))
    out.append('</section>')
    return '\n'.join(out)


CSS = '''
@page { size: 6in 9in; margin: 0.7in 0.55in 0.85in 0.8in; @bottom-center { content: counter(page); font-family: "Lora", serif; font-size: 9pt; color: #444; } }
@page :left { margin: 0.7in 0.8in 0.85in 0.55in; }
@page :right { margin: 0.7in 0.55in 0.85in 0.8in; }
@page front { @bottom-center { content: none; } }
html, body { margin: 0; padding: 0; background: #fff; color: #111; }
body { font-family: "Lora", Georgia, serif; font-size: 12pt; line-height: 1.5; orphans: 2; widows: 2; text-align: left; hyphens: manual; }
h1, h2, h3 { font-family: "Fraunces", Georgia, serif; font-weight: 700; margin: 0; color: #111; }
p { margin: 0 0 .62em; }
em { font-style: italic; }
.front { page: front; break-after: page; }
.rt { break-before: right; }
.chap { break-before: right; }
.chap-head { text-align: center; margin: 0 0 1.1em; }
.chap-n { font: 600 9.5pt "Andika", sans-serif; letter-spacing: .22em; text-transform: uppercase; margin: .6in 0 .25em; color: #444; }
.chap h2 { font-size: 27pt; line-height: 1.12; margin: 0 0 .35em; }
svg.spot { display: block; width: 4.55in; max-width: 100%; height: auto; margin: 0 auto; }
.chap p.first::first-line { font-variant: small-caps; letter-spacing: .05em; font-weight: 600; }
.chap p { text-indent: 0; }
.chap p + p { text-indent: 1.15em; margin-top: 0; }
.chap p.first + p { text-indent: 1.15em; }
.chap p.brk { text-indent: 0; text-align: center; color: #555; font-size: 12pt; margin: .5em 0; }
.chap p.ab, .chap p.brk + p { text-indent: 0 !important; }
.chat { margin: .7em 0 .9em; padding: .55em .7em; border: 1.2pt solid #777; border-radius: 10pt; background: #f7f7f7; break-inside: avoid; font-family: "Andika", sans-serif; font-size: 9.6pt; line-height: 1.35; }
.chat .msg { display: flex; align-items: baseline; gap: .55em; margin: .22em 0; }
.chat .who { flex: 0 0 4.1em; font-weight: 700; font-size: 8.4pt; text-align: right; color: #333; }
.chat .bub { display: inline-block; padding: .18em .6em; border-radius: 9pt; background: #fff; border: .8pt solid #aaa; }
.chat .msg.me .bub { background: #e6e6e6; border-color: #888; }
.rules { margin: .8em 0; padding: .7em .9em; border: 1.4pt solid #444; border-radius: 10pt; break-inside: avoid; font-family: "Andika", sans-serif; font-size: 10pt; }
.rules-h { font: 700 11pt "Fraunces", serif; margin: 0 0 .3em; text-indent: 0 !important; }
.rules ol { margin: 0; padding-left: 1.4em; }
.rules li { margin: .18em 0; }
aside.try { margin: 1.3em 0 0; padding: .65em .85em .5em; border: 1.4pt dashed #444; border-radius: 10pt; break-inside: avoid; font-family: "Andika", sans-serif; font-size: 10pt; line-height: 1.4; background: #fafafa; }
.try-h { display: flex; align-items: center; gap: .5em; font: 700 12pt "Fraunces", serif; margin-bottom: .25em; }
.try-h svg.badge { width: .48in; height: .5in; flex: none; }
aside.try ul { margin: 0; padding-left: 1.15em; }
aside.try li { margin: .2em 0; }
.title-pg { text-align: center; padding-top: 1.3in; }
.title-pg h1 { font-size: 34pt; line-height: 1.08; margin: 0 0 .4em; }
.title-pg .sub { font: 400 12pt "Lora", serif; font-style: italic; margin: 0 .3in 1.2em; color: #333; }
.title-pg .by { font: 600 14pt "Andika", sans-serif; margin-top: 1.4em; }
.title-pg .pub { font: 400 9.5pt "Andika", sans-serif; margin-top: .9in; color: #444; }
.half { text-align: center; padding-top: 2.6in; }
.half h1 { font-size: 26pt; }
.copy { font: 400 8.8pt/1.45 "Andika", sans-serif; padding-top: 1.3in; color: #222; }
.copy p { margin: 0 0 .8em; }
.toc h2 { font-size: 22pt; text-align: center; margin: .4in 0 .5em; }
.toc ol { list-style: none; margin: 0 auto; padding: 0; width: 3.7in; font-size: 11.5pt; line-height: 1.9; }
.toc li { display: flex; gap: .6em; }
.toc li b { flex: none; width: 1.4em; font-family: "Andika", sans-serif; }
.who-h { font-size: 22pt; text-align: center; margin: .3in 0 .4em; }
.cast { font: 400 10.3pt/1.45 "Andika", sans-serif; margin: 0 auto; width: 4.3in; }
.cast p { margin: 0 0 .5em; text-indent: 0 !important; }
.cast b { font-family: "Fraunces", serif; }
.back h2 { font-size: 22pt; text-align: center; margin: .3in 0 .5em; }
.back p { font: 400 10.8pt/1.5 "Lora", serif; text-indent: 0 !important; }
.back ul, .back ol { font: 400 10.6pt/1.5 "Lora", serif; padding-left: 1.3em; margin: .3em 0 .8em; }
.back li { margin: .3em 0; }
.box { border: 1.4pt solid #444; border-radius: 10pt; padding: .6em .85em; margin: .8em 0; break-inside: avoid; }
.box h3 { font-size: 12.5pt; margin: 0 0 .25em; }
'''


def toc_html(chs):
    return '<section class="front toc rt"><h2>Chapters</h2><ol>%s</ol></section>' % ''.join('<li><b>%d</b><span>%s</span></li>' % (i + 1, inline(c['title'])) for i, c in enumerate(chs))


def front_html():
    t = BOOK['title']
    half = '<section class="front half"><h1>%s</h1></section>' % C.esc(t)
    cast = ('<section class="front"><h2 class="who-h">Who is who</h2><div class="cast">'
            '<p><b>Wren Alvarez</b>, 11. She has one rule about her bedroom door.</p>'
            '<p><b>Theo Alvarez</b>, 8, her brother. He likes rules, clouds and exact numbers.</p>'
            '<p><b>Mom and Dad</b> (Dana and Sam). Mom has a new shift. Dad has a lot of cereal.</p>'
            '<p><b>Grandpa Lou</b>, Dad’s father. He has a bad knee and opinions about weather.</p>'
            '<p><b>Tidbit and Sugarfoot</b>, the family dogs. Tidbit zooms. Sugarfoot strolls.</p>'
            '<p><b>Imani, Mateo and Josie</b>, Wren’s friends. Together they are the Four Corners.</p>'
            '<p><b>Mrs. Okafor and Ms. Park</b>, a teacher who loves weather and a librarian who loves stickers.</p>'
            '<p><b>Professor Puddles</b>, a raindrop with glasses. He turns up after every chapter.</p>'
            '</div><div style="margin-top:.25in">%s</div></section>') % (spot('ladder').replace('class="spot"', 'class="spot" style="width:4in"'))
    title = ('<section class="front title-pg rt"><h1>%s</h1><p class="sub">%s</p><p class="by">by %s</p>'
             '<p class="pub">%s, Book %d<br>Independently published<br>%s</p></section>') % (
        C.esc(t), C.esc(BOOK['subtitle']), C.esc(C.AUTHOR), C.esc(BOOK['series']), BOOK['series_no'], C.SITE)
    copy = ('<section class="front copy"><p><em>%s</em>, Book %d: <em>%s</em>.<br>By %s. Independently published.</p>'
            '<p>Text and pictures © 2026 %s. First print edition, %s. Printed on demand, with a black-and-white interior.</p>'
            '<p><strong>Free online, always.</strong> The characters in this book live at %s, where everything is free to read and use, with no account and no paid version. The print book is optional. You may copy pages of this book for personal use and for non-commercial teaching, with credit to “%s.”</p>'
            '<p><strong>How it was made.</strong> The words were drafted with an AI writing tool. The pictures were drawn by code that was written with an AI tool. The story and characters are original to this site.</p>'
            '<p><strong>Made up.</strong> Wren, Theo and their family and friends are made up. Nobody in this book is a real person, and none of it is a testimonial.</p>'
            '<p><strong>Not therapy.</strong> This is a story. It is general education about feelings and getting along, not a diagnosis or treatment, and it cannot know your family.</p>'
            '<p>Set in Lora, Fraunces and Andika (SIL Open Font License).</p></section>') % (
        C.esc(BOOK['series']), BOOK['series_no'], C.esc(t), C.esc(C.AUTHOR), C.esc(C.AUTHOR), C.UPDATED, C.SITE, C.SITE)
    return half + cast + title + copy


def back_html():
    s = ['<section class="back rt"><h2>Words to keep</h2>'
         '<div class="box"><h3>Three things for an apology</h3><ol><li>Say sorry.</li><li>Say exactly what you did, in plain words.</li><li>Ask what would help. Then give it room.</li></ol></div>'
         '<div class="box"><h3>A pause with a name and a time</h3><p>“I need twenty minutes. I’ll come back at eight.” Without the time, a pause can feel like a door slamming.</p></div>'
         '<div class="box"><h3>Sentences from this book</h3><ul>'
         '<li>“I need a minute.”</li><li>“Fine, or need a minute?”</li><li>“I’m mad, and it’s not about you.”</li>'
         '<li>“Did you mean it like that?”</li><li>“Do you want room, or do you want me close?”</li><li>“Can I be the model person?”</li></ul></div></section>']
    s.append('<section class="back rt"><h2>For grown-ups</h2>'
             '<p>This story follows one eleven-year-old through a crowded few months: a room that stops being hers, a group chat that goes wrong, a project that goes sideways, and a sentence she wishes she could take back. Each chapter ends with a short box of things to try.</p>'
             '<p>The ideas underneath come from the free site at %s. The ladder (calm and connected, revved up, running on empty) is a simple way to notice where the body is. A message has only half its meaning in the words. A job has the doing and the noticing. A pause needs a time to come back. An apology is three things, and the other person sets the pace. Theo and Wren are wired differently, and each one has to learn the other’s language. Neither is wrong.</p>'
             '<p>Some questions to talk about together: Where was each character on the ladder in the group chat chapter? What did “k” mean to Imani, and what did it mean to Wren? Which job on your own list is invisible? What would a green card, an orange card and a gray card say in your house?</p></section>' % C.SITE)
    s.append('<section class="back"><h2>About this book</h2>%s<p>Free to read online at %s</p></section>' % (''.join('<p>%s</p>' % C.esc(p) for p in BOOK['about_paras']), C.SITE))
    return '\n'.join(s)


def build():
    chs = chapters()
    body = front_html() + toc_html(chs) + '\n'.join(chapter_html(i + 1, c) for i, c in enumerate(chs)) + back_html()
    if os.environ.get('PAD_BLANK') == '1':
        body += '<section class="back" style="break-before:page"><p>&nbsp;</p></section>'
    C.write(os.path.join(C.SRC, 'chapter-book.html'), C.doc(BOOK['title'], CSS, body))
    # the spot illustrations on their own (for the EPUB)
    for k in ILLS:
        P = pen()
        ILLS[k](P)
        s = svgdoc(P, label=ALT[k]).replace('class="spot" ', 'width="920" height="460" ')
        # the EPUB images use a font stack that falls back to sans-serif
        C.write(os.path.join(C.SRC, 'art', 'chapter-%s.svg' % k), '<?xml version="1.0" encoding="UTF-8"?>\n' + s + '\n')
    meta = C.load_json(os.path.join(C.OUT, 'kids.json'), {}) or {}
    rec = meta.setdefault('books', {}).setdefault('chapter-book', {})
    rec['title'] = BOOK['title']
    rec['trim_in'] = list(TRIM)
    rec['paper'] = 'white'
    rec['chapters'] = len(chs)
    C.write(os.path.join(C.OUT, 'kids.json'), json.dumps(meta, indent=1) + '\n')
    words = sum(len(re.findall(r"[A-Za-z']+", ' '.join(b if isinstance(b, str) else ' '.join(b) for _, b in c['blocks']))) for c in chs)
    print('chapter book: %d chapters, %d words' % (len(chs), words))
    pages = rec.get('pages_printed')
    if pages:
        make_cover(pages)


# ------------------------------------------------------------------ the cover
def make_cover(pages):
    w, h = TRIM
    sp = C.spine_in(pages, 'white')
    B = C.BLEED
    Wt = 2 * B + 2 * w + sp
    Ht = h + 2 * B
    P = A.Pen('color', sw=3.2)
    U = 100
    wu, hu = Wt * U, Ht * U
    fx = (B + w + sp) * U
    bx = B * U
    gid = C.grad(P, 'cv', [(0, '#2B3A7A'), (0.55, '#6A52A0'), (1, '#F2A9B4')])
    P.raw('<rect width="%s" height="%s" fill="url(#%s)"/>' % (f(wu), f(hu), gid))
    for (x, y, r) in ((fx + 50, 340, 7), (fx + 560, 300, 6), (fx + 580, 640, 7), (bx + 70, 470, 6), (bx + 400, 520, 7), (bx + 250, 600, 5), (bx + 520, 420, 6)):
        A.star(P, x, y, r, '#FBE9A0', 'flat')
    # the four clouds of Static over the front
    A.static_cloud(P, 'grumble', fx + 130, 420, 4.4, 'grumpy', fizz=True)
    A.static_cloud(P, 'fuzz', fx + 330, 360, 3.8, None, fizz=True)
    A.static_cloud(P, 'mumble', fx + 470, 470, 3.2, 'shy', fizz=False)
    A.static_cloud(P, 'drift', fx + 250, 520, 3.0, 'drifty', fizz=False)
    P.raw('<path d="M0 %s Q%s %s %s %s T%s %s V%s H0Z" fill="#3E3C74"/>' % (f(hu * 0.8), f(wu * .25), f(hu * .74), f(wu * .5), f(hu * .8), f(wu), f(hu * .77), f(hu)))
    A.pup_side(P, 'tidbit', fx + 150, 800, 3.2, 'sit', 'surprised', mouth_='o')
    A.pup_side(P, 'sugarfoot', fx + 440, 805, 3.0, 'sit', 'calm', flip=True)
    A.sparkle(P, fx + 300, 650, 1.6)
    A.puddles(P, bx + 120, 800, 1.4, 'smile')
    bg = C.svg_wrap(P, wu, hu, 'bg')
    front = ('<div style="position:absolute;left:.4in;right:.4in;top:.45in;text-align:center">'
             '<div style="font:700 10pt Andika;letter-spacing:.16em;color:#FFF4DC">%s &middot; BOOK %d</div>'
             '<div style="font:800 46pt/0.95 Fraunces,serif;color:#FFFDF5;margin-top:.12in;text-shadow:0 3px 0 rgba(31,26,70,.55)">Turn Down the Static</div>'
             '<div style="font:600 11pt/1.3 Andika;color:#FFF4DC;margin:.14in auto 0;width:4.6in">%s</div></div>'
             '<div style="position:absolute;left:0;right:0;bottom:.3in;text-align:center;font:700 15pt Andika;color:#FFF4DC">%s</div>'
             ) % (C.esc(BOOK['ages'].upper()), BOOK['series_no'], C.esc(BOOK['subtitle']), C.esc(C.AUTHOR))
    back = ('<div style="position:absolute;left:.5in;right:.5in;top:.55in;color:#FFFDF5;font-size:10.4pt;line-height:1.45">'
            '<div style="font:800 15pt Fraunces,serif;margin-bottom:.1in;color:#FFF4DC">One word. One very crowded house.</div>%s'
            '<p style="margin:.12in 0 0;font-size:9.5pt;color:#FFF4DC">%s &middot; Free to read online at %s</p></div>') % (
        ''.join('<p style="margin:0 0 .09in">%s</p>' % C.esc(x) for x in BOOK['back_cover']), C.esc(BOOK['ages']), C.SITE)
    spine = ''
    if sp >= 0.25:
        spine = '<p class="cv-spine-t">Turn Down the Static</p>'
    html, info = C.cover_doc(BOOK['title'], TRIM, pages, 'white', bg, front, back, spine)
    C.write(os.path.join(C.SRC, 'cover-chapter-book.html'), html)
    meta = C.load_json(os.path.join(C.OUT, 'kids.json'), {}) or {}
    meta['books']['chapter-book']['cover'] = info
    C.write(os.path.join(C.OUT, 'kids.json'), json.dumps(meta, indent=1) + '\n')
    print('cover: spine %s in, %s x %s in' % (info['spine_in'], info['width_in'], info['height_in']))


if __name__ == '__main__':
    build()
