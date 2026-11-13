// Audio, video and photo tools that run on this PC with ffmpeg and Windows' own voices:
// smooth video to 60 fps, slow motion, upscale, stabilize, podcast mastering, vocal remover,
// text to speech (audiobooks, two-voice podcasts) and photo upscaling. Results go to the gallery.
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const { execFile } = require('node:child_process');
const store = require('./store');
const media = require('./media');

const uniq = () => Date.now().toString(36) + Math.random().toString(36).slice(2, 6);
const outFile = (ext) => path.join(media.mediaDir(), `${uniq()}.${ext}`);

const MP4 = ['-c:v', 'libx264', '-preset', 'medium', '-crf', '19', '-pix_fmt', 'yuv420p', '-movflags', '+faststart'];
const VIDEO_OPS = {
  fps60: { label: 'Smoothed to 60 fps', vf: 'minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:me_mode=bidir:vsbmc=1' },
  slowmo: { label: 'Slow motion', vf: 'minterpolate=fps=60:mi_mode=mci:mc_mode=aobmc:vsbmc=1,setpts=2*PTS', af: 'atempo=0.5', stretch: 2 },
  upscale: { label: 'Upscaled 2×', vf: 'scale=iw*2:ih*2:flags=lanczos,unsharp=5:5:0.7:5:5:0' },
  stabilize: { label: 'Stabilized', vf: 'deshake=rx=32:ry=32,crop=iw*0.94:ih*0.94,scale=trunc(iw/0.94/2)*2:trunc(ih/0.94/2)*2' },
  denoise: { label: 'Cleaned up', vf: 'hqdn3d=4:3:6:4.5', af: 'afftdn=nf=-25' },
  enhance: { label: 'Enhanced', vf: 'hqdn3d=2:1:3:3,eq=contrast=1.06:saturation=1.12,unsharp=5:5:0.5' },
};
const AUDIO_OPS = {
  master: { label: 'Mastered', af: 'highpass=f=70,afftdn=nf=-25,acompressor=threshold=-20dB:ratio=3:attack=8:release=180:makeup=2,loudnorm=I=-16:TP=-1.5:LRA=11' },
  karaoke: { label: 'Vocals removed', af: 'pan=stereo|c0=c0-c1|c1=c1-c0,highpass=f=40' },
  vocals: { label: 'Vocals brought forward', af: 'pan=mono|c0=0.5*c0+0.5*c1,highpass=f=150,lowpass=f=8000,acompressor=threshold=-18dB:ratio=2.5,loudnorm=I=-16' },
  denoise: { label: 'Noise removed', af: 'highpass=f=60,afftdn=nf=-28,anlmdn=s=4' },
  loud: { label: 'Loudness evened out', af: 'loudnorm=I=-14:TP=-1:LRA=9' },
};
const IMAGE_OPS = {
  upscale4: { label: 'Upscaled 4×', vf: 'scale=iw*4:ih*4:flags=lanczos,unsharp=5:5:0.8:5:5:0' },
  upscale2: { label: 'Upscaled 2×', vf: 'scale=iw*2:ih*2:flags=lanczos,unsharp=5:5:0.6:5:5:0' },
  retouch: { label: 'Retouched', vf: 'hqdn3d=1.5:1.5:0:0,eq=contrast=1.05:saturation=1.08:brightness=0.01,unsharp=3:3:0.4' },
  bw: { label: 'Black and white', vf: 'hue=s=0,eq=contrast=1.12' },
};

const fileFor = (src) => {
  if (src.galleryId) return media.gallery().find((g) => g.id === src.galleryId)?.file;
  if (src.path && fs.existsSync(src.path)) return src.path;
  if (src.dataUrl) { const g = media.saveDataUrl(src.dataUrl, { title: src.name || 'Photo' }); return g.file; }
  return null;
};

// src = { path } | { galleryId } | { dataUrl }; returns the new gallery item.
async function run(kind, op, src, { onProgress } = {}) {
  const input = fileFor(src);
  if (!input) throw new Error('Attach the file first.');
  const info = await media.probe(input);
  const name = path.basename(input);
  if (kind === 'video') {
    const o = VIDEO_OPS[op];
    if (!o) throw new Error('Unknown video tool.');
    const out = outFile('mp4');
    const args = ['-i', input, '-vf', o.vf, ...MP4];
    if (info.audio && o.af) args.push('-af', o.af, '-c:a', 'aac', '-b:a', '160k'); else if (info.audio) args.push('-c:a', 'aac', '-b:a', '160k'); else args.push('-an');
    args.push(out);
    await media.runFfmpeg(args, { onProgress, durationSec: (info.duration || 0) * (o.stretch || 1) });
    return media.addToGallery({ kind: 'video', file: out, title: `${o.label}: ${name}`, parent: input });
  }
  if (kind === 'audio') {
    const o = AUDIO_OPS[op];
    if (!o) throw new Error('Unknown audio tool.');
    if (!info.audio) throw new Error('That file has no sound.');
    const out = outFile('mp3');
    await media.runFfmpeg(['-i', input, '-vn', '-af', o.af, '-c:a', 'libmp3lame', '-b:a', '192k', out], { onProgress, durationSec: info.duration });
    return media.addToGallery({ kind: 'audio', file: out, title: `${o.label}: ${name}`, parent: input });
  }
  if (kind === 'extract') {
    const out = outFile('mp3');
    await media.runFfmpeg(['-i', input, '-vn', '-c:a', 'libmp3lame', '-b:a', '192k', out], { onProgress, durationSec: info.duration });
    return media.addToGallery({ kind: 'audio', file: out, title: `Sound from ${name}`, parent: input });
  }
  if (kind === 'image') {
    const o = IMAGE_OPS[op];
    if (!o) throw new Error('Unknown photo tool.');
    const out = outFile('png');
    // Very large pictures are capped at about 8K on the long side.
    const cap = info.width && info.width * 4 > 8192 && op === 'upscale4' ? IMAGE_OPS.upscale2.vf : o.vf;
    await media.runFfmpeg(['-i', input, '-vf', cap, '-frames:v', '1', out]);
    return media.addToGallery({ kind: 'image', file: out, title: `${o.label}: ${name}`, parent: input });
  }
  throw new Error('Unknown tool.');
}

// ---------- text to speech (Windows' built-in voices, offline) ----------

const PS = `param([string]$In, [string]$Out, [string]$Voice, [int]$Rate = 0, [switch]$List)
Add-Type -AssemblyName System.Speech
$s = New-Object System.Speech.Synthesis.SpeechSynthesizer
if ($List) { $s.GetInstalledVoices() | Where-Object { $_.Enabled } | ForEach-Object { $_.VoiceInfo.Name + '|' + $_.VoiceInfo.Gender + '|' + $_.VoiceInfo.Culture }; exit 0 }
if ($Voice) { try { $s.SelectVoice($Voice) } catch {} }
$s.Rate = [Math]::Max(-10, [Math]::Min(10, $Rate))
$s.SetOutputToWaveFile($Out)
$s.Speak([IO.File]::ReadAllText($In, [Text.Encoding]::UTF8))
$s.Dispose()
`;
function powershell(args, timeout = 10 * 60 * 1000) {
  const script = path.join(store.dir('tmp'), 'speak.ps1');
  fs.writeFileSync(script, `﻿${PS}`);
  return new Promise((resolve, reject) => execFile('powershell.exe', ['-NoProfile', '-NonInteractive', '-ExecutionPolicy', 'Bypass', '-File', script, ...args], { windowsHide: true, timeout, maxBuffer: 1 << 20 },
    (err, stdout, stderr) => (err ? reject(new Error(`Windows speech failed: ${(stderr || err.message).trim().split('\n').pop()}`)) : resolve(stdout))));
}

async function voices() {
  if (process.env.QS_TTS_FAKE) return [{ name: 'Test Voice A', gender: 'Female', culture: 'en-US' }, { name: 'Test Voice B', gender: 'Male', culture: 'en-US' }];
  if (process.platform !== 'win32') return [];
  const out = await powershell(['-List'], 30000).catch(() => '');
  return out.split(/\r?\n/).filter(Boolean).map((l) => { const [name, gender, culture] = l.split('|'); return { name, gender, culture }; });
}

// Speaks text into a WAV file. Long text is spoken in one go; Windows handles the pacing.
async function speakToWav(text, { voice, rate = 0 } = {}) {
  const wav = path.join(store.dir('tmp'), `${uniq()}.wav`);
  if (process.env.QS_TTS_FAKE) {
    // Tests: a short tone the length of the text instead of a real voice.
    const secs = Math.max(0.5, Math.min(20, String(text).split(/\s+/).length / 3));
    await media.runFfmpeg(['-f', 'lavfi', '-i', `sine=frequency=${voice && /B$/.test(voice) ? 220 : 440}:duration=${secs}`, wav]);
    return wav;
  }
  if (process.platform !== 'win32') throw new Error('Reading aloud to a file uses Windows\' built-in voices.');
  const txt = path.join(store.dir('tmp'), `${uniq()}.txt`);
  fs.writeFileSync(txt, String(text), 'utf8');
  try { await powershell(['-In', txt, '-Out', wav, ...(voice ? ['-Voice', voice] : []), '-Rate', String(Math.round(rate))]); } finally { fs.rmSync(txt, { force: true }); }
  if (!fs.existsSync(wav)) throw new Error('Windows did not produce any speech.');
  return wav;
}

// One voice reading a text (an audiobook chapter, an article), or a script with several speakers:
// lines that start with "NAME:" are read by that speaker's voice, in order.
async function speak(text, { voice, voices: cast = [], rate = 0, title = 'Speech', master = true, onProgress } = {}) {
  const lines = String(text).split(/\r?\n/).map((l) => l.trim()).filter(Boolean);
  const speakerRe = /^\**\s*([A-Z][\w .'-]{0,24}?)\s*\**\s*:\s*(.+)$/;
  const scripted = lines.filter((l) => speakerRe.test(l)).length >= Math.max(2, lines.length * 0.6);
  const parts = [];
  try {
    if (scripted) {
      const names = [];
      const segs = lines.map((l) => l.match(speakerRe)).filter(Boolean).map((m) => { if (!names.includes(m[1])) names.push(m[1]); return { who: m[1], text: m[2].replace(/[*_#`]/g, '') }; });
      const all = cast.length ? cast : (await voices()).map((v) => v.name);
      for (let i = 0; i < segs.length; i++) {
        const v = all.length ? all[names.indexOf(segs[i].who) % all.length] : undefined;
        parts.push(await speakToWav(segs[i].text, { voice: v, rate }));
        onProgress?.((i + 1) / segs.length * 0.9);
      }
    } else {
      const clean = String(text).replace(/```[\s\S]*?```/g, '').replace(/[*_#`>|]/g, '').replace(/\[(\d+)\]/g, '');
      parts.push(await speakToWav(clean, { voice, rate }));
      onProgress?.(0.9);
    }
    const out = outFile('mp3');
    const inputs = parts.flatMap((p) => ['-i', p]);
    const join = parts.length > 1 ? `${parts.map((_, i) => `[${i}:a]`).join('')}concat=n=${parts.length}:v=0:a=1[c];[c]` : '[0:a]';
    const chain = master ? 'highpass=f=60,acompressor=threshold=-20dB:ratio=2.5:attack=8:release=150,loudnorm=I=-16:TP=-1.5:LRA=11' : 'anull';
    await media.runFfmpeg([...inputs, '-filter_complex', `${join}${chain}[o]`, '-map', '[o]', '-c:a', 'libmp3lame', '-b:a', '160k', out]);
    onProgress?.(1);
    return media.addToGallery({ kind: 'audio', file: out, title: String(title).slice(0, 80), speakers: scripted ? 'several' : 'one' });
  } finally { for (const p of parts) fs.rmSync(p, { force: true }); }
}

// A beat or melody drawn in the app (Web Audio) arrives here as a WAV and is kept as an MP3.
async function saveWav(dataUrl, meta = {}) {
  const b64 = String(dataUrl).split(',')[1];
  if (!b64) throw new Error('No sound.');
  const wav = path.join(store.dir('tmp'), `${uniq()}.wav`);
  fs.writeFileSync(wav, Buffer.from(b64, 'base64'));
  const out = outFile('mp3');
  try { await media.runFfmpeg(['-i', wav, '-c:a', 'libmp3lame', '-b:a', '192k', out]); } finally { fs.rmSync(wav, { force: true }); }
  return media.addToGallery({ kind: 'audio', file: out, ...meta });
}

module.exports = { run, speak, voices, saveWav, VIDEO_OPS, AUDIO_OPS, IMAGE_OPS, tmpdir: os.tmpdir };
