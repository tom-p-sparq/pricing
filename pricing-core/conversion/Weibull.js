import { BaseDemandModel } from './base.js'

/**
 * Implements a demand model based on the Weibull distribution's survival function.
 * This model is highly flexible and can represent various shapes of demand curves.
 *
 * The conversion rate is given by the Weibull survival function: log(-log(C(p))) = a + b*log(p),
 * where `a` and `b` are the intercept and gradient of a straight line in cloglog-log space.
 */
export class WeibullDemandModel extends BaseDemandModel {
  /**
   * @param {{a: number, b: number}} model_params
   */
  constructor({ a, b }) {
    super({ a, b });
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
   * @returns {WeibullDemandModel} A new instance of the demand model.
   */
  static from_reference({ price, conversion, elasticity }) {
    WeibullDemandModel._check_reference(price, conversion, elasticity)
    const b = elasticity / Math.log(conversion)
    const a = Math.log(-Math.log(conversion)) - b * Math.log(price)
    return new WeibullDemandModel({ a, b });
  }

  /**
   * Creates a new model instance by interpolating between two points.
   * This method calculates the shape of the Weibull demand curve that passes
   * through two given points (p0, c0) and (p1, c1), and then creates a new
   * `WeibullDemandModel` instance.
   * @override
   * @param {object} point0 An object representing the first point, with `price` and `conversion` properties.
   * @param {number} point0.price The price at the first point.
   * @param {number} point0.conversion The conversion rate at the first point.
   * @param {object} point1 An object representing the second point, with `price` and `conversion` properties.
   * @param {number} point1.price The price at the second point.
   * @param {number} point1.conversion The conversion rate at the second point.
   * @returns {WeibullDemandModel} A new instance of the demand model.
   */
  static interpolate({ price: price0, conversion: conversion0 }, { price: price1, conversion: conversion1 }) {
    const logprice0 = Math.log(price0);
    const logprice1 = Math.log(price1)
    const cloglog0 = Math.log(-Math.log(conversion0));
    const cloglog1 = Math.log(-Math.log(conversion1));
    const b = (cloglog1 - cloglog0) / (logprice1 - logprice0);
    const a = (cloglog0 * logprice1 - cloglog1 * logprice0) / (logprice1 - logprice0);
    return new WeibullDemandModel({ a, b });
  }

  /**
   * Creates a flat model with constant conversion rate equal to `averageConversion`.
   * @override
   * @param {number} averageConversion The constant conversion rate, strictly between 0 and 1.
   * @returns {WeibullDemandModel}
   */
  static from_flat(averageConversion) {
    return new WeibullDemandModel({ a: Math.log(-Math.log(averageConversion)), b: 0 });
  }

  /**
   * @protected
   * @param {number} price The price for which to calculate the conversion rate.
   * @returns {number} The calculated conversion rate (before clamping).
   */
  _conversion(price) {
    if (price <= 0) return 1.0;
    const { a, b } = this.parameters;
    const Z = a + b*Math.log(price)
    return Math.exp(-Math.exp(Z));
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
    const logphi = Math.log(phi + 1e-9)
    const logprice = Math.log(price + 1e-9)
    return {
      conversion: {
        a: logphi,
        b: logphi * logprice,
      },
      rejection: {
        a: -phi * logphi / (1 + 1e-9 - phi),
        b: -phi * logphi * logprice / (1 + 1e-9 - phi),
      }
    }
  }
}