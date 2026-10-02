import assert from 'node:assert/strict'

/**
 * Seed for every stochastic test. Fixed by default so the suite is reproducible;
 * override with `TEST_SEED=<n>` to check that tolerances are not tuned to one seed.
 */
export const SEED = Number(process.env.TEST_SEED ?? 20261002)

/**
 * Asserts `|actual − expected| ≤ tol · max(1, |expected|)` — relative for large
 * values, absolute near zero.
 * @param {number} actual
 * @param {number} expected
 * @param {number} tol
 * @param {string} [message]
 * @returns {void}
 */
export function assertClose(actual, expected, tol, message) {
    const scale = Math.max(1, Math.abs(expected))
    assert.ok(
        Math.abs(actual - expected) <= tol * scale,
        `${message ? message + ': ' : ''}expected ${expected}, got ${actual} (tol ${tol})`,
    )
}

/**
 * `n` evenly spaced points on `[lo, hi]`, endpoints included.
 * @param {number} lo
 * @param {number} hi
 * @param {number} n
 * @returns {number[]}
 */
export function linspace(lo, hi, n) {
    return Array.from({ length: n }, (_, i) => lo + (hi - lo) * i / (n - 1))
}
