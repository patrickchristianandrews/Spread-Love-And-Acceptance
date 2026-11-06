// The document editor beside the chat: open any answer (or a blank page) as a document, edit it
// yourself, and ask the AI to rewrite all of it or just the part you've selected. The chat can
// see the document too, so you can ask questions about it while you work.
'use strict';

const DOC_ACTIONS = [
  ['polish', 'Polish', 'Improve the flow, clarity and word choice. Keep the length, meaning and tone about the same.'],
  ['shorter', 'Shorter', 'Make it about 40% shorter. Keep every important point.'],
  ['longer', 'Longer', 'Expand it with useful detail, examples and explanation, about 50% longer.'],
  ['simpler', 'Simpler', 'Rewrite in plain, simple language a 14-year-old could follow. Short sentences, no jargon.'],
  ['formal', 'More formal', 'Rewrite in a professional, formal tone suitable for work.'],
  ['friendly', 'Friendlier', 'Rewrite in a warm, friendly, conversational tone.'],
  ['fix', 'Fix spelling & grammar', 'Correct spelling, grammar and punctuation only. Change nothing else.'],
  ['bullets', 'As bullet points', 'Turn it into clear, well-organised bullet points.'],
];
let docBusy = null; // { chatId, requestId }

const docOpen = (chat) => Boolean(chat?.doc?.open);
const docWords = (t) => (String(t || '').match(/\S+/g) || []).length;

function openDoc(chat, text, title) {
  if (chat.doc?.text && text != null && chat.doc.text !== text) pushDocHistory(chat);
  chat.doc = { ...(chat.doc || {}), open: true, mode: 'edit', title: title || chat.doc?.title || 'Untitled document', text: text ?? chat.doc?.text ?? '' };
  factPanel = null;
  save();
  render();
  setTimeout(() => $('#dp-text')?.focus(), 30);
}
function pushDocHistory(chat) {
  chat.doc.history = [...(chat.doc.history || []), chat.doc.text].slice(-25);
  chat.doc.future = [];
}

function docPanelHTML(chat) {
  if (!docOpen(chat)) return '';
  const d = chat.doc;
  const busy = docBusy?.chatId === chat.id;
  return `<aside class="doc-panel" id="doc-panel" aria-label="Document">
    <div class="dp-head">
      ${icon('doc', 18)}<input class="dp-title" id="dp-title" value="${esc(d.title)}" aria-label="Document title" spellcheck="false">
      <div class="seg"><button class="${d.mode !== 'preview' ? 'on' : ''}" data-dp="edit">Edit</button><button class="${d.mode === 'preview' ? 'on' : ''}" data-dp="preview">Preview</button></div>
      <button class="icon-btn sm" data-dp="undo" title="Undo the last change" aria-label="Undo" ${d.history?.length && !busy ? '' : 'disabled'}>↶</button>
      <button class="icon-btn sm" data-dp="redo" title="Redo" aria-label="Redo" ${d.future?.length && !busy ? '' : 'disabled'}>↷</button>
      <button class="icon-btn sm" data-dp="save" title="Save as Word, PDF or Markdown" aria-label="Save as">${icon('download', 16)}</button>
      <button class="icon-btn sm" data-dp="close" title="Close the document (it's kept with this chat)" aria-label="Close">${icon('x', 16)}</button>
    </div>
    <div class="dp-tools">${DOC_ACTIONS.map(([k, l]) => `<button class="chip-d" data-dp-do="${k}" ${busy ? 'disabled' : ''}>${l}</button>`).join('')}</div>
    <div class="dp-body ${busy ? 'busy' : ''}">${d.mode === 'preview' ? `<div class="md dp-preview">${markdown(d.text || '*Nothing here yet.*')}</div>` : `<textarea id="dp-text" spellcheck="true" placeholder="Write here, or paste a draft. Select part of it to change just that part." ${busy ? 'readonly' : ''}>${esc(d.text)}</textarea>`}</div>
    <div class="dp-ask"><input id="dp-ask" placeholder="${busy ? 'Rewriting…' : 'Ask for a change, e.g. "add a short summary at the top"'}" ${busy ? 'disabled' : ''}><button class="btn small ${busy ? '' : 'primary'}" data-dp="${busy ? 'stop' : 'ask'}">${busy ? 'Stop' : 'Apply'}</button></div>
    <div class="dp-foot small muted"><span id="dp-count">${docWords(d.text).toLocaleString()} words</span><span class="grow"></span><span id="dp-sel-hint">${busy ? '<span class="status-line">Rewriting…</span>' : 'Select text to change only that part'}</span></div>
  </aside>`;
}

function bindDocPanel(chat) {
  const panel = $('#doc-panel');
  if (!panel) return;
  const ta = $('#dp-text');
  let typed = null;
  ta?.addEventListener('input', () => {
    if (!typed) { pushDocHistory(chat); typed = setTimeout(() => { typed = null; }, 1500); } // one undo step per burst of typing
    chat.doc.text = ta.value; save();
    $('#dp-count').textContent = `${docWords(ta.value).toLocaleString()} words`;
  });
  ta?.addEventListener('select', () => { const n = ta.selectionEnd - ta.selectionStart; $('#dp-sel-hint').textContent = n ? `Changes apply to the ${docWords(ta.value.slice(ta.selectionStart, ta.selectionEnd))} selected words` : 'Select text to change only that part'; });
  $('#dp-title').addEventListener('input', (e) => { chat.doc.title = e.target.value; save(); });
  panel.addEventListener('click', (e) => {
    const b = e.target.closest('[data-dp],[data-dp-do]');
    if (!b || b.disabled) return;
    if (b.dataset.dpDo) { const a = DOC_ACTIONS.find((x) => x[0] === b.dataset.dpDo); rewriteDoc(chat, a[2], a[1]); return; }
    const act = b.dataset.dp;
    if (act === 'close') { chat.doc.open = false; save(); render(); }
    else if (act === 'edit' || act === 'preview') { chat.doc.mode = act; save(); repaintDoc(chat); }
    else if (act === 'undo' && chat.doc.history?.length) { chat.doc.future = [...(chat.doc.future || []), chat.doc.text]; chat.doc.text = chat.doc.history.pop(); save(); repaintDoc(chat); }
    else if (act === 'redo' && chat.doc.future?.length) { chat.doc.history = [...(chat.doc.history || []), chat.doc.text]; chat.doc.text = chat.doc.future.pop(); save(); repaintDoc(chat); }
    else if (act === 'save') docSaveMenu(chat, b);
    else if (act === 'ask') { const v = $('#dp-ask').value.trim(); if (v) rewriteDoc(chat, v, v); }
    else if (act === 'stop' && docBusy) qs.abortChat(docBusy.requestId);
  });
  $('#dp-ask').addEventListener('keydown', (e) => { if (e.key === 'Enter') { const v = e.target.value.trim(); if (v) rewriteDoc(chat, v, v); } });
}

function repaintDoc(chat) {
  const old = $('#doc-panel');
  if (!old || S.route.id !== chat.id) return;
  const sel = $('#dp-text') ? [$('#dp-text').selectionStart, $('#dp-text').selectionEnd, $('#dp-text').scrollTop] : null;
  old.outerHTML = docPanelHTML(chat);
  bindDocPanel(chat);
  const ta = $('#dp-text');
  if (ta && sel) { ta.scrollTop = sel[2]; }
}

// Rewrites the selection (or the whole document), streaming the new text into place.
async function rewriteDoc(chat, instruction, label) {
  if (docBusy) return;
  const a = assistantById(chat.assistantId);
  const target = resolveTarget(chat, a);
  if (!target) { toast('Get a model first.'); return; }
  const ta = $('#dp-text');
  const text = chat.doc.text || '';
  let s = ta ? ta.selectionStart : 0;
  let e = ta ? ta.selectionEnd : 0;
  if (e - s < 2) { s = 0; e = text.length; }
  const part = text.slice(s, e);
  if (!part.trim()) { toast('Write or paste something first.'); return; }
  const whole = s === 0 && e === text.length;
  const before = text.slice(0, s);
  const after = text.slice(e);
  pushDocHistory(chat);
  const requestId = uid();
  docBusy = { chatId: chat.id, requestId };
  chat.doc.mode = 'edit';
  repaintDoc(chat);
  const system = `You are a careful editor. Rewrite the text as instructed. Keep the facts and the meaning, and keep Markdown formatting (headings, lists, tables) unless the instruction says otherwise. Reply with ONLY the rewritten text: no preamble, no explanation, no quotes around it.${whole ? '' : ' You are rewriting one part of a longer document; it must still fit with the text around it.'}`;
  const user = `Instruction: ${instruction}\n\n${whole ? '' : `The text just before this part ends: "…${before.slice(-300)}"\nThe text just after it starts: "${after.slice(0, 300)}…"\n\n`}Text to rewrite:\n<<<\n${part}\n>>>`;
  const show = (out) => {
    const clean = out.replace(/<think>[\s\S]*?(<\/think>|$)/g, '').replace(/^\s*(here(?:'s| is) [^\n]*:\s*\n)/i, '').replace(/^<<<\n?|\n?>>>\s*$/g, '').replace(/^```(?:markdown|md)?\n([\s\S]*?)\n```\s*$/, '$1');
    return before + (whole ? clean.trim() : clean.replace(/^\n+|\n+$/g, '')) + after;
  };
  try {
    const out = await askAI(target, system, user, { temperature: 0.4, maxTokens: Math.min(8192, Math.max(400, Math.round(part.length / 2.2))), level: 'quick', contextSize: Math.min(32768, Math.max(4096, Math.round((part.length + 1200) / 1.6))), requestId,
      onText: (sofar) => { const t = $('#dp-text'); if (t && S.route.id === chat.id) { t.value = show(sofar); } } });
    chat.doc.text = show(out);
    toast(`Done: ${label.length > 40 ? 'your change' : label.toLowerCase()}. Undo (↶) brings back the previous version.`);
  } catch (err) {
    chat.doc.text = text;
    if (!/abort/i.test(err.message)) toast(err.message, 6000);
  } finally {
    docBusy = null; save();
    if (S.route.view === 'chat' && S.route.id === chat.id) { repaintDoc(chat); if ($('#dp-ask')) $('#dp-ask').value = ''; }
  }
}

function docSaveMenu(chat, anchor) {
  closeMenus();
  const r = anchor.getBoundingClientRect();
  const menu = document.createElement('div');
  menu.className = 'menu';
  menu.style.top = `${r.bottom + 4}px`;
  menu.style.left = `${Math.max(8, r.right - 200)}px`;
  menu.innerHTML = '<button data-f="docx">📄 Word document</button><button data-f="pdf">📕 PDF</button><button data-f="md">⬇ Markdown</button><button data-f="copy">📋 Copy all</button>';
  document.body.appendChild(menu);
  menu.addEventListener('click', async (e) => {
    const f = e.target.closest('[data-f]')?.dataset.f;
    closeMenus();
    if (!f) return;
    if (f === 'copy') { navigator.clipboard?.writeText(chat.doc.text); toast('Copied.'); return; }
    if (await call('export:file', f, { markdown: chat.doc.text, html: markdown(chat.doc.text), title: chat.doc.title || 'Document' })) toast('Saved. Opening the folder…');
  });
}

// While the document is open, the chat can see it.
function docPrompt(chat) {
  if (!docOpen(chat) || !chat.doc.text?.trim()) return '';
  return `The user has this document open in an editor beside the chat. When they refer to "the document", "this", "it" or "my draft", they mean this. You can't edit it directly: when they ask for changes, write the changed parts out in full so they can paste them in.\n<document title="${chat.doc.title || 'Untitled'}">\n${chat.doc.text.slice(0, 24000)}\n</document>`;
}
