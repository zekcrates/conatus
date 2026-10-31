// tanaland/engine/sim.js
// -----------------------------------------------------------------------------
// The Tanaland model. Pure functions + plain data. No DOM, no globals, no deps.
//
// Runs MONTHLY for 120 months. A planning session fixes a `policy`; it holds
// until the next session changes it.
//
// EVERY rule carries a source note -> research/TANALAND.md.
// Anything the book does not pin down numerically is marked [GAP] with the
// shape that was chosen and why.
// -----------------------------------------------------------------------------

export const MONTHS_PER_YEAR = 12;
export const TOTAL_MONTHS = 120;

// -----------------------------------------------------------------------------
// Deterministic RNG (mulberry32) — a run is replayable from its seed.
// -----------------------------------------------------------------------------
export function rng(seed) {
  let a = seed >>> 0;
  return function () {
    a = (a + 0x6d2b79f5) >>> 0;
    let t = Math.imul(a ^ (a >>> 15), 1 | a);
    t = (t + Math.imul(t ^ (t >>> 7), 61 | t)) ^ t;
    return ((t ^ (t >>> 14)) >>> 0) / 4294967296;
  };
}

// Mix an integer seed into the generator's state without running it. F-03: a
// zero state makes mulberry32 start far below 0.5, so seeds 1 and 2 produced
// identical rain. A hash-based start keeps small seeds well distributed.
export function seedState(seed) {
  let h = (seed >>> 0) ^ 0x9e3779b9;
  h = Math.imul(h ^ (h >>> 16), 0x85ebca6b);
  h = Math.imul(h ^ (h >>> 13), 0xc2b2ae35);
  return (h ^ (h >>> 16)) >>> 0;
}

// -----------------------------------------------------------------------------
// Tunable constants. These are the ones the calibration sweep searches over;
// semantically-motivated ones are named NOTES below.
// -----------------------------------------------------------------------------
export const C = {
  // ---------------- world scale -------------------------------------------
  tupis0: 1600, // [GAP] book gives no head-count for Tanaland (Moro ~650 per de.wiki)
  moros0: 800,
  cattle0: 2400, // [GAP] herd size; the book only says "herds"
  groundwater0: 100,
  groundwaterMax: 100,
  capital0: 5200,

  // ---------------- land & pasture ----------------------------------------
  // Cattle the land can carry per unit of vegetative mass. The fundamental
  // constraint of the cattle catastrophe (LoF p.81: "exceeds the carrying
  // capacity of the available vegetated area").
  cattleCapPerGrass: 1600, // cattle the grass carries; the book says the herd "exceeds the carrying capacity" (p.81)
  grassSeed: 0.88, // vegetative mass on ungrazed ground
  grassRegrow: 0.028, // per month toward grassSeed
  overgrazeDamage: 0.16, // extra grass loss per month per unit above capacity
  // Vegetated AREA shrinks only under sustained heavy pressure (the sod is
  // torn up, p.81) and is slow to return. This is the point of no return.
  sodDamage: 0.006,
  sodRecover: 0.0012,

  // ---------------- water --------------------------------------------------
  // "groundwater is a resource that cannot easily be replaced" (p.4).
  recharge: 0.16, // refill per month at rain = 1: slow, "cannot easily be replaced" (p.4)
  drawPerWell: 0.487, // a serious well programme outdraws the seepage from the start
  wellDrawFeedback: 3.4, // sustained drilling: draw compounds with the depletion already reached
  drawPerIrrigation: 0.028, // irrigated pasture+millet: the biggest consumer once switched on
  // Well/irrigation output vs. how much is left in the aquifer. [GAP] the book
  // says only "the wells start yielding less" (p.83); a saturating curve is
  // the simplest shape that makes the decline weak at first, then abrupt.
  yieldCurve: 2.2, // >1: a falling aquifer sags well output quickly (p.83 "the wells start yielding less")

  // ---------------- animal health -----------------------------------------
  tsetseBase: 1.0,
  tsetseCattleLoss: 0.0022, // per month at tsetse = 1 ("prevented any significant increase", p.3)

  // ---------------- people -------------------------------------------------
  // Food measured so that feed = 1.0 is a comfortable diet: the food supply
  // divided by (mouths x satFeed). Supply is LINEAR in investment; population
  // grows EXPONENTIALLY when food is plentiful (p.14).
  satFeed: 0.55,
  childRation: 0.53, // a dependent eats about half an adult ration
  youthInitial: 0.24, // [GAP] dependent share at the start
  youthLag: 57, // months before a boom's extra hands accrue (F-05, F-07)
  youthMax: 0.38, // F-20: ceiling on the dependent share
  youthRise: 0.021, // monthly approach of the dependent share toward its boom level
  youthFall: 0.01, // it comes down even more slowly
  foodScale: 20000, // rations per unit of food yield
  herdGrowth: 0.020, // cattle growth per month at full water
  birthBase: 0.018, // [GAP] crude birth rate per month at full food
  deathBase: 0.0085, // [GAP] crude death rate per month before medicine
  healthEffect: 0.87, // max proportional cut in mortality from a health service (F-17)
  birthControlEffect: 0.60, // max proportional cut in the birth rate
  birthControlRamp: 0.06, // the Moros resist; effect builds over ~3 years (p.81)
  hungerDeathScale: 0.37, // at feed = 0 nearly a third of the population dies each month (p.81)
  famineThreshold: 0.62,
  // F-25: crowding mortality — the quiet brake that keeps a subsistence
  // population level (disease, infant loss, late marriage) before famine.
  crowdOnset: 2.0, // crowding (pop / starting pop) at which it starts to bite
  crowdFull: 4.0, // crowding at which the brake reaches full strength
  crowdDeathScale: 0.008, // extra monthly mortality at full crowding
  famineRamp: 3.0, // F-23: >1 keeps the brake off above the threshold and brutal below it

  // ---------------- agriculture -------------------------------------------
  // F-19: calibration that actually produces the book's famines. Earlier values
  // split the diet roughly evenly between grain and orchard fruit; then no
  // policy could starve the country, because fruit trees kept bearing when the
  // fields and the herd failed. Grain is the staple and fruit is a supplement.
  milletYield: 0.27, // rations per unit acreage at rain=1, full pests [GAP]
  orchardYield: 0.16, // fruit is a supplement, not the diet
  acreageMax: 2.4,
  acreagePerHead: 1.5, // F-24: land cleared per head of population pressure
  acreageStress: 2.2, // F-24: how hard hunger drives clearing of new land
  acreageGrowth: 0.004, // per month toward the acreage the population needs
  // F-28: mechanisation. The book names tractors explicitly (p.12) and the
  // "fifty tractors to clear the southern forests" episode (p.18) is one of its
  // set pieces, but the game had no way for the player to order it. Tractors
  // raise the *rate* at which land is cleared, not the yield per acre — the
  // book's point is that the participant cleared more land, not better land.
  tractorClear: 0.016, // extra monthly acreage approach rate at full mechanisation
  // F-28: the soil cost must be large enough to matter, or the measure is free.
  // At 0.35 the penalty at full mechanisation was only x0.785, and tractors
  // walked away with +50% acreage for almost nothing — the opposite of the
  // book's lesson. Newly cleared ground worked by heavy machinery erodes; the
  // exponent is set so full mechanisation costs roughly a quarter of the yield.
  tractorDegrade: 1.30,
  tractorForest: 0.0022, // extra forest lost per month to tracked clearance
  costTractor: 900,
  landDegradation: 0.3,
  labourWeight: 0.25,
  pestCropLoss: 0.23, // share of crop lost to mice/rats/monkeys at baseline
  insectCropLoss: 0.12,

  // ---------------- prices & costs ----------------------------------------
  priceCattle: 34,
  priceMillet: 22,
  costWell: 700,
  costClinic: 600,
  costFertilizer: 320,
  costPest: 140,
  costBC: 200,
  costIrrigation: 450,
};

export const MONTHLY_COSTS = {
  wells: 22,
  clinics: 30,
  fertilizer: 26,
  pest: 8,
  birthControl: 18,
  irrigation: 10,
  tractors: 38,
};

// -----------------------------------------------------------------------------
// Initial state — raw numbers only; derive() computes the rest.
// -----------------------------------------------------------------------------
export function initialState(seed = 12345) {
  return {
    month: 0,
    rngState: seedState(seed),
    rain: 1,
    groundwater: C.groundwater0,
    vegetated: 1.0,
    grass: 0.78,
    cattle: C.cattle0,
    tsetse: C.tsetseBase,
    smallMammals: 1.0,
    insects: 1.0,
    predators: 1.0,
    forest: 1.0,
    capital: C.capital0,
    popTupis: C.tupis0,
    popMoros: C.moros0,
    millet: 1.0,
    intensity: 1.0, // farming intensity: rises only with investment (F-12)
    orchard: 0.55,
    bcRamp: 0,
    youth: C.youthInitial,
    boomMonths: 0,
    famines: [],
    history: [],
  };
}

// -----------------------------------------------------------------------------
// Derived quantities
// -----------------------------------------------------------------------------
export function derive(s) {
  const grassReservoir = Math.max(0, s.grass) * Math.max(0, s.vegetated);
  const carryingCapacity = grassReservoir * C.cattleCapPerGrass;
  const pestFactor = clamp(1 - C.pestCropLoss * s.smallMammals - C.insectCropLoss * s.insects, 0.05, 1.2);
  const pasture = Math.min(1.25, s.cattle / C.cattle0);
  const fertility = Math.min(1.1, s.vegetated * (0.85 + 0.15 * s.grass));
  return { grassReservoir, carryingCapacity, pestFactor, pasture, fertility };
}

// -----------------------------------------------------------------------------
// One-time capital spend for switching measures on.
// -----------------------------------------------------------------------------
export function oneTimeCost(prev, next) {
  let cost = 0;
  const add = (k, unit) => {
    if ((next[k] || 0) > (prev[k] || 0)) cost += ((next[k] || 0) - (prev[k] || 0)) * unit;
  };
  add('wells', C.costWell);
  add('clinics', C.costClinic);
  add('fertilizer', C.costFertilizer);
  add('pest', C.costPest);
  add('birthControl', C.costBC);
  add('irrigation', C.costIrrigation);
  add('tractors', C.costTractor);
  return -cost;
}

export function monthlyCost(p) {
  return (
    (p.wells || 0) * MONTHLY_COSTS.wells +
    (p.clinics || 0) * MONTHLY_COSTS.clinics +
    (p.fertilizer || 0) * MONTHLY_COSTS.fertilizer +
    (p.pest || 0) * MONTHLY_COSTS.pest +
    (p.birthControl || 0) * MONTHLY_COSTS.birthControl +
    (p.irrigation || 0) * MONTHLY_COSTS.irrigation +
    (p.tractors || 0) * MONTHLY_COSTS.tractors
  );
}

// -----------------------------------------------------------------------------
// step() — advance exactly one month.
// -----------------------------------------------------------------------------
export function step(prev, policy) {
  const s = structuredClone(prev);
  // NOTE (F-03): the RNG must run on a *persistent* generator. A fresh
  // generator per step would re-use the first value every month, freezing the
  // rain (and every stochastic term) for the whole year. state.rngState is
  // parked at round 1000 + n so no round lands in mulberry32's warm-up.
  const rand = rng(s.rngState);
  s.month += 1;
  s.rngState = Math.floor(rand() * 4294967296);
  const p = policy || {};

  // Rain drifts annually around 1.0 (0.74–1.26): this is what disguises a
  // failing well as "a year with a little less rainfall" (p.83).
  if (s.month % 12 === 1) s.rain = 0.82 + rand() * 0.36; // 0.82-1.18 around 1.0

  const d = derive(s);

  // ======================= WATER ===========================================
  // Positive feedback (p.84): less water -> more wells -> less water.
  // A "well programme" is sustained drilling, not one borehole: as the water
  // table falls, pumps must go deeper and work harder, so the draw grows with
  // the depletion already reached (C.wellDrawFeedback). This is the loop the
  // book describes; without it a constant programme cannot accelerate a crash.
  const depletion = 1 - clamp(s.groundwater / C.groundwaterMax, 0, 1);
  const drilling = 1 + C.wellDrawFeedback * depletion * depletion;
  const draw =
    (p.wells || 0) * C.drawPerWell * drilling +
    (p.irrigation || 0) * C.drawPerIrrigation * (1.5 + s.millet + s.vegetated);
  s.groundwater = clamp(s.groundwater + s.rain * C.recharge - draw, 0, C.groundwaterMax);
  const aquifer = s.groundwater / C.groundwaterMax;
  const waterYield = Math.pow(clamp(aquifer, 0, 1), C.yieldCurve);

  // ======================= TSETSE ==========================================
  // Campaign suppresses the fly; the fly needs cattle to persist (p.3, p.80).
  const cattleish = clamp(s.cattle / C.cattle0, 0, 1.6);
  s.tsetse = clamp(
    s.tsetse +
      0.07 * (Math.min(1.3, 0.35 + 0.75 * cattleish) - s.tsetse) -
      (p.tsetseKill || 0) * 0.24,
    0,
    1.35,
  );

  // ======================= CATTLE & GRASS ==================================
  // Water and fly control drive growth; the grass sets the ceiling.
  const tsetseLoss = C.tsetseCattleLoss * s.tsetse * 12;
  // The herd's ceiling. Grass is a stock that must feed the herd; 1.4 cattle
  // can share the grass supported by 1, and productivity degrades as the
  // pasture wears (derived capacity already shrinks with the vegetated area).
  const capacity = Math.max(1, d.carryingCapacity * 1.4);
  const waterForHerd = 0.35 + 0.65 * waterYield;
  const relativeDensity = s.cattle / capacity;
  const herdGrowth = C.herdGrowth * waterForHerd * (1 - tsetseLoss) * (1 - Math.pow(clamp(relativeDensity, 0, 2), 2) * 0.7);
  s.cattle = Math.max(0, s.cattle + s.cattle * (herdGrowth - tsetseLoss));

  // Predatory cats switch to cattle when their small-mammal prey is gone
  // (p.15: "deprived of the small mammals ... they take to feeding on cattle").
  const catPressure = clamp(1 - s.smallMammals / 0.5, 0, 1);
  s.cattle = Math.max(0, s.cattle - s.cattle * 0.010 * catPressure * s.predators);

  // Overgrazing — the positive-feedback loop of p.81: less grass -> hungrier
  // cattle -> more damage to the sod. Damage is mild just above capacity and
  // catastrophic further above it (the "tearing up by the roots" regime).
  const pressure = s.cattle / capacity;
  let grassDelta = C.grassRegrow * s.rain * (1 - s.grass / C.grassSeed) * (0.6 + 0.6 * waterYield);
  if (pressure > 1) {
    const excess = pressure - 1;
    grassDelta -= C.overgrazeDamage * excess * s.grass;
    s.vegetated = Math.max(0.03, s.vegetated - C.sodDamage * excess * excess * s.vegetated);
  } else {
    // Irrigation can enlarge pasture ("the vegetated area increased", p.80).
    const expand = (p.irrigation || 0) * waterYield * 0.004 * (1 - s.vegetated);
    s.vegetated = Math.min(1.25, s.vegetated + expand + (s.vegetated < 1 ? C.sodRecover * 0.2 : 0));
  }
  s.grass = clamp(s.grass + grassDelta, 0.01, C.grassSeed);

  // Herd restraint: cull/sell to protect the sod. "Seems excessive and
  // inappropriately brutal until the point where it will no longer do any
  // good" (p.81) — the timing trap.
  // Herd restraint: cull/sell to protect the sod. "Seems excessive and
  // inappropriately brutal until the point where it will no longer do any
  // good" (p.81) — the timing trap.
  //
  // F-36: this is a *herd limit*, not a slaughter rate. It used to remove 6% of
  // the herd every month at full strength, which is ~52% a year — applied for ten
  // straight years it wiped out the herd no matter what else the player did, so
  // "herd limit" scored WORSE than doing nothing (herd 0.03 vs 0.34). A limit
  // should hold the herd near a ceiling and leave the rest standing.
  let culled = 0;
  if ((p.herdLimit || 0) > 0) {
    const ceiling = Math.max(1, d.carryingCapacity) * (1 - 0.5 * (p.herdLimit || 0));
    if (s.cattle > ceiling) {
      culled = (s.cattle - ceiling) * 0.35; // step toward the ceiling, not past it
      s.cattle -= culled;
    }
  }

  // ======================= PESTS (p.15) ====================================
  s.smallMammals = clamp(s.smallMammals + 0.12 * (1 - s.smallMammals) - 0.34 * (p.pest || 0), 0.04, 1.3);
  s.insects = clamp(
    s.insects + 0.10 * (0.5 - s.insects) + 0.20 * clamp(1 - s.smallMammals, 0, 1),
    0.2,
    2.2,
  );
  s.predators = clamp(s.predators + 0.05 * (s.smallMammals - s.predators), 0.2, 1.6);

  // ======================= LAND ============================================
  // Population pressure clears forest; forests are the Tupis' fuel & fruit.
  const popTotal = s.popTupis + s.popMoros;
  const tractors = clamp(p.tractors || 0, 0, 1);
  // F-28: tractors strip forest far faster than people with axes do. This is the
  // "fifty tractors to clear the southern forests" episode (p.18) made mechanical.
  s.forest = Math.max(
    0.05,
    s.forest -
      0.00035 * (popTotal / (C.tupis0 + C.moros0)) * (1 + (p.fertilizer || 0) * 0.4) -
      C.tractorForest * tractors
  );
  s.orchard = clamp(s.orchard + 0.04 * (0.9 * s.forest * d.fertility - s.orchard), 0.1, 1.3);

  // Millet acreage follows the Tupi population (p.86: "merely a reflection of
  // population growth"). It does not create new land — the acreage cap is the
  // share of the region still cultivable.
  // The cultivable ceiling is the share of the region still vegetated, but
  // clearing new land is work the Tupis can only do at a pace: acreage creeps
  // up toward it rather than snapping there (F-09).
  //
  // F-24: acreage must chase the *food need*, not merely track the farmer
  // headcount. Targeting `popTupis / tupis0` capped acreage at ~1.24 even when
  // the ceiling was wide open, because the farmer population and the acreage
  // target were the same number — so the country could never expand onto the
  // land it had, and supply froze while people kept multiplying. Clearing land
  // now responds to how hungry the country is.
  const acreageCeiling = Math.max(0.15, C.acreageMax * clamp(s.vegetated, 0, 1.25));
  const feedPrev = s.history.length ? s.history[s.history.length - 1].food : 1;
  const needAcreage = (popTotal / (C.tupis0 + C.moros0)) * C.acreagePerHead;
  const acreageTarget = clamp(
    Math.max(s.popTupis / C.tupis0, needAcreage * clamp(1 / Math.max(0.25, feedPrev), 0.6, C.acreageStress)),
    0.2,
    acreageCeiling
  );
  // F-28: tractors make clearing faster — the rate rises, the ceiling does not,
  // because the ceiling is how much land is still vegetated to clear.
  const clearRate = C.acreageGrowth + C.tractorClear * tractors;
  s.millet = clamp(s.millet + clearRate * (acreageTarget - s.millet), 0.2, acreageCeiling);
  // F-12: production per acre is an *investment*, not a gift of population.
  // Fertiliser and irrigation raise intensity; it decays back without them.
  // Workers per acre only *limit* how far intensity can go, so a population
  // that outgrows its land cannot feed itself no matter how many hands it has.
  const effort = (p.fertilizer || 0) + 0.5 * (p.irrigation || 0) * waterYield;
  const workersPerAcre = s.popTupis / Math.max(0.2, s.millet * C.tupis0);
  const intensityCeiling = Math.min(2.2, 1 + 1.2 * effort) * clamp(workersPerAcre, 0.35, 1.25) ** 0.5;
  s.intensity = clamp(s.intensity + 0.05 * (intensityCeiling - s.intensity), 0.55, 2.2);

  // ======================= FOOD ============================================
  // F-06: land and acreage are THE SAME LAND. Multiplying acreage by the
  // vegetated share *and* capping acreage by that share counts the same loss
  // twice. The acreage cap above is the single place sod loss enters the crop
  // economics: land gone means acreage gone.
  const pest = d.pestFactor;
  const irrigationBoost = 1 + 1.6 * (p.irrigation || 0) * waterYield;
  const fertilizerBoost = 1 + 0.75 * (p.fertilizer || 0);
  const milletYield =
    C.milletYield * s.millet * s.rain * pest * (0.55 + 0.45 * waterYield) * fertilizerBoost * irrigationBoost;
  // F-18: orchards are fruit from trees that stand among the forests: they keep
  // bearing through a cattle catastrophe, so they must NOT scale with the sod
  // or they would mask every famine the model is trying to teach. They are
  // also only a minor share of the diet — the staple is grain. (F-19 made them
  // minor; before that, orchard yield carried the food supply and no scenario
  // could ever cross the famine threshold.)
  const orchardYield = C.orchardYield * s.orchard * s.rain * pest;
  // [GAP] Cattle feed people only to a minor extent. The book's cattle
  // catastrophes starve the Moros because the herd is their *capital* and
  // their *export*, not because beef is the daily staple — so herd food is
  // deliberately small and herd death is a money/exports shock.
  const herdFood = 0.04 * Math.min(1.4, s.cattle / C.cattle0) * s.rain;
  const drawnFood = 0.04 * Math.min(1.2, s.forest);
  // Monthly food in "ration units" (1 unit = one comfortable ration).
  // F-05: harvest depends on the *working* population. A youthful population
  // has more mouths than hands, so a baby boom is a food deficit now and a
  // surplus a generation later — the lag the book calls the catastrophe trap.
  const youth = clamp(s.youth, 0, 0.6);
  // F-11: farmland is NOT proportional to hands. In a subsistence economy the
  // cultivated area is roughly the arable area, so extra people do not produce
  // proportionally extra grain — that was the bug that made every scenario
  // converge on the same food ceiling. The baby-boom penalty on supply comes
  // in only where labour is actually *diluted* among more mouths.
  // F-13: as population outgrows the land it works, falls of food are worked
  // onto slopes, marginal soils and ever more distant plots; yield per acre
  // drops with population pressure (p.13: improved food supply flatly failed
  // to keep pace). Without this diminishing return the population simply
  // climbs to whatever the land can ever produce and never suffers.
  //
  // F-15: the herd is the land's other user. Losing it is not only an export
  // shock: milk, draught power and manure go with it, so farm yields suffer
  // while the people do not shrink (book p.82: once the grass disappears the
  // cattle do too, and the Moros are short of food).
  // F-26: pressure is people PER ACRE, not people per country.
  //
  // Using raw population made clearing new land pointless: acreage rose from
  // 1.0 to 1.7 while the yield penalty deepened from 0.75 to 0.33, so the
  // country worked harder for less and slid into famine from a standing start
  // (the idle run starved from month ~150 no matter how the other constants
  // were set). Pressure on the land is real, but it must be measured against
  // the land actually being worked — otherwise the model punishes the very
  // response that should help.
  const pressureOnLand = Math.max(1, popTotal / (C.tupis0 + C.moros0) / Math.max(0.5, s.millet));
  const stockOnLand = Math.max(1, C.cattle0 / Math.max(1, s.cattle));
  // F-21: the labour in the field is the subset that can work, so a country
  // whose mouths outrun its hands must squeeze more out of the same land —
  // which is precisely the diminishing return above. Keeping a worker term
  // (rather than the flat `1 - youth` supply penalty of F-11) is what lets a
  // baby boom bite as a shortage now and pay off as hands later.
  const handsPerHead = Math.max(0.55, 1 - youth);
  // F-28: heavy machinery worked hard across freshly cleared, fragile ground
  // damages the soil — the same "existing problems solved without thought for
  // the repercussions" pattern the book draws out of the tractor episode.
  const tractorSoil = Math.pow(1 + tractors, -C.tractorDegrade);
  const landDegradation =
    Math.pow(pressureOnLand * stockOnLand, -C.landDegradation) *
    Math.pow(handsPerHead, C.labourWeight) *
    tractorSoil;
  const foodSupply =
    (milletYield + orchardYield + herdFood + drawnFood) *
    C.foodScale *
    s.intensity *
    landDegradation *
    (0.94 + 0.06 * s.rain);

  // F-05: demand counts every head, and a dependent eats about half an adult
  // ration. The trap is on the *supply* side (above): new children are mouths
  // at once but producers only a generation later.
  const mouths = popTotal * (1 + C.childRation * youth);
  const feed = foodSupply / Math.max(1, mouths * C.satFeed); // 1.0 = comfortable
  const hunger = clamp((1 - feed) / (1 - C.famineThreshold), 0, 1);

  // ======================= PEOPLE ==========================================
  s.bcRamp = clamp(s.bcRamp + ((p.birthControl || 0) > 0 ? C.birthControlRamp : -C.birthControlRamp), 0, 1);
  const bcStrength = (p.birthControl || 0) * s.bcRamp;

  // Births fall a little when people go hungry (the body's answer to famine),
  // and more when the herd — which pays for weddings, milk and bride-price —
  // has died: "the loss of their cattle also means the loss of one of their
  // two export goods, they are also short of money ... famine is a certainty"
  // (p.82).
  const herdWealth = clamp(s.cattle / (C.cattle0 * 0.75), 0.3, 1);
  // F-04: human fertility is nearly flat with food across the whole normal-to-
  // hungry range; it only falls away in open famine. The book (p.81): "the
  // population after all these measures grows in an exponential curve". A
  // strongly food-dependent birth rate makes plentiful food *switch growth
  // off*, and then the population catastrophe of fig. 3 can never happen.
  const birthRate =
    C.birthBase *
    (1 - C.birthControlEffect * bcStrength) *
    (0.995 + 0.005 * clamp(feed, 0, 1)) *
    (0.85 + 0.15 * herdWealth);
  // F-23: the famine brake must be OFF above the threshold and steep below it.
  //
  // Earlier shapes had a fatally attractive fixed point. With a *linear*
  // shortfall (ramp = 1) the equilibrium self-selected to exactly food = 0.60
  // for every parameter set tried — 30 runs, always 0.600, always just under
  // the famine threshold — so the idle run always starved no matter how the
  // economy was tuned. That is not a calibration problem, it is the shape of
  // the curve: mortality that grows linearly from the threshold always meets
  // births a little below it.
  //
  // Above the threshold, mortality is the plain peacetime rate and the country
  // grows (p.81 "grows in an exponential curve"). Below it, mortality rises
  // steeply, so a population that overshoots is cut back hard and the book's
  // "wipes out practically the entire population" (p.81) can happen.
  const shortfall = Math.max(0, 1 - feed / C.famineThreshold); // 0 when adequate, 1 at empty
  const hungerKill = C.hungerDeathScale * Math.pow(shortfall, C.famineRamp);

  // F-25: benign mortality rises with crowding BEFORE famine begins.
  //
  // Without this the only brake on population was outright famine, so the idle
  // run grew until it overshot the land, starved, recovered, and overshot
  // again — a sawtooth that starved even the do-nothing scenario (100+ famine
  // months over 20 years), which contradicts the book's counterfactual that
  // they "would not have starved" (p.82). Real subsistence populations level
  // off at their carrying capacity through disease, infant mortality and
  // delayed marriage. Modelling that as a gentle rise in mortality as the
  // country fills up gives the idle run a *stable* equilibrium and leaves the
  // spectacular famine for the runs that genuinely overshoot it.
  const crowding = clamp(popTotal / (C.tupis0 + C.moros0), 0, C.crowdFull);
  const crowdKill = C.crowdDeathScale * Math.pow(clamp((crowding - C.crowdOnset) / (1 - C.crowdOnset), 0, 1), 2);

  const deathRate =
    C.deathBase * (1 - C.healthEffect * clamp(p.clinics || 0, 0, 1)) + crowdKill + hungerKill;

  const tupiShare = clamp(s.popTupis / Math.max(1, popTotal), 0.35, 0.9);
  const births = popTotal * birthRate;
  const deaths = popTotal * deathRate;
  s.popTupis = Math.max(0, s.popTupis + (births - deaths) * tupiShare);
  s.popMoros = Math.max(0, s.popMoros + (births - deaths) * (1 - tupiShare));

  // F-05: a baby boom is a food deficit *now* and a labour surplus a
  // generation later — the asymmetry the book plots as the "catastrophe trap"
  // (fig. 3: linear food, exponential people).
  //
  // F-07: the signal must start moving on the FIRST month of a boom. Earlier
  // this was gated on youthLag consecutive positive months, so any run with a
  // lean season every year reset the counter and the mechanism never fired at
  // all (H14_medicine_famines failed on every seed). The lag now applies to
  // the *consequence*, not to the trigger: surviving children are extra mouths
  // immediately, and the extra working hands accrue in after youthLag months.
  const survivalPerHead = (births - deaths) / Math.max(1, popTotal);
  s.boomMonths =
    survivalPerHead > 0.0008
      ? Math.min(C.youthLag * 2, (s.boomMonths | 0) + 1)
      : Math.max(0, (s.boomMonths | 0) - 2);
  // Dependent share climbs toward the boom level...
    // F-20: the dependent share may rise toward the boom level but is capped at
  // youthMax. It was drifting to 0.5+, which doubled demand and made the
  // whole population permanently half-starved -- including the idle run, so
  // the medicine catastrophe could not show.
  const youthTarget = Math.min(
    C.youthMax,
    C.youthInitial + (C.childRation * 2 - C.youthInitial) * Math.min(1, s.boomMonths / C.youthLag)
  );
  s.youth = clamp(s.youth + (youthTarget - s.youth) * C.youthRise, 0, 0.6);

  // ======================= ECONOMY =========================================
  s.capital += culled * C.priceCattle * 0.8;
  const surplusCattle = Math.max(0, s.cattle - C.cattle0);
  s.capital += surplusCattle * 0.012 * C.priceCattle;
  s.capital += Math.max(0, s.millet - 1.0) * 0.25 * C.priceMillet;
  s.capital -= monthlyCost(p);

  // ======================= RECORD ==========================================
  const newD = derive(s);
  const famine = feed < C.famineThreshold;
  const cattleRationed = Math.max(0, (1 - feed)) * (p.herdLimit || 0) * s.cattle * 0.02;
  if (famine) s.famines.push({ month: s.month, deaths: Math.round(deaths + cattleRationed) });

  s.history.push({
    month: s.month,
    rain: r3(s.rain),
    groundwater: r2(s.groundwater),
    vegetated: r3(s.vegetated),
    grass: r3(s.grass),
    cattle: Math.round(s.cattle),
    tsetse: r3(s.tsetse),
    capital: Math.round(s.capital),
    popTupis: Math.round(s.popTupis),
    popMoros: Math.round(s.popMoros),
    millet: r3(s.millet),
    orchard: r3(s.orchard),
    food: r3(feed),
    famine,
    capacity: Math.round(newD.carryingCapacity),
  });
  return s;
}

// helpers ---------------------------------------------------------------------
export function clamp(v, lo, hi) {
  return v < lo ? lo : v > hi ? hi : v;
}
function r2(v) { return Math.round(v * 100) / 100; }
function r3(v) { return Math.round(v * 1000) / 1000; }
