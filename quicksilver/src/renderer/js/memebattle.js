// Meme battle: two of your models each make a meme on the same topic. You see both without
// their names, vote for the funnier one, then see who made it. The votes build a meme
// leaderboard of their own (separate from Compare models). Each meme is written by its model
// (top line, bottom line and the picture under them); the picture is painted by your picture
// model when you have one, and the meme can be saved as a PNG.
'use strict';

let memeRound = null; // { topic, paint, sides: [{ target, raw, meme, img, done, error, ms }], voted, painting }
const memeData = () => (S.data.memes ||= { ratings: {}, games: [] });
const MEME_TOPICS = ['Mondays', 'my code works and I don\'t know why', 'cats knocking things off tables', 'group chats at 2 a.m.', 'trying to eat healthy', 'the printer', 'one more episode', 'self-checkout machines',
  'reply-all emails', 'when the Wi-Fi drops', 'adulting', 'the gym in January', 'AI models', 'my plants', 'forgetting why I walked into a room', 'meetings that could have been an email', 'online shopping at midnight', 'dogs vs cats'];
const MEME_SYS = 'You make memes. Reply with ONLY a JSON object, no other text: {"top": "top caption", "bottom": "bottom caption (the punchline)", "picture": "what the picture under the captions shows, in under 25 words, as a photo or illustration description"}. Captions are short (under 10 words each), funny, and work with the picture. Be original; no famous meme names.';

// Reads a model's reply: JSON (possibly in a code block or with thinking before it), or lines.
function parseMeme(text) {
  const t = String(text || '').replace(/<think>[\s\S]*?(<\/think>|$)/g, '').trim();
  const m = t.match(/\{[\s\S]*\}/);
  if (m) { try { const j = JSON.parse(m[0]); if (j.top || j.bottom) return { top: String(j.top || '').slice(0, 120), bottom: String(j.bottom || '').slice(0, 120), picture: String(j.picture || '').slice(0, 300) }; } catch {} }
  const lines = t.split('\n').map((l) => l.replace(/^[-*#>\s]*(top|bottom|picture|caption)?\s*[:：-]?\s*/i, '').replace(/^["']|["']$/g, '').trim()).filter(Boolean);
  return lines.length ? { top: (lines[0] || '').slice(0, 120), bottom: (lines[1] || '').slice(0, 120), picture: (lines[2] || '').slice(0, 300) } : null;
}

const memePicker = () => (typeof pickMediaModel === 'function' ? pickMediaModel('image') : null);

views.memes = {
  html() {
    const r = memeRound;
    const pool = arenaTargets();
    const pic = memePicker();
    return `<div class="page arena">
      <div class="page-head"><h1>Meme battle</h1><span class="small muted">Two models, one topic: which meme is funnier?</span></div>
      ${arenaTabsHTML('memes')}
      <p class="lede">Give a topic (or let Quicksilver pick one). Two of your models each make a meme without their names showing; you vote for the funnier one, then see who made it. Your votes build a meme leaderboard.</p>
      ${pool.length < 2 ? '<div class="notice info">You need at least two models (or a model and a team) for a battle. <button class="btn small primary" data-goto="models">Get models</button></div>' : `
      <div class="arena-ask"><div class="row"><input id="mb-topic" class="grow" placeholder="Topic, e.g. Mondays, my cat, the office printer" value="${esc(r?.topic || '')}"><button class="btn" id="mb-dice" title="A random topic">🎲 Surprise me</button></div>
        <div class="row" style="flex-wrap:wrap"><label class="small muted" for="mb-pool">Contestants</label><select id="mb-pool"><option value="all">Any two, at random</option>${pool.map((t) => `<option value="${esc(t.target)}" ${S.data.prefs.memeFixed === t.target ? 'selected' : ''}>${esc(targetLabel(t.target))} vs anyone</option>`).join('')}</select>
          <label class="row small" title="${pic ? `Painted by ${esc(pic.api ? pic.label : pic.inst.name)}; takes a little while per meme` : 'Get a picture model (Models → Images & video) or connect a picture API to paint them'}"><input type="checkbox" id="mb-paint" ${pic && S.data.prefs.memePaint !== false ? 'checked' : ''} ${pic ? '' : 'disabled'}> Paint the pictures${pic ? '' : ' (needs a picture model)'}</label>
          <span class="grow"></span><button class="btn primary" id="mb-go" ${r && !memeFinished(r) ? 'disabled' : ''}>😂 ${r ? 'New battle' : 'Start the battle'}</button></div></div>`}
      ${r ? memeRoundHTML(r) : ''}
      ${memeBoardHTML()}
    </div>`;
  },
  bind() {
    $$('[data-goto]').forEach((b) => b.addEventListener('click', () => go({ view: b.dataset.goto })));
    bindArenaTabs();
    $('#mb-go')?.addEventListener('click', startMemeBattle);
    $('#mb-topic')?.addEventListener('keydown', (e) => { if (e.key === 'Enter') startMemeBattle(); });
    $('#mb-dice')?.addEventListener('click', () => { $('#mb-topic').value = MEME_TOPICS[Math.floor(Math.random() * MEME_TOPICS.length)]; });
    $('#mb-pool')?.addEventListener('change', (e) => { S.data.prefs.memeFixed = e.target.value === 'all' ? '' : e.target.value; save(); });
    $('#mb-paint')?.addEventListener('change', (e) => { S.data.prefs.memePaint = e.target.checked; save(); });
    $$('[data-mvote]').forEach((b) => b.addEventListener('click', () => memeVote(b.dataset.mvote)));
    $$('[data-msave]').forEach((b) => b.addEventListener('click', () => saveMeme(Number(b.dataset.msave))));
    $('#mb-reset')?.addEventListener('click', async () => { if (await confirmBox('Clear all meme battle votes?', { yes: 'Clear' })) { S.data.memes = { ratings: {}, games: [] }; save(); render(); } });
  },
};

const memeFinished = (r) => r.sides.every((s) => s.done) && !r.painting;

function memeCardHTML(s, i) {
  if (s.error) return `<div class="meme meme-empty"><span class="muted">${esc(s.error)}</span></div>`;
  if (!s.meme) return `<div class="meme meme-empty"><span class="status-line">${s.done ? 'No meme came back.' : 'Thinking up a meme…'}</span></div>`;
  const bg = s.img?.url ? `<img class="meme-img" src="${esc(s.img.url)}" alt="">` : `<div class="meme-img meme-plain" style="background:${['linear-gradient(135deg,#7c5cff,#ff6fae)', 'linear-gradient(135deg,#1fb6ff,#7cf5c4)'][i % 2]}"><span>${esc(s.meme.picture || '')}</span></div>`;
  return `<div class="meme" id="mb-meme-${i}">${bg}<div class="meme-t top">${esc(s.meme.top)}</div><div class="meme-t bottom">${esc(s.meme.bottom)}</div>${s.painting ? '<div class="meme-busy small">Painting the picture…</div>' : ''}</div>`;
}
function memeRoundHTML(r) {
  const done = memeFinished(r);
  return `<div class="arena-grid">${r.sides.map((s, i) => {
    const L = 'AB'[i];
    const won = r.voted && (r.voted === L ? 'won' : r.voted === 'tie' ? 'tie' : r.voted === 'bad' ? 'bad' : 'lost');
    return `<div class="card arena-side ${won || ''}"><div class="row arena-h"><span class="arena-l">${L}</span>${r.voted ? `<b class="grow">${esc(targetLabel(s.target))}</b>${won === 'won' ? '<span class="badge b-mint">Funnier</span>' : ''}` : '<span class="grow muted small">Name hidden until you vote</span>'}${s.meme ? `<button class="btn small ghost" data-msave="${i}" title="Save this meme as a PNG picture">⬇ Save</button>` : ''}</div>
      ${memeCardHTML(s, i)}${s.meme?.picture && s.img?.url ? `<span class="small muted">Picture: ${esc(s.meme.picture)}</span>` : ''}</div>`;
  }).join('')}</div>
  ${done && !r.voted && r.sides.some((s) => s.meme) ? '<div class="arena-vote"><span class="small muted">Which meme is funnier?</span><button class="btn" data-mvote="A">A</button><button class="btn" data-mvote="tie">Both funny</button><button class="btn" data-mvote="B">B</button><button class="btn ghost" data-mvote="bad">Neither</button></div>' : ''}
  ${!done ? `<p class="small muted" style="text-align:center">${r.painting ? 'Painting the pictures, one at a time…' : 'They write one after the other, so each gets this PC\'s full power.'}</p>` : ''}`;
}
function memeBoardHTML() {
  const d = memeData();
  const rows = Object.entries(d.ratings).sort((a, b) => b[1].elo - a[1].elo);
  if (!rows.length) return '<div class="section"><h2>Funniest models</h2></div><div class="empty small">Vote in a few battles and your meme leaderboard appears here.</div>';
  return `<div class="section"><h2>Funniest models</h2><span class="small muted">${d.games.length} battle${d.games.length === 1 ? '' : 's'}</span><button class="btn small ghost" id="mb-reset">Clear</button></div>
    <table class="list arena-board"><thead><tr><th>#</th><th>Model or team</th><th>Rating</th><th>Won</th><th>Lost</th><th>Tied</th></tr></thead><tbody>
    ${rows.map(([t, s], i) => `<tr><td>${i + 1}</td><td><b>${esc(targetValid(t) ? targetLabel(t) : s.label || t)}</b></td><td><span class="elo">${Math.round(s.elo)}</span></td><td>${s.w}</td><td>${s.l}</td><td>${s.t}</td></tr>`).join('')}
    </tbody></table>`;
}

function startMemeBattle() {
  const input = $('#mb-topic');
  if (input && !input.value.trim()) input.value = MEME_TOPICS[Math.floor(Math.random() * MEME_TOPICS.length)];
  const topic = input?.value.trim();
  if (!topic) return;
  if (pending) { toast('Wait for the chat answer to finish first.'); return; }
  const pool = arenaTargets().map((t) => t.target);
  if (pool.length < 2) return;
  const shuffle = (a) => a.map((x) => [Math.random(), x]).sort((p, q) => p[0] - q[0]).map((x) => x[1]);
  const fixed = S.data.prefs.memeFixed && pool.includes(S.data.prefs.memeFixed) ? S.data.prefs.memeFixed : null;
  const pair = shuffle(fixed ? [fixed, shuffle(pool.filter((t) => t !== fixed))[0]] : shuffle(pool).slice(0, 2));
  memeRound = { topic, paint: Boolean(memePicker()) && S.data.prefs.memePaint !== false, sides: pair.map((target) => ({ target, raw: '', meme: null, done: false })), voted: null };
  render();
  runMemeSide(memeRound, 0);
}
function runMemeSide(r, i) {
  if (memeRound !== r) return;
  if (i >= r.sides.length) { paintMemes(r); return; }
  const s = r.sides[i];
  s.started = Date.now();
  const requestId = uid();
  const p = S.data.prefs;
  const next = () => { s.done = true; s.ms = Date.now() - s.started; if (S.route.view === 'memes') render(); runMemeSide(r, i + 1); };
  oneShots.set(requestId, {
    text: '',
    onText: (t) => { s.raw = t; },
    resolve: (t) => { s.raw = t || s.raw; s.meme = parseMeme(s.raw); if (!s.meme) s.error = 'This model did not write a meme.'; next(); },
    reject: (err) => { s.error = err.message === 'aborted' ? 'Stopped.' : err.message; next(); },
  });
  qs.sendChat({ requestId, target: s.target, messages: [{ role: 'system', content: MEME_SYS }, { role: 'user', content: `Make a meme about: ${r.topic}` }], temperature: 0.9, maxTokens: 400, contextSize: 4096, gpu: p.gpu, effort: 'fast', level: 'fast' });
}
// The pictures, one after the other, with the same picture model for both so it stays fair.
async function paintMemes(r) {
  const pick = r.paint ? memePicker() : null;
  if (!pick) { if (S.route.view === 'memes') render(); return; }
  r.painting = true;
  for (const s of r.sides) {
    if (memeRound !== r || !s.meme?.picture) continue;
    s.painting = true; if (S.route.view === 'memes') render();
    const prompt = `${s.meme.picture}, meme picture, clear subject, no text, no words, no letters`;
    try {
      if (pick.api) {
        const [, pid, ...rest] = pick.value.split(':');
        s.img = await call('media:apiImage', pid, rest.join(':'), { prompt, size: '1024x1024' });
      } else {
        const jobId = uid();
        s.img = await new Promise((resolve) => {
          mediaJobs[jobId] = { status: 'Starting…', progress: 0, label: 'Meme picture', resolve, start: Date.now(), inChat: true };
          qs.call('media:generate', jobId, { modelId: pick.inst.id, mode: 'generate', prompt, negative: 'text, words, letters, watermark', width: 768, height: 768, seed: '' }).catch(() => resolve(null));
        });
      }
    } catch { s.img = null; }
    s.painting = false;
  }
  r.painting = false;
  if (S.route.view === 'memes') render();
}

function memeVote(v) {
  const r = memeRound;
  if (!r || r.voted) return;
  r.voted = v;
  const d = memeData();
  const [a, b] = r.sides.map((s) => s.target);
  const st = (t) => (d.ratings[t] ||= { elo: 1000, w: 0, l: 0, t: 0, games: 0, label: targetLabel(t) });
  const A = st(a); const B = st(b);
  if (v === 'bad') { A.l++; B.l++; A.elo -= 6; B.elo -= 6; } else {
    const ea = 1 / (1 + 10 ** ((B.elo - A.elo) / 400));
    const sa = v === 'A' ? 1 : v === 'B' ? 0 : 0.5;
    A.elo += ARENA_K * (sa - ea); B.elo += ARENA_K * ((1 - sa) - (1 - ea));
    if (v === 'A') { A.w++; B.l++; } else if (v === 'B') { B.w++; A.l++; } else { A.t++; B.t++; }
  }
  A.games++; B.games++;
  d.games.push({ a, b, winner: v, topic: r.topic.slice(0, 120), t: now() });
  if (d.games.length > 1000) d.games.splice(0, d.games.length - 1000);
  save();
  render();
  const pick = v === 'A' ? a : v === 'B' ? b : null;
  toast(pick ? `Funnier: ${targetLabel(pick)}.` : v === 'tie' ? 'Both funny: a tie.' : 'Noted: neither landed.');
}

// The meme as a PNG: the picture (or the colored card) with the captions in white, outlined in black.
async function saveMeme(i) {
  const s = memeRound?.sides[i];
  if (!s?.meme) return;
  const W = 900; const H = 900;
  const c = document.createElement('canvas'); c.width = W; c.height = H;
  const g = c.getContext('2d');
  let drew = false;
  if (s.img?.id) {
    try {
      const src = await qs.call('media:dataUrl', s.img.id);
      const im = await new Promise((res, rej) => { const x = new Image(); x.onload = () => res(x); x.onerror = rej; x.src = src; });
      const k = Math.max(W / im.width, H / im.height);
      g.drawImage(im, (W - im.width * k) / 2, (H - im.height * k) / 2, im.width * k, im.height * k);
      drew = true;
    } catch {}
  }
  if (!drew) {
    const gr = g.createLinearGradient(0, 0, W, H);
    const [c1, c2] = [['#7c5cff', '#ff6fae'], ['#1fb6ff', '#7cf5c4']][i % 2];
    gr.addColorStop(0, c1); gr.addColorStop(1, c2); g.fillStyle = gr; g.fillRect(0, 0, W, H);
    g.fillStyle = 'rgba(255,255,255,.85)'; g.font = '600 30px system-ui, sans-serif'; g.textAlign = 'center';
    memeWrap(g, s.meme.picture || '', W - 120).forEach((l, n, all) => g.fillText(l, W / 2, H / 2 - (all.length - 1) * 19 + n * 38));
  }
  const cap = (text, top) => {
    let size = 76;
    let lines;
    do { g.font = `900 ${size}px Impact, "Anton", "Arial Black", sans-serif`; lines = memeWrap(g, text.toUpperCase(), W - 60); size -= 4; } while (lines.length > 3 && size > 36);
    g.textAlign = 'center'; g.lineJoin = 'round'; g.lineWidth = Math.max(4, size / 9); g.strokeStyle = '#000'; g.fillStyle = '#fff';
    lines.forEach((l, n) => { const y = top ? 24 + (n + 1) * size : H - 24 - (lines.length - 1 - n) * size; g.strokeText(l, W / 2, y); g.fillText(l, W / 2, y); });
  };
  if (s.meme.top) cap(s.meme.top, true);
  if (s.meme.bottom) cap(s.meme.bottom, false);
  const a = document.createElement('a');
  a.href = c.toDataURL('image/png');
  a.download = `meme-${(memeRound.topic || 'battle').replace(/[^\w]+/g, '-').slice(0, 40)}-${'AB'[i]}.png`;
  a.click();
}
function memeWrap(g, text, max) {
  const out = []; let line = '';
  for (const w of String(text).split(/\s+/)) { const t = line ? `${line} ${w}` : w; if (g.measureText(t).width > max && line) { out.push(line); line = w; } else line = t; }
  if (line) out.push(line);
  return out;
}

// The Compare models tabs (by task, blind test) and Meme battle, one row on both pages.
function arenaTabsHTML(on) {
  const t = (k, label, attr) => `<button class="tab ${on === k ? 'active' : ''}" ${attr} role="tab">${label}</button>`;
  return `<div class="tabs" role="tablist">${t('task', '📊 By task', 'data-cmp-tab="task"')}${t('blind', '🙈 Blind test', 'data-cmp-tab="blind"')}${t('memes', '😂 Meme battle', 'data-arena-tab="memes"')}</div>`;
}
function bindArenaTabs() {
  $$('[data-arena-tab]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); go({ view: 'memes' }); }));
  if (S.route.view === 'memes') $$('[data-cmp-tab]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); cmpTab = b.dataset.cmpTab; go({ view: 'arena' }); }));
}
