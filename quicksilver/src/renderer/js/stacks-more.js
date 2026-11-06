// Stacks page, part two: three ways to run the chosen stack on this PC (quickest, balanced, most
// accurate) with an accuracy level for each, how the stack works step by step, and the cloud AI
// that would improve it, with an honest estimate of how much paid AI the private stack saves.
'use strict';

let presetsCache = null;
const loadPresets = async () => { presetsCache ||= await qs.call('providers:presets'); return presetsCache; };

const accDots = (a) => (a ? `<span class="acc" title="Accuracy level: ${esc(a.label)} (${a.score}/10)"><span class="acc-dots">${'●'.repeat(a.dots)}<i>${'●'.repeat(5 - a.dots)}</i></span> ${esc(a.label)} <span class="small muted">${a.score.toFixed(1)}/10</span></span>` : '');
const TIER_INFO = {
  quick: { icon: '⚡', name: 'Quickest', note: 'One fast model. Best for quick questions and drafts.' },
  balanced: { icon: '⚖️', name: 'Balanced', note: 'The recommended setup: strong answers in a reasonable time.' },
  accurate: { icon: '🎯', name: 'Most accurate', note: 'The strongest team this PC can run. Slower, but catches more mistakes.' },
};

function tierRows(s) {
  const roles = (id) => [s.members.vision === id && 'vision', s.members.drafters.includes(id) && 'draft', s.members.judge === id && 'lead'].filter(Boolean).map((k) => ROLE[k]).join('');
  return s.ids.map((id) => `<div class="best-row"><b class="grow">${esc(modelName(id))}</b>${s.have[id] ? '<span class="have">✓ you have it</span>' : ''}<span class="row" style="gap:4px">${roles(id)}</span></div>`).join('');
}

function tiersHTML(r) {
  if (r.kind !== 'text' || !r.tiers) return '';
  const cards = ['quick', 'balanced', 'accurate'].map((k) => {
    const s = r.tiers[k];
    const t = TIER_INFO[k];
    if (!s) return `<div class="card tier-card muted-card"><h3>${t.icon} ${t.name}</h3><p class="small muted" style="font-weight:600">${k === 'accurate' ? 'The balanced setup is already the most accurate this PC can run well.' : 'Same as the balanced setup on this PC.'}</p></div>`;
    return `<div class="card tier-card ${k === 'balanced' ? 'hl' : ''}">
      <div class="row"><h3 class="grow">${t.icon} ${t.name}</h3>${k === 'balanced' ? '<span class="badge b-mint">Recommended</span>' : ''}</div>
      <p class="small muted" style="font-weight:600;margin:4px 0 10px">${t.note}</p>
      <div class="tier-stats"><div><span class="label">Accuracy</span>${accDots(s.accuracy)}</div><div><span class="label">Per answer</span><b>⏱ ${fmtSec(s.secondsPerAnswer)}</b></div><div><span class="label">Download</span><b>${s.missingGB ? `${s.missingGB.toFixed(1)} GB` : 'Nothing'}</b></div></div>
      <div class="best-rows">${tierRows(s)}</div>
      <button class="btn ${k === 'balanced' ? 'primary' : ''}" data-tier="${k}" style="margin-top:10px">${s.missingGB ? 'Download & set up' : 'Set up'}</button>
    </div>`;
  }).join('');
  return `<div class="section"><h2>3. How strong? Three ways to run it on this PC</h2></div>
    <div class="tier-grid">${cards}</div>
    <p class="small muted" style="margin-top:8px">Accuracy levels compare the models' benchmark strength for ${esc(r.label.toLowerCase())}; a stack scores higher than its best model alone because the lead compares answers and fixes mistakes. Times are for a typical answer on this PC and become exact once Quicksilver has timed a few answers.</p>`;
}

function howItWorksHTML(r) {
  if (r.kind !== 'text') return '';
  const s = r.tiers?.balanced || r.best;
  if (!s) return '';
  const mode = INFUSE_MODES[r.mode] || INFUSE_MODES.blend;
  const steps = [];
  if (s.members.vision) steps.push(`👁 <b>${esc(modelName(s.members.vision))}</b> reads any photos, screenshots or video frames you attach and describes them for the others.`);
  steps.push(`✏️ ${s.members.drafters.map((d) => `<b>${esc(modelName(d))}</b>`).join(' and ')} ${s.members.drafters.length > 1 ? 'each write an answer, independently' : 'writes the answer'}.`);
  if (s.members.judge) steps.push(`★ <b>${esc(modelName(s.members.judge))}</b> leads the team. ${mode.icon} <b>${esc(mode.name)}</b>: ${esc(mode.blurb)}`);
  if (r.cloud?.mode === 'check') steps.push('✅ Optional: a cloud AI double-checks the final answer (see below).');
  if (r.cloud?.mode === 'hard') steps.push('☁ Optional: hard questions can go to a cloud lead (see below); the rest never leave this PC.');
  const set = r.settings || {};
  return `<div class="card how-card"><h3>🔍 How the ${esc(r.label)} stack works</h3>
    <ol class="how-steps">${steps.map((x) => `<li>${x}</li>`).join('')}</ol>
    <div class="row small" style="flex-wrap:wrap;gap:6px">${set.web ? '<span class="badge b-mint">🌐 searches the web when useful</span>' : ''}${set.library ? '<span class="badge b-sky">📚 uses your knowledge bases</span>' : ''}<span class="badge b-lav">🎚️ creativity ${set.temperature ?? 0.5}</span><span class="badge b-lav">🧠 memory ${Math.round((set.contextSize || 8192) / 1024)}K tokens</span><span class="badge b-lav">🔒 private: runs on this PC</span></div>
  </div>`;
}

function cloudTarget(providerId) {
  const p = S.providers.find((x) => x.preset === providerId && (x.hasKey || x.noKey));
  if (!p) return null;
  const list = S.targets.filter((t) => t.target.startsWith(`api:${p.id}:`));
  // A strong but sensibly priced model by default (Sonnet over Opus, Flash/Pro over Ultra…).
  return (list.find((t) => /sonnet|gemini-[\d.]+-(pro|flash)|gpt-[\d.]+(?!-mini)|grok-[\d]+|mistral-(large|medium)|llama-3\.3-70b|qwen3/i.test(t.target)) || list[0])?.target || null;
}

function cloudHTML(r) {
  const c = r.cloud;
  if (!c) return '';
  if (!presetsCache) { loadPresets().then(() => S.route.view === 'stacks' && render()); return ''; }
  const p = presetsCache[c.provider];
  const alt = presetsCache[c.alt];
  const free = (x) => (x?.free === 'free' ? ' (free plan)' : x?.free === 'some' ? ' (free models)' : '');
  const connected = cloudTarget(c.provider) || (alt && cloudTarget(c.alt));
  const how = {
    hard: `Your private stack answers everything; only hard questions (about ${Math.round(c.share * 100)}% for ${esc(r.label.toLowerCase())}) go to ${esc(p.name)} as the lead, together with your models' drafts.`,
    check: `Your private stack writes every answer; ${esc(p.name)} only reads it and replies with a short verdict, flagging mistakes for you in the fact-check panel.`,
    lead: `Your private models write the drafts; ${esc(p.name)} reads them and writes the final answer.`,
    image: `Pictures this PC can make stay here; for the ones it can't (bigger sizes, text in images, top quality), use ${esc(p.name)}.`,
  }[c.mode];
  const usage = c.mode === 'lead'
    ? `<b>Paid use:</b> about the same as using ${esc(p.name)} on its own (a little more, as it also reads the drafts). Choose it for the best ${esc(r.label.toLowerCase())}, not to save money.`
    : `<b>Paid use:</b> about <b>${c.saved}% less</b> than asking ${esc(p.name)} directly for every answer (≈${c.paidShare}% of the paid tokens)${c.mode === 'check' ? ', since a verdict is much shorter than a full answer' : c.mode === 'hard' ? ', since most questions never leave this PC' : ''}.`;
  return `<div class="section"><h2>${r.kind === 'text' ? '4' : '3'}. Make it even better with a cloud AI <span class="small muted" style="font-weight:600">· optional</span></h2></div>
    <div class="card cloud-card">
      <div class="row"><span class="emoji-badge">☁</span><div class="grow"><h3 style="margin:0">${esc(p.name)}${esc(free(p))}</h3><div class="small muted" style="font-weight:600">${alt ? `Or ${esc(alt.name)}${esc(free(alt))}` : ''}</div></div>${connected ? '<span class="badge b-mint">✓ connected</span>' : ''}</div>
      <p style="margin:10px 0 6px">${esc(c.why)}</p>
      <p class="small" style="margin:0 0 6px">${how}</p>
      ${c.mode !== 'image' ? `<div class="tier-stats" style="margin:10px 0"><div><span class="label">Accuracy now</span>${accDots(c.before)}</div><div><span class="label">With ${esc(p.name.split(' ')[0])}</span>${accDots(c.after)}</div><div><span class="label">Paid AI used</span><b>${c.mode === 'lead' ? '≈ same' : `−${c.saved}%`}</b></div></div>` : ''}
      <p class="small" style="margin:0 0 6px">${usage}</p>
      <p class="small muted" style="margin:0 0 10px">🔒 ${c.mode === 'hard' ? 'Only the hard questions and your models\' drafts are sent' : c.mode === 'check' ? 'Only the question and the finished answer are sent' : c.mode === 'lead' ? 'The question and drafts are sent' : 'Only the picture description is sent'} to ${esc(p.name)}; everything else stays on this PC. Offline mode turns it off.</p>
      <div class="row">${connected && c.mode !== 'image' ? `<button class="btn primary" data-cloud-add="${esc(connected)}">Add to my ${esc(r.label)} stack</button>` : ''}${connected ? '' : `<button class="btn primary" data-cloud-connect="${esc(c.provider)}">Connect ${esc(p.name)}</button>${alt ? `<button class="btn" data-cloud-connect="${esc(c.alt)}">Connect ${esc(alt.name)}</button>` : ''}`}</div>
    </div>`;
}

function bindStacksMore(r) {
  $$('[data-tier]').forEach((b) => b.addEventListener('click', () => createTier(r, b.dataset.tier)));
  $$('[data-cloud-connect]').forEach((b) => b.addEventListener('click', async () => {
    const presets = await loadPresets();
    modelsTab = 'api'; go({ view: 'models' });
    setTimeout(() => editProvider({ preset: b.dataset.cloudConnect }, presets), 60);
  }));
  $$('[data-cloud-add]').forEach((b) => b.addEventListener('click', () => addCloud(r, b.dataset.cloudAdd)));
}

async function createTier(r, tier) {
  const s = r.tiers[tier];
  if (!s) return;
  const job = S.catalog.jobs[r.job];
  const target = (id) => `local:${s.have[id] || id}`;
  const missing = s.ids.filter((id) => !s.have[id]);
  for (const id of missing) if (!S.downloads[id]) await download({ catalogId: id }, modelName(id));
  await saveTextStack(r, {
    id: `${r.job}-${tier === 'balanced' ? 'best' : tier}`, name: `${job.label} · ${TIER_INFO[tier].name}`, emoji: job.icon, builtFor: r.job,
    members: { drafters: s.members.drafters.map(target), judge: s.members.judge ? target(s.members.judge) : undefined, vision: s.members.vision ? target(s.members.vision) : undefined, mode: s.members.drafters.length > 1 ? r.mode : 'auto' },
  }, missing.length);
}

// Adds the cloud AI to the stack for this kind of work (creating the balanced one if needed).
async function addCloud(r, cloud) {
  let st = S.stacks.find((x) => x.builtFor === r.job) || S.stacks.find((x) => x.id === `${r.job}-best`);
  if (!st) { await createTier(r, 'balanced'); await refreshModels(); st = S.stacks.find((x) => x.id === `${r.job}-best`); }
  if (!st) return;
  const members = { ...st.members };
  if (r.cloud.mode === 'hard') { members.cloudHard = cloud; members.mode = 'auto'; }
  if (r.cloud.mode === 'check') members.cloudCheck = cloud;
  if (r.cloud.mode === 'lead') members.judge = cloud;
  await call('stacks:save', { ...st, members });
  await refreshModels();
  toast(`${targetLabel(cloud)} is now part of "${st.name}". ${r.cloud.mode === 'hard' ? 'Hard questions will use it.' : r.cloud.mode === 'check' ? 'It will check every answer.' : 'It writes the final answers.'}`, 6000);
  render();
}
