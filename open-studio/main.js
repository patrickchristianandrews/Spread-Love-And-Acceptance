// Open Studio — Electron main process.
// Holds a secure, local-only key vault (encrypted with the OS keychain via safeStorage) and makes
// every keyed request from here, so an API key never reaches the page and is never exposed. The
// free engines (Pollinations, AI Horde) need no key and are called straight from the renderer.
'use strict';
const { app, BrowserWindow, ipcMain, safeStorage, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');

const KEYS_FILE = () => path.join(app.getPath('userData'), 'keys.json');

// Keyed clouds Open Studio can use for TEXT (all OpenAI-compatible). Free-with-key, generous tiers.
const PROVIDERS = {
  groq:       { name: 'Groq',       base: 'https://api.groq.com/openai/v1', keyUrl: 'https://console.groq.com/keys', defModel: 'llama-3.3-70b-versatile' },
  openrouter: { name: 'OpenRouter', base: 'https://openrouter.ai/api/v1',   keyUrl: 'https://openrouter.ai/keys',   defModel: 'meta-llama/llama-3.3-70b-instruct:free' },
  cerebras:   { name: 'Cerebras',   base: 'https://api.cerebras.ai/v1',     keyUrl: 'https://cloud.cerebras.ai',    defModel: 'llama-3.3-70b' },
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
ipcMain.handle('providers', () => Object.entries(PROVIDERS).map(([id, p]) => ({ id, name: p.name, keyUrl: p.keyUrl, defModel: p.defModel, connected: Boolean(keys[id]) })));
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
  const key = keys[provider];
  if (!key) throw new Error(`Add your ${p.name} key first (Keys).`);
  const res = await fetch(`${p.base}/chat/completions`, {
    method: 'POST',
    headers: { 'Content-Type': 'application/json', Authorization: `Bearer ${key}`,
      ...(provider === 'openrouter' ? { 'HTTP-Referer': 'https://open-studio.app', 'X-Title': 'Open Studio' } : {}) },
    body: JSON.stringify({ model: model || p.defModel, messages: [{ role: 'user', content: prompt }], max_tokens: 1024 }),
  });
  const data = await res.json().catch(() => ({}));
  if (!res.ok) throw new Error(data.error?.message || `${p.name} returned HTTP ${res.status}`);
  return data.choices?.[0]?.message?.content || '(empty answer)';
});
