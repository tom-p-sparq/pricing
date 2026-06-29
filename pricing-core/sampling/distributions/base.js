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
  sample() {
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

  /**
   * Computes the quantile (inverse CDF) of the distribution at probability p.
   * @abstract
   * @param {number} p A probability in [0, 1].
   * @returns {number} The quantile at p.
   */
  quantile(p) {
    throw new Error("Method 'quantile()' must be implemented in subclasses.");
  }
}