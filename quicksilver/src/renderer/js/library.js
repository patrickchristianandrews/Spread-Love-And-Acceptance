// Knowledge: isolated knowledge bases of your own data (files, folders, websites) plus live
// databases (PubMed, arXiv). Link one to an assistant to ground its answers.
'use strict';

let kb = { collections: [], live: {}, models: [] };
let kbSel = null;
let kbDocs = [];
let kbHits = null;
let kbBusy = null;

async function refreshKb() {
  kb = { ...(await qs.call('kb:list')), models: await qs.call('kbm:list') };
  if (!kb.collections.some((c) => c.id === kbSel)) kbSel = kb.collections[0]?.id || null;
  kbDocs = kbSel ? await qs.call('kb:docs', kbSel) : [];
}

views.library = {
  html() {
    const c = kb.collections.find((x) => x.id === kbSel);
    const icon = { spreadsheet: '📊', code: '💻', document: '📄', 'web page': '🌐' };
    return `<div class="page">
      <div class="page-head"><h1>Library</h1><button class="btn primary" id="kb-new">＋ New knowledge base</button></div>
      <p class="lede"><b>Give your AI your own data.</b> Each knowledge base is a separate, isolated collection: files, whole folders, websites, and live research databases like <b>PubMed</b>. Link one to an assistant (with "only answer from this knowledge" if you want) and every answer cites its sources as <span class="cite">1</span>. Your files stay on this PC.</p>
      ${kbModelsHTML()}
      <div class="section"><h2>Knowledge bases</h2></div>
      <div class="tabs">${kb.collections.map((x) => `<button class="tab ${x.id === kbSel ? 'active' : ''}" data-kb="${x.id}">${esc(x.emoji)} ${esc(x.name)} <span class="small muted">(${x.docs})</span></button>`).join('')}</div>
      ${c ? `
      <div class="row" style="margin-bottom:14px">
        <button class="btn small" id="kb-files">📄 Add files</button><button class="btn small" id="kb-folder">📁 Add a folder</button><button class="btn small" id="kb-web">🌐 Add a website</button><button class="btn small" id="kb-gh">🐙 Add a GitHub repository</button>
        <span class="grow"></span><button class="btn small primary" id="kb-save-model" title="Save a model that always answers from this knowledge">💾 Save as a model</button><button class="btn small" id="kb-rename">Rename</button><button class="btn small danger" id="kb-del">Delete</button>
      </div>
      <div class="card" style="margin-bottom:16px"><h3>🔴 Live sources</h3><p class="small muted" style="font-weight:600;margin:4px 0 10px">Searched fresh for every question, so they're always current. Turn on as many as you like; your question is sent to each one you enable.</p>
        ${[...new Set(Object.values(kb.live).map((l) => l.group))].map((g) => `<div class="label small" style="margin:8px 0 4px">${esc(g)}</div><div class="row">${Object.entries(kb.live).filter(([, l]) => l.group === g).map(([k, l]) => `<label class="btn small ${c.live?.includes(k) ? 'on' : ''}"><input type="checkbox" data-live="${k}" ${c.live?.includes(k) ? 'checked' : ''} hidden>${l.icon} ${esc(l.name)}</label>`).join('')}</div>`).join('')}
        <div class="label small" style="margin:12px 0 4px">Your own search sources</div>
        <div class="row">${(c.custom || []).map((x, i) => `<span class="badge b-lav" style="font-size:.85rem">🔗 ${esc(x.name)} <button class="tool" data-custom-x="${i}" title="Take out">✕</button></span>`).join('')}<button class="btn small" id="kb-custom">＋ Add a search source</button></div>
      </div>
      ${kbBusy ? `<div class="progress-box" style="margin-bottom:14px">Reading ${esc(kbBusy.file || '…')} (${kbBusy.done}${kbBusy.total ? ` of ${kbBusy.total}` : ''})<div class="bar"><i style="width:${kbBusy.total ? Math.round((kbBusy.done / kbBusy.total) * 100) : 0}%"></i></div></div>` : ''}
      <form class="row" id="kb-search" style="margin-bottom:16px"><input id="kb-q" type="search" class="grow" placeholder="Test a search: what would an assistant find in ${esc(c.name)}?"><button class="btn">Search</button></form>
      ${kbHits ? `<div class="stack-v" style="margin-bottom:20px">${kbHits.length ? kbHits.map((h, i) => `<div class="card"><div class="row"><span class="cite">${i + 1}</span>${h.url ? `<a href="${esc(h.url)}">${esc(h.title)}</a>` : `<b>${esc(h.title)}</b>`}${h.db ? `<span class="badge b-peach">${esc(h.db)}</span>` : ''}</div><p class="small" style="white-space:pre-wrap;margin:8px 0 0">${esc(h.text.slice(0, 600))}${h.text.length > 600 ? '…' : ''}</p></div>`).join('') : '<div class="empty">No matches.</div>'}</div>` : ''}
      ${kbDocs.length ? `<table class="list"><thead><tr><th>Source</th><th>Type</th><th>Passages</th><th>Added</th><th></th></tr></thead><tbody>${kbDocs.map((d) => `<tr><td><b>${icon[d.kind] || '📄'} ${esc(d.name)}</b><div class="small muted" style="word-break:break-all">${esc(d.path)}</div></td><td>${esc(d.kind)}</td><td>${d.chunks}</td><td>${ago(d.added)}</td><td><button class="btn small danger" data-doc-del="${d.id}">Remove</button></td></tr>`).join('')}</tbody></table>`
        : `<div class="empty">Nothing stored in ${esc(c.name)} yet. Supported: PDF, Word, Excel, CSV, PowerPoint, web pages and sites, text and code.</div>`}` : ''}
    </div>`;
  },
  bind() {
    if (!views.library.loaded) { views.library.loaded = true; refreshKb().then(() => S.route.view === 'library' && render()); }
    $$('[data-kb]').forEach((b) => b.addEventListener('click', async () => { kbSel = b.dataset.kb; kbHits = null; kbDocs = await qs.call('kb:docs', kbSel); render(); }));
    $('#kb-new').addEventListener('click', () => kbEdit(null));
    $('#kbm-new')?.addEventListener('click', () => kbmEdit(null));
    $$('[data-kbm-edit]').forEach((b) => b.addEventListener('click', () => kbmEdit(kb.models.find((m) => m.id === b.dataset.kbmEdit))));
    $$('[data-kbm-chat]').forEach((b) => b.addEventListener('click', () => { newChat(); const c = chatById(S.route.id); c.target = `kbm:${b.dataset.kbmChat}`; save(); render(); }));
    $$('[data-kbm-del]').forEach((b) => b.addEventListener('click', async () => {
      if (!(await confirmBox('Delete this knowledge model? Its knowledge bases and base model stay.'))) return;
      await call('kbm:delete', b.dataset.kbmDel); await refreshModels(); await refreshKb(); render();
    }));
    $('#kb-save-model')?.addEventListener('click', () => kbmEdit(null, kbSel));
    if (!kbSel) return;
    const busy = async (fn) => {
      kbBusy = { done: 0, total: 0 }; render();
      try {
        const r = await fn();
        if (r?.added) toast(`Added ${r.added} item${r.added > 1 ? 's' : ''}.`);
        if (r?.errors?.length) toast(`Skipped ${r.errors.length}: ${r.errors.slice(0, 2).join('; ')}`, 7000);
      } finally { kbBusy = null; await refreshKb(); render(); }
    };
    $('#kb-files').addEventListener('click', () => busy(() => call('kb:add', kbSel, 'files')));
    $('#kb-folder').addEventListener('click', () => busy(() => call('kb:add', kbSel, 'folder')));
    $('#kb-web').addEventListener('click', () => {
      const b = openModal(`<h2>Add a website</h2><p class="help">Quicksilver opens the page and follows links within the same site section, saving up to the number of pages you choose. Use it for documentation, guidelines, a company site or an online handbook.</p>
        <div class="stack-v"><div class="field"><label for="w-url">Address</label><input id="w-url" placeholder="https://example.com/handbook/" autofocus></div>
        <div class="field"><label for="w-max">Up to how many pages</label><select id="w-max"><option>10</option><option selected>50</option><option>100</option><option>250</option><option>500</option><option>1000</option></select></div></div>
        <div class="modal-actions"><button class="btn" data-close>Cancel</button><button class="btn primary" id="w-go">Add website</button></div>`);
      b.querySelector('#w-go').addEventListener('click', () => {
        let url = b.querySelector('#w-url').value.trim();
        if (!url) return;
        if (!/^https?:\/\//i.test(url)) url = `https://${url}`;
        const max = Number(b.querySelector('#w-max').value);
        closeModal();
        busy(() => call('kb:website', kbSel, url, max));
      });
    });
    $('#kb-gh').addEventListener('click', () => {
      const b = openModal(`<h2>Add a GitHub repository</h2><p class="help">Imports the repository's documentation and code (up to the number of files you choose) so assistants can answer questions about it. Needs the GitHub integration for private repositories.</p>
        <div class="stack-v"><div class="field"><label for="gh-repo">Repository</label><input id="gh-repo" placeholder="owner/name or https://github.com/owner/name" autofocus></div>
        <div class="field"><label for="gh-max">Up to how many files</label><select id="gh-max"><option>100</option><option selected>400</option><option>1000</option></select></div></div>
        <div class="modal-actions"><button class="btn" data-close>Cancel</button><button class="btn primary" id="gh-go">Import</button></div>`);
      b.querySelector('#gh-go').addEventListener('click', () => {
        const repo = b.querySelector('#gh-repo').value.trim();
        if (!/^(https?:\/\/github\.com\/)?[\w.-]+\/[\w.-]+\/?$/.test(repo)) { toast('Enter it as owner/name.'); return; }
        const max = Number(b.querySelector('#gh-max').value);
        closeModal();
        busy(() => call('kb:github', kbSel, repo, max));
      });
    });
    $('#kb-rename').addEventListener('click', () => kbEdit(kb.collections.find((x) => x.id === kbSel)));
    $('#kb-del').addEventListener('click', async () => { if (!(await confirmBox('Delete this knowledge base? Your original files are not touched.'))) return; await call('kb:delete', kbSel); kbSel = null; await refreshKb(); render(); });
    $$('[data-live]').forEach((cb) => cb.addEventListener('change', async () => {
      const c = kb.collections.find((x) => x.id === kbSel);
      const live = new Set(c.live || []);
      if (cb.checked) live.add(cb.dataset.live); else live.delete(cb.dataset.live);
      await call('kb:update', kbSel, { live: [...live] }); await refreshKb(); render();
    }));
    $('#kb-search').addEventListener('submit', async (e) => {
      e.preventDefault();
      const r = await call('kb:search', $('#kb-q').value, Number(S.data.prefs.sourcesPerAnswer) || 8, [kbSel]);
      kbHits = r.results;
      if (r.failures.length) toast(`Didn't respond: ${r.failures.join('; ')}`, 6000);
      render();
    });
    $('#kb-custom').addEventListener('click', () => {
      const b = openModal(`<h2>Add a search source</h2><p class="help">Any website or database with a search page or search API. Search for something on the site, copy the address of the results page, and replace your search words with <code>{query}</code>.</p>
        <div class="stack-v"><div class="field"><label for="cs-name">Name</label><input id="cs-name" placeholder="e.g. NICE guidelines, Company wiki, Cochrane" autofocus></div>
        <div class="field"><label for="cs-url">Search address</label><input id="cs-url" placeholder="https://www.example.org/search?q={query}"></div></div>
        <div class="modal-actions"><button class="btn" data-close>Cancel</button><button class="btn primary" id="cs-ok">Add</button></div>`);
      b.querySelector('#cs-ok').addEventListener('click', async () => {
        const name = b.querySelector('#cs-name').value.trim();
        const url = b.querySelector('#cs-url').value.trim();
        if (!name || !/^https?:[/][/]/.test(url) || !url.includes('{query}')) { toast('Give it a name and an address starting with http that contains {query}.'); return; }
        const c = kb.collections.find((x) => x.id === kbSel);
        await call('kb:update', kbSel, { custom: [...(c.custom || []), { name, url }] });
        closeModal(); await refreshKb(); render();
      });
    });
    $$('[data-custom-x]').forEach((x) => x.addEventListener('click', async (e) => {
      e.preventDefault();
      const c = kb.collections.find((y) => y.id === kbSel);
      await call('kb:update', kbSel, { custom: (c.custom || []).filter((_, i) => i !== Number(x.dataset.customX)) });
      await refreshKb(); render();
    }));
    $$('[data-doc-del]').forEach((b) => b.addEventListener('click', async () => { await call('kb:removeDoc', b.dataset.docDel); await refreshKb(); render(); }));
  },
};

// ---------- knowledge models: a model + your knowledge, saved and picked like any model ----------

function kbModelsHTML() {
  const list = kb.models || [];
  const name = (id) => kb.collections.find((c) => c.id === id);
  return `<div class="section"><h2>Knowledge models</h2><button class="btn small" id="kbm-new">＋ New knowledge model</button></div>
    <p class="small muted" style="font-weight:600;margin:-4px 0 12px">A saved model that always searches your chosen knowledge first and cites it. Pick it in any chat, use it in teams, or call it from other apps through the API server.</p>
    ${list.length ? `<div class="cards" style="margin-bottom:18px">${list.map((m) => `<div class="card">
      <div class="row"><span class="emoji-badge">${esc(m.emoji || '📚')}</span><h3 class="grow">${esc(m.name)}</h3>${m.strict ? '<span class="badge b-peach">🔒 Only this knowledge</span>' : ''}</div>
      <div class="small muted" style="font-weight:600;margin:8px 0">Answers with <b>${esc(targetLabel(m.base))}</b> from ${m.knowledge?.length ? m.knowledge.map((id) => name(id)).filter(Boolean).map((c) => `${esc(c.emoji)} ${esc(c.name)}`).join(', ') : 'all your knowledge bases'}</div>
      <div class="row"><button class="btn small primary" data-kbm-chat="${m.id}">Chat</button><button class="btn small" data-kbm-edit="${m.id}">Edit</button><button class="btn small danger" data-kbm-del="${m.id}">Delete</button></div>
    </div>`).join('')}</div>` : ''}`;
}

function kbmEdit(m, preselect) {
  const v = m || { name: '', emoji: '📚', base: S.data.prefs.defaultTarget || '', knowledge: preselect ? [preselect] : [], strict: false, instructions: '' };
  if (!kb.collections.length) { toast('Create a knowledge base first, then save a model from it.'); return; }
  const bases = S.targets.filter((t) => !t.knowledge);
  if (!bases.length) { toast('Install or connect a model first.'); return; }
  const b = openModal(`<h2>${m ? 'Edit knowledge model' : '💾 Save a knowledge model'}</h2>
    <p class="help">It searches the knowledge you pick before every answer and cites it. It shows up in every model menu under <b>Knowledge models</b>.</p>
    <div class="stack-v">
      <div class="row"><div class="field" style="width:100px"><label for="km-emoji">Icon</label><select id="km-emoji">${['📚', '🩺', '⚖️', '💼', '🔬', '🏗️', '🎓', '🧾', '🛠️', '🌍'].map((e) => `<option ${e === v.emoji ? 'selected' : ''}>${e}</option>`).join('')}</select></div>
      <div class="field grow"><label for="km-name">Name</label><input id="km-name" value="${esc(v.name)}" placeholder="e.g. Medical Reference, Company Handbook"></div></div>
      <div class="field"><label for="km-base">Answers with</label><select id="km-base">${bases.map((t) => `<option value="${esc(t.target)}" ${t.target === v.base ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}</select></div>
      <div class="field"><label>Knowledge</label><div class="row" id="km-kbs">${kb.collections.map((c) => `<label class="btn small ${(v.knowledge || []).includes(c.id) ? 'on' : ''}"><input type="checkbox" value="${c.id}" ${(v.knowledge || []).includes(c.id) ? 'checked' : ''}> ${esc(c.emoji)} ${esc(c.name)}</label>`).join('')}</div><span class="help">None ticked = all of them.</span></div>
      <label class="row"><input type="checkbox" id="km-strict" ${v.strict ? 'checked' : ''}> <span><b>🔒 Only answer from this knowledge</b> <span class="help">never from general memory; says "not found" instead of guessing</span></span></label>
      <div class="field"><label for="km-inst">Instructions (optional)</label><textarea id="km-inst" rows="3" placeholder="e.g. You are a clinical reference assistant. Answer concisely for doctors and always give the guideline year.">${esc(v.instructions || '')}</textarea></div>
    </div>
    <div id="km-preview"></div>
    <div class="modal-actions"><button class="btn" data-close>Cancel</button><button class="btn primary" id="km-save">Save model</button></div>`);
  const kmPreview = () => {
    const base = b.querySelector('#km-base').value;
    const sec = etaFor(base);
    b.querySelector('#km-preview').innerHTML = sec == null ? '' : `<div class="preview"><div class="pv-title">🔮 How this knowledge model will work on your PC</div>
      <div class="pv-times"><span class="typ">🔎 Search your knowledge <span class="muted">⏱ ~1 s</span></span><span class="typ">💬 Answer with sources <span class="muted">⏱ ${etaLabel(etaFor(base, WORDS.research))}</span></span></div>
      <div class="pv-stars">${PREVIEW_JOBS.map(([job, ic, label]) => (starsOf(base, job) != null ? `<span class="pv-star">${ic} ${label} ${starsHTML(starsOf(base, job))}</span>` : '')).join('')}</div>
      <div class="small muted">Grounded in your files, so answers are only as complete as the knowledge you add.</div></div>`;
  };
  b.querySelector('#km-base').addEventListener('change', kmPreview);
  kmPreview();
  b.querySelector('#km-kbs').addEventListener('change', (e) => e.target.closest('label')?.classList.toggle('on', e.target.checked));
  b.querySelector('#km-save').addEventListener('click', async () => {
    const name = b.querySelector('#km-name').value.trim();
    if (!name) { toast('Give it a name.'); return; }
    const saved = await call('kbm:save', { ...v, id: v.id || uid(), name, emoji: b.querySelector('#km-emoji').value, base: b.querySelector('#km-base').value,
      knowledge: [...b.querySelectorAll('#km-kbs input:checked')].map((x) => x.value), strict: b.querySelector('#km-strict').checked, instructions: b.querySelector('#km-inst').value.trim() });
    closeModal(); await refreshModels(); await refreshKb(); render();
    toast(`${saved.name} is saved. Pick it in any chat's model menu.`, 6000);
  });
}

function kbEdit(c) {
  const b = openModal(`<h2>${c ? 'Rename knowledge base' : 'New knowledge base'}</h2>
    <div class="row"><div class="field" style="width:110px"><label for="kb-emoji">Icon</label><select id="kb-emoji">${['📁', '🩺', '⚖️', '🏢', '📈', '🔬', '🎓', '🛠️', '🌍', '💊'].map((e) => `<option ${e === c?.emoji ? 'selected' : ''}>${e}</option>`).join('')}</select></div>
    <div class="field grow"><label for="kb-name">Name</label><input id="kb-name" value="${esc(c?.name || '')}" placeholder="e.g. Clinical research, Company policies" autofocus></div></div>
    <div class="modal-actions"><button class="btn" data-close>Cancel</button><button class="btn primary" id="kb-ok">${c ? 'Save' : 'Create'}</button></div>`);
  b.querySelector('#kb-ok').addEventListener('click', async () => {
    const name = b.querySelector('#kb-name').value.trim();
    if (!name) return;
    const emoji = b.querySelector('#kb-emoji').value;
    if (c) await call('kb:update', c.id, { name, emoji }); else kbSel = (await call('kb:create', { name, emoji })).id;
    closeModal(); await refreshKb(); render();
  });
}
qs.onLibrary((p) => { if (kbBusy) { kbBusy = p; if (S.route.view === 'library') render(); } });
