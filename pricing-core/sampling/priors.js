import { BaseDistribution } from './distributions/index.js'

/**
 * A prior distribution over a named set of parameters, with an optional factory
 * for constructing model instances from sampled parameters.
 * @template T
 */
export class Prior {
  /**
   * @param {{[paramName: string]: BaseDistribution}} priorSpec
   *   An object mapping each parameter name to a prior distribution.
   * @param {(params: {[paramName: string]: number}) => T} [factory]
   *   Converts a parameter object to a model instance.
   */
  constructor(priorSpec, factory) {
    this.priorSpec = priorSpec
    this.factory = factory
  }

  /**
   * Samples a parameter object by drawing each parameter independently from its prior.
   * @param {() => number} [rng] A uniform(0,1) RNG; defaults to Math.random.
   * @returns {{[paramName: string]: number}}
   */
  sample(rng = Math.random) {
    return Object.fromEntries(
      Object.entries(this.priorSpec).map(([name, dist]) => [name, dist.sample(rng)])
    )
  }

  /**
   * Computes the log prior density of a parameter object.
   * @param {{[paramName: string]: number}} params
   * @returns {number}
   */
  logPdf(params) {
    return Object.entries(this.priorSpec).reduce(
      (sum, [name, dist]) => sum + dist.logPdf(params[name]), 0
    )
  }

  /**
   * Converts a parameter object to a model instance using the factory.
   * @param {{[paramName: string]: number}} params
   * @returns {T}
   */
  makeModel(params) {
    if (!this.factory) throw new Error('No factory provided to Prior')
    return this.factory(params)
  }

  /**
   * Samples a model instance by drawing parameters from the prior and applying the factory.
   * @param {() => number} [rng] A uniform(0,1) RNG; defaults to Math.random.
   * @returns {T}
   */
  sampleModel(rng = Math.random) {
    return this.makeModel(this.sample(rng))
  }
}
