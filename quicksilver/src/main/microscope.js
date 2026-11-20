// Microscope: look inside a local model's generation. Runs a prompt greedily (temperature 0) and
// returns every token it produced with the probability it gave that token and its top alternatives,
// read from llama.cpp's logprobs. Two of these, on the same prompt, show exactly where two models
// (for example two quantizations of the same model) first diverge, token by token.
'use strict';
const llama = require('./llama');
const models = require('./models');

async function tokens(modelId, prompt, { maxTokens = 48, onStatus } = {}) {
  const m = models.get(modelId);
  if (!m || !m.files?.model) throw new Error('That model is not installed on this PC.');
  const spec = { id: m.id, name: m.name, file: m.files.model, mmproj: m.files.mmproj };
  await llama.ensure(spec, { onStatus });
  const s = llama.status().find((x) => x.file === m.files.model && !x.exited);
  if (!s) throw new Error('Could not start the model.');
  const r = await fetch(`http://127.0.0.1:${s.port}/v1/chat/completions`, {
    method: 'POST', headers: { 'Content-Type': 'application/json' },
    body: JSON.stringify({ messages: [{ role: 'user', content: String(prompt || '') }], max_tokens: Math.min(256, Math.max(1, Number(maxTokens) || 48)), temperature: 0, top_k: 1, logprobs: true, top_logprobs: 5, cache_prompt: true }),
    signal: AbortSignal.timeout(180000),
  });
  if (!r.ok) throw new Error(`The model returned HTTP ${r.status}.`);
  const j = await r.json();
  const content = j.choices?.[0]?.logprobs?.content;
  if (Array.isArray(content) && content.length) {
    return { model: m.name, tokens: content.map((c) => ({ token: c.token ?? '', p: Number.isFinite(c.logprob) ? Math.exp(c.logprob) : null, top: (c.top_logprobs || []).slice(0, 5).map((t) => ({ token: t.token ?? '', p: Number.isFinite(t.logprob) ? Math.exp(t.logprob) : null })) })) };
  }
  // No logprobs from this engine build: still return the tokens (split on runs) so divergence works.
  const text = j.choices?.[0]?.message?.content || '';
  return { model: m.name, tokens: text.split(/(\s+)/).filter((x) => x !== '').map((token) => ({ token, p: null, top: [] })), noProbs: true };
}

module.exports = { tokens };
