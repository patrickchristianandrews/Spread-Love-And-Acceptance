// Studio: Music (beats and melodies), Voice (read aloud, two-voice podcasts) and Quick fixes
// (one-click photo, video and sound tools). Everything runs on this PC.
'use strict';

let toolPick = null;      // gallery id chosen on the Quick fixes tab
let voiceList = null;     // Windows voices, loaded once
let musicSpec = null;     // the last beat, so it can be tweaked and played again

// Ready-made grooves: a beat in one click, no model needed.
const BEAT_PRESETS = {
  lofi: { label: 'Lo-fi chill', spec: { bpm: 84, bars: 8, style: 'lofi', chords: ['Dm7', 'G7', 'Cmaj7', 'Am7'], drums: { kick: 'x......x..x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' }, bass: 'x......x..x.....', melody: 'A4 . . C5 . . E5 . D5 . . . C5 . A4 .' } },
  trap: { label: 'Trap', spec: { bpm: 140, bars: 8, style: 'trap', chords: ['Am', 'F', 'Dm', 'E'], drums: { kick: 'x.....x...x..x..', snare: '........x.......', hat: 'xxxxxxxxxxxxxxxx', clap: '........x.......' }, bass: 'x.....x...x..x..', melody: 'E5 . . . C5 . . . D5 . B4 . . . . .' } },
  house: { label: 'House', spec: { bpm: 124, bars: 8, style: 'house', chords: ['Am7', 'Fmaj7', 'C', 'G'], drums: { kick: 'x...x...x...x...', clap: '....x.......x...', hat: '..x...x...x...x.' }, bass: '..x...x...x...x.', melody: 'E5 . E5 . G5 . . E5 . . D5 . C5 . . .' } },
  pop: { label: 'Pop', spec: { bpm: 104, bars: 8, style: 'pop', chords: ['C', 'G', 'Am', 'F'], drums: { kick: 'x.......x.x.....', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' }, bass: 'x.....x.x.....x.', melody: 'E5 . G5 . A5 . G5 . E5 . D5 . C5 . . .' } },
  rock: { label: 'Rock', spec: { bpm: 118, bars: 8, style: 'rock', chords: ['E', 'D', 'A', 'E'], drums: { kick: 'x.....x.x.......', snare: '....x.......x...', hat: 'x.x.x.x.x.x.x.x.' }, bass: 'x.x.x.x.x.x.x.x.', melody: '' } },
  ambient: { label: 'Ambient', spec: { bpm: 70, bars: 8, style: 'ambient lofi', chords: ['Cmaj7', 'Am7', 'Fmaj7', 'Gsus4'], drums: { kick: 'x...............', hat: '' }, bass: 'x...............', melody: 'G5 . . . . . . . E5 . . . . . . .' } },
};

const jobsForTab = (label) => Object.entries(mediaJobs).filter(([, j]) => j.label === label && !j.done).map(([id]) => jobBox(id)).join('');
const recentOf = (kind, n = 6) => gallery.filter((g) => g.kind === kind).slice(0, n);
const soundList = (items) => (items.length ? `<div class="stack-v">${items.map((g) => `<div class="card" style="padding:10px 12px"><div class="row"><b class="grow small">${esc(g.title || 'Sound')}</b><button class="btn small ghost" data-gopen="${g.id}">More</button></div><audio src="${g.url}" controls preload="metadata" style="width:100%;margin-top:6px"></audio></div>`).join('')}</div>` : '');

function studioJob(label, sec, start) {
  const jobId = uid();
  return new Promise((resolve) => {
    mediaJobs[jobId] = { status: 'Starting…', progress: 0, label, resolve, sec, start: Date.now() };
    render();
    start(jobId).catch((err) => { mediaJobs[jobId].error = err.message; mediaJobs[jobId].done = true; resolve(null); render(); });
  });
}

// ---------- Music ----------

function musicHTML() {
  const helper = promptHelper();
  return `<div class="studio">
    <div class="card stack-v">
      <div class="field"><label for="mu-idea">Describe the track</label><textarea id="mu-idea" rows="3" placeholder="Chill lo-fi for studying, rainy night, 85 bpm, mellow piano melody">${esc(S.data.prefs.lastMusic || '')}</textarea></div>
      <button class="btn primary" id="mu-ai" ${helper ? '' : 'disabled title="Install a text model to compose from a description"'}>✨ Compose it</button>
      <div class="label" style="margin-top:6px">Or start from a groove</div>
      <div class="row" style="flex-wrap:wrap">${Object.entries(BEAT_PRESETS).map(([k, p]) => `<button class="btn small" data-beat="${k}">${esc(p.label)}</button>`).join('')}</div>
      ${musicSpec ? `<details open><summary class="label" style="cursor:pointer">Tweak it</summary><div class="grid2" style="margin-top:10px">
        <div class="field"><label for="mu-bpm">Tempo (bpm)</label><input id="mu-bpm" type="number" min="60" max="180" value="${musicSpec.bpm || 90}"></div>
        <div class="field"><label for="mu-bars">Length (bars)</label><input id="mu-bars" type="number" min="1" max="16" value="${musicSpec.bars || 8}"></div>
        <div class="field" style="grid-column:1/-1"><label for="mu-chords">Chords (one per bar)</label><input id="mu-chords" value="${esc((musicSpec.chords || []).join(' '))}"></div>
        <div class="field" style="grid-column:1/-1"><label for="mu-mel">Melody (16 notes or dots per bar)</label><input id="mu-mel" value="${esc(musicSpec.melody || '')}"></div>
      </div><button class="btn" id="mu-again">🔁 Play it again with these changes</button></details>` : ''}
      <p class="small muted">Drums, bass, chords and melody are played by Quicksilver's built-in synth and saved as an MP3 you can use anywhere. Songs with sung vocals need a music-generation model, which isn't available to run on a PC yet.</p>
    </div>
    <div class="stack-v">${jobsForTab('Music')}${soundList(recentOf('audio').filter((g) => /bpm/.test(g.title || ''))) || '<div class="canvas-wrap"><div class="empty">Your tracks will appear here.</div></div>'}</div>
  </div>`;
}

async function playSpec(spec) {
  musicSpec = spec;
  const jobId = uid();
  mediaJobs[jobId] = { status: 'Playing it into a file…', progress: 0.3, label: 'Music', start: Date.now() };
  render();
  try {
    const wav = await renderBeat(spec);
    await call('tools:saveWav', wav, { title: `${spec.style || 'Beat'} · ${spec.bpm || 90} bpm · ${(spec.chords || []).join(' ')}`.slice(0, 80) });
    await refreshGallery();
  } catch (err) { toast(err.message); }
  mediaJobs[jobId].done = true;
  if (S.route.view === 'studio') render();
}

function bindMusic() {
  $$('[data-beat]').forEach((b) => b.addEventListener('click', () => playSpec(JSON.parse(JSON.stringify(BEAT_PRESETS[b.dataset.beat].spec)))));
  $('#mu-again')?.addEventListener('click', () => playSpec({ ...musicSpec, bpm: Number($('#mu-bpm').value) || 90, bars: Number($('#mu-bars').value) || 8, chords: $('#mu-chords').value.trim().split(/[\s,|]+/).filter(Boolean), melody: $('#mu-mel').value.trim() }));
  $('#mu-ai')?.addEventListener('click', async (e) => {
    const idea = $('#mu-idea').value.trim();
    if (!idea) { toast('Describe the track first, or pick a groove.'); return; }
    S.data.prefs.lastMusic = idea; save();
    e.target.disabled = true; e.target.textContent = '✨ Composing…';
    try {
      const out = await askAI(promptHelper(), `You compose short instrumental loops. ${MEDIA_RULES.beat}`, idea, { temperature: 0.8, maxTokens: 700 });
      const spec = parseBeat(out);
      if (!spec) throw new Error('The model did not write a playable pattern. Try again, or pick a groove.');
      await playSpec(spec);
    } catch (err) { toast(err.message, 6000); render(); }
  });
}

// ---------- Voice ----------

function voiceHTML() {
  if (!voiceList) qs.call('tools:voices').then((v) => { voiceList = v; if (S.route.view === 'studio' && studioTab === 'voice') render(); }).catch(() => { voiceList = []; });
  const v = voiceList || [];
  return `<div class="studio">
    <div class="card stack-v">
      <div class="field"><label for="vo-text">Text to read</label><span class="help">For a conversation, start lines with the speaker's name, e.g. "ALEX: Hi!" and "SAM: Hello!", and each speaker gets a different voice.</span><textarea id="vo-text" rows="9" placeholder="Paste an article, a chapter or a script…">${esc(S.data.prefs.lastVoiceText || '')}</textarea></div>
      <div class="grid2">
        <div class="field"><label for="vo-voice">Voice</label><select id="vo-voice">${v.length ? v.map((x) => `<option value="${esc(x.name)}" ${S.data.prefs.voice === x.name ? 'selected' : ''}>${esc(x.name.replace(/^Microsoft /, '').replace(/ Desktop$/, ''))} · ${esc(x.gender || '')} ${esc(x.culture || '')}</option>`).join('') : '<option value="">Windows default voice</option>'}</select></div>
        <div class="field"><label for="vo-rate">Speed</label><input id="vo-rate" type="range" min="-5" max="5" step="1" value="${Number(S.data.prefs.voiceRate) || 0}"></div>
      </div>
      <div class="row"><button class="btn primary" id="vo-go">🎙️ Record it</button><button class="btn" id="vo-pod">✨ Turn it into a two-host podcast</button></div>
      <p class="small muted">Uses the voices built into Windows, offline. Add more under Windows Settings → Time & language → Speech. Recordings are mastered for even, clear sound and saved as MP3.</p>
    </div>
    <div class="stack-v">${jobsForTab('Voice')}${soundList(recentOf('audio').filter((g) => !/bpm/.test(g.title || ''))) || '<div class="canvas-wrap"><div class="empty">Your recordings will appear here.</div></div>'}</div>
  </div>`;
}

function bindVoice() {
  const keep = () => { S.data.prefs.lastVoiceText = $('#vo-text').value; S.data.prefs.voice = $('#vo-voice').value || ''; S.data.prefs.voiceRate = Number($('#vo-rate').value) || 0; save(); };
  $('#vo-voice')?.addEventListener('change', keep); $('#vo-rate')?.addEventListener('change', keep);
  const record = async (text) => {
    await studioJob('Voice', Math.max(3, text.split(/\s+/).length / 40), (id) => qs.call('tools:speak', id, text, { title: text.replace(/^[A-Z]+:\s*/, '').slice(0, 60), voice: S.data.prefs.voice || undefined, rate: S.data.prefs.voiceRate || 0 }));
    await refreshGallery(); if (S.route.view === 'studio') render();
  };
  $('#vo-go')?.addEventListener('click', () => { keep(); const t = $('#vo-text').value.trim(); if (!t) { toast('Paste some text first.'); return; } record(t); });
  $('#vo-pod')?.addEventListener('click', async (e) => {
    keep();
    const t = $('#vo-text').value.trim();
    if (!t) { toast('Paste the article or notes to discuss.'); return; }
    if (!promptHelper()) { toast('Install a text model to write the podcast script.'); return; }
    e.target.disabled = true; e.target.textContent = '✨ Writing the script…';
    try {
      const script = await askAI(promptHelper(), `You write podcast scripts. ${MEDIA_RULES.podcast}`, `Make a short episode (3–5 minutes) discussing this:\n\n${t.slice(0, 12000)}`, { temperature: 0.8, maxTokens: 1400 });
      $('#vo-text').value = script; keep();
      await record(script);
    } catch (err) { toast(err.message, 6000); render(); }
  });
}

// ---------- Quick fixes ----------

const FIXES = {
  image: [['upscale4', '🔍 Upscale 4×'], ['upscale2', '🔍 Upscale 2×'], ['retouch', '💄 Retouch'], ['bw', '🖤 Black & white']],
  video: [['fps60', '🎞️ Smooth to 60 fps'], ['slowmo', '🐢 Slow motion'], ['upscale', '📺 Upscale 2×'], ['stabilize', '🎯 Stabilize'], ['enhance', '🌈 Enhance'], ['extract:mp3', '🎧 Save the sound as MP3']],
  audio: [['master', '🎚️ Master (podcast/voice)'], ['denoise', '🧽 Remove noise'], ['loud', '🔊 Even out loudness'], ['karaoke', '🎤 Remove vocals'], ['vocals', '🗣️ Bring vocals forward']],
};

function fixesHTML() {
  const g = gallery.find((x) => x.id === toolPick) || gallery[0];
  if (g) toolPick = g.id;
  const opts = gallery.slice(0, 60).map((x) => `<option value="${x.id}" ${x.id === toolPick ? 'selected' : ''}>${{ image: '🖼️', video: '🎬', audio: '🎵' }[x.kind] || ''} ${esc((x.prompt || x.title || 'Untitled').slice(0, 60))}</option>`).join('');
  return `<div class="studio">
    <div class="card stack-v">
      <p class="small muted" style="margin:0">One-click fixes for photos, videos and sound. They run on this PC in seconds to minutes, and the original is kept.</p>
      ${gallery.length ? `<div class="field"><label for="tl-pick">File</label><select id="tl-pick">${opts}</select></div>` : '<div class="empty">Upload a photo, video or sound file first (button at the top).</div>'}
      ${g ? `<div class="row" style="flex-wrap:wrap">${(FIXES[g.kind] || []).map(([op, l]) => `<button class="btn" data-fix="${op}">${l}</button>`).join('')}</div>` : ''}
      ${g?.kind === 'image' ? '<p class="small muted">Want AI changes too (remove the background, change the sky)? Use <a href="#" data-stab-go="edit">Edit photo</a> with an AI edit model.</p>' : ''}
    </div>
    <div class="stack-v">${jobsForTab('Fixing')}
      ${g ? `<div class="canvas-wrap">${g.kind === 'audio' ? `<audio src="${g.url}" controls style="width:100%"></audio>` : g.kind === 'video' ? `<video src="${g.url}" controls></video>` : `<img src="${g.url}" alt="">`}</div>` : ''}
      ${resultsHTML('any')}${soundList(lastResults.map((id) => gallery.find((x) => x.id === id)).filter((x) => x?.kind === 'audio').slice(0, 4))}</div>
  </div>`;
}

function bindFixes() {
  $('#tl-pick')?.addEventListener('change', (e) => { toolPick = e.target.value; render(); });
  $$('[data-stab-go]').forEach((a) => a.addEventListener('click', async (e) => { e.preventDefault(); await loadEditor(toolPick); studioTab = a.dataset.stabGo; render(); }));
  $$('[data-fix]').forEach((b) => b.addEventListener('click', async () => {
    const g = gallery.find((x) => x.id === toolPick);
    if (!g) return;
    const [kind, op] = b.dataset.fix.includes(':') ? b.dataset.fix.split(':') : [g.kind, b.dataset.fix];
    await studioJob('Fixing', null, (id) => qs.call('tools:run', id, kind, op, { galleryId: g.id }));
    await refreshGallery(); if (S.route.view === 'studio') render();
  }));
}
