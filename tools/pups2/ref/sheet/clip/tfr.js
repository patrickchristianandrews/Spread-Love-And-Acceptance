// render trailer frames with the painted pups: node tfr.js t1,t2,... [outprefix]
const { chromium } = require('playwright'); const fs = require('fs');
const times = process.argv[2].split(',').map(Number), pre = process.argv[3] || 'paint';
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.goto('http://127.0.0.1:8697/frequency-buddies.html', { waitUntil: 'load', timeout: 120000 });
  await p.waitForFunction(() => window.TOLTrailer && window.TOLPups && window.TOLPups.painted, null, { timeout: 60000 });
  await p.evaluate(() => Promise.all([document.fonts.ready, window.TOLPups.ready]));
  await p.waitForTimeout(800);
  await p.evaluate(() => { window.__c = document.createElement('canvas'); __c.width = 1280; __c.height = 720; });
  for (const t of times) {
    const d = await p.evaluate(t => { TOLTrailer.renderAt(__c, t, { captions: true, calm: false, dpr: 1 }); return __c.toDataURL('image/png').slice(22); }, t);
    fs.writeFileSync(`/tmp/mk/${pre}-${t}.png`, Buffer.from(d, 'base64'));
  }
  await b.close(); console.log('ok');
})();
