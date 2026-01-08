import { BaseDemandModel } from './base'

/**
 * Implements a demand model based on the Weibull distribution's survival function.
 * This model is highly flexible and can represent various shapes of demand curves.
 *
 * The conversion rate is given by the Weibull survival function: C(p) = exp(-(p/lambda)^k),
 * where `k` is the shape parameter and `lambda` is the scale parameter. These are
 * calculated from a reference point (price, conversion) and the elasticity at that point.
 */
export class WeibullDemandModel extends BaseDemandModel {
  /**
   * @param {object} params
   * @param {number} params.price The reference price.
   * @param {number} params.elasticity The point price elasticity of demand at the reference price.
   * @param {number} [params.conversion=0.5] The conversion rate at the reference price.
   */
  constructor({ price, elasticity, conversion = 0.5 }) {
    super();
    if (price <= 0) {
      throw new Error('Price must be positive.')
    }
    if (elasticity >= 0) {
      throw new Error('Elasticity must be negative.')
    }
    if (conversion <= 0 || conversion >= 1) {
      throw new Error('Conversion must be strictly between 0 and 1.')
    }

    const logInvC = Math.log(1 / conversion);
    /**
     * The shape parameter (k) of the Weibull distribution.
     * @protected
     * @type {number}
     */
    this.k = -elasticity / logInvC;

    /**
     * The scale parameter (lambda) of the Weibull distribution.
     * @protected
     * @type {number}
     */
    this.lambda = price / Math.pow(logInvC, 1 / this.k);
  }

  /**
   * @protected
   * @param {number} price The price for which to calculate the conversion rate.
   * @returns {number} The calculated conversion rate (before clamping).
   */
  _conversion(price) {
    if (price <= 0) return 1.0;

    return Math.exp(-Math.pow(price / this.lambda, this.k));
  }
}