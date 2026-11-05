// Quicksilver interface — shared state and helpers. Every page script adds itself to `views`.
'use strict';

const $ = (sel, root = document) => root.querySelector(sel);
const $$ = (sel, root = document) => [...root.querySelectorAll(sel)];
const uid = () => Math.random().toString(36).slice(2, 10) + Date.now().toString(36);
const now = () => Date.now();
const views = {};

const S = {
  data: null,          // saved app data: prefs, assistants, chats
  route: { view: 'chat' },
  catalog: null,       // models, categories, jobs
  installed: [],       // installed models
  downloads: {},       // id -> progress
  targets: [],         // everything you can chat with
  stacks: [],
  providers: [],
  config: null,
  est: null,           // hardware + estimates
};

function esc(s) {
  return String(s ?? '').replace(/[&<>"']/g, (c) => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));
}
const gb = (bytes) => (bytes >= 1024 ** 3 ? `${(bytes / 1024 ** 3).toFixed(1)} GB` : `${Math.max(1, Math.round(bytes / 1024 ** 2))} MB`);
const fmtSec = (s) => (s < 60 ? `${Math.max(1, Math.round(s))} s` : s < 3600 ? `${Math.round(s / 60)} min` : `${(s / 3600).toFixed(1)} h`);
function ago(t) {
  const s = Math.round((now() - t) / 1000);
  if (s < 60) return 'just now';
  if (s < 3600) return `${Math.round(s / 60)} min ago`;
  if (s < 86400) return `${Math.round(s / 3600)} h ago`;
  return new Date(t).toLocaleDateString();
}

function toast(msg, ms = 3600) {
  const t = $('#toast');
  t.textContent = msg;
  t.hidden = false;
  clearTimeout(toast._t);
  toast._t = setTimeout(() => { t.hidden = true; }, ms);
}

async function call(ch, ...args) {
  try { return await qs.call(ch, ...args); } catch (err) { toast(err.message, 6000); throw err; }
}

// ---------- saving ----------

let saveTimer = null;
function save() {
  clearTimeout(saveTimer);
  saveTimer = setTimeout(() => qs.call('data:save', S.data).catch(() => {}), 300);
}
window.addEventListener('beforeunload', () => { if (S.data) { clearTimeout(saveTimer); qs.call('data:save', S.data); } });

// ---------- modal ----------

function openModal(html, { wide = false } = {}) {
  const body = $('#modal-body');
  body.className = `modal${wide ? ' wide' : ''}`;
  body.innerHTML = html;
  $('#modal').hidden = false;
  $$('[data-close]', body).forEach((b) => b.addEventListener('click', closeModal));
  (body.querySelector('[autofocus]') || body.querySelector('input, textarea, select, button'))?.focus();
  return body;
}
function closeModal() { $('#modal').hidden = true; $('#modal-body').innerHTML = ''; }
function confirmBox(text, { yes = 'Delete', danger = true } = {}) {
  return new Promise((resolve) => {
    const b = openModal(`<h2>Are you sure?</h2><p>${esc(text)}</p><div class="modal-actions"><button class="btn" data-no>Cancel</button><button class="btn ${danger ? 'danger' : 'primary'}" data-yes>${esc(yes)}</button></div>`);
    b.querySelector('[data-no]').onclick = () => { closeModal(); resolve(false); };
    b.querySelector('[data-yes]').onclick = () => { closeModal(); resolve(true); };
  });
}

// ---------- markdown (safe: everything is escaped first) ----------

function inlineMd(s) {
  return s
    .replace(/`([^`]+)`/g, (_, c) => `<code>${c}</code>`)
    .replace(/\*\*(.+?)\*\*/g, '<strong>$1</strong>')
    .replace(/(^|[^*\w])\*([^*\s][^*]*?)\*(?!\w)/g, '$1<em>$2</em>')
    .replace(/\[([^\]]+)\]\((https?:\/\/[^)\s]+)\)/g, '<a href="$2" target="_blank" rel="noopener">$1</a>')
    .replace(/\[(\d{1,2})\](?!\()/g, '<span class="cite" title="Source $1">$1</span>');
}

function tableHtml(lines) {
  const cells = (l) => l.replace(/^\s*\|/, '').replace(/\|\s*$/, '').split('|').map((c) => c.trim());
  const head = cells(lines[0]);
  const rows = lines.slice(2).map(cells);
  const id = `t${uid()}`;
  tableHtml.store[id] = [head, ...rows].map((r) => r.map((c) => c.replace(/&lt;/g, '<').replace(/&gt;/g, '>').replace(/&amp;/g, '&').replace(/&quot;/g, '"').replace(/&#39;/g, "'").replace(/\*\*/g, '')));
  return `<div class="table-wrap"><table><thead><tr>${head.map((h) => `<th>${inlineMd(h)}</th>`).join('')}</tr></thead><tbody>${rows.map((r) => `<tr>${head.map((_, i) => `<td>${inlineMd(r[i] || '')}</td>`).join('')}</tr>`).join('')}</tbody></table>
    <div class="table-tools"><button class="tool" data-table="${id}" data-fmt="xlsx">Save as Excel</button><button class="tool" data-table="${id}" data-fmt="csv">Save as CSV</button><button class="tool" data-table="${id}" data-fmt="copy">Copy</button></div></div>`;
}
tableHtml.store = {};

function markdown(text) {
  const out = [];
  String(text).split(/```/).forEach((part, i) => {
    if (i % 2 === 1) {
      const nl = part.indexOf('\n');
      const lang = nl >= 0 ? part.slice(0, nl).trim() : '';
      const code = nl >= 0 ? part.slice(nl + 1) : part;
      out.push(`<pre><span class="bar-top"><span>${esc(lang || 'code')}</span><button class="copy">Copy</button></span><code>${esc(code.replace(/\n$/, ''))}</code></pre>`);
      return;
    }
    const lines = esc(part).split('\n');
    let list = null;
    let para = [];
    const flushPara = () => { if (para.length) { out.push(`<p>${inlineMd(para.join('<br>'))}</p>`); para = []; } };
    const flushList = () => { if (list) { out.push(`<${list.tag}>${list.items.map((x) => `<li>${inlineMd(x)}</li>`).join('')}</${list.tag}>`); list = null; } };
    for (let k = 0; k < lines.length; k++) {
      const line = lines[k];
      let m;
      if (!line.trim()) { flushPara(); flushList(); continue; }
      if (/^\s*\|.*\|\s*$/.test(line) && /^\s*\|?\s*:?-{2,}/.test(lines[k + 1] || '')) {
        flushPara(); flushList();
        const tl = [line];
        k++;
        tl.push(lines[k]);
        while (k + 1 < lines.length && /^\s*\|.*\|\s*$/.test(lines[k + 1])) tl.push(lines[++k]);
        out.push(tableHtml(tl));
        continue;
      }
      if ((m = line.match(/^(#{1,4})\s+(.*)/))) { flushPara(); flushList(); out.push(`<h${m[1].length}>${inlineMd(m[2])}</h${m[1].length}>`); continue; }
      if (/^\s*(-{3,}|\*{3,})\s*$/.test(line)) { flushPara(); flushList(); out.push('<hr>'); continue; }
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

// Copy buttons on code and tables, anywhere in the app.
document.addEventListener('click', async (e) => {
  const copy = e.target.closest('pre .copy');
  if (copy) {
    navigator.clipboard?.writeText(copy.closest('pre').querySelector('code').textContent);
    copy.textContent = 'Copied';
    setTimeout(() => { copy.textContent = 'Copy'; }, 1200);
    return;
  }
  const t = e.target.closest('[data-table]');
  if (t) {
    const rows = tableHtml.store[t.dataset.table] || [];
    const csv = rows.map((r) => r.map((c) => (/[",\n]/.test(c) ? `"${c.replace(/"/g, '""')}"` : c)).join(',')).join('\n');
    if (t.dataset.fmt === 'copy') { navigator.clipboard?.writeText(rows.map((r) => r.join('\t')).join('\n')); toast('Table copied. Paste it into Excel or Sheets.'); }
    if (t.dataset.fmt === 'csv' && await call('file:saveText', 'table.csv', csv)) toast('Saved.');
    if (t.dataset.fmt === 'xlsx' && await call('file:saveXlsx', 'table.xlsx', rows)) toast('Saved as an Excel workbook.');
  }
  const link = e.target.closest('a[href^="http"]');
  if (link) { e.preventDefault(); qs.call('shell:open', link.href); }
});

// ---------- shared data loaders ----------

async function refreshModels() {
  const r = await qs.call('models:list');
  S.installed = r.installed;
  for (const d of r.downloading) S.downloads[d.id] = d;
  S.targets = await qs.call('targets:list');
  S.stacks = await qs.call('stacks:list');
}
async function refreshProviders() { S.providers = await qs.call('providers:list'); S.targets = await qs.call('targets:list'); }
async function refreshEstimates() { S.est = await qs.call('catalog:estimates'); return S.est; }

const assistantById = (id) => S.data.assistants.find((a) => a.id === id) || S.data.assistants[0];
const chatById = (id) => S.data.chats.find((c) => c.id === id);
const targetValid = (t) => Boolean(t) && S.targets.some((x) => x.target === t);
const targetLabel = (t) => S.targets.find((x) => x.target === t)?.label || 'No model chosen';

// Model choice order: the chat's own, the assistant's, the default, then anything installed.
function resolveTarget(chat, assistant) {
  for (const t of [chat?.target, assistant?.target, S.data.prefs.defaultTarget]) if (targetValid(t)) return t;
  return S.targets.find((x) => x.target.startsWith('stack:'))?.target || S.targets[0]?.target || '';
}

function targetOptions(selected, { includeNone = false, noneLabel = 'Default model' } = {}) {
  const groups = {};
  for (const t of S.targets) (groups[t.group] ||= []).push(t);
  return `${includeNone ? `<option value="">${esc(noneLabel)}</option>` : ''}${Object.entries(groups).map(([g, list]) => `<optgroup label="${esc(g)}">${list.map((t) => `<option value="${esc(t.target)}" ${t.target === selected ? 'selected' : ''}>${esc(t.label)}${t.vision ? ' 👁' : ''}</option>`).join('')}</optgroup>`).join('')}`;
}

function rateBadge(est, kind = 'text') {
  if (!est) return '';
  const extra = est.rating === 'wont' ? '' : kind === 'text' ? ` · ~${Math.max(1, Math.round(est.wordsPerSec))} words/s` : ` · ~${fmtSec(est.sec)} each`;
  const where = { gpu: 'on graphics card', split: 'card + memory', cpu: 'on processor' }[est.fit] || '';
  return `<span class="badge rate-${est.rating}" title="${esc(where)}">${esc(est.rating === 'wont' ? est.label : est.label + extra)}</span>`;
}

// ---------- downloads (shared by Models, Stacks and Studio) ----------

async function download(req, name) {
  const r = await call('models:download', req);
  S.downloads[r.id] = { ...r, name: r.name || name };
  paintDownloads();
  return r.id;
}

function paintDownloads() {
  const list = Object.values(S.downloads);
  const mini = $('#dl-mini');
  mini.hidden = !list.length;
  if (list.length) {
    const tot = list.reduce((a, d) => a + (d.total || 0), 0);
    const done = list.reduce((a, d) => a + (d.downloaded || 0), 0);
    const pct = tot ? Math.round((done / tot) * 100) : 0;
    mini.innerHTML = `⬇ Downloading ${list.length === 1 ? esc(list[0].name) : `${list.length} models`}… ${pct}%<div class="bar" style="margin-top:6px"><i style="width:${pct}%"></i></div>`;
  }
  for (const d of list) {
    $$(`[data-dl="${CSS.escape(d.id)}"]`).forEach((el) => {
      const pct = d.total ? Math.round((d.downloaded / d.total) * 100) : 0;
      el.querySelector('i').style.width = `${pct}%`;
      el.querySelector('.dl-text').textContent = d.total ? `${gb(d.downloaded)} of ${gb(d.total)} (${pct}%)` : 'Finding files…';
    });
  }
}

function downloadBox(id) {
  const d = S.downloads[id];
  if (!d) return '';
  const pct = d.total ? Math.round((d.downloaded / d.total) * 100) : 0;
  return `<div data-dl="${esc(id)}" class="stack-v" style="gap:4px"><div class="bar"><i style="width:${pct}%"></i></div>
    <div class="row"><span class="small dl-text grow">${d.total ? `${gb(d.downloaded)} of ${gb(d.total)} (${pct}%)` : 'Finding files…'}</span><button class="btn small" data-cancel-dl="${esc(id)}">Pause</button></div></div>`;
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-cancel-dl]');
  if (b) qs.call('models:cancel', b.dataset.cancelDl);
});

// ---------- routing ----------

function go(r) { S.route = r; render(); }

function render() {
  renderChatList();
  paintDownloads();
  $$('.nav-item[data-nav]').forEach((b) => b.classList.toggle('active', b.dataset.nav === S.route.view));
  const v = views[S.route.view] || views.chat;
  $('#main').innerHTML = v.html();
  v.bind?.();
}

function renderChatList() {
  const q = ($('#chat-search')?.value || '').toLowerCase();
  const chats = [...S.data.chats].sort((a, b) => b.updated - a.updated)
    .filter((c) => !q || c.title.toLowerCase().includes(q) || c.messages.some((m) => (m.text || m.alts?.[m.altIndex]?.text || '').toLowerCase().includes(q)))
    .slice(0, 300);
  const startOfDay = new Date().setHours(0, 0, 0, 0);
  const groups = [
    ['📌 Pinned', chats.filter((c) => c.pinned)],
    ['Today', chats.filter((c) => !c.pinned && c.updated >= startOfDay)],
    ['Earlier', chats.filter((c) => !c.pinned && c.updated < startOfDay)],
  ].filter(([, list]) => list.length);
  const row = (c) => `<div class="chat-row ${S.route.view === 'chat' && S.route.id === c.id ? 'active' : ''}">
      <button class="chat-link" data-chat="${c.id}" title="${esc(c.title)} · ${esc(assistantById(c.assistantId).name)} · ${ago(c.updated)}"><span class="ce">${esc(assistantById(c.assistantId).emoji)}</span><span class="t">${esc(c.title)}</span></button>
      <button class="chat-more" data-chat-menu="${c.id}" aria-label="Options for ${esc(c.title)}">⋯</button>
    </div>`;
  $('#chat-list').innerHTML = groups.length
    ? groups.map(([label, list]) => `<div class="chat-group">${esc(label)}</div>${list.map(row).join('')}`).join('')
    : `<div class="small muted" style="padding:8px 10px">${q ? 'No matching chats.' : 'No chats yet.'}</div>`;
  $$('#chat-list [data-chat]').forEach((b) => b.addEventListener('click', () => go({ view: 'chat', id: b.dataset.chat })));
  $$('#chat-list [data-chat-menu]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); chatMenu(b, chatById(b.dataset.chatMenu)); }));
}

function chatMenu(anchor, chat) {
  closeMenus();
  const r = anchor.getBoundingClientRect();
  const m = document.createElement('div');
  m.className = 'menu';
  m.style.top = `${Math.min(r.bottom + 4, window.innerHeight - 200)}px`;
  m.style.left = `${Math.max(8, r.left - 150)}px`;
  m.innerHTML = `<button data-m="pin">${chat.pinned ? 'Unpin' : '📌 Pin to top'}</button><button data-m="rename">✏️ Rename</button><button data-m="export">⬇ Export as Markdown</button><button data-m="delete" class="danger">🗑 Delete</button>`;
  document.body.appendChild(m);
  m.querySelector('button').focus();
  m.addEventListener('click', async (e) => {
    const act = e.target.closest('[data-m]')?.dataset.m;
    closeMenus();
    if (act === 'pin') { chat.pinned = !chat.pinned; save(); renderChatList(); }
    if (act === 'rename') {
      const b = openModal(`<h2>Rename chat</h2><input id="rn" value="${esc(chat.title)}"><div class="modal-actions"><button class="btn" data-close>Cancel</button><button class="btn primary" id="rn-ok">Save</button></div>`);
      const ok = () => { chat.title = b.querySelector('#rn').value.trim() || chat.title; save(); closeModal(); render(); };
      b.querySelector('#rn-ok').onclick = ok;
      b.querySelector('#rn').addEventListener('keydown', (k) => { if (k.key === 'Enter') ok(); });
      b.querySelector('#rn').select();
    }
    if (act === 'export') {
      const a = assistantById(chat.assistantId);
      const md = chat.messages.map((x) => `## ${x.role === 'user' ? (S.data.prefs.userName || 'You') : a.name}\n\n${x.role === 'assistant' ? x.alts[x.altIndex]?.text || '' : x.text}`).join('\n\n');
      if (await call('file:saveText', `${chat.title.replace(/[^\w -]/g, '').slice(0, 60) || 'chat'}.md`, `# ${chat.title}\n\n${md}\n`)) toast('Chat saved.');
    }
    if (act === 'delete' && (await confirmBox(`Delete "${chat.title}"?`))) {
      S.data.chats = S.data.chats.filter((c) => c.id !== chat.id); save();
      if (S.route.id === chat.id) go({ view: 'home' }); else renderChatList();
    }
  });
}
function closeMenus() { $$('.menu').forEach((m) => m.parentNode.removeChild(m)); }
document.addEventListener('click', (e) => { if (!e.target.closest('.menu') && !e.target.closest('[data-chat-menu]')) closeMenus(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenus(); });
