// Settings → Features: every feature with an on/off switch, and what you gain or lose either way.
'use strict';

// [pref, default on?, icon, name, what it does, with it on, with it off, group]
const FEATURES = [
  ['thinking', true, '🧠', 'Thinking for hard questions', 'The Liquid Edition works hard questions out before answering (watch it under "Thought it through").', 'More accurate on maths, logic and "why / how" questions.', 'Hard answers come back much sooner (often 20–90 s sooner on a PC without a graphics card), but more often wrong on maths and logic.', 'Answers'],
  ['muse', true, '✨', 'Creative Muse', 'Before stories, lyrics, names and ideas, the small model sketches five fresh angles for the Brain to pick from.', 'Fresher, less predictable creative writing.', 'Creative answers start a few seconds sooner, with more obvious ideas.', 'Answers'],
  ['autoRoute', true, '🎯', 'Automatic model choice', 'Picks the best of your models for each question (for example one that can see a photo).', 'The right model every time, without thinking about it.', 'Every message uses the model you picked, even when another would do better (a photo can go to a model that can\'t see it).', 'Answers'],
  ['autoFix', true, '🔧', 'Fix mistakes automatically', 'Checks sums and code in answers, and has the model fix any slip it finds.', 'Wrong sums and broken code are caught and corrected.', 'Answers finish a little sooner, but slips stay in unless you spot them.', 'Accuracy'],
  ['factCheck', false, '✓', 'Double-check every answer', 'A second model checks each claim in every answer and fixes clear mistakes (you can still turn it on per chat).', 'The most reliable answers, for health, money, legal and work questions.', 'Answers take about half the time; you can still double-check any one answer from its menu.', 'Accuracy'],
  ['checkUnsure', false, '🔢', 'Double-check uncertain numbers', 'When the model seems unsure of a number, a second model quietly checks just that number (only when Double-check every answer is off).', 'Catches shaky figures without checking the whole answer.', 'Nothing is double-checked automatically; you can still check any answer from its menu.', 'Accuracy'],
  ['autoWeb', true, '🌐', 'Automatic web search', 'Searches the web first for questions about current things (news, prices, today\'s facts).', 'Up-to-date answers with sources.', 'Nothing goes online while Quicksilver is offline: web search follows the Online/Offline switch at the top of the chat. Answers about recent events may be out of date.', 'Online'],
  ['cloudHard', false, '☁️', 'Cloud AI for hard questions', 'Sends hard questions to your connected cloud AI, the Liquid Edition\'s too (an uncensored one such as Venice is used first).', 'A much bigger model on the hardest questions.', 'Everything stays on this PC: more private, works offline, no cloud costs.', 'Online'],
  ['cloudAll', false, '☁️', 'Cloud AI for everything', 'Every message goes to your connected cloud AI (the Liquid Edition uses an uncensored one such as Venice first); this PC answers when you are offline or the cloud doesn\'t.', 'Fast, strong answers even on a slow PC.', 'Everyday answers come from this PC: private and free.', 'Speed'],
  ['autoTools', true, '🔌', 'Use connected apps automatically', 'When you mention a connected app ("my Gmail", "my calendar"), the AI can use it in that chat.', 'Just ask; it looks things up in your apps.', 'Apps are only used when you turn on Tools in a chat: more control, one more click.', 'Online'],
  ['memory', true, '🧠', 'Memory', 'Remembers facts about you across chats and uses the ones that matter.', 'Answers that fit you without repeating yourself.', 'Nothing is remembered between chats; each one starts fresh (what\'s saved stays until you clear it in Memory).', 'Personal'],
  ['memoryLearn', true, '👂', 'Notice things to remember', 'Picks up lasting facts on its own (your job, your tools), as well as when you say "remember…".', 'Memory fills itself in.', 'Only what you ask it to remember is kept, and a little background work is saved.', 'Personal'],
  ['humanWriting', true, '💬', 'Write like a person', 'Natural paragraphs, no chatbot phrases, headings or bullet lists unless they help.', 'Answers that read like a knowledgeable friend wrote them.', 'Answers use more headings, lists and formatting, like other chatbots.', 'Personal'],
  ['preanswer', true, '⚡', 'Answers in advance', 'On a graphics card, quietly prepares answers to the follow-ups you\'re most likely to ask.', 'Some follow-ups appear instantly.', 'Less graphics card and power use while you read.', 'Speed'],
  ['autoInstallModels', false, '⬇️', 'Install better models automatically', 'Downloads newer, better models and stacks in the background when they suit this PC.', 'Always the best models, without lifting a finger.', 'Nothing big downloads without you; you\'re shown each upgrade to choose.', 'Speed'],
  ['tips', true, '💡', 'Tips', 'Now and then, a short tip for getting more out of Quicksilver.', 'You discover features as you go.', 'No tips.', 'Personal'],
];
// Pros and cons of each state: [pros with it on, cons with it on, pros with it off, cons with it off].
// When the "off" sides aren't written, they're the "on" sides turned around.
const FEATURE_PC = {
  thinking: [['More accurate on maths, logic, planning and "why / how" questions', 'You can read how it worked the answer out'], ['Hard answers take longer (20–90 s more on a PC without a graphics card)', 'Uses more of the PC while it thinks'], ['Hard answers come back much sooner', 'Lighter on battery and fans'], ['More mistakes on maths, logic and multi-step questions']],
  muse: [['Fresher, more surprising stories, lyrics, names and ideas'], ['Creative answers start a few seconds later']],
  autoRoute: [['The best of your models answers each message', 'Photos go to a model that can see them'], ['The model can change from one message to the next']],
  autoFix: [['Wrong sums and broken code are caught and fixed'], ['Answers with sums or code take a little longer']],
  factCheck: [['The most reliable answers, every claim checked', 'Best for health, money, legal and work questions'], ['Answers take about twice as long', 'Uses more of the PC (or your cloud AI, if connected)']],
  checkUnsure: [['Shaky numbers get a quick second opinion', 'Much cheaper than checking the whole answer'], ['A second model runs on some answers (a few seconds)']],
  autoWeb: [['Up-to-date answers about news, prices and today\'s facts', 'Sources you can click'], ['Questions about current things are sent to a search engine']],
  cloudHard: [['A much bigger model on the hardest questions'], ['Hard questions leave your PC', 'May cost money or use up a free plan\'s daily limit', 'Needs internet']],
  cloudAll: [['Fast answers from a big model, however slow this PC is', 'This PC still answers offline or if the cloud fails'], ['Your messages leave your PC', 'May cost money or use up a free plan\'s daily limit', 'Needs internet']],
  autoTools: [['Just ask: it looks things up in your connected apps'], ['The AI can read connected apps whenever you mention them']],
  memory: [['Answers fit you without repeating yourself', 'Remembers your preferences, projects and people'], ['What you share is kept on this PC until you clear it']],
  memoryLearn: [['Memory fills itself in as you chat'], ['It may keep something you\'d rather it didn\'t (you can delete any memory)', 'A little background work after chats']],
  humanWriting: [['Answers read like a knowledgeable friend wrote them', 'No chatbot phrases or needless bullet lists'], ['Fewer headings and lists for skimming']],
  preanswer: [['Some follow-ups appear instantly'], ['More graphics card and power use while you read']],
  autoInstallModels: [['Always the best models for this PC, without lifting a finger'], ['Big downloads (several GB) can start in the background', 'Uses disk space']],
  tips: [['You discover useful features as you go'], ['An occasional extra message on screen']],
};
const lowerFirst = (t) => t.charAt(0).toLowerCase() + t.slice(1);
function featurePC(key) {
  const f = FEATURES.find((x) => x[0] === key);
  const [onPro = [f[5]], onCon = [], offPro, offCon] = FEATURE_PC[key] || [];
  return {
    onPro, onCon,
    offPro: offPro || (onCon.length ? onCon.map((c) => `No more: ${lowerFirst(c)}`) : [f[6]]),
    offCon: offCon || onPro.map((c) => `You lose: ${lowerFirst(c)}`),
  };
}
const pcListHTML = (pros, cons) => `<ul class="pc-list">${pros.map((x) => `<li class="pc-pro">✅ ${esc(x)}</li>`).join('')}${cons.map((x) => `<li class="pc-con">⚠️ ${esc(x)}</li>`).join('')}</ul>`;
// Asks before changing a feature, showing exactly what you gain and what you give up.
function featureConfirm(key, turnOn) {
  const f = FEATURES.find((x) => x[0] === key);
  const pc = featurePC(key);
  const [pros, cons] = turnOn ? [pc.onPro, pc.onCon] : [pc.offPro, pc.offCon];
  return new Promise((resolve) => {
    const b = openModal(`<h2>${f[2]} Turn ${esc(f[3])} ${turnOn ? 'on' : 'off'}?</h2>
      <p class="small muted">${esc(turnOn ? f[5] : f[6])}</p>
      <h4 style="margin:10px 0 4px">What you gain</h4>${pcListHTML(pros, [])}
      <h4 style="margin:10px 0 4px">What you give up</h4>${cons.length ? pcListHTML([], cons) : '<p class="small muted">Nothing worth mentioning.</p>'}
      <div class="modal-actions"><button class="btn" data-feat-no>Keep it ${turnOn ? 'off' : 'on'}</button><button class="btn primary" data-feat-yes>Turn it ${turnOn ? 'on' : 'off'}</button></div>`);
    b.querySelector('[data-feat-no]').onclick = () => { closeModal(); resolve(false); };
    b.querySelector('[data-feat-yes]').onclick = () => { closeModal(); resolve(true); };
  });
}
const featureOn = (key) => { const f = FEATURES.find((x) => x[0] === key); const v = S.data.prefs[key]; return f && f[1] ? v !== false : v === true; };

function featuresHTML() {
  const groups = [...new Set(FEATURES.map((f) => f[7]))];
  return `<p class="help" style="margin-top:0">Turn any feature on or off. Each one lists its pros (✅) and cons (⚠️) with it on and with it off, and asks before changing, showing exactly what you gain and what you give up.</p>
    ${groups.map((g) => `<section class="card og-sec"><h3>${esc(g)}</h3>${FEATURES.filter((f) => f[7] === g).map(([key, , icon, name, what, on, off]) => {
      const isOn = featureOn(key);
      const pc = featurePC(key);
      return `<div class="feat ${isOn ? 'on' : 'off'}"><label class="feat-top"><input type="checkbox" data-feature="${key}" ${isOn ? 'checked' : ''} ${(key === 'cloudHard' || key === 'cloudAll') && !S.providers?.length ? 'disabled title="Connect a cloud AI first"' : ''}><span class="grow"><b>${icon} ${esc(name)}</b> <span class="feat-state">${isOn ? 'On' : 'Off'}</span><span class="small muted feat-what">${esc(what)}</span></span></label>
        <div class="feat-ab"><div class="${isOn ? 'now' : ''}"><span class="small"><b>With it on:</b> ${esc(on)}</span>${pcListHTML(pc.onPro, pc.onCon)}</div><div class="${isOn ? '' : 'now'}"><span class="small"><b>With it off:</b> ${esc(off)}</span>${pcListHTML(pc.offPro, pc.offCon)}</div></div></div>`;
    }).join('')}</section>`).join('')}`;
}
function bindFeatures() {
  $$('[data-feature]').forEach((b) => b.addEventListener('change', async (e) => {
    const key = b.dataset.feature;
    const f = FEATURES.find((x) => x[0] === key);
    const want = e.target.checked;
    e.target.checked = !want;
    if (!(await featureConfirm(key, want))) return;
    e.target.checked = want;
    S.data.prefs[key] = want;
    if (key === 'cloudHard' || key === 'cloudAll') S.data.prefs.cloudChosen = true; // your choice: never changed by itself again
    save(); render();
    toast(`${f[3]} ${e.target.checked ? 'on' : 'off'}: ${e.target.checked ? f[5] : f[6]}`, 7000);
  }));
}
