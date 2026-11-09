// User-submitted stacks: publish your custom AI for everyone, and add ones other people shared.
// Publishing opens a ready-filled GitHub issue (a free GitHub account is needed); a maintainer
// checks it, and once approved it's listed here for everyone within a day. Only the models and
// how they work together are shared: never keys, chats or files.
'use strict';

const COMMUNITY_REPO = 'patrickchristianandrews/Spread-Love-And-Acceptance';
let communityData = null;
async function loadCommunity(force) {
  try { communityData = await qs.call(force ? 'community:refresh' : 'community:list'); } catch { communityData = { stacks: [] }; }
  if (!force && !communityData.fetchedAt) qs.call('community:refresh').then((d) => { communityData = d; if (S.route.view === 'stacks' && stacksTab === 'community') render(); }).catch(() => {});
  return communityData;
}

// ---------- publishing your custom AI ----------
// A fusion in a form any PC can rebuild: local models by catalog id, cloud AIs by service + model.
function portableFusion(s) {
  const targets = [...new Set([...(s.members.drafters || []), s.members.judge].filter(Boolean))];
  const problems = [];
  const parts = targets.map((t) => {
    if (t.startsWith('local:')) {
      const m = S.installed.find((x) => `local:${x.id}` === t);
      const c = m && S.catalog.text.find((x) => x.id === m.catalogId);
      if (!c) { problems.push(`${m?.name || t} isn't from Quicksilver's catalog, so others couldn't download it`); return null; }
      return { kind: 'local', model: c.id };
    }
    if (t.startsWith('api:')) {
      const [, pid, ...rest] = t.split(':');
      const p = S.providers.find((x) => x.id === pid);
      if (!p?.preset || p.preset === 'custom') { problems.push(`${targetLabel(t)} uses a custom cloud connection`); return null; }
      return { kind: 'cloud', preset: p.preset, model: rest.join(':') };
    }
    problems.push(`${targetLabel(t)} can't be shared`);
    return null;
  });
  const lead = targets.indexOf(s.members.judge);
  return { parts, problems, lead: lead < 0 ? 0 : lead };
}
const partLabel = (p) => (p.kind === 'local' ? catModel(p.model)?.name || p.model : `${p.model} (${p.preset})`);

function publishModal(s) {
  const pf = portableFusion(s);
  if (pf.problems.length) { toast(`This custom AI can't be published: ${pf.problems.join('; ')}.`, 9000); return; }
  const mode = INFUSE_MODES[s.members.mode] || INFUSE_MODES.blend;
  const b = openModal(`<h2>📤 Publish your custom AI</h2>
    <p class="help" style="margin-top:0">Share it with everyone in <b>User-submitted stacks</b>. It's checked before it's listed, usually within a few days.</p>
    <div class="stack-v">
      <div class="field"><label for="pub-name">Name</label><input id="pub-name" maxlength="60" value="${esc(s.name)}"></div>
      <div class="field"><label for="pub-desc">What is it good at?</label><textarea id="pub-desc" rows="3" maxlength="400" placeholder="e.g. Tough coding questions: Qwen writes, Claude hunts for bugs, and the answer comes back checked."></textarea></div>
      <div class="field"><label for="pub-by">Your name as it should appear (optional)</label><input id="pub-by" maxlength="40" placeholder="Leave empty to use your GitHub name"></div>
      <div class="pub-alt"><b>Share it directly, no account needed</b><div class="small muted">A share code or a small file you can send to anyone (message, email, forum). They press ⬇ Import on the Fusion tab. Nothing is checked or listed for everyone.</div>
        <div class="row" style="gap:6px;margin-top:6px"><button class="btn small" id="pub-code">📋 Copy share code</button><button class="btn small" id="pub-file">💾 Save as a file</button></div></div>
      <div class="card" style="padding:10px 12px"><div class="small"><b>Exactly what's shared:</b> ${pf.parts.map((p, i) => `${esc(partLabel(p))}${i === pf.lead ? ' (lead)' : ''}`).join(' + ')} · ${mode.icon} ${esc(mode.name)}</div>
        <div class="small muted">Never shared: your API keys, chats, files or anything else on this PC.</div></div>
    </div>
    <div class="modal-actions"><span class="small muted grow">For everyone: listed under User-submitted after a quick check. Needs a free GitHub account.</span><button class="btn" data-close>Cancel</button><button class="btn primary" id="pub-go">Publish for everyone</button></div>`);
  const entryNow = () => ({ v: 1, name: b.querySelector('#pub-name').value.trim() || s.name, emoji: s.emoji || '⚗️', description: b.querySelector('#pub-desc').value.trim(), author: b.querySelector('#pub-by').value.trim(), mode: s.members.mode || 'blend', parts: pf.parts, lead: pf.lead });
  b.querySelector('#pub-code').addEventListener('click', () => { navigator.clipboard?.writeText(shareCode(entryNow())); toast('Share code copied. Paste it anywhere; whoever gets it presses ⬇ Import on the Fusion tab.', 7000); });
  b.querySelector('#pub-file').addEventListener('click', () => {
    const e = entryNow();
    const a = document.createElement('a');
    a.href = URL.createObjectURL(new Blob([JSON.stringify({ quicksilverCustomAI: e }, null, 1)], { type: 'application/json' }));
    a.download = `${e.name.replace(/[^\w .-]/g, '').trim() || 'custom-ai'}.quicksilver.json`;
    document.body.appendChild(a); a.click(); a.remove();
    toast('Saved. Send the file to anyone; they press ⬇ Import on the Fusion tab.', 7000);
  });
  b.querySelector('#pub-go').addEventListener('click', () => {
    const name = b.querySelector('#pub-name').value.trim();
    const description = b.querySelector('#pub-desc').value.trim();
    if (name.length < 3) { toast('Give it a name.'); return; }
    if (description.length < 20) { toast('Say in a sentence or two what it\'s good at.'); return; }
    if (S.config?.offline) { toast('Go online to publish it.'); return; }
    const entry = { name, emoji: s.emoji || '⚗️', description, author: b.querySelector('#pub-by').value.trim(), mode: s.members.mode || 'blend', parts: pf.parts, lead: pf.lead };
    const body = `${description}\n\nMade with Quicksilver. A maintainer adds the **approved** label to list it for everyone.\n\n\`\`\`json\n${JSON.stringify(entry, null, 1)}\n\`\`\``;
    qs.call('shell:open', `https://github.com/${COMMUNITY_REPO}/issues/new?${new URLSearchParams({ title: `[User-submitted stack] ${name}`, body, labels: 'stack-submission' })}`);
    closeModal();
    toast('Opening GitHub with your custom AI filled in. Press "Create" there to submit it. Thank you!', 8000);
  });
}

// ---------- the User-submitted tab ----------
function communityPart(p) {
  if (p.kind === 'local') {
    const have = S.installed.find((x) => x.catalogId === p.model || x.id === p.model);
    const est = S.est?.text?.[p.model];
    if (have) return { ok: true, target: `local:${have.id}`, icon: '✓', note: 'on this PC' };
    if (est?.rating === 'wont') return { blocked: true, icon: '✕', note: 'too big for this PC' };
    return { download: p.model, target: `local:${p.model}`, icon: '⬇', note: `${catModel(p.model)?.sizeGB || '?'} GB download` };
  }
  const prov = S.providers.find((x) => x.preset === p.preset && (x.hasKey || x.noKey));
  if (prov) return { ok: true, target: `api:${prov.id}:${p.model}`, icon: '☁', note: prov.name };
  return { connect: p.preset, icon: '☁', note: `connect ${p.preset} first` };
}
function communityCard(e) {
  const parts = e.parts.map((p) => ({ p, s: communityPart(p) }));
  const added = S.stacks.some((s) => s.id === `us-${e.id}`);
  const mode = INFUSE_MODES[e.mode] || INFUSE_MODES.blend;
  const blocked = parts.some((x) => x.s.blocked);
  const needConnect = parts.find((x) => x.s.connect);
  const dl = parts.filter((x) => x.s.download);
  return `<div class="card us-card"><div class="row"><span class="emoji-badge">${esc(e.emoji)}</span><div class="grow"><h3 style="margin:0">${esc(e.name)}</h3><div class="small muted">${e.author ? `by ${esc(e.author)}` : 'User-submitted'}${e.added ? ` · ${esc(e.added)}` : ''}</div></div><span class="badge b-lav">${mode.icon} ${esc(mode.name)}</span></div>
    <p class="small" style="margin:8px 0">${esc(e.description)}</p>
    <div class="stack-v" style="gap:4px;margin-bottom:8px">${parts.map(({ p, s }, i) => `<div class="small row"><span>${s.icon}</span><b>${esc(partLabel(p))}</b>${i === e.lead ? ' <span class="badge b-mint">lead</span>' : ''}<span class="muted">${esc(s.note)}</span></div>`).join('')}</div>
    ${stackScoresHTML(e.parts.filter((p) => p.kind === 'local').map((p) => p.model))}
    <div class="row">${added ? `<span class="badge b-mint">✓ Added</span><button class="btn small" data-us-chat="us-${esc(e.id)}">Chat</button>`
      : blocked ? '<span class="small muted">One of its models is too big for this PC.</span>'
      : needConnect ? `<button class="btn small" data-us-connect="${esc(needConnect.p.preset)}">Connect ${esc(needConnect.p.preset)}</button>`
      : `<button class="btn small primary" data-us-add="${esc(e.id)}">${dl.length ? `Download & add (${dl.reduce((t, x) => t + (catModel(x.p.model)?.sizeGB || 0), 0).toFixed(1)} GB)` : 'Add it'}</button>`}
      <span class="grow"></span><a href="#" class="small muted" data-us-report="${esc(e.id)}">Report</a></div></div>`;
}
function communityTabHTML() {
  if (!communityData) { loadCommunity().then(() => S.route.view === 'stacks' && stacksTab === 'community' && render()); return '<div class="empty">Loading…</div>'; }
  const list = communityData.stacks || [];
  return `<p class="lede"><b>Custom AIs other people built and shared.</b> Each one is checked before it's listed. Add one and it works like your own custom AI; Quicksilver downloads any models it needs. Want yours here? Build it on the <a href="#" data-sf-tab="fusion">⚗️ Fusion</a> tab and press 📤 Publish.</p>
    ${list.length ? `<div class="cards">${list.map(communityCard).join('')}</div>` : '<div class="empty">No user-submitted stacks yet. Be the first: build a custom AI on the ⚗️ Fusion tab and press 📤 Publish.</div>'}
    <p class="small muted" style="margin-top:12px">${communityData.fetchedAt ? `Updated ${new Date(communityData.fetchedAt).toLocaleDateString()}.` : ''} <a href="#" id="us-refresh">Check for new ones</a></p>`;
}
async function addCommunity(e) {
  const parts = e.parts.map((p) => communityPart(p));
  for (const [i, s] of parts.entries()) if (s.download) await download({ catalogId: s.download }, catModel(e.parts[i].model)?.name);
  const targets = parts.map((s) => s.target);
  await call('stacks:save', { id: `us-${e.id}`, name: e.name, emoji: e.emoji, infused: true, community: e.id, members: { drafters: targets, judge: targets[e.lead] || targets[0], mode: e.mode } });
  await refreshModels();
  toast(parts.some((s) => s.download) ? `${e.name} is added; its models are downloading. Find it under ⚗️ Fusions in the model menu.` : `${e.name} is added. Find it under ⚗️ Fusions in the model menu.`, 7000);
  render();
}
function bindCommunity() {
  $$('[data-us-add]').forEach((b) => b.addEventListener('click', async () => { b.disabled = true; try { await addCommunity(communityData.stacks.find((x) => x.id === b.dataset.usAdd)); } catch (err) { b.disabled = false; toast(err.message); } }));
  $$('[data-us-connect]').forEach((b) => b.addEventListener('click', async () => editProvider({ preset: b.dataset.usConnect }, await qs.call('providers:presets'))));
  $$('[data-us-report]').forEach((b) => b.addEventListener('click', (ev) => {
    ev.preventDefault();
    const e = communityData.stacks.find((x) => x.id === b.dataset.usReport);
    qs.call('shell:open', `https://github.com/${COMMUNITY_REPO}/issues/new?${new URLSearchParams({ title: `[Report] User-submitted stack: ${e?.name || b.dataset.usReport}`, body: `Stack id: ${b.dataset.usReport}\n\nWhat's wrong with it?\n`, labels: 'stack-report' })}`);
  }));
  $$('[data-us-chat]').forEach((x) => x.addEventListener('click', () => { newChat(); const c = chatById(S.route.id); c.target = `stack:${x.dataset.usChat}`; save(); render(); }));
  $('#us-refresh')?.addEventListener('click', async (ev) => { ev.preventDefault(); await loadCommunity(true); render(); toast('Checked for new user-submitted stacks.'); });
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-publish]');
  if (b) publishModal(S.stacks.find((s) => s.id === b.dataset.publish));
});

// ---------- sharing directly: a share code or a file, no account ----------
const b64u = (str) => btoa(String.fromCharCode(...new TextEncoder().encode(str))).replace(/\+/g, '-').replace(/\//g, '_').replace(/=+$/, '');
const unb64u = (str) => new TextDecoder().decode(Uint8Array.from(atob(str.replace(/-/g, '+').replace(/_/g, '/')), (c) => c.charCodeAt(0)));
function shareCode(e) { return `QS1-${b64u(JSON.stringify(e))}`; }
// Reads a share code or a saved file's text; checks it the same way published ones are checked.
function readShared(text) {
  const t = String(text || '').trim();
  let raw;
  const code = t.match(/QS1-([A-Za-z0-9_-]+)/);
  if (code) raw = JSON.parse(unb64u(code[1]));
  else { const j = JSON.parse(t); raw = j.quicksilverCustomAI || j; }
  const name = String(raw?.name || '').slice(0, 60).trim();
  const MODES = ['blend', 'debate', 'consensus', 'vote', 'redteam', 'plan', 'panel'];
  const presets = new Set(Object.keys(S.providerPresets || {}));
  const parts = (Array.isArray(raw?.parts) ? raw.parts : []).slice(0, 4).map((p) => {
    if (p?.kind === 'local' && S.catalog.text.some((m) => m.id === p.model)) return { kind: 'local', model: p.model };
    if (p?.kind === 'cloud' && typeof p.preset === 'string' && (!presets.size || presets.has(p.preset)) && typeof p.model === 'string') return { kind: 'cloud', preset: p.preset, model: p.model.slice(0, 80) };
    throw new Error('It uses a model Quicksilver doesn\'t know.');
  });
  if (!name || parts.length < 2) throw new Error('That isn\'t a complete custom AI.');
  const id = `shared-${name.toLowerCase().replace(/[^a-z0-9]+/g, '-').replace(/^-|-$/g, '').slice(0, 30)}-${Date.now().toString(36).slice(-4)}`;
  return { id, name, emoji: String(raw.emoji || '⚗️').slice(0, 4), description: String(raw.description || '').slice(0, 400) || 'Shared with you directly.', author: String(raw.author || '').slice(0, 40), mode: MODES.includes(raw.mode) ? raw.mode : 'blend', parts, lead: Number.isInteger(raw.lead) && raw.lead < parts.length ? raw.lead : 0 };
}
async function importModal() {
  try { S.providerPresets ||= await qs.call('providers:presets'); } catch {}
  const b = openModal(`<h2>⬇ Import a custom AI</h2>
    <p class="help" style="margin-top:0">Paste a share code someone sent you, or open the file they saved. You'll see what it uses before anything is added.</p>
    <div class="field"><label for="imp-code">Share code</label><textarea id="imp-code" rows="3" placeholder="QS1-…"></textarea></div>
    <div class="row" style="gap:8px"><button class="btn small" id="imp-file-btn">📂 Open a file…</button><input type="file" id="imp-file" accept=".json" hidden></div>
    <div id="imp-preview" style="margin-top:10px"></div>
    <div class="modal-actions"><button class="btn" data-close>Close</button><button class="btn primary" id="imp-read">Check it</button></div>`);
  const show = (text) => {
    const el = b.querySelector('#imp-preview');
    try {
      const e = readShared(text);
      communityData ||= { stacks: [] };
      communityData.stacks = [e, ...communityData.stacks.filter((x) => x.id !== e.id)];
      el.innerHTML = communityCard(e);
      el.querySelector('[data-us-add]')?.addEventListener('click', async (ev) => { ev.target.disabled = true; try { await addCommunity(e); closeModal(); stacksTab = 'fusion'; render(); } catch (err) { ev.target.disabled = false; toast(err.message); } });
      el.querySelector('[data-us-connect]')?.addEventListener('click', async () => editProvider({ preset: e.parts.find((p) => p.kind === 'cloud' && !S.providers.some((x) => x.preset === p.preset))?.preset }, S.providerPresets));
    } catch (err) { el.innerHTML = `<div class="notice">Couldn't read that: ${esc(err.message)}</div>`; }
  };
  b.querySelector('#imp-read').addEventListener('click', () => show(b.querySelector('#imp-code').value));
  b.querySelector('#imp-file-btn').addEventListener('click', () => b.querySelector('#imp-file').click());
  b.querySelector('#imp-file').addEventListener('change', async (ev) => { const f = ev.target.files?.[0]; if (f) show(await f.text()); });
}
document.addEventListener('click', (e) => { if (e.target.closest('[data-import-ai]')) importModal(); });
