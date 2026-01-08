import { BaseDemandModel } from './base'

/**
 * Implements a linear demand model parameterized by price elasticity at a reference point.
 * The conversion rate is modeled as a linear function of price, defined by a known
 * conversion rate `c0` at a given price `p0`, and the price elasticity of demand `e`.
 *
 * The linear function is of the form: C(p) = c0 + b * (p - p0)
 * where the slope `b` is derived from elasticity: b = e * (c0 / p0).
 */
export class LinearDemandModel extends BaseDemandModel {
  /**
   * @param {object} params
   * @param {number} params.price The reference price (p0).
   * @param {number} params.elasticity The point price elasticity of demand at the reference price.
   * @param {number} [params.conversion=0.5] The conversion rate (c0) at the reference price.
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
    /** @protected @type {number} */
    this.p0 = price
    /** @protected @type {number} */
    this.c0 = conversion
    /** @protected @type {number} */
    this.b = elasticity * (conversion / price)
  }

  /**
   * Calculates the conversion rate using the point-slope form of a linear equation.
   * @protected
   * @param {number} price The price for which to calculate the conversion rate.
   * @returns {number} The calculated conversion rate (before clamping).
   */
  _conversion(price) {
    return this.c0 + this.b * (price - this.p0)
  }
}
