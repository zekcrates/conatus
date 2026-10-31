// tanaland/tests/probe-food.mjs
// -----------------------------------------------------------------------------
// Analytic probe: what equilibrium does the food system have?
//
//   node tanaland/tests/probe-food.mjs
//
// The simulation's long run is set by three numbers:
//   supply  ~ G * vegetable/animal output * landDegradation(pop) * intensity
//   demand  ~ pop * (1 + childRation*youth) * satFeed
//   feed    = supply / demand
// A stationary population needs feed such that deaths = births. This probe
// solves that pair numerically for the *idle* policy and reports where the
// country settles — so constants can be chosen from arithmetic rather than by
// trial and error.
// -----------------------------------------------------------------------------
import { C, initialState, step } from '../engine/sim.js';

function equilibrium(policy, seed = 1, months = 240) {
  let s = initialState(seed);
  for (let i = 0; i < months; i++) s = step(s, policy);
  const h = s.history[s.history.length - 1];
  return {
    pop: Math.round(s.popTupis + s.popMoros),
    food: h.food,
    youth: +s.youth.toFixed(3),
    cattle: Math.round(s.cattle),
    millet: +s.millet.toFixed(2),
    intensity: +s.intensity.toFixed(2),
    vegetated: +s.vegetated.toFixed(2),
    outbreaks: s.famines.length,
  };
}

const runs = {
  idle: {},
  medicine: { clinics: 1 },
  classic: { tsetseKill: 1, wells: 0.8, fertilizer: 0.8, irrigation: 0.6, clinics: 0.8 },
  pests: { pest: 1 },
  wells: { wells: 1 },
};

console.log('constants:', JSON.stringify({
  satFeed: C.satFeed,
  childRation: C.childRation,
  foodScale: C.foodScale,
  milletYield: C.milletYield,
  orchardYield: C.orchardYield,
  landDegradation: C.landDegradation,
  labourWeight: C.labourWeight,
  famineThreshold: C.famineThreshold,
  famineRamp: C.famineRamp,
  birthBase: C.birthBase,
  deathBase: C.deathBase,
  healthEffect: C.healthEffect,
  hungerDeathScale: C.hungerDeathScale,
}));

console.log('\npolicy      pop    food   youth cattle millet inten veg  outbreaks');
for (const [name, pol] of Object.entries(runs)) {
  const e = equilibrium(pol);
  console.log(
    name.padEnd(11),
    String(e.pop).padEnd(6),
    String(e.food).padEnd(6),
    String(e.youth).padEnd(5),
    String(e.cattle).padEnd(6),
    String(e.millet).padEnd(6),
    String(e.intensity).padEnd(5),
    String(e.vegetated).padEnd(4),
    e.outbreaks
  );
}
