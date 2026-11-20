// Run a Hugging Face Space from inside Quicksilver. Most Spaces are built with Gradio, which
// exposes a small HTTP API (/gradio_api): ask it what endpoints it has (/info), upload any input
// files, start a job (/call/{api}), then read the result off the event stream. We drive that
// generically so a user can paste almost any Gradio image/video Space and use it here — no browser,
// nothing leaves the app except the call to the Space itself. Spaces vary a lot; when one can't be
// driven automatically (not Gradio, asleep, private, or its free GPU quota is spent) we say so.
'use strict';

const UA = 'Quicksilver/2 (local AI app)';

// "owner/name", a full Space URL, or a bare subdomain → the Space's API host.
function spaceHost(idOrUrl) {
  let id = String(idOrUrl || '').trim();
  if (!id) throw new Error('Give a Space, e.g. owner/name.');
  const m = id.match(/huggingface\.co\/spaces\/([^/?#]+\/[^/?#]+)/i);
  if (m) id = m[1];
  id = id.replace(/^https?:\/\//, '').replace(/\.hf\.space.*$/i, '');
  if (/^[a-z0-9-]+$/i.test(id) && !id.includes('/')) return { base: `https://${id.toLowerCase()}.hf.space`, id };
  const sub = id.toLowerCase().replace(/[^a-z0-9-]+/g, '-').replace(/^-+|-+$/g, '');
  if (!sub) throw new Error(`That doesn't look like a Space id: ${idOrUrl}`);
  return { base: `https://${sub}.hf.space`, id };
}

const MEDIA_EXT = { image: /\.(png|jpe?g|webp|gif|bmp|avif)$/i, video: /\.(mp4|webm|mov|mkv|gif)$/i, audio: /\.(mp3|wav|flac|ogg|m4a)$/i };
const kindOfUrl = (u) => (MEDIA_EXT.video.test(u) ? 'video' : MEDIA_EXT.audio.test(u) ? 'audio' : MEDIA_EXT.image.test(u) ? 'image' : '');

// Pull a usable media URL out of whatever shape a Space returns (string, FileData object, nested).
function extractMedia(out, base) {
  const found = [];
  const fileUrl = (v) => {
    if (!v) return null;
    if (typeof v === 'string') return /^https?:\/\//.test(v) ? v : (MEDIA_EXT.image.test(v) || MEDIA_EXT.video.test(v) || MEDIA_EXT.audio.test(v)) && base ? `${base}/gradio_api/file=${v}` : null;
    if (typeof v === 'object') {
      if (v.url) return v.url;
      if (v.video && (v.video.url || v.video.path)) return v.video.url || `${base}/gradio_api/file=${v.video.path}`;
      if (v.image && (v.image.url || v.image.path)) return v.image.url || `${base}/gradio_api/file=${v.image.path}`;
      if (v.path) return base ? `${base}/gradio_api/file=${v.path}` : null;
      if (v.name && base) return `${base}/gradio_api/file=${v.name}`;
    }
    return null;
  };
  const walk = (v, depth = 0) => {
    if (depth > 4 || v == null) return;
    const u = fileUrl(v);
    if (u) { const k = kindOfUrl(u) || (v && v.video ? 'video' : v && v.image ? 'image' : ''); if (k) found.push({ url: u, kind: k }); return; }
    if (Array.isArray(v)) v.forEach((x) => walk(x, depth + 1));
    else if (typeof v === 'object') Object.values(v).forEach((x) => walk(x, depth + 1));
  };
  walk(out);
  // de-dupe by url
  const seen = new Set();
  return found.filter((f) => !seen.has(f.url) && seen.add(f.url));
}

// Read a Gradio event-stream body: it ends with `event: complete` (data = the outputs) or `event: error`.
function parseSse(text) {
  const t = String(text || '');
  const c = t.match(/event:\s*complete\s*[\r\n]+data:\s*(.+)/);
  if (c) { try { return { status: 'complete', data: JSON.parse(c[1]) }; } catch { return { status: 'complete', data: null, raw: c[1] }; } }
  const e = t.match(/event:\s*error\s*[\r\n]+data:\s*(.+)/);
  if (e) return { status: 'error', message: String(e[1] || '').slice(0, 200) };
  return { status: 'none' };
}

// Decide which endpoint to run. Prefer one that returns the kind the user wants (image/video).
function pickEndpoint(info, want) {
  const named = (info && info.named_endpoints) || {};
  const entries = Object.entries(named).filter(([, d]) => Array.isArray(d.parameters));
  if (!entries.length) return null;
  const retKind = (d) => (d.returns || []).map((r) => String(r.component || r.python_type?.type || '').toLowerCase()).join(',');
  const score = ([name, d]) => {
    const r = retKind(d); let s = 0;
    if (want === 'video' && /video/.test(r)) s += 10;
    if (want === 'image' && /image|gallery/.test(r)) s += 10;
    if (/image|video|gallery|audio/.test(r)) s += 3;
    if (/^\/?(predict|run|generate|infer|process)/i.test(name)) s += 2;
    s -= (d.parameters || []).length * 0.01; // prefer simpler endpoints on ties
    return s;
  };
  entries.sort((a, b) => score(b) - score(a));
  const [apiName, d] = entries[0];
  return { apiName: apiName.startsWith('/') ? apiName : `/${apiName}`, parameters: d.parameters || [], returns: d.returns || [] };
}

const isImageParam = (p) => /image|img|photo|file|sketch|mask|init/i.test(`${p.label || ''} ${p.parameter_name || ''} ${p.component || ''}`) || /image|file/i.test(String(p.component || ''));
const isTextParam = (p) => /textbox|text|string|dropdown/i.test(String(p.component || p.python_type?.type || '')) || p.python_type?.type === 'str';
const looksPrompt = (p) => /prompt|text|caption|describe|query|question|message|input/i.test(`${p.label || ''} ${p.parameter_name || ''}`);

// Build the positional input array a Gradio endpoint expects, slotting in the prompt and image.
function buildData(parameters, { prompt = '', imageFile = null } = {}) {
  let promptUsed = false; let imageUsed = false;
  return (parameters || []).map((p) => {
    if (imageFile && !imageUsed && isImageParam(p)) { imageUsed = true; return imageFile; }
    if (prompt && !promptUsed && isTextParam(p) && (looksPrompt(p) || true)) {
      // first text-ish parameter takes the prompt (prefer an obviously prompt-like one, else the first)
      promptUsed = true; return prompt;
    }
    if (p.parameter_has_default) return p.parameter_default;
    if ('example_input' in p && p.example_input != null) return p.example_input;
    const t = String(p.python_type?.type || p.component || '').toLowerCase();
    if (/bool/.test(t)) return false;
    if (/int|float|number|slider/.test(t)) return 0;
    if (/str|text/.test(t)) return '';
    return null;
  });
}
// If no obviously-prompt parameter matched, buildData above still puts the prompt in the first text slot.

async function info(idOrUrl, token) {
  const { base } = spaceHost(idOrUrl);
  const headers = { Accept: 'application/json', 'User-Agent': UA, ...(token ? { Authorization: `Bearer ${token.trim()}` } : {}) };
  let r;
  try { r = await fetch(`${base}/gradio_api/info`, { headers, signal: AbortSignal.timeout(20000) }); }
  catch { throw new Error('Could not reach the Space. It may be sleeping (open it once on huggingface.co to wake it), private, or offline.'); }
  if (r.status === 404) { // older Gradio
    try { r = await fetch(`${base}/info`, { headers, signal: AbortSignal.timeout(20000) }); } catch { /* fall through */ }
  }
  if (!r.ok) throw new Error(r.status === 401 || r.status === 403 ? 'The Space is private or needs a token.' : `This doesn't look like a Gradio Space its API can drive (HTTP ${r.status}). Streamlit/Docker/static Spaces can't be run from here yet.`);
  const j = await r.json().catch(() => null);
  if (!j || !j.named_endpoints) throw new Error('The Space has no callable API (it may not be a Gradio app).');
  return { base, info: j };
}

async function uploadFile(base, buffer, name, type, token) {
  const fd = new FormData();
  fd.append('files', new Blob([buffer], { type: type || 'image/png' }), name || 'input.png');
  const r = await fetch(`${base}/gradio_api/upload`, { method: 'POST', headers: token ? { Authorization: `Bearer ${token.trim()}` } : {}, body: fd, signal: AbortSignal.timeout(120000) });
  if (!r.ok) throw new Error(`Uploading the image to the Space failed (HTTP ${r.status}).`);
  const paths = await r.json().catch(() => null);
  const p = Array.isArray(paths) ? paths[0] : paths;
  if (!p) throw new Error('The Space did not accept the image.');
  return { path: p, meta: { _type: 'gradio.FileData' }, url: `${base}/gradio_api/file=${p}` };
}

async function callEndpoint(base, apiName, data, token, onStatus = () => {}) {
  const headers = { 'Content-Type': 'application/json', 'User-Agent': UA, ...(token ? { Authorization: `Bearer ${token.trim()}` } : {}) };
  const start = await fetch(`${base}/gradio_api/call${apiName}`, { method: 'POST', headers, body: JSON.stringify({ data }), signal: AbortSignal.timeout(120000) });
  const sj = await start.json().catch(() => ({}));
  if (!start.ok || !sj.event_id) throw new Error(`The Space did not start the job (HTTP ${start.status})${sj.detail ? `: ${String(sj.detail).slice(0, 120)}` : ''}.`);
  onStatus('Running on the Space… (free GPU Spaces can queue for a while)');
  const res = await fetch(`${base}/gradio_api/call${apiName}/${sj.event_id}`, { headers: { Accept: 'text/event-stream', 'User-Agent': UA, ...(token ? { Authorization: `Bearer ${token.trim()}` } : {}) }, signal: AbortSignal.timeout(600000) });
  const text = await res.text();
  const ev = parseSse(text);
  if (ev.status === 'error') throw new Error(`The Space reported an error: ${ev.message}`);
  if (ev.status !== 'complete') throw new Error('The Space returned no result (its free GPU quota may be used up, or it timed out). Try later, add a Hugging Face token, or duplicate the Space to your account.');
  return ev.data;
}

// One-shot: paste a Space, give a prompt (and optionally an image), get media back.
async function run(idOrUrl, { prompt = '', imageDataUrl = '', want = 'image', apiName = '' } = {}, token = '', onStatus = () => {}) {
  const { base, info: meta } = await info(idOrUrl, token);
  const ep = apiName ? { apiName: apiName.startsWith('/') ? apiName : `/${apiName}`, parameters: meta.named_endpoints[apiName]?.parameters || meta.named_endpoints[apiName.replace(/^\//, '')]?.parameters || [] } : pickEndpoint(meta, want);
  if (!ep) throw new Error('The Space exposes no callable endpoint.');
  let imageFile = null;
  if (imageDataUrl) {
    const m = String(imageDataUrl).match(/^data:([^;]+);base64,(.+)$/);
    if (m) { onStatus('Uploading your image…'); imageFile = await uploadFile(base, Buffer.from(m[2], 'base64'), 'input.png', m[1], token); }
  }
  const data = buildData(ep.parameters, { prompt, imageFile });
  const out = await callEndpoint(base, ep.apiName, data, token, onStatus);
  const media = extractMedia(out, base);
  if (!media.length) throw new Error('The Space finished but returned nothing we could show (it may output only text, or an unusual format).');
  return { base, apiName: ep.apiName, media };
}

// Save a Space's output URL into the gallery.
async function fetchToBuffer(url, token) {
  const r = await fetch(url, { headers: { 'User-Agent': UA, ...(token ? { Authorization: `Bearer ${token.trim()}` } : {}) }, signal: AbortSignal.timeout(300000), redirect: 'follow' });
  if (!r.ok) throw new Error(`Could not download the result (HTTP ${r.status}).`);
  const buf = Buffer.from(await r.arrayBuffer());
  const type = r.headers.get('content-type') || '';
  let ext = (url.match(/\.([a-z0-9]{2,4})(?:\?|$)/i) || [])[1] || (type.split('/')[1] || 'bin').replace('jpeg', 'jpg');
  return { buf, ext: ext.toLowerCase() };
}

module.exports = { spaceHost, extractMedia, parseSse, pickEndpoint, buildData, isImageParam, isTextParam, info, uploadFile, callEndpoint, run, fetchToBuffer, kindOfUrl };