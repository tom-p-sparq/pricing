/**
 * @abstract
 * Base class for demand models.
 */
export class BaseDemandModel {
  /**
   * @param {{[paramName: string]: number}} parameters Model parameters.
   */
  constructor(parameters) {
    /**
     * @type {{[paramName: string]: number}}
     */
    this.parameters = parameters;
  }

  /**
   * The number of parameters in the model (degrees of freedom).
   * @type {number}
   */
  get dof() {
    return Object.keys(this.parameters).length;
  }

  /**
   * The names of the model parameters.
   * @type {string[]}
   */
  get paramNames() {
    return Object.keys(this.parameters);
  }

  /**
   * The values of the model parameters.
   * @type {number[]}
   */
  get paramValues() {
    return Object.values(this.parameters);
  }

  /**
   * The [name, value] pairs of the model parameters.
   * @type {[string, number][]}
   */
  get paramEntries() {
    return Object.entries(this.parameters);
  }


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
   * Calculates the point price elasticity of conversion at a given price.
   * Returns 0 when the model is at a clamped boundary (raw conversion ≤ 0 or ≥ 1).
   * @param {number} price
   * @returns {number} d(log C)/d(log p)
   */
  elasticity(price) {
    const raw = this._conversion(price)
    if (raw <= 0 || raw >= 1) return 0
    return this._elasticity(price)
  }

  /**
   * @abstract
   * @protected
   * @param {number} price
   * @returns {number}
   */
  _elasticity(price) {
    throw new Error("Define the price elasticity at this price in `_elasticity`")
  }

  /**
   * @abstract
   * @param {number} price The price at which to calculate the gradients.
   * @returns {{conversion: Record<string, number>, rejection: Record<string, number>}} 
   *        The gradient of log of conversion probability and rejection probability
   *        w.r.t the model parameters in the constructor.
   */
  gradLog(price) {
    throw new Error("Define the gradient of the logarithm of conversion/rejection probabilities at this price in `_gradient`")
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
  static fromReference({ price, conversion, elasticity }) {
    throw new Error("Define the constructor of the model parameterised by a conversion and elasticity at a reference price in `fromReference`")
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
   * Creates a new model instance representing a flat (price-independent) conversion rate.
   * This is a factory method.
   * @abstract
   * @param {number} averageConversion The constant conversion rate, strictly between 0 and 1.
   * @returns {BaseDemandModel} A new instance of the demand model.
   */
  static fromFlat(averageConversion) {
    throw new Error("Define the constructor of the flat model parameterised by average conversion in `fromFlat`")
  }

  /**
   * Checks the validity of parameters for creating a model from a reference point.
   * @protected
   * @param {number} price The reference price. Must be positive.
   * @param {number} conversion The conversion rate at the reference price. Must be strictly between 0 and 1.
   * @param {number} elasticity The point price elasticity of demand at the reference price.
   * @throws {Error} If the price is not positive.
   * @throws {Error} If the conversion is not strictly between 0 and 1.
   */
  static _checkReference(price, conversion, elasticity) {
    if (price <= 0) {
      throw new Error('Price must be positive.')
    }
    if (conversion <= 0 || conversion >= 1) {
      throw new Error('Conversion must be strictly between 0 and 1.')
    }
  }
}