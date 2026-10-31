// tanaland/tests/tune.mjs
// -----------------------------------------------------------------------------
// Coordinate descent over the constants, maximising how many of the book's
// claims hold across several seeds.
//
//   node tanaland/tests/tune.mjs [rounds]
//
// Why coordinate descent and not a random sweep: the claims are conjunctive and
// the response surface is mostly flat ridges (many parameter sets give the same
// equilibrium), so random sampling wastes most of its budget. Moving one axis
// at a time and keeping any improvement converges far faster, and every step is
// interpretable: you can see which knob moved and what it fixed.
//
// Progress is written to tests/.tune.log so a long run is observable.
// -----------------------------------------------------------------------------
import { C } from '../engine/sim.js';
import { allRuns, evaluateClaims, scoreClaims } from './claims.mjs';
import { appendFileSync, writeFileSync } from 'node:fs';

const LOG = new URL('./.tune.log', import.meta.url);
writeFileSync(LOG, '');

const log = (msg) => {
  appendFileSync(LOG, msg + '\n');
  console.log(msg);
};

const SEEDS = [1, 2, 3, 4];
const TOTAL = SEEDS.length * 11;

// Axes worth moving, with a plausible range each.
const AXES = {
  milletYield: [0.08, 0.45],
  orchardYield: [0.04, 0.26],
  acreageMax: [0.9, 1.8],
  foodScale: [8000, 26000],
  satFeed: [0.45, 0.80],
  childRation: [0.2, 0.7],
  birthBase: [0.016, 0.030],
  deathBase: [0.005, 0.013],
  healthEffect: [0.55, 0.95],
  hungerDeathScale: [0.15, 0.50],
  famineThreshold: [0.48, 0.72],
  youthLag: [24, 110],
  youthRise: [0.006, 0.040],
  landDegradation: [0.0, 0.9],
  intensityRise: [0.02, 0.12],
  pestCropLoss: [0.10, 0.45],
  drawPerWell: [0.25, 0.70],
  wellDrawFeedback: [2.0, 8.0],
  recharge: [0.10, 0.34],
};

function score() {
  let passed = 0;
  const failed = new Map();
  for (const s of SEEDS) {
    const sc = scoreClaims(evaluateClaims(allRuns(s)));
    passed += sc.passed;
    sc.failed.forEach((f) => failed.set(f, (failed.get(f) || 0) + 1));
  }
  return { passed, failed };
}

const fmtFail = (m) => [...m.entries()].map(([k, v]) => `${k}×${v}`).join(' ') || '-';

let best = score();
log(`start ${best.passed}/${TOTAL}  fail: ${fmtFail(best.failed)}`);

const rounds = Number(process.argv[2] || 3);
const base = {};
for (const k of Object.keys(AXES)) base[k] = C[k];

for (let round = 0; round < rounds; round++) {
  let improvedThisRound = false;
  for (const [k, [lo, hi]] of Object.entries(AXES)) {
    const cur = C[k];
    for (const mult of [1.35, 0.74, 1.8, 0.55]) {
      const cand = Math.min(hi, Math.max(lo, +(cur * mult).toFixed(4)));
      if (cand === cur) continue;
      C[k] = cand;
      const res = score();
      if (res.passed > best.passed) {
        best = res;
        improvedThisRound = true;
        log(`r${round} ${k}: ${cur} -> ${cand}   ${res.passed}/${TOTAL}  fail: ${fmtFail(res.failed)}`);
        break;
      }
      C[k] = cur;
    }
  }
  log(`-- round ${round} done, best ${best.passed}/${TOTAL}  fail: ${fmtFail(best.failed)}`);
  if (!improvedThisRound) break;
}

const out = {};
for (const k of Object.keys(AXES)) out[k] = C[k];
log('\nBEST ' + best.passed + '/' + TOTAL + '  fail: ' + fmtFail(best.failed));
log(JSON.stringify(out, null, 2));
