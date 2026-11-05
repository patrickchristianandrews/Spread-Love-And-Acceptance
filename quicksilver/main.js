// Quicksilver — main process.
// Owns the window, saved data, the local model engine and model downloads.
// Local models need no account or key. Claude in the cloud is an optional extra.

const { app, BrowserWindow, ipcMain, dialog, safeStorage, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const engine = require('./engine');
const catalog = require('./catalog');

const USER = () => app.getPath('userData');
const DATA_FILE = () => path.join(USER(), 'quicksilver-data.json');
const KEY_FILE = () => path.join(USER(), 'quicksilver-key.bin');
const MODELS_FILE = () => path.join(USER(), 'models.json');
const MODELS_DIR = () => path.join(USER(), 'models');

// ---------- small JSON helpers ----------

function readJSON(file, fallback) {
  try { return JSON.parse(fs.readFileSync(file, 'utf8')); } catch { return fallback; }
}
function writeJSON(file, value) {
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(value));
  fs.renameSync(tmp, file); // atomic replace
}

// ---------- installed models ----------
// [{ id, name, file, size, catalogId?, source }]

function installedModels() {
  return readJSON(MODELS_FILE(), []).filter((m) => fs.existsSync(m.file));
}
function saveModels(list) { writeJSON(MODELS_FILE(), list); }
function addModel(entry) {
  const list = installedModels().filter((m) => m.file !== entry.file);
  list.push(entry);
  saveModels(list);
  return entry;
}

// ---------- optional Claude key ----------

function readKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const buf = fs.readFileSync(KEY_FILE());
    return safeStorage.isEncryptionAvailable() ? safeStorage.decryptString(buf) : buf.toString('utf8');
  } catch { return ''; }
}
function writeKey(key) {
  if (!key) { try { fs.unlinkSync(KEY_FILE()); } catch {} return; }
  const buf = safeStorage.isEncryptionAvailable() ? safeStorage.encryptString(key) : Buffer.from(key, 'utf8');
  fs.writeFileSync(KEY_FILE(), buf, { mode: 0o600 });
}

// ---------- chat ----------

const active = new Map(); // requestId -> AbortController | Claude stream

async function runLocal(sender, p) {
  const model = installedModels().find((m) => m.id === p.target.modelId);
  if (!model) throw new Error('That model is not installed any more. Pick another one at the top of the chat.');
  const controller = new AbortController();
  active.set(p.requestId, controller);
  if (engine.loadedFile() !== model.file) sender.send('chat:status', { requestId: p.requestId, status: `Loading ${model.name}…` });
  const { aborted } = await engine.generate({
    file: model.file,
    contextSize: p.contextSize,
    gpuLayers: p.gpuLayers,
    system: p.system,
    history: p.messages,
    maxTokens: p.maxTokens,
    temperature: p.temperature,
    signal: controller.signal,
    onText: (text) => sender.send('chat:delta', { requestId: p.requestId, text }),
  });
  if (aborted) sender.send('chat:error', { requestId: p.requestId, message: 'Stopped.', aborted: true });
  else sender.send('chat:done', { requestId: p.requestId });
}

async function runClaude(sender, p) {
  const apiKey = readKey();
  if (!apiKey) throw new Error('Claude needs an Anthropic API key (Settings → Cloud). Local models need none.');
  const Anthropic = require('@anthropic-ai/sdk').default;
  const client = new Anthropic({ apiKey });
  try {
    const stream = client.beta.messages.stream({
      model: p.target.model,
      max_tokens: p.maxTokens,
      system: p.system,
      messages: p.messages,
      output_config: { effort: p.target.effort || 'low' },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });
    active.set(p.requestId, stream);
    stream.on('text', (text) => sender.send('chat:delta', { requestId: p.requestId, text }));
    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') throw new Error('Claude declined to continue this reply.');
    sender.send('chat:done', { requestId: p.requestId, stopReason: final.stop_reason });
  } catch (err) {
    if (err instanceof Anthropic.APIUserAbortError) {
      sender.send('chat:error', { requestId: p.requestId, message: 'Stopped.', aborted: true });
      return;
    }
    if (err instanceof Anthropic.AuthenticationError) throw new Error('Your Anthropic API key was not accepted.');
    if (err instanceof Anthropic.RateLimitError) throw new Error('Claude is rate limited. Wait a moment and try again.');
    if (err instanceof Anthropic.APIConnectionError) throw new Error('Could not reach Claude. Check your internet connection, or use a local model.');
    throw err;
  }
}

async function runChat(sender, p) {
  try {
    if (p.target.kind === 'claude') await runClaude(sender, p);
    else await runLocal(sender, p);
  } catch (err) {
    sender.send('chat:error', { requestId: p.requestId, message: friendly(err) });
  } finally {
    active.delete(p.requestId);
  }
}

function friendly(err) {
  const msg = String(err?.message || err);
  if (/out of memory|failed to allocate|ErrorOutOfDeviceMemory|insufficient memory/i.test(msg)) {
    return 'Not enough memory to run this model. Try a smaller model, or lower the context size in Settings.';
  }
  return msg;
}

// ---------- IPC ----------

ipcMain.handle('store:load', () => readJSON(DATA_FILE(), null));
ipcMain.handle('store:save', (_e, data) => { writeJSON(DATA_FILE(), data); return true; });

ipcMain.handle('key:status', () => ({
  hasKey: Boolean(readKey()), fromEnv: Boolean(process.env.ANTHROPIC_API_KEY), encrypted: safeStorage.isEncryptionAvailable(),
}));
ipcMain.handle('key:set', (_e, key) => { writeKey(String(key || '').trim()); return true; });

ipcMain.on('chat:send', (e, p) => { runChat(e.sender, p); });
ipcMain.on('chat:abort', (_e, id) => { active.get(id)?.abort(); });

ipcMain.handle('system:hardware', () => engine.hardware());

ipcMain.handle('models:list', () => ({
  installed: installedModels(),
  catalog: catalog.MODELS,
  jobs: Object.fromEntries(Object.entries(catalog.JOBS).map(([k, v]) => [k, { label: v.label, icon: v.icon, pitch: v.pitch }])),
  downloading: [...downloading.values()],
  dir: MODELS_DIR(),
}));

ipcMain.handle('advisor:advise', async (_e, job) => {
  const hw = await engine.hardware();
  const installedIds = installedModels().map((m) => m.catalogId).filter(Boolean);
  return { hardware: hw, advice: catalog.advise(job, hw, installedIds), job: catalog.JOBS[job] };
});

const downloading = new Map(); // id -> { id, name, downloaded, total }

ipcMain.handle('models:download', async (e, req) => {
  const sender = e.sender;
  const item = req.catalogId ? catalog.MODELS.find((m) => m.id === req.catalogId) : null;
  const uri = item ? item.uri : String(req.uri || '').trim();
  if (!uri) throw new Error('Paste a Hugging Face link or hf: address.');
  const id = item ? item.id : `custom-${Date.now()}`;
  if (downloading.has(id)) return { id };
  const name = item ? item.name : uri.replace(/^hf:/, '').split(/[/:]/).slice(-2).join(' ');
  const state = { id, name, downloaded: 0, total: 0 };
  downloading.set(id, state);
  sender.send('models:progress', state);
  engine.download({
    id, uri, dir: MODELS_DIR(),
    onProgress: ({ totalSize, downloadedSize }) => {
      state.total = totalSize; state.downloaded = downloadedSize;
      if (!state._t || Date.now() - state._t > 250) { state._t = Date.now(); sender.send('models:progress', state); }
    },
  }).then(async ({ file, size }) => {
    let label = name;
    if (!item) { try { label = (await engine.inspect(file)).name; } catch {} }
    const entry = addModel({ id: item ? item.id : `m-${Date.now().toString(36)}`, name: label, file, size, catalogId: item?.id, source: uri });
    downloading.delete(id);
    sender.send('models:done', { id, model: entry });
  }).catch((err) => {
    downloading.delete(id);
    const cancelled = /cancel|abort/i.test(String(err?.message || err));
    sender.send('models:error', { id, cancelled, message: cancelled ? 'Download cancelled.' : `Download failed: ${err?.message || err}` });
  });
  return { id };
});

ipcMain.handle('models:cancel', (_e, id) => engine.cancelDownload(id));

ipcMain.handle('models:import', async (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    title: 'Import a model file',
    properties: ['openFile'],
    filters: [{ name: 'GGUF model', extensions: ['gguf'] }],
  });
  if (canceled || !filePaths[0]) return null;
  const info = await engine.inspect(filePaths[0]); // throws if it isn't a model
  return addModel({ id: `m-${Date.now().toString(36)}`, name: info.name, file: filePaths[0], size: info.size, source: 'imported' });
});

ipcMain.handle('models:delete', async (_e, id) => {
  const list = installedModels();
  const m = list.find((x) => x.id === id);
  if (!m) return false;
  if (engine.loadedFile() === m.file) await engine.unload();
  // Only delete files Quicksilver downloaded itself; imported files stay where they were.
  if (m.source !== 'imported' && m.file.startsWith(MODELS_DIR())) { try { fs.unlinkSync(m.file); } catch {} }
  saveModels(list.filter((x) => x.id !== id));
  return true;
});

ipcMain.handle('models:folder', () => { fs.mkdirSync(MODELS_DIR(), { recursive: true }); shell.openPath(MODELS_DIR()); });

ipcMain.handle('file:export', async (e, { suggestedName, json }) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    defaultPath: suggestedName, filters: [{ name: 'Character JSON', extensions: ['json'] }],
  });
  if (canceled || !filePath) return false;
  fs.writeFileSync(filePath, json);
  return true;
});

ipcMain.handle('file:import', async (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openFile', 'multiSelections'], filters: [{ name: 'Character JSON', extensions: ['json'] }],
  });
  if (canceled) return [];
  return filePaths.map((p) => fs.readFileSync(p, 'utf8'));
});

// ---------- window ----------

function createWindow() {
  const win = new BrowserWindow({
    width: 1320,
    height: 860,
    minWidth: 820,
    minHeight: 560,
    title: 'Quicksilver',
    icon: path.join(__dirname, 'build', 'icon.png'),
    backgroundColor: '#0d1220',
    webPreferences: {
      preload: path.join(__dirname, 'preload.js'),
      contextIsolation: true,
      nodeIntegration: false,
      sandbox: true,
    },
  });
  win.setMenuBarVisibility(false);
  win.loadFile(path.join(__dirname, 'renderer', 'index.html'));
  win.webContents.setWindowOpenHandler(({ url }) => {
    if (/^https?:/.test(url)) shell.openExternal(url);
    return { action: 'deny' };
  });
  win.webContents.on('will-navigate', (ev) => ev.preventDefault());
}

app.whenReady().then(() => {
  createWindow();
  app.on('activate', () => { if (BrowserWindow.getAllWindows().length === 0) createWindow(); });
});

app.on('window-all-closed', async () => {
  await engine.unload();
  if (process.platform !== 'darwin') app.quit();
});
