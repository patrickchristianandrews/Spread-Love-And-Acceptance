// Simple view (the default): only what most people need is on screen; everything else is one
// click away under "More" (sidebar) and "Options" (message box). Nothing is removed: switch to
// the full view in Settings → General.
//
// Automatic model choice: for each question, Quicksilver picks the strongest model or stack
// that can answer quickly on this PC (about 20 seconds; a minute for hard questions), the one
// that can see for photos, and a coding model for code.
'use strict';

const simpleOn = () => S.data?.prefs.simple !== false;
function applySimple() {
  const root = document.documentElement;
  root.classList.toggle('simple', simpleOn());
  root.classList.toggle('nav-open', Boolean(S.data?.prefs.navMore));
  const b = $('#nav-more');
  if (b) b.querySelector('.lbl').textContent = S.data?.prefs.navMore ? 'Less' : 'More';
}
document.addEventListener('click', (e) => {
  if (!e.target.closest('#nav-more')) return;
  S.data.prefs.navMore = !S.data.prefs.navMore;
  save(); applySimple();
});

// ---------- automatic model choice ----------
const autoOn = (chat, a) => S.data.prefs.autoRoute !== false && !chat.target && !a.target && S.targets.length > 1;
const CODE_RE = /```|\b(code|coding|function|bug|error|exception|script|python|javascript|typescript|java|c\+\+|c#|rust|golang|sql|regex|html|css|api|compile|stack ?trace|debug)\b/i;
const MATH_Q = /\b(prove|calculate|compute|solve|equation|integral|derivative|probability|step by step|logic puzzle|how many)\b|\d+\s*[-+*/^×÷]\s*\d+/i;
const WRITE_Q = /\b(write|essay|story|poem|lyrics|song|email|letter|blog|post|rewrite|caption|speech)\b/i;
function jobOfQuestion(text, a) {
  if (CODE_RE.test(text)) return 'coding';
  if (MATH_Q.test(text)) return 'reasoning';
  if (WRITE_Q.test(text)) return 'writing';
  return ['coding', 'writing', 'research', 'office', 'reasoning'].includes(a.job) ? a.job : 'general';
}
const AUTO_WHY = { coding: 'for code', reasoning: 'for working things out', writing: 'for writing', research: 'for research', office: 'for office work', general: '' };

function autoPick(chat, a, text, hasImage) {
  const base = resolveTarget(chat, a);
  const T = S.speed?.targets;
  if (!T || !base) return { target: base };
  const job = jobOfQuestion(text || '', a);
  const hard = looksHard(text);
  const words = hard ? Math.max(wordsForJob(job), WORDS.hard) : wordsForJob(job);
  const budget = hard ? 60 : 20; // seconds: quick answers come first
  const local = !base.startsWith('api:');
  const cands = S.targets.map((t) => t.target).filter((t) => T[t] && !t.startsWith('kb:') && (!t.startsWith('api:') || !local) && (!hasImage || T[t].vision));
  if (!cands.length) return { target: base };
  const score = (t) => T[t].scores?.[job] ?? T[t].scores?.general ?? 0;
  const secs = (t) => etaFor(t, words, { hard }) ?? 999;
  const quick = cands.filter((t) => secs(t) <= budget);
  const pool = quick.length ? quick : [...cands].sort((x, y) => secs(x) - secs(y)).slice(0, 1);
  const best = [...pool].sort((x, y) => score(y) - score(x) || secs(x) - secs(y))[0];
  // Keep the usual choice unless the pick is clearly better for this question, or much quicker.
  if (pool.includes(base) && score(base) >= score(best) - 0.5) return { target: base };
  const why = hasImage && !T[base]?.vision ? 'it can see the photo' : !pool.includes(base) ? 'it answers much sooner on this PC' : `it's stronger ${AUTO_WHY[job] || 'for this question'}`;
  return { target: best, why: `Picked automatically: ${why}.` };
}

// ---------- options in the message box (simple view) ----------
function composerOptions(chat, anchor) {
  closeMenus();
  const a = assistantById(chat.assistantId);
  const on = (id) => $(`#${id}`)?.classList.contains('on');
  const eff = effortOf(chat, a);
  const r = anchor.getBoundingClientRect();
  const menu = document.createElement('div');
  menu.className = 'menu opts-menu';
  menu.innerHTML = `
    <button data-o="tog-web" ${S.config?.offline ? 'disabled title="Go online to search the web"' : ''}>${icon('globe', 16)} Search the web<span class="grow"></span>${on('tog-web') ? icon('check', 15) : ''}</button>
    <button data-o="tog-lib">${icon('book', 16)} Use my knowledge<span class="grow"></span>${on('tog-lib') ? icon('check', 15) : ''}</button>
    <button data-o="tog-fact">${icon('shield', 16)} Fact check answers<span class="grow"></span>${on('tog-fact') ? icon('check', 15) : ''}</button>
    <button data-o="tog-tools">${icon('plug', 16)} Use my connected apps<span class="grow"></span>${on('tog-tools') ? icon('check', 15) : ''}</button>
    <div class="menu-sep"></div>
    <div class="menu-h">How hard it should think</div>
    <div class="opt-effort">${Object.entries(EFFORTS).map(([k, l]) => `<button data-eff="${k}" class="${k === eff ? 'on' : ''}" title="${{ quick: 'One model, fastest', balanced: 'One model, then a check', thorough: 'The team on hard questions only (recommended)', max: 'The whole team, always fact checked' }[k]}">${esc(l.replace(/^\S+\s/, ''))}</button>`).join('')}</div>
    <div class="menu-sep"></div>
    <button data-o="skill-btn">${icon('zap', 16)} Use a skill…</button>
    <button data-o="improve-btn">${icon('sparkle', 16)} Improve my message</button>
    <button data-o="settings">${icon('settings', 16)} Settings for this chat…</button>`;
  document.body.appendChild(menu);
  menu.style.top = `${Math.max(8, r.top - menu.offsetHeight - 8)}px`;
  menu.style.left = `${Math.max(8, Math.min(r.left, window.innerWidth - menu.offsetWidth - 8))}px`;
  menu.addEventListener('click', (e) => {
    const eff2 = e.target.closest('[data-eff]')?.dataset.eff;
    if (eff2) { closeMenus(); chat.effort = eff2; save(); render(); return; }
    const o = e.target.closest('[data-o]')?.dataset.o;
    if (!o) return;
    closeMenus();
    if (o === 'settings') chatSettings(chat);
    else $(`#${o}`)?.click();
  });
}
