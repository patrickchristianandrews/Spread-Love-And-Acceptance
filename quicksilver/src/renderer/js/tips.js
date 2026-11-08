// Tips from the model that comes with Quicksilver: now and then, under an answer from the starter
// models, a short tip on getting more out of Quicksilver, matched to what was just asked when
// possible (a coding stack for code, Upgrades after a slow answer, the Library for documents…).
// At most one every few answers, never the same twice in a row. Off in Settings → General, or
// with "Turn off tips" on any tip.
'use strict';

const TIPS = [
  { id: 'code', when: (c) => c.code, text: 'For code, a coding stack is far stronger than the starter model. Add one in one click from Stacks.', label: 'See coding stacks', go: () => go({ view: 'stacks' }) },
  { id: 'slow', when: (c) => c.secs > 40, text: 'That took a while on this PC. Upgrades shows what would make answers faster here — often a cheap memory upgrade or a smaller, quicker model.', label: 'See upgrades', go: () => { go({ view: 'pc' }); setTimeout(() => document.getElementById('upgrades')?.scrollIntoView({ behavior: 'smooth' }), 300); } },
  { id: 'docs', when: (c) => /\b(my|our|this|the) (notes|files|documents|docs|pdf|report|policy|policies|handbook)\b/i.test(c.q), text: 'Add your documents to the Library and I\'ll answer from them, with sources you can click.', label: 'Open Library', go: () => go({ view: 'library' }) },
  { id: 'hard', when: (c) => c.hard && !S.providers?.length, text: 'For the hardest questions you can connect a cloud AI (ChatGPT, Claude, Gemini) and use it alongside your local models.', label: 'Connect a cloud AI', go: () => { modelsTab = 'api'; go({ view: 'models' }); } },
  { id: 'human', when: () => true, text: '✍️ Quicksilver writes like a person, not a chatbot, so you can paste what it writes straight into an email or a document. Prefer the structured AI style? Switch it in Settings.', label: 'Open Settings', go: () => go({ view: 'settings' }) },
  { id: 'advisor', when: () => true, text: 'Want sharper answers? The Setup Advisor finds the best free model your PC can run well, in one click.', label: 'Open the Setup Advisor', go: () => { go({ view: 'stacks' }); runAdvisor('general'); } },
  { id: 'stacks', when: () => true, text: 'Stacks combine several models so they check each other and get hard questions right more often on hard questions. Ready-made ones cover coding, writing, study and more.', label: 'Explore stacks', go: () => go({ view: 'stacks' }) },
  { id: 'skills', when: () => true, text: 'Type / in the message box to use a skill: slides, spreadsheets, pictures, a website and lots more.' },
  { id: 'voice', when: () => true, text: 'You can talk instead of typing: click the mic, or press Ctrl+Space.' },
  { id: 'projects', when: () => true, text: 'Group related chats into a Project with shared instructions and files, so every chat starts with the right context.', label: 'Open Projects', go: () => go({ view: 'projects' }) },
  { id: 'connect', when: () => true, text: 'Connect your apps (calendar, GitHub, Slack, notes…) and I can use them when you mention them.', label: 'See connectors', go: () => go({ view: 'integrations' }) },
  { id: 'phone', when: () => true, text: 'Use Quicksilver from your phone on the same Wi-Fi — your PC does the work. Set it up in Settings → Phone.', label: 'Set up phone', go: () => { setTab = 'phone'; go({ view: 'settings' }); } },
  { id: 'compare', when: () => true, text: 'Not sure which model suits you? Compare models runs a blind test and builds your own leaderboard.', label: 'Compare models', go: () => go({ view: 'arena' }) },
  { id: 'create', when: () => true, text: 'Create makes pictures, short videos and music on this PC — get a picture model there in one click.', label: 'Open Create', go: () => go({ view: 'studio' }) },
];

// Answers from the models that come with Quicksilver (the Quicksilver stack, or a bundled model).
function isStarterTarget(t) {
  if (!t) return false;
  if (t === 'stack:quicksilver') return true;
  const inst = S.installed.find((m) => `local:${m.id}` === t);
  return inst?.source === 'bundled';
}

// Called when an answer finishes: maybe attach one tip to it.
function maybeTip(chat, msg, alt) {
  const p = S.data.prefs;
  if (p.tips === false || !alt.text || alt.error || alt.tip || !isStarterTarget(alt.target) || chat.messages.at(-1) !== msg) return;
  const q = chat.messages[chat.messages.indexOf(msg) - 1]?.text || '';
  const ctx = { q, code: typeof CODE_RE !== 'undefined' && CODE_RE.test(q), hard: looksHard(q), secs: (alt.ms || 0) / 1000 };
  p.tipCount = (p.tipCount || 0) + 1;
  const shown = p.tipsShown || [];
  // A tip that fits this answer can show after 2 answers; a general one waits for every 4th.
  const FITTING = ['code', 'slow', 'docs', 'hard'];
  const fitting = TIPS.filter((t) => FITTING.includes(t.id) && t.id !== p.lastTip && t.when(ctx));
  const general = TIPS.filter((t) => !FITTING.includes(t.id) && t.id !== p.lastTip);
  let pick = null;
  if (fitting.length && p.tipCount >= 2) pick = fitting[0];
  else if (p.tipCount >= 4) pick = general.find((t) => !shown.includes(t.id)) || general[p.tipCount % general.length];
  if (!pick) return;
  alt.tip = pick.id;
  p.tipCount = 0; p.lastTip = pick.id; p.tipsShown = [...new Set([...shown, pick.id])].slice(-20);
  save();
}

function tipHTML(m, alt) {
  const t = alt.tip && S.data.prefs.tips !== false && TIPS.find((x) => x.id === alt.tip);
  if (!t) return '';
  return `<div class="tip-card" data-tip-for="${m.id}"><span class="tip-ic">💡</span><span class="tip-text">${esc(t.text)}</span>${t.go ? `<button class="btn small" data-tip-go="${t.id}">${esc(t.label)}</button>` : ''}<button class="tip-off" data-tip-off title="You can turn tips back on in Settings → General">Turn off tips</button></div>`;
}

document.addEventListener('click', (e) => {
  const goBtn = e.target.closest('[data-tip-go]');
  if (goBtn) { TIPS.find((t) => t.id === goBtn.dataset.tipGo)?.go?.(); return; }
  if (e.target.closest('[data-tip-off]')) {
    S.data.prefs.tips = false; save();
    $$('.tip-card').forEach((x) => x.remove());
    toast('Tips are off. Turn them back on any time in Settings → General.');
  }
});
