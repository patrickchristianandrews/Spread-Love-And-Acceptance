// Send feedback: a short form that opens a ready-written GitHub issue (or copies the text).
// Details about the PC are included only if the person ticks the box; chats never are.
'use strict';

const FEEDBACK_REPO = 'patrickchristianandrews/Spread-Love-And-Acceptance';
const FEEDBACK_KINDS = [['love', '😍 Love it'], ['idea', '💡 Idea'], ['confusing', '🤔 Confusing'], ['bug', '🐞 Something broke'], ['slow', '🐢 Too slow']];

function feedbackDetails() {
  const h = S.est?.hardware;
  const text = S.installed.filter((m) => m.kind === 'text').map((m) => m.name);
  return [
    `Version: ${upd?.current || 'unknown'}`,
    `View: ${simpleOn() ? 'simple' : 'full'}`,
    h ? `PC: ${h.ramGB.toFixed(0)} GB memory, ${h.gpuName || 'no graphics card'}${h.vramGB ? ` (${h.vramGB.toFixed(0)} GB)` : ''}` : '',
    `Models: ${text.join(', ') || 'none'}`,
    `Default: ${targetLabel(S.data.prefs.defaultTarget)}`,
    `Screen: ${S.route.view}`,
  ].filter(Boolean).join('\n');
}

async function openFeedback() {
  if (!upd) { try { upd = await qs.call('update:state'); } catch {} }
  let kind = 'idea';
  const b = openModal(`<h2>Send feedback</h2>
    <p class="muted" style="margin-top:-4px">What's working, what isn't, what you wish it did. Every note is read.</p>
    <div class="row fb-kinds" style="flex-wrap:wrap;gap:6px">${FEEDBACK_KINDS.map(([k, l]) => `<button class="btn small ${k === kind ? 'on' : ''}" data-fb="${k}">${l}</button>`).join('')}</div>
    <div class="field" style="margin-top:12px"><textarea id="fb-text" rows="6" placeholder="Tell us in your own words. If something went wrong: what did you do, what did you expect, and what happened?" autofocus></textarea></div>
    <label class="row"><input type="checkbox" id="fb-details" checked> <span><b>Include details about this PC</b> <span class="help">version, memory, graphics card and model names. Never your chats or files.</span></span></label>
    <details class="small" style="margin-top:6px"><summary class="muted" style="cursor:pointer">See exactly what's included</summary><pre class="fb-pre">${esc(feedbackDetails())}</pre></details>
    <div class="modal-actions"><button class="btn" id="fb-copy">Copy</button><button class="btn primary" id="fb-send">Send on GitHub</button></div>`);
  b.querySelectorAll('[data-fb]').forEach((x) => { x.onclick = () => { kind = x.dataset.fb; b.querySelectorAll('[data-fb]').forEach((y) => y.classList.toggle('on', y === x)); }; });
  const compose = () => {
    const t = b.querySelector('#fb-text').value.trim();
    const label = FEEDBACK_KINDS.find((x) => x[0] === kind)[1];
    return { title: `[Quicksilver ${label.replace(/^\S+\s/, '')}] ${t.split('\n')[0].slice(0, 70) || 'Feedback'}`, body: `${t || '(no message)'}\n\n${b.querySelector('#fb-details').checked ? `---\n${feedbackDetails()}` : ''}`.trim() };
  };
  b.querySelector('#fb-copy').onclick = () => { const f = compose(); navigator.clipboard?.writeText(`${f.title}\n\n${f.body}`); toast('Copied. Paste it wherever you like (email, message, or a GitHub issue).'); };
  b.querySelector('#fb-send').onclick = () => {
    const f = compose();
    if (!b.querySelector('#fb-text').value.trim()) { toast('Write a few words first.'); return; }
    if (S.config?.offline) { toast('You\'re offline. Use Copy, or go online (sidebar) to send it.'); return; }
    const url = `https://github.com/${FEEDBACK_REPO}/issues/new?${new URLSearchParams({ title: f.title, body: f.body.slice(0, 6000), labels: 'feedback' })}`;
    qs.call('shell:open', url);
    closeModal();
    toast('Opening GitHub with your feedback filled in. Press "Create" there to send it (a free GitHub account is needed). Thank you!', 8000);
  };
}
document.addEventListener('click', (e) => { if (e.target.closest('#feedback-btn')) openFeedback(); });
