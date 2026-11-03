// render Episode 1 from beat 0 through the first walks, both painted and vector, and log walking moments
const { chromium } = require('playwright'); const fs = require('fs');
const mode = process.argv[2] || 'paint', T0 = Number(process.argv[3] || 0), N = Number(process.argv[4] || 0);
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  if (mode === 'vector') await p.route('**/pups-paint.js', r => r.abort());
  await p.goto('http://127.0.0.1:8697/frequency-buddies.html', { waitUntil: 'load', timeout: 120000 });
  await p.waitForFunction(() => window.TOLBuddiesPlayer && window.TOLBuddies && window.TOLPups && (window.TOLPups.painted || !document.querySelector('script[src*=pups-paint]') || true), null, { timeout: 60000 });
  await p.evaluate(() => Promise.all([document.fonts.ready, window.TOLPups.ready || 0]));
  if (mode === 'vector') await p.evaluate(() => { window.TOLPups.painted = false; });
  const out = await p.evaluate(([mode, T0, N]) => {
    const P = window.TOLBuddiesPlayer, ep = window.TOLBuddies.episodes.s1e1; const c = document.createElement('canvas'); c.width = 1280; c.height = 720; const g = c.getContext('2d');
    const ctrl = P.excerpt(ep, 0, 60, { dur: b => Math.max(1.2, String(b.text).length / 15), canvas: c });
    const walks = []; let cur = null; const orig = TOLPups.draw; TOLPups.draw = function (g2, L, pose, ph, wag, blink, t, tilt, o) { if (o && o.moving) cur = (cur ? cur + '+' : '') + o.who; return orig.apply(this, arguments); };
    window.__frames = [];
    for (let t = 0; t < 40; t += 1 / 25) { ctrl.step(1 / 25); cur = null; ctrl.render(g, 1280, 720, 1, 1 / 25); if (cur) walks.push(t.toFixed(2) + ':' + cur);
      if (N && t >= T0 && window.__frames.length < N) window.__frames.push(c.toDataURL('image/png').slice(22)); }
    return walks;
  }, [mode, T0, N]);
  console.log(out.slice(0, 40).join(' '));
  const frames = await p.evaluate(() => window.__frames); frames.forEach((d, i) => fs.writeFileSync(`/tmp/mk/ew-${mode}-${String(i).padStart(2, '0')}.png`, Buffer.from(d, 'base64')));
  await b.close();
})();
