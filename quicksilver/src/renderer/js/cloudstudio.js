// Gallery & tools → Cloud: hosted photo, video and music models, rated out of 10 with their prices, next to
// what this PC makes on its own. Pollinations is free with no key; fal.ai (Nano Banana, Veo, Kling,
// full-song music), Replicate and Stability AI use the key saved under Models → Connect an API.
'use strict';

let cloudKind = 'image';
let cloudModels = null; // { service: { name, free, noKey, models: { kind: [[id, name, rating, price, best]] } } }
const CLOUD_KINDS = { image: ['🖼️', 'Photo'], edit: ['🪄', 'Edit a photo'], video: ['🎬', 'Video'], animate: ['📸', 'Photo to video'], music: ['🎵', 'Full songs'] };
const LYRICS_SYS = 'Write complete, original song lyrics for the user\'s idea: [Intro], two [Verse] sections, a [Chorus] that repeats, a [Bridge] and an [Outro], each section labeled in square brackets. Natural, singable lines that rhyme where it sounds good. Reply with the lyrics only.';
// The connection for a service ('pollinations' needs none), or null if it isn't connected yet.
const serviceConn = (svc) => (svc === 'pollinations' ? { id: 'pollinations', name: 'Pollinations' } : (S.providers || []).find((p) => p.preset === svc && p.hasKey) || null);
// Every model for this kind across services: free ones first, then the best rated.
function cloudOptions(kind) {
  return Object.entries(cloudModels || {}).flatMap(([svc, d]) => (d.models[kind] || []).map(([id, name, rating, price, best]) => ({ key: `${svc}|${id}`, svc, svcName: d.name, free: Boolean(d.free), id, name, rating, price, best, conn: serviceConn(svc) })))
    .sort((a, b) => Boolean(b.conn) - Boolean(a.conn) || b.rating - a.rating);
}
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
  const list = cloudOptions(cloudKind);
  const saved = S.data.prefs[`cloud_${cloudKind}`];
  const pick = (list.find((o) => o.key === saved && o.conn) || list.find((o) => o.conn) || list[0])?.key;
  const chosen = list.find((o) => o.key === pick);
  const p = chosen?.conn;
  const missing = [...new Set(list.filter((o) => !o.conn).map((o) => o.svc))];
  const loc = localBest(cloudKind);
  const pics = gallery.filter((g) => g.kind === 'image').slice(0, 40);
  const needsPhoto = cloudKind === 'edit' || cloudKind === 'animate';
  const jobs = Object.entries(mediaJobs).filter(([, j]) => j.label === 'Cloud' && !j.done);
  return `<div class="notice info" style="margin-bottom:12px"><b>☁️ Photos, video and music from the cloud.</b> <b>Free:</b> Pollinations makes pictures with no key or account. <b>With a key:</b> fal.ai reaches Google's Nano Banana and Veo 3.1, Kling 3 and full-song music (ElevenLabs, MiniMax, Mureka); Replicate ($5 free credits) and Stability AI (25 free credits a month) add more picture models. Your PC's own models stay free. ${missing.length ? missing.map((m) => `<button class="btn small" data-cs-connect="${m}">Connect ${esc(cloudModels[m].name)}</button>`).join(' ') : ''}</div>
    <div class="tabs cc-kinds">${Object.entries(CLOUD_KINDS).map(([k, [ic, l]]) => `<button class="tab ${cloudKind === k ? 'active' : ''}" data-cs-kind="${k}">${ic} ${l}</button>`).join('')}</div>
    <div class="cs-models">${list.map((o) => `<label class="cs-model ${o.key === pick ? 'now' : ''} ${o.conn ? '' : 'off'}"><input type="radio" name="cs-model" value="${esc(o.key)}" ${o.key === pick ? 'checked' : ''} ${o.conn ? '' : 'disabled'}><span class="grow"><b>${esc(o.name)}</b> ${o.free ? '<span class="badge b-mint">Free</span>' : ''}<span class="small muted">${esc(o.best)} · ${esc(o.price)}${o.conn ? '' : ` · <a href="#" data-cs-connect="${o.svc}">connect ${esc(o.svcName)}</a>`}</span></span>${tenStarsHTML(o.rating)}</label>`).join('')}
      ${cloudModels.replicate && cloudKind !== 'edit' ? `<div class="cs-model ${serviceConn('replicate') ? '' : 'off'}"><span class="grow"><b>Any Replicate model</b><span class="small muted">Type its name (owner/name) from replicate.com, for example a video or music model</span></span><input id="cs-rep" placeholder="owner/name" style="max-width:220px" value="${esc(S.data.prefs[`cloud_rep_${cloudKind}`] || '')}" ${serviceConn('replicate') ? '' : 'disabled'}></div>` : ''}
      <div class="cs-model local"><span class="grow"><b>💻 On this PC</b><span class="small muted">${loc ? `${esc(loc.who)} · free, private` : 'No model for this yet (see the other tabs here)'}</span></span>${loc ? tenStarsHTML(Math.round(loc.v * 2) / 2) : '<span class="muted small">–</span>'}</div></div>
    <div class="grid2" style="margin-top:12px;align-items:start"><div class="stack-v">
      <div class="field"><label for="cs-prompt">${cloudKind === 'music' ? 'Describe the song (style, mood, instruments, tempo)' : cloudKind === 'edit' ? 'What to change' : 'Describe it'}</label><textarea id="cs-prompt" rows="4" placeholder="${cloudKind === 'music' ? 'Upbeat indie pop, female vocals, bright guitars, 120 bpm' : cloudKind === 'edit' ? 'Make it golden hour and remove the people in the background' : 'A red fox in fresh snow at sunrise, soft light, close-up'}">${esc(S.data.prefs.lastPrompt || '')}</textarea>${cloudKind === 'music' ? '' : improveBtn('cs-prompt', cloudKind === 'edit' ? 'edit' : ['video', 'animate'].includes(cloudKind) ? 'video' : 'image')}</div>
      ${needsPhoto ? `<div class="field"><label for="cs-photo">Photo</label><select id="cs-photo">${pics.length ? pics.map((g) => `<option value="${g.id}">${esc((g.prompt || g.title || 'Photo').slice(0, 60))}</option>`).join('') : '<option value="">Upload or create a photo first</option>'}</select></div>` : ''}
      ${cloudKind === 'music' ? `<div class="notice info small" style="margin:0">Every option here makes a <b>full composition</b>: a whole song with an intro, verses, a chorus, a bridge and an ending, not a short clip.</div>
        <div class="field"><label for="cs-secs">Song length (ElevenLabs) <b id="cs-secs-v">${fmtSongLen(S.data.prefs.cloudSecs || 150)}</b></label><input type="range" id="cs-secs" min="60" max="300" step="15" value="${S.data.prefs.cloudSecs || 150}"></div>
        <div class="field"><label for="cs-lyrics">Lyrics <span class="muted small">(leave empty and Quicksilver writes a full set: verses, chorus, bridge)</span></label><textarea id="cs-lyrics" rows="5" placeholder="[Verse 1] …&#10;[Chorus] …"></textarea><button type="button" class="btn small ghost" id="cs-write-lyrics">✍️ Write lyrics</button></div>
        <label class="row small" style="gap:6px"><input type="checkbox" id="cs-instrumental" ${S.data.prefs.cloudInstrumental ? 'checked' : ''}> Instrumental (no vocals, ElevenLabs)</label>` : ''}
      <button class="btn primary" id="cs-go" ${p ? '' : `disabled title="Connect ${esc(chosen?.svcName || 'a service')} first"`}>☁️ Create in the cloud${chosen?.free ? ' (free)' : ''}</button>
      <p class="small muted">Prompts${needsPhoto ? ' and the photo' : ''} are sent to ${esc(chosen?.svcName || 'the service')} and the model's maker. Results are saved in your Gallery.</p>
    </div><div class="stack-v">${jobs.map(([id]) => jobBox(id)).join('')}${resultsHTML('any') || '<div class="canvas-wrap"><div class="empty">Your cloud creations will appear here.</div></div>'}</div></div>`;
}

function bindCloudStudio() {
  $$('[data-cs-connect]').forEach((b) => b.addEventListener('click', (e) => { e.preventDefault(); const n = cloudModels[b.dataset.csConnect]?.name || b.dataset.csConnect; modelsTab = 'api'; go({ view: 'models' }); toast(`Add "${n}" with your key.`, 6000); }));
  $('#cs-rep')?.addEventListener('change', (e) => { S.data.prefs[`cloud_rep_${cloudKind}`] = e.target.value.trim(); save(); });
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
    const key = document.querySelector('input[name="cs-model"]:checked')?.value || '';
    let [svc, model] = key.split('|');
    const rep = $('#cs-rep')?.value.trim();
    if (rep && serviceConn('replicate')) { svc = 'replicate'; model = rep; }
    const p = serviceConn(svc);
    const prompt = $('#cs-prompt').value.trim();
    if (!p) { toast(`Connect ${cloudModels[svc]?.name || 'the service'} first.`); return; }
    if (!prompt) { toast('Describe what you want first.'); return; }
    const imageId = $('#cs-photo')?.value;
    if ((cloudKind === 'edit' || cloudKind === 'animate') && !imageId) { toast('Pick a photo first.'); return; }
    S.data.prefs.lastPrompt = prompt; save();
    const jobId = uid();
    mediaJobs[jobId] = { status: `Sending to ${p.name}…`, progress: 0.05, label: 'Cloud', start: Date.now() };
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
