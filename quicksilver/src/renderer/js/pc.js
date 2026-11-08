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
      ${upgradesHTML()}
      ${newPcGuideHTML(h)}
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
    if (S.pcGuide === undefined) { S.pcGuide = null; qs.call('guide:get').then((g) => { if (g) { S.pcGuide = g; if (S.route.view === 'pc') render(); } }).catch(() => {}); }
    if (!S.upgrades) qs.call('upgrades:advise').then((u) => { S.upgrades = u; if (S.route.view === 'pc') render(); }).catch(() => {});
    $('#rescan')?.addEventListener('click', async () => { await qs.call('hw:detect', true); await refreshEstimates(); render(); toast('Hardware checked.'); });
    $('#bench')?.addEventListener('click', async () => {
      benchState = 'running'; render();
      try { benchState = await qs.call('bench:run'); await refreshEstimates(); } catch (err) { benchState = null; toast(err.message, 6000); }
      if (S.route.view === 'pc') render();
    });
  },
};
qs.onBench((text) => { const o = $('#bench-out'); if (o && benchState === 'running') o.textContent = text; });

// ---------- buying a new computer: what to get for each kind of use ----------
const PC_TIERS_BUILTIN = [
  { n: 1, name: 'Basic', good: 'Chatting with the built-in models, writing, simple questions', gpu: 'None needed (runs on the processor)', ram: '16 GB', disk: '512 GB SSD', cpu: 'Any recent 6-core (Intel Core i5 / Ryzen 5)', ex: ['Dell Inspiron Desktop, HP Pavilion Desktop or Lenovo IdeaCentre with a Core i5 / Ryzen 5 and 16 GB RAM', 'Most current laptops with 16 GB RAM'] },
  { n: 2, name: 'Everyday, fast', good: 'Quick answers, 8B models, coding help, small stacks, voice', gpu: '8 GB: RTX 5060 / 4060', ram: '32 GB', disk: '1 TB NVMe', cpu: '6–8 core', ex: ['MSI Codex (Core i5-14400F, RTX 5060, 32 GB DDR5, 2 TB)', 'iBUYPOWER Slate (Core i7-14700F, RTX 5060, 32 GB)', 'ABS Cyclone Aqua (RTX 5060, 32 GB DDR4)'] },
  { n: 3, name: 'Power user', good: '14B–30B models, full stacks, exam coaches, the website builder, pictures (SDXL, FLUX Schnell)', gpu: '16 GB: RTX 5060 Ti 16 GB, RTX 5070 Ti or Radeon RX 9070 XT', ram: '32–64 GB', disk: '2 TB NVMe', cpu: '8 core', ex: ['ZOTAC MEK (Ryzen 7 9700X, RTX 5060 Ti 16 GB, 32 GB DDR5)', 'CyberPowerPC with Ryzen 7 8700F and RTX 5060 Ti 16 GB', 'Skytech Nebula 2 (RTX 5060 Ti 16 GB)', 'ABS Flux II Aqua (Core i7-14700F, RTX 5060 Ti 16 GB, 32 GB)'] },
  { n: 4, name: 'Photo & video creation', good: 'Best picture models (FLUX Dev, photo editing), AI video (Wan), the largest stacks, everything at once', gpu: '24–32 GB: RTX 5090 (32 GB), or a used RTX 4090 / 3090 (24 GB)', ram: '64–128 GB', disk: '2–4 TB NVMe (Gen 4 or 5)', cpu: '8–16 core, 1000 W power supply, good cooling', ex: ['Lenovo Legion Tower 7i Gen 10 (Core Ultra 9 285K, RTX 5090, 64 GB, 2 TB)', 'HP OMEN MAX 45L (Ryzen 9 9900X3D, RTX 5090, 64 GB, 4 TB)', 'Alienware Area-51 (RTX 5090, Ryzen 9 9950X3D or Core Ultra 9 285K)'] },
];
const PC_TIPS_BUILTIN = [{"b": "Go NVIDIA if you can.", "t": "Picture and video generation runs best on NVIDIA; AMD cards work for chat but are slower for images and video."}, {"b": "VRAM beats card speed.", "t": "A slower card with 16 GB is usually a better AI buy than a faster one with 12 GB, because bigger, smarter models fit entirely on it."}, {"b": "Avoid 12 GB for creation work.", "t": "It's too small for the good image and video models."}, {"b": "Laptops have less VRAM than desktops with the same card name", "t": "(often 8 GB). For tiers 3–4, a desktop is far better value."}, {"b": "Leave room for models.", "t": "Picture and video models are 10–25 GB each, and chat models add up fast: get more storage than you think."}, {"b": "A used RTX 3090 (24 GB)", "t": "is the best-value way into tier 4 on a tight budget."}, {"b": "Check the graphics card's memory on the listing.", "t": "Some cards come in two versions (the RTX 5060 Ti has 8 GB and 16 GB); for tier 3 you want the 16 GB one."}, {"b": "", "t": "Roughly: tier 1 is any current PC, tier 2 a mid-range gaming PC, tier 3 upper mid-range, tier 4 high-end (mostly because of the graphics card). Models, parts and prices change often — compare the specs above."}];
// The guide in use: the copy refreshed online (see main/guide.js) when there is one, else built-in.
const pcGuide = () => (S.pcGuide?.tiers?.length ? S.pcGuide : null);
const pcTiers = () => pcGuide()?.tiers || PC_TIERS_BUILTIN;
function pcTierOf(h) {
  const v = h?.vramGB || 0;
  const tiers = pcTiers();
  if (tiers.every((t) => Number.isFinite(t.minVram))) return [...tiers].sort((a, b) => b.minVram - a.minVram).find((t) => v >= t.minVram)?.n || tiers[0].n;
  return v >= 20 ? 4 : v >= 12 ? 3 : v >= 6 ? 2 : 1;
}
function newPcGuideHTML(h) {
  const mine = h ? pcTierOf(h) : 0;
  const g = pcGuide();
  const when = g?.fetchedAt ? `Updated online ${new Date(g.fetchedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Built-in guide; refreshes automatically when you\'re online';
  return `<div class="section" id="new-pc"><h2>🖥️ Buying a new computer?</h2><span class="small muted">What to get, by what you want Quicksilver to do. For local AI, graphics memory (VRAM) matters most, then RAM, then fast storage; the processor matters least. · ${esc(when)}</span></div>
    <div class="tier-grid">${pcTiers().map((t) => `<div class="card tier ${t.n === mine ? 'mine' : ''}">
      <div class="row"><span class="tier-n">${t.n}</span><h3 class="grow">${esc(t.name)}</h3>${t.n === mine ? '<span class="badge b-mint">This PC</span>' : ''}</div>
      <p class="small tier-good">${esc(t.good)}</p>
      <dl class="tier-spec"><dt>Graphics card</dt><dd>${esc(t.gpu)}</dd><dt>RAM</dt><dd>${esc(t.ram)}</dd><dt>Storage</dt><dd>${esc(t.disk)}</dd><dt>Processor</dt><dd>${esc(t.cpu)}</dd></dl>
      ${t.ex?.length ? `<div class="tier-ex"><span class="small muted"><b>Examples</b></span><ul>${t.ex.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
    </div>`).join('')}</div>
    <details class="card tier-tips"><summary><b>Buying tips</b></summary><ul>
      ${(pcGuide()?.tips?.length ? pcGuide().tips : PC_TIPS_BUILTIN).map((t) => `<li>${t.b ? `<b>${esc(t.b)}</b> ` : ''}${esc(t.t)}</li>`).join('')}
    </ul></details>`;
}

// ---------- low-cost upgrades: what each would change on this PC ----------
function upgradesHTML() {
  const u = S.upgrades;
  if (!u) return '<div class="section" id="upgrades"><h2>💡 Low-cost upgrades</h2></div><div class="empty">Working out which upgrades would help…</div>';
  if (!u.upgrades.length) return '<div class="section" id="upgrades"><h2>💡 Upgrades</h2></div><p class="muted">This PC is already well equipped for local AI. A bigger graphics card is the only step up left.</p>';
  const arrow = (a, b, fmt) => (a == null || b == null ? '' : `${fmt(a)} → <b>${fmt(b)}</b>`);
  const pct = (a, b) => (a && b && a / b >= 1.2 ? ` <span class="up">${(a / b).toFixed(a / b >= 3 ? 0 : 1)}× faster</span>` : '');
  const lines = (x) => {
    const g0 = x.now.general; const g1 = x.then.general; const c0 = x.now.coding; const c1 = x.then.coding;
    const out = [];
    if (g0.chat && g1.chat && g0.chat / g1.chat >= 1.15) out.push(`💬 Chat replies with your models: ${arrow(g0.chat, g1.chat, (v) => `~${fmtSec(v)}`)}${pct(g0.chat, g1.chat)}`);
    if (g1.stars > (g0.stars || 0)) out.push(`🚀 Best setup this PC could run: ${starsHTML(g0.stars)} → ${starsHTML(g1.stars)} <span class="small muted">(${esc(g1.names.join(' + '))}, ~${fmtSec(g1.seconds)} per answer)</span>`);
    else if (g0.seconds && g1.seconds && g0.seconds / g1.seconds >= 1.2) out.push(`🚀 The best setup gets faster: ${arrow(g0.seconds, g1.seconds, (v) => `~${fmtSec(v)}`)} per answer${pct(g0.seconds, g1.seconds)}`);
    if (c1.stars > (c0.stars || 0)) out.push(`💻 Code quality: ${starsHTML(c0.stars)} → ${starsHTML(c1.stars)}`);
    if (x.newlyFast.length) out.push(`✅ Newly runs fast: ${x.newlyFast.map(esc).join(', ')}`);
    return out;
  };
  return `<div class="section" id="upgrades"><h2>💡 Low-cost upgrades</h2><span class="small muted">What each upgrade would change on this PC, worked out with the same estimates as everywhere else</span></div>
    <div class="upg-grid">${u.upgrades.map((x) => { const l = lines(x); return `<div class="card upg ${x.bestValue ? 'best' : ''} ${x.bigger ? 'bigger' : ''}">
      <div class="row"><span class="upg-ic">${x.icon}</span><h3 class="grow">${esc(x.name)}</h3>${x.bestValue ? '<span class="badge b-mint">Best value</span>' : x.bigger ? '<span class="badge b-lav">Bigger step</span>' : ''}</div>
      <div class="upg-cost">${esc(x.cost)}</div>
      ${l.length ? `<ul class="upg-list">${l.map((t) => `<li>${t}</li>`).join('')}</ul>` : '<p class="muted small" style="font-weight:650">Little difference for AI on this PC: something else is the limit.</p>'}
      <p class="small muted upg-note">${esc(x.note)}</p>
    </div>`; }).join('')}</div>
    <p class="small muted">Prices are rough US ranges and change often; check current prices and that a part fits your PC before buying. Most laptops can only upgrade memory (and some not even that).</p>`;
}
