// tanaland/tests/search.mjs
// -----------------------------------------------------------------------------
// Random-restart search for constants that make ALL of the book's dynamics true
// at once (claims in claims.mjs), across several seeds.
//
//   node tanaland/tests/search.mjs [iterations] [seed]
//
// Prints the best constants found as a JS object ready to paste into C, plus
// which claims fail. Deterministic given the search seed.
// -----------------------------------------------------------------------------
import { C } from '../engine/sim.js';
import { allRuns, evaluateClaims, scoreClaims } from './claims.mjs';

const SPACE = {
  // food economy
  milletYield: [0.10, 0.45],
  orchardYield: [0.05, 0.30],
  acreageMax: [0.9, 1.8],
  acreageGrowth: [0.002, 0.012],
  landDegradation: [0.0, 0.8],
  foodScale: [9000, 26000],
  intensityRise: [0.02, 0.12],
  satFeed: [0.45, 0.80],
  childRation: [0.2, 0.7],
  // demography
  birthBase: [0.014, 0.030],
  deathBase: [0.005, 0.014],
  healthEffect: [0.55, 0.92],
  hungerDeathScale: [0.15, 0.50],
  famineThreshold: [0.50, 0.75],
  // the lagged catastrophe trap
  youthLag: [30, 130],
  youthRise: [0.008, 0.035],
  // agriculture stress
  pestCropLoss: [0.10, 0.45],
  // aquifer: decides whether "wells forever" depletes
  drawPerWell: [0.28, 0.65],
  wellDrawFeedback: [2.0, 7.0],
  recharge: [0.12, 0.32],
};

const SEEDS = [1, 2, 3, 5];
const CLAIMS = 11;
const total = SEEDS.length * CLAIMS;

function makeRng(seed) {
  let a = seed >>> 0;
  return () => {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

const iterations = Number(process.argv[2] || 400);
const searchSeed = Number(process.argv[3] || 11);
const R = makeRng(searchSeed);

const base = {};
for (const k of Object.keys(SPACE)) base[k] = C[k];

function evaluate(params) {
  Object.assign(C, params);
  let passed = 0;
  const failed = new Map();
  for (const s of SEEDS) {
    const sc = scoreClaims(evaluateClaims(allRuns(s)));
    passed += sc.passed;
    sc.failed.forEach((f) => failed.set(f, (failed.get(f) || 0) + 1));
  }
  return { passed, failed };
}

let best = null;

for (let i = 0; i < iterations; i++) {
  const p = {};
  for (const [k, [lo, hi]] of Object.entries(SPACE)) p[k] = +(lo + R() * (hi - lo)).toFixed(4);
  const res = evaluate(p);
  if (!best || res.passed > best.passed) {
    best = { ...res, p };
    const f = [...res.failed.entries()].map(([k, v]) => `${k}×${v}`).join(' ');
    console.log(`it ${i}: ${res.passed}/${total}  fail: ${f || '-'}`);
    if (res.passed === total) break;
  }
}

Object.assign(C, base);
const f = [...best.failed.entries()].map(([k, v]) => `${k}×${v}`).join(' ');
console.log(`\nBEST ${best.passed}/${total}  fail: ${f || '-'}`);
console.log(JSON.stringify(best.p, null, 2));
