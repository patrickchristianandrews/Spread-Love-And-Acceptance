// Keeps the model catalogue current by itself. Run every day by a scheduled build
// (.github/workflows/quicksilver-models.yml); every Quicksilver reads the result once a day
// (data/models.json, see src/main/catalog-remote.js).
//
// What it does:
//   finds   new open-licence chat models on Hugging Face, published in the format Quicksilver's
//           engine runs (GGUF), by the well-known converters, that are not in the catalogue yet;
//   adds    them to data/models.json, marked as added automatically, with ratings estimated from
//           their size (said so in their description: nobody has tested them yet);
//   retires an older model when a newer version of the same family and size appears (the app then
//           offers the upgrade; nothing is ever downloaded or deleted by this);
//   removes automatic entries that have disappeared from Hugging Face, or that are old and no
//           longer among the popular ones.
// Entries written by hand in data/models.json (no "auto") are never changed.
//
//   node scripts/discover-models.js            updates data/models.json
//   node scripts/discover-models.js --dry      prints what it would do
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');

process.env.QUICKSILVER_HOME ||= fs.mkdtempSync(path.join(os.tmpdir(), 'qs-discover-'));
const catalog = require('../src/shared/catalog');
const remote = require('../src/main/catalog-remote');

const HF = 'https://huggingface.co';
const FILE = path.join(__dirname, '..', 'data', 'models.json');
const DRY = process.argv.includes('--dry');
const TODAY = new Date().toISOString().slice(0, 10);
// Converters whose files are complete and named consistently.
const CONVERTERS = ['bartowski', 'unsloth', 'lmstudio-community', 'ggml-org', 'mradermacher'];
// Licences that let anyone use, change and share the model. Others (Llama, Gemma and
// "research only" terms) are left for a person to add by hand.
const OPEN = new Set(['apache-2.0', 'mit', 'bsd-3-clause', 'bsd-2-clause', 'cc-by-4.0', 'cc0-1.0', 'openrail', 'openrail++', 'unlicense', 'isc']);
const MAX_AUTO = 24; // of the 40 the app accepts; the rest stay free for hand-picked ones
const KEEP_DAYS = 150;
const NOT_CHAT = /embed|rerank|whisper|tts|speech|audio|ocr|guard|classif|lora|-mlx|onnx|vae|clip|diffus|flux|wan[0-9.]|sdxl|siglip|translate/i;

const get = async (url) => {
  const res = await fetch(url, { headers: { 'User-Agent': 'Quicksilver catalogue' }, signal: AbortSignal.timeout(30000) });
  if (!res.ok) throw new Error(`${url}: HTTP ${res.status}`);
  return res.json();
};
const slug = (s) => String(s).toLowerCase().replace(/[^a-z0-9.]+/g, '-').replace(/^-+|-+$/g, '').slice(0, 60);
// "Qwen3.5-9B-Instruct" → { family: 'qwen', version: 3.5, params: 9 }
function parse(name) {
  const n = String(name).replace(/[-_.]?gguf$/i, '');
  const params = Number((n.match(/(?:^|[-_ ])(\d+(?:\.\d+)?)\s?b(?:[-_ ]|$)/i) || [])[1]) || null;
  const active = Number((n.match(/a(\d+(?:\.\d+)?)b/i) || [])[1]) || null;
  const fam = n.match(/^([A-Za-z][A-Za-z-]*?)[-_ ]?v?(\d+(?:\.\d+)?)(?=[-_ ]|$)/);
  return { params, active, family: fam ? fam[1].toLowerCase().replace(/-+$/, '') : null, version: fam ? Number(fam[2]) : null,
    coder: /cod(e|er)|devstral/i.test(n), thinks: /think|reason|\br1\b|qwq/i.test(n), open: /abliterat|uncensored|heretic|dolphin|obliterat/i.test(n), sees: /\bvl\b|vision|-vl-/i.test(n) };
}
// Ratings nobody has measured yet: a cautious guess from size alone.
function estimate(p, sees) {
  const g = p.params <= 2 ? 4 : p.params <= 4.5 ? 5 : p.params <= 9.5 ? 6 : p.params <= 16 ? 7 : p.params <= 40 ? 8 : 8.5;
  return { general: g, office: Math.max(2, g - 1), research: Math.max(2, g - 1), coding: p.coder ? Math.min(10, g + 1) : Math.max(2, g - 1), vision: sees ? Math.max(4, g - 1) : 0, fast: p.params <= 4.5 ? 8 : p.params <= 9.5 ? 6 : 4 };
}

async function candidates() {
  const seen = new Map();
  for (const author of CONVERTERS) {
    for (const sort of ['trendingScore', 'createdAt']) {
      let list = [];
      try { list = await get(`${HF}/api/models?author=${author}&filter=gguf&sort=${sort}&direction=-1&limit=${author === 'mradermacher' ? 30 : 60}&full=true`); } catch (e) { console.log(`  (skipped ${author}/${sort}: ${e.message.slice(0, 80)})`); }
      for (const m of list) if (m.id && !seen.has(m.id)) seen.set(m.id, m);
    }
  }
  return [...seen.values()];
}

async function describe(m) {
  const name = m.id.split('/').pop().replace(/[-_.]?gguf$/i, '');
  // Experimental repacks of a model already listed (weighted "i1" copies, speed-test builds), and,
  // from the converter that republishes everything, only uncensored editions people actually use.
  if (/[-_.]i1$|[-_]mtp\b|distill|merge|[-_]rp\b|roleplay|[-_]3d[-_]/i.test(name)) return null;
  if (m.id.startsWith('mradermacher/') && (!/abliterat|uncensored|heretic/i.test(name) || (m.downloads || 0) < 2000)) return null;
  if (name.length > 44) return null; // one-off mixes with a paragraph for a name
  if (NOT_CHAT.test(name) || (m.pipeline_tag && !/text-generation|image-text-to-text|conversational/.test(m.pipeline_tag))) return null;
  const p = parse(name);
  if (!p.params || p.params > 120) return null;
  const licence = (m.tags || []).map((t) => (t.match(/^license:(.+)$/) || [])[1]).find(Boolean) || m.cardData?.license;
  if (!OPEN.has(String(licence || '').toLowerCase())) return null;
  if (catalog.TEXT_MODELS.some((c) => !c.remote && (c.repo === m.id || c.repo.split('/').pop().toLowerCase() === m.id.split('/').pop().toLowerCase()))) return null;
  const files = (m.siblings || []).map((s) => s.rfilename).filter(Boolean);
  const main = files.find((f) => /Q4_K_M\.gguf$/i.test(f) && !/mmproj/i.test(f) && !/-0000\d-of-/.test(f));
  if (!main) return null;
  let sizeGB = null; let mmprojGB = 0;
  try {
    const tree = await get(`${HF}/api/models/${m.id}/tree/main`);
    sizeGB = (tree.find((f) => f.path === main)?.size || 0) / 1e9;
    const mm = tree.filter((f) => /mmproj/i.test(f.path)).sort((a, b) => a.size - b.size)[0];
    if (mm) mmprojGB = mm.size / 1e9;
  } catch { return null; }
  if (!sizeGB || sizeGB < 0.3 || sizeGB > 80) return null;
  const sees = mmprojGB > 0 || p.sees;
  const maker = String(m.cardData?.base_model?.[0] || m.cardData?.base_model || '').split('/')[0] || m.id.split('/')[0];
  const category = p.open ? 'open' : p.coder ? 'coding' : mmprojGB ? 'vision' : p.thinks ? 'reasoning' : sizeGB < 3 ? 'small' : sizeGB > 20 ? 'large' : 'general';
  const jobs = estimate(p, sees);
  return { id: slug(name), name: name.replace(/[-_]+/g, ' ').trim(), maker, params: `${p.params}B`, category, repo: m.id, quant: 'Q4_K_M', sizeGB: Math.round(sizeGB * 100) / 100, jobs, judge: Math.max(2, jobs.general - 1),
    blurb: `New on Hugging Face, added automatically on ${TODAY} (${licence} licence). Not tested by Quicksilver yet: its ratings are estimates from its size.`,
    ...(mmprojGB ? { vision: true, mmprojGB: Math.round(mmprojGB * 100) / 100 } : {}), ...(p.active ? { activeGB: Math.round(p.active * 0.6 * 10) / 10 } : {}), ...(p.thinks ? { reasoning: true } : {}), ...(p.open ? { open: true } : {}),
    auto: true, added: TODAY, licence, popularity: Math.round((m.trendingScore || 0) * 10 + Math.log10((m.downloads || 0) + 1) * 3), _p: p };
}

// A newer version of the same family, about the same size and the same kind, replaces the older one.
function successorsFor(fresh, known) {
  const out = {};
  for (const n of fresh) {
    const a = n._p;
    if (!a.family || a.version == null) continue;
    for (const old of known) {
      if (old.id === n.id || catalog.LIQUID_MEMBERS?.includes?.(old.id)) continue;
      const b = parse(old.repo.split('/').pop());
      const size = old.sizeGB / n.sizeGB;
      if (b.family === a.family && b.version != null && b.version < a.version && size > 0.6 && size < 1.6 && b.coder === a.coder && b.open === a.open && Boolean(old.vision) === Boolean(n.vision) && Boolean(old.reasoning) === Boolean(n.reasoning)) out[old.id] = n.id;
    }
  }
  return out;
}

(async () => {
  const data = JSON.parse(fs.readFileSync(FILE, 'utf8'));
  const byHand = (data.models || []).filter((m) => !m.auto);
  const wasAuto = (data.models || []).filter((m) => m.auto);
  const found = [];
  // One entry for each model: the same family, version, size and kind from two converters is one model (the more popular copy).
  const kind = (d) => `${d._p.family}|${d._p.version}|${d._p.params}|${d._p.coder}|${d._p.open}|${d._p.thinks}`;
  const all = [];
  for (const m of await candidates()) { const d = await describe(m).catch(() => null); if (d && !byHand.some((x) => x.id === d.id)) all.push(d); }
  for (const d of all.sort((a, b) => b.popularity - a.popularity)) if (!found.some((x) => x.id === d.id || (d._p.family && kind(x) === kind(d)))) found.push(d);
  if (!found.length && !DRY) { console.log('Nothing found (Hugging Face may be unreachable): the catalogue is left as it is.'); return; }
  // Keep the date a model was first added; drop automatic ones that are gone or old and no longer popular.
  const age = (m) => (Date.now() - new Date(m.added || TODAY).getTime()) / 86400000;
  for (const d of found) { const before = wasAuto.find((x) => x.id === d.id); if (before?.added) { d.added = before.added; d.blurb = before.blurb || d.blurb; } }
  const keep = found.filter((d) => age(d) <= KEEP_DAYS || d.popularity >= 15).sort((a, b) => b.popularity - a.popularity).slice(0, MAX_AUTO);
  const known = [...catalog.TEXT_MODELS.filter((m) => !m.remote), ...byHand];
  const auto = successorsFor(keep, known);
  const kept = new Set(keep.map((m) => m.id));
  // Successors written by hand stay; automatic ones are rebuilt each run (so one whose newer model was removed goes too).
  const hand = Object.fromEntries(Object.entries(data.successors || {}).filter(([a]) => !(data.autoSuccessors || []).includes(a)));
  const successors = { ...Object.fromEntries(Object.entries(auto).filter(([a, b]) => !hand[a] && kept.has(b))), ...hand };
  const models = [...byHand, ...keep.map(({ _p, popularity, ...m }) => m)];
  const next = { ...data, updated: TODAY.slice(0, 7), models, successors, autoSuccessors: Object.keys(auto).filter((a) => !hand[a] && kept.has(auto[a])) };
  // The app's own check of this file must accept every model that was added.
  const checked = remote.clean(JSON.parse(JSON.stringify(next)));
  const refused = models.filter((m) => !checked?.models.some((x) => x.id === m.id)).map((m) => m.id);
  if (!checked || refused.length) throw new Error(`the app would not accept: ${refused.join(', ') || 'the whole file'}`);
  const added = keep.filter((m) => !wasAuto.some((x) => x.id === m.id)).map((m) => m.id);
  const removed = wasAuto.filter((m) => !kept.has(m.id)).map((m) => m.id);
  console.log(`${keep.length} automatic models (${added.length} new, ${removed.length} removed), ${Object.keys(auto).length} older models now point to a newer one.`);
  for (const m of keep) console.log(`  ${added.includes(m.id) ? '+' : ' '} ${m.id} · ${m.sizeGB} GB · ${m.category} · ${m.licence} · ${m.repo}`);
  for (const id of removed) console.log(`  - ${id}`);
  for (const [a, b] of Object.entries(auto)) console.log(`  ${a} → ${b}`);
  const same = JSON.stringify({ ...data, updated: 0 }) === JSON.stringify({ ...next, updated: 0 });
  if (DRY || same) { console.log(same ? 'No change.' : '(dry run: nothing written)'); return; }
  fs.writeFileSync(FILE, `${JSON.stringify(next, null, 2)}\n`);
  console.log('data/models.json updated.');
})().catch((e) => { console.error(`FAILED: ${e.message}`); process.exit(1); });
