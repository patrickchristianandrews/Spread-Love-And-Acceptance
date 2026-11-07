// Skills that make things: pictures, videos, photo edits and apps, right in the chat.
// The text model writes the prompt (or the app); the Create's image and video models then make
// the picture or clip, and it appears under the answer with buttons to save, edit or redo it.
'use strict';

const MEDIA_OUTPUTS = new Set(['image', 'video', 'edit', 'animate']);
const MEDIA_WORD = { image: 'picture', video: 'video', edit: 'edited photo', animate: 'video' };
const MEDIA_NEED = {
  image: ['image', 'To make pictures here, get an image model (SDXL Turbo is quick on most PCs), or connect an image API under Models → Connect an API.'],
  video: ['video', 'To make videos here, get a video model.'],
  edit: ['edit', 'To edit photos by describing the change, get a photo-editing model (FLUX.1 Kontext or Qwen Image Edit), or any image model for lighter changes.'],
  animate: ['video', 'To bring photos to life, get Wan 2.2 5B (it animates photos).'],
};

// The extra instructions a media skill adds: the model replies with a short note and a JSON block.
const MEDIA_RULES = {
  image: 'Reply with ONE short sentence saying what you will create, then a ```image code block containing only JSON: {"prompt": "a detailed image prompt under 70 words: subject, composition, setting, lighting, colours, style", "avoid": "things to leave out", "shape": "square|portrait|landscape|wide|tall", "count": 1}. Quicksilver turns it into the picture, so do not say you cannot make images.',
  video: 'Reply with ONE short sentence saying what you will create, then a ```video code block containing only JSON: {"prompt": "one continuous shot under 60 words: subject, the motion, camera movement, lighting, style", "shape": "wide|tall|square"}. Quicksilver turns it into the video, so do not say you cannot make videos.',
  edit: 'Reply with ONE short sentence saying what you will change, then an ```edit code block containing only JSON: {"instruction": "the edit as a short command, e.g. Replace the sky with a sunset", "prompt": "a full description of how the finished photo should look"}. Quicksilver edits the attached photo, so do not say you cannot edit images.',
  animate: 'Reply with ONE short sentence saying how the photo will move, then a ```video code block containing only JSON: {"prompt": "the photo\'s scene, plus the natural motion and camera movement, under 60 words"}. Quicksilver animates the attached photo, so do not say you cannot.',
  app: 'Write the complete app as ONE self-contained HTML file in a single ```html code block: inline CSS and JavaScript, no external files, links, fonts or CDNs, so it works offline. Make it look polished. After the block, add two short lines on how to use it.',
};

// Pull the JSON out of the answer (forgiving about small mistakes).
function parseMediaSpec(text) {
  const m = String(text || '').match(/```(?:image|video|edit|json)?\s*\n?([\s\S]*?)```/);
  const raw = (m ? m[1] : String(text || '').match(/\{[\s\S]*\}/)?.[0] || '').trim();
  if (!raw) return null;
  try { return JSON.parse(raw); } catch {}
  const field = (k) => raw.match(new RegExp(`"${k}"\\s*:\\s*"((?:[^"\\\\]|\\\\.)*)"`))?.[1]?.replace(/\\"/g, '"');
  const out = { prompt: field('prompt'), instruction: field('instruction'), avoid: field('avoid'), shape: field('shape') };
  return out.prompt || out.instruction ? out : null;
}
// What to show in the bubble: the note, without the JSON block (also while it streams in).
const stripMediaBlock = (text) => String(text || '').replace(/```(?:image|video|edit|beat)[\s\S]*?(```|$)/g, '').trim();

// The best installed model for the job (your Create choice first, then the highest quality).
function pickMediaModel(kind) {
  const specOf = (m) => S.catalog.media.find((c) => c.id === m.catalogId) || {};
  const q = (m) => specOf(m).quality || 0;
  let list = [];
  if (kind === 'image') list = S.installed.filter((m) => m.kind === 'image' && specOf(m).edit !== 'instruct');
  if (kind === 'edit') list = [...S.installed.filter((m) => m.kind === 'image' && specOf(m).edit === 'instruct').sort((a, b) => q(b) - q(a)), ...S.installed.filter((m) => m.kind === 'image' && specOf(m).edit === 'img2img').sort((a, b) => q(b) - q(a))];
  if (kind === 'video') list = S.installed.filter((m) => m.kind === 'video');
  if (kind === 'animate') list = S.installed.filter((m) => m.kind === 'video' && specOf(m).animate);
  if (kind !== 'edit') list.sort((a, b) => (`local:${b.id}` === S.data.prefs[kind === 'image' ? 'imageModel' : 'videoModel']) - (`local:${a.id}` === S.data.prefs[kind === 'image' ? 'imageModel' : 'videoModel']) || q(b) - q(a));
  if (list.length) return { value: `local:${list[0].id}`, inst: list[0], spec: specOf(list[0]) };
  if (kind === 'image' || kind === 'edit') {
    const api = mediaModelOptions(['image']).find((o) => o.value.startsWith('api:'));
    if (api) return { value: api.value, api: true, label: api.label };
  }
  return null;
}

// Runs after the text model has answered.
async function runSkillMedia(chat, msg, alt, skill) {
  const kind = skill.output;
  const user = [...chat.messages.slice(0, chat.messages.indexOf(msg))].reverse().find((m) => m.role === 'user');
  const spec = parseMediaSpec(alt.text) || {};
  const prompt = String(spec.prompt || spec.instruction || user?.text || skill.name).trim().slice(0, 1200);
  alt.text = stripMediaBlock(alt.text) || `Making your ${MEDIA_WORD[kind]}…`;
  alt.media = { kind, prompt, instruction: spec.instruction || '', avoid: spec.avoid || '', shape: SIZES[spec.shape] ? spec.shape : skill.media?.shape || 'square', items: [], jobs: [] };
  const repaint = () => { save(); if (S.route.view === 'chat' && S.route.id === chat.id) paintStreaming(chat, msg); };
  const pick = pickMediaModel(kind);
  if (!pick) { alt.media.need = kind; repaint(); return; }
  alt.media.model = pick.api ? pick.label : pick.inst.name;
  let imageId;
  if (kind === 'edit' || kind === 'animate') {
    const att = (user?.attachments || []).find((x) => x.type === 'image' && x.dataUrl);
    if (!att) { alt.media.error = 'Attach a photo to your message (📎), then send it again.'; repaint(); return; }
    imageId = (await call('media:saveDataUrl', att.dataUrl, { title: att.name || 'Photo' })).id;
  }
  await makeMedia(chat, msg, alt, pick, { imageId, count: Math.min(4, Math.max(1, Number(spec.count) || skill.media?.count || 1)) }, repaint);
  // GIF maker: the clip becomes a looping GIF (the video stays one click away under Trim & edit).
  if (skill.media?.gif) { alt.media.gif = true; await gifify(alt.media, repaint, 0); }
}
async function gifify(md, repaint, from) {
  if (!md.items.slice(from).some((x) => x.kind === 'video')) return;
  md.status = 'Turning it into a GIF…'; repaint();
  try {
    md.items = [...md.items.slice(0, from), ...(await Promise.all(md.items.slice(from).map((x) => (x.kind === 'video' ? toGif(x) : x))))];
  } catch (err) { md.error = `Couldn't make the GIF: ${err.message}`; }
  delete md.status;
  await refreshGallery().catch(() => {});
  repaint();
}

// A video as a looping GIF: 12 frames a second, 480 px wide, up to 6 seconds, shared palette.
async function toGif(it) {
  const g = await call('media:editVideo', it.id, { format: 'gif', end: 6 }, uid());
  return { id: g.id, url: g.url, kind: 'image', gif: true, video: it.id };
}

async function makeMedia(chat, msg, alt, pick, { imageId, count = 1 }, repaint) {
  const md = alt.media;
  const kind = md.kind;
  // An instruction-editing model takes the short command; the others redraw from the full description.
  const text = kind === 'edit' && pick.spec?.edit === 'instruct' ? (md.instruction || md.prompt) : md.prompt;
  try {
    if (pick.api) {
      const [, pid, ...rest] = pick.value.split(':');
      const size = md.shape === 'square' ? '1024x1024' : ['portrait', 'tall'].includes(md.shape) ? '1024x1536' : '1536x1024';
      for (let i = 0; i < count; i++) {
        md.status = `Creating with ${pick.label}…`; repaint();
        const item = await call('media:apiImage', pid, rest.join(':'), { prompt: text, size, imageId });
        md.items.push({ id: item.id, url: item.url, kind: 'image' });
      }
      delete md.status;
    } else {
      const [width, height] = sizeFor(pick.spec, md.shape);
      for (let i = 0; i < count; i++) {
        const jobId = uid();
        const item = await new Promise((resolve) => {
          mediaJobs[jobId] = { status: 'Starting…', progress: 0, label: kind === 'image' || kind === 'edit' ? 'Creating' : 'Animating', resolve, sec: mediaEta(pick.value), start: Date.now() };
          md.jobs.push(jobId); repaint();
          qs.call('media:generate', jobId, { modelId: pick.inst.id, mode: kind === 'edit' ? 'edit' : kind === 'animate' ? 'animate' : 'generate', prompt: text, negative: md.avoid, width, height, imageId, seed: '' })
            .catch((err) => { mediaJobs[jobId].error = err.message; resolve(null); });
        });
        md.jobs = md.jobs.filter((x) => x !== jobId);
        if (item) md.items.push({ id: item.id, url: item.url, kind: item.kind || (pick.inst.kind === 'video' ? 'video' : 'image') });
        else { md.error = mediaJobs[jobId]?.error || 'Stopped.'; break; }
      }
    }
  } catch (err) { md.error = err.message; delete md.status; }
  await refreshGallery().catch(() => {});
  repaint();
}

function skillMediaHTML(m, alt, streaming) {
  const md = alt.media;
  if (!md || streaming) return '';
  const word = md.gif ? 'GIF' : MEDIA_WORD[md.kind];
  if (md.need) {
    const [cat, text] = MEDIA_NEED[md.need];
    return `<div class="notice info media-need"><b>One more thing:</b> ${esc(text)}<div class="row" style="margin-top:8px"><button class="btn primary small" data-act="m-get" data-cat="${cat}" data-id="${m.id}">Get a model</button><button class="btn small" data-act="m-copy" data-id="${m.id}">Copy the prompt</button></div></div>`;
  }
  const items = md.items.map((it, k) => `<figure class="skill-media-item ${it.kind === 'audio' ? 'audio' : ''}">${it.kind === 'audio' ? `<audio src="${esc(it.url)}" controls preload="metadata"></audio>` : it.kind === 'video' ? `<video src="${esc(it.url)}" controls loop playsinline></video>` : `<img src="${esc(it.url)}" alt="${esc(md.prompt.slice(0, 120))}" data-act="m-open" data-k="${k}" data-id="${m.id}">`}
    <figcaption class="row"><button class="tool" data-act="m-save" data-k="${k}" data-id="${m.id}">${icon('download', 14)} Save</button>${it.kind === 'image' && !it.gif ? `<button class="tool" data-act="m-edit" data-k="${k}" data-id="${m.id}">🪄 Edit</button>` : it.kind === 'video' ? `<button class="tool" data-act="m-vedit" data-k="${k}" data-id="${m.id}">✂️ Trim & edit</button><button class="tool" data-act="m-gif" data-k="${k}" data-id="${m.id}" title="Save this clip as a looping GIF">🌀 GIF</button>` : ''}${it.gif && it.video ? `<button class="tool" data-act="m-vedit" data-k="${k}" data-id="${m.id}" title="Trim, crop or change the speed, then save as GIF again">✂️ Trim & edit</button>` : ''}</figcaption></figure>`).join('');
  return `<div class="skill-media">
    ${md.jobs.map((id) => jobBox(id)).join('')}
    ${md.status ? `<div class="progress-box"><span class="jt">${esc(md.status)}</span></div>` : ''}
    ${md.error ? `<div class="notice">${esc(md.error)}</div>` : ''}
    ${items ? `<div class="skill-media-grid">${items}</div>` : ''}
    <div class="row small">${md.model ? `<span class="muted">Made with ${esc(md.model)}</span>` : ''}${!md.jobs.length && !md.status && MEDIA_OUTPUTS.has(md.kind) ? `<button class="tool" data-act="m-again" data-id="${m.id}">${icon('refresh', 14)} Make another ${word}</button>` : ''}${md.prompt && MEDIA_OUTPUTS.has(md.kind) ? '' : '<span class="grow"></span>'}<details class="grow" ${md.prompt && MEDIA_OUTPUTS.has(md.kind) ? '' : 'hidden'}><summary class="small muted" style="cursor:pointer">Prompt used</summary><p class="small" style="margin:6px 0">${esc(md.instruction ? `${md.instruction} · ${md.prompt}` : md.prompt)}</p></details></div>
  </div>`;
}

async function skillMediaAction(chat, m, act, el) {
  const alt = m.alts[m.altIndex];
  const md = alt.media;
  const it = md?.items[Number(el?.dataset.k)];
  if (act === 'm-get') { modelsTab = 'media'; go({ view: 'models' }); return; }
  if (act === 'm-copy') { navigator.clipboard?.writeText(md.prompt); toast('Prompt copied.'); return; }
  if (act === 'm-save' && it) { if (await call('media:export', it.id)) toast('Saved.'); return; }
  if (act === 'm-open' && it) { openModal(`<img src="${esc(it.url)}" alt="" style="width:100%;border-radius:12px"><div class="modal-actions"><button class="btn" data-close>Close</button></div>`, { wide: true }); return; }
  if (act === 'm-edit' && it) { await refreshGallery(); await loadEditor(it.id); studioTab = 'edit'; go({ view: 'studio' }); return; }
  if (act === 'm-vedit' && it) { vid = { id: it.video || it.id }; studioTab = 'vedit'; go({ view: 'studio' }); return; }
  if (act === 'm-gif' && it) {
    toast('Making a GIF…');
    try { md.items.push(await toGif(it)); await refreshGallery().catch(() => {}); save(); paintStreaming(chat, m); toast('GIF ready: it\'s in the chat and in Create.'); } catch (err) { toast(`Couldn't make the GIF: ${err.message}`, 6000); }
    return;
  }
  if (act === 'm-again') {
    const pick = pickMediaModel(md.kind);
    if (!pick) { md.need = md.kind; save(); render(); return; }
    delete md.error;
    const repaint = () => { save(); if (S.route.view === 'chat' && S.route.id === chat.id) paintStreaming(chat, m); };
    let imageId;
    if (md.kind === 'edit' || md.kind === 'animate') {
      const user = [...chat.messages.slice(0, chat.messages.indexOf(m))].reverse().find((x) => x.role === 'user');
      const att = (user?.attachments || []).find((x) => x.type === 'image' && x.dataUrl);
      if (att) imageId = (await call('media:saveDataUrl', att.dataUrl, { title: att.name || 'Photo' })).id;
    }
    const before = md.items.length;
    await makeMedia(chat, m, alt, pick, { imageId, count: 1 }, repaint);
    if (md.gif) await gifify(md, repaint, before);
  }
}

// ---------- apps: open the page in its own safe window, or save it ----------

const appHtmlOf = (text) => String(text || '').match(/```html\s*\n([\s\S]*?)```/i)?.[1] || null;
function appButtonsHTML(m, alt, streaming) {
  const s = alt.skillId && skillById(alt.skillId);
  if (!s || s.output !== 'app' || streaming || !appHtmlOf(alt.text)) return '';
  return `<div class="row"><button class="btn primary" data-act="app-open" data-id="${m.id}">▶ Open the app</button><button class="btn" data-act="app-save" data-id="${m.id}">${icon('download', 15)} Save as .html</button><span class="small muted">Opens in its own window, cut off from your files.</span></div>`;
}
async function appAction(chat, m, act) {
  const html = appHtmlOf(msgText(m));
  if (!html) return;
  const title = (html.match(/<title>([^<]*)<\/title>/i)?.[1] || answerTitle(chat, m)).trim().slice(0, 60) || 'App';
  if (act === 'app-open') await call('app:preview', html, title);
  if (act === 'app-save' && await call('file:saveText', `${title.replace(/[\\/:*?"<>|]/g, '')}.html`, html)) toast('Saved.');
}

// ---------- tools on attached files, reading aloud, podcasts and beats ----------

// Run at once on what you attach, without a text model: ffmpeg tools and reading text aloud.
const DIRECT_OUTPUTS = new Set(['tool', 'speech']);
// The text model writes first, then Quicksilver makes something from the answer.
const AFTER_OUTPUTS = new Set([...MEDIA_OUTPUTS, 'beat', 'podcast', 'narrate']);
// Answers whose JSON block is hidden in the chat (only the note shows).
const HIDE_BLOCK = new Set([...MEDIA_OUTPUTS, 'beat']);
Object.assign(MEDIA_WORD, { beat: 'beat', podcast: 'podcast', narrate: 'recording', speech: 'recording', tool: 'result' });
Object.assign(MEDIA_RULES, {
  podcast: 'Write the episode as a natural conversation between two hosts, ALEX and SAM. Every line must start with the speaker\'s name in capitals and a colon, e.g. "ALEX: …". No headings, stage directions, sound effects or markdown. Quicksilver turns it into audio with a different voice for each host.',
  narrate: 'Write the text exactly as it should be read aloud: plain sentences and paragraphs, no headings, lists, tables, links or markdown. Quicksilver reads it aloud and saves the recording.',
  beat: 'Reply with ONE short sentence describing the track, then a ```beat code block containing only JSON like {"bpm": 90, "bars": 8, "style": "lofi|trap|house|pop|rock|ambient", "chords": ["Am", "F", "C", "G"], "drums": {"kick": "x.....x...x.....", "snare": "....x.......x...", "hat": "x.x.x.x.x.x.x.x.", "clap": ""}, "bass": "x..x..x.x..x..x.", "melody": "E5 . . G5 . . A5 . C6 . A5 . G5 . E5 ."}. Drum and bass patterns have 16 steps (x = hit, . = rest) and repeat every bar; chords change once per bar and repeat; the melody is 16 notes or dots per bar (up to 4 bars), and repeats. Quicksilver plays and saves it, so do not say you cannot make music.',
});

const parseBeat = (text) => { const m = String(text || '').match(/```(?:beat|json)?\s*\n?([\s\S]*?)```/); try { return JSON.parse(m ? m[1] : String(text).match(/\{[\s\S]*\}/)?.[0]); } catch { return null; } };

// Follows one job (Create engine, ffmpeg tool or speech) until it finishes.
function trackJob(md, label, sec, start, repaint) {
  const jobId = uid();
  return new Promise((resolve) => {
    mediaJobs[jobId] = { status: 'Starting…', progress: 0, label, resolve, sec, start: Date.now() };
    md.jobs.push(jobId); repaint();
    start(jobId).catch((err) => { mediaJobs[jobId].error = err.message; resolve(null); });
  }).then((item) => {
    md.jobs = md.jobs.filter((x) => x !== jobId);
    if (item) md.items.push({ id: item.id, url: item.url, kind: item.kind });
    else md.error = mediaJobs[jobId]?.error || 'Stopped.';
    return item;
  });
}

function pickAttachment(user, accepts) {
  const atts = user?.attachments || [];
  const ok = { video: ['video'], audio: ['audio', 'video'], image: ['image'] }[accepts] || [accepts];
  return atts.find((x) => ok.includes(x.type));
}

async function runDirectSkill(chat, msg, alt, skill, user) {
  pending = null;
  delete alt.status; alt.eta = null;
  const t = skill.tool || {};
  const md = alt.media = { kind: skill.output, prompt: '', items: [], jobs: [], model: skill.output === 'speech' ? 'Windows voices, offline' : 'built-in tools, on this PC' };
  const repaint = () => { save(); if (S.route.view === 'chat' && S.route.id === chat.id) paintStreaming(chat, msg); };
  if (skill.output === 'speech') {
    const text = [user?.text || '', ...(user?.attachments || []).filter((x) => x.type === 'doc').map((d) => d.text)].join('\n\n').trim();
    if (!text) { alt.text = 'Type or paste the text to read aloud, or attach a document, then send it again.'; repaint(); render(); return; }
    const words = text.split(/\s+/).length;
    alt.text = `${skill.icon} Reading ${words.toLocaleString()} words aloud with Windows' built-in voice. About ${fmtSec(words / 2.6)} of audio.`;
    render();
    await trackJob(md, 'Reading aloud', Math.max(3, words / 40), (id) => qs.call('tools:speak', id, text, { title: (user?.attachments?.find((x) => x.type === 'doc')?.name || text.slice(0, 50)), voice: S.data.prefs.voice || undefined, rate: Number(S.data.prefs.voiceRate) || 0 }), repaint);
  } else {
    const att = pickAttachment(user, t.accepts);
    const what = { video: 'video', audio: 'audio or video file', image: 'photo' }[t.accepts] || 'file';
    if (!att) { alt.text = `${skill.icon} Attach a ${what} with 📎 (or drag it in), then send it again.`; repaint(); render(); return; }
    const src = att.path ? { path: att.path } : att.dataUrl ? { dataUrl: att.dataUrl } : null;
    if (!src) { alt.text = `${skill.icon} Quicksilver couldn't find the original file for ${att.name}. Drag the file in from a folder instead of pasting it.`; repaint(); render(); return; }
    alt.text = `${skill.icon} **${skill.name}**: working on ${att.name} on this PC.`;
    render();
    await trackJob(md, skill.name, null, (id) => qs.call('tools:run', id, t.kind, t.op, src), repaint);
  }
  if (!md.error) alt.text += ' Done.';
  await refreshGallery().catch(() => {});
  repaint();
}

// After the text model: podcasts and narration are read aloud; beats are played by the synth.
async function runAfterText(chat, msg, alt, skill) {
  const kind = skill.output;
  const md = alt.media = { kind, prompt: '', items: [], jobs: [] };
  const repaint = () => { save(); if (S.route.view === 'chat' && S.route.id === chat.id) paintStreaming(chat, msg); };
  if (kind === 'beat') {
    const spec = parseBeat(alt.text);
    alt.text = stripMediaBlock(alt.text) || 'Here is your track.';
    if (!spec) { md.error = 'The model did not write a playable pattern. Press Regenerate to try again.'; repaint(); return; }
    md.prompt = JSON.stringify(spec); md.model = 'Quicksilver synth, on this PC'; md.status = 'Playing it into a file…'; repaint();
    try {
      const wav = await renderBeat(spec);
      const item = await call('tools:saveWav', wav, { title: `${spec.style || 'Beat'} · ${spec.bpm || 90} bpm · ${(spec.chords || []).join(' ')}`.slice(0, 80) });
      md.items.push({ id: item.id, url: item.url, kind: 'audio' });
    } catch (err) { md.error = err.message; }
    delete md.status;
  } else {
    md.model = 'Windows voices, offline';
    const text = alt.text.replace(/```[\s\S]*?```/g, '');
    await trackJob(md, kind === 'podcast' ? 'Recording the podcast' : 'Reading aloud', Math.max(5, text.split(/\s+/).length / 40),
      (id) => qs.call('tools:speak', id, text, { title: answerTitle(chat, msg) || skill.name, voice: S.data.prefs.voice || undefined, rate: Number(S.data.prefs.voiceRate) || 0 }), repaint);
  }
  await refreshGallery().catch(() => {});
  repaint();
}

// ---------- the beat synth (Web Audio, rendered offline into a WAV) ----------

const NOTE_INDEX = { C: 0, D: 2, E: 4, F: 5, G: 7, A: 9, B: 11 };
function noteFreq(n) {
  const m = String(n).match(/^([A-Ga-g])([#b]?)(-?\d)$/);
  if (!m) return null;
  const midi = 12 * (Number(m[3]) + 1) + NOTE_INDEX[m[1].toUpperCase()] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  return 440 * 2 ** ((midi - 69) / 12);
}
function chordNotes(name, octave = 3) {
  const m = String(name).match(/^([A-G])([#b]?)(m(?!aj)|min)?(maj7|7|dim|sus2|sus4|add9)?/);
  if (!m) return [];
  const root = 12 * (octave + 1) + NOTE_INDEX[m[1]] + (m[2] === '#' ? 1 : m[2] === 'b' ? -1 : 0);
  let iv = m[3] ? [0, 3, 7] : [0, 4, 7];
  if (m[4] === 'dim') iv = [0, 3, 6];
  if (m[4] === 'sus2') iv = [0, 2, 7];
  if (m[4] === 'sus4') iv = [0, 5, 7];
  if (m[4] === '7') iv = [...iv, 10];
  if (m[4] === 'maj7') iv = [...iv, 11];
  if (m[4] === 'add9') iv = [...iv, 14];
  return iv.map((i) => 440 * 2 ** ((root + i - 69) / 12));
}
const steps16 = (p) => String(p || '').replace(/\s/g, '').padEnd(16, '.').slice(0, 16).split('').map((c) => /[xX1o*]/.test(c));

async function renderBeat(spec) {
  const bpm = Math.min(180, Math.max(60, Number(spec.bpm) || 90));
  const bars = Math.min(16, Math.max(1, Number(spec.bars) || 8));
  const step = 60 / bpm / 4;
  const sr = 44100;
  const dur = bars * 16 * step + 1.5;
  const ctx = new OfflineAudioContext(2, Math.ceil(sr * dur), sr);
  const style = String(spec.style || '').toLowerCase();
  const master = ctx.createDynamicsCompressor();
  master.threshold.value = -14; master.ratio.value = 3;
  const tone = ctx.createBiquadFilter();
  tone.type = 'lowpass'; tone.frequency.value = style.includes('lofi') ? 4200 : 18000;
  master.connect(tone).connect(ctx.destination);
  const noise = ctx.createBuffer(1, sr, sr);
  { const d = noise.getChannelData(0); for (let i = 0; i < d.length; i++) d[i] = Math.random() * 2 - 1; }
  const env = (g, t, peak, decay, attack = 0.003) => { g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + attack); g.gain.exponentialRampToValueAtTime(0.0001, t + attack + decay); };
  const noiseHit = (t, type, freq, peak, decay) => { const s = ctx.createBufferSource(); s.buffer = noise; const f = ctx.createBiquadFilter(); f.type = type; f.frequency.value = freq; const g = ctx.createGain(); env(g, t, peak, decay); s.connect(f).connect(g).connect(master); s.start(t); s.stop(t + decay + 0.05); };
  const kick = (t) => { const o = ctx.createOscillator(); const g = ctx.createGain(); o.frequency.setValueAtTime(style.includes('trap') ? 120 : 150, t); o.frequency.exponentialRampToValueAtTime(42, t + 0.12); env(g, t, 1, style.includes('trap') ? 0.6 : 0.35); o.connect(g).connect(master); o.start(t); o.stop(t + 0.7); };
  const snare = (t) => { noiseHit(t, 'bandpass', 1800, 0.55, 0.18); const o = ctx.createOscillator(); o.type = 'triangle'; o.frequency.value = 190; const g = ctx.createGain(); env(g, t, 0.35, 0.08); o.connect(g).connect(master); o.start(t); o.stop(t + 0.15); };
  const clap = (t) => { for (const d of [0, 0.012, 0.024]) noiseHit(t + d, 'bandpass', 1200, 0.4, 0.1); };
  const hat = (t) => noiseHit(t, 'highpass', 7500, 0.18, 0.045);
  const synth = (t, f, len, type, peak, cutoff) => { const o = ctx.createOscillator(); o.type = type; o.frequency.value = f; const flt = ctx.createBiquadFilter(); flt.type = 'lowpass'; flt.frequency.value = cutoff; const g = ctx.createGain(); g.gain.setValueAtTime(0.0001, t); g.gain.exponentialRampToValueAtTime(peak, t + 0.02); g.gain.setValueAtTime(peak, t + Math.max(0.03, len - 0.05)); g.gain.exponentialRampToValueAtTime(0.0001, t + len + 0.15); o.connect(flt).connect(g).connect(master); o.start(t); o.stop(t + len + 0.2); };
  const d = spec.drums || {};
  const K = steps16(d.kick), Sn = steps16(d.snare), C = steps16(d.clap), H = steps16(d.hat), B = steps16(spec.bass);
  const chords = (spec.chords || []).length ? spec.chords : ['C', 'G', 'Am', 'F'];
  const mel = String(spec.melody || '').trim().split(/\s+/).filter(Boolean);
  const melBars = Math.max(1, Math.ceil(mel.length / 16));
  const padType = style.includes('rock') ? 'sawtooth' : 'triangle';
  for (let bar = 0; bar < bars; bar++) {
    const t0 = bar * 16 * step;
    const ch = chordNotes(chords[bar % chords.length]);
    for (const f of ch) synth(t0, f, 16 * step - 0.05, padType, 0.05, style.includes('lofi') ? 1500 : 3000);
    for (let s = 0; s < 16; s++) {
      const t = t0 + s * step + (style.includes('lofi') && s % 2 ? step * 0.12 : 0);
      if (K[s]) kick(t);
      if (Sn[s]) snare(t);
      if (C[s]) clap(t);
      if (H[s]) hat(t);
      if (B[s] && ch[0]) synth(t, ch[0] / 4, step * 1.8, 'sawtooth', 0.22, 500);
      const n = mel[((bar % melBars) * 16 + s) % Math.max(1, mel.length)];
      const f = n && n !== '.' && noteFreq(n);
      if (f) { let len = 1; while (mel[((bar % melBars) * 16 + s + len) % mel.length] === '.' && len < 4) len++; synth(t, f, step * len * 0.9, style.includes('house') ? 'sawtooth' : 'square', 0.07, 2600); }
    }
  }
  return wavDataUrl(await ctx.startRendering());
}

function wavDataUrl(buf) {
  const ch = buf.numberOfChannels, len = buf.length, sr = buf.sampleRate;
  const out = new DataView(new ArrayBuffer(44 + len * ch * 2));
  const w = (o, s) => { for (let i = 0; i < s.length; i++) out.setUint8(o + i, s.charCodeAt(i)); };
  w(0, 'RIFF'); out.setUint32(4, 36 + len * ch * 2, true); w(8, 'WAVE'); w(12, 'fmt '); out.setUint32(16, 16, true); out.setUint16(20, 1, true); out.setUint16(22, ch, true);
  out.setUint32(24, sr, true); out.setUint32(28, sr * ch * 2, true); out.setUint16(32, ch * 2, true); out.setUint16(34, 16, true); w(36, 'data'); out.setUint32(40, len * ch * 2, true);
  const data = Array.from({ length: ch }, (_, c) => buf.getChannelData(c));
  for (let i = 0, o = 44; i < len; i++) for (let c = 0; c < ch; c++, o += 2) out.setInt16(o, Math.max(-1, Math.min(1, data[c][i])) * 0x7fff, true);
  const bytes = new Uint8Array(out.buffer);
  let bin = '';
  for (let i = 0; i < bytes.length; i += 0x8000) bin += String.fromCharCode.apply(null, bytes.subarray(i, i + 0x8000));
  return `data:audio/wav;base64,${btoa(bin)}`;
}
