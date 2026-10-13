/* clarify-data.js: the questions a tool asks before it says anything about a situation that may be unfair.

   When a tool, worksheet, calculator or Professor Puddles sees something that MAY be unfair (one person doing
   most of the load, money that leans one way, one person making the decisions, one-sided apologies, a limit
   that feels unfair, a topic that keeps coming back, someone feeling unheard, pressure, or fear), it asks a
   few short questions first, and only then gives its read. The read is proportionate to the answers, never
   to the first thing the tool noticed. Questions, not verdicts. It describes behaviour and effects and never
   labels a person.

   Everything here is plain data plus one pure function. Nothing is stored or sent anywhere.

   API (browser: window.TOLClarifyData; Node: require('./clarify-data.js'))
     TYPES                       { id: {title, why, questions:[{id, short, text, answers:[{id, text, w, f}]}]} }
     ALIASES                     other names a tool may use for a type ('chores' -> 'load', 'unheard' -> 'communication' ...)
     typeId(name)                -> a type id, or null
     guessType(text)             -> a type id from a few plain words ("the dishes again" -> 'load'), or null
     questions(type, lang)       -> [{id, short, text, answers:[{id, text}]}] with "Not sure" and "Skip" added
     evaluate(type, answers, ctx)-> {level, key, type, reasons[], flags, score, safety, crisis, skipped, answers}
                                    answers: {questionId: answerId}; 'notsure' and 'skip' are always allowed.
                                    ctx: {text, lang}. ctx.text (anything the person typed) is checked for crisis
                                    wording and explicit threats only.
     next(result, lang)          -> {title, body, say, links:[{text, href}], extra, footer}: the proportionate next step
     exportForChat(lang)         -> a plain JSON-safe object of every bank, the rules and the next steps, for chat turns
     t(pair, lang)               -> the words in that language

   LEVELS
     0  "Sounds like an ordinary rough patch, or a one-off"  -> everyday tips
     1  "Worth a calm talk"                                    -> one tool and words to start
     2  "A pattern worth working on together"                  -> a plan: tools, worksheets, the six-week program
     3  "Worth talking to someone outside the two of you"      -> a neutral pointer (counsellor, doctor, someone you
                                                                 both trust, /outside-help.html), worded as an option
     4  safety                                                 -> the site's existing safety and crisis pages, unchanged,
                                                                 offered as a gentle question, never as a verdict

   THE RULES (tools/clarify/test-clarify.js checks every one of them)
     Each answer has a weight w (plus = more concern, minus = an ordinary explanation) and flags f.
       benign flags   agreed, temp, mutual, improving, content, care, oneoff, context, repairs
                      (agreed, temporary, goes both ways, talked about and getting better, both fine with it,
                      a limit set out of care or respect, a one-off, outside pressure, it gets repaired)
       pattern flags  often, long, stuck, oneway
       pressure (P)   fallout (saying no leads to a big row, days of silence, or something taken away), cantno
       clear signs(S) isolation (kept from people in general), surveil (phone, messages or location checked without
                      agreement), moneyctl (kept from money they need), textthreat (a threat in what they typed)
       safety         afraid ("I feel afraid"), threat ("they have threatened to hurt..."), danger ("not safe right
                      now"), and crisis wording in ctx.text
     "Not sure" and "Skip" weigh nothing. "Skip all" gives level 0 with ordinary tips, never escalation.
     score = the sum of w; C = answers with w >= 1; B = answers with a benign flag.
       Safety   afraid, threat, danger or crisis wording on their own; otherwise two different clear signs (S >= 2),
                or one clear sign together with a pressure sign (S >= 1 and P >= 1). Nothing else.
       Level 3  score >= 7 with at least 3 concerns, and either talking hasn't helped (stuck) or there is a pressure
                or clear sign.
       Level 2  score >= 5 with at least 2 concerns and something that makes it a pattern (often, long, stuck,
                one way, or a pressure or clear sign).
       Level 1  score >= 2; or any concern when it hasn't been talked about yet, talking hasn't changed it yet, or you
                don't know how they feel.
       Level 0  everything else.
     Floors: one clear sign is at least level 2; a pressure sign, or a threat in the typed words, at least level 1.
     Ordinary explanations pull the level DOWN: with no pressure or clear sign, two or more benign answers cap the
       read at level 1, and one benign answer caps it at level 2.
     One answer alone can never reach level 3 or safety, except "I feel afraid", "they have threatened to hurt...",
       "not safe right now", or crisis wording. (The largest single weight is 3; level 3 needs 3 concerns.)
     A "no", a limit, or a request made out of care or respect for the relationship (any relationship, couples
       included) is an ordinary explanation (benign 'care'), never a sign of anything worse.

   Words: plain, warm, both-sides. No labels for people. Spanish is used when the page is in Spanish
   (window.TOLLang.es(), or ctx.lang / lang = 'es'). */
(function (root) {
  'use strict';

  function P(en, es) { return { en: en, es: es }; }
  function t(x, lang) { if (x == null) return ''; if (typeof x === 'string') return x; return (lang === 'es' && x.es) ? x.es : x.en; }
  // an answer: id, words, weight, flags
  function A(id, en, es, w, f) { return { id: id, text: P(en, es), w: w || 0, f: f || [] }; }
  function Q(id, shortEn, shortEs, en, es, answers) { return { id: id, short: P(shortEn, shortEs), text: P(en, es), answers: answers }; }

  var BENIGN = ['agreed', 'temp', 'mutual', 'improving', 'content', 'care', 'oneoff', 'context', 'repairs'];
  var PATTERN = ['often', 'long', 'stuck', 'oneway'];
  var PRESSURE = ['fallout', 'cantno'];
  var SIGNS = ['isolation', 'surveil', 'moneyctl', 'textthreat'];
  var SAFETY = ['afraid', 'threat', 'danger'];

  /* ---------- questions used by more than one type ---------- */
  function qHowLong(textEn, textEs) {
    return Q('howlong', 'How long', 'Desde cuándo', textEn || 'How long has it been like this?', textEs || '¿Desde cuándo es así?', [
      A('new', 'A few weeks, or less', 'Unas semanas, o menos', -1),
      A('months', 'A few months', 'Unos meses', 1),
      A('years', 'A year or more', 'Un año o más', 2, ['long'])
    ]);
  }
  function qReason(textEn, textEs) {
    return Q('reason', 'A reason for now', 'Una razón por ahora', textEn || 'Is there a reason it’s this way for now?', textEs || '¿Hay una razón para que sea así por ahora?', [
      A('agreed', 'Yes, we agreed it this way', 'Sí, lo acordamos así', -2, ['agreed']),
      A('temp', 'Yes, something for now: illness, a new baby, a new job, exams, a move', 'Sí, algo pasajero: una enfermedad, un bebé, un trabajo nuevo, exámenes, una mudanza', -2, ['temp']),
      A('changed', 'It was agreed once, but things have changed', 'Lo acordamos una vez, pero las cosas cambiaron', 1),
      A('none', 'Not that I know of', 'Que yo sepa, no', 1)
    ]);
  }
  function qTalked(textEn, textEs) {
    return Q('talked', 'Talked about it', 'Lo han hablado', textEn || 'Have you talked about it together?', textEs || '¿Lo han hablado entre ustedes?', [
      A('better', 'Yes, and it’s getting better', 'Sí, y está mejorando', -2, ['improving']),
      A('same', 'Yes, but nothing has changed', 'Sí, pero nada ha cambiado', 2, ['stuck']),
      A('worse', 'Yes, and it ended in a row or got worse', 'Sí, y acabó en pelea o empeoró', 2, ['stuck']),
      A('notyet', 'Not yet', 'Todavía no', 0, ['nottalked'])
    ]);
  }
  function qFeel(textEn, textEs) {
    return Q('feel', 'How each of you feels', 'Cómo se siente cada uno', textEn || 'How do you each feel about it?', textEs || '¿Cómo se siente cada uno con esto?', [
      A('fine', 'We both seem fine with it', 'Los dos parecemos estar bien con esto', -2, ['content']),
      A('little', 'One of us minds a little', 'A uno de nosotros le molesta un poco', 1),
      A('worn', 'One of us feels worn down or resentful', 'Uno de nosotros se siente agotado o resentido', 2),
      A('dunno', 'I don’t know how they feel', 'No sé cómo se siente la otra persona', 0, ['unknownfeel'])
    ]);
  }
  function qBoth(textEn, textEs) {
    return Q('both', 'Both ways', 'En los dos sentidos', textEn || 'Does it go both ways, over time?', textEs || 'Con el tiempo, ¿va en los dos sentidos?', [
      A('both', 'Yes, it evens out over time', 'Sí, con el tiempo se equilibra', -2, ['mutual']),
      A('mostly', 'Mostly one way', 'Casi siempre en un sentido', 1),
      A('always', 'Always one way', 'Siempre en el mismo sentido', 2, ['oneway'])
    ]);
  }
  function qSayNo(textEn, textEs) {
    return Q('sayno', 'Saying no', 'Decir que no', textEn || 'Can both of you say no, or disagree, without it turning into a big problem?', textEs || '¿Pueden los dos decir que no, o no estar de acuerdo, sin que se convierta en un gran problema?', [
      A('yes', 'Yes, both of us can', 'Sí, los dos podemos', -2, ['mutual']),
      A('awkward', 'Mostly. It can be a bit awkward', 'Casi siempre. A veces es un poco incómodo', 0),
      A('upset', 'One of us gets upset or goes quiet for a while', 'Uno de nosotros se molesta o se queda callado un rato', 1),
      A('fallout', 'It leads to a big row, days of silence, or something being taken away', 'Acaba en una gran pelea, días de silencio, o en que se quite algo', 2, ['fallout'])
    ]);
  }
  // asked gently, and last, and only for the types where it fits
  function qAfraid() {
    return Q('afraid', 'Feeling free to say no', 'Sentirse libre de decir que no', 'Last one, and only if it fits: do you ever feel afraid, or unable to say no?', 'La última, y solo si encaja: ¿alguna vez sientes miedo, o que no puedes decir que no?', [
      A('no', 'No', 'No', 0),
      A('peace', 'Sometimes I hold back to keep the peace', 'A veces me callo para no discutir', 1),
      A('cantno', 'I feel I can’t say no', 'Siento que no puedo decir que no', 2, ['cantno']),
      A('afraid', 'Yes, I feel afraid', 'Sí, siento miedo', 0, ['afraid'])
    ]);
  }
  function qOften(textEn, textEs) {
    return Q('often', 'How often', 'Con qué frecuencia', textEn || 'How often does it happen?', textEs || '¿Con qué frecuencia pasa?', [
      A('once', 'It was a one-off', 'Fue una sola vez', -2, ['oneoff']),
      A('sometimes', 'Now and then', 'De vez en cuando', 0),
      A('most', 'Most of the time', 'Casi siempre', 2, ['often'])
    ]);
  }

  /* ---------- the banks, one per kind of concern ---------- */
  var TYPES = {
    load: {
      title: P('Who does what at home', 'Quién hace qué en casa'),
      why: P('A split that leans one way can be just right (long hours, an illness, something you agreed), or it can be wearing someone down. A few answers help tell which.',
        'Un reparto que se inclina hacia un lado puede estar bien (muchas horas de trabajo, una enfermedad, algo que acordaron) o puede estar agotando a alguien. Unas respuestas ayudan a distinguirlo.'),
      questions: [
        qHowLong('How long has the split been like this?', '¿Desde cuándo el reparto es así?'),
        qReason(),
        qFeel(),
        qTalked(),
        Q('evens', 'Evens out elsewhere', 'Se equilibra en otra parte', 'Does it even out in other ways, like paid work, caring or other jobs?', '¿Se equilibra de otras formas, como el trabajo pagado, los cuidados u otras tareas?', [
          A('yes', 'Yes, it evens out', 'Sí, se equilibra', -2, ['mutual']),
          A('partly', 'Partly', 'En parte', 0),
          A('no', 'No, not really', 'No, la verdad que no', 2, ['oneway'])
        ])
      ]
    },
    money: {
      title: P('Money', 'El dinero'),
      why: P('Couples and families set up money in many fair ways: shared, separate, or one person handling it by agreement. A few answers help tell an ordinary setup from one that isn’t working for someone.',
        'Las parejas y las familias organizan el dinero de muchas formas justas: en común, por separado, o una persona se encarga por acuerdo. Unas respuestas ayudan a distinguir un arreglo normal de uno que no le funciona a alguien.'),
      questions: [
        Q('setup', 'How money is set up', 'Cómo está organizado el dinero', 'How is money set up between you?', '¿Cómo está organizado el dinero entre ustedes?', [
          A('shared', 'Shared, and we can both see it', 'En común, y los dos lo vemos', -2, ['mutual']),
          A('separate', 'Separate, and that suits us', 'Por separado, y nos va bien así', -2, ['agreed']),
          A('oneagreed', 'One of us handles it, and we agreed that', 'Uno de nosotros se encarga, y lo acordamos', -2, ['agreed']),
          A('onesay', 'One of us handles it, and the other doesn’t get a say', 'Uno de nosotros se encarga, y el otro no tiene voz', 2, ['oneway'])
        ]),
        Q('access', 'Everyday money', 'El dinero de cada día', 'Can each of you get to money for everyday needs?', '¿Puede cada uno disponer de dinero para lo de cada día?', [
          A('both', 'Yes, both of us', 'Sí, los dos', -2, ['mutual']),
          A('checkin', 'We check in on big spends, by agreement', 'Lo consultamos para gastos grandes, por acuerdo', -1, ['agreed']),
          A('ask', 'One of us has to ask, and usually gets it', 'Uno de nosotros tiene que pedirlo, y casi siempre lo recibe', 1),
          A('kept', 'One of us is kept from money they need', 'A uno de nosotros no le dejan el dinero que necesita', 3, ['moneyctl'])
        ]),
        qReason('Is there a reason it’s this way for now (a job loss, paying off debt, study, illness)?', '¿Hay una razón para que sea así por ahora (perder un trabajo, pagar deudas, estudios, una enfermedad)?'),
        qTalked(),
        qSayNo('Can both of you say no to a spend, or disagree about money, without it turning into a big problem?', '¿Pueden los dos decir que no a un gasto, o no estar de acuerdo sobre el dinero, sin que se convierta en un gran problema?'),
        qAfraid()
      ]
    },
    decisions: {
      title: P('Who makes the decisions', 'Quién toma las decisiones'),
      why: P('Many people split decisions by what each knows best, and that works well. A few answers help tell that apart from one person’s view not counting.',
        'Muchas personas se reparten las decisiones según lo que cada una conoce mejor, y funciona bien. Unas respuestas ayudan a distinguirlo de que la opinión de alguien no cuente.'),
      questions: [
        Q('how', 'How decisions get made', 'Cómo se decide', 'When a decision affects you both, what usually happens?', 'Cuando una decisión les afecta a los dos, ¿qué suele pasar?', [
          A('together', 'We decide together', 'Decidimos juntos', -2, ['mutual']),
          A('split', 'Each of us leads on different things, by agreement', 'Cada uno se encarga de cosas distintas, por acuerdo', -2, ['agreed']),
          A('onefine', 'One of us usually decides, and the other is fine with that', 'Casi siempre decide uno, y al otro le parece bien', -1, ['content']),
          A('onenot', 'One of us decides, and the other’s view doesn’t count', 'Decide uno, y la opinión del otro no cuenta', 2, ['oneway'])
        ]),
        qHowLong(),
        qTalked(),
        qSayNo(),
        qAfraid()
      ]
    },
    communication: {
      title: P('How you talk to each other', 'Cómo se hablan'),
      why: P('Everyone snaps or tunes out on a bad day. A few answers help tell a rough patch from a way of talking that keeps leaving someone unheard.',
        'Todo el mundo salta o desconecta en un mal día. Unas respuestas ayudan a distinguir una mala racha de una forma de hablar que deja a alguien sin ser escuchado una y otra vez.'),
      questions: [
        qOften('How often do talks end with one of you feeling unheard or spoken down to?', '¿Con qué frecuencia una conversación termina con uno de ustedes sintiéndose no escuchado o menospreciado?'),
        Q('stress', 'On hard days', 'En los días difíciles', 'Does it happen more when one of you is tired, stressed or unwell?', '¿Pasa más cuando uno de ustedes está cansado, estresado o enfermo?', [
          A('hard', 'Yes, mostly on hard days', 'Sí, sobre todo en los días difíciles', -1, ['context']),
          A('any', 'No, it happens on good days too', 'No, también pasa en los días buenos', 1)
        ]),
        qBoth(),
        Q('repair', 'Afterwards', 'Después', 'Afterwards, does one of you come back and make it right?', 'Después, ¿alguno de ustedes vuelve y lo arregla?', [
          A('usually', 'Yes, usually', 'Sí, casi siempre', -2, ['repairs']),
          A('sometimes', 'Sometimes', 'A veces', 0),
          A('rarely', 'Rarely', 'Casi nunca', 1),
          A('blamed', 'No, it’s left, or it gets turned back on me', 'No, se queda así, o me lo echan en cara a mí', 2, ['stuck'])
        ]),
        qAfraid()
      ]
    },
    limits: {
      title: P('A limit or a “no” that feels unfair', 'Un límite o un «no» que parece injusto'),
      why: P('A “no”, a limit or a request made out of care or respect for the relationship is a normal part of being close. A few answers help tell that apart from a limit that leaves someone cut off.',
        'Un «no», un límite o una petición hecha por cariño o por respeto a la relación es parte normal de estar cerca. Unas respuestas ayudan a distinguirlo de un límite que deja a alguien aislado.'),
      questions: [
        Q('about', 'What the limit is about', 'De qué trata el límite', 'What is the limit mainly about?', '¿De qué trata principalmente el límite?', [
          A('safety', 'Health, safety, or money we can’t afford', 'La salud, la seguridad, o dinero que no podemos gastar', -2, ['care']),
          A('respect', 'Respect for the relationship (for example an ex, flirting, late-night messages)', 'El respeto a la relación (por ejemplo, una ex pareja, coquetear, mensajes de madrugada)', -2, ['care']),
          A('comfort', 'Comfort or taste (noise, guests, tidiness)', 'Comodidad o gustos (ruido, visitas, orden)', -1, ['care']),
          A('people', 'Who I can see or talk to, in general (friends, family)', 'A quién puedo ver o con quién puedo hablar, en general (amistades, familia)', 3, ['isolation'])
        ]),
        Q('same', 'Same for both', 'Igual para los dos', 'Does the same limit apply to both of you?', '¿El mismo límite vale para los dos?', [
          A('yes', 'Yes, to both of us', 'Sí, para los dos', -2, ['mutual']),
          A('reason', 'No, but there’s a reason we both understand', 'No, pero hay una razón que los dos entendemos', -1, ['agreed']),
          A('no', 'No, only to me', 'No, solo para mí', 1)
        ]),
        Q('set', 'How it was set', 'Cómo se puso', 'How did the limit come about?', '¿Cómo surgió el límite?', [
          A('agreed', 'We agreed it together', 'Lo acordamos juntos', -2, ['agreed']),
          A('asked', 'It was asked kindly, and I could say no', 'Me lo pidieron con cariño, y podía decir que no', -1, ['care']),
          A('one', 'One of us set it', 'Lo puso uno de nosotros', 1)
        ]),
        qSayNo('Can you talk about the limit, or say no to it, without it turning into a big problem?', '¿Puedes hablar del límite, o decirle que no, sin que se convierta en un gran problema?'),
        qAfraid()
      ]
    },
    time: {
      title: P('Time and attention', 'Tiempo y atención'),
      why: P('Time together gets thin for ordinary reasons: work, a baby, study, caring. A few answers help tell a busy season from someone feeling left out for a long time.',
        'El tiempo juntos se reduce por razones normales: el trabajo, un bebé, los estudios, cuidar de alguien. Unas respuestas ayudan a distinguir una temporada ocupada de alguien que se siente apartado desde hace mucho.'),
      questions: [
        qHowLong('How long has time together felt thin?', '¿Desde cuándo el tiempo juntos se siente escaso?'),
        Q('busy', 'Something taking time', 'Algo que ocupa tiempo', 'Is something taking extra time right now (work, a baby, study, caring, an illness)?', '¿Hay algo que ocupe más tiempo ahora (trabajo, un bebé, estudios, cuidar de alguien, una enfermedad)?', [
          A('temp', 'Yes, and it will ease', 'Sí, y pasará', -2, ['temp']),
          A('ongoing', 'Yes, and it’s ongoing', 'Sí, y no tiene fin cercano', 0),
          A('no', 'Not really', 'La verdad que no', 1)
        ]),
        Q('want', 'Wanting more time', 'Querer más tiempo', 'Do you both want more time together?', '¿Los dos quieren pasar más tiempo juntos?', [
          A('both', 'Yes, we both miss it', 'Sí, los dos lo echamos de menos', -1, ['mutual']),
          A('one', 'One of us wants more than the other', 'Uno de nosotros quiere más que el otro', 1),
          A('dunno', 'I’m not sure they do', 'No sé si la otra persona quiere', 0, ['unknownfeel'])
        ]),
        qTalked()
      ]
    },
    repair: {
      title: P('Apologies and blame', 'Disculpas y culpa'),
      why: P('In most homes one person finds “sorry” easier to say. A few answers help tell that apart from the blame always landing on the same person.',
        'En casi todas las casas a una persona le cuesta menos decir «perdón». Unas respuestas ayudan a distinguirlo de que la culpa siempre caiga en la misma persona.'),
      questions: [
        Q('first', 'Who says sorry', 'Quién pide perdón', 'When something goes wrong, who usually says sorry first?', 'Cuando algo sale mal, ¿quién suele pedir perdón primero?', [
          A('both', 'Both of us, at different times', 'Los dos, en momentos distintos', -2, ['mutual']),
          A('meok', 'Mostly me, and that’s okay with me', 'Casi siempre yo, y me parece bien', 0, ['content']),
          A('menot', 'Mostly me, even when it wasn’t my doing', 'Casi siempre yo, aunque no haya sido culpa mía', 1),
          A('always', 'Always me. The other never does', 'Siempre yo. La otra persona nunca', 2, ['oneway'])
        ]),
        Q('blame', 'Where blame lands', 'Dónde cae la culpa', 'Does the blame land on one person most of the time?', '¿La culpa cae casi siempre en la misma persona?', [
          A('shared', 'No, we share it', 'No, la compartimos', -2, ['mutual']),
          A('sometimes', 'Sometimes', 'A veces', 0),
          A('mostly', 'Yes, most things become one person’s fault', 'Sí, casi todo acaba siendo culpa de una persona', 2, ['oneway'])
        ]),
        qHowLong(),
        qTalked()
      ]
    },
    recurring: {
      title: P('A topic that keeps coming back', 'Un tema que siempre vuelve'),
      why: P('Every couple and family has a few topics that come back; many never fully go away, and that’s normal. A few answers help tell a familiar topic from one that is stuck.',
        'Toda pareja y familia tiene algunos temas que vuelven; muchos nunca desaparecen del todo, y es normal. Unas respuestas ayudan a distinguir un tema conocido de uno que está atascado.'),
      questions: [
        qHowLong('How long has this topic been coming back?', '¿Desde cuándo vuelve este tema?'),
        Q('happens', 'When it comes up', 'Cuando sale', 'When it comes up, what usually happens?', 'Cuando sale, ¿qué suele pasar?', [
          A('eases', 'We talk, and it eases for a while', 'Hablamos, y se calma un tiempo', -1, ['improving']),
          A('circle', 'We go round the same circle', 'Damos vueltas a lo mismo', 1),
          A('row', 'It turns into a row', 'Acaba en pelea', 2)
        ]),
        Q('changed', 'Anything changed', 'Algo ha cambiado', 'Has anything changed since you first talked about it?', '¿Ha cambiado algo desde la primera vez que lo hablaron?', [
          A('better', 'Yes, it’s a bit better', 'Sí, está un poco mejor', -2, ['improving']),
          A('same', 'No change', 'Nada ha cambiado', 1, ['stuck']),
          A('worse', 'It’s worse', 'Está peor', 2, ['stuck'])
        ]),
        Q('outside', 'Outside pressure', 'Presión de fuera', 'Is outside pressure under it (money, work, health, family)?', '¿Hay presión de fuera detrás (dinero, trabajo, salud, familia)?', [
          A('mostly', 'Yes, mostly outside pressure', 'Sí, sobre todo presión de fuera', -1, ['context']),
          A('some', 'Some of both', 'Un poco de las dos cosas', 0),
          A('us', 'No, it’s between us', 'No, es entre nosotros', 1)
        ]),
        qFeel()
      ]
    },
    respect: {
      title: P('Respect', 'El respeto'),
      why: P('Teasing, a sharp word on a bad day, or being talked over now and then happen in most homes. A few answers help tell those apart from something that keeps hurting.',
        'Las bromas, una palabra dura en un mal día o que te interrumpan de vez en cuando pasan en casi todas las casas. Unas respuestas ayudan a distinguirlo de algo que sigue haciendo daño.'),
      questions: [
        qOften(),
        Q('what', 'What it looks like', 'Cómo se ve', 'What does it mostly look like?', '¿Cómo se ve, sobre todo?', [
          A('tease', 'Teasing that goes a bit far', 'Bromas que se pasan un poco', 0),
          A('talkover', 'Being talked over, or not listened to', 'Que me interrumpan, o no me escuchen', 1),
          A('putdown', 'Put-downs or being made fun of, maybe in front of others', 'Desprecios o burlas, a veces delante de otros', 2),
          A('checked', 'My phone, messages or where I am checked without my okay', 'Que revisen mi teléfono, mis mensajes o dónde estoy sin mi permiso', 3, ['surveil']),
          A('keptfrom', 'Being kept from friends or family', 'Que me aparten de mis amistades o mi familia', 3, ['isolation'])
        ]),
        qBoth(),
        Q('hurt', 'When you say it hurt', 'Cuando dices que dolió', 'When you say it hurt, what happens?', 'Cuando dices que te dolió, ¿qué pasa?', [
          A('listen', 'They listen, and it changes', 'Me escuchan, y cambia', -2, ['improving']),
          A('again', 'They say sorry, but it happens again', 'Me piden perdón, pero vuelve a pasar', 1, ['stuck']),
          A('laughed', 'It’s laughed off, or turned back on me', 'Se ríen, o me lo echan en cara', 2, ['stuck'])
        ]),
        qAfraid()
      ]
    },
    afraid: {
      title: P('Feeling afraid or unsafe', 'Sentir miedo o no estar a salvo'),
      why: P('Only you know how safe you feel. These few questions help point you to the right kind of help, whatever the answers are.',
        'Solo tú sabes lo segura o seguro que te sientes. Estas pocas preguntas ayudan a señalarte el tipo de ayuda adecuado, sean cuales sean las respuestas.'),
      questions: [
        Q('safenow', 'Safe right now', 'A salvo ahora', 'Right now, are you safe?', 'Ahora mismo, ¿estás a salvo?', [
          A('yes', 'Yes, I’m safe right now', 'Sí, ahora estoy a salvo', 0),
          A('no', 'No, not right now', 'No, ahora no', 0, ['danger'])
        ]),
        Q('fear', 'Afraid of how they react', 'Miedo a cómo reaccione', 'Do you ever feel afraid of how they’ll react?', '¿Alguna vez sientes miedo de cómo va a reaccionar?', [
          A('no', 'No', 'No', 0),
          A('worry', 'I worry they’ll be upset, but I’m not afraid', 'Me preocupa que se moleste, pero no tengo miedo', 1),
          A('yes', 'Yes, I feel afraid', 'Sí, siento miedo', 0, ['afraid'])
        ]),
        Q('threat', 'Threats', 'Amenazas', 'Have they ever threatened to hurt you, someone you love, a pet, or themselves?', '¿Alguna vez te ha amenazado con hacerte daño a ti, a alguien que quieres, a una mascota, o a sí mismo?', [
          A('no', 'No', 'No', 0),
          A('yes', 'Yes', 'Sí', 0, ['threat'])
        ]),
        Q('free', 'Friends, family and money', 'Amistades, familia y dinero', 'Can you see friends and family, and use money, freely?', '¿Puedes ver a tus amistades y a tu familia, y usar el dinero, con libertad?', [
          A('yes', 'Yes', 'Sí', -1),
          A('mostly', 'Mostly', 'Casi siempre', 0),
          A('no', 'No, that gets stopped or checked', 'No, eso se impide o se vigila', 3, ['isolation'])
        ])
      ]
    }
  };

  var ALIASES = {
    chores: 'load', housework: 'load', 'mental-load': 'load', mentalload: 'load', split: 'load', fairness: 'load', work: 'load',
    bills: 'money', spending: 'money', finances: 'money',
    decision: 'decisions', choices: 'decisions',
    tone: 'communication', unheard: 'communication', talk: 'communication', talking: 'communication', listening: 'communication',
    limit: 'limits', no: 'limits', boundary: 'limits', boundaries: 'limits', pressure: 'limits', rules: 'limits',
    attention: 'time', together: 'time', phone: 'time',
    apology: 'repair', apologies: 'repair', blame: 'repair', sorry: 'repair',
    recurring: 'recurring', again: 'recurring', 'keeps-coming-back': 'recurring', topic: 'recurring',
    disrespect: 'respect', putdowns: 'respect',
    fear: 'afraid', unsafe: 'afraid', safety: 'afraid', scared: 'afraid'
  };
  var ORDER = ['load', 'money', 'decisions', 'communication', 'limits', 'time', 'repair', 'recurring', 'respect', 'afraid'];
  function typeId(name) {
    if (!name) return null;
    var k = String(name).toLowerCase().trim();
    if (TYPES[k]) return k;
    return ALIASES[k] || null;
  }
  // a first guess from a few typed words; the person can always change it
  var GUESS = [
    ['afraid', /\b(?:afraid|scared|frightened|unsafe|not safe|fear|miedo|asustad[oa])\b/i],
    ['money', /\b(?:money|bills?|spend(?:ing)?|budget|rent|debt|paid|pay(?:ing)?|card|dinero|gastos?|cuentas?)\b/i],
    ['limits', /\b(?:won't let|not allowed|allowed to|limit|boundar(?:y|ies)|said no|says no|forbid|rules? for me|no me deja)\b/i],
    ['repair', /\b(?:sorry|apolog\w*|blame[sd]?|my fault|fault|perd[oó]n|culpa)\b/i],
    ['respect', /\b(?:disrespect\w*|rude|mock\w*|put[- ]?downs?|made fun|laugh(?:ed|s) at|insult\w*|respeto)\b/i],
    ['decisions', /\b(?:decid\w*|decision\w*|without asking|choose|chose|decide)\b/i],
    ['communication', /\b(?:listen\w*|unheard|ignor\w*|yell\w*|shout\w*|snap\w*|tone|talk(?:ed)? over|interrupt\w*|escucha\w*)\b/i],
    ['time', /\b(?:time together|no time|attention|phone|busy|date night|tiempo)\b/i],
    ['load', /\b(?:chores?|dishes|laundry|cleaning|cook\w*|housework|trash|groceries|mental load|tareas|platos)\b/i],
    ['recurring', /\b(?:again|keeps? coming|every time|always the same|same fight|same argument|otra vez)\b/i]
  ];
  function guessType(text) {
    var s = String(text || '');
    for (var i = 0; i < GUESS.length; i++) if (GUESS[i][1].test(s)) return GUESS[i][0];
    return null;
  }

  var NOTSURE = P('Not sure', 'No estoy seguro');
  var SKIP = P('Skip', 'Saltar');
  function questions(type, lang) {
    var ty = TYPES[typeId(type)]; if (!ty) return [];
    return ty.questions.map(function (q) {
      return { id: q.id, short: t(q.short, lang), text: t(q.text, lang),
        answers: q.answers.map(function (a) { return { id: a.id, text: t(a.text, lang) }; })
          .concat([{ id: 'notsure', text: t(NOTSURE, lang), neutral: true }, { id: 'skip', text: t(SKIP, lang), neutral: true, skip: true }]) };
    });
  }

  /* ---------- reading typed words: crisis wording and explicit threats only ---------- */
  var PAT = null;
  function patterns() {
    if (PAT) return PAT;
    if (root && root.TOLPatterns) return (PAT = root.TOLPatterns);
    if (typeof module !== 'undefined' && module.exports && typeof require === 'function') { try { PAT = require('./message-patterns.js'); } catch (e) { PAT = null; } }
    return PAT;
  }
  // a small fallback, used only when the shared pattern list isn't on the page
  var CRISIS_FALLBACK = /\b(?:kill myself|end my life|take my (?:own )?life|want to die|don't want to (?:live|be alive)|better off without me|suicid\w*|hurt myself|me voy a matar|quiero morir(?:me)?|no quiero vivir)\b/i;
  var THREAT_FALLBACK = /\b(?:(?:said|says|threatened)(?: that)? (?:he|she|they)(?:'d| would|'ll| will) (?:kill|hurt) (?:me|the kids|my)|threatened to (?:kill|hurt|take the kids))\b/i;
  function readText(text) {
    var s = String(text || ''); if (!s.trim()) return { crisis: false, threat: false };
    var p = patterns(), crisis = false, threat = false;
    // the shared list knows everyday exaggeration ("I'll die of embarrassment"); the fallback is only for pages without it
    try { crisis = p && p.selfHarm ? !!p.selfHarm(s) : CRISIS_FALLBACK.test(s); } catch (e) { crisis = CRISIS_FALLBACK.test(s); }
    try { threat = p && p.threats ? p.threats(s).length > 0 : false; } catch (e) {}
    if (!threat) threat = THREAT_FALLBACK.test(s);
    return { crisis: crisis, threat: threat };
  }

  /* ---------- the read ---------- */
  var LEVEL_KEYS = ['l0', 'l1', 'l2', 'l3', 'safety'];
  var LEVEL_TITLES = [
    P('Sounds like an ordinary rough patch, or a one-off', 'Parece una mala racha normal, o algo puntual'),
    P('Worth a calm talk', 'Vale la pena una charla tranquila'),
    P('A pattern worth working on together', 'Un patrón que vale la pena trabajar juntos'),
    P('Worth talking to someone outside the two of you', 'Vale la pena hablar con alguien de fuera'),
    P('Your safety comes first', 'Tu seguridad es lo primero')
  ];
  var FLAG_WORDS = {
    agreed: P('It was agreed between you.', 'Lo acordaron entre ustedes.'),
    temp: P('There’s a reason for now that should ease.', 'Hay una razón pasajera que debería aliviarse.'),
    mutual: P('It goes both ways, or evens out.', 'Va en los dos sentidos, o se equilibra.'),
    improving: P('You’ve talked, and it’s getting better.', 'Lo han hablado, y está mejorando.'),
    content: P('You both seem fine with it.', 'Los dos parecen estar bien con esto.'),
    care: P('The limit comes from care or respect for the relationship.', 'El límite viene del cariño o del respeto a la relación.'),
    oneoff: P('It was a one-off.', 'Fue algo puntual.'),
    context: P('Outside pressure seems to be part of it.', 'La presión de fuera parece ser parte de esto.'),
    repairs: P('It usually gets made right afterwards.', 'Después casi siempre se arregla.'),
    often: P('It happens most of the time.', 'Pasa casi siempre.'),
    long: P('It has gone on for a year or more.', 'Lleva así un año o más.'),
    stuck: P('Talking hasn’t changed it yet.', 'Hablarlo todavía no lo ha cambiado.'),
    oneway: P('It mostly goes one way.', 'Casi siempre va en un solo sentido.'),
    fallout: P('Saying no seems to come at a cost.', 'Decir que no parece tener un costo.'),
    cantno: P('You said you feel you can’t say no.', 'Dijiste que sientes que no puedes decir que no.'),
    isolation: P('Seeing friends or family seems to be limited.', 'Ver a amistades o familia parece estar limitado.'),
    surveil: P('Your phone, messages or whereabouts get checked without your okay.', 'Revisan tu teléfono, tus mensajes o dónde estás sin tu permiso.'),
    moneyctl: P('Someone is kept from money they need.', 'A alguien no le dejan el dinero que necesita.'),
    textthreat: P('What you wrote includes words that can read as a threat.', 'Lo que escribiste incluye palabras que pueden leerse como una amenaza.'),
    afraid: P('You said you feel afraid.', 'Dijiste que sientes miedo.'),
    threat: P('You said there have been threats.', 'Dijiste que ha habido amenazas.'),
    danger: P('You said you’re not safe right now.', 'Dijiste que ahora mismo no estás a salvo.'),
    crisis: P('What you wrote sounds like you may be in a lot of pain.', 'Lo que escribiste suena a que puedes estar sufriendo mucho.'),
    nottalked: P('It hasn’t been talked about yet.', 'Todavía no se ha hablado.'),
    unknownfeel: P('You’re not sure how the other person feels.', 'No sabes bien cómo se siente la otra persona.')
  };

  function has(arr, x) { return arr.indexOf(x) >= 0; }
  function evaluate(type, answers, ctx) {
    ctx = ctx || {};
    var lang = ctx.lang || 'en', id = typeId(type), ty = TYPES[id];
    answers = answers || {};
    var res = { type: id, level: 0, key: 'l0', score: 0, reasons: [], flags: [], safety: false, crisis: false, skipped: false, answers: answers, answered: 0, notsure: 0 };
    var tx = readText(ctx.text);
    if (tx.crisis) { res.crisis = true; res.flags.push('crisis'); }
    if (tx.threat) res.flags.push('textthreat');
    if (answers === 'skip' || ctx.skipAll) {
      res.skipped = true;
      if (res.crisis) { res.level = 4; res.key = 'safety'; res.safety = true; res.reasons.push(t(FLAG_WORDS.crisis, lang)); }
      else res.reasons.push(t(P('You skipped the questions, so this is the everyday read. That’s completely fine.', 'Saltaste las preguntas, así que esta es la lectura de todos los días. Está perfectamente bien.'), lang));
      return res;
    }
    var score = 0, C = 0, B = 0, flags = res.flags, took = [];
    (ty ? ty.questions : []).forEach(function (q) {
      var aid = answers[q.id]; if (aid == null || aid === 'skip') return;
      res.answered++;
      if (aid === 'notsure') { res.notsure++; took.push(t(q.short, lang) + ': ' + t(NOTSURE, lang).toLowerCase()); return; }
      var a = null; q.answers.forEach(function (x) { if (x.id === aid) a = x; });
      if (!a) return;
      score += a.w;
      if (a.w >= 1) C++;
      if (a.f.some(function (f) { return has(BENIGN, f); })) B++;
      a.f.forEach(function (f) { if (!has(flags, f)) flags.push(f); });
      took.push(t(q.short, lang) + ': ' + lowerFirst(t(a.text, lang)));
    });
    if (has(flags, 'textthreat')) C++;
    var S = SIGNS.filter(function (f) { return has(flags, f); }).length;
    var Pn = PRESSURE.filter(function (f) { return has(flags, f); }).length;
    var pattern = PATTERN.some(function (f) { return has(flags, f); }) || Pn > 0 || S > 0;
    var safety = has(flags, 'afraid') || has(flags, 'threat') || has(flags, 'danger') || res.crisis || S >= 2 || (S >= 1 && Pn >= 1);
    var level = 0;
    if (safety) level = 4;
    else {
      if (score >= 2 || (C >= 1 && (has(flags, 'nottalked') || has(flags, 'unknownfeel') || has(flags, 'stuck')))) level = 1;
      if (score >= 5 && C >= 2 && pattern) level = 2;
      if (score >= 7 && C >= 3 && (has(flags, 'stuck') || Pn > 0 || S > 0)) level = 3;
      if (S >= 1 && level < 2) level = 2;
      if ((Pn >= 1 || has(flags, 'textthreat')) && level < 1) level = 1;
      if (!Pn && !S) { if (B >= 2 && level > 1) level = 1; else if (B === 1 && level > 2) level = 2; }
    }
    res.level = level; res.key = LEVEL_KEYS[level]; res.safety = level === 4; res.score = score;
    // what it took into account: the signs that mattered first, then each answer
    var lead = [];
    ['crisis', 'danger', 'afraid', 'threat', 'textthreat', 'isolation', 'surveil', 'moneyctl', 'cantno', 'fallout', 'stuck', 'long', 'often', 'oneway', 'nottalked', 'unknownfeel']
      .concat(BENIGN).forEach(function (f) { if (has(flags, f) && FLAG_WORDS[f]) lead.push(t(FLAG_WORDS[f], lang)); });
    res.reasons = lead.slice(0, 5);
    res.took = took;
    if (res.notsure >= 3) res.reasons.push(t(P('Several answers were “not sure”. That’s fine: a calm talk can fill in the gaps.', 'Varias respuestas fueron «no estoy seguro». Está bien: una charla tranquila puede completar lo que falta.'), lang));
    if (!res.answered && !res.reasons.length) res.reasons.push(t(P('No answers yet, so this is the everyday read.', 'Todavía no hay respuestas, así que esta es la lectura de todos los días.'), lang));
    else if (!res.reasons.length) res.reasons.push(t(level ? P('Some of your answers point to something worth a closer look.', 'Algunas de tus respuestas apuntan a algo que vale la pena mirar con más calma.')
      : P('Nothing in your answers points past an ordinary rough patch.', 'Nada en tus respuestas apunta a algo más que una mala racha normal.'), lang));
    return res;
  }
  function lowerFirst(s) { return s ? s.charAt(0).toLowerCase() + s.slice(1) : s; }

  /* ---------- the next step, by type and level ---------- */
  function L(en, es, href) { return { text: P(en, es), href: href }; }
  var NEXT = {
    load: {
      l0: { body: P('It sounds like the split works for you both for now. Keep thanking each other for the quiet jobs, and look again if something changes.', 'Parece que el reparto les funciona a los dos por ahora. Sigan dándose las gracias por las tareas que no se ven, y vuelvan a mirarlo si algo cambia.'),
        links: [L('The Lemonade Stand: who does what', 'El puesto de limonada: quién hace qué', '/lemonade-stand.html')] },
      l1: { body: P('Pick a calm time and look at the list together, as a setup to adjust, not a score.', 'Elijan un momento tranquilo y miren la lista juntos, como un arreglo que ajustar, no como un marcador.'),
        say: P('Can we look at who does what this week? I’m not keeping score. I just want it to feel fair to both of us.', '¿Podemos mirar quién hace qué esta semana? No llevo la cuenta. Solo quiero que nos parezca justo a los dos.'),
        links: [L('A kind weekly check-in', 'Una charla semanal amable', '/check-ins.html')] },
      l2: { body: P('Give each job one owner, look back once a month at what keeps slipping, and try the six-week program together.', 'Den a cada tarea una persona responsable, revisen una vez al mes lo que se sigue quedando sin hacer, y prueben juntos el programa de seis semanas.'),
        links: [L('One owner per job (WP-03)', 'Una persona por tarea (WP-03)', '/workpapers/fill/wp-03.html'), L('What keeps coming back? (WP-04)', '¿Qué es lo que siempre vuelve? (WP-04)', '/workpapers/fill/wp-04.html'), L('The six-week program', 'El programa de seis semanas', '/prog-01.html')] }
    },
    money: {
      l0: { body: P('Your setup sounds like one you both chose. A short money check-in now and then keeps it that way.', 'Su arreglo parece uno que eligieron los dos. Una breve charla sobre dinero de vez en cuando lo mantiene así.'),
        links: [L('Money together', 'El dinero en pareja', '/money-together.html')] },
      l1: { body: P('Set twenty minutes, when you’re both rested, to look at how money works for you both.', 'Busquen veinte minutos, cuando los dos estén descansados, para ver cómo les funciona el dinero.'),
        say: P('Could we sit down for twenty minutes and look at how money works for us? I’d like us both to feel okay about it.', '¿Podemos sentarnos veinte minutos a ver cómo manejamos el dinero? Me gustaría que los dos nos sintiéramos bien con eso.'),
        links: [L('Money together', 'El dinero en pareja', '/money-together.html')] },
      l2: { body: P('Agree on a plan you can both see: what’s shared, what’s each person’s own, and how big spends get decided. Then check in on it weekly for a while.', 'Acuerden un plan que los dos puedan ver: qué es común, qué es de cada uno, y cómo se deciden los gastos grandes. Luego revísenlo cada semana durante un tiempo.'),
        links: [L('Money together', 'El dinero en pareja', '/money-together.html'), L('A kind weekly check-in', 'Una charla semanal amable', '/check-ins.html')] }
    },
    decisions: {
      l0: { body: P('Sounds like the way you decide works for you both. Saying “what do you think?” now and then keeps it that way.', 'Parece que su forma de decidir les funciona a los dos. Decir «¿tú qué piensas?» de vez en cuando lo mantiene así.'),
        links: [L('Communication, in plain words', 'La comunicación, en palabras sencillas', '/communication.html')] },
      l1: { body: P('Next time something affects you both, each say what you’d like before anyone decides.', 'La próxima vez que algo les afecte a los dos, que cada uno diga lo que quiere antes de que nadie decida.'),
        say: P('Next time something affects us both, can we each say what we’d like before we decide?', 'La próxima vez que algo nos afecte a los dos, ¿podemos decir cada uno lo que queremos antes de decidir?'),
        links: [L('A kind weekly check-in', 'Una charla semanal amable', '/check-ins.html')] },
      l2: { body: P('Agree which decisions you make together and which each of you leads on, write it down, and look at it again in a month.', 'Acuerden qué decisiones toman juntos y de cuáles se encarga cada uno, escríbanlo, y vuelvan a mirarlo en un mes.'),
        links: [L('Say it so it lands (WP-09)', 'Dilo para que llegue (WP-09)', '/workpapers/fill/wp-09.html'), L('Communication, in plain words', 'La comunicación, en palabras sencillas', '/communication.html')] }
    },
    communication: {
      l0: { body: P('Sounds like a rough moment, not a pattern. A short “sorry I snapped, can we try again?” usually does it.', 'Parece un mal momento, no un patrón. Un breve «perdón por saltar, ¿lo intentamos otra vez?» suele bastar.'),
        links: [L('Communication, in plain words', 'La comunicación, en palabras sencillas', '/communication.html')] },
      l1: { body: P('Try the fact, the feeling and one small ask, at a calm time.', 'Prueben el hecho, el sentimiento y una pequeña petición, en un momento tranquilo.'),
        say: P('When we talked last night, I didn’t feel heard. Can we try again, one at a time?', 'Cuando hablamos anoche, no me sentí escuchado. ¿Lo intentamos otra vez, de uno en uno?'),
        links: [L('Say it so it lands (WP-09)', 'Dilo para que llegue (WP-09)', '/workpapers/fill/wp-09.html')] },
      l2: { body: P('Pick one habit to change together, like hearing each other back before answering, and practise it on small topics first.', 'Elijan un hábito para cambiar juntos, como repetir lo que oyeron antes de responder, y practíquenlo primero con temas pequeños.'),
        links: [L('Say it so it lands (WP-09)', 'Dilo para que llegue (WP-09)', '/workpapers/fill/wp-09.html'), L('One wants to talk, one needs space', 'Uno quiere hablar, el otro necesita espacio', '/pursue-withdraw.html'), L('Seven calm steps out of the same fights', 'Siete pasos tranquilos para salir de las mismas peleas', '/how-to-stop-fighting-with-your-partner.html')] }
    },
    limits: {
      l0: { body: P('A limit set out of care or respect for the relationship is a normal part of being close. It helps when you both know the reason behind it.', 'Un límite puesto por cariño o por respeto a la relación es parte normal de estar cerca. Ayuda que los dos sepan la razón.'),
        links: [L('A kind weekly check-in', 'Una charla semanal amable', '/check-ins.html')] },
      l1: { body: P('Ask about the reason first, then say how it lands for you. Both can be true.', 'Pregunta primero por la razón, y luego di cómo te llega a ti. Las dos cosas pueden ser ciertas.'),
        say: P('Can you tell me more about why this matters to you? I’d like to understand, and to say how it lands for me.', '¿Me cuentas más de por qué esto te importa? Me gustaría entenderlo, y decirte cómo me llega a mí.'),
        links: [L('A kind weekly check-in', 'Una charla semanal amable', '/check-ins.html')] },
      l2: { body: P('Agree the limits you both keep, and why, and make room for either of you to ask to change one.', 'Acuerden los límites que los dos respetan, y por qué, y dejen espacio para que cualquiera pida cambiar uno.'),
        links: [L('Communication, in plain words', 'La comunicación, en palabras sencillas', '/communication.html'), L('A kind weekly check-in', 'Una charla semanal amable', '/check-ins.html')] }
    },
    time: {
      l0: { body: P('Sounds like a busy season. A few minutes of real attention each day goes a long way until it eases.', 'Parece una temporada ocupada. Unos minutos de atención de verdad cada día ayudan mucho hasta que pase.'),
        links: [L('Turning toward: small daily habits', 'Acercarse: pequeños hábitos diarios', '/turning-toward.html')] },
      l1: { body: P('Name what you miss, and ask for one small, regular thing.', 'Di lo que echas de menos, y pide una cosa pequeña y regular.'),
        say: P('I miss us. Could we keep one evening a week just for the two of us?', 'Te echo de menos. ¿Podemos guardar una noche a la semana solo para los dos?'),
        links: [L('Turning toward: small daily habits', 'Acercarse: pequeños hábitos diarios', '/turning-toward.html')] },
      l2: { body: P('Plan time together on purpose: one small daily habit and one ritual a week, and check how it’s going in a month.', 'Planeen tiempo juntos a propósito: un pequeño hábito diario y un ritual a la semana, y vean cómo va en un mes.'),
        links: [L('Bonding: how closeness grows', 'El vínculo: cómo crece la cercanía', '/bonding.html'), L('Keep your little rituals alive (WP-15)', 'Mantengan vivos sus pequeños rituales (WP-15)', '/workpapers/fill/wp-15.html')] }
    },
    repair: {
      l0: { body: P('Sounds like you each repair in your own way. Saying thank you for the apologies you get keeps it easy.', 'Parece que cada uno arregla las cosas a su manera. Dar las gracias por las disculpas que recibes lo hace más fácil.'),
        links: [L('Apology languages', 'Los lenguajes de la disculpa', '/apology-languages.html')] },
      l1: { body: P('Talk about how each of you likes to hear sorry, and agree that either of you can go first.', 'Hablen de cómo le gusta a cada uno recibir una disculpa, y acuerden que cualquiera puede ir primero.'),
        say: P('I’d like us both to be able to say sorry. Can we each name one thing we’d do differently next time?', 'Me gustaría que los dos pudiéramos pedir perdón. ¿Podemos decir cada uno una cosa que haríamos distinto la próxima vez?'),
        links: [L('Apology languages', 'Los lenguajes de la disculpa', '/apology-languages.html')] },
      l2: { body: P('After each rough moment, each of you names your own part, one fact each, before anything else. Practise it for a few weeks.', 'Después de cada mal momento, que cada uno nombre su propia parte, un hecho cada uno, antes de nada más. Practíquenlo unas semanas.'),
        links: [L('Say it so it lands (WP-09)', 'Dilo para que llegue (WP-09)', '/workpapers/fill/wp-09.html'), L('Apology languages', 'Los lenguajes de la disculpa', '/apology-languages.html')] }
    },
    recurring: {
      l0: { body: P('Some topics come back in every home, and that’s normal. Catching them early, on a calm day, keeps them small.', 'Algunos temas vuelven en todas las casas, y es normal. Hablarlos pronto, en un día tranquilo, los mantiene pequeños.'),
        links: [L('A kind weekly check-in', 'Una charla semanal amable', '/check-ins.html')] },
      l1: { body: P('Set a calm time to look at it properly, not in the moment it comes up.', 'Busquen un momento tranquilo para mirarlo bien, no en el momento en que sale.'),
        say: P('This one keeps coming back. Can we set a calm time this week to look at it properly?', 'Este tema siempre vuelve. ¿Podemos buscar un momento tranquilo esta semana para mirarlo bien?'),
        links: [L('What keeps coming back? (WP-04)', '¿Qué es lo que siempre vuelve? (WP-04)', '/workpapers/fill/wp-04.html')] },
      l2: { body: P('Look back once a month at what keeps coming back, sort out the cause (the setup, capacity, or outside pressure), and fix one thing at a time.', 'Revisen una vez al mes lo que siempre vuelve, vean la causa (el arreglo, la capacidad o la presión de fuera), y arreglen una cosa a la vez.'),
        links: [L('What keeps coming back? (WP-04)', '¿Qué es lo que siempre vuelve? (WP-04)', '/workpapers/fill/wp-04.html'), L('Is it us, or everything else? (WP-14)', '¿Somos nosotros, o es todo lo demás? (WP-14)', '/workpapers/fill/wp-14.html'), L('The six-week program', 'El programa de seis semanas', '/prog-01.html')] }
    },
    respect: {
      l0: { body: P('Sounds like an off moment. Saying “that one stung” lightly, at the time, usually sorts it.', 'Parece un mal momento puntual. Decir con calma «eso me dolió», en el momento, suele arreglarlo.'),
        links: [L('Communication, in plain words', 'La comunicación, en palabras sencillas', '/communication.html')] },
      l1: { body: P('Name the moment and how it landed, and ask for one change.', 'Nombra el momento y cómo te llegó, y pide un cambio.'),
        say: P('When that was said in front of our friends, it stung. Can we keep jokes like that between us, or drop them?', 'Cuando se dijo eso delante de nuestros amigos, me dolió. ¿Podemos dejar ese tipo de bromas entre nosotros, o dejarlas?'),
        links: [L('Say it so it lands (WP-09)', 'Dilo para que llegue (WP-09)', '/workpapers/fill/wp-09.html')] },
      l2: { body: P('Agree together what’s off limits, even when you’re upset, and check in weekly on how it’s going.', 'Acuerden juntos lo que no vale, aunque estén molestos, y revisen cada semana cómo va.'),
        links: [L('Communication, in plain words', 'La comunicación, en palabras sencillas', '/communication.html'), L('A kind weekly check-in', 'Una charla semanal amable', '/check-ins.html')] }
    },
    afraid: {
      l0: { body: P('Glad to hear you feel safe. If that ever changes, there is a page here with free, private people to talk to.', 'Me alegra que te sientas a salvo. Si eso cambia alguna vez, aquí hay una página con personas a quienes hablar, gratis y en privado.'),
        links: [L('Not safe at home?', '¿No estás a salvo en casa?', '/safety.html')] },
      l1: { body: P('It can help to talk it over with someone you trust, so you can see it clearly.', 'Puede ayudar hablarlo con alguien de confianza, para verlo con claridad.'),
        links: [L('Someone to talk to, free', 'Alguien con quien hablar, gratis', '/outside-help.html#talk'), L('When it’s more than a rough patch', 'Cuando es más que una mala racha', '/safety.html#signs')] },
      l2: { body: P('Some of what you said is worth some care. Talking it over with someone you trust, or a free, private line, can help you see it clearly.', 'Parte de lo que dijiste merece atención. Hablarlo con alguien de confianza, o con una línea gratuita y privada, puede ayudarte a verlo con claridad.'),
        links: [L('Someone to talk to, free', 'Alguien con quien hablar, gratis', '/outside-help.html#talk'), L('When it’s more than a rough patch', 'Cuando es más que una mala racha', '/safety.html#signs')] }
    }
  };
  var L3 = { body: P('Worth talking to someone outside the two of you. Not because anything is wrong with either of you: some patterns are easier to shift with a neutral person in the room. A counsellor, your doctor, or someone you both trust are all options, if they feel right.',
    'Vale la pena hablar con alguien de fuera. No porque algo ande mal con ninguno de los dos: algunos patrones cambian más fácil con una persona neutral presente. Un consejero, tu médico, o alguien de confianza para los dos son opciones, si les parecen bien.'),
    links: [L('Find a counsellor or therapist', 'Buscar un consejero o terapeuta', '/outside-help.html#counsellor'), L('Help beyond this site', 'Ayuda más allá de este sitio', '/outside-help.html')] };
  // the site's existing safety pages, offered as a question and an option, never as a verdict
  var SAFE = { body: P('Some of what you said can make it hard to feel safe, or free to say no. Only you can judge what fits. If it does, there are free, private people to talk to, any time.',
    'Parte de lo que dijiste puede hacer difícil sentirse a salvo, o libre de decir que no. Solo tú puedes juzgar qué encaja. Si encaja, hay personas con quienes hablar, gratis y en privado, a cualquier hora.'),
    links: [L('Free, private people to talk to', 'Personas con quienes hablar, gratis y en privado', '/safety.html#talk'), L('If you are in danger right now', 'Si estás en peligro ahora mismo', '/safety.html#now')] };
  // the same words the site already uses for a crisis (safety.html, en-espanol.html)
  var CRISIS = P('If you are thinking about ending your life: in the US, call or text 988. In the UK, call Samaritans free on 116 123, or text SHOUT to 85258, any time. Anywhere else, find your local line at findahelpline.com.',
    'Si piensas en hacerte daño: llama al 988. Cuando oigas «Presione 2», marca el 2 para hablar en español. En peligro ahora: 911.');
  var SAFE_FOOT = P('If it doesn’t fit, that’s okay too: the steps for a calm talk are still here.', 'Si no encaja, también está bien: los pasos para una charla tranquila siguen aquí.');

  function next(result, lang) {
    lang = lang || 'en';
    var id = (result && result.type) || 'load', lvl = result ? result.level : 0, bank = NEXT[id] || NEXT.load;
    var src = lvl >= 4 ? SAFE : lvl === 3 ? L3 : bank[LEVEL_KEYS[lvl]] || bank.l1;
    var out = { level: lvl, key: LEVEL_KEYS[lvl], title: t(LEVEL_TITLES[lvl], lang), body: t(src.body, lang), say: src.say ? t(src.say, lang) : '',
      links: (src.links || []).map(function (l) { return { text: t(l.text, lang), href: l.href }; }), extra: '', footer: '', footerLinks: [] };
    // at level 3, the type's own plan stays one tap away
    if (lvl === 3 && bank.l2) out.links = out.links.concat(bank.l2.links.slice(0, 1).map(function (l) { return { text: t(l.text, lang), href: l.href }; }));
    if (lvl >= 4) { if (result && result.crisis) out.extra = t(CRISIS, lang); if (id !== 'afraid' && bank.l1) { out.footer = t(SAFE_FOOT, lang); out.footerLinks = bank.l1.links.map(function (l) { return { text: t(l.text, lang), href: l.href }; }); } }
    return out;
  }

  /* ---------- for Professor Puddles: the same banks and rules, as plain data ---------- */
  function exportForChat(lang) {
    lang = lang || 'en';
    var types = {};
    ORDER.forEach(function (id) {
      var ty = TYPES[id];
      types[id] = { title: t(ty.title, lang), why: t(ty.why, lang),
        questions: ty.questions.map(function (q) {
          return { id: q.id, short: t(q.short, lang), text: t(q.text, lang), answers: q.answers.map(function (a) { return { id: a.id, text: t(a.text, lang), w: a.w, flags: a.f.slice() }; })
            .concat([{ id: 'notsure', text: t(NOTSURE, lang), w: 0, flags: [] }, { id: 'skip', text: t(SKIP, lang), w: 0, flags: [] }]) };
        }),
        next: ['l0', 'l1', 'l2'].map(function (k, i) { return next({ type: id, level: i }, lang); })
      };
    });
    return {
      version: 1, lang: lang, order: ORDER.slice(), aliases: JSON.parse(JSON.stringify(ALIASES)), types: types,
      levels: LEVEL_TITLES.map(function (x, i) { return { level: i, key: LEVEL_KEYS[i], title: t(x, lang) }; }),
      level3: next({ type: 'load', level: 3 }, lang), safety: next({ type: 'afraid', level: 4 }, lang), crisis: t(CRISIS, lang),
      flags: { benign: BENIGN.slice(), pattern: PATTERN.slice(), pressure: PRESSURE.slice(), signs: SIGNS.slice(), safety: SAFETY.slice() },
      rules: [
        'Ask the questions of one type in order, one per turn. Every question also accepts "Not sure" and "Skip". "Skip all" ends with level 0 and everyday tips.',
        'score = sum of w over the answers; C = answers with w >= 1; B = answers with a benign flag; S = distinct clear signs; P = distinct pressure signs.',
        'Safety (level 4): an answer flagged afraid, threat or danger; crisis wording in what they typed; S >= 2; or S >= 1 and P >= 1.',
        'Level 3: score >= 7 and C >= 3 and (stuck or P or S).',
        'Level 2: score >= 5 and C >= 2 and one of often, long, stuck, oneway, P or S.',
        'Level 1: score >= 2, or C >= 1 with nottalked, stuck or unknownfeel.',
        'Floors: S >= 1 gives at least level 2; P >= 1 or a threat in the typed words gives at least level 1.',
        'Caps (only when P = 0 and S = 0): B >= 2 caps at level 1; B = 1 caps at level 2.',
        'A single answer never reaches level 3 or safety, except afraid, threat, danger or crisis wording.',
        'A no, a limit or a request made out of care or respect for the relationship is benign (care), never control.',
        'Never label a person. Describe what happens and how it lands. Offer the next step as an option.'
      ],
      howToUse: 'Call TOLClarifyData.evaluate(type, {questionId: answerId}, {text, lang}) for the level, then TOLClarifyData.next(result, lang) for the words. Or follow the rules above by hand.'
    };
  }

  var api = { TYPES: TYPES, ALIASES: ALIASES, ORDER: ORDER, LEVEL_KEYS: LEVEL_KEYS, LEVEL_TITLES: LEVEL_TITLES, FLAG_WORDS: FLAG_WORDS,
    BENIGN: BENIGN, PATTERN: PATTERN, PRESSURE: PRESSURE, SIGNS: SIGNS, SAFETY: SAFETY,
    t: t, typeId: typeId, guessType: guessType, questions: questions, evaluate: evaluate, next: next, readText: readText, exportForChat: exportForChat,
    NOTSURE: NOTSURE, SKIP: SKIP };
  if (typeof module !== 'undefined' && module.exports) module.exports = api;
  if (root) root.TOLClarifyData = api;
})(typeof window !== 'undefined' ? window : (typeof globalThis !== 'undefined' ? globalThis : this));
