// Model picks that move with the times. Quicksilver ships with a catalog of models, but the best
// ones change every few weeks, so a small data file in the Quicksilver repository can add new
// models, mark the featured picks, say which newer model replaces an older one ("successors") and
// update the models the ready-made stacks use. It's fetched once a day when online, checked,
// cached, and applied straight away. Offline, or if the file can't be fetched or doesn't look
// right, the last good copy (or what's built in) is used. Nothing is ever downloaded from here:
// it only changes what the app recommends; you choose what to download.
const store = require('./store');
const catalog = require('../shared/catalog');

const REPO = 'patrickchristianandrews/Spread-Love-And-Acceptance';
const URL = `https://raw.githubusercontent.com/${REPO}/main/quicksilver/data/models.json`;
const DAY = 24 * 60 * 60 * 1000;
const FILE = () => store.file('models-remote.json');

const str = (v, max = 200) => (typeof v === 'string' ? v.slice(0, max) : '');
const num = (v, lo, hi) => (Number.isFinite(v) && v >= lo && v <= hi ? v : null);
const ID = /^[a-z0-9][a-z0-9._-]{1,60}$/;
const JOB_KEYS = ['general', 'office', 'research', 'coding', 'vision', 'fast'];

function cleanModel(m) {
  if (!m || typeof m !== 'object' || !ID.test(m.id || '') || !/^[\w.-]+\/[\w.-]+$/.test(m.repo || '') || !/^[A-Z0-9_]{2,14}$/i.test(m.quant || '')) return null;
  const sizeGB = num(m.sizeGB, 0.1, 400);
  if (!sizeGB || !catalog.TEXT_CATEGORIES[m.category] || !m.jobs || typeof m.jobs !== 'object') return null;
  const jobs = Object.fromEntries(JOB_KEYS.map((k) => [k, num(m.jobs[k], 0, 10) ?? 0]));
  return {
    id: m.id, name: str(m.name, 80) || m.id, maker: str(m.maker, 40), params: str(m.params, 30), category: m.category, repo: m.repo, quant: m.quant.toUpperCase(), sizeGB,
    ctx: num(m.ctx, 1024, 4000000) || 32768, jobs, judge: num(m.judge, 0, 10) ?? Math.max(2, jobs.general - 1), blurb: str(m.blurb, 300),
    ...(m.vision ? { vision: true, mmprojGB: num(m.mmprojGB, 0, 10) || 0.8 } : {}), ...(num(m.activeGB, 0.1, 100) ? { activeGB: m.activeGB } : {}),
    ...(m.reasoning ? { reasoning: true } : {}), ...(m.open ? { open: true } : {}), remote: true,
  };
}
const idList = (v, max = 16) => (Array.isArray(v) ? v.filter((x) => typeof x === 'string' && ID.test(x)).slice(0, max) : []);

// Checks the file's shape; keeps only known, plain fields.
function clean(j) {
  if (!j || typeof j !== 'object' || j.version !== 1) return null;
  const models = (Array.isArray(j.models) ? j.models : []).map(cleanModel).filter(Boolean).slice(0, 40);
  const successors = {};
  for (const [a, b] of Object.entries(j.successors && typeof j.successors === 'object' ? j.successors : {})) if (ID.test(a) && typeof b === 'string' && ID.test(b) && a !== b) successors[a] = b;
  const featured = {}; const ladders = {};
  for (const [k, v] of Object.entries(j.featured && typeof j.featured === 'object' ? j.featured : {})) if (/^[a-z]{2,20}$/.test(k)) featured[k] = idList(v, 12);
  for (const [k, v] of Object.entries(j.ladders && typeof j.ladders === 'object' ? j.ladders : {})) if (/^[a-z]{2,20}$/.test(k)) ladders[k] = idList(v, 20);
  // The Liquid Edition's core: which uncensored models are its Brain, Eyes and picture maker right now.
  const liquid = {};
  if (j.liquid && typeof j.liquid === 'object') for (const k of ['brain', 'eyes', 'pictures']) if (typeof j.liquid[k] === 'string' && ID.test(j.liquid[k])) liquid[k] = j.liquid[k];
  // New ready-made stacks, published online: plain data (which models, roles, how they work
  // together, instructions and why it's good). They appear in Stacks marked new.
  const MODES = ['blend', 'debate', 'consensus', 'auto', 'vote', 'redteam', 'plan', 'panel'];
  const recipes = (Array.isArray(j.recipes) ? j.recipes : []).slice(0, 30).map((r) => {
    if (!r || !ID.test(r.id || '') || !Array.isArray(r.parts)) return null;
    const parts = r.parts.slice(0, 5).filter((p) => p && ID.test(p.model || '')).map((p) => ({ model: p.model, role: str(p.role, 60) || 'Helper', ...(typeof p.ladder === 'string' && /^[a-z]{2,20}$/.test(p.ladder) ? { ladder: p.ladder } : {}) }));
    if (!parts.length || !str(r.name, 90)) return null;
    return { id: r.id, name: str(r.name, 90), icon: str(r.icon, 4) || '🧩', group: /^[a-z]{2,20}$/.test(r.group || '') ? r.group : 'new', mode: MODES.includes(r.mode) ? r.mode : 'blend',
      parts, ...(ID.test(r.lead || '') ? { lead: r.lead } : {}), instructions: str(r.instructions, 1500), why: str(r.why, 300), added: str(r.added, 20),
      ...(num(r.temperature, 0, 1.5) != null ? { temperature: r.temperature } : {}), ...(r.uncensored ? { uncensored: true } : {}) };
  }).filter(Boolean);
  const scores = { local: {}, cloud: {} };
  // A score is a percentage, or null for "not published"; anything else is dropped.
  const pct = (v) => (v === null ? null : num(v, 0, 100) ?? undefined);
  for (const side of ['local', 'cloud']) {
    const src = j.scores?.[side];
    if (!src || typeof src !== 'object') continue;
    for (const [id, v] of Object.entries(src).slice(0, 200)) {
      if (!/^[a-z0-9][\w.-]{0,80}$/i.test(id) || !v || typeof v !== 'object') continue;
      const e = {};
      for (const k of ['math', 'science', 'knowledge', 'coding', 'codeAgent', 'ifeval', 'tools', 'writing', 'elo']) if (k in v) { const n = pct(v[k]); if (n !== undefined) e[k] = n == null ? null : Math.round(n); }
      if (Object.keys(e).length) scores[side][id] = { ...e, ...(str(v.model, 80) ? { model: str(v.model, 80) } : {}), src: v.src === 'maker' ? 'maker' : 'aa' };
    }
  }
  return { version: 1, updated: str(j.updated, 20), models, successors, featured, ladders, liquid, recipes, scores };
}

let applied = { successors: {}, featured: {}, ladders: {}, liquid: {}, recipes: [], scores: { local: {}, cloud: {} }, updated: '', fetchedAt: 0 };
// Adds new models to the catalog (never replaces a built-in one) and keeps the picks for get().
function apply(data) {
  if (!data) return;
  for (const m of data.models || []) {
    const i = catalog.TEXT_MODELS.findIndex((x) => x.id === m.id);
    if (i < 0) catalog.TEXT_MODELS.push(m);
    else if (catalog.TEXT_MODELS[i].remote) catalog.TEXT_MODELS[i] = m; // a newer copy of a model added online
  }
  applied = { successors: data.successors || {}, featured: data.featured || {}, ladders: data.ladders || {}, liquid: data.liquid || {}, recipes: data.recipes || [], scores: data.scores || { local: {}, cloud: {} }, updated: data.updated || '', fetchedAt: data.fetchedAt || 0 };
}

// What the app uses: built-in picks, with the online ones on top.
function picks() {
  return {
    successors: { ...catalog.SUCCESSORS, ...applied.successors },
    featured: { ...catalog.FEATURED, ...applied.featured },
    ladders: applied.ladders,
    liquid: { brain: 'qwen3.5-4b', eyes: 'qwen3.5-2b', pictures: 'lustify', ...applied.liquid },
    recipes: applied.recipes,
    scores: applied.scores,
    updated: applied.updated, fetchedAt: applied.fetchedAt,
  };
}

let inflight = null;
let onChange = () => {};
async function refresh(force = false) {
  const c = store.readJSON(FILE(), null);
  if (store.config().offline) return c;
  if (!force && c?.fetchedAt && Date.now() - c.fetchedAt < DAY) return c;
  if (inflight) return inflight;
  inflight = (async () => {
    try {
      const res = await fetch(URL, { headers: { 'Cache-Control': 'no-cache' }, signal: AbortSignal.timeout(10000) });
      if (!res.ok) return c;
      const data = clean(await res.json());
      if (!data) return c;
      const out = { ...data, fetchedAt: Date.now() };
      store.writeJSON(FILE(), out);
      apply(out);
      onChange();
      return out;
    } catch { return c; } finally { inflight = null; }
  })();
  return inflight;
}

// Better models for what's installed: an installed model whose successor exists, runs well on this
// PC, isn't installed yet, and is at least as good at what the old one was for.
function upgradesFor(installed, hw, calib = 1) {
  const s = picks().successors;
  const out = [];
  const haveCat = new Set(installed.map((m) => m.catalogId).filter(Boolean));
  for (const m of installed.filter((x) => x.kind === 'text' && x.catalogId && x.source !== 'bundled')) {
    let next = s[m.catalogId];
    const seen = new Set([m.catalogId]);
    while (next && s[next] && !seen.has(s[next]) && catalog.TEXT_MODELS.some((x) => x.id === s[next])) { seen.add(next); next = s[next]; }
    const old = catalog.TEXT_MODELS.find((x) => x.id === m.catalogId);
    const neu = next && catalog.TEXT_MODELS.find((x) => x.id === next);
    if (!old || !neu || haveCat.has(neu.id)) continue;
    const job = old.category === 'coding' ? 'coding' : old.category === 'vision' ? 'vision' : old.category === 'reasoning' ? 'reasoning' : 'general';
    const a = catalog.scoreFor(old, job); const b = catalog.scoreFor(neu, job);
    if (b < a) continue;
    const est = catalog.estimateText(neu, hw, calib);
    if (!['great', 'good', 'ok'].includes(est.rating)) continue;
    const why = b > a ? `stronger for ${job === 'general' ? 'everyday use' : job} (${a} → ${b} out of 10)` : 'newer, same strength';
    const size = neu.sizeGB > old.sizeGB * 1.25 ? `, bigger download (${neu.sizeGB} GB)` : neu.sizeGB < old.sizeGB * 0.8 ? `, smaller (${neu.sizeGB} GB)` : `, about the same size (${neu.sizeGB} GB)`;
    out.push({ oldId: m.id, oldName: m.name, oldCatalogId: old.id, newCatalogId: neu.id, newName: neu.name, why: `${why}${size}`, rating: est.rating, speed: est.label, sizeGB: neu.sizeGB });
  }
  return out;
}

function start(changed) {
  if (changed) onChange = changed;
  apply(store.readJSON(FILE(), null)); // the last good copy, straight away
  setTimeout(() => refresh().catch(() => {}), 20 * 1000).unref?.();
  setInterval(() => refresh().catch(() => {}), 6 * 60 * 60 * 1000).unref?.();
}

module.exports = { URL, clean, apply, picks, refresh, upgradesFor, start };
