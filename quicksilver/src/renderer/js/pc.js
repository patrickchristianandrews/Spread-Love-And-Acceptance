// Your PC: what this computer has, and how every model will run on it.
'use strict';

let benchState = null; // null | 'running' | result

views.pc = {
  html() {
    const e = S.est;
    if (!e) return '<div class="page"><h1>Your PC</h1><div class="empty">Checking your hardware…</div></div>';
    const h = e.hardware;
    const engine = h.gpus?.[0]?.backend || (h.vramGB ? (h.nvidia ? 'CUDA / Vulkan' : 'Vulkan') : 'Processor');
    const max = Math.max(...Object.values(e.text).map((x) => x.wordsPerSec || 0), 1);
    const scale = (w) => Math.min(100, Math.round((Math.log10(1 + w) / Math.log10(1 + max)) * 100));
    const colour = { great: '#3fbf86', good: '#4f8fe0', ok: '#d9b22b', slow: '#e8834a', wont: '#d6467a' };
    const textRows = [...S.catalog.text].sort((a, b) => (e.text[b.id].wordsPerSec || 0) - (e.text[a.id].wordsPerSec || 0));
    const where = { gpu: '🎮 Graphics card', split: '🎮+🧠 Card + memory', cpu: '🧠 Processor', no: '—' };
    return `<div class="page">
      <div class="page-head"><h1>Your PC</h1><button class="btn" id="rescan">↻ Check again</button></div>
      <p class="lede">What decides AI speed is <b>memory</b>: how much there is and how fast it is. A model runs fastest when it fits entirely in your graphics card's own memory; if it doesn't fit, part of it runs from system memory, which is slower.</p>
      <div class="kv">
        <div class="card"><div class="k">Memory (RAM)</div><div class="v">${h.ramGB.toFixed(0)} GB</div></div>
        <div class="card"><div class="k">Graphics card</div><div class="v" style="font-size:.98rem">${esc(h.gpuName || 'None')}</div></div>
        <div class="card"><div class="k">Video memory</div><div class="v">${h.vramGB ? `${h.vramGB.toFixed(1)} GB` : 'n/a'}</div></div>
        <div class="card"><div class="k">Processor</div><div class="v" style="font-size:.98rem">${h.cores} threads</div><div class="small muted">${esc(h.cpu)}</div></div>
        <div class="card"><div class="k">AI engine</div><div class="v">${esc(engine)}</div></div>
      </div>
      ${h.integrated?.length && !h.vramGB ? `<div class="notice info" style="margin-top:12px">Your built-in graphics (${esc(h.integrated[0])}) shares system memory and is often unstable for AI, so Quicksilver uses the processor. That's normal for laptops.</div>` : ''}
      <div class="card" style="margin-top:16px">
        <div class="row"><div class="grow"><h3>⏱ Speed test</h3><div class="small muted" style="font-weight:600">Runs your smallest installed model for a few seconds and tunes every estimate on this page to your real speed.</div></div>
        <button class="btn primary" id="bench" ${benchState === 'running' ? 'disabled' : ''}>${benchState === 'running' ? 'Testing…' : 'Run speed test'}</button></div>
        <div id="bench-out" class="small" style="margin-top:8px;font-weight:700">${benchState && benchState !== 'running' ? `${esc(benchState.model)} wrote <b>${Math.round(benchState.tps * 0.75)} words per second</b> (estimate was ${Math.round(benchState.expected * 0.75)}). Estimates are now calibrated.` : e.calibrated ? '✓ Estimates are calibrated to this PC.' : 'Estimates are based on your hardware specs until you run the test.'}</div>
      </div>
      <div class="section"><h2>💬 Text & vision models</h2><span class="small muted">speed shown in words per second; reading speed is about 4–5</span></div>
      <table class="list"><thead><tr><th>Model</th><th>Size</th><th>Runs on</th><th style="width:30%">Speed on your PC</th><th>Rating</th></tr></thead><tbody>
        ${textRows.map((m) => { const x = e.text[m.id]; return `<tr><td><b>${esc(m.name)}</b><div class="small muted">${esc(S.catalog.textCategories[m.category].label)}${m.activeGB ? ' · mixture-of-experts' : ''}</div></td><td>${(m.sizeGB + (m.mmprojGB || 0)).toFixed(1)} GB</td><td class="small" style="font-weight:700">${where[x.fit]}</td>
          <td>${x.fit === 'no' ? '<span class="small muted">—</span>' : `<div class="row" style="gap:8px"><div class="speedbar grow"><i style="width:${scale(x.wordsPerSec)}%;background:${colour[x.rating]}"></i></div><b class="small">${x.wordsPerSec >= 10 ? Math.round(x.wordsPerSec) : x.wordsPerSec.toFixed(1)}</b></div>`}</td>
          <td><span class="badge rate-${x.rating}">${esc(x.rating === 'wont' ? "Won't fit" : x.label)}</span></td></tr>`; }).join('')}
      </tbody></table>
      <div class="section"><h2>🎨 Image & video models</h2></div>
      <table class="list"><thead><tr><th>Model</th><th>Size</th><th>Runs on</th><th>Time per ${'image / clip'}</th><th>Rating</th></tr></thead><tbody>
        ${S.catalog.media.map((m) => { const x = e.media[m.id]; return `<tr><td><b>${esc(m.name)}</b><div class="small muted">${esc(S.catalog.mediaCategories[m.category].label)}</div></td><td>${m.sizeGB.toFixed(1)} GB</td><td class="small" style="font-weight:700">${where[x.fit]}</td><td>${x.fit === 'no' ? '—' : `<b>~${fmtSec(x.sec)}</b> per ${m.kind === 'video' ? 'clip' : 'image'}`}</td><td><span class="badge rate-${x.rating}">${esc(x.rating === 'wont' ? "Won't fit" : x.label)}</span></td></tr>`; }).join('')}
      </tbody></table>
      <p class="small muted" style="margin-top:12px">Ratings: <span class="badge rate-great">Fast</span> faster than you can read · <span class="badge rate-good">Smooth</span> comfortable · <span class="badge rate-ok">Usable</span> a short wait · <span class="badge rate-slow">Slow</span> best for background tasks · <span class="badge rate-wont">Won't fit</span> needs more memory.</p>
    </div>`;
  },
  bind() {
    if (!S.est) refreshEstimates().then(() => S.route.view === 'pc' && render());
    $('#rescan')?.addEventListener('click', async () => { await qs.call('hw:detect', true); await refreshEstimates(); render(); toast('Hardware checked.'); });
    $('#bench')?.addEventListener('click', async () => {
      benchState = 'running'; render();
      try { benchState = await qs.call('bench:run'); await refreshEstimates(); } catch (err) { benchState = null; toast(err.message, 6000); }
      if (S.route.view === 'pc') render();
    });
  },
};
qs.onBench((text) => { const o = $('#bench-out'); if (o && benchState === 'running') o.textContent = text; });
