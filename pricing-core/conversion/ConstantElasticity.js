import { BaseDemandModel } from './base'

/**
 * Implements a constant elasticity demand model (also known as isoelastic).
 * In this model, the price elasticity of demand is constant regardless of the price.
 *
 * The conversion rate is given by the formula: C(p) = A * p^e,
 * where `e` is the constant price elasticity and `A` is a scaling constant derived
 * from a reference point (price, conversion).
 */
export class ConstantElasticityDemandModel extends BaseDemandModel {
  /**
   * @param {object} params
   * @param {number} params.price The reference price.
   * @param {number} params.elasticity The constant price elasticity of demand.
   * @param {number} [params.conversion=0.5] The conversion rate at the reference price.
   */
  constructor({ price, elasticity, conversion = 0.5 }) {
    super()
    /**
     * The constant price elasticity of demand (e).
     * @protected
     * @type {number}
     */
    this.elasticity_param = elasticity
    /**
     * The scaling constant (A) for the model.
     * @protected
     * @type {number}
     */
    this.A = conversion * Math.pow(price, -elasticity)
  }

  /**
   * @protected
   * @param {number} price The price for which to calculate the conversion rate.
   * @returns {number} The calculated conversion rate (before clamping).
   */
  _conversion(price) {
    if (price <= 0) return 1.0;
    return this.A * Math.pow(price, this.elasticity_param)
  }
}