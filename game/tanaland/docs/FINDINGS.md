# FINDINGS — hypothesis log for the Tanaland build

Every entry: **symptom (observed fact) → hypothesis → discriminating experiment → verdict.**
No fix is made without an entry here. Newest first.

The claims being verified are the book's *stated dynamics*, encoded as executable
assertions in `../tests/claims.mjs` and checked across several seeds. "Claims
passing" below always means `node tanaland/tests/claims.mjs` output.

## Status: all 13 claims pass on 60 of 60 seeds; the game is now winnable

`node tanaland/tests/claims.mjs` → `FAILED SEEDS: 0 / 60`.

**The ten-year distribution is now sane** (`node tanaland/tests/reachability.mjs`,
5 seeds each, after F-35/F-36):

| strategy | outcome | herd kept |
|---|---|---|
| all nine measures, modest doses | **It held**, 5/5 | 0.62 |
| tsetse control alone | **It collapsed**, 5/5 | 0.01 |
| herd limit only | It survived, damaged, 5/5 | 0.48 |
| do nothing | It survived, damaged, 5/5 | 0.34 |

That is the book's lesson made mechanical: killing the tsetse without restraining
the herd is the cattle catastrophe, and the single most destructive measure in the
game is the one that "fixes" the flies.

**This was not true before F-36.** Until the herd-limit bug was fixed, *no*
strategy reached the top band and `do nothing` was unbeatable — the game had no
learnable skill. Two earlier "status" claims in this log were drawn from runs
invalidated by F-35 and should not be trusted.

### Other suites

| suite | command | status |
|---|---|---|
| all assets present & inside the server root | `node tanaland/tests/check-paths.mjs` | OK |
| UI end-to-end (tiles, 6 sessions, report, diagnosis) | `node tanaland/tests/web/dom-smoke.mjs` | no problems |
| is the top band reachable / does play beat idling | `node tanaland/tests/reachability.mjs` | both yes |
the browser's IPC pipe (headless Edge fails with `Check failed: . : Access is
denied`), so **the UI has never been seen rendered**. `dom-smoke` runs the real
app against a DOM shim and proves structure, order and content — not appearance.
Nothing here should be read as a claim about how the page looks.

---

## D-04 — Map removed; the page redesigned around the actual job

**Owner decision.** "no need to show the map, its pointless" — and then "now that
u removed map, now don't you think u have to design the overall ui of that page?"

**What was removed.** `web/js/map.js`, its three test scripts, the `--map-*`
token block in `theme.css`, the `.map-mount`/`.map-svg` rules, and `createMap`
from the page. A `dom-smoke` assertion now requires that **no** map element
renders, so a regression cannot quietly bring it back.

**A correction worth recording.** I had earlier said "map dropped" when I had
only stopped *iterating* on it — the map was still on screen. Removing it meant
deleting it, not abandoning it.

**The layout defect the removal exposed.** With the map gone, the left column
held nothing but charts while the right sidebar still had to carry the briefing,
nine measure sliders and the commit button. The page was structurally unbalanced.

**New layout.** One reading order matching what a player does:

1. **Briefing panel** (left, top) — the report you must read before acting.
2. **Record** (left, below the briefing) — the ten-year charts.
3. **Programme** (right, top) — the measures, so the sliders sit high on the page
   and stay in view (sticky) while the record scrolls.

Measure tiles were tightened (the blurb now reveals on hover/focus/active rather
than occupying every tile permanently) so nine measures fit without a wall of
scrolling.

**Revised after owner feedback.** The first attempt gave the briefing the *full
width* on top, which pushed the sliders below the fold — "the briefing takes
whole page, it can take half left page and then we can move our sliders upwards."
The briefing and programme now share the top row. On one column the programme is
ordered *first* (`order: -1`) so it is not stranded under the charts.

**Verification.** `dom-smoke` asserts the new structure — `.briefing-panel`,
`.col-main`, `.col-side`, `.record-panel`, `.programme-panel` present; the main
column holds exactly briefing + record; the side column holds only the programme.
Verified non-vacuous by moving the programme back under the briefing, which fails
with "layout is missing .col-side" and "col-main should hold briefing + record,
found 3". All CSS variables used are defined in `theme.css`.

---

## F-29 / D-05 — The player could not investigate anything, so no hypothesis could be tested

**Symptom.** The briefing reported only outcomes — population, cattle, famine.
There was no way for a player to go and look at anything.

**Why that matters.** This is the book's central finding about *process*: good and
bad participants proposed hypotheses with the **same** frequency; they differed in
whether they **tested** them. "For them, to propose a hypothesis was to understand
reality; testing that hypothesis was unnecessary. Instead of generating
hypotheses, they generated 'truths'" (p.24). Dörner's illustration is a good
participant's burst of questions: "Is that so? How many are out of work? Why
haven't they moved to other communities for training?" (p.24).

A game that never lets you ask "how many?" cannot teach that difference.

**Fix — surveys.** Five commissions, offered from the second session: water
table, land cover, pasture, pests, markets. They cost money (60–180 a sitting)
and return findings at the **next** report, matching Spiegel's account that
effects "were reported back at the following sitting".

**The intransparency constraint is preserved.** A survey returns *prose evidence
with error* — "The water table is nearly exhausted and still falling. Some
boreholes now yield sand before water." — never the hidden number. Estimates
carry ±4–5 % jitter. `dom-smoke` asserts a finding never contains the words
*groundwater*, *vegetated* or *carrying capacity*.

**Two defects found while wiring it up:**

| symptom | cause | fix |
|---|---|---|
| The UI crashed on every session after the first, for **all** players | `g.surveyLog` is undefined until a survey runs, and I read its `.length` | guard on existence, not length |
| **The test suite hid that crash** | an uncaught exception killed the script *before* it printed its report, so the run looked like a quiet pass with short output | `process.on('uncaughtException'/'unhandledRejection')` now print the stack and exit 1 |

The second is the more serious: it means the suite could previously have passed
with the game broken. Verified by reintroducing the `surveyLog` bug — the suite
now fails loudly with a stack trace.

**End-to-end proof.** `dom-smoke` commissions a survey through the real UI mid-
game and requires the finding in the next report: *5 options offered, 1 finding
returned, no hidden variable named*.

---

## D-06 — The final report: four sections, in the order a player asks

**Owner instruction.** "keep the end reports nice, intuitive ui and simple."

**What was wrong.** The report was a flat stack of blocks with no hierarchy and no
headings separating one kind of information from another. Worse, the "reveal" strip
of six figures (`Groundwater left`, `Grassland left`, population, cattle, famines,
spent) sat next to a bullet list that restated the same six facts in sentences —
the same information twice, in two visual languages.

**New structure — four sections, one question each:**

| # | section | answers |
|---|---|---|
| 1 | **The verdict** | How did it go? Score, one-line outcome, and a meter whose colour follows the band (green / amber / clay). |
| 2 | **What was happening while you were deciding** | What was I not allowed to see? The six decisive numbers, as compact cards. |
| 3 | **What the record shows** | What did I actually do? The findings, one plain sentence each. |
| 4 | **How you decided** | Not how lucky you were? The five measured traits. |

**Simplifications.** The score and its meter now sit side by side in one compact
block instead of stacking to a half-page. Trait badges are toned by outcome
(`tone-good` / `tone-mid` / `tone-off`) so the column can be scanned without
reading; the badge rule is centralised instead of repeated per rating. The
diagnosis caveat ("these are measured differences, not advice") moved from a large
grey paragraph *above* the content to a quiet footnote *below* it — it is context,
not the message. Score band and heading wording were tightened ("How you decided"
/ "Not how lucky you were" instead of the longer originals).

**Verification.** `dom-smoke` now asserts the report's *shape*, not just presence:
at least four sections, all four present, and in the order verdict → reveal →
findings → diagnosis. Verified non-vacuous twice — dropping the `findings-summary`
class fails with "report has no findings section", and blanking the badge label
fails with `bad trait badge text: ""`.

**Known limit.** This is verified structurally and by token resolution; the visual
result has not been seen. Proportions and spacing are judgement calls until the
owner looks at the page.

---

## D-07 — Meta-commentary removed from the intro

**Owner instruction.** "remove this ... Scored on stability ... A reconstruction of
the exercise in *The Logic of Failure* ... No published rulebook exists ... — don't
use these things, they don't need it."

**Removed** from the intro aside:
- the "Scoring rewards a country still standing at the end — not the highest
  numbers you reach on the way there" paragraph;
- the "A reconstruction of the exercise ... no published rulebook ... fitted to
  the behaviour the book describes" disclaimer;
- the divider that separated them.

The intro aside is now just the six-row spec table. The player is told the rules
that matter (duration, sessions, months, measures, what is scored), not a
discussion about the game's own epistemic status. That belongs in the docs, where
it already lives (`README.md` § "What it is not", and this file).

**A stale number found while trimming.** The same block advertised "Measures
available: **8**" — but there have been nine since the tractors were added (F-28).
It is now `String(MEASURE_ORDER.length)`, so it cannot drift again.

**Verification.** `dom-smoke` asserts the intro shows none of the removed copy, that
the spec table still has its rows, and that the measure count equals
`MEASURE_ORDER.length`. Both guards verified non-vacuous: restoring the scoring
paragraph fails with `intro still shows removed copy: "scoring rewards"`, and
restoring the literal `8` fails with `intro says measures available = "Measures
available8", expected 9`.

---

## F-30 — Clicking "Commit" four times skipped four sessions

**Reported symptom.** "when i do the sliders i am shown a form, when i click on the
form ... instead it stays there, i clicked on it 4 times before i thought it was
working, when i checked i was already in session 5."

**Root cause.** `commitSession` ran twenty months and re-rendered *synchronously*,
with no busy state and no re-entrancy guard. Nothing on screen changed while it
ran, so the button stayed live and looked inert; every click that landed advanced
another twenty months. Four clicks = four sessions. The player was never skipping
ahead by accident — each click genuinely ran a full session.

**Fix, three parts.**
1. **Hard lock.** `ui.committing` guards `commitSession` and returns early on
   re-entry. A queued click cannot advance the simulation even if it arrives
   before the button has visibly disabled.
2. **The button kills itself.** On click it disables, relabels to "Running the
   session…", and greys out — immediate feedback that the click registered.
3. **A real progress screen.** A full-screen card ("Twenty months are passing")
   with a percentage, a month counter and a bar, advanced across ~12 frames so the
   work is visible rather than silent. Then the new report renders and the page
   scrolls to the top.

**Two host-compatibility defects found while building it, both fixed in the app
rather than papered over in the test shim:** `.style.width` and `window.scrollTo`
are not available in the DOM shim. The fill now uses `setAttribute('style', ...)`
(the same mechanism the score bar already used) and the scroll is feature-checked.

**Verification.** The smoke test now drives four extra rapid clicks on the first
commit and requires that the run still covers all **120 months** — the exact
symptom reported. It also requires the progress screen to appear on every commit.
Verified non-vacuous: with the lock removed the test fails.

---

## F-31 — The inaugural briefing crushed sentences into number-sized cells

**Reported symptom.** "these boxes of 5 could be better design instead of in single
line maybe in rows or whatever to have nice ui."

**Root cause.** Five facts shared one `auto-fit` grid with a `130px` minimum: three
short values (`1,600 Tupis · 800 Moros`, `2,400`, `5,200`) and two full sentences
("Barely enough. Mice, rats and monkeys take a share, and the soil is tired.").
An equal-column grid sized for the numbers forced the sentences into ~130px
columns, wrapping them to six lines each beside a one-line number.

**Fix — separate the two kinds of information.** Short values are *figures*; a
sentence is an *observation*, and they no longer share a container.
- `.stat-row` holds three `.stat-tile`s: label above a large tabular value.
- `.note-list` holds `.note-tile`s spanning the full width: label in a fixed
  84px column, prose filling the rest, with a rule on the left. Stacks to one
  column under 520px.

The periodic session report was switched to the same `.stat-row`, so "here are the
numbers" looks the same in the inaugural and later briefings. The now-dead
`.briefing .fact` rules were deleted (`factRow` survives for the final report's
reveal strip).

**Verification.** `dom-smoke` asserts 3 stat tiles and exactly 2 note tiles, that
observations are sentences rather than short values, and — critically — that the
observations live in their own `.note-list` and not in `.facts`. That last check
was added after noticing the first version of the assertion *could not fail*:
moving the observations back into `.facts` still left two `.note-tile` elements,
so only a container assertion catches the regression. Confirmed: it now reports
"observations are not in a .note-list of their own".

---

## D-08 — Intro screen cut to a title and one button

**Owner instruction.** "keep this simpler or just remove it" — the three numbered
blocks (01 The country / 02 Your instruments / 03 What you will see).

**Removed.** All three. They restated what the player learns in the first two
minutes anyway: the geography appears in the inaugural briefing, the measure list
is literally the sliders on the next screen, and "you will only see some things"
is the *premise* of the exercise, not something to announce in advance. The intro
is now: eyebrow, title, one sentence, one button.

Also fixed in the same line: the subtitle said "**eight** measures"; there are
nine. It now reads `${MEASURE_ORDER.length}`.

**Dead code removed with it.** `briefItem()`, `.brief-list`, `.brief-item` and
`.brief-item .k`.

**And the "Fixed seed" button.** It was a debug affordance I left in the product:
a second start button that always seeded the run with `12345`, so a player who
used it got byte-identical Tanaland every time. Meaningless to a player, and it
quietly removed the variability the game depends on. Removed; `dom-smoke` now
fails if it reappears, and starts the game through the real "Begin the ten years"
button.

---

## F-32 — The seed barely changes anything

**Found while removing the "Fixed seed" button.** With that button gone every run
gets a random seed, so the outcome should vary. It does not:

| seed | verdict | score | famines | final population |
|---|---|---|---|---|
| 39424 | not-quite-so-lamentable | 73 | 0 | 9,718 |
| 83928 | not-quite-so-lamentable | 73 | 0 | 9,766 |
| 77757 | not-quite-so-lamentable | 73 | 0 | 9,863 |
| 12345 | not-quite-so-lamentable | 73 | 0 | 9,734 |
| 1 | not-quite-so-lamentable | 73 | 0 | 9,955 |
| 42 | not-quite-so-lamentable | 73 | 0 | 9,865 |

Identical verdict, identical score, zero famines, on every seed — only the final
population moves, by about ±1.5 %. Rainfall and the stochastic terms vary, but not
enough to change any outcome band.

**Why this matters.** "Fixed seed" was pointless *and* so is "random seed": the run
is effectively deterministic either way. If the game plays the same every time,
the replay value and the "you cannot know what is coming" pressure both vanish —
and a player can learn one winning programme and apply it forever.

**Status: open.** This is a balance issue, not a UI one, and it interacts with the
scoring inversion already logged (doing nothing scores 100). Both should be fixed
together — making outcomes seed-sensitive without first fixing the scoring would
just add noise to a broken incentive. Not yet addressed.

---

## D-10 — The report rebuilt from first principles

**What was wrong with it.** It was a scoreboard: a number, a bar, a grid of facts,
then a list of trait badges. It answered "how many points" — a question the model
cannot answer — and not "what did I do, and what did it cost", which is the only
question the exercise exists to ask.

**What it answers now, in this order:**

1. **What happened to Tanaland?** — the named outcome, then a sentence in words.
   *"The country paid for what was done to it: people starved, the herds were
   destroyed, the grassland was stripped."*
2. **What was I not shown?** — groundwater, grassland, famines, spending. The gap
   between the ministries' forms and the country is the point of the game.
3. **What did my programme do?** — per measure, straight from the decision log:
   how many sessions it ran, from when, at what strength, and whether anything was
   done about it before then. This was missing entirely: the player learned the
   outcome and never learned which of their own decisions produced it.
4. **How did I decide?** — the five habits, unchanged.

**Why the number had to go.** It invited exactly one reading: *"I did badly, but it
gave me 80."* Precision the scoring does not have, in a game whose whole subject is
decisions made without enough information. Four named outcomes are coarse on
purpose.

**Verification.** `dom-smoke` asserts the four sections exist and are in order,
that no `x/100` figure appears anywhere in the report text, and that the verdict card
carries a real account with no `undefined`/`NaN`.

---

## F-35 — Silent policy keys invalidated every calibration run

**Symptom.** Three strategies that should behave completely differently — tsetse
control on, off, and no measures at all — produced **byte-identical** ten-year
traces. Turning tsetse control on changed nothing at all.

**Cause.** `policyFrom` was a bare `Object.assign`, and the measure *id* (`tsetse`)
is not the policy *field* (`tsetseKill`). Writing `setPolicy(g, { tsetse: 1 })` — the
obvious mistake — added a junk key and switched nothing on. Every one of my
calibration scripts had been doing this. The conclusions I had drawn from them
("every strategy loses 66% of the herd", "do nothing ties with the best play") were
artefacts of a typo, not properties of the game.

**Fix.** `policyFrom` now throws on an unknown field, with the correct field name in
the message:

```
unknown policy field "tsetse" (measure "tsetse" uses the policy field "tsetseKill").
```

**Lesson.** A silent no-op in a configuration API is worse than a crash: it produced
plausible numbers. Anything that takes a key should reject keys it does not know.

---

## F-36 — "Herd limit" wiped out the herd

**Symptom.** `herdLimit` performed *worse* than doing nothing — herd retained 0.03 vs
0.34 — so the one measure the book says is the correct response to overgrazing
(pp. 81) was the most destructive thing in the game.

**Cause.** It removed 6% of the herd **every month** at full strength: about 52% a
year, compounded over ten years. That is not a herd *limit*, it is a slaughter rate.

**Fix.** It is now a ceiling: herd is held near `carryingCapacity × (1 − 0.5 ×
strength)` and stepped toward it at 35% a month. Culling protects the sod without
erasing the herd.

**Effect — this was the change that made the game playable:**

| strategy | before | after |
|---|---|---|
| herd limit only | herd 0.03, bad | herd 0.48, mixed |
| tsetse + herd limit | bad | mixed, herd 0.59 |
| all measures, modest | bad | **good 5/5**, herd 0.62 |
| tsetse only | catastrophic | catastrophic (unchanged — correct) |
| do nothing | mixed | mixed |

---

## F-37 — "Better than its outcome" awarded to a run that held

**Symptom.** A run that reached the top band was summarised as *"Your method was
better than its outcome"* — faint, confusing praise for a success.

**Cause.** The phrase was the generic branch for "more strengths than weaknesses",
regardless of whether the outcome was good.

**Fix.** Reserved for the case it was written for. A run that held now reads "the
habits … are largely present here, and the country held."

---

## F-38 — `capacityCattle` did not exist

**Symptom.** Every "herd exceeds carrying capacity" check was dead code.

**Cause.** `derive()` returns `carryingCapacity`; two places in `game.js` read
`capacityCattle`, which is `undefined`, so `s.cattle > undefined * 1.05` was
`s.cattle > NaN` — always false. The check silently never fired.

**Fix.** Both reads corrected. The hidden-state block now reports the real number
(1,248 at start, against a starting herd of 2,400).

---

## F-34 — The score had no notion of *sustained*, only of *final*

**Symptom.** A run ending with 75 cattle of 2,252 — 97% of the herd gone — scored
"mixed", because the surviving end state was tidy: no famine, population stable,
grass intact.

**Cause.** Every check read the final month only. The book's criterion is stability
*over time*.

**Fix.** The run's worst point now counts: a population trough below 50% of the
start, or a herd trough below 20%, costs points. The "no famine" bonus is also gated
on the population actually being alive — it was being awarded to runs that had
emptied the country by other means.

---

## D-11 — Reachability as a standing test

`tests/reachability.mjs` searches ~400 strategies plus a set of named ones and
answers two questions that no unit test was asking:

1. **Is the top band reachable?** For a while it was not — 406 strategies and not one
   reached "It held". That is a design bug, and only a search finds it.
2. **Does play beat idling?** If `do nothing` ties with the best strategy, the game
   has no learnable skill and the report has nothing to teach.

Current state: both answers are yes — `all modest` reaches "good" 5/5, `do nothing`
is "mixed" 5/5, `tsetse only` is "catastrophic" 5/5.

---

## F-33 — A bad run was congratulated ("your method was better than its outcome")

**Symptom (reported by the owner).** A run in which the herds were wiped out and the
country declined came back with a score of 80/100 and the diagnosis *"Your method
was better than its outcome… the country's fate came from the system, not from
carelessness."* The owner's words: "i did worst, people died and whatever, and this
is what it reports?"

**Three separate faults, all verified by reproducing the run:**

1. **The herd could not lose points.** The cattle line awarded `+5` or `0` and never
   subtracted, so losing four fifths of the cattle cost nothing. A run ending with
   473 head of 2,321 still scored 73.
2. **Famine was worth 50 of 100.** Nearly half the total on one line meant a run
   could be "saved" by avoiding famine alone. The do-nothing run did exactly that:
   50 + 20 + 15 + 10 − 25 = 70, landing in the top band while two thirds of the
   cattle were dead.
3. **The diagnosis counted traits, never outcomes.** `complexity` and `timing` reward
   *touching* sectors and *starting early* — never whether the measures were the
   right ones. So a busy, wrong-headed programme scored 3 strengths against 2
   weaknesses and earned "your method was better than its outcome". This is
   structurally wrong, not a threshold error: those traits measure what you did,
   never whether it worked.

**Fix.**
- The herd line now subtracts (−25 / −12 / −8) and can award +10 for keeping it.
- Famine reduced from 50 to 30 so no single line decides the outcome.
- **The outcome has a veto in the summary** (`disaster` = population gone, any
  famine, or more than half the herd lost). A disaster can no longer be explained
  away as the system's fault; the summary names the damage first.
- **The score out of 100 is gone entirely.** A sum of hand-set bands is not a
  measurement. The player gets one of four named outcomes — *It held / It survived,
  damaged / It went badly / It collapsed* — plus an account in words of what
  actually happened.

**Verified across 13 seeds × 3 strategies (39 runs):** no run with a famine, a dead
population or a wrecked herd is praised. Previously social-heavy was praised in the
top band on every seed.

**Known gap, not yet fixed:** no strategy in that sweep reaches "It held",
including doing nothing — the best any run manages is "It survived, damaged". Either
the good band is reachable only by a strategy none of these three approximate, or it
is currently unreachable and the thresholds need a pass. This is unresolved and
should be treated as open.

---

## D-09 — "What to look at" and a session recap

**Why.** Our loop had no middle: the player read a wall of numbers, moved sliders,
and the page redrew with a different wall of numbers and no comment. Nothing said
what was wrong or what their programme had done. (Compared against the Lohhausen
build, whose `advisorNotes()` and session recap are what make its loop readable —
but Lohhausen has fifteen areas and an inbox; Tanaland has nine sliders, so this
is deliberately much smaller.)

**`concerns(game)`** — at most three notes, urgent first:

> **URGENT · The herds have collapsed** — Cattle are down to 529 from about 2321.
> The herders give different reasons and none of them can be checked from here.

Design rules, all of which matter:
- **It diagnoses only from what the ministries could legitimately know.** No
  groundwater, no grass. When the hidden variables are the cause, the note will
  not name them — it says the herders "give different reasons and none of them
  can be checked from here". Confirming it is what the *surveys* are for.
- **When nothing is wrong it says so** ("Nothing is going wrong yet") instead of
  inventing a problem to look busy.
- Three, not ten. A list of ten is another wall.

**`recap(game, fromMonth)`** — three movements plus the measures that were
running, with the honest caveat that the country also moves on its own, so this is
what *followed* the programme rather than what it caused.

**Two threshold bugs found while building it, both by reading real output:**

| symptom | cause | fix |
|---|---|---|
| Cattle collapsed from 2,321 to 529 and **no note appeared** | the detector used year-on-year trend, but a herd here falls fast and then *flattens* at the level the land carries — so the trend read −3% while two thirds of the cattle were gone | detect the level against the starting herd as well as the direction |
| Food warnings never fired at the right time | I assumed `food` was an absolute supply; it is food-per-head against need, where **1.0 is "just enough"** and famine starts below 0.62, so comfortable runs sit at 2–10 | thresholds rewritten on that scale (urgent < 1.2, watch < 1.8) |

In the recap, food was then printed as "rose 24% (7 → 9)" — a ratio shown as a raw
count. It now reads "(7.42 → 9.20, where 1.00 is just enough)".

**Verification.** `dom-smoke` requires at least one concern with a title and an
explanation and no `undefined`/`NaN`, and a recap with movements and a statement of
what was running. Both verified non-vacuous — emptying the notes list fails with
'the briefing shows no "what to look at" notes'; forcing `recap` to null fails with
'no session recap after twenty months'.

---

## F-28 — Tractors were named in the book but missing from the game
**Symptom (fidelity gap).** *The Logic of Failure* p.12 lists the measures
participants could take: "hunting regulations, improve the fertilization of the
fields and orchards, install irrigation systems, and build dams. They could
electrify the entire region and **mechanize it with the purchase of tractors**…
introduce birth-control measures and improve medical care." The game implemented
eight measures, none of them mechanisation — even though the "fifty tractors to
clear the southern forests" episode (p.18) is one of the book's best-known set
pieces.

**Hypothesis.** Mechanisation is a distinct, *player-directed* lever: it raises
the *rate* of land clearing, not the yield per acre, and it is paid for in
forest and soil.

**Discriminating experiment.** Compare idle, tractors at 0.5 and 1.0, fertiliser
alone, and tractors + fertiliser over 240 months, watching acreage, forest, and
food.

**Verdict — the first implementation was inert.** With `tractorDegrade: 0.35` the
soil penalty at full mechanisation was only ×0.785. Tractors bought +50 %
acreage for almost nothing, and food barely moved:

| scenario | food (240 mo) | forest |
|---|---|---|
| idle | 1.39 | 0.89 |
| tractors only | 1.32 | 0.36 |

The measure stripped the forest and still left the country almost as well fed —
so it taught the opposite of its lesson. **The bug was the size of the penalty,
not the mechanism.**

**Fix.** `tractorDegrade` 0.35 → 1.30, so full mechanisation costs roughly a
quarter of the yield. Now:

| scenario | food (240 mo) | forest | vs idle |
|---|---|---|---|
| idle | 1.39 | 0.89 | — |
| tractors | **0.76** | 0.36 | −45 % |
| fertiliser alone | 3.99 | 0.85 | +187 % |
| tractors + fertiliser | 2.03 | 0.32 | +46 % (worse than fertiliser alone) |

Tractors now do what the book says they do: they look like progress — more
acreage every year — while the country gets hungrier, and they make an
otherwise good programme worse.

**Guards.** Two new claims, `H15_tractors_strip_forest` and
`H15_tractors_reduce_food`, run over 240 months and pass on 60/60 seeds.
Verified non-vacuous: restoring `tractorDegrade: 0.10` fails
`H15_tractors_reduce_food` on **20 of 20 seeds**.

**A second defect this exposed.** `analysis.js` hardcoded "of 8 measures" in the
dosage line, so the diagnosis told players the wrong total the moment a ninth
measure existed. Now derived from `MEASURE_ORDER.length`, with a `dom-smoke`
assertion that fails if any hardcoded count reappears (verified by reintroducing
it).

**Not implemented:** *dams* and *electrification*, the book's other two named
measures. Dams would duplicate irrigation's water-storage role without a distinct
causal story; electrification has no documented in-game effect. Adding either
would be invention rather than reconstruction, so they are deliberately absent.

---

## D-03 — The map is a relief map of a place, constrained by the text

**Problem.** The old map was a handful of hand-placed blobs: a river line, a
lake ellipse, two dots. It read as a schematic, not as somewhere real.

**Method.** Geography was fixed from the primary source before any drawing
(`research/TANALAND.md` §1a records the constraints and their pages), then made
*plausible* using the real Kenyan region the place names are borrowed from. The
names are not invented: Tanaland was a real province named for the Tana River,
and Lamu is a real island town at 2°16′S 40°54′E. This licenses specific
features the book is silent on — a river rising in high ground and crossing
semi-arid plains, riparian forest on the floodplain, and seasonal west→east
"galan" channels, which are what make a canal to the Nehutu physically sensible.

**Build.** Terrain is a deterministic field (sum of gaussians + fixed-noise
undulation). The same field decides the elevation bands, the steepness shading,
and where the valley trench sits, so the drainage is consistent with the relief
rather than drawn on top of it. The lake, the river's terminus and the terrain
basin are all derived from one constant (`LAKE_NORM`), so they cannot disagree.

**Defects this exposed (found only by checking, not by looking):**

| Symptom | Cause | Fix |
|---|---|---|
| Owanga ended 132 px short of Lake Mukwa | lake basin was centred at (0.27, 0.55) but the lake was *drawn* at y≈0.765 | single `LAKE_NORM`; the river's last point ends there; basin, outline and Lamu all derived from it |
| The channel sat above its banks on 7/7 reaches | **the test was wrong** — it compared against the *mean* of two banks, which on a hillside is always above the uphill side | compare against the *higher* bank; now 7/7 pass |
| Lake centre sat at terrain −0.16, i.e. not in a basin | consequence of the first defect | now −1.03 |

**Self-derived Lamu.** The book says Lamu is on the lake shore; it is now placed
by offset from `LAKE` so it cannot drift onto dry land.

**Verification, and its limit.** `tests/check_map_geography.py` asserts every
feature the book fixes is where the book puts it, that the river runs downhill,
that the channel is below both banks, and that the canal to the Nehutu is
possible. It also asserts the Python mirror has not drifted from `map.js`
(verified by mutating the constant — the check fails).

⚠️ **Not verified: how the map looks.** The sandbox blocks the browser's IPC
pipe, so headless Chromium cannot start and no screenshot is possible; the model
also cannot read images. `tests/render_map_preview.py` rasterises the same
geometry with Pillow to `tests/map-preview.png` for a human to look at, but that
is a preview of the *geometry*, not of the app. The map's visual quality remains
unconfirmed by me and needs a human eye.

**Status: the owner has since said the map is not the priority — work moved to
the game itself (see F-28).** The map work above stands and is verified as far as
it can be without eyes; no further map iteration is planned.

---

## D-02 — The post-game report diagnoses *how* you decided, not only what happened

**Requirement.** A player should leave knowing what their decisions revealed
about their thinking, and the book supplies the criteria.

**What the book actually measured.** Dörner does not merely assert that good
participants differed from bad ones; he reports five measurable differences:

| # | Finding | Source |
|---|---|---|
| 1 | Good participants kept making decisions; bad ones made fewer and fewer as things worsened | fig. 7, p.21 |
| 2 | Good participants reached more decisions *per goal* — one aim, several unrelated measures; they "acted more complexly" | fig. 8, p.22 |
| 3 | Good participants recognised the real problems early instead of spending early sessions on peripherals | fig. 9, p.22-23 |
| 4 | **Both groups generated hypotheses equally often; only the good ones tested them** — the bad "generated 'truths'" | p.24 |
| 5 | Good participants *controlled* their measures. In Reither's study only 30 % of decisions were ever followed up; participants "shot off their decisions like cannonballs" | p.179 |

**Implementation.** `engine/analysis.js` checks the player's own decision record
against these, and the report renders the result. To make this possible the game
now stores each decision (`game.decisions`) with the state it was taken against —
the sequence was previously discarded, leaving nothing to diagnose.

**Honesty constraint.** Where the data cannot show a trait, the panel says so
instead of inventing a verdict. Criterion 4 (hypothesis testing) is **not**
observable from the choices alone, so it is not scored.

**Two judgement bugs found while testing this, both fixed:**
- A fire-and-forget run was being congratulated ("your method was better than its
  outcome") because the summary compared raw counts and "restrained dosage" counted
  as a strength — but a player who does nothing is restrained *and* neglectful.
- `consistency` rated **strong** for never changing a plan, and `timing` rated
  strong for a lone clinics programme that happened to touch one sector. Staying
  with a plan is only a virtue if you were adapting it, so both are now
  conditional on actually revising.

**Guard against regression.** `dom-smoke.mjs` asserts the panel renders at least
five traits, each with an observation and a rating, and contains no
`undefined`/`NaN`. Verified by deletion: removing the panel fails the suite.

---


**Question raised.** Is dragging a slider the right way to play? Every decision
could be binary — fund the measure or don't.

**Verdict: keep the slider, because dosage is part of the original.** This is
not a UI preference; it is a mechanic. The book defines dosage explicitly with
worked examples: "If, for example, we apply three tons of fertilizer to an acre
of land, we are applying a higher dosage of that measure than if we use two tons
per acre. If we requisition the drilling of thirty wells, that is a higher
dosage than a requisition for only ten wells" (p.180).

More importantly, **dosage is itself one of the failure modes being taught.**
Dörner reports that under time pressure participants "apply overdoses of
established measures" (p.180), and that after a crisis the *variability* of
dosage rises measurably — participants either escalate or give up.

**What was wrong was the presentation, not the control.** A bare `0.1`–`1.0`
slider forces the player to think in abstract fractions. The control stays
continuous (the mechanic is untouched), but the readout now uses the country's
own units: "20 wells", "1.5 tons an acre", "cull 25 % of the herd".

**Guard against regression.** `dom-smoke.mjs` asserts that no measure reports a
bare fraction like `0.30`, and that dosage reads as prose in both the zero and
funded states.

---


## F-26 — Clearing new land made the country poorer

**Symptom.** The idle run starved from about month 150 no matter how the other
constants were set. Acreage rose 1.0 → 1.7 while the yield penalty *deepened*
from 0.75 to 0.33.

**H-26 — pressure was measured per country, not per acre.** `pressureOnLand =
popTotal / 2400`, so every new mouth added pressure even as the country opened
new fields. The model punished the very response that should have helped.

**Verdict: supported, fixed.** Pressure is now
`popTotal / (2400 * millet)` — people per unit of land actually worked.

---

## F-25 — Only famine braked the population, so it sawtoothed

**Symptom.** With famine as the sole density-dependent brake, the idle run grew
until it overshot, starved, recovered, and overshot again: 100+ famine months
over 20 years in the do-nothing scenario, which contradicts p.82 ("they would
not have starved").

**H-25 — subsistence societies level off by disease and infant mortality, long
before famine.** Added `crowdKill`, a quadratic rise in mortality once the
country fills past `crowdOnset = 2.0` of its starting population.

**Verdict: supported, fixed.** Calibrated by sweep: at `crowdDeathScale` 0.006
the idle run still starved after 20 years; at 0.010+ the brake crushed the
population to a few hundred (an equally wrong failure). **0.008** holds the idle
equilibrium at food 1.45 with zero famines over 240 months.

---

## F-24 — Acreage tracked the farmer headcount, so it could never grow

**Symptom.** Opening the acreage ceiling from 1.12 to 3.4 changed nothing;
acreage froze at 1.24 every time.

**H-24 — the acreage target and its only driver were the same number.** The
rule was `millet += 0.004 * (popTupis/tupis0 - millet)`, which converges to
`popTupis / tupis0` no matter how much land was available. Supply therefore
froze while the population kept multiplying.

**Verdict: supported, fixed.** The target now includes a hunger term
(`1 / feedPrev`, bounded by `acreageStress`), so a hungry country clears land.

---

## F-23 — A linear famine brake selects for starvation, always

**Symptom.** Across ~30 parameter combinations, every run settled at food =
0.600 — exactly 0.02 below the 0.62 famine threshold, on every seed, under every
setting. The idle run always starved.

**H-23 — it is the shape of the curve, not the calibration.** Mortality growing
*linearly* from the threshold always meets the birth rate just under it. Any
equilibrium of that curve lies in famine by construction.

**Discriminating test.** Held everything else fixed and swept only
`famineRamp`: ramp 1 → food 0.600; ramp 2 → 0.522; ramp 4 → 0.379. The fixed
point moves *down* with the exponent, confirming the mechanism.

**Verdict: supported, fixed.** The brake is now effectively off above the
threshold and steep below it (`famineRamp = 3`). With the brake off,
`birthBase` alone determines where the population settles, and sweeping it shows
a clean, monotone response (0.010 → food 2.40; 0.014 → 1.05; 0.016 → 0.66;
0.018 → 0.48).

---

## F-22 — The famine brake was too soft to be a catastrophe

**Symptom.** After F-20/F-21, no run crossed the famine threshold at all: the
gentle hunger ramp and the fertility brake cancelled, parking every scenario at
food ≈ 0.95.

**Verdict: superseded by F-23**, which found that the *soft* ramp is equally
wrong in the other direction and that only an off-then-steep shape works.

---

## F-20 — The whole population was permanently half-starved


**Symptom.** After the F-19 changes, *every* run sat at food ≈ 0.95 per head and
never crossed the famine threshold, the idle run included. Food per head looked
pinned rather than dynamic.

**H-20a — the dependent share grows without bound.** `youth` relaxed toward
`childRation*2 = 1.0` whenever a boom was accumulating, reaching 0.51. Demand
was computed as `popTotal * (1 + childRation * youth)` — i.e. **152 % of the
population's worth of rations** at youth = 0.51. The entire country was modelled
as chronically hungry.

**Discriminating test.** Print `s.youth` at month 60 for the medicine run.
Observed **0.509**, which makes the demand multiplier 1.27 — the arithmetic
matches the 0.95 steady state exactly.

**Verdict: supported, fixed.** Added `C.youthMax = 0.38` as an explicit ceiling
on the dependent share. A dependency ratio above ~0.4 is far outside anything
the book describes for these villages, and the model should not leave that
range to chance.

---

## F-19 — Fruit carried the food supply, so no policy could ever cause a famine

**Symptom.** After F-18, the *classic* run — the one the book says ends in the
catastrophe — produced **zero famine months** on 4 of 8 seeds, and the medicine
run never came close on any seed.

**H-19a — the diet is mostly fruit.** Measured at month 60 for the idle run:
millet 0.072, orchard 0.148, herd 0.023, forest 0.039 (ration units). Orchard
fruit was **twice** the grain contribution. Since orchards are trees that keep
bearing through a cattle catastrophe (correctly, per F-18), the model could not
starve anyone: fruit production was structurally insulated from every shock
except weather.

**H-19b (rival) — the famine threshold is simply set too high.** If the issue
were only calibration, lowering the threshold would fix it. *Refuted:* lowering
it far enough to catch the orchard plateau (~0.95) also made the idle run
starve, which is the one outcome the book says must **not** happen.

**Verdict: H-19a supported, H-19b refuted.** Fixes:
- `C.milletYield` raised and `C.orchardYield` cut to 0.16 so that grain is the
  staple and fruit a supplement — which is what the prose describes (the moro
  grows "millet and other cereals", keeps orchards, and starves when the
  harvest fails).
- Land degradation (`C.landDegradation`) now applies to the whole food supply,
  with the compound term `pressureOnLand * stockOnLand`, so that losing the
  herd (F-15) and outgrowing the land genuinely reduce output.

---

## F-18 — Orchards registered a cattle catastrophe as a 0 % change

**Symptom.** With `orchardYield` gated by `clamp(s.vegetated, 0.3, 1.25)`, even
a total loss of vegetation left the orchard term at 30 % of its value, and the
clamp's floor made small declines invisible.

**Hypothesis.** Fruit trees are not the sod. The book's catastrophes are about
grain and cattle, and modelling orchards as a function of grassland made them a
hidden insurance policy against the exact failures the game teaches.

**Verdict: supported, fixed.** `orchardYield` no longer depends on
`s.vegetated`; orchard performance follows the trees' own state. (Grain still
depends on cultivable land through the acreage ceiling, which is the honest
channel.)

---

## F-17 / F-16 — Medicine barely changed mortality; nobody could boom

**Symptom.** The medicine-only run peaked within ~10 % of the idle run and the
gap closed entirely by year 4, so `H14_medicine_grows` failed intermittently.

**H-17 — `healthEffect` was too weak relative to `hungerDeathScale`.** With
`healthEffect = 0.70` the health service removed 70 % of a *small* baseline
mortality (0.010/month) while hunger mortality (up to 0.37/month) dominated the
total. Cutting the baseline could therefore never drive a boom for long.

**Verdict: supported, fixed.** `healthEffect` raised to 0.87 and
`hungerDeathScale`'s exponent changed from 2 to 1.3 so famine mortality ramps
steadily once food is short rather than being invisible until near-zero.

---

## F-15 — Losing the herd cost only exports, never food

**Symptom.** In the classic run the cattle fell from 2,400 to ~1,300 and the
people were unaffected, so the "cattle catastrophe" never became the *famine*
catastrophe the book describes.

**Hypothesis.** A herd is milk, draught power and manure. The book (p.82) has
the Moros short of food once the grass and cattle are gone, not merely poorer.

**Verdict: supported, fixed.** `stockOnLand = cattle0 / cattle` now enters the
land-degradation term, so a collapsed herd depresses crop yield while the
population is unchanged.

---

## F-14 — Random weather alone was deciding who starved

**Symptom.** With annual rain varying 0.74–1.26, seeds 6–11 failed
`H10_idle_no_famine` while others passed, with no structural difference. The
idle run — the book's control, which must **not** starve — was the unstable one.

**H-14 — weather amplitude, not the model, was setting the outcome.** A ±26 %
swing on a food system whose per-capita surplus is a few percent means a bad
year is a famine regardless of policy.

**Verdict: supported, fixed.** Rain narrowed to 0.82–1.18 around 1.0, and its
*monthly* effect on food reduced to ±6 % (annual effect). The book's weather is
not the antagonist; the players are.

---

## F-13 — The population could climb to whatever the land could ever produce

**Symptom.** Even after F-12, a do-nothing run grew past 9,000 people and stayed
comfortable, which contradicts the premise that Tanaland is already at the edge.

**Hypothesis.** Yields need diminishing returns as people are pushed onto
marginal land. The book's whole framing (p.13) is that the "improvement of the
food supply" failed to keep pace with population.

**Verdict: supported, fixed.** Land pressure enters the food supply as
`pressureOnLand^-C.landDegradation`; later folded into the compound term of
F-19.

---

## F-12 — Farmers could turn into geniuses for free

**Symptom.** After cutting the worker term (F-11), food supply became entirely
population-independent, and populations exploded to 10,000+.

**Hypothesis.** Production per acre should be an *investment* — fertiliser and
irrigation raise it, and it decays without them — not a function of headcount.

**Verdict: supported, fixed.** Added a farming-intensity state that relaxes
toward `1 + effort·gain` and decays back to 1.0 with no programme. Workers per
acre only *cap* how far intensity can go. (Closed by F-19's `landDegradation`,
which is the cleaner formulation.)

---

## F-11 — A baby boom made the country *richer*, so every scenario converged

**Symptom.** Idle and medicine runs produced identical long-run food per head
(0.94 vs 0.94). Mechanically: `foodSupply` was scaled by `max(0.35, 1 - youth)`
(a *penalty* for a young population) while demand counted only `popTotal`, so
more young people meant *more* food produced and no extra mouths.

**Hypothesis.** The lag must hit the demand side, not the supply side, and the
population must not conjure supply out of thin air. In a subsistence economy
people do not create more land.

**Verdict: supported, fixed.** The `1 - youth` factor was removed from the
supply side; demand now counts the dependent share (F-05/F-20). A corresponding
check was added: the farmer population and acreage must not be able to chase
population upward without bound (→ acreage ceiling, F-06/F-09).

**Method note.** This was the fifth fix in a row that made the model worse
rather than better, because each was aimed at the *symptom* (food plateaus at
0.94) rather than the *mechanism*. The productive tool was the decomposition
test below, which was only written after four failed guesses.

---

## F-10 — The medicine catastrophe could not occur while farmers were also counted as workers

**Symptom / resolution.** Merged into F-11 and F-13. The record is kept because
the intermediate state was committed and then partly reverted; see the git log
for the exact sequence.

---

## F-09 — Land cannot be cleared instantly

**Symptom.** Acreage snapped to any population-driven target within a month,
letting the country "discover" new farmland overnight.

**Verdict: supported, fixed.** `C.acreageGrowth` makes acreage creep toward its
ceiling. (Diagnostically useful: this change altered *nothing*, which is what
ruled acreage out as the cause of the food plateau and pointed to F-11.)

---

## F-08 — Land productivity did not respond to investment

**Symptom.** The book lists fertilisation and irrigation (p.11) as the ways the
country produces more food, but neither changed the *level* at which food
settled — only transient amounts.

**Verdict: supported, fixed.** Farming intensity became an explicit state that
fertiliser and irrigation raise (F-12 tightened this later).

---

## F-07 — The lag mechanism never triggered

**Symptom.** `H14_medicine_famines` failed on every seed. Instrumenting
`boomMonths` showed it oscillating between 0 and ~36 and never reaching
`youthLag = 84`.

**H-07 — the counter required *consecutive* positive-survival months, but every
run has lean months every year, so it reset before it could fire.** The
catastrophe-trap mechanism was dead code.

**Verdict: supported, fixed.** The lag now applies to the *consequence*
(the worker/intensity dividend accrues slowly) and not to the *trigger*
(surviving children become mouths immediately).

---

## F-06 — The acreage cap is the ceiling, not a multiplier

**Symptom.** Millet output fell twice as fast as the sod, so the boom always
became a collapse and `H11_classic_worse_than_idle` passed for the wrong reason.

**H-06 — double counting.** `land = s.vegetated` multiplied the yield *and*
`s.millet` was clamped to a ceiling that itself scaled with `s.vegetated`.
One loss, charged twice.

**Verdict: supported, fixed.** Sod loss enters only through the acreage ceiling.

---

## F-05 — Children cost nothing to feed

**Symptom.** A run with only a health service produced more surviving children
and *better* food per head than doing nothing, because dependents consumed
nothing and eventually became workers.

**Verdict: supported, fixed.** `C.childRation` gives each dependent half an
adult ration, and `mouths = popTotal * (1 + childRation * youth)`. The lag now
cuts the other way: extra children are mouths now, producers later.

---

## F-04 — Plentiful food switched population growth off

**Symptom.** A run with lots of food sat at exactly the food-per-head level
where birth rate = death rate. The book (p.81): "the population after all these
measures grows in an exponential curve".

**H-04 — the birth rate was too sensitive to food.** With a `0.6 + 0.4·feed`
term, abundance *raised* births, which absorbed the surplus and pinned food at
the equilibrium — an accidental thermostat that made population explosions
impossible.

**Verdict: supported, fixed.** Fertility is now nearly flat with food across the
normal range (`0.94 + 0.06·feed`); only real famine suppresses it.

---

## F-03 — Rain was identical every month (the RNG never advanced)

**Symptom.** `trace.mjs` showed rain frozen at 0.801 for twelve months, then
1.124, mean 0.96 instead of 1.0.

**H-03 — a fresh generator per step reuses the same value.** `step()` called
`rng(s.rngState)` and stored `rand()`, but mulberry32's *first* output after a
seeding add never exceeds ~0.24, so a generator created and used once always
yields the same number.

**Discriminating test.** Print `rng(0)()`, `rng(0)()`, … and `rng(1)()`; first
outputs are all small and nearly identical.

**Verdict: supported, fixed.** The generator now advances inside the step and
its state is persisted; `seedState()` hashes small integer seeds so that seeds 1
and 2 do not produce near-identical weather.

---

## F-02 — Groundwater declines too slowly to be the book's "groundwater catastrophe"

**Symptom (measured).** `node tanaland/tests/groundwater-probe.mjs wells` —
one well programme held at full strength for ten years moved the aquifer only
**100 → 86.9 %** (net draw ≈ −0.12 / month). The classic opening (wells 0.8 +
irrigation 0.6) lost ~8 %. For comparison the book's figure 14 has groundwater
falling steadily from year 13 and collapsing the herd by year 22–30 (p.84).

**H-02a — "the draw is cancelled by recharge"** — *refuted.* Measured inflow
0.16–0.28/month against a 0.34 well draw is not cancellation; the net is real
but small.

**H-02b (supported) — the yield feedback is missing.** In the book the
mechanism is *positive feedback*: "The less water there is, the more wells we
will drill, and the less water there will be" (p.84). A constant-strength
programme has no feedback, so it cannot produce the accelerating collapse.
The player must be able to keep drilling *harder*, and each additional borehole
must draw on an aquifer that is already lower.

**Verdict: supported.** Fix: the well programme is not one borehole but a
*sustained drilling effort*, so its draw scales with `C.wellDrawFeedback`
and is amplified as the aquifer falls (pumping deeper and deeper).
Claim **H13** in `claims.mjs` now requires a sustained well programme to end
with a materially lower aquifer than the idle run *and* the decline to
accelerate in its second half.

---

## F-01 — Wells drew on top of natural supply (double-counted recharge)

**Symptom.** With `wells=1` the aquifer did not move at all (99.99 → 99.86
over 30 months) although the draw term exceeded recharge.

**H-01 — the surplus-draw formulation silently cancels itself.** Code was
`draw = naturalSupply + max(0, demand − naturalSupply)` and then
`groundwater += naturalSupply − draw`, which algebraically reduces to
`−max(0, demand−naturalSupply)`. Whenever demand ≤ recharge the net loss is
exactly zero, so a programmatic well draw *could never* exceed the seepage
rate. **Supported by arithmetic and by the flat trace.**

**Verdict: supported, fixed.** The aquifer is now a plain balance
`groundwater += rain·recharge − draw`. This is the H-02 baseline above.

---

## F-00 — Population booms with no measures at all (idle scenario)

**Symptom.** Do-nothing run 2,400 → 6,400 people while the herd *fell*.

**H-00a (supported) — crop yield ignored the land.** Millet/orchard terms did
not depend on `s.vegetated`, so people kept eating grain from grassland that
the cattle had destroyed. Fix: all crop terms are gated by `land =
s.vegetated` ("grass will not grow on rocks no matter how much water is poured
on them", p.81).

**H-00b (supported) — cattle fed people directly.** Modelled as a large annual
food term, which is not the story: the herd is *capital and export*, not the
staple (p.82, "the loss of their cattle also means the loss of one of their two
export goods"). Fix: herd-food reduced to a minor term; herd **wealth** now
depresses the birth rate (loss of milk, bride-price and export income).

**Verdict: both supported.** The idle run now approaches the book's central
counterfactual (p.82): lower living standard, but "they would not have
starved".

---

## Tooling defects found along the way

- **Encoding corruption.** Editing `sim.js` through PowerShell
  `Get-Content | Set-Content` round-trips converted UTF-8 em dashes to cp1252
  mojibake and left one orphan byte, making the file invalid UTF-8 and
  unreadable by the editor. Repaired by decoding as cp1252 and re-encoding as
  UTF-8. **Rule adopted: all source edits go through the editor tool, never
  through PowerShell text round-trips.**
- **PowerShell `-replace` writes literal `` `n ``.** Single-quoted replacement
  strings do not expand backtick escapes, which produced a syntactic
  `` =`n `` inside the source. Caught by `node --check`; the rule above prevents
  a recurrence.
- **Headless browser unavailable in this sandbox.** Edge aborts with
  `FATAL:mojo platform_channel: Access is denied` (its IPC pipe is blocked), so
  screenshots are not possible here. Replaced by
  `tests/web/dom-smoke.mjs`, a DOM shim that plays the real UI modules through
  all six sessions and asserts no exceptions, no `NaN` in SVG paths, and no
  leaked hidden state.
