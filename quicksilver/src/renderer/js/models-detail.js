// Model details: click any model card. Shows what the model is good at, its size and abilities,
// how it runs on this PC and why, and, when it won't fit, what a PC needs to run it and what to do
// instead (a smaller model that fits now, or using it through a cloud service).
'use strict';

const FIT_TEXT = {
  gpu: ['Runs fully on your graphics card', 'The fastest way to run a model: all of it fits in the graphics card\'s own memory.'],
  split: ['Shared between graphics card and memory', 'Too big for the graphics card alone, so part of it runs from the PC\'s main memory. It works, just slower than fully on the card.'],
  cpu: ['Runs on the processor', 'This PC has no graphics card it can use (or the model doesn\'t fit on it), so the processor does the work. It works, but more slowly.'],
  no: ['Won\'t fit on this PC', 'An AI model has to be loaded into memory to run. This one is bigger than the memory this PC has free for AI, so it can\'t start here.'],
};
const JOB_LABEL = { general: 'Everyday questions', office: 'Documents & analysis', research: 'Research & facts', coding: 'Coding', vision: 'Photos & documents' };

const gbText = (n) => `${n >= 10 ? Math.round(n) : n.toFixed(1)} GB`;
const scoreDots = (n) => `<span class="acc-dots">${'●'.repeat(Math.max(0, Math.round(n / 2)))}<i>${'●'.repeat(5 - Math.max(0, Math.round(n / 2)))}</i></span>`;

async function openModelDetails(id) {
  const box = openModal('<div class="empty">Loading…</div>', { wide: true });
  let d;
  try { d = await qs.call('catalog:details', id); } catch (err) { box.innerHTML = `<div class="notice">${esc(err.message)}</div><div class="modal-actions"><button class="btn" data-close>Close</button></div>`; return; }
  const { model: m, est, req, hardware: hw, alt, kind, boost } = d;
  const inst = S.installed.some((x) => x.catalogId === m.id);
  const [fitTitle, fitWhy] = FIT_TEXT[est.fit] || ['', ''];
  const total = (m.sizeGB || 0) + (m.mmprojGB || 0);
  const ability = [m.vision && 'Sees photos and screenshots', m.reasoning && 'Thinks step by step before answering', m.activeGB && 'Mixture of experts: only part of it works on each word, so it\'s faster than its size suggests', m.open && 'Uncensored community model: far fewer refusals', m.ctx >= 100000 && `Long memory: about ${Math.round((m.ctx * 0.75) / 1000)}K words at once`, m.edit === 'instruct' && 'Edits photos from a description', m.animate && 'Turns photos into video'].filter(Boolean);
  const pcLine = `${hw.ramGB.toFixed(0)} GB memory${hw.vramGB ? ` · ${esc(hw.gpuName || 'graphics card')} (${hw.vramGB.toFixed(0)} GB)` : ' · no separate graphics card'}`;
  const speed = est.fit === 'no' ? '' : kind === 'text' ? `About ${Math.max(1, Math.round(est.wordsPerSec))} words a second, so a typical answer takes ${fmtSec(WORDS.chat / Math.max(0.1, est.wordsPerSec))}.` : `About ${fmtSec(est.sec)} per ${m.kind === 'video' ? 'clip' : 'picture'}.`;
  const needLine = (r) => (r ? `${r.vramGB ? `a graphics card with <b>${r.vramGB} GB</b> of its own memory and <b>${r.ramGB} GB</b> of memory` : `<b>${r.ramGB} GB</b> of shared memory (like an Apple M-series Mac)`}` : '');
  const speedOn = (e) => (e ? (kind === 'text' ? `about ${Math.max(1, Math.round(e.wordsPerSec))} words/s (${e.label.toLowerCase()})` : `about ${fmtSec(e.sec)} each (${e.label.toLowerCase()})`) : '');

  box.innerHTML = `<div class="md-head">
      <div class="grow"><h2 style="margin:0">${esc(m.name)}</h2><div class="meta">${esc(m.maker)}${m.params ? ` · ${esc(m.params)} parameters` : ''} · ${gbText(total)} download</div></div>
      <button class="btn small" data-close>Close</button></div>
    <p style="margin:10px 0 14px">${esc(m.blurb)}</p>
    <div class="md-grid">
      <div class="card md-sec">
        <h3>On your PC</h3>
        <div class="row" style="margin:6px 0">${rateBadge(est, kind)}</div>
        <p style="margin:6px 0 4px"><b>${esc(fitTitle)}.</b> ${esc(fitWhy)}</p>
        ${speed ? `<p class="small" style="margin:0">${speed}</p>` : ''}
        ${boost && est.fit !== 'no' ? `<p class="small" style="margin:8px 0 0">${boost.installed ? `<b>Speed boost on:</b> ${esc(boost.name)} drafts ahead for it, so it writes noticeably faster.` : `<b>Make it faster:</b> with ${esc(boost.name)} installed (${boost.sizeGB.toFixed(1)} GB), it drafts ahead and this model writes up to about twice as fast, with the same answers. <button class="btn small" data-md-get-boost="${esc(boost.id)}">Get it</button>`}</p>` : ''}
        <p class="small muted" style="margin:8px 0 0">Your PC: ${pcLine}. Free for AI: about ${gbText(req.haveRam || 0)} of memory${req.haveVram ? ` + ${gbText(req.haveVram)} on the graphics card` : ''}. This model needs about <b>${Math.ceil(req.need)} GB</b>.</p>
      </div>
      ${kind === 'text' ? `<div class="card md-sec"><h3>Output, accuracy and ratings</h3>${modelProfileHTML(m, kind)}<h3 style="margin-top:12px">Good at</h3>${Object.entries(JOB_LABEL).filter(([k]) => k !== 'vision' || m.vision).map(([k, l]) => `<div class="md-score"><span>${l}</span>${scoreDots(m.jobs?.[k] ?? 0)}</div>`).join('')}
        ${ability.length ? `<ul class="md-abil">${ability.map((x) => `<li>${esc(x)}</li>`).join('')}</ul>` : ''}</div>` : `<div class="card md-sec"><h3>Output, accuracy and ratings</h3>${modelProfileHTML(m, kind)}<ul class="md-abil">${[`Quality: ${m.quality}/10`, ...ability].map((x) => `<li>${esc(x)}</li>`).join('')}</ul></div>`}
    </div>
    ${kind === 'text' ? `<div class="card md-sec">${boostsHTML([m.id], { liquid: m.category === 'open' })}</div>` : ''}
    ${est.fit === 'no' ? `<div class="card md-sec md-need">
      <h3>What you can do</h3>
      <ol class="md-steps">
        ${alt ? `<li><b>Use a smaller model that fits now:</b> ${esc(alt.name)} (${gbText(alt.sizeGB)}), ${speedOn(alt.est)} on this PC. <button class="btn small" data-md-open="${esc(alt.id)}">See it</button></li>` : ''}
        ${req.minRam ? `<li><b>The least it needs:</b> a PC with <b>${req.minRam} GB</b> of memory can load it on the processor alone, ${speedOn(req.minEst)}.</li>` : ''}
        ${req.smooth ? `<li><b>To run it smoothly:</b> ${needLine(req.smooth)}, ${speedOn(req.smooth.est)}.</li>` : ''}
        ${req.unified ? `<li><b>Or:</b> ${needLine(req.unified)}, ${speedOn(req.unified.est)}.</li>` : ''}
        ${kind === 'text' ? '<li><b>Use it in the cloud:</b> many big open models are available through OpenRouter or Groq (free plans), under Models → Connect an API.</li>' : '<li><b>Use a cloud image service</b> (Together has a free FLUX model) under Models → Connect an API.</li>'}
      </ol>
      <p class="small muted" style="margin:6px 0 0">Closing other apps frees a little memory, but not enough to make a model this size fit.</p>
      <p class="small muted" style="margin:6px 0 0">See <a href="#" data-goto-upgrades>Your PC → cheap upgrades</a> for what each upgrade costs and which models it unlocks.</p>
    </div>` : `<div class="card md-sec"><h3>Would run better with</h3><p class="small" style="margin:0">${est.fit === 'gpu' ? 'It already runs the fastest way on this PC.' : req.smooth ? `${needLine(req.smooth)}: ${speedOn(req.smooth.est)}.` : 'A PC with more memory.'}</p></div>`}
    <div class="modal-actions" style="justify-content:flex-start">${S.downloads[m.id] ? downloadBox(m.id) : inst ? '<span class="badge b-mint">✓ Installed</span>' : `<button class="btn primary" data-md-get="${esc(m.id)}" ${est.fit === 'no' ? 'title="It won\'t run on this PC, but you can still download it, e.g. to copy to another PC"' : ''}>${est.fit === 'no' ? 'Download anyway' : `Download (${gbText(total)})`}</button>`}${m.repo ? `<a class="btn ghost" href="https://huggingface.co/${esc(m.repo)}">Model page</a>` : ''}</div>`;
  $$('[data-close]', box).forEach((x) => x.addEventListener('click', closeModal));
  $$('[data-md-open]', box).forEach((b) => b.addEventListener('click', () => openModelDetails(b.dataset.mdOpen)));
  box.querySelector('[data-goto-upgrades]')?.addEventListener('click', (e) => { e.preventDefault(); closeModal(); go({ view: 'pc' }); });
  box.querySelector('[data-md-get-boost]')?.addEventListener('click', async (e) => { e.target.disabled = true; await download({ catalogId: e.target.dataset.mdGetBoost }, boost.name); toast(`${boost.name} is downloading. ${m.name} will use it automatically.`); });
  box.querySelector('[data-md-get]')?.addEventListener('click', async () => { closeModal(); await download({ catalogId: m.id }, m.name); render(); });
}

// Click a model card (not its buttons) to open its details.
document.addEventListener('click', (e) => {
  const btn = e.target.closest('[data-details]');
  if (btn) { openModelDetails(btn.dataset.details); return; }
  const card = e.target.closest('[data-model-card]');
  if (!card || e.target.closest('button, a, input, select, label, .progress-box')) return;
  openModelDetails(card.dataset.modelCard);
});
