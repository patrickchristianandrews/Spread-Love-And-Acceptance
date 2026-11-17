// node tools/kids/painted/render.js: renders the painted Tidbit and Sugarfoot (assets/js/pups.js, the site's own painted
// pups) large, on a clear background, for the books: every pose, every outfit item (Tidbit's purple, Sugarfoot's pink),
// eyes open and closed. Writes tools/kids/painted/png/<who>-<pose>-<outfit>-<eyes>.png and index.json (the paw point and
// the head point of each, in pixels). Needs the local server (python3 -m http.server 8697 --bind 127.0.0.1).
const { chromium } = require('playwright'); const fs = require('fs'); const path = require('path');
const OUT = path.join(__dirname, 'png'); fs.mkdirSync(OUT, { recursive: true });
const SC = 12;   // pixels per pup unit: a standing pup is about 50 units, so about 600 px tall
(async () => {
  const b = await chromium.launch(); const p = await b.newPage();
  await p.goto('http://127.0.0.1:8697/frequency-buddies-season-2.html', { waitUntil: 'load' });
  await p.waitForFunction(() => window.TOLPups && window.TOLPups.painted, null, { timeout: 60000 });
  const idx = {};
  for (const who of ['tidbit', 'sugarfoot']) for (const pose of ['sit', 'lie', 'run']) for (const outfit of ['hat', 'cap', 'bow', 'bandana', 'necklace', 'none']) for (const eyes of ['open', 'shut']) {
    const r = await p.evaluate(([who, pose, outfit, eyes, SC]) => {
      const P = window.TOLPups, L = P.looks[who === 'tidbit' ? 'collar' : 'drop'];
      const W = 100 * SC, H = 80 * SC, cv = document.createElement('canvas'); cv.width = W; cv.height = H;
      const g = cv.getContext('2d'); g.imageSmoothingEnabled = true; g.imageSmoothingQuality = 'high';
      const ox = W / 2, oy = H - 8 * SC;
      g.translate(ox, oy); g.scale(SC, SC);
      // a still pup (no breathing or sway: t 0, wag 0); walking uses a mid-stride frame
      P.clock = 0; P.quiet = true;
      P.draw(g, L, pose, pose === 'run' ? 0.9 : 0, 0, eyes === 'shut', 0, 0, outfit === 'none' ? { noOutfit: true } : { outfit: outfit, moving: pose === 'run' });
      const hp = P.headPos(L, pose, pose === 'run' ? 0.9 : 0);
      // trim to the drawing
      const d = g.getImageData(0, 0, W, H).data; let x0 = W, y0 = H, x1 = 0, y1 = 0;
      for (let y = 0; y < H; y++) for (let x = 0; x < W; x++) if (d[(y * W + x) * 4 + 3] > 8) { if (x < x0) x0 = x; if (x > x1) x1 = x; if (y < y0) y0 = y; if (y > y1) y1 = y; }
      x0 = Math.max(0, x0 - 4); y0 = Math.max(0, y0 - 4); x1 = Math.min(W - 1, x1 + 4); y1 = Math.min(H - 1, y1 + 4);
      const c2 = document.createElement('canvas'); c2.width = x1 - x0 + 1; c2.height = y1 - y0 + 1; c2.getContext('2d').drawImage(cv, -x0, -y0);
      return { url: c2.toDataURL('image/png'), w: c2.width, h: c2.height, paw: [ox - x0, oy - y0], head: [ox + hp.x * SC - x0, oy + hp.y * SC - y0], unit: SC };
    }, [who, pose, outfit, eyes, SC]);
    const name = `${who}-${pose}-${outfit}-${eyes}`;
    fs.writeFileSync(path.join(OUT, name + '.png'), Buffer.from(r.url.split(',')[1], 'base64'));
    idx[name] = { w: r.w, h: r.h, paw: r.paw, head: r.head, unit: r.unit };
  }
  fs.writeFileSync(path.join(__dirname, 'index.json'), JSON.stringify(idx, null, 1)); console.log(Object.keys(idx).length, 'renders'); await b.close();
})();
