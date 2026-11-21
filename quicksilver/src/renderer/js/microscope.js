// Microscope: look inside a model's generation token by token, and compare two models (for example
// two quantizations of the same one) to see exactly where they first diverge. Runs greedily on this
// PC and reads each token's probability and top alternatives from the model's own logprobs.
'use strict';

const microState = { a: '', b: '', prompt: 'List three facts about the Moon.', max: 48, running: false, res: null, err: '', status: '', pick: null };

// Pure: the index of the first token where two streams differ (or the shorter length if one is a
// prefix of the other). Returns { same, divergeAt, aLen, bLen, identical }.
function microDiff(a, b) {
  const A = (a || []).map((t) => t.token);
  const B = (b || []).map((t) => t.token);
  const n = Math.min(A.length, B.length);
  let i = 0;
  while (i < n && A[i] === B[i]) i++;
  const identical = i === A.length && i === B.length;
  const divergeAt = identical ? -1 : i; // -1 when fully identical
  return { same: i, divergeAt, aLen: A.length, bLen: B.length, identical };
}
const microEsc = (s) => String(s).replace(/ /g, '␣').replace(/\n/g, '⏎');
const pPct = (p) => (p == null ? '' : `${Math.round(p * 100)}%`);
// Colour by confidence: red (unsure) → amber → green (sure). hsl's slash-alpha gives a soft fill.
const microHue = (p) => Math.round(Math.max(0, Math.min(1, p == null ? 0.5 : p)) * 125);
const microFG = (p) => `hsl(${microHue(p)} 80% 52%)`;
const microBG = (p) => `hsl(${microHue(p)} 70% 50% / .16)`;
function microBar(p, strong = true) { if (p == null) return ''; const w = Math.max(3, Math.round(p * 100)); return `<span class="micro-bar"><i style="width:${w}%;background:${strong ? microFG(p) : 'rgba(136,136,136,.5)'}"></i></span>`; }
const microLegend = '<div class="micro-legend small muted"><span>How sure the model was at each word:</span><span class="micro-scale" title="red = unsure, green = sure"></span><span>unsure → sure</span></div>';

// The generated text, each word tinted and underlined by how confident the model was there.
function microStreamHTML(tokens) {
  return `<div class="micro-stream">${tokens.map((t, i) => `<button class="micro-tok ${microState.pick === i ? 'on' : ''}" data-micro-tok="${i}" title="${pPct(t.p)} sure" style="background:${microBG(t.p)};border-bottom:3px solid ${microFG(t.p)}">${esc(microEsc(t.token))}${t.p != null ? `<span class="micro-p">${pPct(t.p)}</span>` : ''}</button>`).join('')}</div>`;
}
// A bar chart of confidence across the whole answer: taller + greener = surer. Click a bar to inspect.
function microConfChart(tokens) {
  return `<div class="micro-chart" title="Confidence per word — taller and greener = surer; click a bar">${tokens.map((t, i) => `<span class="micro-cbar ${microState.pick === i ? 'on' : ''}" data-micro-tok="${i}" title="Word ${i + 1} “${esc(microEsc(t.token))}” · ${pPct(t.p)}" style="height:${Math.max(4, Math.round((t.p ?? 0) * 100))}%;background:${microFG(t.p)}"></span>`).join('')}</div>`;
}
// The handful of least-confident words — the moments the model nearly went another way.
function microLows(tokens) {
  const lows = tokens.map((t, i) => ({ i, p: t.p ?? 1, token: t.token })).filter((x) => x.p < 0.85).sort((a, b) => a.p - b.p).slice(0, 6);
  if (!lows.length) return '';
  return `<div class="micro-lows"><span class="small muted">⚠️ Where it was least sure (the forks in the road):</span> ${lows.map((x) => `<button class="micro-lowchip" data-micro-tok="${x.i}" style="border-color:${microFG(x.p)}">“${esc(microEsc(x.token))}” <b>${pPct(x.p)}</b></button>`).join('')}</div>`;
}
// The per-token detail: what the model wrote and the runners-up it weighed, as bars.
function microDetail(tok) {
  if (!tok) return '';
  return `<div class="micro-detail"><div class="small" style="margin-bottom:6px">It wrote <b style="color:${microFG(tok.p)}">“${esc(microEsc(tok.token))}”</b>${tok.p != null ? ` and was <b>${pPct(tok.p)}</b> sure` : ''}. The words it weighed:</div>
    ${(tok.top || []).length ? `<div class="micro-alts">${tok.top.map((c) => `<div class="micro-alt ${c.token === tok.token ? 'chosen' : ''}"><code>${esc(microEsc(c.token))}</code>${microBar(c.p, c.token === tok.token)}<span class="micro-alt-p">${pPct(c.p)}</span></div>`).join('')}</div>` : '<div class="small muted">No alternatives reported.</div>'}</div>`;
}

function microCompareHTML(res) {
  const a = res.a, b = res.b;
  if (!b) {
    const sel = microState.pick;
    return `${microLegend}
      ${microStreamHTML(a.tokens)}
      <h4 class="small micro-h">Confidence as it wrote <span class="muted">· taller &amp; greener = surer · click a bar</span></h4>
      ${microConfChart(a.tokens)}
      ${microLows(a.tokens)}
      <div class="micro-detail-wrap">${sel != null && a.tokens[sel] ? microDetail(a.tokens[sel]) : '<p class="small muted">Click a word above, a bar in the chart, or a “least sure” chip to see the alternatives the model weighed at that step.</p>'}</div>`;
  }
  const d = microDiff(a.tokens, b.tokens);
  const n = Math.max(a.tokens.length, b.tokens.length);
  const agreePct = Math.round((d.same / Math.max(1, n)) * 100);
  const cell = (tok, i, side) => `<button class="micro-tok ${microState.pick === i ? 'on' : ''} ${i < d.same ? 'same' : i === d.divergeAt ? 'diverge' : 'after'}" data-micro-tok="${i}" data-micro-side="${side}" title="${tok ? `${pPct(tok.p)} sure` : ''}" style="${tok ? `background:${i === d.divergeAt ? 'rgba(224,65,106,.18)' : microBG(tok.p)};border-bottom:3px solid ${i === d.divergeAt ? '#e0416a' : microFG(tok.p)}` : ''}">${tok ? esc(microEsc(tok.token)) : '—'}</button>`;
  const rows = [];
  for (let i = 0; i < n; i++) rows.push(`<tr class="${i === d.divergeAt ? 'micro-diverge-row' : ''}"><td class="small muted">${i + 1}</td><td>${cell(a.tokens[i], i, 'a')}</td><td>${cell(b.tokens[i], i, 'b')}</td></tr>`);
  const summary = d.identical ? `✅ Identical — both models produced the same ${d.aLen} words, letter for letter.`
    : `🔀 They agree for the first <b>${d.same}</b> word${d.same === 1 ? '' : 's'}, then split at word <b>${d.divergeAt + 1}</b>.`;
  const sel = microState.pick;
  return `<div class="notice ${d.identical ? 'info' : ''}" style="margin:0 0 10px">${summary}</div>
    ${!d.identical ? `<div class="micro-agree" title="How far the two models agreed before they split"><div class="micro-agree-fill" style="width:${agreePct}%"></div><span class="micro-agree-label">agree for ${agreePct}%, then split</span></div>
    <div class="micro-split">${['a', 'b'].map((s) => { const m = s === 'a' ? a : b; const tk = m.tokens[d.divergeAt]; return `<div class="micro-split-side"><span class="micro-split-tag ${s}">${s.toUpperCase()}</span> <b>${esc(m.model)}</b> chose <b style="color:${microFG(tk?.p)}">“${esc(microEsc(tk?.token ?? ''))}”</b> <span class="muted">(${pPct(tk?.p)})</span></div>`; }).join('')}</div>` : ''}
    <div class="micro-grid"><table class="list micro-table"><thead><tr><th>#</th><th>${esc(a.model)} (A)</th><th>${esc(b.model)} (B)</th></tr></thead><tbody>${rows.join('')}</tbody></table>
    <div class="micro-side">${sel != null ? `<div class="stack-v" style="gap:10px"><div><div class="small muted" style="margin-bottom:4px">A · ${esc(a.model)}</div>${microDetail(a.tokens[sel])}</div><div><div class="small muted" style="margin-bottom:4px">B · ${esc(b.model)}</div>${microDetail(b.tokens[sel])}</div></div>` : '<p class="small muted">Click a token row to compare what each model weighed at that step.</p>'}</div></div>`;
}

function microOptions(exclude) {
  const list = (S.installed || []).filter((m) => m.kind !== 'image' && m.kind !== 'video' && m.kind !== 'audio');
  return list.map((m) => `<option value="${esc(m.id)}" ${exclude === m.id ? 'disabled' : ''}>${esc(m.name)}</option>`).join('');
}

views.microscope = {
  html() {
    const installed = (S.installed || []).filter((m) => m.kind !== 'image' && m.kind !== 'video' && m.kind !== 'audio');
    return `<div class="page">
      <div class="page-head"><h1>🔬 Microscope <span class="small muted">inside the model, token by token</span></h1></div>
      <p class="muted" style="margin:0 0 14px">Watch a model generate one token at a time — the word it picked, how sure it was, and the runners-up — and put two models side by side (say two quantizations of the same one) to see exactly where they start to disagree. Runs on this PC.</p>
      ${installed.length < 1 ? '<div class="empty">Install at least one model (Models) to use the Microscope.</div>' : `
      <section class="card" style="margin:0 0 14px"><div class="grid2" style="gap:12px;align-items:end">
        <div class="field"><label for="mi-a">Model A</label><select id="mi-a">${microOptions(microState.b)}</select></div>
        <div class="field"><label for="mi-b">Model B <span class="small muted">(optional — compare)</span></label><select id="mi-b"><option value="">— none (look inside A only) —</option>${microOptions(microState.a)}</select></div>
      </div>
        <div class="field" style="margin-top:10px"><label for="mi-prompt">Prompt</label><textarea id="mi-prompt" rows="2">${esc(microState.prompt)}</textarea></div>
        <div class="row" style="gap:12px;align-items:center;margin-top:8px"><label class="small">Tokens to generate <b id="mi-max-v">${microState.max}</b></label><input type="range" id="mi-max" min="8" max="200" step="8" value="${microState.max}" style="max-width:240px">
          <span class="grow"></span><button class="btn primary" id="mi-run" ${microState.running ? 'disabled' : ''}>${microState.running ? 'Running…' : '🔬 Run'}</button></div>
        ${microState.status ? `<div class="small muted" style="margin-top:8px">${esc(microState.status)}</div>` : ''}
      </section>
      ${microState.err ? `<div class="notice" style="border-color:#e0416a;background:rgba(224,65,106,.1)">⚠ ${esc(microState.err)}</div>` : ''}
      ${microState.res ? microCompareHTML(microState.res) : (!microState.running ? '<p class="small muted">Pick a model (and optionally a second to compare), type a prompt, and press Run. Greedy decoding (temperature 0) makes the comparison exact.</p>' : '')}`}
    </div>`;
  },
  bind() {
    if (!microState.a && (S.installed || []).length) microState.a = S.installed.find((m) => m.kind !== 'image' && m.kind !== 'video' && m.kind !== 'audio')?.id || '';
    const aSel = document.getElementById('mi-a'); if (aSel) { aSel.value = microState.a; aSel.addEventListener('change', () => { microState.a = aSel.value; render(); }); }
    const bSel = document.getElementById('mi-b'); if (bSel) { bSel.value = microState.b; bSel.addEventListener('change', () => { microState.b = bSel.value; render(); }); }
    const pr = document.getElementById('mi-prompt'); if (pr) pr.addEventListener('input', () => { microState.prompt = pr.value; });
    const mx = document.getElementById('mi-max'); if (mx) mx.addEventListener('input', () => { microState.max = Number(mx.value); document.getElementById('mi-max-v').textContent = mx.value; });
    document.querySelectorAll('[data-micro-tok]').forEach((b) => b.addEventListener('click', () => { microState.pick = Number(b.dataset.microTok); render(); }));
    document.getElementById('mi-run')?.addEventListener('click', microRun);
  },
};

async function microRun() {
  if (!microState.a) { toast('Pick model A first.'); return; }
  microState.running = true; microState.err = ''; microState.res = null; microState.pick = null; microState.status = 'Loading the model…'; render();
  try {
    const a = await qs.call('microscope:tokens', microState.a, microState.prompt, { maxTokens: microState.max });
    let b = null;
    if (microState.b && microState.b !== microState.a) { microState.status = `Running ${a.model}… now the second model.`; render(); b = await qs.call('microscope:tokens', microState.b, microState.prompt, { maxTokens: microState.max }); }
    microState.res = { a, b }; microState.status = '';
  } catch (e) { microState.err = e.message || String(e); }
  microState.running = false; render();
}
