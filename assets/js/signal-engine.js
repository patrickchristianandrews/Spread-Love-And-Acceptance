/* signal-engine.js — the reading rules behind /signal-translator.html

   Everything here runs in the visitor's browser. Nothing is saved or sent anywhere.
   It reads the structure of a sentence: who it is about, whether it asks, orders,
   hints or blames, what pressure words, absolutes and minimizers it carries, and
   what is missing (a when, a reason, the topic). Then it offers a softer rewrite
   that keeps the speaker's real ask, and lists every change with its reason.

   It cannot hear tone, see faces or know anyone's history. People vary widely
   inside every wiring, so every reading is a "may", never a verdict.

   analyze(text, {channel})           -> sentences, features (with exact spans), the ask,
                                          what is missing, and what is worth keeping
   readings(analysis, wiringIds, ch)  -> per-wiring list of how each feature may land
   rewrite(analysis, {wirings, channel}) -> { main, variants, changes, ask }
   detect(text, ch)                   -> the older {found, spans, words} shape the page uses */
(function (root) {
'use strict';

/* ============================================================
   WORD LISTS
   ============================================================ */
const LABEL_WORDS="lazy|selfish|inconsiderate|careless|useless|ridiculous|pathetic|stupid|irresponsible|childish|crazy|dramatic|immature|clueless|rude|incompetent|hopeless|unreliable|controlling|needy|petty|disrespectful|dumb|an idiot|idiot|worthless|annoying|impossible|exhausting|a mess|a slob|a nightmare|the worst|insane|a baby|a child|so difficult|difficult|mean|cold|heartless|ungrateful|spoiled|entitled|toxic|a disappointment|disappointing|weak|pathetic|a liar|a joke|clumsy|slow|messy|dirty|gross|sloppy|forgetful|oblivious|dense|thick|too much|too sensitive|too emotional|so sensitive|so emotional";
const IDIOMS=["ball's in your court","play it by ear","break a leg","piece of cake","under the weather","beat(?:ing)? around the bush","on the same page","hit the hay","cut (?:me |you )?some slack","get your act together","pull your (?:own )?weight","walk(?:ing)? on eggshells","(?:the )?last straw","elephant in the room","cross that bridge","bite the bullet","spill the beans","hold your horses","in hot water","on thin ice","drop(?:ped)? the ball","at the end of the day","when pigs fly","blow(?:ing)? off steam","rain ?check","touch base","get off my back","cool it","jump(?:ed|ing)? the gun","go the extra mile","keep an eye on","give me a hand","hang in there","hit the roof","the whole nine yards","not rocket science","a lot on my plate","keep me in the loop","out of the loop","heads up","sleep on it","hit a wall","on the fence","up in the air","cold feet","cost an arm and a leg","kill two birds","get it together","pull yourself together","get a grip","knock it off","cut it out","over the moon","see eye to eye","water under the bridge","throw(?:n)? under the bus","read the room","get the ball rolling","on the back burner","call it a day","the bottom line","take it easy","break the ice","sit tight","hang on a sec","bent out of shape","push(?:ing)? my buttons","on edge","between a rock and a hard place"];
const FEELINGS="hurt|sad|worried|anxious|scared|afraid|nervous|lonely|alone|tired|exhausted|overwhelmed|stressed|frustrated|angry|upset|disappointed|embarrassed|ashamed|confused|unseen|unheard|left out|stuck|drained|stretched thin|on edge|uneasy|hopeless|helpless|jealous|guilty|happy|grateful|glad|relieved|excited|proud|loved|calm|thankful|touched|hopeful|content|safe|close to you|annoyed|irritated|rushed|pressured|sore|sick|down|low|flat|raw|hurt and|worn out|burnt out|burned out";
const ACRONYMS="ASAP|ADHD|OCD|PTSD|APD|DLD|DCD|HSP|USA|OK|TV|LOL|LMAO|JK|FYI|ETA|ID|AM|PM|UK|US|NHS|RSD|AuDHD|CEO|HR|IT|PDF|GP|ER|DM|BBQ|NASA|FBI|CIA|NFL|NBA|PTA|IEP|EOD|EOW|EOM|EOY|COB|OOO|TBD|TBC|KPI|KPIS|OKR|OKRS|ROI|PR|PRS|URL|URLS|API|SOP|FAQ|QA|UX|UI|MVP|SLA|NDA|CRM|PTO|WFH|RSVP|CC|BCC|AFK|BRB|IMO|IMHO|TLDR|YTD|QTD|FY|CFO|CTO|COO|CMO|VP|SVP|EVP|CSV|XLS|PPT|SQL|AWS|SEO|RFP|SOW|AI|ML|UAT|QBR|PO|POS|SMS|DMS|ASL|CPA|IRS|DMV|ICU|GPS|PIN|VPN|SSO|MFA|HTML|CSS|JSON";
/* All-caps words that are real words, so they read as shouting. Any other
   2-5 letter all-caps token is most likely an acronym (EOD, KPI, Q3, SOW). */
const SHOUT_WORDS=new Set("NO|YES|NOW|NOT|STOP|WHY|WHAT|WHO|HOW|WHEN|WHERE|DONE|AGAIN|NEVER|EVER|ALL|YOU|YOUR|THIS|THAT|THE|AND|BUT|ARE|WAS|DID|DONT|CANT|WONT|GET|OUT|OFF|HELLO|HEY|RIGHT|WRONG|VERY|REAL|MEAN|HATE|LOVE|SICK|TIRED|LATE|FINE|JUST|ONLY|EVEN|STILL|MUST|NEED|HAVE|HAS|HAD|WILL|CAN|READ|LOOK|HERE|THERE|NEXT|LAST|FIRST|EVERY|ONE|TWO|BIG|DEAL|HELP|CLEAN|CALL|TEXT|MAD|UGH|WOW|GOD|FOR|ONCE|WITH|FROM|THEY|THEM|HER|HIM|SHE|OUR|ANY|SOME|BACK|DOWN|OVER|MORE|LESS|MOST|SAID|TOLD|ASK|ASKED|KNOW|SEE|SAY|SAYS|WANT|NEEDS|GOT|MAKE|TAKE|GIVE|COME|WORK|HOME|SURE|OKAY|WAIT|DO|GO|ME|MY|SO|UP|IS|BE|WE|IF|OF|TO|IN|ON|AT|OR|AN|OMG|WTF|FFS|PLS|PLZ|YET|WHOLE|EXACT|NOTE|BOTH|THEN|THAN|WELL|GOOD|BAD|BEST|WORST|TODAY|THING|STUFF|LIKE|ALSO|MUCH|MANY|SUCH|ELSE|NICE|COOL|GREAT|SERIOUSLY|ALWAYS".split("|"));
const ACR_SET=new Set(ACRONYMS.toUpperCase().split("|"));
/* spans of all-caps words that read as shouting */
function shoutSpans(text){
  const out=[]; const re=/\b[A-Z]{2,}\b/g; let m;
  const alpha=(text.match(/\b[A-Za-z]{2,}\b/g)||[]);
  const caps=alpha.filter(w=>/^[A-Z]+$/.test(w) && !ACR_SET.has(w));
  const mostlyCaps = alpha.length>=3 && caps.length/alpha.length>=0.6;
  while((m=re.exec(text))!==null){
    const w=m[0];
    if(ACR_SET.has(w)) continue;
    if(w.length<3 && !mostlyCaps) continue;
    if(w.length>=6 || SHOUT_WORDS.has(w) || mostlyCaps) out.push({s:m.index, e:m.index+w.length, w});
  }
  return out;
}
/* chat and group channels are written, like a text */
function chBase(ch){ return ch==="chat"||ch==="group" ? "text" : (ch||"person"); }
const WRITTEN = ["text","chat","email","group"];
/* Common verbs that can open a bare command ("Take out the trash.") */
const VERBS = ("take|put|get|go|come|clean|wash|stop|give|bring|call|text|send|pick|grab|move|do|make|fix|tell|help|listen|turn|shut|close|open|sit|stand|wait|answer|finish|start|pay|buy|check|remember|leave|keep|hurry|eat|drink|try|write|read|say|show|empty|fold|feed|walk|change|hang|throw|sweep|vacuum|mop|wipe|tidy|clear|load|unload|set|book|email|reply|respond|quit|cut|knock|focus|drive|park|lock|charge|ask|deal|be|speak|talk|watch|apologize|apologise|explain|admit|think|remind|return|share|use|water|cook|prepare|plan|schedule|fill|sign|submit|print|file|sort|organize|organise|pack|unpack|mow|rake|shovel|feed|bathe|dress|brush|drop|lower|raise|quiet|hold|follow|come|run|look|put|let|stay|mind|pull|push|lift|carry|fetch|find|search|study|practice|practise|pay|return|cancel|confirm|update|finish|respond|join|meet|move|hand|sweep|scrub|dust|iron|replace|refill|restock|recycle|sit|go|hang|pour|wake|sleep|get|answer").split("|");
const VERBSET = new Set(VERBS);
/* Openers that start with a verb but are not commands */
const NOT_CMD = /^(?:let's|let us|thank|thanks|take care|have (?:a|an|fun|a good|a great|a nice)|feel free|enjoy|sleep well|get well|drive safe|see you|love you|miss you|hope|welcome|congrats|good|sorry|excuse|pardon|bless|trust me|imagine|guess what|say hi|come on in|keep up the good|keep it up|don't worry|don't mind|no worries|mind you|look forward|go team|go you|be well|be safe|be kind to yourself|take your time|call me when|text me when|talk soon|talk later)/i;

/* Irregular and common past forms back to the base verb */
const PAST = {took:"take",did:"do",made:"make",put:"put",went:"go",got:"get",brought:"bring",fed:"feed",gave:"give",bought:"buy",paid:"pay",told:"tell",said:"say",left:"leave",ran:"run",wrote:"write",threw:"throw",swept:"sweep",hung:"hang",shut:"shut",used:"use",moved:"move",shared:"share",closed:"close",changed:"change",organized:"organize",replaced:"replace",placed:"place",taken:"take",done:"do",gotten:"get",emptied:"empty",tidied:"tidy",folded:"fold",loaded:"load",unloaded:"unload",vacuumed:"vacuum",cleaned:"clean",mopped:"mop",stopped:"stop",planned:"plan",texted:"text",called:"call",answered:"answer",listened:"listen",remembered:"remember",noticed:"notice",asked:"ask",offered:"offer",checked:"check",helped:"help",walked:"walk",washed:"wash",picked:"pick",watered:"water",started:"start",finished:"finish",fixed:"fix",returned:"return",showed:"show",shown:"show",handled:"handle",scheduled:"schedule",booked:"book",wiped:"wipe",written:"write",given:"give",seen:"see",saw:"see",known:"know",knew:"know",been:"be",was:"be",were:"be",gone:"go",come:"come",came:"come",sent:"send",spent:"spend",kept:"keep",let:"let",set:"set",read:"read",hid:"hide",hidden:"hide",broke:"break",broken:"break",forgot:"forget",forgotten:"forget",ate:"eat",eaten:"eat",drove:"drive",driven:"drive",held:"hold",found:"find",thought:"think",taught:"teach",caught:"catch",sold:"sell",stood:"stand",sat:"sit",woke:"wake",woken:"wake",lost:"lose",meant:"mean",met:"meet",heard:"hear",slept:"sleep",tried:"try",replied:"reply",cried:"cry",worried:"worry",dried:"dry",fried:"fry",carried:"carry",hurried:"hurry",copied:"copy",apologized:"apologize",mentioned:"mention",locked:"lock",turned:"turn",poured:"pour",filled:"fill",signed:"sign",printed:"print",submitted:"submit",dropped:"drop",planned:"plan",emailed:"email",shopped:"shop",mowed:"mow",fed:"feed",ironed:"iron",dusted:"dust",scrubbed:"scrub",packed:"pack",unpacked:"unpack",watched:"watch",cooked:"cook",prepared:"prepare",confirmed:"confirm",cancelled:"cancel",canceled:"cancel",updated:"update",joined:"join",refilled:"refill",recycled:"recycle",hung:"hang",included:"include",invited:"invite",warned:"warn",reminded:"remind",looked:"look",stayed:"stay",showered:"shower",charged:"charge",parked:"park"};
function baseVerb(w){
  const l = w.toLowerCase();
  if(PAST[l]) return PAST[l];
  if(/ied$/.test(l)) return l.slice(0,-3)+"y";
  if(/(?:sh|ch|ck|lk|nt|st|rk|lp|mp|ay|ey|ow|rn|wn|ll|ss|rd|ld|nd|rm|lm|wl|rl|sk|sp|ft|pt|xt)ed$/.test(l)) return l.slice(0,-2);
  if(/([bdgmnprt])\1ed$/.test(l)) return l.slice(0,-3);
  if(/ed$/.test(l)) return l.slice(0,-1);   // "used" -> "use", "placed" -> "place"
  return w;
}
function baseForm(clause){ return clause.replace(/^(\w+)/, w=>baseVerb(w)); }
/* first word of a clause to its -ing form ("forget" -> "forgetting") */
function ingForm(clause){
  return clause.replace(/^(\w+)/, w=>{
    const l=w.toLowerCase();
    const irr={be:"being",see:"seeing",lie:"lying",die:"dying",tie:"tying",forget:"forgetting",get:"getting",put:"putting",set:"setting",let:"letting",cut:"cutting",run:"running",sit:"sitting",stop:"stopping",shop:"shopping",plan:"planning",drop:"dropping",swim:"swimming",begin:"beginning",hit:"hitting",quit:"quitting",text:"texting",mop:"mopping",nag:"nagging",chat:"chatting",jog:"jogging",skip:"skipping",hug:"hugging",wrap:"wrapping",refer:"referring",admit:"admitting",submit:"submitting",commit:"committing",interrupt:"interrupting"};
    if(irr[l]) return irr[l];
    if(/ie$/.test(l)) return l.slice(0,-2)+"ying";
    if(/[^aeiou]e$/.test(l) && l!=="be") return l.slice(0,-1)+"ing";
    return l+"ing";
  });
}

/* Things that count as a when */
const WHEN_RE = /\[a time\]|\[by when\]|\b(?:by|before|after|at|on|until|around|from)\s+(?:\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?|o'clock)?|noon|midnight|tonight|tomorrow|today|(?:mon|tues|wednes|thurs|fri|satur|sun)day|the weekend|the end of (?:the )?(?:day|week|month)|end of (?:the )?(?:day|week|month)|dinner|lunch|breakfast|work|school|bedtime|pickup|pick-up|the meeting|the game|this (?:morning|afternoon|evening|week|weekend)|next (?:week|month|\w+day))\b|\b(?:tonight|today|tomorrow|this (?:morning|afternoon|evening|week|weekend)|(?:on )?(?:mon|tues|wednes|thurs|fri|satur|sun)day|next week|in (?:\d+|an?|ten|five|fifteen|twenty|thirty|a few|two|three) (?:minutes?|mins?|hours?|days?)|right after \w+|after (?:dinner|lunch|breakfast|work|school)|before (?:bed|dinner|work|school|you leave|we leave)|this time|every (?:mon|tues|wednes|thurs|fri|satur|sun)day|(?:for |in )?(?:an?|one|two|three|\d+|a few|ten|twenty|thirty|fifteen) (?:hours?|minutes?|mins?)|(?:an?|one|\d+) hour)\b|\b\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)\b|\b(?:eod|eow|eom|eoy|cob|close of business|end of (?:the )?(?:day|week|month|year)|first thing (?:tomorrow|in the morning|monday)|(?:by|before|in|for) q[1-4])\b/i;
const WHY_RE = /\b(?:because|since (?:i|we|you|it|the|my|our)|so (?:that|we|i|you|it)|the reason|as (?:i|we)'m|as (?:i|we) (?:have|need|want)|which (?:means|helps)|that way|it (?:helps|would help) (?:me|us)|it matters (?:to me )?because|it means a lot)\b/i;

/* ============================================================
   FEATURES
   kind: "static" = may add static, "good" = worth keeping
   what: what the structure does (for most listeners)
   fix: the plain move
   ============================================================ */
const F = [
  /* ---------- pressure and commands ---------- */
  {id:"oblig", name:"Pressure word (need to, have to, must)", kind:"static",
   re:/\byou(?:'re|'re| were) (?:really |just |still )?(?:supposed|required|expected) to\b|\b(?:you|u)(?:'ll)?\s+(?:really\s+|seriously\s+|just\s+|absolutely\s+|honestly\s+|actually\s+|still\s+|definitely\s+)?(?:need to|needs to|have to|has to|have got to|'ve got to|got to|gotta|must(?!\s+(?:be|have|'ve)\s+(?:tired|exhausted|busy|hungry|so\b|really|joking|kidding|starving|freezing|proud|excited|thrilled|happy|sad|upset|worn|stressed|feeling|sore|nice|been|had|thought|known|seen|heard|felt|forgotten|missed|a\b|the\b))|ought to|had better|'d better|better(?= (?:not |be |get |go |come |call |stop |clean |start |finish |do |make |pay |text |tell ))|are supposed to|'re supposed to|were supposed to|are required to|'re required to|are expected to|'re expected to)\b|\b(?:i|we) (?:really |just |still )?need you to\b|\bi (?:really )?want you to\b|\bmake sure (?:you|to)\b/gi,
   what:"\"You need to,\" \"have to\" and \"must\" turn a request into a requirement. The listener hears an order, and sometimes a statement about what is wrong with them, instead of an ask they can say yes to.",
   fix:"Ask instead of require: \"Could you…?\" or \"Would you be up for…?\" Add a when, and a reason if it helps."},
  {id:"should", name:"\"You should\"", kind:"static",
   re:/\byou (?:really |seriously |just |honestly |definitely |probably |totally )?(?:should|shouldn't|should not)(?!\s*(?:have|'ve|of)\b)\b/gi,
   what:"\"Should\" sounds like a rule the listener is failing. It can be advice, a hint or a judgment, and the listener has to guess which.",
   fix:"Say it as a request or an offer: \"Would you be willing to…?\" or \"Want me to show you…?\""},
  {id:"shouldhave", name:"Hindsight blame (\"you should have\")", kind:"static",
   re:/\byou (?:really |seriously |just )?(?:should|shouldn't|should not|could|could not|couldn't)(?: have|'ve| of)\s+\w+/gi,
   what:"\"You should have\" is about a past that can't be changed. The listener can only defend or apologize, and there is nothing to do next.",
   fix:"Turn it toward next time: \"Next time, could you…?\" or say how it affected you: \"It was hard for me when…\""},
  {id:"impera", name:"Bare command", kind:"static", re:null,
   what:"A sentence that starts with the action (\"Take out the trash.\") is a command. Between adults it can land as an order, depending on the tone around it.",
   fix:"Turn it into a request with a when: \"Could you take out the trash before 8?\""},
  {id:"cannot", name:"\"Can you not…\"", kind:"static",
   re:/\b(?:can|could) you not\b|\bcan't you\b(?! (?:tell|see) (?:me|if)\b)/gi,
   what:"\"Can you not…\" is a question on the surface and irritation underneath. It says what not to do, but not what to do instead.",
   fix:"Say what you would like instead: \"Could you put the dishes in the dishwasher?\""},
  {id:"blameq", name:"Blame dressed as a question", kind:"static",
   re:/\b(?:why (?:didn't|don't|can't|won't|wouldn't|haven't|aren't|isn't|do you always|do you keep|would you|did you|are you (?:being|so|always)|on earth)|what's wrong with you|what is wrong with you|what's your problem|what is your problem|how (?:hard|difficult) (?:is|can) it|how many times|what were you thinking|what did you expect|who does that|how could you|do i have to do everything|is it (?:really )?(?:too much|so hard) to ask|do you (?:even|ever) (?:care|listen|think|try|notice|help|clean|want)|did you (?:even )?(?:think|try|listen|bother)|are you (?:serious|kidding(?: me)?|even listening|even trying)|why (?:is|are|was|were) (?:this|that|it|these|those|the [\w-]+|my [\w-]+|our [\w-]+|your [\w-]+) (?:still )?not|why (?:isn't|aren't|hasn't|haven't) (?:this|that|it|these|those|the [\w-]+|my [\w-]+|our [\w-]+|your [\w-]+))\b|\b(?:seriously|really)\?/gi,
   what:"A \"why didn't you\" question usually isn't asking for a reason. It carries a complaint, and the listener has to pick between answering the question and answering the complaint.",
   fix:"Say the request underneath the question: \"Next time, could you…?\""},
  /* ---------- blame and verdicts ---------- */
  {id:"label", name:"Label on the person", kind:"static",
   re:new RegExp("\\byou(?:'re| are| were|'ve been| have been| can be| sound like| sound) (?:so |such an? |being |acting |really |just |always |too |totally |completely |kind of |a bit |a little )*(?:"+LABEL_WORDS+")\\b|\\bhow (?:"+LABEL_WORDS+")\\b|\\b(?:that was|that's|this is|that is) (?:so |such an? |really |just |totally )?(?:"+LABEL_WORDS+") (?:of you|thing to do)\\b|\\byou (?:idiot|moron|slob|baby|child)\\b","gi"),
   what:"A word about who the person is (\"lazy,\" \"selfish\") turns one event into a verdict on their character. A verdict can't be fixed, so people defend against it instead of hearing the event.",
   fix:"Name what happened and how it affected you, not what kind of person they are."},
  {id:"absolute", name:"Absolute or generalization", kind:"static",
   re:/\b(?:always|never|every (?:single )?time|every (?:single )?day|constantly|all the time|nothing ever|no one ever|nobody ever|nobody (?:else )?(?:cares|helps|listens|does|thinks|ever)|no one (?:else )?(?:cares|helps|listens|does|thinks)|everyone (?:else )?(?:knows|can|does|thinks|manages|sees)|everybody (?:else )?(?:knows|can|does|thinks|manages|sees)|all you (?:ever )?do|you do nothing|nothing (?:i do|you do|gets done|changes|works)|forever)\b/gi,
   what:"\"Always,\" \"never\" and \"everyone\" erase every exception. The listener remembers the time it didn't happen and argues that, and the real point gets lost.",
   fix:"Swap the absolute for one specific, recent example."},
  {id:"madefeel", name:"Blame for a feeling (\"you made me…\")", kind:"static",
   re:/\byou (?:made|make|are making|'re making|have made|'ve made|keep making) me (?:feel (?!(?:so )?(?:loved|happy|special|safe|welcome|seen|heard|proud|better|good|great|calm|at home|cared))\w+|so (?:angry|mad|sad|upset|anxious|stressed|frustrated|furious)|(?:angry|mad|sad|upset|anxious|nervous|crazy|insane|cry|furious|miserable|late|miss \w+|lose \w+|wait|worry|look (?:stupid|bad|foolish|like \w+)|do this|say that|yell|snap))\b|\bbecause of you,? (?:i|we)\b|\b(?:it's|this is|that's|it is) (?:all )?your fault\b|\byou (?:ruined|wrecked|spoiled) (?:it|everything|my|our|the)\b/gi,
   what:"\"You made me feel\" puts the feeling on the other person's actions. They end up arguing about whether they caused it, instead of hearing how you feel.",
   fix:"Own the feeling and name the event: \"I felt hurt when…\""},
  {id:"compare", name:"Comparison to someone else", kind:"static",
   re:/\b(?:your|my) (?:sister|brother|mom|mum|mother|dad|father|ex|friend|friends|boss|coworker|co-worker|parents|kids?|son|daughter|cousin|neighbou?r|roommate|colleague)\b[^.!?]{0,40}?\b(?:would(?:n't)?|always|never|does|doesn't|did|can|could|knows|manages|remembers|helps|gets|has)\b|\b(?:be|act) (?:more )?like (?:your|my|a normal|other|everyone|him|her)\b|\b(?:other|normal|most|real|regular) (?:people|kids|husbands|wives|partners|men|women|guys|girls|parents|adults|couples|boyfriends|girlfriends|roommates|coworkers)\b[^.!?]{0,30}?\b(?:would|do|don't|can|manage|know|have|get)\b|\bwhy can't you be more like\b|\bbe normal\b|\beveryone else (?:can|does|manages|gets|knows)\b/gi,
   what:"A comparison moves the topic from the task to the person's worth, and brings a third person into it. The listener hears \"you're not good enough.\"",
   fix:"Leave the other person out. Say what you would like from this person, about this thing."},
  {id:"past", name:"Bringing up the past", kind:"static",
   re:/\b(?:last time|like (?:the )?last time|remember when you|the same thing (?:you did|as last)|you did (?:this|that|the same) (?:before|last)|(?:this|that) is (?:just )?like (?:when|the time)|just like (?:last|when|before|your)|you've done this before|you always do this|here we go again|like you (?:always|did) before|back (?:in|when) (?:\w+ )?you|you did this (?:too|as well|yesterday|last week))\b/gi,
   what:"Bringing in a past event turns one conversation into a trial of the whole history. The listener has to defend old ground, and today's ask gets lost.",
   fix:"Stay with today. One event, one ask. Old patterns can get their own time."},
  {id:"again", name:"\"Again,\" \"still,\" \"even\"", kind:"static",
   re:/\b(?:yet again|once again|again|as usual|like always|still(?= (?:haven't|hasn't|hadn't|didn't|don't|doesn't|won't|can't|isn't|aren't|not|no|there|here|waiting|broken|late|wrong|messy|dirty|full|doing|leaving|forgetting|on (?:your|the) phone)\b)|(?:can't|didn't|don't|won't|couldn't|not|never) even|even bother)\b/gi,
   what:"Small words like \"again,\" \"still\" and \"even\" point to a pattern. They quietly say \"this is who you are,\" so the listener hears the whole history, not today.",
   fix:"Drop them. Talk about this one time."},
  {id:"threat", name:"Conditional threat (\"if you don't…\")", kind:"static",
   re:/\bif you (?:don't|do not|won't|can't|ever|keep|dare|refuse to)\b(?! mind)[^.!?]{1,80}?,?\s*(?:then )?(?:i'm|i'll|i will|i am|we're|we'll|we will|you'll|you will|i swear)\s+(?:be\s+)?(?:leaving|leave|done|out|gone|going to (?:leave|tell|take|stop|cancel|end|move)|tell (?:your|every)|telling (?:your|every|them|him|her|the)|taking (?:away|your|the)|cancel(?:l)?ing|calling (?:your|the)|take (?:away|your|the)|cancel|stop|never|not (?:going|coming|helping|talking)|throw|sell|ground|regret|lose|be sorry|end|kick|break up|move out|finished|over|through)|\bor else\b|\bdon't make me\b|\byou'll regret\b|\blast chance\b|\bor (?:i'm|i'll be) (?:leaving|done|out|going|gone)\b|\bor we're (?:done|over|finished|through)\b|\bthis is your (?:final|last) (?:warning|chance)\b/gi,
   what:"An \"if you don't… then I'll…\" sentence is an ultimatum. The listener stops thinking about the task and starts thinking about the threat: fight, freeze or give in.",
   fix:"Make the ask on its own. If there is a real limit, say it once, calmly, at a calm time, as your own plan, not as leverage."},
  {id:"guilt", name:"Guilt framing", kind:"static",
   re:/\bafter (?:all|everything) (?:i(?:'ve)? (?:do|did|done|have done)|i've done|that i do|i've given)(?: for you)?|\bi do everything\b|\bthe least you (?:could|can) do\b|\byou owe me\b|\bi gave up [^.!?]{0,30}for you\b|\bi(?:'ve| have) sacrificed\b|\bdo you (?:know|have any idea) how (?:hard|much|long) i\b|\bi guess i (?:just )?don't matter\b|\bi work (?:all day|so hard)\b[^.!?]{0,40}?\b(?:and|but) you\b|\bdon't worry about me\b|\bi'll just (?:sit here|wait here|do everything)\b|\bafter all i've done\b|\bi guess i'll just (?:be|stay|sit)\b/gi,
   what:"Guilt framing asks for payment for past effort. The task may get done, but it leaves resentment, and the real ask is buried under the account of what you have given.",
   fix:"Say the load plainly and ask for one thing: \"I'm stretched thin. Could you take…?\""},
  {id:"passive", name:"Blame with no name (passive voice)", kind:"static",
   re:/\b(?:mistakes|errors|things|promises|decisions) (?:were|have been|got) (?:made|broken|missed)\b|\b(?:the|my|our|your) [a-z]+(?: [a-z]+)? (?:was|were|got|has been|have been) (?:left|broken|forgotten|ignored|missed|lost|ruined|damaged|dropped|spilled|scratched|thrown out|eaten|used up|not (?:done|cleaned|fixed|paid|washed|put away|returned|locked))\b|\b(?:it|this|that|nothing|the [a-z]+) (?:didn't|never|still hasn't|hasn't|wasn't) (?:get|got|gets|been) (?:done|fixed|cleaned|paid|washed|finished|sent|put away|locked)\b/gi,
   what:"Passive voice (\"mistakes were made,\" \"the door was left open\") hides who did what. It can sound like a quiet accusation, or like it might not be about the listener at all.",
   fix:"Say what you noticed and what you would like: \"I noticed the door was open. Could you check it when you leave?\""},
  {id:"disclaim", name:"Disclaimer before a hit", kind:"static",
   re:/\b(?:no offen[cs]e(?:,? but)?|i'm just saying|just saying|with (?:all )?(?:due )?respect|don't take this the wrong way|not to be (?:rude|mean|harsh)|i'm not trying to be (?:rude|mean|harsh)(?:,? but)?|i hate to say (?:it|this)|to be (?:brutally )?honest|not gonna lie|no hate,? but|i'm not being funny,? but)\b/gi,
   what:"\"No offense, but\" and \"I'm just saying\" announce that something hurtful is coming, then ask the listener not to mind it. Most people brace, and discount the disclaimer.",
   fix:"Drop the disclaimer. If the point is worth making, make it kindly and plainly."},
  /* ---------- small words ---------- */
  {id:"minim", name:"Minimizer or intensifier", kind:"static",
   re:/\b(?:just(?= (?:do|go|get|put|ask|tell|say|stop|clean|pick|take|call|be|try|make|use|let|leave|finish|fix|wash|text|send|listen|give|bring|move|pay|answer|grow|relax|calm|deal|remember|read|check|look|throw|hang|reply|help|sit|turn|shut|close|open|wait)\b)|(?<=\b(?:you|it's|that's|it is|that is|you're|you are) )just|simply|obviously|clearly|literally|seriously(?!\?)|all you have to do|(?:it's|that's|it is) (?:so |really |not )?(?:easy|simple|hard)(?= to|[,.!]|$)|only takes a (?:second|minute|sec))/gi,
   what:"\"Just,\" \"simply\" and \"obviously\" say the thing should be easy. When it isn't easy for this listener, the word adds shame, and it hides steps that may need saying.",
   fix:"Drop \"just,\" \"obviously\" and \"easy.\" What's easy for one wiring can be real work for another."},
  {id:"urgent", name:"Time pressure without a reason", kind:"static",
   re:/\b(?:right now|immediately|this instant|this second|this minute|asap|a\.s\.a\.p|hurry(?: up)?|urgent(?:ly)?|drop everything)\b|\bnow!+/gi,
   what:"\"Now,\" \"right now\" and \"ASAP\" with no reason can read as an emergency, or as a power move. The listener reacts to the pressure before the task.",
   fix:"Give a real time and the reason: \"by 5, because the office closes then.\""},
  {id:"vtime", name:"Vague timing", kind:"static",
   re:/\b(?:when you get a (?:chance|sec|second|minute|moment)|when you have (?:a (?:sec|second|minute|moment|chance)|time)|when you're free|when you can|whenever|at some point|sometime|eventually|(?<!see you |talk to you |talk |catch you )later(?! on today)|soon|in a bit|in a minute|one of these days|shortly)\b/gi,
   what:"\"Later\" and \"when you get a chance\" are kind, but they leave the time open. One person hears \"tonight,\" the other hears \"this month.\"",
   fix:"Replace vague timing with a real time or cue: \"by 6\" or \"right after dinner.\""},
  {id:"vstd", name:"Undefined standard", kind:"static",
   re:/\b(?:clean(?:ed)? up|tidy(?: up)?|a bit|a little more|properly|the right way|like a normal person|like an adult|help (?:out|more)|do better|be (?:more )?(?:supportive|responsible|considerate|present|helpful|thoughtful|involved|mature|normal)|step up|pitch in|make an effort|try harder|fix (?:it|this)|sort it out|deal with (?:it|this))\b/gi,
   what:"\"Clean up,\" \"help more\" and \"do better\" don't say what finished looks like. The listener can do what they think you meant and still get it wrong.",
   fix:"Define the finish line: exactly what, how much, and what \"done\" looks like."},
  /* ---------- openers and hints ---------- */
  {id:"ominous", name:"Opener with no topic", kind:"static",
   re:/\b(?:we (?:need|have) to (?:have a )?(?:talk|chat|conversation)(?! about)|we need to have a (?:talk|conversation|chat)(?! about)|can we talk(?! about)|can i talk to you(?! about)|i need to talk to you(?! about)|i need to speak (?:to|with) you(?! about)|call me(?= *(?:[.!]|$| now| asap| when))|don't be mad|don't freak out|i have something to tell you|we (?:have|need to discuss) a problem|come here(?:,? now)?|see me|you're in trouble|i need to tell you something|have you got a (?:minute|sec)|got a minute|we should talk(?! about)|can (?:we|i) (?:hop|jump|get) on (?:a )?(?:quick |short )?(?:call|zoom|teams call|video call|meeting)(?! about)|(?:can|could) you (?:come|stop by|pop|swing by|drop by) (?:to |into |by |over to )?my (?:office|desk)(?! about)|can i (?:grab|borrow|steal) you(?: for a (?:minute|sec|second|moment))?|do you have (?:a )?(?:minute|sec|second|moment)(?= *\?| *$))\b/gi,
   what:"\"We need to talk\" signals weight but not the topic. The listener fills the gap, often with the worst case, until the talk happens.",
   fix:"Say what it's about and how serious it is in the same breath."},
  {id:"hint", name:"Hint instead of a request", kind:"static",
   re:/\b(?:it(?: would|'d) be (?:nice|great|good|helpful|lovely) if|(?:someone|somebody|anyone) (?:should|needs to|could|has to|might want to)|i guess i'll just|i'll just do it myself|i wish (?:someone|somebody|you) would|would it kill you|no pressure,? but|if you (?:want|feel like it)|it's (?:so |really )?(?:cold|hot|loud|messy|dark|quiet) in here|the (?:trash|garbage|dishes|laundry|sink|bin|bins|recycling)(?: is| are|'s) (?:full|piling up|overflowing|still there|everywhere|not done))/gi,
   what:"A hint puts the request in the subtext. Some listeners decode it easily. Others hear a statement, answer it as a statement, and the ask is never made.",
   fix:"Turn the hint into a direct request: who, what and by when."},
  {id:"pointed", name:"Pointed work phrase (\"per my last message\")", kind:"static",
   re:/\b(?:per my (?:last|previous|earlier) (?:message|email|e-mail|note|text|comment|reply|slack)|as per my (?:last|previous) (?:message|email|note)|as (?:previously|already) (?:stated|mentioned|discussed|noted|said|communicated|explained)|as i (?:previously|already) (?:stated|mentioned|said|noted|explained)|as stated (?:before|previously|above)|friendly reminder)\b/gi,
   what:"At work, \"per my last message\" and \"as previously stated\" are widely read as a polite way of saying \"you didn't read it.\" The fact gets through, and so does the edge.",
   fix:"Drop the pointer and restate the fact plainly: \"To recap: the deck is due at 5 today.\""},
  {id:"nudge", name:"Nudge with no details (\"any update?\")", kind:"static",
   re:/\b(?:circling back|circle back|just checking in|checking in|just following up|following up|just bumping this|bumping this(?: up)?|any updates?|any news|any word)\b/gi,
   what:"\"Any update?\" and \"circling back\" say you are waiting, but not on what, by when, or why it matters now. Many readers hear pressure or a quiet complaint, and literal readers may not know what to send back.",
   fix:"Name the thing, when you need it, and why: \"Could you send the Q3 numbers by 3 today? I need them for the 4pm review.\""},
  {id:"heat", name:"Heat words (\"for once,\" \"actually,\" \"I'm sick of it\")", kind:"static",
   re:/\bfor once\b|\b(?:i'm|i am)(?: getting)?(?: so| really)? (?:sick|tired) of (?:it|this|that|you|your \w+|doing \w+)\b|\b(?:can|could|will|would) you (?:please )?actually\b|\bfor (?:god's|heaven's|pete's) sake\b|\bfor crying out loud\b/gi,
   what:"\"For once\" and \"actually\" inside a request, or \"I'm sick of it,\" carry the anger in the wording. The listener hears the heat before the ask.",
   fix:"Take the heat words out. If you are frustrated, say so once, plainly: \"I'm frustrated about this.\""},
  {id:"sarcasm", name:"Possible sarcasm", kind:"static",
   re:/\b(?:oh,? (?:great|wonderful|perfect|nice|fantastic|lovely|good|sure)|yeah,? right|thanks a lot|thanks for nothing|(?:nice|great|good) (?:job|work|one)(?=[.!,]*$)|just (?:perfect|great|wonderful|what i needed)|real(?:ly)? (?:mature|helpful|nice)|wow,? (?:thanks|great|ok|just wow)|sure you (?:did|are|will|do)|what a surprise|big surprise|shocker|how (?:nice|lovely|thoughtful) of you|i'm so (?:thrilled|glad|happy) for you|love that for (?:me|us)|must be nice|good for you(?=[.!]*$)|well,? (?:that's|isn't that) (?:just )?(?:great|perfect|lovely))\b/gi,
   what:"Sarcasm carries the real message in the tone, the opposite of the words. That is the easiest signal to lose, and the easiest to over-hear.",
   fix:"Say the real message plainly. Sarcasm carries its meaning in tone, which is the easiest signal to lose or to over-amplify."},
  {id:"idiom", name:"Figure of speech", kind:"static", re:new RegExp("\\b(?:"+IDIOMS.join("|")+")\\b","gi"),
   what:"A figure of speech says one thing and means another. Most listeners translate it without effort, but some take it literally, especially under stress.",
   fix:"Swap the figure of speech for the literal meaning."},
  /* ---------- tone on the page ---------- */
  {id:"minimal", name:"Minimal reply", kind:"static", whole:true,
   re:/^\s*(?:(?:k|kk|ok|okay)[,\s]+(?:thx|thanks|ty|thank you)|fine|k|kk|ok|okay|sure|whatever|noted|cool|great|i'm fine|it's fine|nothing|nvm|never ?mind|if you say so|yep|yeah|mhm|good|right|wow|alright|all right)\s*[.!]*\s*$/gi,
   what:"A one-word reply can mean \"yes, all good\" or \"I'm upset and done talking.\" The word is the same. The listener has to guess which.",
   fix:"Add the half that's missing: whether it's really fine, or whether you need a minute."},
  {id:"period", name:"Full stop on a short text", kind:"static", chOnly:["text"], re:null,
   what:"On a short text, a final period can read as clipped or cold to some readers.",
   fix:"On short texts, drop the final period, or add a warm word. Periods on one-word texts read as less sincere."},
  {id:"ellipsis", name:"Trailing dots", kind:"static", re:/\.{3,}|…/g,
   what:"Trailing dots leave something unsaid, and the listener fills it in.",
   fix:"Finish the thought. Trailing dots leave the listener to guess what's unsaid."},
  {id:"shout", name:"All caps or stacked punctuation", kind:"static",
   re:/[!?]{2,}/g,
   what:"Capitals and \"!!!\" or \"??\" read as volume. The listener reacts to the shouting before the words.",
   fix:"Lower the volume. Capitals and stacked punctuation read as shouting."},
  {id:"calm", name:"Telling someone how to feel", kind:"static", re:/\b(?:calm down|relax|chill(?: out)?|get over it|stop (?:crying|overreacting|being (?:so )?\w+)|grow up|deal with it|let it go|move on|just (?:drop|forget) it|snap out of it|cheer up|smile)\b/gi,
   what:"Being told how to feel rarely changes the feeling. It usually adds a second feeling: not being taken seriously.",
   fix:"Offer a break or name what you see instead of instructing a feeling."},
  {id:"invalid", name:"Invalidation", kind:"static", re:/\b(?:overreacting|too sensitive|so sensitive|being dramatic|making a (?:big )?deal|(?:it's|that's) not (?:a )?big deal|you're imagining (?:it|things)|that's not what happened|you're being (?:silly|irrational|ridiculous)|it was (?:just )?a joke|can't (?:you )?take a joke|you always take things)\b/gi,
   what:"Invalidation moves the topic from what happened to whether the reaction is allowed.",
   fix:"Acknowledge how it landed before explaining how you meant it."},
  {id:"multi", name:"Several asks at once", kind:"static", re:null,
   what:"Several tasks in one breath compete for the same working memory. The first or last one sticks, and the rest slip.",
   fix:"Send several tasks as a written list, or give them one at a time."},
  {id:"long", name:"Long message or sentence", kind:"static", re:null,
   what:"A long message or a long sentence buries the ask. The listener may skim and miss the line that mattered.",
   fix:"Lead with the ask or headline, then keep the rest short."},
  {id:"questions", name:"Stacked questions", kind:"static", re:null,
   what:"Several questions at once can feel like an interrogation, and the listener often answers only the last one.",
   fix:"Ask one question, then wait for the answer."},
  {id:"critic", name:"Criticism", kind:"static", re:/\b(?:wrong|mistake|messed up|screwed up|failed|forgot|forgotten|disappoint(?:ed|ing)|annoy(?:ed|ing)|frustrat(?:ed|ing)|sick of|tired of|fed up|ruined|a mess|messy|late again|useless|you're late)\b/gi,
   what:"Correction about a task is often heard as a judgment of the person, especially without a next step.",
   fix:"Name one behavior and one next step, and say you're on the same side."},
  {id:"reassure", name:"Reassurance check", kind:"static", re:/\b(?:are you (?:mad|angry|upset|annoyed)(?: at me| with me)?|did you (?:lock|turn off|check|unplug)|are you sure|is (?:it|that|this) (?:ok|okay|alright)|are we (?:ok|okay|good)|do you still (?:love|like)|promise me)\b/gi,
   what:"A plain question that needs a plain answer.",
   fix:"If this is a repeat question, agree together on how to answer it."},
  {id:"vemo", name:"Feelings with no specifics", kind:"static", re:/\b(?:you know what you did|you know why|figure it out|i shouldn't have to (?:tell|ask) you|if you (?:really |actually )?cared|you should (?:already )?know|read between the lines|think about it|you know what i mean|you're not (?:there|present) for me)\b/gi,
   what:"The grievance is implied but never named, so the listener has to reconstruct the case, and will likely get it wrong.",
   fix:"Say the specific event and the feeling: \"When X happened, I felt Y.\""},
  {id:"feellike", name:"\"I feel like you…\" (a thought, not a feeling)", kind:"static", re:/\bi feel (?:like|that) you\b/gi,
   what:"\"I feel like you…\" usually introduces a judgment about the other person, not a feeling. The listener hears the judgment.",
   fix:"Name the actual feeling and the event: \"I felt lonely when…\""},
  {id:"feelingq", name:"Open feelings question", kind:"static", re:/\b(?:how (?:does|did) (?:that|it|this) make you feel|how do you feel(?: about)?|what are you feeling|tell me how you feel|why are you (?:upset|sad|angry|mad|quiet|like this)|what's wrong\?)/gi,
   what:"An open \"how do you feel?\" can feel like a test with no right answer, especially for someone who finds feelings hard to name.",
   fix:"Offer options (\"More tired, or more annoyed?\") or ask about the body and what would help."},
  {id:"hyper", name:"Exaggeration", kind:"static", re:/\b(?:literally dying|i'm dying|kill (?:you|me|him|her)|going to die|a million times|takes forever|the worst(?: ever)?|i could (?:kill|murder)|dead to me|i'm done|i can't even|losing my mind)\b/gi,
   what:"Exaggeration says the size of the feeling, not the size of the facts. Some listeners take it literally, and others find it alarming.",
   fix:"Say the true size of it. Exaggeration reads as literal to some listeners and alarming to others."},
  {id:"joke", name:"Joke marker", kind:"static", re:/\b(?:lol|lmao|jk|haha+|hehe|just kidding|kidding)\b|😂|🙃|😉|🙄|😒|😅|🤣/gi,
   what:"\"lol\" and emojis can soften a message, or cover a real complaint. The listener has to guess which.",
   fix:"If it's a joke about something real, say the real part plainly too."},
  {id:"tone", name:"Policing tone or face", kind:"static", re:/\b(?:look at me(?: when i'm talking(?: to you)?)?|(?:watch|lose) (?:your|that) tone|don't (?:use|give me) that (?:tone|look)|your tone|that tone|wipe that look|what's (?:that|with that) face|why are you making that face|stop (?:sighing|rolling your eyes)|don't look at me like that)\b/gi,
   what:"Commenting on someone's face or tone moves the conversation from the words to the delivery.",
   fix:"Respond to the words, not the delivery. If the delivery worries you, ask what it means."},
  {id:"demand", name:"Demand for an instant reply", kind:"static", re:/\b(?:say something|answer me|talk to me|are you ignoring me|why aren't you (?:answering|responding|replying|saying anything)|hello\?+|well\?+)(?=\W|$)/gi,
   what:"Demanding an answer now takes away thinking time. Some people need that time to find the words at all.",
   fix:"Offer time: \"Take your time, I'm here when you're ready.\""},
  {id:"butc", name:"Compliment followed by \"but\"", kind:"static", re:/\b(?:good|great|nice|love|like|appreciate|thanks|thank you|well done)\b[^.!?]{0,60}?\bbut\b/gi,
   what:"A compliment followed by \"but\" often makes the compliment sound like packaging. The listener hears only what came after the \"but.\"",
   fix:"Keep the compliment and the correction in separate sentences, or separate moments."},
  {id:"already", name:"\"I already told you\"", kind:"static", re:/\b(?:i (?:already )?(?:told|said|asked|explained)(?: you)?(?: this| that)? (?:already|before|twice)|i already (?:told|said|asked|explained)|as i (?:said|mentioned|wrote|told you)|like i said|did you (?:even )?read|it's in the (?:email|text|message))\b/gi,
   what:"\"I already told you\" frames a missed message as a character flaw rather than a channel problem.",
   fix:"Assume it didn't arrive intact and resend it in a better channel."},
  {id:"hedge", name:"Hedged answer", kind:"static", re:/\b(?:i think|probably|pretty sure|should be|might have|not sure|i guess|i believe|possibly)\b/gi,
   what:"A hedge keeps the question open. For some listeners that is fine. For others, an open question keeps looping.",
   fix:"If you know, say it plainly. If you don't, say what you'll do to find out."},
  {id:"softno", name:"Soft no", kind:"static", re:/\b(?:we'll see|maybe|i'll think about it|perhaps|we can talk about it)\b/gi,
   what:"\"We'll see\" can mean no, or a real maybe. The listener picks one, and may pick wrong.",
   fix:"If it's a no, say no kindly. If it's a real maybe, say when you'll decide."},
  {id:"stopask", name:"\"Stop asking\"", kind:"static", re:/\b(?:stop asking(?: me)?|you already asked(?: me)?|i already answered|not this again)\b/gi,
   what:"It ends the question without settling it, so the worry behind it stays.",
   fix:"Use a kind, agreed-on script for repeat questions instead of shutting them down."},
  {id:"tic", name:"Commenting on a movement or sound", kind:"static", re:/\b(?:stop (?:doing|making) that|quit (?:it|doing that)|can't you (?:just )?stop|stop (?:twitching|blinking|sniffing|clearing your throat|making (?:that |those )?noises?|fidgeting|rocking|tapping|humming|flapping)|do you have to do that|what are you doing with your (?:hands|face))\b/gi,
   what:"A movement or sound may be a tic or a stim, not a message. Commenting on it can add shame and make it more likely.",
   fix:"Leave the movement or sound alone. A tic or stim isn't a message."},
  {id:"nowhen", name:"Ask with no when", kind:"static", re:null,
   what:"The ask is there, but not the time. \"Could you call the dentist?\" can mean today or next month.",
   fix:"Add a time or a cue: \"before Friday\" or \"after dinner.\""},

  /* ---------- worth keeping ---------- */
  {id:"istate", name:"I-statement", kind:"good",
   re:/\b(?:i feel|i felt|i'm feeling|i was feeling|i'd like|i would like|i'd love|i would love|i need (?!you to|to talk)(?:a |an |some |help|space|time|a hand|a break|to know|to hear|more|us|you)|i noticed|i've noticed|i'm noticing|it matters to me|for me,|i'm worried|i'm hoping|i was hoping|i want us to|i miss|i care about|i'm struggling|i'm finding)\b/gi,
   what:"Talking from your side (\"I felt,\" \"I'd like\") tells them what is going on for you without a verdict on them.",
   fix:"Keep it."},
  {id:"feeling", name:"A named feeling", kind:"good",
   re:new RegExp("\\bi(?:'m| am| was| felt| feel| get| got| have been|'ve been| am feeling|'m feeling| was feeling)(?: so| really| a bit| a little| kind of| pretty| very| quite)? (?:"+FEELINGS+")\\b","gi"),
   what:"A feeling word gives the listener the information tone would otherwise have to carry.",
   fix:"Keep it."},
  {id:"clearask", name:"A request (not an order)", kind:"good",
   re:/\b(?:could you(?! not)|would you(?! (?:even|ever|rather not))|can you(?! not| even| believe)|will you(?! ever| stop)|would you mind|would you be (?:up for|willing|able|ok|okay)|are you (?:able|free|up for|willing)|is it (?:ok|okay|alright) if|do you have time to|please (?=[a-z]))/gi,
   what:"A real request leaves room for yes, not now, or a question. Most people cooperate more with a request than an order.",
   fix:"Keep it."},
  {id:"when", name:"A when", kind:"good", re:null,
   what:"A time or a cue closes the loop. Everyone knows when the ask is due.",
   fix:"Keep it."},
  {id:"reason", name:"A reason", kind:"good", re:null,
   what:"A reason turns an instruction into shared information. Many people find a request easier to act on when they know why.",
   fix:"Keep it."},
  {id:"standing", name:"A standing request (\"going forward\")", kind:"good",
   re:/\b(?:going forward|moving forward|from now on|in (?:the )?future|next time|from here on)\b/gi,
   what:"\"Going forward\" says this is a new habit, not a one-off job with a deadline, so it doesn't need a time. A short reason helps it stick.",
   fix:"Keep it."},
  {id:"appreciation", name:"Appreciation", kind:"good",
   re:/\b(?:thank you|thanks(?! a lot| for nothing)|i appreciate|i'm grateful|i love (?:that|how|it when|you)|it means a lot|that helped|you're great at|i noticed you (?:did|took|made|cleaned))\b/gi,
   what:"Naming what went well tells the listener they are not only being corrected.",
   fix:"Keep it."},
  {id:"softener", name:"A softener", kind:"good",
   re:/\b(?:would you mind|if that works(?: for you)?|if that's (?:ok|okay|alright)|if you're up for it|no worries if not|i know you're busy|is that (?:ok|okay|alright)|does that work|when you're ready|no rush|if you can)\b/gi,
   what:"A softener lowers the pressure without hiding the ask.",
   fix:"Keep it."},
  {id:"choice", name:"An offer of choice", kind:"good",
   re:/\b(?:or would you rather|would you rather|either [^.!?]{1,40} or|which (?:works|would you prefer|do you prefer)|what works (?:better|best|for you)|up to you|your call|if not,? (?:that's|it's) (?:ok|okay|fine|alright)|or we could|is there a better time|what would help|what time works|or if you'd prefer|if you'd prefer)\b/gi,
   what:"A choice keeps the listener in charge of part of it. That lowers pressure and makes a yes more real.",
   fix:"Keep it."},
  {id:"repair", name:"Owning your part", kind:"good",
   re:/\b(?:i'm sorry|i am sorry|i apologi[sz]e|my part|i was wrong|i should have|i shouldn't have|i messed up|that's on me|my fault|my mistake)\b/gi,
   what:"Owning your part first makes it much easier for the other person to own theirs.",
   fix:"Keep it."}
];
const FBY = Object.fromEntries(F.map(f=>[f.id,f]));

/* ============================================================
   WIRINGS
   receive[feature] = [weight 0-3, what they may hear, why]
   channel-limited entries use {w,h,y,ch:[...]}
   ============================================================ */
const NT = {
 nt:{name:"Neurotypical", group:"nd", short:"neurotypical",
  sum:"Reads the words, tone, face and context together, and tends to trust tone over words. Expects some indirectness, and may read hidden meaning into plain statements.",
  receive:{
   minimal:[2,"They're annoyed with me.","Without softeners, short replies read as cold. Neurotypical listeners fill the gap with tone."],
   period:[1,"That period feels curt.","One-word texts ending in a period were rated less sincere in a study of 126 students (Gunraj et al.)."],
   sarcasm:[1,"They're being snide.","Neurotypical listeners usually catch sarcasm, and they feel its edge."],
   label:[3,"They think I'm a bad person.","A label turns a problem into a verdict on character."],
   absolute:[2,"Nothing I do counts.","\"Always\" and \"never\" erase every counterexample, so the listener argues the exception instead of the point."],
   blameq:[2,"I'm being accused.","\"Why didn't you\" is heard as an accusation, not a request for information."],
   ominous:[2,"Something bad is coming.","The weight is signaled but the topic isn't, so the listener braces."],
   calm:[2,"My feelings don't count.","Being told how to feel rarely changes the feeling and usually adds resentment."],
   invalid:[3,"I'm the problem for feeling this.","Invalidation shifts the topic from what happened to whether the reaction is allowed."],
   tone:[2,"They're policing my face instead of hearing me.","Commenting on delivery moves the argument to delivery."],
   butc:[1,"The compliment was just packaging.","Listeners often discount everything before \"but.\""],
   ellipsis:[1,"There's something they're not saying.","Trailing dots signal withheld meaning."],
   shout:[2,"They're yelling at me.","Capitals and stacked punctuation read as volume."],
   critic:[1,"They're disappointed in me.","Correction about a task is often heard as a judgment of the person."],
   vemo:[2,"I'm supposed to guess, and I'll get it wrong.","Unnamed grievances leave the listener to reconstruct the case."],
   hint:[0,"A polite request.","Indirect requests are normal in neurotypical culture and usually decoded without effort."],
   joke:[0,"Probably light-hearted.","Joke markers usually work as intended, unless they're covering something real."],
   hyper:[0,"Exaggeration for effect.","Usually understood as not literal."],
   demand:[2,"I'm being pressured.","Demanding a reply turns a conversation into a test."],
   urgent:[1,"Something's wrong.","Urgency without a reason raises alarm."],
   already:[1,"I'm being told I'm not listening.","It frames a missed message as a character flaw."],
   softno:[0,"Probably a polite no.","Neurotypical listeners often hear \"we'll see\" as a soft no."],
   stopask:[1,"I'm being shut out.","It ends the conversation without resolving it."],
   tic:[1,"I'm being corrected in public.","Commenting on someone's movements draws attention to them."]
  },
  ch:{text:"On text, tone lives in punctuation and length. Short or clipped messages get decoded for mood.", email:"Formal or brief emails can read as cold. Add one warm line.", person:"Face and tone will carry as much as the words. Make sure they match.", phone:"Tone of voice carries most of the message on a call."},
  tips:["Add the social layer a blunt message is missing: a reason, a softener, a warm word.","Say out loud what your face or tone might not be showing.","Announce pauses: \"Give me a minute to think.\"","If you're brief by habit, tell them once so they stop decoding it."],
  meant:{hint:"Probably a polite request. Indirect wording is how many neurotypical speakers soften an ask.",sarcasm:"Probably frustration, made lighter or sharper with irony.",minimal:"Could be fine, or could mean \"ask me later.\" Tone would carry the rest.",ominous:"Something serious, worded this way to signal its weight.",vtime:"A soft deadline, often sooner than the words suggest.",softno:"Possibly a polite no.",joke:"Probably signaling friendliness."},
  meantDefault:"Probably meant more than the words alone. Neurotypical speakers often let tone and context carry part of the message.",
  src:["gunraj","achim"]},

 autistic:{name:"Autistic", group:"nd", short:"autistic",
  sum:"Takes words at their stated meaning first. Decoding tone, faces, hints and figures of speech is possible but costly, especially under load.",
  receive:{
   hint:[3,"That's a statement, not a request.","The request is in the subtext. Autistic adults decode hints as well as peers in studies, but it isn't automatic when tired or focused (Frost et al., 2024)."],
   sarcasm:[3,"They mean what they said.","Sarcasm is carried by tone. In one study, autistic adults identified ironic intent 72.5% of the time versus 80% for comparison adults (Zalla et al., 2014)."],
   idiom:[2,"The literal meaning, or confusion.","Figurative language is harder on average, though the gap mostly closes when language ability is matched (Kalandadze et al.)."],
   vtime:[2,"When exactly? Is waiting really OK?","Undefined timing leaves the plan open, and open plans cost energy."],
   vstd:[3,"What counts as done?","Without a finish line, there's no way to know you've succeeded."],
   blameq:[2,"A literal question. I'll give the reason.","Answering the literal question can sound defensive to someone who meant it as an accusation."],
   tone:[3,"I'm being judged for my face, not my words.","Autistic tone and eye contact can differ without meaning anything. Tone may sound angry or bored when the person feels neither (Autism Society)."],
   demand:[3,"I need time, and I'm being rushed.","Processing can take 7 to 10 seconds or more. Pressure can stop speech entirely."],
   questions:[2,"Too many questions. Which one first?","Monotropic attention tends to handle one thread at a time."],
   long:{w:1,h:"Hard to hold all of this at once.",y:"Long spoken passages tax working memory. Writing helps.",ch:["person","phone"]},
   vemo:[3,"I don't know what I did, and I'm expected to.","Emotional subtext without facts gives nothing to act on."],
   calm:[2,"An instruction I can't follow on command.","Regulation doesn't happen on request, especially during overload."],
   ellipsis:[1,"Unclear. Is there more?","Trailing dots imply unsaid meaning."],
   joke:[1,"Why is this funny?","Joke markers signal a tone that isn't in the words."],
   hyper:[2,"Did they literally mean that?","Exaggeration can be taken at face value."],
   minimal:[0,"They said it's fine, so it's fine.","Autistic listeners usually take the word at face value, which only causes problems if the speaker didn't mean it."],
   multi:[1,"Several tasks. Order unclear.","Sequence and priority matter. Numbered steps help."],
   shout:[2,"Too loud. Sensory load comes before meaning.","Volume can overwhelm before the words register."],
   invalid:[2,"My experience is being overwritten.","Being told your perception is wrong is a common and exhausting pattern."],
   label:[2,"A permanent verdict.","Labels are taken as literal statements of fact."],
   absolute:[2,"That's not accurate. I'll point out the exception.","Precision matters, so the counterexample feels like the relevant point."],
   ominous:[2,"Talk about what? When? How long?","The uncertainty, not the talk itself, is the stressful part."],
   butc:[1,"Which part is the real message?","Mixed signals in one sentence are hard to weigh."],
   softno:[2,"A real maybe, so it's still possible.","\"We'll see\" is often heard as literal. A later no can feel like a broken promise."],
   feelingq:[1,"Hard to answer on the spot.","Many autistic people also have alexithymia (see that wiring)."],
   hedge:[1,"So is it done or not?","Uncertain answers leave the question open."],
   tic:[2,"I'm being told to stop something that regulates me.","Stimming, like rocking, tapping or humming, helps many autistic people regulate."],
   urgent:[2,"Sudden change with no reason.","Unexplained urgency disrupts a plan without a replacement."]
  },
  ch:{text:"Text is often easier. It removes tone and face-reading and allows time to reply. Text and face-to-face ranked highest with family in a survey of 245 autistic adults (Howard & Sedgewick).", email:"Email suits detailed or complex topics and was a preferred way to contact services and work in the same survey.", phone:"Phone calls were among the least preferred ways to communicate for many autistic adults. Consider text for anything complex.", person:"Allow processing time, don't require eye contact, and keep the room quiet."},
  tips:["Say the request as a request: what, by when.","Define the finish line for any task.","Leave out sarcasm in serious talk, or flag it: \"I'm joking.\"","Say your feeling in words instead of expecting it to be read from your face.","Give processing time. Wait 7 to 10 seconds before repeating a question.","During a shutdown, stop asking questions until they've recovered."],
  meant:{minimal:"Probably literally that. Autistic speakers often answer without social padding.",period:"Almost certainly just punctuation.",blameq:"Possibly a real question. They may want the reason, not an apology.",absolute:"May have meant it precisely, or may be overloaded. Ask for the specific instance.",critic:"Probably about the task, not about you.",long:"The detail is often care or accuracy, not a lecture.",tone:"They may be genuinely unsure what your face or tone is saying.",label:"Possibly overload talking. Ask what specifically went wrong."},
  meantDefault:"Most likely meant the words as stated. Many autistic people prefer direct, precise language (National Autistic Society).",
  src:["nasComm","frost","zalla","kaland","howard","asa","mono","lpt","suth"]},

 adhd:{name:"ADHD", group:"nd", short:"ADHD",
  sum:"Takes information in fast, in bursts. Details can drop out during brief attention lapses. Time is fuzzy, and criticism can land with extra force.",
  receive:{
   multi:[3,"Heard the first thing. The rest slipped.","Working memory is often stretched. Children with ADHD recalled multi-step instructions less accurately than peers (Yang et al., 2017)."],
   vtime:[3,"Not now, which may become never.","Time perception and remembering to do things later are common difficulties (Weissenberger et al.)."],
   long:[2,"Skimmed it. Where's the ask?","Dense messages compete with attention. The key line can be missed."],
   critic:[2,"I've failed again.","Emotion regulation is harder for many adults with ADHD. Estimates run 34 to 70% (Soler-Gutiérrez et al.)."],
   label:[3,"I'm a failure, like always.","Labels echo years of similar comments."],
   absolute:[2,"Everything I do is wrong.","\"Always\" and \"never\" confirm the listener's worst self-story."],
   blameq:[2,"Shame. I forgot, and I know it.","The honest answer is often \"I forgot,\" which feels like an admission of fault."],
   minimal:[2,"They're pulling away from me.","Rejection sensitivity can turn neutral or vague replies into rejection (Cleveland Clinic)."],
   period:[2,"Cold. Did I do something?","Short, punctuated texts get read as mood."],
   ominous:[3,"What did I forget? Replaying everything.","An unnamed topic invites a search through every recent slip."],
   sarcasm:[2,"Hard to tell if it's a joke or a dig.","Students with ADHD described struggling to tell jokes from criticism (Rowney-Smith et al., 2026)."],
   joke:[1,"Is this actually a dig?","Same difficulty telling jokes from criticism."],
   questions:[2,"Too many at once. I'll answer the last one.","Earlier questions drop out of working memory."],
   vstd:[1,"Unclear where to start.","Without a first step, starting is the hard part."],
   calm:[2,"My big feelings are the problem again.","It targets an emotion that already feels too big."],
   invalid:[2,"I'm too much.","It echoes a common lifetime message."],
   ellipsis:[2,"They're upset and not saying it.","Ambiguity leans toward rejection."],
   demand:[1,"Pressure while I'm still catching up.","Replies can lag while attention shifts."],
   hint:[1,"May miss it if focused elsewhere.","Attention lapses drop details. CHADD notes subtext can be harder to catch."],
   butc:[2,"Only heard the \"but.\"","Criticism tends to drown out the praise before it."],
   already:[2,"I'm hopeless.","It highlights the lapse instead of fixing the channel."],
   softno:[1,"Is that a no?","Ambiguous answers linger."],
   stopask:[1,"I'm annoying them.","Shutdowns of questions read as rejection."],
   hedge:[0,"Fine, probably done.","Usually not a problem for this wiring."],
   tic:[1,"Being told to stop fidgeting, which helps me focus.","Movement often helps attention."]
  },
  ch:{text:"Put the ask in the first line. A slow reply from them usually isn't rejection, and a slow reply to them can feel like it.", email:"Long emails get skimmed. Lead with the ask and bold the date.", person:"Follow up any plan or list in writing afterward.", phone:"Anything agreed on a call should be sent in text too."},
  tips:["One request at a time, or send the list in writing.","Swap \"later\" for a time or a cue.","Lead with the ask, then the reasons.","Separate the behavior from the person, and say you're on their side.","If you'll be slow to reply, say so.","Ask them to echo back what they heard (CHADD)."],
  meant:{vtime:"Sincere in the moment, but without a time or cue, it's at risk of slipping.",critic:"Possibly a flash of frustration that passes quickly.",shout:"Energy or excitement can come out loud.",multi:"Thinking out loud. The list may be as much for them as for you.",blameq:"Probably frustration rather than a real question.",hyper:"Probably intensity of feeling, not a literal claim."},
  meantDefault:"Likely meant what they said, fast. If it came out sharp, it may have been a passing flash of emotion rather than their settled view.",
  src:["chadd","yang","weiss","soler","rsd","rowney"]},

 dyslexic:{name:"Dyslexic", group:"nd", short:"dyslexic",
  sum:"Understands spoken words easily. Reading costs effort and may need rereading, so the channel matters a lot.",
  receive:{
   long:{w:3,h:"A wall of text. Exhausting before I start, and easy to misread.",y:"People with dyslexia often read slowly and reread to understand (Cleveland Clinic).",ch:["text","email"]},
   multi:{w:1,h:"Easy to skip one.",y:"Lists buried in sentences are easy to misread.",ch:["text","email"]},
   already:[3,"Shamed for something I did try to read.","They may have read it more than once and still missed a line."],
   questions:{w:1,h:"Which question am I answering?",y:"Several written questions at once are hard to track.",ch:["text","email"]},
   critic:[1,"Judged again.","Many dyslexic adults carry years of being called careless."],
   idiom:[0,"Understood.","Figures of speech aren't usually a problem for this wiring."]
  },
  ch:{text:"Keep it short, one idea per line. Offer a voice note for anything complex.", email:"Put the headline in the first line and keep paragraphs to two or three lines. Offer a call.", person:"Spoken conversation is usually the easy channel for this wiring.", phone:"A call is usually easier than a long written message."},
  tips:["Keep written messages short, with one idea per line.","Put anything important in the first line.","Offer a voice note or call for anything emotional or complex.","Never comment on spelling in a personal conversation."],
  meant:{minimal:"Short because typing costs effort, not because they're being curt.",period:"Short because typing costs effort, not because they're being curt."},
  meantDefault:"If it was written, it may be short, or spelled oddly, for reasons that have nothing to do with tone.",
  src:["dyslexia"]},

 dyspraxic:{name:"Dyspraxic (DCD)", group:"nd", short:"dyspraxic",
  sum:"Can find fast conversation hard to keep up with and may pause before replying. Organization and memory can be affected too.",
  receive:{
   minim:[2,"It isn't easy for me, and now I feel slow.","\"Just\" and \"easy\" minimize a task that costs more for their body and planning."],
   questions:[2,"I can't organize answers that fast.","Some dyspraxic people struggle to keep up with conversation and pause before replying (Dyspraxia Foundation)."],
   multi:[2,"Lost the order.","Sequencing several steps is a common difficulty."],
   demand:[2,"Rushed while I'm building the reply.","Long pauses before responding are common."],
   long:{w:1,h:"Hard to keep up.",y:"Fast, long talk outpaces processing.",ch:["person","phone"]},
   critic:[1,"Clumsy, again.","Many dyspraxic adults have heard this all their lives."],
   urgent:[1,"Pressure makes the task harder.","Motor planning gets worse under time pressure."]
  },
  ch:{person:"Let pauses happen. Show rather than describe when you can.", phone:"Allow extra time to reply on calls.", text:"Text gives time to organize a reply.", email:"Numbered steps help."},
  tips:["Drop \"just,\" \"easy\" and \"obviously.\"","Give steps in order, and demonstrate when you can.","Let the pause happen before the reply."],
  meant:{},
  meantDefault:"If the reply came slowly, that was the answer being built, not reluctance.",
  src:["dyspraxia"]},

 apd:{name:"Auditory processing differences (APD)", group:"nd", short:"someone with auditory processing differences",
  sum:"Hears normally but can struggle to make sense of speech in noise, at speed, or with similar-sounding words. Tone shifts can be missed.",
  receive:{
   sarcasm:{w:2,h:"Taken as sincere.",y:"Difficulty detecting the tone changes that signal sarcasm or jokes (ASHA).",ch:["person","phone"]},
   joke:{w:1,h:"Was that a joke?",y:"The tone cue carrying the joke may not register.",ch:["person","phone"]},
   long:{w:2,h:"Lost after the first part.",y:"Long, complicated sentences are hard to process (NHS).",ch:["person","phone"]},
   multi:{w:2,h:"Got one of the steps.",y:"Spoken multi-step directions are a known difficulty (ASHA).",ch:["person","phone"]},
   already:[2,"Blamed for something I couldn't hear properly.","It was said, but it may not have arrived intact."],
   idiom:{w:1,h:"Misheard or confusing.",y:"Similar-sounding phrases can blur.",ch:["person","phone"]},
   questions:{w:1,h:"Which question?",y:"Rapid questions pile up in noise.",ch:["person","phone"]},
   shout:{w:1,h:"Louder, but no clearer.",y:"Volume doesn't fix processing. Rephrasing does.",ch:["person","phone"]},
   demand:[1,"I'm still decoding what you said.","Longer response times are common."]
  },
  ch:{person:"Face to face in a quiet room is best. Turn off the TV and don't cover your mouth.", phone:"Calls remove lip-reading and add line noise. Follow up in text.", text:"Written messages avoid the processing problem entirely.", email:"Written is often the clearest channel for this wiring."},
  tips:["Talk face to face, in a quiet place.","Rephrase rather than repeat louder.","Avoid long, complicated sentences (NHS).","Follow up important plans in writing."],
  meant:{},
  meantDefault:"If the reply seemed off-topic, they may be answering what they thought they heard. Check the words arrived.",
  src:["nhsApd","asha"]},

 dld:{name:"Developmental language disorder (DLD)", group:"nd", short:"someone with DLD",
  sum:"Needs longer to decode complex sentences, figures of speech and abstract words. Word-finding can be hard when speaking.",
  receive:{
   idiom:[3,"Confusing, or taken literally.","Adults with DLD can have trouble understanding figurative language (NIDCD)."],
   long:[3,"Lost after the first clause.","Complex grammar takes longer to unpack than conversation allows."],
   multi:[2,"Only part of it landed.","Several instructions in one sentence overload decoding."],
   vstd:[1,"What does that mean exactly?","Abstract standard words are harder than concrete ones."],
   vemo:[2,"I don't understand what I'm meant to do.","Implied meaning needs extra decoding."],
   sarcasm:[2,"Taken at face value.","Non-literal language is harder."],
   hyper:[1,"Did they mean that?","Exaggeration can be taken literally."],
   questions:[1,"Which one first?","Stacked questions overload processing."]
  },
  ch:{person:"Short, concrete sentences. Check understanding kindly.", phone:"Slow down and check understanding.", text:"Writing lets them reread. Keep sentences short.", email:"Short sentences and bullet points."},
  tips:["Short sentences, one idea each.","Concrete words over abstract ones.","Check understanding kindly: \"What are you taking from this?\""],
  meant:{vstd:"The vague word may stand in for a specific one they couldn't find.",vemo:"The vague word may stand in for a specific one they couldn't find."},
  meantDefault:"The words may be simpler or vaguer than the thought behind them. Word-finding can be hard.",
  src:["nidcd"]},

 tourette:{name:"Tourette or tic disorder", group:"nd", short:"someone with Tourette",
  sum:"Usually receives words normally. The static tends to sit with the listener, who may mistake a tic for a reaction.",
  receive:{
   tic:[3,"I'm being told to stop something I can't fully control.","Tics are involuntary or semi-voluntary, can be briefly suppressed at a cost, and are suggestible. Talking about them can bring them on (Tourette Association)."],
   tone:[2,"My tic is being read as a reaction.","An eye roll, grunt or sound may be a tic, not a comment."],
   calm:[1,"Stress makes tics worse, and so does this.","Pressure tends to increase tics."],
   label:[1,"Judged for something I don't choose.","Tics are often assumed to be deliberate."]
  },
  ch:{person:"If they tic while you're talking, it isn't a reply. Keep going.", phone:"Vocal tics on a call aren't comments on what you said.", text:"Text removes the tic-misreading problem.", email:"No special adjustment needed."},
  tips:["Respond to the words, not the tic.","Don't comment on tics unless they've asked you to.","If they say something was a tic, believe them."],
  meant:{},
  meantDefault:"If a sound or gesture came with the words, it may have been a tic, not a comment.",
  src:["taa"]},

 alex:{name:"Alexithymia", group:"trait", short:"someone with alexithymia",
  sum:"Takes in facts well but finds it hard to identify and name feelings, in themselves and sometimes in others.",
  receive:{
   feelingq:[3,"An exam question with no answer I can find.","Difficulty identifying and describing feelings is the core of alexithymia (Hogeveen & Grafman)."],
   vemo:[3,"Nothing to act on.","Emotional subtext without specifics is especially hard to decode."],
   vstd:{w:2,h:"\"Supportive\" means what, exactly?",y:"Feeling-words without actions are hard to translate.",ch:null},
   hint:[1,"May miss the feeling behind it.","Emotional hints are the hardest kind."],
   sarcasm:[1,"Missed the edge.","Emotion-reading differences are often driven by alexithymia (Bird & Cook)."],
   calm:[1,"I didn't know I wasn't calm.","The body signal may not have been noticed."]
  },
  ch:{person:"Ask about the body and actions, not only feelings.", phone:"Offer options instead of open questions.", text:"Writing gives time to work out the feeling.", email:"Writing gives time to work out the feeling."},
  tips:["Ask about the body or actions: \"Tight chest? Want space or company?\"","Offer options instead of open questions.","Translate feeling-words into actions."],
  meant:{minimal:"Possibly the most accurate answer they have right now.",critic:"The feeling may be showing up as a complaint about a fact."},
  meantDefault:"They may not have a label for the feeling behind this. Actions and body cues may say more than the words.",
  src:["hog","bird"]},

 hsp:{name:"Highly sensitive (SPS)", group:"trait", short:"a highly sensitive person",
  sum:"Takes in a lot, in detail, including subtle tone and mood. The problem isn't missing signal. It's too much of it.",
  receive:{
   shout:[3,"Overwhelming.","Loud input registers strongly."],
   invalid:[3,"My whole way of being is a problem.","\"Too sensitive\" dismisses the trait instead of the moment."],
   critic:[2,"I'll be thinking about this for hours.","Deep processing means a sharp comment keeps echoing."],
   sarcasm:[2,"Caught it instantly, and it stings.","Stronger activation of awareness and empathy regions in response to emotional faces was found in highly sensitive people (Acevedo et al.)."],
   label:[2,"Deeply hurt.","Labels land hard."],
   tone:[1,"Now I'm self-conscious.","Attention on delivery adds to the load."],
   ellipsis:[1,"Something is off.","Subtle cues get noticed and dwelt on."],
   demand:[2,"Too much pressure.","Pressure adds stimulation."],
   period:[1,"That felt clipped.","Small shifts in tone get noticed."],
   calm:[1,"My reaction is being policed.","It dismisses the input."],
   urgent:[1,"Jolted.","Sudden urgency is high stimulation."]
  },
  ch:{person:"Quiet setting, soft start. Loud places add load.", phone:"Keep the volume and pace even.", text:"Watch clipped wording. Small shifts get noticed.", email:"Warm framing matters."},
  tips:["Soft start, quiet setting, one topic.","Name your tone if it's off for other reasons.","Give time to process before asking for a decision."],
  meant:{},
  meantDefault:"Probably worded carefully. Highly sensitive people often know exactly how words can land.",
  src:["acev"]},

 anxiety:{name:"Anxiety-wired", group:"cond", short:"someone with anxiety",
  sum:"Resolves ambiguity toward the worst reading. The more a message leaves unsaid, the more room the worry has.",
  receive:{
   ominous:[3,"Breakup, firing or disaster, until we talk.","Socially anxious participants chose the threatening reading of ambiguous sentences 59% of the time versus 30% (Beard & Amir)."],
   minimal:[3,"They're angry with me.","Short replies are ambiguous, and ambiguity resolves to threat."],
   period:[2,"Cold. Something's wrong.","Punctuation gets read for mood."],
   ellipsis:[2,"What aren't they saying?","Unsaid meaning fills with worst cases."],
   vtime:[1,"They're putting me off.","Undefined timing leaves an open loop."],
   critic:[2,"I've ruined it.","Criticism gets scaled up."],
   demand:[2,"Panic.","Pressure to reply increases anxiety."],
   hint:[1,"Are they upset with me?","Indirect wording invites guessing."],
   butc:[2,"The \"but\" is the real message.","Negative information dominates."],
   questions:[1,"Am I in trouble?","A string of questions feels like an interrogation."],
   sarcasm:[1,"They're mocking me.","Ambiguous tone resolves to threat."],
   joke:[1,"What is the \"lol\" hiding?","Joke markers can look like cover."],
   absolute:[1,"It's hopeless.","Absolutes feed catastrophic thinking."],
   softno:[1,"Is that a no? Did I ask wrong?","Ambiguous answers loop."],
   stopask:[2,"I'm too much.","It adds shame to worry."],
   urgent:[2,"Emergency.","Unexplained urgency reads as danger."],
   hedge:[1,"So it might not be OK.","Uncertainty fuels worry."]
  },
  ch:{text:"Text leaves room for worst-case reading. Add warmth and close the loop.", email:"Say up front whether it's routine.", person:"Lead with reassurance, then the topic.", phone:"Give the reason for the call before calling, or at the start."},
  tips:["Lead with the reassurance, then the topic.","Give the reason for a call or meeting up front.","Close loops. \"Got it, thanks!\" beats silence.","Answer \"Are you mad?\" plainly."],
  meant:{reassure:"A real question. They need a plain answer.",long:"Over-explaining is often insurance against being misunderstood.",ellipsis:"Hesitation, not hostility.",hedge:"Caution, not evasion."},
  meantDefault:"Possibly worded to avoid conflict. There may be worry underneath the words.",
  src:["beard"]},

 trauma:{name:"Trauma-wired (PTSD / C-PTSD)", group:"cond", short:"someone with a trauma history",
  sum:"Scans for threat first and content second. Volume, sudden requests and a hard edge can register before the words do.",
  receive:{
   shout:[3,"Danger.","Hypervigilance means neutral or ambiguous signals can read as threat (Kimble et al.)."],
   urgent:[3,"Something bad is happening.","Urgency without a reason echoes past threat."],
   calm:[3,"My alarm is being ignored.","Ignored alarms get louder."],
   ominous:[3,"Brace for impact.","An unnamed serious topic primes the body for conflict."],
   blameq:[3,"A trap. Any answer will be wrong.","Accusing questions can echo past interrogations."],
   tone:[2,"I'm being watched and judged.","Scrutiny of the face or tone raises threat."],
   label:[2,"An attack.","Character attacks register as danger."],
   critic:[2,"I'm in trouble.","Criticism can trigger a threat response."],
   invalid:[2,"My reality doesn't count.","Being told something didn't happen can be especially destabilizing."],
   hyper:[2,"Violent words, even as a joke.","Threat language registers before the joke does."],
   demand:[2,"Cornered.","Demands for an answer reduce the sense of choice."],
   minimal:[1,"Cold. Is this the calm before something?","Flat replies are ambiguous."],
   sarcasm:[1,"Hostile.","Edges register strongly."]
  },
  ch:{person:"Keep your volume steady, move slowly, and don't approach from behind.", phone:"Keep an even pace. Say the reason for the call first.", text:"Say the purpose in the first line.", email:"Say whether it's urgent in the subject line."},
  tips:["Keep your volume steady and give the purpose first.","Avoid starting serious talks late at night or by surprise.","If they're activated, co-regulate first and talk later.","Agree on a pause-and-return plan for heated moments."],
  meant:{},
  meantDefault:"If it came out defensive, that may have been an alarm going off, not a position.",
  src:["kimble"]},

 ocd:{name:"OCD", group:"cond", short:"someone with OCD",
  sum:"Uncertainty sticks, and doubt can loop. Clear, one-time answers and an agreed plan for repeat questions help most.",
  receive:{
   hedge:[3,"So it might not be done.","Hedged answers leave the doubt open."],
   stopask:[3,"Rejected, and the doubt is still there.","It denies the answer without addressing the loop. Family guidance: \"Once is a question, anything more is reassurance.\""],
   vstd:[2,"What exactly counts as done?","Undefined standards invite checking."],
   softno:[1,"Unresolved.","\"Maybe\" keeps the loop open."],
   absolute:[1,"Now I have to check every time.","Absolutes become rules."],
   minimal:[1,"Is it really fine?","Brief answers can feel incomplete."],
   critic:[1,"Proof I got it wrong.","Mistakes can feed the doubt."],
   invalid:[1,"Dismissed.","The doubt isn't a choice."]
  },
  ch:{text:"A written answer can be reread instead of re-asked. That can help, or feed checking, so agree together how to use it.", email:"Clear, specific answers help.", person:"Warm tone, one clear answer.", phone:"One clear answer, then move on together."},
  tips:["Answer the first time clearly and without hedging.","For repeat questions, use the script you agreed on together.","Speak to the person, not the doubt, and keep your tone warm."],
  meant:{reassure:"The doubt is talking, not distrust of you.",vstd:"Precision may reflect a need for certainty, not pickiness."},
  meantDefault:"Precision or repeat questions often reflect a need for certainty, not pickiness or distrust.",
  src:["ocd"]}
};

/* ---------- check-back scripts for the listener ---------- */
const CHECK = {
  hint:"\"Is that a request? If so, what would you like, and by when?\"",
  sarcasm:"\"Did you mean that literally, or were you being sarcastic?\"",
  joke:"\"Was that a joke, or is something bothering you?\"",
  idiom:"\"I want to be sure I've got it. What do you mean by that, exactly?\"",
  vtime:"\"When do you need it by?\"",
  vstd:"\"What does 'done' look like to you?\"",
  minimal:"\"Is it actually fine, or do you need a minute?\"",
  period:"\"Just checking the tone. Are we good?\"",
  ellipsis:"\"It sounds like there's more. Want to say the rest?\"",
  ominous:"\"Is everything OK? What's it about, and how serious is it?\"",
  blameq:"\"Are you asking for the reason, or telling me you're upset? I can do either.\"",
  critic:"\"I want to fix this. What's the one thing you'd like different?\"",
  label:"\"I want to fix this. What's the specific thing that happened?\"",
  absolute:"\"Can you give me the most recent example, so I know what to work on?\"",
  vemo:"\"I honestly don't know what you mean. Can you tell me the specific thing?\"",
  multi:"\"Let me repeat that back so I don't lose any of it. Could you text me the list?\"",
  long:"\"That was a lot. What's the most important part?\"",
  questions:"\"Which question should I answer first?\"",
  softno:"\"Is that a no, or a real maybe? When will you decide?\"",
  hedge:"\"Are you sure, or should we check together once?\"",
  tone:"\"I'm not upset. This is just how my face and voice work. Can we focus on the words?\"",
  demand:"\"I need a minute to think. I'm not ignoring you.\"",
  calm:"\"I need a few minutes. I'll come back when I can talk.\"",
  invalid:"\"It landed hard for me. Can I tell you why?\"",
  feelingq:"\"I'm not sure what I'm feeling yet. Can I tell you later, or can you give me some options?\"",
  already:"\"I didn't catch it the first time. Could you send it to me in writing?\"",
  urgent:"\"What's happening, and why does it need to be right now?\"",
  shout:"\"I'm finding the volume hard. Can we slow down?\"",
  stopask:"\"Can we agree on how you'll answer when the doubt comes back?\"",
  tic:"\"That was a tic. It's not a reaction to you.\"",
  butc:"\"Thanks for the first part. What exactly would you like different?\""
};

/* ============================================================
   MORE READINGS for the sentence-structure features.
   [weight 0-3, what they may hear, why]. Weight 0 = likely lands as meant.
   Written as "may" and "many": people vary widely inside every wiring.
   ============================================================ */
const ADD = {
 nt:{
  pointed:[2,"They're annoyed I didn't read it.","At work, \"per my last message\" is widely known as a polite way to say \"you missed this.\" The edge lands even when the fact is fair."],
  nudge:[1,"They're waiting on me, and getting impatient.","A bare \"any update?\" says someone is waiting, not what they need or by when, so people fill in the mood."],
  heat:[2,"They're fed up with me.","\"For once\" and \"actually\" put the frustration in the wording, so the request arrives as a complaint."],
  oblig:[2,"I'm being told what to do, like a child.","\"Need to\" and \"have to\" turn an ask into an order. Many adults push back on the order and never get to the task."],
  should:[1,"Advice I didn't ask for.","\"You should\" is often heard as a judgment dressed as advice."],
  shouldhave:[2,"I'm being blamed for something I can't undo.","Hindsight gives the listener nothing to do except defend or apologize."],
  impera:[1,"Bossy.","A bare command between adults can sound like an order, depending on the tone around it."],
  cannot:[2,"They're irritated with me.","\"Can you not…\" is usually heard as exasperation more than a request."],
  again:[2,"They're keeping score.","\"Again\" and \"still\" point to a pattern, so the listener defends the whole history."],
  disclaim:[2,"Brace. Something hurtful is coming.","A disclaimer announces the hit. Most people discount the \"no offense.\""],
  madefeel:[2,"I'm responsible for their feelings.","The talk turns into whether they caused the feeling, not what happened."],
  compare:[3,"I'm not good enough.","Comparisons move the topic from the task to the person's worth."],
  past:[2,"Old fights are being reopened.","Bringing in the past turns one ask into a trial of the whole history."],
  threat:[3,"An ultimatum. Fight or give in.","Threats shift attention from the task to self-protection."],
  guilt:[2,"I'm being made to feel guilty.","Guilt may get the task done, but it builds resentment."],
  passive:[1,"Someone's being blamed, and I think it's me.","Passive voice can sound evasive or like a quiet accusation."],
  minim:[1,"Condescending.","\"Obviously\" and \"just\" can imply the listener should already know."],
  feellike:[1,"An accusation dressed up as a feeling.","\"I feel like you…\" is usually a judgment, and it's heard that way."],
  istate:[0,"They're telling me how it is for them.","I-statements are heard as information rather than attack."],
  clearask:[0,"A request I can say yes to.","A request leaves room for a real yes."],
  appreciation:[0,"They noticed what I did.","Appreciation makes the rest easier to hear."],
  repair:[0,"They're owning their part.","Owning your part invites the other person to own theirs."]
 },
 autistic:{
  pointed:[1,"Which message? Did I miss something?","The pointer says a message exists, but not which one or what part was missed. The fact after it is the useful part."],
  nudge:[2,"An update on what, how much detail, and by when?","With no topic or time, the reply has to be guessed, and a guess can be wrong."],
  heat:[1,"\"For once\"? I have done it before.","Taken literally, \"for once\" says it has never happened, which may not be accurate, so the listener may argue the fact."],
  oblig:[3,"A rule I'm already breaking, or a statement about what's wrong with me.","Many autistic people take \"need to\" at its literal meaning: a requirement, not a wish. Many have also heard it for years in school, therapy or work, so it can carry that history. It leaves no room to say \"not right now\" or \"I'm not sure how.\" For some people, especially those who describe demand avoidance, a direct demand raises anxiety and makes starting harder."],
  should:[2,"Is this a rule, or a suggestion?","\"Should\" can be advice, a hint or a judgment. Taken literally, it sounds like a rule, and it's unclear whether saying no is allowed."],
  shouldhave:[2,"I didn't know that was expected. Now it's too late to fix.","Unstated expectations only show up after they are missed. Saying the expectation for next time gives something to act on."],
  impera:[0,"Clear. I know what to do.","Many autistic people find a plain instruction easier than a hint. Some, though, find bare commands raise anxiety. \"Could you…\" keeps it just as clear and adds choice."],
  cannot:[2,"A question about whether I'm able to. And what should I do instead?","Taken literally, \"can you not\" asks about ability. It names what not to do, but not the thing to do instead."],
  again:[1,"Which other times are they counting?","\"Again\" implies a list of past events without naming them."],
  disclaim:[1,"They said no offense, but it sounds like offense. Which is it?","The literal words and the message point in opposite directions."],
  madefeel:[2,"I didn't intend that. How did I make it happen?","Many autistic people reason from intent, so being blamed for an unintended feeling can seem unfair and confusing. \"I felt X when Y\" gives the same information without the verdict."],
  compare:[2,"Why is she relevant? And the situations aren't the same.","A comparison may be taken as a factual claim, and argued on the facts."],
  past:[1,"Is this about now, or about then?","Two topics at once are hard to hold. Say whether the ask is about today."],
  threat:[3,"A literal rule with a consequence. I believe it.","Conditional statements are often taken at face value. Even if it was said in heat, it may be believed and remembered."],
  guilt:[1,"I'm not sure what I'm being asked to do.","The ask is buried under the account of effort."],
  passive:[2,"No one is named, so this may not be for me.","The complaint or request is implied. Saying who and what makes it answerable."],
  minim:[2,"If it's \"just\" simple, why is it hard for me?","\"Just\" and \"obviously\" say the task should be easy. When it isn't, the word adds shame, and it hides steps that might need spelling out."],
  urgent:[2,"Sudden change with no reason.","Unexplained urgency disrupts a plan without a replacement."],
  feellike:[1,"Is that a feeling or a claim about me?","The sentence is framed as a feeling but works as a judgment."],
  nowhen:[1,"Now? Tonight? This week?","Without a time, the ask stays open, and open loops cost energy."],
  istate:[0,"Clear: this is how it is for them.","A stated feeling or need saves decoding tone and faces."],
  feeling:[0,"The feeling is in words. I don't have to guess.","Naming the feeling gives the information directly."],
  clearask:[0,"A clear request. I know what's being asked.","Direct requests are easier than hints for many autistic people."],
  when:[0,"A time. I can plan around that.","A concrete time closes the loop."],
  reason:[0,"I know why. That helps.","A reason makes the request make sense, and makes it easier to judge what \"done\" means."],
  choice:[0,"I have options. Less pressure.","A choice lowers the demand."],
  repair:[0,"Clear ownership.","Plain apology is easy to read."]
 },
 adhd:{
  pointed:[2,"I dropped it again, and now it's on the record.","For many ADHD adults a missed message is a familiar slip. A pointer to it can land as shame, which makes the reply harder to start."],
  nudge:[2,"I forgot something. What was it?","\"Any update?\" with no details sends the listener hunting for what they missed."],
  heat:[3,"Proof I always fail.","\"For once\" lands on the whole history of being told off, not on today's task."],
  oblig:[3,"Pressure. And pressure makes starting harder, not easier.","Many ADHD adults hear \"you need to\" as the voice of every teacher and boss who said it before. The shame can lead to freezing or putting it off, which can look like refusal but isn't."],
  should:[2,"Another thing I'm failing at.","\"Should\" can land as a reminder of every other should."],
  shouldhave:[2,"Another failure I can't undo.","The honest answer is often \"I forgot,\" which feels like confessing a flaw."],
  impera:[1,"Being ordered. Part of me wants to dig in.","Bare commands can trigger pushback, especially when already overloaded."],
  cannot:[2,"I annoyed them again.","It names what not to do. Without the \"instead,\" there is nothing to start on."],
  again:[3,"Proof I always fail.","\"Again\" and \"still\" point to a pattern. For many ADHD adults it's a pattern they already feel ashamed of, so the word lands on the whole history, not today."],
  disclaim:[2,"Only heard the part after \"but.\"","The criticism tends to drown out everything else."],
  madefeel:[2,"I hurt them. I'm a bad person.","Rejection sensitivity can turn \"you made me feel\" into proof of being bad for people."],
  compare:[3,"I'll never measure up.","Comparisons echo a lifetime of \"why can't you be like…\""],
  past:[2,"I can't change the past, so I can't win this.","Old slips stack up into a verdict."],
  threat:[3,"Panic, and now the task is even harder.","Threat raises the emotional load that already makes starting hard."],
  guilt:[3,"I'm a burden.","Guilt lands on an already loud inner critic."],
  passive:[1,"Is this about me? Probably.","Ambiguity leans toward self-blame."],
  minim:[2,"If it's so simple, why can't I? Shame.","\"Just\" hides the steps that are actually hard."],
  urgent:[2,"Drop everything, panic, lose the thread.","Sudden urgency can scatter attention rather than focus it."],
  nowhen:[2,"Not now, which may become never.","Without a time or a cue, the ask can easily slip. That's not a sign it didn't matter."],
  istate:[0,"Not an attack. I can hear this.","I-statements lower the rejection alarm."],
  clearask:[0,"One thing. I can do that.","A single clear ask is easy to hold."],
  when:[0,"A time I can put somewhere.","A concrete time or cue helps it get done."],
  appreciation:[0,"I'm doing something right.","Appreciation balances a loud inner critic."],
  choice:[0,"I get a say. Easier to start.","Choice lowers the pressure that can cause freezing."],
  softener:[0,"Not urgent. Not angry.","A softener lowers the rejection alarm."]
 },
 dyslexic:{
  minim:[1,"\"Obviously\"? I read it twice and still missed it.","\"Obviously\" can sting when reading takes real effort."],
  again:[1,"Same old comment.","Many dyslexic adults have heard \"again\" about their reading or spelling for years."]
 },
 dyspraxic:{
  oblig:[1,"Another thing I'm expected to do fast.","Pressure makes planning and movement harder."],
  again:[2,"Clumsy, again.","Many dyspraxic adults have heard this all their lives."],
  impera:[1,"Do it, but how, and in what order?","A command gives the goal but not the steps."]
 },
 apd:{
  multi:{w:2,h:"Got one of the steps.",y:"Spoken multi-step directions are a known difficulty (ASHA).",ch:["person","phone"]}
 },
 dld:{
  oblig:[1,"Is this a rule?","Modal words like \"need to\" and \"must\" can be hard to weigh."],
  cannot:[2,"Can, or not? Confusing.","Negative questions are harder to unpack."],
  minim:[1,"Obviously what? I missed something.","It implies there's something the listener should already know."],
  impera:[0,"Short and clear.","Short, concrete instructions are easier to process."],
  passive:[2,"Who did it? Who's this for?","Passive sentences are harder to unpack than active ones."],
  clearask:[0,"I know what's being asked.","A plain request is easy to decode."]
 },
 alex:{
  madefeel:[1,"I didn't see that feeling coming, and I don't know what to do with it.","Feelings named as blame are hard to connect to anything to do."],
  feeling:[0,"The feeling is named. I don't have to work it out.","Naming feelings in words helps when they're hard to read."],
  feellike:[1,"Is that a feeling? I can't tell.","The sentence uses a feeling word for a thought."]
 },
 hsp:{
  pointed:[2,"That had an edge.","Small shifts in tone at work get noticed and dwelt on."],
  heat:[2,"That stung.","The heat in the words registers before the request does."],
  oblig:[2,"That felt sharp.","The pressure in the word registers before the request does."],
  again:[2,"It's been building up.","Small words that point to a pattern get noticed and dwelt on."],
  disclaim:[2,"Here it comes.","The disclaimer is felt as a warning."],
  madefeel:[2,"Their feeling is mine to fix.","Deep empathy can turn a feeling into a responsibility."],
  compare:[2,"Deeply stung.","Comparisons land hard."],
  threat:[3,"Overwhelming.","Threats register strongly."],
  guilt:[2,"I should have seen they were struggling.","Guilt framing lands on someone already tuned in to others."],
  minim:[1,"A little condescending.","Small shifts in tone get noticed."],
  impera:[1,"Curt.","Clipped commands register as tone."],
  softener:[0,"Gentle. I can take this in.","A soft start lowers the load."],
  appreciation:[0,"Warm.","Appreciation is noticed and felt."]
 },
 anxiety:{
  pointed:[2,"I'm in trouble.","The pointed phrase can read as a formal warning, so the worry is louder than the fact."],
  nudge:[2,"I'm late, and they're keeping track.","A nudge with no details leaves room for the worst reading."],
  heat:[2,"They're angry with me.","Heat words confirm the fear that the other person is upset."],
  oblig:[2,"I'm in trouble.","Obligation words can sound like a consequence is coming."],
  should:[1,"I've been getting it wrong.","\"Should\" reads as a quiet correction."],
  shouldhave:[2,"I've let them down.","Hindsight blame feeds replaying."],
  impera:[1,"Are they angry?","Bare commands leave the mood unstated."],
  cannot:[1,"They're fed up with me.","The irritation is louder than the request."],
  again:[2,"They've been annoyed for a long time.","\"Again\" suggests a stored-up list."],
  disclaim:[2,"Here comes the criticism.","The disclaimer confirms the worst-case reading."],
  madefeel:[2,"I've done damage.","Responsibility for a feeling gets scaled up."],
  compare:[2,"I'm being ranked, and losing.","Comparisons feed the fear of not being enough."],
  past:[2,"They've been holding onto this.","Old events suggest a bigger, hidden case."],
  threat:[3,"The relationship is at risk.","Ultimatums confirm the deepest worry."],
  guilt:[3,"I owe them, and I'm failing.","Guilt stacks onto existing worry."],
  passive:[2,"It's about me and they won't say it.","Ambiguity resolves to threat."],
  minim:[1,"I should have known.","It implies the answer was obvious."],
  istate:[0,"They're telling me, not blaming me.","Clear information lowers worry."],
  softener:[0,"Not urgent. We're okay.","A softener answers the unasked question."],
  appreciation:[0,"We're okay.","Warmth up front lowers the alarm."],
  when:[0,"A closed loop.","A named time leaves less to worry about."],
  choice:[0,"I have a say.","Choice lowers pressure."]
 },
 trauma:{
  heat:[2,"Anger. Get ready.","Heat words can read as a warning of anger, even in a message."],
  oblig:[2,"Comply or else.","A command form can echo past control, even when none is meant."],
  impera:[2,"An order. Comply to stay safe.","Bare commands can register as threat before they register as a task."],
  threat:[3,"Danger.","Threats go straight to the alarm."],
  compare:[2,"Ranked, and losing.","Comparisons can echo past put-downs."],
  madefeel:[2,"I'll be punished for their feeling.","Responsibility for another's feelings can echo unsafe times."],
  guilt:[2,"I'm in debt, and debt is dangerous.","Guilt can echo control."],
  past:[1,"The file is being opened.","Old events brought up in conflict can feel like a case being built."],
  choice:[0,"I have a say. I'm safe.","Choice restores control, which lowers threat."],
  softener:[0,"Steady. Not a threat.","A softener lowers the alarm."],
  clearask:[0,"A request, not an order.","Requests keep choice in the room."]
 },
 ocd:{
  oblig:[1,"A rule. Now it has to be exactly right.","Requirements can become rigid rules."],
  nowhen:[1,"When exactly? I'll keep checking.","An open time invites checking."],
  when:[0,"A clear time. Settled.","A named time closes the loop."]
 },
 tourette:{
  oblig:[1,"Pressure, and pressure brings tics.","Stress tends to increase tics."]
 }
};

/* ---------- check-back scripts for the new features ---------- */
const CHECK_ADD = {
  oblig:"\"Is that a request? I'd like to help. When would you like it by?\"",
  should:"\"Is that a suggestion or something you need from me?\"",
  shouldhave:"\"I didn't know that was expected. What would you like next time?\"",
  impera:"\"Sure. Is there a time you need it by?\"",
  cannot:"\"What would you like me to do instead?\"",
  again:"\"I hear this has happened before. What's the one thing you'd like different today?\"",
  disclaim:"\"I want to hear it. What's the main thing?\"",
  madefeel:"\"I didn't mean to hurt you. Can you tell me what happened for you?\"",
  compare:"\"I'd rather talk about us. What would you like from me?\"",
  past:"\"Is this about today, or about the other time? I can talk about either, one at a time.\"",
  threat:"\"I want to take this seriously. What are you asking me to do?\"",
  guilt:"\"I hear you're carrying a lot. What's one thing I can take?\"",
  passive:"\"Is this about something I did? I'd rather know plainly.\"",
  minim:"\"It's not easy for me. Could you walk me through it?\"",
  feellike:"\"What's the feeling underneath that?\"",
  nowhen:"\"When would you like it by?\"",
  pointed:"\"Sorry if I missed it. Could you point me to the part you need?\"",
  nudge:"\"Which part would you like an update on, and by when?\"",
  heat:"\"I can hear you're frustrated. What's the one thing you'd like me to do, and by when?\""
};

/* ============================================================
   ANALYSIS
   ============================================================ */
function norm(t){ return String(t==null?"":t).replace(/[’‘`]/g,"'").replace(/[“”]/g,'"'); }
function rx(f){ if(!f._rx) f._rx = f.re.global ? f.re : new RegExp(f.re.source, f.re.flags+"g"); return f._rx; }
function words(t){ return (t.match(/\S+/g)||[]).length; }

function splitSentences(text){
  const out=[]; const re=/[^.!?\n]+(?:[.!?…]+["')\]]*|\n|$)/g; let m;
  while((m=re.exec(text))!==null){
    if(!m[0].trim()){ if(re.lastIndex===m.index) re.lastIndex++; continue; }
    const lead = m[0].length - m[0].replace(/^\s+/,"").length;
    out.push({s:m.index+lead, e:m.index+m[0].replace(/\s+$/,"").length, text:m[0].trim()});
    if(re.lastIndex===m.index) re.lastIndex++;
  }
  return out;
}

const FILLER = /^(?:(?:ok(?:ay)?|hey|so|and|also|now|look|listen|um|uh|well|right|alright|honestly|seriously|guys|babe|honey|dude|mate|please)\s*,?\s+)+/i;
function stripVocative(t){ return t.replace(/^[A-Z][a-z]+,\s+(?=[a-z])/, ""); }

/* does this sentence open with a bare command? returns the command text or "" */
function commandOf(sentence){
  const t0 = stripVocative(sentence.trim());
  if(/^(?:(?:ok(?:ay)?|hey|hi|so|and|also|now|reminder:?)[\s,]+)*(?:please|pls|plz|kindly)\b/i.test(t0) || /,?\s*\bplease[.!]*$/i.test(t0)) return "";
  let t = t0.replace(FILLER,"");
  if(NOT_CMD.test(t)) return "";
  const m = t.match(/^(don't|do not|never)\s+(\w+)/i);
  if(m){ if(/^(?:worry|mind|forget to)$/i.test(m[2]) && !/^don't forget/i.test(t)) return ""; return t; }
  const w = (t.match(/^([A-Za-z']+)/)||[])[1];
  if(!w) return "";
  const lw = w.toLowerCase();
  if(!VERBSET.has(lw)) return "";
  // "Call me when you land" is fine to flag; "Look, …" or "Listen, …" alone is a filler
  if(/^(?:look|listen|come on|wait)\s*[,!]/i.test(t)) return "";
  // "Be careful" / "Be safe" are wishes, not commands
  if(/^be (?:careful|safe|well|kind to yourself|good)\b/i.test(t)) return "";
  // A question is not a command ("Take the car?")
  if(/\?\s*$/.test(t)) return "";
  // needs an object or complement: "Go." is too short to judge
  if(words(t) < 2 && !/^(?:stop|hurry|move|wait|go|come|leave)\b/i.test(t)) return "";
  return t;
}

/* "Why is this still not done?" -> the thing, and the state it should be in */
const NOTDONE_RE = /^(.*?)\bwhy (?:is|are|isn't|aren't|hasn't|haven't|was|were) (this|that|it|these|those|the [\w -]+?|my [\w -]+?|our [\w -]+?|your [\w -]+?) (?:still )?(?:not )?(?:been )?(done|finished|ready|sent|fixed|here|in|up|live|merged|submitted|signed|paid|booked|updated|back|out|shipped|approved|reviewed)\b[?!.]*$/i;
const HINT_OBJ = {trash:"take out the trash", garbage:"take out the garbage", bin:"take out the bin", bins:"take out the bins", recycling:"take out the recycling", dishes:"do the dishes", sink:"do the dishes", laundry:"do the laundry"};

/* the ask inside a sentence, if any: {text, kind} */
function askOf(sentence, feats){
  const t = sentence.replace(/[.!?]+$/,"").trim();
  let m;
  if((m=t.match(/\bif you (?:don't|do not|won't) (.+?),/i))) return {text:m[1], kind:"threat"};
  if((m=t.match(/\bwhy (?:didn't|don't|can't|won't) you (?:ever |just |even )?(.+)$/i))) return {text:m[1], kind:"critq"};
  if((m=t.match(/\bhow (?:hard|difficult) (?:is|can) it (?:be )?to (.+)$/i))) return {text:m[1], kind:"critq"};
  if((m=t.match(NOTDONE_RE))) return {text:"get "+m[2]+" "+m[3], kind:"critq"};
  if((m=t.match(/\bhow many times do i have to (?:tell|ask|remind) you to (.+)$/i))) return {text:m[1], kind:"critq"};
  if((m=t.match(/\bis it (?:really )?(?:too much|so hard) to ask (?:for you )?(?:to |that you |you to )(.+)$/i))) return {text:m[1], kind:"critq"};
  if((m=t.match(/\b(?:can|could) you not (.+)$/i))) return {text:"not "+m[1], kind:"cannot"};
  const hasF = id=>feats.includes(id);
  if((m=t.match(/\byou(?:'re| are| were) (?:really |just |still )?(?:supposed|required|expected) to (.+)$/i))) return {text:m[1], kind:"oblig"};
  if((m=t.match(/\byou (?:really |seriously |just |absolutely |honestly |actually |still |definitely )?(?:'ll )?(?:need to|needs to|have to|has to|have got to|'ve got to|got to|gotta|must|ought to|had better|'d better|better|are supposed to|'re supposed to|were supposed to|are required to|'re required to|are expected to|'re expected to) (.+)$/i)) && hasF("oblig")) return {text:m[1], kind:"oblig"};
  if((m=t.match(/\b(?:i|we) (?:really |just |still )?need you to (.+)$/i))) return {text:m[1], kind:"oblig"};
  if((m=t.match(/\bi (?:really )?want you to (.+)$/i))) return {text:m[1], kind:"oblig"};
  if((m=t.match(/\bmake sure (?:you |to )(.+)$/i))) return {text:m[1], kind:"oblig"};
  if((m=t.match(/\byou (?:should|could)(?: have|'ve| of) (\w+)(.*)$/i))) return {text:baseVerb(m[1])+m[2], kind:"shouldhave"};
  if((m=t.match(/\byou (?:really |seriously |just |honestly |definitely |probably |totally )?should (?!have\b|'ve\b)(.+)$/i)) && hasF("should")) return {text:m[1], kind:"should"};
  if((m=t.match(/\bi need (this|that|it|the [\w ]+?|my [\w ]+?|these|those) (done|finished|fixed|sent|cleaned|paid|signed)\b/i))) return {text:"get "+m[1]+" "+m[2], kind:"oblig"};
  if((m=t.match(/^(?:(?:hey|hi|so)\b,?\s+)?(?:just\s+)?(?:any|got any) (?:updates?|news|word)(?: (?:on|about) (.+))?$/i))) return {text:"an update"+(m[1]?" on "+m[1]:""), kind:"nudge"};
  if((m=t.match(/^(?:(?:hey|hi|so)\b,?\s+)?(?:just\s+)?(?:circling back|circle back|checking in|following up|bumping this(?: up)?)(?: (?:on|about|re|with you about) (.+))?$/i))) return {text:"an update"+(m[1]?" on "+m[1]:""), kind:"nudge"};
  if((m=t.match(/\b(?:can|could) (?:we|i) (?!not\b)(.+)$/i)) && !/^(?:talk|chat)$/i.test(m[1])) return {text:m[1], kind:"request"};
  if((m=t.match(/\b(?:could you|would you(?! (?:even|ever|rather))|can you(?! not| even| believe)|will you(?! ever)|would you mind|would you be (?:up for|willing to|able to)|are you (?:able|free|willing) to|do you have time to)\s+(?:please\s+)?(.+)$/i))) return {text:m[1], kind:"request"};
  if((m=t.match(/\bplease\s+(?:also\s+|just\s+|kindly\s+)?([a-z].+)$/i)) && VERBSET.has(m[1].split(/\s/)[0].toLowerCase())) return {text:m[1], kind:"request"};
  if((m=t.match(/\bit(?: would|'d) be (?:nice|great|good|helpful|lovely) if (?:someone|somebody|anyone|you) (?:could |would )?(.+)$/i))) return {text:baseForm(m[1]), kind:"hint"};
  if((m=t.match(/\bit(?: would|'d) be (?:nice|great|good|helpful|lovely) if (?:the |my |our )?([\w ]+?) (?:got|were|was|are|is|could be) (\w+)(.*)$/i))) return {text:baseVerb(m[2])+" the "+m[1]+m[3], kind:"hint"};
  if((m=t.match(/\b(?:someone|somebody|anyone) (?:should|needs to|could|has to|might want to) (.+)$/i))) return {text:baseForm(m[1]), kind:"hint"};
  if((m=t.match(/\bi wish (?:you|someone|somebody) would (.+)$/i))) return {text:m[1], kind:"hint"};
  if((m=t.match(/\bthe (trash|garbage|bins?|recycling|dishes|sink|laundry)(?: is| are|'s)\b/i))) return {text:HINT_OBJ[m[1].toLowerCase()]||("deal with the "+m[1]), kind:"hint"};
  if((m=t.match(/\byou (?:still )?(?:haven't|have not|didn't|did not) (\w+)(.*)$/i)) && feats.includes("again")) return {text:baseVerb(m[1])+m[2].replace(/\s*\byet\b/,""), kind:"still"};
  const c = commandOf(sentence);
  if(c) return {text:c.replace(/[.!?]+$/,""), kind:"command"};
  return null;
}

function moodOf(fs, sentence){
  const has=id=>fs.includes(id);
  if(has("threat")) return "Ultimatum";
  if(has("blameq")||has("cannot")) return "Question used as criticism";
  if(has("ominous")) return "Opener with no topic";
  if(has("minimal")) return "One-word reply";
  if(has("oblig")) return "Requirement";
  if(has("should")) return "Advice or judgment (\"should\")";
  if(has("shouldhave")) return "Hindsight blame";
  if(has("impera")) return "Command";
  if(has("hint")) return "Hint";
  if(has("clearask")) return "Request";
  if(has("label")||has("compare")||has("madefeel")||has("absolute")||has("critic")||has("again")||has("guilt")||has("passive")||has("sarcasm")) return "Judgment or complaint";
  if(/\?\s*$/.test(sentence)) return "Question";
  if(has("istate")||has("feeling")||has("repair")||has("appreciation")) return "I-statement";
  return "Statement";
}
function subjectOf(sentence){
  const t=" "+sentence.toLowerCase()+" ";
  const you=(t.match(/\byou(?:'re|'ve|'ll|'d|r)?\b/g)||[]).length;
  const me=(t.match(/\b(?:i|i'm|i've|i'd|i'll|me|my)\b/g)||[]).length;
  const we=(t.match(/\b(?:we|we're|we've|us|our)\b/g)||[]).length;
  if(!you && !me && !we) return "a thing or event";
  if(you>=me && you>=we) return "them";
  if(we>me) return "both of you";
  return "you, the speaker";
}

function analyze(textIn, opts){
  opts = opts||{};
  const ch = opts.channel||"person";
  const raw = String(textIn==null?"":textIn);
  const text = norm(raw);
  const low = text;
  const hits = [];                     // {id, s, e, match}
  const push = (id,s,e)=>hits.push({id, s, e, match:raw.slice(s,e)});
  F.forEach(f=>{
    if(!f.re) return;
    if(f.chOnly && !f.chOnly.includes(chBase(ch))) return;
    const r = rx(f); r.lastIndex=0; let m;
    while((m=r.exec(low))!==null){
      if(m[0]===""){ r.lastIndex++; continue; }
      const s=m.index, e=m.index+m[0].replace(/\s+$/,"").length;
      const before = low.slice(Math.max(0,s-24), s).toLowerCase();
      const after = low.slice(e, e+24).toLowerCase();
      const mm = m[0].toLowerCase();
      if(f.id==="again" && /\bagain\b/.test(mm) && /(?:try|see you|thanks|thank you|say that|say it|meet|hear from you|talk|check|do that|love you|miss you|here we go|me)\s*$/.test(before)) continue;
      if(f.id==="critic" && /\b(?:i|i've|i have|i was|i'm|i am|we|we've)\s+(?:\w+\s+)?$/.test(before) && !/^you/.test(mm)) continue;
      if(f.id==="absolute"){
        if(/^never$/.test(mm) && /^\s*mind\b/.test(after)) continue;
        if(/^(?:always|forever)$/.test(mm) && /^\s*(?:love|be (?:here|there)|have your back|grateful|appreciate|welcome|remember how)/.test(after)) continue;
      }
      if(f.id==="label" && /^how (?:difficult|hard)/.test(mm) && /^\s*(?:is|was|can)\b/.test(after)) continue;
      if(f.id==="hedge" && /\bi think\b/.test(mm) && /^\s*(?:we|you) (?:could|should|might)\b/.test(after)) {/* still a hedge, keep */}
      push(f.id, s, e);
    }
  });

  shoutSpans(text).forEach(x=>push("shout", x.s, x.e));
  const sentences = splitSentences(text).map(x=>Object.assign(x,{raw:raw.slice(x.s,x.e)}));
  const sentOf = h=>sentences.find(se=>h.s>=se.s && h.s<se.e) || {s:0,e:text.length,text};
  // an opener that names its topic ("a quick call about the budget") is not ominous
  for(let i=hits.length-1;i>=0;i--){
    const h=hits[i]; if(h.id!=="ominous") continue;
    const se=sentOf(h); const rest=text.slice(h.e, se.e);
    if(/\b(?:about|regarding|re:|to (?:discuss|go over|review|talk about|look at)|on (?:the|your|my|our) \w+)/i.test(rest)) hits.splice(i,1);
  }
  // a nudge with a topic and a time is a fine follow-up
  for(let i=hits.length-1;i>=0;i--){
    const h=hits[i]; if(h.id!=="nudge") continue;
    const se=sentOf(h); const rest=text.slice(h.e, se.e).replace(/[.!?\s]+$/,"");
    const vagueTopic = !rest || /^\s*(?:on|about|re|with you)?\s*(?:this|that|it|the above|my last(?: \w+)?|here)?\s*$/i.test(rest);
    if(!vagueTopic && WHEN_RE.test(text)) hits.splice(i,1);
  }
  // bare commands, sentence by sentence
  sentences.forEach(se=>{
    const c = commandOf(se.text);
    if(c){
      const off = se.text.indexOf(c.split(/\s+/)[0]);
      const firstWord = c.split(/\s+/).slice(0, /^(?:don't|do not|never)$/i.test(c.split(/\s+/)[0])?2:1).join(" ");
      push("impera", se.s+Math.max(0,off), se.s+Math.max(0,off)+firstWord.length);
    }
  });
  const inside=(h,id)=>hits.some(x=>x.id===id && h.s<x.e && x.s<h.e);
  const drop=(id, pred)=>{ for(let i=hits.length-1;i>=0;i--) if(hits[i].id===id && (!pred||pred(hits[i]))) hits.splice(i,1); };
  const has=id=>hits.some(h=>h.id===id);
  // conflicts: keep the more specific reading
  drop("impera", h=>["calm","tone","demand","tic","hint","ominous","minimal","sarcasm","stopask"].some(id=>inside(h,id)));
  drop("clearask", h=>inside(h,"blameq")||inside(h,"cannot")||inside(h,"ominous")||inside(h,"feelingq"));
  if(has("tic")) drop("cannot", h=>inside(h,"tic"));
  drop("cannot", h=>/why\s*$/i.test(low.slice(Math.max(0,h.s-5), h.s)));
  if(has("vemo")) drop("should", h=>hits.some(x=>x.id==="vemo" && Math.abs(x.s-h.s)<4));
  if(has("minimal")){ drop("sarcasm"); drop("vstd"); drop("impera"); drop("clearask"); }
  if(has("butc") && has("sarcasm")){ drop("sarcasm", h=>hits.some(b=>b.id==="butc" && h.s>=b.s && h.e<=b.e)); }
  if(has("vstd") && has("idiom") && hits.some(h=>h.id==="vstd" && /pull your weight/i.test(h.match))) drop("vstd");
  if(has("critic") && has("again")) drop("critic", h=>/again/i.test(h.match));
  if(has("minim") && has("oblig")) {/* both stay: "you just need to" */}
  if(has("feellike")) drop("istate", h=>inside(h,"feellike"));
  if(has("label") && has("invalid")) drop("label", h=>inside(h,"invalid"));
  if(has("urgent") && has("vtime")) drop("vtime", h=>inside(h,"urgent"));
  if(has("blameq") && has("demand")) drop("demand", h=>inside(h,"blameq"));
  drop("critic", h=>/^you're late$/i.test(h.match) && /\b(?:when|if)\s*$/i.test(low.slice(Math.max(0,h.s-6),h.s)));
  drop("absolute", h=>/^never$/i.test(h.match) && /never\s*mind/i.test(low.slice(h.s,h.s+12)));

  // "now" at the end of an ask is time pressure too
  const hasWhy = WHY_RE.test(low);
  const askSent = new Set();
  sentences.forEach((se,i)=>{
    const fs = hits.filter(h=>h.s>=se.s && h.e<=se.e).map(h=>h.id);
    if(fs.some(id=>["oblig","impera","clearask","should"].includes(id)) || /^i need (?:this|that|it|the)\b/i.test(se.text)) askSent.add(i);
  });
  sentences.forEach((se,i)=>{
    if(!askSent.has(i)) return;
    const r=/\bnow\b/gi; let m;
    while((m=r.exec(se.text))!==null){
      const pre=se.text.slice(Math.max(0,m.index-8),m.index).toLowerCase(), post=se.text.slice(m.index+3,m.index+12).toLowerCase();
      if(/(?:right|for|by|just|until|up to)\s*$/.test(pre) || /^\s*(?:that|and then|on)\b/.test(post)) continue;
      push("urgent", se.s+m.index, se.s+m.index+3);
    }
  });
  if(hasWhy) drop("urgent", h=>!/asap|hurry|drop everything|immediately/i.test(h.match));
  // "I can't talk right now" is a boundary, not pressure: urgency only counts inside an ask
  drop("urgent", h=>{
    if(/asap|a\.s\.a\.p|hurry|drop everything|now!/i.test(h.match)) return false;
    const i = sentences.findIndex(se=>h.s>=se.s && h.e<=se.e);
    return i<0 || !askSent.has(i);
  });

  // a when, a reason (worth keeping)
  const wm = low.match(WHEN_RE);
  if(wm){ const s=low.search(WHEN_RE); push("when", s, s+wm[0].length); }
  const ym = low.match(WHY_RE);
  if(ym){ const s=low.search(WHY_RE); push("reason", s, s+ym[0].length); }

  // per-sentence structure
  const wc = words(text);
  const asks=[];
  sentences.forEach((se,i)=>{
    se.features = [...new Set(hits.filter(h=>h.s>=se.s && h.e<=se.e).map(h=>h.id))];
    se.mood = moodOf(se.features, se.text);
    se.subject = subjectOf(se.text);
    const a = askOf(se.text, se.features);
    if(a && se.mood!=="One-word reply"){ a.sentence=i; se.ask=a.text; asks.push(a); }
  });

  // several asks in one breath
  let segs=[];
  asks.forEach(a=>{
    const parts = a.text.split(/,\s*(?:and\s+|then\s+)?|\s+(?:and then|and also|then|and|also|plus)\s+/i).map(x=>x.trim()).filter(Boolean);
    const verbish = parts.filter((p,j)=> j===0 || VERBSET.has(p.split(/\s+/)[0].toLowerCase()));
    if(verbish.length===parts.length && parts.length>1) segs = segs.concat(parts); else segs.push(a.text);
  });
  if(segs.length>=3 || (segs.length===2 && wc>25)) { hits.push({id:"multi", s:-1, e:-1, match:segs.join(" / ")}); }
  // long, stacked questions
  const sentLens = sentences.map(se=>words(se.text));
  if(wc>45 || sentLens.some(n=>n>28)) hits.push({id:"long", s:-1, e:-1, match:wc+" words"});
  const q=(text.match(/\?+/g)||[]).length;
  if(q>=3) hits.push({id:"questions", s:-1, e:-1, match:q+" questions"});
  // a short text with a full stop
  if(chBase(ch)==="text" && wc>0 && wc<=5 && /[^.]\.\s*$/.test(text)){ const i=text.lastIndexOf("."); push("period", i, i+1); }
  // an ask with no when
  const standingSent = i=>i!=null && sentences[i] && /\b(?:going forward|moving forward|from now on|in (?:the )?future|next time|from here on|each time|every time|whenever)\b/i.test(sentences[i].text);
  const taskAsks = asks.filter(a=>["oblig","command","request","hint","still","critq","threat","nudge"].includes(a.kind) && !standingSent(a.sentence) && !/^(?:not |stop |be |calm|relax|listen|understand|know|look|keep|remember|tell me|let me|say|repeat|explain|pass|hand|hold|wait|give me|show me|come here|help me with this)\b/i.test(a.text) && !/\b(?:when|if|whenever|every time|next time)\b/i.test(a.text));
  const hasWhen = hits.some(h=>h.id==="when") || has("urgent");
  if(taskAsks.length && !hasWhen) hits.push({id:"nowhen", s:-1, e:-1, match:taskAsks[0].text});
  // "no rush" on an ask with no time is kind, and still vague for a literal listener
  if(taskAsks.length && !hasWhen && !has("vtime")){
    const nr = /\bno rush\b/i.exec(low);
    if(nr) push("vtime", nr.index, nr.index+nr[0].length);
  }
  // a clear ask is only "clear" if it is one ask
  if(hits.some(h=>h.id==="multi")) drop("clearask");

  // assemble
  const found={}; const spans=[];
  hits.forEach(h=>{
    (found[h.id]=found[h.id]||[]).push(h.id==="multi"?null:h.match);
    if(h.s>=0) spans.push({s:h.s,e:h.e,f:h.id});
  });
  if(found.multi) found.multi = segs;
  const ids = Object.keys(found);
  const staticIds = ids.filter(id=>FBY[id] && FBY[id].kind==="static");
  const goodIds = ids.filter(id=>FBY[id] && FBY[id].kind==="good");
  const feelingM = low.match(new RegExp("\\bi(?:'m| am| was| felt| feel| get| got|'ve been| have been| am feeling|'m feeling)(?: so| really| a bit| a little| kind of| pretty| very| quite)? ("+FEELINGS+")\\b","i"));
  return {
    text: raw, norm: text, channel: ch, words: wc,
    sentences, hits, found, spans, staticIds, goodIds,
    asks, segs,
    has: id=>!!found[id],
    missing: {
      when: !!(asks.some(a=>!standingSent(a.sentence)) && !hasWhen),
      why: !!(asks.length && !hasWhy),
      topic: !!found.ominous,
      feeling: !feelingM && staticIds.some(id=>["label","absolute","critic","madefeel","compare","blameq","again","past","guilt","threat","sarcasm"].includes(id)),
      ask: !asks.length && staticIds.some(id=>["disclaim","label","absolute","critic","madefeel","compare","again","past","passive","sarcasm","vemo","guilt","feellike","blameq"].includes(id))
    },
    feelingWord: feelingM ? feelingM[1] : ""
  };
}

/* the older shape the page used */
function detect(text, ch){ const a=analyze(text,{channel:ch}); return {found:a.found, spans:a.spans, words:a.words, analysis:a}; }

function entry(ntId, fid, ch){
  const nt = NT[ntId]; if(!nt) return null;
  let r = nt.receive[fid];
  if(!r) return null;
  if(Array.isArray(r)) r = {w:r[0], h:r[1], y:r[2]};
  if(r.ch && !r.ch.includes(chBase(ch))) return null;
  return r;
}

/* how each feature may land, for each chosen wiring */
function readings(an, ids, ch){
  const out={};
  (ids||[]).forEach(id=>{
    const list=[];
    Object.keys(an.found).forEach(fid=>{
      const e=entry(id, fid, ch||an.channel);
      if(e) list.push(Object.assign({fid, name:FBY[fid]?FBY[fid].name:fid, words:(an.found[fid]||[]).filter(Boolean)}, e));
    });
    list.sort((a,b)=>b.w-a.w);
    out[id]=list;
  });
  return out;
}

/* a static score: sum of the loudest reading per feature, minus a little for what's worth keeping */
function score(an, ids, ch, state){
  let sc=0; const top=[];
  const fids = Object.keys(an.found);
  fids.forEach(fid=>{
    const f=FBY[fid]; if(!f) return;
    const ws=[];
    ids.forEach(b=>{ const e=entry(b,fid,ch); if(e){ ws.push(e.w); if(e.w>=1) top.push(Object.assign({b,fid},e)); } });
    if(f.kind==="good") return;
    if(ws.length){ const mx=Math.max(...ws); sc+=mx+0.5*Math.max(0,ws.filter(w=>w>=2).length-1); }
    else if(fid!=="nowhen") sc+=0.25;
  });
  const good = fids.filter(fid=>FBY[fid] && FBY[fid].kind==="good").length;
  sc = Math.max(0, sc - Math.min(1.2, good*0.4));
  if(ch==="phone" && ids.includes("autistic")) sc+=0.5;
  if(ch==="phone" && ids.includes("apd")) sc+=1;
  if(ch==="email" && ids.includes("dyslexic") && an.words>25) sc+=0.5;
  const mult={v:1,s:1.4,d:1.9}[state||"v"]||1;
  sc = sc*mult + (state==="d"?1:0) + (state==="s"&&sc>0?0.3:0);
  let level = sc<1.5?["clear","Clear signal"]:sc<4.5?["some","Some static"]:["heavy","Heavy static"];
  // the headline never says "clear" while something is flagged
  if(level[0]==="clear" && an.staticIds.length) level = ["some","A little static"];
  return {score:sc, level, pct:Math.max(6, Math.min(100, Math.round(sc/8*100))), top:top.sort((a,b)=>b.w-a.w)};
}

/* ============================================================
   REWRITE
   Keeps the speaker's real ask. Changes the structure around it.
   Every change is logged with its reason. Placeholders in [brackets]
   are blanks for the speaker to fill in their own words.
   ============================================================ */
const CHANGE_WHY = {
  caps:{g:"Capitals and stacked \"!!!\" or \"??\" read as shouting, so the listener reacts to the volume before the words."},
  dots:{g:"Trailing dots leave the listener guessing what you didn't say.", anxiety:"An unfinished thought tends to get filled in with the worst case."},
  disclaim:{g:"A disclaimer like this announces a hit and asks the listener not to mind it. Without it, the point can land on its own.", anxiety:"The disclaimer is often heard as \"brace yourself.\"", autistic:"The literal words (\"no offense\") and the message point different ways, which is confusing."},
  minim:{g:"\"Just,\" \"simply\" and \"obviously\" say the task should be easy. If it isn't easy for them, the word adds shame.", adhd:"For many ADHD listeners, \"just do it\" skips the hard part, which is starting.", autistic:"\"Just\" can hide steps that need spelling out.", dyspraxic:"What looks simple can cost real planning and effort."},
  again:{g:"\"Again,\" \"still\" and \"even\" point at a pattern. Taking them out keeps the talk on this one time, which the listener can actually do something about.", adhd:"For many ADHD listeners, \"again\" lands on the whole history of being told off, not on today."},
  sarcasm:{g:"Sarcasm carries the real message in tone, the opposite of the words. Saying the real feeling plainly means it can't be missed or over-heard.", autistic:"Sarcasm may be taken literally, so the real message never arrives."},
  guilt:{g:"Guilt framing asks for payment for past effort. Naming your load plainly, and asking for one thing, is honest and easier to say yes to."},
  threat:{g:"An \"if you don't… then I'll…\" sentence puts the relationship on the line over a task. The ask stays, the threat goes. If there is a real limit, say it once, calmly, at a calm time, as your own plan and not as leverage.", autistic:"Conditional statements are often taken literally, and remembered.", anxiety:"An ultimatum confirms the deepest worry, that the bond is at risk.", trauma:"Threats go straight to the alarm."},
  compare:{g:"A comparison makes it about their worth, and brings someone else into it. Talking about what happened, between the two of you, keeps it fixable."},
  madefeel:{g:"\"You made me feel\" puts your feeling on their actions, so they argue about whether they caused it. \"I felt… when…\" gives the same information and owns it.", autistic:"Many autistic listeners reason from intent. \"I felt hurt when…\" is information they can use, not a charge to defend."},
  ominous:{g:"An opener with no topic leaves the listener bracing. Naming the topic and how serious it is lets them come in calm.", anxiety:"Anxious minds often fill an unnamed topic with the worst case until the talk happens.", adhd:"An unnamed topic can set off a search through every recent slip.", autistic:"The uncertainty (what, when, how long) is often the stressful part, not the talk itself."},
  critq:{g:"A \"why didn't you\" question carries a complaint, and the listener has to guess whether to answer the question or the complaint. Saying the request underneath gives them something to do.", autistic:"Many autistic listeners answer the literal question (they give the reason), which can then sound defensive.", adhd:"The honest answer is often \"I forgot,\" which feels like confessing a flaw. A request skips that trap."},
  cannot:{g:"\"Can you not…\" names what to stop, not what to do. Saying what you'd like instead gives them a clear next step.", autistic:"Taken literally, \"can you not\" asks whether they are able to. A positive request is unambiguous.", adhd:"It's easier to start a new action than to stop an old one without a replacement."},
  shouldhave:{g:"\"You should have\" is about a past no one can change. Turning it toward next time, or saying how it affected you, gives them something to act on.", autistic:"Unstated expectations only show up after they're missed. Saying it for next time makes it clear.", adhd:"Hindsight blame lands as another failure that can't be undone."},
  oblig:{g:"\"Need to,\" \"have to\" and \"must\" state a requirement. \"Could you\" asks, which leaves room for yes, not right now, or a question, and most people cooperate more with a request than an order.", autistic:"Many autistic listeners take \"need to\" literally, as a rule or as a statement about a deficit. \"Could you\" is just as clear, and plainly a request.", adhd:"Pressure words can set off freeze or avoidance for many ADHD listeners. A request with a time is easier to start.", anxiety:"Obligation words can sound like a consequence is coming. A request doesn't.", trauma:"Commands can echo past control. A request keeps choice in the room.", hsp:"The pressure in the word registers before the request does.", nt:"Adults tend to push back on being told what to do, even when they'd happily agree to the same thing asked."},
  should:{g:"\"You should\" can sound like a rule they're failing. Asking whether they're willing makes it an offer they can take up.", autistic:"\"Should\" can be advice, a hint or a rule. \"Would you be willing\" makes it clear it is a request."},
  impera:{g:"A bare command can land as an order between adults. \"Could you…?\" keeps it just as clear and turns it into a request.", trauma:"An order can register as threat before it registers as a task.", autistic:"The request stays literal and clear. It only adds the choice.", nt:"Most people cooperate more readily with a request than an order."},
  hint:{g:"A hint leaves the request in the subtext. Saying it directly means it can't be missed.", autistic:"A hint may be heard as a plain statement, and the request never arrives.", alex:"Emotional hints are the hardest kind to decode."},
  passive:{g:"Passive voice hides who did what, which can sound evasive or like a quiet accusation. \"I noticed…\" says it plainly from your side.", autistic:"Without a name, it's unclear whether the sentence is for them."},
  label:{g:"A label is a verdict on who they are, and a verdict can't be fixed. What happened, and how it affected you, can. Use your real feeling word.", adhd:"Labels echo years of similar comments and can shut the conversation down.", autistic:"A label may be taken as a literal, permanent statement of fact."},
  absolute:{g:"\"Always\" and \"never\" erase every exception, so the listener argues the exception. Owning it as how it has felt lately (and adding one real example) keeps it honest and hearable.", autistic:"Precision matters to many autistic listeners, so the counterexample can feel like the relevant point.", adhd:"\"Always\" and \"never\" can confirm a painful self-story."},
  urgent:{g:"\"Now\" or \"ASAP\" without a reason reads as an emergency or a power move. A real time and a reason make it a plan.", anxiety:"Unexplained urgency reads as danger.", adhd:"Sudden pressure can scatter attention instead of focusing it.", autistic:"An unexplained change of plan is hard to switch into without the why."},
  vtime:{g:"Vague timing means one person hears \"tonight\" and the other hears \"this month.\" A real time closes the loop.", adhd:"\"Later\" can quietly become never. A time or a cue helps it happen.", autistic:"An open time leaves the plan open, and open plans cost energy."},
  vstd:{g:"\"Clean up\" and \"help more\" don't say what finished looks like. Naming it means they can get it right the first time.", autistic:"Without a finish line, there's no way to know they've succeeded."},
  calm:{g:"Being told how to feel rarely changes the feeling. Offering a pause does more."},
  invalid:{g:"Acknowledging how it landed first keeps the talk on what happened, not on whether the reaction is allowed."},
  tone:{g:"Commenting on face or tone moves the talk to the delivery. Checking in keeps it on the words.", autistic:"Autistic faces and voices may not show what the person feels. Eye contact can make listening harder, not easier."},
  demand:{g:"Offering time helps people who need a moment to find their words."},
  already:{g:"Resending it without blame treats a missed message as a channel problem, not a character flaw."},
  feelingq:{g:"An open feelings question can feel like a test. Options are easier to answer.", alex:"Offering options helps when feelings are hard to name."},
  butc:{g:"Keeping the thanks and the request apart lets the thanks count.", adhd:"After \"but,\" the compliment tends to disappear."},
  multi:{g:"Several asks at once compete for the same working memory. A short numbered list, or one at a time, lets each one land.", adhd:"Many ADHD listeners keep the first or last item and lose the middle. A written list helps.", apd:"Spoken multi-step requests are easy to lose. Write them down too."},
  addwhen:{g:"The ask had no time. Adding one (fill in the blank) closes the loop so neither of you has to guess.", adhd:"A time or a cue helps it actually happen.", autistic:"A concrete time is easier to plan around than an open one."},
  addask:{g:"The sentence had a complaint but no ask. Adding one specific ask gives the listener something they can say yes to."},
  noticed:{g:"\"I noticed…\" makes it an observation from your side rather than a charge."},
  softno:{g:"A clear no or a date for a real maybe stops the question from looping."},
  hedge:{g:"If you know, say it plainly. If you don't, say what you'll do to find out."},
  joke:{g:"If there's a real point under the joke, it helps to say it plainly too."},
  ellipsis:{g:"Finishing the thought stops the listener from filling in the gap."},
  judgment:{g:"A flat verdict on something they made or did is hard to hear. Saying it as your own taste (\"for me\"), and asking for one change, keeps the honest part and makes it something they can act on."},
  past:{g:"Bringing in an old event turns one ask into a trial of the whole history. Staying with today keeps it about one thing the listener can act on.", adhd:"Old slips stacked together can feel like a verdict that can't be won.", autistic:"Two times at once are hard to hold. Today's event is clearer on its own."},
  minimal:{g:"A one-word reply can mean \"all good\" or \"I'm upset and done.\" Adding the missing half means the listener doesn't have to guess which.", anxiety:"Short replies are often read as anger when there's room to guess.", autistic:"The word may be taken at face value, so say it if you don't mean it literally."},
  pointed:{g:"\"Per my last message\" and \"as previously stated\" are known at work as a polite way to say \"you didn't read it.\" Restating the fact plainly keeps the fact and drops the edge.", anxiety:"The pointer can read as a formal warning.", autistic:"The useful part is the fact. The pointer only says a message exists."},
  nudge:{g:"\"Any update?\" and \"circling back\" don't say what you need, by when, or why now. Naming them makes it easy to reply, and takes the pressure out of the wait.", autistic:"A literal listener can't tell what kind of update, or how soon, is wanted.", adhd:"A nudge with no details sends the listener hunting for what they missed."},
  heat:{g:"\"For once,\" \"actually\" and \"I'm sick of it\" put the anger in the wording. Taking them out keeps your ask and your feeling, said once and plainly.", adhd:"\"For once\" lands on the whole history, not on today.", autistic:"Taken literally, \"for once\" says it never happened, which invites an argument about the facts."},
  feellike:{g:"\"I feel like you…\" introduces a judgment, not a feeling. Naming the real feeling and the event is clearer and kinder."}
};

const MINIMAL_FIX = {
  "fine":"I'm okay with that. [Or, if you're not: \"I'm not okay yet. Can we talk at [a time]?\"]",
  "i'm fine":"I'm okay. [Or say what's actually going on, even in a few words.]",
  "it's fine":"It's really okay, I mean it.",
  "k":"Okay, got it.", "kk":"Okay, got it.", "ok":"Okay, got it.", "okay":"Okay, got it.",
  "alright":"Okay, got it.", "all right":"Okay, got it.",
  "k thx":"Okay, got it. Thanks.", "k thanks":"Okay, got it. Thanks.", "kk thx":"Okay, got it. Thanks.", "ok thx":"Okay, got it. Thanks.", "ok thanks":"Okay, got it. Thanks.", "ok, thanks":"Okay, got it. Thanks.", "okay thanks":"Okay, got it. Thanks.", "okay, thanks":"Okay, got it. Thanks.", "ok ty":"Okay, got it. Thanks.", "ok thank you":"Okay, got it. Thank you.", "okay, thank you":"Okay, got it. Thank you.", "okay thank you":"Okay, got it. Thank you.", "ok, thank you":"Okay, got it. Thank you.",
  "sure":"Sure, I can do that.", "noted":"Noted, thanks.", "cool":"Cool, got it.", "great":"Great, got it.",
  "good":"Good, got it.", "yep":"Yes, got it.", "yeah":"Yes, got it.", "mhm":"Yes, got it.", "right":"Right, I understand.",
  "whatever":"I'm too frustrated to talk about this well right now. Can we come back to it at [a time]?",
  "nothing":"I'm not ready to talk yet. Can we talk at [a time]?",
  "nvm":"It's okay, it can wait until [a time].", "never mind":"It's okay, it can wait until [a time].", "nevermind":"It's okay, it can wait until [a time].",
  "if you say so":"I see it differently, but I'm okay going with that.",
  "wow":"[Say what you're reacting to, in words.]"
};
const PP_TO_PAST = {gone:"went",done:"did",taken:"took",seen:"saw",eaten:"ate",written:"wrote",given:"gave",been:"were",broken:"broke",forgotten:"forgot",driven:"drove",known:"knew",spoken:"spoke",chosen:"chose",shown:"showed",thrown:"threw",hidden:"hid",stolen:"stole",begun:"began",drunk:"drank",ridden:"rode",woken:"woke",worn:"wore",torn:"tore",flown:"flew",grown:"grew",drawn:"drew",fallen:"fell",gotten:"got"};
const BE_ADJ = /^be (?:normal|nicer|nice|better|more \w+|less \w+|like \w+|a (?:\w+ )?(?:person|adult|grown-?up|partner|parent)|an adult|different|reasonable|mature|responsible|considerate|supportive|present|there for me|on my side)\b/i;

const FILLER_ONLY = /^(?:(?:ok(?:ay)?|hey|so|and|also|now|look|listen|um|uh|well|right|alright|honestly|seriously|guys|babe|honey|please|and also|but)[\s,]*)+$/i;
/* "come to the party, it'll be fun" -> ["come to the party", "It'll be fun."] */
function splitTail(act){
  const m = act.match(/^(.+?),\s*((?:it|that|this|i|we|they|because|so|which|since)\b.+)$/i);
  return m ? [m[1], capFirst(m[2]).replace(/[.!?]*$/,".")] : [act, ""];
}
function lowerFirst(s){ return /^I\b/.test(s) ? s : s.replace(/^([A-Z])(?![A-Z])/, c=>c.toLowerCase()); }
function capFirst(s){ return s.replace(/^(\s*["'(\[]?)([a-z])/, (m,p,c)=>p+c.toUpperCase()); }
function endQ(s){ return s.replace(/[\s.!?,;:]+$/,"")+"?"; }
function endP(s){ return s.replace(/[\s,;:]+$/,"").replace(/([^.!?\]])$/,"$1."); }
function vagueObj(ask){ return ask.replace(/^(do|fix|handle|sort|finish|clean) (this|that|it)$/i, "$1 [the specific thing]").replace(/^help(?: out| more)?$/i, "help with [one specific task]"); }
function tidy(t){
  t = t.replace(/[ \t]+/g," ").replace(/ +([,.!?:;])/g,"$1").replace(/([,.!?:;])(?=[A-Za-z])/g,"$1 ").replace(/,\s*([.!?])/g,"$1")
       .replace(/([.?!])\s*\./g,"$1").replace(/\?\?+/g,"?").replace(/!!+/g,"!").replace(/^\s*[,.;:]\s*/,"").replace(/\s+\n/g,"\n").trim();
  t = t.replace(/(^|[.!?]\s+|[.!?]\]\s+|\n)([a-z])/g,(m,p,c)=>p+c.toUpperCase());
  t = t.replace(/\bi\b(?=[' ])/g,"I");
  if(t && !/[.!?\]"')]$/.test(t)) t+=".";
  return t;
}

function rewrite(an, opts){
  opts = opts||{};
  const W = new Set(opts.wirings||[]);
  const log = [];
  const note = (id, from, to, extra)=>{
    const prev = log.find(x=>x.id===id);
    if(prev){ if(from && !prev.from.includes(from)) prev.from.push(from); if(to && !prev.to.includes(to)) prev.to.push(to); return; }
    log.push({id, from: from?[from]:[], to: to?[to]:[], extra: extra||""});
  };
  const has = id=>!!an.found[id];
  let text = an.norm.trim();
  if(!text) return {main:"", variants:[], changes:[], ask:null};

  // one-word replies have their own fixes
  const low = text.toLowerCase().replace(/[.!]+$/,"").trim();
  if(has("minimal") && MINIMAL_FIX[low]){
    const out = MINIMAL_FIX[low];
    log.push({id:"minimal", from:[text], to:[out], extra:""});
    return finish(out, out, log, an, W, opts);
  }

  // whole-text clean-ups
  if(has("shout")){
    const before=text;
    const sp = shoutSpans(text);
    for(let i=sp.length-1;i>=0;i--) text = text.slice(0,sp[i].s)+sp[i].w.toLowerCase()+text.slice(sp[i].e);
    text = text.replace(/([!?])[!?]+/g,"$1");
    if(before!==text) note("caps", sp.map(x=>x.w).concat(before.match(/[!?]{2,}/g)||[]).slice(0,3).join(" "), "");
  }
  if(/\.{3,}|…/.test(text)){ text = text.replace(/\s*(?:\.{3,}|…)\s*/g,". "); note("dots","…","."); }

  const sents = splitSentences(text).map(x=>x.text);
  const out = [];
  const ctx = {converted:false, critical:false};
  const pairs = [];
  sents.forEach(s0=>{ const r = rewriteSentence(s0, ctx, note, an, W); pairs.push([s0, r]); if(r) out.push(r); });
  let main = out.join(" ");

  // several asks: say them as a short list. Nothing is dropped: a sentence
  // around the asks that carries a task or a deadline becomes its own item,
  // and any other sentence stays as a line above the list.
  let list = "";
  if(an.found.multi && an.segs.length>=2){
    const segLow = an.segs.map(x=>x.toLowerCase().slice(0,18));
    const items = [], lead = [];
    const seg = x=>capFirst(vagueObj(x.replace(/^(?:could you|can you|would you|please|and|also|then)\s+/i,"").replace(/^(?:also|just|kindly)\s+/i,"").replace(/[.?!]+$/,"")));
    let placed = false;
    pairs.forEach(([s0,r])=>{
      const isAsk = segLow.some(k=>s0.toLowerCase().includes(k));
      if(isAsk){ if(!placed){ an.segs.forEach(x=>items.push(seg(x))); placed=true; } return; }
      if(!r) return;
      const plain = r.replace(/^(?:reminder|note|fyi|heads up|psa|quick reminder)\s*[:,-]\s*/i,"").replace(/[.!]+$/,"").trim();
      if(!plain) return;
      if(WHEN_RE.test(plain) || /\b(?:due|deadline)\b/i.test(plain)) items.push(capFirst(plain.replace(/^(.+?) (?:is|are) due\b\s*/i,"$1, due ")));
      else lead.push(endP(capFirst(r)));
    });
    if(!placed) an.segs.forEach(x=>items.push(seg(x)));
    const dated = items.filter(x=>WHEN_RE.test(x)).length;
    const head = dated===items.length ? "Could you do these?" : dated ? "Could you do these? For the ones without a date, by [a time] works." : "Could you do these by [a time]?";
    list = (lead.length ? lead.join(" ")+"\n" : "")+head+"\n"+items.map((x,i)=>(i+1)+". "+x).join("\n");
    note("multi", an.segs.length+" asks in one sentence", "a numbered list");
  }

  // add a when to an ask that has none (not to a standing "going forward" request)
  const hasWhen = WHEN_RE.test(main) || /\bnext time\b/i.test(main);
  if((ctx.converted || an.found.nowhen) && !hasWhen){
    const re = /\b(Could you|Can you|Would you|Will you|Can we|Could we) (?!stop|not|be |listen|say|repeat|explain|[^?]*\b(?:when|if|whenever|next time)\b|understand|know|remember|look|keep|calm|relax|tell me|let me|[^?]*\b(?:rather than|instead)\b)([^?]+)\?/i;
    if(re.test(main)){ main = main.replace(re, (m,a,b)=>a+" "+b.replace(/\s+$/,"")+" by [a time]?"); note("addwhen","(no time)","by [a time]"); }
  }
  // "no rush" stays kind once there is a real time to be in no rush about
  if(an.found.vtime && /\[a time\]/.test(main)) main = main.replace(/\bno rush\b[.!]*/i, "No rush before then.");
  // add an ask when there was only a complaint
  if(!/\b(?:could you|would you|can you|can we|could we|would that work|will you|would you be|did you get a chance|do you have)\b/i.test(main) && (ctx.critical || an.missing.ask)){
    main = main.replace(/\s*$/," Could you [one specific thing] by [a time]?");
    note("addask","(no ask)","Could you [one specific thing] by [a time]?");
  }
  main = tidy(main);
  if(list) list = list.split("\n").map((l,i)=>i?l:tidy(l)).join("\n");
  return finish(main, list, log, an, W, opts);
}

function rewriteSentence(s, ctx, note, an, W){
  let t = s.trim(), m;
  const orig = t;
  if(["label","absolute","critic","compare","madefeel","past","again","passive","sarcasm","disclaim","blameq"].some(id=>an.found[id])) ctx.critical = true;
  if(/^(?:obviously,? |clearly,? )?you (?:didn't|did not|forgot|left|missed|broke|lost|ignored)\b/i.test(t)) ctx.critical = true;
  m = t.match(/^(?:obviously,? |clearly,? |so )?you (?:didn't|did not|never) (?:even )?read (it|my (?:message|text|email|note)|the (?:message|text|email|note))[.!?]*$/i);
  if(m){ const rep="Did you get a chance to read "+m[1]+"? Here's the short version: [the main point]."; if(/obviously|clearly/i.test(t)) note("minim", (t.match(/obviously|clearly/i)||[""])[0].toLowerCase(), ""); note("critq", t.replace(/[.!?]+$/,""), rep); return rep; }
  const f = (re)=>re.test(t);
  // --- disclaimers
  m = t.match(/^\s*(no offen[cs]e|with (?:all )?(?:due )?respect|don't take this the wrong way|not to be (?:rude|mean|harsh)|i'm not trying to be (?:rude|mean|harsh)|i hate to say (?:it|this)|to be (?:brutally )?honest|not gonna lie|no hate|i'm not being funny)\s*,?\s*(?:but\s*,?\s*)?/i);
  if(m){ t = t.slice(m[0].length); note("disclaim", m[1], ""); }
  m = t.match(/,?\s*\b(?:i'm )?just saying\b\s*,?\s*/i);
  if(m){ t = t.replace(m[0], " ").trim(); note("disclaim", m[0].replace(/^[,\s]+|[,\s]+$/g,""), ""); }
  if(!t.replace(/[.!?\s]/g,"")) return "";

  // --- pointed work phrases: keep the fact, drop the pointer
  m = t.match(/^\s*(?:(?:hey|hi|so)\b,?\s+)?(per my (?:last|previous|earlier) (?:message|email|e-mail|note|text|comment|reply|slack)|as per my (?:last|previous) (?:message|email|note)|as (?:previously|already) (?:stated|mentioned|discussed|noted|said|communicated|explained)|as i (?:previously|already) (?:stated|mentioned|said|noted|explained)|as stated (?:before|previously|above))\s*[,:;-]?\s*/i);
  if(m){
    const rest = t.slice(m[0].length).trim();
    const rep = rest ? "To recap: "+lowerFirst(rest) : "To recap: [the main point].";
    note("pointed", m[1], "To recap:"); t = rep;
  }
  t = t.replace(/\bfriendly reminder\b\s*[:,-]?\s*/i, ()=>{ note("pointed","friendly reminder","Reminder:"); return "Reminder: "; });
  // --- nudges with no details: name the thing, the time and why
  m = t.match(/^(?:(?:hey|hi|so)\b,?\s+)?(?:just\s+)?(?:any|got any) (?:updates?|news|word)(?: (?:on|about) (.+?))?[?.!]*$/i)
   || t.match(/^(?:(?:hey|hi|so)\b,?\s+)?(?:just\s+)?(?:circling back|circle back|checking in|following up|bumping this(?: up)?)(?: (?:on|about|re|with you about) (.+?))?[?.!]*$/i);
  if(m && an.found.nudge){
    const topic = m[1] && !/^(?:this|that|it|the above|my last(?: \w+)?|here)$/i.test(m[1].trim()) ? m[1].trim() : "[the specific thing]";
    const hasT = WHEN_RE.test(t);
    const rep = "Could you tell me where "+topic+" is at"+(hasT?"":" by [a time]")+"? [Say why you're asking now, like the deadline it feeds.]";
    note("nudge", t.replace(/[?.!]+$/,""), rep.replace(/ \[Say.*$/,""));
    return rep;
  }

  // --- heat words
  t = t.replace(/\s*,?\s*\bfor once\b/gi, ()=>{ note("heat","for once",""); return ""; });
  t = t.replace(/\b((?:can|could|will|would) you (?:please )?)actually\s+/gi, (mm,a)=>{ note("heat","actually",""); return a; });
  t = t.replace(/\b(?:i'm|i am)(?: getting)?(?: so| really)? (?:sick|tired) of (it|this|that)\b/gi, (mm,w)=>{ note("heat", mm, "I'm frustrated about "+w); return "I'm frustrated about "+w; });
  t = t.replace(/\s*,?\s*\bfor (?:(?:god's|heaven's|pete's) sake|crying out loud)\b,?/gi, (mm)=>{ note("heat", mm.replace(/^[\s,]+|[\s,]+$/g,""), ""); return ""; });
  if(!/^\W*seriously\W*$/i.test(t)) t = t.replace(/(^|\s|,)\s*seriously\b\s*,?\s*/gi, (mm,p)=>{ note("minim","seriously",""); return p===","?" ":p; }).replace(/^\s+/,"");

  // --- minimizers
  m = t.match(/^(?:it's|that's|it is) (?:so |really )?(?:simple|easy)\s*[,.!:;-]+\s*/i);
  if(m && t.length>m[0].length+2){ t = t.slice(m[0].length); note("minim", m[0].replace(/[,.!:;\s-]+$/,""), ""); }
  m = t.match(/^all you (?:have|need) to do is\s+(.+?)[.!?]*$/i);
  if(m){ t = "Could you "+m[1]+"?"; note("minim","all you have to do is","Could you"); ctx.converted=true; }
  t = t.replace(/,?\s*(?:it )?only takes a (?:second|minute|sec)\b[.!]?/i, mm=>{ note("minim", mm.replace(/^[,\s]+/,"").replace(/[.!]$/,""), ""); return "."; });
  t = t.replace(/\b(simply|obviously|clearly|literally)\b,?\s*/gi, (mm,w)=>{ note("minim", w.toLowerCase(), ""); return ""; });
  t = t.replace(/^seriously,?\s+(?=\w)/i, mm=>{ note("minim","seriously",""); return ""; });
  t = t.replace(/\bjust\s+(?=(?:do|go|get|put|ask|tell|say|stop|clean|pick|take|call|be|try|make|use|let|leave|finish|fix|wash|text|send|listen|give|bring|move|pay|answer|grow|relax|calm|deal|remember|read|check|look|throw|hang|reply|help|sit|turn|shut|close|open|wait|need|have)\b)/gi, ()=>{ note("minim","just",""); return ""; });
  t = t.replace(/\b(you|it's|that's|you're)\s+just\b/gi, (mm,a)=>{ note("minim","just",""); return a; });

  // --- again / still / even
  m = t.match(/^(.*?)\byou (?:still )(?:haven't|have not) (\w+)(.*?)(?:\s+yet)?([.!?]*)$/i);
  if(m){ t = (m[1]?m[1].replace(/[,\s]+$/,"")+". ":"")+"Could you "+baseVerb(m[2])+m[3]+"?"; note("again","still",""); ctx.converted=true; ctx.critical=true; }
  t = t.replace(/,?\s*\b(yet again|once again|as usual|like always)\b/gi, (mm,w)=>{ note("again", w.toLowerCase(), ""); return ""; });
  t = t.replace(/\s*\bagain\b/gi, (mm, off, str)=>{
    const before = str.slice(Math.max(0,off-16), off).toLowerCase();
    if(/(?:try|see you|thanks|thank you|say that|say it|meet|hear from you|talk|check|do that)\s*$/.test(before)) return mm;
    note("again","again",""); ctx.critical=true; return "";
  });
  t = t.replace(/\bstill\s+(?=(?:haven't|hasn't|didn't|don't|doesn't|won't|can't|isn't|aren't|not|no)\b)/gi, ()=>{ note("again","still",""); return ""; });
  t = t.replace(/\b(can't|didn't|don't|won't|couldn't|not|never) even\b/gi, (mm,a)=>{ note("again","even",""); return a; });

  // --- sarcasm (short lines)
  if(FBY.sarcasm.re && new RegExp(FBY.sarcasm.re.source,"i").test(t) && words(t)<=10 && !/\bbut\b/i.test(t)){
    note("sarcasm", t, "That's frustrating for me. [What happened, in plain words.]");
    ctx.critical=true;
    return "That's frustrating for me. [What happened, in plain words.]";
  }

  // --- guilt
  m = t.match(/^after (?:all|everything)[^,]*,\s*(.*)$/i);
  if(m){
    let rest = m[1];
    const r2 = rest.match(/^you (?:can't|won't|couldn't|don't) (\w+(?: \w+){0,6}?)(?: for me)?[.!?]*$/i);
    if(r2) rest = "Could you "+vagueObj(r2[1])+" by [a time]?";
    t = "I'm feeling stretched thin. "+rest; note("guilt", orig.split(",")[0], "I'm feeling stretched thin."); ctx.converted=!!r2;
  }
  m = t.match(/^(.*?)\bthe least you (?:could|can) do is (?:to )?(.+?)[.!?]*$/i);
  if(m){ t = (m[1]?m[1]+" ":"")+"Could you "+m[2]+"?"; note("guilt","the least you could do","Could you"); ctx.converted=true; }
  if(/^you owe me\b/i.test(t)){ note("guilt","you owe me","This matters a lot to me."); t="This matters a lot to me."; }
  if(/^i guess i (?:just )?don't matter/i.test(t)){ note("guilt",t,"I'm feeling left out."); t="I'm feeling left out."; }
  if(/^(?:i do everything|do i have to do everything)/i.test(t)){ note("guilt",t,"I'm carrying a lot right now. Could you take [one task]?"); t="I'm carrying a lot right now. Could you take [one task]?"; }
  if(/^do you (?:know|have any idea) how (?:hard|much|long) i/i.test(t)){ note("guilt",t,"I'm working really hard right now, and I'm tired."); t="I'm working really hard right now, and I'm tired."; }
  if(/^don't worry about me\b/i.test(t)){ note("guilt",t,"I could use some support."); t="I could use some support."; }
  if(/^i'll just (?:sit here|wait here|do everything)\b/i.test(t) || /^i guess i'll just (?:be|stay|sit)\b/i.test(t)){ note("guilt",t,"I could use a hand."); t="I could use a hand."; }

  // --- threats
  m = t.match(/^(.*?)\bif you (?:don't|do not|won't|refuse to) (.+?),\s*(?:then\s+)?(?:i'm|i'll|i will|i am|we're|we'll|we will|you'll|you will|i swear)\b.*$/i);
  if(m){ t = (m[1]?m[1].replace(/[,\s]+$/,"")+". ":"")+"Could you "+vagueObj(m[2])+"? It matters a lot to me."; note("threat", orig, ""); ctx.converted=true; }
  m = t.match(/^(.*?)\bif you (?:ever|dare) (.+?)(?: again)?,\s*(?:then\s+)?(?:i'm|i'll|i will|we're|we'll|you'll)\b.*$/i);
  if(m){ t = "It matters a lot to me that you don't "+m[2].replace(/\s+again$/i,"")+". Can we talk about it?"; note("threat", orig, ""); }
  if(/,?\s*\bor else\b[.!]*/i.test(t)){ t = t.replace(/,?\s*\bor else\b[.!]*/i,".")+" It matters a lot to me."; note("threat","or else",""); }
  if(/,?\s*\bor (?:i'm|i'll be) (?:leaving|done|out|going|gone)\b[^.!?]*|,?\s*\bor we're (?:done|over|finished|through)\b[^.!?]*/i.test(t)){ t = t.replace(/,?\s*\bor (?:i'm|i'll be) (?:leaving|done|out|going|gone)\b[^.!?]*|,?\s*\bor we're (?:done|over|finished|through)\b[^.!?]*/i,".")+" It matters a lot to me."; note("threat","or I'm…",""); }
  if(/^don't make me\b/i.test(t)){ note("threat",t,"I'm getting frustrated."); t="I'm getting frustrated."; }
  if(/\b(?:this is your (?:final|last) (?:warning|chance)|last chance)\b/i.test(t)){ note("threat","last chance",""); t=t.replace(/\b(?:this is your (?:final|last) (?:warning|chance)|(?:this is your )?last chance)\b[.!]*/i,"This matters a lot to me."); }
  if(/\byou'll regret (?:it|this)\b/i.test(t)){ note("threat","you'll regret it",""); t="I'm really upset about this."; }

  // --- comparisons
  m = t.match(/^(?:everyone|everybody|other people|most people)(?: else)? (?:manages to|can|is able to|knows how to) (.+?)[.!?]*$/i);
  if(m){ const rep="Could you "+m[1]+"? It would help me."; note("compare", t.replace(/[.!?]+$/,""), rep); ctx.converted=true; return rep; }
  if(FBY.compare.re && new RegExp(FBY.compare.re.source,"i").test(t)){
    const asks = /\?|\bbe more like\b|\bwhy can't you\b/i.test(t);
    const rep = asks ? "[What happened] was hard for me. Could you [one specific change]?" : "[What happened] bothered me.";
    note("compare", t, rep); ctx.critical=true; if(asks) ctx.converted=true;
    return rep;
  }

  // --- "you made me feel"
  m = t.match(/^(.*?)\byou (made|make|have made|'ve made|are making|'re making|keep making) me feel (?:so |really |very )?([a-z]+(?: [a-z]+)?)(?:\s+(?:when|by|because)\s+(.+?))?([.!?]*)$/i);
  if(m){
    const past = /made/.test(m[2]);
    const when = m[4] ? " when "+m[4] : (past ? " when [what happened]" : " when [that happens]");
    t = (m[1]?m[1].replace(/[,\s]+$/,"")+". ":"")+"I "+(past?"felt":"feel")+" "+m[3]+when+".";
    note("madefeel", orig.match(/you \w+(?: \w+)? me feel/i)[0], "I "+(past?"felt":"feel")+" …"+(m[4]?" when…":" when [what happened]"));
  }
  m = t.match(/^(.*?)\byou (made|make|are making|'re making) me (?:so |really )?(angry|mad|sad|upset|anxious|nervous|crazy|furious|miserable|cry|worry|late)\b(.*?)([.!?]*)$/i);
  if(m){
    const w=m[3].toLowerCase(); const past=/made/.test(m[2]);
    const map={cry: past?"I cried when [what happened].":"I end up in tears when [that happens].", worry: past?"I worried when [what happened].":"I worry when [that happens].", late:"I ended up late, and I'm frustrated about it.", crazy:"I feel overwhelmed when [that happens]."};
    const rest = (m[4]||"").trim();
    const rep = /^when\b/i.test(rest) && !map[w] ? (past?"I felt ":"I get ")+w+" "+rest+"." : (map[w] || ((/making/.test(m[2])?"I'm getting ":past?"I felt ":"I get ")+w+(/making/.test(m[2])?".":past?" when [what happened].":" when [that happens].")));
    t = (m[1]?m[1].replace(/[,\s]+$/,"")+". ":"")+rep; note("madefeel","you "+m[2]+" me "+w, rep);
  }
  if(/\bbecause of you,?\s*/i.test(t)){ t=t.replace(/\bbecause of you,?\s*/i,""); note("madefeel","because of you",""); }
  if(/^(?:it's|this is|that's|it is) (?:all )?your fault\b/i.test(t)){ note("madefeel",t,"[What happened] was hard for me."); t="[What happened] was hard for me."; ctx.critical=true; }
  m = t.match(/^you (?:ruined|wrecked|spoiled) (.+?)[.!?]*$/i);
  if(m){ const rep="I'm really disappointed about "+(/^(?:it|everything)$/i.test(m[1])?"[what happened]":m[1].replace(/^my\b/i,"my").replace(/^our\b/i,"our"))+"."; note("madefeel",t,rep); t=rep; ctx.critical=true; }

  // --- openers with no topic
  const OMIN = [
    [/^(?:we (?:need|have) to (?:have a )?(?:talk|chat|conversation)|we need to have a (?:talk|conversation|chat)|we should talk|i need to (?:talk|speak) (?:to|with) you|can we talk|can i talk to you)(?! about)\b(?:\s+(?:later|tonight|soon|when you get home|when you can))?[.!?]*$/i, "Can we talk about [the topic] at [a time]? [Say how big it is, like \"Nothing's wrong\" or \"It's important, and we're okay.\"]"],
    [/^call me(?:\s+(?:when you can|asap|now|when you get this))?[.!?]*$/i, "Could you call me about [the topic] by [a time]? [Say whether it's urgent.]"],
    [/^don't be mad,?(?:\s*but)?\s*/i, "I'm a little nervous to tell you this: "],
    [/^don't freak out,?(?:\s*but)?\s*/i, "Everyone's okay. There's something I want to tell you: "],
    [/^i have something to tell you[.!]*$/i, "I want to tell you something about [the topic]. [Say how big it is.]"],
    [/^i need to tell you something[.!]*$/i, "I want to tell you something about [the topic]. [Say how big it is.]"],
    [/^we (?:have|need to discuss) a problem[.!]*$/i, "Something's come up about [the topic]. [Say how big it is.] Can we talk at [a time]?"],
    [/^come here(?:,? now)?[.!]*$/i, "Could you come here for a minute? [Say why.]"],
    [/^(?:see me|you're in trouble)[.!]*$/i, "Can we talk about [the topic] at [a time]?"],
    [/^(?:have you )?got a (?:minute|sec)\?*$/i, "Do you have a few minutes to talk about [the topic]?"],
    [/^(?:(?:hey|hi|so)\b,?\s+)?can (?:we|i) (?:hop|jump|get) on (?:a )?(?:quick |short )?(call|zoom|teams call|video call|meeting)((?:\s+(?:today|tomorrow|now|later|soon|this (?:morning|afternoon|evening|week)|(?:at|before|after|by) [\w:.]+))*)[?.!]*$/i,
      m=>"Can we have a short "+(m[1].toLowerCase()==="meeting"?"meeting":m[1].toLowerCase()==="zoom"?"Zoom call":"call")+" about [the topic]"+(m[2]&&m[2].trim()?" "+m[2].trim():" at [a time]")+"? [Say how serious it is, like \"Nothing's wrong, it's a quick question.\"]"],
    [/^(?:(?:hey|hi|so)\b,?\s+)?(?:can|could) you (?:come|stop by|pop|swing by|drop by) (?:to |into |by |over to )?my (office|desk)((?:\s+(?:today|tomorrow|now|later|soon|this (?:morning|afternoon|evening|week)|(?:at|before|after|by) [\w:.]+))*)[?.!]*$/i,
      m=>"Could you come to my "+m[1].toLowerCase()+(m[2]&&m[2].trim()?" "+m[2].trim():" at [a time]")+" to talk about [the topic]? [Say how serious it is, like \"Nothing's wrong, it's a quick question.\"]"],
    [/^(?:(?:hey|hi|so)\b,?\s+)?(?:can i (?:grab|borrow|steal) you(?: for a (?:minute|sec|second|moment))?|do you have (?:a )?(?:minute|sec|second|moment))[?.!]*$/i, "Do you have a few minutes at [a time] to talk about [the topic]? [Say how serious it is.]"]
  ];
  for(const [re,rep] of OMIN){ if(re.test(t)){ const mm=t.match(re); const r = typeof rep==="function" ? rep(mm) : rep; t=t.replace(re,r); note("ominous", mm[0].replace(/[\s:]+$/,""), r.replace(/\s+$/,"")); break; } }

  // --- telling someone how to feel, invalidation, tone, demands (kept from the first version)
  const OLD = [
    ["calm",/\b(?:you (?:need to |have to |should )?)?calm down\b[.!]*/gi, "This is a lot. Want to take ten minutes and come back to it?"],
    ["calm",/\b(?:relax|chill out|chill)\b[.!]*/gi, "Want to take a short break?"],
    ["calm",/\bget over it\b[.!]*/gi, "I can see this is still bothering you."],
    ["calm",/\bgrow up\b[.!]*/gi, "I'd like us to handle this differently."],
    ["calm",/\b(?:let it go|move on|drop it|deal with it)\b[.!]*/gi, "Can we set this aside and come back to it at [a time]?"],
    ["calm",/\bstop (?:crying|overreacting)\b[.!]*/gi, "I can see this hit hard. What would help right now?"],
    ["invalid",/\byou're (?:being |just )?(?:so |too |really )?(?:overreacting|dramatic|too sensitive|so sensitive|sensitive|irrational|silly)\b[.!]*/gi, "This hit you harder than I expected."],
    ["invalid",/\b(?:it's|that's) not (?:a )?big deal\b[.!]*/gi, "I didn't realize this mattered so much."],
    ["invalid",/\byou're making a (?:big )?deal (?:out )?of (?:nothing|it|this)\b[.!]*/gi, "This is bigger for you than I realized. Help me understand."],
    ["invalid",/\bit was (?:just )?a joke\b[.!]*/gi, "I meant it as a joke, and I can see it didn't land that way."],
    ["invalid",/\bcan't (?:you )?take a joke\b\?*/gi, "I meant it as a joke, and I can see it didn't land that way."],
    ["invalid",/\byou're imagining (?:it|things)\b[.!]*/gi, "I remember it differently, and I want to hear how you saw it."],
    ["invalid",/\bthat's not what happened\b[.!]*/gi, "I remember it differently. Can we each say what we saw?"],
    ["vemo",/\byou know what you did\b[.!]*/gi, "When [what happened], I felt [your feeling]."],
    ["vemo",/\bif you (?:really |actually )?cared,? (?:you would|you'd)\b/gi, "It would mean a lot to me if you would"],
    ["vemo",/\bi shouldn't have to (?:tell|ask) you\b[^.!?]*[.!?]*/gi, "Here's what I'd like: [what you'd like]."],
    ["vemo",/\byou should (?:already )?know\b[^.!?]*[.!?]*/gi, "I'll say it plainly: [what you'd like]."],
    ["vemo",/\bfigure it out\b[.!]*/gi, "Here's what I'd like: [what you'd like]."],
    ["vemo",/\bread between the lines\b/gi, "take this at face value"],
    ["tone",/\blook at me when i'm talking(?: to you)?\b[.!]*/gi, "Are you with me? You don't have to look at me."],
    ["tone",/^look at me\b[.!]*/gi, "Are you with me?"],
    ["tone",/\b(?:watch|lose) (?:your|that) tone\b[.!]*/gi, "I'm hearing your tone as upset. Is that what you mean?"],
    ["tone",/\bdon't (?:use|give me) that (?:tone|look)\b[.!]*/gi, "I'm reading that as upset. Is that right?"],
    ["demand",/\b(?:say something|answer me|talk to me)\b[.!]*/gi, "Take your time. I'm here when you're ready."],
    ["demand",/\bare you ignoring me\?*/gi, "No rush. Reply once you're free."],
    ["demand",/\bwhy aren't you (?:answering|responding|replying|saying anything)\?*/gi, "No rush. Reply once you're free."],
    ["stopask",/\bstop asking(?: me)?(?: that)?\b[.!]*/gi, "I answered that one. I'm here with you while the doubt passes."],
    ["stopask",/\bnot this again\b[.!]*/gi, "I answered that one. I'm here with you while the doubt passes."],
    ["tic",/^.*\b(?:stop (?:doing|making) that|quit (?:it|doing that)|can't you (?:just )?stop)\b[^.!?]*[.!?]*$/gi, "Could you stop [the specific thing]? [If it's a tic or a stim, leave this sentence out. It isn't a message.]"],
    ["already",/\bi (?:already )?told you (?:this |that )?(?:already|before|twice)\b[.!]*/gi, "Let me say this again in a way that sticks:"],
    ["already",/\b(?:i already (?:told|said|asked|explained)(?: you)?(?: this| that)?|as i (?:said|mentioned|wrote|told you)|like i said)\b[,.!]*/gi, "To recap:"],
    ["already",/\bdid you (?:even )?read (?:it|my (?:message|text|email))\?*/gi, "Here's the short version:"],
    ["feelingq",/\bhow (?:does|did) (?:that|it|this) make you feel\?*/gi, "Did that feel more like tired, annoyed or hurt? It's okay if it's hard to say yet."],
    ["feelingq",/\bhow do you feel(?: about (?:it|that|this))?\?*/gi, "Are you more tired, annoyed or hurt right now? Or would you rather not say yet?"],
    ["feelingq",/\bwhat's wrong\?+/gi, "Would space or company help more right now?"],
    ["feellike",/^i feel (?:like|that) you (.+?)[.!?]*$/gi, "I've been feeling [your feeling]. When [what happened], it seemed to me like you $1."],
    ["softno",/\bwe'll see\b[.!]*/gi, "[If it's a no, say no kindly. If it's a real maybe, say when you'll decide.]"],
    ["softno",/\bi'll think about it\b/gi, "I'll think about it and tell you by [a time]"],
    ["urgent",/\bhurry(?: up)?\b[.!]*/gi, "Could we leave by [a time]?"]
  ];
  OLD.forEach(([id,re,rep])=>{ re.lastIndex=0; if(re.test(t)){ re.lastIndex=0; const mm=(t.match(re)||[""])[0]; t=t.replace(re,rep); note(id, mm.replace(/[.!?]+$/,""), rep); if(["tone","vemo","calm","invalid"].includes(id)) ctx.critical = ctx.critical || id==="vemo"; } });

  // --- criticism questions
  const CQ = [
    [NOTDONE_RE, (m)=>{ const thing=/^(?:this|that|it|these|those)$/i.test(m[2]) ? "[the task]" : m[2]; const plural=/^(?:these|those)$/i.test(m[2])||/s$/.test(m[2]); return pre(m[1])+"Where "+(plural&&thing!=="[the task]"?"are ":"is ")+thing+" at? Could you get "+(thing==="[the task]"?"it":(plural?"them":"it"))+" "+m[3].toLowerCase()+" by [a time]? [Say why it matters now, if it does.]"; }],
    [/^(.*?)\bwhy didn't you (?:just |even )?(.+?)\?*$/i, (m)=>pre(m[1])+"Next time, could you "+vagueObj(m[2])+"? It would really help me."],
    [/^(.*?)\bwhy don't you (?:ever |just )?(.+?)\?*$/i, (m)=>pre(m[1])+"Could you "+vagueObj(m[2])+"? It would mean a lot to me."],
    [/^(.*?)\bwhy can't you (?:ever |just )?(.+?)\?*$/i, (m)=>BE_ADJ.test(m[2]) ? "[What happened] was hard for me. Could you [one specific change]?" : pre(m[1])+"Could you "+m[2]+"?"],
    [/^(.*?)\bwhy won't you (.+?)\?*$/i, (m)=>pre(m[1])+"Could you "+m[2]+"? If not, could you tell me what's in the way?"],
    [/^(.*?)\bwhy do you (?:always |keep |constantly )?(.+?)\?*$/i, (m)=>"It's hard for me when you "+m[2]+". Can we talk about it?"],
    [/^(.*?)\bwhy would you (.+?)\?*$/i, ()=>"Help me understand what happened."],
    [/^(.*?)\bwhy are you (?:being |so |always )(.+?)\?*$/i, ()=>"Something feels off between us. What's going on for you?"],
    [/^how many times do i have to (?:tell|ask|remind) you(?: to (.+?))?\?*$/i, (m)=> m[1] ? "This keeps coming up. Could you "+m[1]+"? Maybe we can find a way to make it easier to remember." : "This keeps coming up. Can we find a system for it together?"],
    [/^how (?:hard|difficult) (?:is|can) it (?:be )?to (.+?)\?*$/i, (m)=>"Could you "+m[1]+"?"],
    [/^is it (?:really )?(?:too much|so hard) to ask (?:for you )?(?:to |that you |you to )?(.+?)\?*$/i, (m)=>"Could you "+m[1]+"? It matters to me."],
    [/^do you (?:even |ever )?care\?*$/i, ()=>"I'm not feeling cared about right now, and I'd like to talk about it."],
    [/^(?:do you (?:even |ever )listen|are you (?:even )?listening)(?: to me)?\?*$/i, ()=>"I want to make sure this is landing. What did you hear?"],
    [/^do you (?:even|ever) (\w+)(.*?)\?*$/i, (m)=>"Could you "+m[1]+m[2]+" more often?"],
    [/^did you (?:even )?(think|try|listen|bother)(.*?)\?*$/i, (m)=>"Did you get a chance to "+m[1].replace("bother","")+(m[2]||"")+"?"],
    [/^what(?:'s| is) wrong with you\?*$/i, ()=>"[What happened] is bothering me. Can we talk about it?"],
    [/^what(?:'s| is) your problem\?*$/i, ()=>"Something seems off. What's going on for you?"],
    [/^what were you thinking\?*$/i, ()=>"Help me understand what happened."],
    [/^what did you expect\?*$/i, ()=>"I'm frustrated about how this turned out."],
    [/^how could you(?: .+?)?\?*$/i, ()=>"I'm really hurt by this. Can we talk about what happened?"],
    [/^who does that\?*$/i, ()=>"That really bothered me."],
    [/^(?:seriously|really|are you kidding(?: me)?|are you serious)\?+$/i, ()=>"[Say what upset you, plainly.]"],
    [/^(.*?)\b(?:can|could) you not (.+?)\?*$/i, (m)=>pre(m[1])+"Could you [what you'd like instead] rather than "+m[2].replace(/[.!?]+$/,"")+"?"],
    [/^(.*?)\bcan't you (?:just )?(.+?)\?*$/i, (m)=>pre(m[1])+"Could you "+m[2]+"?"]
  ];
  function pre(p){ p=(p||"").replace(/[,\s]+$/,""); if(!p || FILLER_ONLY.test(p)) return ""; return /^(?:tomorrow|tonight|today|later|next time|this weekend|on \w+day|in the morning|after dinner)$/i.test(p) ? p+", " : p+". "; }
  for(const [re,fn] of CQ){
    const mm = t.match(re);
    if(mm){
      const rep = fn(mm);
      const id = /can|could/i.test(mm[0].slice(0,40)) && /\bnot\b/i.test(mm[0].slice(0,40)) ? "cannot" : "critq";
      note(id, mm[0].replace(/[?.!]+$/,""), rep.replace(/\?.*$/,"?"));
      t = rep; ctx.critical = true; if(/Could you/.test(rep)) ctx.converted=true;
      break;
    }
  }

  // --- hindsight ("you should have")
  m = t.match(/^(.*?)\byou (?:should|could)(?: have|'ve| of) (?:known|realized|realised|seen|noticed|guessed|figured)\b.*$/i);
  if(m){ const rep=pre(m[1])+"I'll say it plainly next time: [what you'd like]."; note("shouldhave", t.replace(/[.!?]+$/,""), rep); t=rep; ctx.critical=true; }
  m = t.match(/^(.*?)\byou (?:should|could)(?: have|'ve| of) (\w+)(.*?)([.!?]*)$/i);
  if(m){ const rep=pre(m[1])+"Next time, could you "+baseVerb(m[2])+m[3]+"? It would really help me."; note("shouldhave","you should have "+m[2], "Next time, could you "+baseVerb(m[2])+"…?"); t=rep; ctx.converted=true; }
  m = t.match(/^(.*?)\byou (?:shouldn't|should not)(?: have|'ve) (\w+)(.*?)([.!?]*)$/i);
  if(m){ const v=PP_TO_PAST[m[2].toLowerCase()]||m[2]; const rep=pre(m[1])+"It was hard for me when you "+v+m[3]+"."; note("shouldhave","you shouldn't have "+m[2],"It was hard for me when you "+v+"…"); t=rep; }

  // --- "I need this done (now)"
  m = t.match(/^(.*?)\bi need (this|that|it|the [\w ]+?|my [\w ]+?|these|those) (done|finished|fixed|sent|cleaned|paid|signed)\b(.*?)([.!?]*)$/i);
  if(m){ const rep=pre(m[1])+"Could you get "+m[2]+" "+m[3]+m[4]+"?"; note("oblig","I need "+m[2]+" "+m[3],"Could you get "+m[2]+" "+m[3]+"?"); t=rep; ctx.converted=true; }

  // --- pressure words
  m = t.match(/^(.*?)\byou(?=['\s])(?:'ll)?\s*(?:really |seriously |absolutely |honestly |actually |definitely )?(?:'ll )?(need to|needs to|have to|has to|have got to|'ve got to|got to|gotta|must|ought to|had better|'d better|better|are supposed to|'re supposed to|were supposed to|are required to|'re required to|are expected to|'re expected to) (.+?)([.!?]*)$/i);
  if(m && !/^(?:be (?:tired|exhausted|busy|joking|kidding))/i.test(m[3])){
    let head = m[1].replace(/\s+$/,"");
    let lead = "";
    if(FILLER_ONLY.test(head.replace(/,$/,""))) head = "";
    else if(/(?:\band|\bbut|\bso)$/i.test(head)){ lead = head.replace(/[,\s]*(?:and|but|so)$/i,"").trim(); head=""; }
    else if(head && words(head)>3){ lead = head.replace(/,$/,""); head=""; }
    const [act, tail] = splitTail(m[3]);
    let rep;
    const understand = act.match(/^(understand|know|realize|realise|accept|see) (?:that )?(.+)$/i);
    if(understand) rep = "It's important to me that you know "+understand[2]+".";
    else if(/supposed|expected|required/i.test(m[2])) rep = "Could you "+vagueObj(act)+"? I was counting on that.";
    else rep = "Could you "+vagueObj(act)+"?";
    if(tail) rep += " "+tail;
    if(head) rep = head.replace(/,?$/,",")+" "+lowerFirst(rep);
    t = (lead ? endP(lead)+" " : "") + rep;
    note("oblig", "you "+m[2], understand ? "It's important to me that you know…" : "Could you…?");
    ctx.converted = true;
  }
  m = t.match(/^(.*?)\b(?:i|we) (?:really |just |still )?need you to (.+?)([.!?]*)$/i) || t.match(/^(.*?)\bi (?:really )?want you to (.+?)([.!?]*)$/i) || t.match(/^(.*?)\bmake sure (?:you |to )(.+?)([.!?]*)$/i);
  if(m){ const phrase=(orig.match(/\b(?:i|we) (?:really |just |still )?need you to|\bi (?:really )?want you to|\bmake sure (?:you|to)/i)||["I need you to"])[0]; t = pre(m[1])+"Could you "+vagueObj(m[2])+"?"; note("oblig", phrase, "Could you…?"); ctx.converted=true; }
  m = t.match(/^(.*?)\byou (?:really |seriously |just |honestly |definitely |probably |totally )?should (?!have\b|'ve\b)(.+?)([.!?]*)$/i);
  if(m){ const [act,tail]=splitTail(m[2]); const lead=/^(?:come|try|see|join|watch|check out|read|listen to|go|meet|visit|call|text)\b/i.test(act)?"Would you like to ":"Would you be willing to "; t = pre(m[1])+lead+act+"?"+(tail?" "+tail:""); note("should","you should",lead.trim()+"…?"); }
  m = t.match(/^(.*?)\byou (?:really )?(?:shouldn't|should not) (?!have\b|'ve\b)(.+?)([.!?]*)$/i);
  if(m){ t = pre(m[1])+"I'd rather you didn't "+m[2]+"."; note("should","you shouldn't","I'd rather you didn't…"); }

  // --- bare commands
  const cmd = commandOf(t);
  if(cmd && !/^(?:could|would|can|will) you\b/i.test(t)){
    const lead = t.slice(0, t.indexOf(cmd)).replace(/[,\s]+$/,"");
    let c = cmd.replace(/[.!?]+$/,"").trim();
    let rep;
    let mm2;
    if((mm2=c.match(/^(?:don't|do not) forget (?:to )?(.+)$/i))) rep = "Could you remember to "+mm2[1]+"?";
    else if((mm2=c.match(/^(?:don't|do not|never) (.+)$/i))) rep = "Could you [what you'd like instead] rather than "+mm2[1]+"?";
    else rep = "Could you "+vagueObj(lowerFirst(c))+"?";
    const keepLead = lead && !/^(?:ok(?:ay)?|hey|so|and|also|now|look|listen|um|uh|well|right|alright|honestly|seriously|please)$/i.test(lead);
    t = (keepLead ? capFirst(lead)+", "+lowerFirst(rep) : rep);
    note("impera", c.split(/\s+/).slice(0,3).join(" ")+"…", /rather than/.test(rep) ? "Could you [what you'd like instead] rather than…?" : "Could you…?");
    ctx.converted = true;
  }

  // --- hints
  const HINTS = [
    [/^it(?: would|'d) be (?:nice|great|good|helpful|lovely) if (?:someone|somebody|anyone|you) (?:could |would )?(.+?)[.!?]*$/i, m=>"Could you "+baseForm(m[1])+"?"],
    [/^it(?: would|'d) be (?:nice|great|good|helpful|lovely) if (?:the |my |our )?([\w ]+?) (?:got|were|was|could be) (\w+)(.*?)[.!?]*$/i, m=>"Could you "+baseVerb(m[2])+" the "+m[1]+m[3]+"?"],
    [/^(?:someone|somebody|anyone) (?:should|needs to|could|has to|might want to) (.+?)[.!?]*$/i, m=>"Could you "+baseForm(m[1])+"?"],
    [/^i wish (?:you|someone|somebody) would (.+?)[.!?]*$/i, m=>"Could you "+m[1]+"?"],
    [/^i guess i'll (?:just )?(?:do|handle|take care of|deal with) (?:it|this|that)(?: myself)?[.!?]*$/i, ()=>"I could use a hand with this. Could you take [one part]?"],
    [/^i'll (?:just )?do it myself[.!?]*$/i, ()=>"I could use a hand with this. Could you take [one part]?"],
    [/^would it kill you to (.+?)\?*$/i, m=>"Could you "+m[1]+"?"],
    [/^(?:the|your) (trash|garbage|bins?|recycling|dishes|sink|laundry)(?: is| are|'s) [^.!?]*[.!?]*$/i, m=>"Could you "+(HINT_OBJ[m[1].toLowerCase()]||"deal with the "+m[1])+"?"],
    [/^it's (?:so |really )?(cold|hot|loud|dark) in here[.!?]*$/i, m=>({cold:"Could you close the window or turn up the heat?",hot:"Could you open a window or turn on the fan?",loud:"Could you turn it down a bit?",dark:"Could you turn on a light?"})[m[1].toLowerCase()]]
  ];
  for(const [re,fn] of HINTS){ const mm=t.match(re); if(mm){ const rep=fn(mm); note("hint", mm[0].replace(/[.!?]+$/,""), rep); t=rep; ctx.converted=true; break; } }
  t = t.replace(/\bno pressure,? but\b/i, ()=>{ note("hint","no pressure, but",""); return "No pressure at all, and"; });

  // --- passive blame
  m = t.match(/^(?:mistakes|errors) (?:were|have been|got) made(.*?)[.!?]*$/i);
  if(m){ const rep="I think something went wrong"+m[1]+". Can we look at it together at [a time]?"; note("passive", t.replace(/[.!?]+$/,""), "I think something went wrong… Can we look at it together?"); t=rep; }
  else if(/^(?:the|my|our|your) [a-z]+(?: [a-z]+)? (?:was|were|got|has been|have been) (?:left|broken|forgotten|ignored|missed|lost|ruined|damaged|dropped|spilled|scratched|thrown out|eaten|used up|not \w+)\b/i.test(t) || /^(?:it|this|that|nothing|the [a-z]+) (?:didn't|never|hasn't|wasn't) (?:get|got|gets|been) (?:done|fixed|cleaned|paid|washed|finished|sent|put away|locked)\b/i.test(t)){
    note("passive", t.replace(/[.!?]+$/,""), "I noticed…"); t = "I noticed "+lowerFirst(t); ctx.critical=true;
  }

  // --- labels
  if(new RegExp(FBY.label.re.source,"i").test(t) && !/\[/.test(t)){
    const mm = t.match(new RegExp(FBY.label.re.source,"i"))[0];
    const rep = /^(?:that was|that's|this is|that is)/i.test(mm) ? "[That specific thing] didn't work for me." : "When [what happened], I felt frustrated.";
    note("label", mm, rep); t = rep; ctx.critical = true;
  }

  // --- absolutes
  m = t.match(/^(.*?)\byou(?:'re| are) always (.+?)([.!?]*)$/i);
  if(m){ t = pre(m[1])+"Lately it's felt like you're "+m[2]+" a lot."; note("absolute","always","lately it's felt like"); ctx.critical=true; }
  m = t.match(/^(.*?)\byou(?:'re| are) never (.+?)([.!?]*)$/i);
  if(m){ t = pre(m[1])+"Lately it's felt like you're not "+m[2]+" much."; note("absolute","never","lately it's felt like"); ctx.critical=true; }
  m = t.match(/^(.*?)\byou always (\w+)(.*?)([.!?]*)$/i);
  if(m){ t = pre(m[1])+"Lately it's felt like you "+m[2]+m[3]+"."; note("absolute","always","lately it's felt like"); ctx.critical=true; }
  m = t.match(/^(.*?)\byou never (\w+)(.*?)([.!?]*)$/i);
  if(m){ const v=m[2].toLowerCase(); const neg = PAST[v]||/ed$/.test(v) ? "didn't "+baseVerb(v) : "don't "+v; t = pre(m[1])+"Lately it's felt like you "+neg+m[3]+"."; note("absolute","never","lately it's felt like"); ctx.critical=true; }
  m = t.match(/^every (?:single )?time (.+?)([.!?]*)$/i);
  if(m){ t = "Lately, when "+m[1]+"."; note("absolute","every time","lately, when"); ctx.critical=true; }
  m = t.match(/^(nobody|no one|nothing|everyone|everybody)(?: else)? ever (.+?)([.!?]*)$/i) || t.match(/^(nobody|no one)(?: else)? (cares|helps|listens|does|thinks)(.*?)([.!?]*)$/i);
  if(m){ t = "It feels like "+m[1].toLowerCase()+" "+m[2]+(m[3]&&!/^[.!?]*$/.test(m[3])?m[3]:"")+"."; note("absolute", m[1]+(/ever/.test(orig)?" ever":""), "it feels like…"); ctx.critical=true; }
  t = t.replace(/\b(?:constantly|all the time)\b/gi, mm=>{ note("absolute", mm.toLowerCase(), "a lot lately"); ctx.critical=true; return "a lot lately"; });
  t = t.replace(/\bevery (?:single )?time\b/gi, mm=>{ note("absolute", mm.toLowerCase(), "a few times lately"); ctx.critical=true; return "a few times lately"; });
  t = t.replace(/\b(you|you're|he|she|they|he's|she's|they're) always\b/gi, (mm,a)=>{ note("absolute","always","often"); ctx.critical=true; return a+" often"; });

  // --- past-bringing
  t = t.replace(/,?\s*\b(?:just )?like (?:the )?last time\b/gi, mm=>{ note("past", mm.replace(/^[,\s]+/,""), ""); return ""; });
  m = t.match(/^(?:last time|remember when you)\b[^.!?]*[.!?]*$/i);
  if(m){ note("past", t.replace(/[.!?]+$/,""), "[What happened today] was hard for me."); t = "[What happened today] was hard for me."; ctx.critical=true; }
  t = t.replace(/\byou did (?:this|that) (?:too|as well|before)\b/gi, mm=>{ note("past", mm, "this happened"); return "this happened"; });
  t = t.replace(/^here we go again[.!]*\s*/i, mm=>{ note("past","here we go again",""); return ""; });

  // --- time pressure
  const hadReason = WHY_RE.test(t) || WHY_RE.test(an.norm);
  let urgentHit = false;
  if(/^(?:could|would|can) you\b/i.test(t)) t = t.replace(/\s*\b(?:right now|immediately|this instant|this second|this minute|asap|a\.s\.a\.p\.?|urgently)\b/gi, mm=>{ urgentHit=true; note("urgent", mm.trim(), "by [a time]"); return " by [a time]"; });
  if(/^(?:could|would) you\b/i.test(t) && /\bnow\b/i.test(t) && !/\b(?:for|by|just|until|right) now\b/i.test(t)){
    t = t.replace(/\s*\bnow\b/i, ()=>{ urgentHit=true; note("urgent","now","by [a time]"); return " by [a time]"; });
  }
  if(/^please\b/i.test(t) && /\b(?:asap|a\.s\.a\.p\.?|right now|immediately|urgently)\b/i.test(t)){
    t = t.replace(/\s*\b(?:right now|immediately|asap|a\.s\.a\.p\.?|urgently)\b/gi, mm=>{ note("urgent", mm.trim(), "by [a time]"); return " by [a time]"; });
    t = endP(t) + (hadReason ? "" : " It's urgent because [the reason].");
  }
  if(urgentHit && !hadReason) t = endQ(t).replace(/\?$/,"? It's urgent because [the reason].").replace(/^([^?]*[^?.])\.\s*It's urgent/,"$1. It's urgent");

  // --- vague timing and standards
  t = t.replace(/\b(?:when you get a (?:chance|sec|second|minute|moment)|when you have (?:a (?:sec|second|minute|moment|chance)|time)|when you're free|when you can|whenever|at some point|sometime|eventually|in a bit|one of these days|soon|(?<!see you |talk to you |talk |catch you )later(?! on today))\b/gi, mm=>{ note("vtime", mm, "by [a time]"); return "by [a time]"; });
  t = t.replace(/\bby \[a time\] by \[a time\]/g,"by [a time]");
  t = t.replace(/\b(?:clean(?:ed)? up|tidy(?: up)?)(?: a bit| a little)?\b/gi, mm=>{ note("vstd", mm, "clean [which rooms, and what done looks like]"); return "clean [which rooms, and what done looks like]"; });
  t = t.replace(/\b(?:properly|the right way|like a normal person|like an adult)\b/gi, mm=>{ note("vstd", mm, "[how exactly]"); return "[how exactly]"; });
  t = t.replace(/\bhelp (?:out|more)\b/gi, mm=>{ note("vstd", mm, "help with [one specific task]"); return "help with [one specific task]"; });
  t = t.replace(/\bbe (?:more )?(?:supportive|responsible|considerate|present|helpful|thoughtful|involved|mature)\b/gi, mm=>{ note("vstd", mm, "[one specific thing]"); return "[one specific thing, like asking how the appointment went]"; });
  t = t.replace(/\b(?:do better|step up|pitch in|make an effort|try harder)\b/gi, mm=>{ note("vstd", mm, "[one specific thing]"); return "[one specific thing]"; });

  // --- compliment then "but"
  m = t.match(/^(.*?\b(?:good|great|nice|love|like|appreciate|thanks|thank you|well done)\b[^.!?]{0,60}?),?\s+but\s+(.+?)[.!?]*$/i);
  if(m){ t = endP(m[1])+" [Later, as its own sentence:] "+capFirst(m[2])+"."; note("butc","…, but …","two separate sentences"); }

  // --- hedges, jokes
  if(an.found.hedge && words(an.norm)<=14 && /\b(?:i think|pretty sure|probably|i guess|i believe)\b/i.test(t)){
    const plain = t.replace(/\b(?:i think|pretty sure|probably|i guess|i believe)\s*/gi,"");
    t = "[If you're sure:] "+capFirst(plain)+" [If you're not: \"I'm not sure. I'll check now.\"]"; note("hedge","hedge","");
  }
  t = t.replace(/\s*(?:\b(?:lol|lmao|jk|haha+|hehe)\b|😂|🙃|😉|🙄|😒|😅|🤣)/gi, mm=>{ note("joke", mm.trim(), ""); return ""; });

  // --- a judgment about a thing of theirs: own it as your taste, then ask
  m = t.match(/^your ([a-z]+(?: [a-z]+)?) (is|was|are|were) (?:so |really |too |kind of |pretty )?(bland|boring|terrible|awful|bad|gross|disgusting|a mess|messy|wrong|annoying|too \w+|not (?:good|great|very good)|off)[.!]*$/i);
  if(m){ const adj=m[3].toLowerCase(); const said=/^(?:a mess|messy)$/.test(adj)?"messier than I'm comfortable with":/^(?:terrible|awful|gross|disgusting|bad)$/.test(adj)?"not working for me":"a bit "+adj; const rep="For me, the "+m[1]+" "+m[2]+" "+said+". Could we try [one specific change]?"; note("judgment", t.replace(/[.!]+$/,""), rep); t=rep; ctx.converted=false; }
  m = t.match(/^you could (?!have\b|'ve\b)(.+?)[.!]*$/i);
  if(m && ctx.critical){ t="Could you "+m[1]+"?"; note("oblig","you could","Could you…?"); }

  // --- "you're late" style statements: say it from your side
  if(ctx.critical && /^you(?:'re| are| were| did| didn't| forgot| left| missed| haven't| hadn't| broke| lost)\b/i.test(t) && !/\?$/.test(t)){
    t = "I noticed "+lowerFirst(t); note("noticed","you…","I noticed you…");
  }
  if(/^you \w+\?$/i.test(t) && ctx.critical){ t = "I noticed "+lowerFirst(t.replace(/\?$/,".")); note("noticed","you…?","I noticed you…"); }

  if(an.found.label || an.found.absolute || an.found.critic || an.found.compare || an.found.madefeel || an.found.past || an.found.again || an.found.passive || an.found.sarcasm) ctx.critical = true;
  return t.trim();
}

/* ---------- variants and the change list ---------- */
const CLOSE_REL = ["partner","family","friend","coparent"];
const WORK_REL = ["coworker","manager"];
/* lines a brief version may leave out: courtesy, and notes to the speaker */
const DROPPABLE = /^(?:no rush(?: before then)?|thanks?(?: you)?(?: so much)?|thank you(?: so much)?|it's urgent because \[the reason\]|it (?:matters|would (?:really )?(?:help|mean a lot to)) (?:a lot )?(?:to )?me|it would really help me|it would mean a lot to me|i was counting on that|\[[^\]]*\])[.!?]*$|^\[[^\]]*\]$/i;
function explainChange(c, W){
  const why = CHANGE_WHY[c.id] || {g:""};
  const notes = [];
  ["autistic","adhd","anxiety","trauma","hsp","dld","apd","alex","dyspraxic","nt"].forEach(w=>{ if(W.has(w) && why[w]) notes.push({wiring:w, text:why[w]}); });
  return {id:c.id, from:c.from, to:c.to, why:why.g, forWiring:notes};
}

function finish(main, list, log, an, W, opts){
  const changes = log.map(c=>explainChange(c, W));
  const ask = an.asks[0] || null;
  const variants = [];
  const unchanged = !log.length;
  const base0 = main;
  const listMain = !!list && (W.has("adhd")||W.has("apd")||W.has("dyslexic")||W.has("dld")||an.segs.length>=3);
  const base = listMain ? list : main;
  const isMinimal = log.some(c=>c.id==="minimal");
  variants.push({id:"main", label: unchanged ? "Your words" : "Clearest version",
    why: unchanged ? "Nothing in the structure needed changing. The notes above still apply." : "Keeps your ask. Changes the structure around it (see the list of changes).", text:base});
  if(isMinimal) return {main:base, primary:variants[0], variants, changes, ask, list, unchanged};

  const firstAsk = (base0.match(/(?:^|[.!?\]]\s+)([^.!?\]]*\b(?:could you|would you|can you|can we|could we|would that work)\b[^?]*\?)/i)||["",""])[1].trim();
  const isAsk = !!firstAsk;
  const hasReason = WHY_RE.test(base0) || an.goodIds.includes("reason") || an.goodIds.includes("feeling");
  const criticism = an.staticIds.some(id=>["label","absolute","critic","again","compare","madefeel","past","blameq","cannot","threat","guilt","shouldhave","sarcasm","passive","disclaim","oblig","should"].includes(id));
  const isTask = isAsk && !/\b(?:talk|look at it together|come back to it)\b/i.test(firstAsk);
  const sep = listMain ? "\n" : " ";

  if(isAsk || criticism){
    // "We're okay" is only offered between people close enough for it to be true
    // and useful, never at work or from a manager.
    const close = CLOSE_REL.includes(opts.rel) && !WORK_REL.includes(opts.rel) && opts.channel!=="group";
    const bondy = close && (W.has("anxiety")||W.has("adhd")||W.has("trauma")||W.has("hsp")||opts.bond);
    let opener = criticism ? "I'd like us to sort this out together. " : "";
    if(bondy) opener = "We're okay. "+opener;
    const thanks = /\bthank/i.test(base) ? "" : sep+"Thank you.";
    if(opener || thanks.trim()) variants.push({id:"warm", label:"Warm", why: bondy ? "Reassurance first, then the same ask. For a listener who may hear a hard sentence as rejection, the first words set the frame. Only say \"we're okay\" if it's true." : "A kind frame first, and thanks at the end. The ask is the same.", text: (listMain ? opener+base : tidy(opener+base))+thanks});
  }
  if(isAsk && !listMain){
    // Brief keeps every sentence that carries content (an ask, a time, a fact).
    // It only drops courtesy lines and fill-in notes, so nothing you said is lost.
    const kept = splitSentences(base0).map(x=>x.text).filter(x=>!DROPPABLE.test(x.trim()));
    const brief = tidy(kept.join(" "));
    if(kept.length && brief!==tidy(base0)) variants.push({id:"brief", label:"Brief", why:"The same ask and details, without the extra lines. Easiest to take in when someone is busy, stressed, reading a text, or has a lot on their mind.", text:brief});
  }
  if(isAsk){
    const extra = [];
    if(isTask && !hasReason) extra.push("It matters because [the reason].");
    if(isTask && (an.found.vstd || /\b(?:clean|tidy|fix|help)\b/i.test(firstAsk))) extra.push("Done looks like [what finished means].");
    if(an.staticIds.some(id=>["oblig","should","cannot","blameq","shouldhave","threat"].includes(id))) extra.push("This is a request, not a criticism.");
    if(/\[a time\]|\bby \d|\bat \d|\btonight\b|\btomorrow\b/i.test(base0)) extra.push("If that time doesn't work, tell me what does.");
    if(extra.length) variants.push({id:"explicit", label:"Very explicit", why:"Says what, when, why and what done looks like, out loud. Nothing is left to read between the lines. Helpful for literal listeners, and for anyone under stress.", text:(listMain ? base : tidy(base))+sep+extra.join(" ")});
  }
  if(list && !listMain) variants.push({id:"list", label:"As a list", why:"Several asks, written down, numbered. Easier to hold than one long sentence.", text:list});

  // put the variant that fits the listener first (unless the words already work)
  if(!unchanged){
    const pref = W.has("autistic")||W.has("dld")||W.has("alex") ? "explicit" : (W.has("anxiety")||W.has("trauma")||W.has("hsp")) ? "warm" : (W.has("adhd")||W.has("dyslexic")||W.has("apd")) ? "brief" : "main";
    variants.sort((a,b)=>(b.id===pref)-(a.id===pref));
  }
  return {main: base, primary: variants[0], variants, changes, ask, list, unchanged};
}

/* ============================================================
   EXPORT
   ============================================================ */
Object.keys(ADD).forEach(w=>{ if(NT[w]) Object.assign(NT[w].receive, ADD[w]); });
Object.assign(CHECK, CHECK_ADD);

/* "Not sure" of the listener's wiring: a general reading. For each pattern it
   takes the average weight across several common wirings (at least 1 for
   anything that may add static), and the plainest wording of what may be heard. */
(function buildGeneral(){
  const FROM = ["nt","anxiety","adhd","autistic"];
  const receive = {};
  F.forEach(f=>{
    const es = FROM.map(w=>{ let r=NT[w].receive[f.id]; if(!r) return null; if(Array.isArray(r)) r={w:r[0],h:r[1],y:r[2]}; return r.ch ? null : r; }).filter(Boolean);
    if(f.kind==="good"){ if(es.length) receive[f.id]=[0, es[0].h, es[0].y]; return; }
    if(!es.length){ receive[f.id]=[1, "Something here may land harder than you meant.", f.what]; return; }
    const avg = Math.max(1, Math.round(es.reduce((a,e)=>a+e.w,0)/es.length));
    const pick = es.find(e=>e.w>=1) || es[0];
    receive[f.id] = [avg, pick.h, pick.y];
  });
  NT.general = {name:"Not sure", group:"none", short:"most listeners",
    sum:"When you're not sure how someone is wired, this reads the words the way many different listeners might.",
    receive, ch:{},
    tips:["Put the main point, the ask and the time in the first line.","Say the reason in a few words. It turns an instruction into shared information.","If it matters, check what they heard."],
    meant:{}, meantDefault:"Only the speaker knows what they meant. Ask before you decide.", src:[]};
})();
const api = {F, FBY, NT, CHECK, CHANGE_WHY, analyze, detect, readings, rewrite, score, entry, splitSentences, commandOf, baseVerb, norm, chBase, shoutSpans, WRITTEN, ACRONYMS};
if(typeof module!=="undefined" && module.exports) module.exports = api; else root.SignalEngine = api;
})(typeof window!=="undefined" ? window : this);
