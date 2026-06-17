/**
 * @abstract
 * Base class for (conditional) step distributions.
 */
export class BaseStep {
  /**
   * Generates a random variate from the distribution centred on a given value.
   * @abstract
   * @param {number} xCurrent The current value to step from
   * @returns {number} A random variate.
   */
  sample(xCurrent) {
    throw new Error("Method 'sample(xCurrent)' must be implemented in subclasses.");
  }

  /**
   * Computes the log probability density of the step distribution at x, stepping from xCurrent.
   * @abstract
   * @param {number} x The value being stepped to
   * @param {number} xCurrent The current value being stepped from
   * @returns {number} The log probability density at x.
   */
  logPdf(x, xCurrent) {
    throw new Error("Method 'logPdf(x, xCurrent)' must be implemented in subclasses.");
  }
}