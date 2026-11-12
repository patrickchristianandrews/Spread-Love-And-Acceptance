// Simple view (the default): only what most people need is on screen; everything else is one
// click away under "More" (sidebar) and "Options" (message box). Nothing is removed: switch to
// the full view in Settings → General.
//
// Automatic model choice: for each question, Quicksilver picks the strongest model or team
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

// What Automatic learns from: your 👍 / 👎, double-check results, answers that needed a
// correction, and your blind votes in Compare models. Each moves a model up to two points for
// that kind of question; a few signals nudge, many decide.
function learnBonus(job, t) {
  const r = S.data.learn?.[job]?.[t];
  const g = job !== 'general' ? S.data.learn?.general?.[t] : null;
  const own = r ? ((r.up - r.down) / (r.up + r.down + 2)) * 2 : 0;
  const all = g ? ((g.up - g.down) / (g.up + g.down + 4)) * 0.5 : 0;
  return own + all;
}
function learnSignal(job, target, kind, w = 1) {
  if (!target || !job) return;
  const rec = (((S.data.learn ||= {})[job] ||= {})[target] ||= { up: 0, down: 0 });
  rec[kind] = (rec[kind] || 0) + w;
}

function autoPick(chat, a, text, hasImage) {
  const base = resolveTarget(chat, a);
  const job = jobOfQuestion(text || '', a);
  // Your own cloud AI for the hardest questions, if you switched that on (it uses your credits).
  // When several cloud AIs are connected, use the one that's best for this kind of question.
  if (S.data.prefs.cloudHard && !S.config?.offline && !hasImage && looksHard(text || '')) {
    const cloud = bestApiTarget(job, (t) => !liquidOk(base) || liquidOk(t));
    if (cloud) return { target: cloud, why: `Picked automatically: ${apiServiceName(cloud)}, your best connected cloud AI ${AUTO_WHY[job] || 'for this question'}, for a hard question.` };
  }
  const T = S.speed?.targets;
  if (!T || !base) return { target: base };
  const hard = looksHard(text);
  const words = hard ? Math.max(wordsForJob(job), WORDS.hard) : wordsForJob(job);
  const budget = hard ? 60 : 20; // seconds: quick answers come first
  const local = !base.startsWith('api:');
  // When you're on an uncensored model or the Liquid Edition, Automatic only ever picks another
  // uncensored one — it never quietly switches you to a filtered model that would refuse.
  const baseUnc = liquidOk(base);
  // A stack or fusion answers with its own models only: Automatic never leaves it for another
  // model, stack or cloud AI, except a model you ticked under Models → "Models in use". With a
  // single model, the other models on this PC are only candidates when ticked too.
  const team = base.startsWith('stack:');
  const allowed = (t) => t === base || (t.startsWith('local:') ? mayUse(t, base) : !team);
  const cands = S.targets.map((t) => t.target).filter((t) => T[t] && allowed(t) && !t.startsWith('kb:') && (!t.startsWith('api:') || !local) && (!hasImage || T[t].vision) && (!baseUnc || liquidOk(t)));
  if (!cands.length) return { target: base };
  // A connected cloud AI is scored for this exact task from the rankings (so the best one wins when
  // several are connected); a local model or team uses its measured quality for the job.
  const score = (t) => (t.startsWith('api:') ? apiScore(t, job) : (T[t].scores?.[job] ?? T[t].scores?.general ?? 0)) + learnBonus(job, t);
  const secs = (t) => etaFor(t, words, { hard }) ?? 999;
  // A photo the usual choice can already see stays with it.
  if (hasImage && T[base]?.vision) return { target: base };
  // Never trade away much quality for speed: a far weaker model answers fast but badly (testers
  // saw a tiny model go round in circles for minutes). The usual team already answers easy
  // questions with one model, so speed alone is no reason to leave it.
  const floor = score(base) - 1;
  const good = cands.filter((t) => t === base || score(t) >= floor || (hasImage && !T[base]?.vision));
  // A photo the usual choice can't see goes to a model that can, even if that one is slower.
  const pool = good.filter((t) => secs(t) <= budget || (hasImage && !T[base]?.vision));
  if (!pool.length) return { target: base };
  const best = [...pool].sort((x, y) => score(y) - score(x) || secs(x) - secs(y))[0];
  // Keep the usual choice unless the pick is clearly better for this question, or much quicker.
  if ((pool.includes(base) && score(base) >= score(best) - 0.5) || score(best) < score(base) - 1) return { target: base };
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
    <button data-o="file-in">${icon('clip', 16)} Attach a file (photo, PDF, Word…)</button>
    <button data-o="skill-pop">${icon('zap', 16)} Use a skill…</button>
    <div class="menu-sep"></div>
    <button data-o="tog-lib">${icon('book', 16)} Use my library<span class="grow"></span>${on('tog-lib') ? icon('check', 15) : ''}</button>
    <button data-o="tog-fact">${icon('shield', 16)} Double-check answers<span class="grow"></span>${on('tog-fact') ? icon('check', 15) : ''}</button>
    <button data-o="tog-tools">${icon('plug', 16)} Use my connected apps<span class="grow"></span>${toolsOn(chat, a) ? icon('check', 15) : ''}</button>
    <button data-o="add-api">${icon('plus', 16)} ${S.providers?.length ? 'Cloud AIs (ChatGPT, Claude…)' : 'Connect a cloud AI (ChatGPT, Claude…)'}<span class="grow"></span>${S.providers?.length ? `<span class="small muted">${S.providers.length}</span>` : ''}</button>
    <div class="menu-sep"></div>
    <div class="menu-h">How hard it should think</div>
    <div class="opt-effort">${Object.entries(EFFORTS).map(([k, l]) => `<button data-eff="${k}" class="${k === eff ? 'on' : ''}" title="${{ quick: 'One model, fastest', balanced: 'One model, then a check', thorough: 'The team on hard questions only (recommended)', council: 'Three AIs (Structurer, Critic, Pragmatist), then one verdict' }[k]}">${esc(l.replace(/^\S+\s/, ''))}</button>`).join('')}</div>
    <div class="menu-sep"></div>
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
    else if (o === 'file-in') $('#file-in')?.click();
    else if (o === 'skill-pop') { const p = $('#skill-pop'); if (p) { p.innerHTML = skillPickerHTML(''); p.hidden = false; $('#input')?.focus(); } }
    else if (o === 'add-api') { modelsTab = 'api'; go({ view: 'models' }); }
    else if (o === 'tog-tools') { chat.tools = !toolsOn(chat, assistantById(chat.assistantId)); save(); render(); if (chat.tools && !S.hasIntegrations) toast('Connect GitHub, Slack, Notion, Jira, Linear or an MCP server under Connectors first.', 6000); }
    else $(`#${o}`)?.click();
  });
}
