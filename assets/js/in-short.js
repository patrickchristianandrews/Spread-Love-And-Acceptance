/* in-short.js — "In short": three plain bullets at the top of the long pages (the Full versions
   and the Professor's Library), and a "Show me only the steps" switch on long pages.
   site.js loads this on those pages. Nothing is kept or sent. */
(function () {
  'use strict';
  if (window.TOLInShort) return;
  var S = {
    '/about.html': ['Christian spent fifteen years untangling complicated systems as an auditor.', 'The same habits, seeing the whole picture and blaming the setup instead of a person, became The Objective Ledger.', 'Nine fields each shaped one of the tools, and all of them are free while the program is built.'],
    '/book/preface-in-depth.html': ['Every shared life has work nobody sees: noticing, remembering, planning, smoothing over.', 'Writing it down is not keeping score. It puts both sides on one page so it can be shared and thanked.', 'The book borrows plain words from accounting and radio because they describe setups, not faults.'],
    '/book/chapter-1-in-depth.html': ['Two kind people can clash because their pace, tone and urgency are out of step, not because either is wrong.', 'Being nearly in step is the noisy part, and stress pushes each person further off.', 'Retuning is simple: notice the static, slow down, say it again softly, and agree a better time.'],
    '/book/chapter-2-in-depth.html': ['A short check of whether the way you share the work can keep going. It looks at the setup, never at a person.', 'It uses three things: how evenly the hours are split, whether every job has one owner, and how tired you both are.', 'It is a guide for talking, not a test: a low reading means “adjust the setup,” not “someone failed.”'],
    '/book/chapter-3-in-depth.html': ['Some of a reaction is leftover stress from the day, and some is about this moment.', 'A quick load score (WP-02) helps you tell the two apart before you respond.', 'The seven angles show how two people can both be right about the same moment.'],
    '/book/chapter-4-in-depth.html': ['There are two kinds of fair: judging by results, and judging by promises kept.', 'Agree which kind your home uses, and look to the job’s owner when something slips.', 'Give a comment a moment to land before you react to it.'],
    '/book/chapter-5-in-depth.html': ['Once a month, look back together at what kept coming up.', 'Sort each repeat: a gap in the setup, a busy stretch, or a one-off.', 'Fix the arrangement, never the person, and keep a simple count for next month.'],
    '/check-ins-in-depth.html': ['Pick a calm time and place first. The setting matters before the topic does.', 'Listen and say back what you heard before you answer. Then answer without erasing it.', 'Look for a plan that works for both of you, and end on something good.'],
    '/contents-in-depth.html': ['Everything here comes in three parts: tools for yourself, tools for any two people, and where to start in each relationship.', 'A full directory of every page is at the bottom.', 'Not sure where to begin? Start here, or Start in 10 minutes.'],
    '/five-pillars-in-depth.html': ['Five ideas sit under everything: see the whole load, fix the setup, read your state first, tune how you send and receive, notice the quiet incentives.', 'Each one is borrowed from a field that describes how things work without blaming anyone.', 'They work as a loop, and each starts inside you before it shows up between you and others.'],
    '/frequency-framework-in-depth.html': ['Every relationship runs on a few rhythms: money, rest, decisions, talking and values.', 'When two rhythms drift apart, the gap makes friction, like two radios slightly out of tune.', 'Small, regular check-ins bring the rhythms back into step.'],
    '/growing-up.html': ['Growing up, each stage asks a big question (Am I safe? Am I capable? Where do I belong?), and our answers can become understandings we keep using as adults.', 'Some of those understandings were right for the child and are out of date now; they can color how we read ourselves and the people we love.', 'A quick lens check, or writing down the rulebook from home, helps you keep what still fits and soften what doesn’t. You can stop any time.'],
    '/growing-up-in-depth.html': ['Each stage of growing up asks a big question, and the answers can become understandings many adults keep using.', 'When something happened, how often, and whether anyone helped you make sense of it can change how deep it goes. Deeper isn’t permanent.', 'Writing down the rulebook from home, then asking “Do I still want this rule?”, helps you choose your own.'],
    '/how-it-works-in-depth.html': ['The program gives you an outside, objective look at your situation and your wiring.', 'The technical layer is optional; the plain versions teach the same ideas.', 'Most clashes come from static between people, not from a bad person.'],
    '/is-this-for-you-in-depth.html': ['It’s a free, kind self-help program for understanding yourself and sharing a life fairly.', 'It isn’t therapy, and it never judges or scores a person.', 'Everything is free with an email while it’s being built, and what you type stays on your device.'],
    '/know-yourself-in-depth.html': ['A reaction has three layers: lasting wiring, patterns life taught you, and today’s conditions.', 'Work on it, work with it, or work around it, depending on which layer it comes from.', 'Explaining your layers kindly helps others understand you, and helps you understand them.'],
    '/learn/index-in-depth.html': ['Twelve short stories from philosophy, retold in plain language.', 'They cover knowing yourself, seeing the other person, living together and keeping a fair ledger.', 'Each one links to the chapter, workpaper or tool it connects to.'],
    '/library.html': ['233 short, plain-language entries on relationships, conflict, kindness, feelings, stress, calm and wiring.', 'Each entry says honestly how strong the evidence is.', 'Every theme ties back to the Five Pillars and to the tools that use it.'],
    '/library/calm.html': ['Slow breathing, a longer breath out and grounding can help your body settle.', 'Nature, music, breaks and less phone time can restore attention.', 'The claims are kept modest: these help many people, not everyone, and none is a treatment.'],
    '/library/communication.html': ['Listening well and saying back what you heard help people feel understood.', '“I” sentences and validation lower the heat without giving up your point.', 'Good questions and clear texts prevent many misunderstandings.'],
    '/library/conflict.html': ['Conflict is normal. What makes it harmful is how it’s handled.', 'Look for the interests under each position, and start softly.', 'Repair, a real apology and a fair process can bring people back together.'],
    '/library/connection.html': ['Small, specific thanks and celebrating good news keep people close.', 'Self-compassion and friendship protect against loneliness.', 'Little daily rituals matter more than big gestures.'],
    '/library/emotions.html': ['Emotions are signals; naming them precisely can take some heat out of them.', 'Rethinking a situation tends to work better than pushing a feeling down.', 'Anger, shame, grief and worry each have their own patterns, and there are kind ways through them.'],
    '/library/fairness.html': ['Much of the work of a home is thinking work: noticing, planning, deciding and checking.', 'That work is easy to miss, so each person often thinks they do more.', 'Writing the whole load down makes a fair split possible.'],
    '/library/life.html': ['Families work as systems, and patterns get passed down.', 'Big changes, like a baby, a move, money or caring for parents, shift the whole load.', 'Planning together for a change beats waiting for it to cause friction.'],
    '/library/motivation.html': ['People keep going when they feel free, able and connected.', 'Small if-then plans and easy cues help habits form.', 'Be wary of big claims: some popular ideas, like growth mindset, have mixed evidence.'],
    '/library/relationships.html': ['Small moments, like answering bids for attention, build closeness over time.', 'Criticism, contempt, defensiveness and stonewalling hurt; each has a kinder alternative.', 'Most couples have lasting disagreements. Talking about them calmly matters more than solving them.'],
    '/library/stress.html': ['Stress is the body getting ready for a challenge; carrying it for a long time wears you down.', 'Hunger, tiredness and loneliness make everything feel bigger.', 'Some popular ideas about the nervous system are debated, and this page says so.'],
    '/library/teams.html': ['Shared jobs slip when nobody clearly owns them.', 'One owner per job, checklists and blameless reviews keep things from falling through the cracks.', 'People speak up more when it feels safe to make mistakes.'],
    '/library/thinking.html': ['Our minds take shortcuts that make us assume the worst about others.', 'We tend to blame people for their mistakes and circumstances for our own.', 'Naming a thinking trap is often enough to loosen it.'],
    '/library/wiring.html': ['Brains are wired in different ways, and none is broken.', 'Misunderstandings often run both ways between differently wired people.', 'Knowing someone’s wiring helps you choose words that land.'],
    '/prog-01-in-depth.html': ['Six weeks, one worksheet a week, in order.', 'You start by seeing the load, then give every job an owner, then look at your batteries and how you talk.', 'Week six is a before-and-after look at what changed.'],
    '/program-overview-in-depth.html': ['Each chapter of the book pairs with a worksheet that puts it to use.', 'The signal tools help with how words are sent and heard.', 'The page says plainly what is built today and what is still planned.'],
    '/relationships-in-depth.html': ['Every chapter, worksheet and tool works for any two people, not just couples.', 'Each kind of relationship has a suggested place to start.', 'Start with yourself, then bring in the other person when you’re both ready.'],
    '/suite-index-in-depth.html': ['An honest list of what’s live in the program today.', 'The workpapers work best in the order listed.', 'If something isn’t on this list, it isn’t built yet.'],
    '/turning-toward-in-depth.html': ['Connection is built in small moments: noticing bids and answering them.', 'Specific thanks, celebrating good news and small rituals keep people close.', 'It works in every kind of relationship, and can be adjusted for different wiring.'],
    '/ways-in-in-depth.html': ['Some pages are open to everyone with no sign-up.', 'Everything opens free with an email address while the program is being built.', 'Paid membership comes later, and the page says what each level shares.'],
    '/wired-differently-in-depth.html': ['People wired differently can hear the same sentence in very different ways.', 'Misunderstanding runs in both directions; nobody is the broken one.', 'Clear, kind, direct words, and asking how someone likes to receive them, help everyone.'],
    '/wp-11-in-depth.html': ['Make your calm-down plan before you need it.', 'In the moment, settle your body first, then talk. Name a time to come back.', 'Coming back to the talk is part of the plan, not an afterthought.']
  };
  var main = document.querySelector('main'); if (!main) return;
  var path = location.pathname;
  var words = (main.textContent || '').split(/\s+/).length;

  function esc(t) { return String(t).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  function after() {
    // under the title, the Listen button and the simple/full chooser, before the reading starts
    var picks = main.querySelectorAll(':scope > .read-head, :scope > .tol-listen, :scope > .depth-bar, :scope > .tol-depth, :scope > .tol-private, :scope > .tol-offer, :scope > .tol-pillars, :scope > .lp-trail');
    return picks.length ? picks[picks.length - 1] : null;
  }
  function place(node) { var a = after(); if (a) a.after(node); else main.insertBefore(node, main.firstChild); }

  if (S[path]) {
    var box = document.createElement('aside');
    box.className = 'tol-inshort no-cheer'; box.setAttribute('aria-label', 'In short');
    box.innerHTML = '<p class="tol-inshort-h"><span aria-hidden="true">&#128204;</span> In short</p><ul>' + S[path].map(function (b) { return '<li>' + esc(b) + '</li>'; }).join('') + '</ul>';
    place(box);
  }

  // "Show me only the steps": on long pages, hide everything but the headings, lists of steps and "try this" boxes
  var steps = main.querySelectorAll('ol li, .try-this, .ten-steps, .steps, [class*="step"]:not(.tol-dive-step):not(.step-n)');
  if (words > 1200 && main.querySelectorAll('ol > li').length >= 3) {
    var t = document.createElement('p');
    t.className = 'tol-steps-toggle no-bubble no-cheer';
    t.innerHTML = '<button type="button" aria-pressed="false">Show me only the steps</button><span class="tol-steps-note" aria-live="polite"></span>';
    var btn = t.querySelector('button');
    btn.addEventListener('click', function () {
      var on = btn.getAttribute('aria-pressed') !== 'true';
      btn.setAttribute('aria-pressed', String(on));
      btn.textContent = on ? 'Show the whole page' : 'Show me only the steps';
      document.documentElement.classList.toggle('tol-only-steps', on);
      t.querySelector('.tol-steps-note').textContent = on ? ' Showing the headings and the numbered steps.' : '';
    });
    var ins = main.querySelector('.tol-inshort'); if (ins) ins.after(t); else place(t);
  }
  window.TOLInShort = { has: !!S[path], steps: steps.length };
})();
