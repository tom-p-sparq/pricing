import { logLikelihood } from '../fitting/likelihoods.js'
import { Prior } from './priors.js'
import { Proposal } from './proposals.js'
import { BaseDemandModel } from '../conversion/base.js'
import { mhStep } from './mcmc.js'

/**
 * Bootstrap particle filter with optional MCMC rejuvenation.
 * Processes data points sequentially, yielding the particle set after each observation.
 *
 * @template {BaseDemandModel} T
 * @param {Prior<T>} prior
 * @param {Proposal} proposal Applies MCMC rejuvenation after resampling.
 * @param {Array<{price: number, looks: number, books: number}>} data
 * @param {object} [options]
 * @param {number} [options.N=500] Number of particles.
 * @param {number} [options.resampleThreshold=0.5] Resample when ESS < N * resampleThreshold.
 * @param {number} [options.mcmcSteps=5] Number of MH rejuvenation steps per particle.
 * @param {() => number} [options.rng] A uniform(0,1) RNG; defaults to Math.random.
 * @yields {{ particles: T[], weights: number[] }}
 */
export function* particleFilter(prior, proposal, data, { N = 500, resampleThreshold = 0.5, mcmcSteps = 5, rng = Math.random } = {}) {
  let particles = Array.from({ length: N }, () => prior.sample(rng))
  let logWeights = new Array(N).fill(-Math.log(N))

  yield { particles: particles.map(p => prior.makeModel(p)), weights: logWeights.map(Math.exp) }

  /** @type {Array<{price: number, looks: number, books: number}>} */
  const observedData = []

  for (const dataPoint of data) {
    observedData.push(dataPoint)

    // Update log weights with likelihood of new observation
    logWeights = particles.map((params, i) =>
      logWeights[i] + logLikelihood(prior.makeModel(params), [dataPoint])
    )

    // Normalise via log-sum-exp for numerical stability
    const lse = logSumExp(logWeights)
    logWeights = logWeights.map(lw => lw - lse)
    const weights = logWeights.map(Math.exp)

    // Resample when ESS drops below threshold
    const ess = 1 / weights.reduce((sum, w) => sum + w * w, 0)
    if (ess < N * resampleThreshold) {
      particles = systematicResample(particles, weights, N, rng)
      logWeights = new Array(N).fill(-Math.log(N))

      // Rejuvenate to restore diversity
      if (mcmcSteps > 0) {
        particles = particles.map(params => {
          let currentParams = params
          let currentLogPost = logLikelihood(prior.makeModel(currentParams), observedData) + prior.logPdf(currentParams)
          for (let k = 0; k < mcmcSteps; k++) {
            ({ params: currentParams, logPost: currentLogPost } = mhStep(currentParams, currentLogPost, prior, proposal, observedData, rng))
          }
          return currentParams
        })
      }
    }

    yield { particles: particles.map(p => prior.makeModel(p)), weights: logWeights.map(Math.exp) }
  }
}

/**
 * @param {number[]} logValues
 * @returns {number}
 */
function logSumExp(logValues) {
  const max = Math.max(...logValues)
  return max + Math.log(logValues.reduce((sum, lv) => sum + Math.exp(lv - max), 0))
}

/**
 * Systematic resampling — O(N), unbiased, lower variance than multinomial resampling.
 * @param {any[]} particles
 * @param {number[]} weights Normalised weights summing to 1.
 * @param {number} N
 * @param {() => number} rng
 * @returns {any[]}
 */
function systematicResample(particles, weights, N, rng) {
  const cumWeights = []
  let cumSum = 0
  for (const w of weights) {
    cumSum += w
    cumWeights.push(cumSum)
  }

  const resampled = []
  const step = 1 / N
  let u = rng() * step
  let j = 0
  for (let i = 0; i < N; i++) {
    while (cumWeights[j] < u) j++
    resampled.push(particles[j])
    u += step
  }
  return resampled
}
