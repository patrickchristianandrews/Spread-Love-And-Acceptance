// node tclip.js <t0> <seconds> <out.mp4>: the trailer, through the real player, with the painted pups
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const fs = require('fs');
const [T0, DUR, OUT] = [Number(process.argv[2]), Number(process.argv[3]), process.argv[4]];
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto('http://127.0.0.1:8697/frequency-buddies.html', { waitUntil: 'load', timeout: 120000 });
  await p.waitForFunction(() => window.TOLTrailer && window.TOLPups && window.TOLPups.painted, null, { timeout: 60000 });
  await p.evaluate(() => Promise.all([document.fonts.ready, window.TOLPups.ready])); await p.waitForTimeout(800);
  const wav = await p.evaluate(() => TOLTrailer.renderAudio()); fs.writeFileSync('/tmp/mk/clip/trailer-full.wav', Buffer.from(wav, 'base64'));
  await p.evaluate(() => { window.__c = document.createElement('canvas'); __c.width = 1280; __c.height = 720; });
  const FPS = 24, N = Math.round(DUR * FPS);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-ss', String(T0), '-t', String(DUR), '-i', '/tmp/mk/clip/trailer-full.wav', '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'medium', '-crf', '21', '-pix_fmt', 'yuv420p', '-r', '24', '-c:a', 'aac', '-b:a', '128k', '-shortest', '-movflags', '+faststart', OUT], { stdio: ['pipe', 'inherit', 'inherit'] });
  for (let i = 0; i < N; i++) {
    const d = await p.evaluate(t => { TOLTrailer.renderAt(__c, t, { captions: true, calm: false, dpr: 1 }); return __c.toDataURL('image/jpeg', 0.92).slice(23); }, T0 + i / FPS);
    if (!ff.stdin.write(Buffer.from(d, 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close(); console.log('done', OUT);
})();
