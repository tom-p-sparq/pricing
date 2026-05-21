import { Prior } from './priors.js'
import { BaseDemandModel } from '../conversion/base.js'

/**
 * Draws independent samples from the prior. An infinite generator — the caller controls termination.
 *
 * @template {BaseDemandModel} T
 * @param {Prior<T>} prior
 * @param {object} [options]
 * @param {() => number} [options.rng] A uniform(0,1) RNG; defaults to Math.random.
 * @yields {T}
 */
export function* samplePrior(prior, { rng = Math.random } = {}) {
  while (true) {
    yield prior.sampleModel(rng)
  }
}