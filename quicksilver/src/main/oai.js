// A small client for OpenAI-style chat APIs. llama-server, OpenAI, Google Gemini, OpenRouter,
// Groq, Mistral, DeepSeek, xAI, Together, Ollama and LM Studio all speak this format.

const netlog = require('./netlog');

async function* sse(res) {
  const decoder = new TextDecoder();
  let buf = '';
  for await (const chunk of res.body) {
    buf += decoder.decode(chunk, { stream: true });
    let i;
    while ((i = buf.indexOf('\n')) >= 0) {
      const line = buf.slice(0, i).trim();
      buf = buf.slice(i + 1);
      if (!line.startsWith('data:')) continue;
      const data = line.slice(5).trim();
      if (data === '[DONE]') return;
      try { yield JSON.parse(data); } catch { /* keep-alive or partial line */ }
    }
  }
}

async function errorText(res) {
  const t = await res.text().catch(() => '');
  try {
    const j = JSON.parse(t);
    return j.error?.message || j.message || j.detail || t;
  } catch { return t || res.statusText; }
}

// Splits "<think>…</think>" reasoning out of plain text, for models that write it inline.
function thinkSplitter() {
  let inThink = false;
  let pending = '';
  return (text) => {
    const out = [];
    pending += text;
    while (pending) {
      const tag = inThink ? '</think>' : '<think>';
      const i = pending.indexOf(tag);
      if (i >= 0) {
        if (i) out.push({ type: inThink ? 'reasoning' : 'text', text: pending.slice(0, i) });
        pending = pending.slice(i + tag.length);
        inThink = !inThink;
        continue;
      }
      // Hold back a possible partial tag at the end.
      let keep = 0;
      for (let k = Math.min(tag.length - 1, pending.length); k > 0; k--) if (tag.startsWith(pending.slice(-k))) { keep = k; break; }
      const emit = pending.slice(0, pending.length - keep);
      if (emit) out.push({ type: inThink ? 'reasoning' : 'text', text: emit });
      pending = pending.slice(pending.length - keep);
      break;
    }
    return out;
  };
}

// A request to an engine on this PC (llama-server, or Ollama / LM Studio on localhost). Node's
// fetch gives up after five minutes without a byte, and a big model on the processor can take
// longer than that to read a long prompt before its first word: the answer was cut off with
// "fetch failed" (and the wait was taken for a graphics-card fault). The plain http client has
// no such limit. Stop still ends it at once.
const isLocal = (url) => /^http:\/\/(127\.0\.0\.1|localhost|\[::1\])(:\d+)?(\/|$)/i.test(url);
function localFetch(url, { method = 'GET', headers = {}, body, signal } = {}) {
  return new Promise((resolve, reject) => {
    const stopped = () => { const e = new Error('This operation was aborted'); e.name = 'AbortError'; return e; };
    if (signal?.aborted) { reject(stopped()); return; }
    const req = require('node:http').request(url, { method, headers: { ...headers, ...(body != null ? { 'Content-Length': Buffer.byteLength(body) } : {}) } }, (res) => {
      const text = async () => { const parts = []; for await (const c of res) parts.push(c); return Buffer.concat(parts).toString('utf8'); };
      resolve({ ok: res.statusCode >= 200 && res.statusCode < 300, status: res.statusCode, statusText: res.statusMessage || '', body: res, text });
    });
    const onAbort = () => req.destroy(stopped());
    signal?.addEventListener('abort', onAbort, { once: true });
    req.on('close', () => signal?.removeEventListener('abort', onAbort));
    req.on('error', reject);
    req.setTimeout(0); // however long the model needs
    if (body != null) req.write(body);
    req.end();
  });
}

// Streams a chat. Yields {type:'text'|'reasoning', text} and finally {type:'stats', ...}.
async function* streamChat({ baseUrl, apiKey, body, signal, headers = {}, meta = {} }) {
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const t0 = Date.now();
  const res = await (isLocal(url) ? localFetch : fetch)(url, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}), ...headers },
    body: JSON.stringify({ ...body, stream: true }),
  });
  const sent = Object.fromEntries(Object.entries(body).filter(([k]) => !['messages', 'tools'].includes(k)));
  if (!res.ok) {
    const e = new Error(await errorText(res)); e.status = res.status;
    netlog.log({ provider: meta.provider || url, model: body.model, key: meta.key, url, sent, status: res.status, warning: e.message.slice(0, 300) });
    throw e;
  }
  const split = thinkSplitter();
  const started = Date.now();
  let ttfb = null;
  let tokens = 0;
  let stats = null;
  let finish = null;
  const calls = []; // tool calls arrive in pieces: { index, id, function: { name, arguments } }
  let minDigitP = null; // the model's lowest confidence in any digit it wrote (local engines)
  let timings = null;
  for await (const ev of sse(res)) {
    if (ttfb == null) ttfb = Date.now() - t0;
    const choice = ev.choices?.[0];
    const d = choice?.delta || {};
    const reasoning = d.reasoning_content ?? d.reasoning;
    if (reasoning) { tokens++; yield { type: 'reasoning', text: reasoning }; }
    if (d.content) { tokens++; for (const part of split(d.content)) yield part; }
    for (const lp of choice?.logprobs?.content || []) if (/\d/.test(lp.token || '') && Number.isFinite(lp.logprob)) minDigitP = Math.min(minDigitP ?? 1, Math.exp(lp.logprob));
    for (const tc of d.tool_calls || []) {
      const i = tc.index ?? calls.length;
      calls[i] ||= { id: '', name: '', arguments: '' };
      if (tc.id) calls[i].id = tc.id;
      if (tc.function?.name) calls[i].name += tc.function.name;
      if (tc.function?.arguments) calls[i].arguments += tc.function.arguments;
    }
    if (choice?.finish_reason) finish = choice.finish_reason;
    if (ev.timings) timings = ev.timings;
    if (ev.timings) stats = { tps: ev.timings.predicted_per_second, promptTps: ev.timings.prompt_per_second, tokens: ev.timings.predicted_n };
    if (ev.usage && !stats) stats = { tokens: ev.usage.completion_tokens };
  }
  const toolCalls = calls.filter((c) => c && c.name).map((c, i) => ({ id: c.id || `call_${Date.now().toString(36)}_${i}`, name: c.name, arguments: c.arguments || '{}' }));
  if (toolCalls.length) yield { type: 'tool_calls', calls: toolCalls };
  const secs = (Date.now() - started) / 1000;
  netlog.log({ provider: meta.provider || url, model: body.model, key: meta.key, url, sent, status: res.status,
    timing: { ttfbMs: ttfb, totalMs: Date.now() - t0, ...(timings ? { promptMs: Math.round(timings.prompt_ms ?? 0), evalMs: Math.round(timings.predicted_ms ?? 0), cachedTokens: timings.cache_n } : {}) } });
  yield { type: 'stats', tps: stats?.tps || (secs ? tokens / secs : 0), tokens: stats?.tokens || tokens, finish, ...(minDigitP != null ? { minDigitP } : {}) };
}

async function listModels({ baseUrl, apiKey, headers = {} }) {
  const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/models`, {
    headers: { ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}), ...headers },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) { const e = new Error(await errorText(res)); e.status = res.status; throw e; }
  const j = await res.json();
  return (j.data || j.models || []).map((m) => m.id || m.name).filter(Boolean).sort();
}

module.exports = { streamChat, listModels, sse, errorText, thinkSplitter, localFetch, isLocal };
