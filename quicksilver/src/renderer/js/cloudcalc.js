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
const calcState = { perDay: 40, hard: 35, mode: 'hard', priceIn: 1, priceOut: 5, free: false };
const CALC_MODES = {
  hard: ['Hard questions only', 'Everyday messages are answered on your PC; only hard ones go to the cloud AI (Settings → "use my cloud AI for hard questions").'],
  fusion: ['As the lead of a custom AI', 'Every message goes to the cloud AI, together with drafts from your PC\'s models, so it starts from more angles.'],
  check: ['As the double-checker', 'Your PC answers everything; the cloud AI only checks answers when Double-check is on (say a third of them).'],
};
function calcNumbers() {
  const month = calcState.perDay * 30;
  const share = calcState.mode === 'hard' ? calcState.hard / 100 : calcState.mode === 'fusion' ? 1 : 0.33;
  // Rough sizes, in tokens: a question with recent chat ~700 in, an answer ~450 out; drafts from
  // your PC add ~500 in for a fusion; a check reads the answer and writes a short verdict.
  const alone = { calls: month, tin: month * 700, tout: month * 450 };
  const qsCalls = Math.round(month * share);
  const withQs = calcState.mode === 'fusion' ? { calls: qsCalls, tin: qsCalls * 1200, tout: qsCalls * 450 } : calcState.mode === 'check' ? { calls: qsCalls, tin: qsCalls * 1100, tout: qsCalls * 150 } : { calls: qsCalls, tin: qsCalls * 700, tout: qsCalls * 450 };
  const cost = (x) => (calcState.free ? 0 : (x.tin / 1e6) * calcState.priceIn + (x.tout / 1e6) * calcState.priceOut);
  return { month, share, alone: { ...alone, cost: cost(alone), leaves: 100 }, withQs: { ...withQs, cost: cost(withQs), leaves: Math.round(share * 100) } };
}
function calcOutHTML() {
  const n = calcNumbers();
  const money = (v) => (calcState.free ? 'Free plan' : v < 0.01 ? 'under $0.01' : `$${v < 10 ? v.toFixed(2) : Math.round(v)}`);
  const bar = (v, max, cls) => `<span class="cc-bar"><i class="${cls}" style="width:${max ? Math.max(2, Math.round((v / max) * 100)) : 0}%"></i></span>`;
  const rows = [
    ['☁️ Messages sent to the cloud a month', n.alone.calls, n.withQs.calls, (v) => v.toLocaleString()],
    ['💵 Estimated cost a month', n.alone.cost, n.withQs.cost, money],
    ['🔒 Your messages that leave your PC', n.alone.leaves, n.withQs.leaves, (v) => `${v}%`],
  ];
  const saved = n.alone.calls ? Math.round((1 - n.withQs.calls / n.alone.calls) * 100) : 0;
  return `<p class="small muted" style="margin:6px 0 10px">${esc(CALC_MODES[calcState.mode][1])} Prices are per million tokens (about 750,000 words); copy them from the service's price page.</p>
    <div class="cc-table"><div class="cc-h"><span></span><b>The cloud AI alone</b><b>Through Quicksilver</b></div>
      ${rows.map(([l, a, q, f]) => `<div class="cc-r"><span>${l}</span><span>${bar(a, Math.max(a, q), 'cc-a')}<b>${f(a)}</b></span><span>${bar(q, Math.max(a, q), 'cc-q')}<b>${f(q)}</b></span></div>`).join('')}
      <div class="cc-r"><span>📴 Works without internet</span><span><b>No</b></span><span><b>${calcState.mode === 'fusion' ? 'No (the cloud AI leads)' : 'Yes, for everyday messages'}</b></span></div>
      <div class="cc-r"><span>⚡ Everyday answers</span><span><b>From the cloud</b></span><span><b>${calcState.mode === 'fusion' ? 'From the cloud, with your PC\'s drafts' : 'From your PC (private, no limits)'}</b></span></div>
      <div class="cc-r"><span>🎯 Hard questions</span><span><b>The cloud AI on its own</b></span><span><b>${calcState.mode === 'check' ? 'Your PC, checked by the cloud AI' : 'The cloud AI, given your PC\'s drafts and step-by-step working'}</b></span></div>
    </div>
    ${calcState.mode !== 'fusion' && saved > 0 ? `<p class="cc-sum">Through Quicksilver you send <b>${saved}% fewer</b> messages to the cloud${calcState.free ? `, so a free plan's daily limit lasts about <b>${(1 / Math.max(0.05, n.share)).toFixed(1)}×</b> longer` : `, saving about <b>${money(n.alone.cost - n.withQs.cost)}</b> a month`}, and ${100 - n.withQs.leaves}% of your messages never leave your PC.</p>` : calcState.mode === 'fusion' ? '<p class="cc-sum">As a lead, the cloud AI sees every message but gets your PC\'s drafts too: more accurate answers, at a little more cost than using it alone.</p>' : ''}`;
}
function cloudCalcHTML() {
  return `<section class="card og-sec" id="cloud-calc"><h3>🧮 Calculator: a cloud AI alone, or through Quicksilver</h3>
    <p class="small" style="margin:0 0 10px">When you add a cloud AI, Quicksilver doesn't send everything to it: your PC answers what it can, and the cloud AI is used where it helps most. Move the sliders to see what that changes for you.</p>
    <div class="cc-in">
      <label>Messages a day <b id="cc-perday-v">${calcState.perDay}</b><input type="range" id="cc-perday" min="5" max="300" step="5" value="${calcState.perDay}"></label>
      <label>Share that are hard questions <b id="cc-hard-v">${calcState.hard}%</b><input type="range" id="cc-hard" min="10" max="80" step="5" value="${calcState.hard}" ${calcState.mode === 'hard' ? '' : 'disabled'}></label>
      <label>How Quicksilver uses it<select id="cc-mode">${Object.entries(CALC_MODES).map(([k, [l]]) => `<option value="${k}" ${calcState.mode === k ? 'selected' : ''}>${l}</option>`).join('')}</select></label>
      <label class="cc-price">Price per million tokens <span class="row" style="gap:6px"><span class="small">in $</span><input type="number" id="cc-pin" min="0" step="0.05" value="${calcState.priceIn}" ${calcState.free ? 'disabled' : ''}><span class="small">out $</span><input type="number" id="cc-pout" min="0" step="0.05" value="${calcState.priceOut}" ${calcState.free ? 'disabled' : ''}></span></label>
      <label class="row" style="gap:6px;align-self:end"><input type="checkbox" id="cc-free" ${calcState.free ? 'checked' : ''}> It's a free or dev plan</label>
    </div>
    <div id="cc-out">${calcOutHTML()}</div>
  </section>`;
}
function bindCloudCalc() {
  const box = $('#cloud-calc');
  if (!box) return;
  const out = () => {
    $('#cc-out').innerHTML = calcOutHTML();
    $('#cc-perday-v').textContent = calcState.perDay;
    $('#cc-hard-v').textContent = `${calcState.hard}%`;
    $('#cc-hard').disabled = calcState.mode !== 'hard';
    $('#cc-pin').disabled = calcState.free; $('#cc-pout').disabled = calcState.free;
  };
  $('#cc-perday').addEventListener('input', (e) => { calcState.perDay = Number(e.target.value); out(); });
  $('#cc-hard').addEventListener('input', (e) => { calcState.hard = Number(e.target.value); out(); });
  $('#cc-mode').addEventListener('change', (e) => { calcState.mode = e.target.value; out(); });
  $('#cc-pin').addEventListener('input', (e) => { calcState.priceIn = Math.max(0, Number(e.target.value) || 0); out(); });
  $('#cc-pout').addEventListener('input', (e) => { calcState.priceOut = Math.max(0, Number(e.target.value) || 0); out(); });
  $('#cc-free').addEventListener('change', (e) => { calcState.free = e.target.checked; out(); });
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
