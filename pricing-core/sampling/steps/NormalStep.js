import { BaseStep } from './base.js';
import { normal as normalRandom } from '@stdlib/random-base'
import { normal as normalDists } from '@stdlib/stats-base-dists'

export class NormalStep extends BaseStep {
  /**
   * Creates an instance of NormalStep.
   * @param {{sigma: number}} params
   */
  constructor({ sigma }, rng = Math.random) {
    if (sigma <= 0) {
      throw new Error("Standard deviation (sigma) must be positive.");
    }
    super();
    this._sigma = sigma;
    this.factory = normalRandom.factory({prng: rng})
  }

  /**
   * Generates a random variate from a normal distribution centered at xCurrent.
   * @override
   * @param {number} xCurrent The current value to step from.
   * @returns {number} A random variate.
   */
  sample(xCurrent) {
    return this.factory(xCurrent, this._sigma)
  }

  /**
   * Computes the log probability density of the normal step distribution at x, stepping from xCurrent.
   * @override
   * @param {number} x The value being stepped to.
   * @param {number} xCurrent The current value being stepped from.
   * @returns {number} The log probability density at x.
   */
  logPdf(x, xCurrent) {
    return normalDists.logpdf(x, xCurrent, this._sigma)
  }
}
