export const PROLOGUE = [
  {
    label: "A republic returns",
    title: "The old state is gone. The old economy is not.",
    body: "In 1991 Estonia restored its independence after five decades of Soviet occupation. The flag returned before the institutions, the markets, or the money did."
  },
  {
    label: "The inheritance",
    title: "The shops are empty. The rouble is nearly worthless.",
    body: "Industrial production has fallen sharply. Wages have lost their meaning. A country that traded overwhelmingly through the Soviet system must now find a market, a currency, and a future."
  },
  {
    label: "June 1992",
    title: "The kroon enters the world.",
    body: "Estonia introduces its own currency under a currency-board system, pegged to the German mark. The reform creates a hard promise: every kroon must be backed."
  },
  {
    label: "October 1992",
    title: "A young government takes office.",
    body: "Mart Laar becomes prime minister at thirty-two. His coalition has promised a decisive break with the Soviet system. The promise now has to survive contact with an empty treasury."
  }
];

export const COLD_OPEN = [
  { text: "1940. The Soviet Union occupies Estonia.", hold: 3000 },
  { text: "In the war and the decades that follow, nearly one in five Estonians is killed, deported, or flees.", hold: 3900 },
  { text: "1987. Finland, across the Gulf: $14,370 per person. Estonia, under occupation: less than $2,000.", hold: 4000 },
  { text: "Two nations. One sea. One kept its freedom.", hold: 2700 },
  { text: "August 1991. The Soviet Union collapses. Estonia is free again.", hold: 3400 },
  { text: "But the shops are empty, the rouble is worthless, and 92% of trade runs through a dying empire.", hold: 4100 },
  { text: "1992. Prices rise by more than 1,000%. Bread and milk are rationed. Industrial output falls by a third. Real wages by nearly half.", hold: 4700 },
  { text: "June 1992. Estonia abandons the rouble and introduces the kroon, pegged to the Deutsche Mark.", hold: 3400 },
  { text: "The first former Soviet republic to do it.", hold: 2300 },
  { text: "October 1992. The first free government since the war takes office.", hold: 3100 },
  { text: "You are Mart Laar. Prime Minister. Thirty-two years old.", hold: 3500 }
];

export const SOURCES = [
  {
    short: "PRIMARY ACCOUNT",
    title: "Estonia: Little Country That Could",
    detail: "Mart Laar, CRCE New Series No. 19 (2002), especially the chapters on the harsh winter of 1993, the budget, banking, and reform."
  },
  {
    short: "REFLECTION",
    title: "Leading a successful transition: the Estonian miracle",
    detail: "Mart Laar, European View 7 (2008), pp. 67–74. A retrospective account of monetary reform, stabilization, openness, and institution-building."
  }
];

export const GLOSSARY = [
  ["Currency board", "A monetary arrangement that limits the issue of domestic currency by tying it to foreign reserves at a fixed exchange rate."],
  ["Budget deficit", "When the government plans to spend more than it collects. In an early transition economy, financing that gap can quickly become inflationary."],
  ["Stabilization", "Policies intended to stop prices and public finances from spiralling, often before growth and living standards recover."],
  ["J-curve", "A pattern in which living standards fall during an initial shock before the effects of reform can produce recovery and growth."]
];

// ── the decisions, in the months the book says they came ──
// Each option lists the measures it applies to the simulation, the result the
// country sees, and, for the report, what the real government did and why.
export const DECISIONS = [
  {
    month: 0, id: "treasury",
    kicker: "NOVEMBER 1992 · THE FIRST TEST",
    title: "How do we close the budget gap before the winter ends?",
    dek: "The government has admitted in parliament that the state has run out of money. Winter is starting, and the state has promised more than it can pay. The budget has to be built, the question is how.",
    history: "Laar's government spent November building a budget that fit the currency board, and presented it balanced to the Riigikogu on 14 December.",
    options: [
      { id: "balance", label: "Balance it: cut subsidies and shrink the ministries until spending matches revenue", applies: ["cut-subsidies", "ministry-cuts"],
        detail: "Subsidy payments to state firms stop (about 18 million krooni a month) and ministry payrolls are cut. The budget deficit closes, which supports the currency board's credibility, since under a currency board a deficit returns as money printing. Unemployment rises, and towns that depend on the state lose income immediately.",
        result: "The pain arrives in public before the credibility does. The kroon gains standing; every ministry asked to do less says so loudly.",
        why: "This is what they did. Without strictly controlling the budget, they argued, monetary reform is of no great use, the deficit would come back as prices." },
      { id: "borrow", label: "Cover the gap with short-term borrowing and keep services running", applies: ["borrow"],
        detail: "The gap is financed with short-term borrowing of about 45 million krooni plus interest. No spending is cut. Under the currency board the deficit cannot be financed by printing, so the debt pressures reserves and the effect returns as higher prices.",
        result: "Services survive the winter on borrowed money. The currency board inherits the risk, and the borrowing arrives later as prices.",
        why: "History could not take this road: in 1992 Estonia had almost no access to borrowing, and every borrowed kroon pressed on a currency with no reserves to spare." },
      { id: "bridge", label: "Make partial cuts now and schedule the rest for spring", applies: ["bridge-budget"],
        detail: "Part of the subsidies are cut now; the rest is promised for spring. The deficit falls by roughly half as much as a full balancing would. The timetable has to hold: each month of delay increases the size of the final cut.",
        result: "A compromise with a date on it. The sharpest cuts are delayed, and the delay is cheaper this month than next.",
        why: "A slower version of the real path: the real cuts were delayed by weeks, not years." }
    ]
  },
  {
    month: 1, id: "banks",
    kicker: "DECEMBER 1992 · THE BANKING TEST",
    title: "What do we do about the banks that have stopped paying?",
    dek: "Tartu Commercial Bank has frozen all accounts, and Union Baltic Bank is close to failure. Depositors are standing in queues, firms cannot pay wages, and the government is being asked to cover every loss with public money.",
    history: "The Bank of Estonia revoked the licences of the failed banks in November and December 1992. Small depositors were compensated in part, later. Shareholders were not made whole.",
    options: [
      { id: "close", label: "Close the insolvent banks; repay small depositors up to a strict limit", applies: ["bank-close"],
        detail: "Insolvent banks lose their licences. Small depositors are repaid within a strict limit (about 22 million krooni); shareholders and large creditors absorb the losses. This stops the panic and removes moral hazard, because surviving banks know bad loans can lead to closure. Trust in banks falls in the short term.",
        result: "The panic ends with a rule: the state will help people, but it will not make every bad loan disappear.",
        why: "This is what happened. Laar: 'We did not hesitate to let them go bankrupt when necessary.' The refusal became the foundation of Estonian banking discipline." },
      { id: "guarantee", label: "Guarantee every deposit in full and keep the banks open", applies: ["bank-guarantee"],
        detail: "The state repays all depositors in full (about 30 million krooni now, then 4 million a month). The panic ends and no depositor loses money. Bank owners are also rescued, which weakens the incentive for careful lending: moral hazard increases.",
        result: "The panic ends softly. Every future banker learns that failure may be negotiable if the queue gets long enough.",
        why: "Refused. The government was 'very clear about its expectations of private banks', rescuing them would have taught carelessness." },
      { id: "bridge-banks", label: "Reopen the failed banks under new management, with an audit deadline", applies: ["bank-bridge"],
        detail: "Frozen banks reopen under new management with a deadline: 8 million krooni a month for six months while the books are audited. Frozen wages become accessible again. Without a completed audit and a firm deadline, the support continues indefinitely as a bailout.",
        result: "Payments keep moving while the books are opened. Whether the bridge becomes a quiet bailout depends on the deadline.",
        why: "A shorter version of this was tried: the failed banks were given months, not years, and then closed." }
    ]
  },
  {
    month: 1, id: "budget-december",
    kicker: "14 DECEMBER 1992 · THE BUDGET",
    title: "Parliament votes on the 1993 budget on 14 December. Do we pass it balanced?",
    dek: "On 14 December parliament votes on the 1993 budget. If the state plans to spend more than it collects, the currency board cannot hold the exchange rate at 8 krooni to the mark. A balanced budget keeps the kroon stable; an unbalanced one does not.",
    history: "The balanced budget was presented on 14 December 1992 and passed. A law followed: the Estonian budget must be balanced when presented to parliament. It became one of the trademarks of Estonia.",
    options: [
      { id: "present", label: "Yes: present it balanced, cuts included", applies: ["budget-present"],
        detail: "The budget is presented balanced: spending matches revenue, with no borrowing. Under the currency board, a balanced budget is what makes the fixed exchange rate credible. Inflation expectations fall. The spending cuts are unpopular.",
        result: "The peg holds because the state lives within its means. The galleries are not kind, and the peg does not care.",
        why: "This is what happened, and it was, in Laar's words, highly unpopular when actually introduced. It was also the shock therapy that worked." },
      { id: "soften", label: "Soften it, borrow about 20 million to spare the subsidies", applies: ["borrow-small"],
        detail: "The largest cuts are replaced with about 20 million krooni of new borrowing. The deficit stays larger for longer, so inflation falls more slowly and debt increases.",
        result: "The chamber is gentler this week. The currency board's arithmetic is not.",
        why: "Never seriously considered: 'There simply was not any money, nor was there anywhere from which to obtain it.'" },
      { id: "delay-budget", label: "Delay the budget to February", applies: ["budget-delay"],
        detail: "The budget is postponed to February, and the state runs on month-to-month spending. The deficit continues during the delay, and inflation stays higher.",
        result: "The state runs on promises for another quarter. The deficit does not wait, and neither do prices.",
        why: "Not taken. Speed was the whole argument: 'Bitter medicine is easier to take in one dose than in a prolonged series of doses.'" }
    ]
  },
  {
    month: 2, id: "pensions",
    kicker: "JANUARY 1993 · THE HARDEST VOTE",
    title: "Pensions have fallen behind prices. Do we raise them, and by how much?",
    dek: "Prices have roughly doubled since the kroon was introduced, but pensions have not risen. The government promised to raise pensions with prices. Every month of delay, pensioners can buy less.",
    history: "Pensions were adjusted in limited steps through 1993, each raise lagging prices, each one fought over in the coalition. No government could afford full indexation under the currency board.",
    options: [
      { id: "full", label: "Full indexation, pensions rise with prices, paid from the budget", applies: ["pension-full"],
        detail: "Pensions rise with the full price increase, about 14 million krooni a month, indexed permanently. Pensioner income keeps pace with prices. The deficit grows by the same amount, and under the currency board that growth returns as inflation, which reduces the real pension value again.",
        result: "Old people eat, this winter. The deficit grows, and the deficit becomes prices.",
        why: "Not affordable under the currency board. Pensions were raised in steps, always behind prices." },
      { id: "half", label: "Half indexation, pensions rise by half the price increase", applies: ["pension-half"],
        detail: "Pensions rise by half the price increase, about 7 million krooni a month. Pensioner purchasing power still falls, but more slowly. The deficit grows by half as much.",
        result: "Something is given and something withheld. Defensible, and quoted back at you every time you ask for a miracle.",
        why: "Close to the path taken: limited, lagging indexation, argued over in public." },
      { id: "delay", label: "Delay indexation to spring; protect the kroon first", applies: ["pension-delay"],
        detail: "Indexation is postponed to spring, saving 14 million krooni a month. The gap between pensions and prices grows each month and is recorded as missed payments.",
        result: "The budget breathes. The arrears accumulate with interest, in public, all winter.",
        why: "Delay was the unspoken policy, though never announced this bluntly." }
    ]
  },
  {
    month: 2, id: "winter",
    kicker: "JANUARY 1993 · THE COLDEST MONTH",
    title: "The north-east is running out of heating money. Do we send emergency funds?",
    dek: "Unpaid heating bills in the north-east run into the millions, and the power plant needs the state's answer before the next cold spell. The districts need to know whether the lights and heating will stay on.",
    history: "The winter of 1992 and 1993 was the harshest of the transition: power cuts in the north-east, districts heating with wood, and a government that scraped together emergency help without breaking the budget.",
    options: [
      { id: "credit", label: "Yes: a 25-million-krooni emergency energy credit", applies: ["energy-credit"],
        detail: "An emergency credit of 25 million krooni keeps district heating and the power plants running through winter. Heating and electricity supply continue in the north-east; the treasury absorbs the cost.",
        result: "The lights stay on. The treasury does not.",
        why: "Emergency support was paid from the budget, alongside the balancing cuts." },
      { id: "endure", label: "No, the districts cover their own heating arrears", applies: ["endure-winter"],
        detail: "No emergency funding. Districts cover heating arrears themselves; power cuts continue in the north-east and are reported in the press.",
        result: "The east heats with wood and remembers. The treasury keeps its last millions.",
        why: "The cuts were real and the winter was real; the government's problem was that both were true at once." }
    ]
  },
  {
    month: 3, id: "elcoteq",
    kicker: "12 FEBRUARY 1993 · THE DEAL",
    title: "Do we sign the agreement that closes the loss-making mills?",
    dek: "The state would buy out the loss-making factories, pay the workers what it owes them, and close the plants in an orderly way, without bankruptcy cases that would also hurt the firms still doing business. The agreement waits for a signature.",
    history: "Signed on 12 February 1993. Kreenholm, 12,000 workers in 1990 and 7,000 now, was privatised in 1994; the Kehra mill went bankrupt. Between a quarter and a third of factory jobs were gone, and 2,000 enterprises became 70,000 in two years.",
    options: [
      { id: "sign", label: "Sign it, buy out and close the plants this year", applies: ["mill-close"],
        detail: "The state buys out loss-making enterprises for about 60 million krooni over six months, settles wage debts and closes the plants without bankruptcy proceedings. Unemployment rises by about 3 percentage points. The budget stops paying 22 million krooni a month in subsidies, and new enterprises register in the space left by the closures.",
        result: "The state stops owning the country's losses. The towns take the hit; the private economy takes the room.",
        why: "This is what happened. The loss-making firms were told to become competitive or close, and most of the new private firms that replaced them survived." },
      { id: "slow", label: "Sign a slower version: closures over two years, with a retraining fund", applies: ["sign-slow"],
        detail: "The same closures stretched over two years, with a retraining fund. Unemployment rises more gradually; the monthly losses continue while the closures wait.",
        result: "The same outcome, stretched over two years, at a higher price, with more argument.",
        why: "The real timetable was faster: most closures were settled during 1993." },
      { id: "refuse", label: "Refuse, keep the mills under state ownership", applies: ["mill-subsidy"],
        detail: "The state keeps the mills and their losses of 22 million krooni a month. Mill employment is preserved. The budget deficit stays larger, and the enterprises remain unsellable.",
        result: "The mills, and the losses, and the queues, all stay. The budget fills with the cost of producing nothing anyone buys.",
        why: "Never seriously considered by February 1993, the budget could not carry the loss-makers, whatever the coalition wished." }
    ]
  },
  {
    month: 6, id: "rules",
    kicker: "MAY 1993 · THE UNSEEN REFORM",
    title: "How do we build the legal system a market economy needs?",
    dek: "The old Soviet courts are gone, and the new Estonian courts are few and inexperienced. A trader signing a contract today cannot be sure a broken deal will be enforced. Business needs laws it can read and courts it can trust.",
    history: "A new constitution had been ratified in June 1992. The reformers kept the law short enough to be read: property, contract, bankruptcy. 'Laws and decrees which are passed must therefore be as simple as possible.'",
    options: [
      { id: "simple", label: "Pass a short commercial code now: property, contract, bankruptcy", applies: ["law-simple"],
        detail: "A short commercial code covering property, contract and bankruptcy is passed within months, written to be readable without lawyers. Enforcement capacity grows steadily. Foreign traders get enforceable contracts in Estonian courts.",
        result: "The laws are passed in months and fit in one drawer. A trader can read his rights before he signs.",
        why: "This is what Estonia did. The point was not perfect law; it was predictable law." },
      { id: "codes", label: "Commission complete western-style codes, with foreign consultants", applies: ["law-big"],
        detail: "Complete commercial codes are drafted with foreign consultants: 12 million krooni and several years of work. Enforcement capacity rises only slightly now; the full effect arrives after adoption.",
        result: "The drafts are magnificent. Business is conducted in the meantime on trust and guesswork.",
        why: "Rejected: comprehensive codes would have taken years the transition did not have, written by a civil service that did not yet exist." },
      { id: "ministries", label: "Let each ministry regulate its own sector in the meantime", applies: ["law-ministries"],
        detail: "Each ministry writes its own regulations immediately. Rules arrive quickly but differ by sector; licensing creates opportunities for favours and corruption, and the tax base weakens.",
        result: "The rules arrive fast, and different in every sector. Every permit becomes a favour.",
        why: "Refused: every ministry writing its own rules is how a market becomes a negotiation, and a negotiation is what Estonia had just escaped." }
    ]
  },
  {
    month: 8, id: "ownership",
    kicker: "JULY 1993 · THE OWNERS",
    title: "The state still owns most of the factories. How do we give them new owners?",
    dek: "Most factories, farms and shops still belong to the state, and the treasury cannot run them all. The Privatisation Agency has the first sales ready. The question is who the new owners should be.",
    history: "Estonia rejected mass vouchers and insider giveaways. Big assets were sold in open competitions to one core owner, with minority shares given to the people, 'real owners for companies while making it possible for everybody to participate.'",
    options: [
      { id: "core", label: "Sell the big firms case by case to core investors; minority shares to citizens", applies: ["priv-core"],
        detail: "Large enterprises are sold one by one in open competitions to investors who bring capital and management, raising about 45 million krooni for the treasury; citizens receive minority shares. Ownership is concentrated enough to restructure firms. Foreign ownership becomes an opposition issue.",
        result: "The sales are slow, contested, and real. The new owners bring capital, management, and markets.",
        why: "This is what happened, 'the country of owners'. Strong shareholders beat millions of small paper-holders." },
      { id: "vouchers", label: "Distribute vouchers to every citizen for an equal share", applies: ["priv-vouchers"],
        detail: "Every citizen receives vouchers worth a share of state property; administration costs 18 million krooni. Ownership is equal but dispersed, so no single owner has control or the incentive to restructure. Larger stakes concentrate informally over time.",
        result: "Ownership becomes universal and therefore thin. The strongest hands collect the paper anyway, slowly, cheaply, off the record.",
        why: "Considered and rejected. Estonia looked at Czechoslovakia's voucher privatisation and chose different owners." },
      { id: "insiders", label: "Transfer the enterprises to their managers and workers", applies: ["priv-insider"],
        detail: "Enterprises are transferred to their current managers and workers at no charge. The workforce keeps employment. Management is unchanged, and neither outside capital nor outside audit arrives.",
        result: "The keys stay in the building. The books are the same books, now audited by nobody.",
        why: "Refused: it would have entrenched the old management, as Russia was learning at the same moment." }
    ]
  },
  {
    month: 10, id: "openness",
    kicker: "SEPTEMBER 1993 · THE OPEN DOOR",
    title: "Do we open the economy to free trade and foreign ownership?",
    dek: "The trade ministry proposes abolishing every import tax and letting foreigners buy land in Estonia. Consumer prices would fall and foreign firms would come in. The opposition calls it surrender.",
    history: "Estonia liberalised trade and abolished all export restrictions and import tariffs, one free trade zone. By 1993 and 1994 it had become, in Laar's word, a Mecca for foreign investors, with more investment per capita than any country in Central Eastern Europe by the late 1990s.",
    options: [
      { id: "open-all", label: "Fully: abolish all tariffs and let foreigners own land", applies: ["trade-open", "foreign-law"],
        detail: "All import tariffs are abolished and foreign investors may own land on equal terms. The treasury gives up about 6 million krooni a month in tariff revenue. Consumer prices fall, competition increases, and foreign investment inflows rise.",
        result: "Prices ease, competition sharpens, firms multiply. The treasury gives up its easiest revenue, and gains an economy.",
        why: "This is what happened: 'give us not aid but more trade.' Openness brought the factories that loans never would." },
      { id: "open-trade", label: "Partly: abolish tariffs, but keep the land restriction", applies: ["trade-open"],
        detail: "Tariffs are abolished, but foreigners may not own land. Trade opens and prices ease; foreign direct investment stays lower because investors cannot secure property.",
        result: "Trade opens; the signal to investors does not. Capital watches from across the Gulf.",
        why: "Half-measures: the land law of 1993 was what made investors feel safe enough to build factories." },
      { id: "tariffs", label: "No: keep the tariffs to protect domestic industry", applies: ["keep-tariffs"],
        detail: "Import tariffs stay. The treasury keeps about 6 million krooni a month in revenue; consumer prices stay higher, and import competition does not discipline domestic firms.",
        result: "The treasury keeps its easiest revenue, and the shops keep their high prices. The firms wait outside.",
        why: "Not taken. Protection was precisely what the reformers were dismantling." }
    ]
  },
  {
    month: 14, id: "flat-tax",
    kicker: "1 JANUARY 1994 · THE POSTCARD",
    title: "Do we replace the income tax with a single flat rate?",
    dek: "The proposal is a single income tax rate of 26%, with almost no exceptions. Today's tax system is complex, and much work goes unreported to avoid paying tax. A flat rate would make tax simple and harder to avoid.",
    history: "The flat-rate personal income tax was introduced on 1 January 1994. 'We decided not to punish people who are good at what they do.' The two other Baltic states copied it, then Russia in 2001, Ukraine, Georgia, Slovakia in 2004, Romania in 2005.",
    options: [
      { id: "flat", label: "Yes: one rate of 26% with almost no exemptions, from January", applies: ["tax-flat"],
        detail: "A single income tax rate of 26% with almost no exemptions, from January. Tax forms become simple, compliance rises and the grey sector shrinks, which raises revenue over time. The rate is the same at every income level.",
        result: "The form fits on a postcard. Compliance climbs; the grey sector takes the hit.",
        why: "This is what happened, and the effects were quick: 'tax compliancy increased. The grey sector was badly hit and the revenues of the state budget started to increase very quickly.'" },
      { id: "progressive", label: "No: keep the progressive ladder: higher rates on higher income", applies: ["keep-progressive"],
        detail: "The progressive income tax stays, with higher rates on higher income. Filing stays complex; incentives to underreport income remain, and the grey sector keeps its size.",
        result: "The ladder stays. So does the grey economy, and the accountants who climb it.",
        why: "Not taken: 'the more you earn, the more taxes you have to pay, such a notion lowers the motivation of people to work more.'" }
    ]
  },
  {
    month: 21, id: "coalition",
    kicker: "AUGUST 1994 · THE POLITICAL BILL",
    title: "The coalition no longer holds a majority. What do we do?",
    dek: "Two coalition parties are leaving the government. The reforms are working, inflation is falling, the budget balances, but the voters remember the winters more than the recovery. The government cannot survive on its current terms.",
    history: "The coalition broke apart during 1994 and Mart Laar resigned in the autumn, at thirty-four. He was elected prime minister again in 1999. The reforms, the currency board, the balanced budget, the flat tax, the owners, did not follow him out.",
    options: [
      { id: "resign", label: "Let the government fall and hand over the reforms intact", applies: ["resign-gov"],
        detail: "The government resigns and leaves the reform programme unchanged: the currency board, the balanced-budget law, the flat tax and completed privatisation pass to the next government. The reforms continue; the coalition ends.",
        result: "The coalition ends and the programme does not. The next government inherits facts, not promises, and changing facts is harder than breaking promises.",
        why: "This is what happened. He had won the argument and lost the room, and the country kept the argument." },
      { id: "save", label: "Slow the reforms to keep the coalition until the election", applies: ["save-coalition"],
        detail: "Privatisation slows, the budget loosens and ministries are redistributed to keep the coalition alive until the election. Reform momentum and credibility decline while the government's term extends.",
        result: "The government lives, and the price is paid in instalments: softer sales, looser budgets, a currency board that has begun to hear arguments.",
        why: "The real coalition could not be saved at any price. Slowing the reforms would have spent the confidence they had built." },
      { id: "appeal", label: "Call early elections and campaign on the record", applies: ["appeal-country"],
        detail: "Early elections are called on the government's record. The reform programme becomes the campaign issue; the outcome depends on how voters weigh the two winters against the recovery.",
        result: "The record goes to the voters: two winters against a recovery. Pain has better stories than policy.",
        why: "No elections were called. The government fell in parliament, and the next government inherited the reforms rather than reversing them." }
    ]
  }
];

// ── the teaching layer at the end: what really happened ──
export const REPORT = {
  narrative: [
    "The kroon stayed fixed to the German mark. Inflation fell from more than 1,000 per cent in 1992 to 89.8 per cent in 1993, and to 29 per cent by 1995. Industry was still shrinking and real wages had fallen by nearly half. In the winter of 1993 the country was in the same condition that had broken many other post-Soviet states.",
    "In February 1993 the state bought out its loss-making factories and closed them without bankruptcy cases. Kreenholm, which had employed 12,000 people in 1990, was down to 7,000 and was privatised in 1994. The Kehra mill went bankrupt. Between a quarter and a third of factory jobs were gone.",
    "At the same time the number of registered enterprises grew from about 2,000 in 1992 to about 70,000 in 1994. Trade tripled in fifteen months. A flat income tax started on 1 January 1994. By the middle of the decade exports per person were 297 dollars, against 181 in Latvia and 90 in Lithuania.",
    "In December 1992 the Institute of Economic Research asked whether the economic situation was improving. 8 per cent of Estonians said yes. Four years later the answer was different: the country had stopped asking.",
    "The government did not survive its own reforms. The coalition broke apart during 1994 and Mart Laar resigned in the autumn. The next government kept the currency board, the budget law, the flat tax and the new owners. By then they were not policies any more. They were facts."
  ],
  facts: [
    { name: "The Kroon", years: "1992 to 2011", text: "The currency board held its fixed exchange rate for eighteen years, through two Russian crises and one global one. On 1 January 2011 Estonia adopted the euro, the first former Soviet republic to do so." },
    { name: "The Flat Tax", years: "since 1994", text: "Copied across the post-communist world: the other Baltic states first, then Russia in 2001, Ukraine, Georgia, Slovakia in 2004 and Romania in 2005. Estonia's rate is 22% today, still flat." },
    { name: "The Owners", years: "1992 to 1994", text: "About 2,000 enterprises in 1992. Seventy thousand by the end of 1994. In Laar's words, Estonia turned from a country of the working class into a country of entrepreneurs, and later became the birthplace of Skype." },
    { name: "Estonia", years: "today", text: "The first former communist country rated a free economy by the Heritage Foundation. The first country in the world to vote over the internet in parliamentary elections, in 2007. In NATO and the EU since 2004, the OECD since 2010, the eurozone since 2011." },
    { name: "Mart Laar", years: "born 1960", text: "Lost his government in 1994. The country elected him prime minister again in 1999, and he later served as Minister of Defence. A historian by trade, he wrote the two books this game is built on." }
  ],
  quotes: [
    { text: "It is impossible to cross a chasm in two steps. What Estonia needed was one decisive leap.", who: "Mart Laar", source: "Leading a successful transition: the Estonian miracle, 2008" },
    { text: "Bitter medicine is easier to take in one dose than in a prolonged series of doses.", who: "Mart Laar", source: "on why the reformers moved all at once, 2008" },
    { text: "We decided not to punish people who are good at what they do.", who: "Mart Laar", source: "on the flat income tax, 2008" },
    { text: "The 'Estonian miracle' teaches that only by trusting the people and empowering them are reforms made irreversible.", who: "Mart Laar", source: "the closing line of his account, 2008" }
  ]
};

export const LAAR_PRINCIPLES = [
  "Move faster than the opposition can organise. Reform is only irreversible once people can see it working.",
  "Do not spend what you do not have. The budget is the constitution of a currency.",
  "Removing controls is not enough, a market needs courts, registries and rules that can be read.",
  "Create owners, not dependents. People defend what belongs to them.",
  "Keep taxes low, flat and few. Simplicity is a form of honesty.",
  "Open the economy. Foreign capital brings money, technology and management, but only law can make it stay.",
  "Let failures fail. Protecting losers today taxes everyone tomorrow.",
  "Politics is the price. A government can save the country and still lose the room."
];

// Why each principle worked, the economics behind the doctrine.
export const PRINCIPLE_LESSONS = [
  {
    principle: "Move faster than the opposition can organise.",
    lesson: "After a revolution there is a short period in which people accept painful changes they will not accept later. A price rise in the first winter is seen as part of the transition. The same rise in the third year is blamed on the government. Estonia used this period: the kroon in June 1992, the balanced budget in December 1992, the factory closures in February 1993. When the opposition organised, the reforms already had support from new firms and new owners."
  },
  {
    principle: "Do not spend what you do not have.",
    lesson: "Under a currency board the state cannot print money, so a deficit must be borrowed, and borrowing raises prices. The balanced budget of December 1992 is why the fixed exchange rate held while many other post-Soviet currencies collapsed. Inflation fell from 1,070% to 29% in three years because the budget behind the currency held."
  },
  {
    principle: "A market needs courts, registries and rules that can be read.",
    lesson: "Prices alone do not make a market. Contracts must be enforceable. Simple laws passed quickly work better than perfect laws passed years later, because people need to know the rules before they sign. Simple rules also reduce corruption: an official with nothing to approve has nothing to sell."
  },
  {
    principle: "Create owners, not dependents.",
    lesson: "Ownership changes behaviour. A firm with one strong owner gets capital, management and export markets. A firm owned by everybody is run by nobody. A firm given to its old directors keeps its old habits. Estonia sold firms to strong owners and gave small shares to citizens, and registered firms grew from 2,000 to 70,000 in two years."
  },
  {
    principle: "Keep taxes low, flat and few.",
    lesson: "A flat tax is simple to file and hard to avoid. When the form is one page and there are no exceptions, more people pay, the informal economy shrinks and revenue rises. The same rate for every income also removes the extra penalty on success. Estonia's 26% rate was copied by Russia, the Baltic states and others, and revenue held up."
  },
  {
    principle: "Open the economy to competition and capital.",
    lesson: "A small country cannot discipline its own monopolies, but competition from abroad can. Removing tariffs lowered prices for consumers and forced firms to compete instead of asking for protection. Foreign investors brought technology, management and markets. Investment per person soon led all of Central Eastern Europe."
  },
  {
    principle: "Let failures fail.",
    lesson: "Every bailout teaches banks that failure will be covered, and the lesson repeats. Estonia let weak banks close in 1992 and loss-making mills shut in 1993. It was painful, and it is why the banking system survived the crises of 1998 and 2008 without rescues. Workers and equipment from failed firms moved, slowly, to firms that could pay."
  },
  {
    principle: "Politics is the price. Reforms must outlive their makers.",
    lesson: "Laar's government did the reforms right and still lost power, because voters remembered the winters more than the recovery. A government can save the country or keep its office, and rarely both. What matters is what survives: the currency board, the budget law, the flat tax and the new owners all outlived the government, because they had become facts."
  }
];
