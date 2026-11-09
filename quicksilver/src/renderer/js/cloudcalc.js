// Cloud AIs, explained: which services have a developer (dev) plan and what that means, and a
// calculator that compares using a cloud AI on its own with using it through Quicksilver.
'use strict';

// Developer plans: what each service offers people building and trying things. Plans change, so
// each card in Connect an API links to the service's own price page.
const DEV_PLANS = {
  google: ['Free tier (AI Studio)', 'Free with daily limits for developers; on the free tier Google may use your prompts to improve its products.'],
  groq: ['Free + Developer tiers', 'Free with daily caps; the Developer tier is pay-as-you-go with much higher limits.'],
  cerebras: ['Free + Developer tiers', 'Free with a daily token allowance; the Developer tier is pay-as-you-go with higher limits.'],
  mistral: ['Experiment plan', 'Free plan for trying and prototyping, with rate limits; needs a verified phone number and prompts may be used for training.'],
  openrouter: ['Free models', 'Models ending in ":free" cost nothing but have a daily request cap; others are pay-as-you-go.'],
  github: ['GitHub Models', 'Free for prototyping with your GitHub account; low daily limits, meant for trying models out.'],
  cohere: ['Trial key', 'Free trial key with rate limits, not for production use; a production key is pay-as-you-go.'],
  nvidia: ['Developer Program', 'Free credits for prototyping on build.nvidia.com; heavier use needs a paid plan.'],
  cloudflare: ['Free daily allowance', 'Workers AI includes a free daily allowance; beyond it you pay per use.'],
  sambanova: ['Free tier', 'Free with rate limits for developers; paid plans raise them.'],
  together: ['Pay-as-you-go', 'No ongoing free plan; some free models (like FLUX.1 Schnell Free) and small sign-up credits.'],
  venice: ['Small free allowance', 'A limited free allowance, then Pro or API credits.'],
};
const DEV_MEANS = 'A developer (dev) plan is what a cloud AI offers people building or trying out apps: free or cheap, with lower daily limits, sometimes using your prompts to improve their models, and not meant for heavy or business use. For personal use through Quicksilver it\'s usually all you need; for private or heavy use, pick a paid plan.';
const devBadgeHTML = (preset) => (DEV_PLANS[preset] ? `<span class="badge b-sky" title="${esc(`${DEV_PLANS[preset][1]} ${DEV_MEANS}`)}">🧪 Dev plan: ${esc(DEV_PLANS[preset][0])}</span>` : '');

function devPlansHTML() {
  return `<section class="card og-sec"><h3>🧪 Developer (dev) plans</h3><p class="small" style="margin:0 0 10px">${esc(DEV_MEANS)}</p>
    <div class="api-grid">${Object.entries(DEV_PLANS).map(([k, [plan, what]]) => `<div class="api-row"><b>${esc(({ google: 'Google Gemini', groq: 'Groq', cerebras: 'Cerebras', mistral: 'Mistral', openrouter: 'OpenRouter', github: 'GitHub Models', cohere: 'Cohere', nvidia: 'NVIDIA NIM', cloudflare: 'Cloudflare Workers AI', sambanova: 'SambaNova', together: 'Together AI', venice: 'Venice AI' })[k])}</b><span class="badge b-sky" style="align-self:flex-start">🧪 ${esc(plan)}</span><div class="small muted">${esc(what)}</div></div>`).join('')}</div>
    <p class="small muted" style="margin:10px 0 0">Plans and limits change often; each service's card in Connect an API links to its current prices. Not listed: services that are pay-as-you-go only (Anthropic, OpenAI paid, DeepSeek, xAI and others).</p></section>`;
}

// ---------- the calculator: a cloud AI alone vs through Quicksilver ----------
// Chat, pictures and video. Prices are what the services list (November 2026, from their price
// pages and public comparisons); they change often, so every number can be edited.
const calcState = { kind: 'chat', perDay: 40, hard: 35, mode: 'hard', priceIn: 1, priceOut: 5, free: false, service: 'gpt-terra', imgPerMonth: 100, imgService: 'nano', keep: 25, vidSecPerMonth: 120, vidService: 'veo', vkeep: 30 };
// [label, $ in / $ out per million tokens, free plan?, rating out of 10 for hard questions]
const CHAT_SERVICES = {
  'gpt-astra': ['OpenAI GPT-6 Astra (flagship)', 10, 50, false, 10],
  'gpt-terra': ['OpenAI GPT-6.1 Terra (fast, low cost)', 1, 5, false, 8.5],
  'gemini-argon': ['Google Gemini 4 Argon', 4, 20, false, 9.5],
  'gemini-free': ['Google Gemini Flash (free tier)', 0, 0, true, 8.5],
  'cerebras-free': ['Cerebras Qwen3 235B (free tier)', 0, 0, true, 8],
  'groq-free': ['Groq gpt-oss-120b (free tier)', 0, 0, true, 8.5],
  venice: ['Venice (uncensored)', 0.7, 2.8, false, 7],
  other: ['Another service (enter its prices)', null, null, false, 8],
};
// [label, $ per image, rating /10, note]
const IMAGE_SERVICES = {
  nano: ['Google Nano Banana 2.1 (1K)', 0.034, 9, 'great at edits'],
  gptimage: ['OpenAI GPT Image (standard quality)', 0.05, 10, 'top quality; low quality is about $0.006, high about $0.21'],
  flux: ['FLUX 3 Image (Black Forest Labs)', 0.048, 9, 'artistic styles'],
  ideogram: ['Ideogram 4.5 (medium)', 0.06, 9, 'best for text in images'],
  other: ['Another service (enter its price)', null, 8, ''],
};
// [label, $ per second of video, rating /10]
const VIDEO_SERVICES = {
  veo: ['Google Veo 3.1 (720p–1080p)', 0.40, 10], veolite: ['Google Veo 3.1 Lite (720p)', 0.05, 7],
  kling: ['Kling 3.0 (720p, with audio)', 0.126, 9], seedance: ['Seedance 2.5 (720p)', 0.23, 9],
  runway: ['Runway Gen-4.5', 0.12, 8], runwayturbo: ['Runway Gen-4 Turbo', 0.05, 7],
  other: ['Another service (enter its price)', null, 8],
};
// Quicksilver's own picture and video models, rated on the same scale as the cloud ones.
const LOCAL_IMG = { 'flux-schnell': 7, sdxl: 6, 'sdxl-turbo': 5, sd15: 3, 'flux-kontext': 7, 'qwen-image-edit': 7 };
const LOCAL_VID = { 'wan2.2-5b': 5, 'wan2.1-1.3b': 3 };
const CALC_MODES = {
  hard: ['Hard questions only', 'Everyday messages are answered on your PC; only hard ones go to the cloud AI (Settings → "use my cloud AI for hard questions").'],
  fusion: ['As the lead of a custom AI', 'Every message goes to the cloud AI, together with drafts from your PC\'s models, so it starts from more angles.'],
  check: ['As the double-checker', 'Your PC answers everything; the cloud AI only checks answers when Double-check is on (say a third of them).'],
};
const money = (v, free) => (free ? 'Free' : v == null ? '?' : v < 0.01 ? 'under $0.01' : `$${v < 10 ? v.toFixed(2) : Math.round(v).toLocaleString()}`);
const ccBar = (v, max, cls) => `<span class="cc-bar"><i class="${cls}" style="width:${max ? Math.max(2, Math.round((v / max) * 100)) : 0}%"></i></span>`;
function ccTable(heads, rows, note) {
  return `<div class="cc-table"><div class="cc-h" style="grid-template-columns:1.3fr ${heads.map(() => '1fr').join(' ')}"><span></span>${heads.map((h) => `<b>${h}</b>`).join('')}</div>
    ${rows.map(([label, vals, fmt, bars]) => { const max = Math.max(...vals.map((v) => (typeof v === 'number' ? v : 0))); return `<div class="cc-r" style="grid-template-columns:1.3fr ${heads.map(() => '1fr').join(' ')}"><span>${label}</span>${vals.map((v, i) => `<span>${bars && typeof v === 'number' ? ccBar(v, max, ['cc-a', 'cc-q', 'cc-l'][i] || 'cc-q') : ''}<b>${fmt ? fmt(v) : v}</b></span>`).join('')}</div>`; }).join('')}
  </div>${note ? `<p class="cc-sum">${note}</p>` : ''}`;
}
// ----- chat -----
function chatNumbers() {
  const month = calcState.perDay * 30;
  const share = calcState.mode === 'hard' ? calcState.hard / 100 : calcState.mode === 'fusion' ? 1 : 0.33;
  // Rough sizes in tokens: a question with recent chat ~700 in, an answer ~450 out; drafts from your
  // PC add ~500 in for a custom AI's lead; a check reads the answer and writes a short verdict.
  const alone = { calls: month, tin: month * 700, tout: month * 450 };
  const q = Math.round(month * share);
  const withQs = calcState.mode === 'fusion' ? { calls: q, tin: q * 1200, tout: q * 450 } : calcState.mode === 'check' ? { calls: q, tin: q * 1100, tout: q * 150 } : { calls: q, tin: q * 700, tout: q * 450 };
  const cost = (x) => (calcState.free ? 0 : (x.tin / 1e6) * calcState.priceIn + (x.tout / 1e6) * calcState.priceOut);
  return { share, alone: { ...alone, cost: cost(alone), leaves: 100 }, withQs: { ...withQs, cost: cost(withQs), leaves: Math.round(share * 100) } };
}
function chatOutHTML() {
  const n = chatNumbers();
  const svc = CHAT_SERVICES[calcState.service];
  const saved = n.alone.calls ? Math.round((1 - n.withQs.calls / n.alone.calls) * 100) : 0;
  const local = S.est?.text?.['qwen3.5-4b'];
  return `<p class="small muted" style="margin:6px 0 10px">${esc(CALC_MODES[calcState.mode][1])}</p>
    ${ccTable(['The cloud AI alone', 'Through Quicksilver'], [
      ['☁️ Messages sent to the cloud a month', [n.alone.calls, n.withQs.calls], (v) => v.toLocaleString(), true],
      ['💵 Estimated cost a month', [n.alone.cost, n.withQs.cost], (v) => money(v, calcState.free), true],
      ['🔒 Your messages that leave your PC', [n.alone.leaves, n.withQs.leaves], (v) => `${v}%`, true],
      ['🎯 Hard questions', [`${svc[0].split(' (')[0]}: ${svc[4]}/10`, calcState.mode === 'check' ? 'Your PC, checked by the cloud AI' : `${svc[0].split(' (')[0]} with your PC's drafts and working: ${Math.min(10, svc[4] + 0.5)}/10`]],
      ['⚡ Everyday answers', ['From the cloud', calcState.mode === 'fusion' ? 'From the cloud, with your PC\'s drafts' : `From your PC${local ? ` (${local.label.toLowerCase()} here)` : ''}, private, no limits`]],
      ['📴 Works without internet', ['No', calcState.mode === 'fusion' ? 'No (the cloud AI leads)' : 'Yes, for everyday messages']],
    ], calcState.mode !== 'fusion' && saved > 0 ? `Through Quicksilver you send <b>${saved}% fewer</b> messages to the cloud${calcState.free ? `, so a free plan's daily limit lasts about <b>${(1 / Math.max(0.05, n.share)).toFixed(1)}×</b> longer` : `, saving about <b>${money(n.alone.cost - n.withQs.cost)}</b> a month`}, and ${100 - n.withQs.leaves}% of your messages never leave your PC.` : calcState.mode === 'fusion' ? 'As a lead, the cloud AI sees every message but gets your PC\'s drafts too: more accurate answers, at a little more cost than using it alone.' : '')}`;
}
// ----- pictures -----
function bestLocal(kind, table) {
  const have = S.installed.filter((m) => m.kind === kind && table[m.catalogId] != null).sort((a, b) => table[b.catalogId] - table[a.catalogId])[0];
  const pick = have || S.catalog?.media?.filter((m) => m.kind === kind && table[m.id] != null && !m.retired && S.est?.media?.[m.id]?.fit !== 'no').sort((a, b) => table[b.id] - table[a.id])[0];
  if (!pick) return null;
  const id = have ? have.catalogId : pick.id;
  return { id, name: catModel(id)?.name || id, rating: table[id], est: S.est?.media?.[id], installed: Boolean(have) };
}
function imageOutHTML() {
  const [label, price0, rating, note] = IMAGE_SERVICES[calcState.imgService];
  const price = calcState.imgPrice ?? price0;
  const n = calcState.imgPerMonth;
  const keepers = Math.round(n * calcState.keep / 100);
  const loc = bestLocal('image', LOCAL_IMG);
  const secs = loc?.est?.sec;
  return `${ccTable([`${label.split(' (')[0]} alone`, 'Quicksilver on your PC', 'Both: try on your PC, finish in the cloud'], [
      ['💵 Cost a month', [price == null ? null : n * price, 0, price == null ? null : keepers * price], (v) => money(v), true],
      ['🖼️ Quality (out of 10)', [`${rating}/10${note ? ` · ${note}` : ''}`, loc ? `${loc.rating}/10 · ${loc.name}${loc.installed ? '' : ' (download)'}` : 'Needs a picture model (Create)', `${rating}/10 for the ones you keep`]],
      ['⏱️ Time per picture', ['Seconds (on their servers)', loc?.est?.fit === 'no' ? "Won't fit this PC" : secs ? `about ${fmtSec(secs)} on this PC` : 'Depends on this PC', `${secs ? `about ${fmtSec(secs)} to try` : 'Quick tries'}, then seconds`]],
      ['🔒 Your prompts and pictures', ['Sent to the service', 'Stay on your PC', `Only the ${keepers} keepers are sent`]],
      ['📴 Works without internet', ['No', 'Yes', 'The tries do']],
    ], `Making ${n} pictures a month: try ideas on your PC for free, and send only the best ${calcState.keep}% to ${label.split(' (')[0]} for the final version. ${price != null ? `That's about <b>${money(n * price - keepers * price)}</b> a month less than making them all in the cloud.` : 'Enter the price to see the saving.'} Quicksilver's AI also writes the detailed prompt for you either way.`)}`;
}
// ----- video -----
function videoOutHTML() {
  const [label, price0, rating] = VIDEO_SERVICES[calcState.vidService];
  const price = calcState.vidPrice ?? price0;
  const sec = calcState.vidSecPerMonth;
  const keep = Math.round(sec * calcState.vkeep / 100);
  const loc = bestLocal('video', LOCAL_VID);
  const fits = loc && loc.est?.fit !== 'no';
  return `${ccTable([`${label.split(' (')[0]} alone`, 'Quicksilver on your PC', 'Both: preview on your PC, finish in the cloud'], [
      ['💵 Cost a month', [price == null ? null : sec * price, 0, price == null ? null : keep * price], (v) => money(v), true],
      ['🎬 Quality (out of 10)', [`${rating}/10, sharp, with sound on most`, fits ? `${loc.rating}/10 · ${loc.name}, short clips${loc.installed ? '' : ' (download)'}` : 'Needs a graphics card with about 8 GB or more', `${rating}/10 for the clips you keep`]],
      ['⏱️ Time per clip', ['A minute or two', fits && loc.est?.sec ? `about ${fmtSec(loc.est.sec)} per short clip here` : fits ? 'Several minutes per short clip' : "Won't run on this PC", 'Quick previews, then a minute or two']],
      ['🔒 Your prompts and photos', ['Sent to the service', 'Stay on your PC', `Only the ${keep} s you keep are made in the cloud`]],
    ], `${sec} seconds of video a month: ${fits ? `preview ideas on your PC, then make only the best ${calcState.vkeep}% in ${label.split(' (')[0]}` : `this PC can't make video itself, so Quicksilver's AI writes the shot list and prompts, and ${label.split(' (')[0]} makes the clips`}. ${price != null && fits ? `That's about <b>${money(sec * price - keep * price)}</b> a month less than making everything in the cloud.` : price != null ? `About <b>${money(sec * price)}</b> a month in the cloud.` : 'Enter the price to see the cost.'} Cloud video apps are used on their own sites for now; bring the clips into Create → Video to trim and edit.`)}`;
}
function calcOutHTML() { return calcState.kind === 'image' ? imageOutHTML() : calcState.kind === 'video' ? videoOutHTML() : chatOutHTML(); }
function calcInputsHTML() {
  const sel = (id, table, cur) => `<select id="${id}">${Object.entries(table).map(([k, v]) => `<option value="${k}" ${cur === k ? 'selected' : ''}>${esc(v[0])}</option>`).join('')}</select>`;
  if (calcState.kind === 'image') return `<label>Cloud picture service${sel('cc-isvc', IMAGE_SERVICES, calcState.imgService)}</label>
      <label>Price per picture <span class="row" style="gap:6px"><span class="small">$</span><input type="number" id="cc-iprice" min="0" step="0.001" value="${calcState.imgPrice ?? IMAGE_SERVICES[calcState.imgService][1] ?? ''}"></span></label>
      <label>Pictures a month <b id="cc-imgn-v">${calcState.imgPerMonth}</b><input type="range" id="cc-imgn" min="10" max="2000" step="10" value="${calcState.imgPerMonth}"></label>
      <label>Share good enough to keep <b id="cc-keep-v">${calcState.keep}%</b><input type="range" id="cc-keep" min="5" max="100" step="5" value="${calcState.keep}"></label>`;
  if (calcState.kind === 'video') return `<label>Cloud video service${sel('cc-vsvc', VIDEO_SERVICES, calcState.vidService)}</label>
      <label>Price per second <span class="row" style="gap:6px"><span class="small">$</span><input type="number" id="cc-vprice" min="0" step="0.01" value="${calcState.vidPrice ?? VIDEO_SERVICES[calcState.vidService][1] ?? ''}"></span></label>
      <label>Seconds of video a month <b id="cc-vsec-v">${calcState.vidSecPerMonth}</b><input type="range" id="cc-vsec" min="10" max="1800" step="10" value="${calcState.vidSecPerMonth}"></label>
      <label>Share good enough to keep <b id="cc-vkeep-v">${calcState.vkeep}%</b><input type="range" id="cc-vkeep" min="5" max="100" step="5" value="${calcState.vkeep}"></label>`;
  return `<label>Cloud AI service${sel('cc-svc', CHAT_SERVICES, calcState.service)}</label>
      <label>Messages a day <b id="cc-perday-v">${calcState.perDay}</b><input type="range" id="cc-perday" min="5" max="300" step="5" value="${calcState.perDay}"></label>
      <label>Share that are hard questions <b id="cc-hard-v">${calcState.hard}%</b><input type="range" id="cc-hard" min="10" max="80" step="5" value="${calcState.hard}" ${calcState.mode === 'hard' ? '' : 'disabled'}></label>
      <label>How Quicksilver uses it<select id="cc-mode">${Object.entries(CALC_MODES).map(([k, [l]]) => `<option value="${k}" ${calcState.mode === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="cc-price">Price per million tokens <span class="row" style="gap:6px"><span class="small">in $</span><input type="number" id="cc-pin" min="0" step="0.05" value="${calcState.priceIn}" ${calcState.free ? 'disabled' : ''}><span class="small">out $</span><input type="number" id="cc-pout" min="0" step="0.05" value="${calcState.priceOut}" ${calcState.free ? 'disabled' : ''}></span></label>
      <label class="row" style="gap:6px;align-self:end"><input type="checkbox" id="cc-free" ${calcState.free ? 'checked' : ''}> It's a free or dev plan</label>`;
}
function cloudCalcHTML() {
  return `<section class="card og-sec" id="cloud-calc"><h3>🧮 Calculator: a cloud AI alone, or through Quicksilver</h3>
    <p class="small" style="margin:0 0 10px">Pick what you'd use it for and which service. Quicksilver doesn't send everything to a cloud AI: your PC does what it can, and the cloud is used where it helps most.</p>
    <div class="tabs cc-kinds" role="tablist">${[['chat', '💬 Chat & answers'], ['image', '📸 Pictures'], ['video', '🎬 Video']].map(([k, l]) => `<button class="tab ${calcState.kind === k ? 'active' : ''}" data-cc-kind="${k}">${l}</button>`).join('')}</div>
    <div class="cc-in" id="cc-in">${calcInputsHTML()}</div>
    <div id="cc-out">${calcOutHTML()}</div>
    <p class="small muted" style="margin:8px 0 0">Prices are what the services list (November 2026) and change often: edit them from the service's price page. Ratings out of 10 are Quicksilver's.</p>
  </section>`;
}
function bindCloudCalc() {
  const box = $('#cloud-calc');
  if (!box) return;
  const out = () => {
    $('#cc-out').innerHTML = calcOutHTML();
    for (const [id, v] of [['cc-perday-v', calcState.perDay], ['cc-hard-v', `${calcState.hard}%`], ['cc-imgn-v', calcState.imgPerMonth], ['cc-keep-v', `${calcState.keep}%`], ['cc-vsec-v', calcState.vidSecPerMonth], ['cc-vkeep-v', `${calcState.vkeep}%`]]) { const el = $(`#${id}`); if (el) el.textContent = v; }
    if ($('#cc-hard')) $('#cc-hard').disabled = calcState.mode !== 'hard';
    if ($('#cc-pin')) { $('#cc-pin').disabled = calcState.free; $('#cc-pout').disabled = calcState.free; }
  };
  const inputs = () => { $('#cc-in').innerHTML = calcInputsHTML(); bindInputs(); out(); };
  const num = (e) => Math.max(0, Number(e.target.value) || 0);
  const on = (id, ev, fn) => $(`#${id}`)?.addEventListener(ev, fn);
  function bindInputs() {
    on('cc-svc', 'change', (e) => { calcState.service = e.target.value; const s = CHAT_SERVICES[calcState.service]; if (s[1] != null) { calcState.priceIn = s[1]; calcState.priceOut = s[2]; } calcState.free = s[3]; inputs(); });
    on('cc-perday', 'input', (e) => { calcState.perDay = num(e); out(); });
    on('cc-hard', 'input', (e) => { calcState.hard = num(e); out(); });
    on('cc-mode', 'change', (e) => { calcState.mode = e.target.value; out(); });
    on('cc-pin', 'input', (e) => { calcState.priceIn = num(e); out(); });
    on('cc-pout', 'input', (e) => { calcState.priceOut = num(e); out(); });
    on('cc-free', 'change', (e) => { calcState.free = e.target.checked; out(); });
    on('cc-isvc', 'change', (e) => { calcState.imgService = e.target.value; calcState.imgPrice = null; inputs(); });
    on('cc-iprice', 'input', (e) => { calcState.imgPrice = num(e); out(); });
    on('cc-imgn', 'input', (e) => { calcState.imgPerMonth = num(e); out(); });
    on('cc-keep', 'input', (e) => { calcState.keep = num(e); out(); });
    on('cc-vsvc', 'change', (e) => { calcState.vidService = e.target.value; calcState.vidPrice = null; inputs(); });
    on('cc-vprice', 'input', (e) => { calcState.vidPrice = num(e); out(); });
    on('cc-vsec', 'input', (e) => { calcState.vidSecPerMonth = num(e); out(); });
    on('cc-vkeep', 'input', (e) => { calcState.vkeep = num(e); out(); });
  }
  $$('[data-cc-kind]').forEach((b) => b.addEventListener('click', () => { calcState.kind = b.dataset.ccKind; $$('[data-cc-kind]').forEach((x) => x.classList.toggle('active', x === b)); inputs(); }));
  bindInputs();
}

// What happens when you add a cloud AI, in plain steps.
const ADD_API_STEPS = [
  ['🔑 You paste a key', 'It\'s encrypted on this PC and only ever sent to that service.'],
  ['📋 Its models appear in every model menu', 'Pick one for a chat like any model; it answers from the cloud.'],
  ['🧠 Optional: hard questions only', 'Switch on "use my cloud AI for hard questions" (Settings → General): everyday messages stay on your PC, hard ones go to the cloud.'],
  ['⚗️ Optional: in a custom AI', 'Fuse it with your PC\'s models on the Fusion tab; it can lead, draft or double-check.'],
  ['♻️ Free rotation', 'Add two or more free services and Quicksilver switches to the next when one hits its daily limit.'],
  ['🔒 What it sees', 'Only the messages that go to it (and the files you attach to those). Offline mode turns all cloud AIs off.'],
];
function addApiHTML() {
  return `<section class="card og-sec"><h3>➕ What happens when you add a cloud AI</h3><div class="tips-grid">${ADD_API_STEPS.map(([k, v]) => `<div class="tip-item"><div><b>${esc(k)}</b><div class="small muted">${esc(v)}</div></div></div>`).join('')}</div></section>`;
}
