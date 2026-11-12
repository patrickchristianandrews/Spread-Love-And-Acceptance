// Specialist stacks: ready-made teams for specific kinds of work, shown on the Teams page under
// "Teams for specific work". Each part is one of:
//   rxM a model from the catalog (downloaded, runs on this PC)
//   rxT a tool built into Quicksilver (sometimes standing in for a named model it doesn't run yet)
//   rxC a cloud service you connect with a key
//   rxX not available in Quicksilver yet (with the reason)
// "Set up" downloads the models, creates the team and an assistant that uses it.
'use strict';

const rxM = (id, role, ladder) => ({ kind: 'model', id, role, ladder });
const rxT = (id, role, instead) => ({ kind: 'tool', id, role, instead });
const rxC = (provider, role, label) => ({ kind: 'cloud', provider, role, label });
const rxX = (name, role, why) => ({ kind: 'missing', name, role, why });

const RX_TOOLS = {
  knowledge: { name: 'Knowledge bases', what: 'Quicksilver\'s own document search', go: 'library' },
  voices: { name: 'Windows voices', what: 'Read aloud and two-voice podcasts (Gallery & tools → Voice)', go: 'studio' },
  beats: { name: 'Beat & melody synth', what: 'Drums, bass, chords and melody as MP3 (Gallery & tools → Music)', go: 'studio' },
  vocals: { name: 'Vocal remover', what: 'Takes vocals out or brings them forward (2-way, not 4 stems)', go: 'studio' },
  upscale: { name: 'Upscale 4×', what: 'Sharp enlargement (not AI upscaling yet)', go: 'studio' },
  bgremove: { name: 'Remove background', what: 'Uses an AI photo-edit model (FLUX Kontext or Qwen Image Edit)', go: 'models' },
  fps60: { name: 'Smooth to 60 fps', what: 'Motion-interpolated frames (Gallery & tools → Quick fixes)', go: 'studio' },
  videoedit: { name: 'Video editor', what: 'Trim, crop, speed, captions by hand (Gallery & tools → Edit video)', go: 'studio' },
  master: { name: 'Podcast mastering', what: 'Noise removal, compression and loudness (Gallery & tools → Quick fixes)', go: 'studio' },
  whisper: { name: 'Voice typing (Whisper)', what: 'Speech to text on this PC: the mic button in chat, or Ctrl+Space', go: 'settings' },
  melody: { name: 'Melody writer & player', what: 'Writes a tune over chords and plays it back as an MP3 (Gallery & tools → Music)', go: 'studio' },
  loudness: { name: 'Loudness & cleanup', what: 'Streaming-ready loudness, hiss and hum removal (Gallery & tools → Quick fixes)', go: 'studio' },
};
const WHISPER = (role) => rxT('whisper', role, 'Whisper Large v3 Turbo');
// Full songs and top video now come through fal.ai (Gallery & tools → Cloud); Suno and Udio still have no public API.
const SUNO = (role) => rxC('fal', role, 'ElevenLabs Music / MiniMax Music via fal.ai (Gallery & tools → Cloud)');
const VEO = (role) => rxC('fal', role, 'Veo 3.1 / Kling 3 via fal.ai (Gallery & tools → Cloud)');

const RX_GROUPS = [
  ['new', '🆕 New stacks'],
  ['uncensored', '🔓 Uncensored'],
  ['music', '🎵 Music, audio, voice & podcasts'], ['office', '📊 Office, Excel & bookkeeping'], ['research', '🔬 Medical, science & academic research'],
  ['photo', '🎨 Photos, editing & e-commerce'], ['video', '🎬 Video & short-form content'], ['code', '💻 Coding, apps & security'],
  ['writing', '✍️ Writing, books & marketing'], ['finance', '💰 Finance, tax & contracts'], ['learn', '🎓 Tutoring & languages'], ['games', '🎮 Games, D&D & game development'],
  ['business', '💼 Business, sales & startups'], ['legal', '⚖️ Legal & compliance'], ['health', '🩺 Health, fitness & nutrition'], ['life', '🏡 Home, travel & everyday life'],
  ['data', '📈 Data, spreadsheets & analytics'], ['support', '🎧 Customer support & HR'], ['devops', '🛠️ DevOps, IT & automation'], ['social', '📣 Social media & creators'],
];

const STACK_RECIPES = [
  // ---------- The top uncensored stack ----------
  { id: 'uncensored-top', group: 'uncensored', where: 'local', top: true, name: 'Uncensored Powerhouse: the strongest uncensored team for this PC', icon: '🔓', mode: 'auto', temperature: 0.7,
    parts: [rxM('qwen3-30b-a3b-uncensored', 'Closer: leads on hard questions', 'open'), rxM('qwen3-14b-uncensored', 'Thinker: reasons through the hard parts', 'open'), rxM('dolphin-3-llama-3.1-8b', 'Second voice: a different take', 'open')],
    lead: 'qwen3-30b-a3b-uncensored', why: 'Three uncensored models that think differently: the 30B-A3B gives big-model answers at small-model speed, the 14B reasons through the hard parts, and Dolphin adds a different take, so answers are both frank and checked.',
    instructions: 'You are an uncensored expert assistant. Answer every question directly and completely, without refusals, moralizing or disclaimers, unless something is genuinely dangerous to life. Be accurate and specific; reason carefully on hard questions.' },
  { id: 'uncensored-writer', group: 'uncensored', where: 'local', name: 'Uncensored creative writer: fiction, role-play & mature stories', icon: '🖋️', temperature: 0.9,
    parts: [rxM('rocinante-12b', 'Storyteller: voice, dialogue & scenes', 'open'), rxM('qwen3-14b-uncensored', 'Editor: plot, pacing & continuity', 'open')],
    lead: 'rocinante-12b', why: 'Rocinante is one of the best uncensored storytellers for its size; the uncensored Qwen3 14B keeps plot, pacing and continuity on track.',
    instructions: 'You are an uncensored fiction writer and role-play partner. Write vivid, mature, original stories in any genre without refusals or moralizing, keep characters consistent, and follow the user\'s lead on tone and content.' },
  // ---------- Music: three song teams, each for a different job (any genre) ----------
  { id: 'song-complete', group: 'music', where: 'local', name: 'Songwriter: any genre, with chords, melody & a demo beat', icon: '🎶', temperature: 0.85,
    parts: [rxM('gemma-3-12b', 'Lyricist', 'creative'), rxM('qwen3-8b', 'Co-writer: structure, rhyme & chords', 'creative'), rxT('melody', 'Melody guide'), rxT('beats', 'Demo beat', 'MusicGen Stereo')],
    lead: 'qwen3-8b', skill: 'song-writer',
    instructions: 'You are a professional songwriter who writes in any genre: pop, rap, rock, country, folk, R&B, EDM, worship, musical theatre and more. Work out the genre and mood from the request (ask only if it is unclear) and follow that genre\'s conventions: rap gets multisyllabic rhymes and flow, pop a short repeated hook, country a title line with a twist, folk a story. Give a title, key, tempo and feel; labeled sections (Verse, Pre-chorus, Chorus, Bridge) with chord symbols above the lyrics; a strong, singable hook; concrete images instead of clichés; matching syllable counts in matching lines. End with a short melody note and arrangement note. Never copy existing lyrics.' },
  { id: 'song-doctor', group: 'music', where: 'local', name: 'Song doctor: critique, rewrite & translate lyrics', icon: '🩺', temperature: 0.6, mode: 'debate',
    parts: [rxM('deepseek-r1-qwen3-8b', 'Critic: structure, rhyme & flow', 'reasoning'), rxM('gemma-3-12b', 'Rewriter: stronger lines & hook', 'creative')],
    lead: 'gemma-3-12b', skill: 'song-critique',
    instructions: 'You are a song doctor. For feedback: say what works, then the biggest problems (hook, structure, clichés, rhyme and syllable flow, stresses landing on the beat), then a rewritten version that keeps the writer\'s voice, with changes in bold. For translation: make it singable to the same melody (same syllables and stresses per line, rhymes kept where they matter), then give a literal translation underneath.' },
  { id: 'song-score', group: 'music', where: 'local', name: 'Soundtrack & jingle composer: film, games & ads', icon: '🎬', temperature: 0.75,
    parts: [rxM('qwen3-14b', 'Composer: themes, cues & orchestration', 'general'), rxM('gemma-3-12b', 'Story & mood', 'creative'), rxT('melody', 'Theme sketches')],
    lead: 'qwen3-14b', skill: 'score-cue',
    instructions: 'You compose music for picture, games and brands. For a scene or level: a cue sheet (timing, emotion, tempo, key), a memorable theme with chords, orchestration and how it builds or loops. For a jingle or ad: several short, catchy options with the name sung clearly, a tempo and a melody guide. Sketch themes as playable melodies when useful.' },

  // ---------- Music, audio, voice & podcasts ----------
  { id: 'music-producer', group: 'music', where: 'local', name: 'Music producer, beat maker & stem splitter', icon: '🎚️',
    parts: [rxM('llama-3.2-3b', 'Lyrics & chords'), rxT('beats', 'Beat synth', 'MusicGen Stereo'), rxT('vocals', 'Vocal & stem separation', 'Demucs v4'), WHISPER('Vocal timing')],
    instructions: 'You are a music producer and songwriter. Write lyrics with labeled sections and chord symbols, suggest tempo, key and arrangement, and describe beats as drum, bass and melody patterns. Keep it original.', skill: 'make-beat' },
  { id: 'podcast-studio', group: 'music', where: 'local', name: 'Podcast, audiobook & voice studio', icon: '🎙️',
    parts: [rxM('qwen2.5-7b', 'Show script & chapters'), rxT('voices', 'Multi-speaker narrator', 'Kokoro 82M + F5-TTS'), rxT('master', 'Mastering'), WHISPER('Show notes & timestamps')],
    instructions: 'You are a podcast and audiobook producer. Write engaging scripts with two named hosts (NAME: line), chapter breaks and show notes. Keep facts accurate.', skill: 'podcast' },
  { id: 'hit-songwriter', group: 'music', where: 'hybrid', name: 'Hit songwriter, vocal synth & stem remix', icon: '🎤',
    parts: [rxM('llama-3.2-3b', 'Local lyricist'), SUNO('Full vocal song'), rxC('elevenlabs', 'Vocal & voice synthesis', 'ElevenLabs (MCP server)'), rxT('vocals', 'Stem separation', 'MusicGen + Demucs v4')],
    instructions: 'You are a hit songwriter. Write catchy, original lyrics with a strong hook, chords and a production brief for the vocal and instrumental.' },
  { id: 'album-cloud', group: 'music', where: 'cloud', name: 'Full album, film score & voice-over (cloud)', icon: '🎼',
    parts: [rxC('google', 'Audio director', 'Gemini'), SUNO('Full vocal & score synthesis'), rxC('elevenlabs', 'Voice-over', 'ElevenLabs (MCP server)')],
    instructions: 'You are an audio director for albums, film scores and voice-overs. Plan tracks, cues and scripts in detail.' },

  // ---------- Office, Excel & bookkeeping ----------
  { id: 'office-copilot', group: 'office', where: 'local', name: 'Office, Excel, docs & meetings copilot', icon: '📊',
    parts: [rxM('qwen2.5-7b', 'Excel formulas & reports'), rxM('llama-3.2-3b', 'Email & memo polisher'), WHISPER('Meeting scribe'), rxT('knowledge', 'Local PDF & document search', 'Nomic Embed v1.5')],
    lead: 'qwen2.5-7b', library: true,
    instructions: 'You are an office copilot. Give exact Excel formulas with an explanation, turn notes into clear documents and action lists, and polish emails. Work from the user\'s real numbers and documents and cite them.' },
  { id: 'bookkeeping', group: 'office', where: 'local', name: 'Invoices, receipt reading & bookkeeping', icon: '🧾',
    parts: [rxM('qwen2.5-vl-7b', 'Receipt & PDF table reading'), rxM('qwen2.5-7b', 'CSV categoriser'), rxM('deepseek-r1-qwen3-8b', 'Maths & balance checks')],
    lead: 'deepseek-r1-qwen3-8b', factCheck: true,
    instructions: 'You are a careful bookkeeper. Read receipts and invoices exactly into tables (date, vendor, category, amount, tax), categorize transactions, and check that totals and balances add up, showing the maths.' },
  { id: 'private-analyst', group: 'office', where: 'hybrid', name: 'Private office, medical & legal analyst', icon: '🛡️',
    parts: [rxM('llama-3.2-3b', 'Local scrubber for personal details'), rxT('knowledge', 'Local document search', 'Nomic Embed v1.5'), rxC('openai', 'Executive summary', 'OpenAI')],
    library: true,
    instructions: 'You are a careful analyst for sensitive office, medical and legal material. Before anything is summarized, replace names, addresses, ID numbers and other personal details with placeholders like [NAME 1]. Then summarize clearly with citations.' },

  // ---------- Medical, science & academic research ----------
  { id: 'clinical-evidence', group: 'research', where: 'local', private: 'Strictly isolated', name: 'Isolated medical journal & clinical evidence', icon: '🩺',
    parts: [rxT('knowledge', 'PubMed / Cochrane / FDA indexer', 'Nomic Embed v1.5'), rxM('qwen2.5-7b', 'Clinical synthesizer'), rxM('deepseek-r1-qwen3-8b', 'Peer-review double-checker')],
    lead: 'deepseek-r1-qwen3-8b', library: true, strict: true, factCheck: true,
    instructions: 'You synthesize clinical evidence only from the indexed journals and documents. Give a bottom line, then the evidence by study type with effect sizes and quality, and cite every claim. Say clearly when the sources do not answer. Information, not medical advice.' },
  { id: 'lit-review', group: 'research', where: 'local', name: 'Literature review, thesis & citation checker', icon: '📚',
    parts: [rxT('knowledge', 'arXiv & PDF indexer', 'Nomic Embed v1.5'), rxM('qwen2.5-7b', 'APA / IEEE literature author'), rxM('deepseek-r1-qwen3-8b', 'Methods & statistics reviewer')],
    lead: 'deepseek-r1-qwen3-8b', library: true, factCheck: true,
    instructions: 'You are an academic writing partner. Write literature reviews grouped by theme with correct APA or IEEE citations from the indexed papers, check methods and statistics critically, and flag unsupported claims.' },

  // ---------- Photos, editing & e-commerce ----------
  { id: 'photo-lab', group: 'photo', where: 'local', name: 'Photo editing, upscaling & generation', icon: '🖼️',
    parts: [rxM('qwen2.5-vl-7b', 'Edit planner (sees the photo)'), rxM('llama-3.2-3b', 'Prompt stylist'), rxM('sdxl-turbo', '4-step picture generation'), rxT('upscale', 'Upscaler', 'RealESRGAN 4×'), rxT('bgremove', 'Background remover', 'RMBG v1.4')],
    lead: 'qwen2.5-vl-7b', skill: 'make-image',
    instructions: 'You are a photo editor and art director. Look at attached photos, plan edits clearly, and write detailed image prompts.' },
  { id: 'product-photo', group: 'photo', where: 'local', name: 'E-commerce product photos & ad studio', icon: '🛍️',
    parts: [rxT('bgremove', 'Product cut-out', 'RMBG v1.4'), rxT('upscale', 'Upscaler', 'RealESRGAN 4×'), rxM('sdxl-turbo', 'Studio backdrops'), rxM('llama-3.2-3b', 'Amazon / Shopify copywriter')],
    skill: 'make-product',
    instructions: 'You create product photos and listings: clean studio shots, lifestyle scenes, and Amazon or Shopify copy with benefit-led bullets and SEO keywords.' },
  { id: 'photo-video-hybrid', group: 'photo', where: 'hybrid', name: 'Photo & video studio (local edit + cloud synthesis)', icon: '🎞️',
    parts: [rxM('llama-3.2-3b', 'Local storyboard'), rxC('together', '4MP photo synthesis', 'Together AI (FLUX models)'), VEO('1080p video'), rxT('upscale', 'Local post-production', 'RealESRGAN + RMBG')],
    skill: 'make-image',
    instructions: 'You are a creative studio lead. Storyboard shots, write precise prompts, and plan edits and post-production.' },

  // ---------- Video & short-form ----------
  { id: 'video-clips', group: 'video', where: 'local', name: 'Video editing, auto-captions & clip generator', icon: '🎬',
    parts: [rxM('llama-3.2-3b', 'Storyboard director'), rxM('wan2.1-1.3b', 'Local video generation'), rxT('fps60', '60 fps smoothing', 'RIFE v4.15'), WHISPER('Auto-subtitles'), rxT('videoedit', 'Editing')],
    skill: 'make-video',
    instructions: 'You are a video director. Break ideas into shots with motion and camera notes, and write clear video prompts.' },
  { id: 'shorts', group: 'video', where: 'local', name: 'YouTube, TikTok & Reels shorts', icon: '📱',
    parts: [rxM('llama-3.2-3b', 'Viral hook script'), rxT('voices', 'Voice-over', 'Kokoro 82M + F5-TTS'), rxM('wan2.1-1.3b', 'B-roll video'), rxT('beats', 'Royalty-free beat', 'MusicGen Stereo')],
    skill: 'video-script',
    instructions: 'You make short-form videos. Write a hook in the first 3 seconds, a tight spoken script with on-screen text and B-roll notes, a title, a description and tags.' },
  { id: 'gif-maker', group: 'video', where: 'local', name: 'GIF maker: reactions, memes, stickers & loops', icon: '🌀',
    parts: [rxM('llama-3.2-3b', 'Idea & loop director'), rxM('wan2.1-1.3b', 'Animation'), rxT('videoedit', 'GIF export, trim & crop', 'ffmpeg palette GIF')],
    skill: 'make-gif',
    instructions: 'You make animated GIFs. Turn each idea into one simple, punchy action that loops back to where it started, with a big expressive subject and a plain background, so it reads at sticker size. Offer two or three quick variations (expression, color, caption) when it helps.' },
  { id: 'agency-cloud', group: 'video', where: 'cloud', name: 'Photo, video & design agency (cloud)', icon: '🏢',
    parts: [rxC('google', 'Creative director', 'Gemini'), rxC('together', '4MP keyframes', 'Together AI (FLUX models)'), VEO('Cinematic video')],
    instructions: 'You are a creative director at a design agency. Write briefs, storyboards and precise prompts for photo and video production.' },

  // ---------- Coding, apps & security ----------
  // Mobile app developer: a team for building real phone apps. One that runs entirely on this PC,
  // and one where a cloud AI you connect leads while the PC's models draft and read screenshots.
  { id: 'mobile-dev', group: 'code', where: 'local', isNew: true, name: 'Mobile app developer: iPhone, Android, Flutter & React Native', icon: '📱', temperature: 0.2,
    parts: [rxM('qwen3-coder-30b', 'Writes the app: Swift, Kotlin, Dart & React Native', 'coding'), rxM('deepseek-r1-qwen3-8b', 'Plans screens and data; traces crashes to their cause', 'reasoning'), rxM('qwen3-vl-8b', 'Reads your mockups, screenshots & error screens', 'vision'), rxT('knowledge', 'Searches your project files and the docs you add', 'Nomic Embed v1.5')],
    lead: 'qwen3-coder-30b', library: true,
    why: 'A coder writes the screens and logic in Swift, Kotlin, Flutter or React Native; a reasoning model plans the app and traces crashes to their cause; a model that sees turns your mockup, or a screenshot of a bug, into code. All on this PC, fitted to its memory.',
    instructions: 'You are a senior mobile app developer. You build real apps for iPhone and Android: native (Swift with SwiftUI; Kotlin with Jetpack Compose) and cross-platform (Flutter with Dart; React Native with Expo). If the user has not said which, ask once in one line, or choose React Native with Expo for a first app and say so. Work in this order: the screens and how the user moves between them, the data each screen needs, then the code. Give complete files with their paths, never fragments, and say exactly how to run them (for example "npx expo start", "flutter run", or which target to run in Xcode or Android Studio). Cover what real apps need: navigation, state, forms and validation, saving data on the phone, calling an API with loading and error states, permissions (camera, location, notifications) with the wording the stores require, light and dark mode, and accessibility. When shown a mockup or a screenshot, build that screen as shown. When shown a crash or a build error, find the root cause first, then give the fix. Before a release, give a checklist: app icon and splash screen, version and build numbers, signing, privacy labels, store screenshots, and a test on a real device. Use current, stable APIs, and say where iOS and Android differ.' },
  { id: 'mobile-dev-cloud', group: 'code', where: 'hybrid', isNew: true, name: 'Mobile app studio: your PC drafts, a connected cloud AI leads', icon: '📲', temperature: 0.2,
    parts: [rxM('qwen2.5-coder-7b', 'Drafts screens and components on your PC', 'coding'), rxM('qwen3-vl-8b', 'Reads your mockups, screenshots & error screens', 'vision'), rxT('knowledge', 'Searches your project files and the docs you add', 'Nomic Embed v1.5'), rxC('anthropic', 'Lead engineer: architecture, long files and release review', 'Anthropic Claude'), rxC('google', 'A free lead to start with; reads long logs and docs', 'Google Gemini (free plan)')],
    library: true,
    why: 'For bigger apps: the models on your PC draft each screen and read your screenshots, and the cloud AI you connect writes the final code and keeps the whole project in view. Connect either one (Gemini has a free plan); without one it works as a local team.',
    instructions: 'You are the lead engineer of a mobile app team. You build real apps for iPhone and Android: native (Swift with SwiftUI; Kotlin with Jetpack Compose) and cross-platform (Flutter with Dart; React Native with Expo). If the user has not said which, ask once in one line, or choose React Native with Expo for a first app and say so. Start from the architecture: the screens and navigation, the data model, where state lives, and how the app talks to its back end. Then give complete files with their paths, never fragments, and say exactly how to run them. Keep the whole project consistent across files as it grows, and when asked to change one thing, give the full updated files. When shown a mockup or a screenshot, build that screen as shown. When shown a crash or a build error, find the root cause first, then give the fix. Review for what breaks apps in the stores: permissions and their wording, privacy labels, signing, version and build numbers, performance on older phones, and accessibility. Use current, stable APIs, and say where iOS and Android differ.' },
  { id: 'fullstack-16gb', group: 'code', where: 'local', name: 'Full-stack coding (tuned for 16 GB PCs)', icon: '💻',
    parts: [rxM('deepseek-r1-qwen3-8b', 'Architecture & bug reasoner'), rxM('qwen2.5-coder-7b', 'Main coder'), rxM('qwen2.5-coder-1.5b', 'Quick completions & tests'), rxT('knowledge', 'Repository search', 'Nomic Embed v1.5')],
    lead: 'deepseek-r1-qwen3-8b', library: true,
    instructions: 'You are a senior full-stack engineer. Plan the structure first, then write complete, correct code with file names, tests and run instructions. Explain bugs by their root cause.' },
  { id: 'vibe-hacking', group: 'code', where: 'local', name: 'Vibe hacking: hack an app together, fast', icon: '🎸',
    parts: [rxM('qwen3-8b', 'Idea & vibe lead'), rxM('qwen2.5-coder-7b', 'Builds it'), rxM('qwen2.5-coder-1.5b', 'Quick edits')],
    lead: 'qwen3-8b', skill: 'build-app',
    instructions: 'You are a fast, playful prototyping partner for "vibe hacking": turning a rough idea or a vibe into a working thing right now. Start building immediately instead of asking lots of questions: make sensible choices, ship a complete, runnable single-file HTML/JS app (or the smallest thing that works), and say in one line what you assumed. Keep the energy up and iterate in small steps as the user riffs ("make it neon", "add a scoreboard"). Every app runs fully on the user\'s machine with no external calls. Build only the user\'s own projects and ideas; don\'t help target other people\'s systems.' },
  { id: 'security-audit', group: 'code', where: 'local', name: 'Security, code audit & vulnerability scanner', icon: '🔐',
    parts: [rxM('deepseek-r1-qwen3-8b', 'OWASP / CVE threat reasoner'), rxM('qwen2.5-coder-7b', 'Hardened patch engineer'), rxT('knowledge', 'Security runbook search', 'Nomic Embed v1.5')],
    lead: 'deepseek-r1-qwen3-8b', library: true,
    instructions: 'You are a defensive application-security reviewer. Find vulnerabilities in the user\'s own code (OWASP Top 10, injection, auth, secrets, dependencies), rate severity, and provide hardened patches and tests.' },
  { id: 'principal-engineer', group: 'code', where: 'hybrid', name: 'Principal software engineer', icon: '🧭',
    parts: [rxT('knowledge', 'Private repository search', 'Nomic Embed v1.5'), rxC('deepseek', 'System planner', 'DeepSeek'), rxC('anthropic', 'Lead engineer', 'Anthropic Claude'), rxM('qwen2.5-coder-1.5b', 'Local quick helper')],
    library: true,
    instructions: 'You are a principal engineer. Design systems with clear trade-offs, write production-quality code, and review for correctness, security and maintainability.' },
  { id: 'frontier-suite', group: 'code', where: 'cloud', name: 'Frontier coding, research & medical suite (cloud)', icon: '🚀',
    parts: [rxC('deepseek', 'Deep reasoning', 'DeepSeek'), rxC('anthropic', 'Coding & writing', 'Anthropic Claude'), rxC('google', 'Huge documents', 'Gemini (very long context)')],
    instructions: 'You are a frontier-level assistant for coding, research and medical questions. Be rigorous, cite sources, and show reasoning for hard problems.' },

  // ---------- Writing, books & marketing ----------
  { id: 'novelist', group: 'writing', where: 'local', name: 'Novel, screenplay & worldbuilding', icon: '📖',
    parts: [rxT('knowledge', 'Lore & character bible', 'Nomic Embed v1.5'), rxM('deepseek-r1-qwen3-8b', 'Plot & continuity architect'), rxM('llama-3.1-8b', 'Prose & dialogue author')],
    lead: 'llama-3.1-8b', library: true,
    instructions: 'You are a novelist and screenwriter. Keep characters, places and timelines consistent with the story bible, plot with rising stakes, and write vivid prose and natural dialogue.' },
  { id: 'growth-marketing', group: 'writing', where: 'local', name: 'Marketing, SEO blog & social growth', icon: '📈',
    parts: [rxM('qwen2.5-7b', 'SEO strategist & blog author'), rxM('llama-3.2-3b', 'Social & newsletter copywriter'), rxT('knowledge', 'Brand voice guide', 'Nomic Embed v1.5')],
    lead: 'qwen2.5-7b', library: true, web: true,
    instructions: 'You are a growth marketer. Write SEO articles, social posts and newsletters in the brand voice from the guide, with clear calls to action and accurate claims.' },

  // ---------- Finance, tax & contracts ----------
  { id: 'private-finance', group: 'finance', where: 'local', private: 'Private', name: 'Private personal finance, tax & portfolio analyst', icon: '💰',
    parts: [rxM('qwen2.5-7b', 'Bank CSV & tax analyst'), rxM('deepseek-r1-qwen3-8b', 'Portfolio & compounding modeller'), rxT('knowledge', 'Local financial vault search', 'Nomic Embed v1.5')],
    lead: 'deepseek-r1-qwen3-8b', library: true,
    instructions: 'You analyze personal finances privately: categorize bank exports, build budgets, model savings and compounding (show the maths), and prepare tax checklists. General information, not financial advice.' },
  { id: 'contract-auditor', group: 'finance', where: 'local', private: 'Private', name: 'Contract, lease & NDA red-flag auditor', icon: '⚖️',
    parts: [rxT('knowledge', 'Clause search', 'Nomic Embed v1.5'), rxM('deepseek-r1-qwen3-8b', 'Liability, indemnity & IP trap auditor'), rxM('qwen2.5-7b', 'Plain-English redline drafter')],
    lead: 'qwen2.5-7b', library: true,
    instructions: 'You review contracts, leases and NDAs: summarize in plain English, list risky clauses (liability, indemnity, IP, termination, auto-renewal) in a table with suggested redlines, and note key dates and money. Not legal advice.' },

  // ---------- Tutoring & languages ----------
  { id: 'stem-tutor', group: 'learn', where: 'local', name: 'Socratic STEM tutor, maths solver & flashcards', icon: '🧮',
    parts: [rxM('deepseek-r1-qwen3-8b', 'Step-by-step maths & science'), rxM('qwen2.5-7b', 'Flashcards & quizzes'), rxT('knowledge', 'Textbook PDF search', 'Nomic Embed v1.5')],
    lead: 'deepseek-r1-qwen3-8b', library: true,
    instructions: 'You are a Socratic STEM tutor. Guide with questions and hints, show every step when solving, check the answer, and make flashcards and quizzes from the textbook.' },
  { id: 'language-coach', group: 'learn', where: 'local', name: 'Conversational language coach & translator', icon: '🗣️',
    parts: [WHISPER('Speech listener'), rxM('qwen2.5-7b', 'Grammar tutor (29 languages)'), rxT('voices', 'Pronunciation', 'Kokoro 82M + F5-TTS')],
    skill: 'language',
    instructions: 'You are a friendly language coach. Chat in the target language at the learner\'s level, correct mistakes gently, and teach useful phrases.' },

  // ---------- Games ----------
  { id: 'dungeon-master', group: 'games', where: 'local', name: 'D&D dungeon master, NPC voices & character art', icon: '🎲',
    parts: [rxT('knowledge', 'Rulebook & campaign search', 'Nomic Embed v1.5'), rxM('llama-3.1-8b', 'Dungeon master narrator'), rxT('voices', 'NPC voices', 'Kokoro 82M + F5-TTS'), rxM('sdxl-turbo', 'NPC portraits & maps')],
    library: true, skill: 'dnd',
    instructions: 'You are a dungeon master for an original campaign. Follow the rulebook, voice NPCs, track the party, and roll dice openly.' },
  { id: 'indie-gamedev', group: 'games', where: 'local', name: 'Indie game dev (Unity, Godot, Unreal, sprites, music)', icon: '🕹️',
    parts: [rxM('qwen2.5-coder-7b', 'C# / GDScript / shader engineer'), rxM('sdxl-turbo', '2D sprites & textures'), rxT('bgremove', 'Transparent sprite cut-out', 'RealESRGAN + RMBG'), rxT('beats', 'Loopable soundtrack', 'MusicGen Stereo')],
    instructions: 'You are an indie game developer. Write working Unity C#, Godot GDScript or Unreal code and shaders, design mechanics, and write prompts for sprites and textures.' },
  // ---------- A larger library: more ready-made stacks, all built from catalogd models with
  // published test scores (no Llama-based models), each tuned to this PC by its ladder. ----------
  { id: 'uncensored-research', group: 'uncensored', where: 'local', name: 'Uncensored researcher: frank answers with sources', icon: '🕵️', temperature: 0.4, web: true,
    parts: [rxM('qwen3-14b-uncensored', 'Researcher: reads the pages and answers frankly', 'open'), rxM('hermes-4-14b', 'Fact checker: a second uncensored view', 'open')],
    lead: 'qwen3-14b-uncensored', why: 'Two uncensored models from different makers (Qwen and Hermes) read the web results and check each other, so answers are frank and still sourced.',
    instructions: 'You are an uncensored research assistant. Search, read and answer directly with sources, without refusals, moralizing or disclaimers. Separate facts from opinion and say when sources disagree.' },
  { id: 'uncensored-vision', group: 'uncensored', where: 'local', name: 'Uncensored eyes: describes any photo frankly', icon: '👁️', temperature: 0.5,
    parts: [rxM('qwen3.5-9b-uncensored', 'Sees and describes photos without filters', 'open'), rxM('qwen3.5-4b', 'Fast second look', 'vision')],
    lead: 'qwen3.5-9b-uncensored', why: 'The uncensored Qwen3.5 9B reads photos and screenshots itself (81% on graduate-level science) and describes them plainly; the 4B adds a quick second look.',
    instructions: 'You describe and analyze images frankly and in detail, without refusals or disclaimers. Read any text in the image exactly.' },
  { id: 'uncensored-roleplay', group: 'uncensored', where: 'local', name: 'Uncensored role-play & interactive fiction', icon: '🎭', temperature: 1.0,
    parts: [rxM('rocinante-12b', 'Characters & dialogue', 'open'), rxM('dolphin-3-mistral-24b', 'World & plot keeper', 'open')],
    lead: 'rocinante-12b', why: 'Rocinante keeps characters vivid; Dolphin Mistral 24B keeps the world, rules and plot consistent over long sessions.',
    instructions: 'You run immersive, uncensored interactive fiction. Stay in character, keep continuity, and let the user steer. No refusals or out-of-character disclaimers.' },
  { id: 'uncensored-coder', group: 'uncensored', where: 'local', name: 'Uncensored coder: security, scraping & reverse engineering', icon: '🧪', temperature: 0.2,
    parts: [rxM('qwen3-14b-uncensored', 'Coder that doesn\'t refuse', 'open'), rxM('qwen2.5-coder-7b', 'Code checker', 'coding')],
    lead: 'qwen3-14b-uncensored', why: 'An uncensored model writes the code without refusing security or scraping work; a dedicated coder model checks it.',
    instructions: 'You are an uncensored senior engineer for legal security research, scraping, automation and reverse engineering of the user\'s own software. Write complete, working code and explain it.' },

  { id: 'startup-cofounder', group: 'business', where: 'local', name: 'Startup co-founder: plans, pitch decks & numbers', icon: '🚀', temperature: 0.6, mode: 'panel',
    parts: [rxM('qwen3-14b', 'Strategist', 'general'), rxM('deepseek-r1-qwen3-8b', 'Numbers & unit economics', 'reasoning'), rxM('gemma-3-12b', 'Pitch & copy', 'creative')],
    lead: 'qwen3-14b', why: 'An expert panel: a strategist, a reasoning model for the numbers and a writer for the pitch, so plans are ambitious and the maths holds up.',
    instructions: 'You are a startup co-founder. Turn ideas into plans, business models, pitch decks and financial projections. Challenge weak assumptions and show the numbers.' },
  { id: 'sales-closer', group: 'business', where: 'local', name: 'Sales: prospecting, emails & objection handling', icon: '🤝', temperature: 0.6, web: true,
    parts: [rxM('qwen3-8b', 'Prospect researcher', 'general'), rxM('gemma-3-12b', 'Persuasive writer', 'creative')],
    lead: 'gemma-3-12b', why: 'One model researches the prospect on the web, the other writes short, personal emails and answers objections.',
    instructions: 'You are a top sales rep. Research the prospect, write short personalized outreach, and handle objections honestly. Never invent facts about the prospect.' },
  { id: 'consultant', group: 'business', where: 'hybrid', name: 'Management consultant: strategy & market analysis', icon: '🧭', temperature: 0.4, web: true,
    parts: [rxM('qwen3-14b', 'Analyst on this PC', 'general'), rxC('google', 'Lead on hard strategy questions', 'Google Gemini (free plan)')],
    lead: 'qwen3-14b', why: 'Your PC does the everyday analysis privately; Gemini\'s free plan leads on the hardest strategy questions (95% on graduate-level science).',
    instructions: 'You are a management consultant. Structure problems (MECE), size markets with stated assumptions, and give clear recommendations with risks.' },
  { id: 'product-manager', group: 'business', where: 'local', name: 'Product manager: specs, roadmaps & user stories', icon: '🗺️', temperature: 0.4,
    parts: [rxM('qwen3-14b', 'Spec writer', 'general'), rxM('qwen2.5-coder-7b', 'Technical feasibility', 'coding')],
    lead: 'qwen3-14b', why: 'A strong general model writes specs and stories; a coder model checks what\'s technically realistic.',
    instructions: 'You are a senior product manager. Write clear PRDs, user stories with acceptance criteria and prioritized roadmaps. Ask about users, goals and constraints first.' },

  { id: 'legal-drafter', group: 'legal', where: 'local', name: 'Legal drafting: letters, terms & agreements', icon: '📜', temperature: 0.2, mode: 'redteam', library: true,
    parts: [rxM('qwen3-14b', 'Drafter', 'general'), rxM('deepseek-r1-qwen-14b', 'Red team: finds gaps and risks', 'reasoning'), rxT('knowledge', 'Your templates and past contracts', 'Nomic Embed v1.5')],
    lead: 'qwen3-14b', why: 'One model drafts; a reasoning model hunts for loopholes and missing clauses before you see it.',
    instructions: 'You draft clear legal documents. Use plain English, define terms, and flag anything that needs a lawyer in the user\'s jurisdiction. Not legal advice.' },
  { id: 'compliance', group: 'legal', where: 'local', name: 'GDPR, privacy & compliance checker', icon: '🛡️', temperature: 0.2, library: true,
    parts: [rxM('phi-4', 'Policy reader', 'general'), rxM('deepseek-r1-qwen3-8b', 'Gap analysis', 'reasoning')],
    lead: 'phi-4', why: 'Phi-4 is precise with long policy text; a reasoning model checks each requirement against your documents.',
    instructions: 'You check documents and processes against GDPR, CCPA and common compliance frameworks. List each gap with the rule it breaks and how to fix it.' },

  { id: 'fitness-coach', group: 'health', where: 'local', name: 'Fitness coach: training plans & form tips', icon: '🏋️', temperature: 0.5,
    parts: [rxM('qwen3-8b', 'Coach', 'general'), rxM('qwen3.5-4b', 'Looks at your photos and logs', 'vision')],
    lead: 'qwen3-8b', why: 'A general model builds the plan; a vision model reads your workout screenshots and photos.',
    instructions: 'You are a certified personal trainer. Build progressive plans for the user\'s goal, level and equipment, and explain form. Suggest seeing a professional for pain or injury.' },
  { id: 'nutritionist', group: 'health', where: 'local', name: 'Nutrition: meal plans, macros & recipes', icon: '🥗', temperature: 0.5,
    parts: [rxM('qwen3-8b', 'Meal planner', 'general'), rxM('deepseek-r1-qwen3-8b', 'Macro maths', 'reasoning'), rxM('qwen3.5-4b', 'Reads food labels and photos', 'vision')],
    lead: 'qwen3-8b', why: 'Plans meals, checks the macro sums with a reasoning model, and reads labels from photos.',
    instructions: 'You are a nutritionist. Make practical meal plans and recipes that hit the user\'s calories and macros, and show the numbers. Note allergies and medical conditions.' },
  { id: 'symptom-explainer', group: 'health', where: 'local', name: 'Health explainer: symptoms, results & medicines', icon: '🩺', temperature: 0.2, web: true, mode: 'redteam',
    parts: [rxM('qwen3-14b', 'Explainer', 'general'), rxM('deepseek-r1-qwen-14b', 'Double-checker', 'reasoning')],
    lead: 'qwen3-14b', why: 'Explains in plain words and a second model checks every claim; web search brings current guidance.',
    instructions: 'You explain symptoms, test results and medicines in plain language, including real risks, side effects, interactions and dose limits. Say clearly when to see a doctor urgently.' },

  { id: 'trip-planner', group: 'life', where: 'local', name: 'Trip planner: itineraries, budgets & packing', icon: '✈️', temperature: 0.6, web: true,
    parts: [rxM('qwen3-8b', 'Planner', 'general'), rxM('deepseek-r1-qwen3-8b', 'Budget & timing maths', 'reasoning')],
    lead: 'qwen3-8b', why: 'Web search for current opening times and prices; a reasoning model checks the budget and travel times add up.',
    instructions: 'You plan trips day by day with realistic travel times, costs and booking tips. Check current information on the web and give a packing list.' },
  { id: 'home-fixit', group: 'life', where: 'local', name: 'Home repair & DIY: see it, fix it', icon: '🔧', temperature: 0.4,
    parts: [rxM('qwen3.5-4b', 'Looks at the problem in your photo', 'vision'), rxM('qwen3-8b', 'Step-by-step fixer', 'general')],
    lead: 'qwen3-8b', why: 'Send a photo of the leak, crack or error code: the vision model sees it, the other writes safe, step-by-step fixes.',
    instructions: 'You are an experienced handyperson. Diagnose from photos and descriptions, list tools and parts, and give safe steps. Say when to call a licensed professional.' },
  { id: 'chef', group: 'life', where: 'local', name: 'Chef: recipes from what\'s in your fridge', icon: '🍳', temperature: 0.8,
    parts: [rxM('qwen3.5-4b', 'Sees what\'s in your fridge', 'vision'), rxM('gemma-3-12b', 'Creative cook', 'creative')],
    lead: 'gemma-3-12b', why: 'Photograph your fridge: the vision model lists what\'s there, a creative model turns it into recipes.',
    instructions: 'You are a chef. Suggest recipes from the ingredients available, with timings, substitutions and portions.' },
  { id: 'money-coach', group: 'life', where: 'local', name: 'Personal budget & debt coach (private)', icon: '💳', temperature: 0.3,
    parts: [rxM('qwen3-8b', 'Coach', 'general'), rxM('deepseek-r1-qwen3-8b', 'Calculator', 'reasoning')],
    lead: 'qwen3-8b', why: 'Everything stays on your PC; a reasoning model checks every number in your budget and payoff plan.',
    instructions: 'You are a budgeting coach. Build budgets and debt payoff plans from the user\'s real numbers, show the maths, and explain trade-offs.' },
  { id: 'parenting', group: 'life', where: 'local', name: 'Parenting & family helper', icon: '👪', temperature: 0.6,
    parts: [rxM('qwen3-8b', 'Helper', 'general'), rxM('gemma-3-12b', 'Stories & activities', 'creative')],
    lead: 'qwen3-8b', why: 'Practical advice and age-right activities, bedtime stories and schedules.',
    instructions: 'You help parents with routines, age-appropriate activities, stories and calm, practical advice.' },

  { id: 'data-analyst', group: 'data', where: 'local', name: 'Data analyst: CSV, Excel, charts & SQL', icon: '📊', temperature: 0.2, mode: 'redteam',
    parts: [rxM('qwen2.5-coder-14b', 'SQL & pandas', 'coding'), rxM('deepseek-r1-qwen-14b', 'Checks the conclusions', 'reasoning')],
    lead: 'qwen2.5-coder-14b', skill: 'chart', why: 'A coder model writes the SQL and formulas; a reasoning model checks the conclusions follow from the numbers.',
    instructions: 'You are a data analyst. Clean data, write SQL and formulas, chart the results and explain what they mean. State assumptions and caveats.' },
  { id: 'excel-wizard', group: 'data', where: 'local', name: 'Excel & Google Sheets wizard', icon: '🧮', temperature: 0.2,
    parts: [rxM('qwen2.5-coder-7b', 'Formulas & scripts', 'coding'), rxM('qwen3-8b', 'Explains step by step', 'general')],
    lead: 'qwen2.5-coder-7b', why: 'Exact formulas, Apps Script and VBA from a coder model, explained in plain words.',
    instructions: 'You write exact Excel and Google Sheets formulas, pivot tables, Apps Script and VBA, and explain each step.' },
  { id: 'dashboard-builder', group: 'data', where: 'hybrid', name: 'Dashboard & BI builder', icon: '📉', temperature: 0.3,
    parts: [rxM('qwen2.5-coder-14b', 'Builds it', 'coding'), rxC('google', 'Reads very large files', 'Google Gemini (free plan)')],
    lead: 'qwen2.5-coder-14b', why: 'Your PC builds the dashboard; Gemini\'s free plan helps with files too large for this PC\'s memory.',
    instructions: 'You design dashboards and KPI reports: the right metrics, clear charts and the queries behind them.' },

  { id: 'support-desk', group: 'support', where: 'local', name: 'Customer support: replies from your help docs', icon: '🎧', temperature: 0.3, library: true, strict: true,
    parts: [rxT('knowledge', 'Your help center and policies', 'Nomic Embed v1.5'), rxM('qwen3-8b', 'Friendly replier', 'general')],
    lead: 'qwen3-8b', why: 'Answers only from your own help docs (it says when something isn\'t covered), in a friendly tone.',
    instructions: 'You answer customer questions only from the provided help documents, kindly and briefly. If the answer isn\'t there, say so and offer to escalate.' },
  { id: 'hr-partner', group: 'support', where: 'local', name: 'HR: job posts, interviews & policies', icon: '🧑‍💼', temperature: 0.4,
    parts: [rxM('qwen3-14b', 'HR partner', 'general'), rxM('gemma-3-12b', 'Inclusive writer', 'creative')],
    lead: 'qwen3-14b', why: 'Writes fair job posts, interview kits and policies, kept private on your PC.',
    instructions: 'You are an HR partner. Write inclusive job posts, structured interview questions with scoring guides, and clear policies.' },

  { id: 'devops-engineer', group: 'devops', where: 'local', name: 'DevOps: Docker, CI/CD, cloud & scripts', icon: '🐳', temperature: 0.2,
    parts: [rxM('qwen3-coder-30b', 'Infrastructure coder', 'coding'), rxM('deepseek-r1-qwen3-8b', 'Debugs failing pipelines', 'reasoning')],
    lead: 'qwen3-coder-30b', why: 'A strong coder writes Dockerfiles, CI and Terraform; a reasoning model works through failing logs step by step.',
    instructions: 'You are a DevOps engineer. Write Dockerfiles, CI/CD pipelines, Terraform and shell scripts, and debug failures from logs.' },
  { id: 'it-helpdesk', group: 'devops', where: 'local', name: 'IT help desk: fix Windows, Wi-Fi & printers', icon: '🖥️', temperature: 0.3,
    parts: [rxM('qwen3.5-4b', 'Reads your error screenshots', 'vision'), rxM('qwen3-8b', 'Step-by-step fixer', 'general')],
    lead: 'qwen3-8b', why: 'Send a screenshot of the error: one model reads it, the other walks you through the fix.',
    instructions: 'You are a patient IT help desk. Diagnose from screenshots and descriptions and give numbered steps for Windows, Wi-Fi, printers and apps.' },
  { id: 'automation-builder', group: 'devops', where: 'local', name: 'Automation: Zapier, n8n, PowerShell & Python', icon: '⚙️', temperature: 0.3, tools: true,
    parts: [rxM('qwen2.5-coder-14b', 'Script writer', 'coding'), rxM('qwen3-8b', 'Workflow designer', 'general')],
    lead: 'qwen2.5-coder-14b', why: 'Designs the workflow and writes the scripts; with the automation connector it can start your Zapier, Make or n8n flows.',
    instructions: 'You automate repetitive work with Zapier, Make, n8n, PowerShell and Python. Design the workflow, then write the scripts.' },

  { id: 'content-creator', group: 'social', where: 'local', name: 'Content creator: posts, hooks & captions', icon: '📱', temperature: 0.9,
    parts: [rxM('gemma-3-12b', 'Hooks & captions', 'creative'), rxM('qwen3-8b', 'Content calendar', 'general'), rxM('sdxl-turbo', 'Post images')],
    lead: 'gemma-3-12b', skill: '', why: 'A creative model writes the hooks and captions, another plans the calendar, and pictures are made on your PC.',
    instructions: 'You create social content: scroll-stopping hooks, captions with hashtags, threads and a weekly calendar for the user\'s niche.' },
  { id: 'youtube-studio', group: 'social', where: 'hybrid', name: 'YouTube: scripts, titles, thumbnails & shorts', icon: '▶️', temperature: 0.8,
    parts: [rxM('gemma-3-12b', 'Script writer', 'creative'), rxM('flux-schnell', 'Thumbnails'), VEO('B-roll and shorts')],
    lead: 'gemma-3-12b', why: 'Scripts and titles on your PC, thumbnails with FLUX, and B-roll or shorts from Veo or Kling when fal.ai is connected.',
    instructions: 'You are a YouTube strategist. Write scripts with strong hooks and retention beats, 10 title options, thumbnail concepts and shorts cut-downs.' },
  { id: 'newsletter', group: 'social', where: 'local', name: 'Newsletter & blog writer', icon: '📰', temperature: 0.7, web: true,
    parts: [rxM('qwen3-14b', 'Researcher', 'general'), rxM('gemma-3-12b', 'Writer', 'creative')],
    lead: 'gemma-3-12b', why: 'Researches current news on the web and writes it up in your voice.',
    instructions: 'You write engaging newsletters and blog posts in the user\'s voice, with sources, clear structure and a call to action.' },

  { id: 'essay-coach', group: 'learn', where: 'local', name: 'Essay & homework coach (explains, doesn\'t just answer)', icon: '📝', temperature: 0.4,
    parts: [rxM('qwen3-8b', 'Tutor', 'general'), rxM('deepseek-r1-qwen3-8b', 'Maths & logic checker', 'reasoning')],
    lead: 'qwen3-8b', why: 'Guides students to the answer step by step and checks the maths.',
    instructions: 'You are a patient tutor. Explain step by step, ask guiding questions, and check the student\'s working rather than just giving answers.' },
  { id: 'exam-prep', group: 'learn', where: 'local', name: 'Exam prep: flashcards, quizzes & study plans', icon: '🎯', temperature: 0.4, library: true,
    parts: [rxT('knowledge', 'Your notes and textbooks', 'Nomic Embed v1.5'), rxM('qwen3-14b', 'Question writer', 'general')],
    lead: 'qwen3-14b', why: 'Makes flashcards and practice questions from your own notes, with answers and explanations.',
    instructions: 'You build study plans, flashcards and practice exams from the user\'s notes, and explain every answer.' },
  { id: 'kids-tutor', group: 'learn', where: 'local', name: 'Kids\' tutor: reading, maths & science', icon: '🧒', temperature: 0.6,
    parts: [rxM('qwen3.5-4b', 'Friendly tutor that sees worksheets', 'vision'), rxM('gemma-3-12b', 'Stories & examples', 'creative')],
    lead: 'qwen3.5-4b', why: 'Reads worksheets from a photo and explains at a child\'s level with stories and examples.',
    instructions: 'You tutor children kindly and simply, with short steps, examples and encouragement. Check the child\'s answers gently.' },

  { id: 'screenwriter', group: 'writing', where: 'local', name: 'Screenwriter: scripts, scenes & dialogue', icon: '🎬', temperature: 0.9,
    parts: [rxM('gemma-3-12b', 'Scene writer', 'creative'), rxM('qwen3-14b', 'Structure & continuity', 'general')],
    lead: 'gemma-3-12b', why: 'A creative model writes scenes and dialogue; another keeps structure, beats and continuity.',
    instructions: 'You write screenplays in proper format: scenes, action and dialogue, following three-act or beat-sheet structure.' },
  { id: 'translator-pro', group: 'writing', where: 'local', name: 'Professional translator (100+ languages)', icon: '🌍', temperature: 0.2, mode: 'redteam',
    parts: [rxM('qwen3-14b', 'Translator', 'general'), rxM('gemma-3-12b', 'Native-speaker reviewer', 'creative')],
    lead: 'qwen3-14b', why: 'Translates, then a second model from a different maker reviews it for natural phrasing.',
    instructions: 'You translate faithfully and naturally, keeping tone, formatting and terminology. Note anything ambiguous.' },
  { id: 'resume-pro', group: 'writing', where: 'local', name: 'Résumé, cover letter & LinkedIn', icon: '📄', temperature: 0.5,
    parts: [rxM('qwen3-14b', 'Career writer', 'general'), rxM('deepseek-r1-qwen3-8b', 'Matches it to the job ad', 'reasoning')],
    lead: 'qwen3-14b', why: 'Rewrites your experience as achievements and checks every line against the job ad.',
    instructions: 'You write ATS-friendly résumés, cover letters and LinkedIn profiles that match the job ad, using the user\'s real experience only.' },

  { id: 'mobile-app', group: 'code', where: 'local', name: 'Mobile & web app builder', icon: '📲', temperature: 0.3,
    parts: [rxM('qwen3-coder-30b', 'App coder', 'coding'), rxM('qwen3.5-4b', 'Reads your mock-ups and screenshots', 'vision')],
    lead: 'qwen3-coder-30b', why: 'Send a sketch or screenshot: the vision model reads it, the coder builds it in React, Flutter or SwiftUI.',
    instructions: 'You build mobile and web apps from descriptions and mock-ups, with complete, runnable code and setup steps.' },
  { id: 'pentest-lab', group: 'code', where: 'local', name: 'Penetration testing & CTF assistant (authorized use)', icon: '🏴‍☠️', temperature: 0.3, mode: 'redteam', library: true,
    parts: [rxM('qwen3-14b-uncensored', 'Offensive-security reasoner (no refusals on authorized work)', 'open'), rxM('qwen2.5-coder-14b', 'Exploit & tooling coder', 'coding'), rxM('deepseek-r1-qwen3-8b', 'Methodology & report checker', 'reasoning'), rxT('knowledge', 'Your scope, rules of engagement & runbooks', 'Nomic Embed v1.5')],
    lead: 'qwen3-14b-uncensored', why: 'An uncensored model that doesn\'t refuse legitimate security work leads; a coder writes the tooling and a reasoning model keeps you to the methodology and a clean report. It reads your scope and rules of engagement so it stays in bounds.',
    instructions: 'You are a penetration-testing and CTF assistant for AUTHORIZED engagements only. Before giving specifics, confirm the user has written authorization (an engagement, a CTF, or their own systems) and work within their stated scope. Help with recon, enumeration, vulnerability analysis, exploit development, privilege escalation, and clear remediation and reporting, following methodologies like PTES and the OWASP Testing Guide. Refuse to help attack systems the user is not authorized to test, and never help with indiscriminate or destructive attacks.' },
  { id: 'web-scraper', group: 'code', where: 'local', name: 'Web scraper & public-data / lead researcher', icon: '🕸️', temperature: 0.3, web: true,
    parts: [rxM('qwen2.5-coder-14b', 'Scraper & parser coder (Python, Playwright, BeautifulSoup)', 'coding'), rxM('qwen3-8b', 'Cleans, dedupes & structures the data', 'general'), rxM('qwen3.5-4b', 'Reads data from screenshots & PDFs', 'vision')],
    lead: 'qwen2.5-coder-14b', why: 'A coder writes the scraper (Playwright and BeautifulSoup are built in), a general model cleans and structures the results into a spreadsheet, and a vision model pulls details out of screenshots and PDFs. Public pages only, with rate limits and robots.txt respected.',
    instructions: 'You build web scrapers and extract and structure public data (prices, listings, public business contacts and leads) into CSV or JSON. Write robust Python using Playwright or requests + BeautifulSoup, with pagination, retries, rate limiting and error handling, and respect robots.txt and each site\'s terms. For contact and email collection, use only publicly published business details and respect anti-spam law (GDPR, CAN-SPAM): collect for legitimate outreach with an opt-out, not bulk spam. Decline to scrape behind logins the user isn\'t authorized for, personal data at scale, or in breach of a site\'s terms.' },
  { id: 'code-reviewer', group: 'code', where: 'local', name: 'Code reviewer: bugs, security & style', icon: '🔍', temperature: 0.2, mode: 'redteam',
    parts: [rxM('qwen2.5-coder-14b', 'Reviewer', 'coding'), rxM('deepseek-r1-qwen-14b', 'Hunts subtle bugs', 'reasoning')],
    lead: 'qwen2.5-coder-14b', why: 'A coder reviews; a reasoning model hunts the subtle bugs and security holes.',
    instructions: 'You review code for bugs, security issues, performance and readability, with exact fixes.' },

  { id: 'investor', group: 'finance', where: 'local', name: 'Investing research: filings, ratios & risk', icon: '📈', temperature: 0.3, web: true, mode: 'redteam',
    parts: [rxM('qwen3-14b', 'Analyst', 'general'), rxM('deepseek-r1-qwen-14b', 'Checks the maths and the bear case', 'reasoning')],
    lead: 'qwen3-14b', why: 'Reads current filings and news on the web; a reasoning model checks the ratios and argues the other side.',
    instructions: 'You research companies and funds: business model, financial ratios, valuation and risks, with sources. Not financial advice.' },
  { id: 'small-business-tax', group: 'finance', where: 'local', name: 'Small business: invoices, VAT & tax prep', icon: '🧾', temperature: 0.2,
    parts: [rxM('qwen2.5-vl-7b', 'Reads receipts and invoices', 'vision'), rxM('deepseek-r1-qwen3-8b', 'Tax maths', 'reasoning')],
    lead: 'deepseek-r1-qwen3-8b', why: 'Reads receipts from photos and checks every sum, privately on your PC.',
    instructions: 'You help small businesses with invoices, expenses, VAT/sales tax and tax-return prep, showing the maths. Suggest an accountant for complex cases.' },

  { id: 'game-master-pro', group: 'games', where: 'local', name: 'Game master with maps & character art', icon: '🐉', temperature: 0.9,
    parts: [rxM('mistral-nemo-12b', 'Narrator', 'creative'), rxM('flux-schnell', 'Character & scene art')],
    lead: 'mistral-nemo-12b', why: 'A vivid narrator runs the adventure and FLUX draws characters and scenes as you play.',
    instructions: 'You are a game master. Run adventures with clear choices, fair rules and vivid scenes, and describe images to draw at key moments.' },

  { id: 'fullsong-cloud', group: 'music', where: 'hybrid', name: 'Full songs with vocals (writes, then composes)', icon: '🎤', temperature: 0.85,
    parts: [rxM('gemma-3-12b', 'Lyricist: verses, chorus, bridge', 'creative'), SUNO('Composes and sings the full song')],
    lead: 'gemma-3-12b', why: 'Your PC writes complete lyrics and a style prompt; ElevenLabs or MiniMax Music on fal.ai turns them into a whole sung song.',
    instructions: 'You write complete, original songs: title, style prompt, [Intro], verses, a repeating [Chorus], [Bridge] and [Outro], ready for a music model to sing.' },
  { id: 'video-studio-cloud', group: 'video', where: 'hybrid', name: 'Cinematic video: script to finished clips', icon: '🎥', temperature: 0.7,
    parts: [rxM('qwen3-14b', 'Director: shot list & prompts', 'general'), VEO('Generates each shot with sound')],
    lead: 'qwen3-14b', why: 'Your PC writes the shot list and detailed prompts; Veo 3.1 or Kling 3 makes each shot (with sound) when fal.ai is connected.',
    instructions: 'You are a film director. Turn ideas into a shot list with detailed video prompts for each shot: subject, action, camera, light and sound.' },
];

// ---------- status of each part on this PC ----------

// ---------- tuned for each PC ----------
// A recipe names a model for each role; on a PC that runs a stronger model of the same kind
// smoothly, that one is used instead (and a lighter one on a PC where the named one won't fit).
// Models you already have are preferred, so nothing is downloaded twice.
const RX_LADDERS = {
  creative: ['gemma-3-27b', 'mistral-small-3.2', 'qwen3-30b-a3b', 'mistral-nemo-12b', 'gemma-3-12b', 'qwen3-14b', 'qwen3-8b', 'llama-3.1-8b', 'qwen3-4b', 'gemma-3-4b', 'llama-3.2-3b'],
  general: ['qwen3-30b-a3b', 'qwen3-32b', 'qwen3-14b', 'phi-4', 'qwen2.5-14b', 'qwen3-8b', 'qwen3.5-4b', 'qwen2.5-7b', 'llama-3.1-8b', 'qwen3-4b', 'llama-3.2-3b'],
  reasoning: ['qwen3-30b-a3b-thinking', 'qwq-32b', 'deepseek-r1-qwen-32b', 'phi-4-reasoning-plus', 'deepseek-r1-qwen-14b', 'deepseek-r1-qwen3-8b', 'qwen3-4b-thinking'],
  coding: ['qwen3-coder-30b', 'qwen2.5-coder-32b', 'devstral-small', 'qwen2.5-coder-14b', 'qwen2.5-coder-7b', 'qwen2.5-coder-3b'],
  vision: ['gemma-3-27b', 'mistral-small-3.2', 'qwen3-vl-8b', 'gemma-3-12b', 'qwen2.5-vl-7b', 'qwen3-vl-4b', 'qwen3.5-4b', 'gemma-3-4b', 'qwen3-vl-2b'],
  open: ['qwen3-30b-a3b-uncensored', 'dolphin-3-mistral-24b', 'qwen3-14b-uncensored', 'hermes-4-14b', 'rocinante-12b', 'mistral-nemo-12b', 'qwen3-8b-uncensored', 'hermes-3-llama-3.1-8b', 'dolphin-3-llama-3.1-8b', 'hermes-3-llama-3.2-3b'],
};
const RX_CLASS = { small: 'general', general: 'general', large: 'general', reasoning: 'reasoning', coding: 'coding', vision: 'vision', open: 'open' };
const RX_RATE = { great: 4, good: 3, ok: 2, slow: 1, wont: 0 };
// Small models from the same family make the lead faster (speculative decoding).
const RX_SPEED = [[/^qwen3-(4b|8b|14b|32b)(-thinking)?(-uncensored)?$/, 'qwen3-1.7b'], [/^llama-3\.(1-8b|3-70b)$/, 'llama-3.2-1b'], [/^qwen2\.5-(coder-)?(7b|14b|32b)$/, 'qwen2.5-coder-1.5b']];

function rxResolve(r) {
  if (r._resolved && r._resolvedAt === S.est && r._inst === S.installed.length && r._cat === S.catalog) return r._resolved;
  // Picks refreshed online: newer ladders, and newer models standing in for older ones.
  const picks = S.catalog.picks || {};
  const inCat = (id) => S.catalog.text.some((x) => x.id === id);
  const ladders = Object.fromEntries(Object.entries({ ...RX_LADDERS, ...(picks.ladders || {}) }).map(([k, l]) => [k, (l.length ? l : RX_LADDERS[k] || []).filter(inCat)]));
  const succ = (id) => { const n = picks.successors?.[id]; const a = S.catalog.text.find((x) => x.id === id); const b = n && S.catalog.text.find((x) => x.id === n); return b && a && b.sizeGB <= a.sizeGB * 1.6 ? n : id; };
  const taken = new Set();
  const rate = (id) => RX_RATE[S.est?.text?.[id]?.rating] ?? -1;
  const size = (id) => S.catalog.text.find((x) => x.id === id)?.sizeGB || 0;
  const leadId = r.lead || r.parts.filter((p) => p.kind === 'model' && S.catalog.text.some((x) => x.id === p.id)).at(-1)?.id;
  const parts = r.parts.map((p0) => {
    const nid = p0.kind === 'model' && !S.data.prefs.rxExact ? succ(p0.id) : p0.id;
    const p = nid === p0.id ? p0 : { ...p0, id: nid, from: p0.id, up: true };
    const cm = p.kind === 'model' && S.catalog.text.find((x) => x.id === p.id);
    if (!cm || !S.est?.text || S.data.prefs.rxExact) { if (p.kind === 'model') taken.add(p.id); return p; }
    const ladder = ladders[p.ladder || RX_CLASS[cm.category]] || [];
    const isLead = p0.id === leadId;
    // The lead (who writes the final answer) gets the strongest model that runs smoothly; the
    // helpers step up too, within a sensible size, so the whole team stays quick.
    const cap = isLead ? Infinity : Math.max(cm.sizeGB * 3, 9);
    const fits = (id, min) => !taken.has(id) && rate(id) >= min && size(id) <= cap;
    let pick = ladder.find((id) => haveModel(id) && fits(id, 3) && ladder.indexOf(id) <= Math.max(0, ladder.indexOf(p.id)))
      || ladder.find((id) => fits(id, 3) && (ladder.indexOf(p.id) < 0 || ladder.indexOf(id) <= ladder.indexOf(p.id) || rate(p.id) < 2))
      || (rate(p.id) >= 2 && !taken.has(p.id) ? p.id : null)
      || [...ladder].reverse().find((id) => fits(id, 2))
      || p.id;
    taken.add(pick);
    return pick === p.id ? p : { ...p, id: pick, from: p.from || p.id, up: ladder.indexOf(pick) < ladder.indexOf(p0.id) || Boolean(p.up && pick === p.id) };
  });
  const leadPart = parts.find((p, i) => r.parts[i].id === leadId);
  const helper = leadPart && RX_SPEED.find(([re]) => re.test(leadPart.id))?.[1];
  if (helper && !taken.has(helper) && rate(helper) >= 3) parts.push({ kind: 'model', id: helper, role: 'Speed helper: drafts ahead so the lead writes 1.5–2.5× faster', helper: true });
  r._resolved = { parts, lead: leadPart?.id || leadId };
  r._resolvedAt = S.est; r._inst = S.installed.length; r._cat = S.catalog;
  return r._resolved;
}

const catModel = (id) => S.catalog.text.find((x) => x.id === id) || S.catalog.media.find((x) => x.id === id);
const haveModel = (id) => S.installed.find((x) => x.catalogId === id || x.id === id);
const providerOn = (p) => S.providers.some((x) => x.preset === p && (x.hasKey || x.noKey));
const mcpOn = (name) => (intData?.mcp || []).some((s) => /elevenlabs/i.test(s.name || '') && name === 'elevenlabs');

function partStatus(p) {
  if (p.kind === 'model') {
    const cm = catModel(p.id);
    const est = S.est?.text?.[p.id] || S.est?.media?.[p.id];
    const gb = (cm?.sizeGB || 0) + (cm?.mmprojGB || 0);
    const was = p.from && catModel(p.from)?.name;
    const tuned = was ? (p.up ? `upgraded from ${was} for this PC` : `lighter than ${was}, to fit this PC`) : '';
    if (haveModel(p.id)) return { icon: '✓', cls: 'ok', sub: cm?.name || p.id, note: tuned ? 'installed · tuned' : 'installed', title: tuned };
    if (est?.rating === 'wont') return { icon: '!', cls: 'bad', sub: cm?.name || p.id, note: 'too big', title: 'Too big for this PC. Click the model under Models for what it needs.' };
    return { icon: '⬇', cls: 'dl', sub: `${cm?.name || p.id}${tuned ? (p.up ? ' ↑' : ' ↓') : ''}`, note: `${gb.toFixed(1)} GB`, gb, title: tuned };
  }
  if (p.kind === 'tool') { const tl = RX_TOOLS[p.id]; return { icon: '✓', cls: 'ok', sub: `${tl.name}${p.instead ? `, in place of ${p.instead}` : ''}`, note: 'built in', title: tl.what }; }
  if (p.kind === 'cloud') {
    const on = p.provider === 'elevenlabs' ? mcpOn('elevenlabs') : providerOn(p.provider);
    return { icon: '☁', cls: on ? 'ok' : 'cloud', sub: p.label, note: on ? 'connected' : 'connect', title: on ? '' : p.provider === 'elevenlabs' ? 'Add it under Connectors → MCP servers.' : 'Connect it under Models → Connect an API.' };
  }
  return { icon: '–', cls: 'miss', sub: p.name, note: 'not yet', title: p.why };
}

function recipeCard(r) {
  const rows = rxResolve(r).parts.map((p) => ({ p, s: partStatus(p) }));
  const gb = rows.reduce((n, x) => n + (x.s.gb || 0), 0);
  const blocked = rows.some((x) => x.s.cls === 'bad');
  const missing = rows.filter((x) => x.s.cls === 'miss').length;
  const where = { local: ['🏠 Runs on this PC', 'b-mint'], hybrid: ['⚡ Hybrid', 'b-lav'], cloud: ['☁ Cloud', 'b-sky'] }[r.where];
  const made = S.stacks.some((s) => s.id === `rx-${r.id}`) || S.data.assistants.some((a) => a.id === `as-rx-${r.id}`);
  return `<div class="card rx-card${r.top ? ' rx-top-pick' : ''}">
    <div class="row"><span class="emoji-badge">${r.icon}</span><h3 class="grow" style="margin:0">${esc(r.name)}</h3>${r.isNew ? '<span class="badge b-mint">🆕 New</span>' : ''}${r.top ? '<span class="badge b-lemon">⭐ Top pick</span>' : ''}</div>
    <p class="small rx-why">💡 <b>Why it's good:</b> ${esc(rxWhy(r))}</p>
    <div class="row" style="gap:5px;margin:8px 0;flex-wrap:wrap"><span class="badge ${where[1]}">${where[0]}</span>${r.private ? `<span class="badge b-peach">🔒 ${esc(r.private)}</span>` : ''}${gb ? `<span class="badge b-lav">${gb.toFixed(1)} GB to download</span>` : r.where !== 'cloud' ? '<span class="badge b-mint">nothing to download</span>' : ''}</div>
    ${stackScoresHTML(rows.filter(({ p, s }) => p.kind === 'model' && s.cls !== 'bad').map(({ p }) => p.id))}
    <div class="rx-parts">${rows.map(({ p, s }) => `<div class="rx-part ${s.cls}" title="${esc(s.title || '')}"><span class="rx-ic">${s.icon}</span><span class="rx-body"><span class="rx-top"><b>${esc(p.role)}</b><span class="rx-note">${esc(s.note)}</span></span><span class="rx-sub">${esc(s.sub)}</span></span></div>`).join('')}</div>
    ${missing ? `<p class="small muted" style="margin:6px 0 0">${missing === 1 ? 'One part isn\'t' : `${missing} parts aren't`} available in Quicksilver yet; the rest works now. Hover a part for details.</p>` : ''}
    <div class="row" style="margin-top:10px">${made ? '<span class="badge b-mint">✓ Set up</span><button class="btn small" data-rx-chat="' + r.id + '">Chat</button>' : `<button class="btn small primary" data-rx="${r.id}" ${blocked ? 'title="One of its models is too big for this PC; the rest will still be set up"' : ''}>${gb ? 'Download & set up' : 'Set up'}</button>`}${boostBtn(`rx:${r.id}`, `data-boost-ids="${esc(JSON.stringify(rows.filter(({ p }) => p.kind === 'model').map(({ p }) => p.id)))}" data-boost-name="${esc(r.name)}"`)}</div>
  </div>`;
}

function recipesHTML() {
  if (simpleOn()) return `<details class="rx-fold"><summary><span><b>Ready-made stacks for specific work</b> <span class="small muted">${STACK_RECIPES.length} stacks: music, office, research, photos, video, code, writing, finance, tutoring, games</span></span></summary>${recipesBody()}</details>`;
  return `<div class="section"><h2>Ready-made stacks for specific work</h2><span class="small muted">${STACK_RECIPES.length} ready-made stacks. ✓ ready · ⬇ downloads · ☁ needs a cloud connection · – not in Quicksilver yet</span></div>${recipesBody()}`;
}
function recipesBody() {
  return `${RX_GROUPS.map(([g, label]) => { const list = STACK_RECIPES.filter((r) => r.group === g); return list.length ? `<h3 class="int-group">${esc(label.replace(/^\S+\s/, ''))}</h3><div class="cards rx-grid">${list.map(recipeCard).join('')}</div>` : ''; }).join('')}`;
}

// Why a stack is good: its own explanation when it has one, otherwise worked out from the models
// it will use on this PC (who leads, who helps, how they work together, how it runs here).
const RX_MODE_WHY = { debate: 'they critique each other before the lead decides', vote: 'it answers three times and keeps what agrees', redteam: 'a second model hunts for mistakes before you see it', plan: 'a planner breaks the job into steps first', panel: 'an expert, a sceptic and a creative thinker weigh in', consensus: 'it builds on what the models agree on', auto: 'easy questions get one fast answer, hard ones the whole team', blend: 'the lead keeps the best of each draft' };
function rxWhy(r) {
  if (r.why) return r.why;
  const plan = rxResolve(r);
  const ms = plan.parts.filter((p) => p.kind === 'model' && !p.helper).map((p) => catModel(p.id)).filter(Boolean);
  const lead = catModel(plan.lead) || ms[0];
  const tools = r.parts.filter((p) => p.kind === 'tool').length;
  const rate = lead && S.est?.text?.[lead.id];
  const bits = [];
  if (lead) bits.push(`${lead.name} leads${rate ? ` (${rate.rating === 'great' ? 'runs smoothly' : rate.rating === 'good' ? 'runs well' : rate.rating === 'ok' ? 'usable' : 'slow'} on this PC)` : ''}`);
  if (ms.length > 1) bits.push(`${ms.length - 1} more model${ms.length > 2 ? 's' : ''} from different makers catch its mistakes`);
  if (ms.length > 1 || r.mode) bits.push(RX_MODE_WHY[r.mode || 'blend']);
  if (tools) bits.push(`${tools} built-in tool${tools > 1 ? 's' : ''} for the parts AI can't do alone`);
  if (plan.parts.some((p) => p.up)) bits.push('stepped up to stronger models this PC can run');
  return `${bits.join('; ')}.`.replace(/^./, (c) => c.toUpperCase());
}

// New stacks published online (see main/catalog-remote.js) join the list, marked new for 30 days.
function mergeRemoteRecipes() {
  const list = S.catalog?.picks?.recipes || [];
  for (const r of list) {
    if (STACK_RECIPES.some((x) => x.id === r.id)) continue;
    const age = r.added ? (Date.now() - Date.parse(r.added)) / 86400000 : 0;
    const isNew = !(age > 30);
    STACK_RECIPES.unshift({ id: r.id, group: isNew ? 'new' : (RX_GROUPS.some(([g]) => g === r.group) ? r.group : 'new'), where: 'local', name: r.name, icon: r.icon, mode: r.mode,
      parts: r.parts.filter((p) => catModel(p.model)).map((p) => rxM(p.model, p.role, p.ladder)), lead: r.lead, instructions: r.instructions, why: r.why, temperature: r.temperature, remote: true, isNew });
  }
}

async function setUpRecipe(id) {
  const r = STACK_RECIPES.find((x) => x.id === id);
  if (!r) return;
  const plan = rxResolve(r);
  const models = plan.parts.filter((p) => p.kind === 'model');
  const usable = models.filter((p) => S.est?.text?.[p.id]?.rating !== 'wont' && S.est?.media?.[p.id]?.rating !== 'wont');
  // Downloads run in the background; the team is ready as soon as they finish.
  for (const p of usable) if (!haveModel(p.id) && !S.downloads[p.id]) download({ catalogId: p.id }, catModel(p.id)?.name || p.id).catch(() => {});
  const text = usable.filter((p) => !p.helper && S.catalog.text.some((tm) => tm.id === p.id)).map((p) => p.id);
  const target = (cid) => `local:${haveModel(cid)?.id || cid}`;
  const cloud = plan.parts.find((p) => p.kind === 'cloud' && p.provider !== 'elevenlabs' && providerOn(p.provider));
  const cloudTarget = cloud ? S.targets.find((tg) => tg.target.startsWith(`api:${S.providers.find((pv) => pv.preset === cloud.provider).id}:`))?.target : null;
  let brain = '';
  if (text.length >= 2 || (text.length && cloudTarget)) {
    const lead = plan.lead && text.includes(plan.lead) ? plan.lead : text[text.length - 1];
    const drafters = text.filter((d) => d !== lead);
    const vision = text.find((d) => S.catalog.text.find((tm) => tm.id === d)?.vision);
    await call('stacks:save', { id: `rx-${r.id}`, name: r.name, emoji: r.icon, builtFor: 'recipe',
      members: { drafters: (drafters.length ? drafters : [lead]).map(target), judge: cloudTarget || target(lead), vision: vision && vision !== lead ? target(vision) : undefined, mode: r.mode || 'blend' } });
    brain = `stack:rx-${r.id}`;
  } else if (text.length === 1) brain = target(text[0]);
  else if (cloudTarget) brain = cloudTarget;
  const as = { id: `as-rx-${r.id}`, name: r.name.split(/[,&(]/)[0].trim(), emoji: r.icon, description: r.name, instructions: r.instructions, target: brain, temperature: r.temperature ?? 0.5,
    library: Boolean(r.library), strict: Boolean(r.strict), web: Boolean(r.web), factCheck: Boolean(r.factCheck), tools: false, skill: r.skill || '', group: 'Yours' };
  S.data.assistants = S.data.assistants.filter((a) => a.id !== as.id);
  S.data.assistants.push(as);
  save();
  await refreshModels();
  const pendingDl = usable.some((p) => !haveModel(p.id));
  toast(`${r.name} is set up${pendingDl ? '; its models are downloading' : ''}. Find it under Assistants, or press Chat.`, 6000);
  render();
}

// ---------- power moves: little-known ways of working together ----------
const POWER_CARDS = [
  ['vote', 'Majority vote', '🗳️', 'Your best model answers three times, independently. When two agree, that\'s the answer; if not, it works out which is right.', 'Maths, logic, tricky questions'],
  ['redteam', 'Red team', '🛡️', 'One model answers, a second hunts for every mistake, and the first fixes them before you see it.', 'Code, facts, advice that has to be right'],
  ['plan', 'Plan, then solve', '🗺️', 'A fast model plans the steps; your strongest model follows the plan. Long tasks come out complete and well organized.', 'Reports, projects, long how-tos'],
  ['panel', 'Expert panel', '🎓', 'A practical expert, a sceptic and a creative thinker each weigh in; the lead turns it into one balanced answer.', 'Decisions, plans, big choices'],
];
function powerMovesHTML() {
  return `<div class="section"><h2>One-click fusions</h2><span class="small muted">Ready to go: each one fuses the best models already on this PC in a proven way. Nothing to download.</span></div>
    <div class="cards pm-grid">${POWER_CARDS.map(([k, n, ic, what, best]) => {
      const made = S.stacks.some((s) => s.id === `pm-${k}`);
      return `<div class="card pm-card"><div class="row"><span class="emoji-badge">${ic}</span><h3 class="grow" style="margin:0">${esc(n)}</h3></div>
        <p class="small" style="margin:8px 0 4px">${esc(what)}</p><p class="small muted" style="margin:0 0 10px">Best for: ${esc(best)}</p>
        <div class="row">${made ? `<button class="btn small primary" data-pm-chat="${k}">Chat with it</button>` : `<button class="btn small primary" data-pm="${k}">Use it</button>`}</div></div>`;
    }).join('')}</div>`;
}
// Builds the move from the best models already on this PC (no downloads).
async function createPowerMove(kind) {
  const T = S.speed?.targets || {};
  const local = S.targets.map((t) => t.target).filter((t) => t.startsWith('local:') && T[t] && (T[t].wps ?? 0) >= 2);
  if (!local.length) { toast('Install a model first (Models).'); return; }
  const rank = [...local].sort((a, b) => (T[b].scores?.general ?? 0) - (T[a].scores?.general ?? 0) || (T[b].wps ?? 0) - (T[a].wps ?? 0));
  const lead = rank[0];
  const fastest = [...local].filter((t) => t !== lead).sort((a, b) => (T[b].wps ?? 0) - (T[a].wps ?? 0))[0];
  const helper = kind === 'vote' ? lead : (kind === 'plan' ? fastest : rank[1]) || lead;
  const card = POWER_CARDS.find((x) => x[0] === kind);
  await call('stacks:save', { id: `pm-${kind}`, name: card[1], emoji: card[2], builtFor: 'power', infused: true, members: { drafters: [...new Set([helper, ...(kind === 'panel' ? rank.slice(1, 3) : [])])].filter(Boolean), judge: lead, mode: kind } });
  await refreshModels();
  newChat();
  const c = chatById(S.route.id);
  c.target = `stack:pm-${kind}`; save(); render();
  toast(`${card[1]} is ready, using ${targetLabel(lead)}${helper !== lead ? ` and ${targetLabel(helper)}` : ''}. Ask it something hard.`, 6000);
}

function bindRecipes() {
  $$('[data-pm]').forEach((b) => b.addEventListener('click', () => { b.disabled = true; createPowerMove(b.dataset.pm); }));
  $$('[data-pm-chat]').forEach((b) => b.addEventListener('click', () => { newChat(); const c = chatById(S.route.id); c.target = `stack:pm-${b.dataset.pmChat}`; save(); render(); }));
  $$('[data-rx]').forEach((b) => b.addEventListener('click', () => { b.disabled = true; b.textContent = 'Setting up…'; setUpRecipe(b.dataset.rx); }));
  $$('[data-rx-chat]').forEach((b) => b.addEventListener('click', () => newChat(`as-rx-${b.dataset.rxChat}`)));
}
