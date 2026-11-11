// Civitai (civitai.com): the biggest library of community picture models. Quicksilver browses it
// live — checkpoints (whole models) and LoRAs (small add-ons that teach a style, character or
// concept) — and downloads them straight from Civitai. Only what its image engine can run is
// shown: SD 1.5 and SDXL-family checkpoints (SDXL, Pony, Illustrious, NoobAI), and LoRAs for those
// and FLUX. Models of real people and anything flagged as involving minors are never shown.
// An API key (civitai.com → Account settings → API keys) is needed for many adult models.
'use strict';
const store = require('./store');

const API = process.env.QS_CIVITAI_API || 'https://civitai.com/api/v1'; // (tests point it at a stand-in)
// Civitai's base-model names → the engine family they run on.
const FAMILY = {
  'SD 1.5': 'sd15', 'SD 1.5 Hyper': 'sd15', 'SD 1.5 LCM': 'sd15',
  'SDXL 1.0': 'sdxl', 'SDXL Lightning': 'sdxl', 'SDXL Turbo': 'sdxl', 'SDXL Hyper': 'sdxl',
  Pony: 'sdxl', Illustrious: 'sdxl', NoobAI: 'sdxl',
  'Flux.1 D': 'flux', 'Flux.1 S': 'flux',
};
// The filter buttons: which Civitai base models each one asks for.
const BASES = {
  sd15: ['SD 1.5', 'SD 1.5 Hyper', 'SD 1.5 LCM'],
  sdxl: ['SDXL 1.0', 'SDXL Lightning', 'SDXL Turbo', 'SDXL Hyper'],
  pony: ['Pony'],
  illustrious: ['Illustrious', 'NoobAI'],
  flux: ['Flux.1 D', 'Flux.1 S'],
};
// Whole checkpoints are single files only for SD 1.5 and SDXL; FLUX checkpoints need several.
const CHECKPOINT_FAMILIES = new Set(['sd15', 'sdxl']);
const LORA_FAMILIES = new Set(['sd15', 'sdxl', 'flux']);
const SORTS = ['Most Downloaded', 'Highest Rated', 'Newest'];
const ANIME_BASES = new Set(['Pony', 'Illustrious', 'NoobAI']);

const key = () => store.getSecret('civitai') || '';
const headers = () => (key() ? { Authorization: `Bearer ${key()}` } : {});

// One result card's worth of a Civitai model, or null when Quicksilver can't run it (or won't show it).
function toItem(m, type, nsfw) {
  if (m.poi || m.minor) return null; // never real people, never minors
  const allowed = type === 'LORA' ? LORA_FAMILIES : CHECKPOINT_FAMILIES;
  for (const v of m.modelVersions || []) {
    const family = FAMILY[v.baseModel];
    if (!family || !allowed.has(family)) continue;
    const file = (v.files || []).find((f) => f.primary && ['Model', 'Pruned Model'].includes(f.type) && f.metadata?.format === 'SafeTensor')
      || (v.files || []).find((f) => ['Model', 'Pruned Model'].includes(f.type) && f.metadata?.format === 'SafeTensor');
    if (!file) continue;
    const imgs = v.images || [];
    const img = imgs.find((i) => (i.nsfwLevel || 1) <= 1 && i.type !== 'video') || (nsfw ? imgs.find((i) => i.type !== 'video') : null);
    return {
      id: m.id, versionId: v.id, name: m.name, version: v.name, type: type === 'LORA' ? 'lora' : 'checkpoint',
      base: v.baseModel, family, nsfw: Boolean(m.nsfw), creator: m.creator?.username || '',
      downloads: m.stats?.downloadCount || 0, likes: m.stats?.thumbsUpCount || 0,
      image: img ? img.url.replace(/\/original=true\//, '/width=450/') : null,
      file: { name: file.name, sizeKB: file.sizeKB || 0, url: file.downloadUrl || v.downloadUrl },
      trainedWords: (v.trainedWords || []).slice(0, 8).map((w) => String(w).slice(0, 120)),
      tags: (m.tags || []).slice(0, 6),
      page: `https://civitai.com/models/${m.id}`,
    };
  }
  return null;
}

// Search: { query, type: 'Checkpoint'|'LORA', base: 'all'|key of BASES, sort, nsfw, cursor }.
async function search({ query = '', type = 'Checkpoint', base = 'all', sort = 'Most Downloaded', nsfw = false, cursor = '' } = {}) {
  type = type === 'LORA' ? 'LORA' : 'Checkpoint';
  const p = new URLSearchParams({ limit: '40', types: type, sort: SORTS.includes(sort) ? sort : 'Most Downloaded', nsfw: nsfw ? 'true' : 'false' });
  if (query) p.set('query', String(query).slice(0, 100));
  if (cursor) p.set('cursor', cursor);
  const fams = type === 'LORA' ? LORA_FAMILIES : CHECKPOINT_FAMILIES;
  const bases = (BASES[base] || Object.keys(FAMILY)).filter((b) => fams.has(FAMILY[b]));
  for (const b of bases) p.append('baseModels', b);
  const res = await fetch(`${API}/models?${p}`, { headers: headers(), signal: AbortSignal.timeout(30000) });
  if (res.status === 401) throw new Error('Civitai refused the API key. Check it in Models → Civitai.');
  if (!res.ok) throw new Error(`Civitai didn't answer (HTTP ${res.status}). Try again in a moment.`);
  const j = await res.json();
  const items = (j.items || []).map((m) => toItem(m, type, nsfw)).filter(Boolean);
  return { items, next: j.metadata?.nextCursor ? String(j.metadata.nextCursor) : null };
}

// A download plan (models.start) for a search result.
function plan(item) {
  const lora = item.type === 'lora';
  const slug = String(item.name).toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 40) || 'model';
  const fileName = `civitai-${item.versionId}-${slug}.safetensors`;
  return {
    id: `civitai-${item.versionId}`, name: item.version && !String(item.name).includes(item.version) ? `${item.name} (${item.version})` : item.name,
    kind: lora ? 'lora' : 'image', catalogId: lora ? undefined : `civitai-${item.family}`, source: 'civitai',
    items: [{ role: 'model', url: item.file.url, path: `${lora ? 'loras' : 'civitai'}/${fileName}`, size: Math.round((item.file.sizeKB || 0) * 1024), approx: true }],
    extra: {
      family: item.family, base: item.base, civitai: { id: item.id, versionId: item.versionId, page: item.page },
      trainedWords: item.trainedWords || [], uncensored: Boolean(item.nsfw),
      ...(ANIME_BASES.has(item.base) ? { style: 'anime' } : {}),
      ...(item.base === 'Pony' ? { promptPrefix: 'score_9, score_8_up, score_7_up, ' } : {}),
    },
  };
}

module.exports = { search, plan, headers, FAMILY, BASES, toItem };
