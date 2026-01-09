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
   * @param {number} model_params.p0 The reference price.
   * @param {number} model_params.c0 The conversion rate at the reference price.
   * @param {number} model_params.b The slope of the linear demand curve.
   */
  constructor({ p0, c0, b }) {
    super()
    this.p0 = p0
    this.c0 = c0
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
    const b = elasticity * (conversion / price)

    return new LinearDemandModel({ p0: price, c0: conversion, b })
  }

  /**
   * Calculates the conversion rate using the point-slope form of a linear equation.
   * @override
   * @protected
   * @param {number} price The price for which to calculate the conversion rate.
   * @returns {number} The calculated conversion rate (before clamping).
   */
  _conversion(price) {
    return this.c0 + this.b * (price - this.p0)
  }
}
