// Model suggester: pick a stack, fusion or model (or everything on this PC) and a popular task, and
// see the best model to add for it (one that runs well here) and the best cloud service to connect,
// each with its rating for that task out of 10 and how much it would add.
'use strict';

// [icon, label, catalogue job, API use]
const SUGGEST_TASKS = {
  chat: ['💬', 'Everyday chat', 'general', 'chat'],
  reasoning: ['🧠', 'Hard reasoning & maths', 'reasoning', 'reasoning'],
  coding: ['💻', 'Coding', 'coding', 'coding'],
  writing: ['✍️', 'Writing', 'general', 'writing'],
  research: ['🔎', 'Research & facts', 'research', 'research'],
  office: ['📄', 'Office & documents', 'office', 'chat'],
  vision: ['👁️', 'Reading photos', 'vision', 'photos-in'],
  uncensored: ['🔓', 'Uncensored', 'general', 'uncensored'],
  photo: ['🖼️', 'Photo creation', null, 'photos'],
  edit: ['🪄', 'Photo editing', null, 'editing'],
  video: ['🎬', 'Video', null, 'video'],
  music: ['🎵', 'Music (full songs)', null, 'music'],
};
const sugState = { base: '', task: 'chat', unc: false };

// What a base answers with: a stack's members, one model, or every text model on this PC.
function sugTargets(base) {
  if (base.startsWith('stack:')) { const s = S.stacks.find((x) => `stack:${x.id}` === base); return s ? [...new Set([...(s.members.drafters || []), s.members.judge, s.members.vision].filter(Boolean))] : []; }
  if (base) return [base];
  return S.installed.filter((m) => (m.kind || 'text') === 'text').map((m) => `local:${m.id}`);
}
const sugLiquid = (base) => sugState.unc || isLiquid(base) || isLiquidStack(S.stacks.find((x) => `stack:${x.id}` === base));
// A text model's rating for a task, out of 10 (reasoning uses its independent science score).
function textScore(m, task) {
  if (!m) return null;
  const [, , job] = SUGGEST_TASKS[task];
  if (job === 'reasoning') { const sc = scoresFor(m.id)?.science; return sc != null ? sc / 10 : m.jobs ? Math.max(0, (m.jobs.general || 0) - 1) : null; }
  if (task === 'vision' && !m.vision) return 0;
  return m.jobs?.[job] ?? null;
}
const runsHere = (est) => est && ['great', 'good', 'ok'].includes(est.rating);
function sugNow(targets, task) {
  const media = !SUGGEST_TASKS[task][2];
  if (media) {
    const k = { photo: 'image', edit: 'edit', video: 'video', music: 'music' }[task];
    const loc = typeof localBest === 'function' ? localBest(k) : null;
    return loc ? { score: Math.round(loc.v * 2) / 2, who: loc.who } : { score: 0, who: 'nothing on this PC yet' };
  }
  let best = { score: 0, who: '' };
  for (const t of targets) {
    if (String(t).startsWith('api:')) { if (best.score < 9) best = { score: 9, who: targetLabel(t) }; continue; }
    const m = targetModel(t);
    const v = textScore(m, task);
    if (v != null && v > best.score) best = { score: v, who: m?.name || targetLabel(t) };
  }
  return best;
}
function sugLocal(targets, task, liquid) {
  const inTeam = new Set(targets.map((t) => S.installed.find((m) => `local:${m.id}` === t)?.catalogId).filter(Boolean));
  const inst = (id) => S.installed.find((m) => m.catalogId === id);
  if (!SUGGEST_TASKS[task][2]) {
    if (task === 'music') return [];
    const want = { photo: (m) => m.kind === 'image' && m.category !== 'edit', edit: (m) => m.kind === 'image' && (m.category === 'edit' || m.edit), video: (m) => m.kind === 'video' }[task];
    return (S.catalog.media || []).filter((m) => !m.retired && want(m) && (!liquid || task === 'video' || m.uncensored) && S.est?.media?.[m.id]?.fit !== 'no')
      .map((m) => ({ id: m.id, name: m.name, score: m.quality ?? 5, est: S.est?.media?.[m.id], installed: Boolean(inst(m.id)), sizeGB: m.sizeGB }))
      .sort((a, b) => b.score - a.score || (a.est?.sec || 0) - (b.est?.sec || 0)).slice(0, 3);
  }
  return (S.catalog.text || []).filter((m) => !m.retired && m.jobs && !inTeam.has(m.id) && runsHere(S.est?.text?.[m.id])
      && ((task !== 'uncensored' && !liquid) || m.category === 'open') && (task !== 'vision' || m.vision))
    .map((m) => ({ id: m.id, name: m.name, score: textScore(m, task), est: S.est?.text?.[m.id], installed: Boolean(inst(m.id)), instId: inst(m.id)?.id, sizeGB: (m.sizeGB || 0) + (m.mmprojGB || 0) }))
    .filter((x) => x.score != null)
    .sort((a, b) => b.score - a.score || ({ great: 0, good: 1, ok: 2 }[a.est?.rating] - { great: 0, good: 1, ok: 2 }[b.est?.rating])).slice(0, 3);
}
function sugApis(task, liquid) {
  const use = SUGGEST_TASKS[task][3];
  const media = !SUGGEST_TASKS[task][2];
  // Uncensored: Venice for words and pictures; video and music services have their own content rules.
  const list = (typeof API_RANK !== 'undefined' ? API_RANK : []).filter((r) => (liquid && (!media || task === 'photo') ? r[2].includes('uncensored') : r[2].includes(use) || (use === 'photos-in' && r[2].includes('chat') && r[6] >= 9)));
  const byFree = [...list].sort((a, b) => b[7] - a[7] || b[6] - a[6])[0];
  const byValue = [...list].sort((a, b) => rankValue(b) - rankValue(a))[0];
  const byQuality = [...list].sort((a, b) => b[6] - a[6] || rankValue(b) - rankValue(a))[0];
  const out = [];
  for (const [why, r] of [['Best free', byFree], ['Best value', byValue], ['Best quality', byQuality]]) if (r && r[7] >= (why === 'Best free' ? 3 : 0) && !out.some((x) => x[1] === r)) out.push([why, r]);
  return out;
}
// fixedBase: a stack or model; fixedTargets: the AIs picked so far in the fusion builder.
function sugPanelHTML({ fixedBase, fixedTargets, scope } = {}) {
  const base = fixedTargets ? '' : fixedBase ?? sugState.base;
  const targets = fixedTargets || sugTargets(base);
  const building = Boolean(fixedTargets);
  const scopeOk = (x) => (scope === 'stacks' ? !isFusion(x) : scope === 'fusion' ? isFusion(x) : true);
  const task = sugState.task;
  const liquid = sugLiquid(base);
  const now = sugNow(targets, task);
  const locals = sugLocal(targets, task, liquid);
  const apis = sugApis(task, liquid);
  const s = base.startsWith('stack:') && S.stacks.find((x) => `stack:${x.id}` === base);
  const editable = s && !s.builtIn && !s.autoManaged;
  const connected = (preset) => preset && (S.providers || []).some((p) => p.preset === preset && (p.hasKey || p.noKey));
  const gain = (v) => (v > now.score ? `<span class="badge b-mint">+${Math.round((v - now.score) * 10) / 10}</span>` : '<span class="badge">no gain</span>');
  const baseOpts = [['', 'Everything on this PC'], ...S.stacks.filter(scopeOk).map((x) => [`stack:${x.id}`, `${isFusion(x) ? '⚗️' : '🧩'} ${x.name}`]), ...S.installed.filter((m) => (m.kind || 'text') === 'text').map((m) => [`local:${m.id}`, `💻 ${m.name}`])];
  const media = !SUGGEST_TASKS[task][2];
  const cant = now.score <= 0;
  const freeApi = apis.find(([why]) => why === 'Best free')?.[1] || apis[0]?.[1];
  // Words for the "can't do it here" and "needs an API" notes.
  const what = { photo: 'make pictures', edit: 'edit photos', video: 'make videos', music: 'compose full songs', vision: 'read photos' }[task] || `do ${SUGGEST_TASKS[task][1].toLowerCase()} well`;
  const helper = media ? (S.catalog.text || []).filter((m) => !m.retired && m.jobs && runsHere(S.est?.text?.[m.id]) && (!liquid || m.category === 'open')).sort((a, b) => (b.jobs.general || 0) - (a.jobs.general || 0))[0] : null;
  const notes = [
    cant && freeApi ? `<div class="notice sug-free"><b>${building ? 'These AIs' : 'This'} can't ${what} on this PC.</b> Best free option: <b>${esc(freeApi[1])}</b> (${esc(freeApi[4])})${freeApi[9] === 'site' ? ', used on its own site' : ''}.</div>` : '',
    building && media ? `<div class="notice warn sug-api"><b>⚠️ ${esc(SUGGEST_TASKS[task][1])} needs an API connected to get results.</b> No model on this PC can ${what} for this custom AI, so the pictures, clips or songs come from the API you connect (${apis.map(([, r]) => esc(r[1])).join(', ') || 'see Models → Connect an API'}). ${helper ? `Install <b>${esc(helper.name)}</b> to complement it: it writes the detailed ${task === 'music' ? 'lyrics and style prompt' : task === 'video' ? 'shot list and prompts' : 'prompts'} the API turns into results.` : ''}</div>` : '',
  ].join('');
  return `<div class="sug" data-sug-fixed="${fixedBase != null ? esc(fixedBase) : ''}" data-sug-targets="${fixedTargets ? esc(JSON.stringify(fixedTargets)) : ''}" data-sug-scope="${esc(scope || '')}">
    <label class="row small sug-unc" style="gap:6px"><input type="checkbox" id="sug-unc" ${sugState.unc ? 'checked' : ''}> 🔓 Uncensored only <span class="muted">(uncensored models and Venice)</span></label>
    ${fixedBase == null && !building ? `<label class="small sug-base">Suggest additions for <select id="sug-base">${baseOpts.map(([v, l]) => `<option value="${esc(v)}" ${v === base ? 'selected' : ''}>${esc(l)}</option>`).join('')}</select></label>` : ''}
    <div class="row" style="gap:4px;flex-wrap:wrap;margin:8px 0">${Object.entries(SUGGEST_TASKS).map(([k, [ic, l]]) => `<button class="chip-tog ${task === k ? 'on' : ''}" data-sug-task="${k}">${ic} ${esc(l)}</button>`).join('')}</div>
    ${notes}
    <div class="sug-now">Now for <b>${esc(SUGGEST_TASKS[task][1])}</b>: ${tenStarsHTML(Math.round(now.score * 2) / 2)} <span class="small muted">${esc(now.who || 'no model for this yet')}</span></div>
    <div class="sug-cols"><div><h4>💻 Best model to ${base.startsWith('stack:') || building ? 'join' : 'add'} <span class="small muted">(runs well on this PC)</span></h4>
      ${locals.length ? locals.map((x) => `<div class="sug-item"><span class="grow"><b>${esc(x.name)}</b><span class="small muted">${x.sizeGB ? `${x.sizeGB.toFixed(1)} GB · ` : ''}${esc(x.est?.label || '')}${x.installed ? ' · installed' : ''}</span>${x.est?.wordsPerSec ? `<span class="small muted">${esc(timesText(WORDS.chat / Math.max(0.1, x.est.wordsPerSec)))}</span>` : ''}</span>${tenStarsHTML(Math.round(x.score * 2) / 2)}${gain(x.score)}
        ${x.installed ? (building && x.instId && SUGGEST_TASKS[task][2] ? `<button class="btn small" data-sug-pick="local:${esc(x.instId)}">Add to this fusion</button>` : editable && x.instId && SUGGEST_TASKS[task][2] ? `<button class="btn small" data-sug-join="${esc(x.instId)}">Add to ${isFusion(s) ? 'fusion' : 'stack'}</button>` : '') : `<button class="btn small" data-sug-get="${esc(x.id)}" data-sug-name="${esc(x.name)}">Download</button>`}</div>`).join('')
        : `<p class="small muted">${task === 'music' ? 'No music model runs on a PC yet beyond the built-in synth (instrumentals); use a cloud service for full songs.' : liquid ? 'No stronger uncensored model runs well on this PC; a graphics card unlocks Qwen3.5 9B.' : 'Nothing better runs well on this PC; a cloud service is the way up.'}</p>`}
      ${liquid ? '<p class="small muted">A suggested add-on joins the Liquid Edition by itself; any other uncensored model joins when you tick it under Models → Models in use.</p>' : ''}</div>
      <div><h4>☁️ Best API to add</h4>
      ${liquid && apis.some(([, r]) => r[0] === 'venice') && SUGGEST_TASKS[task][2] ? veniceLiquidHTML() : ''}
      ${apis.map(([why, r]) => `<div class="sug-item"><span class="grow"><b>${esc(r[1])}</b> <span class="badge ${why === 'Best free' ? 'b-mint' : 'b-lav'}">${why}</span><span class="small muted">${esc(r[3])} · free: ${esc(r[4])}</span></span>${tenStarsHTML(r[6])}${gain(r[6])}${connected(r[0]) ? '<span class="badge b-mint">✓ connected</span>' : r[9] === 'site' ? '<span class="badge b-lav">on their site</span>' : '<button class="btn small" data-sug-api="' + esc(r[1]) + '">Connect</button>'}</div>`).join('') || '<p class="small muted">No cloud service needed for this.</p>'}</div></div>
  </div>`;
}
function bindSuggest(root = document) {
  const box = root.querySelector('.sug');
  if (!box) return;
  const fixed = box.dataset.sugFixed || null;
  const fixedTargets = box.dataset.sugTargets ? JSON.parse(box.dataset.sugTargets) : null;
  const scope = box.dataset.sugScope || undefined;
  const redraw = () => { box.outerHTML = sugPanelHTML(fixedTargets ? { fixedTargets } : fixed ? { fixedBase: fixed } : { scope }); bindSuggest(root); };
  box.querySelector('#sug-unc')?.addEventListener('change', (e) => { sugState.unc = e.target.checked; redraw(); });
  // In the fusion builder: tick that model in the list of AIs.
  box.querySelectorAll('[data-sug-pick]').forEach((b) => b.addEventListener('click', () => {
    const cb = root.querySelector(`.infuse-opt input[value="${CSS.escape(b.dataset.sugPick)}"]`);
    if (!cb) { toast('That model isn\'t in the list yet.'); return; }
    cb.checked = true;
    cb.dispatchEvent(new Event('change', { bubbles: true }));
    toast('Added to your custom AI.');
  }));
  root.querySelector('#sug-base')?.addEventListener('change', (e) => { sugState.base = e.target.value; redraw(); });
  box.querySelectorAll('[data-sug-task]').forEach((b) => b.addEventListener('click', () => { sugState.task = b.dataset.sugTask; redraw(); }));
  box.querySelectorAll('[data-sug-get]').forEach((b) => b.addEventListener('click', async () => { b.disabled = true; try { await download({ catalogId: b.dataset.sugGet }, b.dataset.sugName); toast(`Downloading ${b.dataset.sugName}. When it's done, add it here in one click.`, 6000); } catch (err) { b.disabled = false; toast(err.message); } }));
  box.querySelectorAll('[data-sug-api]').forEach((b) => b.addEventListener('click', () => { closeModal(); modelsTab = 'api'; go({ view: 'models' }); toast(`Connect ${b.dataset.sugApi} here.`, 5000); }));
  box.querySelectorAll('[data-sug-join]').forEach((b) => b.addEventListener('click', async () => {
    const base = fixed || sugState.base;
    const s = S.stacks.find((x) => `stack:${x.id}` === base);
    if (!s) return;
    const t = `local:${b.dataset.sugJoin}`;
    const drafters = [...new Set([...(s.members.drafters || []), t])].slice(0, 4);
    await qs.call('stacks:save', { ...s, members: { ...s.members, drafters } });
    await refreshModels();
    toast(`Added to ${s.name}.`);
    redraw();
  }));
}
function suggestModal(base) {
  const s = S.stacks.find((x) => `stack:${x.id}` === base);
  const b = openModal(`<h2>💡 What to add to ${esc(s?.name || targetLabel(base))}</h2><p class="small muted" style="margin-top:-4px">Pick a task: the best model to join that runs well on this PC, and the best cloud service to connect, each rated out of 10 for that task.</p>${sugPanelHTML({ fixedBase: base })}<div class="modal-actions"><button class="btn" data-close>Close</button></div>`, { wide: true });
  bindSuggest(b);
}
function suggestSectionHTML(scope) {
  const what = scope === 'fusion' ? 'one of your custom AIs' : scope === 'stacks' ? 'one of your stacks' : 'a stack, a fusion';
  return `<section class="card og-sec sug-sec"><h3>💡 Model suggester</h3><p class="small" style="margin:0">Pick ${what} or one of your models, then a popular task: see the best model to add (that runs well on this PC) and the best API to connect (best free, best value, best quality), with how much each would add out of 10 and its response time.</p>${sugPanelHTML({ scope })}</section>`;
}
