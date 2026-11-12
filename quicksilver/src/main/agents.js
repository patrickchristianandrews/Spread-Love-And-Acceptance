// Coding agents (OpenCode, OpenHands) running on Quicksilver's models. Both are separate, free,
// open-source apps; they read your project, edit files and run commands. Quicksilver supplies the
// AI through its local API (OpenAI format, with tool calls), so they run on your own models,
// privately and for free, or on a cloud API you have connected.
// OpenCode: Quicksilver writes its settings file (adding a "Quicksilver" provider, nothing else
// in the file is changed). OpenHands runs in Docker: Quicksilver shows the settings to type in.
'use strict';
const fs = require('node:fs');
const os = require('node:os');
const path = require('node:path');
const { execFile } = require('node:child_process');
const store = require('./store');
const complete = require('./complete');

// OpenCode reads ~/.config/opencode/opencode.json on Windows, macOS and Linux alike.
const opencodeFile = () => path.join(os.homedir(), '.config', 'opencode', 'opencode.json');

// Whether a program is on this PC (on the PATH).
function onPath(name) {
  return new Promise((resolve) => {
    execFile(process.platform === 'win32' ? 'where' : 'which', [name], { timeout: 5000, windowsHide: true }, (err, out) => resolve(!err && String(out).trim() ? String(out).trim().split(/\r?\n/)[0] : ''));
  });
}

// The models an agent can use: single models only (a team answers in turns of its own). Coding
// models first, then the rest; cloud models after the ones on this PC.
function agentModels() {
  const list = complete.targets().filter((t) => /^(local|api):/.test(t.target));
  const coder = (t) => /cod(e|er)|devstral|qwen3-coder|deepseek|glm|kimi|gpt|claude|gemini/i.test(`${t.target} ${t.label}`);
  return list.sort((a, b) => (b.target.startsWith('local:') - a.target.startsWith('local:')) || (coder(b) - coder(a))).map((t) => ({ id: t.target, name: t.label }));
}

function apiBase(forDocker = false) {
  const cfg = store.config().apiServer;
  return `http://${forDocker ? 'host.docker.internal' : '127.0.0.1'}:${cfg.port}/v1`;
}

async function status() {
  const cfg = store.config().apiServer;
  const [opencode, docker, vscode, aider] = await Promise.all([onPath('opencode'), onPath('docker'), onPath('code'), onPath('aider')]);
  let configured = false;
  try { configured = Boolean(JSON.parse(fs.readFileSync(opencodeFile(), 'utf8')).provider?.quicksilver); } catch {}
  return { opencode: Boolean(opencode), docker: Boolean(docker), vscode: Boolean(vscode), aider: Boolean(aider), configured, file: opencodeFile(), api: { enabled: cfg.enabled, port: cfg.port, requireKey: cfg.requireKey, docker: Boolean(cfg.docker) }, base: apiBase(), dockerBase: apiBase(true), models: agentModels() };
}

// Adds (or refreshes) the Quicksilver provider in OpenCode's settings, keeping everything else.
// A settings file that can't be read as JSON is kept as a .bak copy before a fresh one is written.
function setupOpencode({ model } = {}) {
  const file = opencodeFile();
  let cfg = {};
  if (fs.existsSync(file)) {
    const raw = fs.readFileSync(file, 'utf8');
    try { cfg = JSON.parse(raw); } catch { fs.writeFileSync(`${file}.bak`, raw); cfg = {}; }
  }
  const models = agentModels();
  if (!models.length) throw new Error('No single model to offer yet. Download a model (a coding model works best) or connect a cloud API first.');
  const key = store.config().apiServer.requireKey ? store.getSecret('apiServerKey') : '';
  cfg.$schema ||= 'https://opencode.ai/config.json';
  cfg.provider = { ...(cfg.provider || {}), quicksilver: {
    npm: '@ai-sdk/openai-compatible',
    name: 'Quicksilver (this PC)',
    options: { baseURL: apiBase(), ...(key ? { apiKey: key } : {}) },
    models: Object.fromEntries(models.map((m) => [m.id, { name: m.name }])),
  } };
  const pick = model && models.some((m) => m.id === model) ? model : models[0].id;
  if (model || !cfg.model) cfg.model = `quicksilver/${pick}`;
  fs.mkdirSync(path.dirname(file), { recursive: true });
  fs.writeFileSync(file, `${JSON.stringify(cfg, null, 2)}\n`);
  return { file, model: pick, models: models.length };
}

module.exports = { status, setupOpencode, agentModels, opencodeFile };
