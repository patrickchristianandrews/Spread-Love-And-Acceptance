// Tries one picture or video on the real engine and records what came out: how long it took, how
// big the file is, and a small thumbnail (printed as text, so it can be read from a build log).
// For experiments on the build machines, which have no graphics card: small sizes, few steps.
// It never fails the build; a try that does not work is recorded as such.
//   node scripts/try-media.js <label> <minutes allowed> -- <engine options, without -o>
//   node scripts/try-media.js --help-lines        (records the engine's own option list)
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { spawn, execFileSync } = require('node:child_process');

process.env.QUICKSILVER_HOME ||= fs.mkdtempSync(path.join(os.tmpdir(), 'qs-try-'));
const ROOT = path.join(__dirname, '..');
const OUT = path.join(ROOT, 'proofs');
fs.mkdirSync(OUT, { recursive: true });
const RESULTS = path.join(OUT, 'results.txt');
const note = (line) => { fs.appendFileSync(RESULTS, `${line}\n`); console.log(line.length > 300 ? `${line.slice(0, 120)}… (${line.length} characters)` : line); };
const engines = require('../src/main/engines');
const media = require('../src/main/media');
const engine = engines.resolve('sd', { vramGB: 0, gpus: [] });
if (!engine) { note('RESULT engine missing'); process.exit(0); }

if (process.argv[2] === '--help-lines') {
  let help = '';
  try { help = execFileSync(engine.bin, ['--help'], { encoding: 'utf8', timeout: 60000, windowsHide: true }); } catch (e) { help = `${e.stdout || ''}${e.stderr || ''}`; }
  note(`ENGINE ${engine.bin} (${help.length} characters of help)`);
  for (const l of help.split('\n')) if (/sampling-method|scheduler|--tae|taesd|preview|max-vram|vae-tiling|temporal|lora|upscale|--backend|flash-attn|diffusion-fa|offload|video-frames|--fps|strength|clip-skip|--mode|rng|batch|vae-on-cpu|clip-on-cpu|hires|adetailer|cache|--type|skip-layer|slg|distilled|guidance|flow-shift|timestep-shift|listen|server/i.test(l)) note(`HELP ${l.trim().slice(0, 230)}`);
  process.exit(0);
}

const label = String(process.argv[2] || 'try').replace(/[^a-z0-9_-]/gi, '');
const minutes = Number(process.argv[3]) || 15;
const args = process.argv.slice(process.argv.indexOf('--') + 1);
const video = args.includes('vid_gen');
const out = path.join(OUT, `${label}.${video ? 'webm' : 'png'}`);
const t0 = Date.now();
const proc = spawn(engine.bin, [...args, '-o', out], { windowsHide: true, cwd: ROOT }); // paths in the options are relative to the app's folder
let log = '';
let lastStep = '';
const onData = (b) => { const s = b.toString(); log = (log + s).slice(-6000); const m = [...s.matchAll(/(\d+)\/(\d+)\s*-\s*([\d.]+)\s*(s\/it|it\/s)/g)].pop(); if (m) lastStep = `${m[1]}/${m[2]} at ${m[3]} ${m[4]}`; };
proc.stdout.on('data', onData); proc.stderr.on('data', onData);
const timer = setTimeout(() => { log += `\n[try-media] stopped after ${minutes} minutes`; try { proc.kill(); } catch {} }, minutes * 60 * 1000);
proc.on('error', (e) => { clearTimeout(timer); note(`RESULT ${label} FAILED could not start: ${e.message}`); process.exit(0); });
proc.on('exit', (code) => {
  clearTimeout(timer);
  const sec = Math.round((Date.now() - t0) / 1000);
  const made = [out, out.replace(/\.webm$/, '.avi'), out.replace(/\.webm$/, '.mp4')].find((f) => { try { return fs.statSync(f).size > 0; } catch { return false; } });
  if (code !== 0 || !made) {
    const lines = log.split('\n').map((l) => l.trim()).filter(Boolean);
    note(`RESULT ${label} FAILED code ${code} after ${sec} s (last step ${lastStep || 'none'}): ${lines.slice(-4).join(' | ').slice(0, 500)}`);
    process.exit(0);
  }
  const size = fs.statSync(made).size;
  let extra = '';
  const thumb = path.join(OUT, `${label}.jpg`);
  try {
    const ffmpeg = media.ffmpegPath();
    if (video) {
      // A frame from the middle of the clip, and what the clip is.
      const info = (() => { try { execFileSync(ffmpeg, ['-hide_banner', '-i', made], { encoding: 'utf8', stdio: ['ignore', 'pipe', 'pipe'] }); return ''; } catch (e) { return String(e.stderr || ''); } })();
      extra = ` ${(info.match(/Duration: ([\d:.]+)/) || [])[1] || '?'} long, ${(info.match(/, (\d{2,5}x\d{2,5})/) || [])[1] || '?'}`;
      execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', made, '-vf', 'select=eq(n\\,4),scale=176:-2', '-frames:v', '1', '-q:v', '10', thumb]);
    } else {
      extra = media.looksBlank(made) ? ' BLANK (one flat colour)' : '';
      execFileSync(ffmpeg, ['-hide_banner', '-loglevel', 'error', '-y', '-i', made, '-vf', 'scale=176:-2', '-q:v', '10', thumb]);
    }
  } catch (e) { extra += ` (no thumbnail: ${String(e.message).slice(0, 120)})`; }
  note(`RESULT ${label} ok in ${sec} s (${lastStep || 'no step line'}), ${Math.round(size / 1024)} KB${extra}`);
  try { note(`THUMB ${label} ${fs.readFileSync(thumb).toString('base64')}`); } catch { /* no thumbnail */ }
  process.exit(0);
});
