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
    instructions: 'You are a well-traveled trip planner. Ask for dates, budget and interests if missing, then give a day-by-day itinerary with realistic travel times, rough costs, booking tips and a short packing list. Flag anything that needs checking closer to the date (opening hours, prices, visas).' },
  { id: 'as-ideas', job: 'general', name: 'Brainstormer', emoji: '💡', description: 'Lots of fresh ideas, fast: names, gifts, plans, posts and projects.', temperature: 0.95,
    instructions: 'You are an energetic creative partner. Give many varied ideas quickly (at least 10 unless asked otherwise), from safe to bold, grouped into themes. Then pick your top three and say why. Build on the user\'s favorites when they reply.' },
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
    // Just Online or Offline, as it always was. (If Private online is on in Settings and no VPN
    // is connected, the tooltip says why nothing is going out.)
    const vpnWait = !off && S.config?.vpnOnly && !S.vpn?.connected;
    for (const c of ['vpn', 'vpn-wait', 'exposed']) b.classList.remove(c);
    (b.querySelector('.net-lbl') || b.querySelector('span:nth-child(2)')).textContent = off ? 'Offline' : 'Online';
    b.title = off ? 'Offline: nothing leaves this PC. Click to go online.' : vpnWait ? 'Online, but Private online (Settings → General) is waiting for a VPN, so nothing leaves this PC until one connects. Click to go offline.' : 'Online: web search, cloud AIs and downloads are available. Click to go offline.';
  }
  document.documentElement.classList.toggle('is-offline', off);
  document.documentElement.classList.toggle('is-exposed', !off && !S.config?.vpnOnly);
  paintPrivacyBar();
}
// A one-line banner at the top of the page (inside the page: it never covers anything):
//  - online without a VPN: says it isn't private; ✕ hides it until Quicksilver restarts.
//  - "Private online" is on but no VPN is connected: nothing can reach the internet, so updates,
//    downloads and web search all fail. This says why, and one click fixes it either way
//    (connect the VPN, or go online without one). It can't be hidden: until it's resolved,
//    everything that needs the internet is stopped.
function paintPrivacyBar() {
  const main = document.getElementById('main');
  if (!main) return;
  const off = Boolean(S.config?.offline);
  const waiting = !off && Boolean(S.config?.vpnOnly) && S.vpn && !S.vpn.connected;
  const kind = waiting ? 'vpn-wait' : !off && !S.config?.vpnOnly && !S.privacyBarHidden ? 'exposed' : '';
  let bar = document.getElementById('privacy-bar');
  if (!kind) { bar?.remove(); return; }
  if (!bar || bar.parentNode !== main || bar.dataset.kind !== kind) {
    bar?.remove();
    bar = Object.assign(document.createElement('div'), { id: 'privacy-bar', className: 'privacy-bar' });
    bar.dataset.kind = kind;
    bar.innerHTML = kind === 'vpn-wait'
      ? `<span class="grow">🛡 <b>Private online is on, but no VPN is connected.</b> <span class="small">Until one is, nothing can reach the internet: updates, downloads, web search and cloud AIs are paused. Models on this PC keep working.</span></span>${S.vpn?.installed ? '<button class="btn small" data-pb="connect">Open Proton VPN</button>' : ''}<button class="btn small primary" data-pb="plain">Go online without a VPN</button><button class="btn small ghost" data-pb="off">Go offline</button>`
      : `<span class="grow">🌐 <b>Online — not private.</b> <span class="small">Web searches and anything sent to a cloud AI can be seen by those services, and sites see your location. Chats with models on this PC stay private.</span></span><button class="btn small" data-pb="vpn">🛡 Make private (VPN)</button><button class="btn small ghost" data-pb="off">Go offline</button><button class="pb-x" data-pb="x" title="Hide until restart" aria-label="Hide">✕</button>`;
    bar.addEventListener('click', async (e) => {
      const k = e.target.closest('[data-pb]')?.dataset.pb;
      if (k === 'off') toggleNet();
      else if (k === 'vpn') { setTab = 'general'; go({ view: 'settings' }); }
      else if (k === 'x') { S.privacyBarHidden = true; bar.remove(); }
      else if (k === 'connect') { await call('vpn:open').catch(() => {}); toast('Opening Proton VPN. Press Connect there; Quicksilver notices within a few seconds.', 6000); }
      else if (k === 'plain') { await setPrivacyMode('online'); await refreshModels().catch(() => {}); render(); }
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
      <p class="small muted start-note">Each of these is a <b>helper set up to be an expert at one task</b>: it has its own expert instructions, settings tuned for that work (how creative, how long, how much it reads), the add-ons it needs (web search, your knowledge, double-checking, a skill on every message), and it asks for the model best rated for that kind of work. Pick the one that matches what you want to do; you can switch at the top of any chat.</p>
      <div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(250px,1fr))">
        ${S.data.assistants.filter((a) => a.id !== 'as-general').map((a) => `<button class="card" data-start="${a.id}" style="text-align:left"><div class="row"><span class="emoji-badge">${esc(a.emoji)}</span><h3 class="grow">${esc(a.name)}</h3></div><p class="small muted" style="font-weight:600;margin:8px 0 0">${esc(a.description)}</p></button>`).join('')}
        <button class="card" data-goto="studio" style="text-align:left"><div class="row"><span class="emoji-badge">🎨</span><h3>Create an image or video</h3></div><p class="small muted" style="font-weight:600;margin:8px 0 0">Generate, edit with AI, trim and convert.</p></button>
        <button class="card" data-goto="library" style="text-align:left"><div class="row"><span class="emoji-badge">📚</span><h3>Connect your knowledge</h3></div><p class="small muted" style="font-weight:600;margin:8px 0 0">Files, websites and PubMed, isolated per helper and cited.</p></button>
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
  for (const c of S.data.chats || []) { dropUnfinished(c.messages); if (!EFFORTS[c.effort]) delete c.effort; } // nothing was left running, and only real effort levels
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
    else if (b.dataset.nav === 'newcode') newCodeChat();
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
    if (document.getElementById('liquid-gate')) return; // the setup screen: nothing behind it responds
    if (e.key === 'Escape' && !$('#modal').hidden) closeModal();
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') { e.preventDefault(); if (e.shiftKey) newCodeChat(); else newChat(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#chat-search').focus(); }
  });

  setTimeout(() => preloadDefault(), 3000);
  qs.onModelProgress((d) => { S.downloads[d.id] = { ...S.downloads[d.id], ...d }; paintDownloads(); paintLiquidGate(); });
  qs.onModelDone(async ({ id, model }) => {
    delete S.downloads[id];
    // A model you added "to the crew" is ticked as in use, so it really joins.
    if (useWhenDone.has(model?.catalogId) || useWhenDone.has(id)) { useWhenDone.delete(model?.catalogId); useWhenDone.delete(id); await qs.call('models:use', model.id, true).catch(() => {}); }
    await refreshModels();
    // One more Liquid Edition model in: re-check what's still missing (opens Quicksilver when none is).
    if (document.getElementById('liquid-gate')) { await setUpQuicksilver(false).catch(() => {}); if (document.getElementById('liquid-gate')) return; }
    S.est = null;
    const gateJustClosed = Date.now() - (S.gateClosedAt || 0) < 8000;
    if (!(await applyPendingUpgrades(model).catch(() => false)) && !gateJustClosed) toast(`${model.name} is ready.`);
    // An open "Suggested add-ons" window shows the finished download.
    if (document.getElementById('addon-list')) document.getElementById('addon-list').innerHTML = liquidAddonsHTML();
    if (!targetValid(S.data.prefs.defaultTarget) && !(S.data.prefs.defaultChosen && !S.data.prefs.defaultTarget) && model.kind === 'text') { S.data.prefs.defaultTarget = `local:${model.id}`; S.data.prefs.defaultAuto = true; save(); }
    // Load the default model in the background so the first reply is quick.
    if (model.kind === 'text') await setUpQuicksilver(false).catch(() => {}); // a new model can join Quicksilver's team
    if (model.kind === 'text' && (S.catalog?.liquidPro && Object.values(S.catalog.liquidPro).includes(model.catalogId))) { await qs.call('quicksilver:pro').catch(() => {}); await refreshModels(); }
    if (model.kind === 'text') qs.call('models:warm', S.data.prefs.defaultTarget || `local:${model.id}`, { contextSize: S.data.prefs.contextSize, gpu: S.data.prefs.gpu }).catch(() => {});
    if (!$('#modal').hidden) return;
    render();
  });
  qs.onModelError(({ id, message, cancelled }) => { delete S.downloads[id]; paintDownloads(); if (document.getElementById('addon-list')) document.getElementById('addon-list').innerHTML = liquidAddonsHTML(); if (gateItems.some((m) => m.catalogId === id)) { gateFailed[id] = message; paintLiquidGate(); } if (!cancelled) toast(message, 8000); else toast(message); if (['models', 'stacks', 'studio'].includes(S.route.view)) render(); });

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
  fetchHelpersQuietly();
  const before = p.defaultTarget;
  // The Liquid Edition is the default once it's ready, unless you chose something else yourself.
  // A default Quicksilver picked by itself (a model found from another app, or the first one to
  // finish downloading) gives way to it; so does, once, a filtered model left as the default by
  // an earlier version.
  const leftover = r.stack && !p.liquidDefaultOnce && targetValid(p.defaultTarget) && p.defaultTarget.startsWith('local:') && !liquidOk(p.defaultTarget);
  const choseAutomatic = p.defaultChosen && !p.defaultTarget; // "Automatic" picked in Settings
  if (r.stack && !choseAutomatic && (!targetValid(p.defaultTarget) || p.defaultTarget === 'local:starter' || p.defaultAuto || leftover)) {
    if (leftover) toast(`💧 The Liquid Edition is now your default (it was ${targetLabel(p.defaultTarget)}, a filtered model). Change it any time in Settings → Chat.`, 10000);
    p.defaultTarget = r.stack; p.defaultAuto = false;
  }
  if (r.stack && !p.liquidDefaultOnce) { p.liquidDefaultOnce = true; save(); }
  else if (!targetValid(p.defaultTarget) && targetValid('local:starter')) p.defaultTarget = 'local:starter';
  if (p.defaultTarget !== before) save();
  if (firstLook && r.added.length) {
    toast(r.stack ? '👋 Meet Quicksilver Liquid Edition: two AI models working as one, right on your PC. It sees photos, thinks harder when a question needs it, and nothing leaves this computer. Try an idea below.'
      : '👋 Quicksilver is ready to chat, privately on your PC, and it can see photos. Try an idea below.', 10000);
  }
  // The one-time tidy of the model list (see models.tidyImported) says what it did.
  if (r.tidied?.length) {
    await refreshModels();
    toast(`🧹 Tidied your model list: ${r.tidied.length} ${r.tidied.length === 1 ? 'entry was' : 'entries were'} not a chat model or a second copy of one you have (${r.tidied.slice(0, 3).map((x) => x.name).join(', ')}${r.tidied.length > 3 ? '…' : ''}). No file was deleted.`, 12000);
  }
  // Quicksilver doesn't open until the whole Liquid Edition is installed: anything not copied in
  // from the models folder downloads straight away behind the setup screen.
  liquidGate(r);
  if (r.stack && !before?.startsWith('stack:quicksilver') && p.defaultTarget === r.stack && !firstLook && Date.now() - (S.gateClosedAt || 0) > 8000) toast('💧 Quicksilver Liquid Edition is fully ready: your models now work together as one.', 8000);
  if (['home', 'chat'].includes(S.route.view) && (r.added.length || p.defaultTarget !== before)) render();
  return r;
}

// ---------- Liquid Edition setup screen ----------
// Shown over everything while any Liquid Edition model is missing (installed from the setup file
// alone, or a download that was interrupted). Downloads start at once and resume where they
// stopped; when the last one is in, the screen goes away and Quicksilver opens.
let gateItems = [];
const useWhenDone = new Set();
document.addEventListener('click', (e) => { const b = e.target.closest?.('[data-use-when-done]'); if (b) useWhenDone.add(b.dataset.useWhenDone); }, true);
const gateFailed = {};
const gateTries = {}; // how many times each model's download has failed (picks the next copy to try)
let gateNote = ''; // something to tell you on the setup screen itself (toasts are behind it)
// While the setup screen is up, the app behind it can't be reached at all: not by the Tab key,
// not by a keyboard shortcut, not by a screen reader. Focus moves to the setup screen.
function gateInert(on) {
  for (const id of ['app', 'modal']) { const n = document.getElementById(id); if (n) n.inert = on; }
  if (on) { const g = document.getElementById('liquid-gate'); if (g) { g.tabIndex = -1; g.focus({ preventScroll: true }); } }
}
function liquidGate(r) {
  // What is missing is decided in one place (models.registerStarter): a plain catalog build of
  // the Brain, or an unticked file from another app, does not count as having it.
  gateItems = r?.missing || [];
  let el = document.getElementById('liquid-gate');
  if (!gateItems.length) {
    if (el) { el.remove(); gateInert(false); S.gateClosedAt = Date.now(); toastAction('💧 Quicksilver Liquid Edition is ready: chat, pictures and video, all on your PC.', 'Suggested add-ons', () => liquidAddonsModal(), 12000); render(); }
    return;
  }
  if (!el) {
    el = document.createElement('div');
    el.id = 'liquid-gate';
    el.setAttribute('role', 'dialog');
    el.setAttribute('aria-modal', 'true');
    el.style.cssText = 'position:fixed;inset:0;z-index:10000;display:flex;align-items:center;justify-content:center;padding:16px;background:var(--bg,#0f1117);overflow:auto';
    document.body.appendChild(el);
    gateInert(true);
    el.addEventListener('click', async (e) => {
      // Messages elsewhere in the app are behind this screen, so anything that goes wrong is said here.
      gateNote = '';
      try {
        if (e.target.closest('[data-gate-online]')) { S.config = await qs.call('config:set', { offline: false }); paintNet(); startGateDownloads(true); }
        else if (e.target.closest('[data-gate-plain]')) { S.config = await qs.call('config:set', { offline: false, vpnOnly: false }); await refreshVpn().catch(() => {}); startGateDownloads(true); }
        else if (e.target.closest('[data-gate-vpn]')) { await qs.call('vpn:open'); gateNote = 'Proton VPN is opening. Connect it there, then press "Try again".'; paintLiquidGate(); }
        else if (e.target.closest('[data-gate-retry]')) { await refreshVpn().catch(() => {}); startGateDownloads(true); }
      } catch (err) { gateNote = err.message || String(err); paintLiquidGate(); }
    });
    // "Private online" with no VPN connected blocks every download: find out, so the screen can say so.
    if (S.config?.vpnOnly && !S.vpn) refreshVpn().then(() => paintLiquidGate()).catch(() => {});
  }
  startGateDownloads(false);
}
// Voice typing's speech model (about 60 MB) comes inside the full installer. The web installer
// carries no models, so there it is fetched quietly alongside the Liquid Edition's models and the
// microphone is ready as well. It never holds up the setup screen.
let voiceFetch = null;
// The speed helpers for pictures and video (fast 8-step pictures, the quick video decoder):
// fetched once in the background when they did not come with the installer.
let helpersFetch = null;
function fetchHelpersQuietly() {
  if (helpersFetch || S.config?.offline) return;
  helpersFetch = qs.call('media:helpers', true).then((r) => { if (r?.got?.length) refreshSpeeds(); }).catch(() => { helpersFetch = null; });
}
function fetchVoiceQuietly() {
  if (voiceFetch || S.config?.offline) return;
  voiceFetch = qs.call('voice:status').then((st) => (st && !st.model && st.canInstall ? qs.call('voice:setup') : null)).catch(() => { voiceFetch = null; });
}
function startGateDownloads(retry) {
  if (S.config?.offline) { paintLiquidGate(); return; }
  fetchVoiceQuietly();
  for (const m of gateItems) {
    if (S.downloads[m.catalogId] || (gateFailed[m.catalogId] && !retry)) continue;
    // A chat model always comes from an uncensored copy: the one the installer uses, then the
    // other uncensored copies in turn after a failure. Never the catalog's own entry for it,
    // which is the plain (filtered) build. Pictures, video and search models have no such copy
    // list: they come from the catalog, which knows backup copies of each.
    const repos = m.repo ? [m.repo, ...(m.alt || [])] : [];
    if (gateFailed[m.catalogId]) gateTries[m.catalogId] = (gateTries[m.catalogId] || 0) + 1;
    delete gateFailed[m.catalogId];
    const req = repos.length ? { repo: repos[(gateTries[m.catalogId] || 0) % repos.length], quant: m.quant, catalogId: m.catalogId, name: m.name } : { catalogId: m.catalogId };
    download(req, m.name).catch((err) => { gateFailed[m.catalogId] = err.message; paintLiquidGate(); });
  }
  paintLiquidGate();
}
// Private online is on and no VPN is connected: nothing can be downloaded until one is, or until
// you choose to go online without it.
const gateVpnWait = () => Boolean(S.config?.vpnOnly) && !S.config?.offline && S.vpn?.connected === false;
function paintLiquidGate() {
  const el = document.getElementById('liquid-gate');
  if (!el) return;
  const state = (m) => {
    const d = S.downloads[m.catalogId];
    const pct = d?.total ? Math.round((d.downloaded / d.total) * 100) : 0;
    const what = gateFailed[m.catalogId] ? `⚠️ ${gateFailed[m.catalogId]}` : d ? (d.total ? `${gb(d.downloaded)} of ${gb(d.total)} (${pct}%)` : 'Finding files…') : S.config?.offline ? 'Waiting: offline mode is on' : gateVpnWait() ? 'Waiting: no VPN connected' : 'Starting…';
    return { pct, what };
  };
  const all = gateItems.map((m) => S.downloads[m.catalogId]).filter(Boolean);
  const tot = all.reduce((a, d) => a + (d.total || 0), 0);
  const got = all.reduce((a, d) => a + (d.downloaded || 0), 0);
  const soFar = tot ? `${gb(got)} of ${gb(tot)} so far.` : '';
  const failed = Object.keys(gateFailed).length > 0;
  const buttons = S.config?.offline ? '<button class="btn primary" data-gate-online>Turn off offline mode and download</button>'
    : gateVpnWait() ? `<div class="notice info" style="text-align:left;margin-bottom:10px"><b>🛡 Private online is on, but no VPN is connected.</b> Until one is, nothing can be downloaded.</div>
        <div class="row" style="gap:8px;flex-wrap:wrap"><button class="btn primary" data-gate-vpn>Open Proton VPN</button><button class="btn" data-gate-plain>Go online without a VPN</button><button class="btn ghost" data-gate-retry>Try again</button></div>`
      : failed ? '<button class="btn primary" data-gate-retry>Try again</button>' : '';
  // The screen is built once and only its numbers change while downloads run, so a button under
  // your mouse or keyboard is still the same button when you press it. It is rebuilt only when
  // the list of models, the buttons or the note change.
  const key = JSON.stringify([gateItems.map((m) => m.catalogId), buttons, gateNote]);
  if (el.dataset.key !== key) {
    el.dataset.key = key;
    el.innerHTML = `<div class="card" style="max-width:560px;width:100%;padding:24px">
      <h2 style="margin-top:0">💧 Installing Quicksilver Liquid Edition</h2>
      <p class="muted">Quicksilver opens as soon as its whole uncensored crew is on this PC: the Brain, the Closer, smarter search, Lustify for pictures and Wan 2.2 for video. <span data-gate-total></span> You can close Quicksilver at any time: downloads pick up where they stopped.</p>
      <div class="stack-v" style="gap:14px;margin:16px 0">${gateItems.map((m) => `<div class="stack-v" style="gap:4px" data-gate-row="${esc(m.catalogId)}"><div class="row"><b class="grow">${esc(m.name)}</b><span class="small muted" data-gate-what></span></div><div class="bar"><i style="width:0%"></i></div></div>`).join('')}</div>
      ${gateNote ? `<div class="notice" style="text-align:left;margin-bottom:10px" role="alert">${esc(gateNote)}</div>` : ''}
      ${buttons}
      <p class="small muted" style="margin-bottom:0">This is part of setup: Quicksilver downloads its models once (about 30 GB, so it can take a while), then works offline. The full installer's "Quicksilver models" folder has them all already, if you'd rather skip the download.</p></div>`;
  }
  el.querySelector('[data-gate-total]').textContent = soFar;
  for (const m of gateItems) {
    const row = [...el.querySelectorAll('[data-gate-row]')].find((r) => r.dataset.gateRow === m.catalogId);
    if (!row) continue;
    const st = state(m);
    const what = row.querySelector('[data-gate-what]');
    if (what.textContent !== st.what) what.textContent = st.what;
    row.querySelector('.bar i').style.width = `${st.pct}%`;
  }
}

// After the first screen: add models found on this PC, pick a default if there is none, and load
// the default model in the background so the first reply is quick. Both can be turned off.
async function startupModels() {
  const p = S.data.prefs;
  // The model that comes with Quicksilver: ready on first launch, nothing to download.
  try { await setUpQuicksilver(true); } catch {}
  // Pure Liquid Edition: models found from other apps (LM Studio, Ollama, Downloads…) are never
  // added by themselves. They're offered under Models and Stacks ("Review & add"), or added
  // automatically only if you turn that on in Settings → Chat.
  if (p.addFoundModels === true) {
    try {
      const added = await qs.call('models:autoAdd');
      if (added.length) {
        await refreshModels();
        S.found = [];
        if (!targetValid(p.defaultTarget) && added.some((m) => m.kind === 'text')) {
          // The advisor's pick for everyday use, from the models you now have.
          const r = await qs.call('advisor:advise', 'general').catch(() => null);
          const id = r?.mine?.members.judge || r?.mine?.members.drafters[0] || added.find((m) => m.kind === 'text').id;
          p.defaultTarget = `local:${id}`; p.defaultAuto = true;
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
