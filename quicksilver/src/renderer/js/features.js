// Settings → Features: every feature with an on/off switch, and what you gain or lose either way.
'use strict';

// [pref, default on?, icon, name, what it does, with it on, with it off, group]
const FEATURES = [
  ['thinking', true, '🧠', 'Thinking for hard questions', 'The Liquid Edition works hard questions out before answering (watch it under "Thought it through").', 'More accurate on maths, logic and "why / how" questions.', 'Hard answers come back much sooner (often 20–90 s sooner on a PC without a graphics card), but more often wrong on maths and logic.', 'Answers'],
  ['muse', true, '✨', 'Creative Muse', 'Before stories, lyrics, names and ideas, the small model sketches five fresh angles for the Brain to pick from.', 'Fresher, less predictable creative writing.', 'Creative answers start a few seconds sooner, with more obvious ideas.', 'Answers'],
  ['autoRoute', true, '🎯', 'Automatic model choice', 'Picks the best of your models for each question (for example one that can see a photo).', 'The right model every time, without thinking about it.', 'Every message uses the model you picked, even when another would do better (a photo can go to a model that can\'t see it).', 'Answers'],
  ['autoFix', true, '🔧', 'Fix mistakes automatically', 'Checks sums and code in answers, and has the model fix any slip it finds.', 'Wrong sums and broken code are caught and corrected.', 'Answers finish a little sooner, but slips stay in unless you spot them.', 'Accuracy'],
  ['factCheck', false, '✓', 'Double-check every answer', 'A second model checks each claim in every answer and fixes clear mistakes (you can still turn it on per chat).', 'The most reliable answers, for health, money, legal and work questions.', 'Answers take about half the time; you can still double-check any one answer from its menu.', 'Accuracy'],
  ['autoWeb', true, '🌐', 'Automatic web search', 'Searches the web first for questions about current things (news, prices, today\'s facts).', 'Up-to-date answers with sources.', 'Nothing goes online unless you turn on Web in a chat; answers about recent events may be out of date.', 'Online'],
  ['cloudHard', false, '☁️', 'Cloud AI for hard questions', 'Sends hard questions to your connected cloud AI (the Liquid Edition only uses uncensored ones).', 'A much bigger model on the hardest questions.', 'Everything stays on this PC: more private, works offline, no cloud costs.', 'Online'],
  ['autoTools', true, '🔌', 'Use connected apps automatically', 'When you mention a connected app ("my Gmail", "my calendar"), the AI can use it in that chat.', 'Just ask; it looks things up in your apps.', 'Apps are only used when you turn on Tools in a chat: more control, one more click.', 'Online'],
  ['memory', true, '🧠', 'Memory', 'Remembers facts about you across chats and uses the ones that matter.', 'Answers that fit you without repeating yourself.', 'Nothing is remembered between chats; each one starts fresh (what\'s saved stays until you clear it in Memory).', 'Personal'],
  ['memoryLearn', true, '👂', 'Notice things to remember', 'Picks up lasting facts on its own (your job, your tools), as well as when you say "remember…".', 'Memory fills itself in.', 'Only what you ask it to remember is kept, and a little background work is saved.', 'Personal'],
  ['humanWriting', true, '💬', 'Write like a person', 'Natural paragraphs, no chatbot phrases, headings or bullet lists unless they help.', 'Answers that read like a knowledgeable friend wrote them.', 'Answers use more headings, lists and formatting, like other chatbots.', 'Personal'],
  ['preanswer', true, '⚡', 'Answers in advance', 'On a graphics card, quietly prepares answers to the follow-ups you\'re most likely to ask.', 'Some follow-ups appear instantly.', 'Less graphics card and power use while you read.', 'Speed'],
  ['autoInstallModels', false, '⬇️', 'Install better models automatically', 'Downloads newer, better models and stacks in the background when they suit this PC.', 'Always the best models, without lifting a finger.', 'Nothing big downloads without you; you\'re shown each upgrade to choose.', 'Speed'],
  ['tips', true, '💡', 'Tips', 'Now and then, a short tip for getting more out of Quicksilver.', 'You discover features as you go.', 'No tips.', 'Personal'],
];
const featureOn = (key) => { const f = FEATURES.find((x) => x[0] === key); const v = S.data.prefs[key]; return f && f[1] ? v !== false : v === true; };

function featuresHTML() {
  const groups = [...new Set(FEATURES.map((f) => f[7]))];
  return `<p class="help" style="margin-top:0">Turn any feature on or off. Each one says what you get with it on, and what changes if you turn it off.</p>
    ${groups.map((g) => `<section class="card og-sec"><h3>${esc(g)}</h3>${FEATURES.filter((f) => f[7] === g).map(([key, , icon, name, what, on, off]) => {
      const isOn = featureOn(key);
      return `<div class="feat ${isOn ? 'on' : 'off'}"><label class="feat-top"><input type="checkbox" data-feature="${key}" ${isOn ? 'checked' : ''} ${key === 'cloudHard' && !S.providers?.length ? 'disabled title="Connect a cloud AI first"' : ''}><span class="grow"><b>${icon} ${esc(name)}</b> <span class="feat-state">${isOn ? 'On' : 'Off'}</span><span class="small muted feat-what">${esc(what)}</span></span></label>
        <div class="feat-ab"><div class="${isOn ? 'now' : ''}"><span class="small"><b>With it on:</b> ${esc(on)}</span></div><div class="${isOn ? '' : 'now'}"><span class="small"><b>With it off:</b> ${esc(off)}</span></div></div></div>`;
    }).join('')}</section>`).join('')}`;
}
function bindFeatures() {
  $$('[data-feature]').forEach((b) => b.addEventListener('change', (e) => {
    const key = b.dataset.feature;
    const f = FEATURES.find((x) => x[0] === key);
    S.data.prefs[key] = e.target.checked;
    save(); render();
    toast(`${f[3]} ${e.target.checked ? 'on' : 'off'}: ${e.target.checked ? f[5] : f[6]}`, 7000);
  }));
}
