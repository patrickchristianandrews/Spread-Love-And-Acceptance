'use strict';
// Unit tests for the Hugging Face Space runner's pure logic: turning a Space id into its API host,
// reading the Gradio event stream, finding media in the result, picking an endpoint and building the
// input array. (Live Space calls aren't exercised here — these are the deterministic parts.)
const assert = require('node:assert');
const hf = require('../src/main/hfspace');

// --- spaceHost ---
assert.equal(hf.spaceHost('owner/name').base, 'https://owner-name.hf.space');
assert.equal(hf.spaceHost('Guaryn/qwen-image-2.1-uncensored-aio-loras').base, 'https://guaryn-qwen-image-2-1-uncensored-aio-loras.hf.space');
assert.equal(hf.spaceHost('https://huggingface.co/spaces/JCisHERE/wan2-2-i2v-v3').base, 'https://jcishere-wan2-2-i2v-v3.hf.space');
assert.equal(hf.spaceHost('https://jcishere-wan2-2-i2v-v3.hf.space').base, 'https://jcishere-wan2-2-i2v-v3.hf.space');
assert.throws(() => hf.spaceHost(''), /Give a Space/);
console.log('✓ spaceHost: owner/name, full URL and bare subdomain all map to the right .hf.space host');

// --- parseSse ---
assert.deepEqual(hf.parseSse('event: complete\ndata: [{"url":"https://x/y.png"}]').data, [{ url: 'https://x/y.png' }]);
assert.equal(hf.parseSse('event: complete\ndata: [{"url":"https://x/y.png"}]').status, 'complete');
assert.equal(hf.parseSse('event: error\ndata: GPU quota exceeded').status, 'error');
assert.equal(hf.parseSse('event: error\ndata: GPU quota exceeded').message, 'GPU quota exceeded');
assert.equal(hf.parseSse('event: heartbeat\ndata: null').status, 'none');
// An error with no detail (Gradio sends data: null) is still an error, but with an empty message so
// the caller can show a helpful note instead of the literal word "null".
assert.equal(hf.parseSse('event: error\ndata: null').status, 'error');
assert.equal(hf.parseSse('event: error\ndata: null').message, '');
assert.equal(hf.parseSse('event: error\ndata: None').message, '');
assert.equal(hf.parseSse('event: error').message, '');
console.log('✓ parseSse: reads the complete payload, surfaces errors (detail or none), ignores heartbeats');

// --- extractMedia ---
const base = 'https://s.hf.space';
assert.deepEqual(hf.extractMedia([{ url: 'https://cdn/a.mp4' }], base), [{ url: 'https://cdn/a.mp4', kind: 'video' }]);
assert.deepEqual(hf.extractMedia({ video: { url: 'https://cdn/b.webm' } }, base), [{ url: 'https://cdn/b.webm', kind: 'video' }]);
assert.deepEqual(hf.extractMedia([{ path: 'tmp/out.png', meta: {} }], base), [{ url: `${base}/gradio_api/file=tmp/out.png`, kind: 'image' }]);
assert.deepEqual(hf.extractMedia(['https://cdn/c.jpg'], base), [{ url: 'https://cdn/c.jpg', kind: 'image' }]);
// nested (gallery of images), de-duped
const nested = [[{ image: { url: 'https://cdn/d.png' } }, { image: { url: 'https://cdn/d.png' } }]];
assert.deepEqual(hf.extractMedia(nested, base), [{ url: 'https://cdn/d.png', kind: 'image' }]);
assert.deepEqual(hf.extractMedia(['just text', { label: 'no media' }], base), []);
console.log('✓ extractMedia: finds images/videos in strings, FileData objects and nested results, de-duped');

// --- pickEndpoint ---
const info = { named_endpoints: {
  '/caption': { parameters: [{ component: 'image' }], returns: [{ component: 'textbox' }] },
  '/generate': { parameters: [{ component: 'textbox', label: 'Prompt' }, { component: 'slider' }], returns: [{ component: 'video' }] },
} };
const ep = hf.pickEndpoint(info, 'video');
assert.equal(ep.apiName, '/generate', 'prefers the endpoint that returns video');
assert.equal(hf.pickEndpoint(info, 'image').apiName, '/generate', 'with no image-returner, still prefers a media-returning endpoint over a text one');
assert.equal(hf.pickEndpoint({ named_endpoints: {} }, 'image'), null);
console.log('✓ pickEndpoint: chooses the endpoint whose output matches what you want');

// --- buildData ---
const params = [
  { component: 'image', label: 'Init image' },
  { component: 'textbox', label: 'Prompt' },
  { component: 'slider', label: 'Steps', parameter_has_default: true, parameter_default: 20 },
  { component: 'checkbox', label: 'Safe', python_type: { type: 'bool' } },
];
const d1 = hf.buildData(params, { prompt: 'a red fox', imageFile: { path: 'u/x.png' } });
assert.deepEqual(d1, [{ path: 'u/x.png' }, 'a red fox', 20, false], 'slots image + prompt, keeps defaults, fills a bool');
const d2 = hf.buildData([{ component: 'textbox', label: 'Prompt' }], { prompt: 'hello' });
assert.deepEqual(d2, ['hello']);
const d3 = hf.buildData([{ component: 'textbox', label: 'Prompt' }, { component: 'textbox', label: 'Negative' }], { prompt: 'cat' });
assert.deepEqual(d3, ['cat', ''], 'only the first text slot takes the prompt');
console.log('✓ buildData: positional inputs with the prompt and image slotted in, defaults respected');

console.log('HFSPACE TESTS PASSED');
