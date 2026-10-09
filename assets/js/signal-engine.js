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
// The shared pattern list (message-patterns.js): the Carrier Wave Decoder's tone check and the
// Conversation Reader read words with the same list, so the same words get the same reading.
const SHARED = (typeof module!=="undefined" && module.exports) ? require("./message-patterns.js") : (root && root.TOLPatterns);

/* ============================================================
   WORD LISTS
   ============================================================ */
const LABEL_WORDS="lazy|selfish|inconsiderate|careless|useless|ridiculous|pathetic|stupid|irresponsible|childish|crazy|dramatic|immature|clueless|rude|incompetent|hopeless|unreliable|controlling|needy|petty|disrespectful|dumb|an idiot|idiot|worthless|annoying|impossible|exhausting|a mess|a slob|a nightmare|the worst|insane|a baby|a child|so difficult|difficult|mean|cold|heartless|ungrateful|spoiled|entitled|toxic|a disappointment|disappointing|weak|pathetic|a liar|a joke|clumsy|slow|messy|dirty|gross|sloppy|forgetful|oblivious|dense|thick|too much|too sensitive|too emotional|so sensitive|so emotional";
const IDIOMS=["ball's in your court","play it by ear","break a leg","piece of cake","under the weather","beat(?:ing)? around the bush","on the same page","hit the hay","cut (?:me |you )?some slack","get your act together","pull your (?:own )?weight","walk(?:ing)? on eggshells","(?:the )?last straw","elephant in the room","cross that bridge","bite the bullet","spill the beans","hold your horses","in hot water","on thin ice","drop(?:ped)? the ball","at the end of the day","when pigs fly","blow(?:ing)? off steam","rain ?check","touch base","get off my back","cool it","jump(?:ed|ing)? the gun","go the extra mile","keep an eye on","give me a hand","hang in there","hit the roof","the whole nine yards","not rocket science","a lot on my plate","keep me in the loop","out of the loop","heads up","sleep on it","hit a wall","on the fence","up in the air","cold feet","cost an arm and a leg","kill two birds","get it together","pull yourself together","get a grip","knock it off","cut it out","over the moon","see eye to eye","water under the bridge","throw(?:n)? under the bus","read the room","get the ball rolling","on the back burner","call it a day","the bottom line","take it easy","break the ice","sit tight","hang on a sec","bent out of shape","push(?:ing)? my buttons","on edge","between a rock and a hard place","nothing left in the tank","running on empty","at the end of my rope","at my wit's end","(?:it's|this is) killing me","over my head","out of my depth","a lot on my plate","at the end of my tether","fried","wiped out","hanging by a thread","(?:the )?straw that broke","my brain is (?:mush|fried|full)"];
/* the plain words for a figure of speech or an exaggeration, for listeners who take words literally.
   [pattern, plain words]. Used by the rewrite and the "said literally" check. */
const PLAIN_WORDS = [
  [/\b(?:i have |i've got |there's |i've )?nothing left in the tank\b/i, "I have no energy left"],
  [/\brunning on empty\b/i, "very tired"],
  [/\bat (?:the end of my rope|my wit's end|the end of my tether)\b/i, "out of patience"],
  [/\bi (?:can't|cannot) even(?= [a-z])/i, "I can't"],
  [/\bi (?:can't|cannot) even\b/i, "I'm overwhelmed"],
  [/\b(?:it's|this is) killing me\b/i, "this is really hard for me"],
  [/\bliterally dying\b/i, "really struggling"],
  [/\ba million times\b/i, "many times"],
  [/\btakes forever\b/i, "takes a long time"],
  [/\ba lot on my plate\b/i, "a lot to do"],
  [/\bdrop(?:ped)? the ball\b/i, "missed it"],
  [/\bhit a wall\b/i, "got stuck"],
  [/\bon the same page\b/i, "agreed on the plan"],
  [/\bsleep on it\b/i, "think about it overnight"],
  [/\btouch base\b/i, "check in"],
  [/\bkeep me in the loop\b/i, "keep me updated"],
  [/\bout of the loop\b/i, "not updated"],
  [/\bplay it by ear\b/i, "decide later"],
  [/\bball's in your court\b/i, "it's your decision now"],
  [/\bunder the weather\b/i, "sick"],
  [/\bpiece of cake\b/i, "easy"],
  [/\bcut me some slack\b/i, "be patient with me"],
  [/\bpull your (?:own )?weight\b/i, "do your share"],
  [/\bwalk(?:ing)? on eggshells\b/i, "being very careful not to upset you"],
  [/\b(?:the )?last straw\b/i, "too much for me"],
  [/\bblow(?:ing)? off steam\b/i, "letting off stress"],
  [/\brain ?check\b/i, "another time"],
  [/\bcall it a day\b/i, "stop for today"],
  [/\bon edge\b/i, "tense"],
  [/\bbent out of shape\b/i, "upset"],
  [/\bpush(?:ing)? my buttons\b/i, "upsetting me"],
  [/\bup in the air\b/i, "not decided yet"],
  [/\bon the back burner\b/i, "for later"],
  [/\bover my head\b/i, "too hard for me to follow"],
  [/\bwiped out\b/i, "exhausted"],
  [/\bhanging by a thread\b/i, "barely coping"],
  [/\bmy brain is (?:mush|fried|full)\b/i, "I'm too tired to think clearly"],
  [/\bbreak a leg\b/i, "good luck"],
  [/\bread the room\b/i, "notice how people are feeling"],
  [/\bnot rocket science\b/i, "not very hard"],
  [/\bhit the (?:hay|sack)\b/i, "go to bed"],
  [/\bhold your horses\b/i, "wait a moment"],
  [/\bon thin ice\b/i, "close to serious trouble"],
  [/\bin hot water\b/i, "in trouble"],
  [/\bwhen pigs fly\b/i, "never"],
  [/\bget off my back\b/i, "stop pressuring me"],
  [/\b(?:cut it out|knock it off)\b/i, "please stop"],
  [/\bover the moon\b/i, "really happy"],
  [/\bsee eye to eye\b/i, "agree"],
  [/\bhang in there\b/i, "keep going"],
  [/\bgive me a hand\b/i, "help me"],
  [/\bspill the beans\b/i, "tell"],
  [/\bbite the bullet\b/i, "do the hard part now"],
  [/\bjump(?:ed)? the gun\b/i, "acted too soon"],
  [/\bcold feet\b/i, "second thoughts"],
  [/\belephant in the room\b/i, "big thing we're not talking about"],
  [/\bbeat(?:ing)? around the bush\b/i, "avoiding saying it directly"]
];
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
const NOT_CMD = /^(?:do what(?:ever)? you (?:want|like|think)\b|go ahead\b|go for it\b|let's|let us|thank|thanks|take care|have (?:a|an|fun|a good|a great|a nice)|feel free|enjoy|sleep well|get well|drive safe|see you|love you|miss you|hope|welcome|congrats|good|sorry|excuse|pardon|bless|trust me|imagine|guess what|say hi|come on in|keep up the good|keep it up|don't worry|don't mind|no worries|mind you|look forward|go team|go you|be well|be safe|be kind to yourself|take your time|call me when|text me when|talk soon|talk later)/i;

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
const WHEN_RE = /\[a time\]|\[a day\]|\[by when\]|\b(?:on (?:your|my|the|our) way (?:home|back|in|over|out)|when (?:you|we) get (?:home|here|back|in)|before (?:you|we) (?:leave|go|head out)|first thing)\b|\b(?:by|before|after|at|on|until|around|from)\s+(?:\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?|o'clock)?|noon|midnight|tonight|tomorrow|today|(?:mon|tues|wednes|thurs|fri|satur|sun)day|the weekend|the end of (?:the )?(?:day|week|month)|end of (?:the )?(?:day|week|month)|dinner|lunch|breakfast|work|school|bedtime|pickup|pick-up|the meeting|the game|this (?:morning|afternoon|evening|week|weekend)|next (?:week|month|\w+day))\b|\b(?:tonight|today|tomorrow|this (?:morning|afternoon|evening|week|weekend)|(?:on )?(?:mon|tues|wednes|thurs|fri|satur|sun)day|next week|in (?:\d+|an?|ten|five|fifteen|twenty|thirty|a few|two|three) (?:minutes?|mins?|hours?|days?)|right after \w+|after (?:dinner|lunch|breakfast|work|school)|after (?:the )?(?:kids|baby|children|they|we) (?:are|is|go|get|goes) (?:\w+ ){0,2}(?:bed|asleep|down|home|out)|before (?:bed|dinner|work|school|you leave|we leave)|this time|every (?:mon|tues|wednes|thurs|fri|satur|sun)day|(?:for |in )?(?:an?|one|two|three|\d+|a few|ten|twenty|thirty|fifteen) (?:hours?|minutes?|mins?)|(?:an?|one|\d+) hour)\b|\b\d{1,2}(?::\d{2})?\s*(?:a\.?m\.?|p\.?m\.?)\b|\b(?:eod|eow|eom|eoy|cob|close of business|end of (?:the )?(?:day|week|month|year)|first thing (?:tomorrow|in the morning|monday)|(?:by|before|in|for) q[1-4])\b/i;
/* a real time in the words, not a blank: "by Friday", "6pm", "tomorrow" */
const WHEN_REAL = new RegExp(WHEN_RE.source.replace("\\[a time\\]|\\[a day\\]|\\[by when\\]|",""), "i");
/* Court, custody and the children as leverage: very likely to escalate between co-parents */
const LEGAL_RE = /\b(?:(?:i'll|i will|i'm going to|i am going to|i'm gonna|gonna) (?:take you to court|see you in court|take (?:this|it|you) to (?:court|a judge)|go to court|call (?:my|a) (?:lawyer|attorney|solicitor)|get (?:a|my) (?:lawyer|attorney|solicitor)|talk to (?:my|a) (?:lawyer|attorney|solicitor)|(?:go for|fight for|file for|apply for|sue for|get) (?:full |sole |primary )?custody|take (?:the kids|the children|them|the baby|my kids|our kids) (?:away|from you)|make sure you never see (?:them|the kids|the children|the baby|your (?:kids|children|son|daughter)))|see you in court|take you to court|(?:my|our) (?:lawyer|attorney|solicitor) (?:will|'ll|is going to|says|said|is (?:drawing|filing|sending))\b|(?:talk to|hear from|call|calling) (?:my|our) (?:lawyer|attorney|solicitor)|you(?:'ll| will) (?:never|not) (?:see|get) (?:them|the kids|the children|the baby|your (?:kids|children|son|daughter)|custody)(?: again)?|you(?:'ll| will) lose (?:the kids|the children|custody|them)|(?:i'm|i am) (?:getting|calling) (?:a|my) (?:lawyer|attorney|solicitor)|(?:full|sole) custody)\b/i;
const KIDS_RE = /\bi (?:already |just |have |'ve )?(?:told|explained to) (?:the kids|the children|our (?:kids|children|son|daughter)|the boys|the girls|them)\b,?\s*(?:that\s+)?(?:you(?:'re| are)? (?:not|never)\b|you (?:aren't|won't|will not|don't|didn't|can't|left|lied|cheated|forgot|chose|never)\b|you'll never\b|you don't care\b|what you did\b|why you\b|about (?:you|us|the divorce|the separation|what you)\b)[^.!?]*|\b(?:i'm going to|i'll|i will|i'm gonna) tell (?:the kids|the children|our (?:kids|children|son|daughter)|them) (?:what you did|why you|about you|that you (?:aren't|won't|don't|didn't|never|left|lied|cheated))\b[^.!?]*/i;
/* A safety worry: something left on, open, unlocked or within reach */
const SAFE_THING = "stove|oven|hob|burners?|gas|iron|curling iron|(?:hair )?straighteners?|candles?|space heater|heater|fireplace|grill|bbq|(?:front |back |side |garage |patio |kitchen )?door|(?:pool |baby |stair |back |front )?gate|garage|car seat|booster seat|seat ?belt|medicines?|medications?|meds|pills|bleach|knives|knife|lighter|matches|bath|tap|water|car";
const SAFE_RE = new RegExp("\\b(?:(?:left|leave|leaving|forgot to (?:turn off|lock|close|shut|blow out|unplug|buckle|put away))\\s+(?:the |your |my |our |her |his )?("+SAFE_THING+")\\b(?: \\w+)?\\s+(?:on|open|unlocked|running|lit|burning|plugged in|unbuckled|out|within reach|where (?:the kids|the baby|she|he|they) (?:can|could) (?:reach|get)|on the (?:counter|table))\\b|(?:the |your |my |our )("+SAFE_THING+") (?:was|were|is|are|got|has been|had been) (?:left )?(?:on|open|unlocked|running|lit|burning|plugged in|unbuckled|not buckled|within reach)\\b|(?:didn't|did not|forgot to) (?:buckle|strap) (?:her|him|them|the baby|the kids) (?:in|into)(?: (?:the|her|his|their) (car seat|booster seat|seat))?|(?:didn't|did not|forgot to) (lock|turn off|blow out|unplug) (?:the |your )?("+SAFE_THING+"))", "i");
const SAFE_HABIT_RE = /\b(?:every time|each time|every night|every morning|before (?:bed|you leave|we leave|leaving)|going forward|from now on|next time|a (?:note|reminder|checklist|timer|sign)|could we (?:find|set|put|make)|can we (?:find|set|put|make))\b/i;
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
   re:/\b(?:why (?:didn't|don't|can't|won't|wouldn't|haven't|aren't|isn't|do you always|do you keep|would you|did you|are you (?:being|so|always)|on earth)|what's wrong with you|what is wrong with you|what's your problem|why are you (?:like this|like that|the way you are|always like this)|what is your problem|how (?:hard|difficult) (?:is|can) it|how many times|what were you thinking|what did you expect|who does that|how could you|do i have to do everything|is it (?:really )?(?:too much|so hard) to ask|do you (?:even|ever) (?:care|listen|think|try|notice|help|clean|want)|did you (?:even )?(?:think|try|listen|bother)|are you (?:serious|kidding(?: me)?|even listening|even trying)|why (?:is|are|was|were) (?:this|that|it|these|those|the [\w-]+|my [\w-]+|our [\w-]+|your [\w-]+) (?:still )?not|why (?:isn't|aren't|hasn't|haven't) (?:this|that|it|these|those|the [\w-]+|my [\w-]+|our [\w-]+|your [\w-]+))\b|\b(?:seriously|really)\?/gi,
   what:"A \"why didn't you\" question usually isn't asking for a reason. It carries a complaint, and the listener has to pick between answering the question and answering the complaint.",
   fix:"Say the request underneath the question: \"Next time, could you…?\""},
  /* ---------- blame and verdicts ---------- */
  {id:"label", name:"Label on the person", kind:"static",
   re:new RegExp("\\byou(?:'re| are| were|'ve been| have been| can be| sound like| sound) (?:so |such an? |being |acting |really |just |always |too |totally |completely |kind of |a bit |a little )*(?:"+LABEL_WORDS+")\\b|\\bhow (?:"+LABEL_WORDS+")\\b|\\b(?:that was|that's|this is|that is|it's|it is|it was) (?:so |such an? |really |just |totally )?(?:"+LABEL_WORDS+") (?:of you|thing to do)\\b|\\byou (?:idiot|moron|slob|baby|child)\\b","gi"),
   what:"A word about who the person is (\"lazy,\" \"selfish\") turns one event into a verdict on their character. A verdict can't be fixed, so people defend against it instead of hearing the event.",
   fix:"Name what happened and how it affected you, not what kind of person they are."},
  {id:"swear", name:"Swearing", kind:"static", re:null,
   what:"Swearing, even the starred-out kind, turns up the volume. The listener hears the anger first, and often stops listening for the point.",
   fix:"Leave the swear words out and name the feeling instead: \"I'm really frustrated right now.\""},
  {id:"hostile", name:"Hostile or fed-up line", kind:"static", re:null,
   what:"A fed-up line (\"you're getting on my last nerve,\" \"shut up,\" \"I'm done with you\") says how angry you are, but not what you need. The listener can only defend themselves or pull away.",
   fix:"Say the feeling and the need, and take a break if you need one: \"I'm really frustrated. I need a few minutes, then can we talk about [the thing]?\""},
  {id:"absolute", name:"Big words like always or never", kind:"static",
   re:/\b(?:always|never|every (?:single )?time|every (?:single )?day|constantly|all the time|nothing ever|no one ever|nobody ever|nobody (?:else )?(?:cares|helps|listens|does|thinks|ever)|no one (?:else )?(?:cares|helps|listens|does|thinks)|everyone (?:else )?(?:knows|can|does|thinks|manages|sees)|everybody (?:else )?(?:knows|can|does|thinks|manages|sees)|all you (?:ever )?do|(?:you|you two|you both|you all|you guys|you lot|the two of you|both of you|all of you|y'all|they|he|she) (?:just )?(?:do|does|did) (?:absolutely )?(?:nothing|zero|sod all|jack(?: all)?)|(?:it's|it is) always me|always me\b|nothing (?:i do|you do|gets done|changes|works)|forever)\b/gi,
   what:"\"Always,\" \"never\" and \"everyone\" erase every exception. The listener remembers the time it didn't happen and argues that, and the real point gets lost.",
   fix:"Swap the absolute for one specific, recent example."},
  {id:"madefeel", name:"Blame for a feeling (\"you made me…\")", kind:"static",
   re:/\byou (?:made|make|are making|'re making|have made|'ve made|keep making) me (?:feel (?!(?:so )?(?:loved|happy|special|safe|welcome|seen|heard|proud|better|good|great|calm|at home|cared))\w+|so (?:angry|mad|sad|upset|anxious|stressed|frustrated|furious)|(?:angry|mad|sad|upset|anxious|nervous|crazy|insane|cry|furious|miserable|late|miss \w+|lose \w+|wait|worry|look (?:stupid|bad|foolish|like \w+)|do this|say that|yell|snap))\b|(?<!\b(?:not|isn't|wasn't|never|and not|but not) )\bbecause of you,? (?:i|we)\b|\b(?:it's|this is|that's|it is) (?:all )?your fault\b|\byou (?:ruined|wrecked|spoiled) (?:it|everything|my|our|the)\b/gi,
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
  {id:"count", name:"Keeping count (\"third time\")", kind:"static",
   re:/\b(?:(?:this|that|it)(?:'s| is| was) (?:now |already |officially )?the|for the) (?:second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|umpteenth|hundredth|millionth|nth|\d+(?:st|nd|rd|th)) time\b|\b(?:\d+|two|three|four|five|six|several|so many|too many) times (?:now|already|this (?:week|month|sprint|quarter|year)|in a row)\b/gi,
   what:"Counting the misses (\"third time,\" \"three times now\") reads as a record being kept on someone. People hear blame, and stop reading for the fix.",
   fix:"Name the days it happened and what it affected, then ask for one change. If it keeps happening with one person, talk to them on their own."},
  {id:"excuse", name:"Shifts the job onto them", kind:"static",
   re:/\byou know (?:how i am|how i get|what i'm like|what i am like|me)(?=\s*[.!,…]|\s*$)|\b(?:that's|that is|it's|it is) (?:just )?(?:how|who|the way) i am\b|\bi (?:can't|cannot|can not) help it\b|\b(?:that's|that is) just me\b|\bi(?:'m| am) just like that\b|\bi(?:'m| am) (?:just )?wired (?:that way|like that)\b/gi,
   what:"\"You know how I am\" or \"I can't help it\" asks the other person to make room for the miss, so the work of fixing it lands on them. Even when it's honest, it can sound like nothing will change.",
   fix:"Say what you did, that it's on you, and one thing you'll do: \"Sorry I forgot [the thing]. That's on me. I've set a reminder so it doesn't happen next time.\""},
  {id:"threat", name:"Conditional threat (\"if you don't…\")", kind:"static",
   re:/\bif you (?:don't|do not|won't|can't|ever|keep|dare|refuse to)\b(?! mind)[^.!?]{1,80}?,?\s*(?:then )?(?:i'm|i'll|i will|i am|we're|we'll|we will|you'll|you will|i swear)\s+(?:be\s+)?(?:leaving|leave|done|out|gone|going to (?:leave|tell|take|stop|cancel|end|move)|tell (?:your|every)|telling (?:your|every|them|him|her|the)|taking (?:away|your|the)|cancel(?:l)?ing|calling (?:your|the)|take (?:away|your|the)|cancel|stop|never|not (?:going|coming|helping|talking)|throw|sell|ground|regret|lose|be sorry|end|kick|break up|move out|finished|over|through)|\bor else\b|\bdon't make me\b|\byou'll regret\b|\blast chance\b|\bor (?:i'm|i'll be) (?:leaving|done|out|going|gone)\b|\bor we're (?:done|over|finished|through)\b|\bthis is your (?:final|last) (?:warning|chance)\b/gi,
   what:"An \"if you don't… then I'll…\" sentence is an ultimatum. The listener stops thinking about the task and starts thinking about the threat: fight, freeze or give in.",
   fix:"Make the ask on its own. If there is a real limit, say it once, calmly, at a calm time, as your own plan, not as leverage."},
  {id:"menace", name:"A threat (\"you'll regret it\")", kind:"static", re:null,
   what:"\"You'll regret it,\" \"or else\" or \"if you tell anyone…\" is a threat. It would frighten or control the other person. That isn't a tone problem a softer wording can fix.",
   fix:"Leave the threat out completely. Say what you feel and what you need, or take a break until you're calm."},
  {id:"jab", name:"Blame or a dig", kind:"static", re:null,
   what:"Keeping score (\"I managed fine without you\"), a dig (\"when it suits you\", \"must be nice\") or a label (\"you treat me like the help\") says the hurt as blame. The listener defends themselves instead of hearing what you need.",
   fix:"Say the hurt and the real ask: \"I've been feeling left out. Could we find ten minutes this week?\""},
  {id:"motive", name:"Guessing their motive (\"on purpose\")", kind:"static",
   re:/\b(?:on purpose|deliberately|intentionally|just to (?:annoy|spite|hurt|upset|punish|wind up|get at) (?:me|us)|to spite me|to get back at me|to punish me)\b/gi,
   what:"\"On purpose\" says you know why they did it. They can only argue about their motive, and the thing you need gets lost.",
   fix:"Leave the motive out. Say what happened and what you'd like: \"Plans have landed on my weekends a few times. Can we check the calendar first?\""},
  {id:"blunt", name:"Blunt opener (\"That is incorrect\")", kind:"static", re:null,
   what:"\"That is incorrect\" is clear, and many listeners still hear it as cold, or as a mark against them. The fact is fine; the opener carries the edge.",
   fix:"Keep the fact and soften the opener: \"Quick correction: the deadline is Friday, not Thursday.\""},
  {id:"closer", name:"Closes the topic", kind:"static", re:null,
   what:"\"We'll decide ourselves\" is fair, and it can still sound like a door closing on someone who cares.",
   fix:"Lead with warmth, then say the same thing: \"I know how much this means to you. We'll decide together and tell you as soon as we do.\""},
  {id:"guilt", name:"Guilt framing", kind:"static",
   re:/\bafter (?:all|everything) (?:i(?:'ve)? (?:do|did|done|have done)|i've done|that i do|i've given)(?: for you)?|\bi do everything\b|\bthe least you (?:could|can) do\b|\byou owe me\b|\bi gave up [^.!?]{0,30}for you\b|\bi(?:'ve| have) sacrificed\b|\bdo you (?:know|have any idea) how (?:hard|much|long) i\b|\bi guess i (?:just )?don't matter\b|\bi work (?:all day|so hard)\b[^.!?]{0,40}?\b(?:and|but) you\b|\bdon't worry about me\b|\bi'll just (?:sit|wait) here(?=(?:,? then)?\s*[.!…🙄😒🙃]*\s*$)|\bi'll just do everything\b|\bafter all i've done\b|\bi guess i'll just (?:be|stay|sit)\b/gi,
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
   re:/\b(?:just(?= (?:do|go|get|put|ask|tell|say|stop|clean|pick|take|call|be|try|make|use|let|leave|finish|fix|wash|text|send|listen|give|bring|move|pay|answer|grow|relax|calm|deal|remember|read|check|look|throw|hang|reply|help|sit|turn|shut|close|open|wait)\b)|(?<=\b(?:you|it's|that's|it is|that is|you're|you are) )just|simply|obviously|clearly|all you have to do|(?:it's|that's|it is) (?:so |really |not )?(?:easy|simple|hard)(?= to|[,.!]|$)|only takes a (?:second|minute|sec))/gi,
   what:"\"Just,\" \"simply\" and \"obviously\" say the thing should be easy. When it isn't easy for this listener, the word adds shame, and it hides steps that may need saying.",
   fix:"Drop \"just,\" \"obviously\" and \"easy.\" What's easy for one wiring can be real work for another."},
  {id:"intens", name:"Intensifier (\"literally,\" \"seriously\")", kind:"static",
   re:/\b(?:literally|seriously(?![?!]*$))\b/gi,
   what:"\"Literally\" and \"seriously\" turn up the volume. Most listeners hear frustration; a literal listener may take the words at face value and check whether they're exactly true.",
   fix:"Drop the intensifier and say the plain size of it: \"I got home ten minutes ago.\""},
  {id:"urgent", name:"Time pressure without a reason", kind:"static",
   re:/\b(?:right now|immediately|this instant|this second|this minute|asap|a\.s\.a\.p|hurry(?: up)?|urgent(?:ly)?|drop everything)\b|\bnow!+/gi,
   what:"\"Now,\" \"right now\" and \"ASAP\" with no reason can read as an emergency, or as a power move. The listener reacts to the pressure before the task.",
   fix:"Give a real time and the reason: \"by 5, because the office closes then.\""},
  {id:"vtime", name:"Vague timing", kind:"static",
   re:/\b(?:when you get a (?:chance|sec|second|minute|moment)|when you have (?:a (?:sec|second|minute|moment|chance)|time)|when you're free|when you can|whenever|at some point|sometime(?! (?:this|next|today|tonight|tomorrow|on|before|after|between)\b)|eventually|(?<!see you |talk to you |talk |catch you )later(?! (?:on )?(?:today|tonight|this))|soon|in a bit|in a minute|one of these days|shortly)\b/gi,
   what:"\"Later\" and \"when you get a chance\" are kind, but they leave the time open. One person hears \"tonight,\" the other hears \"this month.\"",
   fix:"Replace vague timing with a real time or cue: \"by 6\" or \"right after dinner.\""},
  {id:"vstd", name:"Undefined standard", kind:"static",
   re:/\b(?:clean(?:ed)? up|tidy(?: up)?|(?<=\b(?:clean|tidy|help|work|try|do|pick|straighten|sort|fix|up|out) )a bit|a little more|properly|the right way|like a normal person|like an adult|help (?:out|more)|do better|be (?:more )?(?:supportive|responsible|considerate|present|helpful|thoughtful|involved|mature|normal)|step up|pitch in|make an effort|try harder|fix (?:it|this)|sort it out|deal with (?:it|this))\b/gi,
   what:"\"Clean up,\" \"help more\" and \"do better\" don't say what finished looks like. The listener can do what they think you meant and still get it wrong.",
   fix:"Define the finish line: exactly what, how much, and what \"done\" looks like."},
  /* ---------- openers and hints ---------- */
  {id:"ominous", name:"Opener with no topic", kind:"static",
   re:/\b(?:we (?:need|have) to (?:have a )?(?:talk|chat|conversation)(?! about)|we need to have a (?:talk|conversation|chat)(?! about)|can we talk(?! about| at | tonight| tomorrow| later| after| when| in | this | on )|can i talk to you(?! about)|i need to talk to you(?! about)|i need to speak (?:to|with) you(?! about)|call me(?= *(?:[.!]|$| now| asap))|don't be mad|don't freak out|i have something to tell you|we (?:have|need to discuss) a problem|come here(?:,? now)?|see me|you're in trouble|i need to tell you something|have you got a (?:minute|sec)|got a minute|we should talk(?! about)|can (?:we|i) (?:hop|jump|get) on (?:a )?(?:quick |short )?(?:call|zoom|teams call|video call|meeting)(?! about)|(?:can|could) you (?:come|stop by|pop|swing by|drop by) (?:to |into |by |over to )?my (?:office|desk)(?! about)|can i (?:grab|borrow|steal) you(?: for a (?:minute|sec|second|moment))?|do you have (?:a )?(?:minute|sec|second|moment)(?= *\?| *$))\b/gi,
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
  {id:"idiom", name:"Figure of speech", kind:"static", re:new RegExp("\\b(?:"+IDIOMS.concat(SHARED && SHARED.IDIOMS ? SHARED.IDIOMS.filter(x=>!/kill|murder|strangle/.test(x[0])).map(x=>x[0]) : []).join("|")+")\\b","gi"),
   what:"A figure of speech says one thing and means another. Most listeners translate it without effort, but some take it literally, especially under stress.",
   fix:"Swap the figure of speech for what you mean in plain words (the plain meaning is shown above)."},
  {id:"contempt", name:"Eye-roll or put-down", kind:"static", re:null,
   what:"An eye-roll, mocking or a put-down says \"I look down on you,\" which hurts more than a complaint and is very hard to answer calmly.",
   fix:"Drop the jab and say the complaint underneath it, about the thing, not the person."},
  {id:"passiveag", name:"Passive-aggressive edge", kind:"static", re:null,
   what:"A complaint wrapped in politeness (\"some of us,\" \"I guess I'll do it again\") says two things at once. The listener hears the edge and has no clear ask to answer.",
   fix:"Make the ask directly: \"Could you do the dishes tonight? I've done them all week.\""},
  {id:"stonewall", name:"Shutting the door", kind:"static", re:null,
   what:"\"Not now,\" \"forget it\" or a silent \"...\" can mean someone is flooded. Without a time to come back, the listener hears \"this is over\" or \"you don't matter.\"",
   fix:"Keep the pause, and add when you'll come back: \"I can't do this right now. Can we talk at 8?\""},
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
  {id:"feelingq", name:"Open feelings question", kind:"static", re:/\b(?:how (?:does|did) (?:that|it|this) make you feel|how do you feel(?: about)?|what are you feeling|tell me how you feel|why are you (?:upset|sad|angry|mad|quiet)|what's wrong\?)/gi,
   what:"An open \"how do you feel?\" can feel like a test with no right answer, especially for someone who finds feelings hard to name.",
   fix:"Offer options (\"More tired, or more annoyed?\") or ask about the body and what would help."},
  {id:"hyper", name:"Exaggeration", kind:"static", re:/\b(?:literally dying|i'm dying|kill (?:you|me|him|her)|going to die|a million times|takes forever|the worst(?: ever)?|i could (?:kill|murder)|dead to me|i'm done|i (?:can't|cannot) even|losing my mind)\b/gi,
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
  {id:"already", name:"\"I already told you\"", kind:"static", re:/\b(?:i (?:already )?(?:told|said|asked|explained)(?: you)?(?: this| that)? (?:already|before|twice)|i already (?:told|asked) you\b|i already (?:said|explained)(?: (?:this|that|it))?(?=\s*(?:[.,!?;:]|$))|as i (?:said|mentioned|wrote|told you)|like i said|did you (?:even )?read|it's in the (?:email|text|message))\b/gi,
   what:"\"I already told you\" frames a missed message as a character flaw rather than a channel problem.",
   fix:"Assume it didn't arrive intact and resend it in a better channel."},
  {id:"hedge", name:"Hedged answer", kind:"static", re:/\b(?:i think|probably|pretty sure|should be|might have|not sure|i guess|i believe|possibly)\b/gi,
   what:"A hedge keeps the question open. For some listeners that is fine. For others, an open question keeps looping.",
   fix:"If you know, say it plainly. If you don't, say what you'll do to find out."},
  {id:"softno", name:"Soft no", kind:"static", re:/\b(?:we'll see(?! (?:you|them|him|her|the|it|each|y'all|everyone)\b)|maybe|i'll think about it|perhaps|we can talk about it)\b/gi,
   what:"\"We'll see\" can mean no, or a real maybe. The listener picks one, and may pick wrong.",
   fix:"If it's a no, say no kindly. If it's a real maybe, say when you'll decide."},
  {id:"stopask", name:"\"Stop asking\"", kind:"static", re:/\b(?:stop asking(?: me)?|you already asked(?: me)?|i already answered|not this again)\b/gi,
   what:"It ends the question without settling it, so the worry behind it stays.",
   fix:"Use a kind, agreed-on script for repeat questions instead of shutting them down."},
  {id:"tic", name:"Commenting on a movement or sound", kind:"static", re:/\b(?:stop (?:doing|making) that|quit (?:it|doing that)|can't you (?:just )?stop|stop (?:twitching|blinking|sniffing|clearing your throat|making (?:that |those )?noises?|fidgeting|rocking|tapping|humming|flapping|stimming)|do you have to do that|what are you doing with your (?:hands|face))\b/gi,
   what:"A movement or sound may be a tic or a stim, not a message. Commenting on it can add shame and make it more likely.",
   fix:"Leave the movement or sound alone. A tic or stim isn't a message."},
  {id:"nowhen", name:"Ask with no when", kind:"static", re:null,
   what:"The ask is there, but not the time. \"Could you call the dentist?\" can mean today or next month.",
   fix:"Add a time or a cue: \"before Friday\" or \"after dinner.\""},
  {id:"brushoff", name:"Brush-off, or quiet hurt (\"whatever,\" \"I don't care\")", kind:"static", re:null,
   what:"\"Whatever,\" \"fine, whatever\" and \"I don't care\" can mean \"really, either is fine\" or \"I'm upset and done talking.\" It can also be resigned hurt: someone who has stopped asking for what they want. In writing, most people hear dismissal. The useful move is to ask which one it is, not to decide.",
   fix:"Say which one you mean: \"Either is fine with me\" or \"I'm upset. Can we talk about it at 8?\""},
  {id:"dxlabel", name:"A diagnosis used as an insult", kind:"static", re:null,
   what:"Using a diagnosis (\"so autistic,\" \"so OCD\") as a put-down turns a real part of some people's lives into an insult. It hurts the listener, and anyone who shares that diagnosis.",
   fix:"Leave the label out. Say the specific thing that bothered you: \"You've been talking about trains for a while, and I'd like a turn.\""},
  {id:"violent", name:"Violent figure of speech (\"I'll kill you\")", kind:"static", re:null,
   what:"\"I'll kill you if…\" is almost always an exaggeration, but in writing there's no smile or tone to show that. Some listeners take it literally, and it can read as a real threat.",
   fix:"Say the true size of it: \"I'll be really upset if you're late. It matters to me.\""},
  {id:"selfput", name:"Putting yourself down", kind:"static",
   re:/\bi(?:'m| am) (?:so |such an? |a |an |really |just |the |an absolute |a total |a complete |literally )*(?:stupid|an idiot|idiot|dumb|useless|hopeless|pathetic|worthless|a failure|failure|the worst|a terrible person|an awful person|a bad person|a mess|garbage|trash)\b/gi,
   what:"Calling yourself stupid or useless can pull the listener into reassuring you, and the apology or the point gets lost. It's also hard on you.",
   fix:"Say what happened and what you'll do: \"I forgot. I'm sorry. I'll set a reminder.\""},
  {id:"legal", name:"Court or custody as a threat", kind:"static", re:null,
   what:"\"I'll take you to court,\" \"my lawyer will be in touch\" or \"you'll never see them\" turns a disagreement into a fight about the children. It is very likely to escalate, and messages like this are often saved and shown later.",
   fix:"Leave the threat out. Say what worries you and what you'd like. If there is a real legal step, take it through the proper channel, not in a message."},
  {id:"kidsfirst", name:"The children told first", kind:"static", re:null,
   what:"Telling the children something about the other parent before the adults have talked (\"I already told the kids you're not coming\") puts them in the middle. It is very likely to escalate, and the children carry it.",
   fix:"Leave the children out of it. Ask to agree together on what the kids hear, then tell them together, or in the same words."},
  {id:"safeask", name:"A safety worry with no plan", kind:"static", re:null,
   what:"The worry is real and worth saying. Without a plan for next time, it can land as blame for what already happened instead of a way to keep everyone safe.",
   fix:"Keep the fact, say it worries you, and ask for a habit, not a deadline: \"Can we find a way to make sure the stove gets checked every time? A note by the door?\""},
  {id:"defend", name:"Defending yourself (\"I said…\")", kind:"static",
   re:/\bi (?:said|told you|explained)(?: that)?,? (?=(?:work|my (?:job|boss|day|week|shift)|it's|it is|it was|i'm|i am|i was|i've been|i have been|i had|i have|i couldn't|i can't|i didn't|i wasn't|i'm not)\b)/gi,
   what:"\"I said work is busy\" answers a charge before it's made. It can land as \"stop complaining,\" and what the other person is missing or feeling goes unheard.",
   fix:"Say what's true for you, and that you hear them: \"Work has been busy, and I miss our calls too. Can we pick a time?\""},
  {id:"overhedge", name:"Too many softeners", kind:"static", re:null,
   what:"A few softeners are kind. A stack of them (\"maybe possibly perhaps, if that's okay\") hides the ask, and the listener can't tell whether you're asking at all.",
   fix:"Keep one softener and say the ask plainly: \"Could you do the dishes tonight, if that works?\""},

  /* ---------- worth keeping ---------- */
  {id:"boundary", name:"A clear, caring boundary", kind:"good", re:null,
   what:"A step you'll take to look after yourself, said calmly and with care. It may still be hard to hear, and that's not a threat."},
  {id:"disclose", name:"Sharing something important about you", kind:"good", re:null,
   what:"Telling someone who you are, or what's true for you, takes courage. It may still be hard for them to hear, and that's not your fault."},
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
  {id:"pause", name:"A pause with a time to come back", kind:"good", re:null,
   what:"Asking for a break and saying when you'll come back lets both people settle without either one feeling dropped.",
   fix:"Keep it."},
  {id:"safety", name:"A real safety concern", kind:"good", re:null,
   what:"A safety worry (the stove, a door, a car seat, medicine) is valid and worth saying plainly. It's about keeping everyone safe, not about who's to blame.",
   fix:"Keep it."},
  // an apology that turns back into blame: "Sorry I was distracted, but you didn't have to say it like that."
  // Found in analyze() (it needs the apology before it), so no pattern here.
  {id:"sorrybut", name:"“But you…” after an apology", kind:"static", re:null,
   what:"A “but you…” after an apology turns it back into blame. The listener tends to remember the blame, not the sorry, and the apology stops counting.",
   fix:"Keep the apology on its own. If their words stung too, say that separately, later: “The way you said it stung a little. Can we talk about that later?”"},
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
   vstd:{w:2,h:"That word means what, exactly? I can't tell what to do.",y:"Feeling-words without actions are hard to translate.",ch:null},
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
  sarcasm:"\"Sounds like something's getting to you. What would help most?\"",
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
  count:[2,"They're keeping score on me.","A count of misses reads as a record being kept, so the listener defends the record instead of fixing the next one."],
  excuse:[2,"So I'm supposed to just live with it.","\"You know how I am\" asks the listener to absorb the miss, so the apology sounds like it comes with no change."],
  swear:[3,"They're furious with me.","Swearing carries the anger ahead of the words, so the point is the last thing heard."],
  hostile:[3,"They can't stand me right now.","A fed-up line says how angry someone is, but not what they need, so the listener can only defend or pull away."],
  intens:[1,"They're exasperated.","\"Literally\" and \"seriously\" carry frustration more than facts."],
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
  count:[2,"Is that number right? And what do they want me to do?","A count may be checked for accuracy, and it still doesn't say what change is wanted."],
  excuse:[1,"What will be different next time?","Without a plan in the words, the apology may not answer the practical question."],
  swear:[2,"They're very angry. What did I do, and what do they want?","The anger is clear. The request, if there is one, isn't."],
  hostile:[3,"My last nerve? Done with me? What do they want me to do?","Fed-up lines and idioms may be read literally, and they don't contain an ask to act on."],
  intens:[1,"Literally? Is that exactly true?","Intensifiers may be taken at face value and checked for accuracy."],
  period:[0,"A full stop. That's just punctuation.","Many autistic readers take punctuation as punctuation, not as mood."],
  critic:[1,"Something went wrong. Which thing, and what should I do now?","Correction lands best with the specific thing and the next step."],
  already:[1,"I missed it. Where is it?","Pointing back to a message doesn't say which part matters."],
  stopask:[2,"Stop asking, but I still don't have an answer.","The question stays open, and open questions keep looping."],
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
  count:[3,"Here's my whole record again.","For many ADHD adults, a count lands on years of similar comments, not on this one miss."],
  excuse:[1,"I get it. But I'm still the one left holding it.","Even a listener who shares the struggle can hear that the fix is now theirs."],
  swear:[3,"I've messed up badly again.","Anger in the words lands on a long history of being told off."],
  hostile:[3,"They're done with me.","A fed-up line can sound like rejection, which many ADHD adults feel very sharply."],
  intens:[1,"They're really annoyed with me.","The intensifier carries the frustration."],
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
  swear:[3,"That hit hard, and I'll feel it all day.","Strong language registers strongly, and for a long time."],
  hostile:[3,"That's overwhelming.","Hostility lands with full force on a sensitive listener."],
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
  count:[2,"They're building a case against me.","A running count sounds like evidence being collected, and gets replayed."],
  excuse:[2,"It'll keep happening, and I'm not allowed to mind.","With no plan in the words, an anxious listener may expect the same miss again and feel they can't raise it."],
  swear:[3,"They're furious. Is this the end of something?","Anger in the words confirms the worst fear."],
  hostile:[3,"They want me gone.","A fed-up line is heard as rejection, and replayed."],
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
  swear:[3,"Anger. I need to be careful.","Swearing can register as danger before it registers as words."],
  hostile:[3,"I'm not safe here.","Hostility can feel like threat, not just unkindness."],
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
  count:"\"Which days was it, and what did it affect? Then we can sort out who owns it.\"",
  excuse:"\"Thanks for saying sorry. What will help it not happen next time?\"",
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
  heat:"\"I can hear you're frustrated. What's the one thing you'd like me to do, and by when?\"",
  swear:"\"I can hear you're really upset. What do you need from me right now?\"",
  hostile:"\"I can hear you're really upset. Do you need a break, or is there one thing I can do?\"",
  intens:"\"How big is this for you, from one to ten?\""
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
/* a sentence that opens like a question: "do you want…", "are we still…", "can u…" */
const AUX_Q = /^(?:(?:do|does|did|don't|doesn't|didn't|can|could|will|would|should|shall|may|might|must|can't|couldn't|won't|wouldn't)\s+(?:you|u|ya|we|i|they|he|she|it)|(?:are|is|was|were|aren't|isn't|wasn't|weren't)\s+(?:you|u|ya|we|i|they|he|she|it|this|that|there|the|your|my|our)|(?:have|has|had)\s+(?:you|u|ya|we|i|they|he|she|it))\b/i;
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
  // A question is not a command ("Take the car?"), even typed without a question mark ("do you want to call tonight or not")
  if(/\?\s*$/.test(t) || AUX_Q.test(t)) return "";
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
  // a short proposal asked as a question: "call sunday?", "dinner Friday at 7?", "coffee tomorrow?"
  if(/\?\s*$/.test(sentence) && words(t)<=6 && !/^(?:why|what|how|who|where|when|which|whose|is|are|am|do|does|did|can|could|will|would|should|shall|have|has|had|was|were|ok(?:ay)?|you|really|seriously|right|huh|sure|so|and|but|or|yeah|yes|no|not|me|us|them|this|that|it)\b/i.test(t)
     && (WHEN_REAL.test(t) || VERBSET.has(t.split(/\s+/)[0].toLowerCase())) && /[a-z]/i.test(t)) return {text:t, kind:"proposal"};
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
  if(has("legal")||has("kidsfirst")) return "Threat or leverage";
  if(has("brushoff")) return "Brush-off, or quiet hurt";
  if(has("guilt")||has("sarcasm")) return "Hurt, said sideways";
  if(has("oblig")) return "Requirement";
  if(has("should")) return "Advice or judgment (\"should\")";
  if(has("shouldhave")) return "Hindsight blame";
  if(has("impera")) return "Command";
  if(has("hint")) return "Hint";
  if(has("clearask")) return "Request";
  if(has("label")||has("compare")||has("madefeel")||has("absolute")||has("critic")||has("again")||has("guilt")||has("passive")||has("sarcasm")) return "Judgment or complaint";
  if(/\?\s*$/.test(sentence) || AUX_Q.test(String(sentence).replace(FILLER,"").replace(/^(?:(?:ok(?:ay)?|so|hey|well|um|and|but)[\s,]+)+/i,""))) return "Question";
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

/* ============================================================
   THREATS, DIGS AND BOUNDARIES
   A threat that would frighten or control the other person is not a tone problem, and no rewrite keeps it.
   Blame said as a dig ("I managed fine without you", "when it suits you", "you treat me like the help") is flagged
   and rewritten to the hurt and the real ask. A calm boundary ("If you can't respect X, I'll leave for today. I love
   you.") and a coming-out are named as caring, never as threats.
   ============================================================ */
const MENACE_RE = /\byou(?:'ll| will| are going to|'re going to|'re gonna) (?:be sorry|regret (?:it|this|that|ever)|pay for (?:this|that|it)|pay\b(?! (?:me|you|us|them|him|her|the|for (?:the|your|my|our|dinner|lunch|it all)|back|half|rent|bills?)\b)|wish you (?:hadn't|had never|never|were dead))|\b(?:i'll|i will|i'm going to|i am going to|i'm gonna|gonna) make (?:you|your life) (?:regret|pay\b|sorry|suffer|a (?:living )?hell|hell|miserable)|\b(?:i'll|i will|i'm going to|i'm gonna) make sure you (?:regret|pay\b|never|don't|can't|lose)|\bor else\b|\bor you'll (?:see|be sorry|regret)|\bwatch your back\b|\byou(?:'d| had) better not (?:tell|leave|go|say|talk|see|call|text|dare)\b|\bdon't you dare (?:tell|leave|go out|say|talk to|see|call|text)\b|\b(?:you're|you are) not (?:going anywhere|allowed to (?:go|leave|see|talk|have|text|call|spend|wear|go out))\b|\bi won't let you (?:leave|go out|see|talk to|have)\b|\bif you (?:ever )?(?:tell|leave|go out|go|see|talk to|text|call|try|walk out)\b[^.!?]{0,60}?,?\s*(?:i(?:'ll| will|'m going to| am going to|'m gonna)) (?:make you|hurt|kill|ruin|destroy|come after|find you|show (?:everyone|your|them)|post|send (?:everyone|your|them)|tell everyone|tell your|take the (?:kids|children)|take (?:the|your) (?:kids|children|phone|car|money|keys)|end you|make your life|throw you out|kick you out|kill myself|hurt myself|end it|leave you with nothing)|\bif you tell (?:anyone|anybody|someone|your)\b[^.!?]{0,50}?,?\s*(?:you(?:'ll| will)|i(?:'ll| will))\b/i;
// a step you take to look after yourself, said with care, is a boundary, not a threat
const BOUNDARY_RE = /\bif you (?:can't|cannot|won't|don't|keep|start|carry on)\b[^.!?]{1,90}?,?\s*(?:then )?(?:i'm going to|i am going to|i'll|i will|i'm gonna|we'll|we will|i need to|i'm)\s+(?:need to |have to |be )?(?:leave|leaving|go|going|head (?:home|out)|step (?:away|out|back)|take (?:a break|some space|space|a step back|a breather)|end (?:the|this) (?:call|visit|conversation|chat)|hang up|go home|stay (?:home|away)|not (?:come|visit|stay)|leave the (?:room|conversation|call))\b[^.!?]*/i;
const BOUNDARY_CARE = /\b(?:for (?:today|tonight|now|the (?:day|night|evening|weekend)|a (?:bit|while|few (?:minutes|hours|days)))|early|this time|and (?:come back|call|try again)|i love you|love you|i'll call|i will call|talk (?:soon|tomorrow|next week)|call (?:you )?(?:next week|tomorrow|soon)|until (?:we|you|things))\b/i;
const DISCLOSE_RE = /\bi(?:'m| am)(?: (?:actually|really|also|finally ready to say i'm))? (?:bi|bisexual|gay|lesbian|queer|trans|transgender|non-?binary|pan|pansexual|asexual|ace|aromantic|a trans (?:man|woman)|intersex)\b|\bi(?:'ve| have) been diagnosed (?:with|as)\b|\bi(?:'m| am) pregnant\b|\b(?:he|she|they)(?:'s| is| are)(?: actually)? my (?:girlfriend|boyfriend|partner|wife|husband|fiancee?)\b|\bi(?:'m| am) (?:in love with|dating|seeing) (?:a (?:man|woman|girl|guy)|her|him|them)\b/i;
// blame said as a dig, or keeping score
const JAB_RES = [
  /\b(?:i|we) (?:managed|coped|got by|survived|did (?:fine|okay|ok|well|great))(?: (?:just|perfectly|totally|absolutely))?(?: (?:fine|okay|ok|well|great))? without you\b/i,
  /\bi (?:did|have done|handled|ran|managed|was doing|carried) (?:it|everything|this|that|all of it|it all|the (?:\w+ ?){1,2})(?: all)? (?:alone|on my own|by myself|single-handedly|solo)\b/i,
  /\bi know how (?:[a-z' ]{1,25}) works\b/i,
  /\byou treat(?:ed|s|ing)? me like (?:the |a |an |your |some |i'm |i am )?[a-z' -]{2,30}/i,
  /\b(?:you're|you are) (?:treating me|acting) like (?:i'm|i am) (?:the |a |an |your )?(?:help|maid|servant|cleaner|nanny|babysitter|slave|child|kid|idiot|employee|staff|secretary|assistant|housekeeper|chauffeur|taxi|bank|atm)\b/i,
  /\b(?:so )?stop (?:policing|nagging|controlling|micromanaging|monitoring|checking up on|lecturing|bossing|telling me (?:what|how)|changing (?:everything|things|it all|all of it)|making (?:decisions|plans|choices)|taking (?:decisions|choices)|acting like (?:you're|you are|my)|interfering|meddling|undermining)\b/i,
  /\bwhen(?:ever)? it suits you\b|\bonly (?:when|if) (?:it's|it is) convenient(?: for you)?\b/i,
  /\bi guess i'm (?:only|just) (?:your|a|the)\b/i,
  /\b(?:you're|you are|ur|youre|u r) not my (?:mum|mom|mother|dad|father|parent|real (?:mum|mom|dad|mother|father))\b/i,
  /(?:^|[.!?]\s+)(?:so )?now you (?:want|need|care|remember|have time|decide)\b[^.!?]*/i,
  /\bafter (?:you|everything you|all you|what you) (?:took|did|said|put me through|stole|walked out|left|cheated|lied|did to)\b/i
];
// "That is incorrect." at the start of a correction
const BLUNT_RE = /^\s*(?:no[,.]?\s+)?(?:that is|that's|this is|you are|you're) (?:incorrect|wrong|not (?:correct|right|true|accurate))[.!]+|^\s*(?:incorrect|wrong)[.!]+(?=\s+\S)/i;
// a statement that closes the topic to the other person
const CLOSER_RE = /\bwe(?:'ll| will) (?:decide|make (?:the|that|this) (?:decision|call)|choose|figure (?:it|that|this) out|sort (?:it|that|this) out)(?: (?:about|on) [^.!?]{1,40}?)? (?:ourselves|on our own|by ourselves|without (?:you|your input))\b|\b(?:it's|that's|this is) (?:our|my) (?:decision|call|choice|business),? not yours\b|\bstay out of (?:it|this|our (?:business|marriage|lives))\b/i;
const FAMILY_VOC = /^(?:mum|mom|mommy|mummy|mam|ma|mother|dad|daddy|father|pa|nan|nana|gran|granny|grandma|grandpa|grandad|granddad|auntie|aunt|uncle)$/i;
function vocOf(text){ const m = String(text||"").match(/^\s*(?:(?:hi|hey|hello),?\s+)?([A-Z][a-z]+(?:,? [A-Z][a-z]+)?),\s+/); return m && !/^(?:So|Well|Look|Listen|Okay|Ok|Honestly|Seriously|Yes|No|Sure|Fine|Right|Also|And|But|Now|Then|Sorry|Thanks|Babe|Honey)$/.test(m[1]) ? m[1] : ""; }

/* Whole-message rewrites for the shapes testers met most: each keeps the real ask and drops the jab.
   send(m, ctx) -> the new words; recv: what it may mean, and a calm reply, for "Someone sent me this". */
const REFRAMES = [
  {id:"visits", re:/\b(?:you can't|you cannot|you can not|stop|please don't|don't|you shouldn't|you need to stop)\s+(?:just\s+)?(?:turn(?:ing)? up|show(?:ing)? up|com(?:e|ing) (?:over|round|around|by)|drop(?:ping)? (?:by|in|round)|pop(?:ping)? (?:by|in|round|over)|visit(?:ing)?|let(?:ting)? yourself in)(?: (?:here|at ours|at our place|at the house))?\s*(?:whenever|any ?time|when(?:ever)? you (?:want|like|feel like it|please)|unannounced|without (?:asking|calling|texting|warning|telling us|a heads-up))/i,
   why:"\"You can't just turn up\" sounds like a rule and a telling-off. Asking for a text first says the same boundary as a plan, and it keeps the door open.",
   send:(m,c)=>(c.voc ? c.voc+", " : "")+(c.family ? "I love seeing you. Could you" : c.voc ? "could you" : "Could you")+" text before you come over, so we can make sure it's a good time?",
   recv:{mean:"They're asking for a heads-up before visits. It's a request about timing, not a rejection of you.", reply:"You're right, I'll text first. When suits you?"}},
  {id:"closer", re:CLOSER_RE,
   why:"\"We'll decide ourselves\" is fair, and it can still sound like a door closing. Leading with warmth says the same thing and keeps them close.",
   send:(m,c)=>{ const about = (m[0].match(/\b(?:about|on) ([^.!?]{1,40}?) (?:ourselves|on our own|by ourselves|without)/i)||[])[1]; return (c.voc ? c.voc+", " : "")+"I know how much this means to you. We'll decide"+(about ? " about "+about : "")+" together, and tell you as soon as we do."; },
   recv:{mean:"They're saying this decision is theirs to make together. It doesn't mean your view doesn't matter to them.", reply:"I understand it's your decision. I'm here if you ever want to talk it through."}},
  {id:"inhaler", rel:["coparent"], re:/\byou (?:forgot|didn't pack|did not pack|didn't send|left out|forgot to pack|forgot to send) (her|his|their|the kids'?|the children's|[A-Z][a-z]+'s) ([a-z][a-z ]{1,24}?)(?:\s+(?:again|AGAIN|once again))?(?=[.!?,]|$)/i,
   why:"With a co-parent, short and factual works best: what the child needs, the ask, and a time. A question like \"do you even care?\" starts a fight about the past.",
   send:(m)=>{ const who=m[1].toLowerCase(); const named = /^[A-Z][a-z]+'s$/.test(m[1]); const pro = who==="his" ? "his" : who==="her" ? "her" : "their"; const child = named ? m[1].replace(/'s$/,"") : "[Child]"; return child+"'s "+m[2].trim()+" wasn't in "+pro+" bag on [day]. Please pack it before the [day] handoff."; },
   recv:{mean:"Under the frustration is a practical worry about what the child needs.", reply:"Thanks for telling me. I'll make sure it's packed for the [day] handoff."}},
  {id:"weekends", re:/\byou (?:always |keep |constantly |just )?(?:schedule|book|plan|arrange|put|sign (?:her|him|them) up for) ([a-z ]{2,30}?) (?:on|for|during) my (weekends?|days|time|nights|week)\b/i,
   why:"\"On purpose\" guesses at their motive, and \"always\" invites an argument about the exceptions. The plain pattern and one ask can actually be answered.",
   send:(m,c)=>c.coparent ? "The kids' plans have landed on my "+m[2]+" a few times. Can we check the calendar together before booking things on my "+m[2]+"?" : "Plans have landed on my "+m[2]+" a few times lately. Can we check the calendar together before booking things then?",
   recv:{mean:"They feel their time keeps getting taken. Underneath is a wish to plan together.", reply:"I hadn't seen it that way. Let's check the calendar together before either of us books anything. When suits you?"}},
  {id:"without", re:/\b(?:i|we) (?:managed|coped|got by|survived|did (?:fine|okay|ok|well))(?: (?:just|perfectly|totally))?(?: (?:fine|okay|ok|well|great))? without you\b/i,
   why:"\"I managed fine without you\" keeps score, and it lands as \"you're not needed.\" Saying you got used to your way, and asking which jobs they take back, keeps what you need.",
   send:()=>"I got used to doing it my way while you were gone. Can we pick which jobs you take back?",
   recv:{mean:"This sounds like hurt said as scorekeeping. They've been carrying a lot alone, and changes may feel like criticism of how they managed.", reply:"You carried a lot while I was gone, and I'm grateful. Which jobs would you like me to take back first?"}},
  {id:"alone", re:/\bi (?:did|have done|handled|ran|managed|was doing|carried) (?:it|everything|this|that|all of it|it all|the (?:\w+ ?){1,2})(?: all)? (?:alone|on my own|by myself|single-handedly|solo)\b(?:[^.!?]*?\bi know how ([a-z' ]{1,25}?) works)?/i,
   why:"\"I did it alone\" keeps score, and \"I know how it works\" closes the door. Saying you got used to your way, and asking to agree together, keeps what you need.",
   send:(m)=>m[1] ? "I did "+m[1].replace(/^the /,"")+" on my own while you were away, so I got used to my way. Can we agree together how we do "+m[1].replace(/^the /,"")+" now?" : "I did a lot on my own while you were away, and I got used to my way. Can we pick which jobs you take back?",
   recv:{mean:"This sounds like hurt said as scorekeeping. They carried a lot on their own, and changes may feel like criticism.", reply:"You carried a lot on your own. I'd like to learn your way. Can we agree together how we do it now?"}},
  {id:"money", re:/\bstop (?:policing|monitoring|checking|controlling|questioning|judging) (?:what i spend|my spending|how i spend|my money|every (?:purchase|penny|thing i buy))|\bit's my money too\b[^.!?]*/i,
   why:"\"Stop policing\" is a charge, and the listener defends themselves. Asking for some money that's just yours, and offering a shared limit for big things, keeps what you need.",
   send:()=>"I'd like some money that's just mine to spend, and I'm happy to agree a limit for big things together.",
   recv:{mean:"They want some say over their own spending. Underneath is usually a wish for trust and a bit of freedom, not a fight about every purchase.", reply:"Fair. How about some money each that's just ours, and we agree a limit for big things together?"}},
  {id:"treat", re:/\byou treat(?:ed|s|ing)? me like (?:the |a |an |your |some )?(help|maid|servant|cleaner|nanny|babysitter|slave|housekeeper|staff|employee|secretary|assistant|skivvy|doormat|child|kid|idiot|[a-z]+)\b/i,
   why:"\"You treat me like the help\" is a label, so the listener argues with the label. The feeling (taken for granted) and one fair split can actually be answered.",
   send:(m,c)=>/\b(?:job|work|working)\b(?:\s+too)?/i.test(c.text) && /\btoo\b/i.test(c.text) ? "I'm working too, and when the house jobs default to me, I feel taken for granted. Can we split [one job, like the dog walks]?" : /^(?:child|kid|idiot)$/i.test(m[1]) ? "When [what happened], I felt talked down to. Could you [one specific thing] next time?" : "I've been feeling taken for granted lately. Can we split [one job, like the dog walks]?",
   recv:{mean:"This sounds like they feel taken for granted. The label is the hurt talking; underneath is usually a wish for a fairer split.", reply:"I don't want you to feel that way. Which job would help most if I took it?"}},
  {id:"suits", re:/\b(?:i guess )?i'm (?:only|just) your (?:\w+) when it suits you\b|\bwhen(?:ever)? it suits you\b|\bi guess i'm (?:only|just) (?:your|a|the)\b[^.!?]*/i,
   why:"\"Only when it suits you\" is an accusation, so the listener defends themselves. Saying you miss them and asking for a little time says what you need.",
   send:(m,c)=>c.work ? "I've been feeling a bit left out of things lately. Could we find ten minutes this week to catch up?" : "I miss you and I've been feeling a bit left out. Could we find ten minutes this week?",
   recv:{mean:"This sounds like they're hurt and feel left out. Underneath, they probably miss you.", reply:"I'm sorry you've felt left out. I miss you too. Are you free for a call this week?"}},
  {id:"nice", re:/(?:^|[.!?]\s+)(?:it )?must be nice(?: to (?:just )?(.+?))?(?: while (?:i|we) (.+?))?(?=[.!?]|$)/i,
   why:"Sarcasm carries the real message in the tone, and it lands as a dig. Saying you're stretched, and asking to share the load, can actually be answered. (It doesn't add an ask you didn't make.)",
   send:(m)=>{ const y = m[2] ? m[2].trim() : ""; const admin = /\b(?:running|place|business|office|shop|bakery|store|house|home|team|company)\b/i.test(y);
     return "I'm feeling stretched thin"+(y ? " "+ingForm(y.replace(/^(?:have to|having to|need to) /i,"")) : "")+". Could we look at "+(admin ? "the admin" : "what's on my plate")+" together and share some of it?"; },
   recv:{mean:"Sarcasm like this usually means they're stretched and feel the load isn't shared.", reply:"Sounds like you're stretched. What would help most this week?"}},
  {id:"decide", re:/\bstop (?:making|taking) (?:decisions|choices|plans)(?: about ([^.!?]+?))? without (?:me|asking me|talking to me|checking with me)\b/i,
   why:"\"Stop making decisions without me\" is a charge, and the listener defends the past. Asking to check with each other first says what you need.",
   send:(m,c)=>c.coparent ? "For school, health and new activities, can we text each other first and decide together?" : "I'd like a say in decisions about "+(m[1] ? m[1].trim() : "[the thing]")+". Can we check with each other first and decide together?",
   recv:{mean:"They want a say before decisions are made. Underneath is a wish to be included, not only a complaint.", reply:"Okay. For the big things, I'll check with you first. Which decisions matter most to you?"}},
  {id:"changing", re:/\b(?:so )?stop changing (?:everything|things|it all|all of it)\b/i,
   why:"\"Stop changing everything\" is a charge. Saying you got used to your way, and asking to pick the changes together, keeps what you need.",
   send:()=>"I got used to doing things my way. Can we pick which things to change, one at a time?",
   recv:{mean:"They may feel their way of doing things is being overruled. Underneath is a wish to be asked first.", reply:"Fair. Which things would you like to keep the way they are?"}},
  {id:"stopit", re:/\bstop (policing|nagging|controlling|micromanaging|monitoring|checking up on|lecturing|bossing) me(?: (?:about|around|over|on) ([^.!?]{2,40}?))?(?=[.!?]|$)|\bstop (policing|nagging|controlling|micromanaging|monitoring|lecturing|bossing)(?=[.!?]|$)/i,
   why:"\"Stop nagging\" or \"stop controlling me\" is a label, and the listener defends themselves. Saying what you'd like instead can actually be answered.",
   send:(m)=>{ const v=(m[1]||m[3]||"").toLowerCase(), what = m[2] ? m[2].trim() : "[the thing]";
     return /nag/.test(v) ? "I'd like to sort out "+what+" without reminders. Could we agree who does what, and by when?" : /lectur|boss|micro/.test(v) ? "I'd like to do "+what+" my way. If something matters to you, could you tell me once, and then trust me with it?" : "I'd like to make my own choices about "+what+". Can we talk about where we each need a say?"; },
   recv:{mean:"They feel watched or told what to do. Underneath is usually a wish for trust and room to do it their way.", reply:"I don't want you to feel watched. What would help you feel trusted with it?"}},
  {id:"notmum", re:/\b(?:you're|you are|ur|youre|u r) not my (?:mum|mom|mother|dad|father|parent|real (?:mum|mom|dad|mother|father))\b[^.!?]*/i,
   why:"\"You're not my mum\" hurts, and it hides what you need. Saying you need some space, and that you'll talk later, keeps the door open.",
   send:()=>"I know you're trying. I need some space right now, can we talk later?",
   recv:{mean:"This hurts to hear. Often it means they feel crowded or told what to do and need some space. It doesn't mean you don't matter to them.", reply:"Okay. I'll give you some space. I'm here when you want to talk."}},
  {id:"nowyou", re:/(?:^|[.!?]\s+)(?:so )?now you (?:want|need|care|remember|have time|decide)\b[^.!?]*[.!?]*(?:\s*after (?:you|everything you|all you|what you) [^.!?]*[.!?]*)?|\bafter (?:you|everything you|all you|what you) (?:took|did|said|put me through|stole|walked out|left|cheated|lied|did to)\b[^.!?]*/i,
   why:"A sharp question or an \"after you…\" says the hurt as blame, so the listener defends the past. Saying the hurt plainly, and what you need before you talk, can actually be heard.",
   send:()=>"I'm still hurt about what happened. If we talk, I need us to start there.",
   recv:{mean:"They're still hurt about what happened before. The edge is the hurt; it doesn't have to mean the door is shut for good.", reply:"You're right to be hurt. I'm not asking you to talk before you're ready. I'm here when you are."}},
  {id:"guests", re:/\b(?:can|could|would) (?:your|you(?:r)?) (boyfriend|girlfriend|partner|friend|bf|gf)\s+(?:maybe |please |just |possibly )*(?:not|stop) (?:stay(?:ing)?|sleep(?:ing)?|com(?:e|ing)) over (?:every|each) night\b|\b(?:your|ur) (boyfriend|girlfriend|partner|bf|gf) is (?:here|over|staying (?:here|over)) (?:every|each) (?:single )?night\b/i,
   why:"A plain, kind ask about how many nights, with a heads-up, gives them something to agree to. \"Maybe\" and shouting both make it easy to shrug off.",
   send:()=>"Could we agree on a few nights a week for overnight guests, with a heads-up text? I'm not sleeping well.",
   recv:{mean:"They're asking for fewer overnight stays, or a heads-up. It's about sleep and the shared room, not about you as a person.", reply:"That's fair. How many nights a week would work for you, if I text you first?"}},
  {id:"incorrect", re:BLUNT_RE,
   why:"\"That is incorrect\" is clear, and it can land cold, like a mark against them. \"Quick correction\" keeps the same fact and sounds like help.",
   send:(m,c)=>{ const rest = c.text.slice(m.index+m[0].length).trim(); return "Quick correction: "+(rest ? lowerFirst(rest).replace(/\s*$/,"") : "[the right fact].").replace(/([^.!?])$/,"$1."); },
   recv:{mean:"It's a correction, said bluntly. It's about the fact, not about you.", reply:"Thanks for catching that."}}
];
const REFRAME_BY = Object.fromEntries(REFRAMES.map(r=>[r.id, r]));
function reframeOf(an, opts){
  opts = opts||{};
  const text = an.norm.trim(), voc = vocOf(text);
  const c = {text, voc, rel: opts.rel||"", coparent: opts.rel==="coparent", work: !!(opts.work || WORK_REL.includes(opts.rel)),
    family: opts.rel==="family" || (voc && FAMILY_VOC.test(voc))};
  for(const r of REFRAMES){
    if(!r.re) continue;
    if(r.rel && !r.rel.includes(c.rel)) continue;
    const m = text.match(r.re);
    if(m) return {r, m, c, send: r.send(m, c)};
  }
  return null;
}

function analyze(textIn, opts){
  opts = opts||{};
  const ch = opts.channel||"person";
  const typed = String(textIn==null?"":textIn);
  // "you're allways late" reads as "you're always late": the shared list of common misspellings
  const sp = SHARED && SHARED.spell ? SHARED.spell(typed) : {text:typed, fixes:[]};
  const raw = sp.text;
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
        if(/^always$/.test(mm) && /^\s*(?:so |such an? |really )?(?:thoughtful|kind|sweet|generous|helpful|patient|supportive|caring|lovely|wonderful|amazing|great|good to me|there for me|on time|fun|the best|so good)\b/.test(after)) continue;
      }
      if(f.id==="minim" && /^just$/.test(mm) && /\b(?:i'll|i will|i'm|i|we'll|we)\s+$/.test(before)) continue;
      // "whenever you want" is an open door, not a deadline to fill in
      if(f.id==="vtime" && /^whenever$/.test(mm) && /^\s*(?:(?:you|they|he|she|we|i) (?:want|like|feel like it|please|fancy|need|can|are ready|'re ready)|it suits)\b/.test(after)) continue;
      if(f.id==="label" && /^how (?:difficult|hard)/.test(mm) && /^\s*(?:is|was|can)\b/.test(after)) continue;
      if(f.id==="hedge" && /\bi think\b/.test(mm) && /^\s*(?:we|you) (?:could|should|might)\b/.test(after)) {/* still a hedge, keep */}
      push(f.id, s, e);
    }
  });

  shoutSpans(text).forEach(x=>push("shout", x.s, x.e));
  if(SHARED){
    const MAP = {dismiss:"brushoff", sarcasm:"sarcasm", contempt:"contempt", passive:"passiveag", pointed:"pointed", compare:"compare", absolute:"absolute", stonewall:"stonewall", flat:"minimal", pause:"pause", appreciation:"appreciation", swear:"swear", hostile:"hostile", label:"label", hint:"hint", opener:"ominous"};
    SHARED.scan(raw).forEach(m=>{
      const id = MAP[m.id]; if(!id) return;
      const s0 = m.whole ? 0 : m.start, e0 = m.whole ? raw.length : m.end;
      if(hits.some(h=>h.id===id && h.s < e0 && s0 < h.e)) return;
      // "calm down" and "you're overreacting" already have their own, more specific readings
      if(id==="brushoff" && hits.some(h=>["calm","invalid","sarcasm"].includes(h.id) && h.s < e0 && s0 < h.e)) return;
      // "You are so autistic": a diagnosis used as an insult gets its own reading
      if(id==="label" && /\b(?:autis\w*|retard\w*|adhd|add|ocd|bipolar|schizo\w*|psychotic|mental|spastic|spaz|special needs|brain ?damaged|deranged)\b/i.test(raw.slice(s0,e0))) { push("dxlabel", s0, e0); return; }
      if(id==="contempt" && /^[🙄😒]/.test(raw.slice(s0,e0)) && hits.some(h=>h.id==="joke" && h.s===s0)) hits.splice(hits.findIndex(h=>h.id==="joke" && h.s===s0),1);
      push(id, s0, e0);
    });
    // "It's gross." / "That's disgusting.": a verdict on something they did, with nothing to act on
    const JR = /(?:^|[.!?]\s+)((?:it's|it is|that's|this is|that is|it was|that was)\s+(?:so |really |just |kind of |pretty |honestly )?(?:gross|disgusting|nasty|revolting|filthy|vile|ridiculous|unacceptable|a disgrace|embarrassing))\b/gi;
    let jm; while((jm=JR.exec(text))!==null){ const st=jm.index+jm[0].indexOf(jm[1]); if(!hits.some(h=>h.id==="critic"&&h.s<=st&&h.e>st)) push("critic", st, st+jm[1].length); }
    // "I'm going to kill you if…": an exaggeration that reads as a threat in writing
    (SHARED.idioms ? SHARED.idioms(raw) : []).forEach(x=>{ if(/kill|murder|strangle/i.test(x.text)){ for(let i=hits.length-1;i>=0;i--) if(hits[i].id==="hyper" && hits[i].s < x.start+x.text.length && x.start < hits[i].e) hits.splice(i,1); push("violent", x.start, x.start+x.text.length); } });
    // a short brush-off ("whatever.") is one reading, not two
    if(hits.some(h=>h.id==="minimal" && /^\s*whatever/i.test(h.match))) for(let i=hits.length-1;i>=0;i--) if(hits[i].id==="brushoff") hits.splice(i,1);
    // "I'm sick of you" is a fed-up line, not a feeling worth keeping
    for(let i=hits.length-1;i>=0;i--) if(hits[i].id==="feeling" && /\b(?:sick|tired|done|fed up)$/i.test(hits[i].match) && /^\s+(?:of|with)\s+(?:you|this|it|that|your|him|her|them|everything|everyone|us|all)\b/i.test(low.slice(hits[i].e, hits[i].e+20))) hits.splice(i,1);
    // a pause with a time to come back is not a door shut: drop the "minimal" and "stonewall" reads
    if(hits.some(h=>h.id==="pause")) for(let i=hits.length-1;i>=0;i--) if(hits[i].id==="stonewall"||hits[i].id==="minimal") hits.splice(i,1);
  }
  const sentences = splitSentences(text).map(x=>Object.assign(x,{raw:raw.slice(x.s,x.e)}));
  const sentOf = h=>sentences.find(se=>h.s>=se.s && h.s<se.e) || {s:0,e:text.length,text};
  // an opener that names its topic ("a quick call about the budget") is not ominous
  for(let i=hits.length-1;i>=0;i--){
    const h=hits[i]; if(h.id!=="ominous") continue;
    const se=sentOf(h); const rest=text.slice(h.e, se.e);
    if(/\b(?:about|regarding|re:|to (?:discuss|go over|review|talk about|look at)|on (?:the|your|my|our) \w+)/i.test(rest)) hits.splice(i,1);
    // "I need to tell you something. I'm bisexual, and…": the topic follows straight away
    else if(words(text.slice(se.e))>=6) hits.splice(i,1);
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
  drop("impera", h=>["calm","tone","demand","tic","hint","ominous","minimal","sarcasm","stopask","contempt"].some(id=>inside(h,id)));
  drop("clearask", h=>inside(h,"blameq")||inside(h,"cannot")||inside(h,"ominous")||inside(h,"feelingq"));
  if(has("tic")) drop("cannot", h=>inside(h,"tic"));
  drop("cannot", h=>/why\s*$/i.test(low.slice(Math.max(0,h.s-5), h.s)));
  if(has("vemo")) drop("should", h=>hits.some(x=>x.id==="vemo" && Math.abs(x.s-h.s)<4));
  if(has("minimal")){ drop("sarcasm"); drop("vstd"); drop("impera"); drop("clearask"); drop("passiveag", h=>/^\s*noted\.?\s*$/i.test(h.match)); }
  // curt pieces in a row ("Fine. Whatever works for you.", "Sure. Do what you want."): the short "Fine." is
  // part of the brush-off too, so the pair reads at least as loud as "Fine." on its own
  if(has("brushoff") && sentences.length>=2){
    sentences.forEach(se=>{
      if(/^\s*(?:fine|k|kk|ok|okay|sure|alright|all right|cool|yep|yeah|noted|great)\s*[.!]*\s*$/i.test(se.text) && !hits.some(h=>h.s>=se.s && h.e<=se.e && ["brushoff","minimal"].includes(h.id))) push("minimal", se.s, se.e);
    });
  }
  // a brush-off sentence is not an order ("Do what you want."), and nothing in it is a task
  drop("impera", h=>inside(h,"brushoff"));
  // "Sure, go out with your friends, I'll just sit here": hurt underneath, not a request
  drop("impera", h=>inside(h,"sarcasm") || inside(h,"guilt"));
  drop("minim", h=>inside(h,"guilt") || inside(h,"sarcasm") || inside(h,"passiveag") && /^just$/i.test(h.match));
  drop("passiveag", h=>inside(h,"guilt") || inside(h,"sarcasm"));
  // court, custody, or the children told first: very likely to escalate, and read as such
  { const lm = low.match(LEGAL_RE); if(lm) push("legal", lm.index, lm.index+lm[0].length); }
  { const km = low.match(KIDS_RE); if(km) push("kidsfirst", km.index, km.index+km[0].replace(/[\s,]+$/,"").length); }
  ["absolute","again","critic","threat","already","impera","hyper"].forEach(id=>drop(id, h=>inside(h,"legal") || inside(h,"kidsfirst")));
  // a safety worry: the repeat ("again") is part of the fact, not a jab. Valid, and it needs a habit, not a deadline
  let safety = null;
  { const sm = low.match(SAFE_RE);
    if(sm && !/\b(?:i|we)\s+$/i.test(low.slice(Math.max(0, sm.index-4), sm.index))){
      const thing = (sm[1]||sm[2]||sm[3]||sm[5]||(sm[4] && /lock/i.test(sm[4]) ? "door" : "")||"car seat").toLowerCase();
      safety = {thing, text: sm[0]};
      push("safety", sm.index, sm.index+sm[0].length);
      drop("again"); drop("critic", h=>inside(h,"safety")); drop("passive", h=>inside(h,"safety"));
      if(!SAFE_HABIT_RE.test(low)) hits.push({id:"safeask", s:-1, e:-1, match:thing});
    }
  }
  // an ultimatum without "then I'll": "if you don't come for Thanksgiving, don't bother coming at Christmas"
  { const ULT = /\bif you (?:don't|do not|won't|can't|ever) [^.!?]{1,70}?,?\s*(?:then )?(?:don't (?:bother|come|call|talk|expect)|forget (?:about )?(?:it|me|us)|we're (?:done|through|over)|i'm (?:done|gone|out)|you can forget|you'll (?:regret|be sorry)|don't ever)\b/i;
    const um = low.match(ULT); if(um && !has("threat")) push("threat", um.index, um.index+um[0].length); }
  // a threat that would frighten or control ("you'll regret it", "or else", "if you tell anyone…"): not a tone problem
  { const mm = low.match(MENACE_RE);
    if(mm){ const st=mm.index, en=mm.index+mm[0].replace(/[\s,]+$/,"").length;
      drop("threat", h=>h.s<en+40 && st-60<h.e); drop("swear", h=>h.s<en && st<h.e); drop("impera", h=>h.s<en && st<h.e); drop("again"); push("menace", st, en); } }
  // a calm boundary ("If you can't respect my relationship, I'm going to leave for today. I love you."): caring, not a threat
  { const bm = low.match(BOUNDARY_RE);
    if(bm && !has("menace") && !["swear","hostile","label","contempt","violent","legal","dxlabel"].some(has) && (BOUNDARY_CARE.test(low) || /\b(?:step (?:away|out|back)|take (?:a break|some space|space|a step back|a breather)|hang up|end (?:the|this) (?:call|visit|conversation|chat)|leave the (?:room|conversation|call))\b/i.test(bm[0]))){
      drop("threat"); push("boundary", bm.index, bm.index+bm[0].replace(/[\s,.]+$/,"").length); } }
  // coming out, or sharing a diagnosis: brave and caring, never "might hurt"
  { const dm = low.match(DISCLOSE_RE); if(dm){ push("disclose", dm.index, dm.index+dm[0].length); drop("ominous"); } }
  // blame said as a dig, or keeping score
  JAB_RES.forEach(re=>{ const jm = low.match(re); if(!jm) return;
    const st = jm.index + (jm[0].match(/^[.!?]\s+/)||[""])[0].length, en = jm.index+jm[0].replace(/[\s,.!?]+$/,"").length;
    if(hits.some(h=>["jab","sarcasm","guilt","legal","menace","kidsfirst"].includes(h.id) && h.s<en && st<h.e)) return;
    push("jab", st, en); });
  if(has("jab")){ drop("impera", h=>inside(h,"jab")); drop("hedge", h=>inside(h,"jab")); drop("vstd", h=>inside(h,"jab")); }
  // "That is incorrect." before a correction: clear, and it can land cold
  { const bm = low.match(BLUNT_RE); if(bm){ const st = bm.index + (bm[0].length - bm[0].replace(/^\s+/,"").length), en = bm.index+bm[0].replace(/[\s.!]+$/,"").length; push("blunt", st, en); drop("critic", h=>inside(h,"blunt")); } }
  // "We'll decide about it ourselves": fair, and it can sound like a closed door
  { const cm = low.match(CLOSER_RE); if(cm && !hits.some(h=>["hostile","contempt","swear"].includes(h.id) && h.s<cm.index+cm[0].length && cm.index<h.e)) push("closer", cm.index, cm.index+cm[0].length); }
  if(has("butc") && has("sarcasm")){ drop("sarcasm", h=>hits.some(b=>b.id==="butc" && h.s>=b.s && h.e<=b.e)); }
  if(has("vstd") && has("idiom") && hits.some(h=>h.id==="vstd" && /pull your weight/i.test(h.match))) drop("vstd");
  if(has("critic") && has("again")) drop("critic", h=>/again/i.test(h.match));
  if(has("minim") && has("oblig")) {/* both stay: "you just need to" */}
  if(has("feellike")) drop("istate", h=>inside(h,"feellike"));
  drop("hyper", h=>inside(h,"selfput"));
  drop("minim", h=>inside(h,"excuse"));  // "that's just me" is one reading
  drop("again", h=>inside(h,"count"));  // "I'm the worst" is one reading (a put-down), not two
  drop("reassure", h=>inside(h,"softener"));  // "is that okay with you?" is a kind check, not a worry
  if(has("label") && has("invalid")) drop("label", h=>inside(h,"invalid"));
  if(has("urgent") && has("vtime")) drop("vtime", h=>inside(h,"urgent"));
  if(has("blameq") && has("demand")) drop("demand", h=>inside(h,"blameq"));
  drop("critic", h=>/^you're late$/i.test(h.match) && /\b(?:when|if)\s*$/i.test(low.slice(Math.max(0,h.s-6),h.s)));
  drop("absolute", h=>/^never$/i.test(h.match) && /never\s*mind/i.test(low.slice(h.s,h.s+12)));

  // "I said maybe because of work": a report of an earlier answer, not a soft no now
  drop("softno", h=>/\b(?:i|we) (?:said|told you|meant|answered|was saying)(?: that)?,?\s*["“]?$/i.test(low.slice(Math.max(0,h.s-24), h.s)));
  // a stack of softeners in one request ("could you maybe possibly think about perhaps…")
  sentences.forEach(se=>{
    const st = low.slice(se.s, se.e).toLowerCase();
    const n = (st.match(/\b(?:maybe|possibly|perhaps|kind of|sort of|think about|at some point|if (?:that is|that's|it's|it is) (?:ok|okay|alright|not too much)|if you (?:don't|do not) mind|if it's not too much trouble|i was wondering if)\b/g)||[]).length;
    if(n>=3 && /\b(?:could|would|can|will) you\b/.test(st)){
      push("overhedge", se.s, se.e);
      drop("softno", h=>h.s>=se.s && h.e<=se.e); drop("hedge", h=>h.s>=se.s && h.e<=se.e);
    }
  });
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
    const hurt = se.features.some(id=>["brushoff","guilt","legal","kidsfirst"].includes(id)) || se.features.includes("sarcasm") && a && a.kind==="command";
    if(a && se.mood!=="One-word reply" && !hurt){ a.sentence=i; se.ask=a.text; asks.push(a); }
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
  const taskAsks = asks.filter(a=>["oblig","command","request","hint","still","critq","threat","nudge"].includes(a.kind) && !standingSent(a.sentence) && !/^(?:not |stop |be |calm|relax|listen|understand|know|look|keep|remember|tell me|let me|say|repeat|explain|pass|hand|hold|wait|give me|show me|come here|help me with this)\b/i.test(a.text) && !/\b(?:when|if|whenever|every time|next time)\b/i.test(a.text) && !(SHARED && SHARED.idioms && SHARED.idioms(a.text).length) && !/\bstimming\b/i.test(a.text));
  const hasWhen = hits.some(h=>h.id==="when") || has("urgent");
  if(taskAsks.length && !hasWhen) hits.push({id:"nowhen", s:-1, e:-1, match:taskAsks[0].text});
  // "no rush" on an ask with no time is kind, and still vague for a literal listener
  if(taskAsks.length && !hasWhen && !has("vtime")){
    const nr = /\bno rush\b/i.exec(low);
    if(nr) push("vtime", nr.index, nr.index+nr[0].length);
  }
  // a clear ask is only "clear" if it is one ask
  if(hits.some(h=>h.id==="multi")) drop("clearask");
  // "any update?" already says the time is missing; excitement ("congrats!! 🎉") isn't shouting
  if(has("nudge")) drop("nowhen");
  if(!hits.some(h=>FBY[h.id] && FBY[h.id].kind==="static" && !["shout","period"].includes(h.id)) && hits.every(h=>h.id!=="shout" || /^!+$/.test(h.match))) drop("shout");
  // a whole message in capitals is shouting, whatever the words
  const letters = raw.replace(/[^A-Za-z]/g,""), caps = raw.replace(/[^A-Z]/g,"");
  const allCaps = letters.length >= 10 && caps.length >= letters.length*0.8 && words(raw) >= 3;

  // a real apology ("sorry", "my fault"), and a "but you…" after it: the blame is the part most likely to sting
  const apology = APOLOGY_AT(low);
  if(apology >= 0){
    BUT_YOU.lastIndex = apology;
    const bm = BUT_YOU.exec(low);
    if(bm){
      const st = bm.index + bm[0].search(/\b(?:but|though|although|except)\b/i), en = bm.index + bm[0].replace(/[\s.!?]+$/,"").length;
      push("sorrybut", st, en);
      drop("butc", h=>h.s < en && st < h.e);
    }
    // "Oh no, sorry!!" is earnest, not shouting: exclamation marks alone in an apology aren't marked
    drop("shout", h=>/^!+$/.test(h.match));
  }

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
    text: raw, typed, readAs: sp.fixes, norm: text, channel: ch, words: wc, allCaps,
    sentences, hits, found, spans, staticIds, goodIds,
    asks, segs,
    has: id=>!!found[id],
    missing: {
      when: !!(asks.some(a=>!standingSent(a.sentence)) && !hasWhen),
      why: !!(asks.length && !hasWhy),
      topic: !!found.ominous,
      feeling: !feelingM && staticIds.some(id=>["label","absolute","critic","madefeel","compare","blameq","again","past","guilt","threat","sarcasm","jab"].includes(id)),
      ask: !asks.length && staticIds.some(id=>["disclaim","label","absolute","critic","madefeel","compare","again","past","passive","sarcasm","vemo","guilt","feellike","blameq"].includes(id))
    },
    feelingWord: feelingM ? feelingM[1] : "",
    safety,
    danger: !!found.menace,
    apology: apology >= 0 && !found.menace
  };
}
/* Where a real apology starts, or -1. "Sorry, but…" as a lead-in, "sorry you feel that way" and "not sorry" don't count. */
const APOL_RE = /\b(?:(?:i'm|i am|so|really|very|truly)\s+)*(?:sorry|i apologi[sz]e|my bad|my fault|my mistake|i messed up|that's on me|i was wrong)\b/gi;
function APOLOGY_AT(low){
  APOL_RE.lastIndex = 0; let m;
  while((m = APOL_RE.exec(low))!==null){
    const before = low.slice(Math.max(0, m.index-12), m.index), after = low.slice(m.index + m[0].length, m.index + m[0].length + 24);
    if(/\bnot\s+$|\bno\s+$/.test(before)) continue;
    if(/^\s*(?:not sorry|you feel|you're|you are|if you|that you|for you\b|but you're|,?\s*but\b)/.test(after)) continue;
    return m.index;
  }
  return -1;
}
// the "but you…" clause after an apology, up to the end of its sentence
const BUT_YOU = /(?:^|[\s,;:–—-])\s*(?:but|though|although|except)\s+(?:you(?:'re|'ve|'d|'ll)?|your)\b[^.!?\n]*/gi;

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

const HOT_IDS = ["swear","hostile","label","contempt","threat","dxlabel","violent","legal","kidsfirst","menace"];
/* a static score: sum of the loudest reading per feature, minus a little for what's worth keeping */
function score(an, ids, ch, state){
  let sc=0; const top=[];
  const fids = Object.keys(an.found);
  const others = fids.filter(fid=>FBY[fid] && FBY[fid].kind==="static" && fid!=="period").length;
  fids.forEach(fid=>{
    const f=FBY[fid]; if(!f) return;
    if(fid==="period" && others) return;
    const ws=[];
    ids.forEach(b=>{ const e=entry(b,fid,ch); if(e){ ws.push(e.w); if(e.w>=1) top.push(Object.assign({b,fid},e)); } });
    if(f.kind==="good") return;
    if(ws.length){ const mx=fid==="nowhen" ? Math.min(1, Math.max(...ws)) : Math.max(...ws); sc+=mx+0.5*Math.max(0,ws.filter(w=>w>=2).length-1); }
    else if(fid!=="nowhen") sc+=0.25;
  });
  const good = fids.filter(fid=>FBY[fid] && FBY[fid].kind==="good").length;
  sc = Math.max(0, sc - Math.min(1.2, good*0.4));
  if(ch==="phone" && ids.includes("autistic")) sc+=0.5;
  if(ch==="phone" && ids.includes("apd")) sc+=1;
  if(ch==="email" && ids.includes("dyslexic") && an.words>25) sc+=0.5;
  const mult={v:1,s:1.4,d:1.9}[state||"v"]||1;
  sc = sc*mult + (state==="d"?1:0) + (state==="s"&&sc>0?0.3:0);
  // swearing, a fed-up line, name-calling, contempt or a threat: always heavy static, however short
  if(an.staticIds.some(id=>HOT_IDS.includes(id)) || an.allCaps) sc = Math.max(sc, 4.6);
  let level = sc<1.5?["clear","Clear signal"]:sc<4.5?["some","Some static"]:["heavy","Heavy static"];
  // the headline never says "clear" while something is flagged
  if(level[0]==="clear" && an.staticIds.length) level = ["some","A little static"];
  // on a tie, the "but you…" after an apology is named first: it's the part most likely to sting
  return {score:sc, level, pct:Math.max(6, Math.min(100, Math.round(sc/8*100))), top:top.sort((a,b)=>(b.w-a.w) || ((b.fid==="sorrybut")-(a.fid==="sorrybut")))};
}

/* ============================================================
   REWRITE
   Keeps the speaker's real ask. Changes the structure around it.
   Every change is logged with its reason. Placeholders in [brackets]
   are blanks for the speaker to fill in their own words.
   ============================================================ */
const CHANGE_WHY = {
  contempt:{g:"An eye-roll or a put-down says \"I look down on you,\" and the listener defends themselves instead of hearing the complaint. The plain complaint can actually be answered.", anxiety:"A put-down tends to be heard as \"you're not wanted,\" which is much bigger than the moment.", trauma:"Mocking can feel unsafe, not just unkind, and shut the conversation down."},
  passiveag:{g:"A complaint wrapped in politeness leaves the listener with an edge to react to and no clear ask. Saying the ask directly gives them something they can say yes to.", autistic:"The real request is hidden under the politeness, so it may simply not be heard.", anxiety:"The edge is often heard louder than the words, and replayed later."},
  stonewall:{g:"A pause is fine, and often wise. Adding when you'll come back turns \"this is over\" into \"not yet,\" so the other person can settle too.", anxiety:"Silence without a return time tends to be filled with the worst case.", adhd:"A clear time to come back makes the pause easy to hold, and easy to remember."},
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
  defend:{g:"\"I said…\" defends you before anyone has blamed you. Saying the fact on its own keeps it information, not a counter-argument."},
  brushoff:{g:"\"Whatever\" or \"I don't care\" can mean \"either is fine\" or \"I'm upset.\" Saying which one you mean stops the listener guessing, usually wrong.", anxiety:"A brush-off is often heard as anger or pulling away.", autistic:"A brush-off may be taken at its word."},
  dxlabel:{g:"A diagnosis used as a put-down is an insult, and it lands on everyone who has that diagnosis. The rewrite leaves it out and keeps what you actually want to say."},
  violent:{g:"\"I'll kill you\" is an exaggeration, but in writing it can read as a real threat. The rewrite says the true size of it and keeps what you want.", autistic:"An exaggerated threat may be taken literally.", trauma:"Violent words can set off alarm even when they're clearly not meant."},
  selfput:{g:"Calling yourself stupid pulls the listener into reassuring you. The rewrite keeps the apology and what happened, and leaves the put-down out."},
  overhedge:{g:"A stack of softeners hides the ask. One softener is enough to keep it kind, and the ask stays clear."},
  apology:{g:"An apology lands best when it's short and names what you'll do about it. The note in brackets is a place for that, if there's something you can do."},
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
  swear:{g:"Swearing turns up the volume, so the listener hears the anger before the point. The rewrite keeps your point and names the feeling in words instead.", anxiety:"Strong language is heard as danger to the relationship.", trauma:"Swearing can register as threat."},
  hostile:{g:"A fed-up line says how angry you are, but not what you need. The rewrite says the feeling once, asks for the pause you need, and names what you want to talk about.", adhd:"A fed-up line can sound like rejection, which lands very sharply.", autistic:"Idioms like \"my last nerve\" may be read literally, and there's no ask in them."},
  insult:{g:"Name-calling is a verdict on the person, and a verdict can't be fixed. The rewrite drops it and keeps what happened and what you'd like.", adhd:"Labels echo years of similar comments and can shut the conversation down."},
  idiom:{g:"A figure of speech says one thing and means another. The plain words mean exactly what you mean, for every listener.", autistic:"Figures of speech may be taken literally, especially under stress.", dld:"Figurative language can be hard to decode."},
  intens:{g:"\"Literally\" and \"seriously\" add volume, not information. Without them the sentence says the same thing, calmly.", autistic:"An intensifier may be taken at face value and checked for accuracy."},
  count:{g:"Counting the misses (\"third time,\" \"again\") reads as a record being kept, so people hear blame and stop reading for the fix. The days and the impact carry the pattern on their own. If it keeps happening with one person, raise it with them on their own, not in the channel.", adhd:"For many ADHD listeners, a count lands on the whole history of being told off, not on the one fix that's needed.", anxiety:"A running count can sound like a case being built, and gets replayed."},
  guys:{g:"\"Guys\" at the start of a correction can read as a call-out to the whole group, and not everyone hears themselves in it. The message works without it."},
  workask:{g:"\"Sort it out\" doesn't say who, or what done looks like, so everyone can assume someone else has it. Asking to agree one owner, by a day, gives the group one clear thing to say yes to."},
  impact:{g:"Saying when it happened and what it affected keeps it about the work, not about a person. People can fix a process they can see."},
  excuse:{g:"\"You know how I am\" asks them to make room for the miss, so the work of fixing it lands on them. Saying what you did, that it's on you, and one thing you'll do keeps the apology yours.", adhd:"If forgetting is part of how your brain works, that's real. Naming the system you'll use (a reminder, an alarm) says so without asking them to carry it."},
  doneload:{g:"\"I'm done\" sounds like you're walking away, so people react to the door closing, not the load. Saying you can't keep carrying it on your own keeps you in the conversation and says what's really true."},
  feellike:{g:"\"I feel like you…\" introduces a judgment, not a feeling. Naming the real feeling and the event is clearer and kinder."}
};

const MINIMAL_FIX = {
  "fine":"[If it's really fine:] That works for me. [If it isn't:] I'm not okay with this yet. Can we talk about it at [a time]?",
  "i'm fine":"I'm okay. [Or say what's actually going on, even in a few words.]",
  "it's fine":"It's really okay, I mean it.",
  "k":"Okay, got it.", "kk":"Okay, got it.", "ok":"Okay, got it.", "okay":"Okay, got it.",
  "alright":"Okay, got it.", "all right":"Okay, got it.",
  "k thx":"Okay, got it. Thanks.", "k thanks":"Okay, got it. Thanks.", "kk thx":"Okay, got it. Thanks.", "ok thx":"Okay, got it. Thanks.", "ok thanks":"Okay, got it. Thanks.", "ok, thanks":"Okay, got it. Thanks.", "okay thanks":"Okay, got it. Thanks.", "okay, thanks":"Okay, got it. Thanks.", "ok ty":"Okay, got it. Thanks.", "ok thank you":"Okay, got it. Thank you.", "okay, thank you":"Okay, got it. Thank you.", "okay thank you":"Okay, got it. Thank you.", "ok, thank you":"Okay, got it. Thank you.",
  "sure":"Sure, I can do that.", "noted":"Noted, thanks.", "cool":"Cool, got it.", "great":"Great, got it.",
  "good":"Good, got it.", "yep":"Yes, got it.", "yeah":"Yes, got it.", "mhm":"Yes, got it.", "right":"Right, I understand.",
  "whatever":"[If it's really okay:] Okay, that works for me. [If it isn't:] I'm not ready to talk about this well right now. Can we come back to it at [a time]?",
  "nothing":"I'm not ready to talk yet. Can we talk at [a time]?",
  "nvm":"It's okay, it can wait until [a time].", "never mind":"It's okay, it can wait until [a time].", "nevermind":"It's okay, it can wait until [a time].",
  "if you say so":"I see it differently, but I'm okay going with that.",
  "wow":"[Say what you're reacting to, in words.]"
};
const PP_TO_PAST = {gone:"went",done:"did",taken:"took",seen:"saw",eaten:"ate",written:"wrote",given:"gave",been:"were",broken:"broke",forgotten:"forgot",driven:"drove",known:"knew",spoken:"spoke",chosen:"chose",shown:"showed",thrown:"threw",hidden:"hid",stolen:"stole",begun:"began",drunk:"drank",ridden:"rode",woken:"woke",worn:"wore",torn:"tore",flown:"flew",grown:"grew",drawn:"drew",fallen:"fell",gotten:"got"};
const BE_ADJ = /^be (?:normal|nicer|nice|better|more \w+|less \w+|like \w+|a (?:\w+ )?(?:person|adult|grown-?up|partner|parent)|an adult|different|reasonable|mature|responsible|considerate|supportive|present|there for me|on my side)\b/i;

/* a message made only of curt pieces: "Fine. Whatever works for you.", "Sure. Do what you want.", "whatever." */
const CURT_PIECE = "(?:fine|ok(?:ay)?|k+|sure|yeah|yep|alright|all right|whatever|whatevs|whatev|whatever (?:works|suits) (?:for you|you|best)|whatever you (?:want|like|say|think)|whatever you think is (?:best|right)|do what you (?:want|like)|i (?:really )?(?:don't|do not) care|i could(?:n't| not) care less|if you say so|suit yourself|your call)";
const CURT_ONLY = new RegExp("^\\s*"+CURT_PIECE+"(?:[\\s.,!…]+"+CURT_PIECE+")*[\\s.!…🙄😒]*$", "i");
const FILLER_ONLY = /^(?:(?:ok(?:ay)?|hey|so|and|also|now|look|listen|um|uh|well|right|alright|honestly|seriously|guys|babe|honey|please|and also|but)[\s,]*)+$/i;
/* "come to the party, it'll be fun" -> ["come to the party", "It'll be fun."] */
function splitTail(act){
  const m = act.match(/^(.+?),\s*((?:it|that|this|i|we|they|because|so|which|since)\b.+)$/i);
  return m ? [m[1], capFirst(m[2]).replace(/[.!?]*$/,".")] : [act, ""];
}
/* Listeners for whom "again" tends to land on the whole history of being told off */
const CRIT_SENSITIVE = ["adhd","hsp","trauma"];
/* "I noticed you left the stove on again." -> "You left the stove on." The fact stays in the speaker's own words,
   active and plain, with no "again". Nothing is added: no time, no place, nothing the message didn't say.
   Returns null when there is no safety fact in the sentence. */
function neutralSafety(s, sf){
  if(!sf || !sf.thing) return null;
  if(!SAFE_RE.test(s.toLowerCase())) return null;
  let t = s.replace(/^\s*i (?:noticed|saw|see)(?: that)?\s+/i, "");
  t = t.replace(/,?\s*\b(?:yet again|once again|all over again|again)\b(?=[\s.,!?]|$)/gi, "").replace(/\s+([.,!?])/g,"$1").replace(/[\s.!?]+$/,"").replace(/^,\s*/,"");
  if(!/[a-z]/i.test(t)) return null;
  return capFirst(t)+".";
}
function lowerFirst(s){ return /^I\b/.test(s) ? s : s.replace(/^([A-Z])(?![A-Z])/, c=>c.toLowerCase()); }
function capFirst(s){ return s.replace(/^(\s*["'(\[]?)([a-z])/, (m,p,c)=>p+c.toUpperCase()); }
function endQ(s){ return s.replace(/[\s.!?,;:]+$/,"")+"?"; }
function endP(s){ s = s.replace(/[\s,;:]+$/,""); return EMOJI_END.test(s) ? s : s.replace(/([^.!?\]])$/,"$1."); }
function vagueObj(ask){ return ask.replace(/^(do|fix|handle|sort|finish|clean) (this|that|it)$/i, "$1 [the specific thing]").replace(/^help(?: out| more)?$/i, "help with [one specific task]"); }
/* A rewritten sentence that wouldn't read as clean English: a leftover clause before "a lot", a pronoun
   left hanging after "To recap:", a sentence ending on "the", "You'll rarely see them", a doubled word. */
const BROKEN_RX = [
  /,\s*(?:it|this|that|which|she|he|they|i)\s+(?:is|was|are|were|am|'s|isn't|wasn't)\b[^.!?]*\b(?:a lot|much)[.!?]/i,
  /\blately it's felt like[^.!?]*[,;][^.!?]*\b(?:a lot|much)[.!?]/i,
  /\b(?:a lot|much)\s+(?:a lot|much)\b/i,
  /\bto recap:\s*(?:them|him|her|the kids|the children|everyone|us|you)\b/i,
  /\s(?:the|an|my|your|our|their|to|of)[.?!](?:\s|$)/i,
  /\b(?:you|they|he|she|we)(?:'ll| will| would|'d) (?:often|rarely)\b/i,
  /\b(?:could|can|would) you (?:could|can|would|will|should|must)\b/i,
  /\bnot not\b/i,
  /,\s*(?:not|but|and|because|or)\s*[.!?]/i,
  /\b(?:could|can|would|will) you (?:do|does|did|are|is|was|were|have|has|had|don't|didn't|can't|won't) (?:you|u|we|i|they)\b/i,
  /\bso \w+ a lot\b/i,
  /\b(?:could|can|would|will) you [^?.!]*\b(?:and|but) (?:it|that|this)(?:'s| is| was)\b[^?.!]*\?/i,
  /\b(?!(?:that|had|is|very|so|really|bye|no|ha|ok)\b)([a-z]{2,}) \1\b/i
];
function brokenEnglish(t){ const x = String(t||"").replace(/\[[^\]]*\]/g,"X"); return BROKEN_RX.some(rx=>rx.test(x)); }
function tidy(t){
  t = t.replace(/,\s*((?:\p{Extended_Pictographic}|\uFE0F|\u200D)+)/gu, " $1");
  t = t.replace(/[ \t]+/g," ").replace(/ +([,.!?:;])/g,"$1").replace(/([,.!?:;])(?=[A-Za-z])/g,"$1 ").replace(/,\s*([.!?])/g,"$1")
       .replace(/,\s*,/g,",").replace(/([.?!])\s*\./g,"$1").replace(/\?\?+/g,"?").replace(/!!+/g,"!").replace(/^\s*[,.;:]\s*/,"").replace(/\s+\n/g,"\n").trim();
  t = t.replace(/(^|[.!?]\s+|[.!?]\]\s+|\n)([a-z])/g,(m,p,c)=>p+c.toUpperCase());
  t = t.replace(/\bi\b(?=[' ])/g,"I");
  t = t.replace(/,\s+(and|but|so)?\s*(Could|Would|Can|Will)\b(?! [A-Z])/g, (m,c,w)=>", "+(c?c+" ":"")+w.toLowerCase());
  // "I love you, but. Could you…" → "I love you, and could you…"
  t = t.replace(/,?\s*\b(but|and|so)\.\s+(Could|Would|Can|Will|I)\b/g, (m,c,w)=>", and "+(w==="I"?w:w.toLowerCase()));
  // a question gets a question mark: "Can you grab milk on your way home." → "…home?"
  t = t.replace(/(^|[.!?]\s+)((?:can|could|would|will|do|does|did|is|are|was|were|have|has|should|shall|may|what|when|where|why|who|how)\b[^.!?\n]*?)\.(?=\s|$)/gi, (m,p,q)=>/^(?:how|what|when|where|why|who) (?:about|if)\b|\b(?:i wonder|i know)\b|^(?:when|where|how|what)\b[^?]*,\s*(?:I|we|it|you)\b/i.test(q) ? m : p+q+"?");
  t = t.replace(/(^|[.!?]\s+)((?:can|could|would|will) (?:you|we|i)\b[^.!?\n]*\])$/i, "$1$2?");
  t = t.replace(/([A-Z][^.!?\n]{14,}[.!?])(?:,?\s*\1)+/g, "$1");
  if(t && !/[.!?\]"')]$/.test(t) && !EMOJI_END.test(t)) t+=".";
  return t;
}
const EMOJI_END = /(?:[\u2600-\u27BF]|\uD83C[\uDC00-\uDFFF]|\uD83D[\uDC00-\uDFFF]|\uD83E[\uDC00-\uDFFF]|\uFE0F|\u200D)\s*$/;
// Keyboard mash and random letters ("asdkjh qwe zzkx"): there's nothing here to read yet
function looksLikeGibberish(t){
  const ws = (String(t).toLowerCase().match(/[a-z']+/g)||[]).filter(w=>w.length>=3 && !/^(?:thx|pls|plz|txt|brb|msg|hmm+|ppl|tmrw|sry|lmk|smh|ngl|tbh|idk|jk|ttyl|omw|wyd|hbu|fyi|btw|nvm|ok+|kk|mhm|shh+|psst|grr+|brr+|zzz|pfft|ssh|why|my|by|try|dry|fly|shy|cry|gym|rhythm|myth|lynx|nth)$/.test(w));
  if(!ws.length || ws.join("").length < 6) return false;
  const odd = ws.filter(w=>!/[aeiouy]/.test(w) || /[bcdfghjklmnpqrstvwxz]{5,}/.test(w) || /(.)\1\1/.test(w) || /^(?:asd|qwe|zxc|jkl|sdf|hjk|fgh|wer|xcv|dfg)/.test(w));
  return odd.length*2 >= ws.length && ws.length<=12 && !/\b(?:the|and|you|you're|can|could|please|thanks|hey|hi|i'm|it's|is|to|of)\b/i.test(t);
}

/* At work (a team lead, a coworker, a group channel), a correction is rewritten as fact, impact and request:
   "The shift handover was missed on [days], and [what that affected]. Could we agree one owner for it by [a day]?"
   "Guys" goes, the count of misses goes ("third time", "again", "every time": the notes say why), and a vague
   "sort it out" becomes one owner by one day. */
const ORD = "(?:second|third|fourth|fifth|sixth|seventh|eighth|ninth|tenth|umpteenth|hundredth|millionth|nth|\\d+(?:st|nd|rd|th))";
const WORK_ADDR = /^\s*(?:(?:hey|hi|ok(?:ay)?|so|right|look|listen)[\s,]+)?(?:you )?(?:guys|folks|people|lads|ladies|boys|girls|y'all|dudes|mates?|gang|peeps)\s*[,!:.–—-]+\s*/i;
const WORK_VAGUE = /^(?:(?:could|can|would|will) you (?:all |guys |please )*)?(?:please )?(?:sort (?:it|this|that)(?: out)?|sort out (?:it|this|that)|fix (?:it|this|that)|deal with (?:it|this|that)|handle (?:it|this|that)|get (?:it|this|that) sorted|sort yourselves out|get (?:it|this) together|do better|step up|make sure (?:it|this|that) (?:doesn't|does not|won't|will not|never) happen(?:s)? again|(?:fix|handle|sort out|deal with) \[the specific thing\])(?: by \[a time\])?[?.!]*$/i;
const WORK_MISS = /\b(?:was|were|got|has been|have been|had been)\s+(?:\w+ly\s+)?(?:missed|skipped|forgotten|dropped|late|left|ignored|lost|not (?:done|sent|updated|filled in|logged|completed|finished))\b|\b(?:missed|forgot|skipped|didn't|did not|wasn't|weren't|hasn't been|haven't been)\b/i;
function workReframe(main, an, note, ctx){
  let counted = "", fact = false;
  let t = main.replace(WORK_ADDR, mm=>{ note("guys", mm.replace(/[\s,!:.–—-]+$/,""), ""); return ""; })
              .replace(/,\s*(?:guys|folks|people|lads|y'all)(?=[\s.!?])/gi, mm=>{ note("guys", mm.replace(/^,\s*/,""), ""); return ""; });
  const sents = splitSentences(t).map(x=>x.text.trim()).filter(Boolean);
  const out = [];
  sents.forEach(s0=>{
    let x = s0, cnt = false;
    const lead = x.match(new RegExp("^(?:(?:this|that|it)(?:'s| is| was) (?:now |already |officially )?the) "+ORD+" time(?: (?:this|that|in a) (?:week|month|sprint|quarter|year|row))?(?: (?:that|when))?\\s*", "i"));
    if(lead){ counted = counted || lead[0].trim().replace(/^(?:this|that|it)(?:'s| is| was) (?:now |already |officially )?the /i,"").replace(/\s+(?:that|when)$/i,""); x = x.slice(lead[0].length); cnt = true; if(!/[A-Za-z]{2}/.test(x)) { note("count", counted, ""); return; } x = capFirst(x); }
    x = x.replace(new RegExp(",?\\s*\\bfor the "+ORD+" time\\b","gi"), mm=>{ counted = counted || mm.replace(/^[,\s]+/,""); cnt = true; return ""; })
         .replace(/,?\s*\b(?:\d+|two|three|four|five|six|several|so many|too many) times (?:now|already|this (?:week|month|sprint|quarter|year)|in a row)\b/gi, mm=>{ counted = counted || mm.replace(/^[,\s]+/,""); cnt = true; return ""; })
         .replace(/,?\s*\b(?:yet again|once again|all over again|again|as usual|like always|every (?:single )?time|a few times lately|a lot lately)\b(?!\s+(?:we|you|i|it|this|that|the)\b)/gi, mm=>{ counted = counted || mm.replace(/^[,\s]+/,""); cnt = true; return ""; })
         .replace(/\s+([.,!?])/g,"$1").replace(/\s{2,}/g," ").trim();
    if(!/[A-Za-z]{2}/.test(x.replace(/\[[^\]]*\]/g,""))) return;
    const isQ = /\?\s*$/.test(x) || /\b(?:could|can|would|will) (?:you|we)\b/i.test(x);
    // a miss, said as a fact: when it happened and what it affected
    // (not your own miss: an apology says what you'll do instead, below)
    if(!isQ && !ctx.apology && !/^\W*(?:i|we|i'm|i've|we've|sorry)\b/i.test(x) && WORK_MISS.test(x) && (cnt || an.found.passive || an.found.count || an.found.again)){
      fact = true;
      const end = (x.match(/[.!]+$/)||["."])[0];
      let body = x.replace(/[.!]+$/,"");
      if(cnt && !WHEN_REAL.test(body) && !/\[days\]/.test(body)) body += " on [days]";
      if(!/\b(?:because|which (?:meant|means)|so (?:the|we|i)|meaning|and (?:that|it|the|we))\b|\[what that affected\]/i.test(body)) body += ", and [what that affected]";
      if(body!==x.replace(/[.!]+$/,"")) note("impact", x.replace(/[.!]+$/,""), body);
      x = capFirst(body)+(end.charAt(0)==="!"?".":end.charAt(0));
    }
    // a vague "sort it out": one owner, by one day
    if(WORK_VAGUE.test(x)){
      const ask = "Could we agree one owner for "+(fact || out.length ? "it" : "[the task]")+" by [a day]?";
      note("workask", x.replace(/[?.!]+$/,""), ask); x = ask;
    }
    out.push(x);
  });
  if(counted) note("count", counted, "");
  return out.join(" ");
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
  if(looksLikeGibberish(text) && !has("minimal")){
    const g = "[This doesn't look like a sentence yet. Type what you'd really say or send.]";
    return {main:g, primary:{id:"main", label:"Nothing to read yet", why:"It looks like random letters, so there's nothing to translate. Try the words you'd actually use.", text:g}, variants:[{id:"main", label:"Nothing to read yet", why:"It looks like random letters, so there's nothing to translate. Try the words you'd actually use.", text:g}], changes:[], ask:null, list:"", unchanged:true, gibberish:true};
  }

  // a silent "…" on its own: say one short line instead
  if(/^\s*(?:\.{3,}|…)\s*$/.test(text)){
    const out0 = "[Say one short line, even \"I need a minute. I'll reply tonight.\"]";
    log.push({id:"stonewall", from:[text], to:["one short line"], extra:""});
    return finish(out0, "", log, an, W, opts);
  }
  // one-word replies have their own fixes
  const low = text.toLowerCase().replace(/[.!]+$/,"").trim();
  if(/^\s*(?:ok(?:ay)?|k+|fine|sure|whatever|cool|noted|right)[\s.!,]*[🙄😒]+\s*$/i.test(text)){
    const out = "I'm not okay with this yet. Can we talk about it at [a time]?";
    log.push({id:"minimal", from:[text], to:[out], extra:""}); log.push({id:"contempt", from:[(text.match(/[🙄😒]/)||[""])[0]], to:[], extra:""});
    return finish(out, out, log, an, W, opts);
  }
  // a brush-off on its own, or a few curt pieces in a row ("fine. whatever", "Fine. Whatever works for you.",
  // "Sure. Do what you want.", "i don't care"): say which one you mean
  if(CURT_ONLY.test(text) && /whatev|care\b|do what you want|if you say so|suit yourself|your call/i.test(text)){
    const out = /care/i.test(text)
      ? "[If you don't mind either way:] Either is fine with me. [If you're upset:] I'm too upset to decide this well right now. Can we come back to it at [a time]?"
      : "[If it's really okay:] Okay, that works for me. [If it isn't:] I'm not ready to talk about this well right now. Can we come back to it at [a time]?";
    log.push({id:"brushoff", from:[text], to:["say which one you mean"], extra:""});
    return finish(out, out, log, an, W, opts);
  }
  if(has("minimal") && MINIMAL_FIX[low]){
    const out = MINIMAL_FIX[low];
    log.push({id:"minimal", from:[text], to:[out], extra:""});
    return finish(out, out, log, an, W, opts);
  }

  // a threat that would frighten or control: no rewrite keeps it. What's left is the feeling and the need, or a break
  if(an.danger){
    log.push({id:"menace", from:[(an.found.menace||[""])[0]], to:[], extra:""});
    const need = "I'm really upset right now. I feel [one feeling word] when [what happened], and what I need is [one thing]. I'd like us to talk about it when we're both calm.";
    const pause = "I'm too angry to talk well right now. I'm going to take a break, and come back to this at [a time].";
    const variants = [{id:"main", label:"Say what you need, without a threat", why:"No threat, no condition: your feeling and your need, in your own words.", text:need},
      {id:"pause", label:"Take a break first", why:"If you're too angry to say it calmly, a break is the safest thing you can send.", text:pause}];
    return {main:need, primary:variants[0], variants, changes:log.map(c=>explainChange(c, W)), ask:null, list:"", unchanged:false, danger:true};
  }
  // whole-message shapes testers met most ("I managed fine without you", "stop policing what I spend",
  // "you can't just turn up whenever you want"): the jab goes, the real ask stays
  { const rf = reframeOf(an, opts);
    if(rf){
      log.push({id:"rf_"+rf.r.id, from:[rf.m[0].replace(/^[.!?\s]+|[.!?\s]+$/g,"")], to:[rf.send], extra:""});
      ["motive","absolute","again","shout","hedge","softno","intens","minim"].forEach(id=>{ if(an.found[id] && id!=="shout") log.push({id, from:(an.found[id]||[]).filter(Boolean).slice(0,2), to:[], extra:""}); });
      return finish(rf.send, "", log, an, W, Object.assign({}, opts, {reframed:true}));
    } }

  // whole-text clean-ups
  // "on purpose" guesses at their reasons: it goes
  if(has("motive")) text = text.replace(/\s*,?\s*\b(?:on purpose|deliberately|intentionally|just to (?:annoy|spite|hurt|upset|punish|wind up|get at) (?:me|us)|to spite me|to get back at me|to punish me)\b/gi, mm=>{ note("motive", mm.trim().replace(/^,\s*/,""), ""); return ""; }).replace(/\s+([.,!?])/g,"$1");
  // "Can your boyfriend maybe not…": "maybe" in a request makes it sound optional
  if(has("softno")) text = text.replace(/\b((?:can|could|would|will) (?:you|u|your \w+)\b[^.?!]{0,30}?)\s+\b(?:maybe|perhaps)\b\s*/gi, (mm,a)=>{ note("reqmaybe","maybe",""); return a+" "; });
  if(an.allCaps){
    const before = text;
    text = text.toLowerCase().replace(/(^|[.!?]\s+)([a-z])/g, (m,a,c)=>a+c.toUpperCase()).replace(/\bi\b/g,"I");
    if(!/[.!?]\s*$/.test(text)) text += /^(?:why|what|where|who|how|when|is|are|do|does|did|can|could|will|would)\b/i.test(text) ? "?" : ".";
    if(before!==text) note("caps", before.slice(0,40), "");
  }
  if(has("shout")){
    const before=text;
    const sp = shoutSpans(text);
    for(let i=sp.length-1;i>=0;i--) text = text.slice(0,sp[i].s)+sp[i].w.toLowerCase()+text.slice(sp[i].e);
    text = text.replace(/([!?])[!?]+/g,"$1");
    if(before!==text) note("caps", sp.map(x=>x.w).concat(before.match(/[!?]{2,}/g)||[]).slice(0,3).join(" "), "");
  }
  if(/\.{3,}|…/.test(text)){ text = text.replace(/\s*(?:\.{3,}|…)\s*/g,". "); note("dots","…","."); }

  // "Sorry I was distracted, but you didn't have to say it like that": the apology stays whole, and what stung
  // about their words is said separately, as a feeling, for later
  let laterLine = "", cut = "";
  if(has("sorrybut")){
    text = text.replace(BUT_YOU, (mm)=>{
      if(laterLine) return mm;
      cut = mm;
      const said = /\b(?:say|said|saying|speak|spoke|talk(?:ed)? to me|tone|like that|way you|yell|snap|shout)/i.test(mm);
      laterLine = said ? "Separately, the way you said it stung a little. Can we talk about that later?" : "Separately, there's something that bothered me too. Can we talk about that later, when we're both calm?";
      return "";
    });
    if(laterLine){ text = text.replace(/[\s,;:–—-]+$/,"").replace(/[\s,;:–—-]+([.!?])/g,"$1"); note("sorrybut", cut.trim().replace(/^[,;:–—-\s]+|[.!?\s]+$/g,""), laterLine); }
  }
  const isApology = /^\W*(?:(?:oh no|oh|oops|ugh)[\s,!.]+)?(?:(?:i'm|i am|so|really|very)\s+)*sorry\b|^\W*(?:i apologi[sz]e|my bad|my fault|my mistake|i messed up)\b/i.test(text) || (an.apology && has("sorrybut"));
  if(isApology) text = text.replace(/^\W*(?:(?:i'm |i am )?(?:so |really )?sorry[\s,!.]*){2,}/i, mm=>{ note("apology", mm.trim().replace(/[,.!\s]+$/,""), "I'm sorry"); return "I'm sorry, "; });
  const out = [];
  const ctx = {converted:false, critical:false, hostile:false, insult:false, noAsk:false, apology:isApology, rel:opts.rel||""};
  // swearing, fed-up lines and name-calling come out first; what's left (a fact, an ask) is rewritten as usual
  let sents = splitSentences(text).map(x=>calmSentence(x.text, ctx, note)).filter(Boolean);
  // "Wow. Amazing." after a sarcastic line is more sarcasm: it goes, the point stays
  if(has("sarcasm")||has("contempt")) sents = sents.filter(x=>{ if(sents.length>1 && /^(?:oh,?\s*)?(?:wow|amazing|great|perfect|wonderful|fantastic|brilliant|awesome|lovely|nice|super|terrific|marvelous|splendid|classic|typical|figures|shocker|bravo|just great|just perfect)(?:\s+(?:job|work|one))?[\s.!…🙄😒🙃]*$/i.test(x.trim())){ note("sarcasm", x.trim().replace(/[.!…\s]+$/,""), ""); return false; } return true; });
  ctx.nSents = sents.length;
  const pairs = [];
  ctx.safety = an.safety;
  sents.forEach(s0=>{
    let r = rewriteSentence(s0, ctx, note, an, W);
    // a quick self-check: a rewrite that a second-language reader could copy as broken English is
    // replaced with a plain blank for their own words, never sent out half-formed
    // a question never gets wrapped in "could you": when that's all the rewrite could do, the question stays as typed
    if(r && brokenEnglish(r) && (AUX_Q.test(s0.replace(/^(?:(?:ok(?:ay)?|so|hey|well|um|and|but)[\s,]+)+/i,"")) || /\?\s*$/.test(s0))){ r = s0; }
    else if(r && brokenEnglish(r)){ note("plain", s0.replace(/[.!?]+$/,""), "[a plain blank]"); r = ctx.critical || an.staticIds.length ? "[One recent time this happened] was hard for me." : "[Say this part plainly, in your own words.]"; }
    pairs.push([s0, r]); if(r) out.push(r);
  });
  let main = out.join(" ");
  // court, custody, or the children told first: the threat is gone; say the worry, and keep the children out of it
  if(ctx.legal || ctx.kids){
    if(!/[A-Za-z]/.test(main.replace(/\[[^\]]*\]/g,""))) main = ctx.kids ? "[What's changed, plainly.]" : "I'm really worried about [the specific thing].";
    if(ctx.kids) main = endP(main)+" I'd like us to agree together on what we tell the kids, before either of us says more.";
    if(!/\?/.test(main) && (ctx.kids || !ctx.keptAsk)) main = endP(main)+" Can we talk about "+(ctx.keptAsk && ctx.kids ? "what the kids hear" : "it")+" at [a time]?";
  }
  // say the feeling once, plainly, instead of the heat: "I'm really frustrated right now."
  if(!/[A-Za-z\[]/.test(main)) main = "";  // only punctuation was left
  if(ctx.swore && !ctx.hostile && !ctx.insult && main.trim() && !/\b(?:could you|would you|can you|can we|could we|will you)\b/i.test(main)) main = "I'm frustrated. "+main;
  if(ctx.hostile || ctx.insult){
    const hasAsk = /\b(?:could you|would you|can you|can we|could we|will you)\b/i.test(main);
    const lead = ctx.hostile ? "I'm really frustrated right now." : (ctx.swore || has("swear")) ? "I'm frustrated about [what happened]." : "";
    if(!main.trim()) main = ctx.hostile ? lead+" I need a few minutes, and then can we talk about [the thing]?" : (lead || "[Say what happened, plainly.]")+" Could you [one specific thing] by [a time]?";
    else if(lead && hasAsk) main = lead+" "+main;
    else main = lead+" "+main.replace(/\s*$/,"")+" Can we talk about it at [a time], once I've had a few minutes?";
  }

  // at work: the fact, what it affected, and one request. No "guys", no count of misses, no "sort it out"
  const work = !!(opts.work || WORK_REL.includes(opts.rel));
  if(work && main.trim() && !ctx.legal && !ctx.kids){
    main = workReframe(main, an, note, ctx);
    // the vague order became one owner by one day: the older "Could you…?" note no longer describes the rewrite
    if(log.some(c=>c.id==="workask")) for(let i=log.length-1;i>=0;i--) if(log[i].id==="impera" && (an.found.impera||[]).length<=1) log.splice(i,1);
  }
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
    const re = /\b(Could you|Can you|Would you|Will you|Can we|Could we) (?!stop|not|be |talk|listen|say|repeat|explain|[^?]*\b(?:when|if|whenever|next time)\b|understand|know|remember|look|keep|calm|relax|tell me|let me|[^?]*\b(?:rather than|instead)\b)([^?]+)\?/i;
    if(re.test(main)){ main = main.replace(re, (m,a,b)=>a+" "+b.replace(/\s+$/,"")+" by [a time]?"); note("addwhen","(no time)","by [a time]"); }
  }
  // "no rush" stays kind once there is a real time to be in no rush about: it moves after the time
  if(an.found.vtime && /\[a time\]/.test(main) && /\bno rush\b/i.test(main)){
    main = main.replace(/\s*\bno rush\b\s*(?:before then)?[,.!]*\s*(?:but\s+|and\s+)?/i, " ").replace(/^\s+/,"");
    main = main.replace(/(\[a time\][^.!?\]]*[.!?])/, "$1 No rush before then.");
  }
  // an apology with an excuse ("You know how I am"), or for a thing forgotten: what I did, that it's on me, and
  // what I'll do. The plan is a blank to make true, never a promise sent for them.
  if(ctx.apology && (ctx.excused || /\b(?:forgot|forget)\b/i.test(main) && log.some(c=>c.id!=="apology")) && !/\[What you'll do/.test(main)){
    main = main.replace(/^(\W*(?:i'm |i am )?(?:so |really )?sorry),\s+(?=i\b)/i, "$1 ").replace(/\b(I) (forgot|forget)(?=\s*(?:[.!?,]|$))/i, "$1 $2 [the thing]");
    // "That's on me" and the plan go right after the apology, before anything else (a question stays last)
    const ss = splitSentences(main).map(x=>x.text.trim()).filter(Boolean);
    const at = Math.max(0, ss.findIndex(x=>/\b(?:sorry|apologi[sz]e|my bad)\b/i.test(x)));
    const add = [];
    if(!/\b(?:that's on me|my fault|my bad|my mistake|i messed up|that was on me)\b/i.test(main)) add.push("That's on me.");
    if(!/\b(?:i'll|i will|i've set|i have set|i'm going to|i am going to|next time|from now on|going forward)\b/i.test(main)){ add.push("[I've set a reminder] so it doesn't happen next time."); note("apology","","[I've set a reminder] so it doesn't happen next time"); }
    if(add.length){ ss[at] = endP(ss[at]); ss.splice(at+1, 0, ...add); main = ss.join(" "); }
  }
  // the excuse on its own, with no apology ("I can't help it, I'm wired that way"): say it's hard, and share the fix
  if(ctx.excused && !ctx.apology && !/[A-Za-z]/.test(main.replace(/\[[^\]]*\]/g,""))){
    main = "This part is hard for me. Could we find [one thing that would help, like a shared reminder]?"; ctx.noAsk = true;
  } else if(ctx.excused && !ctx.apology && !/\b(?:could you|would you|can you|can we|could we|will you)\b/i.test(main)){
    main = endP(main.replace(/\s+$/,""))+" This part is hard for me. Could we find [one thing that would help, like a shared reminder]?"; ctx.noAsk = true;
  }
  // an apology after a miss: a place to say what you'll do about it, never a demand
  if(ctx.apology && log.some(c=>c.id!=="apology") && /\b(?:forgot|forget|missed|late|broke|lost|didn't|messed up|dropped)\b/i.test(main) && !/\[What you'll do|so it doesn't happen next time/.test(main)){
    main = endP(main.replace(/\s+$/,""))+" [What you'll do to put it right, if there's something, like \"I'll set a reminder.\"]";
    note("apology","","[what you'll do to put it right]");
  }
  // add an ask when there was only a complaint (never to an apology, a question, or a line that already says what it needs)
  const typedQ = /\?\s*$/.test(an.norm.trim());
  // a safety worry: say it's a real worry, keep the fact, and ask for a habit, not a deadline
  if(an.safety && !SAFE_HABIT_RE.test(an.norm)){
    const th = an.safety.thing.replace(/^(?:hair )/,"");
    const plural = /(?:s|meds|knives|matches|pills)$/.test(th) && !/^(?:gas|glass)$/.test(th);
    const kind = /stove|oven|hob|burner|gas|iron|straightener|heater|fireplace|grill|bbq/.test(th) ? ["turned off", "Maybe a note where we'll see it, or a quick check of the "+th+" before we head out?"]
      : /candle/.test(th) ? ["blown out", "Maybe a quick check before bed?"]
      : /door|garage|car$/.test(th) ? ["locked", "A note by the door?"]
      : /gate/.test(th) ? ["closed", "Maybe a sign on the gate?"]
      : /seat|belt/.test(th) ? ["buckled and checked", "Maybe we both check the straps before we pull out?"]
      : /medic|meds|pills|bleach|knife|knives|lighter|matches/.test(th) ? ["put away up high", "Maybe a locked box, or one high shelf just for "+(/(?:s|meds|knives|matches|pills)$/.test(th)?"them":"it")+"?"]
      : ["turned off", "Maybe a timer, or a note where we'll see it?"];
    const verb = /seat|belt/.test(th) ? "the "+th+(plural?" get ":" gets ")+kind[0] : "the "+th+(plural?" get ":" gets ")+kind[0];
    // a listener who is sensitive to criticism (ADHD, highly sensitive, trauma-wired): "again" lands on the whole
    // history, so the fact is said once, about today, with no "you" and no "again"; the worry stays plain
    if(opts.critSensitive || CRIT_SENSITIVE.some(w=>W.has(w))){
      const ss = splitSentences(main).map(x=>x.text);
      let did = false;
      for(let i=0;i<ss.length && !did;i++){
        const nf = neutralSafety(ss[i], an.safety);
        if(nf){ const from = ss[i].replace(/^\s*i (?:noticed|saw|see)(?: that)?\s+/i,"").replace(/[.!?]+$/,""); if(from.toLowerCase()!==nf.replace(/[.!?]+$/,"").toLowerCase()) note("safefact", capFirst(from), nf.replace(/[.!?]+$/,"")); ss[i] = nf; did = true; }
      }
      main = ss.join(" ");
      // "I noticed you…" was replaced by the plain fact: don't list a change the rewrite no longer makes
      if(did && !/\bI noticed\b/.test(main)) for(let i=log.length-1;i>=0;i--) if(log[i].id==="noticed" || (log[i].id==="passive" && log[i].to.some(x=>/I noticed/.test(x)))) log.splice(i,1);
      main = main.replace(/,?\s*\b(?:yet again|once again|all over again|again)\b(?=[\s.,!?]|$)/gi, mm=>{ note("again","again",""); return ""; }).replace(/\s+([.,!?])/g,"$1");
      // no word for the danger in the message: say the feeling in the same breath, as in "and that scares me"
      if(did && !/\b(?:dangerous|unsafe|not safe|scar(?:y|ed|es)|worr(?:y|ied|ies)|hazard|could have|someone could)\b/i.test(main))
        main = main.replace(/^([^.!?]+)[.!?]/, (mm,a)=>a+", and that scares me.");
    }
    if(!/\b(?:dangerous|unsafe|not safe|scar(?:y|ed|es)|worr(?:y|ied|ies)|hazard|could have|someone could)\b/i.test(main)) main = endP(main)+" That's a real safety worry for me.";
    else if(!/\bworr/i.test(main)) main = main.replace(/\b(that's|that is|it's|it is) (dangerous|unsafe|not safe)([.!]*)/i, (mm,a,b)=>a+" "+b+", and it worries me.");
    main = endP(main)+" Can we find a way to make sure "+verb+" every time? "+kind[1];
    note("safety", an.safety.text, "a habit that keeps it safe");
    ctx.noAsk = true;
  }
  const hadTime = WHEN_REAL.test(an.norm);
  // "I can't keep doing most of Dad's care on my own": the ask is one share of the load, for each of them
  const plural = ctx.plural || opts.channel==="group" || /\byou (?:two|both|all|guys|lot|three)\b|\b(?:both|all|the two) of you\b|\beveryone\b|\by'all\b/i.test(an.norm);
  const careCtx = /\b(?:dad|mom|mum|mother|father|grandma|grandpa|gran|nan|nana|granny|parents|grandparents|care|carer|caring|appointments?|meds|medication)\b/i.test(an.norm);
  const loadAsk = careCtx ? "Could you"+(plural?" each":"")+" take one thing, like [Thursday's appointment] or [the Sunday call]?" : "Could you"+(plural?" each":"")+" take on [one specific thing] by [a time]?";
  main = main.replace(/\bmost of the (?:work|care|caring|looking after) for (dad|mom|mum|mother|father|grandma|grandpa|gran|nan|nana|granny|(?:my|our) (?:dad|mom|mum|mother|father|grandma|grandpa|gran|nan|parents|grandparents))\b/gi, (mm,who)=>"most of "+who+(/s$/i.test(who)?"'":"'s")+" care");
  if((ctx.loadAsk || (plural && careCtx)) && /\bCould you take \[one (?:task|specific thing)\](?: by \[a time\])?\?/.test(main)){ main = main.replace(/\bCould you take \[one (?:task|specific thing)\](?: by \[a time\])?\?/, loadAsk); }
  else if(ctx.loadAsk && !ctx.noAsk && !ctx.apology && !/\b(?:could you|would you|can you|can we|could we|will you)\b/i.test(main)){
    main = main.replace(/([^.!?…\s])\s*$/,"$1.").replace(/\s*$/," "+loadAsk);
    note("addask","(no ask)",loadAsk);
  }
  if(!ctx.noAsk && !ctx.apology && !typedQ && !/\b(?:could you|would you|can you|can we|could we|could someone|would that work|will you|would you be|did you get a chance|did you mean|do you have|want to)\b/i.test(main) && (ctx.critical || an.missing.ask)){
    // a pattern ("always", "never") wants a habit, not a deadline; a time already given stays the only time
    const pattern = log.some(c=>c.id==="absolute");
    const tail = pattern ? " going forward" : hadTime ? "" : " by [a time]";
    // when the message already says what it's about ("correcting me with the baby"), the ask can say it too
    const inferred = inferAsk(an.norm);
    // at work, after a miss said as a fact: one owner, by one day
    const ask = (opts.work || WORK_REL.includes(opts.rel)) && log.some(c=>c.id==="impact") ? "Could we agree one owner for it by [a day]?" : inferred || "Could you "+ASK_PROMPT+tail+"?";
    main = main.replace(/([^.!?…\s])\s*$/,"$1.").replace(/\s*$/," "+ask);
    note("addask","(no ask)",ask);
  }
  // the draft already names a time ("by Friday", "tomorrow"): never add a second, blank one
  if(hadTime && /\bby \[a time\]/.test(main) && WHEN_REAL.test(main)) main = main.replace(/\s*\bby \[a time\]/g, "");
  // a leftover "even" ("did you even look", "could you even rinse") keeps the jab, so it goes
  if(/\b(?:you|did you|could you|can you|didn't|don't|can't|couldn't|won't|not) even\b/i.test(main)){
    main = main.replace(/\b(did|do) you even (\w+)/gi, (mm,d,v)=>{ note("again","even",""); return (/^D/.test(mm)?"D":"d")+(d.toLowerCase()==="did"?"id you get a chance to ":"o you get a chance to ")+v; })
               .replace(/\b(you|could you|can you|didn't|don't|can't|couldn't|won't|not) even\b/gi, (mm,w)=>{ note("again","even",""); return w; });
  }
  // an absolute that slipped through a rewrite ("always", "never") becomes "often" / "rarely"
  if(has("absolute") && /\b(?:always|never)\b/i.test(main)){
    main = main.replace(/\b(?<!(?:'ll|will|would|'d|won't|can't|could) )(always|never)\b/gi, (w)=>{ note("absolute", w.toLowerCase(), /always/i.test(w)?"often":"rarely"); return /^A/.test(w)?"Often":/^N/.test(w)?"Rarely":/always/i.test(w)?"often":"rarely"; });
  }
  if(laterLine) main = endP(main.replace(/\s+$/,""))+" "+laterLine;
  // co-parents: brief and factual (the child's need, the ask, a time). No feelings about each other, no "let's talk about it"
  if(opts.rel==="coparent"){
    const before = main;
    main = main.replace(/\s*I'm not feeling cared about right now, and I'd like to talk about it\./g,"").replace(/\s*I'd like to hear how it looks to you, too\./g,"").replace(/,? and I'd like to talk about it\./g,".").replace(/^\s+/,"");
    if(main!==before) note("coparent","feelings about each other","");
    if(!/[A-Za-z]/.test(main.replace(/\[[^\]]*\]/g,""))) main = "[What the kids need, plainly.]";
    if(main!==before && !/\b(?:could you|would you|can you|can we|could we|will you|please)\b/i.test(main)) main = endP(main)+" Please [what the kids need] by [the day].";
  }
  main = tidy(main);
  if(list) list = list.split("\n").map((l,i)=>i?l:tidy(l)).join("\n");
  // nothing changed: give the words back exactly as typed ("hey" stays "hey", not "Hey.")
  if(!log.length && !list) main = an.norm.trim();
  return finish(main, list, log, an, W, opts);
}

/* The ask, when a complaint says plainly what it's about. Otherwise the rewrite uses a plain-language prompt. */
const ASK_PROMPT = "(say the one thing you'd like)";
const KID_RE = /\b(?:baby|babies|kids?|children|child|son|daughter|toddler|newborn|bedtime|feeding|feeds|nap|naps|nappy|nappies|diaper|diapers|bath|bathtime|bottle|parenting)\b/i;
const INFER_ASKS = [
  [/\b(?:correct\w*|criticiz\w*|criticis\w*|second[- ]guess\w*|undermin\w*|overrul\w*|nitpick\w*)\s+me\b|\btell(?:s|ing)? me how to\b/i, KID_RE, "Could you let me handle it my way, and tell me later if you disagree?"],
  [/\binterrupt\w*\s+me\b|\bcut(?:s|ting)? me off\b|\btalk(?:s|ing)? over me\b/i, null, "Could you let me finish before you answer?"],
  [/\b(?:correct\w*|criticiz\w*|criticis\w*)\s+me\b[^.!?]*\bin front of\b|\bin front of\b[^.!?]*\b(?:correct\w*|criticiz\w*|criticis\w*)\s+me\b/i, null, "If something I do bothers you, could you tell me later, just the two of us?"],
  [/\bon your phone\b|\bscrolling\b/i, null, "Could we put our phones away when we're talking?"]
];
function inferAsk(text){
  const t = String(text||"");
  for(const [re, need, ask] of INFER_ASKS){ if(re.test(t) && (!need || need.test(t))) return ask; }
  return "";
}

/* Swearing, fed-up lines and name-calling, clause by clause. A clause that is only heat ("you're getting
   on my last nerve", "you idiot", "I'm the only adult here") goes; swear words inside a clause that carries
   a real point ("can you f*cking clean the kitchen") go, and the point stays. Returns the calmer sentence. */
function sharedRe(id){ return SHARED && SHARED.BY && SHARED.BY[id] && SHARED.BY[id].re ? new RegExp(SHARED.BY[id].re.source, "i") : null; }
function calmSentence(s0, ctx, note){
  const HOST = sharedRe("hostile"), INS = sharedRe("label"), SW = SHARED && SHARED.BY && SHARED.BY.swear ? new RegExp(SHARED.BY.swear.re.source, "gi") : null;
  const low = x=>x.toLowerCase().replace(/[’‘]/g,"'");
  if(!HOST && !SW) return s0;
  const end = (s0.match(/[.!?]+["')\]]*\s*$/)||[""])[0].replace(/\s+$/,"");
  const body = s0.slice(0, s0.length - (s0.match(/[.!?]+["')\]]*\s*$/)||[""])[0].length);
  const parts = body.split(/\s*(?:[,;:]|\s[-–—]\s)\s*/);
  const kept = [];
  let changed = false;
  // the heat taken out of a clause; what's left stays if it still says something ("you don't do the dishes")
  const rest = (c, rx)=>{
    const m = low(c).match(rx); if(!m) return c;
    const r = (c.slice(0, m.index) + " " + c.slice(m.index + m[0].length)).replace(/\s+/g," ").trim()
      .replace(/^(?:and|but|so|or|because|and then)\s+/i,"").replace(/\s+(?:and|but|so|or|because)$/i,"").trim();
    return (r.match(/[A-Za-z']+/g)||[]).length >= 3 ? r : "";
  };
  parts.forEach(c=>{
    if(!c.trim()) return;
    if(HOST && HOST.test(low(c))){
      note("hostile", (low(c).match(HOST)||[c])[0].trim(), "I'm really frustrated right now."); ctx.hostile = true; changed = true;
      c = rest(c, HOST); if(!c) return;
    }
    const LBL = new RegExp(FBY.label.re.source, "i");
    if(INS && INS.test(low(c)) || LBL.test(c) && /\byou(?:'re| are| were)?\b|\bi'm the only\b/i.test(c) && !/\b(?:could|can|would|will) you\b/i.test(c) && !/\b(?:too|so) (?:sensitive|emotional)\b|\bdramatic\b/i.test(c)){
      note("insult", c.trim(), ""); ctx.insult = true; changed = true;
      c = rest(c, INS && INS.test(low(c)) ? INS : LBL); if(!c) return;
    }
    let t = c; const t0 = c.trim();
    if(SW){
      t = t.replace(/\b(your|my|his|her|their|this|that|the|our) (?:shit|crap|junk|sh\*t)\b/gi, (m,a)=>{ note("swear", m.split(" ")[1], ""); return a+" things"; })
           .replace(/\bwtf\b/gi, "what").replace(/\bthe (?:f[*]+\w*|fu?c?k\w*|f[*]?ck\w*|hell|heck)(?=\W|$)\s*/gi, m=>{ note("swear", m.trim(), ""); return ""; })
           .replace(SW, m=>{ note("swear", m, ""); return ""; }).replace(/\s{2,}/g," ").trim();
      if(t !== c.trim()){ changed = true; ctx.swore = true; }
      // "this is bullshit", "that's crap": the swear was the whole point, so the clause is heat
      if(t !== t0.trim() && ((t.match(/[A-Za-z']+/g)||[]).length < 3 || /\b(?:is|are|was|were|'s|'re)\s*(?:and\b.*)?$/i.test(t))){ ctx.hostile = true; return; }
    }
    // what's left of a swear-only clause ("f*ck this", "ffs") is heat, not content
    if(t !== t0 && (!t || /^(?:this|that|it|you|off|up|me|oh|well|so|man|seriously|god|jesus|all|now|again|ugh)?[\s!?.]*$/i.test(t))){ ctx.hostile = true; changed = true; return; }
    kept.push(t);
  });
  if(!changed) return s0;
  if(!kept.length) return "";
  return capFirst(kept.join(", ")) + (end || ".");
}

function ingBase(w){ const l=w.toLowerCase().replace(/ing$/,""); if(/([^aeiouls])\1$/.test(l)) return l.slice(0,-1); if(VERBSET.has(l)) return l; if(VERBSET.has(l+"e")) return l+"e"; return l; }
function rewriteSentence(s, ctx, note, an, W){
  let t = s.trim(), m;
  // "Can you read the room?": say what you noticed and what you'd like, not a figure of speech with a deadline
  if(/^(?:(?:hey|so|ok(?:ay)?),?\s+)?(?:can|could) you (?:please |just |maybe )?(?:try to )?read the room\b[^.!?]*[?.!]*$/i.test(t)){
    const rep = "[Say what you noticed, like \"Sam seems tired.\"] Could we [what you'd like instead, like \"wrap this up\"]?";
    note("idiom", "read the room", "what you noticed, and what you'd like"); ctx.noAsk = true; return rep;
  }
  // "I'm going to kill you if you're late": the true size of it
  m = t.match(/^(.*?)\b(?:i'm (?:going to|gonna|about to)|i am (?:going to|gonna)|i'll|i will|i could) (?:kill|murder|strangle) (?:you|him|her|them)\b\s*(.*?)([.!?]*)$/i);
  if(m){
    const lead = (m[1]||"").replace(/[,\s]+$/,""), rest = m[2].replace(/\s*\b(?:yet again|again|one more time)\b/gi,"").replace(/[,\s]+$/,"").trim();
    let rep;
    if(/^if (?:you're|you are|you (?:show up|come|get here|turn up)) late\b/i.test(rest)) rep = "It really matters to me that you're on time. Could you text me if you're running late?";
    else if(/^if\b/i.test(rest)) rep = "I'll be really upset "+rest+". It matters to me.";
    else rep = "I'm really upset with you right now.";
    note("violent", (t.match(/\b(?:i'm (?:going to|gonna|about to)|i am (?:going to|gonna)|i'll|i will|i could) (?:kill|murder|strangle) (?:you|him|her|them)\b/i)||[""])[0], rep);
    ctx.noAsk = true;
    return (lead && !FILLER_ONLY.test(lead) ? endP(capFirst(lead))+" " : "")+rep;
  }
  // "Can you stop stimming?": a stim isn't a message
  if(/\bstop (?:stimming|flapping|rocking|humming)\b/i.test(t)){
    const rep = "[Stimming helps many people stay steady, so asking them to stop can take that away. If the place is the problem, you could ask:] Would it help to move somewhere quieter, or take a break?";
    note("tic", (t.match(/\bstop \w+/i)||[""])[0], "an offer instead"); ctx.noAsk = true; return rep;
  }
  // "Sure, whatever you say, genius.": the mocking name goes
  if(an.found.sarcasm || an.found.contempt) t = t.replace(/,\s*(?:genius|einstein|sherlock|smart guy|smarty ?pants)\b/gi, mm=>{ note("contempt", mm.replace(/^,\s*/,""), ""); return ""; });
  // "I'm so stupid": the self put-down goes, what happened stays
  t = t.replace(/(^|[,;]\s*|\s(?:and|but|so)\s+)i(?:'m| am) (?:so |such an? |a |an |really |just |the |an absolute |a total |a complete |literally )*(?:stupid|an idiot|idiot|dumb|useless|hopeless|pathetic|worthless|a failure|failure|the worst|a terrible person|an awful person|a bad person|a mess|garbage|trash)\b[,.!]?\s*/gi, (mm,p)=>{ note("selfput", mm.trim().replace(/^[,;]\s*|[,.!]$/g,"").replace(/^(?:and|but|so)\s+/i,""), ""); return /[,;]/.test(p) ? ", " : p ? " " : ""; }).trim();
  if(!t.replace(/[.!?,\s]/g,"")) return "";
  // court, custody or "I already told the kids": very likely to escalate, so it never stays in the rewrite.
  // A wish under the threat ("if you don't X") stays as a plain ask; anything else in the sentence stays too.
  if(LEGAL_RE.test(t) || KIDS_RE.test(t)){
    const isKids = KIDS_RE.test(t) && !LEGAL_RE.test(t);
    const hit = (t.match(LEGAL_RE)||t.match(KIDS_RE))[0];
    let rep = "";
    const cond = t.match(/^(.*?)\bif you (?:don't|do not|won't|refuse to) (.+?),?\s*(?:then\s+)?(?:i'll|i will|i'm going to|i am going to|i'm gonna|my (?:lawyer|attorney)|you'll|you will)\b.*$/i);
    // "If you're late again, I'll take you to court": the threat goes, the logistics stay as a plain ask
    const lateM = !cond && t.match(/^(.*?)\bif you(?:'re| are| show up| turn up| come| get here| bring (?:her|him|them|the kids) back| drop (?:her|him|them|the kids) off)?\b[^.!?,]{0,25}?\blate\b/i);
    const missM = !cond && !lateM && t.match(/^(.*?)\bif you (?:miss|skip|cancel|forget)\b/i);
    const kidsCtx = ctx.rel==="coparent" || /\b(?:pick ?up|drop ?off|handover|hand-off|the kids|the children|visit|custody|weekend)\b/i.test(an.norm);
    if(lateM && !LEGAL_RE.test(lateM[1]||"")) rep = (lateM[1] && !FILLER_ONLY.test(lateM[1].replace(/[,\s]+$/,"")) ? endP(capFirst(lateM[1].replace(/[,\s]+$/,"")))+" " : "")+(kidsCtx ? "Pickup is at [the time]. If you'll be late, please text me by [a time]." : "If you'll be late, please text me by [a time].");
    else if(missM && !LEGAL_RE.test(missM[1]||"")) rep = (kidsCtx ? "The next pickup is [the day and time]. " : "")+"If you can't make it, please tell me by [a time].";
    if(rep){ ctx.keptAsk = true; }
    else if(cond && !LEGAL_RE.test(cond[2]) && words(cond[2])>=2) rep = (cond[1] && !FILLER_ONLY.test(cond[1].replace(/[,\s]+$/,"")) ? endP(capFirst(cond[1].replace(/[,\s]+$/,"")))+" " : "")+"Could you "+cond[2].replace(/[,\s]+$/,"")+"? It matters a lot to me.";
    else if(!/^\s*if you\b/i.test(t)){
      // keep the clauses that carry no threat ("Pickup is at 5, or I'll take you to court" keeps "Pickup is at 5")
      const kept = t.replace(/[.!?]+$/,"").split(/\s*(?:,|;|\s[-–—]\s|\.\s)\s*|\s+(?:and|or|so|because)\s+(?=(?:i|you|my|the|we|they)\b)/i)
        .filter(c=>c && !LEGAL_RE.test(c) && !KIDS_RE.test(c) && !/^(?:or else|otherwise|then)$/i.test(c.trim()) && words(c)>=3);
      if(kept.length) rep = endP(capFirst(kept.join(", ")));
    }
    note(isKids ? "kidsfirst" : "legal", hit.replace(/[.!?,\s]+$/,""), "");
    if(isKids) ctx.kids = true; else ctx.legal = true;
    ctx.noAsk = true;
    return rep;
  }
  // "Sure, go out with your friends, I'll just sit here", "Don't mind me": hurt underneath, said sideways.
  // Never a request, and never a deadline: say the hurt plainly, and ask for time together
  m = t.match(/^(?:(?:sure|fine|ok(?:ay)?|yeah)\s*[,.]?\s+)?(?:(go ahead|go|have fun|enjoy)\b([^.!?]*?))?\s*[,;]?\s*(?:and\s+)?(?:i(?:'ll| will) just (?:sit|stay|wait|be) (?:here|at home|home|alone|by myself)(?: alone| by myself| then)?|don't mind me|have fun without me|i guess i(?:'ll| will) just (?:sit|stay|wait|be)(?: \w+)?)[\s.!…🙄😒🙃]*$/i);
  if(m){
    const act = m[1] ? (m[1]+m[2]).replace(/[,\s]+$/,"").trim() : "";
    const yes = !act || /^go ahead$/i.test(act) ? "" : /^go\b/i.test(act) ? "It's okay for you to "+act+". " : "I hope you have a good time. ";
    const rep = yes+"I'm feeling a bit left out"+(yes?", though":"")+". Could we plan some time together, like [a day]?";
    note("sarcasm", t.replace(/[.!?…]+$/,""), "the hurt underneath, said plainly"); ctx.noAsk = true; ctx.hurt = true;
    return rep;
  }
  // "Could you maybe possibly think about perhaps doing the dishes": one ask, one softener
  if(an.found.overhedge && /^(?:(?:hey|so|um),?\s+)?(?:could|would|can|will) you\b/i.test(t)){
    const before = t;
    t = t.replace(/\bi was wondering if\s*/i,"").replace(/\b(?:maybe|possibly|perhaps|kind of|sort of)\b,?\s*/gi,"").replace(/\bthink about (\w+ing)\b/i,(mm,v)=>ingBase(v)).replace(/\s{2,}/g," ");
    if(t!==before) note("overhedge", "maybe, possibly, perhaps", "one softener");
  }
  // "We should get coffee sometime": an invitation with a day to fill in
  m = t.match(/^(?:we should|we could|we gotta|let's|let us) (get|grab|have|go|do|see|catch|meet|hang out|play|try|watch)\b(.*?)\s*\b(?:sometime|some time|at some point|soon|one of these days)\b(.*?)([.!?]*)$/i);
  if(m){ const rep="Want to "+m[1].toLowerCase()+m[2].replace(/\s+$/,"")+" on [a day]"+m[3].replace(/\s+$/,"")+"?"; note("vtime", (t.match(/\b(?:sometime|some time|at some point|soon|one of these days)\b/i)||[""])[0], "on [a day]"); ctx.noAsk = true; return rep; }
  PLAIN_WORDS.forEach(([rx, plain])=>{ t = t.replace(rx, mm=>{ note("idiom", mm, plain); return /^[A-Z]/.test(mm) && !/^I\b/.test(plain) ? plain.charAt(0).toUpperCase()+plain.slice(1) : plain; }); });
  const orig = t;
  // "You know how I am", "I can't help it": the excuse goes. The apology says "That's on me" instead (see rewrite)
  {
    const EX = new RegExp(FBY.excuse.re.source, "i");
    if(EX.test(t)){
      const hit = (t.match(EX)||[""])[0];
      const left = t.replace(new RegExp("[,;:–—-]?\\s*(?:and |but |so )?(?:i mean,? |honestly,? )?(?:"+EX.source+")[^.!?]*", "gi"), "").replace(/^[\s,;:]+/,"").trim();
      note("excuse", hit, "That's on me.");
      ctx.excused = true; ctx.critical = true;
      if(!/[A-Za-z]/.test(left)) return "";
      t = /[.!?]$/.test(left) ? left : left+".";
    }
  }
  // "I'm done doing everything for Dad while you two do nothing": the door stays open and the load is said plainly.
  // "I'm done" (it sounds like walking away) and "you do nothing" (an absolute) never stay in the rewrite.
  {
    const DN = /[,;]?\s*\b(?:while|and|but|when|whereas|as)\s+(you(?: two| both| all| guys| lot| three)?|the two of you|both of you|all of you|y'all|everyone else|they|he|she)\s+(?:just\s+)?(?:do|does|did|are doing|sit (?:there|around)(?: and do)?)\s+(?:absolutely\s+)?(?:nothing|zero|sod all|jack(?: all)?)\b(?: (?:to help|at all))?/i;
    const dn = t.match(DN);
    if(dn){
      note("absolute", dn[0].replace(/^[,;\s]+/,"").replace(/^(?:while|and|but|when|whereas|as)\s+/i,""), "on my own");
      ctx.critical = true; ctx.soloLoad = true;
      if(/\b(?:two|both|all|guys|lot|three|y'all|everyone)\b/i.test(dn[1]) || /\b(?:both|two|all) of you\b/i.test(dn[0])) ctx.plural = true;
      t = t.replace(DN, "");
      if(/^\s*i\b/i.test(t) && !/\b(?:on my own|by myself|alone)\b/i.test(t)) t = t.replace(/\s*([.!?]*)\s*$/, " on my own$1");
    }
    const dm = t.match(/^(.*?)\bi(?:'m| am) (?:so |just |honestly |really |completely )?(?:done|finished|through) (doing|being|carrying|handling|covering|picking up|cleaning up after|looking after|taking care of|running|organi[sz]ing|sorting)\s+(.+?)([.!?]*)$/i);
    if(dm){
      let obj = dm[3].replace(/\s+(?:alone|by myself|on my own|all by myself)$/i,"");
      obj = obj.replace(/^(?:everything|it all|all of it|all the work)\b/i, "most of the work").replace(/^all (?:the )?/i,"most of the ");
      const lead = (dm[1]||"").replace(/[,\s]+$/,"");
      const rep = "I can't keep "+dm[2].toLowerCase()+" "+obj+" on my own.";
      note("doneload", (t.match(/\bi(?:'m| am) (?:so |just |honestly |really |completely )?(?:done|finished|through)\b/i)||["I'm done"])[0], "I can't keep … on my own");
      if(/^(?:everything|it all|all)\b/i.test(dm[3])) note("absolute", dm[3].split(/\s+/)[0].toLowerCase(), "most of the work");
      ctx.critical = true; ctx.loadAsk = true;
      return (lead && !FILLER_ONLY.test(lead) ? endP(capFirst(lead))+" " : "")+rep;
    }
    if(dn) ctx.loadAsk = true;
    // "It's always me who calls Mum": the load, said as how it's been lately
    const am = t.match(/^(.*?)\b(?:it's|it is|it's been|it has been) (?:always|only ever|never anyone but) me (?:who|that) (.+?)([.!?]*)$/i);
    if(am){
      const lead = (am[1]||"").replace(/[,\s]+$/,"");
      note("absolute", "always me", "lately, I've been the one");
      ctx.critical = true; ctx.loadAsk = true;
      return (lead && !FILLER_ONLY.test(lead) ? endP(capFirst(lead))+" " : "")+"Lately, I've been the one who "+am[2].replace(/\s+$/,"")+" most of the time.";
    }
  }
  m = t.match(/^(?:and |honestly,? )?i (?:have to|always|end up|got to|gotta|'m left to) (?:do(?:ing)?|clean(?:ing)?|handle|handling) everything(?: around here| at home| in this house| myself| alone)?[.!]*$/i);
  if(m){ const rep = "I'm feeling stretched thin. Could you take on [one specific thing] by [a time]?"; note("guilt", t.replace(/[.!?]+$/,""), rep); ctx.converted = true; return rep; }
  if(/^(?:of course (?:you|he|she|they) (?:did|didn't|do|don't|would|wouldn't|forgot|are|were|can't|won't)|classic you|typical(?: you)?|yeah,? sure|(?:great|nice|good) (?:job|work),?(?: (?:genius|einstein|really))?)[.!…🙄😒🙃\s]*$/i.test(t)){
    ctx.critical = true; ctx.sarcasmOnly = true;
    if(ctx.nSents>1){ note("sarcasm", t.replace(/[.!?]+$/,""), ""); return ""; }
    const rep = "[Say plainly what happened, in your own words.] Can we talk about it?";
    note("sarcasm", t.replace(/[.!?]+$/,""), rep); return rep;
  }
  if(/^thanks? (?:you )?for (?:finally )?(?:noticing|telling me now|letting me know now|the heads up)[.!]*$/i.test(t) && /finally|now/i.test(t)){
    const rep = "Thanks for noticing. [If something's bothering you, say it plainly: \"I was hoping you'd notice sooner.\"]"; note("passiveag", t.replace(/[.!?]+$/,""), rep); return rep;
  }
  if(/^please advise[.!]*$/i.test(t)){ const rep = "Could you tell me how you'd like to handle this by [a time]?"; note("pointed", "please advise", rep); return rep; }
  // an ultimatum without "then I'll": keep the wish, drop the leverage
  m = t.match(/^if you (?:don't|do not|won't) ([^,.!?]{2,60}?),?\s*(?:then )?(?:don't (?:bother|come|call|talk|expect)|forget (?:about )?(?:it|me|us)|we're (?:done|through|over)|i'm (?:done|gone|out)|you can forget|you'll (?:regret|be sorry)|don't ever)\b[^.!?]*[.!?]*$/i);
  if(m){ const rep = "I'd really like you to "+m[1].replace(/\s+$/,"")+". Could you let me know by [a time]?"; note("threat", t.replace(/[.!?]+$/,""), rep); ctx.converted = true; return rep; }
  m = t.match(/^why (is|are) (the [\w ]+?|my [\w ]+?|our [\w ]+?|your [\w ]+?) (?:still )?(?:such |so )?(?:a mess|messy|dirty|gross|a disaster|a pigsty)[?!.]*$/i);
  if(m){ const x = m[2].replace(/^your /i,"your ").toLowerCase(); const rep = "I noticed "+x+" "+m[1].toLowerCase()+" still messy. Could you tidy "+x+" by [a time]?"; note("critq", t.replace(/[.!?]+$/,""), rep); ctx.converted = true; return rep; }
  if(["label","absolute","critic","compare","madefeel","past","again","passive","sarcasm","disclaim","blameq","count"].some(id=>an.found[id])) ctx.critical = true;
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
  t = t.replace(/\bfriendly reminder\b\s*[:,-]?\s*(to\s+)?/i, (mm,to)=>{ note("pointed","friendly reminder","Reminder:"); return to ? "Reminder: please " : "Reminder: "; });
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
  if(!/^\W*seriously\W*$/i.test(t)) t = t.replace(/(^|\s|,)\s*seriously\b\s*,?\s*/gi, (mm,p)=>{ note("intens","seriously",""); return p===","?" ":p; }).replace(/^\s+/,"");

  // --- minimizers
  m = t.match(/^(?:it's|that's|it is) (?:so |really )?(?:simple|easy)\s*[,.!:;-]+\s*/i);
  if(m && t.length>m[0].length+2){ t = t.slice(m[0].length); note("minim", m[0].replace(/[,.!:;\s-]+$/,""), ""); }
  m = t.match(/^all you (?:have|need) to do is\s+(.+?)[.!?]*$/i);
  if(m){ t = "Could you "+m[1]+"?"; note("minim","all you have to do is","Could you"); ctx.converted=true; }
  t = t.replace(/,?\s*(?:it )?only takes a (?:second|minute|sec)\b[.!]?/i, mm=>{ note("minim", mm.replace(/^[,\s]+/,"").replace(/[.!]$/,""), ""); return "."; });
  t = t.replace(/\b(simply|obviously|clearly|literally)\b,?\s*/gi, (mm,w)=>{ note(/literally/i.test(w) ? "intens" : "minim", w.toLowerCase(), ""); return ""; });
  t = t.replace(/^seriously,?\s+(?=\w)/i, mm=>{ note("intens","seriously",""); return ""; });
  t = t.replace(/\bjust\s+(?=(?:do|go|get|put|ask|tell|say|stop|clean|pick|take|call|be|try|make|use|let|leave|finish|fix|wash|text|send|listen|give|bring|move|pay|answer|grow|relax|calm|deal|remember|read|check|look|throw|hang|reply|help|sit|turn|shut|close|open|wait|need|have)\b)/gi, (mm, off, str)=>{ if(/\b(?:i'll|i will|i'm|i|we'll|we)\s+$/i.test(str.slice(Math.max(0,off-8), off))) return mm; note("minim","just",""); return ""; });
  t = t.replace(/\b(you|it's|that's|you're)\s+just\b/gi, (mm,a)=>{ note("minim","just",""); return a; });

  // --- again / still / even
  m = t.match(/^(.*?)\byou (?:still )(?:haven't|have not) (\w+)(.*?)(?:\s+yet)?([.!?]*)$/i);
  if(m){
    // "…paid the rent and it's due Friday": the ask, then the rest as its own sentence
    const sp = m[3].match(/^(.*?)(?:\s*[,;]\s*|\s+(?:and|but|because|so)\s+)((?:it|that|this|i|we|they|she|he)(?:'s|'re|'m| is| are| was| were| am)?\b.*)$/i);
    const obj = sp ? sp[1] : m[3], rest = sp ? " "+endP(capFirst(sp[2])) : "";
    t = (m[1]?m[1].replace(/[,\s]+$/,"")+". ":"")+"Could you "+baseVerb(m[2])+obj+"?"+rest; note("again","still",""); ctx.converted=true; ctx.critical=true;
  }
  if(!ctx.safety) t = t.replace(/,?\s*\b(yet again|once again|as usual|like always)\b/gi, (mm,w)=>{ note("again", w.toLowerCase(), ""); return ""; });
  if(!ctx.safety) t = t.replace(/\s*\bagain\b/gi, (mm, off, str)=>{
    const before = str.slice(Math.max(0,off-16), off).toLowerCase();
    if(/(?:try|see you|thanks|thank you|say that|say it|meet|hear from you|talk|check|do that)\s*$/.test(before)) return mm;
    note("again","again",""); ctx.critical=true; return "";
  });
  t = t.replace(/\bstill\s+(?=(?:haven't|hasn't|didn't|don't|doesn't|won't|can't|isn't|aren't|not|no)\b)/gi, ()=>{ note("again","still",""); return ""; });
  t = t.replace(/\b(can't|didn't|don't|won't|couldn't|not|never) even\b/gi, (mm,a)=>{ note("again","even",""); return a; });

  // --- sarcasm, put-downs, passive jabs and shutting the door: the plain message underneath
  const PLAIN = [
    [/^(?:wow,?\s*)?(?:(?:how|so) )?(?:nice|good|kind|thoughtful|sweet) of you to (?:finally )?(?:show up|join us|come|make it|turn up|get here)\b[^.!?]*[.!?]*$/i, "sarcasm", "I was waiting, and it was hard. Could you text me next time if you're running late?"],
    [/^(?:glad you could (?:finally )?(?:make it|join us|show up))[^.!?]*[.!?]*$/i, "sarcasm", "I was waiting, and it was hard. Could you text me next time if you're running late?"],
    [/^(?:wow,?\s*|gee,?\s*)?thanks? (?:a lot )?for nothing[.!]*$/i, "sarcasm", "I was counting on your help with this, and I'm disappointed. Could you [one specific thing] by [a time]?"],
    [/^(?:wow,?\s*)?(?:thanks a lot|gee,? thanks)[.!]*$/i, "sarcasm", "That didn't help me. Could you [one specific thing] by [a time]?"],
    [/^(?:it )?must be nice(?: to (?:just )?(.+?))?(?: while (?:i|we) (.+?))?[.!]*$/i, "sarcasm", m=>REFRAME_BY.nice.send(m)],
    [/^(?:lol,?\s*)?(?:(?:ok(?:ay)?|sure|fine|yeah),?\s*)?(?:whatever you say|sure,? whatever|if you say so)[.!]*$/i, "sarcasm", "I see it differently, and I'd like to talk about it when we're both calm. Could we talk at [a time]?"],
    [/^(?:lol,?\s*)?ok(?:ay)?,? whatever[.!]*$/i, "sarcasm", "I'm not sure how to answer that. Can we come back to it at [a time]?"],
    [/^some of us (?:actually |still |do |would )?(?:like|want|need|prefer|enjoy) (?:having |to have )?(.+?)[.!]*$/i, "passiveag", m=>"I'd really like "+m[1].replace(/^a /,"a ")+". Could you help with that by [a time]?"],
    [/^some of us (?:actually |still )?(have|had|need|work|clean|cook|pay|do) (.+?)[.!]*$/i, "passiveag", m=>"I've been the one who "+(m[1]==="have"||m[1]==="had"||m[1]==="need"?"has to":m[1]+"s")+" "+m[2]+", and I'd like some help. Could you take [one part] by [a time]?"],
    [/^i guess i(?:'ll| will) (?:just )?(.+?)(?: again)?(?:,? since (?:nobody|no one|no-one) else (?:will|does|is going to|can|bothers))?(?: again)?[.!]*$/i, "passiveag", m=>/^(?:do|handle|take care of|deal with) (?:it|this|that)(?: myself)?$/i.test(m[1]) ? "I could use a hand with this. Could you take [one part]?" : "I've done the last few, and I'd love some help with this one. Could someone take [one part of it] by [a time]?"],
    [/^(?:fine|ok(?:ay)?|it's fine),? i(?:'ll| will) (?:just )?do it(?: myself)?[.!]*$/i, "passiveag", "I could use a hand with this. Could you take [one part]?"],
    [/^no need to be (?:rude|like that|snippy|so \w+)[.!]*$/i, "passiveag", "That came across as sharp to me. Did you mean it that way?"],
    [/^not that (?:you|anyone|anybody) (?:would )?(?:care|cares|noticed?|asked)[.!]*$/i, "passiveag", "It would mean a lot to me if you noticed [the specific thing]."],
    [/^(?:grow up|get a life|give me a break|spare me|oh please|cry me a river|boo hoo)[.!]*$/i, "contempt", "I'm frustrated, and I don't want to say something I'll regret. Can we talk about this at [a time]?"],
    [/^(?:are you (?:serious|kidding me)|you can't be serious|unbelievable)(?: right now)?[.!?]*$/i, "contempt", "[Say what upset you, plainly.] Can we talk about it?"],
    [/^don't "?(?:ok|okay|k|whatever|sorry)"? me[.!]*$/i, "contempt", ()=>ctx.nSents>1 ? "" : "[Say what upset you, plainly.] Can we talk about it?"],
    [/^(?:(?:nobody|no one|no-one) asked(?: you| for your (?:opinion|input))?|who asked(?: you)?)[.!?]*$/i, "contempt", "I'd rather work this one out myself, thanks."],
    [/^(?:(?:this is|that's) why |no wonder )?(?:nobody|no one|no-one) (?:wants to (?:deal with|be around|talk to|be with|hear from)|likes|can stand|cares about) you\b[^.!?]*[.!?]*$/i, "contempt", "[What happened] was really hard for me. I need a break, and then can we talk about it at [a time]?"],
    [/^(?:this is why|no wonder) (?:nobody|no one|no-one|people|everyone|you have no)\b[^.!?]*[.!?]*$/i, "contempt", "[What happened] was really hard for me. I need a break, and then can we talk about it at [a time]?"],
    [/^(?:\.{3,}|…)$/, "stonewall", "[Say one short line, even \"I need a minute. I'll reply tonight.\"]"],
    [/^(?:i said )?not now[.!]*$/i, "stonewall", "I can't talk right now. Can we talk at [a time]?"],
    [/^i (?:just |really |honestly )?can't (?:do|talk about) this(?: right now| anymore| today| tonight)?[.!]*$/i, "stonewall", "I can't do this right now. I need a break. Can we come back to it at [a time]?"],
    [/^(?:forget it|never ?mind|leave me alone|i'm done(?: talking)?|i give up)[.!]*$/i, "stonewall", "I need a break from this. Can we come back to it at [a time]?"]
  ];
  for(const [re,id,rep] of PLAIN){
    if(id==="stonewall" && (an.found.pause || WHEN_RE.test(an.norm) || /\bi need (?:an? |some |one )?(?:hour|minute|break|moment|time|space|breather)\b/i.test(an.norm))) continue;
    const mm = t.replace(/\s*(?:\b(?:lol|lmao)\b|🙄|😒|🙂|🙃|😊)\s*/gi," ").trim().match(re);
    if(mm){ const r = typeof rep==="function" ? rep(mm) : rep; note(id, t.replace(/[.!?]+$/,""), r.replace(/\s*\[Say.*$/,"")); ctx.critical = id!=="stonewall"; if(/Could you/.test(r)) ctx.converted=true; if(!/\?/.test(r)) ctx.noAsk=true; return r; }
  }

  // --- sarcasm (short lines)
  if(FBY.sarcasm.re && new RegExp(FBY.sarcasm.re.source,"i").test(t) && words(t)<=10 && !/\bbut\b/i.test(t)){
    const sm = t.match(new RegExp(FBY.sarcasm.re.source,"i"));
    const rest = (t.slice(0, sm.index)+" "+t.slice(sm.index+sm[0].length)).replace(/^[\s,.!…:;-]+/,"").replace(/\s{2,}/g," ").trim();
    ctx.critical=true;
    if((rest.match(/[A-Za-z']+/g)||[]).length >= 2){ note("sarcasm", sm[0], ""); t = capFirst(rest); }
    else {
      if(ctx.nSents>1){ note("sarcasm", t, ""); return ""; }
      const rep = "[Say plainly what happened, in your own words.] Can we talk about it?";
      note("sarcasm", t, rep); return rep;
    }
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
  if(/^i'll just (?:(?:sit|wait) here(?:,? then)?[.!…]*$|do everything\b)/i.test(t) || /^i guess i'll just (?:be|stay|sit)\b/i.test(t)){ note("guilt",t,"I could use a hand."); t="I could use a hand."; }

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
  // "Your sister always remembers my birthday." → ask for the thing itself
  m = t.match(/^(?:your|my) (?:sister|brother|mom|mum|dad|ex|friend|best friend|roommate|coworker|boss|cousin|mother|father) (?:always |actually |at least |still )?(remembers|calls|texts|helps|cleans|cooks|asks|listens|notices|shows up|visits|says thank you|plans|brings|makes|does|has|goes) ?(.*?)[.!]*$/i);
  if(m){ const V={does:"do",has:"have",goes:"go","shows up":"show up","says thank you":"say thank you"}; const v=V[m[1].toLowerCase()]||m[1].toLowerCase().replace(/s$/,""); const rep="Could you "+v+(m[2]?" "+m[2]:"")+"? It would mean a lot to me."; note("compare", t.replace(/[.!?]+$/,""), rep); ctx.converted=true; ctx.critical=true; return rep; }
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
  // "because of you" as blame goes; "not because of you" is a reassurance, and stays word for word
  if(/\bbecause of you\b/i.test(t) && !NEG_REASSURE.test(t)){ t=t.replace(/\bbecause of you,?\s*/i,""); note("madefeel","because of you",""); }
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
    ["defend",/^i (?:said|told you|explained)(?: that)?,?\s+(?=(?:work|my (?:job|boss|day|week|shift)|it's|it is|it was|i'm|i am|i was|i've been|i have been|i had|i have|i couldn't|i can't|i didn't|i wasn't|i'm not)\b)/gi, ""],
    ["already",/\bi (?:already )?told you (?:this |that )?(?:already|before|twice)\b[.!]*/gi, "Let me say this again in a way that sticks:"],
    ["already",/\b(?:i already (?:told|said|asked|explained)(?: you)?(?: this| that)?|as i (?:said|mentioned|wrote|told you)|like i said)\b[,.!]*/gi, "To recap:"],
    ["already",/\bdid you (?:even )?read (?:it|my (?:message|text|email))\?*/gi, "Here's the short version:"],
    ["already",/^did you (?:even )?(?:read|see|look at) (?:what i (?:wrote|said|sent)|my (?:last )?(?:message|text|email|note))[?.!]*$/gi, "Did you get a chance to read my message? Here's the short version: [the main point]."],
    ["feelingq",/\bhow (?:does|did) (?:that|it|this) make you feel\?*/gi, "Did that feel more like tired, annoyed or hurt? It's okay if it's hard to say yet."],
    ["feelingq",/\bhow do you feel(?: about (?:it|that|this))?\?*/gi, "Are you more tired, annoyed or hurt right now? Or would you rather not say yet?"],
    ["feelingq",/\bwhat's wrong\?+/gi, "Would space or company help more right now?"],
    ["feellike",/^i feel (?:like|that) you (.+?)[.!?]*$/gi, "I've been feeling [your feeling]. When [what happened], it seemed to me like you $1."],
    ["softno",/(?<!\b(?:i|we) (?:said|told you|meant|answered),? ["“]?)\bwe'll see\b(?! (?:you|them|him|her|the|it|each|y'all|everyone)\b)[.!]*/gi, "[If it's a no, say no kindly. If it's a real maybe, say when you'll decide.]"],
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
    [/^(.*?)\bwhy are you (?:always )?(?:like this|like that|the way you are)[?!.]*$/i, ()=>"[What happened] is bothering me. Can we talk about it?"],
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
  function pre(p){ p=(p||"").replace(/[,\s]+$/,""); if(!p || FILLER_ONLY.test(p)) return ""; if(/\b(?:but|and|so)$/i.test(p)) return p.replace(/,?\s*\b(?:but|and|so)$/i,"")+". "; return /^(?:tomorrow|tonight|today|later|next time|this weekend|on \w+day|in the morning|after dinner)$/i.test(p) ? p+", " : p+". "; }
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

  // --- "I need this ASAP": ask for it, with a real time and the reason
  m = t.match(/^(.*?)\bi need (this|that|it|the [\w ]+?|your [\w ]+?) (?:asap|a\.s\.a\.p\.?|right away|immediately|urgently|right now|now)\b[.!]*$/i);
  if(m){ const lead=(m[1]||"").replace(/^(?:to recap|reminder)\s*:\s*$/i,"").trim(); const rep=(lead?pre(lead):"")+"Could you get "+m[2]+" to me by [a time]? It's urgent because [the reason]."; note("urgent", (t.match(/asap|a\.s\.a\.p\.?|right away|immediately|urgently|right now|now/i)||["ASAP"])[0], "by [a time]"); t=rep; ctx.converted=true; }
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
  m = t.match(/^(.*?)\b(?:i|we) (?:really |just |still )?(?:need|want) you to (?:really )?(?:hear|listen to|understand|know) (?:me|this|that)(?: on this)?\s*[:,-]?\s*(.+?)([.!?]*)$/i);
  if(m && m[2]){
    const lead = (m[1]||"").replace(/,?\s*\bbut\s*$/i,"").replace(/[,\s]+$/,"");
    t = (lead ? lead+", and " : "")+"I want you to really hear this: "+m[2].replace(/[.!?]+$/,"")+".";
    note("oblig", (orig.match(/\b(?:i|we) (?:really |just |still )?(?:need|want) you to/i)||["I need you to"])[0], "I want you to really hear this:");
    if(/\bbut\b/i.test(m[1]||"")) note("butc", "…, but …", "…, and …");
    m = null;
  }
  else m = t.match(/^(.*?)\b(?:i|we) (?:really |just |still )?need you to (.+?)([.!?]*)$/i) || t.match(/^(.*?)\bi (?:really )?want you to (.+?)([.!?]*)$/i) || t.match(/^(.*?)\bmake sure (?:you |to )(.+?)([.!?]*)$/i);
  if(m){ const phrase=(orig.match(/\b(?:i|we) (?:really |just |still )?need you to|\bi (?:really )?want you to|\bmake sure (?:you|to)/i)||["I need you to"])[0]; t = pre(m[1])+"Could you "+vagueObj(m[2])+"?"; note("oblig", phrase, "Could you…?"); ctx.converted=true; }
  m = t.match(/^(.*?)\byou (?:really |seriously |just |honestly |definitely |probably |totally )?should (?!have\b|'ve\b)(.+?)([.!?]*)$/i);
  if(m){ const [act,tail]=splitTail(m[2]); const lead=/^(?:come|try|see|join|watch|check out|read|listen to|go|meet|visit|call|text)\b/i.test(act)?"Would you like to ":"Would you be willing to "; t = pre(m[1])+lead+act+"?"+(tail?" "+tail:""); note("should","you should",lead.trim()+"…?"); }
  m = t.match(/^(.*?)\byou (?:really )?(?:shouldn't|should not) (?!have\b|'ve\b)(.+?)([.!?]*)$/i);
  if(m){ t = pre(m[1])+"I'd rather you didn't "+m[2]+"."; note("should","you shouldn't","I'd rather you didn't…"); }

  // --- a blame tail on an ask ("…rather than be late", "…instead of being lazy"): keep the ask, lose the jab
  t = t.replace(/,?\s+(?:rather than|instead of) (?:be|being) (?:so )?(late|rude|lazy|messy|useless|careless|selfish|forgetful|a pain)\b([?.!]*)/i, (mm,w,p)=>{ note("critic", mm.trim(), ""); return (p||"")+(w==="late"?" Being on time really helps.":""); });

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
    [/^(?:being |a little |some |more )?(supportive|helpful|kind|thoughtful|present|patient|help|support) would be (?:nice|great|good|lovely)[.!]*$/i, m=>"It would really help me if you [one specific "+m[1].toLowerCase().replace(/^help$/,"helpful").replace(/^support$/,"supportive")+" thing, like asking how my day went]. Could you try that, starting [a day]?"],
    [/^it(?: would|'d) be (?:nice|great|good|helpful|lovely) if (?:someone|somebody|anyone|you) (?:could |would )?(.+?)[.!?]*$/i, m=>"Could you "+baseForm(m[1])+"?"],
    [/^it(?: would|'d) be (?:nice|great|good|helpful|lovely) if (?:the |my |our )?([\w ]+?) (?:got|were|was|could be) (\w+)(.*?)[.!?]*$/i, m=>"Could you "+baseVerb(m[2])+" the "+m[1]+m[3]+"?"],
    [/^(?:someone|somebody|anyone) (?:should|needs to|could|has to|might want to) (?:really |just |actually |probably )?(.+?)[.!?]*$/i, m=>"Could you "+baseForm(m[1])+"?"],
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
  m = t.match(/^(.*?)\byou (?:never|can't|cannot|don't|do not) (?:do|get) (?:anything|a single thing) right\b(.*?)([.!?]*)$/i);
  if(m){ const rest=m[2].replace(/^[\s,]*(?:and|but)?\s*/i,"").trim(); t = pre(m[1])+"[The specific thing that went wrong] was hard for me."+(rest?" "+endP(capFirst(rest)):""); note("absolute", "never do anything right", "[the specific thing that went wrong]"); ctx.critical=true; }
  // "You're always correcting me with the baby, it is not respectful to me": "a lot" goes on the first clause only,
  // the rest stays as its own sentence. If the first clause won't take it cleanly, a plain blank instead.
  const oneClause = (x)=>{
    const sp = x.match(/^(.+?)(?:\s*[,;:]\s*|\s+(?:and|but|because|so|which)\s+(?=(?:it|that|this|i|i'm|you|she|he|they|we|my|the)\b))(.+)$/i);
    const head = (sp ? sp[1] : x).trim(), rest = sp ? sp[2].replace(/^(?:and|but|so)\s+/i,"").trim() : "";
    const ok = words(head)>=1 && words(head)<=10 && !/\b(?:the|a|an|to|of|with|and|but|my|your|our|their|is|are|was|were)$/i.test(head);
    const r2 = rest.replace(/^(it|that|this) (?:is not|isn't|'s not) /i, (mm,w)=>capFirst(w.toLowerCase())+" doesn't feel ");
    return {head, rest: r2 ? " "+endP(capFirst(r2)) : "", ok};
  };
  const lately = (lead, body, note2)=>{ note("absolute", note2, "lately it's felt like"); ctx.critical=true; return pre(lead)+body; };
  const plainBlank = (lead, note2)=>{ note("absolute", note2, "[one recent time]"); ctx.critical=true; return pre(lead)+"[One recent time this happened] was hard for me."; };
  m = t.match(/^(.*?)\byou(?:'re| are) always (.+?)([.!?]*)$/i);
  if(m){ const c=oneClause(m[2]); t = c.ok ? lately(m[1], "Lately it's felt like you're "+c.head+" a lot."+c.rest, "always") : plainBlank(m[1], "always"); }
  m = t.match(/^(.*?)\byou(?:'re| are) never (.+?)([.!?]*)$/i);
  if(m){ const c=oneClause(m[2]); t = c.ok ? lately(m[1], "Lately it's felt like you're not "+c.head+" much."+c.rest, "never") : plainBlank(m[1], "never"); }
  m = t.match(/^(.*?)\byou always (\w+)(.*?)([.!?]*)$/i);
  if(m){ const c=oneClause(m[2]+m[3]); t = c.ok ? lately(m[1], "Lately it's felt like you "+c.head+"."+c.rest, "always") : plainBlank(m[1], "always"); }
  m = t.match(/^(.*?)\byou never (\w+)(.*?)([.!?]*)$/i);
  if(m){ const v=m[2].toLowerCase(); const neg = PAST[v]||/ed$/.test(v) ? "didn't "+baseVerb(v) : "don't "+v; const c=oneClause(neg+m[3]); t = c.ok ? lately(m[1], "Lately it's felt like you "+c.head+"."+c.rest, "never") : plainBlank(m[1], "never"); }
  m = t.match(/^every (?:single )?time (.+?)([.!?]*)$/i);
  if(m){ t = "Lately, when "+m[1]+"."; note("absolute","every time","lately, when"); ctx.critical=true; }
  m = t.match(/^(nobody|no one|nothing|everyone|everybody)(?: else)? ever (.+?)([.!?]*)$/i) || t.match(/^(nobody|no one)(?: else)? (cares|helps|listens|does|thinks)(.*?)([.!?]*)$/i);
  if(m){ t = "It feels like "+m[1].toLowerCase()+" "+m[2]+(m[3]&&!/^[.!?]*$/.test(m[3])?m[3]:"")+"."; note("absolute", m[1]+(/ever/.test(orig)?" ever":""), "it feels like…"); ctx.critical=true; }
  t = t.replace(/\b(?:constantly|all the time)\b/gi, mm=>{ note("absolute", mm.toLowerCase(), "a lot lately"); ctx.critical=true; return "a lot lately"; });
  t = t.replace(/\bevery (?:single )?time\b/gi, mm=>{ note("absolute", mm.toLowerCase(), "a few times lately"); ctx.critical=true; return "a few times lately"; });
  t = t.replace(/\b(you|you're|he|she|they|he's|she's|they're) always\b/gi, (mm,a)=>{ note("absolute","always","often"); ctx.critical=true; return a+" often"; });
  t = t.replace(/\b(do|doing|does|did) everything\b(?! (?:i|we|you) can\b)/gi, (mm,v)=>{ note("absolute","everything","most of the work"); ctx.critical=true; return v+" most of the work"; });

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
  t = t.replace(/\b(?:when you get a (?:chance|sec|second|minute|moment)|when you have (?:a (?:sec|second|minute|moment|chance)|time)|when you're free|when you can|whenever|at some point|sometime(?! (?:this|next|today|tonight|tomorrow|on|before|after|between)\b)|eventually|in a bit|one of these days|soon|(?<!see you |talk to you |talk |catch you )later(?! (?:on )?(?:today|tonight|this)))\b/gi, mm=>{ note("vtime", mm, "by [a time]"); return "by [a time]"; });
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
  // never on an accusation or a dig: "[If you're sure:] I'm only your friend when it suits you" would be harsher
  if(an.found.hedge && words(an.norm)<=14 && /\b(?:i think|pretty sure|probably|i guess|i believe)\b/i.test(t) && !["jab","sarcasm","passiveag","guilt","contempt","label","critic","absolute"].some(id=>an.found[id]) && !/\byou(?:r|'re|'ve|'ll)?\b/i.test(t.replace(/\b(?:i think|i guess|i believe)\b/gi,""))){
    const plain = t.replace(/\b(?:i think|pretty sure|probably|i guess|i believe)\s*/gi,"");
    t = (plain.split(/\s+/).filter(Boolean).length < 2 ? "I think so." : "[If you're sure:] "+capFirst(plain))+" [If you're not: \"I'm not sure yet. I'll check and tell you by [a time].\"]"; note("hedge","hedge","");
  }
  t = t.replace(/\s*(?:\b(?:lol|lmao|jk|haha+|hehe)\b|😂|🙃|😉|🙄|😒|😅|🤣)/gi, mm=>{ note("joke", mm.trim(), ""); return ""; });

  // --- "It's gross.": a verdict on a thing, with nothing to act on. Name the thing, then ask
  m = t.match(/^(?:it's|it is|that's|this is|that is|it was|that was) (?:so |really |just |kind of |pretty |honestly )?(gross|disgusting|nasty|revolting|filthy|vile|ridiculous|unacceptable|a disgrace|embarrassing)[.!]*$/i);
  if(m){ const rep="[The specific thing] isn't working for me. Could we [one specific change] by [a time]?"; note("judgment", t.replace(/[.!]+$/,""), rep); t=rep; ctx.converted=true; ctx.critical=true; }
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

/* the safest version of a sentence: built on the clearest rewrite, or a fill-in template when there's no safe
   automatic rewrite. Nothing here adds a promise the speaker didn't make. */
function safestVersion(base, o){
  if(!(o.criticism || o.flagged || o.isAsk)) return "";
  // no safe rewrite of these words: the safest thing is the plain shape, in their own words
  if(o.unchanged && !o.criticism) return ""; // the words already work: nothing safer to offer
  if(o.unchanged){
    return "I'd like to talk about [the topic] when it suits you. When [what happened], I felt [one feeling word]. Could you [one specific thing]? I'd like to hear how it looks to you, too.";
  }
  let t = String(base||"").replace(/!+/g, ".").replace(/\?{2,}/g, "?").replace(/\s+/g, " ").trim();
  if(!t) return "";
  // shouting in capitals reads as yelling: write it calmly (short codes like "WP-03" stay)
  t = t.replace(/\b([A-Z]{4,})\b/g, (w)=>w.charAt(0)+w.slice(1).toLowerCase());
  // an apology needs no "I'm not upset with you"; everything else gets the person kept separate from the problem
  const sorry = /^\W*(?:(?:i'm|i am|so|really)\s+)*sorry\b|^\W*i apologi[sz]e\b/i.test(t);
  // co-parents: a neutral, businesslike opener (brief, about the plan, nothing about feelings for the person)
  // never "this isn't about you" right next to words that still blame
  const blameLeft = /\b(?:you (?:always|never|keep)|again|"?(?:second|third|fourth|fifth|\d+(?:st|nd|rd|th)) time|every (?:single )?time|your fault|blame|lazy|careless|useless|sort it out)\b/i.test(t);
  const lead = !o.criticism || sorry ? "" : o.coparent ? "I'd like to keep this to the plan for the kids. "
    : o.work ? (blameLeft ? "" : o.group ? "This is about how the process works, not about any one person. " : "This is about the process, not you. ")
    : o.group ? "I'd like us to sort this out together. "
    : "I'm not upset with you as a person. I'd like us to sort this out together. ";
  const close = /\b(?:how it looks to you|your side|what do you think|does that work|is that okay|getting in the way)\b/i.test(t) ? "" :
    o.work ? (o.isAsk ? " If something is getting in the way, say so, and we'll fix the process together." : " I'd like to hear how it looks from your side, too.") :
    o.coparent ? (o.isAsk ? " Does that work for you?" : "") :
    (o.isAsk ? " Is that okay, or would something else work better for you?" : " I'd like to hear how it looks to you, too.");
  return tidy(lead + t + close);
}

function finish(main, list, log, an, W, opts){
  const changes = log.map(c=>explainChange(c, W));
  const ask = an.asks[0] || null;
  const variants = [];
  const unchanged = !log.length;
  const base0 = main;
  const listMain = !!list && (W.has("adhd")||W.has("apd")||W.has("dyslexic")||W.has("dld")||an.segs.length>=3);
  const base = listMain ? list : main;
  const isMinimal = log.some(c=>c.id==="minimal"||c.id==="brushoff");
  const flagged = an.staticIds && an.staticIds.length;
  variants.push({id:"main", label: unchanged ? "Your words" : "Clearest version",
    why: unchanged ? (flagged ? "There's no safe automatic rewrite for this one, so here are your words. The notes above show what may land hard: try the plain version of what you mean, in your own words." : "Nothing in the structure needed changing.") : "Keeps your ask. Changes the structure around it (see the list of changes).", text:base});
  if(isMinimal) return {main:base, primary:variants[0], variants, changes, ask, list, unchanged};
  // the safest version is built after the others (below), from the same words

  const firstAsk = (base0.match(/(?:^|[.!?\]]\s+)([^.!?\]]*\b(?:could you|would you|can you|can we|could we|would that work)\b[^?]*\?)/i)||["",""])[1].trim();
  const isAsk = !!firstAsk;
  const hasReason = WHY_RE.test(base0) || an.goodIds.includes("reason") || an.goodIds.includes("feeling");
  const criticism = an.staticIds.some(id=>["jab","motive","label","absolute","critic","again","compare","madefeel","past","blameq","cannot","threat","guilt","shouldhave","sarcasm","passive","disclaim","oblig","should"].includes(id));
  const isTask = isAsk && !/\b(?:talk|look at it together|come back to it)\b/i.test(firstAsk);
  const sep = listMain ? "\n" : " ";

  if(isAsk || criticism){
    // "We're okay" is only offered between people close enough for it to be true
    // and useful, never at work or from a manager.
    // between co-parents, keep it brief and businesslike: no reassurance about the relationship
    const close = CLOSE_REL.includes(opts.rel) && !WORK_REL.includes(opts.rel) && opts.rel!=="coparent" && opts.channel!=="group";
    const bondy = close && (W.has("anxiety")||W.has("adhd")||W.has("trauma")||W.has("hsp")||opts.bond);
    const sorryLead = /^\W*(?:(?:i'm|i am|so|really)\s+)*sorry\b|^\W*i apologi[sz]e\b/i.test(base0);
    let opener = criticism && !sorryLead ? "I'd like us to sort this out together. " : "";
    if(bondy) opener = "We're okay. "+opener;
    const thanks = /\bthank/i.test(base) || sorryLead ? "" : sep+"Thank you.";
    if((opener || thanks.trim()) && !opts.reframed && !vocOf(base)) variants.push({id:"warm", label:"Warm", why: bondy ? "Reassurance first, then the same ask. For a listener who may hear a hard sentence as rejection, the first words set the frame. Only say \"we're okay\" if it's true." : "A kind frame first, and thanks at the end. The ask is the same.", text: (listMain ? opener+base : tidy(opener+base))+thanks});
  }
  if(isAsk && !listMain){
    // Brief keeps every sentence that carries content (an ask, a time, a fact).
    // It only drops courtesy lines and fill-in notes, so nothing you said is lost.
    const kept = splitSentences(base0).map(x=>x.text).filter(x=>!DROPPABLE.test(x.trim()));
    const brief = tidy(kept.join(" "));
    if(kept.length && brief!==tidy(base0)) variants.push({id:"brief", label:"Brief", why:"The same ask and details, without the extra lines. Easiest to take in when someone is busy, stressed, reading a text, or has a lot on their mind.", text:brief});
  }
  if(isAsk && !opts.reframed){
    const extra = [];
    const ownerAsk = /\bone owner\b/i.test(firstAsk);
    if(isTask && !hasReason && !/\[what that affected\]/.test(base0)) extra.push("It matters because [the reason].");
    if(isTask && !ownerAsk && (an.found.vstd || /\b(?:clean|tidy|fix|help)\b/i.test(firstAsk))) extra.push("Done looks like [what finished means].");
    if(ownerAsk) extra.push("Done looks like one name next to it, and a note in the channel when it's handed over.");
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
  // The safest way to say it: the version least likely to land as an attack, whoever is listening.
  // No blame, the person kept separate from the problem, one plain ask, a choice, and room for their side.
  // Offered whenever the words carry static, an ask or a criticism; it sits right after the first choice.
  const safe = vocOf(base0) || opts.reframed ? "" : safestVersion(base0, {criticism, isAsk, flagged, unchanged, close: CLOSE_REL.includes(opts.rel) && opts.channel!=="group", work: !!(opts.work || WORK_REL.includes(opts.rel)), group: opts.channel==="group", coparent: opts.rel==="coparent"});
  if(safe && !variants.some(v=>v.text.toLowerCase()===safe.toLowerCase())) variants.splice(Math.min(1, variants.length), 0, {id:"safe", label:"Safest way to say it",
    why: (opts.work || WORK_REL.includes(opts.rel)) ? "The version least likely to land as blame or an order, whoever reads it: about the process, not a person, one clear ask, and room for what's getting in the way. Send it once." : "The version least likely to start a fight, whoever is listening: no blame, the person kept separate from the problem, one clear ask, a real choice, and room for their side. Send it when you’re both calm, and say it once.", text:safe});
  return {main: base, primary: variants[0], variants, changes, ask, list, unchanged};
}

/* Readings for the shared patterns (sarcasm's cousins: put-downs, passive jabs, shutting the door) */
const SHARED_READ = {
 nt:{contempt:[3,"They look down on me.","A put-down or an eye-roll is heard as disrespect, which hurts more than the complaint would have."],
     passiveag:[2,"They're annoyed, and I'm supposed to guess why.","Most listeners catch the edge in \"some of us\" or \"I guess I'll do it again,\" and react to the edge, not the ask."],
     stonewall:[2,"This conversation is over, and so is their interest.","Without a time to come back, a pause reads as a door closing."]},
 autistic:{contempt:[2,"Something's wrong, and I'm not sure what I did.","The mocking may be read literally, or felt without knowing its cause. Either way, the actual request is missing."],
     passiveag:[2,"Some of us? Which of us? What do they want me to do?","The request is hidden under politeness, so it may simply not be decoded as a request."],
     stonewall:[2,"Not now means when?","A pause with no end point leaves the plan open, which is hard to hold."]},
 adhd:{contempt:[3,"Here we go. I've failed again.","Many ADHD adults have heard a lot of criticism; a put-down lands on the whole history."],
     passiveag:[2,"I missed something, again.","The edge lands fast; the actual ask, if there is one, may not."],
     stonewall:[2,"I'll forget to come back to this.","Without a set time, the conversation can slip away, and it looks like not caring."]},
 anxiety:{contempt:[3,"They can't stand me.","A put-down is heard as rejection, which is much bigger than the moment."],
     passiveag:[3,"They're angry with me and won't say it.","The unspoken part gets filled in with the worst case, and replayed later."],
     stonewall:[3,"They're leaving. Something is really wrong.","Silence with no return time is where anxious minds fill in the worst."]},
 hsp:{contempt:[3,"That stung, and I'll feel it all day.","Sensitive listeners feel the edge strongly and for longer."],
     passiveag:[2,"There's tension in the air, and I can feel it.","The unspoken annoyance is picked up quickly, even when the words are polite."],
     stonewall:[2,"The silence is loud.","A shut door is felt as strongly as a raised voice."]},
 trauma:{contempt:[3,"I'm not safe with this person.","Mocking and put-downs can register as threat, not just unkindness."],
     passiveag:[2,"Something's coming. Stay alert.","Hidden anger can feel less safe than anger said plainly."],
     stonewall:[3,"I've been cut off.","Withdrawal with no return time can echo old abandonment."]},
 alex:{contempt:[2,"Something feels bad, but I can't name it.","The feeling lands in the body before it has a name, and the request underneath is missing."],
     passiveag:[2,"I don't know what they're asking.","The meaning is in the tone, which is the hardest part to decode."]},
 ocd:{passiveag:[2,"Did I do something wrong? I need to check.","An unclear complaint can start a loop of checking and reassurance-seeking."],
     stonewall:[2,"Is it okay? I need to know it's okay.","An open-ended pause is hard to sit with. A return time closes the loop."]}
};
/* Readings for brush-offs, a diagnosis used as an insult, violent figures of speech, self put-downs and stacked softeners */
const MORE_READ = {
 nt:{brushoff:[2,"They're done with me, and they don't care.","\"Whatever\" and \"I don't care\" are usually heard as a door closing, even when they mean \"either is fine.\""],
     dxlabel:[3,"They're mocking something real about people.","Using a real condition as a put-down is heard as contempt, and it hurts anyone who lives with it."],
     violent:[2,"That's a strange thing to say, even as a joke.","Most listeners know it's an exaggeration, but in writing it can still land as a threat."],
     selfput:[1,"Now I have to reassure them.","Self put-downs pull the listener into comforting, and the point gets lost."],
     overhedge:[1,"Are they asking or not?","A stack of softeners makes it hard to tell whether there's a real request."]},
 autistic:{brushoff:[1,"They said they don't care, so it doesn't matter.","A brush-off may be taken at its word, which only causes trouble if it wasn't meant literally."],
     dxlabel:[3,"My neurology is being used as an insult.","Using \"autistic\" as a put-down treats a real identity as something shameful."],
     violent:[3,"Did they literally mean they'd hurt me?","An exaggerated threat may be taken at face value, and it's frightening either way."],
     selfput:[1,"Is that true? Do they want me to agree?","Taken literally, a self put-down is a confusing statement of fact."],
     overhedge:[2,"Is this a request? Do I have to do it?","Hedges stacked on hedges hide whether an answer is expected."]},
 adhd:{brushoff:[2,"I've annoyed them, and now they've checked out.","Rejection sensitivity can turn \"whatever\" into proof of rejection."],
     dxlabel:[3,"My brain is the joke again.","A condition used as a put-down echoes years of being called lazy or careless."],
     violent:[2,"They're really angry with me.","The intensity lands first, and fast."],
     selfput:[1,"Should I say it's okay? What happened?","The apology gets lost in the reassurance."],
     overhedge:[2,"I'm not sure what they're asking, so I'll let it slide.","A buried ask is easy to miss."]},
 anxiety:{brushoff:[3,"They're angry with me and pulling away.","A brush-off is ambiguous, and ambiguity resolves to threat."],
     dxlabel:[3,"They look down on me.","A condition used as a put-down is heard as contempt."],
     violent:[2,"Is something really wrong?","A violent phrase can set off alarm, even when it's clearly a joke."],
     selfput:[1,"Is this my fault? Should I fix it?","Worry fills in the gap."],
     overhedge:[1,"Is this a big deal they're scared to ask?","All that softening can sound like something is wrong."]},
 hsp:{brushoff:[2,"That felt cold, and I'll keep thinking about it.","A curt brush-off registers strongly."],
     dxlabel:[3,"That was cruel.","Put-downs land hard."],
     violent:[2,"That was jarring.","Violent words register strongly, even as a figure of speech."]},
 trauma:{brushoff:[2,"I've been shut out.","Withdrawal can echo old abandonment."],
     dxlabel:[3,"I'm being attacked.","A put-down can register as threat."],
     violent:[3,"Danger.","Even as an exaggeration, violent words can go straight to the alarm."]}
};
/* Court and custody threats, the children told first, and safety worries */
const ESC_READ = {
 nt:{legal:[3,"This is a fight now, and they want to win it.","A threat of court or custody is heard as a threat, whatever was meant. Most people stop listening to the point and start protecting themselves."],
     kidsfirst:[3,"They've put the kids in the middle.","Being told the children already know feels like being overruled through them. The other parent usually pushes back hard."],
     safeask:[1,"They're blaming me for what happened.","A safety worry with no plan can sound like a charge about the past, even when it's really fear."],
     safety:[0,"That's a fair worry.","A plain safety concern is usually understood as care."]},
 anxiety:{legal:[3,"I could lose my children.","A court or custody threat goes straight to the biggest fear there is."],
     kidsfirst:[3,"What have they told the kids about me?","Not knowing what the children heard is very hard to sit with."],
     safeask:[2,"I'm a danger. I've failed them.","A safety mistake can feel like proof of being a bad parent or partner."]},
 adhd:{legal:[3,"This is out of control.","The threat lands fast and loud, and the point gets lost."],
     kidsfirst:[3,"They went around me.","It can feel like a decision was made without them."],
     safeask:[2,"I forgot again, and now I'm dangerous.","Forgetting is not the same as not caring. A habit or a cue helps more than blame."]},
 autistic:{legal:[3,"Are they really going to court?","A threat may be taken literally, as a plan, and answered as one."],
     kidsfirst:[3,"The kids now believe something that isn't agreed.","It changes the facts the children are working from, without a shared plan."],
     safeask:[1,"What exactly should I do differently?","A clear habit (\"check the stove before leaving the kitchen\") is easier to follow than a complaint."]}
};
Object.keys(ESC_READ).forEach(w=>{ if(NT[w]) Object.keys(ESC_READ[w]).forEach(f=>{ if(!NT[w].receive[f]) NT[w].receive[f]=ESC_READ[w][f]; }); });
Object.assign(CHECK, {
  legal:"\"That sounded like a threat about the kids. Can we talk about what's really worrying you?\"",
  kidsfirst:"\"What did you tell the kids? Can we agree together on what they hear?\"",
  safeask:"\"You're right, that wasn't safe. What would help it get checked every time?\""
});
Object.assign(CHANGE_WHY, {
  legal:{g:"A threat of court or custody turns a parenting problem into a fight to win, and messages like this are often saved and shown later. The worry underneath can be said on its own. If there is a real legal step, it goes through the proper channel, not a message.", anxiety:"A threat about the children goes straight to the biggest fear a parent has."},
  kidsfirst:{g:"Telling the children first puts them in the middle. Agreeing together on what they hear protects them, and keeps the adults on the same side of it."},
  safefact:{g:"The fact is said once, in your own words, without \"again\". Nothing is added, so the worry and the ask for a habit stay just as clear and just as direct.", adhd:"For many ADHD listeners, \"again\" lands on every time they have been told off. The plain fact is easier to hear, and easier to act on.", hsp:"A highly sensitive listener tends to feel the blame more than the words. The plain fact keeps the focus on keeping everyone safe.", trauma:"Blame about the past can feel like danger. The plain fact keeps it about safety, not about who failed."},
  safety:{g:"The worry is real and worth saying. A habit (\"every time\") keeps everyone safe going forward. A deadline or a blame word would only cover this one time.", adhd:"A cue in the right place (a note by the door) works better than trying harder to remember."},
  sarcasm:{g:"Sarcasm carries the real message in the tone, which a text doesn't have. Said plainly, the hurt underneath can actually be answered."},
  plain:{g:"The automatic rewrite of this part didn't come out as clear English, so it's left as a blank for your own words. Short and plain is best."}
});
Object.keys(MORE_READ).forEach(w=>{ if(NT[w]) Object.keys(MORE_READ[w]).forEach(f=>{ if(!NT[w].receive[f]) NT[w].receive[f]=MORE_READ[w][f]; }); });
Object.assign(CHECK, {
  brushoff:"\"Do you mean either is fine, or are you upset? It's okay if it's the second one.\"",
  dxlabel:"\"That hurt. What's the specific thing that bothered you?\"",
  violent:"\"I know that's not literal. How upset are you, really?\"",
  selfput:"\"It's okay. What would help fix it?\"",
  overhedge:"\"Are you asking me to do it? I'm happy to. When would you like it by?\""
});
Object.keys(SHARED_READ).forEach(w=>{ if(NT[w]) Object.keys(SHARED_READ[w]).forEach(f=>{ if(!NT[w].receive[f]) NT[w].receive[f]=SHARED_READ[w][f]; }); });

/* "Sorry, but you…": the blame after an apology is the part most likely to sting */
const SORRY_READ = {
 nt:[2,"So it's my fault after all.","After “but,” the blame tends to drown out the sorry."],
 anxiety:[3,"They're sorry, but really I'm the problem.","The blame at the end is what gets replayed later, not the apology."],
 adhd:[3,"Even their apology ends with what I did wrong.","Criticism lands hard and fast for many ADHD listeners, and it can wipe out the apology before it."],
 autistic:[1,"Which part is the real message, the sorry or the blame?","Two messages in one sentence are hard to weigh, so the listener may answer the wrong one."],
 hsp:[3,"The apology was nice, but the last part really stung.","Sensitive listeners feel the edge strongly, and for longer."],
 trauma:[2,"It's coming back on me again.","Blame tucked into an apology can feel less safe than plain words."]
};
Object.keys(SORRY_READ).forEach(w=>{ if(NT[w] && !NT[w].receive.sorrybut) NT[w].receive.sorrybut = SORRY_READ[w]; });
Object.assign(CHECK, { sorrybut:"\"Thank you for saying sorry. Did something I said bother you too? I'd like to hear it.\"" });
Object.assign(CHANGE_WHY, { sorrybut:{g:"The “but you…” came out, so the apology can count on its own. What bothered you about their words stays, said as your own feeling and kept for later, so it can be heard instead of argued.", adhd:"For a listener who is sensitive to criticism, the blame at the end can wipe out the apology. Kept apart, both can land.", anxiety:"Blame at the end of an apology is the part that gets replayed. Kept apart, the apology can settle."} });

/* ============================================================
   EXPORT
   ============================================================ */
/* "What you may have meant", said to the speaker: second person for you, "they" for the listener.
   as: who the wiring describes ("As someone with ADHD, you likely meant…"). */
const SELF_MEANT = {
  nt:{as:"a neurotypical person", d:"you probably meant more than the words alone. Many neurotypical speakers let tone and context carry part of the message, so it helps to say that part out loud.",
    hint:"you probably meant a polite request. Indirect wording is how many neurotypical speakers soften an ask.", sarcasm:"you probably meant frustration, made lighter or sharper with irony.",
    minimal:"you may have meant \"fine,\" or \"ask me later.\" Your tone would carry the rest, and they may not hear it.", ominous:"you probably meant something serious, worded this way to signal its weight.",
    vtime:"you probably meant a soft deadline, often sooner than the words say.", softno:"you may have meant a polite no.", joke:"you were probably signaling friendliness."},
  autistic:{as:"an autistic person", d:"you most likely meant the words as stated. Many autistic people prefer direct, precise language (National Autistic Society).",
    minimal:"you probably meant literally that, without social padding.", period:"you almost certainly meant the full stop as plain punctuation.",
    blameq:"you may have meant it as a real question, wanting the reason, not an apology.", absolute:"you may have meant it precisely, or you may be overloaded. Naming one specific time helps them hear it.",
    critic:"you probably meant it about the task, not about them.", long:"you probably added the detail out of care or accuracy, not to lecture.",
    tone:"you may be genuinely unsure what their face or tone is saying.", label:"you may have been overloaded when you wrote it. Naming what specifically went wrong helps them hear it."},
  adhd:{as:"someone with ADHD", d:"you likely meant what you said, fast. If it came out sharp, it may have been a passing flash of feeling rather than your settled view.",
    vtime:"you meant it sincerely, but without a time or cue, it's at risk of slipping.", critic:"you may have felt a flash of frustration that passes quickly.",
    shout:"you may have meant energy or excitement, and it came out loud.", multi:"you may have been thinking out loud. The list may be as much for you as for them.",
    blameq:"you probably meant frustration more than a real question.", hyper:"you probably meant how strong the feeling is, not a literal claim.",
    excuse:"you may have meant \"this is hard for me,\" which is real. Saying the system you'll use (a reminder, an alarm) says that without leaving the fix with them."},
  dyslexic:{as:"someone who's dyslexic", d:"if you wrote it, you may have kept it short, or spelled it oddly, for reasons that have nothing to do with tone.",
    minimal:"you probably kept it short because typing costs effort, not to be curt.", period:"you probably kept it short because typing costs effort, not to be curt."},
  dyspraxic:{as:"someone who's dyspraxic", d:"if your reply came slowly, you were building the answer, not holding back."},
  apd:{as:"someone with auditory processing differences", d:"if your reply seemed off-topic to them, you may have been answering what you thought you heard. It's worth checking the words arrived."},
  dld:{as:"someone with DLD", d:"your words may be simpler or vaguer than the thought behind them. Word-finding can be hard.",
    vstd:"you may have used the vague word in place of a specific one you couldn't find.", vemo:"you may have used the vague word in place of a specific one you couldn't find."},
  tourette:{as:"someone with Tourette", d:"you may have had a tic come with the words, a sound or a movement that wasn't a comment. It's okay to say so."},
  alex:{as:"someone with alexithymia", d:"you may not have a label for the feeling behind this. Your actions may say more than the words.",
    minimal:"you may have given the most accurate answer you have right now.", critic:"a feeling may be showing up in your words as a complaint about a fact."},
  hsp:{as:"a highly sensitive person", d:"you probably worded it carefully. Many highly sensitive people know exactly how words can land."},
  anxiety:{as:"someone with anxiety", d:"you may have worded it to avoid conflict. There may be worry underneath the words.",
    reassure:"you meant it as a real question, and you need a plain answer.", long:"you may be over-explaining, as insurance against being misunderstood.",
    ellipsis:"you meant hesitation, not hostility.", hedge:"you meant caution, not evasion."},
  trauma:{as:"someone with a trauma history", d:"you may have had an alarm go off, if it came out defensive. That isn't the same as your position."},
  ocd:{as:"someone with OCD", d:"your precision, or asking again, may come from a need for certainty, not pickiness or distrust.",
    reassure:"the doubt may be doing the asking, not distrust of them.", vstd:"you may want precision out of a need for certainty, not pickiness."}
};
/* what the speaker may have meant, in the second person: "As someone with ADHD, you likely meant what you said, fast." */
function meantSelf(id, fids){
  const m = SELF_MEANT[id]; if(!m) return null;
  const notes = [];
  (fids||[]).forEach(f=>{ if(m[f] && !notes.includes(m[f])) notes.push(m[f]); });
  return {as:"As "+m.as+",", text: notes.length ? notes.slice(0,2).map((x,i)=>i ? x.charAt(0).toUpperCase()+x.slice(1) : x).join(" ") : m.d};
}
Object.keys(ADD).forEach(w=>{ if(NT[w]) Object.assign(NT[w].receive, ADD[w]); });
Object.assign(CHECK, CHECK_ADD);

/* Threats, digs, guessed motives, blunt openers and closed doors; boundaries and disclosures worth keeping */
const DIG_READ = {
 nt:{menace:[3,"They're threatening me.","A threat is heard as a threat, whatever was meant. It frightens, or it controls, and the point is lost."],
     jab:[2,"They're keeping score, and I'm losing.","A dig or a scorecard is heard as blame, so the listener defends themselves instead of hearing the need."],
     motive:[2,"They think I did it to hurt them.","Being told your motive invites an argument about intent, not a fix."],
     blunt:[2,"They're telling me off.","A flat \"That is incorrect\" is often heard as cold, even when the fact is fair."],
     closer:[1,"I'm being shut out.","A closed door can sting, even when the decision is fair."],
     boundary:[0,"They're looking after themselves, and they still care.","A calm limit with care in it is usually understood, even when it's hard to hear."],
     disclose:[0,"They trust me with something important.","Sharing who you are is a reach toward someone."]},
 anxiety:{menace:[3,"I'm not safe.","A threat goes straight to fear."],
     jab:[3,"I've failed them, and they resent me.","A dig leaves an anxious listener replaying it, and looking for proof."],
     motive:[2,"They think I'm a bad person.","Being accused of meaning harm is hard to put down."],
     blunt:[2,"I've got it wrong, and now they're annoyed.","A blunt correction can feel like a judgment."],
     closer:[2,"They don't want me involved any more.","A closed door is filled in with the worst case."]},
 adhd:{menace:[3,"This is out of control.","A threat lands fast and loud."],
     jab:[2,"Nothing I do is ever enough.","A scorecard echoes years of being told they didn't try hard enough."],
     motive:[3,"I didn't mean it. Why do they think I did?","Being accused of intent hurts when the miss was forgetting, not malice."],
     blunt:[2,"I've messed up again.","A blunt correction can land on old rejection sensitivity."],
     closer:[1,"I'm out of the loop.","A closed door can feel like being left out."]},
 autistic:{menace:[3,"Will they really do that?","A threat may be taken literally, as a plan."],
     jab:[2,"Is that a fact or a complaint? What do they want?","A dig hides the request, so the listener may answer the words instead of the need."],
     motive:[2,"That's not true. I didn't plan that.","A guessed motive may be answered as a factual error."],
     blunt:[0,"Okay, Friday. Thanks.","Many autistic listeners prefer a plain correction."],
     closer:[0,"Understood: they decide.","Likely taken at its word."]},
 hsp:{menace:[3,"Danger.","A threat registers strongly."], jab:[3,"That stung, and I'll keep thinking about it.","Digs land hard and stay."]},
 trauma:{menace:[3,"I'm not safe.","A threat can go straight to the alarm."], jab:[3,"I'm being attacked.","Blame can register as threat."]}
};
Object.keys(DIG_READ).forEach(w=>{ if(NT[w]) Object.keys(DIG_READ[w]).forEach(f=>{ if(!NT[w].receive[f]) NT[w].receive[f]=DIG_READ[w][f]; }); });
Object.assign(CHECK, {
  menace:"\"That sounded like a threat. I'm not going to talk about it while it's said like that.\"",
  jab:"\"That sounds like it's been building up. What's the one thing you'd like to change?\"",
  motive:"\"It wasn't on purpose. Can we look at what happened, and what would help next time?\"",
  blunt:"\"Thanks for the correction.\"",
  closer:"\"I understand it's your decision. I'm here if you want to talk it through.\""
});
Object.assign(CHANGE_WHY, {
  menace:{g:"A threat would frighten or control the other person. No wording makes a threat okay, so it's left out completely. What's left is what you feel and what you need."},
  jab:{g:"A dig or a scorecard says the hurt as blame, so the listener defends themselves. The rewrite says the hurt plainly and keeps the real ask."},
  motive:{g:"\"On purpose\" guesses at their reasons, so they argue about intent instead of the problem. Without it, what happened and what you'd like can be answered."},
  blunt:{g:"\"That is incorrect\" is clear, and it can still land cold. \"Quick correction\" keeps the same fact and sounds like help."},
  closer:{g:"Leading with warmth keeps someone close while you still make the decision yourselves."},
  visits:{g:"\"You can't just turn up\" sounds like a rule and a telling-off. Asking for a text first says the same boundary as a plan, and keeps the door open."},
  coparent:{g:"With a co-parent, short and factual works best: what the child needs, the ask, and a time. Feelings about each other are better kept for a calmer place, or a mediator."},
  reqmaybe:{g:"\"Maybe\" in a request makes it sound optional, so it's easy to shrug off. A plain, kind ask is clearer."}
});
REFRAMES.forEach(r=>{ CHANGE_WHY["rf_"+r.id] = {g:r.why}; });
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
/* A wiring with few notes of its own still gets a specific reading for each pattern: what most listeners
   may hear from that pattern, with a line on how this wiring meets it. The wiring's own notes always win. */
(function fillSparse(){
  const LENS = {
    dyslexic:"Dyslexia mostly changes how much reading costs, not how this lands, so it may land the way it would for most listeners.",
    dyspraxic:"Dyspraxia mostly affects planning and doing, so the words themselves may land the way they would for most listeners.",
    apd:"Heard out loud, the words may be harder to catch in full; the edge usually still comes through.",
    dld:"Longer or indirect wording can take more effort to process; the edge usually still comes through.",
    tourette:"Tourette doesn't change how words land, so this may land the way it would for most listeners.",
    alex:"Naming the feeling may be hard, but the edge in the words is still felt.",
    ocd:"An unclear or loaded message can set off checking or a need for reassurance.",
    hsp:"Highly sensitive listeners often feel this more strongly, and for longer.",
    trauma:"For someone with a trauma history, a sharp edge can feel less safe than it looks on the page.",
    anxiety:"An anxious listener may fill any gap with the worst case.",
    adhd:"The edge may land faster than the details.",
    autistic:"The literal words may be taken at face value, so say the real meaning plainly.",
    nt:"Most listeners read tone into the words, whether or not it was meant."
  };
  const G = NT.general.receive;
  Object.keys(LENS).forEach(w=>{
    if(!NT[w]) return;
    F.forEach(f=>{
      if(f.kind!=="static" || NT[w].receive[f.id] || !G[f.id]) return;
      const g = Array.isArray(G[f.id]) ? {w:G[f.id][0], h:G[f.id][1]} : G[f.id];
      if(!g || !g.h || /Something here may land/.test(g.h)) return;
      NT[w].receive[f.id] = [Math.max(1, g.w), g.h, LENS[w]];
    });
  });
})();
/* ============================================================
   SOMEONE SENT ME THIS
   Reads a message someone received, kindly, for the person who got it: what it
   might mean, what isn't okay whatever was meant, and calm ways to answer.
   It never reads the words back as the receiver's fears ("they think I'm a bad
   person"), and it never guesses what the sender thinks of them.
   receive(analysis) -> {crossed, meanings:[..], literal:[{text, means}], replies:[{label, text}], found:[names]}
   ============================================================ */
const RECEIVE_MEANS = [
  [["legal"], "It talks about court, a lawyer or custody. That's a big step to raise in a message, and it often comes from fear. You don't have to answer it on the spot, and it's okay to get advice before you reply."],
  [["kidsfirst"], "They say they've already told the children something about you. That's hard to read. You can answer the practical part, and ask to agree together on what the kids hear."],
  [["safety"], "There's a real safety worry in it. It's fair to take that seriously, even if the wording stings."],
  [["threat"], "It's worded as an ultimatum. It shows how much this matters to them right now. You don't have to answer it on the spot."],
  [["violent"], "\"Kill you\" is almost always an exaggeration. It usually means they'd be very annoyed. If it doesn't feel like a joke to you, it's okay to say so."],
  [["hostile","swear"], "They're very angry or fed up right now. The heat in the words says more about how they feel in this moment than about you."],
  [["label","dxlabel","contempt"], "A put-down or a name is a verdict, not a fact. It usually means they're upset about something specific that they haven't said plainly."],
  [["absolute"], "\"Always\" and \"never\" usually mean \"this has happened more than once, and it's getting to me.\" They're rarely meant as an exact count."],
  [["brushoff","minimal"], "A short \"fine\" or \"whatever\" can mean \"really, it's okay\" or \"I'm upset and don't want to talk right now.\" The words alone can't tell you which."],
  [["sarcasm"], "Sarcasm usually means the opposite of the words. They're probably annoyed or let down about something."],
  [["blameq","cannot","shouldhave"], "A \"why didn't you\" question is usually a complaint more than a question. Underneath, there's often a request for next time."],
  [["oblig","impera","should","urgent"], "It's worded as an order, but underneath it's usually a request."],
  [["hint","passiveag"], "There may be a request under the politeness. They might be hoping you'll offer to help."],
  [["ominous"], "An opener like this doesn't say the topic. It doesn't have to mean bad news, and it's fine to ask what it's about."],
  [["stonewall"], "They may need a break. A pause doesn't have to mean it's over."],
  [["guilt"], "They're probably feeling stretched thin, or that their effort isn't being seen."],
  [["madefeel","critic","again","past","compare","passive"], "They're unhappy about something that happened. It's about that, not all of who you are."],
  [["vemo"], "They expect you to know what's wrong. It's okay to say you don't, and to ask."],
  [["demand"], "They'd like a reply soon, and may be anxious. You're allowed to take a moment."],
  [["softno"], "\"We'll see\" or \"maybe\" can be a real maybe or a polite no. It's okay to ask which."],
  [["selfput"], "They're being hard on themselves. A kind word may help more than agreeing or arguing."],
  [["vtime","nowhen"], "The timing is open. If you need to know when, it's okay to ask."],
  [["jab"], "This sounds like hurt or frustration said as blame. Underneath, there's usually something they need."],
  [["motive"], "\"On purpose\" is their guess about your reasons. You can answer what happened without arguing about intent."],
  [["blunt"], "It's a correction, said bluntly. It's about the fact, not about you."],
  [["closer"], "They're saying this decision is theirs to make. It doesn't mean your view doesn't matter to them."],
  [["tic"], "They're asking you to stop something. If it's a stim or a tic, you can say so: it isn't a message to them."]
];
const RECEIVE_GOOD = {boundary:"They're setting a calm limit, with care in it. It's about what they need, not a threat to you.", disclose:"They're trusting you with something important about who they are. That's a reach toward you.", repair:"They're owning their part. That's a reach toward you.", appreciation:"There's warmth in it: thanks, or care.", istate:"They're telling you how it is for them, not a verdict on you.", clearask:"There's a clear request you can say yes, no or not yet to.", pause:"They want a pause, and they've said when they'll come back."};
const CROSSED = ["label","dxlabel","contempt","hostile","swear","violent","threat","legal","menace"];
/* their words, turned to face the person answering: "send me your notes" → "send you my notes" */
function turnAround(t){ const SW={me:"you",my:"your",mine:"yours",your:"my",yours:"mine",you:"me",myself:"yourself",yourself:"myself"}; return String(t).replace(/\b(me|my|mine|your|yours|you|myself|yourself)\b/gi, w=>SW[w.toLowerCase()]); }
function unq(s){ return String(s||"").replace(/^"|"$/g,""); }
function receive(an, opts){
  opts = opts||{};
  const has = id=>!!an.found[id];
  const found = an.staticIds.filter(id=>FBY[id] && !["period","long","nowhen"].includes(id)).map(id=>FBY[id].name);
  // a threat that would frighten or control: named plainly, with no reading that excuses it, and no "fix the tone" reply
  if(an.danger) return {crossed:true, danger:true, threat:true, head:["danger","This is a threat, not a tone problem."],
    meanings:["It's worded as a threat. That isn't okay, whatever was meant, and it isn't your job to fix how it was said.",
      "You don't have to answer it, and you don't have to do what it asks to keep the peace.",
      "If it frightens you, or it's part of a pattern (checking up on you, cutting you off from friends, threats), you deserve support. Free, private people can help, any time."],
    literal:[], replies:[{label:"Only if it feels safe to answer", text:"I've read this. I'm going to take some time before I reply."}], found};
  const crossed = CROSSED.some(has);
  const meanings = [];
  // the shapes testers met most: what it may mean, and a reply to the need underneath
  const rf = !crossed ? reframeOf(an, opts) : null;
  if(rf && rf.r.recv) meanings.push(rf.r.recv.mean);
  RECEIVE_MEANS.forEach(([ids, line])=>{ if(ids.some(has) && !meanings.includes(line) && !(rf && (ids.includes("hint") || ids.includes("vtime") || ids.includes("jab") || ids.includes("softno")))) meanings.push(line); });
  const ask = an.asks && an.asks[0] && !crossed && !(SHARED && SHARED.idioms && SHARED.idioms(an.asks[0].text).length) ? an.asks[0].text : "";
  if(ask && ["oblig","impera","should","hint","passiveag","blameq","cannot"].some(has)) meanings.push("The request underneath looks like: \u201c"+turnAround(ask).replace(/[.?!]+$/,"")+"\u201d.");
  if(!crossed) Object.keys(RECEIVE_GOOD).forEach(id=>{ if(has(id) && !(id==="clearask" && !ask) && meanings.length<5) meanings.push(RECEIVE_GOOD[id]); });
  // the header and the body agree: "plain message" only when nothing in the words was flagged
  if(!meanings.length) meanings.push(found.length ? "Some of the wording is sharper than it needs to be, but the point itself is plain. It's fine to answer the point." : "This reads as a plain message. It's probably fine to take it at face value, and it's always okay to ask if you're not sure.");
  const literal = SHARED && SHARED.idioms ? SHARED.idioms(an.text).map(x=>({text:x.text, means:x.means})) : [];
  const replies = [];
  const push = (label, text)=>{ if(text && !replies.some(r=>r.text===text)) replies.push({label, text}); };
  if(rf && rf.r.recv) push("Answer the need underneath", rf.r.recv.reply);
  if(crossed && has("legal") && !["label","dxlabel","contempt","hostile","swear","violent"].some(has)){
    push("Answer calmly, without the threat", "I've read this. I'd like us to sort out [the specific thing] between us first. Can we talk about it at [a time]?");
    push("Take time before you answer", "I've read this. I'm going to take some time before I reply.");
  }
  else if(crossed){
    push("Set a limit, calmly", "I want to sort this out, and I'm not okay being spoken to like that. Let's talk when we can both be calmer.");
    push("Take time before you answer", "I've read this. I'm going to take some time before I reply.");
  }
  literal.filter(x=>!/kill|murder|strangle/i.test(x.text)).slice(0,1).forEach(x=>push("Check the figure of speech", "When you said \u201c"+x.text.replace(/^./, c=>c.toLowerCase())+"\u201d, did you mean "+x.means.replace(/\s*\(.*\)$/,"")+"?"));
  if(an.safety){
    const th = an.safety.thing;
    push("Agree on a habit", "You're right, that wasn't safe. Can we find a way to make sure the "+th+" gets checked every time? Maybe a note by the door?");
  }
  if(has("kidsfirst")) push("Keep the kids out of it", "I'd like us to agree together on what we tell the kids. Can we talk about that at [a time]?");
  if(ask && !rf){
    const hasWhen = an.found.when || /\b(?:by|at|on|before|after)\s+\S/i.test(ask);
    push("Check the ask", "Just to check: you'd like me to "+turnAround(ask).replace(/[.?!]+$/,"")+(hasWhen ? "?" : ". By when?"));
  }
  if(has("brushoff")||has("minimal")) push("Ask which one they mean", "Do you mean it's really okay, or are you upset? Either is okay to say.");
  const order = ["jab","motive","blunt","closer","absolute","sarcasm","blameq","ominous","hint","passiveag","vemo","vtime","softno","stonewall","demand","guilt","critic","again","past","compare","madefeel","selfput"];
  if(!crossed) order.filter(has).forEach(id=>{ if(CHECK[id] && replies.length<(rf ? 2 : 4) && !(rf && ["vtime","hint","softno","jab"].includes(id))) push(id==="blunt"||id==="closer" ? "A calm answer" : "Check what they meant", unq(CHECK[id])); });
  if(crossed && replies.length<4 && (has("label")||has("dxlabel")||has("contempt"))) push("Ask for the real thing", "What's the specific thing that's bothering you?");
  const mild = found.length && an.staticIds.every(id=>MILD_IDS.includes(id) || ["period","long","nowhen"].includes(id));
  const head = crossed ? ["fight","Some of this crossed a line. You don\u2019t have to answer right now."]
    : found.length ? ["hurt", mild ? "This may sound a little sharper than they meant. Here\u2019s how to read it." : "This may sound harsher than they meant. Here are kinder ways to read it."]
    : (has("boundary") || has("disclose")) ? ["ok","This reads as a clear, caring message. It may still be hard to read, and that\u2019s okay."]
    : ["ok","This looks okay. Nothing here needs decoding."];
  return {crossed, head, meanings: meanings.slice(0,5), literal, replies: replies.slice(0,4), found};
}

/* ============================================================
   PLAIN WORDS FOR THE LABELS
   For a reader in a second language: what each pattern name means, in everyday words.
   Shown next to the name, never instead of the detail below it.
   ============================================================ */
const GLOSS = {
  sorrybut:"it turns the apology back into blame",
  oblig:"it sounds like an order", should:"it tells them what to do", shouldhave:"it blames them for the past",
  impera:"an order with no \"please\" or \"could you\"", cannot:"it sounds annoyed, not like a real question",
  blameq:"a question that really says \"it's your fault\"", label:"calling the person a name, like \"lazy\"",
  hostile:"it sounds angry or fed up", absolute:"words like \"always\" and \"never\" leave no room for the times it went fine",
  madefeel:"it blames them for how you feel", compare:"saying someone else does it better",
  past:"bringing back an old problem", again:"words that say \"this keeps happening\"",
  threat:"\"do this or else\"", guilt:"it tries to make them feel guilty",
  passive:"it hides who did what", disclaim:"a soft start before a hard hit, like \"no offense, but\"",
  minim:"small words that can sound dismissive, like \"just\" or \"obviously\"", intens:"strong words that add heat, like \"seriously\"",
  urgent:"\"now\" or \"ASAP\" with no reason", vtime:"no clear time", vstd:"they can't tell what \"done\" looks like",
  ominous:"a start that sounds serious but doesn't say what about", hint:"a hint, not a clear question",
  pointed:"a polite phrase that can sound annoyed", nudge:"a follow-up that doesn't say what it's about",
  heat:"words that show you're fed up", sarcasm:"it may mean the opposite of the words",
  idiom:"a saying that doesn't mean what the words say", contempt:"it can sound like you look down on them",
  passiveag:"anger said in a hidden way", stonewall:"it ends the talk without saying when you'll come back",
  minimal:"a very short answer that can sound cold", period:"in a text, a full stop on a short reply can sound cold",
  ellipsis:"\"...\" can sound like something is left unsaid", shout:"capital letters or \"!!!\" read as shouting",
  calm:"telling someone how to feel", invalid:"saying their feelings are wrong",
  multi:"many requests at once", long:"a lot to read at once", questions:"many questions at once",
  critic:"it finds fault with them", reassure:"asking them to say things are okay",
  vemo:"a feeling without saying what happened", feellike:"an opinion about them, not a feeling",
  feelingq:"a big feelings question that can be hard to answer", hyper:"an exaggeration",
  joke:"a joke sign that can hide the real message", tone:"commenting on their face or voice",
  demand:"asking for an answer right away", butc:"praise, then \"but\"",
  already:"it says \"I told you before\"", hedge:"an unsure answer", softno:"a \"no\" that sounds like \"maybe\"",
defend:"explaining yourself before they've blamed you", stopask:"\"stop asking\"", tic:"commenting on a movement or sound they may not control",
  nowhen:"a request with no time", brushoff:"it can sound like you don't care, or like quiet hurt; ask which",
  dxlabel:"a diagnosis used as an insult", violent:"violent words, even as a joke",
  selfput:"you put yourself down", legal:"a threat about court or the children",
  kidsfirst:"the children were told before the adults talked", overhedge:"so soft the request gets lost",
  count:"counting how many times it happened", excuse:"it asks them to accept the miss, so fixing it becomes their job"
};
/* The heading for one pattern, in words: never a name with a stray quoted word stuck on the end.
   A safety worry names the thing it is about: "A safety worry about the stove, with no plan for next time". */
function title(id, words, an){
  const f = FBY[id]; if(!f) return String(id||"");
  if((id==="safety" || id==="safeask") && an && an.safety && an.safety.thing) words = [an.safety.thing].concat(words||[]);
  const w = (words||[]).filter(Boolean).map(x=>String(x).toLowerCase().replace(/[.,;:!?]+$/,""))[0];
  if(id==="safeask") return w ? "A safety worry about the "+w.replace(/^(?:the|your|my|our)\s+/,"")+", with no plan for next time" : "A safety worry with no plan for next time";
  if(id==="safety"){
    const th = w && (w.match(new RegExp("\\b("+SAFE_THING+")\\b","i"))||[])[1];
    return th ? "A real safety concern about the "+th.toLowerCase() : f.name;
  }
  // a name built from example words ("Again," "still," "even") would show words that aren't in the message,
  // so when the message's own words are shown beside it, the name says what the words do instead
  if(w && PLAIN_TITLE[id]) return PLAIN_TITLE[id];
  if(id==="absolute") return w && /^(?:always|never|everything|nothing|constantly|forever|everyone|everybody|nobody)$/.test(w) ? "The word \u201c"+w+"\u201d" : f.name;
  if(w && /\s*\([^)]*["“][^)]*\)\s*$/.test(f.name)) return f.name.replace(/\s*\([^)]*["“][^)]*\)\s*$/, "");
  return f.name;
}
const PLAIN_TITLE = {again:"Words that point at a pattern", should:"Telling them what they should do", cannot:"Asking them what not to do", already:"Pointing out you said it before", stopask:"Telling them to stop asking"};
/* Plain-word gloss for a pattern, or "" when the name already says it */
function gloss(id){ return GLOSS[id] || ""; }
/* One plain sentence at the top of a result. It agrees with the score and the flags:
   ok = will probably land okay, hurt = might hurt, fight = will likely start a fight. */
/* "Say it in simpler English": the suggested words again, in short sentences with common words, for a reader
   in a second language. It only re-says what the rewrite says: no new facts, and blanks in [brackets] stay as they are.
   "Lately it's felt like you're correcting me with the baby a lot. It doesn't feel respectful to me as her mother.
    Could you let me handle it my way, and tell me later if you disagree?"
   -> "You correct me with the baby a lot. It does not feel respectful. I am her mother.
       Please let me do it my way, and talk to me later if you disagree." */
const SIMPLE_CONTRACT = [[/\bcan't\b/gi,"cannot"],[/\bwon't\b/gi,"will not"],[/\bshan't\b/gi,"shall not"],[/\b(\w+)n't\b/gi,"$1 not"],
  [/\bI'm\b/g,"I am"],[/\bi'm\b/g,"I am"],[/\b(you|we|they)'re\b/gi,"$1 are"],[/\b(it|that|there|what|here|he|she|this)'s\b(?! (?:been|got))/gi,"$1 is"],
  [/\b(it|that|there|he|she)'s (been|got)\b/gi,"$1 has $2"],[/\b(I|you|we|they)'ve\b/gi,"$1 have"],[/\b(I|you|we|they|he|she|it|that)'ll\b/gi,"$1 will"],
  [/\b(I|you|we|they|he|she)'d (like|love|prefer|rather)\b/gi,"$1 would $2"],[/\blet's\b/gi,"let us"]];
const SIMPLE_SWAP = [[/\bhandle it\b/gi,"do it"],[/\btell me later\b/gi,"talk to me later"],[/\bfigure out\b/gi,"find"],[/\bsort (?:this|it) out\b/gi,"fix this"],
  [/\bgo over\b/gi,"talk about"],[/\bcheck in\b/gi,"talk"],[/\bat the moment\b/gi,"now"],[/\bso that\b/gi,"so"],[/\bfeel free to\b/gi,"you can"]];
function simpler(text){
  let t = String(text||"").replace(/\s+/g," ").trim(); if(!t) return "";
  const keep = []; t = t.replace(/\[[^\]]*\]/g, m=>{ keep.push(m); return "\u0001"+(keep.length-1)+"\u0002"; });
  t = t.replace(/[’‘]/g,"'");
  // "Lately it's felt like you're correcting me…" -> "You correct me…"
  t = t.replace(/\b(?:lately |recently )?it's (?:felt|seemed) like you're (\w+ing)\b/gi, (m,v)=>"you "+ingBase(v));
  t = t.replace(/\b(?:lately |recently )?it's (?:felt|seemed) like\s+/gi, "I feel that ");
  SIMPLE_CONTRACT.forEach(([a,b])=>{ t = t.replace(a,b); });
  SIMPLE_SWAP.forEach(([a,b])=>{ t = t.replace(a,b); });
  // "…respectful to me as her mother." -> "…respectful. I am her mother."
  t = t.replace(/\s+(?:to me\s+)?as (her|his|their|your|our|the kids'|a) (mother|father|mom|mum|dad|parent|partner|wife|husband|friend|sister|brother)\b([^.!?]*)([.!?])/gi,
    (m,a,b,rest,end)=>(rest.trim() ? " "+rest.trim() : "")+". I am "+a.toLowerCase()+" "+b.toLowerCase()+end);
  // a request: "Could you X?" -> "Please X."
  t = t.replace(/(^|[.!?]\s+)(?:could|can|would|will) you (?:please )?([^?]+)\?/gi, (m,p,body)=>p+"Please "+body.trim()+".");
  // one idea per sentence: split at ", and that…", ", but…", "; "
  t = t.replace(/,\s+and (that|it|this|I|we|they|he|she) /g, (m,w)=>". "+(w==="I"?"I":w.charAt(0).toUpperCase()+w.slice(1))+" ");
  t = t.replace(/,\s+but /g, ". But ").replace(/;\s+/g, ". ");
  t = t.replace(/(^|[.!?]\s+)([a-z])/g, (m,p,c)=>p+c.toUpperCase()).replace(/\bi\b/g,"I").replace(/\s+([.,!?])/g,"$1").replace(/\.\./g,".");
  t = t.replace(/\u0001(\d+)\u0002/g, (m,i)=>keep[+i]);
  return t.trim();
}
/* A reassurance that names "you" only to say it isn't about them: never taken out, never left as a dangling "not" */
const NEG_REASSURE = /\b(?:not|isn't|wasn't|never|nothing to do with)\s+(?:(?:because|about|due to)\s+(?:of\s+)?)?(?:you|your fault)\b|\bit's not (?:you|your fault)\b|\bnot your fault\b/i;
/* Patterns that make a message an attack, not just a fair worry said directly */
const ATTACK_IDS = ["menace","jab","motive","label","contempt","swear","hostile","sarcasm","compare","dxlabel","violent","threat","legal","kidsfirst","guilt","madefeel","passiveag","heat","shout","blameq","critq","shouldhave","vemo","feellike","invalid","calm"];
/* A fair concern at the core (a safety worry), with no put-down, threat or heat around it.
   A direct sender said it plainly on purpose: the headline says so, and doesn't make the directness the problem. */
function fairConcern(an){ return !!(an && an.safety && !ATTACK_IDS.some(id=>an.found && an.found[id])); }
/* A reply to a message that may carry hurt ("Fine. Whatever works for you."), with nothing in it that shows the hurt
   was heard: the words can be clear and still miss. */
const HURT_IN = ["jab","brushoff","minimal","guilt","sarcasm","passiveag","absolute","critic","label","stonewall","again","hostile","contempt","vemo","madefeel","blameq"];
const ACK_RE = /\b(?:i hear you|i get (?:it|that|why)|it sounds like|sounds like you|i'm sorry|i am sorry|sorry|you're right|that's fair|fair enough|makes sense|i understand|i miss (?:you|our|it|talking)|i know you|i can tell|i can see)\b/i;
function replyMissesHurt(an, prev){
  if(!prev || !an) return false;
  const pv = analyze(prev, {channel: an.channel});
  return HURT_IN.some(id=>pv.found[id]) && !ACK_RE.test(an.norm);
}
/* wording that's only a little loud or loose: "might hurt" would overstate it */
const MILD_IDS = ["shout","intens","minim","period","dots","softno","hedge","vtime","nowhen","overhedge","long","questions","idiom","urgent","multi","vstd","reqmaybe"];
function verdict(an, sc, rw, opts){
  const listener = (opts && String(opts.listener||"").trim()) || "them";
  if(!an || !an.norm || !an.norm.trim() || (rw && rw.gibberish)) return {id:"none", text:"This doesn't look like a sentence yet. Type what you'd really say."};
  const lvl = sc && sc.level ? sc.level[0] : "clear";
  const soft = rw && !rw.unchanged;
  // a threat that would frighten or control the other person: said plainly, before anything else
  if(an.danger || (an.found && an.found.menace)) return {id:"danger", text:"This is a threat, not a tone problem."};
  const attack = ATTACK_IDS.concat(["swear","hostile","legal","kidsfirst","violent","threat","dxlabel"]).some(id=>an.found && an.found[id]);
  // a calm boundary, or coming out: caring, never "a threat" or "might hurt"
  if((an.found.boundary || an.found.disclose) && !attack && lvl!=="heavy")
    return {id:"ok", care:true, text: an.found.boundary ? "This is a clear, caring boundary. It may still be hard to hear, and that's not your fault." : "This is a clear, caring way to share something important. It may still be hard for them to hear, and that's not your fault."};
  // a real apology in it: the headline says so, gently, for a listener who is sensitive to criticism too
  const sorry = an.apology && !an.found.legal && !an.found.kidsfirst && !an.found.violent && !an.found.threat;
  if(sorry && (lvl==="heavy" || (lvl==="some" && !(sc.level[1]||"").match(/little/i))))
    return {id:"hurt", apology:true, text: soft ? "Some of this may land harder than you mean. Here's a version that keeps your apology." : "Some of this may land harder than you mean. The notes below show which part."};
  const work = !!(opts && (opts.work || WORK_REL.includes(opts.rel)));
  if((an.found.legal || an.found.kidsfirst || an.found.violent || an.found.threat || lvl==="heavy") && work && !an.found.legal && !an.found.kidsfirst && !an.found.violent)
    return {id:"fight", work:true, text: soft ? "This may land as blame or an order. Try the version below." : "This may land as blame or an order. The notes below show why."};
  if(an.found.legal || an.found.kidsfirst || an.found.violent || an.found.threat || lvl==="heavy")
    return {id:"fight", text: soft ? "This will likely start a fight. Try the softer version below." : "This will likely start a fight. The notes below show why."};
  // blame said as a dig, or keeping score: never "probably okay"
  if(an.found.jab || (an.found.motive && lvl!=="clear"))
    return {id:"hurt", jab:true, text: "This may land as blame or a dig. "+(soft ? "Here's a kinder way to say it that keeps what you need." : "The notes below show why.")};
  // "That is incorrect.": clear, and it may land cold
  if(an.found.blunt && !attack)
    return {id:"hurt", blunt:true, text: "This is clear, but it may land a bit cold. "+(soft ? "Here's a plain alternative." : "The notes below show why.")};
  // "We'll decide ourselves": fair, and it can sound like a closed door
  if(an.found.closer && !attack)
    return {id:"hurt", closer:true, text: "This is fair, and it may still sound like a closed door. "+(soft ? "Here's a warmer way to say the same thing." : "The notes below show why.")};
  if(lvl==="some" && !(sc.level[1]||"").match(/little/i) && fairConcern(an))
    return {id:"hurt", fair:true, text: "Your worry is fair and worth saying plainly. "+(soft ? "Here's a version that keeps your words direct and lands easier for "+listener+"." : "The notes below show which words may land hard.")};
  if(lvl==="some" && !(sc.level[1]||"").match(/little/i) && work)
    return {id:"hurt", work:true, text: "This may land as blame. "+(soft ? "Here's a clearer way to say it." : "The notes below show why.")};
  if(lvl==="some" && !(sc.level[1]||"").match(/little/i))
    return {id:"hurt", mild: !attack && an.staticIds.every(id=>MILD_IDS.includes(id)), text: (an.safety ? "Your worry is fair, but this might hurt. " : !attack && an.staticIds.every(id=>MILD_IDS.includes(id)) ? "This may come across sharper than you mean. " : "This might hurt. ")+(soft ? (!attack && an.staticIds.every(id=>MILD_IDS.includes(id)) ? "Here's a gentler way to say it." : "Here's a softer way to say it.") : "The notes below show why.")};
  if(opts && opts.replyTo && replyMissesHurt(an, opts.replyTo))
    return {id:"hurt", reply:true, text: "Clear words. Add one line about what you heard first, for example: \u201cSounds like you're fed up with me cancelling. It's work, not you. Call Sunday at 7?\u201d"};
  if(an.staticIds && an.staticIds.length)
    return {id:"ok", text: "This will probably land okay."+(soft ? " A small change below could make it even clearer." : "")};
  return {id:"ok", text:"This will probably land okay."};
}

const api = {replyMissesHurt, meantSelf, SELF_MEANT, receive, fairConcern, simpler, PLAIN: PLAIN_WORDS, F, FBY, NT, CHECK, CHANGE_WHY, GLOSS, title, gloss, verdict, analyze, detect, readings, rewrite, score, entry, splitSentences, commandOf, baseVerb, norm, chBase, shoutSpans, WRITTEN, ACRONYMS};
if(typeof module!=="undefined" && module.exports) module.exports = api; else root.SignalEngine = api;
})(typeof window!=="undefined" ? window : this);
