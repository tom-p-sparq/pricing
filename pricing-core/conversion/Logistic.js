import { BaseDemandModel } from './base.js'

/**
 * Implements a logistic (or logit) demand model parameterized by price elasticity.
 * The conversion rate is modeled as a logistic function of price, which provides
 * a more realistic "S-shaped" curve than a linear model.
 *
 * The model is defined by a reference point (p_ref, c_ref) and the price elasticity `e`
 * at that point. These are used to calculate the parameters `k` (steepness) and `p0`
 * (inflection point) for the logistic function: C(p) = 1 / (1 + exp(k * (p - p0))).
 */
export class LogisticDemandModel extends BaseDemandModel {
  /**
   * @param {object} params
   * @param {number} params.price The reference price (p_ref).
   * @param {number} params.elasticity The point price elasticity of demand at the reference price.
   * @param {number} [params.conversion=0.5] The conversion rate (c_ref) at the reference price.
   */
  constructor({ price, elasticity, conversion = 0.5 }) {
    super()
    if (price <= 0) {
      throw new Error('Price must be positive.')
    }
    if (elasticity >= 0) {
      throw new Error('Elasticity must be negative.')
    }
    if (conversion <= 0 || conversion >= 1) {
      throw new Error('Conversion must be strictly between 0 and 1.')
    }
    /**
     * The steepness parameter of the logistic function.
     * @protected
     * @type {number}
     */
    this.k = -elasticity / (price * (1 - conversion))
    const logit = Math.log(1 / conversion - 1)
    /**
     * The price at the inflection point of the logistic curve (where conversion is 0.5).
     * @protected
     * @type {number}
     */
    this.p0 = price - (logit / this.k)
  }

  /**
   * Calculates the conversion rate using the logistic function.
   * @protected
   * @param {number} price The price for which to calculate the conversion rate.
   * @returns {number} The calculated conversion rate (before clamping).
   */
  _conversion(price) {
    const X = this.k * (price - this.p0)
    return 1 / (1 + Math.exp(X))
  }
}