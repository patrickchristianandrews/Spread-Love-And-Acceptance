// Photo and video: AI generation and editing with stable-diffusion.cpp, video editing with
// ffmpeg, and the gallery where every result is kept.
const path = require('node:path');
const fs = require('node:fs');
const { spawn, execFile } = require('node:child_process');
const store = require('./store');
const engines = require('./engines');
const hardware = require('./hardware');
const models = require('./models');
const catalog = require('../shared/catalog');

const uniq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);

// ---------- gallery ----------

const GAL = () => store.file('gallery.json');
const mediaDir = () => store.dir('media');
function gallery() { return store.readJSON(GAL(), []).filter((g) => fs.existsSync(g.file)); }
function addToGallery(entry) {
  const all = store.readJSON(GAL(), []);
  const item = { id: `g${Date.now().toString(36)}${Math.random().toString(36).slice(2, 5)}`, created: Date.now(), ...entry };
  all.unshift(item);
  store.writeJSON(GAL(), all);
  return item;
}
function removeFromGallery(id) {
  const all = store.readJSON(GAL(), []);
  const g = all.find((x) => x.id === id);
  if (g && g.file.startsWith(mediaDir())) { try { fs.unlinkSync(g.file); } catch {} }
  store.writeJSON(GAL(), all.filter((x) => x.id !== id));
}
function saveDataUrl(dataUrl, meta = {}) {
  const [, mime, b64] = dataUrl.match(/^data:([^;]+);base64,(.*)$/) || [];
  if (!b64) throw new Error('Not an image.');
  const ext = mime.includes('png') ? 'png' : mime.includes('webp') ? 'webp' : 'jpg';
  const file = path.join(mediaDir(), `${uniq()}.${ext}`);
  fs.writeFileSync(file, Buffer.from(b64, 'base64'));
  return addToGallery({ kind: 'image', file, ...meta });
}
function saveBuffer(buf, ext, meta = {}) {
  const file = path.join(mediaDir(), `${uniq()}.${ext}`);
  fs.writeFileSync(file, buf);
  return addToGallery({ kind: ext === 'mp4' || ext === 'webm' || ext === 'gif' ? (ext === 'gif' ? 'image' : 'video') : 'image', file, ...meta });
}

// ---------- ffmpeg ----------

function ffmpegPath() {
  try {
    const p = require('ffmpeg-static');
    const unpacked = p && p.replace('app.asar', 'app.asar.unpacked');
    if (unpacked && fs.existsSync(unpacked)) return unpacked;
    if (p && fs.existsSync(p)) return p;
  } catch {}
  return 'ffmpeg';
}

function runFfmpeg(args, { onProgress, durationSec, signal } = {}) {
  return new Promise((resolve, reject) => {
    const proc = spawn(ffmpegPath(), ['-hide_banner', '-y', ...args], { windowsHide: true });
    let log = '';
    signal?.addEventListener('abort', () => proc.kill());
    proc.stderr.on('data', (d) => {
      const s = d.toString();
      log = (log + s).slice(-6000);
      const m = s.match(/time=(\d+):(\d+):([\d.]+)/);
      if (m && durationSec) onProgress?.(Math.min(1, (Number(m[1]) * 3600 + Number(m[2]) * 60 + Number(m[3])) / durationSec));
    });
    proc.on('error', reject);
    proc.on('exit', (code) => (code === 0 ? resolve() : reject(new Error(signal?.aborted ? 'Stopped.' : `Video tool failed: ${log.split('\n').filter(Boolean).slice(-2).join(' ')}`))));
  });
}

function probe(file) {
  return new Promise((resolve) => {
    execFile(ffmpegPath(), ['-hide_banner', '-i', file], { windowsHide: true }, (_e, _o, stderr) => {
      const d = stderr.match(/Duration: (\d+):(\d+):([\d.]+)/);
      const v = stderr.match(/Video: [^\n]*?(\d{2,5})x(\d{2,5})/);
      resolve({ duration: d ? Number(d[1]) * 3600 + Number(d[2]) * 60 + Number(d[3]) : 0, width: v ? Number(v[1]) : 0, height: v ? Number(v[2]) : 0, audio: /Audio:/.test(stderr) });
    });
  });
}

// ops = { start, end, crop: 'square'|'vertical'|'horizontal', height, speed, mute, reverse, brightness, contrast, saturation, fadeIn, fadeOut, format: 'mp4'|'webm'|'gif' }
async function editVideo(input, ops, { onProgress, signal } = {}) {
  const info = await probe(input);
  const start = Math.max(0, Number(ops.start) || 0);
  const end = Math.min(info.duration || Infinity, Number(ops.end) || info.duration || Infinity);
  const speed = Math.min(4, Math.max(0.25, Number(ops.speed) || 1));
  const vf = [];
  const af = [];
  if (ops.crop === 'square') vf.push('crop=min(iw\\,ih):min(iw\\,ih)');
  if (ops.crop === 'vertical') vf.push('crop=min(iw\\,ih*9/16):ih');
  if (ops.crop === 'horizontal') vf.push('crop=iw:min(ih\\,iw*9/16)');
  if (ops.height) vf.push(`scale=-2:${Number(ops.height)}`);
  if (ops.brightness || ops.contrast || ops.saturation) vf.push(`eq=brightness=${(Number(ops.brightness) || 0) / 100}:contrast=${1 + (Number(ops.contrast) || 0) / 100}:saturation=${1 + (Number(ops.saturation) || 0) / 100}`);
  if (speed !== 1) { vf.push(`setpts=PTS/${speed}`); let s = speed; while (s > 2) { af.push('atempo=2'); s /= 2; } while (s < 0.5) { af.push('atempo=0.5'); s /= 0.5; } af.push(`atempo=${s}`); }
  if (ops.reverse) { vf.push('reverse'); af.push('areverse'); }
  const outLen = ((end - start) || info.duration) / speed;
  if (ops.fadeIn) vf.push(`fade=t=in:st=0:d=${Number(ops.fadeIn)}`);
  if (ops.fadeOut && outLen) vf.push(`fade=t=out:st=${Math.max(0, outLen - Number(ops.fadeOut))}:d=${Number(ops.fadeOut)}`);
  const format = ops.format || 'mp4';
  const out = path.join(mediaDir(), `${uniq()}.${format}`);
  const args = [];
  if (start) args.push('-ss', String(start));
  args.push('-i', input);
  if (Number.isFinite(end) && end > start) args.push('-t', String(end - start));
  if (format === 'gif') {
    vf.push('fps=12', 'scale=480:-2:flags=lanczos', 'split[a][b];[a]palettegen[p];[b][p]paletteuse');
    args.push('-filter_complex', vf.join(','), '-an');
  } else {
    if (vf.length) args.push('-vf', vf.join(','));
    if (ops.mute || !info.audio) args.push('-an'); else if (af.length) args.push('-af', af.join(','));
    if (format === 'webm') args.push('-c:v', 'libvpx-vp9', '-b:v', '0', '-crf', '32', ...(ops.mute || !info.audio ? [] : ['-c:a', 'libopus']));
    else args.push('-c:v', 'libx264', '-preset', 'medium', '-crf', '20', '-pix_fmt', 'yuv420p', '-movflags', '+faststart', ...(ops.mute || !info.audio ? [] : ['-c:a', 'aac', '-b:a', '160k']));
  }
  args.push(out);
  await runFfmpeg(args, { onProgress, durationSec: outLen, signal });
  return addToGallery({ kind: format === 'gif' ? 'image' : 'video', file: out, title: `Edited ${path.basename(input)}`, parent: input });
}

async function extractFrame(input, atSec) {
  const out = path.join(mediaDir(), `${uniq()}-frame.png`);
  await runFfmpeg(['-ss', String(Math.max(0, Number(atSec) || 0)), '-i', input, '-frames:v', '1', out]);
  return addToGallery({ kind: 'image', file: out, title: `Frame at ${Number(atSec).toFixed(1)} s` });
}

// Evenly spaced frames from a video as JPEG data URLs, so a vision model can watch it.
async function videoFrames(input, count = 8) {
  const info = await probe(input);
  const n = Math.max(1, Math.min(count, Math.ceil((info.duration || 1) * 2)));
  const frames = [];
  for (let k = 0; k < n; k++) {
    const t = n === 1 ? 0 : ((info.duration || 0) * (k + 0.5)) / n;
    const out = path.join(store.dir('tmp'), `frame-${uniq()}-${k}.jpg`);
    await runFfmpeg(['-ss', String(t), '-i', input, '-frames:v', '1', '-vf', "scale='min(768,iw)':-2", '-q:v', '4', out]);
    frames.push({ t, dataUrl: `data:image/jpeg;base64,${fs.readFileSync(out).toString('base64')}` });
    fs.rmSync(out, { force: true });
  }
  return { duration: info.duration, frames };
}

// ---------- stable-diffusion.cpp ----------

let helpCache = null;
async function sdHelp(bin) {
  if (helpCache?.bin === bin) return helpCache.text;
  const text = await new Promise((resolve) => execFile(bin, ['--help'], { windowsHide: true, timeout: 20000 }, (_e, o, er) => resolve(`${o || ''}${er || ''}`)));
  helpCache = { bin, text };
  return text;
}

const running = new Map(); // jobId -> proc

// req = { modelId, mode: 'generate'|'edit'|'animate', prompt, negative, width, height, steps, cfg, seed, strength, image (path), mask (path), frames, fps }
async function generate(jobId, req, { onProgress, onStatus } = {}) {
  const hw = await hardware.detect();
  const engine = engines.resolve('sd', hw);
  if (!engine) throw new Error('The image engine is missing. Download one in Settings → Engines.');
  const installed = models.get(req.modelId);
  const spec = catalog.MEDIA_MODELS.find((m) => m.id === (installed?.catalogId || req.modelId));
  if (!installed || !spec) throw new Error('Download this model in Models → Images & video first.');
  const f = installed.files;
  const help = await sdHelp(engine.bin);
  const has = (flag) => help.includes(flag);
  const d = spec.defaults;
  const isVideo = spec.kind === 'video';
  const tmpOut = path.join(store.dir('tmp'), `${jobId}.${isVideo ? (has('.webm') ? 'webm' : 'avi') : 'png'}`);
  const args = [];
  if (isVideo) args.push('-M', 'vid_gen');
  if (spec.recipe === 'sd') { args.push('-m', f.model); if (f.vae) args.push('--vae', f.vae); }
  else {
    args.push('--diffusion-model', f.diffusion);
    if (f.vae) args.push('--vae', f.vae);
    if (f.clip_l) args.push('--clip_l', f.clip_l);
    if (f.t5xxl) args.push('--t5xxl', f.t5xxl);
    if (f.llm) args.push(has('--llm') ? '--llm' : '--qwen2vl', f.llm);
    args.push('--sampling-method', 'euler');
  }
  // Some community models (the Pony family) need their quality tags at the start of every prompt.
  const prompt = spec.promptPrefix && !String(req.prompt || '').toLowerCase().startsWith(spec.promptPrefix.split(',')[0]) ? `${spec.promptPrefix}${req.prompt || ''}` : (req.prompt || '');
  args.push('-p', prompt);
  // Chroma: the attention mask off gives cleaner pictures (stable-diffusion.cpp's advice).
  if (spec.recipe === 'chroma') { if (has('--model-args')) args.push('--model-args', 'chroma_use_dit_mask=false'); else if (has('--chroma-disable-dit-mask')) args.push('--chroma-disable-dit-mask'); }
  if (spec.recipe === 'qwen-image' && has('--flow-shift')) args.push('--flow-shift', '3');
  if (req.negative && spec.recipe !== 'flux' && spec.recipe !== 'kontext') args.push('-n', req.negative);
  args.push('-W', String(req.width || d.width), '-H', String(req.height || d.height));
  args.push('--steps', String(req.steps || d.steps), '--cfg-scale', String(req.cfg ?? d.cfg));
  args.push('-s', String(Number.isFinite(Number(req.seed)) && req.seed !== '' ? Number(req.seed) : -1));
  if (isVideo) {
    args.push('--video-frames', String(req.frames || d.frames));
    if (has('--fps')) args.push('--fps', String(req.fps || d.fps));
    if (has('--flow-shift')) args.push('--flow-shift', '3.0');
  }
  if (req.image) {
    if (spec.edit === 'instruct') args.push('-r', req.image);
    else { args.push('-i', req.image); if (!isVideo) args.push('--strength', String(req.strength ?? 0.6)); }
  }
  if (req.mask) args.push('--mask', req.mask);
  // Save graphics memory on smaller cards.
  const est = catalog.estimateMedia(spec, hw);
  if (est.fit !== 'gpu') { if (has('--offload-to-cpu')) args.push('--offload-to-cpu'); if (has('--vae-tiling')) args.push('--vae-tiling'); }
  if (has('--diffusion-fa')) args.push('--diffusion-fa');
  args.push('-o', tmpOut);

  onStatus?.(`Starting ${spec.name}…`);
  const started = Date.now();
  await new Promise((resolve, reject) => {
    const proc = spawn(engine.bin, args, { windowsHide: true, cwd: path.dirname(engine.bin) });
    running.set(jobId, proc);
    let log = '';
    const onData = (buf) => {
      const s = buf.toString();
      log = (log + s).slice(-8000);
      const m = [...s.matchAll(/(\d+)\/(\d+)\s*-\s*[\d.]+\s*(?:s\/it|it\/s)/g)].pop();
      if (m) onProgress?.(Number(m[1]) / Number(m[2]));
      if (/loading|load model/i.test(s)) onStatus?.('Loading the model…');
      else if (/sampling|denois/i.test(s)) onStatus?.(isVideo ? 'Creating the video…' : 'Creating the image…');
      else if (/decod/i.test(s)) onStatus?.('Finishing…');
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    proc.on('error', reject);
    proc.on('exit', (code) => {
      running.delete(jobId);
      if (code === 0 && fs.existsSync(tmpOut)) return resolve();
      if (proc.killed) return reject(new Error('Stopped.'));
      const lines = log.split('\n').map((l) => l.trim()).filter(Boolean);
      const err = [...lines].reverse().find((l) => /error|failed|out of memory|unsupported|invalid/i.test(l)) || lines.slice(-2).join(' ');
      reject(new Error(/memory/i.test(err) ? 'Not enough graphics memory. Try a smaller size, fewer frames, or a lighter model.' : err || 'The image engine stopped unexpectedly.'));
    });
  });
  const seconds = (Date.now() - started) / 1000;
  const meta = { prompt: req.prompt, model: spec.name, modelId: spec.id, seed: req.seed, seconds, mode: req.mode, width: req.width || d.width, height: req.height || d.height };
  if (isVideo) {
    // Convert to an MP4 that plays everywhere.
    const out = path.join(mediaDir(), `${jobId}.mp4`);
    onStatus?.('Saving the video…');
    await runFfmpeg(['-i', tmpOut, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-crf', '18', '-movflags', '+faststart', out]);
    fs.rmSync(tmpOut, { force: true });
    return addToGallery({ kind: 'video', file: out, ...meta });
  }
  const out = path.join(mediaDir(), `${jobId}.png`);
  fs.renameSync(tmpOut, out);
  return addToGallery({ kind: 'image', file: out, ...meta });
}

function stop(jobId) { running.get(jobId)?.kill(); }

module.exports = { runFfmpeg, videoFrames, gallery, addToGallery, removeFromGallery, saveDataUrl, saveBuffer, editVideo, extractFrame, probe, generate, stop, ffmpegPath, mediaDir };
