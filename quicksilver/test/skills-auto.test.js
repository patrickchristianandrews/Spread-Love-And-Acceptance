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
load('skills-data.js'); load('skills-more.js'); load('skills-pro.js'); load('skill-media.js'); load('skills.js');
const img = [{ type: 'image' }];
ctx.isCodeChat = (a) => a?.id === 'as-code';
ctx.assistantById = (id) => ({ id });
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
  ['make a 4k ultra detailed cinematic wide-angle picture of a cat', [], 'make-image'],
  ['gimme a picture of a cat', [], 'make-image'],
  ['make me a cat picture', [], 'make-image'],
  ['show me some pictures of mountains at dawn', [], 'make-image'],
  ['a video of a dog running on a beach', [], 'make-video'],
  ['I need a business plan for a bakery', [], 'business-plan'],
  ['build me a todo app in react', [], 'build-app'],
  ['Build a single-page website for a bakery', [], 'build-site'],
  // a plain picture request is a picture, whatever other skill's words are in the description
  ['make me a picture of my memory of the beach', [], 'make-image'],
  ['make me a picture of a fox (fail-memory)', [], 'make-image'],
  ['draw a workout scene in a gym', [], 'make-image'],
  ['make a picture of a budget meeting', [], 'make-image'],
  ['create a presentation with pictures of cats', [], 'presentation'],
  ['I need a memo to staff about the holiday rota', [], 'report'],
  // messages about code are answered as code, never painted or filmed (found by the audit)
  ['can you make the image smaller in this html', [], null],
  ['I want the image to be centered, here is my css', [], null],
  ['draw a rectangle on a canvas in javascript', [], null],
  ['write a python script to generate an image of the mandelbrot set', [], null],
  ['Fix this error. Here is the message and the code:\n\nTypeError: cannot create image from null', [], null],
  ['generate a migration that adds a photo column', [], null],
  ['show me the code for a video player', [], null],
  ['can you give me a clip-path example in css', [], null],
  // the thing must be what is asked for, not just a word in the message
  ['I need the big picture on climate change', [], null],
  ['the picture of dorian gray is my favorite book, write a review', [], null],
  ['draw two cards from a deck and tell me the probability they are both aces', [], null],
  ['generate a video script about recycling', [], null],
  ['I need the video to autoplay on my landing page', [], null],
  ['I want to build an app someday', [], null],
  ['I need to research dogs for school', [], null],
  ['can you make sense of this invoice', [], null],
  ['I want to know about seo', [], null],
  ['I need meditation tips', [], null],
  ['I want a picture frame for my wall', [], null],
  ['give me an image description for accessibility', [], null],
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
// A photo attached and an instruction to change it: the photo is edited (or brought to life).
// A question about the photo, or a request for words about it, is answered as usual.
const PHOTO = [
  ['make the sky pink', 'edit-photo'], ['remove the car on the left', 'edit-photo'], ['add a hat', 'edit-photo'],
  ['can you make her smile', 'edit-photo'], ['please change the background to a beach', 'photo-background'],
  ['turn this into a watercolour painting', 'edit-photo'], ['make me look younger', 'edit-photo'], ['give him sunglasses', 'edit-photo'],
  ['animate it', 'animate-photo'], ['make it move', 'animate-photo'], ['bring her to life', 'animate-photo'], ['turn this into a video', 'animate-photo'],
  ['what is this?', null], ['describe this photo', null], ['what would this look like with a red roof?', null],
  ['make a caption for this', null], ['turn this into a table', null], ['add up the numbers in this receipt', null],
  ['make it shorter', null], ['turn this sketch into a website', null], ['give me 5 ideas for decorating this room', null],
  ['remove the last paragraph', null], ['who is the author of this book', null], ['translate this sign', null],
];
for (const c of PHOTO) CASES.push([c[0], img, c[1]]);
// Right after a picture: what a short message asks for.
const FOLLOW = [
  ['another one', 'repeat'], ['again', 'repeat'], ['one more please', 'repeat'],
  ['make her smile', 'change'], ['same but at night', 'change'], ['add a hat', 'change'], ['remove the tree', 'change'],
  ['now make it winter', 'change'], ['change the background to a forest', 'change'], ['make the dress red', 'change'],
  ['animate it', 'animate'], ['make it move', 'animate'], ['turn it into a video', 'animate'], ['bring it to life', 'animate'], ['now as a video', 'animate'],
  ['thanks, love it', null], ['what model made this', null], ['write a poem about it', null], ['make it shorter', 'change'], ['make her hair longer', 'change'], ['make it more formal', null],
  ['how do I animate a picture in blender', null], ['tell me a joke', null], ['add a paragraph about dogs', null], ['what is the capital of France', null],
];
const off = FOLLOW.map(([t, want]) => [t, ctx.mediaFollowUpKind(t), want]).filter(([, got, want]) => got !== want);
assert.deepEqual(off, [], `follow-ups wrong: ${off.map(([t, got, want]) => `"${t}" → ${got} (wanted ${want})`).join('; ')}`);
const wrong = CASES.map(([t, a, want]) => [t, ctx.autoSkillFor(t, a, null)?.id || null, want]).filter(([, got, want]) => got !== want);
assert.deepEqual(wrong, [], `wrong: ${wrong.map(([t, got, want]) => `"${t}" → ${got} (wanted ${want})`).join('; ')}`);
// The specialist skills: offered for their own requests, and they never take a request an
// everyday skill already answers.
const PRO = [
  ['is this email a scam? "Your account is locked, click here"', 'phishing-check'], ['help me build a threat model for our login service', 'threat-model'],
  ['I need a variance report for Q3 spending', 'budget-variance'], ['when will we run out of cash at this burn rate', 'cash-flow'],
  ['explain this statute to me', 'read-law'], ['write a case brief for Marbury v. Madison', 'case-brief'], ['questions to ask my doctor about knee surgery', 'doctor-questions'],
  ['what did this study find', 'read-paper'], ['is this source reliable?', 'source-check'], ['I need a risk register for the office move', 'risk-register'],
  ['help me respond to this RFP from the city', 'procurement'], ['I have a hard conversation with my brother coming up', 'hard-talk'], ['I can\'t sleep lately', 'sleep-plan'],
  ['summarize this article', 'summarize'], ['write an email to my landlord', 'email'], ['translate this to Spanish', 'translate'], ['write a SQL query for top customers', 'sql'],
];
const proOff = PRO.map(([t, want]) => [t, ctx.suggestSkill(t)?.id || null, want]).filter(([, got, want]) => got !== want);
assert.deepEqual(proOff, [], `specialist skills wrong: ${proOff.map(([t, got, want]) => `"${t}" → ${got} (wanted ${want})`).join('; ')}`);
assert.ok(ctx.SKILL_CATEGORIES.policy && ctx.SKILL_CATEGORIES.security && ctx.allSkills().filter((s) => ['policy', 'security'].includes(s.category)).length >= 15, 'two new groups, each with its skills');
for (const s of ctx.allSkills()) for (const p of s.triggers || []) assert.doesNotThrow(() => new RegExp(p, 'i'), `${s.id}: ${p}`);
console.log(`✓ specialist skills: ${ctx.allSkills().length} skills in all; each offered for its own requests, everyday ones unchanged`);
// In a Code chat nothing is painted or filmed by itself; an app or a web page still opens in a preview.
assert.equal(ctx.autoSkillFor('make me a picture of a fox', [], { assistantId: 'as-code' }), null);
assert.equal(ctx.autoSkillFor('write a report on solar power in Texas', [], { assistantId: 'as-code' }), null);
assert.equal(ctx.autoSkillFor('Build a single-page website for a bakery', [], { assistantId: 'as-code' })?.id, 'build-site');
// A skill you dismissed in a chat stays dismissed there; the switch in Settings turns it all off.
assert.equal(ctx.autoSkillFor('make me a picture of a fox', [], { dismissed: ['make-image'] }), null);
ctx.S.data.prefs.autoSkills = false;
assert.equal(ctx.autoSkillFor('make me a picture of a fox', [], null), null);
console.log(`✓ after a picture: ${FOLLOW.filter((c) => c[1]).length} follow-ups change, repeat or animate it; ${FOLLOW.filter((c) => !c[1]).length} other messages are left alone`);
console.log(`✓ just ask: ${CASES.filter((c) => c[2]).length} requests use the right skill by themselves, ${CASES.filter((c) => !c[2]).length} ordinary messages stay ordinary`);
