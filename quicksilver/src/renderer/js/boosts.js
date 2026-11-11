// How the web and a connected cloud AI improve a model, stack or custom AI: shown when you pick one,
// on stack cards, in a model's details and while you build a fusion. Numbers are independent test
// results (science is GPQA Diamond, graduate-level questions; facts are short factual questions).
'use strict';

// ---------- response time three ways ----------
// On this PC alone (private), with web search (search + reading the pages adds a few seconds and more
// for the model to read), and with a connected cloud AI answering (most write 60–100+ words a second).
const CLOUD_WPS = 80;
function threeTimes(sec, words = WORDS.chat) {
  if (sec == null || !isFinite(sec)) return null;
  return { priv: sec, web: sec * 1.35 + 5, cloud: 1.5 + words / CLOUD_WPS };
}
function timesHTML(sec, { words = WORDS.chat, label = true } = {}) {
  const t = threeTimes(sec, words);
  if (!t) return '';
  return `<span class="rt3" title="Estimated time for a typical answer: on this PC alone (private, nothing leaves it), with web search, and with a connected cloud AI answering. Exact once Quicksilver has timed a few answers.">${label ? '<span class="rt3-l">Response time</span>' : ''}<span>🔒 Private <b>${etaLabel(t.priv)}</b></span><span>🌐 With web <b>${etaLabel(t.web)}</b></span><span>☁️ With API <b>${etaLabel(t.cloud)}</b></span></span>`;
}
const timesText = (sec, words = WORDS.chat) => { const t = threeTimes(sec, words); return t ? `🔒 ${etaLabel(t.priv)} private · 🌐 ${etaLabel(t.web)} with web · ☁️ ${etaLabel(t.cloud)} with an API` : ''; };

// Cloud AIs that answer questions (fal.ai is for photos, video and music only).
const MEDIA_PRESETS = ['fal', 'replicate', 'stability'];
const connectedClouds = () => (S.providers || []).filter((p) => (p.hasKey || p.noKey) && !MEDIA_PRESETS.includes(p.preset));
// The best tested science score among the given targets (local ones by their catalogue id).
function boostBase(targets) {
  let best = null;
  for (const t of targets || []) {
    let sc = null;
    if (String(t).startsWith('local:')) sc = scoresFor(S.installed.find((m) => `local:${m.id}` === t)?.catalogId);
    else if (String(t).startsWith('api:')) sc = cloudScoresFor(S.providers.find((p) => p.id === String(t).split(':')[1])?.preset);
    else sc = scoresFor(t); // a catalogue id
    if (sc?.science != null && !(best >= sc.science)) best = sc.science;
  }
  return best;
}
// The strongest cloud AI you could add: a connected one, or else a free one worth connecting.
function boostCloud({ uncensoredOnly = false } = {}) {
  const pool = connectedClouds().filter((p) => !uncensoredOnly || p.preset === 'venice');
  const scored = pool.map((p) => ({ p, sc: cloudScoresFor(p.preset) })).filter((x) => x.sc?.science != null).sort((a, b) => b.sc.science - a.sc.science)[0];
  if (scored) return { connected: true, name: scored.p.name, science: scored.sc.science };
  if (pool.length) return { connected: true, name: pool[0].name, science: null };
  if (uncensoredOnly) return { connected: false, name: 'Venice (uncensored)', science: null };
  const free = cloudScoresFor('google');
  return { connected: false, name: 'Google Gemini (free tier)', science: free?.science ?? null };
}
const boostBar = (from, to) => `<span class="bz-bar"><i class="bz-from" style="width:${from}%"></i><i class="bz-to" style="left:${from}%;width:${Math.max(0, to - from)}%"></i></span>`;

// ---------- every major job, rated out of 10: on its own, with the web, with a cloud AI ----------
// Text jobs use each model's job ratings and independent test scores; pictures, editing and video
// use Quicksilver's quality ratings for the models on this PC and for the best cloud services.
function jobOf(targets, key) {
  let best = null;
  for (const t of targets || []) {
    const v = String(t).startsWith('api:') ? 9 : targetModel(t)?.jobs?.[key];
    if (v != null && !(best >= v)) best = v;
  }
  return best;
}
const r10 = (v) => (v == null ? null : Math.max(0, Math.min(10, Math.round(v * 2) / 2)));
function boostJobs(targets, { liquid = false } = {}) {
  const sci = boostBase(targets);
  const cloud = boostCloud({ uncensoredOnly: liquid });
  const ccode = connectedClouds().map((p) => cloudScoresFor(p.preset)?.coding).filter((x) => x != null).sort((a, b) => b - a)[0];
  const cloudText = cloud.science != null ? cloud.science / 10 : liquid ? 7 : 9;
  const sees = (targets || []).some((t) => String(t).startsWith('api:') || targetModel(t)?.vision);
  // Pictures, editing, video and music: this team's own models, or the best installed on this PC (Create).
  const own = stackRatings(targets || []);
  const pc = createRatings(S.installed.filter((m) => m.kind && m.kind !== 'text').map((m) => ({ model: catModel(m.catalogId) })).filter((x) => x.model));
  const media = (k) => { const v = Math.max(own[k]?.v ?? -1, pc[k]?.v ?? -1); return v < 0 ? null : v * 2; };
  const maxOf = (table, i) => Math.max(...Object.entries(table).filter(([k]) => k !== 'other').map(([, v]) => v[i]));
  const research = jobOf(targets, 'research') ?? jobOf(targets, 'general');
  const plus = (v, d) => (v == null ? null : Math.min(10, v + d));
  const a0 = sci != null ? sci / 10 : jobOf(targets, 'general');
  const a1 = jobOf(targets, 'office');
  const a2 = research != null ? research * 0.4 : null;
  const a3 = jobOf(targets, 'general');
  const a4 = jobOf(targets, 'coding');
  const a5 = sees ? jobOf(targets, 'vision') : 0;
  const a6 = media('photo');
  const a7 = media('editing');
  const a8 = media('video');
  const a9 = media('music') ?? SYNTH_MUSIC * 2;
  // [icon, job, on its own, with the web, with a cloud AI or service, how it improves, what the web adds, web makes no difference]
  return [
    ['🧠', 'Reasoning & maths', a0, plus(a0, 0.5), cloudText, 'Multi-step logic, maths and "why" questions: a big cloud model gets far more of the hardest ones right.', 'With web: looks up the formulas, figures and facts a question depends on, so fewer wrong starting points.', false],
    ['🧩', 'Complex tasks', a1, plus(a1, 1), Math.max(cloudText, 8.5), 'Plans, reports and analysis with many steps: a cloud AI keeps track of more at once and misses fewer steps.', 'With web: gathers current facts, prices and sources for plans and reports instead of guessing them.', false],
    ['🔎', 'Research & current facts', a2, 9, 9.5, 'On its own a model only knows facts from before its training; with the web it reads today\'s pages and cites them.', 'With web: reads today\'s pages and cites them, so recent facts are right far more often.', false],
    ['✍️', 'Writing', a3, plus(a3, 0.5), Math.max(cloudText, 8.5), 'Emails, stories and essays: a cloud AI writes with more polish and range; the web adds facts to cite.', 'With web: accurate facts, names and dates to cite, so articles and emails need fewer corrections.', false],
    ['💻', 'Coding', a4, plus(a4, 1), ccode != null ? ccode / 10 : liquid ? 7 : 9, 'Bigger programs and harder bugs: a cloud AI writes working code first time more often; the web finds current docs.', 'With web: reads current library docs and looks up error messages, so code works with today\'s versions.', false],
    ['👁️', 'Reading photos & screenshots', a5, sees ? plus(a5, 0.5) : null, liquid ? 7 : 9, sees ? 'Reads charts, receipts and handwriting more accurately with a cloud AI.' : 'This one can\'t see photos on its own; a cloud AI (or a model that sees) can.', 'With web: looks up what it recognises (a product, a plant, a landmark) for more detail.', false],
    ['🖼️', 'Photo creation', a6, a6, maxOf(IMAGE_SERVICES, 2), 'A connected picture service (GPT Image, Nano Banana, FLUX) makes sharper, more detailed pictures with readable text; Quicksilver writes the prompt.', 'Web search doesn\'t change how pictures look; the cloud service does.', true],
    ['🪄', 'Photo editing', a7, a7, IMAGE_SERVICES.nano[2], 'Edits from a description ("remove the person", "make it sunset") keep faces and details better with Nano Banana or GPT Image.', 'Web search doesn\'t change edits; the cloud service does.', true],
    ['🎬', 'Video creation', a8, a8, maxOf(VIDEO_SERVICES, 2), 'Cloud video (Veo, Kling) is sharper, longer and has sound; it\'s used on the service\'s site and Quicksilver writes the shot list and prompts.', 'Web search doesn\'t change video quality; the cloud service does.', true],
    ['🎵', 'Music (full songs)', a9, a9, 9, 'The built-in synth makes instrumentals; through fal.ai (Create → Cloud), ElevenLabs, MiniMax and Mureka compose whole songs with vocals, and Quicksilver writes the lyrics.', 'Web search doesn\'t change how songs sound; the cloud service does.', true],
  ].map(([ic, job, a, w, c, how, webHow, same]) => [ic, job, r10(a), r10(w), r10(c), how, webHow, same]);
}
// The cloud service to add for each job, chosen for this PC (graphics card or not), how good the
// answer already is here, and the output wanted: a free pick and a best-quality pick.
const hasConn = (preset) => (S.providers || []).some((p) => p.preset === preset && (p.hasKey || p.noKey));
function recommendFor(job, own, { liquid = false } = {}) {
  const vram = S.est?.hardware?.vramGB || 0;
  const gpu = vram >= 8;
  const fal = hasConn('fal') ? '✓ connected' : 'connect in Models → Connect an API';
  const text = (free, best, why) => (liquid
    ? { pick: 'Venice AI (uncensored)', note: 'the Liquid Edition only uses uncensored cloud AIs', preset: 'venice' }
    : { pick: free, best, note: why });
  const pcNote = gpu ? `your ${vram} GB graphics card handles everyday work; the cloud is for the hardest` : 'without a graphics card this PC is slow on long, hard answers, so a fast cloud AI helps most';
  switch (job) {
    case 'Reasoning & maths': return text('Google Gemini (free plan)', 'OpenAI GPT-6 Astra (paid, top score)', pcNote);
    case 'Complex tasks': return text('Google Gemini (free plan)', 'Anthropic Claude (paid)', pcNote);
    case 'Research & current facts': return { pick: 'Built-in web search (free, already here)', best: 'Perplexity Sonar Pro (paid, answers with sources)', note: 'web search matters more than the model for current facts' };
    case 'Writing': return text('Google Gemini (free plan)', 'Anthropic Claude (paid, most natural writing)', own >= 8 ? 'this already writes well; a cloud AI adds polish' : pcNote);
    case 'Coding': return text('Groq gpt-oss-120b (free plan, 88% coding test)', 'Anthropic Claude (paid)', pcNote);
    case 'Reading photos & screenshots': return text('Google Gemini (free plan)', 'OpenAI GPT-6 (paid)', own ? 'this already sees photos; the cloud reads small print better' : 'adds the ability to see photos');
    case 'Photo creation': return { pick: liquid ? 'Venice AI pictures (uncensored, small free allowance)' : 'Pollinations (free, no key, 6/10) in Create → Cloud', best: liquid ? 'Venice AI pictures with safe mode off' : `fal.ai Nano Banana 2.1 (about $0.04 a picture, 9/10) or OpenAI GPT Image (10/10) · ${fal}`, note: own ? (gpu ? 'draft free on your graphics card, finish the keepers in the cloud' : 'this PC makes pictures slowly, so the cloud is much quicker') : 'this can\'t make pictures itself: an API (or a picture model on this PC) is needed' };
    case 'Photo editing': return { pick: own ? 'Your PC (free, private)' : 'Replicate ($5 free credits; type black-forest-labs/flux-kontext-pro in Create → Cloud)', best: `fal.ai Nano Banana 2.1 Edit (about $0.04 an edit, 9/10) · ${fal}`, note: own ? 'keeps faces and details when you change a photo by description' : 'this can\'t edit photos itself: an API is needed (or a graphics card for FLUX Kontext here)' };
    case 'Video creation': return { pick: 'Kling AI free daily credits (on Kling\'s site) or Replicate $5 credits', best: `fal.ai Veo 3.1 (10/10, with sound, about $0.40 a second) · ${fal}`, note: vram >= 12 ? 'preview free on your graphics card, make the final clip in the cloud' : 'this can\'t make good video itself: an API is needed, and Quicksilver writes the shot list' };
    case 'Music (full songs)': return { pick: `Free: Suno, about 5 songs a day (on Suno's site) · in Quicksilver: fal.ai MiniMax Music 2.6 (about $0.15 a song) · ${fal}`, best: 'fal.ai ElevenLabs Music (9/10, full songs of any length, about $0.80 a minute)', note: 'full compositions with verses, chorus and vocals; the built-in synth only makes instrumentals' };
    default: return null;
  }
}
function boostJobsHTML(targets, opts = {}) {
  const rows = boostJobs(targets, opts);
  const cell = (v, base) => (v == null ? '<span class="muted">–</span>' : `<b class="${v > (base ?? 0) ? 'bz-up' : ''}">${v}/10</b>`);
  const webCell = (v, base, same, why) => (same ? `<span class="muted" title="${esc(why)}">Same${v ? ` (${v}/10)` : ''}</span>` : v == null ? `<span class="muted" title="${esc(why)}">–</span>` : `<b class="${v > (base ?? 0) ? 'bz-up' : ''}" title="${esc(why)}">${v}/10</b>`);
  return `<div class="bz-jobs"><div class="bz-jh"><span>What it does</span><span>On its own</span><span>+ Web</span><span>+ Cloud AI</span></div>
    ${rows.map(([ic, job, a, w, c, how, webHow, same]) => {
      const best = Math.max(a ?? 0, w ?? 0, c ?? 0);
      const rec = recommendFor(job, a, opts);
      return `<div class="bz-jr"><span><b>${ic} ${esc(job)}</b>${boostBar((a ?? 0) * 10, best * 10)}<span class="small muted">${esc(how)}</span><span class="small bz-web">🌐 ${esc(webHow)}</span>${rec ? `<span class="small bz-rec">💡 <b>Recommended for this PC:</b> ${esc(rec.pick)}${rec.best ? ` · <b>best quality:</b> ${esc(rec.best)}` : ''} <span class="muted">(${esc(rec.note)})</span></span>` : ''}</span><span>${a ? `<b>${a}/10</b>` : '<span class="muted">Can’t</span>'}</span><span>${webCell(w, a, same, webHow)}</span><span>${cell(c, a)}</span></div>`;
    }).join('')}
    <p class="small muted" style="margin:4px 0 0">Quality of the output out of 10. Reasoning and coding come from independent tests; the rest are Quicksilver's ratings. "+ Cloud AI" is ${esc(boostCloud({ uncensoredOnly: opts.liquid }).name)}${opts.liquid ? ' (the Liquid Edition only uses uncensored cloud AIs)' : ''} for words, and the best cloud picture and video services for media.</p></div>`;
}

// targets: what answers (local:/api: targets or catalogue ids). opts.liquid: the Liquid Edition
// (uses only uncensored cloud AIs). opts.compact: one short line for cards.
function boostsHTML(targets, { liquid = false, compact = false, fusion = false } = {}) {
  const base = boostBase(targets);
  const hasCloudInside = (targets || []).some((t) => String(t).startsWith('api:'));
  const cloud = boostCloud({ uncensoredOnly: liquid });
  const webOn = S.data.prefs.autoWeb !== false && !S.config?.offline;
  const cloudOn = Boolean(S.data.prefs.cloudHard) && cloud.connected;
  const lift = base != null && cloud.science != null && cloud.science > base ? cloud.science : null;
  if (compact) {
    return `<div class="bz-compact small"><span title="Web search: reads current pages first, so facts and recent events come out right far more often">🌐 Web: facts ≈4 → 9 in 10 right${webOn ? ' · on' : ''}</span>${hasCloudInside ? '<span>☁️ A cloud AI is already in this team</span>' : lift ? `<span title="Graduate-level science questions (GPQA)">☁️ + ${esc(cloud.name.split(' (')[0])}: hard questions ${base}% → ${lift}%${cloudOn ? ' · on' : ''}</span>` : ''}</div>`;
  }
  const rows = [];
  rows.push(`<div class="bz-row"><span class="bz-ic">🌐</span><span class="grow"><b>Web search</b> <span class="badge ${webOn ? 'b-mint' : ''}">${S.config?.offline ? 'Off (offline)' : webOn ? 'On automatically' : 'Off (turn on per chat)'}</span>
      <span class="small">A model on its own only knows what it learned before its training ended, and small models often guess names, prices and dates. With web search it reads current pages first and answers with sources.</span>
      <span class="small bz-num">Short factual questions: about <b>4 in 10</b> right without search → about <b>9 in 10</b> with it (published tests on big models; small models gain even more). News, prices, sports, opening hours and anything recent go from out of date to current.</span>
      <span class="small muted">Cost: a few seconds per searched question; only the search words go online.</span></span></div>`);
  if (hasCloudInside) {
    rows.push(`<div class="bz-row"><span class="bz-ic">☁️</span><span class="grow"><b>Cloud AI</b> <span class="badge b-mint">In this team</span><span class="small">A cloud AI is already part of this ${fusion ? 'custom AI' : 'team'}: it brings a much bigger model's knowledge and reasoning, while your PC's models add drafts and checks.</span></span></div>`);
  } else {
    rows.push(`<div class="bz-row"><span class="bz-ic">☁️</span><span class="grow"><b>A connected cloud AI</b> <span class="badge ${cloudOn ? 'b-mint' : ''}">${cloud.connected ? (cloudOn ? 'On for hard questions' : 'Connected, not used for hard questions') : 'Not connected'}</span>
      <span class="small">${fusion ? `Add ${esc(cloud.name)} as the lead: your PC's models draft, the cloud AI writes the final answer.` : `Hard questions go to ${esc(cloud.name)}; everyday messages stay on your PC.`}${liquid ? ' The Liquid Edition only uses uncensored cloud AIs, so it stays uncensored.' : ''}</span>
      ${lift ? `<span class="small bz-num">Graduate-level science: <b>${base}%</b> → <b>${lift}%</b> ${boostBar(base, lift)}</span>` : base != null && cloud.science != null ? `<span class="small bz-num">This already scores ${base}% on graduate-level science, as high as ${esc(cloud.name)} (${cloud.science}%): a cloud AI mainly adds speed on a slower PC.</span>` : '<span class="small bz-num">Usually a big step up on hard reasoning, maths and long writing.</span>'}
      <span class="small muted">Cost: needs internet; hard questions leave your PC; free plans have daily limits. ${cloud.connected ? (cloudOn || fusion ? '' : 'Turn it on in Settings → Features → Cloud AI for hard questions.') : 'Connect one in Models → Connect an API (free plans available).'}</span></span></div>`);
  }
  rows.push(`<div class="bz-row"><span class="bz-ic">🔌</span><span class="grow"><b>Connected apps</b><span class="small">With Gmail, Calendar, Drive, Spotify and others connected, answers come from your real data instead of general advice ("what's on my calendar Friday?"). It asks before sending or changing anything.</span></span></div>`);
  return `<div class="bz"><div class="bz-title">⚡ How the web and a cloud AI improve ${fusion ? 'this custom AI' : 'it'} <button class="btn small ghost" data-free-paid>💸 Free vs paid</button></div>${boostJobsHTML(targets, { liquid })}${rows.join('')}</div>`;
}
// The full explanation for a model or stack you picked.
// target: a stack ("stack:…"), a model on this PC ("local:…"), a catalogue model id, or a list of
// catalogue ids (a ready-made stack recipe) with its name.
function boostModal(target, { ids, name } = {}) {
  const s = String(target).startsWith('stack:') && S.stacks.find((x) => `stack:${x.id}` === target);
  const targets = ids || (s ? [...(s.members.drafters || []), s.members.judge, s.members.vision].filter(Boolean) : [target]);
  const title = name || (s ? s.name : String(target).startsWith('local:') || String(target).startsWith('api:') ? targetLabel(target) : catModel(target)?.name || target);
  const kind = s ? (isFusion(s) ? 'custom AI (fusion)' : 'stack') : ids ? 'stack' : 'model';
  const liquid = isLiquidStack(s) || (!s && !ids && (catModel(String(target).replace(/^local:/, ''))?.category === 'open' || catModel(S.installed.find((m) => `local:${m.id}` === target)?.catalogId)?.category === 'open'));
  openModal(`<h2>⚡ ${esc(title)}: what the web and a cloud AI add</h2><p class="small muted" style="margin-top:-4px">For this ${kind}, on this PC: each job's quality out of 10 on its own, with web search, and with a cloud AI or service, plus the service to add for it.</p>${boostsHTML(targets, { liquid, fusion: Boolean(s && isFusion(s)) })}<div class="modal-actions"><button class="btn" data-close>Close</button></div>`, { wide: true });
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-free-paid]')) return;
  e.preventDefault();
  openModal(`${freePaidHTML()}<div class="modal-actions"><button class="btn" data-close>Close</button></div>`, { wide: true });
});
// A "⚡ Web & cloud" button on any stack, model or fusion card.
const boostBtn = (target, extra = '') => `<button class="btn small ghost" data-boost="${esc(target)}" ${extra} title="How web search and a cloud AI improve each job, rated out of 10, and which service to add">⚡ Web &amp; cloud</button>`;
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-boost]');
  if (!b) return;
  e.preventDefault();
  boostModal(b.dataset.boost, b.dataset.boostIds ? { ids: JSON.parse(b.dataset.boostIds), name: b.dataset.boostName } : {});
});
// A short version for a toast when you pick a model or stack in a chat.
function boostToastText(target) {
  if (!target || target.startsWith('api:')) return '';
  let targets = [target];
  let liquid = false;
  if (target.startsWith('stack:')) {
    const s = S.stacks.find((x) => `stack:${x.id}` === target);
    if (!s) return '';
    liquid = isLiquidStack(s);
    targets = [...(s.members.drafters || []), s.members.judge, s.members.vision].filter(Boolean);
    if (targets.some((t) => t.startsWith('api:'))) return '';
  }
  const base = boostBase(targets);
  const cloud = boostCloud({ uncensoredOnly: liquid });
  const lift = base != null && cloud.science != null && cloud.science > base ? `${base}% → ${cloud.science}% on hard science questions with ${cloud.name.split(' (')[0]}` : '';
  return `Tip: web search makes facts and recent events about 9 in 10 right (vs about 4 in 10 alone)${lift ? `; a cloud AI for hard questions: ${lift}` : ''}.`;
}
