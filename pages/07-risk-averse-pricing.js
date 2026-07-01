import { conversion, plotting, inputs, optimisation, demand } from '../pricing-core/index.js'
import { requireElement } from '../utils.js'

const MAX_PRICE = 400
const ALPHA = 0.9 // fraction of theoretical max expected profit defining the two comparison prices

const volatilityDistContainer = requireElement('volatility-distribution-container')
const volatilitySpecContainer = requireElement('volatility-spec-container')
const meanVarPlotContainer = requireElement('meanVariance-plot-container')
const meanVarSpecContainer = requireElement('meanVariance-spec-container')

// Shared scenario (conversion model, fixed looks, cost) — feeds both figures below.
const referenceForm = inputs.referenceForm(volatilitySpecContainer)
const scenarioRow = document.createElement('div')
scenarioRow.style.cssText = 'display: flex; align-items: center; justify-content: space-around; gap: 1em;'
volatilitySpecContainer.appendChild(scenarioRow)
const nSlider = inputs.fixedLooksSlider(scenarioRow)
const costSlider = inputs.costSlider(scenarioRow)

// Mean-variance figure's own control.
const rhoSlider = inputs.riskAversionSlider(meanVarSpecContainer)

function buildDemandModel() {
    const conversionModel = conversion.LogisticConversionModel.fromReference(referenceForm.value)
    return new demand.FixedDemandModel({ parameters: { n: nSlider.value }, conversionModel })
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
 * Maximises `objective.J` over `[pMin, pMax]` robustly to non-unimodal
 * objectives: MeanVariance's quadratic-in-margin variance penalty can create
 * a second local maximum near the domain boundary (where conversion → 0 kills
 * both mean and variance), which plain Brent's-method optimisePrice can lock
 * onto if it happens to bracket only that monotonically-rising tail — a
 * documented limitation of optimisePrice's unimodality precondition, not a
 * bug in it. A coarse grid sweep finds the correct basin first; optimisePrice
 * then refines within a narrow window around the best grid point.
 * @param {import('../pricing-core/optimisation/objectiveFunctions/base.js').BaseObjectiveFunction} objective
 * @param {import('../pricing-core/demand/base.js').BaseDemandModel} demandModel
 * @param {number} pMin
 * @param {number} pMax
 * @param {number} [gridStep=1]
 * @returns {number}
 */
function robustOptimisePrice(objective, demandModel, pMin, pMax, gridStep = 1) {
    let bestPrice = pMin, bestValue = -Infinity
    for (let price = pMin; price <= pMax; price += gridStep) {
        const value = objective.J(demandModel, price)
        if (value > bestValue) { bestValue = value; bestPrice = price }
    }
    const lo = Math.max(pMin, bestPrice - gridStep)
    const hi = Math.min(pMax, bestPrice + gridStep)
    return optimisation.optimisePrice(objective, demandModel, lo, hi)
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
        { x: { label: 'Profit' }, y: { grid: true, label: 'Probability' } },
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
    const optimalPrice = robustOptimisePrice(meanVarObjective, demandModel, cost, MAX_PRICE)
    const optimalObjective = meanVarObjective.J(demandModel, optimalPrice)
    const riskNeutralPrice = optimisation.optimisePrice(riskNeutralObjective, demandModel, cost, MAX_PRICE)
    const minPrice = Math.max(0, cost - 10)
    plotting.plot(
        meanVarPlotContainer,
        plotting.objectiveCurvePlot(demandModel, riskNeutralObjective, MAX_PRICE, minPrice),
        plotting.objectiveCurvePlot(demandModel, meanVarObjective, MAX_PRICE, minPrice),
        plotting.referencePricePlot(riskNeutralPrice),
        plotting.optimalPricePlot(optimalPrice, optimalObjective),
        { x: { label: 'Price' }, y: { grid: true, label: 'Objective value' } },
        {
            title: 'Mean-Variance Objective by Price',
            subtitle: `Optimal price: ${optimalPrice.toFixed(2)} (risk-neutral: ${riskNeutralPrice.toFixed(2)})`,
        },
    )
}

referenceForm.addEventListener('input', () => { renderVolatility(); renderMeanVariance() })
nSlider.addEventListener('input', () => { renderVolatility(); renderMeanVariance() })
costSlider.addEventListener('input', () => { renderVolatility(); renderMeanVariance() })
rhoSlider.addEventListener('input', renderMeanVariance)

renderVolatility()
renderMeanVariance()
