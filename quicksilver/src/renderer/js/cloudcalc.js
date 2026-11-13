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
const calcState = { songsPerMonth: 10, musicService: 'minimax', mkeep: 50, kind: 'chat', perDay: 40, hard: 35, mode: 'hard', priceIn: 1, priceOut: 5, free: false, service: 'gpt-terra', imgPerMonth: 100, imgService: 'nano', keep: 25, vidSecPerMonth: 120, vidService: 'veo', vkeep: 30 };
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
// Full compositions (whole songs, not clips). [label, $ per song (about 2½ minutes), rating /10, note]
const MUSIC_SERVICES = {
  elevenlabs: ['ElevenLabs Music (fal.ai)', 2, 9, 'full songs, sung or instrumental, about $0.80 a minute'],
  minimax: ['MiniMax Music 2.6 (fal.ai)', 0.15, 8, 'full songs up to about 3 minutes, sung from your lyrics'],
  mureka: ['Mureka v9 (fal.ai)', null, 8, 'full songs from long lyrics; enter the price from fal'],
  other: ['Another service (enter its price)', null, 8, ''],
};
// Quicksilver's own picture and video models, rated on the same scale as the cloud ones.
const LOCAL_IMG = { 'flux-schnell': 7, sdxl: 6, 'sdxl-turbo': 5, sd15: 3, 'flux-kontext': 7, 'qwen-image-edit': 7 };
const LOCAL_VID = { 'wan2.2-5b': 5, 'wan2.1-1.3b': 3 };
const CALC_MODES = {
  hard: ['Hard questions only', 'Everyday messages are answered on your PC; only hard ones go to the cloud AI (Settings → "use my cloud AI for hard questions").'],
  fusion: ['As the lead of a custom AI', 'Every message goes to the cloud AI, together with drafts from your PC\'s models, so it starts from more angles.'],
  check: ['As the double-checker', 'Your PC answers everything; the cloud AI only checks answers when Double-check is on (say a third of them).'],
};
const TEN = '★★★★★★★★★★';
const tenStarsHTML = (r) => (r == null ? '<span class="muted">not rated</span>' : `<span class="ten-stars" role="img" aria-label="${r} out of 10 stars" title="${r} out of 10"><span class="ts-bg">${TEN}</span><span class="ts-fg" style="width:${Math.max(0, Math.min(10, r)) * 10}%">${TEN}</span></span> <b class="ts-n">${r}/10</b>`);
const tenStarsText = (r) => (r == null ? '' : `${'★'.repeat(Math.round(r))}${'☆'.repeat(10 - Math.round(r))} ${r}/10`);
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
      ['🎯 Hard questions (out of 10)', [`${tenStarsHTML(svc[4])}<span class="small muted">${esc(svc[0].split(' (')[0])}</span>`, calcState.mode === 'check' ? 'Your PC, checked by the cloud AI' : `${tenStarsHTML(Math.min(10, svc[4] + 0.5))}<span class="small muted">${esc(svc[0].split(' (')[0])} with your PC's drafts and working</span>`]],
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
      ['🖼️ Quality (out of 10)', [`${tenStarsHTML(rating)}${note ? `<span class="small muted">${esc(note)}</span>` : ''}`, loc ? `${tenStarsHTML(loc.rating)}<span class="small muted">${esc(loc.name)}${loc.installed ? '' : ' (download)'}</span>` : 'Needs a picture model (Create)', `${tenStarsHTML(rating)}<span class="small muted">for the ones you keep</span>`]],
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
      ['🎬 Quality (out of 10)', [`${tenStarsHTML(rating)}<span class="small muted">sharp, with sound on most</span>`, fits ? `${tenStarsHTML(loc.rating)}<span class="small muted">${esc(loc.name)}, short clips${loc.installed ? '' : ' (download)'}</span>` : 'Needs a graphics card with about 8 GB or more', `${tenStarsHTML(rating)}<span class="small muted">for the clips you keep</span>`]],
      ['⏱️ Time per clip', ['A minute or two', fits && loc.est?.sec ? `about ${fmtSec(loc.est.sec)} per short clip here` : fits ? 'Several minutes per short clip' : "Won't run on this PC", 'Quick previews, then a minute or two']],
      ['🔒 Your prompts and photos', ['Sent to the service', 'Stay on your PC', `Only the ${keep} s you keep are made in the cloud`]],
    ], `${sec} seconds of video a month: ${fits ? `preview ideas on your PC, then make only the best ${calcState.vkeep}% in ${label.split(' (')[0]}` : `this PC can't make video itself, so Quicksilver's AI writes the shot list and prompts, and ${label.split(' (')[0]} makes the clips`}. ${price != null && fits ? `That's about <b>${money(sec * price - keep * price)}</b> a month less than making everything in the cloud.` : price != null ? `About <b>${money(sec * price)}</b> a month in the cloud.` : 'Enter the price to see the cost.'} Cloud video apps are used on their own sites for now; bring the clips into Gallery & tools → Video to trim and edit.`)}`;
}
const svcRating = (table, k) => (table === CHAT_SERVICES ? table[k][4] : table[k][2]);
function svcPrice(table, k) {
  const v = table[k];
  if (table === CHAT_SERVICES) return v[3] ? 'Free (daily limits)' : v[1] == null ? 'Your price' : `$${v[1]} in · $${v[2]} out per million tokens`;
  if (v[1] == null) return 'Your price';
  if (table === MUSIC_SERVICES) return `about $${v[1]} a song`;
  return table === IMAGE_SERVICES ? `$${v[1]} a picture` : `$${v[1]} a second ($${(v[1] * 8).toFixed(2)} for an 8 s clip)`;
}
function priceListHTML() {
  const [table, cur, local, what] = calcState.kind === 'image' ? [IMAGE_SERVICES, calcState.imgService, LOCAL_IMG, 'picture'] : calcState.kind === 'video' ? [VIDEO_SERVICES, calcState.vidService, LOCAL_VID, 'video'] : calcState.kind === 'music' ? [MUSIC_SERVICES, calcState.musicService, null, 'music'] : [CHAT_SERVICES, calcState.service, null, 'chat'];
  const rows = Object.keys(table).filter((k) => k !== 'other').sort((a, b) => svcRating(table, b) - svcRating(table, a));
  const loc = local && bestLocal(calcState.kind, local);
  return `<details class="cc-list" ${calcState.listOpen ? 'open' : ''}><summary><b>⭐ Price list: every ${what} service rated out of 10</b> <span class="small muted">(best first)</span></summary>
    <div class="cc-plist">${rows.map((k) => `<div class="cc-p ${k === cur ? 'now' : ''}"><span class="grow"><b>${esc(table[k][0])}</b><span class="small muted">${esc(svcPrice(table, k))}${(table === IMAGE_SERVICES || table === MUSIC_SERVICES) && table[k][3] ? ` · ${esc(table[k][3])}` : ''}</span></span>${tenStarsHTML(svcRating(table, k))}${k === cur ? '<span class="badge b-mint">Picked</span>' : `<button class="btn small ghost" data-cc-pick="${k}">Compare</button>`}</div>`).join('')}
    ${what === 'music' ? `<div class="cc-p local"><span class="grow"><b>💻 Built-in synth (on your PC)</b><span class="small muted">Free, private, works offline · instrumentals only</span></span>${tenStarsHTML(SYNTH_MUSIC * 2)}<span class="badge b-sky">Built in</span></div>` : what === 'chat' ? `<div class="cc-p local"><span class="grow"><b>💧 Quicksilver Liquid Edition (on your PC)</b><span class="small muted">Free, private, works offline · uncensored</span></span>${tenStarsHTML(6.5)}<span class="badge b-sky">Built in</span></div>` : loc ? `<div class="cc-p local"><span class="grow"><b>💻 ${esc(loc.name)} (on your PC)</b><span class="small muted">Free, private, works offline${loc.installed ? '' : ' · download in Create'}</span></span>${tenStarsHTML(loc.rating)}<span class="badge b-sky">${loc.installed ? 'Installed' : 'Local'}</span></div>` : ''}</div>
    <p class="small muted" style="margin:6px 0 0">Ratings out of 10 are Quicksilver's, for the quality of what each service makes (${what === 'chat' ? 'accuracy on hard questions, from independent tests' : what === 'picture' ? 'detail, following the prompt, text in images' : what === 'music' ? 'sound quality, vocals, following the style' : 'sharpness, motion, sound'}). Prices are list prices and change often.</p></details>`;
}
// ----- music -----
function musicOutHTML() {
  const [label, price0, rating, note] = MUSIC_SERVICES[calcState.musicService];
  const price = calcState.musicPrice ?? price0;
  const n = calcState.songsPerMonth;
  const keep = Math.round(n * calcState.mkeep / 100);
  const name = label.split(' (')[0];
  return `${ccTable([`${name} alone`, 'Quicksilver on your PC', 'Both: sketch on your PC, finish in the cloud'], [
      ['💵 Cost a month', [price == null ? null : n * price, 0, price == null ? null : keep * price], (v) => money(v), true],
      ['🎵 Quality (out of 10)', [`${tenStarsHTML(rating)}${note ? `<span class="small muted">${esc(note)}</span>` : ''}`, `${tenStarsHTML(SYNTH_MUSIC * 2)}<span class="small muted">built-in synth, instrumentals only</span>`, `${tenStarsHTML(rating)}<span class="small muted">for the songs you finish</span>`]],
      ['🎤 Vocals', ['Yes', 'No (instrumental)', 'Yes, on the finished songs']],
      ['✍️ Lyrics and style prompt', ['You write them', 'Quicksilver\'s AI writes them', 'Quicksilver\'s AI writes them']],
    ], `${n} songs a month: sketch the idea and melody on your PC for free, let Quicksilver write the lyrics and the style prompt, and make the best ${calcState.mkeep}% in ${name}. ${price != null ? `That's about <b>${money(n * price - keep * price)}</b> a month less than making them all in the cloud.` : 'Enter the price to see the saving.'} Connect fal.ai once and make them in Gallery & tools → Cloud.`)}`;
}
function calcOutHTML() { return calcState.kind === 'image' ? imageOutHTML() : calcState.kind === 'video' ? videoOutHTML() : calcState.kind === 'music' ? musicOutHTML() : chatOutHTML(); }
function calcInputsHTML() {
  const sel = (id, table, cur) => `<select id="${id}">${Object.entries(table).map(([k, v]) => `<option value="${k}" ${cur === k ? 'selected' : ''}>${esc(v[0])}${k === 'other' ? '' : ` · ${tenStarsText(svcRating(table, k))}`}</option>`).join('')}</select>`;
  if (calcState.kind === 'image') return `<label>Cloud picture service${sel('cc-isvc', IMAGE_SERVICES, calcState.imgService)}</label>
      <label>Price per picture <span class="row" style="gap:6px"><span class="small">$</span><input type="number" id="cc-iprice" min="0" step="0.001" value="${calcState.imgPrice ?? IMAGE_SERVICES[calcState.imgService][1] ?? ''}"></span></label>
      <label>Pictures a month <b id="cc-imgn-v">${calcState.imgPerMonth}</b><input type="range" id="cc-imgn" min="10" max="2000" step="10" value="${calcState.imgPerMonth}"></label>
      <label>Share good enough to keep <b id="cc-keep-v">${calcState.keep}%</b><input type="range" id="cc-keep" min="5" max="100" step="5" value="${calcState.keep}"></label>`;
  if (calcState.kind === 'music') return `<label>Cloud music service${sel('cc-msvc', MUSIC_SERVICES, calcState.musicService)}</label>
      <label>Price per song <span class="row" style="gap:6px"><span class="small">$</span><input type="number" id="cc-mprice" min="0" step="0.01" value="${calcState.musicPrice ?? MUSIC_SERVICES[calcState.musicService][1] ?? ''}"></span></label>
      <label>Songs a month <b id="cc-songs-v">${calcState.songsPerMonth}</b><input type="range" id="cc-songs" min="1" max="200" step="1" value="${calcState.songsPerMonth}"></label>
      <label>Share worth finishing <b id="cc-mkeep-v">${calcState.mkeep}%</b><input type="range" id="cc-mkeep" min="5" max="100" step="5" value="${calcState.mkeep}"></label>`;
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
// ---------- what free APIs can do, and what paying adds ----------
// [icon, job, free: [service, limit, rating /10, where], paid: [service, price, rating /10, where], what paying adds]
// where: 'app' = works inside Quicksilver once connected, 'pc' = on this PC, 'site' = on the service's own site.
const FREE_PAID = [
  ['💬', 'Chat & everyday answers', ['Google Gemini, Groq or Cerebras free plans', 'daily limits (e.g. Groq about 1,000 requests a day, Cerebras 1M words a day)', 8.5, 'app'], ['OpenAI GPT-6 Astra or Anthropic Claude', 'about $1–$50 per million words', 10, 'app'], 'No daily limits, the top models, and your prompts aren\'t used for training on most paid plans.'],
  ['🧠', 'Hard reasoning & maths', ['Google Gemini free plan (95% on graduate-level science)', 'daily limits; prompts may be used to improve Google\'s models', 9.5, 'app'], ['OpenAI GPT-6 Astra (96%)', 'about $10 in / $50 out per million words', 10, 'app'], 'A little more accuracy, much higher limits and more privacy.'],
  ['💻', 'Coding', ['Groq gpt-oss-120b free plan (88% on a coding test)', 'about 1,000 requests a day', 8.5, 'app'], ['Anthropic Claude', 'pay as you go', 10, 'app'], 'Bigger programs written right first time, and long code reviews.'],
  ['🔎', 'Research with sources', ['Built-in web search (DuckDuckGo, Mojeek, Wikipedia); Tavily 1,000 searches a month', 'unlimited built-in search', 8.5, 'app'], ['Perplexity Sonar Pro', 'pay as you go', 9, 'app'], 'Deeper searches that read more pages per question.'],
  ['🌍', 'Translation', ['MyMemory (about 5,000 words a day, no account) or DeepL Free (500,000 characters a month)', 'free', 8.5, 'app'], ['DeepL Pro', 'from about $9 a month', 9.5, 'app'], 'Unlimited text and whole documents with formatting kept.'],
  ['🖼️', 'Photo creation', ['Pollinations (free, no key), Replicate ($5 credits), Stability AI (25 credits a month), Together FLUX Schnell Free', 'free; rate limited', 6.5, 'app'], ['Google Nano Banana 2.1 or OpenAI GPT Image', 'about $0.04–$0.05 a picture', 10, 'app'], 'Sharper detail, readable text in pictures, and prompts followed exactly.'],
  ['🪄', 'Photo editing', ['Your PC (Qwen Image Edit or FLUX Kontext with a graphics card)', 'free, private', 7, 'pc'], ['Nano Banana 2.1 Edit (fal.ai)', 'about $0.04 an edit', 9, 'app'], 'Faces and fine details kept when you change a photo by description.'],
  ['🎬', 'Video creation', ['Kling free daily credits (on Kling\'s site), Replicate $5 credits, or Wan on your PC with a graphics card', 'a few short clips a day', 5, 'site'], ['Google Veo 3.1 or Kling 3 Pro (fal.ai)', 'about $0.40 a second for Veo 3.1', 10, 'app'], 'Sharp 1080p video with sound, longer clips, and it works inside Quicksilver.'],
  ['🎵', 'Music (full songs)', ['Suno, about 5 songs a day (on Suno\'s site); the built-in synth for instrumentals', 'free', 7, 'site'], ['ElevenLabs Music or MiniMax Music 2.6 (fal.ai)', 'about $0.15 a song (MiniMax) to $0.80 a minute (ElevenLabs)', 9, 'app'], 'Whole songs with vocals made inside Quicksilver, any length, with your lyrics.'],
  ['🔓', 'Uncensored chat & pictures', ['Quicksilver Liquid Edition on your PC (uncensored models, free, private); local picture models have no filter', 'free, unlimited', 7, 'pc'], ['Venice AI (uncensored chat and pictures, private)', 'about $0.70 in / $2.80 out per million tokens; small free allowance', 8, 'app'], 'Bigger uncensored models in the cloud for the hardest questions, and uncensored pictures without a graphics card.'],
  ['🎙️', 'Voice & transcription', ['Built-in Whisper and voices on your PC; ElevenLabs 10,000 characters a month', 'free, private', 7.5, 'pc'], ['ElevenLabs paid voices', 'from about $5 a month', 9.5, 'site'], 'Ultra-realistic voices and voice cloning.'],
];
const WHERE = { app: ['In Quicksilver', 'b-mint'], pc: ['On this PC', 'b-sky'], site: ['On their site', 'b-lav'] };
function freePaidHTML() {
  return `<section class="card og-sec" id="free-paid"><h3>💸 Free vs paid: what each gets you</h3>
    <p class="small" style="margin:0 0 10px">What you can do at no cost, what paying adds, and the output quality of each out of 10. "In Quicksilver" means it works inside the app once you add the key (Models → Connect an API, Gallery & tools → Cloud or Connectors).</p>
    <div class="fp-table"><div class="fp-h"><span>Job</span><span>🆓 Free</span><span>💳 Paid</span></div>
    ${FREE_PAID.map(([ic, job, f, p, adds]) => `<div class="fp-r"><span><b>${ic} ${esc(job)}</b><span class="small muted">Paying adds: ${esc(adds)}</span></span>
      <span><b>${esc(f[0])}</b><span class="small muted">${esc(f[1])}</span><span class="row" style="gap:6px">${tenStarsHTML(f[2])}<span class="badge ${WHERE[f[3]][1]}">${WHERE[f[3]][0]}</span></span></span>
      <span><b>${esc(p[0])}</b><span class="small muted">${esc(p[1])}</span><span class="row" style="gap:6px">${tenStarsHTML(p[2])}<span class="badge ${WHERE[p[3]][1]}">${WHERE[p[3]][0]}</span></span></span></div>`).join('')}</div>
    <p class="small muted" style="margin:8px 0 0">Free plans change often and usually have daily limits; some free plans use your prompts to improve their models. Ratings out of 10 are Quicksilver's, from independent tests where they exist. Sources include the community list of free AI APIs (github.com/OuterSpacee/free-ai-apis).</p></section>`;
}
function cloudCalcHTML() {
  return `<section class="card og-sec" id="cloud-calc"><h3>🧮 Calculator: a cloud AI alone, or through Quicksilver</h3>
    <p class="small" style="margin:0 0 10px">Pick what you'd use it for and which service. Quicksilver doesn't send everything to a cloud AI: your PC does what it can, and the cloud is used where it helps most.</p>
    <div class="tabs cc-kinds" role="tablist">${[['chat', '💬 Chat & answers'], ['image', '📸 Pictures'], ['video', '🎬 Video'], ['music', '🎵 Music']].map(([k, l]) => `<button class="tab ${calcState.kind === k ? 'active' : ''}" data-cc-kind="${k}">${l}</button>`).join('')}</div>
    <div class="cc-in" id="cc-in">${calcInputsHTML()}</div>
    <div id="cc-out">${calcOutHTML()}</div>
    <div id="cc-list">${priceListHTML()}</div>
    <p class="small muted" style="margin:8px 0 0">Prices are what the services list (November 2026) and change often: edit them from the service's price page. Ratings out of 10 are Quicksilver's.</p>
  </section>`;
}
function bindCloudCalc() {
  const box = $('#cloud-calc');
  if (!box) return;
  const out = () => {
    $('#cc-out').innerHTML = calcOutHTML();
    for (const [id, v] of [['cc-perday-v', calcState.perDay], ['cc-hard-v', `${calcState.hard}%`], ['cc-imgn-v', calcState.imgPerMonth], ['cc-keep-v', `${calcState.keep}%`], ['cc-vsec-v', calcState.vidSecPerMonth], ['cc-vkeep-v', `${calcState.vkeep}%`], ['cc-songs-v', calcState.songsPerMonth], ['cc-mkeep-v', `${calcState.mkeep}%`]]) { const el = $(`#${id}`); if (el) el.textContent = v; }
    if ($('#cc-hard')) $('#cc-hard').disabled = calcState.mode !== 'hard';
    if ($('#cc-pin')) { $('#cc-pin').disabled = calcState.free; $('#cc-pout').disabled = calcState.free; }
  };
  const list = () => {
    $('#cc-list').innerHTML = priceListHTML();
    $('#cc-list details')?.addEventListener('toggle', (e) => { calcState.listOpen = e.target.open; });
    $$('[data-cc-pick]').forEach((b) => b.addEventListener('click', () => {
      const k = b.dataset.ccPick;
      if (calcState.kind === 'music') { calcState.musicService = k; calcState.musicPrice = null; } else if (calcState.kind === 'image') { calcState.imgService = k; calcState.imgPrice = null; } else if (calcState.kind === 'video') { calcState.vidService = k; calcState.vidPrice = null; } else { calcState.service = k; const sv = CHAT_SERVICES[k]; if (sv[1] != null) { calcState.priceIn = sv[1]; calcState.priceOut = sv[2]; } calcState.free = sv[3]; }
      inputs();
    }));
  };
  const inputs = () => { $('#cc-in').innerHTML = calcInputsHTML(); bindInputs(); out(); list(); };
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
    on('cc-msvc', 'change', (e) => { calcState.musicService = e.target.value; calcState.musicPrice = null; inputs(); });
    on('cc-mprice', 'input', (e) => { calcState.musicPrice = num(e); out(); });
    on('cc-songs', 'input', (e) => { calcState.songsPerMonth = num(e); out(); });
    on('cc-mkeep', 'input', (e) => { calcState.mkeep = num(e); out(); });
  }
  $$('[data-cc-kind]').forEach((b) => b.addEventListener('click', () => { calcState.kind = b.dataset.ccKind; $$('[data-cc-kind]').forEach((x) => x.classList.toggle('active', x === b)); inputs(); }));
  bindInputs();
  list();
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
