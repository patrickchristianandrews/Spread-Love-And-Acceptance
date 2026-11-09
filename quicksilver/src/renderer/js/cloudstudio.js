// Create → Cloud: the best hosted photo, video and music models through one fal.ai key, rated out of
// 10 with their prices, next to what this PC can make on its own.
'use strict';

let cloudKind = 'image';
let cloudModels = null; // { image: [[id, name, rating, price, best]], edit, video, animate, music }
const CLOUD_KINDS = { image: ['🖼️', 'Photo'], edit: ['🪄', 'Edit a photo'], video: ['🎬', 'Video'], animate: ['📸', 'Photo to video'], music: ['🎵', 'Full songs'] };
const LYRICS_SYS = 'Write complete, original song lyrics for the user\'s idea: [Intro], two [Verse] sections, a [Chorus] that repeats, a [Bridge] and an [Outro], each section labelled in square brackets. Natural, singable lines that rhyme where it sounds good. Reply with the lyrics only.';
const falProvider = () => (S.providers || []).find((p) => p.preset === 'fal' && p.hasKey);
// What this PC makes on its own for each kind (out of 10), to compare with the cloud.
function localBest(kind) {
  const r = createRatings(S.installed.filter((m) => m.kind && m.kind !== 'text').map((m) => ({ model: catModel(m.catalogId) })).filter((x) => x.model));
  const k = { image: 'photo', edit: 'editing', video: 'video', animate: 'video', music: 'music' }[kind];
  const v = r[k]?.v ?? (k === 'music' ? SYNTH_MUSIC : null);
  return v == null ? null : { v: v * 2, who: r[k]?.who || 'the built-in synth' };
}

const fmtSongLen = (s) => `${Math.floor(s / 60)}:${String(s % 60).padStart(2, '0')}`;
async function writeLyrics(idea) {
  const helper = promptHelper();
  if (!helper) return '';
  try { return String(await askAI(helper, LYRICS_SYS, idea, { maxTokens: 900, temperature: 0.9 }) || '').trim(); } catch { return ''; }
}
function cloudStudioHTML() {
  if (!cloudModels) { qs.call('media:cloudModels').then((m) => { cloudModels = m; if (S.route.view === 'studio' && studioTab === 'cloud') render(); }).catch(() => {}); return '<div class="empty">Loading…</div>'; }
  const p = falProvider();
  const list = cloudModels[cloudKind] || [];
  const pick = S.data.prefs[`cloud_${cloudKind}`] && list.some((m) => m[0] === S.data.prefs[`cloud_${cloudKind}`]) ? S.data.prefs[`cloud_${cloudKind}`] : list[0]?.[0];
  const loc = localBest(cloudKind);
  const pics = gallery.filter((g) => g.kind === 'image').slice(0, 40);
  const needsPhoto = cloudKind === 'edit' || cloudKind === 'animate';
  const jobs = Object.entries(mediaJobs).filter(([, j]) => j.label === 'Cloud' && !j.done);
  return `<div class="notice info" style="margin-bottom:12px"><b>☁️ Top-quality photos, video and music from the cloud.</b> One fal.ai key reaches Google's Nano Banana and Veo 3.1, Kling 3, ElevenLabs Music, MiniMax Music and Lyria. You pay fal per picture, second or song; your PC's own models stay free. ${p ? `<span class="badge b-mint">✓ ${esc(p.name)} connected</span>` : '<button class="btn small primary" id="cs-connect">Connect fal.ai</button>'}</div>
    <div class="tabs cc-kinds">${Object.entries(CLOUD_KINDS).map(([k, [ic, l]]) => `<button class="tab ${cloudKind === k ? 'active' : ''}" data-cs-kind="${k}">${ic} ${l}</button>`).join('')}</div>
    <div class="cs-models">${list.map(([id, name, rating, price, best]) => `<label class="cs-model ${id === pick ? 'now' : ''}"><input type="radio" name="cs-model" value="${esc(id)}" ${id === pick ? 'checked' : ''}><span class="grow"><b>${esc(name)}</b><span class="small muted">${esc(best)} · ${esc(price)}</span></span>${tenStarsHTML(rating)}</label>`).join('')}
      <div class="cs-model local"><span class="grow"><b>💻 On this PC</b><span class="small muted">${loc ? `${esc(loc.who)} · free, private` : 'No model for this yet (see the other Create tabs)'}</span></span>${loc ? tenStarsHTML(Math.round(loc.v * 2) / 2) : '<span class="muted small">–</span>'}</div></div>
    <div class="grid2" style="margin-top:12px;align-items:start"><div class="stack-v">
      <div class="field"><label for="cs-prompt">${cloudKind === 'music' ? 'Describe the song (style, mood, instruments, tempo)' : cloudKind === 'edit' ? 'What to change' : 'Describe it'}</label><textarea id="cs-prompt" rows="4" placeholder="${cloudKind === 'music' ? 'Upbeat indie pop, female vocals, bright guitars, 120 bpm' : cloudKind === 'edit' ? 'Make it golden hour and remove the people in the background' : 'A red fox in fresh snow at sunrise, soft light, close-up'}">${esc(S.data.prefs.lastPrompt || '')}</textarea>${cloudKind === 'music' ? '' : improveBtn('cs-prompt', cloudKind === 'edit' ? 'edit' : ['video', 'animate'].includes(cloudKind) ? 'video' : 'image')}</div>
      ${needsPhoto ? `<div class="field"><label for="cs-photo">Photo</label><select id="cs-photo">${pics.length ? pics.map((g) => `<option value="${g.id}">${esc((g.prompt || g.title || 'Photo').slice(0, 60))}</option>`).join('') : '<option value="">Upload or create a photo first</option>'}</select></div>` : ''}
      ${cloudKind === 'music' ? `<div class="notice info small" style="margin:0">Every option here makes a <b>full composition</b>: a whole song with an intro, verses, a chorus, a bridge and an ending, not a short clip.</div>
        <div class="field"><label for="cs-secs">Song length (ElevenLabs) <b id="cs-secs-v">${fmtSongLen(S.data.prefs.cloudSecs || 150)}</b></label><input type="range" id="cs-secs" min="60" max="300" step="15" value="${S.data.prefs.cloudSecs || 150}"></div>
        <div class="field"><label for="cs-lyrics">Lyrics <span class="muted small">(leave empty and Quicksilver writes a full set: verses, chorus, bridge)</span></label><textarea id="cs-lyrics" rows="5" placeholder="[Verse 1] …&#10;[Chorus] …"></textarea><button type="button" class="btn small ghost" id="cs-write-lyrics">✍️ Write lyrics</button></div>
        <label class="row small" style="gap:6px"><input type="checkbox" id="cs-instrumental" ${S.data.prefs.cloudInstrumental ? 'checked' : ''}> Instrumental (no vocals, ElevenLabs)</label>` : ''}
      <button class="btn primary" id="cs-go" ${p ? '' : 'disabled title="Connect fal.ai first"'}>☁️ Create in the cloud</button>
      <p class="small muted">Prompts${needsPhoto ? ' and the photo' : ''} are sent to fal.ai and the model's maker. Results are saved in your Gallery.</p>
    </div><div class="stack-v">${jobs.map(([id]) => jobBox(id)).join('')}${resultsHTML('any') || '<div class="canvas-wrap"><div class="empty">Your cloud creations will appear here.</div></div>'}</div></div>`;
}

function bindCloudStudio() {
  $('#cs-connect')?.addEventListener('click', () => { modelsTab = 'api'; go({ view: 'models' }); toast('Add "fal.ai (photo, video & music)" with your fal key.', 6000); });
  $$('[data-cs-kind]').forEach((b) => b.addEventListener('click', () => { cloudKind = b.dataset.csKind; render(); }));
  $$('input[name="cs-model"]').forEach((r) => r.addEventListener('change', () => { S.data.prefs[`cloud_${cloudKind}`] = r.value; save(); render(); }));
  $('#cs-secs')?.addEventListener('input', (e) => { S.data.prefs.cloudSecs = Number(e.target.value); $('#cs-secs-v').textContent = fmtSongLen(Number(e.target.value)); save(); });
  $('#cs-instrumental')?.addEventListener('change', (e) => { S.data.prefs.cloudInstrumental = e.target.checked; save(); });
  $('#cs-write-lyrics')?.addEventListener('click', async (e) => {
    const idea = $('#cs-prompt').value.trim();
    if (!idea) { toast('Describe the song first.'); return; }
    e.target.disabled = true; e.target.textContent = '✍️ Writing…';
    const out = await writeLyrics(idea);
    if (out) $('#cs-lyrics').value = out; else toast('Install a text model to write lyrics, or type your own.');
    e.target.disabled = false; e.target.textContent = '✍️ Write lyrics';
  });
  $('#cs-go')?.addEventListener('click', async () => {
    const p = falProvider();
    const prompt = $('#cs-prompt').value.trim();
    if (!p) { toast('Connect fal.ai first.'); return; }
    if (!prompt) { toast('Describe what you want first.'); return; }
    const model = document.querySelector('input[name="cs-model"]:checked')?.value;
    const imageId = $('#cs-photo')?.value;
    if ((cloudKind === 'edit' || cloudKind === 'animate') && !imageId) { toast('Pick a photo first.'); return; }
    S.data.prefs.lastPrompt = prompt; save();
    const jobId = uid();
    mediaJobs[jobId] = { status: 'Sending to fal.ai…', progress: 0.05, label: 'Cloud', start: Date.now() };
    // A full song needs full lyrics: written here when you left them empty (unless it's instrumental).
    let lyrics = $('#cs-lyrics')?.value.trim() || '';
    const instrumental = cloudKind === 'music' && S.data.prefs.cloudInstrumental && /elevenlabs/.test(model);
    if (cloudKind === 'music' && !lyrics && !instrumental) { mediaJobs[jobId].status = 'Writing the lyrics (verses, chorus, bridge)…'; render(); lyrics = (await writeLyrics(prompt)) || ''; }
    render();
    try {
      await qs.call('media:cloud', jobId, p.id, cloudKind, model, { prompt: instrumental ? `${prompt}\nInstrumental, no vocals.` : prompt, imageId: imageId || undefined, seconds: S.data.prefs.cloudSecs || 150, lyrics: instrumental ? undefined : lyrics || undefined });
    } catch (err) { mediaJobs[jobId].error = err.message; mediaJobs[jobId].done = true; render(); }
  });
}
