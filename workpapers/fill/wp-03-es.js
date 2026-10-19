/* wp-03-es.js — WP-03 "One owner per job" in Spanish, around the sheet.
   The care list in Spanish (/workpapers/fill/wp-03.html?for=care&lang=es, the link on /en-espanol.html) gets its
   own words from tol-workpaper.js. This file makes the rest of the page Spanish too:
   - right away, before site.js runs: lang="es" on <html>, so the bar, menu, footer and Settings come in Spanish;
   - once the sheet is built: the words around it (the privacy note, "Clear this page", the save bar).
   It uses the same rule as tol-workpaper.js (the care list, and someone who reads Spanish). Nothing is stored. */
(function () {
  'use strict';
  var q = location.search || '', ref = '';
  try { var r = document.referrer ? new URL(document.referrer) : null; if (r && r.origin === location.origin) ref = r.pathname; } catch (e) {}
  var f = (q.match(/[?&]for=([a-z-]+)/) || [])[1] || '';
  if (f === 'carers') f = 'care';
  if (!f && (ref === '/caregivers.html' || ref === '/en-espanol.html')) f = 'care';
  var es = /[?&]lang=es\b/.test(q) || ref === '/en-espanol.html' || /^es\b/i.test(navigator.language || '');
  if (f !== 'care' || !es) return;
  document.documentElement.setAttribute('lang', 'es');

  function $(s) { return document.querySelector(s); }
  function put(sel, html, attr) { var n = typeof sel === 'string' ? $(sel) : sel; if (!n) return; if (attr) n.setAttribute(attr, html); else n.innerHTML = html; }
  // the label's words after its checkbox
  function labelText(sel, text) { var l = $(sel); if (!l) return; var t = l.lastChild; if (t && t.nodeType === 3) t.textContent = ' ' + text; }
  function run() {
    put('main .read-head .read-code', 'WP-03 · Hoja para llenar');
    // the safety line in Spanish (tools16), with the same link to Not safe at home? (that page is in English)
    var safe = $('main .wpf-safe small'), sl = safe && safe.querySelector('a[href="/safety.html"]');
    if (safe && sl && !safe.hasAttribute('data-es')) {
      safe.setAttribute('data-es', '1');
      sl.setAttribute('hreflang', 'en'); sl.setAttribute('lang', 'en');
      while (safe.firstChild) safe.removeChild(safe.firstChild);
      safe.appendChild(document.createTextNode('Para relaciones en las que todos se sienten seguros. Si alguien tiene miedo o se siente controlado, mira '));
      safe.appendChild(sl);
      safe.appendChild(document.createTextNode(' (en inglés).'));
    }
    put('main .wpf-lede.pillar-note', '<small>Las ideas detrás de esta lista (en inglés): <a href="/five-pillars.html#fix-the-setup" hreflang="en">arreglar el sistema, no a la persona</a> (una tarea que se olvida una y otra vez es un problema del sistema, no un defecto de alguien) y <a href="/five-pillars.html#quiet-incentives" hreflang="en">fijarse en los incentivos callados</a>. Son dos de los <a href="/five-pillars.html" hreflang="en">Cinco Pilares</a> del sitio, las grandes ideas en las que se basa todo.</small>');
    var priv = document.querySelectorAll('main .wpf-privacy > p:not(.wpf-keep)');
    if (priv[0]) priv[0].innerHTML = '<strong>Lo que escribes se queda en este dispositivo.</strong> Nada de lo que pones en esta hoja se envía a ningún lado. Para que no lo pierdas, se guarda en este navegador mientras escribes (la casilla “Guardar un borrador en este dispositivo”, más abajo, ya está marcada). En un dispositivo compartido, desmárcala, o pulsa “Borrar todo” cuando termines, y no se volverá a marcar sola. Además, cuando escribes nombres, se marca “Usar estos nombres en las otras herramientas”, que guarda solo los nombres y las tareas con quién se encarga, solo en este navegador, para que las otras hojas del sitio puedan ofrecerlos. Desmárcala para olvidarlos, y no se volverá a marcar sola.';
    if (priv[1]) priv[1].innerHTML = 'Cuando termines, descarga el PDF y guárdalo en un lugar privado. “Guardar borrador” la guarda en este navegador para la próxima vez. Para tener una copia en otro lugar, o para enviarla, usa “Archivo borrador” y abre ese archivo en esta página más tarde. O descarga el <strong>PDF para llenar</strong>: escribe en él con cualquier app de PDF o imprímelo, y luego ábrelo aquí otra vez para seguir donde te quedaste.';
    labelText('main .wpf-keep label', 'Guardar un borrador en este dispositivo');
    put('#wpf-erase', 'Borrar todo');
    put('main .wpf-keep-note', 'Se guarda solo en este navegador, nunca se envía. Se marca sola en cuanto escribes. Mejor en tu propio dispositivo, no en uno compartido.');
    put('#wpf-root', 'Hoja WP-03', 'aria-label');
    var after = document.querySelectorAll('main > .wpf-after');
    if (after[0]) {
      var clr = document.getElementById('wpf-clear');
      if (clr) { clr.textContent = 'Borrar esta página'; after[0].firstChild.textContent = '¿Usas una computadora compartida? Cuando hayas descargado lo que necesitas, '; }
    }
    if (after[1]) after[1].innerHTML = 'En inglés: <a href="/workpapers/wp-03-one-owner-per-job.html" hreflang="en">Read about WP-03 first: One owner per job</a> &middot; <a href="/workpapers/fill/" hreflang="en">All fill-in workpapers</a> &middot; <a href="/workpapers/fill/suite.html" hreflang="en">Build your whole Workpaper Suite</a>' +
      '<br>En español: <a href="/en-espanol.html" hreflang="es">volver a la página en español</a>';
    if (after[1]) Array.prototype.forEach.call(after[1].querySelectorAll('a[hreflang="en"]'), function (a) { a.setAttribute('lang', 'en'); });
    // "About this tool" is written in English for every tool page: it says so
    var tg = $('main [data-tool-guide]');
    if (tg && !tg.previousElementSibling.classList.contains('wpf-es-note')) {
      tg.setAttribute('lang', 'en');
      var n = document.createElement('p'); n.className = 'wpf-after wpf-es-note'; n.textContent = 'Más abajo, “About this tool” explica esta lista en inglés.';
      tg.parentNode.insertBefore(n, tg);
    }
    put('.wpf-bar', 'Guardar y descargar', 'aria-label');
    put('#wpf-save', 'Guardar borrador');
    put('#wpf-open', 'Abrir');
    put('#wpf-fillable', 'PDF para llenar');
    put('#wpf-pdf', 'Descargar PDF');
    put('#wpf-print', 'Imprimir esta hoja');
    // "About this tool" is in English for every tool: its heading says so in Spanish (tools16)
    var tgs = $('main [data-tool-guide] .tg-sum-t'); if (tgs && !tgs.hasAttribute('data-es')) { tgs.setAttribute('data-es', '1'); tgs.setAttribute('lang', 'es'); tgs.textContent = 'Sobre esta herramienta (en inglés)'; }
  }
  // The sheet's other words (tol-workpaper.js turns its own labels and buttons into Spanish; these are the rest).
  // Exact matches only: what someone types (names, jobs) is never touched. The sheet redraws as it is filled in,
  // so this runs again after every change. Anything left in English is marked lang="en".
  var OFTEN = ' · often unseen';
  var MAP = {
    'Your list shows here as you add jobs below. Or print a blank one and fill it in together.': 'Tu lista aparece aquí a medida que añades tareas abajo. O imprime una en blanco y llénenla juntos.',
    'One clean page of the list on this page: each job, its owner and a box to tick. Fits A4 and US Letter. With no list yet, it prints a blank one.': 'Una página limpia con la lista: cada tarea, quién se encarga y una casilla para marcar. Cabe en A4 y en tamaño carta. Si todavía no hay lista, imprime una en blanco.',
    'How saving works': 'Cómo se guarda',
    'How it works': 'Cómo funciona', 'and how saving works: it stays on this device': 'y cómo se guarda: se queda en este dispositivo',
    'Saved on this device once you start': 'Se guarda en este dispositivo en cuanto empiezas',
    'Saved on this phone once you start': 'Se guarda en este teléfono en cuanto empiezas',
    'Saved on this phone': 'Guardado en este teléfono', 'Saved on this device': 'Guardado en este dispositivo',
    'Remove': 'Quitar', 'First name': 'Nombre', 'Print this form': 'Imprimir esta hoja',
    'Both (decide together)': 'Ambos (lo deciden juntos)', 'Everyone (decide together)': 'Todos (lo deciden juntos)',
    'Ticked for you: the names are kept only on this device, so your other worksheets can offer them. Nothing is sent anywhere. Untick to forget them.': 'Marcada por ti: los nombres se guardan solo en este dispositivo, para que tus otras hojas puedan ofrecerlos. No se envía nada a ningún lado. Desmárcala para olvidarlos.',
    'Saved on this device as you type (the box below), so closing the tab won’t lose it. On a shared device, untick it or press Erase when you’re done.': 'Se guarda en este dispositivo mientras escribes (la casilla de abajo), así que no se pierde si cierras la pestaña. En un dispositivo compartido, desmárcala o pulsa “Borrar todo” cuando termines.',
    'Person A': 'Persona A', 'Person B': 'Persona B', 'Person C': 'Persona C', 'Person D': 'Persona D',
    'Two to eight people. Every name shows up in the drop-downs below.': 'De dos a ocho personas. Cada nombre aparece en las listas de abajo.',
    'Use these names in the other tools': 'Usar estos nombres en las otras herramientas',
    '(kept only on this device)': '(se guardan solo en este dispositivo)',
    'Tap a job to add it to the list, then give it one owner (a helper is optional). The groups marked "often unseen" are the planning, remembering and paperwork that rarely get counted.': 'Toca una tarea para añadirla a la lista y luego ponle una persona a cargo (la ayuda es opcional). Los grupos marcados “a menudo no se ven” son lo que hay que planear, recordar y tramitar, que casi nunca se cuenta. Las tareas de esta lista están en inglés: después de añadir una, puedes cambiar sus palabras.',
    'Food and the kitchen': 'Comida y cocina', 'Cleaning and laundry': 'Limpieza y ropa', 'Money and paperwork': 'Dinero y papeles', 'Planning and remembering': 'Planear y recordar',
    'Kids and school': 'Niños y escuela', 'Caring for a child in care': 'Cuidar a un niño en acogida', 'House rules for us': 'Reglas de la casa', 'Health and care': 'Salud y cuidados',
    'Caring for a parent': 'Cuidar a mamá o a papá', 'Caring for a husband, wife or partner': 'Cuidar a tu esposo, esposa o pareja', 'People and occasions': 'Personas y ocasiones',
    'Home and car': 'Casa y auto', 'Pets and plants': 'Mascotas y plantas',
    'These take real time and rarely get counted. The meetings and the being-there both belong on the list.': 'Esto toma tiempo de verdad y casi nunca se cuenta. Las reuniones y el estar presente también van en la lista.',
    'For a family with teens. The owner is whoever keeps to it, or Both (decide together). Write why it matters to each of you in Notes.': 'Para una familia con adolescentes. Quien se encarga es quien la cumple, o Ambos (lo deciden juntos). Escriban en Notas por qué le importa a cada uno.',
    'When one of you cares for the other. The main carer needs breaks too: respite belongs on the list.': 'Cuando uno cuida al otro. Quien cuida también necesita descansos: el relevo va en la lista.',
    'See a filled-in example': 'Ver un ejemplo lleno',
    'Part of a list where every job has one owner, and sometimes a helper.': 'Parte de una lista donde cada tarea tiene una persona a cargo, y a veces alguien que ayuda (el ejemplo está en inglés).',
    'Ways to hand a job over': 'Formas de pasarle una tarea a otra persona',
    'I’ve been doing the dishes most nights. Could you own weeknights, including noticing when they need doing?': 'Vengo lavando los platos casi todas las noches. ¿Podrías encargarte de los días de semana, incluido darte cuenta de cuándo hay que hacerlo?',
    'Could you take the whole of the school forms, from reading the email to sending it back? I’ll stay out of it.': '¿Podrías encargarte de todos los papeles de la escuela, desde leer el correo hasta mandarlos de vuelta? Yo no me meto.',
    'I’d like to hand over the grocery list. Here’s what I usually check; it’s yours from Monday.': 'Quiero pasarte la lista de compras. Esto es lo que suelo revisar; desde el lunes es tuya.',
    'This one has quietly become mine. Could we swap it for one of yours for a month and see how it feels?': 'Esta se volvió mía sin que nadie lo decidiera. ¿La cambiamos por una de las tuyas durante un mes, a ver qué tal?',
    'Watch the spread, not only the names: if one person holds most of the list, the sheet says so.': 'Fíjense en cómo se reparte, no solo en los nombres: si una persona tiene casi toda la lista, la hoja lo dice.',
    'Send it to the others as a link, and open theirs here. When you open one, you choose to combine it with what is here or to replace it. People are matched by name.': 'Envíenla a los demás como enlace, y abran aquí la de ellos. Al abrir una, eligen si juntarla con lo que hay aquí o reemplazarlo. Las personas se emparejan por su nombre.',
    'Add an owner to a job, or add your own jobs, to see the score. Nothing is counted yet.': 'Pongan a alguien a cargo de una tarea, o añadan sus propias tareas, para ver el resultado. Todavía no se cuenta nada.',
    'Add jobs to see the score.': 'Añadan tareas para ver el resultado.',
    '1 example job from the starter list isn’t counted until you give it an owner or change it.': '1 tarea de ejemplo de la lista inicial no cuenta hasta que le pongan a alguien a cargo o la cambien.',
    'When life changes, rework the agreement in writing, instead of letting jobs drift to whoever started doing more. Anyone on it can ask for a review at a weekly check-in, or at What keeps coming back? (WP-04), the monthly look-back.': 'Cuando la vida cambia, rehagan el acuerdo por escrito, en vez de dejar que las tareas vayan cayendo en quien empezó a hacer más. Cualquiera puede pedir revisarlo en la charla de cada semana, o en “What keeps coming back?” (WP-04), el repaso de cada mes.',
    'Where we’ve landed': 'Dónde quedamos', "Where we've landed": 'Dónde quedamos',
    "Agreeing means everyone has read this version and knows who owns what. It doesn't mean every job feels perfectly fair, only that ownership is clear.": 'Estar de acuerdo quiere decir que todos leyeron esta versión y saben quién se encarga de qué. No quiere decir que cada tarea se sienta perfectamente justa, solo que está claro quién se encarga.',
    "We're agreed on this": 'Estamos de acuerdo', 'Who agreed (optional)': 'Quiénes están de acuerdo (opcional)',
    'Everyone who agreed can add their name, or leave it blank.': 'Cada persona que esté de acuerdo puede poner su nombre, o dejarlo en blanco.',
    'Look at this again on (optional)': 'Volver a revisarla el (opcional)',
    'Example': 'Ejemplo', 'Every job has an owner.': 'Cada tarea tiene a alguien a cargo.', 'No job has an owner yet.': 'Ninguna tarea tiene a alguien a cargo todavía.',
    'Most jobs have an owner.': 'Casi todas las tareas tienen a alguien a cargo.', 'Some jobs have an owner.': 'Algunas tareas tienen a alguien a cargo.',
    'e.g. weekdays here, weekends there': 'p. ej., entre semana aquí, los fines de semana allá', 'e.g. Sam and Jordan': 'p. ej., Ana y Luis',
    'An example job. It isn’t counted until you give it an owner or change it.': 'Una tarea de ejemplo. No cuenta hasta que le pongan a alguien a cargo o la cambien.',
    'Remove this row': 'Quitar esta fila', 'Clear': 'Borrar',
    'Jobs with an owner': 'Tareas con alguien a cargo', 'Still needs an owner': 'Todavía sin nadie a cargo', 'What’s this number?': '¿Qué es este número?',
    'Who’s carrying more right now': '¿Quién carga más ahora?', 'How the jobs are spread': 'Cómo se reparten las tareas', 'Share this list': 'Compartir esta lista',
    'Keep it in this browser, on this device, so it’s here when you come back': 'Guardarla en este navegador, en este dispositivo, para que esté aquí cuando vuelvas',
    'A small file to keep somewhere else, or to send to the other people on this sheet so they can add their part': 'Un archivo pequeño para guardar en otro lugar, o para enviar a las demás personas de esta hoja y que añadan su parte',
    'Job': 'Tarea', 'How often': 'Cada cuánto', 'Owner': 'Quién se encarga', 'Helper or backup (optional)': 'Ayuda o respaldo (opcional)', 'Size (optional)': 'Tamaño (opcional)', 'Notes': 'Notas',
    'Roughly how long? (hours each time, optional)': '¿Cuánto tarda? (horas cada vez, opcional)', 'What changed': 'Qué cambió', 'Who': 'Quién', 'Date': 'Fecha',
    'Who owns each job': 'Quién se encarga de cada tarea', 'Changes to the list': 'Cambios en la lista'
  };
  function word(k) { return MAP[k] || k; }
  var RX = [
    [/^Saved on this (phone|device) as you type, so it’s here when you come back\. To remove it: “Erase”, under How (?:saving|it) works\.$/, function (m) { return 'Se guarda en ' + (m[1] === 'phone' ? 'este teléfono' : 'este dispositivo') + ' mientras escribes, así que estará aquí cuando vuelvas. Para quitarlo: “Borrar todo”, en Cómo funciona.'; }],
    [/^(\d+) of (\d+)\. Every job you’ve set has an owner\. (\d+) example (?:job is|jobs are) still on the list: give (?:it|them) an owner, or remove (?:it|them) if you don’t need (?:it|them)\.$/, function (m) { var one = m[3] === '1'; return m[1] + ' de ' + m[2] + '. Cada tarea que pusieron tiene a alguien a cargo. ' + (one ? 'Todavía queda 1 tarea de ejemplo en la lista: pónganle a alguien a cargo, o quítenla si no la necesitan.' : 'Todavía quedan ' + m[3] + ' tareas de ejemplo en la lista: pónganles a alguien a cargo, o quítenlas si no las necesitan.'); }],
    [/^Saved on this (phone|device) as you type \(the box below\), so closing the tab won’t lose it\. On a shared device, untick it or press Erase when you’re done\.$/, function (m) { return 'Se guarda en ' + (m[1] === 'phone' ? 'este teléfono' : 'este dispositivo') + ' mientras escribes (la casilla de abajo), así que no se pierde si cierras la pestaña. En un dispositivo compartido, desmárcala o pulsa “Borrar todo” cuando termines.'; }],
    [/^Kept in this tab until you close it, so a reload or Back won’t lose your answers\.$/, function () { return 'Se guarda en esta pestaña hasta que la cierres, así que no se pierde si recargas la página o vas hacia atrás.'; }],
    [/^Add from the task library \((\d+) common jobs, including the ones nobody sees\)$/, function (m) { return 'Añadir desde la lista de tareas (' + m[1] + ' tareas comunes en inglés, incluidas las que nadie ve)'; }],
    [/^(.+) · often unseen$/, function (m) { return MAP[m[1]] ? MAP[m[1]] + ' · a menudo no se ven' : null; }],
    [/^(\d+) example jobs from the starter list aren’t counted until you give them an owner or change them\.$/, function (m) { return m[1] + ' tareas de ejemplo de la lista inicial no cuentan hasta que les pongan a alguien a cargo o las cambien.'; }],
    [/^(\d+) of (\d+)\. (.+)$/, function (m) { return MAP[m[3]] ? m[1] + ' de ' + m[2] + '. ' + MAP[m[3]] : null; }],
    [/^(.+), row (\d+)$/, function (m) { return MAP[m[1]] ? MAP[m[1]] + ', fila ' + m[2] : null; }],
    [/^Remove row (\d+) from (.+)$/, function (m) { return 'Quitar la fila ' + m[1] + ' de ' + word(m[2]); }]
  ];
  function tr(t) {
    var k = t.replace(/\s+/g, ' ').trim(); if (!k) return null;
    if (MAP[k]) return MAP[k];
    // the score and its "What's this number?" share one line
    var more = ' · What’s this number?';
    if (k.length > more.length && k.slice(-more.length) === more) { var head = tr(k.slice(0, -more.length)); return head == null ? null : head + ' · ¿Qué es este número?'; }
    for (var i = 0; i < RX.length; i++) { var m = RX[i][0].exec(k); if (m) { var v = RX[i][1](m); if (v) return v; } }
    return null;
  }
  // tools16: the result under "Who's carrying more right now" / "How the jobs are spread" and the note under the score,
  // translated phrase by phrase (names, numbers and what someone typed stay as they are)
  function freqEs(n, f) {
    var one = n === '1', W = { daily: ['diaria', 'diarias'], weekly: ['semanal', 'semanales'], monthly: ['mensual', 'mensuales'], ongoing: ['continua', 'continuas'], 'as needed': ['cuando haga falta', 'cuando haga falta'], 'each meeting': ['de cada reunión', 'de cada reunión'] };
    return n + ' ' + (W[f] ? W[f][one ? 0 : 1] : f);
  }
  var PHR = [
    [/Counted by how often each job comes round \(a daily job about five times a weekly one, a monthly one a quarter\)/g, 'Contado según cada cuánto toca cada tarea (una tarea diaria cuenta unas cinco veces lo que una semanal, y una mensual, la cuarta parte)'],
    [/, and by size or time where you gave it/g, ', y según el tamaño o el tiempo donde lo pusieron'],
    [/ owns (\d+) of the (\d+) jobs with one owner/g, ' se encarga de $1 de las $2 tareas que tienen una sola persona a cargo'],
    [/\b(\d+) (daily|weekly|monthly|ongoing|as needed|each meeting)\b/g, function (m, n, f) { return freqEs(n, f); }],
    [/ (\d+) decided together\./g, ' $1 se deciden juntos.'],
    [/ \(a job you decide together counts the same for each of you\)/g, ' (una tarea que deciden juntos cuenta igual para cada uno)'],
    [/, both together (\d+)/g, ', ambos juntos $1'], [/, everyone together (\d+)/g, ', todos juntos $1'],
    [/ \(jobs owned\)\./g, ' (tareas a cargo).'],
    [/ (\d+) house rules? on the list (?:isn’t|aren’t) counted here: a rule needs someone who keeps to it, but it isn’t load\./g, ' $1 regla(s) de la casa en la lista no cuentan aquí: una regla necesita a alguien que la cumpla, pero no es carga.'],
    [/Does this match what you agreed\? An even split isn’t always the goal: two homes, weekdays and weekends, or very different hours can make another split fair\./g, '¿Coincide con lo que acordaron? Repartir a partes iguales no siempre es la meta: dos casas, entre semana y fines de semana, u horarios muy distintos pueden hacer justo otro reparto.'],
    [/You wrote down the split you agreed: “([^”]*)”\. Does this match it\?/g, 'Escribieron el reparto que acordaron: “$1”. ¿Coincide con esto?'],
    [/ The split you agreed elsewhere on this site gives (.+?) about (\d+)%\./g, ' El reparto que acordaron en otra parte del sitio le da a $1 alrededor del $2%.'],
    [/ If it doesn’t match, ask which job could move first\. /g, ' Si no coincide, pregúntense qué tarea podría cambiar de manos primero. '],
    [/Counting how often each job comes round changes the picture: a few daily jobs can outweigh many monthly ones\. /g, 'Contar cada cuánto toca cada tarea cambia el panorama: unas pocas tareas diarias pueden pesar más que muchas mensuales. '],
    [/Give a job a size, or the hours it takes each time, and this counts a big one for more than a quick one\./g, 'Pongan a una tarea un tamaño, o las horas que lleva cada vez, y esto cuenta más una grande que una rápida.'],
    [/Some jobs come round more often, or are bigger, than others\. Give each job how often it comes round \(and a size, if you like\), and this counts a daily job for more than a monthly one\./g, 'Algunas tareas tocan más seguido, o son más grandes, que otras. Pongan a cada tarea cada cuánto toca (y un tamaño, si quieren), y esto cuenta más una tarea diaria que una mensual.'],
    [/ Counting jobs isn’t counting the work: a daily job comes round far more often than a monthly one\. It’s a starting point for a talk, not a scorecard\./g, ' Contar tareas no es contar el trabajo: una tarea diaria toca mucho más seguido que una mensual. Es un punto de partida para hablar, no un marcador.'],
    [/As a share, (\d+) of (\d+) is ([\d.]+) out of 1\.00\. It only asks whether each job has a name next to it, not whether the split feels fair\. “(Both|Everyone) \(decide together\)” counts as an owner: use it for decisions, and give jobs one name\. If you use the calculator Is the setup working for everyone\? \(CALC-01\), this is the number for its jobs-with-an-owner box\./g, function (m, a, b, c, w) { return 'Como proporción, ' + a + ' de ' + b + ' es ' + c + ' de 1.00. Solo mira si cada tarea tiene un nombre al lado, no si el reparto se siente justo. “' + (w === 'Both' ? 'Ambos' : 'Todos') + ' (lo deciden juntos)” cuenta como alguien a cargo: úsenlo para las decisiones, y pongan un solo nombre en las tareas. Si usan la calculadora “Is the setup working for everyone?” (CALC-01, en inglés), este es el número para su casilla de tareas con alguien a cargo.'; }],
    [/ Read it next to “Who’s carrying more right now” below\./g, ' Léanlo junto a “¿Quién carga más ahora?”, más abajo.'],
    [/ 1 example job from the starter list isn’t counted until you give it an owner or change it\./g, ' 1 tarea de ejemplo de la lista inicial no cuenta hasta que le pongan a alguien a cargo o la cambien.'],
    [/ (\d+) example jobs from the starter list aren’t counted until you give them an owner or change them\./g, ' $1 tareas de ejemplo de la lista inicial no cuentan hasta que les pongan a alguien a cargo o las cambien.'],
    [/(\S+)’s home\b/g, 'la casa de $1'], [/ · Together (\d+)%/g, ' · Juntos $1%'], [/ · Together (\d+)/g, ' · Juntos $1']
  ];
  function phr(t) {
    if (!/Counted by how often|owns \d+ of the|\(jobs owned\)|Does this match|You wrote down the split|As a share, |Counting jobs isn’t|Some jobs come round/.test(t)) return null;
    var o = t; PHR.forEach(function (p) { o = o.replace(p[0], p[1]); });
    return o === t ? null : o;
  }
  var EN_LEFT = /\b(the|and|you|your|with|this|is|are|isn’t|aren’t|job|jobs|owner|each|what|who|how)\b/i;
  function pass() {
    var roots = [document.querySelector('main'), document.querySelector('.wpf-bar')];
    roots.forEach(function (root) {
      if (!root) return;
      var w = document.createTreeWalker(root, NodeFilter.SHOW_TEXT), n, todo = [];
      while ((n = w.nextNode())) todo.push(n);
      todo.forEach(function (n) {
        var pe = n.parentElement; if (!pe || pe.closest('script, style, textarea, .tg-wrap, [data-tool-guide]')) return;
        // an <option> with no value of its own is its value: leave it
        if (pe.tagName === 'OPTION' && !pe.hasAttribute('value')) return;
        var v = tr(n.textContent);
        if (v == null) { var pv = phr(n.textContent); if (pv != null) { n.textContent = pv; var l0 = pe.closest('[lang]'); if (l0 && /^en/i.test(l0.getAttribute('lang'))) l0.removeAttribute('lang'); } return; }
        n.textContent = n.textContent.replace(n.textContent.trim(), v);
        var l = pe.closest('[lang]'); if (l && /^en/i.test(l.getAttribute('lang'))) pe.setAttribute('lang', 'es');
      });
      Array.prototype.forEach.call(root.querySelectorAll('[aria-label], [title], [placeholder]'), function (e) {
        if (e.closest('.tg-wrap, [data-tool-guide]')) return;
        ['aria-label', 'title', 'placeholder'].forEach(function (a) { var v0 = e.getAttribute(a); if (!v0) return; var v = tr(v0); if (v != null) e.setAttribute(a, v); });
      });
    });
    // what is still in English, said so: the task library's jobs, the filled-in example, and the longer notes under the score
    Array.prototype.forEach.call(document.querySelectorAll('#wpf-root details'), function (d) {
      var sm = d.querySelector('summary');
      if (sm && /^Añadir desde la lista de tareas/.test(sm.textContent.trim())) {
        Array.prototype.forEach.call(d.querySelectorAll('button'), function (b) { if (/^\+ /.test(b.textContent.trim()) && !b.hasAttribute('lang')) b.setAttribute('lang', 'en'); });
      }
      if (sm && sm.textContent.trim() === 'Ver un ejemplo lleno') Array.prototype.forEach.call(d.querySelectorAll('.wpf-table-box'), function (b) { b.setAttribute('lang', 'en'); });
    });
    Array.prototype.forEach.call(document.querySelectorAll('#wpf-root dd, #wpf-root dt, #wpf-root .wpf-help, #wpf-root .wpf-intro, #wpf-status'), function (e) {
      var t = e.textContent; if (!t.trim()) return;
      if (EN_LEFT.test(t) && !/[áéíóúñ¿¡]/i.test(t)) e.setAttribute('lang', 'en'); else if (e.getAttribute('lang') === 'en') e.removeAttribute('lang');
    });
  }
  var queued = false;
  function queue() { if (queued) return; queued = true; setTimeout(function () { queued = false; pass(); }, 0); }
  function start() {
    run(); pass();
    try {
      var mo = new MutationObserver(queue);
      [document.querySelector('main'), document.querySelector('.wpf-bar')].forEach(function (r) { if (r) mo.observe(r, { childList: true, subtree: true, characterData: true }); });
    } catch (e) {}
  }
  // after tol-workpaper.js has built the sheet (it starts on DOMContentLoaded, and this file loads after it)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(start, 0); });
  else setTimeout(start, 0);
})();
