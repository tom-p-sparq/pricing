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
   * @param {object} model_params
   * @param {number} model_params.p_shape The shape parameter of the log-logistic distribution.
   * @param {number} model_params.K The scale parameter (median) of the log-logistic distribution.
   */
  constructor({ p_shape, K }) {
    super()
    /**
     * The shape parameter of the log-logistic distribution.
     * @protected
     * @type {number}
     */
    this.p_shape = p_shape
    /**
     * The scale parameter (median) of the log-logistic distribution.
     * This is the price at which the conversion rate is exactly 0.5.
     * @protected
     * @type {number}
     */
    this.K = K
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
   * @returns {LogLogisticDemandModel} A new instance of the demand model.
   */
  static from_reference({ price, conversion, elasticity }) {
    LogLogisticDemandModel._check_reference(price, conversion, elasticity)
    const p_shape = -elasticity / (1 - conversion)
    const odds = conversion / (1 - conversion)
    const K = price * Math.pow(odds, 1 / p_shape)
    return new LogLogisticDemandModel({ p_shape, K })
  }

  /**
   * Creates a new model instance by interpolating between two points.
   * This method calculates the shape of the log-logistic demand curve that passes
   * through two given points (p0, c0) and (p1, c1), and then creates a new
   * `LogLogisticDemandModel` instance.
   * @override
   * @param {object} point0 An object representing the first point, with `price` and `conversion` properties.
   * @param {number} point0.price The price at the first point.
   * @param {number} point0.conversion The conversion rate at the first point.
   * @param {object} point1 An object representing the second point, with `price` and `conversion` properties.
   * @param {number} point1.price The price at the second point.
   * @param {number} point1.conversion The conversion rate at the second point.
   * @returns {LogLogisticDemandModel} A new instance of the demand model.
   */
  static interpolate({ price: price0, conversion: conversion0 }, { price: price1, conversion: conversion1 }) {
    const logPrice0 = Math.log(price0);
    const logPrice1 = Math.log(price1);
    const logit0 = Math.log(conversion0 / (1 - conversion0));
    const logit1 = Math.log(conversion1 / (1 - conversion1));
    const p_shape = -(logit1 - logit0) / (logPrice1 - logPrice0);
    const K = price0 * Math.pow(conversion0 / (1 - conversion0), 1 / p_shape);
    return new LogLogisticDemandModel({ p_shape , K });
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