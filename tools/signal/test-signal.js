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

console.log(`${FIX.length} phrase fixtures, ${pass} checks passed, ${fail} failed`);
if(fail){ console.log(errs.slice(0,40).join("\n")); process.exit(1); }
