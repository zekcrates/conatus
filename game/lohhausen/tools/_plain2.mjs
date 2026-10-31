// tools/_plain2.mjs — plain-language pass 2 (game.js: notes, recap, teaching, patterns, briefing)
import { readFileSync, writeFileSync } from 'node:fs';
const f = 'engine/game.js';
let src = readFileSync(f, 'utf8');
const nl = src.includes('\r\n') ? '\r\n' : '\n';
const sliceReplace = (startMark, endMark, body, label) => {
  const a = src.indexOf(startMark), b = src.indexOf(endMark);
  if (a < 0 || b < 0 || b < a) { console.error('MARK MISS: ' + label); process.exitCode = 1; return; }
  src = src.slice(0, a) + body.split('\n').join(nl) + src.slice(b);
  console.log('ok: ' + label);
};

// ── the notes, the recap, the event study, the teaching checks ───────────────
sliceReplace('// The advisors\' notes', '// The end-of-term report the mayor gets in the newspapers', `// The advisors' notes: what to look at now, in plain words. At most four, the
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

  if (s.projectLog.audits === 0 && mach < 0.8) {
    notes.push({
      level: 'urgent', title: 'You have never checked the factory machines',
      text: 'The factory makes less than it should. A check-up costs 25,000 DM and tells you whether the machines are the reason.',
      action: { kind: 'sector', key: 'info', label: 'Have them checked' },
    });
  } else if (mach < 0.55) {
    notes.push({
      level: 'urgent', title: 'The factory machines are worn out',
      text: \`They are at \${(mach * 100).toFixed(0)} % and get worse every month they run. Renewing them costs 900,000 DM and takes a year.\`,
      action: { kind: 'sector', key: 'fabrik', label: 'The factory' },
    });
  }
  if (homes > 45) {
    notes.push({
      level: homes > 80 ? 'urgent' : 'watch', title: \`\${homes} families are waiting for a home\`,
      text: 'New homes take a year and a half to build, so the list keeps growing while you build.',
      action: { kind: 'sector', key: 'wohnen', label: 'Build homes' },
    });
  }
  if (un > 0.055) {
    notes.push({
      level: un > 0.09 ? 'urgent' : 'watch', title: \`\${Math.round(s.employ.unemployed)} people have no work\`,
      text: 'Jobs come from the factory (when orders are good), from shops and services, and from training. Young people with no job and no training hang about, and the police notice.',
      action: { kind: 'sector', key: 'fabrik', label: 'Jobs' },
    });
  } else if (s.society.youthUnemployed > 0.3) {
    notes.push({
      level: 'watch', title: \`\${(s.society.youthUnemployed * 100).toFixed(0)} % of young people have no work or training\`,
      text: 'Apprenticeships and retraining help, but slowly. Unemployed young people refuse retraining outright.',
      action: { kind: 'sector', key: 'fabrik', label: 'Training' },
    });
  }
  if (afterFirstYear && net < -20000) {
    notes.push({
      level: net < -120000 ? 'urgent' : 'watch', title: \`The town is losing \${fmtDM(-net)} a month\`,
      text: 'The bank covers it, and the debt grows. Repaying that debt will crowd out everything else — and the bank has a limit.',
      action: { kind: 'sector', key: 'steuern', label: 'Money' },
    });
  }
  const mood = Math.min(s.society.reported.workers, s.society.reported.families, s.society.reported.elderly);
  if (afterFirstYear && mood < 0.5) {
    const who = s.society.reported.workers <= mood ? 'Workers' : s.society.reported.families <= mood ? 'Families' : 'Old people';
    notes.push({
      level: 'watch', title: \`\${who} say things are bad\`,
      text: 'This is a poll of the whole town, so it has error in it. One bad reading means little. Three in a row mean something.',
      action: { kind: 'chart', key: 'satisfaction', label: 'How people feel' },
    });
  }
  if (s.tourism.rooms > 45 && winter) {
    notes.push({
      level: 'watch', title: 'The tourist season is over',
      text: \`The hills fill in July and August and stand empty now. Your \${s.tourism.rooms} hotel beds earn little until spring.\`,
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
  const lines = [];
  lines.push(\`Watches made: \${Math.round(after.production).toLocaleString('en')} a month (\${pct(before.production, after.production)})\`);
  lines.push(\`People with no work: \${Math.round(after.unemployed)} (\${signed(d(before.unemployed, after.unemployed))})\`);
  lines.push(\`Families waiting for a home: \${Math.round(after.housingQueue)} (\${signed(d(before.housingQueue, after.housingQueue))})\`);
  lines.push(\`Town's money: \${fmtDM(after.capital)} · money owed: \${fmtDM(after.debt)}\`);
  lines.push(\`How people feel — workers \${(after.satisfactionWorkers * 100).toFixed(0)} %, families \${(after.satisfactionFamilies * 100).toFixed(0)} %, old people \${(after.satisfactionElderly * 100).toFixed(0)} %\`);

  const said = (orders || []).map(o => o.label || o.type);
  const notes = [];
  notes.push(said.length ? \`You ordered: \${said.join(', ')}.\` : 'You ordered nothing. The town moved on its own.');
  if (d(before.production, after.production) < -600) notes.push('The factory made less again. The reason is thin orders and old machines, not the workers.');
  if (d(before.unemployed, after.unemployed) > 25) notes.push('More people lost their jobs. The factory sheds workers when orders are thin.');
  if (d(before.housingQueue, after.housingQueue) > 10) notes.push('The waiting list for homes grew. New homes take a year and a half to build.');
  if (d(before.debt, after.debt) > 800000) notes.push(\`The town borrowed \${fmtDM(d(before.debt, after.debt))} more to get through the months.\`);
  if (after.machinery < 0.6 && (orders || []).every(o => o.type !== 'modernize')) notes.push('The machines got a little worse.' + (s.projectLog.audits ? '' : ' Nobody has looked at them.'));
  return { lines, notes };
}

`, 'notes + recap plain');

// the event study and the teaching checks
sliceReplace('const METRIC_OF = {', '// The advisors\' notes', `const METRIC_OF = {
  modernize: ['machinery', 'how worn the machines are'],
  rnd: ['quality', 'the quality of the watches'],
  marketing: ['sales', 'watches sold'],
  expandCapacity: ['production', 'how many watches are made'],
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
    if (Math.abs(rel) < 0.02) { lines.push({ month: d.month, good: null, text: \`In month \${d.month} you ordered \${d.type}. \${label[0].toUpperCase() + label.slice(1)} did not really change over the next two years.\` }); continue; }
    lines.push({
      month: d.month,
      good: move > 0,
      text: \`In month \${d.month} you ordered \${d.type}. Over the next two years, \${label} averaged \${fmtVal(metric, a, s)} — against \${fmtVal(metric, b, s)} in the year before, a \${(a - b) >= 0 ? 'rise' : 'fall'} of about \${(Math.abs(rel) * 100).toFixed(0)} %.\`,
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
    good: \`You ordered \${p.audits} checks or reports. Good mayors looked things up; bad ones believed what they already thought. (book p. 24)\`,
    bad: p.audits === 0
      ? 'You never checked anything. The bad mayors in the book believed their own guesses — and never found out why the factory was slow. (book p. 92)'
      : 'You checked something once. Good mayors did it again and again.',
  });
  const sectorsUsed = Object.entries(p.spendBySector).filter(([, v]) => v > 0).length;
  checks.push({
    key: 'multi',
    ok: sectorsUsed >= 3,
    title: 'You did not put all your money in one place',
    good: \`You spent money in \${sectorsUsed} different areas. Good mayors attacked a problem from several sides at once. (book p. 22)\`,
    bad: \`You spent money in only \${sectorsUsed} area(s). Doing one thing at a time is what the bad mayors did. (book pp. 22–26)\`,
  });
  const totalSpend = Object.values(p.spendBySector).reduce((a, b) => a + b, 0);
  const topShare = totalSpend > 0 ? Math.max(...Object.values(p.spendBySector)) / totalSpend : 0;
  checks.push({
    key: 'pet',
    ok: totalSpend < 1500000 || topShare < 0.62,
    title: 'You did not disappear into one project',
    good: 'No single area took most of your money. You kept several goals going.',
    bad: \`One area took \${(topShare * 100).toFixed(0)} % of everything you spent. One mayor in the book counted the distance from every old person to every phone box — and lost the town while he planned it. (book p. 163)\`,
  });
  checks.push({
    key: 'works',
    ok: (p.spendBySector.factory || 0) > 0 && end.machinery >= 0.6,
    title: 'You looked after the factory',
    good: \`The machines ended at \${(end.machinery * 100).toFixed(0)} %. You spent money on the thing that pays for everything else.\`,
    bad: \`The machines ended at \${(end.machinery * 100).toFixed(0)} %. The factory pays for everything else, and the bad mayors only noticed it late, if at all. (book p. 22)\`,
  });
  checks.push({
    key: 'maintenance',
    ok: s.order.maintenanceLevel >= 0.9,
    title: 'You kept the town up',
    good: \`Upkeep stood at \${s.order.maintenanceLevel.toFixed(2)} × what is needed. Buildings were looked after instead of run down.\`,
    bad: \`Upkeep stood at \${s.order.maintenanceLevel.toFixed(2)} × what is needed. Neglect is invisible for years — and then it is the first thing people see. (book fig. 16)\`,
  });
  const complaints = s.inbox.filter(m => m.kind === 'complaint').length;
  const reactive = s.decisions.filter(d => s.inbox.some(m => m.kind === 'complaint' && Math.abs(m.month - d.month) <= 2)).length;
  checks.push({
    key: 'repair',
    ok: !(complaints >= 5 && reactive / Math.max(1, complaints) > 0.5),
    title: 'You set your own agenda',
    good: 'You did not simply answer the loudest letter. “The well-being of the citizens” has to be broken into parts, or a mayor becomes a repair service. (book pp. 58–60)',
    bad: \`\${reactive} of your orders came within two months of a complaint letter. Fixing whatever shouts is what the book calls repair service. (book pp. 58–60)\`,
  });
  const taxRaised = s.order.taxBusiness > 1.2 || s.order.taxProperty > 1.2;
  if (taxRaised && s.history.length > 36) {
    const early = mean(s.history.slice(0, 24).map(x => x.income));
    const late = mean(s.history.slice(-24).map(x => x.income));
    checks.push({
      key: 'tax',
      ok: late >= early,
      title: 'Your tax rise brought money in',
      good: \`You raised the rates and the town's income held: \${fmtDM(early)} to \${fmtDM(late)} a month.\`,
      bad: \`You raised the rates and the town's income fell from \${fmtDM(early)} to \${fmtDM(late)} a month. People and firms moved away instead. (book p. 21)\`,
    });
  }

  const sessionStats = (behaviour && behaviour.sessions) || [];
  const questions = sessionStats.reduce((a, x) => a + (x.enquiries || 0), 0);
  const decisions = s.decisions.length;
  const perSession = sessionStats.map(x => \`S\${x.session}: \${x.enquiries || 0} questions / \${x.decisions || 0} orders\`).join(' · ');

  const failed = checks.filter(c => !c.ok);
  const advice = [];
  if (failed.some(c => c.key === 'tested')) advice.push('Next time: order a check-up in your first session and another later. A report costs 25,000 DM; being wrong costs ten years.');
  if (failed.some(c => c.key === 'works')) advice.push('The factory pays for everything else. Look at the machines early — 900,000 DM feels like far too much until it is too late. (book p. 82)');
  if (failed.some(c => c.key === 'pet')) advice.push('Spread your money over several areas. The town is not one problem; it is many, tied together.');
  if (failed.some(c => c.key === 'maintenance')) advice.push('Keep upkeep at 1.0 ×. Rot is cheap to prevent and expensive to repair.');
  if (failed.some(c => c.key === 'tax')) advice.push('If you need money, grow the town — jobs, homes, the factory — instead of raising the rate.');
  if (failed.some(c => c.key === 'repair')) advice.push('Decide what “well-being” means before the letters arrive, or the loudest complaint will set your agenda.');
  if (!advice.length) advice.push('You governed the way the book’s good mayors did: you checked your ideas, spread your measures, kept the factory and the town going, and did not mistake the loudest problem for the biggest one.');

  return { checks, advice, questions, decisions, perSession, patterns };
}

`, 'event study + teaching plain');

writeFileSync(f, src);
console.log('game.js copy pass 2 written');
