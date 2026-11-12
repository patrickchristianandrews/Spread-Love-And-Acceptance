// Voice: talk instead of typing (speech to text on this PC), and listen to answers.
//  - Click the mic (or Ctrl+Space), speak, and it stops by itself when you pause.
//  - Hands-free mode sends what you said and reads the answer back.
'use strict';

let voiceRec = null;   // { chatId, stop() }
let speakingId = null; // message being read aloud

// ---------- listening to answers ----------
function speechText(md) {
  return String(md || '')
    .replace(/<think>[\s\S]*?<\/think>/g, '')
    .replace(/```[\s\S]*?```/g, ' (code shown on screen) ')
    .replace(/^\s*\|.*\|\s*$/gm, '')
    .replace(/!\[[^\]]*\]\([^)]*\)/g, '')
    .replace(/\[([^\]]+)\]\([^)]*\)/g, '$1')
    .replace(/\[\d+\]/g, '')
    .replace(/[#>*_~`=]+/g, '')
    .replace(/^\s*[-+]\s+/gm, '')
    .replace(/\n{2,}/g, '.\n')
    .replace(/\s+/g, ' ')
    .trim();
}
function pickVoice() {
  const all = window.speechSynthesis?.getVoices() || [];
  const want = S.data.prefs.voiceName;
  return all.find((v) => v.name === want) || all.find((v) => /natural|neural|online/i.test(v.name) && v.lang.startsWith((navigator.language || 'en').slice(0, 2))) || all.find((v) => v.default) || all[0] || null;
}
function speak(text, { onEnd, id } = {}) {
  const synth = window.speechSynthesis;
  if (!synth) { toast('Reading aloud isn\'t available on this PC.'); return; }
  synth.cancel();
  // Sentence by sentence: long single utterances get cut off on some systems.
  const parts = speechText(text).match(/[^.!?]+[.!?]+["')\]]*|\S[^.!?]*$/g) || [];
  const voice = pickVoice();
  speakingId = id || null;
  parts.forEach((p, i) => {
    const u = new SpeechSynthesisUtterance(p.trim());
    if (voice) u.voice = voice;
    u.rate = Number(S.data.prefs.voiceRate) || 1;
    if (i === parts.length - 1) u.onend = () => { if (speakingId === (id || null)) { speakingId = null; onEnd?.(); repaintSpeak(); } };
    synth.speak(u);
  });
  repaintSpeak();
}
function stopSpeaking() { window.speechSynthesis?.cancel(); speakingId = null; repaintSpeak(); }
function speakMessage(m) {
  if (speakingId === m.id) { stopSpeaking(); return; }
  speak(msgText(m), { id: m.id });
}
function repaintSpeak() {
  $$('[data-act="speak"]').forEach((b) => { b.title = speakingId === b.dataset.id ? 'Stop reading' : 'Listen'; b.classList.toggle('on', speakingId === b.dataset.id); });
}
window.speechSynthesis?.addEventListener?.('voiceschanged', () => {});

// ---------- talking instead of typing ----------
let voiceStarting = false; // between the click and the microphone opening: a second click is ignored
async function toggleVoice(chat) {
  if (voiceRec) { voiceRec.stop(); return; }
  if (voiceStarting) return;
  voiceStarting = true;
  try {
    let st;
    try { st = await qs.call('voice:status'); } catch (err) { toast(err.message); return; }
    if (!st.ready) { voiceSetup(st, () => toggleVoice(chatById(chat.id) || chat)); return; }
    await startListening(chat);
  } finally { voiceStarting = false; }
}

function voiceSetup(st, then) {
  if (S.config?.offline) { toast('Voice typing needs a one-time download of its speech model. Go online (in the sidebar) to get it; after that it works offline.', 7000); return; }
  if (!st.canInstall) { toast('Voice typing isn\'t available on this system yet.', 6000); return; }
  const b = openModal(`<h2>${icon('mic', 22)} Talk instead of typing</h2>
    <p>Quicksilver turns your speech into text <b>on this PC</b> with Whisper, so nothing you say leaves the computer. It needs a one-time download of about <b>${st.downloadMB} MB</b>; after that it works offline too.</p>
    <p class="small muted">It understands about 100 languages and works out which one you're speaking.</p>
    <div id="vs-prog" hidden><div class="bar"><i id="vs-bar" style="width:0%"></i></div><div class="small muted" id="vs-txt">Starting…</div></div>
    <div class="modal-actions"><button class="btn" data-close>Not now</button><button class="btn primary" id="vs-go">Download and turn on</button></div>`);
  b.querySelector('#vs-go').onclick = async () => {
    b.querySelector('#vs-go').disabled = true;
    b.querySelector('#vs-prog').hidden = false;
    try {
      await qs.call('voice:setup');
      closeModal();
      toast('Voice typing is ready. Click the mic and speak; it stops when you pause.', 6000);
      then?.();
    } catch (err) { toast(err.message, 8000); b.querySelector('#vs-go').disabled = false; }
  };
}
qs.onApp?.((d) => {
  if (d.kind !== 'voice:progress') return;
  const bar = $('#vs-bar');
  if (bar && d.total) { bar.style.width = `${Math.round((d.downloaded / d.total) * 100)}%`; $('#vs-txt').textContent = `${d.part === 'engine' ? 'Speech engine' : 'Speech model'}: ${gb(d.downloaded)} of ${gb(d.total)}`; }
});

async function startListening(chat) {
  let stream;
  try { stream = await navigator.mediaDevices.getUserMedia({ audio: { echoCancellation: true, noiseSuppression: true, channelCount: 1 } }); }
  catch { toast('No microphone found, or Windows blocked it. Check Settings → Privacy → Microphone.', 7000); return; }
  stopSpeaking();
  const mime = ['audio/webm;codecs=opus', 'audio/webm', 'audio/ogg'].find((t) => window.MediaRecorder?.isTypeSupported(t)) || '';
  const rec = new MediaRecorder(stream, mime ? { mimeType: mime } : undefined);
  const chunks = [];
  rec.ondataavailable = (e) => { if (e.data.size) chunks.push(e.data); };
  // Stops on its own after a pause (once you've started talking), or after two minutes.
  const ac = new AudioContext();
  const an = ac.createAnalyser();
  an.fftSize = 1024;
  ac.createMediaStreamSource(stream).connect(an);
  const buf = new Float32Array(an.fftSize);
  let heard = false; let quietSince = 0; const started = Date.now();
  const tick = setInterval(() => {
    an.getFloatTimeDomainData(buf);
    const rms = Math.sqrt(buf.reduce((n, v) => n + v * v, 0) / buf.length);
    const btn = $('#mic-btn');
    if (btn) btn.style.setProperty('--lvl', String(Math.min(1, rms * 12)));
    if (rms > 0.02) { heard = true; quietSince = 0; } else if (heard && !quietSince) quietSince = Date.now();
    if (S.data.prefs.voiceAutoStop !== false && heard && quietSince && Date.now() - quietSince > 1800) finish();
    if (Date.now() - started > 120000) finish();
  }, 100);
  let done = false;
  function finish() {
    if (done) return;
    done = true;
    clearInterval(tick);
    if (rec.state !== 'inactive') rec.stop();
  }
  rec.onstop = async () => {
    stream.getTracks().forEach((t) => t.stop());
    ac.close().catch(() => {});
    voiceRec = null;
    paintMic('busy');
    try {
      const blob = new Blob(chunks, { type: rec.mimeType || 'audio/webm' });
      if (blob.size < 2000 || !heard) { paintMic(''); toast('I didn\'t hear anything. Check the microphone and try again.'); return; }
      const text = await qs.call('voice:transcribe', new Uint8Array(await blob.arrayBuffer()), { ext: /ogg/.test(blob.type) ? 'ogg' : 'webm' });
      paintMic('');
      if (!text) { toast('I couldn\'t make out any words. Try again a little closer to the mic.'); return; }
      insertSpoken(chat, text);
    } catch (err) { paintMic(''); toast(err.message, 7000); }
  };
  rec.start(250);
  voiceRec = { chatId: chat.id, stop: finish };
  paintMic('rec');
}

function paintMic(state) {
  const b = $('#mic-btn');
  if (!b) return;
  b.classList.toggle('rec', state === 'rec');
  b.classList.toggle('busy', state === 'busy');
  b.title = state === 'rec' ? 'Listening… click to finish (or just pause)' : state === 'busy' ? 'Writing down what you said…' : 'Voice typing: click and speak (Ctrl+Space)';
  const input = $('#input');
  if (input && !input.dataset.ph) input.dataset.ph = input.placeholder;
  if (input) input.placeholder = state === 'rec' ? 'Listening… pause when you\'re done' : state === 'busy' ? 'Writing down what you said…' : input.dataset.ph || input.placeholder;
}

let voiceSentFrom = null; // chat id whose next answer is read aloud (hands-free)
function insertSpoken(chat, text) {
  const live = S.route.view === 'chat' && S.route.id === chat.id;
  const input = live && $('#input');
  const cur = input ? input.value : chat.draft || '';
  const next = `${cur}${cur && !/\s$/.test(cur) ? ' ' : ''}${text}`;
  chat.draft = next; save();
  if (input) { input.value = next; input.dispatchEvent(new Event('input')); input.focus(); }
  if (S.data.prefs.voiceHandsFree && live) { voiceSentFrom = chat.id; $('#send')?.click(); }
}
qs.onChat(({ ev }) => {
  // An answer that was stopped or failed is not read aloud, now or after the next one.
  if (voiceSentFrom && (ev.type === 'error' || (ev.type === 'done' && ev.aborted))) { voiceSentFrom = null; return; }
  if (ev.type !== 'done' || !voiceSentFrom || ev.aborted) return;
  const chat = chatById(voiceSentFrom);
  setTimeout(() => {
    if (pending || !chat) return;
    voiceSentFrom = null;
    const m = [...chat.messages].reverse().find((x) => x.role === 'assistant');
    if (m && msgText(m)) speak(msgText(m), { id: m.id });
  }, 250);
});

document.addEventListener('keydown', (e) => {
  if (e.ctrlKey && e.code === 'Space' && S.route.view === 'chat' && $('#modal').hidden) {
    e.preventDefault();
    const chat = chatById(S.route.id);
    if (chat) toggleVoice(chat);
  }
  if (e.key === 'Escape' && speakingId) stopSpeaking();
});

// Settings → Voice.
function voiceSetHTML() {
  const p = S.data.prefs;
  const voices = window.speechSynthesis?.getVoices() || [];
  return `<div class="stack-v">
    <div class="card"><h3>${icon('mic', 18)} Voice typing</h3><p class="small muted" style="margin:6px 0 10px">Click the mic in any chat (or press Ctrl+Space) and speak. Speech is turned into text on this PC with Whisper.</p>
      <div id="vt-status" class="small">Checking…</div>
      <label class="row" style="margin-top:10px"><input type="checkbox" id="v-auto" ${p.voiceAutoStop !== false ? 'checked' : ''}> <span><b>Stop listening when I pause</b> <span class="help">otherwise click the mic again to finish</span></span></label>
      <label class="row"><input type="checkbox" id="v-hands" ${p.voiceHandsFree ? 'checked' : ''}> <span><b>Hands-free conversation</b> <span class="help">sends what you said straight away and reads the answer back</span></span></label></div>
    <div class="card"><h3>${icon('volume', 18)} Reading aloud</h3><p class="small muted" style="margin:6px 0 10px">Press Listen under any answer. Uses the voices installed in Windows; the "Natural" ones sound best (Windows Settings → Time & language → Speech).</p>
      <div class="grid2"><div class="field"><label for="v-voice">Voice</label><select id="v-voice"><option value="">Automatic</option>${voices.map((v) => `<option ${v.name === p.voiceName ? 'selected' : ''}>${esc(v.name)}</option>`).join('')}</select></div>
      <div class="field"><label for="v-rate">Speed: <span id="v-rate-v">${Number(p.voiceRate || 1).toFixed(2)}×</span></label><input id="v-rate" type="range" min="0.6" max="1.8" step="0.05" value="${p.voiceRate || 1}"></div></div>
      <button class="btn small" id="v-test">${icon('volume', 15)} Try it</button></div>
  </div>`;
}
function bindVoiceSet() {
  const p = S.data.prefs;
  const paint = async () => {
    const st = await qs.call('voice:status').catch(() => null);
    const el = $('#vt-status');
    if (!el) return;
    el.innerHTML = st?.ready ? '<span class="badge b-mint">Ready</span> Works offline.' : st?.canInstall ? `<span class="badge b-lemon">Not set up</span> One-time download of about ${st.downloadMB} MB. <button class="btn small primary" id="vt-setup">Set up</button>` : '<span class="badge">Not available on this system yet</span>';
    $('#vt-setup')?.addEventListener('click', () => voiceSetup(st, () => render()));
  };
  paint();
  $('#v-auto').onchange = (e) => { p.voiceAutoStop = e.target.checked; save(); };
  $('#v-hands').onchange = (e) => { p.voiceHandsFree = e.target.checked; save(); };
  $('#v-voice').onchange = (e) => { p.voiceName = e.target.value; save(); };
  $('#v-rate').oninput = (e) => { p.voiceRate = Number(e.target.value); $('#v-rate-v').textContent = `${p.voiceRate.toFixed(2)}×`; save(); };
  $('#v-test').onclick = () => speak(`Hi${p.userName ? ` ${p.userName}` : ''}. This is how I'll read your answers.`);
}
