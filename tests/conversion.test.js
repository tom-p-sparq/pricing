import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import {
    LinearConversionModel,
    LogisticConversionModel,
    LogLogisticConversionModel,
    WeibullConversionModel,
    ConstantElasticityConversionModel,
} from '../pricing-core/conversion/index.js'
import { assertClose } from './helpers.js'

/** @import { BaseConversionModel } from '../pricing-core/conversion/base.js' */

// Elasticity convention throughout: ε(p) = d log C / d log p, so a downward-sloping
// conversion curve has ε < 0.
const MODELS = [
    LinearConversionModel,
    LogisticConversionModel,
    LogLogisticConversionModel,
    WeibullConversionModel,
    ConstantElasticityConversionModel,
]

const REFERENCE = { price: 100, conversion: 0.3, elasticity: -2 }

// Prices where every model built from REFERENCE is strictly inside (0, 1), so the
// clamp in `conversion()` is inactive (constant elasticity hits C = 1 below p ≈ 55;
// linear hits C = 0 at p = 150).
const INTERIOR_PRICES = [80, 100, 140]

/**
 * Central finite-difference estimate of d log C / d log p.
 * @param {BaseConversionModel} model
 * @param {number} price
 * @returns {number}
 */
function numericalElasticity(model, price) {
    const h = 1e-5
    return (Math.log(model.conversion(price * Math.exp(h))) - Math.log(model.conversion(price * Math.exp(-h)))) / (2 * h)
}

/**
 * Central finite-difference gradient of `f(model)` with respect to each model parameter.
 * @param {BaseConversionModel} model
 * @param {(m: BaseConversionModel) => number} f
 * @returns {Record<string, number>}
 */
function numericalGradient(model, f) {
    const h = 1e-6
    const ModelClass = /** @type {any} */ (model.constructor)
    return Object.fromEntries(model.paramNames.map(name => {
        const up = new ModelClass({ ...model.parameters, [name]: model.parameters[name] + h })
        const down = new ModelClass({ ...model.parameters, [name]: model.parameters[name] - h })
        return [name, (f(up) - f(down)) / (2 * h)]
    }))
}

// Each property is one test that loops over every model; assertion messages name the
// model, so a failure is as precise as a per-model test without multiplying the count.
describe('properties of every conversion model', () => {
    const models = MODELS.map(Model => ({ Model, model: Model.fromReference(REFERENCE) }))

    test('fromReference reproduces conversion and elasticity at the reference price', () => {
        for (const { Model, model } of models) {
            assertClose(model.conversion(REFERENCE.price), REFERENCE.conversion, 1e-12, Model.name)
            assertClose(model.elasticity(REFERENCE.price), REFERENCE.elasticity, 1e-12, Model.name)
        }
    })

    test('fromReference rejects invalid reference points', () => {
        for (const { Model } of models) {
            assert.throws(() => Model.fromReference({ price: 0, conversion: 0.3, elasticity: -2 }), Model.name)
            assert.throws(() => Model.fromReference({ price: 100, conversion: 1, elasticity: -2 }), Model.name)
            assert.throws(() => Model.fromReference({ price: 100, conversion: 0, elasticity: -2 }), Model.name)
        }
    })

    test('interpolate passes through both points', () => {
        const p0 = { price: 80, conversion: 0.4 }
        const p1 = { price: 120, conversion: 0.2 }
        for (const { Model } of models) {
            const m = Model.interpolate(p0, p1)
            assertClose(m.conversion(p0.price), p0.conversion, 1e-12, Model.name)
            assertClose(m.conversion(p1.price), p1.conversion, 1e-12, Model.name)
        }
    })

    test('fromFlat gives a price-independent conversion with zero elasticity', () => {
        for (const { Model } of models) {
            const m = Model.fromFlat(0.3)
            for (const price of [10, 100, 1000]) {
                assertClose(m.conversion(price), 0.3, 1e-12, `${Model.name} at p=${price}`)
                assertClose(m.elasticity(price), 0, 0, `${Model.name} at p=${price}`)  // may be −0
            }
        }
    })

    test('elasticity() matches a finite-difference d log C / d log p', () => {
        for (const { Model, model } of models) {
            for (const price of INTERIOR_PRICES) {
                // Central differences have O(h²) ≈ 1e-10 truncation error; 1e-6 is comfortable.
                assertClose(model.elasticity(price), numericalElasticity(model, price), 1e-6, `${Model.name} at p=${price}`)
            }
        }
    })

    test('gradLog matches finite differences of log C and log(1 − C)', () => {
        for (const { Model, model } of models) {
            for (const price of INTERIOR_PRICES) {
                const { conversion, rejection } = model.gradLog(price)
                const numConversion = numericalGradient(model, m => Math.log(m.conversion(price)))
                const numRejection = numericalGradient(model, m => Math.log(1 - m.conversion(price)))
                for (const name of model.paramNames) {
                    // Some models add a 1e-9 guard inside gradLog; 1e-5 absorbs that.
                    assertClose(conversion[name], numConversion[name], 1e-5, `${Model.name} ∂log C/∂${name} at p=${price}`)
                    assertClose(rejection[name], numRejection[name], 1e-5, `${Model.name} ∂log(1−C)/∂${name} at p=${price}`)
                }
            }
        }
    })

    test('conversion lies in [0, 1] and is non-increasing in price when ε < 0', () => {
        const prices = [0, ...Array.from({ length: 400 }, (_, i) => 0.5 + i * 2.5), 1e6]
        for (const { Model, model } of models) {
            let previous = Infinity
            for (const price of prices) {
                const c = model.conversion(price)
                assert.ok(c >= 0 && c <= 1, `${Model.name}: conversion ${c} at p=${price} outside [0, 1]`)
                assert.ok(c <= previous, `${Model.name}: conversion increased at p=${price}`)
                previous = c
            }
        }
    })
})

describe('known-parameter values', () => {
    test('logistic: C = 1/2 at p = −a/b, and C = σ(a + bp) generally', () => {
        const m = new LogisticConversionModel({ a: 3, b: -0.05 })
        assertClose(m.conversion(60), 0.5, 1e-15)
        assertClose(m.conversion(100), 1 / (1 + Math.exp(2)), 1e-15)
    })

    test('log-logistic: C = 1/2 at p = exp(−a/b)', () => {
        const m = new LogLogisticConversionModel({ a: 8, b: -2 })
        assertClose(m.conversion(Math.exp(4)), 0.5, 1e-12)
    })

    test('Weibull: C = 1/e at p = exp(−a/b)', () => {
        const m = new WeibullConversionModel({ a: -9, b: 2 })
        assertClose(m.conversion(Math.exp(4.5)), Math.exp(-1), 1e-12)
    })

    test('constant elasticity: C = e^a · p^b with ε ≡ b', () => {
        const m = new ConstantElasticityConversionModel({ a: Math.log(0.8), b: -1.5 })
        assertClose(m.conversion(4), 0.8 * 4 ** -1.5, 1e-14)
        for (const price of [2, 4, 50]) assert.equal(m.elasticity(price), -1.5)
    })

    test('linear: clamps to 0 beyond the root, where elasticity is reported as 0', () => {
        const m = new LinearConversionModel({ a: 0.9, b: -0.006 })  // root at p = 150
        assertClose(m.conversion(100), 0.3, 1e-14)
        assert.equal(m.conversion(200), 0)
        assert.equal(m.elasticity(200), 0)
    })
})
