# Tanaland

A browser recreation of the Tanaland planning exercise from Dietrich Dörner's
*The Logic of Failure* (chapters 1 and 3).

Open `web/index.html` in any modern browser. No build step, no dependencies, no
server required — it is plain HTML, CSS and ES modules.

```
tanaland/web/index.html
```

## What this is

In the book, Dörner gave twelve students a fictional African country and asked
them to run its development as a dictator for ten years in six planning
sessions. Most destroyed it. The country boomed, the cattle multiplied, the
wells flowed — and then the grass died, the harvest failed, the water ran out,
and the people starved. The students were intelligent and well-meaning. Their
thinking was not.

This is that exercise, playable.

You choose from nine measures — tsetse control, deep wells, irrigation,
fertiliser, pest control, family planning, a health service, herd culling, and
mechanised farming — and commit to a programme for each of six sessions. Then
you read the reports and do it again.

You can also commission **surveys** — the water table, the land, the pasture,
the pests, the markets. They cost money and come back as prose estimates, never
as the hidden numbers. Without them the game gives you no way to go and look at
anything, and the book's central finding is that good and poor participants
proposed hypotheses at the same rate — they differed in whether they *tested*
them (p.24).

Mechanised farming is the book's own "fifty tractors to clear the southern
forests" (p.18), and it behaves like it: acreage climbs steadily, so it looks
like progress, while the forest, the orchards and the soil go.

Mechanised farming is the book's own "fifty tractors to clear the southern
forests" (p.18), and it behaves like it: acreage climbs steadily, so it looks
like progress, while the forest, the orchards and the soil go.

## What it is not

**This is a reconstruction, not a port.** There is no published rulebook for the
original Tanaland. The rules here were fitted to the behaviour the book
*describes* — the catastrophes, the counterfactual, the pacing — not recovered
from the original program. Every model detail is documented, with the passages
behind it, in `research/TANALAND.md`; where the book is silent the code and that
document say so with a `[GAP]` marker.

Where the book and a later source disagree, the book wins. Tanaland is one of
the *Moro* family of microworlds (Strohschneider, 1986); its better-known
predecessor **Lohhausen** (1979/1981) is a different game with roughly 2,000
variables and a different country, and is not modelled here.

## The design rule that constrains everything

**You are not shown the things that decide the outcome.**

Groundwater, the extent of the sod, and the land's carrying capacity never
appear during play. A "groundwater: 43 %" bar would turn this into an
optimisation puzzle, and the book's whole diagnosis is that people fail because
they cannot see the slow variables and do not go looking for them. You get what
a ministry would cable you: people, cattle, money, and whether anyone starved.

The full state — including exactly how much water you destroyed — is revealed in
the final report. That is the teaching moment.

## The teaching, at the end

Dörner did not just assert that some participants did better than others; he
*measured* what differed. The final report therefore diagnoses **how you
decided**, not only what happened, against five of his findings:

1. Did you keep making decisions as things got worse, or freeze?
2. Did you attack one aim with several unrelated measures, or retreat into one?
3. Did you go for the slow variables early, or start on peripherals?
4. How hard did you push — and did you escalate under pressure?
5. Did you ever check what a measure actually produced?

Each point reports what your own record shows, and says so plainly when the
record cannot answer it. A run that ends with a poor country but a sound method
is told its method was sound — the diagnosis is a mirror, not a second score.

Scoring rewards **stability**, never peak output. A run that peaks at 12,000
people and ends in famine scores badly, because that *is* the failure the book
is about. Rewarding the peak would reproduce the player's original mistake
inside the game's own scoring.

## Layout

```
tanaland/
  web/            the game (open web/index.html)
    index.html
    css/style.css
    js/app.js     screens, sessions, measures, surveys, final report
    js/charts.js  hand-rolled SVG charts
  engine/
    sim.js        the model: one month per call, pure function
    game.js       sessions, measures, surveys, briefing, scoring
    analysis.js   the diagnosis of *how* you decided (the teaching payload)
  tests/
    claims.mjs         the book's dynamics as executable assertions
    reachability.mjs   is the top outcome reachable? does play beat idling?
    probe-food.mjs     long-run equilibria of each scenario
    tune.mjs           coordinate-descent calibration
    check-paths.mjs    every asset present and inside the server root
    web/dom-smoke.mjs  plays the whole UI headlessly
  docs/
    FINDINGS.md   the hypothesis log — every fix, with its evidence
  research/       source extracts and the model dossier
```

## Verifying it

```bash
node tanaland/tests/claims.mjs        # the book's dynamics, across seeds
node tanaland/tests/reachability.mjs  # can you win, and does playing beat idling
node tanaland/tests/probe-food.mjs    # long-run equilibria per scenario
node tanaland/tests/web/dom-smoke.mjs # the UI, played end to end
node tanaland/tests/check-paths.mjs   # every asset present and reachable
```

All of them run on a bare Node 22+ with no packages installed.

`claims.mjs` currently reports **0 failed seeds out of 60**, across **13 claims**.

`reachability.mjs` exists because no unit test can catch a game that is
**unwinnable** or one where **doing nothing is optimal** — and at various points
this build was both. It searches ~400 strategies and reports whether any reaches
each outcome and whether the best beats idling. Currently: modest doses of all
nine measures reach the top band, tsetse control alone collapses, and idling lands
in between.

## The findings log

`docs/FINDINGS.md` is the most interesting file here. Every defect was chased
with a written symptom → hypothesis → discriminating experiment → verdict, and
the log is kept in full, including the fixes that made things *worse*. It runs
to 26 entries; the ones worth reading first:

- **F-23** — a mortality curve that grows linearly from a hunger threshold
  always selects an equilibrium on the starving side of it. Thirty parameter
  combinations all settled at food = 0.600, just under the 0.62 threshold. The
  bug was the *shape* of a curve, not any value in it.
- **F-03** — mulberry32's first output after seeding never exceeds 0.24, so
  creating a fresh generator each step froze the weather at one value. Every
  run had identical rain.
- **F-01** — `draw = natural + max(0, demand − natural)` followed by
  `+= natural − draw` reduces algebraically to `−max(0, demand − natural)`.
  The aquifer could never be drawn below the recharge rate. A well programme
  did literally nothing.
- **F-24** — acreage was targeted at `popTupis / tupis0` and the only driver of
  the target was `popTupis / tupis0`. Clearing new land was impossible by
  construction, so supply froze while people kept multiplying.
