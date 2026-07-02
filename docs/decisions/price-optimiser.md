# Price optimiser

## Motivation

`optimisation/objectiveFunctions/` defines how to *evaluate* an objective at a given
price. The next step is to *maximise* it: given an objective function and a demand model
(or posterior sample array), find the price in `[pMin, pMax]` that produces the highest
objective value.

## Decision

Add `pricing-core/optimisation/optimise.js`, exporting a single function `optimisePrice`
that locates the optimal price using Brent's method for scalar function minimisation.

Several architectural choices were made:

**Brent's method rather than gradient-based optimisation**: price gradients of the
objective functions are not yet implemented. Even once they are, Brent's method achieves
near-quadratic convergence on smooth unimodal functions and typically terminates in 10–20
evaluations — comparable to a few gradient descent steps with a line search, but with no
tunable learning rate and no risk of overshoot. For single-price optimisation Brent's
method is sufficient; a gradient-based approach would only be advantageous for
joint optimisation over multiple prices simultaneously.

**Unimodality assumed, not enforced**: all three objective functions — `ExpectedRevenue`,
`CARA`, and `EntropicRiskMeasure` — are unimodal on `[pMin, pMax]` when the underlying
conversion curve is monotone decreasing. The optimiser does not verify this; it is a
precondition documented in the JSDoc. If the objective happens to be monotone on the
supplied interval (e.g. `pMin` is above the true optimum), Brent's method will converge
to the appropriate boundary rather than failing.

**Plain function, not a generator**: `fit()` and the samplers are generators so pages can
drive convergence animation frame-by-frame via `requestAnimationFrame`. Price optimisation
has no meaningful intermediate state to visualise — unlike fitting, where each yielded
model is a plausible curve, intermediate Brent iterates are just trial points inside a
shrinking bracket. `optimisePrice` returns the result synchronously.

**Inline implementation rather than an npm package**: no well-maintained, ESM-compatible
package for Brent's minimisation exists in the npm ecosystem. The closest candidates found
were `brent-zero-generator` (root-finding, not minimisation) and
`minimize-golden-section-1d` (golden section only, unpublished since 2018). The
implementation is a direct port of the Numerical Recipes algorithm (Brent 1973), which is
~60 lines and thoroughly understood. Correctness was verified against a known analytic
case (exact recovery of a quadratic maximum) and against live demand models.

**Negation adapter**: all objectives are designed to be *maximised*, so the adapter
`f(p) = −J(p)` is the only coupling between `optimisePrice` and `BaseObjectiveFunction`.
No changes to the objective function API were required.

## Trade-offs

**Unimodality is a caller responsibility**: `optimisePrice` provides no guard against a
multimodal objective. In practice, multimodal pricing objectives are economically unusual
(they would imply two locally optimal prices with a trough between them), but callers
should ensure `[pMin, pMax]` is chosen to bracket the intended optimum.

**Synchronous evaluation**: each call to `objective.J` may itself sum over a large
posterior particle population. For a particle filter output with thousands of samples,
a single `optimisePrice` call is fast (10–20 evaluations × particle-weighted sum), but
blocking. If used in a tight UI loop — e.g. re-optimising on every slider drag — callers
should throttle or debounce.

**No price gradient for future use**: if price gradients of the demand model are added
later, the optimiser would need to be replaced or extended to exploit them. The current
`optimisePrice` API (`objective`, `demandModel`, `pMin`, `pMax`, `options`) is stable and
does not need to change — a gradient-aware variant could be introduced alongside it.

## What changed

- `pricing-core/optimisation/optimise.js` — new file; `brentMinimise` (private) and
  `optimisePrice` (exported)
- `pricing-core/optimisation/index.js` — `optimisePrice` added as a named export
