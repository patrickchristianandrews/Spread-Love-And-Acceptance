/* message-patterns.js — one shared list of what the message tools look for.

   The Signal Translator, the Carrier Wave Decoder's tone check and the Conversation Reader
   all read wording with this list, so the same words get the same reading in every tool.
   Everything runs in the visitor's browser. Nothing typed is saved or sent anywhere.

   It reads words only. It can't hear a voice, see a face or know two people's history,
   so every mark is a "may land as", never a verdict on the person who wrote it.

   TOLPatterns.LIST            the patterns: {id, name, group, heat, good, what, fix, ex}
   TOLPatterns.scan(text)      -> [{id, start, end, text}], overlaps resolved (longest wins)
   TOLPatterns.has(text, id)   -> true when that pattern is in the text
   TOLPatterns.hasTime(text)   -> a real time or day ("by 8", "Friday", "tonight", "in 20 minutes")
   TOLPatterns.hasAppreciation(text) -> thanks, "love you", "I appreciate", not the sarcastic kind
   TOLPatterns.isFlat(text)    -> a very short reply ("ok", "k", "fine.")
   TOLPatterns.spell(text)     -> {text, fixes:[{from, to}]}: common misspellings read as the word meant
   TOLPatterns.lookFor(el, opts) fills el with the plain-language "What it looks for" list */
(function (root) {
  'use strict';

  var DAYS = '(?:mon|tues|wednes|thurs|fri|satur|sun)day';
  var TIME_RE = new RegExp(
    '\\b(?:by|at|before|after|until|around|from|on)\\s+(?:\\d{1,2}(?::\\d{2})?\\s*(?:a\\.?m\\.?|p\\.?m\\.?|o\'clock)?|noon|midnight|tonight|tomorrow|today|' + DAYS + '|the weekend|dinner|lunch|breakfast|bedtime|pickup|the end of (?:the )?(?:day|week|month))\\b' +
    '|\\b(?:tonight|today|tomorrow|this (?:morning|afternoon|evening|week|weekend)|next (?:week|month|' + DAYS + ')|' + DAYS + 's?|in (?:\\d+|an?|ten|five|fifteen|twenty|thirty|a few|two|three) (?:minutes?|mins?|hours?|days?)|after (?:dinner|lunch|breakfast|work|school|the kids are (?:down|asleep|in bed))|before (?:bed|dinner|work|school))\\b' +
    '|\\b(?:for |need |take |give me |in )?(?:an?|one|two|three|\\d+|a few|ten|twenty|thirty|fifteen|five) (?:hours?|minutes?|mins?)\\b' +
    '|\\b\\d{1,2}(?::\\d{2})?\\s*(?:a\\.?m\\.?|p\\.?m\\.?)(?![a-z])|\\b(?:eod|end of (?:the )?day|close of business)\\b', 'i');

  // Each pattern's regular expression is written for lower-cased text with curly quotes made straight.
  var LIST = [
    { id: 'sarcasm', name: 'Sarcasm', group: 'edge', heat: 2,
      re: /\b(?:wow,? (?:thanks|thank you|great|nice|ok(?:ay)?|real(?:ly)? (?:nice|helpful|great)|just wow)|thanks for nothing|thanks a lot(?= *(?:[.!…🙄😒🙃]|$))|gee,? thanks|nice of you to (?:finally )?\w+|(?:how|so) (?:nice|good|kind|thoughtful|sweet) of you to (?:finally )?\w+|must be nice|sure you (?:did|are|will|do)|yeah,? right|oh,? (?:great|wonderful|perfect|lovely|fantastic|joy)(?= *(?:[.!,…🙄😒🙃]|$))|what a surprise|big surprise|real mature|(?:great|nice|good) job,? (?:really|genius)|lol,? ok(?:ay)?,? (?:whatever|sure|then)|whatever you say|love that for (?:me|us)|good for you(?= *(?:[.!…🙄😒🙃]|$))|glad you could (?:finally )?(?:make it|join us|show up)|of course (?:you|he|she|they) (?:did|didn't|do|don't|would|wouldn't|forgot|are|were|can't|won't)|classic you|typical(?: you)?(?= *(?:[.!…🙄😒🙃]|$))|yeah,? sure(?= *(?:[.!…🙄😒🙃]|$))|sure,? whatever)/g,
      what: 'Sarcasm says the opposite of the words, and the real meaning rides on tone. In writing the tone is missing, so the reader fills it in with the worst version.',
      fix: 'Say the real thing plainly, once: “I was hurt that you were late.”',
      ex: ['Wow, thanks for nothing.', 'Nice of you to finally show up.', 'Must be nice.', 'lol ok whatever you say 🙄'] },
    { id: 'contempt', name: 'Eye-roll or put-down', group: 'edge', heat: 3,
      re: /🙄|😒|\b(?:grow up|get a life|are you (?:serious|kidding me)|you can't be serious|unbelievable|pathetic|what is wrong with you|what's wrong with you|who does that|you're a joke|give me a break|oh please|spare me|as if|you wish|cry me a river|boo hoo|here we go again|not this again)\b/g,
      what: 'An eye-roll, mocking or a put-down says “I look down on you,” which hurts more than a complaint and is very hard to answer calmly.',
      fix: 'Drop the jab and say the complaint underneath it, about the thing, not the person.',
      ex: ['Grow up.', 'Are you serious right now 🙄', 'Here we go again.'] },
    { id: 'passive', name: 'Passive-aggressive edge', group: 'edge', heat: 2,
      re: /\bsome of us(?: (?:actually|like|have|need|work|care|still|were|are|had|do|clean))?\b|\bi guess i(?:'ll| will) [^.!?\n]{2,60}?(?:again|myself|since (?:nobody|no one|no-one) else (?:will|does|is going to|can|bothers))\b|\bsince (?:nobody|no one|no-one) else (?:will|does|is going to|can|bothers|seems to)\b|\b(?:fine|ok(?:ay)?|it's fine|no worries),? i(?:'ll| will) (?:just )?do it(?: myself)?\b|\bi(?:'ll| will) just do it myself\b|\bno need to be (?:rude|like that|snippy|so \w+)\b|\bnot that (?:you|anyone|anybody) (?:would )?(?:care|cares|noticed?|asked)\b|\bdon't worry about me\b|\bif it's not too much (?:trouble|to ask)\b|\bthanks for (?:finally )?(?:noticing|letting me know|telling me now|the heads up)(?= *(?:[.!…🙂🙄]|$))|\b(?:i'm )?not mad,? just (?:disappointed|saying)\b|\bjust saying\b|\bnoted\.(?=\s*$)/g,
      what: 'A complaint wrapped in politeness (“some of us”, “I guess I’ll do it again”) says two things at once. The reader hears the edge and has no clear ask to answer.',
      fix: 'Make the ask directly: “Could you do the dishes tonight? I’ve done them all week.”',
      ex: ['SOME of us like having clean dishes 🙂', 'I guess I’ll plan the trip again since nobody else will.', 'No need to be rude.'] },
    { id: 'pointed', name: 'Pointed work phrase', group: 'edge', heat: 1.5,
      re: /\b(?:(?:as )?per my (?:last|previous|earlier) (?:message|email|e-mail|note|text|comment|reply|slack)|as (?:previously|already) (?:stated|mentioned|discussed|noted|said|communicated|explained)|as i (?:said|mentioned|stated|noted|explained) (?:before|earlier|already|previously|above)|as i (?:already|previously) (?:said|stated|mentioned|noted|explained)|friendly reminder|gentle reminder|going forward,? please|please advise|to reiterate|reiterating)\b/g,
      what: 'At work, “per my last email” and “as previously stated” are widely read as “you didn’t read it.” The fact gets through, and so does the edge.',
      fix: 'Drop the pointer and restate the fact: “To recap: the deck is due at 5 today.”',
      ex: ['Per my last email, I need this ASAP.', 'As previously stated, the deadline is Friday.'] },
    { id: 'compare', name: 'Comparison to someone else', group: 'blame', heat: 2,
      re: /\b(?:your|my) (?:sister|brother|mom|mum|mother|dad|father|ex|friend|friends|boss|coworker|co-worker|parents|cousin|neighbou?r|roommate|colleague|best friend)\b[^.!?\n]{0,40}?\b(?:would(?:n't)?|always|never|does|doesn't|did|can|could|knows|manages|remembers|helps|gets|has|at least)\b|\bwhy can't you be (?:more )?like\b|\b(?:be|act) (?:more )?like (?:your|my|a normal|other|everyone)\b|\bunlike (?:you|your \w+)\b|\bat least (?:your|my) (?:sister|brother|mom|mum|dad|ex|friend|roommate|coworker) \w+/g,
      what: 'A comparison moves the topic from the task to the person’s worth and brings in a third person. The reader hears “you’re not good enough.”',
      fix: 'Leave the other person out. Say what you’d like from this person, about this thing.',
      ex: ['Your sister always calls on Sundays.', 'Why can’t you be more like your brother?'] },
    { id: 'absolute', name: 'Always / never', group: 'blame', heat: 1.5,
      re: /\b(?:always(?! (?:love|be (?:here|there|on your side)|have your back|grateful|thankful|appreciate|welcome|remember (?:how|the|when)|proud|happy to|glad to|there for))|never(?! (?:mind|forget (?:this|that|how|what you)|stop (?:loving|caring)|been happier|felt so (?:loved|happy|seen)))|every (?:single )?time|constantly|all the time|not once|not even once|nothing ever|no one ever|nobody ever|every single day|nobody (?:else )?(?:cares|helps|listens|does anything|bothers|ever)|no one (?:else )?(?:cares|helps|listens|does anything|bothers)|everyone else (?:does|can|manages|knows|gets|has)|you (?:do|did) nothing|you don't do anything|i (?:have to|always|got to|gotta|end up|'m left to) (?:do(?:ing)?|clean(?:ing)?|handle|handling) everything|everything around here|every single thing)\b/g,
      what: '“Always” and “never” turn one moment into a verdict on everything. The reader remembers the exception and argues with that, and the point gets lost.',
      fix: 'Name the specific time instead: “twice this week” or “on Tuesday.”',
      ex: ['You never help.', 'Nobody ever listens to me.'] },
    { id: 'dismiss', name: 'Dismissing a feeling', group: 'blame', heat: 2.5,
      re: /\b(?:calm down|just relax|chill out|you're overreacting|you are overreacting|you're (?:too|so) sensitive|you're being dramatic|not a big deal|no big deal|get over it|if you say so|ok whatever|whatever(?= *(?:[.!…🙄😒]|$))|i don't care|stop being so \w+|you're imagining (?:it|things)|it was (?:just )?a joke|can't you take a joke)\b/g,
      what: '“Calm down,” “whatever” or “you’re overreacting” tell the reader their feeling doesn’t count. They usually raise the heat.',
      fix: 'Say what you can see, even if you see it differently: “I can tell this matters to you.”',
      ex: ['Calm down.', 'You’re overreacting.', 'Whatever.'] },
    { id: 'stonewall', name: 'Shutting the door', group: 'door', heat: 2,
      re: /^\s*(?:\.{3,}|…)\s*$|\b(?:not now|i (?:just |really |honestly )?can't do this(?: right now| anymore| today| tonight)?|i (?:just )?can't talk (?:about this )?(?:right )?now|i'm done(?: talking)?(?: about (?:this|it))?|i am done|leave me alone|forget it|never ?mind|i don't want to talk(?: about (?:it|this))?|i have nothing (?:more )?to say|stop (?:texting|messaging|calling) me|don't (?:text|talk to|call) me|i give up|it doesn't matter|doesn't matter)\b/g,
      what: '“Not now,” “forget it” or a silent “…” can mean someone is flooded and needs a break. Without a time to come back, the other person hears “this is over” or “you don’t matter.”',
      fix: 'Keep the pause, and add when you’ll come back: “I can’t do this right now. Can we talk at 8?”',
      ex: ['…', 'Not now.', 'I just can’t do this right now.'] },
    { id: 'flat', name: 'Very short reply', group: 'door', heat: 1, whole: true,
      re: /^\s*(?:k|kk|ok|okay|fine|sure|noted|cool|yep|yup|mhm|nvm|whatever|if you say so|got it)\s*[.!]*\s*$/,
      what: 'A one-word reply can mean “got it, busy” or “I’m upset.” The word is the same, so the reader has to guess, usually from their own mood.',
      fix: 'Add the missing half: “Ok, sounds good!” or “Ok. I need a minute, I’ll reply properly tonight.”',
      ex: ['k', 'fine.', 'ok.'] },
    { id: 'swear', name: 'Swearing', group: 'edge', heat: 2.5,
      re: /(?:\bf+[*\-_.@#]*u+[*\-_.@#]*c+[*\-_.@#]*k+\w*|\bf\*+\w*|\bf[*\-_.]?ck\w*|\bfu?k+(?:in[g']?|ing|n|ed|er|ers|s)?\b|\bfkn\b|\bf[*]?kin[g']?\b|\bfreakin[g']?\b|\bfrickin[g']?\b|\beff(?:ing|in)\b|\bsh[i1!*]+t+\w*|\bbull ?sh[i1!*]t\w*|\bb[i1*]+tch\w*|\ba[s$*]{2}(?:hole|holes|hat)?\b|\barse(?:hole)?\b|\bgod ?damn\w*|\bdamn(?:ed|it)?\b|\bdammit\b|\bcrap(?:py)?\b|\bpiss(?:ed|ing)?(?: off)?\b|\bdick(?:head)?s?\b|\bbastards?\b|\bc[u*]nts?\b|\bprick\b|\bdouche\w*|\bmother ?f\w*|\bwtf\b|\bstfu\b|\bffs\b|\bomfg\b|\bjfc\b|\bthe hell\b|\bhell no\b|\bhell(?=\s*(?:[,.!?]|$))|\bgo to hell\b|\bscrew (?:you|this|that|off|it|him|her|them)\b|[@#$%&*]{3,})/g,
      what: 'Swearing, even the starred-out kind, turns up the volume. The reader hears the anger first, and often stops reading for the point.',
      fix: 'Leave the swear words out and name the feeling instead: “I’m really frustrated right now.”',
      ex: ['You are getting on my last f*cking nerve.', 'wtf is wrong with you'] },
    { id: 'hostile', name: 'Hostile or fed-up line', group: 'edge', heat: 3,
      re: /\b(?:(?:getting|get|got|gets|getting right) on my (?:last |every |one )?(?:[a-z*]+ )?nerves?|on my last (?:[a-z*]+ )?nerve|(?:i'm|i am|im) (?:so |sooo+ |really |just |totally |[a-z]*ing )?(?:done|finished|through) with (?:you|this|it|your \w+|us)|(?:you're|you are|youre|ur) (?:really |seriously |[a-z]*ing )?driving me (?:crazy|nuts|insane|mad|up the wall|bananas)|shut (?:up|the [a-z*]+ up|your (?:mouth|face))|(?:i )?can't stand (?:you|this|it|your|being around you)|i (?:really )?hate (?:you|this|it|your|when you|how you|living with you|everything about)|(?:i'm|i am|im) (?:so |really )?sick (?:and tired )?of (?:you|this|your|it)|get (?:out of my (?:face|sight|way)|lost|a grip)|go away|leave me the [a-z*]+ alone|piss off|go to hell|bite me|drop dead|you disgust me|you make me sick|(?:what|wtf) (?:the [a-z*]+ )?is (?:wrong|the matter) with you|are you (?:stupid|an idiot|deaf|blind|out of your mind|kidding me)|i don't give a [a-z*]+|who (?:the [a-z*]+ )?cares|do whatever you (?:want|like)|(?:i'm|i am|im) (?:so )?over (?:it|this|you)|enough is enough|i've had (?:it|enough)|you're impossible|you never shut up|zip it|back off|mind your own business)\b/g,
      what: 'A fed-up or hostile line (“you’re getting on my last nerve”, “shut up”, “I’m done with you”) says how angry you are, but not what you need. The reader can only defend themselves or pull away.',
      fix: 'Say the feeling and the need, and take a break if you need one: “I’m really frustrated. I need a few minutes, then can we talk about the dishes?”',
      ex: ['You are getting on my last nerve.', 'Shut up.', 'I’m so done with you.'] },
    { id: 'label', name: 'Name-calling or a label', group: 'blame', heat: 3,
      re: /\b(?:you(?:'re| are| were|re|r)?|ur|youre) (?:(?:such|so|just|really|being|acting like|literally|always|the|a|an|total|complete|absolute|utter|real|huge|massive|[a-z]*ing|[a-z]*in') )*(?:idiot|moron|jerk|loser|slob|pig|brat|baby|child|joke|nightmare|disaster|failure|disappointment|liar|psycho|lunatic|narcissist|selfish|lazy|useless|pathetic|stupid|dumb|worthless|hopeless|clueless|incompetent|ridiculous|childish|immature|insane|crazy|toxic|ungrateful|spoiled|entitled|heartless|cruel|a mess|a waste of (?:space|time)|(?:terrible|awful|horrible|lousy|worst|sorry excuse for an?) (?:parent|mother|father|mom|mum|dad|partner|husband|wife|boyfriend|girlfriend|friend|person|roommate|boss|coworker|brother|sister|son|daughter|human being))\b|\b(?:i'm|i am|im) the only (?:adult|grown[- ]?up|responsible (?:one|person)|one (?:who|that) (?:does|cares|tries|cleans|works|helps|pays)\w*)\b|\byou (?:idiot|moron|jerk|slob|loser|pig)\b/g,
      what: 'A word about who someone is (“lazy”, “a nightmare”, “the only adult here”) turns one moment into a verdict on the person. People defend against a verdict instead of hearing what happened.',
      fix: 'Name what happened and how it affected you, not what kind of person they are.',
      ex: ['You are a total nightmare.', 'I’m the only adult here.'] },
    { id: 'hint', name: 'Hint instead of an ask', group: 'edge', heat: 1.5,
      re: /\bit(?:'d| would) be (?:nice|great|good|lovely|helpful|amazing) if (?:someone|somebody|anyone|you|people|the)\b|\b(?:someone|somebody) (?:should|needs to|could|has to|might want to) [a-z]+|\bi wish (?:someone|somebody|anyone) would\b|\bmust be nice to [a-z]+/g,
      what: 'A hint (“it would be nice if someone helped”) puts the request in the subtext. Some readers decode it; others hear a complaint with nothing they can say yes to.',
      fix: 'Ask directly, with a when: “Could you take the bins out tonight?”',
      ex: ['It would be nice if someone helped around here.'] },
    { id: 'opener', name: 'Opener with no topic', group: 'door', heat: 1.5,
      re: /\b(?:we|i) (?:need|have) to (?:talk|chat)(?! about| at| tonight| tomorrow| later| after| when| once)\b|\bcan we talk(?= *[?.!]|$)|\bwe need to have a (?:talk|chat|conversation)(?! about)\b/g,
      what: '“We need to talk” signals weight but not the topic. The reader fills the gap, often with the worst case, until the talk happens.',
      fix: 'Say what it’s about and how big it is: “Can we talk tonight about the budget? Nothing bad, I just want to plan.”',
      ex: ['We need to talk.'] },
    // what's working
    { id: 'pause', name: 'A pause with a time to come back', group: 'good', good: true, heat: -2,
      what: 'Asking for a break and saying when you’ll return lets both people settle without either one feeling dropped.',
      ex: ['I can’t do this right now. Can we talk at 8?'] },
    { id: 'time', name: 'A real time', group: 'good', good: true, heat: -0.5,
      what: 'A real time (“by Friday”, “at 8”, “tonight”) turns a hope into a plan everyone can see.',
      ex: ['Could you call the landlord by Friday?'] },
    { id: 'appreciation', name: 'Appreciation', group: 'good', good: true, heat: -1,
      re: /\b(?:thank you(?! for nothing)|thanks(?! a lot(?= *(?:[.!…🙄😒🙃]|$))| for nothing)|thx|ty|i appreciate|appreciate (?:it|you|that|this)|i'm grateful|grateful for|love you|i love (?:that|how|it when|you)|it means a lot|that helped|you're (?:the best|amazing|a star)|well done|proud of you)\b|❤️|❤|💕|🫶|🥰|😘/g,
      what: 'Thanks and warmth tell the reader they aren’t only being corrected, which makes the rest easier to hear.',
      ex: ['Thanks for grabbing the groceries!', 'Love you!'] }
  ];
  var BY = {};
  LIST.forEach(function (p) { BY[p.id] = p; });

  // ---------------------------------------------------------------- forgiving spelling
  // Common misspellings, read as the word most people mean, so a typo never changes a reading
  // ("you're allways late" reads the same as "you're always late"). Lowercase, whole words only.
  // Professor Puddles uses the same list: tools/chat/build_kb.py copies the JSON between the
  // SPELL markers into the chat's knowledge base, so keep that part plain JSON.
  /* SPELL-START */
  var SPELL = {
    "allways": "always", "alwyas": "always", "alwasy": "always", "allway": "always", "alway": "always", "alwys": "always", "allwais": "always",
    "nevr": "never", "nevar": "never", "neva": "never", "evry": "every", "everytime": "every time", "evrything": "everything", "everthing": "everything",
    "anyting": "anything", "anythin": "anything", "nothin": "nothing", "nuthing": "nothing", "somthing": "something", "sumthing": "something", "somethin": "something",
    "sory": "sorry", "soory": "sorry", "sorrry": "sorry", "sorri": "sorry",
    "wen": "when", "wat": "what", "wut": "what", "wht": "what", "wich": "which", "wher": "where", "whare": "where",
    "becuase": "because", "becasue": "because", "becos": "because", "becouse": "because", "cuz": "because", "coz": "because", "bc": "because",
    "clen": "clean", "cleen": "clean", "claen": "clean", "clena": "clean",
    "bizy": "busy", "buisy": "busy", "busey": "busy", "bussy": "busy",
    "realy": "really", "rly": "really", "relly": "really",
    "tommorow": "tomorrow", "tomorow": "tomorrow", "tommorrow": "tomorrow", "tmrw": "tomorrow", "tmr": "tomorrow",
    "tonite": "tonight", "tonigth": "tonight", "2nite": "tonight", "tonihgt": "tonight",
    "thier": "their", "freind": "friend", "frend": "friend", "wierd": "weird", "alot": "a lot", "untill": "until",
    "definately": "definitely", "defintely": "definitely", "beleive": "believe", "recieve": "receive",
    "pls": "please", "plz": "please", "pleese": "please", "u": "you", "r": "are",
    "shud": "should", "shoud": "should", "cud": "could", "coud": "could", "wud": "would", "woud": "would",
    "dont": "don't", "cant": "can't", "didnt": "didn't", "doesnt": "doesn't", "dosent": "doesn't", "dosnt": "doesn't", "isnt": "isn't", "arent": "aren't",
    "wasnt": "wasn't", "werent": "weren't", "havent": "haven't", "hasnt": "hasn't", "couldnt": "couldn't", "wouldnt": "wouldn't", "shouldnt": "shouldn't",
    "youre": "you're", "theyre": "they're", "thats": "that's", "whats": "what's", "im": "I'm", "ive": "I've", "youve": "you've", "youll": "you'll",
    "laundery": "laundry", "londry": "laundry", "dishs": "dishes", "chors": "chores", "chorse": "chores", "cheres": "chores",
    "garbege": "garbage", "garbadge": "garbage", "rubish": "rubbish", "anoying": "annoying", "anoyed": "annoyed",
    "tierd": "tired", "tird": "tired", "exausted": "exhausted", "exhasted": "exhausted", "stresed": "stressed", "overwelmed": "overwhelmed", "overwhelmd": "overwhelmed",
    "slep": "sleep", "sleap": "sleep", "fihgt": "fight", "figth": "fight", "fite": "fight", "arguement": "argument", "arguemnt": "argument",
    "anxity": "anxiety", "anxeity": "anxiety", "anxous": "anxious", "burnot": "burnout", "burnnout": "burnout",
    "gardn": "garden", "profesor": "professor", "proffesor": "professor", "crosword": "crossword", "calender": "calendar",
    "unbiled": "unbilled", "unbilld": "unbilled", "unbiliied": "unbilled", "ledgar": "ledger", "lemonaid": "lemonade",
    "wating": "waiting", "waitting": "waiting", "finsh": "finish", "finnish": "finish", "finshed": "finished",
    "lisen": "listen", "lissen": "listen", "listn": "listen", "tlk": "talk", "tawk": "talk", "agian": "again", "agin": "again", "evrytime": "every time", "mesage": "message", "messege": "message", "gona": "gonna", "wanna": "wanna", "kichen": "kitchen", "kitchin": "kitchen", "bathrom": "bathroom", "togeather": "together", "togather": "together", "remeber": "remember", "rember": "remember", "forgor": "forgot", "forgoten": "forgotten",
    "responsibel": "responsible", "helpfull": "helpful", "greatful": "grateful", "apreciate": "appreciate", "appriciate": "appreciate"
  };
  var SPELL_PHRASES = [
    ["\\bwere (do|does|did|should|can|could|shall|would) (i|we|you|they|he|she)\\b", "where $1 $2"],
    ["\\bwere (is|are|was) (the|my|your|our|it|you|they|he|she|this|that)\\b", "where $1 $2"],
    ["\\bwere to (start|begin|go|look)\\b", "where to $1"],
    ["\\b(don't|dont|do not|didn't|didnt|i) no (what|how|where|why|when|who|if|that|were|where)\\b", "$1 know $2"],
    ["\\b(don't|dont|do not|didn't|didnt) no\\b", "$1 know"],
    ["\\bunbill?ed (det|dept|dett|dbt|debit|dets|depts)\\b", "unbilled debt"],
    ["\\bcalm down kit\\b", "calm-down kit"],
    ["\\bclam (down|me)\\b", "calm $1"]
  ];
  /* SPELL-END */
  // "allways" → "always", keeping the writer's capitals. Returns {text, fixes:[{from, to}]}.
  function spell(text) {
    var src = String(text == null ? '' : text), fixes = [];
    var out = src.replace(/[A-Za-z][A-Za-z']*/g, function (w) {
      var key = w.toLowerCase();
      var to = SPELL[key];
      if (!to || to === key) return w;
      if (/^I'/.test(to)) { /* "im" → "I'm" */ }
      else if (w === w.toUpperCase() && w.length > 1) to = to.toUpperCase();
      else if (w.charAt(0) !== w.charAt(0).toLowerCase()) to = to.charAt(0).toUpperCase() + to.slice(1);
      fixes.push({ from: w, to: to });
      return to;
    });
    out = out.replace(/(^|[\s(])i(?=[\s'’,.!?]|$)/g, '$1I');
    SPELL_PHRASES.forEach(function (p) {
      var rx = new RegExp(p[0], 'gi');
      out = out.replace(rx, function (m) {
        var to = m.replace(new RegExp(p[0], 'i'), p[1]);
        if (/^[A-Z]/.test(m)) to = to.charAt(0).toUpperCase() + to.slice(1);
        if (to.toLowerCase() !== m.toLowerCase()) fixes.push({ from: m, to: to });
        return to;
      });
    });
    return { text: out, fixes: fixes };
  }

  function prep(text) { return String(text == null ? '' : text).replace(/[’‘`´]/g, "'").replace(/[“”]/g, '"').toLowerCase(); }
  // "Friday" is a time; "hey everyone" is not always/never; "you're so good at it though!!" isn't shouting (that's each tool's job)
  function hasTime(text) { return TIME_RE.test(prep(text)); }

  function scan(text) {
    var t = prep(text), marks = [];
    LIST.forEach(function (p) {
      if (!p.re) return;
      var rx = new RegExp(p.re.source, p.re.flags.indexOf('g') === -1 ? p.re.flags + 'g' : p.re.flags), m, n = 0;
      if (p.whole) { if (p.re.test(t)) marks.push({ id: p.id, start: 0, end: t.length, text: String(text).trim(), whole: true }); p.re.lastIndex = 0; return; }
      while ((m = rx.exec(t)) && n++ < 50) {
        if (!m[0].length) { rx.lastIndex++; continue; }
        marks.push({ id: p.id, start: m.index, end: m.index + m[0].length, text: String(text).slice(m.index, m.index + m[0].length) });
        rx.lastIndex = m.index + 1;  // overlapping finds too ("wow, nice" and "nice of you to finally show"): the longest wins below
      }
    });
    // a smile after a complaint ("SOME of us like clean dishes 🙂") is part of the edge, not warmth
    var edge = marks.some(function (x) { return BY[x.id].group !== 'good'; });
    if (edge) {
      var sm = /🙂|😊|🙃/g, s;
      while ((s = sm.exec(t))) marks.push({ id: 'passive', start: s.index, end: s.index + s[0].length, text: s[0] });
    }
    // capitals used for emphasis on a group ("SOME of us") are part of the passive edge too
    // longest wins where two overlap; warmth inside sarcasm ("thanks" in "thanks for nothing") goes
    marks.sort(function (a, b) { return a.start - b.start || (b.end - b.start) - (a.end - a.start); });
    var out = [];
    marks.forEach(function (x) {
      var clash = out.filter(function (y) { return x.start < y.end && y.start < x.end; });
      if (!clash.length) { out.push(x); return; }
      // a swear word inside another mark ("on my last f*cking nerve") counts as well: both are there
      if ((x.id === 'swear') !== clash.some(function (y) { return y.id === 'swear'; }) && !clash.some(function (y) { return y.id === x.id; })) {
        if (x.id === 'swear' || clash.every(function (y) { return y.id === 'swear'; })) { out.push(x); return; }
      }
      if (x.whole || clash.some(function (y) { return y.whole; })) {
        // a whole-message mark ("ok.", "…") sits alongside word marks, except its own twin
        if (!clash.some(function (y) { return y.id === x.id || (x.whole && y.whole); })) out.push(x);
        return;
      }
      var bigger = clash.every(function (y) { return (x.end - x.start) > (y.end - y.start); });
      if (bigger) { out = out.filter(function (y) { return clash.indexOf(y) === -1; }); out.push(x); }
    });
    // shutting the door, but with a time to come back, is a good pause
    if (hasTime(text)) {
      var hadDoor = false;
      out = out.filter(function (x) { if (x.id === 'stonewall') { hadDoor = true; return false; } return true; });
      if (hadDoor) out.push({ id: 'pause', start: 0, end: String(text).length, text: String(text).trim(), whole: true });
      else out.push({ id: 'time', start: 0, end: 0, text: '', whole: true });
    }
    // sarcasm or an edge cancels the warmth it's wrapped in
    if (out.some(function (x) { return x.id === 'sarcasm' || x.id === 'contempt'; })) out = out.filter(function (x) { return x.id !== 'appreciation'; });
    out.sort(function (a, b) { return a.start - b.start; });
    return out;
  }
  function has(text, id) { return scan(text).some(function (m) { return m.id === id; }); }
  function hasAppreciation(text) { return has(text, 'appreciation'); }
  function isFlat(text) { return BY.flat.re.test(prep(text)); }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  // The visible list, the same on every page that uses it
  function lookForHTML(opts) {
    opts = opts || {};
    var hard = LIST.filter(function (p) { return !p.good; }), good = LIST.filter(function (p) { return p.good; });
    function li(p) { return '<li><b>' + esc(p.name) + '</b>' + (p.ex && p.ex.length ? ' <span class="lf-ex">(' + p.ex.slice(0, 2).map(function (e) { return '“' + esc(e) + '”'; }).join(', ') + ')</span>' : '') + '<br><span class="lf-why">' + esc(p.what) + '</span></li>'; }
    return '<p>' + esc(opts.intro || 'The Signal Translator, the Carrier Wave Decoder’s tone check and the Conversation Reader all read wording with this same list, so the same words get the same reading in each. It reads words only, never tone of voice or history, so every mark is a “may land as,” not a verdict.') + '</p>' +
      '<h3 class="lf-h">What may land harder than you mean</h3><ul class="lf-list">' + hard.map(li).join('') + '</ul>' +
      '<h3 class="lf-h">What tends to help</h3><ul class="lf-list">' + good.map(li).join('') + '</ul>' +
      '<p class="lf-note">Each tool also has a few checks of its own, like orders, labels, or a question that went unanswered, and it names them where they come up.</p>';
  }
  function lookFor(el, opts) { if (el) el.innerHTML = lookForHTML(opts); }

  var api = { LIST: LIST, BY: BY, SPELL: SPELL, SPELL_PHRASES: SPELL_PHRASES, spell: spell, scan: scan, has: has, hasTime: hasTime, hasAppreciation: hasAppreciation, isFlat: isFlat, TIME_RE: TIME_RE, lookFor: lookFor, lookForHTML: lookForHTML, prep: prep };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.TOLPatterns = api;
})(this);
