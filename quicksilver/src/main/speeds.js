// Real speeds, measured on this PC. Every answer a local model writes is timed; those
// measurements replace the estimate for that model, and their average ratio to the estimates
// re-tunes the estimates for every other model (including ones not downloaded yet).
const store = require('./store');
const catalog = require('../shared/catalog');

const MIN_TOKENS = 12; // very short answers time poorly

function measured() { return store.config().measured || {}; }

// tps: tokens per second the engine reported; est: what the estimate expected (uncalibrated).
function record(id, tps, tokens, est) {
  if (!id || !tps || !isFinite(tps) || (tokens || 0) < MIN_TOKENS) return null;
  const all = { ...measured() };
  const prev = all[id];
  const value = prev ? prev.tps * 0.6 + tps * 0.4 : tps; // smooth out one-off slow or fast runs
  all[id] = { tps: value, ratio: est ? value / est : prev?.ratio || 1, n: (prev?.n || 0) + 1, at: Date.now() };
  // Calibrate every estimate with the typical ratio of measured to estimated speed.
  const ratios = Object.values(all).map((m) => m.ratio).filter((r) => r > 0).sort((a, b) => a - b);
  const median = ratios[Math.floor(ratios.length / 2)];
  const calib = store.config().calib || {};
  store.saveConfig({ measured: all, calib: { ...calib, text: Math.max(0.2, Math.min(3, median)), measuredAt: Date.now() } });
  return all[id];
}

// The uncalibrated estimate for an installed model on this hardware (what "ratio" compares to).
function estimateFor(model, hw) {
  try { return catalog.estimateText(catalog.profileInstalled(model), hw, 1).tps || 0; } catch { return 0; }
}

module.exports = { record, measured, estimateFor };
