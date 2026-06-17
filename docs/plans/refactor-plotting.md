# Plotting Refactor Plan

Scope: `pricing-core/visualisation/plotting/`

---

## Direction: marks-only exports

The goal is a consistent public API where every exported function returns a partial spec
`{ marks: Markish[] }` with no axis or scale options. Page scripts compose these with plain option
objects passed to `plot()`, giving the page explicit control over labels, domains, and colours.

Page 05 already uses this pattern for the samples-based plots, passing `y: { domain: [0, 1], label:
'Conversion' }` directly to `plot()` — confirming the approach works well in practice.

**Conventions:**
- Internal `_*Marks` helpers → return `Markish[]`
- All exported functions → return `{ marks: Markish[] }`
- Exception: `logLikelihoodPlot` — axis domains are computed from sorted data inside the function,
  and layout options (`aspectRatio: 1`, `marginLeft: 120`) are structurally required by the heatmap.
  It remains a full spec.

---

## 1. Split `conversionPlot` into composable marks-only functions

**Replace** `conversionPlot({ model, specPoints, fitPoints, curveOptions })` with three functions,
each returning `{ marks }`:

- `conversionCurvePlot({ model, curveOptions }, maxPrice)` — curve line(s), crosshair, tip
- `specPointsPlot(points)` — rule lines + dots for reference/spec points
- `fitPointsPlot(points)` — already exists unchanged

Remove `conversionPlot` from `conversion.js` and from `index.js` exports.

**Update call sites** in page scripts to compose at the call site and pass axis options directly:

```js
// before
plotting.plot(container, plotting.conversionPlot({ model, specPoints }), options)

// after
plotting.plot(
    container,
    plotting.conversionCurvePlot({ model }),
    plotting.specPointsPlot(specPoints),
    { x: { label: 'Price' }, y: { domain: [0, 1], grid: true, label: 'Conversion', nice: true } },
    options,
)
```

Affected pages: `00-intro-conversion-models.js`, `01-parametric-conversion-models.js`,
`02-specifying.js`, `03-fitting.js`, `04-model-selection.js`.

---

## 2. Convert `incrementalRevenuePlot` to marks-only

Strip `x`/`y` options from the return value — the y-domain currently uses
`max(data, d => d.incrementalRevenue)` as its ceiling, but `ruleY([0])` already anchors at zero and
`nice: true` auto-scales the top, so the explicit domain is not needed.

Rename to `incrementalRevenueCurvePlot` to match the new naming pattern.

**Update call sites** to pass axis options directly:

```js
plotting.plot(
    container,
    plotting.incrementalRevenueCurvePlot(model, costSlider.value),
    { x: { label: 'Price' }, y: { grid: true, label: 'Incremental revenue', nice: true } },
    options,
)
```

Affected pages: `00-intro-conversion-models.js`, `04-model-selection.js`.

---

## 3. Convert `distribution1DPlot` and `distribution2DPlot` to marks-only

Both currently embed axis labels/domains and colour scheme in the return value. These are supplied as
config arguments so the caller already knows them — move them to call sites.

Rename to `distribution1DCurvePlot` and `distribution2DContourPlot`.

---

## 4. Extract shared model-dispatch utility

`conversion.js` and `revenue.js` both duplicate the pattern of turning a single model or named-model
array into plot data — differing only in the computed field. Extract a shared internal helper:

```js
// _models.js (or top of plot.js)
function modelData(model, maxPrice, fn) {
    if (model instanceof BaseDemandModel) {
        return range(0, maxPrice, 1).map(p => ({ price: p, name: model.constructor.name, ...fn(model, p) }))
    }
    if (Array.isArray(model)) {
        return model.flatMap(({ model: m, name, ...rest }) =>
            range(0, maxPrice, 1).map(p => ({ price: p, name, ...rest, ...fn(m, p) }))
        )
    }
    return []
}
```

Usage in each file:
```js
// conversion.js
const data = modelData(model, maxPrice, (m, p) => ({ conversion: m.conversion(p) }))

// revenue.js
const data = modelData(model, maxPrice, (m, p) => ({ incrementalRevenue: m.conversion(p) * (p - cost) }))
```

Removes `_singleModelConversionData`, `_multiModelConversionData`, `_singleModelRevenueData`,
`_multiModelRevenueData`.

---

## 5. Fix broken absolute import in `samples.js`

Line 3 uses `/pricing-core/conversion/index.js` — an absolute path that resolves on the dev server
but breaks on GitHub Pages (path prefix `/pricing/`). All imports within `pricing-core/` must use
relative paths per the constraint in CLAUDE.md.

```js
// before
import { BaseDemandModel } from "/pricing-core/conversion/index.js";

// after
import { BaseDemandModel } from "../../conversion/base.js";
```

---

## 6. Fix inconsistent return type on `_conversionDistributionMarks`

All internal `_*Marks` helpers return `Markish[]`. `_conversionDistributionMarks` in `samples.js`
returns `{ marks: Markish[] }` — breaking the internal convention. Unwrap it to return `Markish[]`
and have `sampleConversionDistribution` wrap it as `{ marks }`.

---

## 7. Minor clean-ups

- **`likelihoods.js:38`** — remove stale `// Your hard-coded fixed scale` comment
- **`distributions.js:91`** — remove commented-out `contour(...)` line
- **`samples.js:136`** — replace `` stroke: d => `Particle` `` with `stroke: "Particle"` (constant
  string, no function needed)
