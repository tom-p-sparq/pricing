import { BaseStep } from './base.js';
import lognormal from '@stdlib/random-base-lognormal'
import logpdf from '@stdlib/stats-base-dists-lognormal-logpdf'


export class LogNormalStep extends BaseStep {
  /**
   * Creates an instance of LogNormalStep.
   * @param {{sigma: number}} params
   */
  constructor({ sigma }, rng = Math.random) {
    if (sigma <= 0) {
      throw new Error("Standard deviation (sigma) must be positive.");
    }
    super();
    this._sigma = sigma;
    this.factory = lognormal.factory({prng: rng})
  }

  /**
   * Generates a random variate from a log-normal distribution.
   * The underlying normal distribution is centered at ln(xCurrent).
   * @override
   * @param {number} xCurrent The current value to step from.
   * @returns {number} A random variate.
   */
  sample(xCurrent) {
    return this.factory(Math.log(xCurrent), this._sigma);
  }

  /**
   * Computes the log probability density of the log-normal step distribution at x, stepping from xCurrent.
   * @override
   * @param {number} x The value being stepped to.
   * @param {number} xCurrent The current value being stepped from.
   * @returns {number} The log probability density at x.
   */
  logPdf(x, xCurrent) {
    return logpdf(x, Math.log(xCurrent), this._sigma);
  }
}
