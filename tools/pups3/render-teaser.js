// node tools/pups3/render-teaser.js <out.mp4> [stills.png]: renders the Season 2 teaser with the sprite pups (a preview;
// the site keeps its own pups). With a second argument it only saves a sheet of stills.
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const fs = require('fs'); const path = require('path');
const [OUT, STILLS] = process.argv.slice(2), DIR = __dirname;
const b64 = f => 'data:image/webp;base64,' + fs.readFileSync(path.join(DIR, f)).toString('base64');
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  p.on('pageerror', e => console.log('PAGEERROR', e.message));
  await p.goto('http://127.0.0.1:8697/frequency-buddies-season-2.html', { waitUntil: 'load', timeout: 120000 });
  await p.waitForFunction(() => window.TOLTeaser && window.TOLPups, null, { timeout: 60000 });
  const DRAWN = process.env.DRAWN === '1'; // DRAWN=1: the site's own drawn pups (for the site's teaser video)
  if (!DRAWN) await p.addScriptTag({ content: fs.readFileSync(path.join(DIR, 'sprite-pups.js'), 'utf8') });
  const ok = DRAWN || await p.evaluate(async ([w, ps, meta]) => {
    const load = src => new Promise((res, rej) => { const i = new Image(); i.onload = () => res(i); i.onerror = rej; i.src = src; });
    const [walk, poses] = await Promise.all([load(w), load(ps)]);
    return TOLPupSprites.install({ walk, poses, meta });
  }, [b64('walk.webp'), b64('poses.webp'), JSON.parse(fs.readFileSync(path.join(DIR, 'meta.json'), 'utf8'))]);
  if (!ok) throw new Error('sprites not installed');
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(800);
  const dur = await p.evaluate(() => TOLTeaser.duration);
  await p.evaluate(() => { window.__c = document.createElement('canvas'); __c.width = 1280; __c.height = 720; });
  // a different purple and pink item in each scene of the teaser's edit
  const shot = t => p.evaluate(t => { if (window.TOLPups.sprites !== true) { TOLTeaser.renderAt(__c, t, false); return __c.toDataURL('image/jpeg', 0.9).slice(23); } const e = TOLTeaser.edit.filter(x => t >= x.t0 && t < x.t1)[0]; TOLPups.outfitKey = 's2teaser:' + (e ? e.id + ':' + e.t0 : 'x'); TOLTeaser.renderAt(__c, t, false); return __c.toDataURL('image/jpeg', 0.9).slice(23); }, t);
  if (STILLS) {
    const ts = process.env.TIMES ? process.env.TIMES.split(',').map(Number) : Array.from({ length: 12 }, (_, i) => +(2 + i * (dur - 4) / 11).toFixed(2)), imgs = [];
    for (const t of ts) { for (let k = 6; k > 0; k--) await shot(t - k / 24); imgs.push(await shot(t)); } // a few frames first, so walking shows
    await p.setContent('<body style="margin:0;background:#111;display:grid;grid-template-columns:repeat(3,640px);gap:4px">' + imgs.map((d, i) => '<div style="position:relative"><img width="640" src="data:image/jpeg;base64,' + d + '"><b style="position:absolute;left:6px;top:4px;color:#fff;font:14px sans-serif;background:#0008;padding:1px 5px">' + ts[i] + 's</b></div>').join('') + '</body>');
    await p.setViewportSize({ width: 1928, height: 4 * 364 }); await p.screenshot({ path: STILLS }); await b.close(); console.log('stills', STILLS, dur); return;
  }
  const wav = await p.evaluate(() => TOLTeaser.renderAudio(false)); const audio = OUT.replace(/\.mp4$/, '.wav');
  fs.writeFileSync(audio, Buffer.from(wav.split(',')[1] || wav, 'base64'));
  const FPS = 30, N = Math.ceil(dur * FPS);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'fast', '-crf', '21', '-pix_fmt', 'yuv420p', '-c:a', 'aac', '-b:a', '160k', '-shortest', '-movflags', '+faststart', OUT]);
  for (let i = 0; i < N; i++) { const d = await shot(i / FPS); if (!ff.stdin.write(Buffer.from(d, 'base64'))) await new Promise(r => ff.stdin.once('drain', r)); }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close(); console.log('done', OUT, dur);
})();
