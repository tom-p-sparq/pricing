import { Prior } from './priors.js'
import { BaseDemandModel } from '../conversion/base.js'

/**
 * Draws independent samples from the prior. An infinite generator — the caller controls termination.
 *
 * @template {BaseDemandModel} T
 * @param {Prior<T>} prior
 * @yields {T}
 */
export function* iidSampler(prior) {
  while (true) {
    yield prior.sampleModel()
  }
}