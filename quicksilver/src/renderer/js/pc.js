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
    const color = { great: '#3fbf86', good: '#4f8fe0', ok: '#d9b22b', slow: '#e8834a', wont: '#d6467a' };
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
      ${giantHTML()}
      <div class="card" style="margin-top:16px">
        <div class="row"><div class="grow"><h3>⏱ Speed test</h3><div class="small muted" style="font-weight:600">Runs your smallest installed model for a few seconds and tunes every estimate on this page to your real speed.</div></div>
        <button class="btn primary" id="bench" ${benchState === 'running' ? 'disabled' : ''}>${benchState === 'running' ? 'Testing…' : 'Run speed test'}</button></div>
        <div id="bench-out" class="small" style="margin-top:8px;font-weight:700">${benchState && benchState !== 'running' ? `${esc(benchState.model)} wrote <b>${Math.round(benchState.tps * 0.75)} words per second</b> (estimate was ${Math.round(benchState.expected * 0.75)}). Estimates are now calibrated.` : e.calibrated ? '✓ Estimates are calibrated to this PC.' : 'Estimates are based on your hardware specs until you run the test.'}</div>
      </div>
      <div class="section"><h2>💬 Text & vision models</h2><span class="small muted">speed shown in words per second; reading speed is about 4–5</span></div>
      <table class="list"><thead><tr><th>Model</th><th>Size</th><th>Runs on</th><th style="width:30%">Speed on your PC</th><th>Rating</th></tr></thead><tbody>
        ${textRows.map((m) => { const x = e.text[m.id]; return `<tr><td><b>${esc(m.name)}</b><div class="small muted">${esc(S.catalog.textCategories[m.category].label)}${m.activeGB ? ' · mixture-of-experts' : ''}</div></td><td>${(m.sizeGB + (m.mmprojGB || 0)).toFixed(1)} GB</td><td class="small" style="font-weight:700">${where[x.fit]}</td>
          <td>${x.fit === 'no' ? '<span class="small muted">—</span>' : `<div class="row" style="gap:8px"><div class="speedbar grow"><i style="width:${scale(x.wordsPerSec)}%;background:${color[x.rating]}"></i></div><b class="small">${x.wordsPerSec >= 10 ? Math.round(x.wordsPerSec) : x.wordsPerSec.toFixed(1)}</b></div>`}</td>
          <td><span class="badge rate-${x.rating}">${esc(x.rating === 'wont' ? "Won't fit" : x.label)}</span></td></tr>`; }).join('')}
      </tbody></table>
      <div class="section"><h2>🎨 Image & video models</h2></div>
      <table class="list"><thead><tr><th>Model</th><th>Size</th><th>Runs on</th><th>Time per ${'image / clip'}</th><th>Rating</th></tr></thead><tbody>
        ${S.catalog.media.filter((m) => !m.retired).map((m) => { const x = e.media[m.id]; return `<tr><td><b>${esc(m.name)}</b><div class="small muted">${esc(S.catalog.mediaCategories[m.category].label)}</div></td><td>${m.sizeGB.toFixed(1)} GB</td><td class="small" style="font-weight:700">${where[x.fit]}</td><td>${x.fit === 'no' ? '—' : `<b>~${fmtSec(x.sec)}</b> per ${m.kind === 'video' ? 'clip' : 'image'}`}</td><td><span class="badge rate-${x.rating}">${esc(x.rating === 'wont' ? "Won't fit" : x.label)}</span></td></tr>`; }).join('')}
      </tbody></table>
      <p class="small muted" style="margin-top:12px">Ratings: <span class="badge rate-great">Fast</span> faster than you can read · <span class="badge rate-good">Smooth</span> comfortable · <span class="badge rate-ok">Usable</span> a short wait · <span class="badge rate-slow">Slow</span> best for background tasks · <span class="badge rate-wont">Won't fit</span> needs more memory.</p>
    </div>`;
  },
  bind() {
    // Picking a computer only changes the cards and the "could do" panel: the page stays put.
    $$('[data-tier-pick]').forEach((b) => b.addEventListener('click', () => {
      S.tierPick = Number(b.dataset.tierPick);
      $$('[data-tier-pick]').forEach((x) => x.classList.toggle('picked', x === b));
      const box = document.querySelector('.tier-ability'); if (box) box.outerHTML = tierAbilityHTML(S.tierPick, S.est?.hardware);
    }));
    bindPcCalc();
    bindGiant();
    $$('[data-upg-to]').forEach((b) => b.addEventListener('click', (e) => {
      e.preventDefault();
      const card = document.querySelector(`.upg[data-upg-id="${b.dataset.upgTo}"]`);
      if (!card) return;
      document.querySelectorAll('.upg.flash').forEach((c) => c.classList.remove('flash'));
      card.scrollIntoView({ behavior: 'smooth', block: 'center' });
      card.classList.add('flash');
      setTimeout(() => card.classList.remove('flash'), 1600);
    }));
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
// For each tier: a desktop and a laptop, with rough US prices (late 2026; check current prices).
const PC_BUY = {
  1: { desktop: { cost: '$450–700', ex: 'Core i5 / Ryzen 5, 16 GB, 512 GB SSD (Dell, HP, Lenovo desktops)' }, laptop: { cost: '$500–800', ex: 'Any 16 GB laptop (Acer Aspire, Lenovo IdeaPad Slim 5, HP 15)' } },
  2: { desktop: { cost: '$900–1,300', ex: 'RTX 5060 8 GB, 32 GB RAM (MSI Codex, iBUYPOWER Slate)' }, laptop: { cost: '$1,000–1,500', ex: 'RTX 5060 / 5070 Laptop 8 GB, 32 GB RAM (Lenovo LOQ, ASUS TUF A16, HP Victus)' } },
  3: { desktop: { cost: '$1,500–2,300', ex: 'RTX 5060 Ti 16 GB or 5070 Ti 16 GB, 32–64 GB RAM (ZOTAC MEK, Skytech, CyberPowerPC)' }, laptop: { cost: '$2,600–3,600', ex: 'RTX 5080 Laptop 16 GB, 32 GB RAM (Lenovo Legion Pro 7i, ASUS ROG Strix G16, MSI Vector)' } },
  4: { desktop: { cost: '$3,500–5,500', ex: 'RTX 5090 32 GB, 64 GB RAM (Lenovo Legion Tower 7i, HP OMEN MAX 45L, Alienware Area-51)' }, laptop: { cost: '$3,800–5,200', ex: 'RTX 5090 Laptop 24 GB, 64 GB RAM (Razer Blade 18, ASUS ROG Strix Scar 18, MSI Titan 18)' } },
};
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
// Under each kind of computer: how fast Quicksilver would answer on it, next to this PC.
S.tierSpeeds = null;
function tierSpeedHTML(t, isMine) {
  if (!S.tierSpeeds) {
    if (!S.tierSpeedsLoading) { S.tierSpeedsLoading = true; qs.call('guide:speeds', pcTiers().map(({ n, minVram, ram }) => ({ n, minVram, ram }))).then((r) => { S.tierSpeeds = r; if (S.route.view === 'pc') render(); }).catch(() => {}).finally(() => { S.tierSpeedsLoading = false; }); }
    return '';
  }
  const s = S.tierSpeeds.tiers?.[t.n];
  if (!s?.wps) return '';
  const x = s.times;
  const vs = isMine ? 'about what this PC does now' : x >= 1.25 ? `<b>${x >= 10 ? Math.round(x) : x.toFixed(1)}× faster</b> than this PC` : x && x < 0.8 ? 'slower than this PC' : 'about the same as this PC';
  return `<div class="tier-speed"><div class="small"><b>⚡ Quicksilver here:</b> ~${s.wps} words a second, a typical answer in ~${fmtSec(s.answerSec)} (${vs})</div>
    ${s.best ? `<div class="small muted">Also runs ${esc(s.best.name)} smoothly (~${s.best.wps} words/s)</div>` : ''}</div>`;
}
// What you could actually do on the selected computer: the strongest setup it runs, its abilities,
// and picture / video generation. Updates when you pick a tier card above.
function tierAbilityHTML(n, h) {
  const t = pcTiers().find((x) => x.n === n) || pcTiers()[0];
  const s = S.tierSpeeds?.tiers?.[t.n];
  if (!s) return '<div class="tier-ability empty">Working out what each computer could do…</div>';
  const caps = s.caps || [];
  return `<div class="tier-ability"><div class="row" style="gap:10px;align-items:baseline;flex-wrap:wrap"><h3 style="margin:0">On a <b>Tier ${t.n} · ${esc(t.name)}</b> computer, Quicksilver could:</h3>${t.n === (h ? pcTierOf(h) : 0) ? '<span class="badge b-mint">about what you have now</span>' : ''}</div>
    <div class="ta-grid">
      <div class="ta-col"><h4>💬 Answers</h4>
        ${s.bestSetup ? `<div class="small"><b>Best setup:</b> ${esc(s.bestSetup.names.join(' + '))} ${starsHTML(s.bestSetup.stars)}</div>` : ''}
        <div class="small muted">~${s.wps} words a second · a typical answer in ~${fmtSec(s.answerSec)}</div>
        ${s.best ? `<div class="small muted">Runs big uncensored models like ${esc(s.best.name)} smoothly</div>` : '<div class="small muted">Big 14B–30B models need a graphics card (Tier 3+).</div>'}
        ${caps.length ? `<ul class="ta-caps">${caps.map((c) => `<li>✅ ${esc(c)}</li>`).join('')}</ul>` : ''}</div>
      <div class="ta-col"><h4>🎨 Pictures &amp; video</h4>
        ${s.image ? `<div class="small">🖼️ <b>${esc(s.image.name)}</b> — about ${fmtSec(s.image.sec)} a picture</div>` : '<div class="small muted">🖼️ Pictures: slow on the processor; a free cloud API (Pollinations) is quicker.</div>'}
        ${s.video ? `<div class="small">🎬 <b>${esc(s.video.name)}</b> — about ${fmtSec(s.video.sec)} a short clip</div>` : '<div class="small muted">🎬 Local video needs a graphics card with ~12 GB+ (Tier 4); otherwise use a cloud API.</div>'}
        <div class="small muted" style="margin-top:4px">Top cloud models (Nano Banana, Veo, full-song music) work on any tier with an API key.</div></div>
    </div>
    <p class="small muted">Pick a computer above to see what it could do. Estimates use the same speed model as the rest of the app.</p></div>`;
}
function newPcGuideHTML(h) {
  const mine = h ? pcTierOf(h) : 0;
  const g = pcGuide();
  const when = g?.fetchedAt ? `Updated online ${new Date(g.fetchedAt).toLocaleDateString(undefined, { day: 'numeric', month: 'short', year: 'numeric' })}` : 'Built-in guide; refreshes automatically when you\'re online';
  return `<div class="section" id="new-pc"><h2>🖥️ Buying a new computer?</h2><span class="small muted">What to get, by what you want Quicksilver to do. For local AI, graphics memory (VRAM) matters most, then RAM, then fast storage; the processor matters least. · ${esc(when)}</span></div>
    <div class="tier-grid">${pcTiers().map((t) => `<button class="card tier ${t.n === mine ? 'mine' : ''} ${t.n === (S.tierPick ?? mine) ? 'picked' : ''}" data-tier-pick="${t.n}">
      <div class="row"><span class="tier-n">${t.n}</span><h3 class="grow">${esc(t.name)}</h3>${t.n === mine ? '<span class="badge b-mint">This PC</span>' : ''}</div>
      <p class="small tier-good">${esc(t.good)}</p>
      <dl class="tier-spec"><dt>Graphics card</dt><dd>${esc(t.gpu)}</dd><dt>RAM</dt><dd>${esc(t.ram)}</dd><dt>Storage</dt><dd>${esc(t.disk)}</dd><dt>Processor</dt><dd>${esc(t.cpu)}</dd></dl>
      ${(() => { const b = t.desktop || t.laptop ? t : PC_BUY[t.n] || {}; return b.desktop || b.laptop ? `<div class="tier-buy">${b.desktop ? `<div class="small"><b>🖥️ Desktop ~${esc(b.desktop.cost)}</b><div class="muted">${esc(b.desktop.ex)}</div></div>` : ''}${b.laptop ? `<div class="small"><b>💻 Laptop ~${esc(b.laptop.cost)}</b><div class="muted">${esc(b.laptop.ex)}</div></div>` : ''}</div>` : ''; })()}
      ${tierSpeedHTML(t, t.n === mine)}
      ${t.ex?.length ? `<div class="tier-ex"><span class="small muted"><b>Examples</b></span><ul>${t.ex.map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>` : ''}
    </button>`).join('')}</div>
    ${tierAbilityHTML(S.tierPick ?? mine, h)}
    ${pcCalcHTML()}
    <details class="card tier-tips"><summary><b>Buying tips</b></summary><ul>
      ${(pcGuide()?.tips?.length ? pcGuide().tips : PC_TIPS_BUILTIN).map((t) => `<li>${t.b ? `<b>${esc(t.b)}</b> ` : ''}${esc(t.t)}</li>`).join('')}
    </ul></details>`;
}

// ---------- the computer calculator: type in any computer's specs ----------
// Graphics cards with their memory and memory speed (GB/s; laptop versions run at lower power).
const PC_CARDS = [
  ['none', 'No graphics card (built-in graphics)', 0, 0, ''],
  ['Desktop · NVIDIA', [['rtx4060', 'RTX 4060 8 GB', 8, 272], ['rtx5060', 'RTX 5060 8 GB', 8, 448], ['rtx4060ti16', 'RTX 4060 Ti 16 GB', 16, 288], ['rtx5060ti16', 'RTX 5060 Ti 16 GB', 16, 448], ['rtx4070', 'RTX 4070 12 GB', 12, 504], ['rtx5070', 'RTX 5070 12 GB', 12, 672], ['rtx4070tis', 'RTX 4070 Ti Super 16 GB', 16, 672], ['rtx5070ti', 'RTX 5070 Ti 16 GB', 16, 896], ['rtx4080s', 'RTX 4080 Super 16 GB', 16, 736], ['rtx5080', 'RTX 5080 16 GB', 16, 960], ['rtx3090', 'RTX 3090 24 GB (used)', 24, 936], ['rtx4090', 'RTX 4090 24 GB', 24, 1008], ['rtx5090', 'RTX 5090 32 GB', 32, 1792]]],
  ['Desktop · AMD / Intel', [['rx7600', 'Radeon RX 7600 8 GB', 8, 288], ['rx9060xt', 'Radeon RX 9060 XT 16 GB', 16, 320], ['rx7800xt', 'Radeon RX 7800 XT 16 GB', 16, 624], ['rx9070xt', 'Radeon RX 9070 XT 16 GB', 16, 640], ['rx7900xtx', 'Radeon RX 7900 XTX 24 GB', 24, 960], ['arcb580', 'Intel Arc B580 12 GB', 12, 456]]],
  ['Laptop · NVIDIA', [['l4060', 'RTX 4060 Laptop 8 GB', 8, 256, 1], ['l5060', 'RTX 5060 Laptop 8 GB', 8, 384, 1], ['l4070', 'RTX 4070 Laptop 8 GB', 8, 256, 1], ['l5070', 'RTX 5070 Laptop 8 GB', 8, 384, 1], ['l5070ti', 'RTX 5070 Ti Laptop 12 GB', 12, 672, 1], ['l4080', 'RTX 4080 Laptop 12 GB', 12, 432, 1], ['l4090', 'RTX 4090 Laptop 16 GB', 16, 576, 1], ['l5080', 'RTX 5080 Laptop 16 GB', 16, 896, 1], ['l5090', 'RTX 5090 Laptop 24 GB', 24, 896, 1]]],
  ['other', 'Another card (type its memory)', -1, 0, ''],
];
const pcCards = () => PC_CARDS.flatMap((g) => (Array.isArray(g[1]) ? g[1].map(([id, name, vram, bw, lap]) => ({ id, name, vram, bw, laptop: Boolean(lap), amd: /Radeon|Arc/.test(name) })) : [{ id: g[0], name: g[1], vram: g[2], bw: 0 }]));
S.pcCalc = S.pcCalc || { type: 'desktop', card: 'rtx5060ti16', vram: 16, ram: 32, ddr5: true, disk: 2000 };
function pcCalcHTML() {
  const c = S.pcCalc;
  const opt = (v, label, sel) => `<option value="${esc(String(v))}" ${String(sel) === String(v) ? 'selected' : ''}>${esc(label)}</option>`;
  const cardOpts = PC_CARDS.map((g) => (Array.isArray(g[1]) ? `<optgroup label="${esc(g[0])}">${g[1].map(([id, name]) => opt(id, name, c.card)).join('')}</optgroup>` : opt(g[0], g[1], c.card))).join('');
  return `<div class="card pc-calc" id="pc-calc"><h3 style="margin-top:0">🧮 Check any computer</h3>
    <p class="small muted" style="margin-top:0">Type in the specs of a computer you're looking at (from a store listing) and see what Quicksilver would do on it.</p>
    <div class="pc-calc-form">
      <label>Type<select id="pcc-type">${opt('desktop', '🖥️ Desktop', c.type)}${opt('laptop', '💻 Laptop', c.type)}</select></label>
      <label>Graphics card<select id="pcc-card">${cardOpts}</select></label>
      <label id="pcc-vram-l" ${c.card === 'other' ? '' : 'hidden'}>Its memory (GB)<input id="pcc-vram" type="number" min="0" max="96" step="1" value="${esc(String(c.vram))}"></label>
      <label>Memory (RAM)<select id="pcc-ram">${[8, 16, 24, 32, 48, 64, 96, 128].map((g) => opt(g, `${g} GB`, c.ram)).join('')}</select></label>
      <label>Memory type<select id="pcc-ddr">${opt('5', 'DDR5 / LPDDR5', c.ddr5 ? '5' : '4')}${opt('4', 'DDR4 (older)', c.ddr5 ? '5' : '4')}</select></label>
      <label>Storage<select id="pcc-disk">${[256, 512, 1000, 2000, 4000, 8000].map((g) => opt(g, g >= 1000 ? `${g / 1000} TB` : `${g} GB`, c.disk)).join('')}</select></label>
    </div>
    <div id="pcc-out" class="pc-calc-out"><div class="muted small">Working it out…</div></div></div>`;
}
let pcCalcSeq = 0;
async function pcCalcRun() {
  const c = S.pcCalc; const out = document.getElementById('pcc-out'); if (!out) return;
  const card = pcCards().find((x) => x.id === c.card) || pcCards()[0];
  const vram = card.id === 'other' ? Math.max(0, Number(c.vram) || 0) : card.vram;
  const seq = ++pcCalcSeq;
  const r = await qs.call('guide:estimate', { vramGB: vram, ramGB: c.ram, laptop: c.type === 'laptop', bandwidthGBs: card.bw || 0, bandwidthIsLaptop: card.laptop, nvidia: !card.amd, gpuName: vram ? card.name : '', ddr5: c.ddr5, diskGB: c.disk }).catch((err) => ({ error: err.message }));
  if (seq !== pcCalcSeq || !document.getElementById('pcc-out')) return;
  if (r.error) { out.innerHTML = `<div class="small" style="color:var(--danger)">${esc(r.error)}</div>`; return; }
  const tier = pcTierOf({ vramGB: vram });
  const t = pcTiers().find((x) => x.n === tier) || {};
  const buy = (t.desktop || t.laptop ? t : PC_BUY[tier] || {})[c.type];
  const vs = r.here?.wps && r.wps ? r.wps / r.here.wps : 0;
  const vsText = !vs ? '' : vs >= 1.25 ? `<b>${vs >= 10 ? Math.round(vs) : vs.toFixed(1)}× faster</b> than this PC` : vs < 0.8 ? `<b>${(1 / vs).toFixed(1)}× slower</b> than this PC` : 'about the same as this PC';
  const verdict = vram >= 16 && c.ram >= 32 ? '🚀 Excellent for local AI: big, smart models on the graphics card, pictures and video.' : vram >= 8 ? '✅ Good: fast everyday answers and pictures; the biggest models and video are slow.' : vram ? '🙂 Fine for chat; pictures are slow and video is out of reach.' : '🐢 Chat works on the processor, slowly; pictures and video are best done in the cloud.';
  const where = { gpu: 'graphics card', split: 'card + memory', cpu: 'processor' };
  out.innerHTML = `<div class="pcc-verdict"><b>${verdict}</b></div>
    <div class="pcc-grid">
      <div><div class="k">Tier</div><div class="v">${tier} · ${esc(t.name || '')}</div>${buy ? `<div class="small muted">A ${c.type} like this costs about <b>${esc(buy.cost)}</b></div>` : ''}</div>
      <div><div class="k">Everyday answers</div><div class="v">~${r.wps} words/s</div><div class="small muted">a typical answer in ~${fmtSec(r.answerSec)}${vsText ? ` · ${vsText}` : ''}</div></div>
      <div><div class="k">Pictures</div><div class="v">${r.image ? `~${fmtSec(r.image.sec)}` : 'Slow'}</div><div class="small muted">${r.image ? esc(r.image.name) : 'on the processor; use a cloud service'}</div></div>
      <div><div class="k">Video</div><div class="v">${r.video ? `~${fmtSec(r.video.sec)}` : 'Not really'}</div><div class="small muted">${r.video ? `a short clip with ${esc(r.video.name)}` : 'needs a graphics card with ~12 GB+'}</div></div>
    </div>
    <div class="small" style="margin-top:8px"><b>Liquid Editions:</b> ${r.editions.map((e) => `<span class="badge ${e.ok ? 'b-mint' : ''}">${e.ok ? '✓' : '✗'} ${esc(e.name)}</span>`).join(' ')}</div>
    ${r.bestSetup ? `<div class="small" style="margin-top:6px"><b>Best setup:</b> ${esc(r.bestSetup.names.join(' + '))} ${starsHTML(r.bestSetup.stars)}</div>` : ''}
    ${r.runs.length ? `<div class="small" style="margin-top:6px"><b>Biggest chat models that run well:</b> ${r.runs.map((m) => `${esc(m.name)} <span class="muted">(~${m.wps} words/s, ${where[m.where] || m.where})</span>`).join(' · ')}</div>` : ''}
    ${r.disk ? `<div class="small" style="margin-top:6px">${r.disk.enough ? '✓' : '⚠️'} <b>Storage:</b> ${r.disk.enough ? `room for the Liquid Edition${r.editions[2].ok ? ', Pro' : r.editions[1].ok ? ', Max' : ''} and plenty of other models` : `tight: the Liquid Edition${r.editions[2].ok ? ' and Pro' : r.editions[1].ok ? ' and Max' : ''} need about ${r.disk.needGB} GB, and picture and video models add 5–25 GB each; aim for ${r.disk.needGB > 200 ? '2 TB' : '1 TB'} or more`}</div>` : ''}
    ${c.type === 'laptop' && vram ? '<div class="small muted" style="margin-top:6px">Laptop graphics cards run at lower power than desktop ones with the same name, so they are a little slower (already counted above).</div>' : ''}
    <div class="small muted" style="margin-top:6px">Estimates use the same speed model as the rest of this page${S.est?.hardware ? '' : ''}; real speed varies a little with the exact parts and drivers.</div>`;
}
function bindPcCalc() {
  const f = document.getElementById('pc-calc'); if (!f) return;
  const c = S.pcCalc;
  const read = () => {
    c.type = $('#pcc-type').value; c.card = $('#pcc-card').value; c.ram = Number($('#pcc-ram').value); c.ddr5 = $('#pcc-ddr').value === '5'; c.disk = Number($('#pcc-disk').value);
    const card = pcCards().find((x) => x.id === c.card);
    if (card && card.id !== 'other') { c.vram = card.vram; if (card.laptop && c.type !== 'laptop') { c.type = 'laptop'; $('#pcc-type').value = 'laptop'; } }
    else c.vram = Number($('#pcc-vram').value) || 0;
    $('#pcc-vram-l').hidden = c.card !== 'other';
    pcCalcRun();
  };
  f.addEventListener('change', read);
  $('#pcc-vram')?.addEventListener('input', read);
  pcCalcRun();
}

// ---------- low-cost upgrades: what each would change on this PC ----------
function upgradesHTML() {
  const u = S.upgrades;
  if (!u) return '<div class="section" id="upgrades"><h2>💡 Low-cost upgrades</h2></div><div class="empty">Working out which upgrades would help…</div>';
  if (!u.upgrades.length) return '<div class="section" id="upgrades"><h2>💡 Upgrades</h2></div><p class="muted">This PC is already well equipped for local AI. A bigger graphics card is the only step up left.</p>';
  const arrow = (a, b, fmt) => (a == null || b == null ? '' : `${fmt(a)} → <b>${fmt(b)}</b>`);
  const pct = (a, b) => (a && b && a / b >= 1.2 ? ` <span class="up">${(a / b).toFixed(a / b >= 3 ? 0 : 1)}× faster</span>` : '');
  const nameOf = Object.fromEntries(u.upgrades.map((x) => [x.id, x.name]));
  const lines = (x) => {
    if (x.id === 'ssd') return ['💾 <b>More room for models</b> — hold many more models (they\'re 1–25 GB each) and load them faster. Doesn\'t change answer speed.'];
    const g0 = x.now.general; const g1 = x.then.general; const c0 = x.now.coding; const c1 = x.then.coding;
    const out = [];
    // 1. Speed: the SAME models you run now, but faster (a fair, like-for-like comparison).
    if (x.sameModel && x.sameModel.now / x.sameModel.then >= 1.15) out.push(`⚡ <b>Faster</b> — your current best (${esc(x.sameModel.name)}) answers ${arrow(x.sameModel.now, x.sameModel.then, (v) => `~${fmtSec(v)}`)}${pct(x.sameModel.now, x.sameModel.then)}${x.sameModel.fits ? ' (now fully on the graphics card)' : ''}`);
    else if (g0.chat && g1.chat && g0.chat / g1.chat >= 1.15) out.push(`⚡ <b>Faster</b> chat replies with your models: ${arrow(g0.chat, g1.chat, (v) => `~${fmtSec(v)}`)}${pct(g0.chat, g1.chat)}`);
    // 2. Smarter: a bigger, stronger model becomes possible (its answers take longer because it's a
    //    bigger model — that's the quality you gain, not a slowdown).
    if (g1.stars > (g0.stars || 0)) out.push(`🚀 <b>Smarter</b> — unlocks a stronger model: ${starsHTML(g0.stars)} → ${starsHTML(g1.stars)} <span class="small muted">(${esc(g1.names.join(' + '))} — a bigger model, so ~${fmtSec(g1.seconds)} per answer)</span>`);
    if (c1.stars > (c0.stars || 0)) out.push(`💻 <b>Better code</b>: ${starsHTML(c0.stars)} → ${starsHTML(c1.stars)}`);
    if (x.newlyFast.length) out.push(`✅ <b>Newly runs well</b>: ${x.newlyFast.map(esc).join(', ')}`);
    return out;
  };
  return `<div class="section" id="upgrades"><h2>💡 Upgrades for this PC</h2><span class="small muted">What each would change, with rough US prices. Two different things: <b>⚡ Faster</b> runs the models you have now quicker; <b>🚀 Smarter</b> unlocks a bigger model (its answers take a little longer because it's a bigger model — that's the quality, not a slowdown).</span></div>
    <div class="upg-grid">${u.upgrades.map((x) => { const l = lines(x); return `<div class="card upg ${x.bestValue ? 'best' : ''} ${x.bigger ? 'bigger' : ''}" data-upg-id="${esc(x.id)}">
      <div class="row"><span class="upg-ic">${x.icon}</span><h3 class="grow">${esc(x.name)}</h3>${x.bestValue ? '<span class="badge b-mint">Best value</span>' : x.bigger ? '<span class="badge b-lav">Bigger step</span>' : ''}</div>
      <div class="upg-cost">${esc(x.cost)}</div>
      ${l.length ? `<ul class="upg-list">${l.map((t) => `<li>${t}</li>`).join('')}</ul>` : '<p class="muted small" style="font-weight:650">Little difference for AI on this PC: something else is the limit.</p>'}
      <p class="small muted upg-note">${esc(x.note)}</p>
      ${x.cheaper && nameOf[x.cheaper] ? `<p class="small upg-cheaper">💸 On a budget? <a href="#" data-upg-to="${esc(x.cheaper)}">${esc(nameOf[x.cheaper].split(' (')[0])}</a> is cheaper.</p>` : ''}
    </div>`; }).join('')}</div>
    <p class="small muted">Prices are rough US ranges and change often; check current prices and that a part fits your PC before buying. Most laptops can only upgrade memory (and some not even that).</p>`;
}

// ---------- Giant models (optional): colibri ----------
let giantInfo = null; let giantBusy = ''; let giantErr = '';
qs.onApp?.((d) => { if (d.kind === 'giant') { giantBusy = d.text || giantBusy; const el = document.getElementById('giant-status'); if (el) el.textContent = d.text || ''; } });
function giantHTML() {
  if (!giantInfo) { qs.call('giant:info').then((g) => { giantInfo = g; if (S.route.view === 'pc') { const el = document.getElementById('giant'); if (el) { el.outerHTML = giantHTML(); bindGiant(); } } }).catch(() => {}); return '<div id="giant"></div>'; }
  const g = giantInfo;
  return `<div id="giant"><div class="section"><h2>🦣 Giant models <span class="badge b-lemon">optional · experimental</span></h2><span class="small muted">Run open models far bigger than this PC's memory (DeepSeek V4 Flash, GLM-5.2, Qwen3.8 Flash Next) with colibri: the busiest parts on the graphics card, the rest in memory, the least used streamed from the SSD. Best for a hard question you can wait for, not everyday chat.</span></div>
    <div class="card"><p class="small" style="margin-top:0;${g.level === 'no' ? 'color:var(--danger)' : ''}">${esc(g.text)} · ${g.freeGB} GB free on the drive</p>
      <table class="list"><thead><tr><th>Model</th><th>Size</th><th>Published speed</th><th>On this PC (estimate)</th><th></th></tr></thead><tbody>
      ${g.models.map((m) => `<tr><td><b>${esc(m.name)}</b><div class="small muted">${esc(m.note)}</div></td><td>${m.sizeGB} GB</td><td>~${m.wps} words/s</td><td>~${m.wpsHere} words/s</td><td>${m.roomOk ? '' : '<span class="small" style="color:var(--danger)">not enough disk space</span>'}</td></tr>`).join('')}</tbody></table>
      <div class="row" style="margin-top:10px;gap:8px;flex-wrap:wrap">
        ${!g.installed ? `<button class="btn ${g.level === 'no' ? '' : 'primary'}" id="giant-get" ${giantBusy ? 'disabled' : ''}>Get colibri (free, about 50 MB)</button>`
          : g.running ? '<span class="badge b-mint">● Running</span><button class="btn small" id="giant-chat">Chat with a giant model</button><button class="btn small ghost" id="giant-stop">Stop</button>'
          : '<button class="btn primary" id="giant-start">Start colibri</button>'}
        <span class="small muted" id="giant-status">${esc(giantBusy)}</span></div>
      ${giantErr ? `<div class="notice" style="margin-top:8px">${esc(giantErr)}</div>` : ''}
      <p class="small muted" style="margin-bottom:0">${g.installed ? `colibri ${esc(g.version || '')} is in ${esc(g.folder)}. Its models come from its own setup (run "coli setup" there once, or "coli import" for a GGUF file); once it's running they appear in every model menu as "Giant models (colibri, on this PC)".` : 'Downloaded from colibri\'s official releases with its published fingerprint checked. Its speed figures are its authors\' own, measured on a 24 GB graphics card with fast SSDs.'}</p></div></div>`;
}
function bindGiant() {
  const redo = async () => { giantInfo = await qs.call('giant:info').catch(() => giantInfo); const el = document.getElementById('giant'); if (el) { el.outerHTML = giantHTML(); bindGiant(); } };
  const run = (ch, done) => async () => { giantErr = ''; giantBusy = 'Working…'; await redo(); try { await call(ch); if (done) toast(done); } catch (err) { giantErr = err.message; } giantBusy = ''; await refreshProviders().catch(() => {}); redo(); };
  $('#giant-get')?.addEventListener('click', async () => { if (giantInfo?.level === 'no' && !(await confirmBox(`${giantInfo.text}\n\nGet colibri anyway?`, { yes: 'Get it anyway', danger: false }))) return; run('giant:install', 'colibri is installed. Start it to use giant models.')(); });
  $('#giant-start')?.addEventListener('click', run('giant:start', 'colibri is running: its models are in the model menus.'));
  $('#giant-stop')?.addEventListener('click', run('giant:stop'));
  $('#giant-chat')?.addEventListener('click', () => { const t = (S.targets || []).find((x) => x.target.startsWith('api:') && /colibri/i.test(x.group || '')); newChat(); const c = chatById(S.route.id); if (c && t) { c.target = t.target; save(); render(); } });
}
