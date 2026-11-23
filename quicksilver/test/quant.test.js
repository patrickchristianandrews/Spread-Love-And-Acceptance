'use strict';
// Adaptive quantization: upgrade to a higher-quality quant only when it fits entirely on the GPU,
// never a downgrade, and never when the user chose Balanced or the PC has no real graphics memory.
const assert = require('node:assert');
const models = require('../src/main/models');
const { pickAdaptiveQuant } = models;

// A repo offering the usual spread of quants for an ~8B model, with realistic file sizes (bytes).
const opts8b = [
  { quant: 'Q4_K_M', size: 4.9e9 }, { quant: 'Q4_K_S', size: 4.6e9 }, { quant: 'IQ4_XS', size: 4.3e9 },
  { quant: 'Q5_K_S', size: 5.4e9 }, { quant: 'Q5_K_M', size: 5.7e9 }, { quant: 'Q6_K', size: 6.6e9 }, { quant: 'Q8_0', size: 8.5e9 },
];
const q = (o) => (o ? o.quant : null);

// 16 GB desktop card: best that fits ~14.5 GB budget is Q8_0.
assert.equal(q(pickAdaptiveQuant(opts8b, { vramGB: 16 })), 'Q8_0', '16 GB → Q8_0');
// 12 GB laptop card (5070 Ti): budget ~10.5 GB → Q8_0 still fits.
assert.equal(q(pickAdaptiveQuant(opts8b, { vramGB: 12 })), 'Q8_0', '12 GB → Q8_0');
// 8 GB card (5050): budget ~6.5 GB → Q6_K (6.6) just misses, Q5_K_M (5.7) fits.
assert.equal(q(pickAdaptiveQuant(opts8b, { vramGB: 8 })), 'Q5_K_M', '8 GB → Q5_K_M');
// 6 GB card (4050): budget ~4.5 GB → nothing ABOVE Q4_K_M fits, so no upgrade (keep the default).
assert.equal(pickAdaptiveQuant(opts8b, { vramGB: 6 }), null, '6 GB → no upgrade');
// No/low GPU: never upgrades.
assert.equal(pickAdaptiveQuant(opts8b, { vramGB: 0, ramGB: 32 }), null, 'no GPU → no upgrade');
assert.equal(pickAdaptiveQuant(opts8b, { vramGB: 2 }), null, 'tiny GPU → no upgrade');
// Live free VRAM is used when present (another model is holding most of the card).
assert.equal(pickAdaptiveQuant(opts8b, { vramGB: 16, vramFreeGB: 3 }), null, 'card busy → no upgrade');
// Balanced mode: never upgrades, whatever the hardware.
assert.equal(pickAdaptiveQuant(opts8b, { vramGB: 24 }, 'balanced'), null, 'balanced → no upgrade');
// A small 4B model on an 8 GB card: even Q8_0 fits, so it upgrades all the way.
const opts4b = [{ quant: 'Q4_K_M', size: 2.5e9 }, { quant: 'Q5_K_M', size: 2.9e9 }, { quant: 'Q6_K', size: 3.3e9 }, { quant: 'Q8_0', size: 4.3e9 }];
assert.equal(q(pickAdaptiveQuant(opts4b, { vramGB: 8 })), 'Q8_0', '4B on 8 GB → Q8_0');

console.log('✓ adaptive quant: upgrades to the best quant that fits the GPU, never downgrades, respects Balanced');
console.log('QUANT TESTS PASSED');
