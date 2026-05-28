import { BaseDemandModel } from './base.js'

/**
 * Implements a logistic (or logit) demand model parameterized by price elasticity.
 * The conversion rate is modeled as a logistic function of price, which provides
 * a more realistic "S-shaped" curve than a linear model.
 *
 * The model is defined by a straight line intercept and gradient (a,  b) for the logit
 * of conversion. Conversion is the linear form Z=a+b*price put through the sigmoid form.
*/
export class LogisticDemandModel extends BaseDemandModel {
  /**
   * @param {{a: number, b: number}} model_params
   */
  constructor({ a, b }) {
    super({ a, b })
    /**
     * @type {{a: number, b: number}}
     */
    this.parameters;
  }

  /**
   * Creates a new model instance from a reference point.
   * @override
   * @param {object} params
   * @param {number} params.price The reference price.
   * @param {number} params.conversion The conversion rate at the reference price.
   * @param {number} params.elasticity The point price elasticity of demand at the reference price.
   * @returns {LogisticDemandModel} A new instance of the demand model.
   */
  static fromReference({ price, conversion, elasticity }) {
    LogisticDemandModel._checkReference(price, conversion, elasticity)
    const b = elasticity / ((1 - conversion) * price)
    const a = Math.log(conversion) - Math.log(1 - conversion) - b * price
    return new LogisticDemandModel({ a, b })
  }

  /**
   * Creates a new model instance by interpolating between two points.
   * This method calculates the shape of the logistic demand curve that passes
   * through two given points (p0, c0) and (p1, c1), and then creates a new
   * `LogisticDemandModel` instance.
   * @override
   * @param {object} point0 An object representing the first point, with `price` and `conversion` properties.
   * @param {number} point0.price The price at the first point.
   * @param {number} point0.conversion The conversion rate at the first point.
   * @param {object} point1 An object representing the second point, with `price` and `conversion` properties.
   * @param {number} point1.price The price at the second point.
   * @param {number} point1.conversion The conversion rate at the second point.
   * @returns {LogisticDemandModel} A new instance of the demand model.
   */
  static interpolate({ price: price0, conversion: conversion0 }, { price: price1, conversion: conversion1 }) {
    const logit0 = Math.log(conversion0 / (1 - conversion0));
    const logit1 = Math.log(conversion1 / (1 - conversion1));
    const b = (logit1 - logit0) / (price1 - price0);
    const a = (logit0 * price1 - logit1 * price0) / (price1 - price0);
    return new LogisticDemandModel({ a, b });
  }

  /**
   * Creates a flat model with constant conversion rate equal to `averageConversion`.
   * @override
   * @param {number} averageConversion The constant conversion rate, strictly between 0 and 1.
   * @returns {LogisticDemandModel}
   */
  static fromFlat(averageConversion) {
    return new LogisticDemandModel({ a: Math.log(averageConversion / (1 - averageConversion)), b: 0 });
  }

  /**
   * Calculates the conversion rate using the logistic function.
   * @protected
   * @param {number} price The price for which to calculate the conversion rate.
   * @returns {number} The calculated conversion rate (before clamping).
   */
  _conversion(price) {
    const { a, b } = this.parameters
    const Z = a + b * price
    return 1 / (1 + Math.exp(-Z))
  }

  /**
   * @override
   * @protected
   * @param {number} price
   * @returns {number}
   */
  _elasticity(price) {
    const { b } = this.parameters
    return b * price * (1 - this._conversion(price))
  }

  /**
   * Calculate gradients with respect to the model parameters.
   * @override
   * @param {number} price The price at which to calculate the gradients.
   * @returns {{conversion: {a: number, b: number}, rejection:  {a: number, b: number}}}
   *        The gradient of log of conversion probability and rejection probability
   *        w.r.t the model parameters in the constructor.
   */
  gradLog(price) {
    const phi = this._conversion(price)
    return {
      conversion: {
        a: (1 - phi),
        b: (1 - phi) * price,
      },
      rejection: {
        a: -phi,
        b: -phi * price,
      }
    }
  }
}