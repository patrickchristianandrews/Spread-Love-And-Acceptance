import cv2, numpy as np
from pups import *
D = R + 'mockups/'
out = []
c = cv2.imread('clean-hpb.png'); shadow(c, 235, 842, 120, 12); shadow(c, 770, 846, 130, 12); paste(c, 'tb', 235, 842, 150); paste(c, 'sf', 770, 846, 150); out.append(('Picture book: title page', c))
c = cv2.imread('clean-ccy.png'); paste(c, 'sf', 1240, 1128, 175, True); paste(c, 'tb', 1660, 1128, 175, True); paste(c, 'sf', 190, 1208, 82); paste(c, 'tb', 430, 1208, 82, True); out.append(('Coloring book: cover', c))
c = cv2.imread('trailer-clean-4.png'); paste(c, 'tb', 480, 600, 118); paste(c, 'sf', 800, 600, 118, True); out.append(('Video: title card', c))
c = cv2.imread('trailer-clean-18.png'); shadow(c, 480, 600, 95, 9); shadow(c, 800, 600, 100, 9); paste(c, 'tb', 480, 600, 118); paste(c, 'sf', 800, 600, 118, True); out.append(('Video: Episode 1, the backyard', c))
c = cv2.imread('trailer-clean-42.png'); shadow(c, 457, 600, 95, 9); shadow(c, 767, 600, 100, 9); paste(c, 'tb', 457, 600, 118, True); paste(c, 'sf', 767, 600, 118, True); out.append(('Video: Episode 3, the snow', c))
c = cv2.imread('music-clean-20.png'); paste(c, 'tb', 235, 470, 84); paste(c, 'sf', 667, 580, 84); out.append(('Music video: on stage', c))
c = cv2.imread('game1.png')
for b in ((141, 418, 103, 85), (524, 419, 104, 85)): c = clear(c, b)
paste(c, 'tb', 185, 505, 42); paste(c, 'sf', 568, 505, 42); out.append(('Game: choose your pup', c))
c = cv2.imread('game3.png')
for b in ((0, 54, 42, 41), (344, 507, 46, 41)): c = clear(c, b)
paste(c, 'tb', 22, 96, 24); paste(c, 'tb', 367, 548, 24); out.append(('Game: Treat Chase', c))
for n, img in out: cv2.imwrite(D + 'final-' + n.lower().replace(': ', '-').replace(' ', '-').replace(',', '') + '.png', img)
board(out, fname=D + 'board.png'); board(out, fname='board.png')
# ---- board 2
out = []
c = cv2.imread('pbclean-7.png'); shadow(c, 258, 762, 170, 14); paste(c, 'sf', 258, 762, 200); out.append(('Picture book p7: Sugarfoot wakes up', c))
c = cv2.imread('pbclean-15.png'); shadow(c, 418, 762, 150, 14); paste(c, 'tb', 418, 762, 200, True); out.append(('Picture book p15: Tidbit checks in', c))
c = cv2.imread('pbclean-21.png'); shadow(c, 150, 745, 120, 10); paste(c, 'sf', 150, 745, 125); out.append(('Picture book p21: with the friends', c))
c = cv2.imread('pbclean-37.png'); shadow(c, 138, 772, 95, 8); shadow(c, 662, 770, 90, 8); paste(c, 'sf', 138, 772, 92); paste(c, 'tb', 662, 770, 92, True); out.append(('Picture book p37: find and count', c))
c = cv2.imread('trailer-clean-26.png'); shadow(c, 373, 600, 95, 9); shadow(c, 683, 600, 100, 9); paste(c, 'tb', 373, 600, 118); paste(c, 'sf', 683, 600, 118, True); out.append(('Video: Episode 2, the city', c))
c = cv2.imread('teaser-clean-6.png'); paste(c, 'tb', 554, 618, 100); paste(c, 'sf', 741, 618, 100, True); out.append(('Season 2: night watch', c))
c = cv2.imread('teaser-clean-14.png'); paste(c, 'tb', 602, 440, 84); paste(c, 'sf', 699, 440, 84, True); out.append(('Season 2: mountain top', c))
c = cv2.imread('teaser-clean-22.png'); paste(c, 'sf', 418, 466, 86); paste(c, 'tb', 618, 406, 86); out.append(('Season 2: under the sea', c))
c = cv2.imread('music-clean-12.png'); paste(c, 'tb', 1045, 468, 84); paste(c, 'sf', 866, 580, 84, True); out.append(('Music video: Tidbit on the platform', c))
c = cv2.imread('music-clean-35.png'); paste(c, 'tb', 526, 583, 84); paste(c, 'sf', 754, 583, 84, True); out.append(('Music video: with the band', c))
lg = cv2.imread('/home/user/Spread-Love-And-Acceptance/assets/img/logo-mark.png', cv2.IMREAD_UNCHANGED)
if lg.shape[2] == 3: lg = cv2.cvtColor(lg, cv2.COLOR_BGR2BGRA)
heart = lg[378:446, 210:300].copy(); lg[300:, :] = 0; lg[378:446, 210:300] = heart
paste(lg, 'tb', 110, 490, 120, True); paste(lg, 'sf', 400, 490, 120); cv2.imwrite(D + 'logo-new.png', lg)
bg = np.full((512, 512, 3), 255, np.uint8); a = lg[..., 3:4].astype(np.float32) / 255; out.append(('Logo mark', (lg[..., :3] * a + bg * (1 - a)).astype(np.uint8)))
pals = np.zeros((193, 719, 4), np.uint8); paste(pals, 'sf', 190, 188, 95); paste(pals, 'tb', 540, 188, 95, True); cv2.imwrite('pals-new.png', pals); cv2.imwrite(D + 'pals-new.png', pals)
out.append(('Site home page', cv2.imread('home-new.png')))
strip = np.full((330, 1280, 3), 255, np.uint8)
for i, (who, fl, rot) in enumerate([('tb', False, 0), ('tb', True, 0), ('tb', False, -10), ('tb', True, 10), ('sf', False, 0), ('sf', True, 0), ('sf', False, -8), ('sf', True, 8)]):
    paste(strip, who, 90 + i * 155, 300, 110, fl, rot)
out.append(('Every angle available from the two paintings', strip))
for n, img in out: cv2.imwrite(D + 'final2-' + n.lower().replace(': ', '-').replace(' ', '-').replace(',', '').replace('/', '') + '.png', img)
board(out, fname=D + 'board2.png', wide_last=True); board(out, fname='board2.png', wide_last=True)
# ---- snow set
base = cv2.imread('trailer-clean-42.png'); H = 118; out = []
c = base.copy(); shadow(c, 420, 600, 95, 9); shadow(c, 830, 600, 100, 9); paste(c, 'tb', 420, 600, H); paste(c, 'sf', 830, 600, H, True); out.append(('Facing each other', c))
c = base.copy(); shadow(c, 330, 600, 100, 9); shadow(c, 880, 600, 95, 9); paste(c, 'sf', 330, 600, H); paste(c, 'tb', 880, 600, H, True); out.append(('Tidbit trots over to Sugarfoot', c))
c = base.copy(); shadow(c, 560, 612, 95, 9); shadow(c, 760, 612, 100, 9); paste(c, 'sf', 760, 612, H, True); paste(c, 'tb', 560, 612, H); out.append(('Close at the basket', c))
c = base.copy(); shadow(c, 300, 540, 95, 8); paste(c, 'tb', 300, 540, H, False, -8); shadow(c, 840, 625, 100, 9); paste(c, 'sf', 840, 625, H); out.append(('Tidbit up the hill, Sugarfoot below', c))
c = base.copy(); shadow(c, 520, 605, 95, 9); shadow(c, 740, 605, 100, 9); paste(c, 'sf', 740, 605, H); paste(c, 'tb', 520, 605, H, True); out.append(('Side by side', c))
c = base.copy(); shadow(c, 250, 600, 95, 9); paste(c, 'tb', 250, 600, H, True); shadow(c, 640, 590, 100, 9); paste(c, 'sf', 640, 590, H, True); out.append(('Sugarfoot by the basket', c))
for n, img in out: cv2.imwrite(D + 'snow/snow-' + n.lower().replace(' ', '-').replace(',', '') + '.png', img)
board(out, h=349, fname=D + 'snow/snow-board.png'); board(out, h=349, fname='snow-board.png')
# close-up: before vs after on the snow frame
new = cv2.imread(D + 'snow/snow-close-at-the-basket.png')[380:640, 420:900]
cv2.imwrite('closeup.png', cv2.resize(new, None, fx=2, fy=2, interpolation=cv2.INTER_CUBIC))
print('done')
