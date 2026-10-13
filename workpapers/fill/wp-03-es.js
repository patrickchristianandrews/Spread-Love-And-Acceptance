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
    // the safety line stays exactly as it is, in English
    var safe = $('main .wpf-safe'); if (safe) safe.setAttribute('lang', 'en');
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
  }
  // after tol-workpaper.js has built the sheet (it starts on DOMContentLoaded, and this file loads after it)
  if (document.readyState === 'loading') document.addEventListener('DOMContentLoaded', function () { setTimeout(run, 0); });
  else setTimeout(run, 0);
})();
