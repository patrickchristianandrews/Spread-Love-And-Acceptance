// Share an answer or a whole chat: copy it, email it, or save it as a PDF, Word or Markdown file to
// send. Nothing is uploaded anywhere: only what you choose leaves this PC, the way you choose.
'use strict';

// A chat as Markdown, with who said what.
function chatMarkdown(chat) {
  const a = assistantById(chat.assistantId);
  const you = S.data.prefs.userName || 'You';
  const body = chat.messages.map((x) => {
    const text = x.role === 'assistant' ? x.alts?.[x.altIndex]?.text || '' : x.text || '';
    return text.trim() ? `**${x.role === 'user' ? you : a.name}:**\n\n${text.trim()}` : '';
  }).filter(Boolean).join('\n\n---\n\n');
  return `# ${chat.title}\n\n${body}\n`;
}
// Markdown to readable plain text (for email and "copy as text").
const plainText = (md) => String(md || '')
  .replace(/```[a-z]*\n([\s\S]*?)```/gi, '$1')
  .replace(/^#{1,6}\s+/gm, '').replace(/\*\*([^*]+)\*\*/g, '$1').replace(/\*([^*\n]+)\*/g, '$1').replace(/`([^`]+)`/g, '$1')
  .replace(/\[([^\]]+)\]\((https?:[^)]+)\)/g, '$1 ($2)').replace(/^\s*---\s*$/gm, '').replace(/\n{3,}/g, '\n\n').trim();

function shareModal({ title, markdown, what }) {
  const b = openModal(`<h2>Share ${esc(what)}</h2>
    <p class="small muted" style="margin-top:0">“${esc(title)}”. Nothing is uploaded: you choose where it goes.</p>
    <div class="share-grid">
      <button class="share-opt" data-sh="text"><span>📋</span><b>Copy</b><span class="small muted">as plain text, ready to paste anywhere</span></button>
      <button class="share-opt" data-sh="md"><span>📝</span><b>Copy with formatting</b><span class="small muted">Markdown, for docs, notes or GitHub</span></button>
      <button class="share-opt" data-sh="email"><span>✉️</span><b>Email</b><span class="small muted">opens your email app with it filled in</span></button>
      <button class="share-opt" data-sh="pdf"><span>📕</span><b>PDF</b><span class="small muted">save a file to send or print</span></button>
      <button class="share-opt" data-sh="docx"><span>📄</span><b>Word document</b><span class="small muted">save a file anyone can edit</span></button>
      <button class="share-opt" data-sh="mdfile"><span>⬇</span><b>Markdown file</b><span class="small muted">save as plain text with formatting</span></button>
    </div>
    <div class="modal-actions"><button class="btn" data-close>Close</button></div>`);
  b.querySelectorAll('[data-sh]').forEach((btn) => btn.addEventListener('click', async () => {
    const kind = btn.dataset.sh;
    if (kind === 'text') { navigator.clipboard?.writeText(plainText(markdown)); toast('Copied. Paste it anywhere.'); closeModal(); return; }
    if (kind === 'md') { navigator.clipboard?.writeText(markdown); toast('Copied with formatting (Markdown).'); closeModal(); return; }
    if (kind === 'email') {
      let body = plainText(markdown);
      const long = body.length > 1800;
      if (long) body = `${body.slice(0, 1800)}…\n\n(Shortened to fit an email link. Save it as a PDF to send the whole thing.)`;
      await call('share:email', { subject: title, body }).catch(() => toast('No email app is set up on this PC. Copy it instead.'));
      closeModal(); return;
    }
    const fmt = { pdf: 'pdf', docx: 'docx', mdfile: 'md' }[kind];
    const div = document.createElement('div');
    div.innerHTML = markdown ? markdownHTML(markdown) : '';
    if (await call('export:file', fmt, { markdown, html: div.innerHTML, title })) { toast('Saved. Opening the folder so you can send it…'); closeModal(); }
  }));
}
// Uses the app's own Markdown renderer.
const markdownHTML = (md) => (typeof markdown === 'function' ? markdown(md) : esc(md));

function shareAnswer(chat, m) {
  const text = msgText(m);
  if (!text) { toast('Nothing to share yet.'); return; }
  shareModal({ title: answerTitle(chat, m), markdown: text, what: 'this answer' });
}
function shareChat(chat) {
  if (!chat?.messages?.length) { toast('This chat is empty.'); return; }
  shareModal({ title: chat.title, markdown: chatMarkdown(chat), what: 'this chat' });
}

// ---------- send to your cloud storage ----------
// Answers (as Word, PDF, PowerPoint or Markdown) and anything made in Create (pictures, videos,
// music) can go straight to Google Drive, OneDrive or Dropbox, into a "Quicksilver" folder.
async function cloudSendModal(what) {
  let targets = [];
  try { targets = await qs.call('cloud:targets'); } catch {}
  if (!targets.length) {
    const b = openModal(`<h2>☁️ Send to your cloud</h2>
      <p>Connect Google Drive, OneDrive or Dropbox first, then anything Quicksilver makes can go straight there, into a "Quicksilver" folder.</p>
      <div class="modal-actions"><button class="btn" data-close>Not now</button><button class="btn primary" id="cloud-connect">Open Connectors</button></div>`);
    b.querySelector('#cloud-connect').addEventListener('click', () => { closeModal(); go({ view: 'integrations' }); });
    return;
  }
  const fmts = what.answer ? [['docx', '📄 Word'], ['pdf', '📕 PDF'], ['pptx', '🖥️ PowerPoint'], ['md', '⬇ Markdown']] : [];
  const b = openModal(`<h2>☁️ Send to your cloud</h2>
    ${fmts.length ? `<div class="label">As</div><div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:12px">${fmts.map(([k, l], i) => `<label class="pill"><input type="radio" name="cl-f" value="${k}" ${i ? '' : 'checked'}> ${l}</label>`).join('')}</div>` : ''}
    <div class="label">To</div><div class="stack-v" style="gap:6px">${targets.map((t, i) => `<label class="row"><input type="radio" name="cl-d" value="${t.id}" ${i ? '' : 'checked'}> ${t.icon} <b>${esc(t.name)}</b> <span class="small muted">› Quicksilver folder</span></label>`).join('')}</div>
    <div id="cl-result" class="small" style="margin-top:10px"></div>
    <div class="modal-actions"><button class="btn" data-close>Close</button><button class="btn primary" id="cl-send">Send</button></div>`);
  const btn = b.querySelector('#cl-send');
  btn.addEventListener('click', async () => {
    const dest = b.querySelector('[name="cl-d"]:checked')?.value;
    btn.disabled = true; btn.textContent = 'Sending…';
    try {
      const r = what.answer
        ? await qs.call('cloud:sendAnswer', dest, b.querySelector('[name="cl-f"]:checked')?.value || 'docx', what.answer)
        : await qs.call('cloud:sendMedia', dest, what.mediaId);
      b.querySelector('#cl-result').innerHTML = `✓ Saved to ${esc(r.where)} as <b>${esc(r.name)}</b>. ${r.link ? `<a href="#" id="cl-open">Open it</a>` : ''}`;
      b.querySelector('#cl-open')?.addEventListener('click', (e) => { e.preventDefault(); qs.call('shell:open', r.link); });
      btn.textContent = 'Send again'; btn.disabled = false;
    } catch (err) { btn.disabled = false; btn.textContent = 'Try again'; b.querySelector('#cl-result').textContent = `Couldn't send it: ${err.message}`; }
  });
}
