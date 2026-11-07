// Home dashboard and app start-up.
'use strict';

const DEFAULT_PREFS = {
  userName: '', about: '', textSize: 'normal', defaultTarget: '', temperature: 0.6, contextSize: 16384, maxTokens: 2048,
  gpu: 'auto', effort: 'medium', effortLevel: 'thorough', simple: true, autoRoute: true, autoWeb: true, autoFix: true, cloudHard: false, theme: 'dark', factCheck: false, factChecker: '', lastAssistant: 'as-general', sourcesPerAnswer: 8,
};

// More ready-made assistants for everyday uses. Each borrows the settings of the team type that
// suits it (job), and runs on your default model unless you pick another.
const EXTRA_ASSISTANTS = [
  { id: 'as-tutor', job: 'reasoning', name: 'Tutor', emoji: '🎓', description: 'Homework help and step-by-step explanations, with quizzes and practice questions.', temperature: 0.4, factCheck: true,
    instructions: 'You are a patient, encouraging tutor. Explain ideas step by step at the learner\'s level, using simple examples. For maths and science, show each step and check the final answer. Help the learner understand rather than just giving answers: end with a quick check question, and offer practice questions.' },
  { id: 'as-translator', job: 'writing', name: 'Translator', emoji: '🌍', description: 'Natural translations between languages, in the tone you need.', temperature: 0.2,
    instructions: 'You are a professional translator. Translate faithfully and naturally, keeping meaning, tone and formatting. If the target language is not given, translate into English (or from English into the language the user names). Note any phrase with no direct equivalent in a short line after the translation.' },
  { id: 'as-career', job: 'writing', name: 'Career Coach', emoji: '💼', description: 'CVs, cover letters, interview practice and salary conversations.', temperature: 0.5,
    instructions: 'You are an experienced career coach and recruiter. Give specific, practical advice. Rewrite CVs and cover letters with strong, measurable achievements. For interview practice, ask one question at a time, then give honest feedback and a better example answer.' },
  { id: 'as-trip', job: 'general', name: 'Trip Planner', emoji: '✈️', description: 'Day-by-day itineraries, budgets and packing lists for any trip.', temperature: 0.6, web: true,
    instructions: 'You are a well-travelled trip planner. Ask for dates, budget and interests if missing, then give a day-by-day itinerary with realistic travel times, rough costs, booking tips and a short packing list. Flag anything that needs checking closer to the date (opening hours, prices, visas).' },
  { id: 'as-ideas', job: 'general', name: 'Brainstormer', emoji: '💡', description: 'Lots of fresh ideas, fast: names, gifts, plans, posts and projects.', temperature: 0.95,
    instructions: 'You are an energetic creative partner. Give many varied ideas quickly (at least 10 unless asked otherwise), from safe to bold, grouped into themes. Then pick your top three and say why. Build on the user\'s favourites when they reply.' },
];

function defaultAssistants() {
  const facts = { office: true, research: true };
  const fromJobs = Object.entries(S.catalog.jobs).filter(([, j]) => j.assistant).map(([job, j]) => ({
    id: `as-${job}`, job, builtIn: true, name: j.assistant.name, emoji: j.assistant.emoji, description: j.pitch,
    instructions: j.assistant.instructions, target: '', temperature: j.temperature, contextSize: j.contextSize, maxTokens: j.maxTokens,
    library: j.library, web: false, factCheck: Boolean(facts[job]),
  }));
  const extras = [...EXTRA_ASSISTANTS, ...MORE_ASSISTANTS, ...EXAM_ASSISTANTS].filter((x) => S.catalog.jobs[x.job]).map((x) => {
    const j = S.catalog.jobs[x.job];
    return { builtIn: true, target: '', contextSize: j.contextSize, maxTokens: j.maxTokens, library: false, factCheck: false, group: ASSISTANT_GROUP_OF[x.id], ...x, web: Boolean(x.web) };
  });
  return [...fromJobs, ...extras];
}

function paintIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => { if (!el.firstChild) el.innerHTML = icon(el.dataset.icon); });
}

const systemDark = window.matchMedia('(prefers-color-scheme: dark)');
systemDark.addEventListener?.('change', () => S.data && applyPrefs());
function applyPrefs() {
  applySideSize();
  applySimple();
  const t = S.data.prefs.theme || 'dark';
  document.documentElement.dataset.theme = t === 'system' ? (systemDark.matches ? 'dark' : 'light') : t;
  const tb = document.getElementById('theme-btn');
  if (tb) { const dark = document.documentElement.dataset.theme === 'dark'; tb.innerHTML = icon(dark ? 'sun' : 'moon'); tb.title = dark ? 'Switch to light mode' : 'Switch to dark mode'; }
  document.getElementById('app')?.classList.toggle('collapsed', Boolean(S.data.prefs.sidebarCollapsed));
  document.documentElement.dataset.size = S.data.prefs.textSize === 'normal' ? '' : S.data.prefs.textSize;
}

// ---------- online / offline ----------
// The switch is in two places (beside the model in chats, and in the sidebar); both always match.
function paintNet() {
  const off = Boolean(S.config?.offline);
  for (const b of [$('#net-toggle'), $('#net-pill')].filter(Boolean)) {
    b.classList.toggle('off', off);
    b.setAttribute('aria-checked', String(!off));
    (b.querySelector('.net-lbl') || b.querySelector('span:nth-child(2)')).textContent = off ? 'Offline' : 'Online';
    b.title = off ? 'Offline: nothing leaves this PC. Click to go online.' : 'Online: web search, cloud AIs and downloads are available. Click to go offline.';
  }
  document.documentElement.classList.toggle('is-offline', off);
}
async function toggleNet() {
  const off = !S.config?.offline;
  S.config = await call('config:set', { offline: off });
  paintNet();
  await refreshModels();
  toast(off ? '✈ Offline: nothing leaves this PC. Models on this PC keep working; web search, cloud AIs, live sources and downloads are paused.' : '🌐 Online: web search, cloud AIs and downloads are available again.', 6000);
  render();
}

views.home = {
  html() {
    const h = S.est?.hardware;
    const text = S.installed.filter((m) => m.kind === 'text');
    const media = S.installed.filter((m) => m.kind !== 'text');
    const cloud = S.providers.length;
    const api = S.apiStatus;
    const tile = (icon, k, v, sub, view) => `<button class="card" ${view ? `data-goto="${view}"` : ''} style="text-align:left"><div class="k" style="font-size:.8rem;font-weight:800;color:var(--muted);text-transform:uppercase;letter-spacing:.05em">${icon} ${k}</div><div style="font-size:1.5rem;font-weight:800;margin:4px 0">${v}</div><div class="small muted" style="font-weight:600">${sub}</div></button>`;
    return `<div class="page">
      ${welcomeCardHTML()}
      ${bestSetupHTML()}
      <div class="row feature-row">
        <span class="feature">${cloud ? 'Local by default, cloud only where you choose' : 'Everything runs on this PC'}</span><span class="feature">Several models as one team</span><span class="feature">Double-checking built in</span><span class="feature">Photo, video and music studio</span><span class="feature">Private knowledge bases</span><span class="feature">OpenAI-compatible local API</span>
      </div>
      ${text.length && text.every((m) => m.source === 'bundled') && !cloud ? `<div class="notice info grow-note" style="margin-bottom:18px"><b>You're using Quicksilver's starter models.</b> They're quick and private, but on their own they're limited: smaller models know less and make more mistakes on hard questions. Quicksilver grows with you: install stronger models, or build teams that make several models work as one, for sharper, more accurate answers. <span class="row" style="margin-top:8px"><button class="btn primary small" data-goto="stacks">Build a team</button><button class="btn small" data-goto="models">Get more models</button></span></div>` : ''}
      ${!text.length && !cloud ? `<div class="notice info" style="margin-bottom:18px"><b>First step:</b> open the Setup Advisor. It checks this PC and downloads the best free models for your work in one click. <button class="btn primary small" data-goto="stacks" style="margin-left:8px">Open the Setup Advisor</button></div>` : ''}
      <div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(210px,1fr))">
        ${tile('💬', 'Models', text.length, text.length ? `${text.filter((m) => m.vision).length} can see images` : 'none installed yet', 'models')}
        ${tile('✨', 'AI teams', S.stacks.length, S.stacks[0] ? esc(S.stacks[0].name) : 'combine several AIs into one', 'stacks')}
        ${tile('🎨', 'Image & video models', media.length, media.length ? 'image & video ready' : 'create & edit photos and video', 'studio')}
        ${tile('🖥️', 'Hardware', h ? `${h.ramGB.toFixed(0)} GB` : '…', h ? esc(h.vramGB ? `${h.gpuName} · ${h.vramGB.toFixed(0)} GB video` : 'running on the processor') : 'checking…', 'pc')}
        ${tile('☁️', 'Cloud APIs', cloud, cloud ? esc(S.providers.map((p) => p.name).join(', ')) : 'optional: Claude, GPT, Gemini…', 'models')}
        ${tile('🔌', 'API server', api?.running ? 'On' : 'Off', api?.running ? `127.0.0.1:${api.port}` : 'let other apps use your models', 'settings')}
      </div>
      <div class="section"><h2>Start something</h2></div>
      <div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(250px,1fr))">
        ${S.data.assistants.map((a) => `<button class="card" data-start="${a.id}" style="text-align:left"><div class="row"><span class="emoji-badge">${esc(a.emoji)}</span><h3 class="grow">${esc(a.name)}</h3></div><p class="small muted" style="font-weight:600;margin:8px 0 0">${esc(a.description)}</p></button>`).join('')}
        <button class="card" data-goto="studio" style="text-align:left"><div class="row"><span class="emoji-badge">🎨</span><h3>Create an image or video</h3></div><p class="small muted" style="font-weight:600;margin:8px 0 0">Generate, edit with AI, trim and convert.</p></button>
        <button class="card" data-goto="library" style="text-align:left"><div class="row"><span class="emoji-badge">📚</span><h3>Connect your knowledge</h3></div><p class="small muted" style="font-weight:600;margin:8px 0 0">Files, websites and PubMed, isolated per assistant and cited.</p></button>
      </div>
    </div>`;
  },
  bind() {
    if (!S.est) refreshEstimates().then(() => S.route.view === 'home' && render());
    if (!S.apiStatus) qs.call('apiserver:status').then((s) => { S.apiStatus = s; if (S.route.view === 'home') render(); });
    $$('[data-goto]').forEach((b) => b.addEventListener('click', () => go({ view: b.dataset.goto })));
    $$('[data-start]').forEach((b) => b.addEventListener('click', () => newChat(b.dataset.start)));
    $('[data-nav-new]')?.addEventListener('click', () => newChat());
    bindBestSetup();
    $('#wc-close')?.addEventListener('click', () => { S.data.prefs.welcomed = true; save(); render(); });
    $('#wc-chat')?.addEventListener('click', () => { S.data.prefs.welcomed = true; save(); newChat(); });
    $('#wc-import')?.addEventListener('click', () => { setTab = 'general'; go({ view: 'settings' }); setTimeout(() => $('#imp-file')?.click(), 250); });
    $('#wc-setup')?.addEventListener('click', () => go({ view: 'stacks' }));
  },
};

// First visits: what Quicksilver is, in three steps. Closes for good with ×.
function welcomeCardHTML() {
  if (S.data.prefs.welcomed) return '';
  const name = S.data.prefs.userName;
  return `<div class="welcome-card">
    <button class="icon-btn sm wc-x" id="wc-close" title="Close" aria-label="Close">${icon('x', 16)}</button>
    <h2>Welcome${name ? `, ${esc(name)}` : ''}. Your own AI, on your own computer.</h2>
    <p class="muted">Private, free and works offline: nothing you type leaves this PC unless you connect a cloud AI.</p>
    <div class="wc-steps">
      <button class="wc-step" id="wc-chat"><span class="wc-n">1</span><span><b>Ask anything</b><span class="small muted">It's ready now. Type, talk (mic) or drop in a photo or file.</span></span></button>
      <button class="wc-step" id="wc-import"><span class="wc-n">2</span><span><b>Bring your ChatGPT or Claude chats</b><span class="small muted">Carry on any conversation here, privately.</span></span></button>
      <button class="wc-step" id="wc-setup"><span class="wc-n">3</span><span><b>Make it great at your work</b><span class="small muted">Get the best free models for what you do, fitted to this PC.</span></span></button>
    </div>
  </div>`;
}

async function init() {
  S.catalog = await qs.call('catalog:get');
  S.config = await qs.call('config:get');
  const saved = await qs.call('data:load');
  if (saved?.version === 3) S.data = saved;
  else S.data = { version: 3, prefs: { ...DEFAULT_PREFS, userName: saved?.settings?.userName && saved.settings.userName !== 'You' ? saved.settings.userName : '' }, assistants: [], chats: [] };
  S.data.prefs = { ...DEFAULT_PREFS, ...S.data.prefs };
  if (S.data.prefs.maxTokens === 4096 && !S.data.prefs.maxTokensSet) S.data.prefs.maxTokens = 2048; // 2.16: old default
  // Keep built-in assistants up to date, but never overwrite your edits or your own assistants.
  for (const d of defaultAssistants()) if (!S.data.assistants.some((a) => a.id === d.id)) S.data.assistants.push(d);
  // Retire built-in assistants for goals that no longer exist (their chats move to the main assistant).
  const retired = S.data.assistants.filter((a) => a.builtIn && !S.catalog.jobs[a.job]).map((a) => a.id);
  if (retired.length) {
    S.data.assistants = S.data.assistants.filter((a) => !retired.includes(a.id));
    for (const c of S.data.chats) if (retired.includes(c.assistantId)) c.assistantId = 'as-general';
    if (retired.includes(S.data.prefs.lastAssistant)) S.data.prefs.lastAssistant = 'as-general';
  }
  applyPrefs(); setUpSidebarResize();
  await Promise.all([refreshModels(), refreshProviders()]);
  Promise.all([qs.call('int:list'), qs.call('mcp:list')]).then(([c, m]) => { S.hasIntegrations = c.some((x) => x.enabled) || m.length > 0; }).catch(() => {});
  save();

  paintIcons();
  $$('.sidebar [data-nav]').forEach((b) => b.addEventListener('click', () => (b.dataset.nav === 'newchat' ? newChat() : go({ view: b.dataset.nav }))));
  $('#theme-btn').addEventListener('click', () => { S.data.prefs.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; applyPrefs(); save(); if (S.route.view === 'settings') render(); });
  paintNet();
  $('#net-toggle').addEventListener('click', toggleNet);
  $('#collapse').addEventListener('click', () => { S.data.prefs.sidebarCollapsed = !S.data.prefs.sidebarCollapsed; applyPrefs(); save(); });
  $('#chat-search').addEventListener('input', renderChatList);
  $('#dl-mini').addEventListener('click', () => { modelsTab = 'installed'; go({ view: 'models' }); });
  $('#modal').addEventListener('mousedown', (e) => { if (e.target.id === 'modal') closeModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#modal').hidden) closeModal();
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') { e.preventDefault(); newChat(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#chat-search').focus(); }
  });

  setTimeout(() => preloadDefault(), 3000);
  qs.onModelProgress((d) => { S.downloads[d.id] = { ...S.downloads[d.id], ...d }; paintDownloads(); });
  qs.onModelDone(async ({ id, model }) => {
    delete S.downloads[id];
    await refreshModels();
    S.est = null;
    toast(`${model.name} is ready.`);
    if (!targetValid(S.data.prefs.defaultTarget) && model.kind === 'text') { S.data.prefs.defaultTarget = `local:${model.id}`; save(); }
    // Load the default model in the background so the first reply is quick.
    if (model.kind === 'text') await setUpQuicksilver(false).catch(() => {}); // a new model can join Quicksilver's team
    if (model.kind === 'text') qs.call('models:warm', S.data.prefs.defaultTarget || `local:${model.id}`, { contextSize: S.data.prefs.contextSize, gpu: S.data.prefs.gpu }).catch(() => {});
    if (!$('#modal').hidden) return;
    render();
  });
  qs.onModelError(({ id, message, cancelled }) => { delete S.downloads[id]; paintDownloads(); if (!cancelled) toast(message, 8000); else toast(message); if (['models', 'stacks', 'studio'].includes(S.route.view)) render(); });

  go({ view: 'home' });
  refreshEstimates().then(() => { if (['home', 'stacks', 'models', 'pc'].includes(S.route.view)) render(); });
  startupModels();
}

// The built-in Quicksilver model: a team of the models that come with the app. If the bigger
// "brain" model wasn't shipped next to the installer, it downloads in the background; until then
// the small model answers on its own.
async function setUpQuicksilver(firstLook) {
  const p = S.data.prefs;
  const r = await qs.call('models:starter');
  if (r.added.length || r.stack) await refreshModels();
  const before = p.defaultTarget;
  if (r.stack && (!targetValid(p.defaultTarget) || p.defaultTarget === 'local:starter')) p.defaultTarget = r.stack;
  else if (!targetValid(p.defaultTarget) && targetValid('local:starter')) p.defaultTarget = 'local:starter';
  if (p.defaultTarget !== before) save();
  if (firstLook && r.added.length) {
    toast(r.stack ? '👋 Meet Quicksilver: two AI models working as one, right on your PC. It sees photos, thinks harder when a question needs it, and nothing leaves this computer. Try an idea below.'
      : '👋 Quicksilver is ready to chat, privately on your PC, and it can see photos. Try an idea below.', 10000);
  }
  if (firstLook && r.missing.length && !S.config?.offline) {
    for (const m of r.missing) if (!S.downloads[m.catalogId]) download({ catalogId: m.catalogId }, m.name).catch(() => {});
    toast(`Finishing Quicksilver in the background (${r.missing.map((m) => m.name).join(', ')}). You can chat right away.`, 8000);
  }
  if (r.stack && !before?.startsWith('stack:quicksilver') && p.defaultTarget === r.stack && !firstLook) toast('💧 Quicksilver is fully ready: your models now work together as one.', 8000);
  if (['home', 'chat'].includes(S.route.view) && (r.added.length || p.defaultTarget !== before)) render();
  return r;
}

// After the first screen: add models found on this PC, pick a default if there is none, and load
// the default model in the background so the first reply is quick. Both can be turned off.
async function startupModels() {
  const p = S.data.prefs;
  // The model that comes with Quicksilver: ready on first launch, nothing to download.
  try { await setUpQuicksilver(true); } catch {}
  if (p.autoAddFound !== false) {
    try {
      const added = await qs.call('models:autoAdd');
      if (added.length) {
        await refreshModels();
        S.found = [];
        if (!targetValid(p.defaultTarget) && added.some((m) => m.kind === 'text')) {
          // The advisor's pick for everyday use, from the models you now have.
          const r = await qs.call('advisor:advise', 'general').catch(() => null);
          const id = r?.mine?.members.judge || r?.mine?.members.drafters[0] || added.find((m) => m.kind === 'text').id;
          p.defaultTarget = `local:${id}`;
          save();
        }
        await setUpQuicksilver(false).catch(() => {});
        const apps = [...new Set(added.map((m) => m.from).filter(Boolean))].join(', ');
        toast(`Found ${added.length} model${added.length > 1 ? 's' : ''} on this PC${apps ? ` (${apps})` : ''} and added ${added.length > 1 ? 'them' : 'it'}. Ready to use, nothing downloaded.`, 7000);
        if (['home', 'models', 'stacks'].includes(S.route.view)) render();
        else renderChatList();
      }
    } catch {}
  }
  if (p.preloadDefault !== false) {
    const t = resolveTarget(null, assistantById(p.lastAssistant));
    if (t) qs.call('models:warm', t, { contextSize: p.contextSize, gpu: p.gpu }).catch(() => {});
  }
  // Measured speeds: if no answer has been timed on this PC yet, run a short speed test once the
  // app is idle, so every "~6 s" on screen is real rather than estimated.
  setTimeout(async () => {
    try {
      if (S.speed && Object.values(S.speed.targets).some((x) => x.measured)) return;
      if (pending || !S.installed.some((m) => m.kind === 'text')) return;
      await qs.call('bench:run');
      await refreshModels();
      if (['home', 'compare', 'pc'].includes(S.route.view)) render();
    } catch {}
  }, 25000);
}

init().catch((err) => { document.body.innerHTML = `<div style="padding:40px;font:16px system-ui"><h1>Quicksilver couldn't start</h1><pre>${String(err?.stack || err).replace(/</g, '&lt;')}</pre></div>`; });
