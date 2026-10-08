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

// ---------- re-test: safety worries, criticism-sensitive listeners, plain verdicts ----------
// the heading names the thing, in words, for every safety noun (never "A safety worry with no plan stove")
[["You left the stove on again. That's dangerous.","stove"],["You left the front door unlocked again.","front door"],["You left the oven on.","oven"],
 ["You left the knives out where the kids can reach.","knives"],["You forgot to turn off the iron again!","iron"],["The gate was left open again.","gate"],
 ["You left the meds on the counter again.","meds"],["You left the candles burning.","candles"],["You left the car unlocked last night.","car"],
 ["You left the bath running again.","bath"],["You left the space heater on.","space heater"],["You forgot to lock the back door.","back door"],
 ["You didn't buckle her into the car seat.","car seat"]].forEach(([t,th])=>{
  const an=E.analyze(t,{channel:"text"});
  ok(an.found.safeask, `"${t}": expected safeask`);
  const ti=E.title("safeask", an.found.safeask);
  ok(ti==="A safety worry about the "+th+", with no plan for next time", `"${t}": safety title reads "${ti}"`);
  ok(/^A real safety concern about the /.test(E.title("safety", an.found.safety, an)), `"${t}": safety-concern title reads "${E.title("safety", an.found.safety, an)}"`);
  // an ADHD / highly sensitive / trauma-wired listener: "again" goes, the fact and the worry stay
  [["adhd"],["hsp"],["trauma"],["adhd","autistic"]].forEach(W=>{ const r=E.rewrite(an,{wirings:W, rel:"partner", channel:"text"});
    all(r).forEach(s=>{ ok(!/\bagain\b/i.test(s), `"${t}" [${W}]: "again" kept in "${s}"`);
      ok(lowIncl(s,th.replace(/^space /,"")), `"${t}" [${W}]: the fact (${th}) dropped in "${s}"`);
      ok(/every time/i.test(s), `"${t}" [${W}]: the habit ask dropped in "${s}"`);
      ok(/scar|worr|danger|safe/i.test(s), `"${t}" [${W}]: the safety worry dropped in "${s}"`);
      ok(!/\bI noticed you\b/.test(s) || /buckle/.test(t), `"${t}" [${W}]: still "I noticed you…" in "${s}"`); });
    r.changes.forEach(c=>ok(c.why && c.why.length>20, `"${t}" [${W}]: change ${c.id} has no reason`));
    ok(!r.changes.some(c=>c.id==="noticed") || /I noticed/.test(r.main), `"${t}" [${W}]: lists an "I noticed" change it no longer makes`); });
  // other listeners keep the fact as said
  ok(E.rewrite(an,{wirings:["autistic"]}).main.toLowerCase().includes(th), `"${t}": autistic listener lost the fact`);
});
{ const r=E.rewrite(E.analyze("You left the stove on again.",{channel:"text"}),{wirings:["adhd"], rel:"partner"});
  ok(/^You left the stove on, and that scares me\. Can we find a way to make sure the stove gets turned off every time\?/.test(r.main), `ADHD stove rewrite: "${r.main}"`); }
{ const r=E.rewrite(E.analyze("You left the stove on again. That's dangerous.",{channel:"text"}),{wirings:["adhd"]});
  ok(/^You left the stove on\. That's dangerous, and it worries me\./.test(r.main) && !/today|kitchen/.test(r.main), `ADHD stove + danger rewrite (active, nothing added): "${r.main}"`); }
{ const r=E.rewrite(E.analyze("You left the stove on again last night.",{channel:"text"}),{wirings:["adhd"]});
  ok(/^You left the stove on last night\b/.test(r.main) && !/today/.test(r.main), `a time the speaker gave is kept: "${r.main}"`); }
{ const r=E.rewrite(E.analyze("You left the stove on again.",{channel:"text"}),{wirings:[]});
  ok(/again/.test(r.main), `without a criticism-sensitive listener the fact is kept as said: "${r.main}"`); }
// a one-line plain verdict that agrees with the level
[["I felt hurt when you missed dinner. Could you text me by 6 if you'll be late?","ok",/probably land okay/],
 ["Can you grab milk on your way home","ok",/probably land okay/],
 ["You need to clean your room.","hurt",/might hurt/],
 ["You left the stove on again. That's dangerous.","hurt",/^Your worry is fair and worth saying plainly\. Here's a version that keeps your words direct and lands easier for them\.$/],
 ["You're so lazy and you never help.","fight",/start a fight/],
 ["If you don't clean up, I'm leaving.","fight",/start a fight/],
 ["I'll take you to court and get full custody.","fight",/start a fight/]].forEach(([t,id,re])=>{
  const an=E.analyze(t,{channel:"text"}); const sc=E.score(an,["general"],"text","v"); const v=E.verdict(an,sc,E.rewrite(an,{wirings:["general"]}));
  ok(v.id===id && re.test(v.text), `"${t}": plain verdict ${v.id} "${v.text}"`);
  ok(!/static|pillar|wiring|generaliz/i.test(v.text), `"${t}": jargon in the plain verdict "${v.text}"`);
});
FIX.map(f=>f.t).concat(WORK).forEach(t=>{ const an=E.analyze(t,{channel:"chat"}); const sc=E.score(an,["general"],"chat","v"); const v=E.verdict(an,sc,E.rewrite(an,{wirings:["general"]}));
  ok(v && v.text && v.text.split(/(?<=\.)\s/).length<=2, `"${t}": plain verdict missing or long: "${v&&v.text}"`);
  if(sc.level[0]==="heavy") ok(v.id==="fight" || (an.apology && v.apology), `"${t}": heavy static but verdict "${v.text}"`);
  if(sc.level[0]==="clear" && !an.staticIds.length) ok(v.id==="ok", `"${t}": clear but verdict "${v.text}"`); });
// jargon labels have a plain gloss
["absolute","label","passive","minim","vstd","ominous","hint","passiveag","stonewall","idiom","shout","vtime","nowhen","impera","oblig"].forEach(id=>ok(E.gloss(id).length>5 && !/static|wiring/i.test(E.gloss(id)), `${id}: no plain gloss`));
ok(E.gloss("absolute").includes("always"), "absolute: the gloss should name \"always\" and \"never\"");

// ---------- co-parents: the logistics ask survives a threat; a businesslike "Safest" ----------
{ const t="If you're late again I'll take you to court. I already told the kids you don't care.";
  const an=E.analyze(t,{channel:"text"});
  ok(an.found.legal && an.found.kidsfirst, `"${t}": expected legal and kidsfirst`);
  W_ALL.forEach(W=>{ const r=E.rewrite(an,{wirings:W, rel:"coparent", channel:"text"});
    all(r).forEach(s=>{ ok(/\bif you'll be late, please text me by \[a time\]/i.test(s), `"${t}" [${W}]: the pickup/lateness ask was dropped in "${s}"`);
      ok(/pickup/i.test(s), `"${t}" [${W}]: pickup not named in "${s}"`);
      ok(!/court|lawyer|custody|you don't care|told the kids/i.test(s), `"${t}" [${W}]: threat or kids line kept in "${s}"`);
      ok(!/What's changed, plainly/.test(s), `"${t}" [${W}]: only a blank was left in "${s}"`);
      ok(!/not upset with you as a person|We're okay/i.test(s), `"${t}" [${W}]: relationship reassurance for a co-parent in "${s}"`); });
    const safe=r.variants.find(v=>v.id==="safe"); ok(safe && /^I'd like to keep this to the plan for the kids\./.test(safe.text), `"${t}" [${W}]: co-parent Safest opener: "${safe&&safe.text}"`); });
}
{ const r=E.rewrite(E.analyze("If you miss pickup again I'll call my lawyer.",{channel:"text"}),{rel:"coparent"});
  ok(/If you can't make it, please tell me by \[a time\]/.test(r.main) && !/lawyer/i.test(r.main), `missed pickup: "${r.main}"`); }
{ const r=E.rewrite(E.analyze("You need to pick up the kids at 5.",{channel:"text"}),{rel:"coparent"});
  const safe=r.variants.find(v=>v.id==="safe"); ok(safe && !/not upset with you as a person/.test(safe.text), `co-parent Safest: "${safe&&safe.text}"`);
  const rp=E.rewrite(E.analyze("You need to pick up the kids at 5.",{channel:"text"}),{rel:"partner"}).variants.find(v=>v.id==="safe");
  ok(rp && /not upset with you as a person/.test(rp.text), "partners keep the warmer Safest opener"); }

// ---------- a question typed without "?" is not a command, and is never wrapped in "could you" ----------
{ const t="ok so do you want to call tonight or not. i said work is busy";
  const an=E.analyze(t,{channel:"text"});
  ok(!an.found.impera, `"${t}": "do you want…" read as a bare command`);
  ok(an.found.defend, `"${t}": "i said work is busy" should be flagged as defending`);
  ok(an.sentences[0].mood==="Question", `"${t}": first sentence should read as a question, got ${an.sentences[0].mood}`);
  W_ALL.forEach(W=>all(E.rewrite(an,{wirings:W, channel:"text"})).forEach(s=>{
    ok(!/could you do you|could you (?:do|are|is|did|can) (?:you|we)\b/i.test(s), `"${t}" [${W}]: question wrapped in "could you": "${s}"`);
    ok(/do you want to call tonight/i.test(s) && /work is busy/i.test(s), `"${t}" [${W}]: content dropped in "${s}"`);
    ok(!/\bi said\b/i.test(s), `"${t}" [${W}]: still defending in "${s}"`); }));
  ok(E.FBY.defend && E.FBY.defend.what && E.FBY.defend.fix && E.CHANGE_WHY.defend, "defend has what, fix and a change reason");
}
["so do you want pizza or not","are we still on for tonight","did you get my message","can u call me later"].forEach(t=>{ const an=E.analyze(t,{channel:"text"});
  ok(!an.found.impera, `"${t}": a question is not a command`);
  all(E.rewrite(an,{channel:"text"})).forEach(s=>ok(!/\b(?:could|can) you (?:do|are|did|can) (?:you|we|u)\b/i.test(s), `"${t}": "${s}"`)); });
["Do the dishes tonight.","Take out the trash."].forEach(t=>ok(E.analyze(t,{channel:"text"}).found.impera, `"${t}" is still a command`));
ok(!E.analyze("I said I'd call at 8.",{channel:"text"}).found.defend, "a promise is not defending");
// "Fine. Whatever works for you.": brush-off or quiet hurt, and the move is to ask
{ const an=E.analyze("Fine. Whatever works for you.",{channel:"text"});
  ok(/quiet hurt/i.test(E.FBY.brushoff.name) && /resigned hurt/i.test(E.FBY.brushoff.what) && /ask which/i.test(E.FBY.brushoff.what), "brush-off explains resigned hurt and asking");
  ok(an.sentences.some(se=>/quiet hurt/.test(se.mood)), "the sentence kind names quiet hurt too"); }

// ---------- re-test: an apology with "but you…", words that are really in the message, inferred asks ----------
{ const t="Oh no, sorry!! I was totally distracted, I'm the worst 😩 but you didn't have to say it like that";
  const an=E.analyze(t,{channel:"text"});
  ok(an.apology, `"${t}": a real apology`);
  ok(an.found.sorrybut && /^but you didn't have to say it like that$/i.test(an.found.sorrybut[0]), `"${t}": the blaming clause is flagged: ${JSON.stringify(an.found.sorrybut)}`);
  ok(E.FBY.sorrybut && E.FBY.sorrybut.kind==="static" && E.GLOSS.sorrybut && E.CHANGE_WHY.sorrybut && E.CHECK.sorrybut, "sorrybut has a name, gloss, change reason and check-back");
  // a criticism-sensitive listener, or one who is stressed: the headline stays gentle, and says the apology is kept
  [["adhd","v"],["anxiety","s"],["general","d"],["hsp","v"]].forEach(([w,st])=>{
    const sc=E.score(an,[w],"text",st), r=E.rewrite(an,{wirings:[w], rel:"partner", channel:"text"}), v=E.verdict(an,sc,r);
    ok(!/start a fight/i.test(v.text), `"${t}" [${w},${st}]: harsh headline "${v.text}" (${sc.level[1]})`);
    if(sc.level[0]!=="clear") ok(/keeps your apology/.test(v.text) && v.apology, `"${t}" [${w},${st}]: apology headline "${v.text}"`);
    ok(sc.top.length===0 || sc.top[0].fid==="sorrybut", `"${t}" [${w},${st}]: loudest reading should be the "but you…" clause, got ${sc.top[0] && sc.top[0].fid}`);
    all(r).forEach(x=>{
      ok(!/didn't have to say it like that|the worst/i.test(x), `"${t}" [${w}]: blame or put-down kept in "${x}"`);
      ok(/sorry/i.test(x) && /distracted/.test(x), `"${t}" [${w}]: the apology was lost in "${x}"`);
      ok(!/,\s*😩|,\s*but\b\s*[.?!]?$/.test(x), `"${t}" [${w}]: stray comma in "${x}"`); });
    ok(/stung a little/.test(r.main), `"${t}" [${w}]: the hurt is said separately: "${r.main}"`); });
}
[["Sorry, but you're being ridiculous.",false],["I'm not sorry, but you're wrong.",false],["Sorry you feel that way, but you started it.",false],["Great job on dinner, but you forgot the milk.",false],
 ["I'm sorry I snapped. But you didn't have to slam the door.",true],["My fault, I forgot the milk, though you could have reminded me.",true]].forEach(([t,want])=>{
  const an=E.analyze(t,{channel:"text"}); ok(!!an.found.sorrybut===want, `"${t}": sorrybut ${!!an.found.sorrybut}, want ${want}`); });
ok(!E.analyze("I'm so sorry I missed your call.",{channel:"text"}).found.sorrybut && E.analyze("I'm so sorry I missed your call.",{channel:"text"}).apology, "a plain apology has no \"but you\" flag");
// "What stands out" names only words that are in the message, once
{ const t="If you're late again I'll take you to court and you'll never see the kids.";
  const an=E.analyze(t,{channel:"text"});
  Object.keys(an.found).forEach(id=>{ const ttl=E.title(id, an.found[id], an);
    (ttl.match(/["“]([^"”]+)["”]/g)||[]).forEach(q=>{ const w=q.replace(/["“”,]/g,"").toLowerCase().trim(); ok(an.norm.toLowerCase().includes(w), `"${t}": title "${ttl}" quotes "${w}", which isn't in the message`); }); });
  ok(!/still|even/i.test(E.title("again", an.found.again, an)), `again title: ${E.title("again", an.found.again, an)}`); }
ok(E.title("again", [], null)===E.FBY.again.name, "with no words to show, the full name is kept");
// the ask, inferred when the message says what it's about; otherwise a plain-language prompt, never a bracketed blank
[["You always correct me with the baby.",/Could you let me handle it my way, and tell me later if you disagree\?/],
 ["You're always correcting me with the kids in front of your mother.",/let me handle it my way/],
 ["You always interrupt me.",/Could you let me finish before you answer\?/],
 ["You always leave the lights on.",/Could you \(say the one thing you'd like\) going forward\?/]].forEach(([t,re])=>W_ALL.forEach(W=>{
  const r=E.rewrite(E.analyze(t,{channel:"text"}),{wirings:W, rel:"partner"});
  ok(re.test(r.main), `"${t}" [${W}]: ask "${r.main}"`); ok(!/\[one specific thing\]/.test(r.main), `"${t}" [${W}]: raw blank in "${r.main}"`); }));

// ---------- couples review: a direct sender with a fair worry; nothing invented; simpler English ----------
{ // 1. a fair concern said plainly: the headline doesn't make the directness the problem, and names the listener
  const t="You left the stove on again. That's dangerous.";
  [["adhd","Sam"],["general",""],["hsp","Alex"]].forEach(([w,name])=>{
    const an=E.analyze(t,{channel:"text"}), sc=E.score(an,[w],"text","v"), r=E.rewrite(an,{wirings:[w], rel:"partner"}), v=E.verdict(an,sc,r,{listener:name});
    if(v.id!=="ok") ok(v.fair && v.text==="Your worry is fair and worth saying plainly. Here's a version that keeps your words direct and lands easier for "+(name||"them")+".", `[${w}] fair-worry headline: "${v.text}"`);
    ok(!/might hurt|softer/i.test(v.text), `[${w}] directness made the problem: "${v.text}"`); });
  // an attack keeps the softer wording, even with a safety worry inside it
  ["You're so careless, you left the stove on again.","You left the stove on again, you idiot."].forEach(m=>{
    const an=E.analyze(m,{channel:"text"}), sc=E.score(an,["adhd"],"text","v"), v=E.verdict(an,sc,E.rewrite(an,{wirings:["adhd"]}),{listener:"Sam"});
    ok(!v.fair && !/worth saying plainly/.test(v.text), `"${m}": an attack is not a fair worry: "${v.text}"`); });
  ok(E.fairConcern(E.analyze(t,{channel:"text"})) && !E.fairConcern(E.analyze("You need to clean your room.",{channel:"text"})), "fairConcern: safety yes, a chore order no");
}
{ // 2. rewrites never add a time or a place the message didn't have
  const ADDED=/\b(today|tonight|tomorrow|yesterday|this (?:morning|afternoon|evening|week|weekend)|last night|(?:mon|tues|wednes|thurs|fri|satur|sun)day|at home|at work|in the kitchen|the kitchen)\b/gi;
  const msgs=FIX.map(f=>f.t).concat(WORK, ["You left the stove on again. That's dangerous.","You left the front door unlocked again.","You left the oven on.","You forgot to turn off the iron again!","The gate was left open again.","You left the meds on the counter again.","You left the candles burning.","You left the space heater on.","You forgot to lock the back door.","Supportive would be nice for once.","Sure, whatever you say, genius.","You left the knives out where the kids can reach."]);
  msgs.forEach(m=>{ const an=E.analyze(m,{channel:"text"});
    [[],["general"],["adhd"],["hsp"],["trauma"],["autistic"],["nt"]].forEach(W=>{ const r=E.rewrite(an,{wirings:W, rel:"partner", channel:"text"});
      all(r).forEach(x=>{ (x.replace(/\[[^\]]*\]/g,"").match(ADDED)||[]).forEach(w=>ok(new RegExp("\\b"+w+"\\b","i").test(m), `"${m}" [${W}]: rewrite adds "${w}": "${x}"`)); }); }); });
  // the plain fact stays active and in the speaker's words
  [["You forgot to turn off the iron again!",/^You forgot to turn off the iron, and that scares me\./],["The gate was left open again.",/^The gate was left open, and that scares me\./],["I noticed you left the stove on again.",/^You left the stove on, and that scares me\./]].forEach(([m,re])=>{
    const r=E.rewrite(E.analyze(m,{channel:"text"}),{wirings:["adhd"], rel:"partner"}); ok(re.test(r.main) && !/\bagain\b/i.test(r.main), `"${m}": plain fact "${r.main}"`); });
}
{ // 3. simpler English re-says the suggested words in short sentences
  const r=E.rewrite(E.analyze("You are always correcting me with the baby, it is not respectful to me as her mother.",{channel:"text"}),{wirings:["general"], rel:"partner"});
  ok(E.simpler(r.main)==="You correct me with the baby a lot. It does not feel respectful. I am her mother. Please let me do it my way, and talk to me later if you disagree.", `simpler baby: "${E.simpler(r.main)}"`);
  ok(E.simpler("You left the stove on. That's dangerous, and it worries me.")==="You left the stove on. That is dangerous. It worries me.", "simpler splits one idea per sentence: "+E.simpler("You left the stove on. That's dangerous, and it worries me."));
  ok(E.simpler("Could you call the dentist by [a time]?")==="Please call the dentist by [a time].", "simpler keeps blanks: "+E.simpler("Could you call the dentist by [a time]?"));
  FIX.map(f=>f.t).concat(WORK).forEach(m=>{ const rr=E.rewrite(E.analyze(m,{channel:"text"}),{wirings:["general"]}); all(rr).forEach(x=>{ const sm=E.simpler(x);
    ok(sm && (x.match(/\[[^\]]*\]/g)||[]).every(b=>sm.includes(b)), `simpler lost a blank: "${x}" -> "${sm}"`);
    ok(!/\b(?:can't|won't|don't|doesn't|it's|I'm|you're)\b/.test(sm.replace(/\[[^\]]*\]/g,"")), `simpler left a contraction: "${sm}"`);
    ok(!/\.\s*\./.test(sm) && !/\s[,.]/.test(sm), `simpler broke punctuation: "${sm}"`); }); });
}

{ // 8. a reassurance is never taken out, no dangling "not", and "I said maybe" reports an earlier answer
  [["ok. i said maybe because of work, not because of you. call sunday?",/not because of you/],["It's not because of you, I'm just tired.",/not because of you/],["It's not you, it's work. Talk tonight?",/It's not you/],["Not your fault. I forgot to tell you.",/Not your fault/],["I said we'll see, not no.",/I said we'll see, not no/]].forEach(([t,keep])=>{
    const an=E.analyze(t,{channel:"text"});
    ok(!an.found.madefeel, `"${t}": a reassurance flagged as blame`);
    ok(!an.found.softno, `"${t}": a report of an earlier "maybe" flagged as a soft no`);
    W_ALL.forEach(W=>{ const r=E.rewrite(an,{wirings:W, rel:"partner", channel:"text"});
      all(r).forEach(x=>{ ok(keep.test(x), `"${t}" [${W}]: reassurance removed in "${x}"`); ok(!/,\s*(?:not|but|and)\s*[.!?]/i.test(x), `"${t}" [${W}]: dangling word in "${x}"`); });
      ok(!r.changes.some(c=>c.id==="madefeel"), `"${t}" [${W}]: "you made me feel" note on a reassurance`); }); });
  // blame with "because of you" still gets the note, and a plain soft no is still a soft no
  ok(E.analyze("Because of you, I missed the bus.",{channel:"text"}).found.madefeel, "\"Because of you, I…\" is still blame");
  ok(E.analyze("Maybe.",{channel:"text"}).found.softno && E.analyze("We'll see.",{channel:"text"}).found.softno, "a plain maybe is still a soft no");
}

// ---------- testers, round 4: work messages, excuses, a carer's group message, the speaker's wiring ----------
{ // 1. a team lead in a group channel: fact, impact, one request. No "Guys", no count, no "not blaming anyone"
  const T = "Guys, this is the third time the handover was missed. Sort it out.";
  const an = E.analyze(T,{channel:"group"});
  ok(an.found.count, "\"third time\" is flagged as keeping count");
  const base = E.rewrite(E.analyze(T,{channel:"text"}),{wirings:["general"], channel:"text"});
  [["manager","group",true],["coworker","chat",true],["","group",true],["manager","text",false],["","text",true]].forEach(([rel,ch,work])=>{
    const a = E.analyze(T,{channel:ch}), r = E.rewrite(a,{wirings:["general"], channel:ch, rel, work});
    const tag = `[${rel||"no rel"}/${ch}${work?"/work":""}]`;
    all(r).forEach(x=>{
      ok(!/\bguys\b|third time|\bagain\b|every time/i.test(x), `${tag} kept "Guys" or the count: "${x}"`);
      ok(!/not blaming anyone/i.test(x), `${tag} "not blaming anyone" next to blame: "${x}"`);
      ok(!/I am not against you|I'm not upset with you as a person/i.test(x), `${tag} couple wording at work: "${x}"`);
    });
    ok(/^The handover was missed on \[days\], and \[what that affected\]\. Could we agree one owner for it by \[a day\]\?$/.test(r.main), `${tag} fact / impact / request: "${r.main}"`);
    ok(r.main!==base.main, `${tag} the work setting changed nothing`);
    ok(r.changes.some(c=>c.id==="count" && /Counting the misses/.test(c.why)), `${tag} the count is explained in the notes`);
    ok(r.changes.some(c=>c.id==="guys"), `${tag} "Guys" is explained in the notes`);
    const safe = r.variants.find(v=>v.id==="safe");
    ok(safe && /about the process|about how the process works/.test(safe.text) && !/start a fight/.test(safe.why), `${tag} safest at work: ${safe && safe.text}`);
    const sc = E.score(a,["general"],ch,"v"), v = E.verdict(a, sc, r, {work, rel});
    ok(/blame or an order/.test(v.text) && !/start a fight/.test(v.text), `${tag} work verdict: "${v.text}"`);
  });
  // other work corrections take the same shape
  [["The report was late again. Fix it.", /^The report was late, and \[what that affected\]\. Could we agree one owner for it by \[a day\]\?$/],
   ["This is the fifth time the rota wasn't updated. Sort this out.", /^The rota wasn't updated on \[days\], and \[what that affected\]\. Could we agree one owner for it by \[a day\]\?$/],
   ["Folks, timesheets were missed again!", /^Timesheets were missed, and \[what that affected\]\. Could we agree one owner for it by \[a day\]\?$/]].forEach(([t,re])=>{
    const r = E.rewrite(E.analyze(t,{channel:"group"}),{wirings:["general"], channel:"group", rel:"manager", work:true});
    ok(re.test(r.main), `work shape "${t}": "${r.main}"`); });
  // outside work, the count still never stays as "Guys, this is the third time" in the safest version's lead
  ok(!E.verdict(E.analyze("You're so lazy and you never help.",{channel:"text"}), E.score(E.analyze("You're so lazy and you never help.",{channel:"text"}),["general"],"text","v"), null, {}).work, "a home message keeps the home verdict");
}
{ // 3. "You know how I am": flagged, never kept; the apology says what I did, that it's on me, and what I'll do
  ["You know how I am","that's just how I am","I can't help it","that's just me"].forEach(x=>{
    const an = E.analyze("Sorry I forgot again, "+x+".",{channel:"text"});
    ok(an.found.excuse && E.FBY.excuse.name==="Shifts the job onto them", `"${x}" flagged as shifting the job: ${an.staticIds}`); });
  [[], ["general"], ["adhd"], ["autistic"]].forEach(W=>{
    const r = E.rewrite(E.analyze("Sorry, I forgot again. You know how I am.",{channel:"text"}),{wirings:W, rel:"partner", channel:"text"});
    ok(r.main==="Sorry I forgot [the thing]. That's on me. [I've set a reminder] so it doesn't happen next time.", `[${W}] apology shape: "${r.main}"`);
    all(r).forEach(x=>ok(!/know how I am|\bagain\b/i.test(x), `[${W}] excuse kept: "${x}"`));
    ok(r.changes.some(c=>c.id==="excuse"), `[${W}] the excuse change is explained`); });
  // at work too, the apology stays an apology (no "[what that affected]" on your own miss)
  const rw = E.rewrite(E.analyze("Sorry, I forgot again. You know how I am.",{channel:"chat"}),{wirings:["general"], channel:"chat", rel:"coworker", work:true});
  ok(rw.main==="Sorry I forgot [the thing]. That's on me. [I've set a reminder] so it doesn't happen next time.", `apology at work: "${rw.main}"`);
  // the ownership line comes right after the apology; a question stays last
  const rq = E.rewrite(E.analyze("Sorry I missed it, I can't help it. Can we reschedule?",{channel:"text"}),{wirings:["general"], channel:"text"});
  ok(/^Sorry I missed it\. That's on me\. .*Can we reschedule[^?]*\?$/.test(rq.main), `ownership order: "${rq.main}"`);
  // a fine apology with nothing flagged is left alone
  ok(E.rewrite(E.analyze("Oops, sorry, I forgot to buy milk!",{channel:"text"}),{wirings:["general"]}).unchanged, "a plain apology is left as typed");
  const r2 = E.rewrite(E.analyze("Sorry I missed your call, I can't help it.",{channel:"text"}),{wirings:["general"], channel:"text"});
  all(r2).forEach(x=>ok(!/can't help it/i.test(x), `"I can't help it" kept: "${x}"`));
}
{ // 5. a carer writing to her brothers: "I'm done" and "do nothing" never stay; one share each
  const T = "I'm done doing everything for Dad while you two do nothing.";
  const an = E.analyze(T,{channel:"group"});
  ok(an.found.absolute && an.found.absolute.some(w=>/do nothing/i.test(w)), `"you two do nothing" is an absolute: ${JSON.stringify(an.found.absolute)}`);
  [["family","group"],["","text"],["family","text"]].forEach(([rel,ch])=>{
    const r = E.rewrite(E.analyze(T,{channel:ch}),{wirings:["general"], channel:ch, rel});
    all(r).forEach(x=>ok(!/I'm done|do nothing|everything/i.test(x), `[${rel}/${ch}] flagged words kept: "${x}"`));
    ok(/^I can't keep doing most of Dad's care on my own\. Could you each take one thing, like \[Thursday's appointment\] or \[the Sunday call\]\?$/.test(r.main), `[${rel}/${ch}] carer rewrite: "${r.main}"`);
  });
  // a flagged phrase never survives into the clearest version
  ["I'm done doing all the cooking while you do nothing.","I do everything for Mum and you two do nothing."].forEach(t=>{
    const a = E.analyze(t,{channel:"text"}), r = E.rewrite(a,{wirings:["general"], channel:"text"});
    ["hyper","stonewall","absolute"].forEach(id=>(a.found[id]||[]).filter(Boolean).forEach(w=>ok(!r.main.toLowerCase().includes(w.toLowerCase()), `"${t}": flagged "${w}" kept in "${r.main}"`))); });
}
{ // 4. the speaker's wiring, in the second person: "As someone with ADHD, you likely meant…"
  Object.keys(E.NT).filter(id=>id!=="general").forEach(id=>{
    const m = E.meantSelf(id, []);
    ok(m && /^As /.test(m.as) && /,$/.test(m.as) && /^(?:you|your|if you|if your|the|a)\b/i.test(m.text), `${id}: meantSelf "${m && m.as} ${m && m.text}"`);
    Object.keys(E.SELF_MEANT[id]).filter(k=>k!=="as").forEach(k=>ok(!/\b(?:they said|their settled|for them as for you)\b/.test(E.SELF_MEANT[id][k]), `${id}.${k}: third person for the speaker`)); });
  ok(/^you likely meant what you said, fast\./.test(E.meantSelf("adhd",[]).text) && E.meantSelf("adhd",[]).as==="As someone with ADHD,", "ADHD speaker, second person");
}
{ // 5b. "call sunday?" is an ask; a reply that skips their hurt is not "will probably land okay"
  const an = E.analyze("ok. i said maybe because of work, not because of you. call sunday?",{channel:"text"});
  ok(an.sentences[2].ask==="call sunday", `"call sunday?" ask: ${an.sentences[2].ask}`);
  ok(!an.missing.ask, "a proposal is an ask");
  ["Dinner Friday at 7?","Coffee tomorrow?"].forEach(t=>ok(E.analyze(t,{channel:"text"}).asks.length===1, `"${t}" is an ask`));
  ["Seriously?","Fine?","Really?"].forEach(t=>ok(!E.analyze(t,{channel:"text"}).asks.length, `"${t}" is not an ask`));
  const sc = E.score(an,["general"],"text","v"), rw = E.rewrite(an,{wirings:["general"],channel:"text"});
  const v = E.verdict(an, sc, rw, {replyTo:"Fine. Whatever works for you."});
  ok(v.id==="hurt" && v.reply && /^Clear words\. Add one line about what you heard first/.test(v.text), `reply verdict: ${v.text}`);
  const an2 = E.analyze("Sounds like you're fed up with me cancelling. It's work, not you. Call Sunday at 7?",{channel:"text"});
  ok(!E.verdict(an2, E.score(an2,["general"],"text","v"), E.rewrite(an2,{wirings:["general"]}), {replyTo:"Fine. Whatever works for you."}).reply, "a reply that says what it heard gets no \"add one line\" note");
}
{ // 8. plain labels: "The word “always”", never "Absolute or generalization"
  ok(E.title("absolute",["always"])==="The word “always”" && E.title("absolute",[])==="Big words like always or never", "absolute title in plain words");
  ok(!/generalization/i.test(E.FBY.absolute.name), "no jargon name for absolutes");
}

console.log(`${FIX.length} phrase fixtures + ${WORK.length} workplace review cases, ${pass} checks passed, ${fail} failed`);
if(fail){ console.log(errs.slice(0,40).join("\n")); process.exit(1); }
