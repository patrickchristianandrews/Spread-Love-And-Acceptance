// Home dashboard and app start-up.
'use strict';

const DEFAULT_PREFS = {
  userName: '', about: '', textSize: 'normal', defaultTarget: '', temperature: 0.6, contextSize: 16384, maxTokens: 4096,
  gpu: 'auto', effort: 'medium', effortLevel: 'thorough', factCheck: false, factChecker: '', lastAssistant: 'as-general', sourcesPerAnswer: 8,
};

function defaultAssistants() {
  const facts = { office: true, research: true };
  return Object.entries(S.catalog.jobs).map(([job, j]) => ({
    id: `as-${job}`, job, builtIn: true, name: j.assistant.name, emoji: j.assistant.emoji, description: j.pitch,
    instructions: j.assistant.instructions, target: '', temperature: j.temperature, contextSize: j.contextSize, maxTokens: j.maxTokens,
    library: j.library, web: false, factCheck: Boolean(facts[job]),
  }));
}

function paintIcons(root = document) {
  root.querySelectorAll('[data-icon]').forEach((el) => { if (!el.firstChild) el.innerHTML = icon(el.dataset.icon); });
}

function applyPrefs() {
  document.getElementById('app')?.classList.toggle('collapsed', Boolean(S.data.prefs.sidebarCollapsed));
  document.documentElement.dataset.size = S.data.prefs.textSize === 'normal' ? '' : S.data.prefs.textSize;
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
      <div class="card" style="background:linear-gradient(120deg,#e7eaff 0%,#e0edf8 55%,#d9f3f2 100%);border-color:#c5c9f5;padding:26px 28px;margin-bottom:20px">
        <div class="row"><div class="grow">
          <h1 style="font-size:2.1rem">${S.data.prefs.userName ? `Welcome back, ${esc(S.data.prefs.userName)}.` : 'Quicksilver'}</h1>
          <p style="font-size:1.12rem;font-weight:700;margin:6px 0 0;color:var(--lav-ink)">Forms to fit your work. Private AI on your own PC, as strong as you need it.</p>
        </div><button class="btn primary" data-nav-new style="font-size:1.05rem;padding:10px 22px">＋ New chat</button></div>
        <div class="row" style="margin-top:14px">
          <span class="badge b-mint">🔒 ${cloud ? 'Local by default; cloud only where you choose' : '100% on this PC: nothing leaves it'}</span>
          <span class="badge b-lav">✨ Infuse AIs into one</span><span class="badge b-sky">✅ Built-in fact checking</span><span class="badge b-peach">🎨 Photo & video studio</span><span class="badge b-pink">📚 Private knowledge bases</span><span class="badge b-lemon">🔌 OpenAI-compatible API</span>
        </div>
      </div>
      ${!text.length && !cloud ? `<div class="notice info" style="margin-bottom:18px"><b>First step:</b> open the Stack Advisor. It checks this PC and downloads the best free models for your work in one click. <button class="btn primary small" data-goto="stacks" style="margin-left:8px">Open the Stack Advisor</button></div>` : ''}
      <div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(210px,1fr))">
        ${tile('💬', 'Models', text.length, text.length ? `${text.filter((m) => m.vision).length} can see images` : 'none installed yet', 'models')}
        ${tile('✨', 'Infused AIs', S.stacks.length, S.stacks[0] ? esc(S.stacks[0].name) : 'fuse several AIs into one', 'stacks')}
        ${tile('🎨', 'Studio models', media.length, media.length ? 'image & video ready' : 'create & edit photos and video', 'studio')}
        ${tile('🖥️', 'Hardware', h ? `${h.ramGB.toFixed(0)} GB` : '…', h ? esc(h.vramGB ? `${h.gpuName} · ${h.vramGB.toFixed(0)} GB video` : 'running on the processor') : 'checking…', 'pc')}
        ${tile('☁️', 'Cloud APIs', cloud, cloud ? esc(S.providers.map((p) => p.name).join(', ')) : 'optional: Claude, GPT, Gemini…', 'models')}
        ${tile('🔌', 'API server', api?.running ? 'On' : 'Off', api?.running ? `127.0.0.1:${api.port}` : 'let other apps use your models', 'settings')}
      </div>
      <div class="section"><h2>Start something</h2></div>
      <div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(250px,1fr))">
        ${S.data.assistants.slice(0, 6).map((a) => `<button class="card" data-start="${a.id}" style="text-align:left"><div class="row"><span class="emoji-badge">${esc(a.emoji)}</span><h3 class="grow">${esc(a.name)}</h3></div><p class="small muted" style="font-weight:600;margin:8px 0 0">${esc(a.description)}</p></button>`).join('')}
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
  },
};

async function init() {
  S.catalog = await qs.call('catalog:get');
  S.config = await qs.call('config:get');
  const saved = await qs.call('data:load');
  if (saved?.version === 3) S.data = saved;
  else S.data = { version: 3, prefs: { ...DEFAULT_PREFS, userName: saved?.settings?.userName && saved.settings.userName !== 'You' ? saved.settings.userName : '' }, assistants: [], chats: [] };
  S.data.prefs = { ...DEFAULT_PREFS, ...S.data.prefs };
  // Keep built-in assistants up to date, but never overwrite your edits or your own assistants.
  for (const d of defaultAssistants()) if (!S.data.assistants.some((a) => a.id === d.id)) S.data.assistants.push(d);
  applyPrefs();
  await Promise.all([refreshModels(), refreshProviders()]);
  try { S.hasIntegrations = (await qs.call('int:list')).some((c) => c.enabled) || (await qs.call('mcp:list')).length > 0; } catch {}
  save();

  paintIcons();
  $$('.sidebar [data-nav]').forEach((b) => b.addEventListener('click', () => (b.dataset.nav === 'newchat' ? newChat() : go({ view: b.dataset.nav }))));
  $('#collapse').addEventListener('click', () => { S.data.prefs.sidebarCollapsed = !S.data.prefs.sidebarCollapsed; applyPrefs(); save(); });
  $('#chat-search').addEventListener('input', renderChatList);
  $('#dl-mini').addEventListener('click', () => { modelsTab = 'installed'; go({ view: 'models' }); });
  $('#modal').addEventListener('mousedown', (e) => { if (e.target.id === 'modal') closeModal(); });
  document.addEventListener('keydown', (e) => {
    if (e.key === 'Escape' && !$('#modal').hidden) closeModal();
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'n') { e.preventDefault(); newChat(); }
    if ((e.ctrlKey || e.metaKey) && e.key.toLowerCase() === 'k') { e.preventDefault(); $('#chat-search').focus(); }
  });

  qs.onModelProgress((d) => { S.downloads[d.id] = { ...S.downloads[d.id], ...d }; paintDownloads(); });
  qs.onModelDone(async ({ id, model }) => {
    delete S.downloads[id];
    await refreshModels();
    S.est = null;
    toast(`${model.name} is ready.`);
    if (!targetValid(S.data.prefs.defaultTarget) && model.kind === 'text') { S.data.prefs.defaultTarget = `local:${model.id}`; save(); }
    // Load the default model in the background so the first reply is quick.
    if (model.kind === 'text') qs.call('models:warm', S.data.prefs.defaultTarget || `local:${model.id}`, { contextSize: S.data.prefs.contextSize, gpu: S.data.prefs.gpu }).catch(() => {});
    if (!$('#modal').hidden) return;
    render();
  });
  qs.onModelError(({ id, message, cancelled }) => { delete S.downloads[id]; paintDownloads(); if (!cancelled) toast(message, 8000); else toast(message); if (['models', 'stacks', 'studio'].includes(S.route.view)) render(); });

  go({ view: 'home' });
  refreshEstimates().then(() => { if (['home', 'stacks', 'models', 'pc'].includes(S.route.view)) render(); });
}

init().catch((err) => { document.body.innerHTML = `<div style="padding:40px;font:16px system-ui"><h1>Quicksilver couldn't start</h1><pre>${String(err?.stack || err).replace(/</g, '&lt;')}</pre></div>`; });
