// Benchmark a model objectively: run it on public tests with checkable answers (GSM8K math,
// IFEval instructions, HumanEval code) and show a measured score out of 10. Backend: quality.js.
'use strict';

let bmSel = '';
const bmSets = { gsm8k: true, ifeval: true, humaneval: true };
let bmN = 15;
let bmRunning = false;
let bmSetsInfo = null;
let bmListener = false;

function bmResultsHTML(entry) {
  if (!entry) return '<p class="small muted" style="margin-top:12px">No benchmark yet for this model — pick tests and press Run.</p>';
  const r = entry.results || {};
  const rows = Object.entries(r).map(([k, v]) => `<tr><td>${esc(v.label || k)}</td><td>${v.pct == null ? `<span class="small muted">${esc(v.unavailable || v.error || 'n/a')}</span>` : `<b>${v.pct}%</b> <span class="small muted">(${v.correct}/${v.of}${v.skipped ? `, ${v.skipped} skipped` : ''})</span>`}</td><td>${v.score != null ? `<span class="badge b-mint">${v.score}/10</span>` : ''}</td></tr>`).join('');
  const scores = Object.values(r).map((v) => v.score).filter((x) => x != null);
  const avg = scores.length ? (scores.reduce((a, b) => a + b, 0) / scores.length).toFixed(1) : null;
  return `<div style="margin-top:14px"><table class="list"><thead><tr><th>Test</th><th>Accuracy</th><th>Score</th></tr></thead><tbody>${rows}</tbody></table>${avg != null ? `<p style="margin-top:8px">Measured quality: <span class="badge b-mint" style="font-size:1rem">${avg}/10</span> <span class="small muted">· ${new Date(entry.at).toLocaleString()} · ${entry.n} questions each</span></p>` : ''}</div>`;
}
function bmLeaderboardHTML(stored) {
  const rows = Object.entries(stored).map(([target, e]) => {
    const scores = Object.values(e.results || {}).map((v) => v.score).filter((x) => x != null);
    const avg = scores.length ? scores.reduce((a, b) => a + b, 0) / scores.length : -1;
    const t = (S.targets || []).find((x) => x.target === target);
    return { name: t ? t.label : target, avg, when: e.at };
  }).filter((x) => x.avg >= 0).sort((a, b) => b.avg - a.avg);
  if (!rows.length) return '';
  return `<table class="list"><thead><tr><th>Model</th><th>Measured quality</th><th>When</th></tr></thead><tbody>${rows.map((x) => `<tr><td>${esc(x.name)}</td><td><span class="badge b-mint">${x.avg.toFixed(1)}/10</span></td><td class="small muted">${new Date(x.when).toLocaleDateString()}</td></tr>`).join('')}</tbody></table>`;
}

async function runBenchmark() {
  const sets = Object.keys(bmSets).filter((s) => bmSets[s]);
  if (!sets.length) { toast('Pick at least one test.'); return; }
  if (!bmSel) { toast('Pick a model.'); return; }
  bmRunning = true; render();
  try {
    const r = await qs.call('quality:run', { target: bmSel, sets, n: bmN });
    S.qbench = S.qbench || {}; S.qbench[bmSel] = { at: Date.now(), n: bmN, results: r.results };
    toast('Benchmark done.');
  } catch (err) { toast(err.message, 8000); }
  finally { bmRunning = false; render(); }
}

views.benchmark = {
  html() {
    const targets = (S.targets || []).filter((t) => !t.target.startsWith('kb:'));
    if ((!bmSel || !targets.some((t) => t.target === bmSel)) && targets[0]) bmSel = targets[0].target;
    const stored = S.qbench || {};
    return `<div class="page">
      <div class="page-head"><h1>Benchmark a model</h1></div>
      <p class="lede">Measure a model's real quality by running it on public tests with checkable answers — math (GSM8K), instruction-following (IFEval) and code (HumanEval). You get a score out of 10 you can trust, not an estimate. A local model is free but slower; a cloud model uses a handful of calls.</p>
      <div class="card">
        <div class="row" style="gap:14px;flex-wrap:wrap;align-items:flex-end">
          <div class="field" style="min-width:220px"><label for="bm-model">Model or team</label><select id="bm-model">${targets.map((t) => `<option value="${esc(t.target)}" ${t.target === bmSel ? 'selected' : ''}>${esc(t.label)}</option>`).join('')}</select></div>
          <div class="field"><label>Tests</label><div class="row" style="gap:14px">${['gsm8k', 'ifeval', 'humaneval'].map((s) => `<label class="row" style="gap:6px;cursor:pointer"><input type="checkbox" data-bm-set="${s}" ${bmSets[s] ? 'checked' : ''}> ${esc((bmSetsInfo && bmSetsInfo[s] && bmSetsInfo[s].label) || s)}${bmSetsInfo && bmSetsInfo[s] && bmSetsInfo[s].needsPython && !bmSetsInfo[s].hasPython ? ' <span class="small muted">(needs Python)</span>' : ''}</label>`).join('')}</div></div>
          <div class="field" style="max-width:170px"><label for="bm-n">Questions each: <b id="bm-nlab">${bmN}</b></label><input type="range" id="bm-n" min="5" max="40" step="5" value="${bmN}"></div>
          <button class="btn primary" id="bm-run" ${bmRunning ? 'disabled' : ''}>${bmRunning ? 'Running…' : 'Run benchmark'}</button>
        </div>
        <div id="bm-progress" class="notice info" style="margin:12px 0 0;${bmRunning ? '' : 'display:none'}">Starting…</div>
        <div id="bm-results">${bmResultsHTML(stored[bmSel])}</div>
      </div>
      ${Object.keys(stored).length ? `<div class="section sf-new"><h2>Leaderboard</h2><span class="small muted">Models you've benchmarked, best measured quality first.</span></div>${bmLeaderboardHTML(stored)}` : ''}
    </div>`;
  },
  bind() {
    if (!bmSetsInfo) qs.call('quality:sets').then((s) => { bmSetsInfo = s; if (S.route.view === 'benchmark') render(); }).catch(() => {});
    if (S.qbench === undefined) { S.qbench = {}; qs.call('quality:get').then((q) => { S.qbench = q || {}; if (S.route.view === 'benchmark') render(); }).catch(() => {}); }
    if (!bmListener && qs.onQuality) { bmListener = true; qs.onQuality((p) => { if (!bmRunning) return; const el = document.getElementById('bm-progress'); if (el) { el.style.display = ''; el.innerHTML = `Testing <b>${esc(p.label)}</b>… ${p.done}/${p.total}`; } }); }
    $('#bm-model') && $('#bm-model').addEventListener('change', (e) => { bmSel = e.target.value; render(); });
    $$('[data-bm-set]').forEach((b) => b.addEventListener('change', (e) => { bmSets[e.target.dataset.bmSet] = e.target.checked; }));
    $('#bm-n') && $('#bm-n').addEventListener('input', (e) => { bmN = +e.target.value; const l = document.getElementById('bm-nlab'); if (l) l.textContent = bmN; });
    $('#bm-run') && $('#bm-run').addEventListener('click', runBenchmark);
  },
};
