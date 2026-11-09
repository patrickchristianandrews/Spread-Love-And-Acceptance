// Settings: you, appearance, chat defaults, double-checking, web search, the API server, engines, accounts.
'use strict';

let setTab = 'general';
let engineInfo = null;
const engineProg = {};

views.settings = {
  html() {
    const tabs = { general: 'General', guide: 'Options guide', chat: 'Chat & accuracy', memory: 'Memory', voice: 'Voice', phone: 'Phone', web: 'Web search', api: 'API server', engines: 'Engines', accounts: 'Accounts' };
    const adv = new Set(['web', 'api', 'engines', 'accounts', 'phone']);
    return `<div class="page"><div class="page-head"><h1>Settings</h1></div>
      <div class="tabs">${Object.entries(tabs).filter(([k]) => !simpleOn() || !adv.has(k) || setTab === k).map(([k, l]) => `<button class="tab ${setTab === k ? 'active' : ''}" data-set-tab="${k}">${l}</button>`).join('')}</div>
      <div style="max-width:860px">${({ general: generalHTML, guide: optionsGuideHTML, chat: chatSetHTML, memory: memSetHTML, voice: voiceSetHTML, phone: phoneSetHTML, web: webHTML, api: apiSrvHTML, engines: enginesHTML, accounts: accountsHTML })[setTab]()}</div></div>`;
  },
  bind() {
    $$('[data-set-tab]').forEach((b) => b.addEventListener('click', () => { setTab = b.dataset.setTab; render(); }));
    ({ general: bindGeneral, guide: bindOptionsGuide, chat: bindChatSet, memory: bindMemSet, voice: bindVoiceSet, phone: bindPhoneSet, web: bindWeb, api: bindApiSrv, engines: bindEngines, accounts: bindAccounts })[setTab]();
  },
};

const P = () => S.data.prefs;

function generalHTML() {
  return `<div class="stack-v">
    ${updateBoxHTML()}
    <div class="field"><label>View</label><div class="row">${[[true, 'Simple'], [false, 'Full']].map(([v, l]) => `<button class="btn small ${simpleOn() === v ? 'on' : ''}" data-simple="${v}">${l}</button>`).join('')}</div><span class="help">Simple shows what most people need; everything else is under More in the sidebar and the ＋ in the message box. Full shows every option.</span></div>
    <label class="row"><input type="checkbox" id="g-auto" ${S.data.prefs.autoRoute !== false ? 'checked' : ''}> <span><b>Pick the best model for each question automatically</b> <span class="help">quick answers first; the team works on hard questions when it can still answer in about a minute</span></span></label>
    <label class="row"><input type="checkbox" id="g-autoweb" ${S.data.prefs.autoWeb !== false ? 'checked' : ''}> <span><b>Check the web for questions about current things</b> <span class="help">news, prices, weather, the latest guidance; switch web search off in a chat to skip it there</span></span></label>
    <label class="row"><input type="checkbox" id="g-autofix" ${S.data.prefs.autoFix !== false ? 'checked' : ''}> <span><b>Fix mistakes automatically</b> <span class="help">wrong sums, code that doesn't compile, web pages with errors, or a clear error found by the double-check: the answer is rewritten once with the correction</span></span></label>
    <label class="row"><input type="checkbox" id="g-human" ${S.data.prefs.humanWriting !== false ? 'checked' : ''}> <span><b>Write like a person, not a chatbot</b> <span class="help">conversational, clear answers with no AI tells: no "Certainly!", no sign-offs, no em dashes, and headings or bullet points only when they really help. Off: the usual structured AI style.</span></span></label>
    <label class="row"><input type="checkbox" id="g-autoupgrade" ${S.data.prefs.autoInstallModels === true ? 'checked' : ''}> <span><b>Install better models and stacks automatically</b> <span class="help">Quicksilver checks online every day for newer, stronger models that run well on this PC, installs them in the background and switches your stacks and chats over (you can remove the old ones). Off (the default): it tells you, and you choose what to download.</span></span></label>
    <label class="row"><input type="checkbox" id="g-tips" ${S.data.prefs.tips !== false ? 'checked' : ''}> <span><b>Show tips for getting more out of Quicksilver</b> <span class="help">now and then, under an answer from the built-in model: a short tip matched to what you asked (a coding stack, upgrades, the Library…)</span></span></label>
    ${S.providers.length ? `<label class="row"><input type="checkbox" id="g-cloudhard" ${S.data.prefs.cloudHard ? 'checked' : ''}> <span><b>Use my cloud AI for hard questions</b> <span class="help">${esc(S.providers.map((x) => x.name).join(', '))}: stronger on hard questions; uses your API credits</span></span></label>` : ''}
    <div class="field"><label for="g-name">Your name</label><input id="g-name" value="${esc(P().userName)}" placeholder="Optional"></div>
    <div class="field"><label for="g-about">About you</label><span class="help">Optional. Shared with your assistants so answers fit you (for example your role, company or preferences).</span><textarea id="g-about" rows="3">${esc(P().about)}</textarea></div>
    <div class="field"><label>Appearance</label><div class="row">${[['dark', 'Dark'], ['light', 'Light'], ['system', 'Match Windows']].map(([k, l]) => `<button class="btn small ${(P().theme || 'dark') === k ? 'on' : ''}" data-theme-set="${k}">${l}</button>`).join('')}</div></div>
    <div class="field"><label>Text size</label><div class="row">${[['normal', 'Normal'], ['large', 'Large'], ['xl', 'Extra large']].map(([k, l]) => `<button class="btn small ${P().textSize === k ? 'on' : ''}" data-textsize="${k}">${l}</button>`).join('')}</div></div>
    <div><button class="btn primary" id="g-save">Save</button></div>
    ${parentalLockHTML()}
    <div id="vpn-box">${vpnCardHTML()}</div>
    <div class="card set-card" style="margin-top:16px"><h3>🗑 Chats</h3>
      <p class="help" style="margin-top:0">Delete a single chat with the bin icon next to it in the sidebar, or from the ⋯ menu. This removes every chat at once; pinned chats are kept.</p>
      <button class="btn danger" id="del-all-chats">Delete all chats</button></div>
    ${importHTML()}
  </div>`;
}
// Parental lock: a PIN that gates uncensored AI (see lock.js).
function parentalLockHTML() {
  const on = Boolean(S.data.prefs.parentalLock?.hash);
  return `<div class="card set-card" id="pl-box" style="margin-top:16px"><h3>🔒 Parental lock</h3>
    <p class="help" style="margin-top:0">Lock uncensored AI (community "unfiltered" models and teams that answer mature content with few refusals) behind a PIN. Everything else stays open. The PIN is stored only as a scrambled hash, and it's needed again each time Quicksilver reopens.</p>
    ${on ? `<p class="small"><b style="color:var(--ok,#2fa36b)">On.</b> Uncensored models and teams ask for the PIN before they can be used.</p>
      <div class="row"><button class="btn" id="pl-lock">Lock now</button><button class="btn" id="pl-change">Change PIN</button><button class="btn danger" id="pl-remove">Turn off</button></div>`
    : `<div class="field" style="max-width:260px"><label for="pl-pin">Set a PIN (4+ digits)</label><input id="pl-pin" type="password" inputmode="numeric" autocomplete="off" placeholder="New PIN"></div>
      <div class="field" style="max-width:260px"><label for="pl-pin2">Confirm PIN</label><input id="pl-pin2" type="password" inputmode="numeric" autocomplete="off" placeholder="Repeat it"></div>
      <div class="small" id="pl-err" style="color:var(--danger);min-height:18px"></div>
      <button class="btn primary" id="pl-set">Turn on parental lock</button>`}</div>`;
}
function bindParentalLock() {
  const repaint = () => { const box = $('#pl-box'); if (box) { box.innerHTML = parentalLockHTML(); bindParentalLock(); } else render(); };
  $('#pl-set')?.addEventListener('click', async () => {
    const pin = $('#pl-pin').value.trim(); const pin2 = $('#pl-pin2').value.trim();
    const err = $('#pl-err');
    if (!/^\d{4,}$/.test(pin)) { err.textContent = 'Use at least 4 digits.'; return; }
    if (pin !== pin2) { err.textContent = 'The two PINs do not match.'; return; }
    await setLockPin(pin); toast('Parental lock is on. Uncensored AI now needs this PIN.'); repaint();
  });
  $('#pl-remove')?.addEventListener('click', async () => {
    const pin = await askUnlock();
    if (pin) { await clearLockPin(); toast('Parental lock turned off.'); repaint(); }
  });
  $('#pl-lock')?.addEventListener('click', () => { relock(); toast('Locked. Uncensored AI will ask for the PIN.'); });
  $('#pl-change')?.addEventListener('click', async () => {
    if (!(await askUnlock())) return;
    await clearLockPin();
    toast('Enter a new PIN.'); repaint();
  });
}
const memSetHTML = () => `<p class="lede" style="margin-top:0">What your assistants remember about you, across all chats. Click a line to change it.</p><div id="mem-box">${memoryManagerHTML()}</div>`;
function bindMemSet() { const box = $('#mem-box'); const repaint = () => { box.innerHTML = memoryManagerHTML(); bindMemoryManager(box, repaint); }; bindMemoryManager(box, repaint); }
function bindGeneral() {
  bindVpnCard();
  $$('[data-simple]').forEach((b) => b.addEventListener('click', () => { P().simple = b.dataset.simple === 'true'; applyPrefs(); save(); render(); }));
  $('#g-auto').addEventListener('change', (e) => { P().autoRoute = e.target.checked; save(); });
  $('#g-autoweb').addEventListener('change', (e) => { P().autoWeb = e.target.checked; save(); });
  $('#g-autofix').addEventListener('change', (e) => { P().autoFix = e.target.checked; save(); });
  $('#g-human')?.addEventListener('change', (e) => { P().humanWriting = e.target.checked; save(); });
  $('#g-autoupgrade')?.addEventListener('change', (e) => { P().autoInstallModels = e.target.checked; save(); });
  $('#g-tips')?.addEventListener('change', (e) => { P().tips = e.target.checked; save(); });
  $('#g-cloudhard')?.addEventListener('change', (e) => { P().cloudHard = e.target.checked; save(); });
  bindParentalLock();
  $('#del-all-chats')?.addEventListener('click', async () => {
    const gone = S.data.chats.filter((c) => !c.pinned && c.id !== pending?.chatId);
    if (!gone.length) { toast('No chats to delete (pinned chats are kept).'); return; }
    if (!(await confirmBox(`Delete ${gone.length} chat${gone.length > 1 ? 's' : ''}? Pinned chats are kept. This can't be undone.`, { yes: 'Delete' }))) return;
    const ids = new Set(gone.map((c) => c.id));
    S.data.chats = S.data.chats.filter((c) => !ids.has(c.id));
    S.data.prefs.tabs = (S.data.prefs.tabs || []).filter((id) => !ids.has(id));
    save(); renderChatList(); toast(`Deleted ${gone.length} chat${gone.length > 1 ? 's' : ''}.`);
  });
  bindUpdateBox();
  bindImport();
  $$('[data-theme-set]').forEach((b) => b.addEventListener('click', () => { P().theme = b.dataset.themeSet; applyPrefs(); save(); render(); }));
  $$('[data-textsize]').forEach((b) => b.addEventListener('click', () => { P().textSize = b.dataset.textsize; applyPrefs(); save(); render(); }));
  $('#g-save').addEventListener('click', () => { P().userName = $('#g-name').value.trim(); P().about = $('#g-about').value.trim(); save(); toast('Saved.'); });
}

function chatSetHTML() {
  const p = P();
  return `<div class="stack-v">
    <div class="field"><label for="c-default">Default model or team</label><select id="c-default">${targetOptions(p.defaultTarget, { includeNone: true, noneLabel: 'Automatic' })}</select></div>
    <label class="row"><input type="checkbox" id="c-auto" ${p.autoAddFound !== false ? 'checked' : ''}> <span><b>📦 Add models from other apps automatically</b> <span class="help">LM Create, Jan, Ollama, GPT4All and Downloads, checked each time Quicksilver starts. Files stay where they are.</span></span></label>
    <label class="row"><input type="checkbox" id="c-preload" ${p.preloadDefault !== false ? 'checked' : ''}> <span><b>⚡ Load my default model when Quicksilver starts</b> <span class="help">the first reply is much quicker; the model waits in memory in the background</span></span></label>
    <div class="field"><label for="c-effort">Default effort</label><span class="help">Instant uses one model and answers fastest. Auto (recommended) brings in the team only for hard questions. Council has three AIs look at every question and agree an answer (slower, for big decisions).</span><select id="c-effort">${Object.entries(EFFORTS).map(([k, l]) => `<option value="${k}" ${k === (p.effortLevel || 'thorough') ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <label class="row"><input type="checkbox" id="c-fact" ${p.factCheck ? 'checked' : ''}> <span><b>✅ Double-check every answer</b> <span class="help">in all chats (you can still turn it off per chat)</span></span></label>
    <div class="field"><label for="c-checker">Double-checker</label><span class="help">Automatic picks the strongest model that didn't write the answer, so the check is independent.</span><select id="c-checker">${targetOptions(p.factChecker, { includeNone: true, noneLabel: 'Automatic (recommended)' })}</select></div>
    <div class="field"><label for="c-src">Sources per answer</label><span class="help">How many passages from your knowledge and live sources each answer can use. More sources = better grounding, but longer prompts.</span><select id="c-src">${[4, 8, 12, 16, 20, 30].map((n) => `<option ${Number(p.sourcesPerAnswer || 8) === n ? 'selected' : ''}>${n}</option>`).join('')}</select></div>
    <div class="field"><label for="c-temp">Creativity: <span id="c-temp-v">${p.temperature}</span></label><span class="help">Used when an assistant doesn't set its own.</span><input id="c-temp" type="range" min="0" max="1.2" step="0.05" value="${p.temperature}"></div>
    <div class="grid2">
      <div class="field"><label for="c-ctx">Conversation memory (tokens)</label><select id="c-ctx">${[4096, 8192, 16384, 32768, 65536, 131072].map((n) => `<option value="${n}" ${Number(p.contextSize) === n ? 'selected' : ''}>${n.toLocaleString()}</option>`).join('')}</select><span class="help">How much text a model can consider at once. Bigger handles longer documents but uses more memory.</span></div>
      <div class="field"><label for="c-max">Longest answer (tokens)</label><input id="c-max" type="number" min="256" max="65536" step="256" value="${p.maxTokens}"></div>
    </div>
    <div class="field"><label for="c-gpu">Graphics card use</label><select id="c-gpu"><option value="auto" ${p.gpu !== 0 ? 'selected' : ''}>Automatic (recommended)</option><option value="0" ${p.gpu === 0 ? 'selected' : ''}>Processor only (most compatible)</option></select><span class="help">Choose "Processor only" if models fail to load or crash on your graphics card.</span></div>
    <div><button class="btn primary" id="c-save">Save</button></div>
  </div>`;
}
function bindChatSet() {
  $('#c-temp').addEventListener('input', (e) => { $('#c-temp-v').textContent = e.target.value; });
  $('#c-save').addEventListener('click', () => {
    Object.assign(P(), {
      defaultTarget: $('#c-default').value, autoAddFound: $('#c-auto').checked, preloadDefault: $('#c-preload').checked, effortLevel: $('#c-effort').value, factCheck: $('#c-fact').checked, factChecker: $('#c-checker').value,
      temperature: Number($('#c-temp').value), contextSize: Number($('#c-ctx').value), maxTokens: Math.max(256, Number($('#c-max').value) || 2048), maxTokensSet: true,
      gpu: $('#c-gpu').value === '0' ? 0 : 'auto', sourcesPerAnswer: Number($('#c-src').value),
    });
    save(); toast('Saved.');
  });
}

function webHTML() {
  const w = S.config.web;
  return `<div class="stack-v">
    <p class="muted">Web search lets assistants look things up and cite current sources. Pick a service; Brave and Tavily have free tiers.</p>
    <div class="field"><label for="w-prov">Search service</label><select id="w-prov">${[['free', 'Free, no key needed (DuckDuckGo, with Mojeek as backup)'], ['none', 'Off'], ['brave', 'Brave Search (free tier, key)'], ['tavily', 'Tavily (free tier, key; built for AI)'], ['searxng', 'SearXNG (your own server, no key)']].map(([k, l]) => `<option value="${k}" ${w.provider === k ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    <div class="field" data-w="brave"><label for="w-brave">Brave Search key</label><span class="help">${S.config.secrets['web:brave'] ? 'A key is saved.' : 'Get one at <a href="https://api-dashboard.search.brave.com">api-dashboard.search.brave.com</a>.'}</span><input id="w-brave" type="password" placeholder="Paste key"></div>
    <div class="field" data-w="tavily"><label for="w-tavily">Tavily key</label><span class="help">${S.config.secrets['web:tavily'] ? 'A key is saved.' : 'Get one at <a href="https://app.tavily.com">app.tavily.com</a>.'}</span><input id="w-tavily" type="password" placeholder="Paste key"></div>
    <div class="field" data-w="searxng"><label for="w-sx">SearXNG address</label><input id="w-sx" value="${esc(w.searxngUrl)}" placeholder="http://localhost:8888"></div>
    <div class="row"><button class="btn primary" id="w-save">Save</button><button class="btn" id="w-test">Test a search</button></div>
  </div>`;
}
function bindWeb() {
  const sync = () => $$('[data-w]').forEach((el) => { el.hidden = el.dataset.w !== $('#w-prov').value; });
  sync();
  $('#w-prov').addEventListener('change', sync);
  const saveWeb = async () => {
    if ($('#w-brave').value) await call('secret:set', 'web:brave', $('#w-brave').value.trim());
    if ($('#w-tavily').value) await call('secret:set', 'web:tavily', $('#w-tavily').value.trim());
    S.config = await call('config:set', { web: { provider: $('#w-prov').value, searxngUrl: $('#w-sx').value.trim() } });
  };
  $('#w-save').addEventListener('click', async () => { await saveWeb(); toast('Saved.'); render(); });
  $('#w-test').addEventListener('click', async () => { await saveWeb(); const r = await call('web:search', 'latest news about renewable energy'); toast(`Found ${r.length} results. First: ${r[0]?.title || 'none'}`, 6000); });
}

function apiSrvHTML() {
  const a = S.config.apiServer;
  const st = S.apiStatus || {};
  const base = `http://127.0.0.1:${a.port}/v1`;
  return `<div class="stack-v">
    <p class="muted">Quicksilver can act as an <b>OpenAI-compatible API</b> on this computer, so other apps, scripts and tools (VS Code extensions, automation, your own code) can use your local models and stacks. It only listens on this PC.</p>
    <label class="row"><input type="checkbox" id="a-on" ${a.enabled ? 'checked' : ''}> <b>Turn on the API server</b></label>
    <div class="grid2"><div class="field"><label for="a-port">Port</label><input id="a-port" type="number" min="1024" max="65535" value="${a.port}"></div>
    <div class="field"><label>Status</label><div style="padding-top:8px">${st.running ? `<span class="badge b-mint">● Running at ${esc(base)}</span>` : st.error ? `<span class="badge b-pink">${esc(st.error)}</span>` : '<span class="badge b-lemon">Off</span>'}</div></div></div>
    <label class="row"><input type="checkbox" id="a-key" ${a.requireKey ? 'checked' : ''}> <span><b>Require an access key</b> <span class="help">recommended if other people use this PC</span></span></label>
    <div class="row"><button class="btn primary" id="a-save">Save</button><button class="btn" id="a-newkey">Create a new key</button><button class="btn" id="a-showkey" ${S.config.secrets.apiServerKey ? '' : 'disabled'}>Copy key</button></div>
    <div class="card"><h3>Try it</h3><p class="small muted" style="font-weight:600">Model names come from <code>${esc(base)}/models</code>: any local model, any team (by name) or any connected API model.</p>
<pre style="background:#1d1838;color:#f1eeff;padding:12px;border-radius:10px;overflow-x:auto;white-space:pre-wrap">curl ${esc(base)}/chat/completions \\
  -H "Content-Type: application/json"${a.requireKey ? ' \\\n  -H "Authorization: Bearer YOUR_KEY"' : ''} \\
  -d '{"model": "${esc(S.stacks[0]?.name || 'local:qwen3-8b')}", "messages": [{"role": "user", "content": "Hello"}], "stream": true}'</pre>
      <p class="small muted" style="font-weight:600">Also: <code>POST /v1/images/generations</code> with a local image model.</p></div>
  </div>`;
}
function bindApiSrv() {
  qs.call('apiserver:status').then((s) => { const changed = JSON.stringify(s) !== JSON.stringify(S.apiStatus); S.apiStatus = s; if (changed && setTab === 'api' && S.route.view === 'settings') render(); });
  $('#a-save').addEventListener('click', async () => {
    S.config = await call('config:set', { apiServer: { enabled: $('#a-on').checked, port: Number($('#a-port').value) || 1337, requireKey: $('#a-key').checked } });
    S.apiStatus = await qs.call('apiserver:status'); render(); toast(S.apiStatus.running ? 'API server running.' : S.apiStatus.error || 'API server off.');
  });
  $('#a-newkey').addEventListener('click', async () => { const k = await call('apiserver:newKey'); navigator.clipboard?.writeText(k); S.config = await call('config:get'); render(); toast('New key created and copied.'); });
  $('#a-showkey').addEventListener('click', async () => { navigator.clipboard?.writeText(await call('apiserver:revealKey')); toast('Key copied.'); });
}

function enginesHTML() {
  if (!engineInfo) return '<div class="empty">Checking engines…</div>';
  const block = (kind, title, about) => {
    const e = engineInfo[kind];
    return `<div class="card stack-v"><h3>${title}</h3><p class="small muted" style="font-weight:600;margin:0">${about}</p>
      <div class="field"><label for="eng-${kind}">Use</label><select id="eng-${kind}" data-eng-choice="${kind}"><option value="auto" ${e.choice === 'auto' ? 'selected' : ''}>Automatic${e.active ? ` (now: ${esc(e.active)})` : ''}</option>${e.installed.map((x) => `<option value="${esc(x.variant)}" ${e.choice === x.variant ? 'selected' : ''}>${esc(x.label)}${x.version ? ` · ${esc(x.version)}` : ''}</option>`).join('')}</select></div>
      ${e.installed.length ? '' : '<div class="notice">No engine installed. Download one below.</div>'}
      <table class="list"><tbody>${e.available.map((v) => { const have = e.installed.find((x) => x.variant === v.variant && x.source === 'downloaded'); const pr = engineProg[`${kind}-${v.variant}`]; return `<tr><td><b>${esc(v.label)}</b>${v.nvidiaOnly ? ' <span class="small muted">(NVIDIA graphics cards only)</span>' : ''}</td><td>${pr ? `<div class="bar" style="width:160px"><i style="width:${pr.total ? Math.round((pr.downloaded / pr.total) * 100) : 0}%"></i></div>` : have ? `<span class="badge b-mint">✓ ${esc(have.version || 'installed')}</span>` : e.installed.some((x) => x.variant === v.variant) ? '<span class="badge b-sky">included</span>' : ''}</td>
        <td style="text-align:right">${pr ? '' : have ? `<button class="btn small" data-eng-get="${kind}:${v.variant}">Update</button> <button class="btn small danger" data-eng-del="${kind}:${v.variant}">Remove</button>` : `<button class="btn small" data-eng-get="${kind}:${v.variant}">Download</button>`}</td></tr>`; }).join('')}</tbody></table></div>`;
  };
  return `<div class="stack-v">
    <p class="muted">Engines are the programs that run models. Quicksilver includes engines that work on most PCs; on an NVIDIA card, the CUDA engine is usually faster. Downloads come straight from the official llama.cpp and stable-diffusion.cpp releases.</p>
    ${block('llama', '💬 Text & vision engine (llama.cpp)', 'Runs chat, reasoning and vision models.')}
    ${block('sd', '🎨 Image & video engine (stable-diffusion.cpp)', 'Runs image and video generation and AI photo editing.')}
  </div>`;
}
function bindEngines() {
  if (!engineInfo) { qs.call('engines:list').then((e) => { engineInfo = e; if (setTab === 'engines') render(); }); return; }
  $$('[data-eng-choice]').forEach((s) => s.addEventListener('change', async () => {
    S.config = await call('config:set', { engine: { ...S.config.engine, [s.dataset.engChoice]: s.value } });
    engineInfo = await qs.call('engines:list'); render(); toast('Engine choice saved.');
  }));
  $$('[data-eng-get]').forEach((b) => b.addEventListener('click', async () => {
    const [kind, variant] = b.dataset.engGet.split(':');
    engineProg[`${kind}-${variant}`] = { downloaded: 0, total: 0 }; render();
    try { const r = await call('engines:install', kind, variant); toast(`Engine ${r.version} installed.`); } finally { delete engineProg[`${kind}-${variant}`]; engineInfo = await qs.call('engines:list'); render(); }
  }));
  $$('[data-eng-del]').forEach((b) => b.addEventListener('click', async () => { const [kind, variant] = b.dataset.engDel.split(':'); await call('engines:remove', kind, variant); engineInfo = await qs.call('engines:list'); render(); }));
}
qs.onEngine((p) => { engineProg[`${p.kind}-${p.variant}`] = p; if (setTab === 'engines' && S.route.view === 'settings') { const bars = $$('.bar i'); if (bars.length) render(); } });

function accountsHTML() {
  return `<div class="stack-v">
    <div class="field"><label for="hf-token">Hugging Face token (optional)</label><span class="help">Only needed for models that require accepting a license on huggingface.co (some Llama, Gemma and FLUX models). ${S.config.secrets.huggingface ? '<b>A token is saved.</b>' : 'Create a read token at <a href="https://huggingface.co/settings/tokens">huggingface.co/settings/tokens</a>.'}</span><input id="hf-token" type="password" placeholder="hf_…"></div>
    <div class="row"><button class="btn primary" id="hf-save">Save</button>${S.config.secrets.huggingface ? '<button class="btn danger" id="hf-del">Remove token</button>' : ''}</div>
    <p class="muted">Cloud AI keys (Claude, OpenAI, Gemini and others) are managed under <a href="#" id="to-apis">Models → Connect an API</a>.</p>
  </div>`;
}
function bindAccounts() {
  $('#hf-save').addEventListener('click', async () => { await call('secret:set', 'huggingface', $('#hf-token').value.trim()); S.config = await call('config:get'); render(); toast('Saved.'); });
  $('#hf-del')?.addEventListener('click', async () => { await call('secret:set', 'huggingface', ''); S.config = await call('config:get'); render(); });
  $('#to-apis').addEventListener('click', (e) => { e.preventDefault(); modelsTab = 'api'; go({ view: 'models' }); });
}
