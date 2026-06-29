# Demand models and pricing objective functions

## Motivation

`fitting/` and `sampling/` produce conversion models — either a point estimate or a
posterior distribution. The next step is to use these for price optimisation: given a
demand model (or a posterior over demand models), find the price that maximises some
objective. This requires:

1. A representation of the **looks process** (how many potential customers arrive) to
   complement the conversion model, forming a complete demand model.
2. A set of **objective functions** that are well-defined for both a single known demand
   model and a posterior represented as weighted samples.
3. A design that handles **risk-neutral and risk-averse** objectives consistently, without
   coupling the base class to any particular aggregation strategy.

## Decision

### Demand module

`pricing-core/demand/` models the full demand process as a looks distribution thinned by
conversion. `BaseDemandModel` takes a `BaseConversionModel` and a set of looks parameters,
and exposes:

- `expectedConversions(price)` — $E[N]$
- `mgfConversions(t, price)` — $M_N(t)$, the moment generating function of converted looks
- `logMgfConversions(t, price)` — $\log M_N(t)$

**`_logMgfConversions` is the required primitive.** `_mgfConversions` defaults to
`exp(_logMgfConversions)` and need not be overridden. This reflects that the log-MGF is
always the natural form to implement directly (numerically stable; `expm1` and `log1p`
apply naturally), while the raw MGF is simply its exponent. Concrete models:

- `FixedDemandModel({n})` — exactly $n$ looks per period; binomial conversions.
- `PoissonDemandModel({lambda})` — Poisson arrivals; converted looks are $\mathrm{Poisson}(\lambda\phi)$.
- `NegativeBinomialDemandModel({lambda, r})` — overdispersed Poisson with dispersion $r$;
  $r \to \infty$ recovers Poisson. Equivalent to a Gamma–Poisson mixture: if you maintain a
  Gamma posterior over the Poisson rate $\lambda$, the marginal distribution of looks is NB.
  Mean conversions equal $\lambda\phi$ (same as Poisson); variance adds $\lambda^2\phi^2/r$
  above the Poisson variance.

### Objective function API

`BaseObjectiveFunction.J(demandModel, price)` is the public entry point and is **always
maximised**. It accepts either a single `BaseDemandModel` (known parameters) or an array
`{model, logWeight}[]` of weighted posterior samples, normalises the single-model case to a
unit-weight sample array, and delegates to `_J(samples, price)`.

Subclasses implement `_J` and choose their own aggregation strategy. Two paths exist:

**Log-space aggregation** (CARA, ERM): the objective is a function of $\log M_N$, so `_J`
computes $\operatorname{logSumExp}(\log w_i + \log M_N(t, p \mid \theta_i))$ directly,
staying in log space throughout.

**Linear aggregation** (ExpectedRevenue): the objective is linear in model outputs, so
`_J` computes a posterior-weighted mean of `expectedConversions`. Routing through
`Math.log` / `Math.exp` would produce `NaN` for below-cost prices where incremental
revenue is negative.

The base class does not impose either strategy — subclasses that need neither can override
`J` directly, bypassing `_J` entirely.

### CARA under posterior uncertainty requires linear averaging of MGFs

For a known demand model, CARA expected utility is $-M_N(-\rho m)$. Under a posterior with
samples $\{\theta_i, w_i\}$, the correct aggregate is:

$$J = -E_\theta[M_N(-\rho m \mid \theta)] \approx -\sum_i w_i \cdot M_N(-\rho m \mid \theta_i)$$

This is a **linear** average of MGFs, not a log-space average. By Jensen's inequality
(exp is convex):

$$\exp(E[\log M_N]) \leq E[M_N]$$

so $-\exp(E_\theta[\log M_N])$ would underestimate the true expected MGF, overstating risk
aversion. The `logSumExp` trick computes the linear average stably:

$$\sum_i w_i \cdot M_N(t \mid \theta_i) = \exp\!\left(\operatorname{logSumExp}(\log w_i + \log M_N(t \mid \theta_i))\right)$$

The same reasoning applies to ERM, which is $\log(-J_\text{CARA}) / \rho$ — taking the log
after the linear average, not averaging in log space.

### ERM as a preferred risk-averse objective

The entropic risk measure (ERM) is:

$$J_\text{ERM} = -\frac{1}{\rho} \log E_\theta\!\left[M_N(-\rho m \mid \theta)\right]$$

ERM equals the **certainty-equivalent profit**: the sure profit $CE$ satisfying

$$-\exp(-\rho \cdot CE) = E[-\exp(-\rho\Pi)] \implies CE = -\frac{1}{\rho}\log E[\exp(-\rho\Pi)]$$

This means ERM values are on the same monetary scale as profit — a direct answer to "what
guaranteed profit per booking is this price worth?"

For fixed $\rho$, ERM and CARA are ordinally equivalent (maximising one maximises the
other), so the choice does not affect the optimal price. ERM is preferred for
interpretability and because `_J` requires no `Math.exp` — it is purely log-space
arithmetic.

The full Entropic Value at Risk (EVaR) extends ERM by optimising over $\rho$ given a
confidence level $\alpha$:

$$\text{EVaR}_\alpha(-\Pi) = \inf_{\rho > 0} \frac{1}{\rho}\!\left(\log M_\Pi(-\rho m) + \log\frac{1}{1-\alpha}\right)$$

This is parameter-free given $\alpha$, but requires a 1D optimisation at every price
evaluation. It is not implemented here.

## Trade-offs

**Two-path `_J` API vs a single required primitive**: forcing all subclasses through a
log-space primitive (e.g. `_logJ`) would have been more uniform, but produces domain errors
for linear objectives (log of negative revenue) and unnecessary numerical round-trips.
The two-path design — log-space for exponential objectives, linear for additive ones —
reflects the actual mathematical structure.

**ERM vs CARA**: both are provided. CARA may be more familiar to practitioners but its
values are bounded in $(-1, 0)$ and have no monetary interpretation. ERM is preferred for
new work; CARA is retained for compatibility and because the relationship between them is
non-obvious and worth preserving as a reference.

**`logSumExp` placement**: extracted to `pricing-core/utils.js` rather than duplicating
it across `sampling/particleFilter.js` (where it was already used for weight normalisation)
and the objective functions. The `reduce`-based implementation is used in preference to
`Math.max(...values)`, which exceeds the call stack for large particle arrays.

## What changed

- `pricing-core/demand/` — new module (`base.js`, `fixed.js`, `poisson.js`,
  `negativeBinomial.js`, `index.js`)
- `pricing-core/optimisation/objectiveFunctions/` — new module (`base.js`,
  `expectedRevenue.js`, `cara.js`, `entropicRiskMeasure.js`, `index.js`)
- `pricing-core/optimisation/index.js` — shell for the optimisation module; price
  optimisation algorithms are not yet implemented
- `pricing-core/utils.js` — new file; `logSumExp` consolidated here from
  `sampling/particleFilter.js`
- `pricing-core/index.js` — `demand` and `optimisation` added as top-level exports
