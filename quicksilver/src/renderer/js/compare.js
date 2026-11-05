// The best setup for this PC (top of Home) and the Compare page (every stack type side by side).
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
  if (!o) return `<div class="card hero best-setup">${head('Checking your PC…', 'Finding the best models and stack for your hardware.')}<div class="bs-skel"></div></div>`;
  const general = o.jobs.find((j) => j.job === 'general');
  const q = o.quicksilver;
  const upgrade = general?.best && general.best.missingGB > 0 && (!q || general.best.stars > q.stars) ? general.best : null;
  const upgradeHTML = upgrade ? `<div class="bs-upgrade"><span class="grow"><b>🚀 Upgrade available for this PC:</b> ${esc(upgrade.names.join(' + '))} · ${starsHTML(upgrade.stars)} · ${timeChip(upgrade.seconds)} · ${upgrade.missingGB.toFixed(1)} GB download</span><button class="btn small" data-upgrade="general">See it</button></div>` : '';
  if (!q) {
    // Not enough models for a stack yet: recommend the best this PC can run.
    const best = general?.best;
    return `<div class="card hero best-setup">${head(best ? 'Your best start' : 'Let\'s get you set up', `🖥️ ${hwText(o.hardware)}`)}
      ${best ? `<div class="bs-grid"><div class="bs-col"><h4>Recommended for this PC</h4>${best.names.map((n) => `<div class="bs-member"><b>${esc(n)}</b></div>`).join('')}<div class="row" style="margin-top:8px">${starsHTML(best.stars)}${timeChip(best.seconds)}</div></div>
        <div class="bs-col"><h4>What it can do here</h4>${capsHTML(best.caps)}</div></div>
        <div class="bs-actions"><button class="btn primary" data-upgrade="general">${best.missingGB ? `Download & set up (${best.missingGB.toFixed(1)} GB)` : 'Set it up'}</button><button class="btn" data-goto="compare">Compare all stacks</button></div>` : '<p>Install a model under Models to start.</p>'}
    </div>`;
  }
  const flow = [
    ['💬', 'Simple questions', q.auto ? `<b>${esc(q.lead)}</b> answers directly` : `the whole team answers, <b>${esc(q.lead)}</b> leads`, q.times.simple],
    ['🧠', 'Hard questions', q.second ? `<b>${esc(q.second)}</b> gives a second opinion, <b>${esc(q.lead)}</b> checks both and writes the answer` : `<b>${esc(q.lead)}</b> drafts, then reviews its own answer`, q.times.hard],
    q.times.photo != null ? ['📷', 'Photos & screenshots', q.eyes && q.eyes !== q.lead ? `<b>${esc(q.eyes)}</b> reads the picture, <b>${esc(q.lead)}</b> answers` : `<b>${esc(q.lead)}</b> looks at it directly`, q.times.photo] : null,
  ].filter(Boolean);
  return `<div class="card hero best-setup">
    ${head(`${esc(q.emoji)} ${esc(q.name)} ${starsHTML(q.stars)}`, `🖥️ Your PC: ${hwText(o.hardware)}`)}
    <div class="bs-grid">
      <div class="bs-col"><h4>The team on this PC</h4>${q.members.map((m) => `<div class="bs-member"><b>${esc(m.name)}</b><div class="row bs-tags">${m.roles.map((r) => ROLE_TAG[r]).join('')}</div><div class="small muted">Runs on the ${esc(m.where)} · <span class="rate-${m.rating}">${esc(m.speed)}</span> · ~${m.wps} words/s</div></div>`).join('')}</div>
      <div class="bs-col"><h4>How it works</h4>${flow.map(([ic, t, d, sec]) => `<div class="bs-flow"><span class="bs-ic">${ic}</span><div class="grow"><b>${t}</b><div class="small">${d}</div></div>${timeChip(sec, '')}</div>`).join('')}</div>
      <div class="bs-col"><h4>What it can do here</h4>${capsHTML(q.caps)}</div>
    </div>
    ${upgradeHTML}
    <div class="bs-actions"><button class="btn" data-goto="compare">📊 Compare all stacks</button><button class="btn ghost" data-goto="stacks">Customize</button></div>
  </div>`;
}

function bindBestSetup() {
  loadOverview();
  $$('[data-upgrade]').forEach((b) => b.addEventListener('click', () => { go({ view: 'stacks' }); runAdvisor(b.dataset.upgrade); }));
}

// ---------- Compare page ----------

views.compare = {
  html() {
    const o = S.overview;
    if (!o) return '<div class="page"><div class="page-head"><h1>Compare stacks</h1></div><div class="empty">Measuring every stack on your PC…</div></div>';
    const textJobs = o.jobs.filter((j) => j.kind === 'text');
    const mediaJobs = o.jobs.filter((j) => j.kind === 'media');
    const side = (s, kind) => {
      if (!s) return `<td class="cmp-none">${kind === 'mine' ? 'Not with your models yet' : 'Doesn\'t fit this PC'}</td>`;
      return `<td><div class="row" style="gap:6px">${starsHTML(s.stars)}${timeChip(s.seconds, '')}</div><div class="cmp-models">${s.names.map(esc).join(' · ')}</div>${kind === 'best' ? `<div class="small ${s.missingGB ? '' : 'ok-text'}">${s.missingGB ? `${s.missingGB.toFixed(1)} GB to download` : '✓ You have everything'}</div>` : ''}</td>`;
    };
    const capsCell = (s) => `<td class="cmp-caps">${(s?.caps || []).filter((c) => ['see', 'reason', 'code', 'long'].includes(c.key)).map((c) => `<span class="cap ${c.on ? 'on' : 'off'}" title="${esc(c.label)}">${{ see: '👁', reason: '🧠', code: '💻', long: '📄' }[c.key]}</span>`).join('')}</td>`;
    const mediaSide = (s, kind) => (s ? `<td>${s.roles.map((r) => `<div class="cmp-role"><span class="small muted">${esc(r.label)}:</span> <b>${esc(r.name)}</b>${r.sec ? ` ${timeChip(r.sec, r.role === 'video' || r.role === 'animate' ? 'clip' : r.role === 'helper' ? '' : 'picture')}` : ''}</div>`).join('')}${kind === 'best' ? `<div class="small ${s.missingGB ? '' : 'ok-text'}">${s.missingGB ? `${s.missingGB.toFixed(1)} GB to download` : '✓ You have everything'}</div>` : ''}</td>` : `<td class="cmp-none">${kind === 'mine' ? 'No models for this yet' : 'Doesn\'t fit this PC'}</td>`);
    return `<div class="page">
      <div class="page-head"><h1>Compare stacks</h1><button class="btn primary" data-goto="stacks">Set one up</button></div>
      <p class="lede">Every stack, measured for <b>your PC</b> (${hwText(o.hardware)}). Stars show answer quality; times are for a medium-length answer. Click a row to set it up.</p>
      ${o.quicksilver || o.yours.length ? `<div class="section"><h2>Your stacks</h2></div>
      <div class="cmp-yours">${[o.quicksilver, ...o.yours].filter(Boolean).map((s) => `<div class="card cmp-card">
        <div class="row"><span class="emoji-badge">${esc(s.emoji)}</span><h3 class="grow">${esc(s.name)}</h3>${starsHTML(s.stars)}</div>
        <div class="cmp-models" style="margin:8px 0">${s.members.map((m) => `${esc(m.name)} <span class="muted">(${esc(m.where)})</span>`).join(' · ')}</div>
        <div class="row" style="gap:6px">${s.auto ? `${timeChip(s.times.simple, '')} <span class="small muted">simple</span> ${timeChip(s.times.hard, '')} <span class="small muted">hard</span>` : timeChip(s.times.hard)}</div>
        ${capsHTML(s.caps)}
      </div>`).join('')}</div>` : ''}
      <div class="section"><h2>Think &amp; work</h2><span class="small muted">👁 sees photos · 🧠 reasoning · 💻 code · 📄 long documents</span></div>
      <div class="table-scroll"><table class="list cmp-table"><thead><tr><th>Stack</th><th>With your models</th><th>Best for this PC</th><th>Abilities</th></tr></thead><tbody>
        ${textJobs.map((j) => `<tr data-cmp-job="${j.job}" tabindex="0"><td><div class="cmp-name"><span class="cmp-ic">${j.icon}</span><div><b>${esc(j.label)}</b><div class="small muted">${esc(j.pitch)}</div></div></div></td>${side(j.mine, 'mine')}${side(j.best, 'best')}${capsCell(j.best || j.mine)}</tr>`).join('')}
      </tbody></table></div>
      <div class="section"><h2>Create</h2></div>
      <div class="table-scroll"><table class="list cmp-table"><thead><tr><th>Stack</th><th>With your models</th><th>Best for this PC</th></tr></thead><tbody>
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
