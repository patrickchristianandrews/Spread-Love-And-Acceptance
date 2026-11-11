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
assert.equal(remote.picks().liquid.videos, 'wan2.2-5b', 'the Liquid Edition makes videos with Wan 2.2');
for (const id of ['wan2.2-5b', 'wan2.2-5b-turbo']) assert.ok(catalog.MEDIA_MODELS.find((m) => m.id === id)?.animate, `${id} makes and animates videos`);
assert.ok(catalog.MEDIA_MODELS.find((m) => m.id === 'pony-v6').promptPrefix.startsWith('score_9'), 'Pony tags');
assert.equal(catalog.MEDIA_MODELS.find((m) => m.id === 'wai-nsfw-illustrious').style, 'anime');
// Recommended "create" kits never pick an uncensored model by themselves...
const hw = { ramGB: 64, vramGB: 24, gpu: 'NVIDIA GeForce RTX 4090', gpuVendor: 'nvidia', cores: 16 };
const adv = catalog.advise('create', hw, { installed: [] });
for (const id of adv.best.ids) assert.ok(!catalog.MEDIA_MODELS.find((m) => m.id === id)?.uncensored, `recommended kit stays standard (${id})`);
// ...but one you downloaded counts as your picture maker.
const mine = catalog.advise('create', hw, { installed: [{ id: 'my-lustify', name: 'Lustify', kind: 'image', catalogId: 'lustify' }] });
assert.equal(mine.mine?.members.image, 'my-lustify', 'your own Lustify makes the pictures in your kit');
// The Liquid Edition's core is locked; six suggested add-ons are optional and outside the lock.
for (const id of ['qwen3.5-4b', 'qwen3.5-9b-uncensored', 'lustify', 'wan2.2-5b']) assert.ok(catalog.liquidMember(id), `${id} in the core`);
assert.equal(catalog.LIQUID_ADDONS.length, 6, 'six suggested add-ons');
for (const a of catalog.LIQUID_ADDONS) {
  assert.ok(!catalog.liquidMember(a.id), `${a.id} is optional (not locked)`);
  assert.ok([...catalog.TEXT_MODELS, ...catalog.MEDIA_MODELS].some((m) => m.id === a.id), `${a.id} is in the catalog`);
}
assert.ok(!catalog.liquidMember('qwen3-8b') && !catalog.liquidMember('sdxl') && !catalog.liquidMember('pony-v6'), 'everything else is outside it (and removable)');
const unc = [...catalog.MEDIA_MODELS, ...catalog.TEXT_MODELS].filter((m) => m.uncensored || m.category === 'open');
console.log(`✓ media catalog: ${catalog.MEDIA_MODELS.length} picture/video models, ${unc.length} uncensored (text + pictures), Lustify and Wan 2.2 for the Liquid Edition`);
