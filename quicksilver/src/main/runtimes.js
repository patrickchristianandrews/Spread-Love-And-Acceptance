// The helpers plug-ins run on, fetched by Quicksilver itself: most ready-made plug-ins (MCP
// servers) start with "npx" (Node.js) or "uvx" (uv, for Python ones). When this PC doesn't have
// them, the first plug-in that needs one downloads it from its official source (nodejs.org,
// github.com/astral-sh/uv), checks its published SHA-256 fingerprint, and keeps it in
// Quicksilver's engines folder. Nothing is installed system-wide and nothing else on the PC changes.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawnSync } = require('node:child_process');
const store = require('./store');

const root = () => path.join(store.dir('engines'), 'runtimes');
const BASE = {
  node: () => process.env.QS_NODE_DIST || 'https://nodejs.org/dist/latest-v22.x',
  uv: () => process.env.QS_UV_DIST || 'https://github.com/astral-sh/uv/releases/latest/download',
};
const win = process.platform === 'win32';
const arch = process.arch === 'arm64' ? 'arm64' : 'x64';

// Is the command already on this PC? (Tests can pretend it isn't.)
function onPath(cmd) {
  if (process.env.QS_RUNTIME_FORCE) return false;
  try { const r = spawnSync(win ? 'where' : 'which', [cmd], { encoding: 'utf8', timeout: 5000, windowsHide: true }); return r.status === 0 && Boolean(r.stdout.trim()); } catch { return false; }
}

function findBin(dir, names, depth = 4) {
  if (depth < 0 || !fs.existsSync(dir)) return null;
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) {
    const p = path.join(dir, e.name);
    if (e.isFile() && names.includes(e.name)) return p;
  }
  for (const e of fs.readdirSync(dir, { withFileTypes: true })) if (e.isDirectory()) { const f = findBin(path.join(dir, e.name), names, depth - 1); if (f) return f; }
  return null;
}
const BINS = { node: win ? ['npx.cmd'] : ['npx'], uv: win ? ['uvx.exe'] : ['uvx'] };
const have = (kind) => findBin(path.join(root(), kind), BINS[kind]);

async function text(url) {
  const res = await require('./engines').httpGet(url);
  if (!res.ok) { res.cancel?.(); throw new Error(`HTTP ${res.status} from ${url}`); }
  const chunks = []; for await (const c of res.body) chunks.push(Buffer.from(c));
  return Buffer.concat(chunks).toString('utf8');
}
// Which file to fetch, and its published fingerprint.
async function plan(kind) {
  if (kind === 'node') {
    const sums = await text(`${BASE.node()}/SHASUMS256.txt`);
    const want = win ? new RegExp(`node-v[\\d.]+-win-${arch}\\.zip$`) : new RegExp(`node-v[\\d.]+-${process.platform === 'darwin' ? 'darwin' : 'linux'}-${arch}\\.tar\\.gz$`);
    const line = sums.split('\n').map((l) => l.trim().split(/\s+/)).find(([, f]) => f && want.test(f));
    if (!line) throw new Error('Could not find a Node.js download for this PC.');
    return { url: `${BASE.node()}/${line[1]}`, file: line[1], sha: line[0] };
  }
  const triple = win ? `${arch === 'arm64' ? 'aarch64' : 'x86_64'}-pc-windows-msvc` : process.platform === 'darwin' ? `${arch === 'arm64' ? 'aarch64' : 'x86_64'}-apple-darwin` : `${arch === 'arm64' ? 'aarch64' : 'x86_64'}-unknown-linux-gnu`;
  const file = `uv-${triple}.${win ? 'zip' : 'tar.gz'}`;
  const sha = (await text(`${BASE.uv()}/${file}.sha256`)).trim().split(/\s+/)[0];
  return { url: `${BASE.uv()}/${file}`, file, sha };
}

const busy = new Map();
// Makes sure the helper is here; returns the path of npx / uvx.
function ensure(kind, onStatus) {
  const ready = have(kind);
  if (ready) return Promise.resolve(ready);
  if (busy.has(kind)) return busy.get(kind);
  const job = (async () => {
    if (require('./offline').isOffline()) throw new Error(`This plug-in needs ${kind === 'node' ? 'Node.js' : 'uv'}, which Quicksilver downloads the first time. Go online once, then it works offline.`);
    onStatus?.(`Getting ${kind === 'node' ? 'Node.js' : 'uv'} for this plug-in (first time only)…`);
    const p = await plan(kind);
    if (!/^[a-f0-9]{64}$/i.test(p.sha)) throw new Error(`No fingerprint published for ${p.file}; not downloading it.`);
    const tmp = path.join(store.dir('tmp'), `${Date.now()}-${p.file}`);
    try {
      await require('./engines').downloadTo(p.url, tmp);
      const got = crypto.createHash('sha256').update(fs.readFileSync(tmp)).digest('hex');
      if (got.toLowerCase() !== p.sha.toLowerCase()) throw new Error(`${p.file} did not match its published fingerprint, so it was thrown away.`);
      const dest = path.join(root(), kind);
      fs.rmSync(dest, { recursive: true, force: true });
      require('./engines').extract(tmp, dest);
    } finally { fs.rmSync(tmp, { force: true }); }
    const bin = have(kind);
    if (!bin) throw new Error(`${kind === 'node' ? 'Node.js' : 'uv'} was downloaded but ${BINS[kind][0]} is missing from it.`);
    return bin;
  })();
  busy.set(kind, job);
  job.finally(() => busy.delete(kind)).catch(() => {});
  return job;
}

// The command a plug-in should run, with its helper on PATH (npx needs node beside it).
async function resolveCommand(command, env = {}, onStatus) {
  const c = String(command || '');
  const kind = /^(npx|npm)(\.cmd)?$/i.test(c) ? 'node' : /^(uvx|uv)(\.exe)?$/i.test(c) ? 'uv' : null;
  if (!kind || onPath(c.replace(/\.(cmd|exe)$/i, ''))) return { command: c, env };
  const bin = await ensure(kind, onStatus);
  const dir = path.dirname(bin);
  const name = c.replace(/\.(cmd|exe)$/i, '');
  const exe = findBin(dir, win ? [`${name}${kind === 'node' ? '.cmd' : '.exe'}`] : [name], 0) || bin;
  const PATH = [dir, env.PATH || env.Path || process.env.PATH || process.env.Path || ''].join(path.delimiter);
  return { command: exe, env: { ...env, PATH, ...(win ? { Path: PATH } : {}) } };
}

function status() { return { node: Boolean(have('node')) || onPath('npx'), uv: Boolean(have('uv')) || onPath('uvx') }; }

module.exports = { resolveCommand, ensure, status, onPath };
