// Memory: things you've told Quicksilver about yourself, carried into every new chat.
//  - Say "remember that…" and it's saved straight away; "forget…" removes it.
//  - It also notices lasting facts on its own (your job, your tools, how you like answers),
//    using the smallest model on this PC, after the answer is finished.
//  - Only the memories that matter for the question go into each prompt.
//  - Private chats neither read nor add memories. Everything stays on this PC.
'use strict';

const MEM_MAX = 300;
const memList = () => (S.data.memory ||= []);
const memOn = () => S.data.prefs.memory !== false;
const memLearn = () => S.data.prefs.memoryLearn !== false;
const memWords = (t) => new Set(String(t || '').toLowerCase().match(/[a-z0-9]{3,}/g) || []);
const MEM_STOP = new Set(['the', 'and', 'that', 'this', 'with', 'for', 'you', 'are', 'was', 'have', 'has', 'user', 'users', 'they', 'their', 'from', 'about', 'what', 'when', 'like', 'just', 'your', 'can', 'not', 'but', 'all', 'any', 'how', 'who', 'its']);

function memSimilar(a, b) {
  const x = [...memWords(a)].filter((w) => !MEM_STOP.has(w));
  const y = memWords(b);
  if (!x.length || !y.size) return 0;
  return x.filter((w) => y.has(w)).length / Math.min(x.length, [...y].filter((w) => !MEM_STOP.has(w)).length || 1);
}

function addMemory(text, source = 'chat') {
  const t = String(text || '').replace(/\s+/g, ' ').trim().replace(/^that\s+/i, '').slice(0, 400);
  if (t.length < 3) return null;
  const list = memList();
  // A newer version of the same fact replaces the old one ("I work at X" → "I work at Y").
  const old = list.find((m) => memSimilar(t, m.text) >= 0.75);
  if (old) { old.text = t; old.updated = now(); save(); return old; }
  const m = { id: uid(), text: t, created: now(), updated: now(), source };
  list.push(m);
  if (list.length > MEM_MAX) list.splice(0, list.length - MEM_MAX);
  save();
  return m;
}
function forgetMatching(text) {
  const list = memList();
  const hits = list.filter((m) => memSimilar(text, m.text) >= 0.5);
  S.data.memory = list.filter((m) => !hits.includes(m));
  if (hits.length) save();
  return hits;
}

// The few memories that matter for this question: everything when there are only a handful,
// otherwise the ones sharing the most words with it, plus the most recent.
function memoryFor(question) {
  const list = memList();
  if (list.length <= 15) return list;
  const q = memWords(question);
  const scored = list.map((m, i) => ({ m, s: [...memWords(m.text)].filter((w) => q.has(w) && !MEM_STOP.has(w)).length * 3 + i / list.length }));
  return scored.sort((a, b) => b.s - a.s).slice(0, 15).map((x) => x.m);
}
function memoryPrompt(chat, question) {
  if (!memOn() || chat?.private) return '';
  const use = memoryFor(question);
  if (!use.length) return '';
  return `What you remember about the user from earlier conversations (use it when it helps, naturally, without announcing that you remember):\n${use.map((m) => `- ${m.text}`).join('\n')}`;
}

// "Remember that…" / "Forget that…", handled before the model even answers.
const REMEMBER_RE = /^\s*(?:please\s+|hey\s+)?(?:remember|don'?t forget|note|keep in mind)(?:\s+that)?[:,]?\s+(.{3,})$/i;
const FORGET_RE = /^\s*(?:please\s+)?forget(?:\s+(?:that|about))?[:,]?\s+(.{3,})$/i;
function memoryCommand(chat, text) {
  if (!memOn() || chat?.private || !text) return null;
  const r = text.match(REMEMBER_RE);
  if (r && !/\?\s*$/.test(text) && !/^(remember|note) (when|how|what|the time)\b/i.test(text.trim())) {
    const m = addMemory(r[1].replace(/[.!]+$/, ''), 'asked');
    return m ? { saved: [m.text] } : null;
  }
  const f = text.match(FORGET_RE);
  if (f) { const gone = forgetMatching(f[1]); return gone.length ? { forgot: gone.map((m) => m.text) } : null; }
  return null;
}

// Noticing lasting facts after an answer. Only runs when the message talks about the user.
const PERSONAL_RE = /\b(i am|i'm|im|my|mine|i work|i live|i prefer|i like|i love|i hate|i use|i have|i've|call me|we are|we're|our|i study|i teach|i run|i own)\b/i;
let memBusy = false;
async function learnFrom(chat, userText) {
  if (!memOn() || !memLearn() || chat?.private || memBusy || !userText || userText.length > 3000 || !PERSONAL_RE.test(userText)) return [];
  if (REMEMBER_RE.test(userText) || FORGET_RE.test(userText)) return [];
  const helper = promptHelper();
  if (!helper) return [];
  memBusy = true;
  try {
    const known = memList().slice(-30).map((m) => `- ${m.text}`).join('\n') || '(nothing yet)';
    const out = await askAI(helper, `You keep a short memory about a user, for future conversations. From the user's message, list only LASTING facts worth remembering: their name, job, studies, location, family, pets, ongoing projects, tools and software they use, and how they like answers. Skip one-off requests, questions, opinions about this conversation, and secrets (passwords, card or account numbers). Don't repeat what is already known. Write each fact as a short sentence starting with "The user". Reply with ONLY a JSON array of strings, or [] if there is nothing lasting.\n\nAlready known:\n${known}`, userText.slice(0, 2000), { temperature: 0.1, maxTokens: 160, level: 'quick', background: true });
    const arr = JSON.parse((out.match(/\[[\s\S]*\]/) || ['[]'])[0]);
    const saved = [];
    for (const f of Array.isArray(arr) ? arr.slice(0, 4) : []) {
      if (typeof f !== 'string' || f.length < 8 || f.length > 240 || /password|card number|account number|\bpin\b/i.test(f)) continue;
      if (memList().some((m) => memSimilar(f, m.text) >= 0.9)) continue;
      const m = addMemory(f, 'learned');
      if (m) saved.push(m.text);
    }
    return saved;
  } catch { return []; } finally { memBusy = false; }
}

// After each finished answer: note anything lasting from the question that led to it.
const memWatch = new Map(); // requestId -> { chatId, msgId }
qs.onChat(({ requestId, ev }) => {
  if (pending?.requestId === requestId && !memWatch.has(requestId)) memWatch.set(requestId, { chatId: pending.chatId, msgId: pending.msgId });
  if (ev.type !== 'done' && ev.type !== 'error') return;
  const w = memWatch.get(requestId);
  memWatch.delete(requestId);
  if (!w || ev.type === 'error' || ev.aborted) return;
  setTimeout(async () => {
    const chat = chatById(w.chatId);
    const msg = chat?.messages.find((m) => m.id === w.msgId);
    if (!chat || !msg) return;
    const q = [...chat.messages.slice(0, chat.messages.indexOf(msg))].reverse().find((m) => m.role === 'user');
    if (!q?.text || q.memoryDone) return;
    q.memoryDone = true;
    const saved = await learnFrom(chat, q.text);
    if (saved.length) {
      const alt = msg.alts[msg.altIndex];
      alt.remembered = [...(alt.remembered || []), ...saved];
      save();
      if (S.route.view === 'chat' && S.route.id === chat.id && !pending) render();
    }
  }, 1800);
});

function memoryChipHTML(alt) {
  const r = alt?.remembered;
  const f = alt?.forgot;
  if (!r?.length && !f?.length) return '';
  const tip = [...(r || []).map((t) => `Remembered: ${t}`), ...(f || []).map((t) => `Forgot: ${t}`)].join('\n');
  return `<button class="chip-d mem-chip" data-mem-open title="${esc(tip)}">${icon('brain', 14)} ${r?.length ? (r.length === 1 ? 'Remembered' : `Remembered ${r.length} things`) : 'Forgot'}</button>`;
}
document.addEventListener('click', (e) => { if (e.target.closest('[data-mem-open]')) openMemory(); });

// ---------- the memory manager ----------
function memoryManagerHTML() {
  const list = [...memList()].sort((a, b) => b.updated - a.updated);
  const src = { asked: 'You asked', learned: 'Noticed', manual: 'Added', phone: 'From your phone' };
  return `<div class="stack-v">
    <label class="row"><input type="checkbox" id="mem-on" ${memOn() ? 'checked' : ''}> <span><b>Use memory</b> <span class="help">your assistants know what you've told them before, in every new chat</span></span></label>
    <label class="row"><input type="checkbox" id="mem-learn" ${memLearn() ? 'checked' : ''} ${memOn() ? '' : 'disabled'}> <span><b>Notice things on its own</b> <span class="help">like your job, tools and preferences, when you mention them. Off: only what you ask it to remember.</span></span></label>
    <div class="row"><input id="mem-new" placeholder="Add something to remember, e.g. I prefer metric units" class="grow"><button class="btn" id="mem-add">${icon('plus', 15)} Add</button></div>
    <div class="mem-list">${list.length ? list.map((m) => `<div class="mem-item" data-mem="${m.id}"><span class="grow mem-t" contenteditable="true" spellcheck="false">${esc(m.text)}</span><span class="small muted" title="${new Date(m.updated).toLocaleString()}">${esc(src[m.source] || 'Saved')} · ${ago(m.updated)}</span><button class="icon-btn sm" data-mem-del="${m.id}" title="Forget this" aria-label="Forget this">${icon('x', 15)}</button></div>`).join('')
      : '<div class="empty small">Nothing yet. Tell any assistant "remember that…", or just mention things about yourself.</div>'}</div>
    ${list.length ? `<div class="row"><span class="small muted grow">${list.length} memories · stored only on this PC · private chats don't use or add memories</span><button class="btn small danger" id="mem-clear">Forget everything</button></div>` : ''}
  </div>`;
}
function bindMemoryManager(root, repaint) {
  root.querySelector('#mem-on').onchange = (e) => { S.data.prefs.memory = e.target.checked; save(); repaint(); };
  root.querySelector('#mem-learn').onchange = (e) => { S.data.prefs.memoryLearn = e.target.checked; save(); };
  const add = () => { const v = root.querySelector('#mem-new').value.trim(); if (v) { addMemory(v, 'manual'); repaint(); } };
  root.querySelector('#mem-add').onclick = add;
  root.querySelector('#mem-new').onkeydown = (e) => { if (e.key === 'Enter') add(); };
  root.querySelectorAll('[data-mem-del]').forEach((b) => { b.onclick = () => { S.data.memory = memList().filter((m) => m.id !== b.dataset.memDel); save(); repaint(); }; });
  root.querySelectorAll('.mem-item .mem-t').forEach((el) => {
    el.addEventListener('keydown', (e) => { if (e.key === 'Enter') { e.preventDefault(); el.blur(); } });
    el.addEventListener('blur', () => {
      const m = memList().find((x) => x.id === el.closest('[data-mem]').dataset.mem);
      const v = el.textContent.trim();
      if (m && v && v !== m.text) { m.text = v.slice(0, 400); m.updated = now(); save(); }
    });
  });
  root.querySelector('#mem-clear')?.addEventListener('click', async () => {
    if (await confirmBox('Forget everything Quicksilver remembers about you? Your chats are kept.', { yes: 'Forget everything' })) { S.data.memory = []; save(); if (S.route.view === 'settings') render(); else openMemory(); }
  });
}
function openMemory() {
  const b = openModal(`<h2>${icon('brain', 22)} Memory</h2><p class="muted" style="margin-top:-4px">What your assistants know about you. Click a line to edit it.</p><div id="mem-box">${memoryManagerHTML()}</div><div class="modal-actions"><button class="btn primary" data-close>Done</button></div>`, { wide: true });
  const repaint = () => { b.querySelector('#mem-box').innerHTML = memoryManagerHTML(); bindMemoryManager(b, repaint); };
  bindMemoryManager(b, repaint);
}
