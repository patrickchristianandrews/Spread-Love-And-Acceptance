// AI Horde: the free, crowdsourced provider with its own async API (submit a job, poll until a
// volunteer finishes it). No network here — fetch is stubbed to replay a submit → queued → done run.
'use strict';
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const assert = require('node:assert/strict');
process.env.QUICKSILVER_HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-horde-'));
const providers = require('../src/main/providers');

// AI Horde is a built-in preset: free, no key, its own async API.
const preset = providers.PRESETS.aihorde;
assert.ok(preset && preset.noKey && preset.free === 'free' && preset.horde, 'AI Horde is a free, no-key preset');
assert.equal(preset.baseUrl, 'https://aihorde.net/api/v2');

providers.upsert({ id: 'h1', preset: 'aihorde', name: 'AI Horde (free, crowdsourced)', baseUrl: 'https://aihorde.net/api/v2', models: ['any'] });

const realFetch = global.fetch;
const calls = [];
let polls = 0;
global.fetch = async (url, opts = {}) => {
  calls.push({ url: String(url), method: opts.method || 'GET', body: opts.body });
  const u = String(url);
  if (u.endsWith('/generate/text/async')) return { ok: true, status: 202, json: async () => ({ id: 'job-1' }) };
  if (u.includes('/generate/text/status/')) {
    polls += 1;
    if (polls < 2) return { ok: true, status: 200, json: async () => ({ done: false, queue_position: 3, wait_time: 20 }) };
    return { ok: true, status: 200, json: async () => ({ done: true, generations: [{ text: '### Response:\nParis is the capital of France.' }] }) };
  }
  if (u.includes('/status/heartbeat')) return { ok: true, status: 200, json: async () => ({ message: 'OK' }) };
  if (u.includes('/status/models')) return { ok: true, status: 200, json: async () => ([{ name: 'koboldcpp/model-a', count: 5 }, { name: 'aphrodite/model-b', count: 2 }, { name: 'offline/model-c', count: 0 }]) };
  throw new Error(`unexpected fetch: ${u}`);
};

(async () => {
  // A chat: submit → one "queued" poll (status shown) → done, with the answer text returned.
  const events = [];
  for await (const ev of providers.chat('h1', 'any', { messages: [{ role: 'user', content: 'Capital of France?' }], maxTokens: 50 })) events.push(ev);
  const text = events.filter((e) => e.type === 'text').map((e) => e.text).join('');
  assert.equal(text, 'Paris is the capital of France.', `the answer comes back with the "### Response:" scaffold stripped (got: ${JSON.stringify(text)})`);
  assert.ok(events.some((e) => e.type === 'status' && /queue/i.test(e.text)), 'while it waits, the free-queue position is shown');
  assert.ok(events.some((e) => e.type === 'stats'), 'a stats event closes the turn');
  // The job was submitted once, then polled (no key configured → the anonymous key is used).
  const submit = calls.find((c) => c.url.endsWith('/generate/text/async'));
  assert.ok(submit && submit.method === 'POST', 'the job is submitted with POST');
  const body = JSON.parse(submit.body);
  assert.match(body.prompt, /### Instruction:[\s\S]*Capital of France\?/, 'the chat is flattened into an instruct prompt');
  assert.equal(body.models, undefined, '"any" lets the Horde pick the quickest worker (no models filter)');
  assert.ok(body.nsfw === true, 'uncensored: nsfw workers are allowed');

  // Picking a specific model pins it; the models list loads the volunteers online now ("any" first).
  providers.upsert({ id: 'h1', preset: 'aihorde', name: 'AI Horde (free, crowdsourced)', baseUrl: 'https://aihorde.net/api/v2', models: ['any'] });
  const refreshed = await providers.refreshModels('h1');
  assert.deepEqual(refreshed.models, ['any', 'koboldcpp/model-a', 'aphrodite/model-b'], 'offline workers (count 0) are left out, busiest first, "any" first');

  calls.length = 0;
  const ev2 = [];
  for await (const e of providers.chat('h1', 'koboldcpp/model-a', { messages: [{ role: 'user', content: 'Hi' }], maxTokens: 20 })) ev2.push(e);
  const body2 = JSON.parse(calls.find((c) => c.url.endsWith('/generate/text/async')).body);
  assert.deepEqual(body2.models, ['koboldcpp/model-a'], 'a chosen model is sent as the models filter');

  // The connection check uses the heartbeat (not a real job), so it is instant and needs no key.
  const pong = await providers.ping('h1');
  assert.ok(pong.ok, 'the heartbeat ping passes with no key');
  assert.ok(calls.some((c) => c.url.includes('/status/heartbeat')), 'ping hits the heartbeat, not a generation');

  global.fetch = realFetch;
  fs.rmSync(process.env.QUICKSILVER_HOME, { recursive: true, force: true });
  console.log('✓ AI Horde: free crowdsourced text via its async API — submit, show the queue, return the answer; models list and heartbeat ping; no key needed');
})().catch((e) => { global.fetch = realFetch; console.error('FAIL', e); process.exit(1); });
