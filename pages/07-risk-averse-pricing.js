import { conversion, plotting, inputs, optimisation, demand } from '../pricing-core/index.js'
import { requireElement } from '../utils.js'

const MAX_PRICE = 400
const ALPHA = 0.9 // fraction of theoretical max expected profit defining the two comparison prices

const volatilityDistContainer = requireElement('volatility-distribution-container')
const volatilitySpecContainer = requireElement('volatility-spec-container')
const meanVarPlotContainer = requireElement('meanVariance-plot-container')
const meanVarSpecContainer = requireElement('meanVariance-spec-container')

// Fixed conversion model — kept out of the interactive scenario since varying
// it doesn't change the qualitative story being told here (any downward-sloping
// conversion curve behaves the same way under risk aversion).
const conversionModel = conversion.LogisticConversionModel.fromReference({ price: 150, conversion: 0.5, elasticity: -2 })

// Shared scenario (fixed looks, cost) — feeds both figures below. Mirrored into
// meanVarSpecContainer as a second, kept-in-sync slider pair (see mirrorSliders)
// so the scenario can be adjusted from either figure without scrolling back up.
volatilitySpecContainer.style.cssText = 'display: flex; align-items: center; justify-content: space-around; gap: 1em;'
meanVarSpecContainer.style.cssText = 'display: flex; align-items: center; justify-content: space-around; gap: 1em;'
const nSlider = inputs.fixedLooksSlider(volatilitySpecContainer)
const costSlider = inputs.costSlider(volatilitySpecContainer)
const nSliderMirror = inputs.fixedLooksSlider(meanVarSpecContainer)
const costSliderMirror = inputs.costSlider(meanVarSpecContainer)

// Mean-variance figure's own control.
const rhoSlider = inputs.riskAversionSlider(meanVarSpecContainer)

function buildDemandModel() {
    return new demand.FixedDemandModel({ parameters: { n: nSlider.value }, conversionModel })
}

/**
 * Keeps two Observable Input sliders showing the same value, as close as
 * possible to rendering the same control twice: dragging either updates the
 * other's displayed value via its `.value` setter — which updates the DOM
 * without re-dispatching an `'input'` event, so this can't loop — then runs
 * `onChange` once.
 * @param {HTMLElement & {value: number}} a
 * @param {HTMLElement & {value: number}} b
 * @param {() => void} onChange
 */
function mirrorSliders(a, b, onChange) {
    a.addEventListener('input', () => { b.value = a.value; onChange() })
    b.addEventListener('input', () => { a.value = b.value; onChange() })
}

/**
 * Finds x in [lo, hi] such that f(x) ≈ target, assuming f is monotone on [lo, hi].
 * Direction (increasing/decreasing) is inferred from f(lo) vs f(hi).
 * @param {(x: number) => number} f
 * @param {number} lo
 * @param {number} hi
 * @param {number} target
 * @param {number} [tol=1e-6]
 * @param {number} [maxIter=100]
 * @returns {number}
 */
function bisect(f, lo, hi, target, tol = 1e-6, maxIter = 100) {
    const increasing = f(hi) >= f(lo)
    /** @type {(x: number) => number} */
    const sign = (x) => increasing ? Math.sign(f(x) - target) : -Math.sign(f(x) - target)
    if (sign(lo) > 0 || sign(hi) < 0) {
        throw new Error(`bisect: target ${target} is not bracketed by f(${lo})=${f(lo)}, f(${hi})=${f(hi)}`)
    }
    let a = lo, b = hi
    for (let i = 0; i < maxIter && (b - a) > tol; i++) {
        const mid = (a + b) / 2
        if (sign(mid) <= 0) a = mid; else b = mid
    }
    return (a + b) / 2
}

/**
 * log P(K=k) for K ~ Binomial(n, p), computed elementarily (no gamma function):
 * log C(n,k) via the iterative product form, guarding the 0·log(0) edge cases
 * that arise when p clamps to exactly 0 or 1.
 * @param {number} n
 * @param {number} k
 * @param {number} p
 * @returns {number}
 */
function logBinomialPmf(n, k, p) {
    let logC = 0
    for (let i = 1; i <= k; i++) logC += Math.log((n - k + i) / i)
    const logP = k === 0 ? 0 : k * Math.log(p)
    const logQ = k === n ? 0 : (n - k) * Math.log(1 - p)
    return logC + logP + logQ
}

/**
 * @param {number} n
 * @param {number} p
 * @param {number} margin
 * @param {string} name
 * @returns {{profit: number, probability: number, name: string}[]}
 */
function profitDistribution(n, p, margin, name) {
    return Array.from({ length: n + 1 }, (_, k) => ({
        profit: margin * k,
        probability: Math.exp(logBinomialPmf(n, k, p)),
        name,
    }))
}

function renderVolatility() {
    const demandModel = buildDemandModel()
    const cost = costSlider.value
    const n = nSlider.value
    const objective = new optimisation.objectiveFunctions.ExpectedRevenue({ cost })
    const pStar = optimisation.optimisePrice(objective, demandModel, cost, MAX_PRICE)
    const optimalProfit = objective.J(demandModel, pStar)
    const target = ALPHA * optimalProfit
    /** @type {(price: number) => number} */
    const f = price => objective.J(demandModel, price)
    const priceLow = bisect(f, cost, pStar, target)
    const priceHigh = bisect(f, pStar, MAX_PRICE, target)
    const data = [
        ...profitDistribution(n, demandModel.conversion(priceLow), priceLow - cost, `Lower price (${priceLow.toFixed(2)})`),
        ...profitDistribution(n, demandModel.conversion(priceHigh), priceHigh - cost, `Higher price (${priceHigh.toFixed(2)})`),
    ]
    plotting.plot(
        volatilityDistContainer,
        plotting.profitDistributionPlot(data),
        { x: { label: 'Profit' }, y: { grid: true, label: 'Probability' }, color: { legend: true } },
        {
            title: 'Profit Distribution at Two Equal-Expected-Profit Prices',
            subtitle: `Both prices achieve ${(ALPHA * 100).toFixed(0)}% of the maximum expected profit (${optimalProfit.toFixed(2)})`,
        },
    )
}

function renderMeanVariance() {
    const demandModel = buildDemandModel()
    const cost = costSlider.value
    const rho = rhoSlider.value
    const meanVarObjective = new optimisation.objectiveFunctions.MeanVariance({ parameters: { rho }, cost })
    const riskNeutralObjective = new optimisation.objectiveFunctions.ExpectedRevenue({ cost })
    // Risk aversion can only ever pull the optimum below the risk-neutral one — at the
    // risk-neutral optimum the variance penalty's derivative is strictly positive (variance
    // is still climbing in margin there), so for any rho > 0 the mean-variance objective is
    // already decreasing at that price. Bracketing to [1, riskNeutralPrice] both makes this
    // economically legible and sidesteps a second, spurious local maximum that can otherwise
    // appear near the domain's far boundary (where conversion, and so variance, vanishes).
    const riskNeutralPrice = optimisation.optimisePrice(riskNeutralObjective, demandModel, cost, MAX_PRICE)
    const optimalPrice = optimisation.optimisePrice(meanVarObjective, demandModel, 1, riskNeutralPrice)
    const optimalObjective = meanVarObjective.J(demandModel, optimalPrice)
    const minPrice = Math.max(0, cost - 10)
    plotting.plot(
        meanVarPlotContainer,
        plotting.objectiveCurvePlot(demandModel, riskNeutralObjective, MAX_PRICE, minPrice, 'Risk-neutral'),
        plotting.objectiveCurvePlot(demandModel, meanVarObjective, MAX_PRICE, minPrice, 'Risk-averse'),
        plotting.referencePricePlot(riskNeutralPrice),
        plotting.optimalPricePlot(optimalPrice, optimalObjective),
        { x: { label: 'Price' }, y: { grid: true, label: 'Objective value' }, color: { legend: true } },
        {
            title: 'Mean-Variance Objective by Price',
            subtitle: `Optimal price: ${optimalPrice.toFixed(2)} (risk-neutral: ${riskNeutralPrice.toFixed(2)})`,
        },
    )
}

mirrorSliders(nSlider, nSliderMirror, () => { renderVolatility(); renderMeanVariance() })
mirrorSliders(costSlider, costSliderMirror, () => { renderVolatility(); renderMeanVariance() })
rhoSlider.addEventListener('input', renderMeanVariance)

renderVolatility()
renderMeanVariance()
