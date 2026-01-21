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

  /**
   * @abstract
   * @protected
   * @param {number} price The price at which to calculate the gradient of the conversion probability.
   * @returns {object} The gradient of conversion probability w.r.t the model parameters in the constructor.
   */
  _gradient(price) {
    throw new Error("Define the gradient of the conversion rate at this price in `_gradient`")
  }

  /**
   * Creates a new model instance from a reference point.
   * This is a factory method.
   * @abstract
   * @param {object} params
   * @param {number} params.price The reference price.
   * @param {number} params.elasticity The point price elasticity of demand at the reference price.
   * @param {number} params.conversion The conversion rate at the reference price.
   * @returns {BaseDemandModel} A new instance of the demand model.
   */
  static from_reference({ price, conversion, elasticity }) {
    throw new Error("Define the constructor of the model parameterised by a conversion and elasticity at a reference price in `from_reference`")
  }

  /**
   * Creates a new model instance by interpolating between two points.
   * This is a factory method.
   * @abstract
   * @param {object} point0 An object representing the first point, with `price` and `conversion` properties.
   * @param {number} point0.price The price at the first point.
   * @param {number} point0.conversion The conversion rate at the first point.
   * @param {object} point1 An object representing the second point, with `price` and `conversion` properties.
   * @param {number} point1.price The price at the second point.
   * @param {number} point1.conversion The conversion rate at the second point.
   * @returns {BaseDemandModel} A new instance of the demand model.
   */
  static interpolate(point0, point1) {
    throw new Error("Define the constructor of the model parameterised by two points in `interpolate`")
  }

  /**
   * Checks the validity of parameters for creating a model from a reference point.
   * @protected
   * @param {number} price The reference price. Must be positive.
   * @param {number} conversion The conversion rate at the reference price. Must be strictly between 0 and 1.
   * @param {number} elasticity The point price elasticity of demand at the reference price. Must be negative.
   * @throws {Error} If the price is not positive.
   * @throws {Error} If the elasticity is not negative.
   * @throws {Error} If the conversion is not strictly between 0 and 1.
   */
  static _check_reference(price, conversion, elasticity) {
    if (price <= 0) {
      throw new Error('Price must be positive.')
    }
    if (elasticity >= 0) {
      throw new Error('Elasticity must be negative.')
    }
    if (conversion <= 0 || conversion >= 1) {
      throw new Error('Conversion must be strictly between 0 and 1.')
    }
  }
}