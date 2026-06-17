# ParticleFilterState for incremental posterior updates

## Motivation

The `particleFilter` generator processes a fixed dataset in one pass, which suits batch
analysis and testing. Interactive pages receive data incrementally — a small number of
`{price, looks, books}` records arrive per session (e.g. the results of prices tested
that day). Restarting the generator with the full accumulated dataset on each new arrival
would discard the particle history and reinitialise from the prior each time.

## Decision

Add `ParticleFilterState`, a class that holds the particle set between data arrivals and
exposes an `update(newData)` method. `newData` is an array to cover both the single-
observation and small-batch cases uniformly. The existing `particleFilter` generator is
refactored as a thin wrapper that drives `ParticleFilterState` one point at a time,
eliminating the duplicated inner-loop logic.

## Trade-offs

**`_observedData` grows unboundedly**: rejuvenation MH moves must target the full
posterior over all data seen so far, so the complete history is retained. For long-running
deployments with many observations this could become expensive. A sliding-window
approximation (retain only the last K records for rejuvenation) is a future option if
needed.

**Duplicate price points are not merged**: if `update` is called with a price that already
appears in `_observedData`, the two records are treated as independent observations (which
is correct if they genuinely are — e.g. data from different days). Accidentally pushing
the same record twice would double-count it; this is a caller responsibility.

## What changed

- `pricing-core/sampling/particleFilter.js` — `ParticleFilterState` class added;
  `particleFilter` generator refactored as a six-line wrapper around it
- `pricing-core/sampling/index.js` — `ParticleFilterState` added to public exports
