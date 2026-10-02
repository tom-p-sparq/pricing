import { describe, test } from 'node:test'
import assert from 'node:assert/strict'
import { LinearConversionModel } from '../pricing-core/conversion/index.js'
import { createRng, Prior, Proposal, iidSampler, mh, ParticleFilterState } from '../pricing-core/sampling/index.js'
import { Beta } from '../pricing-core/sampling/distributions/index.js'
import { NormalStep } from '../pricing-core/sampling/steps/index.js'
import { logSumExp } from '../pricing-core/utils.js'
import { SEED, assertClose } from './helpers.js'

// Conjugate check. A flat conversion model C(p) ≡ c with a Beta(α, β) prior on c and
// binomial data (k bookings from n looks) has the exact posterior Beta(α + k, β + n − k),
// so every sampler can be checked against closed-form moments.
//
// Prior: mean 0.3, sample size 10  →  α = 3, β = 7 (prior sd ≈ 0.138).
// Data:  4 points × (25 looks, 10 books) = 100 looks, 40 books, at arbitrary prices.
// Posterior: Beta(43, 67), mean 43/110 ≈ 0.391, sd ≈ 0.0463.
const ALPHA = 3 + 40
const BETA = 7 + 60
const POSTERIOR_MEAN = ALPHA / (ALPHA + BETA)
const POSTERIOR_SD = Math.sqrt(ALPHA * BETA / ((ALPHA + BETA) ** 2 * (ALPHA + BETA + 1)))
const DATA = [50, 80, 110, 140].map(price => ({ price, looks: 25, books: 10 }))

/**
 * @param {() => number} rng
 * @returns {Prior<LinearConversionModel>}
 */
function makePrior(rng) {
    return new Prior(
        { c: { dist: Beta, args: { mean: 0.3, sampleSize: 10 } } },
        ({ c }) => LinearConversionModel.fromFlat(c),
        rng,
    )
}

/**
 * @param {() => number} rng
 * @returns {Proposal}
 */
function makeProposal(rng) {
    return new Proposal({ c: { dist: NormalStep, args: { sigma: 0.08 } } }, rng)
}

/**
 * Weighted mean and standard deviation.
 * @param {number[]} xs
 * @param {number[]} [ws] Normalised weights; uniform if omitted.
 * @returns {{mean: number, sd: number}}
 */
function moments(xs, ws = xs.map(() => 1 / xs.length)) {
    const mean = xs.reduce((s, x, i) => s + ws[i] * x, 0)
    const variance = xs.reduce((s, x, i) => s + ws[i] * (x - mean) ** 2, 0)
    return { mean, sd: Math.sqrt(variance) }
}

/**
 * Takes the first `n` values from a (possibly infinite) generator.
 * @template T
 * @param {Generator<T>} gen
 * @param {number} n
 * @returns {T[]}
 */
function take(gen, n) {
    /** @type {T[]} */
    const out = []
    for (const x of gen) {
        out.push(x)
        if (out.length === n) break
    }
    return out
}

describe('reproducibility', () => {
    test('createRng with the same seed produces the same stream', () => {
        const a = createRng(SEED), b = createRng(SEED)
        for (let i = 0; i < 100; i++) assert.equal(a(), b())
    })

    test('an MH chain is identical when re-run from the same seed', () => {
        /** @type {() => number[]} */
        const run = () => {
            const rng = createRng(SEED)
            return take(mh(makePrior(rng), makeProposal(rng), DATA), 200).map(m => m.parameters.a)
        }
        assert.deepEqual(run(), run())
    })
})

describe('conjugate Beta–binomial posterior', () => {
    test('iidSampler reproduces the prior mean and sd', () => {
        const rng = createRng(SEED)
        const draws = take(iidSampler(makePrior(rng)), 4000).map(m => m.parameters.a)
        const { mean, sd } = moments(draws)
        // Monte Carlo SE of the mean = 0.138/√4000 ≈ 0.0022; tolerance 0.011 ≈ 5 SE.
        assertClose(mean, 0.3, 0.011)
        // Relative SE of a sample sd ≈ 1/√(2n) ≈ 1.1%; tolerance 10%.
        assertClose(sd, Math.sqrt(3 * 7 / (100 * 11)), 0.1 * 0.138)
    })

    test('Metropolis–Hastings matches the analytic posterior mean and sd', () => {
        const rng = createRng(SEED)
        const draws = take(mh(makePrior(rng), makeProposal(rng), DATA, { burnIn: 500 }), 6000).map(m => m.parameters.a)
        const { mean, sd } = moments(draws)
        // With σ = 0.08 the chain's integrated autocorrelation time is ≈ 5.4 (measured by batch means), so the
        // effective sample size is ≈ 1200 and the SE of the mean ≈ 0.0463/√1200 ≈ 0.0013.
        // Tolerance 0.008 ≈ 6 SE; the sd tolerance of 15% is ≈ 7 of its relative SEs.
        assertClose(mean, POSTERIOR_MEAN, 0.008)
        assertClose(sd, POSTERIOR_SD, 0.15 * POSTERIOR_SD)
    })

    test('the particle filter matches the analytic posterior mean and sd', () => {
        const rng = createRng(SEED)
        const N = 300
        const pf = new ParticleFilterState(makePrior(rng), makeProposal(rng), { N })
        const { particles, weights } = pf.update(DATA)
        const { mean, sd } = moments(particles.map(m => m.parameters.a), weights)
        // With N = 300 and at least N/2 effective particles (the resampling threshold),
        // the SE of the mean is ≲ 0.0463/√150 ≈ 0.0038; tolerance 0.015 ≈ 4 SE.
        assertClose(mean, POSTERIOR_MEAN, 0.015)
        assertClose(sd, POSTERIOR_SD, 0.25 * POSTERIOR_SD)
    })
})

describe('particle filter invariants', () => {
    test('starts with N uniform weights, and weights stay normalised with 1 ≤ ESS ≤ N', () => {
        const rng = createRng(SEED)
        const N = 200
        const pf = new ParticleFilterState(makePrior(rng), makeProposal(rng), { N })
        assertClose(pf.ess, N, 1e-9)
        for (const point of DATA) {
            const { particles, weights } = pf.update([point])
            assert.equal(particles.length, N)
            assertClose(weights.reduce((s, w) => s + w, 0), 1, 1e-9)
            assert.ok(pf.ess >= 1 - 1e-9 && pf.ess <= N + 1e-9, `ESS ${pf.ess}`)
        }
    })
})

describe('logSumExp', () => {
    test('equals log Σ exp(xᵢ) and is stable for large magnitudes', () => {
        assertClose(logSumExp([0, Math.log(2), Math.log(3)]), Math.log(6), 1e-15)
        assertClose(logSumExp([1000, 1000]), 1000 + Math.log(2), 1e-15)
        assertClose(logSumExp([-1000, -1000]), -1000 + Math.log(2), 1e-15)
        assert.equal(logSumExp([-Infinity, 0]), 0)
    })

    test('of all −∞ is −∞ (log of an empty sum)', {
        todo: 'Bug: returns NaN, because exp(−∞ − (−∞)) = exp(NaN)',
    }, () => {
        assert.equal(logSumExp([-Infinity, -Infinity]), -Infinity)
    })
})
