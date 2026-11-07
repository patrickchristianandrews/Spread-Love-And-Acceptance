// Arena: a blind test. Two of your models or teams answer the same question as "A" and "B";
// you pick the better answer before seeing which is which. Your votes build a leaderboard of
// what actually works best for you.
'use strict';

const ARENA_K = 32;
let arenaRound = null; // { prompt, sides: [{ target, text, done, ms, error }], voted, requestIds }
const arenaData = () => (S.data.arena ||= { ratings: {}, games: [] });
const arenaTargets = () => S.targets.filter((t) => !t.target.startsWith('kb:'));

views.arena = {
  html() {
    const r = arenaRound;
    const pool = arenaTargets();
    return `<div class="page arena">
      <div class="page-head"><h1>Compare models</h1><span class="small muted">Blind test: which answer is better?</span></div>
      <p class="lede">Ask anything. Two of your models or teams answer without their names; you pick the better one, then see who wrote it. Over time this shows which model really suits <i>your</i> work.</p>
      ${pool.length < 2 ? '<div class="notice info">You need at least two models (or a model and a team) for a blind test. <button class="btn small primary" data-goto="models">Get models</button></div>' : `
      <div class="arena-ask"><textarea id="ar-q" rows="2" placeholder="e.g. Explain compound interest to a 12-year-old">${esc(r?.prompt || '')}</textarea>
        <div class="row"><label class="small muted" for="ar-pool">Contestants</label><select id="ar-pool"><option value="all">Any two, at random</option>${pool.map((t) => `<option value="${esc(t.target)}" ${S.data.prefs.arenaFixed === t.target ? 'selected' : ''}>${esc(t.label)} vs a random other</option>`).join('')}</select>
        <span class="grow"></span><button class="btn primary" id="ar-go" ${r && !r.sides.every((s) => s.done) ? 'disabled' : ''}>${icon('scale', 17)} ${r ? 'New round' : 'Start'}</button></div></div>`}
      ${r ? arenaRoundHTML(r) : ''}
      ${arenaBoardHTML()}
    </div>`;
  },
  bind() {
    $$('[data-goto]').forEach((b) => b.addEventListener('click', () => go({ view: b.dataset.goto })));
    $('#ar-go')?.addEventListener('click', startArena);
    $('#ar-q')?.addEventListener('keydown', (e) => { if (e.key === 'Enter' && !e.shiftKey) { e.preventDefault(); startArena(); } });
    $('#ar-pool')?.addEventListener('change', (e) => { S.data.prefs.arenaFixed = e.target.value === 'all' ? '' : e.target.value; save(); });
    $$('[data-vote]').forEach((b) => b.addEventListener('click', () => arenaVote(b.dataset.vote)));
    $('#ar-reset')?.addEventListener('click', async () => { if (await confirmBox('Clear all Compare models votes and ratings?', { yes: 'Clear' })) { S.data.arena = { ratings: {}, games: [] }; save(); render(); } });
  },
};

function arenaRoundHTML(r) {
  const both = r.sides.every((s) => s.done);
  return `<div class="arena-grid">${r.sides.map((s, i) => {
    const L = 'AB'[i];
    const won = r.voted && (r.voted === L ? 'won' : r.voted === 'tie' ? 'tie' : r.voted === 'bad' ? 'bad' : 'lost');
    return `<div class="card arena-side ${won || ''}" id="ar-side-${i}">
      <div class="row arena-h"><span class="arena-l">${L}</span>${r.voted ? `<b class="grow">${esc(targetLabel(s.target))}</b>${won === 'won' ? '<span class="badge b-mint">Your pick</span>' : ''}` : `<span class="grow muted small">${s.done ? (s.error ? 'Couldn\'t answer' : `Answered in ${fmtSec(s.ms / 1000)}`) : s.started ? 'Writing…' : 'Waiting its turn…'}</span>`}</div>
      <div class="md arena-a">${s.error ? `<span class="muted">${esc(s.error)}</span>` : s.text ? markdown(s.text.replace(/<think>[\s\S]*?(<\/think>|$)/g, '')) : '<span class="status-line">…</span>'}</div>
    </div>`;
  }).join('')}</div>
  ${both && !r.voted ? `<div class="arena-vote"><span class="small muted">Which answer is better?</span><button class="btn" data-vote="A">A is better</button><button class="btn" data-vote="tie">About the same</button><button class="btn" data-vote="B">B is better</button><button class="btn ghost" data-vote="bad">Both are poor</button></div>` : ''}
  ${!both ? '<p class="small muted" style="text-align:center">They answer one after the other, so each gets this PC\'s full power and the timing is fair.</p>' : ''}`;
}

function arenaBoardHTML() {
  const d = arenaData();
  const rows = Object.entries(d.ratings).filter(([t]) => targetValid(t) || d.ratings[t].games).sort((a, b) => b[1].elo - a[1].elo);
  if (!rows.length) return '<div class="section"><h2>Your leaderboard</h2></div><div class="empty small">Vote in a few rounds and your own ranking appears here.</div>';
  return `<div class="section"><h2>Your leaderboard</h2><span class="small muted">${d.games.length} vote${d.games.length === 1 ? '' : 's'}</span><button class="btn small ghost" id="ar-reset">Clear</button></div>
    <table class="list arena-board"><thead><tr><th>#</th><th>Model or team</th><th>Rating</th><th>Won</th><th>Lost</th><th>Tied</th></tr></thead><tbody>
    ${rows.map(([t, s], i) => `<tr><td>${i + 1}</td><td><b>${esc(targetLabel(t) === 'No model chosen' ? s.label || t : targetLabel(t))}</b></td><td><span class="elo">${Math.round(s.elo)}</span>${s.games < 5 ? ' <span class="small muted" title="Fewer than 5 votes: still settling">·</span>' : ''}</td><td>${s.w}</td><td>${s.l}</td><td>${s.t}</td></tr>`).join('')}
    </tbody></table><p class="small muted">Ratings start at 1000 and move with each vote (like chess ratings): beating a strong model counts for more.</p>`;
}

function startArena() {
  const q = $('#ar-q')?.value.trim();
  if (!q) { toast('Type a question first.'); return; }
  if (pending) { toast('Wait for the chat answer to finish first.'); return; }
  const pool = arenaTargets().map((t) => t.target);
  const fixed = S.data.prefs.arenaFixed && pool.includes(S.data.prefs.arenaFixed) ? S.data.prefs.arenaFixed : null;
  const shuffle = (arr) => arr.map((x) => [Math.random(), x]).sort((a, b) => a[0] - b[0]).map((x) => x[1]);
  // Prefer pairs that haven't met much, so the leaderboard fills in evenly.
  const games = arenaData().games;
  const met = (a, b) => games.filter((g) => (g.a === a && g.b === b) || (g.a === b && g.b === a)).length;
  let pair;
  if (fixed) pair = [fixed, shuffle(pool.filter((t) => t !== fixed)).sort((x, y) => met(fixed, x) - met(fixed, y))[0]];
  else {
    const all = [];
    for (let i = 0; i < pool.length; i++) for (let j = i + 1; j < pool.length; j++) all.push([pool[i], pool[j]]);
    pair = shuffle(all).sort((x, y) => met(...x) - met(...y))[0];
  }
  pair = shuffle(pair);
  arenaRound = { prompt: q, sides: pair.map((target) => ({ target, text: '', done: false })), voted: null };
  render();
  runArenaSide(arenaRound, 0);
}

function runArenaSide(r, i) {
  if (arenaRound !== r || i >= r.sides.length) return;
  const s = r.sides[i];
  s.started = Date.now();
  const requestId = uid();
  const p = S.data.prefs;
  const sys = `You are a helpful assistant. ${ANSWER_STYLE} (Background only: today's date is ${new Date().toLocaleDateString()}.)`;
  oneShots.set(requestId, {
    text: '',
    onText: (t) => { s.text = t; paintArenaSide(r, i); },
    resolve: (t) => { s.text = t || s.text; s.done = true; s.ms = Date.now() - s.started; arenaNext(r, i); },
    reject: (err) => { s.error = err.message === 'aborted' ? 'Stopped.' : err.message; s.done = true; s.ms = Date.now() - s.started; arenaNext(r, i); },
  });
  qs.sendChat({ requestId, target: s.target, messages: [{ role: 'system', content: sys }, { role: 'user', content: r.prompt }], temperature: 0.6, maxTokens: Number(p.maxTokens) || 2048, contextSize: 8192, gpu: p.gpu, effort: p.effort, level: p.effortLevel || 'thorough' });
}
function arenaNext(r, i) {
  if (S.route.view === 'arena') render();
  runArenaSide(r, i + 1);
}
function paintArenaSide(r, i) {
  if (S.route.view !== 'arena' || arenaRound !== r) return;
  const el = $(`#ar-side-${i} .arena-a`);
  if (el) el.innerHTML = markdown(r.sides[i].text.replace(/<think>[\s\S]*?(<\/think>|$)/g, '')) || '<span class="status-line">Thinking…</span>';
  const h = $(`#ar-side-${i} .arena-h .muted`);
  if (h && h.textContent !== 'Writing…') h.textContent = 'Writing…';
}

function arenaVote(v) {
  const r = arenaRound;
  if (!r || r.voted) return;
  r.voted = v;
  const d = arenaData();
  const [a, b] = r.sides.map((s) => s.target);
  const st = (t) => (d.ratings[t] ||= { elo: 1000, w: 0, l: 0, t: 0, games: 0, label: targetLabel(t) });
  const A = st(a); const B = st(b);
  if (v !== 'bad') {
    const ea = 1 / (1 + 10 ** ((B.elo - A.elo) / 400));
    const sa = v === 'A' ? 1 : v === 'B' ? 0 : 0.5;
    A.elo += ARENA_K * (sa - ea); B.elo += ARENA_K * ((1 - sa) - (1 - ea));
    if (v === 'A') { A.w++; B.l++; } else if (v === 'B') { B.w++; A.l++; } else { A.t++; B.t++; }
  } else { A.l++; B.l++; A.elo -= 6; B.elo -= 6; }
  A.games++; B.games++;
  if (v === 'A' || v === 'B') { learnSignal('general', v === 'A' ? a : b, 'up', 1); learnSignal('general', v === 'A' ? b : a, 'down', 0.5); }
  else if (v === 'bad') { learnSignal('general', a, 'down', 0.5); learnSignal('general', b, 'down', 0.5); }
  A.label = targetLabel(a); B.label = targetLabel(b);
  d.games.push({ a, b, winner: v, prompt: r.prompt.slice(0, 200), t: now(), ms: r.sides.map((s) => s.ms) });
  if (d.games.length > 2000) d.games.splice(0, d.games.length - 2000);
  save();
  render();
  const pick = v === 'A' ? a : v === 'B' ? b : null;
  toast(pick ? `You picked ${targetLabel(pick)}.` : v === 'tie' ? 'Counted as a tie.' : 'Noted: neither was good enough.');
}
