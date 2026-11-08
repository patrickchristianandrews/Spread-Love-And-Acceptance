// Low on memory: offer the next best model. Before a model loads, if this PC doesn't have the
// memory free for it, a note offers a lighter model that does fit; if loading fails for lack of
// memory, the error has a button to answer again with the next best model.
'use strict';

const LOW_MEM = /not enough memory|out of memory|failed to allocate|ErrorOutOfDeviceMemory|cudaMalloc/i;

const instOf = (t) => S.installed.find((m) => `local:${m.id}` === t);
const sizeGBOf = (inst) => (inst?.size || 0) / 1e9;
const scoreOf = (inst) => S.catalog?.text?.find((c) => c.id === inst?.catalogId)?.jobs?.general ?? 4;
// The models a target loads (a team loads its members one after another).
const loadsOf = (t) => (t?.startsWith('stack:') ? membersOf(t) : [t]).map(instOf).filter(Boolean);

// The strongest installed model that is clearly lighter than what didn't fit.
function nextBestTarget(target, freeGB = Infinity) {
  const failed = loadsOf(target);
  const biggest = Math.max(0, ...failed.map(sizeGBOf));
  const skip = new Set(failed.map((m) => m.id));
  const list = S.installed.filter((m) => m.kind === 'text' && !skip.has(m.id) && sizeGBOf(m) > 0 && sizeGBOf(m) < (biggest || Infinity) * 0.8 && sizeGBOf(m) * 1.15 < freeGB)
    .sort((a, b) => scoreOf(b) - scoreOf(a) || sizeGBOf(b) - sizeGBOf(a));
  const m = list[0] || (Number.isFinite(freeGB) ? null : S.installed.find((x) => x.source === 'bundled' && !skip.has(x.id)));
  return m ? `local:${m.id}` : null;
}

function lowMemHTML(m, alt) {
  if (!alt.error || !LOW_MEM.test(alt.error) || !alt.target) return '';
  const next = nextBestTarget(alt.target);
  if (!next) return '<div class="lowmem small">Close other apps to free memory, or download a smaller model under Models.</div>';
  return `<div class="lowmem"><span class="small">This PC is low on memory for ${esc(targetLabel(alt.target))}.</span>
    <button class="btn small primary" data-lowmem="${esc(m.id)}" data-next="${esc(next)}">Use the next best model: ${esc(targetLabel(next))}</button>
    <button class="btn small ghost" data-lowmem="${esc(m.id)}" data-next="${esc(next)}" data-keep="1" title="This chat keeps using it">Use it for this chat</button></div>`;
}

function answerAgainWith(chat, msgId, next, keep) {
  const msg = chat.messages.find((x) => x.id === msgId);
  if (!msg) return;
  if (keep) { chat.target = next; save(); }
  const go = () => generate(chat, msg, next);
  if (!pending) { go(); return; }
  qs.abortChat(pending.requestId);
  const t0 = Date.now();
  const wait = setInterval(() => { if (!pending || Date.now() - t0 > 6000) { clearInterval(wait); go(); } }, 100);
}

document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-lowmem]');
  if (!b) return;
  const chat = chatById(S.route.id);
  if (chat) answerAgainWith(chat, b.dataset.lowmem, b.dataset.next, Boolean(b.dataset.keep));
});

// Stop a running model (or all), from the status panel or the Models page.
document.addEventListener('click', async (e) => {
  const b = e.target.closest('[data-stop-model]');
  if (!b) return;
  const file = b.dataset.stopModel;
  const fileOf = (t) => S.installed.find((m) => `local:${m.id}` === t)?.files?.model;
  // An answer being written by that model is stopped first.
  if (pending) {
    const c = chatById(pending.chatId);
    const msg = c?.messages.find((x) => x.id === pending.msgId);
    const t = msg?.alts[msg.altIndex]?.target;
    if (!file || loadsOf(t).some((m) => m.files?.model === file) || fileOf(t) === file) qs.abortChat(pending.requestId);
  }
  await qs.call('models:stop', file || null).catch(() => {});
  const name = file ? S.installed.find((m) => m.files?.model === file)?.name || 'The model' : 'All models';
  toast(`${name} stopped and the memory freed. ${file ? 'It loads' : 'They load'} again when needed.`, 5000);
  try { runLoad = await qs.call('system:load'); } catch {}
  await refreshModels();
  if (S.route.view === 'models') render();
  if (typeof paintRunState === 'function') paintRunState();
});

// Before an answer: is there memory free for the model it needs? Never blocks the answer.
async function lowMemPreflight(chat, msg, target) {
  try {
    const need = loadsOf(target);
    if (!need.length) return;
    const r = await qs.call('system:load');
    const running = r.engines || [];
    const notLoaded = need.filter((m) => !running.some((x) => x.file === m.files?.model));
    if (!notLoaded.length) return;
    // What could be used: free memory, the graphics card's free memory, and memory held by idle
    // models (Quicksilver unloads those to make room).
    const idle = running.filter((x) => !need.some((m) => m.files?.model === x.file)).reduce((t, x) => t + (x.sizeGB || 0), 0);
    const free = (r.memFreeGB || 0) + (S.est?.hardware?.vramFreeGB || 0) + idle;
    const want = Math.max(...notLoaded.map(sizeGBOf)) * 1.15 + 0.5;
    if (free >= want) return;
    const next = nextBestTarget(target, free);
    if (!next) return;
    toastAction(`Low on memory: ${targetLabel(target)} needs about ${want.toFixed(1)} GB and about ${free.toFixed(1)} GB is free, so it may be slow or fail.`, `Use ${targetLabel(next)}`, () => answerAgainWith(chat, msg.id, next, false), 12000);
  } catch { /* the check is only a hint */ }
}
