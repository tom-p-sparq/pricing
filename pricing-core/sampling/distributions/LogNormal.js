import { BaseDistribution } from './base.js'
import { Normal } from './Normal.js'

export class LogNormal extends BaseDistribution {
  /**
   * Creates an instance of LogNormal distribution.
   * @param {number} mu - The mean of the underlying Normal distribution.
   * @param {number} sigma - The standard deviation of the underlying Normal distribution.
   */
  constructor(mu, sigma) {
    if (sigma <= 0) {
      throw new Error("Standard deviation (sigma) must be positive.");
    }
    super();
    this.parentDistribution = new Normal(mu, sigma);
    this.mu = mu;
    this.sigma = sigma
  }

  /**
   * Generates a random variate from the Log-Normal distribution.
   * @override
   * @param {function} rng - A random number generator function (defaults to Math.random).
   * @returns {number} A random variate.
   */
  sample(rng = Math.random) {
    const normalVariate = this.parentDistribution.sample(rng);
    return Math.exp(normalVariate);
  }

  /**
   * Computes the log probability density of the Log-Normal distribution at x.
   * @override
   * @param {number} x
   * @returns {number} The log probability density at x.
   */
  logPdf(x) {
    if (x <= 0) {
      return -Infinity;
    }
    const logX = Math.log(x);
    return this.parentDistribution.logPdf(logX);
  }
}