// Cloud and network AI services ("APIs"). Optional: everything works without them.
// Anthropic (Claude) uses its own SDK; everything else speaks the OpenAI format.
const store = require('./store');
const oai = require('./oai');

const PRESETS = {
  anthropic: { name: 'Anthropic (Claude)', baseUrl: 'https://api.anthropic.com', keyUrl: 'https://console.anthropic.com/settings/keys', models: ['claude-opus-5-5', 'claude-sonnet-5-5', 'claude-haiku-5-5', 'claude-fable-5-1'], vision: true },
  openai: { name: 'OpenAI', baseUrl: 'https://api.openai.com/v1', keyUrl: 'https://platform.openai.com/api-keys', imageModels: ['gpt-image-1'], vision: true },
  google: { name: 'Google Gemini', baseUrl: 'https://generativelanguage.googleapis.com/v1beta/openai', keyUrl: 'https://aistudio.google.com/apikey', vision: true },
  openrouter: { name: 'OpenRouter (hundreds of models)', baseUrl: 'https://openrouter.ai/api/v1', keyUrl: 'https://openrouter.ai/keys', vision: true },
  groq: { name: 'Groq (very fast)', baseUrl: 'https://api.groq.com/openai/v1', keyUrl: 'https://console.groq.com/keys' },
  mistral: { name: 'Mistral AI', baseUrl: 'https://api.mistral.ai/v1', keyUrl: 'https://console.mistral.ai/api-keys' },
  deepseek: { name: 'DeepSeek', baseUrl: 'https://api.deepseek.com/v1', keyUrl: 'https://platform.deepseek.com/api_keys' },
  xai: { name: 'xAI (Grok)', baseUrl: 'https://api.x.ai/v1', keyUrl: 'https://console.x.ai', vision: true },
  together: { name: 'Together AI', baseUrl: 'https://api.together.xyz/v1', keyUrl: 'https://api.together.ai/settings/api-keys', imageModels: ['black-forest-labs/FLUX.1-schnell-Free'] },
  ollama: { name: 'Ollama (on this PC)', baseUrl: 'http://localhost:11434/v1', noKey: true, vision: true },
  lmstudio: { name: 'LM Studio (on this PC)', baseUrl: 'http://localhost:1234/v1', noKey: true, vision: true },
  custom: { name: 'Custom OpenAI-compatible API', baseUrl: '', vision: true },
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
  let models;
  if (p.preset === 'anthropic') {
    const { client } = anthropicClient(p);
    models = [];
    for await (const m of client.models.list()) models.push(m.id);
  } else {
    models = await oai.listModels({ baseUrl: p.baseUrl, apiKey: store.getSecret(keyName(p.id)) });
  }
  if (p.preset === 'openai') models = models.filter((m) => /^(gpt|o\d|chatgpt)/.test(m) && !/(audio|realtime|transcribe|tts|embedding|search)/.test(m));
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
      if (err instanceof Anthropic.RateLimitError) throw new Error('Anthropic is rate limiting this key. Wait a moment and try again.');
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
    throw new Error(`${p.name}: ${err.message}`);
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

module.exports = { PRESETS, publicList, get, upsert, remove, refreshModels, chat, image };
