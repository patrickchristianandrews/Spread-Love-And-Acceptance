// Installed models and downloads from Hugging Face.
// Files are resolved from the repo's file list, so catalog entries keep working when a repo
// renames files. Downloads resume where they stopped (a .part file plus an HTTP Range request).
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const crypto = require('node:crypto');
const store = require('./store');
const catalog = require('../shared/catalog');

const HF = 'https://huggingface.co';
const QUANT_ORDER = ['Q4_K_M', 'Q4_K_S', 'Q4_K_XL', 'Q4_0', 'Q5_K_M', 'IQ4_XS', 'Q5_K_S', 'Q6_K', 'Q3_K_M', 'Q8_0', 'MXFP4', 'F16', 'BF16'];

function hfHeaders() {
  const token = store.getSecret('huggingface');
  return { 'User-Agent': 'Quicksilver', ...(token ? { Authorization: `Bearer ${token}` } : {}) };
}

async function hfJSON(url) {
  const res = await fetch(url, { headers: hfHeaders(), signal: AbortSignal.timeout(30000) });
  if (res.status === 401 || res.status === 403) throw new Error('This model needs you to accept its license on huggingface.co first, then add a Hugging Face token in Settings → Accounts.');
  if (res.status === 404) throw new Error('That model was not found on Hugging Face.');
  if (!res.ok) throw new Error(`Hugging Face returned HTTP ${res.status}.`);
  return res.json();
}

const treeCache = new Map();
async function tree(repo) {
  if (treeCache.has(repo)) return treeCache.get(repo);
  const list = await hfJSON(`${HF}/api/models/${repo}/tree/main?recursive=true`);
  const files = list.filter((f) => f.type === 'file').map((f) => ({ path: f.path, size: f.lfs?.size || f.size || 0 }));
  treeCache.set(repo, files);
  return files;
}

// Lists the GGUF choices in a repo: [{ quant, files:[...], size }], plus vision projector files.
async function ggufOptions(repo) {
  const files = await tree(repo);
  const ggufs = files.filter((f) => /\.gguf$/i.test(f.path));
  const mmproj = ggufs.filter((f) => /mmproj/i.test(f.path));
  const weights = ggufs.filter((f) => !/mmproj/i.test(f.path));
  const groups = new Map();
  for (const f of weights) {
    const base = path.basename(f.path).replace(/-\d{5}-of-\d{5}\.gguf$/i, '.gguf');
    const m = base.match(/(?:^|[-_.])((?:UD-)?(?:I?Q\d(?:_[A-Z0-9]+)*|F16|BF16|F32|MXFP4))(?:[-_.]|\.gguf$)/i);
    const quant = (m ? m[1] : base.replace(/\.gguf$/i, '')).toUpperCase();
    const key = `${path.dirname(f.path)}|${quant}`;
    if (!groups.has(key)) groups.set(key, { quant, files: [], size: 0 });
    const g = groups.get(key);
    g.files.push(f);
    g.size += f.size;
  }
  const options = [...groups.values()].map((g) => ({ ...g, files: g.files.sort((a, b) => a.path.localeCompare(b.path)) }));
  options.sort((a, b) => rank(a.quant) - rank(b.quant) || a.size - b.size);
  const proj = [...mmproj].sort((a, b) => projRank(a.path) - projRank(b.path))[0] || null;
  return { options, mmproj: proj };
}
function rank(q) { const i = QUANT_ORDER.findIndex((x) => q.replace(/^UD-/, '') === x); return i < 0 ? 99 : i; }
function projRank(p) { return /f16/i.test(p) && !/bf16/i.test(p) ? 0 : /bf16/i.test(p) ? 1 : /q8/i.test(p) ? 2 : 3; }

// ---------- installed registry ----------
// { id, name, kind: 'text'|'image'|'video', catalogId?, repo?, files: { role: absPath }, size, vision?, added }

const REG = () => store.file('models.json');
// Quicksilver 1.0 saved models as { id, name, file, size, catalogId? } (text only). Convert those
// entries once, so models downloaded with 1.0 keep showing up and working.
function upgradeOld(all) {
  let changed = false;
  const out = all.map((m) => {
    if (m.files || !m.file) return m;
    changed = true;
    const cat = catalog.TEXT_MODELS.find((c) => c.id === m.catalogId || c.id === m.id);
    return { ...m, kind: 'text', files: { model: m.file }, catalogId: m.catalogId || cat?.id, name: m.name || cat?.name || path.basename(m.file, '.gguf'), source: m.source || 'downloaded', file: undefined };
  });
  if (changed) save(out);
  return out;
}
function list() {
  return upgradeOld(store.readJSON(REG(), [])).filter((m) => { const files = Object.values(m.files || {}); return files.length && files.every((f) => fs.existsSync(f)); });
}
function get(id) { return list().find((m) => m.id === id); }
function save(entries) { store.writeJSON(REG(), entries); }
function add(entry) {
  const all = store.readJSON(REG(), []).filter((m) => m.id !== entry.id);
  all.push({ added: Date.now(), ...entry });
  save(all);
  return entry;
}
function remove(id) {
  const all = store.readJSON(REG(), []);
  const m = all.find((x) => x.id === id);
  if (!m) return false;
  const root = store.dir('models');
  if (m.source === 'bundled') store.saveConfig({ starterRemoved: [...removedStarters(), m.id] });
  if (m.source === 'imported' && m.from && m.files?.model) {
    const ignored = new Set(store.config().foundIgnored || []);
    ignored.add(path.resolve(m.files.model).toLowerCase());
    store.saveConfig({ foundIgnored: [...ignored] });
  }
  if (m.source !== 'imported' && m.source !== 'bundled') {
    for (const f of Object.values(m.files || {})) {
      // Only delete files we downloaded, and only if no other installed model shares them.
      const shared = all.some((o) => o.id !== id && Object.values(o.files || {}).includes(f));
      if (!shared && f.startsWith(root)) { try { fs.unlinkSync(f); } catch {} }
    }
  }
  save(all.filter((x) => x.id !== id));
  return true;
}

// ---------- downloads ----------

const jobs = new Map(); // id -> { id, name, total, downloaded, controller, files }

function localPath(repo, file) {
  return path.join(store.dir('models'), repo.replace(/[\\/]/g, '__'), file);
}

async function fetchFile(repo, file, dest, onBytes, signal, expected = 0) {
  const part = `${dest}.part`;
  if (fs.existsSync(dest)) {
    const have = fs.statSync(dest).size;
    if (!expected || have === expected) { onBytes(have); return dest; }
    // A finished file of the wrong size was cut off earlier: resume it (or start over if too big).
    if (have < expected) fs.renameSync(dest, part); else fs.unlinkSync(dest);
  }
  fs.mkdirSync(path.dirname(dest), { recursive: true });
  if (expected && fs.existsSync(part) && fs.statSync(part).size > expected) fs.unlinkSync(part);
  const have = fs.existsSync(part) ? fs.statSync(part).size : 0;
  const url = `${HF}/${repo}/resolve/main/${file.split('/').map(encodeURIComponent).join('/')}?download=true`;
  const res = await fetch(url, { headers: { ...hfHeaders(), ...(have ? { Range: `bytes=${have}-` } : {}) }, signal, redirect: 'follow' });
  if (res.status === 401 || res.status === 403) throw new Error('This model needs you to accept its license on huggingface.co first, then add a Hugging Face token in Settings → Accounts.');
  if (!res.ok && res.status !== 206) throw new Error(`Download failed (HTTP ${res.status}).`);
  const resume = res.status === 206 && have > 0;
  const out = fs.createWriteStream(part, { flags: resume ? 'a' : 'w' });
  let done = resume ? have : 0;
  onBytes(done);
  try {
    for await (const chunk of res.body) {
      done += chunk.length;
      if (!out.write(chunk)) await new Promise((r) => out.once('drain', r));
      onBytes(done);
    }
  } finally {
    await new Promise((r) => out.end(r));
  }
  // The connection can close early without an error: check the size before calling it done.
  const want = expected || (Number(res.headers.get('content-length')) || 0) + (resume ? have : 0);
  if (want && done < want) throw new Error(`the connection dropped at ${(done / 1024 ** 3).toFixed(2)} of ${(want / 1024 ** 3).toFixed(2)} GB. Start it again to resume where it stopped`);
  fs.renameSync(part, dest);
  return dest;
}

// plan = { id, name, kind, catalogId?, repo?, items: [{ role, repo, path, size }], vision? }
function start(plan, emit) {
  if (jobs.has(plan.id)) return jobs.get(plan.id).public;
  const controller = new AbortController();
  const total = plan.items.reduce((t, i) => t + (i.size || 0), 0);
  const pub = { id: plan.id, name: plan.name, kind: plan.kind, total, downloaded: 0 };
  const job = { public: pub, controller };
  jobs.set(plan.id, job);
  const doneBytes = new Map();
  let lastEmit = 0;
  emit('models:progress', pub);
  (async () => {
    const files = {};
    for (const item of plan.items) {
      const dest = localPath(item.repo, item.path);
      // The role key "model" is the file the engine loads first (for split files: part 1).
      await fetchFile(item.repo, item.path, dest, (b) => {
        doneBytes.set(item.path, b);
        pub.downloaded = [...doneBytes.values()].reduce((a, c) => a + c, 0);
        if (Date.now() - lastEmit > 250) { lastEmit = Date.now(); emit('models:progress', pub); }
      }, controller.signal, item.size || 0);
      if (item.role && !files[item.role]) files[item.role] = dest;
    }
    const size = plan.items.reduce((t, i) => t + (fs.existsSync(localPath(i.repo, i.path)) ? fs.statSync(localPath(i.repo, i.path)).size : 0), 0);
    const entry = add({ id: plan.id, name: plan.name, kind: plan.kind, catalogId: plan.catalogId, repo: plan.repo, quant: plan.quant, files, size, vision: Boolean(files.mmproj), source: 'huggingface', plan: plan.items.map((i) => ({ path: i.path, repo: i.repo, size: i.size })) });
    jobs.delete(plan.id);
    emit('models:done', { id: plan.id, model: entry });
  })().catch((err) => {
    jobs.delete(plan.id);
    const cancelled = controller.signal.aborted;
    emit('models:error', { id: plan.id, cancelled, message: cancelled ? 'Download paused. Start it again to resume.' : `Download failed: ${err.message}` });
  });
  return pub;
}

function cancel(id) { jobs.get(id)?.controller.abort(); }
function active() { return [...jobs.values()].map((j) => j.public); }

// Builds a download plan for a catalog model (text, image or video).
async function planCatalog(catalogId) {
  const t = catalog.TEXT_MODELS.find((m) => m.id === catalogId);
  if (t) {
    let last;
    for (const repo of [t.repo, ...(t.alt || [])]) {
      try { return await planGguf(repo, { id: t.id, name: t.name, quant: t.quant, catalogId: t.id, vision: t.vision }); } catch (err) { last = err; }
    }
    throw last;
  }
  const m = catalog.MEDIA_MODELS.find((x) => x.id === catalogId);
  if (!m) throw new Error('Unknown model.');
  const items = [];
  for (const [role, spec] of Object.entries(m.files)) {
    const files = await tree(spec.repo);
    const re = new RegExp(spec.match, 'i');
    const hit = files.find((f) => re.test(f.path)) || files.find((f) => re.test(path.basename(f.path)));
    if (!hit) throw new Error(`Could not find the ${role} file for ${m.name} on Hugging Face.`);
    items.push({ role, repo: spec.repo, path: hit.path, size: hit.size });
  }
  return { id: m.id, name: m.name, kind: m.kind, catalogId: m.id, items };
}

// Plan for any GGUF repo on Hugging Face (catalog or search result).
async function planGguf(repo, { id, name, quant, catalogId, vision } = {}) {
  const { options, mmproj } = await ggufOptions(repo);
  if (!options.length) throw new Error('No GGUF model files in that repository.');
  const pick = (quant && options.find((o) => o.quant.replace(/^UD-/, '') === quant.toUpperCase())) || options[0];
  const items = pick.files.map((f, i) => ({ role: i === 0 ? 'model' : null, repo, path: f.path, size: f.size }));
  if (mmproj && (vision !== false)) items.push({ role: 'mmproj', repo, path: mmproj.path, size: mmproj.size });
  const shortName = name || repo.split('/')[1].replace(/-GGUF$/i, '').replace(/[-_]/g, ' ');
  return { id: id || `hf-${repo.replace(/[^a-z0-9]+/gi, '-').toLowerCase()}-${pick.quant.toLowerCase()}`, name: name || `${shortName} ${pick.quant}`, kind: 'text', catalogId, repo, quant: pick.quant, items };
}

// Repair a downloaded model: compare every file with Hugging Face and download again whatever is
// missing or the wrong size (resuming where possible). Imported files are not ours to repair.
async function repair(id, emit) {
  const m = get(id) || store.readJSON(REG(), []).find((x) => x.id === id);
  if (!m) throw new Error('That model is not installed.');
  if (m.source === 'imported') throw new Error('This model came from another app or folder, so Quicksilver can\'t re-download it. Remove it, then download it from Models.');
  if (m.source === 'bundled') throw new Error('This model came with Quicksilver. If it stopped working, reinstall Quicksilver.');
  const plan = m.repo ? await planGguf(m.repo, { id: m.id, name: m.name, quant: m.quant, catalogId: m.catalogId, vision: m.vision }) : m.catalogId ? await planCatalog(m.catalogId) : null;
  if (!plan) throw new Error('Quicksilver doesn\'t know where this model came from.');
  return start({ ...plan, id: m.id, name: m.name }, emit);
}

// Search all of Hugging Face for GGUF models.
async function search(query, { limit = 30 } = {}) {
  const q = encodeURIComponent(query || '');
  const list = await hfJSON(`${HF}/api/models?search=${q}&filter=gguf&sort=downloads&direction=-1&limit=${limit}`);
  return list.map((m) => ({ repo: m.id || m.modelId, downloads: m.downloads || 0, likes: m.likes || 0, updated: m.lastModified, tags: (m.tags || []).filter((t) => !/^(gguf|region|license|endpoints|base_model|dataset|arxiv)/.test(t)).slice(0, 6), pipeline: m.pipeline_tag }));
}

// ---------- trending on Hugging Face ----------
// The GGUF models people are downloading most right now. Kept for a few hours, then refreshed.
const TREND_TTL = 4 * 3600 * 1000;
function trendType(id, tags = [], pipeline = '') {
  const t = `${id} ${tags.join(' ')}`.toLowerCase();
  if (/uncensor|abliterat|dolphin|hermes|lexi|rocinante|nsfw|roleplay|rp-|unfiltered/.test(t)) return 'open';
  if (/vl\b|-vl-|vision|llava|minicpm-v|image-text-to-text|pixtral|smolvlm/.test(t) || pipeline === 'image-text-to-text') return 'vision';
  if (/coder|code|devstral|starcoder|codestral/.test(t)) return 'coding';
  if (/thinking|reason|r1\b|-r1-|qwq|magistral|o1|deepseek-r1/.test(t)) return 'reasoning';
  return 'general';
}
function paramsOf(id) {
  const moe = id.match(/(\d+(?:\.\d+)?)b[-_]a(\d+(?:\.\d+)?)b/i);
  const m = id.match(/(\d+(?:\.\d+)?)\s*b(?![a-z])/i) || id.match(/[-_](\d+(?:\.\d+)?)b[-_]/i);
  return { params: m ? Number(m[1]) : null, active: moe ? Number(moe[2]) : null };
}
async function trending({ force = false, hw = null } = {}) {
  const cache = store.config().trendingCache;
  let list = cache?.list;
  if (force || !list || Date.now() - (cache.at || 0) > TREND_TTL) {
    const raw = await hfJSON(`${HF}/api/models?filter=gguf&sort=trendingScore&direction=-1&limit=60`);
    list = raw.map((m) => ({ repo: m.id || m.modelId, downloads: m.downloads || 0, likes: m.likes || 0, trending: m.trendingScore || 0, created: m.createdAt, tags: (m.tags || []).filter((t) => !/^(gguf|region|license|endpoints|base_model|dataset|arxiv|autotrain|text-generation-inference|transformers|safetensors)/.test(t)).slice(0, 5), pipeline: m.pipeline_tag || '' }))
      .filter((m) => m.repo && !/lora|embed|rerank|whisper|tts|-mlx|onnx/i.test(m.repo));
    store.saveConfig({ trendingCache: { at: Date.now(), list } });
  }
  const at = store.config().trendingCache?.at || Date.now();
  return { at, list: list.map((m) => {
    const known = catalog.matchCatalog(m.repo.split('/').pop());
    const { params, active } = paramsOf(m.repo);
    // About 0.6 GB per billion parameters at the usual Q4_K_M size.
    const sizeGB = known?.sizeGB || (params ? Math.round(params * 0.6 * 10) / 10 : null);
    const est = hw && sizeGB ? catalog.estimateText({ ...(known || {}), sizeGB, activeGB: known?.activeGB || (active ? active * 0.6 : undefined), ctx: known?.ctx || 8192 }, hw, 1) : null;
    return { ...m, type: known?.category && known.category !== 'small' && known.category !== 'large' ? known.category : trendType(m.repo, m.tags, m.pipeline), sizeGB, params, catalogId: known?.id || null, est: est && { rating: est.rating, label: est.label, fit: est.fit, wordsPerSec: est.wordsPerSec } };
  }) };
}

async function importFile(file, readGguf) {
  const info = await readGguf(file);
  if (info.isProjector) throw new Error('That file is a vision add-on (mmproj), not a model. Import the main model file.');
  // Look for a matching vision projector in the same folder.
  const dir = path.dirname(file);
  const proj = fs.readdirSync(dir).find((n) => /mmproj.*\.gguf$/i.test(n));
  const files = { model: file, ...(proj ? { mmproj: path.join(dir, proj) } : {}) };
  return add({ id: `imp-${Date.now().toString(36)}`, ...recognise(info.name || niceName(file), file), kind: 'text', files, size: info.size, vision: Boolean(proj), source: 'imported' });
}


// ---------- the models that come with Quicksilver ----------
// dir holds STARTER.json plus the files (see scripts/fetch-starter.js):
//   { models: [{ id, catalogId, name, files: { model, mmproj? }, pack? }] }
// The small model is inside the installer; "pack" models are too big for it, so they ship next to
// the installer (the installer copies them into dir) or are downloaded on first run.
// Each is registered once; one you remove stays removed.
const removedStarters = () => { const r = store.config().starterRemoved; return new Set(r === true ? ['starter'] : Array.isArray(r) ? r : []); };

function registerStarter(dir) {
  const metaFile = dir && path.join(dir, 'STARTER.json');
  const out = { added: [], missing: [] };
  if (!metaFile || !fs.existsSync(metaFile)) return out;
  const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
  const entries = meta.models || [{ id: 'starter', catalogId: meta.catalogId, name: meta.name, files: meta.files }]; // 2.3 format
  const removed = removedStarters();
  const reg = store.readJSON(REG(), []);
  for (const e of entries) {
    if (removed.has(e.id)) continue;
    const files = Object.fromEntries(Object.entries(e.files).map(([role, f]) => [role, path.join(dir, f)]));
    if (!Object.values(files).every((f) => fs.existsSync(f))) {
      // Not shipped with this copy: fetch it from the catalog, unless you already have it.
      if (e.pack && !reg.some((m) => m.catalogId === e.catalogId && Object.values(m.files || {}).every((f) => fs.existsSync(f)))) out.missing.push({ catalogId: e.catalogId, name: e.name, ...(e.repo ? { repo: e.repo, quant: e.quant } : {}) });
      continue;
    }
    const known = reg.find((m) => m.id === e.id);
    if (known && known.files?.model === files.model) continue;
    const size = Object.values(files).reduce((t, f) => t + fs.statSync(f).size, 0);
    const entry = add({ id: e.id, name: e.name, kind: 'text', catalogId: e.catalogId, files, size, vision: Boolean(files.mmproj), source: 'bundled' });
    if (!known) out.added.push(entry);
  }
  return out;
}

// Before an update replaces the app's folder: the big "pack" models that were copied in next to
// the app are moved to the data folder, so the new version keeps them instead of downloading
// them again. (The small model comes inside every installer.)
function keepPackModels(dir) {
  const metaFile = dir && path.join(dir, 'STARTER.json');
  if (!metaFile || !fs.existsSync(metaFile)) return 0;
  const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
  const keep = store.dir('models', 'kept');
  const all = store.readJSON(REG(), []);
  let moved = 0;
  for (const e of meta.models || []) {
    if (!e.pack) continue;
    for (const f of Object.values(e.files)) {
      const from = path.join(dir, f);
      const to = path.join(keep, path.basename(f));
      if (!fs.existsSync(from)) continue;
      try { fs.renameSync(from, to); } catch { fs.copyFileSync(from, to); fs.rmSync(from, { force: true }); }
      for (const m of all) for (const [role, p] of Object.entries(m.files || {})) if (path.resolve(p) === path.resolve(from)) m.files[role] = to;
      moved++;
    }
  }
  if (moved) save(all);
  return moved;
}

// ---------- models already on this PC (other apps, Downloads) ----------
// Finds GGUF models that LM Studio, Jan, Ollama or GPT4All already downloaded (or that are in
// Downloads), so they can be used where they are: no second download, nothing copied.

function scanRoots() {
  if (process.env.QS_SCAN_DIRS) {
    const appOf = (d) => (/ollama/i.test(d) ? 'Ollama' : /lm-?studio/i.test(d) ? 'LM Studio' : /[\\/]jan[\\/]?/i.test(d) ? 'Jan' : /gpt4all/i.test(d) ? 'GPT4All' : 'Other apps');
    return process.env.QS_SCAN_DIRS.split(path.delimiter).filter(Boolean).map((d) => ({ app: appOf(d), dir: d, ollama: /ollama/i.test(d) }));
  }
  const home = os.homedir();
  const appData = process.env.APPDATA || path.join(home, 'AppData', 'Roaming');
  const local = process.env.LOCALAPPDATA || path.join(home, 'AppData', 'Local');
  const roots = [
    { app: 'LM Studio', dir: path.join(home, '.lmstudio', 'models') },
    { app: 'LM Studio', dir: path.join(home, '.cache', 'lm-studio', 'models') },
    { app: 'Jan', dir: path.join(appData, 'Jan', 'data', 'llamacpp', 'models') },
    { app: 'Jan', dir: path.join(appData, 'Jan', 'data', 'models') },
    { app: 'Jan', dir: path.join(home, 'jan', 'models') },
    { app: 'GPT4All', dir: path.join(local, 'nomic.ai', 'GPT4All') },
    { app: 'Ollama', dir: process.env.OLLAMA_MODELS || path.join(home, '.ollama', 'models'), ollama: true },
    { app: 'Downloads', dir: path.join(home, 'Downloads'), depth: 2 },
  ];
  // LM Studio lets you move its models folder.
  try {
    const cfg = JSON.parse(fs.readFileSync(path.join(home, '.lmstudio', 'settings.json'), 'utf8'));
    if (typeof cfg.downloadsFolder === 'string') roots.unshift({ app: 'LM Studio', dir: cfg.downloadsFolder });
  } catch {}
  return roots;
}

function walk(dir, depth, out, budget = { n: 4000 }) {
  if (depth < 0 || budget.n <= 0) return out;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (--budget.n <= 0) break;
    const p = path.join(dir, e.name);
    if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules') walk(p, depth - 1, out, budget);
    else if (e.isFile() && /\.gguf$/i.test(e.name)) out.push(p);
  }
  return out;
}

const niceName = (file) => path.basename(file).replace(/\.gguf$/i, '').replace(/-0*1-of-\d+$/i, '')
  .replace(/[-_.](?:UD-)?(?:I?Q\d(?:_[A-Z0-9]+)*|F16|BF16|F32|MXFP4)$/i, '').replace(/[-_]+/g, ' ').trim();

// A recognised model gets its proper name, and counts as installed for the catalog (no re-download).
function recognise(name, file) {
  const c = catalog.matchCatalog(`${name} ${path.basename(file)}`);
  return c ? { name: c.name, catalogId: c.id } : { name };
}

function scanOllama(root) {
  const found = [];
  const manifests = path.join(root, 'manifests');
  const files = [];
  (function w(d, depth) {
    if (depth < 0) return;
    let entries; try { entries = fs.readdirSync(d, { withFileTypes: true }); } catch { return; }
    for (const e of entries) { const p = path.join(d, e.name); if (e.isDirectory()) w(p, depth - 1); else files.push(p); }
  })(manifests, 5);
  for (const f of files) {
    try {
      const man = JSON.parse(fs.readFileSync(f, 'utf8'));
      const layer = (type) => man.layers?.find((l) => l.mediaType === `application/vnd.ollama.image.${type}`);
      const model = layer('model');
      if (!model) continue;
      const blob = (l) => path.join(root, 'blobs', l.digest.replace(':', '-'));
      if (!fs.existsSync(blob(model))) continue;
      const parts = path.relative(manifests, f).split(path.sep);
      const tag = parts.pop(); const name = parts.pop(); const ns = parts.pop();
      const proj = layer('projector');
      found.push({ path: blob(model), name: `${ns && ns !== 'library' ? `${ns}/` : ''}${name}:${tag}`, size: model.size || fs.statSync(blob(model)).size, app: 'Ollama', mmproj: proj && fs.existsSync(blob(proj)) ? blob(proj) : null });
    } catch {}
  }
  return found;
}

function findOnPC() {
  const have = new Set([...list().flatMap((m) => Object.values(m.files || {})).map((f) => path.resolve(f).toLowerCase()), ...(store.config().foundIgnored || [])]);
  const own = path.resolve(store.dir('models')).toLowerCase();
  const seen = new Set();
  const out = [];
  for (const r of scanRoots()) {
    if (!fs.existsSync(r.dir)) continue;
    const hits = r.ollama ? scanOllama(r.dir) : walk(r.dir, r.depth ?? 6, []).flatMap((file) => {
      const base = path.basename(file);
      if (/mmproj/i.test(base)) return []; // vision add-on, paired below
      if (/-0*(\d+)-of-\d+\.gguf$/i.test(base) && !/-0*1-of-\d+\.gguf$/i.test(base)) return []; // later parts of a split model
      let size = 0; try { size = fs.statSync(file).size; } catch { return []; }
      if (size < 50e6) return [];
      // Pair a vision add-on that sits in the same model folder (not in a shared folder like Downloads).
      let mmproj = null;
      if (r.app !== 'Downloads') { try { const n = fs.readdirSync(path.dirname(file)).find((x) => /mmproj.*\.gguf$/i.test(x)); if (n) mmproj = path.join(path.dirname(file), n); } catch {} }
      return [{ path: file, name: niceName(file), size, app: r.app, mmproj }];
    });
    for (const h of hits) {
      const key = path.resolve(h.path).toLowerCase();
      if (have.has(key) || seen.has(key) || key.startsWith(own)) continue;
      seen.add(key);
      out.push({ ...h, vision: Boolean(h.mmproj) });
    }
  }
  return out.sort((a, b) => a.app.localeCompare(b.app) || a.name.localeCompare(b.name));
}

// Adds found models where they are. Their files are never deleted by Quicksilver.
async function addFound(items, readGguf) {
  const added = [];
  for (const it of items || []) {
    if (!it?.path || !fs.existsSync(it.path)) continue;
    let info = null;
    try { info = await readGguf(it.path); } catch { continue; } // not a usable GGUF
    if (info.isProjector) continue;
    const id = `imp-${crypto.createHash('sha1').update(path.resolve(it.path).toLowerCase()).digest('hex').slice(0, 10)}`;
    const name = it.app === 'Ollama' ? it.name : (info.name && info.name.length > 3 && !/^(model|models)$/i.test(info.name) ? info.name : it.name);
    const files = { model: it.path, ...(it.mmproj && fs.existsSync(it.mmproj) ? { mmproj: it.mmproj } : {}) };
    added.push(add({ id, ...recognise(name, it.path), kind: 'text', files, size: info.size || it.size, vision: Boolean(files.mmproj), source: 'imported', from: it.app }));
  }
  return added;
}

module.exports = { keepPackModels, list, get, add, remove, start, cancel, active, planCatalog, planGguf, ggufOptions, search, trending, trendType, paramsOf, importFile, tree, findOnPC, addFound, repair, registerStarter };
