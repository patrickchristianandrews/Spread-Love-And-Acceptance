// Settings → What's inside: the models and engines that ship with Quicksilver Liquid Edition, the
// full list of what it can do, and the feature notes for this release. Plain, honest, one place.
'use strict';

// Filled in from the main process (app.getVersion) the first time the tab is shown.
let aboutVersion = '';

// The AI and engines that come in the box.
const INSIDE_MODELS = [
  ['🧠', 'Qwen3.5 4B — the Brain', 'Uncensored (abliterated). Reasons step by step on hard questions and reads photos. Built into the installer, so Quicksilver answers the moment it opens.'],
  ['🏁', 'Gemma 3 12B — the Closer', 'Uncensored (abliterated), a different family (Google). Leads hard questions, writes well and sees photos. Comes in the full offline download; the slim installer fetches it before the app opens.'],
  ['✨', 'Mistral Nemo 12B — the Muse', 'Uncensored (abliterated), a third family (Mistral). A vivid storyteller that sketches fresh angles for creative work. Comes in the full offline download; the slim installer fetches it before the app opens.'],
  ['🔎', 'Nomic Embed v1.5 — Smarter search', 'A tiny model that lets Memory and your Library find things by meaning, not just keywords. Built in.'],
];
const INSIDE_ENGINES = [
  ['llama.cpp', 'runs the text and vision models on your processor or graphics card'],
  ['stable-diffusion.cpp', 'makes pictures on your own PC'],
  ['whisper.cpp', 'turns your voice into text'],
];

// Everything Quicksilver can do, grouped. [icon, title, what it is].
const FEATURE_GROUPS = [
  ['Private by design', [
    ['🔒', 'Runs on your PC', 'The bundled models answer entirely offline. Nothing you type leaves your computer unless you turn on web search or connect a cloud service.'],
    ['🛡️', 'Private / protected / online', 'Choose fully private (offline), private online through Proton VPN, or online. Every chat shows which it is.'],
    ['🙈', 'Uncensored, with an optional parental lock', 'The built-in models are uncensored. A PIN (Settings → General) can gate the uncensored models and teams for a family; everything else stays open.'],
  ]],
  ['Smarter answers', [
    ['🤖', 'Automatic model choice', 'Picks the best model for each question — a model that can see for photos, a coding model for code, the team for hard questions — and puts quick answers first.'],
    ['👥', 'AI Teams (stacks)', 'About 78 ready-made teams for real work, plus power moves (majority vote, red team, plan-then-solve, expert panel) built from your own models.'],
    ['🧬', 'Fusion builder', 'Combine models your own way, with a suggester for the best model or API to add for a task.'],
    ['✅', 'Double-check & self-correction', 'A second model checks uncertain numbers and facts; clear mistakes are rewritten once, marked "Corrected". Every sum in an answer is re-computed.'],
    ['👍', 'Learns your preferences', '👍/👎 on answers, your double-check results and your blind votes in Compare teach Automatic which model suits each kind of question.'],
  ]],
  ['Knows what you need', [
    ['🧠', 'Memory (Mem0-style)', 'Remembers lasting facts about you across all chats (your job, tools, how you like answers) and gives each answer only the ones that matter — found by meaning. On by default; view or clear it under Settings → Memory. It never stores secrets like passwords.'],
    ['📚', 'Your Library', 'Load your own files and websites; answers are searched and cited from them.'],
    ['🌐', 'Web search, no key', 'Checks the web by itself for current questions (news, prices, weather) and says so. Falls back to Wikipedia if search is blocked.'],
  ]],
  ['Pictures, video and music', [
    ['🖼️', 'Pictures, video and music', 'Ask in any chat, or set the message box to Picture or Video. Made on your own PC, or in the cloud. Free with Pollinations (no key, no account); connect fal.ai, Replicate or Stability for top quality; Venice for uncensored pictures.'],
    ['🎬', 'GIF maker & editing', 'Type /gif for a looping GIF made on your PC; trim, speed, crop and upscale video; vocal remover and read-aloud.'],
  ]],
  ['Gets things done', [
    ['🧩', 'Skills', 'Including find-a-product-from-a-photo, vibe-hacking (an idea becomes a runnable app), charts and file outputs.'],
    ['🔌', 'Connectors', 'GitHub, Slack, Google (Gmail, Calendar, Drive, Docs…), and more; writes ask first.'],
    ['🎓', 'Exam coaches', 'CPA and CIA review courses with lessons, practice questions and a progress dashboard.'],
    ['📝', 'Document editor & projects', 'Edit answers side by side as a document; group chats, files and instructions into projects.'],
  ]],
  ['Everyday', [
    ['🎙️', 'Voice typing & read-aloud', 'Speak instead of type; have answers read back.'],
    ['📱', 'Use from your phone', 'A private link to chat from your phone, synced to your PC.'],
    ['⚖️', 'Compare models', 'Blind side-by-side tests to see which model you actually prefer.'],
    ['🖥️', 'Your PC advisor', 'What your PC can run, honest speeds, and upgrade guidance with costs and cheaper alternatives.'],
    ['⬆️', 'Automatic updates', 'Checks once a day and downloads new versions in the background; you choose when to restart. Your big models are kept across updates.'],
  ]],
];

// This release's feature notes, pulled straight into Settings so "What's new" lives with the app.
const RELEASE_NOTES_2_23 = [
  ['Weather comes back as a picture, instantly', 'Ask about the weather and chat shows a live card — current conditions, a 24-hour strip and a 7-day forecast with hi/lo bars and rain chance — from a real forecast (never the model guessing), in °C or °F to suit your country.'],
  ['The web actually returns things in chat', 'Ask to see pictures or videos from the web and they appear under the answer, even on a small local model. Questions that need the live web — news, politics, prices, local events, "look it up" — are searched and cited automatically; simple facts stay instant and local.'],
  ['One solid source for plain facts', 'For universally-understood questions, chat pulls a single trusted Wikipedia summary instead of scraping many sites — faster and cleaner.'],
  ['The Polymath', 'A new crew member that connects economics, law, politics, history, science and philosophy, explains how society actually works in plain terms, pulls live cited news, and weighs every side fairly.'],
  ['See the Other Side', 'A new crew member for understanding people across a political or belief divide — explained from the inside or in conversation, always the strongest and most charitable version, never mocking and never trying to convert you.'],
  ['Check any laptop before you buy', 'The "models + your PC" buying calculator now includes the entry-level laptop graphics cards (RTX 4050, RTX 5050), so you can see what a budget gaming laptop will really run before buying.'],
  ['🔬 Microscope — look inside a model', 'Run a prompt on a local model and see every token it produced, how sure it was, and the alternatives — or put two models side by side and see exactly where they first diverge.'],
];

function aboutHTML() {
  const row = ([icon, title, desc]) => `<div class="ab-row"><span class="ab-ico">${icon}</span><div><b>${esc(title)}</b><div class="small muted">${esc(desc)}</div></div></div>`;
  const group = ([title, items]) => `<div class="ab-group"><h3>${esc(title)}</h3>${items.map(row).join('')}</div>`;
  return `<div class="stack-v about-page">
    <div class="card set-card">
      <h2 style="margin-top:0">Quicksilver Liquid Edition${aboutVersion ? ` <span class="small muted">· version ${esc(aboutVersion)}</span>` : ''}</h2>
      <p class="help" style="margin-top:-2px">A complete, private, uncensored AI that runs on your own PC, with optional free and paid cloud when you want more.</p>
    </div>

    <div class="card set-card">
      <h3 style="margin-top:0">🧠 The AI in the box</h3>
      <p class="help" style="margin-top:-2px">Uncensored by default. All of it runs on your computer.</p>
      ${INSIDE_MODELS.map(row).join('')}
      <div style="margin-top:12px"><b>Engines</b> <span class="small muted">— what runs the models on your machine</span>
        <ul class="ab-eng">${INSIDE_ENGINES.map(([n, d]) => `<li><b>${esc(n)}</b> — ${esc(d)}</li>`).join('')}</ul>
      </div>
    </div>

    <div class="card set-card">
      <h3 style="margin-top:0">✨ Everything it can do</h3>
      <div class="ab-groups">${FEATURE_GROUPS.map(group).join('')}</div>
    </div>

    <div class="card set-card">
      <h3 style="margin-top:0">🆕 What's new in this version</h3>
      ${RELEASE_NOTES_2_23.map(([t, d]) => `<div class="ab-row"><span class="ab-ico">•</span><div><b>${esc(t)}.</b> <span class="small muted">${esc(d)}</span></div></div>`).join('')}
    </div>
  </div>`;
}

function bindAbout() {
  if (!aboutVersion) {
    qs.call('app:version').then((v) => { aboutVersion = v || ''; const h = $('.about-page h2'); if (h && aboutVersion) h.innerHTML = `Quicksilver Liquid Edition <span class="small muted">· version ${esc(aboutVersion)}</span>`; }).catch(() => {});
  }
}
