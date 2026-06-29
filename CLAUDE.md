# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An interactive educational platform for exploring pricing models and optimisation, built as a static site. It presents a series of tutorials teaching conversion modelling (Linear, Logistic, Log-logistic, Weibull, Constant Elasticity) with live reactive charts and parameter fitting.

## Development Commands

All commands run from the repository root unless noted.

```bash
# Install dependencies
npm install

# Development (live reload)
npm run dev

# Production build
npm run build       # 11ty generates pages/ → _site/
```

There is no test suite currently. Type-check via JSDoc annotations; `jsconfig.json` sets `checkJs: true` and `noImplicitAny: true` — IDE type-checking only, no separate `tsc` step.

## Architecture

### Static Site (11ty)

- **Input**: `pages/` — HTML files with Nunjucks front matter
- **Layouts**: `pages/_layouts/base.njk` — single shared layout (nav, import map, MathJax CDN)
- **Output**: `_site/` (gitignored)
- **Passthrough**: `style.css`, `utils.js`, and the entire `pricing-core/` source directory are copied unmodified
- **Path prefix**: `PATHPREFIX=/pricing/` is set at build time for GitHub Pages deployment; `.eleventy.js` rewrites root-relative URLs accordingly

`pricing-core/` source files are served directly — no bundling step. npm bare specifiers (`@observablehq/plot`, `d3`, etc.) are resolved at runtime by a native browser import map in `base.njk`, pointing to pinned esm.sh CDN URLs.

**Import constraint**: all imports within `pricing-core/` must use explicit `.js` file extensions (e.g. `import { foo } from './conversion/index.js'`, never `'./conversion'`). The browser receives source files verbatim — no bundler resolves extensionless or directory imports. See `docs/decisions/eliminate-esbuild-bundle.md`.

Each page is a pair: `pages/NN-name.html` (content/front matter) + `pages/NN-name.js` (Observable interactivity). Setting `script: true` in the HTML front matter causes `base.njk` to inject a `<script type="module">` pointing to `_site/NN-name/script.js` (11ty maps `pages/NN-name.js` → `_site/NN-name/script.js`).

`jsconfig.json` defines path aliases `/pricing-core/*` and `/utils.js` for IDE resolution of the passthrough paths used in page scripts.

### pricing-core Library

Top-level modules exported from `pricing-core/index.js`. `pricing-core/utils.js` exports `logSumExp` (used internally; import directly from `pricing-core/utils.js` if needed).

- **`conversion/`** — conversion model classes. `BaseConversionModel` defines the interface; subclasses must implement `_conversion(price)` (unclamped), `gradLog(price)` (returns `{conversion, rejection}` gradient objects keyed by parameter name), and the static factories `fromReference({price, conversion, elasticity})`, `interpolate(point0, point1)`, and `fromFlat(averageConversion)`.
- **`demand/`** — demand model classes, each comprising a looks process and a `BaseConversionModel`. `BaseDemandModel` defines the interface; subclasses must implement `_logMgfConversions(t, phi)` (log-MGF of converted looks, the required primitive) and `_expectedConversions(phi)`. `_mgfConversions` defaults to `exp(_logMgfConversions)` and need not be overridden. Three concrete models: `FixedDemandModel` (`{n}` fixed looks), `PoissonDemandModel` (`{lambda}` Poisson rate), `NegativeBinomialDemandModel` (`{lambda, r}` — overdispersed Poisson; `r → ∞` recovers Poisson).
- **`optimisation/`** — pricing objective functions (price optimisation algorithms to follow). `objectiveFunctions/` contains `BaseObjectiveFunction`, which exposes `J(demandModel, price)` — **always maximised** — accepting either a single demand model or `{model, logWeight}[]` posterior samples. Subclasses implement `_J(samples, price)`. Three implementations: `ExpectedRevenue` (risk-neutral, `m · E[N]`), `CARA` (CARA utility, `−E[M_N(−ρm)]`, bounded in `(−1, 0)`), `EntropicRiskMeasure` (certainty-equivalent profit, `−(1/ρ) log E[M_N(−ρm)]`; equivalent optimum to CARA but on the monetary scale of profit).
- **`fitting/`** — gradient-based optimisation. `fit()` is a generator that yields intermediate models during convergence using the Adam optimiser (`adam.js`) and log-likelihoods (`likelihoods.js`). Handles edge cases before entering the optimisation loop: 0 points → yield model as-is; 1 point → `fromReference` with elasticity −2; 2 points → `interpolate`; 3+ points → Adam optimisation. Falls back to a flat model if the initial log-likelihood is extremely poor.
- **`sampling/`** — Bayesian inference over model parameters. `Prior` and `Proposal` operate on plain `{[paramName]: number}` objects (decoupled from `BaseConversionModel`); a `factory` function on `Prior` converts sampled parameters to model instances. `distributions/` holds unconditional priors (`Normal`, `LogNormal`, `Beta`); `steps/` holds conditional proposal distributions (`NormalStep`, `LogNormalStep`). Samplers are generators matching `fit()`'s yield pattern: `iidSampler` (i.i.d. prior draws, `iid.js`), `mh` (Metropolis-Hastings, `mcmc.js`), and `particleFilter` (bootstrap particle filter with MCMC rejuvenation, `particleFilter.js`). `rng.js` exports `createRng()` — a seedable MT19937 RNG from `@stdlib/random`.
- **`visualisation/`** — Observable Plot wrappers (`plotting/`) and Observable Input form controls (`inputs/`). Functions accept either a single model or an array of named models.

#### Sampling parameterisation

`Prior` and `Proposal` work in whatever parameter space the `factory` function maps from. If the factory uses `fromReference`, the chain explores natural `{conversion, elasticity}` space; if it uses the model constructor directly, it explores internal `{a, b}` space. No Jacobian correction is required because `logPrior` and the proposal's `logPdf` are evaluated in the same space as the samples. See `docs/decisions/sampling-module.md` for the full rationale.

`mhStep` is intentionally omitted from `sampling/index.js` — import it via `pricing-core/sampling/mcmc.js` if needed for rejuvenation logic.

### Fitting Data Schema

The `{price, looks, books}[]` format is used throughout `fitting/` and `visualisation/`:
- `price` — price point
- `looks` — total impressions at that price
- `books` — number of conversions (must be ≤ `looks`)

### Interactivity Pattern

Pages use the Observable runtime (`@observablehq/runtime`) for reactive UI. Form controls emit `'input'` events; listeners trigger re-renders of Plot charts. The `fittingData` namespace in `visualisation/inputs/fitting.js` manages the shared data state (`get` / `set` / `clear` / `scenario`).

For fitting convergence animation, pages drive a `requestAnimationFrame` loop over the `fit()` generator, re-rendering the plot after each yielded intermediate model. The same pattern applies to sampling generators (`mh`, `particleFilter`).

`utils.js` exports a single helper — `requireElement(id)` — for asserting DOM element existence with a clear error.

## Architecture Decisions

`docs/decisions/` contains ADRs explaining key design choices:
- `eliminate-esbuild-bundle.md` — why `pricing-core/` is served raw (no bundler) and the import constraints that follow
- `migrate-to-11ty.md` — rationale for 11ty over Vite/bundled approaches
- `sampling-module.md` — architecture of the Bayesian sampling subsystem and parameterisation trade-offs
- `particle-filter-state.md` — stateful particle filter design for incremental (streaming) data updates
- `objective-functions.md` — demand module design, objective function API, LSE aggregation under posterior uncertainty, and ERM vs CARA
- `price-optimiser.md` — Brent's method for scalar price optimisation, algorithm choice, and trade-offs

## Deployment

GitHub Actions (`.github/workflows/static.yml`) builds with `PATHPREFIX=/pricing/` and deploys `_site/` to GitHub Pages on pushes to `main`. PRs to `main` or `dev` trigger a build-only check (no deploy).
