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
   * @param {object} model_params
   * @param {number} model_params.k The steepness parameter of the logistic function.
   * @param {number} model_params.p0 The price at the inflection point of the logistic curve.
   */
  constructor({ k, p0 }) {
    super()
    /**
     * The steepness parameter of the logistic function.
     * @protected
     * @type {number}
     */
    this.k = k
    /**
     * The price at the inflection point of the logistic curve (where conversion is 0.5).
     * @protected
     * @type {number}
     */
    this.p0 = p0
  }

  /**
   * @override
   */
  /**
   * Creates a new model instance from a reference point.
   * @param {object} params
   * @param {number} params.price The reference price.
   * @param {number} params.conversion The conversion rate at the reference price.
   * @param {number} params.elasticity The point price elasticity of demand at the reference price.
   * @returns {LogisticDemandModel} A new instance of the demand model.
   */
  static from_reference({ price, conversion, elasticity }) {
    LogisticDemandModel._check_reference(price, conversion, elasticity)
    const k = -elasticity / (price * (1 - conversion))
    const logit = Math.log(1 / conversion - 1)
    const p0 = price - (logit / k)
    return new LogisticDemandModel({ k, p0 })
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