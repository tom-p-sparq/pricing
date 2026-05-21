# Sampling module for Bayesian inference

## Motivation

`fitting/` finds the maximum likelihood estimate of model parameters. This gives a single
best-fit model but no representation of uncertainty — two datasets that are consistent with
very different demand curves produce the same point estimate. Bayesian inference addresses
this by maintaining a distribution over parameters (the posterior), enabling uncertainty
quantification, prior knowledge incorporation, and richer visualisations (e.g. posterior
predictive bands).

## Decision

Add `pricing-core/sampling/` as a sibling module to `conversion/`, `fitting/`, and
`visualisation/`, exporting probability distributions, proposal distributions, and
generator-based samplers.

Several architectural choices were made:

**Decoupled from `BaseDemandModel`**: `Prior` and `Proposal` operate on plain
`{[paramName]: number}` objects rather than model instances. The conversion to a model
is the caller's responsibility via a `factory` function on `Prior`. This means the
sampling module is agnostic about what the parameters represent — you can place priors on
the internal `{a, b}` parameterisation, on natural parameters `{conversion, elasticity}`
via `fromReference`, or on interpolating points. The `BaseDemandModel` constraint appears
only in `mh` and `particleFilter` (which call `logLikelihood`), not in `Prior` or
`Proposal` themselves.

**`distributions/` vs `steps/`**: unconditional priors (`Normal`, `LogNormal`) and
conditional proposal distributions (`NormalStep`, `LogNormalStep`) are kept in separate
directories. A prior distribution has `sample(rng)` and `logPdf(x)`; a step distribution
has `sample(currentValue, rng)` and `logPdf(x, currentValue)`. `LogNormalStep` is the
natural proposal for positive-constrained parameters since it applies a multiplicative
perturbation, preserving positivity without clamping.

**Generator pattern**: `samplePrior`, `mh`, and `particleFilter` are all generators,
consistent with `fit()`. Pages can drive them with `requestAnimationFrame` using the same
pattern already used for fitting convergence animation.

**`iid.js` separate from `mcmc.js`**: prior predictive checks use independent samples
(`samplePrior`), not a Markov chain. Keeping them separate avoids the temptation to use
`mh` with empty data (which would produce a correlated chain rather than i.i.d. draws).

**`mhStep` not in the public `index.js`**: the single MH step is exported from `mcmc.js`
(importable via a deep import) and used internally by `particleFilter` for rejuvenation,
but omitted from `sampling/index.js` to keep the advertised API focused on the
higher-level samplers.

## Trade-offs

**Natural vs internal parameterisation**: placing priors on `{a, b}` directly is
mathematically convenient but produces correlated, hard-to-interpret priors. The factory
pattern allows working in natural parameter space (e.g. `{conversion, elasticity}`) where
independent priors are more meaningful. The trade-off is that `logPdf` evaluations for MH
are computed in whichever space the factory maps from — if using `fromReference`, the MH
chain explores natural parameter space, not `{a, b}` space directly.

**No Jacobian correction for reparameterisation**: when sampling in natural parameter
space via `fromReference`, the `logPrior` values are correct densities in that space.
The MH acceptance ratio is also correct because both `prior.logPdf` and
`proposal.logPdf` operate in the same (natural) space. No manual Jacobian is needed.

**Particle filter degeneracy**: the bootstrap particle filter without rejuvenation is
prone to weight collapse for long data sequences. MCMC rejuvenation (`mcmcSteps > 0`)
mitigates this but is computationally expensive per data point. The default `mcmcSteps=5`
is a pragmatic balance.

## What changed

- `pricing-core/sampling/` — new module (distributions, steps, priors, proposals, mcmc,
  particleFilter, iid)
- `pricing-core/index.js` — `sampling` added as a fourth top-level export
- `pricing-core/conversion/base.js` — `parameters` type annotation changed from `object`
  to `{[paramName: string]: number}`; static methods renamed to camelCase
  (`fromReference`, `fromFlat`, `_checkReference`)
- `pricing-core/conversion/*.js` and `pricing-core/fitting/fit.js` — updated to use
  renamed static methods
