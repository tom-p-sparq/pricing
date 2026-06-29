import { BaseObjectiveFunction } from './objectiveFunctions/base.js'
import { BaseDemandModel } from '../demand/base.js'

const CGOLD = 0.3819660112501051  // (3 − √5) / 2; golden section complement
const ZEPS = 1e-10

/**
 * Brent's method for minimising a scalar function on a closed interval.
 * Combines golden-section search with parabolic interpolation: takes parabolic
 * steps when they are well-conditioned and shrink the bracket, falls back to
 * golden section otherwise. Assumes the minimum is interior to [a, b].
 *
 * @param {(x: number) => number} f
 * @param {number} a
 * @param {number} b
 * @param {number} tol Relative tolerance (convergence when bracket < 2·tol·|x| + ε)
 * @param {number} maxIter
 * @returns {number} x minimising f on [a, b]
 */
function brentMinimise(f, a, b, tol, maxIter) {
    // x: current best point; w: second-best; v: third-best (or previous w)
    // The bracket [a, b] always contains x, and shrinks each iteration.
    let x = a + CGOLD * (b - a)
    let w = x, v = x
    let fx = f(x), fw = fx, fv = fx
    // d: step taken this iteration; e: step taken the iteration before last.
    // e is used to gate whether parabolic interpolation is trusted (see below).
    let d = 0.0, e = 0.0

    for (let iter = 0; iter < maxIter; iter++) {
        const xm = 0.5 * (a + b)
        const tol1 = tol * Math.abs(x) + ZEPS
        const tol2 = 2.0 * tol1

        // Converged when x is within tol2 of the bracket midpoint.
        if (Math.abs(x - xm) <= tol2 - 0.5 * (b - a)) break

        if (Math.abs(e) > tol1) {
            // Attempt parabolic interpolation through (v, fv), (w, fw), (x, fx).
            // p/q is the parabolic minimiser offset from x, derived by fitting a
            // quadratic to the three points in standard divided-difference form.
            let r = (x - w) * (fx - fv)
            let q = (x - v) * (fx - fw)
            let p = (x - v) * q - (x - w) * r
            q = 2.0 * (q - r)
            if (q > 0.0) p = -p   // keep q positive; flip sign of p instead
            q = Math.abs(q)
            const etemp = e
            e = d  // save current step before potentially overwriting d
            // Reject the parabolic step if it:
            //   (a) is larger than half the previous excursion (not converging fast enough), or
            //   (b) would land outside the current bracket [a, b].
            // Any rejection falls back to golden section below.
            if (Math.abs(p) >= Math.abs(0.5 * q * etemp) || p <= q * (a - x) || p >= q * (b - x)) {
                // Golden section into the larger sub-interval.
                e = x >= xm ? a - x : b - x
                d = CGOLD * e
            } else {
                d = p / q
                const u = x + d
                // Don't evaluate within tol2 of a bracket endpoint — too close to boundary.
                if (u - a < tol2 || b - u < tol2)
                    d = xm > x ? tol1 : -tol1
            }
        } else {
            // Previous step was tiny: parabolic interpolation is unreliable near a flat
            // region, so fall straight back to golden section.
            e = x >= xm ? a - x : b - x
            d = CGOLD * e
        }

        // Ensure the trial point moves by at least tol1 (avoid re-evaluating x itself).
        const u = x + (Math.abs(d) >= tol1 ? d : d > 0 ? tol1 : -tol1)
        const fu = f(u)

        if (fu <= fx) {
            // u is the new best: tighten the bracket on the far side of x, then
            // demote x → w → v and promote u → x.
            if (u >= x) a = x; else b = x
            v = w; fv = fw
            w = x; fw = fx
            x = u; fx = fu
        } else {
            // u is worse than x: tighten the bracket on u's side, then update
            // the second- and third-best trackers if u beats them.
            if (u < x) a = u; else b = u
            if (fu <= fw || w === x) {
                v = w; fv = fw
                w = u; fw = fu
            } else if (fu <= fv || v === x || v === w) {
                v = u; fv = fu
            }
        }
    }

    return x
}

/**
 * Find the price maximising `objective.J` over the interval `[pMin, pMax]`
 * using Brent's method.
 *
 * The objective is assumed to be **unimodal** on `[pMin, pMax]` with an interior
 * maximum — a property that holds for all standard objectives (e.g. ExpectedRevenue,
 * CARA, ERM) given a downward-sloping conversion curve. If the objective is
 * monotone on the interval, the result will be near the appropriate boundary.
 *
 * @param {BaseObjectiveFunction} objective
 * @param {BaseDemandModel | {model: BaseDemandModel, logWeight: number}[]} demandModel
 * @param {number} pMin Lower bound on price (should be > cost for positive margin)
 * @param {number} pMax Upper bound on price
 * @param {Object} [options]
 * @param {number} [options.tol=1e-8] Relative convergence tolerance
 * @param {number} [options.maxIter=500] Maximum Brent iterations
 * @returns {number} Optimal price
 */
export function optimisePrice(objective, demandModel, pMin, pMax, { tol = 1e-8, maxIter = 500 } = {}) {
    return brentMinimise(price => -objective.J(demandModel, price), pMin, pMax, tol, maxIter)
}
