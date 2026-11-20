// Usage dashboard: an honest picture of how you actually use Quicksilver, worked out entirely from
// your own chats on this PC — nothing is sent anywhere. Where answers ran (your models vs cloud AIs
// vs teams), how much touched the internet, how much was fully private, time spent, pictures and
// videos made, the fastest and slowest, and how the real time compared with the app's estimate.
'use strict';

// A tool call counts as "internet" when it reaches the web.
const INTERNET_TOOL = /^(web_search|read_page|image_search|video_search|video_find|arxiv|pubmed|hacker_?news|web_screenshot|find_product)$/i;
const isInternetCall = (t) => INTERNET_TOOL.test(t.name || '') || /web|internet|online|pictures? from the web|videos? from the web|research|papers?|news/i.test(t.source || '');
const usageKind = (target) => {
  const t = String(target || '');
  if (t.startsWith('api:')) return 'cloud';
  if (t.startsWith('stack:')) return 'stack';
  return 'local'; // local: and kbm: run on your PC
};
const wordCount = (s) => (String(s || '').trim().match(/\S+/g) || []).length;

// Build the numbers from the chats. Pure given (chats, etaOf) so it is easy to test.
function usageStats(chats, etaOf) {
  const z = () => ({ n: 0, ms: 0 });
  const s = {
    answers: 0, totalMs: 0, words: 0,
    byKind: { local: z(), cloud: z(), stack: z() },
    internetAnswers: 0, internetCalls: 0, privateAnswers: 0,
    up: 0, down: 0,
    perTarget: {}, // target -> { n, ms, up, down }
    eta: { actual: 0, expected: 0, n: 0 },
    byDay: {}, // yyyy-mm-dd -> answers
  };
  for (const c of chats || []) {
    for (const m of c.messages || []) {
      if (m.role !== 'assistant') continue;
      for (const alt of m.alts || []) {
        if (!alt.target || !alt.text) continue;
        const kind = usageKind(alt.target);
        const ms = Number(alt.ms) || 0;
        s.answers++; s.totalMs += ms; s.words += wordCount(alt.text);
        s.byKind[kind].n++; s.byKind[kind].ms += ms;
        const calls = (alt.toolCalls || []).filter(isInternetCall).length;
        s.internetCalls += calls;
        if (calls) s.internetAnswers++;
        if (kind !== 'cloud' && !calls) s.privateAnswers++;
        if (alt.rating === 'up') s.up++; else if (alt.rating === 'down') s.down++;
        const pt = (s.perTarget[alt.target] ||= { n: 0, ms: 0, up: 0, down: 0 });
        pt.n++; pt.ms += ms; if (alt.rating === 'up') pt.up++; else if (alt.rating === 'down') pt.down++;
        if (ms > 0 && typeof etaOf === 'function') { const e = etaOf(alt.target, wordCount(alt.text)); if (e != null && e > 0) { s.eta.actual += ms / 1000; s.eta.expected += e; s.eta.n++; } }
        const day = new Date(m.t || c.updated || Date.now()).toISOString().slice(0, 10);
        s.byDay[day] = (s.byDay[day] || 0) + 1;
      }
    }
  }
  return s;
}

let usageMedia = null;
const fmtHrs = (ms) => { const h = ms / 3.6e6; return h >= 1 ? `${h.toFixed(1)} h` : ms >= 60000 ? `${Math.round(ms / 60000)} min` : `${Math.max(0, Math.round(ms / 1000))} s`; };
const pct = (a, b) => (b ? Math.round((a / b) * 100) : 0);
const KIND_META = { local: ['💻 Your models (on this PC)', 'b-mint'], cloud: ['☁️ Cloud AIs', 'b-sky'], stack: ['⚗️ Teams (stacks & fusions)', 'b-lav'] };

function usageBar(rows, total, unit) {
  return `<div class="stack-v" style="gap:8px">${rows.map(([label, cls, val]) => {
    const p = pct(val, total);
    return `<div><div class="row small" style="justify-content:space-between"><span>${label}</span><span class="muted">${p}%${unit === 'ms' ? ` · ${fmtHrs(val)}` : ` · ${val.toLocaleString()}`}</span></div>
      <div class="bar" style="height:10px;background:var(--panel-2,rgba(127,127,127,.15));border-radius:6px;overflow:hidden"><i style="display:block;height:100%;width:${p}%" class="badge ${cls}"></i></div></div>`;
  }).join('')}</div>`;
}

views.usage = {
  html() {
    const s = usageStats(S.data.chats, typeof etaFor === 'function' ? etaFor : null);
    if (!s.answers) return `<div class="page"><div class="page-head"><h1>Usage</h1></div><div class="empty">No chats yet. Once you start using Quicksilver, this dashboard shows where your answers run (your PC vs the cloud), how much uses the internet, how long things take, and more — all worked out on this PC.</div></div>`;
    const tile = (big, label, sub) => `<div class="card" style="flex:1;min-width:150px"><div style="font-size:1.6rem;font-weight:700">${big}</div><div class="small">${label}</div>${sub ? `<div class="small muted">${sub}</div>` : ''}</div>`;
    const media = usageMedia;
    const mediaN = media ? media.length : null;
    const mediaByKind = media ? media.reduce((a, g) => { a[g.kind] = (a[g.kind] || 0) + 1; return a; }, {}) : {};
    // Expected vs actual.
    let etaLine = 'Not enough timed answers yet to compare.';
    if (s.eta.n >= 3) {
      const diff = pct(Math.abs(s.eta.actual - s.eta.expected), s.eta.expected);
      const faster = s.eta.actual <= s.eta.expected;
      etaLine = `Across ${s.eta.n} timed answer${s.eta.n === 1 ? '' : 's'}, they took <b>${fmtSec(s.eta.actual)}</b> in total versus an estimate of <b>${fmtSec(s.eta.expected)}</b> — about <b>${diff}% ${faster ? 'faster' : 'slower'}</b> than expected.`;
    }
    // Speed per kind.
    const avg = (k) => (s.byKind[k].n ? s.byKind[k].ms / s.byKind[k].n / 1000 : 0);
    const targets = Object.entries(s.perTarget).sort((a, b) => b[1].n - a[1].n).slice(0, 12);
    const days = Object.entries(s.byDay).sort((a, b) => (a[0] < b[0] ? -1 : 1)).slice(-14);
    const dayMax = Math.max(1, ...days.map(([, n]) => n));
    return `<div class="page">
      <div class="page-head"><h1>Usage <span class="small muted">worked out on this PC</span></h1></div>
      <p class="muted" style="margin:0 0 14px">A real picture of how you use Quicksilver — from your own chats, computed here, sent nowhere.</p>
      <div class="row" style="gap:10px;flex-wrap:wrap;margin-bottom:16px">
        ${tile(s.answers.toLocaleString(), 'answers', `${Object.keys(s.perTarget).length} model${Object.keys(s.perTarget).length === 1 ? '' : 's'}/teams used`)}
        ${tile(fmtHrs(s.totalMs), 'compute time', 'time spent generating answers')}
        ${tile(`${pct(s.privateAnswers, s.answers)}%`, 'fully private', 'on your PC, no internet')}
        ${tile(mediaN == null ? '…' : mediaN.toLocaleString(), 'pictures & videos made', mediaN == null ? 'loading' : Object.entries(mediaByKind).map(([k, v]) => `${v} ${k}`).join(' · '))}
      </div>
      <div class="row" style="gap:12px;flex-wrap:wrap;align-items:flex-start">
        <section class="card" style="flex:1;min-width:280px"><h3 style="margin:0 0 10px">Where your answers ran <span class="small muted">by count</span></h3>
          ${usageBar(Object.entries(KIND_META).map(([k, [l, c]]) => [l, c, s.byKind[k].n]), s.answers, 'n')}</section>
        <section class="card" style="flex:1;min-width:280px"><h3 style="margin:0 0 10px">Where the time went <span class="small muted">by compute time</span></h3>
          ${usageBar(Object.entries(KIND_META).map(([k, [l, c]]) => [l, c, s.byKind[k].ms]), s.totalMs || 1, 'ms')}</section>
      </div>
      <section class="card" style="margin-top:12px"><h3 style="margin:0 0 6px">🌐 Internet use</h3>
        <p class="small" style="margin:0 0 8px"><b>${pct(s.internetAnswers, s.answers)}%</b> of answers looked something up online (${s.internetAnswers.toLocaleString()} of ${s.answers.toLocaleString()}), with <b>${s.internetCalls.toLocaleString()}</b> web/picture/video lookups in all. The other <b>${pct(s.answers - s.internetAnswers, s.answers)}%</b> were answered without the internet.</p></section>
      <section class="card" style="margin-top:12px"><h3 style="margin:0 0 6px">⏱️ Speed: how long answers take</h3>
        <div class="row small" style="gap:18px;flex-wrap:wrap;margin:0 0 8px">
          <span>💻 Your models: <b>${avg('local') ? `${fmtSec(avg('local'))}/answer` : '—'}</b></span>
          <span>☁️ Cloud: <b>${avg('cloud') ? `${fmtSec(avg('cloud'))}/answer` : '—'}</b></span>
          <span>⚗️ Teams: <b>${avg('stack') ? `${fmtSec(avg('stack'))}/answer` : '—'}</b></span></div>
        <p class="small muted" style="margin:0"><b>Took vs should take:</b> ${etaLine}</p></section>
      <section class="card" style="margin-top:12px"><h3 style="margin:0 0 10px">By model / service</h3>
        <table class="list"><thead><tr><th>Model or team</th><th>Answers</th><th>Total time</th><th>Avg</th><th>👍 / 👎</th></tr></thead>
          <tbody>${targets.map(([t, v]) => `<tr><td><b>${esc(targetLabel(t) || t)}</b> <span class="badge ${KIND_META[usageKind(t)][1]}">${usageKind(t) === 'local' ? 'on PC' : usageKind(t) === 'cloud' ? 'cloud' : 'team'}</span></td><td>${v.n}</td><td>${fmtHrs(v.ms)}</td><td>${v.n && v.ms ? fmtSec(v.ms / v.n / 1000) : '—'}</td><td>${v.up}/${v.down}</td></tr>`).join('')}</tbody></table></section>
      ${days.length > 1 ? `<section class="card" style="margin-top:12px"><h3 style="margin:0 0 10px">Activity <span class="small muted">answers per day, last ${days.length}</span></h3>
        <div class="row" style="gap:4px;align-items:flex-end;height:80px">${days.map(([d, n]) => `<div title="${d}: ${n}" style="flex:1;display:flex;flex-direction:column;justify-content:flex-end;height:100%"><div class="badge b-mint" style="height:${Math.round((n / dayMax) * 100)}%;min-height:3px;border-radius:4px 4px 0 0"></div></div>`).join('')}</div>
        <div class="row small muted" style="justify-content:space-between;margin-top:4px"><span>${days[0][0].slice(5)}</span><span>${days[days.length - 1][0].slice(5)}</span></div></section>` : ''}
      <p class="small muted" style="margin:12px 0 0">Times are wall-clock for answers that recorded one; cached or instant replies count as 0. "Should take" is Quicksilver's own estimate for that model on this PC.</p>
    </div>`;
  },
  bind() {
    if (usageMedia === null) { usageMedia = []; qs.call('media:gallery').then((g) => { usageMedia = g || []; if (S.route.view === 'usage') render(); }).catch(() => {}); }
  },
};