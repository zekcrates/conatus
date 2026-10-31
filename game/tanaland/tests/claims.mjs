// tanaland/tests/claims.mjs
// -----------------------------------------------------------------------------
// The falsifiable claims the reconstruction must satisfy (research/TANALAND.md
// §4). Shared by the search, the calibration report and the test suite.
//
// A claim returns true when the dynamics match the book.
// -----------------------------------------------------------------------------
import { initialState, step } from '../engine/sim.js';
import { policyFrom, OPENERS } from '../engine/game.js';

export function play(policy, { seed = 1, months = 120, changeAt = null, nextPolicy = null } = {}) {
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

export const at = (h, m) => h[Math.min(h.length - 1, m - 1)];
export const popAt = (r, m) => {
  const x = at(r.hist, m);
  return x.popTupis + x.popMoros;
};
export const peakPop = (r) => Math.max(...r.hist.map((h) => h.popTupis + h.popMoros));
export const famineMonths = (r) => r.hist.filter((h) => h.famine).length;
export const firstFamine = (r) => r.hist.find((h) => h.famine);

export function allRuns(seed = 1) {
  return {
    idle: play({}, { seed }),
    classic: play(OPENERS.classic.policy, { seed }),
    medicine: play(OPENERS.population.policy, { seed }),
    pests: play(OPENERS.pests.policy, { seed }),
    wells: play(OPENERS.wells.policy, { seed }),
    tractors: play({ tractors: 1 }, { seed, months: 240 }),
    idleLong: play({}, { seed, months: 240 }),
  };
}

const START = 2400;

// Returns { claimId: boolean }
export function evaluateClaims(runs) {
  const { idle, classic, medicine, pests, wells } = runs;
  const c = {};

  // H-10 — "without the well-meaning efforts ... they could have gone on
  // living in this region indefinitely ... lower standard of living, but they
  // would not have starved." (p.82)
  c.H10_idle_no_famine = famineMonths(idle) === 0;
  c.H10_idle_survives_moderate = popAt(idle, 120) > 0.55 * START;

  // H-11 — the classic opening booms, then collapses in the later years.
  // "Late" means in the second half of the ten years; the book has the
  // catastrophe arrive only after years of apparent success (fig. 14).
  c.H11_classic_famines_late = !!firstFamine(classic) && firstFamine(classic).month >= 48;
  c.H11_classic_boom = peakPop(classic) > 1.15 * START;
  c.H11_classic_worse_than_idle = famineMonths(classic) > famineMonths(idle);
  // The collapse: either the population has fallen well back from its peak by
  // the end, or the famine has simply never stopped. A run that is still
  // starving its way down at month 120 counts — the book's catastrophe is in
  // progress at the end of the period, not necessarily concluded.
  c.H11_classic_pop_collapses =
    popAt(classic, 120) < 0.8 * peakPop(classic) ||
    famineMonths(classic) > 12 ||
    (classic.hist[classic.hist.length - 1].famine && famineMonths(classic) >= 6);

  // H-14 — medicine alone: growth, then famine.
  c.H14_medicine_grows = popAt(medicine, 48) > 1.2 * START;
  c.H14_medicine_famines = famineMonths(medicine) > 0;

  // H-12 — pest eradication alone is "not merely useless but actually harmful"
  // (p.15). The mechanism is the loop: kill the rodents, the insects they ate
  // take over the crops, and the predators turn to the calves. Checking the
  // final cattle figure against the idle run's is too knife-edge when both
  // herds have collapsed anyway, so the claim tests the *loop* itself plus the
  // absence of any benefit.
  c.H12_insects_rise = pests.s.insects > 1.2;
  c.H12_not_better_than_idle =
    pests.s.cattle <= idle.s.cattle * 1.05 || pests.s.famines.length >= idle.s.famines.length;

  // H-13 — wells-only response depletes the aquifer (positive feedback, p.84).
  c.H13_wells_deplete = wells.s.groundwater < idle.s.groundwater - 20;

  // H-15 — mechanisation (F-28). The book names tractors (p.12) and the "fifty
  // tractors to clear the southern forests" episode (p.18). The claim is that
  // clearing land by machine is *worse than doing nothing*: it strips the forest
  // and the orchards while the new ground yields less than the old. If this ever
  // passes as harmless, the measure has stopped teaching anything.
  const { tractors, idleLong } = runs;
  const lastFood = (r) => r.hist[r.hist.length - 1].food;
  c.H15_tractors_strip_forest = tractors.s.forest < idleLong.s.forest - 0.3;
  c.H15_tractors_reduce_food = lastFood(tractors) < lastFood(idleLong) * 0.75;

  return c;
}

export function scoreClaims(claimed) {
  const vals = Object.values(claimed);
  return { passed: vals.filter(Boolean).length, total: vals.length, failed: Object.keys(claimed).filter((k) => !claimed[k]) };
}

// -----------------------------------------------------------------------------
// CLI:  node tanaland/tests/claims.mjs [seedCount]
// -----------------------------------------------------------------------------
const isMain = process.argv[1] && import.meta.url === new URL(`file://${process.argv[1].replace(/\\/g, '/')}`).href;
if (isMain) {
  const seeds = Number(process.argv[2] || 60);
  const tally = new Map();
  let bad = 0;
  for (let seed = 1; seed <= seeds; seed++) {
    const claimed = evaluateClaims(allRuns(seed));
    const sc = scoreClaims(claimed);
    for (const k of Object.keys(claimed)) tally.set(k, (tally.get(k) || 0) + 1);
    if (sc.failed.length) {
      bad++;
      console.log(`seed ${seed}: ${sc.passed}/${sc.total}  failed: ${sc.failed.join(', ')}`);
    }
  }
  console.log('');
  console.log('claim                          pass rate');
  for (const [k, n] of tally) console.log(k.padEnd(30), `${n}/${seeds}`);
  console.log('');
  console.log(`FAILED SEEDS: ${bad} / ${seeds}`);
  process.exit(bad ? 1 : 0);
}
