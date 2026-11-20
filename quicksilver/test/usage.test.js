// Usage statistics (Settings → Usage): what is counted, what is never kept, and the sums the
// page shows. Runs the real main-process modules against the stand-in engine (test/fakes).
// Run: node test/usage.test.js
const path = require('node:path');
const fs = require('node:fs');
const os = require('node:os');
const http = require('node:http');
const assert = require('node:assert');

const HOME = fs.mkdtempSync(path.join(os.tmpdir(), 'qs-usage-'));
process.env.QUICKSILVER_HOME = HOME;
process.env.QS_LLAMA_SERVER = path.join(__dirname, 'fakes', 'llama-server');
const TINY = path.join(__dirname, 'fixtures', 'tiny.gguf');

const store = require('../src/main/store');
const usage = require('../src/main/usage');
const models = require('../src/main/models');
const llama = require('../src/main/llama');
const complete = require('../src/main/complete');
const providers = require('../src/main/providers');

const drain = async (gen) => { let text = ''; for await (const ev of gen) if (ev.type === 'text') text += ev.text; return text; };
const near = (a, b, msg) => assert.ok(Math.abs(a - b) < Math.max(1e-6, Math.abs(b) * 1e-6), `${msg}: ${a} vs ${b}`);

(async () => {
  // Nothing yet: an empty summary, not an error.
  let u = usage.summary(30);
  assert.equal(u.ms, 0); assert.equal(u.questions, 0); assert.equal(u.models.length, 0); assert.equal(u.expected, null); assert.equal(u.swap, null);
  assert.equal(u.daily.length, 30, 'every day of the range is there, used or not');
  console.log('✓ empty: nothing counted, 30 empty days');

  // The sums: shares by time, words and requests; speed; time taken against time expected.
  const now = Date.now();
  usage.record({ source: 'local', key: 'local:a', name: 'Model A', ms: 5000, tokens: 200, tps: 50, waitMs: 800, expTps: 40 }, now);
  usage.record({ source: 'cloud', key: 'api:x:big', name: 'big (Some Cloud)', ms: 3000, tokens: 300, tps: 150, waitMs: 400 }, now);
  usage.record({ source: 'web', kind: 'search', key: 'web:free', name: 'Web search (free)', ms: 2000 }, now);
  const threeDaysAgo = new Date(now); threeDaysAgo.setDate(threeDaysAgo.getDate() - 3);
  usage.record({ source: 'local', kind: 'image', key: 'media:sd', name: 'Picture model', ms: 10000 }, threeDaysAgo.getTime());
  usage.recordChat(9000, now);
  u = usage.summary(7, now);
  assert.equal(u.ms, 20000); assert.equal(u.questions, 1); assert.equal(u.avgQuestionMs, 9000); assert.equal(u.runs, 2); assert.equal(u.searches, 1); assert.equal(u.made.image, 1);
  assert.deepEqual(u.words, { local: 150, cloud: 225 });
  near(u.share.time.local, 75, 'share of time on this PC'); near(u.share.time.cloud, 15, 'share of time in the cloud'); near(u.share.time.web, 10, 'share of time on the web');
  near(u.share.words.local, 40, 'share of words on this PC'); near(u.share.requests.web, 25, 'share of requests on the web');
  near(u.speed.local, 37.5, 'words a second on this PC'); near(u.speed.cloud, 112.5, 'words a second in the cloud');
  // 200 tokens at 50 a second took 4 s; the estimate (40 a second) said 5 s: 20% less than expected.
  near(u.expected.actualMs, 4000, 'time it took'); near(u.expected.expectedMs, 5000, 'time it should take'); near(u.expected.ratio, 0.8, 'ratio');
  near(u.swap.localAtCloudSpeedMs, (150 / 112.5) * 1000, 'this PC\'s words at cloud speed'); near(u.swap.cloudAtLocalSpeedMs, (225 / 37.5) * 1000, 'the cloud\'s words at this PC\'s speed');
  near(u.wait.local, 800, 'wait on this PC');
  assert.equal(u.daily.length, 7); assert.equal(u.daily[6].local, 5000); assert.equal(u.daily[6].q, 1); assert.equal(u.daily[3].local, 10000);
  assert.equal(u.models[0].key, 'media:sd', 'models are listed by time spent');
  assert.equal(usage.summary(2, now).made.image, 0, 'a shorter range leaves out older days');
  assert.equal(usage.summary(0, now).made.image, 1, 'all time has everything');
  console.log('✓ sums: shares, speeds, time taken against time expected, this PC against the cloud');

  // Privacy: counts and timings only. A question never reaches the file.
  const SECRET = 'my private question about zebras and what they eat in the wild during the long dry season each year';
  const dir = store.dir('models');
  const file = path.join(dir, 'qwen.gguf'); fs.copyFileSync(TINY, file);
  models.add({ id: 'qwen3-8b', name: 'Qwen3 8B', kind: 'text', catalogId: 'qwen3-8b', files: { model: file }, size: 5e9 });
  usage.clear();
  assert.equal(usage.summary(0).ms, 0, 'clearing starts again from zero');
  const said = await drain(complete.run('local:qwen3-8b', { messages: [{ role: 'user', content: SECRET }], temperature: 0.5, maxTokens: 100, contextSize: 4096 }));
  assert.match(said, /Answer from qwen\.gguf/);
  u = usage.summary(1);
  const row = u.models.find((m) => m.key === 'local:qwen3-8b');
  assert.ok(row, 'an answer from a model on this PC is counted');
  assert.equal(row.source, 'local'); assert.equal(row.name, 'Qwen3 8B'); assert.ok(row.n >= 1); assert.ok(row.words > 0); assert.ok(row.ms > 0);
  near(row.wps, 42.5 * 0.75, 'the engine\'s own speed is what is shown');
  assert.ok(row.expectedWps > 0, 'with this PC\'s estimate beside it');
  assert.ok(!fs.readFileSync(store.file('usage.json'), 'utf8').includes(SECRET), 'the question is not in the statistics file');
  assert.ok(!/zebra/i.test(JSON.stringify(u)), 'or in the summary');
  console.log('✓ a real answer on this PC is counted (speed, estimate, time) and the question is never kept');

  // A cloud AI's answer is counted as cloud; an app on this PC (LM Studio, Ollama) as this PC.
  const fakeCloud = async function* () { yield { type: 'text', text: 'hello ' }; yield { type: 'text', text: 'there' }; yield { type: 'stats', tps: 100, tokens: 50 }; };
  await drain(usage.metered({ source: 'cloud', kind: 'text', key: 'api:c1:m', name: 'm (Cloud One)' }, fakeCloud()));
  const srv = http.createServer((q, r) => {
    r.writeHead(200, { 'Content-Type': 'text/event-stream' });
    r.write(`data: ${JSON.stringify({ choices: [{ delta: { content: 'hi from the other app' } }] })}\n\n`);
    r.end(`data: ${JSON.stringify({ choices: [{ delta: {}, finish_reason: 'stop' }], usage: { completion_tokens: 20 } })}\n\ndata: [DONE]\n\n`);
  }).listen(0);
  await new Promise((r) => srv.once('listening', r));
  const p = providers.upsert({ preset: 'custom', name: 'LM Studio', baseUrl: `http://127.0.0.1:${srv.address().port}/v1`, models: ['other-app-model'] }, 'k');
  assert.equal(await drain(complete.run(`api:${p.id}:other-app-model`, { messages: [{ role: 'user', content: 'hi' }], maxTokens: 50 })), 'hi from the other app');
  srv.close();
  u = usage.summary(1);
  assert.equal(u.models.find((m) => m.key === 'api:c1:m').source, 'cloud');
  assert.equal(u.models.find((m) => m.key === `api:${p.id}:other-app-model`).source, 'local', 'a connection to an app on this PC is not the cloud');
  assert.equal(u.totals.cloud.n, 1);
  console.log('✓ cloud answers count as cloud; an app on this PC counts as this PC');

  // A stream that was stopped before it finished is not counted.
  const stopped = async function* () { yield { type: 'text', text: 'half an ans' }; };
  await drain(usage.metered({ source: 'cloud', kind: 'text', key: 'api:c2:m', name: 'm' }, stopped()));
  assert.ok(!usage.summary(1).models.some((m) => m.key === 'api:c2:m'));
  // Turned off: nothing new is counted, and what was there stays.
  const before = usage.summary(1).totals.local.n;
  assert.equal(usage.setEnabled(false), false);
  assert.equal(usage.record({ source: 'local', key: 'local:a', name: 'A', ms: 1000, tokens: 50, tps: 10 }), false);
  assert.equal(usage.recordChat(1000), false);
  assert.equal(usage.summary(1).totals.local.n, before); assert.equal(usage.summary(1).enabled, false);
  usage.setEnabled(true);
  // Odd input never throws (statistics must not get in the way of an answer).
  assert.equal(usage.record(null), false); assert.equal(usage.record({ source: 'elsewhere', key: 'x' }), false);
  assert.equal(usage.record({ source: 'local', key: 'k', ms: NaN, tokens: -5, tps: Infinity }), true);
  fs.writeFileSync(store.file('usage.json'), '{ not json');
  assert.equal(usage.summary(7).ms, 0, 'a damaged file reads as empty');
  console.log('✓ stopped answers are not counted; off means off; odd input and a damaged file are harmless');

  llama.stopAll();
  console.log('\nUSAGE TESTS PASSED');
  process.exit(0);
})().catch((e) => { console.error('FAIL', e); try { llama.stopAll(); } catch {} process.exit(1); });
