/*
  tol-workpaper-library.js — The Objective Ledger (TOL-OS)
  Ready-made content for the fill-in workpapers, so nobody starts from a blank page:

  - TOL_TASK_LIBRARY(road, kind): 60 to 100 common jobs for each road, grouped, including
    the invisible ones (school forms, gifts, prescriptions to pick up, renewals, birthdays,
    planning). Tap one on WP-01 (Who did what) or WP-03 (One owner per job) to add it.
  - TOL_WORKPAPER_EXAMPLE(code, road): a small filled-in example for each sheet, worded for
    the road, shown folded away at the top of the sheet.
  - TOL_SCRIPTS: kind ways to say no, and ways to hand a job over.
  - TOL_PILLAR_V: questions about the quiet incentives (which jobs get thanked, and which
    are only noticed when they are missed).

  Plain data. Nothing here is sent or stored.
*/
(function (global) {
  'use strict';

  var D = 'Daily', Wk = 'Weekly', M = 'Monthly', AN = 'As needed', O = 'Ongoing', EM = 'Each meeting';
  function g(name, items, hidden) { return { name: name, hidden: !!hidden, items: items }; }

  /* ------------------------------------------------------------ jobs, by road */

  var HOME = [
    g('Food and the kitchen', [['Plan the week’s meals', Wk], ['Write the grocery list', Wk], ['Grocery shopping', Wk], ['Put the groceries away', Wk], ['Cook dinner', D], ['Make lunches', D], ['Breakfast', D], ['Dishes', D], ['Load or empty the dishwasher', D], ['Wipe the counters', D], ['Clean out the fridge', Wk], ['Notice what’s running low', O]]),
    g('Cleaning and laundry', [['Laundry: wash and dry', Wk], ['Fold and put laundry away', Wk], ['Change the sheets', Wk], ['Clean the bathroom', Wk], ['Vacuum', Wk], ['Mop the floors', Wk], ['Take out the trash and recycling', Wk], ['Tidy the shared rooms', D], ['Dust', M], ['Deep clean (oven, windows)', AN]]),
    g('Money and paperwork', [['Pay the bills', M], ['Keep track of the budget', M], ['Renew car registration', AN], ['Renew insurance', AN], ['Taxes and receipts', AN], ['Sort the mail', Wk], ['Cancel or change subscriptions', AN], ['Keep important papers in one place', O], ['Deal with bank or billing problems', AN], ['Save for bigger costs', M]], true),
    g('Planning and remembering', [['Keep the family calendar', O], ['Remember appointments', O], ['Book the dentist and checkups', AN], ['Plan weekends', Wk], ['Plan trips and vacations', AN], ['Research big purchases', AN], ['Remember what needs replacing', O], ['Make the to-do list', Wk], ['Arrange repairs and wait for them', AN], ['Keep the spare keys and passwords sorted', O], ['Plan for guests', AN], ['Notice when things are running late', O]], true),
    g('Kids and school', [['School forms and permission slips', AN], ['School lunches', D], ['Drop-off and pick-up', D], ['Homework help', D], ['Bedtime', D], ['Bath time', D], ['Kids’ doctor and dentist visits', AN], ['Activities and sign-ups', AN], ['Buy clothes as they outgrow them', AN], ['Arrange babysitting', AN], ['Reply to school emails and apps', Wk], ['Plan playdates', AN]], true),
    g('Health and care', [['Pick up prescriptions', AN], ['Keep the first-aid kit stocked', AN], ['Book appointments', AN], ['Look after someone who is sick', AN], ['Keep track of vaccinations and records', O], ['Arrange care for a relative', AN]], true),
    g('People and occasions', [['Remember birthdays', O], ['Buy and wrap gifts', AN], ['Send cards and thank-you notes', AN], ['Plan holidays and gatherings', AN], ['Keep in touch with family', O], ['RSVP to invitations', AN], ['Check in with a relative who is alone', Wk], ['Emotional check-ins at home', Wk], ['Smooth things over after a hard day', AN]], true),
    g('Home and car', [['Car maintenance', AN], ['Fill the car with gas', Wk], ['Yard and garden', Wk], ['Small repairs', AN], ['Change light bulbs and batteries', AN], ['Replace smoke alarm batteries', AN], ['Home maintenance schedule', M], ['Seasonal clothes swap', AN]]),
    g('Pets and plants', [['Feed the pets', D], ['Walk the dog', D], ['Vet visits', AN], ['Litter box or cage', Wk], ['Water the plants', Wk]])
  ];
  var ROOMMATES = [
    g('Shared spaces', [['Clean the kitchen', Wk], ['Clean the bathroom', Wk], ['Vacuum the living room', Wk], ['Mop the floors', Wk], ['Wipe down the stove and microwave', Wk], ['Clean out the shared fridge', Wk], ['Tidy the entryway', Wk], ['Dust shared rooms', M], ['Clean windows and mirrors', M], ['Deep clean before inspection', AN]]),
    g('Kitchen', [['Dishes', D], ['Empty the dishwasher', D], ['Wipe the counters', D], ['Take out the compost', Wk], ['Buy shared cooking basics (oil, salt)', AN], ['Keep the pantry shelves sorted', M], ['Clean the oven', AN], ['Label and clear old food', Wk]]),
    g('Shared supplies', [['Toilet paper', AN], ['Dish soap and sponges', AN], ['Trash bags', AN], ['Cleaning spray', AN], ['Paper towels', AN], ['Light bulbs', AN], ['Laundry detergent (if shared)', AN], ['Keep the supply list', O]]),
    g('Rent, bills and the landlord', [['Collect and pay rent', M], ['Pay the power bill', M], ['Pay the internet bill', M], ['Split the bills and send reminders', M], ['Track who paid what', M], ['Message the landlord about repairs', AN], ['Be home for repairs or deliveries', AN], ['Renew the lease', AN], ['Keep the lease and receipts', O], ['Set up or change accounts', AN]], true),
    g('House life', [['Take out the trash and recycling', Wk], ['Bring the bins back in', Wk], ['Guests and quiet hours', O], ['Run the house meeting', M], ['Keep the shared calendar', O], ['Welcome a new roommate', AN], ['Sort packages and mail', D], ['Water the shared plants', Wk]]),
    g('Planning and remembering', [['Notice when supplies run low', O], ['Remember bill due dates', O], ['Plan a house dinner', AN], ['Organize a move-out or move-in', AN], ['Keep the Wi-Fi password and house info handy', O], ['Arrange a cleaner or pest control', AN], ['Keep track of shared purchases', O], ['Remember whose turn it is', O]], true),
    g('Outside and the building', [['Shovel snow or clear leaves', AN], ['Mow or water the yard', Wk], ['Recycling day reminders', Wk], ['Laundry room schedule', O], ['Bike and storage area', M], ['Report building problems', AN], ['Parking passes', AN], ['Porch or balcony tidy', M]])
  ];
  var COWORKERS = [
    g('Meetings', [['Book the meeting room', EM], ['Write the agenda', EM], ['Take meeting notes', EM], ['Send the notes out', EM], ['Keep time in meetings', EM], ['Follow up on action items', EM], ['Run the stand-up', D], ['Run the retrospective', M], ['Move or cancel meetings', AN], ['Set up the video call', EM]]),
    g('Follow-through', [['Chase replies from other teams', AN], ['Remind people of deadlines', Wk], ['Update the status report', Wk], ['Keep the task board current', D], ['Close finished tickets', D], ['Answer the shared inbox', D], ['Triage the team chat', D], ['Hand over when someone is out', AN], ['Cover on-call', AN], ['Track open questions', O]], true),
    g('Team care', [['Onboard a new teammate', AN], ['Plan a team lunch or celebration', AN], ['Remember birthdays and work anniversaries', O], ['Organize a leaving card or gift', AN], ['Check in with someone who seems stretched', AN], ['Welcome visitors', AN], ['Keep the kitchen or shared space tidy', Wk], ['Order snacks or supplies', AN], ['Book team travel', AN], ['Collect money for a group gift', AN]], true),
    g('Tools and documents', [['Keep the team wiki up to date', M], ['Write how-to guides', AN], ['Manage shared passwords and access', AN], ['Keep templates current', M], ['Tidy the shared drive', M], ['Release notes', M], ['Keep the team calendar', O], ['Renew licenses and subscriptions', AN], ['Order equipment', AN], ['Set up accounts for new people', AN]]),
    g('Planning', [['Plan the next sprint or cycle', M], ['Estimate work', AN], ['Keep the roadmap current', M], ['Write the weekly summary', Wk], ['Prepare for reviews', AN], ['Budget tracking', M], ['Vacation and cover schedule', O], ['Hiring interviews', AN], ['Risk and dependency list', O], ['Quarterly planning notes', AN]], true),
    g('People and communication', [['Answer questions from other teams', D], ['Mentor a newer teammate', Wk], ['Give feedback on drafts', AN], ['Share wins with leadership', M], ['Smooth over a tense thread', AN], ['Write the team newsletter', M], ['Represent the team in other meetings', AN], ['Keep stakeholders informed', Wk], ['Translate between teams', AN], ['Notice who hasn’t been heard', O]], true)
  ];
  var CAREGIVERS = [
    g('Appointments', [['Book appointments', AN], ['Drive to appointments', AN], ['Go along and take notes', AN], ['Share the notes with the others', AN], ['Keep the appointment calendar', O], ['Arrange transport when no one can drive', AN], ['Reschedule when plans change', AN], ['Prepare questions before a visit', AN], ['Follow up on test results or referrals', AN], ['Keep the list of care contacts', O]]),
    g('Medicines, as the care team directs', [['Pick up prescriptions', Wk], ['Keep the medication list up to date', O], ['Refill the weekly pill box', Wk], ['Order refills before they run out', M], ['Check for new instructions after a visit', AN], ['Keep supplies stocked (bandages, gloves)', AN], ['Store the list somewhere everyone can find it', O], ['Tell the others about any change', AN]]),
    g('Paperwork and money', [['Pay their bills', M], ['Insurance claims and paperwork', AN], ['Keep receipts', O], ['Talk to the bank or benefits office', AN], ['Keep important documents together', O], ['Track shared costs between siblings', M], ['Renew documents and IDs', AN], ['Sort their mail', Wk], ['Deal with phone and internet accounts', AN], ['Plan for bigger costs', AN]], true),
    g('Home help', [['Groceries and meals', Wk], ['Cook or batch-cook', Wk], ['Laundry', Wk], ['Clean their home', Wk], ['Take out their trash', Wk], ['Small repairs', AN], ['Yard and snow', AN], ['Arrange a cleaner or helper', AN], ['Check the fridge for old food', Wk], ['Keep the house safe (rails, lights)', AN]]),
    g('Visits and company', [['Weekly visit', Wk], ['Daily phone call', D], ['Take them out for a walk or coffee', Wk], ['Keep friends and family in touch with them', O], ['Plan birthdays and holidays with them', AN], ['Bring the grandchildren to visit', AN], ['Keep their hobbies going', Wk], ['Cover when the main visitor is away', AN]]),
    g('Coordination between carers', [['Overnight calls', AN], ['Be the first contact for the care team', O], ['Update the group chat', Wk], ['Plan who covers which week', M], ['Hand over between visits', AN], ['Notice when a carer needs a break', O], ['Arrange respite or extra help', AN], ['Keep the shared notes', O], ['Organize the sibling meeting', M], ['Research options for more support', AN]], true),
    g('Their wishes and plans', [['Keep their contact list current', O], ['Write down their routines and preferences', AN], ['Plan for the next stage of care', AN], ['Keep spare keys with the right people', O], ['Remember the small things they like', O], ['Check in on how they are feeling about the care', Wk]], true)
  ];
  var COPARENTS = [
    g('School', [['School forms and permission slips', AN], ['School lunches', D], ['Drop-off', D], ['Pick-up', D], ['Homework help', D], ['Parent-teacher conferences', AN], ['Read school emails and the app', Wk], ['Buy school supplies', AN], ['Picture day and field trips', AN], ['Library books back', Wk], ['Class gifts and collections', AN], ['Track the school calendar', O], ['Report cards and follow-up', AN], ['Sign up for the next school year', AN]], true),
    g('Health', [['Doctor visits', AN], ['Dentist visits', AN], ['Keep vaccination records', O], ['Pick up prescriptions', AN], ['Stay home when they are sick', AN], ['Eye checks and glasses', AN], ['Keep health insurance cards current', O], ['Share health updates between homes', AN]]),
    g('Activities', [['Sign up for activities', AN], ['Pay activity fees', AN], ['Drive to practice', Wk], ['Buy gear and uniforms', AN], ['Wash the uniform', Wk], ['Games and recitals', AN], ['Coordinate carpools', Wk], ['Summer camp research and sign-up', AN], ['Birthday party invitations and RSVPs', AN], ['Playdates', AN]]),
    g('Handoffs between homes', [['Pack the bag for the other home', Wk], ['Send the medicine and chargers along', Wk], ['Share the week’s news before handoff', Wk], ['Handoff pickup and drop-off', Wk], ['Swap weekends when plans change', AN], ['Keep the shared calendar', O], ['Holiday schedule', AN], ['Tell the other home about school changes', AN], ['Return borrowed clothes and toys', Wk], ['Keep the parenting plan handy', O]], true),
    g('Money and paperwork', [['Track shared expenses', M], ['Send reimbursements', M], ['Keep receipts for kid costs', O], ['Update emergency contacts', AN], ['Passport and ID renewals', AN], ['Childcare payments', M], ['Savings for school costs', M], ['Forms that need both signatures', AN]], true),
    g('Occasions and growing up', [['Birthday gifts from each home', AN], ['Plan their birthday party', AN], ['Holiday gifts', AN], ['Buy clothes as they outgrow them', AN], ['Haircuts', AN], ['Thank-you notes', AN], ['Keep photos and school work', O], ['Remember teachers’ and coaches’ names', O]], true),
    g('Each home, day to day', [['Bedtime routine', D], ['Meals', D], ['Screen-time rules', O], ['Chores for the kids', Wk], ['Laundry for the kids', Wk], ['Keep their room tidy with them', Wk]])
  ];
  var FRIENDS = [
    g('Planning get-togethers', [['Suggest a date', AN], ['Pick the place', AN], ['Book the table or tickets', AN], ['Send the reminders', AN], ['Keep the group chat moving', O], ['Rearrange when plans change', AN], ['Plan the trip', AN], ['Split the costs and collect money', AN], ['Plan the birthday night', AN], ['Keep a list of places to try', O]], true),
    g('Staying in touch', [['Send the first message', AN], ['Call on a hard day', AN], ['Remember what’s going on in their life', O], ['Follow up after big news', AN], ['Check in after a quiet spell', AN], ['Share photos and memories', AN], ['Keep in touch across distance', O], ['Remember their partner’s and kids’ names', O], ['Reply to voice notes', AN], ['Make the call when it’s been too long', AN]], true),
    g('Occasions', [['Remember birthdays', O], ['Buy a gift', AN], ['Send a card', AN], ['Organize a group gift', AN], ['Plan a celebration', AN], ['Show up for the big days', AN], ['Bring something when a baby arrives', AN], ['Send flowers or a note when things are hard', AN]], true),
    g('Helping out', [['Help with a move', AN], ['Give a ride', AN], ['Pet or plant sit', AN], ['Lend and remember to return things', AN], ['Bring a meal', AN], ['Help with a project', AN], ['Be the emergency contact', O], ['Listen when they need to talk', AN]]),
    g('Hosting', [['Host dinner', AN], ['Cook for the group', AN], ['Clean up after', AN], ['Bring drinks or snacks', AN], ['Host game night', AN], ['Keep the guest list', AN], ['Make sure everyone feels welcome', AN], ['Drive people home', AN]]),
    g('Little things', [['Save them a seat', AN], ['Remember how they take their coffee', O], ['Send the article they’d like', AN], ['Check they got home safe', AN], ['Return the thing you borrowed', AN], ['Bring back a small souvenir', AN], ['Text on the anniversary of a hard day', AN], ['Say what you like about them, out loud', AN]], true),
    g('Group life', [['Remember who owes who', AN], ['Keep the shared photo album', O], ['Include someone new', AN], ['Notice who hasn’t come in a while', O], ['Smooth over a group disagreement', AN], ['Keep traditions going', O], ['Book the yearly trip', AN], ['Remind everyone of the plan', AN]], true)
  ];
  var BY_ROAD = { partners: HOME, family: HOME, program: HOME, coparents: COPARENTS, roommates: ROOMMATES, coworkers: COWORKERS, caregivers: CAREGIVERS, friends: FRIENDS };

  function taskLibrary(road, kind) {
    var groups = BY_ROAD[road] || HOME;
    if (road === 'self') return null;
    var count = groups.reduce(function (a, x) { return a + x.items.length; }, 0);
    return {
      groups: groups, count: count,
      intro: kind === 'owner'
        ? 'Tap a job to add it to the list, then give it one Responsible and one Accountable name. The groups marked "often unseen" are the planning, remembering and paperwork that rarely get counted.'
        : 'Tap a job to add it as a row, then fill in who did it and rough minutes. The groups marked "often unseen" are the planning, remembering and paperwork that rarely get logged.'
    };
  }

  /* ------------------------------------------------------------ scripts */

  var SCRIPTS = {
    no: [
      ['Capacity check', 'That’s a fair ask, and I can see why it matters. I’m at capacity this week. Could it wait until Monday?'],
      ['Capacity check', 'I want to say yes, and I’d do it badly right now. Can I give you a proper answer tomorrow?'],
      ['Capacity check', 'Thanks for thinking of me. My plate is full through Friday. I could help for an hour on Saturday.'],
      ['Delegation pivot', 'That makes sense to do. I can’t take it on, but Jordan knows this one well. Want me to ask them?'],
      ['Delegation pivot', 'I’m not the right person this time. Could we put it on the list for the next house meeting?'],
      ['Delegation pivot', 'I can’t own this one, and I can show whoever does how I usually handle it.'],
      ['Time commitment', 'I can’t make this week. I’d love to next week; does Thursday work?'],
      ['Time commitment', 'I can do the first half, not the whole thing. Would that help?'],
      ['Time commitment', 'I can’t commit to every week, and I can do the first Monday of each month.'],
      ['Capacity check', 'Not today. That isn’t a no to you; it’s a yes to the rest I need.'],
      ['Time commitment', 'Could we move it to a time when I can give it my full attention? Tuesday evening works.'],
      ['Delegation pivot', 'I’ve been doing this one a while. Could someone else take it for the next month?']
    ],
    handover: [
      'I’ve been doing the dishes most nights. Could you own weeknights, including noticing when they need doing?',
      'Could you take the whole of the school forms, from reading the email to sending it back? I’ll stay out of it.',
      'I’d like to hand over the grocery list. Here’s what I usually check; it’s yours from Monday.',
      'This one has quietly become mine. Could we swap it for one of yours for a month and see how it feels?',
      'You’d be better at this than me. Would you like it, with me as the one who notices if it slips?',
      'Could we write down who owns the bills from now on, so neither of us has to remember to remember?',
      'Can I give you the whole job, not just the doing? That means deciding when, too.',
      'Would you take the vet visits? I’ll send you the dates I have, and after that they’re yours.'
    ]
  };

  /* ------------------------------------------------------------ Pillar V: quiet incentives */

  var PILLAR_V = [
    'Which jobs get a thank-you, and which ones are only noticed on the day they don’t happen?',
    'Which job has quietly drifted to one person because they notice it first?',
    'What would we miss most if it stopped being done tomorrow?',
    'Is there a job someone does well that nobody has ever said out loud?',
    'Which default decides who does what here (who is home, who is faster, who minds more)? Did anyone choose it?',
    'Which small thanks would cost nothing and mean a lot this week?'
  ];

  /* ------------------------------------------------------------ filled-in examples */

  function roadWords(road) {
    return {
      partners: ['Alex', 'Jordan'], family: ['Dana', 'Chris', 'Nana'], coparents: ['Mom', 'Dad'], roommates: ['Ana', 'Ben', 'Cal'],
      coworkers: ['Sam', 'Priya', 'Lee'], caregivers: ['Maya', 'Leo', 'Priya'], friends: ['You', 'Kim'], program: ['Alex', 'Jordan'], self: ['You']
    }[road] || ['Alex', 'Jordan'];
  }
  var EX01 = {
    partners: [['Mon', 'Plan the week’s meals', 0, '20', 'Noticed and handled'], ['Mon', 'Cook dinner', 1, '45', 'Asked for'], ['Tue', 'School forms', 0, '15', 'Noticed and handled'], ['Tue', 'Dishes', 1, '20', 'Asked for'], ['Wed', 'Laundry', 0, '60', 'Asked for'], ['Thu', 'Book the dentist', 0, '10', 'Noticed and handled']],
    family: [['Mon', 'Plan the week’s meals', 0, '20', 'Noticed and handled'], ['Mon', 'Cook dinner', 2, '60', 'Asked for'], ['Tue', 'Drive to practice', 1, '40', 'Asked for'], ['Wed', 'Remember Grandpa’s birthday gift', 0, '25', 'Noticed and handled'], ['Thu', 'Laundry', 1, '60', 'Asked for']],
    coparents: [['Mon', 'School forms', 0, '15', 'Noticed and handled'], ['Tue', 'Drive to practice', 1, '45', 'Asked for'], ['Wed', 'Pack the bag for the other home', 0, '20', 'Noticed and handled'], ['Fri', 'Handoff drop-off', 1, '30', 'Asked for']],
    roommates: [['Mon', 'Clean the kitchen', 0, '45', 'Asked for'], ['Tue', 'Take out the trash and recycling', 2, '10', 'Asked for'], ['Wed', 'Buy toilet paper and soap', 0, '20', 'Noticed and handled'], ['Thu', 'Message the landlord about the sink', 1, '15', 'Noticed and handled'], ['Sat', 'Clean the bathroom', 1, '40', 'Asked for']],
    coworkers: [['Mon', 'Take meeting notes', 0, '30', 'Asked for'], ['Mon', 'Send the notes out', 0, '10', 'Noticed and handled'], ['Tue', 'Chase replies from other teams', 1, '25', 'Noticed and handled'], ['Wed', 'Update the status report', 2, '40', 'Asked for'], ['Thu', 'Onboard a new teammate', 1, '60', 'Asked for']],
    caregivers: [['Mon', 'Drive Dad to the clinic', 0, '120', 'Asked for'], ['Mon', 'Share the notes with the others', 0, '15', 'Noticed and handled'], ['Tue', 'Pick up prescriptions', 1, '30', 'Asked for'], ['Wed', 'Weekly visit', 2, '90', 'Asked for'], ['Thu', 'Insurance paperwork', 0, '45', 'Noticed and handled']],
    friends: [['Mon', 'Suggest a date for dinner', 0, '10', 'Noticed and handled'], ['Tue', 'Book the table', 0, '10', 'Noticed and handled'], ['Thu', 'Drive people home', 1, '30', 'Asked for']]
  };
  var EX03 = {
    partners: [['Groceries', 'Weekly', 0, 1], ['Cooking', 'Daily', 1, 1], ['Bills', 'Monthly', 0, 0], ['School forms', 'As needed', 1, 0], ['Family calendar', 'Ongoing', 0, 1]],
    family: [['Meals', 'Daily', 2, 0], ['Rides and school runs', 'Daily', 1, 1], ['Birthday planning', 'As needed', 0, 2], ['Laundry', 'Weekly', 1, 0]],
    coparents: [['School forms', 'As needed', 0, 0], ['Dentist visits', 'As needed', 1, 1], ['Pack the bag for handoff', 'Weekly', 0, 1], ['Activity fees', 'As needed', 1, 0]],
    roommates: [['Rent: collecting and paying', 'Monthly', 1, 1], ['Cleaning: kitchen', 'Weekly', 0, 2], ['Shared supplies', 'As needed', 2, 0], ['Trash and recycling', 'Weekly', 2, 1]],
    coworkers: [['Meeting notes', 'Each meeting', 0, 1], ['Follow-ups after meetings', 'Each meeting', 1, 1], ['Status report', 'Weekly', 2, 0], ['Onboarding a new teammate', 'As needed', 1, 2]],
    caregivers: [['Appointments: booking and notes', 'As needed', 0, 1], ['Pharmacy pickups', 'Weekly', 1, 1], ['Insurance paperwork', 'Monthly', 0, 2], ['Weekly visit', 'Weekly', 2, 0]]
  };
  function example(code, road) {
    road = road || 'partners';
    var P = roadWords(road), two = P.length > 1;
    function who(i) { return P[i % P.length]; }
    if (code === 'WP-01') {
      if (road === 'self') return { intro: 'Three kind no’s someone wrote ahead of time. Borrow any of them.', parts: [{ title: 'Kind ways to say no', head: ['Type', 'What you could say'], rows: SCRIPTS.no.slice(0, 6) }], note: 'Each one says why the request is fair, what you have left, and what you can offer instead.' };
      var rows = (EX01[road] || EX01.partners).map(function (r) { return [r[0], r[1], who(r[2]), r[3], r[4]]; });
      return { intro: 'A few rows from an ordinary week, logged before anyone decided what they meant. Notice the planning and remembering rows: short in minutes, easy to miss.',
        parts: [{ title: 'Part A: who did what', head: ['Day', 'Task', 'Who', 'Minutes', 'Asked or noticed'], rows: rows }, { title: 'Part B: kind no’s to borrow', lines: SCRIPTS.no.slice(0, 4).map(function (s) { return s[0] + ': “' + s[1] + '”'; }) }],
        note: 'The totals then show each person’s share, how much was noticed without being asked, and the busiest person.' };
    }
    if (code === 'WP-02') return { intro: 'One person’s check, about themselves, on a busy Tuesday.', parts: [{ head: ['What fills it', 'Score (0 to 4)'], rows: [['Sleep debt', '3'], ['Workload elsewhere', '3'], ['Unresolved conflict', '1'], ['Physical state', '1'], ['Time pressure today', '2']] }, { lines: ['Added up: 10. Divided by 20: 0.50, a medium load, on the heavier side.', 'What it means: say it out loud before a hard talk. “Heads up, I’m carrying more than usual today.”'] }], note: 'Higher means more load. Everyone fills in their own; nobody scores someone else.' };
    if (code === 'WP-03') {
      if (road === 'self' || road === 'friends') return null;
      var r3 = (EX03[road] || EX03.partners).map(function (r) { return [r[0], r[1], who(r[2]), who(r[3])]; });
      return { intro: 'Part of a list where every job has one name for doing it and one for noticing if it didn’t happen.', parts: [{ head: ['Job', 'How often', 'Responsible', 'Accountable'], rows: r3 }, { title: 'Ways to hand a job over', lines: SCRIPTS.handover.slice(0, 4) }], note: 'Watch the spread, not only the names: if one person holds most of the list, the sheet says so.' };
    }
    if (code === 'WP-04') return { intro: 'A month where one thing kept coming back.', parts: [{ head: ['Task', 'Weeks it slipped', 'Kind of gap', 'Action'], rows: [['Trash out on time', '1, 2, 3', 'Structural gap', 'One owner, with a Sunday reminder'], ['Birthday card for Grandma', '2', 'One-off', 'None'], ['Grocery list', '1, 3', 'Capacity issue', 'Talk on Sunday about what comes off the list']] }, { title: 'Pillar V: thanked, or only noticed when missed?', lines: PILLAR_V.slice(0, 3) }], note: 'A job with no owner is a gap in the setup, not a verdict on the person who kept covering it.' };
    if (code === 'WP-09') return { intro: 'Worked examples: the raw reaction, then the same thing as fact, feeling and ask.',
      parts: [{ title: 'Example 1', lines: ['Raw: “You NEVER take the trash out.”', 'Fact: The trash went out late on Tuesday and Thursday.', 'Feeling: I felt tired and a bit alone with it.', 'Ask: Could you own trash night from now on?'] },
        { title: 'Example 2', lines: ['Raw: “Great, another meeting nobody took notes in.”', 'Fact: Nobody had the notes from Monday’s meeting.', 'Feeling: I felt rushed trying to remember what we agreed.', 'Ask: Could we pick a note-taker at the start of each meeting?'] },
        { title: 'Example 3', lines: ['Raw: “Forget it, I’ll do it myself.”', 'Fact: The forms were due Friday and they weren’t done Thursday night.', 'Feeling: I felt worried we’d miss it.', 'Ask: Could one of us own school forms, start to finish?'] }],
      note: 'One event, no “always” or “never”, and an ask the other person can say yes to.' };
    if (code === 'WP-11') return { intro: two ? 'One person’s kit, filled in on a calm Sunday. Everyone makes their own.' : 'A kit filled in on a calm Sunday.',
      parts: [{ head: ['What tends to start it', 'Where I feel it first'], rows: [['Being interrupted mid-task', 'Jaw'], ['Plans changed last minute', 'Shoulders']] }, { lines: ['First default: Walking it out. Second: Breathing 4 in, 6 out.', 'Pause line: “I’m at capacity. I need ten minutes. I’ll be back at quarter past.”', 'Coming back: load 0.65 before, 0.45 after, so under 0.50: go back in, starting with one small task.'] }] };
    if (code === 'WP-13') return { intro: 'Two days of a 90-second check-in. One sentence each, no debating.', parts: [{ head: ['Day', 'Who', 'Load', 'Appreciated', 'Small friction', 'Would help tomorrow'], rows: [['Mon', who(0), 'High', 'Thanks for making dinner', 'Dishes left out', 'Quiet morning'], ['Mon', who(1), 'Low', 'You fixed the printer', '', ''], ['Tue', who(0), 'Medium', 'The note you left', '', 'Early night']] }], note: 'Anything bigger than one sentence waits for the weekly catch-up.' };
    return null;
  }

  global.TOL_TASK_LIBRARY = taskLibrary;
  global.TOL_WORKPAPER_EXAMPLE = example;
  global.TOL_SCRIPTS = SCRIPTS;
  global.TOL_PILLAR_V = PILLAR_V;
})(typeof window !== 'undefined' ? window : globalThis);
