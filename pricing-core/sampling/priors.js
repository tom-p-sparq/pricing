/** @import { BaseDistribution } from './distributions/base.js' */

/**
 * A prior distribution over a named set of parameters, with an optional factory
 * for constructing model instances from sampled parameters.
 * @template T
 */
export class Prior {
  /**
   * @param {{ [paramName: string]: [new(params: any, rng?: () => number) => BaseDistribution, object] }} priorSpec
   *   An object mapping each parameter name to a [DistributionClass, params] tuple.
   * @param {(params: {[paramName: string]: number}) => T} [factory]
   *   Converts a parameter object to a model instance.
   * @param {() => number} [rng] A uniform(0,1) RNG; defaults to Math.random.
   * @example
   * new Prior(
   *   { conversion: [Normal, { mu: 0.4, sigma: 0.05 }], elasticity: [Normal, { mu: -2, sigma: 0.5 }] },
   *   ({ conversion, elasticity }) => LogisticDemandModel.fromReference({price: 100, conversion, elasticity }),
   *   rng
   * )
   */
  constructor(priorSpec, factory, rng = Math.random) {
    this.rng = rng
    this.factory = factory
    this._dists = Object.fromEntries(
      Object.entries(priorSpec).map(([name, [Dist, params]]) => [name, new Dist(params, rng)])
    )
  }

  /**
   * Samples a parameter object by drawing each parameter independently from its prior.
   * @returns {{[paramName: string]: number}}
   */
  sample() {
    return Object.fromEntries(
      Object.entries(this._dists).map(([name, dist]) => [name, dist.sample()])
    )
  }

  /**
   * Computes the log prior density of a parameter object.
   * @param {{[paramName: string]: number}} params
   * @returns {number}
   */
  logPdf(params) {
    return Object.entries(this._dists).reduce(
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
   * @returns {T}
   */
  sampleModel() {
    return this.makeModel(this.sample())
  }
}
