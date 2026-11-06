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
// Seconds for a target to write `words`, or null if unknown. Smart stacks answer simple
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
const starText = (n) => (n == null ? '' : `★ ${Number.isInteger(n) ? n : n.toFixed(1)}`);
const etaBadge = (sec, what = '', stars = null) => (sec == null && stars == null ? '' : `<span class="badge b-lav eta" title="Estimated on this PC: time and expected quality (out of 5)">${sec != null ? `⏱ ${etaLabel(sec)}${what ? ` ${what}` : ''}` : ''}${sec != null && stars != null ? ' · ' : ''}${stars != null ? starText(stars) : ''}</span>`);
const SKILL_JOB = { code: 'coding', writing: 'writing', career: 'writing', voice: 'writing', music: 'writing', office: 'office', finance: 'office', research: 'research', life: 'general', fun: 'general', vision: 'general', media: 'general', editing: 'general' };
// How many words a job usually needs, from an assistant's kind of work or a skill's output.
const wordsForJob = (job) => S.catalog?.jobs?.[job]?.words || WORDS.chat;
const wordsForSkill = (s) => ({ docx: WORDS.document, pptx: WORDS.slides, xlsx: WORDS.sheet, chart: WORDS.chart, app: WORDS.code * 2, beat: WORDS.prompt * 2, podcast: WORDS.document * 1.5, narrate: WORDS.document, image: WORDS.prompt, video: WORDS.prompt, edit: WORDS.prompt, animate: WORDS.prompt }[s?.output] || (s?.category === 'code' ? WORDS.code : WORDS.writing));
function mediaEta(target) { const id = String(target || '').replace(/^local:/, ''); return S.speed?.media?.[id]?.sec ?? null; }
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
  if (ev.type === 'text') o.text += ev.text;
  else if (ev.type === 'done' || ev.type === 'error') {
    oneShots.delete(requestId);
    if (ev.type === 'error') o.reject(new Error(ev.message)); else o.resolve(o.text.replace(/<think>[\s\S]*?<\/think>/g, '').trim());
  }
});
function askAI(target, system, user, { temperature = 0.7, maxTokens = 400 } = {}) {
  return new Promise((resolve, reject) => {
    const requestId = uid();
    oneShots.set(requestId, { text: '', resolve, reject });
    qs.sendChat({ requestId, target, messages: [{ role: 'system', content: system }, { role: 'user', content: user }], temperature, maxTokens, contextSize: 4096, gpu: S.data.prefs.gpu, effort: 'quick' });
  });
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
  const main = $('#main');
  main.innerHTML = v.html();
  if (typeof paintIcons === 'function') paintIcons(main);
  main.firstElementChild?.classList.add('enter');
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

// ---------- charts (```chart JSON blocks become SVG charts) ----------

const CHART_COLORS = ['#7b5cff', '#4f8fe0', '#3fbf86', '#e8834a', '#d6467a', '#d9b22b', '#2fb9c6', '#8a6d3b'];
const chartStore = {};

function chartHTML(json) {
  let spec;
  try { spec = JSON.parse(json); } catch { return ''; }
  if (!Array.isArray(spec.labels) || !Array.isArray(spec.series) || !spec.series.length) return '';
  const id = `c${uid()}`;
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
      body += `<path d="M${cx},${cy} L${cx + rr * Math.cos(ang)},${cy + rr * Math.sin(ang)} A${rr},${rr} 0 ${large} 1 ${cx + rr * Math.cos(a2)},${cy + rr * Math.sin(a2)} Z" fill="${CHART_COLORS[i % 8]}" stroke="#fff" stroke-width="2"><title>${esc(spec.labels[i])}: ${v}</title></path>`;
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
      spec.series.forEach((s, si) => s.data.forEach((v, i) => { const yy = y(Math.max(0, v)); const h = Math.abs(y(v) - y(0)); body += `<rect x="${x0 + step * i + step * 0.1 + bw * si}" y="${yy}" width="${bw - 2}" height="${Math.max(1, h)}" rx="3" fill="${CHART_COLORS[si % 8]}"><title>${esc(s.name)} · ${esc(spec.labels[i])}: ${v}</title></rect>`; }));
    } else {
      spec.series.forEach((s, si) => {
        const pts = s.data.map((v, i) => `${x0 + step * (i + 0.5)},${y(Number(v))}`).join(' ');
        if (type === 'area') body += `<polygon points="${x0 + step * 0.5},${y(0)} ${pts} ${x0 + step * (n - 0.5)},${y(0)}" fill="${CHART_COLORS[si % 8]}" opacity=".25"/>`;
        body += `<polyline points="${pts}" fill="none" stroke="${CHART_COLORS[si % 8]}" stroke-width="3" stroke-linejoin="round"/>`;
        s.data.forEach((v, i) => { body += `<circle cx="${x0 + step * (i + 0.5)}" cy="${y(Number(v))}" r="4" fill="${CHART_COLORS[si % 8]}"><title>${esc(s.name)} · ${esc(spec.labels[i])}: ${v}</title></circle>`; });
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
