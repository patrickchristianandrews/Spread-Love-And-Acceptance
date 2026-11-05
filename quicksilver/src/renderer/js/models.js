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
    const tabs = { installed: `On this PC (${S.installed.length})`, text: 'Text & vision', media: 'Images & video', hf: 'Search Hugging Face', api: `Connect an API (${S.providers.length})` };
    return `<div class="page">
      <div class="page-head"><h1>Models</h1>
        <button class="btn" id="find-models">Find models on this PC</button><button class="btn" id="import-gguf">Import a .gguf file</button><button class="btn ghost" id="open-folder">Open models folder</button></div>
      <p class="lede">Free, open models run on your PC: private, offline, no account. Ratings show how each one will run on <b>your</b> hardware. Not sure? Let the <a href="#" data-goto-stacks>Stack Advisor</a> choose.</p>
      ${foundBanner()}
      <div class="tabs" role="tablist">${Object.entries(tabs).map(([k, l]) => `<button class="tab ${modelsTab === k ? 'active' : ''}" data-tab="${k}" role="tab">${esc(l)}</button>`).join('')}</div>
      ${({ installed: installedHTML, text: textHTML, media: mediaHTML, hf: hfHTML, api: apiHTML })[modelsTab]()}
    </div>`;
  },
  bind() {
    if (!S.est) refreshEstimates().then(() => S.route.view === 'models' && render());
    $$('[data-tab]').forEach((b) => b.addEventListener('click', () => { modelsTab = b.dataset.tab; render(); }));
    $$('[data-goto-stacks]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); go({ view: 'stacks' }); }));
    $('#import-gguf').addEventListener('click', async () => { const m = await call('models:import'); if (m) { await refreshModels(); render(); toast(`${m.name} added${m.vision ? ' (with vision)' : ''}.`); } });
    $('#open-folder').addEventListener('click', () => call('models:folder'));
    loadFound();
    $('#found-review')?.addEventListener('click', foundModal);
    $('#find-models').addEventListener('click', async () => {
      S.found = await call('models:found');
      if (S.found.length) foundModal(); else toast('No other models found. Checked LM Studio, Jan, Ollama, GPT4All and Downloads.', 6000);
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
    bindApi();
  },
};

function installedHTML() {
  if (!S.installed.length) return `<div class="notice info">Nothing installed yet. Start with the <a href="#" data-goto-stacks>Stack Advisor</a>, or browse <b>Text & vision</b>.</div>`;
  const kinds = { text: '💬 Text & vision', image: '🎨 Images', video: '🎬 Video' };
  return Object.entries(kinds).map(([k, label]) => {
    const list = S.installed.filter((m) => m.kind === k);
    if (!list.length) return '';
    return `<div class="section"><h2>${label}</h2></div><table class="list"><thead><tr><th>Model</th><th>Size</th><th>Abilities</th><th>On your PC</th><th></th></tr></thead><tbody>
      ${list.map((m) => {
        const est = k === 'text' ? S.est?.text[m.catalogId] : S.est?.media[m.catalogId];
        const def = S.data.prefs.defaultTarget === `local:${m.id}`;
        return `<tr><td><b>${esc(m.name)}</b>${m.source === 'imported' ? ` <span class="badge b-lemon">${esc(m.from ? `from ${m.from}` : 'imported')}</span>` : m.source === 'bundled' ? ' <span class="badge b-mint">included</span>' : ''}</td><td>${gb(m.size)}</td>
          <td>${m.vision ? '<span class="badge b-sky">👁 sees images</span>' : ''}${S.catalog.text.find((c) => c.id === m.catalogId)?.reasoning ? ' <span class="badge b-lav">🧠 thinks</span>' : ''}</td>
          <td>${est ? rateBadge(est, k === 'text' ? 'text' : 'media') : '<span class="small muted">n/a</span>'}</td>
          <td class="row" style="justify-content:flex-end">${k === 'text' ? (def ? '<span class="badge b-mint">default</span>' : `<button class="btn small" data-default="local:${m.id}">Make default</button>`) : ''}${!['imported', 'bundled'].includes(m.source) ? `<button class="btn small" data-repair="${m.id}" title="Check the files and download again anything missing or damaged">Repair</button>` : ''}<button class="btn small danger" data-remove="${m.id}">Remove</button></td></tr>`;
      }).join('')}</tbody></table>`;
  }).join('');
}

function modelCard(m, est, kind) {
  const inst = S.installed.some((x) => x.catalogId === m.id);
  const tags = [];
  if (m.vision) tags.push('<span class="badge b-sky">👁 vision</span>');
  if (m.reasoning) tags.push('<span class="badge b-lav">🧠 thinks</span>');
  if (m.activeGB) tags.push('<span class="badge b-mint">⚡ mixture-of-experts</span>');
  if (m.ctx >= 100000) tags.push(`<span class="badge b-lemon">📜 ${Math.round(m.ctx / 1024)}K context</span>`);
  if (m.edit === 'instruct') tags.push('<span class="badge b-peach">🪄 edit by instruction</span>');
  if (m.animate) tags.push('<span class="badge b-peach">📷→🎬 animates photos</span>');
  return `<div class="card ${est?.rating === 'great' && !inst ? '' : ''}">
    <div class="row"><h3 class="grow">${esc(m.name)}</h3><span class="small" style="font-weight:800">${(m.sizeGB + (m.mmprojGB || 0)).toFixed(1)} GB</span></div>
    <div class="meta" style="margin:4px 0 8px">${esc(m.maker)}${m.params ? ` · ${esc(m.params)} parameters` : ''}</div>
    <p class="desc" style="margin:0 0 10px">${esc(m.blurb)}</p>
    <div class="row" style="margin-bottom:10px">${tags.join('')}</div>
    <div class="row" style="margin-bottom:12px"><span class="small" style="font-weight:700">On your PC:</span>${rateBadge(est, kind)}</div>
    ${S.downloads[m.id] ? downloadBox(m.id) : inst ? '<span class="badge b-mint">✓ Installed</span>' : `<button class="btn primary small" data-get="${m.id}">Download</button>`}
  </div>`;
}

function filterBar(cats) {
  return `<div class="row" style="margin-bottom:16px">${[['all', { label: 'All', icon: '✨' }], ...Object.entries(cats)].map(([k, c]) => `<button class="btn small ${catFilter === k ? 'on' : ''}" data-cat="${k}">${c.icon} ${esc(c.label)}</button>`).join('')}
    <label class="row small" style="margin-left:auto;font-weight:700"><input type="checkbox" id="fits-only" ${fitsOnly ? 'checked' : ''}> Only show models that fit my PC</label></div>`;
}

function textHTML() {
  const cats = S.catalog.textCategories;
  if (catFilter !== 'all' && !cats[catFilter]) catFilter = 'all';
  const order = { great: 0, good: 1, ok: 2, slow: 3, wont: 4 };
  return `${filterBar(cats)}${Object.entries(cats).filter(([k]) => catFilter === 'all' || catFilter === k).map(([k, c]) => {
    const list = S.catalog.text.filter((m) => m.category === k && (!fitsOnly || S.est?.text[m.id]?.fit !== 'no'));
    if (!list.length) return '';
    return `<div class="section"><h2>${c.icon} ${esc(c.label)}</h2></div><div class="cards">${list.sort((a, b) => (order[S.est?.text[a.id]?.rating] ?? 5) - (order[S.est?.text[b.id]?.rating] ?? 5) || a.sizeGB - b.sizeGB).map((m) => modelCard(m, S.est?.text[m.id], 'text')).join('')}</div>`;
  }).join('')}`;
}

function mediaHTML() {
  const cats = S.catalog.mediaCategories;
  if (catFilter !== 'all' && !cats[catFilter]) catFilter = 'all';
  return `<div class="notice info" style="margin-bottom:14px">Image and video models run with stable-diffusion.cpp on your graphics card. Video generation needs a strong card (8 GB+); on the processor alone it takes a very long time.</div>
    ${filterBar(cats)}${Object.entries(cats).filter(([k]) => catFilter === 'all' || catFilter === k).map(([k, c]) => {
      const list = S.catalog.media.filter((m) => m.category === k && (!fitsOnly || S.est?.media[m.id]?.fit !== 'no'));
      if (!list.length) return '';
      return `<div class="section"><h2>${c.icon} ${esc(c.label)}</h2></div><div class="cards">${list.map((m) => modelCard(m, S.est?.media[m.id], 'media')).join('')}</div>`;
    }).join('')}`;
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

function apiHTML() {
  return `<p class="muted">Optional. Connect cloud AI services to use their models next to your local ones, as the lead of a stack, as your fact checker, or for image generation. Keys are encrypted on this PC and only sent to that service.</p>
    ${S.providers.length ? `<div class="section"><h2>Connected</h2></div><div class="cards">${S.providers.map((p) => `<div class="card">
      <div class="row"><h3 class="grow">${esc(p.name)}</h3>${p.hasKey || p.noKey ? '<span class="badge b-mint">✓ connected</span>' : '<span class="badge b-pink">needs key</span>'}</div>
      <div class="meta" style="margin:4px 0 8px">${esc(p.baseUrl)}</div>
      <div class="row small" style="margin-bottom:10px">${(p.models || []).slice(0, 8).map((m) => `<span class="badge b-lav">${esc(m)}</span>`).join('')}${(p.models || []).length > 8 ? `<span class="small muted">+${p.models.length - 8} more</span>` : ''}${(p.imageModels || []).map((m) => `<span class="badge b-peach">🎨 ${esc(m)}</span>`).join('')}</div>
      <div class="row"><button class="btn small" data-api-refresh="${p.id}">Refresh models</button><button class="btn small" data-api-edit="${p.id}">Edit</button><button class="btn small danger" data-api-del="${p.id}">Remove</button></div>
    </div>`).join('')}</div>` : ''}
    <div class="section"><h2>Add a connection</h2></div>
    <div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr))" id="presets"></div>`;
}

async function bindApi() {
  if (modelsTab !== 'api') return;
  const presets = await qs.call('providers:presets');
  const box = $('#presets');
  if (!box) return;
  box.innerHTML = Object.entries(presets).map(([k, p]) => `<button class="card" data-preset="${k}" style="text-align:left"><h3>${esc(p.name)}</h3><div class="small muted" style="font-weight:600">${p.noKey ? 'Runs on this PC, no key' : k === 'custom' ? 'Any OpenAI-compatible endpoint' : 'Needs an API key'}</div></button>`).join('');
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
