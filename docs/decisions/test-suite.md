# Test suite for pricing-core

## Motivation

`pricing-core` had no automated tests. Correctness was checked by eye in the tutorial
pages, which exercise only the parameter ranges the pages happen to use. A small suite
of analytic and property-based checks catches regressions in the maths. It also
documents the assumptions each component relies on.

## Decision

Use Node's built-in test runner (`node:test` with `node:assert/strict`), run by
`npm test` (`node --test "tests/*.test.js"`), and run it in CI before the build.

**No new dependencies.** `node:test` ships with every supported Node release. It runs
the ES module source directly, and the `@stdlib` packages resolve from the root
`node_modules`. Vitest or Jest would add a dependency tree and a configuration file and
would buy nothing this suite needs. The one feature we use beyond basic assertions is
`{ todo }`, which runs a test and reports its failure without failing the run.

**The glob is quoted.** Node only accepts a directory argument to `--test` from
version 25. The quoted pattern is expanded by Node itself (from version 21), so the
command behaves the same on Node 22, 24 and 26.

**Tests check maths, not implementation.** Where possible the expected value is
derived independently of the code under test:

- **Closed forms**: the revenue-maximising price for constant elasticity
  (p* = c·ε/(1+ε) for ε < −1) and for linear conversion (p* = (c − a/b)/2); binomial
  and Poisson MGFs.
- **Identities that hold for any model**:
  - the Lerner condition ε(p*) = −p*/(p* − c) at the optimiser's answer;
  - `elasticity()` and `gradLog()` agree with finite differences;
  - K′(0) and K″(0) of the log-MGF give the mean and variance.
- **Limits**:
  - ERM = E[Π] − (ρ/2)Var[Π] + O(ρ²);
  - (J_CARA + 1)/ρ → E[Π];
  - risk-averse optimal prices converge to the risk-neutral price at rate O(ρ);
  - the negative binomial tends to the Poisson as r → ∞.

  These are checked by the *rate* of convergence (the ratio of errors when ρ falls
  10×), not just closeness at one small ρ.
- **A conjugate posterior**: a Beta prior on a flat conversion rate with binomial data
  has an exact Beta posterior. `mh` and `ParticleFilterState` are checked against its
  mean and sd, and `iidSampler` against the prior.

**Elasticity sign convention.** ε = d log C / d log p, negative for a downward-sloping
curve. Tests state this wherever a formula depends on the sign. They also cover the
inelastic case −1 < ε < 0, which has no interior optimum.

**Stochastic tests are seeded and their tolerances are justified.** Every sampler
draws from `createRng(SEED)`, so each run is reproducible bit for bit. Each tolerance
is a stated multiple of the Monte Carlo standard error. For MH that error comes from
an autocorrelation time measured by batch means, not assumed. `SEED` can be
overridden with `TEST_SEED=<n>`. This was used to confirm that the tolerances are not
tuned to one seed:

- over 200 seeds, no sampler estimate used more than 51% of its tolerance;
- the full suite passed for 50 seeds on Node 26 and for 20 seeds each on Node 22
  and 24.

**Known bugs are `todo` tests, and fixes keep the test.** A bug found while writing the
suite is recorded as a `{ todo: '<explanation>' }` test. Fixing it means removing the
marker, and the test then stays as a regression guard (commented as such).

## Coverage

What is tested:

- `conversion/` (all five models): factories, elasticity, gradients, bounds,
  monotonicity, known values.
- `demand/`: moments and MGFs, closed forms, the NB → Poisson limit.
- `optimisation/`: all four objectives, `optimisePrice`, and posterior-weight
  aggregation.
- `fitting/`:
  - `logLikelihood` and `gradLogLikelihood`;
  - `fit()`'s special cases for 0, 1 and 2 points;
  - parameter recovery for the logistic, log-logistic and Weibull models, from a
    plausible start and through the flat-model fallback.
- `sampling/`: the RNG, `Prior` with `Beta`, `Proposal` with `NormalStep`,
  `iidSampler`, `mh`, `ParticleFilterState`.
- `utils.js` (`logSumExp`).

What is **not** tested:

- `visualisation/` (Plot and Inputs wrappers, about 900 lines, roughly 30% of the
  library). These need a DOM. They are thin adapters, and checking them would mean
  snapshot tests of SVG output, which are brittle and catch little.
- The page scripts in `pages/`.
- The `Normal` and `LogNormal` prior distributions and `LogNormalStep`. These are
  thin wrappers over `@stdlib`, but no test calls them.
- `Prior.quantileSampleModels` and the `particleFilter` generator wrapper (only
  `ParticleFilterState` is exercised).
- Fitting the linear and constant-elasticity models; fitting with noisy data;
  `Adam`'s non-finite-gradient guards.
- MH or particle-filter posteriors with more than one parameter. The conjugate check
  is one-dimensional.

A one-off run of `node --experimental-test-coverage` gave 95.6% line coverage of the
non-visualisation files. It gives roughly 68% of `pricing-core` if `visualisation/`
counts as 0%. No coverage threshold is enforced: line coverage measures what ran, not
what was checked.

## Bugs found by the suite

Fixed. Each fix has its own commit, and its test is kept as a regression guard.

- `PoissonDemandModel` and `NegativeBinomialDemandModel` lacked
  `_varianceConversions`, so `MeanVariance` threw for them.
- `BaseObjectiveFunction.J` did not normalise posterior weights, although `_J` is
  documented to receive them normalised. `CARA` and `EntropicRiskMeasure` were wrong
  for unnormalised weights.
- `logSumExp` of all −∞ returned NaN, not −∞.
- `fit()` with 0 points fell through to the Adam loop (a missing `else`).
- `fit()`'s flat-model fallback had two defects:
  - The threshold `LLH / numPoints < −5` was not scaled by `looks`, so it fired for
    almost any realistic data and discarded the caller's starting model. It is now an
    average of −5 per look.
  - After falling back, the convergence baseline was the discarded model's
    log-likelihood, so `fit()` could stop after one batch with a worse model than its
    input (seen with log-logistic).

  The threshold half has its own regression test: a plausible start is kept. The
  baseline half has no separately observable effect now that the threshold is scaled.
  The fallback then fires only for a start below −5 per look, so a stale baseline
  could at worst add one extra batch. It is covered only in combination, by the
  fallback-path recovery test.

Still open, recorded as a `todo` test:

- `optimisePrice` with a linear conversion model when `pMax` lies beyond the root of
  C. Above the root, profit is identically zero. Brent's first probe can land on that
  plateau and never leave it. Callers can avoid this by capping `pMax` at the root.
  No page is affected today.

## Trade-offs

**No type definitions for `node:test`.** The repo has no `@types/node`, so IDE type
checking under `checkJs` cannot resolve `node:test` imports in `tests/`. Adding the
package would fix that at the cost of one development dependency. It was left out to
keep the suite dependency-free.

**Fixed seeds make each run deterministic, but they don't prove robustness.** A
fixed seed only shows that one stream passes. The multi-seed check above is what
supports the tolerances. It is a manual step, not part of CI.
