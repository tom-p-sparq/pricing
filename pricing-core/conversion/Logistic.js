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
   * Creates a new model instance from a reference point.
   * @override
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
    const k = -(logit1 - logit0) / (price1 - price0);
    const p0 = (price0 * logit1 - price1 * logit0) / (logit1 - logit0);
    return new LogisticDemandModel({ k, p0 });
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

  /**
   * Calculates the gradient of conversion probability w.r.t. constructor parameters.
   * @override
   * @protected
   * @param {number} price The price at which to calculate the gradient of the conversion probability.
   * @returns {object} The gradient of conversion probability w.r.t the model parameters in the constructor
   */
  _gradient(price) {
    const phi = this._conversion(price)
    return {
      k: -phi * (1 - phi) * (price - this.p0),
      p0: phi * (1 - phi) * this.k,
    }
  }
}