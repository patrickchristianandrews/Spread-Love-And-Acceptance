// The best setup for this PC (top of Home) and the Compare page (every team type side by side).
// Both come from one call (advisor:overview), refreshed whenever your models change.
'use strict';

let overviewLoading = null;
function loadOverview() {
  if (S.overview || overviewLoading) return overviewLoading;
  overviewLoading = qs.call('advisor:overview').then((o) => { S.overview = o; }).catch(() => { S.overview = { failed: true, jobs: [], yours: [] }; })
    .finally(() => { overviewLoading = null; if (['home', 'compare'].includes(S.route.view)) render(); });
  return overviewLoading;
}

const starsHTML = (n) => {
  if (n == null) return '';
  const full = Math.floor(n); const half = n - full >= 0.5;
  return `<span class="stars" title="${tenText(n)}" aria-label="${tenText(n)}">${'★'.repeat(full)}${half ? '<span class="half">★</span>' : ''}<span class="off">${'★'.repeat(5 - full - (half ? 1 : 0))}</span><b class="st-ten">${tenText(n)}</b></span>`;
};
const timeChip = (sec, per = 'answer') => {
  if (sec == null || !isFinite(sec)) return '<span class="small muted">n/a</span>';
  const k = sec <= 15 ? 'fast' : sec <= 60 ? 'ok' : 'slow';
  return `<span class="tchip t-${k}" title="Estimated on this PC">⏱ ${fmtSec(sec)}${per ? ` <span>per ${per}</span>` : ''}</span>`;
};
const capsHTML = (caps) => `<div class="caps">${(caps || []).map((c) => `<span class="cap ${c.on ? 'on' : 'off'}">${c.on ? '✓' : '✕'} ${esc(c.label)}</span>`).join('')}</div>`;
const ROLE_TAG = { lead: '<span class="badge b-mint">★ Leads</span>', draft: '<span class="badge b-lav">✏️ Second opinion</span>', vision: '<span class="badge b-sky">👁 Reads photos</span>' };
const hwText = (h) => (h ? `${h.ramGB.toFixed(0)} GB memory · ${esc(h.gpuName || 'no graphics card')}${h.vramGB ? ` (${h.vramGB.toFixed(0)} GB video memory)` : ''}` : 'Checking your PC…');

// ---------- Home: the best setup for this PC ----------

function bestSetupHTML() {
  const name = S.data.prefs.userName;
  const hello = name ? `Welcome back, ${esc(name)}.` : 'Welcome to Quicksilver.';
  const o = S.overview;
  const head = (title, sub) => `<div class="row bs-head"><div class="grow"><div class="bs-kicker">${hello} Here's the best setup for your PC</div><h1>${title}</h1>${sub ? `<p class="bs-sub">${sub}</p>` : ''}</div><button class="btn primary" data-nav-new style="font-size:1.05rem;padding:10px 22px">＋ New chat</button></div>`;
  if (!o) return `<div class="card hero best-setup">${head('Checking your PC…', 'Finding the best models and team for your hardware.')}<div class="bs-skel"></div></div>`;
  const general = o.jobs.find((j) => j.job === 'general');
  const q = o.quicksilver;
  const upgrade = general?.best && general.best.missingGB > 0 && (!q || general.best.stars > q.stars) ? general.best : null;
  const upgradeHTML = upgrade ? `<div class="bs-upgrade"><span class="grow"><b>🚀 Upgrade available for this PC:</b> ${esc(upgrade.names.join(' + '))} · ${starsHTML(upgrade.stars)} · ${timeChip(upgrade.seconds)} · ${upgrade.missingGB.toFixed(1)} GB download</span><button class="btn small" data-upgrade="general">See it</button></div>` : '';
  if (!q) {
    // Not enough models for a team yet: recommend the best this PC can run.
    const best = general?.best;
    return `<div class="card hero best-setup">${head(best ? 'Your best start' : 'Let\'s get you set up', `🖥️ ${hwText(o.hardware)}`)}
      ${best ? `<div class="bs-grid"><div class="bs-col"><h4>Recommended for this PC</h4>${best.names.map((n) => `<div class="bs-member"><b>${esc(n)}</b></div>`).join('')}<div class="row" style="margin-top:8px">${starsHTML(best.stars)}${timeChip(best.seconds)}</div></div>
        <div class="bs-col"><h4>What it can do here</h4>${capsHTML(best.caps)}</div></div>
        <div class="bs-actions"><button class="btn primary" data-upgrade="general">${best.missingGB ? `Download & set up (${best.missingGB.toFixed(1)} GB)` : 'Set it up'}</button><button class="btn" data-goto="compare">Compare all teams</button></div>` : '<p>Install a model under Models to start.</p>'}
    </div>`;
  }
  const flow = [
    ['💬', 'Simple questions', q.auto ? `<b>${esc(q.lead)}</b> answers directly` : `the whole team answers, <b>${esc(q.lead)}</b> leads`, q.times.simple],
    ['🧠', 'Hard questions', q.second ? `<b>${esc(q.second)}</b> gives a second opinion, <b>${esc(q.lead)}</b> checks both and writes the answer` : `<b>${esc(q.lead)}</b> drafts, then reviews its own answer`, q.times.hard],
    q.times.photo != null ? ['📷', 'Photos & screenshots', q.eyes && q.eyes !== q.lead ? `<b>${esc(q.eyes)}</b> reads the picture, <b>${esc(q.lead)}</b> answers` : `<b>${esc(q.lead)}</b> looks at it directly`, q.times.photo] : null,
  ].filter(Boolean);
  return `<div class="card hero best-setup">
    ${head(`${esc(q.emoji)} ${esc(q.name)} ${starsHTML(q.stars)}`, `Your PC: ${hwText(o.hardware)}`)}
    <div class="bs-grid">
      <div class="bs-col"><h4>The team on this PC</h4>${q.members.map((m) => `<div class="bs-member"><b>${esc(m.name)}</b><div class="row bs-tags">${m.roles.map((r) => ROLE_TAG[r]).join('')}</div><div class="small muted">Runs on the ${esc(m.where)} · <span class="rate-${m.rating}">${esc(m.speed)}</span> · ~${m.wps} words/s ${m.measured ? '<span class="meas" title="Timed on this PC from real answers">✓ measured</span>' : '<span class="muted" title="Calculated from your hardware; becomes exact after the first answers">(estimate)</span>'}</div></div>`).join('')}</div>
      <div class="bs-col"><h4>How it works</h4>${flow.map(([ic, t, d, sec]) => `<div class="bs-flow"><span class="bs-ic">${ic}</span><div class="grow"><b>${t}</b><div class="small">${d}</div></div>${timeChip(sec, '')}</div>`).join('')}</div>
      <div class="bs-col"><h4>What it can do here</h4>${capsHTML(q.caps)}</div>
    </div>
    ${typicalHTML()}
    ${upgradeHTML}
    <div class="bs-actions"><button class="btn" data-goto="compare">Compare all teams</button><button class="btn" data-upgrades>Cheap upgrades for this PC</button><button class="btn ghost" data-goto="stacks">Customize</button></div>
  </div>`;
}

// "Typical on this PC": how long each kind of output takes and how good it should be.
function typicalHTML() {
  const t = targetValid(S.data.prefs.defaultTarget) ? S.data.prefs.defaultTarget : resolveTarget(null, assistantById(S.data.prefs.lastAssistant));
  const pick = (pref, cat) => (pref && S.speed?.media?.[pref.replace(/^local:/, '')] ? pref : Object.entries(S.speed?.media || {}).find(([, m]) => cat(m))?.[0]);
  const media = (pref, cat) => { const id = pick(pref, cat); return id ? S.speed.media[id.replace(/^local:/, '')] : null; };
  const pic = media(S.data.prefs.imageModel, (m) => m.category === 'image');
  const vid = media(S.data.prefs.videoModel, (m) => m.kind === 'video');
  const edit = media(S.data.prefs.editModel, (m) => m.category === 'edit') || pic;
  const items = [
    ['', 'Chat reply', etaFor(t, WORDS.chat), starsOf(t, 'general')],
    ['', 'Hard question', etaFor(t, WORDS.hard, { hard: true }), starsOf(t, 'reasoning')],
    ['', 'Email or post', etaFor(t, WORDS.writing), starsOf(t, 'writing')],
    ['', 'Code', etaFor(t, WORDS.code, { hard: true }), starsOf(t, 'coding')],
    ['', 'Report', etaFor(t, WORDS.document, { hard: true }), starsOf(t, 'office')],
    ['', 'Picture', pic?.sec ?? null, pic?.stars ?? null, !pic],
    ['', 'Photo edit', edit?.sec ?? null, edit?.stars ?? null, !edit],
    ['', 'Video clip', vid?.sec ?? null, vid?.stars ?? null, !vid],
  ];
  return `<div class="typical"><span class="lbl">Typical on this PC</span>${items.map(([ic, name, sec, stars, missing]) => `<span class="typ" title="${missing ? 'Get a model for this in Teams or Create' : 'Estimated time and expected quality on this PC'}">${ic} ${name} ${missing ? '<span class="muted">· get a model</span>' : `<span class="muted">⏱ ${etaLabel(sec)}${stars != null ? ` · ${starText(stars)}` : ''}</span>`}</span>`).join('')}</div>`;
}

function bindBestSetup() {
  loadOverview();
  $$('[data-upgrades]').forEach((b) => b.addEventListener('click', () => { go({ view: 'pc' }); setTimeout(() => document.getElementById('upgrades')?.scrollIntoView({ behavior: 'smooth', block: 'start' }), 300); }));
  $$('[data-upgrade]').forEach((b) => b.addEventListener('click', () => { go({ view: 'stacks' }); runAdvisor(b.dataset.upgrade); }));
}

// ---------- live preview while you build an AI (AI team, combined AIs, knowledge model) ----------
// members: { drafters: [target], judge?: target, vision?: target, mode?: 'blend'|'debate'|'consensus'|'auto' }
const PREVIEW_JOBS = [['general', '💬', 'Chat'], ['reasoning', '🧠', 'Reasoning'], ['writing', '✍️', 'Writing'], ['coding', '💻', 'Code'], ['research', '🔎', 'Research']];

function teamStats(members) {
  const info = (t) => { const s = t && S.speed?.targets?.[t]; return s?.kind === 'model' ? s : null; };
  const drafters = (members.drafters || []).filter(info);
  const judge = info(members.judge) ? members.judge : null;
  const lead = judge || drafters[0];
  if (!lead) return null;
  const vision = info(members.vision) ? members.vision : null;
  const all = [...new Set([...drafters, judge, vision].filter(Boolean))];
  const w = (t) => Math.max(0.1, info(t).wps || 0.1);
  const debate = members.mode === 'debate' && drafters.length > 1;
  const time = (words, hard = false) => {
    if (members.mode === 'auto' && !hard) return words / w(lead);
    const round = drafters.reduce((t, d) => t + words / w(d), 0);
    return round + (debate ? round : 0) + (judge ? (words * 1.1) / w(judge) : 0);
  };
  const team = all.length >= 2;
  const stars = (job) => Math.max(0.5, Math.min(5, Math.round((Math.max(0, ...all.map((t) => info(t).scores?.[job] ?? 0)) / 2 + (team ? 0.5 : 0)) * 2) / 2));
  const sees = all.some((t) => info(t).vision);
  const photo = sees && !info(lead).vision ? 250 / w(vision || all.find((t) => info(t).vision)) : 0;
  const caps = [
    ['Sounds like a person, not a chatbot', humanOn()],
    ['Sees photos & screenshots', sees],
    ['Step-by-step reasoning', stars('reasoning') >= 4],
    ['Writes & fixes code', stars('coding') >= 3.5],
    ['Long documents', Math.max(...all.map((t) => info(t).ctx || 0)) >= 65536],
    ['Cross-checks its answers', team],
    ['Works offline', all.every((t) => info(t).local)],
  ];
  return { all, lead, drafters, judge, vision, time, stars, photo, caps, info, w };
}

function teamPreviewHTML(members, { title = 'How this AI will work on your PC' } = {}) {
  const t = teamStats(members);
  if (!t) return '<div class="preview muted">Pick models to see how fast and how good this AI will be on your PC.</div>';
  const role = (x) => (x === t.lead ? 'leads' : x === t.vision && !t.drafters.includes(x) ? 'reads photos' : 'answers');
  return `<div class="preview">
    <div class="pv-title">🔮 ${title}</div>
    <div class="pv-times">
      <span class="typ">💬 Chat reply <span class="muted">⏱ ${etaLabel(t.time(WORDS.chat))}</span></span>
      <span class="typ">🧠 Hard question <span class="muted">⏱ ${etaLabel(t.time(WORDS.hard, true))}</span></span>
      <span class="typ">💻 Code <span class="muted">⏱ ${etaLabel(t.time(WORDS.code, true))}</span></span>
      <span class="typ">📄 Report <span class="muted">⏱ ${etaLabel(t.time(WORDS.document, true))}</span></span>
      ${t.photo ? `<span class="typ">📷 Photos <span class="muted">+${etaLabel(t.photo)} to read them</span></span>` : ''}
    </div>
    <div class="pv-stars">${PREVIEW_JOBS.map(([job, ic, label]) => `<span class="pv-star">${ic} ${label} ${starsHTML(t.stars(job))}</span>`).join('')}</div>
    <div class="caps">${t.caps.map(([label, on]) => `<span class="cap ${on ? 'on' : 'off'}">${on ? '✓' : '✕'} ${esc(label)}</span>`).join('')}</div>
    <div class="pv-team small muted">${t.all.map((x) => `<b>${esc(t.info(x).name || targetLabel(x))}</b> ${role(x)} (~${Math.round(t.w(x))} words/s)`).join(' · ')}</div>
  </div>`;
}

// ---------- Compare page ----------

views.compare = {
  html() {
    const o = S.overview;
    if (!o) return '<div class="page"><div class="page-head"><h1>Compare teams</h1></div><div class="empty">Measuring every team on your PC…</div></div>';
    const textJobs = o.jobs.filter((j) => j.kind === 'text');
    const mediaJobs = o.jobs.filter((j) => j.kind === 'media');
    const side = (s, kind) => {
      if (!s) return `<td class="cmp-none">${kind === 'mine' ? 'Not with your models yet' : 'Doesn\'t fit this PC'}</td>`;
      return `<td><div class="row" style="gap:6px">${starsHTML(s.stars)}${timeChip(s.seconds, '')}</div><div class="cmp-models">${s.names.map(esc).join(' · ')}</div>${kind === 'best' ? `<div class="small ${s.missingGB ? '' : 'ok-text'}">${s.missingGB ? `${s.missingGB.toFixed(1)} GB to download` : '✓ You have everything'}</div>` : ''}</td>`;
    };
    const capsCell = (s) => `<td class="cmp-caps">${(s?.caps || []).filter((c) => ['see', 'reason', 'code', 'long'].includes(c.key)).map((c) => `<span class="cap ${c.on ? 'on' : 'off'}" title="${esc(c.label)}">${{ see: '👁', reason: '🧠', code: '💻', long: '📄' }[c.key]}</span>`).join('')}</td>`;
    const mediaSide = (s, kind) => (s ? `<td>${s.roles.map((r) => `<div class="cmp-role"><span class="small muted">${esc(r.label)}:</span> <b>${esc(r.name)}</b>${r.sec ? ` ${timeChip(r.sec, r.role === 'video' || r.role === 'animate' ? 'clip' : r.role === 'helper' ? '' : 'picture')}` : ''}</div>`).join('')}${kind === 'best' ? `<div class="small ${s.missingGB ? '' : 'ok-text'}">${s.missingGB ? `${s.missingGB.toFixed(1)} GB to download` : '✓ You have everything'}</div>` : ''}</td>` : `<td class="cmp-none">${kind === 'mine' ? 'No models for this yet' : 'Doesn\'t fit this PC'}</td>`);
    return `<div class="page">
      <div class="page-head"><h1>Compare teams</h1><button class="btn primary" data-goto="stacks">Set one up</button></div>
      <p class="lede">Every team, measured for <b>your PC</b> (${hwText(o.hardware)}). Stars show answer quality; times are for a medium-length answer. Click a row to set it up.</p>
      ${o.quicksilver || o.yours.length ? `<div class="section"><h2>Your teams</h2></div>
      <div class="cmp-yours">${[o.quicksilver, ...o.yours].filter(Boolean).map((s) => `<div class="card cmp-card">
        <div class="row"><span class="emoji-badge">${esc(s.emoji)}</span><h3 class="grow">${esc(s.name)}</h3>${starsHTML(s.stars)}</div>
        <div class="cmp-models" style="margin:8px 0">${s.members.map((m) => `${esc(m.name)} <span class="muted">(${esc(m.where)})</span>`).join(' · ')}</div>
        <div class="row" style="gap:6px">${s.auto ? `${timeChip(s.times.simple, '')} <span class="small muted">simple</span> ${timeChip(s.times.hard, '')} <span class="small muted">hard</span>` : timeChip(s.times.hard)}</div>
        ${capsHTML(s.caps)}
      </div>`).join('')}</div>` : ''}
      <div class="section"><h2>Think &amp; work</h2><span class="small muted">👁 sees photos · 🧠 reasoning · 💻 code · 📄 long documents</span></div>
      <div class="table-scroll"><table class="list cmp-table"><thead><tr><th>Team</th><th>With your models</th><th>Best for this PC</th><th>Abilities</th></tr></thead><tbody>
        ${textJobs.map((j) => `<tr data-cmp-job="${j.job}" tabindex="0"><td><div class="cmp-name"><span class="cmp-ic">${j.icon}</span><div><b>${esc(j.label)}</b><div class="small muted">${esc(j.pitch)}</div></div></div></td>${side(j.mine, 'mine')}${side(j.best, 'best')}${capsCell(j.best || j.mine)}</tr>`).join('')}
      </tbody></table></div>
      <div class="section"><h2>Create</h2></div>
      <div class="table-scroll"><table class="list cmp-table"><thead><tr><th>Team</th><th>With your models</th><th>Best for this PC</th></tr></thead><tbody>
        ${mediaJobs.map((j) => `<tr data-cmp-job="${j.job}" tabindex="0"><td><div class="cmp-name"><span class="cmp-ic">${j.icon}</span><div><b>${esc(j.label)}</b><div class="small muted">${esc(j.pitch)}</div></div></div></td>${mediaSide(j.mine, 'mine')}${mediaSide(j.best, 'best')}</tr>`).join('')}
      </tbody></table></div>
    </div>`;
  },
  bind() {
    loadOverview();
    $$('[data-goto]').forEach((b) => b.addEventListener('click', () => go({ view: b.dataset.goto })));
    const open = (job) => { go({ view: 'stacks' }); runAdvisor(job); };
    $$('[data-cmp-job]').forEach((r) => {
      r.addEventListener('click', () => open(r.dataset.cmpJob));
      r.addEventListener('keydown', (e) => { if (e.key === 'Enter') open(r.dataset.cmpJob); });
    });
  },
};

// ---------- ratings for a custom AI (fusion) ----------
// Power, efficiency and accuracy out of 5, and a plain verdict on whether it runs on this PC.
const half = (n) => Math.max(0.5, Math.min(5, Math.round(n * 2) / 2));
function fusionRatings(members) {
  const t = teamStats(members);
  if (!t) return null;
  const hw = S.est?.hardware || {};
  const inst = (x) => S.installed.find((m) => `local:${m.id}` === x);
  const locals = t.all.filter((x) => x.startsWith('local:'));
  const clouds = t.all.filter((x) => x.startsWith('api:'));
  const est = (x) => S.est?.text?.[inst(x)?.catalogId];
  const name = (x) => inst(x)?.name || targetLabel(x);
  // Runs on this PC?
  const wont = locals.filter((x) => est(x)?.rating === 'wont');
  const slow = locals.filter((x) => est(x)?.rating === 'slow');
  const memGB = locals.reduce((s, x) => s + (inst(x)?.size || 0) / 1e9, 0);
  const roomGB = (hw.vramGB || 0) + (hw.ramGB || 0) * 0.7;
  let runs;
  if (wont.length) runs = { cls: 'bad', icon: '✕', text: `Won't run on this PC: ${wont.map(name).join(', ')} needs more memory than it has. Swap it for a smaller model.` };
  else if (slow.length) runs = { cls: 'warn', icon: '⚠', text: `Runs, but slowly: ${slow.map(name).join(', ')} is slow on this PC.` };
  else if (roomGB && memGB > roomGB) runs = { cls: 'warn', icon: '⚠', text: `Runs, but its models (${memGB.toFixed(1)} GB) don't all fit in memory at once, so they take turns and hard answers wait longer.` };
  else runs = { cls: 'ok', icon: '✓', text: 'Runs well on this PC.' };
  if (clouds.length) runs.text += ' Its cloud AI needs the internet.';
  // Power: how capable it is on hard work (its strongest member, plus teamwork).
  const power = half(Math.max(t.stars('general'), t.stars('reasoning')));
  // Efficiency: how quickly it answers here, and whether its models fit in memory together.
  const hard = t.time(WORDS.hard, true);
  let eff = hard < 30 ? 5 : hard < 60 ? 4.5 : hard < 90 ? 4 : hard < 150 ? 3.5 : hard < 240 ? 3 : hard < 400 ? 2 : 1;
  if (roomGB && memGB > roomGB) eff -= 1;
  if (wont.length) eff = 0.5;
  // Accuracy: the best tested scores in the team, plus cross-checking and a mix of makers.
  const cid = locals.map((x) => inst(x)?.catalogId).filter(Boolean);
  const sc = bestScores(cid) || {};
  for (const x of clouds) {
    const preset = S.providers.find((p) => p.id === x.split(':')[1])?.preset;
    const c = cloudScoresFor(preset);
    for (const k of ['math', 'science', 'coding']) if (c?.[k] != null && !(sc[k] >= c[k])) sc[k] = c[k];
  }
  const tested = ['math', 'science', 'coding'].map((k) => sc[k]).filter((v) => v != null);
  const makers = new Set(t.all.map((x) => (x.startsWith('api:') ? x.split(':')[1] : catModel(inst(x)?.catalogId)?.maker || x)));
  const crossCheck = ['debate', 'vote', 'redteam', 'consensus', 'panel'].includes(members.mode);
  let acc = tested.length ? tested.reduce((a, b) => a + b, 0) / tested.length / 20 : t.stars('general') - 0.5;
  if (t.all.length >= 2) acc += crossCheck ? 0.75 : 0.25;
  if (makers.size >= 2) acc += 0.25;
  return {
    power, eff: half(eff), acc: half(acc), runs,
    why: {
      power: `${t.all.length} AI${t.all.length > 1 ? 's' : ''}, led by ${name(t.lead)}`,
      eff: `about ${etaLabel(hard)} for a hard answer here`,
      acc: `${tested.length ? `best tested: ${['math', 'science', 'coding'].filter((k) => sc[k] != null).map((k) => `${{ math: 'maths', science: 'science', coding: 'coding' }[k]} ${sc[k]}%`).join(', ')}` : 'no published test scores'}${crossCheck ? `; ${(INFUSE_MODES[members.mode] || {}).name || members.mode} cross-checks` : ''}${makers.size >= 2 ? '; different makers catch each other\'s mistakes' : ''}`,
    },
  };
}
// One overall score for a custom AI on this PC (0.5–5, shown out of 10): its power, efficiency and
// accuracy together, held down when it won't run here.
function fusionOverall(r) {
  if (!r) return null;
  let o = (r.power + r.eff + r.acc) / 3;
  if (r.runs.cls === 'bad') o = Math.min(o, 1);
  else if (r.runs.cls === 'warn') o -= 0.25;
  return Math.max(0.5, Math.min(5, Math.round(o * 4) / 4));
}
const fzVerdict = (o) => (o >= 4.25 ? 'Excellent on this PC' : o >= 3.5 ? 'Very good on this PC' : o >= 2.75 ? 'Good, with room to improve' : o >= 2 ? 'Works, but could be much better' : 'Needs changes to work well here');
// Recommended changes for a custom AI on this PC, each with its new rating when it can be applied.
function fusionAdvice(members) {
  const t = teamStats(members);
  if (!t) return [];
  const r = fusionRatings(members);
  const now = fusionOverall(r);
  const instOf = (x) => S.installed.find((m) => `local:${m.id}` === x);
  const est = (x) => S.est?.text?.[instOf(x)?.catalogId];
  const name = (x) => instOf(x)?.name || targetLabel(x);
  const runsWell = (x) => !x.startsWith('local:') || ['great', 'good', 'ok'].includes(est(x)?.rating);
  const pool = S.targets.filter((x) => !x.stack && x.target && !t.all.includes(x.target) && S.speed?.targets?.[x.target]?.kind === 'model').map((x) => x.target);
  const strength = (x) => { const i = t.info(x) || S.speed?.targets?.[x]; const sc = i?.scores || {}; return Math.max(sc.general ?? 0, sc.reasoning ?? 0); };
  const best = (filter) => pool.filter(runsWell).filter(filter || (() => true)).sort((a, b) => strength(b) - strength(a))[0];
  const swap = (m, from, to) => ({ ...m, drafters: (m.drafters || []).map((d) => (d === from ? to : d)), judge: m.judge === from ? to : m.judge, vision: m.vision === from ? to : m.vision });
  const out = [];
  const add = (icon, text, why, next) => {
    const after = next ? fusionOverall(fusionRatings(next)) : null;
    if (next && after != null && after < now) return; // only suggest changes that don't make it worse
    out.push({ icon, text, why, next, after });
  };
  // 1. Members that won't run, or run slowly, here.
  for (const x of t.all.filter((y) => y.startsWith('local:') && !runsWell(y))) {
    const alt = best((y) => y.startsWith('local:'));
    const wont = est(x)?.rating === 'wont';
    if (alt) add(wont ? '🔁' : '🐢', `Swap ${name(x)} for ${name(alt)}`, wont ? `${name(x)} needs more memory than this PC has; ${name(alt)} runs well here.` : `${name(x)} is slow on this PC; ${name(alt)} answers much sooner.`, swap(members, x, alt));
    else add(wont ? '🔁' : '🐢', `Replace ${name(x)} with a smaller model`, `${wont ? 'It needs more memory than this PC has' : 'It\'s slow on this PC'}. Models → Discover shows the ones marked Fast or Smooth for this PC.`, null);
  }
  // 2. Too slow overall: drop the slowest helper, or use a lighter way of working.
  const hard = t.time(WORDS.hard, true);
  if (hard > 150 && (members.drafters || []).length > 2) {
    const slowest = [...members.drafters].filter((d) => d !== t.lead).sort((a, b) => t.w(a) - t.w(b))[0];
    const fewer = slowest && { ...members, drafters: members.drafters.filter((d) => d !== slowest) };
    const saved = fewer ? hard - (teamStats(fewer)?.time(WORDS.hard, true) ?? hard) : 0;
    if (fewer && saved > 5) add('✂️', `Remove ${name(slowest)}`, `Hard answers take about ${etaLabel(hard)} here; without it they'd come about ${etaLabel(saved)} sooner. Three AIs are usually enough.`, fewer);
  }
  if (hard > 120 && members.mode === 'debate') add('⚡', 'Work as Red team instead of Debate', 'Debate runs every AI twice; Red team checks for mistakes in one pass, nearly as accurate at about half the time.', { ...members, mode: 'redteam' });
  // 3. Accuracy: cross-checking and a mix of makers.
  const crossCheck = ['debate', 'vote', 'redteam', 'consensus', 'panel'].includes(members.mode);
  if (!crossCheck && t.all.length >= 2 && hard < 150) add('🎯', 'Work as Red team (one AI checks the other)', 'Your AIs currently blend their answers; having one hunt for mistakes catches more errors on facts, maths and code.', { ...members, mode: 'redteam' });
  const makerOf = (x) => (x.startsWith('api:') ? x.split(':')[1] : catModel(instOf(x)?.catalogId)?.maker || x);
  const makers = new Set(t.all.map(makerOf));
  if (makers.size < 2 && (members.drafters || []).length < 4) {
    const other = best((y) => !makers.has(makerOf(y)));
    if (other) add('🤝', `Add ${name(other)} (a different maker)`, 'AIs from different makers make different mistakes, so they catch more of each other\'s.', { ...members, drafters: [...(members.drafters || []), other] });
  }
  // 4. A stronger lead.
  const stronger = best((y) => strength(y) > strength(t.lead) + 1);
  if (stronger && runsWell(stronger)) add('👑', `Let ${name(stronger)} lead`, `It scores higher than ${name(t.lead)} on hard questions, and the lead writes the final answer.`, { ...members, judge: stronger });
  // 5. Photos.
  if (!t.all.some((x) => t.info(x)?.vision)) {
    const eyes = pool.filter(runsWell).find((y) => S.speed?.targets?.[y]?.vision);
    if (eyes) add('👁️', `Add ${name(eyes)} to read photos`, 'Right now this AI can\'t look at photos or screenshots.', { ...members, vision: eyes });
  }
  // 6. Bigger upgrades worth downloading for this PC.
  const vram = S.est?.hardware?.vramGB || 0;
  const have = new Set(S.installed.map((m) => m.catalogId));
  if (vram >= 8 && !have.has('qwen3.5-9b-uncensored') && t.stars('reasoning') < 4.5) add('⬇️', 'Download Qwen3.5 9B (uncensored) and add it', 'This PC\'s graphics card can run it; it scores 81% on graduate-level science (vs 77% for the built-in Brain) and sees photos. Find it in Models → Discover.', null);
  if (!S.providers?.length && r.power < 4) add('☁️', 'Add a free cloud AI as the lead', 'A free cloud AI (Gemini, Groq or Cerebras free tiers) as the lead makes hard answers much stronger; your PC\'s models still draft. Connect one in Settings → Cloud AI.', null);
  if (!out.length) out.push({ icon: '✅', text: 'Nothing to change', why: 'This is a strong mix for this PC: every AI runs well here and they check each other.', next: null, after: null });
  return out.slice(0, 6);
}
function fusionAdviceHTML(members, { apply = false } = {}) {
  const r = fusionRatings(members);
  const o = fusionOverall(r);
  if (o == null) return '';
  return `<div class="fz-overall"><span class="grow"><b>Overall on this PC</b><span class="small muted">${esc(fzVerdict(o))}</span></span>${typeof tenStarsHTML === 'function' ? tenStarsHTML(tenOf(o)) : `<b>${tenText(o)}</b>`}</div>
    <div class="fz-advice"><b class="small">💡 Recommended changes</b>${fusionAdvice(members).map((a, i) => `<div class="fz-tip"><span>${a.icon}</span><span class="grow"><b>${esc(a.text)}</b><span class="small muted">${esc(a.why)}</span></span>${a.after != null && a.after > o ? `<span class="badge b-mint" title="Overall rating after this change">→ ${tenText(a.after)}</span>` : ''}${apply && a.next ? `<button class="btn small" data-fz-apply="${i}">Apply</button>` : ''}</div>`).join('')}</div>`;
}
// The full rating of a saved custom AI on this PC, with its recommended changes (each can be applied).
function fusionRateModal(id) {
  const s = S.stacks.find((x) => x.id === id);
  if (!s) return;
  const b = openModal(`<h2>${esc(s.emoji || '⚗️')} ${esc(s.name)}: rating on this PC</h2>
    <p class="small muted">How well this custom AI runs on ${S.est?.hardware ? `this PC (${hwText(S.est.hardware)})` : 'this PC'}, and what would make it better.</p>
    ${fusionRatingsHTML(s.members)}${fusionAdviceHTML(s.members, { apply: true })}${boostsHTML([...(s.members.drafters || []), s.members.judge].filter(Boolean), { fusion: true })}${teamPreviewHTML(s.members, { title: 'How it works on this PC' })}
    <div class="modal-actions"><button class="btn" data-close>Close</button></div>`, { wide: true });
  const tips = fusionAdvice(s.members);
  b.querySelectorAll('[data-fz-apply]').forEach((btn) => btn.addEventListener('click', async () => {
    const tip = tips[Number(btn.dataset.fzApply)];
    if (!tip?.next) return;
    btn.disabled = true;
    await qs.call('stacks:save', { ...s, members: tip.next });
    await refreshModels();
    toast(`${tip.text}: done. ${tip.after != null ? `Now ${tenText(tip.after)} on this PC.` : ''}`);
    render();
    fusionRateModal(id);
  }));
}
function fusionRatingsHTML(members, { compact = false } = {}) {
  const r = fusionRatings(members);
  if (!r) return '';
  const st = (v) => tenText(v);
  if (compact) return `<div class="fz-compact small"><span title="Overall on this PC"><b>⭐ ${tenText(fusionOverall(r))}</b></span><span title="${esc(r.why.power)}">⚡ Power <b>${st(r.power)}</b></span><span title="${esc(r.why.eff)}">🍃 Efficiency <b>${st(r.eff)}</b></span><span title="${esc(r.why.acc)}">🎯 Accuracy <b>${st(r.acc)}</b></span><span class="fz-run ${r.runs.cls}" title="${esc(r.runs.text)}">${r.runs.icon} ${r.runs.cls === 'ok' ? 'Runs well here' : r.runs.cls === 'warn' ? 'Runs slowly here' : 'Won\'t run here'}</span></div>`;
  return `<div class="fz-ratings">
    <div class="fz-r"><span>⚡ Power</span><b>${st(r.power)}</b><small>${esc(r.why.power)}</small></div>
    <div class="fz-r"><span>🍃 Efficiency</span><b>${st(r.eff)}</b><small>${esc(r.why.eff)}</small></div>
    <div class="fz-r"><span>🎯 Accuracy</span><b>${st(r.acc)}</b><small>${esc(r.why.acc)}</small></div>
    <div class="fz-run ${r.runs.cls}">${r.runs.icon} ${esc(r.runs.text)}</div>
  </div>`;
}
