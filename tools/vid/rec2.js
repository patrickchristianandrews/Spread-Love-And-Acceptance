// node rec2.js <ep> <seconds> <out.webm>: records the episode with the player's own recorder (picture + all sound), in real time
const { chromium } = require('playwright'); const fs = require('fs');
const [EP, SECS, OUT] = [process.argv[2], Number(process.argv[3]), process.argv[4]];
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required', '--use-fake-ui-for-media-stream'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.goto('http://127.0.0.1:8697/frequency-buddies.html?ep=' + EP + '#episode-player', { waitUntil: 'load', timeout: 120000 });
  await p.waitForFunction(() => window.TOLBuddiesPlayer && window.TOLBuddiesPlayer._p && window.TOLBuddiesPlayer._p.dir && window.TOLPups, null, { timeout: 90000 });
  await p.evaluate(() => Promise.all([document.fonts.ready, window.TOLPups.ready || 0])); await p.waitForTimeout(1500);
  const ok = await p.evaluate(() => new Promise(res => { window.__done = null; const ok = TOLBuddiesPlayer.record({ captions: true, width: 1280, height: 720, bitrate: 8e6, onDone: d => { const r = new FileReader(); r.onload = () => { window.__done = r.result; }; r.readAsDataURL(d.video); }, onError: e => { window.__err = e; } }); res(ok); }));
  console.log('recording', ok);
  // stop when the episode's end overlay shows, or at SECS as a hard cap
  const t0 = Date.now();
  while (Date.now() - t0 < SECS * 1000) {
    await p.waitForTimeout(2000);
    const ended = await p.evaluate(() => { const e = document.querySelector('.fb-end'); const P = TOLBuddiesPlayer._p; return !!((e && !e.hidden && getComputedStyle(e).display !== 'none') || (P && P.dir && P.dir.ended)); });
    if (ended) { await p.waitForTimeout(2500); break; }
  }
  await p.evaluate(() => TOLBuddiesPlayer.stopRecording());
  await p.waitForFunction(() => window.__done || window.__err, null, { timeout: 60000 });
  const d = await p.evaluate(() => window.__done || ('ERR ' + window.__err));
  if (d.startsWith('ERR')) { console.log(d); process.exit(1); }
  fs.writeFileSync(OUT, Buffer.from(d.split(',')[1], 'base64')); console.log('saved', OUT, fs.statSync(OUT).size); await b.close();
})();
