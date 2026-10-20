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
   TOLPatterns.idioms(text)    -> [{text, means, words}]: figures of speech, with what they usually mean
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
      re: /[.,!]\s*not[.!]*(?=\s*$)|\b(?:oh,? wow,? (?:you|u) (?:forgot|didn't|did not|missed|actually|really|managed|finally|remembered|did it again|showed up|made it)\b|wow,? (?:thanks|thank you|great|nice|ok(?:ay)?|real(?:ly)? (?:nice|helpful|great)|just wow)|thanks for nothing|thanks a lot(?= *(?:[.!…🙄😒🙃]|$))|gee,? thanks|nice of you to (?:finally )?\w+|(?:how|so) (?:nice|good|kind|thoughtful|sweet) of you to (?:finally )?\w+|must be nice|sure you (?:did|are|will|do)|yeah,? right|oh,? (?:great|wonderful|perfect|lovely|fantastic|joy)(?= *(?:[.!,…🙄😒🙃]|$))|what a surprise|big surprise|oh wait,? (?:you|they|he|she) (?:didn't|did not|forgot)|real mature|(?:great|nice|good) job,? (?:really|genius)|lol,? ok(?:ay)?,? (?:whatever|sure|then)|whatever you say|love that for (?:me|us)|good for you(?= *(?:[.!…🙄😒🙃]|$))|glad you could (?:finally )?(?:make it|join us|show up)|of course (?:you|he|she|they) (?:did|didn't|do|don't|would|wouldn't|forgot|are|were|can't|won't)|classic you|typical you\b|typical(?= *(?:[.!…🙄😒🙃]|$))|yeah,? sure(?= *(?:[.!…🙄😒🙃]|$))|sure,? whatever|(?:sure|fine|ok(?:ay)?|yeah),? (?:go ahead|go|have fun|enjoy)\b[^.!?\n]{0,60}?,? (?:and )?(?:i(?:'ll| will) just (?:sit|stay|wait|be) (?:here|at home|home|alone|by myself)|don't mind me|i guess i(?:'ll| will) just \w+)|(?:i )?hope (?:she|he|they|it|your new \w+) (?:makes you (?:happy|very happy|so happy)|(?:was|is) worth it)(?= *(?:[.!?…🙄😒🙃]|$))|(?:i )?hope you(?:'re| are) (?:both )?(?:happy|very happy|so happy) (?:now|together)(?= *(?:[.!?…🙄😒🙃]|$))|(?:have a nice|have a good|enjoy your (?:new )?) life(?= *(?:[.!?…🙄😒🙃]|$)))/g,
      what: 'Sarcasm says the opposite of the words, and the real meaning rides on tone. In writing the tone is missing, so the reader fills it in with the worst version.',
      fix: 'Say the real thing plainly, once: “I was hurt that you were late.”',
      ex: ['Wow, thanks for nothing.', 'Nice of you to finally show up.', 'Sure, go out with your friends, I’ll just sit here.', 'Must be nice.', 'lol ok whatever you say 🙄'] },
    { id: 'contempt', name: 'Contempt: mockery or looking down on them', group: 'edge', heat: 3,
      re: /🙄|😒|🤡|🥱|\*\s*(?:eye ?roll(?:s|ing)?|rolls? (?:my |her |his )?eyes|sigh)\s*\*|\b(?:eye ?roll(?:s|ing)?(?= *(?:[.!…]|$))|(?:honestly,? |seriously,? )?i (?:honestly |really |just |seriously )?(?:don't|do not|dont) (?:even |honestly |really )?know why i (?:even |ever |still |keep )?(?:expected|expect|bother(?:ed)?|tried|try|thought|asked|ask|asking|trusted|trust|counted on|rely on|relied on)\b[^.!?\n]{0,40}|why (?:do|did|would) i (?:even |ever )?(?:bother|expect(?:ed)? anything|ask(?:ed)? you|count(?:ed)? on you|rel(?:y|ied) on you|trust(?:ed)? you)\b[^.!?\n]{0,30}|what (?:did|do|else did|else do) i (?:even )?expect(?= *(?:[.!?…🙄😒]|$|from you))(?: from you)?|i (?:should(?:'ve| have)|shoulda) known (?:you(?:'d| would)|better than to (?:ask|trust|expect|count on|rely on) you)\b[^.!?\n]{0,30}|must be (?:so |really |pretty )?(?:exhausting|hard|tough|tiring|difficult|nice|lovely|great|fun) being (?:you|so \w+|that \w+|this \w+)\b|(?:it )?must be (?:so |really )?(?:exhausting|tiring) (?:to be|being) (?:you|that (?:busy|perfect|important))\b|(?:^|[,.;!?] *|\band )(?:everyone|everybody|the whole (?:world|family|office|street|school|class|town)|all (?:our|your|my) friends) (?:can see (?:it|that|what you are|right through you)|knows? (?:it|what you are|what you're like)|(?:is|are) laughing at you|laughs at you|thinks you're (?:a joke|pathetic|useless|an idiot|ridiculous|a mess|a loser))(?= *(?:[.!?…🙄😒]|$))|(?:i'm|i am|im) (?:so much |way |far |just )?(?:better|smarter) than you\b|(?:you're|you are|youre|ur) (?:so )?beneath me|let me (?:explain|say|spell) (?:this|it|that) (?:again )?(?:really |very |nice and |super )?(?:slowly|in small words|so you (?:understand|get it))|so you (?:actually )?get it this time|(?:oh )?look,? (?:who(?:'s| is) (?:finally )?(?:awake|talking|here)|the (?:genius|expert|princess|prince|king|queen|professor|boss) (?:has|is|speaks|thinks))|(?:i'll|i will|let me) use small words|try to keep up|even a (?:child|toddler|kid|five[- ]year[- ]old|monkey|dog) (?:could|can|would)\b|bless your (?:little )?heart|do you even (?:hear|listen to) yourself|are you even capable of\b|(?:look at )?the state of you|(?:honestly,? |seriously,? )?(?:i'm |im )?not even surprised(?: anymore| any more| at this point)?(?= *(?:[.!?…🙄😒]|$))|ew+,? (?:you|your)\b|grow up|get a life|are you (?:serious|kidding me)|you can't be serious|unbelievable|pathetic|what is wrong with you|what's wrong with you|who does that|you're a joke|give me a break|oh please|spare me|as if|you wish|cry me a river|boo hoo|here we go again|not this again|don't "?(?:ok|okay|k|whatever|sorry)"? me|(?:nobody|no one|no-one) asked(?: you| for your (?:opinion|input))?|who asked(?: you)?(?= *(?:[?.!…🙄😒]|$))|(?:nobody|no one|no-one) (?:wants to (?:deal with|be around|talk to|be with|hear from)|likes|can stand|cares about|wants|needs|would miss|will miss|is going to miss) you|(?:you're|you are|youre|ur) not (?:even )?worth (?:my|the) (?:time|effort|breath|energy)|embarrassed to be seen with you|(?:you're|you are|youre|ur) dead to me|(?:nobody|no one|no-one) (?:wants to hear|cares about) (?:it|that|this|your \w+)(?= *[.!?]*$)|can't believe i (?:ever )?(?:married|dated|moved in with|had kids with) you|(?:i )?regret (?:ever )?(?:meeting|marrying|dating|knowing) you|you make me (?:want to )?(?:throw up|vomit|puke)|who (?:even |actually )?cares what you (?:think|say|want|feel)|this is why (?:nobody|no one|no-one|people|everyone|you have no)\b[^.!?\n]{0,40}|no wonder (?:nobody|no one|you're alone|you have no|people)\b[^.!?\n]{0,40}|, ?(?:genius|einstein|sherlock|smart guy|smarty ?pants)(?= *(?:[?.!…🙄😒🙃]|$)))\b/g,
      what: 'An eye-roll, mocking or a put-down says “I look down on you,” which hurts more than a complaint and is very hard to answer calmly.',
      fix: 'Drop the jab and say the complaint underneath it, about the thing, not the person.',
      ex: ['Grow up.', 'Are you serious right now 🙄', 'Here we go again.'] },
    { id: 'passive', name: 'Passive-aggressive edge', group: 'edge', heat: 2,
      re: /\bsome of us(?: (?:actually|like|have|need|work|care|still|were|are|had|do|clean))?\b|\bi guess i(?:'ll| will) [^.!?\n]{2,60}?(?:again|myself|since (?:nobody|no one|no-one) else (?:will|does|is going to|can|bothers))\b|\bsince (?:nobody|no one|no-one) else (?:will|does|is going to|can|bothers|seems to)\b|\b(?:fine|ok(?:ay)?|it's fine|no worries),? i(?:'ll| will) (?:just )?do it(?: myself)?\b|\bi(?:'ll| will) just do it myself\b|\bno need to be (?:rude|like that|snippy|so \w+)\b|\bnot that (?:you|anyone|anybody) (?:would )?(?:care|cares|noticed?|asked)\b|\bdon't worry about me\b|\bdon't mind me(?= *(?:[.!…🙄😒🙃]|$)|,? i(?:'ll| will) just (?:sit|stay|be|wait|eat))|\bi(?:'ll| will) just (?:sit|stay|wait|be) (?:here|at home|home|alone|by myself)(?: alone| by myself|,? then)?(?= *(?:[.!…🙄😒🙃]|$))|\bhave fun without me\b|\bnot like i (?:matter|count)\b|\bif it's not too much (?:trouble|to ask)\b|\bthanks for (?:finally )?(?:noticing|telling me now|letting me know now|the heads up now)(?= *(?:[.!…🙂🙄]|$))|\bthanks for finally (?:letting me know|telling me)\b|\b(?:i'm )?not (?:mad|angry|upset|cross),? (?:i'm )?just (?:disappointed|saying)\b|\bnot that (?:you(?:'d)?|anyone|anybody) (?:would )?(?:notice|care)\b|\bi'm sorry (?:that |if )?you feel (?:that way|like that)\b|\bsorry you feel that way\b|\bjust saying\b|\bnoted\.(?=\s*$)/g,
      what: 'A complaint wrapped in politeness (“some of us”, “I guess I’ll do it again”) says two things at once. The reader hears the edge and has no clear ask to answer.',
      fix: 'Make the ask directly: “Could you do the dishes tonight? I’ve done them all week.”',
      ex: ['SOME of us like having clean dishes 🙂', 'I guess I’ll plan the trip again since nobody else will.', 'No need to be rude.'] },
    { id: 'pointed', name: 'Pointed work phrase', group: 'edge', heat: 1.5,
      re: /\b(?:(?:as )?per my (?:last|previous|earlier) (?:message|email|e-mail|note|text|comment|reply|slack)|as (?:previously|already) (?:stated|mentioned|discussed|noted|said|communicated|explained)|as i (?:said|mentioned|stated|noted|explained) (?:before|earlier|already|previously|above|in my (?:last|previous|earlier) (?:message|email|e-mail|text|note))|as i (?:already|previously) (?:said|stated|mentioned|noted|explained)|friendly reminder|gentle reminder|going forward,? please|please advise|to reiterate|reiterating)\b/g,
      what: 'At work, “per my last email” and “as previously stated” are widely read as “you didn’t read it.” The fact gets through, and so does the edge.',
      fix: 'Drop the pointer and restate the fact: “To recap: the deck is due at 5 today.”',
      ex: ['Per my last email, I need this ASAP.', 'As previously stated, the deadline is Friday.'] },
    { id: 'compare', name: 'Comparison to someone else', group: 'blame', heat: 2,
      re: /\b(?:your|my) (?:sister|brother|mom|mum|mother|dad|father|ex|friend|friends|boss|coworker|co-worker|parents|cousin|neighbou?r|roommate|colleague|best friend)\b[^.!?\n]{0,40}?\b(?:would(?:n't)?|always|never|does|doesn't|did|can|could|knows|manages|remembers|helps|gets|has|at least)\b|\bwhy can't you be (?:more )?like\b|\b(?:be|act) (?:more )?like (?:your|my|a normal|other|everyone)\b|\bunlike (?:you|your \w+)\b|\bat least (?:your|my) (?:sister|brother|mom|mum|dad|ex|friend|roommate|coworker) \w+/g,
      what: 'A comparison moves the topic from the task to the person’s worth and brings in a third person. The reader hears “you’re not good enough.”',
      fix: 'Leave the other person out. Say what you’d like from this person, about this thing.',
      ex: ['Your sister always calls on Sundays.', 'Why can’t you be more like your brother?'] },
    { id: 'absolute', name: 'Always / never', group: 'blame', heat: 1.5,
      re: /\b(?:always(?! (?:love|be (?:here|there|on your side)|have your back|grateful|thankful|appreciate|welcome|remember (?:how|the|when)|proud|happy to|glad to|there for)|(?: so| such an?| really)? (?:thoughtful|kind|sweet|generous|helpful|patient|supportive|caring|lovely|wonderful|amazing|good to me|on time|the best)\b)|never(?! (?:mind|forget (?:this|that|how|what you)|stop (?:loving|caring)|been happier|felt so (?:loved|happy|seen)))|every (?:single )?time|constantly|all the time|not once|not even once|nothing ever|no one ever|nobody ever|every single day|nobody (?:else )?(?:cares|helps|listens|does anything|bothers|ever)|no one (?:else )?(?:cares|helps|listens|does anything|bothers)|everyone else (?:does|can|manages|knows|gets|has)|you (?:do|did) nothing|you don't do anything|i (?:have to|always|got to|gotta|end up|'m left to) (?:do(?:ing)?|clean(?:ing)?|handle|handling) everything|everything around here|every single thing)\b/g,
      what: '“Always” and “never” turn one moment into a verdict on everything. The reader remembers the exception and argues with that, and the point gets lost.',
      fix: 'Name the specific time instead: “twice this week” or “on Tuesday.”',
      ex: ['You never help.', 'Nobody ever listens to me.'] },
    { id: 'dismiss', name: 'Dismissing a feeling', group: 'blame', heat: 2.5,
      re: /\b(?:calm down|just relax|chill out|you're overreacting|you are overreacting|you're (?:too|so) sensitive|you're being dramatic|not a big deal|no big deal|get over it|if you say so|ok whatever|whatever(?= *(?:[.!…🙄😒]|$))|whatev(?:s|er)?(?= *(?:[.!…🙄😒]|$))|(?:fine|ok(?:ay)?|sure),? whatev(?:s|er)?|(?<!idk |i don't mind |either's fine |up to you |i'm easy )whatever you (?:want|like|think|say)(?= *(?:[.!…🙄😒]|$))|whatever,? (?:mum|mom|dad|mother|father)(?= *(?:[.!…🙄😒]|$))|whatever (?:works|suits) (?:for you|you|best)(?= *(?:[.!…🙄😒]|$))|whatever you think is (?:best|right)(?= *(?:[.!…🙄😒]|$))|(?:^|(?:fine|ok(?:ay)?|sure|k)[.,!]* +)do what you want(?= *(?:[.!…🙄😒]|$))|i (?:really )?(?:don't|do not) care|i could(?:n't| not) care less|stop being so \w+|you're imagining (?:it|things)|it was (?:just )?a joke|can't you take a joke)\b/g,
      what: '“Calm down” or “you’re overreacting” tell the reader their feeling doesn’t count. They usually raise the heat.',
      fix: 'Say what you can see, even if you see it differently: “I can tell this matters to you.”',
      ex: ['Calm down.', 'You’re overreacting.'],
      // "Fine. Whatever." is matched here too, but the list shows it under its own, gentler name (below)
      alsoAs: { name: 'Brush-off, or quiet hurt', ex: ['Fine. Whatever.', 'Whatever works for you.'],
        what: 'A short “fine” or “whatever” can mean “either is fine,” or quiet hurt from someone who has stopped asking for what they want. The reader can’t tell which, and often hears “I don’t care.” It’s worth asking, not deciding.' } },
    { id: 'stonewall', name: 'Shutting the door', group: 'door', heat: 2,
      re: /^\s*(?:\.{3,}|…)\s*$|\b(?:not now|i (?:just |really |honestly )?can't do this(?: right now| anymore| today| tonight)?|i (?:just )?can't talk (?:about this )?(?:right )?now|i'm done(?: talking)?(?: about (?:this|it))?|i am done|leave me alone|forget it|never ?mind(?!,? (?:it's|its|it is|all) (?:ok|okay|fine|good|sorted)|,? (?:found it|figured it out|sorted|got it|all good|no worries|it's fine))|i don't want to talk(?: about (?:it|this))?(?= *(?:[.!?…,]|$|right now|now|anymore|any more|with you))|i have nothing (?:more )?to say|stop (?:texting|messaging|calling) me|don't (?:ever )?(?:text|talk to|call|contact|message) me|i give up|it doesn't matter|doesn't matter)\b/g,
      what: '“Not now,” “forget it” or a silent “…” can mean someone is flooded and needs a break. Without a time to come back, the other person hears “this is over” or “you don’t matter.”',
      fix: 'Keep the pause, and add when you’ll come back: “I can’t do this right now. Can we talk at 8?”',
      ex: ['…', 'Not now.', 'I just can’t do this right now.'] },
    { id: 'flat', name: 'Very short reply', group: 'door', heat: 1, whole: true,
      re: /^\s*(?:(?:k|kk|ok|okay|fine|sure|noted|cool|yep|yup|mhm|nvm|whatever|nothing|it'?s fine|its fine|i'?m fine|im fine|all good|forget it)[\s.,!]+){0,3}(?:k|kk|ok|okay|fine|sure|noted|cool|yep|yup|mhm|nvm|whatever|if you say so|got it|nothing|it'?s fine|its fine|i'?m fine|im fine|all good|go (?:to )?sleep|go to bed|go sleep|forget it)\s*[.!]*\s*$/,
      what: 'A one-word reply can mean “got it, busy” or “I’m upset.” The word is the same, so the reader has to guess, usually from their own mood.',
      fix: 'Add the missing half: “Ok, sounds good!” or “Ok. I need a minute, I’ll reply properly tonight.”',
      ex: ['k', 'fine.', 'ok.'] },
    { id: 'swear', name: 'Swearing', group: 'edge', heat: 2.5,
      re: /(?:\bf+[*\-_.@#]*u+[*\-_.@#]*c+[*\-_.@#]*k+\w*|\bf\*+\w*|\bf[*\-_.]?ck\w*|\bfu?k+(?:in[g']?|ing|n|ed|er|ers|s)?\b|\bfkn\b|\bf[*]?kin[g']?\b|\bfreakin[g']?\b|\bfrickin[g']?\b|\beff(?:ing|in)\b|\bsh[i1!*]+t+\w*|\bbull ?sh[i1!*]t\w*|\bb[i1*]+tch\w*|\ba[s$*]{2}(?:hole|holes|hat)?\b|\barse(?:hole)?\b|\bgod ?damn\w*|\bdamn(?:ed|it)?\b|\bdammit\b|\bcrap(?:py)?\b|\bpiss(?:ed|ing)?(?: off)?\b|\bdick(?:head)?s?\b|\bbastards?\b|\bc[u*]nts?\b|\bprick\b|\bdouche\w*|\bmother ?f\w*|\bwtf\b|\bstfu\b|\bffs\b|\bomfg\b|\bjfc\b|\bthe hell\b|\bhell no\b|\bhell(?=\s*(?:[,.!?]|$))|\bgo to hell\b|\bscrew (?:you|this|that|off|it|him|her|them)\b|[@#$%&*]{3,})/g,
      what: 'Swearing, even the starred-out kind, turns up the volume. The reader hears the anger first, and often stops reading for the point.',
      fix: 'Leave the swear words out and name the feeling instead: “I’m really frustrated right now.”',
      ex: ['You are getting on my last f*cking nerve.', 'wtf is wrong with you'] },
    { id: 'hostile', name: 'Hostile or fed-up line', group: 'edge', heat: 3,
      re: /\b(?:(?:getting|get|got|gets|getting right) on my (?:last |every |one )?(?:[a-z*]+ )?nerves?|on my last (?:[a-z*]+ )?nerve|(?:i'm|i am|im) (?:so |sooo+ |really |just |totally |[a-z]*ing )?(?:done|finished|through) with (?:you|this(?= *(?:[.!?…]|$|anymore|any more|crap|shit))|it(?= *(?:[.!?…]|$|anymore|any more))|your \w+|us)|(?:you're|you are|youre|ur) (?:really |seriously |[a-z]*ing )?driving me (?:crazy|nuts|insane|mad|up the wall|bananas)|shut (?:up|the [a-z*]+ up|your (?:mouth|face))|(?:i )?can't stand (?:you|this(?= *(?:[.!?…]|$|anymore|any more))|it(?= *(?:[.!?…]|$|anymore|any more| when you))|your|being around you)|i (?:really )?hate (?:you|this(?= *(?:[.!?…]|$|anymore|any more))|it(?= *(?:[.!?…]|$|anymore|any more| when you))|your|when you|how you|living with you|everything about)|(?:i'm|i am|im) (?:so |really )?sick (?:and tired )?of (?:you|this|your|it)|get (?:out of my (?:face|sight|way)|lost|a grip)|go away|leave me the [a-z*]+ alone|piss off|go to hell|bite me|drop dead|you disgust me|you make me sick|(?:what|wtf) (?:the [a-z*]+ )?is (?:wrong|the matter) with you|are you (?:stupid|an idiot|deaf|blind|out of your mind|kidding me)|i don't give a [a-z*]+|who (?:the [a-z*]+ )?cares|do whatever you (?:want|like)(?! (?:for|to|with|on|tonight|today|this|at|in)\b)|(?:i'm|i am|im) (?:so )?over (?:it|this|you)|enough is enough|i've had (?:it|enough)|you're impossible|you never shut up|zip it|back off|mind your own business)\b/g,
      what: 'A fed-up or hostile line (“you’re getting on my last nerve”, “shut up”, “I’m done with you”) says how angry you are, but not what you need. The reader can only defend themselves or pull away.',
      fix: 'Say the feeling and the need, and take a break if you need one: “I’m really frustrated. I need a few minutes, then can we talk about the dishes?”',
      ex: ['You are getting on my last nerve.', 'Shut up.', 'I’m so done with you.'] },
    { id: 'label', name: 'Name-calling or a label', group: 'blame', heat: 3,
      re: /\b(?:you(?:'re| are| were|re|r)?|ur|youre) (?:(?:such|so|just|really|being|acting like|literally|always|the|a|an|total|complete|absolute|utter|real|huge|massive|[a-z]*ing|[a-z]*in') )*(?:idiot|moron|jerk|loser|clown|coward|parasite|freak|trash|garbage|ugly|fat|brainless|spineless|embarrassment|annoying|nobody(?= *[.!?]*$)|nothing(?= *[.!?]*$)|slob|pig|brat|baby|child|joke|nightmare|disaster|failure|disappointment|liar|psycho|lunatic|narcissist|selfish|lazy|useless|pathetic|stupid|dumb|worthless|hopeless|clueless|incompetent|ridiculous|childish|immature|insane(?! (?:good|talented|fast|smart|lucky|cute|funny|strong))|crazy(?! (?:good|talented|fast|smart|lucky|cute|funny|strong|busy|tired))|toxic|a disgrace|ungrateful|spoiled|entitled|heartless|cruel|disgusting|vile|a mess|a waste of (?:space|time)|(?:terrible|awful|horrible|lousy|worst|sorry excuse for an?) (?:parent|mother|father|mom|mum|dad|partner|husband|wife|boyfriend|girlfriend|friend|person|roommate|boss|coworker|brother|sister|son|daughter|human being))\b|\b(?:i'm|i am|im) the only (?:adult|grown[- ]?up|responsible (?:one|person)|one (?:who|that) (?:does|cares|tries|cleans|works|helps|pays)\w*)\b|\byou (?:idiot|moron|jerk|slob|loser|pig)\b|\bwhat an? (?:idiot|moron|loser|jerk|clown|joke|creep)\b|\byou look (?:so |really |absolutely )?(?:disgusting|ugly|fat|pathetic|hideous|gross|like (?:shit|crap|trash|garbage|a (?:mess|slob|clown|joke|pig)))\b|\b(?:you(?:'re| are|re|r)?|ur|youre) (?:(?:so|such an?|being|acting|really|totally|literally|too|acting like an?|like an?)\s+)+(?:autistic|retarded|a retard|retard|adhd|add|ocd|bipolar|schizo|schizophrenic|psychotic|mental|spastic|a spaz|spaz|an autist|autist|special needs|brain ?damaged|deranged)\b/g,
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
      re: /\b(?:thank you(?! for nothing)|thank u+\b|thanks(?! a lot(?= *(?:[.!…🙄😒🙃]|$))| for nothing)|thx|ty|cheers (?:for|love|mate|babe|hun)|(?:great|good|nice|brilliant|amazing) (?:job|work)(?!,? (?:genius|einstein|sherlock))|you(?:'re| are|re|r) (?:a |an |such a |my |an absolute )?(?:lifesaver|life saver|star|legend|hero|gem|angel)|(?:ur|you're|you are|youre) so (?:sweet|kind|lovely|thoughtful|helpful)|i owe you(?: one| a (?:coffee|drink|pint))?|gracias|te quiero|te amo|orgullos[oa] de ti|i appreciate|appreciate (?:it|you|that|this)|i'm grateful|grateful for|love you|i love (?:that|how|it when|you)|it means a lot|that helped|you're (?:the best|amazing|a star)|well done|proud of you)\b|❤️|❤|💕|🫶|🥰|😘/g,
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
    "responsibel": "responsible", "helpfull": "helpful", "greatful": "grateful", "apreciate": "appreciate", "appriciate": "appreciate",
    "tlak": "talk", "talkk": "talk", "wy": "why", "whyy": "why", "fone": "phone", "phon": "phone", "fones": "phones",
    "wahtever": "whatever", "whatevr": "whatever", "watever": "whatever", "whatver": "whatever", "wateva": "whatever", "whateva": "whatever",
    "lowd": "loud", "devorce": "divorce", "divorse": "divorce", "tomoro": "tomorrow", "tomorro": "tomorrow", "becuz": "because", "becuse": "because",
    "somtimes": "sometimes", "sumtimes": "sometimes", "alredy": "already", "allready": "already", "probly": "probably", "prolly": "probably",
    "enuf": "enough", "enogh": "enough", "interupting": "interrupting", "intrupting": "interrupting", "interupt": "interrupt", "interrupt1ng": "interrupting",
    "lisening": "listening", "lissening": "listening", "fogot": "forgot", "forgt": "forgot", "pleez": "please", "gunna": "gonna", "shure": "sure",
    "reely": "really", "anymor": "anymore", "evryone": "everyone", "everone": "everyone", "happend": "happened", "hapened": "happened",
    "angery": "angry", "frustated": "frustrated", "frusterated": "frustrated", "embarased": "embarrassed", "dissapointed": "disappointed", "disapointed": "disappointed",
    "wont": "won't", "stupud": "stupid", "carless": "careless", "rediculous": "ridiculous", "ridiculus": "ridiculous", "definetly": "definitely"
  };
  var SPELL_PHRASES = [
    ["\\bwere (do|does|did|should|can|could|shall|would) (i|we|you|they|he|she)\\b", "where $1 $2"],
    ["\\bwere (is|are|was) (the|my|your|our|it|you|they|he|she|this|that)\\b", "where $1 $2"],
    ["\\bwere to (start|begin|go|look)\\b", "where to $1"],
    ["\\b(don't|dont|do not|didn't|didnt|i) no (what|how|where|why|when|who|if|that|were|where)\\b", "$1 know $2"],
    ["\\b(don't|dont|do not|didn't|didnt) no\\b", "$1 know"],
    ["\\bunbill?ed (det|dept|dett|dbt|debit|dets|depts)\\b", "unbilled debt"],
    ["\\bcalm down kit\\b", "calm-down kit"],
    ["\\bclam (down|me)\\b", "calm $1"],
    ["\\byour (always|never|so|such|being|late|not|going|doing|the only|the worst|the best|a|an|too|really|just|welcome|kidding|joking|lying|making|acting|driving|getting|overreacting|still|literally|constantly|obviously)\\b(?! (?:is|was|isn't|wasn't|has|had|really (?:is|was)|scares|scared|annoys|annoyed|worries|worried|frightens|makes|made|gets|got|needs|could|can|will|would|skills|style|habit|habits|lessons|test|licen[cs]e|instructor|record))", "you're $1"]
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

  // ---------------------------------------------------------------- figures of speech, in plain words
  // [pattern, what it usually means]. A literal listener sees the plain meaning; the Conversation Reader
  // uses it to spot when a figure of speech was taken at its word ("read the room" / "What room?").
  // Each entry: the phrase, what it usually means, and the words in it a literal reader may ask about.
  var IDIOMS = [
    ["break a leg", "good luck", ["leg"]],
    ["read(?:ing)? the room", "notice how the people around you are feeling, and adjust", ["room"]],
    ["(?:it's |this is |that's )?not rocket science", "it isn't very hard to do", ["rocket"]],
    ["(?:a )?piece of cake", "easy", ["cake"]],
    ["(?:the )?ball's in your court", "it's your turn to decide or act", ["ball", "court"]],
    ["play it by ear", "decide later, as things happen", ["ear"]],
    ["under the weather", "a little sick", ["weather"]],
    ["beat(?:ing)? around the bush", "avoiding saying something directly", ["bush"]],
    ["on the same page", "agreeing about the plan", ["page"]],
    ["hit the (?:hay|sack)", "go to bed", ["hay", "sack"]],
    ["cut (?:me |you |us |him |her )?some slack", "be less hard on me", ["slack"]],
    ["get your act together", "get organized and do what's needed", ["act"]],
    ["pull(?:ing)? (?:your|his|her|their|my) (?:own )?weight", "doing a fair share of the work", ["weight"]],
    ["walk(?:ing)? on eggshells", "being very careful not to upset someone", ["eggshells"]],
    ["(?:the )?last straw", "the last of many problems, and one too many", ["straw"]],
    ["(?:the )?straw that broke", "the last of many problems, and one too many", ["straw"]],
    ["(?:the )?elephant in the room", "a big problem nobody is talking about", ["elephant"]],
    ["cross that bridge", "deal with it later, if it happens", ["bridge"]],
    ["bite the bullet", "do the hard thing now", ["bullet"]],
    ["spill(?:ed)? the beans", "told the secret", ["beans"]],
    ["hold your horses", "wait, slow down", ["horses"]],
    ["in hot water", "in trouble", ["water"]],
    ["on thin ice", "close to being in serious trouble", ["ice"]],
    ["drop(?:ped)? the ball", "forgot or missed something they were responsible for", ["ball"]],
    ["at the end of the day", "in the end, what matters most is", []],
    ["when pigs fly", "never", ["pigs"]],
    ["blow(?:ing)? off steam", "letting out stress or anger", ["steam"]],
    ["(?:take a )?rain ?check", "can we do this another time", ["rain"]],
    ["touch base", "check in briefly", ["base"]],
    ["get off my back", "stop criticizing or pressuring me", ["back"]],
    ["cool it", "calm down, or stop", []],
    ["jump(?:ed|ing)? the gun", "acted too soon", ["gun"]],
    ["go the extra mile", "do more than expected", ["mile"]],
    ["give me a hand", "help me", ["hand"]],
    ["hang in there", "keep going, it will get better", []],
    ["hit the roof", "got very angry", ["roof"]],
    ["the whole nine yards", "everything", ["yards"]],
    ["a lot on my plate", "a lot to deal with", ["plate"]],
    ["keep me in the loop", "keep me updated", ["loop"]],
    ["out of the loop", "not updated", ["loop"]],
    ["sleep on it", "think about it overnight before deciding", []],
    ["hit a wall", "got stuck and couldn't go on", ["wall"]],
    ["on the fence", "undecided", ["fence"]],
    ["up in the air", "not decided yet", ["air"]],
    ["cold feet", "nervous, and thinking of backing out", ["feet"]],
    ["cost(?:s)? an arm and a leg", "very expensive", ["arm", "leg"]],
    ["kill two birds", "do two things at once", ["birds"]],
    ["(?:get it|pull yourself) together", "calm down and get organized (often said sharply)", []],
    ["get a grip", "calm down (often said sharply)", ["grip"]],
    ["knock it off", "stop doing that", []],
    ["cut it out", "stop doing that", []],
    ["over the moon", "very happy", ["moon"]],
    ["see eye to eye", "agree", ["eye"]],
    ["water under the bridge", "in the past, and forgiven", ["bridge"]],
    ["thr(?:ow|ew|own) (?:me |you |him |her |them |us )?under the bus", "blamed someone to protect yourself", ["bus"]],
    ["get the ball rolling", "start", ["ball"]],
    ["on the back burner", "set aside for later", ["burner"]],
    ["call it a day", "stop for today", []],
    ["take it easy", "relax, or calm down", []],
    ["break the ice", "start talking in an awkward moment", ["ice"]],
    ["sit tight", "wait where you are", []],
    ["bent out of shape", "upset", ["shape"]],
    ["push(?:ing)? my buttons", "deliberately upsetting me", ["buttons"]],
    ["between a rock and a hard place", "stuck between two bad choices", ["rock"]],
    ["(?:i have |i've got |there's )?nothing left in the tank", "no energy left", ["tank"]],
    ["running on empty", "very tired, with no energy left", []],
    ["at (?:the end of my rope|my wit's end|the end of my tether)", "out of patience, and can't cope much longer", ["rope"]],
    ["over my head", "too hard for me to understand", ["head"]],
    ["out of my depth", "in a situation that's too hard for me", ["depth"]],
    ["hanging by a thread", "barely coping", ["thread"]],
    ["my brain is (?:mush|fried|full)", "too tired to think clearly", ["brain"]],
    ["beat(?:ing)? a dead horse", "going on about something that's already settled", ["horse"]],
    ["read between the lines", "notice the meaning that isn't said directly", ["lines"]],
    ["(?:it's )?not the end of the world", "it's not as bad as it feels", []],
    ["(?:a real |such a )?piece of work", "a difficult person (said as an insult)", []],
    ["rub(?:bing)? it in", "keep reminding someone of their mistake", []],
    ["put a sock in it", "be quiet (said rudely)", ["sock"]],
    ["(?:i'm |i am )?(?:going to|gonna|about to) (?:kill|murder|strangle) (?:you|him|her|them)|i(?:'ll| will| could) (?:kill|murder|strangle) (?:you|him|her|them)", "I'll be very angry (an exaggeration, not a real threat, though in writing it can read like one)", []],
    ["(?:it's|this is) killing me", "this is really hard for me", []]
  ];
  var IDIOM_RX = IDIOMS.map(function (x) { return new RegExp('\\b(?:' + x[0] + ')\\b', 'i'); });
  // -> [{text, means, words, start}] for every figure of speech in the text
  function idioms(text) {
    var t = prep(text), out = [];
    IDIOMS.forEach(function (x, i) {
      var m = t.match(IDIOM_RX[i]);
      if (m && !out.some(function (o) { return m.index < o.start + o.text.length && o.start < m.index + m[0].length; })) out.push({ text: String(text).slice(m.index, m.index + m[0].length), means: x[1], words: x[2], start: m.index });
    });
    return out.sort(function (a, b) { return a.start - b.start; });
  }

  /* Threats and controlling lines ("you'll regret it", "or else", "if you tell anyone, you'll be sorry"), calm boundaries
     that are not threats ("If you can't respect my relationship, I'll leave for today. I love you."), and blame said as a dig
     ("I managed fine without you", "when it suits you"). Shared by the Signal Translator and the Conversation Reader. */
  var THREAT_RE = /\byou(?:'ll| will| are going to|'re going to|'re gonna) (?:be sorry|regret (?:it|this|that|ever)|pay for (?:this|that|it)|pay\b(?! (?:me|you|us|them|him|her|the|for (?:the|your|my|our|dinner|lunch|it all)|back|half|rent|bills?)\b)|wish you (?:hadn't|had never|never|were dead))|\b(?:i'll|i will|i'm going to|i am going to|i'm gonna|gonna) make (?:you|your life) (?:regret|pay\b|sorry|suffer|a (?:living )?hell|hell|miserable)|\b(?:i'll|i will|i'm going to|i'm gonna) make sure you (?:regret|pay\b|never|don't|can't|lose)|\bor else(?=\s*(?:[.!?…]|$))|\bor you'll (?:see|be sorry|regret)|\bwatch your back\b|\b(?:i'll|i will|i'm going to|i am going to|i'm gonna) (?:post|send|share|show everyone|leak|put)\b[^.!?]{0,40}?\b(?:photos?|pictures?|pics|videos?|messages|nudes|texts)\b[^.!?]{0,30}?\bif you\b|\byou(?:'d| had) better not (?:tell|leave|dare)\b|\bdon't you dare (?:tell|leave)\b|\b(?:you're|you are) not going anywhere\b|\bi won't let you leave\b|\bif you (?:ever )?(?:tell|leave|go out|go|see|talk to|text|call|try|walk out)\b[^.!?]{0,60}?,?\s*(?:i(?:'ll| will|'m going to| am going to|'m gonna)) (?:make you|hurt|kill|ruin|destroy|come after|find you|show (?:everyone|your|them)|post|send (?:everyone|your|them)|tell everyone|tell your|take the (?:kids|children)|take (?:the|your) (?:kids|children|phone|car|money|keys)|end you|make your life|throw you out|kick you out|kill myself|hurt myself|end it|leave you with nothing)|\bif you (?:ever )?tell (?:anyone|anybody|someone|your)\b[^.!?]{0,50}?,?\s*(?:you(?:'ll| will) (?:be (?:sorry|in trouble)|regret|pay\b|see|wish|lose|never)|i(?:'ll| will|'m going to) (?:make|hurt|kill|tell|show|post|ruin|end|leave|take|deny|say you))/i;
  var BOUNDARY_RE = /\bif you (?:can't|cannot|won't|don't|keep|start|carry on)\b[^.!?]{1,90}?,?\s*(?:then )?(?:i'm going to|i am going to|i'll|i will|i'm gonna|we'll|we will|i need to|i'm)\s+(?:need to |have to |be )?(?:leave|leaving|go|going|head (?:home|out)|step (?:away|out|back)|take (?:a break|some space|space|a step back|a breather)|end (?:the|this) (?:call|visit|conversation|chat)|hang up|go home|stay (?:home|away)|not (?:come|visit|stay)|leave the (?:room|conversation|call))\b[^.!?]*/i;
  var BOUNDARY_CARE = /\b(?:for (?:today|tonight|now|the (?:day|night|evening|weekend)|a (?:bit|while|few (?:minutes|hours|days)))|early|this time|and (?:come back|call|try again)|i love you|love you|i'll call|i will call|talk (?:soon|tomorrow|next week)|call (?:you )?(?:next week|tomorrow|soon)|until (?:we|you|things))\b/i;
  var BOUNDARY_SOFT = /\b(?:step (?:away|out|back)|take (?:a break|some space|space|a step back|a breather)|hang up|end (?:the|this) (?:call|visit|conversation|chat)|leave the (?:room|conversation|call))\b/i;
  var DIG_RES = [
    // (sig17) "I'm not your maid": a dig said as a denial of a role
    /\b(?:i'm|i am|im) not (?:your|ur) (?:(?:personal |live-in |unpaid |bloody |own )?(?:maid|servant|slave|cleaner|skivvy|butler|housekeeper|cook|chef|secretary|pa|assistant|nanny|babysitter))(?= *(?:[.!?…🙄😒🙃]|$| either| too| you know))/i,
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
  /* Checking up, cutting someone off, or a put-down that says they're worth nothing: signs of control, not a tone problem.
     "monitor": demands for a location, a phone or passwords, or who someone was with. "isolate": not letting them see people.
     "degrade": "nobody else would want you", "you're worthless", "you're nothing without me".
     A kind, one-off ask ("Can you send me your location when you get there, so I know you got home safe?",
     "Who were you with at the party? Sounds fun!") is not flagged: a location or "who were you with" counts when it's
     demanded (said as an order, or "now"), or when it comes with another check ("Where were you? Who were you with?"). */
  var END = '(?=\\s*(?:[.!?,…;]|$|\\b(?:but|except|like|anyway|now|again|if|the way)\\b))';
  var CONTROL_RES = {
    // always a sign of control, however it's asked
    phone: /\b(?:i want|i need|i'm going to need|give me|hand over) (?:your|ur) (?:passwords?|passcodes?|pins?|phone)(?: (?:tonight|now|right now|today))?\s*(?:[.!?]|$)|\b(?:show|give|hand) me your (?:phone|passwords?|passcode|messages|texts|chats|dms)\b|\b(?:let me|i want to|i need to|i'm going to|i'll|i'm gonna) (?:see|check|look at|go through|read) your (?:phone|messages|texts|chats|dms|emails?)\b|\bunlock your phone\b|\bwhat(?:'s| is) your (?:password|passcode)\b|\bwhy (?:is|was|did you turn|have you turned) your location (?:off|turned off)\b|\b(?:turn|switch|put) (?:your )?location (?:back )?on\b/i,
    // a location or a check on who they're with: counted when demanded, or with a second check
    loc: /\btell me (?:exactly )?where (?:you were|you went|you've been|you are)\b|\bsend me a (?:photo|picture|pic|selfie|video) (?:of )?(?:who|where) (?:you(?:'re| are)|you're with)\b|\b(?:send|share|give) me your (?:live )?location\b|\b(?:send|share) your (?:live )?location\b/i,
    who: /\bwho (?:were|are) you (?:with|texting|talking to|messaging|seeing)\b|\bwho (?:was|is) that (?:texting|messaging|calling) you\b/i,
    where: /\bi (?:need|want|have|get) to know where you are (?:at all times|every (?:minute|second|hour)|all the time|24\/7)\b|\bwhere (?:were|are|have) you(?: been)?(?: really| actually)?\s*\?/i,
    // "I'll know if you do", "I'm watching you", "I checked your phone": watching someone, said as a warning
    watch: /\bi(?:'ll| will) (?:know|find out) (?:if|when|where|who|whether) you (?:do|did|go|went|see|saw|lie|lied|text|talk|leave|left|meet|call|message|try|sneak|cheat|are lying|'re lying|are seeing|'re seeing|are with|'re with|were with)\b|\bi(?:'ll| will) (?:know|find out)(?: about it)?(?=\s*[.!?]|$)|\bi(?:'m| am) (?:always )?watching (?:you|what you|where you|who you)\b|\bi can see (?:where you are|where you've been|who you(?:'re| are) (?:with|texting|talking to)|your messages)\b|\bi (?:checked|went through|read|looked (?:at|through)|have been (?:checking|reading|going through)|'ve been (?:checking|reading|going through)) your (?:phone|messages|texts|emails?|dms|chats|search history|browser|bank)\b(?! (?:for you|battery|charger|and it(?:'s| is) (?:fine|charged|working))|,? it(?:'s| is) (?:charged|fine|working))|\b(?:send|show) me (?:a )?screenshots? of (?:your|the) (?:messages|chats|texts|dms|conversation)\b/i,
    // "I check your location because I don't trust you": watching someone without their agreement
    // (not "I check your location when you drive home late, like we agreed")
    track: /\bi(?:'ve| have)? (?:always |still |just )?(?:check|track|monitor|read|go through|look through|keep checking|keep tracking) your (?:location|phone|messages|texts|emails?|dms|chats|whereabouts)\b/i,
    // "Where were you? Prove it.": a demand to account for yourself
    prove: /\bprove it\b|\bprove (?:to me )?(?:where|who|that you|you were)\b/i,
    // "If you go out with your friends, don't bother coming home": an ultimatum that cuts someone off
    shut: /\b(?:don't|do not|dont) (?:bother )?(?:coming|come) (?:back )?home\b(?=(?: (?:tonight|then|at all|again|ever))?\s*(?:[.!?…]|$))|\bif you (?:go|go out|see|leave|meet)\b[^.!?]{0,60}?,?\s*(?:don't|do not|dont) (?:bother )?(?:coming|come) (?:back )?home\b/i,
    isolate: /\byou(?:'re| are) not allowed (?:out|to go out|to leave)\b(?=[^.!?]{0,30}\bi said so\b)|\byou(?:'re| are) not (?:seeing|talking to|going out with|meeting) (?:her|him|them|that \w+) (?:again|anymore|any more)\b|\byou (?:don't|do not|can't|cannot) go (?:anywhere|out) without (?:asking|telling) me\b|\byou (?:can't|cannot|can not|aren't allowed to|are not allowed to|won't be allowed to|don't get to) (?:see|go out with|hang out with|talk to|visit|text|call|meet) (?:your (?:friends|family|mum|mom|dad|sister|brother|mates)|anyone|anybody|people)\b|\bi don't want you (?:seeing|talking to|going out with|hanging out with) (?:your friends|your family|any of your friends|anyone at all)\b|\byou(?:'re| are) not allowed to see (?:your (?:friends|family)|anyone|anybody)\b|\b(?:it's|its) (?:them|your friends|your family) or me\b|\byou (?:don't|do not) need (?:to see )?(?:your friends|your family)\b[^.!?]{0,6}(?:you have me|you've got me)\b|\byou (?:don't|do not) need (?:anyone|anybody|friends|them) (?:else )?(?:but|except|apart from) me\b/i,
    // "I'm scared of you", "I'm afraid of what he'll do", "I'm frightened to go home", "walking on eggshells"
    fear: /\bi(?:'m| am|'ve been| have been| feel| get)? (?:so |really |too |very |a bit |getting )?(?:scared|afraid|frightened|terrified) (?:of (?:you|him|her|them|my (?:husband|wife|partner|boyfriend|girlfriend|bf|gf|ex|dad|father|mum|mom|mother|stepdad|stepmum))\b(?! (?:guys|lot|two|all)\b)|to (?:go home|come home|be (?:at )?home|be alone with (?:you|him|her|them)|say no to (?:you|him|her|them)|leave (?:you|him|her|them)|tell (?:you|him|her|them) (?:anything|things|how i feel|the truth|no))\b|of what (?:you|he|she|they)(?:'ll| will|'d| would| might| could| may) do\b|of how (?:angry|mad|violent|aggressive|scary|rough) (?:you|he|she|they) (?:get|gets|got|can get)\b)|\b(?:i'm |i am |i feel like i'm |i'm always |always )?walking on eggshells (?:around|with) (?:you|him|her|them)\b|\byou (?:scare|frighten|terrify) me\b(?! (?:sometimes )?(?:with|when you (?:drive|jump|sneak)|lol|😂))|\bbecause of how (?:you|he|she|they) (?:react|reacts|will react|would react|gets?|get angry)\b/i,
    // someone describing being controlled: "you won't let me see my friends", "she controls all my money",
    // "he takes my phone and goes through it", "you threatened to take the kids"
    told: /\b(?:you|he|she|they|my (?:husband|wife|partner|boyfriend|girlfriend|bf|gf|fiance|fiancee|fiancé|fiancée))(?: (?:just|always|still|never|even))? (?:won't|wont|will not|doesn't|does not|don't|do not|never|wouldn't) let(?:s)? me (?:(?:see|talk to|visit|call|text|meet|go out with|hang out with) (?:my |any of my |any )?(?:friends|family|mum|mom|dad|parents|sister|brother|mates|anyone|people)|(?:have|use|keep|touch|get|see) (?:my own |my |a |any |our )?(?:money|bank card|card|cards|account|bank account|phone|job|car keys|passport|wages|salary)|(?:get|have|keep) a job|go to work|leave the house)\b|\b(?:you|he|she|they) (?:control|controls|controlled|take|takes|took|keep|keeps|kept) (?:all |all of )?(?:my|the|our) (?:money|finances|bank card|cards|bank|accounts?|wages|salary|spending|passport)\b|\b(?:you|he|she|they) (?:take|takes|took|grab|grabs|grabbed) my phone\b|\b(?:you|he|she|they) (?:go|goes|went|keep going|keeps going) through my (?:phone|messages|texts)\b|\b(?:you|he|she|they) (?:track|tracks|tracked|monitor|monitors) (?:my )?(?:phone|location|messages|every move|spending)\b|\b(?:you|he|she|they) (?:check|checks|checked) my (?:phone|messages|texts) (?:every|all the time|constantly)\b|\b(?:you|he|she|they) (?:threaten|threatens|threatened) (?:to (?:take|leave|hurt|kill|kick|throw|tell|post|ruin|end)|me)\b|\bi have to (?:ask (?:you|him|her|them) )?(?:for permission|ask permission) (?:to|for|before)\b/i,
    degrade: new RegExp("\\b(?:no ?one|nobody|no-one) (?:else )?(?:would|will|could) (?:ever )?(?:want|love|have|put up with|date|believe) you" + END + "|\\byou(?:'re| are|r| r) (?:so |completely |totally |utterly |just )?(?:worthless|nothing without me)\\b|\\byou(?:'re| are) lucky (?:i|anyone) (?:put up with|puts up with|stay with|stays with) you\\b|\\byou(?:'ll| will) never (?:find|get) (?:anyone|anybody|someone) (?:else|better)\\b|\\bwithout me you(?:'re| are|'d be| would be) nothing\\b", 'i')
  };
  var PLAYFUL = /😂|🤣|😆|😜|😝|😛|😹|💀|👀|🙈|\b(?:lol+|lmao+|lmfao|rofl|haha\w*|hehe\w*|jk|jaja\w*|just kidding|spill|bestie)\b/;
  // a location or "who were you with" said as an order, not a kind ask: "Send me your location now."
  var POLITE_ASK = /\b(?:can|could|would|will) you (?:please )?(?:just )?$|\bplease $|\bif you (?:can|could|want|like),? $/;
  function hit(t, re, text) { var m = t.match(re); if (!m) return null; var en = m.index + m[0].replace(/[\s,.!?]+$/, '').length; return { start: m.index, end: en, text: String(text).slice(m.index, en), m: m }; }
  // -> {kind: 'monitor'|'isolate'|'degrade', start, end, text} for the first sign of control, or null
  function control(text) {
    var t = prep(text), found = [];
    // a playful line ("I'm watching you 👀 don't eat my chips", "who were you texting all night? 👀 spill") is not a check-up
    var playful = PLAYFUL.test(t);
    // a worried parent or friend ("Where were you? Who were you with? We were worried sick.") is not a clear case
    var worried = /\b(?:worried|scared something|were you (?:ok|okay|safe)|are you (?:ok|okay|safe)|you (?:ok|okay)\?|missed you|we saved you)\b/.test(t);
    var ph = hit(t, CONTROL_RES.phone, text);
    // "Show me your phone, I want to see the wedding photos", "Turn your location on so I can find you at the festival"
    if (ph && !/\b(?:photos?|pics?|pictures?|videos?|memes?|tiktoks?|reels?|tickets?|boarding pass|the map|directions|the game|that app|the app)\b|\bso (?:i|we) can (?:find|meet|see where|pick)\b|\bat the (?:festival|concert|gig|airport|station|match|park|beach|fair)\b/.test(t)) found.push(Object.assign(ph, { kind: 'monitor' }));
    var lo = hit(t, CONTROL_RES.loc, text), wh = hit(t, CONTROL_RES.who, text), wr = hit(t, CONTROL_RES.where, text);
    if (wh && worried) wh = null;
    if (wr && worried) wr = null;
    if (lo) {
      var before = t.slice(Math.max(0, lo.start - 30), lo.start), after = t.slice(lo.end, lo.end + 60);
      var demanded = /^\s*(?:right )?now\b|^\s*(?:immediately|asap|this (?:second|minute))\b/.test(after) || (!POLITE_ASK.test(before) && !/\b(?:when you (?:get|leave|arrive|set off|head|are on your way|'re on your way)|once you|so i know|to let me know|if you want|for safety|so we can find|so (?:i|we) can (?:find|meet|pick)|please|pls|plz)\b|\bx+\s*$/.test(after));
      if (demanded || wh || wr) found.push(Object.assign(lo, { kind: 'monitor' }));
    }
    // "Who were you with?" on its own, or with another check, said curtly: not "Who were you with at the party? Sounds fun!"
    var bareWho = wh && /^\s*[?.!]*\s*(?:$|[a-z])/.test(t.slice(wh.end)) && !/^\s*[?.!]*\s*(?:at|on|in|for|last|today|tonight|yesterday|about|regarding|earlier|before|from|just now|at work)\b/.test(t.slice(wh.end)) && !/\b(?:fun|nice|lovely|great|glad|hope|cool|amazing|sounds|enjoy|xx?)\b|[!]\s*$|😊|🙂|😄|❤/.test(t);
    if (playful) bareWho = false;
    // a bare "Who were you with?", or "Where were you? Who were you with?" on its own, is a question, not a check-up:
    // it counts with a location or phone demand, or when it's demanded ("tell me", "answer me", "prove it", "now")
    var demandMark = /\b(?:tell me|answer me|prove it|explain|right now|now)\b/.test(t);
    if (bareWho && !demandMark) bareWho = false;
    if (wh && (lo || ph || (wr && demandMark) || bareWho || /\b(?:tell me|answer me)\b/.test(t))) found.push(Object.assign(wh, { kind: 'monitor' }));
    var tr = hit(t, CONTROL_RES.track, text);
    if (tr && !playful && !/\b(?:we (?:both )?agreed|you asked me to|you said i could|like we said|we share (?:our )?locations?|with your (?:ok|okay|permission)|for (?:your|the) (?:job|work|shift)|on the (?:family|kids') (?:plan|account))\b|\bwhen you(?:'re| are) (?:driving|out late|on your way|walking home)\b/.test(t)) found.push(Object.assign(tr, { kind: 'monitor' }));
    var wa = hit(t, CONTROL_RES.watch, text); if (wa && !playful) found.push(Object.assign(wa, { kind: 'monitor' }));
    var pv = hit(t, CONTROL_RES.prove, text); if (pv && !playful && (wr || wh || lo || /\b(?:where|who|what) (?:were|was|did) you\b/.test(t))) found.push(Object.assign(pv, { kind: 'monitor' }));
    if (playful) found = found.filter(function (x) { return x !== ph || !/^(?:show|give|hand) me your phone$/.test(x.text.toLowerCase()); });
    var sh = hit(t, CONTROL_RES.shut, text); if (sh && !playful) found.push(Object.assign(sh, { kind: 'isolate' }));
    var is = hit(t, CONTROL_RES.isolate, text);
    // a one-off plan with its reason ("You can't see your friends tonight, it's your mum's birthday dinner") or a house rule
    // with an end ("You're not allowed out until your homework's done") is ordinary family life, not cutting someone off
    if (is) {
      var rest = t.slice(is.end, is.end + 80);
      if (/^[^.!?]{0,30}?\b(?:until|till|unless|before)\b/.test(rest) || (/^[^.!?]{0,20}?\b(?:tonight|today|this (?:evening|afternoon|morning))\b/.test(rest) && /\b(?:it's|it is|because|cos|'cause|we've got|we have|remember|birthday|dinner|appointment|exam)\b/.test(rest))) is = null;
    }
    if (is) found.push(Object.assign(is, { kind: 'isolate' }));
    // someone saying they're afraid, or describing being controlled ("I'm scared of you", "he won't let me see my friends",
    // "she controls all my money"): about safety, not wording. Everyday fears ("I'm scared of spiders") and jokes are not
    var fe = hit(t, CONTROL_RES.fear, text); if (fe && !(playful && !/\bscared of you\b/.test(fe.text.toLowerCase()))) found.push(Object.assign(fe, { kind: 'fear' }));
    var tl = hit(t, CONTROL_RES.told, text); if (tl && !playful) found.push(Object.assign(tl, { kind: 'fear' }));
    var dg = hit(t, CONTROL_RES.degrade, text); if (dg) found.push(Object.assign(dg, { kind: 'degrade' }));
    if (!found.length) return null;
    found.sort(function (a, b) { return a.start - b.start; });
    var f = found[0];
    return { kind: f.kind, start: f.start, end: f.end, text: f.text, kinds: found.map(function (x) { return x.kind; }) };
  }
  // "If you leave me I'll kill myself": a threat to self-harm used as leverage. Still a threat, and also a safety worry.
  var SELFHARM_RE = /\b(?:i'll|i will|i'm going to|i am going to|i'm gonna|i swear i'll) (?:kill myself|hurt myself|end it all|end my life|take my (?:own )?life|not be here)\b|\bkill myself\b|\bend my life\b/i;
  var SELFHARM_MORE = /\bend it all\b|\b(?:don't|do not|dont) want to (?:be alive|live|wake up|exist)(?: anymore| any more)?\b|\b(?:don't|do not|dont) want to be here (?:anymore|any more)\b(?! (?:at|in|with)\b)|\b(?:better off without me|better off if i (?:wasn't|weren't|was not|were not) (?:here|around|alive)|no reason to (?:live|go on|keep going)|can't go on (?:anymore|any more|like this)|(?:thought|thinking) about (?:how i'd|how i would|ending (?:it|my life)|killing myself|not being here)|i (?:want|wanna) to die|wish i (?:was|were) dead|wish i (?:wasn't|was not|weren't) (?:alive|here)|take my own life|me voy a matar|quiero morir(?:me)?|no quiero vivir|me quiero morir)\b/i;
  // "I want to die 💀 this meeting", "I'll die of embarrassment": everyday exaggeration, not a crisis
  var SELFHARM_JOKE = /\b(?:die|dying|dead) (?:of|from|laughing)\b|\bthis (?:meeting|class|lecture|exam|traffic|queue|heat|song|show)\b/i;
  function selfHarm(text) {
    var t = prep(text);
    if (SELFHARM_RE.test(t)) return true;
    var m = t.match(SELFHARM_MORE);
    return !!m && !(PLAYFUL.test(t) && /want|wanna|wish/.test(m[0])) && !SELFHARM_JOKE.test(t);
  }

  /* A request or a "no" that comes from care, safety, health or respect for the relationship: not control.
     "worry": "text me if you'll be late so I don't worry", "please see a doctor about that cough", "I'd rather you didn't drink and drive"
     "respect": "I'm not okay with that", "please don't flirt with your ex, it hurts me", "no, we agreed we wouldn't", "can we keep phones off at dinner?"
     "rule": "I need you to be home by 6 for the kids' dinner", "not until your homework's done", a plan or a house rule
     "no": "you're not allowed to go to that party", "I won't let you go out with him": a firm no. Not control on its own; it lands
           better with the reason and room to talk.
     Signs of control (taking away someone's choice: cutting them off from people generally, checking their phone or location
     without agreement, money, threats, fear) are read by control() and THREAT_RE, and always win over this. */
  var CARE_RES = {
    worry: /\bso (?:i|we) (?:don't|do not|won't|dont) (?:worry|panic|freak out)\b|\b(?:i|we)(?:'m| am|'re| are| was| were| get| got)? (?:so |really |a bit )?(?:worry|worried|scared|anxious) (?:about you|when you|if you|that you)\b|\bfor your (?:own )?(?:safety|health|sake)\b|\b(?:i'd|i would) (?:rather|prefer) you (?:didn't|did not|don't|not) (?:drink and drive|drive (?:drunk|after drinking|after a drink|tired|that late)|walk home alone|go alone)\b|\b(?:please |could you |can you |would you )?(?:go and |go to |)(?:see|call|book|ring) (?:a|the|your) (?:doctor|gp|dentist|nurse|physio|therapist|counsellor|counselor)\b|\bget (?:that|it|this|yourself) (?:checked|looked at|seen to)\b|\b(?:text|message|call|ring|tell) (?:me|us) (?:when|once|if) you(?:'re| are|'ll| will|'ve)? ?(?:get (?:there|home|in)|got (?:there|home|in)|arrive|land|be late|running late|are (?:home|safe)|'re (?:home|safe)|leave)\b|\blet (?:me|us) know (?:when|once|that|if) you(?:'re| are|'ve| have)? ?(?:home|safe|got (?:there|home|in)|get (?:there|home|in)|arrive|land|okay|ok)\b|\b(?:be|stay|get home) safe\b|\bdrive safe(?:ly)?\b|\btake care of yourself\b|\bplease (?:eat|rest|sleep|drink some water)\b/i,
    respect: /\b(?:it|that|this) (?:really )?(?:hurts|upsets|bothers) me\b|\bi(?:'m| am) not (?:okay|ok|comfortable|happy|cool) with\b|\b(?:i'd|i would) (?:rather|prefer) (?:you|we) (?:didn't|did not|don't|not|wouldn't)\b|\bplease (?:don't|do not|dont|stop)\b|\bwe (?:agreed|said) (?:we(?:'d| would)|we wouldn't|we'd not|not to|that|no)\b|\b(?:can|could) we (?:agree|keep|try to keep|both agree|not)\b|\bno,? i (?:don't|do not|dont) want you (?:going|to go|to)\b|\bi (?:don't|do not|dont) want you (?:going|to go) (?:to|out with)\b|\bi(?:'m| am) not comfortable\b|\bi (?:don't|do not|dont) want you (?:texting|messaging|seeing|dating|flirting with|sleeping with|talking to) (?:other (?:people|girls|guys|men|women|blokes)|your ex|him|her|them)\b/i,
    rule: /\b(?:home|back) by (?:\d|six|seven|eight|nine|ten|eleven|twelve|midnight|dinner|bedtime|dark)\b|\b(?:until|till|before|not until) (?:your|you've done your|you finish your|you've finished your) (?:homework|chores|room|revision|jobs)\b|\bschool night\b|\bbed ?time\b|\bhouse rules?\b|\bfor the kids\b|\bkids'? (?:dinner|bedtime|tea)\b|\bscreen time\b|\bno phones? (?:at|during) (?:dinner|the table|tea|meals?)\b/i,
    no: /\b(?:you're|you are|youre|you aren't|you are not) (?:not )?allowed to\b|\bi won't let you\b|\b(?:don't|do not) you dare (?:go|see|talk|call|text)\b|\byou(?:'d| had) better not (?:go|see|talk|call|text)\b|\bi forbid\b|\byou(?:'re| are) not going (?:out|to (?:that|the|this))\b|\byou can't (?:go|see|have) (?!your friends|your family|anyone|anybody|people)/i
  };
  // -> {kind: 'worry'|'respect'|'rule'|'no', start, end, text, kinds} or null
  function care(text) {
    var t = prep(text), found = [];
    ['worry', 'respect', 'rule', 'no'].forEach(function (k) { var h = hit(t, CARE_RES[k], text); if (h) found.push(Object.assign(h, { kind: k })); });
    if (!found.length) return null;
    var f = found[0];
    return { kind: f.kind, start: f.start, end: f.end, text: f.text, kinds: found.map(function (x) { return x.kind; }) };
  }

  // a step you take to look after yourself, said with care: a boundary, not a threat
  function isBoundary(text) {
    var t = prep(text), m = t.match(BOUNDARY_RE);
    return !!m && !THREAT_RE.test(t) && (BOUNDARY_CARE.test(t) || BOUNDARY_SOFT.test(m[0]));
  }
  function findAll(re, text) {
    var t = prep(text), rx = new RegExp(re.source, re.flags.replace('g', '') + 'g'), m, out = [];
    while ((m = rx.exec(t))) {
      if (!m[0].length) { rx.lastIndex++; continue; }
      var lead = (m[0].match(/^[.!?]\s+/) || [''])[0].length, st = m.index + lead, en = m.index + m[0].replace(/[\s,.!?]+$/, '').length;
      out.push({ start: st, end: en, text: String(text).slice(st, en) });
    }
    return out;
  }
  // -> [{start, end, text}] for each threat; none when the line is a calm boundary
  function threats(text) { return isBoundary(text) ? [] : findAll(THREAT_RE, text); }
  // -> [{start, end, text}] for each dig or scorecard, longest first where two overlap
  function digs(text) {
    var out = [];
    DIG_RES.forEach(function (re) { findAll(re, text).forEach(function (x) { if (!out.some(function (y) { return x.start < y.end && y.start < x.end; })) out.push(x); }); });
    return out.sort(function (a, b) { return a.start - b.start; });
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
    // capitals used to mock ("you're SO busy", "you're REALLY helpful"): contempt said through emphasis
    var src = String(text == null ? '' : text).replace(/[’‘`´]/g, "'"), cm, crx = /\b(?:[Yy]ou(?:'re| are| were)|[Uu]r|[Yy]oure)\s+(?:SO+|SUCH|REALLY|VERY|TOTALLY|SOOO+|JUST SO)\s+(?:an? )?[a-z]+(?:\s+[a-z]+)?/g;
    while ((cm = crx.exec(src))) { var c0 = cm.index, c1 = cm.index + cm[0].length; marks = marks.filter(function (x) { return !(x.id === 'appreciation' && x.start < c1 && c0 < x.end); }); marks.push({ id: 'contempt', start: c0, end: c1, text: src.slice(c0, c1) }); }
    // "Sure, because you're so busy": agreement said as a jab
    var sb = /(?:^|[.!?]\s+)(sure|right|yeah|oh sure|of course),? because (?:you(?:'re| are| were)|ur|youre|you (?:always|totally|really|actually|never))\b[^.!?\n]{0,50}/g;
    while ((cm = sb.exec(t))) { var st0 = cm.index + cm[0].indexOf(cm[1]); marks.push({ id: 'sarcasm', start: st0, end: cm.index + cm[0].length, text: String(text).slice(st0, cm.index + cm[0].length) }); }
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
    // a denial ("never said you were") isn't an always/never or a label aimed at them
    out = out.filter(function (x) { return !((x.id === 'absolute' || x.id === 'label') && denial(text, x.start, x.end)); });
    // sarcasm or an edge cancels the warmth it's wrapped in
    if (out.some(function (x) { return x.id === 'sarcasm' || x.id === 'contempt'; })) out = out.filter(function (x) { return x.id !== 'appreciation'; });
    out.sort(function (a, b) { return a.start - b.start; });
    return out;
  }
  /* sig17: a denial ("never said you were", "I never said that", "I didn't say you were lazy") repeats or refuses a charge;
     it isn't an always/never or a label aimed at them. denial(text, start, end) -> true when the words at start..end sit
     inside one. Used by the shared scan, the single-message checker and the whole-chat reader. */
  var DENY_VERB = "(?:said|say|says|saying|meant|mean|told|tell|claimed|claim|called|call|implied|imply|suggested|suggest|accused|thought|think|asked|ask|promised|agreed|did that|wrote)";
  var DENY_AT = new RegExp("^\\s*(?:(?:but|no|nah|and|i mean|well|ok(?:ay)?|look|honestly|um|erm|wait)[,\\s]+)*(?:i\\s+(?:have\\s+|had\\s+)?)?$");
  var DENY_AFTER = new RegExp("^\\s+(?:once\\s+|ever\\s+)?" + DENY_VERB + "\\b");
  var DENY_PRE = new RegExp("(?:^\\s*|\\bi\\s+|[,;]\\s*)(?:never|didn't|did not|don't|do not|have never|never once|wasn't|was not)\\s+(?:ever\\s+|once\\s+)?" + DENY_VERB + "\\b[^.!?\\n,;]*$");
  function denial(text, start, end) {
    var t = prep(text), s0 = Math.max(t.lastIndexOf('.', start - 1), t.lastIndexOf('!', start - 1), t.lastIndexOf('?', start - 1), t.lastIndexOf('\n', start - 1)) + 1;
    var pre = t.slice(s0, start), w = t.slice(start, end);
    if (/^never\b/.test(w) && DENY_AT.test(pre) && DENY_AFTER.test(t.slice(start + 5, start + 40))) return true;
    return DENY_PRE.test(pre);
  }
  function has(text, id) { return scan(text).some(function (m) { return m.id === id; }); }
  function hasAppreciation(text) { return has(text, 'appreciation'); }
  function isFlat(text) { return BY.flat.re.test(prep(text)); }

  /* Threats of harm and intimidation, said directly ("I'm going to slap you", "ima beat ur butt"), as an idiom ("you're dead",
     "I'll end you") or veiled ("I know where you live", "keep talking and see what happens", "you've been warned").
     Read flatly, any of these can frighten someone. A game, "lol" or an emoji around it (playful: true) makes it
     "hard to tell", never "fine". Shared by the Chat analyzer, the pocket checker and the Conversation Reader.
     harm(text) -> null, or {kind: 'physical'|'idiom'|'veiled', start, end, text, playful, game} (the first one found) */
  var HARM_VERB = "beat(?:s|ing)?(?: (?:the (?:crap|hell|shit|living daylights|snot|stuffing)|seven bells) out of)?|hit|punch|slap+|smack|kick|kik|hurt|choke|strangle|stab|shoot|shank|kill|murder|end|destroy|wreck|smash|crush|break|knock|deck|thump|whack|batter|throttle|drown|bury|burn|belt|whoop|whup|spank|wring|rip|tear|slaughter|bash|pound|clobber|sock|shove|smoke|cream|obliterate|annihilate|demolish|mess|jump|slit|headbutt|stomp|thrash|flatten|own|bitch ?slap|knock out|beat up|fight|drag|clock|bust|slam";
  var HARM_BODY = "butt|but|ass|arse|behind|bum|backside|booty|tail|hiney|face|head|neck|nose|teeth|legs?|arms?|hands?|fingers?|kneecaps?|knees?|skull|brains?|lights|jaw|eyes?|throat|mouth|ribs?|lips?|cheek|chin|ears?|stomach|gut|balls|back|spine|life|car|tires|tyres|windows?|house|kids?|stuff|phone|face in";
  var HARM_IDIOM_V = /^(?:destroy|end|wreck|crush|smoke|own|cream|obliterate|annihilate|demolish|slaughter)$/;
  var HARM_SOFT_BODY = /^(?:butt|but|behind|bum|backside|booty|tail|hiney)$/;
  // "I'm going to" / "ima" / "I swear I'll" / "someone should": wanting or meaning to, not a story about the past
  var HARM_RX = new RegExp("\\b(i'm|i'll|i'd|i've|ima|imma|i'ma|i'mma|ill|im|i|someone|somebody|let me|lemme|gonna|going to|finna|wanna)\\b((?:\\s+(?:can|coming|gotta|'ll|'m|'d|ll|will|would|could|should|might|may|want|wanna|to|swear|god|i|i'll|i'm|am|m|going|gonna|goin|goin'|about|finna|fixing|tryna|literally|so|just|really|totally|seriously|actually|honestly|definitely|straight|up|fr|come|go|over|there|here|and|gotta|need|needs|oughta|ought|is|fucking|freaking|effing|absolutely|gladly|happily|then|get|gon|bout|'bout|a|be|to|will|swear|seriously|personally|myself|right|now))*)\\s+(" + HARM_VERB + ")(?:s|ed|ing)?\\s+(you|u|ya|yah|y'all|yall|him|her|them|(?:your|ur|yo|you're|youre)\\s+(?:\\w+\\s+)?(?:" + HARM_BODY + "))\\b", "gi");
  var HARM_INTENT = /\bso i can\b|\bcoming\b|'ll|\bll\b|\bwill\b|\bwould\b|\bcould\b|\bshould\b|\bmight\b|\bgonna\b|\bgoing\b|\bgoin|\babout\b|\bbout\b|\bfinna\b|\bwant\b|\bwanna\b|\bswear\b|\btryna\b|\bgotta\b|\bneeds?\b|\boughta\b|\bought\b|\bgon\b/;
  var HARM_PHRASES = [
    // idioms: often a joke, never safe to read as one from the words alone
    ['idiom', /\b(?:you(?:'re| are|re|r)?|ur|u r|youre) (?:so |sooo+ |totally |completely |gonna be |going to be |literally |so fucking )?(?:dead(?! (?:tired|right|wrong|on|set|serious|beat|last|center|centre|end|weight|ringer|giveaway|easy|quiet|cute|funny|to me|inside))(?: meat)?|a dead (?:man|woman)|toast|done for|going down|in (?:so much|big) trouble)\b/],
    ['idiom', /\b(?:(?:you|u)(?:'re|re| are)?|ur|youre) (?:gonna|going to) get (?:it|yours|what(?:'s| is) coming)\b|\b(?:you|u)(?:'ll| will)? get what(?:'s| is) coming(?: to (?:you|u))?\b|\b(?:you|u)(?:'ll| will) get yours\b/],
    ['idiom', /\bi(?:'ll| will|'m going to|'m gonna| am going to|ll) get (?:you|u) (?:back|for (?:that|this|it))\b/],
    ['idiom', /\bprepare (?:to (?:get |be )?(?:destroyed|crushed|wrecked|beaten|annihilated|obliterated|smoked|owned|demolished|slaughtered)|for (?:war|battle|defeat|pain))\b|\b(?:you|u)(?:'re|re| are)? (?:gonna|going to) regret (?:this|it|that)\b/],
    ['idiom', /\bcoming for (?:your|ur) (?:crown|title|high score|record|spot|job|throne)\b/],
    ['idiom', /\bi(?:'m| am|m) coming for (?:you|u)\b(?! (?:at|in|around|after|on|tomorrow|tonight|later|when|by|soon)\b)/],
    // physical harm said another way
    ['physical', /\b(?:wait|just wait) (?:till|until|til|'til|untill) i (?:get my hands on|catch|get hold of|get ahold of) (?:you|u)\b|\blet me catch (?:you|u)\b/],
    ['physical', /\b(?:you|u) (?:want|wanna|need|deserve|are asking for|'re asking for|re asking for) (?:a |an |some |to get (?:a |an )?)?(?:good |proper |real )?(?:slap|smack|punch|beating|kicking|hiding|whooping|whupping|spanking|clip round the ear|black eye|fat lip|knuckle sandwich|thump|kick)\b/],
    ['physical', /\b(?:you(?:'ll| will|'re going to| are going to|'re gonna| gonna)) (?:get|need) (?:a |an )?(?:slap|smack|punch|beating|kicking|hiding|hurt)\b|\bunless you want (?:a |an )?(?:slap|smack|punch|beating|kicking|hiding|to get hurt)\b/],
    ['physical', /\b(?:you're|you are|ur|youre|u r) lucky (?:i|i'm|im) (?:don't|didn't|do not|can't|am not|'m not|not|wasn't) (?:there|\w+ (?:you|u))\b/],
    ['physical', /\b(?:give (?:you|u) something to cry about|slap the (?:taste|smile|smirk|stupid|attitude) (?:out of|off) (?:your|ur|you|u)|teach (?:you|u) a lesson|wipe (?:that|the) (?:smile|smirk|grin) off (?:your|ur) face|make (?:you|u) (?:hurt|bleed|suffer)|make sure (?:you|u) (?:can't|cannot|never) (?:walk|talk|see|move)|rip (?:your|ur) (?:head|face|throat|arms?|eyes?) (?:off|out)|shove (?:your|ur) face)\b/],
    ['physical', /\b(?:put|putting) (?:you|u) (?:through (?:a|the) (?:wall|window)|in (?:the|a) (?:hospital|ground|grave|wheelchair))\b|\bthrow (?:you|u) (?:down|out of (?:the|a) window|off|through)\b/],
    ['physical', /\b(?:want|wanna|need) me to (?:beat|hit|punch|slap+|smack|kick|hurt|choke|strangle|stab|shoot|kill|knock|whack|belt|whoop|spank) (?:you|u)\b|\b(?:my|this) (?:fist|hand|foot|boot|knee) (?:through|in|into|down) (?:your|ur) (?:face|mouth|teeth|head|throat)\b/],
    ['physical', /\bwhat i(?:'ll| will|'m going to|'m gonna)? do to (?:you|u)\b|\bdon't make me (?:hurt|hit|slap|smack|beat|punch|kill) (?:you|u)\b/],
    // veiled: a warning with a threat inside it
    ['veiled', /\bi (?:know|kno|knw) where (?:you|u|your|ur|yo)(?: \w+){0,3}? (?:live|lives|work|works|sleep|sleeps|go to school|goes to school|park|parks|stay|stays)\b|\bi know what (?:car|time|bus|route) (?:you|u)\b/],
    ['veiled', /\b(?:(?:you|u)(?:'d| had|d)? )?(?:better|betta|best) (?:watch|wach|mind) (?:yourself|urself|ur self|your self|your back|ur back|your step|ur step|your mouth|ur mouth|it)\b/],
    ['veiled', /(?:^|[.!?,]\s*|\b(?:so|now|just|and|hey|ok|okay|you)\s+)(?:watch|wach) (?:yourself|urself|your mouth|ur mouth|your step|ur step|it|your tone|your back|ur back)(?=\s*(?:[.!?,]|$|😡|🤬|👊|or\b))/],
    ['veiled', /\bi(?:'d| would) (?:be careful|watch (?:myself|yourself|it|my back|your back)) if i (?:were|was) (?:you|u)\b|\bi(?:'d| would) watch (?:myself|yourself)\b/],
    ['veiled', /\b(?:you|u)(?:'d| had)? (?:better|betta|best) be (?:very |real |really )?careful\b|\bcareful[.!]*\s*(?:i mean it|i'm warning you|i am warning you)\b|(?:^|[.!?]\s*)be (?:very|real|really|extra) careful[.!]*\s*$|\bcareful what you (?:say|wish|do|post|tell)\b/],
    ['veiled', /\b(\w+(?:'\w+)?),?\s+(?:see|watch|find out) what happens\b|^(?:see|watch|find out) what happens\b|\bsee where (?:it|that|this) gets (?:you|u)\b/],
    ['veiled', /\b(?:you|u)(?:'re| are|re)? asking for (?:it|trouble|(?:a |an )?(?:good |proper )?(?:slap|smack|punch|beating|kicking|hiding|whooping|spanking))\b|\bi(?:'m| am|m|'ll| will) (?:coming|come) (?:over|round) there\b/],
    ['veiled', /^\s*(?:keep|kep) (?:talking|talkin'?|pushing|laughing|running your mouth|testing me)[.!]*\s*$/],
    ['veiled', /\b(?:not )?(?:someone|somebody|the person|the guy|the girl) you (?:want|wanna|would want) to (?:upset|cross|mess with|annoy|anger|test|make angry)\b|\byou (?:don't|do not|dont) (?:want|wanna) to (?:upset|cross|mess with|test) me\b/],
    ['idiom', /\b(?:you(?:'re| are|re| r)|ur|youre) (?:skating )?on (?:very )?thin ice\b/],
    // ominous lines with no threat words ("This isn't over", "I saw you leave work at 5:40", "It's a small town"): read
    // flatly they can be a warning, and the words alone can't settle it. Read as "hard to tell", and the page asks one question.
    ['idiom', /\b(?:this|it)(?: is|'s|s)? (?:not|n't|isnt|isn't) over(?=\s*(?:[.!…🙂🙃😏]|$))|\bwe(?:'re| are) not (?:finished|done)(?:, you and me| yet)?(?=\s*(?:[.!…🙂🙃😏]|$))|\bi(?:'ll| will) (?:remember|not forget|never forget) (?:this|that)(?=\s*(?:[.!…🙂🙃😏]|$))|\benjoy (?:it|this) while it lasts(?=\s*(?:[.!…🙂🙃😏]|$))|\bmark my words(?=\s*(?:[.!…🙂🙃😏]|$))|\bi(?:'ll| will) be in touch(?=\s*(?:[.!…🙂🙃😏]|$))|\bi(?:'m| am) (?:always )?watching(?=\s*(?:[.!…🙂🙃😏]|$))|\bremember who (?:you're|you are) talking to\b|\byou(?:'ll| will) understand soon enough\b|\b(?:it's|its|it is) a small (?:town|world)(?=\s*(?:[.!…🙂🙃😏]|$))|\baccidents happen(?=\s*(?:[.!…🙂🙃😏]|$))|\bpeople talk(?=\s*(?:[.!…🙂🙃😏]|$))|\byou can(?:'t|not) hide(?=\s*(?:[.!…🙂🙃😏]|$))|\byou can(?:'t|not) hide (?:forever|from me)\b|\bdon't say i didn't warn you(?=\s*(?:[.!…🙂🙃😏]|$))|\bchoose your (?:next )?words (?:very )?carefully(?=\s*(?:[.!…🙂🙃😏]|$))|\byou don't know what i know\b|\bi(?:'d| would) sleep (?:lightly|with one eye open) if i (?:were|was) you\b|\b(?:sorry|regret) (?:that )?you laughed\b|\bhow brave you are (?:in person|to my face)\b|\bwhat your (?:boss|wife|husband|partner|mum|mom|dad|parents|family|kids) would (?:think|say) (?:of|about) (?:these|those|the|this) (?:photos|pictures|pics|messages|texts|videos)\b|\byou won't always have (?:people|someone|friends|anyone) (?:around|with) you\b|\byou got lucky this time\b|\b(?:be a |would be a |it'd be a )?pity if (?:your|you|something|anything)\b|\bcount yourself lucky(?=\s*(?:[.!…🙂🙃😏]|$))|\bhope you never need my help\b|\bkeep (?:my|your) mouth shut if i (?:were|was) you\b|\bwhat happens to people who\b|\bi(?:'m| am) patient\.\s*i can wait\b|\bpray (?:that )?i(?:'m| am) in a good mood\b|\bsee you around(?=\s*(?:[.!…🙂🙃😏]|$))|\bevery action has (?:a )?consequences?\b|\bnow live with it\b|\block your doors?(?=\s*(?:[.!…🙂🙃😏]|$))|\bsee how that works out(?: for you)?(?=\s*(?:[.!…🙂🙃😏]|$))|\bwe'll see who(?:'s| is) laughing(?: (?:now|tomorrow|tonight|then|later|soon|next))?(?=\s*(?:[.!…🙂🙃😏]|$))|\b(?:happy with yourself|proud of yourself)\.?\s*enjoy it(?=\s*(?:[.!…🙂🙃😏]|$))|\byou think you(?:'ve| have) won(?=\s*(?:[.!…🙂🙃😏]|$))|\bhave a way of coming back (?:around|to you)\b|\b(?:interesting|funny) (?:that|how) you (?:walk|go|leave|drive|take|park)\b|\bthe same way every (?:night|day|morning)\b|\bi saw you (?:leave|leaving|walk|walking|go|going|at|outside|with|get|getting|park|parking|coming)\b(?![^.!?]{0,40}\b(?:great|amazing|brilliant|on (?:the )?(?:news|tv|telly|stage)|so (?:good|well)|lovely)\b)|\byour (?:sister|brother|mum|mom|dad|mother|father|wife|husband|kids?|daughter|son|girlfriend|boyfriend|partner) (?:lives|is) (?:alone|on (?:her|his|their) own|by (?:her|him|them)sel(?:f|ves))\b|\b(?:is|does) your (?:mum|mom|dad|mother|father|sister|brother|nan|gran|family) still (?:live )?at\b(?![^.!?]*\?\s*i (?:want|need|'d like|would like) to send)|\byou have kids,? right\b|\bthink about (?:them|your kids|your family|your children)(?=\s*(?:[.!…🙂🙃😏]|$))|\b(?:you should|better) (?:really )?lock your (?:back |front )?doors?(?=\s*(?:[.!…🙂🙃😏]|$))|\bregret not answering me\b|\bnice (?:jacket|coat|dress|shirt|top|shoes|car|house)(?: today| you've got| you have)?\.\s*(?:the|that) \w+ one\b/],
    ['veiled', /\btry me\b(?! (?:at|on|later|tomorrow|again|after|when|in|first|instead|next)\b)/],
    ['veiled', /\b(?:don't|do not|dont) (?:you )?(?:dare )?(?:test|cross|tempt) me\b|\b(?:don't|do not|dont) push (?:your|ur) luck\b|\byou(?:'re| are|re) pushing (?:your|ur) luck\b|\b(?:nobody|no one|no-one) (?:crosses|messes with|disrespects|tests) me\b/],
    ['veiled', /\b(?:you(?:'ve| have|ve)? been|you were|consider yourself|ur|you're|you are) warned\b|\b(?:last|final) warning\b|\bi(?:'m| am|m) (?:not going to |not gonna |only going to |only gonna )?warn(?:ing)? (?:you|u)\b|\bi won't warn (?:you|u) again\b/],
    ['veiled', /\bi(?:'m| am|m) watching (?:you|u)\b(?! (?:play|on|in|at|tonight|tomorrow|perform|sing|dance|win|grow)\b)/],
    ['veiled', /\b(?:your|ur) days are numbered\b|\bcount (?:your|ur) days\b|\bsleep with (?:one eye open|the lights on)\b|\bwon't see it coming\b|\b(?:it|this|things) (?:won't|will not|isn't going to|is not going to|wont) end well for (?:you|u)\b|\bthings (?:are going to|will|are gonna|gonna) get (?:ugly|messy|nasty)\b/],
    ['veiled', /\byou (?:don't|do not|dont) (?:want to|wanna) (?:see|know|find out) what (?:happens|i(?:'ll| will)? do|i'm capable)|\bwhat i(?:'m| am) capable of\b|\byou (?:don't|do not|dont) (?:want|wanna) to (?:find out|know)(?= *[.!?]*$)|\bwhile you (?:still )?can[.!]*\s*$|\byou won't like what happens\b|\byou (?:don't|do not|dont) know who (?:you're|you are|ur|youre) (?:messing|dealing|fucking|playing) with\b|\b(?:don't|do not|dont) (?:want to|wanna) make me (?:angry|mad)\b|\bwhat(?:'s| is) coming\b/],
    ['veiled', /\bi(?:'ll| will) find (?:you|u)\b(?! (?:at|in|there|when|later|a|some|the|after|on|by)\b)/],
    ['veiled', /\bsay (?:it|that) to my face\b|\bsee (?:you|u|ya) outside\b(?! (?:the|at|in|by|of|for|after|when|your|my)\b)|\bmeet me outside\b(?! (?:the|at|in|by|of|for|after work|after school|when|your|my)\b)|\b(?:settle|sort) (?:this|it|that) outside\b/],
    ['veiled', /\b(?:i(?:'ll| will)|i can|i(?:'m| am) going to|i'm gonna) (?:ruin|destroy|wreck|end) (?:your|ur) (?:life|career|reputation|marriage|business)\b|\bi can make (?:your|ur) life (?:very |really )?(?:hard|hell|difficult|miserable|a living hell)\b/],
    ['veiled', /\b(?:better|best) (?:hope|pray) (?:i|that i) (?:don't|never|do not) (?:see|find|catch|run into)\b|\bbetter not be (?:there|home|here) when i\b/],
    ['veiled', /\bi(?:'ll| will) be (?:waiting )?(?:for (?:you|u) )?(?:outside (?:your|ur) (?:house|home|work|place|school|door))|\bi(?:'ll| will) be waiting for (?:you|u) (?:after|outside)\b|\bi(?:'m| am|m) outside (?:your|ur) (?:house|home|work|place|school|door|office)\b(?! with)/],
    ['veiled', /\bi(?:'d| would) hate for something to happen to\b|\b(?:be a )?shame if (?:something|anything) (?:happened|were to happen|was to happen) to\b/],
    ['veiled', /\b(?:mess|play|fool) (?:around|with me)(?: again)? (?:and|n|&) find out\b|\bf(?:\*+|uck) around (?:and|n|&) find out\b|\bfafo\b/],
    ['veiled', /\bi dare (?:you|u)(?=\s*[.!?]*\s*$)|\b(?:do|try) (?:that|it) (?:one more time|again)[.,]? (?:and|n|&|i dare)\b|\b(?:ignore|lie to|talk back to|disrespect|embarrass) me (?:one more time|again) (?:and|n|&)\b|\btalk back (?:one more time|again) (?:and|n|&)\b|\b(?:one more|another) (?:word|time)(?: out of you)?(?:,| and| n| &)|\bsay (?:that|it) again(?:,| and| n| &|\s*(?:👊|🤜|😡|🤬|🔪))/],
    ['veiled', /(?:🔪|🗡|🔫|👊|🤜|🪓)(?:[\s\S]{0,20})(?:when i see|you|u\b)|(?:😡|🤬)\s*(?:🔪|🗡|🔫|👊|🤜|🪓)|(?:🔪|🗡|🔫|👊|🤜|🪓)\s*(?:😡|🤬)/]
  ];
  // "let's see what happens tomorrow", "I'll see what happens with the meeting": wondering, not warning
  var HARM_SEE_OK = /^(?:let's|lets|us|i'll|ill|i|we|we'll|to|me|gonna|just|can't|cant|could|might|will|would|should|wait|i'd|we'd)$/;
  var HARM_SEE_WONDER = /\b(?:let's|lets|we'll|we will|we can|we could|i'll|i will|i guess|guess we|curious|wonder|excited)\b/;
  // "watch yourself on the stairs", "be careful, the floor is wet", "I know where you live, so I'll drop it off": care, not a warning
  var HARM_CARE = /\b(?:stairs|steps|ice|icy|wet|floor|slippery|roads?|traffic|drive safe|driving|curb|break-ins?|burglar\w*|interview|kerb|heat|sun|knife|hot|sharp|weather|storm|snow|rain|so i(?:'ll| will| can)|so (?:we|you) can|and i(?:'ll| will)|i'll (?:drop|bring|swing|pop|send|post|pick)|drop (?:it|them|the \w+) off|swing by|pop (?:by|round|over))\b/;
  var HARM_GAME = /\b(?:at|in|on|for) (?:mario ?kart|chess|checkers|draughts|scrabble|monopoly|uno|cards|poker|darts|pool|snooker|bowling|tennis|golf|ping ?pong|table tennis|pickleball|badminton|squash|fifa|madden|fortnite|smash(?: bros)?|halo|cod|call of duty|minecraft|catan|trivia|(?:the )?(?:pub )?quiz|wordle|board games?|game night|(?:the|this|that|a) (?:game|race|match|round|rematch)|the 5k|the race|basketball|football|soccer|volleyball|paintball|laser tag|mini ?golf|karaoke|bingo|mahjong|dominoes|connect four|jenga|cornhole|beer pong|video games?|[a-z]+ bros|[a-z]+ ?kart|the arcade)\b|\b(?:game night|board game|rematch|best of (?:three|3|five|5)|next round|loser buys|winner buys|bring it on|game on|high score|tournament|league|snowball fight|pillow fight|with (?:this|a|my) pillow|practi[cs]ing|free throws|prank|spoil(?:s|ing|ed)? (?:the|it)|spoilers?|the finale|the surprise|eating my|eat my (?:leftovers|fries|food|lunch|chips)|my (?:fries|leftovers)|last slice|those cookies|the 5k|that pun|race you|to the car)\b/;
  var HARM_PLAY = /😂|🤣|😆|😜|😝|😛|😹|💀|😈|😤|🙃|😉|😏|🎮|🏆|🎲|♟|🏀|⚽|🎳|🏓|🎯|\b(?:lol+|lmao+|lmfao|rofl|haha\w*|hehe\w*|jk|jaja\w*|just kidding|kidding|joking|bestie)\b/;
  function harm(text) {
    var t = prep(text);
    if (!t.trim()) return null;
    var found = null;
    function take(kind, st, en) { if (!found || st < found.start) found = { kind: kind, start: st, end: en, text: String(text).slice(st, en) }; }
    HARM_RX.lastIndex = 0; var m;
    while ((m = HARM_RX.exec(t))) {
      var pre = (m[1] + ' ' + (m[2] || '')).trim(), verb = m[3].replace(/(?:s|ed|ing)$/, ''), obj = m[4], after = t.slice(m.index + m[0].length, m.index + m[0].length + 24);
      var subjIntent = /^(?:ill|ima|imma|i'ma|i'mma|someone|somebody|let me|lemme|gonna|going to|finna|wanna)$/.test(m[1]);
      if (!subjIntent && !HARM_INTENT.test(pre)) continue;               // "I'm sorry I hurt you": the past, not a threat
      if (/\b(?:not|never|don't|dont|didn't|didnt|won't|wont|wouldn't|wouldnt|no)\b/.test(pre)) continue;
      if (/^(?:hit|shoot|burn|send|smack)$/.test(verb) && /^\s+(?:up|a |an |the |over|with|me)\b/.test(after)) continue;   // "hit you up", "shoot you a text"
      if (/^beat$/.test(verb) && /^\s+(?:to (?:it|the|that)|there|home|back)\b/.test(after)) continue;                      // "beat you home"
      if (/^kill$/.test(verb) && /^\s+with kindness\b/.test(after)) continue;
      if (/^drag$/.test(verb) && /^\s+(?:to|along|with|round|around|into town|out (?:to|for|with))\b/.test(after)) continue;   // "I'll drag you to the party"
      if (/^clock$/.test(verb) && /^\s+(?:in|out|on)\b/.test(after)) continue;
      if (/^fight$/.test(verb) && /^\s+(?:on|about|over) (?:that|this|it)\b/.test(after)) continue;
      if (/^mess$/.test(verb) && !/^\s+up\b/.test(after)) continue;
      if (/^(?:jump|own|end|pound|tear|rip)$/.test(verb) && /^\s+(?:start|a |the )/.test(after)) continue;
      var bodyM = obj.match(/\s(\w+)$/), soft = bodyM && HARM_SOFT_BODY.test(bodyM[1]);
      take(HARM_IDIOM_V.test(verb) || soft ? 'idiom' : 'physical', m.index, m.index + m[0].length);
    }
    HARM_PHRASES.forEach(function (p) {
      var rx = new RegExp(p[1].source, 'g'), x;
      while ((x = rx.exec(t))) {
        if (!x[0].length) { rx.lastIndex++; continue; }
        if (/what happens/.test(x[0]) && ((x[1] && HARM_SEE_OK.test(x[1])) || HARM_SEE_WONDER.test(t.slice(0, x.index).split(/[.!?\n]/).pop()))) continue;
        if (p[0] === 'veiled' && /watch|careful|know where|know what|what happens/.test(x[0])) {
          var sent = t.slice(x.index).split(/[.!?\n]/)[0] + ' ' + t.slice(x.index + x[0].length, x.index + x[0].length + 60);
          if (HARM_CARE.test(sent)) continue;
          if (/(?:see|watch|find out) what happens$/.test(x[0]) && /^\s+(?:with|when|if|at|on|in|next (?:week|month)|tomorrow|later|then|after)\b/.test(t.slice(x.index + x[0].length)) && !/\bto (?:you|u|your)\b/.test(t.slice(x.index + x[0].length, x.index + x[0].length + 12))) continue;
        }
        var lead = x[0].length - x[0].replace(/^[\s.!?,]+/, '').length;
        take(p[0], x.index + lead, x.index + x[0].length);
      }
    });
    if (!found) return null;
    found.game = HARM_GAME.test(t);
    found.playful = found.game || HARM_PLAY.test(t) || PLAYFUL.test(t);
    return found;
  }

  function esc(s) { return String(s).replace(/[&<>"]/g, function (c) { return { '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;' }[c]; }); }
  // The visible list, the same on every page that uses it
  function lookForHTML(opts) {
    opts = opts || {};
    var hard = LIST.filter(function (p) { return !p.good; }), good = LIST.filter(function (p) { return p.good; });
    function li(p) { return '<li><b>' + esc(p.name) + '</b>' + (p.ex && p.ex.length ? ' <span class="lf-ex">(' + p.ex.slice(0, 2).map(function (e) { return '“' + esc(e) + '”'; }).join(', ') + ')</span>' : '') + '<br><span class="lf-why">' + esc(p.what) + '</span></li>'; }
    return '<p>' + esc(opts.intro || 'The Chat analyzer (for one message or a whole conversation) and the Carrier Wave Decoder’s tone check both read wording with this same list, so the same words get the same reading in each. It reads words only, never tone of voice or history, so every mark is a “may land as,” not a verdict.') + '</p>' +
      '<h3 class="lf-h">What may land harder than you mean</h3><ul class="lf-list">' + hard.map(function (p) { return li(p) + (p.alsoAs ? li(p.alsoAs) : ''); }).join('') + '</ul>' +
      '<h3 class="lf-h">What tends to help</h3><ul class="lf-list">' + good.map(li).join('') + '</ul>' +
      '<p class="lf-note">Each tool also has a few checks of its own, like orders, labels, or a question that went unanswered, and it names them where they come up.</p>';
  }
  function lookFor(el, opts) { if (el) el.innerHTML = lookForHTML(opts); }

  var api = { IDIOMS: IDIOMS, idioms: idioms, LIST: LIST, BY: BY, SPELL: SPELL, SPELL_PHRASES: SPELL_PHRASES, spell: spell, scan: scan, has: has, hasTime: hasTime, hasAppreciation: hasAppreciation, isFlat: isFlat, TIME_RE: TIME_RE, lookFor: lookFor, lookForHTML: lookForHTML, prep: prep,
    THREAT_RE: THREAT_RE, BOUNDARY_RE: BOUNDARY_RE, BOUNDARY_CARE: BOUNDARY_CARE, DIG_RES: DIG_RES, threats: threats, digs: digs, isBoundary: isBoundary, denial: denial,
    CONTROL_RES: CONTROL_RES, control: control, SELFHARM_RE: SELFHARM_RE, SELFHARM_MORE: SELFHARM_MORE, selfHarm: selfHarm, PLAYFUL: PLAYFUL, CARE_RES: CARE_RES, care: care, harm: harm, HARM_GAME: HARM_GAME, HARM_PLAY: HARM_PLAY };
  if (typeof module !== 'undefined' && module.exports) module.exports = api; else root.TOLPatterns = api;
})(this);
