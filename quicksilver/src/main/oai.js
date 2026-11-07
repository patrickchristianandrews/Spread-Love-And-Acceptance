// A small client for OpenAI-style chat APIs. llama-server, OpenAI, Google Gemini, OpenRouter,
// Groq, Mistral, DeepSeek, xAI, Together, Ollama and LM Studio all speak this format.

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

// Streams a chat. Yields {type:'text'|'reasoning', text} and finally {type:'stats', ...}.
async function* streamChat({ baseUrl, apiKey, body, signal, headers = {} }) {
  const url = `${baseUrl.replace(/\/+$/, '')}/chat/completions`;
  const res = await fetch(url, {
    method: 'POST',
    signal,
    headers: { 'Content-Type': 'application/json', ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}), ...headers },
    body: JSON.stringify({ ...body, stream: true }),
  });
  if (!res.ok) throw new Error(await errorText(res));
  const split = thinkSplitter();
  const started = Date.now();
  let tokens = 0;
  let stats = null;
  let finish = null;
  const calls = []; // tool calls arrive in pieces: { index, id, function: { name, arguments } }
  let minDigitP = null; // the model's lowest confidence in any digit it wrote (local engines)
  for await (const ev of sse(res)) {
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
    if (ev.timings) stats = { tps: ev.timings.predicted_per_second, promptTps: ev.timings.prompt_per_second, tokens: ev.timings.predicted_n };
    if (ev.usage && !stats) stats = { tokens: ev.usage.completion_tokens };
  }
  const toolCalls = calls.filter((c) => c && c.name).map((c, i) => ({ id: c.id || `call_${Date.now().toString(36)}_${i}`, name: c.name, arguments: c.arguments || '{}' }));
  if (toolCalls.length) yield { type: 'tool_calls', calls: toolCalls };
  const secs = (Date.now() - started) / 1000;
  yield { type: 'stats', tps: stats?.tps || (secs ? tokens / secs : 0), tokens: stats?.tokens || tokens, finish, ...(minDigitP != null ? { minDigitP } : {}) };
}

async function listModels({ baseUrl, apiKey, headers = {} }) {
  const res = await fetch(`${baseUrl.replace(/\/+$/, '')}/models`, {
    headers: { ...(apiKey ? { Authorization: `Bearer ${apiKey}` } : {}), ...headers },
    signal: AbortSignal.timeout(15000),
  });
  if (!res.ok) throw new Error(await errorText(res));
  const j = await res.json();
  return (j.data || j.models || []).map((m) => m.id || m.name).filter(Boolean).sort();
}

module.exports = { streamChat, listModels, sse, errorText, thinkSplitter };
