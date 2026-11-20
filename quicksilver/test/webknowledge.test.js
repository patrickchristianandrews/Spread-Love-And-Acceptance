'use strict';
// Unit tests for the big-web-knowledge text helper (the deterministic part; the paged /rows fetch
// needs network and is exercised in the app).
const assert = require('node:assert');
const hf = require('../src/main/hf-data');

// Trims, collapses runs of spaces/tabs and 3+ newlines, keeps the text field.
const t = hf.webRowText({ text: '  hello   world \n\n\n\n next ', int_score: 4 }, 'text');
assert.ok(/hello world/.test(t), 'collapses spaces');
assert.ok(!/\n\n\n/.test(t), 'collapses blank-line runs');
assert.ok(!/^\s|\s$/.test(t), 'trimmed');

// Caps a very long page so the index stays searchable.
const big = hf.webRowText({ text: 'x'.repeat(10000) }, 'text');
assert.equal(big.length, 6000, 'capped at 6000 chars');

// Missing / empty field yields nothing (the row is skipped by the caller).
assert.equal(hf.webRowText({}, 'text'), '');
assert.equal(hf.webRowText({ body: 'hi' }, 'text'), '');
assert.equal(hf.webRowText({ body: 'hi' }, 'body'), 'hi', 'honours the configured field');

// The source registry is well-formed.
assert.ok(hf.WEB_KNOWLEDGE['fineweb-edu'] && hf.WEB_KNOWLEDGE['fineweb-edu'].dataset === 'HuggingFaceFW/fineweb-edu');

console.log('✓ web knowledge: row text trimmed/capped, field honoured, FineWeb-Edu registered');
console.log('WEBKNOWLEDGE TESTS PASSED');
