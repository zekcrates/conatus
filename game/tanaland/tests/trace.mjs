// tanaland/tests/trace.mjs  — print a month-by-month table for one scenario.
//   node tanaland/tests/trace.mjs classic 12
import { initialState, step } from '../engine/sim.js';
import { policyFrom, OPENERS } from '../engine/game.js';

const opener = process.argv[2] || 'classic';
const every = Number(process.argv[3] || 6);
const seed = Number(process.argv[4] || 1);

let s = initialState(seed);
const pol = policyFrom(OPENERS[opener].policy);
console.log('policy', JSON.stringify(pol));
console.log('mon  pop    cattle cap    grass veged  gwat  food  cane? millet orched');
for (let m = 1; m <= 120; m++) {
  s = step(s, pol);
  const h = s.history[h_len(s)];
  if (m % every === 0 || m <= 3) {
    console.log(
      String(m).padEnd(4),
      String(h.popTupis + h.popMoros).padEnd(6),
      String(h.cattle).padEnd(6),
      String(h.capacity).padEnd(6),
      String(h.grass).padEnd(6),
      String(h.vegetated).padEnd(6),
      String(h.groundwater).padEnd(5),
      String(h.food).padEnd(5),
      h.famine ? 'FAMINE' : '      ',
      String(h.millet).padEnd(6),
      String(h.orchard),
    );
  }
}
function h_len(s) { return s.history.length - 1; }
