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
  const before = store.readJSON(REG(), []);
  const prev = before.find((m) => m.id === entry.id);
  const all = before.filter((m) => m.id !== entry.id);
  // Registering a model again (an update, a repair) keeps your "in use" tick.
  const next = { added: Date.now(), ...entry };
  if (typeof next.use !== 'boolean') { delete next.use; if (typeof prev?.use === 'boolean') next.use = prev.use; }
  all.push(next);
  save(all);
  return entry;
}

// May this installed chat model be part of the Liquid Edition? Only abliterated builds: models
// whose refusal direction was removed from the weights (abliteration; "heretic" is the automated
// tool for it), not merely fine-tuned to be uncensored. The models that came with Quicksilver are
// abliterated; otherwise its name, file name, repository or catalog entry must say so.
// (Never the folder: a Windows user called Alexis has "lexi" in every path.)
const ABLITERATED_NAME = /abliterat|heretic/i;
function looksUncensored(m) {
  if (!m) return false;
  const c = catalog.TEXT_MODELS.find((x) => x.id === m.catalogId);
  return m.source === 'bundled' || ABLITERATED_NAME.test(`${m.name || ''} ${path.basename(m.files?.model || '')} ${m.repo || ''} ${c?.repo || ''} ${(c?.alt || []).join(' ')}`);
}
// Is this copy one of the Liquid Edition's own models: the ones that came with it, or the same
// models downloaded by its setup screen? A copy found in another app only counts once you tick it,
// and a chat model must be the uncensored build (the plain catalog build of the same model is not).
function liquidOwn(m) {
  if (!m) return false;
  if (m.source === 'bundled') return true;
  if (!catalog.liquidMember(m.catalogId)) return false;
  if (m.source === 'imported' && !inUse(m)) return false;
  return (m.kind || 'text') !== 'text' || looksUncensored(m);
}

// ---------- models in use ----------
// A chat uses the model you chose for it, or the members of its stack or fusion: nothing else on
// this PC joins in by itself. The exception is a model you ticked under Models → "Models in use":
// those may also be picked by Automatic, double-check an answer, sit on the Council and (when
// uncensored) help the Liquid Edition. Until you choose, only the suggested Liquid add-ons you
// downloaded in Quicksilver are ticked; models found in other apps never are.
function inUse(m) {
  if (!m || (m.kind || 'text') !== 'text') return false;
  if (typeof m.use === 'boolean') return m.use;
  return m.source !== 'imported' && m.source !== 'bundled' && catalog.LIQUID_ADDONS.some((a) => a.id === m.catalogId);
}
function setUse(id, on) {
  const all = store.readJSON(REG(), []);
  const m = all.find((x) => x.id === id);
  if (!m) return false;
  m.use = Boolean(on);
  save(all);
  return true;
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

// Two downloads that share a file take turns on it (Wan 2.2 and its Turbo share a decoder and a
// text encoder; many picture models share one decoder): the second finds it finished, instead of
// both writing the same file at once and corrupting it.
const fetching = new Map(); // dest -> the download in progress
async function fetchFile(repo, file, dest, onBytes, signal, expected = 0) {
  const prev = fetching.get(dest);
  const run = (prev ? prev.catch(() => {}) : Promise.resolve()).then(() => fetchFileNow(repo, file, dest, onBytes, signal, expected));
  fetching.set(dest, run);
  try { return await run; } finally { if (fetching.get(dest) === run) fetching.delete(dest); }
}
async function fetchFileNow(repo, file, dest, onBytes, signal, expected = 0) {
  const io = require('./engines');
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
  // A finished part that was never renamed (something held the file for a moment): it is done.
  if (expected && have === expected) { fs.renameSync(part, dest); onBytes(have); return dest; }
  const url = `${HF}/${repo}/resolve/main/${file.split('/').map(encodeURIComponent).join('/')}?download=true`;
  const auth = hfHeaders();
  const g = io.stallGuard(signal);
  const res = await io.httpGet(url, { headers: { ...auth, ...(have ? { Range: `bytes=${have}-` } : {}) }, signal: g.signal }).catch((e) => { g.done(); throw g.stalled() ? new Error('the connection stalled. Start it again to resume where it stopped') : e; });
  const giveUp = (msg) => { g.done(); res.cancel(); return new Error(msg); };
  if (res.status === 401 || res.status === 403) throw giveUp('This model needs you to accept its license on huggingface.co first, then add a Hugging Face token in Settings → Accounts.');
  // The saved part no longer matches what the server has: clear it, so the next try starts clean.
  if (res.status === 416) { try { fs.unlinkSync(part); } catch {} throw giveUp('the saved part of this download was out of date and has been cleared. Start it again'); }
  if (!res.ok && res.status !== 206) throw giveUp(`Download failed (HTTP ${res.status}).`);
  const resume = res.status === 206 && have > 0;
  const out = io.openForWrite(part, resume ? 'a' : 'w');
  let done = resume ? have : 0;
  onBytes(done);
  try {
    for await (const chunk of res.body) {
      g.poke();
      done += chunk.length;
      await io.writeChunk(out, chunk);
      onBytes(done);
    }
    if (out.writeError) throw out.writeError;
  } catch (err) {
    if (g.stalled()) throw new Error('the connection stalled (no data for 90 seconds). Start it again to resume where it stopped');
    if (out.writeError || err?.code === 'ENOSPC') throw io.diskError(out.writeError || err);
    throw err;
  } finally {
    g.done();
    await io.closeWrite(out);
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
  for (const [e, kind] of [[require('./embed').EMBED, 'embed'], [require('./rerank').RERANK, 'rerank']]) {
    if (catalogId !== e.id) continue;
    let last;
    for (const repo of [e.repo, ...e.alt]) {
      try { return { ...(await planGguf(repo, { id: e.id, name: e.name, quant: e.quant, catalogId: e.id, vision: false })), kind }; } catch (err) { last = err; }
    }
    throw last;
  }
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
    const re = new RegExp(spec.match, 'i');
    let found = null;
    // Community models are often re-uploaded: try each known copy in turn.
    for (const repo of [spec.repo, ...(spec.alt || [])]) {
      let files;
      try { files = await tree(repo); } catch { continue; }
      const hit = files.find((f) => re.test(f.path)) || files.find((f) => re.test(path.basename(f.path)));
      if (hit) { found = { repo, hit }; break; }
    }
    if (!found) throw new Error(`Could not find the ${role} file for ${m.name} on Hugging Face.`);
    items.push({ role, repo: found.repo, path: found.hit.path, size: found.hit.size });
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
const TREND_KINDS = { pictures: 'text-to-image', editing: 'image-to-image', video: 'text-to-video', animate: 'image-to-video', voice: 'text-to-speech', listening: 'automatic-speech-recognition', music: 'text-to-audio', search: 'sentence-similarity' };
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
  // Everything else that is trending on Hugging Face, by what it makes: pictures, video, voice,
  // music and search. Shown so you can see what is new; Quicksilver runs chat models straight
  // from Hugging Face, and the other kinds once they are in its catalog (each needs its own
  // set of files and is tried on the real engine first).
  let more = store.config().trendingMore;
  if (force || !more || Date.now() - (more.at || 0) > TREND_TTL) {
    const groups = {};
    for (const [key, tag] of Object.entries(TREND_KINDS)) {
      try {
        const raw = await hfJSON(`${HF}/api/models?pipeline_tag=${tag}&sort=trendingScore&direction=-1&limit=10`);
        groups[key] = raw.map((m) => ({ repo: m.id || m.modelId, likes: m.likes || 0, downloads: m.downloads || 0, created: m.createdAt, license: ((m.tags || []).find((t) => /^license:/.test(t)) || '').replace('license:', '') })).filter((m) => m.repo);
      } catch { groups[key] = more?.groups?.[key] || []; }
    }
    more = { at: Date.now(), groups };
    store.saveConfig({ trendingMore: more });
  }
  // Which catalog model a trending one is, so the page can say whether it runs on this PC.
  const ours = new Map(catalog.MEDIA_MODELS.flatMap((c) => Object.values(c.files || {}).map((f) => [String(f.repo || '').toLowerCase(), c.id])));
  const others = Object.fromEntries(Object.entries(more.groups).map(([k, l]) => [k, l.map((m) => ({ ...m, inCatalog: ours.has(m.repo.toLowerCase()), catalogId: ours.get(m.repo.toLowerCase()) || null }))]));
  const at = store.config().trendingCache?.at || Date.now();
  return { at, list: list.map((m) => {
    const known = catalog.matchCatalog(m.repo.split('/').pop());
    const { params, active } = paramsOf(m.repo);
    // About 0.6 GB per billion parameters at the usual Q4_K_M size.
    const sizeGB = known?.sizeGB || (params ? Math.round(params * 0.6 * 10) / 10 : null);
    const est = hw && sizeGB ? catalog.estimateText({ ...(known || {}), sizeGB, activeGB: known?.activeGB || (active ? active * 0.6 : undefined), ctx: known?.ctx || 8192 }, hw, 1) : null;
    return { ...m, type: known?.category && known.category !== 'small' && known.category !== 'large' ? known.category : trendType(m.repo, m.tags, m.pipeline), sizeGB, params, catalogId: known?.id || null, est: est && { rating: est.rating, label: est.label, fit: est.fit, wordsPerSec: est.wordsPerSec } };
  }), others };
}

async function importFile(file, readGguf) {
  const info = await readGguf(file);
  if (info.isProjector) throw new Error('That file is a vision add-on (mmproj), not a model. Import the main model file.');
  // You chose this file yourself, so its own header decides (a chat model merely named after
  // Flux or Whisper is still a chat model); the name is only used when the header says nothing.
  if (info.chat === false || (!info.architecture && !chatFile(file, info))) throw new Error('That file is part of a picture, video, search or speech model, not a chat model, so it can\'t be used for chatting. Picture and video models are added under Models → Images & video.');
  // A vision add-on in the same folder is paired when it is the only model there, or its name
  // matches this model's (a shared folder like Downloads may hold another model's add-on).
  const dir = path.dirname(file);
  const names = fs.readdirSync(dir).filter((n) => /\.gguf$/i.test(n));
  const mains = names.filter((n) => !/mmproj/i.test(n) && !(/-0*(\d+)-of-\d+\.gguf$/i.test(n) && !/-0*1-of-\d+\.gguf$/i.test(n)));
  const stem = (n) => n.toLowerCase().replace(/\.gguf$/, '').replace(/^mmproj[-_.]?/, '').replace(/[-_.](mmproj|q\d\w*|f16|bf16|fp16|iq\d\w*|ud).*$/, '');
  const proj = names.filter((n) => /mmproj/i.test(n)).find((n) => mains.length <= 1 || (stem(n).length >= 4 && stem(path.basename(file)).startsWith(stem(n).slice(0, Math.max(4, Math.min(stem(n).length, 12))))));
  const files = { model: file, ...(proj ? { mmproj: path.join(dir, proj) } : {}) };
  return add({ id: `imp-${Date.now().toString(36)}`, ...recognize(info.name || niceName(file), file), kind: 'text', files, size: info.size, vision: Boolean(proj), source: 'imported' });
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
  // A big model the installer copied in is moved to the data folder (models/kept) at start-up,
  // so each file is looked for in the app's folder first and there second. That also finds
  // files that were moved when the list of models could not be saved afterwards.
  const at = (f) => { const a = path.join(dir, f); if (fs.existsSync(a)) return a; return keepDirs(dir).map((d) => path.join(d, path.basename(f))).find((b) => fs.existsSync(b)) || a; };
  const here = (m) => Object.values(m.files || {}).every((f) => fs.existsSync(f));
  for (const e of entries) {
    if (removed.has(e.id)) continue;
    const files = Object.fromEntries(Object.entries(e.files).map(([role, f]) => [role, at(f)]));
    // You already have it when a copy that is the Liquid Edition's own is installed: for a chat
    // model that means the uncensored build, and not an unticked file from another app (the
    // Liquid Edition would not use either, so the setup screen must still fetch the real one).
    const have = reg.some((m) => m.catalogId === e.catalogId && here(m) && (e.kind || e.media ? m.source !== 'imported' : liquidOwn(m)));
    if (!Object.values(files).every((f) => fs.existsSync(f))) {
      // Search models (embed, rerank) come from their own catalog entry, so they keep their kind.
      // A chat model is fetched from the same uncensored copy the installer uses, with the
      // other uncensored copies as fallbacks: never the plain catalog build.
      const src = e.repo && !e.kind ? { repo: e.repo, quant: e.quant, ...(e.alt?.length ? { alt: e.alt } : {}) } : {};
      // Everything in the Liquid Edition's pack is fetched on first run when the folder is missing,
      // the Closer and the picture and video makers (media) included.
      if (e.pack && (!e.optional || e.media || e.ifFits) && !have) out.missing.push({ catalogId: e.catalogId, name: e.name, kind: e.kind || 'text', ...(e.media ? { media: true } : {}), ...src });
      continue;
    }
    const known = reg.find((m) => m.id === e.id);
    const size = Object.values(files).reduce((t, f) => t + fs.statSync(f).size, 0);
    if (known && known.files?.model === files.model && known.name === e.name && known.size === size) continue;
    // A model the setup screen (or you) already downloaded isn't registered a second time when
    // the installer later brings its own copy.
    if (!known && e.pack && have) continue;
    const entry = add({ id: e.id, name: e.name, kind: e.kind || 'text', catalogId: e.catalogId, files, size, vision: e.kind ? false : Boolean(files.mmproj), source: 'bundled' });
    if (!known) out.added.push(entry);
  }
  return out;
}

// Where the big models are kept, in order of preference:
//   1. the data folder (models/kept). In a default install that is the same drive as the app, so
//      the move is instant and takes no space.
//   2. a folder beside the app's own folder, on the drive it was installed to ("Quicksilver kept
//      models"). An install on another drive (D:, because C: is small) keeps its models there:
//      still an instant move, and outside the folder an update or reinstall replaces.
function keepDirs(dir) {
  const out = [path.join(store.userDir(), 'models', 'kept')];
  const res = path.dirname(path.resolve(dir || '.'));
  const appDir = path.dirname(res);
  if (dir && path.basename(res).toLowerCase() === 'resources' && path.dirname(appDir) !== appDir) out.push(path.join(path.dirname(appDir), KEPT_BESIDE));
  return out;
}
const KEPT_BESIDE = 'Quicksilver kept models';
// Pack files still inside the app's folder that an installed model uses: what an update would
// take with it if it ran now.
function packLeft(dir) {
  const metaFile = dir && path.join(dir, 'STARTER.json');
  if (!metaFile || !fs.existsSync(metaFile)) return { files: [], bytes: 0 };
  const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
  const reg = store.readJSON(REG(), []);
  const files = [...new Set((meta.models || []).filter((e) => e.pack).flatMap((e) => Object.values(e.files)).map((f) => path.join(dir, f)))]
    .filter((f) => fs.existsSync(f) && reg.some((m) => Object.values(m.files || {}).some((p) => path.resolve(p) === path.resolve(f))));
  return { files, bytes: files.reduce((t, f) => t + fs.statSync(f).size, 0) };
}

// The big "pack" models the installer copied in next to the app are moved to the data folder, so a
// newer version keeps them instead of downloading them again: installing over the old copy (an
// update from inside Quicksilver, or a newer setup file run by hand) replaces the app's folder and
// everything in it. (The small model comes inside every installer.)
// At start-up this runs with renameOnly: a move on the same drive takes no time and no space
// (see keepDirs for where they go; never a slow 30 GB copy behind your back). Before an in-app
// update it runs in full: if no move is possible it copies to the data folder, but only when
// that drive has room (the updater refuses to go on while models are still in the app's folder).
async function keepPackModels(dir, { renameOnly = false, builtIn = false } = {}) {
  const metaFile = dir && path.join(dir, 'STARTER.json');
  if (!metaFile || !fs.existsSync(metaFile)) return 0;
  const meta = JSON.parse(fs.readFileSync(metaFile, 'utf8'));
  const dirs = keepDirs(dir);
  const freeIn = (d) => { try { const st = fs.statfsSync(d); return st.bavail * st.bsize; } catch { return Infinity; } };
  let moved = 0;
  for (const e of meta.models || []) {
    if (!e.pack && !builtIn) continue; // builtIn: the small model inside the installer too (app-only updates)
    for (const f of Object.values(e.files)) {
      const from = path.join(dir, f);
      let to = path.join(dirs[0], path.basename(f));
      if (!fs.existsSync(from)) continue;
      // Only files an installed model uses are moved: a second copy of something you already
      // downloaded stays in the app's folder (and goes when the app's folder is replaced).
      const uses = (m) => Object.values(m.files || {}).some((p) => path.resolve(p) === path.resolve(from));
      if (!store.readJSON(REG(), []).some(uses)) continue;
      // Each file on its own: one that can't be moved (still in use, or no room on the data
      // drive) must not lose track of the ones that were. The list of models is saved after
      // every file, so a move is never left unrecorded (and registerStarter looks in the data
      // folder as well, should that ever happen).
      try {
        // An instant move, to the first of the keep folders that takes it.
        let done = false;
        for (const d of dirs) {
          try { fs.mkdirSync(d, { recursive: true }); fs.renameSync(from, path.join(d, path.basename(f))); to = path.join(d, path.basename(f)); done = true; break; } catch { /* another drive, or no permission: try the next */ }
        }
        if (!done) {
          if (renameOnly) throw new Error('not moved');
          // No move possible (the app's folder is on another drive and nothing can be created
          // beside it): copy to the data folder, without freezing the window, if it has room.
          fs.mkdirSync(dirs[0], { recursive: true });
          if (freeIn(dirs[0]) < fs.statSync(from).size + 2 * 1024 ** 3) throw new Error('no room');
          await fs.promises.copyFile(from, to);
          try { fs.rmSync(from, { force: true }); } catch {}
        }
        const all = store.readJSON(REG(), []);
        for (const m of all) for (const [role, p] of Object.entries(m.files || {})) if (path.resolve(p) === path.resolve(from)) m.files[role] = to;
        save(all);
        moved++;
      } catch { if (!renameOnly) { try { fs.rmSync(to, { force: true }); } catch {} } }
    }
  }
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

const OWN_PACK = /^quicksilver (kept )?models$/i;
// File and model names of GGUF files that are not chat models: picture and video models and their
// parts, search models, speech models. (The file's own header is checked as well, see chatFile.)
const NOT_CHAT_NAME = /(^|[^a-z0-9])(umt5|t5[-_. ]?xxl|t5[-_. ]?v1|t5[-_. ]?encoder|clip[-_. ]?[lg]|vae|wan[-_. ]?2|wan[-_. ]?vace|flux[-_. ]?[12]|sdxl|sd[-_. ]?xl|sd[-_. ]?3|sd[-_. ]?v?1[-_. ]5|stable[-_. ]?diffusion|z[-_. ]?image|qwen[-_. ]?image|chroma|ltxv?|ltx[-_. ]?video|hunyuan[-_. ]?video|hidream|lumina[-_. ]?2|embed(ding)?s?|embeddinggemma|rerank(er)?|bge[-_. ]?(m3|small|base|large|multilingual|reranker|en|zh)|e5[-_. ](small|base|large|mistral)|gte[-_. ](small|base|large|qwen|multilingual)|whisper)([^a-z]|$)/i;
function chatFile(file, info, name = '') {
  if (info && info.chat === false) return false;
  return ![path.basename(file || ''), name, info?.name || ''].some((n) => NOT_CHAT_NAME.test(n));
}
// The same file twice (a copy in Downloads, the same download in another app) is one model. Told
// apart by exact size plus the first part of the file, which is quick even for huge files.
function fingerprint(file) {
  try {
    const size = fs.statSync(file).size;
    const fd = fs.openSync(file, 'r');
    try {
      const buf = Buffer.alloc(256 * 1024);
      const n = fs.readSync(fd, buf, 0, buf.length, 0);
      return `${size}:${crypto.createHash('sha1').update(buf.subarray(0, n)).digest('hex')}`;
    } finally { fs.closeSync(fd); }
  } catch { return null; }
}

function walk(dir, depth, out, budget = { n: 4000 }) {
  if (depth < 0 || budget.n <= 0) return out;
  let entries;
  try { entries = fs.readdirSync(dir, { withFileTypes: true }); } catch { return out; }
  for (const e of entries) {
    if (--budget.n <= 0) break;
    const p = path.join(dir, e.name);
    // "Quicksilver models" is the folder that ships next to the installer: its files are already
    // inside Quicksilver, so they are never offered again as models from another app.
    if (e.isDirectory() && !e.name.startsWith('.') && e.name !== 'node_modules' && !OWN_PACK.test(e.name)) walk(p, depth - 1, out, budget);
    else if (e.isFile() && /\.gguf$/i.test(e.name)) out.push(p);
  }
  return out;
}

const niceName = (file) => path.basename(file).replace(/\.gguf$/i, '').replace(/-0*1-of-\d+$/i, '')
  .replace(/[-_.](?:UD-)?(?:I?Q\d(?:_[A-Z0-9]+)*|F16|BF16|F32|MXFP4)$/i, '').replace(/[-_]+/g, ' ').trim();

// A recognized model gets its proper name, and counts as installed for the catalog (no re-download).
function recognize(name, file) {
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
  // Installed files are only read when a size matches (so nothing extra is read otherwise).
  const installed = list().map((m) => m.files?.model).filter(Boolean);
  const sizes = new Set(installed.map((f) => { try { return fs.statSync(f).size; } catch { return -1; } }));
  let prints = null;
  const installedPrints = () => (prints ||= new Set(installed.map(fingerprint).filter(Boolean)));
  const seenPrints = new Set();
  for (const r of scanRoots()) {
    if (!fs.existsSync(r.dir)) continue;
    const hits = r.ollama ? scanOllama(r.dir) : walk(r.dir, r.depth ?? 6, []).flatMap((file) => {
      const base = path.basename(file);
      if (/mmproj/i.test(base)) return []; // vision add-on, paired below
      if (/-0*(\d+)-of-\d+\.gguf$/i.test(base) && !/-0*1-of-\d+\.gguf$/i.test(base)) return []; // later parts of a split model
      let size = 0; try { size = fs.statSync(file).size; } catch { return []; }
      if (size < 50e6) return [];
      if (!chatFile(file)) return []; // a picture, video, search or speech model
      // Pair a vision add-on that sits in the same model folder (not in a shared folder like Downloads).
      let mmproj = null;
      if (r.app !== 'Downloads') { try { const n = fs.readdirSync(path.dirname(file)).find((x) => /mmproj.*\.gguf$/i.test(x)); if (n) mmproj = path.join(path.dirname(file), n); } catch {} }
      return [{ path: file, name: niceName(file), size, app: r.app, mmproj }];
    });
    for (const h of hits) {
      const key = path.resolve(h.path).toLowerCase();
      if (have.has(key) || seen.has(key) || key.startsWith(own)) continue;
      if (!chatFile('', null, h.name)) continue;
      // A copy of a model that is already installed, or of one already in this list.
      const print = fingerprint(h.path);
      if (print && (seenPrints.has(print) || (sizes.has(Number(print.split(':')[0])) && installedPrints().has(print)))) continue;
      seen.add(key);
      if (print) seenPrints.add(print);
      out.push({ ...h, vision: Boolean(h.mmproj) });
    }
  }
  return out.sort((a, b) => a.app.localeCompare(b.app) || a.name.localeCompare(b.name));
}

// What is found, minus files whose own header says they are not chat models (the name doesn't
// always tell). Reads only the start of each file.
async function findChat(readGguf) {
  const out = [];
  for (const h of findOnPC()) {
    try { const info = await readGguf(h.path); if (info.isProjector || !chatFile(h.path, info, h.name)) continue; } catch { continue; }
    out.push(h);
  }
  return out;
}

// One-time clean-up for PCs where an older version added everything it found: files that are not
// chat models (a video model, a text encoder), files from the installer's own models folder, and
// second copies of models Quicksilver already has are taken off the list. No file is deleted, and
// a model one of your own stacks uses stays.
async function tidyImported(readGguf, inUseElsewhere = () => false) {
  const gone = [];
  const mine = list().filter((m) => m.source !== 'imported' && m.files?.model);
  const prints = new Set(mine.map((m) => fingerprint(m.files.model)).filter(Boolean));
  for (const m of list().filter((x) => x.source === 'imported' && x.files?.model)) {
    const file = m.files.model;
    let info = null;
    try { info = await readGguf(file); } catch { continue; } // unreadable: left alone
    let why = null;
    // Not a chat model: the file's own header says so (it could never answer). A file found
    // automatically is also judged by its name; one you imported by hand only by its header.
    if (info.isProjector || info.chat === false || (m.from && !chatFile(file, info, m.name))) why = 'not-chat';
    // The installer's own folder and second copies: only files found automatically, and never
    // one that a stack, a knowledge model, a chat or your default model uses.
    else if (m.from && !inUseElsewhere(m.id)) {
      if (path.dirname(file).split(/[\\/]/).some((part) => OWN_PACK.test(part))) why = 'pack';
      else if (prints.has(fingerprint(file))) why = 'copy';
    }
    if (!why) continue;
    const ignored = new Set(store.config().foundIgnored || []);
    ignored.add(path.resolve(file).toLowerCase());
    store.saveConfig({ foundIgnored: [...ignored] });
    save(store.readJSON(REG(), []).filter((x) => x.id !== m.id));
    gone.push({ id: m.id, name: m.name, why });
  }
  return gone;
}

// Adds found models where they are. Their files are never deleted by Quicksilver.
async function addFound(items, readGguf) {
  const added = [];
  for (const it of items || []) {
    if (!it?.path || !fs.existsSync(it.path)) continue;
    let info = null;
    try { info = await readGguf(it.path); } catch { continue; } // not a usable GGUF
    if (info.isProjector || !chatFile(it.path, info, it.name)) continue; // a vision add-on, or not a chat model
    const id = `imp-${crypto.createHash('sha1').update(path.resolve(it.path).toLowerCase()).digest('hex').slice(0, 10)}`;
    const name = it.app === 'Ollama' ? it.name : (info.name && info.name.length > 3 && !/^(model|models)$/i.test(info.name) ? info.name : it.name);
    const files = { model: it.path, ...(it.mmproj && fs.existsSync(it.mmproj) ? { mmproj: it.mmproj } : {}) };
    added.push(add({ id, ...recognize(name, it.path), kind: 'text', files, size: info.size || it.size, vision: Boolean(files.mmproj), source: 'imported', from: it.app }));
  }
  return added;
}

module.exports = { keepPackModels, list, get, add, remove, start, cancel, active, planCatalog, planGguf, ggufOptions, search, trending, trendType, paramsOf, importFile, tree, findOnPC, findChat, addFound, tidyImported, inUse, setUse, chatFile, looksUncensored, liquidOwn, keepDirs, packLeft, repair, registerStarter };
