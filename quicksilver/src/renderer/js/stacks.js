// Stacks: several models working as one. The Stack Advisor builds them for your PC and job.
'use strict';

let advJob = null;
let advResult = null;
const ROLE = {
  vision: '<span class="badge b-sky">👁 Sees photos & video</span>',
  draft: '<span class="badge b-lav">✏️ Drafts an answer</span>',
  lead: '<span class="badge b-mint">★ Lead: checks & combines</span>',
};

views.stacks = {
  html() {
    const jobs = Object.entries(S.catalog.jobs);
    return `<div class="page">
      <div class="page-head"><h1>Stacks</h1><button class="btn" id="new-stack">＋ Build your own stack</button></div>
      <p class="lede"><b>A stack makes several AI models work as one.</b> A vision model reads your photos and videos. Two or more models from different makers each draft an answer. A lead model compares the drafts, fixes mistakes and writes one final answer, so you get stronger, better-checked answers than any single model gives.</p>
      <div class="section"><h2>🧭 Stack Advisor</h2><span class="muted small">Pick what you'll use it for. It checks your PC and builds the best stack for it.</span></div>
      ${hwLine()}
      <div class="cards" style="grid-template-columns:repeat(auto-fill,minmax(230px,1fr))">${jobs.map(([k, j]) => `
        <button class="card ${advJob === k ? 'hl' : ''}" data-job="${k}" style="text-align:left">
          <div style="font-size:1.6rem">${j.icon}</div><h3>${esc(j.label)}</h3><div class="small muted" style="font-weight:600">${esc(j.pitch)}</div>
        </button>`).join('')}
      </div>
      <div id="adv-out">${advResult ? advisorHTML(advResult) : advJob ? '<div class="empty">Checking your PC and ranking models…</div>' : ''}</div>
      <div class="section"><h2>Your stacks</h2></div>
      ${S.stacks.length ? `<div class="cards">${S.stacks.map(stackCard).join('')}</div>` : '<p class="muted">No stacks yet. Use the Stack Advisor above, or build your own.</p>'}
    </div>`;
  },
  bind() {
    if (!S.est) refreshEstimates().then(() => S.route.view === 'stacks' && render());
    $$('[data-job]').forEach((b) => b.addEventListener('click', () => runAdvisor(b.dataset.job)));
    $$('[data-build]').forEach((b) => b.addEventListener('click', () => buildStack(Number(b.dataset.build))));
    $('#new-stack').addEventListener('click', () => editStack(null));
    $$('[data-edit-stack]').forEach((b) => b.addEventListener('click', () => editStack(S.stacks.find((s) => s.id === b.dataset.editStack))));
    $$('[data-del-stack]').forEach((b) => b.addEventListener('click', async () => {
      if (!(await confirmBox('Delete this stack? The models stay installed.'))) return;
      await call('stacks:delete', b.dataset.delStack); await refreshModels(); render();
    }));
    $$('[data-chat-stack]').forEach((b) => b.addEventListener('click', () => {
      newChat(); const c = chatById(S.route.id); c.target = `stack:${b.dataset.chatStack}`; save(); render();
    }));
  },
};

function hwLine() {
  const h = S.est?.hardware;
  if (!h) return '<p class="muted small">Checking your PC…</p>';
  return `<p class="small" style="font-weight:600;margin:0 0 12px">🖥️ Your PC: ${h.ramGB.toFixed(0)} GB memory · ${esc(h.gpuName || 'no graphics card')}${h.vramGB ? ` (${h.vramGB.toFixed(0)} GB video memory)` : ''} · <a href="#" data-goto-pc>see how every model runs on it</a></p>`;
}
document.addEventListener('click', (e) => { if (e.target.closest('[data-goto-pc]')) { e.preventDefault(); go({ view: 'pc' }); } });

const modelName = (id) => S.catalog.text.find((m) => m.id === id)?.name || id;
const isInstalled = (id) => S.installed.some((m) => m.id === id || m.catalogId === id);

function advisorHTML(r) {
  if (!r.stacks.length) return '<div class="notice">No model fits this PC\'s memory for this job. Try "Fast on a modest PC", close other apps, or connect a cloud API under Models → Connect an API.</div>';
  return `<div class="section"><h2>Recommended for ${esc(r.label.toLowerCase())}</h2></div>
    <div class="cards">${r.stacks.map((s, i) => {
      const rows = [];
      if (s.members.vision) rows.push(['vision', s.members.vision]);
      for (const d of s.members.drafters) rows.push(['draft', d]);
      if (s.members.judge) rows.push(['lead', s.members.judge]);
      const missing = [...new Set(rows.map((x) => x[1]))].filter((id) => !isInstalled(id));
      const missGB = missing.reduce((t, id) => { const m = S.catalog.text.find((x) => x.id === id); return t + m.sizeGB + (m.mmprojGB || 0); }, 0);
      const best = s.tier === 'powerhouse' ? 'hl' : '';
      return `<div class="card ${best}">
        <div class="row"><h3 class="grow">${{ fast: '⚡', balanced: '⚖️', powerhouse: '🚀' }[s.tier]} ${esc(s.name)}</h3>${s.tier === 'powerhouse' ? '<span class="badge b-mint">Most accurate</span>' : s.tier === 'fast' ? '<span class="badge b-sky">Quickest</span>' : ''}</div>
        <p class="small muted" style="font-weight:600;margin:6px 0 10px">${esc(s.blurb)}</p>
        <div class="stack-v" style="gap:8px">${rows.map(([role, id]) => `<div><div>${ROLE[role]}</div><div class="row" style="margin-top:3px"><b class="grow">${esc(modelName(id))}</b>${rateBadge(s.estimates[id])}${isInstalled(id) ? '<span class="badge b-mint">✓ installed</span>' : ''}</div></div>`).join('')}</div>
        <p class="small" style="font-weight:700;margin:12px 0">⏱ About ${fmtSec(s.secondsPerAnswer)} per full answer on your PC · ${missing.length ? `${missGB.toFixed(1)} GB to download` : 'Everything installed'}</p>
        <button class="btn ${best ? 'primary' : ''}" data-build="${i}">${missing.length ? 'Download & build this stack' : 'Use this stack'}</button>
      </div>`;
    }).join('')}</div>
    <p class="small muted">Times are estimates for a medium-length answer. Run the speed test on <a href="#" data-goto-pc>Your PC</a> to make them exact.</p>`;
}

async function runAdvisor(job) {
  advJob = job; advResult = null; render();
  advResult = await call('advisor:advise', job);
  S.est ||= await qs.call('catalog:estimates');
  if (S.route.view === 'stacks' && advJob === job) render();
}

async function buildStack(i) {
  const r = advResult;
  const s = r.stacks[i];
  const job = S.catalog.jobs[r.job];
  const ids = [...new Set([s.members.vision, ...s.members.drafters, s.members.judge].filter(Boolean))];
  for (const id of ids) if (!isInstalled(id) && !S.downloads[id]) await download({ catalogId: id }, modelName(id));
  const stack = {
    id: `${r.job}-${s.tier}`, name: `${job.label} · ${s.name}`, emoji: job.icon, builtFor: r.job, tier: s.tier,
    members: { vision: s.members.vision ? `local:${s.members.vision}` : undefined, drafters: s.members.drafters.map((d) => `local:${d}`), judge: s.members.judge ? `local:${s.members.judge}` : undefined },
  };
  await call('stacks:save', stack);
  // Point the matching assistant at the new stack, with the job's tuned settings.
  let a = S.data.assistants.find((x) => x.job === r.job);
  if (a) Object.assign(a, { target: `stack:${stack.id}`, temperature: r.settings.temperature, contextSize: r.settings.contextSize, maxTokens: r.settings.maxTokens });
  if (r.job === 'general' || !targetValid(S.data.prefs.defaultTarget)) S.data.prefs.defaultTarget = `stack:${stack.id}`;
  save();
  await refreshModels();
  const waiting = ids.filter((id) => !isInstalled(id));
  toast(waiting.length ? `Stack created. ${waiting.length} model${waiting.length > 1 ? 's are' : ' is'} downloading; you can chat as soon as ${waiting.length > 1 ? 'they finish' : 'it finishes'}.` : 'Stack ready. Starting a chat…');
  if (!waiting.length && a) newChat(a.id); else render();
}

function stackCard(s) {
  const rows = [];
  if (s.members.vision) rows.push(['vision', s.members.vision]);
  for (const d of s.members.drafters || []) rows.push(['draft', d]);
  if (s.members.judge) rows.push(['lead', s.members.judge]);
  return `<div class="card">
    <div class="row"><span class="emoji-badge">${esc(s.emoji || '🧩')}</span><h3 class="grow">${esc(s.name)}</h3></div>
    <div class="stack-v" style="gap:6px;margin:12px 0">${rows.map(([role, t]) => `<div class="row">${ROLE[role]}<b class="small">${esc(targetLabel(t))}</b>${targetValid(t) ? '' : '<span class="badge b-pink">not installed yet</span>'}</div>`).join('')}</div>
    <div class="row"><button class="btn small primary" data-chat-stack="${s.id}">Chat</button><button class="btn small" data-edit-stack="${s.id}">Edit</button><button class="btn small danger" data-del-stack="${s.id}">Delete</button></div>
  </div>`;
}

function editStack(s) {
  const v = s || { name: '', emoji: '🧩', members: { drafters: [] } };
  const nonStack = { ...S, targets: S.targets.filter((t) => !t.stack) };
  const opts = (sel, none) => { const keep = S.targets; S.targets = nonStack.targets; const h = targetOptions(sel, { includeNone: true, noneLabel: none }); S.targets = keep; return h; };
  const visionOpts = () => `<option value="">None (or a drafter can see)</option>${S.targets.filter((t) => t.vision && !t.stack).map((t) => `<option value="${esc(t.target)}" ${t.target === v.members.vision ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}`;
  const b = openModal(`<h2>${s ? 'Edit stack' : 'Build your own stack'}</h2>
    <p class="help">Mix any models: ones on this PC and ones from connected APIs (for example, two local drafters with Claude or GPT as the lead). Local models take turns; cloud models run at the same time.</p>
    <div class="stack-v">
      <div class="row"><div class="field" style="width:110px"><label for="st-emoji">Icon</label><select id="st-emoji">${['🧩', '🚀', '📊', '🔎', '💻', '📷', '⚖️', '🧠'].map((e) => `<option ${e === v.emoji ? 'selected' : ''}>${e}</option>`).join('')}</select></div>
      <div class="field grow"><label for="st-name">Name</label><input id="st-name" value="${esc(v.name)}" placeholder="e.g. Research Powerhouse"></div></div>
      <div class="field"><label>${ROLE.vision}</label><select id="st-vision">${visionOpts()}</select></div>
      ${[0, 1, 2].map((i) => `<div class="field"><label>${ROLE.draft} ${i ? '(optional)' : ''}</label><select id="st-d${i}">${opts(v.members.drafters?.[i], i ? 'None' : 'Choose a model')}</select></div>`).join('')}
      <div class="field"><label>${ROLE.lead}</label><span class="help">Reads the drafts, fixes mistakes and writes the final answer. Pick your strongest model.</span><select id="st-lead">${opts(v.members.judge, 'None (use the first drafter only)')}</select></div>
    </div>
    <div class="modal-actions"><button class="btn" data-close>Cancel</button><button class="btn primary" id="st-save">Save stack</button></div>`);
  b.querySelector('#st-save').addEventListener('click', async () => {
    const drafters = [0, 1, 2].map((i) => b.querySelector(`#st-d${i}`).value).filter(Boolean);
    const name = b.querySelector('#st-name').value.trim();
    if (!name || !drafters.length) { toast('Give it a name and at least one drafter.'); return; }
    await call('stacks:save', { ...(s || {}), id: s?.id || uid(), name, emoji: b.querySelector('#st-emoji').value, members: { vision: b.querySelector('#st-vision').value || undefined, drafters, judge: b.querySelector('#st-lead').value || undefined } });
    closeModal(); await refreshModels(); render(); toast('Stack saved.');
  });
}
