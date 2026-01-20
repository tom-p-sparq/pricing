import { BaseDemandModel } from './base.js'

/**
 * Implements a constant elasticity demand model (also known as isoelastic).
 * In this model, the price elasticity of demand is constant regardless of the price.
 *
 * The conversion rate is given by the formula: C(p) = A * p^e,
 * where `e` is the constant price elasticity and `A` is a scaling constant derived
 * from a reference point (price, conversion).
 */
export class ConstantElasticityDemandModel extends BaseDemandModel {
  /**
   * @param {object} model_params
   * @param {number} model_params.A The scaling constant for the model.
   * @param {number} model_params.elasticity The constant price elasticity of demand.
   */
  constructor({ A, elasticity }) {
    super()
    /**
     * The constant price elasticity of demand (e).
     * @protected
     * @type {number}
     */
    this.elasticity_param = elasticity
    /**
     * The scaling constant (A) for the model.
     * @protected
     * @type {number}
     */
    this.A = A
  }

  /**
   * Creates a new model instance from a reference point.
   * @override
   * @param {object} params
   * @param {number} params.price The reference price.
   * @param {number} params.conversion The conversion rate at the reference price.
   * @param {number} params.elasticity The point price elasticity of demand at the reference price.
   * @returns {ConstantElasticityDemandModel} A new instance of the demand model.
   */
  static from_reference({ price, conversion, elasticity }) {
    ConstantElasticityDemandModel._check_reference(price, conversion, elasticity)
    const A = conversion * Math.pow(price, -elasticity)
    return new ConstantElasticityDemandModel({ A, elasticity })
  }

  /**
   * Creates a new model instance by interpolating between two points.
   * This method calculates the shape of the constant elasticity demand curve that passes
   * through two given points (p0, c0) and (p1, c1), and then creates a new
   * `ConstantElasticityDemandModel` instance.
   * @override
   * @param {object} point0 An object representing the first point, with `price` and `conversion` properties.
   * @param {number} point0.price The price at the first point.
   * @param {number} point0.conversion The conversion rate at the first point.
   * @param {object} point1 An object representing the second point, with `price` and `conversion` properties.
   * @param {number} point1.price The price at the second point.
   * @param {number} point1.conversion The conversion rate at the second point.
   * @returns {ConstantElasticityDemandModel} A new instance of the demand model.
   */
  static interpolate({ price: price0, conversion: conversion0 }, { price: price1, conversion: conversion1 }) {
    const logPrice0 = Math.log(price0);
    const logPrice1 = Math.log(price1)
    const logConv0 = Math.log(conversion0);
    const logConv1 = Math.log(conversion1);
    const elasticity = (logConv1 - logConv0) / (logPrice1 - logPrice0);
    const A = conversion0 * Math.pow(price0, -elasticity)
    return new ConstantElasticityDemandModel({ A, elasticity });
  }

  /**
   * @protected
   * @param {number} price The price for which to calculate the conversion rate.
   * @returns {number} The calculated conversion rate (before clamping).
   */
  _conversion(price) {
    if (price <= 0) return 1.0;
    return this.A * Math.pow(price, this.elasticity_param)
  }
}