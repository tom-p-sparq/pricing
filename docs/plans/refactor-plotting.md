# Plotting Refactor Plan

Scope: `pricing-core/visualisation/plotting/`

---

## 1. Split `conversionPlot` into composable functions

`conversionPlot` currently bundles curve marks, spec-point marks, and fit-point marks into a single
combined spec. `fitPointsPlot` was already split out as a composable partial, pointing toward the
right direction. Since `plot()` merges marks from multiple specs automatically, `conversionPlot`
should be decomposed to match.

**Replace** `conversionPlot({ model, specPoints, fitPoints, curveOptions })` with:
- `conversionCurvePlot({ model, curveOptions }, maxPrice)` — returns a full spec `{ x, y, marks }`
- `specPointsPlot(points)` — returns a partial `{ marks }` (crosshair lines + dots for reference points)
- `fitPointsPlot(points)` — already exists, returns `{ marks }` (observed data dots)

**Update call sites** in page JS to compose these at the call site:
```js
// before
plotting.plot(container, plotting.conversionPlot({ model, specPoints, fitPoints }), options)

// after
plotting.plot(
    container,
    plotting.conversionCurvePlot({ model }),
    plotting.specPointsPlot(specPoints),
    plotting.fitPointsPlot(fitPoints),
    options
)
```

Affected pages: `02-specifying.js`, `03-fitting.js`, `04-model-selection.js`, `00-intro-conversion-models.js`, `01-parametric-conversion-models.js`.

---

## 2. Extract shared model-dispatch utility

`conversion.js` and `revenue.js` both duplicate the same pattern for turning a single model or
named-model array into plot data — differing only in the computed field. Extract a shared internal
helper (e.g. into `_models.js` or `plot.js`):

```js
// modelData(model, maxPrice, fn) → Array<{ price, name, ...fn(model, price) }>
function modelData(model, maxPrice, fn) { ... }
```

Then in each file:
```js
// conversion.js
const data = modelData(model, maxPrice, (m, p) => ({ conversion: m.conversion(p) }))

// revenue.js
const data = modelData(model, maxPrice, (m, p) => ({ incrementalRevenue: m.conversion(p) * (p - cost) }))
```

Removes `_singleModelConversionData`, `_multiModelConversionData`, `_singleModelRevenueData`,
`_multiModelRevenueData`.

---

## 3. Fix broken absolute import in `samples.js`

Line 3 uses `/pricing-core/conversion/index.js` — an absolute path that resolves correctly on the
dev server but breaks on GitHub Pages (where the path prefix is `/pricing/`). According to the
import constraint in CLAUDE.md, all imports within `pricing-core/` must use relative paths.

```js
// before
import { BaseDemandModel } from "/pricing-core/conversion/index.js";

// after
import { BaseDemandModel } from "../../conversion/base.js";
```

---

## 4. Fix inconsistent return type on `_conversionDistributionMarks`

All `_*Marks` helpers in the codebase return `Markish[]`. `_conversionDistributionMarks` in
`samples.js` returns `{ marks: Markish[] }` — a partial spec — which violates the convention and
makes the naming misleading. Either:

- Rename it to `_conversionDistributionSpec` and document the return type clearly, or
- Unwrap it to return `Markish[]` and have `sampleConversionDistribution` wrap it as `{ marks }`

The second option is more consistent with the rest of the file.

---

## 5. Minor clean-ups

- **`likelihoods.js:38`** — remove stale `// Your hard-coded fixed scale` comment
- **`distributions.js:91`** — remove commented-out `contour(...)` line
- **`samples.js:136`** — replace `` stroke: d => `Particle` `` with `stroke: () => "Particle"`
  (or just the string `"Particle"` if the arrow function serves no purpose)
