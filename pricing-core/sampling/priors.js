import { BaseDemandModel } from '../conversion/base.js'
import { BaseDistribution } from './distributions/index.js'

/**
 * Bundles a model class with a prior distribution over its parameters.
 * @template {typeof BaseDemandModel} T
 */
export class Prior {
  /**
   * @param {T} ModelClass The model class to instantiate when sampling.
   * @param {{[paramName: string]: BaseDistribution}} priorSpec
   *   An object mapping each parameter name to a prior distribution.
   */
  constructor(ModelClass, priorSpec) {
    this.ModelClass = ModelClass
    this.priorSpec = priorSpec
  }

  /**
   * Samples a new model instance by drawing each parameter independently from its prior.
   * @param {() => number} [rng] A uniform(0,1) RNG; defaults to Math.random.
   * @returns {InstanceType<T>}
   */
  sample(rng = Math.random) {
    const params = Object.fromEntries(
      Object.entries(this.priorSpec).map(([name, dist]) => [name, dist.sample(rng)])
    )
    return /** @type {InstanceType<T>} */ (new this.ModelClass(params))
  }

  /**
   * Computes the log prior density of a model's parameters.
   * @param {BaseDemandModel} model
   * @returns {number}
   */
  logPdf(model) {
    return model.paramEntries.reduce(
      (sum, [name, value]) => sum + this.priorSpec[name].logPdf(value), 0
    )
  }
}
