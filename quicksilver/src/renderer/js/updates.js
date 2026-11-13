// Better models and stacks as they come out. The picks (featured models, new models, which newer
// model replaces an older one, the models stacks are built from) refresh online once a day. When a
// better model for something you use runs well on this PC, Quicksilver says so and, unless you
// turned it off in Settings, installs it in the background, then swaps it into your stacks, chats,
// assistants and projects and offers to remove the old one. Nothing is downloaded while offline.
'use strict';

S.modelUpgrades = null; // [{ oldId, oldName, newCatalogId, newName, why, rating, speed, sizeGB }]
const AUTO_CAP_GB = 30; // at most this much downloaded automatically per check

const LATER_DAYS = 3; // "Maybe later" puts a suggestion off for this long, then it's back
const upgradePrefs = () => {
  const p = S.data.prefs;
  p.pendingUpgrades ||= {}; // newCatalogId → old installed model id
  p.upgradeLater ||= {};    // suggestion key → when to suggest it again
  delete p.upgradeSkipped;  // older builds hid suggestions for good
  return p;
};
const upKey = (u) => (u.fresh ? `new:${u.recipe}` : u.quicksilver ? `qs:${u.models[0].id}` : u.recipe ? `stack:${u.recipe}:${u.models.map((m) => m.id).join(',')}` : `${u.oldCatalogId}>${u.newCatalogId}`);
const putOff = (u) => (upgradePrefs().upgradeLater[upKey(u)] || 0) > Date.now();
function maybeLater(key) {
  const p = upgradePrefs();
  for (const [k, t] of Object.entries(p.upgradeLater)) if (t <= Date.now()) delete p.upgradeLater[k];
  p.upgradeLater[key] = Date.now() + LATER_DAYS * 24 * 60 * 60 * 1000;
  save();
}
// Featured = one of the best models right now AND it runs on this PC. A pick that will not fit
// here is not featured here: it would only be a download that cannot be used.
const fitsThisPC = (id) => (S.est?.text?.[id] || S.est?.media?.[id])?.fit !== 'no';
const isFeatured = (id) => Object.values(S.catalog?.picks?.featured || {}).some((l) => l.includes(id)) && fitsThisPC(id);
const featuredHidden = () => [...new Set(Object.values(S.catalog?.picks?.featured || {}).flat())].filter((id) => [...(S.catalog?.text || []), ...(S.catalog?.media || [])].some((m) => m.id === id && !m.retired) && !fitsThisPC(id)).length;
// Off unless you switch it on: model downloads can be several GB, so by default you're told and choose.
const autoUpdates = () => S.data.prefs.autoInstallModels === true;

// Recipe stacks you set up whose best plan for this PC now includes models you don't have.
function stackUpdates() {
  if (typeof STACK_RECIPES === 'undefined' || !S.est?.text) return [];
  const out = [];
  for (const st of S.stacks || []) {
    if (!st.id?.startsWith('rx-')) continue;
    const r = STACK_RECIPES.find((x) => `rx-${x.id}` === st.id);
    if (!r) continue;
    const add = rxResolve(r).parts.filter((p) => p.kind === 'model' && !p.helper && p.up && S.catalog.text.some((m) => m.id === p.id) && !haveModel(p.id)
      && ['great', 'good'].includes(S.est.text[p.id]?.rating));
    if (add.length) out.push({ recipe: r.id, name: st.name, emoji: st.emoji || r.icon, models: add.map((p) => ({ id: p.id, name: catModel(p.id)?.name || p.id, from: catModel(p.from)?.name || p.from, fromId: p.from })) });
  }
  const boost = quicksilverBoost();
  if (boost) out.push(boost);
  // New stacks published online that run well here and aren't set up yet.
  for (const r of STACK_RECIPES.filter((x) => x.isNew && x.parts.length)) {
    if ((S.stacks || []).some((s) => s.id === `rx-${r.id}`)) continue;
    const ms = rxResolve(r).parts.filter((p) => p.kind === 'model' && !p.helper);
    if (!ms.length || !ms.every((p) => ['great', 'good', 'ok'].includes(S.est.text[p.id]?.rating))) continue;
    out.push({ recipe: r.id, fresh: true, name: r.name, emoji: r.icon, why: rxWhy(r), models: ms.filter((p) => !haveModel(p.id)).map((p) => ({ id: p.id, name: catModel(p.id)?.name || p.id, from: '' })) });
  }
  return out;
}
// The built-in Quicksilver model is a team of your best models: its lead answers every message, so
// it must be fast. When a clearly stronger model from the featured picks also runs fast on this PC,
// adding it makes Quicksilver both quick and more accurate (the team rebuilds itself around it).
function quicksilverBoost() {
  const st = (S.stacks || []).find((x) => x.id === 'quicksilver');
  if (!st || st.autoManaged === false || !S.est?.text) return null;
  // A newer core for the Liquid Edition (named in the online picks): suggested first. The Liquid
  // Edition is completely uncensored, so a replacement is only ever offered when it is itself
  // uncensored — a filtered model (even one the feed names) is never suggested or called uncensored.
  const openOk = (c) => c && (c.category === 'open' || c.open || /abliterat|uncensor|unfiltered|dolphin|hermes|lexi|rocinante/i.test(`${c.name || ''} ${c.repo || ''}`));
  const core = S.catalog.picks?.liquid || {};
  for (const [role, label] of [['brain', 'Brain'], ['eyes', 'Eyes & Muse']]) {
    const id = core[role];
    const c = id && catModel(id);
    if (!c || !openOk(c) || haveModel(id) || !['great', 'good'].includes(S.est.text[id]?.rating)) continue;
    const now = S.installed.find((m) => m.source === 'bundled' && (role === 'brain' ? m.id === 'starter-brain' : m.id === 'starter'));
    if (now?.catalogId === id) continue;
    return { quicksilver: true, core: role, name: 'Quicksilver Liquid Edition: new ' + label, emoji: '💧', models: [{ id, name: c.name, from: now?.name || 'the built-in one', fromId: now?.catalogId }], why: `a newer, better uncensored ${label} for the Liquid Edition, ${c.sizeGB} GB, runs well on this PC` };
  }
  const score = (id) => S.catalog.text.find((x) => x.id === id)?.jobs?.general || 0;
  const leadInst = S.installed.find((m) => `local:${m.id}` === st.members?.judge);
  const best = Math.max(0, ...S.installed.filter((m) => m.kind === 'text' && S.est.text[m.catalogId]?.rating === 'great').map((m) => score(m.catalogId)), score(leadInst?.catalogId));
  const f = S.catalog.picks?.featured || {};
  const pick = [...new Set([...(f.open || [])])].filter((id) => /abliterat|heretic/i.test(`${id} ${catModel(id)?.repo || ''}`)) // only abliterated models join the Liquid Edition
    .filter((id) => S.catalog.text.some((x) => x.id === id) && !haveModel(id) && S.est.text[id]?.rating === 'great' && score(id) >= best + 1)
    .sort((a, b) => score(b) - score(a))[0];
  if (!pick) return null;
  const c = catModel(pick);
  return { quicksilver: true, name: 'Quicksilver Liquid Edition (built in)', emoji: '💧', models: [{ id: pick, name: c.name, from: leadInst?.name || 'its lead', fromId: leadInst?.catalogId }], why: `stronger (${best} → ${score(pick)} out of 10) and still fast on this PC, ${c.sizeGB} GB` };
}
const shownUpgrades = () => (S.modelUpgrades || []).filter((u) => !putOff(u));
const shownStackUpdates = () => stackUpdates().filter((u) => !putOff(u));

// "Better for your PC": for each model you use, a model from ANY family that is clearly better at
// the same job (at least a full point out of 10), runs great or good on this PC and isn't
// installed. Newer versions of the same model come from models:upgrades; this finds the rest.
// Uncensored models are only replaced by uncensored ones, models that see photos by ones that do.
// A model Quicksilver hasn't tested yet says its rating is an estimate.
const BETTER_JOB = { coding: 'coding', vision: 'vision', reasoning: 'research' };
function betterModels(have = S.modelUpgrades || []) {
  if (!S.catalog?.text || !S.est?.text) return [];
  const taken = new Set(have.map((u) => u.newCatalogId));
  const out = [];
  for (const inst of S.installed.filter((m) => m.kind === 'text' && m.catalogId && m.source !== 'bundled' && !(typeof liquidLocked === 'function' && liquidLocked(m)))) {
    const old = S.catalog.text.find((x) => x.id === inst.catalogId);
    if (!old?.jobs || have.some((u) => u.oldCatalogId === old.id)) continue;
    const job = BETTER_JOB[old.category] || 'general';
    const mine = old.jobs[job] || 0;
    const open = old.category === 'open' || old.open;
    const pick = S.catalog.text.filter((c) => !c.retired && c.id !== old.id && c.jobs && !haveModel(c.id) && !taken.has(c.id)
      && (c.jobs[job] || 0) >= mine + 1 && ['great', 'good'].includes(S.est.text[c.id]?.rating)
      && (!open || c.category === 'open' || c.open) && (!old.vision || c.vision) && (job !== 'coding' || c.category === 'coding'))
      .sort((a, b) => (b.jobs[job] - a.jobs[job]) || (Boolean(a.remote) - Boolean(b.remote)) || a.sizeGB - b.sizeGB)[0];
    if (!pick) continue;
    taken.add(pick.id);
    const est = S.est.text[pick.id];
    const words = { general: 'everyday answers', coding: 'coding', vision: 'reading photos', research: 'hard questions' }[job];
    out.push({ better: true, estimate: Boolean(pick.remote), oldId: inst.id, oldName: inst.name, oldCatalogId: old.id, newCatalogId: pick.id, newName: pick.name,
      why: `better at ${words} (${mine} → ${pick.jobs[job]} out of 10${pick.remote ? ', an estimate: not tested by Quicksilver yet' : ''}), ${pick.sizeGB} GB`, rating: est.rating, speed: est.label, sizeGB: pick.sizeGB });
  }
  return out;
}

async function loadModelUpgrades() {
  try { S.modelUpgrades = await qs.call('models:upgrades'); } catch { S.modelUpgrades = []; }
  S.modelUpgrades = [...S.modelUpgrades, ...betterModels(S.modelUpgrades)];
  paintUpdateBadge();
  return S.modelUpgrades;
}

// The left menu stays short: the Explore pages fold into one section (open it when you need it;
// it opens by itself on those pages). Your stacks are on the Stacks page.
const EXPLORE_VIEWS = ['stacks', 'models', 'assistants', 'skills', 'integrations', 'arena'];
const exploreOpen = () => { const p = S.data?.prefs?.exploreOpen; return p === true || (p !== false && EXPLORE_VIEWS.includes(S.route?.view)); };
function paintExplore() {
  const list = document.getElementById('nav-explore-list');
  const btn = document.getElementById('nav-explore');
  if (!list || !btn) return;
  const open = exploreOpen();
  list.hidden = !open;
  btn.setAttribute('aria-expanded', String(open));
  btn.classList.toggle('open', open);
  const n = shownUpgrades().filter((u) => !S.downloads[u.newCatalogId]).length + shownStackUpdates().length;
  btn.classList.toggle('has-dot', Boolean(n) && !open);
}
function paintUpdateBadge() {
  paintExplore();
  const n = shownUpgrades().filter((u) => !S.downloads[u.newCatalogId]).length + shownStackUpdates().length;
  $$('.sidebar [data-nav="models"]').forEach((b) => {
    let dot = b.querySelector('.nav-dot');
    if (n && !dot) { dot = document.createElement('span'); dot.className = 'nav-dot'; b.appendChild(dot); }
    if (dot) { dot.hidden = !n; dot.textContent = n; dot.title = `${n} better ${n === 1 ? 'model or stack' : 'models or stacks'} available`; }
  });
}

function startUpgrade(u, quiet = false) {
  if (S.downloads[u.newCatalogId] || haveModel(u.newCatalogId)) return;
  upgradePrefs().pendingUpgrades[u.newCatalogId] = u.oldId; save();
  download({ catalogId: u.newCatalogId }, u.newName).catch((e) => !quiet && toast(e.message, 8000));
}
async function startStackUpdate(u) {
  if (u.quicksilver) { const m = u.models[0]; if (!S.downloads[m.id] && !haveModel(m.id)) await download({ catalogId: m.id }, m.name).catch(() => {}); return; } // joins the team when it's ready
  await setUpRecipe(u.recipe); // downloads the stronger models and rebuilds the stack around them
}

// Checks for better models and stacks; installs them automatically when that's on.
async function checkForUpdates({ auto = true } = {}) {
  if (!S.est) await refreshEstimates().catch(() => {});
  await loadModelUpgrades();
  const ups = shownUpgrades(); const stacks = shownStackUpdates();
  if (!auto || !autoUpdates() || S.config?.offline) return { ups, stacks };
  let budget = AUTO_CAP_GB;
  const fresh = [];
  for (const u of ups) {
    if (u.better || !['great', 'good'].includes(u.rating) || S.downloads[u.newCatalogId] || u.sizeGB > budget) continue; // a different model is your call, never automatic
    budget -= u.sizeGB; startUpgrade(u, true); fresh.push(u.newName);
  }
  for (const s of stacks.filter((x) => !x.fresh)) {
    const size = s.models.reduce((t, m) => t + (catModel(m.id)?.sizeGB || 0), 0);
    if (size > budget || s.models.some((m) => S.downloads[m.id])) continue;
    budget -= size; await startStackUpdate(s).catch(() => {}); fresh.push(`${s.name} (stronger models)`);
  }
  if (fresh.length) toast(`✨ Better ${fresh.length === 1 ? 'model' : 'models'} found for this PC: installing ${fresh.join(', ')} in the background. Your chats and stacks switch over when ${fresh.length === 1 ? "it's" : "they're"} ready.`, 9000);
  paintUpdateBadge();
  return { ups, stacks };
}

// After a download finishes: swap the new model in wherever the one it replaces was used.
async function applyPendingUpgrades(model) {
  const p = upgradePrefs();
  const oldId = model?.catalogId && p.pendingUpgrades[model.catalogId];
  if (!oldId) return false;
  delete p.pendingUpgrades[model.catalogId];
  const from = `local:${oldId}`; const to = `local:${model.id}`;
  const swap = (t) => (t === from ? to : t);
  for (const st of await qs.call('stacks:list').catch(() => S.stacks || [])) {
    const m = st.members || {};
    const next = { ...m, drafters: (m.drafters || []).map(swap), judge: swap(m.judge), vision: swap(m.vision) };
    if (JSON.stringify(next) !== JSON.stringify(m)) await qs.call('stacks:save', { ...st, members: next }).catch(() => {});
  }
  for (const c of S.data.chats) c.target = swap(c.target);
  for (const a of S.data.assistants) a.target = swap(a.target);
  for (const pj of S.data.projects || []) pj.target = swap(pj.target);
  p.defaultTarget = swap(p.defaultTarget);
  save();
  await refreshModels();
  S.modelUpgrades = (S.modelUpgrades || []).filter((u) => u.newCatalogId !== model.catalogId);
  paintUpdateBadge();
  const old = S.installed.find((x) => x.id === oldId);
  if (old && !liquidLocked(old)) {
    toastAction(`✨ Upgraded to ${model.name}: your stacks and chats use it now. Remove ${old.name} to free ${gb(old.size)}?`, 'Remove old', async () => {
      await qs.call('models:remove', old.id).catch(() => {}); await refreshModels(); render(); toast(`${old.name} removed.`);
    }, 12000);
  } else toast(`✨ Upgraded to ${model.name}.`);
  return true;
}

function modelUpdatesHTML() {
  const ups = shownUpgrades();
  const stacks = shownStackUpdates();
  const later = (S.modelUpgrades || []).length + stackUpdates().length - ups.length - stacks.length;
  const laterNote = later ? ` <span class="small muted">${later} put off for later.</span> <button class="btn small ghost" id="up-later-show">Show ${later === 1 ? 'it' : 'them'} now</button>` : '';
  const picks = S.catalog?.picks || {};
  const when = picks.fetchedAt ? `checked ${new Date(picks.fetchedAt).toLocaleDateString()}` : 'built-in picks';
  if (!ups.length && !stacks.length) {
    return `<div class="notice ok up-none" id="model-updates"><b>✓ Your models are the best picks for this PC.</b> <span class="small">Quicksilver checks online every day for newer, better models and stacks (${esc(when)}).</span> <button class="btn small ghost" id="up-check">Check now</button>${laterNote}</div>`;
  }
  const row = (u) => { const gains = gainsOf(u.oldCatalogId, u.newCatalogId); return `<div class="up-row"><div class="grow"><b>${esc(gains[0]?.text || (u.better ? `Better than ${u.oldName}` : `A stronger ${u.oldName}`))}</b>${gainsHTML(gains.slice(1))}<div class="small muted">${esc(u.oldName)} → <b>${esc(u.newName)}</b> · ${esc(u.why)} · ${esc(u.speed)} on this PC</div></div>
    ${S.downloads[u.newCatalogId] ? '<span class="badge b-sky">Installing…</span>' : `<button class="btn small primary" data-up-get="${esc(u.newCatalogId)}">${u.better ? 'Switch to it' : 'Upgrade'}</button><button class="btn small ghost" data-up-later="${esc(upKey(u))}" title="Suggest it again in ${LATER_DAYS} days">Maybe later</button>`}</div>`; };
  const srow = (s) => `<div class="up-row"><div class="grow">${esc(s.emoji || '🧩')} <b>${esc(s.name)}</b>${s.fresh ? '' : gainsHTML([...new Map(s.models.flatMap((m) => gainsOf(m.fromId, m.id)).map((g) => [g.text, g])).values()].slice(0, 4))}<div class="small muted">${s.fresh ? `🆕 New stack. ${esc(s.why)}${s.models.length ? ` Downloads: ${s.models.map((m) => esc(m.name)).join(', ')}.` : ' Uses models you already have.'}` : s.quicksilver ? `${s.core ? 'Switch to' : 'Add'} <b>${esc(s.models[0].name)}</b>${s.core ? ` (replaces ${esc(s.models[0].from)})` : ' to the team'}: ${esc(s.why)}` : `${s.models.map((m) => `${esc(m.from)} → <b>${esc(m.name)}</b>`).join(', ')}`}</div></div>
    ${s.models.some((m) => S.downloads[m.id]) ? '<span class="badge b-sky">Installing…</span>' : `<button class="btn small primary" data-up-stack="${esc(upKey(s))}">${s.fresh ? 'Set up' : s.quicksilver ? 'Add it' : 'Update stack'}</button><button class="btn small ghost" data-up-later="${esc(upKey(s))}" title="Suggest it again in ${LATER_DAYS} days">Maybe later</button>`}</div>`;
  return `<div class="card up-card" id="model-updates"><div class="row"><h3 class="grow" style="margin:0">✨ Better models available</h3><span class="small muted">${esc(when)}</span></div>
    <p class="small muted" style="margin:4px 0 10px">${autoUpdates() ? 'These install by themselves in the background' : 'Press Upgrade to download one (or switch on automatic installs in Settings → General)'}; when one is ready, your stacks, chats and assistants switch to it and you can remove the old one.</p>
    ${ups.map(row).join('')}${stacks.map(srow).join('')}${laterNote ? `<div class="up-row">${laterNote}</div>` : ''}</div>`;
}
function bindModelUpdates() {
  $$('[data-up-get]').forEach((b) => b.addEventListener('click', () => { const u = S.modelUpgrades.find((x) => x.newCatalogId === b.dataset.upGet); if (u) { startUpgrade(u); toast(`Installing ${u.newName}. Everything switches over when it's ready.`); render(); } }));
  $$('[data-up-stack]').forEach((b) => b.addEventListener('click', async () => { b.disabled = true; const s = stackUpdates().find((x) => upKey(x) === b.dataset.upStack); if (s) await startStackUpdate(s); }));
  $$('[data-up-later]').forEach((b) => b.addEventListener('click', () => { maybeLater(b.dataset.upLater); paintUpdateBadge(); render(); toast(`OK, I'll suggest it again in ${LATER_DAYS} days.`); }));
  $('#up-later-show')?.addEventListener('click', () => { upgradePrefs().upgradeLater = {}; save(); paintUpdateBadge(); render(); });
  $('#up-check')?.addEventListener('click', async (e) => {
    e.target.disabled = true; e.target.textContent = 'Checking…';
    await qs.call('catalog:refresh').catch(() => {});
    await reloadCatalog();
    const { ups, stacks } = await checkForUpdates();
    if (!ups.length && !stacks.length) toast(S.config?.offline ? "You're offline, so only the saved picks were checked." : 'All up to date: nothing better for this PC right now.');
    render();
  });
}

// The model that comes with Quicksilver, and what it can do.
function builtinModelHTML() {
  const brain = S.catalog.text.find((m) => m.id === 'qwen3.5-4b');
  const eyes = S.catalog.text.find((m) => m.id === 'qwen3.5-2b');
  if (!brain) return '';
  const est = S.est?.text?.[brain.id];
  const have = S.installed.some((m) => m.source === 'bundled' || m.catalogId === brain.id);
  const open = S.installed.some((m) => m.source === 'bundled' && /uncensored|abliterat/i.test(modelNameText(m)));
  const qst = (S.stacks || []).find((x) => x.id === 'quicksilver');
  const team = qst ? [...new Set([qst.members.judge, ...(qst.members.drafters || []), qst.members.vision].filter(Boolean))].map((t) => S.installed.find((m) => `local:${m.id}` === t)?.name).filter(Boolean) : [];
  const can = [
    ['💬', 'Sounds human', 'talks like a person and writes like one: no chatbot phrases or AI-looking formatting'],
    ['🧠', 'Reasons step by step', 'works hard questions out step by step first; see it under "Thought it through"'],
    ['✓', 'Double-checks', 'a second model checks answers claim by claim when you turn on Double-check'],
    ['✍️', 'Writes', 'emails, essays, summaries, rewrites in any tone'],
    ['✨', 'Creative spark', 'for stories, lyrics, names and ideas, its Muse throws out fresh angles first, so you don\'t get the obvious take'],
    ['🧮', 'Gets maths right', 'sums are worked out exactly, not guessed'],
    ['💻', 'Helps with code', 'explains, writes and fixes everyday code'],
    ['👁', 'Sees photos', `reads screenshots, receipts and pictures itself`],
    ['📄', 'Reads your files', 'answers from your PDFs, Word and Excel files'],
    ['🌐', 'Looks things up', 'searches the web for fresh facts when you are online'],
    ['🎙', 'Talks', 'speak to it and hear it answer'],
  ];
  return `<div class="card builtin-card" id="builtin-model">
    <div class="row"><span class="emoji-badge">💧</span><div class="grow"><h3 style="margin:0">Built in: Quicksilver Liquid Edition</h3>
      <div class="small muted">${esc(brain.name)} (sees photos, thinks hard ones through)${eyes ? ` + ${esc(eyes.name)} as the Muse` : ''} · ${(brain.sizeGB + (brain.mmprojGB || 0) + (eyes ? eyes.sizeGB + (eyes.mmprojGB || 0) : 0)).toFixed(1)} GB · comes with the app, works offline</div></div>
      ${open ? '<span class="badge b-peach" title="Answers plainly, without refusing. The parental lock keeps it family-safe.">Uncensored</span>' : ''}${est ? `<span class="badge rate-${est.rating}">${esc(est.label)}</span>` : ''}</div>
    <p style="margin:10px 0 6px"><b>Fast answers you can trust.</b> Chosen as the quickest model that's still accurate: it answers almost instantly on most PCs and double-checks facts and figures, so you can rely on it for everyday work.${open ? ' It\'s uncensored: it answers plainly instead of refusing (the parental lock in Settings keeps it family-safe).' : ''}</p>
    ${qsRolesHTML(qst)}
    ${stackScoresHTML(qst ? [...(qst.members.drafters || []), qst.members.judge, qst.members.vision, qst.members.muse, qst.members.thinker].filter(Boolean) : ['qwen3.5-4b', 'qwen3.5-2b'])}
    ${dolphinOfferHTML(qst)}
    ${cloudPartnerHTML()}
    <div class="builtin-can">${can.map(([i, t, d]) => `<div><span>${i}</span><b>${esc(t)}</b><span class="small muted">${esc(d)}</span></div>`).join('')}</div>
    <div class="row" style="margin-top:10px">${have ? '<button class="btn small primary" id="builtin-chat">Start a chat</button>' : (S.downloads[brain.id] ? downloadBox(brain.id) : `<button class="btn small primary" data-get="${brain.id}">Download it (${brain.sizeGB} GB)</button>`)}<span class="grow"></span><span class="small muted">Want more power? Better models below run alongside it.</span></div>
  </div>`;
}
// The best free cloud partner for the Liquid Edition: Cerebras runs Qwen3 235B (the big sibling of
// the built-in Qwen3) very fast with a generous free daily allowance; Groq and Mistral as backups
// make free rotation work. Shown until a free cloud AI is connected.
// Dolphin in the crew: an uncensored model from a different family (Llama-based) that's about as
// strong as the Brain, so it adds a genuinely different view on hard questions. Everyday messages
// stay with the fast Brain. Offered when the crew has no second model yet.
const DOLPHIN = 'neuraldaredevil-8b-abliterated'; // (the second opinion: abliterated, from the Llama family)
function dolphinOfferHTML(qst) {
  const m = qst?.members || {};
  const crew = [...(m.drafters || []), m.judge].filter(Boolean);
  const d = catModel(DOLPHIN);
  if (!qst || !d || crew.length > 1 || haveModel(DOLPHIN)) return '';
  const est = S.est?.text?.[DOLPHIN];
  if (est?.rating === 'wont') return '';
  const slow = est && !['great', 'good'].includes(est.rating);
  return `<div class="pair-card"><div class="grow"><b>😈 Add NeuralDaredevil to the crew</b>
      <div class="small muted">NeuralDaredevil 8B is abliterated (its refusals removed from the weights) and about as strong as the Brain, but from a different family (Llama), so on hard questions it adds a second view and they catch each other's mistakes. Everyday messages stay with the fast Brain. ${d.sizeGB} GB download.${slow ? ' On this PC it runs slowly, so hard answers will take noticeably longer.' : ''}</div></div>
    ${S.downloads[DOLPHIN] ? downloadBox(DOLPHIN) : `<button class="btn small ${slow ? '' : 'primary'}" data-get="${DOLPHIN}" data-use-when-done="${DOLPHIN}">Add NeuralDaredevil</button>`}</div>`;
}
// The Liquid Edition's cloud helper for hard questions: any cloud AI you connect (an uncensored
// one is used first when you have both). Venice is the suggestion, because it is uncensored and
// says it doesn't store prompts; a filtered service may refuse some uncensored requests.
// The switch and the connect buttons are right here.
function cloudPartnerHTML() {
  const conn = (S.providers || []).filter((p) => (p.hasKey || p.noKey) && !p.media && p.preset !== 'ollama' && p.preset !== 'lmstudio');
  const venice = conn.find((p) => p.preset === 'venice');
  const on = Boolean(S.data.prefs.cloudHard);
  const names = conn.map((p) => esc(p.name)).join(', ');
  const toggle = `<label class="row small" style="gap:6px;margin:8px 0 4px"><input type="checkbox" id="pair-hard" ${on ? 'checked' : ''} ${conn.length ? '' : 'disabled'}> <b>Send hard questions to my cloud AI</b>${conn.length ? '' : ' <span class="muted">(connect one first)</span>'}</label>`;
  const buttons = `<div class="row" style="gap:6px;flex-wrap:wrap;margin-top:6px">${venice ? '' : '<button class="btn small primary" data-pair="venice" title="Uncensored, and says it does not store your prompts">Connect Venice (suggested)</button>'}<button class="btn small" data-goto-api title="Any cloud AI: Gemini, Claude, ChatGPT, Groq, OpenRouter, UncensoredLLM and more">${conn.length ? 'Connect another API' : 'Connect any API'}</button><button class="btn small ghost" data-api-dir="uncensored">📒 Compare APIs</button></div>`;
  return `<div class="pair-card"><div class="grow"><b>☁️ ${conn.length ? `Cloud helper: ${names}` : 'Add a cloud AI for hard questions'}</b>
      <div class="small muted">${on ? 'On: hard' : 'When this is on, hard'} questions go to ${conn.length ? (venice ? `${esc(venice.name)} (uncensored)${conn.length > 1 ? ', or your other connected AIs' : ''}` : 'your connected cloud AI') : 'a cloud AI you connect'}; everything else stays on your PC. Any API works.${venice ? '' : ' <b>Venice is suggested</b>: it is uncensored and says it doesn\'t store your prompts. A filtered service (ChatGPT, Gemini, Claude…) may refuse some uncensored requests; then the answer comes from your PC.'}</div>
      ${toggle}${veniceLiquidHTML()}${buttons}</div></div>`;
}
document.addEventListener('change', (e) => {
  if (e.target.id !== 'pair-hard') return;
  S.data.prefs.cloudHard = e.target.checked; save();
  toast(e.target.checked ? 'On: hard questions go to your cloud AI; everything else stays on your PC.' : 'Off: every answer comes from your PC.');
  render();
});
document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-goto-api]')) return;
  modelsTab = 'api'; go({ view: 'models' });
});
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-pair]');
  if (!b) return;
  const presets = await qs.call('providers:presets');
  editProvider({ preset: b.dataset.pair }, presets);
});

// Quicksilver's crew, by role: the Brain answers, the Eyes read photos and double as the Muse for
// creative work, and a Closer (a stronger uncensored model, when this PC has one) finishes hard ones.
function qsRolesHTML(qst) {
  if (!qst) return '';
  const nameOf = (t) => S.installed.find((m) => `local:${m.id}` === t)?.name || (t ? targetLabel(t) : '');
  const m = qst.members || {};
  const brain = m.drafters?.[0];
  const roles = [
    brain && ['🧠', 'Brain', nameOf(brain), m.thinker === brain ? `answers everyday messages fast${m.vision ? '' : ', reads photos itself,'} and switches its own thinking on for hard questions (press Answer now to skip)` : 'answers everyday messages fast and reasons step by step'],
    m.vision && ['👁', 'Eyes', nameOf(m.vision), 'reads photos'],
    (m.muse || m.vision) && ['✨', 'Muse', nameOf(m.muse || m.vision), 'sketches fresh angles before creative writing'],
    m.thinker && m.thinker !== brain && ['🧮', 'Thinker', nameOf(m.thinker), 'thinks hard maths and logic through before answering (press Answer now to skip)'],
    m.judge && m.judge !== brain && ['🎯', 'Closer', nameOf(m.judge), 'leads on hard questions'],
    m.drafters?.[1] && [/dolphin/i.test(nameOf(m.drafters[1])) ? '🐬' : '🗣', 'Second opinion', nameOf(m.drafters[1]), 'writes its key points on hard questions, then the Brain answers from both views'],
    qst.bench && [/dolphin/i.test(nameOf(qst.bench)) ? '🐬' : '🪑', 'On the Council', nameOf(qst.bench), 'too slow on this PC to join every hard question, so it adds its view when you pick Council, and you can chat with it directly'],
  ].filter(Boolean);
  if (!roles.length) return '';
  return `<div class="qs-roles">${roles.map(([i, r, n, d]) => `<div class="qs-role"><span class="qs-role-ic">${i}</span><span><b>${esc(r)}</b> <span class="small">${esc(n)}</span><span class="small muted">${esc(d)}</span></span></div>`).join('')}</div>
    <p class="small muted" style="margin:4px 0 6px">Liquid Edition's own uncensored crew. It answers with its own models and nothing else on this PC. Suggested add-ons you download join it; any other uncensored model joins when you tick it under Models → Models in use.</p>`;
}
function bindBuiltinModel() {
  $('#builtin-chat')?.addEventListener('click', () => {
    newChat();
    const c = chatById(S.route.id);
    const st = S.stacks.find((s) => s.id === 'quicksilver');
    const b = S.installed.find((m) => m.id === 'starter-brain') || S.installed.find((m) => m.source === 'bundled' && m.kind === 'text' && !m.vision) || S.installed.find((m) => m.source === 'bundled' || m.catalogId === 'qwen3-4b');
    if (c) { c.target = st ? 'stack:quicksilver' : b ? `local:${b.id}` : ''; save(); render(); }
  });
}

async function reloadCatalog() {
  try { S.catalog = await qs.call('catalog:get'); } catch { return; }
  mergeRemoteRecipes();
  for (const r of typeof STACK_RECIPES !== 'undefined' ? STACK_RECIPES : []) r._resolved = null;
  S.est = null; await refreshEstimates().catch(() => {});
}

qs.onApp?.(async (d) => {
  if (d.kind !== 'catalog') return;
  await reloadCatalog();
  await checkForUpdates();
  if (['models', 'stacks'].includes(S.route.view) && $('#modal').hidden) render();
});

// "Venice AI · needs one more to rotate": the connected services free rotation can use.
function freeRotationLine() {
  const list = (S.providers || []).filter((p) => ['free', 'some'].includes(p.free) && (p.hasKey || p.noKey) && !p.media && (p.models || []).length);
  if (!list.length) return 'No free services connected';
  const names = list.map((p) => p.name.replace(/\s*\(.*\)$/, '')).join(', ');
  return list.length === 1 ? `${names} · connect one more for rotation` : `${list.length} connected: ${names} · on`;
}
// ---------- add-ons: what each addition does for your stack ----------
// Shown under the main models: memory (Mem0-style), local RAG and the rest, each with what it adds
// (accuracy, speed, privacy), whether it's on, and one button.
function addonsHTML() {
  const sem = S.kbSemantic;
  if (!sem) { qs.call('kb:semantic').then((r) => { S.kbSemantic = r; if (S.route.view === 'models') render(); }).catch(() => {}); }
  const mems = (S.data.memory || []).length;
  const bases = S.kbSummary?.bases || 0;
  const voiceOn = Boolean(S.voiceReady);
  const cloud = (S.providers || []).some((p) => p.hasKey || p.noKey);
  const A = [
    ['🧠', 'Memory', 'like Mem0', S.data.prefs.memory !== false ? `On · ${mems} thing${mems === 1 ? '' : 's'} remembered${sem?.on ? ' · found by meaning' : ''}` : 'Off',
      'Remembers facts about you across chats (your job, tools, how you like answers) and gives the stack only the ones that matter for each question. With Smarter search on, it finds them by meaning, the way Mem0 does, all on this PC.',
      'Accuracy ↑ on anything personal · no extra time', ['data-addon-memory', 'Manage memory']],
    ['📚', 'Your knowledge', 'local RAG', bases ? `${bases} knowledge base${bases === 1 ? '' : 's'}` : 'Not set up yet',
      'Retrieval-augmented generation on your own files: before answering, the stack looks up the best passages from your files, folders and websites and answers from them, citing the source. Everything stays on this PC.',
      'Accuracy ↑↑ on your own material · a second or two per question', ['data-addon-go="library"', 'Open Your knowledge']],
    ['🔎', 'Smarter search', 'Nomic Embed v1.5, 0.15 GB · built in', sem?.on ? 'On (comes with Quicksilver)' : 'Off',
      'A tiny embedding model that searches by meaning, not just words: "time off" finds "annual leave". It powers both Your knowledge and Memory, and comes built into Quicksilver.',
      'Finds the right passage and memory far more often · no download', sem?.on ? null : ['data-addon-semantic', 'Turn on']],
    ['🎯', 'Sharper search', 'BGE Reranker v2 M3, 0.44 GB', sem?.rerank ? 'On' : 'Off',
      'A small reranker reads your question together with each passage search found and puts the ones that really answer it first, so the model reads the right part of your files. Works with or without Smarter search.',
      'Accuracy ↑ on questions about your files · well under a second per question', sem?.rerank ? null : ['data-addon-rerank', 'Turn on']],
    ['💪', 'A stronger Closer', 'Qwen3.5 9B uncensored, 6.3 GB', S.installed.some((m) => m.catalogId === 'qwen3.5-9b-uncensored') ? 'Installed · leads hard questions' : (S.est?.hardware?.vramGB || 0) >= 8 ? 'Recommended for this PC' : 'Best with a graphics card (8 GB or more)',
      'Adds a bigger uncensored model to the Liquid Edition. It joins by itself as the Closer and leads on hard questions (81% on graduate-level science, vs 77% for the built-in Brain); it also sees photos. Nothing is removed: the Brain and Muse keep their jobs.',
      'Accuracy ↑ on hard questions · needs a graphics card to stay quick', S.installed.some((m) => m.catalogId === 'qwen3.5-9b-uncensored') ? null : ['data-addon-closer', 'Download']],
    ['🌐', 'Web search', 'free, no account', S.config?.offline ? 'Off (offline)' : 'Ready', 'For anything current (news, prices, today\'s facts) the stack searches the web first and answers with sources. Used automatically when a question needs it.', 'Up-to-date answers · a few seconds', null],
    ['✓', 'Double-check', 'a second opinion', S.data.prefs.factCheck ? 'On for every answer' : 'Off (on per chat)', 'A second model checks each claim in an answer and fixes clear mistakes. Worth it for health, money, legal and work answers.', 'Accuracy ↑ · roughly doubles the time', null],
    ['🎙', 'Voice', 'Whisper, runs here', voiceOn ? 'Ready' : 'Downloads when first used', 'Speak to the stack and hear it answer; your voice never leaves this PC.', 'Hands-free · no change to answers', null],
    ['🔌', 'Connectors', 'your apps', 'Gmail, Drive, Outlook, Spotify and 40 more', 'Lets the stack read and act on your apps (it asks before sending, creating or changing anything).', 'Answers from your real data', ['data-addon-go="integrations"', 'Open Connectors']],
    ['⚔️', 'Council', 'three views, one verdict', 'Pick Council in Effort', 'A Structurer, a Critic and a Pragmatist each look at a big question, then one answer is written from all three, with how much they agreed.', 'Accuracy ↑ on big decisions · 3–4× the time', null],
    ['🗳️', 'One-click fusions', 'vote, red team, plan, panel', `${(S.stacks || []).filter((x) => x.builtFor === 'power').length} set up`, 'Proven ways of making your own models work together: answer three times and keep the majority, hunt for mistakes before you see them, plan then solve, or an expert panel.', 'Accuracy ↑ (vote is best for maths) · 2–3× the time', ['data-addon-fusion', 'Open Fusion']],
    ['✨', 'Fix my prompt', 'one click', 'In the message bar', 'Turns a quick note into a clear, complete request before it\'s sent, using your model, so the stack knows exactly what you want.', 'Better answers first time · a few seconds', null],
    ['⚡', 'Speed helpers', 'speculative decoding', 'Used automatically when one is installed', 'A tiny model from the same family writes ahead and the main model checks its guesses, so bigger models (Qwen3 8B–32B, Llama) answer faster with exactly the same answers. Suggested on a model\'s card when it helps.', 'Up to about 2× faster on a graphics card · same answers', null],
    ['📁', 'Projects', 'shared background', 'In the menu', 'Instructions and files for a piece of work that every chat in the project knows, so you don\'t repeat yourself.', 'Answers that fit your work · no extra time', ['data-addon-go="projects"', 'Open Projects']],
    ['⚡', 'Skills', 'ready-made tasks', 'Type / in the message bar', 'One-click tasks with the right settings built in: research brief, music finder, SWOT, summaries, code review and dozens more.', 'Better-shaped answers for common jobs', ['data-addon-go="skills"', 'Open Skills']],
    ['🧩', 'MCP tool servers', 'the open standard', 'Add in Connectors', 'Hundreds of extra tools from the Model Context Protocol world: files, databases, browsers, design tools and more, used by the stack when a chat needs them.', 'New abilities · asks before changing anything', ['data-addon-go="integrations"', 'Add a tool server']],
    // (Counted the same way the engine picks them: any connected service with a free plan or a free allowance.)
    ['♻️', 'Free rotation', 'free cloud AIs', freeRotationLine(), 'Connect two or more free cloud AIs and, when one hits its daily limit, the next takes over automatically. A message pops up when it switches.', 'Keeps the cloud free · no waiting', ['data-goto-api', 'Connect a free AI']],
    ['🛡️', 'Private online', 'Proton VPN', typeof privacyMode === 'function' ? ({ offline: 'Fully private (offline)', vpn: 'On', online: 'Off' })[privacyMode()] : '', 'Web search and cloud AIs only through Proton VPN (a free plan is available), so sites and services can\'t see where you are.', 'Privacy ↑ · a little slower online', null],
    ['☁️', 'A cloud AI', 'optional', cloud ? 'Connected' : 'None', 'A big cloud model for the hardest questions, or as the lead of a custom AI. Everyday messages stay on this PC.', 'Accuracy ↑↑ on hard questions · needs internet', ['data-guide="apis"', 'Compare cloud AIs']],
  ];
  return `<div class="section"><h2>Add-ons for your stack</h2><span class="small muted">Not models: everything that makes a model or stack better. What each one adds, whether it's on, and where to find it.</span></div>
    <div class="cards addon-grid">${A.map(([ic, name, tag, status, what, effect, btn]) => `<div class="card addon"><div class="row"><span class="emoji-badge">${ic}</span><div class="grow"><b>${esc(name)}</b> <span class="small muted">${esc(tag)}</span><div class="small addon-status">${esc(status)}</div></div></div>
      <p class="small" style="margin:8px 0 6px">${esc(what)}</p><div class="small addon-effect">➕ ${esc(effect)}</div>
      ${btn ? `<div class="row" style="margin-top:8px"><button class="btn small" ${btn[0]}>${esc(btn[1])}</button></div>` : ''}</div>`).join('')}</div>`;
}
document.addEventListener('click', async (e) => {
  if (e.target.closest('[data-addon-memory]')) { openMemory(); return; }
  if (e.target.closest('[data-addon-fusion]')) { stacksTab = 'fusion'; go({ view: 'stacks' }); return; }
  const g = e.target.closest('[data-addon-go]');
  if (g) { go({ view: g.dataset.addonGo }); return; }
  if (e.target.closest('[data-addon-rerank]')) {
    try { const r = await call('kb:rerankOn'); if (r?.id) { S.downloads[r.id] = { ...r, name: 'BGE Reranker v2 M3' }; paintDownloads(); } S.kbSemantic = null; toast('Turning on sharper search: a small download (about 0.44 GB), then the best passages from your files come first.', 7000); } catch {}
    return;
  }
  if (e.target.closest('[data-addon-closer]')) {
    try { await download({ catalogId: 'qwen3.5-9b-uncensored' }, 'Qwen3.5 9B (uncensored)'); toast('Downloading Qwen3.5 9B (uncensored). When it\'s done it joins the Liquid Edition as its Closer.', 8000); } catch (err) { toast(err.message, 8000); }
    return;
  }
  if (e.target.closest('[data-addon-semantic]')) {
    try { const r = await call('kb:semanticOn'); if (r?.id) { S.downloads[r.id] = { ...r, name: 'Nomic Embed v1.5' }; paintDownloads(); } toast('Turning on smarter search: a small download, then your files and memories are found by meaning.'); } catch {}
  }
});
