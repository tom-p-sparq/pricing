import { BaseConversionModel } from './base.js'

/**
 * Implements a constant elasticity conversion model (also known as isoelastic).
 * In this model, the price elasticity of conversion is constant regardless of the price.
 *
 * The conversion rate is given by the formula: log(C(p)) = a + b*log(p),
 * where `a` and `b` are the intercept and gradient of a straight line in log-log space.
 */
export class ConstantElasticityConversionModel extends BaseConversionModel {
  /**
   * @param {{a: number, b: number}} model_params
   */
  constructor({ a, b }) {
    super({ a, b })
    /**
     * The constant price elasticity of conversion (e).
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
   * @param {number} params.elasticity The point price elasticity of conversion at the reference price.
   * @returns {ConstantElasticityConversionModel} A new instance of the conversion model.
   */
  static fromReference({ price, conversion, elasticity }) {
    ConstantElasticityConversionModel._checkReference(price, conversion, elasticity)
    const b = elasticity
    const a = Math.log(conversion) - b * Math.log(price)
    return new ConstantElasticityConversionModel({ a, b })
  }

  /**
   * Creates a new model instance by interpolating between two points.
   * This method calculates the shape of the constant elasticity conversion curve that passes
   * through two given points (p0, c0) and (p1, c1), and then creates a new
   * `ConstantElasticityConversionModel` instance.
   * @override
   * @param {object} point0 An object representing the first point, with `price` and `conversion` properties.
   * @param {number} point0.price The price at the first point.
   * @param {number} point0.conversion The conversion rate at the first point.
   * @param {object} point1 An object representing the second point, with `price` and `conversion` properties.
   * @param {number} point1.price The price at the second point.
   * @param {number} point1.conversion The conversion rate at the second point.
   * @returns {ConstantElasticityConversionModel} A new instance of the conversion model.
   */
  static interpolate({ price: price0, conversion: conversion0 }, { price: price1, conversion: conversion1 }) {
    const logPrice0 = Math.log(price0);
    const logPrice1 = Math.log(price1)
    const logConv0 = Math.log(conversion0);
    const logConv1 = Math.log(conversion1);
    const b = (logConv1 - logConv0) / (logPrice1 - logPrice0);
    const a = (logConv0 * logPrice1 - logConv1 * logPrice0) / (logPrice1 - logPrice0)
    return new ConstantElasticityConversionModel({ a, b });
  }

  /**
   * Creates a flat model with constant conversion rate equal to `averageConversion`.
   * @override
   * @param {number} averageConversion The constant conversion rate, strictly between 0 and 1.
   * @returns {ConstantElasticityConversionModel}
   */
  static fromFlat(averageConversion) {
    return new ConstantElasticityConversionModel({ a: Math.log(averageConversion), b: 0 });
  }

  /**
   * @protected
   * @param {number} price The price for which to calculate the conversion rate.
   * @returns {number} The calculated conversion rate (before clamping).
   */
  _conversion(price) {
    if (price <= 0) return 1.0;
    const { a, b } = this.parameters
    const Z = a + b * Math.log(price)
    return Math.exp(Z);
  }

  /**
   * @override
   * @protected
   * @param {number} _price
   * @returns {number}
   */
  _elasticity(_price) {
    return this.parameters.b
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
    const phi = Math.max(1e-9, Math.min(1 - 1e-9, this._conversion(price)))
    const logprice = Math.log(price)
    return {
      conversion: {
        a: 1,
        b: logprice,
      },
      rejection: {
        a: - (phi / (1 - phi)),
        b: - (phi / (1 - phi)) * logprice,
      }
    }
  }
}