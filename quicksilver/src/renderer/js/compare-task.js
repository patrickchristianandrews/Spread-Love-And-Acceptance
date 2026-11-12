// Compare models by task: pick what you want to do (one task or several), and every model that's
// good at it is listed with its skill for those tasks, its accuracy and its speed on this PC.
// The blind test (two anonymous answers, you vote) is the second tab.
'use strict';

const CMP_TASKS = [
  ['general', '💬', 'Everyday chat'],
  ['writing', '✍️', 'Writing'],
  ['coding', '💻', 'Coding'],
  ['reasoning', '🧠', 'Reasoning & maths'],
  ['research', '🔬', 'Research & documents'],
  ['vision', '👁', 'Photos & screenshots'],
  ['open', '🔓', 'Uncensored & creative'],
  ['fast', '⚡', 'Fastest answers'],
];
let cmpTab = 'task';
let cmpJobs = ['general'];
let cmpRows = null;
let cmpKey = '';
let cmpOnlyFits = true;
let cmpOnlyMine = false;

const SKILL_WORD = (v) => (v >= 9 ? 'Expert' : v >= 8 ? 'Advanced' : v >= 7 ? 'Strong' : v >= 6 ? 'Good' : 'Basic');
const ACC_WORD = (v) => (v >= 9 ? 'Excellent' : v >= 8 ? 'Very high' : v >= 7 ? 'High' : v >= 6 ? 'Good' : 'Fair');
const dots10 = (v) => `<span class="cmp-dots" aria-label="${v} out of 10">${'●'.repeat(Math.max(1, Math.round(v / 2)))}${'○'.repeat(5 - Math.max(1, Math.round(v / 2)))}</span>`;

async function loadCmp() {
  const key = cmpJobs.join(',');
  if (cmpRows && cmpKey === key) return;
  cmpKey = key;
  try { cmpRows = await qs.call('compare:byTask', cmpJobs); } catch { cmpRows = []; }
  if (S.route.view === 'arena' && cmpTab === 'task') render();
}

function compareTaskHTML() {
  if (!cmpRows || cmpKey !== cmpJobs.join(',')) { loadCmp(); }
  const rows = (cmpRows || []).filter((r) => r.skill >= 6 && (!cmpJobs.includes('vision') || r.vision) && (!cmpJobs.includes('open') || r.open)
    && (!cmpOnlyFits || ['great', 'good', 'ok'].includes(r.speed.rating)) && (!cmpOnlyMine || r.installed));
  const taskNames = cmpJobs.map((j) => CMP_TASKS.find((t) => t[0] === j)?.[2]).join(' + ');
  return `<p class="lede">Pick what you want to do (one or several). Every model that's good at it is listed, best first, with its <b>skill</b> for those tasks, its <b>accuracy</b>, and its <b>speed on this PC</b>.</p>
    <div class="cmp-tasks">${CMP_TASKS.map(([k, ic, name]) => `<button class="cmp-task ${cmpJobs.includes(k) ? 'on' : ''}" data-cmp-job="${k}" aria-pressed="${cmpJobs.includes(k)}">${ic} ${esc(name)}</button>`).join('')}</div>
    <div class="row cmp-filters"><label class="row small"><input type="checkbox" id="cmp-fits" ${cmpOnlyFits ? 'checked' : ''}> Only models that run well on this PC</label>
      <label class="row small"><input type="checkbox" id="cmp-mine" ${cmpOnlyMine ? 'checked' : ''}> Only models I have</label>
      <span class="grow"></span><span class="small muted">${cmpRows ? `${rows.length} good for ${esc(taskNames)}` : 'Working it out…'}</span></div>
    ${cmpRows && !rows.length ? `<div class="notice info">No model on this list is good at ${esc(taskNames)}${cmpOnlyFits ? ' and runs well on this PC' : ''}. ${cmpOnlyFits ? 'Untick "Only models that run well on this PC" to see bigger ones.' : 'Try fewer tasks at once.'}</div>` : ''}
    ${rows.length ? `<table class="list cmp-table"><thead><tr><th>#</th><th>Model</th><th>Skill for ${esc(taskNames)}</th><th>Accuracy</th><th>Speed on this PC</th><th></th></tr></thead><tbody>
      ${rows.slice(0, 40).map((r, i) => `<tr>
        <td class="muted">${i + 1}</td>
        <td><b>${esc(r.name)}</b>${r.installed ? ' <span class="badge b-mint">✓ yours</span>' : ''}${r.open ? ' <span class="badge b-peach">🔓</span>' : ''}${r.vision ? ' <span class="badge b-sky">👁</span>' : ''}${r.reasoning ? ' <span class="badge b-lav">🧠</span>' : ''}<div class="small muted">${esc(r.maker)}${r.sizeGB ? ` · ${r.sizeGB.toFixed(1)} GB` : ''}</div></td>
        <td>${dots10(r.skill)} <b>${esc(SKILL_WORD(r.skill))}</b> <span class="small muted">${r.skill}/10</span>${cmpJobs.length > 1 ? `<div class="small muted">${cmpJobs.map((j) => `${CMP_TASKS.find((t) => t[0] === j)?.[1]} ${r.scores[j]}`).join(' · ')}</div>` : ''}</td>
        <td>${dots10(r.accuracy)} <b>${esc(ACC_WORD(r.accuracy))}</b></td>
        <td><span class="badge rate-${r.speed.rating}">${esc(r.speed.rating === 'wont' ? "Won't fit" : r.speed.label)}</span>${r.speed.wps ? ` <span class="small muted">~${r.speed.wps} words/s</span>` : ''}</td>
        <td>${r.installed ? `<button class="btn small primary" data-cmp-chat="${esc(r.installed)}">Chat</button>` : r.catalog ? (S.downloads[r.id] ? '<span class="badge b-sky">Downloading…</span>' : `<button class="btn small" data-cmp-get="${esc(r.id)}">Download</button>`) : ''}</td>
      </tr>`).join('')}</tbody></table>
      <p class="small muted">Skill and accuracy are Quicksilver's ratings from public benchmarks and testing (out of 10); speed is worked out for this PC. Want to judge for yourself? Try the <a href="#" data-cmp-tab="blind">blind test</a>.</p>` : ''}`;
}
function bindCompareTask() {
  $$('[data-cmp-job]').forEach((b) => b.addEventListener('click', () => {
    const k = b.dataset.cmpJob;
    cmpJobs = cmpJobs.includes(k) ? cmpJobs.filter((x) => x !== k) : [...cmpJobs, k];
    if (!cmpJobs.length) cmpJobs = [k];
    render();
  }));
  $('#cmp-fits')?.addEventListener('change', (e) => { cmpOnlyFits = e.target.checked; render(); });
  $('#cmp-mine')?.addEventListener('change', (e) => { cmpOnlyMine = e.target.checked; render(); });
  $$('[data-cmp-chat]').forEach((b) => b.addEventListener('click', () => { newChat(); const c = chatById(S.route.id); if (c) { c.target = `local:${b.dataset.cmpChat}`; save(); render(); } }));
  $$('[data-cmp-get]').forEach((b) => b.addEventListener('click', async () => {
    const m = S.catalog.text.find((x) => x.id === b.dataset.cmpGet);
    if (!m) return;
    await download({ catalogId: m.id }, m.name); cmpRows = null; render();
  }));
}

// The Compare models page: by task (default) or the blind test.
const arenaBlindView = views.arena;
views.arena = {
  html() {
    const tabs = arenaTabsHTML(cmpTab);
    if (cmpTab === 'blind') return arenaBlindView.html().replace('</div>\n      <p class="lede">', `</div>${tabs}\n      <p class="lede">`);
    return `<div class="page arena"><div class="page-head"><h1>Compare models</h1><span class="small muted">Which model is best for what you do?</span></div>${tabs}${compareTaskHTML()}</div>`;
  },
  bind() {
    $$('[data-cmp-tab]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); cmpTab = b.dataset.cmpTab; render(); }));
    bindArenaTabs();
    if (cmpTab === 'blind') arenaBlindView.bind(); else bindCompareTask();
  },
};
