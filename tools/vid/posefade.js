// steps an episode at 30 fps with the real stage, finds pose changes, and saves a strip of frames through the first few
const { chromium } = require('playwright'); const fs = require('fs');
const EP = process.argv[2] || 's1e1', OUT = process.argv[3];
(async () => {
  const b = await chromium.launch(); const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.goto('http://127.0.0.1:8697/frequency-buddies.html?ep=' + EP, { waitUntil: 'load', timeout: 120000 });
  await p.waitForFunction(() => window.TOLBuddiesPlayer && TOLBuddiesPlayer.excerpt && window.TOLPups, null, { timeout: 90000 });
  const strips = await p.evaluate(async (EP) => {
    const P = TOLBuddiesPlayer, ep = await P.loadEpisode(EP);
    const cv = document.createElement('canvas'); cv.width = 1280; cv.height = 720; const g = cv.getContext('2d');
    const x = P.excerpt(ep, 0, 400, { dur: bt => Math.max(1.2, String(bt.text).length / 15) });
    const out = [], last = {}; let pending = [];
    for (let f = 0; f < 30 * 400 && out.length < 4; f++) {
      x.step(1 / 30); x.render(g, 1280, 720, 1, 1 / 30);
      for (const id of ['tidbit', 'sugarfoot']) {
        const c = x.stage.chars && x.stage.chars[id]; if (!c || !c.headPx) continue;
        if (last[id] && c.dpose && last[id] !== c.dpose && !pending.some(q => q.id === id)) pending.push({ id, from: last[id], to: c.dpose, n: 0, frames: [], hx: c.headPx.x, hy: c.headPx.y });
        last[id] = c.dpose;
      }
      for (const q of pending) {
        const c = x.stage.chars[q.id]; const cx = Math.max(0, Math.min(1280 - 260, c.headPx.x - 150)), cy = Math.max(0, Math.min(720 - 200, c.headPx.y - 60));
        const t = document.createElement('canvas'); t.width = 260; t.height = 200; t.getContext('2d').drawImage(cv, cx, cy, 260, 200, 0, 0, 260, 200);
        q.frames.push(t.toDataURL('image/png')); q.n++;
      }
      pending = pending.filter(q => { if (q.n >= 12) { out.push(q); return false; } return true; });
    }
    return out.map(q => ({ id: q.id, from: q.from, to: q.to, frames: q.frames }));
  }, EP);
  // one row per change, 12 frames (0.4 s) each
  const html = '<body style="margin:0;background:#fff">' + strips.map(s => '<div style="display:flex;align-items:center;font:12px sans-serif"><div style="width:90px">' + s.id + '<br>' + s.from + ' → ' + s.to + '</div>' + s.frames.filter((_, i) => i % 2 === 0).map(f => '<img src="' + f + '" width="170">').join('') + '</div>').join('') + '</body>';
  await p.setContent(html); await p.setViewportSize({ width: 1120, height: 140 * Math.max(1, strips.length) });
  await p.screenshot({ path: OUT }); console.log(strips.map(s => s.id + ' ' + s.from + '>' + s.to).join(', ')); await b.close();
})();
