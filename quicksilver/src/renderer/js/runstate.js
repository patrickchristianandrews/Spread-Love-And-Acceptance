// The live status light at the top right of a chat: how the model or team in use is running right
// now (Fast, Medium, Slow, Busy PC, Low memory, Unstable, Loading…), from the real writing speed
// while it answers, this PC's load and any engine trouble. Updates every second while it works.
'use strict';

const runLive = { words: [], started: 0, firstAt: 0, troubleUntil: 0, trouble: '', status: '' };
let runLoad = null;      // { cpu, memFreeGB, memTotalGB, engines }
let runOpen = false;

qs.onChat(({ ev }) => {
  if (!pending) return;
  const t = Date.now();
  if (!runLive.started || runLive.req !== pending.requestId) Object.assign(runLive, { req: pending.requestId, started: t, firstAt: 0, words: [], status: '', steps: {} });
  // Teams write their drafts as steps: count those words too.
  if (ev.type === 'step' && ev.step) {
    const n = (String(ev.step.text || '').match(/\S+/g) || []).length;
    const prev = runLive.steps[ev.step.index] || 0;
    if (n > prev) { if (!runLive.firstAt) runLive.firstAt = t; runLive.words.push([t, n - prev]); runLive.steps[ev.step.index] = n; }
  }
  if (ev.type === 'text' || ev.type === 'reasoning') {
    if (!runLive.firstAt) runLive.firstAt = t;
    runLive.words.push([t, Math.max(1, (ev.text.match(/\S+/g) || []).length)]);
  }
  if (ev.type === 'status') {
    runLive.status = ev.text || '';
    if (/switching|failed|crash|restart|not enough|out of memory|fallback|too big/i.test(ev.text || '')) { runLive.trouble = ev.text; runLive.troubleUntil = t + 90000; }
  }
  if (ev.type === 'error') { runLive.trouble = ev.message; runLive.troubleUntil = t + 90000; }
});

// Words per second over the last few seconds.
function liveRate() {
  const now = Date.now();
  const recent = runLive.words.filter(([t]) => now - t < 4000);
  runLive.words = runLive.words.filter(([t]) => now - t < 10000);
  if (recent.length < 2) return null;
  const span = Math.max(1, (now - recent[0][0]) / 1000);
  return recent.reduce((n, [, w]) => n + w, 0) / span;
}

function runState() {
  const chat = S.route.view === 'chat' && chatById(S.route.id);
  if (!chat) return null;
  const a = assistantById(chat.assistantId);
  const target = resolveTarget(chat, a);
  if (!target) return { level: 'off', label: 'No model', detail: 'Choose a model or team to start.' };
  const info = S.speed?.targets?.[target];
  const expected = info?.wps || null;
  const cloud = target.startsWith('api:') || info?.local === false;
  const L = runLoad || {};
  const memPct = L.memTotalGB ? L.memFreeGB / L.memTotalGB : 1;
  const working = pending && pending.chatId === chat.id;
  const now = Date.now();
  if (S.config?.offline && cloud) return { level: 'bad', label: 'Offline', detail: 'This is a cloud model and Offline mode is on.' };
  if (now < runLive.troubleUntil) return { level: 'bad', label: 'Unstable', detail: `The engine ran into trouble: ${runLive.trouble}` };
  if (working) {
    const rate = liveRate();
    const waited = (now - runLive.started) / 1000;
    if (!runLive.firstAt) {
      if (/load/i.test(runLive.status) || (waited > 6 && !runLive.status)) return { level: 'wait', label: 'Loading…', detail: runLive.status || 'Loading the model into memory. The first answer after a while takes longer.', pulse: true };
      return { level: 'wait', label: runLive.status ? 'Working…' : 'Starting…', detail: runLive.status || 'Getting ready to answer.', pulse: true };
    }
    if (rate == null) return { level: 'wait', label: 'Thinking…', detail: runLive.status || 'Working on the next part.', pulse: true };
    const ratio = expected ? rate / expected : 1;
    const strain = L.cpu > 92 || memPct < 0.06;
    const level = strain && ratio < 0.6 ? 'warn' : ratio >= 0.8 ? 'good' : ratio >= 0.45 ? 'mid' : 'slow';
    const label = strain && ratio < 0.6 ? (memPct < 0.06 ? 'Low memory' : 'Busy PC') : { good: 'Fast', mid: 'Medium', slow: 'Slow' }[level];
    return { level, label, value: `${Math.round(rate)} words/s`, pulse: true, rate, expected,
      detail: `${expected ? `${Math.round(ratio * 100)}% of its usual speed on this PC (usually ~${Math.round(expected)} words/s).` : ''}${strain ? ' This PC is under heavy load right now; closing other apps will speed it up.' : ''}` };
  }
  // Idle: what to expect, adjusted for how busy this PC is right now.
  if (cloud) return { level: 'good', label: 'Cloud', value: 'ready', detail: 'Runs on the provider\'s servers; speed depends on your internet connection.' };
  if (memPct < 0.06) return { level: 'warn', label: 'Low memory', detail: `Only ${L.memFreeGB.toFixed(1)} GB of memory is free. Answers may be slow or fail; close some apps.` };
  if (L.cpu > 90) return { level: 'warn', label: 'Busy PC', detail: `The processor is ${Math.round(L.cpu)}% busy with other work, so answers will be slower than usual.` };
  if (!expected) return { level: 'mid', label: 'Ready', detail: 'Speed will show once it starts answering.' };
  const level = expected >= 15 ? 'good' : expected >= 6 ? 'mid' : 'slow';
  return { level, label: `Ready · ${{ good: 'fast', mid: 'medium', slow: 'slow' }[level]}`, value: `~${Math.round(expected)} words/s`, expected,
    detail: `${info?.measured ? 'Measured' : 'Estimated'} speed on this PC. It changes with what else the PC is doing.` };
}

function paintRunState() {
  const el = document.getElementById('run-state');
  if (!el) return;
  const st = runState();
  if (!st) { el.hidden = true; return; }
  el.hidden = false;
  el.className = `run-state rs-${st.level}${st.pulse ? ' live' : ''}${!st.pulse && st.level !== 'warn' ? ' calm' : ''}`;
  el.innerHTML = `<span class="rs-dot"></span><b>${esc(st.label)}</b>${st.value ? `<span class="rs-val">${esc(st.value)}</span>` : ''}`;
  el.title = st.detail || '';
  if (runOpen) paintRunPanel(st);
}

function paintRunPanel(st) {
  let p = document.getElementById('run-panel');
  if (!p) { p = document.createElement('div'); p.id = 'run-panel'; p.className = 'run-panel'; document.body.appendChild(p); }
  const chat = chatById(S.route.id);
  const a = chat && assistantById(chat.assistantId);
  const target = chat && resolveTarget(chat, a);
  const L = runLoad || {};
  const st2 = target?.startsWith('stack:') && S.stacks.find((x) => `stack:${x.id}` === target);
  const members = st2 ? [st2.members.vision, ...(st2.members.drafters || []), st2.members.judge].filter((x, i, arr) => x && arr.indexOf(x) === i) : target ? [target] : [];
  const loaded = new Set((L.engines || []).filter((e) => e.ready).map((e) => e.file));
  const fileOf = (t) => S.installed.find((m) => `local:${m.id}` === t)?.files?.model;
  const bar = (v, max, bad) => `<span class="rs-bar"><i style="width:${Math.max(3, Math.min(100, (v / max) * 100))}%;${bad ? 'background:var(--danger)' : ''}"></i></span>`;
  p.innerHTML = `<div class="row"><b class="grow">${esc(st.label)}${st.value ? ` · ${esc(st.value)}` : ''}</b><button class="tool" id="run-close">✕</button></div>
    <p class="small" style="margin:4px 0 10px">${esc(st.detail || '')}</p>
    ${st.rate && st.expected ? `<div class="rs-line"><span>Speed now</span>${bar(st.rate, st.expected * 1.25, st.rate < st.expected * 0.45)}<b>${Math.round(st.rate)} / ~${Math.round(st.expected)} words/s</b></div>` : ''}
    ${L.cpu != null ? `<div class="rs-line"><span>Processor</span>${bar(L.cpu, 100, L.cpu > 90)}<b>${Math.round(L.cpu)}% busy</b></div>` : ''}
    ${L.memTotalGB ? `<div class="rs-line"><span>Memory</span>${bar(L.memTotalGB - L.memFreeGB, L.memTotalGB, L.memFreeGB / L.memTotalGB < 0.06)}<b>${L.memFreeGB.toFixed(1)} GB free</b></div>` : ''}
    <div class="label" style="margin:10px 0 4px">In use</div>
    ${members.map((t) => `<div class="rs-model"><span class="rs-dot ${t.startsWith('api:') ? 'cloud' : loaded.has(fileOf(t)) ? 'on' : ''}"></span>${esc(targetLabel(t))}<span class="small muted">${t.startsWith('api:') ? 'cloud' : loaded.has(fileOf(t)) ? 'loaded, ready' : 'loads when needed'}</span>${!t.startsWith('api:') && loaded.has(fileOf(t)) ? `<button class="btn small ghost rs-stop" data-stop-model="${esc(fileOf(t))}" title="Stop this model and free its memory; it loads again when needed">Stop</button>` : ''}</div>`).join('') || '<p class="small muted">Nothing yet.</p>'}
    ${loaded.size ? `<div class="row" style="margin-top:10px"><button class="btn small" data-stop-model="" title="Stop every running model and free the memory">⏹ Stop all models (${loaded.size}) and free memory</button></div>` : ''}`;
  const anchor = document.getElementById('run-state')?.getBoundingClientRect();
  if (anchor) { p.style.top = `${anchor.bottom + 8}px`; p.style.right = `${Math.max(8, window.innerWidth - anchor.right)}px`; }
  p.querySelector('#run-close').onclick = () => { runOpen = false; p.remove(); };
}

document.addEventListener('click', (e) => {
  if (e.target.closest('#run-state')) { runOpen = !runOpen; if (!runOpen) document.getElementById('run-panel')?.remove(); paintRunState(); return; }
  if (runOpen && !e.target.closest('#run-panel')) { runOpen = false; document.getElementById('run-panel')?.remove(); }
});

// Every second: the light; every 2 seconds: this PC's load.
setInterval(paintRunState, 1000);
setInterval(async () => {
  if (S.route?.view !== 'chat' || document.hidden) return;
  try { runLoad = await qs.call('system:load'); } catch {}
}, 2000);
