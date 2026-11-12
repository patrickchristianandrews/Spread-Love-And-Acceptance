// API directory: every cloud service Quicksilver can use, in one list. By task, split into free,
// free to start and paid, saying what the free plan gives you and what it costs after, with a
// link to each. Built from the same two tables the rest of the app uses (the services that can
// be connected, and the rankings), so it never disagrees with them.
'use strict';

const DIR_TASKS = {
  chat: ['💬', 'Everyday chat'], reasoning: ['🧠', 'Hard reasoning & maths'], coding: ['💻', 'Coding'], writing: ['✍️', 'Writing'],
  research: ['🔎', 'Research with sources'], 'photos-in': ['👁️', 'Reading photos & screenshots'], uncensored: ['🔓', 'Uncensored'],
  photos: ['🖼️', 'Making pictures'], editing: ['🪄', 'Editing photos'], video: ['🎬', 'Video'], music: ['🎵', 'Music (full songs)'],
  voice: ['🎙️', 'Voices'], translation: ['🌍', 'Translation'],
};
const DIR_KINDS = { free: ['Free', 'b-mint'], some: ['Free to start, then paid', 'b-sky'], paid: ['Paid', 'b-lav'] };
// Where to find the services that are not connected with a key under Models → Connect an API.
const DIR_LINKS = {
  Pollinations: 'https://pollinations.ai', 'Kling AI': 'https://klingai.com', Suno: 'https://suno.com', 'Tavily search': 'https://tavily.com',
  'ElevenLabs voices': 'https://elevenlabs.io', 'DeepL (Translation connector)': 'https://www.deepl.com/pro-api', 'MyMemory (Translation connector)': 'https://mymemory.translated.net',
};
// What the connectable services without a ranking are for, besides everyday chat.
const DIR_EXTRA_USES = { xai: ['reasoning'], moonshot: ['coding'], minimax: ['coding'], qwen: ['coding'], ai21: ['writing'], inception: ['coding'] };
const dirState = { task: 'all' };

// Every service as { name, preset, uses, bestFor, kind, freeGets, after, link, priceUrl, where, quality }.
function apiDirectory(presets = {}) {
  const out = [];
  const ranked = new Set();
  for (const r of API_RANK) {
    const p = presets[r[0]] || null;
    if (p) ranked.add(r[0]);
    const kind = p?.free && DIR_KINDS[p.free] ? p.free : r[7] >= 7 ? 'free' : r[7] >= 3 ? 'some' : 'paid';
    const uses = [...new Set([...r[2], ...(p?.vision && r[2].includes('chat') ? ['photos-in'] : [])])];
    out.push({ name: r[1], preset: p ? r[0] : '', uses, bestFor: r[3], kind, freeGets: r[4], after: r[5], link: p?.keyUrl || DIR_LINKS[r[1]] || p?.priceUrl || '', priceUrl: p?.priceUrl || '', where: r[9], quality: r[6] });
  }
  for (const [k, p] of Object.entries(presets)) {
    if (ranked.has(k) || k === 'custom' || p.free === 'local' || !DIR_KINDS[p.free]) continue;
    const uses = [...new Set(['chat', ...(DIR_EXTRA_USES[k] || []), ...(p.vision ? ['photos-in'] : [])])];
    out.push({ name: p.name, preset: k, uses, bestFor: p.bestWhy || '', kind: p.free, freeGets: p.freeNote || '', after: p.noKey ? 'Free' : p.free === 'free' ? 'Paid plans for more' : 'See its price page', link: p.keyUrl || p.priceUrl || '', priceUrl: p.priceUrl || '', where: 'app', quality: null });
  }
  return out;
}
// The services that run on your own PC or server (free, no cloud): listed last, for completeness.
const apiDirectoryLocal = (presets = {}) => Object.entries(presets).filter(([, p]) => p.free === 'local').map(([k, p]) => ({ name: p.name, preset: k, freeGets: p.freeNote || '' }));
// One task's services: free first, then free to start, then paid; the best of each kind first.
function apiDirectoryFor(list, task) {
  const order = { free: 0, some: 1, paid: 2 };
  return list.filter((x) => x.uses.includes(task)).sort((a, b) => order[a.kind] - order[b.kind] || (b.quality ?? 0) - (a.quality ?? 0) || a.name.localeCompare(b.name));
}

function apiDirectoryHTML(presets) {
  if (!presets) return '<section class="card og-sec" id="api-dir"><h3>📒 API directory</h3><p class="small muted">Loading the list…</p></section>';
  const list = apiDirectory(presets);
  const connected = (preset) => preset && (S.providers || []).some((p) => p.preset === preset && (p.hasKey || p.noKey));
  const tasks = Object.keys(DIR_TASKS).filter((t) => dirState.task === 'all' || dirState.task === t);
  const row = (x) => `<div class="ad-row"><span class="grow"><span>${x.link ? `<a href="${esc(x.link)}" title="Opens ${esc(x.link)}"><b>${esc(x.name)}</b> ↗</a>` : `<b>${esc(x.name)}</b>`} ${connected(x.preset) ? '<span class="badge b-mint">✓ connected</span>' : ''}${x.where === 'site' ? '<span class="badge b-lav" title="Used on the service\'s own site; Quicksilver writes the prompts for it">on their site</span>' : ''}${x.quality != null ? ` <span class="small muted" title="Output quality out of 10">${x.quality}/10</span>` : ''}</span>
      ${x.bestFor ? `<span class="small">${esc(x.bestFor)}</span>` : ''}
      <span class="small"><b>${x.kind === 'paid' ? 'Free:' : 'Free gets you:'}</b> ${esc(x.freeGets || 'nothing')}</span>
      <span class="small muted"><b>After that:</b> ${esc(x.after)}${x.priceUrl ? ` · <a href="${esc(x.priceUrl)}" title="Opens ${esc(x.priceUrl)}">current prices ↗</a>` : ''}</span></span>
      ${x.preset && x.where === 'app' && !connected(x.preset) ? `<button class="btn small" data-api-connect="${esc(x.preset)}" title="Opens the connect box: paste the key and it is ready">Connect</button>` : ''}</div>`;
  const group = (t) => {
    const mine = apiDirectoryFor(list, t);
    if (!mine.length) return '';
    return `<div class="ad-task"><h4>${DIR_TASKS[t][0]} ${esc(DIR_TASKS[t][1])} <span class="small muted">${mine.filter((x) => x.kind === 'free').length} free · ${mine.filter((x) => x.kind === 'some').length} free to start · ${mine.filter((x) => x.kind === 'paid').length} paid</span></h4>
      ${Object.entries(DIR_KINDS).map(([k, [label, cls]]) => { const rows = mine.filter((x) => x.kind === k); return rows.length ? `<div class="ad-kind"><span class="badge ${cls}">${label}</span></div>${rows.map(row).join('')}` : ''; }).join('')}</div>`;
  };
  const local = apiDirectoryLocal(presets);
  return `<section class="card og-sec" id="api-dir"><h3>📒 API directory: every service, by task</h3>
    <p class="small" style="margin:0 0 8px">All ${list.length} cloud services Quicksilver can use. Pick a task: free ones first, then free to start, then paid, each with what the free plan gives you, what it costs after, and a link to get its key.</p>
    <div class="row" style="gap:4px;flex-wrap:wrap;margin-bottom:10px"><button class="chip-tog ${dirState.task === 'all' ? 'on' : ''}" data-dir-task="all">Everything</button>${Object.entries(DIR_TASKS).map(([k, [ic, l]]) => `<button class="chip-tog ${dirState.task === k ? 'on' : ''}" data-dir-task="${k}">${ic} ${esc(l)}</button>`).join('')}</div>
    ${tasks.map(group).join('')}
    ${dirState.task === 'all' && local.length ? `<div class="ad-task"><h4>💻 On your own PC or server <span class="small muted">free, nothing leaves it</span></h4>${local.map((x) => `<div class="ad-row"><span class="grow"><b>${esc(x.name)}</b><span class="small muted">${esc(x.freeGets)}</span></span>${connected(x.preset) ? '<span class="badge b-mint">✓ connected</span>' : `<button class="btn small" data-api-connect="${esc(x.preset)}">Connect</button>`}</div>`).join('')}</div>` : ''}
    <p class="small muted" style="margin:8px 0 0">Free allowances and prices as of November 2026. They change often: each "current prices" link shows today's. A service appears under every task it is good at.</p></section>`;
}
function bindApiDirectory(root = document) {
  const box = root.querySelector('#api-dir');
  if (!box) return;
  if (!presetsCache) { loadPresets().then(() => { const el = root.querySelector('#api-dir'); if (el) { el.outerHTML = apiDirectoryHTML(presetsCache); bindApiDirectory(root); } }); return; }
  box.querySelectorAll('[data-dir-task]').forEach((b) => b.addEventListener('click', () => { dirState.task = b.dataset.dirTask; box.outerHTML = apiDirectoryHTML(presetsCache); bindApiDirectory(root); }));
  box.querySelectorAll('[data-api-connect]').forEach((b) => b.addEventListener('click', () => { closeModal(); editProvider({ preset: b.dataset.apiConnect }, presetsCache); }));
}
// The directory in a box, opened from anywhere ("📒 All APIs"), on a task if one is given.
function apiDirectoryModal(task) {
  dirState.task = task && DIR_TASKS[task] ? task : 'all';
  const b = openModal(`${apiDirectoryHTML(presetsCache)}<div class="modal-actions"><button class="btn" data-close>Close</button></div>`, { wide: true });
  bindApiDirectory(b);
}
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-api-dir]');
  if (!b) return;
  e.preventDefault();
  apiDirectoryModal(b.dataset.apiDir);
});
