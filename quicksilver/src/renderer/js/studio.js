// Studio: create and edit photos, videos, music and voice, locally or through a connected API.
// The Music, Voice and Quick fixes tabs are in studio-more.js.
'use strict';

let studioTab = 'gallery'; // what you have made comes first; the making itself is done in a chat
let gallery = [];
let galleryFilter = 'all';
const mediaJobs = {};          // jobId -> { status, progress, item, error, kind }
let lastResults = [];          // gallery ids from the latest run on each tab
const ed = { id: null, img: null, rot: 0, flipH: false, flipV: false, crop: 'original', adj: { brightness: 100, contrast: 100, saturate: 100, warmth: 0, blur: 0 }, scale: 100, maskOn: false, brush: 40 };
let vid = { id: null, info: null };

async function refreshGallery() { gallery = await qs.call('media:gallery'); }

// A short explanation at the top of each Create tab: what it does, how, and where things are saved.
const STUDIO_INTRO = {
  create: ['🎨', 'Make a picture from a description', 'Type what you want and Quicksilver writes a detailed prompt, then your picture model draws it on this PC (private and free). Press ✨ Improve to expand a rough idea. For top quality without a graphics card, use the ☁️ Cloud tab. Pictures are saved in the Gallery.'],
  edit: ['🪄', 'Edit a photo', 'Crop, rotate, filters and adjustments by hand, or describe a change ("remove the background", "make it sunset") and an AI edit model does it. Everything stays on this PC. Edited copies are saved in the Gallery.'],
  video: ['🎬', 'Make a short video clip', 'Describe the shot; a video model makes a few seconds of clip on this PC. This needs a graphics card with about 8 GB or more. No graphics card? Use the ☁️ Cloud tab (Veo, Kling) instead. Clips are saved in the Gallery.'],
  vedit: ['✂️', 'Trim and edit video', 'Cut, crop, change speed, add captions and convert clips you made or uploaded. Save a single frame as a photo to edit it. All on this PC.'],
  music: ['🎵', 'Make music & beats', 'The built-in synth makes instrumental beats and melodies from a style you pick (drums, bass, chords), saved as MP3. For full songs with vocals, use the ☁️ Cloud → Full songs tab (your lyrics, or Quicksilver writes them).'],
  voice: ['🎙️', 'Text to speech & podcasts', 'Type text and hear it read aloud in a Windows voice, or write two speakers for a podcast. Audio is saved in the Gallery. Your voice typing (speech to text) is the mic button in any chat.'],
  cloud: ['☁️', 'Top-quality cloud creation', 'The best hosted photo, video and music models through one key (or free with Pollinations). Use this when this PC can\'t make something itself, or for the highest quality. You pay the service per picture, second or song.'],
  tools: ['🧰', 'Quick fixes', 'One-click fixes for a photo, video or sound: upscale 4×, smooth to 60 fps, remove background, master audio, remove vocals, extract sound, read aloud. Pick an item, then a fix.'],
  gallery: ['🖼️', 'Everything you\'ve made', 'Every picture, video and sound you create or upload is kept here on this PC. Click one to edit, convert, animate or fix it; nothing is sent anywhere unless you use a cloud tab.'],
};
function studioIntro(tab) {
  const i = STUDIO_INTRO[tab];
  if (!i) return '';
  return `<div class="studio-intro"><span class="si-ic">${i[0]}</span><span><b>${esc(i[1])}.</b> <span class="small muted">${esc(i[2])}</span></span></div>`;
}
views.studio = {
  html() {
    // The gallery first, then the tools that work on what is in it, then the making forms with
    // every setting (a picture or a video is made most easily by asking for it in a chat).
    const tabs = { gallery: `🖼️ Gallery (${gallery.length})`, edit: '🪄 Edit photo', vedit: '✂️ Edit video', tools: '🧰 Quick fixes', music: '🎵 Music', voice: '🎙️ Voice', create: '🎨 Picture, all settings', video: '🎬 Video, all settings', cloud: '☁️ Cloud (top quality)' };
    return `<div class="page">
      <div class="page-head"><h1>Gallery &amp; tools</h1><button class="btn primary" id="studio-chat" title="Open a chat set to make pictures: describe one and it is painted">🖼️ Make a picture in chat</button><label class="btn">⬆ Upload photo, video or sound<input type="file" id="upload" accept="image/*,video/*,audio/*" multiple hidden></label></div>
      <p class="lede" style="margin-top:-6px">Pictures and videos are made by asking in any chat (or set the message box to <b>Picture</b> or <b>Video</b>). Everything you make is kept here, with tools to edit it.</p>
      <div class="tabs">${Object.entries(tabs).map(([k, l]) => `<button class="tab ${studioTab === k ? 'active' : ''}" data-stab="${k}">${l}</button>`).join('')}</div>
      ${studioIntro(studioTab)}
      ${({ create: createHTML, edit: editHTML, video: videoHTML, vedit: veditHTML, music: musicHTML, voice: voiceHTML, cloud: cloudStudioHTML, tools: fixesHTML, gallery: galleryHTML })[studioTab]()}
    </div>`;
  },
  bind() {
    if (!gallery.length) refreshGallery().then(() => { if (gallery.length && S.route.view === 'studio') render(); });
    if (!S.est) refreshEstimates().then(() => S.route.view === 'studio' && render());
    $$('[data-stab]').forEach((b) => b.addEventListener('click', () => { studioTab = b.dataset.stab; render(); }));
    $('#studio-chat')?.addEventListener('click', () => { newChat('as-general'); const c = chatById(S.route.id); if (c) { c.make = 'image'; save(); render(); } });
    $('#upload').addEventListener('change', async (e) => {
      let last = null;
      for (const f of e.target.files) last = await importFile(f);
      e.target.value = '';
      await refreshGallery();
      if (last) { if (last.kind === 'audio') { toolPick = last.id; studioTab = 'tools'; } else if (last.kind === 'video') { vid = { id: last.id, info: null }; studioTab = 'vedit'; } else { await loadEditor(last.id); studioTab = 'edit'; } }
      render();
    });
    $$('[data-get]').forEach((b) => b.addEventListener('click', async () => { const m = S.catalog.media.find((x) => x.id === b.dataset.get); await download({ catalogId: m.id }, m.name); render(); }));
    ({ create: bindCreate, edit: bindEdit, video: bindVideo, vedit: bindVedit, music: bindMusic, voice: bindVoice, cloud: bindCloudStudio, tools: bindFixes, gallery: bindGallery })[studioTab]?.();
    $$('[data-improve]').forEach((b) => b.addEventListener('click', () => improvePrompt(b)));
  },
};

async function importFile(f) {
  const p = qs.pathForFile(f);
  if (p) return call('media:importPath', p);
  if (f.type.startsWith('image/')) return call('media:saveDataUrl', await readDataUrl(f), { title: f.name });
  toast('Could not read that file.'); return null;
}

// ---------- shared pieces ----------

// ---------- Improve: a text model turns a short idea into a detailed prompt ----------

const IMPROVE = {
  image: 'Rewrite the user\'s idea as one detailed prompt for an AI image generator: subject, setting, composition, lighting, colours and style (and camera and lens if it is a photo). Keep everything the user asked for. Reply with the prompt only, under 80 words, no quotes or labels.',
  video: 'Rewrite the user\'s idea as one detailed prompt for an AI video generator: subject, action and motion, camera movement, setting, lighting and style. Keep everything the user asked for. Reply with the prompt only, under 70 words, no quotes or labels.',
  edit: 'Rewrite the user\'s photo edit request as one clear, specific instruction for an AI photo editor: say exactly what to change, and that everything else stays the same. Reply with the instruction only, under 40 words, no quotes or labels.',
};
function improveBtn(id, kind) { return `<button type="button" class="btn small ghost" data-improve="${id}" data-kind="${kind}" title="Let AI write a more detailed prompt">✨ Improve</button>`; }
function promptHelper() {
  if (targetValid(S.data.prefs.promptHelper)) return S.data.prefs.promptHelper;
  // Otherwise the quickest local text model: Quicksilver's own or one in use first, a model from
  // another app only when there is nothing else.
  const mineFirst = (m) => (liquidLocked(m) || m.inUse ? 0 : m.source === 'imported' ? 2 : 1);
  const local = S.installed.filter((m) => m.kind === 'text').sort((a, b) => mineFirst(a) - mineFirst(b) || a.size - b.size)[0];
  return local ? `local:${local.id}` : S.targets.find((t) => t.target.startsWith('api:'))?.target || '';
}
async function improvePrompt(btn) {
  const box = $(`#${btn.dataset.improve}`);
  const text = box.value.trim();
  if (!text) { toast('Write a few words first, then press Improve.'); return; }
  const helper = promptHelper();
  if (!helper) { toast('Install a text model to write prompts (Teams → Photo & video generation).', 6000); return; }
  btn.disabled = true; btn.textContent = '✨ Writing…';
  try {
    const out = await askAI(helper, IMPROVE[btn.dataset.kind], text);
    if (out) { box.value = out.replace(/^["'“]|["'”]$/g, ''); box.focus(); }
  } catch (e) { toast(`Couldn't improve it: ${e.message}`); }
  btn.disabled = false; btn.textContent = '✨ Improve';
}

function mediaModelOptions(kinds, filter = () => true) {
  const local = S.installed.filter((m) => kinds.includes(m.kind) && filter(S.catalog.media.find((c) => c.id === m.catalogId) || {}));
  const api = kinds.includes('image') ? S.providers.flatMap((p) => (p.imageModels || []).map((m) => ({ value: `api:${p.id}:${m}`, label: `${m} (${p.name})` }))) : [];
  return [...local.map((m) => ({ value: `local:${m.id}`, label: `${m.name} (on this PC)` })), ...api];
}

function suggestHTML(category, title) {
  const list = S.catalog.media.filter((m) => m.category === category).map((m) => ({ m, e: S.est?.media[m.id] })).sort((a, b) => ({ great: 0, good: 1, ok: 2, slow: 3, wont: 4 }[a.e?.rating] ?? 5) - ({ great: 0, good: 1, ok: 2, slow: 3, wont: 4 }[b.e?.rating] ?? 5));
  const freeCloud = category === 'image' ? `<div class="notice" style="margin-bottom:14px;background:color-mix(in srgb,var(--accent,#5b8cff) 10%,transparent)"><b>🖼️ Make a picture free right now — no download, no key.</b> Pollinations creates pictures in the cloud with no account at all. To run pictures privately on this PC instead, download a model below (ratings show the speed on your PC). <div style="margin-top:8px"><button class="btn small primary" data-stab="cloud">Make a free cloud picture</button></div></div>` : '';
  return `${freeCloud}<div class="notice info" style="margin-bottom:14px"><b>${esc(title)}</b> Download one below; ratings show how fast each runs on your PC. You can also connect an image API (OpenAI, Together) under Models → Connect an API.</div>
    <div class="cards">${list.map(({ m, e }) => `<div class="card"><div class="row"><h3 class="grow">${esc(m.name)}</h3><b class="small">${m.sizeGB.toFixed(1)} GB</b></div><p class="desc">${esc(m.blurb)}</p><div class="row" style="margin-bottom:10px">${rateBadge(e, 'media')}</div>${S.downloads[m.id] ? downloadBox(m.id) : S.installed.some((x) => x.catalogId === m.id) ? '<span class="badge b-mint">✓ Installed</span>' : `<button class="btn small primary" data-get="${m.id}">Download</button>`}</div>`).join('')}</div>`;
}

// A job's box: what it is doing, how far along, and, if it failed, why (it stays until you
// dismiss it or try again: a failure must never just disappear).
function jobBox(jobId) {
  const j = mediaJobs[jobId];
  if (!j) return '';
  const pct = Math.round((j.progress || 0) * 100);
  if (j.error) {
    return `<div class="progress-box failed" data-job="${jobId}" role="alert"><div class="row"><span class="grow jt">⚠️ ${esc(j.error)}</span></div>
      <div class="row" style="gap:6px;margin-top:8px">${j.req ? `<button class="btn small primary" data-retry-job="${jobId}">Try again</button>` : ''}<button class="btn small ghost" data-dismiss-job="${jobId}">Dismiss</button></div></div>`;
  }
  return `<div class="progress-box" data-job="${jobId}"><div class="row"><span class="grow jt">${esc(j.status || 'Starting…')}</span><span class="small muted jp">${j.done ? '' : `${pct}%`}</span>${j.sec && !j.done ? '<span class="badge b-lav jeta">⏱</span>' : ''}${!j.done ? `<button class="btn small" data-stop-job="${jobId}">Stop</button>` : ''}</div>
    <div class="bar"><i style="width:${pct}%"></i></div></div>`;
}

function paintJob(jobId) {
  const el = document.querySelector(`[data-job="${jobId}"]`);
  const j = mediaJobs[jobId];
  if (!el || !j || j.error) return;
  const pct = Math.round((j.progress || 0) * 100);
  el.querySelector('.jt').textContent = j.status || '';
  const jp = el.querySelector('.jp'); if (jp) jp.textContent = `${pct}%`;
  const bar = el.querySelector('.bar i'); if (bar) bar.style.width = `${pct}%`;
}
// The jobs a Create page shows: the ones still going, and the ones that failed (until dismissed).
// Jobs started from a chat are shown in that chat, not here.
const pageJobs = (label) => Object.entries(mediaJobs).filter(([, j]) => j.label === label && !j.inChat && (!j.done || j.error));

qs.onMedia(async (ev) => {
  const j = mediaJobs[ev.jobId];
  if (!j) return;
  // The bar only reaches 100% when the result exists: the engine's steps finishing is not the
  // end (the picture or video still has to be decoded and saved), so until then it stops short.
  if (ev.type === 'progress') j.progress = Math.max(0, Math.min(0.99, Number(ev.value) || 0));
  if (ev.type === 'status') j.status = ev.text;
  if (ev.type === 'done') {
    j.done = true; j.progress = 1; j.item = ev.item; j.status = `Done in ${fmtSec(ev.item.seconds || 0)}.`;
    lastResults.unshift(ev.item.id);
    try { await refreshGallery(); } catch { /* the result is still in the gallery; it shows on the next refresh */ }
    if (S.route.view === 'studio') render();
    else if (!j.inChat) toast(`✓ Your ${ev.item.kind === 'video' ? 'video' : 'picture'} is ready in Gallery & tools.`, 6000);
    j.resolve?.(ev.item);
    return;
  }
  if (ev.type === 'error') {
    j.error = ev.message || 'It did not finish.'; j.done = true;
    if (/^Stopped\.?$/.test(j.error) && !j.inChat) delete mediaJobs[ev.jobId]; // you stopped it: nothing to report
    if (S.route.view === 'studio') render();
    else if (!j.inChat && mediaJobs[ev.jobId]) toast(`${j.label === 'Animating' ? 'Video' : 'Picture'}: ${j.error}`, 12000);
    j.resolve?.(null);
    return;
  }
  paintJob(ev.jobId);
});
document.addEventListener('click', (e) => {
  const stop = e.target.closest('[data-stop-job]');
  if (stop) { qs.call('media:stop', stop.dataset.stopJob); return; }
  const gone = e.target.closest('[data-dismiss-job]');
  if (gone) { delete mediaJobs[gone.dataset.dismissJob]; if (S.route.view === 'studio') render(); return; }
  const again = e.target.closest('[data-retry-job]');
  if (again) { const old = mediaJobs[again.dataset.retryJob]; delete mediaJobs[again.dataset.retryJob]; if (old?.req) startJob(old.req, old.label, old.sec); else if (S.route.view === 'studio') render(); }
});

// "⏱ About 20 s per picture on your PC · ★ 4.5" for the chosen model (× how many).
function mediaEtaText(target, what, times = 1) {
  const m = S.speed?.media?.[String(target || '').replace(/^local:/, '')];
  if (!m) return '';
  return `⏱ About ${fmtSec(m.sec * times)}${times > 1 ? ` for ${times}` : ` per ${what}`} on your PC · ${starText(m.stars)} expected quality`;
}
setInterval(() => {
  // Keep the countdowns on running jobs moving.
  for (const [id, j] of Object.entries(mediaJobs)) {
    if (j.done || j.error || !j.sec) continue;
    const el = document.querySelector(`[data-job="${id}"] .jeta`);
    if (el) { const left = j.sec - (Date.now() - j.start) / 1000; el.textContent = left > 3 ? `~${fmtSec(left)} left` : 'almost done'; }
  }
}, 1000);

function startJob(req, label, sec = null, extra = {}) {
  const jobId = uid();
  return new Promise((resolve) => {
    mediaJobs[jobId] = { status: 'Starting…', progress: 0, label, resolve, sec, start: Date.now(), req, ...extra };
    qs.call('media:generate', jobId, req).catch((err) => { const j = mediaJobs[jobId]; if (j) { j.error = err.message; j.done = true; } if (S.route.view === 'studio') render(); resolve(null); });
    if (S.route.view === 'studio') render();
  });
}

function resultsHTML(kind) {
  const items = lastResults.map((id) => gallery.find((g) => g.id === id)).filter((g) => g && (kind === 'any' || g.kind === kind)).slice(0, 8);
  if (!items.length) return '';
  return `<div class="section"><h2>Results</h2></div><div class="gallery">${items.map(gitemHTML).join('')}</div>`;
}

const gitemHTML = (g) => `<button class="gitem ${g.kind === 'audio' ? 'sound' : ''}" data-gopen="${g.id}">${g.kind === 'audio' ? '<span class="sound-tile">🎵</span>' : g.kind === 'video' ? `<video src="${g.url}" muted preload="metadata"></video>` : `<img src="${g.url}" alt="" loading="lazy">`}<div class="cap">${g.kind === 'video' ? '🎬 ' : g.kind === 'audio' ? '🎵 ' : ''}${esc(g.prompt || g.title || 'Untitled')}</div></button>`;

const SIZES = { square: ['Square', 1, 1], portrait: ['Portrait', 3, 4], landscape: ['Landscape', 4, 3], wide: ['Wide 16:9', 16, 9], tall: ['Tall 9:16', 9, 16] };
function sizeFor(spec, preset) {
  const base = spec?.defaults?.width || 1024;
  const [, w, h] = SIZES[preset];
  const area = base * base;
  const r64 = (x) => Math.max(256, Math.round(x / 64) * 64);
  return [r64(Math.sqrt((area * w) / h)), r64(Math.sqrt((area * h) / w))];
}

// ---------- create image ----------

function createHTML() {
  const opts = mediaModelOptions(['image'], (c) => c.edit !== 'instruct');
  if (!opts.length) return suggestHTML('image', 'Get an image model first.');
  const jobs = pageJobs('Creating');
  return `<div class="studio">
    <div class="card stack-v">
      <div class="field"><label for="ci-model">Model</label><select id="ci-model">${opts.map((o) => `<option value="${esc(o.value)}" ${o.value === S.data.prefs.imageModel ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select></div>
      <div class="field"><label for="ci-prompt" class="row">Describe the picture<span class="grow"></span>${improveBtn('ci-prompt', 'image')}</label><textarea id="ci-prompt" rows="5" placeholder="A cozy reading nook by a rainy window, warm lamp light, watercolor style">${esc(S.data.prefs.lastPrompt || '')}</textarea></div>
      <div class="field" id="ci-neg-f"><label for="ci-neg">Avoid (optional)</label><input id="ci-neg" placeholder="blurry, text, watermark"></div>
      <div class="field"><label>Shape</label><div class="row">${Object.entries(SIZES).map(([k, [l]], i) => `<label class="btn small"><input type="radio" name="ci-size" value="${k}" ${i === 0 ? 'checked' : ''}> ${l}</label>`).join('')}</div></div>
      <details><summary class="label" style="cursor:pointer">Advanced</summary><div class="grid2" style="margin-top:10px">
        <div class="field"><label for="ci-steps">Steps</label><input id="ci-steps" type="number" min="1" max="80" placeholder="auto"></div>
        <div class="field"><label for="ci-cfg">Guidance</label><input id="ci-cfg" type="number" step="0.5" min="0" max="20" placeholder="auto"></div>
        <div class="field"><label for="ci-seed">Seed</label><input id="ci-seed" type="number" placeholder="random"></div>
        <div class="field"><label for="ci-count">How many</label><select id="ci-count"><option>1</option><option>2</option><option>3</option><option>4</option></select></div>
      </div></details>
      <button class="btn primary" id="ci-go">🎨 Create</button>
      <p class="eta-line" id="ci-eta">${mediaEtaText($('#ci-model')?.value || S.data.prefs.imageModel || opts[0]?.value, 'picture')}</p>
    </div>
    <div class="stack-v">${jobs.map(([id]) => jobBox(id)).join('')}${resultsHTML('image') || '<div class="canvas-wrap"><div class="empty">Your pictures will appear here.</div></div>'}</div>
  </div>`;
}

function bindCreate() {
  const upd = () => { const n = Number($('#ci-count')?.value) || 1; if ($('#ci-eta')) $('#ci-eta').textContent = mediaEtaText($('#ci-model').value, 'picture', n); };
  $('#ci-model')?.addEventListener('change', upd); $('#ci-count')?.addEventListener('change', upd); if ($('#ci-model')) upd();
  $('#ci-go')?.addEventListener('click', async () => {
    const model = $('#ci-model').value;
    const prompt = $('#ci-prompt').value.trim();
    if (!prompt) { toast('Describe the picture first.'); return; }
    S.data.prefs.imageModel = model; S.data.prefs.lastPrompt = prompt; save();
    const preset = document.querySelector('input[name="ci-size"]:checked').value;
    const count = Number($('#ci-count').value);
    if (model.startsWith('api:')) {
      const [, pid, ...rest] = model.split(':');
      const [w, h] = preset === 'square' ? [1024, 1024] : ['portrait', 'tall'].includes(preset) ? [1024, 1536] : [1536, 1024];
      toast('Creating with the API…');
      for (let i = 0; i < count; i++) { const item = await call('media:apiImage', pid, rest.join(':'), { prompt, size: `${w}x${h}` }); lastResults.unshift(item.id); }
      await refreshGallery(); render(); return;
    }
    const inst = S.installed.find((m) => `local:${m.id}` === model);
    const spec = inst && S.catalog.media.find((c) => c.id === inst.catalogId);
    if (!spec) { toast('That picture model is no longer installed. Pick another under Model.', 8000); await refreshModels().catch(() => {}); render(); return; }
    const [width, height] = sizeFor(spec, preset);
    const seed = $('#ci-seed').value;
    // Read the form once: the page is redrawn while the pictures are made.
    const base = { modelId: inst.id, mode: 'generate', prompt, negative: $('#ci-neg').value, width, height, steps: Number($('#ci-steps').value) || undefined, cfg: $('#ci-cfg').value === '' ? undefined : Number($('#ci-cfg').value) };
    const eta = mediaEta(model);
    // All of them are queued at once (they are made one after another), so each shows its place.
    const all = Array.from({ length: count }, (_, k) => startJob({ ...base, seed: seed === '' ? '' : Number(seed) + k }, 'Creating', eta));
    await Promise.all(all);
  });
}

// ---------- edit photo ----------

async function loadEditor(id) {
  const dataUrl = await qs.call('media:dataUrl', id);
  const img = new Image();
  await new Promise((r, j) => { img.onload = r; img.onerror = j; img.src = dataUrl; });
  Object.assign(ed, { id, img, rot: 0, flipH: false, flipV: false, crop: 'original', adj: { brightness: 100, contrast: 100, saturate: 100, warmth: 0, blur: 0 }, scale: 100 });
}

const FILTERS = {
  none: ['Original', {}],
  vivid: ['Vivid', { contrast: 112, saturate: 135 }],
  warm: ['Warm', { warmth: 30, saturate: 110 }],
  cool: ['Cool', { warmth: -25, brightness: 104 }],
  bw: ['Black & white', { saturate: 0, contrast: 115 }],
  vintage: ['Vintage', { warmth: 40, contrast: 90, saturate: 80, brightness: 105 }],
  soft: ['Soft', { contrast: 90, brightness: 106, blur: 0.6 }],
};
const CROPS = { original: 'Original', '1:1': 'Square', '4:5': '4:5', '3:2': '3:2', '16:9': '16:9', '9:16': '9:16' };

// Draws the photo with every edit applied, at full resolution.
function renderEdited() {
  const { img } = ed;
  const turned = ed.rot % 180 !== 0;
  let w = turned ? img.height : img.width;
  let h = turned ? img.width : img.height;
  const base = document.createElement('canvas');
  base.width = w; base.height = h;
  const b = base.getContext('2d');
  const a = ed.adj;
  b.filter = `brightness(${a.brightness}%) contrast(${a.contrast}%) saturate(${a.saturate}%) ${a.warmth > 0 ? `sepia(${a.warmth}%)` : a.warmth < 0 ? `hue-rotate(${a.warmth * 0.6}deg)` : ''} blur(${a.blur}px)`;
  b.translate(w / 2, h / 2);
  b.rotate((ed.rot * Math.PI) / 180);
  b.scale(ed.flipH ? -1 : 1, ed.flipV ? -1 : 1);
  b.drawImage(img, -img.width / 2, -img.height / 2);
  let sx = 0; let sy = 0; let sw = w; let sh = h;
  if (ed.crop !== 'original') {
    const [cw, ch] = ed.crop.split(':').map(Number);
    if (w / h > cw / ch) { sw = Math.round((h * cw) / ch); sx = Math.round((w - sw) / 2); } else { sh = Math.round((w * ch) / cw); sy = Math.round((h - sh) / 2); }
  }
  const out = document.createElement('canvas');
  out.width = Math.max(1, Math.round((sw * ed.scale) / 100));
  out.height = Math.max(1, Math.round((sh * ed.scale) / 100));
  out.getContext('2d').drawImage(base, sx, sy, sw, sh, 0, 0, out.width, out.height);
  return out;
}

function editHTML() {
  if (!ed.img) {
    const imgs = gallery.filter((g) => g.kind === 'image');
    return `<div class="notice info" style="margin-bottom:14px">Pick a photo to edit, or upload one with the button above.</div>${imgs.length ? `<div class="gallery">${imgs.map((g) => `<button class="gitem" data-pick-edit="${g.id}"><img src="${g.url}" alt="" loading="lazy"><div class="cap">${esc(g.prompt || g.title || 'Photo')}</div></button>`).join('')}</div>` : ''}`;
  }
  const aiOpts = mediaModelOptions(['image'], (c) => Boolean(c.edit));
  const slider = (k, label, min, max, step = 1) => `<div class="field"><label for="adj-${k}">${label}: <span id="adj-${k}-v">${ed.adj[k]}</span></label><input type="range" id="adj-${k}" data-adj="${k}" min="${min}" max="${max}" step="${step}" value="${ed.adj[k]}"></div>`;
  const jobs = pageJobs('Editing');
  return `<div class="studio">
    <div class="stack-v">
      <div class="card stack-v">
        <h3>🪄 Edit with AI</h3>
        ${aiOpts.length ? `<div class="field"><label for="ai-model">Model</label><select id="ai-model">${aiOpts.map((o) => `<option value="${esc(o.value)}" ${o.value === S.data.prefs.editModel ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select></div>
          <div class="field"><label for="ai-prompt" class="row">What should change?<span class="grow"></span>${improveBtn('ai-prompt', 'edit')}</label><textarea id="ai-prompt" rows="3" placeholder="Make it a sunset · Remove the car · Turn it into an oil painting · Add snow"></textarea></div>
          <div class="field" id="ai-str-f"><label for="ai-str">How much to change: <span id="ai-str-v">0.6</span></label><input type="range" id="ai-str" min="0.1" max="1" step="0.05" value="0.6"></div>
          <label class="row"><input type="checkbox" id="mask-on" ${ed.maskOn ? 'checked' : ''}> <b>Only change the area I paint</b></label>
          ${ed.maskOn ? `<div class="row"><span class="small">Brush</span><input type="range" id="brush" min="8" max="160" value="${ed.brush}" class="grow"><button class="btn small" id="mask-clear">Clear</button></div>` : ''}
          <button class="btn primary" id="ai-go">🪄 Apply AI edit</button>
          <p class="eta-line" id="ai-eta">${mediaEtaText(aiOpts.find((o) => o.value === S.data.prefs.editModel)?.value || aiOpts[0]?.value, 'edit')}</p>` : `<p class="small muted" style="font-weight:600">Download an editing model (FLUX.1 Kontext is best, or any image model for style changes) under Models → Images & video.</p><button class="btn small" data-goto-media>Get an editing model</button>`}
      </div>
      <div class="card stack-v">
        <h3>🛠 Adjust</h3>
        <div class="row"><button class="btn small" data-rot="-90">⟲ Rotate</button><button class="btn small" data-rot="90">⟳ Rotate</button><button class="btn small" data-flip="h">⇆ Flip</button><button class="btn small" data-flip="v">⇅ Flip</button></div>
        <div class="field"><label>Crop</label><div class="row">${Object.entries(CROPS).map(([k, l]) => `<button class="btn small ${ed.crop === k ? 'on' : ''}" data-crop="${k}">${l}</button>`).join('')}</div></div>
        <div class="field"><label>Looks</label><div class="row">${Object.entries(FILTERS).map(([k, [l]]) => `<button class="btn small" data-filter="${k}">${l}</button>`).join('')}</div></div>
        ${slider('brightness', 'Brightness', 40, 160)}${slider('contrast', 'Contrast', 40, 160)}${slider('saturate', 'Color', 0, 200)}${slider('warmth', 'Warmth', -60, 60)}${slider('blur', 'Softness', 0, 6, 0.2)}
        <div class="field"><label for="scale">Size: <span id="scale-v">${ed.scale}%</span></label><input type="range" id="scale" min="10" max="100" value="${ed.scale}"></div>
        <div class="row"><button class="btn primary" id="ed-save">Save as new photo</button><button class="btn" id="ed-reset">Reset</button><button class="btn ghost" id="ed-close">Choose another</button></div>
      </div>
    </div>
    <div class="stack-v">${jobs.map(([id]) => jobBox(id)).join('')}<div class="canvas-wrap" id="ed-wrap"><canvas id="ed-canvas"></canvas>${ed.maskOn ? '<canvas id="mask" class="mask-layer"></canvas>' : ''}</div>${resultsHTML('image')}</div>
  </div>`;
}

let maskCanvas = null; // full-resolution mask: white = change
function drawPreview() {
  const c = $('#ed-canvas');
  if (!c || !ed.img) return;
  const full = renderEdited();
  c.width = full.width; c.height = full.height;
  c.getContext('2d').drawImage(full, 0, 0);
  const m = $('#mask');
  if (m) {
    if (!maskCanvas || maskCanvas.width !== full.width || maskCanvas.height !== full.height) { maskCanvas = document.createElement('canvas'); maskCanvas.width = full.width; maskCanvas.height = full.height; }
    const r = c.getBoundingClientRect();
    const wr = $('#ed-wrap').getBoundingClientRect();
    m.width = full.width; m.height = full.height;
    Object.assign(m.style, { width: `${r.width}px`, height: `${r.height}px`, left: `${r.left - wr.left}px`, top: `${r.top - wr.top}px` });
    const mx = m.getContext('2d');
    mx.clearRect(0, 0, m.width, m.height);
    mx.globalAlpha = 1;
    mx.drawImage(maskCanvas, 0, 0);
    mx.globalCompositeOperation = 'source-in';
    mx.fillStyle = '#7b5cff';
    mx.fillRect(0, 0, m.width, m.height);
    mx.globalCompositeOperation = 'source-over';
  }
}

function bindEdit() {
  $('#ai-model')?.addEventListener('change', (e) => { if ($('#ai-eta')) $('#ai-eta').textContent = mediaEtaText(e.target.value, 'edit'); });
  $$('[data-pick-edit]').forEach((b) => b.addEventListener('click', async () => { await loadEditor(b.dataset.pickEdit); render(); }));
  $('[data-goto-media]')?.addEventListener('click', () => { modelsTab = 'media'; go({ view: 'models' }); });
  if (!ed.img) return;
  drawPreview();
  $$('[data-adj]').forEach((r) => r.addEventListener('input', () => { ed.adj[r.dataset.adj] = Number(r.value); $(`#adj-${r.dataset.adj}-v`).textContent = r.value; drawPreview(); }));
  $('#scale').addEventListener('input', (e) => { ed.scale = Number(e.target.value); $('#scale-v').textContent = `${ed.scale}%`; });
  $$('[data-rot]').forEach((b) => b.addEventListener('click', () => { ed.rot = (ed.rot + Number(b.dataset.rot) + 360) % 360; maskCanvas = null; drawPreview(); }));
  $$('[data-flip]').forEach((b) => b.addEventListener('click', () => { if (b.dataset.flip === 'h') ed.flipH = !ed.flipH; else ed.flipV = !ed.flipV; drawPreview(); }));
  $$('[data-crop]').forEach((b) => b.addEventListener('click', () => { ed.crop = b.dataset.crop; maskCanvas = null; render(); }));
  $$('[data-filter]').forEach((b) => b.addEventListener('click', () => { ed.adj = { brightness: 100, contrast: 100, saturate: 100, warmth: 0, blur: 0, ...FILTERS[b.dataset.filter][1] }; render(); }));
  $('#ed-reset').addEventListener('click', async () => { await loadEditor(ed.id); render(); });
  $('#ed-close').addEventListener('click', () => { ed.img = null; ed.id = null; render(); });
  $('#ed-save').addEventListener('click', async () => {
    const item = await call('media:saveDataUrl', renderEdited().toDataURL('image/png'), { title: 'Edited photo', parent: ed.id });
    lastResults.unshift(item.id); await refreshGallery(); await loadEditor(item.id); render(); toast('Saved to the gallery.');
  });
  $('#ai-str')?.addEventListener('input', (e) => { $('#ai-str-v').textContent = e.target.value; });
  $('#mask-on')?.addEventListener('change', (e) => { ed.maskOn = e.target.checked; render(); });
  $('#brush')?.addEventListener('input', (e) => { ed.brush = Number(e.target.value); });
  $('#mask-clear')?.addEventListener('click', () => { maskCanvas = null; drawPreview(); });
  const syncStrength = () => {
    const v = $('#ai-model')?.value || '';
    const inst = S.installed.find((m) => `local:${m.id}` === v);
    const spec = S.catalog.media.find((c) => c.id === inst?.catalogId);
    const f = $('#ai-str-f'); if (f) f.hidden = spec?.edit === 'instruct' || v.startsWith('api:');
  };
  $('#ai-model')?.addEventListener('change', syncStrength);
  syncStrength();
  const m = $('#mask');
  if (m) {
    let down = false;
    const paint = (e) => {
      if (!down) return;
      const r = m.getBoundingClientRect();
      const x = ((e.clientX - r.left) / r.width) * m.width;
      const y = ((e.clientY - r.top) / r.height) * m.height;
      const mx = maskCanvas.getContext('2d');
      mx.fillStyle = '#fff';
      mx.beginPath(); mx.arc(x, y, (ed.brush * m.width) / r.width / 2, 0, Math.PI * 2); mx.fill();
      drawPreview();
    };
    m.addEventListener('pointerdown', (e) => { down = true; m.setPointerCapture(e.pointerId); paint(e); });
    m.addEventListener('pointermove', paint);
    m.addEventListener('pointerup', () => { down = false; });
  }
  $('#ai-go')?.addEventListener('click', async () => {
    const prompt = $('#ai-prompt').value.trim();
    if (!prompt) { toast('Describe the change first.'); return; }
    // Save the current look first so the AI edits exactly what you see.
    const full = renderEdited();
    const base = await call('media:saveDataUrl', full.toDataURL('image/png'), { title: 'Before AI edit', parent: ed.id });
    let maskDataUrl;
    if (ed.maskOn && maskCanvas) {
      const mk = document.createElement('canvas'); mk.width = full.width; mk.height = full.height;
      const x = mk.getContext('2d'); x.fillStyle = '#000'; x.fillRect(0, 0, mk.width, mk.height); x.drawImage(maskCanvas, 0, 0);
      maskDataUrl = mk.toDataURL('image/png');
    }
    const model = $('#ai-model').value;
    if (model.startsWith('api:')) {
      const [, pid, ...rest] = model.split(':');
      toast('Editing with the API…');
      const item = await call('media:apiImage', pid, rest.join(':'), { prompt, imageId: base.id, maskDataUrl, size: '1024x1024' });
      lastResults.unshift(item.id); await refreshGallery(); await loadEditor(item.id); render(); return;
    }
    const inst = S.installed.find((x) => `local:${x.id}` === model);
    const r64 = (v) => Math.max(256, Math.round(Math.min(v, 1536) / 64) * 64);
    const k = Math.min(1, 1280 / Math.max(full.width, full.height));
    const item = await startJob({ modelId: inst.id, mode: 'edit', prompt, imageId: base.id, strength: Number($('#ai-str').value), maskDataUrl, width: r64(full.width * k), height: r64(full.height * k) }, 'Editing', mediaEta($('#ai-model').value));
    if (item) { await loadEditor(item.id); render(); }
  });
}

// ---------- create video ----------

function videoHTML() {
  const opts = mediaModelOptions(['video']);
  if (!opts.length) return suggestHTML('video', 'Get a video model first.');
  const imgs = gallery.filter((g) => g.kind === 'image');
  const jobs = pageJobs('Animating');
  return `<div class="studio">
    <div class="card stack-v">
      <div class="field"><label for="cv-model">Model</label><select id="cv-model">${opts.map((o) => `<option value="${esc(o.value)}" ${o.value === S.data.prefs.videoModel ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select></div>
      <div class="field"><label for="cv-prompt" class="row">Describe the video<span class="grow"></span>${improveBtn('cv-prompt', 'video')}</label><textarea id="cv-prompt" rows="5" placeholder="Gentle waves rolling onto a sunny beach, slow camera pan"></textarea></div>
      <div class="field" id="cv-from-f"><label for="cv-from">Start from a photo (optional)</label><select id="cv-from"><option value="">No, create from the description</option>${imgs.slice(0, 60).map((g) => `<option value="${g.id}">${esc(g.prompt || g.title || 'Photo')}</option>`).join('')}</select></div>
      <div class="grid2">
        <div class="field"><label for="cv-shape">Shape</label><select id="cv-shape"><option value="landscape">Landscape</option><option value="tall">Vertical</option><option value="square">Square</option></select></div>
        <div class="field"><label for="cv-len">Length</label><select id="cv-len"><option value="17">About 1 second</option><option value="33" selected>About 2 seconds</option><option value="49">About 3 seconds</option><option value="81">About 5 seconds</option></select></div>
      </div>
      <details><summary class="label" style="cursor:pointer">Advanced</summary><div class="grid2" style="margin-top:10px">
        <div class="field"><label for="cv-steps">Steps</label><input id="cv-steps" type="number" min="4" max="60" placeholder="auto"></div>
        <div class="field"><label for="cv-seed">Seed</label><input id="cv-seed" type="number" placeholder="random"></div>
      </div></details>
      <button class="btn primary" id="cv-go">🎬 Create video</button>
      <p class="eta-line" id="cv-eta">${mediaEtaText(opts.find((o) => o.value === S.data.prefs.videoModel)?.value || opts[0]?.value, 'clip (about 2 seconds)')}</p>
    </div>
    <div class="stack-v">${jobs.map(([id]) => jobBox(id)).join('')}${resultsHTML('video') || '<div class="canvas-wrap"><div class="empty">Your videos will appear here.</div></div>'}</div>
  </div>`;
}

function bindVideo() {
  // A clip's time grows with its length (frames).
  const clipSec = () => { const m = S.speed?.media?.[String($('#cv-model')?.value || '').replace(/^local:/, '')]; return m ? m.sec * (Number($('#cv-len')?.value) || 33) / (m.frames || 33) : null; };
  const upd = () => { const sec = clipSec(); const m = S.speed?.media?.[String($('#cv-model')?.value || '').replace(/^local:/, '')]; if ($('#cv-eta')) $('#cv-eta').textContent = sec == null ? '' : `⏱ About ${fmtSec(sec)} for this clip on your PC · ${starText(m.stars)} expected quality`; };
  $('#cv-model')?.addEventListener('change', upd); $('#cv-len')?.addEventListener('change', upd); if ($('#cv-model')) upd();
  $('#cv-go')?.addEventListener('click', async () => {
    const prompt = $('#cv-prompt').value.trim();
    if (!prompt) { toast('Describe the video first.'); return; }
    const inst = S.installed.find((m) => `local:${m.id}` === $('#cv-model').value);
    const spec = inst && S.catalog.media.find((c) => c.id === inst.catalogId);
    if (!spec) { toast('That video model is no longer installed. Pick another under Model.', 8000); await refreshModels().catch(() => {}); render(); return; }
    const from = $('#cv-from').value;
    if (from && !spec.animate) { toast(`${spec.name} can't start from a photo. Use Wan 2.2, or clear "Start from a photo".`, 6000); return; }
    const d = spec.defaults;
    const shape = $('#cv-shape').value;
    const [width, height] = shape === 'tall' ? [d.height, d.width] : shape === 'square' ? [d.height, d.height] : [d.width, d.height];
    await startJob({ modelId: inst.id, mode: from ? 'animate' : 'generate', prompt, imageId: from || undefined, width, height, frames: Number($('#cv-len').value), steps: Number($('#cv-steps').value) || undefined, seed: $('#cv-seed').value === '' ? '' : Number($('#cv-seed').value) }, 'Animating', clipSec());
  });
}

// ---------- edit video ----------

function veditHTML() {
  const videos = gallery.filter((g) => g.kind === 'video');
  const g = gallery.find((x) => x.id === vid.id);
  if (!g) return `<div class="notice info" style="margin-bottom:14px">Pick a video to edit, or upload one with the button above.</div>${videos.length ? `<div class="gallery">${videos.map((x) => `<button class="gitem" data-pick-video="${x.id}"><video src="${x.url}" muted preload="metadata"></video><div class="cap">${esc(x.prompt || x.title || 'Video')}</div></button>`).join('')}</div>` : ''}`;
  const jobs = pageJobs('Exporting');
  return `<div class="studio">
    <div class="card stack-v">
      <div class="grid2">
        <div class="field"><label for="ve-start">Start (seconds)</label><div class="row"><input id="ve-start" type="number" step="0.1" min="0" value="0" class="grow"><button class="btn small" data-set="start">Use current</button></div></div>
        <div class="field"><label for="ve-end">End (seconds)</label><div class="row"><input id="ve-end" type="number" step="0.1" min="0" placeholder="end" class="grow"><button class="btn small" data-set="end">Use current</button></div></div>
        <div class="field"><label for="ve-crop">Crop</label><select id="ve-crop"><option value="">Keep</option><option value="square">Square 1:1</option><option value="vertical">Vertical 9:16</option><option value="horizontal">Horizontal 16:9</option></select></div>
        <div class="field"><label for="ve-height">Resolution</label><select id="ve-height"><option value="">Keep</option><option>2160</option><option>1080</option><option>720</option><option>480</option></select></div>
        <div class="field"><label for="ve-speed">Speed</label><select id="ve-speed"><option value="0.5">0.5× slow motion</option><option value="1" selected>1× normal</option><option value="1.5">1.5×</option><option value="2">2× fast</option><option value="4">4× time-lapse</option></select></div>
        <div class="field"><label for="ve-format">Save as</label><select id="ve-format"><option value="mp4">MP4 (plays everywhere)</option><option value="webm">WebM</option><option value="gif">GIF (no sound)</option></select></div>
        <div class="field"><label for="ve-bright">Brightness</label><input id="ve-bright" type="range" min="-40" max="40" value="0"></div>
        <div class="field"><label for="ve-contrast">Contrast</label><input id="ve-contrast" type="range" min="-50" max="50" value="0"></div>
        <div class="field"><label for="ve-sat">Color</label><input id="ve-sat" type="range" min="-100" max="100" value="0"></div>
        <div class="field"><label for="ve-fade">Fade in & out (seconds)</label><input id="ve-fade" type="number" min="0" max="5" step="0.5" value="0"></div>
      </div>
      <div class="row"><label class="row"><input type="checkbox" id="ve-mute"> Remove sound</label><label class="row"><input type="checkbox" id="ve-rev"> Play backwards</label></div>
      <div class="row"><button class="btn primary" id="ve-go">✂️ Export edited video</button><button class="btn" id="ve-frame">📸 Save this frame as a photo</button><button class="btn" id="ve-ask">💬 Ask AI about this video</button><button class="btn ghost" id="ve-close">Choose another</button></div>
    </div>
    <div class="stack-v">${jobs.map(([id]) => jobBox(id)).join('')}<div class="canvas-wrap"><video id="ve-player" src="${g.url}" controls></video></div>${resultsHTML('video')}</div>
  </div>`;
}

function bindVedit() {
  $$('[data-pick-video]').forEach((b) => b.addEventListener('click', () => { vid = { id: b.dataset.pickVideo, info: null }; render(); }));
  const player = $('#ve-player');
  if (!player) return;
  $$('[data-set]').forEach((b) => b.addEventListener('click', () => { $(`#ve-${b.dataset.set}`).value = player.currentTime.toFixed(1); }));
  $('#ve-close').addEventListener('click', () => { vid = { id: null }; render(); });
  $('#ve-frame').addEventListener('click', async () => { const item = await call('media:frame', vid.id, player.currentTime); await refreshGallery(); await loadEditor(item.id); studioTab = 'edit'; render(); toast('Frame saved. You can edit it now.'); });
  $('#ve-ask').addEventListener('click', async () => {
    toast('Reading frames…');
    const r = await call('media:videoFrames', vid.id, 8);
    const g = gallery.find((x) => x.id === vid.id);
    chatWithAttachment({ type: 'video', name: g.title || 'video', duration: r.duration, frames: r.frames }, 'What happens in this video?', S.data.assistants.find((a) => a.job === 'general')?.id);
  });
  $('#ve-go').addEventListener('click', async () => {
    const fade = Number($('#ve-fade').value) || 0;
    const ops = { start: $('#ve-start').value, end: $('#ve-end').value, crop: $('#ve-crop').value, height: $('#ve-height').value, speed: $('#ve-speed').value, format: $('#ve-format').value, brightness: $('#ve-bright').value, contrast: $('#ve-contrast').value, saturation: $('#ve-sat').value, fadeIn: fade, fadeOut: fade, mute: $('#ve-mute').checked, reverse: $('#ve-rev').checked };
    const jobId = uid();
    mediaJobs[jobId] = { status: 'Exporting…', progress: 0, label: 'Exporting' };
    render();
    try {
      const item = await qs.call('media:editVideo', vid.id, ops, jobId);
      mediaJobs[jobId].done = true;
      lastResults.unshift(item.id); await refreshGallery(); toast('Edited video saved to the gallery.');
    } catch (err) { mediaJobs[jobId].error = err.message; }
    render();
  });
}

// ---------- gallery ----------

function galleryHTML() {
  const list = gallery.filter((g) => galleryFilter === 'all' || g.kind === galleryFilter);
  return `<div class="row" style="margin-bottom:14px">${[['all', 'All'], ['image', 'Photos'], ['video', 'Videos'], ['audio', 'Sounds']].map(([k, l]) => `<button class="btn small ${galleryFilter === k ? 'on' : ''}" data-gfilter="${k}">${l}</button>`).join('')}</div>
    ${list.length ? `<div class="gallery">${list.map(gitemHTML).join('')}</div>` : '<div class="empty">Nothing here yet. Ask for a picture in a chat, or upload something.</div>'}`;
}

function bindGallery() {
  $$('[data-gfilter]').forEach((b) => b.addEventListener('click', () => { galleryFilter = b.dataset.gfilter; render(); }));
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-gopen]');
  if (!b) return;
  const g = gallery.find((x) => x.id === b.dataset.gopen);
  if (!g) return;
  const animators = S.installed.filter((m) => S.catalog.media.find((c) => c.id === m.catalogId)?.animate);
  const box = openModal(`<div class="row" style="margin-bottom:10px"><h2 class="grow" style="margin:0">${esc(g.prompt || g.title || 'Untitled')}</h2><button class="btn small" data-close>Close</button></div>
    <div class="canvas-wrap">${g.kind === 'audio' ? `<audio src="${g.url}" controls autoplay style="width:100%"></audio>` : g.kind === 'video' ? `<video src="${g.url}" controls autoplay></video>` : `<img src="${g.url}" alt="">`}</div>
    <p class="small muted" style="font-weight:600">${[g.model, g.width && `${g.width}×${g.height}`, g.seed !== undefined && g.seed !== '' && `seed ${g.seed}`, g.seconds && `made in ${fmtSec(g.seconds)}`, new Date(g.created).toLocaleString()].filter(Boolean).map(esc).join(' · ')}</p>
    <div class="modal-actions" style="justify-content:flex-start">
      ${g.kind === 'image' ? '<button class="btn primary" data-g="edit">🪄 Edit</button>' : g.kind === 'video' ? '<button class="btn primary" data-g="vedit">✂️ Edit</button>' : ''}
      <button class="btn" data-g="fix">🧰 Quick fixes</button>
      ${g.kind === 'image' && animators.length ? '<button class="btn" data-g="animate">🎬 Animate</button>' : ''}
      ${g.kind === 'audio' ? '' : '<button class="btn" data-g="chat">💬 Ask AI about it</button>'}
      <button class="btn" data-g="export">⬇ Save as…</button><button class="btn" data-g="cloud">☁️ Send to cloud</button><button class="btn" data-g="reveal">📁 Show in folder</button>
      <button class="btn danger" data-g="delete">🗑 Delete</button>
    </div>`, { wide: true });
  box.addEventListener('click', async (ev) => {
    const act = ev.target.closest('[data-g]')?.dataset.g;
    if (!act) return;
    if (act === 'edit') { closeModal(); await loadEditor(g.id); studioTab = 'edit'; go({ view: 'studio' }); }
    if (act === 'vedit') { closeModal(); vid = { id: g.id }; studioTab = 'vedit'; go({ view: 'studio' }); }
    if (act === 'fix') { closeModal(); toolPick = g.id; studioTab = 'tools'; go({ view: 'studio' }); }
    if (act === 'animate') { closeModal(); studioTab = 'video'; go({ view: 'studio' }); setTimeout(() => { const s = $('#cv-from'); if (s) s.value = g.id; }, 50); }
    if (act === 'chat') {
      closeModal();
      if (g.kind === 'video') { const r = await call('media:videoFrames', g.id, 8); chatWithAttachment({ type: 'video', name: g.title || 'video', duration: r.duration, frames: r.frames }, 'What happens in this video?', S.data.assistants.find((a) => a.job === 'general')?.id); }
      else chatWithAttachment({ type: 'image', name: g.title || g.prompt || 'image', dataUrl: await shrinkImage(await qs.call('media:dataUrl', g.id)) }, 'What do you see in this picture?', S.data.assistants.find((a) => a.job === 'general')?.id);
    }
    if (act === 'export' && await call('media:export', g.id)) toast('Saved.');
    if (act === 'reveal') call('media:reveal', g.id);
    if (act === 'cloud') cloudSendModal({ mediaId: g.id });
    if (act === 'delete' && await confirmBox('Delete this from the gallery?')) { await call('media:remove', g.id); await refreshGallery(); render(); }
  });
});
