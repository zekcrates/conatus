// lohhausen/engine/game.js
// -----------------------------------------------------------------------------
// Game layer: the eight planning sessions, the catalogue of measures the mayor
// may order, the end-of-term assessment ("Amtsbilanz") and the detection of the
// decision patterns Dörner describes (recreation-first, pet project, repair
// service, neglect of the works, tax illusion, over-collection …).
//
// Plain ES module — used by the browser UI and by Node (tests/bots).
// -----------------------------------------------------------------------------

import {
  PARAMS, SESSIONS, MONTHS_PER_SESSION, TOTAL_MONTHS,
  initialState, step, applyIntent, intentCost, patchOrder, fmtDM, demandJustifiedStaff,
  cloneState, runMonths, addInbox, nextRandom,
} from './sim.js';

export { SESSIONS, MONTHS_PER_SESSION, TOTAL_MONTHS, initialState, patchOrder, fmtDM, PARAMS, demandJustifiedStaff, applyIntent, intentCost, cloneState, runMonths, step };

// -----------------------------------------------------------------------------
// The catalogue of measures. Costs are cited from the model; the "hint" texts
// are what the town clerk's office tells you — deliberately incomplete, and
// sometimes one-sided, exactly as the real mayors were briefed.            LoF p.19
// -----------------------------------------------------------------------------
// -----------------------------------------------------------------------------
// The measure catalogue, in the idiom of the original's "Fragen- und
// Maßnahmenkatalog" (operator's manual §9, transcribed by Funke 2010): the town's
// areas, and for each measure its investment, its duration ("Zeit") and what it
// changes. Costs and durations marked (M) are the manual's own figures; the rest
// are this reconstruction's [GAP] numbers (docs/FINDINGS.md §4).
//
// "policy" entries are standing settings the mayor fixes by number — the original
// likewise took absolute or differential values (e.g. "der Lohn der ungelernten
// Arbeiter soll auf 1.800 festgesetzt werden"). They stay as you set them.
// -----------------------------------------------------------------------------
export const SECTORS = [
  { key: 'wohnen', name: 'Housing', gloss: 'building & housing' },
  { key: 'steuern', name: 'Taxes', gloss: 'taxation' },
  { key: 'fabrik', name: 'The factory', gloss: 'the works' },
  { key: 'schule', name: 'School', gloss: 'schools' },
  { key: 'kiga', name: 'Nursery', gloss: 'kindergartens' },
  { key: 'freizeit', name: 'Leisure', gloss: 'leisure' },
  { key: 'fremdenverkehr', name: 'Tourists', gloss: 'tourism' },
  { key: 'gesundheit', name: 'Doctors', gloss: 'health' },
  { key: 'sozial', name: 'Care & services', gloss: 'public services & welfare' },
  { key: 'verwaltung', name: 'Town hall', gloss: 'the town hall' },
  { key: 'info', name: 'Ask & look', gloss: 'asking and looking — check before you decide' },
  { key: 'bank', name: 'The bank', gloss: 'the town savings bank' },
  { key: 'versorgung', name: 'Power, water & rubbish', gloss: 'the town’s own works' },
  { key: 'verkehr', name: 'Roads & buses', gloss: 'roads, post and railway' },
  { key: 'politik', name: 'The council', gloss: 'politics' },
];

export const MEASURES = {
  // ── Housing ───────────────────────────────────────────────────────────────
  buildHousing: {
    sector: 'wohnen', kind: 'intent', type: 'buildHousing', label: 'Build homes',
    invest: '68,000 DM each', time: 'takes 1½ years', effect: 'Dwellings built by the town.',
    hint: 'Built and let by the town.',
    intent: 'housing', units: true, unitsLabel: 'homes',
  },
  renovate: {
    sector: 'wohnen', kind: 'intent', type: 'renovate', label: 'Do up old homes',
    invest: '21,000 DM each', time: 'at once', effect: 'Older dwellings repaired.',
    intent: 'housing', units: true, unitsLabel: 'homes',
  },
  rentLevel: {
    sector: 'wohnen', kind: 'policy', field: 'rentLevel', label: 'Rent for town flats', unit: '× normal rent',
    min: 0.6, max: 1.8, step: 0.05,
    hint: 'The rent the town charges for its own flats.',
  },
  rentSubsidy: {
    sector: 'wohnen', kind: 'policy', field: 'rentSubsidy', label: 'Help with rent', unit: 'DM/month',
    min: 0, max: 600000, step: 25000,
    hint: 'Part of the rent, paid by the town.',
  },

  // ── Taxes ─────────────────────────────────────────────────────────────────
  taxBusiness: {
    sector: 'steuern', kind: 'policy', field: 'taxBusiness', label: 'Tax on company profits', unit: '× normal',
    min: 0.5, max: 2.5, step: 0.05,
    hint: 'A surcharge on the profits of local firms.',
  },
  taxProperty: {
    sector: 'steuern', kind: 'policy', field: 'taxProperty', label: 'Tax on homes', unit: '× normal',
    min: 0.5, max: 2.5, step: 0.05,
    hint: 'A charge on every dwelling in the town.',
  },
  fees: {
    sector: 'steuern', kind: 'policy', field: 'fees', label: 'Fees (pool, nursery, permits)', unit: '× normal',
    min: 0.5, max: 2.0, step: 0.05,
    hint: 'Charges for the pool, the nursery and permits.',
  },

  // ── The factory ───────────────────────────────────────────────────────────
  modernize: {
    sector: 'fabrik', kind: 'intent', type: 'modernize', label: 'Renew the factory machines',
    invest: '900,000 DM', time: 'takes 1 year', effect: 'The machines are replaced over a year.',
    hint: 'Carried out by the plant’s own engineers.',
    intent: 'factory',
  },
  rnd: {
    sector: 'fabrik', kind: 'intent', type: 'rnd', label: 'Improve the product',
    invest: '260,000 DM', time: 'at once', effect: 'Better materials and design.',
    intent: 'factory',
  },
  marketing: {
    sector: 'fabrik', kind: 'intent', type: 'marketing', label: 'Advertise the product',
    invest: '42,000 DM/month', time: 'runs 1 year', effect: 'Advertisements in the trade press, for one year.',
    intent: 'factory',
  },
  expandCapacity: {
    sector: 'fabrik', kind: 'intent', type: 'expandCapacity', label: 'Build a new factory hall',
    invest: '3.2 million DM', time: 'takes 1½ years', effect: 'A second hall: room for 6,000 more units a month.',
    intent: 'factory',
  },
  umschulung: {
    sector: 'fabrik', kind: 'intent', type: 'umschulung', label: 'Retrain workers for other jobs',
    invest: '2,000 DM per 10 people a month (M)', time: 'takes 2 years (M)', effect: 'Workers are retrained for other trades over two years. Charged in blocks of ten.',
    hint: 'Run by the labour office.',
    intent: 'factory', units: true, unitsLabel: 'people', unitStep: 10,
  },
  factoryWageLevel: {
    sector: 'fabrik', kind: 'policy', field: 'factoryWageLevel', label: 'Wages at the factory', unit: '× normal',
    min: 0.8, max: 1.4, step: 0.02,
    hint: 'What the works pays its people.',
  },
  factoryStaffTarget: {
    sector: 'fabrik', kind: 'policy', field: 'factoryStaffTarget', label: 'Workers at the factory', unit: 'workers',
    min: 260, max: 700, step: 10,
    hint: 'How many people the works employs.',
  },
  apprenticeTarget: {
    sector: 'fabrik', kind: 'policy', field: 'apprenticeTarget', label: 'Apprenticeships', unit: 'places',
    min: 0, max: 60, step: 2,
    hint: 'Training places at the works.',
  },
  replaceManagement: {
    sector: 'fabrik', kind: 'intent', type: 'replaceManagement', label: 'Replace the factory managers',
    invest: '180,000 DM', time: 'at once', effect: 'The present managers are dismissed.',
    intent: 'factory', coop: true,
  },

  // ── School ────────────────────────────────────────────────────────────────
  schulneubau: {
    sector: 'schule', kind: 'intent', type: 'schulneubau', label: 'Build more classrooms',
    invest: '2 million DM (M)', time: 'takes 2 years (M)', effect: 'Room for 100 more children, and 8 more teachers on the payroll.',
    hint: 'Built for the town by contractors.',
    intent: 'facilities',
  },
  schulbuecherei: {
    sector: 'schule', kind: 'intent', type: 'schulbuecherei', label: 'Books and a librarian for the school',
    invest: '300,000 DM (M)', time: 'takes 1 year (M)', effect: 'A library for the school.',
    intent: 'facilities',
  },
  teacherLevel: {
    sector: 'schule', kind: 'staff', field: 'school', label: 'Teachers', unit: '× normal',
    min: 0.5, max: 1.5, step: 0.05,
    hint: 'Teachers on the town’s payroll.',
  },

  // ── Nursery ───────────────────────────────────────────────────────────────
  buildKindergarten: {
    sector: 'kiga', kind: 'facility', facility: 'kindergarten', label: 'Build a nursery',
    invest: '250,000 DM per 20 places (M)', time: 'takes 12 months', effect: '20 more places in a nursery.',
    intent: 'facilities', units: true, unitsLabel: 'buildings',
  },
  kigaStaff: {
    sector: 'kiga', kind: 'staff', field: 'kindergarten', label: 'Nursery staff', unit: '× normal',
    min: 0.5, max: 1.5, step: 0.05,
    hint: 'Staff for the nurseries.',
  },

  // ── Leisure ───────────────────────────────────────────────────────────────
  buildSports: {
    sector: 'freizeit', kind: 'facility', facility: 'sports', label: 'Build a pool and sports hall',
    invest: '1.5 million DM (M)', time: 'takes 16 months', effect: 'A hall and a covered pool.',
    hint: 'Built and run by the town.',
    intent: 'facilities', units: true, unitsLabel: 'units',
  },
  buildLibrary: {
    sector: 'freizeit', kind: 'facility', facility: 'library', label: 'Build a library',
    invest: '300,000 DM (M)', time: 'takes 10 months', effect: 'A town library.',
    intent: 'facilities', units: true, unitsLabel: 'units',
  },
  buildParks: {
    sector: 'freizeit', kind: 'facility', facility: 'parks', label: 'Lay out a park',
    invest: '380,000 DM', time: 'takes 10 months', effect: 'Trees, benches and paths.',
    intent: 'facilities', units: true, unitsLabel: 'units',
  },
  buildYouthCentre: {
    sector: 'freizeit', kind: 'facility', facility: 'youthCentre', label: 'Build a youth centre',
    invest: '300,000 DM (M)', time: 'takes 10 months', effect: 'A room, a workshop and a supervisor.',
    intent: 'facilities', units: true, unitsLabel: 'centres',
  },
  sportsStaff: {
    sector: 'freizeit', kind: 'staff', field: 'sports', label: 'Pool staff', unit: '× normal',
    min: 0.5, max: 1.5, step: 0.05, hint: 'Someone has to watch the water.',
  },

  // ── Tourists ──────────────────────────────────────────────────────────────
  buildHotel: {
    sector: 'fremdenverkehr', kind: 'facility', facility: 'hotels', label: 'Build hotel rooms',
    invest: '900,000 DM per 30 rooms', time: 'takes 14 months', effect: '30 beds for visitors. The season runs from May to October.',
    hint: 'Beds for visitors.',
    intent: 'facilities', units: true, unitsLabel: 'units of 30 rooms',
  },
  promoteTourism: {
    sector: 'fremdenverkehr', kind: 'intent', type: 'promoteTourism', label: 'Advertise the town to tourists',
    invest: '180,000 DM', time: 'one campaign', effect: 'Posters, brochures and a spa orchestra.',
    intent: 'economy',
  },

  // ── Doctors ───────────────────────────────────────────────────────────────
  attractDoctor: {
    sector: 'gesundheit', kind: 'intent', type: 'attractDoctor', label: 'Pay a doctor to move here',
    invest: '500,000 DM (M)', time: 'within a year', effect: 'One more practice in the town.',
    intent: 'facilities',
  },

  // ── Care & services ───────────────────────────────────────────────────────
  buildElderly: {
    sector: 'sozial', kind: 'facility', facility: 'elderlyHome', label: 'Build a care home',
    invest: '200,000 DM (M)', time: 'takes 12 months', effect: '20 places in a care home.',
    intent: 'facilities', units: true, unitsLabel: 'buildings',
  },
  elderlyStaff: {
    sector: 'sozial', kind: 'staff', field: 'elderlyHome', label: 'Care home staff', unit: '× normal',
    min: 0.5, max: 1.5, step: 0.05, hint: 'Care takes people. Beds without staff are beds nobody wants.',
  },
  maintenanceLevel: {
    sector: 'sozial', kind: 'policy', field: 'maintenanceLevel', label: 'Upkeep of buildings and parks', unit: '× needed',
    min: 0.2, max: 1.6, step: 0.05,
    hint: 'What is spent on keeping buildings and grounds in order.',
  },
  attractIndustry: {
    sector: 'sozial', kind: 'intent', type: 'attractIndustry', label: 'Pay a firm to open here',
    invest: '350,000 DM', time: 'opens in 16 months', effect: 'A workshop, and between 90 and 160 jobs.',
    intent: 'economy',
  },

  // ── Town hall ─────────────────────────────────────────────────────────────
  stadtbedienstete: {
    sector: 'verwaltung', kind: 'intent', type: 'stadtbedienstete', label: 'Hire more town workers',
    invest: '5,000 DM per job (M)', time: 'at once (M)', effect: 'Posts on the town payroll.',
    hint: 'Clerks, bin men, gardeners.',
    intent: 'finance', units: true, unitsLabel: 'jobs',
  },
  municipalWageLevel: {
    sector: 'verwaltung', kind: 'policy', field: 'municipalWageLevel', label: 'Pay for town staff', unit: '× normal',
    min: 0.9, max: 1.3, step: 0.02,
    hint: 'What the town pays its own staff.',
  },

  // ── Ask & look ────────────────────────────────────────────────────────────
  audit: {
    sector: 'info', kind: 'intent', type: 'audit', label: 'Have the factory machines checked',
    invest: '25,000 DM', time: 'a few weeks', effect: 'A written report on the machinery of the works.',
    intent: 'information',
  },
  auditFull: {
    sector: 'info', kind: 'intent', type: 'auditFull', label: 'Order a full report on the town',
    invest: '70,000 DM', time: 'a few weeks', effect: 'A written report on the works and the town.',
    intent: 'information',
  },

  // ── The bank ──────────────────────────────────────────────────────────────
  depositRate: {
    sector: 'bank', kind: 'policy', field: 'depositRate', label: 'Savings interest', unit: '× normal',
    min: 0.5, max: 2.0, step: 0.05,
    hint: 'The rate the town bank pays on savings.',
  },

  takeLoan: {
    sector: 'bank', kind: 'intent', type: 'takeLoan', label: 'Take a loan',
    invest: 'the sum you choose', time: 'the same month', effect: 'The bank advances the money; the debt and its interest grow.',
    hint: 'The town bank lends against its deposits.',
    intent: 'finance', units: true, unitsLabel: 'DM', unitsMoney: true, unitMin: 100000, unitMax: 3000000, unitStep: 100000,
  },
  repayDebt: {
    sector: 'bank', kind: 'intent', type: 'repayDebt', label: 'Repay debt',
    invest: 'the sum you choose', time: 'the same month', effect: 'The debt falls, and so does the money in hand.',
    hint: 'Paid from the money in hand.',
    intent: 'finance', units: true, unitsLabel: 'DM', unitsMoney: true, unitMin: 250000, unitMax: 5000000, unitStep: 250000,
  },

  // ── Power, water & rubbish ────────────────────────────────────────────────
  renewUtility: {
    sector: 'versorgung', kind: 'intent', type: 'renewUtility', label: 'Renew the mains and the depot',
    invest: '1.2 million DM', time: 'takes 1 year', effect: 'New pipes, a new depot, new lorries.',
    hint: 'The pipes, the depot and the lorries.',
    intent: 'facilities',
  },
  utilityStaff: {
    sector: 'versorgung', kind: 'staff', field: 'utilityStaff', label: 'Utility staff', unit: '× normal',
    min: 0.5, max: 1.5, step: 0.05,
    hint: 'Plumbers, electricians, bin men.',
  },
  utilityFees: {
    sector: 'versorgung', kind: 'policy', field: 'utilityFees', label: 'Water, power and bin fees', unit: '× normal',
    min: 0.6, max: 1.6, step: 0.05,
    hint: 'Charged to every household.',
  },

  // ── Roads & buses ─────────────────────────────────────────────────────────
  repairRoads: {
    sector: 'verkehr', kind: 'intent', type: 'repairRoads', label: 'Resurface the roads',
    invest: '900,000 DM', time: 'takes 8 months', effect: 'The roads are resurfaced.',
    hint: 'The town’s own road crews.',
    intent: 'facilities',
  },
  buses: {
    sector: 'verkehr', kind: 'policy', field: 'buses', label: 'Bus service', unit: '× normal',
    min: 0.5, max: 2.0, step: 0.05,
    hint: 'The timetable the town pays for.',
  },
  improveStation: {
    sector: 'verkehr', kind: 'intent', type: 'improveStation', label: 'Get the express to stop again',
    invest: '600,000 DM', time: 'takes 14 months', effect: 'Longer platforms and a waiting room.',
    intent: 'facilities',
  },

  // ── The council ───────────────────────────────────────────────────────────
  meetCouncil: {
    sector: 'politik', kind: 'intent', type: 'meetCouncil', label: 'Meet the council',
    invest: '25,000 DM', time: 'an evening', effect: 'A meeting with the council, and a reading of the three groups.',
    intent: 'information',
  },
  acceptPetition: {
    sector: 'politik', kind: 'intent', type: 'acceptPetition', label: 'Grant the council’s request',
    invest: 'see the request', time: 'at once', effect: 'The request is carried out.',
    intent: 'finance',
  },
  declinePetition: {
    sector: 'politik', kind: 'intent', type: 'declinePetition', label: 'Refuse the council’s request',
    invest: 'nothing', time: 'at once', effect: 'The request is turned down.',
    intent: 'finance',
  },
};

// The council's requests. Drawn at the end of each session from the town's own
// state, so they read like something a citizen would really ask for.
export const PETITION_POOL = [
  { id: 'potholes', faction: 'residents', ask: 'Resurface Bahnhofstrasse before the winter.', cost: 400000, spend: true, effect: 'potholes', when: (s) => s.transport.roads < 0.6 },
  { id: 'bins', faction: 'residents', ask: 'Put a second crew on the rubbish round.', cost: 220000, spend: true, when: (s) => s.utility.condition < 0.6 },
  { id: 'rents', faction: 'residents', ask: 'Hold the rents on the town flats where they are.', cost: 0, effect: 'rents', when: (s) => s.order.rentLevel > 1.05 },
  { id: 'tax', faction: 'business', ask: 'Bring the business rate back down towards the usual level.', cost: 0, effect: 'lowerBusinessTax', when: (s) => s.order.taxBusiness > 1.15 },
  { id: 'wages', faction: 'labour', ask: 'Raise the wages at the factory by five per cent.', cost: 0, effect: 'wageRise', when: (s) => s.factory.staff > 200 },
  { id: 'training', faction: 'labour', ask: 'Pay for thirty more apprenticeships at the works.', cost: 120000, spend: true, when: (s) => s.society.youthUnemployed > 0.25 },
  { id: 'pool', faction: 'residents', ask: 'Open the pool on Sundays again.', cost: 60000, spend: true, when: (s) => s.fac.sports.condition < 0.6 },
  { id: 'doctor', faction: 'residents', ask: 'Pay a second doctor to come to the town.', cost: 90000, spend: true, when: (s) => s.fac.health.doctors < 7 },
];

export function drawPetition(s) {
  const cands = PETITION_POOL.filter(p => !p.when || p.when(s));
  if (!cands.length) { s.politics.petition = null; return null; }
  const pick = cands[Math.floor(nextRandom(s) * cands.length) % cands.length];
  s.politics.petition = { ...pick, drawnAt: s.month };
  s.politics.petitionCount = (s.politics.petitionCount || 0) + 1;
  addInbox(s, 'complaint', 'Request from the council', pick.ask);
  return s.politics.petition;
}

export const MEASURE_GROUPS = SECTORS.map(s => s.key);

// -----------------------------------------------------------------------------
// Sessions
// -----------------------------------------------------------------------------
export function sessionStartMonth(session) { return session * MONTHS_PER_SESSION; }
export function isLastSession(s) { return s.session >= SESSIONS - 1; }

export function endSession(s, intents = []) {
  drawPetition(s);
  for (const it of intents) applyIntent(s, it);
  s.order.intents = [];
  const months = MONTHS_PER_SESSION;
  const events = [];
  for (let i = 0; i < months && s.month < TOTAL_MONTHS; i++) {
    const before = s.inbox.length;
    step(s);
    for (let k = before; k < s.inbox.length; k++) events.push(s.inbox[k]);
  }
  s.session += 1;
  return { events, session: s.session };
}

// -----------------------------------------------------------------------------
// The assessment: five headline tracks, judged on level AND steadiness,
// because the book judges Charles on trajectory, not on a single month.  LoF p.20
// -----------------------------------------------------------------------------
function clamp01(x) { return Math.min(1, Math.max(0, x)); }
function mean(a) { return a.length ? a.reduce((x, y) => x + y, 0) / a.length : 0; }
function std(a) { const m = mean(a); return Math.sqrt(mean(a.map(x => (x - m) ** 2))); }
const at = (s, m) => s.history[Math.min(s.history.length - 1, Math.max(0, m - 1))];

export function referenceProduction() {
  const f = PARAMS.factory;
  return f.capacityStart * (0.35 + 0.65 * f.machineryStart);
}

export function scoreGame(s) {
  const h = s.history;
  const start = h[0] ?? { production: referenceProduction(), satisfaction: 0.6, unemploymentRate: 0.077, capital: 0, debt: PARAMS.finance.debtStart, housingQueue: 55 };
  const end = h[h.length - 1];
  const last60 = h.slice(Math.max(0, h.length - 60));
  const first24 = h.slice(0, Math.min(24, h.length));
  const refProd = referenceProduction();

  const tracks = {};
  // 1. Finances: where the town stands, and whether it is heading up or down
  const debtRatio = end.debt / Math.max(1, s.finance.creditLimit);
  const netTrend = mean(last60.map(x => x.municipalNet)) - mean(first24.map(x => x.municipalNet));
  tracks.finances = Math.round(100 * clamp01(
    0.55 * clamp01(1 - debtRatio * 0.85) +
    0.25 * clamp01((end.capital - start.capital) / 1500000 + 0.5) +
    0.20 * clamp01(0.5 + netTrend / 400000) -
    (s.finance.collapse ? 0.25 : 0)));
  // 2. Economy: production level and trend (the works is the town)
  const prodTrend = mean(last60.map(x => x.production)) - mean(first24.map(x => x.production));
  tracks.economy = Math.round(100 * clamp01(
    0.5 * clamp01((end.production / refProd - 0.7) / 1.1) +
    0.5 * clamp01(0.5 + prodTrend / (0.6 * refProd))));
  // 3. Jobs
  const unempTrend = mean(last60.map(x => x.unemploymentRate)) - mean(first24.map(x => x.unemploymentRate));
  tracks.jobs = Math.round(100 * clamp01(
    0.65 * clamp01(1 - end.unemploymentRate / 0.15) +
    0.35 * clamp01(0.5 - unempTrend / 0.12)));
  // 4. Housing
  const queueStart = start.housingQueue ?? 55;
  tracks.housing = Math.round(100 * clamp01(
    0.7 * clamp01(1 - end.housingQueue / Math.max(60, queueStart * 1.2)) +
    0.3 * clamp01((end.dwellings - start.dwellings) / 250 + 0.5)));
  // 5. Satisfaction (and its steadiness — the "stability index", LoF fig.10)
  const satStd = std(last60.map(x => x.satisfaction));
  tracks.satisfaction = Math.round(100 * clamp01(
    0.6 * clamp01((end.satisfaction - 0.38) / 0.35) +
    0.25 * clamp01((end.satisfaction - start.satisfaction) / 0.15 + 0.5) +
    0.15 * clamp01(1 - satStd / 0.08)));

  const penalties = [];
  if (s.finance.collapse) penalties.push(['The treasury hit the credit wall; the town was put under supervision', 8]);
  if (end.production < 0.55 * refProd) penalties.push(['Production collapsed (below 55 % of the original level)', 6]);
  if (end.crime > 0.45) penalties.push(['Crime and youth trouble are now a fact of life', 5]);
  if (end.population < 0.92 * (start.population ?? 3700)) penalties.push(['More than 8 % of the population left town', 5]);
  if (end.housingQueue > 1.4 * Math.max(40, queueStart)) penalties.push(['The housing list grew while you governed', 4]);
  if (end.unemploymentRate > 0.12) penalties.push(['Unemployment exceeds 12 %', 6]);

  const weights = { finances: 0.24, economy: 0.24, jobs: 0.20, housing: 0.14, satisfaction: 0.18 };
  let composite = Object.entries(weights).reduce((a, [k, w]) => a + w * tracks[k], 0);
  composite -= penalties.reduce((a, [, p]) => a + p, 0);
  composite = Math.round(Math.max(0, Math.min(100, composite)));

  const grade = composite >= 78 ? 'A' : composite >= 66 ? 'B' : composite >= 54 ? 'C' : composite >= 40 ? 'D' : 'E';
  const archetype = classify(s, tracks, prodTrend, unempTrend, netTrend);

  return {
    tracks, penalties, composite, grade, archetype,
    headline: {
      capital: { start: start.capital, end: end.capital },
      unemployed: { start: Math.round((start.unemploymentRate ?? 0) * (start.population ?? 3700) * 0.7 * 0.7), end: end.unemployed, rateStart: start.unemploymentRate, rateEnd: end.unemploymentRate },
      production: { start: start.production, end: end.production },
      satisfaction: { start: start.satisfaction, end: end.satisfaction },
      housingQueue: { start: start.housingQueue, end: end.housingQueue },
      population: { start: start.population ?? 3700, end: end.population },
      debt: { start: start.debt, end: end.debt },
    },
    trends: { prodTrend, unempTrend, netTrend, satTrend: end.satisfaction - start.satisfaction },
  };
}

function classify(s, tracks, prodTrend, unempTrend, netTrend) {
  const revenueDown = netTrend < -30000;
  const lateUnemployment = s.history.length > 80 &&
    mean(s.history.slice(0, 80).map(x => x.unemploymentRate)) + 0.02 < mean(s.history.slice(80).map(x => x.unemploymentRate));
  if (tracks.finances >= 60 && tracks.economy >= 60 && tracks.jobs >= 55 && prodTrend > -500 && s.finance.collapse === false) {
    return { key: 'charles', name: 'The good mayor', blurb: 'Money and production held up, people had work, the waiting list came down. Nothing spectacular — just competent.' };
  }
  if (revenueDown && lateUnemployment) {
    return { key: 'mark', name: 'The bad mayor', blurb: 'Income slid for years, and unemployment only took off near the end — too late to fix.' };
  }
  if (s.finance.collapse) return { key: 'bankrupt', name: 'The bank took over', blurb: 'Your last years were spent under a supervisor’s cuts, not in government.' };
  if (prodTrend < -2000 && tracks.economy < 45) return { key: 'decline', name: 'Slow decline', blurb: 'Nothing dramatic. The factory lost orders, then the town lost people.' };
  return { key: 'mixed', name: 'A middling term', blurb: 'Some things improved, some slipped. Most terms end up here.' };
}

// -----------------------------------------------------------------------------
// Pattern detection — what did the mayor *do*? (LoF ch.1, 2, 6 and pp.19–27)
// -----------------------------------------------------------------------------
export function detectPatterns(s) {
  const out = [];
  const p = s.projectLog;
  const decisions = s.decisions;
  const total = Object.values(p.spendBySector).reduce((a, b) => a + b, 0) || 1;

  const early = decisions.filter(d => d.month < 30);
  const earlyAmenities = early.filter(d => d.type === 'buildFacility').reduce((a, d) => a + d.cost, 0);
  const earlyFactory = early.filter(d => ['modernize', 'rnd', 'marketing', 'expandCapacity'].includes(d.type)).reduce((a, d) => a + d.cost, 0);
  if (earlyAmenities > 1_000_000 && earlyAmenities > 2 * earlyFactory) {
    out.push({ key: 'recreation-first', title: 'You started with the nice things', text: 'Your first years went on pools, parks and libraries — before the factory and the money were put right. That is the wrong order to do things in.' });
  }
  if (p.modernisations === 0 && s.history[s.history.length - 1].machinery < 0.6) {
    out.push({ key: 'neglected-works', title: 'Nobody looked at the machines', text: 'You never touched the factory machines. A mayor can spend years asking the workers whether they are happy and never ask about the plant — which is the real reason it makes too little.' });
  }
  if (p.audits >= 2) out.push({ key: 'tested', title: 'You checked your ideas', text: `You ordered ${p.audits} check-up${p.audits > 1 ? 's' : ''} or report${p.audits > 1 ? 's' : ''}. Good mayors used them; bad ones trusted their own guesses.` });
  if (p.audits === 0 && decisions.length > 8) out.push({ key: 'no-audits', title: 'You believed your own guesses', text: 'You made one decision after another without checking anything. Believing something is not the same as knowing it.' });

  const taxRaised = s.order.taxBusiness > 1.2 || s.order.taxProperty > 1.2;
  if (taxRaised && s.history.length > 24) {
    const earlyIncome = mean(s.history.slice(0, 24).map(x => x.income));
    const lateIncome = mean(s.history.slice(-24).map(x => x.income));
    if (lateIncome < earlyIncome) out.push({ key: 'tax-illusion', title: 'Higher taxes, less money', text: `You raised the rate and the town's income fell from ${fmtDM(earlyIncome)} to ${fmtDM(lateIncome)} a month. Firms and shoppers left.` });
  }
  const tourismWaste = p.tourismSpends - (s.tourism.campaigns || []).reduce((a, c) => a + Math.min(c.recovered, c.cost), 0);
  if (p.tourismSpends > 0 && tourismWaste > 0.5 * p.tourismSpends) {
    out.push({ key: 'tourism', title: 'Tourism, with nothing behind it', text: 'You advertised the town when there were few spare workers and a thin season. One lucky summer is not a business plan: when the conditions change, the money stops.' });
  }
  const coop = p.managementChanges.find(c => c.mode === 'coop');
  if (coop) out.push({ key: 'management', title: 'The workers took over the factory', text: `In month ${coop.month} the managers were sacked and a workers’ co-operative took over. The result was an economic disaster.` });
  const sectors = Object.entries(p.spendBySector).sort((a, b) => b[1] - a[1]);
  if (sectors.length && sectors[0][1] > 0.62 * total && total > 1_500_000) {
    const names = { factory: 'the factory', housing: 'housing', facilities: 'pools, parks and libraries', economy: 'advertising and campaigns', information: 'checks and reports', finance: 'the bank account' };
    out.push({ key: 'pet-project', title: `One project ate the money: ${names[sectors[0][0]] || sectors[0][0]}`, text: 'Measuring the distance from every old person to every phone box is not government. Fixing one thing and forgetting the rest is a classic trap.' });
  }
  const reports = decisions.filter(d => ['audit', 'auditFull'].includes(d.type)).length;
  if (reports >= 5 && decisions.length < 22) out.push({ key: 'over-collection', title: 'You looked more than you decided', text: 'You collected a lot of information and made few decisions. Gathering too much leaves no time to decide.' });
  const complaints = s.inbox.filter(m => m.kind === 'complaint').length;
  const complaintsActedOn = decisions.filter(d => s.inbox.some(m => m.kind === 'complaint' && Math.abs(m.month - d.month) <= 2)).length;
  if (complaints >= 5 && complaintsActedOn / Math.max(1, complaints) > 0.5) {
    out.push({ key: 'repair-service', title: 'Repair service', text: 'Again and again, the loudest letter set your agenda. Without your own idea of what “well-being” means, the loudest voice wins.' });
  }
  const late = s.history.slice(-12);
  if (late.length && mean(late.map(x => x.municipalNet)) < -150000 && s.finance.debt > 14000000) {
    out.push({ key: 'debt-spiral', title: 'Living on borrowed money', text: 'Your last years were paid for by the bank. Repaying that debt crowds out everything else — the interest eats the upkeep.' });
  }
  const housingDecisions = decisions.filter(d => d.type === 'buildHousing').length;
  if (housingDecisions > 0 && s.history.length > 60) {
    const q = s.history;
    const earlyQueue = q[24]?.housingQueue ?? 0, lateQueue = q[q.length - 1].housingQueue;
    if (lateQueue > earlyQueue + 20) out.push({ key: 'housing-lag', title: 'Building while the list grew', text: 'New homes take a year and a half to build. The waiting list can grow for years even with the cranes up.' });
  }
  if (!out.length) out.push({ key: 'none', title: 'No clear pattern', text: 'Your term does not look like any of the classic patterns. That is not the same as doing well — read the five marks.' });
  return out;
}

// The teaching layer. The book's payoff is not a score but a reading of how you
// governed: what your measures *did* to the town, and which of the habits that
// separated its good mayors from its bad ones you showed.  LoF ch.1, 2, 6, 12.
// -----------------------------------------------------------------------------
const METRIC_OF = {
  modernize: ['machinery', 'how worn the machines are'],
  rnd: ['quality', 'product quality'],
  marketing: ['sales', 'what the factory sells'],
  expandCapacity: ['production', 'how much the factory makes'],
  buildHousing: ['housingQueue', 'families waiting for a home', -1],
  renovate: ['satisfactionFamilies', 'how families feel'],
  buildFacility: ['satisfaction', 'how people feel overall'],
  buildHotel: ['tourismRevenue', 'money from visitors'],
  promoteTourism: ['tourismRevenue', 'money from visitors'],
  attractIndustry: ['unemployed', 'people without work', -1],
  umschulung: ['unemployed', 'people without work', -1],
  schulbuecherei: ['satisfactionFamilies', 'how families feel'],
  schulneubau: ['satisfactionFamilies', 'how families feel'],
  stadtbedienstete: ['satisfaction', 'how people feel overall'],
  replaceManagement: ['factoryProfit', 'the factory’s profit'],
  audit: [null, null],
  auditFull: [null, null],
};
const fmtVal = (metric, v) => {
  if (metric === 'machinery' || metric === 'quality') return (v * 100).toFixed(0) + ' %';
  if (metric === 'factoryProfit' || metric === 'tourismRevenue') return fmtDM(v);
  if (metric === 'housingQueue' || metric === 'unemployed') return Math.round(v) + '';
  return (v * 100).toFixed(0) + ' %';
};

// What followed each order, in the town's own numbers. It says what moved, not
// what caused it — the town also moves on its own.
export function eventStudy(s) {
  const h = s.history;
  const lines = [];
  const seen = {};
  for (const d of s.decisions) {
    if (!METRIC_OF[d.type] || !METRIC_OF[d.type][0]) continue;
    const [metric, label, sign = 1] = METRIC_OF[d.type];
    if (seen[metric] && seen[metric] > 2) continue;
    seen[metric] = (seen[metric] || 0) + 1;
    const before = h.filter(r => r.month <= d.month && r.month > d.month - 12).map(r => r[metric]);
    const after = h.filter(r => r.month > d.month && r.month <= d.month + 24).map(r => r[metric]);
    if (before.length < 4 || after.length < 4) continue;
    const b = before.reduce((a, x) => a + x, 0) / before.length;
    const a = after.reduce((a, x) => a + x, 0) / after.length;
    const move = (a - b) * sign;
    const rel = Math.abs(b) > 1e-9 ? move / Math.abs(b) : 0;
    if (Math.abs(rel) < 0.02) { lines.push({ month: d.month, good: null, text: `In month ${d.month} you ordered ${d.type}. ${label[0].toUpperCase() + label.slice(1)} did not really change over the next two years.` }); continue; }
    lines.push({
      month: d.month,
      good: move > 0,
      text: `In month ${d.month} you ordered ${d.type}. Over the next two years, ${label} averaged ${fmtVal(metric, a, s)} — against ${fmtVal(metric, b, s)} in the year before, a ${(a - b) >= 0 ? 'rise' : 'fall'} of about ${(Math.abs(rel) * 100).toFixed(0)} %.`,
    });
  }
  return lines;
}

// The habits the book found in its good mayors, scored from your own decisions.
export function teach(s, score, patterns, behaviour) {
  const checks = [];
  const p = s.projectLog;
  const end = s.history[s.history.length - 1];

  checks.push({
    key: 'tested',
    ok: p.audits >= 2,
    title: 'You checked your ideas',
    good: `You ordered ${p.audits} checks or reports. Good mayors looked things up; bad ones believed what they already thought.`,
    bad: p.audits === 0
      ? 'You never checked anything. Believing your own guesses is how a mayor never finds out why the factory is slow.'
      : 'You checked something once. Good mayors did it again and again.',
  });
  const sectorsUsed = Object.entries(p.spendBySector).filter(([, v]) => v > 0).length;
  const investedAnything = Object.values(p.spendBySector).some(v => v > 0);
  checks.push({
    key: 'multi',
    ok: sectorsUsed >= 3,
    title: 'You did not put all your money in one place',
    good: `You spent money in ${sectorsUsed} different areas. Good mayors attacked a problem from several sides at once.`,
    bad: investedAnything
      ? `You spent money in only ${sectorsUsed} area(s). Doing one thing at a time is what the bad mayors did.`
      : 'You invested in nothing at all: no new machines, no homes, no repairs. The town simply wore out.',
  });
  const totalSpend = Object.values(p.spendBySector).reduce((a, b) => a + b, 0);
  const topShare = totalSpend > 0 ? Math.max(...Object.values(p.spendBySector)) / totalSpend : 0;
  checks.push({
    key: 'pet',
    ok: totalSpend < 1500000 || topShare < 0.62,
    title: 'You did not disappear into one project',
    good: 'No single area took most of your money. You kept several goals going.',
    bad: `One area took ${(topShare * 100).toFixed(0)} % of everything you spent. Counting the distance from every old person to every phone box is not government — and the town is lost while you plan it.`,
  });
  checks.push({
    key: 'works',
    ok: (p.spendBySector.factory || 0) > 0 && end.machinery >= 0.6,
    title: 'You looked after the factory',
    good: `The machines ended at ${(end.machinery * 100).toFixed(0)} %. You spent money on the thing that pays for everything else.`,
    bad: `The machines ended at ${(end.machinery * 100).toFixed(0)} %. The factory pays for everything else, and the bad mayors only noticed it late, if at all.`,
  });
  checks.push({
    key: 'maintenance',
    ok: s.order.maintenanceLevel >= 0.9,
    title: 'You kept the town up',
    good: `Upkeep stood at ${s.order.maintenanceLevel.toFixed(2)} × what is needed. Buildings were looked after instead of run down.`,
    bad: `Upkeep stood at ${s.order.maintenanceLevel.toFixed(2)} × what is needed. Neglect is invisible for years — and then it is the first thing people see.`,
  });
  const complaints = s.inbox.filter(m => m.kind === 'complaint').length;
  const reactive = s.decisions.filter(d => s.inbox.some(m => m.kind === 'complaint' && Math.abs(m.month - d.month) <= 2)).length;
  checks.push({
    key: 'repair',
    ok: !(complaints >= 5 && reactive / Math.max(1, complaints) > 0.5),
    title: 'You set your own agenda',
    good: 'You did not simply answer the loudest letter. “The well-being of the citizens” has to be broken into parts, or a mayor becomes a repair service.',
    bad: `${reactive} of your orders came within two months of a complaint letter. Fixing whatever shouts is repair service, not government.`,
  });
  const taxRaised = s.order.taxBusiness > 1.2 || s.order.taxProperty > 1.2;
  if (taxRaised && s.history.length > 36) {
    const early = mean(s.history.slice(0, 24).map(x => x.income));
    const late = mean(s.history.slice(-24).map(x => x.income));
    checks.push({
      key: 'tax',
      ok: late >= early,
      title: 'Your tax rise brought money in',
      good: `You raised the rates and the town's income held: ${fmtDM(early)} to ${fmtDM(late)} a month.`,
      bad: `You raised the rates and the town's income fell from ${fmtDM(early)} to ${fmtDM(late)} a month. People and firms moved away instead.`,
    });
  }

  const sessionStats = (behaviour && behaviour.sessions) || [];
  const questions = sessionStats.reduce((a, x) => a + (x.enquiries || 0), 0);
  const decisions = s.decisions.length;
  const perSession = sessionStats.map(x => `S${x.session}: ${x.enquiries || 0} questions / ${x.decisions || 0} orders`).join(' · ');

  const failed = checks.filter(c => !c.ok);
  const advice = [];
  if (failed.some(c => c.key === 'tested')) advice.push('Next time: order a check-up in your first session and another later. A report costs 25,000 DM; being wrong costs ten years.');
  if (failed.some(c => c.key === 'works')) advice.push('The factory pays for everything else. Look at the machines early — 900,000 DM feels like far too much until it is too late.');
  if (failed.some(c => c.key === 'pet')) advice.push('Spread your money over several areas. The town is not one problem; it is many, tied together.');
  if (failed.some(c => c.key === 'maintenance')) advice.push('Keep upkeep at 1.0 ×. Rot is cheap to prevent and expensive to repair.');
  if (failed.some(c => c.key === 'tax')) advice.push('If you need money, grow the town — jobs, homes, the factory — instead of raising the rate.');
  if (failed.some(c => c.key === 'repair')) advice.push('Decide what “well-being” means before the letters arrive, or the loudest complaint will set your agenda.');
  if (!advice.length) advice.push('You governed the way a good mayor does: you checked your ideas, spread your measures, kept the factory and the town going, and did not mistake the loudest problem for the biggest one.');

  return { checks, advice, questions, decisions, perSession, patterns };
}

// The advisors' notes: what to look at now, in plain words. At most four, the
// urgent ones first, each pointing at the place that fixes it.
export function advisorNotes(s) {
  const notes = [];
  const h = s.history[s.history.length - 1] || {};
  const afterFirstYear = (h.month || 0) >= 12;
  const homes = Math.round(s.housing.queue);
  const un = s.unemploymentRate;
  const mach = s.factory.machinery;
  const ref = referenceProduction();
  const net = h.municipalNet ?? 0;
  const winter = s.tourism.season != null && s.tourism.season < 0.4;

  // the opening state the manual describes: a warehouse full of material bought
  // years ago, and an office that is far too thin for the job
  if (s.factory.rawStock > 20000 && !(s.projectLog.surplusSales > 0)) {
    notes.push({
      level: 'watch',
      title: Math.round(s.factory.rawStock / 1000) + ' k units of raw material sit in the warehouse',
      text: 'Bought at 48 DM when the price is 50. It sells at 40 DM a unit.',
      action: { kind: 'sector', key: 'fabrik', label: 'The factory' },
    });
  }
  if ((s.factory.officeStaff || 6) < 10) {
    notes.push({
      level: 'watch', title: 'The factory office is thin',
      text: 'Technical, advertising and personnel work: six posts in all.',
      action: { kind: 'sector', key: 'fabrik', label: 'The factory' },
    });
  }
  if (s.projectLog.audits === 0 && mach < 0.8) {
    notes.push({
      level: 'urgent', title: 'You have never checked the factory machines',
      text: 'The factory makes less than it should. A check-up costs 25,000 DM and tells you whether the machines are the reason.',
      action: { kind: 'sector', key: 'info', label: 'Have them checked' },
    });
  } else if (mach < 0.55) {
    notes.push({
      level: 'urgent', title: 'The factory machines are worn out',
      text: `They are at ${(mach * 100).toFixed(0)} % and get worse every month they run. Renewing them costs 900,000 DM and takes a year.`,
      action: { kind: 'sector', key: 'fabrik', label: 'The factory' },
    });
  }
  if (homes > 45) {
    notes.push({
      level: homes > 80 ? 'urgent' : 'watch', title: `${homes} families are waiting for a home`,
      text: 'A dwelling ordered today is keys in eighteen months.',
      action: { kind: 'sector', key: 'wohnen', label: 'Housing' },
    });
  }
  if (un > 0.055) {
    notes.push({
      level: un > 0.09 ? 'urgent' : 'watch', title: `${Math.round(s.employ.unemployed)} people have no work`,
      text: 'Jobs are at the factory, in shops and services, and on the training schemes.',
      action: { kind: 'sector', key: 'fabrik', label: 'The factory' },
    });
  } else if (s.society.youthUnemployed > 0.3) {
    notes.push({
      level: 'watch', title: `${(s.society.youthUnemployed * 100).toFixed(0)} % of young people have no work or training`,
      text: 'Unemployed young people refuse retraining places.',
      action: { kind: 'sector', key: 'fabrik', label: 'The factory' },
    });
  }
  if (afterFirstYear && net < -20000) {
    notes.push({
      level: net < -120000 ? 'urgent' : 'watch', title: `The town is losing ${fmtDM(-net)} a month`,
      text: 'The bank covers the difference. It will lend up to its limit.',
      action: { kind: 'sector', key: 'steuern', label: 'Taxes' },
    });
  }
  if (s.tourism.rooms > 45 && winter) {
    notes.push({
      level: 'watch', title: 'The tourist season is over',
      text: `${s.tourism.rooms} hotel beds; the season runs from May to October.`,
      action: { kind: 'sector', key: 'fremdenverkehr', label: 'Tourists' },
    });
  }
  const order = { urgent: 0, watch: 1, good: 2 };
  notes.sort((a, b) => order[a.level] - order[b.level]);
  if (!notes.length) {
    notes.push({
      level: 'good', title: 'Nothing is on fire',
      text: 'The five headline numbers look healthy. Keep the machines running, the waiting list short and the bank balance positive.',
      action: { kind: 'chart', key: 'production', label: 'The factory' },
    });
  }
  return notes.slice(0, 4);
}

// What moved in the months just run, and which of your orders it followed.
export function sessionRecap(s, fromMonth, orders) {
  const h = s.history;
  const before = h.filter(r => r.month <= fromMonth).pop() || h[0];
  const after = h[h.length - 1];
  const d = (a, b) => (b == null || a == null) ? null : b - a;
  const signed = (x) => (x >= 0 ? '+' : '−') + Math.abs(Math.round(x));
  const pct = (a, b) => (!a ? '—' : signed(((b - a) / Math.abs(a)) * 100) + ' %');
  const feel = (after.satisfactionWorkers + after.satisfactionFamilies + after.satisfactionElderly) / 3;
  const feelBefore = (before.satisfactionWorkers + before.satisfactionFamilies + before.satisfactionElderly) / 3;
  const tiles = [
    { label: 'The factory', value: fmtDM(after.factoryRevenue || 0), change: pct(before.factoryRevenue, after.factoryRevenue), up: after.factoryRevenue >= (before.factoryRevenue || 0), note: 'earned last month' },
    { label: 'No work', value: String(Math.round(after.unemployed)), change: signed(d(before.unemployed, after.unemployed)), up: (d(before.unemployed, after.unemployed) || 0) <= 0, note: 'people' },
    { label: 'Waiting for a home', value: String(Math.round(after.housingQueue)), change: signed(d(before.housingQueue, after.housingQueue)), up: (d(before.housingQueue, after.housingQueue) || 0) <= 0, note: 'families' },
    { label: 'In the bank', value: fmtDM(after.capital), change: fmtDM(d(before.capital, after.capital)), up: (d(before.capital, after.capital) || 0) >= 0, note: `owed ${fmtDM(after.debt)}` },
  ];
  const lines = tiles.map(t => `${t.label}: ${t.value} (${t.change})`);

  const said = (orders || []).map(o => o.label || o.type);
  const notes = [];
  if (!said.length) notes.push('You ordered nothing.');
  const ordered = (orders || []).map(o => ({ label: o.label || o.type, units: o.units || null, cost: o.cost || 0 }));
  if (d(before.factoryRevenue, after.factoryRevenue) < -40000) notes.push('The factory earned less than in the months before.');
  if (d(before.unemployed, after.unemployed) > 25) notes.push('More people lost their jobs.');
  if (d(before.housingQueue, after.housingQueue) > 10) notes.push('The waiting list for homes grew. New homes take a year and a half to build.');
  if (d(before.debt, after.debt) > 800000) notes.push(`The town borrowed ${fmtDM(d(before.debt, after.debt))} more.`);
  if (after.machinery < 0.6 && (orders || []).every(o => o.type !== 'modernize')) notes.push('The machines wore further.' + (s.projectLog.audits ? '' : ' Nobody has inspected them.'));
  return { lines, tiles, ordered, notes };
}

// The end-of-term report.
export function buildReport(s, behaviour) {
  const score = scoreGame(s);
  const patterns = detectPatterns(s);
  const end = s.history[s.history.length - 1];
  const lines = [];
  lines.push(`After ten years, Lohhausen has ${Math.round(end.population)} people (it began with 3,700).`);
  lines.push(`The factory employs ${Math.round(end.staff)} people and ${end.factoryProfit >= 0 ? 'made' : 'lost'} ${fmtDM(Math.abs(end.factoryProfit))} last month. ${Math.round(s.employ.unemployed)} people have no work (${(end.unemploymentRate * 100).toFixed(1)} %).`);
  lines.push(`The town has ${fmtDM(end.capital)} and owes ${fmtDM(end.debt)}.`);
  lines.push(`${Math.round(end.housingQueue)} families are still waiting for a home. On average, people are ${(end.satisfaction * 100).toFixed(0)} % happy.`);
  const study = eventStudy(s);
  const te = teach(s, score, patterns, behaviour);
  return { score, patterns, lines, study, teaching: te, headline: score.headline, archetype: score.archetype };
}

// What the clerk says at the start of each session.
export function sessionBriefing(s) {
  const end = s.history[s.history.length - 1];
  const f = s.factory;
  const items = [];
  const started = s.month > 0 && end;
  items.push({ who: 'Money', text: started
    ? `We have ${fmtDM(end.capital)} and we owe ${fmtDM(end.debt)}. Last month we ${end.municipalNet >= 0 ? 'took in' : 'lost'} ${fmtDM(Math.abs(end.municipalNet))}.`
    : `We have ${fmtDM(s.finance.treasury)} and we owe ${fmtDM(s.finance.debt)}. Most months we spend a little more than we take in.` });
  items.push({ who: 'The factory', text: started
    ? `It employs ${Math.round(f.staff)} people. Last month it earned ${fmtDM(end.factoryRevenue || 0)} and its costs were ${fmtDM((end.factoryRevenue || 0) - f.profit)}, so it ${f.profit >= 0 ? 'made' : 'lost'} ${fmtDM(Math.abs(f.profit))}.${f.breakdowns > 0 ? ` The machines stopped ${f.breakdowns} times this year.` : ''}`
    : `It employs ${Math.round(f.staff)} people and the machines are a year old. The problem is elsewhere: the office is thin and the warehouse is full of raw material bought years ago.` });
  items.push({ who: 'Jobs', text: started
    ? `${Math.round(s.employ.unemployed)} people have no work (${(end.unemploymentRate * 100).toFixed(1)} %). Among young people, ${(s.society.youthUnemployed * 100).toFixed(0)} %.`
    : `About ${Math.round(s.employ.unemployed)} people have no work.` });
  items.push({ who: 'Homes', text: `${Math.round(s.housing.queue)} families are waiting for a home.` });
  return { title: `Session ${s.session + 1}`, items };
}
function blurb(x) {   // kept for the report, which still reads the poll
  if (x == null) return 'no reading yet';
  if (x < 0.42) return 'say things are bad';
  if (x < 0.52) return 'are unhappy';
  if (x < 0.62) return 'are mixed';
  if (x < 0.72) return 'are content';
  return 'are pleased';
}
