// Chat: assistants, any model or team, photos/video/documents, library and web sources.
'use strict';

let pending = null;          // { requestId, chatId, msgId }
const drafts = {};           // chatId -> attachments waiting to be sent
let paintQueued = false;

function newChat(assistantId, projectId) {
  const proj = projectId && projectById(projectId);
  const a = assistantById(assistantId || proj?.assistantId || S.data.prefs.lastAssistant);
  const chat = { id: uid(), assistantId: a.id, title: 'New chat', created: now(), updated: now(), target: proj?.target || '', library: null, web: null, messages: [], ...(proj ? { projectId: proj.id } : {}) };
  S.data.chats.push(chat);
  S.data.prefs.lastAssistant = a.id;
  save();
  go({ view: 'chat', id: chat.id });
}

const EFFORTS = { quick: '⚡ Instant', balanced: '⚖️ Balanced', thorough: '✨ Auto', max: '🧠 Deep think', council: '⚔️ Council' };
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
    ensureTab(chat.id);
    const a = assistantById(chat.assistantId);
    const target = resolveTarget(chat, a);
    const lib = chat.library ?? a.library;
    const web = chat.web ?? a.web;
    const fact = factOn(chat, a);
    const tools = toolsOn(chat, a);
    const chip = (id, ic, label, on, title) => `<button class="chip-tog ${on ? 'on' : ''}" id="${id}" aria-pressed="${on}" title="${title}">${icon(ic, 16)}<span>${label}</span>${on ? icon('check', 14) : ''}</button>`;
    return `<div class="chat">
      ${tabsHTML(chat)}
      <header class="chat-top">
        <div class="pickers">
          <label class="pill-select" title="Assistant"><span class="pill-emoji">${esc(a.emoji)}</span><select id="pick-assistant" aria-label="Assistant">${S.data.assistants.map((x) => `<option value="${x.id}" ${x.id === a.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>${icon('chevron', 16)}</label>
          <label class="pill-select" title="Model or team">${icon(target.startsWith('stack:') ? 'layers' : 'cpu', 16)}<select id="pick-model" aria-label="Model or team">${!a.target && S.data.prefs.autoRoute !== false && S.targets.length > 1 ? `<option value="__auto" ${autoOn(chat, a) ? 'selected' : ''}>✨ Automatic</option>` : ''}${S.targets.length ? targetOptions(autoOn(chat, a) ? '' : target) : '<option value="">No models yet</option>'}<option value="__infuse">✨ Combine several AIs…</option><option value="__get">＋ Get more models…</option></select>${icon('chevron', 16)}</label>
          <button class="net-pill ${S.config?.offline ? 'off' : ''}" id="net-pill" role="switch" aria-checked="${!S.config?.offline}" title="${S.config?.offline ? 'Offline: nothing leaves this PC. Click to go online.' : 'Online: web search, cloud AIs and downloads are available. Click to go offline.'}"><span class="net-dot"></span><span>${S.config?.offline ? 'Offline' : 'Online'}</span><span class="net-sw"><i></i></span></button>
        </div>
        <div class="chat-title" title="${esc(chat.title)}">${sessionBadgeHTML(target)}${projectChipHTML(chat)}${chat.private ? '<span class="priv-chip" title="Private chat: memory is not used or added">🔒 Private</span>' : ''}<span class="ct">${chat.messages.length && chat.title !== 'New chat' ? esc(chat.title) : ''}</span></div>
        <button class="run-state" id="run-state" hidden aria-label="How the model is running"></button>
        <button class="icon-btn" id="chat-more" title="Share, pin, rename, export or delete this chat" aria-label="More options">${icon('more')}</button>
      </header>
      <div class="chat-body" id="chat-body"><div class="chat-col">
      <button class="to-latest" id="to-latest" hidden aria-label="Jump to the latest message" title="Jump to the latest message">${icon('chevron', 18)}</button>
      <div class="messages" id="messages"><div class="messages-inner">${chat.messages.length ? chat.messages.map((m, i) => messageHTML(chat, a, m, i)).join('') : welcomeHTML(a)}</div></div>
      <div class="composer" id="composer">
        <div class="hint-row" id="hint-row"></div>
        <div class="composer-card">
          <div class="attach-row" id="att-row">${attachmentsHTML(drafts[chat.id] || [], true)}</div>
          <div id="skill-row">${skillChipHTML(chat)}</div>
          <div class="skill-pop" id="skill-pop" hidden></div>
          <textarea id="input" rows="1" spellcheck="true" placeholder="${esc(chat.pendingSkill ? skillById(chat.pendingSkill)?.hint || 'Add details…' : `Message ${a.name}…  Type / for skills`)}" aria-label="Message"></textarea>
          <div class="composer-bar">
            <button class="icon-btn opts-btn" id="opts-btn" title="Options: web search, knowledge, double-check, effort, skills" aria-label="Options">${icon('plus')}</button>
            <button class="icon-btn" id="skill-btn" title="Use a skill (or type /)" aria-label="Skills">${icon('zap')}</button>
            <button class="chip-tog improve-btn" id="improve-btn" title="Fix my prompt: rewrites what you typed so it's clear and complete (spelling too), for a better answer. You can edit it before sending." aria-label="Fix my prompt">${icon('sparkle', 16)}<span>Fix my prompt</span></button>
            <button class="icon-btn mic-btn ${voiceRec?.chatId === chat.id ? 'rec' : ''}" id="mic-btn" title="Voice typing: click and speak (Ctrl+Space)" aria-label="Voice typing">${icon('mic')}</button>
            <label class="icon-btn" title="Attach photos, videos or documents" aria-label="Attach">${icon('clip')}<input type="file" id="file-in" multiple hidden accept="image/*,video/*,.pdf,.docx,.xlsx,.xlsm,.csv,.tsv,.pptx,.txt,.md,.json,.html,.htm,.xml,.js,.ts,.py,.java,.c,.cpp,.cs,.go,.rs,.rb,.php,.sql"></label>
            <span class="bar-sep"></span>
            ${chip('tog-lib', 'book', 'Library', lib, 'Search your knowledge bases and cite them')}
            ${S.config?.offline ? `<span class="chip-tog" title="Offline: switch to Online in the sidebar to search the web" style="opacity:.5">${icon('globe', 16)}<span>Web (offline)</span></span>` : chip('tog-web', 'globe', 'Web', web, 'Search the web and cite sources')}
            ${chip('tog-tools', 'plug', 'Tools', tools, 'Let the AI use your integrations (GitHub, Slack, MCP servers…)')}
            ${chip('tog-fact', 'shield', 'Double-check', fact, 'After each answer, a second model checks it claim by claim')}
            <button class="chip-tog" id="add-api-chip" title="Connect a cloud AI (ChatGPT, Claude, Gemini…) to use alongside your local models">${icon('plus', 16)}<span>Cloud AI${S.providers?.length ? ` (${S.providers.length})` : ''}</span></button>
            <label class="pill-select small" title="Answer length: Best length fits the question; Quick answer gets straight to the point; Detailed answer gives the full picture, with explanation and examples">${icon('doc', 16)}<select id="pick-length" aria-label="Answer length">${Object.entries(LENGTHS).map(([k, l]) => `<option value="${k}" ${k === lengthOf(chat) ? 'selected' : ''}>${l.label}</option>`).join('')}</select>${icon('chevron', 14)}</label>
            <label class="pill-select small" title="Instant: one model, fastest. Balanced: one model, then a check. Auto: the team works on hard questions only. Deep think: the whole team on every question, always double-checked. Council: three AIs (Structurer, Critic, Pragmatist), then one verdict. See Settings → Options guide.">${icon('gauge', 16)}<select id="pick-effort" aria-label="Effort">${Object.entries(EFFORTS).map(([k, e]) => `<option value="${k}" ${k === effortOf(chat, a) ? 'selected' : ''}>${e.replace(/^\S+\s/, '')}</option>`).join('')}</select>${icon('chevron', 14)}</label>
            <span class="grow"></span>
            <button class="send-btn ${pending?.chatId === chat.id ? 'stop' : ''}" id="send" title="${pending?.chatId === chat.id ? 'Stop' : 'Send (Enter)'}" aria-label="${pending?.chatId === chat.id ? 'Stop' : 'Send'}">${icon(pending?.chatId === chat.id ? 'stop' : 'send', 20)}</button>
          </div>
        </div>
        <div class="composer-hint">${simpleOn() && chat.messages.length ? `${/ctx-meter (warm|hot)/.test(contextMeterHTML(chat, a)) ? contextMeterHTML(chat, a) : ''}${chatHasSettings(chat) ? `${/ctx-meter (warm|hot)/.test(contextMeterHTML(chat, a)) ? ' · ' : ''}<a href="#" data-chat-settings>custom settings</a>` : ''}` : `${autoOn(chat, a) ? 'Automatic: the best model for each question, quick answers first' : `Runs on ${esc(targetLabel(target))}${simpleOn() ? '' : chatEtaHint(target, a)}`}${chatHasSettings(chat) ? ' · <a href="#" data-chat-settings>custom settings</a>' : ''}${chat.messages.length ? ` · ${contextMeterHTML(chat, a)}` : ' · Drop or paste photos, video, PDF, Word, Excel or PowerPoint'}`}<a href="#" class="og-link" data-open-guide title="What every option does">ⓘ What do these do?</a></div>
      </div>
      </div>${docPanelHTML(chat) || factPanelHTML(chat)}</div>
    </div>`;
  },
  bind: bindChat,
};

// "⏱ ~6 s per answer (hard questions ~20 s)", for the model or team this chat runs on.
function chatEtaHint(target, a) {
  const words = wordsForJob(a.job);
  const easy = etaFor(target, words);
  if (easy == null) return '';
  const hard = etaFor(target, Math.max(words, WORDS.hard), { hard: true });
  const st = starsOf(target, a.job || 'general');
  return ` · ⏱ ${etaLabel(easy)} per answer${hard != null && hard > easy * 1.4 ? ` (hard questions ${etaLabel(hard)})` : ''}${st != null ? ` · ${starText(st)} expected quality` : ''}`;
}

// At start-up: ask what to call the user (once; skippable). Changeable in Settings → General.
function nameAskHTML() {
  const p = S.data.prefs;
  if (p.userName || p.askedName) return '';
  return `<div class="name-ask" id="name-ask"><span class="name-ask-h">👋 What should I call you?</span>
    <input id="name-ask-in" maxlength="40" placeholder="Your first name" autocomplete="given-name">
    <button class="btn small primary" id="name-ask-ok">Save</button><button class="btn small ghost" id="name-ask-skip">Skip</button></div>`;
}
function bindNameAsk() {
  const done = (name) => {
    S.data.prefs.askedName = true;
    if (name) S.data.prefs.userName = name;
    save(); render();
    if (name) toast(`Nice to meet you, ${name}. You can change your name any time in Settings.`);
  };
  $('#name-ask-ok')?.addEventListener('click', () => done($('#name-ask-in').value.trim().slice(0, 40)));
  $('#name-ask-in')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); done(e.target.value.trim().slice(0, 40)); } });
  $('#name-ask-skip')?.addEventListener('click', () => done(''));
}

function welcomeHTML(a) {
  const none = !S.targets.length;
  const name = S.data.prefs.userName;
  return `<div class="welcome">
    ${nameAskHTML()}
    ${name ? `<p class="hello">Hi ${esc(name)} 👋</p>` : ''}
    <div class="emoji-badge" style="width:72px;height:72px;font-size:2.4rem;margin:0 auto 12px;border-radius:20px">${esc(a.emoji)}</div>
    <h1>${esc(a.name)}</h1>
    <p class="muted" style="font-size:1.05rem;font-weight:600">${esc(a.description || '')}</p>
    ${a.exam ? studyPanelHTML(a) : ''}
    ${none ? `<div class="notice info" style="text-align:left;margin-top:16px"><b>Let's get you set up.</b> Quicksilver runs AI on your own PC. The <b>Setup Advisor</b> checks your computer and downloads the best free models for the job, in one click. No account or key needed.
      <div class="row" style="margin-top:10px"><button class="btn primary" data-goto="stacks">Open the Setup Advisor</button><button class="btn" data-goto="models">Browse models</button></div></div>` : ''}
    ${S.installed.some((m) => m.kind === 'text') && S.installed.filter((m) => m.kind === 'text').every((m) => m.source === 'bundled') ? '<p class="small muted grow-tip">💡 The starter models are a great start but limited on their own. Answers get sharper as you add models or build teams (<a href="#" data-goto="stacks">Teams</a> · <a href="#" data-goto="models">Models</a>).</p>' : ''}
  </div>`;
}

// No model installed yet: when the user tries to chat, help them add one (or a team) instead of a
// dead end. Their typed message is kept in the box, ready to send once a model is set up.
function needModel(chat) {
  const found = (S.found || []).filter((m) => m.kind === 'text').length;
  const b = openModal(`<h2>${icon('cpu', 22)} Add a model to start chatting</h2>
    <p style="font-size:1.03rem">Quicksilver runs AI on your own PC, so you pick a model (or a team of models) first. Your message is saved — it'll be here when you come back.</p>
    <div class="need-model">
      <button class="need-opt" data-nm="setup"><b>${icon('sparkle', 16)} Set me up automatically</b><span class="small muted">The Setup Advisor checks your PC and downloads the best free model for the job, in one click. No account needed.</span></button>
      <button class="need-opt" data-nm="teams"><b>${icon('layers', 16)} Build a team</b><span class="small muted">Combine models for stronger answers, or pick a ready-made team for coding, writing, study and more.</span></button>
      <button class="need-opt" data-nm="browse"><b>${icon('box', 16)} Browse models</b><span class="small muted">See every free model, rated for how fast it runs on your PC, and download one.</span></button>
      ${found ? `<button class="need-opt" data-nm="found"><b>${icon('download', 16)} Add ${found} model${found > 1 ? 's' : ''} already on this PC</b><span class="small muted">Found in LM Studio, Jan, Ollama, GPT4All or your Downloads — add ${found > 1 ? 'them' : 'it'} in place, no re-downloading.</span></button>` : ''}
      <button class="need-opt" data-nm="api"><b>${icon('plus', 16)} Connect a cloud AI</b><span class="small muted">Use ChatGPT, Claude or Gemini with your own API key — no download, works on any PC.</span></button>
    </div>
    <div class="modal-actions"><button class="btn" data-close>Not now</button></div>`, { wide: true });
  b.addEventListener('click', (e) => {
    const nm = e.target.closest('[data-nm]')?.dataset.nm;
    if (!nm) return;
    closeModal();
    if (nm === 'setup') { go({ view: 'stacks' }); runAdvisor('general'); }
    else if (nm === 'teams') go({ view: 'stacks' });
    else if (nm === 'browse') { modelsTab = 'text'; go({ view: 'models' }); }
    else if (nm === 'found') { modelsTab = 'installed'; go({ view: 'models' }); setTimeout(() => (typeof foundModal === 'function' && (S.found || []).length ? foundModal() : $('#find-models')?.click()), 120); }
    else if (nm === 'api') { modelsTab = 'api'; go({ view: 'models' }); }
  });
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
  const roleBadge = { council: '<span class="badge b-peach">⚔️ Council</span>', muse: '<span class="badge b-lemon">✨ Muse</span>', vision: '<span class="badge b-sky">👁 Sees</span>', draft: '<span class="badge b-lav">✏️ Drafts</span>', critique: '<span class="badge b-peach">⚔️ Debates</span>', tools: '<span class="badge b-lemon">🔌 Tools</span>', lead: '<span class="badge b-mint">★ Lead</span>' };
  const models = new Set(alt.steps.map((s) => s.model).filter(Boolean)).size;
  const now = streaming ? alt.steps.find((s) => !s.done) : null;
  return `<details class="steps chip-d"><summary>${now ? `<span class="pulse"></span>${esc(now.label)} · ${esc(now.model || '')}` : `🧩 ${models > 1 ? `Team of ${models}` : '1 model'} · ${alt.steps.length} step${alt.steps.length > 1 ? 's' : ''}`}</summary>
    ${alt.steps.map((s) => `<div class="step">${roleBadge[s.role] || ''}<div class="grow"><b>${esc(s.label)}</b> <span class="muted small">· ${esc(s.model)}${s.ms ? ` · ${fmtSec(s.ms / 1000)}` : ''}${s.done ? '' : ' · working…'}</span>${s.error ? `<div class="small" style="color:var(--danger);font-weight:700">${esc(s.error)}</div>` : ''}
      ${s.role !== 'lead' && s.text ? `<details><summary class="small">Show</summary><pre>${esc(s.text)}</pre></details>` : ''}</div></div>`).join('')}
  </details>`;
}

// The Council's verdict: how much the three agreed, and who sat on it (their notes are in the steps).
function councilBadgeHTML(alt) {
  const c = alt.council;
  if (!c) return '';
  const kind = c.agreement >= 80 ? 'b-mint' : c.agreement >= 55 ? 'b-lemon' : 'b-peach';
  const word = c.agreement >= 80 ? 'agreed' : c.agreement >= 55 ? 'mostly agreed' : 'split decision';
  const who = (c.members || []).map((x) => `${x.icon} ${x.role}: ${x.model}`).join('\n');
  return `<span class="badge ${kind} council-badge" title="${esc(`3-AI Council\n${who}\nThe chair's estimate of how much they agreed: about ${c.agreement}%.\nOpen the steps to read each member's view.`)}">⚔️ Council: ${word}</span>`;
}
const metaRow = (html) => (html.trim() ? `<div class="meta-row">${html}</div>` : '');
const domainOf = (u) => { try { return new URL(u).hostname.replace(/^www\./, ''); } catch { return u; } };

const msgTime = (m) => (m.t ? new Date(m.t).toLocaleString(undefined, { weekday: 'short', day: 'numeric', month: 'short', hour: 'numeric', minute: '2-digit' }) : '');
const tb = (act, id, ic, label) => `<button class="tool icon" data-act="${act}" data-id="${id}" title="${esc(label)}" aria-label="${esc(label)}">${icon(ic, 16)}</button>`;

// Next questions under the latest answer: written by the model from what it actually said
// (see writeFollowups); while they're being written, quiet placeholders; if that fails, simple
// ones chosen by the kind of answer.
function followupsHTML(alt) {
  if (alt.followups?.length) return `<div class="followups">${alt.followups.map((q) => `<button class="fu" data-followup="${esc(q)}">${esc(q)}</button>`).join('')}</div>`;
  if (alt.fuPending) return '<div class="followups pending" aria-hidden="true"><span class="fu ghost"></span><span class="fu ghost"></span><span class="fu ghost"></span></div>';
  const t = alt.text || '';
  const list = /```/.test(t) ? ['Explain how this works', 'Add comments and tests', 'Can it be simpler?']
    : /^\s*\|.*\|\s*$/m.test(t) ? ['Which option would you pick?', 'Add a column for cost', 'Turn it into a chart']
    : t.length > 1800 ? ['Summarise this in 5 bullets', 'What should I do first?', 'Explain it more simply']
    : ['Tell me more', 'Give me an example', 'What are the downsides?'];
  return `<div class="followups">${list.map((q) => `<button class="fu" data-followup="${esc(q)}">${esc(q)}</button>`).join('')}</div>`;
}

// A message fades in once, when it first appears. Re-renders (streaming, finishing, switching
// views) never replay it, so text doesn't bounce or flicker.
const seenMsgs = new Set();
function msgIn(m) {
  const fresh = !seenMsgs.has(m.id) && (!m.t || Date.now() - m.t < 4000);
  seenMsgs.add(m.id);
  return fresh ? ' msg-in' : '';
}

function messageHTML(chat, a, m, i) {
  if (m.role === 'user') {
    return `<div class="msg user${msgIn(m)}" data-msg="${m.id}">
      ${m.attachments?.length ? `<div class="attach-row" style="justify-content:flex-end">${attachmentsHTML(m.attachments, false)}</div>` : ''}
      ${m.text ? `<div class="bubble"${m.t ? ` title="${esc(msgTime(m))}"` : ''}>${esc(m.text)}</div>` : ''}
      <div class="msg-tools">${pending ? '' : tb('edit', m.id, 'edit', 'Edit and ask again') + tb('branch', m.id, 'branch', 'Branch: a new chat from this point') + tb('copy', m.id, 'copy', 'Copy') + tb('del', m.id, 'trash', 'Delete')}</div>
    </div>`;
  }
  const alt = m.alts[m.altIndex] || {};
  const streaming = pending?.msgId === m.id;
  const isLast = i === chat.messages.length - 1;
  const left = streaming && alt.eta ? alt.eta.sec - (Date.now() - alt.eta.start) / 1000 : null;
  const etaNow = left == null ? '' : `<span class="who-eta" title="Estimated on this PC">${left > 2 ? `about ${fmtSec(left)} left` : 'almost done'}</span>`;
  const body = alt.error ? esc(alt.error) + lowMemHTML(m, alt)
    : !alt.text && streaming ? `<span class="status-line">${esc(alt.status || 'Thinking…')}</span>`
    : HIDE_BLOCK.has(isMakerSkill(alt)?.output) ? (stripMediaBlock(alt.text) ? markdown(stripMediaBlock(alt.text)) : streaming ? `<span class="status-line">Writing the ${MEDIA_WORD[skillById(alt.skillId).output]} prompt…</span>` : '')
    : markdown(alt.text || '');
  const tools = [];
  if (m.alts.length > 1) tools.push(`<span class="alt-switch" title="${m.alts.length} answers to this question${alt.target ? `; this one is by ${esc(targetLabel(alt.target))}` : ''}"><button class="tool icon" data-act="prev" data-id="${m.id}" aria-label="Previous answer">‹</button><span>${m.altIndex + 1} / ${m.alts.length}</span><button class="tool icon" data-act="next" data-id="${m.id}" aria-label="Next answer">›</button></span>`);
  if (!streaming && !pending) {
    if (alt.text) tools.push(tb('copy', m.id, 'copy', 'Copy'), tb('share', m.id, 'send', 'Share: copy, email, PDF or Word'));
    if (alt.text && alt.target) tools.push(`<button class="tool icon rate ${alt.rating === 'up' ? 'on' : ''}" data-act="up" data-id="${m.id}" title="Good answer" aria-label="Good answer" aria-pressed="${alt.rating === 'up'}">👍</button>`, `<button class="tool icon rate ${alt.rating === 'down' ? 'on' : ''}" data-act="down" data-id="${m.id}" title="Not good" aria-label="Not good" aria-pressed="${alt.rating === 'down'}">👎</button>`);
    if (isLast) tools.push(tb('regen', m.id, 'refresh', 'Regenerate'));
    if (speakingId === m.id) tools.push(`<button class="tool icon on" data-act="speak" data-id="${m.id}" title="Stop reading" aria-label="Stop reading">${icon('volume', 16)}</button>`);
    tools.push(tb('more', m.id, 'more', 'More: another model, listen, edit as document, double-check, save as, branch, delete'));
  }
  const model = alt.target ? targetLabel(alt.target) : alt.imported ? '' : '';
  return `<div class="msg assistant${msgIn(m)}" data-msg="${m.id}">
    <div class="av" aria-hidden="true">${esc(a.emoji)}</div>
    <div class="msg-main">
    <div class="who-line"><b>${esc(a.name)}</b>${model ? `<span class="who-model"${alt.autoWhy ? ` title="${esc(alt.autoWhy)}"` : ''}>${alt.autoWhy ? '✨ ' : ''}${esc(model)}</span>` : ''}${alt.skillId && skillById(alt.skillId) ? `<span class="badge b-peach">⚡ ${esc(skillById(alt.skillId).name)}</span>` : ''}${alt.imported ? `<span class="badge">From ${esc(alt.imported)}</span>` : ''}${alt.fixed ? '<span class="badge b-mint" title="A check of the first answer found a mistake (a sum, a code error or a wrong fact); this one fixes it. The first answer is still there with ‹ ›.">✓ Corrected</span>' : ''}${alt.preAnswered ? '<span class="badge b-lemon" title="This was the most likely next question, so it was answered while you read the last answer.">⚡ Ready before you asked</span>' : ''}${alt.cached ? '<span class="badge b-lemon" title="You rated this answer before (or it passed the double-check), so it was shown instantly. Regenerate for a fresh one.">⚡ Instant</span>' : ''}${alt.unsure && alt.check?.running ? '<span class="badge" title="The model was unsure of a number in this answer, so a second model is checking it.">Checking a number…</span>' : ''}${alt.autoWeb && !alt.sources?.length ? '<span class="badge b-sky" title="This question is about something current, so the web was searched automatically. Turn it off in Settings → General.">🌐 Checked the web</span>' : ''}${alt.webEmpty ? '<span class="badge b-lemon" title="Web search was on but found nothing for this question, so this answer is from the model\'s own knowledge.">Web: nothing found</span>' : ''}${etaNow}${alt.stats?.tps && !streaming ? `<span class="who-speed" title="${esc(statsTitle(alt))}">${Math.round(alt.stats.tps * 0.75)} words/s</span>` : ''}${m.t ? `<span class="who-time">${esc(msgTime(m))}</span>` : ''}</div>
    ${metaRow(councilBadgeHTML(alt) + stepsHTML(alt, streaming) + toolsHTML(alt) + memoryChipHTML(alt) + (alt.reasoning ? `<details class="think chip-d"><summary>${streaming && !alt.text ? '<span class="pulse"></span>Thinking…' : '💭 Thought it through'}</summary><div>${esc(alt.reasoning)}</div></details>` : ''))}
    <div class="bubble md ${streaming ? 'streaming' : ''} ${alt.error ? 'error' : ''}">${body}</div>
    ${downloadHTML(m, alt, streaming)}
    ${appButtonsHTML(m, alt, streaming)}
    ${skillMediaHTML(m, alt, streaming)}
    ${refusalHTML(chat, m, alt, streaming)}
    ${checkHTML(m, alt) || alt.sources?.length ? `<div class="answer-foot">${checkHTML(m, alt)}` : ''}
    ${alt.sources?.length ? `<div class="sources"><span class="src-label" title="${alt.autoWeb ? 'This question is about something current, so the web was searched automatically.' : 'Where this answer comes from'}">${alt.autoWeb ? '🌐 ' : ''}${alt.autoLib ? '📚 ' : ''}Sources</span>${alt.sources.map((s, k) => `<${s.url ? `a href="${esc(s.url)}"` : 'span'} class="src-chip" title="${esc(s.title || s.url || '')}"><span class="cite">${k + 1}</span>${esc(s.url ? domainOf(s.url) : s.title)}</${s.url ? 'a' : 'span'}>`).join('')}</div>` : ''}
    ${checkHTML(m, alt) || alt.sources?.length ? '</div>' : ''}
    ${tools.length ? `<div class="msg-tools">${tools.join('')}</div>` : ''}
    ${isLast && !pending && alt.text && !alt.error && !isMakerSkill(alt) && !alt.imported ? followupsHTML(alt) : ''}
    ${tipHTML(m, alt)}
    </div>
  </div>`;
}

// Less-used actions, tucked behind ⋯.
function moreMenu(chat, m, anchor) {
  closeMenus();
  const i = chat.messages.indexOf(m);
  const alt = m.alts[m.altIndex] || {};
  const r = anchor.getBoundingClientRect();
  const menu = document.createElement('div');
  menu.className = 'menu';
  menu.innerHTML = [
    i === chat.messages.length - 1 ? '<button data-mm="other">⇄ Try another model…</button>' : '',
    i === chat.messages.length - 1 && alt.text ? '<button data-mm="continue">Continue writing</button>' : '',
    alt.text ? '<button data-mm="speak">🔊 Listen</button>' : '',
    alt.text ? '<button data-mm="doc">📝 Edit as document</button>' : '',
    alt.text && !alt.check && !checkRunning(m) ? '<button data-mm="check">✓ Double-check this answer</button>' : '',
    alt.text ? '<button data-mm="saveas">⬇ Save as Word, PDF, PowerPoint…</button>' : '',
    '<button data-mm="branch">↳ Branch: new chat from here</button>',
    '<button data-mm="del" class="danger">Delete</button>',
  ].join('');
  document.body.appendChild(menu);
  const h = menu.offsetHeight;
  menu.style.top = `${r.top - h - 6 > 8 ? r.top - h - 6 : r.bottom + 4}px`;
  menu.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - menu.offsetWidth - 8))}px`;
  menu.querySelector('button')?.focus();
  menu.addEventListener('click', (e) => {
    const act = e.target.closest('[data-mm]')?.dataset.mm;
    closeMenus();
    if (act) messageAction(chat, act, m.id, anchor);
  });
}

function scrollDown(force) {
  const box = $('#messages');
  if (!box) return;
  if (force || box.scrollHeight - box.scrollTop - box.clientHeight < 120) box.scrollTop = box.scrollHeight;
}

function bindChat() {
  const chat = chatById(S.route.id);
  if (!chat) return;
  bindTabs();
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
  let readAheadTimer = null;
  input.addEventListener('input', () => {
    chat.draft = input.value; grow(); save();
    clearTimeout(readAheadTimer);
    readAheadTimer = setTimeout(() => prefillChat(chat, a, input.value), 700);
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
    if (e.target.closest('[data-skill-dismiss]')) { chat.dismissed = [...(chat.dismissed || []), chat.suggested]; chat.suggested = null; save(); $('#skill-row').innerHTML = skillChipHTML(chat); }
  });
  $('#send').addEventListener('click', sendOrStop);
  bindNameAsk();
  bindHints(chat, a);
  $$('[data-goto]').forEach((b) => b.addEventListener('click', () => go({ view: b.dataset.goto })));
  $('#pick-assistant').addEventListener('change', (e) => { chat.assistantId = e.target.value; S.data.prefs.lastAssistant = e.target.value; save(); render(); });
  $('#pick-model').addEventListener('change', (e) => {
    if (e.target.value === '__get') { go({ view: 'stacks' }); return; }
    if (e.target.value === '__infuse') { e.target.value = resolveTarget(chat, a); infuseModal((st) => { chat.target = `stack:${st.id}`; save(); render(); }); return; }
    chat.target = e.target.value === '__auto' ? '' : e.target.value; save(); render();
  });
  $('#tog-lib').addEventListener('click', () => { chat.library = !(chat.library ?? a.library); save(); render(); });
  $('#tog-web')?.addEventListener('click', () => {
    const next = !(chat.web ?? a.web);
    if (next && S.config?.web?.provider === 'none') toast('Turn on a web search service in Settings → Web search first.');
    chat.web = next; save(); render();
  });
  $('#pick-effort').addEventListener('change', (e) => { chat.effort = e.target.value; save(); render(); if (e.target.value === 'council') toast('⚔️ Council: a Structurer, a Critic and a Pragmatist each look at your question, then one answer is written from all three. Slower, for when it matters.', 7000); });
  $('#pick-length').addEventListener('change', (e) => { chat.length = e.target.value; S.data.prefs.answerLength = e.target.value; save(); toast(LENGTHS[e.target.value].toast); });
  $('#tog-tools').addEventListener('click', () => { chat.tools = !toolsOn(chat, a); save(); render(); if (chat.tools && !S.hasIntegrations) toast('Connect GitHub, Slack, Notion, Jira, Linear or an MCP server under Connectors first.', 6000); });
  $('#tog-fact').addEventListener('click', () => { chat.factCheck = !factOn(chat, a); save(); render(); });
  $('#net-pill').addEventListener('click', toggleNet);
  $('#chat-more').addEventListener('click', (e) => { e.stopPropagation(); chatMenu(e.currentTarget, chat); });
  $('#messages').addEventListener('click', (e) => {
    const f = e.target.closest('[data-followup]');
    if (f) { input.value = f.dataset.followup; chat.draft = input.value; sendOrStop(); return; }
    const b = e.target.closest('[data-act]'); if (b) messageAction(chat, b.dataset.act, b.dataset.id, b);
  });
  // A button to jump back down appears when you've scrolled up to read.
  const box = $('#messages');
  const latest = $('#to-latest');
  box.addEventListener('scroll', () => { latest.hidden = box.scrollHeight - box.scrollTop - box.clientHeight < 400; }, { passive: true });
  latest.addEventListener('click', () => box.scrollTo({ top: box.scrollHeight, behavior: 'smooth' }));
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
  bindDocPanel(chat);
  $('#mic-btn').addEventListener('click', () => toggleVoice(chat));
  $('#improve-btn').addEventListener('click', () => improvePromptBox(chat));
  $('#opts-btn').addEventListener('click', (e) => composerOptions(chat, e.currentTarget));
  $('#add-api-chip')?.addEventListener('click', () => { modelsTab = 'api'; go({ view: 'models' }); });
  $('[data-chat-settings]')?.addEventListener('click', (e) => { e.preventDefault(); chatSettings(chat); });
  scrollDown(true);
  if (!pending && !docOpen(chat)) input.focus();
  warmUp(chat, a);

  function sendOrStop() {
    if (pending && pending.chatId !== chat.id) { const other = chatById(pending.chatId); toast(`One answer at a time: "${other?.title || 'another chat'}" is still answering. It will finish in a moment, or stop it in its tab.`, 6000); return; }
    if (pending) { qs.abortChat(pending.requestId); return; }
    const text = input.value.trim();
    const atts = drafts[chat.id] || [];
    if (!text && !atts.length) {
      if (chat.messages.at(-1)?.role === 'user') generate(chat, null);
      return;
    }
    if (!resolveTarget(chat, a)) { needModel(chat); return; }
    // An assistant can apply a skill to every message (the Image Artist paints each request).
    chat.messages.push({ id: uid(), t: now(), role: 'user', text, attachments: atts, skillId: chat.pendingSkill || (skillById(a.skill) ? a.skill : undefined) });
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

// Questions about what's happening now get a quick web search automatically (unless web search
// is switched off for this chat), so answers about prices, news or current guidance aren't stale.
// Only questions that really need up-to-the-minute facts trigger an automatic web search. Kept
// deliberately narrow: generic words like "price", "cost", "today" or "tomorrow" appear in plenty
// of questions a local model answers better on its own (a pricing calculation, "my exam tomorrow",
// a website's opening hours), so they don't count on their own.
const FRESH_Q = /\b(latest|most recent|newest|up[- ]to[- ]date|right now|at the moment|this (week|month|year)|news|headlines?|breaking|stock (price|market)|share price|exchange rate|crypto|bitcoin|weather|forecast|who won|final score|release dates?|out yet|released yet|as of 20\d\d|in 20(2[6-9]|[3-9]\d))\b/i;
// A calculation, a creative or build request, or a how-to is about the user's own work, not the news.
const NOT_FRESH = /\d\s*[-+*/^×÷%]\s*\d|\b(write|draft|create|build|make|design|generate|code|refactor|debug|explain|summar|translate|rewrite|compose|story|poem|lyrics|essay|email|script|app|website|function)\b/i;
function webWanted(chat, a, query, force = {}) {
  if (!query || S.config?.web?.provider === 'none' || S.config?.offline) return '';
  if (force.web || (chat.web ?? a.web)) return 'on';
  return chat.web !== false && S.data.prefs.autoWeb !== false && FRESH_Q.test(query) && !NOT_FRESH.test(query) ? 'auto' : '';
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
  // Your own documents, when they clearly match the question (a fast local search).
  if (!own && query && !out.length && !(force.knowledge || (chat.library ?? a.library)) && chat.library !== false && S.data.prefs.autoLibrary !== false) {
    try { const r = await qs.call('kb:peek', query); if (r.length) { for (const x of r) out.push({ title: x.title, text: x.text, path: x.path, url: x.url }); out.autoLib = true; } } catch {}
  }
  const web = webWanted(chat, a, query, force);
  if (web) {
    const before = out.length;
    if (web === 'auto') out.autoWeb = true;
    try { for (const r of await qs.call('web:search', query)) out.push({ title: r.title, url: r.url, text: r.text || r.snippet }); } catch (err) { toast(`Web search: ${err.message}`, 6000); }
    if (out.length === before) out.webEmpty = true; // searched, found nothing: the answer must say so
  }
  return out;
}

// How answers should look: easy to scan, warm and direct.
const ANSWER_STYLE = 'How to write answers: write like a thoughtful expert talking to a smart friend. Start with the direct answer in the first sentence; no openers like "Great question!" and no restating the question. Prefer clear, well-built paragraphs with varied sentence length; use a numbered list only for real steps, bullets only for genuinely list-like items, and a Markdown table only for comparisons. Use a few ## headings only for long answers. Bold sparingly, for the one or two things that matter most. Avoid stock phrases ("delve", "it\'s important to note", "in today\'s world", "in conclusion", "I hope this helps") and emoji unless the user uses them. Code goes in fenced blocks with the right language. Use the currency, units and spelling the user uses (for example £ and UK spelling if they write that way). Check any arithmetic before you state a result. Keep short answers short, and never repeat yourself.';

// Speed: the system prompt stays exactly the same for the whole chat, so the model keeps the
// conversation it has already read in memory and only reads the new message. Everything that
// changes from question to question (memories picked for it, project files, the open document,
// web or library sources, notes) goes in a <context> block at the top of the latest message.
// Changing the system prompt each time made the model re-read the whole chat on every question,
// which on a PC without a graphics card can take longer than writing the answer.
function systemPrompt(a, strict, chat) {
  const p = S.data.prefs;
  const parts = [a.instructions || 'You are a helpful assistant.'];
  parts.push(humanOn() ? HUMAN_STYLE : ANSWER_STYLE);
  parts.push(`(Background only: today's date is ${new Date().toLocaleDateString(undefined, { weekday: 'long', year: 'numeric', month: 'long', day: 'numeric' })}. Don't mention it unless the question needs it.)`);
  // Quicksilver's own voice when you're chatting with Quicksilver itself (not a specialist assistant).
  if (a.id === 'as-general' && resolveTarget(chat || {}, a) === 'stack:quicksilver') parts.push('Your name is Quicksilver. Your voice: quick-witted, warm and straight-talking, like a sharp friend who knows a lot. Light humour when it fits, never forced; confident without being smug; curious about what the user is really after. You run privately on the user\'s own computer.');
  if (p.userName) parts.push(`The user's name is ${p.userName}.`);
  if (p.about) parts.push(`About the user: ${p.about}`);
  if (chat?.system) parts.push(`Instructions for this chat (follow them):\n${chat.system}`);
  if (typeof lockOn === 'function' && lockOn() && !unlockedUntilClose) parts.push('Family-safe mode is on (set by a parent): keep everything suitable for children. Kindly decline sexual content, graphic violence, and instructions for anything dangerous or illegal.');
  parts.push('The user\'s latest message may start with a <context> block added by the app (things you remember about the user, project files, the open document, reference material, notes for this answer). Use it as it says; the user didn\'t type it, so don\'t quote it back or mention it.');
  if (strict) parts.push('IMPORTANT: Answer ONLY from the reference material in the <context> block. Do not use general knowledge or memory. Cite every factual statement with its source number. If the material does not contain the answer, reply that it was not found in the knowledge base, and say what kind of source would answer it.');
  return parts.join('\n\n');
}
// Quick or detailed answers: Best length lets the question decide.
const LENGTHS = {
  auto: { label: 'Best length', toast: 'Answers are as long as the question needs.' },
  short: { label: 'Quick answer', toast: '⚡ Quick answers: straight to the point, in a few sentences.', note: 'Answer length: SHORT. Give the answer in a few sentences or a short list (about 120 words at most). Skip background and examples unless asked.', tokens: 700 },
  long: { label: 'Detailed answer', toast: '📖 Detailed answers: the full picture, with explanation and examples.', note: 'Answer length: LONG. Give a thorough, detailed answer: explain the reasoning, cover the important cases, and include examples, organised with headings where it helps.', tokens: 4096 },
};
const lengthOf = (chat) => (LENGTHS[chat?.length] ? chat.length : LENGTHS[S.data.prefs.answerLength] ? S.data.prefs.answerLength : 'auto');
function turnContext(chat, sources, strict, question, ctx, note, extra) {
  const parts = [memoryPrompt(chat, question), projectPrompt(chat, question, ctx), docPrompt(chat), studyContext(assistantById(chat.assistantId)), note, extra, LENGTHS[lengthOf(chat)].note].filter(Boolean);
  if (strict && !sources.length) parts.push('No reference material matched this question.');
  if (sources.length) {
    parts.push('Reference material for this answer. Use it when relevant and cite it inline with its number, like [1] or [2]. If it does not answer the question, say so and answer from general knowledge, making clear which is which.');
    sources.forEach((s, k) => parts.push(`<source number="${k + 1}" title="${s.title}"${s.url ? ` url="${s.url}"` : ''}>\n${(s.text || '').slice(0, 5000)}\n</source>`));
  }
  return parts.join('\n\n');
}
function withContext(content, text) {
  if (!text) return content;
  const head = `<context>\n${text}\n</context>\n\n`;
  if (typeof content === 'string') return head + content;
  const i = content.findIndex((x) => x.type === 'text');
  return i < 0 ? [{ type: 'text', text: head }, ...content] : content.map((x, k) => (k === i ? { ...x, text: head + x.text } : x));
}

// The system prompt and the conversation so far, exactly as the model reads them (used to send a
// message, and to read ahead while you type).
function chatHistory(chat, a, upTo, skill = null) {
  const p = S.data.prefs;
  // Building a site or app: a whole page is long, and later messages edit it, so allow a long
  // answer and enough memory to keep the current version in view.
  const appWork = skill?.output === 'app' || chat.messages.slice(0, upTo).some((m) => m.role === 'assistant' && /```html\s*\n[\s\S]*?(<!doctype html|<html[\s>])/i.test(msgText(m)));
  const ctx = Math.max(Number(a.contextSize || p.contextSize) || 16384, appWork ? 32768 : 0);
  const docBudget = Math.max(4000, Math.floor((ctx * 3 * 0.6) / Math.max(1, chat.messages.slice(0, upTo).reduce((n, m) => n + (m.attachments || []).filter((x) => x.type === 'doc').length, 0))));
  const strict = Boolean(a.strict && (chat.library ?? a.library));
  const messages = [{ role: 'system', content: systemPrompt(a, strict, chat) }];
  for (const m of chat.messages.slice(0, upTo)) {
    if (m.role === 'user') messages.push({ role: 'user', content: userContent(m, docBudget) });
    else { const t = msgText(m).trim(); if (t) messages.push({ role: 'assistant', content: t }); }
  }
  return { messages, ctx, strict, appWork };
}

async function generate(chat, rerollMsg, withTarget, opts = {}) {
  const a = assistantById(chat.assistantId);
  let autoWhy = '';
  let target = withTarget || resolveTarget(chat, a);
  if (!withTarget && autoOn(chat, a) && effortOf(chat, a) !== 'max') {
    const q = [...chat.messages.slice(0, rerollMsg ? chat.messages.indexOf(rerollMsg) : chat.messages.length)].reverse().find((m) => m.role === 'user');
    const pick = autoPick(chat, a, q?.text || '', (q?.attachments || []).some((x) => x.type === 'image' || x.type === 'video'));
    if (pick.target) { target = pick.target; autoWhy = pick.why || ''; }
  }
  if (!target) { needModel(chat); return; }
  // Parental lock: uncensored models/teams need the PIN first.
  if (uncensoredBlocked(target)) { askUnlock().then((ok) => { if (ok) generate(chat, rerollMsg, withTarget, opts); }); return; }
  // The follow-up you clicked was answered while you read: show it at once.
  if (!rerollMsg && !withTarget && !opts.fix) {
    const pre = takePreanswer(chat);
    if (pre) {
      const m2 = { id: uid(), t: now(), role: 'assistant', altIndex: 0, alts: [{ text: pre.text, target: pre.target, preAnswered: true, ms: 0 }] };
      chat.messages.push(m2);
      chat.updated = now(); save(); render();
      const alt2 = m2.alts[0];
      (async () => { if (await autoChecks(chat, m2, alt2).catch(() => false)) return; if (S.data.prefs.smartFollowups !== false) { alt2.fuPending = true; render(); writeFollowups(chat, m2, alt2); } })();
      return;
    }
  }
  // Asked before and rated 👍 (or passed the double-check): answer instantly.
  if (!rerollMsg && !withTarget && !opts.fix && chat.messages.at(-1)?.role === 'user') {
    const hit = cachedAnswer(chat, chat.messages.at(-1));
    if (hit) {
      chat.messages.push({ id: uid(), t: now(), role: 'assistant', altIndex: 0, alts: [{ text: hit.text, target: hit.target, cached: true, ms: 0 }] });
      if (chat.title === 'New chat') chat.title = chat.messages[0].text.slice(0, 60);
      chat.updated = now(); save(); render();
      return;
    }
  }
  let msg = rerollMsg;
  let upTo;
  if (msg) { upTo = chat.messages.indexOf(msg); msg.alts.push({ text: '', target }); msg.altIndex = msg.alts.length - 1; }
  else { upTo = chat.messages.length; msg = { id: uid(), t: now(), role: 'assistant', alts: [{ text: '', target }], altIndex: 0 }; chat.messages.push(msg); }
  const alt = msg.alts[msg.altIndex];
  if (autoWhy) alt.autoWhy = autoWhy;
  if (opts.fix) alt.fixed = true;
  alt.status = 'Getting ready…';
  alt.t0 = Date.now();
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
  lowMemPreflight(chat, msg, target);

  const p = S.data.prefs;
  const lastUser = [...chat.messages.slice(0, upTo)].reverse().find((m) => m.role === 'user');
  const skill = lastUser?.skillId ? skillById(lastUser.skillId) : null;
  if (skill) { alt.skillId = skill.id; alt.forceFact = Boolean(skill.tools?.factCheck); }
  // Tools that work straight on your files (and reading aloud) don't need a text model.
  if (skill && DIRECT_OUTPUTS.has(skill.output)) { runDirectSkill(chat, msg, alt, skill, lastUser); return; }
  const force = skill?.tools || {};
  if ((chat.library ?? a.library) || webWanted(chat, a, lastUser?.text || '', force) || force.knowledge) { alt.status = 'Searching sources…'; paintStreaming(chat, msg); }
  // Load the model at the same time as the search runs, instead of one after the other.
  if (!target.startsWith('api:')) qs.call('models:warm', target, { contextSize: Number(a.contextSize || p.contextSize) || 16384, gpu: p.gpu }).catch(() => {});
  // Small background jobs (suggestions, titles, memory notes) step aside for the new question.
  stopBackgroundJobs();
  const sources = await gatherSources(chat, a, lastUser?.text || skill?.name || '', force);
  alt.sources = sources.map(({ title, url, path }) => ({ title, url, path }));
  if (sources.webEmpty) alt.webEmpty = true;
  if (sources.autoWeb && !sources.webEmpty) alt.autoWeb = true;
  if (sources.autoLib) alt.autoLib = true;
  pending.sources = sources;
  // Building a site or app: a whole page is long, and later messages edit it, so allow a long
  // answer and enough memory to keep the current version in view.
  const H = chatHistory(chat, a, upTo, skill);
  const { ctx, appWork } = H;
  // "Remember that…" / "Forget…" are saved straight away; the answer just confirms it.
  let memNote = '';
  if (!rerollMsg && lastUser?.text && !lastUser.memoryDone) {
    const mc = memoryCommand(chat, lastUser.text);
    if (mc) {
      lastUser.memoryDone = true;
      if (mc.saved) { alt.remembered = mc.saved; memNote = `You have just saved this to your long-term memory of the user: "${mc.saved[0]}". Confirm it in one short, natural sentence (and answer anything else they asked).`; }
      if (mc.forgot) { alt.forgot = mc.forgot; memNote = `You have just deleted this from your memory of the user: "${mc.forgot.join('"; "')}". Confirm in one short sentence.`; }
    } else if (/^\s*(?:please\s+)?forget\b/i.test(lastUser.text) && memOn()) memNote = 'The user asked you to forget something, but nothing matching it was in your memory. Say so briefly, and mention they can see and edit everything you remember under Settings → Memory.';
  }
  // Web search was on but found nothing: say so, and don't pretend to have checked.
  const facts = lastUser?.text ? exactFacts(lastUser.text) : [];
  if (facts.length) memNote = `${memNote ? `${memNote}\n` : ''}Exact results worked out by the app for this question (use these numbers as they are):\n${facts.map((f) => `- ${f}`).join('\n')}`;
  if (opts.fix) memNote = `${memNote ? `${memNote}\n` : ''}Checks of your previous answer to this question found these problems:\n<check>\n${String(opts.fix).slice(0, 6000)}\n</check>\nWrite a corrected, complete answer that fixes every real problem it found (if a finding is itself wrong, keep what was right). Don't mention the check; just give the better answer.`;
  // The user turned web search on but it found nothing: say so, briefly. An automatic search that
  // found nothing stays silent (the user didn't ask for it) — just answer from what you know.
  if (sources.webEmpty && !sources.autoWeb) memNote = `${memNote ? `${memNote}\n` : ''}The user turned on web search, but the search found nothing for this question. Say in one short sentence at the start that you couldn't check the web this time, then answer from what you know. Don't claim anything is the "latest" or give publication dates or links you haven't seen.`;
  else if (sources.webEmpty) memNote = `${memNote ? `${memNote}\n` : ''}Answer from your own knowledge. Don't claim anything is the "latest" and don't give publication dates or links.`;
  const { strict, messages } = H;
  if (messages.at(-1).role !== 'user') messages.push({ role: 'user', content: 'Please continue.' });
  messages[messages.length - 1] = { ...messages.at(-1), content: withContext(messages.at(-1).content, turnContext(chat, sources, strict, lastUser?.text || '', ctx, memNote, skill ? skillPrompt(skill) : '')) };
  // Long chats: keep the instructions and the latest messages within the model's memory, so a
  // long conversation keeps working instead of failing once it outgrows it.
  {
    const size = (x) => (typeof x.content === 'string' ? x.content.length : (x.content || []).reduce((n, p) => n + (p.text?.length || 0) + (p.type === 'image_url' ? 3000 : 0), 0));
    const budget = ctx * 3.2 * 0.75;
    let total = messages.reduce((n, x) => n + size(x), 0);
    let dropped = 0;
    // Old messages go in blocks of ten (down to 60% full), not one per question, so the start of
    // the chat stays the same for several questions and the model doesn't re-read it each time.
    if (total > budget) while ((total > budget * 0.6 || dropped % 10) && messages.length > 3) { total -= size(messages[1]); messages.splice(1, 1); dropped++; }
    if (messages[1]?.role === 'assistant') { messages.splice(1, 1); dropped++; }
    if (dropped) messages[0] = { ...messages[0], content: `${messages[0].content}\n\n(Note: the oldest messages of this long conversation were left out to fit; ask the user if something from earlier is needed.)` };
  }
  // Photo edits: a model that can't see still writes the edit; the photo goes to the image model.
  if (skill && ['edit', 'animate'].includes(skill.output) && !S.speed?.targets?.[target]?.vision) {
    for (const msgOut of messages) if (Array.isArray(msgOut.content)) msgOut.content = [...msgOut.content.filter((x) => x.type !== 'image_url'), { type: 'text', text: '(A photo is attached for the image model to work on.)' }];
  }
  if (pending?.requestId !== requestId) return; // stopped while searching
  alt.status = 'Thinking…';
  qs.sendChat({
    requestId, target, messages,
    temperature: Number(chat.temperature ?? a.temperature ?? p.temperature),
    maxTokens: ((n) => (lengthOf(chat) === 'short' && !appWork ? Math.min(n, LENGTHS.short.tokens) : lengthOf(chat) === 'long' ? Math.max(n, LENGTHS.long.tokens) : n))(Math.max(appWork && chat.maxTokens == null ? 8192 : 0, Math.round(Number(chat.maxTokens || a.maxTokens || p.maxTokens) * (effortOf(chat, a) === 'max' && chat.maxTokens == null ? 1.5 : 1)))),
    contextSize: ctx,
    // Writing a picture prompt or a beat pattern is quick work: one model, no debate.
    level: skill && HIDE_BLOCK.has(skill.output) ? 'quick' : effortOf(chat, a) === 'council' ? 'thorough' : effortOf(chat, a),
    tools: toolsOn(chat, a) || autoTools(chat, a, lastUser?.text),
    gpu: p.gpu,
    effort: p.effort,
    council: effortOf(chat, a) === 'council' && !(skill && HIDE_BLOCK.has(skill.output)),
    councilCloud: Boolean(p.cloudHard),
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
    fresh.classList.remove('msg-in');
    // Update in place: keep every part that hasn't changed (pictures, open panels, the text
    // already shown), and swap only what did. Falls back to a full swap if the shape changed.
    const oldMain = el.querySelector('.msg-main');
    const newMain = fresh.querySelector('.msg-main');
    if (oldMain && newMain && oldMain.children.length === newMain.children.length && el.className.replace(' msg-in', '') === fresh.className) {
      [...newMain.children].forEach((n, k) => {
        const o = oldMain.children[k];
        if (o.outerHTML === n.outerHTML) return;
        if (o.tagName === n.tagName && o.className === n.className && n.classList.contains('bubble')) o.innerHTML = n.innerHTML;
        else o.replaceWith(n.cloneNode(true));
      });
    } else el.replaceWith(fresh);
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
    case 'text': if (!alt.text && alt.t0 && alt.ttft == null) alt.ttft = Date.now() - alt.t0; alt.text += ev.text; alt.status = ''; break;
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
    case 'council': alt.council = { agreement: ev.agreement, members: ev.members || [] }; break;
    case 'stats': alt.stats = { tps: ev.tps, tokens: ev.tokens }; if (ev.minDigitP != null) alt.minDigitP = ev.minDigitP; if (ev.finish === 'length') toast('The answer hit the length limit. Press Continue for more.'); break;
    case 'error':
    case 'done': {
      if (ev.type === 'error') {
        if (alt.text) alt.text += `\n\n_(Stopped: ${ev.message})_`; else alt.error = ev.message;
      } else if (ev.aborted && !alt.text) {
        msg.alts.splice(msg.altIndex, 1);
        if (!msg.alts.length) chat.messages = chat.messages.filter((m) => m !== msg); else msg.altIndex = msg.alts.length - 1;
      }
      if (ev.type === 'done' && alt.text && !isMakerSkill(alt)) alt.text = humanize(alt.text); // no chatbot leftovers
      delete alt.status;
      if (alt.t0) { alt.ms = Date.now() - alt.t0; delete alt.t0; }
      const sourcesFull = pending.sources;
      const fuOk = ev.type === 'done' && !ev.aborted && alt.text && !alt.error && !isMakerSkill(alt) && chat.messages.at(-1) === msg && S.data.prefs.smartFollowups !== false;
      if (fuOk) alt.fuPending = true;
      pending = null;
      chat.updated = now();
      save();
      if (S.route.view === 'chat') render(); else renderChatList();
      const maker = isMakerSkill(alt);
      const ok = ev.type === 'done' && !ev.aborted;
      (async () => {
        // Free checks first (maths, code, web pages): a wrong answer is corrected straight away.
        if (ok && alt.text && (!maker || maker.output === 'app') && await autoChecks(chat, msg, alt).catch(() => false)) return;
        if (ok && !maker) { maybeTip(chat, msg, alt); if (alt.tip) paintStreaming(chat, msg); }
        if (fuOk) writeFollowups(chat, msg, alt);
        if (ok && maker && MEDIA_OUTPUTS.has(maker.output)) runSkillMedia(chat, msg, alt, maker);
        else if (ok && maker && AFTER_OUTPUTS.has(maker.output) && alt.text) runAfterText(chat, msg, alt, maker);
        else if (ok && alt.text && !maker && (alt.forceFact || factOn(chat, assistantById(chat.assistantId)))) factCheck(chat, msg, alt, sourcesFull);
        else if (ok && alt.text && !maker) unsureCheck(chat, msg, alt);
      })();
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
  else if (act === 'share') shareAnswer(chat, m);
  else if (act === 'up' || act === 'down') rateAnswer(chat, m, act);
  else if (act === 'uncensored') askUncensored(chat, m);
  else if (act === 'fix') { if (pending) { toast('Wait for the answer to finish first.'); return; } const alt = m.alts[m.altIndex]; if (alt.check?.text) generate(chat, m, alt.target, { fix: alt.check.text }); }
  else if (act === 'speak') speakMessage(m);
  else if (act === 'other') tryOtherMenu(chat, m, el);
  else if (act === 'branch') branchChat(chat, m.id);
  else if (act === 'doc') openDoc(chat, msgText(m).replace(/<think>[\s\S]*?<\/think>/g, '').trim(), answerTitle(chat, m));
  else if (act === 'dl') exportAnswer(chat, m, document.querySelector(`[data-act="dl"][data-id="${id}"]`)?.dataset.fmt);
  else if (act === 'saveas') saveAsMenu(chat, m, el || document.querySelector(`[data-act="more"][data-id="${id}"]`));
  else if (act === 'more') moreMenu(chat, m, el);
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

// Used by Create and Library: start a chat with something attached.
function chatWithAttachment(att, text, assistantId) {
  newChat(assistantId);
  const chat = chatById(S.route.id);
  drafts[chat.id] = [att];
  chat.draft = text || '';
  render();
}

// ---------- double-checking ----------
// A second, different model checks the answer claim by claim, with the same sources and files.

const checks = new Map(); // requestId -> { chatId, msgId, alt }
const stackOf = (target) => S.stacks.find((x) => `stack:${x.id}` === target);
const factOn = (chat, a) => effortOf(chat, a) === 'max' || Boolean(chat.factCheck ?? a.factCheck ?? S.data.prefs.factCheck) || Boolean(stackOf(resolveTarget(chat, a))?.members.cloudCheck && !S.config?.offline);
const checkRunning = (m) => [...checks.values()].some((c) => c.msgId === m.id);

function membersOf(target) {
  if (!target.startsWith('stack:')) return [target];
  const st = S.stacks.find((x) => `stack:${x.id}` === target);
  return st ? [st.members.vision, ...(st.members.drafters || []), st.members.judge].filter(Boolean) : [];
}

// Picks the checker: your choice in Settings, else the QUICKEST good checker. A second model that
// didn't write the answer is best, but loading a big model can take longer than the check itself,
// so a model that's already in memory (often the one that just answered, whose reading of the chat
// is still cached) wins unless another is clearly as quick.
let loadedFiles = new Set();
function pickChecker(answerTarget) {
  const used = new Set(membersOf(answerTarget));
  const own = stackOf(answerTarget)?.members.cloudCheck;
  if (own && targetValid(own) && !used.has(own)) return own;
  const pref = S.data.prefs.factChecker;
  if (pref && targetValid(pref) && !used.has(pref)) return pref;
  const info = (target) => {
    if (target.startsWith('api:')) return { q: 9, sec: S.config?.offline ? Infinity : 6 };
    const inst = S.installed.find((m) => `local:${m.id}` === target);
    if (!inst || inst.kind !== 'text') return null;
    const q = S.catalog.text.find((c) => c.id === inst.catalogId)?.judge ?? 5;
    const wps = S.speed?.targets?.[target]?.wps || 5;
    const loaded = loadedFiles.has(inst.files?.model);
    return { q, sec: (loaded ? 0 : 4 + (inst.size || 4e9) / 1e9 * 1.5) + 300 / wps, loaded };
  };
  const self = [...used].map((t) => ({ t, ...info(t) })).filter((x) => x.q != null && x.sec != null).sort((a, b) => b.loaded - a.loaded || a.sec - b.sec)[0];
  const others = S.targets.filter((t) => !t.stack && !used.has(t.target)).map((t) => ({ t: t.target, ...info(t.target) })).filter((x) => x.q != null && x.q >= 5);
  // Another model if it's about as quick as checking with what's loaded; else the loaded one.
  const best = others.sort((a, b) => a.sec - b.sec || b.q - a.q)[0];
  if (best && (!self || best.sec <= self.sec * 1.5 + 3)) return best.t;
  if (self) return self.t;
  const st = S.stacks.find((x) => `stack:${x.id}` === answerTarget);
  return st?.members.judge || [...used][0] || answerTarget;
}

const CHECK_PROMPT = `You are a rigorous, impartial fact-checker. An AI wrote the answer below. Check it against the sources and files provided (when given) and your own knowledge. Be quick and brief.
- Pick out the key factual claims (at most 8): facts, numbers, calculations, dates, names, quotes, code behaviour, conclusions.
- Recompute any arithmetic yourself. Don't trust the answer's confidence; don't invent facts; if something can't be verified, say so.
Reply in exactly this format, starting with the verdict, one short line per claim (under 15 words):
VERDICT: Accurate | Mostly accurate | Has errors | Can't verify
CONFIDENCE: <0-100>%
### Claims
- ✅ <claim> — <why, briefly>
- ⚠️ <claim> — <why it is uncertain>
- ❌ <claim> — <what is wrong; the correct information>
### Corrections
<Only if anything is wrong: the corrected facts in one or two sentences. Otherwise "None needed.">`;

async function factCheck(chat, msg, alt, sources) {
  try { const r = await qs.call('models:list'); loadedFiles = new Set((r.running || []).filter((x) => x.ready).map((x) => x.file)); } catch {}
  const checker = pickChecker(alt.target || resolveTarget(chat, assistantById(chat.assistantId)));
  if (!checker) { toast('Install a second model to double-check with.'); return; }
  const idx = chat.messages.indexOf(msg);
  const q = [...chat.messages.slice(0, idx)].reverse().find((m) => m.role === 'user');
  const qText = q ? (q.text || '') : '';
  const files = (q?.attachments || []).filter((x) => x.type === 'doc').map((d) => `<file name="${d.name}">\n${d.text.slice(0, 16000)}\n</file>`).join('\n');
  const media = (q?.attachments || []).filter((x) => x.type !== 'doc').map((x) => x.name);
  const src = (sources || []).slice(0, 6).map((s, k) => `<source number="${k + 1}" title="${s.title}"${s.url ? ` url="${s.url}"` : ''}>\n${(s.text || '').slice(0, 2500)}\n</source>`).join('\n');
  const user = `## Question\n${qText || '(no text)'}\n${media.length ? `\n(The user also attached: ${media.join(', ')}. You can't see these; judge claims about them as "can't verify" unless the answer quotes them consistently.)\n` : ''}${files ? `\n## Files the user provided\n${files}\n` : ''}${src ? `\n## Sources\n${src}\n` : ''}\n## Answer to check\n${alt.text}`;
  alt.check = { target: checker, text: '', running: true };
  if (S.data.prefs.factPanelPinned || factPanel?.chatId === chat.id) factPanel = { chatId: chat.id, msgId: msg.id };
  const requestId = uid();
  checks.set(requestId, { chatId: chat.id, msgId: msg.id, alt });
  if (S.route.view === 'chat' && S.route.id === chat.id) render();
  // Quick effort: no long "thinking" first, one model (not a whole team), short reply.
  qs.sendChat({ requestId, target: checker, messages: [{ role: 'system', content: CHECK_PROMPT }, { role: 'user', content: user }], temperature: 0.1, maxTokens: 900, contextSize: Math.max(16384, Number(S.data.prefs.contextSize) || 16384), gpu: S.data.prefs.gpu, effort: 'quick', level: 'quick' });
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
  if (ch.error) { kind = 'pink'; label = 'Double-check failed'; }
  else if (ch.running) { kind = 'run'; label = `Double-checking…${n.ok + n.warn + n.bad ? ` ${n.ok + n.warn + n.bad} claims so far` : ''}`; }
  else label = `${p.verdict || 'Checked'}${p.confidence != null ? ` · ${p.confidence}%` : ''}`;
  if (ch.running && !(n.ok + n.warn + n.bad) && etaFor(ch.target, WORDS.check) != null) label += ` (${etaLabel(etaFor(ch.target, WORDS.check))})`;
  const flags = !ch.running && !ch.error ? `${n.bad ? `<span class="fc-n bad">${n.bad} ❌</span>` : ''}${n.warn ? `<span class="fc-n warn">${n.warn} ⚠️</span>` : ''}${!n.bad && !n.warn && n.ok ? `<span class="fc-n ok">${n.ok} ✅</span>` : ''}` : '';
  return `<button class="fact-chip k-${kind} ${active}" data-act="factopen" data-id="${m.id}" title="Open the double-check beside the chat">
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
  return `<aside class="fact-panel" id="fact-panel" aria-label="Double-check">
    <div class="fp-head">
      <span class="fp-title">${icon('shield', 18)} Double-check</span>
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
      ${!ch.running && !ch.error && (n.bad || n.warn) ? `<button class="btn small primary" data-fp="fix" data-id="${m.id}" title="Write a new answer that fixes what the check found">${icon('check', 15)} Fix it</button>` : ''}
    </div>
  </aside>`;
}

function paintFactPanel(chat) {
  if (S.route.view !== 'chat' || S.route.id !== chat.id || docOpen(chat)) return;
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
  else if (act === 'pin') { S.data.prefs.factPanelPinned = !S.data.prefs.factPanelPinned; if (cur) factPanel = { chatId: chat.id, msgId: cur.id }; save(); toast(S.data.prefs.factPanelPinned ? 'Double-check stays open and follows each new answer.' : 'Double-check opens when you click a result.'); }
  else if (act === 'prev' || act === 'next') { const m = list[list.indexOf(cur) + (act === 'next' ? 1 : -1)]; if (m) { factPanel = { chatId: chat.id, msgId: m.id }; document.querySelector(`[data-msg="${m.id}"]`)?.scrollIntoView({ behavior: 'smooth', block: 'center' }); } }
  else if (act === 'jump') { const el = document.querySelector(`[data-msg="${id}"]`); el?.scrollIntoView({ behavior: 'smooth', block: 'center' }); el?.classList.add('flash'); setTimeout(() => el?.classList.remove('flash'), 1200); return; }
  else if (act === 'recheck' || act === 'fix') { messageAction(chat, act, id); return; }
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
    if (ev.type === 'error') ch.error = `Double-check failed: ${ev.message}`;
    ch.running = false;
    checks.delete(requestId);
    save();
    if (!ch.error && !checkCounts(ch.text).bad && /accurate/i.test(parseCheck(ch.text).verdict) && !/mostly/i.test(parseCheck(ch.text).verdict)) { rememberAnswer(chat, msg, c.alt); learnSignal(jobOfMsg(chat, msg), c.alt.target, 'up', 0.5); }
    if (!ch.error && checkCounts(ch.text).bad) learnSignal(jobOfMsg(chat, msg), c.alt.target, 'down', 1);
    // Self-correction: a definite error in the last answer gets fixed straight away, once.
    if (!ch.error && checkCounts(ch.text).bad && S.data.prefs.autoFix !== false && !c.alt.fixed && !msg.autoFixed && !pending && chat.messages[chat.messages.length - 1] === msg && msg.alts[msg.altIndex] === c.alt) {
      msg.autoFixed = true;
      toast('The double-check found a mistake, so the answer is being corrected.');
      generate(chat, msg, c.alt.target, { fix: ch.text });
      return;
    }
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

// 👍 / 👎 on answers. Besides marking the answer, it teaches Automatic which model does best on
// this kind of question for you (see learnBonus in simple.js).
function rateAnswer(chat, m, v) {
  const alt = m.alts[m.altIndex];
  if (!alt?.target) return;
  const a = assistantById(chat.assistantId);
  const q = [...chat.messages.slice(0, chat.messages.indexOf(m))].reverse().find((x) => x.role === 'user');
  const job = alt.job || jobOfQuestion(q?.text || '', a);
  const learn = (S.data.learn ||= {});
  const rec = ((learn[job] ||= {})[alt.target] ||= { up: 0, down: 0 });
  if (alt.rating) rec[alt.rating] = Math.max(0, rec[alt.rating] - 1);
  alt.rating = alt.rating === v ? null : v;
  alt.job = job;
  if (alt.rating) rec[alt.rating]++;
  if (alt.rating === 'up') rememberAnswer(chat, m, alt); else forgetAnswer(chat, m);
  save();
  paintStreaming(chat, m);
  if (alt.rating === 'up') toast('Thanks: Automatic will lean on this model more for questions like this.');
  else if (alt.rating === 'down') toast('Noted: Automatic will try other models more for questions like this. You can also click “Try another model”.', 5000);
}
