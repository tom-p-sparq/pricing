import { BaseDemandModel } from './base.js'

/**
 * Implements a log-logistic demand model.
 * This model is useful for representing demand where the conversion rate is a
 * function of the logarithm of the price, often providing a good fit for survival-type data.
 *
 * The conversion rate is given by the formula: logit C(p) = a + b*log(p),
 * where a and b are the intercept and gradient of the linear form for conversion
 * in logit-log space.
 */
export class LogLogisticDemandModel extends BaseDemandModel {
  /**
   * @param {{a: number, b: number}} model_params
   */
  constructor({ a, b }) {
    super({ a, b })
    /**
     * @protected
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
   * @returns {LogLogisticDemandModel} A new instance of the demand model.
   */
  static from_reference({ price, conversion, elasticity }) {
    LogLogisticDemandModel._check_reference(price, conversion, elasticity)
    const logprice = Math.log(price)
    const b = elasticity / (1 - conversion)
    const a = Math.log(conversion) - Math.log(1 - conversion) - b * logprice
    return new LogLogisticDemandModel({ a, b })
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
    const logit0 = Math.log(conversion0 / (1 - conversion0));
    const logit1 = Math.log(conversion1 / (1 - conversion1));
    const logprice0 = Math.log(price0);
    const logprice1 = Math.log(price1);
    const b = (logit1 - logit0) / (logprice1 - logprice0);
    const a = (logit0 * logprice1 - logit1 * logprice0) / (logprice1 - logprice0);
    return new LogLogisticDemandModel({ a, b });
  }

  /**
   * @override
   * @protected
   * @param {number} price The price for which to calculate the conversion rate.
   * @returns {number} The calculated conversion rate (before clamping).
   */
  _conversion(price) {
    if (price <= 0) return 1.0;
    const { a, b } = this.parameters
    const Z = a + b * Math.log(price)
    return 1 / (1 + Math.exp(-Z))
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
    const logprice = Math.log(price)
    return {
      conversion: {
        a: (1 - phi),
        b: (1 - phi) * logprice,
      },
      rejection: {
        a: -phi,
        b: -phi * logprice,
      }
    }
  }
}