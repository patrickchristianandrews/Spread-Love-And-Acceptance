// Guide → Best cloud AIs → API rankings: every cloud service Quicksilver can use, ranked by what it's
// best for, how much it gives free and what it costs after that. Each is scored out of 10 on output
// quality, free allowance and price (10 = cheapest), and the value score combines the three.
'use strict';

// [preset or '', name, uses[], best for, free allowance, price after, quality /10, free /10, price /10, where]
// where: 'app' works inside Quicksilver once connected, 'site' on the service's own site.
const API_RANK = [
  ['google', 'Google Gemini', ['chat', 'reasoning', 'coding', 'photos-in'], 'All-round best free: hard questions, reading photos, long documents', 'Free plan with daily limits, no card', 'Gemini 4 Argon about $4 in / $20 out per million tokens', 9.5, 9, 7, 'app'],
  ['groq', 'Groq', ['chat', 'coding'], 'Very fast answers and coding (gpt-oss-120b, 88% on a coding test)', 'Free plan: about 1,000 requests a day', 'Low: well under $1 per million tokens', 8.5, 8.5, 9, 'app'],
  ['cerebras', 'Cerebras', ['chat', 'reasoning'], 'The fastest big model (Qwen3 235B)', 'Free: about 1 million tokens a day', 'Developer tier, pay as you go', 8, 9, 8.5, 'app'],
  ['openrouter', 'OpenRouter', ['chat', 'coding', 'reasoning'], 'Hundreds of models with one key; switch any time', '":free" models: 50 requests a day (1,000 with $10 credit)', 'Each model\'s own price', 8.5, 6.5, 8, 'app'],
  ['mistral', 'Mistral AI', ['chat', 'translation'], 'European, good at languages and writing', 'Free Experiment plan with a daily quota (phone check)', 'Pay as you go, mid-priced', 8, 7.5, 7.5, 'app'],
  ['github', 'GitHub Models', ['chat', 'coding'], 'Trying top models (GPT-4.1) with a GitHub account', 'Free with low daily limits', 'Pay as you go through GitHub', 8.5, 5.5, 7, 'app'],
  ['cloudflare', 'Cloudflare Workers AI', ['chat', 'photos'], 'Open models and images on a free daily allowance', 'Free: 10,000 "neurons" a day', 'Low, per use', 7, 7, 9, 'app'],
  ['zai', 'Z.ai (GLM)', ['chat', 'coding'], 'GLM Flash models free; GLM flagship is strong at coding', 'GLM Flash models free', 'Flagship pay as you go, low', 7.5, 8, 8.5, 'app'],
  ['sambanova', 'SambaNova', ['chat'], 'Big open models at high speed', 'Free tier with rate limits', 'Low', 7, 7, 8.5, 'app'],
  ['nvidia', 'NVIDIA NIM', ['chat', 'coding'], 'Many open models (DeepSeek, Qwen, Nemotron)', 'Free developer credits, rate limited', 'Paid plans', 7.5, 6.5, 6.5, 'app'],
  ['together', 'Together AI', ['chat', 'photos'], 'Open models and FLUX pictures', '$5 credits; FLUX.1 Schnell Free', 'Low, per use', 7.5, 6.5, 8.5, 'app'],
  ['cohere', 'Cohere', ['chat'], 'Business writing and documents', 'Trial key: 1,000 calls a month', 'Pay as you go', 7.5, 5, 6.5, 'app'],
  ['huggingface', 'Hugging Face', ['chat', 'photos'], 'Thousands of open models', 'Small monthly credits', 'Pay as you go', 7.5, 3.5, 7, 'app'],
  ['aimlapi', 'AI/ML API', ['chat', 'coding'], '200+ models (GPT, Claude, Gemini) with one key', 'Small free tier', 'Pay as you go', 8.5, 4, 6.5, 'app'],
  ['deepseek', 'DeepSeek', ['reasoning', 'coding'], 'Top-level reasoning at a very low price (93% science)', 'None', 'Very low: well under $1 per million tokens', 9.3, 0, 9.5, 'app'],
  ['openai', 'OpenAI (GPT-6 Astra, GPT Image)', ['chat', 'reasoning', 'coding', 'photos'], 'The highest scores (96% science) and the best pictures', 'None (the ChatGPT plan doesn\'t include the API)', 'Astra $10 in / $50 out per million tokens; pictures about $0.05', 10, 0, 3, 'app'],
  ['anthropic', 'Anthropic (Claude)', ['writing', 'coding', 'reasoning'], 'The most natural writing and the best for long code', 'None', 'Pay as you go, premium', 10, 0, 3.5, 'app'],
  ['perplexity', 'Perplexity Sonar', ['research'], 'Web research with sources in every answer', 'None (a little with Pro)', 'Pay as you go', 9, 1, 6, 'app'],
  ['uncensoredllm', 'UncensoredLLM', ['chat', 'uncensored', 'writing', 'coding'], 'The widest choice of uncensored models: 171 with one key, from GLM-5.3 and DeepSeek V4 to role-play and novel-writing builds', 'None: prepaid from $10 (never expires)', 'From about $0.11 in / $0.37 out per million tokens (GLM-5.3 Flash Uncensored); big models $1 to $6', 8.5, 0, 8, 'app'],
  ['venice', 'Venice AI', ['chat', 'uncensored'], 'Uncensored and private (the suggested cloud AI for the Liquid Edition)', 'A small free allowance', 'About $0.70 in / $2.80 out per million tokens', 7, 3, 7.5, 'app'],
  ['', 'Pollinations', ['photos'], 'Free pictures with no account at all', 'Free, no key (rate limited)', 'Free', 6, 10, 10, 'app'],
  ['replicate', 'Replicate', ['photos', 'video', 'music'], 'Thousands of image, video and music models', '$5 credits, no card', 'FLUX.1 Schnell about $0.003 a picture', 7.5, 7, 9, 'app'],
  ['stability', 'Stability AI', ['photos'], 'Stable Image Core and Ultra pictures', '25 credits a month (about 8 pictures)', 'Credits from $10', 7.5, 5.5, 7.5, 'app'],
  ['fal', 'fal.ai', ['photos', 'editing', 'video', 'music'], 'The best photo, edit, video and full-song models with one key', 'None (new accounts sometimes get a little)', 'Nano Banana about $0.04 a picture; Veo 3.1 about $0.40 a second; songs $0.15–$0.80/min', 9.5, 1, 6, 'app'],
  ['', 'Kling AI', ['video'], 'Good video with free daily tries', 'Free daily credits', 'Plans from about $10 a month', 8.5, 6, 6.5, 'site'],
  ['', 'Suno', ['music'], 'Full songs with vocals', 'About 5 songs a day', 'Plans from about $10 a month', 8.5, 6, 6.5, 'site'],
  ['translate', 'DeepL (Translation connector)', ['translation'], 'The most natural translations', 'Free API: 500,000 characters a month', 'Pro from about $9 a month', 9.5, 8, 7, 'app'],
  ['translate', 'MyMemory (Translation connector)', ['translation'], 'Quick translations with no account', 'About 5,000 words a day, no key', 'Free', 7.5, 7, 10, 'app'],
  ['', 'Tavily search', ['research'], 'Search built for AI agents (Settings → Web search)', '1,000 searches a month', 'Pay as you go', 8.5, 6, 7, 'app'],
  ['', 'ElevenLabs voices', ['voice'], 'Ultra-realistic voices', '10,000 characters a month', 'From about $5 a month', 9.5, 4, 6.5, 'site'],
];
const RANK_USES = { all: 'Everything', chat: '💬 Chat', reasoning: '🧠 Reasoning', coding: '💻 Coding', writing: '✍️ Writing', research: '🔎 Research', photos: '🖼️ Photos', editing: '🪄 Editing', video: '🎬 Video', music: '🎵 Music', translation: '🌍 Translation', voice: '🎙️ Voice', uncensored: '🔓 Uncensored' };
const RANK_SORTS = { value: 'Best value', quality: 'Best quality', free: 'Most free', cheap: 'Lowest cost' };
const rankState = { use: 'all', sort: 'value' };
// Value: quality counts most, then how much is free, then the price after.
const rankValue = (r) => Math.round((r[6] * 0.5 + r[7] * 0.3 + r[8] * 0.2) * 10) / 10;
function apiRankRows() {
  const key = { value: rankValue, quality: (r) => r[6], free: (r) => r[7], cheap: (r) => r[8] }[rankState.sort];
  return API_RANK.filter((r) => rankState.use === 'all' || r[2].includes(rankState.use))
    .sort((a, b) => key(b) - key(a) || b[6] - a[6]);
}
const scoreBadge = (v) => `<b class="${v >= 8 ? 'bz-up' : ''}">${v}/10</b>`;
function apiRankHTML() {
  const rows = apiRankRows();
  const connected = (preset) => preset && (S.providers || []).some((p) => p.preset === preset && (p.hasKey || p.noKey));
  return `<section class="card og-sec" id="api-rank"><h3>🏆 API rankings: best use, free credits and cost</h3>
    <p class="small" style="margin:0 0 8px">Every cloud service Quicksilver can use, scored out of 10 on output quality, how much you get free, and price after that (10 = cheapest). <b>Value</b> weighs quality most, then the free allowance, then the price.</p>
    <div class="row" style="gap:6px;flex-wrap:wrap;margin-bottom:6px">${Object.entries(RANK_SORTS).map(([k, l]) => `<button class="btn small ${rankState.sort === k ? 'primary' : ''}" data-rank-sort="${k}">${l}</button>`).join('')}</div>
    <div class="row" style="gap:4px;flex-wrap:wrap;margin-bottom:10px">${Object.entries(RANK_USES).map(([k, l]) => `<button class="chip-tog ${rankState.use === k ? 'on' : ''}" data-rank-use="${k}">${l}</button>`).join('')}</div>
    <div class="ar-table"><div class="ar-h"><span>#</span><span>Service · best for</span><span>Free</span><span>After that</span><span>Quality</span><span>Free</span><span>Price</span><span>Value</span></div>
    ${rows.map((r, i) => `<div class="ar-r"><span class="ar-n">${i + 1}</span><span><b>${esc(r[1])}</b> ${connected(r[0]) ? '<span class="badge b-mint">✓ connected</span>' : ''}${r[9] === 'site' ? '<span class="badge b-lav">on their site</span>' : ''}<span class="small muted">${esc(r[3])}</span></span>
      <span class="small">${esc(r[4])}</span><span class="small">${esc(r[5])}</span><span>${scoreBadge(r[6])}</span><span>${scoreBadge(r[7])}</span><span>${scoreBadge(r[8])}</span><span>${tenStarsHTML(rankValue(r))}</span></div>`).join('')}</div>
    <p class="small muted" style="margin:8px 0 0">Free allowances and prices as of November 2026; they change often, so check each service's price page (linked from Connect an API). Quality uses independent test scores where they exist. "On their site" services can't be connected yet; Quicksilver writes the prompts for them.</p></section>`;
}
function bindApiRank() {
  const box = $('#api-rank');
  if (!box) return;
  const redraw = () => { box.outerHTML = apiRankHTML(); bindApiRank(); };
  $$('[data-rank-sort]').forEach((b) => b.addEventListener('click', () => { rankState.sort = b.dataset.rankSort; redraw(); }));
  $$('[data-rank-use]').forEach((b) => b.addEventListener('click', () => { rankState.use = b.dataset.rankUse; redraw(); }));
}

// ---------- pick the best connected cloud AI for a question ----------
// All connected APIs look equally strong to the speed table (a flat score), so Automatic can't tell
// them apart. Here we score each one for the kind of question using the rankings above, so when
// several cloud AIs are connected Quicksilver uses the one that's actually best for the task.
const JOB_TO_RANK = { coding: 'coding', reasoning: 'reasoning', writing: 'writing', research: 'research', office: 'chat', general: 'chat' };
// Which measured test (from the catalog's refreshed cloud scores) genuinely reflects a kind of
// question, best first — the first one a model actually has is used. Research has no clean public
// benchmark, so it keeps the curated table rather than being skewed by an unrelated score.
const JOB_METRICS = {
  coding: ['codeAgent', 'coding'],
  reasoning: ['science', 'math'],
  writing: ['writing', 'elo'],
  office: ['ifeval', 'elo'],
  general: ['elo', 'ifeval'],
};
const freshMetric = (sc, job) => { for (const k of (JOB_METRICS[job] || [])) if (sc && sc[k] != null) return sc[k]; return null; };
const apiPreset = (target) => (S.providers || []).find((p) => p.id === String(target).split(':')[1])?.preset || '';
function apiScore(target, job) {
  const preset = apiPreset(target);
  const row = API_RANK.find((r) => r[0] && r[0] === preset);
  const want = JOB_TO_RANK[job] || 'chat';
  let q = 8; // a custom or unlisted service: treat as solidly capable
  if (row) {
    const fits = row[2].includes(want) || (want === 'chat' && (row[2].includes('reasoning') || row[2].includes('coding')));
    q = row[6] - (fits ? 0 : 1.2); // its quality, nudged down a little when this isn't a listed strength
  }
  // Blend in the catalog's freshly-measured test scores when we have them, so the pick tracks how the
  // service performs now rather than only the built-in table (which can go stale between releases).
  const sc = (JOB_METRICS[job] && typeof cloudScoresFor === 'function') ? cloudScoresFor(preset) : null;
  const metric = freshMetric(sc, job);
  if (metric != null) q = (q + metric / 10) / 2;
  return q;
}
const apiValue = (target) => { const row = API_RANK.find((r) => r[0] && r[0] === apiPreset(target)); return row ? rankValue(row) : 0; };
const apiServiceName = (target) => { const row = API_RANK.find((r) => r[0] && r[0] === apiPreset(target)); return row ? row[1] : (targetLabel(target) || 'your cloud AI'); };
// How good a connected API is for this job, as Automatic sees it: its quality for the task plus what
// your 👍/👎 have taught about it, so the pick adapts to you and isn't just the static rankings.
const apiPick = (t, job) => apiScore(t, job) + (typeof learnBonus === 'function' ? learnBonus(job, t) : 0);
// The connected API that is best for this job: that combined score, then best value to break ties.
function bestApiTarget(job, filter) {
  const cands = (S.targets || []).map((t) => t.target).filter((t) => t.startsWith('api:') && targetValid(t) && (!filter || filter(t)));
  return cands.sort((a, b) => apiPick(b, job) - apiPick(a, job) || apiValue(b) - apiValue(a))[0] || null;
}
