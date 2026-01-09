import { BaseDemandModel } from './base.js'

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
   * @param {object} model_params
   * @param {number} model_params.k The shape parameter (k) of the Weibull distribution.
   * @param {number} model_params.lambda The scale parameter (lambda) of the Weibull distribution.
   */
  constructor({ k, lambda }) {
    super();
    /**
     * The shape parameter (k) of the Weibull distribution.
     * @protected
     * @type {number}
     */
    this.k = k;

    /**
     * The scale parameter (lambda) of the Weibull distribution.
     * @protected
     * @type {number}
     */
    this.lambda = lambda;
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
   * @returns {WeibullDemandModel} A new instance of the demand model.
   */
  static from_reference({ price, conversion, elasticity }) {
    WeibullDemandModel._check_reference(price, conversion, elasticity)
    const logInvC = Math.log(1 / conversion);
    const k = -elasticity / logInvC;
    const lambda = price / Math.pow(logInvC, 1 / k);

    return new WeibullDemandModel({ k, lambda });
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