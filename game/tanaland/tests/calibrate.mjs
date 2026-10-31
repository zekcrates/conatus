// tanaland/tests/calibrate.mjs
// -----------------------------------------------------------------------------
// Hypothesis-driven calibration harness.
//
// This file encodes WHAT THE MODEL MUST BE TRUE OF (research/TANALAND.md §4/§5),
// then searches parameter sets for one that satisfies all of it.
//
// Run:  node tanaland/tests/calibrate.mjs
// -----------------------------------------------------------------------------
import { initialState, step, derive } from '../engine/sim.js';
import { defaultPolicy, policyFrom, OPENERS } from '../engine/game.js';

// ---- scenario driver ---------------------------------------------------------
function play(policy, { seed = 1, months = 120, changeAt = null, nextPolicy = null } = {}) {
  let s = initialState(seed);
  let pol = policyFrom(policy);
  const hist = [];
  for (let m = 0; m < months; m++) {
    if (changeAt !== null && m === changeAt) pol = policyFrom(nextPolicy);
    s = step(s, pol);
    hist.push(s.history[s.history.length - 1]);
  }
  return { s, hist };
}

const at = (hist, m) => hist[Math.min(hist.length - 1, m - 1)];
const popAt = (r, m) => { const h = at(r.hist, m); return h.popTupis + h.popMoros; };

// ---- the claims --------------------------------------------------------------
// Each returns a boolean. Faithfulness = all true.
export function claims(runs) {
  const { idle, classic, medicine, pests, wells } = runs;

  const c = {};
  // H-10: doing nothing keeps people alive (lower living standard, no starvation)
  c.H10_idle_survives = popAt(idle, 120) > 0.75 * 2400 && idle.s.famines.length === 0;
  // H-10b: idle doesn't boom either — the baseline is poor but stable
  c.H10b_idle_stable = popAt(idle, 60) > 0.7 * 2400 && idle.hist.every((h) => h.cattle > 0);

  // H-11: classic opening → boom for a while, then famine somewhere in years 3–10
  const firstFam = classic.hist.find((h) => h.famine);
  c.H11_classic_famines = !!firstFam;
  c.H11_famine_in_window = !!firstFam && firstFam.month >= 30 && firstFam.month <= 110;
  c.H11_boom_first = Math.max(...classic.hist.map((h, i) => h.popTupis + h.popMoros)) > 2900;
  // and the classic run must be WORSE than doing nothing
  c.H11_worse_than_idle = classic.hist.filter((h) => h.famine).length > idle.hist.filter((h) => h.famine).length;

  // H-14: medicine alone → population grows markedly, then famine
  c.H14_medicine_grows = popAt(medicine, 48) > 1.25 * 2400;
  c.H14_medicine_famines = medicine.hist.some((h) => h.famine);

  // H-12: pest-only → insects up, cats hit cattle; NOT better than idle
  c.H12_insects_rise = pests.s.insects > 1.3;
  c.H12_not_better = pests.s.cattle <= idle.s.cattle * 1.02;

  // H-13: wells-only depletes groundwater much faster than idle
  c.H13_wells_deplete = wells.s.groundwater < idle.s.groundwater - 25;

  return c;
}

// ---- the search ---------------------------------------------------------------
// Parameters that matter and their search ranges.
const SPACE = {
  foodBase: { lo: 1500, hi: 4200, step: 150 },
  foodPerCapitaTarget: { lo: 1.15, hi: 1.9, step: 0.1 },
  popGrowthMax: { lo: 0.008, hi: 0.022, step: 0.002 },
  birthBase: { lo: 0.022, hi: 0.04, step: 0.002 },
  deathBase: { lo: 0.008, hi: 0.018, step: 0.001 },
  healthEffect: { lo: 0.5, hi: 0.85, step: 0.05 },
  birthControlEffect: { lo: 0.4, hi: 0.8, step: 0.1 },
  fertEffect: { lo: 0.3, hi: 0.9, step: 0.1 },
  wellDraw: { lo: 0.15, hi: 0.6, step: 0.05 },
  recharge: { lo: 0.1, hi: 0.6, step: 0.05 },
};

function combos(space) {
  const keys = Object.keys(space);
  let acc = [{}];
  for (const k of keys) {
    const { lo, hi, step } = space[k];
    const vals = [];
    for (let v = lo; v <= hi + 1e-9; v += step) vals.push(+v.toFixed(4));
    const next = [];
    for (const a of acc) for (const v of vals) next.push({ ...a, [k]: v });
    acc = next;
  }
  return acc;
}

const isMain =
  typeof process !== 'undefined' &&
  process.argv[1] &&
  import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href;

if (isMain) {
  // Probe the current state of the model first.
  const runs = {
    idle: play({}),
    classic: play(OPENERS.classic.policy),
    medicine: play(OPENERS.population.policy),
    pests: play(OPENERS.pests.policy),
    wells: play(OPENERS.wells.policy),
  };
  console.log('claims against current model:');
  for (const [k, v] of Object.entries(claims(runs))) console.log(' ', v ? 'PASS' : 'FAIL', k);

  console.log('\nidle: pop m12/60/120 =', popAt(runs.idle, 12), popAt(runs.idle, 60), popAt(runs.idle, 120),
    ' furthest pop', Math.max(...runs.idle.hist.map((h) => h.popTupis + h.popMoros)));
  console.log('classic: pop m12/60/120 =', popAt(runs.classic, 12), popAt(runs.classic, 60), popAt(runs.classic, 120));
}
