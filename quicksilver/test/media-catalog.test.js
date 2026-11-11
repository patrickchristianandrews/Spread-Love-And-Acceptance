// The uncensored picture catalog and the Liquid Edition's picture rules.
'use strict';
const assert = require('node:assert/strict');
const catalog = require('../src/shared/catalog');
const remote = require('../src/main/catalog-remote');

const ids = new Set(catalog.MEDIA_MODELS.map((m) => m.id));
assert.equal(ids.size, catalog.MEDIA_MODELS.length, 'media ids are unique');
for (const m of catalog.MEDIA_MODELS) {
  assert.ok(catalog.MEDIA_CATEGORIES[m.category], `${m.id}: known category`);
  for (const [role, f] of Object.entries(m.files)) { assert.ok(f.repo && f.match, `${m.id}.${role}: repo and match`); new RegExp(f.match); }
  if (m.category === 'open') assert.ok(m.uncensored, `${m.id}: uncensored section models are flagged`);
}
const lustify = catalog.MEDIA_MODELS.find((m) => m.id === 'lustify');
assert.ok(lustify && lustify.uncensored && lustify.recipe === 'sd' && lustify.files.model.alt.length, 'Lustify, with backup copies');
assert.equal(remote.picks().liquid.pictures, 'lustify', 'the Liquid Edition makes pictures with Lustify');
assert.ok(catalog.MEDIA_MODELS.find((m) => m.id === 'pony-v6').promptPrefix.startsWith('score_9'), 'Pony tags');
assert.equal(catalog.MEDIA_MODELS.find((m) => m.id === 'wai-nsfw-illustrious').style, 'anime');
// Recommended "create" kits never pick an uncensored model by themselves...
const hw = { ramGB: 64, vramGB: 24, gpu: 'NVIDIA GeForce RTX 4090', gpuVendor: 'nvidia', cores: 16 };
const adv = catalog.advise('create', hw, { installed: [] });
for (const id of adv.best.ids) assert.ok(!catalog.MEDIA_MODELS.find((m) => m.id === id)?.uncensored, `recommended kit stays standard (${id})`);
// ...but one you downloaded counts as your picture maker.
const mine = catalog.advise('create', hw, { installed: [{ id: 'my-lustify', name: 'Lustify', kind: 'image', catalogId: 'lustify' }] });
assert.equal(mine.mine?.members.image, 'my-lustify', 'your own Lustify makes the pictures in your kit');
const unc = [...catalog.MEDIA_MODELS, ...catalog.TEXT_MODELS].filter((m) => m.uncensored || m.category === 'open');
console.log(`✓ media catalog: ${catalog.MEDIA_MODELS.length} picture/video models, ${unc.length} uncensored (text + pictures), Lustify for the Liquid Edition`);
