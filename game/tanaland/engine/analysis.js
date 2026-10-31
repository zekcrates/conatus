// tanaland/engine/analysis.js
// -----------------------------------------------------------------------------
// The post-game diagnosis: what your decisions reveal about how you decided.
//
// The book is not vague about what separated its good participants from its bad
// ones. It *measured* five differences (ch. 2, and the Reither "Dagu" study):
//
//   1. Good participants kept making decisions; bad ones made fewer and fewer
//      as things got worse (fig. 7).
//   2. Good participants reached more decisions per goal — they attacked one
//      goal with several unrelated measures at once, "acted more complexly"
//      (fig. 8).
//   3. Good participants recognised where the real problems lay early, instead
//      of spending their first sessions on peripheral matters (fig. 9).
//   4. Both groups generated hypotheses at the same rate; only the good ones
//      *tested* them. "Instead of generating hypotheses, they generated
//      'truths'" (p.24).
//   5. Good participants "controlled" their measures — asked what a measure had
//      actually produced. In Reither's study only 30% of decisions were ever
//      followed up, and the participants "shot off their decisions like
//      cannonballs" (p.179).
//
// Where this game can check a criterion against the player's actual record, it
// does so and says what it saw. Where it cannot be observed from the data, it
// says that too rather than inventing a verdict. The point is a mirror, not a
// grade: a player who ends with a poor country but a sound method should be
// told their method was sound.
// -----------------------------------------------------------------------------
import { MEASURES, MEASURE_ORDER, SESSIONS, evaluate } from './game.js';
import { C } from './sim.js';

const SECTORS = {
  water: 'water',
  land: 'land',
  animal: 'animals',
  people: 'people',
};

const active = (policy) => MEASURE_ORDER.filter((id) => (policy[MEASURES[id].field] || 0) > 0);

const groupsTouched = (policy) => {
  const s = new Set();
  for (const id of active(policy)) s.add(SECTORS[MEASURES[id].group] || MEASURES[id].group);
  return s;
};

const mean = (xs) => (xs.length ? xs.reduce((a, b) => a + b, 0) / xs.length : 0);
const stdev = (xs) => {
  if (xs.length < 2) return 0;
  const m = mean(xs);
  return Math.sqrt(mean(xs.map((x) => (x - m) ** 2)));
};

/**
 * @param {object} game  a finished (or abandoned) game object
 * @returns {{traits: object[], summary: string, timing: object}}
 */
export function analyse(game) {
  const d = game.decisions || [];
  const h = game.state.history || [];
  const traits = [];

  // ---------------------------------------------------------------- 1. control
  // Did the player ever look at what a measure produced? In this game the only
  // way to look is to change the programme after seeing results — a player who
  // sets the same policy for all six sessions has never checked anything.
  const seenResultsBeforeDeciding = d.filter((x) => x.month > 0).length;
  let changedAfterResults = 0;
  for (let i = 1; i < d.length; i++) {
    const prev = d[i - 1].policy;
    const cur = d[i].policy;
    if (MEASURE_ORDER.some((id) => (prev[MEASURES[id].field] || 0) !== (cur[MEASURES[id].field] || 0))) {
      changedAfterResults++;
    }
  }
  const controlRate = seenResultsBeforeDeciding ? changedAfterResults / seenResultsBeforeDeciding : 0;
  traits.push({
    id: 'control',
    title: 'Did you check what your measures produced?',
    book: 'Good participants asked what a measure had actually produced. In Reither\'s study only about 30% of decisions were ever followed up (p.179).',
    observed:
      seenResultsBeforeDeciding === 0
        ? 'You committed once and never revisited it.'
        : `You revised your programme at ${changedAfterResults} of ${seenResultsBeforeDeciding} sessions that had results to look at.`,
    rating: controlRate >= 0.6 ? 'strong' : controlRate > 0 ? 'partial' : 'absent',
  });

  // ---------------------------------------------------------- 2. complexity
  // How many distinct sectors were addressed at once? The book's good
  // participants pursued a goal with several unrelated measures. A single
  // sector is the failure case, so the bands start above 1.
  const sectorCounts = d.map((x) => groupsTouched(x.policy).size);
  const avgSectors = mean(sectorCounts.slice(-3));
  traits.push({
    id: 'complexity',
    title: 'Did you attack problems from more than one direction?',
    book: 'Good participants reached more decisions per goal — they pursued one aim with several unrelated measures, and "acted more complexly" (p.22).',
    observed:
      d.length === 0
        ? 'No decisions recorded.'
        : `In your last three sessions you were working in ${avgSectors.toFixed(1)} of the 4 sectors at once.`,
    rating: avgSectors >= 2.5 ? 'strong' : avgSectors > 1.1 ? 'partial' : 'absent',
  });

  // -------------------------------------------------------------- 3. dosage
  // Escalation is a documented failure mode ("overdoses of established
  // measures", p.180), so a jump to maximum across the board is worth naming.
  const doses = d.map((x) => mean(MEASURE_ORDER.map((id) => x.policy[MEASURES[id].field] || 0)));
  const maxed = d.map((x) => MEASURE_ORDER.filter((id) => (x.policy[MEASURES[id].field] || 0) >= 0.95).length);
  const peakMaxed = Math.max(0, ...maxed);
  traits.push({
    id: 'dosage',
    title: 'How hard did you push?',
    book: 'Under pressure, participants "apply overdoses of established measures," and the variability of dosage rises after a crisis (p.180-181).',
    observed:
      d.length === 0
        ? 'No decisions recorded.'
        : `Your average dosage ran ${mean(doses).toFixed(2)}; at its peak you had ${peakMaxed} of ${MEASURE_ORDER.length} measures at or near maximum.`,
    rating: peakMaxed >= 6 ? 'escalating' : peakMaxed >= 4 ? 'firm' : 'restrained',
  });

  // ----------------------------------------------------------- 4. consistency
  // "Slip-and-slide": bad participants leapt from subject to subject. But
  // staying with a programme is only a virtue if the player was *adapting* it;
  // setting one policy and never looking again is not consistency, it is
  // absence of control, and the control trait already reports that. So this
  // trait is only credited when the programme was actually revised.
  const switches = [];
  for (let i = 1; i < d.length; i++) {
    const before = groupsTouched(d[i - 1].policy);
    const after = groupsTouched(d[i].policy);
    const dropped = [...before].filter((g) => !after.has(g)).length;
    if (dropped) switches.push(dropped);
  }
  const revised = d.length > 1 && changedAfterResults > 0;
  traits.push({
    id: 'consistency',
    title: 'Did you stay with what you started?',
    book: 'Bad participants jumped between subjects — "slip-and-slide" transitions — because they hit difficulty and moved on (p.24).',
    observed:
      d.length < 2
        ? 'Not enough sessions to judge.'
        : !revised
          ? 'You never revised the programme, so there was nothing to stay with or abandon.'
          : `You abandoned a whole sector on ${switches.length} of ${d.length - 1} session changes.`,
    rating: d.length < 2 ? 'unknown' : !revised ? 'n/a' : switches.length === 0 ? 'strong' : switches.length <= 2 ? 'partial' : 'restless',
  });

  // --------------------------------------------------- 5. timing of attention
  // Did early effort go where the model says the danger was? The three slow
  // variables are water, grass and mouths. Touching one sector in session 1 is
  // not evidence of aiming at them — a lone clinics programme happens to "touch
  // people". Recognising where the problems lay implies breadth, so this
  // requires more than one sector in the opening programme.
  const first = d[0];
  const firstSectors = first ? [...groupsTouched(first.policy)] : [];
  const slowAddressed = ['water', 'animal', 'people'].some((g) => firstSectors.includes(g));
  const broadStart = firstSectors.length >= 2;
  traits.push({
    id: 'timing',
    title: 'Did you go for the slow variables early?',
    book: 'Good participants recognised where the real problems lay and attacked them first (fig. 9).',
    observed: first
      ? `Your first programme touched: ${firstSectors.length ? firstSectors.join(', ') : 'nothing'}` +
        (firstSectors.length === 1 ? ' — a single sector.' : '.')
      : 'No decisions recorded.',
    rating: !first
      ? 'unknown'
      : firstSectors.length === 0
        ? 'absent'
        : slowAddressed && broadStart
          ? 'strong'
          : slowAddressed || broadStart
            ? 'partial'
            : 'absent',
  });

  // ------------------------------------------------------------------ summary
  //
  // Weigh only the traits that genuinely distinguish good from bad method.
  // An earlier version compared raw counts, which let "restrained dosage" count
  // as a strength — but a player who did nothing is restrained *and* neglectful,
  // so a fire-and-forget run was being congratulated. Dosage is only a strength
  // if there was something to restrain.
  const didAct = d.some((x) => active(x.policy).length > 0);
  const isStrength = (t) =>
    t.rating === 'strong' || (t.rating === 'restrained' && didAct);
  const isWeakness = (t) => ['absent', 'escalating', 'restless'].includes(t.rating);

  const strengths = traits.filter(isStrength);
  const weaknesses = traits.filter(isWeakness);

  // F-33: the outcome has a veto.
  //
  // Counting traits alone produced a summary that told a player whose herds had
  // been wiped out and whose people had starved that "your method was better
  // than its outcome". Touching three sectors and dosing them heavily scored as
  // method even when the result was catastrophic — because these traits measure
  // what you did, never whether it worked.
  //
  // So: a disaster is never explained away as the system's fault. If the country
  // died or starved, the summary says so and the traits become evidence of what
  // went wrong, not excuses. Method can only be called better than its outcome
  // when the outcome was survivable.
  const state = game.state;
  const hist = state.history;
  const pop = state.popTupis + state.popMoros;
  const pop0 = hist.length ? hist[0].popTupis + hist[0].popMoros : pop;
  const famineMonths = hist.filter((x) => x.famine).length;
  const cattleStart = hist.length ? hist[0].cattle : state.cattle;
  const herdLost = cattleStart > 0 ? 1 - state.cattle / cattleStart : 0;
  const disaster =
    pop <= 0 || famineMonths > 0 || herdLost > 0.5;
  // The country held: people are alive, nobody starved, most of the herd is
  // standing. Used to keep "better than its outcome" for runs that earned it.
  const outcomeHeld =
    pop > pop0 * 0.6 && famineMonths === 0 && herdLost <= 0.5;

  let summary;
  if (!d.length || !didAct) {
    summary =
      'You left the country largely to itself. In the book this is the counterfactual the catastrophe is measured ' +
      'against — a legitimate choice, but it teaches you nothing about your own decision-making.';
  } else if (disaster) {
    // Name the damage first, then what the traits can and cannot excuse.
    const what = [];
    if (pop <= 0) what.push('the country emptied');
    else if (famineMonths > 0) what.push(`people starved (${famineMonths} month${famineMonths === 1 ? '' : 's'} of famine)`);
    if (herdLost > 0.5) what.push(`the herds were destroyed (${Math.round(herdLost * 100)}% gone)`);
    const damage = what.join(', and ');
    summary =
      `It went badly: ${damage}. ` +
      (strengths.length >= 2
        ? 'You did act on several fronts and you did start early — but acting widely is not the same as acting correctly, ' +
          'and none of it reached the slow variables in time. The points below show where the method looked right and the outcome still failed.'
        : 'The points below show which habits were missing; treat them as the place to start next time.');
  } else if (strengths.length > weaknesses.length) {
    // F-37: "better than its outcome" only makes sense when the outcome was BAD.
    // Awarded on a run that held, it read as faint praise for a success.
    summary = outcomeHeld
      ? 'The habits the book identifies in its good participants are largely present here, and the country held. ' +
        'That combination is what the exercise is trying to teach.'
      : 'Your method was better than its outcome. The habits the book identifies in its good participants are largely ' +
        'present here, so the country\'s fate came from the system — and from your reading of it — not from carelessness.';
  } else if (weaknesses.length > strengths.length) {
    summary =
      'The difficulties you ran into are of the kind the book attributes to method rather than to bad luck. ' +
      'Read the points below as things to try next time, not as a verdict on the attempt.';
  } else {
    summary =
      'Your record is mixed: some of the habits that distinguish good from bad decision-making, and some of the others too.';
  }

  return { traits, summary, controlRate, avgSectors, decisions: d, didAct };
}

export { SESSIONS };
