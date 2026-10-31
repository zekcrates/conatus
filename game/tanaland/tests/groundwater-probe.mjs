// tanaland/tests/groundwater-probe.mjs
// Instrumented groundwater diagnosis: prints the draw terms month by month so
// claims about the aquifer are backed by numbers, not intuition.
//   node tanaland/tests/groundwater-probe.mjs wells
import { initialState, C } from '../engine/sim.js';
import { policyFrom, OPENERS } from '../engine/game.js';

// Re-implement the aquifer step against the same constants to expose terms.
function probe(policy, months = 120, seed = 1) {
  let s = initialState(seed);
  const p = policyFrom(policy);
  const rows = [];
  let rain = 1;
  // replicate the rain schedule used by step()
  let a = seed >>> 0;
  const rand = () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  rand(); // rngState advance on first step
  for (let m = 1; m <= months; m++) {
    if (m % 12 === 1) rain = 0.74 + rand() * 0.52;
    const inflow = rain * C.recharge;
    const wellDraw = (p.wells || 0) * C.drawPerWell;
    const irrDraw = (p.irrigation || 0) * C.drawPerIrrigation * (1.5 + s.millet + s.vegetated);
    const after = Math.max(0, Math.min(C.groundwaterMax, s.groundwater + inflow - wellDraw - irrDraw));
    rows.push({
      m,
      before: s.groundwater,
      rain,
      inflow: +inflow.toFixed(3),
      wellDraw: +wellDraw.toFixed(3),
      irrDraw: +irrDraw.toFixed(3),
      after,
    });
    // approximate the state advance of the other variables is not needed to
    // diagnose the aquifer; but millet/vegetated do drift, so advance them too
    s = { ...s, groundwater: after, millet: s.millet, vegetated: s.vegetated };
  }
  return rows;
}

const opener = process.argv[2] || 'wells';
const rows = probe(OPENERS[opener].policy);
console.log(`opener=${opener} recharge=${C.recharge} drawPerWell=${C.drawPerWell} drawPerIrrigation=${C.drawPerIrrigation}`);
console.log('m  rain   inflow  wellDraw irrDraw  after');
for (const r of rows.filter((r) => r.m % 12 === 0 || r.m <= 3)) {
  console.log(
    String(r.m).padEnd(3),
    r.rain.toFixed(2).padEnd(6),
    String(r.inflow).padEnd(7),
    String(r.wellDraw).padEnd(8),
    String(r.irrDraw).padEnd(7),
    r.after.toFixed(1),
  );
}
console.log('net per month (wells only, rain=1):', (C.recharge - C.drawPerWell).toFixed(3));
