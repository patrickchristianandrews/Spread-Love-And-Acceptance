// Stacks: several models working as one. Pick a kind of work; the Stack Advisor combines the
// models you already have (nothing to download) and shows the best setup this PC could run.
'use strict';

let advJob = null;
let advResult = null;
let advOn = new Set();   // text stacks: targets ticked
let advLead = '';        // text stacks: '' = automatic
let advMode = 'blend';
let advKit = {};         // media stacks: role -> target
const ROLE = {
  vision: '<span class="badge b-sky">👁 Sees photos</span>',
  draft: '<span class="badge b-lav">✏️ Answers</span>',
  lead: '<span class="badge b-mint">★ Leads</span>',
};
const ROLE_ICON = { image: '🎨', video: '🎬', edit: '🪄', animate: '✨', helper: '✍️' };

views.stacks = {
  html() {
    const jobs = Object.entries(S.catalog.jobs);
    const goal = ([k, j]) => `<button class="goal ${advJob === k ? 'on' : ''}" data-job="${k}" aria-pressed="${advJob === k}">
      <span class="goal-ic">${j.icon}</span><span><b>${esc(j.label)}</b><span class="small muted">${esc(j.pitch)}</span></span></button>`;
    return `<div class="page">
      <div class="page-head"><h1>Stacks</h1><button class="btn" id="infuse">${icon('sparkle', 16)} Infuse any AIs, including cloud</button></div>
      <p class="lede">A stack makes several AI models work as one: they answer separately, then a lead combines the best of each and fixes mistakes.</p>
      ${foundBanner()}
      <div class="section"><h2>1. Choose a stack</h2>${hwLine()}</div>
      <div class="goal-group"><div class="label">Think &amp; work</div><div class="goal-grid">${jobs.filter(([, j]) => j.kind === 'text').map(goal).join('')}</div></div>
      <div class="goal-group"><div class="label">Create</div><div class="goal-grid">${jobs.filter(([, j]) => j.kind === 'media').map(goal).join('')}</div></div>
      <div class="section"><h2>2. Set it up</h2></div>
      <div id="adv-out">${advResult ? advisorHTML(advResult) : '<div class="empty">Checking your PC and your models…</div>'}</div>
      <div class="section"><h2>Your stacks</h2></div>
      ${yourStacksHTML()}
    </div>`;
  },
  bind() {
    if (!S.est) refreshEstimates().then(() => S.route.view === 'stacks' && render());
    loadFound();
    if (!advJob) { runAdvisor('general'); return; }
    $$('[data-job]').forEach((b) => b.addEventListener('click', () => runAdvisor(b.dataset.job)));
    $('#infuse').addEventListener('click', () => infuseModal());
    $('#found-review')?.addEventListener('click', foundModal);
    bindAdvisor();
    $$('[data-edit-stack]').forEach((b) => b.addEventListener('click', () => editStack(S.stacks.find((s) => s.id === b.dataset.editStack))));
    $$('[data-del-stack]').forEach((b) => b.addEventListener('click', async () => {
      if (!(await confirmBox('Delete this stack? The models stay installed.'))) return;
      await call('stacks:delete', b.dataset.delStack); await refreshModels(); render();
    }));
    $$('[data-chat-stack]').forEach((b) => b.addEventListener('click', () => {
      newChat(); const c = chatById(S.route.id); c.target = `stack:${b.dataset.chatStack}`; save(); render();
    }));
    $$('[data-kit-open]').forEach((b) => b.addEventListener('click', () => { studioTab = b.dataset.kitOpen === 'edit' ? 'edit' : 'create'; go({ view: 'studio' }); }));
    $$('[data-kit-del]').forEach((b) => b.addEventListener('click', () => { delete S.data.mediaKits[b.dataset.kitDel]; save(); render(); }));
  },
};

function hwLine() {
  const h = S.est?.hardware;
  if (!h) return '<span class="small muted">Checking your PC…</span>';
  return `<span class="small muted" style="font-weight:600">🖥️ ${h.ramGB.toFixed(0)} GB memory · ${esc(h.gpuName || 'no graphics card')}${h.vramGB ? ` (${h.vramGB.toFixed(0)} GB)` : ''} · <a href="#" data-goto-pc>details</a></span>`;
}
document.addEventListener('click', (e) => { if (e.target.closest('[data-goto-pc]')) { e.preventDefault(); go({ view: 'pc' }); } });

const modelName = (id) => S.installed.find((m) => m.id === id)?.name || [...S.catalog.text, ...S.catalog.media].find((m) => m.id === id)?.name || id;
const isInstalled = (id) => S.installed.some((m) => m.id === id || m.catalogId === id);

// ---------- models already on this PC from other apps ----------

function loadFound(force) {
  if (S.found !== undefined && !force) return;
  S.found = null;
  qs.call('models:found').then((r) => {
    S.found = r || [];
    if (S.found.length && ['stacks', 'models'].includes(S.route.view)) render();
  }).catch(() => { S.found = []; });
}

function foundBanner() {
  const f = S.found || [];
  if (!f.length) return '';
  const apps = [...new Set(f.map((x) => x.app))];
  return `<div class="notice info found-banner"><span class="grow"><b>📦 Found ${f.length} model${f.length > 1 ? 's' : ''} already on this PC</b> (${esc(apps.join(', '))}). Use ${f.length > 1 ? 'them' : 'it'} here without downloading or copying anything.</span>
    <button class="btn primary small" id="found-review">Review &amp; add</button></div>`;
}

function foundModal() {
  const f = S.found || [];
  const b = openModal(`<h2>📦 Models already on this PC</h2>
    <p class="help">These were downloaded by other apps or are in your Downloads folder. Quicksilver uses them where they are: nothing is copied, and removing them here never deletes the file.</p>
    <div class="pick-list">${f.map((m, i) => `<label class="pick-row"><input type="checkbox" data-found="${i}" checked>
      <span class="grow"><b>${esc(m.name)}</b>${m.vision ? ' <span title="Can see photos">👁</span>' : ''}<div class="small muted">${esc(m.app)} · ${gb(m.size)} · <span title="${esc(m.path)}">${esc(m.path.length > 70 ? `…${m.path.slice(-68)}` : m.path)}</span></div></span></label>`).join('')}</div>
    <div class="modal-actions"><button class="btn" data-close>Cancel</button><button class="btn primary" id="found-add">Add selected</button></div>`, { wide: true });
  b.querySelector('#found-add').addEventListener('click', async () => {
    const items = [...b.querySelectorAll('[data-found]:checked')].map((x) => f[Number(x.dataset.found)]);
    if (!items.length) { closeModal(); return; }
    const btn = b.querySelector('#found-add'); btn.disabled = true; btn.textContent = 'Adding…';
    const added = await call('models:addFound', items);
    closeModal();
    await refreshModels();
    S.found = f.filter((x) => !items.includes(x));
    toast(added.length ? `Added ${added.length} model${added.length > 1 ? 's' : ''}. No download needed.` : 'Those files could not be read as models.');
    if (advJob && S.route.view === 'stacks') runAdvisor(advJob); else render();
  });
}

// ---------- the advisor ----------

async function runAdvisor(job) {
  advJob = job; advResult = null;
  if (S.route.view === 'stacks') render();
  const r = await call('advisor:advise', job);
  if (advJob !== job) return;
  advResult = r;
  advMode = r.mode || 'blend';
  advLead = '';
  advOn = new Set(r.kind === 'text' && r.mine ? r.mine.ids.map((id) => `local:${id}`) : []);
  if (r.kind === 'text' && r.mine?.members.judge) advLead = `local:${r.mine.members.judge}`;
  advKit = r.kind === 'media' && r.mine ? Object.fromEntries(Object.entries(r.mine.members).map(([role, id]) => [role, `local:${id}`])) : {};
  if (S.route.view === 'stacks') render();
}

function advisorHTML(r) {
  return `<div class="adv-grid">${r.kind === 'media' ? mineKitHTML(r) : mineTextHTML(r)}${bestHTML(r)}</div>`;
}

// ----- text stacks: tick the models you have; roles are worked out for you -----

function textRows(r) {
  const local = (r.yours || []).map((y) => ({ target: `local:${y.id}`, name: y.name, vision: y.vision, score: y.score, judge: y.judge, est: y.est }));
  const cloud = S.targets.filter((t) => t.target.startsWith('api:')).map((t) => ({ target: t.target, name: t.label, vision: t.vision, score: 9, judge: 9, cloud: true }));
  return [...local.sort((a, b) => b.score - a.score), ...cloud];
}

// Works out who answers, who leads and who only reads photos, from the models ticked.
function textPlan(r) {
  const rows = textRows(r);
  const on = rows.filter((x) => advOn.has(x.target));
  let lead = on.length > 1 ? (on.find((x) => x.target === advLead) || [...on].sort((a, b) => b.judge - a.judge)[0]) : null;
  const top = Math.max(0, ...on.map((x) => x.score));
  // A weaker model that can see only reads photos when there are enough others to answer.
  let vision = on.length >= 3 ? on.find((x) => x.vision && x !== lead && x.score < top - 1 && !on.some((o) => o !== x && o.vision)) : null;
  let drafters = on.filter((x) => x !== lead && x !== vision);
  if (lead && drafters.length < 2) drafters = [...drafters, lead]; // with few models, the lead also answers
  if (!drafters.length && vision) { drafters = [vision]; vision = null; }
  const role = (x) => [x === vision && 'vision', drafters.includes(x) && 'draft', x === lead && 'lead'].filter(Boolean);
  const wps = (x) => (x.cloud ? 40 : Math.max(0.1, x.est?.wordsPerSec || 0.1));
  // Local models take turns; cloud models answer at the same time.
  const sec = (vision ? 250 / wps(vision) : 0) + drafters.filter((x) => !x.cloud).reduce((t, x) => t + 400 / wps(x), 0)
    + Math.max(0, ...drafters.filter((x) => x.cloud).map((x) => 400 / wps(x))) + (lead ? 450 / wps(lead) : 0);
  const sees = on.some((x) => x.vision);
  return { rows, on, drafters, lead, vision, role, sec, sees, ok: on.length >= 2 };
}

function mineTextHTML(r) {
  const rows = textRows(r);
  if (!rows.length) return `<div class="card adv-mine"><h3>🧩 Use the models you have</h3><p class="muted" style="font-weight:600">No models on this PC yet. Use the setup on the right${S.found?.length ? ', add the ones found on this PC above,' : ''} or import a .gguf file under Models.</p></div>`;
  const p = textPlan(r);
  return `<div class="card hl adv-mine">
    <div class="row"><h3 class="grow">🧩 Use the models you have</h3><span class="badge b-mint">Nothing to download</span></div>
    <p class="small muted adv-help">Tick the models to combine. The best mix for ${esc(r.label.toLowerCase())} is already ticked.</p>
    <div class="pick-list" id="adv-rows">${rowsHTML(p)}</div>
    <div class="adv-opts">
      <div class="field"><label for="adv-lead">Lead</label><select id="adv-lead"><option value="">Automatic: the strongest</option>${rows.map((x) => `<option value="${esc(x.target)}" ${x.target === advLead ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="adv-mode">Teamwork</label><select id="adv-mode">${Object.entries(INFUSE_MODES).map(([k, m]) => `<option value="${k}" ${k === advMode ? 'selected' : ''}>${m.icon} ${m.name} (${m.cost.toLowerCase()})</option>`).join('')}</select></div>
    </div>
    <div class="adv-foot"><span class="grow" id="adv-sum">${textSummary(p, r)}</span><button class="btn primary" id="adv-create" ${p.ok ? '' : 'disabled'}>Create stack</button></div>
  </div>`;
}

function rowsHTML(p) {
  return p.rows.map((x) => {
    const on = advOn.has(x.target);
    return `<label class="pick-row ${on ? 'on' : ''}"><input type="checkbox" data-use="${esc(x.target)}" ${on ? 'checked' : ''}>
      <span class="grow"><b>${esc(x.name)}</b>${x.vision ? ' <span title="Can see photos and video">👁</span>' : ''}${x.cloud ? ' <span class="small muted">☁ cloud</span>' : ''}</span>
      <span class="row" style="gap:4px">${on ? p.role(x).map((k) => ROLE[k]).join('') : ''}</span></label>`;
  }).join('');
}

function textSummary(p, r) {
  if (!p.ok) return '<span class="warn-text">Tick at least two models.</span>';
  const eyes = !p.sees && !['coding', 'reasoning'].includes(r.job) ? ' · <span class="warn-text">none can see photos</span>' : '';
  return `⏱ About <b>${fmtSec(p.sec)}</b> per answer on your PC${eyes}`;
}

// ----- media stacks: one installed model per role -----

function mineKitHTML(r) {
  const main = r.roles[0];
  const pool = (role) => (r.yours || []).filter((y) => (role === 'helper' ? y.category === 'text' : role === 'animate' ? y.category === 'video' && y.animate : role === 'image' ? y.category === 'image' : y.category === role));
  if (!r.mine) return `<div class="card adv-mine"><h3>🧩 Use the models you have</h3><p class="muted" style="font-weight:600">You don't have a model that ${esc(r.roleLabels[main].toLowerCase())} yet. Use the setup on the right, or pick one under Models → Images &amp; video.</p></div>`;
  return `<div class="card hl adv-mine">
    <div class="row"><h3 class="grow">🧩 Use the models you have</h3><span class="badge b-mint">Nothing to download</span></div>
    <p class="small muted adv-help">Choose a model for each job. Studio will use these by default.</p>
    <div class="kit-rows">${r.roles.map((role) => {
      const opts = pool(role);
      return `<div class="kit-row"><span class="kit-role">${ROLE_ICON[role]} ${esc(r.roleLabels[role])}</span>
        <select data-kit="${role}" ${opts.length ? '' : 'disabled'}>${opts.length ? `<option value="">None</option>${opts.map((y) => `<option value="local:${esc(y.id)}" ${advKit[role] === `local:${y.id}` ? 'selected' : ''}>${esc(y.name)}</option>`).join('')}` : '<option>None installed</option>'}</select></div>`;
    }).join('')}</div>
    <div class="adv-foot"><span class="grow small muted">✍️ The prompt writer powers the ✨ Improve buttons in Studio.</span><button class="btn primary" id="kit-create">Use this setup</button></div>
  </div>`;
}

// ----- the best this PC can run (from the catalog) -----

function bestHTML(r) {
  const s = r.best;
  const media = r.kind === 'media';
  if (!s || (media && !s.members[r.roles[0]])) return `<div class="card adv-best"><h3>🚀 Best for this PC</h3><p class="muted" style="font-weight:600">This PC doesn't have enough memory for ${esc(r.label.toLowerCase())} models.${media ? ' Studio\'s manual tools still work, or connect a cloud image API under Models.' : ' Close other apps, or connect a cloud API under Models.'}</p></div>`;
  if (!s.better && (r.mine)) return `<div class="card adv-best ok"><h3>🚀 Best for this PC</h3><p style="font-weight:650;margin:6px 0 0">Your models are already the best fit for ${esc(r.label.toLowerCase())} on this PC. Nothing to download.</p></div>`;
  const rows = media
    ? r.roles.filter((role) => s.members[role]).map((role) => [`<span class="badge b-lav">${ROLE_ICON[role]} ${esc(r.roleLabels[role])}</span>`, s.members[role]])
    : s.ids.map((id) => [[s.members.vision === id && 'vision', s.members.drafters.includes(id) && 'draft', s.members.judge === id && 'lead'].filter(Boolean).map((k) => ROLE[k]).join(''), id]);
  return `<div class="card adv-best">
    <div class="row"><h3 class="grow">🚀 Best for this PC</h3><span class="badge b-lav">${r.mine ? 'Upgrade' : 'Recommended'}</span></div>
    <p class="small muted adv-help">The strongest ${esc(r.label.toLowerCase())} setup this PC can run.</p>
    <div class="best-rows">${rows.map(([tags, id]) => `<div class="best-row"><b class="grow">${esc(modelName(id))}</b>${s.have[id] ? '<span class="have">✓ you have it</span>' : ''}<span class="row" style="gap:4px">${tags}</span></div>`).join('')}</div>
    <div class="adv-foot"><span class="grow small" style="font-weight:700">${media ? '' : `⏱ About ${fmtSec(s.secondsPerAnswer)} per answer · `}${s.missingGB ? `${s.missingGB.toFixed(1)} GB to download` : 'Everything installed'}</span>
    <button class="btn ${r.mine ? '' : 'primary'}" id="best-build">${s.missingGB ? 'Download & set up' : 'Set up'}</button></div>
  </div>`;
}

function bindAdvisor() {
  const r = advResult;
  if (!r) return;
  const out = $('#adv-out');
  out.addEventListener('change', (e) => {
    if (e.target.matches('[data-use]')) { if (e.target.checked) advOn.add(e.target.dataset.use); else advOn.delete(e.target.dataset.use); }
    if (e.target.id === 'adv-lead') { advLead = e.target.value; if (advLead) advOn.add(advLead); }
    if (e.target.id === 'adv-mode') advMode = e.target.value;
    if (e.target.matches('[data-kit]')) advKit[e.target.dataset.kit] = e.target.value;
    if (r.kind === 'text') {
      const p = textPlan(r);
      $('#adv-rows').innerHTML = rowsHTML(p);
      $('#adv-sum').innerHTML = textSummary(p, r);
      $('#adv-create').disabled = !p.ok;
    }
  });
  $('#adv-create')?.addEventListener('click', () => createMine(r));
  $('#kit-create')?.addEventListener('click', () => saveKit(r, advKit));
  $('#best-build')?.addEventListener('click', () => createBest(r));
}

async function saveTextStack(r, stack, waiting = 0) {
  await call('stacks:save', stack);
  // Point the matching assistant at the new stack, with its tuned settings.
  const a = S.data.assistants.find((x) => x.job === r.job);
  if (a) Object.assign(a, { target: `stack:${stack.id}`, temperature: r.settings.temperature, contextSize: r.settings.contextSize, maxTokens: r.settings.maxTokens });
  if (r.job === 'general' || !targetValid(S.data.prefs.defaultTarget)) S.data.prefs.defaultTarget = `stack:${stack.id}`;
  save();
  await refreshModels();
  if (waiting) { toast(`Stack created. ${waiting} model${waiting > 1 ? 's are' : ' is'} downloading; you can chat as soon as ${waiting > 1 ? 'they finish' : 'it finishes'}.`, 6000); render(); return; }
  toast(`${stack.name} is ready.${a ? ` ${a.name} now uses it.` : ''}`);
  if (a) newChat(a.id); else render();
}

// Media stacks are a set of Studio defaults, saved per kind of work.
function saveKit(r, kit, waiting = 0) {
  const k = Object.fromEntries(Object.entries(kit).filter(([, v]) => v));
  if (!k[r.roles[0]]) { toast(`Choose a model that ${r.roleLabels[r.roles[0]].toLowerCase()}.`); return; }
  S.data.mediaKits ||= {};
  S.data.mediaKits[r.job] = k;
  const p = S.data.prefs;
  if (k.image) p.imageModel = k.image;
  if (k.video) p.videoModel = k.video;
  if (k.edit) p.editModel = k.edit;
  if (k.animate && !p.videoModel) p.videoModel = k.animate;
  if (k.helper) p.promptHelper = k.helper;
  save();
  if (waiting) { toast(`Setting up ${r.label}. ${waiting} model${waiting > 1 ? 's are' : ' is'} downloading; Studio is ready when ${waiting > 1 ? 'they finish' : 'it finishes'}.`, 6000); render(); return; }
  toast(`${r.label} is set up. Studio now uses these models.`);
  studioTab = r.job === 'edit' ? 'edit' : 'create';
  go({ view: 'studio' });
}

async function createMine(r) {
  const p = textPlan(r);
  if (!p.ok) return;
  const job = S.catalog.jobs[r.job];
  await saveTextStack(r, {
    id: `${r.job}-mine`, name: job.label, emoji: job.icon, builtFor: r.job,
    members: { drafters: p.drafters.map((x) => x.target), judge: p.lead?.target, vision: p.vision?.target, mode: advMode },
  });
}

async function createBest(r) {
  const s = r.best;
  const job = S.catalog.jobs[r.job];
  const target = (id) => `local:${s.have[id] || id}`;
  const missing = s.ids.filter((id) => !s.have[id]);
  for (const id of missing) if (!S.downloads[id]) await download({ catalogId: id }, modelName(id));
  if (r.kind === 'media') { saveKit(r, Object.fromEntries(Object.entries(s.members).map(([role, id]) => [role, target(id)])), missing.length); return; }
  await saveTextStack(r, {
    id: `${r.job}-best`, name: `${job.label} · Best`, emoji: job.icon, builtFor: r.job,
    members: { drafters: s.members.drafters.map(target), judge: s.members.judge ? target(s.members.judge) : undefined, vision: s.members.vision ? target(s.members.vision) : undefined, mode: r.mode },
  }, missing.length);
}

function yourStacksHTML() {
  const kits = Object.entries(S.data.mediaKits || {}).filter(([k]) => S.catalog.jobs[k]);
  if (!S.stacks.length && !kits.length) return '<p class="muted">No stacks yet. Choose one above.</p>';
  return `<div class="cards">${S.stacks.map(stackCard).join('')}${kits.map(([k, kit]) => kitCard(k, kit)).join('')}</div>`;
}

function kitCard(k, kit) {
  const j = S.catalog.jobs[k];
  const labels = { image: 'Creates pictures', video: 'Makes videos', edit: 'Edits photos', animate: 'Brings photos to life', helper: 'Writes prompts' };
  return `<div class="card">
    <div class="row"><span class="emoji-badge">${j.icon}</span><h3 class="grow">${esc(j.label)}</h3><span class="badge b-peach">Studio</span></div>
    <div class="stack-v" style="gap:6px;margin:12px 0">${Object.entries(kit).map(([role, t]) => `<div class="row"><span class="badge b-lav">${ROLE_ICON[role]} ${labels[role]}</span><b class="small">${esc(targetLabel(t) === 'No model chosen' ? modelName(t.replace(/^local:/, '')) : targetLabel(t))}</b>${isInstalled(t.replace(/^local:/, '')) ? '' : '<span class="badge b-pink">downloading</span>'}</div>`).join('')}</div>
    <div class="row"><button class="btn small primary" data-kit-open="${k}">Open Studio</button><button class="btn small danger" data-kit-del="${k}">Remove</button></div>
  </div>`;
}

function stackCard(s) {
  const rows = [];
  if (s.members.vision) rows.push(['vision', s.members.vision]);
  for (const d of s.members.drafters || []) rows.push(['draft', d]);
  if (s.members.judge) rows.push(['lead', s.members.judge]);
  const mode = s.members.mode && INFUSE_MODES[s.members.mode];
  return `<div class="card">
    <div class="row"><span class="emoji-badge">${esc(s.emoji || '🧩')}</span><h3 class="grow">${esc(s.name)}</h3>${mode ? `<span class="badge b-lav">${mode.icon} ${esc(mode.name)}</span>` : ''}</div>
    <div class="stack-v" style="gap:6px;margin:12px 0">${rows.map(([role, t]) => `<div class="row">${ROLE[role]}<b class="small">${esc(targetLabel(t))}</b>${targetValid(t) ? '' : '<span class="badge b-pink">not installed yet</span>'}</div>`).join('')}</div>
    <div class="row"><button class="btn small primary" data-chat-stack="${s.id}">Chat</button><button class="btn small" data-edit-stack="${s.id}">Edit</button><button class="btn small danger" data-del-stack="${s.id}">Delete</button></div>
  </div>`;
}

function editStack(s) {
  const v = s || { name: '', emoji: '🧩', members: { drafters: [] } };
  const nonStack = { ...S, targets: S.targets.filter((t) => !t.stack) };
  const opts = (sel, none) => { const keep = S.targets; S.targets = nonStack.targets; const h = targetOptions(sel, { includeNone: true, noneLabel: none }); S.targets = keep; return h; };
  const visionOpts = () => `<option value="">None (or a drafter can see)</option>${S.targets.filter((t) => t.vision && !t.stack).map((t) => `<option value="${esc(t.target)}" ${t.target === v.members.vision ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}`;
  const b = openModal(`<h2>${s ? 'Edit stack' : 'Build your own stack'}</h2>
    <p class="help">Mix any models: ones on this PC and ones from connected APIs (for example, two local drafters with Claude or GPT as the lead). Local models take turns; cloud models run at the same time.</p>
    <div class="stack-v">
      <div class="row"><div class="field" style="width:110px"><label for="st-emoji">Icon</label><select id="st-emoji">${['🧩', '🚀', '📊', '🔎', '💻', '📷', '⚖️', '🧠'].map((e) => `<option ${e === v.emoji ? 'selected' : ''}>${e}</option>`).join('')}</select></div>
      <div class="field grow"><label for="st-name">Name</label><input id="st-name" value="${esc(v.name)}" placeholder="e.g. Research Powerhouse"></div></div>
      <div class="field"><label>${ROLE.vision}</label><select id="st-vision">${visionOpts()}</select></div>
      ${[0, 1, 2].map((i) => `<div class="field"><label>${ROLE.draft} ${i ? '(optional)' : ''}</label><select id="st-d${i}">${opts(v.members.drafters?.[i], i ? 'None' : 'Choose a model')}</select></div>`).join('')}
      <div class="field"><label>${ROLE.lead}</label><span class="help">Reads the drafts, fixes mistakes and writes the final answer. Pick your strongest model.</span><select id="st-lead">${opts(v.members.judge, 'None (use the first drafter only)')}</select></div>
    </div>
    <div class="modal-actions"><button class="btn" data-close>Cancel</button><button class="btn primary" id="st-save">Save stack</button></div>`);
  b.querySelector('#st-save').addEventListener('click', async () => {
    const drafters = [0, 1, 2].map((i) => b.querySelector(`#st-d${i}`).value).filter(Boolean);
    const name = b.querySelector('#st-name').value.trim();
    if (!name || !drafters.length) { toast('Give it a name and at least one drafter.'); return; }
    await call('stacks:save', { ...(s || {}), id: s?.id || uid(), name, emoji: b.querySelector('#st-emoji').value, members: { vision: b.querySelector('#st-vision').value || undefined, drafters, judge: b.querySelector('#st-lead').value || undefined } });
    closeModal(); await refreshModels(); render(); toast('Stack saved.');
  });
}

// ---------- Infuse: fuse several AIs into one ----------

const INFUSE_MODES = {
  blend: { name: 'Blend', icon: '🫧', blurb: 'Each AI answers; a lead merges the best of all of them into one answer.', cost: 'Fastest' },
  debate: { name: 'Debate', icon: '⚔️', blurb: 'Each AI answers, then critiques the others and revises; a lead judges the result.', cost: 'Most accurate, slowest' },
  consensus: { name: 'Consensus', icon: '🤝', blurb: 'Builds on what most AIs agree on and flags where they disagree. Best for facts.', cost: 'Balanced' },
};

function strengthOf(t) {
  if (t.startsWith('api:')) return 9;
  const inst = S.installed.find((m) => `local:${m.id}` === t);
  return S.catalog.text.find((c) => c.id === inst?.catalogId)?.judge ?? 5;
}

function infuseModal(onCreated) {
  const options = S.targets.filter((t) => !t.stack);
  if (options.length < 2) { toast('Install or connect at least two models to infuse them. Open Models, or the Stack Advisor.', 6000); return; }
  const b = openModal(`<h2>✨ Infuse AIs</h2>
    <p class="help">Choose 2 to 4 AIs. Mixing different makers (for example Qwen + Llama + Claude) gives the biggest boost: they make different mistakes, so they catch each other's.</p>
    <div class="stack-v">
      <div class="label">1. Pick the AIs to infuse</div>
      <div class="infuse-pick">${options.map((t) => `<label class="infuse-opt"><input type="checkbox" value="${esc(t.target)}"> <span class="grow">${esc(t.label)}${t.vision ? ' 👁' : ''}<div class="small muted">${esc(t.group)}</div></span></label>`).join('')}</div>
      <div class="label">2. How should they work together?</div>
      <div class="infuse-modes">${Object.entries(INFUSE_MODES).map(([k, m], i) => `<label class="infuse-mode"><input type="radio" name="im" value="${k}" ${i === 0 ? 'checked' : ''}><div style="font-size:1.4rem">${m.icon}</div><b>${m.name}</b><div class="small muted" style="font-weight:600;margin:4px 0">${esc(m.blurb)}</div><span class="badge b-lav">${esc(m.cost)}</span></label>`).join('')}</div>
      <div class="grid2">
        <div class="field"><label for="inf-lead">3. Lead (writes the final answer)</label><select id="inf-lead"><option value="">Automatic: the strongest one you picked</option>${options.map((t) => `<option value="${esc(t.target)}">${esc(t.label)}</option>`).join('')}</select></div>
        <div class="field"><label for="inf-name">4. Name your infused AI</label><input id="inf-name" placeholder="e.g. Analyst Supreme"></div>
      </div>
    </div>
    <div class="modal-actions"><span class="small muted grow" id="inf-count">Pick 2 to 4 AIs.</span><button class="btn" data-close>Cancel</button><button class="btn primary" id="inf-go">${icon('sparkle', 16)} Infuse</button></div>`, { wide: true });
  const picked = () => [...b.querySelectorAll('.infuse-opt input:checked')].map((x) => x.value);
  b.querySelector('.infuse-pick').addEventListener('change', () => {
    const n = picked().length;
    b.querySelector('#inf-count').textContent = n < 2 ? 'Pick 2 to 4 AIs.' : n > 4 ? 'Four is the most that helps; extra AIs mostly add time.' : `${n} AIs selected.`;
  });
  b.querySelector('#inf-go').addEventListener('click', async () => {
    const drafters = picked();
    if (drafters.length < 2 || drafters.length > 4) { toast('Pick between 2 and 4 AIs.'); return; }
    const mode = b.querySelector('input[name="im"]:checked').value;
    const judge = b.querySelector('#inf-lead').value || [...drafters].sort((x, y) => strengthOf(y) - strengthOf(x))[0];
    const canSee = (t) => S.targets.find((x) => x.target === t)?.vision;
    const vision = drafters.some(canSee) ? undefined : S.targets.find((t) => t.vision && !t.stack)?.target;
    const short = (t) => (S.targets.find((x) => x.target === t)?.label || '').split(/[ (]/)[0];
    const name = b.querySelector('#inf-name').value.trim() || `${drafters.map(short).join(' + ')} ${INFUSE_MODES[mode].name}`;
    const stack = { id: `inf-${uid()}`, name, emoji: '✨', infused: true, members: { drafters, judge, vision, mode } };
    await call('stacks:save', stack);
    await refreshModels();
    closeModal();
    toast(`${name} is ready. It works like any model: pick it in a chat, an assistant or the API.`, 6000);
    if (onCreated) onCreated(stack); else render();
  });
}
