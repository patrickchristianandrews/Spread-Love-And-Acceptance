// Specialist stacks: ready-made teams for specific kinds of work, shown on the Stacks page under
// "Stacks for specific work". Each part is one of:
//   rxM a model from the catalog (downloaded, runs on this PC)
//   rxT a tool built into Quicksilver (sometimes standing in for a named model it doesn't run yet)
//   rxC a cloud service you connect with a key
//   rxX not available in Quicksilver yet (with the reason)
// "Set up" downloads the models, creates the stack and an assistant that uses it.
'use strict';

const rxM = (id, role) => ({ kind: 'model', id, role });
const rxT = (id, role, instead) => ({ kind: 'tool', id, role, instead });
const rxC = (provider, role, label) => ({ kind: 'cloud', provider, role, label });
const rxX = (name, role, why) => ({ kind: 'missing', name, role, why });

const RX_TOOLS = {
  knowledge: { name: 'Knowledge bases', what: 'Quicksilver\'s own document search', go: 'library' },
  voices: { name: 'Windows voices', what: 'Read aloud and two-voice podcasts (Studio → Voice)', go: 'studio' },
  beats: { name: 'Beat & melody synth', what: 'Drums, bass, chords and melody as MP3 (Studio → Music)', go: 'studio' },
  vocals: { name: 'Vocal remover', what: 'Takes vocals out or brings them forward (2-way, not 4 stems)', go: 'studio' },
  upscale: { name: 'Upscale 4×', what: 'Sharp enlargement (not AI upscaling yet)', go: 'studio' },
  bgremove: { name: 'Remove background', what: 'Uses an AI photo-edit model (FLUX Kontext or Qwen Image Edit)', go: 'models' },
  fps60: { name: 'Smooth to 60 fps', what: 'Motion-interpolated frames (Studio → Quick fixes)', go: 'studio' },
  videoedit: { name: 'Video editor', what: 'Trim, crop, speed, captions by hand (Studio → Edit video)', go: 'studio' },
  master: { name: 'Podcast mastering', what: 'Noise removal, compression and loudness (Studio → Quick fixes)', go: 'studio' },
};
const WHISPER = (role) => rxX('Whisper Large v3 Turbo', role, 'Speech-to-text arrives with voice input, which is planned.');
const SUNO = (role) => rxX('Suno v4 / Udio', role, 'Neither has an official public API to connect to.');
const VEO = (role) => rxX('Veo 2 / Runway Gen-3', role, 'Cloud video APIs aren\'t connected in Quicksilver yet.');

const RX_GROUPS = [
  ['music', '🎵 Music, audio, voice & podcasts'], ['office', '📊 Office, Excel & bookkeeping'], ['research', '🔬 Medical, science & academic research'],
  ['photo', '🎨 Photos, editing & e-commerce'], ['video', '🎬 Video & short-form content'], ['code', '💻 Coding, apps & security'],
  ['writing', '✍️ Writing, books & marketing'], ['finance', '💰 Finance, tax & contracts'], ['learn', '🎓 Tutoring & languages'], ['games', '🎮 Games, D&D & game development'],
];

const STACK_RECIPES = [
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
    parts: [rxT('knowledge', 'PubMed / Cochrane / FDA indexer', 'Nomic Embed v1.5'), rxM('qwen2.5-7b', 'Clinical synthesiser'), rxM('deepseek-r1-qwen3-8b', 'Peer-review fact checker')],
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

const catModel = (id) => S.catalog.text.find((x) => x.id === id) || S.catalog.media.find((x) => x.id === id);
const haveModel = (id) => S.installed.find((x) => x.catalogId === id || x.id === id);
const providerOn = (p) => S.providers.some((x) => x.preset === p && (x.hasKey || x.noKey));
const mcpOn = (name) => (intData?.mcp || []).some((s) => /elevenlabs/i.test(s.name || '') && name === 'elevenlabs');

function partStatus(p) {
  if (p.kind === 'model') {
    const cm = catModel(p.id);
    const est = S.est?.text?.[p.id] || S.est?.media?.[p.id];
    const gb = (cm?.sizeGB || 0) + (cm?.mmprojGB || 0);
    if (haveModel(p.id)) return { icon: '✓', cls: 'ok', sub: cm?.name || p.id, note: 'installed' };
    if (est?.rating === 'wont') return { icon: '!', cls: 'bad', sub: cm?.name || p.id, note: 'too big', title: 'Too big for this PC. Click the model under Models for what it needs.' };
    return { icon: '⬇', cls: 'dl', sub: cm?.name || p.id, note: `${gb.toFixed(1)} GB`, gb };
  }
  if (p.kind === 'tool') { const tl = RX_TOOLS[p.id]; return { icon: '✓', cls: 'ok', sub: `${tl.name}${p.instead ? `, in place of ${p.instead}` : ''}`, note: 'built in', title: tl.what }; }
  if (p.kind === 'cloud') {
    const on = p.provider === 'elevenlabs' ? mcpOn('elevenlabs') : providerOn(p.provider);
    return { icon: '☁', cls: on ? 'ok' : 'cloud', sub: p.label, note: on ? 'connected' : 'connect', title: on ? '' : p.provider === 'elevenlabs' ? 'Add it under Integrations → MCP servers.' : 'Connect it under Models → Connect an API.' };
  }
  return { icon: '–', cls: 'miss', sub: p.name, note: 'not yet', title: p.why };
}

function recipeCard(r) {
  const rows = r.parts.map((p) => ({ p, s: partStatus(p) }));
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
  return `<div class="section"><h2>Stacks for specific work</h2><span class="small muted">${STACK_RECIPES.length} ready-made teams. ✓ ready · ⬇ downloads · ☁ needs a cloud connection · – not in Quicksilver yet</span></div>
    ${RX_GROUPS.map(([g, label]) => { const list = STACK_RECIPES.filter((r) => r.group === g); return list.length ? `<h3 class="int-group">${esc(label.replace(/^\S+\s/, ''))}</h3><div class="cards rx-grid">${list.map(recipeCard).join('')}</div>` : ''; }).join('')}`;
}

async function setUpRecipe(id) {
  const r = STACK_RECIPES.find((x) => x.id === id);
  if (!r) return;
  const models = r.parts.filter((p) => p.kind === 'model');
  const usable = models.filter((p) => S.est?.text?.[p.id]?.rating !== 'wont' && S.est?.media?.[p.id]?.rating !== 'wont');
  // Downloads run in the background; the stack is ready as soon as they finish.
  for (const p of usable) if (!haveModel(p.id) && !S.downloads[p.id]) download({ catalogId: p.id }, catModel(p.id)?.name || p.id).catch(() => {});
  const text = usable.filter((p) => S.catalog.text.some((tm) => tm.id === p.id)).map((p) => p.id);
  const target = (cid) => `local:${haveModel(cid)?.id || cid}`;
  const cloud = r.parts.find((p) => p.kind === 'cloud' && p.provider !== 'elevenlabs' && providerOn(p.provider));
  const cloudTarget = cloud ? S.targets.find((tg) => tg.target.startsWith(`api:${S.providers.find((pv) => pv.preset === cloud.provider).id}:`))?.target : null;
  let brain = '';
  if (text.length >= 2 || (text.length && cloudTarget)) {
    const lead = r.lead && text.includes(r.lead) ? r.lead : text[text.length - 1];
    const drafters = text.filter((d) => d !== lead);
    const vision = text.find((d) => S.catalog.text.find((tm) => tm.id === d)?.vision);
    await call('stacks:save', { id: `rx-${r.id}`, name: r.name, emoji: r.icon, builtFor: 'recipe',
      members: { drafters: (drafters.length ? drafters : [lead]).map(target), judge: cloudTarget || target(lead), vision: vision && vision !== lead ? target(vision) : undefined, mode: 'blend' } });
    brain = `stack:rx-${r.id}`;
  } else if (text.length === 1) brain = target(text[0]);
  else if (cloudTarget) brain = cloudTarget;
  const as = { id: `as-rx-${r.id}`, name: r.name.split(/[,&(]/)[0].trim(), emoji: r.icon, description: r.name, instructions: r.instructions, target: brain, temperature: 0.5,
    library: Boolean(r.library), strict: Boolean(r.strict), web: Boolean(r.web), factCheck: Boolean(r.factCheck), tools: false, skill: r.skill || '', group: 'Yours' };
  S.data.assistants = S.data.assistants.filter((a) => a.id !== as.id);
  S.data.assistants.push(as);
  save();
  await refreshModels();
  const pendingDl = usable.some((p) => !haveModel(p.id));
  toast(`${r.name} is set up${pendingDl ? '; its models are downloading' : ''}. Find it under Assistants, or press Chat.`, 6000);
  render();
}

function bindRecipes() {
  $$('[data-rx]').forEach((b) => b.addEventListener('click', () => { b.disabled = true; b.textContent = 'Setting up…'; setUpRecipe(b.dataset.rx); }));
  $$('[data-rx-chat]').forEach((b) => b.addEventListener('click', () => newChat(`as-rx-${b.dataset.rxChat}`)));
}
