// tools/_plain3.mjs — plain-language pass 3 (patterns, report, briefing)
import { readFileSync, writeFileSync } from 'node:fs';
const f = 'engine/game.js';
let src = readFileSync(f, 'utf8');
const nl = src.includes('\r\n') ? '\r\n' : '\n';
const sliceReplace = (a0, b0, body, label) => {
  const a = src.indexOf(a0), b = src.indexOf(b0);
  if (a < 0 || b < 0 || b < a) { console.error('MARK MISS: ' + label); process.exitCode = 1; return; }
  src = src.slice(0, a) + body.split('\n').join(nl) + src.slice(b);
  console.log('ok: ' + label);
};

sliceReplace('export function detectPatterns(s) {', '// The teaching layer. The book\'s payoff', `export function detectPatterns(s) {
  const out = [];
  const p = s.projectLog;
  const decisions = s.decisions;
  const total = Object.values(p.spendBySector).reduce((a, b) => a + b, 0) || 1;

  const early = decisions.filter(d => d.month < 30);
  const earlyAmenities = early.filter(d => d.type === 'buildFacility').reduce((a, d) => a + d.cost, 0);
  const earlyFactory = early.filter(d => ['modernize', 'rnd', 'marketing', 'expandCapacity'].includes(d.type)).reduce((a, d) => a + d.cost, 0);
  if (earlyAmenities > 1_000_000 && earlyAmenities > 2 * earlyFactory) {
    out.push({ key: 'recreation-first', title: 'You started with the nice things', text: 'Your first years went on pools, parks and libraries — before the factory and the money were put right. That is what the book’s bad mayors did. (book p. 22)' });
  }
  if (p.modernisations === 0 && s.history[s.history.length - 1].machinery < 0.6) {
    out.push({ key: 'neglected-works', title: 'Nobody looked at the machines', text: 'You never touched the factory machines. In the book, one mayor kept asking the workers whether they were happy and never asked about the plant — which was the real reason it made too little. (book p. 92)' });
  }
  if (p.audits >= 2) out.push({ key: 'tested', title: 'You checked your ideas', text: \`You ordered \${p.audits} check-up\${p.audits > 1 ? 's' : ''} or report\${p.audits > 1 ? 's' : ''}. Good mayors used them; bad ones trusted their own guesses. (book p. 24)\` });
  if (p.audits === 0 && decisions.length > 8) out.push({ key: 'no-audits', title: 'You believed your own guesses', text: 'You made one decision after another without checking anything. For the bad mayors, believing something was the same as knowing it. (book p. 24)' });

  const taxRaised = s.order.taxBusiness > 1.2 || s.order.taxProperty > 1.2;
  if (taxRaised && s.history.length > 24) {
    const earlyIncome = mean(s.history.slice(0, 24).map(x => x.income));
    const lateIncome = mean(s.history.slice(-24).map(x => x.income));
    if (lateIncome < earlyIncome) out.push({ key: 'tax-illusion', title: 'Higher taxes, less money', text: \`You raised the rate and the town's income fell from \${fmtDM(earlyIncome)} to \${fmtDM(lateIncome)} a month. Firms and shoppers left. (book p. 21)\` });
  }
  const tourismWaste = p.tourismSpends - (s.tourism.campaigns || []).reduce((a, c) => a + Math.min(c.recovered, c.cost), 0);
  if (p.tourismSpends > 0 && tourismWaste > 0.5 * p.tourismSpends) {
    out.push({ key: 'tourism', title: 'Tourism, with nothing behind it', text: 'You advertised the town when there were few free hands and a thin season. One mayor in the book read “tourism pays” from a single good year and got nothing from it later. (book pp. 94–95)' });
  }
  const coop = p.managementChanges.find(c => c.mode === 'coop');
  if (coop) out.push({ key: 'management', title: 'The workers took over the factory', text: \`In month \${coop.month} the managers were sacked and a workers’ co-operative took over. In the book this “precipitated an economic disaster”. (book p. 69)\` });
  const sectors = Object.entries(p.spendBySector).sort((a, b) => b[1] - a[1]);
  if (sectors.length && sectors[0][1] > 0.62 * total && total > 1_500_000) {
    const names = { factory: 'the factory', housing: 'housing', facilities: 'pools, parks and libraries', economy: 'advertising and campaigns', information: 'checks and reports', finance: 'the bank account' };
    out.push({ key: 'pet-project', title: \`One project ate the money: \${names[sectors[0][0]] || sectors[0][0]}\`, text: 'One mayor in the book spent years measuring the distance from every old person to every phone box. Fixing one thing and forgetting the rest is one of the bad mayors’ habits. (book pp. 24–26)' });
  }
  const reports = decisions.filter(d => ['audit', 'auditFull'].includes(d.type)).length;
  if (reports >= 5 && decisions.length < 22) out.push({ key: 'over-collection', title: 'You looked more than you decided', text: 'You collected a lot of information and made few decisions. In the book, the bad mayors gathered too much and then could not decide. (book p. 104)' });
  const complaints = s.inbox.filter(m => m.kind === 'complaint').length;
  const complaintsActedOn = decisions.filter(d => s.inbox.some(m => m.kind === 'complaint' && Math.abs(m.month - d.month) <= 2)).length;
  if (complaints >= 5 && complaintsActedOn / Math.max(1, complaints) > 0.5) {
    out.push({ key: 'repair-service', title: 'Repair service', text: 'Again and again, the loudest letter set your agenda. Without your own idea of what “well-being” means, that is what happens. (book pp. 58–60)' });
  }
  const late = s.history.slice(-12);
  if (late.length && mean(late.map(x => x.municipalNet)) < -150000 && s.finance.debt > 14000000) {
    out.push({ key: 'debt-spiral', title: 'Living on borrowed money', text: 'Your last years were paid for by the bank. Repaying that debt crowds out everything else — the interest eats the upkeep. (book p. 174)' });
  }
  const housingDecisions = decisions.filter(d => d.type === 'buildHousing').length;
  if (housingDecisions > 0 && s.history.length > 60) {
    const q = s.history;
    const earlyQueue = q[24]?.housingQueue ?? 0, lateQueue = q[q.length - 1].housingQueue;
    if (lateQueue > earlyQueue + 20) out.push({ key: 'housing-lag', title: 'Building while the list grew', text: 'New homes take a year and a half to build. The waiting list can grow for years even with the cranes up.' });
  }
  if (!out.length) out.push({ key: 'none', title: 'No clear pattern', text: 'Your term does not look like any of the book’s examples. That is not the same as doing well — read the five marks.' });
  return out;
}

`, 'patterns plain');

sliceReplace('// The end-of-term report the mayor gets in the newspapers', '__EOF__', `// The end-of-term report.
export function buildReport(s, behaviour) {
  const score = scoreGame(s);
  const patterns = detectPatterns(s);
  const end = s.history[s.history.length - 1];
  const lines = [];
  lines.push(\`After ten years, Lohhausen has \${Math.round(end.population)} people (it began with 3,700).\`);
  lines.push(\`The factory makes \${Math.round(end.production).toLocaleString('en')} watches a month and employs \${Math.round(end.staff)} people. \${(end.unemploymentRate * 100).toFixed(1)} % have no work.\`);
  lines.push(\`The town has \${fmtDM(end.capital)} and owes \${fmtDM(end.debt)}.\`);
  lines.push(\`\${Math.round(end.housingQueue)} families are still waiting for a home. On average, people are \${(end.satisfaction * 100).toFixed(0)} % happy.\`);
  const study = eventStudy(s);
  const te = teach(s, score, patterns, behaviour);
  return { score, patterns, lines, study, teaching: te, headline: score.headline, archetype: score.archetype };
}

// What the clerk says at the start of each session.
export function sessionBriefing(s) {
  const end = s.history[s.history.length - 1];
  const f = s.factory;
  const items = [];
  if (!end) return { title: 'Session 1 — the handover', items: [
    { who: 'Town clerk', text: \`We have \${fmtDM(s.finance.treasury)} and we owe \${fmtDM(s.finance.debt)}. Most months we spend more than we take in.\` },
    { who: 'Works manager', text: \`The factory makes about \${Math.round(referenceProduction()).toLocaleString('en')} watches a month. The order book is thinner than the halls could fill.\` },
    { who: 'Housing office', text: \`\${Math.round(s.housing.queue)} families are waiting for a home.\` },
    { who: 'Employment office', text: \`\${Math.round(s.employ.unemployed)} people have no work.\` },
  ] };
  items.push({ who: 'Town clerk', text: \`We have \${fmtDM(end.capital)} and we owe \${fmtDM(end.debt)}. Last month we \${end.municipalNet >= 0 ? 'took in' : 'lost'} \${fmtDM(Math.abs(end.municipalNet))}.\` });
  items.push({ who: 'Works manager', text: \`We shipped \${Math.round(end.sales).toLocaleString('en')} watches last month and \${end.factoryProfit >= 0 ? 'made' : 'lost'} \${fmtDM(Math.abs(end.factoryProfit))}.\${f.breakdowns > 0 ? \` The machines stopped \${f.breakdowns} times this year.\` : ''}\` });
  items.push({ who: 'Housing office', text: \`\${Math.round(end.housingQueue)} families are waiting for a home.\` });
  items.push({ who: 'Employment office', text: \`\${(end.unemploymentRate * 100).toFixed(1)} % have no work. Among young people, \${(end.youthUnemployed * 100).toFixed(0)} %.\` });
  const poll = s.society.reported;
  items.push({ who: 'Town poll', text: \`Workers \${blurb(poll.workers)}, families \${blurb(poll.families)}, old people \${blurb(poll.elderly)}. (A poll of the whole town, with error.)\` });
  return { title: \`Session \${s.session + 1} — the handover\`, items };
}
function blurb(x) {
  if (x == null) return 'no reading yet';
  if (x < 0.42) return 'say things are bad';
  if (x < 0.52) return 'are unhappy';
  if (x < 0.62) return 'are mixed';
  if (x < 0.72) return 'are content';
  return 'are pleased';
}
`, 'report + briefing plain');

writeFileSync(f, src);
console.log('game.js copy pass 3 written');
