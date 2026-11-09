// Cloud photo, video and music: one fal.ai key reaches the best hosted models (Google Nano Banana,
// Veo 3.1, Kling 3, ElevenLabs Music, MiniMax Music, Lyria). Requests go through fal's queue: submit,
// poll the status address it returns, then fetch the result and save the file to the gallery.
const fs = require('fs');
const path = require('path');
const store = require('./store');
const media = require('./media');

// [id, name, rating out of 10, price note, what it's best at]
const FAL_MODELS = {
  image: [
    ['google/nano-banana-2.1', 'Nano Banana 2.1 (Google)', 9, 'about $0.04 a picture', 'Sharp, realistic pictures that follow the prompt closely'],
  ],
  edit: [
    ['google/nano-banana-2.1/edit', 'Nano Banana 2.1 Edit (Google)', 9, 'about $0.04 an edit', 'Edits from a description, keeping faces and details'],
  ],
  video: [
    ['fal-ai/veo3.1', 'Veo 3.1 (Google)', 10, 'about $0.40 a second', 'The sharpest video, with sound'],
    ['fal-ai/veo3.1/fast', 'Veo 3.1 Fast (Google)', 9, 'cheaper than Veo 3.1', 'Nearly as good, quicker and cheaper'],
    ['fal-ai/kling-video/v3/pro/text-to-video', 'Kling 3 Pro', 9, 'see fal\'s price page', 'Smooth motion, good value'],
  ],
  animate: [
    ['fal-ai/veo3.1/image-to-video', 'Veo 3.1: photo to video (Google)', 10, 'about $0.40 a second', 'Brings a photo to life, with sound'],
  ],
  // Full compositions only: whole songs with an intro, verses, chorus and ending, sung or instrumental.
  music: [
    ['fal-ai/elevenlabs/music', 'ElevenLabs Music', 9, 'about $0.80 a minute', 'Full songs of any length you pick, sung or instrumental, with verses, chorus and bridge'],
    ['fal-ai/minimax-music/v2.6', 'MiniMax Music 2.6', 8, 'about $0.15 a song', 'Full songs up to about 3 minutes, sung from your lyrics'],
    ['mureka/v9/generate/song', 'Mureka v9', 8, 'see fal\'s price page', 'Full songs with vocals from long lyrics (up to 5,000 characters)'],
  ],
};
const QUEUE = 'https://queue.fal.run';

function inputFor(kind, model, { prompt, imageDataUrl, seconds, lyrics }) {
  const input = { prompt: String(prompt || '').slice(0, 4000) };
  if (imageDataUrl) {
    if (/nano-banana/.test(model)) input.image_urls = [imageDataUrl];
    else input.image_url = imageDataUrl;
  }
  if (kind === 'music' && /elevenlabs/.test(model)) {
    // A whole song: at least a minute, with the structure and the lyrics in the brief.
    input.music_length_ms = Math.round(Math.max(60, Math.min(300, seconds || 150)) * 1000);
    input.prompt = `${input.prompt}\nA complete song with an intro, verses, chorus, a bridge and an ending.${lyrics ? `\nLyrics:\n${String(lyrics).slice(0, 3000)}` : ''}`.slice(0, 4000);
  }
  if (kind === 'music' && lyrics && /minimax|mureka/.test(model)) input.lyrics = String(lyrics).slice(0, /mureka/.test(model) ? 5000 : 3000);
  return input;
}
// The first file address in a result (images[0].url, video.url, audio.url, audio_file.url…).
function findUrl(j, depth = 0) {
  if (!j || typeof j !== 'object' || depth > 6) return null;
  const isUrl = (v) => typeof v === 'string' && /^https?:\/\//.test(v);
  if (isUrl(j.url)) return j.url;
  if (Array.isArray(j)) { for (const v of j) { const u = isUrl(v) ? v : findUrl(v, depth + 1); if (u) return u; } return null; }
  const keys = ['images', 'image', 'video', 'audio', 'audio_file', 'audio_url', 'output', 'file'];
  for (const k of [...keys, ...Object.keys(j).filter((x) => !keys.includes(x))]) {
    const v = j[k];
    if (v == null) continue;
    const u = isUrl(v) && keys.includes(k) ? v : findUrl(v, depth + 1);
    if (u) return u;
  }
  return null;
}
const EXT = { 'image/png': 'png', 'image/jpeg': 'jpg', 'image/webp': 'webp', 'video/mp4': 'mp4', 'video/webm': 'webm', 'audio/mpeg': 'mp3', 'audio/mp3': 'mp3', 'audio/wav': 'wav', 'audio/x-wav': 'wav', 'audio/ogg': 'ogg', 'audio/flac': 'flac' };
function extOf(url, type, kind) {
  const t = EXT[String(type || '').split(';')[0].trim()];
  if (t) return t;
  const m = String(url).split('?')[0].match(/\.(png|jpe?g|webp|mp4|webm|mp3|wav|ogg|flac)$/i);
  if (m) return m[1].toLowerCase().replace('jpeg', 'jpg');
  return kind === 'music' ? 'mp3' : ['video', 'animate'].includes(kind) ? 'mp4' : 'png';
}

async function generate(provider, key, kind, model, opts, onStatus = () => {}) {
  if (store.config().offline) throw new Error('Quicksilver is offline. Go online to create in the cloud.');
  if (!key) throw new Error(`Add your ${provider.name} key first (Models → Connect an API).`);
  const headers = { Authorization: `Key ${key}`, 'Content-Type': 'application/json' };
  const base = (provider.baseUrl || QUEUE).replace(/\/+$/, '');
  const sub = await fetch(`${base}/${model}`, { method: 'POST', headers, body: JSON.stringify(inputFor(kind, model, opts)), signal: AbortSignal.timeout(60000) });
  const sj = await sub.json().catch(() => ({}));
  if (!sub.ok) throw new Error(`${provider.name}: ${sj.detail ? (typeof sj.detail === 'string' ? sj.detail : JSON.stringify(sj.detail).slice(0, 300)) : `HTTP ${sub.status}`}`);
  // Some answers come back at once; otherwise wait on the queue.
  let result = findUrl(sj) ? sj : null;
  if (!result) {
    const statusUrl = sj.status_url || `${base}/${model}/requests/${sj.request_id}/status`;
    const responseUrl = sj.response_url || `${base}/${model}/requests/${sj.request_id}`;
    const start = Date.now();
    for (;;) {
      if (Date.now() - start > 20 * 60 * 1000) throw new Error(`${provider.name} took too long (over 20 minutes).`);
      await new Promise((r) => setTimeout(r, opts.pollMs ?? 3000));
      const st = await (await fetch(statusUrl, { headers, signal: AbortSignal.timeout(30000) })).json().catch(() => ({}));
      if (st.status === 'IN_QUEUE') onStatus(`Waiting in ${provider.name}'s queue${st.queue_position != null ? ` (position ${st.queue_position + 1})` : ''}…`);
      else if (st.status === 'IN_PROGRESS') onStatus(`Creating in the cloud… ${Math.round((Date.now() - start) / 1000)} s`);
      else if (st.status === 'COMPLETED') break;
    }
    const rs = await fetch(responseUrl, { headers, signal: AbortSignal.timeout(60000) });
    result = await rs.json().catch(() => ({}));
    if (!rs.ok || result.detail || result.error) throw new Error(`${provider.name}: ${result.detail ? (typeof result.detail === 'string' ? result.detail : JSON.stringify(result.detail).slice(0, 300)) : result.error || `HTTP ${rs.status}`}`);
  }
  const url = findUrl(result);
  if (!url) throw new Error(`${provider.name} returned no file.`);
  onStatus('Downloading the result…');
  const dl = await fetch(url, { signal: AbortSignal.timeout(5 * 60 * 1000) });
  if (!dl.ok) throw new Error(`Couldn't download the result (HTTP ${dl.status}).`);
  const ext = extOf(url, dl.headers.get('content-type'), kind);
  const file = path.join(media.mediaDir(), `cloud-${Date.now().toString(36)}-${Math.random().toString(36).slice(2, 6)}.${ext}`);
  fs.writeFileSync(file, Buffer.from(await dl.arrayBuffer()));
  const galleryKind = /^(mp4|webm)$/.test(ext) ? 'video' : /^(mp3|wav|ogg|flac)$/.test(ext) ? 'audio' : 'image';
  const name = Object.values(FAL_MODELS).flat().find((m) => m[0] === model)?.[1] || model;
  return media.addToGallery({ kind: galleryKind, file, prompt: opts.prompt, model, title: `${name}: ${String(opts.prompt || '').slice(0, 60)}`, cloud: provider.name });
}

module.exports = { FAL_MODELS, generate, inputFor, findUrl, extOf };
