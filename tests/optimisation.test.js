import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
    LinearConversionModel,
    LogisticConversionModel,
    LogLogisticConversionModel,
    WeibullConversionModel,
    ConstantElasticityConversionModel,
} from '../pricing-core/conversion/index.js'
import { FixedDemandModel, PoissonDemandModel } from '../pricing-core/demand/index.js'
import { ExpectedRevenue, CARA, EntropicRiskMeasure, MeanVariance } from '../pricing-core/optimisation/objectiveFunctions/index.js'
import { optimisePrice } from '../pricing-core/optimisation/optimise.js'
import { assertClose, linspace } from './helpers.js'

/** @import { BaseConversionModel } from '../pricing-core/conversion/base.js' */
/** @import { BaseDemandModel } from '../pricing-core/demand/base.js' */
/** @import { BaseObjectiveFunction } from '../pricing-core/optimisation/objectiveFunctions/base.js' */

// Sign convention: elasticity ε(p) = d log C / d log p, negative for a downward-sloping
// conversion curve. Expected profit per look is (p − c)·C(p); its first-order condition
// C + (p − c)·C′ = 0 rearranges to the Lerner condition
//     ε(p*) = −p* / (p* − c),
// which has a solution with p* > c only where ε < −1 (demand is elastic).
const COST = 20
const P_MIN = COST
const P_MAX = 500
// C(100) = 0.1 keeps every model below the C = 1 clamp at the optimum. (With
// C(100) = 0.3, constant elasticity would clamp at 1 below p ≈ 55 and the optimum
// would sit at that kink, where the Lerner condition does not apply.)
const REFERENCE = { price: 100, conversion: 0.1, elasticity: -2 }

// Root of C(p) for both linear models used here (a = 0.9, b = −0.006 and the
// REFERENCE-derived a = 0.3, b = −0.002). Linear cases bracket the search at the root;
// the plateau beyond it is a known optimiser failure, recorded as a todo test below.
const LINEAR_ROOT = 150

/**
 * Upper search bound for a given model class: the root of C for linear, else P_MAX.
 * @param {Function} Model
 * @returns {number}
 */
function pMaxFor(Model) {
    return Model === LinearConversionModel ? LINEAR_ROOT : P_MAX
}

const MODELS = [
    LinearConversionModel,
    LogisticConversionModel,
    LogLogisticConversionModel,
    WeibullConversionModel,
    ConstantElasticityConversionModel,
]

/**
 * @param {BaseConversionModel} conversionModel
 * @param {number} [n=1]
 * @returns {FixedDemandModel}
 */
function fixed(conversionModel, n = 1) {
    return new FixedDemandModel({ parameters: { n }, conversionModel })
}

const expectedRevenue = new ExpectedRevenue({ cost: COST })

describe('closed-form revenue-maximising prices', () => {
    test('constant elasticity with ε < −1: p* = c·ε / (1 + ε)', () => {
        // Each ε keeps C(p*) < 1; e.g. ε = −3 would put p* = 30 inside the C = 1 clamp.
        for (const elasticity of [-2, -1.5, -1.25]) {
            const model = fixed(ConstantElasticityConversionModel.fromReference({ ...REFERENCE, elasticity }))
            const expected = COST * elasticity / (1 + elasticity)  // 40, 60, 100
            assertClose(optimisePrice(expectedRevenue, model, P_MIN, P_MAX), expected, 1e-6)
        }
    })

    test('constant elasticity with −1 < ε < 0: no interior optimum, so the optimiser returns p_max', () => {
        // Profit (p − c)·k·p^ε has derivative k·p^(ε−1)·((1 + ε)p − εc) > 0 for all p > c,
        // so it increases without bound and the constrained optimum is the upper boundary.
        for (const elasticity of [-0.5, -0.9]) {
            const model = fixed(ConstantElasticityConversionModel.fromReference({ ...REFERENCE, elasticity }))
            // Brent's method never evaluates exactly at an endpoint; it stops within its
            // tolerance (~1e-8 relative). 1e-6 relative is comfortably wider.
            assertClose(optimisePrice(expectedRevenue, model, P_MIN, P_MAX), P_MAX, 1e-6)
        }
    })

    test('linear C = a + bp (b < 0): p* = (c − a/b) / 2, bracketed by the root of C', () => {
        const conversionModel = new LinearConversionModel({ a: 0.9, b: -0.006 })
        const expected = (COST - 0.9 / -0.006) / 2  // 85
        assertClose(optimisePrice(expectedRevenue, fixed(conversionModel), P_MIN, LINEAR_ROOT), expected, 1e-6)
    })

    test('linear: optimum is found when p_max lies beyond the root of C', {
        todo: 'Bug: above the root, clamped conversion makes profit identically 0. Brent\'s first probe '
            + '(p ≈ 203) lands on that plateau and the search never leaves it, returning p ≈ p_max with J = 0.',
    }, () => {
        const conversionModel = new LinearConversionModel({ a: 0.9, b: -0.006 })
        assertClose(optimisePrice(expectedRevenue, fixed(conversionModel), P_MIN, P_MAX), 85, 1e-6)
    })

    test('the optimum is unchanged by the looks process (Fixed n, Poisson λ scale E[N] only)', () => {
        const conversionModel = LogisticConversionModel.fromReference(REFERENCE)
        const p1 = optimisePrice(expectedRevenue, fixed(conversionModel), P_MIN, P_MAX)
        const p2 = optimisePrice(expectedRevenue, new PoissonDemandModel({ parameters: { lambda: 37 }, conversionModel }), P_MIN, P_MAX)
        assertClose(p1, p2, 1e-6)
    })
})

describe('Lerner condition at the optimiser\'s answer', () => {
    for (const Model of MODELS) {
        test(`${Model.name}: ε(p*) = −p*/(p* − c)`, () => {
            const model = Model.fromReference(REFERENCE)
            const pStar = optimisePrice(expectedRevenue, fixed(model), P_MIN, pMaxFor(Model))
            assert.ok(pStar > P_MIN && pStar < pMaxFor(Model), `expected an interior optimum, got ${pStar}`)
            // The residual is first order in the optimiser's ~1e-8 relative price error,
            // scaled by dε/dp; 1e-5 relative leaves a wide margin.
            assertClose(model.elasticity(pStar), -pStar / (pStar - COST), 1e-5)
        })
    }
})

describe('optimisePrice is not beaten by a grid search', () => {
    /** @type {{name: string, objective: BaseObjectiveFunction}[]} */
    const OBJECTIVES = [
        { name: 'ExpectedRevenue', objective: expectedRevenue },
        { name: 'EntropicRiskMeasure', objective: new EntropicRiskMeasure({ parameters: { rho: 0.005 }, cost: COST }) },
        { name: 'CARA', objective: new CARA({ parameters: { rho: 0.005 }, cost: COST }) },
        { name: 'MeanVariance', objective: new MeanVariance({ parameters: { rho: 0.001 }, cost: COST }) },
    ]
    /** @type {{name: string, model: BaseDemandModel, pMin: number, pMax: number}[]} */
    const CASES = [
        ...MODELS.map(Model => ({ name: Model.name, model: fixed(Model.fromReference(REFERENCE), 10), pMin: P_MIN, pMax: pMaxFor(Model) })),
        // Boundary optima: profit increasing throughout (inelastic demand), and a lower
        // bound above the unconstrained optimum p* = 40.
        { name: 'inelastic ε = −0.5 (optimum at p_max)', model: fixed(ConstantElasticityConversionModel.fromReference({ ...REFERENCE, elasticity: -0.5 }), 10), pMin: P_MIN, pMax: P_MAX },
        { name: 'ε = −2 with p_min = 60 > p* (optimum at p_min)', model: fixed(ConstantElasticityConversionModel.fromReference(REFERENCE), 10), pMin: 60, pMax: P_MAX },
    ]

    for (const { name: objectiveName, objective } of OBJECTIVES) {
        test(`${objectiveName}, across all models and two boundary-optimum cases`, () => {
            for (const { name, model, pMin, pMax } of CASES) {
                const pStar = optimisePrice(objective, model, pMin, pMax)
                // The grid includes both endpoints, so boundary optima are represented exactly.
                const best = Math.max(...linspace(pMin, pMax, 2001).map(p => objective.J(model, p)))
                // Tolerance: 1e-6 of the objective's scale. This covers Brent stopping
                // ~1e-8 short of a boundary optimum, while still catching any real miss
                // (the grid spacing is 0.24 price units).
                const tol = 1e-6 * Math.max(Math.abs(best), 1e-3)
                assert.ok(objective.J(model, pStar) >= best - tol,
                    `${name}: J(p*=${pStar}) = ${objective.J(model, pStar)} < grid max ${best}`)
            }
        })
    }
})

describe('risk-neutral limits as ρ → 0', () => {
    const model = fixed(LogisticConversionModel.fromReference({ price: 100, conversion: 0.3, elasticity: -2 }), 50)
    const PRICE = 100
    const margin = PRICE - COST
    const mean = expectedRevenue.J(model, PRICE)
    const variance = margin ** 2 * model.varianceConversions(PRICE)

    test('MeanVariance with ρ = 0 equals ExpectedRevenue', () => {
        const mv = new MeanVariance({ parameters: { rho: 0 }, cost: COST })
        for (const price of [30, 100, 200]) {
            assertClose(mv.J(model, price), expectedRevenue.J(model, price), 1e-12)
        }
    })

    test('ERM = E[Π] − (ρ/2)·Var[Π] + O(ρ²)', () => {
        /** @type {(rho: number) => number} */
        const error = rho => new EntropicRiskMeasure({ parameters: { rho }, cost: COST }).J(model, PRICE) - (mean - rho * variance / 2)
        // A residual that is O(ρ²) shrinks 100× when ρ shrinks 10×; the leading term is
        // ρ²κ₃/6, so allow a factor in [80, 120] for higher-order contamination.
        const ratio = error(1e-3) / error(1e-4)
        assert.ok(ratio > 80 && ratio < 120, `ratio ${ratio}`)
        // At ρ = 1e-6 the leading error ρ·Var/2 is ≈ 3e-5 of E[Π].
        assertClose(new EntropicRiskMeasure({ parameters: { rho: 1e-6 }, cost: COST }).J(model, PRICE), mean, 1e-4)
    })

    test('CARA: (J + 1)/ρ → E[Π] with O(ρ) error', () => {
        /** @type {(rho: number) => number} */
        const error = rho => (new CARA({ parameters: { rho }, cost: COST }).J(model, PRICE) + 1) / rho - mean
        const ratio = error(1e-5) / error(1e-6)
        assert.ok(ratio > 8 && ratio < 12, `ratio ${ratio}`)
        assertClose((new CARA({ parameters: { rho: 1e-7 }, cost: COST }).J(model, PRICE) + 1) / 1e-7, mean, 1e-4)
    })

    test('risk-averse optimal prices converge to the risk-neutral price at rate O(ρ)', () => {
        const p0 = optimisePrice(expectedRevenue, model, P_MIN, P_MAX)
        /** @type {(rho: number) => number} */
        const shift = rho => optimisePrice(new EntropicRiskMeasure({ parameters: { rho }, cost: COST }), model, P_MIN, P_MAX) - p0
        const ratio = shift(1e-3) / shift(1e-4)
        assert.ok(ratio > 8 && ratio < 12, `ratio ${ratio}`)
        // ERM(ρ) and MeanVariance(ρ/2) agree to first order in ρ, so their optima should too.
        for (const rho of [1e-3, 1e-4]) {
            const pErm = optimisePrice(new EntropicRiskMeasure({ parameters: { rho }, cost: COST }), model, P_MIN, P_MAX)
            const pMv = optimisePrice(new MeanVariance({ parameters: { rho: rho / 2 }, cost: COST }), model, P_MIN, P_MAX)
            assert.ok(Math.abs(pErm - pMv) < 0.05 * Math.abs(pErm - p0), `ERM ${pErm} vs MV ${pMv} at ρ=${rho}`)
        }
    })

    test('ERM and CARA share the same optimal price for the same ρ', () => {
        for (const rho of [1e-3, 1e-2]) {
            const pErm = optimisePrice(new EntropicRiskMeasure({ parameters: { rho }, cost: COST }), model, P_MIN, P_MAX)
            const pCara = optimisePrice(new CARA({ parameters: { rho }, cost: COST }), model, P_MIN, P_MAX)
            // Same maximiser in exact arithmetic; Brent's stopping point differs by ~1e-6.
            assertClose(pErm, pCara, 1e-5)
        }
    })

    test('risk-averse objectives never exceed expected profit (Jensen)', () => {
        const erm = new EntropicRiskMeasure({ parameters: { rho: 0.01 }, cost: COST })
        const mv = new MeanVariance({ parameters: { rho: 0.01 }, cost: COST })
        for (const price of linspace(25, 300, 12)) {
            assert.ok(erm.J(model, price) <= expectedRevenue.J(model, price))
            assert.ok(mv.J(model, price) <= expectedRevenue.J(model, price))
        }
    })
})

describe('posterior aggregation over weighted samples', () => {
    const models = [-1.5, -2, -3].map(elasticity =>
        fixed(LogisticConversionModel.fromReference({ ...REFERENCE, elasticity }), 10))
    const logWeights = [Math.log(0.2), Math.log(0.5), Math.log(0.3)]  // normalised
    const samples = models.map((model, i) => ({ model, logWeight: logWeights[i] }))

    test('ExpectedRevenue of a posterior is the weighted mean of per-sample expected revenue', () => {
        const expected = models.reduce((sum, m, i) => sum + Math.exp(logWeights[i]) * expectedRevenue.J(m, 80), 0)
        assertClose(expectedRevenue.J(samples, 80), expected, 1e-12)
    })

    test('a single model equals a one-element sample array with logWeight 0', () => {
        const erm = new EntropicRiskMeasure({ parameters: { rho: 0.01 }, cost: COST })
        assert.equal(erm.J(models[0], 80), erm.J([{ model: models[0], logWeight: 0 }], 80))
    })

    /** @type {{name: string, objective: BaseObjectiveFunction, todo?: string}[]} */
    const OBJECTIVES = [
        { name: 'ExpectedRevenue', objective: expectedRevenue },
        { name: 'MeanVariance', objective: new MeanVariance({ parameters: { rho: 0.01 }, cost: COST }) },
        { name: 'CARA', objective: new CARA({ parameters: { rho: 0.01 }, cost: COST }),
            todo: 'Bug: CARA._J assumes normalised weights but BaseObjectiveFunction.J does not normalise' },
        { name: 'EntropicRiskMeasure', objective: new EntropicRiskMeasure({ parameters: { rho: 0.01 }, cost: COST }),
            todo: 'Bug: EntropicRiskMeasure._J assumes normalised weights but BaseObjectiveFunction.J does not normalise' },
    ]
    for (const { name, objective, todo } of OBJECTIVES) {
        test(`${name} is invariant to shifting every logWeight by a constant`, { todo }, () => {
            for (const shift of [Math.log(2), -5, 3]) {
                const shifted = samples.map(({ model, logWeight }) => ({ model, logWeight: logWeight + shift }))
                assertClose(objective.J(shifted, 80), objective.J(samples, 80), 1e-12)
            }
        })
    }
})
