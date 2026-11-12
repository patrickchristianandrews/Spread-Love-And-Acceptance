// 🔮 On this PC: a plain forecast of how a team of models (a stack or custom AI you are building)
// or one model you are about to add will behave on this computer, with everything counted: the
// graphics card and memory, where each model would run, whether they fit together, what is
// loaded right now, how long the first and later answers take, what happens to pictures and
// video while it is loaded, and the disk space a download needs.
// Everything here is an estimate from this PC's measured speed and each model's size; it is
// worded as one ("about"), and the same numbers are used everywhere else in the app.
'use strict';

// The same allowances the catalogue's estimates use (shared/catalog.js: usableVram, usableRam).
const fcRoom = (hw) => ({ vram: hw?.vramGB ? Math.max(0, (hw.vramFreeGB || hw.vramGB) * 0.92 - 0.4) : 0, ram: hw ? Math.max(0, hw.ramGB * 0.8 - 2) : 0 });
const fcGB = (n) => `${n >= 10 ? Math.round(n) : Math.round(n * 10) / 10} GB`;
// Loading a model from disk into memory before its first answer (an SSD reads about 1 GB a second).
const fcLoadSec = (sizeGB) => Math.round(3 + sizeGB * 1.1);
const FC_WHERE = {
  gpu: 'on the graphics card (the fast way)', split: 'partly on the graphics card, the rest in ordinary memory (slower)',
  cpu: 'in ordinary memory, on the processor', no: 'does not fit in this PC\'s memory', cloud: 'in the cloud (needs the internet)',
};

// One member: a model on this PC ("local:…"), a catalogue model not installed yet (its id), or a cloud AI ("api:…").
function fcMember(t, hw) {
  const s = String(t);
  if (s.startsWith('api:')) return { t: s, name: targetLabel(s), kind: 'text', cloud: true, fit: 'cloud', needGB: 0, sizeGB: 0, wps: S.speed?.targets?.[s]?.wps || 40, installed: true };
  const inst = s.startsWith('local:') ? S.installed.find((m) => `local:${m.id}` === s) : S.installed.find((m) => m.catalogId === s);
  const cat = catModel(inst?.catalogId || s);
  if (!inst && !cat) return null;
  const kind = inst?.kind || (cat && S.catalog.media.some((m) => m.id === cat.id) ? cat.kind || 'image' : 'text');
  const sizeGB = inst?.size ? inst.size / 1e9 : (cat?.sizeGB || 0) + (cat?.mmprojGB || 0);
  const est = kind === 'text' ? S.est?.text?.[cat?.id] : S.est?.media?.[cat?.id];
  const room = fcRoom(hw);
  // A model Quicksilver has no catalogue entry for: worked out from its size alone.
  const needGB = kind === 'text' ? (est?.need ?? sizeGB + 0.8) : (cat?.vramGB || sizeGB + 2);
  // Where it runs: the catalogue's own rules, worked out from the same memory figures the rest of
  // the forecast uses, so the lines never disagree with each other.
  const fit = kind === 'text' ? (room.vram && needGB <= room.vram ? 'gpu' : room.vram && needGB <= room.vram + room.ram ? 'split' : needGB <= room.ram ? 'cpu' : 'no')
    : (room.vram && needGB <= room.vram + 0.5 ? 'gpu' : room.vram && sizeGB <= room.vram + room.ram ? 'split' : sizeGB + 2 <= room.ram ? 'cpu' : 'no');
  const wps = kind !== 'text' ? null : inst && S.speed?.targets?.[`local:${inst.id}`]?.wps ? S.speed.targets[`local:${inst.id}`].wps : est?.wordsPerSec || null;
  return { t: s, name: inst?.name || cat?.name || s, kind, cloud: false, fit, needGB, sizeGB, wps, sec: est?.sec || null, installed: Boolean(inst), file: inst?.files?.model || null, measured: Boolean(inst && S.speed?.targets?.[`local:${inst.id}`]?.measured) };
}

// members: { drafters, judge, vision, mode } for a team, or null with targets for loose models.
// opts.adding: catalogue ids being added (shown with their download and disk space).
function pcForecast(targets, { members = null, adding = [] } = {}) {
  const hw = S.est?.hardware;
  if (!hw) return null;
  const room = fcRoom(hw);
  const list = [...new Set((targets || []).filter(Boolean))].map((t) => fcMember(t, hw)).filter(Boolean);
  if (!list.length) return null;
  const local = list.filter((m) => !m.cloud);
  const chat = local.filter((m) => m.kind === 'text');
  const clouds = list.filter((m) => m.cloud);
  const lines = [];
  let worst = 'ok';
  let hardSec = null; // a hard answer from this build on this PC
  const flag = (cls) => { if (cls === 'bad' || (cls === 'warn' && worst === 'ok')) worst = cls; };
  const reasons = [];

  // 1. This PC.
  lines.push({ icon: '🖥️', title: 'This PC', text: `${hw.gpuName ? `${hw.gpuName}${hw.vramGB ? `, ${fcGB(hw.vramGB)} of video memory` : ''}` : 'No graphics card'} · ${fcGB(hw.ramGB)} of memory${hw.cpuThreads ? ` · ${hw.cpuThreads} processor threads` : ''}. For AI that leaves about ${room.vram ? `${fcGB(room.vram)} on the card and ` : ''}${fcGB(room.ram)} of ordinary memory.` });

  // 2. Where each one runs, and how fast.
  const where = list.map((m) => {
    const speed = m.kind === 'text' ? (m.wps ? `about ${Math.max(1, Math.round(m.wps))} words a second${m.measured ? ' (measured here)' : ''}` : '') : m.sec ? `about ${fmtSec(m.sec)} a ${m.kind === 'video' ? 'clip' : 'picture'}` : '';
    if (m.fit === 'no') { flag('bad'); reasons.push(`${m.name} needs about ${fcGB(m.needGB)}, more than this PC has`); }
    else if (m.kind === 'text' && m.wps && m.wps < 4) { flag('warn'); reasons.push(`${m.name} is slow here (about ${Math.max(1, Math.round(m.wps))} words a second)`); }
    else if (m.kind !== 'text' && m.sec && m.sec > (m.kind === 'video' ? 600 : 180)) { flag('warn'); reasons.push(`${m.name} takes about ${fmtSec(m.sec)} for each ${m.kind === 'video' ? 'clip' : 'picture'} here`); }
    return `<b>${esc(m.name)}</b>${m.cloud ? '' : ` (${fcGB(m.sizeGB)})`}: ${FC_WHERE[m.fit]}${m.fit === 'no' ? `: it needs about ${fcGB(m.needGB)}` : speed ? `, ${speed}` : ''}`;
  });
  lines.push({ icon: '📍', title: list.length > 1 ? 'Where each one runs' : 'Where it runs', html: where.join('<br>') });

  // 3. All together: do the models on this PC fit at once?
  const fits = chat.filter((m) => m.fit !== 'no');
  const needAll = fits.reduce((n, m) => n + m.needGB, 0);
  let together = 0; // seconds a hard answer waits for models taking turns
  if (fits.length > 1) {
    if (room.vram && needAll <= room.vram) lines.push({ icon: '🧮', title: 'All together', text: `They all fit on the graphics card at once (${fcGB(needAll)} of ${fcGB(room.vram)}), so there is no waiting between their turns.`, cls: 'ok' });
    else if (needAll <= room.vram + room.ram) {
      lines.push({ icon: '🧮', title: 'All together', text: `They fit in this PC's memory together (${fcGB(needAll)} of ${fcGB(room.vram + room.ram)})${room.vram ? `, but not all on the graphics card (${fcGB(room.vram)}): the first one loaded gets the card, and what does not fit runs in ordinary memory, which is slower` : ''}.`, cls: room.vram ? 'warn' : 'ok' });
      if (room.vram) { flag('warn'); reasons.push('its models do not all fit on the graphics card at once'); }
    } else {
      together = fits.slice(1).reduce((n, m) => n + fcLoadSec(m.sizeGB), 0);
      lines.push({ icon: '🧮', title: 'All together', text: `They do not fit in memory at the same time (${fcGB(needAll)} needed, about ${fcGB(room.vram + room.ram)} here), so they take turns: each is loaded, answers, and makes room for the next. That adds about ${fmtSec(together)} to an answer that uses all of them.`, cls: 'warn' });
      flag('warn'); reasons.push('its models take turns in memory');
    }
  }

  // 4. Speed: the first answer (loading), then everyday and hard ones.
  if (chat.length || clouds.length) {
    const load = fits.reduce((n, m) => n + fcLoadSec(m.sizeGB), 0);
    const stats = members ? teamStats(members) : null;
    const one = list.find((m) => m.kind === 'text');
    const easy = stats ? stats.time(WORDS.chat) : one?.wps ? WORDS.chat / one.wps : null;
    const hard = stats ? stats.time(WORDS.hard, true) + together : one?.wps ? WORDS.hard / one.wps : null;
    hardSec = hard;
    const parts = [];
    if (load) parts.push(`The first answer waits about ${fmtSec(load)} more while ${fits.length > 1 ? 'the models load' : 'it loads'}; after that ${fits.length > 1 ? 'they stay' : 'it stays'} loaded while you use ${fits.length > 1 ? 'them' : 'it'}.`);
    if (easy != null) parts.push(`An everyday reply: about ${fmtSec(easy)}.`);
    if (hard != null) parts.push(`A hard question: about ${fmtSec(hard)}${stats && stats.all.length > 1 ? ' (every member answers, then the lead writes the final one)' : ''}.`);
    if (hard != null && hard > 240) { flag('warn'); reasons.push(`a hard answer takes about ${fmtSec(hard)}`); }
    if (parts.length) lines.push({ icon: '⏱️', title: 'How long answers take', text: parts.join(' ') });
  }

  // 5. With what is loaded right now.
  const mine = new Set(local.map((m) => m.file).filter(Boolean));
  const loaded = (S.running || []).filter((r) => r.ready && !mine.has(r.file));
  if (loaded.length && fits.length) {
    const names = loaded.map((r) => S.installed.find((m) => m.files?.model === r.file)?.name || 'another model');
    const held = loaded.reduce((n, r) => n + (r.vramGB || 0), 0);
    const roomLeft = room.vram ? room.vram - held : 0;
    const ok = room.vram ? needAll <= roomLeft : needAll + loaded.reduce((n, r) => n + (r.sizeGB || 0), 0) <= room.ram;
    lines.push({ icon: '🔁', title: 'With what is loaded now', text: `${names.join(' and ')} ${loaded.length > 1 ? 'are' : 'is'} loaded${held ? ` and ${loaded.length > 1 ? 'hold' : 'holds'} ${fcGB(held)} of the graphics card` : ''}. ${ok ? 'There is room for this too, so nothing has to be unloaded.' : 'There is not room for both: Quicksilver unloads what is idle first, so switching between them takes a little longer each time.'}`, cls: ok ? 'ok' : 'warn' });
  }

  // 6. Pictures and video while it is loaded.
  const pics = S.installed.filter((m) => m.kind === 'image' || m.kind === 'video').map((m) => ({ m, cat: catModel(m.catalogId), est: S.est?.media?.[m.catalogId] })).filter((x) => x.cat);
  if (pics.length && fits.length && room.vram) {
    const big = pics.sort((a, b) => (b.cat.vramGB || 0) - (a.cat.vramGB || 0))[0];
    const need = big.cat.vramGB || (big.cat.sizeGB || 0) + 2;
    const both = Math.min(needAll, room.vram) + need <= room.vram;
    lines.push({ icon: '🎨', title: 'Pictures and video', text: both ? `There is room on the graphics card for this and for ${big.m.name} at the same time.` : `Making a picture or a video needs the graphics card (${big.m.name}: about ${fcGB(need)}), so Quicksilver unloads the chat models first and loads them again afterwards: the next answer after a picture waits about ${fmtSec(fits.reduce((n, m) => n + fcLoadSec(m.sizeGB), 0))} longer.` });
  }
  const media = local.filter((m) => m.kind !== 'text' && m.fit !== 'no');
  if (media.length && !chat.length) {
    const chatLoaded = (S.running || []).filter((r) => r.ready);
    if (chatLoaded.length && room.vram) lines.push({ icon: '🔁', title: 'With what is loaded now', text: 'A chat model is loaded: Quicksilver unloads it before making a picture or a video, and loads it again when you next chat.' });
    if (!room.vram) { flag('warn'); reasons.push('with no graphics card, pictures and video are made on the processor, which takes minutes'); }
  }

  // 7. No graphics card: everything on the processor.
  if (!room.vram && chat.some((m) => m.fit === 'cpu')) lines.push({ icon: '🌡️', title: 'While it answers', text: 'With no graphics card it runs on the processor: expect the fans to spin up and other apps to slow a little while an answer is being written.' });

  // 8. Cloud members.
  if (clouds.length) lines.push({ icon: '☁️', title: 'Its cloud AI', text: `${clouds.map((m) => m.name).join(' and ')} ${clouds.length > 1 ? 'answer' : 'answers'} in the cloud: it needs the internet, those questions leave your PC, and a free plan has daily limits. It uses none of this PC's memory.` });

  // 9. Disk space for what is being added.
  const news = (adding || []).map((id) => catModel(id)).filter((c) => c && !S.installed.some((m) => m.catalogId === c.id));
  if (news.length) {
    const gbNew = news.reduce((n, c) => n + (c.sizeGB || 0) + (c.mmprojGB || 0), 0);
    const free = S.disk?.freeBytes != null ? S.disk.freeBytes / 1e9 : null;
    if (free != null && gbNew > free - 2) { flag('bad'); reasons.push(`the download (${fcGB(gbNew)}) does not fit on the disk (${fcGB(free)} free)`); }
    lines.push({ icon: '💾', title: 'Disk space', text: `The download is ${fcGB(gbNew)}.${free != null ? ` This PC has ${fcGB(free)} free, ${gbNew > free - 2 ? 'which is not enough: free some space first' : `so ${fcGB(free - gbNew)} will be left`}.` : ''}`, cls: free != null && gbNew > free - 2 ? 'bad' : undefined });
  }

  const what = members ? 'This AI' : list.length > 1 ? 'These models' : list[0].name;
  const slowest = chat.filter((m) => m.fit !== 'no' && m.wps).sort((a, b) => a.wps - b.wps)[0] || null;
  const verdict = worst === 'bad' ? { cls: 'bad', icon: '✕', text: `${what} will not run on this PC as it is: ${reasons[0]}.` }
    : worst === 'warn' ? { cls: 'warn', icon: '⚠', text: `${what} will run on this PC, with waits: ${reasons.slice(0, 2).join('; ')}.` }
      : slowest && slowest.wps < 10 ? { cls: 'ok', icon: '✓', text: `${what} will run on this PC at a steady pace: about ${Math.max(1, Math.round(slowest.wps))} words a second${slowest !== list[0] || list.length > 1 ? ` from ${slowest.name}` : ''}, so longer answers take a minute or two.` }
        : { cls: 'ok', icon: '✓', text: `${what} will run well on this PC.` };
  return { verdict, lines, worst, reasons, hardSec };
}

function pcForecastHTML(targets, opts = {}) {
  const f = pcForecast(targets, opts);
  if (!f) return '';
  return `<div class="fc" data-fc="${f.worst}"><div class="fc-title">🔮 ${esc(opts.title || 'On this PC: what to expect')}</div>
    ${opts.noVerdict ? '' : `<div class="fz-run ${f.verdict.cls}">${f.verdict.icon} ${esc(f.verdict.text)}</div>`}
    ${f.lines.map((l) => `<div class="fc-line ${l.cls || ''}"><span class="fc-ic">${l.icon}</span><span class="grow"><b>${esc(l.title)}</b><span class="small">${l.html || esc(l.text)}</span></span></div>`).join('')}
    ${opts.extra || ''}
    <div class="small muted">Estimates for this PC, from its measured speed and each model's size.</div></div>`;
}
// One line, for a note when a download starts.
function pcForecastLine(id) {
  const f = pcForecast([id], { adding: [id] });
  if (!f) return '';
  const m = fcMember(id, S.est.hardware);
  const speed = m?.kind === 'text' && m.wps ? `, about ${Math.max(1, Math.round(m.wps))} words a second` : m?.sec ? `, about ${fmtSec(m.sec)} a ${m.kind === 'video' ? 'clip' : 'picture'}` : '';
  return f.worst === 'bad' ? f.verdict.text : `On this PC it runs ${FC_WHERE[m.fit].replace(/ \(.*\)$/, '')}${speed}${f.worst === 'warn' && f.reasons[0] ? ` (${f.reasons[0]})` : ''}.`;
}
