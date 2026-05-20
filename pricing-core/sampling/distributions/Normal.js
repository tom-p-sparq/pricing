import { BaseDistribution } from './base.js';

export class Normal extends BaseDistribution {
  /**
   * Creates an instance of Normal distribution.
   * @param {number} mu - The mean of the distribution.
   * @param {number} sigma - The standard deviation of the distribution.
   */
  constructor(mu, sigma) {
    if (sigma <= 0) {
      throw new Error("Standard deviation (sigma) must be positive.");
    }
    super();
    this.mu = mu;
    this.sigma = sigma;
  }

  /**
   * Generates a random variate from the Normal distribution using the Box-Muller transform.
   * @override
   * @param {function} rng - A random number generator function (defaults to Math.random).
   * @returns {number} A random variate.
   */
  sample(rng = Math.random) {
    let u = 0, v = 0;
    while (u === 0) u = rng(); // Converting [0,1) to (0,1)
    while (v === 0) v = rng();
    const z = Math.sqrt(-2.0 * Math.log(u)) * Math.cos(2.0 * Math.PI * v);
    return this.mu + this.sigma * z;
  }

  /**
   * Computes the log probability density of the Normal distribution at x.
   * @override
   * @param {number} x
   * @returns {number} The log probability density at x.
   */
  logPdf(x) {
    const z = (x - this.mu) / this.sigma;
    return -0.5 * (Math.log(2 * Math.PI) + 2 * Math.log(this.sigma) + z * z);
  }
}