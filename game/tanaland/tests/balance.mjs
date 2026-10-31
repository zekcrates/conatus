// tanaland/tests/balance.mjs
// Instrumented runs. Prints the outcome of each book scenario so we can see
// whether the model reproduces the dynamics before trusting any of it.
//   node tanaland/tests/balance.mjs
import { newGame, setPolicy, advanceTo, evaluate, OPENERS, policyFrom, briefing } from '../engine/game.js';
import { TOTAL_MONTHS } from '../engine/sim.js';

function run(opener, seed = 12345, policyOverride = null) {
  const g = newGame({ seed });
  const p = policyOverride || OPENERS[opener].policy;
  setPolicy(g, policyFrom(p));
  advanceTo(g, TOTAL_MONTHS);
  g.ended = true;
  return g;
}

function summary(name, g) {
  const h = g.state.history;
  const pick = (m) => h[Math.min(h.length - 1, m - 1)];
  const famineMonths = h.filter((x) => x.famine).length;
  const peakCattle = Math.max(...h.map((x) => x.cattle));
  const peakCattleMonth = h.findIndex((x) => x.cattle === peakCattle) + 1;
  const firstFamine = h.find((x) => x.famine);
  const e = evaluate(g);
  const last = h[h.length - 1];
  console.log(`\n=== ${name} (seed ${g.seed})`);
  console.log(`  population m12/m60/m120: ${pick(12).popTupis + pick(12).popMoros} / ${pick(60).popTupis + pick(60).popMoros} / ${last.popTupis + last.popMoros}`);
  console.log(`  cattle   m12/m60/m120: ${pick(12).cattle} / ${pick(60).cattle} / ${last.cattle}  (peak ${peakCattle} @ m${peakCattleMonth})`);
  console.log(`  grass m12/m60/m120:    ${pick(12).grass} / ${pick(60).grass} / ${last.grass}`);
  console.log(`  veged   m12/m60/m120:  ${pick(12).vegetated} / ${pick(60).vegetated} / ${last.vegetated}`);
  console.log(`  ground  m12/m60/m120:  ${pick(12).groundwater} / ${pick(60).groundwater} / ${last.groundwater}`);
  console.log(`  capital m120: ${last.capital}`);
  console.log(`  famine months: ${famineMonths}, first famine: ${firstFamine ? 'm' + firstFamine.month : 'none'}`);
  console.log(`  verdict: ${e.verdict} score ${e.score}`);
  return { g, e, famineMonths, peakCattle, peakCattleMonth, firstFamine };
}

const idle = summary('H-10 idle (do nothing)', run('empty'));
const classic = summary('H-11 classic opening', run('classic'));
const pop = summary('H-14 health care only', run('population'));
const pests = summary('H-12 pest eradication only', run('pests'));
const wells = summary('H-13 wells only', run('wells'));

console.log('\n--- hypotheses');
console.log('H-10 idle survives (pop > 0.6*start, no mass famine):',
  idle.e.finalPopulation > 1440 && idle.famineMonths === 0);
console.log('H-11 classic collapses (famine before m120):', classic.famineMonths > 0);
console.log('H-14 medicine-only grows pop then famines:',
  pop.g.state.history[47].popTupis + pop.g.state.history[47].popMoros > 2700 && pop.famineMonths > 0);
console.log('H-12 pests alone end worse than idle on cane??:', pests.g.state.cattle, 'vs', idle.g.state.cattle);
console.log('H-13 wells-only depletes groundwater below idle:',
  wells.g.state.groundwater < idle.g.state.groundwater);

const b = briefing(classic.g);
console.log('\nbriefing sample:', JSON.stringify(b, null, 2).slice(0, 600));
