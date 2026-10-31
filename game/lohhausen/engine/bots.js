// lohhausen/engine/bots.js
// -----------------------------------------------------------------------------
// Scripted mayors, used by the tests (hypothesis checks, Monte-Carlo sweeps) and
// by the console demo. Each bot is (state, sessionIndex) → { patch, intents }.
//
// The serious strategies all respect one rule a real mayor cannot ignore: do not
// spend past the credit line. The deliberately bad mayors (mark, taxGrab, chaos)
// are left free to over-borrow — that is exactly their failure mode.
// -----------------------------------------------------------------------------

import { SESSIONS, endSession, patchOrder, PARAMS } from './game.js';

export function play(s, bot) {
  for (let k = 0; k < SESSIONS; k++) {
    const out = bot(s, k) || {};
    patchOrder(s, out.patch || {});
    endSession(s, out.intents || []);
  }
  return s;
}

/** Can the town afford this order and still keep a cushion? */
export const afford = (s, cost) => (s.finance.creditLimit - s.finance.debt) > cost + 2_000_000;

/**
 * A session budget: each order draws on what is left, so a mayor who files
 * several big orders in one session cannot quietly cross the credit line.
 */
export const planner = (s, borrowShare = 0.4) => {
  // a mayor spends what is in hand, plus a share of the credit line — not the lot
  let budget = s.finance.treasury + Math.max(0, s.finance.creditLimit - s.finance.debt) * borrowShare;
  return (cost) => { if (budget > cost) { budget -= cost; return true; } return false; };
};

// ── The control condition: nobody does anything ───────────────────────────────
export const doNothing = () => ({ patch: {}, intents: [] });

// ── The good mayor: patient, funded, in the right order ──────────────────────
export function charles(s, k) {
  const intents = [];
  const f = s.factory;
  const spend = planner(s, 0.25);
  const patch = {
    maintenanceLevel: 1.15,
    taxBusiness: 1.0, taxProperty: 1.0, fees: 1.0, rentLevel: 1.0,
    factoryWageLevel: 1.0, municipalWageLevel: 1.0,
    apprenticeTarget: 32,
    factoryStaffTarget: PARAMS.factory.staffStart,
    depositRate: 1.15,
  };
  // 1. cash in the warehouse and a few hands in the office: cheap, immediate
  if (f.rawStock > 20000) intents.push({ type: 'sellSurplus', units: 15000 });
  if (f.officeStaff < 12 && spend(60000)) intents.push({ type: 'hireManagement', units: 3 });
  // 2. the works: machines first, then quality, then reach
  if (f.modernizeLeft === 0 && f.machinery < 0.9 && k <= 4 && spend(900000)) intents.push({ type: 'modernize' });
  if (f.quality < 0.85 && k >= 1 && k <= 5 && spend(260000)) intents.push({ type: 'rnd' });
  if (k >= 4 && f.capacity < 30000 && f.quality > 0.7 && spend(3200000)) intents.push({ type: 'expandCapacity' });
  if ((k === 3 || k === 6) && spend(500000)) intents.push({ type: 'marketing' });
  // 3. the town: homes when the list grows, services when they fall behind
  if (s.housing.queue > 30 && spend(2700000)) intents.push({ type: 'buildHousing', units: k >= 4 ? 40 : 25 });
  if (s.utility.condition < 0.7 && k >= 2 && spend(1200000)) intents.push({ type: 'renewUtility' });
  if (s.transport.roads < 0.7 && k >= 3 && spend(900000)) intents.push({ type: 'repairRoads' });
  if (k >= 5 && s.transport.station < 0.7 && spend(600000)) intents.push({ type: 'improveStation' });
  if (k === 2) intents.push({ type: 'meetCouncil' });
  if (k >= 1 && s.unemploymentRate > 0.045 && spend(350000)) intents.push({ type: 'attractIndustry' });
  if (k === 1) intents.push({ type: 'audit' });
  if (k >= 6 && s.projectLog.audits < 2) intents.push({ type: 'auditFull' });
  if (k >= 5 && s.politics.petition) intents.push(s.finance.treasury > 900000 ? { type: 'acceptPetition' } : { type: 'declinePetition' });
  return { patch, intents };
}

// ── The bad mayor: high rates, amenities first, the works ignored ─────────────
export function mark(s, k) {
  const intents = [];
  const patch = {
    maintenanceLevel: 0.55,
    taxBusiness: 1.5, taxProperty: 1.4, fees: 1.3, rentLevel: 1.3,
    factoryWageLevel: 1.2, factoryStaffTarget: 520,
    apprenticeTarget: 10, municipalWageLevel: 1.15,
  };
  // the nice things, every session, while the works is left to decay
  const amenity = ['sports', 'library', 'parks', 'sports', 'library', 'youthCentre', 'sports'][k];
  if (amenity) intents.push({ type: 'buildFacility', facility: amenity });
  if (k >= 5) intents.push({ type: 'promoteTourism' });
  if (k === 2) intents.push({ type: 'replaceManagement', mode: 'coop' });
  if (k >= 1) intents.push({ type: 'takeLoan', units: 3000000 });      // living on credit, and then some
  return { patch, intents };
}

// ── Amenities first, works never ──────────────────────────────────────────────
export function recreationFirst(s, k) {
  const intents = [];
  const patch = { maintenanceLevel: 1.0, taxBusiness: 1.05, taxProperty: 1.05, factoryWageLevel: 1.05, apprenticeTarget: 14 };
  if (k === 0 && afford(s, 1500000)) intents.push({ type: 'buildFacility', facility: 'sports' });
  if (k === 1 && afford(s, 300000)) intents.push({ type: 'buildFacility', facility: 'library' });
  if (k === 2 && afford(s, 380000)) intents.push({ type: 'buildFacility', facility: 'parks' });
  if (k === 3 && afford(s, 500000)) intents.push({ type: 'attractDoctor' });
  if (k === 4 && afford(s, 300000)) intents.push({ type: 'buildFacility', facility: 'youthCentre' });
  if (s.housing.queue > 70 && afford(s, 2000000)) intents.push({ type: 'buildHousing', units: 30 });
  return { patch, intents };
}

// ── Everything into the works, the town ignored ───────────────────────────────
export function factoryOnly(s, k) {
  const intents = [];
  const patch = { maintenanceLevel: 0.8, taxBusiness: 1.0, taxProperty: 1.0, apprenticeTarget: 20, factoryWageLevel: 1.0 };
  if (s.factory.machinery < 0.9 && k <= 4 && afford(s, 900000)) intents.push({ type: 'modernize' });
  if (s.factory.quality < 0.9 && afford(s, 260000)) intents.push({ type: 'rnd' });
  if (s.factory.capacity < 32000 && afford(s, 3200000)) intents.push({ type: 'expandCapacity' });
  if (k % 2 === 0 && afford(s, 500000)) intents.push({ type: 'marketing' });
  return { patch, intents };
}

// ── Prudent in everything — except the machinery (H-24's subject) ─────────────
export function neglectMachinery(s, k) {
  const intents = [];
  const patch = { maintenanceLevel: 1.2, taxBusiness: 1.0, taxProperty: 1.0, rentLevel: 0.95, apprenticeTarget: 40 };
  if (s.housing.queue > 30 && afford(s, 2700000)) intents.push({ type: 'buildHousing', units: 45 });
  if (k >= 1 && s.unemploymentRate > 0.05 && afford(s, 350000)) intents.push({ type: 'attractIndustry' });
  if (k === 3 && afford(s, 500000)) intents.push({ type: 'buildFacility', facility: 'kindergarten', units: 4 });
  if (k === 5 && afford(s, 500000)) intents.push({ type: 'attractDoctor' });
  if (k >= 2 && s.utility.condition < 0.7 && afford(s, 1200000)) intents.push({ type: 'renewUtility' });
  if (k >= 3 && s.transport.roads < 0.7 && afford(s, 900000)) intents.push({ type: 'repairRoads' });
  return { patch, intents };
}

// ── Squeeze the taxpayer ─────────────────────────────────────────────────────
export function taxGrab(s, k) {
  const intents = [];
  const patch = { taxBusiness: 2.2, taxProperty: 1.8, fees: 1.6, maintenanceLevel: 0.5, rentLevel: 1.4, apprenticeTarget: 8 };
  if (k === 3) intents.push({ type: 'repayDebt', amount: 500000 });
  return { patch, intents };
}

// ── The tourist trap ─────────────────────────────────────────────────────────
export function tourismSpam(s, k) {
  const intents = [];
  const patch = { maintenanceLevel: 1.0, taxBusiness: 1.0, tourismSubsidy: 0 };
  if (afford(s, 180000)) intents.push({ type: 'promoteTourism' });
  if (k <= 3 && afford(s, 900000)) intents.push({ type: 'buildFacility', facility: 'hotels' });
  if (k === 4 && afford(s, 900000)) intents.push({ type: 'buildFacility', facility: 'hotels' });
  return { patch, intents };
}

// ── Everything, in proportion: a sensible mayor with a moderate budget ───────
export function balanced(s, k) {
  const intents = [];
  const spend = planner(s, 0.20);
  const f = s.factory;
  const patch = { maintenanceLevel: 1.1, taxBusiness: 1.0, taxProperty: 1.0, rentLevel: 1.0, apprenticeTarget: 24, factoryWageLevel: 1.0 };
  // cash in the warehouse and a few office hands first — cheap, and they pay
  if (f.rawStock > 20000) intents.push({ type: 'sellSurplus', units: 15000 });
  if (f.officeStaff < 12 && spend(60000)) intents.push({ type: 'hireManagement', units: 3 });
  if (k === 0 && f.machinery < 0.9 && spend(900000)) intents.push({ type: 'modernize' });
  if (f.quality < 0.8 && k >= 1 && spend(260000)) intents.push({ type: 'rnd' });
  if (s.housing.queue > 50 && [2, 4, 6].includes(k) && spend(1700000)) intents.push({ type: 'buildHousing', units: 25 });
  if (s.unemploymentRate > 0.06 && k >= 1 && spend(350000)) intents.push({ type: 'attractIndustry' });
  if (k >= 2 && s.utility.condition < 0.7 && spend(1200000)) intents.push({ type: 'renewUtility' });
  if (k >= 3 && s.transport.roads < 0.7 && spend(900000)) intents.push({ type: 'repairRoads' });
  if (k === 2) intents.push({ type: 'meetCouncil' });
  return { patch, intents };
}

// ── A mayor who rolls dice ───────────────────────────────────────────────────
export function chaos(state, k) {
  const rnd = () => {
    state.rng = (state.rng + 0x6D2B79F5) | 0;
    let t = state.rng; t = Math.imul(t ^ (t >>> 15), t | 1); t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
  const pick = (arr) => arr[Math.floor(rnd() * arr.length)];
  const intents = [];
  const pool = ['modernize', 'rnd', 'marketing', 'expandCapacity', 'attractIndustry', 'promoteTourism', 'audit', 'attractDoctor', 'replaceManagement'];
  for (let i = 0; i < 2; i++) intents.push({ type: pick(pool), mode: 'manager' });
  if (rnd() < 0.5) intents.push({ type: 'buildHousing', units: 20 + Math.floor(rnd() * 60) });
  if (rnd() < 0.4) intents.push({ type: 'buildFacility', facility: pick(['sports', 'library', 'parks', 'kindergarten', 'elderlyHome', 'hotels', 'youthCentre']) });
  const patch = {
    taxBusiness: 0.8 + rnd() * 1.2, taxProperty: 0.8 + rnd() * 1.0, fees: 0.8 + rnd() * 0.8,
    maintenanceLevel: 0.5 + rnd() * 0.9, rentLevel: 0.85 + rnd() * 0.5,
    apprenticeTarget: Math.round(rnd() * 40),
  };
  return { patch, intents };
}

export const BOTS = { doNothing, charles, mark, recreationFirst, factoryOnly, neglectMachinery, taxGrab, tourismSpam, balanced, chaos };
