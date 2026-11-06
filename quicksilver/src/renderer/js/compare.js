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
  return `<span class="stars" title="${n} out of 5" aria-label="${n} out of 5 stars">${'★'.repeat(full)}${half ? '<span class="half">★</span>' : ''}<span class="off">${'★'.repeat(5 - full - (half ? 1 : 0))}</span></span>`;
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
