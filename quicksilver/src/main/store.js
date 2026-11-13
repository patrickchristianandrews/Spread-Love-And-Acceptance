// Paths and saved data. Everything lives in the app's data folder (%APPDATA%\Quicksilver on Windows).
const path = require('node:path');
const fs = require('node:fs');

let electron = null;
if (process.versions.electron) { try { electron = require('electron'); } catch {} }

const state = { userDir: process.env.QUICKSILVER_HOME || null };

function userDir() {
  if (!state.userDir) state.userDir = electron?.app?.getPath('userData') || path.join(require('node:os').homedir(), '.quicksilver');
  fs.mkdirSync(state.userDir, { recursive: true });
  return state.userDir;
}
function dir(...parts) {
  const d = path.join(userDir(), ...parts);
  fs.mkdirSync(d, { recursive: true });
  return d;
}
const file = (name) => path.join(userDir(), name);

function readJSON(f, fallback) {
  try { return JSON.parse(fs.readFileSync(f, 'utf8')); } catch { return fallback; }
}
function writeJSON(f, value) {
  const tmp = `${f}.${process.pid}.tmp`;
  fs.writeFileSync(tmp, JSON.stringify(value));
  fs.renameSync(tmp, f); // atomic replace, so a crash never leaves half a file
}

// Secrets (API keys), encrypted with the operating system's own protection when available.
function secrets() { return readJSON(file('secrets.json'), {}); }
function getSecret(name) {
  const s = secrets()[name];
  if (!s) return '';
  try {
    const buf = Buffer.from(s.v, 'base64');
    if (s.enc && electron?.safeStorage?.isEncryptionAvailable()) return electron.safeStorage.decryptString(buf);
    return buf.toString('utf8');
  } catch { return ''; }
}
function setSecret(name, value) {
  const all = secrets();
  if (!value) delete all[name];
  else {
    const enc = Boolean(electron?.safeStorage?.isEncryptionAvailable());
    const buf = enc ? electron.safeStorage.encryptString(value) : Buffer.from(value, 'utf8');
    all[name] = { enc, v: buf.toString('base64') };
  }
  writeJSON(file('secrets.json'), all);
}
function hasSecret(name) { return Boolean(secrets()[name]); }

// App settings shared by the main process (engines, API server, providers, web search).
const DEFAULT_CONFIG = {
  apiServer: { enabled: false, port: 1337, requireKey: false, docker: false },
  web: { provider: 'free', searxngUrl: '' },
  providers: [], // [{ id, preset, name, baseUrl, models: [], imageModels: [] }]
  engine: { llama: 'auto', sd: 'auto' },
  calib: { text: 1, media: 1 },
};
function config() {
  const c = readJSON(file('config.json'), {});
  // 2.7: web search works without a key; turn it on for everyone still on the old default (Off).
  if (!c.webFreeDefault && c.web?.provider === 'none') c.web = { ...c.web, provider: 'free' };
  return { ...DEFAULT_CONFIG, ...c, webFreeDefault: true, apiServer: { ...DEFAULT_CONFIG.apiServer, ...c.apiServer }, web: { ...DEFAULT_CONFIG.web, ...c.web }, engine: { ...DEFAULT_CONFIG.engine, ...c.engine }, calib: { ...DEFAULT_CONFIG.calib, ...c.calib } };
}
function saveConfig(patch) {
  const next = { ...config(), ...patch };
  writeJSON(file('config.json'), next);
  return next;
}

module.exports = { userDir, dir, file, readJSON, writeJSON, getSecret, setSecret, hasSecret, config, saveConfig };
