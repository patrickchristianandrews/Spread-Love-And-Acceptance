// Quicksilver — main process.
// Owns the window, the saved data (characters, chats, settings), the encrypted API key,
// and every call to the Claude API. The page (renderer) never sees the key.

const { app, BrowserWindow, ipcMain, dialog, safeStorage, shell } = require('electron');
const path = require('node:path');
const fs = require('node:fs');
const Anthropic = require('@anthropic-ai/sdk').default;

const DATA_FILE = () => path.join(app.getPath('userData'), 'quicksilver-data.json');
const KEY_FILE = () => path.join(app.getPath('userData'), 'quicksilver-key.bin');

// ---------- saved data ----------

function loadData() {
  try {
    return JSON.parse(fs.readFileSync(DATA_FILE(), 'utf8'));
  } catch {
    return null; // first run: the renderer seeds defaults
  }
}

function saveData(data) {
  const file = DATA_FILE();
  const tmp = file + '.tmp';
  fs.writeFileSync(tmp, JSON.stringify(data));
  fs.renameSync(tmp, file); // atomic replace, so a crash never leaves half a file
}

// ---------- API key (encrypted with the OS keychain when available) ----------

function readKey() {
  if (process.env.ANTHROPIC_API_KEY) return process.env.ANTHROPIC_API_KEY;
  try {
    const buf = fs.readFileSync(KEY_FILE());
    if (safeStorage.isEncryptionAvailable()) return safeStorage.decryptString(buf);
    return buf.toString('utf8');
  } catch {
    return '';
  }
}

function writeKey(key) {
  if (!key) {
    try { fs.unlinkSync(KEY_FILE()); } catch {}
    return;
  }
  const buf = safeStorage.isEncryptionAvailable()
    ? safeStorage.encryptString(key)
    : Buffer.from(key, 'utf8');
  fs.writeFileSync(KEY_FILE(), buf, { mode: 0o600 });
}

// ---------- Claude ----------

const active = new Map(); // requestId -> stream, so Stop can abort it

async function runChat(sender, { requestId, model, effort, maxTokens, system, messages }) {
  const apiKey = readKey();
  if (!apiKey) {
    sender.send('chat:error', { requestId, message: 'Add your Anthropic API key in Settings first.' });
    return;
  }
  const client = new Anthropic({ apiKey });

  try {
    // Server-side fallback: if the model declines, the API re-runs the request on
    // Anthropic's recommended fallback model inside the same call.
    const stream = client.beta.messages.stream({
      model,
      max_tokens: maxTokens,
      system,
      messages,
      output_config: { effort },
      betas: ['server-side-fallback-2026-07-01'],
      fallbacks: 'default',
    });
    active.set(requestId, stream);

    stream.on('text', (text) => sender.send('chat:delta', { requestId, text }));

    const final = await stream.finalMessage();
    if (final.stop_reason === 'refusal') {
      sender.send('chat:error', {
        requestId,
        message: 'Claude declined to continue this reply. Try editing your last message or the scene.',
      });
      return;
    }
    sender.send('chat:done', {
      requestId,
      stopReason: final.stop_reason,
      model: final.model,
      usage: final.usage,
    });
  } catch (err) {
    sender.send('chat:error', { requestId, message: describeError(err), aborted: isAbort(err) });
  } finally {
    active.delete(requestId);
  }
}

function isAbort(err) {
  return err instanceof Anthropic.APIUserAbortError || err?.name === 'AbortError';
}

function describeError(err) {
  if (isAbort(err)) return 'Stopped.';
  if (err instanceof Anthropic.AuthenticationError) return 'Your API key was not accepted. Check it in Settings.';
  if (err instanceof Anthropic.PermissionDeniedError) return 'This API key cannot use that model.';
  if (err instanceof Anthropic.NotFoundError) return 'That model was not found. Pick another one in Settings.';
  if (err instanceof Anthropic.RateLimitError) return 'Rate limited. Wait a moment and try again.';
  if (err instanceof Anthropic.BadRequestError) return `The request was rejected: ${err.message}`;
  if (err instanceof Anthropic.APIConnectionError) return 'Could not reach the Claude API. Check your internet connection.';
  if (err instanceof Anthropic.APIError) return `Claude API error (${err.status ?? 'unknown'}): ${err.message}`;
  return String(err?.message || err);
}

// ---------- IPC ----------

ipcMain.handle('store:load', () => loadData());
ipcMain.handle('store:save', (_e, data) => { saveData(data); return true; });

ipcMain.handle('key:status', () => ({
  hasKey: Boolean(readKey()),
  fromEnv: Boolean(process.env.ANTHROPIC_API_KEY),
  encrypted: safeStorage.isEncryptionAvailable(),
}));
ipcMain.handle('key:set', (_e, key) => { writeKey(String(key || '').trim()); return true; });

ipcMain.on('chat:send', (e, payload) => { runChat(e.sender, payload); });
ipcMain.on('chat:abort', (_e, requestId) => { active.get(requestId)?.abort(); });

ipcMain.handle('file:export', async (e, { suggestedName, json }) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const { canceled, filePath } = await dialog.showSaveDialog(win, {
    defaultPath: suggestedName,
    filters: [{ name: 'Character JSON', extensions: ['json'] }],
  });
  if (canceled || !filePath) return false;
  fs.writeFileSync(filePath, json);
  return true;
});

ipcMain.handle('file:import', async (e) => {
  const win = BrowserWindow.fromWebContents(e.sender);
  const { canceled, filePaths } = await dialog.showOpenDialog(win, {
    properties: ['openFile', 'multiSelections'],
    filters: [{ name: 'Character JSON', extensions: ['json'] }],
  });
  if (canceled) return [];
  return filePaths.map((p) => fs.readFileSync(p, 'utf8'));
});

// ---------- window ----------

function createWindow() {
  const win = new BrowserWindow({
    width: 1280,
    height: 820,
    minWidth: 760,
    minHeight: 520,
    title: 'Quicksilver',
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

  // Links in messages open in the real browser, never inside the app.
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

app.on('window-all-closed', () => { if (process.platform !== 'darwin') app.quit(); });
