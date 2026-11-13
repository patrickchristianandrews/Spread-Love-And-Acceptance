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

// A small message at the bottom. It always has an ✕ to dismiss it, and it pauses its countdown while
// the pointer is over it, so nothing disappears before it's been read.
// A message with a button (Undo, Remove old…) is never pushed aside by a plain one: the plain
// message waits until the one with the button closes, so the button can't vanish under you.
const toastWaiting = [];
function showToast(inner, ms, onAction) {
  const t = $('#toast');
  if (!onAction && !t.hidden && t.querySelector('.toast-act')) { toastWaiting.push([inner, ms]); if (toastWaiting.length > 3) toastWaiting.shift(); return; }
  t.innerHTML = `${inner}<button class="toast-x" aria-label="Dismiss" title="Dismiss">✕</button>`;
  t.hidden = false;
  t.classList.remove('toast-in'); void t.offsetWidth; t.classList.add('toast-in');
  // (When it closes, the newest waiting message shows; older ones are out of date by then.)
  const close = () => { t.classList.remove('toast-in'); t.hidden = true; clearTimeout(toast._t); const next = toastWaiting.pop(); toastWaiting.length = 0; if (next) setTimeout(() => showToast(...next), 150); };
  let left = ms; let since = Date.now();
  const arm = () => { clearTimeout(toast._t); since = Date.now(); toast._t = setTimeout(close, left); };
  t.onmouseenter = () => { clearTimeout(toast._t); left -= Date.now() - since; };
  t.onmouseleave = arm;
  t.querySelector('.toast-x').onclick = close;
  const act = t.querySelector('.toast-act');
  if (act && onAction) act.onclick = () => { close(); onAction(); };
  arm();
}
function toast(msg, ms = 5000) { showToast(`<span>${esc(msg)}</span>`, ms); }
function toastAction(msg, label, fn, ms = 9000) { showToast(`<span>${esc(msg)}</span> <button class="toast-act">${esc(label)}</button>`, ms, fn); }

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

// Markdown (inlineMd, tableHtml, markdown) is in md.js.

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
  S.running = r.running || [];
  for (const d of r.downloading) S.downloads[d.id] = d;
  S.targets = await qs.call('targets:list');
  S.stacks = await qs.call('stacks:list');
  S.overview = null; // Home's best setup and the Compare page are measured again
  S.upgrades = null;
  await refreshSpeeds();
}
async function refreshProviders() { S.providers = await qs.call('providers:list'); S.targets = await qs.call('targets:list'); refreshSpeeds(); }

// ---------- how long things take on this PC ----------
// Typical answer lengths (words) for each kind of job.
const WORDS = { chat: 300, hard: 500, writing: 450, code: 700, research: 500, complex: 600, reasoning: 500, document: 900, slides: 700, sheet: 500, chart: 300, check: 350, prompt: 80 };
async function refreshSpeeds() { try { S.speed = await qs.call('speed:map'); } catch { S.speed = null; } }
const HARD_RE = /\b(why|how does|how do|prove|calculate|compute|solve|compare|analy[sz]e|evaluate|step[- ]by[- ]step|debug|code|function|script|error|bug|plan|strategy|pros and cons|trade-?offs?|explain|summari[sz]e|review|translate)\b/i;
const looksHard = (text) => HARD_RE.test(text || '') || (text || '').length > 500 || /```|\d+\s*[-+*/^×÷]\s*\d+/.test(text || '');
// Seconds for a target to write `words`, or null if unknown. Smart teams answer simple
// messages with the lead alone; hard ones run every drafter plus the lead.
function etaFor(target, words = WORDS.chat, { hard = false } = {}) {
  const s = S.speed?.targets?.[target];
  if (!s) return null;
  if (s.kind === 'kbm') { const b = etaFor(s.base, words, { hard }); return b == null ? null : b + 1.5; }
  if (s.kind === 'model') return s.wps ? words / s.wps : null;
  const lead = s.judge || s.drafters[0];
  if (!lead) return null;
  if (s.auto && !hard) return words / lead;
  return s.drafters.reduce((t, w) => t + words / w, 0) + (s.judge ? (words * 1.1) / s.judge : 0);
}
const etaLabel = (sec) => (sec == null ? '' : `~${fmtSec(sec)}`);
// Expected quality of an output (out of 5 stars) for a kind of work, on this target.
function starsOf(target, job = 'general') {
  const s = S.speed?.targets?.[target];
  if (!s) return null;
  if (s.kind === 'kbm') return starsOf(s.base, job);
  const q = s.scores?.[job];
  if (q == null) return null;
  return Math.max(0.5, Math.min(5, Math.round((q / 2 + (s.team ? 0.5 : 0)) * 2) / 2));
}
// Ratings are shown out of 10 (most are kept out of 5 inside, in half steps).
const tenOf = (n5) => Math.round(n5 * 2 * 10) / 10;
const tenText = (n5) => (n5 == null ? '' : `${Number.isInteger(tenOf(n5)) ? tenOf(n5) : tenOf(n5).toFixed(1)}/10`);
const starText = (n) => tenText(n);
const etaBadge = (sec, what = '', stars = null) => (sec == null && stars == null ? '' : `<span class="badge b-lav eta" title="Estimated on this PC: time and expected quality (out of 5)">${sec != null ? `⏱ ${etaLabel(sec)}${what ? ` ${what}` : ''}` : ''}${sec != null && stars != null ? ' · ' : ''}${stars != null ? starText(stars) : ''}</span>`);
const SKILL_JOB = { code: 'coding', writing: 'writing', career: 'writing', voice: 'writing', music: 'writing', office: 'office', finance: 'office', research: 'research', life: 'general', fun: 'general', vision: 'general', media: 'general', editing: 'general' };
// How many words a job usually needs, from an assistant's kind of work or a skill's output.
const wordsForJob = (job) => S.catalog?.jobs?.[job]?.words || WORDS.chat;
const wordsForSkill = (s) => ({ docx: WORDS.document, pptx: WORDS.slides, xlsx: WORDS.sheet, chart: WORDS.chart, app: WORDS.code * 2, beat: WORDS.prompt * 2, podcast: WORDS.document * 1.5, narrate: WORDS.document, image: WORDS.prompt, video: WORDS.prompt, edit: WORDS.prompt, animate: WORDS.prompt }[s?.output] || (s?.category === 'code' ? WORDS.code : WORDS.writing));
function mediaEta(target) { const id = String(target || '').replace(/^local:/, ''); return S.speed?.media?.[id]?.sec ?? null; }
async function refreshEstimates() { S.est = await qs.call('catalog:estimates'); return S.est; }

const assistantById = (id) => S.data.assistants.find((a) => a.id === id) || S.data.assistants[0];
const chatById = (id) => S.data.chats.find((c) => c.id === id);
// A stack whose models aren't installed is listed (as "not set up") but can't answer.
const targetValid = (t) => Boolean(t) && S.targets.some((x) => x.target === t && !x.empty);
// The Liquid Edition is completely uncensored: only uncensored models answer, check or stand in
// for it (the same rule as complete.js isUncensored).
const UNCENSORED_RX = /abliterat|uncensor|unfiltered|dolphin|hermes|lexi|rocinante/i;
// A model's name and file name (never its folder: a Windows user called Alexis has "lexi" in every path).
const modelNameText = (m) => `${m?.name || ''} ${String(m?.files?.model || '').split(/[\\/]/).pop()} ${m?.repo || ''}`;
function liquidOk(t) {
  if (!t) return false;
  if (t === 'stack:quicksilver' || t === 'stack:quicksilver-pro') return true;
  if (t.startsWith('local:')) {
    const m = S.installed.find((x) => `local:${x.id}` === t);
    if (!m) return false;
    const c = S.catalog?.text?.find((x) => x.id === m.catalogId);
    return m.source === 'bundled' || c?.category === 'open' || UNCENSORED_RX.test(modelNameText(m));
  }
  if (t.startsWith('api:')) {
    const [, pid, ...rest] = t.split(':');
    return S.providers?.find((p) => p.id === pid)?.preset === 'venice' || UNCENSORED_RX.test(rest.join(':'));
  }
  return false;
}
const isLiquid = (t) => t === 'stack:quicksilver' || t === 'stack:quicksilver-pro';
const isLiquidStack = (s) => Boolean(s) && (s.builtFor === 'quicksilver' || s.builtFor === 'quicksilver-pro');
// A model that's part of the Liquid Edition can't be removed (imported files from other apps can).
// (A chat model must be the uncensored build: the plain catalog build of the same model is not
// the Liquid Edition's, so that one can be removed. The same test as models.liquidOwn.)
const liquidLocked = (m) => Boolean(m) && m.source !== 'imported' && (m.source === 'bundled' || ((S.catalog?.liquid || []).includes(m.catalogId) && ((m.kind || 'text') !== 'text' || liquidOk(`local:${m.id}`))));
const LOCK_BADGE = '<span class="badge b-lav" title="Part of Quicksilver Liquid Edition: it stays installed. Choose any other model or stack whenever you like.">🔒 Liquid Edition</span>';
const targetLabel = (t) => S.targets.find((x) => x.target === t)?.label || 'No model chosen';
// Every model a target runs by itself: the model, or all the members of its stack or fusion.
function teamTargets(target) {
  if (!String(target || '').startsWith('stack:')) return target ? [target] : [];
  const st = S.stacks.find((x) => `stack:${x.id}` === target);
  const m = st?.members || {};
  return [m.vision, ...(m.drafters || []), m.judge, m.muse, m.thinker, st?.bench].filter(Boolean);
}
// May this model on the PC take part in a chat that uses `base`, without being asked for? Only
// the chat's own models (a stack or fusion uses its members and nothing else), plus the models
// ticked under Models → "Models in use". With a single model, Quicksilver's own built-in models
// may still step in (to read a photo it can't see, say); with a stack or fusion, not even those.
function mayUse(t, base) {
  if (!String(t).startsWith('local:')) return true;
  if (t === base || teamTargets(base).includes(t)) return true;
  const m = S.installed.find((x) => `local:${x.id}` === t);
  if (!m) return false;
  return Boolean(m.inUse) || (liquidLocked(m) && !String(base || '').startsWith('stack:'));
}

// Model choice order: the chat's own, the assistant's, the default, then anything installed.
function resolveTarget(chat, assistant) {
  for (const t of [chat?.target, assistant?.target, S.data.prefs.defaultTarget]) if (targetValid(t)) return t;
  return S.targets.find((x) => x.target.startsWith('stack:') && !x.empty)?.target || S.targets.find((x) => !x.empty)?.target || '';
}

function targetOptions(selected, { includeNone = false, noneLabel = 'Default model' } = {}) {
  const groups = {};
  for (const t of S.targets) (groups[t.group] ||= []).push(t);
  return `${includeNone ? `<option value="">${esc(noneLabel)}</option>` : ''}${Object.entries(groups).map(([g, list]) => `<optgroup label="${esc(g)}">${list.map((t) => `<option value="${esc(t.target)}" ${t.target === selected ? 'selected' : ''}>${esc(t.label)}${t.vision ? ' 👁' : ''}${etaFor(t.target) != null ? ` · ${etaLabel(etaFor(t.target))}` : ''}${starsOf(t.target) != null ? ` · ${starText(starsOf(t.target))}` : ''}</option>`).join('')}</optgroup>`).join('')}`;
}

function rateBadge(est, kind = 'text') {
  if (!est) return '';
  const extra = est.rating === 'wont' ? '' : kind === 'text' ? ` · ~${Math.max(1, Math.round(est.wordsPerSec))} words/s · ⏱ ~${fmtSec(WORDS.chat / Math.max(0.1, est.wordsPerSec))} per answer` : ` · ⏱ ~${fmtSec(est.sec)} each`;
  const where = { gpu: 'on graphics card', split: 'card + memory', cpu: 'on processor' }[est.fit] || '';
  const tip = est.rating === 'wont' ? 'This PC doesn\'t have enough free memory to load this model, so it can\'t run here. Click the model for what it would need.' : where;
  return `<span class="badge rate-${est.rating}" title="${esc(tip)}">${esc(est.rating === 'wont' ? est.label : est.label + extra)}</span>`;
}

// ---------- one-off AI requests (prompt writing and similar small jobs) ----------

const oneShots = new Map();
qs.onChat(({ requestId, ev }) => {
  const o = oneShots.get(requestId);
  if (!o) return;
  if (ev.type === 'text') { o.text += ev.text; o.onText?.(o.text); }
  else if (ev.type === 'done' || ev.type === 'error') {
    oneShots.delete(requestId);
    if (ev.type === 'error') o.reject(new Error(ev.message));
    else if (ev.aborted) o.reject(new Error('aborted'));
    else o.resolve(o.text.replace(/<think>[\s\S]*?<\/think>/g, '').trim());
  }
});
// level: 'quick' keeps a team to one model (small jobs like titles and memory notes).
// Background jobs (follow-up suggestions, chat titles, memory notes) share the model with your
// next question; they're stopped the moment you ask it, so it starts right away.
const bgJobs = new Set();
function stopBackgroundJobs() { for (const id of bgJobs) qs.abortChat(id); bgJobs.clear(); }
function askAI(target, system, user, { temperature = 0.7, maxTokens = 400, level, onText, requestId = uid(), contextSize = 4096, background = false } = {}) {
  if (background) bgJobs.add(requestId);
  return new Promise((resolve, reject) => {
    const done = (fn) => (x) => { bgJobs.delete(requestId); fn(x); };
    oneShots.set(requestId, { text: '', resolve: done(resolve), reject: done(reject), onText });
    qs.sendChat({ requestId, target, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature, maxTokens, contextSize, gpu: S.data.prefs.gpu, effort: 'quick', ...(level ? { level } : {}), ...(background ? { background: true } : {}) });
  });
}

// ---------- downloads (shared by Models, Teams and Create) ----------

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
  $$('.nav-item[data-nav]').forEach((b) => b.classList.toggle('active', b.dataset.nav === (S.route.view === 'project' ? 'projects' : S.route.view)));
  const v = views[S.route.view] || views.chat;
  const main = $('#main');
  // Redrawing the page you're already on (an answer finishing, checks or follow-ups arriving)
  // must not move anything: no entrance animation, and the chat stays where you were reading.
  const key = `${S.route.view}:${S.route.id || ''}`;
  const same = render.key === key;
  render.key = key;
  const box = same ? document.getElementById('messages') : null;
  const keep = box ? { top: box.scrollTop, bottom: box.scrollHeight - box.scrollTop - box.clientHeight < 120 } : null;
  main.innerHTML = v.html();
  if (typeof paintIcons === 'function') paintIcons(main);
  if (!same) main.firstElementChild?.classList.add('enter');
  v.bind?.();
  if (typeof paintPrivacyBar === 'function') paintPrivacyBar();
  if (keep) { const nb = document.getElementById('messages'); if (nb) nb.scrollTop = keep.bottom ? nb.scrollHeight : keep.top; }
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
      <button class="chat-link" data-chat="${c.id}" title="${esc(c.title)} · ${esc(assistantById(c.assistantId).name)}${c.projectId && projectById(c.projectId) ? ` · ${esc(projectById(c.projectId).name)}` : ''}${c.fromPhone ? ' · from your phone' : ''} · ${ago(c.updated)}"><span class="ce">${esc(c.projectId && projectById(c.projectId) ? projectById(c.projectId).emoji || '📁' : assistantById(c.assistantId).emoji)}</span><span class="t">${esc(c.title)}</span>${c.fromPhone ? `<span class="chat-badge" aria-label="from your phone">${icon('phone', 13)}</span>` : ''}</button>
      <button class="chat-del" data-chat-del="${c.id}" title="Delete this chat" aria-label="Delete ${esc(c.title)}">${icon('trash', 14)}</button>
      <button class="chat-more" data-chat-menu="${c.id}" aria-label="Options for ${esc(c.title)}">⋯</button>
    </div>`;
  $('#chat-list').innerHTML = groups.length
    ? groups.map(([label, list]) => `<div class="chat-group">${esc(label)}</div>${list.map(row).join('')}`).join('')
    : `<div class="small muted" style="padding:8px 10px">${q ? 'No matching chats.' : 'No chats yet.'}</div>`;
  $$('#chat-list [data-chat]').forEach((b) => b.addEventListener('click', () => go({ view: 'chat', id: b.dataset.chat })));
  $$('#chat-list [data-chat-menu]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); chatMenu(b, chatById(b.dataset.chatMenu)); }));
  $$('#chat-list [data-chat-del]').forEach((b) => b.addEventListener('click', (e) => { e.stopPropagation(); deleteChat(chatById(b.dataset.chatDel)); }));
  paintExplore();
}

// Deletes a chat straight away, with Undo for a few seconds (safer than a pop-up for every delete).
function deleteChat(chat) {
  if (!chat) return;
  if (pending?.chatId === chat.id) { toast('Wait for the answer to finish, or stop it, before deleting this chat.'); return; }
  const idx = S.data.chats.indexOf(chat);
  const wasTab = (S.data.prefs.tabs || []).indexOf(chat.id);
  const wasOpen = S.route.view === 'chat' && S.route.id === chat.id;
  S.data.chats = S.data.chats.filter((c) => c !== chat);
  S.data.prefs.tabs = (S.data.prefs.tabs || []).filter((id) => id !== chat.id);
  save();
  if (wasOpen) { const next = (S.data.prefs.tabs || [])[0]; go(next ? { view: 'chat', id: next } : { view: 'home' }); } else renderChatList();
  toastAction(`Deleted "${chat.title}".`, 'Undo', () => {
    S.data.chats.splice(Math.min(idx, S.data.chats.length), 0, chat);
    if (wasTab >= 0) { const t = S.data.prefs.tabs || []; t.splice(Math.min(wasTab, t.length), 0, chat.id); S.data.prefs.tabs = t; }
    save();
    if (wasOpen) go({ view: 'chat', id: chat.id }); else renderChatList();
  });
}

function chatMenu(anchor, chat) {
  closeMenus();
  const r = anchor.getBoundingClientRect();
  const m = document.createElement('div');
  m.className = 'menu';
  m.style.left = `${Math.max(8, r.left - 150)}px`;
  m.style.visibility = 'hidden';
  m.innerHTML = `<button data-m="pin">${chat.pinned ? 'Unpin' : '📌 Pin to top'}</button><button data-m="rename">✏️ Rename</button><button data-m="project">📁 ${chat.projectId ? 'Change project' : 'Move to a project'}</button><button data-m="doc">📝 ${chat.doc ? 'Open the document' : 'New document beside the chat'}</button><button data-m="settings">⚙️ Chat settings</button><button data-m="private">${chat.private ? '🔓 Use memory in this chat' : '🔒 Private (no memory)'}</button><button data-m="share">📤 Share chat…</button><button data-m="export">⬇ Export as Markdown</button><button data-m="delete" class="danger">🗑 Delete</button>`;
  document.body.appendChild(m);
  // Open below the button if the whole menu fits, else above it; never off-screen.
  const h = m.offsetHeight;
  const below = r.bottom + 4;
  m.style.top = `${below + h <= window.innerHeight - 8 ? below : Math.max(8, Math.min(r.top - h - 4, window.innerHeight - h - 8))}px`;
  m.style.maxHeight = `${window.innerHeight - 16}px`;
  m.style.overflowY = 'auto';
  m.style.visibility = '';
  m.querySelector('button').focus();
  m.addEventListener('click', async (e) => {
    const act = e.target.closest('[data-m]')?.dataset.m;
    closeMenus();
    if (act === 'pin') { chat.pinned = !chat.pinned; save(); renderChatList(); }
    if (act === 'project') moveToProject(chat);
    if (act === 'settings') chatSettings(chat);
    if (act === 'doc') { if (S.route.id !== chat.id) S.route = { view: 'chat', id: chat.id }; openDoc(chat, chat.doc?.text ?? '', chat.doc?.title || (chat.title !== 'New chat' ? chat.title : 'Untitled document')); }
    if (act === 'private') { chat.private = !chat.private; save(); render(); toast(chat.private ? 'Private chat: memory is not used, and nothing new is remembered.' : 'This chat uses your memory again.'); }
    if (act === 'rename') {
      const b = openModal(`<h2>Rename chat</h2><input id="rn" value="${esc(chat.title)}"><div class="modal-actions"><button class="btn" data-close>Cancel</button><button class="btn primary" id="rn-ok">Save</button></div>`);
      const ok = () => { chat.title = b.querySelector('#rn').value.trim() || chat.title; chat.renamed = true; save(); closeModal(); render(); };
      b.querySelector('#rn-ok').onclick = ok;
      b.querySelector('#rn').addEventListener('keydown', (k) => { if (k.key === 'Enter') ok(); });
      b.querySelector('#rn').select();
    }
    if (act === 'export') {
      const a = assistantById(chat.assistantId);
      const md = chat.messages.map((x) => `## ${x.role === 'user' ? (S.data.prefs.userName || 'You') : a.name}\n\n${x.role === 'assistant' ? x.alts[x.altIndex]?.text || '' : x.text}`).join('\n\n');
      if (await call('file:saveText', `${chat.title.replace(/[^\w -]/g, '').slice(0, 60) || 'chat'}.md`, `# ${chat.title}\n\n${md}\n`)) toast('Chat saved.');
    }
    if (act === 'share') shareChat(chat);
    if (act === 'delete') deleteChat(chat);
  });
}
function closeMenus() { $$('.menu').forEach((m) => m.parentNode.removeChild(m)); }
// Clicks outside a menu close it (but not the click on the button that just opened one).
document.addEventListener('click', (e) => { if (!e.target.closest('.menu, [data-chat-menu], [data-act="saveas"], [data-act="other"], [data-act="more"], #opts-btn, [data-dp="save"], #chat-more')) closeMenus(); });
document.addEventListener('keydown', (e) => { if (e.key === 'Escape') closeMenus(); });

// ---------- charts (```chart JSON blocks become SVG charts) ----------

const CHART_COLORS = ['#7b5cff', '#4f8fe0', '#3fbf86', '#e8834a', '#d6467a', '#d9b22b', '#2fb9c6', '#8a6d3b'];
const chartStore = {};
// A short, stable name for a piece of text (the same text always gets the same name).
function textKey(text) { let h = 5381; let g = 52711; const t = String(text); for (let i = 0; i < t.length; i++) { const c = t.charCodeAt(i); h = (h * 33) ^ c; g = (g * 33) ^ c; } return (h >>> 0).toString(36) + (g >>> 0).toString(36) + t.length.toString(36); }

function chartHTML(json) {
  let spec;
  try { spec = JSON.parse(json); } catch { return ''; }
  if (!Array.isArray(spec.labels) || !Array.isArray(spec.series) || !spec.series.length) return '';
  const id = `c${textKey(json)}`; // named after its contents, so a redraw does not keep another copy
  chartStore[id] = spec;
  const W = 640; const H = 340; const P = { l: 56, r: 16, t: 40, b: 56 };
  const t = esc(spec.title || '');
  const type = spec.type || 'bar';
  let body = '';
  if (type === 'pie' || type === 'doughnut') {
    const data = spec.series[0].data.map(Number);
    const total = data.reduce((a, b) => a + Math.max(0, b), 0) || 1;
    let ang = -Math.PI / 2;
    const cx = 200; const cy = 190; const rr = 120;
    data.forEach((v, i) => {
      const a2 = ang + (Math.max(0, v) / total) * Math.PI * 2;
      const large = a2 - ang > Math.PI ? 1 : 0;
      body += `<path d="M${cx},${cy} L${cx + rr * Math.cos(ang)},${cy + rr * Math.sin(ang)} A${rr},${rr} 0 ${large} 1 ${cx + rr * Math.cos(a2)},${cy + rr * Math.sin(a2)} Z" fill="${CHART_COLORS[i % 8]}" stroke="#fff" stroke-width="2"><title>${esc(spec.labels[i])}: ${esc(String(v))}</title></path>`;
      ang = a2;
    });
    if (type === 'doughnut') body += `<circle cx="${cx}" cy="${cy}" r="${rr * 0.55}" fill="#fff"/>`;
    body += spec.labels.map((l, i) => `<rect x="360" y="${70 + i * 26}" width="14" height="14" rx="3" fill="${CHART_COLORS[i % 8]}"/><text x="382" y="${82 + i * 26}" font-size="13" fill="#16122a">${esc(l)} (${Math.round((Number(data[i]) / total) * 100)}%)</text>`).join('');
  } else {
    const all = spec.series.flatMap((s) => s.data.map(Number)).filter(Number.isFinite);
    const max = Math.max(0, ...all); const min = Math.min(0, ...all);
    const span = max - min || 1;
    const x0 = P.l; const x1 = W - P.r; const y0 = P.t; const y1 = H - P.b;
    const y = (v) => y1 - ((v - min) / span) * (y1 - y0);
    const n = spec.labels.length;
    for (let k = 0; k <= 4; k++) { const v = min + (span * k) / 4; body += `<line x1="${x0}" x2="${x1}" y1="${y(v)}" y2="${y(v)}" stroke="#d7cff2"/><text x="${x0 - 6}" y="${y(v) + 4}" font-size="11" text-anchor="end" fill="#3d3858">${Math.abs(v) >= 1000 ? `${(v / 1000).toFixed(1)}k` : Math.round(v * 100) / 100}</text>`; }
    const step = (x1 - x0) / n;
    spec.labels.forEach((l, i) => { body += `<text x="${x0 + step * (i + 0.5)}" y="${y1 + 18}" font-size="11" text-anchor="middle" fill="#3d3858">${esc(String(l).slice(0, 14))}</text>`; });
    if (type === 'bar') {
      const bw = (step * 0.8) / spec.series.length;
      spec.series.forEach((s, si) => s.data.forEach((v, i) => { const yy = y(Math.max(0, v)); const h = Math.abs(y(v) - y(0)); body += `<rect x="${x0 + step * i + step * 0.1 + bw * si}" y="${yy}" width="${bw - 2}" height="${Math.max(1, h)}" rx="3" fill="${CHART_COLORS[si % 8]}"><title>${esc(s.name)} · ${esc(spec.labels[i])}: ${esc(String(v))}</title></rect>`; }));
    } else {
      spec.series.forEach((s, si) => {
        const pts = s.data.map((v, i) => `${x0 + step * (i + 0.5)},${y(Number(v))}`).join(' ');
        if (type === 'area') body += `<polygon points="${x0 + step * 0.5},${y(0)} ${pts} ${x0 + step * (n - 0.5)},${y(0)}" fill="${CHART_COLORS[si % 8]}" opacity=".25"/>`;
        body += `<polyline points="${pts}" fill="none" stroke="${CHART_COLORS[si % 8]}" stroke-width="3" stroke-linejoin="round"/>`;
        s.data.forEach((v, i) => { body += `<circle cx="${x0 + step * (i + 0.5)}" cy="${y(Number(v))}" r="4" fill="${CHART_COLORS[si % 8]}"><title>${esc(s.name)} · ${esc(spec.labels[i])}: ${esc(String(v))}</title></circle>`; });
      });
    }
    if (spec.series.length > 1) body += spec.series.map((s, si) => `<rect x="${x0 + si * 130}" y="${H - 22}" width="12" height="12" rx="3" fill="${CHART_COLORS[si % 8]}"/><text x="${x0 + si * 130 + 18}" y="${H - 12}" font-size="12" fill="#16122a">${esc(s.name)}</text>`).join('');
  }
  return `<figure class="chart" data-chart="${id}"><svg viewBox="0 0 ${W} ${H}" xmlns="http://www.w3.org/2000/svg" role="img" aria-label="${t || 'Chart'}" font-family="Segoe UI, system-ui, sans-serif"><rect width="${W}" height="${H}" fill="#fff"/>${t ? `<text x="${W / 2}" y="24" font-size="16" font-weight="700" text-anchor="middle" fill="#16122a">${t}</text>` : ''}${body}</svg>
    <figcaption class="table-tools"><button class="tool" data-chart-png="${id}">Save as image</button><button class="tool" data-chart-xlsx="${id}">Save data to Excel</button></figcaption></figure>`;
}

document.addEventListener('click', async (e) => {
  const png = e.target.closest('[data-chart-png]');
  const xl = e.target.closest('[data-chart-xlsx]');
  if (!png && !xl) return;
  const id = (png || xl).dataset.chartPng || (png || xl).dataset.chartXlsx;
  const spec = chartStore[id];
  if (xl) {
    const rows = [['', ...spec.series.map((s) => s.name || 'Value')], ...spec.labels.map((l, i) => [l, ...spec.series.map((s) => s.data[i])])];
    if (await call('file:saveXlsx', `${spec.title || 'chart'}.xlsx`, rows)) toast('Chart data saved to Excel.');
    return;
  }
  const svg = document.querySelector(`[data-chart="${id}"] svg`);
  const img = new Image();
  img.onload = async () => {
    const c = document.createElement('canvas'); c.width = 1280; c.height = 680;
    c.getContext('2d').drawImage(img, 0, 0, c.width, c.height);
    const item = await call('media:saveDataUrl', c.toDataURL('image/png'), { title: spec.title || 'Chart' });
    if (item && await call('media:export', item.id)) toast('Chart saved.');
  };
  img.src = `data:image/svg+xml;charset=utf-8,${encodeURIComponent(new XMLSerializer().serializeToString(svg))}`;
});
