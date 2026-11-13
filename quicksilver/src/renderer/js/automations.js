// Automations: things Quicksilver does by itself on a schedule (every hour, every day, on weekdays,
// once a week, every N minutes, or when it starts): a morning briefing, a price check, a research
// digest, a site check. Each run is an ordinary message in the automation's own chat, so web search,
// plug-ins and your connected apps work as they do when you ask; a desktop notification says when
// it's done. They run while Quicksilver is open; one that was missed while it was closed runs once
// when it opens (if it was due in the last 12 hours).
'use strict';

const AUTO_TEMPLATES = [
  { name: 'Morning briefing', icon: '☀️', prompt: 'Give me a short morning briefing: today\'s weather where I live, the top 5 news stories of the last 24 hours with one line each, and anything on my calendar today if my calendar is connected.', schedule: { kind: 'weekdays', time: '07:30' }, web: true },
  { name: 'Crypto and stock check', icon: '💹', prompt: 'What are the current prices and 24-hour changes of bitcoin and ethereum, and the latest prices of AAPL, MSFT and NVDA? Flag anything that moved more than 5%.', schedule: { kind: 'daily', time: '16:30' }, web: true },
  { name: 'Research digest', icon: '🔬', prompt: 'Find the most interesting new research papers from the last week on large language models (arXiv) and summarize the top 5 in two sentences each, with links.', schedule: { kind: 'weekly', day: 1, time: '09:00' }, web: true },
  { name: 'Tech news digest', icon: '📰', prompt: 'What are developers discussing most on Hacker News today? Give the top 8 stories with one line each and the link.', schedule: { kind: 'daily', time: '12:00' }, web: true },
  { name: 'My website check', icon: '🧪', prompt: 'Test my website at https://example.com: visit its pages and tell me about any errors, broken links or slow pages.', schedule: { kind: 'daily', time: '06:00' }, web: true },
  { name: 'Price drop watch', icon: '🏷️', prompt: 'Read this product page and tell me the current price and whether it is in stock: https://example.com/product', schedule: { kind: 'every', minutes: 240 }, web: true },
  { name: 'Weekly plan', icon: '🗓️', prompt: 'Help me plan the week: list my calendar events for the next 7 days if my calendar is connected, suggest three focus goals, and a short daily plan.', schedule: { kind: 'weekly', day: 1, time: '08:00' }, web: false },
];
const DAYS = ['Sunday', 'Monday', 'Tuesday', 'Wednesday', 'Thursday', 'Friday', 'Saturday'];
const autos = () => (S.data.automations ||= []);

// When an automation should next run, after `from`.
function nextRun(sched, from = Date.now(), last = 0) {
  const s = sched || {};
  const at = (d, hhmm) => { const [h, mi] = String(hhmm || '08:00').split(':').map(Number); const x = new Date(d); x.setHours(h || 0, mi || 0, 0, 0); return x; };
  if (s.kind === 'startup') return null;
  if (s.kind === 'every') return Math.max(from, (last || from) + Math.max(5, Number(s.minutes) || 60) * 60000) + (last ? 0 : 0);
  if (s.kind === 'hourly') { const x = new Date(from); x.setMinutes(Number(s.minute) || 0, 0, 0); if (x.getTime() <= from) x.setHours(x.getHours() + 1); return x.getTime(); }
  for (let i = 0; i < 8; i++) {
    const d = at(new Date(from + i * 86400000), s.time);
    if (d.getTime() <= from) continue;
    if (s.kind === 'weekdays' && [0, 6].includes(d.getDay())) continue;
    if (s.kind === 'weekly' && d.getDay() !== (Number(s.day) || 0)) continue;
    return d.getTime();
  }
  return from + 86400000;
}
function schedText(s) {
  return s.kind === 'startup' ? 'When Quicksilver starts' : s.kind === 'every' ? `Every ${s.minutes >= 60 && s.minutes % 60 === 0 ? `${s.minutes / 60} hour${s.minutes === 60 ? '' : 's'}` : `${s.minutes} minutes`}`
    : s.kind === 'hourly' ? `Every hour at :${String(s.minute || 0).padStart(2, '0')}` : s.kind === 'weekdays' ? `Weekdays at ${s.time}` : s.kind === 'weekly' ? `${DAYS[Number(s.day) || 0]}s at ${s.time}` : `Every day at ${s.time}`;
}

// ---------- running ----------
let autoBusy = null;
async function runAutomation(a, why = 'scheduled') {
  if (autoBusy || pending) return false; // one thing at a time; it runs at the next check
  autoBusy = a.id;
  try {
    let chat = S.data.chats.find((c) => c.id === a.chatId);
    if (!chat) {
      chat = { id: uid(), title: `⏱ ${a.name}`, assistantId: 'as-general', created: now(), updated: now(), messages: [], automation: a.id, renamed: true }; // (keeps its name)
      S.data.chats.push(chat); a.chatId = chat.id;
    }
    if (a.target) chat.target = a.target;
    chat.web = a.web !== false; chat.tools = a.tools !== false;
    chat.messages.push({ id: uid(), t: now(), role: 'user', text: a.prompt, auto: { id: a.id, why } });
    a.lastRun = Date.now(); a.runs = (a.runs || 0) + 1;
    a.next = nextRun(a.schedule, Date.now(), a.lastRun);
    save();
    generate(chat, null);
    // When the answer is in: a notification with its first lines.
    const started = Date.now();
    await new Promise((resolve) => {
      const t = setInterval(() => {
        const last = chat.messages.at(-1);
        const alt = last?.role === 'assistant' ? last.alts[last.altIndex] : null;
        if ((alt && !pending && (alt.text || alt.error)) || Date.now() - started > 30 * 60000) { clearInterval(t); resolve(); }
      }, 1500);
    });
    const last = chat.messages.at(-1); const alt = last?.alts?.[last.altIndex];
    a.lastResult = alt?.error ? `⚠️ ${String(alt.error).slice(0, 160)}` : String(alt?.text || '').replace(/\s+/g, ' ').slice(0, 200);
    save();
    if (a.notify !== false && typeof Notification === 'function') {
      try { const n = new Notification(`Quicksilver · ${a.name}`, { body: a.lastResult || 'Done.', silent: false }); n.onclick = () => { go({ view: 'chat', id: chat.id }); }; } catch {}
    }
    if (S.route.view === 'automations') render();
    return true;
  } finally { autoBusy = null; }
}
// Checks every 30 seconds while Quicksilver is open.
let autoStarted = false;
function startAutomations() {
  if (autoStarted) return; autoStarted = true;
  const t0 = Date.now();
  for (const a of autos()) {
    if (!a.enabled) continue;
    if (a.schedule?.kind === 'startup') { a.next = t0 + 20000; continue; }
    // Missed while closed: once, if it was due in the last 12 hours; otherwise the next time.
    if (!a.next || a.next < t0 - 12 * 3600000) a.next = nextRun(a.schedule, t0, a.lastRun);
  }
  setInterval(() => {
    const due = autos().filter((a) => a.enabled && a.next && a.next <= Date.now()).sort((x, y) => x.next - y.next)[0];
    if (due) runAutomation(due).then((ran) => { if (ran && due.schedule?.kind === 'startup') due.next = null; save(); });
  }, 30000);
}

// ---------- the page ----------
views.automations = {
  html() {
    const list = autos();
    return `<div class="page"><div class="page-head"><h1>Automations</h1><button class="btn primary" id="auto-new">＋ New automation</button></div>
      <p class="lede">Things Quicksilver does by itself on a schedule, with web search, plug-ins and your connected apps, while it's open. Each run goes to its own chat and pops up a notification. Missed runs (Quicksilver was closed) run once when it opens.</p>
      ${list.length ? `<div class="stack-v">${list.map((a) => `<div class="card auto-row"><div class="row"><span class="emoji-badge">${esc(a.icon || '⏱')}</span><div class="grow"><b>${esc(a.name)}</b><div class="small muted">${esc(schedText(a.schedule || {}))}${a.enabled && a.next ? ` · next ${new Date(a.next).toLocaleString(undefined, { weekday: 'short', hour: 'numeric', minute: '2-digit' })}` : ''}${a.lastRun ? ` · last ran ${ago(a.lastRun)}` : ''}${a.target ? ` · ${esc(targetLabel(a.target))}` : ''}</div></div>
          <label class="switch" title="On or off"><input type="checkbox" data-auto-on="${a.id}" ${a.enabled ? 'checked' : ''}><span></span></label>
          <button class="btn small" data-auto-run="${a.id}" ${autoBusy ? 'disabled' : ''}>${autoBusy === a.id ? 'Running…' : '▶ Run now'}</button>${a.chatId ? `<button class="btn small" data-auto-open="${a.id}">Results</button>` : ''}<button class="btn small ghost" data-auto-edit="${a.id}">Edit</button><button class="btn small ghost" data-auto-del="${a.id}">Delete</button></div>
          <div class="small" style="margin-top:4px">${esc(a.prompt.slice(0, 180))}${a.prompt.length > 180 ? '…' : ''}</div>
          ${a.lastResult ? `<div class="small muted" style="margin-top:4px">Last result: ${esc(a.lastResult)}</div>` : ''}</div>`).join('')}</div>` : '<div class="empty small">No automations yet. Start from an idea below or make your own.</div>'}
      <div class="section"><h2>Ideas</h2></div>
      <div class="cards">${AUTO_TEMPLATES.map((t, i) => `<button class="card" data-auto-tpl="${i}" style="text-align:left"><div class="row"><span class="emoji-badge">${t.icon}</span><b class="grow">${esc(t.name)}</b></div><div class="small muted" style="margin-top:4px">${esc(schedText(t.schedule))}</div><div class="small" style="margin-top:4px">${esc(t.prompt.slice(0, 120))}…</div></button>`).join('')}</div>
    </div>`;
  },
  bind() {
    $('#auto-new').addEventListener('click', () => editAutomation(null));
    $$('[data-auto-tpl]').forEach((b) => b.addEventListener('click', () => editAutomation(null, AUTO_TEMPLATES[Number(b.dataset.autoTpl)])));
    const byId = (id) => autos().find((a) => a.id === id);
    $$('[data-auto-on]').forEach((b) => b.addEventListener('change', () => { const a = byId(b.dataset.autoOn); a.enabled = b.checked; a.next = a.enabled ? (a.schedule?.kind === 'startup' ? null : nextRun(a.schedule)) : null; save(); render(); }));
    $$('[data-auto-run]').forEach((b) => b.addEventListener('click', async () => { if (pending) { toast('Wait for the current answer to finish.'); return; } const a = byId(b.dataset.autoRun); render(); await runAutomation(a, 'run now'); toast(`${a.name}: done.`); }));
    $$('[data-auto-open]').forEach((b) => b.addEventListener('click', () => go({ view: 'chat', id: byId(b.dataset.autoOpen).chatId })));
    $$('[data-auto-edit]').forEach((b) => b.addEventListener('click', () => editAutomation(byId(b.dataset.autoEdit))));
    $$('[data-auto-del]').forEach((b) => b.addEventListener('click', async () => { if (!(await confirmBox('Delete this automation? Its results chat stays.'))) return; S.data.automations = autos().filter((a) => a.id !== b.dataset.autoDel); save(); render(); }));
  },
};

function editAutomation(a, tpl) {
  const x = a || { name: tpl?.name || '', icon: tpl?.icon || '⏱', prompt: tpl?.prompt || '', schedule: { ...(tpl?.schedule || { kind: 'daily', time: '08:00' }) }, web: tpl?.web !== false, tools: true, notify: true, target: '' };
  const s = x.schedule;
  const opt = (v, l, cur) => `<option value="${v}" ${String(cur) === String(v) ? 'selected' : ''}>${esc(l)}</option>`;
  const b = openModal(`<h2>${a ? 'Edit automation' : 'New automation'}</h2><div class="stack-v">
    <div class="field"><label for="au-name">Name</label><input id="au-name" value="${esc(x.name)}" placeholder="Morning briefing"></div>
    <div class="field"><label for="au-prompt">What should it do?</label><span class="help">Write it as you would ask in a chat. It can search the web, read pages, use plug-ins and your connected apps.</span><textarea id="au-prompt" rows="4">${esc(x.prompt)}</textarea></div>
    <div class="row" style="gap:10px;flex-wrap:wrap">
      <div class="field"><label for="au-kind">When</label><select id="au-kind">${opt('daily', 'Every day', s.kind)}${opt('weekdays', 'Weekdays', s.kind)}${opt('weekly', 'Once a week', s.kind)}${opt('hourly', 'Every hour', s.kind)}${opt('every', 'Every few minutes or hours', s.kind)}${opt('startup', 'When Quicksilver starts', s.kind)}</select></div>
      <div class="field" id="au-time-f"><label for="au-time">At</label><input id="au-time" type="time" value="${esc(s.time || '08:00')}"></div>
      <div class="field" id="au-day-f"><label for="au-day">Day</label><select id="au-day">${DAYS.map((d, i) => opt(i, d, s.day ?? 1)).join('')}</select></div>
      <div class="field" id="au-min-f"><label for="au-min">Every (minutes)</label><input id="au-min" type="number" min="5" step="5" value="${esc(String(s.minutes || 60))}"></div>
    </div>
    <div class="field"><label for="au-target">Model or team</label><select id="au-target">${targetOptions(x.target, { includeNone: true, noneLabel: 'My default (Automatic)' })}</select></div>
    <label class="row"><input type="checkbox" id="au-web" ${x.web !== false ? 'checked' : ''}> <span>Search the web when it helps</span></label>
    <label class="row"><input type="checkbox" id="au-tools" ${x.tools !== false ? 'checked' : ''}> <span>Use plug-ins and connected apps</span></label>
    <label class="row"><input type="checkbox" id="au-notify" ${x.notify !== false ? 'checked' : ''}> <span>Notify me when it's done</span></label>
  </div><div class="modal-actions"><button class="btn" data-close>Cancel</button>${a ? '' : '<button class="btn" id="au-test">Save and run now</button>'}<button class="btn primary" id="au-save">Save</button></div>`);
  const showFields = () => { const k = $('#au-kind', b).value; $('#au-time-f', b).hidden = !['daily', 'weekdays', 'weekly'].includes(k); $('#au-day-f', b).hidden = k !== 'weekly'; $('#au-min-f', b).hidden = k !== 'every'; };
  $('#au-kind', b).addEventListener('change', showFields); showFields();
  const collect = () => {
    const name = $('#au-name', b).value.trim(); const prompt = $('#au-prompt', b).value.trim();
    if (!name || !prompt) { toast('Give it a name and say what it should do.'); return null; }
    const kind = $('#au-kind', b).value;
    const sched = { kind, ...(['daily', 'weekdays', 'weekly'].includes(kind) ? { time: $('#au-time', b).value || '08:00' } : {}), ...(kind === 'weekly' ? { day: Number($('#au-day', b).value) } : {}), ...(kind === 'every' ? { minutes: Math.max(5, Number($('#au-min', b).value) || 60) } : {}) };
    const it = a || { id: uid(), created: Date.now(), enabled: true, icon: x.icon };
    Object.assign(it, { name, prompt, schedule: sched, target: $('#au-target', b).value, web: $('#au-web', b).checked, tools: $('#au-tools', b).checked, notify: $('#au-notify', b).checked });
    it.next = it.enabled ? (kind === 'startup' ? null : nextRun(sched)) : null;
    if (!a) autos().push(it);
    save(); closeModal(); render();
    if (it.notify && typeof Notification === 'function' && Notification.permission === 'default') Notification.requestPermission().catch(() => {});
    return it;
  };
  $('#au-save', b).addEventListener('click', () => { const it = collect(); if (it) toast(`Saved: ${schedText(it.schedule)}.`); });
  $('#au-test', b)?.addEventListener('click', () => { const it = collect(); if (it) runAutomation(it, 'run now'); });
}
