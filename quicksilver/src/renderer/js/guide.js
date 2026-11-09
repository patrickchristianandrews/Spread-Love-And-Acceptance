// Settings → Options guide: every option in one tidy place, in plain words. Nothing to set here;
// it explains what each button and choice does and where to find it.
'use strict';

const OPTIONS_GUIDE = [
  ['💬', 'In the message box', [
    ['✨ Fix my prompt', 'Rewrites what you typed so it\'s clear and complete (spelling too). You can edit it before sending.'],
    ['⚡ Skills', 'One-click abilities: slides, spreadsheets, pictures, a website and more. Or type / in the box.'],
    ['🎙 Voice', 'Talk instead of typing (Ctrl+Space).'],
    ['📎 Attach', 'Photos, videos, PDFs, Word, Excel and PowerPoint. You can also drop or paste them.'],
    ['📚 Library', 'Answers from your own files and knowledge bases, with the source cited.'],
    ['🌐 Web', 'Searches the web for fresh facts. Quicksilver also does this by itself for current questions.'],
    ['🔌 Tools', 'Lets the AI use apps you\'ve connected (GitHub, Slack, your calendar…). Anything that changes something asks you first.'],
    ['🛡 Double-check', 'After the answer, a second model checks it claim by claim and fixes clear mistakes.'],
    ['＋ Cloud AI', 'Connect ChatGPT, Claude, Gemini and others to use alongside the models on this PC.'],
  ]],
  ['📏', 'Answer length', [
    ['Best length', 'As long as the question needs. The default.'],
    ['Quick answer', 'Straight to the point, in a few sentences.'],
    ['Detailed answer', 'The full picture, with explanation and examples.'],
  ]],
  ['🎚', 'Effort: how much thinking an answer gets', [
    ['⚡ Instant', 'One model, fastest. Good for quick questions.'],
    ['⚖️ Balanced', 'One model, then a quick check.'],
    ['✨ Auto (recommended)', 'Easy questions get one fast answer; hard ones bring in the team.'],
    ['🧠 Deep think', 'The whole team on every question, always double-checked. Slowest, most careful.'],
    ['⚔️ Council', 'Three AIs each look at your question: a Structurer lays out the answer, a Critic hunts for mistakes and edge cases, a Pragmatist says what to actually do. Then one answer is written from all three, with a note on whether they agreed or split. Slower; for big decisions and tricky problems.'],
  ]],
  ['💧', 'The Quicksilver crew (the built-in model)', [
    ['🧠 Brain', 'The built-in uncensored Qwen3 4B. Answers everyday messages fast and works hard ones out step by step.'],
    ['👁 Eyes & ✨ Muse', 'The built-in uncensored Qwen3-VL 2B. Reads photos and screenshots, and for creative work (stories, lyrics, names, ideas) sketches fresh angles first so you don\'t get the obvious take.'],
    ['🎯 Closer', 'When this PC has a stronger, still-fast uncensored model, it joins to lead on hard questions.'],
    ['✍️ Sounds human', 'Writes like a person, not a chatbot. Switch it off in Settings → General if you prefer the structured AI style.'],
  ]],
  ['🧾', 'Under each answer', [
    ['📋 Copy · 📤 Share', 'Copy the answer, or share it: copy, email, PDF, Word or Markdown. Share a whole chat from its ⋯ menu.'],
    ['👍 / 👎', 'Teaches Automatic which model does best for you on each kind of question.'],
    ['🔄 Regenerate', 'A fresh answer. Switch between answers with ‹ ›.'],
    ['⋯ More', 'Ask another model, listen, edit as a document, double-check, save as Word / PDF / PowerPoint, branch, delete.'],
    ['💭 Thought it through', 'The step-by-step reasoning behind the answer.'],
    ['🧩 Steps', 'What each model on the team did (drafts, the Muse, Council members).'],
  ]],
  ['🛡', 'Privacy (Settings → General)', [
    ['🔒 Fully private', 'Offline: nothing leaves this PC.'],
    ['🛡 Private online', 'Through Proton VPN (free plan, or your Proton account): web search, downloads and cloud AI only go out while the VPN is on.'],
    ['🌐 Online', 'Your normal connection. Your chats still stay on this PC unless a chat uses a cloud AI.'],
    ['Session label', 'Each chat says whether its session is private, protected or using a cloud AI. Click it to change modes.'],
  ]],
  ['🧭', 'Finding things', [
    ['Explore', 'In the left menu: Stacks, Models, Upgrades, Assistants, Skills, Connectors and Compare models.'],
    ['Your PC', 'Speed tests, low-cost upgrades and a guide to buying a new computer.'],
    ['⏹ Stop a model', 'Free its memory from the chat\'s status light or the Models page. It loads again when needed.'],
  ]],
];

function optionsGuideHTML() {
  return `<div class="og">
    <p class="help" style="margin-top:0">What every option does, in one place. Nothing to set here.</p>
    ${OPTIONS_GUIDE.map(([ic, title, rows]) => `<section class="card og-sec"><h3>${ic} ${esc(title)}</h3>
      <dl>${rows.map(([k, v]) => `<div class="og-row"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl></section>`).join('')}
  </div>`;
}
function bindOptionsGuide() {}

// "What do these do?" next to the message box options opens the guide.
document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-open-guide]')) return;
  e.preventDefault();
  setTab = 'guide'; go({ view: 'settings' });
});
