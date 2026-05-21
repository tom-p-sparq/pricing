import { BaseStep } from './base.js';
import { Normal } from '../distributions/Normal.js'

export class NormalStep extends BaseStep {
  /**
   * Creates an instance of NormalStep.
   * @param {{mu?: number, sigma: number}} params
   */
  constructor({ mu = 0, sigma }) {
    if (sigma <= 0) {
      throw new Error("Standard deviation (sigma) must be positive.");
    }
    super();
    this.parentDistribution = new Normal({ mu, sigma });
    this.mu = mu;
    this.sigma = sigma;
  }

  /**
   * Generates a random variate from a normal distribution centered at xCurrent.
   * @override
   * @param {number} xCurrent The current value to step from.
   * @param {function} rng A random number generator function (defaults to Math.random).
   * @returns {number} A random variate.
   */
  sample(xCurrent, rng = Math.random) {
    const normalVariate = this.parentDistribution.sample(rng);
    return xCurrent + normalVariate;
  }

  /**
   * Computes the log probability density of the normal step distribution at x, stepping from xCurrent.
   * @override
   * @param {number} x The value being stepped to.
   * @param {number} xCurrent The current value being stepped from.
   * @returns {number} The log probability density at x.
   */
  logPdf(x, xCurrent) {
    const dx = x - xCurrent;
    return this.parentDistribution.logPdf(dx);
  }
}
