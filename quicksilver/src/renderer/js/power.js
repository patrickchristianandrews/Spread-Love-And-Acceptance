// Power tools for people who use AI a lot:
//  - Try another model on any answer (all versions kept side by side with ‹ ›)
//  - Branch a conversation from any message
//  - Per-chat settings: extra instructions, creativity, answer length
//  - Answer stats (first words, total time, tokens) and a context meter, with "continue in a
//    fresh chat" when a conversation gets long
//  - Improve my prompt (✨ in the message box)
//  - Command palette (Ctrl+Shift+P): go anywhere, switch model, toggle anything
//  - Import chats from ChatGPT and Claude
//  - Live preview for HTML and SVG code
'use strict';

// ---------- try another model ----------
function tryOtherMenu(chat, m, anchor) {
  closeMenus();
  const a = assistantById(chat.assistantId);
  const used = new Set(m.alts.map((x) => x.target));
  const r = anchor.getBoundingClientRect();
  const menu = document.createElement('div');
  menu.className = 'menu menu-tall';
  const list = S.targets.filter((t) => !t.target.startsWith('kb:'));
  menu.innerHTML = `<div class="menu-h">Answer again with…</div>${list.map((t) => `<button data-t="${esc(t.target)}">${t.target.startsWith('stack:') ? '🧩' : t.target.startsWith('api:') ? '☁️' : '💻'} ${esc(t.label)}${used.has(t.target) ? ' <span class="small muted">(answered)</span>' : ''}${t.target === resolveTarget(chat, a) ? ' <span class="small muted">(this chat)</span>' : ''}</button>`).join('')}`;
  document.body.appendChild(menu);
  const h = menu.offsetHeight;
  menu.style.top = `${Math.max(8, r.top - h - 6 > 8 ? r.top - h - 6 : r.bottom + 4)}px`;
  menu.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - menu.offsetWidth - 8))}px`;
  menu.addEventListener('click', (e) => { const t = e.target.closest('[data-t]')?.dataset.t; closeMenus(); if (t) generate(chat, m, t); });
}

// ---------- branch ----------
function branchChat(chat, msgId) {
  const i = chat.messages.findIndex((m) => m.id === msgId);
  if (i < 0) return;
  const copy = JSON.parse(JSON.stringify(chat.messages.slice(0, i + 1))).map((m) => ({ ...m, id: uid() }));
  const b = { ...JSON.parse(JSON.stringify(chat)), id: uid(), title: `↳ ${chat.title}`.slice(0, 70), created: now(), updated: now(), messages: copy, pinned: false, renamed: chat.renamed, doc: undefined, branchOf: chat.id };
  S.data.chats.push(b);
  save();
  go({ view: 'chat', id: b.id });
  toast('Branched: this is a copy up to that message. The original chat is unchanged.');
}

// ---------- per-chat settings ----------
function chatSettings(chat) {
  const a = assistantById(chat.assistantId);
  const p = S.data.prefs;
  const temp = chat.temperature ?? a.temperature ?? p.temperature;
  const max = chat.maxTokens ?? a.maxTokens ?? p.maxTokens;
  const b = openModal(`<h2>Settings for this chat</h2>
    <div class="stack-v">
      <div class="field"><label for="cs-sys">Extra instructions</label><span class="help">Added to ${esc(a.name)}'s own instructions, for this chat only. For example: "Answer in Spanish", "You are reviewing my novel's chapter 3", "Be blunt".</span><textarea id="cs-sys" rows="4">${esc(chat.system || '')}</textarea></div>
      <div class="field"><label for="cs-temp">Creativity: <span id="cs-temp-v">${Number(temp).toFixed(2)}</span></label><span class="help">Low: focused and consistent (facts, code). High: varied and surprising (ideas, stories).</span><input id="cs-temp" type="range" min="0" max="1.5" step="0.05" value="${temp}"></div>
      <div class="field"><label for="cs-max">Longest answer</label><select id="cs-max">${[[512, 'Short (about 400 words)'], [1024, 'Medium (about 750 words)'], [2048, 'Long (about 1,500 words)'], [4096, 'Very long (about 3,000 words)'], [8192, 'Book chapter (about 6,000 words)'], [16384, 'As long as it takes (about 12,000 words)']].map(([v, l]) => `<option value="${v}" ${Number(max) === v ? 'selected' : ''}>${l}</option>`).join('')}</select></div>
    </div>
    <div class="modal-actions"><button class="btn" id="cs-reset" style="margin-right:auto">Use the assistant's settings</button><button class="btn" data-close>Cancel</button><button class="btn primary" id="cs-ok">Save</button></div>`);
  b.querySelector('#cs-temp').oninput = (e) => { b.querySelector('#cs-temp-v').textContent = Number(e.target.value).toFixed(2); };
  b.querySelector('#cs-ok').onclick = () => {
    chat.system = b.querySelector('#cs-sys').value.trim() || undefined;
    const t = Number(b.querySelector('#cs-temp').value);
    chat.temperature = Math.abs(t - (a.temperature ?? p.temperature)) < 0.001 ? undefined : t;
    const mx = Number(b.querySelector('#cs-max').value);
    chat.maxTokens = mx === Number(a.maxTokens ?? p.maxTokens) ? undefined : mx;
    save(); closeModal(); render(); toast('Saved for this chat.');
  };
  b.querySelector('#cs-reset').onclick = () => { delete chat.system; delete chat.temperature; delete chat.maxTokens; save(); closeModal(); render(); toast('This chat follows the assistant\'s settings again.'); };
}
const chatHasSettings = (chat) => Boolean(chat.system || chat.temperature != null || chat.maxTokens != null);

// ---------- stats and the context meter ----------
function statsTitle(alt) {
  const s = alt.stats || {};
  const parts = [];
  if (alt.ttft != null) parts.push(`first words after ${(alt.ttft / 1000).toFixed(1)} s`);
  if (s.tokens) parts.push(`${s.tokens.toLocaleString()} tokens`);
  if (alt.ms) parts.push(`${fmtSec(alt.ms / 1000)} in all`);
  if (s.tps) parts.push(`${s.tps.toFixed(1)} tokens/s`);
  return parts.join(' · ');
}
// Rough token count of what the model reads for the next answer (about 3.2 characters a token).
function chatTokens(chat) {
  let chars = 1800; // instructions, style, memory
  for (const m of chat.messages) {
    chars += msgText(m).length;
    for (const x of m.attachments || []) chars += x.type === 'doc' ? (x.text || '').length : x.type === 'image' ? 3000 : x.type === 'video' ? 3000 * (x.frames?.length || 1) : 0;
  }
  return Math.round(chars / 3.2);
}
function contextMeterHTML(chat, a) {
  if (!chat.messages.length) return '';
  const ctx = Number(a.contextSize || S.data.prefs.contextSize) || 16384;
  const used = chatTokens(chat);
  const pct = Math.min(100, Math.round((used / ctx) * 100));
  const k = (n) => (n >= 1000 ? `${(n / 1000).toFixed(n >= 10000 ? 0 : 1)}K` : String(n));
  const lvl = pct >= 85 ? 'hot' : pct >= 60 ? 'warm' : '';
  return `<span class="ctx-meter ${lvl}" title="How much of the model's working memory this chat fills: about ${k(used)} of ${k(ctx)} tokens.${pct >= 85 ? ' Past the limit, the oldest messages are left out.' : ''}"><i style="width:${Math.max(3, pct)}%"></i></span><span class="ctx-num">${k(used)} / ${k(ctx)}</span>${pct >= 85 ? ' · <a href="#" data-fresh>Continue in a fresh chat</a>' : ''}`;
}

// Long chat: a summary carries the important parts into a new chat.
async function freshFromSummary(chat) {
  const a = assistantById(chat.assistantId);
  const target = resolveTarget(chat, a);
  if (!target) return;
  toast('Summarising this chat…', 30000);
  try {
    const transcript = chat.messages.map((m) => `${m.role === 'user' ? 'User' : 'Assistant'}: ${msgText(m).slice(0, 4000)}`).join('\n\n').slice(-60000);
    const sum = await askAI(target, 'Summarise this conversation so it can continue in a new chat. Keep every decision, fact, number, name, open question and the user\'s preferences; drop small talk. Use short headed sections and bullet points. Reply with the summary only.', transcript, { temperature: 0.2, maxTokens: 1200, level: 'quick', contextSize: 32768 });
    const fresh = { ...JSON.parse(JSON.stringify(chat)), id: uid(), title: `${chat.title} (continued)`.slice(0, 70), created: now(), updated: now(), messages: [], pinned: false, doc: undefined, branchOf: chat.id,
      system: `${chat.system ? `${chat.system}\n\n` : ''}This chat continues an earlier one. Summary of it so far:\n${sum}` };
    S.data.chats.push(fresh);
    save();
    go({ view: 'chat', id: fresh.id });
    toast('Carried on in a fresh chat. The summary of the earlier one is in this chat\'s settings (⋯ → Chat settings).', 7000);
  } catch (err) { toast(err.message, 6000); }
}
document.addEventListener('click', (e) => {
  if (e.target.closest('[data-fresh]')) { e.preventDefault(); const c = chatById(S.route.id); if (c) freshFromSummary(c); }
});

// ---------- improve my prompt ----------
async function improvePromptBox(chat) {
  const input = $('#input');
  const text = input?.value.trim();
  if (!text) { toast('Write your message first, then ✨ makes it clearer and more complete.'); return; }
  const helper = promptHelper();
  if (!helper) return;
  const btn = $('#improve-btn');
  btn?.classList.add('busy');
  try {
    const out = await askAI(helper, 'Rewrite the user\'s message to an AI assistant so it gets a much better answer: make the goal clear, add the useful context and constraints it implies, say what format the answer should take, and keep the user\'s voice, language and every detail. Keep it concise; don\'t answer it. Reply with the rewritten message only.', text, { temperature: 0.4, maxTokens: 500, level: 'quick' });
    const clean = out.replace(/^["“]|["”]$/g, '').trim();
    if (clean && $('#input')) {
      input.focus();
      input.select();
      if (!document.execCommand('insertText', false, clean)) input.value = clean; // keeps Ctrl+Z working
      input.dispatchEvent(new Event('input'));
      toast('Improved. Ctrl+Z puts your original back.');
    }
  } catch (err) { toast(err.message); } finally { btn?.classList.remove('busy'); }
}

// ---------- HTML / SVG previews ----------
document.addEventListener('click', (e) => {
  const b = e.target.closest('pre .preview');
  if (!b) return;
  const code = b.closest('pre').querySelector('code').textContent;
  const lang = b.dataset.lang;
  const html = lang === 'svg' ? `<!doctype html><meta charset="utf-8"><body style="margin:0;display:grid;place-items:center;min-height:100vh;background:#fff">${code}</body>` : /<html|<!doctype/i.test(code) ? code : `<!doctype html><meta charset="utf-8"><body>${code}</body>`;
  qs.call('app:preview', html, 'Preview').catch((err) => toast(err.message));
});

// ---------- import from ChatGPT and Claude ----------
function importHTML() {
  return `<div class="field"><label>Bring your chats from ChatGPT or Claude</label>
    <div class="card"><p class="small" style="margin:0 0 8px">Export your data (ChatGPT: Settings → Data controls → Export data. Claude: Settings → Privacy → Export data). You'll get an email with a .zip; choose it here. Your chats are copied into Quicksilver, grouped in a project, and you can carry on any of them with your own models.</p>
    <label class="btn small">${icon('download', 15)} Choose the export (.zip or conversations.json)<input type="file" id="imp-file" accept=".zip,.json" hidden></label> <span class="small muted" id="imp-status"></span></div></div>`;
}
function bindImport() {
  $('#imp-file')?.addEventListener('change', async (e) => {
    const f = e.target.files[0];
    e.target.value = '';
    if (!f) return;
    const st = $('#imp-status');
    st.textContent = 'Reading…';
    try {
      const convs = await qs.call('import:chats', f.name, new Uint8Array(await f.arrayBuffer()));
      const n = importChats(convs);
      st.textContent = '';
      toast(n.added ? `Imported ${n.added} chat${n.added === 1 ? '' : 's'} from ${n.from}${n.skipped ? ` (${n.skipped} were already here)` : ''}. They're in the project "${n.project}".` : `All ${n.skipped} chats were already imported.`, 8000);
      if (n.projectId && n.added) go({ view: 'project', id: n.projectId });
    } catch (err) { st.textContent = ''; toast(err.message, 8000); }
  });
}
function importChats(convs) {
  const from = convs[0]?.source === 'claude' ? 'Claude' : 'ChatGPT';
  const name = `Imported from ${from}`;
  let p = projList().find((x) => x.importedFrom === convs[0]?.source);
  if (!p) { p = { id: uid(), name, emoji: from === 'Claude' ? '🟠' : '🟢', instructions: '', files: [], created: now(), updated: now(), importedFrom: convs[0]?.source }; projList().push(p); }
  const have = new Set(S.data.chats.map((c) => c.importId).filter(Boolean));
  let added = 0; let skipped = 0;
  for (const c of convs) {
    const key = `${c.source}:${c.id || c.title + c.created}`;
    if (have.has(key)) { skipped++; continue; }
    const t = c.updated || c.created || now();
    S.data.chats.push({
      id: uid(), importId: key, projectId: p.id, assistantId: 'as-general', title: c.title.slice(0, 80), created: c.created || t, updated: t, target: '', library: null, web: null, renamed: true,
      messages: c.messages.map((m) => (m.role === 'user' ? { id: uid(), role: 'user', text: m.text, attachments: [] } : { id: uid(), role: 'assistant', alts: [{ text: m.text, imported: from }], altIndex: 0 })),
    });
    added++;
  }
  p.updated = now();
  save();
  renderChatList();
  return { added, skipped, from, project: p.name, projectId: p.id };
}

// ---------- command palette ----------
function paletteItems() {
  const chat = S.route.view === 'chat' ? chatById(S.route.id) : null;
  const a = chat && assistantById(chat.assistantId);
  const items = [
    ['New chat', 'Ctrl N', () => newChat()],
    ...[['home', 'Home'], ['projects', 'Projects'], ['assistants', 'Assistants'], ['skills', 'Skills'], ['library', 'Knowledge'], ['stacks', 'Infuse & stacks'], ['studio', 'Studio'], ['integrations', 'Integrations'], ['models', 'Models'], ['arena', 'Arena (blind test)'], ['pc', 'Your PC'], ['settings', 'Settings']].map(([v, l]) => [`Go to ${l}`, '', () => go({ view: v })]),
    ...[['memory', 'Memory'], ['voice', 'Voice'], ['phone', 'Phone'], ['web', 'Web search'], ['api', 'API server'], ['engines', 'Engines']].map(([t, l]) => [`Settings: ${l}`, '', () => { setTab = t; go({ view: 'settings' }); }]),
    ['Switch light / dark', '', () => $('#theme-btn').click()],
    [S.config?.offline ? 'Go online' : 'Go offline', '', toggleNet],
    ['Import chats from ChatGPT or Claude', '', () => { setTab = 'general'; go({ view: 'settings' }); setTimeout(() => $('#imp-file')?.click(), 200); }],
  ];
  if (chat) {
    items.push(
      ['This chat: settings (instructions, creativity, length)', '', () => chatSettings(chat)],
      ['This chat: open the document editor', '', () => openDoc(chat, chat.doc?.text ?? '', chat.doc?.title || chat.title)],
      [`This chat: ${chat.private ? 'use memory again' : 'make private (no memory)'}`, '', () => { chat.private = !chat.private; save(); render(); }],
      ['This chat: move to a project', '', () => moveToProject(chat)],
      ['This chat: continue in a fresh chat (with a summary)', '', () => freshFromSummary(chat)],
      [`Turn web search ${(chat.web ?? a.web) ? 'off' : 'on'}`, '', () => { chat.web = !(chat.web ?? a.web); save(); render(); }],
      [`Turn fact checking ${factOn(chat, a) ? 'off' : 'on'}`, '', () => { chat.factCheck = !factOn(chat, a); save(); render(); }],
      ['Voice typing', 'Ctrl Space', () => toggleVoice(chat)],
      ...S.targets.filter((t) => !t.target.startsWith('kb:')).map((t) => [`Use model: ${t.label}`, '', () => { chat.target = t.target; save(); render(); }]),
      ...Object.entries(EFFORTS).map(([k, l]) => [`Effort: ${l.replace(/^\S+\s/, '')}`, '', () => { chat.effort = k; save(); render(); }]),
    );
  }
  for (const x of S.data.assistants) items.push([`New chat with ${x.emoji} ${x.name}`, '', () => newChat(x.id)]);
  for (const p of projList()) items.push([`Project: ${p.emoji || '📁'} ${p.name}`, '', () => go({ view: 'project', id: p.id })]);
  for (const c of [...S.data.chats].sort((x, y) => y.updated - x.updated).slice(0, 150)) items.push([`Chat: ${c.title}`, ago(c.updated), () => go({ view: 'chat', id: c.id })]);
  for (const s of allSkills().slice(0, 400)) items.push([`Skill: ${s.emoji || '⚡'} ${s.name}`, '', () => { const c = chatById(S.route.id) || null; if (!c || S.route.view !== 'chat') newChat(); const cc = chatById(S.route.id); cc.pendingSkill = s.id; save(); render(); }]);
  return items;
}
function fuzzy(q, s) {
  if (!q) return 1;
  const t = s.toLowerCase();
  const words = q.toLowerCase().split(/\s+/).filter(Boolean);
  let score = 0;
  for (const w of words) { const i = t.indexOf(w); if (i < 0) return 0; score += i === 0 || t[i - 1] === ' ' ? 3 : 1; }
  return score + (t.startsWith(words[0]) ? 2 : 0);
}
function openPalette() {
  const items = paletteItems();
  const b = openModal(`<div class="pal"><input id="pal-q" placeholder="Type a command, a chat, a model or a skill…" autocomplete="off" spellcheck="false"><div class="pal-list" id="pal-list"></div><div class="pal-foot small muted">↑↓ to choose · Enter to run · Esc to close</div></div>`);
  b.classList.add('pal-modal');
  const q = b.querySelector('#pal-q');
  const list = b.querySelector('#pal-list');
  let shown = []; let hot = 0;
  const paint = () => {
    shown = items.map((it) => [fuzzy(q.value, it[0]), it]).filter((x) => x[0] > 0).sort((x, y) => y[0] - x[0]).slice(0, 60).map((x) => x[1]);
    hot = Math.min(hot, Math.max(0, shown.length - 1));
    list.innerHTML = shown.map((it, i) => `<button class="pal-item ${i === hot ? 'hot' : ''}" data-i="${i}"><span class="grow">${esc(it[0])}</span>${it[1] ? `<span class="small muted">${esc(it[1])}</span>` : ''}</button>`).join('') || '<div class="small muted" style="padding:14px">Nothing matches.</div>';
    list.querySelector('.hot')?.scrollIntoView({ block: 'nearest' });
  };
  const run = (i) => { const it = shown[i]; if (!it) return; closeModal(); setTimeout(() => it[2](), 10); };
  q.addEventListener('input', () => { hot = 0; paint(); });
  q.addEventListener('keydown', (e) => {
    if (e.key === 'ArrowDown' || e.key === 'ArrowUp') { e.preventDefault(); hot = (hot + (e.key === 'ArrowDown' ? 1 : -1) + shown.length) % Math.max(1, shown.length); paint(); }
    if (e.key === 'Enter') { e.preventDefault(); run(hot); }
  });
  list.addEventListener('click', (e) => { const x = e.target.closest('[data-i]'); if (x) run(Number(x.dataset.i)); });
  paint();
  q.focus();
}
document.addEventListener('keydown', (e) => {
  if ((e.ctrlKey || e.metaKey) && ((e.shiftKey && e.key.toLowerCase() === 'p') || e.key.toLowerCase() === 'p' || e.key === '/')) {
    if (!$('#modal').hidden && !$('.pal-modal')) return;
    e.preventDefault();
    if ($('.pal-modal')) closeModal(); else openPalette();
  }
});

// ---------- math ----------
// $$…$$, \[…\], \(…\) and $…$ (when it clearly is maths, not prices) become typeset formulas.
const MATH_RE = /(`[^`\n]+`)|\$\$([\s\S]+?)\$\$|\\\[([\s\S]+?)\\\]|\\\(([\s\S]+?)\\\)|(^|[^\\$\w])\$([^\s$](?:[^$\n]*?[^\s$])?)\$(?![\w$])/g;
function pullMath(text, store) {
  return text.replace(MATH_RE, (m, code, d1, d2, i1, pre, i2) => {
    if (code) return code;
    const keep = (tex, display) => { store.push({ tex, display }); return `\u0002${store.length - 1}\u0003`; };
    if (d1 || d2) return `\n\n${keep(d1 || d2, true)}\n\n`;
    if (i1) return keep(i1, false);
    if (i2 && (/[\\^_{}=]/.test(i2) || /^[a-zA-Z]$/.test(i2))) return pre + keep(i2, false);
    return m;
  });
}
function putMath(html, store) {
  if (!store.length) return html;
  const tex = (n, display) => {
    const m = store[n];
    if (!m) return '';
    if (typeof katex === 'undefined') return `<code>${esc(m.tex)}</code>`;
    try { return katex.renderToString(m.tex.trim(), { displayMode: display, throwOnError: false, output: 'htmlAndMathml', strict: 'ignore' }); } catch { return `<code>${esc(m.tex)}</code>`; }
  };
  return html.replace(/<p>\s*\u0002(\d+)\u0003\s*<\/p>/g, (_, n) => `<div class="math-block">${tex(Number(n), true)}</div>`).replace(/\u0002(\d+)\u0003/g, (_, n) => tex(Number(n), store[Number(n)]?.display));
}
