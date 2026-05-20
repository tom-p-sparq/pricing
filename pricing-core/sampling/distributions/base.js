/**
 * @abstract
 * Base class for probability distributions.
 */
export class BaseDistribution {
  /**
   * Generates a random variate from the distribution.
   * @abstract
   * @returns {number} A random variate.
   */
  sample(rng = Math.random) {
    throw new Error("Method 'sample()' must be implemented in subclasses.");
  }

  /**
   * Computes the log probability density of the distribution at x.
   * @abstract
   * @param {number} x
   * @returns {number} The log probability density at x.
   */
  logPdf(x) {
    throw new Error("Method 'logPdf()' must be implemented in subclasses.");
  }
}