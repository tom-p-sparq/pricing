import { BaseDemandModel } from './base.js'

/**
 * Implements a log-logistic demand model.
 * This model is useful for representing demand where the conversion rate is a
 * function of the logarithm of the price, often providing a good fit for survival-type data.
 *
 * The conversion rate is given by the formula: C(p) = 1 / (1 + (p/K)^p_shape),
 * where `p_shape` is the shape parameter and `K` is the scale parameter (the median,
 * or the price at which conversion is 0.5).
 */
export class LogLogisticDemandModel extends BaseDemandModel {
  /**
   * @param {object} params
   * @param {number} params.price The reference price.
   * @param {number} params.elasticity The point price elasticity of demand at the reference price.
   * @param {number} [params.conversion=0.5] The conversion rate at the reference price.
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
     * The shape parameter of the log-logistic distribution.
     * @protected
     * @type {number}
     */
    this.p_shape = -elasticity / (1 - conversion)
    const odds = conversion / (1 - conversion)
    /**
     * The scale parameter (median) of the log-logistic distribution.
     * This is the price at which the conversion rate is exactly 0.5.
     * @protected
     * @type {number}
     */
    this.K = price * Math.pow(odds, 1 / this.p_shape)
  }

  /**
   * @protected
   * @param {number} price The price for which to calculate the conversion rate.
   * @returns {number} The calculated conversion rate (before clamping).
   */
  _conversion(price) {
    if (price <= 0) return 1.0;
    const X = Math.pow(price / this.K, this.p_shape)
    return 1 / (1 + X)
  }
}