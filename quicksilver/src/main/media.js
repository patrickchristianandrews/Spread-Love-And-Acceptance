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
    children.add(proc);
    proc.on('exit', () => children.delete(proc));
    proc.on('error', () => children.delete(proc));
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
  const format = ['mp4', 'webm', 'gif', 'mov', 'mp3', 'wav'].includes(ops.format) ? ops.format : 'mp4';
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
  const text = await new Promise((resolve) => execFile(bin, ['--help'], { windowsHide: true, timeout: 30000 }, (_e, o, er) => resolve(`${o || ''}${er || ''}`)));
  // Only a real answer is remembered: if the engine was slow to start once (a virus scan of a new
  // file, say), every option would otherwise look unsupported for the rest of the session.
  if (text.length > 200) helpCache = { bin, text };
  return text;
}

const running = new Map(); // jobId -> proc
// Picture, video and ffmpeg jobs in progress: all stopped when Quicksilver closes, so nothing keeps
// the graphics card busy with no window.
const children = new Set();
function stopAll() {
  for (const t of waiting.values()) t.cancelled = true;
  for (const p of [...running.values(), ...children]) { try { p.kill(); } catch {} }
  running.clear(); children.clear();
}

// ---------- one picture or video at a time ----------
// Two jobs at once fight over the graphics card's memory and usually both fail near the end, so
// jobs wait their turn (from Create, from a chat, or both).
let tail = Promise.resolve();
let activeJobs = 0;
const waiting = new Map(); // jobId -> { cancelled }
const stopped = new Set(); // jobs you pressed Stop on: never tried again
const cleanId = (id) => String(id || '').replace(/[^a-z0-9_-]/gi, '').slice(0, 64) || `job${Date.now().toString(36)}`;

// req = { modelId, mode: 'generate'|'edit'|'animate', prompt, negative, width, height, steps, cfg, seed, strength, image (path), mask (path), frames, fps }
async function generate(jobId, req, cb = {}) {
  jobId = cleanId(jobId);
  const ticket = { cancelled: false };
  waiting.set(jobId, ticket);
  if (activeJobs > 0 || waiting.size > 1) cb.onStatus?.('Waiting for the one before it to finish…');
  const prev = tail;
  let release;
  tail = new Promise((r) => { release = r; });
  await prev;
  waiting.delete(jobId);
  activeJobs++;
  try {
    if (ticket.cancelled || stopped.has(jobId)) throw new Error('Stopped.');
    return await generateNow(jobId, req, cb);
  } finally { activeJobs--; stopped.delete(jobId); release(); hardware.detect({ fresh: true }).catch(() => {}); }
}
function stop(jobId) {
  jobId = cleanId(jobId);
  stopped.add(jobId);
  const t = waiting.get(jobId);
  if (t) t.cancelled = true;
  try { running.get(jobId)?.kill(); } catch {}
  if (!t && !running.has(jobId)) stopped.delete(jobId); // nothing to stop: don't remember it
}

// The engine's command line for one job. Worked out separately so it can be checked without a
// graphics card. `safe` is the second try after a failure: everything that saves graphics memory.
function sdArgs(req, { spec, files: f, hw, has, safe = false, out }) {
  const d = spec.defaults;
  const isVideo = spec.kind === 'video';
  const vram = hw.vramGB || 0;
  const est = catalog.estimateMedia(spec, hw);
  const notes = [];
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

  // Size. A job fails at the very end (when the result is decoded) if it is too big for the
  // card, after all the waiting. So a clip is made at 480p on cards under 16 GB, and the second
  // try always uses the small sizes.
  let width = Number(req.width) || d.width;
  let height = Number(req.height) || d.height;
  let frames = Number(req.frames) || d.frames;
  if (isVideo) {
    if ((safe || vram < 16) && width * height > 832 * 480 * 1.15) {
      [width, height] = width > height ? [832, 480] : width < height ? [480, 832] : [640, 640];
      notes.push(`at ${width}×${height}, which fits this graphics card`);
    }
    const most = safe ? 33 : vram && vram < 12 ? 49 : 81;
    if (frames > most) { frames = most; notes.push(`${Math.round(most / (req.fps || d.fps || 16))} seconds long`); }
  } else if (safe && width * height > 1024 * 1024 * 1.05) {
    const k = Math.sqrt((1024 * 1024) / (width * height));
    width = Math.max(256, Math.round((width * k) / 64) * 64); height = Math.max(256, Math.round((height * k) / 64) * 64);
    notes.push(`at ${width}×${height}`);
  }
  args.push('-W', String(width), '-H', String(height));
  args.push('--steps', String(req.steps || d.steps), '--cfg-scale', String(req.cfg ?? d.cfg));
  args.push('-s', String(Number.isFinite(Number(req.seed)) && req.seed !== '' ? Number(req.seed) : -1));
  if (isVideo) {
    args.push('--video-frames', String(frames));
    if (has('--fps')) args.push('--fps', String(req.fps || d.fps));
    if (has('--flow-shift')) args.push('--flow-shift', '3.0');
  }
  if (req.image) {
    if (spec.edit === 'instruct') args.push('-r', req.image);
    else { args.push('-i', req.image); if (!isVideo) args.push('--strength', String(req.strength ?? 0.6)); }
  }
  if (req.mask) args.push('--mask', req.mask);

  // Graphics memory. The model's weights wait in ordinary memory and go to the card as they are
  // needed (no slower, the engine's own advice for cards the model only just fits), the result
  // is decoded in tiles, and the engine is told to keep within what is free right now.
  const tight = est.fit !== 'gpu' || vram < (spec.vramGB || 0) + 3;
  const offload = safe || isVideo || tight;
  if (offload && has('--offload-to-cpu')) args.push('--offload-to-cpu');
  if ((safe || isVideo || tight || vram <= 12) && has('--vae-tiling')) args.push('--vae-tiling');
  if (isVideo && (safe || vram < 16) && has('--temporal-tiling')) args.push('--temporal-tiling');
  if (offload && vram && has('--max-vram')) args.push('--max-vram', '-1');
  if (has('--diffusion-fa')) args.push('--diffusion-fa');
  args.push('-o', out);
  return { args, width, height, frames, notes };
}

// Is a finished picture just one flat colour (what a failed run can produce)? Counts how many
// different byte values its pixel data has.
function looksBlank(file) {
  try {
    const b = fs.readFileSync(file);
    if (b.length < 8 || b.toString('latin1', 1, 4) !== 'PNG') return false;
    let pos = 8; const idat = [];
    while (pos + 12 <= b.length) {
      const len = b.readUInt32BE(pos);
      if (b.toString('ascii', pos + 4, pos + 8) === 'IDAT') idat.push(b.subarray(pos + 8, pos + 8 + len));
      pos += 12 + len;
    }
    const raw = require('node:zlib').inflateSync(Buffer.concat(idat));
    const seen = new Set();
    for (let k = 0; k < raw.length; k += 53) { seen.add(raw[k]); if (seen.size > 12) return false; }
    return true;
  } catch { return false; }
}

const MEMORY_RX = /out of (device |host )?memory|outofdevicememory|outofhostmemory|memory allocation|failed to allocate|alloc(ation)? (of|failed)|cuda error: out|not enough memory|bad_alloc|insufficient memory/i;
const wait = (ms) => new Promise((r) => setTimeout(r, ms));

// Frees graphics memory for the job when a loaded chat model holds what it needs.
async function makeRoom(spec, hw, onStatus, everything = false) {
  if (!hw.vramGB) return hw;
  const llama = require('./llama');
  const held = llama.gpuHeld();
  if (!held) return hw;
  const free = hw.vramFreeLive ? hw.vramFreeGB : hw.vramGB - held;
  const need = Math.min(hw.vramGB, (spec.vramGB || spec.sizeGB || 6) + 1);
  if (!everything && free >= need) return hw;
  if (!llama.releaseGpu()) return hw;
  onStatus?.('Making room on the graphics card (your chat model loads again when you next chat)…');
  await wait(1200);
  return hardware.detect({ fresh: true });
}

// One run of the engine. Resolves with the file it made; rejects with an error that says whether
// it was stopped, ran out of memory, and what the engine last said.
function runEngine(jobId, { engine, args, out, isVideo, onProgress, onStatus }) {
  return new Promise((resolve, reject) => {
    const proc = spawn(engine.bin, args, { windowsHide: true, cwd: path.dirname(engine.bin) });
    running.set(jobId, proc);
    let log = '';
    let stage = 'load';
    let shown = 0;
    const up = (v) => { if (v > shown) { shown = v; onProgress?.(v); } };
    const word = isVideo ? 'video' : 'picture';
    // An engine that says nothing for a very long time has hung (one step of a video on a slow
    // PC can take many minutes, so the wait is generous).
    let quiet = null;
    const alive = () => { clearTimeout(quiet); quiet = setTimeout(() => { log += '\n[Quicksilver] no output for 45 minutes: stopped'; try { proc.kill(); } catch {} }, 45 * 60 * 1000); quiet.unref?.(); };
    alive();
    const onData = (buf) => {
      alive();
      const s = buf.toString();
      log = (log + s).slice(-12000);
      if (/decod/i.test(s) && stage !== 'decode') { stage = 'decode'; up(0.87); onStatus?.(`Finishing: turning it into a ${word}…`); }
      const m = [...s.matchAll(/(\d+)\/(\d+)\s*-\s*[\d.]+\s*(?:s\/it|it\/s)/g)].pop();
      if (m && Number(m[2]) > 0) {
        const frac = Math.min(1, Number(m[1]) / Number(m[2]));
        if (stage === 'decode') up(0.87 + frac * 0.1);
        else {
          if (stage !== 'sample') { stage = 'sample'; onStatus?.(isVideo ? 'Creating the video…' : 'Creating the picture…'); }
          up(0.05 + frac * 0.8);
          // The steps are done, but the result still has to be decoded and saved.
          if (frac >= 1) onStatus?.(`Finishing: turning it into a ${word}…`);
        }
      } else if (stage === 'load' && /loading|load model|loaded/i.test(s)) { onStatus?.('Loading the model…'); up(0.03); }
    };
    proc.stdout.on('data', onData);
    proc.stderr.on('data', onData);
    const fail = (why, code) => {
      const e = new Error(why);
      e.stopped = stopped.has(jobId);
      e.memory = MEMORY_RX.test(log);
      e.log = log; e.code = code;
      reject(e);
    };
    proc.on('error', (err) => { clearTimeout(quiet); running.delete(jobId); fail(`The image engine could not start: ${err.message}`, -1); });
    proc.on('exit', (code) => {
      clearTimeout(quiet);
      running.delete(jobId);
      // The file it made: the name asked for, or (video) the same name in another container.
      const base = out.replace(/\.[^.]+$/, '');
      const made = [out, ...['webm', 'avi', 'mp4', 'mkv', 'png'].map((x) => `${base}.${x}`)].find((x) => { try { return fs.statSync(x).size > 0; } catch { return false; } });
      if (code === 0 && made) return resolve(made);
      const lines = log.split('\n').map((l) => l.trim()).filter(Boolean);
      const said = [...lines].reverse().find((l) => /error|failed|out of memory|unsupported|invalid|cannot|could not/i.test(l)) || lines.slice(-2).join(' ');
      fail(said || (code === 0 ? 'the engine finished but made no file' : `the engine stopped (code ${code})`), code);
    });
  });
}

async function generateNow(jobId, req, { onProgress, onStatus } = {}) {
  let hw = await hardware.detect({ fresh: true });
  const engine = engines.resolve('sd', hw);
  if (!engine) throw new Error('The image engine is missing. Download one in Settings → Engines.');
  const installed = models.get(req.modelId);
  const spec = catalog.MEDIA_MODELS.find((m) => m.id === (installed?.catalogId || req.modelId));
  if (!installed || !spec) throw new Error('Download this model in Models → Images & video first.');
  if (req.image && !fs.existsSync(req.image)) throw new Error('The photo to start from is no longer there.');
  const help = await sdHelp(engine.bin);
  const has = (flag) => help.includes(flag);
  const isVideo = spec.kind === 'video';
  const word = isVideo ? 'video' : 'picture';
  const out = path.join(store.dir('tmp'), `${jobId}.${isVideo ? (has('.webm') ? 'webm' : 'avi') : 'png'}`);
  const started = Date.now();
  let made = null;
  let used = null;
  let last = null;
  for (const safe of [false, true]) {
    if (stopped.has(jobId)) throw new Error('Stopped.');
    if (safe) {
      // Second and last try: nothing else on the card, the smallest sizes, every memory saving on.
      onStatus?.(`${last.memory ? 'There was not enough graphics memory' : last.blank ? `The ${word} came out blank` : 'That did not finish'}. Trying once more with low-memory settings…`);
      hw = await makeRoom(spec, await hardware.detect({ fresh: true }), null, true);
    } else hw = await makeRoom(spec, hw, onStatus);
    for (const x of ['webm', 'avi', 'mp4', 'mkv', 'png']) fs.rmSync(out.replace(/\.[^.]+$/, `.${x}`), { force: true });
    used = sdArgs(req, { spec, files: installed.files, hw, has, safe, out });
    // (On the second try every message says so, and the bar starts again.)
    const say = safe ? (t) => onStatus?.(`Second try, low-memory settings: ${t}`) : onStatus;
    say?.(`Starting ${spec.name}${used.notes.length ? ` (${used.notes.join(', ')})` : ''}…`);
    if (safe) onProgress?.(0.01);
    try {
      made = await runEngine(jobId, { engine, args: used.args, out, isVideo, onProgress, onStatus: say });
      if (!isVideo && looksBlank(made)) { const e = new Error(`the ${word} came out as one flat colour`); e.blank = true; e.log = ''; throw e; }
      break;
    } catch (err) {
      made = null;
      // What the engine said, kept for "Save diagnostics".
      try { fs.writeFileSync(path.join(store.dir('logs'), 'create-last-failure.log'), `${new Date().toISOString()} ${spec.name} ${safe ? '(low-memory try)' : ''}\n${engine.bin} ${used.args.map((a) => (/\s/.test(a) ? JSON.stringify(a) : a)).join(' ')}\n\n${err.log || err.message}\n`); } catch {}
      if (err.stopped || stopped.has(jobId)) throw new Error('Stopped.');
      last = err;
    }
  }
  if (!made) {
    if (last.memory) throw new Error(`Not enough graphics memory for ${spec.name}, even with the chat model closed and the low-memory settings. Try a smaller shape${isVideo ? ' or a shorter clip' : ''}, or a lighter model.`);
    if (last.blank) throw new Error(`${spec.name} made a blank ${word} twice on this PC. Try a different shape or another ${word} model.`);
    throw new Error(`${spec.name} stopped before the ${word} was finished: ${String(last.message).slice(0, 300)}`);
  }
  const d = spec.defaults;
  const seconds = (Date.now() - started) / 1000;
  const meta = { prompt: req.prompt, model: spec.name, modelId: spec.id, seed: req.seed, seconds, mode: req.mode, width: used.width || d.width, height: used.height || d.height };
  if (isVideo) {
    // Convert to an MP4 that plays everywhere.
    const file = path.join(mediaDir(), `${jobId}.mp4`);
    onStatus?.('Saving the video…');
    onProgress?.(0.97);
    try { await runFfmpeg(['-i', made, '-c:v', 'libx264', '-pix_fmt', 'yuv420p', '-vf', 'pad=ceil(iw/2)*2:ceil(ih/2)*2', '-crf', '18', '-movflags', '+faststart', file]); } catch (err) {
      throw new Error(`The video was made but could not be saved as an MP4: ${String(err.message).slice(0, 200)}`);
    }
    fs.rmSync(made, { force: true });
    return addToGallery({ kind: 'video', file, ...meta });
  }
  const file = path.join(mediaDir(), `${jobId}.png`);
  try { fs.renameSync(made, file); } catch { fs.copyFileSync(made, file); fs.rmSync(made, { force: true }); }
  return addToGallery({ kind: 'image', file, ...meta });
}


module.exports = { runFfmpeg, videoFrames, gallery, addToGallery, removeFromGallery, saveDataUrl, saveBuffer, editVideo, extractFrame, probe, generate, stop, stopAll, sdArgs, looksBlank, ffmpegPath, mediaDir };
