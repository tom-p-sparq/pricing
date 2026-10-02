import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { LogisticConversionModel } from '../pricing-core/conversion/index.js'
import { FixedDemandModel, PoissonDemandModel, NegativeBinomialDemandModel } from '../pricing-core/demand/index.js'
import { assertClose } from './helpers.js'

/** @import { BaseDemandModel } from '../pricing-core/demand/base.js' */

const conversionModel = LogisticConversionModel.fromReference({ price: 100, conversion: 0.3, elasticity: -2 })
const PRICE = 100
const PHI = 0.3  // conversion at PRICE

/**
 * Cases with analytic mean and variance of converted looks K at conversion φ.
 * @type {{name: string, model: BaseDemandModel, mean: number, variance: number, todo?: string}[]}
 */
const CASES = [
    {
        name: 'Fixed (binomial)',
        model: new FixedDemandModel({ parameters: { n: 50 }, conversionModel }),
        mean: 50 * PHI,
        variance: 50 * PHI * (1 - PHI),
    },
    {
        name: 'Poisson',
        model: new PoissonDemandModel({ parameters: { lambda: 50 }, conversionModel }),
        mean: 50 * PHI,
        variance: 50 * PHI,
        todo: 'Bug: PoissonDemandModel does not implement _varianceConversions',
    },
    {
        name: 'Negative binomial',
        model: new NegativeBinomialDemandModel({ parameters: { lambda: 50, r: 4 }, conversionModel }),
        mean: 50 * PHI,
        variance: 50 * PHI + (50 * PHI) ** 2 / 4,
        todo: 'Bug: NegativeBinomialDemandModel does not implement _varianceConversions',
    },
]

for (const { name, model, mean, variance, todo } of CASES) {
    describe(name, () => {
        /** @type {(t: number) => number} */
        const K = t => model.logMgfConversions(t, PRICE)

        test('log-MGF is 0 at t = 0 and mgf = exp(log-MGF)', () => {
            assert.equal(K(0), 0)
            for (const t of [-0.5, -0.01, 0.01]) {
                assertClose(model.mgfConversions(t, PRICE), Math.exp(K(t)), 1e-14)
            }
        })

        test('expectedConversions matches the analytic mean and K′(0)', () => {
            assertClose(model.expectedConversions(PRICE), mean, 1e-12)
            const h = 1e-5
            // Central difference: O(h²) truncation; 1e-6 relative is comfortable.
            assertClose((K(h) - K(-h)) / (2 * h), mean, 1e-6)
        })

        test('the second cumulant K″(0) matches the analytic variance', () => {
            const h = 1e-3
            // Second difference: O(h²·K⁗) truncation ≈ 1e-6 relative here; allow 1e-4.
            assertClose((K(h) - 2 * K(0) + K(-h)) / (h * h), variance, 1e-4)
        })

        test('varianceConversions matches the analytic variance', { todo }, () => {
            assertClose(model.varianceConversions(PRICE), variance, 1e-12)
        })
    })
}

describe('closed forms and limits', () => {
    test('Fixed demand MGF equals the binomial MGF (1 − φ + φeᵗ)ⁿ', () => {
        const model = new FixedDemandModel({ parameters: { n: 20 }, conversionModel })
        for (const t of [-2, -0.1, 0.3]) {
            assertClose(model.mgfConversions(t, PRICE), (1 - PHI + PHI * Math.exp(t)) ** 20, 1e-12)
        }
    })

    test('Poisson demand MGF equals the thinned-Poisson MGF exp(λφ(eᵗ − 1))', () => {
        const model = new PoissonDemandModel({ parameters: { lambda: 20 }, conversionModel })
        for (const t of [-2, -0.1, 0.3]) {
            assertClose(model.mgfConversions(t, PRICE), Math.exp(20 * PHI * Math.expm1(t)), 1e-12)
        }
    })

    test('negative binomial recovers Poisson as r → ∞', () => {
        const poisson = new PoissonDemandModel({ parameters: { lambda: 20 }, conversionModel })
        const nb = new NegativeBinomialDemandModel({ parameters: { lambda: 20, r: 1e9 }, conversionModel })
        for (const t of [-2, -0.1, 0.3]) {
            // The difference is O(μ²(eᵗ−1)²/r) ≈ 1e-7 at r = 1e9.
            assertClose(nb.logMgfConversions(t, PRICE), poisson.logMgfConversions(t, PRICE), 1e-6)
        }
    })
})
