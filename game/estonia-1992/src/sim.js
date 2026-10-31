// The Estonian economy, November 1992 – October 1994, in monthly steps.
// A small economic microworld: stocks, flows, feedback loops,
// delays — and deliberate intransparency. The hidden stocks (credibility,
// resentment, capacity, bank health, openness) are never shown as numbers;
// the player sees only the reports a ministry would send.

export const TOTAL_MONTHS = 24; // November 1992 → October 1994

const clamp = (v, lo, hi) => Math.min(hi, Math.max(lo, v));

const MONTH_NAMES = ["January", "February", "March", "April", "May", "June",
  "July", "August", "September", "October", "November", "December"];

export function monthLabel(m) {
  // month 0 = November 1992; count in absolute months so the year rolls over
  const absolute = 1992 * 12 + 10 + m;
  const year = Math.floor(absolute / 12);
  const name = MONTH_NAMES[absolute % 12];
  return `${name} ${year}`;
}

export function freshSim() {
  return {
    month: 0,
    treasury: 8,          // millions of krooni
    debt: 0,
    inflation: 1070,      // annual %
    output: 62,           // industrial output index, 1989 ≈ 100
    unemployment: 4.2,    // official %
    realWage: 54,         // index, autumn 1991 = 100
    trust: 38,            // % who say the situation is improving
    enterprises: 2000,
    // ── hidden stocks ──
    credibility: 45,
    resentment: 55,
    capacity: 40,
    bankHealth: 28,
    openness: 25,
    closeMonth: null,     // when the mills were shut, if they were
    bankPanic: true,      // accounts frozen from the first weeks
    millsUnresolved: true,
    pensionArrears: 2,
    winterShockDone: false,
    // ── policy flags ──
    cutSubsidies: false,
    ministryCuts: false,
    taxBoard: false,
    budgetBalanced: false,
    bankBridge: false,
    banksClosed: false,
    bankGuarantee: false,
    bankAudited: false,
    pensionMode: null,    // 'full' | 'half' | 'delay'
    millPolicy: null,     // 'subsidy' | 'close' | 'slow' | 'sell'
    simpleCode: false,
    bigCode: false,
    ministryRules: false,
    tariffsAbolished: false,
    foreignLaw: false,
    coreSales: false,
    vouchers: false,
    insiderSales: false,
    flatTax: false,
    // ── record ──
    measures: [],         // { month, id }
    series: [],
  };
}

// One-off + flag effects of a decision. step() reads the flags every month.
export function applyMeasure(s, id) {
  s.measures.push({ month: s.month, id });
  switch (id) {
    case "cut-subsidies":
      s.cutSubsidies = true;
      s.unemployment += 1.0; s.resentment += 6; s.credibility += 5; s.output -= 2;
      break;
    case "ministry-cuts":
      s.ministryCuts = true;
      s.capacity -= 4; s.resentment += 4; s.credibility += 3;
      break;
    case "borrow":
      s.treasury += 45; s.debt += 45;
      s.credibility -= 9; s.inflation += 24; s.trust += 4;
      break;
    case "bridge-budget":
      s.treasury += 16; s.debt += 16;
      s.credibility -= 2; s.resentment += 2;
      break;
    case "tax-board":
      s.taxBoard = true; s.capacity += 6; s.credibility += 2; s.treasury -= 3;
      break;
    case "budget-present":
      s.budgetBalanced = true;
      s.credibility += 7; s.resentment += 3; s.trust -= 3;
      break;
    case "borrow-small":
      s.treasury += 20; s.debt += 20;
      s.credibility -= 5; s.inflation += 10;
      break;
    case "budget-delay":
      s.credibility -= 6; s.resentment += 4; s.inflation += 8;
      break;
    case "keep-tariffs":
    case "keep-progressive":
      // the old system stays; its costs are charged monthly in step()
      break;
    case "bank-close":
      s.bankPanic = false; s.banksClosed = true;
      s.bankHealth = clamp(s.bankHealth + 18, 0, 100);
      s.credibility += 12; s.trust -= 7; s.resentment += 5;
      s.treasury -= 22;
      break;
    case "bank-guarantee":
      s.bankPanic = false; s.bankGuarantee = true;
      s.treasury -= 30; s.trust += 6; s.credibility -= 5;
      break;
    case "bank-bridge":
      s.bankPanic = false; s.bankBridge = true;
      s.credibility += 2;
      break;
    case "pension-full":
      s.pensionMode = "full"; s.pensionArrears = 0;
      s.trust += 9; s.resentment -= 6;
      break;
    case "pension-half":
      s.pensionMode = "half"; s.pensionArrears = 1;
      s.trust += 2;
      break;
    case "pension-delay":
      s.pensionMode = "delay"; s.pensionArrears += 2;
      s.credibility += 4; s.resentment += 10; s.trust -= 6;
      break;
    case "energy-credit":
      s.treasury -= 25; s.resentment -= 6; s.trust += 4;
      s.winterShockDone = true;
      break;
    case "endure-winter":
      s.resentment += 7; s.trust -= 4;
      s.winterShockDone = true;
      break;
    case "mill-subsidy":
      s.millsUnresolved = false; s.millPolicy = "subsidy";
      s.resentment -= 5; s.trust += 5; s.credibility -= 4;
      break;
    case "mill-close": // the Elcoteq agreement: buy out, close, no bankruptcy
      s.millsUnresolved = false; s.millPolicy = "close"; s.closeMonth = s.month;
      s.treasury -= 60; s.unemployment += 3.2; s.resentment += 12;
      s.credibility += 10; s.output -= 4;
      break;
    case "sign-slow": // the same, stretched over two years with a fund
      s.millsUnresolved = false; s.millPolicy = "slow"; s.closeMonth = s.month;
      s.treasury -= 26; s.unemployment += 1.7; s.resentment += 6;
      s.credibility += 4;
      break;
    case "mill-sell":
      s.millsUnresolved = false; s.millPolicy = "sell"; s.closeMonth = s.month;
      s.treasury += 30; s.unemployment += 1.8; s.resentment += 6;
      break;
    case "law-simple":
      s.simpleCode = true; s.capacity += 12; s.credibility += 4; s.treasury -= 4;
      break;
    case "law-big":
      s.bigCode = true; s.capacity += 4; s.treasury -= 12;
      break;
    case "law-ministries":
      s.ministryRules = true; s.capacity -= 8; s.credibility -= 6; s.resentment += 4;
      break;
    case "trade-open":
      s.tariffsAbolished = true; s.openness += 30; s.inflation *= 0.93;
      s.credibility += 6; s.enterprises = Math.round(s.enterprises * 1.04);
      break;
    case "foreign-law":
      s.foreignLaw = true; s.openness += 20; s.treasury -= 2;
      s.enterprises = Math.round(s.enterprises * 1.05);
      break;
    case "priv-core":
      s.coreSales = true; s.openness += 12; s.credibility += 8;
      s.resentment += 6; s.treasury += 45; s.capacity += 6;
      break;
    case "priv-vouchers":
      s.vouchers = true; s.treasury -= 18; s.trust += 8; s.capacity -= 4;
      break;
    case "priv-insider":
      s.insiderSales = true; s.resentment -= 4; s.trust += 2;
      s.capacity -= 8; s.credibility -= 6;
      break;
    case "tax-flat":
      s.flatTax = true; s.trust -= 3; s.credibility += 3;
      break;
    case "save-coalition":
      s.capacity -= 6; s.credibility -= 8; s.trust += 5; s.resentment -= 3;
      break;
    case "resign-gov":
      s.credibility += 8; s.capacity += 5; s.trust -= 4; s.resentment += 4;
      break;
    case "appeal-country":
      s.trust += 2; s.credibility += 1;
      break;
  }
  // a signed payment cannot leave the treasury overdrawn: the shortfall is
  // borrowed immediately, exactly as step() does at month-end
  if (s.treasury < 0) {
    s.debt += -s.treasury;
    s.treasury = 0;
    s.credibility -= 1.5;
  }
}

export function step(s) {
  // ── the budget, month by month ──
  let revenue = 96 + s.enterprises / 900;
  if (s.flatTax) revenue *= 1.07;
  if (s.tariffsAbolished) revenue *= 0.93;
  if (s.ministryRules) revenue *= 0.96;
  if (s.taxBoard) revenue *= 1.05;
  let spending = 118;
  if (s.cutSubsidies) spending -= 18;
  if (s.ministryCuts) spending -= 9;
  if (s.millPolicy === "subsidy") spending += 22;
  if (s.pensionMode === "full") spending += 14;
  if (s.pensionMode === "half") spending += 7;
  if (s.bankGuarantee) spending += 4;
  if (s.bankBridge) spending += 8;
  if (s.millPolicy === "slow") spending += 4;
  const balance = revenue - spending;
  s.treasury += balance;

  // An empty treasury cannot wait. It borrows, and the borrowing leaks into
  // prices — the currency board's quiet warning.
  if (s.treasury < 0) {
    s.debt += -s.treasury;
    s.treasury = 0;
    s.credibility -= 2.2;
    s.inflation += 14;
  }
  if (s.debt > 0) {
    s.treasury -= s.debt * 0.02;
    s.credibility -= 0.5;
  }

  // ── inflation: momentum toward where the fundamentals put it ──
  let target = 26
    + Math.max(0, -balance) * 2.6
    + Math.max(0, 50 - s.credibility) * 3.2
    + (s.bankPanic ? 26 : 0)
    + (s.pensionMode === "full" ? 18 : s.pensionMode === "half" ? 7 : 0);
  if (s.tariffsAbolished) target -= 8;
  s.inflation = Math.max(22, s.inflation + (target - s.inflation) * 0.30);

  // ── output: the J-curve ──
  let dOut = -1.5;
  if (s.cutSubsidies) dOut -= 0.2;
  if (s.millPolicy === "subsidy") dOut += 0.7;
  if (s.bankPanic) dOut -= 0.8;
  dOut += (s.enterprises / 70000) * 4.2;
  dOut += (s.openness - 25) * 0.014;
  if (s.bigCode && s.month >= 12) dOut += 0.5;
  s.output = clamp(s.output + dOut, 38, 92);

  // ── unemployment: the closure shock is real but not permanent ──
  let dUn = 0.05;
  if (s.closeMonth !== null && s.month - s.closeMonth < 6) dUn += 0.28;
  if (s.millPolicy === "subsidy") dUn -= 0.14;
  if (s.enterprises > 15000) dUn -= 0.3;
  if (s.enterprises > 40000) dUn -= 0.15;
  s.unemployment = clamp(s.unemployment + dUn, 2.5, 16);

  // ── enterprises: the counterfactual economy being born ──
  let g = 0.045
    + (s.openness / 100) * 0.13
    + (s.capacity / 100) * 0.09
    + (s.flatTax ? 0.06 : 0)
    - (Math.max(0, s.inflation - 200) / 1000) * 0.2
    - (s.bankPanic ? 0.04 : 0);
  if (s.vouchers) g *= 0.65;
  if (s.insiderSales) g *= 0.72;
  if (s.millPolicy === "subsidy") g -= 0.012;
  s.enterprises = Math.round(s.enterprises * (1 + clamp(g, -0.015, 0.2)));

  // ── wages, pensions, trust, resentment ──
  s.realWage = clamp(s.realWage + (s.output - 62) * 0.022 - s.inflation / 5200 + 0.12, 30, 100);
  if (s.pensionMode === "delay") s.pensionArrears += 0.25;
  else s.pensionArrears = Math.max(0, s.pensionArrears - 0.5);

  let dTrust = (s.realWage - 52) * 0.05 - Math.max(0, s.inflation - 60) / 300 - s.unemployment * 0.05;
  if (s.enterprises > 30000) dTrust += 0.5;  // the new economy is felt in the towns
  if (s.inflation < 80) dTrust += 0.5;       // price stability, once it arrives, is felt too
  if (s.bankPanic) dTrust -= 1.4;
  s.trust = clamp(s.trust + dTrust, 2, 96);

  let dRes = s.unemployment * 0.045 + s.pensionArrears * 0.3 - (s.realWage - 50) * 0.04;
  if (s.realWage > 55) dRes -= 0.15;
  if (s.enterprises > 30000) dRes -= 0.2; // the new economy re-employs the anger
  if (s.millPolicy === "subsidy") dRes -= 0.5;
  s.resentment = clamp(s.resentment + dRes, 0, 100);

  // ── hidden stocks drift ──
  s.credibility = clamp(s.credibility + (balance > 0 ? 0.7 : -0.35) + (s.inflation < 120 ? 0.4 : -0.2), 0, 100);
  if (s.bankPanic) s.bankHealth = clamp(s.bankHealth - 1.6, 0, 100);
  else s.bankHealth = clamp(s.bankHealth + (s.banksClosed ? 0.8 : 0.2), 0, 100);
  if (s.simpleCode) s.capacity = clamp(s.capacity + 0.25, 0, 100);
  s.openness = clamp(s.openness + (s.tariffsAbolished ? 0.4 : -0.1), 0, 100);

  // ── history's own pressure ──
  if (s.month === 2 && !s.winterShockDone) { s.resentment += 8; s.trust -= 4; }
  if (s.bankPanic && s.month > 3) { s.credibility -= 1.2; s.output -= 0.6; s.trust -= 0.8; }
  if (s.millsUnresolved && s.month > 6) { s.resentment += 0.6; s.treasury -= 2; }

  // ── record ──
  s.series.push({
    month: s.month,
    inflation: Math.round(s.inflation),
    budget: Math.round(balance * 10) / 10,
    output: Math.round(s.output * 10) / 10,
    unemployment: Math.round(s.unemployment * 10) / 10,
    realWage: Math.round(s.realWage),
    trust: Math.round(s.trust),
    enterprises: s.enterprises,
    treasury: Math.round(s.treasury),
    debt: Math.round(s.debt),
  });

  s.month += 1;
  return s;
}

// ── the post: what a ministry would actually send after this month ──
export function collectPost(s) {
  const post = [];
  const m = s.month; // already advanced
  if (s.bankPanic && m > 1 && m % 2 === 0) {
    post.push({ id: `panic${m}`, kind: "signal", label: "Bank of Estonia", title: "The banks have stopped paying",
      body: `Depositors still queue outside the frozen banks. ${s.bankAudited ? "The audit confirms what you feared: they are insolvent, not illiquid." : "Nobody can say which are insolvent and which merely illiquid — no audit has been done."} Wages sit in frozen accounts while the banks stay unresolved.` });
  }
  if (m === 3 && !s.winterShockDone) {
    post.push({ id: "winter", kind: "letter", label: "A district governor writes", title: "The east is heating with wood",
      body: "Kohtra and Sillamäe report heating arrears in the millions. The power plant asks for the state's answer before the next frost. The governor does not ask for a policy; he asks whether the lights will stay on in January." });
  }
  if (s.millsUnresolved && m >= 7 && m % 3 === 0) {
    post.push({ id: `mills${m}`, kind: "letter", label: "From the weavers' council", title: "Narva is still waiting",
      body: "The looms stand, the orders have not come back, and the town asks the government the question it has been avoiding for a year: what is the state for, in a factory that cannot pay its wages?" });
  }
  if (s.pensionArrears > 2.5 && m % 3 === 0) {
    post.push({ id: `pension${m}`, kind: "letter", label: "From the trade union council", title: "The pension is behind the prices again",
      body: `Prices have risen while the pension stood still. The unions write that an indexation promised in the campaign is a debt like any other — and that the old are buying less bread this winter.` });
  }
  if (s.debt > 60 && m % 4 === 0) {
    post.push({ id: `debt${m}`, kind: "signal", label: "Ministry of Finance", title: "The treasury is borrowing to pay wages",
      body: `Debt stands near ${Math.round(s.debt)} million krooni. Short-term borrowing covers the gap between what the state promised and what it collects. The currency board does not lend — so the shortfall becomes prices.` });
  }
  if (s.enterprises > 8000 && m % 4 === 0) {
    post.push({ id: `firms${m}`, kind: "signal", label: "The registry", title: "New firms, faster than anyone expected",
      body: `The register now counts ${s.enterprises.toLocaleString("en-US")} enterprises. Most are small — a shop, a consultancy, a truck. Nobody ordered them into existence. Something is growing in the space the state has left.` });
  }
  if (s.inflation < 100 && m > 8 && m % 5 === 0) {
    post.push({ id: `prices${m}`, kind: "signal", label: "Statistical Office", title: "Prices are still rising — more slowly",
      body: `The annual rate stands near ${Math.round(s.inflation)}%. A year ago the same report read like a catastrophe. Stabilisation is arriving — visibly later than the pain that bought it.` });
  }
  return post;
}

// Advance one month: step the sim, gather the post.
export function runMonth(s) {
  step(s);
  return collectPost(s);
}

// ── the signs a briefing can honestly report (the visible layer) ──
export function visibleSigns(s) {
  const signs = [];
  signs.push(s.credibility > 65 ? "The kroon is trusted; the black-market premium has gone."
    : s.credibility > 40 ? "The kroon holds its peg, but quietly — exporters still hedge."
    : "The kroon is discussed in whispers; nobody wants to hold it long.");
  if (!s.bankAudited && s.bankPanic) signs.push("The banks' books are unread. The Bank of Estonia says an audit would take weeks.");
  signs.push(s.resentment > 65 ? "The mood in the towns is bitter; every cut is remembered."
    : s.resentment > 40 ? "The mood is tense but holding."
    : "The mood is bruised but patient.");
  return signs;
}

// The mood, as the quarterly poll reports it — with sampling noise. The
// ministry never publishes an exact figure; you get the poll you get.
export function poll(s, rng) {
  const noise = (rng() - 0.5) * 8;
  return Math.round(clamp(s.trust + noise, 0, 100));
}

export function smallRng(seed) {
  let v = seed % 2147483647;
  return () => { v = (v * 16807) % 2147483647; return (v - 1) / 2147483646; };
}

// ── the Amtsbilanz: grade, archetype, habits ──
export function finalAssessment(s) {
  const last = s.series.slice(-6);
  const avg = (key) => last.reduce((a, r) => a + r[key], 0) / last.length;
  const avgInflation = Math.round(avg("inflation"));
  const avgBudget = Math.round(avg("budget") * 10) / 10;

  let score = 0;
  score += avgInflation < 80 ? 3 : avgInflation < 200 ? 2 : avgInflation < 400 ? 1 : 0;
  score += avgBudget > -6 ? 2 : avgBudget > -18 ? 1 : 0;
  score += s.credibility > 65 ? 2 : s.credibility > 40 ? 1 : 0;
  score += s.resentment < 60 ? 2 : s.resentment < 80 ? 1 : 0;
  score += s.unemployment < 9 ? 1 : 0;
  score += s.trust > 45 ? 2 : s.trust > 25 ? 1 : 0;
  const grade = score >= 10 ? "Historic term"
    : score >= 8 ? "Strong term"
    : score >= 6 ? "Honest term"
    : score >= 4 ? "Stormy term"
    : "Failed term";

  const has = (id) => s.measures.some((m) => m.id === id);
  let archetype;
  if (has("cut-subsidies") && has("bank-close") && has("trade-open")) archetype = "The Reformer. You moved fast, cut early, and took the pain in one step.";
  else if (s.millPolicy === "subsidy" && !has("cut-subsidies")) archetype = "The Protector. You kept services and factories running by borrowing.";
  else if (has("priv-vouchers") && !has("cut-subsidies")) archetype = "The Distributor. You shared state property before fixing state finances.";
  else if (!has("cut-subsidies") && !has("bank-close") && s.debt > 80) archetype = "The Postponer. The hard decisions were delayed until the term ran out.";
  else archetype = "The Caretaker. You governed by halves.";

  const habits = [
    [has("cut-subsidies"), "You faced the budget", "A deficit under a fixed exchange rate turns into inflation or debt."],
    [s.banksClosed || s.bankBridge, "You settled the banks", "Banks that stay unresolved block credit and trust for years."],
    [has("trade-open") || has("foreign-law"), "You opened the economy", "Competition from abroad does what subsidies never do."],
    [has("law-simple"), "You built the rules", "Simple laws and working courts make contracts safe."],
    [has("tax-flat") || s.taxBoard, "You made paying worth it", "Simple taxes raise more money than complex ones."],
    [!!s.millPolicy && s.millPolicy !== "subsidy", "You closed the failing factories", "Keeping them alive costs money every month and blocks new firms."],
    [s.debt < 60, "You kept the treasury out of debt", "An empty treasury has to borrow, and borrowing raises prices."]
  ];

  return { grade, archetype, habits, avgInflation, avgBudget };
}
