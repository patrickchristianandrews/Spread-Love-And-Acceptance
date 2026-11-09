// Scores and ratings shown on models, stacks and cloud AIs.
// Tested scores: percent right on four well-known tests (see shared/catalog.js), so people can
// compare models in one glance. Create ratings: how good the photos, videos and music are, out of 5.
const SCORE_KEYS = [
  ['math', '🧮', 'Maths', 'Hard maths: AIME 2025 competition problems'],
  ['science', '🔬', 'Science', 'Expert science: GPQA Diamond, PhD-level questions'],
  ['coding', '💻', 'Coding', 'Coding: LiveCodeBench programming problems'],
];
// The tested scores for a catalog model (or an installed one, by its catalogId). Uncensored versions
// use the scores of the model they're made from, and say so.
function scoresFor(id) {
  if (!id || !S.catalog) return null;
  const online = S.catalog.picks?.scores?.local || {};
  const built = S.catalog.scores?.local || {};
  const own = online[id] || built[id];
  if (own) return { ...own };
  const base = S.catalog.scoreBase?.[id];
  const b = base && (online[base] || built[base]);
  return b ? { ...b, basedOn: base } : null;
}
function cloudScoresFor(key) {
  if (!key || !S.catalog) return null;
  const s = (S.catalog.picks?.scores?.cloud || {})[key] || (S.catalog.scores?.cloud || {})[key];
  return s ? { ...s } : null;
}
const scoreBand = (n) => (n >= 80 ? 'sc-hi' : n >= 55 ? 'sc-mid' : n >= 30 ? 'sc-lo' : 'sc-vlo');
// A row of percent chips. opts.label replaces "Tested", opts.note adds a line under it.
function scoreChipsHTML(sc, opts = {}) {
  if (!sc) return '';
  const chips = SCORE_KEYS.filter(([k]) => sc[k] != null).map(([k, i, l, t]) => `<span class="sc-chip ${scoreBand(sc[k])}" title="${esc(t)}${sc.who?.[k] ? ` · ${esc(sc.who[k])}` : ''}">${i} ${l} <b>${sc[k]}%</b></span>`);
  if (!chips.length) return '';
  const src = sc.src === 'maker' ? 'the maker\'s published results' : 'independent tests';
  const based = sc.basedOn ? ` Scores of ${esc(catModel(sc.basedOn)?.name || sc.basedOn)}, the model it's made from; uncensored versions usually score a point or two lower.` : '';
  return `<div class="sc-row"><span class="sc-k" title="From ${src}">${esc(opts.label || 'Tested')}</span><span class="sc-chips">${chips.join('')}<a href="#" class="sc-info" data-guide="scores" title="What these percentages mean">ⓘ</a></span></div>${opts.note || based ? `<div class="small muted sc-note">${opts.note ? esc(opts.note) : ''}${based}</div>` : ''}`;
}
// The best score for each test among several models (a stack): what its strongest member reaches.
function bestScores(ids) {
  const out = { who: {} };
  for (const id of ids) {
    const sc = scoresFor(id);
    if (!sc) continue;
    const name = catModel(sc.basedOn || id)?.name || id;
    for (const [k] of SCORE_KEYS) if (sc[k] != null && !(out[k] >= sc[k])) { out[k] = sc[k]; out.who[k] = name; }
  }
  return SCORE_KEYS.some(([k]) => out[k] != null) ? out : null;
}

// ---------- create ratings: photo, video, music (out of 5) ----------
// Media models: their quality rating. Music on this PC: a text model writes the track and the
// built-in synth plays it (instrumental only), so it's a modest rating whichever model writes it.
const SYNTH_MUSIC = 2;
const CLOUD_IMAGE_RATING = { 'gpt-image': 5, flux: 4.5, 'dall-e-3': 3.5 };
const stars5 = (q) => Math.max(0.5, Math.round(q) / 2);
function createRatings(list) {
  const r = { photo: null, video: null, music: null, editing: null };
  const best = (k, v, who, note) => { if (v != null && !(r[k]?.v >= v)) r[k] = { v, who, note }; };
  for (const x of list) {
    if (!x) continue;
    if (x.cloudImage) { const k = Object.keys(CLOUD_IMAGE_RATING).find((p) => x.cloudImage.toLowerCase().includes(p)); best('photo', k ? CLOUD_IMAGE_RATING[k] : 3.5, x.cloudImage, 'cloud'); continue; }
    const m = x.model;
    if (!m) continue;
    if (m.kind === 'image' && m.category === 'edit') { best('editing', stars5(m.quality ?? 5), m.name); best('photo', stars5((m.quality ?? 5) - 1), m.name); }
    else if (m.kind === 'image') best('photo', stars5(m.quality ?? 5), m.name);
    else if (m.kind === 'video') best('video', stars5(m.quality ?? 5), m.name);
    else best('music', SYNTH_MUSIC, m.name, 'built-in synth, instrumental');
  }
  return r;
}
const CREATE_KEYS = [['photo', '📸', 'Photos'], ['editing', '🪄', 'Photo edits'], ['video', '🎬', 'Video'], ['music', '🎵', 'Music']];
const CREATE_NONE = { photo: 'Doesn\'t make pictures', editing: 'Doesn\'t edit photos', video: 'Doesn\'t make videos', music: 'Doesn\'t make music' };
function createRowHTML(r, opts = {}) {
  const keys = CREATE_KEYS.filter(([k]) => r[k] || (k !== 'editing' && opts.all));
  if (!keys.length) return '';
  return `<div class="sc-row"><span class="sc-k">Creates</span><span class="sc-chips">${keys.map(([k, i, l]) => (r[k]
    ? `<span class="cr-chip" title="${esc(`${r[k].who}${r[k].note ? ` (${r[k].note})` : ''}`)}">${i} ${l} <b>${tenText(r[k].v)}</b></span>`
    : `<span class="cr-chip off" title="${CREATE_NONE[k]}">${i} ${l} <b>–</b></span>`)).join('')}<a href="#" class="sc-info" data-guide="scores" title="What these ratings mean">ⓘ</a></span></div>`;
}
// A catalog model's own create ratings (text models compose music for the synth).
const modelCreate = (m) => createRatings([{ model: m }]);
// A stack's: from every model in it (installed or from the catalog) and its cloud image models.
function targetModel(t) {
  if (!t) return null;
  const id = String(t).replace(/^local:/, '');
  const inst = S.installed.find((m) => m.id === id);
  return catModel(inst?.catalogId || id) || (inst ? { name: inst.name, kind: inst.kind || 'text', quality: 5 } : null);
}
function stackRatings(targets) {
  const list = targets.map((t) => (String(t).startsWith('api:') ? (/image|dall-e|flux/i.test(t) ? { cloudImage: String(t).split(':').pop() } : null) : { model: targetModel(t) }));
  return createRatings(list);
}
function stackScoreIds(targets) {
  return targets.map((t) => { const id = String(t).replace(/^local:/, ''); return S.installed.find((m) => m.id === id)?.catalogId || id; });
}

// ---------- what an upgrade gains you ----------
// Plain-words gains from one model to another, biggest first: tested scores where both have them,
// new abilities (reasoning, photos, longer documents, better pictures or video), stronger skills,
// and speed on this PC.
const KTXT = (n) => `${Math.round(n / 1024)}K`;
function gainsOf(fromId, toId) {
  const a = catModel(fromId);
  const b = catModel(toId);
  if (!b) return [];
  const out = [];
  if (b.kind === 'image' || b.kind === 'video') {
    const qa = a?.quality ?? 0;
    const qb = b.quality ?? 0;
    if (b.kind === 'video' && qb > qa) out.push([40, '🎬', `Better video${a ? ` (${tenText(stars5(qa))} → ${tenText(stars5(qb))})` : ''}`]);
    if (b.kind === 'image' && b.category !== 'edit' && qb > qa) out.push([40, '📸', `Improved picture generation${a ? ` (${tenText(stars5(qa))} → ${tenText(stars5(qb))})` : ''}`]);
    if (b.category === 'edit' && a?.category !== 'edit') out.push([30, '🪄', 'Edits photos from a description']);
    if (b.animate && !a?.animate) out.push([30, '📷', 'Brings photos to life']);
  } else {
    const sa = scoresFor(fromId);
    const sb = scoresFor(toId);
    for (const [k, i, l] of [['science', '🧠', 'Expanded reasoning'], ['math', '🧮', 'Sharper maths'], ['coding', '💻', 'Stronger coding']]) {
      if (sb?.[k] == null || sa?.[k] == null) continue;
      const d = sb[k] - sa[k];
      if (d >= 3) out.push([d + 10, i, `${l}: ${sa[k]}% → ${sb[k]}%`]);
    }
    if (b.reasoning && !a?.reasoning && !out.some((x) => x[2].startsWith('Expanded reasoning'))) out.push([30, '🧠', 'Expanded reasoning: thinks problems through before answering']);
    if (b.vision && !a?.vision) out.push([28, '👁', 'Now reads photos and screenshots']);
    const ja = a?.jobs || {};
    const jb = b.jobs || {};
    const JL = { general: ['✨', 'Smarter everyday answers'], research: ['🔎', 'Deeper research'], office: ['📄', 'Better with documents and spreadsheets'], coding: ['💻', 'Stronger coding'], vision: ['👁', 'Sharper photo reading'] };
    for (const [k, [i, l]] of Object.entries(JL)) {
      const d = (jb[k] ?? 0) - (ja[k] ?? 0);
      if (d < 1 || out.some((x) => x[2].startsWith(l.split(' ')[0]) && x[1] === i) || (k === 'vision' && (!b.vision || !a?.vision))) continue;
      out.push([d * 8, i, l]);
    }
    if (b.ctx && a?.ctx && b.ctx >= a.ctx * 2) out.push([9, '📜', `Reads much longer documents (${KTXT(a.ctx)} → ${KTXT(b.ctx)})`]);
  }
  const ea = S.est?.text?.[fromId] || S.est?.media?.[fromId];
  const eb = S.est?.text?.[toId] || S.est?.media?.[toId];
  if (ea?.tps && eb?.tps && eb.tps > ea.tps * 1.3) out.push([12, '⚡', 'Faster on this PC']);
  return out.sort((x, y) => y[0] - x[0]).slice(0, 4).map(([, icon, text]) => ({ icon, text }));
}
const gainsHTML = (gains) => (gains.length ? `<div class="gain-row">${gains.map((g) => `<span class="gain">${g.icon} ${esc(g.text)}</span>`).join('')}</div>` : '');
