// "Just ask": requests that make something use the right skill by themselves; ordinary questions
// and remarks never do. Runs the real skill list and rules outside the app.
'use strict';
const fs = require('node:fs');
const path = require('node:path');
const vm = require('node:vm');
const assert = require('node:assert/strict');

const ctx = { S: { data: { prefs: {}, skills: [] } }, console, views: {}, MEDIA_RULES: {}, DIRECT_OUTPUTS: new Set(), MEDIA_OUTPUTS: new Set(), SKILL_JOB: {} };
vm.createContext(ctx);
const load = (f) => { try { vm.runInContext(fs.readFileSync(path.join(__dirname, '..', 'src', 'renderer', 'js', f), 'utf8').replace(/^(const|let) /gm, 'var '), ctx, { filename: f }); } catch (e) { if (!/is not defined/.test(e.message)) throw e; } };
load('skills-data.js'); load('skills-more.js'); load('skills.js');
const img = [{ type: 'image' }];
const CASES = [
  // pictures
  ['make me a picture of a red fox in the snow', [], 'make-image'],
  ['a photo of a woman in a red dress', [], 'make-image'],
  ['generate an image of a castle at dusk', [], 'make-image'],
  ['can you draw a cat wearing a hat', [], 'make-image'],
  ['draw me a cat wearing a hat', [], 'make-image'],
  ['paint a sunset over the ocean', [], 'make-image'],
  ['please make a picture of a lighthouse', [], 'make-image'],
  ['could you create an image of a tiger?', [], 'make-image'],
  ['I want a picture of my dream house', [], 'make-image'],
  ['design a logo for my bakery', [], 'make-logo'],
  ['create a wallpaper of a neon city', [], 'make-wallpaper'],
  // not picture requests
  ['what is the best wallpaper app for windows?', [], null],
  ['how do I make a logo in photoshop?', [], null],
  ['how do diffusion models make an image?', [], null],
  ['write a prompt for an image of a dragon', [], null],
  ['generate a list of image ideas for my blog', [], null],
  ['I took a photo of my dog yesterday, he is so cute', [], null],
  ['draw a conclusion from these numbers', [], null],
  ['write a story about a painting of a ship', [], null],
  ['describe this picture', img, null],
  ['make this sound more formal', img, null],
  // video, photo edits
  ['make a video of waves crashing on rocks', [], 'make-video'],
  ['create a gif of a dancing robot', [], 'make-gif'],
  ['animate this photo', img, 'animate-photo'],
  ['animate this photo', [], null],
  ['remove the background', img, 'photo-background'],
  ['edit this photo so the sky is pink', img, 'edit-photo'],
  // apps, documents, charts, sound
  ['build me an app that tracks my water intake', [], 'build-app'],
  ['make me a game like snake', [], 'build-game'],
  ['write a report on solar power in Texas', [], 'report'],
  ['create a presentation about our Q3 results', [], 'presentation'],
  ['make a budget for a family of four', [], 'budget'],
  ['make a chart of these sales numbers: 3, 5, 9', [], 'chart'],
  ['make a lofi beat', [], 'make-beat'],
  ['read this aloud', [], 'read-aloud'],
  // ordinary chat stays ordinary
  ['how do I give a good presentation?', [], null],
  ['I did some research on dogs yesterday', [], null],
  ['is meditation good for anxiety?', [], null],
  ['my printer is not working', [], null],
  ['summarize this article for me', [], null],
  ['can you make my essay better?', [], null],
  ['tell me a joke', [], null],
  ['what is 17 x 23', [], null],
  ['hello there', [], null],
];
const wrong = CASES.map(([t, a, want]) => [t, ctx.autoSkillFor(t, a, null)?.id || null, want]).filter(([, got, want]) => got !== want);
assert.deepEqual(wrong, [], `wrong: ${wrong.map(([t, got, want]) => `"${t}" → ${got} (wanted ${want})`).join('; ')}`);
// A skill you dismissed in a chat stays dismissed there; the switch in Settings turns it all off.
assert.equal(ctx.autoSkillFor('make me a picture of a fox', [], { dismissed: ['make-image'] }), null);
ctx.S.data.prefs.autoSkills = false;
assert.equal(ctx.autoSkillFor('make me a picture of a fox', [], null), null);
console.log(`✓ just ask: ${CASES.filter((c) => c[2]).length} requests use the right skill by themselves, ${CASES.filter((c) => !c[2]).length} ordinary messages stay ordinary`);
