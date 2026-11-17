// Open Studio — Electron main process.
// Holds a secure, local-only key vault (encrypted with the OS keychain via safeStorage) and makes
// every keyed request from here, so an API key never reaches the page and is never exposed. The
// free engines (Pollinations, AI Horde) need no key and are called straight from the renderer.
'use strict';
const { app, BrowserWindow, ipcMain, safeStorage, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const KEYS_FILE = () => path.join(app.getPath('userData'), 'keys.json');

// Clouds Open Studio can use for TEXT (all OpenAI-compatible). Free-with-key, generous tiers; plus a
// local KoboldCpp server (no key). Keys are stored encrypted on this PC only.
const PROVIDERS = {
  groq:        { name: 'Groq',                 base: 'https://api.groq.com/openai/v1',     keyUrl: 'https://console.groq.com/keys',                 defModel: 'llama-3.3-70b-versatile',
    blurb: 'Ultra-fast open models (Llama, Mixtral) on special hardware. Free tier with generous rate limits, no card needed.' },
  openrouter:  { name: 'OpenRouter',           base: 'https://openrouter.ai/api/v1',       keyUrl: 'https://openrouter.ai/keys',                    defModel: 'meta-llama/llama-3.3-70b-instruct:free',
    blurb: 'One key routes to hundreds of models. Any model whose name ends in ":free" costs nothing; others are pay as you go.' },
  cerebras:    { name: 'Cerebras',             base: 'https://api.cerebras.ai/v1',         keyUrl: 'https://cloud.cerebras.ai',                     defModel: 'llama-3.3-70b',
    blurb: 'The fastest big open models (Qwen3 235B, Llama). Free daily token allowance, no card.' },
  huggingface: { name: 'Hugging Face',         base: 'https://router.huggingface.co/v1',   keyUrl: 'https://huggingface.co/settings/tokens',        defModel: 'meta-llama/Llama-3.3-70B-Instruct',
    blurb: 'One token reaches thousands of community-hosted open models. Small free monthly credit, then pay as you go.' },
  cloudflare:  { name: 'Cloudflare Workers AI', base: '',                                  keyUrl: 'https://dash.cloudflare.com/profile/api-tokens', defModel: '@cf/meta/llama-3.1-8b-instruct', cf: true, keyHint: 'ACCOUNT_ID:API_TOKEN',
    blurb: 'Open models (Llama, Stable Diffusion) on Cloudflare\'s edge. Free daily "Neurons" allowance. Enter the key as ACCOUNT_ID:API_TOKEN (both from your Cloudflare dashboard).' },
  koboldcpp:   { name: 'KoboldCpp (on this PC)', base: 'http://localhost:5001/v1',         keyUrl: 'https://github.com/LostRuins/koboldcpp',        defModel: '', local: true,
    blurb: 'Runs a model entirely on THIS PC — no key, fully private, works offline. Start the KoboldCpp app first; it serves on localhost:5001.' },
  deepai:      { name: 'DeepAI (images)',        base: '',                                 keyUrl: 'https://deepai.org/dashboard/profile',          defModel: '', image: true, keyHint: 'DeepAI API key',
    blurb: 'Image generation through DeepAI. A limited amount is free with an account, then it is pay as you go.' },
  llm7:        { name: 'LLM7.io (no key)',       base: 'https://api.llm7.io/v1',            keyUrl: 'https://token.llm7.io',                          defModel: 'gpt-oss:20b', noKey: true,
    blurb: 'A free gateway that works with NO key or account at all. A free token (optional) raises the rate limits.' },
  google:      { name: 'Google Gemini',          base: 'https://generativelanguage.googleapis.com/v1beta/openai', keyUrl: 'https://aistudio.google.com/apikey', defModel: 'gemini-2.5-flash',
    blurb: 'Gemini Flash and Gemma, free in Google AI Studio with a big daily quota and a 1M-token context. Key from AI Studio, no card.' },
  mistral:     { name: 'Mistral AI',             base: 'https://api.mistral.ai/v1',         keyUrl: 'https://console.mistral.ai/api-keys',            defModel: 'mistral-large-latest',
    blurb: 'Mistral and Codestral models. Free "Experiment" tier with a monthly quota (phone verify, no card).' },
  nvidia:      { name: 'NVIDIA NIM',             base: 'https://integrate.api.nvidia.com/v1', keyUrl: 'https://build.nvidia.com',                     defModel: 'meta/llama-3.3-70b-instruct',
    blurb: 'A wide catalog of open models (Llama, DeepSeek, Qwen, Nemotron) hosted by NVIDIA. Free developer credits.' },
  zai:         { name: 'Z.ai (GLM)',             base: 'https://api.z.ai/api/paas/v4',       keyUrl: 'https://z.ai/manage-apikey/apikey-list',        defModel: 'glm-4.5-flash',
    blurb: 'Zhipu GLM models; the GLM Flash models are permanently free. Key from z.ai.' },
  gonka:       { name: 'Gonka Broker',           base: 'https://proxy.gonkabroker.com/v1',   keyUrl: 'https://app.gonkabroker.com/signup',             defModel: 'zai-org/GLM-5.3-Flash',
    blurb: 'Decentralized nodes serving big open models (GLM, DeepSeek, MiniMax). About 1M free tokens a month after phone verify.' },
  moonshot:    { name: 'Moonshot (Kimi)',        base: 'https://api.moonshot.ai/v1',         keyUrl: 'https://platform.moonshot.ai/console/api-keys',  defModel: 'kimi-latest',
    blurb: 'Kimi models — strong at coding and long documents. Pay as you go (new accounts often get credit).' },
};

let keys = {};
function loadKeys() {
  try {
    const raw = JSON.parse(fs.readFileSync(KEYS_FILE(), 'utf8'));
    const out = {};
    for (const k of Object.keys(raw)) {
      try {
        const buf = Buffer.from(raw[k], 'base64');
        out[k] = safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(buf) : buf.toString('utf8');
      } catch { /* a key that can't be decrypted on this machine is dropped */ }
    }
    return out;
  } catch { return {}; }
}
function saveKeys() {
  const enc = {};
  for (const k of Object.keys(keys)) {
    if (!keys[k]) continue;
    const buf = safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(keys[k]) : Buffer.from(keys[k], 'utf8');
    enc[k] = buf.toString('base64');
  }
  try { fs.writeFileSync(KEYS_FILE(), JSON.stringify(enc)); } catch { /* best effort */ }
}

function createWindow() {
  const win = new BrowserWindow({
    width: 1180, height: 820, minWidth: 720, minHeight: 560,
    backgroundColor: '#0b0d12', autoHideMenuBar: true,
    webPreferences: { preload: path.join(__dirname, 'preload.js'), contextIsolation: true, nodeIntegration: false },
  });
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  // External links (Get a key, Open image) open in the real browser, not inside the app.
  win.webContents.setWindowOpenHandler(({ url }) => { if (/^https?:/.test(url)) shell.openExternal(url); return { action: 'deny' }; });
}

app.whenReady().then(() => {
  keys = loadKeys();
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});
app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });

// ---- IPC: the renderer talks to the vault and keyed providers only through these channels ----
// The renderer learns which providers have a key (never the key itself).
ipcMain.handle('providers', () => Object.entries(PROVIDERS).map(([id, p]) => ({ id, name: p.name, keyUrl: p.keyUrl, defModel: p.defModel, blurb: p.blurb || '', local: Boolean(p.local), noKey: Boolean(p.noKey), image: Boolean(p.image), keyHint: p.keyHint || '', connected: Boolean(p.local) || Boolean(p.noKey) || Boolean(keys[id]) })));

// DeepAI images: its own (non-OpenAI) API. The key stays in the vault; we call it from here.
ipcMain.handle('deepai:image', async (_e, { prompt }) => {
  const key = keys.deepai;
  if (!key) throw new Error('Add your DeepAI API key first (Keys).');
  const r = await fetch('https://api.deepai.org/api/text2img', { method: 'POST', headers: { 'api-key': key }, body: new URLSearchParams({ text: prompt }) });
  const j = await r.json().catch(() => ({}));
  if (!r.ok || !j.output_url) throw new Error(j.err || `DeepAI returned HTTP ${r.status}`);
  return j.output_url;
});
ipcMain.handle('keys:set', (_e, { provider, key }) => { if (PROVIDERS[provider]) { keys[provider] = (key || '').trim(); if (!keys[provider]) delete keys[provider]; saveKeys(); } return Object.keys(keys); });

// Free engines, run from the app's backend so there is no browser CORS / local-file block.
const HORDE = 'https://aihorde.net/api/v2';
const HAGENT = 'OpenStudio:0.1:desktop';
const sleep = (ms) => new Promise((r) => setTimeout(r, ms));

ipcMain.handle('horde:models', async () => {
  try {
    const r = await fetch(`${HORDE}/status/models?type=image`, { headers: { 'Client-Agent': HAGENT } });
    const j = await r.json();
    return Array.isArray(j) ? j.filter((m) => (m.count || 0) > 0).sort((a, b) => (b.count || 0) - (a.count || 0)).slice(0, 35).map((m) => ({ name: m.name, count: m.count })) : [];
  } catch { return []; }
});

ipcMain.handle('ptext', async (_e, { prompt, token }) => {
  const url = `https://text.pollinations.ai/${encodeURIComponent(prompt)}?model=openai&referrer=open-studio` + (token ? `&token=${encodeURIComponent(token)}` : '');
  const r = await fetch(url, token ? { headers: { Authorization: `Bearer ${token}` } } : {});
  if (!r.ok) throw new Error(r.status === 429 ? 'the free limit is cooling down — add a token in Keys' : `HTTP ${r.status}`);
  return (await r.text());
});

// Submit an AI Horde image job and poll until a volunteer finishes it; returns the image URL.
ipcMain.handle('horde:image', async (_e, { prompt, model, width, height, steps, seed }) => {
  const body = { prompt, nsfw: true, censor_nsfw: false, trusted_workers: false, r2: true,
    params: { width, height, steps, sampler_name: 'k_euler_a', cfg_scale: 7, n: 1, seed: String(seed) } };
  if (model) body.models = [model];
  const sub = await fetch(`${HORDE}/generate/async`, { method: 'POST', headers: { 'Content-Type': 'application/json', apikey: '0000000000', 'Client-Agent': HAGENT }, body: JSON.stringify(body) });
  const sj = await sub.json().catch(() => ({}));
  if (!sub.ok) throw new Error(sj.message || `HTTP ${sub.status}`);
  const id = sj.id;
  if (!id) throw new Error('AI Horde did not start the job.');
  const deadline = Date.now() + 300000;
  while (Date.now() < deadline) {
    await sleep(2500);
    const c = await fetch(`${HORDE}/generate/check/${id}`, { headers: { 'Client-Agent': HAGENT } });
    const s = await c.json().catch(() => ({}));
    if (s.faulted) throw new Error('a worker failed on this image');
    if (s.done) {
      const st = await (await fetch(`${HORDE}/generate/status/${id}`, { headers: { 'Client-Agent': HAGENT } })).json();
      const url = st.generations && st.generations[0] && st.generations[0].img;
      if (!url) throw new Error('no image came back');
      return url;
    }
  }
  throw new Error('AI Horde took too long; try again or choose "Any".');
});

ipcMain.handle('text', async (_e, { provider, model, prompt }) => {
  const p = PROVIDERS[provider];
  if (!p) throw new Error('Unknown provider.');
  let base = p.base;
  let auth = keys[provider];
  if (p.local || p.noKey) { auth = ''; }    // a local server (KoboldCpp) or anonymous gateway (LLM7) needs no key
  else if (!auth) throw new Error(`Add your ${p.name} key first (Keys).`);
  if (p.cf) {                               // Cloudflare: the key is ACCOUNT_ID:API_TOKEN
    const [account, tok] = String(auth).split(':');
    if (!account || !tok) throw new Error('Cloudflare key must be ACCOUNT_ID:API_TOKEN (see Keys).');
    base = `https://api.cloudflare.com/client/v4/accounts/${account}/ai/v1`;
    auth = tok;
  }
  const headers = { 'Content-Type': 'application/json' };
  if (auth) headers.Authorization = `Bearer ${auth}`;
  if (provider === 'openrouter') { headers['HTTP-Referer'] = 'https://open-studio.app'; headers['X-Title'] = 'Open Studio'; }
  let res;
  try {
    res = await fetch(`${base}/chat/completions`, { method: 'POST', headers, body: JSON.stringify({ model: model || p.defModel, messages: [{ role: 'user', content: prompt }], max_tokens: 1024 }) });
  } catch (e) {
    throw new Error(p.local ? `Could not reach ${p.name}. Start the KoboldCpp server first (localhost:5001).` : `Could not reach ${p.name}: ${e.message}`);
  }
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || `${p.name} returned HTTP ${res.status}`);
  return data.choices?.[0]?.message?.content || '(empty answer)';
});
