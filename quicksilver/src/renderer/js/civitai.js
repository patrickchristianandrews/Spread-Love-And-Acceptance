// Models → Civitai: browse the biggest library of community picture models live, and download
// checkpoints (whole models) and LoRAs (small add-ons for a style, character or concept) straight
// from Civitai. Only what Quicksilver's image engine runs is listed; models of real people and
// anything flagged as involving minors are never shown. Adult results only with the switch on
// (and never while the parental lock is on).
'use strict';

const civ = { type: 'Checkpoint', base: 'all', sort: 'Most Downloaded', query: '', nsfw: false, items: null, next: null, loading: false, error: '' };
const CIV_BASES = { all: 'All', sd15: 'SD 1.5', sdxl: 'SDXL', pony: 'Pony', illustrious: 'Illustrious / NoobAI', flux: 'FLUX (LoRAs)' };
const civAdultAllowed = () => !(typeof lockOn === 'function' && lockOn()) || (typeof unlockedUntilClose !== 'undefined' && unlockedUntilClose);

async function civSearch(more = false) {
  if (civ.loading) return;
  civ.loading = true; civ.error = '';
  if (!more) { civ.items = null; civ.next = null; }
  if (S.route.view === 'models' && modelsTab === 'civitai') render();
  try {
    const r = await call('civitai:search', { query: civ.query, type: civ.type, base: civ.base, sort: civ.sort, nsfw: civ.nsfw && civAdultAllowed(), cursor: more ? civ.next : '' });
    civ.items = [...(more ? civ.items || [] : []), ...r.items]; civ.next = r.next;
  } catch (err) { civ.error = err.message; civ.items ||= []; }
  civ.loading = false;
  if (S.route.view === 'models' && modelsTab === 'civitai') render();
}

const civHave = (it) => S.installed.some((m) => m.civitai?.versionId === it.versionId);
function civCard(it) {
  const size = it.file.sizeKB * 1024;
  const fits = it.type === 'checkpoint' ? (it.family === 'sd15' ? 'runs on 4 GB+ graphics cards' : 'best on 8 GB+ graphics cards') : `works with ${it.family === 'sd15' ? 'SD 1.5' : it.family === 'flux' ? 'FLUX' : 'SDXL, Pony & Illustrious'} models`;
  const id = `civitai-${it.versionId}`;
  const action = civHave(it) ? '<span class="badge b-mint">✓ Installed</span>' : S.downloads[id] ? downloadBox(id) : `<button class="btn small primary" data-civ-get="${it.versionId}">Download · ${gb(size)}</button>`;
  return `<div class="card civ-card">
    ${it.image ? `<img src="${esc(it.image)}" alt="" loading="lazy" style="width:100%;aspect-ratio:4/5;object-fit:cover;border-radius:10px;margin-bottom:8px">` : '<div class="empty" style="aspect-ratio:4/5;margin-bottom:8px">No preview</div>'}
    <div class="row"><b class="grow">${esc(it.name)}</b></div>
    <div class="row" style="gap:4px;flex-wrap:wrap;margin:6px 0"><span class="badge b-lav">${it.type === 'lora' ? '🧩 LoRA' : '🎨 Checkpoint'}</span><span class="badge b-sky">${esc(it.base)}</span>${it.nsfw ? '<span class="badge b-pink">🔞 adult</span>' : ''}</div>
    <div class="small muted">by ${esc(it.creator || 'unknown')} · ⬇ ${it.downloads.toLocaleString()} · 👍 ${it.likes.toLocaleString()} · ${esc(fits)}</div>
    ${it.trainedWords.length ? `<div class="small" style="margin-top:4px">Trigger words: <code>${esc(it.trainedWords.slice(0, 3).join(', ').slice(0, 120))}</code></div>` : ''}
    <div class="row" style="margin-top:8px">${action}<a href="#" class="small" data-civ-page="${esc(it.page)}">civitai.com ↗</a></div></div>`;
}

function civitaiHTML() {
  if (civ.items === null && !civ.loading && !civ.error) setTimeout(() => civSearch(false), 0);
  const sel = (id, opts, cur) => `<select id="${id}">${Object.entries(opts).map(([k, l]) => `<option value="${esc(k)}" ${k === cur ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select>`;
  const hasKey = Boolean(S.config?.secrets?.civitai);
  return `<p class="muted">Browse <b>Civitai</b>, the biggest library of community picture models, live: <b>checkpoints</b> (whole models) and <b>LoRAs</b> (small add-ons that teach a style, character, outfit or concept; switch them on in Create). Only models Quicksilver can run are listed. Models of real people and anything flagged as involving minors are never shown.</p>
    <form class="row" id="civ-form" style="margin-bottom:10px;flex-wrap:wrap;gap:8px">
      <input id="civ-q" type="search" class="grow" placeholder="Search Civitai: realistic, anime, watercolor, a style or a character…" value="${esc(civ.query)}">
      ${sel('civ-type', { Checkpoint: '🎨 Checkpoints', LORA: '🧩 LoRAs' }, civ.type)}
      ${sel('civ-base', CIV_BASES, civ.base)}
      ${sel('civ-sort', { 'Most Downloaded': 'Most downloaded', 'Highest Rated': 'Highest rated', Newest: 'Newest' }, civ.sort)}
      <label class="row small" style="gap:6px"><input type="checkbox" id="civ-nsfw" ${civ.nsfw && civAdultAllowed() ? 'checked' : ''} ${civAdultAllowed() ? '' : 'disabled'}> 🔞 Show adult models${civAdultAllowed() ? '' : ' (parental lock is on)'}</label>
      <button class="btn primary">Search</button></form>
    <details class="card" style="margin-bottom:12px"><summary class="small" style="cursor:pointer"><b>🔑 Civitai API key</b> ${hasKey ? '<span class="badge b-mint">saved</span>' : '<span class="small muted">· needed for many adult models</span>'}</summary>
      <p class="small muted">On civitai.com: your profile → Account settings → API keys → Add API key. It's stored encrypted on this PC and only sent to Civitai.</p>
      <div class="row"><input id="civ-key" type="password" class="grow" placeholder="${hasKey ? 'Saved (paste a new one to replace it)' : 'Paste your Civitai API key'}"><button class="btn small" id="civ-key-save">Save</button></div></details>
    ${civ.error ? `<div class="notice">${esc(civ.error)}</div>` : ''}
    ${civ.items === null || (civ.loading && !civ.items?.length) ? '<div class="empty">Loading Civitai…</div>' : civ.items.length ? `<div class="cards">${civ.items.map(civCard).join('')}</div>` : '<div class="empty">Nothing found. Try other words or another base model.</div>'}
    ${civ.next && civ.items?.length ? `<div class="row" style="justify-content:center;margin-top:12px"><button class="btn" id="civ-more" ${civ.loading ? 'disabled' : ''}>${civ.loading ? 'Loading…' : 'Show more'}</button></div>` : ''}`;
}

function bindCivitai() {
  const f = $('#civ-form');
  if (!f) return;
  f.addEventListener('submit', (e) => {
    e.preventDefault();
    Object.assign(civ, { query: $('#civ-q').value.trim(), type: $('#civ-type').value, base: $('#civ-base').value, sort: $('#civ-sort').value, nsfw: $('#civ-nsfw').checked && civAdultAllowed() });
    civSearch(false);
  });
  for (const id of ['civ-type', 'civ-base', 'civ-sort', 'civ-nsfw']) $(`#${id}`)?.addEventListener('change', () => f.requestSubmit());
  $('#civ-more')?.addEventListener('click', () => civSearch(true));
  $('#civ-key-save')?.addEventListener('click', async () => {
    const v = $('#civ-key').value.trim();
    if (!v) { toast('Paste the key first.'); return; }
    await call('secret:set', 'civitai', v); S.config = await call('config:get'); toast('Civitai key saved.'); render();
  });
  $$('[data-civ-page]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); call('shell:open', a.dataset.civPage); }));
  $$('[data-civ-get]').forEach((b) => b.addEventListener('click', async () => {
    const it = civ.items.find((x) => String(x.versionId) === b.dataset.civGet);
    if (!it) return;
    try { await call('civitai:download', it); S.downloads[`civitai-${it.versionId}`] ||= { id: `civitai-${it.versionId}`, name: it.name, total: it.file.sizeKB * 1024, downloaded: 0 }; paintDownloads(); render(); toast(`Downloading ${it.name} from Civitai.${it.type === 'lora' ? ' Switch it on in Create → LoRAs.' : ''}`, 6000); } catch (err) { toast(err.message, 8000); }
  }));
}

// ---------- LoRAs in Create ----------
// The installed LoRAs that fit the chosen picture model, each with an on/off switch and a strength.
const loraOn = () => (S.data.prefs.loras ||= {}); // id -> weight (missing = off)
function lorasFor(modelValue) {
  const inst = S.installed.find((m) => `local:${m.id}` === modelValue);
  if (!inst) return [];
  const spec = S.catalog.media.find((c) => c.id === inst.catalogId) || {};
  const family = inst.family || spec.family;
  return S.installed.filter((m) => m.kind === 'lora' && (!m.family || !family || m.family === family));
}
function loraPickerHTML(modelValue) {
  const all = S.installed.filter((m) => m.kind === 'lora');
  if (!all.length) return '<div class="field"><label>LoRAs</label><span class="help">Add styles, characters and concepts from <a href="#" data-goto-civitai>Models → Civitai</a> (pick 🧩 LoRAs).</span></div>';
  const fit = lorasFor(modelValue);
  const on = loraOn();
  return `<div class="field" id="ci-loras"><label>LoRAs <span class="small muted">· add-ons for this model</span></label>
    ${fit.length ? fit.map((m) => `<div class="row" style="gap:8px"><label class="row grow small" style="gap:6px"><input type="checkbox" data-lora="${esc(m.id)}" ${on[m.id] !== undefined ? 'checked' : ''}> ${esc(m.name)}</label><input type="number" step="0.1" min="-2" max="2" value="${on[m.id] ?? 0.8}" data-lora-w="${esc(m.id)}" style="width:70px" title="Strength (0.8 is usual)"></div>${m.trainedWords?.length ? `<div class="small muted" style="margin:-2px 0 4px 24px">Adds: ${esc(m.trainedWords.slice(0, 2).join(', ').slice(0, 90))}</div>` : ''}`).join('') : `<span class="help">Your ${all.length} LoRA${all.length > 1 ? 's are' : ' is'} for another kind of model (SD 1.5, SDXL or FLUX). Pick a matching model above.</span>`}</div>`;
}
function bindLoraPicker() {
  $$('[data-lora]').forEach((c) => c.addEventListener('change', () => { const on = loraOn(); if (c.checked) on[c.dataset.lora] = Number($(`[data-lora-w="${CSS.escape(c.dataset.lora)}"]`)?.value) || 0.8; else delete on[c.dataset.lora]; save(); }));
  $$('[data-lora-w]').forEach((i) => i.addEventListener('change', () => { const on = loraOn(); if (on[i.dataset.loraW] !== undefined) { on[i.dataset.loraW] = Number(i.value) || 0.8; save(); } }));
  $$('[data-goto-civitai]').forEach((a) => a.addEventListener('click', (e) => { e.preventDefault(); modelsTab = 'civitai'; civ.type = 'LORA'; civ.items = null; go({ view: 'models' }); }));
}
// The LoRAs to use for a picture, and the prompt with their trigger words added.
function loraRequest(modelValue, prompt) {
  const on = loraOn();
  const list = lorasFor(modelValue).filter((m) => on[m.id] !== undefined);
  let p = prompt;
  for (const m of list) for (const w of (m.trainedWords || []).slice(0, 1)) if (w && !p.toLowerCase().includes(String(w).toLowerCase().slice(0, 30))) p = `${p}, ${w}`;
  return { loras: list.map((m) => ({ id: m.id, weight: on[m.id] })), prompt: p };
}
