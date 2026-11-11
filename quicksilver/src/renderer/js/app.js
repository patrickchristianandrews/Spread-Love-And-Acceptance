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
    const vpn = !off && S.config?.vpnOnly;
    const tunnel = vpn && S.vpn?.connected;
    // Online without a VPN = not private: what you search and send can be seen by the sites and
    // services you use. Marked clearly so it's never a surprise.
    const exposed = !off && !vpn;
    b.classList.toggle('vpn', Boolean(vpn)); b.classList.toggle('vpn-wait', Boolean(vpn && !tunnel));
    b.classList.toggle('exposed', exposed);
    (b.querySelector('.net-lbl') || b.querySelector('span:nth-child(2)')).textContent = off ? 'Offline' : vpn ? (tunnel ? '🛡 Private (VPN)' : '🛡 VPN off: paused') : '🌐 Online · not private';
    b.title = off ? 'Offline: nothing leaves this PC. Click to go online.' : vpn ? (tunnel ? 'Private online: everything goes through your VPN. Click to go offline. Privacy modes are in Settings → General.' : 'Private online is on, but no VPN is connected, so nothing leaves this PC. Connect Proton VPN, or change it in Settings → General.') : 'Online, not private: web search and any cloud AI you use can see what you send, and sites see your location. Everyday chats still run on this PC. Click to go offline, or turn on Private online (Proton VPN) in Settings → General.';
  }
  document.documentElement.classList.toggle('is-offline', off);
  document.documentElement.classList.toggle('is-exposed', !off && !S.config?.vpnOnly);
  paintPrivacyBar();
}
// A one-line banner at the top of the page whenever you're online without a VPN. It sits inside the
// page (it never covers anything); ✕ hides it until Quicksilver restarts.
function paintPrivacyBar() {
  const main = document.getElementById('main');
  if (!main) return;
  const show = !S.config?.offline && !S.config?.vpnOnly && !S.privacyBarHidden;
  let bar = document.getElementById('privacy-bar');
  if (!show) { bar?.remove(); return; }
  if (!bar || bar.parentNode !== main) {
    bar?.remove();
    bar = Object.assign(document.createElement('div'), { id: 'privacy-bar', className: 'privacy-bar' });
    bar.innerHTML = `<span class="grow">🌐 <b>Online — not private.</b> <span class="small">Web searches and anything sent to a cloud AI can be seen by those services, and sites see your location. Chats with models on this PC stay private.</span></span><button class="btn small" data-pb="vpn">🛡 Make private (VPN)</button><button class="btn small ghost" data-pb="off">Go offline</button><button class="pb-x" data-pb="x" title="Hide until restart" aria-label="Hide">✕</button>`;
    bar.addEventListener('click', (e) => {
      const k = e.target.closest('[data-pb]')?.dataset.pb;
      if (k === 'off') toggleNet();
      else if (k === 'vpn') { setTab = 'general'; go({ view: 'settings' }); }
      else if (k === 'x') { S.privacyBarHidden = true; bar.remove(); }
    });
  }
  if (main.firstChild !== bar) main.prepend(bar);
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
      ${knowledgeHeroHTML()}
      ${bestSetupHTML()}
      <div class="row feature-row">
        <span class="feature">${cloud ? 'Local by default, cloud only where you choose' : 'Everything runs on this PC'}</span><span class="feature">Several models as one team</span><span class="feature">Double-checking built in</span><span class="feature">Photo, video and music studio</span><span class="feature">Private knowledge bases</span><span class="feature">OpenAI-compatible local API</span>
      </div>
      ${text.length && text.every((m) => m.source === 'bundled') && !cloud ? `<div class="notice info grow-note" style="margin-bottom:18px"><b>You're using Quicksilver's starter models.</b> They're quick and private, but on their own they're limited: smaller models know less and make more mistakes on hard questions. Quicksilver grows with you: install stronger models, or build teams that make several models work as one, for sharper, more accurate answers. <span class="row" style="margin-top:8px"><button class="btn primary small" data-goto="stacks">Pick a stack</button><button class="btn small" data-goto="models">Get more models</button></span></div>` : ''}
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
      <p class="small muted start-note">Each of these is an <b>assistant programmed to be an expert at one task</b>: it has its own expert instructions, settings tuned for that work (how creative, how long, how much it reads), the add-ons it needs (web search, your knowledge, double-checking, a skill on every message), and it asks for the model best rated for that kind of work. Pick the one that matches what you want to do; you can switch at the top of any chat.</p>
      <div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(250px,1fr))">
        ${S.data.assistants.filter((a) => a.id !== 'as-general').map((a) => `<button class="card" data-start="${a.id}" style="text-align:left"><div class="row"><span class="emoji-badge">${esc(a.emoji)}</span><h3 class="grow">${esc(a.name)}</h3></div><p class="small muted" style="font-weight:600;margin:8px 0 0">${esc(a.description)}</p></button>`).join('')}
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
    $('#wc-cloud')?.addEventListener('click', () => { S.data.prefs.welcomed = true; save(); modelsTab = 'api'; go({ view: 'models' }); });
    bindNameAsk();
  },
};

// First visits: what Quicksilver is, in three steps. Closes for good with ×.
function welcomeCardHTML() {
  if (S.data.prefs.welcomed) return '';
  const name = S.data.prefs.userName;
  return `<div class="welcome-card">
    <button class="icon-btn sm wc-x" id="wc-close" title="Close" aria-label="Close">${icon('x', 16)}</button>
    <h2>Welcome${name ? `, ${esc(name)}` : ''}. Your own AI, on your own computer.</h2>
    ${nameAskHTML()}
    <p class="muted">Private, free and works offline: nothing you type leaves this PC unless you connect a cloud AI.</p>
    <p class="human-pitch">✍️ <b>Sounds like a person, not a chatbot.</b> Quicksilver talks the way people do and writes clean, natural text you can send as your own: no "Certainly!", no sign-offs, none of the usual AI tells.</p>
    <div class="wc-steps">
      <button class="wc-step" id="wc-chat"><span class="wc-n">1</span><span><b>Ask anything</b><span class="small muted">It's ready now. Type, talk (mic) or drop in a photo or file.</span></span></button>
      <button class="wc-step" id="wc-import"><span class="wc-n">2</span><span><b>Bring your chats from other AIs</b><span class="small muted">Carry on any conversation here, privately.</span></span></button>
      <button class="wc-step" id="wc-setup"><span class="wc-n">3</span><span><b>Make it great at your work</b><span class="small muted">Get the best free models for what you do, fitted to this PC.</span></span></button>
      <button class="wc-step" id="wc-cloud"><span class="wc-n">4</span><span><b>Add a free cloud AI (optional)</b><span class="small muted">Connect Gemini, Groq or free no-key options for extra muscle. With several connected, Quicksilver picks the best for each question.</span></span></button>
    </div>
  </div>`;
}

async function init() {
  S.catalog = await qs.call('catalog:get');
  mergeRemoteRecipes();
  S.config = await qs.call('config:get');
  const saved = await qs.call('data:load');
  if (saved?.version === 3) S.data = saved;
  else S.data = { version: 3, prefs: { ...DEFAULT_PREFS, userName: saved?.settings?.userName && saved.settings.userName !== 'You' ? saved.settings.userName : '' }, assistants: [], chats: [] };
  S.data.prefs = { ...DEFAULT_PREFS, ...S.data.prefs };
  if (S.data.prefs.effortLevel === 'max') S.data.prefs.effortLevel = 'council'; // Deep think became Council
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
  $$('.sidebar [data-nav]').forEach((b) => b.addEventListener('click', () => {
    if (b.dataset.nav === 'newchat') newChat();
    else if (b.dataset.nav === 'upgrades') { go({ view: 'pc' }); setTimeout(() => document.getElementById('upgrades')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300); }
    else go({ view: b.dataset.nav });
  }));
  $('#nav-explore')?.addEventListener('click', () => { S.data.prefs.exploreOpen = !exploreOpen(); save(); paintExplore(); });
  $('#theme-btn').addEventListener('click', () => { S.data.prefs.theme = document.documentElement.dataset.theme === 'dark' ? 'light' : 'dark'; applyPrefs(); save(); if (S.route.view === 'settings') render(); });
  paintNet();
  if (S.config?.vpnOnly) refreshVpn();
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
  qs.onModelProgress((d) => { S.downloads[d.id] = { ...S.downloads[d.id], ...d }; paintDownloads(); paintLiquidGate(); });
  qs.onModelDone(async ({ id, model }) => {
    delete S.downloads[id];
    await refreshModels();
    // One more Liquid Edition model in: re-check what's still missing (opens Quicksilver when none is).
    if (document.getElementById('liquid-gate')) { await setUpQuicksilver(false).catch(() => {}); if (document.getElementById('liquid-gate')) return; }
    else setTimeout(liquidBackfill, 2000); // the next Liquid Edition model
    S.est = null;
    if (!(await applyPendingUpgrades(model).catch(() => false))) toast(`${model.name} is ready.`);
    if (!targetValid(S.data.prefs.defaultTarget) && model.kind === 'text') { S.data.prefs.defaultTarget = `local:${model.id}`; save(); }
    // Load the default model in the background so the first reply is quick.
    if (model.kind === 'text') await setUpQuicksilver(false).catch(() => {}); // a new model can join Quicksilver's team
    if (model.kind === 'text') qs.call('models:warm', S.data.prefs.defaultTarget || `local:${model.id}`, { contextSize: S.data.prefs.contextSize, gpu: S.data.prefs.gpu }).catch(() => {});
    if (!$('#modal').hidden) return;
    render();
  });
  qs.onModelError(({ id, message, cancelled }) => { delete S.downloads[id]; paintDownloads(); if ((S.catalog?.liquid || []).includes(id) && !gateItems.some((m) => m.catalogId === id)) { backfillSkip.add(id); setTimeout(liquidBackfill, 5000); } if (gateItems.some((m) => m.catalogId === id)) { gateFailed[id] = message; paintLiquidGate(); } if (!cancelled) toast(message, 8000); else toast(message); if (['models', 'stacks', 'studio'].includes(S.route.view)) render(); });

  go({ view: 'home' });
  // People updating get the short tour once too (new people see it after the name question).
  if ((S.data.prefs.askedName || S.data.prefs.userName) && !S.data.prefs.tourDone) setTimeout(() => { if ($('#modal').hidden) startTour(); }, 1500);
  refreshEstimates().then(() => { if (['home', 'stacks', 'models', 'pc'].includes(S.route.view)) render(); });
  setTimeout(() => checkForUpdates().then(() => { if (['stacks', 'models'].includes(S.route.view) && $('#modal').hidden) render(); }).catch(() => {}), 30000);
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
    toast(r.stack ? '👋 Meet Quicksilver Liquid Edition: two AI models working as one, right on your PC. It sees photos, thinks harder when a question needs it, and nothing leaves this computer. Try an idea below.'
      : '👋 Quicksilver is ready to chat, privately on your PC, and it can see photos. Try an idea below.', 10000);
  }
  // Quicksilver doesn't open until the whole Liquid Edition is installed: anything not copied in
  // from the models folder downloads straight away behind the setup screen.
  liquidGate(r);
  if (r.stack && !before?.startsWith('stack:quicksilver') && p.defaultTarget === r.stack && !firstLook) toast('💧 Quicksilver Liquid Edition is fully ready: your models now work together as one.', 8000);
  if (['home', 'chat'].includes(S.route.view) && (r.added.length || p.defaultTarget !== before)) render();
  return r;
}

// ---------- Liquid Edition setup screen ----------
// Shown over everything while any Liquid Edition model is missing (installed from the setup file
// alone, or a download that was interrupted). Downloads start at once and resume where they
// stopped; when the last one is in, the screen goes away and Quicksilver opens.
let gateItems = [];
const gateFailed = {};
function liquidGate(r) {
  gateItems = (r?.missing || []).filter((m) => !S.installed.some((x) => x.catalogId === m.catalogId));
  let el = document.getElementById('liquid-gate');
  if (!gateItems.length) {
    if (el) { el.remove(); toast('💧 Quicksilver Liquid Edition is ready: chat, pictures and video, all on your PC. Its other uncensored models now download in the background.', 9000); render(); }
    liquidBackfill();
    return;
  }
  if (!el) {
    el = document.createElement('div');
    el.id = 'liquid-gate';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;background:var(--bg,#0f1117);overflow:auto';
    document.body.appendChild(el);
    el.addEventListener('click', async (e) => {
      if (e.target.closest('[data-gate-online]')) { S.config = await call('config:set', { offline: false }); startGateDownloads(true); }
      else if (e.target.closest('[data-gate-retry]')) startGateDownloads(true);
    });
  }
  startGateDownloads(false);
}
function startGateDownloads(retry) {
  if (S.config?.offline) { paintLiquidGate(); return; }
  for (const m of gateItems) {
    if (S.downloads[m.catalogId] || (gateFailed[m.catalogId] && !retry)) continue;
    delete gateFailed[m.catalogId];
    download(m.repo ? { repo: m.repo, quant: m.quant, catalogId: m.catalogId, name: m.name } : { catalogId: m.catalogId }, m.name)
      .catch((err) => { gateFailed[m.catalogId] = err.message; paintLiquidGate(); });
  }
  paintLiquidGate();
}
function paintLiquidGate() {
  const el = document.getElementById('liquid-gate');
  if (!el) return;
  const rows = gateItems.map((m) => {
    const d = S.downloads[m.catalogId];
    const pct = d?.total ? Math.round((d.downloaded / d.total) * 100) : 0;
    const what = gateFailed[m.catalogId] ? `⚠️ ${esc(gateFailed[m.catalogId])}` : d ? (d.total ? `${gb(d.downloaded)} of ${gb(d.total)} (${pct}%)` : 'Finding files…') : S.config?.offline ? 'Waiting: offline mode is on' : 'Starting…';
    return `<div class="stack-v" style="gap:4px"><div class="row"><b class="grow">${esc(m.name)}</b><span class="small muted">${what}</span></div><div class="bar"><i style="width:${pct}%"></i></div></div>`;
  }).join('');
  const all = gateItems.map((m) => S.downloads[m.catalogId]).filter(Boolean);
  const tot = all.reduce((a, d) => a + (d.total || 0), 0);
  const got = all.reduce((a, d) => a + (d.downloaded || 0), 0);
  el.innerHTML = `<div class="card" style="max-width:560px;width:100%;padding:24px">
    <h2 style="margin-top:0">💧 Installing Quicksilver Liquid Edition</h2>
    <p class="muted">Quicksilver opens as soon as its whole uncensored crew is on this PC: the Brain, the Closer, smarter search, Lustify for pictures and Wan 2.2 for video. ${tot ? `${gb(got)} of ${gb(tot)} so far.` : ''} You can close Quicksilver at any time: downloads pick up where they stopped.</p>
    <div class="stack-v" style="gap:14px;margin:16px 0">${rows}</div>
    ${S.config?.offline ? '<button class="btn primary" data-gate-online>Turn off offline mode and download</button>' : Object.keys(gateFailed).length ? '<button class="btn primary" data-gate-retry>Try again</button>' : ''}
    <p class="small muted" style="margin-bottom:0">Tip: the "Quicksilver models" folder that comes with the installer has all of these already. Keep it next to the setup file and reinstall to skip the download.</p></div>`;
}

// Every other uncensored model is part of the Liquid Edition too: once the core is in, they download
// one at a time in the background (chat models first, then pictures), while there's room on the disk.
const backfillSkip = new Set();
async function liquidBackfill() {
  // Only where the Liquid Edition is installed (it comes with the installer).
  if (S.config?.offline || document.getElementById('liquid-gate') || !S.installed.some((m) => m.source === 'bundled')) return;
  const members = S.catalog?.liquid || [];
  if (members.some((id) => S.downloads[id])) return; // one at a time
  const next = members.find((id) => !backfillSkip.has(id) && !S.installed.some((m) => m.catalogId === id));
  if (!next) return;
  const c = S.catalog.text.find((m) => m.id === next) || S.catalog.media.find((m) => m.id === next);
  if (!c) { backfillSkip.add(next); return liquidBackfill(); }
  const disk = await call('disk:info').catch(() => null);
  const need = ((c.sizeGB || 0) + (c.mmprojGB || 0) + 10) * 1024 ** 3; // keep 10 GB free for Windows
  if (disk?.freeBytes && disk.freeBytes < need) {
    if (!S.backfillDiskNote) { S.backfillDiskNote = true; toast(`💧 The rest of the Liquid Edition is waiting for disk space (${c.name} needs ${Math.ceil(c.sizeGB)} GB). It continues when there's room.`, 9000); }
    return;
  }
  download({ catalogId: next }, c.name).catch(() => { backfillSkip.add(next); liquidBackfill(); });
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
