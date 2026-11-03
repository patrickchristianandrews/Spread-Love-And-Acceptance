// node frames.js teaser|music <out.mp4>: frame-by-frame render through the live page, joined with ffmpeg
const { chromium } = require('playwright'); const { spawn } = require('child_process'); const fs = require('fs');
const [kind, OUT] = process.argv.slice(2);
const PAGE = { teaser: 'frequency-buddies-season-2.html', music: 'frequency-buddies-music-video.html' }[kind];
(async () => {
  const b = await chromium.launch({ args: ['--autoplay-policy=no-user-gesture-required'] });
  const p = await b.newPage({ viewport: { width: 1280, height: 720 } });
  await p.goto('http://127.0.0.1:8697/' + PAGE, { waitUntil: 'load', timeout: 120000 });
  const G = { teaser: 'TOLTeaser', music: 'TOLMusicVideo' }[kind];
  await p.waitForFunction(g => window[g] && window.TOLPups, G, { timeout: 60000 });
  await p.evaluate(() => document.fonts.ready); await p.waitForTimeout(1500);
  let dur, audio;
  if (kind === 'music') { dur = await p.evaluate(() => TOLMusicVideo.dur); audio = '/home/user/Spread-Love-And-Acceptance/assets/video/frequency-buddies-music-video.mp4'; }
  else { dur = await p.evaluate(() => TOLTeaser.duration); const wav = await p.evaluate(() => TOLTeaser.renderAudio(false)); audio = '/tmp/mk/clip/teaser.wav'; fs.writeFileSync(audio, Buffer.from(wav, 'base64')); }
  console.log(kind, 'duration', dur);
  const FPS = 24, N = Math.ceil(dur * FPS);
  const ff = spawn('ffmpeg', ['-y', '-loglevel', 'error', '-f', 'image2pipe', '-framerate', String(FPS), '-c:v', 'mjpeg', '-i', '-', '-i', audio, '-map', '0:v', '-map', '1:a', '-c:v', 'libx264', '-preset', 'slow', '-crf', '24', '-pix_fmt', 'yuv420p', '-r', '24', '-c:a', 'aac', '-b:a', '128k', '-map_metadata', '-1', '-movflags', '+faststart', '-shortest', OUT], { stdio: ['pipe', 'inherit', 'inherit'] });
  await p.evaluate(() => { window.__c = document.createElement('canvas'); __c.width = 1280; __c.height = 720; });
  for (let i = 0; i < N; i++) {
    const d = await p.evaluate(([k, t]) => { const c = __c, g = c.getContext('2d');
      if (k === 'teaser') TOLTeaser.renderAt(c, t, false);
      else { g.setTransform(1, 0, 0, 1, 0, 0); g.clearRect(0, 0, 1280, 720); TOLMusicVideo.draw(g, t, 1280, 720, { calm: false, burn: true }); }
      return c.toDataURL('image/jpeg', 0.9).slice(23); }, [kind, i / FPS]);
    if (!ff.stdin.write(Buffer.from(d, 'base64'))) await new Promise(r => ff.stdin.once('drain', r));
  }
  ff.stdin.end(); await new Promise(r => ff.on('close', r)); await b.close(); console.log('done', OUT);
})();
