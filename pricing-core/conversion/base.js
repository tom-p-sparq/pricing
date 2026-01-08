/**
 * @abstract
 * Base class for demand models.
 */
export class BaseDemandModel {
  /**
   * Calculates the conversion rate for a given price, clamped between 0 and 1.
   * @param {number} price The price at which to calculate the conversion rate.
   * @returns {number} The conversion rate, a value between 0 and 1.
   */
  conversion(price) {
    const unclipped = this._conversion(price)
    return Math.min(Math.max(unclipped, 0), 1)
  }

  /**
   * @abstract
   * @protected
   * @param {number} price The price at which to calculate the conversion rate.
   * @returns {number} The calculated conversion rate (before clamping).
   * @throws {Error} Must be implemented by subclasses.
   */
  _conversion(price) {
    throw new Error("Define the conversion rate at this price in `_conversion`")
  }
}