/*
  lemonade-calc.js
  The Objective Ledger (TOL-OS) — Lemonade Stand diagnostic engine

  Expects this markup somewhere on the page:

  <input type="text" id="label-a" value="Column A">
  <input type="text" id="label-b" value="Column B">
  <div id="rows"></div>
  <button id="add-row" type="button">Add a line item</button>
  <div id="bar-a"></div>
  <div id="bar-b"></div>
  <span id="legend-a"></span>
  <span id="legend-b"></span>
  <p id="balance-line"></p>

  Each row created by this script has the class "row" and contains:
  .task-name (text), .hours-a (number), .hours-b (number), .remove (button)

  This engine is descriptive, not evaluative: it reports the hours as
  entered and states the split as a fact, not a judgment on either person.
*/

(function () {
  var rowsEl = document.getElementById('rows');
  var addRowBtn = document.getElementById('add-row');
  var labelA = document.getElementById('label-a');
  var labelB = document.getElementById('label-b');
  var barA = document.getElementById('bar-a');
  var barB = document.getElementById('bar-b');
  var legendA = document.getElementById('legend-a');
  var legendB = document.getElementById('legend-b');
  var balanceLine = document.getElementById('balance-line');

  if (!rowsEl) return; // markup not present on this page — do nothing

  var starterRows = [
    { name: 'Groceries & meal planning', a: 3, b: 1 },
    { name: 'Dishes', a: 1, b: 4 },
    { name: 'Laundry', a: 0, b: 3 },
    { name: 'Bills & scheduling', a: 2, b: 0 },
    { name: 'Emotional check-ins', a: 2, b: 2 }
  ];

  function escapeHtml(str) {
    var div = document.createElement('div');
    div.textContent = str;
    return div.innerHTML;
  }

  function makeRow(data) {
    var row = document.createElement('div');
    row.className = 'row';
    row.innerHTML =
      '<input type="text" class="task-name" value="' + escapeHtml(data.name) + '" aria-label="Line item name">' +
      '<input type="number" class="hours-a" min="0" step="0.5" value="' + data.a + '" aria-label="Hours for column A">' +
      '<input type="number" class="hours-b" min="0" step="0.5" value="' + data.b + '" aria-label="Hours for column B">' +
      '<button class="remove" type="button" aria-label="Remove line item">&times;</button>';
    rowsEl.appendChild(row);

    row.querySelectorAll('input').forEach(function (inp) {
      inp.addEventListener('input', recalc);
    });
    row.querySelector('.remove').addEventListener('click', function () {
      row.remove();
      recalc();
    });
  }

  function round1(n) {
    return Math.round(n * 10) / 10;
  }

  function recalc() {
    var totalA = 0, totalB = 0;
    rowsEl.querySelectorAll('.row').forEach(function (row) {
      totalA += parseFloat(row.querySelector('.hours-a').value) || 0;
      totalB += parseFloat(row.querySelector('.hours-b').value) || 0;
    });

    var total = totalA + totalB;
    var pctA = total > 0 ? (totalA / total) * 100 : 50;
    var pctB = total > 0 ? (totalB / total) * 100 : 50;

    if (barA) barA.style.width = pctA + '%';
    if (barB) barB.style.width = pctB + '%';

    var nameA = (labelA && labelA.value) || 'Column A';
    var nameB = (labelB && labelB.value) || 'Column B';

    if (legendA) legendA.textContent = nameA + ' \u00b7 ' + round1(totalA) + 'h';
    if (legendB) legendB.textContent = nameB + ' \u00b7 ' + round1(totalB) + 'h';

    if (!balanceLine) return;

    if (total === 0) {
      balanceLine.textContent = 'Add some hours above to see the register.';
      return;
    }

    var leader, leaderPct, other;
    if (totalA >= totalB) { leader = nameA; leaderPct = pctA; other = nameB; }
    else { leader = nameB; leaderPct = pctB; other = nameA; }

    var roundedPct = Math.round(leaderPct);

    if (roundedPct >= 90) {
      balanceLine.textContent = leader + ' is carrying nearly all of what\u2019s listed here (' + roundedPct + '%). That\u2019s worth a direct conversation about redistributing, not just noting.';
    } else if (roundedPct >= 60) {
      balanceLine.textContent = 'This week, ' + leader + ' shows about ' + roundedPct + '% of the visible hours. That\u2019s not a verdict on either of you \u2014 it\u2019s just what\u2019s written down. Worth talking through together.';
    } else {
      balanceLine.textContent = 'Fairly close split this week \u2014 ' + leader + ' at ' + roundedPct + '%, ' + other + ' close behind. Keep checking in as things change.';
    }
  }

  // public API, in case another page wants to seed or read the ledger
  window.TOLLemonade = {
    addRow: makeRow,
    recalc: recalc,
    reset: function () {
      rowsEl.innerHTML = '';
      starterRows.forEach(makeRow);
    }
  };

  starterRows.forEach(makeRow);
  if (addRowBtn) addRowBtn.addEventListener('click', function () { makeRow({ name: '', a: 0, b: 0 }); });
  if (labelA) labelA.addEventListener('input', recalc);
  if (labelB) labelB.addEventListener('input', recalc);
  recalc();
})();
