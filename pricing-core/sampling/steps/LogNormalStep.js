import { BaseStep } from './base.js';
import { Normal } from '../distributions/Normal.js'

export class LogNormalStep extends BaseStep {
  /**
   * Creates an instance of LogNormalStep.
   * @param {number} mu Any bias in the underlying normal distribution (default value 0)
   * @param {number} sigma The standard deviation of the underlying normal distribution.
   */
  constructor(mu = 0, sigma) {
    if (sigma <= 0) {
      throw new Error("Standard deviation (sigma) must be positive.");
    }
    super();
    this.parentDistribution = new Normal(mu, sigma);
    this.mu = mu;
    this.sigma = sigma;
  }

  /**
   * Generates a random variate from a log-normal distribution.
   * The underlying normal distribution is centered at ln(xCurrent) + mu.
   * @override
   * @param {number} xCurrent The current value to step from.
   * @param {function} rng A random number generator function (defaults to Math.random).
   * @returns {number} A random variate.
   */
  sample(xCurrent, rng = Math.random) {
    const normalVariate = this.parentDistribution.sample(rng);
    return xCurrent * Math.exp(normalVariate);
  }

  /**
   * Computes the log probability density of the log-normal step distribution at x, stepping from xCurrent.
   * @override
   * @param {number} x The value being stepped to.
   * @param {number} xCurrent The current value being stepped from.
   * @returns {number} The log probability density at x.
   */
  logPdf(x, xCurrent) {
    // If different signs, return -Infinity
    if (x * xCurrent < 0) {
      return -Infinity;
    }
    const dx = Math.log(x / xCurrent);
    return this.parentDistribution.logPdf(dx);
  }
}
