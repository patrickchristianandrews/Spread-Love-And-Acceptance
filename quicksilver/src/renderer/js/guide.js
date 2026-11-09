// Settings → Options guide: every feature in one tidy place, in plain words, and where to find it.
// Nothing to set here. "What do these do?" under the message box opens it.
'use strict';

// [name, what it does, where to find it]
const OPTIONS_GUIDE = [
  ['💬', 'In the message box', [
    ['✨ Fix my prompt', 'Rewrites what you typed so it\'s clear and complete (spelling too). You can edit it before sending.', 'Message bar'],
    ['Spell check', 'Misspelt words are underlined; right-click for corrections or "Add to dictionary".', 'Message box'],
    ['⚡ Skills', 'One-click abilities: slides, spreadsheets, pictures, a website and more. Or type / in the box.', 'Message bar, or type /'],
    ['🎙 Voice', 'Talk instead of typing.', 'Message bar, or Ctrl+Space'],
    ['📎 Attach', 'Photos, videos, PDFs, Word, Excel and PowerPoint. You can also drop or paste them.', 'Message bar'],
    ['📚 Library', 'Answers from your own files and knowledge bases, with the source cited.', 'Message bar'],
    ['🌐 Web', 'Searches the web for fresh facts. Quicksilver also does this by itself for current questions.', 'Message bar'],
    ['🔌 Tools', 'Lets the AI use apps you\'ve connected (GitHub, Slack, your calendar…). Anything that changes something asks you first.', 'Message bar'],
    ['🛡 Double-check', 'After the answer, a second model checks it claim by claim and fixes clear mistakes.', 'Message bar'],
    ['＋ Cloud AI', 'Connect a cloud AI to use alongside the models on this PC.', 'Message bar'],
  ]],
  ['📏', 'Answer length', [
    ['Best length', 'As long as the question needs. The default.', 'Message bar → length'],
    ['Quick answer', 'Straight to the point, in a few sentences.', 'Message bar → length'],
    ['Detailed answer', 'The full picture, with explanation and examples.', 'Message bar → length'],
  ]],
  ['🎚', 'Effort: how much thinking an answer gets', [
    ['⚡ Instant', 'One model, fastest. Skips step-by-step reasoning.', 'Message bar → effort'],
    ['⚖️ Balanced', 'One model, then a quick check.', 'Message bar → effort'],
    ['✨ Auto (recommended)', 'Easy questions get one fast answer; hard ones bring in the team.', 'Message bar → effort'],
    ['🧠 Deep think', 'The whole team on every question, always double-checked. Slowest, most careful.', 'Message bar → effort'],
    ['⚔️ Council', 'A Structurer, a Critic and a Pragmatist each look at your question, then one answer is written from all three, with a note on whether they agreed. Slower; for big decisions.', 'Message bar → effort'],
  ]],
  ['💧', 'The Quicksilver crew (the built-in model)', [
    ['🧠 Brain', 'The built-in uncensored Qwen3 4B. Answers everyday messages fast and works hard ones out step by step (see "Thought it through").', 'Explore → Models (top card)'],
    ['👁 Eyes & ✨ Muse', 'The built-in uncensored Qwen3-VL 2B. Reads photos, and for creative work sketches fresh angles first so you don\'t get the obvious take.', 'Explore → Models (top card)'],
    ['🎯 Closer', 'A stronger, still-fast uncensored model on this PC joins to lead on hard questions (for example uncensored Qwen3 14B or 30B-A3B).', 'Joins by itself when you download one'],
    ['✍️ Sounds human', 'Writes like a person, not a chatbot.', 'Settings → General (to switch off)'],
  ]],
  ['☁️', 'Cloud AI & Fusion', [
    ['Every cloud AI', 'Over 30 services that work with Quicksilver (OpenAI, Claude, Gemini, Grok, Mistral, DeepSeek, Groq, OpenRouter, Perplexity, Venice and many more), each marked Free, Free to start or Paid, with the best model to link.', 'Explore → Models → Connect an API'],
    ['Several connections', 'Connect as many as you like, even two accounts with the same service; each appears separately in every model menu.', 'Explore → Models → Connect an API'],
    ['♻️ Free rotation', 'When a free cloud AI hits its limit, the next free one you\'ve connected answers instead, so you keep going for free. Pick "♻️ Free cloud AIs (rotating)" to rotate through them from the start.', 'Automatic; or the model menu in a chat'],
    ['⚗️ Fusion', 'Combine 2 to 4 AIs, local and cloud together, into one that answers as a team: they answer separately and a lead fuses the best of each.', 'Explore → Models → Connect an API, or Explore → Stacks'],
  ]],
  ['🧩', 'Stacks and models', [
    ['🔓 Uncensored Powerhouse', 'The top uncensored team for this PC (uncensored Qwen3 30B-A3B, 14B and Dolphin 8B, fitted to your hardware), plus an uncensored creative writer.', 'Explore → Stacks (first group)'],
    ['✨ Better models', 'New and better models and stacks are found online every day and installed in the background (or just suggested), then swapped into your stacks and chats. "Maybe later" reminds you in a few days.', 'Explore → Models (top), and a dot on Explore'],
    ['⏹ Stop a model', 'Frees its memory. It loads again when needed.', 'The status light in a chat, or Explore → Models'],
    ['Low memory', 'If this PC is short of memory for a model, you\'re offered the next best one that fits.', 'Appears in the chat when needed'],
  ]],
  ['🧾', 'Under each answer', [
    ['📋 Copy · 📤 Share', 'Copy the answer, or share it: copy, email, PDF, Word or Markdown. Share a whole chat from its ⋯ menu.', 'Under each answer; chat ⋯ menu'],
    ['👍 / 👎', 'Teaches Automatic which model does best for you on each kind of question.', 'Under each answer'],
    ['🔄 Regenerate', 'A fresh answer. Switch between answers with ‹ ›.', 'Under the last answer'],
    ['⋯ More', 'Ask another model, listen, edit as a document, double-check, save as Word / PDF / PowerPoint, branch, delete.', 'Under each answer'],
    ['💭 Thought it through', 'The step-by-step reasoning behind the answer.', 'Above the answer, when it reasoned'],
    ['🧩 Steps', 'What each model on the team did (drafts, the Muse, Council members).', 'Above the answer, for teams'],
  ]],
  ['📚', 'Your knowledge and your chats', [
    ['Connect your knowledge', 'Add files, folders and websites; Quicksilver answers from them with the exact source, and everything stays on this PC.', 'Home (top card) and Your knowledge in the menu'],
    ['Import from other AIs', 'Bring your chats from ChatGPT, Claude, Gemini, Grok, DeepSeek, Open WebUI, LM Studio, Jan, SillyTavern, or any chat saved as text.', 'Settings → General → Bring your chats from other AIs'],
    ['Projects & memory', 'Keep related chats, files and instructions together; Quicksilver remembers what you ask it to.', 'Projects in the menu; Settings → Memory'],
  ]],
  ['🛡', 'Privacy', [
    ['🔒 Fully private', 'Offline: nothing leaves this PC.', 'Settings → General → Privacy, or the Online switch'],
    ['🛡 Private online', 'Through Proton VPN (free plan, or your Proton account): web search, downloads and cloud AI only go out while the VPN is on.', 'Settings → General → Privacy'],
    ['🌐 Online', 'Your normal connection. Your chats stay on this PC unless a chat uses a cloud AI.', 'Settings → General → Privacy'],
    ['Session label', 'Each chat says whether it\'s a private session, protected, running on this PC, or using a cloud AI.', 'Top of each chat (click it to change)'],
    ['🔒 Parental lock', 'A PIN for uncensored models and teams; the built-in model stays family-safe while it\'s locked.', 'Settings → General'],
  ]],
  ['🖥️', 'Your PC and updates', [
    ['⬆️ Check for updates', 'See your version, check for a new one, and choose whether Quicksilver keeps itself up to date. A button appears in the sidebar when an update is ready.', 'Settings → General (top)'],
    ['Speed and upgrades', 'How fast each model runs here, and the low-cost upgrades that would help most.', 'Your PC (bottom of the menu)'],
    ['Buying a new computer?', 'What to get for each kind of use, with example PCs and how much faster Quicksilver would be on each.', 'Your PC → Buying a new computer?'],
    ['Explore', 'Stacks, Models, Upgrades, Assistants, Skills, Connectors and Compare models, folded into one section to keep the menu tidy.', 'Left menu'],
  ]],
];

function optionsGuideHTML() {
  return `<div class="og">
    <p class="help" style="margin-top:0">Every feature, what it does, and where to find it. Nothing to set here.</p>
    ${OPTIONS_GUIDE.map(([ic, title, rows]) => `<section class="card og-sec"><h3>${ic} ${esc(title)}</h3>
      <dl>${rows.map(([k, v, where]) => `<div class="og-row"><dt>${esc(k)}</dt><dd>${esc(v)}${where ? `<span class="og-where">📍 ${esc(where)}</span>` : ''}</dd></div>`).join('')}</dl></section>`).join('')}
  </div>`;
}
function bindOptionsGuide() {}

// "What do these do?" next to the message box options opens the guide.
document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-open-guide]')) return;
  e.preventDefault();
  setTab = 'guide'; go({ view: 'settings' });
});
