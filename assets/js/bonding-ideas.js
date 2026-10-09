/* bonding-ideas.js — the "Bonding idea" picker on /bonding.html.
   Pick who, how much time, how much energy, and (optionally) sensory-friendly / no talking needed.
   It shows one small idea at a time. "Another idea" never shows the same one twice in a row.
   Everything stays on this device: the ideas live in this file, and the last choices are kept in
   localStorage (if the browser allows it). Nothing is sent anywhere unless the person taps "Send it".

   Each idea: [text, who, time, energy, quiet]
     who    space-separated: pa partner, ch child (babies and kids), te teen, fr friend, pr parent,
            si sibling, gr grandparent or grandchild, ho housemate, co coworker, me just me
     time   space-separated: 1 (a minute), 10 (ten minutes), eve (an evening), wknd (a weekend)
     energy low | some | lots
     quiet  1 = sensory-friendly, no talking needed */
(function () {
  'use strict';

  var IDEAS = [
    // ---- a minute ----
    ['Next time they say “look at this,” stop and really look. Say one thing back about it.', 'pa fr pr si ho te gr', '1', 'low', 0],
    ['Send a photo of something that made you think of them. Add nothing that needs a reply.', 'pa fr pr si gr te', '1', 'low', 1],
    ['Say one specific thank-you. Not “thanks for everything,” but “thank you for taking the bins out in the rain.”', 'pa ho pr si ch te co', '1', 'low', 0],
    ['A long hug, or a hand on the shoulder if that suits you both better. Long enough to notice, short enough to be easy.', 'pa ch pr si gr', '1', 'low', 1],
    ['When they come through the door, stop what you are doing for ten seconds and greet them like you are glad they are home.', 'pa ch te ho pr', '1', 'low', 0],
    ['Ask one follow-up question about something they told you yesterday.', 'pa fr co pr si ho te gr', '1', 'low', 0],
    ['Leave a sticky note on the mirror or in the lunchbox: one line, one thing you like about them.', 'pa ch te ho', '1', 'low', 1],
    ['Send a voice note instead of a text. Ten seconds of your voice says more than a thumbs-up.', 'fr pr si gr pa', '1', 'low', 0],
    ['When they share good news, ask one more question about it before you say anything about yourself.', 'pa fr co pr si te ho', '1', 'low', 0],
    ['With a baby: when they look at something, look at it too and name it. “A dog! Yes, a big dog.” That is serve and return.', 'ch', '1', 'low', 0],
    ['With a baby: copy their sound back to them, then wait. Let them take the next turn.', 'ch', '1', 'low', 0],
    ['Share one song with one line: “This made me think of you.”', 'fr te pa si', '1', 'low', 1],
    ['Remember one name from their world (a manager, a friend, a teacher) and ask about that person next time.', 'pa fr co pr si te gr', '1', 'low', 0],
    ['Send a teen a meme or short video in their style, with no lesson attached. Just “ha, this.”', 'te', '1', 'low', 1],
    ['Use their name and a warm word at a moment that is nothing special: “Morning, Sam. Good to see you.”', 'co ho ch te', '1', 'low', 0],
    ['Thank a coworker in front of others for one specific thing they did.', 'co', '1', 'low', 0],
    ['Make them a drink the way they like it, without asking first.', 'pa ho co pr', '1', 'low', 1],
    ['Nod or wave hello to a neighbour, and use their name if you know it. Small, repeated hellos are how strangers become neighbours.', 'me', '1', 'low', 0],
    ['Put a hand on your chest, take one slow breath, and say to yourself what you would say to a friend having your day.', 'me', '1', 'low', 1],
    ['If you have a pet, sit on the floor at their level for a minute and let them come to you.', 'me ch', '1', 'low', 1],
    ['Send a parent or grandparent a photo of what you are cooking, or the view on your walk.', 'pr gr', '1', 'low', 1],
    ['Send a “no need to reply” message: “Thinking of you. No need to answer.”', 'fr pr si gr pa', '1', 'low', 0],
    ['Use a private signal across a busy room: a wink, a thumbs-up, a squeeze of the hand. A secret sign is a small bond of its own.', 'pa ch te si', '1', 'low', 1],
    ['Say goodnight properly: put your phone down, look up, and say it.', 'pa ch te ho', '1', 'low', 0],
    ['Tell a child one thing you saw them do, not how clever they are: “You kept trying with that zip.”', 'ch gr', '1', 'low', 0],
    ['Leave a coworker’s favourite snack on their desk with a short note.', 'co ho', '1', 'low', 1],
    ['Ask “What was the best bit of your day?” and then just listen.', 'pa ch te ho fr pr gr', '1', 'low', 0],
    ['When something is funny, let them see you laugh. Shared laughter is a small bond.', 'pa fr co si ho te', '1', 'low', 0],
    ['Ask: “Is there anything on your mind this week that I could help with?”', 'pa ho pr si co fr', '1', 'low', 0],
    ['Kiss goodbye for a few seconds longer than usual.', 'pa', '1', 'low', 1],
    ['When they vent about a hard day, ask: “Do you want ideas, or do you want me on your side?”', 'pa fr si te', '1', 'low', 0],
    ['Text a teen “proud of you” about something small, with no lesson attached.', 'te', '1', 'low', 1],
    ['Send a sibling a childhood photo with “remember this?”', 'si', '1', 'low', 1],
    ['Ask your housemate if they need anything from the shop when you go.', 'ho', '1', 'low', 0],
    ['Remember a coworker’s big day (a birthday, a hard deadline, a sick parent) and ask how it went.', 'co', '1', 'low', 0],
    ['In a meeting, credit the person whose idea it was: “Building on what Priya said…”', 'co', '1', 'low', 0],
    ['Learn one neighbour’s name, and use it next time you see them.', 'me', '1', 'low', 0],
    ['Send them a small thing that reminded you of them: a link, a leaf, a photo of a cat. Some autistic people call this “penguin pebbling.”', 'fr pa si te', '1', 'low', 1],
    ['Learn one part of their routine and protect it: the same mug, the same seat, the same quiet first ten minutes home. Keeping it steady is care.', 'pa ch te ho', '1', 'low', 1],
    ['Offer a quiet option before they need it: dimmer lights, a softer jumper, a quiet corner at a busy party.', 'ch te pa fr', '1', 'low', 1],
    ['High-five, fist-bump or elbow-bump on the way out of the door. Every day, the same way.', 'ch te gr', '1', 'some', 1],
    ['A quick piggyback or “aeroplane,” stopping the moment they say stop.', 'ch', '1', 'lots', 0],
    ['Race them to the end of the street (and let the result be whatever it is).', 'ch te', '1', 'lots', 1],
    ['Write one kind thing about yourself on a sticky note, and stick it where you will see it tomorrow.', 'me', '1', 'low', 1],

    // ---- ten minutes ----
    ['Make tea together and drink it side by side. You don’t have to talk.', 'pa ho pr gr fr si', '10', 'low', 1],
    ['Walk around the block together. Side by side is easier than face to face, and silence is fine too.', 'pa te pr si fr ho gr', '10', 'some', 1],
    ['Take turns with one deeper question, like “What would a perfect ordinary day look like for you?”', 'pa fr si', '10', 'some', 0],
    ['Do a small job together: fold the washing, wash up, sort the post. Shared jobs are a quiet way to be on the same team.', 'pa ho ch te pr si', '10', 'low', 1],
    ['A ten-minute talk with no logistics: no bills, no rotas, just how each of you is really doing.', 'pa', '10', 'some', 0],
    ['Play a quick card game like Snap or Uno.', 'ch te gr si ho', '10', 'some', 1],
    ['Read a picture book with a small child on your lap. Let them turn the pages, even out of order.', 'ch gr', '10', 'low', 0],
    ['Dance in the kitchen to one song. Silly counts.', 'ch pa te ho', '10', 'lots', 1],
    ['Drive or ride somewhere with their music on. Teens often talk more in the car, where nobody has to look at anybody.', 'te', '10', 'low', 1],
    ['Both do the same daily puzzle (a word game, a mini crossword) and compare how it went.', 'fr si te pa co gr', '10', 'low', 1],
    ['Sit outside together with a warm drink for ten minutes and look at the sky.', 'ch pa te gr ho', '10', 'low', 1],
    ['Brush or braid their hair, if they like it. Gentle, predictable touch soothes many children.', 'ch gr', '10', 'low', 1],
    ['With a baby: sing the same song at every bath time. Rituals tell a baby what comes next.', 'ch', '10', 'low', 0],
    ['Lie on the floor with a baby and follow what they look at. No toys needed.', 'ch', '10', 'low', 1],
    ['Ask a teen or grandchild to teach you something they are good at: a game move, a dance, a phone trick.', 'te gr', '10', 'some', 0],
    ['Call a parent and ask for one of their recipes, or a story about when you were small.', 'pr gr', '10', 'low', 0],
    ['Ask a grandparent: “What were you doing when you were my age?”', 'gr', '10', 'low', 0],
    ['Start a shared playlist and each add three songs.', 'fr pa si te ho', '10', 'low', 1],
    ['Water the plants or check the garden together. Slow, shared and easy.', 'pa pr gr ch', '10', 'low', 1],
    ['A coffee walk with a coworker: ten minutes, work topics optional.', 'co', '10', 'some', 0],
    ['Offer a coworker help with one small, boring task. Doing it together is the bond.', 'co', '10', 'some', 1],
    ['Ask a newer coworker how they are finding it, and share one thing you wish you had known in your first week.', 'co', '10', 'low', 0],
    ['Write down three things you liked about today. Being good company to yourself counts too.', 'me', '10', 'low', 1],
    ['Go where people gather (a library, a park bench, a café) and just be around people for ten minutes.', 'me', '10', 'low', 1],
    ['Message one friend you have not spoken to in a while: “I was just thinking about you.”', 'me fr', '10', 'low', 0],
    ['Brush or play with your pet for ten full minutes, with your phone in another room.', 'me', '10', 'low', 1],
    ['Take turns picking one photo on your phone and telling the story behind it.', 'pa fr si gr pr', '10', 'low', 0],
    ['Squiggle game: one of you draws a squiggle, the other turns it into something.', 'ch gr si', '10', 'low', 1],
    ['Stretch together for ten minutes, in time with each other. Moving in step helps people feel in step.', 'pa ho fr', '10', 'some', 1],
    ['At dinner, each share a “high and a low” from the day. Share yours too.', 'ch te pa', '10', 'low', 0],
    ['Read the same short article and swap one thought about it.', 'pa fr co', '10', 'low', 0],
    ['Sit in the same room while each of you does your own thing. Being near each other counts.', 'pa te ho si ch', '10', 'low', 1],
    ['Make up a silly handshake with a child and use it every day.', 'ch gr', '10', 'lots', 1],
    ['Tell your housemate one thing about your week that has nothing to do with the house.', 'ho', '10', 'low', 0],
    ['Put on a favourite album and lie on the floor listening to it together. No talking needed.', 'pa te fr si ho', '10', 'low', 1],
    ['Look at old photos together and ask: “What do you remember about that day?”', 'pr gr si pa', '10', 'low', 0],
    ['Play catch, or kick a ball back and forth. The rhythm does the talking.', 'ch te si pr gr', '10', 'lots', 1],
    ['Blow bubbles for a toddler and let them chase them.', 'ch gr', '10', 'lots', 1],
    ['Sing one song together in the car or the kitchen. Singing in time is a quick way to feel in step.', 'ch pa si gr', '10', 'some', 0],
    ['Let a teen pick the music while you cook together.', 'te', '10', 'some', 1],
    ['Set up a standing call with a sibling: say, the first Sunday of each month.', 'si', '10', 'low', 0],
    ['Ask: “What’s something you’ve been thinking about lately that we haven’t talked about?”', 'pa fr', '10', 'some', 0],
    ['Hold hands on the sofa while you watch something.', 'pa', '10', 'low', 1],
    ['Write a short note about something you admire in them and leave it in a coat pocket.', 'pa pr si', '10', 'low', 1],
    ['Ask about their thing (a game, a band, a creator) with real curiosity, and no judgement.', 'te gr', '10', 'low', 0],
    ['Offer a teen a lift and let them choose the music.', 'te', '10', 'low', 1],
    ['Start a sibling group chat just for silly things, not family logistics.', 'si', '10', 'low', 1],
    ['Leave a note on the fridge inviting housemates to share a pot of soup on Sunday.', 'ho', '10', 'low', 0],
    ['Start a house playlist, or a shared shelf of books and games, that anyone can add to.', 'ho', '10', 'low', 1],
    ['Bring in a small treat to share, with something for different diets.', 'co', '10', 'low', 1],
    ['Go to the same café or park at the same time each week. Regulars become familiar faces.', 'me', '10', 'low', 1],
    ['Join an online group for a hobby you love, and post one thing.', 'me', '10', 'low', 1],
    ['Let them tell you all about their favourite topic for ten minutes. Listen, and ask one real question.', 'pa fr ch te si', '10', 'low', 0],
    ['Go for a quiet walk where headphones are allowed. Being together counts, even without talking.', 'fr pa te si', '10', 'low', 1],
    ['Video-call a grandparent or grandchild and show them one thing: a drawing, a plant, the dog.', 'gr', '10', 'low', 0],
    ['Play a quick round of a calm phone game together, passing it back and forth.', 'ch te gr', '10', 'low', 1],
    ['Do ten minutes of a two-person puzzle: one does the edges, one does the sky.', 'pa gr ch si ho', '10', 'low', 1],
    ['Jump on a trampoline, or have a pillow fight with soft pillows and clear rules.', 'ch', '10', 'lots', 0],

    // ---- an evening ----
    ['Cook something neither of you has made before. New things done together are one of the best-studied ways to feel closer.', 'pa fr ho si', 'eve', 'some', 0],
    ['Board game night with a game simple enough to laugh through.', 'ch te ho fr si gr', 'eve', 'some', 0],
    ['Watch a film with phones in another room. Afterwards, each say one bit you liked.', 'pa te ho fr', 'eve', 'low', 1],
    ['Build a blanket fort and read inside it with a torch.', 'ch gr', 'eve', 'lots', 1],
    ['Take turns with a few questions that go a little deeper each time. Stop whenever either of you likes.', 'pa fr', 'eve', 'some', 0],
    ['Have a picnic dinner on the living room floor.', 'ch pa ho', 'eve', 'some', 1],
    ['Play a co-op video game together, on the same side.', 'te pa si fr ho ch', 'eve', 'some', 1],
    ['Go to a free talk, a quiz night or a local music night together.', 'fr pa co si', 'eve', 'lots', 0],
    ['Cook a family recipe with a parent or grandparent, and write it down as they go.', 'pr gr', 'eve', 'some', 0],
    ['Video-call and cook the same meal in your own kitchens.', 'pr gr si fr pa', 'eve', 'some', 0],
    ['Watch the same show at the same time while apart, texting along.', 'fr si pa pr gr', 'eve', 'low', 1],
    ['Look at the stars from a garden, a balcony or a window. Lie back and look.', 'pa ch te gr', 'eve', 'low', 1],
    ['Take a slow evening walk somewhere you have not walked before.', 'pa fr pr si', 'eve', 'some', 1],
    ['Bake something simple together and give half of it away.', 'ch te gr ho', 'eve', 'some', 1],
    ['Have a “show me your world” evening: they show you their favourite game, show or hobby, and you ask questions.', 'te pa fr si', 'eve', 'some', 0],
    ['Run a bath, read a book, cook yourself a proper meal. Being kind company to yourself makes it easier to be kind company for others.', 'me', 'eve', 'low', 1],
    ['Go to a class, a club or a volunteer shift. Going back each week is how familiar faces become friends.', 'me', 'eve', 'some', 0],
    ['Phone a parent and ask something you have never asked: “What was hard about being my age?”', 'pr', 'eve', 'low', 0],
    ['Write a letter by hand to a grandparent or grandchild. Add a drawing or a pressed leaf.', 'gr', 'eve', 'low', 1],
    ['Do a jigsaw that lasts all week: a little each evening, side by side.', 'pa ho gr', 'eve', 'low', 1],
    ['Have a karaoke night in the living room. Bad singing very welcome.', 'ch te fr si ho', 'eve', 'lots', 0],
    ['Make something side by side: Lego, knitting, a model kit, painting. Talk if you want to, or don’t.', 'pa te ch fr gr si', 'eve', 'low', 1],
    ['Have a no-phones dinner where everyone shares one funny thing from their week.', 'ch te pa ho pr', 'eve', 'some', 0],
    ['Go swimming together. Water calms many kids and adults.', 'ch te si fr', 'eve', 'lots', 1],
    ['Plan your next small adventure together, with a map and a list. Planning is half the fun.', 'pa fr si', 'eve', 'low', 0],
    ['Teach a child or teen to cook one dish from start to finish.', 'ch te gr', 'eve', 'some', 0],
    ['Game night for two, where the loser makes breakfast.', 'pa', 'eve', 'some', 0],
    ['Each write down three things you appreciate about the other, then swap and read them quietly.', 'pa', 'eve', 'low', 1],
    ['Invite your team for a drink or tea after work, with an alcohol-free option and no pressure to come.', 'co', 'eve', 'some', 0],
    ['Pair up with a coworker on a tricky problem for an hour. Solving something together builds trust faster than a party.', 'co', 'eve', 'some', 0],
    ['Invite a quieter coworker to work through a task together, rather than to a big social event.', 'co', 'eve 10', 'low', 0],
    ['Walk a dog together, or offer to walk a busy neighbour’s dog.', 'me fr pa', 'eve', 'some', 1],
    ['Go to a relaxed or sensory-friendly film showing, or a quiet museum late opening.', 'ch te me fr', 'eve wknd', 'some', 1],
    ['Sort through a box of old things together and each keep one favourite.', 'si pr gr', 'eve', 'low', 0],
    ['Plan a date at home: a dish you both love, low lights, phones away.', 'pa', 'eve', 'some', 0],
    ['Be in the kitchen late in the evening with a snack. Teens often talk when you least expect it.', 'te', 'eve', 'low', 0],
    ['Say yes to one invitation this month, even a small one.', 'me', 'eve', 'some', 0],
    ['Spend time with an animal: a pet, a neighbour’s dog, a city farm.', 'me', 'eve wknd', 'low', 1],
    ['Each do your own thing in the same room, with snacks. Parallel play is real togetherness.', 'ch te fr pa', 'eve', 'low', 1],
    ['Visit a friend with a new baby. Bring food, wash up or hold the baby, and leave before they are tired.', 'fr si', 'eve wknd', 'some', 0],
    ['Make a simple dinner for a parent or sibling who is having a hard week, and eat it with them.', 'pr si', 'eve', 'some', 0],

    // ---- a weekend ----
    ['Go somewhere neither of you has been: a new town, a new trail, a new market.', 'pa fr si', 'wknd', 'lots', 0],
    ['A child-led day: they pick the plan, and you say yes to anything safe and cheap.', 'ch', 'wknd', 'lots', 0],
    ['Camp in the garden or the living room.', 'ch gr te', 'wknd', 'lots', 1],
    ['Take a train or bus to a nearby place you have never been, just for lunch.', 'pa fr pr si gr', 'wknd', 'some', 0],
    ['Do a volunteer shift together: a park clean-up, a food bank, a charity shop.', 'pa fr te co si me', 'wknd', 'some', 0],
    ['Visit the place a parent or grandparent grew up, or explore it together on a map.', 'pr gr', 'wknd', 'some', 0],
    ['A slow weekend morning: pancakes, pyjamas, no plans until noon.', 'pa ch ho', 'wknd', 'low', 1],
    ['Start a small project together: a vegetable patch, a birdhouse, painting a room.', 'pa ho ch te pr', 'wknd', 'lots', 1],
    ['A long walk with a flask and sandwiches. Hours side by side build a lot.', 'fr si pa pr', 'wknd', 'lots', 1],
    ['Do something you used to do as kids: the old park, the old chip shop, the old film.', 'si', 'wknd', 'some', 0],
    ['Visit just to be there, not to fix anything. Help with one chore, eat together, go home.', 'pr gr si', 'wknd', 'some', 0],
    ['Go to a local event on your own: a market, a fair, a talk. Say hello to one person.', 'me', 'wknd', 'some', 0],
    ['Turn up to a team, choir or club you already belong to. Showing up again and again is how belonging grows.', 'me', 'wknd', 'some', 0],
    ['Let a teen plan a day out with a set budget, and go along with their plan.', 'te', 'wknd', 'lots', 0],
    ['Take a grandchild on a small outing, just the two of you: the library, the duck pond, the bakery.', 'gr', 'wknd', 'some', 0],
    ['A long, lazy brunch where everyone brings one thing.', 'fr ho', 'wknd', 'some', 0],
    ['A house clean-up morning with music on, then lunch together. Work, then reward.', 'ho', 'wknd', 'lots', 1],
    ['Try a taster session together: pottery, climbing, a dance class.', 'pa fr si te', 'wknd', 'lots', 0],
    ['A quiet weekend: each of you does your own hobby in the same room, with snacks.', 'pa ho fr si', 'wknd', 'low', 1],
    ['Go to a match, a race or a show and cheer for the same side.', 'pa te si fr pr co', 'wknd', 'lots', 0],
    ['Take a day just for you: a walk, a museum, a long nap. Rest is part of having something to give.', 'me', 'wknd', 'low', 1],
    ['Make a photo book or scrapbook together of the past year.', 'pa ch gr pr', 'wknd', 'low', 1],
    ['Cook a big batch together and share it out.', 'ho fr si pr', 'wknd', 'some', 0],
    ['Go fruit picking, to the beach, or into the woods to collect leaves and sticks.', 'ch gr pa', 'wknd', 'lots', 1],
    ['Spend a day on their special interest: the train museum, the aquarium, the comic shop. Let them lead.', 'ch te fr pa', 'wknd', 'some', 1],
    ['A day out somewhere quiet and open (a beach out of season, a big park early in the morning) with no fixed plan.', 'pa fr ch te', 'wknd', 'some', 1],
    ['Help a parent with a job they have been putting off, like the garden or the loft, and have lunch in the middle.', 'pr', 'wknd', 'lots', 0],
    ['Have an old-fashioned sleepover at a grandparent’s: the same dinner, the same story, the same breakfast.', 'gr', 'wknd', 'some', 0],
    ['Join a team walk, a charity run or a community day that your workplace already does, if it suits you.', 'co', 'wknd', 'lots', 0],
    ['Rest together: a lazy day of films, naps and snacks, with no to-do list.', 'pa ho si', 'wknd', 'low', 1],
    ['Go on a bike ride with a stop for ice cream or chips halfway.', 'ch te pa fr', 'wknd', 'lots', 1],
    ['Write a letter to a friend you have drifted from, and post it.', 'me fr', 'wknd 10', 'low', 0]
  ];

  var WHO = { pa: 'a partner', ch: 'a child', te: 'a teen', fr: 'a friend', pr: 'a parent', si: 'a sibling', gr: 'a grandparent or grandchild', ho: 'a housemate', co: 'a coworker', me: 'just you' };
  var TIME = { '1': 'About a minute', '10': 'About ten minutes', eve: 'An evening', wknd: 'A weekend' };
  var TIME_ORDER = { '1': 0, '10': 1, eve: 2, wknd: 3 };
  var ENERGY = { low: 'Low energy', some: 'Some energy', lots: 'Lots of energy' };
  var ENERGY_ORDER = { low: 0, some: 1, lots: 2 };
  var KEY = 'tol-bonding-picker';

  var data = IDEAS.map(function (r, i) {
    return { i: i, text: r[0], who: r[1].split(' '), time: r[2].split(' '), energy: r[3], quiet: !!r[4] };
  });
  window.TOLBondingIdeas = data;   // for tests and for anyone curious

  var root = document.getElementById('bd-picker');
  if (!root) return;
  var ideaEl = document.getElementById('bd-idea');
  var metaEl = document.getElementById('bd-meta');
  var statusEl = document.getElementById('bd-status');
  var quietBox = document.getElementById('bd-quiet');
  var btnNext = document.getElementById('bd-next');
  var btnCopy = document.getElementById('bd-copy');
  var btnSend = document.getElementById('bd-send');

  var deck = [], pos = 0, current = null, lastShown = -1;

  function radioVal(name, fallback) {
    var r = root.querySelector('input[name="' + name + '"]:checked');
    return r ? r.value : fallback;
  }
  function setRadio(name, val) {
    var r = root.querySelector('input[name="' + name + '"][value="' + val + '"]');
    if (r) r.checked = true;
  }
  function choices() {
    return { who: radioVal('bd-who', 'fr'), time: radioVal('bd-time', '10'), energy: radioVal('bd-energy', 'low'), quiet: !!(quietBox && quietBox.checked) };
  }
  function save(c) { try { localStorage.setItem(KEY, JSON.stringify(c)); } catch (e) {} }
  function load() {
    try {
      var c = JSON.parse(localStorage.getItem(KEY) || 'null');
      if (!c || typeof c !== 'object') return;
      if (WHO[c.who]) setRadio('bd-who', c.who);
      if (TIME[c.time]) setRadio('bd-time', c.time);
      if (ENERGY[c.energy]) setRadio('bd-energy', c.energy);
      if (quietBox) quietBox.checked = !!c.quiet;
    } catch (e) {}
  }
  function shuffle(a) {
    for (var i = a.length - 1; i > 0; i--) { var j = Math.floor(Math.random() * (i + 1)), t = a[i]; a[i] = a[j]; a[j] = t; }
    return a;
  }
  // how far an idea is from what was picked: 0 = fits every choice
  function distance(d, c) {
    var t = TIME_ORDER[c.time], e = ENERGY_ORDER[c.energy], s = 0;
    if (d.time.indexOf(c.time) === -1) {
      var fitsInside = d.time.some(function (x) { return TIME_ORDER[x] <= t; });
      s += fitsInside ? 1 : 3;
    }
    if (d.energy !== c.energy) s += ENERGY_ORDER[d.energy] <= e ? 1 : 3;
    return s;
  }
  // exact fits first (shuffled); if there are only a few, the closest others follow
  function buildDeck(c) {
    var pool = data.filter(function (d) { return d.who.indexOf(c.who) !== -1 && (!c.quiet || d.quiet); });
    if (!pool.length) pool = data.filter(function (d) { return d.who.indexOf(c.who) !== -1; });
    var byScore = {};
    pool.forEach(function (d) { var s = distance(d, c); (byScore[s] = byScore[s] || []).push(d); });
    var out = [];
    Object.keys(byScore).map(Number).sort(function (a, b) { return a - b; }).forEach(function (s) {
      if (out.length >= 4 && s > 0) return;
      shuffle(byScore[s]).forEach(function (d) { out.push({ d: d, exact: s === 0 }); });
    });
    return out;
  }
  function say(msg) {
    if (!statusEl) return;
    statusEl.textContent = '';
    setTimeout(function () { statusEl.textContent = msg; }, 30);
  }
  function describe(d) {
    var bits = [d.time.map(function (t) { return TIME[t]; }).join(' or '), ENERGY[d.energy]];
    if (d.quiet) bits.push('No talking needed');
    return bits.join(' · ');
  }
  function show(item, c) {
    current = item.d; lastShown = item.d.i;
    ideaEl.textContent = item.d.text;
    var lead = item.exact ? 'Fits your choices' : 'Closest fit (nothing matched every choice)';
    metaEl.textContent = lead + ': ' + describe(item.d) + '.';
    root.setAttribute('data-idea', String(item.d.i));
  }
  function next(c) {
    if (!deck.length) return;
    if (pos >= deck.length) {
      // start over in a new order, never with the one just shown
      deck = buildDeck(c); pos = 0;
      if (deck.length > 1 && deck[0].d.i === lastShown) { var t = deck[0]; deck[0] = deck[1]; deck[1] = t; }
      if (deck.length > 1) say('That’s every idea for this mix. Here they come again, in a new order.');
    }
    if (deck.length > 1 && deck[pos].d.i === lastShown) pos++;
    if (pos >= deck.length) pos = 0;
    show(deck[pos++], c);
  }
  function refresh() {
    var c = choices();
    save(c);
    deck = buildDeck(c); pos = 0;
    if (deck.length > 1 && deck[0].d.i === lastShown) { var t = deck[0]; deck[0] = deck[1]; deck[1] = t; }
    next(c);
  }

  // ---- copy and send ----
  function fallbackCopy(text) {
    var ta = document.createElement('textarea'), ok = false;
    ta.value = text; ta.setAttribute('readonly', ''); ta.style.position = 'fixed'; ta.style.top = '-1000px'; ta.style.left = '0';
    document.body.appendChild(ta); ta.select();
    try { ok = document.execCommand('copy'); } catch (e) { ok = false; }
    ta.remove(); return ok;
  }
  function copy(text, btn) {
    var done = function () {
      if (btn) { btn.textContent = 'Copied'; setTimeout(function () { btn.textContent = 'Copy'; }, 1500); }
      say('Copied. Paste it into a message, a note or a calendar reminder.');
    };
    var fail = function () { if (fallbackCopy(text)) done(); else say('Copying didn’t work here. Select the words and copy them by hand.'); };
    if (navigator.clipboard && navigator.clipboard.writeText) navigator.clipboard.writeText(text).then(done, fail); else fail();
  }
  function shareUrl() { return location.origin + location.pathname + '#ideas'; }

  btnNext.addEventListener('click', function () { next(choices()); });
  btnCopy.addEventListener('click', function () { if (current) copy(current.text, btnCopy); });
  btnSend.addEventListener('click', function () {
    if (!current) return;
    var text = current.text, title = 'A small bonding idea';
    if (window.TOLShareKit && typeof window.TOLShareKit.shareText === 'function') {
      try { window.TOLShareKit.shareText({ title: title, text: text, url: shareUrl(), heading: 'Send this idea' }); return; } catch (e) {}
    }
    if (navigator.share) {
      navigator.share({ title: title, text: text, url: shareUrl() }).catch(function () {});
      return;
    }
    copy(text + '\n' + shareUrl(), null);
  });
  root.addEventListener('change', function (e) {
    if (e.target && e.target.matches('input')) refresh();
  });

  load();
  refresh();
  root.classList.add('is-ready');
})();
