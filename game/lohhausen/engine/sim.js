// lohhausen/engine/sim.js
// -----------------------------------------------------------------------------
// The Lohhausen model — a monthly-step simulation of a small town whose major
// employer is a municipally owned watch factory.
//
// Reconstruction of the microworld of Dörner, Kreuzig, Reither & Stäudel (1983),
// described in English as the town "Greenvale" in The Logic of Failure (1996).
// Structural rules are cited; every number is a [GAP] calibration (docs/DESIGN.md §2)
// whose job is to reproduce the documented qualitative behaviours — the hypotheses
// in docs/FINDINGS.md.
//
// Plain ES module: runs in the browser and in Node (tests, sweeps). Deterministic
// given the seed (the whole RNG state lives in `state.rng`).
// -----------------------------------------------------------------------------

export const TOTAL_MONTHS = 120;      // "ten years … (or 120 months)"            LoF p.20
export const SESSIONS = 8;            // "over the course of eight sessions"      LoF p.21
export const MONTHS_PER_SESSION = TOTAL_MONTHS / SESSIONS; // 15

// -----------------------------------------------------------------------------
// PARAMETERS — all [GAP]. Money in DM (1981). Tuned so tests/hypotheses pass.
// -----------------------------------------------------------------------------
export const PARAMS = {
  pop: {
    start: { children: 810, adults: 2190, elderly: 700 },   // ≈3,700        LoF p.19
    birthMonthly: 0.0028,       // per adult household-forming share, scaled
    deathMonthly: { children: 0.00005, adults: 0.00028, elderly: 0.0045 },
    matureMonthly: 0.00062,     // children → adults
    retireMonthly: 0.00055,     // adults → elderly
    workforceShare: 0.70,       // of adults
    youthShare: 0.15,           // of the workforce
    migrationBase: 0.0028,      // gross monthly rate at neutral pull
    migrationMax: 0.0042,
  },
  factory: {                    // municipally owned                              LoF p.19
    capacityStart: 2800,        // watches/month — the manual's final inspection checks ~1 watch an hour
    machineryStart: 0.9,        // manual 9.5: the machines are only a year old — they wear out if nobody watches them               LoF p.92
    machineryDecay: 0.0022,     // per month × utilisation factor
    machineryFloor: 0.15,
    qualityStart: 0.58,
    qualityDecay: 0.0025,
    staffStart: 420,
    apprenticeStart: 12,
    workersPer1kUnits: 150,     // workers per 1,000 units of monthly capacity (420 workers for 2,800 watches)
    staffDrift: 0.03,           // per month toward demand-justified level
    staffTolerance: 0.25,       // the player may over/under-man by ±25 %
    wageBase: 2350,             // DM/month
    price: 500,                 // DM per watch ex works (manual 9.5.2: 520 including 20 DM transport)
    materials: 50,              // DM per unit, the manual's purchase price (sold at 40)
    overhead: 130000,           // DM/month fixed
    domesticDemand: 720,        // watches/month inside the region
    exportDemand: 1890,         // watches/month at quality 0.5, cycle 1.0
    qualityDemandElasticity: 0.7,
    marketingBoost: 0.22,
    marketingCost: 42000,       // DM/month
    marketingMonths: 12,
    expansionUnits: 1000,
    expansionCost: 3200000,
    expansionLag: 18,
    modernizeCost: 900000,
    modernizeMonths: 12,
    modernizeGain: 0.25,        // machinery health recovered
    rndCost: 260000,
    rndQualityGain: 0.10,
    managementStart: 0.9,        // manual 9.5.12: the office (technical, advertising, personnel) is understaffed
    managementPerPost: 0.035,    // each extra post lifts it a little
    managementReplaceCost: 180000,
    managementReplaceRisk: 0.45, // chance the new management is worse  LoF p.69
    surplusSalePrice: 40,        // manual 9.5: surplus raw material sells at 40 DM a unit
    rawAlarm: 3000,              // manual 9.5.1: "Wenn Anzahl der Rohwaren 3.000, dann Abbruch" — the original's own alarm
    breakdownChance: 0.35,       // per month at machinery 0.5, scaling below
  },
  bank: {
    depositRateBase: 0.03,       // 3 % a year at rate 1.0
    depositSensitivity: 0.9,     // how much the rate moves savings
    lendRatio: 1.55,             // the bank can lend this many times what the town borrows
    capacityBase: 15_000_000,
  },
  utility: {
    conditionStart: 0.62,
    decay: 0.006,
    renewCost: 1_200_000, renewMonths: 12, renewGain: 0.30,   // manual 9.13: the town's own works
    outageChanceAt: 0.45,        // below this condition, breakdowns start
    outageCost: 90000,
    feesBase: 80000,             // DM/month at fee level 1.0 (covers the crews)
    staffCostPer: 45000,         // DM/month at staff level 1.0
    upkeepPer: 35000,            // DM/month at upkeep level 1.0
  },
  transport: {
    roadsStart: 0.58, roadDecay: 0.005,
    repairCost: 900_000, repairGain: 0.35, repairMonths: 8,
    busCostPerLevel: 42000,      // DM/month per × of service
    stationCost: 600_000, stationMonths: 14, stationGain: 0.30,
    commuterJobs: 34,            // jobs in the region reachable with good buses + roads
  },
  politics: {
    friction: 0.12,              // extra cost of measures when the council is hostile
    moodDrift: 0.06,
  },
  tourism: {
    // Manual 9.7.3: maximum overnight stays per day by month (Jan…Dec) for a
    // stock of hotel beds — "Januar bis April: 4, Mai: 30, Juli–August: 100,
    // September: 60, Oktober: 25, November: 4, Dezember: 10". June is not
    // listed in the transcription; interpolated. Normalised to mean 1. [GAP: June]
    seasonality: [4, 4, 4, 4, 30, 60, 100, 100, 60, 25, 4, 10],
  },
  otherEconomy: {
    jobsStart: 700,             // retail, bank, doctors, restaurants            LoF p.19
    spendingIndexBase: 3010000,  // wage bill (DM/month) that supports jobsStart
    wageBase: 2300,
    profitBase: 175000,         // DM/month taxable profit of local business
    tourismRoomsStart: 40,
    tourismRoomRevenue: 1150,   // DM/month per room at full occupancy (≈38 DM a night, bed and breakfast)
  },
  housing: {                    // construction AND rents are municipal          LoF p.19
    dwellingsStart: 1445,
    householdsPerCapita: 0.4055,
    qualityStart: 0.66,
    buildCost: 68000,
    buildLag: 18,               // the visible lag of construction
    socialBuildCost: 52000,
    renovateCost: 21000,
    renovateGain: 0.02,         // per dwelling as a share of stock
    rentBase: 210,              // DM/month per dwelling at level 1.0
    rentSubsidyPerUnit: 300000, // DM/month of subsidy ≈ 0.5 "rent level" relief
  },
  facilities: {
    conditionDecay: 0.008,      // per month at zero maintenance
    maintenanceNeedBase: 250000,// DM/month at maintenance level 1.0
    healthDoctorsStart: 6,
    healthNeedPerCapita: 0.0021,
    doctorCostPerMonth: 3600,   // municipal subsidy per doctor on top of practice income
    doctorSettleCost: 500000,   // manual 9.8: setting up a practice costs 500 k DM
    build: {
      kindergarten: { label: 'Nursery', buildCost: 250000, buildLag: 12, addedCapacity: 20, staffPer: 2, staffWage: 1900, opex: 3000 },   // manual 9.9: 250 k for 20 places
      school:       { label: 'School',       buildCost: 2400000, buildLag: 20, addedCapacity: 900, staffPer: 68, staffWage: 2600, opex: 26000 },
      sports:       { label: 'Sports hall & pool', buildCost: 1500000, buildLag: 16, addedCapacity: 1, staffPer: 6, staffWage: 1900, opex: 22000 },
      library:      { label: 'Library',      buildCost: 300000, buildLag: 10, addedCapacity: 1, staffPer: 4, staffWage: 1800, opex: 9000 },   // manual 9.6: 300 k
      youthCentre:  { label: 'Youth centre', buildCost: 300000, buildLag: 10, addedCapacity: 1, staffPer: 3, staffWage: 1900, opex: 7000 },   // manual 9.6: 300 k
      elderlyHome:  { label: 'Care home',    buildCost: 200000, buildLag: 12, addedCapacity: 20, staffPer: 4, staffWage: 2000, opex: 4000 },   // manual 9.10: 200 k
      parks:        { label: 'Park & promenade', buildCost: 380000, buildLag: 10, addedCapacity: 0, staffPer: 3, staffWage: 1800, opex: 6000 },
      hotels:       { label: 'Hotel rooms',  buildCost: 900000, buildLag: 14, addedCapacity: 30, staffPer: 8, staffWage: 1750, opex: 9000 },
    },
    need: {                     // capacity the town "should" have per inhabitant
      kindergarten: 0.100,      // places per capita (children need far more)
      school: 0.35,             // places per capita
      elderlyHome: 0.020,       // places per capita
      sports: 0.00035,          // facilities per capita
      library: 0.00030,
    },
  },
  finance: {
    treasuryStart: 720000,
    debtStart: 8400000,
    interestMonthly: 0.0062,    // ≈7.6 %/yr
    creditLimitBase: 15000000,
    creditLimitRevenueFactor: 1.0,
    taxBusinessBase: 175000,    // DM/month at rate 1.0
    taxPropertyBase: 95000,     // DM/month at rate 1.0
    // the wage tax, in the form the source uses: nobody below the threshold pays;
    // above it the rate rises with income and stops at a ceiling
    // (listing: "IF AR(K) > SYC(2) THEN D := SYC(5)*((AR(K)-SYC(2))/SYC(3)); G := SYC(1)+D; IF G > SYC(4) THEN G := SYC(4); G := G*AR(K)")
    wageTax: { min: 0.06, threshold: 12000, width: 24000, max: 0.34, progression: 0.20 },   // annual DM
    turnoverTax: 0.030,         // on the trades' revenue (manual UST(5)/(7): "Steuer (rh der Einnahmen)")
    energyPerHousehold: 21,     // DM/month × sqrt(aspiration)   (manual UST(2))
    disposalPerCapita: 7,       // DM/month × (income/1000)^0.4  (manual UST(4))
    feeIncomeBase: 120000,      // DM/month at fee level 1.0
    stateGrantPerCapita: 78,    // DM/month, scaled by reputation
    pensionsBase: 210000,       // DM/month: pensions and medical care, the price of owning everything
    welfarePerUnemployed: 700,  // DM/month municipal share
    municipalStaffStart: 175,
    municipalWage: 2300,
    collapseReputationHit: 0.22,
    businessFlightRate: 0.9,    // how fast firms react to tax rates / location
  },
  society: {
    // satisfaction = weighted sum of 0..1 components, per segment       LoF p.202 n.2
    weights: {
      workers:  { living: 0.30, job: 0.24, housing: 0.16, leisure: 0.10, health: 0.08, facilities: 0.06, taxes: 0.06 },
      families: { living: 0.26, housing: 0.18, school: 0.16, kind: 0.06, leisure: 0.14, safety: 0.12, facilities: 0.08 },
      elderly:  { living: 0.20, care: 0.22, safety: 0.18, health: 0.14, leisure: 0.12, housing: 0.08, facilities: 0.06 },
    },
    inertia: 0.30,              // monthly blend toward the computed value
    pollNoise: 0.035,           // sampling noise of the quarterly poll
    migrationResistance: 0.45,  // inertia of moving decisions (0 = none)
    delinquencyRise: 0.05,      // per month toward target when distressed
    delinquencyHeal: 0.035,
    crimeFromDelinquency: 0.55,
    reputationStart: 0.5,
    reputationSpeed: 0.06,
  },
  cycle: { start: 1.0, meanRevert: 0.09, noise: 0.028, min: 0.68, max: 1.20 },
  randomSeed: 1981,
};

// -----------------------------------------------------------------------------
// PRNG — mulberry32; state is a single integer, so runs are reproducible.
// -----------------------------------------------------------------------------
export function nextRandom(state) {
  state.rng = (state.rng + 0x6D2B79F5) | 0;
  let t = state.rng;
  t = Math.imul(t ^ (t >>> 15), t | 1);
  t ^= t + Math.imul(t ^ (t >>> 7), t | 61);
  return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
}
export function gauss(state) {
  const u = Math.max(1e-9, nextRandom(state));
  const v = nextRandom(state);
  return Math.sqrt(-2 * Math.log(u)) * Math.cos(2 * Math.PI * v);
}
const clamp = (x, lo, hi) => Math.min(hi, Math.max(lo, x));
export const lerp = (a, b, t) => a + (b - a) * clamp(t, 0, 1);

export function fmtDM(v) {
  const sign = v < 0 ? '−' : '';
  const a = Math.abs(v);
  if (a >= 1_000_000) return `${sign}${(a / 1_000_000).toFixed(1)} million DM`;
  return `${sign}${Math.round(a).toLocaleString('en')} DM`;
}
const fmtPct = (x) => `${(x * 100).toFixed(1)} %`;

// -----------------------------------------------------------------------------
//Artist initial state
// -----------------------------------------------------------------------------
export function initialState(seed = PARAMS.randomSeed) {
  const P = PARAMS;
  const s = {
    seed: seed >>> 0 || 1, rng: (seed >>> 0) || 1,
    month: 0, session: 0,
    order: defaultOrders(),
    pop: { ...P.pop.start },
    cycle: P.cycle.start,
    factory: {
      capacity: P.factory.capacityStart, machinery: P.factory.machineryStart,
      quality: P.factory.qualityStart, staff: P.factory.staffStart,
      apprentices: P.factory.apprenticeStart, management: P.factory.managementStart,
      marketingLeft: 0, modernizeLeft: 0, expansions: [],
      stock: 6000, output: 0, sales: 0, revenue: 0, profit: 0, wageBill: 0, breakdowns: 0,
      rawStock: 45000, rawPricePaid: 48,   // manual 9.5.3: bought on a special offer, never used up
    // 45,000 units ≈ 16 months of production — the overstock the manual tells the new mayor to run down
      officeStaff: 6,                      // manual 9.5.12: technical, advertising, personnel — all thin
    },
    other: { jobs: P.otherEconomy.jobsStart, wages: 0, profit: P.otherEconomy.profitBase, trainedPlaced: 0 },
    tourism: { rooms: P.otherEconomy.tourismRoomsStart, occupancy: 0.55, heat: 0, staffShortage: 0, revenue: 0, heatGain: 0, campaigns: [] },
    bank: { deposits: 9_500_000, depositRate: 1.0, loans: 0, depositTarget: 9_500_000, capacity: 15_000_000 },
    utility: { condition: 0.62, staffLevel: 1.0, fees: 1.0, lastOutage: null, outages: 0, renewLeft: 0 },
    transport: { roads: 0.58, buses: 1.0, station: 0.5, repairLeft: 0, stationWork: 0 },
    politics: { council: { business: 0.55, labour: 0.55, residents: 0.55 }, petition: null, granted: 0, refused: 0, met: 0 },
    housing: { dwellings: P.housing.dwellingsStart, quality: P.housing.qualityStart, rentLevel: 1.0, pipeline: [], queue: 0, completedThisMonth: 0 },
    fac: {},
    finance: {
      treasury: P.finance.treasuryStart, debt: P.finance.debtStart,
      taxBusiness: 1.0, taxProperty: 1.0, fees: 1.0, maintenanceLevel: 1.0,
      rentSubsidy: 0, tourismSubsidy: 0, industrySubsidy: 0,
      collapse: false, collapseMonth: null, writeOffs: 0,
      monthIncome: 0, monthSpend: 0, monthNet: 0, revenueLastYear: 0,
    },
    society: {
      delinquency: 0.10, crime: 0.05, reputation: P.society.reputationStart,
      satisfaction: { workers: 0.62, families: 0.58, elderly: 0.60 },
      reported: { workers: 0.62, families: 0.58, elderly: 0.60 },
      pollMonths: 0, youthUnemployed: 0,
    },
    employ: { workforce: 0, factoryJobs: 0, otherJobs: 0, municipalJobs: 0, unemployed: 0, apprentices: 0, youthWorkforce: 0, youthUnemployed: null },
    ledger: { income: {}, spend: {}, net: 0 },
    history: [], reports: [], inbox: [], decisions: [],
    projectLog: {
      housingBuilt: 0, renovations: 0, facilitiesBuilt: [], modernisations: 0, expansions: 0,
      rndSpends: 0, audits: 0, marketingSpends: 0, tourismSpends: 0, tourismWasted: 0,
      industryAttempts: 0, industryWins: 0, managementChanges: [], doctorsHired: 0,
      spendBySector: {}, monthsBySector: [],
    },
    pendingIndustry: null,
  };
  initFacilities(s);
  s.employ.factoryJobs = s.factory.staff;
  s.employ.otherJobs = s.other.jobs + (s.other.trainedPlaced || 0) + (s.transport.commuterJobs || 0);
  s.employ.municipalJobs = Math.round(P.finance.municipalStaffStart + Object.values(s.fac).reduce((a, fac) => a + (fac.staff || 0), 0));
  s.employ.apprentices = s.factory.apprentices;
  computeDerived(s);
  // the handover figures: what the town is doing on the day you take office
  s.factory.output = s.factory.capacity * (0.35 + 0.65 * s.factory.machinery);
  s.factory.sales = s.factory.output;
  s.factory.wageBill = s.factory.staff * P.factory.wageBase;
  s.factory.revenue = s.factory.output * P.factory.price * (0.85 + 0.30 * s.factory.quality);
  s.factory.profit = s.factory.revenue - s.factory.wageBill - s.factory.output * P.factory.materials - P.factory.overhead;
  s.finance.monthIncome = 0; s.finance.monthSpend = 0; s.finance.monthNet = 0;
  s.finance.creditLimit = P.finance.creditLimitBase + P.finance.taxBusinessBase * 12 * P.finance.creditLimitRevenueFactor;
  pushHistory(s);
  pushReport(s, {
    kind: 'intro', title: 'Lohhausen, and you are its mayor',
    lines: [
      `Lohhausen: about ${Math.round(s.pop.children + s.pop.adults + s.pop.elderly)} people in a hilly region. The watch factory belongs to the town and is its largest employer; there are shops, a bank, doctors, restaurants.`,
      'You hold office for ten years. Nobody can vote you out. Your brief is the well-being of the citizens — whatever you decide that means.',
      `Your eight planning sessions are the only times you can act. The town, meanwhile, does not wait. Residents now without work: ${Math.round(s.employ.unemployed)}. Households on the housing list: ${Math.round(s.housing.queue)}.`,
    ],
  });
  return s;
}

function initFacilities(s) {
  const P = PARAMS;
  s.fac.kindergarten = { capacity: 370, staff: 24, staffLevel: 1, condition: 0.70, buildLeft: 0, pendingCapacity: 0 };
  s.fac.school = { capacity: 900, staff: 60, staffLevel: 1, condition: 0.72, buildLeft: 0, pendingCapacity: 0 };
  s.fac.sports = { capacity: 1, staff: 6, staffLevel: 1, condition: 0.60, buildLeft: 0, pendingCapacity: 0 };
  s.fac.library = { capacity: 1, staff: 4, staffLevel: 1, condition: 0.70, buildLeft: 0, pendingCapacity: 0 };
  s.fac.elderlyHome = { capacity: 70, staff: 14, staffLevel: 1, condition: 0.66, buildLeft: 0, pendingCapacity: 0 };
  s.fac.parks = { condition: 0.70, buildLeft: 0, pendingCapacity: 0 };
  s.fac.youthCentre = { capacity: 0, staff: 0, staffLevel: 1, condition: 0.5, buildLeft: 0, pendingCapacity: 0, pendingStaff: 0 };
  s.fac.health = { doctors: P.facilities.healthDoctorsStart, condition: 0.75, doctorGap: 0 };
  s.fac.hotels = { capacity: 0, buildLeft: 0, pendingCapacity: 0 };
}

export function defaultOrders() {
  return {
    taxBusiness: 1.0, taxProperty: 1.0, fees: 1.0, rentLevel: 1.0,
    factoryWageLevel: 1.0, factoryStaffTarget: PARAMS.factory.staffStart,
    apprenticeTarget: PARAMS.factory.apprenticeStart,
    maintenanceLevel: 1.0,
    rentSubsidy: 0, tourismSubsidy: 0,
    depositRate: 1.0,          // savings interest, × the usual rate
    utilityFees: 1.0, utilityStaff: 1.0,
    buses: 1.0,                // bus service, × the usual timetable
    doctorTarget: PARAMS.facilities.healthDoctorsStart,
    staffLevels: { kindergarten: 1, school: 1, sports: 1, library: 1, elderlyHome: 1, hotels: 1, parks: 1 },
    intents: [],
  };
}

export function cloneState(s) { return JSON.parse(JSON.stringify(s)); }

export function patchOrder(s, patch) {
  s.order = { ...s.order, ...patch };
  if (patch.staffLevels) s.order.staffLevels = { ...s.order.staffLevels, ...patch.staffLevels };
  return s.order;
}

// -----------------------------------------------------------------------------
// Derived quantities
// -----------------------------------------------------------------------------
export function computeDerived(s) {
  const P = PARAMS;
  s.population = s.pop.children + s.pop.adults + s.pop.elderly;
  s.householdsNeeding = s.population * P.housing.householdsPerCapita;
  const queueTarget = Math.max(0, s.householdsNeeding - s.housing.dwellings);
  if (s.month === 0) s.housing.queue = queueTarget;
  else s.housing.queue = Math.max(0, s.housing.queue + (queueTarget - s.housing.queue) * 0.12);
  const e = s.employ;
  e.workforce = Math.round(s.pop.adults * P.pop.workforceShare);
  e.youthWorkforce = Math.round(e.workforce * P.pop.youthShare);
  e.unemployed = Math.max(0, e.workforce - e.factoryJobs - e.otherJobs - e.municipalJobs - e.apprentices);
  s.unemploymentRate = e.unemployed / Math.max(1, e.workforce);
  const doctorNeed = Math.max(1, s.population * P.facilities.healthNeedPerCapita);
  s.fac.health.doctorGap = clamp((doctorNeed - s.fac.health.doctors) / doctorNeed, 0, 1);
  return s;
}

export function demandJustifiedStaff(s) {
  // A watch factory needs workers to run the machines (capacity) and shifts them
  // by how full the order book is (utilisation). Bad machinery lowers output
  // but does not lower the manning of the lines.  [GAP, mirrors LoF p.92]
  const P = PARAMS;
  const appetite = clamp(1 + P.factory.qualityDemandElasticity * (s.factory.quality - 0.5), 0.4, 2.0);
  const demand = (P.factory.exportDemand * s.cycle + P.factory.domesticDemand * (0.85 + 0.3 * clamp(s.population / 3700, 0.7, 1.3))) * appetite * s.factory.management;
  const util = clamp(demand / Math.max(1, s.factory.capacity), 0.45, 1.05);
  return Math.max(40, Math.round(s.factory.capacity / 1000 * P.factory.workersPer1kUnits * util));
}
export function staffNeededForOutput(s) { return demandJustifiedStaff(s); }
export function unitCost(s) {
  const out = Math.max(1, s.factory.output);
  return (s.factory.wageBill + 0 + (s.month > 0 ? 0 : 0) + PARAMS.factory.materials * out + PARAMS.factory.overhead) / out;
}

// -----------------------------------------------------------------------------
// Intents — one-off orders, paid when filed; effects arrive with lags.
// -----------------------------------------------------------------------------
export function intentCost(s, intent) {
  const P = PARAMS;
  switch (intent.type) {
    case 'buildHousing': return (intent.units || 0) * (intent.social ? P.housing.socialBuildCost : P.housing.buildCost);
    case 'renovate': return (intent.units || 0) * P.housing.renovateCost;
    case 'buildFacility': return (P.facilities.build[intent.facility]?.buildCost ?? 0) * (intent.units || 1);
    case 'modernize': return P.factory.modernizeCost;
    case 'rnd': return P.factory.rndCost;
    case 'expandCapacity': return P.factory.expansionCost;
    case 'marketing': return P.factory.marketingCost * P.factory.marketingMonths;
    case 'audit': return 25000;
    case 'auditFull': return 70000;
    case 'replaceManagement': return P.factory.managementReplaceCost;
    case 'attractIndustry': return 350000;
    case 'attractDoctor': return PARAMS.facilities.doctorSettleCost;   // manual 9.8
    case 'sellSurplus': return 0;                                      // it earns money instead
    case 'takeLoan': return 0;                                         // the loan itself is the cash
    case 'repayDebt': return 0;                                       // the repayment is a balance-sheet move
    case 'hireManagement': return Math.max(1, intent.units || 1) * 15000;   // manual 9.5
    case 'schulbuecherei': return 300000;                      // manual 9.12.2
    case 'schulneubau': return 2000000;                        // manual 9.12.2 (100 children)
    case 'stadtbedienstete': return Math.max(1, intent.units || 1) * 5000;  // manual 9.13.2
    case 'umschulung': return Math.ceil(Math.max(1, intent.units || 10) / 10) * 2000 * 24;  // manual 9.12.1
    case 'promoteTourism': return 180000;
    case 'renewUtility': return PARAMS.utility.renewCost;
    case 'repairRoads': return PARAMS.transport.repairCost;
    case 'improveStation': return PARAMS.transport.stationCost;
    case 'meetCouncil': return 25000;
    case 'acceptPetition': return s.politics.petition ? (s.politics.petition.cost || 0) : 0;
    case 'declinePetition': return 0;
    case 'repayDebt': return Math.min(intent.amount || 0, s.finance.debt);
    default: return 0;
  }
}

export function applyIntent(s, intent) {
  const P = PARAMS;
  const cost = intentCost(s, intent);
  s.finance.treasury -= cost;
  const sector = intent.type === 'buildHousing' || intent.type === 'renovate' ? 'housing'
    : intent.type === 'buildFacility' ? 'facilities'
    : ['modernize', 'rnd', 'expandCapacity', 'marketing', 'replaceManagement'].includes(intent.type) ? 'factory'
    : ['attractIndustry', 'promoteTourism'].includes(intent.type) ? 'economy'
    : ['audit', 'auditFull'].includes(intent.type) ? 'information' : 'finance';
  s.projectLog.spendBySector[sector] = (s.projectLog.spendBySector[sector] || 0) + cost;
  s.decisions.push({ month: s.month, type: intent.type, cost, detail: { ...intent } });

  switch (intent.type) {
    case 'buildHousing': {
      const units = Math.max(1, Math.round(intent.units || 0));
      s.housing.pipeline.push({ units, monthsLeft: P.housing.buildLag, social: !!intent.social });
      return `Ordered ${units} dwellings (completion in ${P.housing.buildLag} months).`;
    }
    case 'renovate': {
      const units = Math.max(1, Math.round(intent.units || 0));
      s.projectLog.renovations += units;
      s.housing.quality = clamp(s.housing.quality + P.housing.renovateGain * (units / Math.max(1, s.housing.dwellings)) * 8, 0.15, 1);
      return `Renovating ${units} dwellings.`;
    }
    case 'buildFacility': {
      const def = P.facilities.build[intent.facility];
      if (!def) return 'No such facility.';
      const fac = s.fac[intent.facility];
      const units = Math.max(1, Math.round(intent.units || 1));
      fac.buildLeft = Math.max(fac.buildLeft, def.buildLag);
      fac.pendingCapacity = (fac.pendingCapacity || 0) + units * def.addedCapacity;
      fac.pendingStaff = (fac.pendingStaff || 0) + units * def.staffPer;
      s.projectLog.facilitiesBuilt.push({ facility: intent.facility, units, month: s.month });
      return `Construction started: ${def.label} (${def.buildLag} months).`;
    }
    case 'modernize':
      s.factory.modernizeLeft = P.factory.modernizeMonths;
      s.projectLog.modernisations += 1;
      return 'Modernisation programme ordered — the engineers will be at work for a year.';
    case 'rnd':
      s.projectLog.rndSpends += cost;
      s.factory.quality = clamp(s.factory.quality + P.factory.rndQualityGain, 0.1, 1);
      return 'Product development funded.';
    case 'expandCapacity':
      s.factory.expansions = s.factory.expansions || [];
      s.factory.expansions.push({ units: P.factory.expansionUnits, monthsLeft: P.factory.expansionLag });
      s.projectLog.expansions += 1;
      return `Factory extension ordered: room for more output, ready in ${P.factory.expansionLag} months.`;
    case 'marketing':
      s.factory.marketingLeft = P.factory.marketingMonths;
      s.projectLog.marketingSpends += cost;
      return 'Advertising campaign started.';
    case 'audit':
      s.projectLog.audits += 1;
      return `Engineering audit: machinery condition ${(s.factory.machinery * 100).toFixed(0)} % (falls ≈${(P.factory.machineryDecay * 120).toFixed(1)} points a year in use). Efficiency, order book and unit cost available in a full survey.`;
    case 'auditFull': {
      s.projectLog.audits += 1;
      const d = demandJustifiedStaff(s);
      return `Full survey: machinery ${(s.factory.machinery * 100).toFixed(0)} %, product quality ${(s.factory.quality * 100).toFixed(0)} %, unit cost ${unitCost(s).toFixed(2)} DM, headcount ${s.factory.staff} (orders justify ${d}), stock ${Math.round(s.factory.stock).toLocaleString('en')} units.`;
    }
    case 'replaceManagement': {
      const mode = intent.mode === 'coop' ? 'coop' : 'manager';
      s.projectLog.managementChanges.push({ month: s.month, mode });
      if (mode === 'coop') {
        s.factory.management = clamp(s.factory.management * 0.60, 0.2, 1.3);   // LoF p.69
        s.society.reputation = clamp(s.society.reputation - 0.12, 0, 1);
        return 'The managers are dismissed and the workers take over. Nobody quite knows how to run the order book, and customers notice.';
      }
      if (nextRandom(s) < P.factory.managementReplaceRisk) {
        s.factory.management = clamp(s.factory.management * 0.85, 0.2, 1.3);
        return 'New management installed — and it turns out to be no better than the old.';
      }
      s.factory.management = clamp(s.factory.management + 0.18, 0.2, 1.3);
      return 'New management installed; the order book finally gets some attention.';
    }
    case 'attractIndustry': {
      s.projectLog.industryAttempts += 1;
      const chance = clamp(0.18 + 0.5 * (1 - s.order.taxBusiness) + 0.35 * s.society.reputation + 0.3 * (s.unemploymentRate - 0.05), 0.05, 0.85);
      if (nextRandom(s) < chance) {
        s.pendingIndustry = { monthsLeft: 16, jobs: 90 + Math.round(nextRandom(s) * 70) };
        s.finance.industrySubsidy = (s.finance.industrySubsidy || 0) + 12000;
        s.projectLog.industryWins += 1;
        return 'A firm from outside accepts the package and will open a workshop — sixteen months of fitting out.';
      }
      return 'The subsidy package is outbid by another town. Nothing comes of it this time.';
    }
    case 'schulbuecherei': {
      s.fac.school.condition = clamp(s.fac.school.condition + 0.12, 0, 1);
      addInbox(s, 'build', 'School library opened', 'A school library with a librarian: the staff room is pleased, the parents more so.');
      return 'School library furnished (300,000 DM, one year of work by the staff).';
    }
    case 'schulneubau': {
      s.fac.school.buildLeft = 24;                             // 2 years  (manual 9.12.2)
      s.fac.school.pendingCapacity = (s.fac.school.pendingCapacity || 0) + 100;
      s.fac.school.pendingStaff = (s.fac.school.pendingStaff || 0) + 8;
      return 'School extension ordered: room for 100 more children after two years.';
    }
    case 'stadtbedienstete': {
      const n = Math.max(1, Math.round(intent.units || 1));
      s.finance.municipalStaff = (s.finance.municipalStaff || PARAMS.finance.municipalStaffStart) + n;
      return `${n} more town jobs created (5,000 DM each) — the town hall can keep up with its paperwork.`;
    }
    case 'umschulung': {
      const n = Math.max(1, Math.round(intent.units || 10));
      // Manual 9.12.1: unskilled workers ready, others only when unemployed,
      // and unemployed youths refuse outright.
      const youths = Math.round(n * 0.25 * clamp(s.society.youthUnemployed * 3, 0, 1));
      const rest = n - youths;
      const ready = Math.round(rest * (s.unemploymentRate > 0.02 ? 0.75 : 0.4));
      s.pendingRetraining = (s.pendingRetraining || []).concat([{ monthsLeft: 12, people: ready }]);
      if (youths > 0) addInbox(s, 'economy', 'The youths refuse', `${youths} of the unemployed young people will not go back to school for a trade. "Jugendliche weigern sich".`);
      return `Retraining ordered for ${n} people (2,000 DM per 10 people a month, two years). Of these, ${ready} are expected to take it up.`;
    }
    case 'renewUtility': {
      s.utility.renewLeft = PARAMS.utility.renewMonths;
      return 'The water mains, the depot and the lorries are being renewed — a year of digging and noise.';
    }
    case 'repairRoads': {
      s.transport.repairLeft = PARAMS.transport.repairMonths;
      return 'The roads are being resurfaced — eight months of diversions, and then no more potholes.';
    }
    case 'improveStation': {
      s.transport.stationWork = PARAMS.transport.stationMonths;
      return 'The railway is asked to lengthen the platforms and stop the express here again.';
    }
    case 'meetCouncil': {
      s.politics.met += 1;
      const c = s.politics.council;
      const word = (x) => x > 0.66 ? 'behind you' : x > 0.45 ? 'waiting to see' : 'against you';
      return `Council meeting. Business people ${word(c.business)} (${(c.business * 100).toFixed(0)} %) — `
        + `labour ${word(c.labour)} (${(c.labour * 100).toFixed(0)} %) — `
        + `residents ${word(c.residents)} (${(c.residents * 100).toFixed(0)} %).`;
    }
    case 'acceptPetition': {
      const p = s.politics.petition;
      if (!p) return 'There is no request waiting.';
      s.politics.granted += 1;
      const c = s.politics.council;
      c[p.faction] = clamp(c[p.faction] + 0.12, 0, 1);
      for (const other of Object.keys(c)) if (other !== p.faction) c[other] = clamp(c[other] - 0.02, 0, 1);
      if (p.spend) s.politics.petitionSpend = (s.politics.petitionSpend || 0) + (p.cost || 0);
      if (p.effect === 'lowerBusinessTax') s.order.taxBusiness = Math.max(0.6, s.order.taxBusiness - 0.1);
      if (p.effect === 'wageRise') s.order.factoryWageLevel = Math.min(1.4, s.order.factoryWageLevel + 0.05);
      if (p.effect === 'potholes') s.transport.repairLeft = Math.max(s.transport.repairLeft, 4);
      s.politics.petition = null;
      return 'The request is granted: ' + p.ask;
    }
    case 'declinePetition': {
      const p = s.politics.petition;
      if (!p) return 'There is no request waiting.';
      s.politics.refused += 1;
      s.politics.council[p.faction] = clamp(s.politics.council[p.faction] - 0.12, 0, 1);
      s.society.reputation = clamp(s.society.reputation - 0.01, 0, 1);
      s.politics.petition = null;
      return 'The request is refused: ' + p.ask;
    }
    case 'takeLoan': {
      const amount = Math.max(50000, Math.round(intent.units || 500000));
      s.finance.treasury += amount;
      s.finance.debt += amount;
      s.projectLog.loans = (s.projectLog.loans || 0) + amount;
      return 'The bank advances ' + fmtDM(amount) + '. The debt stands at ' + fmtDM(s.finance.debt)
        + ', and interest runs at 7.6 % a year.';
    }
    case 'repayDebt': {
      const amount = Math.min(Math.max(50000, Math.round(intent.units || 250000)), s.finance.debt, s.finance.treasury);
      s.finance.treasury -= amount;
      s.finance.debt -= amount;
      s.projectLog.repayments = (s.projectLog.repayments || 0) + amount;
      return 'Repaid ' + fmtDM(amount) + '. The debt stands at ' + fmtDM(s.finance.debt) + '.';
    }
    case 'sellSurplus': {
      const units = Math.min(s.factory.rawStock, Math.max(1000, Math.round(intent.units || 10000)));
      const loss = (s.factory.rawPricePaid - PARAMS.factory.surplusSalePrice) * units;
      s.factory.rawStock -= units;
      s.projectLog.surplusSales = (s.projectLog.surplusSales || 0) + units;
      s.finance.treasury += units * PARAMS.factory.surplusSalePrice;
      return units.toLocaleString('en') + ' units of surplus raw material sold at ' + PARAMS.factory.surplusSalePrice
        + ' DM — ' + fmtDM(loss) + ' below what they cost. The warehouse is lighter and the account '
        + fmtDM(units * PARAMS.factory.surplusSalePrice) + ' heavier.';
    }
    case 'hireManagement': {
      const n = Math.max(1, Math.round(intent.units || 1));
      s.factory.officeStaff += n;
      s.factory.management = clamp(s.factory.management + n * PARAMS.factory.managementPerPost, 0.2, 1.35);
      return n + ' more posts in the factory office: technical, advertising, personnel. The order book gets proper attention at last.';
    }
    case 'attractDoctor': {
      s.order.doctorTarget = (s.order.doctorTarget || s.fac.health.doctors) + 1;
      s.projectLog.doctorsHired += 1;
      return 'A practice is offered a subsidy; a new doctor will arrive within the year.';
    }
    case 'promoteTourism': {
      s.projectLog.tourismSpends += cost;
      s.tourism.heat = Math.min(2.2, s.tourism.heat + 1.10);
      s.tourism.campaigns.push({ month: s.month, cost, recovered: 0 });
      return 'Posters, brochures, a spa orchestra — it pays only in a good season, and only if there are people free to serve the visitors.';
    }
    default:
      return 'Nothing happened.';
  }
}

function addInbox(s, kind, title, text) {
  s.inbox.push({ month: s.month, kind, title, text });
  if (s.inbox.length > 260) s.inbox.shift();
}
export function pushReport(s, report) { s.reports.push({ month: s.month, ...report }); }
export { addInbox };

// -----------------------------------------------------------------------------
// The monthly step
// -----------------------------------------------------------------------------
export function step(s) {
  const P = PARAMS;
  const o = s.order;
  s.month += 1;

  // 1 ─ Regional business cycle: mean-reverting random walk
  s.cycle = clamp(s.cycle + P.cycle.meanRevert * (P.cycle.start - s.cycle) + P.cycle.noise * gauss(s), P.cycle.min, P.cycle.max);

  // 2 ─ Watch factory
  const f = s.factory;
  const util = clamp(f.output / Math.max(1, f.capacity), 0, 1.2);
  f.machinery = clamp(f.machinery - P.factory.machineryDecay * (0.7 + 0.6 * util), P.factory.machineryFloor, 1.0);
  f.quality = clamp(f.quality - P.factory.qualityDecay, 0.1, 1.0);
  if (f.modernizeLeft > 0) { f.machinery = clamp(f.machinery + P.factory.modernizeGain / P.factory.modernizeMonths, P.factory.machineryFloor, 1.0); f.modernizeLeft -= 1; }
  for (const p of (f.expansions || [])) {
    p.monthsLeft -= 1;
    if (p.monthsLeft <= 0) { f.capacity += p.units; addInbox(s, 'factory', 'The new hall is finished', `The works can now produce ${f.capacity.toLocaleString('en')} units a month.`); }
  }
  if (f.expansions) f.expansions = f.expansions.filter(p => p.monthsLeft > 0);
  if (f.marketingLeft > 0) f.marketingLeft -= 1;
  // headcount: drifts toward what the order book justifies; the mayor may flex ±15 %
  const justified = demandJustifiedStaff(s);
  const target = Math.round(justified * clamp(o.factoryStaffTarget / Math.max(1, P.factory.staffStart), 1 - P.factory.staffTolerance, 1 + P.factory.staffTolerance));
  const gap = target - f.staff;
  f.staff = Math.max(30, f.staff + (gap > 0 ? Math.min(gap, Math.ceil(Math.abs(gap) * P.factory.staffDrift) + 1) : -Math.min(-gap, Math.ceil(Math.abs(gap) * P.factory.staffDrift) + 1)));
  f.wageBill = f.staff * P.factory.wageBase * o.factoryWageLevel;
  const ap = Math.round(o.apprenticeTarget);
  f.apprentices = f.apprentices + clamp(ap - f.apprentices, -2, 2);
  // demand & production
  const appetite = clamp((1 + P.factory.qualityDemandElasticity * (f.quality - 0.5)) * (1 + (f.marketingLeft > 0 ? P.factory.marketingBoost : 0)), 0.4, 2.2);
  const demand = (P.factory.exportDemand * s.cycle + P.factory.domesticDemand * (0.85 + 0.3 * clamp(s.population / 3700, 0.7, 1.3))) * appetite * f.management;
  const mach = clamp(f.machinery, 0, 1);
  // "Berechnung der Planungsguete": a thin office plans badly, and bad planning shows in output
  const planning = clamp(0.78 + 0.22 * ((f.officeStaff || 6) / 12), 0.78, 1.02);
  const staffingRatio = clamp(f.staff / Math.max(1, justified), 0.6, 1.6);
  const manning = clamp(0.75 + 0.25 * staffingRatio + 0.5 * Math.min(0, staffingRatio - 1), 0.6, 1.05);
  const effectiveCapacity = f.capacity * (0.35 + 0.65 * mach) * clamp(staffingRatio, 0.5, 1) * planning;
  const output = Math.max(0, Math.min(demand, effectiveCapacity) * clamp(manning, 0.7, 1.05));
  f.output = output;
  const sales = Math.max(0, Math.min(demand, output + f.stock));
  f.sales = sales;
  f.stock = clamp(f.stock + output - sales, 0, 80000);
  const pricePerUnit = P.factory.price * (0.85 + 0.30 * f.quality);
  f.revenue = sales * pricePerUnit;
  // the works consumes raw material; what the warehouse holds was paid for long ago,
  // and only replacement is bought at the manual's 50 DM a unit
  const consumed = output;
  const fromStock = Math.min(f.rawStock, consumed);
  f.rawStock -= fromStock;
  const bought = consumed - fromStock;
  f.boughtLastMonth = bought;
  if (f.rawStock < P.factory.rawAlarm && !f.alarmRaised) {
    f.alarmRaised = true;
    addInbox(s, 'crisis', 'The warehouse is nearly empty',
      `Raw material stands at ${Math.round(f.rawStock).toLocaleString('en')} units. The works stops if it runs out, and the material has to be bought in at 50 DM a unit.`);
  }
  if (f.rawStock > P.factory.rawAlarm * 2) f.alarmRaised = false;
  if (consumed > 0 && fromStock < consumed) f.stockBoughtSpend = bought * P.factory.materials;
  f.profit = f.revenue - f.wageBill - bought * P.factory.materials - P.factory.overhead;
  if (mach < 0.55 && nextRandom(s) < (0.55 - mach) * P.factory.breakdownChance) {
    f.breakdowns += 1;
    if (s.month % 3 === 0) addInbox(s, 'factory', 'Line stoppage', `The ${['assembly', 'case-polishing', 'movement', 'packing', 'quality-control'][Math.floor(nextRandom(s) * 5)]} line stood still for two days. The foreman blames the ${mach < 0.4 ? 'ancient' : 'ageing'} machinery.`);
  }
  for (const p of (f.expansions || [])) if (p.monthsLeft % 6 === 0) addInbox(s, 'factory', 'Building work at the works', `The extension is ${p.monthsLeft} months from completion.`);

  // 3 ─ Other economy, tourism
  const municipalWageBill = (s.finance.municipalStaff || P.finance.municipalStaffStart) * P.finance.municipalWage;
  s.other.wages = s.other.jobs * P.otherEconomy.wageBase * (0.92 + 0.16 * clamp(s.cycle, 0.7, 1.2));
  const wageBillTown = f.wageBill + s.other.wages + municipalWageBill;
  const spendingIndex = clamp(wageBillTown / P.otherEconomy.spendingIndexBase, 0.5, 1.5);
  const otherTarget = P.otherEconomy.jobsStart
    * clamp(1 + 0.45 * (s.population / 3700 - 1) + 0.10 * (s.cycle - 1) + 0.25 * (spendingIndex - 1)
              + 0.15 * (s.society.reputation - P.society.reputationStart), 0.6, 1.25)
    * clamp(1 - (o.taxBusiness - 1) * 0.12, 0.85, 1.1);
  s.other.jobs = Math.round(s.other.jobs + clamp(otherTarget - s.other.jobs, -8, 8));
  s.other.profit = P.otherEconomy.profitBase * (0.6 + 0.7 * spendingIndex) * clamp(1 - (o.taxBusiness - 1) * 0.45, 0.45, 1.35);
  // tourism: needs staff (unemployment very low ⇒ can't hire) and outside demand  LoF pp.94–95
  const unemploymentRatio = s.employ.unemployed / Math.max(1, s.employ.workforce);
  s.tourism.staffShortage = clamp((0.035 - unemploymentRatio) * 18, 0, 1);   // no spare workers, no service
  const attractiveness = clamp(
    0.30 * s.society.reputation + 0.18 * s.fac.sports.condition + 0.16 * s.fac.parks.condition +
    0.16 * s.fac.library.condition + 0.12 * (1 - s.society.crime) + 0.12 * (1 - clamp(s.housing.queue / 150, 0, 1)),
    0, 1.3);
  const month0 = (Math.max(1, s.month) - 1) % 12;
  const seasRaw = P.tourism.seasonality[month0];
  const seasMean = P.tourism.seasonality.reduce((a, b) => a + b, 0) / 12;
  s.tourism.season = seasRaw / seasMean;                     // ≈0.13 in winter, ≈3.3 in July
  const tourismDemand = clamp(s.cycle * (0.75 + 0.85 * attractiveness) * (1 + s.tourism.heat * 0.45) * s.tourism.season, 0, 1.6);
  const roomCapacity = s.tourism.rooms * (1 - 0.75 * s.tourism.staffShortage);
  s.tourism.occupancy = clamp(tourismDemand * 0.72 * (roomCapacity > 0 ? 1 : 0), 0, 1.0);
  // revenue attributable to the current advertising heat, measured against the same
  // month without it — so "wasted" campaign money is an observation, not an opinion
  const demandNoHeat = clamp(s.cycle * (0.75 + 0.85 * attractiveness) * s.tourism.season, 0, 1.6);
  const occNoHeat = clamp(demandNoHeat * 0.72 * (roomCapacity > 0 ? 1 : 0), 0, 1.0);
  s.tourism.heatGain = (s.tourism.occupancy - occNoHeat) * roomCapacity * P.otherEconomy.tourismRoomRevenue;
  s.tourism.revenue = roomCapacity * s.tourism.occupancy * P.otherEconomy.tourismRoomRevenue;
  if (s.tourism.heat > 0) s.tourism.heat = Math.max(0, s.tourism.heat - 1 / 36);
  for (const c of (s.tourism.campaigns || [])) if (c.recovered < c.cost * 1.4) c.recovered += s.tourism.heatGain;
  if (s.fac.hotels.buildLeft > 0) {
    s.fac.hotels.buildLeft -= 1;
    if (s.fac.hotels.buildLeft <= 0 && s.fac.hotels.pendingCapacity > 0) {
      s.tourism.rooms += s.fac.hotels.pendingCapacity;
      // manual 9.7.3: one small tradesman per 50 beds, and "damit gewinnt man
      // unter den Verkäufern automatisch 4 Arbeitsplätze"
      const shopJobs = Math.max(1, Math.round(s.fac.hotels.pendingCapacity / 50 * 4));
      s.other.jobs += shopJobs;
      addInbox(s, 'build', 'New hotel rooms', `The extension is ready: ${s.tourism.rooms} rooms in town now — and ${shopJobs} more jobs among the shopkeepers, as hotels bring trade.`);
      s.fac.hotels.pendingCapacity = 0;
    }
  }

  // 4 ─ Housing
  const h = s.housing;
  h.completedThisMonth = 0;
  for (const p of h.pipeline) {
    p.monthsLeft -= 1;
    if (p.monthsLeft <= 0) {
      h.dwellings += p.units; h.completedThisMonth += p.units;
      s.projectLog.housingBuilt += p.units;
      if (p.social) h.quality = clamp(h.quality - 0.008 * p.units / 40, 0.2, 1);
    }
  }
  h.pipeline = h.pipeline.filter(p => p.monthsLeft > 0);
  h.quality = clamp(h.quality - 0.0015 * (1.4 - clamp(o.maintenanceLevel, 0, 1.4)), 0.15, 1);
  h.rentLevel = o.rentLevel;

  // 5 ─ Population
  const sat = s.society;
  computeDerived(s);
  const rentBurden = (P.housing.rentBase * h.rentLevel * (1 - clamp((o.rentSubsidy + 0) / P.housing.rentSubsidyPerUnit, 0, 0.6))) / Math.max(1400, (P.factory.wageBase * o.factoryWageLevel * 0.6 + P.otherEconomy.wageBase * 0.4));
  const queuePressure = clamp(h.queue / Math.max(45, s.householdsNeeding * 0.05), 0, 2);
  const fertility = clamp(0.65 + 1.0 * sat.satisfaction.families - 0.30 * queuePressure, 0.2, 1.4);
  const births = s.pop.adults * 0.5 * P.pop.birthMonthly * fertility;
  const health = 1 + 0.5 * s.fac.health.doctorGap;
  const deathsC = s.pop.children * P.pop.deathMonthly.children * (1 + 0.4 * (1 - sat.satisfaction.families)) * health;
  const deathsA = s.pop.adults * P.pop.deathMonthly.adults * (1 + 0.4 * (1 - sat.satisfaction.workers)) * health;
  const deathsE = s.pop.elderly * P.pop.deathMonthly.elderly * (1 + 0.4 * (1 - sat.satisfaction.elderly)) * health;
  const matured = s.pop.children * P.pop.matureMonthly;
  const retired = s.pop.adults * P.pop.retireMonthly;
  // migration pulls per segment
  const jobPull = clamp((0.06 - s.unemploymentRate) * 4.5, -1.2, 1.2);
  const housePull = clamp((55 - h.queue) / 130, -1, 1);
  const leisurePull = clamp((s.fac.sports.condition + s.fac.library.condition + s.fac.parks.condition) / 3 - 0.55, -0.45, 0.45) * 2;
  const schoolPull = clamp(s.fac.school.capacity * clamp(s.fac.school.staffLevel, 0, 1.2) / Math.max(1, s.pop.children * 1.1) - 1, -1, 1);
  const carePull = clamp(s.fac.elderlyHome.capacity * clamp(s.fac.elderlyHome.staffLevel, 0, 1.2) / Math.max(1, s.pop.elderly * 0.085) - 1, -1, 1);
  const mig = (pull) => clamp(clamp(pull, -1.3, 1.3) * P.pop.migrationBase, -P.pop.migrationMax, P.pop.migrationMax) * (1 - P.society.migrationResistance * 0.6);
  const mWorkers = mig(0.40 * jobPull + 0.22 * housePull + 0.14 * leisurePull + 0.24 * (sat.satisfaction.workers - 0.58) * 2.2);
  const mFamilies = mig(0.32 * jobPull + 0.26 * housePull + 0.20 * schoolPull + 0.22 * (sat.satisfaction.families - 0.58) * 2.2);
  const mElderly = mig(0.34 * carePull + 0.26 * (sat.satisfaction.elderly - 0.58) * 2.2 + 0.22 * (1 - sat.crime) * 2 - 0.22);
  const inC = Math.max(0, mFamilies) * s.pop.children * 1.2, outC = -Math.min(0, mFamilies) * s.pop.children * 1.1;
  const inA = Math.max(0, mWorkers) * s.pop.adults * 1.1 + Math.max(0, mFamilies) * s.pop.adults * 1.2;
  const outA = -Math.min(0, mWorkers) * s.pop.adults * 1.0 - Math.min(0, mFamilies) * s.pop.adults * 0.7;
  const inE = Math.max(0, mElderly) * s.pop.elderly * 1.1 + Math.max(0, mFamilies) * s.pop.elderly * 0.15;
  const outE = -Math.min(0, mElderly) * s.pop.elderly * 1.0;
  s.pop.children = Math.max(0, s.pop.children + births - deathsC - matured + inC - outC);
  s.pop.adults = Math.max(0, s.pop.adults + matured - retired - deathsA + inA - outA);
  s.pop.elderly = Math.max(0, s.pop.elderly + retired - deathsE + inE - outE);
  s.demography = { births, deaths: deathsC + deathsA + deathsE, inMig: inC + inA + inE, outMig: outC + outA + outE };

  // 6 ─ Delinquency & crime  (training places → youth → quality of life → migration, LoF p.38)
  const youthDistress = clamp(0.55 * 2 * sat.youthUnemployed + 0.45 * clamp(1 - (s.fac.sports.condition + s.fac.library.condition) / 2 / 0.7, 0, 1), 0, 1);
  const dTarget = youthDistress;
  sat.delinquency = clamp(sat.delinquency + (dTarget > sat.delinquency ? P.society.delinquencyRise : -P.society.delinquencyHeal) * Math.abs(dTarget - sat.delinquency) * 2.2, 0, 1);
  sat.crime = clamp(P.society.crimeFromDelinquency * sat.delinquency + 0.01, 0, 1);

  // 7 ─ Facilities: condition, staffing
  const maint = clamp(o.maintenanceLevel, 0, 1.6);
  for (const [key, def] of Object.entries(P.facilities.build)) {
    if (key === 'hotels') continue;   // handled with the tourism block
    const fac = s.fac[key];
    if (fac.buildLeft > 0) {
      fac.buildLeft -= 1;
      if (fac.buildLeft <= 0) {
        if (fac.pendingCapacity) fac.capacity = (fac.capacity || 0) + fac.pendingCapacity;
        if (fac.pendingStaff) fac.staff = (fac.staff || 0) + fac.pendingStaff;
        const label = P.facilities.build[key].label;
        fac.pendingCapacity = 0; fac.pendingStaff = 0;
        if (key !== 'hotels') addInbox(s, 'build', `${label} completed`, `The new ${label.toLowerCase()} is ready.`);
      }
      continue;
    }
    const wear = P.facilities.conditionDecay * (1.4 - Math.min(maint, 1.4));
    fac.condition = clamp(fac.condition - wear, 0.05, 1);
    fac.staffLevel = clamp(o.staffLevels[key] ?? 1, 0, 1.5);
  }
  // doctors arrive toward target
  const docTarget = o.doctorTarget ?? s.fac.health.doctors;
  s.fac.health.doctors = clamp(s.fac.health.doctors + clamp(docTarget - s.fac.health.doctors, -0.15, 0.15), 0, 40);
  s.fac.health.condition = clamp(1 - 0.5 * s.fac.health.doctorGap - 0.3 * (s.fac.elderlyHome.condition < 0.5 ? 0.5 : 0), 0.05, 1);

  // 8 ─ Satisfaction, per segment (components 0..1)                     LoF p.202 n.2
  const comp = {
    workers: {
      living: clamp(0.52 + 0.7 * (o.factoryWageLevel - 0.9) - 1.1 * (rentBurden - 0.15) - 0.5 * s.unemploymentRate * 2, 0, 1),
      job: clamp(1 - s.unemploymentRate * 4.5, 0, 1),
      housing: clamp(1 - h.queue / 200, 0, 1),
      leisure: clamp((s.fac.sports.condition * clamp(s.fac.sports.staffLevel, 0, 1.2) + s.fac.library.condition) / 1.6, 0, 1),
      health: clamp(1 - s.fac.health.doctorGap * 1.3, 0, 1),
      facilities: clamp((s.fac.parks.condition + h.quality) / 2, 0, 1),
      taxes: clamp(1.35 - 0.55 * o.taxBusiness - 0.4 * o.taxProperty - 0.3 * o.fees, 0, 1),
      services: clamp(0.5 * s.utility.condition + 0.5 * s.transport.roads, 0, 1),
      council: clamp(0.5 * s.politics.council.labour + 0.5 * s.politics.council.residents, 0, 1),
    },
    families: {
      living: clamp(0.55 + 0.55 * (o.factoryWageLevel - 0.9) - 1.0 * (rentBurden - 0.15) - 0.4 * s.unemploymentRate * 2, 0, 1),
      housing: clamp(1 - h.queue / 180 - (1 - h.quality) * 0.35, 0, 1),
      school: clamp(s.fac.school.condition * clamp(s.fac.school.staffLevel, 0, 1.2) * clamp(s.fac.school.capacity / Math.max(1, s.pop.children * 1.15), 0, 1.2), 0, 1),
      kind: clamp(s.fac.kindergarten.condition * clamp(s.fac.kindergarten.staffLevel, 0, 1.2) * clamp(s.fac.kindergarten.capacity / Math.max(1, s.pop.children * 0.42), 0, 1.2), 0, 1),
      leisure: clamp((s.fac.sports.condition * clamp(s.fac.sports.staffLevel, 0, 1.2) + s.fac.parks.condition) / 1.6, 0, 1),
      safety: clamp(1 - sat.crime * 1.8, 0, 1),
      facilities: clamp(h.quality, 0, 1),
      services: clamp(0.5 * s.utility.condition + 0.5 * s.transport.roads, 0, 1),
      council: clamp(0.5 * s.politics.council.residents + 0.5 * s.politics.council.business, 0, 1),
    },
    elderly: {
      living: clamp(0.58 - 1.2 * (rentBurden - 0.15) - 0.15, 0, 1),
      care: clamp(s.fac.elderlyHome.condition * clamp(s.fac.elderlyHome.staffLevel, 0, 1.2) * clamp(s.fac.elderlyHome.capacity / Math.max(1, s.pop.elderly * 0.085), 0, 1.2), 0, 1),
      safety: clamp(1 - sat.crime * 2.1, 0, 1),
      health: clamp(1 - s.fac.health.doctorGap * 1.5, 0, 1),
      leisure: clamp((s.fac.parks.condition + s.fac.library.condition) / 2, 0, 1),
      housing: clamp(1 - h.queue / 240 - (1 - h.quality) * 0.3, 0, 1),
      facilities: clamp((s.fac.library.condition + h.quality) / 2, 0, 1),
      services: clamp(0.45 * s.utility.condition + 0.55 * clamp(s.transport.buses / 1.5, 0, 1), 0, 1),
      council: clamp(0.6 * s.politics.council.residents + 0.4 * s.politics.council.labour, 0, 1),
    },
  };
  s.components = comp;
  for (const seg of ['workers', 'families', 'elderly']) {
    const w = P.society.weights[seg];
    let v = 0, total = 0;
    for (const [k, weight] of Object.entries(w)) { v += weight * clamp(comp[seg][k] ?? 0.5, 0, 1); total += weight; }
    v /= Math.max(1e-9, total);            // the new services ride along without shifting the old weights
    sat.satisfaction[seg] = clamp(sat.satisfaction[seg] * (1 - P.society.inertia) + v * P.society.inertia, 0, 1);
  }
  sat.pollMonths += 1;
  if (sat.pollMonths >= 3) {
    sat.pollMonths = 0;
    for (const seg of ['workers', 'families', 'elderly']) sat.reported[seg] = clamp(sat.satisfaction[seg] + P.society.pollNoise * gauss(s), 0, 1);
  }

  // 8b ─ The bank, the utility, the roads, the council
  const wageBillBank = f.wageBill + s.other.wages + municipalWageBill;
  s.bank.depositTarget = (wageBillBank / 3_100_000) * 9_500_000 * (1 + P.bank.depositSensitivity * ((o.depositRate ?? 1) - 1));
  s.bank.deposits = clamp(s.bank.deposits + (s.bank.depositTarget - s.bank.deposits) * 0.03, 1_000_000, 40_000_000);
  s.bank.capacity = P.bank.capacityBase * clamp(s.bank.deposits / 9_500_000, 0.4, 2.2);
  s.bank.depositRate = o.depositRate ?? 1;
  // the town may borrow from the regional bank, and from its own bank when the
  // town's savings are strong enough to back it
  const regionalLine = P.finance.creditLimitBase + (s.finance.revenueLastYear || P.finance.taxBusinessBase * 12) * P.finance.creditLimitRevenueFactor;
  s.finance.creditLimit = Math.max(4_000_000, regionalLine, s.bank.capacity);

  // Power, water and rubbish: the town's own works, quietly wearing out.
  s.utility.staffLevel = clamp(o.utilityStaff ?? 1, 0, 1.5);
  s.utility.renewLeft = Math.max(0, s.utility.renewLeft - 1);
  if (s.utility.renewLeft > 0) s.utility.condition = clamp(s.utility.condition + P.utility.renewGain / P.utility.renewMonths, 0, 1);
  s.utility.condition = clamp(s.utility.condition - P.utility.decay * (1.4 - clamp(o.maintenanceLevel, 0, 1.4)) * (1.6 - s.utility.staffLevel), 0.05, 1);
  if (s.utility.condition < P.utility.outageChanceAt && nextRandom(s) < (P.utility.outageChanceAt - s.utility.condition) * 0.7) {
    const cost = Math.round(P.utility.outageCost * (1 + nextRandom(s)));
    s.utility.outages += 1;
    s.utility.lastOutage = s.month;
    s.utility.emergencyCost = (s.utility.emergencyCost || 0) + cost;   // paid through this month's budget, so the books stay straight
    addInbox(s, 'crisis', 'Water main bursts', `A main burst under the market square: ${fmtDM(cost)} for the emergency crew, and half the town had no water for a day.`);
    s.society.reputation = clamp(s.society.reputation - 0.03, 0, 1);
  } else if (s.utility.condition < 0.5 && s.month % 7 === 0) {
    addInbox(s, 'complaint', 'Rubbish not collected', 'Bins stood in the streets for days: the depot is short of lorries and men.');
  }

  // Roads, buses and the station.
  s.transport.buses = clamp(o.buses ?? 1, 0, 2);
  s.transport.repairLeft = Math.max(0, s.transport.repairLeft - 1);
  if (s.transport.repairLeft > 0) s.transport.roads = clamp(s.transport.roads + P.transport.repairGain / P.transport.repairMonths, 0, 1);
  s.transport.roads = clamp(s.transport.roads - P.transport.roadDecay * (1.4 - clamp(o.maintenanceLevel, 0, 1.4)), 0.05, 1);
  if (s.transport.stationWork > 0) {
    s.transport.stationWork -= 1;
    if (s.transport.stationWork === 0) {
      s.transport.station = clamp(s.transport.station + P.transport.stationGain, 0, 1);
      addInbox(s, 'build', 'The station is ready', 'Longer platforms, a proper waiting room, and the express stops here again.');
    }
  }
  s.transport.commuterJobs = Math.round(P.transport.commuterJobs * (0.3 + 0.7 * s.transport.roads)
    * clamp(s.transport.buses / 1.5, 0.4, 1.4) * (0.8 + 0.4 * s.transport.station));

  // The council watches what you do with taxes, wages and the town's money.
  const council = s.politics.council;
  const drift = P.politics.moodDrift;
  const businessWant = clamp(1.45 - 0.55 * o.taxBusiness - 0.3 * o.taxProperty - 0.3 * o.fees, 0, 1);
  const labourWant = clamp(0.35 + 0.5 * o.factoryWageLevel + 0.5 * (1 - Math.min(1, s.unemploymentRate * 5)), 0, 1);
  const residentWant = clamp(
    0.30 * s.transport.roads + 0.20 * s.utility.condition + 0.20 * (1 - Math.min(1, s.housing.queue / 120)) +
    0.15 * clamp((s.fac.sports.condition + s.fac.parks.condition) / 2, 0, 1) + 0.15 * (1 - s.society.crime), 0, 1);
  council.business += (businessWant - council.business) * drift;
  council.labour += (labourWant - council.labour) * drift;
  council.residents += (residentWant - council.residents) * drift;

  // 9 ─ Municipal budget
  const income = {}, spend = {};
  // the wage tax on every wage and pension, by the schedule above
  const avgAnnualWage = (wageBillTown / Math.max(1, s.employ.workforce + s.employ.unemployed)) * 12;
  const taxSchedule = P.finance.wageTax;
  const wageTaxRate = avgAnnualWage <= taxSchedule.threshold ? 0
    : Math.min(taxSchedule.max, taxSchedule.min + taxSchedule.progression * ((avgAnnualWage - taxSchedule.threshold) / taxSchedule.width));
  income.wageTax = (wageBillTown + P.finance.pensionsBase) * wageTaxRate * (o.taxProperty ?? 1);
  // the trades pay turnover tax on what they take (the factory's is municipal and nets out)
  const tradeRevenue = s.other.profit * 5;                     // [GAP] a 20 % margin on retail
  income.turnoverTax = tradeRevenue * P.finance.turnoverTax * (o.taxBusiness ?? 1) * clamp(0.8 + 0.4 * (s.population / 3700), 0.7, 1.3);
  // the town also taxes the trades' profits (manual INST: "Steuereinnahmen von Betrieben")
  income.tradeProfits = s.other.profit * 0.35 * (o.taxBusiness ?? 1) * clamp(0.7 + 0.3 * (s.population / 3700), 0.6, 1.3);
  income.incomeTaxShare = 0;
  income.rents = h.dwellings * P.housing.rentBase * h.rentLevel * 0.9;   // the town owns nearly all the housing and land
  income.fees = P.finance.feeIncomeBase * o.fees * clamp(1 - 0.2 * s.unemploymentRate * 3, 0.6, 1);
  income.tourismTax = s.tourism.revenue * 0.10;
  income.utilityFees = PARAMS.utility.feesBase * o.utilityFees * clamp(0.85 + 0.3 * s.utility.condition, 0.6, 1.2);
  // the bank earns the spread between lending and savings, not the whole rate
  const bankLoans = s.bank.deposits * 0.8;
  income.bankProfit = Math.round(bankLoans * (0.075 - PARAMS.bank.depositRateBase * (o.depositRate ?? 1)) * clamp(0.4 + 0.7 * s.society.reputation, 0.2, 1.2) / 12);
  income.grants = P.finance.stateGrantPerCapita * s.population * (0.8 + 0.4 * clamp(s.society.reputation, 0, 1));
  income.factorySurplus = f.profit;
  const muniStaff = s.finance.municipalStaff || P.finance.municipalStaffStart;
  spend.municipalWages = muniStaff * P.finance.municipalWage;
  spend.facilityStaff = Object.entries(s.fac).reduce((acc, [k, fac]) => {
    const def = P.facilities.build[k];
    if (!def || fac.staff == null) return acc;
    return acc + fac.staff * clamp(fac.staffLevel ?? 1, 0, 1.5) * def.staffWage;
  }, 0);
  const avgCondition = ['kindergarten', 'school', 'sports', 'library', 'elderlyHome', 'parks']
    .reduce((a, k) => a + (s.fac[k].condition ?? 0.7), 0) / 6;
  spend.maintenance = P.facilities.maintenanceNeedBase * maint * (h.dwellings / P.housing.dwellingsStart) * (1 + 0.7 * (1 - avgCondition));
  spend.debtService = s.finance.debt * P.finance.interestMonthly;
  spend.welfare = s.employ.unemployed * P.finance.welfarePerUnemployed;
  spend.pensions = P.finance.pensionsBase;
  const aspiration = clamp(1 + 0.8 * (parseFloat(o.taxProperty ?? 1) - 1) + 0.5 * (s.population / 3700 - 1), 0.5, 2.5);
  const income4 = Math.pow(Math.max(200, avgAnnualWage / 1000), 0.4);
  spend.energy = Math.sqrt(aspiration) * (s.householdsNeeding || 1500) * P.finance.energyPerHousehold;
  spend.disposal = income4 * s.population * P.finance.disposalPerCapita / 10;
  spend.subsidies = (o.rentSubsidy || 0) + (o.tourismSubsidy || 0) + (s.finance.industrySubsidy || 0) + s.fac.health.doctors * P.facilities.doctorCostPerMonth;
  spend.utilityStaff = PARAMS.utility.staffCostPer * clamp(o.utilityStaff, 0, 1.5) + PARAMS.utility.upkeepPer * clamp(o.maintenanceLevel, 0, 1.4);
  // (the bank pays its savers out of its own lending margin)
  spend.buses = PARAMS.transport.busCostPerLevel * clamp(o.buses, 0, 2);
  spend.utilityEmergencies = s.utility.emergencyCost || 0;
  s.utility.emergencyCost = 0;
  const totalIncome = Object.values(income).reduce((a, b) => a + b, 0);
  const totalSpend = Object.values(spend).reduce((a, b) => a + b, 0);
  const net = totalIncome - totalSpend;
  s.finance.treasury += net;
  s.finance.monthIncome = totalIncome; s.finance.monthSpend = totalSpend; s.finance.monthNet = net;
  s.ledger = { income, spend, net };
  if (s.finance.treasury < 0) {
    s.finance.debt += -s.finance.treasury;
    s.finance.treasury = 0;
  }
  s.finance.creditLimit = P.finance.creditLimitBase + (s.finance.revenueLastYear || P.finance.taxBusinessBase * 12) * P.finance.creditLimitRevenueFactor;
  if (s.finance.debt > s.finance.creditLimit && !s.finance.collapse) {
    s.finance.collapse = true; s.finance.collapseMonth = s.month;
    s.society.reputation = clamp(s.society.reputation - P.finance.collapseReputationHit, 0, 1);
    patchOrder(s, { maintenanceLevel: Math.min(o.maintenanceLevel, 0.35), staffLevels: { kindergarten: 0.7, school: 0.8, sports: 0.6, library: 0.6, elderlyHome: 0.7 } });
    const debtBefore = s.finance.debt;
    s.finance.debt *= 0.88;
    s.finance.writeOffs = (s.finance.writeOffs || 0) + (debtBefore - s.finance.debt);
    addInbox(s, 'crisis', 'The town is out of credit', 'The bank refuses further lending. The regional supervisor imposes an austerity programme: maintenance cut to the bone, staff reduced. The town’s name is in the newspapers.');
  }
  if (s.month % 12 === 0) s.finance.revenueLastYear = totalIncome * 12;

  // 10 ─ Reputation drifts toward the town's real state
  const realState = clamp(
    0.30 * ((sat.satisfaction.workers + sat.satisfaction.families + sat.satisfaction.elderly) / 3) +
    0.22 * (1 - s.unemploymentRate * 4) +
    0.16 * (1 - clamp(h.queue / 180, 0, 1)) +
    0.12 * (1 - sat.crime) +
    0.10 * clamp(s.cycle, 0.7, 1.2) / 1.2 + 0.10 * (f.capacity > P.factory.capacityStart ? 1 : 0.72), 0, 1);
  sat.reputation = clamp(sat.reputation + (realState - sat.reputation) * P.society.reputationSpeed, 0, 1);

  // 11 ─ Employment bookkeeping
  s.employ.factoryJobs = f.staff;
  s.employ.apprentices = f.apprentices;
  s.employ.otherJobs = s.other.jobs + (s.other.trainedPlaced || 0);
  s.employ.municipalJobs = Math.round((s.finance.municipalStaff || P.finance.municipalStaffStart) + Object.entries(s.fac).reduce((a, [k, fac]) => {
    const def = P.facilities.build[k];
    return a + (def && fac.staff ? fac.staff * clamp(fac.staffLevel ?? 1, 0, 1.5) : 0);
  }, 0));
  if (s.pendingRetraining && s.pendingRetraining.length) {
    for (const r of s.pendingRetraining) {
      r.monthsLeft -= 1;
      if (r.monthsLeft <= 0) {
        // placements are permanent: the market's own drift must not erode them
        s.other.trainedPlaced = (s.other.trainedPlaced || 0) + r.people;
        addInbox(s, 'economy', 'Retraining completed', `${r.people} people have finished their retraining and taken up work in trade and services.`);
      }
    }
    s.pendingRetraining = s.pendingRetraining.filter(r => r.monthsLeft > 0);
  }
  if (s.pendingIndustry) {
    s.pendingIndustry.monthsLeft -= 1;
    if (s.pendingIndustry.monthsLeft <= 0) {
      s.other.jobs += s.pendingIndustry.jobs;
      addInbox(s, 'economy', 'The new workshop opens', `The firm from outside has opened its workshop and is hiring — about ${s.pendingIndustry.jobs} jobs.`);
      s.pendingIndustry = null;
    }
  }
  computeDerived(s);
  const youthTarget = Math.max(0, s.employ.youthWorkforce - f.apprentices - Math.round(s.other.jobs * 0.16) - Math.round(f.staff * 0.12) - Math.round(s.pendingIndustry ? (s.pendingIndustry.jobs || 0) * 0.5 : 0));
  s.employ.youthUnemployed = s.employ.youthUnemployed == null ? youthTarget : lerp(s.employ.youthUnemployed, youthTarget, 0.4);
  sat.youthUnemployed = clamp(s.employ.youthUnemployed / Math.max(1, s.employ.youthWorkforce), 0, 1);

  // 12 ─ History & flavour
  pushHistory(s);
  s.ledger.month = s.month;
  addMonthlyFlavour(s);
  return net;
}

// One row of the town's chronicle. Also written once at month 0 so charts have
// a starting point (and the handover figures are the model's own).
export function pushHistory(s) {
  const f = s.factory, h = s.housing, sat = s.society;
  s.history.push({
    month: s.month, capital: s.finance.treasury, debt: s.finance.debt,
    unemployed: s.employ.unemployed, unemploymentRate: s.unemploymentRate,
    production: f.output, sales: f.sales, stock: f.stock,
    satisfaction: (sat.satisfaction.workers + sat.satisfaction.families + sat.satisfaction.elderly) / 3,
    satisfactionWorkers: sat.satisfaction.workers, satisfactionFamilies: sat.satisfaction.families, satisfactionElderly: sat.satisfaction.elderly,
    satReported: (sat.reported.workers + sat.reported.families + sat.reported.elderly) / 3,
    reportedByseg: { ...sat.reported },
    housingQueue: h.queue, dwellings: h.dwellings, population: s.population,
    crime: sat.crime, delinquency: sat.delinquency, machinery: f.machinery,
    municipalNet: s.finance.monthNet || 0, income: s.finance.monthIncome || 0, spend: s.finance.monthSpend || 0,
    factoryProfit: f.profit, tourismRevenue: s.tourism.revenue,
    youthUnemployed: sat.youthUnemployed, reputation: sat.reputation,
    cycle: s.cycle, quality: f.quality, staff: f.staff, doctors: s.fac.health.doctors,
    factoryRevenue: f.revenue, factoryWageBill: f.wageBill,
    season: s.tourism.season ?? 1,
  });
}

function addMonthlyFlavour(s) {
  const r = nextRandom(s);
  const f = s.factory;
  const prev = s.history.length > 1 ? s.history[s.history.length - 2] : null;
  if (prev && prev.unemployed != null && s.employ.unemployed - prev.unemployed > 14 && r < 0.45) {
    addInbox(s, 'economy', 'Workers laid off', `The employment office reports ${Math.round(s.employ.unemployed - prev.unemployed)} more people without work this month.`);
  }
  if (s.housing.queue > 90 && r < 0.22) addInbox(s, 'housing', 'Housing list grows', `The housing office now lists ${Math.round(s.housing.queue)} households waiting for a dwelling.`);
  if (s.month % 12 === 0 && s.month > 0) {
    const yr = Math.floor(s.month / 12) + 1;   // month 12 = the start of year 2
    addInbox(s, 'year', `Year ${yr} begins`, `Population ${Math.round(s.population)}, ${fmtPct(s.unemploymentRate)} without work, ${fmtDM(s.finance.treasury)} in the bank and ${fmtDM(s.finance.debt)} owed. The factory earned ${fmtDM(f.revenue)} last month.`);
  }
  if (f.marketingLeft > 0 && s.month % 6 === 0) addInbox(s, 'factory', 'Advertising report', 'The campaign is running: the trade press carries the works’ advertisements.');
  if (s.fac.school.condition < 0.45 && s.month % 8 === 0) addInbox(s, 'school', 'Parents’ evening', 'Parents complain about the state of the school building.');
  if (s.society.delinquency > 0.4 && s.month % 10 === 0) addInbox(s, 'police', 'Report from the constabulary', `Youth disturbance is up; the constable blames ${Math.round(s.society.youthUnemployed * 100)} % youth unemployment and the lack of anything for young people to do.`);
  if (r < 0.03) {
    const complaints = [
      ['dog droppings on the streets', 'a citizen'],
      ['the snail’s pace at which public officials work', 'a shopkeeper'],
      ['inadequate services for the elderly', 'a pensioner'],
      ['the town library opening hours', 'a teacher'],
      ['potholes in Bahnhofstrasse', 'a taxi driver'],
      ['the lack of kindergarten places', 'a young mother'],
      ['noise from the youth club', 'a resident'],
    ];
    const [issue, who] = complaints[Math.floor(nextRandom(s) * complaints.length)];
    addInbox(s, 'complaint', 'Letter to the mayor', `${who[0].toUpperCase() + who.slice(1)} complains about ${issue}.`);
  }
}

// -----------------------------------------------------------------------------
// Runners
// -----------------------------------------------------------------------------
export function runMonths(s, n, ordersFn) {
  for (let i = 0; i < n; i++) {
    if (ordersFn) ordersFn(s, i);
    step(s);
  }
  return s;
}
export function runToEnd(s, ordersFn) { return runMonths(s, TOTAL_MONTHS - s.month, ordersFn); }
