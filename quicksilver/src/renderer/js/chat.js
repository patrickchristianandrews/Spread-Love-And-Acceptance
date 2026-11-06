// Chat: assistants, any model or stack, photos/video/documents, library and web sources.
'use strict';

let pending = null;          // { requestId, chatId, msgId }
const drafts = {};           // chatId -> attachments waiting to be sent
let paintQueued = false;

function newChat(assistantId) {
  const a = assistantById(assistantId || S.data.prefs.lastAssistant);
  const chat = { id: uid(), assistantId: a.id, title: 'New chat', created: now(), updated: now(), target: '', library: null, web: null, messages: [] };
  S.data.chats.push(chat);
  S.data.prefs.lastAssistant = a.id;
  save();
  go({ view: 'chat', id: chat.id });
}

const EFFORTS = { quick: '⚡ Quick', balanced: '⚖️ Balanced', thorough: '🔬 Thorough', max: '🚀 Max' };
const effortOf = (chat, a) => chat.effort || a.effort || S.data.prefs.effortLevel || 'thorough';

const msgText = (m) => (m.role === 'assistant' ? m.alts[m.altIndex]?.text || '' : m.text || '');

views.chat = {
  html() {
    let chat = chatById(S.route.id);
    if (!chat) {
      chat = [...S.data.chats].sort((a, b) => b.updated - a.updated)[0];
      if (!chat) { setTimeout(() => newChat(), 0); return '<div class="page"></div>'; }
      S.route.id = chat.id;
    }
    const a = assistantById(chat.assistantId);
    const target = resolveTarget(chat, a);
    const lib = chat.library ?? a.library;
    const web = chat.web ?? a.web;
    const fact = factOn(chat, a);
    const tools = toolsOn(chat, a);
    const chip = (id, ic, label, on, title) => `<button class="chip-tog ${on ? 'on' : ''}" id="${id}" aria-pressed="${on}" title="${title}">${icon(ic, 16)}<span>${label}</span>${on ? icon('check', 14) : ''}</button>`;
    return `<div class="chat">
      <header class="chat-top">
        <div class="pickers">
          <label class="pill-select" title="Assistant"><span class="pill-emoji">${esc(a.emoji)}</span><select id="pick-assistant" aria-label="Assistant">${S.data.assistants.map((x) => `<option value="${x.id}" ${x.id === a.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>${icon('chevron', 16)}</label>
          <label class="pill-select" title="Model or stack">${icon(target.startsWith('stack:') ? 'layers' : 'cpu', 16)}<select id="pick-model" aria-label="Model or stack">${S.targets.length ? targetOptions(target) : '<option value="">No models yet</option>'}<option value="__infuse">✨ Infuse several AIs…</option><option value="__get">＋ Get more models…</option></select>${icon('chevron', 16)}</label>
          <button class="net-pill ${S.config?.offline ? 'off' : ''}" id="net-pill" role="switch" aria-checked="${!S.config?.offline}" title="${S.config?.offline ? 'Offline: nothing leaves this PC. Click to go online.' : 'Online: web search, cloud AIs and downloads are available. Click to go offline.'}"><span class="net-dot"></span><span>${S.config?.offline ? 'Offline' : 'Online'}</span><span class="net-sw"><i></i></span></button>
        </div>
        <div class="chat-title" title="${esc(chat.title)}">${chat.messages.length && chat.title !== 'New chat' ? esc(chat.title) : ''}</div>
        <button class="icon-btn" id="chat-more" title="Pin, rename, export or delete this chat" aria-label="More options">${icon('more')}</button>
      </header>
      <div class="chat-body" id="chat-body"><div class="chat-col">
      <div class="messages" id="messages"><div class="messages-inner">${chat.messages.length ? chat.messages.map((m, i) => messageHTML(chat, a, m, i)).join('') : welcomeHTML(a)}</div></div>
      <div class="composer" id="composer">
        <div class="composer-card">
          <div class="attach-row" id="att-row">${attachmentsHTML(drafts[chat.id] || [], true)}</div>
          <div id="skill-row">${skillChipHTML(chat)}</div>
          <div class="skill-pop" id="skill-pop" hidden></div>
          <textarea id="input" rows="1" placeholder="${esc(chat.pendingSkill ? skillById(chat.pendingSkill)?.hint || 'Add details…' : `Message ${a.name}…  Type / for skills`)}" aria-label="Message"></textarea>
          <div class="composer-bar">
            <button class="icon-btn" id="skill-btn" title="Use a skill (or type /)" aria-label="Skills">${icon('zap')}</button>
            <label class="icon-btn" title="Attach photos, videos or documents" aria-label="Attach">${icon('clip')}<input type="file" id="file-in" multiple hidden accept="image/*,video/*,.pdf,.docx,.xlsx,.xlsm,.csv,.tsv,.pptx,.txt,.md,.json,.html,.htm,.xml,.js,.ts,.py,.java,.c,.cpp,.cs,.go,.rs,.rb,.php,.sql"></label>
            <span class="bar-sep"></span>
            ${chip('tog-lib', 'book', 'Knowledge', lib, 'Search your knowledge bases and cite them')}
            ${S.config?.offline ? `<span class="chip-tog" title="Offline: switch to Online in the sidebar to search the web" style="opacity:.5">${icon('globe', 16)}<span>Web (offline)</span></span>` : chip('tog-web', 'globe', 'Web', web, 'Search the web and cite sources')}
            ${chip('tog-tools', 'plug', 'Tools', tools, 'Let the AI use your integrations (GitHub, Slack, MCP servers…)')}
            ${chip('tog-fact', 'shield', 'Fact check', fact, 'After each answer, a second model checks it claim by claim')}
            <label class="pill-select small" title="Effort: quicker or more thorough">${icon('gauge', 16)}<select id="pick-effort" aria-label="Effort">${Object.entries(EFFORTS).map(([k, e]) => `<option value="${k}" ${k === effortOf(chat, a) ? 'selected' : ''}>${e.replace(/^\S+\s/, '')}</option>`).join('')}</select>${icon('chevron', 14)}</label>
            <span class="grow"></span>
            <button class="send-btn ${pending?.chatId === chat.id ? 'stop' : ''}" id="send" title="${pending?.chatId === chat.id ? 'Stop' : 'Send (Enter)'}" aria-label="${pending?.chatId === chat.id ? 'Stop' : 'Send'}">${icon(pending?.chatId === chat.id ? 'stop' : 'send', 20)}</button>
          </div>
        </div>
        <div class="composer-hint">Runs on ${esc(targetLabel(target))}${chatEtaHint(target, a)} · Drop or paste photos, video, PDF, Word, Excel or PowerPoint</div>
      </div>
      </div>${factPanelHTML(chat)}</div>
    </div>`;
  },
  bind: bindChat,
};

// "⏱ ~6 s per answer (hard questions ~20 s)", for the model or stack this chat runs on.
function chatEtaHint(target, a) {
  const words = wordsForJob(a.job);
  const easy = etaFor(target, words);
  if (easy == null) return '';
  const hard = etaFor(target, Math.max(words, WORDS.hard), { hard: true });
  const st = starsOf(target, a.job || 'general');
  return ` · ⏱ ${etaLabel(easy)} per answer${hard != null && hard > easy * 1.4 ? ` (hard questions ${etaLabel(hard)})` : ''}${st != null ? ` · ${starText(st)} expected quality` : ''}`;
}

function welcomeHTML(a) {
  const none = !S.targets.length;
  return `<div class="welcome">
    <div class="emoji-badge" style="width:72px;height:72px;font-size:2.4rem;margin:0 auto 12px;border-radius:20px">${esc(a.emoji)}</div>
    <h1>${esc(a.name)}</h1>
    <p class="muted" style="font-size:1.05rem;font-weight:600">${esc(a.description || '')}</p>
    ${none ? `<div class="notice info" style="text-align:left;margin-top:16px"><b>Let's get you set up.</b> Quicksilver runs AI on your own PC. The <b>Stack Advisor</b> checks your computer and downloads the best free models for the job, in one click. No account or key needed.
      <div class="row" style="margin-top:10px"><button class="btn primary" data-goto="stacks">Open the Stack Advisor</button><button class="btn" data-goto="models">Browse models</button></div></div>` : ''}
    ${S.installed.some((m) => m.kind === 'text') && S.installed.filter((m) => m.kind === 'text').every((m) => m.source === 'bundled') ? '<p class="small muted grow-tip">💡 The starter models are a great start but limited on their own. Answers get sharper as you add models or build stacks (<a href="#" data-goto="stacks">Stacks</a> · <a href="#" data-goto="models">Models</a>).</p>' : ''}
  </div>`;
}

function attachmentsHTML(list, removable) {
  return list.map((att, i) => {
    const icon = { spreadsheet: '📊', code: '💻', document: '📄' }[att.kind] || '📄';
    const thumb = att.type === 'image' ? `<img src="${att.dataUrl}" alt="">` : att.type === 'video' ? `<img src="${att.frames?.[0]?.dataUrl || ''}" alt="">` : `<span class="thumb">${att.type === 'audio' ? '🎵' : icon}</span>`;
    const sub = att.type === 'video' ? `${att.frames.length} frames · ${att.duration.toFixed(1)} s` : att.type === 'doc' ? `${att.kind} · ${Math.round(att.text.length / 1000)}k chars` : att.type === 'audio' ? 'sound' : 'photo';
    return `<div class="attach" title="${esc(att.name)}">${thumb}<span class="grow"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(att.name)}</div><div class="small muted">${esc(sub)}</div></span>${removable ? `<button class="x" data-unattach="${i}" title="Remove">✕</button>` : ''}</div>`;
  }).join('');
}

function stepsHTML(alt, streaming) {
  if (!alt.steps?.length) return '';
  const roleBadge = { vision: '<span class="badge b-sky">👁 Sees</span>', draft: '<span class="badge b-lav">✏️ Drafts</span>', critique: '<span class="badge b-peach">⚔️ Debates</span>', tools: '<span class="badge b-lemon">🔌 Tools</span>', lead: '<span class="badge b-mint">★ Lead</span>' };
  return `<details class="steps" ${streaming ? 'open' : ''}><summary>🧩 How this answer was made: ${alt.steps.length} step${alt.steps.length > 1 ? 's' : ''}</summary>
    ${alt.steps.map((s) => `<div class="step">${roleBadge[s.role] || ''}<div class="grow"><b>${esc(s.label)}</b> <span class="muted small">· ${esc(s.model)}${s.ms ? ` · ${fmtSec(s.ms / 1000)}` : ''}${s.done ? '' : ' · working…'}</span>${s.error ? `<div class="small" style="color:var(--danger);font-weight:700">${esc(s.error)}</div>` : ''}
      ${s.role !== 'lead' && s.text ? `<details><summary class="small">Show</summary><pre>${esc(s.text)}</pre></details>` : ''}</div></div>`).join('')}
  </details>`;
}

function messageHTML(chat, a, m, i) {
  if (m.role === 'user') {
    return `<div class="msg user" data-msg="${m.id}">
      <div class="who-line">${esc(S.data.prefs.userName || 'You')}</div>
      ${m.attachments?.length ? `<div class="attach-row" style="justify-content:flex-end">${attachmentsHTML(m.attachments, false)}</div>` : ''}
      ${m.text ? `<div class="bubble">${esc(m.text)}</div>` : ''}
      <div class="msg-tools">${pending ? '' : `<button class="tool" data-act="edit" data-id="${m.id}">Edit</button><button class="tool" data-act="del" data-id="${m.id}">Delete</button>`}</div>
    </div>`;
  }
  const alt = m.alts[m.altIndex] || {};
  const streaming = pending?.msgId === m.id;
  const isLast = i === chat.messages.length - 1;
  const left = streaming && alt.eta ? alt.eta.sec - (Date.now() - alt.eta.start) / 1000 : null;
  const etaNow = left == null ? '' : `<span class="badge b-lav eta live" title="Estimated on this PC">⏱ ${left > 2 ? `~${fmtSec(left)} left` : 'almost done'}</span>`;
  const body = alt.error ? esc(alt.error)
    : !alt.text && streaming ? `<span class="status-line">${esc(alt.status || 'Thinking…')}</span>`
    : HIDE_BLOCK.has(isMakerSkill(alt)?.output) ? (stripMediaBlock(alt.text) ? markdown(stripMediaBlock(alt.text)) : streaming ? `<span class="status-line">Writing the ${MEDIA_WORD[skillById(alt.skillId).output]} prompt…</span>` : '')
    : markdown(alt.text || '');
  const tools = [];
  if (m.alts.length > 1) tools.push(`<button class="tool" data-act="prev" data-id="${m.id}" aria-label="Previous answer">‹</button><span class="small muted">${m.altIndex + 1} / ${m.alts.length}</span><button class="tool" data-act="next" data-id="${m.id}" aria-label="Next answer">›</button>`);
  if (!pending) {
    if (isLast) tools.push(`<button class="tool" data-act="regen" data-id="${m.id}" title="Write a new answer">${icon('refresh', 15)} Regenerate</button><button class="tool" data-act="continue" data-id="${m.id}">Continue</button>`);
    if (alt.text && !alt.check && !checkRunning(m)) tools.push(`<button class="tool" data-act="check" data-id="${m.id}">${icon('shield', 15)} Fact check</button>`);
    tools.push(`<button class="tool" data-act="copy" data-id="${m.id}">${icon('copy', 15)} Copy</button><button class="tool" data-act="saveas" data-id="${m.id}">${icon('download', 15)} Save as…</button><button class="tool" data-act="del" data-id="${m.id}" title="Delete">${icon('trash', 15)}</button>`);
  }
  return `<div class="msg assistant" data-msg="${m.id}">
    <div class="who-line"><span>${esc(a.emoji)} ${esc(a.name)}</span>${etaNow}${alt.skillId && skillById(alt.skillId) ? `<span class="badge b-peach">⚡ ${esc(skillById(alt.skillId).name)}</span>` : ''}${alt.target ? `<span class="badge b-lav">${esc(targetLabel(alt.target))}</span>` : ''}${alt.stats?.tps ? `<span class="badge b-mint">${Math.round(alt.stats.tps * 0.75)} words/s</span>` : ''}</div>
    ${stepsHTML(alt, streaming)}
    ${toolsHTML(alt)}
    ${alt.reasoning ? `<details class="think"><summary>💭 Thinking${streaming && !alt.text ? '…' : ''}</summary><div>${esc(alt.reasoning)}</div></details>` : ''}
    <div class="bubble md ${streaming ? 'streaming' : ''} ${alt.error ? 'error' : ''}">${body}</div>
    ${downloadHTML(m, alt, streaming)}
    ${appButtonsHTML(m, alt, streaming)}
    ${skillMediaHTML(m, alt, streaming)}
    ${checkHTML(m, alt)}
    ${alt.sources?.length ? `<div class="sources card" style="padding:10px 12px"><b class="small">Sources</b>${alt.sources.map((s, k) => `<div class="src"><span class="cite">${k + 1}</span>${s.url ? `<a href="${esc(s.url)}">${esc(s.title || s.url)}</a>` : `<span>📄 ${esc(s.title)}</span>`}</div>`).join('')}</div>` : ''}
    <div class="msg-tools">${tools.join('')}</div>
  </div>`;
}

function scrollDown(force) {
  const box = $('#messages');
  if (!box) return;
  if (force || box.scrollHeight - box.scrollTop - box.clientHeight < 120) box.scrollTop = box.scrollHeight;
}

function bindChat() {
  const chat = chatById(S.route.id);
  if (!chat) return;
  const a = assistantById(chat.assistantId);
  const input = $('#input');
  input.value = chat.draft || '';
  const grow = () => { input.style.height = 'auto'; input.style.height = `${Math.min(input.scrollHeight, 260)}px`; };
  grow();
  const pop = $('#skill-pop');
  const openPop = (filter) => { pop.innerHTML = skillPickerHTML(filter); pop.hidden = false; };
  const closePop = () => { pop.hidden = true; };
  const pickSkill = (id) => {
    chat.pendingSkill = id;
    if (/^\/\S*$/.test(input.value)) input.value = '';
    chat.draft = input.value; chat.suggested = null; closePop(); save();
    $('#skill-row').innerHTML = skillChipHTML(chat);
    input.placeholder = skillById(id)?.hint || 'Add details…';
    input.focus();
  };
  let suggestTimer = null;
  input.addEventListener('input', () => {
    chat.draft = input.value; grow(); save();
    const m = input.value.match(/^\/(\S*)$/);
    if (m) openPop(m[1]); else closePop();
    clearTimeout(suggestTimer);
    suggestTimer = setTimeout(() => {
      const sug = !chat.pendingSkill && !m ? suggestSkill(input.value) : null;
      const row = $('#skill-row');
      if (row && (sug?.id || null) !== (chat.suggested || null)) { chat.suggested = sug?.id || null; row.innerHTML = skillChipHTML(chat); }
    }, 350);
  });
  input.addEventListener('keydown', (e) => {
    if (!pop.hidden && (e.key === 'Enter' || e.key === 'Tab')) { const hot = pop.querySelector('.hot'); if (hot) { e.preventDefault(); pickSkill(hot.dataset.pickSkill); return; } }
    if (!pop.hidden && (e.key === 'ArrowDown' || e.key === 'ArrowUp')) {
      e.preventDefault();
      const opts = [...pop.querySelectorAll('.skill-opt')];
      const i = opts.findIndex((o) => o.classList.contains('hot'));
      opts[i]?.classList.remove('hot');
      const next = opts[(i + (e.key === 'ArrowDown' ? 1 : -1) + opts.length) % opts.length];
      next?.classList.add('hot'); next?.scrollIntoView({ block: 'nearest' });
      return;
    }
    if (e.key === 'Escape' && !pop.hidden) { closePop(); return; }
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendOrStop(); }
  });
  pop.addEventListener('click', (e) => { const b = e.target.closest('[data-pick-skill]'); if (b) pickSkill(b.dataset.pickSkill); });
  $('#skill-btn').addEventListener('click', () => { if (pop.hidden) { openPop(''); input.focus(); } else closePop(); });
  $('#skill-row').addEventListener('click', (e) => {
    if (e.target.closest('[data-skill-clear]')) { chat.pendingSkill = null; save(); $('#skill-row').innerHTML = skillChipHTML(chat); input.placeholder = `Message ${a.name}… (type / for skills)`; }
    const use = e.target.closest('[data-skill-use]');
    if (use) pickSkill(use.dataset.skillUse);
    if (e.target.closest('[data-skill-dismiss]')) { chat.suggested = null; chat.dismissed = [...(chat.dismissed || []), use?.dataset.skillUse]; $('#skill-row').innerHTML = skillChipHTML(chat); }
  });
  $('#send').addEventListener('click', sendOrStop);
  $$('[data-goto]').forEach((b) => b.addEventListener('click', () => go({ view: b.dataset.goto })));
  $('#pick-assistant').addEventListener('change', (e) => { chat.assistantId = e.target.value; S.data.prefs.lastAssistant = e.target.value; save(); render(); });
  $('#pick-model').addEventListener('change', (e) => {
    if (e.target.value === '__get') { go({ view: 'stacks' }); return; }
    if (e.target.value === '__infuse') { e.target.value = resolveTarget(chat, a); infuseModal((st) => { chat.target = `stack:${st.id}`; save(); render(); }); return; }
    chat.target = e.target.value; save(); render();
  });
  $('#tog-lib').addEventListener('click', () => { chat.library = !(chat.library ?? a.library); save(); render(); });
  $('#tog-web')?.addEventListener('click', () => {
    const next = !(chat.web ?? a.web);
    if (next && S.config?.web?.provider === 'none') toast('Turn on a web search service in Settings → Web search first.');
    chat.web = next; save(); render();
  });
  $('#pick-effort').addEventListener('change', (e) => { chat.effort = e.target.value; save(); render(); });
  $('#tog-tools').addEventListener('click', () => { chat.tools = !toolsOn(chat, a); save(); render(); if (chat.tools && !S.hasIntegrations) toast('Connect GitHub, Slack, Notion, Jira, Linear or an MCP server under Integrations first.', 6000); });
  $('#tog-fact').addEventListener('click', () => { chat.factCheck = !factOn(chat, a); save(); render(); });
  $('#net-pill').addEventListener('click', toggleNet);
  $('#chat-more').addEventListener('click', (e) => { e.stopPropagation(); chatMenu(e.currentTarget, chat); });
  $('#messages').addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b) messageAction(chat, b.dataset.act, b.dataset.id, b); });
  $('#chat-body').addEventListener('click', (e) => { const b = e.target.closest('[data-fp]'); if (b) factPanelAction(chat, b.dataset.fp, b.dataset.id); });
  $('#att-row').addEventListener('click', (e) => {
    const x = e.target.closest('[data-unattach]');
    if (x) { drafts[chat.id].splice(Number(x.dataset.unattach), 1); $('#att-row').innerHTML = attachmentsHTML(drafts[chat.id], true); }
  });
  $('#file-in').addEventListener('change', (e) => { addFiles(chat, [...e.target.files]); e.target.value = ''; });
  const comp = $('#composer');
  comp.addEventListener('dragover', (e) => { e.preventDefault(); comp.classList.add('drag'); });
  comp.addEventListener('dragleave', () => comp.classList.remove('drag'));
  comp.addEventListener('drop', (e) => { e.preventDefault(); comp.classList.remove('drag'); addFiles(chat, [...e.dataTransfer.files]); });
  input.addEventListener('paste', (e) => { const files = [...e.clipboardData.files]; if (files.length) { e.preventDefault(); addFiles(chat, files); } });
  scrollDown(true);
  if (!pending) input.focus();
  warmUp(chat, a);

  function sendOrStop() {
    if (pending) { qs.abortChat(pending.requestId); return; }
    const text = input.value.trim();
    const atts = drafts[chat.id] || [];
    if (!text && !atts.length) {
      if (chat.messages.at(-1)?.role === 'user') generate(chat, null);
      return;
    }
    if (!resolveTarget(chat, a)) { toast('Get a model first: open the Stack Advisor.'); go({ view: 'stacks' }); return; }
    // An assistant can apply a skill to every message (the Image Artist paints each request).
    chat.messages.push({ id: uid(), role: 'user', text, attachments: atts, skillId: chat.pendingSkill || (skillById(a.skill) ? a.skill : undefined) });
    chat.pendingSkill = null; chat.suggested = null;
    drafts[chat.id] = [];
    if (chat.title === 'New chat') chat.title = (text || atts[0]?.name || 'New chat').replace(/\s+/g, ' ').slice(0, 60);
    chat.draft = '';
    input.value = '';
    generate(chat, null);
  }
}

// ---------- attachments ----------

function shrinkImage(src, max = 1536, quality = 0.88) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const c = document.createElement('canvas');
      c.width = Math.round(img.width * scale); c.height = Math.round(img.height * scale);
      c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
      resolve(c.toDataURL('image/jpeg', quality));
    };
    img.onerror = () => reject(new Error('That image could not be read.'));
    img.src = src;
  });
}

// Samples evenly spaced frames from a video, so any vision model can "watch" it.
function videoFrames(url, count = 8, max = 768) {
  return new Promise((resolve, reject) => {
    const v = document.createElement('video');
    v.muted = true; v.preload = 'auto'; v.src = url;
    v.onerror = () => reject(new Error('That video format could not be read. Try MP4 or WebM.'));
    v.onloadedmetadata = async () => {
      const dur = v.duration || 0;
      const n = Math.max(1, Math.min(count, Math.ceil(dur * 2)));
      const scale = Math.min(1, max / Math.max(v.videoWidth, v.videoHeight));
      const c = document.createElement('canvas');
      c.width = Math.round(v.videoWidth * scale); c.height = Math.round(v.videoHeight * scale);
      const frames = [];
      for (let k = 0; k < n; k++) {
        const t = n === 1 ? 0 : (dur * (k + 0.5)) / n;
        await new Promise((r) => { v.onseeked = r; v.currentTime = Math.min(t, Math.max(0, dur - 0.05)); });
        c.getContext('2d').drawImage(v, 0, 0, c.width, c.height);
        frames.push({ t, dataUrl: c.toDataURL('image/jpeg', 0.8) });
      }
      resolve({ duration: dur, frames });
    };
  });
}

const readDataUrl = (file) => new Promise((r, j) => { const fr = new FileReader(); fr.onload = () => r(fr.result); fr.onerror = j; fr.readAsDataURL(file); });

async function addFiles(chat, files) {
  drafts[chat.id] ||= [];
  for (const f of files) {
    try {
      if (f.type.startsWith('image/')) {
        drafts[chat.id].push({ type: 'image', name: f.name || 'pasted image', dataUrl: await shrinkImage(await readDataUrl(f)), path: qs.pathForFile(f) || undefined });
      } else if (f.type.startsWith('video/') || /\.(mp4|mov|webm|mkv|m4v)$/i.test(f.name)) {
        toast(`Reading frames from ${f.name}…`);
        const url = URL.createObjectURL(f);
        const { duration, frames } = await videoFrames(url);
        URL.revokeObjectURL(url);
        drafts[chat.id].push({ type: 'video', name: f.name, duration, frames, path: qs.pathForFile(f) || undefined });
      } else if (f.type.startsWith('audio/') || /\.(mp3|wav|m4a|aac|flac|ogg|opus|wma)$/i.test(f.name)) {
        // Sound files are kept by reference for the audio tools (master, remove vocals…).
        drafts[chat.id].push({ type: 'audio', name: f.name, path: qs.pathForFile(f) || undefined });
      } else {
        if (f.size > 100 * 1024 * 1024) throw new Error(`${f.name} is over 100 MB.`);
        const bytes = new Uint8Array(await f.arrayBuffer());
        const doc = await qs.call('docs:extract', f.name, bytes);
        drafts[chat.id].push({ type: 'doc', name: f.name, kind: doc.kind, text: doc.text });
      }
    } catch (err) { toast(err.message, 6000); }
  }
  if (S.route.view === 'chat' && S.route.id === chat.id) $('#att-row').innerHTML = attachmentsHTML(drafts[chat.id], true);
}

// ---------- building the request ----------

function userContent(m, docBudget) {
  const parts = [];
  let text = m.text || '';
  const docs = (m.attachments || []).filter((x) => x.type === 'doc');
  for (const d of docs) {
    const body = d.text.length > docBudget ? `${d.text.slice(0, docBudget)}\n[…truncated: the file is longer than fits in this model's memory. Raise the context size in Settings, or ask about a specific part.]` : d.text;
    text += `\n\n<file name="${d.name}" type="${d.kind}">\n${body}\n</file>`;
  }
  for (const snd of (m.attachments || []).filter((x) => x.type === 'audio')) text += `\n[Attached sound file: ${snd.name}]`;
  const images = (m.attachments || []).filter((x) => x.type === 'image' || x.type === 'video');
  if (!images.length) return text.trim();
  for (const att of images) {
    if (att.type === 'image') parts.push({ type: 'text', text: `Image: ${att.name}` }, { type: 'image_url', image_url: { url: att.dataUrl } });
    else {
      parts.push({ type: 'text', text: `Video: ${att.name} (${att.duration.toFixed(1)} s). Frames in order:` });
      for (const f of att.frames) parts.push({ type: 'text', text: `Frame at ${f.t.toFixed(1)} s` }, { type: 'image_url', image_url: { url: f.dataUrl } });
    }
  }
  parts.push({ type: 'text', text: text.trim() || 'Please look at the attachments above.' });
  return parts;
}

async function gatherSources(chat, a, query, force = {}) {
  const out = [];
  // A knowledge model searches its own knowledge bases (and reports them back as it answers).
  const own = resolveTarget(chat, a).startsWith('kbm:');
  if (!own && (force.knowledge || (chat.library ?? a.library)) && query) {
    try {
      const r = await qs.call('kb:search', query, Number(S.data.prefs.sourcesPerAnswer) || 8, a.knowledge || []);
      for (const x of r.results) out.push({ title: x.title, text: x.text, path: x.path, url: x.url });
      if (r.failures.length) toast(`Some sources didn't respond: ${r.failures.join('; ')}`, 6000);
    } catch (err) { toast(`Knowledge: ${err.message}`); }
  }
  if ((force.web || (chat.web ?? a.web)) && query && S.config?.web?.provider !== 'none' && !S.config?.offline) {
    try { for (const r of await qs.call('web:search', query)) out.push({ title: r.title, url: r.url, text: r.text || r.snippet }); } catch (err) { toast(`Web search: ${err.message}`, 6000); }
  }
  return out;
}

function systemPrompt(a, sources, strict) {
  const p = S.data.prefs;
  const parts = [a.instructions || 'You are a helpful assistant.'];
  parts.push(`Today is ${new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}.`);
  if (p.userName) parts.push(`The user's name is ${p.userName}.`);
  if (p.about) parts.push(`About the user: ${p.about}`);
  if (strict) parts.push('IMPORTANT: Answer ONLY from the reference material provided below. Do not use general knowledge or memory. Cite every factual statement with its source number. If the material does not contain the answer, reply that it was not found in the knowledge base, and say what kind of source would answer it.');
  if (strict && !sources.length) parts.push('No reference material matched this question.');
  if (sources.length) {
    parts.push('Reference material for this answer follows. Use it when relevant and cite it inline with its number, like [1] or [2]. If it does not answer the question, say so and answer from general knowledge, making clear which is which.');
    sources.forEach((s, k) => parts.push(`<source number="${k + 1}" title="${s.title}"${s.url ? ` url="${s.url}"` : ''}>\n${(s.text || '').slice(0, 5000)}\n</source>`));
  }
  return parts.join('\n\n');
}

async function generate(chat, rerollMsg) {
  const a = assistantById(chat.assistantId);
  const target = resolveTarget(chat, a);
  if (!target) { toast('Get a model first: open the Stack Advisor.'); return; }
  let msg = rerollMsg;
  let upTo;
  if (msg) { upTo = chat.messages.indexOf(msg); msg.alts.push({ text: '', target }); msg.altIndex = msg.alts.length - 1; }
  else { upTo = chat.messages.length; msg = { id: uid(), role: 'assistant', alts: [{ text: '', target }], altIndex: 0 }; chat.messages.push(msg); }
  const alt = msg.alts[msg.altIndex];
  alt.status = 'Getting ready…';
  {
    const ask = (msg && chat.messages.slice(0, chat.messages.indexOf(msg)).reverse().find((m) => m.role === 'user')) || [...chat.messages].reverse().find((m) => m.role === 'user');
    const hard = looksHard(ask?.text) || (effortOf(chat, a) === 'max');
    const sec = effortOf(chat, a) === 'quick' ? etaFor(target, wordsForJob(a.job)) : etaFor(target, hard ? Math.max(wordsForJob(a.job), WORDS.hard) : wordsForJob(a.job), { hard });
    alt.eta = sec == null ? null : { start: Date.now(), sec };
  }
  const requestId = uid();
  pending = { requestId, chatId: chat.id, msgId: msg.id };
  chat.updated = now();
  render();

  const p = S.data.prefs;
  const lastUser = [...chat.messages.slice(0, upTo)].reverse().find((m) => m.role === 'user');
  const skill = lastUser?.skillId ? skillById(lastUser.skillId) : null;
  if (skill) { alt.skillId = skill.id; alt.forceFact = Boolean(skill.tools?.factCheck); }
  // Tools that work straight on your files (and reading aloud) don't need a text model.
  if (skill && DIRECT_OUTPUTS.has(skill.output)) { runDirectSkill(chat, msg, alt, skill, lastUser); return; }
  const force = skill?.tools || {};
  if ((chat.library ?? a.library) || (chat.web ?? a.web) || force.web || force.knowledge) { alt.status = 'Searching sources…'; paintStreaming(chat, msg); }
  const sources = await gatherSources(chat, a, lastUser?.text || skill?.name || '', force);
  alt.sources = sources.map(({ title, url, path }) => ({ title, url, path }));
  pending.sources = sources;
  const ctx = Number(a.contextSize || p.contextSize) || 16384;
  const docBudget = Math.max(4000, Math.floor((ctx * 3 * 0.6) / Math.max(1, chat.messages.slice(0, upTo).reduce((n, m) => n + (m.attachments || []).filter((x) => x.type === 'doc').length, 0))));
  const messages = [{ role: 'system', content: systemPrompt(a, sources, Boolean(a.strict && (chat.library ?? a.library))) + (skill ? `\n\n${skillPrompt(skill)}` : '') }];
  for (const m of chat.messages.slice(0, upTo)) {
    if (m.role === 'user') messages.push({ role: 'user', content: userContent(m, docBudget) });
    else { const t = msgText(m).trim(); if (t) messages.push({ role: 'assistant', content: t }); }
  }
  if (messages.at(-1).role !== 'user') messages.push({ role: 'user', content: 'Please continue.' });
  // Photo edits: a model that can't see still writes the edit; the photo goes to the image model.
  if (skill && ['edit', 'animate'].includes(skill.output) && !S.speed?.targets?.[target]?.vision) {
    for (const msgOut of messages) if (Array.isArray(msgOut.content)) msgOut.content = [...msgOut.content.filter((x) => x.type !== 'image_url'), { type: 'text', text: '(A photo is attached for the image model to work on.)' }];
  }
  if (pending?.requestId !== requestId) return; // stopped while searching
  alt.status = 'Thinking…';
  qs.sendChat({
    requestId, target, messages,
    temperature: Number(a.temperature ?? p.temperature),
    maxTokens: Math.round(Number(a.maxTokens || p.maxTokens) * (effortOf(chat, a) === 'max' ? 1.5 : 1)),
    contextSize: ctx,
    // Writing a picture prompt or a beat pattern is quick work: one model, no debate.
    level: skill && HIDE_BLOCK.has(skill.output) ? 'quick' : effortOf(chat, a),
    tools: toolsOn(chat, a),
    gpu: p.gpu,
    effort: p.effort,
  });
}

function paintStreaming(chat, msg) {
  if (S.route.view !== 'chat' || S.route.id !== chat.id || paintQueued) return;
  paintQueued = true;
  const long = (msg.alts?.[msg.altIndex]?.text || '').length > 6000;
  (long ? (fn) => setTimeout(() => requestAnimationFrame(fn), 120) : requestAnimationFrame)(() => {
    paintQueued = false;
    const el = document.querySelector(`[data-msg="${msg.id}"]`);
    if (!el) return;
    const a = assistantById(chat.assistantId);
    const openSteps = el.querySelector('details.steps')?.open;
    const tmp = document.createElement('div');
    tmp.innerHTML = messageHTML(chat, a, msg, chat.messages.indexOf(msg));
    const fresh = tmp.firstElementChild;
    if (openSteps === false && fresh.querySelector('details.steps')) fresh.querySelector('details.steps').open = false;
    el.replaceWith(fresh);
    scrollDown(false);
  });
}

setInterval(() => {
  if (!pending || S.route.view !== 'chat' || S.route.id !== pending.chatId) return;
  const chat = chatById(pending.chatId);
  const msg = chat?.messages.find((m) => m.id === pending.msgId);
  if (msg?.alts[msg.altIndex]?.eta) paintStreaming(chat, msg);
}, 1000);

qs.onChat(({ requestId, ev }) => {
  if (!pending || pending.requestId !== requestId) return;
  const chat = chatById(pending.chatId);
  const msg = chat?.messages.find((m) => m.id === pending.msgId);
  if (!msg) return;
  const alt = msg.alts[msg.altIndex];
  switch (ev.type) {
    case 'text': alt.text += ev.text; alt.status = ''; break;
    case 'reasoning': alt.reasoning = (alt.reasoning || '') + ev.text; break;
    case 'status': alt.status = ev.text || alt.status; break;
    case 'step': {
      alt.steps ||= [];
      alt.steps[ev.step.index ?? alt.steps.length] = ev.step;
      break;
    }
    case 'tool': {
      alt.toolCalls ||= [];
      const i = alt.toolCalls.findIndex((t) => t.id === ev.call.id);
      if (i >= 0) alt.toolCalls[i] = ev.call; else alt.toolCalls.push(ev.call);
      break;
    }
    case 'approve': askToolApproval(ev); break;
    case 'sources': alt.sources = [...(alt.sources || []), ...ev.sources.map(({ title, url, path }) => ({ title, url, path }))]; pending.sources = [...(pending.sources || []), ...ev.sources]; break;
    case 'stats': alt.stats = { tps: ev.tps, tokens: ev.tokens }; if (ev.finish === 'length') toast('The answer hit the length limit. Press Continue for more.'); break;
    case 'error':
    case 'done': {
      if (ev.type === 'error') {
        if (alt.text) alt.text += `\n\n_(Stopped: ${ev.message})_`; else alt.error = ev.message;
      } else if (ev.aborted && !alt.text) {
        msg.alts.splice(msg.altIndex, 1);
        if (!msg.alts.length) chat.messages = chat.messages.filter((m) => m !== msg); else msg.altIndex = msg.alts.length - 1;
      }
      delete alt.status;
      const sourcesFull = pending.sources;
      pending = null;
      chat.updated = now();
      save();
      if (S.route.view === 'chat') render(); else renderChatList();
      const maker = isMakerSkill(alt);
      if (ev.type === 'done' && !ev.aborted && maker && MEDIA_OUTPUTS.has(maker.output)) runSkillMedia(chat, msg, alt, maker);
      else if (ev.type === 'done' && !ev.aborted && maker && AFTER_OUTPUTS.has(maker.output) && alt.text) runAfterText(chat, msg, alt, maker);
      else if (ev.type === 'done' && !ev.aborted && alt.text && !maker && (alt.forceFact || factOn(chat, assistantById(chat.assistantId)))) factCheck(chat, msg, alt, sourcesFull);
      return;
    }
    default: break;
  }
  paintStreaming(chat, msg);
});

function messageAction(chat, act, id, el) {
  const idx = chat.messages.findIndex((m) => m.id === id);
  const m = chat.messages[idx];
  if (!m) return;
  if (act.startsWith('m-')) { skillMediaAction(chat, m, act, el); return; }
  if (act.startsWith('app-')) { appAction(chat, m, act); return; }
  if (act === 'prev' || act === 'next') { if (pending) return; m.altIndex = (m.altIndex + (act === 'next' ? 1 : -1) + m.alts.length) % m.alts.length; save(); render(); }
  else if (act === 'regen') generate(chat, m);
  else if (act === 'continue') { chat.messages.push({ id: uid(), role: 'user', text: 'Continue.', attachments: [] }); generate(chat, null); }
  else if (act === 'copy') { navigator.clipboard?.writeText(msgText(m)); toast('Copied.'); }
  else if (act === 'dl') exportAnswer(chat, m, document.querySelector(`[data-act="dl"][data-id="${id}"]`)?.dataset.fmt);
  else if (act === 'saveas') saveAsMenu(chat, m, document.querySelector(`[data-act="saveas"][data-id="${id}"]`));
  else if (act === 'check' || act === 'recheck') { const alt = m.alts[m.altIndex]; delete alt.check; factPanel = { chatId: chat.id, msgId: m.id }; factCheck(chat, m, alt); }
  else if (act === 'factopen') { factPanel = factPanel?.msgId === m.id && !S.data.prefs.factPanelPinned ? null : { chatId: chat.id, msgId: m.id }; paintFactPanel(chat); paintAll(chat); }
  else if (act === 'del') confirmBox('Delete this message?').then((ok) => { if (ok) { chat.messages.splice(idx, 1); save(); render(); } });
  else if (act === 'edit') {
    const b = openModal(`<h2>Edit message</h2><textarea id="edit-text" rows="8">${esc(m.text)}</textarea>
      <div class="modal-actions"><button class="btn" data-close>Cancel</button><button class="btn" id="edit-save">Save</button><button class="btn primary" id="edit-resend">Save and ask again</button></div>`);
    const apply = () => { m.text = b.querySelector('#edit-text').value; chat.messages = chat.messages.slice(0, idx + 1); closeModal(); save(); };
    b.querySelector('#edit-save').onclick = () => { m.text = b.querySelector('#edit-text').value; closeModal(); save(); render(); };
    b.querySelector('#edit-resend').onclick = () => { apply(); generate(chat, null); };
  }
}

// Used by Studio and Library: start a chat with something attached.
function chatWithAttachment(att, text, assistantId) {
  newChat(assistantId);
  const chat = chatById(S.route.id);
  drafts[chat.id] = [att];
  chat.draft = text || '';
  render();
}

// ---------- fact checking ----------
// A second, different model checks the answer claim by claim, with the same sources and files.

const checks = new Map(); // requestId -> { chatId, msgId, alt }
const factOn = (chat, a) => effortOf(chat, a) === 'max' || Boolean(chat.factCheck ?? a.factCheck ?? S.data.prefs.factCheck);
const checkRunning = (m) => [...checks.values()].some((c) => c.msgId === m.id);

function membersOf(target) {
  if (!target.startsWith('stack:')) return [target];
  const st = S.stacks.find((x) => `stack:${x.id}` === target);
  return st ? [st.members.vision, ...(st.members.drafters || []), st.members.judge].filter(Boolean) : [];
}

// Picks the checker: your choice in Settings, else the strongest model that did NOT write the answer.
function pickChecker(answerTarget) {
  const used = new Set(membersOf(answerTarget));
  const pref = S.data.prefs.factChecker;
  if (pref && targetValid(pref) && !used.has(pref)) return pref;
  const strength = (t) => {
    if (t.target.startsWith('api:')) return 9;
    const inst = S.installed.find((m) => `local:${m.id}` === t.target);
    return S.catalog.text.find((c) => c.id === inst?.catalogId)?.judge ?? 5;
  };
  const options = S.targets.filter((t) => !t.stack && !used.has(t.target)).sort((x, y) => strength(y) - strength(x));
  if (options[0]) return options[0].target;
  const st = S.stacks.find((x) => `stack:${x.id}` === answerTarget);
  return st?.members.judge || [...used][0] || answerTarget;
}

const CHECK_PROMPT = `You are a rigorous, impartial fact-checker. Another AI wrote the answer below. Check it carefully against the sources and files provided (when given) and your own knowledge.
- Break the answer into its key factual claims: facts, numbers, calculations, dates, names, quotes, code behaviour and conclusions.
- Recompute any arithmetic and re-derive any numbers from the data yourself.
- Do not trust the answer's confidence. Do not invent facts. If something can't be verified, say so.
Reply in exactly this format:
VERDICT: Accurate | Mostly accurate | Has errors | Can't verify
CONFIDENCE: <0-100>%
### Claims
- ✅ <claim> — <why it is right>
- ⚠️ <claim> — <why it is uncertain or misleading>
- ❌ <claim> — <what is wrong, and the correct information>
### Corrections
<Only if anything is wrong: the corrected facts in a few sentences. Otherwise write "None needed.">`;

function factCheck(chat, msg, alt, sources) {
  const checker = pickChecker(alt.target || resolveTarget(chat, assistantById(chat.assistantId)));
  if (!checker) { toast('Install a second model to fact check with.'); return; }
  const idx = chat.messages.indexOf(msg);
  const q = [...chat.messages.slice(0, idx)].reverse().find((m) => m.role === 'user');
  const qText = q ? (q.text || '') : '';
  const files = (q?.attachments || []).filter((x) => x.type === 'doc').map((d) => `<file name="${d.name}">\n${d.text.slice(0, 40000)}\n</file>`).join('\n');
  const media = (q?.attachments || []).filter((x) => x.type !== 'doc').map((x) => x.name);
  const src = (sources || []).map((s, k) => `<source number="${k + 1}" title="${s.title}"${s.url ? ` url="${s.url}"` : ''}>\n${(s.text || '').slice(0, 4000)}\n</source>`).join('\n');
  const user = `## Question\n${qText || '(no text)'}\n${media.length ? `\n(The user also attached: ${media.join(', ')}. You can't see these; judge claims about them as "can't verify" unless the answer quotes them consistently.)\n` : ''}${files ? `\n## Files the user provided\n${files}\n` : ''}${src ? `\n## Sources\n${src}\n` : ''}\n## Answer to check\n${alt.text}`;
  alt.check = { target: checker, text: '', running: true };
  if (S.data.prefs.factPanelPinned || factPanel?.chatId === chat.id) factPanel = { chatId: chat.id, msgId: msg.id };
  const requestId = uid();
  checks.set(requestId, { chatId: chat.id, msgId: msg.id, alt });
  if (S.route.view === 'chat' && S.route.id === chat.id) render();
  qs.sendChat({ requestId, target: checker, messages: [{ role: 'system', content: CHECK_PROMPT }, { role: 'user', content: user }], temperature: 0.1, maxTokens: 3000, contextSize: Math.max(16384, Number(S.data.prefs.contextSize) || 16384), gpu: S.data.prefs.gpu, effort: S.data.prefs.effort });
}

function parseCheck(text) {
  const v = (text.match(/VERDICT:\s*\**\s*([^\n*]+)/i) || [])[1]?.trim() || '';
  const c = (text.match(/CONFIDENCE:\s*\**\s*(\d{1,3})/i) || [])[1];
  const body = text.replace(/^\s*\**VERDICT:.*$/im, '').replace(/^\s*\**CONFIDENCE:.*$/im, '').trim();
  const kind = /has errors|incorrect|wrong/i.test(v) ? 'pink' : /mostly/i.test(v) ? 'sky' : /accurate|correct/i.test(v) ? 'mint' : v ? 'lemon' : 'lav';
  return { verdict: v, confidence: c ? Number(c) : null, body, kind };
}

const checkCounts = (text = '') => ({ ok: (text.match(/✅/g) || []).length, warn: (text.match(/⚠️?/g) || []).length, bad: (text.match(/❌/g) || []).length });

// Under the answer: one small chip. The full check opens in the side panel.
function checkHTML(m, alt) {
  const ch = alt.check;
  if (!ch) return '';
  const p = parseCheck(ch.text || '');
  const n = checkCounts(ch.text);
  const active = factPanel?.msgId === m.id ? 'active' : '';
  let kind = p.kind, label;
  if (ch.error) { kind = 'pink'; label = 'Fact check failed'; }
  else if (ch.running) { kind = 'run'; label = `Fact checking…${n.ok + n.warn + n.bad ? ` ${n.ok + n.warn + n.bad} claims so far` : ''}`; }
  else label = `${p.verdict || 'Checked'}${p.confidence != null ? ` · ${p.confidence}%` : ''}`;
  if (ch.running && !(n.ok + n.warn + n.bad) && etaFor(ch.target, WORDS.check) != null) label += ` (${etaLabel(etaFor(ch.target, WORDS.check))})`;
  const flags = !ch.running && !ch.error ? `${n.bad ? `<span class="fc-n bad">${n.bad} ❌</span>` : ''}${n.warn ? `<span class="fc-n warn">${n.warn} ⚠️</span>` : ''}${!n.bad && !n.warn && n.ok ? `<span class="fc-n ok">${n.ok} ✅</span>` : ''}` : '';
  return `<button class="fact-chip k-${kind} ${active}" data-act="factopen" data-id="${m.id}" title="Open the fact check beside the chat">
    ${ch.running ? '<span class="fc-spin"></span>' : icon('shield', 15)}<span>${esc(label)}</span>${flags}${icon('left', 14).replace('class="ico"', 'class="ico fc-arrow"')}
  </button>`;
}

let factPanel = null; // { chatId, msgId } of the check shown beside the chat

const checkedMsgs = (chat) => chat.messages.filter((m) => m.role === 'assistant' && m.alts[m.altIndex]?.check);

function factPanelMsg(chat) {
  const list = checkedMsgs(chat);
  if (factPanel?.chatId === chat.id) { const m = list.find((x) => x.id === factPanel.msgId); if (m) return m; }
  return S.data.prefs.factPanelPinned ? list[list.length - 1] || null : null;
}

function claimsHTML(body) {
  const [claimsPart, corrPart] = body.split(/^#{1,4}\s*Corrections?\s*$/im);
  const claims = [];
  for (const line of claimsPart.split('\n')) {
    const mm = line.match(/^\s*(?:[-*]|\d+\.)\s*(✅|⚠️?|❌)\s*(.+)$/);
    if (!mm) continue;
    const [claim, ...why] = mm[2].split(/\s+[—–-]\s+/);
    claims.push({ k: mm[1] === '✅' ? 'ok' : mm[1] === '❌' ? 'bad' : 'warn', claim: claim.replace(/^["“]|["”]$/g, ''), why: why.join(' — ') });
  }
  if (!claims.length) return `<div class="md">${markdown(body)}</div>`;
  const order = { bad: 0, warn: 1, ok: 2 };
  const tag = { ok: 'Correct', warn: 'Unsure', bad: 'Wrong' };
  const corr = (corrPart || '').trim();
  return `${corr && !/^none needed\.?$/i.test(corr) ? `<div class="fp-corr"><b>${icon('edit', 15)} Corrections</b><div class="md">${markdown(corr)}</div></div>` : ''}
    <div class="fp-claims">${claims.map((c, i) => ({ ...c, i })).sort((x, y) => order[x.k] - order[y.k] || x.i - y.i).map((c) => `<div class="fp-claim ${c.k}">
      <span class="fp-tag">${tag[c.k]}</span>
      <div class="fp-c">${inlineMd(esc(c.claim))}</div>
      ${c.why ? `<div class="fp-why">${inlineMd(esc(c.why))}</div>` : ''}
    </div>`).join('')}</div>`;
}

function factPanelHTML(chat) {
  const m = factPanelMsg(chat);
  if (!m) return '';
  const ch = m.alts[m.altIndex].check;
  const p = parseCheck(ch.text || '');
  const n = checkCounts(ch.text);
  const pinned = Boolean(S.data.prefs.factPanelPinned);
  const list = checkedMsgs(chat);
  const at = list.indexOf(m);
  const q = [...chat.messages.slice(0, chat.messages.indexOf(m))].reverse().find((x) => x.role === 'user');
  const conf = p.confidence ?? null;
  return `<aside class="fact-panel" id="fact-panel" aria-label="Fact check">
    <div class="fp-head">
      <span class="fp-title">${icon('shield', 18)} Fact check</span>
      ${list.length > 1 ? `<span class="fp-nav"><button class="icon-btn sm" data-fp="prev" ${at <= 0 ? 'disabled' : ''} title="Earlier check" aria-label="Earlier check">‹</button><span class="small muted">${at + 1} / ${list.length}</span><button class="icon-btn sm" data-fp="next" ${at >= list.length - 1 ? 'disabled' : ''} title="Later check" aria-label="Later check">›</button></span>` : ''}
      <span class="grow"></span>
      <button class="icon-btn sm ${pinned ? 'on' : ''}" data-fp="pin" aria-pressed="${pinned}" title="${pinned ? 'Kept open: follows each new answer' : 'Keep open for every answer'}" aria-label="Keep open">${icon('pin', 16)}</button>
      <button class="icon-btn sm" data-fp="close" title="Close (Esc)" aria-label="Close">${icon('x', 16)}</button>
    </div>
    <div class="fp-scroll">
      ${q?.text ? `<button class="fp-q" data-fp="jump" data-id="${m.id}" title="Show this answer in the chat"><span class="small muted">Checking the answer to</span><span class="fp-qt">${esc(q.text)}</span></button>` : ''}
      ${ch.error ? `<div class="notice" style="color:var(--danger);font-weight:700">${esc(ch.error)}</div>` : `
      <div class="fp-verdict k-${ch.running && !p.verdict ? 'run' : p.kind}">
        <div class="fp-v">${ch.running && !p.verdict ? '<span class="status-line">Reading the answer…</span>' : esc(p.verdict || 'Checked')}</div>
        ${conf != null ? `<div class="fp-meter" title="${conf}% confident"><i style="width:${Math.max(0, Math.min(100, conf))}%"></i></div><div class="small">${conf}% confident</div>` : ''}
      </div>
      <div class="fp-counts"><span class="ok"><b>${n.ok}</b> correct</span><span class="warn"><b>${n.warn}</b> unsure</span><span class="bad"><b>${n.bad}</b> wrong</span></div>
      ${ch.text ? claimsHTML(p.body) : `<span class="status-line">${esc(ch.status || 'Checking each claim…')}</span>`}
      ${ch.running && ch.text ? '<span class="status-line small" style="margin-top:8px">Still checking…</span>' : ''}`}
    </div>
    <div class="fp-foot">
      <span class="small muted grow" title="A different model from the one that answered">Checked by <b>${esc(targetLabel(ch.target))}</b></span>
      ${!ch.running ? `<button class="btn small" data-fp="recheck" data-id="${m.id}">${icon('refresh', 15)} Check again</button>` : ''}
    </div>
  </aside>`;
}

function paintFactPanel(chat) {
  if (S.route.view !== 'chat' || S.route.id !== chat.id) return;
  const body = $('#chat-body');
  if (!body) return;
  const old = $('#fact-panel');
  const keep = old?.querySelector('.fp-scroll')?.scrollTop || 0;
  const html = factPanelHTML(chat);
  if (old) { if (html) { old.outerHTML = html; $('#fact-panel .fp-scroll').scrollTop = keep; } else old.remove(); }
  else if (html) body.insertAdjacentHTML('beforeend', html);
}

// Updates every chip so the "open" highlight follows the panel.
function paintAll(chat) {
  $$('.fact-chip').forEach((b) => b.classList.toggle('active', factPanel?.msgId === b.dataset.id));
}

function factPanelAction(chat, act, id) {
  const list = checkedMsgs(chat);
  const cur = factPanelMsg(chat);
  if (act === 'close') { factPanel = null; if (S.data.prefs.factPanelPinned) { S.data.prefs.factPanelPinned = false; save(); } }
  else if (act === 'pin') { S.data.prefs.factPanelPinned = !S.data.prefs.factPanelPinned; if (cur) factPanel = { chatId: chat.id, msgId: cur.id }; save(); toast(S.data.prefs.factPanelPinned ? 'Fact check stays open and follows each new answer.' : 'Fact check opens when you click a result.'); }
  else if (act === 'prev' || act === 'next') { const m = list[list.indexOf(cur) + (act === 'next' ? 1 : -1)]; if (m) { factPanel = { chatId: chat.id, msgId: m.id }; document.querySelector(`[data-msg="${m.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }
  else if (act === 'jump') { const el = document.querySelector(`[data-msg="${id}"]`); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); el?.classList.add('flash'); setTimeout(() => el?.classList.remove('flash'), 1200); return; }
  else if (act === 'recheck') { messageAction(chat, 'recheck', id); return; }
  paintFactPanel(chat);
  paintAll(chat);
}

document.addEventListener('keydown', (e) => {
  if (e.key !== 'Escape' || !$('#fact-panel') || !$('#modal').hidden || !$('#skill-pop')?.hidden) return;
  const chat = chatById(S.route.id);
  if (chat) factPanelAction(chat, 'close');
});

qs.onChat(({ requestId, ev }) => {
  const c = checks.get(requestId);
  if (!c) return;
  const chat = chatById(c.chatId);
  const msg = chat?.messages.find((m) => m.id === c.msgId);
  const ch = c.alt.check;
  if (!msg || !ch) { checks.delete(requestId); return; }
  if (ev.type === 'text') ch.text += ev.text;
  else if (ev.type === 'status') ch.status = ev.text || ch.status;
  else if (ev.type === 'done' || ev.type === 'error') {
    if (ev.type === 'error') ch.error = `Fact check failed: ${ev.message}`;
    ch.running = false;
    checks.delete(requestId);
    save();
    // Only repaint this message and the panel, so typing (and the skill picker) isn't interrupted.
    paintStreaming(chat, msg);
    paintFactPanel(chat);
    return;
  }
  paintStreaming(chat, msg);
  paintFactPanel(chat);
});

// Start loading the chat's model in the background while you type.
const warmed = new Set();
function warmUp(chat, a) {
  const target = resolveTarget(chat, a);
  const key = `${target}|${a.contextSize || S.data.prefs.contextSize}`;
  if (!target || warmed.has(key) || target.startsWith('api:')) return;
  warmed.add(key);
  qs.call('models:warm', target, { contextSize: Number(a.contextSize || S.data.prefs.contextSize) || 16384, gpu: S.data.prefs.gpu }).catch(() => warmed.delete(key));
}

// ---------- skills in chat ----------

// A skill that makes a picture, video, photo edit or app (see skill-media.js).
function isMakerSkill(alt) {
  const s = alt?.skillId && skillById(alt.skillId);
  return s && (AFTER_OUTPUTS.has(s.output) || DIRECT_OUTPUTS.has(s.output) || s.output === 'app') ? s : null;
}

function skillChipHTML(chat) {
  const s = chat.pendingSkill && skillById(chat.pendingSkill);
  if (s) return `<div class="row" style="margin-bottom:2px"><span class="badge b-peach" style="font-size:.9rem;padding:4px 10px">⚡ ${esc(s.icon)} ${esc(s.name)} <button class="tool" data-skill-clear title="Stop using this skill" style="padding:0 4px">✕</button></span><span class="small muted">${esc(s.description)}</span></div>`;
  const own = skillById(assistantById(chat.assistantId)?.skill);
  if (own) return `<div class="row" style="margin-bottom:2px"><span class="badge b-peach" style="font-size:.85rem;padding:3px 9px" title="This assistant uses it on every message">⚡ ${esc(own.icon)} ${esc(own.name)}</span><span class="small muted">${esc(own.description)}</span></div>`;
  const sug = chat.suggested && !(chat.dismissed || []).includes(chat.suggested) && skillById(chat.suggested);
  if (sug) return `<div class="row" style="margin-bottom:2px"><span class="small muted">Suggested skill:</span><button class="btn small" data-skill-use="${esc(sug.id)}">⚡ ${esc(sug.icon)} ${esc(sug.name)}</button><button class="tool" data-skill-dismiss data-skill-use="${esc(sug.id)}">No thanks</button></div>`;
  return '';
}

const DL_LABEL = { pptx: '⬇ Download PowerPoint', docx: '⬇ Download Word document', xlsx: '⬇ Download Excel', chart: '' };
function downloadHTML(m, alt, streaming) {
  const s = alt.skillId && skillById(alt.skillId);
  if (!s || streaming || !alt.text || !DL_LABEL[s.output]) return '';
  if (s.output === 'xlsx' && !/^\s*\|.*\|\s*$/m.test(alt.text)) return '';
  return `<div class="row"><button class="btn primary" data-act="dl" data-fmt="${s.output}" data-id="${m.id}">${DL_LABEL[s.output]}</button><span class="small muted">${s.output === 'pptx' ? 'Slides with speaker notes, tables and charts.' : s.output === 'docx' ? 'Headings, lists and tables, ready to edit.' : 'The table as an Excel workbook.'}</span></div>`;
}

function answerTitle(chat, m) {
  const t = msgText(m).match(/^#\s+(.+)$/m)?.[1];
  return (t || chat.title || 'Quicksilver').replace(/[*_`]/g, '').slice(0, 80);
}

async function exportAnswer(chat, m, fmt) {
  const text = msgText(m);
  const title = answerTitle(chat, m);
  if (fmt === 'xlsx') {
    const lines = text.split('\n');
    const start = lines.findIndex((l, i) => /^\s*\|.*\|\s*$/.test(l) && /^\s*\|?\s*:?-{2,}/.test(lines[i + 1] || ''));
    if (start < 0) { toast('No table in this answer.'); return; }
    const cells = (l) => l.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim().replace(/\*\*/g, ''));
    const rows = [cells(lines[start])];
    for (let i = start + 2; i < lines.length && /^\s*\|.*\|\s*$/.test(lines[i]); i++) rows.push(cells(lines[i]));
    if (await call('file:saveXlsx', `${title}.xlsx`, rows)) toast('Saved as an Excel workbook.');
    return;
  }
  const html = document.querySelector(`[data-msg="${m.id}"] .bubble`)?.innerHTML || '';
  if (await call('export:file', fmt, { markdown: text, html, title })) toast('Saved. Opening the folder…');
}

function saveAsMenu(chat, m, anchor) {
  closeMenus();
  const r = anchor.getBoundingClientRect();
  const menu = document.createElement('div');
  menu.className = 'menu';
  menu.style.top = `${Math.min(r.bottom + 4, window.innerHeight - 230)}px`;
  menu.style.left = `${Math.max(8, r.left)}px`;
  menu.innerHTML = '<button data-f="docx">📄 Word document</button><button data-f="pptx">🖥️ PowerPoint</button><button data-f="pdf">📕 PDF</button><button data-f="xlsx">📊 Excel (first table)</button><button data-f="md">⬇ Markdown</button>';
  document.body.appendChild(menu);
  menu.querySelector('button').focus();
  menu.addEventListener('click', (e) => { const f = e.target.closest('[data-f]')?.dataset.f; closeMenus(); if (f) exportAnswer(chat, m, f); });
}

// ---------- tools in chat ----------

const toolsOn = (chat, a) => Boolean(chat.tools ?? a.tools ?? false);

function toolsHTML(alt) {
  const list = alt.toolCalls || [];
  if (!list.length) return '';
  const icon = { running: '⏳', done: '✅', error: '⚠️', denied: '🚫' };
  return `<details class="steps"><summary>🔌 Used ${list.length} tool${list.length > 1 ? 's' : ''}: ${[...new Set(list.map((t) => t.source))].map(esc).join(', ')}</summary>
    ${list.map((t) => `<div class="step"><span>${icon[t.status] || '•'}</span><div class="grow"><b>${esc(t.source)}</b> <code>${esc(t.name)}</code> <span class="small muted">${esc(JSON.stringify(t.args || {}).slice(0, 140))}</span>
      ${t.result ? `<details><summary class="small">Result</summary><pre>${esc(t.result)}</pre></details>` : ''}</div></div>`).join('')}
  </details>`;
}

function askToolApproval(ev) {
  const b = openModal(`<h2>🔌 Allow this action?</h2>
    <p style="font-size:1.05rem"><b>${esc(ev.summary)}</b></p>
    <p class="help">${esc(ev.source)} will be changed. Check the details:</p>
    <pre style="background:var(--soft);border:2px solid var(--line-soft);border-radius:10px;padding:10px;white-space:pre-wrap;max-height:300px;overflow:auto">${esc(JSON.stringify(ev.args, null, 2))}</pre>
    <div class="modal-actions"><button class="btn danger" data-ap="deny">Deny</button><button class="btn" data-ap="always">Always allow this kind of action</button><button class="btn primary" data-ap="once" autofocus>Allow once</button></div>`);
  b.addEventListener('click', (e) => {
    const k = e.target.closest('[data-ap]')?.dataset.ap;
    if (!k) return;
    qs.approve({ approvalId: ev.approvalId, ok: k !== 'deny', always: k === 'always' });
    closeModal();
  });
}
