// Better models and stacks as they come out. The picks (featured models, new models, which newer
// model replaces an older one, the models stacks are built from) refresh online once a day. When a
// better model for something you use runs well on this PC, Quicksilver says so and, unless you
// turned it off in Settings, installs it in the background, then swaps it into your stacks, chats,
// assistants and projects and offers to remove the old one. Nothing is downloaded while offline.
'use strict';

S.modelUpgrades = null; // [{ oldId, oldName, newCatalogId, newName, why, rating, speed, sizeGB }]
const AUTO_CAP_GB = 30; // at most this much downloaded automatically per check

const upgradePrefs = () => {
  const p = S.data.prefs;
  p.pendingUpgrades ||= {}; // newCatalogId → old installed model id
  p.upgradeSkipped ||= [];   // "old→new" pairs you said no to
  return p;
};
const isFeatured = (id) => Object.values(S.catalog?.picks?.featured || {}).some((l) => l.includes(id));
const autoUpdates = () => S.data.prefs.autoUpgrade !== false;

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
    if (add.length) out.push({ recipe: r.id, name: st.name, emoji: st.emoji || r.icon, models: add.map((p) => ({ id: p.id, name: catModel(p.id)?.name || p.id, from: catModel(p.from)?.name || p.from })) });
  }
  return out.filter((u) => !upgradePrefs().upgradeSkipped.includes(`stack:${u.recipe}:${u.models.map((m) => m.id).join(',')}`));
}

async function loadModelUpgrades() {
  try { S.modelUpgrades = (await qs.call('models:upgrades')).filter((u) => !upgradePrefs().upgradeSkipped.includes(`${u.oldCatalogId}>${u.newCatalogId}`)); } catch { S.modelUpgrades = []; }
  paintUpdateBadge();
  return S.modelUpgrades;
}

function paintUpdateBadge() {
  const n = (S.modelUpgrades || []).filter((u) => !S.downloads[u.newCatalogId]).length + stackUpdates().length;
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
  await setUpRecipe(u.recipe); // downloads the stronger models and rebuilds the stack around them
}

// Checks for better models and stacks; installs them automatically when that's on.
async function checkForUpdates({ auto = true } = {}) {
  if (!S.est) await refreshEstimates().catch(() => {});
  const ups = await loadModelUpgrades();
  const stacks = stackUpdates();
  if (!auto || !autoUpdates() || S.config?.offline) return { ups, stacks };
  let budget = AUTO_CAP_GB;
  const fresh = [];
  for (const u of ups) {
    if (!['great', 'good'].includes(u.rating) || S.downloads[u.newCatalogId] || u.sizeGB > budget) continue;
    budget -= u.sizeGB; startUpgrade(u, true); fresh.push(u.newName);
  }
  for (const s of stacks) {
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
  if (old) {
    toastAction(`✨ Upgraded to ${model.name}: your stacks and chats use it now. Remove ${old.name} to free ${gb(old.size)}?`, 'Remove old', async () => {
      await qs.call('models:remove', old.id).catch(() => {}); await refreshModels(); render(); toast(`${old.name} removed.`);
    }, 12000);
  } else toast(`✨ Upgraded to ${model.name}.`);
  return true;
}

function modelUpdatesHTML() {
  const ups = S.modelUpgrades || [];
  const stacks = stackUpdates();
  const picks = S.catalog?.picks || {};
  const when = picks.fetchedAt ? `checked ${new Date(picks.fetchedAt).toLocaleDateString()}` : 'built-in picks';
  if (!ups.length && !stacks.length) {
    return `<div class="notice ok up-none" id="model-updates"><b>✓ Your models are the best picks for this PC.</b> <span class="small">Quicksilver checks online every day for newer, better models and stacks (${esc(when)}).</span> <button class="btn small ghost" id="up-check">Check now</button></div>`;
  }
  const row = (u) => `<div class="up-row"><div class="grow"><b>${esc(u.oldName)}</b> → <b>${esc(u.newName)}</b><div class="small muted">${esc(u.why)} · ${esc(u.speed)} on this PC</div></div>
    ${S.downloads[u.newCatalogId] ? '<span class="badge b-sky">Installing…</span>' : `<button class="btn small primary" data-up-get="${esc(u.newCatalogId)}">Upgrade</button><button class="btn small ghost" data-up-skip="${esc(`${u.oldCatalogId}>${u.newCatalogId}`)}" title="Don't suggest this one again">Not now</button>`}</div>`;
  const srow = (s) => `<div class="up-row"><div class="grow">${esc(s.emoji || '🧩')} <b>${esc(s.name)}</b><div class="small muted">Stronger now: ${s.models.map((m) => `${esc(m.from)} → <b>${esc(m.name)}</b>`).join(', ')}</div></div>
    ${s.models.some((m) => S.downloads[m.id]) ? '<span class="badge b-sky">Installing…</span>' : `<button class="btn small primary" data-up-stack="${esc(s.recipe)}">Update stack</button><button class="btn small ghost" data-up-skip="${esc(`stack:${s.recipe}:${s.models.map((m) => m.id).join(',')}`)}">Not now</button>`}</div>`;
  return `<div class="card up-card" id="model-updates"><div class="row"><h3 class="grow" style="margin:0">✨ Better models available</h3><span class="small muted">${esc(when)}</span></div>
    <p class="small muted" style="margin:4px 0 10px">${autoUpdates() ? 'These install by themselves in the background' : 'Automatic installs are off in Settings'}; when one is ready, your stacks, chats and assistants switch to it and you can remove the old one.</p>
    ${ups.map(row).join('')}${stacks.map(srow).join('')}</div>`;
}
function bindModelUpdates() {
  $$('[data-up-get]').forEach((b) => b.addEventListener('click', () => { const u = S.modelUpgrades.find((x) => x.newCatalogId === b.dataset.upGet); if (u) { startUpgrade(u); toast(`Installing ${u.newName}. Everything switches over when it's ready.`); render(); } }));
  $$('[data-up-stack]').forEach((b) => b.addEventListener('click', async () => { b.disabled = true; const s = stackUpdates().find((x) => x.recipe === b.dataset.upStack); if (s) await startStackUpdate(s); }));
  $$('[data-up-skip]').forEach((b) => b.addEventListener('click', () => { upgradePrefs().upgradeSkipped.push(b.dataset.upSkip); save(); S.modelUpgrades = (S.modelUpgrades || []).filter((u) => `${u.oldCatalogId}>${u.newCatalogId}` !== b.dataset.upSkip); paintUpdateBadge(); render(); }));
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
  const brain = S.catalog.text.find((m) => m.id === 'qwen3-4b');
  const eyes = S.catalog.text.find((m) => m.id === 'qwen3-vl-2b');
  if (!brain) return '';
  const est = S.est?.text?.[brain.id];
  const have = S.installed.some((m) => m.source === 'bundled' || m.catalogId === brain.id);
  const can = [
    ['💬', 'Chats naturally', 'quick, friendly answers in a second or two'],
    ['🧠', 'Thinks things through', 'steps up for hard questions, and checks its own numbers'],
    ['✍️', 'Writes', 'emails, essays, summaries, rewrites in any tone'],
    ['🧮', 'Gets maths right', 'sums are worked out exactly, not guessed'],
    ['💻', 'Helps with code', 'explains, writes and fixes everyday code'],
    ['👁', 'Sees photos', `reads screenshots, receipts and pictures${eyes ? ` (${eyes.name})` : ''}`],
    ['📄', 'Reads your files', 'answers from your PDFs, Word and Excel files'],
    ['🌐', 'Looks things up', 'searches the web for fresh facts when you are online'],
    ['🎙', 'Talks', 'speak to it and hear it answer'],
  ];
  return `<div class="card builtin-card" id="builtin-model">
    <div class="row"><span class="emoji-badge">💧</span><div class="grow"><h3 style="margin:0">Built in: Quicksilver</h3>
      <div class="small muted">${esc(brain.name)}${eyes ? ` + ${esc(eyes.name)} for eyes` : ''} · ${(brain.sizeGB + (eyes ? eyes.sizeGB + (eyes.mmprojGB || 0) : 0)).toFixed(1)} GB · comes with the app, works offline</div></div>
      ${est ? `<span class="badge rate-${est.rating}">${esc(est.label)}</span>` : ''}</div>
    <p style="margin:10px 0 6px"><b>Fast answers you can trust.</b> Chosen as the quickest model that's still accurate: it answers almost instantly on most PCs and double-checks facts and figures, so you can rely on it for everyday work.</p>
    <div class="builtin-can">${can.map(([i, t, d]) => `<div><span>${i}</span><b>${esc(t)}</b><span class="small muted">${esc(d)}</span></div>`).join('')}</div>
    <div class="row" style="margin-top:10px">${have ? '<button class="btn small primary" id="builtin-chat">Start a chat</button>' : (S.downloads[brain.id] ? downloadBox(brain.id) : `<button class="btn small primary" data-get="${brain.id}">Download it (${brain.sizeGB} GB)</button>`)}<span class="grow"></span><span class="small muted">Want more power? Better models below run alongside it.</span></div>
  </div>`;
}
function bindBuiltinModel() {
  $('#builtin-chat')?.addEventListener('click', () => {
    newChat();
    const c = chatById(S.route.id);
    const st = S.stacks.find((s) => s.id === 'quicksilver');
    const b = S.installed.find((m) => m.source === 'bundled' && m.kind === 'text' && !m.vision) || S.installed.find((m) => m.source === 'bundled' || m.catalogId === 'qwen3-4b');
    if (c) { c.target = st ? 'stack:quicksilver' : b ? `local:${b.id}` : ''; save(); render(); }
  });
}

async function reloadCatalog() {
  try { S.catalog = await qs.call('catalog:get'); } catch { return; }
  for (const r of typeof STACK_RECIPES !== 'undefined' ? STACK_RECIPES : []) r._resolved = null;
  S.est = null; await refreshEstimates().catch(() => {});
}

qs.onApp?.(async (d) => {
  if (d.kind !== 'catalog') return;
  await reloadCatalog();
  await checkForUpdates();
  if (['models', 'stacks'].includes(S.route.view) && $('#modal').hidden) render();
});
