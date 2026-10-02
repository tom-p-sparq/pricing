import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
    LinearConversionModel,
    LogisticConversionModel,
    LogLogisticConversionModel,
    WeibullConversionModel,
} from '../pricing-core/conversion/index.js'
import { fit, Adam, logLikelihood, gradLogLikelihood } from '../pricing-core/fitting/index.js'
import { assertClose } from './helpers.js'

/** @import { BaseConversionModel } from '../pricing-core/conversion/base.js' */

/**
 * Exhausts a `fit()` generator, returning every yielded model.
 * @param {BaseConversionModel} model
 * @param {{price: number, looks: number, books: number}[]} data
 * @returns {BaseConversionModel[]}
 */
function runFit(model, data) {
    return [...fit(model, new Adam(), data, {})]
}

describe('logLikelihood', () => {
    test('matches the binomial log-likelihood k·log C + (n − k)·log(1 − C), summed over points', () => {
        const model = LogisticConversionModel.fromReference({ price: 100, conversion: 0.3, elasticity: -2 })
        const data = [{ price: 100, looks: 10, books: 3 }, { price: 80, looks: 20, books: 9 }]
        const c80 = model.conversion(80)
        const expected = 3 * Math.log(0.3) + 7 * Math.log(0.7) + 9 * Math.log(c80) + 11 * Math.log(1 - c80)
        assertClose(logLikelihood(model, data), expected, 1e-12)
    })

    test('is −∞ when the model gives zero probability to observed bookings', () => {
        const model = new LinearConversionModel({ a: 0.9, b: -0.006 })  // C = 0 for p ≥ 150
        assert.equal(logLikelihood(model, [{ price: 200, looks: 10, books: 1 }]), -Infinity)
        assert.ok(Number.isFinite(logLikelihood(model, [{ price: 200, looks: 10, books: 0 }])))
    })

    test('gradLogLikelihood matches a finite difference of logLikelihood, including the L2 term', () => {
        const model = LogisticConversionModel.fromReference({ price: 100, conversion: 0.3, elasticity: -2 })
        const data = [{ price: 60, looks: 50, books: 30 }, { price: 100, looks: 40, books: 10 }, { price: 140, looks: 30, books: 2 }]
        const eta = 0.1
        const grad = /** @type {Record<string, number>} */ (gradLogLikelihood(model, data, eta))
        const h = 1e-6
        for (const name of model.paramNames) {
            const up = new LogisticConversionModel({ ...model.parameters, [name]: model.parameters[name] + h })
            const down = new LogisticConversionModel({ ...model.parameters, [name]: model.parameters[name] - h })
            // gradLogLikelihood ascends ℓ(θ) − (η/2)·‖θ‖², so its L2 term is −η·θ.
            /** @type {(m: BaseConversionModel) => number} */
            const objective = m => logLikelihood(m, data) - eta / 2 * m.paramValues.reduce((s, v) => s + v * v, 0)
            assertClose(grad[name], (objective(up) - objective(down)) / (2 * h), 1e-5, name)
        }
    })
})

describe('fit', () => {
    const start = LogisticConversionModel.fromReference({ price: 100, conversion: 0.5, elasticity: -1 })

    test('with 0 points yields the input model exactly once', {
        todo: 'Bug: missing `else` after the 0-point branch, so it falls through to the Adam loop and yields 3 times',
    }, () => {
        const yielded = runFit(start, [])
        assert.equal(yielded.length, 1)
        assert.equal(yielded[0], start)
    })

    test('with 1 point uses the observed conversion and elasticity −2 at that price', () => {
        const [model] = runFit(start, [{ price: 90, looks: 50, books: 20 }])
        assertClose(model.conversion(90), 0.4, 1e-12)
        assertClose(model.elasticity(90), -2, 1e-12)
    })

    test('with 2 points interpolates both observed conversion rates', () => {
        const [model] = runFit(start, [{ price: 80, looks: 50, books: 20 }, { price: 120, looks: 40, books: 8 }])
        assertClose(model.conversion(80), 0.4, 1e-12)
        assertClose(model.conversion(120), 0.2, 1e-12)
    })

    /** @type {{Model: typeof LogisticConversionModel, todo?: string}[]} */
    const RECOVERY_CASES = [
        { Model: LogisticConversionModel },
        { Model: WeibullConversionModel },
        {
            Model: LogLogisticConversionModel,
            todo: 'Bug: after the flat-model fallback, fit() keeps the discarded start model\'s log-likelihood as its '
                + 'convergence baseline, so it stops after one batch and returns a worse model than it was given',
        },
    ]
    for (const { Model, todo } of RECOVERY_CASES) {
        test(`${Model.name}: recovers the generating curve from noise-free data`, { todo }, () => {
            const truth = Model.fromReference({ price: 100, conversion: 0.3, elasticity: -2 })
            // Expected (non-integer) bookings, so the MLE is exactly the generating model.
            const data = [60, 80, 100, 120, 140].map(price => ({ price, looks: 1000, books: 1000 * truth.conversion(price) }))
            const fitted = runFit(Model.fromReference({ price: 100, conversion: 0.5, elasticity: -1 }), data).at(-1)
            assert.ok(fitted)
            // fit() stops when a batch of 100 Adam steps improves ℓ by < 1e-5, which leaves
            // the conversion curve within ~1e-3 of the truth here; 5e-3 is a wide margin.
            for (const { price } of data) {
                assertClose(fitted.conversion(price), truth.conversion(price), 5e-3, `C(${price})`)
            }
        })
    }
})
