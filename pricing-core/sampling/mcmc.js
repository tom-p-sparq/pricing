import { logLikelihood } from '../fitting/likelihoods.js'
import { Prior } from './priors.js'
import { Proposal } from './proposals.js'
import { BaseConversionModel } from '../conversion/base.js'

/**
 * Performs a single Metropolis-Hastings step.
 * @param {{[paramName: string]: number}} currentParams
 * @param {number} currentLogPost Current log posterior value.
 * @param {Prior<any>} prior
 * @param {Proposal} proposal
 * @param {Array<{price: number, looks: number, books: number}>} data
 * @returns {{params: {[paramName: string]: number}, logPost: number}}
 */
export function mhStep(currentParams, currentLogPost, prior, proposal, data) {
  const proposedParams = proposal.propose(currentParams)
  const proposedLogPrior = prior.logPdf(proposedParams)
  if (!isFinite(proposedLogPrior)) {
    return { params: currentParams, logPost: currentLogPost }
  }
  const proposedModel = prior.makeModel(proposedParams)
  const proposedLogPost = logLikelihood(proposedModel, data) + proposedLogPrior

  const logAlpha = proposedLogPost - currentLogPost
    + proposal.logPdf(currentParams, proposedParams)   // log q(current | proposed) — reverse
    - proposal.logPdf(proposedParams, currentParams)   // log q(proposed | current) — forward

  if (Math.log(prior.rng()) < logAlpha) {
    return { params: proposedParams, logPost: proposedLogPost }
  }
  return { params: currentParams, logPost: currentLogPost }
}

/**
 * Metropolis-Hastings sampler. An infinite generator — the caller controls termination.
 * Yields the current model after each step (including rejected proposals), so the chain
 * correctly dwells at the current state on rejection.
 *
 * @template {BaseConversionModel} T
 * @param {Prior<T>} prior
 * @param {Proposal} proposal
 * @param {Array<{price: number, looks: number, books: number}>} data
 * @param {object} [options]
 * @param {{[paramName: string]: number}} [options.initialParams] Defaults to prior.sample().
 * @param {number} [options.burnIn=0] Steps to discard before yielding.
 * @param {number} [options.thin=1] Yield every nth step after burn-in.
 * @yields {T}
 */
export function* mh(prior, proposal, data, { initialParams, burnIn = 0, thin = 1 } = {}) {
  let currentParams = initialParams ?? prior.sample()
  let currentLogPost = logLikelihood(prior.makeModel(currentParams), data) + prior.logPdf(currentParams)

  for (let step = 0; ; step++) {
    ({ params: currentParams, logPost: currentLogPost } = mhStep(currentParams, currentLogPost, prior, proposal, data))

    if (step >= burnIn && (step - burnIn) % thin === 0) {
      yield prior.makeModel(currentParams)
    }
  }
}
