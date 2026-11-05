// Quicksilver — the page. Chats, characters and assistants, the Model Hub and the Stack Advisor.
// Talks to the main process only through window.quicksilver.
'use strict';

const api = window.quicksilver;

const CLAUDE_MODELS = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5' },
  { id: 'claude-fable-5-1', label: 'Claude Fable 5.1' },
];

const DEFAULT_SETTINGS = {
  defaultTarget: '',      // 'local:<modelId>' or 'claude:<model>'; empty = first installed model
  roleplayTarget: '',     // model the Stack Advisor picked for characters
  temperature: 0.7,
  contextSize: 8192,
  maxTokens: 2048,
  gpuLayers: 'auto',
  claudeEffort: 'low',
  userName: 'You',
  userPersona: '',
  globalNote: '',
};

// ---------- state ----------

let data = null;          // { version, settings, characters[], chats[] }
let models = { installed: [], catalog: [], jobs: {}, downloading: [] };
let downloads = {};       // id -> { id, name, downloaded, total }
let keyStatus = { hasKey: false };
let route = { view: 'home' };
let tagFilter = null;
let searchText = '';
let pending = null;       // { requestId, chatId, msgId, status }
let advisorJob = null;
let advisorResult = null;
let hw = null;

const $ = (sel, root = document) => root.querySelector(sel);
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const now = () => Date.now();
const gb = (bytes) => `${(bytes / 1024 ** 3).toFixed(bytes > 10 * 1024 ** 3 ? 0 : 1)} GB`;

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.hidden = true; }, 3200);
}

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => api.save(data), 250);
}
window.addEventListener('beforeunload', () => { if (data) { clearTimeout(saveTimer); api.save(data); } });

// ---------- seed ----------

const ASSISTANT_ID = 'quicksilver-assistant';

function seedCharacters() {
  return [
    {
      id: ASSISTANT_ID, createdAt: now(), mode: 'assistant',
      name: 'Quicksilver Assistant', avatar: '', tags: ['Assistant'],
      tagline: 'Your everyday helper for questions, ideas and plans. Runs privately on your PC.',
      personality: 'You are Quicksilver, a helpful, friendly and honest assistant running privately on the user\'s own computer. Give clear, direct answers. Use Markdown (headings, lists, code blocks) when it helps. If you are unsure, say so instead of guessing.',
      scenario: '', firstMessage: '', examples: '',
    },
    {
      id: uid(), createdAt: now(), mode: 'roleplay',
      name: 'Marlow Vance', avatar: '', tags: ['Mystery', 'Noir', 'Detective'],
      tagline: 'A rain-soaked private eye who owes the wrong people money and has just taken your case.',
      personality: 'Dry, observant, tired but stubbornly decent. Talks in clipped sentences and wry metaphors. Notices small details (a scuffed shoe, a nervous hand). Hates being lied to, softens for people who are honest with him.',
      scenario: 'Harbor City, 1947. It is past midnight. {{user}} has climbed three flights of stairs to Marlow\'s cramped office above a closed pawn shop, carrying a problem nobody else will touch.',
      firstMessage: '*The desk lamp buzzes. Marlow doesn\'t look up from the bottle he\'s pretending not to drink from.* "Door\'s open, which means you\'re either desperate or lost." *He finally raises his eyes, taking in your wet coat.* "Desperate, then. Sit. Tell me who you need found."',
      examples: '',
    },
    {
      id: uid(), createdAt: now(), mode: 'roleplay',
      name: 'Pip', avatar: '', tags: ['Fantasy', 'Wholesome', 'Companion'],
      tagline: 'A tiny, over-enthusiastic forest sprite who has decided you are her new best friend.',
      personality: 'Bubbly, curious, easily distracted by shiny things, fiercely loyal. Speaks fast, invents words, gives everything nicknames. Secretly worried she is too small to be useful.',
      scenario: '{{user}} is a traveler who has just made camp at the edge of the Glimmerwood, where Pip lives in a hollowed acorn.',
      firstMessage: '*A glowing speck zips out of the ferns and stops an inch from your nose.* "Oh! Oh oh oh! A big-folk! Are you lost? Are you hungry? Do you want to see my rock? It\'s a VERY good rock." *She does a loop in the air.* "I\'m Pip. You\'re… hmm. I\'m going to call you Bootsie until you tell me different."',
      examples: '',
    },
  ];
}

async function init() {
  data = (await api.load()) || { version: 2, settings: {}, characters: seedCharacters(), chats: [] };
  data.settings = { ...DEFAULT_SETTINGS, ...data.settings };
  data.characters ||= [];
  data.chats ||= [];
  for (const c of data.characters) c.mode ||= 'roleplay'; // characters from version 1
  if (!data.characters.some((c) => c.id === ASSISTANT_ID)) data.characters.unshift(seedCharacters()[0]);
  save();

  document.querySelectorAll('[data-nav]').forEach((b) => b.addEventListener('click', () => {
    const n = b.dataset.nav;
    if (n === 'newchat') newChat(charById(ASSISTANT_ID));
    else if (n === 'settings') openSettings();
    else if (n === 'create') go({ view: 'edit' });
    else go({ view: n });
  }));
  $('#dl-mini').addEventListener('click', () => go({ view: 'hub' }));
  $('#modal').addEventListener('mousedown', (e) => { if (e.target.id === 'modal') closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });
  document.addEventListener('click', (e) => {
    const copy = e.target.closest('.copy');
    if (copy) {
      navigator.clipboard?.writeText(copy.parentElement.querySelector('code').textContent);
      copy.textContent = 'Copied';
      setTimeout(() => { copy.textContent = 'Copy'; }, 1200);
    }
  });

  api.onDelta(onDelta);
  api.onDone(onDone);
  api.onError(onError);
  api.onStatus(({ requestId, status }) => {
    if (pending?.requestId !== requestId) return;
    pending.status = status;
    const el = document.querySelector(`[data-msg="${pending.msgId}"] .status-line`);
    if (el) el.textContent = status;
  });
  api.onModelProgress((d) => { downloads[d.id] = d; paintDownloads(); });
  api.onModelDone(async ({ id, model }) => {
    delete downloads[id];
    await refreshModels();
    toast(`${model.name} is ready to use.`);
    if (!data.settings.defaultTarget) { data.settings.defaultTarget = `local:${model.id}`; save(); }
    if (route.view === 'advisor' && advisorJob) runAdvisor(advisorJob, true);
    else render();
  });
  api.onModelError(({ id, message, cancelled }) => {
    delete downloads[id];
    if (!cancelled) toast(message);
    render();
  });

  await refreshModels();
  keyStatus = await api.keyStatus();
  for (const d of models.downloading) downloads[d.id] = d;
  route = models.installed.length || keyStatus.hasKey ? { view: 'home' } : { view: 'advisor' };
  render();
}

async function refreshModels() {
  models = await api.models();
}

// ---------- helpers ----------

const charById = (id) => data.characters.find((c) => c.id === id);
const chatById = (id) => data.chats.find((c) => c.id === id);
const chatsFor = (charId) => data.chats.filter((c) => c.characterId === charId).sort((a, b) => b.updatedAt - a.updatedAt);

function hue(str) {
  let h = 0;
  for (const ch of String(str)) h = (h * 31 + ch.charCodeAt(0)) % 360;
  return h;
}
function avatarStyle(c) {
  if (c.avatar) return `background-image:url("${c.avatar}")`;
  if (c.mode === 'assistant') return 'background:linear-gradient(135deg,#e9eef6,#8a9ab3 55%,#2fb9c6)';
  const h = hue(c.name || '?');
  return `background:linear-gradient(135deg,hsl(${h} 70% 55%),hsl(${(h + 60) % 360} 65% 40%))`;
}
function initials(name) {
  return esc((name || '?').trim().split(/\s+/).map((w) => w[0]).slice(0, 2).join('').toUpperCase());
}
function avatarHTML(c, size) {
  return `<div class="avatar ${size}" style='${avatarStyle(c)}'>${c.avatar ? '' : initials(c.name)}</div>`;
}

function fill(text, char) {
  return String(text || '')
    .replace(/\{\{char\}\}/gi, char?.name || 'Character')
    .replace(/\{\{user\}\}/gi, data.settings.userName || 'You');
}

// Role-play style: *actions* in italics, "speech" highlighted.
function formatRoleplay(text) {
  let s = esc(text);
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*(.+?)\*/gs, '<em class="action">$1</em>');
  s = s.replace(/(&quot;|“)(.+?)(&quot;|”)/gs, '<span class="speech">$1$2$3</span>');
  return s.replace(/\n/g, '<br>');
}

// A small, safe Markdown renderer for assistant answers. Everything is escaped first.
function inlineMd(s) {
  return s
    .replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*])\*([^*\s][^*]*?)\*/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>');
}
function formatMarkdown(text) {
  const out = [];
  const parts = String(text).split(/```/);
  parts.forEach((part, i) => {
    if (i % 2 === 1) {
      const nl = part.indexOf('\n');
      const lang = nl >= 0 ? part.slice(0, nl).trim() : '';
      const code = nl >= 0 ? part.slice(nl + 1) : part;
      out.push(`<pre>${lang ? `<span class="lang">${esc(lang)}</span>` : ''}<code>${esc(code.replace(/\n$/, ''))}</code><button class="copy">Copy</button></pre>`);
      return;
    }
    const lines = esc(part).split('\n');
    let list = null;
    let para = [];
    const flushPara = () => { if (para.length) { out.push(`<p>${inlineMd(para.join('<br>'))}</p>`); para = []; } };
    const flushList = () => { if (list) { out.push(`<${list.tag}>${list.items.map((x) => `<li>${inlineMd(x)}</li>`).join('')}</${list.tag}>`); list = null; } };
    for (const line of lines) {
      let m;
      if (!line.trim()) { flushPara(); flushList(); continue; }
      if ((m = line.match(/^(#{1,4})\s+(.*)/))) { flushPara(); flushList(); out.push(`<h${m[1].length}>${inlineMd(m[2])}</h${m[1].length}>`); continue; }
      if ((m = line.match(/^\s*[-*•]\s+(.*)/)) || (m = line.match(/^\s*\d+[.)]\s+(.*)/))) {
        const tag = /^\s*\d/.test(line) ? 'ol' : 'ul';
        flushPara();
        if (list && list.tag !== tag) flushList();
        list ||= { tag, items: [] };
        list.items.push(m[1]);
        continue;
      }
      if ((m = line.match(/^&gt;\s?(.*)/))) { flushPara(); flushList(); out.push(`<blockquote>${inlineMd(m[1])}</blockquote>`); continue; }
      flushList();
      para.push(line);
    }
    flushPara(); flushList();
  });
  return out.join('');
}

function ago(t) {
  const s = Math.round((now() - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return new Date(t).toLocaleDateString();
}

const msgText = (m) => (m.role === 'assistant' ? m.alts[m.altIndex] ?? '' : m.text);

// ---------- which model a chat uses ----------

function targetOptions() {
  const opts = models.installed.map((m) => ({ value: `local:${m.id}`, label: `${m.name} (on this PC)` }));
  if (keyStatus.hasKey) for (const c of CLAUDE_MODELS) opts.push({ value: `claude:${c.id}`, label: `${c.label} (cloud)` });
  return opts;
}

function validTarget(t) {
  if (!t) return false;
  if (t.startsWith('local:')) return models.installed.some((m) => `local:${m.id}` === t);
  if (t.startsWith('claude:')) return keyStatus.hasKey;
  return false;
}

function resolveTarget(chat, c) {
  const s = data.settings;
  for (const t of [chat?.target, c?.stack?.target, c?.mode === 'roleplay' ? s.roleplayTarget : '', s.defaultTarget]) {
    if (validTarget(t)) return t;
  }
  return targetOptions()[0]?.value || '';
}

function targetLabel(t) {
  return targetOptions().find((o) => o.value === t)?.label || 'No model';
}

// ---------- routing ----------

function go(r) {
  route = r;
  render();
}

function render() {
  renderRecent();
  paintDownloads();
  document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active', b.dataset.nav === route.view));
  const main = $('#main');
  const views = { home: homeHTML, profile: () => profileHTML(charById(route.id)), edit: () => editHTML(route.id ? charById(route.id) : null), chat: () => chatHTML(chatById(route.id)), hub: hubHTML, advisor: advisorHTML };
  main.innerHTML = (views[route.view] || homeHTML)();
  bind[route.view]?.();
}

function renderRecent() {
  const recent = [...data.chats].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 40);
  $('#recent').innerHTML = recent.length ? recent.map((ch) => {
    const c = charById(ch.characterId);
    if (!c) return '';
    const last = ch.messages[ch.messages.length - 1];
    return `<button class="recent-item ${route.view === 'chat' && route.id === ch.id ? 'active' : ''}" data-chat="${ch.id}">
      ${avatarHTML(c, 'sm')}
      <span class="meta"><div class="name">${esc(c.mode === 'assistant' ? ch.title : c.name)}</div><div class="preview">${esc(last ? msgText(last).replace(/[*#`]/g, '') : ch.title)}</div></span>
    </button>`;
  }).join('') : '<div class="empty" style="padding:10px 12px;text-align:left;font-size:13px">No chats yet.</div>';
  $('#recent').querySelectorAll('[data-chat]').forEach((b) => b.addEventListener('click', () => go({ view: 'chat', id: b.dataset.chat })));
}

function paintDownloads() {
  const list = Object.values(downloads);
  const mini = $('#dl-mini');
  mini.hidden = !list.length;
  if (list.length) {
    const d = list[0];
    const pct = d.total ? Math.round((d.downloaded / d.total) * 100) : 0;
    mini.innerHTML = `Downloading ${esc(d.name)}${list.length > 1 ? ` (+${list.length - 1} more)` : ''}… ${pct}%<div class="bar"><i style="width:${pct}%"></i></div>`;
  }
  for (const d of list) {
    const el = document.querySelector(`[data-dl="${CSS.escape(d.id)}"]`);
    if (!el) continue;
    const pct = d.total ? Math.round((d.downloaded / d.total) * 100) : 0;
    el.querySelector('i').style.width = `${pct}%`;
    el.querySelector('.dl-text').textContent = d.total ? `${gb(d.downloaded)} of ${gb(d.total)} (${pct}%)` : 'Starting…';
  }
}

const bind = {};

// ---------- home ----------

function homeHTML() {
  const tags = [...new Set(data.characters.flatMap((c) => c.tags || []))].sort();
  const q = searchText.toLowerCase();
  const list = data.characters.filter((c) =>
    (!tagFilter || (c.tags || []).includes(tagFilter)) &&
    (!q || [c.name, c.tagline, ...(c.tags || [])].join(' ').toLowerCase().includes(q)));
  return `<div class="page">
    ${noModelBanner()}
    <div class="page-head">
      <h1>Characters &amp; assistants</h1>
      <input class="search" id="search" placeholder="Search" value="${esc(searchText)}">
      <button class="btn" id="import">Import</button>
    </div>
    ${tags.length ? `<div class="tags-filter">${tags.map((t) => `<button class="chip ${tagFilter === t ? 'on' : ''}" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : ''}
    <div class="grid">
      <button class="card new" id="new-card"><span class="plus">+</span>Create a character or assistant</button>
      ${list.map((c) => `<button class="card" data-id="${c.id}">
        <div class="card-art" style='${avatarStyle(c)}'>${c.avatar ? '' : initials(c.name)}</div>
        <div class="card-body">
          <div class="card-name">${esc(c.name)}${c.mode === 'assistant' ? '<span class="badge good">assistant</span>' : ''}</div>
          <div class="card-tag">${esc(fill(c.tagline, c))}</div>
          <div class="card-tags">${(c.tags || []).slice(0, 4).map((t) => `<span>${esc(t)}</span>`).join('')}</div>
        </div>
      </button>`).join('')}
    </div>
    ${!list.length && data.characters.length ? '<div class="empty">Nothing matches.</div>' : ''}
  </div>`;
}

function noModelBanner() {
  if (models.installed.length || keyStatus.hasKey) return '';
  return `<div class="banner" style="margin-bottom:22px">
    <p><b>You don't have a model yet.</b> The Stack Advisor checks your PC and picks the best free model for what you want to do.</p>
    <button class="btn primary" data-goto="advisor">Open Stack Advisor</button>
    <button class="btn" data-goto="hub">Browse models</button>
  </div>`;
}

function bindGoto() {
  document.querySelectorAll('[data-goto]').forEach((b) => b.addEventListener('click', () => go({ view: b.dataset.goto })));
}

bind.home = () => {
  bindGoto();
  const s = $('#search');
  s.addEventListener('input', () => {
    searchText = s.value;
    const pos = s.selectionStart;
    render();
    const n = $('#search'); n.focus(); n.setSelectionRange(pos, pos);
  });
  $('#import').addEventListener('click', importCharacters);
  $('#new-card').addEventListener('click', () => go({ view: 'edit' }));
  document.querySelectorAll('[data-tag]').forEach((b) => b.addEventListener('click', () => {
    tagFilter = tagFilter === b.dataset.tag ? null : b.dataset.tag;
    render();
  }));
  document.querySelectorAll('.card[data-id]').forEach((b) => b.addEventListener('click', () => go({ view: 'profile', id: b.dataset.id })));
};

// ---------- profile ----------

function profileHTML(c) {
  if (!c) return '<div class="page"><div class="empty">Not found.</div></div>';
  const chats = chatsFor(c.id);
  const block = (label, text) => (text ? `<div class="section-label">${label}</div><div class="prose">${esc(fill(text, c))}</div>` : '');
  const stack = c.stack ? `<div class="section-label">Stack</div><div class="prose">${esc(targetLabel(c.stack.target))} · temperature ${c.stack.temperature} · context ${c.stack.contextSize.toLocaleString()} tokens</div>` : '';
  return `<div class="page"><div class="profile">
    <div>${avatarHTML(c, 'lg')}</div>
    <div>
      <h1>${esc(c.name)}</h1>
      <p class="tagline">${esc(fill(c.tagline, c))}</p>
      <div class="actions">
        <button class="btn primary" id="start">Start a new chat</button>
        <button class="btn" id="edit">Edit</button>
        <button class="btn" id="export">Export</button>
        <button class="btn" id="dup">Duplicate</button>
        ${c.id === ASSISTANT_ID ? '' : '<button class="btn danger" id="del">Delete</button>'}
      </div>
      ${chats.length ? `<div class="section-label">Chats</div><div class="chat-list">${chats.map((ch) => `
        <div class="chat-row">
          <button class="grow" data-open="${ch.id}"><div class="title">${esc(ch.title)}</div>
            <div class="sub">${ch.messages.length} messages · ${ago(ch.updatedAt)}</div></button>
          <button class="tool" data-rename="${ch.id}">Rename</button>
          <button class="tool" data-delchat="${ch.id}">Delete</button>
        </div>`).join('')}</div>` : ''}
      ${stack}
      ${block(c.mode === 'assistant' ? 'Instructions' : 'Personality', c.personality)}
      ${block('Scenario', c.scenario)}
      ${block('First message', c.firstMessage)}
    </div>
  </div></div>`;
}

bind.profile = () => {
  const c = charById(route.id);
  if (!c) return;
  $('#start').addEventListener('click', () => newChat(c));
  $('#edit').addEventListener('click', () => go({ view: 'edit', id: c.id }));
  $('#export').addEventListener('click', () => exportCharacter(c));
  $('#dup').addEventListener('click', () => {
    const copy = { ...structuredClone(c), id: uid(), name: `${c.name} (copy)`, createdAt: now() };
    data.characters.unshift(copy); save(); go({ view: 'profile', id: copy.id });
  });
  $('#del')?.addEventListener('click', () => confirmModal(`Delete ${c.name} and all of their chats?`, () => {
    data.characters = data.characters.filter((x) => x.id !== c.id);
    data.chats = data.chats.filter((x) => x.characterId !== c.id);
    save(); go({ view: 'home' });
  }));
  document.querySelectorAll('[data-open]').forEach((b) => b.addEventListener('click', () => go({ view: 'chat', id: b.dataset.open })));
  document.querySelectorAll('[data-rename]').forEach((b) => b.addEventListener('click', () => renameChat(chatById(b.dataset.rename))));
  document.querySelectorAll('[data-delchat]').forEach((b) => b.addEventListener('click', () => confirmModal('Delete this chat?', () => {
    data.chats = data.chats.filter((x) => x.id !== b.dataset.delchat); save(); render();
  })));
};

function newChat(c) {
  const n = chatsFor(c.id).length + 1;
  const chat = {
    id: uid(), characterId: c.id, title: c.mode === 'assistant' ? 'New chat' : `Chat ${n}`,
    createdAt: now(), updatedAt: now(), memory: '', target: '',
    messages: c.firstMessage ? [{ id: uid(), role: 'assistant', alts: [fill(c.firstMessage, c)], altIndex: 0 }] : [],
  };
  data.chats.push(chat); save();
  go({ view: 'chat', id: chat.id });
}

function renameChat(ch) {
  if (!ch) return;
  openModal(`<h2>Rename chat</h2>
    <div class="field"><input id="rn" value="${esc(ch.title)}"></div>
    <div class="form-actions"><button class="btn" data-close>Cancel</button><button class="btn primary" id="ok">Save</button></div>`);
  const input = $('#rn'); input.focus(); input.select();
  const ok = () => { ch.title = input.value.trim() || ch.title; save(); closeModal(); render(); };
  $('#ok').addEventListener('click', ok);
  input.addEventListener('keydown', (e) => { if (e.key === 'Enter') ok(); });
}

// ---------- character / assistant editor ----------

function editHTML(c) {
  const v = c || { name: '', tagline: '', personality: '', scenario: '', firstMessage: '', examples: '', tags: [], avatar: '', mode: 'roleplay' };
  const f = (id, label, help, value, rows, extra = '') => `<div class="field" ${extra}>
    <label for="${id}">${label}</label>${help ? `<span class="help">${help}</span>` : ''}
    ${rows ? `<textarea id="${id}" rows="${rows}">${esc(value)}</textarea>` : `<input id="${id}" value="${esc(value)}">`}
  </div>`;
  const opts = targetOptions();
  return `<div class="page">
    <div class="page-head"><h1>${c ? `Edit ${esc(c.name)}` : 'Create a character or assistant'}</h1></div>
    <div class="form">
      <div class="field">
        <label for="f-mode">Type</label>
        <select id="f-mode">
          <option value="roleplay" ${v.mode === 'roleplay' ? 'selected' : ''}>Character (role-play: stays in character, *actions* and "speech")</option>
          <option value="assistant" ${v.mode === 'assistant' ? 'selected' : ''}>Assistant (follows your instructions, answers with formatting and code)</option>
        </select>
      </div>
      <div class="form-row">
        <div class="avatar-pick">
          <div id="av-preview">${avatarHTML(v.name ? v : { name: '?', avatar: v.avatar, mode: v.mode }, 'lg')}</div>
          <label class="btn" for="av-file">Choose picture</label>
          <input type="file" id="av-file" accept="image/*" hidden>
          <button class="btn ghost" id="av-clear" ${v.avatar ? '' : 'hidden'}>Remove picture</button>
        </div>
        <div class="form">
          ${f('f-name', 'Name', '', v.name)}
          ${f('f-tagline', 'Tagline', 'One or two lines shown on the card.', v.tagline, 2)}
          ${f('f-tags', 'Tags', 'Comma separated, e.g. Fantasy, Comedy, Coding', (v.tags || []).join(', '))}
        </div>
      </div>
      ${f('f-personality', v.mode === 'assistant' ? 'Instructions' : 'Personality', 'Who they are and how they should answer. Use {{char}} and {{user}} as placeholders.', v.personality, 6)}
      ${f('f-scenario', 'Scenario', 'Where and when the story starts, and how {{user}} fits in.', v.scenario, 4, 'data-rp')}
      ${f('f-first', 'First message', 'Their opening line. Put actions in *asterisks* and speech in "quotes".', v.firstMessage, 5)}
      ${f('f-examples', 'Example dialogue (optional)', 'A few sample exchanges that show how they talk.', v.examples, 5, 'data-rp')}
      <div class="field">
        <label for="f-model">Model</label>
        <span class="help">Leave on "Default" to use your default model, or pin a model to this ${v.mode === 'assistant' ? 'assistant' : 'character'}.</span>
        <select id="f-model"><option value="">Default</option>${opts.map((o) => `<option value="${esc(o.value)}" ${v.stack?.target === o.value ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}</select>
      </div>
      <div class="form-actions">
        <button class="btn" id="cancel">Cancel</button>
        <button class="btn primary" id="save">${c ? 'Save changes' : 'Create'}</button>
      </div>
    </div>
  </div>`;
}

bind.edit = () => {
  const existing = route.id ? charById(route.id) : null;
  let avatar = existing?.avatar || '';
  const mode = () => $('#f-mode').value;
  const syncMode = () => document.querySelectorAll('[data-rp]').forEach((el) => { el.hidden = mode() === 'assistant'; });
  syncMode();
  $('#f-mode').addEventListener('change', () => { syncMode(); refreshPreview(); });
  function refreshPreview() {
    $('#av-preview').innerHTML = avatarHTML({ name: $('#f-name').value || '?', avatar, mode: mode() }, 'lg');
    $('#av-clear').hidden = !avatar;
  }
  $('#f-name').addEventListener('input', refreshPreview);
  $('#av-file').addEventListener('change', async (e) => {
    const file = e.target.files[0];
    if (!file) return;
    avatar = await shrinkImage(file, 512);
    refreshPreview();
  });
  $('#av-clear').addEventListener('click', () => { avatar = ''; refreshPreview(); });
  $('#cancel').addEventListener('click', () => go(existing ? { view: 'profile', id: existing.id } : { view: 'home' }));
  $('#save').addEventListener('click', () => {
    const name = $('#f-name').value.trim();
    if (!name) { toast('Give it a name.'); $('#f-name').focus(); return; }
    const target = $('#f-model').value;
    const fields = {
      name, avatar, mode: mode(),
      tagline: $('#f-tagline').value.trim(),
      tags: $('#f-tags').value.split(',').map((t) => t.trim()).filter(Boolean),
      personality: $('#f-personality').value.trim(),
      scenario: mode() === 'assistant' ? '' : $('#f-scenario').value.trim(),
      firstMessage: $('#f-first').value.trim(),
      examples: mode() === 'assistant' ? '' : $('#f-examples').value.trim(),
    };
    const prevStack = existing?.stack;
    fields.stack = target ? { ...(prevStack || { temperature: data.settings.temperature, contextSize: data.settings.contextSize, maxTokens: data.settings.maxTokens }), target } : (prevStack ? { ...prevStack, target: '' } : undefined);
    let id;
    if (existing) { Object.assign(existing, fields); id = existing.id; }
    else { id = uid(); data.characters.unshift({ id, createdAt: now(), ...fields }); }
    save();
    toast(existing ? 'Saved.' : `${name} is ready.`);
    go({ view: 'profile', id });
  });
};

function shrinkImage(file, max) {
  return new Promise((resolve, reject) => {
    const img = new Image();
    img.onload = () => {
      const scale = Math.min(1, max / Math.max(img.width, img.height));
      const canvas = document.createElement('canvas');
      canvas.width = Math.round(img.width * scale);
      canvas.height = Math.round(img.height * scale);
      canvas.getContext('2d').drawImage(img, 0, 0, canvas.width, canvas.height);
      URL.revokeObjectURL(img.src);
      resolve(canvas.toDataURL('image/jpeg', 0.88));
    };
    img.onerror = reject;
    img.src = URL.createObjectURL(file);
  });
}

// ---------- import / export (common "character card" JSON) ----------

function toCard(c) {
  return {
    spec: 'chara_card_v2', spec_version: '2.0',
    data: {
      name: c.name, description: c.personality, personality: '', scenario: c.scenario,
      first_mes: c.firstMessage, mes_example: c.examples, creator_notes: c.tagline, tags: c.tags,
      extensions: { quicksilver: { avatar: c.avatar, mode: c.mode } },
    },
  };
}

function fromCard(obj) {
  const d = obj?.data && obj.spec ? obj.data : obj;
  if (!d || typeof d !== 'object' || !d.name) throw new Error('not a character file');
  const ext = d.extensions?.quicksilver || {};
  return {
    id: uid(), createdAt: now(),
    mode: ext.mode === 'assistant' ? 'assistant' : 'roleplay',
    name: String(d.name),
    avatar: ext.avatar || '',
    tagline: d.creator_notes || d.tagline || '',
    personality: [d.description, d.personality].filter(Boolean).join('\n\n'),
    scenario: d.scenario || '',
    firstMessage: d.first_mes || d.firstMessage || '',
    examples: d.mes_example || d.examples || '',
    tags: Array.isArray(d.tags) ? d.tags.map(String) : [],
  };
}

async function exportCharacter(c) {
  const ok = await api.exportFile(`${c.name.replace(/[^\w -]/g, '')}.json`, JSON.stringify(toCard(c), null, 2));
  if (ok) toast('Exported.');
}

async function importCharacters() {
  const files = await api.importFiles();
  let added = 0;
  for (const text of files) {
    try { data.characters.unshift(fromCard(JSON.parse(text))); added++; }
    catch { toast('One file was not a character file and was skipped.'); }
  }
  if (added) { save(); render(); toast(`Imported ${added}.`); }
}

// ---------- chat ----------

function chatHTML(ch) {
  const c = ch && charById(ch.characterId);
  if (!c) return '<div class="page"><div class="empty">Chat not found.</div></div>';
  const target = resolveTarget(ch, c);
  const opts = targetOptions();
  const empty = !ch.messages.length;
  return `<div class="chat">
    <div class="chat-top">
      <button class="btn ghost" id="back" title="Back">←</button>
      ${avatarHTML(c, 'md')}
      <div class="who"><b>${esc(c.name)}</b><small>${esc(ch.title)}</small></div>
      ${opts.length ? `<select class="model-select" id="model-pick" title="Model for this chat">
        ${opts.map((o) => `<option value="${esc(o.value)}" ${o.value === target ? 'selected' : ''}>${esc(o.label)}</option>`).join('')}
        <option value="__hub">Get more models…</option>
      </select>` : ''}
      ${c.mode === 'roleplay' ? `<button class="btn" id="memory" title="Notes the character always remembers in this chat">Memory${ch.memory ? ' •' : ''}</button>` : ''}
      <button class="btn" id="newchat">New chat</button>
    </div>
    <div class="messages" id="messages">
      ${!opts.length ? noModelBanner() : ''}
      ${empty && opts.length ? `<div class="empty">${c.mode === 'assistant' ? `Ask ${esc(c.name)} anything. It runs on ${esc(targetLabel(target).replace(/ \(.*\)$/, ''))}.` : 'Say hello to start the story.'}</div>` : ''}
      ${ch.messages.map((m, i) => messageHTML(ch, c, m, i)).join('')}
    </div>
    <div class="composer">
      <div class="composer-inner">
        <textarea id="input" rows="1" placeholder="Message ${esc(c.name)}…${c.mode === 'roleplay' ? ' (*asterisks* for actions)' : ''}"></textarea>
        <button class="btn primary" id="send">${pending ? 'Stop' : 'Send'}</button>
      </div>
      <div class="hint">Enter to send · Shift+Enter for a new line · Hover a message to edit, delete or reroll it</div>
    </div>
  </div>`;
}

function messageHTML(ch, c, m, i) {
  const isLast = i === ch.messages.length - 1;
  const streaming = pending && pending.msgId === m.id;
  const name = m.role === 'user' ? data.settings.userName || 'You' : c.name;
  const av = m.role === 'user' ? avatarHTML({ name, avatar: '' }, 'sm') : avatarHTML(c, 'sm');
  const text = msgText(m);
  const tools = [];
  if (m.role === 'assistant' && m.alts.length > 1) {
    tools.push(`<button class="tool" data-act="prev" data-id="${m.id}" title="Previous version">‹</button>
      <span class="swipe-count">${m.altIndex + 1}/${m.alts.length}</span>
      <button class="tool" data-act="next" data-id="${m.id}" title="Next version">›</button>`);
  }
  if (!pending) {
    if (m.role === 'assistant' && isLast) tools.push(`<button class="tool" data-act="reroll" data-id="${m.id}" title="Write a different reply">Reroll</button>`);
    if (m.role === 'assistant' && isLast) tools.push(`<button class="tool" data-act="continue" data-id="${m.id}" title="Ask for more">Continue</button>`);
    if (m.role === 'assistant') tools.push(`<button class="tool" data-act="copy" data-id="${m.id}">Copy</button>`);
    tools.push(`<button class="tool" data-act="edit" data-id="${m.id}">Edit</button>`);
    tools.push(`<button class="tool" data-act="del" data-id="${m.id}">Delete</button>`);
  }
  const md = c.mode === 'assistant' && m.role === 'assistant';
  const body = m.error ? esc(m.error)
    : streaming && !text ? `<span class="status-line">${esc(pending.status || 'Thinking…')}</span>`
    : md ? formatMarkdown(text) : formatRoleplay(text);
  return `<div class="msg ${m.role}" data-msg="${m.id}">
    ${av}
    <div class="stack">
      <div class="label">${esc(name)}</div>
      <div class="bubble ${md ? 'md' : ''} ${streaming ? 'typing' : ''} ${m.error ? 'error' : ''}">${body}</div>
      <div class="msg-tools ${isLast && m.role === 'assistant' ? 'always' : ''}">${tools.join('')}</div>
    </div>
  </div>`;
}

function scrollToBottom() {
  const box = $('#messages');
  if (box) box.scrollTop = box.scrollHeight;
}

bind.chat = () => {
  const ch = chatById(route.id);
  if (!ch) return;
  const c = charById(ch.characterId);
  bindGoto();
  const input = $('#input');
  const grow = () => { input.style.height = 'auto'; input.style.height = Math.min(input.scrollHeight, 220) + 'px'; };
  input.value = ch.draft || '';
  grow();
  input.addEventListener('input', () => { ch.draft = input.value; grow(); save(); });
  input.addEventListener('keydown', (e) => {
    if (e.key === 'Enter' && !e.shiftKey && !e.isComposing) { e.preventDefault(); sendOrStop(); }
  });
  $('#send').addEventListener('click', sendOrStop);
  $('#back').addEventListener('click', () => go({ view: 'profile', id: c.id }));
  $('#newchat').addEventListener('click', () => newChat(c));
  $('#memory')?.addEventListener('click', () => editMemory(ch));
  $('#model-pick')?.addEventListener('change', (e) => {
    if (e.target.value === '__hub') { go({ view: 'hub' }); return; }
    ch.target = e.target.value; save();
  });
  $('#messages').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (b) messageAction(ch, b.dataset.act, b.dataset.id);
  });
  scrollToBottom();
  if (!pending) input.focus();

  function sendOrStop() {
    if (pending) { api.abort(pending.requestId); return; }
    if (!resolveTarget(ch, c)) { toast('Get a model first: open the Stack Advisor or the Model Hub.'); return; }
    const text = input.value.trim();
    if (!text) {
      if (ch.messages.length && ch.messages[ch.messages.length - 1].role === 'user') generate(ch, null);
      return;
    }
    ch.messages.push({ id: uid(), role: 'user', text });
    if (c.mode === 'assistant' && ch.title === 'New chat') ch.title = text.length > 48 ? `${text.slice(0, 46)}…` : text;
    ch.draft = '';
    input.value = '';
    generate(ch, null);
  }
};

function messageAction(ch, act, id) {
  const idx = ch.messages.findIndex((m) => m.id === id);
  const m = ch.messages[idx];
  if (!m) return;
  if (act === 'prev' || act === 'next') {
    if (pending) return;
    m.altIndex = (m.altIndex + (act === 'next' ? 1 : -1) + m.alts.length) % m.alts.length;
    save(); render();
  } else if (act === 'reroll') {
    generate(ch, m);
  } else if (act === 'continue') {
    ch.messages.push({ id: uid(), role: 'user', text: '(Continue.)' });
    generate(ch, null);
  } else if (act === 'copy') {
    navigator.clipboard?.writeText(msgText(m));
    toast('Copied.');
  } else if (act === 'del') {
    confirmModal('Delete this message?', () => { ch.messages.splice(idx, 1); save(); render(); });
  } else if (act === 'edit') {
    const bubble = document.querySelector(`[data-msg="${id}"] .bubble`);
    bubble.innerHTML = `<textarea class="edit-area" style="background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:8px 10px;width:100%">${esc(msgText(m))}</textarea>
      <div class="form-actions"><button class="btn" data-x="cancel">Cancel</button><button class="btn primary" data-x="save">Save</button></div>`;
    const ta = bubble.querySelector('textarea');
    ta.focus();
    bubble.querySelector('[data-x="cancel"]').addEventListener('click', render);
    bubble.querySelector('[data-x="save"]').addEventListener('click', () => {
      if (m.role === 'assistant') m.alts[m.altIndex] = ta.value; else m.text = ta.value;
      delete m.error;
      save(); render();
    });
  }
}

function editMemory(ch) {
  openModal(`<h2>Chat memory</h2>
    <div class="field">
      <span class="help">Facts the character should never forget in this chat: names, promises, what has happened so far. Sent with every reply.</span>
      <textarea id="mem" rows="8">${esc(ch.memory || '')}</textarea>
    </div>
    <div class="form-actions"><button class="btn" data-close>Cancel</button><button class="btn primary" id="ok">Save</button></div>`);
  $('#ok').addEventListener('click', () => { ch.memory = $('#mem').value.trim(); save(); closeModal(); render(); });
}

// ---------- prompt + generation ----------

function buildSystem(c, ch) {
  const s = data.settings;
  const user = s.userName || 'You';
  let parts;
  if (c.mode === 'assistant') {
    parts = [fill(c.personality, c) || 'You are a helpful assistant.'];
    if (s.userName && s.userName !== 'You') parts.push('', `The user's name is ${s.userName}.`);
    if (s.userPersona) parts.push('', '<about_the_user>', fill(s.userPersona, c), '</about_the_user>');
  } else {
    parts = [
      `You are ${c.name}, a character in an ongoing interactive story with ${user}. Write only as ${c.name} (and any minor side characters or narration the scene needs).`,
      'How to write:',
      `- Stay in character at all times. Never mention being an AI, and never break the fourth wall unless ${user} clearly steps out of the story with something in (brackets).`,
      `- Write ${c.name}'s actions and narration in *asterisks* and spoken words in "quotes".`,
      `- Never write ${user}'s words, thoughts or actions; leave room for them to respond.`,
      '- Keep each reply focused: usually one to four paragraphs. Show feelings through actions and dialogue, use concrete sensory detail, and move the scene forward. Do not repeat earlier lines.',
      '',
      `<character name="${c.name}">`, fill(c.personality, c), '</character>',
    ];
    if (c.scenario) parts.push('', '<scenario>', fill(c.scenario, c), '</scenario>');
    if (c.examples) parts.push('', '<example_dialogue>', fill(c.examples, c), '</example_dialogue>', 'The examples show voice and style only; they did not happen in this story.');
    if (s.userPersona) parts.push('', `<user_persona name="${user}">`, fill(s.userPersona, c), '</user_persona>');
    if (ch.memory) parts.push('', '<chat_memory>', fill(ch.memory, c), '</chat_memory>');
  }
  if (s.globalNote) parts.push('', '<note>', fill(s.globalNote, c), '</note>');
  return parts.join('\n');
}

// History in chat shape. It must start with the user, so a character's opening line gets a stage cue first.
function buildMessages(ch, upTo) {
  const msgs = [];
  for (const m of ch.messages.slice(0, upTo)) {
    if (m.error) continue;
    const text = msgText(m).trim();
    if (!text) continue;
    const last = msgs[msgs.length - 1];
    if (last && last.role === m.role) last.content += `\n\n${text}`; // keep turns alternating for local models
    else msgs.push({ role: m.role, content: text });
  }
  if (!msgs.length || msgs[0].role !== 'user') msgs.unshift({ role: 'user', content: '(The scene begins.)' });
  if (msgs[msgs.length - 1].role !== 'user') msgs.push({ role: 'user', content: '(Continue.)' });
  return msgs;
}

function generate(ch, rerollMsg) {
  const c = charById(ch.characterId);
  const target = resolveTarget(ch, c);
  if (!target) { toast('Get a model first: open the Stack Advisor or the Model Hub.'); return; }
  let msg = rerollMsg;
  let upTo;
  if (msg) {
    upTo = ch.messages.indexOf(msg);
    msg.alts.push('');
    msg.altIndex = msg.alts.length - 1;
    delete msg.error;
  } else {
    upTo = ch.messages.length;
    msg = { id: uid(), role: 'assistant', alts: [''], altIndex: 0 };
    ch.messages.push(msg);
  }
  ch.updatedAt = now();
  const requestId = uid();
  pending = { requestId, chatId: ch.id, msgId: msg.id, status: 'Thinking…' };
  save();
  render();

  const s = data.settings;
  const stack = c.stack || {};
  const [kind, id] = [target.slice(0, target.indexOf(':')), target.slice(target.indexOf(':') + 1)];
  api.send({
    requestId,
    target: kind === 'claude' ? { kind, model: id, effort: s.claudeEffort } : { kind: 'local', modelId: id },
    temperature: Number(stack.temperature ?? s.temperature),
    contextSize: Number(stack.contextSize ?? s.contextSize),
    maxTokens: Number(stack.maxTokens ?? s.maxTokens),
    gpuLayers: s.gpuLayers === 'auto' ? 'auto' : Number(s.gpuLayers),
    system: buildSystem(c, ch),
    messages: buildMessages(ch, upTo),
  });
}

function pendingTarget(requestId) {
  if (!pending || pending.requestId !== requestId) return null;
  const ch = chatById(pending.chatId);
  const m = ch?.messages.find((x) => x.id === pending.msgId);
  return m ? { ch, m } : null;
}

let paintQueued = false;
function onDelta({ requestId, text }) {
  const t = pendingTarget(requestId);
  if (!t) return;
  t.m.alts[t.m.altIndex] += text;
  if (paintQueued) return;
  paintQueued = true;
  requestAnimationFrame(() => {
    paintQueued = false;
    const bubble = document.querySelector(`[data-msg="${t.m.id}"] .bubble`);
    if (!bubble) return;
    const box = $('#messages');
    const atBottom = box.scrollHeight - box.scrollTop - box.clientHeight < 80;
    const c = charById(t.ch.characterId);
    bubble.innerHTML = c.mode === 'assistant' ? formatMarkdown(msgText(t.m)) : formatRoleplay(msgText(t.m));
    if (atBottom) scrollToBottom();
  });
}

function finish(t) {
  pending = null;
  t.ch.updatedAt = now();
  save();
  render();
}

function onDone({ requestId, stopReason }) {
  const t = pendingTarget(requestId);
  if (!t) return;
  if (stopReason === 'max_tokens') toast('Reply hit the length limit. Press Continue for more, or raise it in Settings.');
  finish(t);
}

function onError({ requestId, message, aborted }) {
  const t = pendingTarget(requestId);
  if (!t) return;
  const text = msgText(t.m);
  if (aborted && text) { finish(t); return; } // keep what was written before Stop
  if (t.m.alts.length > 1) { t.m.alts.splice(t.m.altIndex, 1); t.m.altIndex = t.m.alts.length - 1; }
  else t.ch.messages = t.ch.messages.filter((x) => x !== t.m);
  if (!aborted) toast(message);
  finish(t);
}

// ---------- Model Hub ----------

function hwHTML(h) {
  if (!h) return '<div class="hw"><div class="pill"><span>Checking your PC…</span></div></div>';
  const gpuName = h.gpuNames?.[0] || ({ cuda: 'NVIDIA graphics card', vulkan: 'Graphics card', metal: 'Apple GPU' }[h.gpu] || 'No supported graphics card');
  return `<div class="hw">
    <div class="pill"><span>Memory</span><b>${h.ramGB.toFixed(0)} GB RAM</b></div>
    <div class="pill"><span>Graphics</span><b>${esc(gpuName)}</b></div>
    <div class="pill"><span>Video memory</span><b>${h.vramGB ? `${h.vramGB.toFixed(1)} GB` : 'n/a'}</b></div>
    <div class="pill"><span>Engine</span><b>${h.gpu === 'cuda' ? 'CUDA (NVIDIA)' : h.gpu === 'vulkan' ? 'Vulkan' : h.gpu === 'metal' ? 'Metal' : 'CPU'}</b></div>
    <div class="pill"><span>Processor</span><b>${h.cores} cores</b></div>
  </div>`;
}

async function ensureHardware() {
  if (hw) return hw;
  hw = await api.hardware();
  return hw;
}

function downloadBox(id) {
  const d = downloads[id];
  if (!d) return '';
  const pct = d.total ? Math.round((d.downloaded / d.total) * 100) : 0;
  return `<div data-dl="${esc(id)}"><div class="bar"><i style="width:${pct}%"></i></div>
    <div class="row" style="justify-content:space-between;margin-top:4px"><span class="meta dl-text">${d.total ? `${gb(d.downloaded)} of ${gb(d.total)} (${pct}%)` : 'Starting…'}</span>
    <button class="tool" data-cancel="${esc(id)}">Cancel</button></div></div>`;
}

function hubHTML() {
  const installedIds = new Set(models.installed.map((m) => m.catalogId).filter(Boolean));
  const def = data.settings.defaultTarget;
  return `<div class="page">
    <div class="page-head"><h1>Model Hub</h1><button class="btn" data-goto="advisor">Not sure? Ask the Stack Advisor</button></div>
    ${hwHTML(hw)}
    <div class="section-label">On this PC</div>
    ${models.installed.length ? `<div class="hub-list" style="margin-bottom:22px">${models.installed.map((m) => `
      <div class="model-card">
        <div class="top"><b>${esc(m.name)}</b>${def === `local:${m.id}` ? '<span class="badge good">default</span>' : ''}</div>
        <div class="meta">${gb(m.size)}${m.source === 'imported' ? ' · imported' : ''}</div>
        <div class="row">
          <button class="btn primary" data-chatwith="${esc(m.id)}">Chat</button>
          ${def === `local:${m.id}` ? '' : `<button class="btn" data-default="${esc(m.id)}">Make default</button>`}
          <button class="btn danger" data-delmodel="${esc(m.id)}">${m.source === 'imported' ? 'Remove' : 'Delete'}</button>
        </div>
      </div>`).join('')}</div>` : '<p class="empty" style="text-align:left;padding:4px 0 22px">No models yet. Download one below; they are free.</p>'}
    <div class="section-label">Add your own</div>
    <div class="inline-form">
      <input id="custom-uri" placeholder="Hugging Face link or hf:user/repo:Q4_K_M">
      <button class="btn" id="custom-dl">Download</button>
      <button class="btn" id="import-gguf">Import a .gguf file</button>
      <button class="btn ghost" id="open-folder">Open models folder</button>
    </div>
    ${Object.values(downloads).filter((d) => !models.catalog.some((m) => m.id === d.id)).map((d) => `<div class="model-card" style="margin-bottom:12px"><b>${esc(d.name)}</b>${downloadBox(d.id)}</div>`).join('')}
    <div class="section-label">Free models</div>
    <div class="hub-list">${models.catalog.map((m) => `
      <div class="model-card">
        <div class="top"><b>${esc(m.name)}</b><span class="meta">${m.sizeGB.toFixed(1)} GB</span></div>
        <div class="meta">${esc(m.maker)} · ${esc(m.params)} parameters · best for ${esc(bestJobs(m))}</div>
        <div class="desc">${esc(m.blurb)}</div>
        ${downloads[m.id] ? downloadBox(m.id) : installedIds.has(m.id)
          ? `<div class="row"><span class="badge good">Installed</span><button class="btn" data-chatwith="${esc(m.id)}">Chat</button></div>`
          : `<div class="row"><button class="btn primary" data-download="${esc(m.id)}">Download</button></div>`}
      </div>`).join('')}
    </div>
  </div>`;
}

function bestJobs(m) {
  return Object.entries(m.jobs).sort((a, b) => b[1] - a[1]).slice(0, 2)
    .map(([k]) => (models.jobs[k]?.label || k).toLowerCase()).join(' and ');
}

async function startDownload(req) {
  try {
    const { id } = await api.downloadModel(req);
    downloads[id] ||= { id, name: req.name || 'Model', downloaded: 0, total: 0 };
    render();
    return id;
  } catch (err) {
    toast(String(err?.message || err).replace(/^Error invoking remote method '[^']+': (Error: )?/, ''));
    return null;
  }
}

bind.hub = () => {
  bindGoto();
  if (!hw) ensureHardware().then(() => { if (route.view === 'hub') render(); });
  document.querySelectorAll('[data-download]').forEach((b) => b.addEventListener('click', () => {
    const m = models.catalog.find((x) => x.id === b.dataset.download);
    startDownload({ catalogId: m.id, name: m.name });
  }));
  document.querySelectorAll('[data-cancel]').forEach((b) => b.addEventListener('click', () => api.cancelDownload(b.dataset.cancel)));
  document.querySelectorAll('[data-default]').forEach((b) => b.addEventListener('click', () => {
    data.settings.defaultTarget = `local:${b.dataset.default}`; save(); render(); toast('Default model set.');
  }));
  document.querySelectorAll('[data-chatwith]').forEach((b) => b.addEventListener('click', () => {
    const m = models.installed.find((x) => x.id === b.dataset.chatwith || x.catalogId === b.dataset.chatwith);
    newChat(charById(ASSISTANT_ID));
    const ch = chatById(route.id);
    ch.target = `local:${m.id}`; save(); render();
  }));
  document.querySelectorAll('[data-delmodel]').forEach((b) => b.addEventListener('click', () => {
    const m = models.installed.find((x) => x.id === b.dataset.delmodel);
    confirmModal(`${m.source === 'imported' ? 'Remove' : 'Delete'} ${m.name}?${m.source === 'imported' ? ' The file itself stays where it is.' : ` This frees ${gb(m.size)}.`}`, async () => {
      await api.deleteModel(m.id);
      if (data.settings.defaultTarget === `local:${m.id}`) data.settings.defaultTarget = '';
      save(); await refreshModels(); render();
    }, m.source === 'imported' ? 'Remove' : 'Delete');
  }));
  $('#custom-dl').addEventListener('click', () => {
    const uri = $('#custom-uri').value.trim();
    if (!uri) { toast('Paste a Hugging Face link or hf: address first.'); return; }
    startDownload({ uri, name: uri.replace(/^hf:/, '') });
  });
  $('#import-gguf').addEventListener('click', async () => {
    try {
      const m = await api.importModel();
      if (!m) return;
      if (!data.settings.defaultTarget) { data.settings.defaultTarget = `local:${m.id}`; save(); }
      await refreshModels(); render(); toast(`${m.name} added.`);
    } catch { toast('That file could not be read as a model.'); }
  });
  $('#open-folder').addEventListener('click', () => api.openModelsFolder());
};

// ---------- Stack Advisor ----------

function advisorHTML() {
  const jobs = Object.entries(models.jobs);
  const r = advisorResult;
  return `<div class="page">
    <div class="page-head"><h1>Stack Advisor</h1></div>
    <p style="color:var(--muted);margin:-8px 0 18px;max-width:720px">Pick what you want to do. Quicksilver checks your PC and builds the best stack for the job: the right free model, settings tuned for the task, and an assistant set up for it. Everything runs on this PC; no account or key needed.</p>
    ${hwHTML(hw)}
    <div class="jobs">${jobs.map(([k, j]) => `
      <button class="job ${advisorJob === k ? 'on' : ''}" data-job="${k}">
        <span class="ic">${j.icon}</span><b>${esc(j.label)}</b><small>${esc(j.pitch)}</small>
      </button>`).join('')}
    </div>
    ${r ? advisorResultHTML(r) : advisorJob ? '<div class="empty">Working out the best stack…</div>' : ''}
  </div>`;
}

function advisorResultHTML(r) {
  const a = r.advice;
  if (!a.picks.length) return `<div class="banner"><p>No model in the hub fits this PC's memory for this job. Try "Fast on a modest PC", close other apps, or use Claude in the cloud (Settings).</p></div>`;
  const fitBadge = (p) => (p.fit === 'gpu' ? '<span class="badge good">fast</span>' : p.fit === 'split' ? '<span class="badge good">good fit</span>' : '<span class="badge warn">slower</span>');
  return `<div class="section-label">Recommended stack for ${esc(a.label.toLowerCase())}</div>
    <div class="picks">${a.picks.map((p, i) => `
      <div class="pick ${i === 0 ? 'best' : ''}">
        <div>
          <h3>${i === 0 ? '★ ' : ''}${esc(p.model.name)}${fitBadge(p)}${p.installed ? '<span class="badge good">installed</span>' : ''}</h3>
          <div class="why">${esc(p.model.blurb)} ${esc(p.speed)}. ${p.model.sizeGB.toFixed(1)} GB download.</div>
          <div class="stack-settings">Stack: ${esc(p.model.name)} · temperature ${a.settings.temperature} · ${a.settings.contextSize.toLocaleString()}-token memory · up to ${a.settings.maxTokens.toLocaleString()} tokens per reply${r.job.assistant ? ` · assistant "${esc(r.job.assistant.name)}"` : ' · used for all your characters'}</div>
        </div>
        <div>${downloads[p.model.id] ? downloadBox(p.model.id) : `<button class="btn ${i === 0 ? 'primary' : ''}" data-build="${esc(p.model.id)}">${p.installed ? 'Use this stack' : 'Build this stack'}</button>`}</div>
      </div>`).join('')}
    </div>
    ${a.tooBig.length ? `<p style="color:var(--muted);font-size:13px;margin-top:14px">Too big for this PC right now: ${esc(a.tooBig.join(', '))}.</p>` : ''}`;
}

async function runAdvisor(job, keepShowing = false) {
  advisorJob = job;
  if (!keepShowing) advisorResult = null;
  render();
  const res = await api.advise(job);
  hw = res.hardware;
  if (advisorJob !== job) return;
  advisorResult = res;
  render();
}

async function buildStack(modelId) {
  const r = advisorResult;
  const a = r.advice;
  const target = `local:${modelId}`;
  const stack = { target, temperature: a.settings.temperature, contextSize: a.settings.contextSize, maxTokens: a.settings.maxTokens };
  let assistant = null;
  if (r.job.assistant) {
    const existing = data.characters.find((c) => c.stackJob === a.job);
    assistant = existing || (a.job === 'chat' ? charById(ASSISTANT_ID) : null);
    if (!assistant) {
      assistant = { id: uid(), createdAt: now(), mode: 'assistant', avatar: '', scenario: '', firstMessage: '', examples: '', tags: ['Assistant', models.jobs[a.job].label] };
      data.characters.unshift(assistant);
    }
    Object.assign(assistant, { name: r.job.assistant.name, tagline: r.job.assistant.tagline, personality: r.job.assistant.personality, stack, stackJob: a.job });
  } else {
    data.settings.roleplayTarget = target; // characters use this model
  }
  if (a.job === 'chat' || !data.settings.defaultTarget) data.settings.defaultTarget = target;
  save();

  const installed = models.installed.some((m) => m.id === modelId);
  if (!installed) {
    const m = models.catalog.find((x) => x.id === modelId);
    await startDownload({ catalogId: modelId, name: m.name });
    toast(`Stack created. ${m.name} is downloading; you can chat as soon as it finishes.`);
    render();
  } else if (assistant) {
    newChat(assistant);
  } else {
    toast('Stack set: your characters now use this model.');
    go({ view: 'home' });
  }
}

bind.advisor = () => {
  if (!hw) ensureHardware().then(() => { if (route.view === 'advisor') render(); });
  document.querySelectorAll('[data-job]').forEach((b) => b.addEventListener('click', () => runAdvisor(b.dataset.job)));
  document.querySelectorAll('[data-build]').forEach((b) => b.addEventListener('click', () => buildStack(b.dataset.build)));
  document.querySelectorAll('[data-cancel]').forEach((b) => b.addEventListener('click', () => api.cancelDownload(b.dataset.cancel)));
};

// ---------- settings ----------

async function openSettings() {
  const s = data.settings;
  keyStatus = await api.keyStatus();
  const opts = targetOptions();
  openModal(`<h2>Settings</h2>
    <div class="form">
      <div class="field">
        <label for="s-default">Default model</label>
        <select id="s-default">${opts.length ? opts.map((o) => `<option value="${esc(o.value)}" ${o.value === resolveTarget(null, null) ? 'selected' : ''}>${esc(o.label)}</option>`).join('') : '<option value="">No models yet</option>'}</select>
      </div>
      <div class="field">
        <label for="s-temp">Creativity (temperature): <span id="s-temp-v">${s.temperature}</span></label>
        <span class="help">Lower is focused and consistent; higher is more surprising. Stacks from the Stack Advisor set their own.</span>
        <input id="s-temp" type="range" min="0" max="1.5" step="0.05" value="${s.temperature}">
      </div>
      <div class="field">
        <label for="s-ctx">Conversation memory (context size, tokens)</label>
        <span class="help">How much of the chat the model can see at once. Bigger uses more memory.</span>
        <select id="s-ctx">${[2048, 4096, 8192, 16384, 32768].map((n) => `<option value="${n}" ${Number(s.contextSize) === n ? 'selected' : ''}>${n.toLocaleString()}</option>`).join('')}</select>
      </div>
      <div class="field">
        <label for="s-max">Max reply length (tokens)</label>
        <input id="s-max" type="number" min="128" max="32000" step="128" value="${esc(s.maxTokens)}">
      </div>
      <div class="field">
        <label for="s-gpu">Graphics card use</label>
        <span class="help">Auto puts as much of the model on your graphics card as fits. Choose CPU only if you get crashes or graphics glitches.</span>
        <select id="s-gpu"><option value="auto" ${s.gpuLayers === 'auto' ? 'selected' : ''}>Auto (recommended)</option><option value="0" ${String(s.gpuLayers) === '0' ? 'selected' : ''}>CPU only</option></select>
      </div>
      <div class="field">
        <label for="s-name">Your name</label>
        <input id="s-name" value="${esc(s.userName)}">
      </div>
      <div class="field">
        <label for="s-persona">About you (optional)</label>
        <span class="help">Shared with your assistants and characters.</span>
        <textarea id="s-persona" rows="3">${esc(s.userPersona)}</textarea>
      </div>
      <div class="field">
        <label for="s-note">Note for every chat (optional)</label>
        <span class="help">For example "Answer in British English" or "Keep replies short".</span>
        <textarea id="s-note" rows="2">${esc(s.globalNote)}</textarea>
      </div>
      <div class="section-label">Cloud (optional)</div>
      <div class="field">
        <label for="s-key">Anthropic API key, to also use Claude</label>
        <span class="help">${keyStatus.fromEnv ? 'Using the ANTHROPIC_API_KEY environment variable.' : keyStatus.hasKey ? 'A key is saved. Paste a new one to replace it.' : 'Not needed for local models. Add one only if you want Claude as well; chats with Claude go over the internet.'}</span>
        <input id="s-key" type="password" placeholder="sk-ant-…" autocomplete="off">
      </div>
      <div class="field">
        <label for="s-effort">Claude effort</label>
        <select id="s-effort">${['low', 'medium', 'high', 'xhigh', 'max'].map((e) => `<option ${e === s.claudeEffort ? 'selected' : ''}>${e}</option>`).join('')}</select>
      </div>
      <div class="form-actions">
        ${keyStatus.hasKey && !keyStatus.fromEnv ? '<button class="btn danger" id="s-forget">Forget key</button>' : ''}
        <button class="btn" data-close>Close</button>
        <button class="btn primary" id="s-save">Save</button>
      </div>
    </div>`);
  $('#s-temp').addEventListener('input', (e) => { $('#s-temp-v').textContent = e.target.value; });
  $('#s-forget')?.addEventListener('click', async () => { await api.setKey(''); keyStatus = await api.keyStatus(); toast('Key removed.'); closeModal(); render(); });
  $('#s-save').addEventListener('click', async () => {
    const key = $('#s-key').value.trim();
    if (key) await api.setKey(key);
    keyStatus = await api.keyStatus();
    Object.assign(s, {
      defaultTarget: $('#s-default').value || s.defaultTarget,
      temperature: Number($('#s-temp').value),
      contextSize: Number($('#s-ctx').value),
      maxTokens: Math.max(128, Math.min(32000, Number($('#s-max').value) || 2048)),
      gpuLayers: $('#s-gpu').value === 'auto' ? 'auto' : 0,
      userName: $('#s-name').value.trim() || 'You',
      userPersona: $('#s-persona').value.trim(),
      globalNote: $('#s-note').value.trim(),
      claudeEffort: $('#s-effort').value,
    });
    save(); closeModal(); render(); toast('Settings saved.');
  });
}

// ---------- modal ----------

function openModal(html) {
  $('#modal-body').innerHTML = html;
  $('#modal').hidden = false;
  $('#modal-body').querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeModal));
}
function closeModal() { $('#modal').hidden = true; $('#modal-body').innerHTML = ''; }
function confirmModal(text, onYes, yesLabel = 'Delete') {
  openModal(`<h2>Are you sure?</h2><p>${esc(text)}</p>
    <div class="form-actions"><button class="btn" data-close>Cancel</button><button class="btn danger" id="yes">${esc(yesLabel)}</button></div>`);
  $('#yes').addEventListener('click', () => { closeModal(); onYes(); });
}

init();
