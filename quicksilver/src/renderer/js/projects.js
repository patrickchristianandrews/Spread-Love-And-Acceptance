// Projects: a folder for related chats, with its own instructions and reference files that every
// chat in it can use. Long files are searched: each answer gets the parts that matter most.
'use strict';

const projList = () => (S.data.projects ||= []);
const projectById = (id) => projList().find((p) => p.id === id);
const projChats = (p) => S.data.chats.filter((c) => c.projectId === p.id).sort((a, b) => b.updated - a.updated);
const PROJECT_EMOJI = ['📁', '🚀', '📚', '🏠', '💼', '🎨', '🧪', '✍️', '🎵', '💰', '🩺', '🎓', '🛠️', '🌱', '🎮', '⚖️'];

views.projects = {
  html() {
    const list = [...projList()].sort((a, b) => (b.updated || 0) - (a.updated || 0));
    return `<div class="page"><div class="page-head"><h1>Projects</h1><button class="btn primary" id="pj-new">${icon('plus', 16)} New project</button></div>
      <p class="lede">Keep related chats together. A project's instructions and files go into every chat in it, so you don't have to explain the background again.</p>
      <div class="cards" style="margin-top:14px">
        ${list.map((p) => { const n = projChats(p).length; return `<button class="card proj-card" data-pj="${p.id}" style="text-align:left">
          <div class="row"><span class="emoji-badge">${esc(p.emoji || '📁')}</span><h3 class="grow">${esc(p.name)}</h3></div>
          <p class="small muted proj-desc">${esc(p.instructions ? p.instructions.slice(0, 140) : 'No instructions yet')}</p>
          <div class="small muted">${n} chat${n === 1 ? '' : 's'} · ${(p.files || []).length} file${(p.files || []).length === 1 ? '' : 's'}${p.updated ? ` · ${ago(p.updated)}` : ''}</div></button>`; }).join('')}
        <button class="card proj-card proj-add" id="pj-new2" style="text-align:left"><div class="row"><span class="emoji-badge">＋</span><h3>New project</h3></div><p class="small muted proj-desc">A thesis, a client, a trip, a codebase, a book…</p></button>
      </div></div>`;
  },
  bind() {
    $('#pj-new').onclick = $('#pj-new2').onclick = () => editProject();
    $$('[data-pj]').forEach((b) => b.addEventListener('click', () => go({ view: 'project', id: b.dataset.pj })));
  },
};

views.project = {
  html() {
    const p = projectById(S.route.id);
    if (!p) { setTimeout(() => go({ view: 'projects' }), 0); return '<div class="page"></div>'; }
    const chats = projChats(p);
    const files = p.files || [];
    const chars = files.reduce((n, f) => n + (f.text || '').length, 0);
    return `<div class="page proj-page">
      <div class="page-head"><button class="icon-btn" data-goto="projects" title="All projects" aria-label="All projects">${icon('left')}</button><span class="emoji-badge" style="width:44px;height:44px;font-size:1.5rem">${esc(p.emoji || '📁')}</span><h1>${esc(p.name)}</h1>
        <button class="btn" id="pj-edit">${icon('edit', 15)} Edit</button><button class="btn primary" id="pj-chat">${icon('plus', 16)} New chat</button></div>
      <div class="proj-grid">
        <section>
          <div class="proj-start"><textarea id="pj-q" rows="2" placeholder="Start a chat in ${esc(p.name)}…"></textarea><button class="send-btn" id="pj-send" aria-label="Start chat">${icon('send', 20)}</button></div>
          <h3 class="proj-h">Chats</h3>
          ${chats.length ? `<div class="proj-chats">${chats.map((c) => `<button class="proj-chat" data-chat-open="${c.id}"><span class="ce">${esc(assistantById(c.assistantId).emoji)}</span><span class="grow t">${esc(c.title)}</span><span class="small muted">${ago(c.updated)}</span></button>`).join('')}</div>`
            : '<div class="empty small" style="padding:18px 0">No chats yet. Ask something above, or move an existing chat here from its ⋯ menu.</div>'}
        </section>
        <aside class="stack-v">
          <div class="card"><div class="row"><h3 class="grow">Instructions</h3><button class="btn small" id="pj-edit2">Edit</button></div>
            <p class="small ${p.instructions ? '' : 'muted'}" style="white-space:pre-wrap;margin:8px 0 0">${esc(p.instructions || 'Tell the AI what this project is about, who it\'s for and how you want answers. Every chat here follows it.')}</p></div>
          <div class="card" id="pj-drop"><div class="row"><h3 class="grow">Files</h3><label class="btn small">${icon('clip', 15)} Add<input type="file" id="pj-file" multiple hidden accept=".pdf,.docx,.xlsx,.xlsm,.csv,.tsv,.pptx,.txt,.md,.json,.html,.htm,.xml,.js,.ts,.py,.java,.c,.cpp,.cs,.go,.rs,.rb,.php,.sql"></label></div>
            ${files.length ? `<div class="proj-files">${files.map((f) => `<div class="proj-file">${icon('doc', 16)}<span class="grow t" title="${esc(f.name)}">${esc(f.name)}</span><span class="small muted">${Math.max(1, Math.round((f.text || '').length / 6 / 100) / 10)}K words</span><button class="icon-btn sm" data-pj-unfile="${f.id}" title="Remove" aria-label="Remove ${esc(f.name)}">${icon('x', 14)}</button></div>`).join('')}</div>
              <p class="small muted" style="margin:8px 0 0">${chars > 24000 ? 'Long files: each answer reads the parts most related to your question.' : 'Every chat in this project can read these.'}</p>`
              : '<p class="small muted" style="margin:8px 0 0">Drop PDFs, Word, Excel, slides, notes or code here. Chats in this project read them when they help.</p>'}
          </div>
          <div class="card"><h3>Defaults</h3>
            <div class="field" style="margin-top:8px"><label for="pj-as">Assistant</label><select id="pj-as"><option value="">The one you last used</option>${S.data.assistants.map((x) => `<option value="${x.id}" ${x.id === p.assistantId ? 'selected' : ''}>${esc(x.emoji)} ${esc(x.name)}</option>`).join('')}</select></div>
            <div class="field"><label for="pj-model">Model or stack</label><select id="pj-model">${targetOptions(p.target || '', { includeNone: true, noneLabel: "The assistant's own" })}</select></div>
          </div>
        </aside>
      </div></div>`;
  },
  bind() {
    const p = projectById(S.route.id);
    if (!p) return;
    $$('[data-goto]').forEach((b) => b.addEventListener('click', () => go({ view: b.dataset.goto })));
    $('#pj-edit').onclick = $('#pj-edit2').onclick = () => editProject(p);
    $('#pj-chat').onclick = () => newChat(p.assistantId, p.id);
    const start = () => {
      const t = $('#pj-q').value.trim();
      newChat(p.assistantId, p.id);
      if (t) { const c = chatById(S.route.id); c.draft = t; render(); setTimeout(() => $('#send')?.click(), 30); }
    };
    $('#pj-send').onclick = start;
    $('#pj-q').addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); start(); } });
    $$('[data-chat-open]').forEach((b) => b.addEventListener('click', () => go({ view: 'chat', id: b.dataset.chatOpen })));
    $('#pj-as').onchange = (e) => { p.assistantId = e.target.value || undefined; save(); };
    $('#pj-model').onchange = (e) => { p.target = e.target.value || ''; save(); };
    $('#pj-file').onchange = async (e) => { await addProjectFiles(p, [...e.target.files]); render(); };
    $$('[data-pj-unfile]').forEach((b) => b.addEventListener('click', () => { p.files = p.files.filter((f) => f.id !== b.dataset.pjUnfile); p.updated = now(); save(); render(); }));
    const drop = $('#pj-drop');
    drop.addEventListener('dragover', (e) => { e.preventDefault(); drop.classList.add('drag'); });
    drop.addEventListener('dragleave', () => drop.classList.remove('drag'));
    drop.addEventListener('drop', async (e) => { e.preventDefault(); drop.classList.remove('drag'); await addProjectFiles(p, [...e.dataTransfer.files]); render(); });
  },
};

async function addProjectFiles(p, files) {
  p.files ||= [];
  for (const f of files) {
    try {
      if (f.size > 100 * 1024 * 1024) throw new Error(`${f.name} is over 100 MB.`);
      const doc = await qs.call('docs:extract', f.name, new Uint8Array(await f.arrayBuffer()));
      if (!doc.text?.trim()) throw new Error(`No text found in ${f.name}.`);
      p.files = p.files.filter((x) => x.name !== f.name);
      p.files.push({ id: uid(), name: f.name, kind: doc.kind, text: doc.text, added: now() });
    } catch (err) { toast(err.message, 6000); }
  }
  p.updated = now();
  save();
}

function editProject(p) {
  const v = p || { name: '', emoji: '📁', instructions: '' };
  const b = openModal(`<h2>${p ? 'Edit project' : 'New project'}</h2>
    <div class="stack-v">
      <div class="row" style="align-items:flex-end"><div class="field" style="width:84px"><label for="pe-emoji">Icon</label><input id="pe-emoji" value="${esc(v.emoji || '📁')}" maxlength="4" style="text-align:center;font-size:1.3rem"></div>
        <div class="field grow"><label for="pe-name">Name</label><input id="pe-name" value="${esc(v.name)}" placeholder="e.g. Kitchen renovation" autofocus></div></div>
      <div class="row wrap" style="gap:4px">${PROJECT_EMOJI.map((e) => `<button class="btn small ghost" data-pe-emoji="${e}">${e}</button>`).join('')}</div>
      <div class="field"><label for="pe-ins">Instructions</label><span class="help">What it's about, who it's for, and how you want answers. Every chat in the project follows this.</span><textarea id="pe-ins" rows="6" placeholder="e.g. We're renovating a 1960s kitchen on a £15,000 budget. Suggest options with rough UK prices and flag anything that needs a professional.">${esc(v.instructions || '')}</textarea></div>
    </div>
    <div class="modal-actions">${p ? '<button class="btn danger" id="pe-del" style="margin-right:auto">Delete project</button>' : ''}<button class="btn" data-close>Cancel</button><button class="btn primary" id="pe-ok">${p ? 'Save' : 'Create'}</button></div>`);
  b.querySelectorAll('[data-pe-emoji]').forEach((x) => { x.onclick = () => { b.querySelector('#pe-emoji').value = x.dataset.peEmoji; }; });
  b.querySelector('#pe-ok').onclick = () => {
    const name = b.querySelector('#pe-name').value.trim();
    if (!name) { toast('Give the project a name.'); return; }
    const out = p || { id: uid(), created: now(), files: [] };
    Object.assign(out, { name: name.slice(0, 80), emoji: b.querySelector('#pe-emoji').value.trim() || '📁', instructions: b.querySelector('#pe-ins').value.trim(), updated: now() });
    if (!p) projList().push(out);
    save(); closeModal();
    go({ view: 'project', id: out.id });
  };
  b.querySelector('#pe-del')?.addEventListener('click', async () => {
    if (!(await confirmBox(`Delete the project "${p.name}"? Its chats are kept and move out of the project.`))) return;
    for (const c of S.data.chats) if (c.projectId === p.id) delete c.projectId;
    S.data.projects = projList().filter((x) => x.id !== p.id);
    save(); go({ view: 'projects' });
  });
}

function moveToProject(chat) {
  const list = projList();
  const b = openModal(`<h2>Move to a project</h2>
    <div class="proj-pick">${list.map((p) => `<button class="proj-chat ${chat.projectId === p.id ? 'on' : ''}" data-mv="${p.id}"><span class="ce">${esc(p.emoji || '📁')}</span><span class="grow t">${esc(p.name)}</span>${chat.projectId === p.id ? icon('check', 16) : ''}</button>`).join('') || '<p class="muted small">No projects yet.</p>'}</div>
    <div class="modal-actions">${chat.projectId ? '<button class="btn" data-mv="" style="margin-right:auto">Take it out of the project</button>' : ''}<button class="btn" id="mv-new">${icon('plus', 15)} New project</button><button class="btn primary" data-close>Done</button></div>`);
  b.querySelectorAll('[data-mv]').forEach((x) => { x.onclick = () => { if (x.dataset.mv) chat.projectId = x.dataset.mv; else delete chat.projectId; save(); closeModal(); render(); toast(x.dataset.mv ? `Moved to ${projectById(x.dataset.mv).name}.` : 'Taken out of the project.'); }; });
  b.querySelector('#mv-new').onclick = () => { closeModal(); editProject(); };
}

// The project's instructions and the parts of its files that matter for this question.
function projectPrompt(chat, question, ctxTokens) {
  const p = chat?.projectId && projectById(chat.projectId);
  if (!p) return '';
  const out = [`This chat is part of the user's project "${p.name}".`];
  if (p.instructions) out.push(`Project instructions (follow them):\n${p.instructions}`);
  const files = (p.files || []).filter((f) => f.text);
  if (files.length) {
    const budget = Math.max(6000, Math.floor((ctxTokens || 16384) * 3.2 * 0.35));
    const total = files.reduce((n, f) => n + f.text.length, 0);
    let body;
    if (total <= budget) body = files.map((f) => `<file name="${f.name}">\n${f.text}\n</file>`).join('\n\n');
    else {
      // Too long to include whole: split into passages and keep the ones closest to the question.
      const q = new Set((String(question || '').toLowerCase().match(/[a-z0-9]{3,}/g) || []).filter((w) => !MEM_STOP.has(w)));
      const parts = [];
      for (const f of files) for (let i = 0; i < f.text.length; i += 1500) parts.push({ f, i, t: f.text.slice(i, i + 1600) });
      const score = (t) => { const w = t.toLowerCase().match(/[a-z0-9]{3,}/g) || []; let s = 0; for (const x of w) if (q.has(x)) s++; return s / Math.sqrt(w.length + 20); };
      const keep = parts.map((x) => ({ ...x, s: score(x.t) + (x.i === 0 ? 0.05 : 0) })).sort((a, b) => b.s - a.s).slice(0, Math.max(2, Math.floor(budget / 1600)))
        .sort((a, b) => files.indexOf(a.f) - files.indexOf(b.f) || a.i - b.i);
      body = keep.map((x) => `<file name="${x.f.name}" part="from character ${x.i}">\n${x.t}\n</file>`).join('\n\n');
      out.push('(The project files are long; these are the passages most related to the question.)');
    }
    out.push(`Project files (use them when relevant and say which file you're drawing on):\n${body}`);
  }
  return out.join('\n\n');
}

function projectChipHTML(chat) {
  const p = chat.projectId && projectById(chat.projectId);
  return p ? `<button class="proj-chip" data-goto-project="${p.id}" title="Open the project">${esc(p.emoji || '📁')} ${esc(p.name)}</button>` : '';
}
document.addEventListener('click', (e) => { const b = e.target.closest('[data-goto-project]'); if (b) go({ view: 'project', id: b.dataset.gotoProject }); });
