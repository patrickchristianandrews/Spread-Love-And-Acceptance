// Models: installed, the curated catalog (text & vision, images & video), all of Hugging Face,
// and cloud API connections.
'use strict';

let modelsTab = 'installed';
let hfResults = null;
let hfQuery = '';
let catFilter = 'all';
let fitsOnly = false;

views.models = {
  html() {
    const tabs = { installed: `On this PC (${S.installed.length})`, text: 'Text & vision', media: 'Images & video', trending: '🔥 Trending now', hf: 'Search Hugging Face', api: `Connect an API (${S.providers.length})` };
    return `<div class="page">
      <div class="page-head"><h1>Models</h1>
        <button class="btn" id="find-models">Find models on this PC</button><button class="btn" id="import-gguf">Import a .gguf file</button><button class="btn ghost" id="open-folder">Open models folder</button></div>
      <p class="lede">Free, open models run on your PC: private, offline, no account. Ratings show how each one will run on <b>your</b> hardware. Not sure? Let the <a href="#" data-goto-stacks>Setup Advisor</a> choose.</p>
      ${foundBanner()}
      ${shownUpgrades().length || shownStackUpdates().length || modelsTab === 'installed' ? modelUpdatesHTML() : ''}
      ${['installed', 'text'].includes(modelsTab) ? builtinModelHTML() + addonsHTML() : ''}
      <div class="tabs" role="tablist">${Object.entries(tabs).map(([k, l]) => `<button class="tab ${modelsTab === k ? 'active' : ''}" data-tab="${k}" role="tab">${esc(l)}</button>`).join('')}</div>
      ${({ installed: installedHTML, text: textHTML, media: mediaHTML, trending: trendingHTML, hf: hfHTML, api: apiHTML })[modelsTab]()}
    </div>`;
  },
  bind() {
    if (!S.est) refreshEstimates().then(() => S.route.view === 'models' && render());
    if (!S.modelUpgrades) loadModelUpgrades().then(() => S.route.view === 'models' && $('#modal').hidden && render());
    bindModelUpdates(); bindBuiltinModel();
    $$('[data-tab]').forEach((b) => b.addEventListener('click', () => { modelsTab = b.dataset.tab; render(); }));
    $$('[data-goto-stacks]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); go({ view: 'stacks' }); }));
    $('#import-gguf').addEventListener('click', async () => { const m = await call('models:import'); if (m) { await refreshModels(); render(); toast(`${m.name} added${m.vision ? ' (with vision)' : ''}.`); } });
    $('#open-folder').addEventListener('click', () => call('models:folder'));
    loadFound();
    $('#found-review')?.addEventListener('click', foundModal);
    $('#find-models').addEventListener('click', async () => {
      S.found = await call('models:found');
      if (S.found.length) foundModal(); else toast('No other models found. Checked LM Create, Jan, Ollama, GPT4All and Downloads.', 6000);
      render();
    });
    $$('[data-get]').forEach((b) => b.addEventListener('click', async () => {
      const m = [...S.catalog.text, ...S.catalog.media].find((x) => x.id === b.dataset.get);
      const est = S.est?.text[m.id] || S.est?.media[m.id];
      if (est?.fit === 'no' && !(await confirmBox(`${m.name} probably won't fit in this PC's memory (${est.label}). Download anyway?`, { yes: 'Download anyway', danger: false }))) return;
      await download({ catalogId: m.id }, m.name); render();
    }));
    $$('[data-remove]').forEach((b) => b.addEventListener('click', async () => {
      const m = S.installed.find((x) => x.id === b.dataset.remove);
      if (!(await confirmBox(`Remove ${m.name}?${m.source === 'imported' ? ' The file stays where it is.' : ` This frees ${gb(m.size)}.`}`, { yes: 'Remove' }))) return;
      await call('models:remove', m.id); await refreshModels(); render();
    }));
    $$('[data-repair]').forEach((b) => b.addEventListener('click', async () => {
      b.disabled = true; b.textContent = 'Checking…';
      try { const r = await call('models:repair', b.dataset.repair); S.downloads[r.id] = r; paintDownloads(); toast('Checking the files and downloading anything missing. You can keep working.'); } catch (err) { toast(err.message, 8000); }
      render();
    }));
    $$('[data-default]').forEach((b) => b.addEventListener('click', () => { S.data.prefs.defaultTarget = b.dataset.default; save(); render(); toast('Default model set.'); }));
    $$('[data-cat]').forEach((b) => b.addEventListener('click', () => { catFilter = b.dataset.cat; render(); }));
    $('#fits-only')?.addEventListener('change', (e) => { fitsOnly = e.target.checked; render(); });
    bindHf();
    if (modelsTab === 'trending') bindTrending();
    bindApi();
  },
};

function installedHTML() {
  if (!S.installed.length) return `<div class="notice info">Nothing installed yet. Start with the <a href="#" data-goto-stacks>Setup Advisor</a>, or browse <b>Text & vision</b>.</div>`;
  const kinds = { text: '💬 Text & vision', image: '🎨 Images', video: '🎬 Video' };
  const onlyStarter = S.installed.filter((m) => m.kind === 'text').every((m) => m.source === 'bundled');
  const note = onlyStarter ? '<div class="notice info" style="margin-bottom:12px"><b>💡 Only the starter models so far.</b> They are limited on their own; download stronger ones under <b>Text &amp; vision</b>, or let the <a href="#" data-goto-stacks>Setup Advisor</a> pick a team for your PC. Quicksilver adds new models to its team automatically.</div>' : '';
  return note + Object.entries(kinds).map(([k, label]) => {
    const list = S.installed.filter((m) => m.kind === k);
    if (!list.length) return '';
    return `<div class="section"><h2>${label}</h2></div><table class="list"><thead><tr><th>Model</th><th>Size</th><th>Abilities</th><th>On your PC</th><th></th></tr></thead><tbody>
      ${list.map((m) => {
        const est = k === 'text' ? S.est?.text[m.catalogId] : S.est?.media[m.catalogId];
        const def = S.data.prefs.defaultTarget === `local:${m.id}`;
        return `<tr><td><b>${esc(m.name)}</b>${m.source === 'imported' ? ` <span class="badge b-lemon">${esc(m.from ? `from ${m.from}` : 'imported')}</span>` : m.source === 'bundled' ? ' <span class="badge b-mint">included</span>' : ''}</td><td>${gb(m.size)}</td>
          <td>${m.vision ? '<span class="badge b-sky">👁 sees images</span>' : ''}${S.catalog.text.find((c) => c.id === m.catalogId)?.reasoning ? ' <span class="badge b-lav">🧠 thinks</span>' : ''}</td>
          <td>${est ? rateBadge(est, k === 'text' ? 'text' : 'media') : '<span class="small muted">n/a</span>'}${(S.running || []).some((x) => x.ready && x.file === m.files?.model) ? ` <span class="badge b-mint" title="Loaded in memory">● Running</span> <button class="btn small ghost" data-stop-model="${esc(m.files.model)}" title="Stop it and free its memory; it loads again when needed">Stop</button>` : ''}</td>
          <td class="row" style="justify-content:flex-end">${k === 'text' ? `${boostBtn(`local:${m.id}`)}${def ? '<span class="badge b-mint">default</span>' : `<button class="btn small" data-default="local:${m.id}">Make default</button>`}` : ''}${!['imported', 'bundled'].includes(m.source) ? `<button class="btn small" data-repair="${m.id}" title="Check the files and download again anything missing or damaged">Repair</button>` : ''}<button class="btn small danger" data-remove="${m.id}">Remove</button></td></tr>`;
      }).join('')}</tbody></table>`;
  }).join('');
}

// What a model produces, how accurate it is, and its rating for each kind of work (out of 5).
const ACC_LABELS = ['Basic', 'Basic', 'Fair', 'Good', 'Very high', 'Excellent'];
function modelAccuracy(m, kind) {
  const q = kind === 'text' ? Math.max(m.jobs?.general ?? 0, m.jobs?.office ?? 0, m.jobs?.research ?? 0) : m.quality ?? 0;
  const dots = Math.max(1, Math.min(5, Math.round(q / 2)));
  return { q, dots, label: ACC_LABELS[dots] };
}
function modelOutput(m, kind) {
  if (kind !== 'text') {
    const d = m.defaults || {};
    if (m.kind === 'video') return `Video clips, about ${Math.round((d.frames || 33) / (d.fps || 16))} s at ${d.width || 832}×${d.height || 480}${m.animate ? '; also animates photos' : ''}`;
    if (m.category === 'edit') return 'Edited photos, from a description of the change';
    return `Pictures up to ${d.width || 1024}×${d.height || 1024}${m.edit === 'img2img' ? '; can redraw a photo' : ''}`;
  }
  return ['Text answers', m.vision && 'reads photos & screenshots', m.reasoning && 'shows its reasoning', (m.jobs?.coding ?? 0) >= 7 && 'strong code', m.ctx >= 100000 && `long documents (${Math.round(m.ctx / 1024)}K)`].filter(Boolean).join(' · ');
}
function modelRatings(m, kind) {
  const star = (v) => Math.max(0.5, Math.round(v) / 2);
  if (kind !== 'text') return [['Quality', star(m.quality ?? 5)]];
  const j = m.jobs || {};
  const r = [['Everyday', star(j.general ?? 5)], ['Writing', star(Math.min(10, (j.general ?? 5) + (/Google|Meta|Mistral|Anthropic/.test(m.maker || '') ? 1 : 0) - (m.category === 'coding' ? 2 : 0)))], ['Research', star(j.research ?? 5)], ['Documents', star(j.office ?? 5)], ['Coding', star(j.coding ?? 5)]];
  if (m.vision) r.push(['Photos', star(j.vision ?? 5)]);
  return r;
}
function modelProfileHTML(m, kind) {
  const acc = modelAccuracy(m, kind);
  return `<div class="mp">
    <div class="mp-row"><span class="mp-k">Output</span><span class="mp-v">${esc(modelOutput(m, kind))}</span></div>
    <div class="mp-row"><span class="mp-k">Accuracy</span><span class="mp-v"><span class="acc-dots">${'●'.repeat(acc.dots)}<i>${'●'.repeat(5 - acc.dots)}</i></span> ${acc.label}</span></div>
    <div class="mp-rates">${modelRatings(m, kind).map(([k, v]) => `<span class="mp-rate"><span>${k}</span><b>${tenText(v)}</b></span>`).join('')}</div>
    ${kind === 'text' ? scoreChipsHTML(scoresFor(m.id)) || '<div class="sc-row"><span class="sc-k">Tested</span><span class="small muted">No published test scores for this model.</span></div>' : ''}
    ${createRowHTML(modelCreate(m), { all: true })}
  </div>`;
}

function modelCard(m, est, kind) {
  const inst = S.installed.some((x) => x.catalogId === m.id);
  const tags = [];
  if (isFeatured(m.id)) tags.push('<span class="badge b-lemon" title="One of the best models right now; this list updates online">⭐ Featured</span>');
  if (m.remote) tags.push('<span class="badge b-mint">🆕 New</span>');
  if (m.vision) tags.push('<span class="badge b-sky">👁 vision</span>');
  if (m.reasoning) tags.push('<span class="badge b-lav">🧠 thinks</span>');
  if (m.activeGB) tags.push('<span class="badge b-mint">⚡ mixture-of-experts</span>');
  if (m.ctx >= 100000) tags.push(`<span class="badge b-lemon">📜 ${Math.round(m.ctx / 1024)}K context</span>`);
  if (m.edit === 'instruct') tags.push('<span class="badge b-peach">🪄 edit by instruction</span>');
  if (m.animate) tags.push('<span class="badge b-peach">📷→🎬 animates photos</span>');
  return `<div class="card model-card" data-model-card="${esc(m.id)}" tabindex="0" title="Click for details">
    <div class="row"><h3 class="grow">${esc(m.name)}</h3><span class="small" style="font-weight:800">${(m.sizeGB + (m.mmprojGB || 0)).toFixed(1)} GB</span></div>
    <div class="meta" style="margin:4px 0 8px">${esc(m.maker)}${m.params ? ` · ${esc(m.params)} parameters` : ''}</div>
    <p class="desc" style="margin:0 0 10px">${esc(m.blurb)}</p>
    ${modelProfileHTML(m, kind)}
    <div class="row" style="margin-bottom:10px">${tags.join('')}</div>
    <div class="row" style="margin-bottom:${kind === 'text' && est?.wordsPerSec ? 2 : 12}px"><span class="small" style="font-weight:700">On your PC:</span>${rateBadge(est, kind)}</div>
    ${kind === 'text' && est?.wordsPerSec ? timesHTML(WORDS.chat / Math.max(0.1, est.wordsPerSec), { label: false }) : ''}
    <div class="row">${S.downloads[m.id] ? downloadBox(m.id) : inst ? '<span class="badge b-mint">✓ Installed</span>' : `<button class="btn primary small" data-get="${m.id}">Download</button>`}<span class="grow"></span>${kind === 'text' ? boostBtn(m.id) : ''}<button class="btn small ghost" data-details="${esc(m.id)}">${est?.rating === 'wont' ? 'Why? What would it need?' : 'Details'}</button></div>
  </div>`;
}

function filterBar(cats) {
  return `<div class="row" style="margin-bottom:16px">${[['all', { label: 'All' }], ...Object.entries(cats)].map(([k, c]) => `<button class="btn small ${catFilter === k ? 'on' : ''}" data-cat="${k}">${esc(c.label)}</button>`).join('')}
    <label class="row small" style="margin-left:auto;font-weight:700"><input type="checkbox" id="fits-only" ${fitsOnly ? 'checked' : ''}> Only show models that fit my PC</label></div>`;
}

function textHTML() {
  const cats = S.catalog.textCategories;
  if (catFilter !== 'all' && !cats[catFilter]) catFilter = 'all';
  const order = { great: 0, good: 1, ok: 2, slow: 3, wont: 4 };
  return `${filterBar(cats)}${Object.entries(cats).filter(([k]) => catFilter === 'all' || catFilter === k).map(([k, c]) => {
    const list = S.catalog.text.filter((m) => m.category === k && !m.retired && (!fitsOnly || S.est?.text[m.id]?.fit !== 'no'));
    if (!list.length) return '';
    return `<div class="section"><h2>${esc(c.label)} <span class="small muted" style="font-weight:600">· ${list.length}</span></h2>${c.note ? `<span class="small muted">${esc(c.note)}</span>` : ''}</div><div class="cards">${list.sort((a, b) => (order[S.est?.text[a.id]?.rating] ?? 5) - (order[S.est?.text[b.id]?.rating] ?? 5) || isFeatured(b.id) - isFeatured(a.id) || a.sizeGB - b.sizeGB).map((m) => modelCard(m, S.est?.text[m.id], 'text')).join('')}</div>`;
  }).join('')}`;
}

function mediaHTML() {
  const cats = S.catalog.mediaCategories;
  if (catFilter !== 'all' && !cats[catFilter]) catFilter = 'all';
  return `<div class="notice info" style="margin-bottom:14px">Image and video models run with stable-diffusion.cpp on your graphics card. Video generation needs a strong card (8 GB+); on the processor alone it takes a very long time.</div>
    ${filterBar(cats)}${Object.entries(cats).filter(([k]) => catFilter === 'all' || catFilter === k).map(([k, c]) => {
      const list = S.catalog.media.filter((m) => !m.retired && m.category === k && (!fitsOnly || S.est?.media[m.id]?.fit !== 'no'));
      if (!list.length) return '';
      return `<div class="section"><h2>${esc(c.label)}</h2></div><div class="cards">${list.map((m) => modelCard(m, S.est?.media[m.id], 'media')).join('')}</div>`;
    }).join('')}`;
}

// ---------- trending now (Hugging Face, refreshed every few hours) ----------

let trend = null;      // { at, list } or { error }
let trendType = 'all';
const TREND_TYPES = { all: 'All', general: 'Everyday', reasoning: 'Reasoning', coding: 'Coding', vision: 'Vision', open: 'Uncensored' };
async function loadTrending(force = false) {
  try { trend = await qs.call('models:trending', force); } catch (err) { trend = { error: err.message }; }
  if (S.route.view === 'models' && modelsTab === 'trending') render();
}
// Keep it fresh while the app is open.
setInterval(() => { if (!S.config?.offline) loadTrending(false); }, 60 * 60 * 1000);

function trendingHTML() {
  if (!trend) { loadTrending(false); return '<div class="empty">Loading what\'s trending…</div>'; }
  if (trend.error) return `<div class="notice">Couldn't load trending models: ${esc(trend.error)} <button class="btn small" id="tr-refresh">Try again</button></div>`;
  const ago = Math.max(1, Math.round((Date.now() - trend.at) / 60000));
  const list = trend.list.filter((m) => trendType === 'all' || m.type === trendType);
  const rate = (e) => (e ? `<span class="badge rate-${e.rating}">${esc(e.label)}${e.wordsPerSec ? ` · ~${Math.round(e.wordsPerSec)} words/s` : ''}</span>` : '<span class="small muted">size unknown</span>');
  return `<div class="row" style="margin-bottom:12px;flex-wrap:wrap"><p class="muted grow" style="margin:0">The open models people are downloading most on Hugging Face right now, newest hits first. Updated ${ago < 60 ? `${ago} min` : `${Math.round(ago / 60)} h`} ago; it refreshes by itself every few hours.</p><button class="btn small" id="tr-refresh">↻ Refresh</button></div>
    <div class="row" style="margin-bottom:14px;flex-wrap:wrap">${Object.entries(TREND_TYPES).map(([k, l]) => `<button class="btn small ${trendType === k ? 'on' : ''}" data-trtype="${k}">${l}${k === 'all' ? '' : ` · ${trend.list.filter((m) => m.type === k).length}`}</button>`).join('')}</div>
    ${list.length ? `<table class="list"><thead><tr><th>#</th><th>Model</th><th>Type</th><th>Size</th><th>On your PC</th><th>Popularity</th><th></th></tr></thead><tbody>${list.map((m, i) => `<tr>
      <td class="muted">${i + 1}</td>
      <td><b>${esc(m.repo.split('/').pop())}</b><div class="small muted">${esc(m.repo.split('/')[0])}${m.created ? ` · new ${esc(String(m.created).slice(0, 10))}` : ''}${m.catalogId ? ' · <span class="badge b-mint">in our catalog</span>' : ''}</div></td>
      <td><span class="badge b-lav">${esc(TREND_TYPES[m.type] || m.type)}</span></td>
      <td>${m.sizeGB ? `~${m.sizeGB} GB` : '—'}</td>
      <td>${rate(m.est)}</td>
      <td class="small">❤ ${m.likes.toLocaleString()} · ⬇ ${m.downloads.toLocaleString()}</td>
      <td><button class="btn small primary" data-hf="${esc(m.repo)}">Download…</button></td></tr>`).join('')}</tbody></table>` : '<div class="empty">Nothing trending in this group right now.</div>'}`;
}
function bindTrending() {
  $('#tr-refresh')?.addEventListener('click', (e) => { e.target.textContent = 'Refreshing…'; loadTrending(true); });
  $$('[data-trtype]').forEach((b) => b.addEventListener('click', () => { trendType = b.dataset.trtype; render(); }));
}

// ---------- Hugging Face search ----------

function hfHTML() {
  return `<p class="muted">Search every GGUF model on Hugging Face: thousands of models, including the newest releases. Pick a size (quantization) that fits your PC; smaller sizes run faster but are slightly less accurate.</p>
    <form class="row" id="hf-form" style="margin-bottom:16px"><input id="hf-q" type="search" class="grow" placeholder="e.g. Qwen3, Llama, Mistral, DeepSeek, medical, legal, German…" value="${esc(hfQuery)}"><button class="btn primary">Search</button></form>
    <div id="hf-out">${hfResults === 'loading' ? '<div class="empty">Searching…</div>' : Array.isArray(hfResults) ? (hfResults.length ? `<table class="list"><thead><tr><th>Model</th><th>Downloads</th><th>Tags</th><th></th></tr></thead><tbody>${hfResults.map((r) => `<tr><td><b>${esc(r.repo)}</b></td><td>${r.downloads.toLocaleString()}</td><td>${r.tags.map((t) => `<span class="badge b-lav">${esc(t)}</span>`).join(' ')}</td><td><button class="btn small" data-hf="${esc(r.repo)}">Choose size…</button></td></tr>`).join('')}</tbody></table>` : '<div class="empty">No GGUF models found.</div>') : ''}</div>`;
}

function bindHf() {
  $('#hf-form')?.addEventListener('submit', async (e) => {
    e.preventDefault();
    hfQuery = $('#hf-q').value.trim();
    hfResults = 'loading'; render();
    try { hfResults = await qs.call('models:search', hfQuery); } catch (err) { hfResults = []; toast(err.message, 6000); }
    render();
  });
  $$('[data-hf]').forEach((b) => b.addEventListener('click', () => chooseQuant(b.dataset.hf)));
}

async function chooseQuant(repo) {
  const box = openModal(`<h2>${esc(repo)}</h2><div class="empty">Reading the file list…</div>`);
  let info;
  try { info = await qs.call('models:options', repo); } catch (err) { box.innerHTML = `<h2>${esc(repo)}</h2><div class="notice">${esc(err.message)}</div><div class="modal-actions"><button class="btn" data-close>Close</button></div>`; $$('[data-close]', box).forEach((x) => x.addEventListener('click', closeModal)); return; }
  const hw = S.est?.hardware || { ramGB: 8, vramGB: 0 };
  const budget = Math.max(hw.vramGB || 0, 0) + hw.ramGB * 0.8 - 2;
  box.innerHTML = `<h2>${esc(repo)}</h2>
    <p class="help">${info.mmproj ? '👁 Includes vision: it can see images. ' : ''}Q4_K_M is the usual best balance of size and accuracy.</p>
    <table class="list"><thead><tr><th>Size option</th><th>Download</th><th>Fits?</th><th></th></tr></thead><tbody>
    ${info.options.slice(0, 14).map((o) => { const g = o.size / 1024 ** 3; const fit = g + 0.8 <= (hw.vramGB || 0) * 0.92 ? '<span class="badge rate-great">fits graphics card</span>' : g + 1 <= budget ? '<span class="badge rate-ok">fits memory</span>' : '<span class="badge rate-wont">too big</span>'; return `<tr><td><b>${esc(o.quant)}</b>${o.files.length > 1 ? ` <span class="small muted">(${o.files.length} parts)</span>` : ''}</td><td>${gb(o.size)}</td><td>${fit}</td><td><button class="btn small primary" data-q="${esc(o.quant)}">Download</button></td></tr>`; }).join('')}
    </tbody></table><div class="modal-actions"><button class="btn" data-close>Cancel</button></div>`;
  $$('[data-close]', box).forEach((x) => x.addEventListener('click', closeModal));
  $$('[data-q]', box).forEach((x) => x.addEventListener('click', async () => { closeModal(); await download({ repo, quant: x.dataset.q }, repo); modelsTab = 'installed'; render(); }));
}

// ---------- API connections ----------

const FREE_BADGE = {
  free: '<span class="badge b-mint" title="Has a free plan">✓ Free</span>',
  some: '<span class="badge b-lemon" title="Free credits or some free models, then paid">◐ Free to start, then paid</span>',
  local: '<span class="badge b-mint">✓ Free · on this PC</span>',
  paid: '<span class="badge b-peach">$ Paid</span>',
};

function apiHTML() {
  return `<p class="muted">Optional. Connect cloud AI services to use their models next to your local ones, as the lead of a team, as your double-checker, or for image generation. Keys are encrypted on this PC and only sent to that service.</p>
    ${fusionHTML()}
    ${S.providers.length ? `<div class="section"><h2>Connected (${S.providers.length})</h2><span class="small muted">Connect as many as you like, even two accounts with the same service: each appears separately in every model menu.</span></div><div class="cards">${S.providers.map((p) => `<div class="card">
      <div class="row"><h3 class="grow">${esc(p.name)}</h3>${p.hasKey || p.noKey ? '<span class="badge b-mint">✓ connected</span>' : '<span class="badge b-pink">needs key</span>'}</div>
      <div class="meta" style="margin:4px 0 8px">${esc(p.baseUrl)}</div>
      <div class="row small" style="margin-bottom:10px">${(p.models || []).slice(0, 8).map((m) => `<span class="badge b-lav">${esc(m)}</span>`).join('')}${(p.models || []).length > 8 ? `<span class="small muted">+${p.models.length - 8} more</span>` : ''}${(p.imageModels || []).map((m) => `<span class="badge b-peach">🎨 ${esc(m)}</span>`).join('')}</div>
      <div class="row"><button class="btn small" data-api-refresh="${p.id}">Refresh models</button><button class="btn small" data-api-edit="${p.id}">Edit</button><button class="btn small danger" data-api-del="${p.id}">Remove</button></div>
    </div>`).join('')}</div>` : ''}
    <div class="section"><h2>Add a connection</h2><span class="small muted">Every cloud AI that works with Quicksilver, marked free or paid, with the best model to use. <a href="#" data-guide="apis">Which should I choose? What's a dev plan? Calculator: alone vs through Quicksilver</a></span></div>
    <div id="presets"></div>`;
}

// Fusion: combine any AIs (on this PC and in the cloud) into one that answers as a team.
function fusionHTML() {
  return `<div class="card fusion-card"><div class="row"><span class="emoji-badge">⚗️</span><div class="grow"><b>Mix cloud AIs with your own models in a Fusion</b>
      <div class="small muted">Connected cloud AIs can be fused with the models on this PC into one AI. Fusions live on their own tab under Stacks &amp; Fusion.</div></div>
      <button class="btn" id="fusion-open">Open ⚗️ Fusion</button></div></div>`;
}
document.addEventListener('click', (e) => {
  if (e.target.closest('#fusion-open')) { stacksTab = 'fusion'; go({ view: 'stacks' }); return; }
  const f = e.target.closest('[data-fusion-chat]');
  if (f) { newChat(); const c = chatById(S.route.id); if (c) { c.target = `stack:${f.dataset.fusionChat}`; save(); render(); } }
});

async function bindApi() {
  if (modelsTab !== 'api') return;
  const presets = await qs.call('providers:presets');
  const box = $('#presets');
  if (!box) return;
  // Free options first, so people can try cloud models without paying.
  const groups = [['Free', (p) => p.free === 'free'], ['Free to start, then paid', (p) => p.free === 'some'], ['Paid', (p) => p.free === 'paid'], ['Other', (p) => !p.free]];
  box.innerHTML = `<p class="small muted" style="margin:-4px 0 12px">Free plans have daily limits and can change; each card links to the current prices.</p>` + groups.map(([title, test]) => {
    const list = Object.entries(presets).filter(([, p]) => test(p));
    return list.length ? `<h3 class="small muted" style="margin:14px 0 8px;text-transform:uppercase;letter-spacing:.05em">${title}</h3><div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(250px,1fr))">${list.map(([k, p]) => `<button class="card" data-preset="${k}" style="text-align:left">
      <div class="row"><h3 class="grow">${esc(p.name)}</h3>${FREE_BADGE[p.free] || ''}</div>
      ${devBadgeHTML(k) ? `<div style="margin-top:6px">${devBadgeHTML(k)}</div>` : ''}
      <div class="small muted" style="font-weight:600;margin-top:6px">${esc(p.freeNote || (k === 'custom' ? 'Any OpenAI-compatible endpoint' : 'Needs an API key'))}</div>
      ${p.best ? `<div class="small" style="margin-top:6px">⭐ <b>Best to link:</b> <code>${esc(p.best)}</code>${p.bestWhy ? ` <span class="muted">· ${esc(p.bestWhy)}</span>` : ''}</div>` : ''}
      ${scoreChipsHTML(cloudScoresFor(k), { label: 'Tested', note: cloudScoresFor(k)?.model ? `Scores of ${cloudScoresFor(k).model}.` : '' })}
      ${(p.imageModels || []).length ? createRowHTML(createRatings(p.imageModels.map((x) => ({ cloudImage: x })))) : ''}
      ${S.providers.some((x) => x.preset === k) ? '<div class="small" style="margin-top:4px"><span class="badge b-mint">✓ connected</span> · click to connect another account</div>' : ''}</button>`).join('')}</div>` : '';
  }).join('');
  $$('[data-preset]').forEach((b) => b.addEventListener('click', () => editProvider({ preset: b.dataset.preset }, presets)));
  $$('[data-api-edit]').forEach((b) => b.addEventListener('click', () => editProvider(S.providers.find((p) => p.id === b.dataset.apiEdit), presets)));
  $$('[data-api-del]').forEach((b) => b.addEventListener('click', async () => { if (!(await confirmBox('Remove this connection and its saved key?'))) return; await call('providers:remove', b.dataset.apiDel); await refreshProviders(); render(); }));
  $$('[data-api-refresh]').forEach((b) => b.addEventListener('click', async () => { b.disabled = true; try { await call('providers:refresh', b.dataset.apiRefresh); await refreshProviders(); render(); toast('Model list updated.'); } catch { b.disabled = false; } }));
}

function editProvider(p, presets) {
  const pre = presets[p.preset];
  const b = openModal(`<h2>${p.id ? 'Edit' : 'Connect'} ${esc(pre.name)}</h2>
    <div class="stack-v">
      <div class="field"><label for="pv-name">Name</label><input id="pv-name" value="${esc(p.name || pre.name)}"></div>
      <div class="field"><label for="pv-url">Address (base URL)</label><input id="pv-url" value="${esc(p.baseUrl || pre.baseUrl)}" ${p.preset === 'custom' ? 'placeholder="https://…/v1"' : ''}></div>
      ${pre.freeNote ? `<div class="notice ${['free', 'some', 'local'].includes(pre.free) ? 'info' : ''}" style="margin:0">${FREE_BADGE[pre.free] || ''} ${esc(pre.freeNote)}${pre.priceUrl ? ` <a href="${esc(pre.priceUrl)}">Current prices and limits</a>` : ''}</div>` : ''}
      ${pre.noKey ? '' : `<div class="field"><label for="pv-key">API key</label><span class="help">${p.hasKey ? 'A key is saved. Paste a new one to replace it.' : `Get one at <a href="${esc(pre.keyUrl || '#')}">${esc(pre.keyUrl || 'the provider\'s website')}</a>.`}</span><input id="pv-key" type="password" autocomplete="off" placeholder="Paste key"></div>`}
      <div class="field"><label for="pv-models">Models</label><span class="help">One per line. Leave empty and press "Save & load models" to fetch the list.</span><textarea id="pv-models" rows="4">${esc((p.models || pre.models || []).join('\n'))}</textarea></div>
      <div class="field"><label for="pv-img">Image models (optional)</label><input id="pv-img" value="${esc((p.imageModels || pre.imageModels || []).join(', '))}" placeholder="e.g. gpt-image-1"></div>
      <label class="row"><input type="checkbox" id="pv-vision" ${(p.vision ?? pre.vision) ? 'checked' : ''}> <b>Its models can see images</b></label>
    </div>
    <div class="modal-actions"><button class="btn" data-close>Cancel</button><button class="btn primary" id="pv-save">Save & load models</button></div>`);
  b.querySelector('#pv-save').addEventListener('click', async () => {
    const entry = { ...p, name: b.querySelector('#pv-name').value.trim(), baseUrl: b.querySelector('#pv-url').value.trim(), models: b.querySelector('#pv-models').value.split('\n').map((x) => x.trim()).filter(Boolean), imageModels: b.querySelector('#pv-img').value.split(',').map((x) => x.trim()).filter(Boolean), vision: b.querySelector('#pv-vision').checked };
    if (!entry.baseUrl) { toast('Enter the address.'); return; }
    const saved = await call('providers:save', entry, b.querySelector('#pv-key')?.value || '');
    closeModal();
    try { await qs.call('providers:refresh', saved.id); toast('Connected. Model list loaded.'); } catch (err) { toast(`Saved, but loading models failed: ${err.message}`, 7000); }
    await refreshProviders(); render();
  });
}
