// Finds the engine programs (llama-server and sd) and downloads extra builds on demand.
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const store = require('./store');
const { ENGINES, pickAssets } = require('../shared/engine-spec');

let electron = null;
if (process.versions.electron) { try { electron = require('electron'); } catch {} }

const APP_ROOT = path.join(__dirname, '..', '..');

function bundledDir() {
  if (electron?.app?.isPackaged) return path.join(process.resourcesPath, 'engine');
  return path.join(APP_ROOT, 'engine');
}
const runtimeDir = () => store.dir('engines');

function findFile(root, names, depth = 4) {
  if (!fs.existsSync(root) || depth < 0) return null;
  for (const n of names) {
    const p = path.join(root, n);
    if (fs.existsSync(p) && fs.statSync(p).isFile()) return p;
  }
  for (const entry of fs.readdirSync(root, { withFileTypes: true })) {
    if (entry.isDirectory()) {
      const hit = findFile(path.join(root, entry.name), names, depth - 1);
      if (hit) return hit;
    }
  }
  return null;
}

// Every installed build of an engine: { variant, label, bin, source }
function installed(kind) {
  const spec = ENGINES[kind];
  const list = [];
  const env = kind === 'llama' ? process.env.QS_LLAMA_SERVER : process.env.QS_SD_BIN;
  if (env && fs.existsSync(env)) list.push({ variant: 'custom', label: 'Custom (environment)', bin: env, source: 'env' });
  const variants = spec.variants[process.platform] || {};
  for (const [variant, v] of Object.entries(variants)) {
    const bin = findFile(path.join(runtimeDir(), `${kind}-${variant}`), spec.binaries);
    if (bin) list.push({ variant, label: v.label, bin, source: 'downloaded' });
  }
  const bundled = findFile(path.join(bundledDir(), kind), spec.binaries);
  if (bundled) {
    const variant = spec.bundled[process.platform] || 'bundled';
    list.push({ variant, label: `${variants[variant]?.label || 'Bundled'} (included)`, bin: bundled, source: 'bundled' });
  }
  return list;
}

// The build to use: the user's choice, else CUDA on NVIDIA, else what's included.
function resolve(kind, hw) {
  const list = installed(kind);
  if (!list.length) return null;
  const choice = store.config().engine?.[kind] || 'auto';
  if (choice !== 'auto') {
    const hit = list.find((e) => e.variant === choice);
    if (hit) return hit;
  }
  if (hw?.nvidia) {
    const cuda = list.find((e) => e.variant === 'cuda');
    if (cuda) return cuda;
  }
  return list.find((e) => e.source === 'env') || list.find((e) => e.source === 'bundled') || list[0];
}

function available(kind) {
  const variants = ENGINES[kind].variants[process.platform] || {};
  return Object.entries(variants).map(([variant, v]) => ({ variant, label: v.label, nvidiaOnly: Boolean(v.nvidiaOnly) }));
}

const downloads = new Map();

async function githubLatest(repo) {
  const res = await fetch(`https://api.github.com/repos/${repo}/releases/latest`, {
    headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Quicksilver' },
  });
  if (!res.ok) throw new Error(`Could not check ${repo} releases (HTTP ${res.status}).`);
  return res.json();
}

async function downloadTo(url, dest, onProgress, signal) {
  const res = await fetch(url, { headers: { 'User-Agent': 'Quicksilver' }, signal });
  if (!res.ok || !res.body) throw new Error(`Download failed (HTTP ${res.status}).`);
  const total = Number(res.headers.get('content-length')) || 0;
  const out = fs.createWriteStream(dest);
  let done = 0;
  for await (const chunk of res.body) {
    done += chunk.length;
    if (!out.write(chunk)) await new Promise((r) => out.once('drain', r));
    onProgress?.(done, total);
  }
  await new Promise((r, j) => out.end((e) => (e ? j(e) : r())));
}

function extract(archive, destDir) {
  fs.mkdirSync(destDir, { recursive: true });
  if (/\.zip$/i.test(archive)) {
    const AdmZip = require('adm-zip');
    new AdmZip(archive).extractAllTo(destDir, true);
  } else {
    require('node:child_process').execFileSync('tar', ['-xzf', archive, '-C', destDir]);
  }
  if (process.platform !== 'win32') {
    const walk = (d) => fs.readdirSync(d, { withFileTypes: true }).forEach((e) => {
      const p = path.join(d, e.name);
      if (e.isDirectory()) walk(p); else if (!/\.(txt|md|json|h|hpp|py)$/i.test(e.name)) fs.chmodSync(p, 0o755);
    });
    walk(destDir);
  }
}

// Downloads one build from the official GitHub releases and unpacks it.
async function install(kind, variant, onProgress) {
  const spec = ENGINES[kind];
  const v = spec.variants[process.platform]?.[variant];
  if (!v) throw new Error('That engine build is not available for this system.');
  const key = `${kind}-${variant}`;
  if (downloads.has(key)) return downloads.get(key).promise;
  const controller = new AbortController();
  const promise = (async () => {
    const release = await githubLatest(spec.repo);
    const assets = pickAssets(release.assets, v);
    const target = path.join(runtimeDir(), key);
    const tmpTarget = `${target}.tmp`;
    fs.rmSync(tmpTarget, { recursive: true, force: true });
    const totalBytes = assets.reduce((t, a) => t + a.size, 0);
    let before = 0;
    for (const a of assets) {
      const tmp = path.join(os.tmpdir(), `qs-${Date.now()}-${a.name}`);
      await downloadTo(a.browser_download_url, tmp, (d) => onProgress?.({ downloaded: before + d, total: totalBytes, version: release.tag_name }), controller.signal);
      before += a.size;
      extract(tmp, tmpTarget);
      fs.rmSync(tmp, { force: true });
    }
    fs.writeFileSync(path.join(tmpTarget, 'VERSION.txt'), release.tag_name);
    fs.rmSync(target, { recursive: true, force: true });
    fs.renameSync(tmpTarget, target);
    return { variant, version: release.tag_name };
  })();
  downloads.set(key, { promise, controller });
  try { return await promise; } finally { downloads.delete(key); }
}

function cancelInstall(kind, variant) { downloads.get(`${kind}-${variant}`)?.controller.abort(); }

function remove(kind, variant) {
  fs.rmSync(path.join(runtimeDir(), `${kind}-${variant}`), { recursive: true, force: true });
}

function version(bin) {
  const v = path.join(path.dirname(bin), 'VERSION.txt');
  try { return fs.readFileSync(v, 'utf8').trim(); } catch { return ''; }
}

module.exports = { installed, resolve, available, install, cancelInstall, remove, version, bundledDir, downloadTo, extract };
