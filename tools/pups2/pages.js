// pages.js: the new coloring pages. node pages.js <outdir>
global.window = global; const R = '/home/user/Spread-Love-And-Acceptance/tools/pups2/';
require(R + 'scene.js'); const S = require(R + 'svgctx.js'); const fs = require('fs');
const PUPS = JSON.parse(fs.readFileSync(process.argv[3] || '/tmp/cute/pups.json', 'utf8'));
const OUT = process.argv[2]; const W = 850, H = 1100, INK = '#2A1E1A';
// a pup with its paws at (x, y), scale s, facing flips the stand/walk poses
function pup(g, dog, pose, x, y, s, mono, flip) {
  const k = dog + '-' + pose + '-' + (mono ? 'l' : 'c');
  g.raw('<g transform="translate(' + x + ' ' + y + ') scale(' + (flip ? -s : s) + ' ' + s + ') translate(-300 -662)">' + PUPS[k] + '</g>');
}
function moon(g, x, y, r, o) { g.beginPath(); g.arc(x, y, r, 0, Math.PI * 2); g.fillStyle = o.mono ? '#fff' : '#FCE9A6'; g.fill(); g.lineWidth = 4; g.strokeStyle = INK; g.stroke();
  g.beginPath(); g.arc(x + r * 0.45, y - r * 0.25, r * 0.86, 0, Math.PI * 2); g.fillStyle = o.mono ? '#fff' : '#3B3F7A'; g.fill(); g.stroke(); }
function star(g, x, y, r, o) { g.beginPath(); for (let i = 0; i < 10; i++) { const a = -Math.PI / 2 + i * Math.PI / 5, rr = i % 2 ? r * 0.45 : r; i ? g.lineTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr) : g.moveTo(x + Math.cos(a) * rr, y + Math.sin(a) * rr); }
  g.closePath(); g.fillStyle = o.mono ? '#fff' : '#FFD95A'; g.fill(); g.lineWidth = 3; g.strokeStyle = INK; g.lineJoin = 'round'; g.stroke(); }
function sky(g, o, night) { if (!o.mono) { g.fillStyle = night ? '#3B3F7A' : '#CFEAFB'; g.fillRect(0, 0, W, H); } }
function title(g, t) { g.raw('<text x="425" y="1062" text-anchor="middle" font-family="Fraunces, Georgia, serif" font-weight="700" font-size="34" fill="' + INK + '">' + t + '</text>'); }
const PAGES = [
  ['Best buddies in the backyard', (g, o) => { sky(g, o); SCENE.sun(g, 690, 160, 52, o); SCENE.cloud(g, 200, 150, 1.0, o); SCENE.cloud(g, 470, 230, 0.7, o); SCENE.hills(g, W, 560, 700, o); SCENE.tree(g, 715, 640, 1.15, o); SCENE.fence(g, 40, 560, 640, 120, o);
    [[90, 990, '#F48FB1'], [780, 980, '#B79CEB']].forEach(p => SCENE.flower(g, p[0], p[1], 1.1, p[2], o)); SCENE.ball(g, 425, 960, 34, o);
    pup(g, 'sugarfoot', 'sit', 225, 985, 0.62, o.mono); pup(g, 'tidbit', 'sit', 630, 985, 0.62, o.mono); }],
  ['Shake? Here is my paw!', (g, o) => { sky(g, o); SCENE.sun(g, 130, 150, 48, o); SCENE.cloud(g, 560, 140, 1.0, o); SCENE.hills(g, W, 600, 740, o); SCENE.doghouse(g, 690, 690, 1.0, o);
    [[60, 1000], [400, 1010], [800, 1000]].forEach(p => SCENE.tuft(g, p[0], p[1], 1.3, o)); SCENE.bone(g, 425, 990, 1.2, 0.2, o);
    pup(g, 'tidbit', 'paw', 225, 985, 0.62, o.mono); pup(g, 'sugarfoot', 'sit', 630, 985, 0.62, o.mono); }],
  ['Nap time under the big tree', (g, o) => { sky(g, o); SCENE.cloud(g, 160, 160, 0.9, o); SCENE.cloud(g, 420, 110, 0.7, o); SCENE.hills(g, W, 620, 760, o); SCENE.tree(g, 640, 700, 1.7, o);
    SCENE.butterfly(g, 200, 380, 1.4, o); [[780, 1000, '#FFD95A'], [60, 1000, '#F48FB1']].forEach(p => SCENE.flower(g, p[0], p[1], 1.1, p[2], o));
    pup(g, 'sugarfoot', 'lie', 230, 1000, 0.58, o.mono); pup(g, 'tidbit', 'lie', 620, 1000, 0.58, o.mono); }],
  ['A walk in the park', (g, o) => { sky(g, o); SCENE.sun(g, 700, 150, 50, o); SCENE.cloud(g, 220, 170, 0.9, o); SCENE.hills(g, W, 560, 700, o); SCENE.tree(g, 110, 650, 1.0, o);
    SCENE.butterfly(g, 520, 330, 1.3, o); SCENE.butterfly(g, 330, 420, 1.0, o); [[420, 1010, '#B79CEB'], [790, 1000, '#F48FB1']].forEach(p => SCENE.flower(g, p[0], p[1], 1.0, p[2], o));
    pup(g, 'tidbit', 'walk', 215, 995, 0.5, o.mono); pup(g, 'sugarfoot', 'walk', 590, 995, 0.5, o.mono); }],
  ['Sharing is caring', (g, o) => { sky(g, o); SCENE.hills(g, W, 600, 740, o); SCENE.cloud(g, 425, 160, 1.2, o);
    [[150, 260], [425, 330], [700, 250]].forEach((p, i) => SCENE.heart(g, p[0], p[1], 1.6 - i * 0.2, o)); SCENE.bone(g, 425, 985, 1.4, -0.1, o);
    [[60, 1000], [800, 1000]].forEach(p => SCENE.tuft(g, p[0], p[1], 1.3, o));
    pup(g, 'sugarfoot', 'sit', 220, 975, 0.62, o.mono); pup(g, 'tidbit', 'sit', 630, 975, 0.62, o.mono); }],
  ['Goodnight, moon', (g, o) => { sky(g, o, true); moon(g, 650, 190, 70, o); [[120, 140, 18], [300, 90, 14], [430, 200, 20], [220, 300, 12], [780, 360, 16], [520, 120, 12]].forEach(p => star(g, p[0], p[1], p[2], o));
    SCENE.hills(g, W, 640, 780, o); pup(g, 'sugarfoot', 'lie', 230, 1000, 0.58, o.mono); pup(g, 'tidbit', 'lie', 620, 1000, 0.58, o.mono); }],
  ['Ready, set, play!', (g, o) => { sky(g, o); SCENE.sun(g, 130, 150, 48, o); SCENE.cloud(g, 600, 170, 1.0, o); SCENE.hills(g, W, 580, 720, o); SCENE.fence(g, 300, 840, 660, 110, o);
    SCENE.ball(g, 425, 420, 40, o); [[60, 1000], [400, 1010], [800, 1000]].forEach(p => SCENE.tuft(g, p[0], p[1], 1.3, o));
    pup(g, 'tidbit', 'stand', 205, 995, 0.5, o.mono); pup(g, 'sugarfoot', 'stand', 645, 995, 0.5, o.mono, true); }],
  ['Home sweet home', (g, o) => { sky(g, o); SCENE.sun(g, 700, 140, 46, o); SCENE.cloud(g, 180, 150, 0.9, o); SCENE.hills(g, W, 620, 760, o); SCENE.doghouse(g, 425, 700, 1.5, o);
    [[90, 1000, '#F48FB1'], [760, 1000, '#FFD95A']].forEach(p => SCENE.flower(g, p[0], p[1], 1.1, p[2], o));
    pup(g, 'tidbit', 'paw', 230, 1000, 0.55, o.mono); pup(g, 'sugarfoot', 'lie', 620, 1000, 0.55, o.mono); }],
];
PAGES.forEach(([t, draw], i) => {
  [true, false].forEach(mono => {
    const g = new S(W, H), o = { mono };
    g.fillStyle = '#fff'; g.fillRect(0, 0, W, H);
    g.raw('<defs><clipPath id="fr"><rect x="24" y="24" width="802" height="1000" rx="46"/></clipPath></defs><g clip-path="url(#fr)">');
    draw(g, o); g.raw('</g>');
    g.beginPath(); g.rect(24, 24, 802, 1000); g.lineWidth = 7; g.strokeStyle = INK; g.raw('<rect x="24" y="24" width="802" height="1000" rx="46" fill="none" stroke="' + INK + '" stroke-width="7"/>');
    title(g, t);
    fs.writeFileSync(OUT + '/page' + String(i + 1).padStart(2, '0') + '-' + (mono ? 'l' : 'c') + '.svg', g.svg());
  });
});
fs.writeFileSync(OUT + '/titles.json', JSON.stringify(PAGES.map(p => p[0])));
