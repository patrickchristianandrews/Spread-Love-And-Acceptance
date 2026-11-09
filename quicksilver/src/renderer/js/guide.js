// Settings → Guide & tips: every feature in one tidy place, in plain words, and where to find it.
// Nothing to set here. "What do these do?" under the message box opens it.
'use strict';

// [name, what it does, where to find it, how it works (optional, shown folded)]
const OPTIONS_GUIDE = [
  ['💬', 'In the message box', [
    ['✨ Fix my prompt', 'Rewrites what you typed so it\'s clear and complete (spelling too). You can edit it before sending.', 'Message bar', "Press it after typing. A model on this PC rewrites your message so it says exactly what you want: it adds missing details (who it's for, length, format), fixes spelling and makes the request clear. The rewrite replaces your text in the box, so you can change anything before you press Send. Nothing is sent until you do."],
    ['Spell check', 'Misspelt words are underlined; right-click for corrections or "Add to dictionary".', 'Message box'],
    ['⚡ Skills', 'One-click abilities: slides, spreadsheets, pictures, a website and more. Or type / in the box.', 'Message bar, or type /', "A skill is a ready-made set of instructions plus a result type: slides (.pptx), a spreadsheet (.xlsx), a Word document, a picture, a song, a web page you can open, and many more. Pick one from the ⚡ button or type / and a few letters, then describe what you want. Quicksilver writes it and gives you a file or a preview. You can also make your own skills or import SKILL.md files on the Skills page."],
    ['🎙 Voice', 'Talk instead of typing.', 'Message bar, or Ctrl+Space', "Click the mic (or press Ctrl+Space) and speak; click again to stop. Your speech is turned into text on this PC by Whisper, so no audio leaves the computer. The text lands in the message box for you to check, then you send it. Answers can also be read aloud from the ⋯ menu under each answer."],
    ['📎 Attach', 'Photos, videos, PDFs, Word, Excel and PowerPoint. You can also drop or paste them.', 'Message bar', "Photos and screenshots are read by a model that can see (the built-in Eyes model, or another vision model). Documents are turned into text on this PC: PDF, Word, Excel, PowerPoint, CSV, web pages, code and plain text all work. Long files are trimmed to fit, keeping the parts that match your question. Videos are sampled as a few frames."],
    ['📚 Library', 'Answers from your own files and knowledge bases, with the source cited.', 'Message bar', "Turn it on in a chat and every question is first looked up in your knowledge bases. Quicksilver finds the passages that best match your words, gives them to the model, and the answer cites them as [1], [2]; click a number to see the passage and the file it came from. Even with it off, if your Library clearly has the answer, it's used automatically and marked 📚."],
    ['🌐 Web', 'Searches the web for fresh facts. Quicksilver also does this by itself for current questions.', 'Message bar', "With Web on, Quicksilver searches the internet (no account or key needed), opens the best pages, reads only the parts that match your question, and answers with numbered sources. It also does this by itself for questions about current things (news, prices, weather, the latest guidance) and tells you when it did. Nothing is searched while you're offline, or without a VPN when Private online is on."],
    ['🔌 Tools', 'Lets the AI use apps you\'ve connected (GitHub, Slack, your calendar…). Anything that changes something asks you first.', 'Message bar', "Connect apps under Explore → Connectors (GitHub, Slack, Notion, Jira, your calendar, MCP servers…). With Tools on, the AI can look things up in them and take actions. Anything that changes something (sending, creating, deleting) shows you exactly what it will do and waits for you to press Allow."],
    ['🛡 Double-check', 'After the answer, a second model checks it claim by claim and fixes clear mistakes.', 'Message bar', "After an answer, a second model reads it claim by claim: facts, numbers, dates, code. It marks each one ✅ right, ⚠️ unsure or ❌ wrong, and the verdict appears as a small chip under the answer (click it for the details). When it finds a clear mistake, the answer is rewritten once with the correction (you can switch back with ‹ ›). It uses the quickest good model available, often one that's already loaded."],
    ['＋ Cloud AI', 'Connect a cloud AI to use alongside the models on this PC.', 'Message bar', "Opens the list of cloud AIs. Connect one with its API key and its models appear in every model menu, next to the ones on this PC. Messages only go to a cloud AI in chats that use it."],
  ]],
  ['📏', 'Answer length', [
    ['Best length', 'As long as the question needs. The default.', 'Message bar → length'],
    ['Quick answer', 'Straight to the point, in a few sentences.', 'Message bar → length'],
    ['Detailed answer', 'The full picture, with explanation and examples.', 'Message bar → length'],
  ]],
  ['🎚', 'Effort: how much thinking an answer gets', [
    ['⚡ Instant', 'One model, fastest. Skips step-by-step reasoning.', 'Message bar → effort'],
    ['⚖️ Balanced', 'One model, then a quick check.', 'Message bar → effort'],
    ['✨ Auto (recommended)', 'Easy questions get one fast answer; hard ones bring in the team.', 'Message bar → effort', "Quicksilver judges each message. Greetings and quick questions get one fast model. Hard ones (maths, why / how / compare / plan, long problems) bring in more of the team and step-by-step reasoning, as long as it can still answer in about a minute."],
    ['⚔️ Council', 'A Structurer, a Critic and a Pragmatist each look at your question, then one answer is written from all three, with a note on whether they agreed. Slower; for big decisions.', 'Message bar → effort', "Three roles look at your question one after another: the Structurer lays out the answer, the Critic hunts for mistakes and edge cases (using a thinking model if you have one), and the Pragmatist says what to actually do. A chair then writes one answer from all three and says whether they agreed or split. Each member's notes are in the answer's steps. It's 3 to 4 times slower, so keep it for decisions that matter."],
  ]],
  ['💧', 'Quicksilver Liquid Edition (the built-in model) and its crew', [
    ['🧠 Brain', 'The built-in uncensored Qwen3 4B. Answers everyday messages fast and works hard ones out step by step (see "Thought it through").', 'Explore → Models (top card)', "Every everyday message goes to the Brain first, so replies start in a second or two. For questions that need care, it first writes short numbered steps (at most six), recomputing every number, then the answer; the steps are under \"💭 Thought it through\". Sums in your question are also worked out exactly by the app and handed to it."],
    ['👁 Eyes & ✨ Muse', 'The built-in uncensored Qwen3-VL 2B. Reads photos, and for creative work sketches fresh angles first so you don\'t get the obvious take.', 'Explore → Models (top card)', "When you attach a photo, the Eyes model describes it in detail for the Brain (or answers itself). For creative requests (stories, poems, lyrics, names, slogans, ideas) it acts as the Muse: in a few seconds it throws out five unexpected angles, and the Brain writes with the freshest one. The Muse step shows in the answer's steps."],
    ['🔄 Stays current', 'The Liquid Edition updates itself as newer, better uncensored models come out: a new Brain or Eyes, or a stronger Closer.', 'Explore → Models (top card)', 'Once a day, Quicksilver reads its online picks. When they name a newer uncensored core model that runs well on this PC, it\'s suggested at the top of Models (or installed for you if automatic installs are on). Once it\'s downloaded, the Liquid Edition rebuilds itself around it; your chats keep working.'],
    ['🐬 Dolphin in the crew', 'Add Dolphin 3.0 8B (uncensored, a different family) as a second opinion on hard questions.', 'Explore → Models (Liquid Edition card): Add Dolphin', 'Press Add Dolphin (about 5 GB). When it\'s downloaded, the Liquid Edition rebuilds its crew: everyday messages still go to the fast Brain; for hard ones Dolphin writes its key points first and the Brain writes the answer from both views. On a PC without a graphics card that adds noticeable time to hard answers.'],
    ['🎯 Closer', 'A stronger, still-fast uncensored model on this PC joins to lead on hard questions (for example uncensored Qwen3 14B or 30B-A3B).', 'Joins by itself when you download one', "Quicksilver rebuilds its crew whenever your models change. If you have an uncensored model that's clearly stronger than the Brain and still fast on this PC, it becomes the Closer and writes the answer for hard questions, using the Brain's key points. Everyday messages still go to the fast Brain."],
    ['✍️ Sounds human', 'Writes like a person, not a chatbot.', 'Settings → General (to switch off)', "Each chat starts with short writing instructions: answer first, natural paragraphs, no chatbot openers or sign-offs, no em dashes, headings and lists only when they help. After the answer, a tidy pass removes any leftovers. Code, tables and quotes are never changed."],
  ]],
  ['☁️', 'Cloud AI & Fusion', [
    ['Every cloud AI', 'Over 30 services that work with Quicksilver (OpenAI, Claude, Gemini, Grok, Mistral, DeepSeek, Groq, OpenRouter, Perplexity, Venice and many more), each marked Free, Free to start or Paid, with the best model to link.', 'Explore → Models → Connect an API', "Click a service, paste its API key (the card links to where you get one) and press Save & load models: its model list is fetched, with the recommended model first. Keys are stored encrypted on this PC and only sent to that service. Free plans have limits; each card links to current prices."],
    ['Several connections', 'Connect as many as you like, even two accounts with the same service; each appears separately in every model menu.', 'Explore → Models → Connect an API'],
    ['☁️ Best free partner', 'For the Liquid Edition: Cerebras (Qwen3 235B, the big sibling of the built-in model, fast with a large free daily allowance), with Groq and Mistral as free backups.', 'Explore → Models (Liquid Edition card)', 'Connect Cerebras, then Groq and Mistral (all free, no card). Switch on "use my cloud AI for hard questions" in Settings → General: everyday messages stay on this PC, hard ones go to Qwen3 235B, and if one free service hits its limit the next takes over. Free plans may use your prompts to improve their models, and their limits can change; for anything private, keep it on this PC.'],
    ['♻️ Free rotation', 'When a free cloud AI hits its limit, the next free one you\'ve connected answers instead, so you keep going for free. Pick "♻️ Free cloud AIs (rotating)" to rotate through them from the start.', 'Automatic; or the model menu in a chat', "If a free cloud AI answers with a rate-limit or quota error, Quicksilver immediately sends the same question to the next free one you've connected (you'll see \"Free limit reached; switching to…\"). On services that are only free to start, it prefers their free models (like OpenRouter's \":free\" ones). If every free one is used up, it says so and you can use the models on this PC."],
    ['⚗️ Fusion', 'Combine 2 to 4 AIs, local and cloud together, into one that answers as a team: they answer separately and a lead fuses the best of each.', 'Explore → Models → Connect an API, or Explore → Stacks', "Pick 2 to 4 AIs and how they work together (blend, vote, debate…). They each answer, then a lead combines the best parts and fixes mistakes. Different makers make different mistakes, so they catch each other's. The fusion is saved like a model: pick it in any chat, assistant or the local API."],
  ]],
  ['🧩', 'Stacks and models', [
    ['🔓 Uncensored Powerhouse', 'The top uncensored team for this PC (uncensored Qwen3 30B-A3B, 14B and Dolphin 8B, fitted to your hardware), plus an uncensored creative writer.', 'Explore → Stacks (first group)', "Press Set up and Quicksilver downloads the models that suit this PC (a lighter one stands in for any that won't run well), builds the team and adds an assistant for it. It's covered by the parental lock if one is set."],
    ['✨ Better models', 'New and better models and stacks are found online every day and suggested (or installed for you if you switch that on), then swapped into your stacks and chats. "Maybe later" reminds you in a few days.', 'Explore → Models (top), and a dot on Explore', "Once a day when online, Quicksilver checks a small list of the current best models. If something better than what you use runs well on this PC, it tells you; press Upgrade (or switch on automatic installs in Settings → General) and it downloads in the background. When it's ready, your stacks, chats, assistants and projects switch to it, and you're offered to remove the old one. \"Maybe later\" hides a suggestion for three days."],
    ['⏹ Stop a model', 'Frees its memory. It loads again when needed.', 'The status light in a chat, or Explore → Models', "Models stay loaded after answering so the next reply is quick. Stop unloads one (or all) to give the memory back to your PC, for example before a game or video editing. Nothing is deleted; it loads again the next time it's used."],
    ['Low memory', 'If this PC is short of memory for a model, you\'re offered the next best one that fits.', 'Appears in the chat when needed', "Before loading a model, Quicksilver checks free memory (and graphics memory). If it's short, a note offers the strongest lighter model that fits; one click answers with it instead. If loading fails anyway, the error offers the same."],
  ]],
  ['🧾', 'Under each answer', [
    ['📋 Copy · 📤 Share', 'Copy the answer, or share it: copy, email, PDF, Word or Markdown. Share a whole chat from its ⋯ menu.', 'Under each answer; chat ⋯ menu', "Share opens a small window: copy as plain text, copy with formatting (Markdown), open your email app with it filled in, or save as PDF, Word or Markdown to send. Nothing is uploaded; you choose where it goes."],
    ['👍 / 👎', 'Teaches Automatic which model does best for you on each kind of question.', 'Under each answer', "Each vote is remembered with the kind of question (code, writing, maths…) and the model that answered. Automatic then leans towards the models you like for each kind of question. Double-check results and blind-test votes count too."],
    ['🔄 Regenerate', 'A fresh answer. Switch between answers with ‹ ›.', 'Under the last answer'],
    ['⋯ More', 'Ask another model, listen, edit as a document, double-check, save as Word / PDF / PowerPoint, branch, delete.', 'Under each answer'],
    ['💭 Thought it through', 'The step-by-step reasoning behind the answer.', 'Above the answer, when it reasoned'],
    ['🧩 Steps', 'What each model on the team did (drafts, the Muse, Council members).', 'Above the answer, for teams'],
  ]],
  ['📚', 'Your knowledge and your chats', [
    ['Connect your knowledge', 'Add files, folders and websites; Quicksilver answers from them with the exact source, and everything stays on this PC.', 'Home (top card) and Your knowledge in the menu', "Make a knowledge base (each one is separate, so a work base never mixes with a personal one), then add files, whole folders, websites or a GitHub repository. Quicksilver reads them into text on this PC (PDF, Word, Excel, PowerPoint, web pages, code and 40+ other kinds), splits them into passages and indexes them for fast search. When you ask, it finds the best-matching passages and the answer cites them. Link a base to an assistant, and tick \"Only answer from this knowledge\" if it must never use outside knowledge. A knowledge model saves a model plus chosen bases as something you can pick anywhere. Live sources like PubMed and arXiv are searched fresh for each question."],
    ['Import from other AIs', 'Bring your chats from ChatGPT, Claude, Gemini, Grok, DeepSeek, Open WebUI, LM Studio, Jan, SillyTavern, or any chat saved as text.', 'Settings → General → Bring your chats from other AIs', "Export your data from the other app (ChatGPT and Claude email you a .zip; Gemini comes from Google Takeout → My Activity → Gemini Apps as JSON; Grok and DeepSeek have data exports). Choose the file (or several) and each chat comes in as a normal Quicksilver chat in a project named after where it came from, so you can carry on any of them. Importing again skips chats you already have."],
    ['Projects & memory', 'Keep related chats, files and instructions together; Quicksilver remembers what you ask it to.', 'Projects in the menu; Settings → Memory', "A project groups chats with shared instructions and files, so every chat in it knows the background. Memory: say \"remember that…\" (or it notices lasting facts like your job or how you like answers); only memories relevant to a question are used. Private chats neither use nor add memories. Edit everything in Settings → Memory."],
  ]],
  ['🛡', 'Privacy', [
    ['🔒 Fully private', 'Offline: nothing leaves this PC.', 'Settings → General → Privacy, or the Online switch'],
    ['🛡 Private online', 'Through Proton VPN (free plan, or your Proton account): web search, downloads and cloud AI only go out while the VPN is on.', 'Settings → General → Privacy', "Quicksilver checks this PC's network adapters for a VPN (Proton VPN is recognised by name, and other VPNs count too). While Private online is on and no VPN is connected, every connection is blocked, so nothing slips out. The sidebar shows \"🛡 Private (VPN)\" or \"VPN off: paused\". Get Proton VPN free, or sign in with your Proton account in its own app; Quicksilver never sees your password."],
    ['🌐 Online', 'Your normal connection. Your chats stay on this PC unless a chat uses a cloud AI.', 'Settings → General → Privacy'],
    ['Session label', 'Each chat says whether it\'s a private session, protected, running on this PC, or using a cloud AI.', 'Top of each chat (click it to change)'],
    ['🔒 Parental lock', 'A PIN for uncensored models and teams; the built-in model stays family-safe while it\'s locked.', 'Settings → General', "Set a PIN in Settings → General. Uncensored models and teams then ask for it (once per session). The built-in model isn't blocked: while locked, every model is told to keep things family-safe. The PIN is stored only as a scrambled hash."],
  ]],
  ['🖥️', 'Your PC and updates', [
    ['⬆️ Check for updates', 'See your version, check for a new one, and choose whether Quicksilver keeps itself up to date. A button appears in the sidebar when an update is ready.', 'Settings → General (top)', "With \"Keep Quicksilver up to date\" on, it checks once a day, downloads a new version in the background and checks its fingerprint; you choose when to restart. Your chats, settings and models are kept, and the big built-in models aren't downloaded again."],
    ['Speed and upgrades', 'How fast each model runs here, and the low-cost upgrades that would help most.', 'Your PC (bottom of the menu)'],
    ['Buying a new computer?', 'What to get for each kind of use, with example PCs and how much faster Quicksilver would be on each.', 'Your PC → Buying a new computer?', "Four kinds of PC, from basic to photo and video creation, each with the parts that matter (graphics memory first), example models you can buy, and an estimate of how fast Quicksilver would answer on it compared with this PC. The list refreshes online."],
    ['Explore', 'Stacks, Models, Upgrades, Assistants, Skills, Connectors and Compare models, folded into one section to keep the menu tidy.', 'Left menu'],
  ]],
];

function optionsGuideHTML() {
  return `<div class="og">
    <p class="help" style="margin-top:0">Every feature, what it does and where to find it. Open "How it works" on any of them for the full story. Nothing to set here.</p>
    ${OPTIONS_GUIDE.map(([ic, title, rows]) => `<section class="card og-sec"><h3>${ic} ${esc(title)}</h3>
      <dl>${rows.map(([k, v, where, how]) => `<div class="og-row"><dt>${esc(k)}</dt><dd>${esc(v)}${where ? `<span class="og-where">📍 ${esc(where)}</span>` : ''}${how ? `<details class="og-how"><summary>How it works</summary><p>${esc(how)}</p></details>` : ''}</dd></div>`).join('')}</dl></section>`).join('')}
  </div>`;
}
function bindOptionsGuide() {}

// "What do these do?" next to the message box options opens the guide.
document.addEventListener('click', (e) => {
  if (!e.target.closest('[data-open-guide]')) return;
  e.preventDefault();
  guideTab = 'options'; setTab = 'guide'; go({ view: 'settings' });
});

// ---------- Guide & tips: understanding stacks, the best cloud AIs, tips and tricks ----------
// More tabs on the same page (Settings → Guide & tips), so nothing new goes in the menu. The
// Stacks page and the cloud AI list link straight to the right tab.
let guideTab = 'options';
const GUIDE_TABS = { options: '📖 Every option', stacks: '🧩 Understanding stacks', apis: '☁️ Best cloud AIs', tips: '💡 Tips & tricks' };

const STACKS_GUIDE = [
  ['What a stack is', 'A stack (or team) is several AI models working as one. Different models make different mistakes, so when they answer separately and a lead combines the best of each, the result is more accurate than any one of them alone. You pick a stack like any model, in the model menu of a chat.'],
  ['How a stack answers', 'Easy messages go to one fast model, so you don\'t wait for the whole team. Hard ones (maths, why / how / compare / plan, long problems) bring in the team: the helpers write their key points or drafts, then the lead writes the final answer from all of them. If the drafts already agree, the combining step is skipped. You can watch each step under the answer.'],
  ['Ways of working together', 'Blend: the lead keeps the best of each draft. Debate: they critique each other, then the lead judges. Consensus: builds on what they agree on and flags disagreements. Majority vote: answers three times and keeps what agrees (great for maths). Red team: a second model hunts for mistakes before you see it (code, facts, advice). Plan, then solve: a planner breaks the job into steps first (long tasks). Expert panel: an expert, a sceptic and a creative thinker weigh in (decisions). Auto: one fast answer for easy questions, the team for hard ones.'],
  ['Quicksilver Liquid Edition', 'The built-in stack. The Brain (uncensored Qwen3 4B) answers everyday messages fast and reasons step by step on hard ones; the Eyes & Muse (uncensored Qwen3-VL 2B) reads photos and sketches fresh angles for creative work. Stronger uncensored models you add join automatically (as the Closer or a second opinion, Dolphin for example), and its core updates itself as better uncensored models come out.'],
  ['Ready-made stacks', 'Explore → Stacks has teams for specific work (music, office, research, coding, writing, uncensored…). Each is fitted to your PC: a model too big to run well is swapped for the strongest one that does, and stronger ones are used when your PC can. Every card says why it\'s good. New ones arrive online, marked 🆕.'],
  ['Fusion: your own mix', 'Combine 2 to 4 AIs, local and cloud together, and pick how they work together. Mix makers (say Qwen + Llama + Claude) for the biggest gain, since they catch each other\'s mistakes. Explore → Models → Connect an API, or Explore → Stacks.'],
  ['Council (an Effort option)', 'For one big question: a Structurer, a Critic and a Pragmatist each look at it, then one answer is written from all three, with a note on whether they agreed. It\'s 3 to 4 times slower, so keep it for decisions that matter.'],
  ['Speed versus accuracy', 'Local models take turns on your PC (they share its memory), so each extra local model adds time; cloud models run at the same time, so a cloud helper costs little extra. On a PC without a graphics card, keep teams small (two models). With a graphics card, a strong lead with one or two helpers is the sweet spot. Explore → Compare models shows each model\'s skill, accuracy and speed on your PC by task.'],
];

// [name, tag, best model, what it's best for, notes]
const API_GUIDE = {
  free: [
    ['Cerebras', 'Best free partner', 'Qwen3 235B (or gpt-oss-120b)', 'Pairs with the Liquid Edition: the big sibling of its Brain, extremely fast, with a large free daily allowance.', 'No card needed.'],
    ['Groq', 'Fastest backup', 'gpt-oss-120b or Llama 3.3 70B', 'Very fast answers; a great second free AI so free rotation can switch when one hits its limit.', 'No card needed.'],
    ['Google Gemini (AI Studio)', 'Smart, sees images', 'The newest Gemini Flash', 'Strong all-rounder that reads photos and very long documents.', 'Free-plan prompts may be used by Google to improve its models; more filtered than the uncensored local models.'],
    ['Mistral (Experiment plan)', 'Generous', 'Mistral Large', 'Good writing and multilingual work, with high free limits.', 'Needs a verified phone number; free-plan prompts may be used for training.'],
    ['OpenRouter', 'Many models, one key', 'openrouter/auto, or any ":free" model', 'Try hundreds of models; the ":free" ones cost nothing.', 'A daily cap on free requests.'],
    ['GitHub Models', 'With your GitHub account', 'GPT-4.1', 'Try well-known models with a GitHub token.', 'Low daily limits.'],
  ],
  paid: [
    ['Anthropic (Claude)', 'Best for writing and code', 'Claude Opus 5.5 (Sonnet 5.5 for value, Haiku 5.5 for speed)', 'Excellent writing, careful reasoning, long documents and coding; a superb lead for hard questions or Council.', 'Pay as you go.'],
    ['OpenAI', 'Strong all-rounder', 'GPT-6 Astra (GPT-6 Luna is much cheaper)', 'Reasoning, coding and broad knowledge.', 'The API is separate from a ChatGPT subscription.'],
    ['Google Gemini (paid)', 'Huge context', 'Gemini 4 Argon', 'Very long documents and video; paid use isn\'t used to train Google\'s models.', 'Pay as you go.'],
    ['DeepSeek', 'Cheapest strong reasoning', 'deepseek-reasoner', 'Strong maths and reasoning at a very low price.', 'Pay as you go.'],
    ['Perplexity', 'Answers with sources', 'sonar-pro', 'Searches the web and cites sources in every answer.', 'Pay as you go.'],
    ['xAI (Grok)', 'Up to date', 'Grok 4', 'Strong reasoning and current events.', 'Pay as you go.'],
    ['Venice AI', 'Uncensored and private', 'venice-uncensored', 'Uncensored cloud answers; Venice says it doesn\'t store prompts.', 'Small free allowance, then Pro or credits.'],
    ['Featherless', 'Flat monthly price', 'Thousands of open and uncensored models', 'Unlimited use of open fine-tunes for one monthly price.', 'Subscription.'],
  ],
};

const TIPS_GUIDE = [
  ['Leave Effort on Auto', 'Easy questions come back fast, hard ones get the team. Switch to Council only for big decisions.'],
  ['Turn on Double-check for facts', 'A second model checks every claim and fixes clear mistakes. Worth it for health, money, legal and work answers.'],
  ['Give it your files', 'Add documents to Your knowledge, turn on Smarter search, and switch on Library in a chat: answers come from your files with sources.'],
  ['Use Fix my prompt', 'One click turns a quick note into a clear, complete request, which gives a noticeably better answer.'],
  ['Pick the length', 'Quick answer for a fast fact, Detailed answer when you want the full picture.'],
  ['Tell it about you once', 'Say "remember that I…" (your job, your tools, how you like answers) and every new chat uses it.'],
  ['Use Projects for ongoing work', 'Put the instructions and files for a piece of work in a project; every chat in it knows the background.'],
  ['Rate answers', '👍 and 👎 teach Automatic which model suits you for each kind of question.'],
  ['Pair a free cloud AI', 'Connect Cerebras plus Groq or Mistral (free) and turn on "use my cloud AI for hard questions": everyday stays private on your PC, hard ones get a big model, and free rotation keeps it free.'],
  ['Add Dolphin or a stronger uncensored model', 'The Liquid Edition adds it to its crew by itself: a second opinion or a Closer on hard questions.'],
  ['Mix makers in a Fusion', 'Qwen + Llama + Claude catch more mistakes than three models from the same family.'],
  ['Free memory when you need it', 'Stop a model from the chat\'s status light before gaming or video editing; it reloads when needed.'],
  ['Check Your PC', 'See how fast each model runs, the cheapest upgrade that would help most, and how much faster a new PC would be.'],
  ['Shortcuts', 'Ctrl+N new chat, Ctrl+K search chats, Ctrl+Space voice, and / in the message box for skills.'],
  ['Keep it private when it matters', 'Go offline for a fully private session, or use Private online with Proton VPN; each chat\'s header tells you which.'],
  ['Bring your history', 'Import your chats from ChatGPT, Claude, Gemini and others (Settings → General) and carry on any of them here.'],
];

function stacksGuideHTML() {
  return `<div class="og"><p class="help" style="margin-top:0">How stacks work, and how to get the most from them.</p>
    <section class="card og-sec"><dl>${STACKS_GUIDE.map(([k, v]) => `<div class="og-row"><dt>${esc(k)}</dt><dd>${esc(v)}</dd></div>`).join('')}</dl>
    <div class="row" style="margin-top:10px;gap:8px;flex-wrap:wrap"><button class="btn small primary" data-goto="stacks">Open Stacks</button><button class="btn small" data-goto="arena">Compare models by task</button></div></section></div>`;
}
// Where a cloud AI is worth paying for: the big jobs a PC can't do well.
// [icon, need, why the cloud, best pick, also great, where you use it]
const EXPANDED_GUIDE = [
  ['🧠', 'Hard, multi-step work', 'Long plans, deep analysis, tricky maths and decisions with many moving parts need a model hundreds of times bigger than one a PC can hold.', 'Claude Opus 5.5', 'GPT-6 Astra · Gemini 4 Argon', 'In Quicksilver: connect it, then pick it in a chat or turn on "cloud for hard questions".'],
  ['💻', 'Coding and big projects', 'Reads a whole project at once, writes and fixes code across many files, and explains why.', 'Claude Opus 5.5 (Sonnet 5.5 for value)', 'GPT-6 Astra · Kimi · DeepSeek for low cost', 'In Quicksilver: chats, Fusion, or as the lead in a coding stack.'],
  ['📚', 'Huge documents and long video', 'Reads hundreds of pages, contracts or hour-long recordings in one go.', 'Gemini 4 Argon', 'Claude Opus 5.5', 'In Quicksilver: chats with files attached.'],
  ['📸', 'Professional pictures', 'Photo-real product shots, ads, portraits and scenes at high resolution, and edits that follow instructions closely. Local image models are good for drafts; these are print- and client-ready.', 'GPT Image (OpenAI, newest version)', 'Nano Banana 2 (Google, cheaper, great at edits) · FLUX (Black Forest Labs, artistic styles)', 'In Quicksilver: connect OpenAI, then Create → Image and pick the cloud model. FLUX via Together AI works the same way.'],
  ['🔤', 'Logos, posters and text in images', 'Gets spelling and lettering right, which most image models (and every small local one) still get wrong.', 'Ideogram 4.5', 'GPT Image', 'On Ideogram\'s own site; bring the result into Create to edit.'],
  ['🎬', 'Video', 'Makes sharp, smooth clips with sound in minutes. On a PC, video needs a big graphics card and still gives short, low-resolution clips.', 'Gemini Omni (Google; top of the video arena now) or Veo 3.1', 'Seedance 2.5 (best for bringing a photo to life) · Kling · Runway · Sora 2', 'On each service\'s own site or app for now; bring clips into Create → Video to trim and edit.'],
  ['🎙', 'Studio-quality voice', 'Natural narration, voice-overs and dubbing in many languages and voices.', 'ElevenLabs (v3)', 'Gemini TTS · Cartesia', 'On ElevenLabs\' site; Quicksilver\'s built-in voice stays free and private for everyday reading aloud.'],
  ['🎵', 'Music and songs', 'Full songs with vocals, or polished background tracks, from a short description.', 'Suno (songs with vocals)', 'Lyria 3 (Google, instrumentals) · ElevenLabs Music', 'On each service\'s own site; Create → Music makes quick tracks on your PC.'],
  ['🔎', 'Research with sources', 'Searches the live web and cites every claim.', 'Perplexity sonar-pro', 'Quicksilver\'s own free web search', 'In Quicksilver: connect Perplexity, or switch on Web in a chat.'],
];
function expandedGuideHTML() {
  return `<section class="card og-sec"><h3>🚀 When a cloud AI is worth it</h3>
    <p class="small" style="margin:0 0 10px">Your PC handles everyday chat, writing, photos and files privately and for free. Cloud AIs run on data-centre hardware, so they shine at the big jobs: harder thinking, professional pictures, video, studio voice and music. You only pay for what you use, and everything else stays on your PC. The catch: what you send leaves your PC, and most cloud services have content filters.</p>
    <div class="api-grid">${EXPANDED_GUIDE.map(([icon, need, why, best, also, where]) => `<div class="api-row"><b>${icon} ${esc(need)}</b>
      <div class="small muted">${esc(why)}</div>
      <div class="small">⭐ <b>Best:</b> ${esc(best)}</div><div class="small">➕ <b>Also great:</b> ${esc(also)}</div>
      <div class="small xp-where">${esc(where)}</div></div>`).join('')}</div>
    <p class="small muted" style="margin:10px 0 0">The best picks as of November 2026, from public blind-vote leaderboards. These change every few months; Quicksilver's update check tells you when a better model is out.</p></section>`;
}
function apisGuideHTML() {
  const row = ([name, tag, best, what, note]) => `<div class="api-row"><div class="row" style="gap:8px;flex-wrap:wrap"><b>${esc(name)}</b><span class="badge b-lav">${esc(tag)}</span></div>
    <div class="small">⭐ <b>Best model:</b> ${esc(best)}</div><div class="small">${esc(what)}</div><div class="small muted">${esc(note)}</div></div>`;
  return `<div class="og"><p class="help" style="margin-top:0">Quicksilver works without any cloud AI. These are the best ones to add, as of this version. Prices and free limits change often, so each service's card in Connect an API links to its current prices.</p>
    ${expandedGuideHTML()}
    <section class="card og-sec"><h3>✓ Free</h3><div class="api-grid">${API_GUIDE.free.map(row).join('')}</div></section>
    <section class="card og-sec"><h3>$ Paid</h3><div class="api-grid">${API_GUIDE.paid.map(row).join('')}</div></section>
    <section class="card og-sec"><h3>Which to choose</h3><dl>
      <div class="og-row"><dt>Most private</dt><dd>Your PC (offline or with Proton VPN). Nothing leaves it.</dd></div>
      <div class="og-row"><dt>Best free setup</dt><dd>Cerebras + Groq + Mistral, with free rotation and "cloud for hard questions" on.</dd></div>
      <div class="og-row"><dt>Best writing and code</dt><dd>Claude (paid), as the lead in a Fusion or for hard questions.</dd></div>
      <div class="og-row"><dt>Web research with sources</dt><dd>Perplexity (paid), or Quicksilver's own web search (free).</dd></div>
      <div class="og-row"><dt>Uncensored in the cloud</dt><dd>Venice or Featherless; for full privacy, the uncensored models on your PC.</dd></div>
      <div class="og-row"><dt>Lowest cost</dt><dd>DeepSeek for paid reasoning; the free plans above for everything else.</dd></div>
    </dl><div class="row" style="margin-top:10px"><button class="btn small primary" id="guide-connect">Connect a cloud AI</button></div></section></div>`;
}
function tipsGuideHTML() {
  return `<div class="og"><p class="help" style="margin-top:0">Small habits that make Quicksilver your best AI.</p>
    <section class="card og-sec"><div class="tips-grid">${TIPS_GUIDE.map(([k, v], i) => `<div class="tip-item"><span class="tip-n">${i + 1}</span><div><b>${esc(k)}</b><div class="small muted">${esc(v)}</div></div></div>`).join('')}</div></section></div>`;
}
function guidePageHTML() {
  const body = { options: optionsGuideHTML, stacks: stacksGuideHTML, apis: apisGuideHTML, tips: tipsGuideHTML }[guideTab] || optionsGuideHTML;
  return `<div class="tabs guide-tabs">${Object.entries(GUIDE_TABS).map(([k, l]) => `<button class="tab ${guideTab === k ? 'active' : ''}" data-guide-tab="${k}">${l}</button>`).join('')}</div>${body()}`;
}
function bindGuidePage() {
  $$('[data-guide-tab]').forEach((b) => b.addEventListener('click', () => { guideTab = b.dataset.guideTab; render(); }));
  $$('#main [data-goto]').forEach((b) => b.addEventListener('click', () => go({ view: b.dataset.goto })));
  $('#guide-connect')?.addEventListener('click', () => { modelsTab = 'api'; go({ view: 'models' }); });
}
// Links from elsewhere: data-guide="stacks" / "apis" / "tips" opens that tab of the guide.
document.addEventListener('click', (e) => {
  const b = e.target.closest('[data-guide]');
  if (!b) return;
  e.preventDefault();
  guideTab = b.dataset.guide; setTab = 'guide'; go({ view: 'settings' });
});
