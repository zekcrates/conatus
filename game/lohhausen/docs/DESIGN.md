# Lohhausen (1981) — Reconstruction Design

A browser game faithful to the *structure* of Dörner/Kreuzig/Reither/Stäudel's town
microworld (1983; "Greenvale" in the 1996 English edition of *The Logic of Failure*),
with a modern UI. Plain HTML/CSS/JS, no build step, no dependencies.

Read together with `../../research/LOHHAUSEN.md` (evidence) and `FINDINGS.md` (test log).

---

## 1. What is kept from the original

| Kept | Why (source) |
|---|---|
| Town of ~3,700, **municipally owned watch factory** as major employer, retail/bank/doctors/restaurants | LoF p.19 |
| You are the **mayor**, near-dictatorial, 10 years, no elections | LoF p.19 |
| **8 sessions** covering **120 months** | LoF p.21 |
| Goal given to the player is the vague **"well-being of the citizens"** — the game never defines "win" for you | LoF p.58 |
| The **five headline variables**: Capital (= town revenue/finances), Unemployed, Production, Satisfaction, People looking for housing | LoF p.20 fig.6 |
| **Satisfaction computed per population segment** from standard of living, housing, labour-market prospects, crime, leisure, … weighted | LoF p.202 n.2 |
| **Machinery condition is the hidden cause of low factory productivity** | LoF p.92 |
| **Training positions → juvenile delinquency → quality of life → migration** | LoF p.38 |
| **Satisfaction → attractiveness → in-migration → burden on services → finances drain → quality of life falls** | LoF p.90 |
| **Tax illusion**: rise rates, revenues can fall (taxpayers move) | LoF p.21 |
| **Tourism is deconditionalised**: pays only with staff + external demand | LoF pp.94–95 |
| **Recreation-first** is the bad-mayor signature; production/finances are the important sectors | LoF p.22 fig.9 |
| Classic anecdotes become in-game possibilities: fire the management, hire/fire staff, nursing-home/telephone-style pet projects (as *flavour events + pattern detection*, not forced) | LoF pp.69, 163–64 |
| Post-game report reads your **decision pattern**, not just your score | LoF ch.1, 2, 12 |

Deliberately **not** kept: the original's 2,000-variable Simula model and its exact
equations (unpublished in English sources). Every constant is a **[GAP]** calibrated so
that the *documented qualitative behaviours* (§4) hold. All are in one `PARAMS` block.

---

## 2. The model (monthly steps, 120 months)

Full equations live in `engine/sim.js`; this is the map.

**Stocks**: population (children/adults/elderly; 3 satisfaction segments), workforce &
unemployment (factory / other / municipal / apprentices / youth), dwellings + construction
pipeline, factory capacity + **machinery health (hidden)** + quality + stock, treasury +
debt, facility portfolio (kindergarten, school, sports/pool, library, nursing home, parks,
hotels/B&Bs) each with capacity, condition, staffing, and the town's **reputation**.

**Flows each month**
1. *Factory*: demand = export(regional cycle, quality, marketing) + local; output =
   min(demand, capacity × machinery health × staffing adequacy); revenue, wages, materials,
   surplus or loss → **flows into the municipal budget** (municipally owned).
2. *Local economy*: other jobs scale with population demand, wages, tourism.
3. *Housing*: queue = households − dwellings; orders complete after an **18-month lag**;
   rents (municipal) drive revenue, affordability, and in/out migration.
4. *Population*: births, deaths, in/out migration per segment (jobs, housing, satisfaction,
   crime, amenities).
5. *Delinquency/crime*: rises with youth unemployment & missing youth leisure; feeds back
   into satisfaction (families, elderly) and reputation.
6. *Tourism*: demand = regional cycle × attractiveness (facilities, parks, low crime);
   effective capacity limited by available staff — **precondition**.
7. *Budget*: taxes (business rate, property rate, income-tax share), rents, fees, factory
   surplus, state grants − staff, maintenance, debt service, welfare share, subsidies.
   Deficit is auto-borrowed up to a credit limit; crossing the limit = **financial
   collapse event** (forced cuts, reputation hit) — the "prevent financial collapse" goal.
8. *Satisfaction*: per segment, weighted 0–1 components recomputed monthly; the *reported*
   value the player sees is a **quarterly poll with sampling noise** (intransparence).
9. *Regional cycle*: mean-reverting random walk; recessions hit exports & tourism.

**Intransparence (deliberate)**
- Machinery health: never shown as a number. Shown only via symptoms (productivity drift,
  breakdown notices) and the paid action **commission an engineering audit**.
- Satisfaction: poll with ±noise, lagged; segments shown as descriptions ("families:
  grumbling about housing"), not exact numbers.
- Export demand: shown as *orders this month* with noise, not as the model's cycle value.

---

## 2b. The catalogue, in the original's idiom

Since the operator's manual (transcribed by Funke, 2010 — see
`../../research/LOHHAUSEN.md` §8) became available, the action space is presented the way the
original presented it: a **catalogue of areas** (Bauwesen & Wohnungen, Besteuerung, Fabrik,
Schule, Kindergarten, Freizeit, Fremdenverkehr, Gesundheitswesen, Versorgung & Soziales,
Stadtverwaltung) in which each measure carries its **investment**, its **duration ("Zeit")** and
what it changes. Measures whose costs the manual states use the manual's figures (school library
300 DM/1 yr; school extension 2 million DM/2 yrs; retraining 2,000 DM per 10 people a month for two
years, with the documented willingness rules; municipal posts 5,000 DM each; hotels with the
documented monthly seasonality). Standing settings (tax rates, wages, headcount, maintenance,
staffing) are entered as **numbers**, exactly as the original took absolute or differential
values for its matrices. The four areas the reconstruction does not simulate (Bank, Politik,
Verkehr/Post/Bahn, energy & disposal) are shown in the catalogue as such, with a line saying
what the original did with them.

## 2c. The teaching layer

The end-of-term report is built to teach, as the book does:

1. **What your orders did** — an event study over the player's *own* run: for every order, the
   relevant series' average in the two years after against the year before, with the caveat that
   the town also moves on its own.
2. **How you governed** — the habits that separated the book's good mayors from its bad ones,
   scored from the decision log: hypotheses tested (audits), several fronts (money in ≥ 3
   fields), no pet project (no field above ~⅗ of investment), the works kept in view (machinery
   ≥ 60 % at the end), the town kept up (maintenance ≥ 1.0), your own agenda (few orders
   answering complaint letters), taxes that actually raised money.
3. **Your behaviour in the sessions** — enquiries (chart tabs, mail filters) against orders, per
   session, set beside the book's own counts (fig. 5: orientation ≈ 56 % of session 1, falling;
   fig. 19: the good mayors made more decisions and asked fewer questions than the bad ones, who
   over-collected because nothing pressed them; p. 24: both groups proposed hypotheses equally
   often — only the good ones tested them).
4. **What to try next time** — two or three concrete instructions chosen from the checks that
   failed.

## 2d. The learner layer (iteration 2)

The first build was faithful but dense. The learner layer adds, in order of what a new mayor
sees:

1. **A walkthrough** the first time *Take office* is pressed: four steps (read the notes → open
   the planning session → run fifteen months → read the recap), what the game will *not* tell
   you, and the book's own finding about how its good mayors behaved. Reopenable from the top bar.
2. **The clerk's notes** — "What to look at", at most four items, urgent first, in plain
   language, each with a button that jumps to the sector or chart that answers it. They are
   derived from the state (`advisorNotes()`), and they *change* as the mayor acts: order the
   audit and the "nobody has looked inside the works" note disappears.
3. **A goal line** under the notes: keep the five headline variables healthy for ten years — the
   book's five, and the only definition of winning the game gives.
4. **The session recap** after every run: five one-line movements plus notes that name the
   mayor's own orders and the mechanism they met ("the order book and the ageing machinery, not
   the men").
5. **The report** (see 2c) closes the loop by scoring the *habits*, not only the outcome.

## 2f. The four areas that were missing (iteration 3)

The original simulated fifteen areas and this reconstruction now models **all of them that matter to
the mayoral role**: the fourteen above plus — built in this iteration — **the bank** (savings, the credit
line, the lending spread), **power, water and rubbish** (the town’s own works, their decay, burst mains
and uncollected bins), **roads and buses** (road condition, the bus timetable, the station and the
commuter jobs they create) and **the council** (three factions whose moods follow your taxes, wages and
services, plus a request on your desk every session). The council cannot remove you — that is the
book’s premise — but a hostile council is friction, not a veto.

## 3. Player action space (per session, all with costs & lags)

**Finances** — tax rates (business, property), fees; borrow/repay; maintenance budgets per
facility group; municipal pay rises; rent level; subsidies (rent, tourism, industry).
**Watch factory** — modernise machinery (big, slow), R&D/quality, marketing, expand
capacity (capex + 18-mo lag), hire/reduce staff, training positions, wage level,
**replace management** (risky; the co-op anecdote exists as a high-risk option).
**Housing** — build (social/standard), renovate, set rents.
**Amenities** — build kindergarten / school / sports hall+pool / library / nursing home /
park / hotel rooms; staff them; renovate.
**Economy** — attract outside industry (outcome depends on taxes + attractiveness);
promote tourism.
**Information** — commission audit, order reports (each costs money/time, some reveal
hidden variables) — the "test your hypotheses" affordance.

## 4. Falsifiable acceptance hypotheses (fixed before coding)

Each is a claim about the *reconstruction*, tested in `tests/hypotheses.test.mjs` with
scripted bots and Monte-Carlo seeds. A build that fails one is wrong about the book.

| ID | Claim | Falsified if |
|---|---|---|
| **H-20** | Doing nothing keeps the town alive but visibly deteriorates: unemployment rises, housing queue grows, treasury slides toward the credit limit over 120 months | idle run is stable or improves; or bankruptcy before month ~60 |
| **H-21** | The Mark pattern reproduces: taxes up / factory neglected ⇒ revenue **declines** and unemployment explodes **late** (mainly after months ~85–120), housing queue up, satisfaction down | collapse never comes, or comes before month ~60 |
| **H-22** | The Charles pattern exists: invest in machinery + modest taxes + housing + maintenance ⇒ production & revenue rise, unemployment ≈ 0, housing queue resolved, satisfaction up, no collapse | no sane strategy reaches this on ≥80% of seeds |
| **H-23** | **Tax illusion**: raising business/property rates beyond a threshold lowers total revenue vs the lower rate (taxpayers/shoppers leave) | revenue is monotone in rates |
| **H-24** | **Machinery trap**: a player who never invests in machinery sees productivity/production decline after ~3–5 years while everything else is fine; the audit reveals the cause | no decline; or decline visible immediately (should be gradual) |
| **H-25** | **Training positions → delinquency → migration**: cutting training positions raises youth unemployment and delinquency, then depresses attractiveness/satisfaction | no measurable effect |
| **H-26** | **Deconditionalised tourism**: promoting tourism while (a) staff are scarce (unemployment < ~2 %) or (b) regional demand is low wastes money | tourism spend always pays |
| **H-27** | **Recreation-first fails**: a bot that spends early sessions on amenities while neglecting the factory & finances ends worse on the composite than a factory-first bot | recreation-first ties or wins |
| **H-28** | **Negative feedback of success**: an extremely successful town attracts in-migration fast enough to strain housing/services and push satisfaction down again — growth has a cost | in-migration never produces a measurable strain |
| **H-29** | **Deficit spiral**: financing consumption with debt (no growth investments) leads to debt service crowding out maintenance → visible decay → satisfaction fall | debt service never binds |
| **H-30** | **Balance beats extremes**: on the composite score, the balanced bot dominates every single-focus bot in the majority of seeds | some single-focus bot matches balanced |
| **H-31** | Production alone is not well-being: the works-first mayor keeps sound books and a grim town | finances track < 50, or satisfaction/crime healthy under works-first |
| **H-32** | The manual's retraining rule places about three quarters of an adult cohort; unemployed youths refuse (manual 9.12.1) | placements far from the documented rule |
| **H-33** | Tourism is seasonal as the manual's nightly maxima state (manual 9.7.3) | no summer/winter difference in tourism revenue |

Model invariants (must hold in *all* runs, tested in `model.test.mjs`): money identity
(treasury change = income − spend − investment), population accounting, no negative stocks,
housing lag ≥ 12 months before a completed build affects the queue, determinism per seed.

## 5. Scoring (the "Amtsbilanz")

Success is judged the way the book judges Charles: **trajectory, not peak**. Five tracks
(finances, economy/production, jobs, housing, satisfaction) scored on both end-level and
smoothness (penalises spikes/crashes), plus hard gates (financial collapse, factory
closure, delinquency high at end). The report then names the pattern(s) it detected from
the decision log: recreation-first, pet project, neglect of the factory, over-collecting
information, tax grab, blame-shifting-free self-reflection count, etc.

## 6. Deliverables

```
lohhausen/
  README.md               how to play / how to run tests
  engine/sim.js           the model (params, state, step, derived series)
  engine/game.js          sessions, measure catalogue, scoring, report, pattern detection
  engine/bots.js          scripted strategies (tests + "watch a bot" demo mode)
  web/index.html|css|js   the UI (dashboard, town map, charts, briefings, report)
  tests/model.test.mjs    invariants
  tests/hypotheses.test.mjs  H-20…H-30 as executable checks (with recorded verdicts)
  tests/sweep.mjs         Monte-Carlo balance sweeps across seeds × strategies
  docs/DESIGN.md          this file
  docs/FINDINGS.md        hypothesis register + verdicts + evidence
```
