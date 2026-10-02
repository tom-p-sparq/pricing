# pricing
Interactive explorations of pricing models and optimisation

## Local development

Install dependencies (first time only):

```bash
npm install
```

Then start the dev server from the repository root:

```bash
npm run dev
```

Then open [http://localhost:8080](http://localhost:8080) in a browser.

`npm run dev` runs 11ty in watch mode — rebuilds `_site/` and serves it with live reload.

## Testing

```bash
npm test
```

This runs a small suite (70 tests, under a second) with Node's built-in test runner.
It needs no extra dependencies, and CI runs it on every pull request and before every
deploy. The tests check `pricing-core`'s maths against values derived independently of
the code:

- closed-form optimal prices and the Lerner condition;
- finite-difference checks of elasticities and likelihood gradients;
- moments and MGFs of the demand models;
- the risk-neutral limits of the risk-averse objectives;
- a conjugate Beta–binomial posterior, for the MCMC and particle-filter samplers.

Stochastic tests use a fixed seed, which `TEST_SEED=<n>` overrides.

The suite does **not** cover the plotting and input components in
`pricing-core/visualisation/` or the page scripts. Two known bugs are recorded as
`todo` tests. See [`docs/decisions/test-suite.md`](docs/decisions/test-suite.md) for
exactly what is and isn't covered.

## Production build

```bash
npm run build
```

The built site is output to `_site/`. GitHub Actions deploys this to GitHub Pages at `/pricing/` on pushes to `main`.
