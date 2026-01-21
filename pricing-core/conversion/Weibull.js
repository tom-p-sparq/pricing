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
    const logInvC = Math.log(1 / conversion);
    const k = -elasticity / logInvC;
    const lambda = price / Math.pow(logInvC, 1 / k);

    return new WeibullDemandModel({ k, lambda });
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
    const logPrice0 = Math.log(price0);
    const logPrice1 = Math.log(price1)
    const cloglog0 = Math.log(-Math.log(conversion0));
    const cloglog1 = Math.log(-Math.log(conversion1));
    const k = (cloglog1 - cloglog0) / (logPrice1 - logPrice0)
    const lambda = price0 * Math.pow(-Math.log(conversion0), -1 / k)
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
      k: phi * Math.log(phi) * (Math.log(price / this.lambda)),
      lambda: -phi * Math.log(phi) * (this.k / this.lambda),
    }
  }
}