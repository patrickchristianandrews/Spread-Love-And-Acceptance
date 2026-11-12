// Cloud and network AI services ("APIs"). Optional: everything works without them.
// Anthropic (Claude) uses its own SDK; everything else speaks the OpenAI format.
const store = require('./store');
const oai = require('./oai');

// free: 'local' (runs on this PC), 'free' (a free plan with a key), 'some' (some free models or
// credits), 'paid' (pay as you go). Free plans change, so the app also links to the pricing page.
const PRESETS = {
  google: { best: 'gemini-2.5-flash', bestWhy: 'Fast, strong and on the free plan; Gemini Pro models are stronger but have tighter free limits.', name: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', keyUrl: 'https://aistudio.google.com/apikey', vision: true,
    free: 'free', freeNote: 'Free plan: get a key in Google AI Studio with a Google account, no card. Daily limits apply, and Google may use free-plan prompts to improve its products.', priceUrl: 'https://ai.google.dev/pricing' },
  groq: { best: 'openai/gpt-oss-120b', bestWhy: 'The strongest open model there, at hundreds of words a second.', name: 'Groq (very fast)', baseUrl: 'https://api.groq.com/openai/v1', keyUrl: 'https://console.groq.com/keys',
    free: 'free', freeNote: 'Free plan: sign up and create a key, no card. Requests per minute and per day are limited.', priceUrl: 'https://groq.com/pricing' },
  pollinations: { best: 'openai', bestWhy: 'A free hosted model with no key or account at all.', name: 'Pollinations (free, no key)', baseUrl: 'https://text.pollinations.ai/openai', noKey: true, vision: true,
    models: ['openai', 'openai-large', 'mistral', 'llama'], free: 'free', freeNote: 'Free: no key or account at all. Rate limited and can be busy, so it works best as a backup to your own models.', priceUrl: 'https://pollinations.ai' },
  openrouter: { best: 'openrouter/auto', bestWhy: 'Picks the best model for each question automatically; any model ending in :free costs nothing.', name: 'OpenRouter (hundreds of models)', baseUrl: 'https://openrouter.ai/api/v1', keyUrl: 'https://openrouter.ai/keys', vision: true,
    free: 'some', freeNote: 'Free models: any model whose name ends in ":free" costs nothing, with a daily limit. Other models are pay as you go.', priceUrl: 'https://openrouter.ai/models?max_price=0' },
  github: { best: 'openai/gpt-4.1', bestWhy: 'The strongest general model on the free GitHub plan.', name: 'GitHub Models', baseUrl: 'https://models.github.ai/inference', keyUrl: 'https://github.com/settings/personal-access-tokens', vision: true, models: ['openai/gpt-4.1-mini', 'meta/Llama-3.3-70B-Instruct', 'deepseek/DeepSeek-R1', 'mistral-ai/Mistral-Large-2411'],
    free: 'free', freeNote: 'Free with a GitHub account: use a personal access token with the "models" permission. Good for trying models; daily limits are low.', priceUrl: 'https://docs.github.com/en/github-models/use-github-models/prototyping-with-ai-models#rate-limits' },
  cerebras: { best: 'qwen-3-235b-a22b-instruct-2507', bestWhy: 'Qwen3 235B, the big sibling of the built-in model: very fast, with a large free daily allowance. gpt-oss-120b is the other strong pick.', name: 'Cerebras (very fast)', baseUrl: 'https://api.cerebras.ai/v1', keyUrl: 'https://cloud.cerebras.ai',
    free: 'free', freeNote: 'Free plan: sign up and create a key, no card. Daily token limits apply.', priceUrl: 'https://www.cerebras.ai/pricing' },
  mistral: { best: 'mistral-large-latest', bestWhy: 'Mistral\'s strongest model, on the free Experiment plan.', name: 'Mistral AI', baseUrl: 'https://api.mistral.ai/v1', keyUrl: 'https://console.mistral.ai/api-keys', vision: true,
    free: 'free', freeNote: 'Free "Experiment" plan: verify a phone number, no card. Rate limits apply, and free-plan prompts may be used for training.', priceUrl: 'https://mistral.ai/pricing' },
  huggingface: { best: 'openai/gpt-oss-120b', bestWhy: 'A strong open model; hundreds of others are available.', name: 'Hugging Face', baseUrl: 'https://router.huggingface.co/v1', keyUrl: 'https://huggingface.co/settings/tokens', vision: true,
    free: 'some', freeNote: 'Free monthly credits come with a Hugging Face account (a small amount; PRO gives more). Then pay as you go.', priceUrl: 'https://huggingface.co/docs/inference-providers/pricing' },
  together: { best: 'meta-llama/Llama-3.3-70B-Instruct-Turbo', bestWhy: 'A strong, fast, low-cost all-rounder.', name: 'Together AI', baseUrl: 'https://api.together.xyz/v1', keyUrl: 'https://api.together.ai/settings/api-keys', imageModels: ['black-forest-labs/FLUX.1-schnell-Free'],
    free: 'some', freeNote: 'A few free models (like FLUX.1 Schnell Free for images); others are pay as you go. A small credit purchase may be needed to activate the account.', priceUrl: 'https://www.together.ai/pricing' },
  anthropic: { best: 'claude-opus-5-5', bestWhy: 'Claude\'s most capable model; Sonnet is the best value, Haiku the fastest.', name: 'Anthropic (Claude)', baseUrl: 'https://api.anthropic.com', keyUrl: 'https://console.anthropic.com/settings/keys', models: ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-fable-5-1'], vision: true,
    free: 'paid', freeNote: 'Pay as you go: buy credits first. No ongoing free plan.', priceUrl: 'https://www.anthropic.com/pricing#api' },
  openai: { best: 'gpt-5', bestWhy: 'OpenAI\'s flagship; gpt-5-mini is much cheaper for everyday use.', name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', keyUrl: 'https://platform.openai.com/api-keys', imageModels: ['gpt-image-1'], vision: true,
    free: 'paid', freeNote: 'Pay as you go: add credit first. A ChatGPT subscription does not include the API.', priceUrl: 'https://openai.com/api/pricing' },
  deepseek: { best: 'deepseek-reasoner', bestWhy: 'Strong reasoning at a very low price; deepseek-chat is quicker.', name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', keyUrl: 'https://platform.deepseek.com/api_keys',
    free: 'paid', freeNote: 'Pay as you go, at very low prices. No free plan.', priceUrl: 'https://api-docs.deepseek.com/quick_start/pricing' },
  xai: { best: 'grok-4', bestWhy: 'xAI\'s strongest model.', name: 'xAI (Grok)', baseUrl: 'https://api.x.ai/v1', keyUrl: 'https://console.x.ai', vision: true,
    free: 'paid', freeNote: 'Pay as you go. New accounts sometimes get promotional credits.', priceUrl: 'https://docs.x.ai/docs/models' },
  fal: { name: 'fal.ai (photo, video & music)', media: true, baseUrl: 'https://queue.fal.run', keyUrl: 'https://fal.ai/dashboard/keys', models: [],
    bestWhy: 'One key for the best cloud photo, video and music models: Nano Banana 2.1, Veo 3.1, Kling 3, ElevenLabs Music, MiniMax Music and Lyria. Used in Gallery & tools → Cloud.',
    free: 'paid', freeNote: 'Pay per picture, second of video or song (for example about $0.04 a picture, $0.40 a second of Veo 3.1 video). New accounts sometimes get a small credit.', priceUrl: 'https://fal.ai/pricing' },
  replicate: { name: 'Replicate (photo, video & music models)', media: true, baseUrl: 'https://api.replicate.com/v1', keyUrl: 'https://replicate.com/account/api-tokens', models: [],
    bestWhy: 'Thousands of image, video and music models with one key; FLUX.1 Schnell is about $0.003 a picture. Used in Gallery & tools → Cloud (type any owner/name model there).',
    free: 'some', freeNote: 'About $5 of free credits for new accounts (no card), then pay per run.', priceUrl: 'https://replicate.com/pricing' },
  stability: { name: 'Stability AI (pictures)', media: true, baseUrl: 'https://api.stability.ai', keyUrl: 'https://platform.stability.ai/account/keys', models: [],
    bestWhy: 'Stable Image Core and Ultra, the makers of Stable Diffusion. Used in Gallery & tools → Cloud.',
    free: 'some', freeNote: '25 free credits a month (about 8 Core pictures), then credits from $10.', priceUrl: 'https://platform.stability.ai/pricing' },
  aimlapi: { name: 'AI/ML API (200+ models, one key)', baseUrl: 'https://api.aimlapi.com/v1', keyUrl: 'https://aimlapi.com/app/keys', vision: true,
    bestWhy: 'One key for GPT, Claude, Gemini, DeepSeek, Llama and more; pick a model from the list once connected.',
    free: 'some', freeNote: 'A free tier with limited requests, then pay as you go.', priceUrl: 'https://aimlapi.com/ai-ml-api-pricing' },
  litellm: { name: 'LiteLLM proxy (your server)', baseUrl: 'http://localhost:4000/v1', noKey: true, free: 'local', freeNote: 'Free: your own LiteLLM proxy, which can route to any provider. Add its key if you set one.' },
  ollama: { name: 'Ollama (on this PC)', baseUrl: 'http://localhost:11434/v1', noKey: true, vision: true, free: 'local', freeNote: 'Free: runs on this PC with no key.' },
  lmstudio: { name: 'LM Studio (on this PC)', baseUrl: 'http://localhost:1234/v1', noKey: true, vision: true, free: 'local', freeNote: 'Free: runs on this PC with no key.' },
  // ---------- more cloud AIs (all OpenAI-compatible) ----------
  perplexity: { name: 'Perplexity (answers with web sources)', baseUrl: 'https://api.perplexity.ai', keyUrl: 'https://www.perplexity.ai/settings/api', best: 'sonar-pro', bestWhy: 'Searches the web and cites sources in every answer.', models: ['sonar-pro', 'sonar', 'sonar-reasoning-pro'],
    free: 'paid', freeNote: 'Pay as you go: add credit first. Perplexity Pro subscribers get a small monthly API credit.', priceUrl: 'https://docs.perplexity.ai/guides/pricing' },
  fireworks: { name: 'Fireworks AI', baseUrl: 'https://api.fireworks.ai/inference/v1', keyUrl: 'https://fireworks.ai/account/api-keys', best: 'accounts/fireworks/models/llama-v3p3-70b-instruct', bestWhy: 'Fast hosting of the best open models.', vision: true,
    free: 'some', freeNote: 'A small free credit when you sign up, then pay as you go.', priceUrl: 'https://fireworks.ai/pricing' },
  deepinfra: { name: 'DeepInfra', baseUrl: 'https://api.deepinfra.com/v1/openai', keyUrl: 'https://deepinfra.com/dash/api_keys', best: 'meta-llama/Llama-3.3-70B-Instruct', bestWhy: 'Very low prices for big open models.',
    free: 'paid', freeNote: 'Pay as you go, at some of the lowest prices for open models.', priceUrl: 'https://deepinfra.com/pricing' },
  sambanova: { name: 'SambaNova (very fast)', baseUrl: 'https://api.sambanova.ai/v1', keyUrl: 'https://cloud.sambanova.ai/apis', best: 'Meta-Llama-3.3-70B-Instruct', bestWhy: 'Large open models at very high speed.',
    free: 'free', freeNote: 'Free plan with rate limits, no card needed.', priceUrl: 'https://cloud.sambanova.ai/plans/pricing' },
  nvidia: { name: 'NVIDIA NIM (build.nvidia.com)', baseUrl: 'https://integrate.api.nvidia.com/v1', keyUrl: 'https://build.nvidia.com', best: 'meta/llama-3.3-70b-instruct', bestWhy: 'A wide catalog of open models run by NVIDIA.',
    free: 'some', freeNote: 'Free credits for developers with an NVIDIA account, then limits apply.', priceUrl: 'https://build.nvidia.com/explore/discover' },
  cloudflare: { name: 'Cloudflare Workers AI', baseUrl: 'https://api.cloudflare.com/client/v4/accounts/YOUR_ACCOUNT_ID/ai/v1', keyUrl: 'https://dash.cloudflare.com/profile/api-tokens', best: '@cf/meta/llama-3.3-70b-instruct-fp8-fast', bestWhy: 'A strong open model on Cloudflare\'s network.',
    free: 'free', freeNote: 'A free daily allowance with a Cloudflare account. Replace YOUR_ACCOUNT_ID in the address with your account ID.', priceUrl: 'https://developers.cloudflare.com/workers-ai/platform/pricing/' },
  cohere: { name: 'Cohere (Command)', baseUrl: 'https://api.cohere.ai/compatibility/v1', keyUrl: 'https://dashboard.cohere.com/api-keys', best: 'command-a-03-2025', bestWhy: 'Cohere\'s strongest model, good with documents and business writing.',
    free: 'free', freeNote: 'Free trial key with rate limits (not for commercial use). Paid keys for production.', priceUrl: 'https://cohere.com/pricing' },
  ai21: { name: 'AI21 (Jamba)', baseUrl: 'https://api.ai21.com/studio/v1', keyUrl: 'https://studio.ai21.com/account/api-key', best: 'jamba-large', bestWhy: 'Very long documents (256K context).',
    free: 'some', freeNote: 'Free trial credit for new accounts, then pay as you go.', priceUrl: 'https://www.ai21.com/pricing' },
  qwen: { name: 'Alibaba Qwen (Model Studio)', baseUrl: 'https://dashscope-intl.aliyuncs.com/compatible-mode/v1', keyUrl: 'https://modelstudio.console.alibabacloud.com/', best: 'qwen-max', bestWhy: 'Alibaba\'s strongest Qwen model in the cloud.', vision: true,
    free: 'some', freeNote: 'A free token allowance for new users, then pay as you go.', priceUrl: 'https://www.alibabacloud.com/help/en/model-studio/models' },
  moonshot: { name: 'Moonshot (Kimi)', baseUrl: 'https://api.moonshot.ai/v1', keyUrl: 'https://platform.moonshot.ai/console/api-keys', best: 'kimi-latest', bestWhy: 'Kimi: strong at coding and long documents.',
    free: 'paid', freeNote: 'Pay as you go. New accounts sometimes get a small credit.', priceUrl: 'https://platform.moonshot.ai/docs/pricing' },
  zai: { name: 'Z.ai (GLM)', baseUrl: 'https://api.z.ai/api/paas/v4', keyUrl: 'https://z.ai/manage-apikey/apikey-list', best: 'glm-4.6', bestWhy: 'GLM\'s flagship; glm-4.5-flash is free.',
    free: 'some', freeNote: 'GLM Flash models are free; the flagship models are pay as you go.', priceUrl: 'https://docs.z.ai/guides/overview/pricing' },
  minimax: { name: 'MiniMax', baseUrl: 'https://api.minimax.io/v1', keyUrl: 'https://www.minimax.io/platform', best: 'MiniMax-M2', bestWhy: 'Strong at coding and agent tasks for its price.',
    free: 'paid', freeNote: 'Pay as you go.', priceUrl: 'https://www.minimax.io/platform/document/Price' },
  // 171 uncensored, abliterated and role-play models behind one key (the list as of November 2026;
  // "Save & load models" fetches the current one). Speaks the OpenAI format.
  uncensoredllm: { name: 'UncensoredLLM (171 uncensored models)', baseUrl: 'https://api.uncensoredllm.ai/v1', keyUrl: 'https://app.uncensoredllm.ai/console', best: 'glm-5.3-uncensored',
    bestWhy: 'The most uncensored models with one key: GLM-5.3, DeepSeek V4, Kimi K3, Qwen3.8, Gemma 4 and dozens of writing and role-play builds.',
    models: ['glm-5.3-uncensored', 'glm-5.3-abliterated', 'deepseek-v4-pro-uncensored', 'glm-5.3-flash-abliterated', 'glm-5.3-flash-uncensored', 'kimi-k3.1-pro-uncensored', 'kimi-k3-uncensored', 'nemotron-3-ultra-550b-a55b-uncensored', 'deepseek-v4.1-flash-abliterated', 'dolphin-mistral-24b-venice', 'abliterated-model-large-flash', 'abliterated-model', 'abliterated-model-large', 'abliterated-model-large-v2', 'aion-3.5-mini-uncensored', 'aion-rp-llama-3.1-8b', 'amoral-gemma3-27b-v2', 'anubis-70b-v1', 'anubis-70b-v1.1', 'apex-flash-1-abliterated', 'artemis-v1.1', 'cu-mai-r1-70b', 'cyber-frontier', 'cydonia-24b-v2', 'cydonia-24b-v4.1', 'cydonia-24b-v4.3', 'dans-pe-1.3-24b', 'deepseek-r1-distill-llama-70b-abliterated', 'deepseek-r1-distill-qwen-32b-abliterated', 'deepseek-v4-pro-abliterated', 'deepseek-v4-pro-qwen3.5-9b-uncensored-heretic', 'deepseek-v4.1-flash-0910-uncensored', 'deepseek-v4.1-flash-0910-uncensored-thinking', 'deepseek-v4.1-flash-1017-abliterated', 'deepseek-v4.1-flash-1017-heretic-uncensored', 'deepseek-v4.1-flash-1017-heretic-uncensored-thinking', 'deepseek-v4.1-flash-1017-uncensored', 'deepseek-v4.1-flash-1017-uncensored-thinking', 'deepseek-v4.1-flash-abliterated-fast', 'deepseek-v4.1-flash-uncensored', 'deepseek-v4.1-flash-uncensored-thinking', 'euryale-70b-v2.2', 'euryale-70b-v2.3', 'gemma-31b-heretic-uncensored', 'gemma-4-12b-starry-ocean', 'gemma-4-12b-station-keeper', 'gemma-4-26b-a4b-it-chimerax', 'gemma-4-26b-a4b-it-cybersecurity', 'gemma-4-26b-a4b-it-darksoul', 'gemma-4-26b-a4b-it-luminous', 'gemma-4-26b-a4b-it-meromero', 'gemma-4-26b-a4b-it-moonlight', 'gemma-4-26b-a4b-it-musica', 'gemma-4-26b-a4b-it-opusdistill', 'gemma-4-26b-a4b-it-shadowsiren', 'gemma-4-26b-a4b-chimerax', 'gemma-4-26b-a4b-chimerax-heretic', 'gemma-4-26b-a4b-darksoul', 'gemma-4-26b-a4b-luminous-mirror', 'gemma-4-26b-a4b-meromero', 'gemma-4-26b-a4b-moonlight-dusk', 'gemma-4-26b-a4b-musica', 'gemma-4-26b-a4b-opus-distill', 'gemma-4-26b-a4b-shadow-siren', 'gemma-4-26b-a4b-uncensored', 'gemma-4-31b-agares-v1', 'gemma-4-31b-animus-v14.1', 'gemma-4-31b-dark-gemistry', 'gemma-4-31b-darkidol', 'gemma-4-31b-fabled', 'gemma-4-31b-garnet-v2', 'gemma-4-31b-gembrain', 'gemma-4-31b-gembrain-heretic', 'gemma-4-31b-it-gembrain-heretic', 'gemma-4-31b-gembrain-x-core', 'gemma-4-31b-gemsicle', 'gemma-4-31b-isometry', 'gemma-4-31b-isometry-rp', 'gemma-4-31b-k1-v5', 'gemma-4-31b-mero-artemis-v0.3.1', 'gemma-4-31b-meromero', 'gemma-4-31b-meromero-v2', 'gemma-4-31b-novelist', 'gemma-4-31b-queen', 'gemma-4-31b-scarlet', 'gemma-4-31b-sdft-heretic-rp', 'gemma-4-31b-split-untied', 'gemma-4-31b-styletune', 'gemma-4-31b-uncensored', 'glm-4.6-derestricted-v5', 'glm-5.3-flash-apex-abliterated', 'glm-5.3-flash-code-uncensored', 'glm-5.3-flash-cybersecurity', 'hanami-70b-x1', 'inkling-uncensored', 'jailbreak-free-assistant', 'kimi-k2.6-uncensored', 'llama-3-70b-abliterated', 'llama-3.3-70b-abliterated', 'mag-mell-12b-r1', 'magidonia-24b-v4.3', 'magistral-small-uncensored', 'magnum-diamond-24b', 'magnum-v4-72b', 'manta-flash-1.0', 'manta-mini-1.0', 'manta-pro-1.0', 'mimo-v2.6-flash-abliterated', 'mimo-v2.6-flash-uncensored', 'mimo-v2.6-flash-uncensored-thinking', 'mimo-v2.6-pro-uncensored', 'ministral-3-14b-instruct-uncensored', 'ministral-3-8b-instruct-uncensored', 'mistral-large-2-uncensored', 'mistral-large-3-uncensored', 'mythomax-l2-13b', 'nemomix-unleashed-12b', 'neuraldaredevil-8b-abliterated', 'no-filter-ai', 'minimax-m3.1-flash-cybersecurity', 'qwen3.8-flash-next-cybersecurity', 'orca-zero-1.5-cybersecurity', 'qwen2.5-32b-abliterated', 'qwen3.8-27b-uncensored-fast', 'qwen3.8-27b-uncensored-thinking', 'qwen3-coder-next-uncensored', 'qwen3-next-80b-a3b-instruct-uncensored', 'qwen3-vl-235b-a22b-instruct-uncensored', 'qwen3.5-27b-blossom-v6.4-derestricted', 'qwen3.5-27b-bluestar-v3-derestricted', 'qwen3.5-27b-claude-4.6-opus-distilled-derestricted', 'qwen3.5-27b-claude-4.6-opus-distilled-derestricted-lite', 'qwen3.5-27b-queen-derestricted', 'qwen3.5-397b-a17b-uncensored', 'qwen3.8-2.4t-a95b-uncensored', 'qwen3.8-27b-abliterated', 'qwen3.8-27b-antislop', 'qwen3.8-27b-cybersecurity', 'qwen3.8-27b-darkidol', 'qwen3.8-27b-fable', 'qwen3.8-27b-fimi', 'qwen3.8-27b-hemingway', 'qwen3.8-27b-kimiko', 'qwen3.8-27b-kiwen', 'qwen3.8-27b-novelist', 'qwen3.8-27b-obliterated', 'qwen3.8-27b-queen', 'qwen3.8-27b-synthia', 'qwen3.8-27b-uncensored', 'qwen3.8-max-uncensored', 'uplink-red-team-flash', 'uplink-red-team-pro', 'remm-slerp-l2-13b', 'rocinante-12b-v1.1', 'skyfall-36b-v2', 'starcannon-unleashed-12b', 'stheno-8b-v3.2', 'supergemma4-26b-uncensored', 'omega-directive-24b-v2', 'uncensored-ai-assistant', 'uncensored-ai-chat', 'uncensored-ai-novelist', 'uncensored-ai-roleplay', 'uncensored-chatbot', 'uncensored-code-assistant', 'uncensored-coding-agent', 'unfiltered-ai', 'unrestricted-ai', 'unslopnemo-12b-v4.1', 'veiled-calla-12b', 'wayfarer-large-70b'],
    free: 'paid', freeNote: 'No free plan: prepaid credit from $10 that never expires, or a monthly plan. GLM-5.3 Flash Uncensored is about $0.11 in / $0.37 out per million tokens.', priceUrl: 'https://uncensoredllm.ai/pricing' },
  venice: { name: 'Venice AI (private, uncensored)', baseUrl: 'https://api.venice.ai/api/v1', keyUrl: 'https://venice.ai/settings/api', best: 'venice-uncensored', bestWhy: 'Uncensored and private: Venice says it doesn\'t store your prompts.',
    free: 'some', freeNote: 'A limited free allowance; Venice Pro or credits for more.', priceUrl: 'https://docs.venice.ai/overview/pricing' },
  nebius: { name: 'Nebius AI Studio', baseUrl: 'https://api.studio.nebius.com/v1', keyUrl: 'https://studio.nebius.com/settings/api-keys', best: 'meta-llama/Llama-3.3-70B-Instruct', bestWhy: 'Low-cost open models hosted in Europe.',
    free: 'some', freeNote: 'Trial credit for new accounts, then pay as you go.', priceUrl: 'https://studio.nebius.com/' },
  novita: { name: 'Novita AI', baseUrl: 'https://api.novita.ai/v3/openai', keyUrl: 'https://novita.ai/settings/key-management', best: 'meta-llama/llama-3.3-70b-instruct', bestWhy: 'Low-cost open models, including uncensored ones.',
    free: 'some', freeNote: 'Trial credit for new accounts, then pay as you go.', priceUrl: 'https://novita.ai/pricing' },
  hyperbolic: { name: 'Hyperbolic', baseUrl: 'https://api.hyperbolic.xyz/v1', keyUrl: 'https://app.hyperbolic.xyz/settings', best: 'meta-llama/Llama-3.3-70B-Instruct', bestWhy: 'Low-cost open models, including base models.',
    free: 'some', freeNote: 'Trial credit for new accounts, then pay as you go.', priceUrl: 'https://hyperbolic.xyz/pricing' },
  featherless: { name: 'Featherless (thousands of open models)', baseUrl: 'https://api.featherless.ai/v1', keyUrl: 'https://featherless.ai/account/api-keys', best: 'meta-llama/Llama-3.3-70B-Instruct', bestWhy: 'A flat monthly price for thousands of open and uncensored fine-tunes.',
    free: 'paid', freeNote: 'Monthly subscription, unlimited use of its models.', priceUrl: 'https://featherless.ai/#pricing' },
  chutes: { name: 'Chutes', baseUrl: 'https://llm.chutes.ai/v1', keyUrl: 'https://chutes.ai/app/api', best: 'deepseek-ai/DeepSeek-V3-0324', bestWhy: 'Big open models on a decentralized network.',
    free: 'some', freeNote: 'Some free models with daily limits; others are paid.', priceUrl: 'https://chutes.ai/' },
  inception: { name: 'Inception (Mercury, very fast)', baseUrl: 'https://api.inceptionlabs.ai/v1', keyUrl: 'https://platform.inceptionlabs.ai/', best: 'mercury', bestWhy: 'A diffusion model that writes extremely fast.',
    free: 'some', freeNote: 'Free credit for new accounts, then pay as you go.', priceUrl: 'https://platform.inceptionlabs.ai/' },
  upstage: { name: 'Upstage (Solar)', baseUrl: 'https://api.upstage.ai/v1', keyUrl: 'https://console.upstage.ai/api-keys', best: 'solar-pro2', bestWhy: 'Compact and good at documents.',
    free: 'some', freeNote: 'Free credit for new accounts, then pay as you go.', priceUrl: 'https://www.upstage.ai/pricing' },
  poe: { name: 'Poe (many bots, one key)', baseUrl: 'https://api.poe.com/v1', keyUrl: 'https://poe.com/api_key', best: 'Claude-Sonnet-4', bestWhy: 'Use your Poe points with models from many companies.',
    free: 'some', freeNote: 'Uses your Poe points: free daily points, more with a subscription.', priceUrl: 'https://poe.com/api_key' },
  jan: { name: 'Jan (on this PC)', baseUrl: 'http://localhost:1337/v1', noKey: true, free: 'local', freeNote: 'Free: runs on this PC with no key. Start Jan\'s local API server first.' },
  llamacpp: { name: 'llama.cpp server (on this PC)', baseUrl: 'http://localhost:8080/v1', noKey: true, vision: true, free: 'local', freeNote: 'Free: a llama-server you run yourself.' },
  vllm: { name: 'vLLM / LocalAI / TGI (your server)', baseUrl: 'http://localhost:8000/v1', noKey: true, free: 'local', freeNote: 'Free: any OpenAI-compatible server on this PC or your network.' },
  koboldcpp: { name: 'KoboldCpp (on this PC)', baseUrl: 'http://localhost:5001/v1', noKey: true, free: 'local', freeNote: 'Free: runs on this PC with no key.' },
  gpt4all: { name: 'GPT4All (on this PC)', baseUrl: 'http://localhost:4891/v1', noKey: true, free: 'local', freeNote: 'Free: turn on GPT4All\'s local API server first.' },
  custom: { name: 'Custom OpenAI-compatible API', baseUrl: '', vision: true, freeNote: 'Depends on the service.' },
};

function all() { return store.config().providers || []; }
function get(id) { return all().find((p) => p.id === id); }
const keyName = (id) => `provider:${id}`;

function publicList() {
  return all().map((p) => ({ ...p, hasKey: store.hasSecret(keyName(p.id)), noKey: Boolean(PRESETS[p.preset]?.noKey) }));
}

function upsert(p, key) {
  const list = all();
  const id = p.id || `${p.preset}-${Date.now().toString(36)}`;
  const preset = PRESETS[p.preset] || PRESETS.custom;
  const entry = {
    id, preset: p.preset, name: p.name || preset.name,
    baseUrl: (p.baseUrl || preset.baseUrl).replace(/\/+$/, ''),
    models: p.models?.length ? p.models : preset.models || [],
    imageModels: p.imageModels?.length ? p.imageModels : preset.imageModels || [],
    vision: p.vision ?? Boolean(preset.vision),
  };
  const i = list.findIndex((x) => x.id === id);
  if (i >= 0) list[i] = { ...list[i], ...entry }; else list.push(entry);
  store.saveConfig({ providers: list });
  if (key !== undefined && key !== null && key !== '') store.setSecret(keyName(id), key.trim());
  return entry;
}

function remove(id) {
  store.saveConfig({ providers: all().filter((p) => p.id !== id) });
  store.setSecret(keyName(id), '');
}

function anthropicClient(p) {
  const Anthropic = require('@anthropic-ai/sdk').default;
  return { Anthropic, client: new Anthropic({ apiKey: store.getSecret(keyName(p.id)) }) };
}

async function refreshModels(id) {
  const p = get(id);
  if (!p) throw new Error('Unknown API.');
  if (PRESETS[p.preset]?.media) return p; // photo, video and music only: no chat models to list
  let models;
  if (p.preset === 'anthropic') {
    const { client } = anthropicClient(p);
    models = [];
    for await (const m of client.models.list()) models.push(m.id);
  } else if (p.preset === 'github') {
    // GitHub Models lists its catalog at a separate address.
    const res = await fetch('https://models.github.ai/catalog/models', { headers: { Authorization: `Bearer ${store.getSecret(keyName(p.id))}`, Accept: 'application/json' }, signal: AbortSignal.timeout(15000) });
    if (!res.ok) throw new Error(`GitHub Models returned HTTP ${res.status}`);
    models = (await res.json()).filter((m) => !m.supported_output_modalities || m.supported_output_modalities.includes('text')).map((m) => m.id);
  } else {
    models = await oai.listModels({ baseUrl: p.baseUrl, apiKey: store.getSecret(keyName(p.id)) });
  }
  if (p.preset === 'openai') models = models.filter((m) => /^(gpt|o\d|chatgpt)/.test(m) && !/(audio|realtime|transcribe|tts|embedding|search)/.test(m));
  const best = PRESETS[p.preset]?.best;
  if (best && models.includes(best)) models = [best, ...models.filter((x) => x !== best)];
  const imageModels = p.preset === 'openai' ? models.filter((m) => /image|dall-e/.test(m)) : p.imageModels;
  return upsert({ ...p, models: models.filter((m) => !/image|dall-e/.test(m)), imageModels });
}

// Claude's newest models take an effort level and a server-side fallback on refusal.
const CLAUDE_5 = /claude-(opus-5|sonnet-5-5|fable-5|haiku-5-5)/;

// Converts OpenAI-format messages (including tool calls and tool results) to Anthropic's format.
function toAnthropic(messages) {
  const text = (c) => (typeof c === 'string' ? c : (c || []).map((p) => p.text || '').join('\n'));
  const system = messages.filter((m) => m.role === 'system').map((m) => text(m.content)).join('\n\n');
  const out = [];
  for (const m of messages.filter((x) => x.role !== 'system')) {
    if (m.role === 'tool') {
      const block = { type: 'tool_result', tool_use_id: m.tool_call_id, content: text(m.content) };
      const last = out[out.length - 1];
      if (last?.role === 'user' && Array.isArray(last.content) && last.content.every((c) => c.type === 'tool_result')) last.content.push(block);
      else out.push({ role: 'user', content: [block] });
      continue;
    }
    let content;
    if (typeof m.content === 'string' || m.content == null) content = m.content ? [{ type: 'text', text: m.content }] : [];
    else content = m.content.map((p) => {
      if (p.type === 'text') return { type: 'text', text: p.text };
      const [, media, data] = p.image_url.url.match(/^data:([^;]+);base64,(.*)$/) || [];
      return { type: 'image', source: { type: 'base64', media_type: media, data } };
    });
    for (const tc of m.tool_calls || []) {
      let input = {};
      try { input = JSON.parse(tc.function.arguments || '{}'); } catch {}
      content.push({ type: 'tool_use', id: tc.id, name: tc.function.name, input });
    }
    if (!content.length) content = [{ type: 'text', text: '(empty)' }];
    out.push({ role: m.role, content });
  }
  return { system, messages: out };
}

const EFFORT = { quick: 'low', balanced: 'medium', thorough: 'high', max: 'max' };

async function* chat(providerId, model, { messages, temperature, maxTokens, signal, effort, level, tools }) {
  effort = EFFORT[level] || effort;
  const p = get(providerId);
  if (!p) throw new Error('That API connection was removed. Pick another model.');
  if (p.preset === 'anthropic') {
    const { Anthropic, client } = anthropicClient(p);
    const { system, messages: msgs } = toAnthropic(messages);
    const params = { model, max_tokens: maxTokens || 8192, system: system || undefined, messages: msgs, ...(tools?.length ? { tools: tools.map((t) => ({ name: t.function.name, description: t.function.description, input_schema: t.function.parameters })) } : {}) };
    let stream;
    if (CLAUDE_5.test(model)) {
      stream = client.beta.messages.stream({ ...params, output_config: { effort: effort || 'medium' }, betas: ['server-side-fallback-2026-07-01'], fallbacks: 'default' }, { signal });
    } else {
      stream = client.messages.stream({ ...params, temperature }, { signal });
    }
    const started = Date.now();
    try {
      for await (const ev of stream) {
        if (ev.type === 'content_block_delta' && ev.delta.type === 'text_delta') yield { type: 'text', text: ev.delta.text };
        if (ev.type === 'content_block_delta' && ev.delta.type === 'thinking_delta' && ev.delta.thinking) yield { type: 'reasoning', text: ev.delta.thinking };
      }
      const final = await stream.finalMessage();
      const uses = final.content.filter((c) => c.type === 'tool_use');
      if (uses.length) yield { type: 'tool_calls', calls: uses.map((u) => ({ id: u.id, name: u.name, arguments: JSON.stringify(u.input || {}) })) };
      if (final.stop_reason === 'refusal') throw new Error('Claude declined to answer this.');
      const secs = (Date.now() - started) / 1000;
      yield { type: 'stats', tps: secs ? final.usage.output_tokens / secs : 0, tokens: final.usage.output_tokens, finish: final.stop_reason };
    } catch (err) {
      if (err instanceof Anthropic.APIUserAbortError) return;
      if (err instanceof Anthropic.AuthenticationError) throw new Error('Your Anthropic key was not accepted. Check it under Models → Connect an API.');
      if (err instanceof Anthropic.RateLimitError) { const e = new Error('Anthropic is rate limiting this key. Wait a moment and try again.'); e.status = 429; throw e; }
      if (err instanceof Anthropic.APIConnectionError) throw new Error('Could not reach Anthropic. Check your internet connection.');
      throw err;
    }
    return;
  }
  const key = store.getSecret(keyName(p.id));
  const extra = p.preset === 'openrouter' ? { 'HTTP-Referer': 'https://quicksilver.app', 'X-Title': 'Quicksilver' } : {};
  const usesMaxCompletion = p.preset === 'openai' && /^(o\d|gpt-5)/.test(model);
  const body = { model, messages, ...(tools?.length ? { tools } : {}), ...(usesMaxCompletion ? { max_completion_tokens: maxTokens, reasoning_effort: effort === 'max' ? 'high' : effort || 'medium' } : { max_tokens: maxTokens, temperature }) };
  try {
    yield* oai.streamChat({ baseUrl: p.baseUrl, apiKey: key, body, signal, headers: extra });
  } catch (err) {
    if (signal?.aborted) return;
    if (/fetch failed|ECONNREFUSED/i.test(String(err.message))) throw new Error(`Could not reach ${p.name}. ${PRESETS[p.preset]?.noKey ? 'Is it running?' : 'Check your internet connection.'}`);
    const e2 = new Error(`${p.name}: ${err.message}`); e2.status = err.status; throw e2;
  }
}

// Image generation or editing through an API (OpenAI-compatible /images endpoints).
async function image(providerId, model, { prompt, size = '1024x1024', image: input, mask }) {
  const p = get(providerId);
  if (!p) throw new Error('That API connection was removed.');
  const key = store.getSecret(keyName(p.id));
  const headers = { ...(key ? { Authorization: `Bearer ${key}` } : {}) };
  let res;
  if (input) {
    const form = new FormData();
    form.append('model', model);
    form.append('prompt', prompt);
    form.append('size', size);
    const toBlob = (dataUrl) => { const [, mime, b64] = dataUrl.match(/^data:([^;]+);base64,(.*)$/); return new Blob([Buffer.from(b64, 'base64')], { type: mime }); };
    form.append('image', toBlob(input), 'image.png');
    if (mask) form.append('mask', toBlob(mask), 'mask.png');
    res = await fetch(`${p.baseUrl}/images/edits`, { method: 'POST', headers, body: form });
  } else {
    const body = { model, prompt, size, n: 1 };
    if (!/gpt-image/.test(model)) body.response_format = 'b64_json';
    res = await fetch(`${p.baseUrl}/images/generations`, { method: 'POST', headers: { ...headers, 'Content-Type': 'application/json' }, body: JSON.stringify(body) });
  }
  if (!res.ok) throw new Error(`${p.name}: ${await oai.errorText(res)}`);
  const j = await res.json();
  const d = j.data?.[0];
  if (d?.b64_json) return Buffer.from(d.b64_json, 'base64');
  if (d?.url) return Buffer.from(await (await fetch(d.url)).arrayBuffer());
  throw new Error('The API returned no image.');
}

const secretOf = (id) => store.getSecret(keyName(id));
module.exports = { PRESETS, publicList, get, upsert, remove, refreshModels, chat, image, secretOf };
