import { BaseDistribution } from './distributions/index.js'

/**
 * A prior distribution over a named set of parameters.
 */
export class Prior {
  /**
   * @param {{[paramName: string]: BaseDistribution}} priorSpec
   *   An object mapping each parameter name to a prior distribution.
   */
  constructor(priorSpec) {
    this.priorSpec = priorSpec
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
}
