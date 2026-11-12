// Stacks: several models working as one. Pick a kind of work; the Setup Advisor combines the
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
const ROLE_ICON = { image: '🎨', openimage: '🔓', anime: '🎌', video: '🎬', edit: '🪄', animate: '✨', helper: '✍️' };

views.stacks = {
  html() {
    const jobs = Object.entries(S.catalog.jobs).filter(([, j]) => !j.hidden);
    const goal = ([k, j]) => `<button class="goal ${advJob === k ? 'on' : ''}" data-job="${k}" aria-pressed="${advJob === k}">
      <span class="goal-ic">${j.icon}</span><span><b>${esc(j.label)}</b><span class="small muted">${esc(j.pitch)}</span></span></button>`;
    const head = `<div class="page-head"><h1>Stacks &amp; Fusion</h1><a href="#" class="small og-link" data-guide="stacks" style="align-self:center">ⓘ What's the difference?</a></div>
      <div class="tabs sf-tabs" role="tablist">
        <button class="tab ${stacksTab === 'stacks' ? 'active' : ''}" data-sf-tab="stacks" role="tab" aria-selected="${stacksTab === 'stacks'}">🧩 Stacks <span class="sf-sub">ready-made by Quicksilver</span></button>
        <button class="tab ${stacksTab === 'fusion' ? 'active' : ''}" data-sf-tab="fusion" role="tab" aria-selected="${stacksTab === 'fusion'}">⚗️ Fusion <span class="sf-sub">build your own custom AI</span></button>
        <button class="tab ${stacksTab === 'community' ? 'active' : ''}" data-sf-tab="community" role="tab" aria-selected="${stacksTab === 'community'}">🌍 User-submitted <span class="sf-sub">custom AIs others shared</span></button>
      </div>`;
    if (stacksTab === 'fusion') return `<div class="page">${head}${fusionPageHTML()}</div>`;
    if (stacksTab === 'community') return `<div class="page">${head}${communityTabHTML()}</div>`;
    return `<div class="page">
      ${head}
      <p class="lede"><b>A stack is a ready-made combination of AI models, picked and set up by Quicksilver for a job and fitted to this PC.</b> They answer separately, then a lead combines the best of each and fixes mistakes. Pick what you want to do and Quicksilver shows the best stack for this PC. Want to choose the AIs yourself, cloud ones included? That's <a href="#" data-sf-tab="fusion">⚗️ Fusion</a>.</p>
      ${foundBanner()}
      ${shownUpgrades().length || shownStackUpdates().length ? modelUpdatesHTML() : ''}
      <div class="section"><h2>Your stacks</h2><span class="small muted">The stacks on this PC, each with the API that would add the most to it. Your fusions are on the <a href="#" data-sf-tab="fusion">⚗️ Fusion</a> tab.</span></div>
      ${yourStacksHTML()}
      ${kitsHTML()}
      ${liquidEditionsHTML()}
      <div class="section sf-new"><h2>Set up another stack</h2><span class="small muted">Two steps: pick the job, then press the button.</span></div>
      <div class="section"><h2>1. What do you want to do?</h2>${hwLine()}<button class="btn small" data-goto="compare" style="margin-left:auto">Compare stacks</button></div>
      <div class="goal-group"><div class="label">Think &amp; work</div><div class="goal-grid">${jobs.filter(([, j]) => j.kind === 'text').map(goal).join('')}</div></div>
      <div class="goal-group"><div class="label">Pictures, video &amp; music</div><div class="goal-grid">${jobs.filter(([, j]) => j.kind === 'media' || j.kind === 'music').map(goal).join('')}</div></div>
      <div class="section"><h2>2. Set it up</h2></div>
      <div id="adv-out">${advResult ? advisorHTML(advResult) : '<div class="empty">Checking your PC and your models…</div>'}</div>
      ${recipesHTML()}
      ${suggestSectionHTML('stacks')}
    </div>`;
  },
  bind() {
    if (!S.est) refreshEstimates().then(() => S.route.view === 'stacks' && render());
    loadFound();
    $$('[data-sf-tab]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); stacksTab = b.dataset.sfTab; render(); }));
    if (stacksTab !== 'community' && document.querySelector('.sug-sec')) bindSuggest(document.querySelector('.sug-sec'));
    $$('[data-sug-open]').forEach((b) => b.addEventListener('click', () => suggestModal(b.dataset.sugOpen)));
    bindStackApi();
    $$('#fusion-new-main').forEach((b) => b.addEventListener('click', () => infuseModal(() => render())));
    if (stacksTab === 'community') bindCommunity();
    if (!advJob) { runAdvisor('general'); return; }
    $$('[data-job]').forEach((b) => b.addEventListener('click', () => runAdvisor(b.dataset.job)));
    $$('#main [data-goto]').forEach((b) => b.addEventListener('click', () => go({ view: b.dataset.goto })));
    $('#found-review')?.addEventListener('click', foundModal);
    if (stacksTab === 'stacks') bindAdvisor(); // the Setup Advisor is only on the Stacks tab
    bindRecipes();
    $$('[data-edit-stack]').forEach((b) => b.addEventListener('click', () => { const st = S.stacks.find((s) => s.id === b.dataset.editStack); if (isFusion(st) && st.infused) infuseModal(() => render(), st); else editStack(st); }));
    $$('[data-liquid-addons]').forEach((b) => b.addEventListener('click', () => liquidAddonsModal()));
    $$('[data-fz-rate]').forEach((b) => b.addEventListener('click', () => fusionRateModal(b.dataset.fzRate)));
    $$('[data-del-stack]').forEach((b) => b.addEventListener('click', async () => {
      if (!(await confirmBox(`Delete this ${S.stacks.find((s) => s.id === b.dataset.delStack) && isFusion(S.stacks.find((s) => s.id === b.dataset.delStack)) ? 'fusion' : 'stack'}? The models stay installed.`))) return;
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
    <p class="help">These chat models were downloaded by other apps or are in your Downloads folder. Tick the ones you want to use in Quicksilver; none are added unless you choose them, and an added model is only used when you pick it (or tick it under Models → Models in use). Quicksilver uses them where they are: nothing is copied, and removing them here never deletes the file.</p>
    <div class="pick-list">${f.map((m, i) => `<label class="pick-row"><input type="checkbox" data-found="${i}">
      <span class="grow"><b>${esc(m.name)}</b>${m.vision ? ' <span title="Can see photos">👁</span>' : ''}<div class="small muted">${esc(m.app)} · ${gb(m.size)} · <span title="${esc(m.path)}">${esc(m.path.length > 70 ? `…${m.path.slice(-68)}` : m.path)}</span></div></span></label>`).join('')}</div>
    <div class="modal-actions"><button class="btn" data-close>Cancel</button><button class="btn primary" id="found-add">Add selected</button></div>`, { wide: true });
  b.querySelector('#found-add').addEventListener('click', async () => {
    const items = [...b.querySelectorAll('[data-found]:checked')].map((x) => f[Number(x.dataset.found)]);
    if (!items.length) { closeModal(); return; }
    const btn = b.querySelector('#found-add'); btn.disabled = true; btn.textContent = 'Adding…';
    let added;
    try { added = await qs.call('models:addFound', items); } catch (err) { btn.disabled = false; btn.textContent = 'Add selected'; toast(err.message, 8000); return; }
    closeModal();
    await refreshModels();
    S.found = f.filter((x) => !items.includes(x));
    toast(added.length ? `Added ${added.length} model${added.length > 1 ? 's' : ''}. No download needed. ${added.length > 1 ? 'They are' : 'It is'} only used when you choose ${added.length > 1 ? 'them' : 'it'}; to let Quicksilver use ${added.length > 1 ? 'them' : 'it'} by itself, tick ${added.length > 1 ? 'them' : 'it'} under Models → Models in use.` : 'Those files could not be read as chat models.', 9000);
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
  if (r.kind === 'music') return songsHTML(r);
  return `${howItWorksHTML(r)}<div class="adv-grid">${r.kind === 'media' ? mineKitHTML(r) : mineTextHTML(r)}${bestHTML(r)}</div>${tiersHTML(r)}${cloudHTML(r)}`;
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
  if (!rows.length) {
    const any = S.installed.some((m) => m.kind === 'text');
    const why = any && r.job === 'open' ? 'None of your models are unfiltered ones yet. Use the setup on the right, or add a Hermes, Dolphin or Mistral model (from LM Studio, Ollama or Models).'
      : `No models on this PC yet. Use the setup on the right${S.found?.length ? ', add the ones found on this PC above,' : ''} or import a .gguf file under Models.`;
    return `<div class="card adv-mine"><h3>Use the models you have</h3><p class="muted" style="font-weight:600">${why}</p></div>`;
  }
  const p = textPlan(r);
  return `<div class="card hl adv-mine">
    <div class="row"><h3 class="grow">Use the models you have</h3><span class="badge b-mint">Nothing to download</span></div>
    <p class="small muted adv-help">Tick the models to combine. The best mix for ${esc(r.label.toLowerCase())} is already ticked.</p>
    <div class="pick-list" id="adv-rows">${rowsHTML(p)}</div>
    <div class="adv-opts">
      <div class="field"><label for="adv-lead">Lead</label><select id="adv-lead"><option value="">Automatic: the strongest</option>${rows.map((x) => `<option value="${esc(x.target)}" ${x.target === advLead ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="adv-mode">Teamwork</label><select id="adv-mode">${Object.entries(INFUSE_MODES).map(([k, m]) => `<option value="${k}" ${k === advMode ? 'selected' : ''}>${m.icon} ${m.name} (${m.cost.toLowerCase()})</option>`).join('')}</select></div>
    </div>
    <div id="adv-preview">${p.ok ? teamPreviewHTML(planMembers(p)) : ''}</div>
    <div class="adv-foot"><span class="grow" id="adv-sum">${textSummary(p, r)}</span><button class="btn primary" id="adv-create" ${p.ok ? '' : 'disabled'}>Create team</button></div>
  </div>`;
}

const planMembers = (p) => ({ drafters: p.drafters.map((x) => x.target), judge: p.lead?.target, vision: p.vision?.target, mode: advMode });

function rowsHTML(p) {
  return p.rows.map((x) => {
    const on = advOn.has(x.target);
    return `<label class="pick-row ${on ? 'on' : ''}"><input type="checkbox" data-use="${esc(x.target)}" ${on ? 'checked' : ''}>
      <span class="grow"><b>${esc(x.name)}</b>${x.vision ? ' <span title="Can see photos and video">👁</span>' : ''}${x.cloud ? ' <span class="small muted">☁ cloud</span>' : ''}</span>
      <span class="row roles" style="gap:4px">${on ? p.role(x).map((k) => ROLE[k]).join('') : ''}</span></label>`;
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
  const pool = (role) => (r.yours || []).filter((y) => (role === 'helper' ? y.category === 'text' : role === 'animate' ? y.category === 'video' && y.animate : role === 'image' ? (y.category === 'image' || y.category === 'open') : y.category === role));
  if (!r.mine) return `<div class="card adv-mine"><h3>Use the models you have</h3><p class="muted" style="font-weight:600">You don't have a model that ${esc(r.roleLabels[main].toLowerCase())} yet. Use the setup on the right, or pick one under Models → Images &amp; video.</p></div>`;
  return `<div class="card hl adv-mine">
    <div class="row"><h3 class="grow">Use the models you have</h3><span class="badge b-mint">Nothing to download</span></div>
    <p class="small muted adv-help">Choose a model for each job. Chats and Gallery & tools will use these by default.</p>
    <div class="kit-rows">${r.roles.map((role) => {
      const opts = pool(role);
      return `<div class="kit-row"><span class="kit-role">${ROLE_ICON[role]} ${esc(r.roleLabels[role])}</span>
        <select data-kit="${role}" ${opts.length ? '' : 'disabled'}>${opts.length ? `<option value="">None</option>${opts.map((y) => `<option value="local:${esc(y.id)}" ${advKit[role] === `local:${y.id}` ? 'selected' : ''}>${esc(y.name)}</option>`).join('')}` : '<option>None installed</option>'}</select></div>`;
    }).join('')}</div>
    <div class="adv-foot"><span class="grow small muted">✍️ The prompt writer powers the ✨ Improve buttons in Gallery &amp; tools.</span><button class="btn primary" id="kit-create">Use this setup</button></div>
  </div>`;
}

// ----- the best this PC can run (from the catalog) -----

function bestHTML(r) {
  const s = r.best;
  const media = r.kind === 'media';
  if (!s || (media && !s.members[r.roles[0]])) return `<div class="card adv-best"><h3>Best for this PC</h3><p class="muted" style="font-weight:600">This PC doesn't have enough memory for ${esc(r.label.toLowerCase())} models.${media ? ' Create\'s manual tools still work, or connect a cloud image API under Models.' : ' Close other apps, or connect a cloud API under Models.'}</p></div>`;
  if (!s.better && (r.mine)) return `<div class="card adv-best ok"><h3>Best for this PC</h3><p style="font-weight:650;margin:6px 0 0">Your models are already the best fit for ${esc(r.label.toLowerCase())} on this PC. Nothing to download.</p></div>`;
  const rows = media
    ? r.roles.filter((role) => s.members[role]).map((role) => [`<span class="badge b-lav">${ROLE_ICON[role]} ${esc(r.roleLabels[role])}</span>`, s.members[role]])
    : s.ids.map((id) => [[s.members.vision === id && 'vision', s.members.drafters.includes(id) && 'draft', s.members.judge === id && 'lead'].filter(Boolean).map((k) => ROLE[k]).join(''), id]);
  return `<div class="card adv-best">
    <div class="row"><h3 class="grow">Best for this PC</h3><span class="badge b-lav">${r.mine ? 'Upgrade' : 'Recommended'}</span></div>
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
      // Update each row's tags in place (redrawing the list would lose focus and feel jumpy).
      for (const x of p.rows) {
        const row = out.querySelector(`[data-use="${CSS.escape(x.target)}"]`)?.closest('.pick-row');
        if (!row) continue;
        const on = advOn.has(x.target);
        row.classList.toggle('on', on);
        row.querySelector('.roles').innerHTML = on ? p.role(x).map((k) => ROLE[k]).join('') : '';
      }
      $('#adv-sum').innerHTML = textSummary(p, r);
      $('#adv-preview').innerHTML = p.ok ? teamPreviewHTML(planMembers(p)) : '';
      $('#adv-create').disabled = !p.ok;
    }
  });
  $('#adv-create')?.addEventListener('click', () => createMine(r));
  $('#kit-create')?.addEventListener('click', () => saveKit(r, advKit));
  $('#best-build')?.addEventListener('click', () => createBest(r));
  bindStacksMore(r);
}

async function saveTextStack(r, stack, waiting = 0) {
  await call('stacks:save', stack);
  // Point the matching assistant at the new team, with its tuned settings.
  const a = S.data.assistants.find((x) => x.job === r.job);
  if (a) Object.assign(a, { target: `stack:${stack.id}`, temperature: r.settings.temperature, contextSize: r.settings.contextSize, maxTokens: r.settings.maxTokens });
  if (r.job === 'general' || !targetValid(S.data.prefs.defaultTarget)) { S.data.prefs.defaultTarget = `stack:${stack.id}`; S.data.prefs.defaultAuto = false; }
  save();
  await refreshModels();
  if (waiting) { toast(`Team created. ${waiting} model${waiting > 1 ? 's are' : ' is'} downloading; you can chat as soon as ${waiting > 1 ? 'they finish' : 'it finishes'}.`, 6000); render(); return; }
  toast(`${stack.name} is ready.${a ? ` ${a.name} now uses it.` : ''}`);
  if (a) newChat(a.id); else render();
}

// Media teams are a set of Create defaults, saved per kind of work.
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
  if (waiting) { toast(`Setting up ${r.label}. ${waiting} model${waiting > 1 ? 's are' : ' is'} downloading; pictures and video are ready when ${waiting > 1 ? 'they finish' : 'it finishes'}.`, 6000); render(); return; }
  toast(`${r.label} is set up. Pictures and video now use these models.`);
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

// Stacks are ready-made (Quicksilver picks the models); a fusion is a mix you chose yourself
// (including the one-click fusions). They're kept apart everywhere so they never get confused.
const isFusion = (s) => Boolean(s?.infused || s?.builtFor === 'power');
let stacksTab = 'stacks';
function yourStacksHTML() {
  const list = S.stacks.filter((s) => !isFusion(s));
  if (!list.length) return '<p class="muted">No stacks yet. Pick what you want to do below, or set up a ready-made one further down.</p>';
  return `<div class="cards">${list.map(stackCard).join('')}</div>`;
}
// Create kits are the picture and video models Create uses: not a stack, so they get their own section.
function kitsHTML() {
  const kits = Object.entries(S.data.mediaKits || {}).filter(([k]) => S.catalog.jobs[k]);
  if (!kits.length) return '';
  return `<div class="section"><h2>🎨 Picture &amp; video kits</h2><span class="small muted">The picture and video models Quicksilver uses when you ask for one. Not stacks: they make media, they don't answer chats.</span></div>
    <div class="cards">${kits.map(([k, kit]) => kitCard(k, kit)).join('')}</div>`;
}

// ---------- the Fusion tab ----------
function fusionPageHTML() {
  const mine = S.stacks.filter(isFusion);
  return `<div class="card fusion-hero"><div class="row" style="align-items:flex-start;gap:14px"><span class="emoji-badge" style="font-size:1.6rem">⚗️</span><div class="grow">
      <h2 style="margin:0 0 4px">Fusion: build your own custom AI</h2>
      <p style="margin:0 0 10px">Mix 2 to 4 AIs, on this PC and in the cloud, into one custom AI with its own name. Save it, use it anywhere like any model, and share it with everyone if you like.</p>
      <div class="sf-steps"><div><b>1</b><span>Pick the AIs<br><span class="small muted">mix makers: Qwen + Llama + Claude catch each other's mistakes</span></span></div><div><b>2</b><span>Pick how they work together<br><span class="small muted">blend, debate, vote, red team…</span></span></div><div><b>3</b><span>Name it and save it<br><span class="small muted">it's yours, under ⚗️ Fusions in every model menu</span></span></div><div><b>4</b><span>Share it (optional)<br><span class="small muted">📤 Publish it to User-submitted stacks</span></span></div></div>
      <div class="small muted" style="margin-top:8px">How it differs from a stack: Quicksilver picks a stack's models for you; in your custom AI you pick them, cloud AIs included.</div></div>
      <div class="stack-v" style="gap:6px"><button class="btn primary" id="fusion-new-main">⚗️ Build a custom AI</button><button class="btn" data-import-ai>⬇ Import one</button></div></div></div>
    <div class="section"><h2>Your custom AIs</h2><span class="small muted">Rename with Edit; share with 📤 Publish.</span></div>
    ${mine.length ? `<div class="cards">${mine.map(stackCard).join('')}</div>` : '<p class="muted">No custom AIs yet. Press ⚗️ Build a custom AI, or start with a one-click fusion below.</p>'}
    ${suggestSectionHTML('fusion')}
    ${powerMovesHTML()}
    <div class="section"><h2>Ways they can work together</h2><span class="small muted">You choose one when you make a fusion.</span></div>
    <div class="cards sf-modes">${Object.values(INFUSE_MODES).map((m) => `<div class="card"><div class="row"><span style="font-size:1.3rem">${m.icon}</span><b class="grow">${esc(m.name)}</b><span class="badge b-lav">${esc(m.cost)}</span></div><p class="small" style="margin:6px 0 0">${esc(m.blurb)}</p></div>`).join('')}</div>`;
}

function kitCard(k, kit) {
  const j = S.catalog.jobs[k];
  const labels = { image: 'Creates pictures', video: 'Makes videos', edit: 'Edits photos', animate: 'Brings photos to life', helper: 'Writes prompts' };
  return `<div class="card">
    <div class="row"><span class="emoji-badge">${j.icon}</span><h3 class="grow">${esc(j.label)}</h3><span class="badge b-peach">Pictures &amp; video</span></div>
    <div class="stack-v" style="gap:6px;margin:12px 0">${Object.entries(kit).map(([role, t]) => `<div class="row"><span class="badge b-lav">${ROLE_ICON[role]} ${labels[role]}</span><b class="small">${esc(targetLabel(t) === 'No model chosen' ? modelName(t.replace(/^local:/, '')) : targetLabel(t))}</b>${isInstalled(t.replace(/^local:/, '')) ? '' : '<span class="badge b-pink">downloading</span>'}</div>`).join('')}</div>
    <div class="row"><button class="btn small primary" data-kit-open="${k}">Open Gallery &amp; tools</button><button class="btn small danger" data-kit-del="${k}">Remove</button></div>
  </div>`;
}

// A stack's best tested scores (its strongest member on each test) and what it can create.
function stackScoresHTML(targets) {
  const sc = bestScores(stackScoreIds(targets.filter((t) => !String(t).startsWith('api:'))));
  return `<div class="mp sc-stack">${scoreChipsHTML(sc, { label: 'Best member', note: sc ? 'Each score is its strongest member on that test; working as a team usually adds a little on hard questions.' : '' })}${createRowHTML(stackRatings(targets), { all: true })}</div>`;
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
    ${isFusion(s) ? fusionRatingsHTML(s.members, { compact: true }) : ''}
    ${timesHTML(etaFor(`stack:${s.id}`))}
    ${stackApiHTML(s)}
    <details class="card-fold"><summary class="small muted">Test scores and what it can make</summary>${stackScoresHTML(rows.map(([, t]) => t))}${boostsHTML(rows.map(([, t]) => t), { compact: true, liquid: isLiquidStack(s) })}</details>
    <div class="row card-acts"><button class="btn small primary" data-chat-stack="${s.id}">Chat</button>${isLiquidStack(s) ? '' : `<button class="btn small" data-edit-stack="${s.id}">Edit</button>`}${isFusion(s) ? `<button class="btn small" data-fz-rate="${s.id}">📊 Rating &amp; tips</button>` : ''}${boostBtn(`stack:${s.id}`)}${s.builtFor === 'quicksilver' ? `<button class="btn small" data-liquid-addons title="Optional models that fill gaps in the Liquid Edition">💧 Suggested add-ons${liquidAddonsLeft() ? ` · ${liquidAddonsLeft()}` : ''}</button>` : ''}<button class="btn small ghost" data-sug-open="stack:${s.id}" title="The best model to join and API to add for a task you pick">💡 What to add</button>${isFusion(s) && !s.community ? `<button class="btn small" data-publish="${s.id}">📤 Publish</button>` : ''}${isLiquidStack(s) ? '<span class="badge b-lav" title="The Liquid Edition can\'t be edited or deleted; choose another model or stack whenever you like">🔒 Locked</span>' : `<button class="btn small danger" data-del-stack="${s.id}">Delete</button>`}</div>
  </div>`;
}

function editStack(s) {
  const v = s || { name: '', emoji: '🧩', members: { drafters: [] } };
  const nonStack = { ...S, targets: S.targets.filter((t) => !t.stack) };
  const opts = (sel, none) => { const keep = S.targets; S.targets = nonStack.targets; const h = targetOptions(sel, { includeNone: true, noneLabel: none }); S.targets = keep; return h; };
  const visionOpts = () => `<option value="">None (or a drafter can see)</option>${S.targets.filter((t) => t.vision && !t.stack).map((t) => `<option value="${esc(t.target)}" ${t.target === v.members.vision ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}`;
  const b = openModal(`<h2>${s ? 'Edit team' : 'Build your own team'}</h2>
    <p class="help">Mix any models: ones on this PC and ones from connected APIs (for example, two local drafters with Claude or GPT as the lead). Local models take turns; cloud models run at the same time.</p>
    <div class="stack-v">
      <div class="row"><div class="field" style="width:110px"><label for="st-emoji">Icon</label><select id="st-emoji">${['🧩', '🚀', '📊', '🔎', '💻', '📷', '⚖️', '🧠'].map((e) => `<option ${e === v.emoji ? 'selected' : ''}>${e}</option>`).join('')}</select></div>
      <div class="field grow"><label for="st-name">Name</label><input id="st-name" value="${esc(v.name)}" placeholder="e.g. Research Powerhouse"></div></div>
      <div class="field"><label>${ROLE.vision}</label><select id="st-vision">${visionOpts()}</select></div>
      ${[0, 1, 2].map((i) => `<div class="field"><label>${ROLE.draft} ${i ? '(optional)' : ''}</label><select id="st-d${i}">${opts(v.members.drafters?.[i], i ? 'None' : 'Choose a model')}</select></div>`).join('')}
      <div class="field"><label>${ROLE.lead}</label><span class="help">Reads the drafts, fixes mistakes and writes the final answer. Pick your strongest model.</span><select id="st-lead">${opts(v.members.judge, 'None (use the first drafter only)')}</select></div>
    </div>
    <div id="st-preview"></div>
    <div class="modal-actions"><button class="btn" data-close>Cancel</button><button class="btn primary" id="st-save">Save team</button></div>`, { wide: true });
  const preview = () => {
    const drafters = [0, 1, 2].map((i) => b.querySelector(`#st-d${i}`).value).filter(Boolean);
    b.querySelector('#st-preview').innerHTML = teamPreviewHTML({ drafters, judge: b.querySelector('#st-lead').value || undefined, vision: b.querySelector('#st-vision').value || undefined, mode: v.members.mode });
  };
  b.querySelector('.stack-v').addEventListener('change', preview); // this window's own fields (the modal frame is shared)
  preview();
  b.querySelector('#st-save').addEventListener('click', async () => {
    const drafters = [0, 1, 2].map((i) => b.querySelector(`#st-d${i}`).value).filter(Boolean);
    const name = b.querySelector('#st-name').value.trim();
    if (!name || !drafters.length) { toast('Give it a name and at least one drafter.'); return; }
    await call('stacks:save', { ...(s || {}), autoManaged: false, id: s?.id || uid(), name, emoji: b.querySelector('#st-emoji').value, members: { vision: b.querySelector('#st-vision').value || undefined, drafters, judge: b.querySelector('#st-lead').value || undefined } });
    closeModal(); await refreshModels(); render(); toast('Stack saved.');
  });
}

// ---------- Infuse: fuse several AIs into one ----------

const INFUSE_MODES = {
  blend: { name: 'Blend', icon: '🫧', blurb: 'Each AI answers; a lead merges the best of all of them into one answer.', cost: 'Fastest' },
  debate: { name: 'Debate', icon: '⚔️', blurb: 'Each AI answers, then critiques the others and revises; a lead judges the result.', cost: 'Most accurate, slowest' },
  vote: { name: 'Majority vote', icon: '🗳️', blurb: 'Answers three times on its own; if two agree, that\'s the answer, otherwise it settles the difference. Best for maths and logic.', cost: 'Strong, moderate speed' },
  redteam: { name: 'Red team', icon: '🛡️', blurb: 'One AI answers, another hunts for every mistake, the first fixes them. Best for code, facts and advice.', cost: 'Very accurate' },
  plan: { name: 'Plan, then solve', icon: '🗺️', blurb: 'A planner breaks the task into steps; the lead follows them. Best for long, multi-step work.', cost: 'Fast' },
  panel: { name: 'Expert panel', icon: '🎓', blurb: 'An expert, a sceptic and a creative thinker each weigh in; the lead decides. Best for decisions and plans.', cost: 'Balanced' },
  consensus: { name: 'Consensus', icon: '🤝', blurb: 'Builds on what most AIs agree on and flags where they disagree. Best for facts.', cost: 'Balanced' },
};

function strengthOf(t) {
  if (t.startsWith('api:')) return 9;
  const inst = S.installed.find((m) => `local:${m.id}` === t);
  return S.catalog.text.find((c) => c.id === inst?.catalogId)?.judge ?? 5;
}

function infuseModal(onCreated, existing) {
  const options = S.targets.filter((t) => !t.stack);
  if (options.length < 2) { toast('A fusion needs at least two AIs: install a model or connect a cloud AI (Models).', 6000); return; }
  const b = openModal(`<h2>⚗️ ${existing ? `Edit ${esc(existing.name)}` : 'Build a custom AI'}</h2>
    <p class="help">Choose 2 to 4 AIs. Mixing different makers (for example Qwen + Llama + Claude) gives the biggest boost: they make different mistakes, so they catch each other's.</p>
    <div class="stack-v">
      <div class="row" style="justify-content:space-between;flex-wrap:wrap;gap:6px"><div class="label">1. Pick the AIs to fuse (2 to 4)</div><label class="row small" style="gap:6px"><input type="checkbox" id="inf-unc"> 🔓 Uncensored only</label></div>
      <div class="infuse-pick">${options.map((t) => `<label class="infuse-opt"><input type="checkbox" value="${esc(t.target)}"> <span class="grow">${esc(t.label)}${t.vision ? ' 👁' : ''}<div class="small muted">${esc(t.group)}</div></span></label>`).join('')}</div>
      <div class="label">2. How should they work together?</div>
      <div class="infuse-modes">${Object.entries(INFUSE_MODES).map(([k, m], i) => `<label class="infuse-mode"><input type="radio" name="im" value="${k}" ${i === 0 ? 'checked' : ''}><div style="font-size:1.4rem">${m.icon}</div><b>${m.name}</b><div class="small muted" style="font-weight:600;margin:4px 0">${esc(m.blurb)}</div><span class="badge b-lav">${esc(m.cost)}</span></label>`).join('')}</div>
      <div class="grid2">
        <div class="field"><label for="inf-lead">3. Lead (writes the final answer)</label><select id="inf-lead"><option value="">Automatic: the strongest one you picked</option>${options.map((t) => `<option value="${esc(t.target)}">${esc(t.label)}</option>`).join('')}</select></div>
        <div class="field"><label for="inf-name">4. Name your custom AI</label><input id="inf-name" placeholder="e.g. Analyst Supreme"></div>
      </div>
    </div>
    <div id="inf-preview"></div>
    <div id="inf-suggest" class="inf-suggest"></div>
    <div class="modal-actions"><span class="small muted grow" id="inf-count">Pick 2 to 4 AIs.</span><button class="btn" data-close>Cancel</button><button class="btn primary" id="inf-go">${icon('sparkle', 16)} Save custom AI</button></div>`, { wide: true });
  const picked = () => [...b.querySelectorAll('.infuse-opt input:checked')].map((x) => x.value);
  // Uncensored only: hide the AIs that refuse (keeps uncensored local models and Venice).
  b.querySelector('#inf-unc').addEventListener('change', (e) => {
    b.querySelectorAll('.infuse-opt').forEach((l) => { const v = l.querySelector('input').value; const ok = !e.target.checked || liquidOk(v); l.hidden = !ok; if (!ok) l.querySelector('input').checked = false; });
    b.querySelector('.infuse-pick').dispatchEvent(new Event('change', { bubbles: true }));
  });
  if (existing) {
    const m = existing.members || {};
    for (const t of m.drafters || []) { const cb = b.querySelector(`.infuse-opt input[value="${CSS.escape(t)}"]`); if (cb) cb.checked = true; }
    const r = b.querySelector(`input[name="im"][value="${m.mode || 'blend'}"]`); if (r) r.checked = true;
    if (m.judge) b.querySelector('#inf-lead').value = m.judge;
    b.querySelector('#inf-name').value = existing.name;
  }
  b.querySelector('.infuse-pick').addEventListener('change', () => {
    const n = picked().length;
    b.querySelector('#inf-count').textContent = n < 2 ? 'Pick 2 to 4 AIs.' : n > 4 ? 'Four is the most that helps; extra AIs mostly add time.' : `${n} AIs selected.`;
  });
  // Live preview: speed, quality and abilities of the AI you're about to make.
  const preview = () => {
    const drafters = picked();
    const el = b.querySelector('#inf-preview');
    const sugBox = b.querySelector('#inf-suggest');
    // Redrawn only when the picked AIs change, so a click on a task is never lost to a refresh.
    if (sugBox && sugBox.dataset.for !== JSON.stringify(drafters)) { sugBox.dataset.for = JSON.stringify(drafters); sugBox.innerHTML = `<div class="sug-head"><b>💡 Suggested additions</b> <span class="small muted">for the task you pick: the best model to add that runs well on this PC, and the best API</span></div>${sugPanelHTML({ fixedTargets: drafters })}`; bindSuggest(sugBox); }
    if (drafters.length < 2) { el.innerHTML = '<div class="preview muted">Pick 2 to 4 AIs to see how fast and how good your fusion will be on this PC.</div>'; return; }
    const judge = b.querySelector('#inf-lead').value || [...drafters].sort((x, y) => strengthOf(y) - strengthOf(x))[0];
    const sees = (t) => S.targets.find((x) => x.target === t)?.vision;
    const vision = drafters.some(sees) ? undefined : S.targets.find((t) => t.vision && !t.stack)?.target;
    const mem = { drafters, judge, vision, mode: b.querySelector('input[name="im"]:checked').value };
    el.innerHTML = fusionRatingsHTML(mem) + fusionAdviceHTML(mem) + boostsHTML([...drafters, judge], { fusion: true }) + teamPreviewHTML(mem, { title: 'How your custom AI will work on this PC' });
  };
  b.querySelector('.stack-v').addEventListener('change', preview); // this window's own fields (the modal frame is shared)
  preview();
  b.querySelector('#inf-go').addEventListener('click', async () => {
    const drafters = picked();
    if (drafters.length < 2 || drafters.length > 4) { toast('Pick between 2 and 4 AIs.'); return; }
    const mode = b.querySelector('input[name="im"]:checked').value;
    const judge = b.querySelector('#inf-lead').value || [...drafters].sort((x, y) => strengthOf(y) - strengthOf(x))[0];
    const canSee = (t) => S.targets.find((x) => x.target === t)?.vision;
    const vision = drafters.some(canSee) ? undefined : S.targets.find((t) => t.vision && !t.stack)?.target;
    const short = (t) => (S.targets.find((x) => x.target === t)?.label || '').split(/[ (]/)[0];
    const name = b.querySelector('#inf-name').value.trim() || `${drafters.map(short).join(' + ')} ${INFUSE_MODES[mode].name}`;
    const stack = { ...(existing || {}), id: existing?.id || `inf-${uid()}`, name, emoji: existing?.emoji || '⚗️', infused: true, members: { drafters, judge, vision, mode } };
    await call('stacks:save', stack);
    await refreshModels();
    closeModal();
    toast(`${name} is ready. It works like any model: pick it in a chat, an assistant or the API.`, 6000);
    if (onCreated) onCreated(stack); else render();
  });
}

// ---------- the Liquid Edition's suggested add-ons ----------
// Optional, never required or locked: each fills a gap in the core, and joins the crew once downloaded.
const addonSpec = (id) => S.catalog.text.find((m) => m.id === id) || S.catalog.media.find((m) => m.id === id);
const addonHave = (id) => S.installed.some((m) => m.catalogId === id);
const addonFits = (a) => !a.minVramGB || (S.est?.hardware?.vramGB || 0) >= a.minVramGB - 0.5;
const liquidAddonsLeft = () => (S.catalog?.liquidAddons || []).filter((a) => !addonHave(a.id) && addonFits(a)).length;
function liquidAddonsHTML() {
  return (S.catalog?.liquidAddons || []).map((a) => {
    const c = addonSpec(a.id);
    if (!c) return '';
    const kind = S.catalog.text.some((m) => m.id === a.id) ? 'text' : 'media';
    const est = S.est?.[kind]?.[a.id];
    const size = (c.sizeGB || 0) + (c.mmprojGB || 0);
    const action = addonHave(a.id) ? '<span class="badge b-mint">✓ Installed: on the crew</span>'
      : S.downloads[a.id] ? downloadBox(a.id)
      : `<button class="btn small ${addonFits(a) ? 'primary' : ''}" data-addon-get="${esc(a.id)}">Download · ${size.toFixed(1)} GB</button>`;
    return `<div class="card"><div class="row"><h3 class="grow">${esc(c.name)}</h3>${est ? rateBadge(est, kind) : ''}</div>
      <p class="desc">${esc(a.why)}</p>${addonFits(a) ? '' : `<p class="small muted">Best with a ${a.minVramGB} GB+ graphics card; it will be slow on this PC.</p>`}${action}</div>`;
  }).join('');
}
function liquidAddonsModal() {
  openModal(`<h2>💧 Suggested add-ons for the Liquid Edition</h2>
    <p class="small muted" style="margin-top:-4px">Optional. The Liquid Edition is complete without them; each one fills a gap. Once downloaded it joins the crew by itself (untick it under Models → Models in use to keep it out), and you can remove it like any other model. More uncensored models are under Models → Uncensored.</p>
    <div class="cards" id="addon-list">${liquidAddonsHTML()}</div>
    <div class="modal-actions"><button class="btn" data-close>Close</button></div>`, { wide: true });
  $('#addon-list').addEventListener('click', async (e) => {
    const b = e.target.closest('[data-addon-get]');
    if (!b) return;
    const c = addonSpec(b.dataset.addonGet);
    await download({ catalogId: b.dataset.addonGet }, c?.name).catch((err) => toast(err.message, 6000));
    $('#addon-list').innerHTML = liquidAddonsHTML();
  });
}

// ----- Full songs: a songwriter stack on this PC, complete sung songs in the cloud -----
function songsHTML(r) {
  const rx = (typeof STACK_RECIPES !== 'undefined' ? STACK_RECIPES : []).find((x) => x.id === r.recipe);
  const have = S.stacks.some((x) => x.id === `rx-${r.recipe}`);
  return `<div class="adv-grid">
    <div class="card adv-mine"><h3>🎶 On this PC: free and private</h3>
      <p class="small">${esc(rx?.name || 'Songwriter')}. A stack of your models writes the lyrics, chords and melody, and the built-in synth plays a demo beat (instrumental). Nothing leaves this computer.</p>
      <div class="row">${have ? '<span class="badge b-mint">✓ Set up</span>' : '<button class="btn small primary" data-song-setup>Set up the Songwriter stack</button>'}<button class="btn small" data-song-open="music">Open Gallery & tools → Music</button></div></div>
    <div class="card adv-best"><h3>🎤 Complete sung songs: cloud</h3>
      <p class="small">Whole songs with vocals, verses, chorus and bridge, from your lyrics: ElevenLabs Music (about $0.80 a minute), MiniMax Music 2.6 (about $0.15 a song) or Mureka v9, all on fal.ai with one key. No open model sings a full song on a PC yet.</p>
      <div class="row"><button class="btn small primary" data-song-open="cloud">Open Gallery & tools → Cloud</button></div></div>
  </div>`;
}
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-song-setup]')) { setUpRecipe('song-complete').then(() => render()).catch((err) => toast(err.message, 6000)); return; }
  const o = e.target.closest('[data-song-open]');
  if (o) { studioTab = o.dataset.songOpen; go({ view: 'studio' }); }
});

// ---------- the Liquid Editions, at the top of Stacks ----------
// The Liquid Edition (any PC, comes with Quicksilver) and Liquid Edition Pro (a powerful PC):
// what each is, what it needs, whether this PC is up to it, and one button to get Pro.
function proFit() {
  const P = S.catalog?.liquidPro || {};
  const hw = S.est?.hardware || {};
  const v = hw.vramGB || 0; const r = hw.ramGB || 0;
  if (!S.est) return { level: 'unknown', text: 'Checking this PC…' };
  const spec = `this PC: ${v ? `${Math.round(v)} GB graphics card` : 'no graphics card'}, ${Math.round(r)} GB memory`;
  if (v >= P.recVramGB - 0.5 && r >= P.recRamGB - 2) return { level: 'great', text: `✓ Runs great on ${spec}.` };
  if (v >= P.minVramGB - 0.5 && r >= P.minRamGB - 2) return { level: 'ok', text: `✓ Runs on ${spec}; a 24 GB graphics card and 64 GB memory make it faster.` };
  return { level: 'no', text: `⚠️ Too much for ${spec}. Pro needs at least a ${P.minVramGB} GB graphics card and ${P.minRamGB} GB memory; it would be very slow here. The Liquid Edition is the one for this PC.` };
}
function liquidEditionsHTML() {
  const P = S.catalog?.liquidPro;
  if (!P) return '';
  const spec = (id) => S.catalog.text.find((m) => m.id === id) || S.catalog.media.find((m) => m.id === id);
  const have = (id) => S.installed.some((m) => m.catalogId === id);
  const rows = [['🧠 Brain', P.brain], ['🏁 Closer · sees photos', P.closer], ['🧮 Thinker', P.thinker], ['🎨 Muse · stories', P.muse], ['🖼️ Pictures', P.pictures[0]], ['🎌 Anime', P.pictures[1]]];
  const missing = [...new Set([P.brain, P.closer, P.thinker, P.muse, ...P.pictures])].filter((id) => !have(id) && spec(id));
  const missingGB = missing.reduce((t, id) => t + (spec(id).sizeGB || 0) + (spec(id).mmprojGB || 0), 0);
  const downloading = missing.filter((id) => S.downloads[id]);
  const ready = S.stacks.some((s) => s.id === 'quicksilver-pro');
  const fit = proFit();
  const liquidReady = S.stacks.some((s) => s.id === 'quicksilver');
  return `<div class="section"><h2>💧 The Liquid Editions</h2><span class="small muted">Quicksilver's own uncensored crews: several AI models working as one, all on this PC. Locked, so they always work the way they were built.</span></div>
    <div class="cards" id="liquid-editions" style="margin-bottom:18px">
      <div class="card">
        <div class="row"><span class="emoji-badge">💧</span><h3 class="grow">Liquid Edition</h3><span class="badge b-mint">For any PC</span></div>
        <p class="desc">Comes with Quicksilver. Qwen3.5 4B answers and sees photos, Qwen3.5 9B leads hard questions, Qwen3.5 2B adds fresh angles; Lustify makes pictures and Wan 2.2 makes video. Runs on laptops and everyday PCs; best with an 8 GB graphics card.</p>
        <div class="row">${liquidReady ? '<button class="btn small primary" data-chat-stack="quicksilver">Chat</button><span class="badge b-lav">🔒 Locked</span>' : '<span class="badge b-lemon">Setting up…</span>'}</div>
      </div>
      <div class="card ${fit.level === 'no' ? '' : 'hl'}">
        <div class="row"><span class="emoji-badge">💎</span><h3 class="grow">Liquid Edition Pro</h3><span class="badge b-lav">For a powerful PC</span></div>
        <p class="desc">The Liquid Edition with bigger, smarter uncensored models in every role: sharper answers, better reasoning and writing, and top-quality pictures. Needs a ${P.minVramGB}–${P.recVramGB} GB graphics card and ${P.minRamGB}–${P.recRamGB} GB memory.</p>
        <div class="stack-v" style="gap:4px;margin:8px 0">${rows.map(([role, id]) => { const c = spec(id); return c ? `<div class="row small"><span class="grow">${role}: <b>${esc(c.name)}</b></span>${have(id) ? '<span class="badge b-mint">✓</span>' : S.downloads[id] ? '<span class="badge b-sky">⬇</span>' : `<span class="muted">${((c.sizeGB || 0) + (c.mmprojGB || 0)).toFixed(1)} GB</span>`}</div>` : ''; }).join('')}
          <div class="row small"><span class="grow">🎬 Video: <b>Wan 2.2</b> · photoreal pictures: <b>Lustify</b></span><span class="muted">from the Liquid Edition</span></div></div>
        <p class="small" style="margin:6px 0;${fit.level === 'no' ? 'color:var(--danger)' : ''}">${esc(fit.text)}</p>
        ${ready ? '' : '<p class="small muted" style="margin:0 0 6px">Optional: it is only installed if you choose it here.</p>'}
        <div class="row">${ready && !missing.length ? '<button class="btn small primary" data-chat-stack="quicksilver-pro">Chat</button><span class="badge b-lav">🔒 Locked</span>'
          : downloading.length ? `<span class="badge b-sky">Downloading ${downloading.length} of ${missing.length}…</span>`
          : `<button class="btn small ${fit.level === 'no' ? '' : 'primary'}" data-get-pro>${!missing.length ? 'Turn on Liquid Edition Pro' : `${ready ? 'Finish' : 'Get'} Liquid Edition Pro · ${missingGB.toFixed(0)} GB`}</button>${ready ? '<button class="btn small" data-chat-stack="quicksilver-pro">Chat</button>' : ''}`}</div>
      </div>
    </div>`;
}
document.addEventListener('click', async (e) => {
  const proBtn = e.target.closest('[data-get-pro]');
  if (!proBtn || proBtn.disabled) return;
  proBtn.disabled = true;
  const P = S.catalog.liquidPro;
  const spec = (id) => S.catalog.text.find((m) => m.id === id) || S.catalog.media.find((m) => m.id === id);
  const missing = [...new Set([P.brain, P.closer, P.thinker, P.muse, ...P.pictures])].filter((id) => !S.installed.some((m) => m.catalogId === id) && !S.downloads[id] && spec(id));
  if (proFit().level === 'no' && !(await confirmBox(`${proFit().text}\n\nDownload Liquid Edition Pro anyway?`, { yes: 'Download anyway', danger: false }))) { proBtn.disabled = false; return; }
  // Pro is only ever set up from this button.
  await call('quicksilver:proGet');
  // The Brain and Closer first (Pro is ready to chat as soon as they're in), then the rest.
  for (const id of missing) await download({ catalogId: id }, spec(id).name).catch((err) => toast(err.message, 6000));
  await refreshModels();
  toast(missing.length ? 'Downloading Liquid Edition Pro. It appears under Built in as soon as its Brain and Closer are in.' : '💎 Liquid Edition Pro is ready.', 8000);
  render();
});
