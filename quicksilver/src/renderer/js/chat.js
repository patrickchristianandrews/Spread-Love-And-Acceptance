// Chat: assistants, any model or stack, photos/video/documents, library and web sources.
'use strict';

let pending = null;          // { requestId, chatId, msgId }
const drafts = {};           // chatId -> attachments waiting to be sent
let paintQueued = false;

const STARTERS = {
  general: ['Plan a productive week around three big goals', 'Explain how compound interest works with an example', 'Draft a polite email declining a meeting'],
  office: ['Attach a spreadsheet and ask: what are the key trends?', 'Turn these meeting notes into action items with owners', 'Write a one-page project status report'],
  research: ['Search my library: what does our policy say about travel?', 'Compare the pros and cons of heat pumps vs gas boilers, with sources', 'Summarise the attached PDF in 10 bullet points'],
  coding: ['Write a Python script that renames photos by date taken', 'Review this function for bugs and edge cases', 'Explain what a REST API is with a small example'],
  vision: ['Attach a photo: what is in this picture?', 'Attach a screenshot of a chart and extract the numbers', 'Attach a short video and describe what happens'],
  fast: ['Give me 5 dinner ideas with what I have: eggs, rice, spinach', 'Summarise this paragraph in one sentence', 'Quick: convert 72°F to °C'],
};

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
    return `<div class="chat">
      <div class="chat-top">
        <span class="emoji-badge">${esc(a.emoji)}</span>
        <select id="pick-assistant" aria-label="Assistant">${S.data.assistants.map((x) => `<option value="${x.id}" ${x.id === a.id ? 'selected' : ''}>${esc(x.name)}</option>`).join('')}</select>
        <select id="pick-model" aria-label="Model or stack">${S.targets.length ? targetOptions(target) : '<option value="">No models yet</option>'}<option value="__get">＋ Get more models…</option></select>
        <span class="grow"></span>
        <button class="btn small ${lib ? 'on' : ''}" id="tog-lib" title="Search your knowledge bases and cite them">📚 Knowledge ${lib ? 'on' : 'off'}</button>
        <button class="btn small ${web ? 'on' : ''}" id="tog-web" title="Search the web and cite sources">🌐 Web ${web ? 'on' : 'off'}</button>
        <select id="pick-effort" aria-label="Effort" title="How hard the AI works: quicker or more thorough" style="width:auto">${Object.entries(EFFORTS).map(([k, e]) => `<option value="${k}" ${k === effortOf(chat, a) ? 'selected' : ''}>${e}</option>`).join('')}</select>
        <button class="btn small ${fact ? 'on' : ''}" id="tog-fact" title="After each answer, a second model checks it claim by claim">✅ Fact check ${fact ? 'on' : 'off'}</button>
        <button class="btn small" id="chat-more" title="Pin, rename, export or delete this chat" aria-label="More options">⋯</button>
      </div>
      <div class="messages" id="messages">${chat.messages.length ? chat.messages.map((m, i) => messageHTML(chat, a, m, i)).join('') : welcomeHTML(a)}</div>
      <div class="composer" id="composer">
        <div class="composer-inner">
          <div class="attach-row" id="att-row">${attachmentsHTML(drafts[chat.id] || [], true)}</div>
          <textarea id="input" rows="2" placeholder="Message ${esc(a.name)}… (Enter to send, Shift+Enter for a new line)" aria-label="Message"></textarea>
          <div class="tools">
            <label class="btn small" title="Attach photos, videos or documents">📎 Attach<input type="file" id="file-in" multiple hidden accept="image/*,video/*,.pdf,.docx,.xlsx,.xlsm,.csv,.tsv,.pptx,.txt,.md,.json,.html,.htm,.xml,.js,.ts,.py,.java,.c,.cpp,.cs,.go,.rs,.rb,.php,.sql"></label>
            <span class="small muted grow">Drop or paste photos, videos, PDFs, Word, Excel and PowerPoint files.</span>
            <span class="small muted">${esc(targetLabel(target))}</span>
            <button class="btn primary" id="send">${pending?.chatId === chat.id ? '■ Stop' : 'Send ➤'}</button>
          </div>
        </div>
      </div>
    </div>`;
  },
  bind: bindChat,
};

function welcomeHTML(a) {
  const starters = STARTERS[a.job] || STARTERS.general;
  const none = !S.targets.length;
  return `<div class="welcome">
    <div class="emoji-badge" style="width:72px;height:72px;font-size:2.4rem;margin:0 auto 12px;border-radius:20px">${esc(a.emoji)}</div>
    <h1>${esc(a.name)}</h1>
    <p class="muted" style="font-size:1.05rem;font-weight:600">${esc(a.description || '')}</p>
    ${none ? `<div class="notice info" style="text-align:left;margin-top:16px"><b>Let's get you set up.</b> Quicksilver runs AI on your own PC. The <b>Stack Advisor</b> checks your computer and downloads the best free models for the job, in one click. No account or key needed.
      <div class="row" style="margin-top:10px"><button class="btn primary" data-goto="stacks">Open the Stack Advisor</button><button class="btn" data-goto="models">Browse models</button></div></div>` : ''}
    <div class="starters">${starters.map((s) => `<button class="starter" data-starter="${esc(s)}">${esc(s)}</button>`).join('')}</div>
  </div>`;
}

function attachmentsHTML(list, removable) {
  return list.map((att, i) => {
    const icon = { spreadsheet: '📊', code: '💻', document: '📄' }[att.kind] || '📄';
    const thumb = att.type === 'image' ? `<img src="${att.dataUrl}" alt="">` : att.type === 'video' ? `<img src="${att.frames?.[0]?.dataUrl || ''}" alt="">` : `<span class="thumb">${icon}</span>`;
    const sub = att.type === 'video' ? `${att.frames.length} frames · ${att.duration.toFixed(1)} s` : att.type === 'doc' ? `${att.kind} · ${Math.round(att.text.length / 1000)}k chars` : 'photo';
    return `<div class="attach" title="${esc(att.name)}">${thumb}<span class="grow"><div style="white-space:nowrap;overflow:hidden;text-overflow:ellipsis">${esc(att.name)}</div><div class="small muted">${esc(sub)}</div></span>${removable ? `<button class="x" data-unattach="${i}" title="Remove">✕</button>` : ''}</div>`;
  }).join('');
}

function stepsHTML(alt, streaming) {
  if (!alt.steps?.length) return '';
  const roleBadge = { vision: '<span class="badge b-sky">👁 Sees</span>', draft: '<span class="badge b-lav">✏️ Drafts</span>', lead: '<span class="badge b-mint">★ Lead</span>' };
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
  const body = alt.error ? esc(alt.error)
    : !alt.text && streaming ? `<span class="status-line">${esc(alt.status || 'Thinking…')}</span>`
    : markdown(alt.text || '');
  const tools = [];
  if (m.alts.length > 1) tools.push(`<button class="tool" data-act="prev" data-id="${m.id}" aria-label="Previous answer">‹</button><span class="small muted">${m.altIndex + 1} / ${m.alts.length}</span><button class="tool" data-act="next" data-id="${m.id}" aria-label="Next answer">›</button>`);
  if (!pending) {
    if (isLast) tools.push(`<button class="tool" data-act="regen" data-id="${m.id}">↻ Regenerate</button><button class="tool" data-act="continue" data-id="${m.id}">Continue</button>`);
    if (alt.text && !alt.check && !checkRunning(m)) tools.push(`<button class="tool" data-act="check" data-id="${m.id}">✅ Fact check</button>`);
    tools.push(`<button class="tool" data-act="copy" data-id="${m.id}">Copy</button><button class="tool" data-act="del" data-id="${m.id}">Delete</button>`);
  }
  return `<div class="msg assistant" data-msg="${m.id}">
    <div class="who-line"><span>${esc(a.emoji)} ${esc(a.name)}</span>${alt.target ? `<span class="badge b-lav">${esc(targetLabel(alt.target))}</span>` : ''}${alt.stats?.tps ? `<span class="badge b-mint">${Math.round(alt.stats.tps * 0.75)} words/s</span>` : ''}</div>
    ${stepsHTML(alt, streaming)}
    ${alt.reasoning ? `<details class="think"><summary>💭 Thinking${streaming && !alt.text ? '…' : ''}</summary><div>${esc(alt.reasoning)}</div></details>` : ''}
    <div class="bubble md ${streaming ? 'streaming' : ''} ${alt.error ? 'error' : ''}">${body}</div>
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
  input.addEventListener('input', () => { chat.draft = input.value; grow(); save(); });
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendOrStop(); } });
  $('#send').addEventListener('click', sendOrStop);
  $$('[data-goto]').forEach((b) => b.addEventListener('click', () => go({ view: b.dataset.goto })));
  $$('[data-starter]').forEach((b) => b.addEventListener('click', () => { input.value = b.dataset.starter; chat.draft = input.value; input.focus(); grow(); }));
  $('#pick-assistant').addEventListener('change', (e) => { chat.assistantId = e.target.value; S.data.prefs.lastAssistant = e.target.value; save(); render(); });
  $('#pick-model').addEventListener('change', (e) => {
    if (e.target.value === '__get') { go({ view: 'stacks' }); return; }
    chat.target = e.target.value; save(); render();
  });
  $('#tog-lib').addEventListener('click', () => { chat.library = !(chat.library ?? a.library); save(); render(); });
  $('#tog-web').addEventListener('click', () => {
    const next = !(chat.web ?? a.web);
    if (next && S.config?.web?.provider === 'none') toast('Turn on a web search service in Settings → Web search first.');
    chat.web = next; save(); render();
  });
  $('#pick-effort').addEventListener('change', (e) => { chat.effort = e.target.value; save(); render(); });
  $('#tog-fact').addEventListener('click', () => { chat.factCheck = !factOn(chat, a); save(); render(); });
  $('#chat-more').addEventListener('click', (e) => { e.stopPropagation(); chatMenu(e.currentTarget, chat); });
  $('#messages').addEventListener('click', (e) => { const b = e.target.closest('[data-act]'); if (b) messageAction(chat, b.dataset.act, b.dataset.id); });
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
    chat.messages.push({ id: uid(), role: 'user', text, attachments: atts });
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
        drafts[chat.id].push({ type: 'image', name: f.name || 'pasted image', dataUrl: await shrinkImage(await readDataUrl(f)) });
      } else if (f.type.startsWith('video/') || /\.(mp4|mov|webm|mkv|m4v)$/i.test(f.name)) {
        toast(`Reading frames from ${f.name}…`);
        const url = URL.createObjectURL(f);
        const { duration, frames } = await videoFrames(url);
        URL.revokeObjectURL(url);
        drafts[chat.id].push({ type: 'video', name: f.name, duration, frames });
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

async function gatherSources(chat, a, query) {
  const out = [];
  if ((chat.library ?? a.library) && query) {
    try {
      const r = await qs.call('kb:search', query, Number(S.data.prefs.sourcesPerAnswer) || 8, a.knowledge || []);
      for (const x of r.results) out.push({ title: x.title, text: x.text, path: x.path, url: x.url });
      if (r.failures.length) toast(`Some sources didn't respond: ${r.failures.join('; ')}`, 6000);
    } catch (err) { toast(`Knowledge: ${err.message}`); }
  }
  if ((chat.web ?? a.web) && query && S.config?.web?.provider !== 'none') {
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
  const requestId = uid();
  pending = { requestId, chatId: chat.id, msgId: msg.id };
  chat.updated = now();
  render();

  const p = S.data.prefs;
  const lastUser = [...chat.messages.slice(0, upTo)].reverse().find((m) => m.role === 'user');
  if ((chat.library ?? a.library) || (chat.web ?? a.web)) { alt.status = 'Searching sources…'; paintStreaming(chat, msg); }
  const sources = await gatherSources(chat, a, lastUser?.text || '');
  alt.sources = sources.map(({ title, url, path }) => ({ title, url, path }));
  pending.sources = sources;
  const ctx = Number(a.contextSize || p.contextSize) || 16384;
  const docBudget = Math.max(4000, Math.floor((ctx * 3 * 0.6) / Math.max(1, chat.messages.slice(0, upTo).reduce((n, m) => n + (m.attachments || []).filter((x) => x.type === 'doc').length, 0))));
  const messages = [{ role: 'system', content: systemPrompt(a, sources, Boolean(a.strict && (chat.library ?? a.library))) }];
  for (const m of chat.messages.slice(0, upTo)) {
    if (m.role === 'user') messages.push({ role: 'user', content: userContent(m, docBudget) });
    else { const t = msgText(m).trim(); if (t) messages.push({ role: 'assistant', content: t }); }
  }
  if (messages.at(-1).role !== 'user') messages.push({ role: 'user', content: 'Please continue.' });
  if (pending?.requestId !== requestId) return; // stopped while searching
  alt.status = 'Thinking…';
  qs.sendChat({
    requestId, target, messages,
    temperature: Number(a.temperature ?? p.temperature),
    maxTokens: Math.round(Number(a.maxTokens || p.maxTokens) * (effortOf(chat, a) === 'max' ? 1.5 : 1)),
    contextSize: ctx,
    level: effortOf(chat, a),
    gpu: p.gpu,
    effort: p.effort,
  });
}

function paintStreaming(chat, msg) {
  if (S.route.view !== 'chat' || S.route.id !== chat.id || paintQueued) return;
  paintQueued = true;
  requestAnimationFrame(() => {
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
      if (ev.type === 'done' && !ev.aborted && alt.text && factOn(chat, assistantById(chat.assistantId))) factCheck(chat, msg, alt, sourcesFull);
      return;
    }
    default: break;
  }
  paintStreaming(chat, msg);
});

function messageAction(chat, act, id) {
  const idx = chat.messages.findIndex((m) => m.id === id);
  const m = chat.messages[idx];
  if (!m) return;
  if (act === 'prev' || act === 'next') { if (pending) return; m.altIndex = (m.altIndex + (act === 'next' ? 1 : -1) + m.alts.length) % m.alts.length; save(); render(); }
  else if (act === 'regen') generate(chat, m);
  else if (act === 'continue') { chat.messages.push({ id: uid(), role: 'user', text: 'Continue.', attachments: [] }); generate(chat, null); }
  else if (act === 'copy') { navigator.clipboard?.writeText(msgText(m)); toast('Copied.'); }
  else if (act === 'check' || act === 'recheck') { const alt = m.alts[m.altIndex]; delete alt.check; factCheck(chat, m, alt); }
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

function checkHTML(m, alt) {
  const ch = alt.check;
  if (!ch) return '';
  const p = parseCheck(ch.text || '');
  const counts = { ok: (ch.text.match(/✅/g) || []).length, warn: (ch.text.match(/⚠️/g) || []).length, bad: (ch.text.match(/❌/g) || []).length };
  return `<details class="card" style="padding:10px 14px;border-color:var(--line)" ${ch.running || p.kind === 'pink' ? 'open' : ''}>
    <summary class="row" style="cursor:pointer;list-style:none">
      <b>✅ Fact check</b>
      ${p.verdict ? `<span class="badge b-${p.kind}">${esc(p.verdict)}${p.confidence != null ? ` · ${p.confidence}% confident` : ''}</span>` : ''}
      ${ch.text ? `<span class="small muted">${counts.ok} ✅ · ${counts.warn} ⚠️ · ${counts.bad} ❌</span>` : ''}
      <span class="small muted grow">checked by ${esc(targetLabel(ch.target))}${ch.running ? ' · checking…' : ''}</span>
      ${!ch.running ? `<button class="tool" data-act="recheck" data-id="${m.id}">Check again</button>` : ''}
    </summary>
    <div class="md" style="margin-top:8px">${ch.error ? `<span style="color:var(--danger);font-weight:700">${esc(ch.error)}</span>` : ch.text ? markdown(p.body) : `<span class="status-line">${esc(ch.status || 'Checking each claim…')}</span>`}</div>
  </details>`;
}

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
    if (S.route.view === 'chat' && S.route.id === chat.id) render();
    return;
  }
  paintStreaming(chat, msg);
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
