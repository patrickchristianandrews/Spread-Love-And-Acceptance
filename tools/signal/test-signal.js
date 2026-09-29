/* Tests for assets/js/signal-engine.js.  Run: node tools/signal/test-signal.js
   Each fixture: the phrase, features that must be found, features that must NOT be found,
   words the rewrite must keep (the ask), and words the rewrite must no longer contain. */
'use strict';
const path = require('path');
const E = require(path.join(__dirname, '../../assets/js/signal-engine.js'));

const FIX = [
  // pressure and commands
  {t:"You need to clean your room.", has:["oblig"], keep:["clean your room"], gone:["need to"]},
  {t:"You need to call me back.", has:["oblig"], keep:["call me back"], gone:["need to"]},
  {t:"You have to be on time tomorrow.", has:["oblig","when"], keep:["be on time tomorrow"], gone:["have to"]},
  {t:"You must pay the rent by Friday.", has:["oblig","when"], keep:["pay the rent by Friday"], gone:["must"]},
  {t:"You're supposed to text when you're late.", has:["oblig"], keep:["text when you're late"], gone:["supposed to"]},
  {t:"I need you to call the dentist, pay the bill and pick up the kids.", has:["oblig","multi"], keep:["Call the dentist","Pay the bill","Pick up the kids"], gone:["need you to"]},
  {t:"You should apologize to her.", has:["should"], keep:["apologize to her"], gone:["you should"]},
  {t:"You should have told me.", has:["shouldhave"], keep:["tell me"], gone:["should have"]},
  {t:"Take out the trash.", has:["impera"], keep:["take out the trash"]},
  {t:"Put your phone down.", has:["impera"], keep:["put your phone down"]},
  {t:"Don't leave your shoes in the hall.", has:["impera"], keep:["leave your shoes in the hall"], gone:["don't"]},
  {t:"Can you not leave dishes in the sink?", has:["cannot"], keep:["leave dishes in the sink"], gone:["can you not"]},
  // questions that carry a complaint
  {t:"Why don't you ever help?", has:["blameq"], keep:["help"], gone:["why don't you"]},
  {t:"Why didn't you tell me?", has:["blameq"], keep:["tell me"], gone:["why didn't you"]},
  {t:"Why can't you just be normal?", has:["blameq","minim"], gone:["why can't you","just","normal"]},
  {t:"How many times do I have to tell you to lock the door?", has:["blameq"], keep:["lock the door"], gone:["how many times"]},
  // absolutes, labels, blame
  {t:"You always forget.", has:["absolute"], gone:["always"]},
  {t:"You never listen to me.", has:["absolute"], keep:["listen to me"], gone:["never"]},
  {t:"You're so lazy.", has:["label"], gone:["lazy"]},
  {t:"You're being selfish.", has:["label"], gone:["selfish"]},
  {t:"You made me feel stupid.", has:["madefeel"], keep:["I felt stupid"], gone:["made me"]},
  {t:"Your sister would never do that.", has:["compare"], gone:["sister","never"]},
  {t:"Last time you did this too.", has:["past"], gone:["last time"]},
  {t:"If you don't clean up, I'm leaving.", has:["threat"], keep:["Could you clean"], gone:["leaving","if you don't"]},
  {t:"After everything I do for you, you can't even do this.", has:["guilt","again"], gone:["after everything","even"]},
  {t:"Mistakes were made with the budget.", has:["passive"], keep:["budget"], gone:["mistakes were made"]},
  // small words
  {t:"It's simple, just call them.", has:["minim"], keep:["call them"], gone:["just","simple"]},
  {t:"Obviously you didn't read it.", has:["minim"], keep:["read it"], gone:["obviously"]},
  {t:"You're late again.", has:["again"], gone:["again"]},
  {t:"You still haven't fixed the door.", has:["again"], keep:["fix the door"], gone:["still"]},
  {t:"No offense, but your cooking is bland.", has:["disclaim"], keep:["cooking"], gone:["no offense"]},
  {t:"I'm just saying, you could try harder.", has:["disclaim","vstd"], gone:["just saying","try harder"]},
  // openers, hints, time
  {t:"We need to talk.", has:["ominous"], keep:["talk about [the topic]"], gone:["need to"]},
  {t:"Can we talk?", has:["ominous"], keep:["[the topic]"]},
  {t:"I need this done now.", has:["urgent"], keep:["get this done"], gone:["now"]},
  {t:"Send it ASAP!!!", has:["urgent","shout","impera"], keep:["send it"], gone:["ASAP","!!"]},
  {t:"It would be nice if the dishes got done.", has:["hint"], keep:["do the dishes"]},
  {t:"Can you clean up a bit when you get a chance?", has:["vstd","vtime"], gone:["when you get a chance","a bit"]},
  {t:"Seriously?? You forgot AGAIN?", has:["blameq","again","shout"], gone:["AGAIN","??","seriously"]},
  // one-word replies
  {t:"Whatever.", has:["minimal"], gone:["whatever"]},
  {t:"Fine.", has:["minimal"]},
  // worth keeping, and things that must NOT be flagged
  {t:"I felt hurt when you missed dinner. Could you text me by 6 if you'll be late?", has:["istate","feeling","clearask","when"], not:["critic","oblig","nowhen"], unchanged:true},
  {t:"Thank you for cooking. Could you also wash the pan tonight?", has:["appreciation","clearask","when"], not:["impera"], unchanged:true},
  {t:"I need a hand. Would you be up for folding laundry after dinner?", has:["istate","clearask","when"], not:["oblig"], unchanged:true},
  {t:"I can't talk about this right now. I need an hour.", has:["istate","when"], not:["urgent"], unchanged:true, gone:["[a time]"]},
  {t:"You must be exhausted.", not:["oblig"], unchanged:true},
  {t:"I'll always love you.", not:["absolute"], unchanged:true},
  {t:"Thanks again for driving!", not:["again"], unchanged:true},
  {t:"Take care of yourself.", not:["impera"], unchanged:true},
  {t:"Let's get pizza tonight.", not:["impera"], unchanged:true},
  {t:"If you can't make it, I'll pick up the kids.", not:["threat"], unchanged:true},
  {t:"Can we talk about the trip on Sunday?", not:["ominous"], unchanged:true},
  {t:"Never mind, it's okay.", not:["absolute"], unchanged:true}
];

let pass=0, fail=0; const errs=[];
const ok=(c,m)=>{ if(c) pass++; else { fail++; errs.push(m); } };
const WIRINGS = [[], ["autistic"], ["adhd"], ["anxiety"], ["nt"]];

FIX.forEach(fx=>{
  const an = E.analyze(fx.t, {channel:"person"});
  (fx.has||[]).forEach(id=>ok(!!an.found[id], `"${fx.t}": expected feature ${id}; got ${Object.keys(an.found).join(",")}`));
  (fx.not||[]).forEach(id=>ok(!an.found[id], `"${fx.t}": did not expect ${id}`));
  WIRINGS.forEach(W=>{
    const rw = E.rewrite(an, {wirings:W});
    const all = [rw.main].concat(rw.variants.map(v=>v.text));
    const low = s=>s.toLowerCase();
    ok(rw.main && rw.main.trim().length>0, `"${fx.t}" [${W}]: empty rewrite`);
    // no broken blanks like "by ," or "because ." (placeholders must stay explicit)
    all.forEach(s=>ok(!/\b(?:by|at|because|about)\s*[,.?!]/.test(s.replace(/\[[^\]]*\]/g,"X")) , `"${fx.t}" [${W}]: broken blank in "${s}"`));
    all.forEach(s=>ok(!/\[\s*\]/.test(s), `"${fx.t}" [${W}]: empty placeholder in "${s}"`));
    (fx.keep||[]).forEach(k=>ok(low(rw.main).includes(low(k)), `"${fx.t}" [${W}]: ask "${k}" lost in "${rw.main}"`));
    (fx.gone||[]).forEach(g=>{
      const re = new RegExp("(^|[^a-z])"+g.toLowerCase().replace(/[.*+?^${}()|[\]\\]/g,"\\$&")+"($|[^a-z])");
      ok(!re.test(low(rw.main)), `"${fx.t}" [${W}]: "${g}" still in "${rw.main}"`);
    });
    if(fx.unchanged) ok(rw.unchanged && rw.main.replace(/\s/g,"")===fx.t.replace(/\s/g,""), `"${fx.t}" [${W}]: expected no change, got "${rw.main}"`);
    // every change is explained
    rw.changes.forEach(c=>ok(c.why && c.why.length>20, `"${fx.t}": change ${c.id} has no reason`));
    // never manipulative: no invented promises or guilt in the output
    all.forEach(s=>ok(!/\b(?:or else|you owe|after everything|if you loved me|if you cared)\b/i.test(s), `"${fx.t}": manipulative wording in "${s}"`));
  });
  // every static feature has an explanation and a fix
  an.staticIds.forEach(id=>ok(E.FBY[id].what && E.FBY[id].fix, `feature ${id} missing what/fix`));
});

// wiring-aware: "you need to" reads differently for autistic and ADHD listeners, and both are "may"-worded
const an = E.analyze("You need to clean your room.");
const r = E.readings(an, ["autistic","adhd","nt"], "person");
ok(r.autistic.some(e=>e.fid==="oblig" && e.w>=2 && /literal/i.test(e.y)), "autistic reading of 'need to' should mention literal meaning");
ok(r.adhd.some(e=>e.fid==="oblig" && e.w>=2), "ADHD reading of 'need to' missing");
ok(r.autistic.some(e=>e.fid==="nowhen"), "autistic reading should note the missing when");
const rw = E.rewrite(an, {wirings:["autistic"]});
ok(rw.primary.id==="explicit", "autistic listener should get the very explicit version first");
ok(rw.changes.find(c=>c.id==="oblig").forWiring.some(n=>n.wiring==="autistic"), "change reason should include an autistic note");
ok(E.rewrite(an,{wirings:["anxiety"]}).primary.id==="warm", "anxious listener should get the warm version first");
{ const p=E.rewrite(an,{wirings:["adhd"]}).primary; ok(["brief","main"].includes(p.id) && p.text.length<=60, "ADHD listener should get a short version first"); }
const again = E.readings(E.analyze("You're late again."), ["adhd"], "person").adhd;
ok(again.some(e=>e.fid==="again" && e.w===3), "ADHD should hear 'again' as heavy");
const omin = E.readings(E.analyze("We need to talk."), ["anxiety"], "person").anxiety;
ok(omin.some(e=>e.fid==="ominous" && e.w===3), "anxious listener should hear an opener with no topic as heavy");

// every wiring's readings use hedged, non-diagnostic language in the reasons we added
Object.values(E.NT).forEach(nt=>Object.entries(nt.receive).forEach(([fid,v])=>{
  const y = Array.isArray(v)?v[2]:v.y;
  ok(!/\b(?:all autistic|all adhd|always will|diagnos)/i.test(y), `${nt.name}/${fid}: over-general wording`);
}));

/* ============================================================
   First-time user review (a team manager testing Slack messages)
   ============================================================ */
const WORK = [];
const all = rw => [rw.main].concat(rw.variants.map(v=>v.text));
const lowIncl = (s,k) => s.toLowerCase().includes(k.toLowerCase());
const rwOf = (t, o) => E.rewrite(E.analyze(t,{channel:(o&&o.channel)||"chat"}), Object.assign({wirings:[]}, o||{}));
const W_ALL = [[], ["general"], ["autistic"], ["adhd"], ["anxiety"], ["nt"], ["autistic","adhd"]];
function review(t, fn){ WORK.push(t); fn(E.analyze(t,{channel:"chat"}), t); }

// acronyms are not shouting, and are never lowercased
review("Per my last message, the deck is due EOD.", (an,t)=>{
  ok(an.found.pointed, `"${t}": expected pointed`);
  ok(!an.found.shout, `"${t}": EOD is an acronym, not shouting`);
  ok(!an.found.nowhen && !an.missing.when, `"${t}": EOD is a when`);
  W_ALL.forEach(W=>{ const r=E.rewrite(an,{wirings:W}); all(r).forEach(s=>{
    ok(/\bEOD\b/.test(s), `"${t}" [${W}]: EOD lost or lowercased in "${s}"`);
    ok(lowIncl(s,"the deck is due"), `"${t}" [${W}]: the fact was dropped in "${s}"`);
    ok(!/per my last message/i.test(s), `"${t}" [${W}]: pointer still in "${s}"`);
  }); });
});
{ const t="Please send the PR by EOD, FYI the ETA is Q3 and the KPI doc is TBD. OOO on Monday, ping me on the 1:1 URL or the PDF.";
  const an=E.analyze(t,{channel:"chat"});
  ok(!an.found.shout, `"${t}": acronyms read as shouting`);
  W_ALL.forEach(W=>all(E.rewrite(an,{wirings:W})).forEach(s=>["PR","EOD","FYI","ETA","Q3","KPI","TBD","OOO","1:1","URL","PDF"].forEach(a=>ok(new RegExp("(^|[^A-Za-z0-9])"+a.replace(/[.:]/g,"\\$&")+"($|[^A-Za-z0-9])").test(s), `"${t}" [${W}]: ${a} lost or lowercased in "${s}"`)))); }
ok(E.analyze("Send it ASAP!!!").found.shout, "stacked !!! should still read as shouting");
ok(E.analyze("You forgot AGAIN?").found.shout, "AGAIN is a word in capitals, so it reads as shouting");
ok(E.analyze("WHY IS THIS NOT DONE").found.shout, "a message mostly in capitals reads as shouting");
ok(!E.analyze("Can you check the SOW and the QBR deck?").found.shout, "SOW and QBR are acronyms");

// "Going forward" is a standing request, not a missing time
review("I noticed the client email went out without review. Going forward, please send drafts to me first.", (an,t)=>{
  ok(an.found.standing, `"${t}": expected standing request`);
  ok(!an.found.nowhen && !an.missing.when, `"${t}": a standing request should not need a time`);
  ok(!an.found.impera, `"${t}": "please send" is a polite request`);
  W_ALL.forEach(W=>all(E.rewrite(an,{wirings:W})).forEach(s=>{
    ok(!/\[a time\]/.test(s), `"${t}" [${W}]: added a time to a standing request: "${s}"`);
    ok(lowIncl(s,"send drafts to me first") && lowIncl(s,"client email"), `"${t}" [${W}]: content dropped in "${s}"`);
  }));
});

// vague timing for literal listeners
review("Hey, can you take a look at this when you get a sec? No rush.", (an,t)=>{
  ok(an.found.vtime, `"${t}": "when you get a sec" is vague timing`);
  W_ALL.forEach(W=>{ const r=E.rewrite(an,{wirings:W});
    ok(/\[a time\]/.test(r.main) && !/when you get a sec/i.test(r.main), `"${t}" [${W}]: no real time suggested in "${r.main}"`);
    all(r).forEach(s=>ok(lowIncl(s,"take a look at this"), `"${t}" [${W}]: ask lost in "${s}"`)); });
});
review("Can you review the budget? No rush.", (an,t)=>{
  ok(an.found.vtime, `"${t}": "no rush" on an ask with no time is vague for literal listeners`);
  ok(/\[a time\]/.test(E.rewrite(an,{}).main), `"${t}": expected a real time`);
});

// don't add feelings the speaker didn't express; "ok" and "k thx" are treated the same way
["ok","OK","k","okay","k thx","ok thanks","Ok."].forEach(t=>{
  const an=E.analyze(t,{channel:"chat"}); const r=E.rewrite(an,{wirings:["anxiety"]});
  ok(an.found.minimal, `"${t}": expected minimal reply`);
  all(r).forEach(s=>{ ok(/^Okay, got it\./.test(s), `"${t}": expected a plain acknowledgment, got "${s}"`); ok(!/sounds good|happy to|!|love|great/i.test(s), `"${t}": added a feeling in "${s}"`); });
});

// meeting requests with no topic are anxiety triggers: name the topic and how serious
["Can we hop on a quick call?","Can you come to my office?","Can I grab you for a minute?"].forEach(t=>review(t,(an)=>{
  ok(an.found.ominous, `"${t}": expected opener with no topic`);
  ok(an.asks.length>0 && an.sentences.every(se=>se.ask), `"${t}": "the ask: none" must not be said for a request`);
  W_ALL.forEach(W=>{ const r=E.rewrite(an,{wirings:W}); ok(/\[the topic\]/.test(r.main) && /serious|\[a time\]/.test(r.main), `"${t}" [${W}]: topic/seriousness not asked for in "${r.main}"`); });
}));
ok(!E.analyze("Can we hop on a quick call about the budget at 3?").found.ominous, "a call with a topic is not ominous");
{ const r=rwOf("Can we hop on a quick call tomorrow?"); ok(/tomorrow/.test(r.main), `a time the speaker gave must be kept: "${r.main}"`); }

// "Why is this still not done??" -> where is it at, and a request with a time
review("Why is this still not done??", (an,t)=>{
  ok(an.found.blameq, `"${t}": expected blame question`);
  ok(an.asks.length>0, `"${t}": expected an ask`);
  W_ALL.forEach(W=>{ const r=E.rewrite(an,{wirings:W});
    ok(/Where is .+ at\?/.test(r.main) && /Could you .+ by \[a time\]\?/.test(r.main), `"${t}" [${W}]: expected where/could-you/by-when, got "${r.main}"`);
    all(r).forEach(s=>ok(!/\bwhy\b|still|\?\?/i.test(s.replace(/\[[^\]]*\]/g,"")), `"${t}" [${W}]: accusatory wording kept in "${s}"`)); });
});
{ const r=rwOf("Why isn't the report finished?"); ok(/Where is the report at\?/.test(r.main), `expected "Where is the report at?", got "${r.main}"`); }

// leftover sarcasm and hostility is removed in every version
review("Lately it's felt like you don't do the dishes and I'm sick of it. Can you actually clean for once?", (an,t)=>{
  ok(an.found.heat, `"${t}": expected heat words`);
  W_ALL.forEach(W=>{ const r=E.rewrite(an,{wirings:W, rel:"partner"});
    all(r).forEach(s=>{ ok(!/\bactually\b|for once|sick of|seriously/i.test(s), `"${t}" [${W}]: hostility kept in "${s}"`); ok(lowIncl(s,"dishes"), `"${t}" [${W}]: the dishes were dropped in "${s}"`); });
    ok(/\[a time\]/.test(r.main), `"${t}" [${W}]: expected a time on the ask in "${r.main}"`); });
});
["Seriously, can you just send it?","Could you actually reply for once?","I'm sick of this. Please fix the build."].forEach(t=>all(rwOf(t,{wirings:["adhd"]})).forEach(s=>ok(!/\bactually\b|for once|sick of|seriously/i.test(s), `"${t}": hostility kept in "${s}"`)));

// rewrites never drop content: every task and every deadline survives, in every version
{ const t="Reminder: timesheets are due Friday. Please also update the tracker, reply to the funder, and book the room for Tuesday.";
  const an=E.analyze(t,{channel:"chat"}); WORK.push(t);
  ok(!an.found.impera, `"${t}": "Please also update" is a polite request, not a bare command`);
  ok(an.found.multi, `"${t}": expected several asks`);
  const clauses=["timesheets","Friday","update the tracker","reply to the funder","book the room for Tuesday"];
  W_ALL.forEach(W=>{ const r=E.rewrite(an,{wirings:W});
    all(r).concat(r.list?[r.list]:[]).forEach(s=>clauses.forEach(c=>ok(lowIncl(s,c), `"${t}" [${W}]: "${c}" dropped from "${s.replace(/\n/g," / ")}"`)));
    if(r.list){ const items=r.list.split("\n").filter(l=>/^\d+\. /.test(l)).join(" ");
      clauses.forEach(c=>ok(lowIncl(items,c), `"${t}" [${W}]: "${c}" missing from the numbered list "${items}"`)); } });
}
ok(!E.analyze("Please also update the tracker.").found.impera, "\"Please also update…\" is a polite request, not a bare command");

// nudges and pointed phrases
[["Any update?","nudge"],["Circling back on this.","nudge"],["Just checking in.","nudge"],["As previously stated, the budget is final.","pointed"],["Per my previous email, the invoice is attached.","pointed"]].forEach(([t,id])=>review(t,(an)=>{
  ok(an.found[id], `"${t}": expected ${id}`);
  const r=E.rewrite(an,{});
  ok(!r.unchanged, `"${t}": expected a softer version`);
  if(id==="nudge"){ ok(an.asks.length>0, `"${t}": "the ask: none" must not be said for a nudge`); ok(/\[a time\]/.test(r.main) && /\[the specific thing\]/.test(r.main), `"${t}": expected the thing and a time in "${r.main}"`); }
  if(/budget/.test(t)) all(r).forEach(s=>ok(lowIncl(s,"the budget is final"), `"${t}": fact dropped in "${s}"`));
}));
ok(!E.analyze("Any update on the Q3 report before Friday?").found.nudge, "a follow-up with a topic and a time is fine");

// "Please do this ASAP" keeps the request polite and asks for a time and a reason
{ const r=rwOf("Please do this ASAP."); ok(/\[a time\]/.test(r.main) && /because \[the reason\]/.test(r.main) && !/asap/i.test(r.main), `ASAP: got "${r.main}"`); }

// "We're okay." only between close people, never at work or from a manager
{ const an0=E.analyze("You need to clean your room.");
  [undefined,"","coworker","manager","roommate"].forEach(rel=>["anxiety","adhd","trauma","hsp"].forEach(w=>{ const r=E.rewrite(an0,{wirings:[w], rel, bond:true}); all(r).forEach(s=>ok(!/we're okay/i.test(s), `rel=${rel} [${w}]: "We're okay" added in "${s}"`)); }));
  const rp=E.rewrite(an0,{wirings:["anxiety"], rel:"partner"}); ok(rp.variants.some(v=>/We're okay/.test(v.text) && /if it's true/i.test(v.why)), "partners: warm version keeps \"We're okay\" with the only-if-true note");
  ok(E.rewrite(an0,{wirings:["anxiety"], rel:"coworker"}).primary.id==="warm", "anxious listener at work still gets the warm version first"); }

// the headline agrees with the flags
FIX.map(f=>f.t).concat(WORK).forEach(t=>{
  const an=E.analyze(t,{channel:"chat"});
  [["general"],["nt"],["autistic"]].forEach(W=>{ const sc=E.score(an,W,"chat","v");
    if(an.staticIds.length) ok(sc.level[0]!=="clear" && !/clear/i.test(sc.level[1]), `"${t}" [${W}]: says "${sc.level[1]}" while ${an.staticIds.join(",")} is flagged`); });
});
// "Not sure" gives a general reading for anything flagged
WORK.forEach(t=>{ const an=E.analyze(t,{channel:"chat"}); const g=E.readings(an,["general"],"chat").general;
  an.staticIds.forEach(id=>ok(g.some(e=>e.fid===id && e.w>=1), `"${t}": general reading missing for ${id}`)); });

// chat and group channels are written channels
ok(E.analyze("Ok.",{channel:"chat"}).found.period || E.analyze("Fine.",{channel:"group"}).found.minimal, "chat/group should read like text");
ok(E.chBase("chat")==="text" && E.chBase("group")==="text" && E.chBase("person")==="person", "chBase maps chat and group to text");

// every deadline and time in any input survives in every version
const TIME_RE=/\b(?:(?:mon|tues|wednes|thurs|fri|satur|sun)day|tonight|tomorrow|today|EOD|EOW|\d{1,2}(?::\d{2})?(?:\s*[ap]m)?)\b/gi;
FIX.map(f=>f.t).concat(WORK).forEach(t=>{
  const times=(t.match(TIME_RE)||[]); if(!times.length) return;
  const an=E.analyze(t,{channel:"chat"});
  W_ALL.forEach(W=>{ const r=E.rewrite(an,{wirings:W}); all(r).forEach(s=>times.forEach(x=>ok(lowIncl(s,x), `"${t}" [${W}]: time "${x}" dropped in "${s.replace(/\n/g," / ")}"`))); });
});
// the review cases also pass the general checks (no broken blanks, reasons for every change)
WORK.forEach(t=>{ const an=E.analyze(t,{channel:"chat"}); W_ALL.forEach(W=>{ const r=E.rewrite(an,{wirings:W});
  all(r).forEach(s=>{ ok(!/\b(?:by|at|because|about)\s*[,.?!]/.test(s.replace(/\[[^\]]*\]/g,"X").replace(/\bWhere (?:is|are) [^?]+ at\?/g,"")), `"${t}" [${W}]: broken blank in "${s}"`); ok(!/\[\s*\]/.test(s), `"${t}": empty placeholder`); });
  r.changes.forEach(c=>ok(c.why && c.why.length>20, `"${t}": change ${c.id} has no reason`)); });
  an.staticIds.forEach(id=>ok(E.FBY[id].what && E.FBY[id].fix, `feature ${id} missing what/fix`)); });

// ---------- a first-time tester's sentences ----------
const TESTER = [
  // sarcasm, put-downs, passive jabs and shutting the door (the shared list, same as the other two tools)
  {t:"Wow, nice of you to finally show up.", has:["sarcasm"], gone:["nice of you","finally"]},
  {t:"Wow, thanks for nothing.", has:["sarcasm"], gone:["thanks for nothing"], notFound:["appreciation"]},
  {t:"SOME of us like having clean dishes 🙂", has:["passiveag"], gone:["some of us","🙂"], keep:["clean dishes"]},
  {t:"must be nice", has:["sarcasm"], gone:["must be nice"]},
  {t:"no need to be rude", has:["passiveag"], gone:["no need"]},
  {t:"lol ok whatever you say 🙄", has:["contempt"], gone:["whatever","🙄"]},
  {t:"I guess I'll plan the trip again since nobody else will", has:["passiveag"], gone:["nobody else","i guess"]},
  {t:"Your sister always remembers my birthday.", has:["compare"], gone:["sister","always"], keep:["my birthday"]},
  {t:"…", has:["stonewall"], nonEmpty:true},
  {t:"not now", has:["stonewall"], keep:["[a time]"]},
  {t:"I just can't do this right now", has:["stonewall"], keep:["[a time]"]},
  {t:"I can't do this right now. Can we talk at 8?", has:["pause"], notFound:["stonewall"]},
  {t:"Per my last email, I need this ASAP.", has:["pointed"], gone:["per my last","asap"]},
  // rewrites that used to break
  {t:"I love you, but I need you to hear me: I can't keep doing all the school pickups", keep:["I love you","school pickups"], gone:["but.","Could you hear me"]},
  {t:"You need to pick up the kids at 5 rather than be late", keep:["pick up the kids at 5"], gone:["rather than be late"]},
  {t:"It's gross.", gone:["gross"]},
  {t:"Did you even read what I wrote", changed:true, gone:["even"]},
  {t:"You always leave the lights on.", gone:["always"]},
  {t:"hey", exact:"hey"},
  {t:"Thanks for dinner 😊", exact:"Thanks for dinner 😊"},
  {t:"Can you grab milk on your way home", exact:"Can you grab milk on your way home"},
  {t:"asdkjh qwe zzkx", gibberish:true}
];
TESTER.forEach(c=>{
  const an=E.analyze(c.t,{channel:"text"});
  (c.has||[]).forEach(id=>ok(an.found[id], `tester "${c.t}": expected ${id}, found ${Object.keys(an.found).join(",")}`));
  (c.notFound||[]).forEach(id=>ok(!an.found[id], `tester "${c.t}": did not expect ${id}`));
  W_ALL.forEach(W=>{ const r=E.rewrite(an,{wirings:W, channel:"text"});
    if(c.exact) ok(r.main===c.exact, `tester "${c.t}" [${W}]: expected your exact words back, got "${r.main}"`);
    if(c.gibberish) ok(r.gibberish && /doesn't look like a sentence/.test(r.main), `tester "${c.t}": gibberish should be named, got "${r.main}"`);
    if(c.nonEmpty) ok(r.main && r.main.trim(), `tester "${c.t}" [${W}]: empty rewrite`);
    if(c.changed) ok(!r.unchanged, `tester "${c.t}" [${W}]: flagged, so it must not say nothing needed changing`);
    (c.keep||[]).forEach(k=>ok(lowIncl(r.main,k), `tester "${c.t}" [${W}]: "${k}" dropped in "${r.main}"`));
    (c.gone||[]).forEach(g=>ok(!lowIncl(r.main,g), `tester "${c.t}" [${W}]: "${g}" kept in "${r.main}"`));
    ok(!/\b(?:could|can|would|will) you\b[^.?!]*\.$/i.test(r.main.split(/(?<=[.?!])\s+/).filter(x=>/^(?:could|can|would|will) you\b/i.test(x)).join(" ")) , `tester "${c.t}" [${W}]: a question ends with "." in "${r.main}"`);
    ok(!/\p{Extended_Pictographic}\.$/u.test(r.main), `tester "${c.t}" [${W}]: period after an emoji in "${r.main}"`);
  });
});
// a listener's reading never quotes a word that isn't in the sentence
{ const an=E.analyze("Could you clean up a bit?",{channel:"text"}); const rd=E.readings(an,["alex"],"text").alex||[];
  rd.forEach(e=>ok(!/supportive/i.test(e.h) || /supportive/i.test("Could you clean up a bit?"), `alexithymia reading quotes "supportive": ${e.h}`)); }

console.log(`${FIX.length} phrase fixtures + ${WORK.length} workplace review cases, ${pass} checks passed, ${fail} failed`);
if(fail){ console.log(errs.slice(0,40).join("\n")); process.exit(1); }
