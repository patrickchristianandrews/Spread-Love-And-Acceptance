# Cute cartoon Tidbit and Sugarfoot, facing you, sitting. Hand-built bezier shapes, 600 x 700.
import re
INK = '#2A1E1A'
def mir(d, cx=300):
    """mirror an SVG path (absolute M/C/L/Q/Z, space separated numbers) across x = cx"""
    out = []
    for tok in re.findall(r'[MCLQZ]|-?\d+\.?\d*', d):
        out.append(tok)
    res, i, xy = [], 0, 0
    for t in out:
        if t in 'MCLQZ': res.append(t); xy = 0; continue
        v = float(t)
        if xy % 2 == 0: v = 2 * cx - v
        res.append('%g' % v); xy += 1
    return ' '.join(res)
def P(d, fill, lw=3.5, extra=''):
    return '<path d="%s" fill="%s" stroke="%s" stroke-width="%s" stroke-linejoin="round" stroke-linecap="round" %s/>' % (d, fill, INK, lw, extra)
def L(d, lw=3.2, col=INK):
    return '<path d="%s" fill="none" stroke="%s" stroke-width="%s" stroke-linecap="round" stroke-linejoin="round"/>' % (d, col, lw)
def eye(x, y, mono, iris='#5B3420'):
    s = ''
    s += '<ellipse cx="%s" cy="%s" rx="25" ry="28" fill="#FFFFFF" stroke="%s" stroke-width="3.2"/>' % (x, y, INK)
    s += '<ellipse cx="%s" cy="%s" rx="21" ry="24" fill="%s"/>' % (x, y + 2, '#2A1E1A' if mono else '#2A160D')
    if not mono:
        s += '<ellipse cx="%s" cy="%s" rx="17" ry="19" fill="%s"/>' % (x, y + 4, iris)
        s += '<ellipse cx="%s" cy="%s" rx="12" ry="9" fill="#8A5A38"/>' % (x, y + 13)
    s += '<ellipse cx="%s" cy="%s" rx="10" ry="12" fill="#120B08"/>' % (x, y + 3)
    s += '<ellipse cx="%s" cy="%s" rx="8" ry="9" fill="#FFFFFF"/>' % (x + 8, y - 8)
    s += '<circle cx="%s" cy="%s" r="4" fill="#FFFFFF"/>' % (x - 9, y + 11)
    return s
HEAD = 'M300 92 C392 92 462 152 464 242 C466 322 410 384 300 388 C190 384 134 322 136 242 C138 152 208 92 300 92 Z'
BODY = 'M206 372 C176 430 162 520 170 598 C176 646 228 662 300 662 C372 662 424 646 430 598 C438 520 424 430 394 372 Z'
TAIL = 'M418 600 C462 590 492 552 486 512 C482 496 468 498 466 512 C466 540 446 566 414 572 Z'
LEGL = 'M232 468 C226 530 224 590 228 636 L278 636 C282 590 282 530 274 468 Z'
SOCKL = 'M227 562 C244 552 262 552 279 562 C281 590 281 614 278 636 L228 636 C225 614 225 590 227 562 Z'
PAWL = 'M216 640 C214 620 236 610 254 610 C274 610 292 620 290 640 C290 656 272 662 254 662 C234 662 216 656 216 640 Z'
BACKL = 'M150 650 C146 628 168 618 190 620 C210 622 222 634 220 650 C218 662 196 666 180 664 C160 662 152 658 150 650 Z'
NOSE = 'M266 268 C278 256 322 256 334 268 C344 284 322 304 300 306 C278 304 256 284 266 268 Z'
def tidbit(mono=False):
    c = (lambda x: '#FFFFFF') if mono else (lambda x: x)
    BLK, TAN, TAN2, CHIN = '#262020', '#C8874F', '#D99A5E', '#B99A80'
    s = []
    s.append(P(TAIL, c(BLK), 4))
    s.append(P(BODY, c(BLK), 5.5))
    if not mono: s.append('<path d="%s" fill="#000" opacity="0.18"/>' % 'M330 380 C380 420 410 500 410 590 C408 630 380 650 340 656 C390 640 420 600 420 560 C424 480 400 420 360 380 Z')
    s.append(P('M232 380 C258 368 342 368 368 380 C374 440 346 494 300 506 C254 494 226 440 232 380 Z', c(TAN), 3.4))     # big tan chest
    s.append(L('M300 470 L300 486 M282 450 L284 466 M318 450 L316 466', 2.2, INK if mono else '#9C6538'))
    for side in (lambda d: d, mir):
        s.append(P(side(BACKL), c(TAN2), 3.4))
        s.append(P(side(LEGL), c(BLK), 3.6)); s.append(P(side(SOCKL), c(TAN), 3)); s.append(P(side(PAWL), c(TAN2), 3.4))
        s.append(L(side('M244 630 L245 648 M262 630 L262 648'), 2.6))
        s.append(L(side('M176 640 L177 654 M194 638 L195 654'), 2.4))
    # drop ears hang beside the head
    EAR = 'M184 128 C124 134 88 214 96 296 C100 344 140 360 166 336 C190 306 192 226 214 158 Z'
    for side in (lambda d: d, mir): s.append(P(side(EAR), c('#1E1919'), 5))
    s.append(P(HEAD, c(BLK), 5.5))
    if not mono:
        s.append('<path d="M206 130 C240 106 290 100 330 104 C292 112 252 124 222 146 Z" fill="#FFFFFF" opacity="0.13"/>')
        s.append('<path d="M420 180 C450 240 446 320 400 360 C430 316 438 250 410 196 Z" fill="#000" opacity="0.22"/>')
    for side in (lambda d: d, mir):                                                                # tan cheeks and lips round the muzzle
        s.append(P(side('M300 252 C262 236 214 240 196 278 C182 312 206 352 252 364 C276 370 296 366 300 360 Z'), c(TAN), 3.4))
        s.append(P(side('M228 192 C232 176 252 170 266 180 C274 192 266 210 248 212 C234 212 226 204 228 192 Z'), c(TAN2), 3))   # round tan brow dot
    s.append(P('M276 352 C284 344 316 344 324 352 C324 364 312 372 300 372 C288 372 276 364 276 352 Z', c(CHIN), 2.6))
    s.append(P('M276 156 C290 150 310 150 324 156 C330 200 334 236 340 262 C326 274 274 274 260 262 C266 236 270 200 276 156 Z', c(BLK), 0))   # broad black bridge
    for x in (244, 356): s.append(eye(x, 236, mono))
    s.append(P(NOSE, '#141010', 3.2)); s.append('<ellipse cx="288" cy="270" rx="12" ry="6" fill="%s"/>' % ('#FFFFFF' if mono else '#6E6562'))
    s.append(L('M300 306 L300 320 M268 322 C280 340 296 338 300 320 C304 338 320 340 332 322', 3.4))
    for x, y in ((240, 300), (230, 312), (252, 314)): s.append('<circle cx="%s" cy="%s" r="2.4" fill="%s"/>' % (x, y, INK)); s.append('<circle cx="%s" cy="%s" r="2.4" fill="%s"/>' % (600 - x, y, INK))
    if not mono:
        for x in (200, 400): s.append('<ellipse cx="%s" cy="300" rx="20" ry="11" fill="#F08C9C" opacity="0.45"/>' % x)
    return s
def sugarfoot(mono=False):
    c = (lambda x: '#FFFFFF') if mono else (lambda x: x)
    BLK, TAN, TAN2, WHT, RUST, PINK = '#262021', '#D9AE80', '#E6C196', '#F6F1E9', '#A6582E', '#E8A1A8'
    s = []
    s.append(P('M418 596 C470 600 506 560 508 506 C510 482 494 476 488 496 C482 532 458 560 414 566 Z', c(BLK), 4))   # fuller tail
    s.append(P(BODY, c(BLK), 5.5))
    if not mono: s.append('<path d="M330 380 C380 420 410 500 410 590 C408 630 380 650 340 656 C390 640 420 600 420 560 C424 480 400 420 360 380 Z" fill="#000" opacity="0.18"/>')
    s.append(P('M250 380 C270 370 330 370 350 380 C358 430 336 486 300 508 C264 486 242 430 250 380 Z', c(TAN), 3.2))       # tan edge
    s.append(P('M266 382 C280 376 320 376 334 382 C338 426 322 470 300 490 C278 470 262 426 266 382 Z', c(WHT), 3))         # white bib
    for side in (lambda d: d, mir):
        s.append(P(side(BACKL), c(WHT), 3.4))
        s.append(P(side(LEGL), c(BLK), 3.6)); s.append(P(side(SOCKL.replace('562', '540').replace('552', '530')), c(RUST), 3)); s.append(P(side(PAWL), c(WHT), 3.4))
        s.append(L(side('M244 630 L245 648 M262 630 L262 648'), 2.6))
        for x in (228, 246, 264, 280): s.append(side('<ellipse cx="%s" cy="660" rx="5" ry="3.6" fill="#2A2422"/>' % x) if False else '<ellipse cx="%s" cy="660" rx="5" ry="3.6" fill="#2A2422"/>' % (x if side is not mir else 600 - x))
        s.append(L(side('M176 640 L177 654 M194 638 L195 654'), 2.4))
    # folded ears: up from the top of the head, tips folding forward, pink inside
    EAR = 'M170 178 C150 156 136 124 140 96 C144 74 168 68 196 82 C224 96 244 120 248 142 C228 148 208 160 194 176 Z'
    EARIN = 'M176 160 C162 140 156 118 160 102 C164 90 178 88 194 98 C212 108 226 126 230 140 C214 146 200 154 190 166 Z'
    FLAP = 'M140 96 C142 72 168 64 196 80 C186 92 168 104 150 128 C142 118 138 106 140 96 Z'
    for side in (lambda d: d, mir):
        s.append(P(side(EAR), c(BLK), 5)); s.append(P(side(EARIN), c(PINK), 2.6))
    LATE_EARS = [P(side(FLAP), c('#1E1919'), 4) for side in (lambda d: d, mir)]
    s.append(P(HEAD, c(BLK), 5.5))
    if not mono:
        s.append('<path d="M206 130 C240 106 290 100 330 104 C292 112 252 124 222 146 Z" fill="#FFFFFF" opacity="0.13"/>')
        s.append('<path d="M420 180 C450 240 446 320 400 360 C430 316 438 250 410 196 Z" fill="#000" opacity="0.22"/>')
    for side in (lambda d: d, mir):
        s.append(P(side('M156 278 C170 256 208 252 240 266 C264 278 280 300 282 324 L282 360 C240 372 196 360 172 336 C158 318 152 298 156 278 Z'), c(TAN), 3.4))   # tan face side
        s.append(P(side('M190 196 C196 160 230 142 262 150 C280 156 284 176 272 190 C252 206 216 210 190 196 Z'), c(TAN2), 3.2))   # big tan brow, sweeping up toward the ear
    s.append(P('M278 140 C292 134 308 134 322 140 C326 190 330 226 334 252 L266 252 C270 226 274 190 278 140 Z', c(BLK), 0))   # black stripe down to the nose
    s += LATE_EARS                                                                                                               # the ear tips fold forward over the head
    s.append(P('M262 262 C276 246 324 246 338 262 C360 286 362 336 340 360 C326 376 274 376 260 360 C238 336 240 286 262 262 Z', c(WHT), 3.4))   # white muzzle
    for x in (244, 356): s.append(eye(x, 232, mono))
    s.append(P(NOSE, '#141010', 3.2)); s.append('<ellipse cx="288" cy="270" rx="12" ry="6" fill="%s"/>' % ('#FFFFFF' if mono else '#6E6562'))
    s.append(L('M300 306 L300 318', 3.4))
    s.append(P('M262 318 C276 324 290 324 300 318 C310 324 324 324 338 318 C336 346 320 362 300 362 C280 362 264 346 262 318 Z', '#FFFFFF' if mono else '#5A2A2E', 3.4))   # her open smile
    s.append(P('M282 342 C288 334 312 334 318 342 C318 356 310 362 300 362 C290 362 282 356 282 342 Z', c('#F08C9C'), 2.6))
    s.append(L('M300 340 L300 354', 1.8, INK if mono else '#C0606F'))
    for x, y in ((250, 296), (242, 308), (262, 310)): s.append('<circle cx="%s" cy="%s" r="2.4" fill="%s"/>' % (x, y, INK)); s.append('<circle cx="%s" cy="%s" r="2.4" fill="%s"/>' % (600 - x, y, INK))
    if not mono:
        for x in (198, 402): s.append('<ellipse cx="%s" cy="306" rx="20" ry="11" fill="#F08C9C" opacity="0.45"/>' % x)
    return s
def svg(parts, w=600, h=700): return '<svg xmlns="http://www.w3.org/2000/svg" viewBox="0 30 %d %d" width="%d" height="%d"><rect y="30" width="100%%" height="100%%" fill="#fff"/>%s</svg>' % (w, h, w, h, ''.join(parts))
for name, f in (('tidbit', tidbit), ('sugarfoot', sugarfoot)):
    open('/tmp/cute/%s-c.svg' % name, 'w').write(svg(f(False))); open('/tmp/cute/%s-l.svg' % name, 'w').write(svg(f(True)))
