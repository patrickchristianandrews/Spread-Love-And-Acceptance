// Settings → Usage: what did the work (the models on this PC, cloud AIs, the web), how many hours
// it took, and the time things took against the time they should have taken. The numbers come
// from the main process (main/usage.js), which keeps counts and timings only, on this PC.
'use strict';

let usageDays = 30;
let usageData = null;
const U_SRC = { local: 'On this PC', cloud: 'Cloud', web: 'Web search' };
const U_RANGES = [[7, '7 days'], [30, '30 days'], [90, '90 days'], [0, 'All time']];

// 42 s · 12 min · 3 h 20 min
function uDur(ms) {
  const s = Math.round((ms || 0) / 1000);
  if (s < 1) return ms > 0 ? 'under 1 s' : '0 s';
  if (s < 90) return `${s} s`;
  const m = Math.round(s / 60);
  if (m < 90) return `${m} min`;
  const h = Math.floor(m / 60);
  return m % 60 ? `${h} h ${m % 60} min` : `${h} h`;
}
const uHours = (ms) => { const h = (ms || 0) / 36e5; return h >= 10 ? Math.round(h).toLocaleString() : h >= 1 ? (Math.round(h * 10) / 10).toLocaleString() : (Math.round(h * 100) / 100).toLocaleString(); };
const uNum = (n) => Math.round(n || 0).toLocaleString();
const uPct = (p) => (p <= 0 ? '0%' : p < 1 ? 'under 1%' : `${Math.round(p)}%`);
const uSpeed = (w) => (w ? `${w >= 10 ? Math.round(w) : Math.round(w * 10) / 10} words/s` : '—');
const uDay = (key, opts = { weekday: 'short', day: 'numeric', month: 'short' }) => new Date(`${key}T12:00:00`).toLocaleDateString(undefined, opts);

const usageSetHTML = () => '<div class="usage" id="usage-box"><p class="muted">Adding up your usage…</p></div>';
async function bindUsage() {
  try { usageData = await qs.call('usage:summary', usageDays); } catch (err) { usageData = null; const b = $('#usage-box'); if (b) b.innerHTML = `<div class="notice">Could not read the usage statistics: ${esc(err.message)}</div>`; return; }
  const box = $('#usage-box');
  if (!box) return; // the user moved on while the numbers were being added up
  box.innerHTML = usageHTML(usageData);
  $$('[data-usage-days]', box).forEach((b) => b.addEventListener('click', () => { usageDays = Number(b.dataset.usageDays); bindUsage(); }));
  $('#usage-on', box)?.addEventListener('change', async (e) => { await qs.call('usage:enable', e.target.checked); toast(e.target.checked ? 'Usage statistics are on.' : 'Usage statistics are off. Nothing new is counted.'); bindUsage(); });
  $('#usage-clear', box)?.addEventListener('click', async () => {
    if (!(await confirmBox('Clear all usage statistics? The counts and timings on this page start again from zero. Your chats and models are not touched.', { yes: 'Clear' }))) return;
    await qs.call('usage:clear'); toast('Usage statistics cleared.'); bindUsage();
  });
  bindUsageTips(box);
}

// One whole split into parts (who did the work). Each part's share is printed in the key beside it.
function uSplit(title, parts, note) {
  const shown = Object.entries(parts).filter(([, v]) => v > 0);
  if (!shown.length) return '';
  return `<div class="u-split"><div class="u-split-head"><b>${title}</b>${note ? `<span class="help">${note}</span>` : ''}</div>
    <div class="u-seg" role="img" aria-label="${esc(shown.map(([k, v]) => `${U_SRC[k]} ${uPct(v)}`).join(', '))}">${shown.map(([k, v]) => `<i class="u-${k}" style="flex:${Math.max(v, 1.5)}" data-u-tip="${esc(`${U_SRC[k]}: ${uPct(v)}`)}"></i>`).join('')}</div>
    <div class="u-key">${Object.entries(parts).map(([k, v]) => `<span><i class="u-dot u-${k}"></i>${U_SRC[k]} <b>${uPct(v)}</b></span>`).join('')}</div></div>`;
}
// Two or three lengths to compare (the time it took against the time it should have taken).
function uBars(rows) {
  const max = Math.max(...rows.map((r) => r.ms), 1);
  return `<div class="u-bars">${rows.map((r) => `<div class="u-bar-row"><span class="u-bar-name">${r.label}</span><span class="u-bar-track"><i class="${r.cls || 'u-plain'}" style="width:${Math.max((r.ms / max) * 100, 0.8)}%"></i></span><b class="u-bar-val">${uDur(r.ms)}</b></div>`).join('')}</div>`;
}

// Time spent per day (or per week over a long range), stacked by what did the work.
function uTimeline(daily) {
  const weekly = daily.length > 45;
  const cols = [];
  if (weekly) {
    for (let i = 0; i < daily.length; i += 7) {
      const w = daily.slice(i, i + 7);
      cols.push({ label: `Week of ${uDay(w[0].day, { day: 'numeric', month: 'short' })}`, short: uDay(w[0].day, { day: 'numeric', month: 'short' }), local: w.reduce((s, d) => s + d.local, 0), cloud: w.reduce((s, d) => s + d.cloud, 0), web: w.reduce((s, d) => s + d.web, 0), q: w.reduce((s, d) => s + d.q, 0) });
    }
  } else for (const d of daily) cols.push({ label: uDay(d.day), short: uDay(d.day, { day: 'numeric', month: 'short' }), local: d.local, cloud: d.cloud, web: d.web, q: d.q });
  const max = Math.max(...cols.map((c) => c.local + c.cloud + c.web), 1);
  // A round number at the top of the scale, so the one gridline label is easy to read.
  // (Each step halves to a round number too, for the middle line.)
  const steps = [10, 20, 60, 120, 240, 600, 1200, 1800, 3600, 7200, 14400, 28800, 43200, 86400, 172800, 345600, 604800];
  const top = (steps.find((sec) => sec * 1000 >= max) || Math.ceil(max / 72e5) * 7200) * 1000;
  const every = Math.max(1, Math.ceil(cols.length / 6));
  return `<div class="u-chart"><div class="u-axis"><span>${uDur(top)}</span><span>${uDur(top / 2)}</span><span>0</span></div>
    <div class="u-plot"><div class="u-grid"><i></i><i></i><i></i></div>
      <div class="u-cols">${cols.map((c, i) => {
    const total = c.local + c.cloud + c.web;
    const tip = total ? `${c.label}: ${uDur(total)}${c.q ? ` · ${uNum(c.q)} question${c.q === 1 ? '' : 's'}` : ''}\n${['local', 'cloud', 'web'].filter((k) => c[k]).map((k) => `${U_SRC[k]} ${uDur(c[k])}`).join(' · ')}` : `${c.label}: nothing`;
    return `<div class="u-col" data-u-tip="${esc(tip)}" tabindex="0" aria-label="${esc(tip.replace('\n', '. '))}"><div class="u-stack" style="height:${(total / top) * 100}%">${['web', 'cloud', 'local'].filter((k) => c[k]).map((k) => `<i class="u-${k}" style="flex:${c[k]}"></i>`).join('')}</div>${i % every === 0 ? `<span class="u-tick">${esc(c.short)}</span>` : ''}</div>`;
  }).join('')}</div></div></div>
    <div class="u-key">${['local', 'cloud', 'web'].map((k) => `<span><i class="u-dot u-${k}"></i>${U_SRC[k]}</span>`).join('')}<span class="help">${weekly ? 'One column per week.' : 'One column per day.'} Point at a column for its numbers.</span></div>`;
}

function usageHTML(u) {
  const ranges = `<div class="row u-ranges">${U_RANGES.map(([d, l]) => `<button class="btn small ${usageDays === d ? 'on' : ''}" data-usage-days="${d}">${l}</button>`).join('')}</div>`;
  const controls = `<div class="card set-card u-controls"><h3>🔒 Kept on this PC</h3>
    <p class="help" style="margin-top:0">These statistics are counts and timings only: how many answers, how many words, how long. What you asked and what was answered is never part of them, and nothing here is sent anywhere. They are kept for about a year.</p>
    <label class="row"><input type="checkbox" id="usage-on" ${u.enabled ? 'checked' : ''}> <span><b>Keep usage statistics</b> <span class="help">Turn off to stop counting. What is already here stays until you clear it.</span></span></label>
    <div><button class="btn danger" id="usage-clear">Clear usage statistics</button></div></div>`;
  const lede = '<p class="lede" style="margin-top:0">What did the work, how long it took, and how that compares with the time it should have taken on this PC.</p>';
  const empty = !u.ms && !u.questions;
  if (empty) {
    return `${lede}${ranges}<div class="notice info" id="usage-empty" style="margin:14px 0">${u.enabled ? `Nothing counted ${u.days ? `in the last ${u.days} days` : 'yet'}. Ask something in a chat, and this page fills in: the share of the work your own models did against cloud AIs and the web, the hours, and the speed against what this PC was expected to manage.` : 'Usage statistics are off, so there is nothing to show. Turn them on below to start counting.'}</div>${controls}`;
  }
  const L = u.totals.local; const C = u.totals.cloud;
  const madeN = u.made.image + u.made.video + u.made.audio;
  const tiles = [
    ['Time spent working', uDur(u.ms), `${uHours(u.ms)} hours across ${uNum(u.activeDays)} day${u.activeDays === 1 ? '' : 's'}`],
    ['Questions answered', uNum(u.questions), u.questions ? `about ${uDur(u.avgQuestionMs)} each, start to finish` : 'in chats'],
    ['Words written', uNum(u.words.local + u.words.cloud), `${uNum(u.runs)} model run${u.runs === 1 ? '' : 's'}`],
    ['Web searches', uNum(u.searches), u.searches ? `${uDur(u.totals.web.ms)} in all` : 'none yet'],
    ...(madeN ? [['Pictures, videos & music', uNum(madeN), [u.made.image && `${uNum(u.made.image)} picture${u.made.image === 1 ? '' : 's'}`, u.made.video && `${uNum(u.made.video)} video${u.made.video === 1 ? '' : 's'}`, u.made.audio && `${uNum(u.made.audio)} track${u.made.audio === 1 ? '' : 's'}`].filter(Boolean).join(', ')]] : []),
  ];

  // The time it took against the time it should have taken (models on this PC).
  let expected = '<p class="help">This fills in once a model on this PC has written a few answers. Quicksilver estimates each model\'s speed from this PC\'s graphics card and memory; here that estimate is set against what really happened.</p>';
  if (u.expected) {
    const r = u.expected.ratio;
    const off = Math.round(Math.abs(1 - r) * 100);
    const verdict = off < 5 ? 'Right on the estimate.' : r < 1 ? `${off}% less time than expected.` : `${off}% more time than expected.`;
    const why = off < 5 ? 'Your models are writing at the speed this PC was expected to manage.' : r < 1 ? 'Your models are writing faster than this PC\'s estimate.' : 'Your models are writing slower than this PC\'s estimate. Other programs using the graphics card or memory, a model that only partly fits on the card, or power-saving mode are the usual reasons.';
    expected = `${uBars([{ label: 'Time it took', ms: u.expected.actualMs, cls: 'u-local' }, { label: 'Time it should take', ms: u.expected.expectedMs }])}
      <p class="u-verdict"><b>${verdict}</b> <span class="muted">${why}</span></p>
      <p class="help">Writing time only, for the models on this PC, over the same ${uNum(Math.round(L.tok * 0.75))} words. "Should take" is the estimate Quicksilver made for each model from this PC's graphics card and memory.</p>`;
  }
  const waits = u.wait.local || u.wait.cloud ? `<div class="u-facts">${u.wait.local ? `<div><span class="muted">Wait before the first word, on this PC</span><b>${uDur(u.wait.local)}</b></div>` : ''}${u.wait.cloud ? `<div><span class="muted">Wait before the first word, cloud</span><b>${uDur(u.wait.cloud)}</b></div>` : ''}</div><p class="help">The wait is loading the model and reading your question (on this PC), or the trip to the service and its queue (cloud).</p>` : '';

  // This PC against the cloud, from your own measured speeds.
  let versus = '';
  if (u.speed.local || u.speed.cloud) {
    const facts = `<div class="u-facts"><div><span class="muted">Writing speed on this PC</span><b>${uSpeed(u.speed.local)}</b></div><div><span class="muted">Writing speed in the cloud</span><b>${uSpeed(u.speed.cloud)}</b></div></div>`;
    const swap = u.swap ? `${uBars([
      { label: 'What this PC wrote', ms: u.swap.localWritingMs, cls: 'u-local' },
      { label: 'The same at cloud speed', ms: u.swap.localAtCloudSpeedMs, cls: 'u-cloud' },
    ])}<p class="help">${u.swap.localAtCloudSpeedMs < u.swap.localWritingMs ? `The cloud would have written those ${uNum(u.words.local)} words about ${uDur(u.swap.localWritingMs - u.swap.localAtCloudSpeedMs)} sooner. Keeping them on this PC meant they never left it, cost nothing and worked offline.` : `This PC wrote those ${uNum(u.words.local)} words about ${uDur(u.swap.localAtCloudSpeedMs - u.swap.localWritingMs)} sooner than the cloud would have, and they never left it.`}</p>
      ${uBars([
    { label: 'What the cloud wrote', ms: u.swap.cloudWritingMs, cls: 'u-cloud' },
    { label: 'The same on this PC', ms: u.swap.cloudAtLocalSpeedMs, cls: 'u-local' },
  ])}<p class="help">${u.swap.cloudAtLocalSpeedMs > u.swap.cloudWritingMs ? `Writing the cloud's ${uNum(u.words.cloud)} words on this PC would have taken about ${uDur(u.swap.cloudAtLocalSpeedMs - u.swap.cloudWritingMs)} longer.` : `This PC would have written the cloud's ${uNum(u.words.cloud)} words about ${uDur(u.swap.cloudWritingMs - u.swap.cloudAtLocalSpeedMs)} sooner.`} Both comparisons use the speeds measured here, and cloud models are usually larger than the ones that fit on a PC.</p>` : `<p class="help">${u.speed.local ? 'Use a cloud AI for a few answers' : 'Use a model on this PC for a few answers'} and a side-by-side comparison of the time each would have taken appears here.</p>`;
    versus = `<section class="card u-card"><h3>This PC against the cloud</h3>${facts}${swap}</section>`;
  }

  const kinds = { text: 'Answers', image: 'Pictures', video: 'Videos', audio: 'Music', search: 'Searches' };
  const table = `<section class="card u-card"><h3>By model</h3>
    <div class="u-table-wrap"><table class="u-table"><thead><tr><th>Model</th><th>Where</th><th class="num">Runs</th><th class="num">Words</th><th class="num">Speed</th><th class="num">Expected speed</th><th class="num">Time</th></tr></thead>
    <tbody>${u.models.map((m) => `<tr><td><i class="u-dot u-${m.source}"></i>${esc(m.name)}</td><td>${U_SRC[m.source]}</td><td class="num" title="${kinds[m.kind] || ''}">${uNum(m.n)}</td><td class="num">${m.words ? uNum(m.words) : '—'}</td><td class="num">${uSpeed(m.wps)}</td><td class="num">${m.expectedWps ? `${uSpeed(m.expectedWps)}` : '—'}</td><td class="num">${uDur(m.ms)}</td></tr>`).join('')}</tbody></table></div>
    <p class="help">A run is one time a model wrote something. One question can take several runs when a team of models answers it. Expected speed is this PC's estimate for that model.</p></section>`;

  return `${lede}${ranges}
    <div class="u-tiles">${tiles.map(([l, v, s]) => `<div class="u-tile"><span class="u-tile-label">${l}</span><span class="u-tile-value">${v}</span><span class="u-tile-sub">${s}</span></div>`).join('')}</div>
    <section class="card u-card" id="usage-share"><h3>What did the work</h3>
      ${uSplit('By time spent', u.share.time, `${uDur(L.ms)} on this PC · ${uDur(C.ms)} cloud · ${uDur(u.totals.web.ms)} web`)}
      ${uSplit('By words written', { local: u.share.words.local, cloud: u.share.words.cloud }, `${uNum(u.words.local)} on this PC · ${uNum(u.words.cloud)} cloud`)}
      ${uSplit('By number of requests', u.share.requests, `${uNum(L.n)} on this PC · ${uNum(C.n)} cloud · ${uNum(u.totals.web.n)} web`)}
    </section>
    <section class="card u-card" id="usage-expected"><h3>The time it took against the time it should take</h3>${expected}${waits}</section>
    ${versus}
    <section class="card u-card"><h3>Time spent, ${u.days ? `last ${u.days} days` : 'all time'}</h3>${uTimeline(u.daily)}</section>
    ${table}
    ${controls}`;
}

// A small box that follows the pointer over a chart part (and shows on keyboard focus).
function bindUsageTips(box) {
  let tip = $('#u-tip');
  if (!tip) { tip = document.createElement('div'); tip.id = 'u-tip'; tip.className = 'u-tip'; tip.hidden = true; document.body.appendChild(tip); }
  const show = (el, x, y) => {
    tip.textContent = el.dataset.uTip; tip.hidden = false;
    const r = tip.getBoundingClientRect();
    tip.style.left = `${Math.max(8, Math.min(window.innerWidth - r.width - 8, x + 12))}px`;
    tip.style.top = `${Math.max(8, y - r.height - 10)}px`;
  };
  const hide = () => { tip.hidden = true; };
  $$('[data-u-tip]', box).forEach((el) => {
    el.addEventListener('mousemove', (e) => show(el, e.clientX, e.clientY));
    el.addEventListener('mouseleave', hide);
    el.addEventListener('focus', () => { const r = el.getBoundingClientRect(); show(el, r.left + r.width / 2, r.top); });
    el.addEventListener('blur', hide);
  });
}
