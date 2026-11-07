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
  voices: { name: 'Windows voices', what: 'Read aloud and two-voice podcasts (Create → Voice)', go: 'studio' },
  beats: { name: 'Beat & melody synth', what: 'Drums, bass, chords and melody as MP3 (Create → Music)', go: 'studio' },
  vocals: { name: 'Vocal remover', what: 'Takes vocals out or brings them forward (2-way, not 4 stems)', go: 'studio' },
  upscale: { name: 'Upscale 4×', what: 'Sharp enlargement (not AI upscaling yet)', go: 'studio' },
  bgremove: { name: 'Remove background', what: 'Uses an AI photo-edit model (FLUX Kontext or Qwen Image Edit)', go: 'models' },
  fps60: { name: 'Smooth to 60 fps', what: 'Motion-interpolated frames (Create → Quick fixes)', go: 'studio' },
  videoedit: { name: 'Video editor', what: 'Trim, crop, speed, captions by hand (Create → Edit video)', go: 'studio' },
  master: { name: 'Podcast mastering', what: 'Noise removal, compression and loudness (Create → Quick fixes)', go: 'studio' },
  whisper: { name: 'Voice typing (Whisper)', what: 'Speech to text on this PC: the mic button in chat, or Ctrl+Space', go: 'settings' },
  melody: { name: 'Melody writer & player', what: 'Writes a tune over chords and plays it back as an MP3 (Create → Music)', go: 'studio' },
  loudness: { name: 'Loudness & cleanup', what: 'Streaming-ready loudness, hiss and hum removal (Create → Quick fixes)', go: 'studio' },
};
const WHISPER = (role) => rxT('whisper', role, 'Whisper Large v3 Turbo');
const SUNO = (role) => rxX('Suno v4 / Udio', role, 'Neither has an official public API to connect to.');
const VEO = (role) => rxX('Veo 2 / Runway Gen-3', role, 'Cloud video APIs aren\'t connected in Quicksilver yet.');

const RX_GROUPS = [
  ['music', '🎵 Music, audio, voice & podcasts'], ['office', '📊 Office, Excel & bookkeeping'], ['research', '🔬 Medical, science & academic research'],
  ['photo', '🎨 Photos, editing & e-commerce'], ['video', '🎬 Video & short-form content'], ['code', '💻 Coding, apps & security'],
  ['writing', '✍️ Writing, books & marketing'], ['finance', '💰 Finance, tax & contracts'], ['learn', '🎓 Tutoring & languages'], ['games', '🎮 Games, D&D & game development'],
];

const STACK_RECIPES = [
  // ---------- Music: three song teams, each for a different job (any genre) ----------
  { id: 'song-complete', group: 'music', where: 'local', name: 'Songwriter: any genre, with chords, melody & a demo beat', icon: '🎶', temperature: 0.85,
    parts: [rxM('gemma-2-9b', 'Lyricist', 'creative'), rxM('qwen3-8b', 'Co-writer: structure, rhyme & chords', 'creative'), rxT('melody', 'Melody guide'), rxT('beats', 'Demo beat', 'MusicGen Stereo')],
    lead: 'qwen3-8b', skill: 'song-writer',
    instructions: 'You are a professional songwriter who writes in any genre: pop, rap, rock, country, folk, R&B, EDM, worship, musical theatre and more. Work out the genre and mood from the request (ask only if it is unclear) and follow that genre\'s conventions: rap gets multisyllabic rhymes and flow, pop a short repeated hook, country a title line with a twist, folk a story. Give a title, key, tempo and feel; labelled sections (Verse, Pre-chorus, Chorus, Bridge) with chord symbols above the lyrics; a strong, singable hook; concrete images instead of clichés; matching syllable counts in matching lines. End with a short melody note and arrangement note. Never copy existing lyrics.' },
  { id: 'song-doctor', group: 'music', where: 'local', name: 'Song doctor: critique, rewrite & translate lyrics', icon: '🩺', temperature: 0.6, mode: 'debate',
    parts: [rxM('deepseek-r1-qwen3-8b', 'Critic: structure, rhyme & flow', 'reasoning'), rxM('gemma-2-9b', 'Rewriter: stronger lines & hook', 'creative')],
    lead: 'gemma-2-9b', skill: 'song-critique',
    instructions: 'You are a song doctor. For feedback: say what works, then the biggest problems (hook, structure, clichés, rhyme and syllable flow, stresses landing on the beat), then a rewritten version that keeps the writer\'s voice, with changes in bold. For translation: make it singable to the same melody (same syllables and stresses per line, rhymes kept where they matter), then give a literal translation underneath.' },
  { id: 'song-score', group: 'music', where: 'local', name: 'Soundtrack & jingle composer: film, games & ads', icon: '🎬', temperature: 0.75,
    parts: [rxM('qwen3-14b', 'Composer: themes, cues & orchestration', 'general'), rxM('gemma-2-9b', 'Story & mood', 'creative'), rxT('melody', 'Theme sketches')],
    lead: 'qwen3-14b', skill: 'score-cue',
    instructions: 'You compose music for picture, games and brands. For a scene or level: a cue sheet (timing, emotion, tempo, key), a memorable theme with chords, orchestration and how it builds or loops. For a jingle or ad: several short, catchy options with the name sung clearly, a tempo and a melody guide. Sketch themes as playable melodies when useful.' },

  // ---------- Music, audio, voice & podcasts ----------
  { id: 'music-producer', group: 'music', where: 'local', name: 'Music producer, beat maker & stem splitter', icon: '🎚️',
    parts: [rxM('llama-3.2-3b', 'Lyrics & chords'), rxT('beats', 'Beat synth', 'MusicGen Stereo'), rxT('vocals', 'Vocal & stem separation', 'Demucs v4'), WHISPER('Vocal timing')],
    instructions: 'You are a music producer and songwriter. Write lyrics with labelled sections and chord symbols, suggest tempo, key and arrangement, and describe beats as drum, bass and melody patterns. Keep it original.', skill: 'make-beat' },
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
    instructions: 'You are a careful bookkeeper. Read receipts and invoices exactly into tables (date, vendor, category, amount, tax), categorise transactions, and check that totals and balances add up, showing the maths.' },
  { id: 'private-analyst', group: 'office', where: 'hybrid', name: 'Private office, medical & legal analyst', icon: '🛡️',
    parts: [rxM('llama-3.2-3b', 'Local scrubber for personal details'), rxT('knowledge', 'Local document search', 'Nomic Embed v1.5'), rxC('openai', 'Executive summary', 'OpenAI')],
    library: true,
    instructions: 'You are a careful analyst for sensitive office, medical and legal material. Before anything is summarised, replace names, addresses, ID numbers and other personal details with placeholders like [NAME 1]. Then summarise clearly with citations.' },

  // ---------- Medical, science & academic research ----------
  { id: 'clinical-evidence', group: 'research', where: 'local', private: 'Strictly isolated', name: 'Isolated medical journal & clinical evidence', icon: '🩺',
    parts: [rxT('knowledge', 'PubMed / Cochrane / FDA indexer', 'Nomic Embed v1.5'), rxM('qwen2.5-7b', 'Clinical synthesiser'), rxM('deepseek-r1-qwen3-8b', 'Peer-review double-checker')],
    lead: 'deepseek-r1-qwen3-8b', library: true, strict: true, factCheck: true,
    instructions: 'You synthesise clinical evidence only from the indexed journals and documents. Give a bottom line, then the evidence by study type with effect sizes and quality, and cite every claim. Say clearly when the sources do not answer. Information, not medical advice.' },
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
    instructions: 'You make animated GIFs. Turn each idea into one simple, punchy action that loops back to where it started, with a big expressive subject and a plain background, so it reads at sticker size. Offer two or three quick variations (expression, colour, caption) when it helps.' },
  { id: 'agency-cloud', group: 'video', where: 'cloud', name: 'Photo, video & design agency (cloud)', icon: '🏢',
    parts: [rxC('google', 'Creative director', 'Gemini'), rxC('together', '4MP keyframes', 'Together AI (FLUX models)'), VEO('Cinematic video')],
    instructions: 'You are a creative director at a design agency. Write briefs, storyboards and precise prompts for photo and video production.' },

  // ---------- Coding, apps & security ----------
  { id: 'fullstack-16gb', group: 'code', where: 'local', name: 'Full-stack coding (tuned for 16 GB PCs)', icon: '💻',
    parts: [rxM('deepseek-r1-qwen3-8b', 'Architecture & bug reasoner'), rxM('qwen2.5-coder-7b', 'Main coder'), rxM('qwen2.5-coder-1.5b', 'Quick completions & tests'), rxT('knowledge', 'Repository search', 'Nomic Embed v1.5')],
    lead: 'deepseek-r1-qwen3-8b', library: true,
    instructions: 'You are a senior full-stack engineer. Plan the structure first, then write complete, correct code with file names, tests and run instructions. Explain bugs by their root cause.' },
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
    instructions: 'You analyse personal finances privately: categorise bank exports, build budgets, model savings and compounding (show the maths), and prepare tax checklists. General information, not financial advice.' },
  { id: 'contract-auditor', group: 'finance', where: 'local', private: 'Private', name: 'Contract, lease & NDA red-flag auditor', icon: '⚖️',
    parts: [rxT('knowledge', 'Clause search', 'Nomic Embed v1.5'), rxM('deepseek-r1-qwen3-8b', 'Liability, indemnity & IP trap auditor'), rxM('qwen2.5-7b', 'Plain-English redline drafter')],
    lead: 'qwen2.5-7b', library: true,
    instructions: 'You review contracts, leases and NDAs: summarise in plain English, list risky clauses (liability, indemnity, IP, termination, auto-renewal) in a table with suggested redlines, and note key dates and money. Not legal advice.' },

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
];

// ---------- status of each part on this PC ----------

// ---------- tuned for each PC ----------
// A recipe names a model for each role; on a PC that runs a stronger model of the same kind
// smoothly, that one is used instead (and a lighter one on a PC where the named one won't fit).
// Models you already have are preferred, so nothing is downloaded twice.
const RX_LADDERS = {
  creative: ['gemma-3-27b', 'mistral-small-3.2', 'qwen3-30b-a3b', 'mistral-nemo-12b', 'gemma-3-12b', 'qwen3-14b', 'gemma-2-9b', 'qwen3-8b', 'llama-3.1-8b', 'qwen3-4b', 'gemma-3-4b', 'llama-3.2-3b'],
  general: ['qwen3-30b-a3b', 'qwen3-32b', 'qwen3-14b', 'phi-4', 'qwen2.5-14b', 'qwen3-8b', 'qwen2.5-7b', 'llama-3.1-8b', 'qwen3-4b', 'llama-3.2-3b'],
  reasoning: ['qwen3-30b-a3b-thinking', 'qwq-32b', 'deepseek-r1-qwen-32b', 'phi-4-reasoning-plus', 'deepseek-r1-qwen-14b', 'deepseek-r1-qwen3-8b', 'qwen3-4b-thinking'],
  coding: ['qwen3-coder-30b', 'qwen2.5-coder-32b', 'devstral-small', 'qwen2.5-coder-14b', 'qwen2.5-coder-7b', 'qwen2.5-coder-3b'],
  vision: ['gemma-3-27b', 'mistral-small-3.2', 'qwen3-vl-8b', 'gemma-3-12b', 'qwen2.5-vl-7b', 'qwen3-vl-4b', 'gemma-3-4b', 'qwen3-vl-2b'],
  open: ['dolphin-3-mistral-24b', 'hermes-4-14b', 'rocinante-12b', 'mistral-nemo-12b', 'hermes-3-llama-3.1-8b', 'dolphin-3-llama-3.1-8b', 'hermes-3-llama-3.2-3b'],
};
const RX_CLASS = { small: 'general', general: 'general', large: 'general', reasoning: 'reasoning', coding: 'coding', vision: 'vision', open: 'open' };
const RX_RATE = { great: 4, good: 3, ok: 2, slow: 1, wont: 0 };
// Small models from the same family make the lead faster (speculative decoding).
const RX_SPEED = [[/^qwen3-(4b|8b|14b|32b)(-thinking)?$/, 'qwen3-1.7b'], [/^llama-3\.(1-8b|3-70b)$/, 'llama-3.2-1b'], [/^qwen2\.5-(coder-)?(7b|14b|32b)$/, 'qwen2.5-coder-1.5b']];

function rxResolve(r) {
  if (r._resolved && r._resolvedAt === S.est && r._inst === S.installed.length) return r._resolved;
  const taken = new Set();
  const rate = (id) => RX_RATE[S.est?.text?.[id]?.rating] ?? -1;
  const size = (id) => S.catalog.text.find((x) => x.id === id)?.sizeGB || 0;
  const leadId = r.lead || r.parts.filter((p) => p.kind === 'model' && S.catalog.text.some((x) => x.id === p.id)).at(-1)?.id;
  const parts = r.parts.map((p) => {
    const cm = p.kind === 'model' && S.catalog.text.find((x) => x.id === p.id);
    if (!cm || !S.est?.text || S.data.prefs.rxExact) { if (p.kind === 'model') taken.add(p.id); return p; }
    const ladder = RX_LADDERS[p.ladder || RX_CLASS[cm.category]] || [];
    const isLead = p.id === leadId;
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
    return pick === p.id ? p : { ...p, id: pick, from: p.id, up: ladder.indexOf(pick) < ladder.indexOf(p.id) };
  });
  const leadPart = parts.find((p, i) => r.parts[i].id === leadId);
  const helper = leadPart && RX_SPEED.find(([re]) => re.test(leadPart.id))?.[1];
  if (helper && !taken.has(helper) && rate(helper) >= 3) parts.push({ kind: 'model', id: helper, role: 'Speed helper: drafts ahead so the lead writes 1.5–2.5× faster', helper: true });
  r._resolved = { parts, lead: leadPart?.id || leadId };
  r._resolvedAt = S.est; r._inst = S.installed.length;
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
  return `<div class="card rx-card">
    <div class="row"><span class="emoji-badge">${r.icon}</span><h3 class="grow" style="margin:0">${esc(r.name)}</h3></div>
    <div class="row" style="gap:5px;margin:8px 0;flex-wrap:wrap"><span class="badge ${where[1]}">${where[0]}</span>${r.private ? `<span class="badge b-peach">🔒 ${esc(r.private)}</span>` : ''}${gb ? `<span class="badge b-lav">${gb.toFixed(1)} GB to download</span>` : r.where !== 'cloud' ? '<span class="badge b-mint">nothing to download</span>' : ''}</div>
    <div class="rx-parts">${rows.map(({ p, s }) => `<div class="rx-part ${s.cls}" title="${esc(s.title || '')}"><span class="rx-ic">${s.icon}</span><span class="rx-body"><span class="rx-top"><b>${esc(p.role)}</b><span class="rx-note">${esc(s.note)}</span></span><span class="rx-sub">${esc(s.sub)}</span></span></div>`).join('')}</div>
    ${missing ? `<p class="small muted" style="margin:6px 0 0">${missing === 1 ? 'One part isn\'t' : `${missing} parts aren't`} available in Quicksilver yet; the rest works now. Hover a part for details.</p>` : ''}
    <div class="row" style="margin-top:10px">${made ? '<span class="badge b-mint">✓ Set up</span><button class="btn small" data-rx-chat="' + r.id + '">Chat</button>' : `<button class="btn small primary" data-rx="${r.id}" ${blocked ? 'title="One of its models is too big for this PC; the rest will still be set up"' : ''}>${gb ? 'Download & set up' : 'Set up'}</button>`}</div>
  </div>`;
}

function recipesHTML() {
  if (simpleOn()) return `<details class="rx-fold"><summary><span><b>Ready-made teams for specific work</b> <span class="small muted">${STACK_RECIPES.length} teams: music, office, research, photos, video, code, writing, finance, tutoring, games</span></span></summary>${recipesBody()}</details>`;
  return `<div class="section"><h2>Teams for specific work</h2><span class="small muted">${STACK_RECIPES.length} ready-made teams. ✓ ready · ⬇ downloads · ☁ needs a cloud connection · – not in Quicksilver yet</span></div>${recipesBody()}`;
}
function recipesBody() {
  return `${RX_GROUPS.map(([g, label]) => { const list = STACK_RECIPES.filter((r) => r.group === g); return list.length ? `<h3 class="int-group">${esc(label.replace(/^\S+\s/, ''))}</h3><div class="cards rx-grid">${list.map(recipeCard).join('')}</div>` : ''; }).join('')}`;
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
  ['plan', 'Plan, then solve', '🗺️', 'A fast model plans the steps; your strongest model follows the plan. Long tasks come out complete and well organised.', 'Reports, projects, long how-tos'],
  ['panel', 'Expert panel', '🎓', 'A practical expert, a sceptic and a creative thinker each weigh in; the lead turns it into one balanced answer.', 'Decisions, plans, big choices'],
];
function powerMovesHTML() {
  return `<div class="section"><h2>Power moves</h2><span class="small muted">Little-known ways of making AIs work together. Each one makes your own models answer better than they can alone.</span></div>
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
  await call('stacks:save', { id: `pm-${kind}`, name: card[1], emoji: card[2], builtFor: 'power', members: { drafters: [...new Set([helper, ...(kind === 'panel' ? rank.slice(1, 3) : [])])].filter(Boolean), judge: lead, mode: kind } });
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
