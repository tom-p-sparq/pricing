import { BaseDemandModel } from '../conversion/base.js'
import { BaseDistribution } from './distributions/index.js'

/**
 * Constructs a new model instance by sampling each parameter independently from its prior.
 * @template {typeof BaseDemandModel} T
 * @param {T} ModelClass The model class to instantiate.
 * @param {{[paramName: string]: BaseDistribution}} priorSpec
 *   An object mapping each parameter name to a distribution to sample from.
 * @param {() => number} [rng] A uniform(0,1) RNG; defaults to Math.random.
 * @returns {InstanceType<T>} A new model instance with sampled parameters.
 */
export function samplePrior(ModelClass, priorSpec, rng = Math.random) {
  const params = Object.fromEntries(
    Object.entries(priorSpec).map(([name, dist]) => [name, dist.sample(rng)])
  )
  return /** @type {InstanceType<T>} */ (new ModelClass(params))
}

/**
 * Computes the log prior probability of a model's parameters under a given prior specification.
 * @param {BaseDemandModel} model The model whose parameters to evaluate.
 * @param {{[paramName: string]: BaseDistribution}} priorSpec
 *   An object mapping each parameter name to a distribution.
 * @returns {number} The sum of log prior densities across all parameters.
 */
export function logPrior(model, priorSpec) {
  return model.paramEntries.reduce(
    (sum, [name, value]) => sum + priorSpec[name].logPdf(value), 0
  )
}
