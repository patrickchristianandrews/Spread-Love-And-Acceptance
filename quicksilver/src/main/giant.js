// Giant models (optional, experimental): colibri (github.com/JustVugg/colibri) runs mixture-of-
// experts models far bigger than this PC's memory by keeping the busiest parts on the graphics
// card, the rest in memory, and streaming the least used parts from the SSD. Quicksilver downloads
// it from its official releases only when you ask (checking GitHub's published SHA-256 for the
// file), starts its server on this PC, and connects it like any other model source, so its models
// show up in every model menu. Nothing leaves this PC.
const fs = require('node:fs');
const path = require('node:path');
const crypto = require('node:crypto');
const { spawn } = require('node:child_process');
const store = require('./store');

const REPO = 'JustVugg/colibri';
const PORT = 8000;
const dir = () => path.join(store.dir('engines'), 'colibri');
let proc = null; let log = '';

// The models colibri is built for, with the speeds its authors published (24 GB graphics card,
// 62 GB memory, two NVMe drives). Yours depends most on the graphics card and the SSD.
const GIANT_MODELS = [
  { name: 'Qwen3.6 35B-A3B', sizeGB: 21, wps: 75, note: 'Fits in memory on a 32 GB PC: fast everywhere colibri runs.' },
  { name: 'Qwen3.8 Flash Next (IQ2_XS)', sizeGB: 68, wps: 38, note: 'Bigger than most PCs\' memory: streamed from the SSD.' },
  { name: 'DeepSeek V4 Flash', sizeGB: 85, wps: 4.5, note: 'Frontier-class reasoning; slow, best for one hard question at a time.' },
  { name: 'GLM-5.2 (UD-IQ1_S)', sizeGB: 202, wps: 0.5, note: 'Enormous; minutes per answer. For the curious.' },
];

// Is this PC up to it? Graphics card memory, memory and free disk decide.
function fit(hw) {
  const v = hw.vramGB || 0; const r = hw.ramGB || 0;
  let freeGB = 0;
  try { const s = fs.statfsSync(store.dir('engines')); freeGB = (s.bavail * s.bsize) / 1024 ** 3; } catch {}
  const scale = Math.max(0.15, Math.min(1.2, (v >= 24 ? 1 : v >= 16 ? 0.7 : v >= 12 ? 0.5 : v >= 8 ? 0.35 : 0.15) * (r >= 64 ? 1 : r >= 32 ? 0.85 : 0.6)));
  const level = v >= 16 && r >= 32 ? 'good' : v >= 8 && r >= 24 ? 'ok' : 'no';
  return {
    level, freeGB: Math.round(freeGB), vramGB: v, ramGB: r,
    text: level === 'good' ? `✓ This PC (${Math.round(v)} GB graphics card, ${Math.round(r)} GB memory) can run giant models; a fast NVMe SSD matters most for the biggest.`
      : level === 'ok' ? `Usable for the smaller giant models on this PC (${Math.round(v)} GB graphics card, ${Math.round(r)} GB memory); the biggest will be very slow.`
      : `⚠️ This PC (${v ? `${Math.round(v)} GB graphics card` : 'no graphics card'}, ${Math.round(r)} GB memory) is too small for giant models: they would take minutes per word. Use the Liquid Edition, or a cloud AI.`,
    models: GIANT_MODELS.map((m) => ({ ...m, wpsHere: Math.max(0.05, +(m.wps * scale).toFixed(m.wps * scale < 1 ? 2 : 1)), roomOk: freeGB >= m.sizeGB + 10 })),
  };
}

const findBin = () => {
  const names = process.platform === 'win32' ? ['coli.cmd', 'coli.exe', 'coli.bat'] : ['coli'];
  const walk = (d, depth) => { if (depth > 4 || !fs.existsSync(d)) return null; for (const e of fs.readdirSync(d, { withFileTypes: true })) { const p = path.join(d, e.name); if (e.isFile() && names.includes(e.name)) return p; } for (const e of fs.readdirSync(d, { withFileTypes: true })) if (e.isDirectory()) { const f = walk(path.join(d, e.name), depth + 1); if (f) return f; } return null; };
  return walk(dir(), 0);
};

// Downloads colibri's release for this PC (with the CUDA add-on on an NVIDIA card), checked
// against the SHA-256 GitHub publishes for each file.
async function install(hw, onStatus) {
  if (require('./offline').isOffline()) throw new Error('Quicksilver is offline. Go online to get colibri.');
  onStatus?.('Finding the latest colibri release…');
  const res = await fetch(`https://api.github.com/repos/${REPO}/releases/latest`, { headers: { Accept: 'application/vnd.github+json', 'User-Agent': 'Quicksilver' }, signal: AbortSignal.timeout(20000) });
  if (!res.ok) throw new Error(`Couldn't check colibri's releases (HTTP ${res.status}).`);
  const rel = await res.json();
  const os = process.platform === 'win32' ? 'windows' : process.platform === 'darwin' ? 'macos' : 'linux';
  const assets = rel.assets || [];
  const base = assets.find((a) => new RegExp(`${os}.*(x86_64|arm64|aarch64)?\\.(zip|tar\\.gz)$`, 'i').test(a.name) && !/cuda/i.test(a.name));
  if (!base) throw new Error(`colibri ${rel.tag_name} has no download for this kind of PC.`);
  const cuda = hw?.nvidia || /nvidia|geforce|rtx/i.test(hw?.gpuName || '') ? assets.find((a) => new RegExp(`${os}.*cuda`, 'i').test(a.name)) : null;
  fs.rmSync(dir(), { recursive: true, force: true });
  for (const a of [base, cuda].filter(Boolean)) {
    const sha = String(a.digest || '').replace(/^sha256:/, '');
    if (!/^[a-f0-9]{64}$/i.test(sha)) throw new Error(`${a.name} has no published fingerprint, so it wasn't downloaded.`);
    onStatus?.(`Downloading ${a.name} (${Math.round(a.size / 1024 ** 2)} MB)…`);
    const tmp = path.join(store.dir('tmp'), a.name);
    try {
      await require('./engines').downloadTo(a.browser_download_url, tmp, (d, t) => onStatus?.(`Downloading ${a.name}: ${t ? Math.round((d / t) * 100) : 0}%`));
      const got = crypto.createHash('sha256').update(fs.readFileSync(tmp)).digest('hex');
      if (got !== sha.toLowerCase()) throw new Error(`${a.name} didn't match its published fingerprint, so it was thrown away.`);
      require('./engines').extract(tmp, dir()); // the CUDA archive unpacks over the main one
    } finally { fs.rmSync(tmp, { force: true }); }
  }
  store.saveConfig({ giant: { ...(store.config().giant || {}), version: rel.tag_name, installedAt: Date.now() } });
  return { version: rel.tag_name };
}

// Starts colibri's server on this PC and connects it as a model source.
async function start(onStatus) {
  if (proc && !proc.exitCode) return status();
  const bin = findBin();
  if (!bin) throw new Error('colibri isn\'t installed yet.');
  log = '';
  const win = process.platform === 'win32';
  proc = spawn(win ? 'cmd.exe' : bin, win ? ['/c', bin, 'serve', '--port', String(PORT)] : ['serve', '--port', String(PORT)], { cwd: path.dirname(bin), windowsHide: true, env: { ...process.env } });
  const keep = (d) => { log = (log + d).slice(-6000); };
  proc.stdout.on('data', keep); proc.stderr.on('data', keep);
  proc.on('exit', () => { proc = null; });
  onStatus?.('Starting colibri…');
  for (let i = 0; i < 120; i++) {
    if (!proc) throw new Error(`colibri stopped while starting.${log.trim() ? ` It said: ${log.trim().split('\n').slice(-3).join(' ').slice(0, 400)}` : ''} Its first start may need a model: run "coli setup" in its folder once (${path.dirname(bin)}).`);
    try { const r = await fetch(`http://127.0.0.1:${PORT}/v1/models`, { signal: AbortSignal.timeout(1500) }); if (r.ok) break; } catch {}
    await new Promise((r) => setTimeout(r, 1000));
  }
  // Connected like LM Studio or Ollama: its models appear in every model menu.
  const providers = require('./providers');
  const have = providers.publicList().find((p) => p.preset === 'colibri');
  const p = have || providers.upsert({ preset: 'colibri', name: 'Giant models (colibri, on this PC)', baseUrl: `http://127.0.0.1:${PORT}/v1` }, '');
  await providers.refreshModels(p.id).catch(() => {});
  store.saveConfig({ giant: { ...(store.config().giant || {}), wanted: true } });
  return status();
}
function stop() { try { proc?.kill(); } catch {} proc = null; store.saveConfig({ giant: { ...(store.config().giant || {}), wanted: false } }); return status(); }
function status() { return { installed: Boolean(findBin()), running: Boolean(proc), version: store.config().giant?.version || '', folder: dir(), log: log.slice(-1200) }; }

module.exports = { fit, install, start, stop, status, GIANT_MODELS, PORT };
