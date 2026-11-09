// How the web and a connected cloud AI improve a model, stack or custom AI: shown when you pick one,
// on stack cards, in a model's details and while you build a fusion. Numbers are independent test
// results (science is GPQA Diamond, graduate-level questions; facts are short factual questions).
'use strict';

const connectedClouds = () => (S.providers || []).filter((p) => p.hasKey || p.noKey);
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
  return `<div class="bz"><div class="bz-title">⚡ How the web and a cloud AI improve ${fusion ? 'this custom AI' : 'it'}</div>${rows.join('')}</div>`;
}
// The full explanation for a model or stack you picked.
function boostModal(target) {
  const s = target.startsWith('stack:') && S.stacks.find((x) => `stack:${x.id}` === target);
  const targets = s ? [...(s.members.drafters || []), s.members.judge, s.members.vision].filter(Boolean) : [target];
  openModal(`<h2>⚡ ${esc(s ? s.name : targetLabel(target))}: what the web and a cloud AI add</h2>${boostsHTML(targets, { liquid: s?.builtFor === 'quicksilver' })}<div class="modal-actions"><button class="btn" data-close>Close</button></div>`, { wide: true });
}
// A short version for a toast when you pick a model or stack in a chat.
function boostToastText(target) {
  if (!target || target.startsWith('api:')) return '';
  let targets = [target];
  let liquid = false;
  if (target.startsWith('stack:')) {
    const s = S.stacks.find((x) => `stack:${x.id}` === target);
    if (!s) return '';
    liquid = s.builtFor === 'quicksilver';
    targets = [...(s.members.drafters || []), s.members.judge, s.members.vision].filter(Boolean);
    if (targets.some((t) => t.startsWith('api:'))) return '';
  }
  const base = boostBase(targets);
  const cloud = boostCloud({ uncensoredOnly: liquid });
  const lift = base != null && cloud.science != null && cloud.science > base ? `${base}% → ${cloud.science}% on hard science questions with ${cloud.name.split(' (')[0]}` : '';
  return `Tip: web search makes facts and recent events about 9 in 10 right (vs about 4 in 10 alone)${lift ? `; a cloud AI for hard questions: ${lift}` : ''}.`;
}
