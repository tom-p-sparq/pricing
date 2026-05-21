import { logLikelihood } from '../fitting/likelihoods.js'
import { Prior } from './priors.js'
import { Proposal } from './proposals.js'
import { BaseDemandModel } from '../conversion/base.js'

/**
 * Metropolis-Hastings sampler. An infinite generator — the caller controls termination.
 * Yields the current model after each step (including rejected proposals), so the chain
 * correctly dwells at the current state on rejection.
 *
 * @template {BaseDemandModel} T
 * @param {Array<{price: number, looks: number, books: number}>} data
 * @param {Prior<T>} prior
 * @param {Proposal} proposal
 * @param {object} [options]
 * @param {{[paramName: string]: number}} [options.initialParams] Defaults to prior.sample().
 * @param {number} [options.burnIn=0] Steps to discard before yielding.
 * @param {number} [options.thin=1] Yield every nth step after burn-in.
 * @param {() => number} [options.rng] A uniform(0,1) RNG; defaults to Math.random.
 * @yields {T}
 */
export function* mh(data, prior, proposal, { initialParams, burnIn = 0, thin = 1, rng = Math.random } = {}) {
  let currentParams = initialParams ?? prior.sample(rng)
  let currentModel = prior.makeModel(currentParams)
  let currentLogPost = logLikelihood(currentModel, data) + prior.logPdf(currentParams)

  for (let step = 0; ; step++) {
    const proposedParams = proposal.propose(currentParams, rng)
    const proposedModel = prior.makeModel(proposedParams)
    const proposedLogPost = logLikelihood(proposedModel, data) + prior.logPdf(proposedParams)

    const logAlpha = proposedLogPost - currentLogPost
      + proposal.logPdf(currentParams, proposedParams)   // log q(current | proposed) — reverse
      - proposal.logPdf(proposedParams, currentParams)   // log q(proposed | current) — forward

    if (Math.log(rng()) < logAlpha) {
      currentParams = proposedParams
      currentModel = proposedModel
      currentLogPost = proposedLogPost
    }

    if (step >= burnIn && (step - burnIn) % thin === 0) {
      yield currentModel
    }
  }
}
