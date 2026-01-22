import { BaseDemandModel } from './base.js'

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
   * @param {object} model_params
   * @param {number} model_params.a The intercept of the linear demand curve.
   * @param {number} model_params.b The slope of the linear demand curve.
   */
  constructor({ a, b }) {
    super()
    this.a = a
    this.b = b
  }

  /**
   * Creates a new model instance from a reference point.
   * @override
   * @param {object} params
   * @param {number} params.price The reference price.
   * @param {number} params.conversion The conversion rate at the reference price.
   * @param {number} params.elasticity The point price elasticity of demand at the reference price.
   * @returns {LinearDemandModel} A new instance of the demand model.
   */
  static from_reference({ price, conversion, elasticity }) {
    LinearDemandModel._check_reference(price, conversion, elasticity)
    const a = conversion * (1 - elasticity)
    const b = elasticity * (conversion / price)
    return new LinearDemandModel({ a, b })
  }

  /**
   * Creates a new model instance by interpolating between two points.
   * This method calculates the slope `b` of the linear demand curve that passes
   * through two given points (p0, c0) and (p1, c1), and then creates a new
   * `LinearDemandModel` instance.
   * @override
   * @param {object} point0 An object representing the first point, with `price` and `conversion` properties.
   * @param {number} point0.price The price at the first point.
   * @param {number} point0.conversion The conversion rate at the first point.
   * @param {object} point1 An object representing the second point, with `price` and `conversion` properties.
   * @param {number} point1.price The price at the second point.
   * @param {number} point1.conversion The conversion rate at the second point.
   * @returns {LinearDemandModel} A new instance of the demand model.
   */
  static interpolate({ price: price0, conversion: conversion0 }, { price: price1, conversion: conversion1 }) {
    const a = (conversion0 * price1 - conversion1 * price0) / (price1 - price0);
    const b = (conversion1 - conversion0) / (price1 - price0);
    return new LinearDemandModel({ a, b });
  }

  /**
   * Calculates the conversion rate using the point-slope form of a linear equation.
   * @override
   * @protected
   * @param {number} price The price for which to calculate the conversion rate.
   * @returns {number} The calculated conversion rate (before clamping).
   */
  _conversion(price) {
    return this.a + this.b * price
  }

  /**
   * Calculate the gradient of conversion probability with respect to the model parameters.
   * @override
   * @protected
   * @param {number} price The price at which to calculate the gradient of the conversion probability.
   * @returns {object} The gradient of conversion probability w.r.t the model parameters in the constructor
   */
  _gradient(price) {
    return { a: 1, b: price }
  }
}

