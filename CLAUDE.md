# CLAUDE.md

This file provides guidance to Claude Code (claude.ai/code) when working with code in this repository.

## Project Overview

An interactive educational platform for exploring pricing models and optimisation, built as a static site. It presents a series of tutorials teaching demand/conversion modelling (Linear, Logistic, Log-logistic, Weibull, Constant Elasticity) with live reactive charts and parameter fitting.

## Development Commands

All commands run from the repository root unless noted.

```bash
# Install dependencies (must install both levels)
npm install
cd pricing-core && npm install && cd ..

# Development (live reload for both JS and HTML)
npm run dev

# Production build
npm run build

# Build steps individually
npm run build:js    # esbuild bundles pricing-core/ → pricing-core/bundle.js
npm run build:html  # 11ty generates pages/ → _site/
```

There is no test suite currently. Type-check via JSDoc annotations; no separate `tsc` step.

## Architecture

The project has two independent build systems joined by a symlink.

### Two-Level Build

```
pricing-core/         ← ES6 library, bundled by esbuild
  └── bundle.js       ← output (gitignored)

pages/
  └── compiled-pricing-core.js  ← symlink to ../pricing-core/bundle.js
```

The symlink is the only coupling between the two systems. If you add files or change the esbuild entry point, ensure the symlink target remains valid.

### Static Site (11ty)

- **Input**: `pages/` — HTML files with Nunjucks front matter
- **Layouts**: `pages/_layouts/base.njk` — single shared layout (nav, MathJax CDN)
- **Output**: `_site/` (gitignored)
- **Passthrough**: `style.css` and all `*.js` files are copied unmodified
- **Path prefix**: `PATHPREFIX=/pricing/` is set at build time for GitHub Pages deployment; `.eleventy.js` rewrites root-relative URLs accordingly

Each page is a pair: `pages/NN-name.html` (content/front matter) + `pages/NN-name.js` (Observable interactivity). The JS module is referenced in the HTML front matter's `script:` field and injected by the base layout.

### pricing-core Library

Three top-level modules exported from `pricing-core/index.js`:

- **`conversion/`** — demand model classes. `BaseDemandModel` defines the interface; subclasses implement `conversion()`, `gradLog()`, `from_reference()` (factory from price/conversion/elasticity point), and `interpolate()` (factory from two data points).
- **`fitting/`** — gradient-based optimisation. `fit()` is a generator that yields intermediate models during convergence using the Adam optimiser (`adam.js`) and log-likelihoods (`likelihoods.js`). Handles 0/1/2-point edge cases before entering the optimisation loop.
- **`visualisation/`** — Observable Plot wrappers (`plotting/`) and Observable Input form controls (`inputs/`). Functions accept either a single model or an array of named models.

### Interactivity Pattern

Pages use the Observable runtime (`@observablehq/runtime`) for reactive UI. Form controls emit `'input'` events; listeners trigger re-renders of Plot charts. The `fittingData` namespace in `visualisation/inputs/fitting.js` manages the shared data state (get/set/clear/scenario).

## Deployment

GitHub Actions (`.github/workflows/static.yml`) builds with `PATHPREFIX=/pricing/` and deploys `_site/` to GitHub Pages on pushes to `main`. PRs to `main` or `dev` trigger a build-only check (no deploy).
