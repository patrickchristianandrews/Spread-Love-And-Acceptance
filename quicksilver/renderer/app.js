// Quicksilver — the page. Everything you see: the character library, profiles, the
// character editor, chats and settings. Talks to the main process only through window.quicksilver.
'use strict';

const api = window.quicksilver;

const MODELS = [
  { id: 'claude-opus-5-5', label: 'Claude Opus 5.5 (best default)' },
  { id: 'claude-sonnet-5-5', label: 'Claude Sonnet 5.5 (faster, cheaper)' },
  { id: 'claude-haiku-5-5', label: 'Claude Haiku 5.5 (fastest, cheapest)' },
  { id: 'claude-fable-5-1', label: 'Claude Fable 5.1 (most capable, priciest)' },
];
const EFFORTS = ['low', 'medium', 'high', 'xhigh', 'max'];

const DEFAULT_SETTINGS = {
  model: 'claude-opus-5-5',
  effort: 'low', // chat replies don't need deep reasoning; raise it for richer plotting
  maxTokens: 4000,
  userName: 'You',
  userPersona: '',
  globalNote: '',
};

// ---------- state ----------

let data = null;          // { version, settings, characters[], chats[] }
let route = { view: 'home' };
let tagFilter = null;
let searchText = '';
let pending = null;       // { requestId, chatId, msgId } while a reply streams
let saveTimer = null;

const $ = (sel, root = document) => root.querySelector(sel);
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const now = () => Date.now();

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}

function toast(msg) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.hidden = true; }, 2600);
}

function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => api.save(data), 250);
}

// ---------- seed ----------

function seedCharacters() {
  return [
    {
      id: uid(), createdAt: now(),
      name: 'Marlow Vance',
      avatar: '', tags: ['Mystery', 'Noir', 'Detective'],
      tagline: 'A rain-soaked private eye who owes the wrong people money and has just taken your case.',
      personality: 'Dry, observant, tired but stubbornly decent. Talks in clipped sentences and wry metaphors. Notices small details (a scuffed shoe, a nervous hand). Hates being lied to, softens for people who are honest with him.',
      scenario: 'Harbor City, 1947. It is past midnight. {{user}} has climbed three flights of stairs to Marlow\'s cramped office above a closed pawn shop, carrying a problem nobody else will touch.',
      firstMessage: '*The desk lamp buzzes. Marlow doesn\'t look up from the bottle he\'s pretending not to drink from.* "Door\'s open, which means you\'re either desperate or lost." *He finally raises his eyes, taking in your wet coat.* "Desperate, then. Sit. Tell me who you need found."',
      examples: '',
    },
    {
      id: uid(), createdAt: now(),
      name: 'Pip',
      avatar: '', tags: ['Fantasy', 'Wholesome', 'Companion'],
      tagline: 'A tiny, over-enthusiastic forest sprite who has decided you are her new best friend.',
      personality: 'Bubbly, curious, easily distracted by shiny things, fiercely loyal. Speaks fast, invents words, gives everything nicknames. Secretly worried she is too small to be useful.',
      scenario: '{{user}} is a traveler who has just made camp at the edge of the Glimmerwood, where Pip lives in a hollowed acorn.',
      firstMessage: '*A glowing speck zips out of the ferns and stops an inch from your nose.* "Oh! Oh oh oh! A big-folk! Are you lost? Are you hungry? Do you want to see my rock? It\'s a VERY good rock." *She does a loop in the air.* "I\'m Pip. You\'re… hmm. I\'m going to call you Bootsie until you tell me different."',
      examples: '',
    },
  ];
}

async function init() {
  data = (await api.load()) || { version: 1, settings: {}, characters: seedCharacters(), chats: [] };
  data.settings = { ...DEFAULT_SETTINGS, ...data.settings };
  data.characters ||= [];
  data.chats ||= [];
  save();

  document.querySelectorAll('[data-nav]').forEach((b) => b.addEventListener('click', () => {
    const n = b.dataset.nav;
    if (n === 'home') go({ view: 'home' });
    if (n === 'create') go({ view: 'edit' });
    if (n === 'settings') openSettings();
  }));
  $('#modal').addEventListener('mousedown', (e) => { if (e.target.id === 'modal') closeModal(); });
  document.addEventListener('keydown', (e) => { if (e.key === 'Escape' && !$('#modal').hidden) closeModal(); });

  api.onDelta(onDelta);
  api.onDone(onDone);
  api.onError(onError);

  render();
  const status = await api.keyStatus();
  if (!status.hasKey) openSettings(true);
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

// Turns *actions* into italics, "speech" into highlighted text, **bold** into bold.
function formatMessage(text) {
  let s = esc(text);
  s = s.replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>');
  s = s.replace(/\*(.+?)\*/gs, '<em class="action">$1</em>');
  s = s.replace(/(&quot;|“)(.+?)(&quot;|”)/gs, '<span class="speech">$1$2$3</span>');
  return s.replace(/\n/g, '<br>');
}

function ago(t) {
  const s = Math.round((now() - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)}m ago`;
  if (s < 86400) return `${Math.round(s / 3600)}h ago`;
  return new Date(t).toLocaleDateString();
}

const msgText = (m) => (m.role === 'assistant' ? m.alts[m.altIndex] ?? '' : m.text);

// ---------- routing ----------

function go(r) {
  route = r;
  render();
}

function render() {
  renderRecent();
  document.querySelectorAll('.nav-item').forEach((b) => b.classList.toggle('active',
    (b.dataset.nav === 'home' && route.view === 'home') || (b.dataset.nav === 'create' && route.view === 'edit' && !route.id)));
  const main = $('#main');
  if (route.view === 'home') main.innerHTML = homeHTML();
  if (route.view === 'profile') main.innerHTML = profileHTML(charById(route.id));
  if (route.view === 'edit') main.innerHTML = editHTML(route.id ? charById(route.id) : null);
  if (route.view === 'chat') main.innerHTML = chatHTML(chatById(route.id));
  bind[route.view]?.();
}

function renderRecent() {
  const recent = [...data.chats].sort((a, b) => b.updatedAt - a.updatedAt).slice(0, 30);
  $('#recent').innerHTML = recent.length ? recent.map((ch) => {
    const c = charById(ch.characterId);
    if (!c) return '';
    const last = ch.messages[ch.messages.length - 1];
    return `<button class="recent-item ${route.view === 'chat' && route.id === ch.id ? 'active' : ''}" data-chat="${ch.id}">
      ${avatarHTML(c, 'sm')}
      <span class="meta"><div class="name">${esc(c.name)}</div><div class="preview">${esc(last ? msgText(last).replace(/\*/g, '') : ch.title)}</div></span>
    </button>`;
  }).join('') : '<div class="empty" style="padding:10px 12px;text-align:left;font-size:13px">No chats yet.</div>';
  $('#recent').querySelectorAll('[data-chat]').forEach((b) => b.addEventListener('click', () => go({ view: 'chat', id: b.dataset.chat })));
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
    <div class="page-head">
      <h1>Your characters</h1>
      <input class="search" id="search" placeholder="Search characters" value="${esc(searchText)}">
      <button class="btn" id="import">Import</button>
    </div>
    ${tags.length ? `<div class="tags-filter">${tags.map((t) => `<button class="chip ${tagFilter === t ? 'on' : ''}" data-tag="${esc(t)}">${esc(t)}</button>`).join('')}</div>` : ''}
    <div class="grid">
      <button class="card new" id="new-card"><span class="plus">+</span>Create a character</button>
      ${list.map((c) => `<button class="card" data-id="${c.id}">
        <div class="card-art" style='${avatarStyle(c)}'>${c.avatar ? '' : initials(c.name)}</div>
        <div class="card-body">
          <div class="card-name">${esc(c.name)}</div>
          <div class="card-tag">${esc(fill(c.tagline, c))}</div>
          <div class="card-tags">${(c.tags || []).slice(0, 4).map((t) => `<span>${esc(t)}</span>`).join('')}</div>
        </div>
      </button>`).join('')}
    </div>
    ${!list.length && data.characters.length ? '<div class="empty">No characters match.</div>' : ''}
  </div>`;
}

bind.home = () => {
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
  if (!c) return '<div class="page"><div class="empty">Character not found.</div></div>';
  const chats = chatsFor(c.id);
  const block = (label, text) => (text ? `<div class="section-label">${label}</div><div class="prose">${esc(fill(text, c))}</div>` : '');
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
        <button class="btn danger" id="del">Delete</button>
      </div>
      ${chats.length ? `<div class="section-label">Chats</div><div class="chat-list">${chats.map((ch) => `
        <div class="chat-row">
          <button class="grow" data-open="${ch.id}"><div class="title">${esc(ch.title)}</div>
            <div class="sub">${ch.messages.length} messages · ${ago(ch.updatedAt)}</div></button>
          <button class="tool" data-rename="${ch.id}" title="Rename">Rename</button>
          <button class="tool" data-delchat="${ch.id}" title="Delete chat">Delete</button>
        </div>`).join('')}</div>` : ''}
      ${block('Personality', c.personality)}
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
  $('#del').addEventListener('click', () => confirmModal(`Delete ${c.name} and all of their chats?`, () => {
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
    id: uid(), characterId: c.id, title: `Chat ${n}`, createdAt: now(), updatedAt: now(), memory: '',
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

// ---------- character editor ----------

function editHTML(c) {
  const v = c || { name: '', tagline: '', personality: '', scenario: '', firstMessage: '', examples: '', tags: [], avatar: '' };
  const f = (id, label, help, value, rows) => `<div class="field">
    <label for="${id}">${label}</label>${help ? `<span class="help">${help}</span>` : ''}
    ${rows ? `<textarea id="${id}" rows="${rows}">${esc(value)}</textarea>` : `<input id="${id}" value="${esc(value)}">`}
  </div>`;
  return `<div class="page">
    <div class="page-head"><h1>${c ? `Edit ${esc(c.name)}` : 'Create a character'}</h1></div>
    <div class="form">
      <div class="form-row">
        <div class="avatar-pick">
          <div id="av-preview">${avatarHTML(v.name ? v : { name: '?' , avatar: v.avatar }, 'lg')}</div>
          <label class="btn" for="av-file">Choose picture</label>
          <input type="file" id="av-file" accept="image/*" hidden>
          <button class="btn ghost" id="av-clear" ${v.avatar ? '' : 'hidden'}>Remove picture</button>
        </div>
        <div class="form">
          ${f('f-name', 'Name', '', v.name)}
          ${f('f-tagline', 'Tagline', 'One or two lines shown on the character card.', v.tagline, 2)}
          ${f('f-tags', 'Tags', 'Comma separated, e.g. Fantasy, Romance, Comedy', (v.tags || []).join(', '))}
        </div>
      </div>
      ${f('f-personality', 'Personality', 'Who they are: looks, voice, habits, wants, fears. Use {{char}} and {{user}} as placeholders.', v.personality, 6)}
      ${f('f-scenario', 'Scenario', 'Where and when the story starts, and how {{user}} fits in.', v.scenario, 4)}
      ${f('f-first', 'First message', 'Their opening line. Put actions in *asterisks* and speech in "quotes".', v.firstMessage, 5)}
      ${f('f-examples', 'Example dialogue (optional)', 'A few sample exchanges that show how they talk.', v.examples, 5)}
      <div class="form-actions">
        <button class="btn" id="cancel">Cancel</button>
        <button class="btn primary" id="save">${c ? 'Save changes' : 'Create character'}</button>
      </div>
    </div>
  </div>`;
}

bind.edit = () => {
  const existing = route.id ? charById(route.id) : null;
  let avatar = existing?.avatar || '';
  const refreshPreview = () => {
    $('#av-preview').innerHTML = avatarHTML({ name: $('#f-name').value || '?', avatar }, 'lg');
    $('#av-clear').hidden = !avatar;
  };
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
    if (!name) { toast('Give your character a name.'); $('#f-name').focus(); return; }
    const fields = {
      name, avatar,
      tagline: $('#f-tagline').value.trim(),
      tags: $('#f-tags').value.split(',').map((t) => t.trim()).filter(Boolean),
      personality: $('#f-personality').value.trim(),
      scenario: $('#f-scenario').value.trim(),
      firstMessage: $('#f-first').value.trim(),
      examples: $('#f-examples').value.trim(),
    };
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

// ---------- import / export (compatible with common "character card" JSON) ----------

function toCard(c) {
  return {
    spec: 'chara_card_v2', spec_version: '2.0',
    data: {
      name: c.name, description: c.personality, personality: '', scenario: c.scenario,
      first_mes: c.firstMessage, mes_example: c.examples, creator_notes: c.tagline, tags: c.tags,
      extensions: { quicksilver: { avatar: c.avatar } },
    },
  };
}

function fromCard(obj) {
  const d = obj?.data && obj.spec ? obj.data : obj; // v2 cards nest under data; v1 is flat
  if (!d || typeof d !== 'object' || !d.name) throw new Error('not a character file');
  return {
    id: uid(), createdAt: now(),
    name: String(d.name),
    avatar: d.extensions?.quicksilver?.avatar || d.avatar_data || '',
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
  if (added) { save(); render(); toast(`Imported ${added} character${added > 1 ? 's' : ''}.`); }
}

// ---------- chat ----------

function chatHTML(ch) {
  const c = ch && charById(ch.characterId);
  if (!c) return '<div class="page"><div class="empty">Chat not found.</div></div>';
  return `<div class="chat">
    <div class="chat-top">
      <button class="btn ghost" id="back" title="Back to profile">←</button>
      ${avatarHTML(c, 'md')}
      <div class="who"><b>${esc(c.name)}</b><small>${esc(ch.title)}</small></div>
      <button class="btn" id="memory" title="Notes the character always remembers in this chat">Chat memory${ch.memory ? ' •' : ''}</button>
      <button class="btn" id="newchat">New chat</button>
    </div>
    <div class="messages" id="messages">${ch.messages.map((m, i) => messageHTML(ch, c, m, i)).join('')}</div>
    <div class="composer">
      <div class="composer-inner">
        <textarea id="input" rows="1" placeholder="Message ${esc(c.name)}… (*asterisks* for actions)"></textarea>
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
    tools.push(`<button class="tool" data-act="edit" data-id="${m.id}">Edit</button>`);
    tools.push(`<button class="tool" data-act="del" data-id="${m.id}">Delete</button>`);
  }
  return `<div class="msg ${m.role}" data-msg="${m.id}">
    ${av}
    <div class="stack">
      <div class="label">${esc(name)}</div>
      <div class="bubble ${streaming ? 'typing' : ''} ${m.error ? 'error' : ''}">${m.error ? esc(m.error) : formatMessage(text)}</div>
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
  $('#memory').addEventListener('click', () => editMemory(ch));
  $('#messages').addEventListener('click', (e) => {
    const b = e.target.closest('[data-act]');
    if (b) messageAction(ch, b.dataset.act, b.dataset.id);
  });
  scrollToBottom();
  if (!pending) input.focus();

  function sendOrStop() {
    if (pending) { api.abort(pending.requestId); return; }
    const text = input.value.trim();
    if (!text) {
      // Empty send = let the character keep going (useful after your own message was edited).
      if (ch.messages.length && ch.messages[ch.messages.length - 1].role === 'user') generate(ch, null);
      return;
    }
    ch.messages.push({ id: uid(), role: 'user', text });
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
  } else if (act === 'del') {
    confirmModal('Delete this message?', () => { ch.messages.splice(idx, 1); save(); render(); });
  } else if (act === 'edit') {
    const bubble = document.querySelector(`[data-msg="${id}"] .bubble`);
    bubble.innerHTML = `<textarea class="edit-area field" style="background:var(--panel);border:1px solid var(--line);border-radius:10px;padding:8px 10px;width:100%">${esc(msgText(m))}</textarea>
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
  const parts = [
    `You are ${c.name}, a character in an ongoing interactive story with ${user}. Write only as ${c.name} (and any minor side characters or narration the scene needs).`,
    'How to write:',
    `- Stay in character at all times. Never mention being an AI or a language model, and never break the fourth wall unless ${user} clearly steps out of the story with something in (brackets).`,
    `- Write ${c.name}'s actions and narration in *asterisks* and spoken words in "quotes".`,
    `- Never write ${user}'s words, thoughts or actions; leave room for them to respond.`,
    '- Keep each reply focused: usually one to four paragraphs. Show feelings through actions and dialogue, use concrete sensory detail, and move the scene forward. Vary your wording; do not repeat earlier lines.',
    '- Remember everything that has happened in the conversation and stay consistent with it.',
    '',
    `<character name="${c.name}">`,
    fill(c.personality, c),
    '</character>',
  ];
  if (c.scenario) parts.push('', '<scenario>', fill(c.scenario, c), '</scenario>');
  if (c.examples) parts.push('', '<example_dialogue>', fill(c.examples, c), '</example_dialogue>',
    'The examples show voice and style only; they did not happen in this story.');
  if (s.userPersona) parts.push('', `<${'user_persona'} name="${user}">`, fill(s.userPersona, c), '</user_persona>');
  if (s.globalNote) parts.push('', '<author_note>', fill(s.globalNote, c), '</author_note>');
  if (ch.memory) parts.push('', '<chat_memory>', fill(ch.memory, c), '</chat_memory>');
  return parts.join('\n');
}

// History in the API's shape. The first message must come from the user, so if the
// character opens the scene, a short stage cue goes first.
function buildMessages(ch, upTo) {
  const msgs = [];
  for (const m of ch.messages.slice(0, upTo)) {
    if (m.error) continue;
    const text = msgText(m).trim();
    if (!text) continue;
    msgs.push({ role: m.role, content: text });
  }
  if (!msgs.length || msgs[0].role !== 'user') msgs.unshift({ role: 'user', content: '(The scene begins.)' });
  if (msgs[msgs.length - 1].role !== 'user') msgs.push({ role: 'user', content: '(Continue.)' });
  return msgs;
}

function generate(ch, rerollMsg) {
  const c = charById(ch.characterId);
  let target = rerollMsg;
  let upTo;
  if (target) {
    upTo = ch.messages.indexOf(target);
    target.alts.push('');
    target.altIndex = target.alts.length - 1;
    delete target.error;
  } else {
    upTo = ch.messages.length;
    target = { id: uid(), role: 'assistant', alts: [''], altIndex: 0 };
    ch.messages.push(target);
  }
  ch.updatedAt = now();
  const requestId = uid();
  pending = { requestId, chatId: ch.id, msgId: target.id };
  save();
  render();

  const s = data.settings;
  api.send({
    requestId,
    model: s.model,
    effort: s.effort,
    maxTokens: Number(s.maxTokens) || 4000,
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
    bubble.innerHTML = formatMessage(msgText(t.m));
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
  if (aborted || !text) {
    // Drop the empty version so the chat isn't left with a blank reply.
    if (t.m.alts.length > 1) { t.m.alts.splice(t.m.altIndex, 1); t.m.altIndex = t.m.alts.length - 1; }
    else t.ch.messages = t.ch.messages.filter((x) => x !== t.m);
  }
  if (!aborted) toast(message);
  finish(t);
}

// ---------- settings ----------

async function openSettings(firstRun = false) {
  const s = data.settings;
  const status = await api.keyStatus();
  openModal(`<h2>${firstRun ? 'Welcome to Quicksilver' : 'Settings'}</h2>
    ${firstRun ? '<p class="help" style="color:var(--muted);margin-top:-6px">Paste your Anthropic API key to start. You can get one at console.anthropic.com. It stays on this computer, encrypted with your system keychain.</p>' : ''}
    <div class="form">
      <div class="field">
        <label for="s-key">Anthropic API key</label>
        <span class="help">${status.fromEnv ? 'Using the ANTHROPIC_API_KEY environment variable.' : status.hasKey ? 'A key is saved. Paste a new one to replace it, or leave blank to keep it.' : 'No key saved yet.'}${status.encrypted ? '' : ' (Your system has no keychain, so the key is stored unencrypted.)'}</span>
        <input id="s-key" type="password" placeholder="sk-ant-…" autocomplete="off">
      </div>
      <div class="field">
        <label for="s-model">Model</label>
        <select id="s-model">${MODELS.map((m) => `<option value="${m.id}" ${m.id === s.model ? 'selected' : ''}>${m.label}</option>`).join('')}</select>
      </div>
      <div class="field">
        <label for="s-effort">Effort</label>
        <span class="help">How hard the model thinks before replying. Low is quick and great for chat; higher is slower and costs more but can plot more carefully.</span>
        <select id="s-effort">${EFFORTS.map((e) => `<option ${e === s.effort ? 'selected' : ''}>${e}</option>`).join('')}</select>
      </div>
      <div class="field">
        <label for="s-max">Max reply length (tokens)</label>
        <input id="s-max" type="number" min="256" max="64000" step="256" value="${esc(s.maxTokens)}">
      </div>
      <div class="field">
        <label for="s-name">Your name</label>
        <span class="help">What characters call you. Fills in {{user}}.</span>
        <input id="s-name" value="${esc(s.userName)}">
      </div>
      <div class="field">
        <label for="s-persona">Your persona (optional)</label>
        <span class="help">A short description of who you are in the stories.</span>
        <textarea id="s-persona" rows="3">${esc(s.userPersona)}</textarea>
      </div>
      <div class="field">
        <label for="s-note">Note for every chat (optional)</label>
        <span class="help">Style rules applied to every character, e.g. "Write in present tense" or "Keep replies short and punchy".</span>
        <textarea id="s-note" rows="3">${esc(s.globalNote)}</textarea>
      </div>
      <div class="form-actions">
        ${status.hasKey && !status.fromEnv ? '<button class="btn danger" id="s-forget">Forget key</button>' : ''}
        <button class="btn" data-close>Close</button>
        <button class="btn primary" id="s-save">Save</button>
      </div>
    </div>`);
  $('#s-forget')?.addEventListener('click', async () => { await api.setKey(''); toast('Key removed.'); closeModal(); });
  $('#s-save').addEventListener('click', async () => {
    const key = $('#s-key').value.trim();
    if (key) await api.setKey(key);
    Object.assign(s, {
      model: $('#s-model').value,
      effort: $('#s-effort').value,
      maxTokens: Math.max(256, Math.min(64000, Number($('#s-max').value) || 4000)),
      userName: $('#s-name').value.trim() || 'You',
      userPersona: $('#s-persona').value.trim(),
      globalNote: $('#s-note').value.trim(),
    });
    save(); closeModal(); render(); toast('Settings saved.');
  });
  if (firstRun) $('#s-key').focus();
}

// ---------- modal ----------

function openModal(html) {
  $('#modal-body').innerHTML = html;
  $('#modal').hidden = false;
  $('#modal-body').querySelectorAll('[data-close]').forEach((b) => b.addEventListener('click', closeModal));
}
function closeModal() { $('#modal').hidden = true; $('#modal-body').innerHTML = ''; }
function confirmModal(text, onYes) {
  openModal(`<h2>Are you sure?</h2><p>${esc(text)}</p>
    <div class="form-actions"><button class="btn" data-close>Cancel</button><button class="btn danger" id="yes">Delete</button></div>`);
  $('#yes').addEventListener('click', () => { closeModal(); onYes(); });
}

init();
