// Provider settings in the actual request: Venice's switches, Gemini's thinking and safety
// settings, the sampling defaults, a service that rejects an optional setting (sent again without
// it, and said so), keys cleaned and fingerprinted (never logged whole), and Claude's thinking and
// temperature rules per model. Prints each request body.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const os = require('node:os');
const assert = require('node:assert/strict');
process.env.QUICKSILVER_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-prov-'));
const store = require('../src/main/store');
const providers = require('../src/main/providers');
const netlog = require('../src/main/netlog');

const sse = (text) => new Response(`data: ${JSON.stringify({ choices: [{ delta: { content: text } }] })}\n\ndata: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }] })}\n\ndata: [DONE]\n\n`, { status: 200, headers: { 'content-type': 'text/event-stream' } });
(async () => {
  const sent = [];
  let reject = null;
  global.fetch = async (url, o = {}) => {
    const body = JSON.parse(o.body || '{}');
    sent.push({ url: String(url), body, auth: o.headers?.Authorization });
    if (reject && reject(body)) return new Response('{"error":{"message":"Unknown field: presence_penalty"}}', { status: 400 });
    return sse('Paris.');
  };
  const run = async (preset, model, req = {}) => {
    const e = providers.upsert({ preset, models: [model] }, '  "KEY-' + preset + '-0123456789"\n');
    sent.length = 0; let text = ''; const statuses = [];
    for await (const ev of providers.chat(e.id, model, { messages: [{ role: 'user', content: 'Capital of France?' }], maxTokens: 400, ...req })) { if (ev.type === 'text') text += ev.text; if (ev.type === 'status') statuses.push(ev.text); }
    return { text, statuses, sent: sent.slice() };
  };
  const show = (name, r) => console.log(`  ${name}: POST ${r.sent[0].url} ${JSON.stringify({ ...r.sent[0].body, messages: '…' })}`);

  // Venice
  const v = await run('venice', 'venice-uncensored');
  assert.deepEqual(v.sent[0].body.venice_parameters, { include_venice_system_prompt: false, disable_thinking: true, strip_thinking_response: true });
  assert.equal(v.sent[0].auth, 'Bearer KEY-venice-0123456789', 'the key is trimmed and unquoted');
  show('Venice', v);
  // Gemini: thinking off on Flash, safety settings on every category; Pro keeps thinking.
  const g = await run('google', 'gemini-2.5-flash');
  assert.deepEqual(g.sent[0].body.extra_body.google.thinking_config, { thinking_budget: 0 });
  assert.equal(g.sent[0].body.extra_body.google.safety_settings.length, 5);
  assert.ok(g.sent[0].body.extra_body.google.safety_settings.every((x) => x.threshold === 'BLOCK_NONE'));
  show('Gemini', g);
  const gp = await run('google', 'gemini-2.5-pro');
  assert.equal(gp.sent[0].body.extra_body.google.thinking_config, undefined, 'Gemini Pro can\'t turn thinking off');
  // Sampling defaults, and a caller's own temperature is kept (with no penalties when low).
  const d = await run('groq', 'openai/gpt-oss-120b');
  assert.deepEqual([d.sent[0].body.temperature, d.sent[0].body.top_p, d.sent[0].body.presence_penalty, d.sent[0].body.frequency_penalty, d.sent[0].body.stop], [0.9, 0.95, 0.6, 0.3, undefined]);
  show('Groq (defaults)', d);
  const low = await run('groq', 'openai/gpt-oss-120b', { temperature: 0.2 });
  assert.deepEqual([low.sent[0].body.temperature, low.sent[0].body.presence_penalty], [0.2, undefined]);
  console.log('✓ provider settings: Venice switches, Gemini thinking and safety settings, sampling defaults in the request body');

  // A service that rejects an optional setting: sent again without it, said so, never silent.
  reject = (b) => 'presence_penalty' in b;
  const warned = [];
  const realWarn = console.warn; console.warn = (m) => { warned.push(m); };
  const r = await run('groq', 'openai/gpt-oss-120b');
  console.warn = realWarn; reject = null;
  assert.equal(r.text, 'Paris.');
  assert.equal(r.sent.length, 2); assert.ok(!('presence_penalty' in r.sent[1].body));
  assert.match(r.statuses.join(' '), /didn't accept top_p, presence_penalty, frequency_penalty/);
  assert.match(warned.join('\n'), /Groq \(very fast\) rejected the request with top_p, presence_penalty, frequency_penalty \(HTTP 400[\s\S]*is the blocker/);
  console.log('✓ provider settings: a rejected setting is dropped on the second try, named in the chat and the log');

  // Keys: fingerprint only, and a missing key is said out loud.
  const fp = netlog.fingerprint('sk-abcdef1234567890wxyz');
  assert.match(fp, /^sk-abc…wxyz len=23 sha=[0-9a-f]{8}$/);
  assert.ok(netlog.recent.every((e) => !/KEY-\w+-0123456789/.test(JSON.stringify(e))), 'no whole key in the log');
  const e = providers.upsert({ preset: 'groq', models: ['m'] }); store.setSecret(`provider:${e.id}`, '');
  const loud = []; console.warn = (m) => loud.push(m);
  for await (const _ of providers.chat(e.id, 'm', { messages: [{ role: 'user', content: 'x' }] })) {} // eslint-disable-line no-unused-vars
  console.warn = realWarn;
  assert.match(loud.join('\n'), /has no key saved/);
  console.log(`✓ keys: trimmed, logged as a fingerprint only (${fp}), and a missing key is logged loudly`);

  // Claude: thinking off where the model allows it; temperature only where it's accepted.
  assert.deepEqual(providers.claudeThinkingOff('claude-sonnet-5-5', 'medium'), { type: 'between_tools' });
  assert.equal(providers.claudeThinkingOff('claude-sonnet-5-5', 'max'), null);
  assert.deepEqual(providers.claudeThinkingOff('claude-haiku-5-5', 'low'), { type: 'disabled' });
  assert.equal(providers.claudeThinkingOff('claude-opus-5-5', 'low'), null, 'Opus 5.5 rejects disabled at every effort');
  for (const m of ['claude-opus-5-5', 'claude-sonnet-5', 'claude-opus-4-8', 'claude-opus-4-7', 'claude-haiku-5-5']) assert.equal(providers.CLAUDE_TAKES_TEMPERATURE(m), false, m);
  assert.equal(providers.CLAUDE_TAKES_TEMPERATURE('claude-sonnet-4-6'), true);
  console.log('✓ Claude: thinking off on Sonnet 5.5 (between_tools) and Haiku 5.5; Opus 5.5 can\'t; no temperature to models that reject it');

  // Connection check: a 1-token request to each connected cloud AI; a bad key fails with its status.
  store.saveConfig({ providers: [] });
  const good = providers.upsert({ preset: 'groq', name: 'Good', models: ['m1'] }, 'GOOD-KEY-123456');
  const bad = providers.upsert({ preset: 'cerebras', name: 'Bad', models: ['m2'] }, 'BAD-KEY-654321');
  global.fetch = async (url, o = {}) => { sent.push({ url: String(url), body: JSON.parse(o.body || '{}') }); return /BAD-KEY/.test(o.headers?.Authorization) ? new Response('{"error":{"message":"Invalid API key"}}', { status: 401 }) : new Response('{"choices":[{"message":{"content":"h"}}]}', { status: 200 }); };
  sent.length = 0;
  console.warn = () => {};
  const h = await providers.health();
  console.warn = realWarn;
  assert.deepEqual(h.map((x) => [x.provider, x.ok, x.status]), [['Good', true, 200], ['Bad', false, 401]]);
  assert.match(h[1].error, /Invalid API key/); assert.match(h[0].key, /^GOOD-K…3456 len=15 sha=/);
  assert.ok(sent.every((x) => x.body.max_tokens === 1), 'one token each');
  console.log(`✓ connection check: ${h.map((x) => `${x.provider} ${x.ok ? 'pass' : `fail (HTTP ${x.status}: ${x.error})`} ${x.ms}ms`).join(' · ')}`);
  // Warm-up: one 1-token request per service, not again within ten minutes.
  sent.length = 0;
  await providers.warm(good.id, 'm1'); await providers.warm(good.id, 'm1');
  assert.equal(sent.length, 1);
  console.log('✓ warm-up: a 1-token request opens the connection once, not on every call');
  process.exit(0);
})().catch((e) => { console.error('FAIL', e); process.exit(1); });
