const { chromium } = require('playwright'); const fs = require('fs');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto('http://127.0.0.1:8697/frequency-buddies.html', { waitUntil: 'load', timeout: 120000 });
  await p.waitForFunction(() => window.TOLTrailer && window.TOLPups, null, { timeout: 60000 });
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(1200);
  await p.evaluate(() => { TOLPups.draw = function () {}; TOLPups.cape = function () {}; window.__c = document.createElement('canvas'); __c.width = 1280; __c.height = 720; });
  const FPS = 24, T0 = 16, N = 240; fs.mkdirSync('/tmp/mk/clip', { recursive: true });
  for (let i = 0; i < N; i++) {
    const d = await p.evaluate(t => { const c = __c; TOLTrailer.renderAt(c, t, { captions: true, calm: false, dpr: 1 }); return c.toDataURL('image/png').slice(22); }, T0 + i / FPS);
    fs.writeFileSync(`/tmp/mk/clip/bg${String(i).padStart(4, '0')}.png`, Buffer.from(d, 'base64'));
  }
  // the trailer's own audio for that window
  const wav = await p.evaluate(() => TOLTrailer.renderAudio());
  fs.writeFileSync('/tmp/mk/clip/trailer.wav', Buffer.from(wav, 'base64'));
  await b.close(); console.log('frames', N);
})();
